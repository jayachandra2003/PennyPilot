"""Security & Isolation tests for AI Copilot endpoints.

Tests:
1. Rate limiting: 15 queries per minute limit triggers HTTP 429.
2. Retry-After header presence on HTTP 429.
3. User-level rate limit isolation (User A throttled, User B still allowed).
4. Cross-tenant data isolation (User B asking about User A receives 404 / isolated empty facts).
5. Unauthenticated / expired JWT rejected with HTTP 401.
"""
import time
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.core.rate_limiter import TokenBucketRateLimiter, copilot_rate_limiter
from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

client = TestClient(app)


def _create_isolated_user(email: str, name: str) -> tuple[str, str]:
    db = SessionLocal()
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(email=email, password_hash="fakehash", display_name=name)
        db.add(u)
        db.flush()

        cat = Category(user_id=u.id, name=f"Category_{name}", kind="expense", icon="tag", color_token="blue")
        db.add(cat)
        db.flush()

        tx = Transaction(
            user_id=u.id,
            category_id=cat.id,
            kind="expense",
            amount_paise=777000,  # ₹7,770.00
            occurred_on=date(2026, 11, 2),
            description=f"Confidential Secret Expense for {name}",
        )
        db.add(tx)
        db.commit()

    token = create_access_token(subject=u.id)
    uid = u.id
    db.close()
    return token, uid


def test_copilot_rate_limiting_enforcement():
    """Verify that exceeding 15 queries/min returns HTTP 429 and Retry-After header."""
    token, uid = _create_isolated_user("rl_victim@pennypilot.in", "RL Victim")
    headers = {"Authorization": f"Bearer {token}"}

    # Reset bucket for test user to ensure clean test
    copilot_rate_limiter._buckets[uid] = (0.0, time.time())  # Empty bucket right now

    payload = {"query": "Am I on track?", "year": 2026, "month": 11}
    res = client.post("/api/v1/copilot/query", headers=headers, json=payload)
    assert res.status_code == 429
    assert "Retry-After" in res.headers
    retry_after = int(res.headers["Retry-After"])
    assert retry_after > 0

    err = res.json()
    assert err["code"] == "RATE_LIMIT_EXCEEDED"
    assert "Rate limit exceeded" in err["message"]


def test_copilot_rate_limit_user_isolation():
    """Verify that User A being throttled does NOT block User B."""
    token_a, uid_a = _create_isolated_user("user_a_throttle@pennypilot.in", "User A")
    token_b, uid_b = _create_isolated_user("user_b_active@pennypilot.in", "User B")

    # Throttle User A
    copilot_rate_limiter._buckets[uid_a] = (0.0, time.time())
    # Give User B full capacity
    copilot_rate_limiter._buckets[uid_b] = (15.0, time.time())

    res_a = client.post("/api/v1/copilot/query", headers={"Authorization": f"Bearer {token_a}"}, json={"query": "Summary?"})
    assert res_a.status_code == 429

    res_b = client.post("/api/v1/copilot/query", headers={"Authorization": f"Bearer {token_b}"}, json={"query": "Summary?"})
    assert res_b.status_code == 200


def test_copilot_cross_tenant_isolation():
    """Verify User B cannot see User A's confidential spending amounts or descriptions."""
    token_alice, _ = _create_isolated_user("alice_private@pennypilot.in", "Alice")
    token_bob, _ = _create_isolated_user("bob_private@pennypilot.in", "Bob")

    # Bob asks what he spent
    res_bob = client.post(
        "/api/v1/copilot/query",
        headers={"Authorization": f"Bearer {token_bob}"},
        json={"query": "Which transactions look unusual?"},
    )
    assert res_bob.status_code == 200
    bob_data = res_bob.json()

    # Bob's answer or evidence must NOT contain Alice's secret expense
    assert "Confidential Secret Expense for Alice" not in str(bob_data)


def test_copilot_unauthenticated_and_expired_token():
    """Verify unauthenticated or expired JWT queries are rejected with HTTP 401."""
    # 1. No token
    res_no_auth = client.post("/api/v1/copilot/query", json={"query": "Hello"})
    assert res_no_auth.status_code == 401

    # 2. Expired token
    expired_token = create_access_token(subject="fake-user-id", expires_delta=timedelta(seconds=-60))
    res_expired = client.post(
        "/api/v1/copilot/query",
        headers={"Authorization": f"Bearer {expired_token}"},
        json={"query": "Hello"},
    )
    assert res_expired.status_code == 401
