"""Pure deterministic budget utilization and pacing engine."""
from calendar import monthrange
from datetime import date
from typing import Any, Dict
from app.domain.currency import paise_to_rupees, format_inr


def calculate_budget_utilization(spent_paise: int, limit_paise: int) -> Dict[str, Any]:
    """
    Calculate simple budget utilization and remaining amounts.
    """
    if limit_paise <= 0:
        utilization_pct = 100.0 if spent_paise > 0 else 0.0
    else:
        utilization_pct = round((spent_paise / limit_paise) * 100.0, 2)

    remaining_paise = max(0, limit_paise - spent_paise)
    overrun_paise = max(0, spent_paise - limit_paise)
    is_over = spent_paise > limit_paise

    return {
        "spent_paise": spent_paise,
        "spent_formatted": format_inr(spent_paise),
        "limit_paise": limit_paise,
        "limit_formatted": format_inr(limit_paise),
        "remaining_paise": remaining_paise,
        "remaining_formatted": format_inr(remaining_paise),
        "overrun_paise": overrun_paise,
        "overrun_formatted": format_inr(overrun_paise),
        "utilization_percent": utilization_pct,
        "is_over_budget": is_over,
    }


def calculate_budget_pace(
    spent_paise: int,
    limit_paise: int,
    as_of_date: date,
    month_first_day: date,
) -> Dict[str, Any]:
    """
    Calculate linear budget pacing through the month.
    Answers: 'At your current spending rate, will you finish over or under budget?'
    """
    _, total_days = monthrange(month_first_day.year, month_first_day.month)

    # Calculate elapsed days in the target month up to as_of_date
    if as_of_date < month_first_day:
        elapsed_days = 1
    elif as_of_date.year == month_first_day.year and as_of_date.month == month_first_day.month:
        elapsed_days = max(1, min(as_of_date.day, total_days))
    else:
        # Date is past target month
        elapsed_days = total_days

    remaining_days = max(0, total_days - elapsed_days)

    # Ideal target spend up to current day
    ideal_pace_ratio = elapsed_days / float(total_days)
    target_pace_paise = int(limit_paise * ideal_pace_ratio)

    # Projected month-end spend based on daily run-rate so far
    daily_spend_rate_paise = spent_paise / float(elapsed_days)
    projected_total_paise = int(daily_spend_rate_paise * total_days)
    projected_overrun_paise = projected_total_paise - limit_paise

    # Determine status
    if spent_paise > limit_paise:
        status = "over_budget"
        verdict = f"Budget exceeded by {format_inr(spent_paise - limit_paise)}."
    elif projected_total_paise > limit_paise:
        status = "over_pace"
        verdict = f"On pace to overspend by approximately {format_inr(projected_overrun_paise)} by month-end."
    elif spent_paise > target_pace_paise:
        status = "caution"
        verdict = f"Spending slightly faster than scheduled ({format_inr(spent_paise)} vs target {format_inr(target_pace_paise)})."
    else:
        status = "on_track"
        projected_savings = max(0, limit_paise - projected_total_paise)
        verdict = f"On track. Projected to save {format_inr(projected_savings)} by month-end."

    utilization = calculate_budget_utilization(spent_paise, limit_paise)

    return {
        **utilization,
        "as_of_date": as_of_date.isoformat(),
        "total_days": total_days,
        "elapsed_days": elapsed_days,
        "remaining_days": remaining_days,
        "target_pace_paise": target_pace_paise,
        "target_pace_formatted": format_inr(target_pace_paise),
        "projected_total_paise": projected_total_paise,
        "projected_total_formatted": format_inr(projected_total_paise),
        "projected_overrun_paise": max(0, projected_overrun_paise),
        "projected_overrun_formatted": format_inr(max(0, projected_overrun_paise)),
        "status": status,
        "verdict_sentence": verdict,
    }
