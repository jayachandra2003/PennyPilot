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
