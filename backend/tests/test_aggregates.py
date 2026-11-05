"""Unit tests for income, expense, balance, savings rate, and category breakdowns."""
from datetime import date
from app.domain.aggregates import (
    calculate_category_breakdown,
    calculate_expense_total,
    calculate_income_total,
    calculate_monthly_aggregation,
    calculate_net_balance,
    calculate_savings_rate,
)


def test_income_and_expense_totals():
    txs = [
        {"kind": "income", "amount_paise": 5000000, "occurred_on": date(2026, 11, 1), "deleted_at": None},
        {"kind": "income", "amount_paise": 1000000, "occurred_on": date(2026, 11, 5), "deleted_at": None},
        {"kind": "expense", "amount_paise": 150000, "occurred_on": date(2026, 11, 2), "deleted_at": None},
        {"kind": "expense", "amount_paise": 250000, "occurred_on": date(2026, 11, 3), "deleted_at": None},
        # Soft-deleted transaction should be ignored
        {"kind": "expense", "amount_paise": 999999, "occurred_on": date(2026, 11, 4), "deleted_at": "2026-11-04T10:00:00"},
    ]

    income = calculate_income_total(txs)
    expense = calculate_expense_total(txs)
    net = calculate_net_balance(income, expense)
    savings_rate = calculate_savings_rate(income, expense)

    assert income == 6000000  # ₹60,000
    assert expense == 400000  # ₹4,000
    assert net == 5600000    # ₹56,000
    # Savings: (56,000 / 60,000) * 100 = 93.33%
    assert savings_rate == 93.33


def test_savings_rate_zero_and_overspend():
    assert calculate_savings_rate(0, 50000) == 0.0
    assert calculate_savings_rate(50000, 60000) == 0.0
    assert calculate_savings_rate(100000, 100000) == 0.0


def test_category_breakdown():
    txs = [
        {"kind": "expense", "amount_paise": 60000, "category_id": "c1", "category_name": "Groceries", "deleted_at": None},
        {"kind": "expense", "amount_paise": 40000, "category_id": "c1", "category_name": "Groceries", "deleted_at": None},
        {"kind": "expense", "amount_paise": 100000, "category_id": "c2", "category_name": "Dining", "deleted_at": None},
    ]

    breakdown = calculate_category_breakdown(txs, kind="expense")
    assert len(breakdown) == 2
    # Groceries total = 100000, Dining total = 100000, each 50%
    assert breakdown[0]["total_paise"] == 100000
    assert breakdown[0]["percentage"] == 50.0
    assert breakdown[1]["percentage"] == 50.0


def test_monthly_aggregation_boundaries():
    txs = [
        # Inside November 2026
        {"kind": "income", "amount_paise": 5000000, "occurred_on": date(2026, 11, 1), "deleted_at": None},
        {"kind": "expense", "amount_paise": 100000, "occurred_on": date(2026, 11, 30), "deleted_at": None},
        # Outside November 2026
        {"kind": "expense", "amount_paise": 999999, "occurred_on": date(2026, 10, 31), "deleted_at": None},
        {"kind": "expense", "amount_paise": 999999, "occurred_on": date(2026, 12, 1), "deleted_at": None},
    ]

    result = calculate_monthly_aggregation(txs, 2026, 11)
    assert result["transaction_count"] == 2
    assert result["income_paise"] == 5000000
    assert result["expense_paise"] == 100000
    assert result["net_balance_paise"] == 4900000
    assert result["total_days"] == 30
