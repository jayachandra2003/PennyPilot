"""FastAPI request dependencies (Database session, User authentication & CSRF validation)."""
from typing import Generator, Optional
from fastapi import Depends, Header, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.services.session_service import validate_session_token, verify_csrf_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    query_token: Optional[str] = Query(None, alias="token"),
) -> User:
    """
    Extract and validate current authenticated user.
    Enforces strict user isolation across all routes.
    Supports:
    1. Explicit Authorization: Bearer <jwt> header (API / mobile client)
    2. Server-side HttpOnly session cookie pennypilot_session (browser client)
    3. Query parameter ?token=<jwt> (fallback)
    """
    # 1. Prioritize explicit Bearer token in Authorization header
    jwt_token = token
    if not jwt_token and authorization and authorization.startswith("Bearer "):
        jwt_token = authorization.split(" ")[1]

    if jwt_token:
        payload = decode_access_token(jwt_token)
        if not payload or "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload["sub"]
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or deactivated",
            )
        request.state.session = None
        request.state.raw_session_token = None
        return user

    # 2. Server-side HttpOnly session cookie
    raw_session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if raw_session_token:
        session_result = validate_session_token(db, raw_session_token)
        if session_result:
            session_record, user = session_result
            request.state.session = session_record
            request.state.raw_session_token = raw_session_token
            return user

    # 3. Query parameter ?token= fallback
    if query_token:
        payload = decode_access_token(query_token)
        if not payload or "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload["sub"]
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or deactivated",
            )
        request.state.session = None
        request.state.raw_session_token = None
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_csrf(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> bool:
    """
    Verify CSRF protection for cookie-authenticated mutating requests.
    Validates:
    1. X-CSRF-Token header against HMAC(raw_session_token:csrf)
    2. Origin header against ALLOWED_ORIGINS (if present)
    """
    raw_session_token = getattr(request.state, "raw_session_token", None)
    # Only enforce CSRF when authenticated via session cookie
    if not raw_session_token:
        return True

    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        # 1. Validate Origin header using the full allowlist logic (supports *.trycloudflare.com
        #    and any other patterns registered via settings.is_origin_allowed).
        origin = request.headers.get("origin")
        if origin:
            origin_clean = origin.strip().rstrip("/")
            # settings.is_origin_allowed covers: localhost, 127.0.0.1, *.trycloudflare.com,
            # and every entry in ALLOWED_ORIGINS — so no separate list scan is needed.
            if not settings.is_origin_allowed(origin_clean):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Untrusted cross-origin request",
                )

        # 2. Validate X-CSRF-Token header
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_header or not verify_csrf_token(raw_session_token, csrf_header):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed",
            )

    return True
