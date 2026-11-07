"""Password reset service for PennyPilot.

Handles single-use cryptographically secure password reset tokens,
atomic token consumption, rate limiting, and session revocation.
"""
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Optional, Tuple
import uuid

from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.core.security import hash_password
from app.models.auth_tokens import PasswordResetToken
from app.models.user import User
from app.services.email_service import send_password_reset_email
from app.services.session_service import revoke_all_user_sessions


def create_password_reset_token(
    db: Session,
    user_id: str,
) -> Tuple[Optional[PasswordResetToken], Optional[str]]:
    """
    Generate high-entropy 256-bit raw reset token, store only its SHA-256 hash.
    Sets 15-minute expiration. Returns (PasswordResetToken, raw_token).
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

    try:
        # Invalidate any prior unconsumed reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.consumed_at.is_(None),
        ).update({"consumed_at": now})

        record = PasswordResetToken(
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
        logger.error(f"Failed to create password reset token: {type(e).__name__}")
        return None, None


def request_password_reset(
    db: Session,
    email: str,
) -> Tuple[bool, str, Optional[int]]:
    """
    Initiate a password reset request.
    Strictly enumeration-safe: returns generic success message regardless of whether
    the account exists or has a password.
    Enforces 60-second cooldown rate limit.
    """
    normalized_email = email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    # Generic success response to defeat account enumeration
    if not user or not user.has_password:
        return True, "SENT_IF_EXISTS", None

    now = datetime.now(timezone.utc)

    # 60-second cooldown rate limit
    try:
        latest_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
        ).order_by(PasswordResetToken.created_at.desc()).first()

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

    _, raw_token = create_password_reset_token(db, user.id)
    if not raw_token:
        raw_token = secrets.token_urlsafe(32)

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    send_password_reset_email(user.email, user.display_name, reset_url)
    return True, "SENT_IF_EXISTS", None


def reset_password_with_token(
    db: Session,
    raw_token: str,
    new_password: str,
) -> Tuple[bool, str]:
    """
    Atomically verify reset token, update user password, and revoke all active sessions.
    Possible status codes:
    - SUCCESS: Password updated, sessions revoked
    - INVALID_TOKEN: Token hash not found
    - TOKEN_ALREADY_USED: Token already consumed
    - TOKEN_EXPIRED: Token exceeded 15-minute validity
    - USER_NOT_FOUND: User record missing
    """
    if not raw_token or not raw_token.strip():
        return False, "INVALID_TOKEN"

    token_hash = hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)

    try:
        token_record = db.query(PasswordResetToken).filter(
            PasswordResetToken.token_hash == token_hash
        ).first()
    except OperationalError:
        db.rollback()
        return False, "DATABASE_ERROR"

    if not token_record:
        return False, "INVALID_TOKEN"

    if token_record.consumed_at is not None:
        return False, "TOKEN_ALREADY_USED"

    expires_at = (
        token_record.expires_at.replace(tzinfo=timezone.utc)
        if token_record.expires_at.tzinfo is None
        else token_record.expires_at
    )
    if now > expires_at:
        return False, "TOKEN_EXPIRED"

    # Atomic consumption
    try:
        updated = db.query(PasswordResetToken).filter(
            PasswordResetToken.id == token_record.id,
            PasswordResetToken.consumed_at.is_(None),
        ).update({"consumed_at": now})

        if updated != 1:
            db.rollback()
            return False, "TOKEN_ALREADY_USED"

        user = db.query(User).filter(User.id == token_record.user_id).first()
        if not user:
            db.rollback()
            return False, "USER_NOT_FOUND"

        # Update password hash
        user.password_hash = hash_password(new_password)
        db.commit()

        # Invalidate all active user sessions upon password change
        revoke_all_user_sessions(db, user.id)
        logger.info(f"Password reset successfully for user {user.id}; all active sessions revoked.")

        from app.services.notification_service import create_notification
        create_notification(
            db=db,
            user_id=user.id,
            category="account",
            title="Password Reset Successful",
            message="Your account password was successfully updated.",
            link_path="/settings",
        )

        return True, "SUCCESS"

    except OperationalError:
        db.rollback()
        return False, "DATABASE_ERROR"
    except Exception as e:
        db.rollback()
        logger.error(f"Error resetting password: {type(e).__name__}")
        return False, "INTERNAL_ERROR"
