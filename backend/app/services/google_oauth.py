"""Google OAuth 2.0 / OpenID Connect service with PKCE S256 and atomic transactions."""
import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Dict, Optional, Tuple
import urllib.parse

from fastapi import Request, status
from fastapi.responses import RedirectResponse
import httpx
from jose import exceptions, jwk, jwt, JWTError
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.models.oauth import OAuthAccount, OAuthTransaction
from app.models.session import UserSession
from app.models.user import User


class OAuthValidationError(Exception):
    """Raised when OAuth state, cookie, nonce, or identity assertions fail verification."""
    def __init__(self, error_code: str, message: str = ""):
        self.error_code = error_code
        self.message = message or error_code
        super().__init__(self.message)


# In-memory Google JWKS cache
_JWKS_CACHE: Dict[str, Any] = {"keys": [], "expires_at": 0}


def generate_pkce_pair() -> Tuple[str, str]:
    """Generate PKCE code_verifier (high entropy) and code_challenge (S256)."""
    code_verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return code_verifier, code_challenge


def create_oauth_transaction_cookie_value(txn_id: str, state_hash: str) -> str:
    """Generate cryptographically bound cookie value: <txn_id>.<HMAC(SECRET_KEY, txn_id:state_hash)>."""
    cookie_hmac = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        f"{txn_id}:{state_hash}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{txn_id}.{cookie_hmac}"


def verify_oauth_transaction_cookie(cookie_val: Optional[str], state_hash: str) -> Optional[str]:
    """
    Verify cookie HMAC against state_hash in constant time.
    Returns txn_id if valid; None if missing, malformed, or substituted.
    """
    if not cookie_val or "." not in cookie_val:
        return None
    txn_id, submitted_hmac = cookie_val.split(".", 1)
    expected_hmac = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        f"{txn_id}:{state_hash}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected_hmac, submitted_hmac):
        return None
    return txn_id


def build_google_authorization_url(
    db: Session,
    purpose: str = "login",
    user_id: Optional[str] = None,
    initiating_session_id: Optional[str] = None,
    request: Optional[Request] = None,
) -> Tuple[str, str]:
    """
    Create a server-side OAuthTransaction record and return (authorization_url, cookie_value).
    """
    code_verifier, code_challenge = generate_pkce_pair()
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()
    txn_id = secrets.token_urlsafe(32)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=300)  # 5 minutes validity

    user_agent_hash = None
    ip_address = None
    if request:
        ua = request.headers.get("user-agent", "")
        if ua:
            user_agent_hash = hashlib.sha256(ua.encode("utf-8")).hexdigest()
        ip_address = request.client.host if request.client else None

    txn = OAuthTransaction(
        id=txn_id,
        state_hash=state_hash,
        code_verifier=code_verifier,
        nonce=nonce,
        purpose=purpose,
        user_id=user_id,
        initiating_session_id=initiating_session_id,
        user_agent_hash=user_agent_hash,
        ip_address=ip_address,
        created_at=now,
        expires_at=expires_at,
        consumed_at=None,
    )
    db.add(txn)
    db.commit()

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "nonce": nonce,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "select_account",
    }
    auth_url = f"{settings.GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    cookie_value = create_oauth_transaction_cookie_value(txn_id, state_hash)
    return auth_url, cookie_value


def make_oauth_redirect_with_cleanup(target_url: str) -> RedirectResponse:
    """
    Return RedirectResponse with guaranteed Set-Cookie deletion of pennypilot_oauth_txn
    across every exit path (success, error, cancellation, replay).
    """
    response = RedirectResponse(url=target_url, status_code=status.HTTP_302_FOUND)
    response.delete_cookie(
        key=settings.OAUTH_TXN_COOKIE_NAME,
        path="/api/v1/auth/google",
        domain=settings.COOKIE_DOMAIN,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
    )
    return response


def validate_and_consume_oauth_transaction(
    db: Session,
    state: Optional[str],
    cookie_val: Optional[str],
) -> OAuthTransaction:
    """
    Validate browser cookie binding and atomically consume the OAuthTransaction in SQLite.
    Guarantees atomic single-use: concurrent callbacks or replays update 0 rows and fail.
    """
    if not state or not state.strip():
        raise OAuthValidationError("missing_state")

    state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()
    txn_id = verify_oauth_transaction_cookie(cookie_val, state_hash)
    if not txn_id:
        raise OAuthValidationError("invalid_or_missing_transaction_cookie")

    now_utc = datetime.now(timezone.utc)

    # Atomic update query: updates row ONLY if id matches, state_hash matches, not consumed, and not expired
    stmt = (
        update(OAuthTransaction)
        .where(
            OAuthTransaction.id == txn_id,
            OAuthTransaction.state_hash == state_hash,
            OAuthTransaction.consumed_at.is_(None),
            OAuthTransaction.expires_at > now_utc,
        )
        .values(consumed_at=now_utc)
    )
    result = db.execute(stmt)
    db.commit()

    if result.rowcount != 1:
        # Either expired, already consumed by concurrent request, or mismatched
        raise OAuthValidationError("oauth_transaction_replayed_or_expired")

    txn = db.query(OAuthTransaction).filter(OAuthTransaction.id == txn_id).first()
    if not txn:
        raise OAuthValidationError("transaction_not_found")
    return txn


async def exchange_google_code_for_tokens(code: str, code_verifier: str) -> Dict[str, Any]:
    """Exchange authorization code with Google token endpoint using PKCE verifier."""
    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "code_verifier": code_verifier,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(settings.GOOGLE_TOKEN_URL, data=payload)
            if res.status_code != 200:
                logger.error(f"Google token exchange failed: HTTP status {res.status_code}")
                raise OAuthValidationError("google_token_exchange_failed")
            return res.json()
    except httpx.RequestError as exc:
        logger.error(f"Google token exchange network error: {exc}")
        raise OAuthValidationError("google_token_exchange_failed")


async def fetch_google_jwks(force_refresh: bool = False) -> Dict[str, Any]:
    """Fetch and cache Google's public JWKS for ID token signature verification."""
    global _JWKS_CACHE
    now = time.time()
    if not force_refresh and _JWKS_CACHE.get("keys") and now < _JWKS_CACHE.get("expires_at", 0):
        return _JWKS_CACHE

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(settings.GOOGLE_CERTS_URL)
            if res.status_code != 200:
                logger.error(f"Google JWKS retrieval failed: HTTP status {res.status_code}")
                raise OAuthValidationError("google_jwks_fetch_failed")
            data = res.json()
            keys = data.get("keys", [])
            if not keys:
                logger.error("Google JWKS response contained no signing keys")
                raise OAuthValidationError("google_jwks_fetch_failed")
            _JWKS_CACHE = {
                "keys": keys,
                "expires_at": now + 3600,  # Cache for 1 hour
            }
            return _JWKS_CACHE
    except httpx.RequestError as exc:
        logger.error(f"Google JWKS network request error: {exc}")
        raise OAuthValidationError("google_jwks_fetch_failed")


async def verify_google_id_token(
    id_token: str,
    expected_nonce: str,
    access_token: Optional[str] = None,
    jwks_override: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Verify Google ID token against Google's JWKS:
    - RS256 signature verification using public RSA key from Google's JWKS
    - Issuer: https://accounts.google.com or accounts.google.com
    - Audience: settings.GOOGLE_CLIENT_ID
    - Expiration: exp > now
    - Nonce: matches expected_nonce
    - Access token hash: verified if access_token provided
    - Email verified: claims['email_verified'] is True
    - Identity: claims['sub'] and claims['email'] present
    """
    if not id_token:
        logger.warning("Google ID token verification failed: missing ID token")
        raise OAuthValidationError("missing_id_token")

    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except Exception as e:
        logger.warning(f"Google ID token header parse failure: {e}")
        raise OAuthValidationError("invalid_id_token_header")

    kid = unverified_header.get("kid")
    if not kid:
        logger.warning("Google ID token header missing 'kid' claim")
        raise OAuthValidationError("missing_kid_in_id_token")

    jwks = jwks_override if jwks_override else await fetch_google_jwks()
    key = None
    for k in jwks.get("keys", []):
        if k.get("kid") == kid:
            key = k
            break

    # If key not found in cache and no jwks_override was provided, force cache refresh (key rotation)
    if not key and not jwks_override:
        logger.info(f"Google key id '{kid}' not in cache, attempting JWKS cache refresh")
        jwks = await fetch_google_jwks(force_refresh=True)
        for k in jwks.get("keys", []):
            if k.get("kid") == kid:
                key = k
                break

    if not key:
        logger.warning(f"Google ID token key id '{kid}' not found in Google JWKS")
        raise OAuthValidationError("unknown_signing_key_id")

    # Construct RSA public key from JWK
    try:
        rsa_key = jwk.construct(key)
    except Exception as e:
        logger.error(f"Failed to construct RSA public key from Google JWK: {e}")
        raise OAuthValidationError("rsa_key_construction_failed")

    decode_options = {
        "verify_signature": True,
        "verify_aud": True,
        "verify_iss": True,
        "verify_exp": True,
        "verify_iat": True,
        "verify_at_hash": bool(access_token),
    }

    try:
        claims = jwt.decode(
            id_token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.GOOGLE_CLIENT_ID,
            issuer=["https://accounts.google.com", "accounts.google.com"],
            access_token=access_token,
            options=decode_options,
        )
    except exceptions.ExpiredSignatureError:
        logger.warning("Google ID token expired: token expiration timestamp is in the past")
        raise OAuthValidationError("id_token_expired")
    except exceptions.JWTClaimsError as e:
        msg = str(e).lower()
        if "audience" in msg:
            logger.warning("Google ID token audience mismatch: aud claim does not match configured GOOGLE_CLIENT_ID")
            raise OAuthValidationError("id_token_audience_mismatch")
        elif "issuer" in msg:
            logger.warning("Google ID token issuer invalid: expected accounts.google.com or https://accounts.google.com")
            raise OAuthValidationError("id_token_issuer_invalid")
        elif "at_hash" in msg:
            logger.warning("Google ID token at_hash mismatch: access token hash verification failed")
            raise OAuthValidationError("id_token_at_hash_mismatch")
        else:
            logger.warning(f"Google ID token claim validation failure: {e}")
            raise OAuthValidationError("id_token_claim_invalid")
    except (exceptions.JWSSignatureError, exceptions.JWSError) as e:
        logger.warning(f"Google ID token cryptographic signature mismatch: {e}")
        raise OAuthValidationError("id_token_signature_invalid")
    except exceptions.JWTError as e:
        msg = str(e).lower()
        if "signature" in msg:
            logger.warning(f"Google ID token signature verification failed: {e}")
            raise OAuthValidationError("id_token_signature_invalid")
        logger.warning(f"Google ID token verification failed: {e}")
        raise OAuthValidationError("id_token_verification_failed")

    # 1. Nonce validation
    if claims.get("nonce") != expected_nonce:
        logger.warning("Google ID token nonce mismatch")
        raise OAuthValidationError("nonce_mismatch")

    # 2. Email verification assertion
    if not claims.get("email_verified"):
        logger.warning("Google ID token rejected: email is not verified by Google")
        raise OAuthValidationError("unverified_email_rejected")

    # 3. Essential claims validation
    if not claims.get("sub"):
        logger.warning("Google ID token missing 'sub' claim")
        raise OAuthValidationError("missing_sub_claim")

    if not claims.get("email"):
        logger.warning("Google ID token missing 'email' claim")
        raise OAuthValidationError("missing_email_claim")

    return claims
