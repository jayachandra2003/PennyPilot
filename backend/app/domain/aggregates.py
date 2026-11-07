"""Pure deterministic financial aggregates: income, expense, balance, category breakdown."""
from collections import defaultdict
from datetime import date
from typing import Any, Dict, List, Optional, Protocol, Sequence
from app.domain.currency import paise_to_rupees, format_inr
from app.domain.timezone import get_month_boundaries


class TransactionLike(Protocol):
    kind: str
    amount_paise: int
    occurred_on: date
    category_id: Optional[str]
    category_name: Optional[str]
    deleted_at: Optional[Any]


def _is_active(tx: Any) -> bool:
    if isinstance(tx, dict):
        return tx.get("deleted_at") is None
    return getattr(tx, "deleted_at", None) is None


def _get_field(tx: Any, field: str, default: Any = None) -> Any:
    if isinstance(tx, dict):
        return tx.get(field, default)
    return getattr(tx, field, default)


def calculate_income_total(transactions: Sequence[Any]) -> int:
    """Sum total income in integer paise from active transactions."""
    total = 0
    for tx in transactions:
        if _is_active(tx) and _get_field(tx, "kind") == "income":
            total += int(_get_field(tx, "amount_paise", 0))
    return total


def calculate_expense_total(transactions: Sequence[Any]) -> int:
    """Sum total expense in integer paise from active transactions."""
    total = 0
    for tx in transactions:
        if _is_active(tx) and _get_field(tx, "kind") == "expense":
            total += int(_get_field(tx, "amount_paise", 0))
    return total


def calculate_net_balance(income_paise: int, expense_paise: int) -> int:
    """Net balance in integer paise (can be negative if overspent)."""
    return income_paise - expense_paise


def calculate_savings_rate(income_paise: int, expense_paise: int) -> float:
    """
    Calculate savings rate percentage (0.0 to 100.0%).
    Returns 0.0 if income <= 0 or if expenses exceed income.
    """
    if income_paise <= 0:
        return 0.0
    net = income_paise - expense_paise
    if net <= 0:
        return 0.0
    rate = (net / income_paise) * 100.0
    return round(rate, 2)


def calculate_category_breakdown(
    transactions: Sequence[Any],
    kind: str = "expense",
) -> List[Dict[str, Any]]:
    """
    Compute total and percentage breakdown per category.
    Returns list sorted in descending order of spend.
    """
    cat_totals: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"total_paise": 0, "name": "Uncategorized", "count": 0})
    grand_total_paise = 0

    for tx in transactions:
        if not _is_active(tx):
            continue
        if _get_field(tx, "kind") != kind:
            continue

        amount = int(_get_field(tx, "amount_paise", 0))
        cat_id = _get_field(tx, "category_id") or "uncategorized"
        cat_name = _get_field(tx, "category_name") or "Uncategorized"

        cat_totals[cat_id]["total_paise"] += amount
        cat_totals[cat_id]["name"] = cat_name
        cat_totals[cat_id]["count"] += 1
        grand_total_paise += amount

    results = []
    for cat_id, data in cat_totals.items():
        total = data["total_paise"]
        pct = round((total / grand_total_paise * 100.0), 2) if grand_total_paise > 0 else 0.0
        results.append({
            "category_id": cat_id,
            "category_name": data["name"],
            "total_paise": total,
            "total_rupees": paise_to_rupees(total),
            "formatted_total": format_inr(total),
            "percentage": pct,
            "transaction_count": data["count"],
        })

    results.sort(key=lambda x: x["total_paise"], reverse=True)
    return results


def calculate_monthly_aggregation(
    transactions: Sequence[Any],
    year: int,
    month: int,
) -> Dict[str, Any]:
    """Calculate all key totals and breakdowns for a given calendar month."""
    start_date, end_date, total_days = get_month_boundaries(year, month)

    month_txs = [
        tx for tx in transactions
        if _is_active(tx) and start_date <= _get_field(tx, "occurred_on") <= end_date
    ]

    income_paise = calculate_income_total(month_txs)
    expense_paise = calculate_expense_total(month_txs)
    net_paise = calculate_net_balance(income_paise, expense_paise)
    savings_rate = calculate_savings_rate(income_paise, expense_paise)
    categories = calculate_category_breakdown(month_txs, kind="expense")

    return {
        "year": year,
        "month": month,
        "first_day": start_date.isoformat(),
        "last_day": end_date.isoformat(),
        "total_days": total_days,
        "transaction_count": len(month_txs),
        "income_paise": income_paise,
        "income_formatted": format_inr(income_paise),
        "expense_paise": expense_paise,
        "expense_formatted": format_inr(expense_paise),
        "net_balance_paise": net_paise,
        "net_balance_formatted": format_inr(net_paise),
        "savings_rate_percent": savings_rate,
        "category_breakdown": categories,
    }


MONTH_NAMES = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]


def calculate_yearly_aggregation(
    transactions: Sequence[Any],
    year: int,
) -> Dict[str, Any]:
    """Calculate all key totals, breakdowns, and monthly trajectory for a full calendar year.
    Strictly uses actual recorded transactions in integer paise.
    Does NOT extrapolate or multiply monthly income by 12.
    """
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)

    year_txs = [
        tx for tx in transactions
        if _is_active(tx) and start_date <= _get_field(tx, "occurred_on") <= end_date
    ]

    income_paise = calculate_income_total(year_txs)
    expense_paise = calculate_expense_total(year_txs)
    net_paise = calculate_net_balance(income_paise, expense_paise)
    savings_rate = calculate_savings_rate(income_paise, expense_paise)
    categories = calculate_category_breakdown(year_txs, kind="expense")

    # Build 12-month trajectory
    monthly_trajectory = []
    for m in range(1, 13):
        m_start, m_end, _ = get_month_boundaries(year, m)
        m_txs = [
            tx for tx in year_txs
            if m_start <= _get_field(tx, "occurred_on") <= m_end
        ]
        m_inc = calculate_income_total(m_txs)
        m_exp = calculate_expense_total(m_txs)
        m_net = calculate_net_balance(m_inc, m_exp)
        m_rate = calculate_savings_rate(m_inc, m_exp)

        monthly_trajectory.append({
            "month": m,
            "month_name": MONTH_NAMES[m],
            "income_paise": m_inc,
            "income_formatted": format_inr(m_inc),
            "expense_paise": m_exp,
            "expense_formatted": format_inr(m_exp),
            "net_balance_paise": m_net,
            "net_balance_formatted": format_inr(m_net),
            "savings_rate_percent": m_rate,
            "transaction_count": len(m_txs),
        })

    total_days = 366 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 365

    return {
        "period": "yearly",
        "year": year,
        "month": None,
        "first_day": start_date.isoformat(),
        "last_day": end_date.isoformat(),
        "total_days": total_days,
        "transaction_count": len(year_txs),
        "income_paise": income_paise,
        "income_formatted": format_inr(income_paise),
        "expense_paise": expense_paise,
        "expense_formatted": format_inr(expense_paise),
        "net_balance_paise": net_paise,
        "net_balance_formatted": format_inr(net_paise),
        "savings_rate_percent": savings_rate,
        "category_breakdown": categories,
        "monthly_trajectory": monthly_trajectory,
    }


def calculate_historical_analytics(
    transactions: Sequence[Any],
    end_year: int,
    end_month: int,
    num_months: int = 6,
) -> Dict[str, Any]:
    """
    Calculate deterministic N-month historical financial analytics.
    Generates chronological sequence of months ending at (end_year, end_month),
    computing income, expenses, net savings, savings rates, MoM comparisons,
    and category breakdowns for each month.
    """
    if num_months < 1:
        num_months = 6

    # Generate chronological list of (year, month) tuples ending at (end_year, end_month)
    month_tuples = []
    cy, cm = end_year, end_month
    for _ in range(num_months):
        month_tuples.append((cy, cm))
        cm -= 1
        if cm < 1:
            cm = 12
            cy -= 1
    month_tuples.reverse()  # oldest to newest

    months_data: List[Dict[str, Any]] = []
    window_active_txs = []
    earliest_start, _, _ = get_month_boundaries(month_tuples[0][0], month_tuples[0][1])
    _, latest_end, _ = get_month_boundaries(month_tuples[-1][0], month_tuples[-1][1])

    for y, m in month_tuples:
        agg = calculate_monthly_aggregation(transactions, y, m)
        dt = date(y, m, 1)
        month_name = dt.strftime("%b %Y")
        month_short = dt.strftime("%b")
        is_empty = (agg["transaction_count"] == 0)

        month_entry = {
            "year": y,
            "month": m,
            "month_name": month_name,
            "month_short": month_short,
            "first_day": agg["first_day"],
            "last_day": agg["last_day"],
            "total_days": agg["total_days"],
            "transaction_count": agg["transaction_count"],
            "is_empty": is_empty,
            "income_paise": agg["income_paise"],
            "income_formatted": agg["income_formatted"],
            "expense_paise": agg["expense_paise"],
            "expense_formatted": agg["expense_formatted"],
            "net_balance_paise": agg["net_balance_paise"],
            "net_balance_formatted": agg["net_balance_formatted"],
            "savings_rate_percent": agg["savings_rate_percent"],
            "category_breakdown": agg["category_breakdown"],
            "expense_mom_delta_paise": None,
            "expense_mom_delta_formatted": None,
            "expense_mom_pct": None,
            "income_mom_delta_paise": None,
            "income_mom_delta_formatted": None,
            "income_mom_pct": None,
            "savings_rate_mom_delta": None,
        }
        months_data.append(month_entry)

    # Compute Month-over-Month deltas
    for i in range(1, len(months_data)):
        prev = months_data[i - 1]
        curr = months_data[i]

        exp_delta = curr["expense_paise"] - prev["expense_paise"]
        curr["expense_mom_delta_paise"] = exp_delta
        curr["expense_mom_delta_formatted"] = format_inr(exp_delta)
        if prev["expense_paise"] > 0:
            curr["expense_mom_pct"] = round((exp_delta / prev["expense_paise"]) * 100.0, 1)
        elif curr["expense_paise"] > 0:
            curr["expense_mom_pct"] = 100.0
        else:
            curr["expense_mom_pct"] = 0.0

        inc_delta = curr["income_paise"] - prev["income_paise"]
        curr["income_mom_delta_paise"] = inc_delta
        curr["income_mom_delta_formatted"] = format_inr(inc_delta)
        if prev["income_paise"] > 0:
            curr["income_mom_pct"] = round((inc_delta / prev["income_paise"]) * 100.0, 1)
        elif curr["income_paise"] > 0:
            curr["income_mom_pct"] = 100.0
        else:
            curr["income_mom_pct"] = 0.0

        curr["savings_rate_mom_delta"] = round(curr["savings_rate_percent"] - prev["savings_rate_percent"], 2)

    # Compute Overall Summary
    total_income_paise = sum(m["income_paise"] for m in months_data)
    total_expense_paise = sum(m["expense_paise"] for m in months_data)
    total_net_savings_paise = total_income_paise - total_expense_paise
    active_months_count = sum(1 for m in months_data if not m["is_empty"])

    avg_income = round(total_income_paise / num_months) if num_months > 0 else 0
    avg_expense = round(total_expense_paise / num_months) if num_months > 0 else 0
    avg_savings = round(total_net_savings_paise / num_months) if num_months > 0 else 0
    overall_savings_rate = calculate_savings_rate(total_income_paise, total_expense_paise)

    # Top categories across all active transactions in this time window
    for tx in transactions:
        if _is_active(tx):
            occ = _get_field(tx, "occurred_on")
            if earliest_start <= occ <= latest_end:
                window_active_txs.append(tx)

    top_categories = calculate_category_breakdown(window_active_txs, kind="expense")

    overall = {
        "total_income_paise": total_income_paise,
        "total_income_formatted": format_inr(total_income_paise),
        "total_expense_paise": total_expense_paise,
        "total_expense_formatted": format_inr(total_expense_paise),
        "total_net_savings_paise": total_net_savings_paise,
        "total_net_savings_formatted": format_inr(total_net_savings_paise),
        "average_monthly_income_paise": avg_income,
        "average_monthly_income_formatted": format_inr(avg_income),
        "average_monthly_expense_paise": avg_expense,
        "average_monthly_expense_formatted": format_inr(avg_expense),
        "average_monthly_savings_paise": avg_savings,
        "average_monthly_savings_formatted": format_inr(avg_savings),
        "overall_savings_rate_percent": overall_savings_rate,
        "months_count": num_months,
        "active_months_count": active_months_count,
        "top_categories": top_categories,
    }

    return {
        "months": months_data,
        "overall": overall,
    }

