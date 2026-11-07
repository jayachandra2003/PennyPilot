"""Integration tests for user-specific real notification system."""
import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.category import Category
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.user import User
from app.services.notification_service import create_notification

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
    yield TestingSession
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _setup_test_user(TestingSession, email="notif_test@pennypilot.in"):
    db = TestingSession()
    u = User(
        email=email,
        password_hash="fakehash",
        display_name="Notification Tester",
    )
    db.add(u)
    db.commit()
    token = create_access_token(subject=u.id)
    uid = u.id
    db.close()
    return token, uid


def test_new_user_gets_guidance_tip(isolated_db):
    token, uid = _setup_test_user(isolated_db)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/notifications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "notifications" in data
    assert "unread_count" in data
    # Brand new user with 0 transactions gets guidance tip
    assert data["unread_count"] >= 1
    titles = [n["title"] for n in data["notifications"]]
    assert "Getting Started with PennyPilot" in titles


def test_mark_single_notification_read(isolated_db):
    token, uid = _setup_test_user(isolated_db)
    headers = {"Authorization": f"Bearer {token}"}

    db = isolated_db()
    notif = create_notification(
        db=db,
        user_id=uid,
        category="account",
        title="Email Verified",
        message="Your email is now verified.",
    )
    db.close()

    res = client.patch(f"/api/v1/notifications/{notif.id}/read", headers=headers)
    assert res.status_code == 200
    updated = res.json()
    assert updated["id"] == notif.id
    assert updated["is_read"] is True


def test_mark_all_notifications_read(isolated_db):
    token, uid = _setup_test_user(isolated_db)
    headers = {"Authorization": f"Bearer {token}"}

    # Initial get generates the guidance tip
    init_res = client.get("/api/v1/notifications", headers=headers)
    assert init_res.status_code == 200

    db = isolated_db()
    create_notification(db=db, user_id=uid, category="account", title="Event 1", message="Desc 1")
    create_notification(db=db, user_id=uid, category="financial", title="Event 2", message="Desc 2")
    db.close()

    res = client.post("/api/v1/notifications/mark-all-read", headers=headers)
    assert res.status_code == 200

    check_res = client.get("/api/v1/notifications", headers=headers)
    assert check_res.json()["unread_count"] == 0


def test_dismiss_notification(isolated_db):
    token, uid = _setup_test_user(isolated_db)
    headers = {"Authorization": f"Bearer {token}"}

    db = isolated_db()
    notif = create_notification(
        db=db,
        user_id=uid,
        category="account",
        title="To Dismiss",
        message="Dismiss me.",
    )
    db.close()

    del_res = client.delete(f"/api/v1/notifications/{notif.id}", headers=headers)
    assert del_res.status_code == 204

    # Verify gone
    list_res = client.get("/api/v1/notifications", headers=headers)
    ids = [n["id"] for n in list_res.json()["notifications"]]
    assert notif.id not in ids


def test_cross_tenant_notification_isolation(isolated_db):
    token_a, uid_a = _setup_test_user(isolated_db, "user_a_notif@pennypilot.in")
    token_b, uid_b = _setup_test_user(isolated_db, "user_b_notif@pennypilot.in")

    db = isolated_db()
    notif_a = create_notification(
        db=db,
        user_id=uid_a,
        category="account",
        title="User A Secret Alert",
        message="Confidential to User A",
    )
    db.close()

    # User B cannot see User A's notification
    res_b = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.status_code == 200
    titles_b = [n["title"] for n in res_b.json()["notifications"]]
    assert "User A Secret Alert" not in titles_b

    # User B cannot mark User A's notification as read
    patch_b = client.patch(
        f"/api/v1/notifications/{notif_a.id}/read",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert patch_b.status_code == 404
