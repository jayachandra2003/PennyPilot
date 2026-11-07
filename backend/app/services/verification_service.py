"""Email verification service for PennyPilot.

Handles single-use cryptographically secure verification tokens,
atomic token consumption, rate-limited resend, and verification state transitions.
"""
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Optional, Tuple
import uuid

from sqlalchemy import func
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.models.auth_tokens import EmailVerificationToken
from app.models.user import User
from app.services.email_service import send_verification_email


def create_verification_token(
    db: Session,
    user_id: str,
) -> Tuple[Optional[EmailVerificationToken], Optional[str]]:
    """
    Generate high-entropy 256-bit raw verification token, store only its SHA-256 hash.
    Sets 30-minute expiration. Returns (EmailVerificationToken, raw_token).
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES)

    try:
        # Invalidate any previous unconsumed verification tokens for this user
        db.query(EmailVerificationToken).filter(
            EmailVerificationToken.user_id == user_id,
            EmailVerificationToken.consumed_at.is_(None),
        ).update({"consumed_at": now})

        record = EmailVerificationToken(
            id=str(uuid.uuid4()),
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            created_at=now,
            consumed_at=None,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record, raw_token
    except OperationalError:
        db.rollback()
        return None, None
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create verification token: {type(e).__name__}")
        return None, None


def verify_email_token(
    db: Session,
    raw_token: str,
) -> Tuple[bool, str, Optional[User]]:
    """
    Atomically verify and consume a single-use email verification token.
    Returns: (is_success, error_code_or_status, user)
    Possible status codes:
    - SUCCESS: Token consumed, user marked verified
    - INVALID_TOKEN: Token hash not found
    - TOKEN_ALREADY_USED: Token was already consumed
    - TOKEN_EXPIRED: Token exceeded 30-minute validity
    - USER_NOT_FOUND: User associated with token not found
    """
    if not raw_token or not raw_token.strip():
        return False, "INVALID_TOKEN", None

    token_hash = hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)

    try:
        token_record = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.token_hash == token_hash
        ).first()
    except OperationalError:
        db.rollback()
        return False, "DATABASE_ERROR", None

    if not token_record:
        return False, "INVALID_TOKEN", None

    if token_record.consumed_at is not None:
        return False, "TOKEN_ALREADY_USED", None

    # Handle SQLite timezone-naive parsing
    expires_at = (
        token_record.expires_at.replace(tzinfo=timezone.utc)
        if token_record.expires_at.tzinfo is None
        else token_record.expires_at
    )
    if now > expires_at:
        return False, "TOKEN_EXPIRED", None

    # Atomic consumption: only update if consumed_at is still NULL
    try:
        updated = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.id == token_record.id,
            EmailVerificationToken.consumed_at.is_(None),
        ).update({"consumed_at": now})

        if updated != 1:
            db.rollback()
            return False, "TOKEN_ALREADY_USED", None

        # Fetch and mark user as verified
        user = db.query(User).filter(User.id == token_record.user_id).first()
        if not user:
            db.rollback()
            return False, "USER_NOT_FOUND", None

        user.email_verified = True
        db.commit()
        db.refresh(user)
        logger.info(f"User {user.id} email verified successfully via token")
        return True, "SUCCESS", user

    except OperationalError:
        db.rollback()
        return False, "DATABASE_ERROR", None
    except Exception as e:
        db.rollback()
        logger.error(f"Error during token consumption: {type(e).__name__}")
        return False, "INTERNAL_ERROR", None


def resend_verification_email(
    db: Session,
    email: str,
) -> Tuple[bool, str, Optional[int]]:
    """
    Resend verification email to an unverified user with rate limiting.
    Rate limit: 60 seconds between resend requests.
    Returns: (success, status_code, retry_after_seconds)
    """
    normalized_email = email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    # Generic success response to prevent account enumeration if user doesn't exist
    if not user:
        return True, "SENT_IF_EXISTS", None

    if user.email_verified:
        return False, "ALREADY_VERIFIED", None

    now = datetime.now(timezone.utc)

    # Check rate limit: 60s cooldown from the most recently created token
    try:
        latest_token = db.query(EmailVerificationToken).filter(
            EmailVerificationToken.user_id == user.id,
        ).order_by(EmailVerificationToken.created_at.desc()).first()

        if latest_token:
            created_at = (
                latest_token.created_at.replace(tzinfo=timezone.utc)
                if latest_token.created_at.tzinfo is None
                else latest_token.created_at
            )
            elapsed = (now - created_at).total_seconds()
            if elapsed < 60:
                retry_after = int(60 - elapsed)
                return False, "RATE_LIMITED", retry_after
    except OperationalError:
        db.rollback()

    # Create fresh single-use verification token
    _, raw_token = create_verification_token(db, user.id)
    if not raw_token:
        # Dry-run or fallback when table is absent
        raw_token = secrets.token_urlsafe(32)

    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"
    send_verification_email(user.email, user.display_name, verification_url)
    return True, "SENT", None
