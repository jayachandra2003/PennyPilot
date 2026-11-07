"""Comprehensive integration and unit tests for Milestone 2: Custom Category Management & 6-Month Historical Financial Analytics."""
from datetime import date
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.api.v1.endpoints.auth import seed_default_categories

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_db():
    """Ensure complete isolation: tests execute entirely in an in-memory SQLite database."""
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


def _create_user(email: str = "m2_user@pennypilot.in") -> tuple[str, User]:
    override = app.dependency_overrides.get(get_db)
    db = next(override()) if override else SessionLocal()
    u = User(
        email=email,
        display_name=email.split("@")[0],
        password_hash="hashed_pw_dummy",
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    seed_default_categories(db, u.id)
    db.commit()
    token = create_access_token(subject=u.id)
    db.close()
    return token, u


def test_category_list_and_defaults():
    token, user = _create_user("cat_list@pennypilot.in")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/categories", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 12

    # Check default categories flags
    defaults = [c for c in data if c["is_default"]]
    assert len(defaults) == 12
    for c in defaults:
        assert c["transaction_count"] == 0
        assert c["has_active_budget"] is False
        assert c["is_archived"] is False


def test_category_create_custom_expense_and_income():
    token, user = _create_user("cat_create@pennypilot.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Create custom expense category
    res_exp = client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": "Pet Supplies", "kind": "expense", "icon": "heart", "color_token": "amber"},
    )
    assert res_exp.status_code == 201
    exp_cat = res_exp.json()
    assert exp_cat["name"] == "Pet Supplies"
    assert exp_cat["kind"] == "expense"
    assert exp_cat["icon"] == "heart"
    assert exp_cat["color_token"] == "amber"
    assert exp_cat["is_default"] is False
    assert exp_cat["transaction_count"] == 0
    assert exp_cat["has_active_budget"] is False

    # Create custom income category
    res_inc = client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": "Stock Dividends", "kind": "income", "icon": "coins", "color_token": "emerald"},
    )
    assert res_inc.status_code == 201
    inc_cat = res_inc.json()
    assert inc_cat["name"] == "Stock Dividends"
    assert inc_cat["kind"] == "income"
    assert inc_cat["is_default"] is False


def test_category_duplicate_rejection():
    token, user = _create_user("cat_dup@pennypilot.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to create duplicate of existing default category "Groceries"
    res = client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": "groceries", "kind": "expense"},
    )
    assert res.status_code == 400
    assert "already exists" in res.json().get("message", "").lower() or res.json().get("code") == "CATEGORY_ALREADY_EXISTS"


def test_category_edit_custom():
    token, user = _create_user("cat_edit@pennypilot.in")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": "Gym & Fitness", "kind": "expense", "icon": "dumbbell", "color_token": "blue"},
    )
    cat_id = create_res.json()["id"]

    patch_res = client.patch(
        f"/api/v1/categories/{cat_id}",
        headers=headers,
        json={"name": "Health & Gym", "icon": "heart-pulse", "color_token": "rose"},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["name"] == "Health & Gym"
    assert updated["icon"] == "heart-pulse"
    assert updated["color_token"] == "rose"


def test_category_rename_default_rejected():
    token, user = _create_user("cat_rename_def@pennypilot.in")
    headers = {"Authorization": f"Bearer {token}"}

    list_res = client.get("/api/v1/categories", headers=headers)
    groceries = next(c for c in list_res.json() if c["name"] == "Groceries")

    # Attempt to rename default category
    patch_res = client.patch(
        f"/api/v1/categories/{groceries['id']}",
        headers=headers,
        json={"name": "Supermarket Food"},
    )
    assert patch_res.status_code == 400
    assert "default system categories cannot be renamed" in patch_res.json().get("message", "").lower()

    # But changing icon/color on default is allowed
    patch_ok = client.patch(
        f"/api/v1/categories/{groceries['id']}",
        headers=headers,
        json={"color_token": "green"},
    )
    assert patch_ok.status_code == 200
    assert patch_ok.json()["color_token"] == "green"


def test_category_archive_default_rejected():
    token, user = _create_user("cat_archive_def@pennypilot.in")
    headers = {"Authorization": f"Bearer {token}"}

    list_res = client.get("/api/v1/categories", headers=headers)
    groceries = next(c for c in list_res.json() if c["name"] == "Groceries")

    # DELETE /categories/{id}
    del_res = client.delete(f"/api/v1/categories/{groceries['id']}", headers=headers)
    assert del_res.status_code == 400
    assert "default system categories cannot be archived" in del_res.json().get("message", "").lower()

    # PATCH /categories/{id} with is_archived: true
    patch_res = client.patch(
        f"/api/v1/categories/{groceries['id']}",
        headers=headers,
        json={"is_archived": True},
    )
    assert patch_res.status_code == 400
    assert "default system categories cannot be archived" in patch_res.json().get("message", "").lower()


def test_category_archive_with_active_budget_rejected():
    token, user = _create_user("cat_budget_archive@pennypilot.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Create custom category
    cat_res = client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": "Gadgets", "kind": "expense"},
    )
    cat_id = cat_res.json()["id"]

    # Assign an active budget
    budget_res = client.put(
        "/api/v1/budgets",
        headers=headers,
        json={
            "month": "2026-11-01",
            "budgets": [{"category_id": cat_id, "limit_paise": 500000}],  # ₹5,000
        },
    )
    assert budget_res.status_code == 200

    # Verify category now reports has_active_budget = True
    list_res = client.get("/api/v1/categories", headers=headers)
    gadgets_cat = next(c for c in list_res.json() if c["id"] == cat_id)
    assert gadgets_cat["has_active_budget"] is True

    # Attempt to archive -> Must be rejected to prevent financial inconsistency
    del_res = client.delete(f"/api/v1/categories/{cat_id}", headers=headers)
    assert del_res.status_code == 400
    assert "active monthly budgets" in del_res.json().get("message", "").lower()


def test_category_archive_and_restore_custom():
    token, user = _create_user("cat_archive_restore@pennypilot.in")
    headers = {"Authorization": f"Bearer {token}"}

    cat_res = client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": "Temporary Hobby", "kind": "expense"},
    )
    cat_id = cat_res.json()["id"]

    # Soft-archive
    del_res = client.delete(f"/api/v1/categories/{cat_id}", headers=headers)
    assert del_res.status_code == 204

    # Default list should exclude archived
    list_active = client.get("/api/v1/categories", headers=headers).json()
    assert not any(c["id"] == cat_id for c in list_active)

    # With include_archived=true it should appear
    list_all = client.get("/api/v1/categories?include_archived=true", headers=headers).json()
    archived_cat = next(c for c in list_all if c["id"] == cat_id)
    assert archived_cat["is_archived"] is True

    # Restore via PATCH
    restore_res = client.patch(
        f"/api/v1/categories/{cat_id}",
        headers=headers,
        json={"is_archived": False},
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["is_archived"] is False


def test_category_multi_tenant_isolation():
    token_a, user_a = _create_user("user_a@pennypilot.in")
    token_b, user_b = _create_user("user_b@pennypilot.in")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a category
    res = client.post(
        "/api/v1/categories",
        headers=headers_a,
        json={"name": "User A Secret Hobby", "kind": "expense"},
    )
    cat_id_a = res.json()["id"]

    # User B lists categories -> Must NOT contain User A's category
    list_b = client.get("/api/v1/categories", headers=headers_b).json()
    assert not any(c["id"] == cat_id_a for c in list_b)

    # User B tries to update User A's category -> 404 NotFound
    patch_b = client.patch(
        f"/api/v1/categories/{cat_id_a}",
        headers=headers_b,
        json={"name": "Hacked Category"},
    )
    assert patch_b.status_code == 404

    # User B tries to delete User A's category -> 404 NotFound
    del_b = client.delete(f"/api/v1/categories/{cat_id_a}", headers=headers_b)
    assert del_b.status_code == 404


def test_historical_analytics_empty_months():
    token, user = _create_user("analytics_empty@pennypilot.in")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(
        "/api/v1/transactions/analytics/history?months=6&end_year=2026&end_month=11",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()

    assert len(data["months"]) == 6
    for m in data["months"]:
        assert m["is_empty"] is True
        assert m["income_paise"] == 0
        assert m["expense_paise"] == 0
        assert m["net_balance_paise"] == 0
        assert m["savings_rate_percent"] == 0.0
        assert len(m["category_breakdown"]) == 0

    assert data["overall"]["total_income_paise"] == 0
    assert data["overall"]["total_expense_paise"] == 0
    assert data["overall"]["active_months_count"] == 0
    assert data["overall"]["overall_savings_rate_percent"] == 0.0


def test_historical_analytics_six_months_trends():
    token, user = _create_user("analytics_trends@pennypilot.in")
    headers = {"Authorization": f"Bearer {token}"}

    list_res = client.get("/api/v1/categories", headers=headers).json()
    salary_cat = next(c for c in list_res if c["name"] == "Salary")
    groceries_cat = next(c for c in list_res if c["name"] == "Groceries")
    dining_cat = next(c for c in list_res if c["name"] == "Dining & Food")

    override = app.dependency_overrides.get(get_db)
    db = next(override()) if override else SessionLocal()

    # Seed 3 months of data: Sept 2026, Oct 2026, Nov 2026
    # Sept 2026: Income ₹1,00,000, Expense ₹40,000 -> Net ₹60,000 (Savings rate 60%)
    tx1 = Transaction(
        user_id=user.id, category_id=salary_cat["id"], kind="income",
        amount_paise=10000000, occurred_on=date(2026, 9, 1), description="Sept Salary"
    )
    tx2 = Transaction(
        user_id=user.id, category_id=groceries_cat["id"], kind="expense",
        amount_paise=4000000, occurred_on=date(2026, 9, 15), description="Sept Groceries"
    )

    # Oct 2026: Income ₹1,00,000, Expense ₹60,000 -> Net ₹40,000 (Savings rate 40%)
    tx3 = Transaction(
        user_id=user.id, category_id=salary_cat["id"], kind="income",
        amount_paise=10000000, occurred_on=date(2026, 10, 1), description="Oct Salary"
    )
    tx4 = Transaction(
        user_id=user.id, category_id=groceries_cat["id"], kind="expense",
        amount_paise=4000000, occurred_on=date(2026, 10, 10), description="Oct Groceries"
    )
    tx5 = Transaction(
        user_id=user.id, category_id=dining_cat["id"], kind="expense",
        amount_paise=2000000, occurred_on=date(2026, 10, 20), description="Oct Dining"
    )

    # Nov 2026: Income ₹1,20,000, Expense ₹50,000 -> Net ₹70,000 (Savings rate 58.33%)
    tx6 = Transaction(
        user_id=user.id, category_id=salary_cat["id"], kind="income",
        amount_paise=12000000, occurred_on=date(2026, 11, 2), description="Nov Salary"
    )
    tx7 = Transaction(
        user_id=user.id, category_id=groceries_cat["id"], kind="expense",
        amount_paise=5000000, occurred_on=date(2026, 11, 5), description="Nov Groceries"
    )

    db.add_all([tx1, tx2, tx3, tx4, tx5, tx6, tx7])
    db.commit()

    res = client.get(
        "/api/v1/transactions/analytics/history?months=6&end_year=2026&end_month=11",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()

    # 6 months returned
    months = data["months"]
    assert len(months) == 6

    # Chronological: June, July, August (empty), Sept, Oct, Nov
    assert months[0]["month"] == 6 and months[0]["year"] == 2026 and months[0]["is_empty"] is True
    assert months[1]["month"] == 7 and months[1]["is_empty"] is True
    assert months[2]["month"] == 8 and months[2]["is_empty"] is True

    # Sept
    sept = months[3]
    assert sept["month"] == 9
    assert sept["income_paise"] == 10000000
    assert sept["expense_paise"] == 4000000
    assert sept["net_balance_paise"] == 6000000
    assert sept["savings_rate_percent"] == 60.0

    # Oct MoM
    octo = months[4]
    assert octo["month"] == 10
    assert octo["income_paise"] == 10000000
    assert octo["expense_paise"] == 6000000
    assert octo["net_balance_paise"] == 4000000
    assert octo["savings_rate_percent"] == 40.0
    # MoM: expenses rose by ₹20,000 (+50.0%) from Sept
    assert octo["expense_mom_delta_paise"] == 2000000
    assert octo["expense_mom_pct"] == 50.0
    # savings rate dropped by 20%
    assert octo["savings_rate_mom_delta"] == -20.0

    # Nov MoM
    nov = months[5]
    assert nov["month"] == 11
    assert nov["income_paise"] == 12000000
    assert nov["expense_paise"] == 5000000
    assert nov["net_balance_paise"] == 7000000
    assert nov["savings_rate_percent"] == 58.33
    # MoM: expenses dropped by ₹10,000 (-16.7%) from Oct
    assert nov["expense_mom_delta_paise"] == -1000000
    assert nov["expense_mom_pct"] == -16.7

    # Overall summary metrics
    overall = data["overall"]
    assert overall["total_income_paise"] == 32000000  # 100k + 100k + 120k = 320k
    assert overall["total_expense_paise"] == 15000000  # 40k + 60k + 50k = 150k
    assert overall["total_net_savings_paise"] == 17000000
    assert overall["active_months_count"] == 3
    assert len(overall["top_categories"]) >= 2
    assert overall["top_categories"][0]["category_name"] == "Groceries"


def test_historical_analytics_multi_tenant_isolation():
    token_a, user_a = _create_user("iso_user_a@pennypilot.in")
    token_b, user_b = _create_user("iso_user_b@pennypilot.in")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    override = app.dependency_overrides.get(get_db)
    db = next(override()) if override else SessionLocal()

    # User A records a big transaction
    cat_a = db.query(Category).filter(Category.user_id == user_a.id, Category.name == "Salary").first()
    tx_a = Transaction(
        user_id=user_a.id, category_id=cat_a.id, kind="income",
        amount_paise=50000000, occurred_on=date(2026, 11, 1), description="User A Salary"
    )
    db.add(tx_a)
    db.commit()

    # User B queries analytics -> Must be 0
    res_b = client.get(
        "/api/v1/transactions/analytics/history?months=6&end_year=2026&end_month=11",
        headers=headers_b,
    )
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["overall"]["total_income_paise"] == 0
    assert data_b["overall"]["active_months_count"] == 0
