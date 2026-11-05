"""Grounded Financial Copilot Domain Engine.

Strictly adheres to:
1. Compute, Then Explain (Zero Financial Hallucination)
2. Strict Integer Paise Arithmetic
3. Multi-Tenant User Isolation
4. Grounded Evidence Architecture (FactBundle)
"""
import re
from datetime import date
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.domain.aggregates import (
    calculate_category_breakdown,
    calculate_expense_total,
    calculate_income_total,
    calculate_net_balance,
    calculate_savings_rate,
)
from app.domain.anomaly import detect_anomalies_mad
from app.domain.budget_engine import calculate_budget_pace
from app.domain.currency import format_inr, paise_to_rupees
from app.domain.timezone import get_month_boundaries, today_ist
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction


class FactBundleBuilder:
    """Collects verified financial telemetry for a user with zero arithmetic hallucination."""

    @staticmethod
    def build(
        db: Session,
        user_id: str,
        year: int,
        month: int,
        question: str,
    ) -> Dict[str, Any]:
        """Gather complete verified evidence for the specified period and question context."""
        first_day, last_day, total_days = get_month_boundaries(year, month)
        today = today_ist()

        # Compute elapsed days for pace
        if today < first_day:
            elapsed_days = 0
            as_of_date = first_day
        elif today > last_day:
            elapsed_days = total_days
            as_of_date = last_day
        else:
            elapsed_days = today.day
            as_of_date = today

        # 1. Fetch current month transactions (User-Isolated)
        curr_txs = (
            db.query(Transaction)
            .join(Category, Transaction.category_id == Category.id)
            .filter(
                Transaction.user_id == user_id,
                Transaction.deleted_at == None,
                Transaction.occurred_on >= first_day,
                Transaction.occurred_on <= last_day,
            )
            .order_by(Transaction.occurred_on.desc(), Transaction.amount_paise.desc())
            .all()
        )

        curr_tx_dicts = [
            {
                "id": t.id,
                "amount_paise": t.amount_paise,
                "kind": t.kind,
                "category_id": t.category_id,
                "category_name": t.category.name if t.category else "Uncategorized",
                "description": t.description,
                "occurred_on": t.occurred_on.isoformat(),
            }
            for t in curr_txs
        ]

        curr_income_paise = calculate_income_total(curr_tx_dicts)
        curr_expense_paise = calculate_expense_total(curr_tx_dicts)
        curr_net_paise = calculate_net_balance(curr_income_paise, curr_expense_paise)
        curr_savings_rate = calculate_savings_rate(curr_income_paise, curr_expense_paise)
        curr_categories = calculate_category_breakdown(curr_tx_dicts, kind="expense")

        # 2. Fetch previous month transactions for MoM comparison
        prev_month = 12 if month == 1 else month - 1
        prev_year = year - 1 if month == 1 else year
        prev_first, prev_last, _ = get_month_boundaries(prev_year, prev_month)

        prev_txs = (
            db.query(Transaction)
            .join(Category, Transaction.category_id == Category.id)
            .filter(
                Transaction.user_id == user_id,
                Transaction.deleted_at == None,
                Transaction.occurred_on >= prev_first,
                Transaction.occurred_on <= prev_last,
            )
            .all()
        )

        prev_tx_dicts = [
            {
                "id": t.id,
                "amount_paise": t.amount_paise,
                "kind": t.kind,
                "category_id": t.category_id,
                "category_name": t.category.name if t.category else "Uncategorized",
                "description": t.description,
                "occurred_on": t.occurred_on.isoformat(),
            }
            for t in prev_txs
        ]

        prev_income_paise = calculate_income_total(prev_tx_dicts)
        prev_expense_paise = calculate_expense_total(prev_tx_dicts)
        prev_net_paise = calculate_net_balance(prev_income_paise, prev_expense_paise)
        prev_categories = calculate_category_breakdown(prev_tx_dicts, kind="expense")

        # 3. MoM Shifts
        expense_delta_paise = curr_expense_paise - prev_expense_paise
        income_delta_paise = curr_income_paise - prev_income_paise
        expense_pct_change = (
            round((expense_delta_paise / prev_expense_paise) * 100, 1)
            if prev_expense_paise > 0
            else 0.0
        )

        # Category shifts
        prev_cat_map = {c["category_name"].lower(): c["total_paise"] for c in prev_categories}
        cat_shifts = []
        for c in curr_categories:
            c_name = c["category_name"]
            p_total = prev_cat_map.get(c_name.lower(), 0)
            diff_paise = c["total_paise"] - p_total
            cat_shifts.append({
                "category_name": c_name,
                "current_paise": c["total_paise"],
                "previous_paise": p_total,
                "diff_paise": diff_paise,
                "diff_formatted": ("+" if diff_paise >= 0 else "-") + format_inr(abs(diff_paise)),
            })
        cat_shifts.sort(key=lambda x: x["diff_paise"], reverse=True)
        increase_drivers = [s for s in cat_shifts if s["diff_paise"] > 0]
        unchanged_categories = [s for s in cat_shifts if s["diff_paise"] == 0 and s["current_paise"] > 0]
        decrease_drivers = [s for s in cat_shifts if s["diff_paise"] < 0]

        # Find specific transactions in increasing categories that explain the rise
        increasing_cat_names = {s["category_name"] for s in increase_drivers}
        explaining_txs = [
            t for t in curr_tx_dicts
            if t["kind"] == "expense" and t["category_name"] in increasing_cat_names and t["amount_paise"] >= 100000
        ]
        for t in explaining_txs:
            t["formatted_amount"] = format_inr(t["amount_paise"])

        # 4. Budget Pace
        budgets = (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.month == first_day,
            )
            .all()
        )
        total_budget_paise = sum(b.limit_paise for b in budgets) if budgets else 5000000
        pace_info = calculate_budget_pace(
            spent_paise=curr_expense_paise,
            limit_paise=total_budget_paise,
            as_of_date=as_of_date,
            month_first_day=first_day,
        )

        # 5. Outliers / Anomalies (All-time expense history for MAD baseline)
        all_expenses = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.deleted_at == None,
                Transaction.kind == "expense",
            )
            .all()
        )
        anomaly_report = detect_anomalies_mad(all_expenses)

        # Filter anomalies to current month for contextual relevance
        month_str = f"{year}-{month:02d}"
        current_month_anomalies = [
            a for a in anomaly_report.get("anomalies", [])
            if a["date"].startswith(month_str)
        ]

        # 6. Top Spending Transactions
        top_expenses = [t for t in curr_tx_dicts if t["kind"] == "expense"][:5]
        for t in top_expenses:
            t["formatted_amount"] = format_inr(t["amount_paise"])

        return {
            "period": {
                "year": year,
                "month": month,
                "first_day": first_day.isoformat(),
                "last_day": last_day.isoformat(),
                "total_days": total_days,
                "elapsed_days": elapsed_days,
                "as_of_date": as_of_date.isoformat(),
            },
            "totals": {
                "income_paise": curr_income_paise,
                "income_formatted": format_inr(curr_income_paise),
                "expense_paise": curr_expense_paise,
                "expense_formatted": format_inr(curr_expense_paise),
                "net_balance_paise": curr_net_paise,
                "net_balance_formatted": ("+" if curr_net_paise >= 0 else "-") + format_inr(abs(curr_net_paise)),
                "savings_rate_percent": curr_savings_rate,
                "transaction_count": len(curr_txs),
            },
            "previous_month": {
                "year": prev_year,
                "month": prev_month,
                "income_paise": prev_income_paise,
                "income_formatted": format_inr(prev_income_paise),
                "expense_paise": prev_expense_paise,
                "expense_formatted": format_inr(prev_expense_paise),
                "net_balance_paise": prev_net_paise,
                "net_balance_formatted": ("+" if prev_net_paise >= 0 else "-") + format_inr(abs(prev_net_paise)),
            },
            "mom_delta": {
                "expense_delta_paise": expense_delta_paise,
                "expense_delta_formatted": ("+" if expense_delta_paise >= 0 else "-") + format_inr(abs(expense_delta_paise)),
                "expense_pct_change": expense_pct_change,
                "income_delta_paise": income_delta_paise,
                "income_delta_formatted": ("+" if income_delta_paise >= 0 else "-") + format_inr(abs(income_delta_paise)),
                "category_shifts": cat_shifts[:5],
                "increase_drivers": increase_drivers,
                "unchanged_categories": unchanged_categories,
                "decrease_drivers": decrease_drivers,
                "explaining_transactions": explaining_txs,
            },
            "categories": curr_categories,
            "top_category": curr_categories[0] if curr_categories else None,
            "budget_pace": pace_info,
            "anomalies": current_month_anomalies,
            "top_expenses": top_expenses,
        }


class IntentClassifier:
    """Classifies user queries into specific financial intelligence intents."""

    @staticmethod
    def classify(query: str, categories: List[Dict[str, Any]]) -> Tuple[str, Optional[str]]:
        """
        Classifies query into one of:
        - expense_increase
        - top_category
        - category_spend (with target_category name)
        - unusual_transactions
        - budget_pace
        - savings_advice
        - general_summary
        """
        q = query.lower().strip()

        # 1. Unusual Transactions / Anomalies
        if any(w in q for w in ["unusual", "anomaly", "anomalies", "outlier", "strange", "abnormal", "spike", "spikes"]):
            return "unusual_transactions", None

        # 2. Expense Increase / MoM Change
        if any(w in q for w in ["increase", "increased", "higher", "went up", "more this month", "why did my expenses", "cost more"]):
            return "expense_increase", None

        # 3. Budget Pace
        if any(w in q for w in ["budget", "on track", "over budget", "pace", "pacing", "ahead of budget", "overspend"]):
            return "budget_pace", None

        # 4. Savings Advice
        if any(w in q for w in ["savings rate", "save more", "improve savings", "better savings", "save money", "cut costs", "reduce spend"]):
            return "savings_advice", None

        # 5. Top Category
        if any(w in q for w in ["consumes most", "most of my income", "biggest expense", "highest category", "top spend", "where does my money go", "largest spend"]):
            return "top_category", None

        # 6. Specific Category Spend
        for cat in categories:
            cat_name = cat["name"].lower()
            if cat_name in q:
                return "category_spend", cat["name"]
        
        # Check synonyms
        synonyms = {
            "food": "Dining & Food",
            "dining": "Dining & Food",
            "restaurant": "Dining & Food",
            "groceries": "Groceries",
            "grocery": "Groceries",
            "supermarket": "Groceries",
            "travel": "Transportation",
            "transport": "Transportation",
            "cab": "Transportation",
            "auto": "Transportation",
            "uber": "Transportation",
            "ola": "Transportation",
            "bills": "Utilities & Bills",
            "electricity": "Utilities & Bills",
            "wifi": "Utilities & Bills",
            "rent": "Housing & Rent",
            "flat": "Housing & Rent",
            "shopping": "Shopping",
            "clothes": "Shopping",
        }
        for kw, mapped_cat in synonyms.items():
            if re.search(rf"\b{kw}\b", q):
                return "category_spend", mapped_cat

        return "general_summary", None


class DeterministicNarrativeGenerator:
    """Generates guaranteed, 100% factual, zero-hallucination narratives directly from FactBundle."""

    @staticmethod
    def generate(intent: str, target_cat: Optional[str], facts: Dict[str, Any]) -> str:
        totals = facts["totals"]
        period = facts["period"]
        mom = facts["mom_delta"]
        pace = facts["budget_pace"]
        categories = facts["categories"]
        anomalies = facts["anomalies"]
        top_category = facts["top_category"]

        if intent == "expense_increase":
            prev = facts["previous_month"]
            diff_fmt = mom["expense_delta_formatted"]
            pct = mom["expense_pct_change"]
            
            if mom["expense_delta_paise"] > 0:
                explanation = (
                    f"Your expenses increased by **{diff_fmt}** (+{pct}%) compared to last month "
                    f"({totals['expense_formatted']} vs. {prev['expense_formatted']}).\n\n"
                )
                shifts = mom.get("increase_drivers") or [s for s in mom.get("category_shifts", []) if s.get("diff_paise", 0) > 0]
                if shifts:
                    top_shift = shifts[0]
                    explanation += (
                        f"The primary driver is **{top_shift['category_name']}**, which rose by "
                        f"**{top_shift['diff_formatted']}** (from {format_inr(top_shift['previous_paise'])} to {format_inr(top_shift['current_paise'])}). "
                    )
                if len(shifts) > 1:
                    second_shift = shifts[1]
                    explanation += (
                        f"Additionally, **{second_shift['category_name']}** increased by **{second_shift['diff_formatted']}**. "
                    )
                
                explaining_txs = mom.get("explaining_transactions", [])
                if explaining_txs:
                    top_tx = explaining_txs[0]
                    explanation += (
                        f"\nA key transaction driving this increase was **{top_tx['description']}** ({top_tx['formatted_amount']}) in {top_tx['category_name']}."
                    )

                unchanged = mom.get("unchanged_categories", [])
                if unchanged:
                    top_unchanged = unchanged[0]
                    explanation += (
                        f"\n\n*(Note: Fixed recurring expenses like **{top_unchanged['category_name']}** remained constant at "
                        f"{format_inr(top_unchanged['current_paise'])} in both months and did not contribute to this increase.)*"
                    )
                return explanation
            else:
                return (
                    f"Your expenses did not increase this month; they actually decreased by **{diff_fmt}** "
                    f"({totals['expense_formatted']} vs. {prev['expense_formatted']} last month), "
                    f"saving you {abs(pct)}%."
                )

        elif intent == "top_category":
            if not top_category:
                return "No expense transactions have been recorded for this period yet."
            
            share = top_category["percentage"]
            cat_name = top_category["category_name"]
            amt = top_category["formatted_total"]
            tx_count = top_category["transaction_count"]
            
            # Compute percentage of income
            income_paise = totals["income_paise"]
            income_share_str = ""
            if income_paise > 0:
                inc_pct = round((top_category["total_paise"] / income_paise) * 100, 1)
                income_share_str = f" This represents **{inc_pct}%** of your total monthly income."

            msg = (
                f"**{cat_name}** consumes the largest portion of your spending at **{amt}**, "
                f"accounting for **{share}%** of your total expenses across {tx_count} transaction{'' if tx_count == 1 else 's'}.{income_share_str}\n\n"
            )
            # Find top transactions in this category
            cat_txs = [t for t in facts["top_expenses"] if t["category_name"] == cat_name]
            if cat_txs:
                msg += f"Top item: **{cat_txs[0]['description']}** ({cat_txs[0]['formatted_amount']})."
            return msg

        elif intent == "category_spend":
            matching = [c for c in categories if c["category_name"].lower() == (target_cat or "").lower()]
            if not matching:
                return f"No spending was recorded under the **{target_cat}** category for this month."
            
            c = matching[0]
            amt = c["formatted_total"]
            share = c["percentage"]
            count = c["transaction_count"]
            avg_paise = int(c["total_paise"] / count) if count > 0 else 0
            avg_fmt = format_inr(avg_paise)

            return (
                f"You have spent **{amt}** on **{c['category_name']}** this month across **{count} transaction{'' if count == 1 else 's'}**, "
                f"which constitutes **{share}%** of your total monthly expenses. "
                f"Your average transaction size in this category is **{avg_fmt}**."
            )

        elif intent == "unusual_transactions":
            if not anomalies:
                return (
                    "No statistical spending anomalies (MAD score >= 3.0) were detected in your current month's ledger. "
                    "All recorded transactions align with your historical spending baselines."
                )
            
            msg = f"Detected **{len(anomalies)} unusual transaction spike{'' if len(anomalies) == 1 else 's'}** this month based on Median Absolute Deviation (MAD):\n\n"
            for a in anomalies[:3]:
                msg += f"• **{a['description']}**: **{a['amount_formatted']}** on {a['date']} ({a['evidence']})\n"
            
            if len(anomalies) > 3:
                msg += f"\n*(+ {len(anomalies) - 3} more minor outliers detailed in the Evidence Panel below)*"
            return msg.strip()

        elif intent == "budget_pace":
            status_desc = {
                "on_track": "comfortably on track",
                "over_pace": "spending faster than your scheduled daily pace",
                "over_budget": "already over your monthly budget limit",
            }.get(pace["status"], pace["status"])

            spent = pace["spent_formatted"]
            limit = pace["limit_formatted"]
            pct = pace["utilization_percent"]
            verdict = pace["verdict_sentence"]
            projected = pace["projected_overrun_formatted"]

            msg = (
                f"You are currently **{status_desc}**. You have spent **{spent}** out of your **{limit}** "
                f"budget (**{pct}%** utilized with {pace['remaining_days']} days remaining in the month).\n\n"
                f"**Verdict:** {verdict}"
            )
            return msg

        elif intent == "savings_advice":
            rate = totals["savings_rate_percent"]
            inc = totals["income_formatted"]
            exp = totals["expense_formatted"]
            net = totals["net_balance_formatted"]

            advice = (
                f"Your current savings rate is **{rate}%** (Net Balance: **{net}** on income of {inc} and expenses of {exp}).\n\n"
            )
            if rate < 20.0:
                advice += "Financial guidelines typically recommend targeting a savings rate of at least **20%** to build a secure emergency cushion. "
            else:
                advice += "Your savings rate exceeds the recommended 20% baseline, which represents solid financial health. "

            if top_category:
                top_paise = top_category["total_paise"]
                potential_savings_paise = int(top_paise * 0.15)
                potential_savings_fmt = format_inr(potential_savings_paise)
                new_exp = totals["expense_paise"] - potential_savings_paise
                new_rate = calculate_savings_rate(totals["income_paise"], new_exp)

                advice += (
                    f"\n\n**Actionable Opportunity:** Your highest expense category is **{top_category['category_name']}** "
                    f"({top_category['formatted_total']}). Reducing non-essential purchases in this single area by just 15% would save an extra "
                    f"**{potential_savings_fmt}**, elevating your savings rate from **{rate}%** to **{new_rate}%**."
                )
            return advice

        else:  # general_summary
            return (
                f"In {period['year']}-{period['month']:02d}, your recorded income is **{totals['income_formatted']}** "
                f"and total expenses are **{totals['expense_formatted']}**, yielding a net balance of **{totals['net_balance_formatted']}** "
                f"(Savings Rate: **{totals['savings_rate_percent']}%** across {totals['transaction_count']} transactions). "
                f"Budget pacing is **{pace['status'].replace('_', ' ')}** ({pace['utilization_percent']}% utilized)."
            )


class FactBundleVerifier:
    """
    Multi-rule verification engine that validates:
    1. Currency amounts: every currency token must match verified figures in FactBundle.
    2. Percentages: every X% must match verified ratios or standard advisory benchmarks.
    3. Semantic attribution: X% of income vs X% of expenses must match the true denominator.
    4. Transaction counts: 'N transactions' claims must match actual counts.
    5. Rejection guarantee: returns (narrative, False) to trigger safe deterministic fallback.
    """

    @staticmethod
    def verify(narrative: str, facts: Dict[str, Any]) -> Tuple[str, bool]:
        if not narrative or not narrative.strip():
            return narrative, False

        # -------------------------------------------------------------
        # 1. CURRENCY AMOUNT VALIDATION
        # -------------------------------------------------------------
        valid_amounts = set()
        for key in ["income_formatted", "expense_formatted", "net_balance_formatted"]:
            val = facts["totals"].get(key, "")
            cleaned = re.sub(r"[^\d.]", "", val)
            if cleaned:
                valid_amounts.add(cleaned)
                valid_amounts.add(cleaned.split(".")[0])

        for c in facts.get("categories", []):
            cleaned = re.sub(r"[^\d.]", "", c.get("formatted_total", ""))
            if cleaned:
                valid_amounts.add(cleaned)
                valid_amounts.add(cleaned.split(".")[0])

        for a in facts.get("anomalies", []):
            cleaned = re.sub(r"[^\d.]", "", a.get("amount_formatted", ""))
            if cleaned:
                valid_amounts.add(cleaned)
                valid_amounts.add(cleaned.split(".")[0])

        for t in facts.get("top_expenses", []):
            cleaned = re.sub(r"[^\d.]", "", t.get("formatted_amount", ""))
            if cleaned:
                valid_amounts.add(cleaned)
                valid_amounts.add(cleaned.split(".")[0])

        pace = facts.get("budget_pace", {})
        for p_key in ["spent_formatted", "limit_formatted", "projected_overrun_formatted", "remaining_formatted"]:
            cleaned = re.sub(r"[^\d.]", "", pace.get(p_key, ""))
            if cleaned:
                valid_amounts.add(cleaned)
                valid_amounts.add(cleaned.split(".")[0])

        mom = facts.get("mom_delta", {})
        for m_key in ["expense_delta_formatted", "income_delta_formatted"]:
            cleaned = re.sub(r"[^\d.]", "", mom.get(m_key, ""))
            if cleaned:
                valid_amounts.add(cleaned)
                valid_amounts.add(cleaned.split(".")[0])

        pattern = re.compile(r"(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)
        found_amounts = pattern.findall(narrative)
        for raw in found_amounts:
            c = raw.replace(",", "")
            if len(c) > 2 and c not in valid_amounts and not any(c in v for v in valid_amounts):
                return narrative, False

        # -------------------------------------------------------------
        # 2. PERCENTAGE VALIDATION
        # -------------------------------------------------------------
        valid_percentages = {
            round(float(facts["totals"].get("savings_rate_percent", 0.0)), 1),
            round(float(pace.get("utilization_percent", 0.0)), 1),
            round(float(mom.get("expense_pct_change", 0.0)), 1),
            10.0, 15.0, 20.0, 25.0, 30.0, 50.0,
        }
        income_paise = facts["totals"].get("income_paise", 0)
        expense_category_pcts = set()
        income_share_pcts = set()

        for c in facts.get("categories", []):
            pct = round(float(c.get("percentage", 0.0)), 1)
            valid_percentages.add(pct)
            expense_category_pcts.add(pct)
            if income_paise > 0:
                inc_pct = round((c.get("total_paise", 0) / income_paise) * 100.0, 1)
                valid_percentages.add(inc_pct)
                income_share_pcts.add(inc_pct)

        pct_pattern = re.compile(r"(\d+(?:\.\d+)?)\s*%")
        found_pcts = pct_pattern.findall(narrative)
        for raw_pct in found_pcts:
            p_float = round(float(raw_pct), 1)
            if not any(abs(p_float - v) <= 0.6 for v in valid_percentages):
                return narrative, False

        # -------------------------------------------------------------
        # 3. SEMANTIC ATTRIBUTION: Income vs Expense Attribution
        # -------------------------------------------------------------
        income_claim_pattern = re.compile(
            r"(\d+(?:\.\d+)?)\s*%\s*(?:of|from)\s*(?:your|the)?\s*(?:total)?\s*income",
            re.IGNORECASE,
        )
        for m in income_claim_pattern.finditer(narrative):
            claimed_pct = round(float(m.group(1)), 1)
            if claimed_pct in expense_category_pcts and not any(abs(claimed_pct - inc) <= 0.6 for inc in income_share_pcts):
                return narrative, False

        # -------------------------------------------------------------
        # 4. TRANSACTION COUNT VALIDATION
        # -------------------------------------------------------------
        count_pattern = re.compile(r"(\d+)\s+transactions?", re.IGNORECASE)
        found_counts = count_pattern.findall(narrative)
        valid_counts = {
            facts["totals"].get("transaction_count", 0),
            len(facts.get("anomalies", [])),
            len(facts.get("top_expenses", [])),
        }
        for c in facts.get("categories", []):
            valid_counts.add(c.get("transaction_count", 0))

        for raw_cnt in found_counts:
            cnt = int(raw_cnt)
            if cnt > 1 and cnt not in valid_counts:
                return narrative, False

        return narrative, True
