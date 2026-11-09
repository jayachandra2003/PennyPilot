"""Authentication router: registration, login, profile management, Google OAuth 2.0 / OIDC, and server-side sessions."""
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, verify_csrf
from app.core.config import settings
from app.core.errors import AppException, BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException
from app.core.logging import logger
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.category import Category
from app.models.oauth import OAuthAccount, OAuthTransaction
from app.models.session import UserSession
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    StatusResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    VerifyEmailRequest,
)
from app.services.email_service import is_smtp_configured, send_verification_email
from app.services.google_oauth import (
    OAuthValidationError,
    build_google_authorization_url,
    exchange_google_code_for_tokens,
    make_oauth_redirect_with_cleanup,
    validate_and_consume_oauth_transaction,
    verify_google_id_token,
)
from app.services.password_reset_service import (
    request_password_reset,
    reset_password_with_token,
)
from app.services.session_service import (
    clear_session_cookies,
    create_session,
    generate_csrf_token,
    revoke_all_user_sessions,
    revoke_session,
    rotate_session,
    set_session_cookies,
    validate_session_token,
)
from app.services.verification_service import (
    create_verification_token,
    resend_verification_email,
    verify_email_token,
)

router = APIRouter()

MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB

DEFAULT_CATEGORIES = [
    # Expenses
    {"name": "Groceries", "kind": "expense", "icon": "shopping-cart", "color_token": "emerald", "sort_order": 1},
    {"name": "Dining & Food", "kind": "expense", "icon": "utensils", "color_token": "amber", "sort_order": 2},
    {"name": "Housing & Rent", "kind": "expense", "icon": "home", "color_token": "indigo", "sort_order": 3},
    {"name": "Utilities & Bills", "kind": "expense", "icon": "zap", "color_token": "blue", "sort_order": 4},
    {"name": "Transportation", "kind": "expense", "icon": "car", "color_token": "cyan", "sort_order": 5},
    {"name": "Healthcare", "kind": "expense", "icon": "heart-pulse", "color_token": "rose", "sort_order": 6},
    {"name": "Entertainment", "kind": "expense", "icon": "film", "color_token": "purple", "sort_order": 7},
    {"name": "Shopping", "kind": "expense", "icon": "shopping-bag", "color_token": "orange", "sort_order": 8},
    {"name": "Other Expenses", "kind": "expense", "icon": "more-horizontal", "color_token": "slate", "sort_order": 9},
    # Incomes
    {"name": "Salary", "kind": "income", "icon": "banknote", "color_token": "emerald", "sort_order": 1},
    {"name": "Investments", "kind": "income", "icon": "trending-up", "color_token": "teal", "sort_order": 2},
    {"name": "Freelance / Other", "kind": "income", "icon": "briefcase", "color_token": "blue", "sort_order": 3},
]


def seed_default_categories(db: Session, user_id: str) -> None:
    """Seed user-isolated default categories at registration."""
    for cat_data in DEFAULT_CATEGORIES:
        category = Category(user_id=user_id, **cat_data)
        db.add(category)


def validate_image_bytes(content: bytes) -> tuple[str, str]:
    """
    Validate image file content using magic byte analysis.
    Supports JPEG, PNG, and WebP. Strictly rejects SVG, HTML, and executable content.
    """
    if len(content) < 12:
        raise BadRequestException(message="Invalid or corrupt image file", code="CORRUPT_IMAGE")

    sample = content[:1024].lower()
    if b"<svg" in sample or b"<?xml" in sample or b"<html" in sample or b"<!doctype" in sample:
        raise BadRequestException(
            message="SVG and vector formats are not permitted for security reasons. Please upload JPEG, PNG, or WebP.",
            code="UNSUPPORTED_FORMAT",
        )

    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg", "image/jpeg"

    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png", "image/png"

    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return ".webp", "image/webp"

    raise BadRequestException(
        message="Unsupported image format. Only JPEG, PNG, and WebP images are accepted.",
        code="UNSUPPORTED_FORMAT",
    )


# ==============================================================================
# Standard Registration, Verification & Login
# ==============================================================================

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Register a new user account as unverified, seed default categories,
    generate single-use verification token, and dispatch email via Brevo SMTP.
    Does NOT issue session cookies or access tokens prior to verification.
    """
    normalized_email = user_in.email.strip().lower()

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise BadRequestException(message="An account with this email already exists", code="EMAIL_ALREADY_EXISTS")

    new_user = User(
        email=normalized_email,
        password_hash=hash_password(user_in.password),
        display_name=user_in.display_name.strip(),
        timezone=user_in.timezone or settings.DEFAULT_TIMEZONE,
        currency=user_in.currency or settings.DEFAULT_CURRENCY,
    )
    # Registration creates unverified account
    new_user.email_verified = False
    db.add(new_user)
    db.flush()

    seed_default_categories(db, new_user.id)
    db.commit()
    db.refresh(new_user)

    # Trigger genuine Account Created notification
    from app.services.notification_service import create_notification
    create_notification(
        db=db,
        user_id=new_user.id,
        category="account",
        title="Account Created",
        message="Welcome to PennyPilot! Your account was successfully created.",
        link_path="/settings",
    )

    user_response = UserResponse.model_validate(new_user)

    # Generate single-use verification token and dispatch email via Brevo
    email_dispatched = False
    try:
        _, raw_token = create_verification_token(db, new_user.id)
        if raw_token:
            base_url = settings.resolve_base_url(request)
            verification_url = f"{base_url}/verify-email?token={raw_token}"
            email_dispatched = send_verification_email(new_user.email, new_user.display_name, verification_url)
    except Exception as e:
        logger.error(f"Error during verification email dispatch: {type(e).__name__}")

    smtp_ready = is_smtp_configured()

    if email_dispatched:
        msg = "Account created successfully. A verification link has been sent to your email address."
    elif not smtp_ready:
        msg = (
            "Account created. Development notice: SMTP credentials are not configured in .env; "
            "verification email was not dispatched to your inbox. Account remains unverified."
        )
    else:
        msg = "Account created, but verification email delivery failed. You can use 'Resend Verification' to try again."

    return RegisterResponse(
        user=user_response,
        message=msg,
        email_verification_required=True,
        smtp_configured=smtp_ready,
        email_dispatched=email_dispatched,
    )


@router.post("/login", response_model=TokenResponse)
def login_user(
    login_data: UserLogin,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Authenticate email and password, enforcing email verification before issuing
    JWT access token and server-side session cookies.
    """
    normalized_email = login_data.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user:
        raise UnauthorizedException(message="Invalid email or password", code="INVALID_CREDENTIALS")

    if not user.password_hash or len(user.password_hash) == 0:
        raise UnauthorizedException(
            message="This account was registered using Google Sign-In. Please sign in with 'Continue with Google', or use 'Forgot Password' to set a password.",
            code="OAUTH_ACCOUNT_NO_PASSWORD",
        )

    if not verify_password(login_data.password, user.password_hash):
        raise UnauthorizedException(message="Invalid email or password", code="INVALID_CREDENTIALS")

    if not user.is_active:
        raise UnauthorizedException(message="Account is deactivated", code="ACCOUNT_DEACTIVATED")

    # Enforce email verification (Google OAuth accounts are auto-verified)
    if not user.email_verified:
        raise ForbiddenException(
            message="Please verify your email address before signing in. Check your inbox for the verification link.",
            code="EMAIL_NOT_VERIFIED",
        )

    user_id = str(user.id)
    token = create_access_token(subject=user_id)
    user_response = UserResponse.model_validate(user)

    # Issue server-side session cookie alongside JWT token
    try:
        _, raw_session_token = create_session(db, user_id, request)
        if raw_session_token:
            set_session_cookies(response, raw_session_token, request=request)
    except Exception:
        pass

    return TokenResponse(access_token=token, user=user_response)


@router.post("/verify-email", response_model=StatusResponse)
def verify_email_endpoint(
    payload: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    """Verify email address using single-use verification token."""
    success, status_code, user = verify_email_token(db, payload.token)
    if not success:
        if status_code == "TOKEN_EXPIRED":
            raise BadRequestException(
                message="This verification link has expired. Please request a new verification email.",
                code="TOKEN_EXPIRED",
            )
        elif status_code == "TOKEN_ALREADY_USED":
            raise BadRequestException(
                message="This verification link has already been used. Please sign in to your account.",
                code="TOKEN_ALREADY_USED",
            )
        else:
            raise BadRequestException(
                message="Invalid verification link. Please check the link or request a new one.",
                code="INVALID_TOKEN",
            )

    if user:
        from app.services.notification_service import create_notification
        create_notification(
            db=db,
            user_id=user.id,
            category="account",
            title="Email Verified",
            message="Your email address has been successfully verified. Full account features are now unlocked.",
            link_path="/",
        )

    return StatusResponse(
        status="ok",
        message="Your email address has been verified successfully. You can now sign in.",
    )


@router.get("/verify-email")
def verify_email_link_click(
    request: Request,
    token: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    """Convenience handler for clicking verification links in email clients. Redirects to frontend."""
    base_url = settings.resolve_base_url(request)
    success, status_code, user = verify_email_token(db, token)
    if success:
        return RedirectResponse(f"{base_url}/verify-email?status=success", status_code=status.HTTP_302_FOUND)
    elif status_code == "TOKEN_EXPIRED":
        return RedirectResponse(f"{base_url}/verify-email?status=expired", status_code=status.HTTP_302_FOUND)
    else:
        return RedirectResponse(f"{base_url}/verify-email?status=invalid", status_code=status.HTTP_302_FOUND)


@router.post("/resend-verification", response_model=StatusResponse)
def resend_verification_endpoint(
    payload: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Resend email verification link with rate limiting (60s cooldown)."""
    base_url = settings.resolve_base_url(request)
    success, status_code, retry_after = resend_verification_email(db, payload.email, base_url=base_url)
    if not success:
        if status_code == "RATE_LIMITED":
            raise AppException(
                message=f"Please wait {retry_after} seconds before requesting another verification email.",
                code="RATE_LIMITED",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        elif status_code == "ALREADY_VERIFIED":
            return StatusResponse(
                status="ok",
                message="This email address is already verified. You can sign in.",
            )
        else:
            raise BadRequestException(message="Failed to resend verification email.", code="RESEND_FAILED")

    if not is_smtp_configured():
        return StatusResponse(
            status="ok",
            message="Verification token generated. Development notice: SMTP credentials are not configured in .env; email was not dispatched to inbox.",
        )

    return StatusResponse(
        status="ok",
        message="If an unverified account with this email exists, a new verification link has been sent.",
    )


@router.post("/forgot-password", response_model=StatusResponse)
def forgot_password_endpoint(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Initiate password reset. Strictly enumeration-safe generic response."""
    base_url = settings.resolve_base_url(request)
    success, status_code, retry_after = request_password_reset(db, payload.email, base_url=base_url)
    if not success and status_code == "RATE_LIMITED":
        raise AppException(
            message=f"Please wait {retry_after} seconds before requesting another password reset.",
            code="RATE_LIMITED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if not is_smtp_configured():
        return StatusResponse(
            status="ok",
            message="Password reset initiated. Development notice: SMTP credentials are not configured in .env; reset link was not dispatched to inbox.",
        )

    return StatusResponse(
        status="ok",
        message="If an account with this email exists, a password reset link has been sent.",
    )


@router.post("/reset-password", response_model=StatusResponse)
def reset_password_endpoint(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Complete password reset using single-use token and revoke existing sessions."""
    success, status_code = reset_password_with_token(db, payload.token, payload.new_password)
    if not success:
        if status_code == "TOKEN_EXPIRED":
            raise BadRequestException(
                message="This password reset link has expired. Please request a new one.",
                code="TOKEN_EXPIRED",
            )
        elif status_code == "TOKEN_ALREADY_USED":
            raise BadRequestException(
                message="This password reset link has already been used. Please request a new one.",
                code="TOKEN_ALREADY_USED",
            )
        else:
            raise BadRequestException(
                message="Invalid password reset link. Please request a new link.",
                code="INVALID_TOKEN",
            )

    return StatusResponse(
        status="ok",
        message="Your password has been reset successfully. You can now sign in with your new password.",
    )


# ==============================================================================
# Google OAuth 2.0 / OpenID Connect Endpoints
# ==============================================================================

@router.get("/google/login")
def initiate_google_login(
    request: Request,
    purpose: str = Query("login", pattern="^(login|link)$"),
    db: Session = Depends(get_db),
):
    """
    Initiate Google OAuth 2.0 / OpenID Connect Authorization Code Flow with PKCE S256.
    Stores single-use OAuthTransaction in database and sets bound HttpOnly transaction cookie.
    Redirects browser to Google's consent screen.
    """
    base_url = settings.resolve_base_url(request)
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return RedirectResponse(
            f"{base_url}/login?error=oauth_not_configured",
            status_code=status.HTTP_302_FOUND,
        )

    user_id = None
    initiating_session_id = None

    if purpose == "link":
        # Account linking requires an authenticated user and active session
        try:
            current_user = get_current_user(request, db)
            user_id = current_user.id
            session_rec = getattr(request.state, "session", None)
            if session_rec:
                initiating_session_id = session_rec.id
        except HTTPException:
            return RedirectResponse(
                f"{base_url}/login?error=authentication_required_to_link",
                status_code=status.HTTP_302_FOUND,
            )

    try:
        auth_url, cookie_value = build_google_authorization_url(
            db=db,
            purpose=purpose,
            user_id=user_id,
            initiating_session_id=initiating_session_id,
            request=request,
        )
    except OperationalError as e:
        logger.error(f"Failed to create OAuth transaction: {e}")
        return RedirectResponse(
            f"{base_url}/login?error=oauth_configuration_error",
            status_code=status.HTTP_302_FOUND,
        )

    is_secure = settings.is_https_request(request)
    response = RedirectResponse(url=auth_url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=settings.OAUTH_TXN_COOKIE_NAME,
        value=cookie_value,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        path="/",
        max_age=300,
        domain=settings.COOKIE_DOMAIN,
    )
    return response


@router.post("/google/link")
def initiate_google_linking(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _csrf: bool = Depends(verify_csrf),
):
    """
    Initiate Google account linking from an authenticated session (Settings).
    Returns authorization URL and sets HttpOnly transaction cookie.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise BadRequestException(message="Google OAuth is not configured on the server", code="OAUTH_NOT_CONFIGURED")

    session_rec = getattr(request.state, "session", None)
    initiating_session_id = session_rec.id if session_rec else None

    auth_url, cookie_value = build_google_authorization_url(
        db=db,
        purpose="link",
        user_id=current_user.id,
        initiating_session_id=initiating_session_id,
        request=request,
    )
    is_secure = settings.is_https_request(request)
    response = Response(content='{"authorization_url": "' + auth_url + '"}', media_type="application/json")
    response.set_cookie(
        key=settings.OAUTH_TXN_COOKIE_NAME,
        value=cookie_value,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        path="/",
        max_age=300,
        domain=settings.COOKIE_DOMAIN,
    )
    return response


@router.get("/google/callback")
async def google_oauth_callback(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Handle Google OAuth callback:
    1. Guaranteed deletion of transaction cookie across all paths.
    2. Atomic single-use consumption of OAuthTransaction (replay protection).
    3. PKCE verification & code exchange with Google token endpoint.
    4. Google ID token signature verification against Google's JWKS.
    5. Nonce and claim validation.
    6. Non-destructive identity resolution (never auto-merge without linking).
    7. Session establishment with HttpOnly cookies and CSRF token.
    """
    public_base = settings.resolve_base_url(request)
    cookie_val = request.cookies.get(settings.OAUTH_TXN_COOKIE_NAME)

    # 1. User cancelled or Google returned an error
    if error:
        logger.info(f"Google OAuth cancelled by user: {error}")
        return make_oauth_redirect_with_cleanup(f"{public_base}/login?error=oauth_cancelled", request=request)

    if not code or not state:
        return make_oauth_redirect_with_cleanup(f"{public_base}/login?error=invalid_callback_params", request=request)

    # 2. Atomic single-use consumption & cookie binding validation
    try:
        txn = validate_and_consume_oauth_transaction(db, state, cookie_val)
    except OAuthValidationError as e:
        logger.warning(f"OAuth transaction validation failed: {e.error_code}")
        return make_oauth_redirect_with_cleanup(f"{public_base}/login?error={e.error_code}", request=request)

    # 3. Exchange code for tokens via Google token endpoint
    try:
        tokens = await exchange_google_code_for_tokens(code, txn.code_verifier, redirect_uri=txn.redirect_uri)
    except OAuthValidationError as e:
        return make_oauth_redirect_with_cleanup(f"{public_base}/login?error={e.error_code}", request=request)

    # 4. Verify ID Token using Google's public JWKS & assert nonce
    try:
        claims = await verify_google_id_token(
            id_token=tokens.get("id_token", ""),
            expected_nonce=txn.nonce,
            access_token=tokens.get("access_token"),
        )
    except OAuthValidationError as e:
        return make_oauth_redirect_with_cleanup(f"{public_base}/login?error={e.error_code}", request=request)

    sub = str(claims["sub"])
    email = str(claims["email"]).strip().lower()
    name = str(claims.get("name") or email.split("@")[0]).strip()

    # 5. Handle Linking Flow
    if txn.purpose == "link":
        if not txn.user_id:
            return make_oauth_redirect_with_cleanup(f"{public_base}/settings?error=linking_user_missing", request=request)

        # Session continuity check: verify initiating session is still active
        if txn.initiating_session_id:
            init_sess = db.query(UserSession).filter(UserSession.id == txn.initiating_session_id).first()
            if not init_sess or init_sess.user_id != txn.user_id:
                return make_oauth_redirect_with_cleanup(f"{public_base}/settings?error=linking_session_invalidated", request=request)

        # Verify Google sub is not already linked to another account
        existing_link = db.query(OAuthAccount).filter(OAuthAccount.provider == "google", OAuthAccount.provider_user_id == sub).first()
        if existing_link and existing_link.user_id != txn.user_id:
            return make_oauth_redirect_with_cleanup(f"{public_base}/settings?error=identity_already_linked", request=request)

        if not existing_link:
            new_link = OAuthAccount(
                user_id=txn.user_id,
                provider="google",
                provider_user_id=sub,
                provider_email=email,
            )
            db.add(new_link)
            db.commit()

        # Rotate session for privilege transition
        raw_sess_cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
        _, new_raw_token = rotate_session(db, raw_sess_cookie, txn.user_id, request)

        response = make_oauth_redirect_with_cleanup(f"{public_base}/settings?status=google_linked", request=request)
        set_session_cookies(response, new_raw_token, request=request)
        return response

    # 6. Handle Login / Registration Flow
    # Check if Google sub is already linked to an account
    linked_account = db.query(OAuthAccount).filter(OAuthAccount.provider == "google", OAuthAccount.provider_user_id == sub).first()

    if linked_account:
        # Existing linked account -> Sign In directly
        user = db.query(User).filter(User.id == linked_account.user_id, User.is_active == True).first()
        if not user:
            return make_oauth_redirect_with_cleanup(f"{public_base}/login?error=account_deactivated", request=request)
    else:
        # Google sub is not yet linked. Check if an account with this email exists.
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            # STRICT ZERO-SILENT-MERGE INVARIANT:
            # An account exists with this email address, but is not linked to Google.
            # Refuse automatic merge to protect financial ledger privacy and security.
            return make_oauth_redirect_with_cleanup(f"{public_base}/login?error=account_exists_link_required", request=request)

        # Create new Google-verified user
        user = User(
            email=email,
            password_hash=None,  # No primary password set initially
            display_name=name,
            timezone=settings.DEFAULT_TIMEZONE,
            currency=settings.DEFAULT_CURRENCY,
        )
        user.email_verified = True
        db.add(user)
        db.flush()

        seed_default_categories(db, user.id)

        new_link = OAuthAccount(
            user_id=user.id,
            provider="google",
            provider_user_id=sub,
            provider_email=email,
        )
        db.add(new_link)
        db.commit()
        db.refresh(user)

    # Issue server-side session and cookies
    session_rec, raw_session_token = create_session(db, user.id, request)
    response = make_oauth_redirect_with_cleanup(f"{public_base}/?auth=success", request=request)
    set_session_cookies(response, raw_session_token, request=request)
    return response


@router.delete("/google/unlink", response_model=UserResponse)
def unlink_google_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _csrf: bool = Depends(verify_csrf),
):
    """
    Unlink Google provider identity from current user profile.
    Enforces safe account recovery: user must have a primary password set to prevent lockout.
    """
    oauth_account = db.query(OAuthAccount).filter(
        OAuthAccount.user_id == current_user.id,
        OAuthAccount.provider == "google",
    ).first()

    if not oauth_account:
        raise NotFoundException(message="Google account is not linked to this profile", code="PROVIDER_NOT_LINKED")

    # Safe Account Recovery Invariant: reject if user has no password
    if not current_user.has_password:
        raise BadRequestException(
            message="Cannot unlink Google account without a primary password. Please set a password first in Settings to prevent account lockout.",
            code="UNLINK_FORBIDDEN_NO_PASSWORD",
        )

    db.delete(oauth_account)
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


# ==============================================================================
# Server-Side Session Management & CSRF Endpoints
# ==============================================================================

@router.post("/logout")
def logout_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Revoke current server-side session and clear authentication and CSRF cookies.
    """
    raw_session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if raw_session_token:
        revoke_session(db, raw_session_token)

    clear_session_cookies(response)
    return {"message": "Logged out successfully"}


@router.post("/logout-all")
def logout_all_sessions(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _csrf: bool = Depends(verify_csrf),
):
    """
    Revoke all active server-side sessions for the current user and clear cookies.
    """
    revoked_count = revoke_all_user_sessions(db, current_user.id)
    clear_session_cookies(response)
    return {"message": f"Successfully revoked {revoked_count} active session(s)"}


@router.get("/csrf")
def get_csrf_token(
    request: Request,
):
    """
    Retrieve or verify CSRF token for the active session.
    """
    raw_session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not raw_session_token:
        raise UnauthorizedException(message="Active session required for CSRF token", code="SESSION_REQUIRED")
    return {"csrf_token": generate_csrf_token(raw_session_token)}


# ==============================================================================
# User Profile & Avatar Endpoints
# ==============================================================================

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get authenticated user profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
def update_current_user_profile(
    profile_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _csrf: bool = Depends(verify_csrf),
):
    """
    Update authenticated user profile fields.
    Validates display_name, timezone, currency. Strictly scopes to current_user.
    """
    if profile_in.display_name is not None:
        trimmed = profile_in.display_name.strip()
        if len(trimmed) < 2:
            raise BadRequestException(message="Display name must be at least 2 characters", code="INVALID_NAME")
        current_user.display_name = trimmed

    if profile_in.timezone is not None:
        current_user.timezone = profile_in.timezone.strip()

    if profile_in.currency is not None:
        current_user.currency = profile_in.currency.strip().upper()

    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/me/avatar", response_model=UserResponse)
async def upload_user_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _csrf: bool = Depends(verify_csrf),
):
    """
    Upload or replace authenticated user's profile picture.
    Enforces 2 MB limit, magic byte validation, and local storage isolation.
    """
    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE_BYTES:
        raise BadRequestException(
            message="Avatar image exceeds maximum permitted size of 2 MB",
            code="FILE_TOO_LARGE",
        )

    ext, _ = validate_image_bytes(content)

    if current_user.avatar_url:
        old_filename = Path(current_user.avatar_url).name
        old_file = settings.AVATAR_UPLOAD_DIR / old_filename
        if old_file.is_file():
            try:
                old_file.unlink(missing_ok=True)
            except Exception:
                pass

    safe_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    target_path = settings.AVATAR_UPLOAD_DIR / safe_filename
    with open(target_path, "wb") as f:
        f.write(content)

    current_user.avatar_url = safe_filename
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.get("/me/avatar")
def get_my_avatar(
    current_user: User = Depends(get_current_user),
):
    """
    Serve authenticated user's profile picture with strict ownership checks.
    """
    if not current_user.avatar_url:
        raise NotFoundException(message="User has not set a profile picture", code="AVATAR_NOT_SET")

    filename = Path(current_user.avatar_url).name
    target_path = settings.AVATAR_UPLOAD_DIR / filename
    if not target_path.is_file():
        raise NotFoundException(message="Avatar file not found on disk", code="AVATAR_NOT_FOUND")

    ext = target_path.suffix.lower()
    media_type = "image/jpeg" if ext in (".jpg", ".jpeg") else ("image/png" if ext == ".png" else "image/webp")
    return FileResponse(
        path=target_path,
        media_type=media_type,
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.get("/users/{user_id}/avatar")
def get_user_avatar_by_id(
    user_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Enforce ownership check: User A cannot access User B's private avatar.
    """
    if current_user.id != user_id:
        raise NotFoundException(message="Avatar not found", code="AVATAR_NOT_FOUND")

    return get_my_avatar(current_user=current_user)


@router.delete("/me/avatar", response_model=UserResponse)
def delete_user_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _csrf: bool = Depends(verify_csrf),
):
    """Remove user's profile picture and delete image file from local storage."""
    if current_user.avatar_url:
        filename = Path(current_user.avatar_url).name
        target_path = settings.AVATAR_UPLOAD_DIR / filename
        if target_path.is_file():
            try:
                target_path.unlink(missing_ok=True)
            except Exception:
                pass
        current_user.avatar_url = None
        current_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(current_user)

    return UserResponse.model_validate(current_user)
