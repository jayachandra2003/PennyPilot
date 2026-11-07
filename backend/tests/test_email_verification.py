"""Tests for Brevo SMTP Email Verification & Password Reset Security Architecture.
Validates:
1. Unverified user created on registration (email_verified == False, no ambient session issued)
2. Verification token generation, SHA-256 hash storage, and Brevo SMTP email dispatch
3. Successful email verification via POST /api/v1/auth/verify-email
4. Convenience browser link GET /api/v1/auth/verify-email?token=... with redirect
5. Expired token rejection (> 30 minutes) with 400 TOKEN_EXPIRED
6. Reused token rejection with 400 TOKEN_ALREADY_USED
7. Malformed / invalid token rejection with 400 INVALID_TOKEN
8. Login rejection for unverified accounts with 403 EMAIL_NOT_VERIFIED
9. Login acceptance after verification with 200 OK and JWT / session issuance
10. Resend verification rate limiting (429 RATE_LIMITED within 60-second window)
11. SMTP connection failure non-crash handling (gracefully logs without 500 crash)
12. Password reset lifecycle: token creation, 15m expiration, consumption, password update, and session revocation
"""
from datetime import datetime, timedelta, timezone
import hashlib
import unittest.mock as mock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import verify_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.auth_tokens import EmailVerificationToken, PasswordResetToken
from app.models.session import UserSession
from app.models.user import User

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


@pytest.fixture(autouse=True)
def mock_smtp(monkeypatch):
    """Mock smtplib.SMTP to prevent real network connections during tests."""
    monkeypatch.setattr(settings, "SMTP_USERNAME", "test_smtp_user")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "test_smtp_pass")
    with mock.patch("smtplib.SMTP") as mock_smtp_class:
        instance = mock_smtp_class.return_value
        instance.__enter__.return_value = instance
        instance.starttls.return_value = (220, b"Ready")
        instance.login.return_value = (235, b"Authentication successful")
        instance.send_message.return_value = {}
        yield instance


# -----------------------------------------------------------------------------
# Test 1: Unverified user created on registration (no session issued)
# -----------------------------------------------------------------------------
def test_1_unverified_user_created_on_registration(isolated_db):
    """Registration creates unverified account; does not issue access_token or session cookie."""
    client.cookies.clear()
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "fresh_user@pennypilot.in",
            "password": "Password123!",
            "display_name": "Fresh User",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email_verification_required"] is True
    assert data["access_token"] is None
    assert data["user"]["email_verified"] is False
    assert "pennypilot_session" not in client.cookies


# -----------------------------------------------------------------------------
# Test 2: Verification token generation, hash verification, and email content
# -----------------------------------------------------------------------------
def test_2_token_generation_and_email_dispatch(isolated_db, mock_smtp):
    """Registration stores SHA-256 token hash and dispatches verification email via Brevo SMTP."""
    test_email = "token_test@pennypilot.in"
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": test_email,
            "password": "Password123!",
            "display_name": "Token Tester",
        },
    )
    assert res.status_code == 201

    db = isolated_db()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        assert user is not None
        token_record = (
            db.query(EmailVerificationToken)
            .filter(EmailVerificationToken.user_id == user.id)
            .first()
        )
        assert token_record is not None
        assert token_record.consumed_at is None
        assert len(token_record.token_hash) == 64  # SHA-256 hex digest
        exp = token_record.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        assert exp > datetime.now(timezone.utc)

        # Verify SMTP send_message was invoked
        assert mock_smtp.send_message.called
        msg = mock_smtp.send_message.call_args[0][0]
        assert msg["To"] == test_email
        assert "verify your pennypilot account" in msg["Subject"].lower()
    finally:
        db.close()


# -----------------------------------------------------------------------------
# Test 3: Successful verification via POST /api/v1/auth/verify-email
# -----------------------------------------------------------------------------
def test_3_successful_verification_via_post(isolated_db):
    """Submitting valid token to POST /api/v1/auth/verify-email marks user verified."""
    from app.services.verification_service import create_verification_token

    db = isolated_db()
    try:
        user = User(
            email="verify_post@pennypilot.in",
            password_hash="hash",
            display_name="Verify Post",
        )
        user.email_verified = False
        db.add(user)
        db.commit()
        db.refresh(user)

        _, raw_token = create_verification_token(db, user.id)
    finally:
        db.close()

    res = client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    db = isolated_db()
    try:
        refreshed = db.query(User).filter(User.email == "verify_post@pennypilot.in").first()
        assert refreshed.email_verified is True
    finally:
        db.close()


# -----------------------------------------------------------------------------
# Test 4: Convenience browser link GET /api/v1/auth/verify-email?token=...
# -----------------------------------------------------------------------------
def test_4_convenience_get_verification_redirect(isolated_db):
    """Clicking email link triggers GET endpoint, marks user verified, and redirects with ?status=success."""
    from app.services.verification_service import create_verification_token

    db = isolated_db()
    try:
        user = User(
            email="get_click@pennypilot.in",
            password_hash="hash",
            display_name="Get Click",
        )
        user.email_verified = False
        db.add(user)
        db.commit()
        db.refresh(user)

        _, raw_token = create_verification_token(db, user.id)
    finally:
        db.close()

    res = client.get(f"/api/v1/auth/verify-email?token={raw_token}", follow_redirects=False)
    assert res.status_code == 302
    location = res.headers["location"]
    assert "status=success" in location


# -----------------------------------------------------------------------------
# Test 5: Expired token rejection (> 30 minutes) with 400 TOKEN_EXPIRED
# -----------------------------------------------------------------------------
def test_5_expired_token_rejection(isolated_db):
    """Tokens older than 30 minutes are rejected with 400 TOKEN_EXPIRED."""
    from app.services.verification_service import create_verification_token

    db = isolated_db()
    try:
        user = User(
            email="expired@pennypilot.in",
            password_hash="hash",
            display_name="Expired User",
        )
        user.email_verified = False
        db.add(user)
        db.commit()
        db.refresh(user)

        tok_record, raw_token = create_verification_token(db, user.id)
        # Fast-forward token into past
        tok_record.expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        db.commit()
    finally:
        db.close()

    res = client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert res.status_code == 400
    assert res.json().get("code") == "TOKEN_EXPIRED"


# -----------------------------------------------------------------------------
# Test 6: Reused token rejection with 400 TOKEN_ALREADY_USED
# -----------------------------------------------------------------------------
def test_6_reused_token_rejection(isolated_db):
    """Tokens already consumed are rejected on replay with 400 TOKEN_ALREADY_USED."""
    from app.services.verification_service import create_verification_token

    db = isolated_db()
    try:
        user = User(
            email="reused@pennypilot.in",
            password_hash="hash",
            display_name="Reused User",
        )
        user.email_verified = False
        db.add(user)
        db.commit()
        db.refresh(user)

        _, raw_token = create_verification_token(db, user.id)
    finally:
        db.close()

    # First consumption succeeds
    first_res = client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert first_res.status_code == 200

    # Second consumption must be rejected
    second_res = client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert second_res.status_code == 400
    assert second_res.json().get("code") == "TOKEN_ALREADY_USED"


# -----------------------------------------------------------------------------
# Test 7: Malformed / invalid token rejection with 400 INVALID_TOKEN
# -----------------------------------------------------------------------------
def test_7_invalid_token_rejection(isolated_db):
    """Non-existent or malformed token string returns 400 INVALID_TOKEN."""
    res = client.post("/api/v1/auth/verify-email", json={"token": "totally-invalid-garbage-token-string"})
    assert res.status_code == 400
    assert res.json().get("code") == "INVALID_TOKEN"


# -----------------------------------------------------------------------------
# Test 8: Login rejection for unverified accounts with 403 EMAIL_NOT_VERIFIED
# -----------------------------------------------------------------------------
def test_8_login_rejection_for_unverified_accounts(isolated_db):
    """User cannot sign in prior to email verification; returns HTTP 403 EMAIL_NOT_VERIFIED."""
    test_email = "unverified_login@pennypilot.in"
    password = "ValidPassword123!"

    client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": password, "display_name": "Unverified Login"},
    )

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": password},
    )
    assert login_res.status_code == 403
    assert login_res.json().get("code") == "EMAIL_NOT_VERIFIED"


# -----------------------------------------------------------------------------
# Test 9: Login acceptance after verification with 200 OK
# -----------------------------------------------------------------------------
def test_9_login_acceptance_after_verification(isolated_db):
    """User can sign in successfully after completing email verification."""
    test_email = "verified_login@pennypilot.in"
    password = "ValidPassword123!"

    client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": password, "display_name": "Verified Login"},
    )

    # Simulate token verification
    db = isolated_db()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        tok = (
            db.query(EmailVerificationToken)
            .filter(EmailVerificationToken.user_id == user.id)
            .first()
        )
        tok.consumed_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()

    # Login now succeeds
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": password},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["user"]["email"] == test_email
    assert login_data["user"]["email_verified"] is True


# -----------------------------------------------------------------------------
# Test 10: Resend verification rate limiting (429 RATE_LIMITED within 60s)
# -----------------------------------------------------------------------------
def test_10_resend_verification_rate_limiting(isolated_db):
    """Resend verification requests within 60 seconds are rejected with 429 RATE_LIMITED."""
    test_email = "resend_rate@pennypilot.in"
    client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": "Password123!", "display_name": "Rate Tester"},
    )

    # First resend immediate request is rejected because registration just created one
    resend_1 = client.post("/api/v1/auth/resend-verification", json={"email": test_email})
    assert resend_1.status_code == 429
    assert resend_1.json().get("code") == "RATE_LIMITED"


# -----------------------------------------------------------------------------
# Test 11: SMTP connection failure non-crash handling
# -----------------------------------------------------------------------------
def test_11_smtp_failure_non_crash_handling(isolated_db):
    """If SMTP server fails, registration still completes gracefully without 500 crash."""
    with mock.patch("smtplib.SMTP", side_effect=Exception("SMTP server connection timeout")):
        res = client.post(
            "/api/v1/auth/register",
            json={
                "email": "smtp_fail@pennypilot.in",
                "password": "Password123!",
                "display_name": "SMTP Fail Tester",
            },
        )
        assert res.status_code == 201
        assert res.json()["email_verification_required"] is True


# -----------------------------------------------------------------------------
# Test 12: Password reset lifecycle
# -----------------------------------------------------------------------------
def test_12_password_reset_lifecycle(isolated_db, mock_smtp):
    """Password reset: token creation, 15m expiry, consumption, new password update, and session revocation."""
    from app.services.password_reset_service import create_password_reset_token
    from app.services.session_service import create_session

    test_email = "pwd_reset@pennypilot.in"
    original_pass = "OldPassword123!"
    new_pass = "BrandNewPassword456!"

    client.post(
        "/api/v1/auth/register",
        json={"email": test_email, "password": original_pass, "display_name": "Reset Tester"},
    )

    db = isolated_db()
    try:
        user = db.query(User).filter(User.email == test_email).first()
        user_id = str(user.id)
        # Verify user
        tok = (
            db.query(EmailVerificationToken)
            .filter(EmailVerificationToken.user_id == user_id)
            .first()
        )
        tok.consumed_at = datetime.now(timezone.utc)
        db.commit()

        # Create active session
        mock_req = mock.MagicMock()
        mock_req.client.host = "127.0.0.1"
        mock_req.headers.get.return_value = "TestBrowser/1.0"
        _, raw_session = create_session(db, user_id, mock_req)
        assert raw_session is not None
        assert db.query(UserSession).filter(UserSession.user_id == user_id).count() == 1

        # Create reset token
        _, raw_reset_token = create_password_reset_token(db, user_id)
    finally:
        db.close()

    # 1. Consumption of reset token updates password and revokes all sessions
    reset_res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_reset_token, "new_password": new_pass},
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "ok"

    # 2. Check DB: old password rejected, new password verified, active sessions revoked
    db = isolated_db()
    try:
        refreshed_user = db.query(User).filter(User.email == test_email).first()
        assert verify_password(original_pass, refreshed_user.password_hash) is False
        assert verify_password(new_pass, refreshed_user.password_hash) is True
        # Check sessions revoked
        active_sessions = db.query(UserSession).filter(
            UserSession.user_id == user_id,
        ).count()
        assert active_sessions == 0
    finally:
        db.close()

    # 3. Replay attack rejection: reset token cannot be reused
    replay_res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_reset_token, "new_password": "AnotherPassword789!"},
    )
    assert replay_res.status_code == 400
    assert replay_res.json().get("code") == "TOKEN_ALREADY_USED"

    # 4. Login with new password succeeds
    login_new = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": new_pass},
    )
    assert login_new.status_code == 200


def test_settings_env_file_resolution(tmp_path):
    """Verifies that Pydantic Settings deterministically resolves the repository root .env file."""
    from app.core.config import PROJECT_ROOT, Settings
    from pydantic_settings import SettingsConfigDict

    # 1. Verify PROJECT_ROOT points to PennyPilot directory
    assert PROJECT_ROOT.is_dir()
    assert (PROJECT_ROOT / "backend").is_dir()

    # 2. Test dynamic loading from a custom env file
    test_env = tmp_path / ".env.test"
    test_env.write_text(
        "SMTP_HOST=smtp.custom-test.com\n"
        "SMTP_PORT=2525\n"
        "SMTP_USERNAME=custom_user\n"
        "SMTP_PASSWORD=custom_pass\n"
        "SMTP_FROM_NAME=CustomPilot\n",
        encoding="utf-8",
    )

    class CustomSettings(Settings):
        model_config = SettingsConfigDict(
            env_file=str(test_env),
            env_file_encoding="utf-8",
            extra="ignore",
        )

    loaded = CustomSettings()
    assert loaded.SMTP_HOST == "smtp.custom-test.com"
    assert loaded.SMTP_PORT == 2525
    assert loaded.SMTP_USERNAME == "custom_user"
    assert loaded.SMTP_PASSWORD == "custom_pass"
    assert loaded.SMTP_FROM_NAME == "CustomPilot"


def test_is_smtp_configured_logic():
    """Verifies that is_smtp_configured accurately detects valid credentials and rejects placeholders."""
    from app.services.email_service import is_smtp_configured

    with mock.patch("app.services.email_service.settings") as mock_settings:
        # Both set and valid
        mock_settings.SMTP_USERNAME = "valid_user_account"
        mock_settings.SMTP_PASSWORD = "super_secret_smtp_key_12345"
        assert is_smtp_configured() is True

        # Missing username
        mock_settings.SMTP_USERNAME = ""
        mock_settings.SMTP_PASSWORD = "super_secret_smtp_key_12345"
        assert is_smtp_configured() is False

        # Missing password
        mock_settings.SMTP_USERNAME = "valid_user_account"
        mock_settings.SMTP_PASSWORD = ""
        assert is_smtp_configured() is False

        # Placeholder detection
        mock_settings.SMTP_USERNAME = "your_brevo_smtp_login@example.com"
        mock_settings.SMTP_PASSWORD = "your_brevo_smtp_master_key_here"
        assert is_smtp_configured() is False

        # Whitespace-only values
        mock_settings.SMTP_USERNAME = "   "
        mock_settings.SMTP_PASSWORD = "   "
        assert is_smtp_configured() is False


def test_missing_smtp_credentials_safe_fallback():
    """Verifies that missing SMTP credentials in development fail safely without 500 error."""
    from app.services.email_service import send_email_smtp

    with mock.patch("app.services.email_service.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "development"
        mock_settings.SMTP_USERNAME = ""
        mock_settings.SMTP_PASSWORD = ""

        # Should safely return False and not raise any exception
        result = send_email_smtp(
            to_email="test@example.com",
            subject="Test Safe Fallback",
            html_content="<p>Test</p>",
            text_content="Test",
        )
        assert result is False


def test_email_service_uses_singleton_settings():
    """Verifies that email_service uses the exact same settings singleton instance as core.config."""
    import app.core.config as core_config
    import app.services.email_service as email_service_module

    assert email_service_module.settings is core_config.settings


def test_brevo_ip_restriction_handling():
    """Verifies that Brevo 525 Unauthorized IP errors are handled safely without crashing."""
    import smtplib
    from app.services.email_service import send_email_smtp

    with mock.patch("app.services.email_service.settings") as mock_settings:
        mock_settings.SMTP_USERNAME = "valid_user"
        mock_settings.SMTP_PASSWORD = "valid_password"
        mock_settings.SMTP_HOST = "smtp-relay.brevo.com"
        mock_settings.SMTP_PORT = 587
        mock_settings.SMTP_USE_TLS = True

        with mock.patch("smtplib.SMTP") as mock_smtp_class:
            mock_smtp = mock.MagicMock()
            mock_smtp_class.return_value.__enter__.return_value = mock_smtp
            mock_smtp.login.side_effect = smtplib.SMTPAuthenticationError(525, b"5.7.1 Unauthorized IP address")

            # Must return False and not raise uncaught exception
            result = send_email_smtp(
                to_email="test@pennypilot.in",
                subject="Test IP Restriction",
                html_content="<p>Test</p>",
                text_content="Test",
            )
            assert result is False


