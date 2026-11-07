"""Integration tests for Income Management and First-Time Financial Onboarding.
Uses an isolated in-memory SQLite database to guarantee zero canonical DB pollution.
"""
from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_db():
    """Isolated in-memory SQLite database for every test."""
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
    client.cookies.clear()
    yield TestingSession
    client.cookies.clear()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def create_test_user_and_headers(TestingSession):
    db: Session = TestingSession()
    user = User(
        email="test_income_user@example.com",
        password_hash=hash_password("Password123!"),
        display_name="Income Tester",
        currency="INR",
        _email_verified=True,
        onboarding_completed=False,
    )
    db.add(user)
    db.flush()

    cats = [
        Category(user_id=user.id, name="Salary", kind="income", icon="banknote", color_token="emerald", sort_order=1),
        Category(user_id=user.id, name="Freelance / Other", kind="income", icon="briefcase", color_token="blue", sort_order=2),
        Category(user_id=user.id, name="Groceries", kind="expense", icon="shopping-cart", color_token="emerald", sort_order=1),
        Category(user_id=user.id, name="Housing & Rent", kind="expense", icon="home", color_token="indigo", sort_order=2),
    ]
    db.add_all(cats)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}
    user_id = user.id
    db.close()
    return user_id, headers


def test_income_crud_and_overview(isolated_db):
    user_id, headers = create_test_user_and_headers(isolated_db)

    # 1. Create primary income (Salary ₹1,00,000 = 10,000,000 paise)
    res = client.post(
        "/api/v1/income",
        headers=headers,
        json={
            "amount_paise": 10000000,
            "source": "Tech Corp Salary",
            "occurred_on": "2026-11-01",
            "description": "Monthly Software Engineer Salary",
            "is_recurring": True,
        },
    )
    assert res.status_code == 201, res.text
    sal_data = res.json()
    assert sal_data["amount_paise"] == 10000000
    assert sal_data["amount_formatted"] == "₹1,00,000.00"
    assert sal_data["source"] == "Tech Corp Salary"
    assert sal_data["is_recurring"] is True
    sal_id = sal_data["id"]

    # 2. Create secondary income (Freelance ₹25,000 = 2,500,000 paise)
    res2 = client.post(
        "/api/v1/income",
        headers=headers,
        json={
            "amount_paise": 2500000,
            "source": "Upwork Project",
            "occurred_on": "2026-11-05",
            "description": "Mobile UI Design Consulting",
            "is_recurring": False,
        },
    )
    assert res2.status_code == 201
    free_id = res2.json()["id"]

    # 3. Get Monthly Overview for 2026-11
    res_overview = client.get("/api/v1/income?year=2026&month=11", headers=headers)
    assert res_overview.status_code == 200
    overview = res_overview.json()
    assert overview["total_income_paise"] == 12500000  # ₹1,25,000.00
    assert overview["total_income_formatted"] == "₹1,25,000.00"
    assert len(overview["items"]) == 2
    assert len(overview["sources_breakdown"]) == 2
    assert overview["sources_breakdown"][0]["source"] == "Tech Corp Salary"
    assert overview["sources_breakdown"][0]["percentage"] == 80.0

    # 4. Update income
    res_up = client.put(
        f"/api/v1/income/{free_id}",
        headers=headers,
        json={
            "amount_paise": 3000000,
            "source": "Upwork Retainer",
        },
    )
    assert res_up.status_code == 200
    assert res_up.json()["amount_paise"] == 3000000
    assert res_up.json()["source"] == "Upwork Retainer"

    # 5. Delete secondary income
    res_del = client.delete(f"/api/v1/income/{free_id}", headers=headers)
    assert res_del.status_code == 204

    # 6. Verify Overview reflects deletion
    res_overview2 = client.get("/api/v1/income?year=2026&month=11", headers=headers)
    assert res_overview2.status_code == 200
    overview2 = res_overview2.json()
    assert overview2["total_income_paise"] == 10000000
    assert len(overview2["items"]) == 1


def test_onboarding_flow(isolated_db):
    user_id, headers = create_test_user_and_headers(isolated_db)
    db = isolated_db()

    # 1. Check initial onboarding status (incomplete)
    res_status = client.get("/api/v1/onboarding/status", headers=headers)
    assert res_status.status_code == 200
    assert res_status.json()["onboarding_completed"] is False

    # Get user's category IDs
    groceries_cat = db.query(Category).filter(Category.user_id == user_id, Category.name == "Groceries").first()
    housing_cat = db.query(Category).filter(Category.user_id == user_id, Category.name == "Housing & Rent").first()
    db.close()

    # 2. Test Skip Onboarding
    res_skip = client.post("/api/v1/onboarding/skip", headers=headers)
    assert res_skip.status_code == 200
    assert res_skip.json()["status"] == "skipped"

    # 3. Complete Onboarding Setup
    res_setup = client.post(
        "/api/v1/onboarding/setup",
        headers=headers,
        json={
            "month": "2026-11-01",
            "incomes": [
                {
                    "source": "Primary Salary",
                    "amount_paise": 15000000,  # ₹1,50,000
                    "occurred_on": "2026-11-01",
                    "is_recurring": True,
                },
                {
                    "source": "Freelance",
                    "amount_paise": 3000000,   # ₹30,000
                    "occurred_on": "2026-11-02",
                    "is_recurring": False,
                },
            ],
            "budgets": [
                {
                    "category_id": groceries_cat.id,
                    "limit_paise": 2500000,    # ₹25,000
                },
                {
                    "category_id": housing_cat.id,
                    "limit_paise": 4500000,    # ₹45,000
                },
            ],
            "monthly_savings_target_paise": 5000000,  # ₹50,000
        },
    )
    assert res_setup.status_code == 200, res_setup.text
    plan = res_setup.json()

    # Verification of financial computations
    # Total income = ₹1,80,000 (18,000,000 paise)
    # Total budget = ₹70,000 (7,000,000 paise)
    # Planned savings = ₹1,10,000 (11,000,000 paise)
    # Unallocated income = ₹1,10,000 (11,000,000 paise)
    assert plan["monthly_income_paise"] == 18000000
    assert plan["monthly_income_formatted"] == "₹1,80,000.00"
    assert plan["allocated_budget_paise"] == 7000000
    assert plan["allocated_budget_formatted"] == "₹70,000.00"
    assert plan["planned_savings_paise"] == 11000000
    assert plan["planned_savings_formatted"] == "₹1,10,000.00"
    assert plan["unallocated_income_paise"] == 11000000
    assert plan["savings_target_paise"] == 5000000
    assert plan["savings_target_formatted"] == "₹50,000.00"

    # 4. Check status is now completed
    res_status2 = client.get("/api/v1/onboarding/status", headers=headers)
    assert res_status2.status_code == 200
    status_data = res_status2.json()
    assert status_data["onboarding_completed"] is True
    assert status_data["has_income_configured"] is True
    assert status_data["has_budgets_configured"] is True
    assert status_data["monthly_savings_target_paise"] == 5000000
