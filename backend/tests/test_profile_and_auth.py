"""Tests for User Authentication, Registration, Profile Management, and Avatar Handling.
Uses an isolated in-memory database to ensure zero pollution to canonical database.
"""
import io
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.models.category import Category
from app.core.security import verify_password

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_db():
    """Isolated in-memory SQLite database for every test to guarantee zero canonical DB pollution."""
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


def test_registration_success_and_email_verification(isolated_db):
    """Test successful user registration, password hashing, and email_verified=False."""
    test_email = "newuser@pennypilot.in"
    password = "SecurePassword123!"

    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": password,
            "display_name": "New User",
            "timezone": "Asia/Kolkata",
            "currency": "INR",
        },
    )
    assert reg_res.status_code == 201, reg_res.text
    reg_data = reg_res.json()
    assert reg_data["email_verification_required"] is True
    assert reg_data["user"]["email"] == test_email
    assert reg_data["user"]["display_name"] == "New User"
    assert reg_data["user"]["email_verified"] is False

    # Verify directly in isolated DB that password is hashed with bcrypt and not plaintext
    db = isolated_db()
    try:
        user_in_db = db.query(User).filter(User.email == test_email).first()
        assert user_in_db is not None
        assert user_in_db.password_hash != password
        assert user_in_db.password_hash.startswith("$2b$") or user_in_db.password_hash.startswith("$2a$")
        assert verify_password(password, user_in_db.password_hash) is True
        assert verify_password("WrongPassword!", user_in_db.password_hash) is False

        # Verify isolated default categories were seeded
        cats = db.query(Category).filter(Category.user_id == user_in_db.id).all()
        assert len(cats) == 12
        assert any(c.name == "Groceries" for c in cats)
    finally:
        db.close()


def test_duplicate_registration_rejected(isolated_db):
    """Duplicate email registration is rejected with 400 EMAIL_ALREADY_EXISTS."""
    test_email = "duplicate@pennypilot.in"
    password = "SecurePassword123!"

    # First registration
    client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": password, "display_name": "First User"},
    )

    # Second registration with uppercase / trimmed whitespace
    dup_res = client.post(
        "/api/v1/auth/register",
        json={"email": f"  {test_email.upper()}  ", "password": password, "display_name": "Second User"},
    )
    assert dup_res.status_code == 400
    err_body = dup_res.json()
    assert err_body.get("code") == "EMAIL_ALREADY_EXISTS"
    assert "already exists" in (err_body.get("message") or err_body.get("detail", "")).lower()


def test_registration_validation_errors(isolated_db):
    """Invalid email, short password, or invalid name must be rejected with 422."""
    # 1. Invalid email
    res1 = client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "ValidPassword123!", "display_name": "Valid Name"},
    )
    assert res1.status_code == 422

    # 2. Short password (< 8 chars)
    res2 = client.post(
        "/api/v1/auth/register",
        json={"email": "valid@pennypilot.in", "password": "short", "display_name": "Valid Name"},
    )
    assert res2.status_code == 422

    # 3. Short display name (< 2 chars)
    res3 = client.post(
        "/api/v1/auth/register",
        json={"email": "valid@pennypilot.in", "password": "ValidPassword123!", "display_name": "A"},
    )
    assert res3.status_code == 422


def test_login_success_and_failure(isolated_db):
    """Login with valid credentials returns JWT; invalid password or unknown user returns 401."""
    test_email = "login_test@pennypilot.in"
    password = "CorrectPassword123!"

    client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": password, "display_name": "Login Tester"},
    )

    # 0. Unverified login is rejected with 403 EMAIL_NOT_VERIFIED
    unverified_res = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": password},
    )
    assert unverified_res.status_code == 403
    assert unverified_res.json().get("code") == "EMAIL_NOT_VERIFIED"

    # Simulate email verification
    from datetime import datetime, timezone
    from app.models.auth_tokens import EmailVerificationToken
    db = isolated_db()
    try:
        user_in_db = db.query(User).filter(User.email == test_email).first()
        tok = db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user_in_db.id).first()
        if tok:
            tok.consumed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()

    # 1. Valid login after verification
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": password},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["user"]["email"] == test_email

    # 2. Invalid password
    bad_pass_res = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": "IncorrectPassword123!"},
    )
    assert bad_pass_res.status_code == 401
    assert bad_pass_res.json().get("code") == "INVALID_CREDENTIALS"

    # 3. Unknown email
    unknown_res = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@pennypilot.in", "password": password},
    )
    assert unknown_res.status_code == 401
    assert unknown_res.json().get("code") == "INVALID_CREDENTIALS"


def test_no_demo_bypass_endpoint():
    """Verify no bypass or unauthenticated demo login endpoints exist."""
    res_demo = client.post("/api/v1/auth/demo")
    assert res_demo.status_code in (404, 405)


def test_profile_update_and_avatar_lifecycle(isolated_db):
    """Full lifecycle: read profile, update details, SVG rejection, size limits, PNG upload, get, delete."""
    test_email = "profile_test@pennypilot.in"
    password = "SecurePassword123!"

    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": password, "display_name": "Original Name"},
    )
    assert reg_res.status_code == 201
    user_id = reg_res.json()["user"]["id"]
    from app.core.security import create_access_token
    token = create_access_token(subject=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Read current profile
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["display_name"] == "Original Name"
    assert me_res.json()["avatar_url"] is None
    assert me_res.json()["email_verified"] is False

    # 2. Update profile details
    update_res = client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={
            "display_name": "Updated Name",
            "timezone": "UTC",
            "currency": "USD",
        },
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["display_name"] == "Updated Name"
    assert updated_data["timezone"] == "UTC"
    assert updated_data["currency"] == "USD"

    # 3. Avatar upload - Reject SVG
    svg_content = b"<svg xmlns='http://www.w3.org/2000/svg'><circle r='10'/></svg>"
    svg_upload = client.post(
        "/api/v1/auth/me/avatar",
        headers=headers,
        files={"file": ("malicious.svg", svg_content, "image/svg+xml")},
    )
    assert svg_upload.status_code == 400
    svg_err = svg_upload.json().get("message", svg_upload.json().get("detail", ""))
    assert "not permitted" in svg_err.lower()

    # 4. Avatar upload - Reject Oversized (>2MB)
    huge_file = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * (2 * 1024 * 1024 + 100))
    huge_upload = client.post(
        "/api/v1/auth/me/avatar",
        headers=headers,
        files={"file": ("huge.png", huge_file, "image/png")},
    )
    assert huge_upload.status_code == 400
    huge_err = huge_upload.json().get("message", huge_upload.json().get("detail", ""))
    assert "2 mb" in huge_err.lower()

    # 5. Avatar upload - Valid PNG
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05"
        b"\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    png_upload = client.post(
        "/api/v1/auth/me/avatar",
        headers=headers,
        files={"file": ("avatar.png", png_bytes, "image/png")},
    )
    assert png_upload.status_code == 200
    avatar_data = png_upload.json()
    assert avatar_data["avatar_url"] is not None

    # 6. Authenticated fetch via Bearer token
    fetch_res = client.get("/api/v1/auth/me/avatar", headers=headers)
    assert fetch_res.status_code == 200
    assert fetch_res.headers["content-type"] == "image/png"
    assert fetch_res.content == png_bytes

    # 7. Authenticated fetch via ?token= query param
    fetch_query_res = client.get(f"/api/v1/auth/me/avatar?token={token}")
    assert fetch_query_res.status_code == 200
    assert fetch_query_res.content == png_bytes

    # 8. Unauthenticated fetch rejected (401)
    client.cookies.clear()
    unauth_res = client.get("/api/v1/auth/me/avatar")
    assert unauth_res.status_code == 401

    # 9. Cross-user access isolation: Another user cannot access user's avatar
    other_reg = client.post(
        "/api/v1/auth/register",
        json={"email": "other_user@pennypilot.in", "password": "OtherPassword123!", "display_name": "Other"},
    )
    assert other_reg.status_code == 201
    other_token = create_access_token(subject=other_reg.json()["user"]["id"])
    other_headers = {"Authorization": f"Bearer {other_token}"}

    cross_res = client.get(f"/api/v1/auth/users/{user_id}/avatar", headers=other_headers)
    assert cross_res.status_code == 404

    # 10. Delete avatar
    del_res = client.delete("/api/v1/auth/me/avatar", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["avatar_url"] is None

    # Subsequent fetch returns 404
    fetch_after_del = client.get("/api/v1/auth/me/avatar", headers=headers)
    assert fetch_after_del.status_code == 404
