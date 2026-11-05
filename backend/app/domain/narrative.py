"""Monthly Financial Intelligence Narrative Report Generator.

Adheres strictly to:
- Distinct separation of Measured Facts from AI-Generated Recommendations
- Pure integer paise computation
- Grounded Indian financial context
"""
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from app.domain.copilot import FactBundleBuilder
from app.domain.currency import format_inr


class MonthlyNarrativeReportGenerator:
    """Generates structured monthly intelligence reports combining verified ledger telemetry with actionable guidance."""

    @staticmethod
    def generate(db: Session, user_id: str, year: int, month: int) -> Dict[str, Any]:
        # 1. Gather comprehensive FactBundle
        facts = FactBundleBuilder.build(
            db=db,
            user_id=user_id,
            year=year,
            month=month,
            question="monthly report",
        )

        period = facts["period"]
        totals = facts["totals"]
        prev = facts["previous_month"]
        mom = facts["mom_delta"]
        pace = facts["budget_pace"]
        categories = facts["categories"]
        anomalies = facts["anomalies"]
        top_cat = facts["top_category"]

        # 2. Executive Verdict Construction
        rate = totals["savings_rate_percent"]
        if rate >= 40.0:
            health_status = "Exceptional"
            verdict_tone = "outstanding financial discipline"
        elif rate >= 20.0:
            health_status = "Healthy"
            verdict_tone = "stable savings buffer above standard benchmarks"
        elif rate > 0.0:
            health_status = "Moderate"
            verdict_tone = "positive cash flow but vulnerable savings rate"
        else:
            health_status = "Overspent"
            verdict_tone = "negative cash flow requiring immediate attention"

        executive_summary = (
            f"In {period['year']}-{period['month']:02d}, you maintained a **{health_status}** financial posture with {verdict_tone}. "
            f"You recorded total income of **{totals['income_formatted']}** against expenses of **{totals['expense_formatted']}**, "
            f"retaining **{totals['net_balance_formatted']}** ({totals['savings_rate_percent']}% savings rate) across {totals['transaction_count']} verified transactions."
        )

        # 3. Measured Facts Block
        measured_facts = {
            "period": f"{period['year']}-{period['month']:02d} ({period['total_days']} days)",
            "income": totals["income_formatted"],
            "expenses": totals["expense_formatted"],
            "net_balance": totals["net_balance_formatted"],
            "savings_rate": f"{totals['savings_rate_percent']}%",
            "transaction_count": totals["transaction_count"],
            "budget_spent": pace["spent_formatted"],
            "budget_limit": pace["limit_formatted"],
            "budget_utilization": f"{pace['utilization_percent']}%",
            "budget_pace_status": pace["status"],
            "top_category_name": top_cat["category_name"] if top_cat else "None",
            "top_category_amount": top_cat["formatted_total"] if top_cat else "₹0.00",
            "top_category_share": f"{top_cat['percentage']}%" if top_cat else "0%",
            "anomaly_count": len(anomalies),
            "mom_expense_change": f"{mom['expense_delta_formatted']} ({mom['expense_pct_change']}%)",
        }

        # 4. Significant Category Shifts
        shifts_narrative = []
        for s in mom["category_shifts"]:
            if s["diff_paise"] != 0:
                direction = "increased" if s["diff_paise"] > 0 else "decreased"
                shifts_narrative.append(
                    f"• **{s['category_name']}** {direction} by **{s['diff_formatted']}** "
                    f"(from {format_inr(s['previous_paise'])} to {format_inr(s['current_paise'])})."
                )

        # 5. Detected Anomalies Block
        anomaly_items = []
        for a in anomalies:
            anomaly_items.append({
                "description": a["description"],
                "date": a["date"],
                "amount": a["amount_formatted"],
                "evidence": a["evidence"],
            })

        # 6. Actionable AI Recommendations (Practical & Non-Prescriptive)
        recommendations: List[str] = []
        if top_cat:
            top_paise = top_cat["total_paise"]
            cut_10_fmt = format_inr(int(top_paise * 0.10))
            recommendations.append(
                f"**Optimize Dominant Category:** {top_cat['category_name']} represents {top_cat['percentage']}% of your expenditure. "
                f"Trimming discretionary line-items in this category by 10% would yield an additional **{cut_10_fmt}** in monthly surplus."
            )

        if pace["status"] == "over_pace":
            recommendations.append(
                f"**Pacing Adjustment:** You are currently trending ahead of scheduled budget pace by {pace['projected_overrun_formatted']}. "
                f"To close the month within budget, aim to cap remaining discretionary spend to approximately **{format_inr(int(pace['remaining_paise'] / max(1, pace['remaining_days'])))}/day**."
            )
        elif pace["status"] == "on_track":
            recommendations.append(
                f"**Sustained Momentum:** Your current daily burn rate is well calibrated to your budget limits. "
                f"Consider transferring your projected month-end surplus of **{pace['projected_overrun_formatted'].replace('-', '')}** into an emergency fund."
            )

        if anomalies:
            recommendations.append(
                f"**Review Single Spikes:** {len(anomalies)} transactions deviated significantly from baseline. "
                f"Verify whether one-off events like **{anomalies[0]['description']}** ({anomalies[0]['amount_formatted']}) are non-recurring."
            )

        if not recommendations:
            recommendations.append("Continue tracking daily ledger items to maintain a comprehensive financial baseline.")

        return {
            "year": year,
            "month": month,
            "title": f"Financial Intelligence Report — {period['year']}-{period['month']:02d}",
            "health_status": health_status,
            "executive_summary": executive_summary,
            "measured_facts": measured_facts,
            "category_shifts": shifts_narrative,
            "anomalies": anomaly_items,
            "recommendations": recommendations,
            "disclaimer": (
                "PennyPilot intelligence reports are generated from deterministic ledger computations. "
                "Recommendations are informational and do not constitute SEBI-registered investment or financial advice."
            ),
        }
