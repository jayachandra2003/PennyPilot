"""Server-side session management and CSRF token service."""
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets
from typing import Optional, Tuple
import uuid

from fastapi import Request, Response
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.session import UserSession
from app.models.user import User


def generate_session_token() -> Tuple[str, str]:
    """Generate high-entropy 256-bit raw session token and its SHA-256 hash."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash


def generate_csrf_token(raw_session_token: str) -> str:
    """Derive cryptographically bound CSRF token from raw session token."""
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        f"{raw_session_token}:csrf".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_csrf_token(raw_session_token: str, submitted_csrf: str) -> bool:
    """Verify submitted CSRF token matches session token derivation in constant time."""
    if not raw_session_token or not submitted_csrf:
        return False
    expected = generate_csrf_token(raw_session_token)
    return hmac.compare_digest(expected, submitted_csrf)


def create_session(
    db: Session,
    user_id: str,
    request: Optional[Request] = None,
) -> Tuple[Optional[UserSession], Optional[str]]:
    """Create a new server-side session in SQLite and return (UserSession, raw_token).
    Safely rolls back and returns (None, None) if the sessions table is not available.
    """
    raw_token, token_hash = generate_session_token()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.SESSION_ABSOLUTE_TIMEOUT_DAYS)

    user_agent = None
    ip_address = None
    if request:
        user_agent = request.headers.get("user-agent", "")[:255] or None
        ip_address = request.client.host if request.client else None

    session_record = UserSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token_hash=token_hash,
        created_at=now,
        last_activity_at=now,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    try:
        db.add(session_record)
        db.commit()
        db.refresh(session_record)
        return session_record, raw_token
    except OperationalError:
        # Graceful fallback if sessions table does not exist
        db.rollback()
        return None, None
    except Exception:
        db.rollback()
        raise


def validate_session_token(
    db: Session,
    raw_token: str,
) -> Optional[Tuple[UserSession, User]]:
    """
    Validate opaque session token against SQLite sessions table.
    Enforces 14-day absolute timeout and 120-minute sliding idle timeout.
    Performs throttled activity updates (writes only if last_activity_at > 60s old).
    Returns (UserSession, User) if valid; None if expired, revoked, or invalid.
    """
    if not raw_token:
        return None

    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)

    try:
        session = db.query(UserSession).filter(UserSession.token_hash == token_hash).first()
    except OperationalError:
        # Graceful fallback if running against unmigrated database
        db.rollback()
        return None

    if not session:
        return None

    # Handle SQLite timezone-naive datetime parsing
    expires_at = session.expires_at.replace(tzinfo=timezone.utc) if session.expires_at.tzinfo is None else session.expires_at
    last_activity_at = session.last_activity_at.replace(tzinfo=timezone.utc) if session.last_activity_at.tzinfo is None else session.last_activity_at

    # 1. Check absolute expiration (14 days)
    if now > expires_at:
        db.delete(session)
        db.commit()
        return None

    # 2. Check sliding idle expiration (120 minutes)
    if now - last_activity_at > timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES):
        db.delete(session)
        db.commit()
        return None

    # 3. Verify user exists and is active
    user = db.query(User).filter(User.id == session.user_id, User.is_active == True).first()
    if not user:
        db.delete(session)
        db.commit()
        return None

    # 4. Throttled activity write: update last_activity_at only if >= 60 seconds have elapsed
    if (now - last_activity_at).total_seconds() >= 60:
        session.last_activity_at = now
        db.commit()

    return session, user


def revoke_session(db: Session, raw_token: str) -> bool:
    """Revoke a single session by its raw token."""
    if not raw_token:
        return False
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    try:
        deleted = db.query(UserSession).filter(UserSession.token_hash == token_hash).delete()
        db.commit()
        return deleted > 0
    except OperationalError:
        db.rollback()
        return False


def revoke_all_user_sessions(db: Session, user_id: str) -> int:
    """Revoke all active sessions for the given user (logout-all)."""
    try:
        deleted_count = db.query(UserSession).filter(UserSession.user_id == user_id).delete()
        db.commit()
        return deleted_count
    except OperationalError:
        db.rollback()
        return 0


def rotate_session(
    db: Session,
    old_raw_token: Optional[str],
    user_id: str,
    request: Optional[Request] = None,
) -> Tuple[UserSession, str]:
    """Revoke existing session (if provided) and issue a fresh session token."""
    if old_raw_token:
        revoke_session(db, old_raw_token)
    return create_session(db, user_id, request)


def set_session_cookies(response: Response, raw_token: str) -> None:
    """Attach HttpOnly session cookie and readable CSRF cookie to response."""
    # 1. HttpOnly Session Cookie (host-only)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/",
        max_age=settings.SESSION_ABSOLUTE_TIMEOUT_DAYS * 86400,
        domain=settings.COOKIE_DOMAIN,
    )

    # 2. Cryptographically Bound Non-HttpOnly CSRF Cookie (readable by JS)
    csrf_token = generate_csrf_token(raw_token)
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
        path="/",
        max_age=settings.SESSION_ABSOLUTE_TIMEOUT_DAYS * 86400,
        domain=settings.COOKIE_DOMAIN,
    )


def clear_session_cookies(response: Response) -> None:
    """Clear session and CSRF cookies on logout or session invalidation."""
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        domain=settings.COOKIE_DOMAIN,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
    )
    response.delete_cookie(
        key=settings.CSRF_COOKIE_NAME,
        path="/",
        domain=settings.COOKIE_DOMAIN,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
    )
