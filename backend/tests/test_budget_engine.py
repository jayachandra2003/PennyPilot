"""Unit tests for budget utilization and pace projection engine."""
from datetime import date
from app.domain.budget_engine import calculate_budget_pace, calculate_budget_utilization


def test_budget_utilization_basic():
    # 50% utilization
    u = calculate_budget_utilization(spent_paise=500000, limit_paise=1000000)
    assert u["utilization_percent"] == 50.0
    assert u["remaining_paise"] == 500000
    assert u["is_over_budget"] is False
    assert u["overrun_paise"] == 0

    # Over budget
    u2 = calculate_budget_utilization(spent_paise=1200000, limit_paise=1000000)
    assert u2["utilization_percent"] == 120.0
    assert u2["remaining_paise"] == 0
    assert u2["is_over_budget"] is True
    assert u2["overrun_paise"] == 200000


def test_budget_pace_on_track():
    # In a 30-day month (Nov 2026), on day 10 (1/3rd elapsed)
    # Budget = ₹30,000 (3000000 paise). Ideal pace target = ₹10,000 (1000000 paise).
    # If user spent ₹8,000 (800000 paise):
    p = calculate_budget_pace(
        spent_paise=800000,
        limit_paise=3000000,
        as_of_date=date(2026, 11, 10),
        month_first_day=date(2026, 11, 1),
    )
    assert p["elapsed_days"] == 10
    assert p["total_days"] == 30
    assert p["remaining_days"] == 20
    assert p["target_pace_paise"] == 1000000  # ₹10,000
    assert p["projected_total_paise"] == 2400000  # ₹24,000 projected (< ₹30,000)
    assert p["status"] == "on_track"
    assert "On track" in p["verdict_sentence"]


def test_budget_pace_over_pace():
    # On day 10 of 30, budget = ₹30,000, but user already spent ₹15,000 (1500000 paise)
    # Run rate: ₹1,500/day -> projected ₹45,000 by month-end!
    p = calculate_budget_pace(
        spent_paise=1500000,
        limit_paise=3000000,
        as_of_date=date(2026, 11, 10),
        month_first_day=date(2026, 11, 1),
    )
    assert p["projected_total_paise"] == 4500000
    assert p["projected_overrun_paise"] == 1500000
    assert p["status"] == "over_pace"
    assert "On pace to overspend" in p["verdict_sentence"]


def test_budget_pace_already_over_budget():
    p = calculate_budget_pace(
        spent_paise=3500000,
        limit_paise=3000000,
        as_of_date=date(2026, 11, 15),
        month_first_day=date(2026, 11, 1),
    )
    assert p["status"] == "over_budget"
    assert p["is_over_budget"] is True
    assert "Budget exceeded" in p["verdict_sentence"]
