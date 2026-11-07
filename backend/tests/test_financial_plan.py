"""Unit tests for pure deterministic financial planning functions."""
import pytest
from app.domain.financial_plan import (
    calculate_actual_savings,
    calculate_remaining_budget,
    calculate_planned_savings,
    calculate_savings_rate,
    calculate_unallocated_income,
    calculate_financial_plan_summary,
)


def test_calculate_actual_savings():
    # Regular savings: ₹1,00,000 income, ₹40,000 expense
    assert calculate_actual_savings(10000000, 4000000) == 6000000
    # Overspending: ₹50,000 income, ₹60,000 expense
    assert calculate_actual_savings(5000000, 6000000) == -1000000
    # Zero expense
    assert calculate_actual_savings(5000000, 0) == 5000000
    # Zero income
    assert calculate_actual_savings(0, 1000000) == -1000000


def test_calculate_remaining_budget():
    # Within budget: ₹50,000 allocated, ₹30,000 spent
    assert calculate_remaining_budget(5000000, 3000000) == 2000000
    # Exceeded budget: ₹50,000 allocated, ₹55,000 spent
    assert calculate_remaining_budget(5000000, 5500000) == -500000
    # Exact budget
    assert calculate_remaining_budget(5000000, 5000000) == 0


def test_calculate_planned_savings():
    # Income ₹1,20,000, allocated budget ₹75,000 -> Planned savings ₹45,000
    assert calculate_planned_savings(12000000, 7500000) == 4500000
    # Income ₹50,000, allocated budget ₹60,000 -> Negative planned savings ₹-10,000
    assert calculate_planned_savings(5000000, 6000000) == -1000000


def test_calculate_savings_rate():
    # Income ₹1,00,000, savings ₹30,000 -> 30.0%
    assert calculate_savings_rate(3000000, 10000000) == 30.0
    # Zero income -> 0.0%
    assert calculate_savings_rate(3000000, 0) == 0.0
    # Negative income -> 0.0%
    assert calculate_savings_rate(3000000, -500000) == 0.0
    # Negative savings (deficit) -> 0.0%
    assert calculate_savings_rate(-1000000, 5000000) == 0.0
    # Fractional rate: ₹10,000 of ₹30,000 -> 33.33%
    assert calculate_savings_rate(1000000, 3000000) == 33.33


def test_calculate_unallocated_income():
    # Income ₹80,000, allocated ₹50,000 -> ₹30,000 unallocated
    assert calculate_unallocated_income(8000000, 5000000) == 3000000
    # Income ₹50,000, allocated ₹50,000 -> ₹0 unallocated
    assert calculate_unallocated_income(5000000, 5000000) == 0
    # Income ₹40,000, allocated ₹50,000 -> ₹-10,000 (overallocated)
    assert calculate_unallocated_income(4000000, 5000000) == -1000000


def test_calculate_financial_plan_summary():
    summary = calculate_financial_plan_summary(
        monthly_income_paise=10000000,     # ₹1,00,000
        allocated_budget_paise=6000000,    # ₹60,000
        actual_expense_paise=2500000,      # ₹25,000
        savings_target_paise=3000000,      # ₹30,000
    )
    assert summary["monthly_income_paise"] == 10000000
    assert summary["monthly_income_formatted"] == "₹1,00,000.00"
    assert summary["allocated_budget_paise"] == 6000000
    assert summary["planned_savings_paise"] == 4000000
    assert summary["planned_savings_formatted"] == "₹40,000.00"
    assert summary["unallocated_income_paise"] == 4000000
    assert summary["actual_savings_paise"] == 7500000      # ₹1,00,000 - ₹25,000
    assert summary["remaining_budget_paise"] == 3500000    # ₹60,000 - ₹25,000
    assert summary["savings_rate_pct"] == 75.0
    assert summary["target_met"] is True
    assert summary["is_budget_exceeded"] is False
    assert summary["is_income_exceeded_by_budget"] is False
