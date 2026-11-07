"""Pure deterministic domain functions for Financial Planning, Savings, and Income Calculations.
Zero financial hallucination: All arithmetic happens in integer paise (1 INR = 100 paise).
"""
from datetime import date
from typing import Any, Dict, List, Optional, Sequence
from app.domain.currency import format_inr, paise_to_rupees


def calculate_actual_savings(actual_income_paise: int, actual_expense_paise: int) -> int:
    """
    Actual Savings = Actual Income - Actual Expenses (in integer paise).
    Can be negative if actual spending exceeds actual income.
    """
    return actual_income_paise - actual_expense_paise


def calculate_remaining_budget(allocated_budget_paise: int, actual_expense_paise: int) -> int:
    """
    Remaining Budget = Allocated Budget - Actual Expenses (in integer paise).
    Can be negative if actual expenses exceed the allocated budget ceiling.
    """
    return allocated_budget_paise - actual_expense_paise


def calculate_planned_savings(monthly_income_paise: int, allocated_budget_paise: int) -> int:
    """
    Planned Savings = Monthly Income - Allocated Budget (in integer paise).
    Represents the projected savings cushion after fully funding all category budget ceilings.
    """
    return monthly_income_paise - allocated_budget_paise


def calculate_savings_rate(actual_savings_paise: int, actual_income_paise: int) -> float:
    """
    Savings Rate = (Actual Savings / Actual Income) * 100.
    Returns 0.0 if actual income is <= 0 or if actual savings are negative.
    Rounded to 2 decimal places.
    """
    if actual_income_paise <= 0 or actual_savings_paise <= 0:
        return 0.0
    rate = (actual_savings_paise / actual_income_paise) * 100.0
    return round(rate, 2)


def calculate_unallocated_income(monthly_income_paise: int, allocated_budget_paise: int) -> int:
    """
    Unallocated Income = Monthly Income - Allocated Budget (in integer paise).
    Positive: Income not yet assigned to any category budget.
    Negative: Budgets exceed monthly income.
    """
    return monthly_income_paise - allocated_budget_paise


def calculate_financial_plan_summary(
    monthly_income_paise: int,
    allocated_budget_paise: int,
    actual_expense_paise: int = 0,
    savings_target_paise: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Compile a complete, deterministic Financial Plan Summary.
    Guarantees strict separation between Planned Savings and Actual Savings.
    """
    planned_savings = calculate_planned_savings(monthly_income_paise, allocated_budget_paise)
    unallocated_income = calculate_unallocated_income(monthly_income_paise, allocated_budget_paise)
    actual_savings = calculate_actual_savings(monthly_income_paise, actual_expense_paise)
    remaining_budget = calculate_remaining_budget(allocated_budget_paise, actual_expense_paise)
    savings_rate = calculate_savings_rate(actual_savings, monthly_income_paise)

    # Status assessment
    is_budget_exceeded = actual_expense_paise > allocated_budget_paise if allocated_budget_paise > 0 else False
    is_income_exceeded_by_budget = allocated_budget_paise > monthly_income_paise if monthly_income_paise > 0 else False
    target_met = (actual_savings >= savings_target_paise) if savings_target_paise is not None else None

    return {
        "monthly_income_paise": monthly_income_paise,
        "monthly_income_formatted": format_inr(monthly_income_paise),
        "allocated_budget_paise": allocated_budget_paise,
        "allocated_budget_formatted": format_inr(allocated_budget_paise),
        "planned_savings_paise": planned_savings,
        "planned_savings_formatted": format_inr(planned_savings),
        "unallocated_income_paise": unallocated_income,
        "unallocated_income_formatted": format_inr(unallocated_income),
        "actual_expense_paise": actual_expense_paise,
        "actual_expense_formatted": format_inr(actual_expense_paise),
        "actual_savings_paise": actual_savings,
        "actual_savings_formatted": format_inr(actual_savings),
        "remaining_budget_paise": remaining_budget,
        "remaining_budget_formatted": format_inr(remaining_budget),
        "savings_rate_pct": savings_rate,
        "savings_target_paise": savings_target_paise,
        "savings_target_formatted": format_inr(savings_target_paise) if savings_target_paise is not None else None,
        "is_budget_exceeded": is_budget_exceeded,
        "is_income_exceeded_by_budget": is_income_exceeded_by_budget,
        "target_met": target_met,
    }
