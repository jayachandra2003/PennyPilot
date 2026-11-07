"""Account governance and permanent deletion endpoints."""
import logging
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, verify_csrf
from app.core.config import settings
from app.core.errors import AppException, BadRequestException, UnauthorizedException
from app.core.security import verify_password
from app.db.session import get_db
from app.models.auth_tokens import EmailVerificationToken, PasswordResetToken
from app.models.budget import Budget
from app.models.category import Category
from app.models.goal import FinancialGoal
from app.models.insight import Insight
from app.models.notification import Notification
from app.models.oauth import OAuthAccount, OAuthTransaction
from app.models.recurring import RecurringTransaction
from app.models.session import UserSession
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.user import DeleteAccountRequest, StatusResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.delete("", response_model=StatusResponse)
@router.delete("/", response_model=StatusResponse)
def delete_user_account(
    payload: DeleteAccountRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _csrf: bool = Depends(verify_csrf),
):
    """
    Permanently delete the authenticated user's account and all associated personal financial data.
    
    Security & Safety Guarantees:
    1. Authenticated user is derived strictly from the verified session / JWT, never from client parameters.
    2. Exact case-sensitive confirmation phrase 'DELETE MY ACCOUNT' required.
    3. Password re-verification required for password-bearing accounts.
    4. Active session re-verification for OAuth-only accounts.
    5. CSRF verification enforced.
    6. Deletion cascades across all 12 user-owned tables in strict foreign-key order.
    7. Shared default categories belonging to other users remain completely untouched.
    8. User-owned avatar files on disk are physically deleted.
    9. Atomic database transaction: failure rolls back safely without orphaned state.
    10. Session and CSRF cookies are revoked and cleared in the response.
    """
    # 1. Exact case-sensitive confirmation phrase verification
    required_phrase = "DELETE MY ACCOUNT"
    if payload.confirmation_phrase != required_phrase:
        raise BadRequestException(
            message=f"Confirmation phrase must exactly match '{required_phrase}'. Received: '{payload.confirmation_phrase}'",
            code="INVALID_CONFIRMATION_PHRASE",
        )

    # 2. Re-authentication verification
    if current_user.has_password:
        if not payload.password:
            raise UnauthorizedException(
                message="Password confirmation is required to delete an account.",
                code="PASSWORD_REQUIRED",
            )
        if not current_user.password_hash or not verify_password(payload.password, current_user.password_hash):
            raise UnauthorizedException(
                message="Incorrect password. Account deletion requires valid identity re-verification.",
                code="INVALID_PASSWORD",
            )
    else:
        # For Google OAuth-only accounts without a password, ensure the session is active and authenticated
        session_rec = getattr(request.state, "session", None)
        if not session_rec and not getattr(request.state, "user_id", None):
            raise UnauthorizedException(
                message="Active verified authentication session required to delete account.",
                code="SESSION_REQUIRED",
            )

    user_id = current_user.id
    user_email = current_user.email
    avatar_url = current_user.avatar_url

    logger.info(f"Initiating atomic permanent account deletion for user_id={user_id}")

    # 3. Atomic database deletion in strict foreign-key safe order
    try:
        # A. Ledger transactions (must precede categories due to RESTRICT FK)
        db.query(Transaction).filter(Transaction.user_id == user_id).delete(synchronize_session=False)

        # B. Recurring transaction rules (must precede categories due to RESTRICT FK)
        db.query(RecurringTransaction).filter(RecurringTransaction.user_id == user_id).delete(synchronize_session=False)

        # C. Budgets
        db.query(Budget).filter(Budget.user_id == user_id).delete(synchronize_session=False)

        # D. Financial Goals
        db.query(FinancialGoal).filter(FinancialGoal.user_id == user_id).delete(synchronize_session=False)

        # E. User categories (isolated to user_id; leaves other users' categories intact)
        db.query(Category).filter(Category.user_id == user_id).delete(synchronize_session=False)

        # F. Financial Insights
        db.query(Insight).filter(Insight.user_id == user_id).delete(synchronize_session=False)

        # G. Persistent Notifications
        db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)

        # H. Auth verification and password reset tokens
        db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user_id).delete(synchronize_session=False)
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete(synchronize_session=False)

        # I. Pending OAuth Transactions and linked OAuth Accounts
        db.query(OAuthTransaction).filter(OAuthTransaction.user_id == user_id).delete(synchronize_session=False)
        db.query(OAuthAccount).filter(OAuthAccount.user_id == user_id).delete(synchronize_session=False)

        # J. Server-side sessions
        db.query(UserSession).filter(UserSession.user_id == user_id).delete(synchronize_session=False)

        # K. User record itself
        db.delete(current_user)

        # Commit transaction atomically
        db.commit()
        logger.info(f"Successfully deleted all database records for user_id={user_id}")
    except Exception as exc:
        db.rollback()
        logger.error(f"Permanent account deletion failed for user_id={user_id}: {exc}", exc_info=True)
        raise AppException(
            message="An error occurred while deleting your account. Database transaction was safely rolled back and no records were deleted.",
            code="ACCOUNT_DELETION_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # 4. Physically remove avatar file and receipt uploads from local storage if present
    if avatar_url:
        try:
            filename = Path(avatar_url).name
            target_path = settings.AVATAR_UPLOAD_DIR / filename
            if target_path.is_file():
                target_path.unlink(missing_ok=True)
                logger.info(f"Deleted avatar file on disk: {target_path}")
        except Exception as e:
            logger.warning(f"Could not delete avatar file on disk for user_id={user_id}: {e}")

    try:
        user_receipt_dir = settings.RECEIPT_UPLOAD_DIR / user_id
        if user_receipt_dir.is_dir():
            shutil.rmtree(user_receipt_dir, ignore_errors=True)
            logger.info(f"Deleted user receipt uploads directory on disk: {user_receipt_dir}")
    except Exception as e:
        logger.warning(f"Could not delete receipt uploads directory on disk for user_id={user_id}: {e}")

    # 5. Clear authentication and CSRF cookies in the response
    json_response = JSONResponse(
        content={
            "status": "ok",
            "message": "Your account, personal profile, and all associated financial records have been permanently deleted.",
        },
        status_code=status.HTTP_200_OK,
    )
    json_response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )
    json_response.delete_cookie(
        key=settings.CSRF_COOKIE_NAME,
        path="/",
        domain=settings.COOKIE_DOMAIN,
    )
    json_response.delete_cookie(
        key=settings.OAUTH_TXN_COOKIE_NAME,
        path="/api/v1/auth/google",
        domain=settings.COOKIE_DOMAIN,
    )
    return json_response
