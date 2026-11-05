"""Integration tests for Phase 2 endpoints: NL parser, bulk save, transaction CRUD, categories, budgets."""
import uuid
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

client = TestClient(app)


def _setup_test_user():
    db = SessionLocal()
    u = db.query(User).filter(User.email == "p2_test@pennypilot.in").first()
    if not u:
        u = User(
            email="p2_test@pennypilot.in",
            password_hash="fakehash",
            display_name="P2 Tester",
        )
        db.add(u)
        db.flush()

        # Seed 2 categories
        c1 = Category(user_id=u.id, name="Groceries", kind="expense", icon="shopping-cart", color_token="emerald")
        c2 = Category(user_id=u.id, name="Dining & Food", kind="expense", icon="utensils", color_token="amber")
        db.add_all([c1, c2])
        db.commit()
    token = create_access_token(subject=u.id)
    c_id = db.query(Category.id).filter(Category.user_id == u.id, Category.name == "Groceries").scalar()
    db.close()
    return token, c_id


def test_nl_parse_endpoint():
    token, _ = _setup_test_user()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/v1/transactions/parse",
        headers=headers,
        json={"text": "₹120 milk and ₹450 groceries today, auto 80 yesterday"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["parser_tier"] == "rules"
    assert len(data["drafts"]) == 3
    assert data["drafts"][0]["amount_paise"] == 12000
    assert data["drafts"][0]["category_name"] == "Groceries"


def test_bulk_create_and_atomic_rollback():
    token, cat_id = _setup_test_user()
    headers = {"Authorization": f"Bearer {token}"}

    # Valid bulk save
    payload = {
        "transactions": [
            {
                "category_id": cat_id,
                "kind": "expense",
                "amount_paise": 12000,
                "occurred_on": "2026-11-05",
                "description": "Bulk Item 1",
                "source": "nl",
            },
            {
                "category_id": cat_id,
                "kind": "expense",
                "amount_paise": 45000,
                "occurred_on": "2026-11-05",
                "description": "Bulk Item 2",
                "source": "nl",
            },
        ]
    }
    res = client.post("/api/v1/transactions/bulk", headers=headers, json=payload)
    assert res.status_code == 201
    created = res.json()
    assert len(created) == 2
    tx1_id = created[0]["id"]

    # Invalid bulk save (contains invalid category_id) -> MUST ROLLBACK ATOMICALLY
    invalid_payload = {
        "transactions": [
            {
                "category_id": cat_id,
                "kind": "expense",
                "amount_paise": 99000,
                "occurred_on": "2026-11-05",
                "description": "Should Not Exist",
            },
            {
                "category_id": "non-existent-cat-uuid",
                "kind": "expense",
                "amount_paise": 88000,
                "occurred_on": "2026-11-05",
                "description": "Faulty Row",
            },
        ]
    }
    res_invalid = client.post("/api/v1/transactions/bulk", headers=headers, json=invalid_payload)
    assert res_invalid.status_code == 400
    assert res_invalid.json()["code"] == "INVALID_CATEGORY"

    # Verify "Should Not Exist" was NOT committed
    list_res = client.get("/api/v1/transactions?search=Should Not Exist", headers=headers)
    assert len(list_res.json()) == 0


def test_transaction_patch_and_delete():
    token, cat_id = _setup_test_user()
    headers = {"Authorization": f"Bearer {token}"}

    # Create 1 tx
    res = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "category_id": cat_id,
            "kind": "expense",
            "amount_paise": 50000,
            "occurred_on": "2026-11-05",
            "description": "Original Description",
        },
    )
    tx_id = res.json()["id"]

    # Patch amount and description
    patch_res = client.patch(
        f"/api/v1/transactions/{tx_id}",
        headers=headers,
        json={"amount_paise": 75000, "description": "Updated Description"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["amount_paise"] == 75000
    assert patch_res.json()["description"] == "Updated Description"

    # Soft Delete
    del_res = client.delete(f"/api/v1/transactions/{tx_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify not returned in active list
    get_res = client.get(f"/api/v1/transactions/{tx_id}", headers=headers)
    assert get_res.status_code == 404


def test_categories_crud():
    token, _ = _setup_test_user()
    headers = {"Authorization": f"Bearer {token}"}
    suffix = uuid.uuid4().hex[:6]
    cat_name = f"Gaming_{suffix}"
    updated_name = f"Hardware_{suffix}"

    # Create category
    res = client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": cat_name, "kind": "expense", "icon": "gamepad", "color_token": "purple"},
    )
    assert res.status_code == 201
    cat_id = res.json()["id"]
    assert res.json()["name"] == cat_name

    # Update category
    patch_res = client.patch(
        f"/api/v1/categories/{cat_id}",
        headers=headers,
        json={"name": updated_name},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == updated_name

    # Archive category
    del_res = client.delete(f"/api/v1/categories/{cat_id}", headers=headers)
    assert del_res.status_code == 204


def test_budgets_crud_and_pace():
    token, cat_id = _setup_test_user()
    headers = {"Authorization": f"Bearer {token}"}

    # Set budget for Nov 2026
    batch = {
        "month": "2026-11-01",
        "budgets": [{"category_id": cat_id, "limit_paise": 1500000}],  # ₹15,000
    }
    put_res = client.put("/api/v1/budgets", headers=headers, json=batch)
    assert put_res.status_code == 200
    overview = put_res.json()
    assert overview["total_limit_paise"] >= 1500000

    # Get budget overview
    get_res = client.get("/api/v1/budgets?year=2026&month=11", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert "category_budgets" in data
    assert any(c["category_id"] == cat_id and c["limit_paise"] == 1500000 for c in data["category_budgets"])
