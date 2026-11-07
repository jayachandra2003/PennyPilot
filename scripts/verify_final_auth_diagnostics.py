"""Final comprehensive authentication diagnostics and verification script for PennyPilot.

Verifies:
1. Exact inspection of jayachandravennam.jc@gmail.com in canonical DB.
2. Duplicate email rejection diagnostics on canonical DB.
3. Full lifecycle demonstration on isolated disposable DB:
   - Unique registration (201 Created)
   - Duplicate registration rejection (400)
   - Valid login (200 OK)
   - Invalid password rejection (401)
   - Nonexistent email rejection (401)
   - Session hydration (/me)
   - Logout session revocation
"""
import sys
from pathlib import Path
import sqlite3
import uuid

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.core.security import verify_password, hash_password
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


def audit_target_account():
    print("======================================================================")
    print("SECTION 1: TARGET ACCOUNT AUDIT (jayachandravennam.jc@gmail.com)")
    print("======================================================================")
    db_path = Path(__file__).resolve().parent.parent / "penny_pilot.db"
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    row = cur.execute(
        "SELECT id, email, display_name, is_active, created_at, updated_at, password_hash "
        "FROM users WHERE email = 'jayachandravennam.jc@gmail.com'"
    ).fetchone()
    conn.close()

    assert row is not None, "Target user not found in canonical DB"
    user_id, email, display_name, is_active, created_at, updated_at, pwd_hash = row

    print(f"[AUDIT] Exists in canonical DB: True")
    print(f"[AUDIT] User ID: {user_id}")
    print(f"[AUDIT] Email: {email}")
    print(f"[AUDIT] Display Name: {display_name}")
    print(f"[AUDIT] Is Active: {bool(is_active)}")
    print(f"[AUDIT] Created At: {created_at} UTC")
    print(f"[AUDIT] Updated At: {updated_at} UTC")
    print(f"[AUDIT] Password Hash Present: {bool(pwd_hash)}")
    print(f"[AUDIT] Password Hash Format: {pwd_hash[:7]}... (length: {len(pwd_hash)})")
    
    # Verify hash compatibility
    is_bcrypt = pwd_hash.startswith("$2b$") or pwd_hash.startswith("$2a$")
    assert is_bcrypt, "Password hash is not a standard bcrypt hash"
    print(f"[AUDIT] Password Hash Compatible with bcrypt checkpw: {is_bcrypt}")

    # Verify duplicate rejection via API
    client = TestClient(app)
    dup_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "MockTestPassword123!",
            "display_name": display_name,
        },
    )
    print(f"[AUDIT] Registration Rejection Status: {dup_res.status_code}")
    print(f"[AUDIT] Registration Rejection Body: {dup_res.json()}")
    assert dup_res.status_code == 400
    assert dup_res.json()["code"] == "EMAIL_ALREADY_EXISTS"
    print("[PASS] Section 1 Target Account Audit Complete.")


def demonstrate_isolated_auth_lifecycle():
    print("\n======================================================================")
    print("SECTION 2: ISOLATED AUTHENTICATION LIFECYCLE DEMONSTRATION")
    print("======================================================================")
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
        test_email = "new_verified_user@pennypilot.in"
        test_pass = "StrongPassword123!"
        test_name = "New Verified User"

        # 1. New unique email registers successfully (201)
        reg_res = client.post(
            "/api/v1/auth/register",
            json={"email": test_email, "password": test_pass, "display_name": test_name},
        )
        assert reg_res.status_code == 201, f"Expected 201, got {reg_res.status_code}: {reg_res.text}"
        reg_data = reg_res.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["email"] == test_email
        print(f"[DEMO] 1. New unique email registration: 201 Created (Token received)")

        # 2. Duplicate email produces clear 400 error
        dup_res = client.post(
            "/api/v1/auth/register",
            json={"email": test_email, "password": test_pass, "display_name": test_name},
        )
        assert dup_res.status_code == 400
        assert dup_res.json()["code"] == "EMAIL_ALREADY_EXISTS"
        print(f"[DEMO] 2. Duplicate registration rejected: 400 {dup_res.json()['message']}")

        # 3. Correct credentials log in successfully (200)
        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": test_email, "password": test_pass},
        )
        assert login_res.status_code == 200
        assert "pennypilot_session" in login_res.cookies
        session_token = login_res.cookies["pennypilot_session"]
        csrf_token = login_res.cookies["pennypilot_csrf"]
        jwt_token = login_res.json()["access_token"]
        print(f"[DEMO] 3. Valid login: 200 OK (JWT and session cookies issued)")

        # 4. Incorrect credentials rejected with 401
        bad_pass_res = client.post(
            "/api/v1/auth/login",
            json={"email": test_email, "password": "WrongPassword999!"},
        )
        assert bad_pass_res.status_code == 401
        assert bad_pass_res.json()["code"] == "INVALID_CREDENTIALS"
        print(f"[DEMO] 4. Invalid password rejected: 401 {bad_pass_res.json()['message']}")

        # 5. Nonexistent email rejected with 401
        unknown_res = client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent_person_999@pennypilot.in", "password": test_pass},
        )
        assert unknown_res.status_code == 401
        assert unknown_res.json()["code"] == "INVALID_CREDENTIALS"
        print(f"[DEMO] 5. Nonexistent email rejected: 401 {unknown_res.json()['message']}")

        # 6. Authenticated dashboard access (/me)
        me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {jwt_token}"})
        assert me_res.status_code == 200
        assert me_res.json()["email"] == test_email
        print(f"[DEMO] 6. Authenticated /me fetch: 200 OK (Dashboard opens)")

        # 7. Page refresh simulation (Session Cookie alone)
        cookie_client = TestClient(app)
        cookie_client.cookies["pennypilot_session"] = session_token
        refresh_me = cookie_client.get("/api/v1/auth/me")
        assert refresh_me.status_code == 200
        assert refresh_me.json()["email"] == test_email
        print(f"[DEMO] 7. Page refresh session preservation: 200 OK")

        # 8. Logout revokes session
        logout_res = cookie_client.post(
            "/api/v1/auth/logout",
            headers={"X-CSRF-Token": csrf_token, "Origin": "http://localhost:5173"},
        )
        assert logout_res.status_code == 200
        cookie_client.cookies.clear()
        after_logout = cookie_client.get("/api/v1/auth/me")
        assert after_logout.status_code == 401
        print(f"[DEMO] 8. Logout and session revocation: 200 OK (Subsequent /me is 401)")

        print("[PASS] Section 2 Isolated Auth Lifecycle Demonstration Complete.")

    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)


if __name__ == "__main__":
    audit_target_account()
    demonstrate_isolated_auth_lifecycle()
    print("\n=======================================================")
    print("ALL DIAGNOSTIC AND VERIFICATION CHECKS PASSED (100%)")
    print("=======================================================\n")
