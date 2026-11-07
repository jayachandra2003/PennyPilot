"""Unit & integration tests for Yearly/Monthly Period Views and Critical Calculation Rules."""
from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.domain.aggregates import calculate_yearly_aggregation
from app.main import app
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestingSession
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_yearly_aggregation_pure_domain_rules():
    """Verify that yearly income is the sum of actual transactions, NOT monthly * 12."""
    txs = [
        # 2026 transactions
        {"kind": "income", "amount_paise": 10000000, "occurred_on": date(2026, 1, 15), "category_id": "c1", "deleted_at": None},
        {"kind": "income", "amount_paise": 5000000, "occurred_on": date(2026, 6, 20), "category_id": "c1", "deleted_at": None},
        {"kind": "expense", "amount_paise": 4000000, "occurred_on": date(2026, 2, 10), "category_id": "c2", "category_name": "Groceries", "deleted_at": None},
        {"kind": "expense", "amount_paise": 3000000, "occurred_on": date(2026, 6, 25), "category_id": "c3", "category_name": "Dining", "deleted_at": None},
        # 2025 transaction (must be excluded from 2026 calculation)
        {"kind": "income", "amount_paise": 9999999, "occurred_on": date(2025, 12, 31), "category_id": "c1", "deleted_at": None},
    ]

    res = calculate_yearly_aggregation(txs, year=2026)

    assert res["period"] == "yearly"
    assert res["year"] == 2026
    # Total actual income = 10,000,000 + 5,000,000 = 15,000,000 (₹1,50,000), NOT monthly * 12
    assert res["income_paise"] == 15000000
    assert res["income_formatted"] == "₹1,50,000.00"
    # Total actual expenses = 4,000,000 + 3,000,000 = 7,000,000 (₹70,000)
    assert res["expense_paise"] == 7000000
    assert res["expense_formatted"] == "₹70,000.00"
    # Net savings = 15,000,000 - 7,000,000 = 8,000,000 (₹80,000)
    assert res["net_balance_paise"] == 8000000
    # Savings rate = (8,000,000 / 15,000,000) * 100 = 53.33%
    assert res["savings_rate_percent"] == 53.33

    # Trajectory must have all 12 months
    assert len(res["monthly_trajectory"]) == 12
    # January has 10,000,000 income, 0 expense
    jan = res["monthly_trajectory"][0]
    assert jan["month"] == 1
    assert jan["income_paise"] == 10000000
    assert jan["expense_paise"] == 0

    # Inactive month (e.g. March) has 0 income, 0 expense
    mar = res["monthly_trajectory"][2]
    assert mar["month"] == 3
    assert mar["income_paise"] == 0
    assert mar["expense_paise"] == 0
    assert mar["savings_rate_percent"] == 0.0


def test_yearly_period_endpoints(isolated_db):
    """Integration test verifying GET /transactions/summary?period=yearly and GET /income?period=yearly."""
    db = isolated_db()
    user = User(email="period_tester@pennypilot.in", password_hash="fake", display_name="Period Tester")
    db.add(user)
    db.flush()

    cat_inc = Category(user_id=user.id, name="Salary", kind="income", icon="banknote", color_token="emerald")
    cat_exp = Category(user_id=user.id, name="Housing", kind="expense", icon="home", color_token="amber")
    db.add_all([cat_inc, cat_exp])
    db.flush()

    t1 = Transaction(user_id=user.id, category_id=cat_inc.id, kind="income", amount_paise=8000000, occurred_on=date(2026, 3, 1), merchant="Client A", description="Freelance Retainer")
    t2 = Transaction(user_id=user.id, category_id=cat_exp.id, kind="expense", amount_paise=3000000, occurred_on=date(2026, 3, 5), description="Rent Payment")
    db.add_all([t1, t2])
    db.commit()

    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}
    db.close()

    # 1. Transactions Yearly Summary
    res_summary = client.get("/api/v1/transactions/summary?year=2026&period=yearly", headers=headers)
    assert res_summary.status_code == 200
    s_data = res_summary.json()
    assert s_data["period"] == "yearly"
    assert s_data["income_paise"] == 8000000
    assert s_data["expense_paise"] == 3000000
    assert len(s_data["monthly_trajectory"]) == 12

    # 2. Income Yearly Overview
    res_inc = client.get("/api/v1/income?year=2026&period=yearly", headers=headers)
    assert res_inc.status_code == 200
    i_data = res_inc.json()
    assert i_data["period"] == "yearly"
    assert i_data["total_income_paise"] == 8000000
    assert len(i_data["sources_breakdown"]) == 1
    assert i_data["sources_breakdown"][0]["source"] == "Client A"
