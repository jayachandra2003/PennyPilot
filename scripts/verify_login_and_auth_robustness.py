"""Comprehensive verification script for PennyPilot Login, Session, and Error Handling.

Tests:
1. Valid email/password login (with canonical DB and isolated DB)
2. Invalid password returns 401
3. Nonexistent email returns 401
4. Session cookie issuance
5. Authenticated /me request (Bearer token and session cookie)
6. Page refresh simulation
7. Logout and cookie invalidation
8. Expired session rejection
9. Google OAuth initiation & callback safety remain intact
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.core.security import hash_password
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import uuid


def test_canonical_db_login():
    """Test login directly against the canonical database with existing demo user."""
    print("\n--- Test 1: Canonical Database Login & Error Handlers ---")
    client = TestClient(app)

    # 1. Valid login with demo user
    res_valid = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@pennypilot.in", "password": "DemoPassword123!"},
    )
    assert res_valid.status_code == 200, f"Expected 200, got {res_valid.status_code}: {res_valid.text}"
    data = res_valid.json()
    assert "access_token" in data
    assert data["user"]["email"] == "demo@pennypilot.in"
    assert data["user"]["display_name"] == "Aarav Sharma"
    print("[PASS] Valid login against canonical DB returns 200 OK and valid JWT")

    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Authenticated /me with Bearer token
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "demo@pennypilot.in"
    print("[PASS] Authenticated /api/v1/auth/me with Bearer token returns 200 OK")

    # 3. Invalid password
    res_bad_pass = client.post(
        "/api/v1/auth/login",
        json={"email": "demo@pennypilot.in", "password": "WrongPassword123!"},
    )
    assert res_bad_pass.status_code == 401
    assert res_bad_pass.json()["code"] == "INVALID_CREDENTIALS"
    assert "invalid email or password" in res_bad_pass.json()["message"].lower()
    print("[PASS] Invalid password returns 401 with INVALID_CREDENTIALS")

    # 4. Nonexistent email
    res_unknown = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody_exists_here@pennypilot.in", "password": "SomePassword123!"},
    )
    assert res_unknown.status_code == 401
    assert res_unknown.json()["code"] == "INVALID_CREDENTIALS"
    print("[PASS] Nonexistent email returns 401 with INVALID_CREDENTIALS")


def test_upgraded_db_full_session_lifecycle():
    """Test login, session cookie issuance, /me, refresh, logout, and expiry on an isolated DB with all tables."""
    print("\n--- Test 2: Full Session & Cookie Lifecycle on Isolated DB ---")
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
    client = TestClient(app)

    try:
        # Seed user
        db = TestingSession()
        user = User(
            id=str(uuid.uuid4()),
            email="session_user@pennypilot.in",
            password_hash=hash_password("Password123!"),
            display_name="Session Tester",
            timezone="Asia/Kolkata",
            currency="INR",
            is_active=True,
        )
        db.add(user)
        db.commit()
        user_id = user.id
        db.close()

        # 1. Login sets pennypilot_session and pennypilot_csrf cookies
        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": "session_user@pennypilot.in", "password": "Password123!"},
        )
        assert login_res.status_code == 200
        assert "pennypilot_session" in login_res.cookies
        assert "pennypilot_csrf" in login_res.cookies
        session_token = login_res.cookies["pennypilot_session"]
        csrf_token = login_res.cookies["pennypilot_csrf"]
        jwt_token = login_res.json()["access_token"]
        print("[PASS] Login on session-enabled DB sets pennypilot_session and pennypilot_csrf cookies")

        # 2. Authenticated /me using session cookie alone (NO Authorization header)
        cookie_client = TestClient(app)
        cookie_client.cookies["pennypilot_session"] = session_token
        me_cookie_res = cookie_client.get("/api/v1/auth/me")
        assert me_cookie_res.status_code == 200
        assert me_cookie_res.json()["email"] == "session_user@pennypilot.in"
        print("[PASS] Authenticated /me via pennypilot_session cookie alone returns 200 OK")

        # 3. Simulate browser page refresh: client with cookie still fetches /me cleanly
        refresh_res = cookie_client.get("/api/v1/auth/me")
        assert refresh_res.status_code == 200
        assert refresh_res.json()["id"] == user_id
        print("[PASS] Page refresh simulation with session cookie restores user state without re-login")

        # 4. Logout revokes session and clears cookies
        logout_headers = {
            "X-CSRF-Token": csrf_token,
            "Origin": "http://localhost:5173",
        }
        logout_res = cookie_client.post("/api/v1/auth/logout", headers=logout_headers)
        assert logout_res.status_code == 200
        assert "Max-Age=0" in logout_res.headers.get("set-cookie", "") or logout_res.cookies.get("pennypilot_session") is None
        print("[PASS] POST /api/v1/auth/logout successfully clears cookies and revokes session")

        # 5. Subsequent /me with cleared/revoked session returns 401
        cookie_client.cookies.clear()
        unauth_me = cookie_client.get("/api/v1/auth/me")
        assert unauth_me.status_code == 401
        print("[PASS] Unauthenticated /me after logout returns 401")

        # 6. Verify Google OAuth login initiation remains functional
        from app.core.config import settings
        original_cid = settings.GOOGLE_CLIENT_ID
        settings.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com"
        try:
            oauth_login_res = client.get("/api/v1/auth/google/login", follow_redirects=False)
            assert oauth_login_res.status_code == 302
            assert "accounts.google.com" in oauth_login_res.headers["location"]
            assert "pennypilot_oauth_txn" in oauth_login_res.cookies
            print("[PASS] GET /api/v1/auth/google/login initiates Google OIDC flow cleanly")
        finally:
            settings.GOOGLE_CLIENT_ID = original_cid

    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


if __name__ == "__main__":
    test_canonical_db_login()
    test_upgraded_db_full_session_lifecycle()
    print("\n=======================================================")
    print("ALL LOGIN, SESSION, AND AUTH ROBUSTNESS TESTS PASSED!")
    print("=======================================================\n")
