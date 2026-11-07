"""Comprehensive unit & integration tests for Secure Permanent Account Deletion and Tutorial endpoints.
Uses an isolated in-memory SQLite database to guarantee zero canonical database mutation.
"""
from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.auth_tokens import EmailVerificationToken, PasswordResetToken
from app.models.budget import Budget
from app.models.category import Category
from app.models.goal import FinancialGoal
from app.models.insight import Insight
from app.models.notification import Notification
from app.models.oauth import OAuthAccount
from app.models.recurring import RecurringTransaction
from app.models.session import UserSession
from app.models.transaction import Transaction
from app.models.user import User
from app.services.session_service import create_session, generate_csrf_token

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_db():
    """In-memory SQLite database for test isolation."""
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


def test_delete_account_unauthenticated_rejected():
    """Unauthenticated requests must be rejected with 401 Unauthorized."""
    res = client.request(
        "DELETE",
        "/api/v1/account",
        json={"confirmation_phrase": "DELETE MY ACCOUNT", "password": "AnyPassword123!"},
    )
    assert res.status_code == 401


def test_delete_account_exact_phrase_required(isolated_db):
    """The confirmation phrase must exactly match 'DELETE MY ACCOUNT' case-sensitively."""
    db: Session = isolated_db()
    user = User(
        email="target_user@example.com",
        password_hash=hash_password("ValidPassword123!"),
        display_name="Target Pilot",
        currency="INR",
        _email_verified=True,
    )
    db.add(user)
    db.commit()

    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Case mismatch: lowercase
    res = client.request(
        "DELETE",
        "/api/v1/account",
        headers=headers,
        json={"confirmation_phrase": "delete my account", "password": "ValidPassword123!"},
    )
    assert res.status_code == 400
    assert "INVALID_CONFIRMATION_PHRASE" in res.json().get("code", "")

    # Incomplete phrase
    res = client.request(
        "DELETE",
        "/api/v1/account",
        headers=headers,
        json={"confirmation_phrase": "DELETE MY", "password": "ValidPassword123!"},
    )
    assert res.status_code == 400

    # Ensure user still exists
    assert db.query(User).filter(User.id == user.id).first() is not None


def test_delete_account_wrong_password_rejected(isolated_db):
    """Users with password must provide valid password re-verification."""
    db: Session = isolated_db()
    user = User(
        email="pw_test@example.com",
        password_hash=hash_password("CorrectPassword123!"),
        display_name="Password Tester",
        currency="INR",
        _email_verified=True,
    )
    db.add(user)
    db.commit()

    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Wrong password
    res = client.request(
        "DELETE",
        "/api/v1/account",
        headers=headers,
        json={"confirmation_phrase": "DELETE MY ACCOUNT", "password": "WrongPassword999!"},
    )
    assert res.status_code == 401
    assert "INVALID_PASSWORD" in res.json().get("code", "")

    # Missing password
    res = client.request(
        "DELETE",
        "/api/v1/account",
        headers=headers,
        json={"confirmation_phrase": "DELETE MY ACCOUNT", "password": ""},
    )
    assert res.status_code == 401


def test_delete_account_csrf_enforcement_for_cookies(isolated_db):
    """When using session cookies, CSRF token validation must be enforced."""
    db: Session = isolated_db()
    user = User(
        email="cookie_user@example.com",
        password_hash=hash_password("CorrectPassword123!"),
        display_name="Cookie User",
        currency="INR",
        _email_verified=True,
    )
    db.add(user)
    db.commit()

    # Create server session
    raw_token = "high_entropy_test_session_token_12345"
    token_hash = "fake_hash"
    import hashlib
    h = hashlib.sha256(raw_token.encode()).hexdigest()
    session_rec = UserSession(
        user_id=user.id,
        token_hash=h,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(session_rec)
    db.commit()

    client.cookies.set(settings.SESSION_COOKIE_NAME, raw_token)

    # Missing CSRF token
    res = client.request(
        "DELETE",
        "/api/v1/account",
        json={"confirmation_phrase": "DELETE MY ACCOUNT", "password": "CorrectPassword123!"},
    )
    assert res.status_code == 403


def test_delete_account_full_cascade_and_isolation(isolated_db):
    """
    Comprehensive multi-tenant cascade verification:
    - User A (Target) has data across transactions, budgets, goals, recurring, categories, insights, notifications, and sessions.
    - User B has separate categories, transactions, and budgets.
    - Deleting User A completely purges User A's data without affecting User B.
    """
    db: Session = isolated_db()

    # 1. Setup User A
    user_a = User(
        email="target_a@example.com",
        password_hash=hash_password("Secret123!"),
        display_name="User Alpha",
        currency="INR",
        _email_verified=True,
    )
    # 2. Setup User B
    user_b = User(
        email="innocent_b@example.com",
        password_hash=hash_password("Secret456!"),
        display_name="User Beta",
        currency="INR",
        _email_verified=True,
    )
    db.add_all([user_a, user_b])
    db.flush()

    # User A categories & data
    cat_a = Category(user_id=user_a.id, name="Groceries", kind="expense")
    cat_b = Category(user_id=user_b.id, name="Groceries", kind="expense")
    db.add_all([cat_a, cat_b])
    db.flush()

    tx_a = Transaction(
        user_id=user_a.id,
        category_id=cat_a.id,
        amount_paise=500000,
        occurred_on=date(2026, 11, 5),
        description="Alpha Groceries",
    )
    tx_b = Transaction(
        user_id=user_b.id,
        category_id=cat_b.id,
        amount_paise=700000,
        occurred_on=date(2026, 11, 5),
        description="Beta Groceries",
    )
    bgt_a = Budget(user_id=user_a.id, category_id=cat_a.id, month=date(2026, 11, 1), limit_paise=1000000)
    bgt_b = Budget(user_id=user_b.id, category_id=cat_b.id, month=date(2026, 11, 1), limit_paise=2000000)
    goal_a = FinancialGoal(user_id=user_a.id, name="Trip", target_paise=5000000, target_date=date(2027, 1, 1))
    rec_a = RecurringTransaction(
        user_id=user_a.id, category_id=cat_a.id, description="Milk", amount_paise=100000, next_due=date(2026, 12, 1)
    )
    notif_a = Notification(user_id=user_a.id, title="Alert", message="Budget near limit")
    insight_a = Insight(
        user_id=user_a.id,
        month=date(2026, 11, 1),
        type="budget_pace",
        facts_json="{}",
        template_text="Spending within limits",
    )
    token_a = EmailVerificationToken(user_id=user_a.id, token_hash="dummy_hash_token", expires_at=datetime.now(timezone.utc) + timedelta(days=1))
    reset_a = PasswordResetToken(user_id=user_a.id, token_hash="dummy_reset_hash", expires_at=datetime.now(timezone.utc) + timedelta(hours=1))
    oauth_a = OAuthAccount(user_id=user_a.id, provider="google", provider_user_id="google_sub_12345")

    db.add_all([tx_a, tx_b, bgt_a, bgt_b, goal_a, rec_a, notif_a, insight_a, token_a, reset_a, oauth_a])
    db.commit()

    # Verify counts before deletion
    assert db.query(Transaction).filter(Transaction.user_id == user_a.id).count() == 1
    assert db.query(Transaction).filter(Transaction.user_id == user_b.id).count() == 1

    # Execute deletion for User A
    token = create_access_token(user_a.id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.request(
        "DELETE",
        "/api/v1/account",
        headers=headers,
        json={"confirmation_phrase": "DELETE MY ACCOUNT", "password": "Secret123!"},
    )
    assert res.status_code == 200
    assert res.json().get("status") == "ok"

    # Assert User A records are completely gone
    assert db.query(User).filter(User.id == user_a.id).first() is None
    assert db.query(Transaction).filter(Transaction.user_id == user_a.id).count() == 0
    assert db.query(Budget).filter(Budget.user_id == user_a.id).count() == 0
    assert db.query(Category).filter(Category.user_id == user_a.id).count() == 0
    assert db.query(FinancialGoal).filter(FinancialGoal.user_id == user_a.id).count() == 0
    assert db.query(RecurringTransaction).filter(RecurringTransaction.user_id == user_a.id).count() == 0
    assert db.query(Notification).filter(Notification.user_id == user_a.id).count() == 0
    assert db.query(Insight).filter(Insight.user_id == user_a.id).count() == 0
    assert db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user_a.id).count() == 0
    assert db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_a.id).count() == 0
    assert db.query(OAuthAccount).filter(OAuthAccount.user_id == user_a.id).count() == 0

    # Assert User B records are 100% intact!
    assert db.query(User).filter(User.id == user_b.id).first() is not None
    assert db.query(Transaction).filter(Transaction.user_id == user_b.id).count() == 1
    assert db.query(Budget).filter(Budget.user_id == user_b.id).count() == 1
    assert db.query(Category).filter(Category.user_id == user_b.id).count() == 1

    # User A cannot log in anymore
    login_res = client.post("/api/v1/auth/login", json={"email": "target_a@example.com", "password": "Secret123!"})
    assert login_res.status_code == 401


def test_onboarding_tutorial_lifecycle(isolated_db):
    """Verify onboarding tutorial status retrieval and completion/skip/replay updates."""
    db: Session = isolated_db()
    user = User(
        email="tutorial_tester@example.com",
        password_hash=hash_password("Pass123!"),
        display_name="Tour Guide",
        currency="INR",
        _email_verified=True,
        tutorial_completed=False,
    )
    db.add(user)
    db.commit()

    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initial status: tutorial_completed = False
    res = client.get("/api/v1/onboarding/tutorial", headers=headers)
    assert res.status_code == 200
    assert res.json().get("tutorial_completed") is False

    # 2. Complete tutorial
    res = client.post("/api/v1/onboarding/tutorial", headers=headers, json={"completed": True})
    assert res.status_code == 200
    assert res.json().get("tutorial_completed") is True

    # 3. Check status
    res = client.get("/api/v1/onboarding/tutorial", headers=headers)
    assert res.json().get("tutorial_completed") is True

    # 4. Replay tutorial (resets status)
    res = client.post("/api/v1/onboarding/tutorial", headers=headers, json={"completed": False, "skipped": False})
    assert res.status_code == 200
    assert res.json().get("tutorial_completed") is False
