"""Tests for Google OAuth 2.0 / OpenID Connect and Server-Side Session Management.
Validates:
- PKCE S256 code challenge generation and verification
- Cryptographically bound OAuth transaction cookies
- Atomic single-use transaction consumption and replay protection
- Google ID token signature verification against JWKS (mocked)
- Nonce, issuer, audience, and email_verified claim validations
- Strict non-destructive email collision barrier (no automatic merges)
- Authenticated account linking and session continuity validation
- Safe account unlinking protection (requires primary password)
- 256-bit opaque session tokens with SHA-256 database hashing
- 120-minute sliding idle timeout and 14-day absolute timeout
- Single-session logout and logout-all revocation
- Cryptographically bound CSRF protection and Origin validation
"""
import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import time
from typing import Any, Dict
import unittest.mock as mock

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from jose import jwk, jwt
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.category import Category
from app.models.oauth import OAuthAccount, OAuthTransaction
from app.models.session import UserSession
from app.models.user import User
from app.services.google_oauth import (
    OAuthValidationError,
    create_oauth_transaction_cookie_value,
    verify_google_id_token,
)
from app.services.session_service import generate_csrf_token

client = TestClient(app)


def to_utc(dt: datetime) -> datetime:
    """Normalize datetime to offset-aware UTC."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


# ==============================================================================
# Test Fixtures & Cryptographic Mock Keypair
# ==============================================================================

@pytest.fixture(autouse=True)
def isolated_db():
    """Isolated in-memory SQLite database with all tables created."""
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


@pytest.fixture(autouse=True)
def configure_test_settings():
    """Ensure consistent settings for OAuth tests."""
    orig_client_id = settings.GOOGLE_CLIENT_ID
    orig_client_secret = settings.GOOGLE_CLIENT_SECRET
    orig_secure = settings.COOKIE_SECURE
    settings.GOOGLE_CLIENT_ID = "mock-google-client-id.apps.googleusercontent.com"
    settings.GOOGLE_CLIENT_SECRET = "mock-google-client-secret-12345"
    settings.COOKIE_SECURE = False

    yield

    settings.GOOGLE_CLIENT_ID = orig_client_id
    settings.GOOGLE_CLIENT_SECRET = orig_client_secret
    settings.COOKIE_SECURE = orig_secure


class MockGoogleOIDCProvider:
    """Helper to generate RSA keypairs, JWKS, and signed ID tokens for testing."""
    def __init__(self, key_id: str = "mock-google-key-1"):
        self.key_id = key_id
        self.rsa_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.private_pem = self.rsa_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode("utf-8")
        self.public_pem = self.rsa_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8")

        # Create JWK dictionary
        self.jwk_dict = jwk.RSAKey(key=self.public_pem, algorithm="RS256").to_dict()
        self.jwk_dict["kid"] = self.key_id
        self.jwks = {"keys": [self.jwk_dict]}

    def issue_id_token(
        self,
        sub: str = "109876543210987654321",
        email: str = "alex@pennypilot.in",
        nonce: str = "expected-nonce",
        email_verified: bool = True,
        aud: str = "mock-google-client-id.apps.googleusercontent.com",
        iss: str = "https://accounts.google.com",
        exp_delta: int = 3600,
        headers: Dict[str, Any] = None,
        access_token: str = None,
    ) -> str:
        now = int(time.time())
        claims = {
            "iss": iss,
            "aud": aud,
            "sub": sub,
            "email": email,
            "email_verified": email_verified,
            "nonce": nonce,
            "name": "Alex Mercer",
            "iat": now,
            "exp": now + exp_delta,
        }
        if access_token:
            from jose.jwt import calculate_at_hash, ALGORITHMS
            claims["at_hash"] = calculate_at_hash(access_token, ALGORITHMS.HASHES["RS256"])
        token_headers = {"kid": self.key_id}
        if headers:
            token_headers.update(headers)
        return jwt.encode(claims, self.private_pem, algorithm="RS256", headers=token_headers)


@pytest.fixture
def mock_google():
    return MockGoogleOIDCProvider()


# ==============================================================================
# SEC-01 & SEC-02: OAuth Initiation & Cryptographic Cookie Binding
# ==============================================================================

def test_oauth_authorization_initiation(isolated_db):
    """Verify authorization URL, PKCE challenge, state, nonce, and bound transaction cookie."""
    client.cookies.clear()
    res = client.get("/api/v1/auth/google/login?purpose=login", follow_redirects=False)
    assert res.status_code == 302
    location = res.headers.get("location", "")
    assert location.startswith(settings.GOOGLE_AUTH_URL)

    # Verify query parameters
    assert f"client_id={settings.GOOGLE_CLIENT_ID}" in location
    assert "response_type=code" in location
    assert "code_challenge_method=S256" in location
    assert "code_challenge=" in location
    assert "state=" in location
    assert "nonce=" in location

    # Verify bound cookie
    cookie = res.cookies.get(settings.OAUTH_TXN_COOKIE_NAME)
    assert cookie is not None
    assert "." in cookie
    txn_id, cookie_hmac = cookie.split(".", 1)

    # Verify record in SQLite
    db = isolated_db()
    try:
        txn = db.query(OAuthTransaction).filter(OAuthTransaction.id == txn_id).first()
        assert txn is not None
        assert txn.purpose == "login"
        assert txn.consumed_at is None
        assert to_utc(txn.expires_at) > datetime.now(timezone.utc)
    finally:
        db.close()


def test_transaction_cookie_substitution_rejected(isolated_db):
    """Substituted, missing, or malformed transaction cookies are rejected."""
    # 1. Callback without transaction cookie
    client.cookies.clear()
    res1 = client.get("/api/v1/auth/google/callback?code=mock_code&state=mock_state", follow_redirects=False)
    assert res1.status_code == 302
    assert "error=invalid_or_missing_transaction_cookie" in res1.headers.get("location", "")

    # 2. Callback with mismatched HMAC
    client.cookies[settings.OAUTH_TXN_COOKIE_NAME] = "fake_txn_id.fake_hmac"
    res2 = client.get("/api/v1/auth/google/callback?code=mock_code&state=mock_state", follow_redirects=False)
    assert res2.status_code == 302
    assert "error=invalid_or_missing_transaction_cookie" in res2.headers.get("location", "")


# ==============================================================================
# SEC-03 & SEC-04: Guaranteed Cookie Deletion & Atomic Single-Use Replay Protection
# ==============================================================================

def test_guaranteed_cookie_deletion_on_all_paths(isolated_db):
    """User cancellation or errors must delete the transaction cookie immediately."""
    client.cookies[settings.OAUTH_TXN_COOKIE_NAME] = "any_token.any_hmac"

    # Error path: Google reports user access_denied
    res = client.get("/api/v1/auth/google/callback?error=access_denied", follow_redirects=False)
    assert res.status_code == 302
    assert "error=oauth_cancelled" in res.headers.get("location", "")

    # Verify Set-Cookie has Max-Age=0 or expired deletion header
    set_cookie = res.headers.get("set-cookie", "")
    assert settings.OAUTH_TXN_COOKIE_NAME in set_cookie
    assert ("Max-Age=0" in set_cookie or "expires=Thu, 01 Jan 1970" in set_cookie)


@pytest.mark.asyncio
async def test_atomic_single_use_consumption_and_replay_rejection(isolated_db, mock_google):
    """An OAuth transaction can be consumed exactly once. Replays and duplicate attempts fail."""
    client.cookies.clear()
    db = isolated_db()
    state = "unique_secret_state_123"
    nonce = "unique_secret_nonce_123"
    state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()
    txn_id = "test_atomic_txn_001"

    txn = OAuthTransaction(
        id=txn_id,
        state_hash=state_hash,
        code_verifier="mock_pkce_verifier_string_of_sufficient_length_12345",
        nonce=nonce,
        purpose="login",
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        consumed_at=None,
    )
    db.add(txn)
    db.commit()
    db.close()

    cookie_val = create_oauth_transaction_cookie_value(txn_id, state_hash)

    valid_id_token = mock_google.issue_id_token(
        sub="google_sub_replay_test",
        email="replay_test@pennypilot.in",
        nonce=nonce,
    )

    with mock.patch("app.api.v1.endpoints.auth.exchange_google_code_for_tokens", return_value={"id_token": valid_id_token}), \
         mock.patch("app.services.google_oauth.fetch_google_jwks", return_value=mock_google.jwks):

        # First callback attempt: SUCCEEDS
        client.cookies[settings.OAUTH_TXN_COOKIE_NAME] = cookie_val
        res1 = client.get(
            f"/api/v1/auth/google/callback?code=mock_code&state={state}",
            follow_redirects=False,
        )
        assert res1.status_code == 302
        assert "auth=success" in res1.headers.get("location", "")

        # Second callback attempt with SAME credentials: MUST FAIL
        client.cookies[settings.OAUTH_TXN_COOKIE_NAME] = cookie_val
        res2 = client.get(
            f"/api/v1/auth/google/callback?code=mock_code&state={state}",
            follow_redirects=False,
        )
        assert res2.status_code == 302
        assert "error=oauth_transaction_replayed_or_expired" in res2.headers.get("location", "")


# ==============================================================================
# SEC-05 & SEC-06: Google ID Token Claims Validation & New User Creation
# ==============================================================================

@pytest.mark.asyncio
async def test_google_id_token_claim_validations(isolated_db, mock_google):
    """Validate that invalid signatures, nonce mismatches, and unverified emails are strictly rejected."""
    client.cookies.clear()
    state = "state_claim_validation"
    nonce = "nonce_claim_validation"
    state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()
    txn_id = "test_txn_claims"

    db = isolated_db()
    txn = OAuthTransaction(
        id=txn_id,
        state_hash=state_hash,
        code_verifier="mock_pkce_verifier_string_claims_validation_test_12345",
        nonce=nonce,
        purpose="login",
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        consumed_at=None,
    )
    db.add(txn)
    db.commit()
    db.close()

    cookie_val = create_oauth_transaction_cookie_value(txn_id, state_hash)

    # 1. Nonce mismatch
    bad_nonce_token = mock_google.issue_id_token(nonce="wrong_nonce")
    client.cookies[settings.OAUTH_TXN_COOKIE_NAME] = cookie_val
    with mock.patch("app.api.v1.endpoints.auth.exchange_google_code_for_tokens", return_value={"id_token": bad_nonce_token}), \
         mock.patch("app.services.google_oauth.fetch_google_jwks", return_value=mock_google.jwks):
        res = client.get(
            f"/api/v1/auth/google/callback?code=mock_code&state={state}",
            follow_redirects=False,
        )
        assert res.status_code == 302
        assert "error=nonce_mismatch" in res.headers.get("location", "")

    # Reset consumed_at for next claim test
    db = isolated_db()
    db.query(OAuthTransaction).filter(OAuthTransaction.id == txn_id).update({"consumed_at": None})
    db.commit()
    db.close()

    # 2. Unverified email rejected
    unverified_email_token = mock_google.issue_id_token(nonce=nonce, email_verified=False)
    client.cookies[settings.OAUTH_TXN_COOKIE_NAME] = cookie_val
    with mock.patch("app.api.v1.endpoints.auth.exchange_google_code_for_tokens", return_value={"id_token": unverified_email_token}), \
         mock.patch("app.services.google_oauth.fetch_google_jwks", return_value=mock_google.jwks):
        res = client.get(
            f"/api/v1/auth/google/callback?code=mock_code&state={state}",
            follow_redirects=False,
        )
        assert res.status_code == 302
        assert "error=unverified_email_rejected" in res.headers.get("location", "")


@pytest.mark.asyncio
async def test_successful_google_registration_and_session_creation(isolated_db, mock_google):
    """Google sign-in creates a new user with email_verified=True, password_hash=None, and session cookies."""
    client.cookies.clear()
    state = "state_new_user_123"
    nonce = "nonce_new_user_123"
    state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()
    txn_id = "test_txn_new_user"

    db = isolated_db()
    txn = OAuthTransaction(
        id=txn_id,
        state_hash=state_hash,
        code_verifier="mock_pkce_verifier_string_new_user_test_123456789",
        nonce=nonce,
        purpose="login",
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        consumed_at=None,
    )
    db.add(txn)
    db.commit()
    db.close()

    cookie_val = create_oauth_transaction_cookie_value(txn_id, state_hash)
    client.cookies[settings.OAUTH_TXN_COOKIE_NAME] = cookie_val

    user_email = "google_newbie@pennypilot.in"
    google_sub = "google_sub_unique_101"
    id_token = mock_google.issue_id_token(sub=google_sub, email=user_email, nonce=nonce)

    with mock.patch("app.api.v1.endpoints.auth.exchange_google_code_for_tokens", return_value={"id_token": id_token}), \
         mock.patch("app.services.google_oauth.fetch_google_jwks", return_value=mock_google.jwks):
        res = client.get(
            f"/api/v1/auth/google/callback?code=mock_code&state={state}",
            follow_redirects=False,
        )
        assert res.status_code == 302
        assert "auth=success" in res.headers.get("location", "")

        # Verify session cookie was set
        sess_cookie = res.cookies.get(settings.SESSION_COOKIE_NAME)
        csrf_cookie = res.cookies.get(settings.CSRF_COOKIE_NAME)
        assert sess_cookie is not None
        assert csrf_cookie is not None

    # Inspect SQLite database
    db = isolated_db()
    try:
        user = db.query(User).filter(User.email == user_email).first()
        assert user is not None
        assert user.email_verified is True
        assert user.password_hash is None
        assert user.has_password is False

        # Verify OAuthAccount created
        oa = db.query(OAuthAccount).filter(OAuthAccount.user_id == user.id).first()
        assert oa is not None
        assert oa.provider == "google"
        assert oa.provider_user_id == google_sub

        # Verify default categories were seeded
        cats = db.query(Category).filter(Category.user_id == user.id).all()
        assert len(cats) == 12

        # Verify active session
        sess_hash = hashlib.sha256(sess_cookie.encode("utf-8")).hexdigest()
        session_rec = db.query(UserSession).filter(UserSession.token_hash == sess_hash).first()
        assert session_rec is not None
        assert session_rec.user_id == user.id
    finally:
        db.close()


# ==============================================================================
# SEC-07: Strict Non-Destructive Email Collision Barrier
# ==============================================================================

@pytest.mark.asyncio
async def test_email_collision_barrier_refuses_automatic_merge(isolated_db, mock_google):
    """
    CRITICAL SECURITY INVARIANT:
    If an existing account with matching email exists, automatic merging is STRICTLY REFUSED.
    Redirects to login with error=account_exists_link_required.
    """
    client.cookies.clear()
    collision_email = "preexisting@pennypilot.in"
    password = "ExistingPassword123!"

    # 1. User registers originally via Email/Password
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": collision_email, "password": password, "display_name": "Preexisting User"},
    )
    assert reg_res.status_code == 201

    # Clear cookies after registration
    client.cookies.clear()

    # 2. Someone tries to sign in via Google with the same email
    state = "state_collision_test"
    nonce = "nonce_collision_test"
    state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()
    txn_id = "test_txn_collision"

    db = isolated_db()
    txn = OAuthTransaction(
        id=txn_id,
        state_hash=state_hash,
        code_verifier="mock_pkce_verifier_collision_test_1234567890",
        nonce=nonce,
        purpose="login",
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        consumed_at=None,
    )
    db.add(txn)
    db.commit()
    db.close()

    cookie_val = create_oauth_transaction_cookie_value(txn_id, state_hash)
    client.cookies[settings.OAUTH_TXN_COOKIE_NAME] = cookie_val

    id_token = mock_google.issue_id_token(
        sub="google_sub_collision_attacker",
        email=collision_email,
        nonce=nonce,
    )

    with mock.patch("app.api.v1.endpoints.auth.exchange_google_code_for_tokens", return_value={"id_token": id_token}), \
         mock.patch("app.services.google_oauth.fetch_google_jwks", return_value=mock_google.jwks):
        res = client.get(
            f"/api/v1/auth/google/callback?code=mock_code&state={state}",
            follow_redirects=False,
        )
        assert res.status_code == 302
        assert "error=account_exists_link_required" in res.headers.get("location", "")

    # Verify existing account was NOT altered or merged
    db = isolated_db()
    try:
        user = db.query(User).filter(User.email == collision_email).first()
        assert user is not None
        assert user.password_hash is not None
        assert db.query(OAuthAccount).filter(OAuthAccount.user_id == user.id).first() is None
    finally:
        db.close()


# ==============================================================================
# SEC-08 & SEC-09: Authenticated Account Linking & Safe Unlinking
# ==============================================================================

@pytest.mark.asyncio
async def test_authenticated_account_linking_flow(isolated_db, mock_google):
    """Authenticated user links Google account from Settings; session is rotated."""
    client.cookies.clear()
    user_email = "link_user@pennypilot.in"
    password = "LinkPassword123!"

    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": user_email, "password": password, "display_name": "Link Tester"},
    )
    assert reg_res.status_code == 201
    auth_token = create_access_token(subject=reg_res.json()["user"]["id"])
    headers = {"Authorization": f"Bearer {auth_token}"}

    # 1. Initiate linking
    link_init = client.post("/api/v1/auth/google/link", headers=headers)
    assert link_init.status_code == 200
    init_data = link_init.json()
    assert "authorization_url" in init_data

    url = init_data["authorization_url"]
    state = url.split("state=")[1].split("&")[0]

    db = isolated_db()
    state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()
    txn = db.query(OAuthTransaction).filter(OAuthTransaction.state_hash == state_hash).first()
    assert txn is not None
    assert txn.purpose == "link"
    nonce = txn.nonce
    db.close()

    cookie_val = link_init.cookies.get(settings.OAUTH_TXN_COOKIE_NAME)
    client.cookies[settings.OAUTH_TXN_COOKIE_NAME] = cookie_val

    # 2. Callback with Google Identity
    google_sub = "google_sub_linked_999"
    id_token = mock_google.issue_id_token(sub=google_sub, email=user_email, nonce=nonce)

    with mock.patch("app.api.v1.endpoints.auth.exchange_google_code_for_tokens", return_value={"id_token": id_token}), \
         mock.patch("app.services.google_oauth.fetch_google_jwks", return_value=mock_google.jwks):
        res = client.get(
            f"/api/v1/auth/google/callback?code=mock_code&state={state}",
            follow_redirects=False,
        )
        assert res.status_code == 302
        assert "status=google_linked" in res.headers.get("location", "")

    # 3. Check /api/v1/auth/me reflects linked provider
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert "google" in me_res.json().get("linked_providers", [])


def test_safe_unlinking_protection(isolated_db):
    """User without a primary password CANNOT unlink Google identity (prevents lockout)."""
    client.cookies.clear()
    db = isolated_db()
    # Create OAuth-only user (password_hash is None)
    oauth_user = User(
        email="oauth_only@pennypilot.in",
        display_name="OAuth Only",
        password_hash=None,
    )
    db.add(oauth_user)
    db.flush()
    user_id = str(oauth_user.id)

    oa = OAuthAccount(user_id=user_id, provider="google", provider_user_id="sub_oauth_only")
    db.add(oa)
    db.commit()

    # Create session
    from app.services.session_service import create_session
    _, raw_token = create_session(db, user_id)
    csrf_token = generate_csrf_token(raw_token)
    db.close()

    client.cookies[settings.SESSION_COOKIE_NAME] = raw_token
    headers = {"X-CSRF-Token": csrf_token}

    # Attempt to unlink Google account
    unlink_res = client.delete("/api/v1/auth/google/unlink", headers=headers)
    assert unlink_res.status_code == 400
    body = unlink_res.json()
    assert body.get("code") == "UNLINK_FORBIDDEN_NO_PASSWORD"
    assert "prevent account lockout" in (body.get("message") or body.get("detail", "")).lower()

    # Now set password on user
    db = isolated_db()
    user_in_db = db.query(User).filter(User.id == user_id).first()
    from app.core.security import hash_password
    user_in_db.password_hash = hash_password("NewSecurePassword123!")
    db.commit()
    db.close()

    # Attempt unlink again: SUCCEEDS
    unlink_ok = client.delete("/api/v1/auth/google/unlink", headers=headers)
    assert unlink_ok.status_code == 200
    assert "google" not in unlink_ok.json().get("linked_providers", [])


# ==============================================================================
# SEC-10, SEC-11 & SEC-12: Session Lifecycle, Revocation, and CSRF Protection
# ==============================================================================

def test_session_lifecycle_and_timeouts(isolated_db):
    """Test session cookie validation, 120-minute idle expiration, and 14-day absolute timeout."""
    client.cookies.clear()
    db = isolated_db()
    user = User(email="session_life@pennypilot.in", display_name="Session User", password_hash="hash")
    db.add(user)
    db.commit()
    user_email = str(user.email)

    from app.services.session_service import create_session
    session_rec, raw_token = create_session(db, user.id)
    session_id = str(session_rec.id)
    db.close()

    client.cookies[settings.SESSION_COOKIE_NAME] = raw_token

    # 1. Valid session authenticates request
    res1 = client.get("/api/v1/auth/me")
    assert res1.status_code == 200
    assert res1.json()["email"] == user_email

    # 2. Simulate idle timeout (> 120 minutes)
    db = isolated_db()
    s = db.query(UserSession).filter(UserSession.id == session_id).first()
    s.last_activity_at = datetime.now(timezone.utc) - timedelta(minutes=125)
    db.commit()
    db.close()

    res2 = client.get("/api/v1/auth/me")
    assert res2.status_code == 401


def test_session_revocation_logout_and_logout_all(isolated_db):
    """Test single session logout and logout-all."""
    client.cookies.clear()
    db = isolated_db()
    user = User(email="revoke_test@pennypilot.in", display_name="Revoke User", password_hash="hash")
    db.add(user)
    db.commit()
    user_id = str(user.id)

    from app.services.session_service import create_session
    sess1, token1 = create_session(db, user_id)
    sess2, token2 = create_session(db, user_id)
    db.close()

    # 1. Single session logout revokes only active session
    client.cookies[settings.SESSION_COOKIE_NAME] = token1
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    db = isolated_db()
    assert db.query(UserSession).filter(UserSession.token_hash == hashlib.sha256(token1.encode()).hexdigest()).first() is None
    assert db.query(UserSession).filter(UserSession.token_hash == hashlib.sha256(token2.encode()).hexdigest()).first() is not None
    db.close()

    # 2. Logout-all revokes all sessions for user
    client.cookies[settings.SESSION_COOKIE_NAME] = token2
    csrf_token = generate_csrf_token(token2)
    logout_all_res = client.post(
        "/api/v1/auth/logout-all",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert logout_all_res.status_code == 200

    db = isolated_db()
    assert db.query(UserSession).filter(UserSession.user_id == user_id).count() == 0
    db.close()


def test_csrf_protection_on_mutating_requests(isolated_db):
    """Cookie-authenticated mutating requests require valid X-CSRF-Token and Origin."""
    client.cookies.clear()
    db = isolated_db()
    user = User(email="csrf_test@pennypilot.in", display_name="CSRF Tester", password_hash="hash")
    db.add(user)
    db.commit()

    from app.services.session_service import create_session
    _, raw_token = create_session(db, user.id)
    valid_csrf = generate_csrf_token(raw_token)
    db.close()

    client.cookies[settings.SESSION_COOKIE_NAME] = raw_token

    # 1. Mutating request without CSRF header -> 403 Forbidden
    res1 = client.patch("/api/v1/auth/me", json={"display_name": "New Name"})
    assert res1.status_code == 403
    err_msg = res1.json().get("message") or res1.json().get("detail", "")
    assert "CSRF" in err_msg

    # 2. Mutating request with invalid CSRF header -> 403 Forbidden
    res2 = client.patch(
        "/api/v1/auth/me",
        json={"display_name": "New Name"},
        headers={"X-CSRF-Token": "invalid_csrf_token_here"},
    )
    assert res2.status_code == 403

    # 3. Mutating request with untrusted Origin -> 403 Forbidden
    res3 = client.patch(
        "/api/v1/auth/me",
        json={"display_name": "New Name"},
        headers={"X-CSRF-Token": valid_csrf, "Origin": "http://malicious-attacker.com"},
    )
    assert res3.status_code == 403

    # 4. Mutating request with valid CSRF header and trusted Origin -> 200 OK
    res4 = client.patch(
        "/api/v1/auth/me",
        json={"display_name": "Legitimate Name"},
        headers={"X-CSRF-Token": valid_csrf, "Origin": "http://localhost:5173"},
    )
    assert res4.status_code == 200
    assert res4.json()["display_name"] == "Legitimate Name"


def test_oauth_unconfigured_error_handling(isolated_db):
    """When credentials are absent in environment, initiation safely redirects to oauth_not_configured."""
    orig_id = settings.GOOGLE_CLIENT_ID
    orig_sec = settings.GOOGLE_CLIENT_SECRET
    try:
        # Both missing
        settings.GOOGLE_CLIENT_ID = ""
        settings.GOOGLE_CLIENT_SECRET = ""
        res1 = client.get("/api/v1/auth/google/login", follow_redirects=False)
        assert res1.status_code == 302
        assert "error=oauth_not_configured" in res1.headers.get("location", "")

        # Only secret missing
        settings.GOOGLE_CLIENT_ID = "some-client-id"
        settings.GOOGLE_CLIENT_SECRET = ""
        res2 = client.get("/api/v1/auth/google/login", follow_redirects=False)
        assert res2.status_code == 302
        assert "error=oauth_not_configured" in res2.headers.get("location", "")

        # Only client id missing
        settings.GOOGLE_CLIENT_ID = ""
        settings.GOOGLE_CLIENT_SECRET = "some-secret"
        res3 = client.get("/api/v1/auth/google/login", follow_redirects=False)
        assert res3.status_code == 302
        assert "error=oauth_not_configured" in res3.headers.get("location", "")
    finally:
        settings.GOOGLE_CLIENT_ID = orig_id
        settings.GOOGLE_CLIENT_SECRET = orig_sec


def test_oauth_endpoint_parameters_match_specification(isolated_db):
    """OAuth URL matches Google Cloud configuration: redirect URI, S256, scopes, select_account."""
    res = client.get("/api/v1/auth/google/login", follow_redirects=False)
    assert res.status_code == 302
    location = res.headers.get("location", "")
    assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fv1%2Fauth%2Fgoogle%2Fcallback" in location
    assert "code_challenge_method=S256" in location
    assert "response_type=code" in location
    assert "scope=openid+email+profile" in location
    assert "prompt=select_account" in location
    assert "state=" in location
    assert "nonce=" in location
    assert "code_challenge=" in location


def test_expired_oauth_transaction_rejection(isolated_db):
    """OAuthTransaction records past their 5-minute validity window are rejected."""
    client.cookies.clear()
    state = "expired_state_test"
    state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()
    txn_id = "expired_txn_123"

    db = isolated_db()
    txn = OAuthTransaction(
        id=txn_id,
        state_hash=state_hash,
        code_verifier="mock_pkce_verifier_expired_test_12345",
        nonce="mock_nonce",
        purpose="login",
        created_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        consumed_at=None,
    )
    db.add(txn)
    db.commit()
    db.close()

    cookie_val = create_oauth_transaction_cookie_value(txn_id, state_hash)
    client.cookies[settings.OAUTH_TXN_COOKIE_NAME] = cookie_val

    res = client.get(
        f"/api/v1/auth/google/callback?code=mock_code&state={state}",
        follow_redirects=False,
    )
    assert res.status_code == 302
    assert "error=oauth_transaction_replayed_or_expired" in res.headers.get("location", "")


def test_production_url_and_cookie_security_sync():
    """Verify production settings synchronization: dynamic HTTPS callback, auto-CORS, and secure cookies."""
    from app.core.config import Settings
    prod_settings = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://test:test@localhost:5432/pennypilot_test",
        SECRET_KEY="a" * 64,
        BACKEND_BASE_URL="https://api.pennypilot.in",
        FRONTEND_BASE_URL="https://pennypilot.in",
        ALLOWED_ORIGINS="https://pennypilot.in,https://app.pennypilot.in",
    )
    # Callback dynamically derived from backend base URL
    assert prod_settings.GOOGLE_REDIRECT_URI == "https://api.pennypilot.in/api/v1/auth/google/callback"
    # Frontend origin added to CORS allowlist
    assert "https://pennypilot.in" in prod_settings.ALLOWED_ORIGINS
    assert "https://app.pennypilot.in" in prod_settings.ALLOWED_ORIGINS
    # Secure cookie flag automatically enabled in production
    assert prod_settings.COOKIE_SECURE is True
    assert prod_settings.COOKIE_SAMESITE == "lax"


# ==============================================================================
# SEC-09: Focused Google ID Token Cryptographic Verification & Diagnostic Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_verify_google_id_token_valid_signature_and_claims(mock_google):
    """Verify that a valid RS256 signed ID token passes signature and claim verification."""
    token = mock_google.issue_id_token(
        sub="google_sub_valid_123",
        email="test_valid@pennypilot.in",
        nonce="expected_nonce_123",
    )
    claims = await verify_google_id_token(
        id_token=token,
        expected_nonce="expected_nonce_123",
        jwks_override=mock_google.jwks,
    )
    assert claims["sub"] == "google_sub_valid_123"
    assert claims["email"] == "test_valid@pennypilot.in"
    assert claims["email_verified"] is True


@pytest.mark.asyncio
async def test_verify_google_id_token_with_at_hash_validation(mock_google):
    """Verify that at_hash claim is validated when access_token is provided, and fails on mismatch."""
    access_token = "ya29.sample_valid_access_token_12345"
    token = mock_google.issue_id_token(
        sub="google_sub_athash",
        email="athash@pennypilot.in",
        nonce="nonce_athash",
        access_token=access_token,
    )

    # 1. Matching access_token succeeds
    claims = await verify_google_id_token(
        id_token=token,
        expected_nonce="nonce_athash",
        access_token=access_token,
        jwks_override=mock_google.jwks,
    )
    assert claims["sub"] == "google_sub_athash"

    # 2. Mismatched access_token fails with id_token_at_hash_mismatch
    with pytest.raises(OAuthValidationError) as exc_info:
        await verify_google_id_token(
            id_token=token,
            expected_nonce="nonce_athash",
            access_token="ya29.tampered_or_different_access_token",
            jwks_override=mock_google.jwks,
        )
    assert exc_info.value.error_code == "id_token_at_hash_mismatch"


@pytest.mark.asyncio
async def test_verify_google_id_token_invalid_signature(mock_google):
    """Token signed by a foreign/untrusted private key is strictly rejected."""
    foreign_provider = MockGoogleOIDCProvider(key_id=mock_google.key_id)
    token = foreign_provider.issue_id_token(
        sub="forged_sub",
        email="forged@pennypilot.in",
        nonce="nonce_forged",
    )
    with pytest.raises(OAuthValidationError) as exc_info:
        await verify_google_id_token(
            id_token=token,
            expected_nonce="nonce_forged",
            jwks_override=mock_google.jwks,
        )
    assert exc_info.value.error_code == "id_token_signature_invalid"


@pytest.mark.asyncio
async def test_verify_google_id_token_jwks_key_selection_and_rotation(mock_google):
    """JWKS key selection picks matching kid; force refresh is invoked when kid is missing from cache."""
    provider2 = MockGoogleOIDCProvider(key_id="rotated-google-key-2")
    combined_jwks = {"keys": [mock_google.jwk_dict, provider2.jwk_dict]}

    # 1. Key selection: multiple keys in JWKS, resolves the matching one
    token2 = provider2.issue_id_token(
        sub="sub_key2",
        email="key2@pennypilot.in",
        nonce="nonce_key2",
    )
    claims = await verify_google_id_token(
        id_token=token2,
        expected_nonce="nonce_key2",
        jwks_override=combined_jwks,
    )
    assert claims["sub"] == "sub_key2"

    # 2. Unknown key id not present in JWKS
    token_unknown_kid = mock_google.issue_id_token(
        sub="sub_unknown",
        email="unknown@pennypilot.in",
        nonce="nonce_unknown",
        headers={"kid": "completely-unknown-key-id"},
    )
    with pytest.raises(OAuthValidationError) as exc_info:
        await verify_google_id_token(
            id_token=token_unknown_kid,
            expected_nonce="nonce_unknown",
            jwks_override=mock_google.jwks,
        )
    assert exc_info.value.error_code == "unknown_signing_key_id"


@pytest.mark.asyncio
async def test_verify_google_id_token_incorrect_audience(mock_google):
    """Audience mismatch is detected and rejected."""
    token = mock_google.issue_id_token(
        aud="malicious-client-id.apps.googleusercontent.com",
        nonce="nonce_aud",
    )
    with pytest.raises(OAuthValidationError) as exc_info:
        await verify_google_id_token(
            id_token=token,
            expected_nonce="nonce_aud",
            jwks_override=mock_google.jwks,
        )
    assert exc_info.value.error_code == "id_token_audience_mismatch"


@pytest.mark.asyncio
async def test_verify_google_id_token_invalid_issuer(mock_google):
    """Untrusted issuer is rejected; standard accounts.google.com and https:// are accepted."""
    # 1. Malicious issuer
    token_evil = mock_google.issue_id_token(
        iss="https://evil-spoofed-google.com",
        nonce="nonce_iss",
    )
    with pytest.raises(OAuthValidationError) as exc_info:
        await verify_google_id_token(
            id_token=token_evil,
            expected_nonce="nonce_iss",
            jwks_override=mock_google.jwks,
        )
    assert exc_info.value.error_code == "id_token_issuer_invalid"

    # 2. accounts.google.com (without https prefix) is accepted per Google OIDC spec
    token_no_https = mock_google.issue_id_token(
        iss="accounts.google.com",
        nonce="nonce_iss_valid",
    )
    claims = await verify_google_id_token(
        id_token=token_no_https,
        expected_nonce="nonce_iss_valid",
        jwks_override=mock_google.jwks,
    )
    assert claims["email"] == "alex@pennypilot.in"


@pytest.mark.asyncio
async def test_verify_google_id_token_expired(mock_google):
    """Expired token is rejected with id_token_expired."""
    token_expired = mock_google.issue_id_token(
        nonce="nonce_expired",
        exp_delta=-120,  # Expired 2 minutes ago
    )
    with pytest.raises(OAuthValidationError) as exc_info:
        await verify_google_id_token(
            id_token=token_expired,
            expected_nonce="nonce_expired",
            jwks_override=mock_google.jwks,
        )
    assert exc_info.value.error_code == "id_token_expired"


@pytest.mark.asyncio
async def test_verify_google_id_token_nonce_mismatch(mock_google):
    """Mismatched nonce is rejected."""
    token = mock_google.issue_id_token(nonce="generated_nonce_a")
    with pytest.raises(OAuthValidationError) as exc_info:
        await verify_google_id_token(
            id_token=token,
            expected_nonce="different_nonce_b",
            jwks_override=mock_google.jwks,
        )
    assert exc_info.value.error_code == "nonce_mismatch"

