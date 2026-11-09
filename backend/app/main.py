"""FastAPI application initialization and middleware configuration."""
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.errors import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import logger, setup_logging
from app.db.base import Base
from app.db.session import engine


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """
    Supplement the static CORSMiddleware with dynamic origin approval for
    Cloudflare Quick Tunnel URLs (*.trycloudflare.com) and any other origin
    permitted by settings.is_origin_allowed().

    This middleware runs BEFORE the main CORSMiddleware.  When an OPTIONS
    preflight arrives from an approved dynamic origin, it short-circuits with
    a 204 response containing the correct CORS headers.  For regular requests
    from an approved dynamic origin, it injects Access-Control-Allow-* headers
    into the response so the browser does not reject it.
    """

    CORS_HEADERS = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "600",
    }

    async def dispatch(self, request: Request, call_next) -> Response:
        origin = request.headers.get("origin", "")
        if not origin:
            return await call_next(request)

        # Only inject dynamic CORS for origins NOT already in the static allowlist
        in_static_list = any(
            origin.rstrip("/") == o.rstrip("/")
            for o in (settings.ALLOWED_ORIGINS if isinstance(settings.ALLOWED_ORIGINS, list) else [])
        )
        if in_static_list:
            return await call_next(request)

        if not settings.is_origin_allowed(origin):
            return await call_next(request)

        # Approved dynamic origin — handle preflight or annotate regular response
        if request.method == "OPTIONS":
            response = Response(status_code=204)
            response.headers["Access-Control-Allow-Origin"] = origin
            for k, v in self.CORS_HEADERS.items():
                response.headers[k] = v
            return response

        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = origin
        for k, v in self.CORS_HEADERS.items():
            if k != "Access-Control-Max-Age":  # Only meaningful on preflight
                response.headers[k] = v
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events: configure logging and ensure database connection."""
    setup_logging(debug=settings.DEBUG)
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")

    # Inspect and report database connection path (with credentials masked if applicable)
    safe_db_url = make_url(settings.DATABASE_URL).render_as_string(hide_password=True)
    logger.info(f"Database resolved connection: {safe_db_url}")

    # Guard against accidental automatic creation of an empty database in development
    parsed_url = make_url(settings.DATABASE_URL)
    if parsed_url.get_backend_name() == "sqlite" and parsed_url.database and parsed_url.database != ":memory:":
        db_file = Path(parsed_url.database)
        if not db_file.exists():
            if settings.ENVIRONMENT == "production":
                # In production (e.g. Render Persistent Disk /var/data/penny_pilot.db), ensure directory and file exist
                logger.info(f"Production SQLite database not found at '{db_file}'. Initializing persistent storage.")
                db_file.parent.mkdir(parents=True, exist_ok=True)
                db_file.touch(exist_ok=True)
            else:
                error_msg = (
                    f"Configured SQLite database file not found at '{db_file}'. "
                    "Automatic creation of an empty database is prohibited in development to prevent data loss."
                )
                logger.error(error_msg)
                raise FileNotFoundError(error_msg)

    # Verify database connectivity
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection verified successfully.")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise

    yield
    logger.info("Shutting down application cleanly.")


def create_application() -> FastAPI:
    """Application factory with security middleware and standardized error handlers."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="PennyPilot — AI-Powered Expense Tracker & Financial Intelligence Platform API",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # Dynamic CORS for Cloudflare Quick Tunnel (*.trycloudflare.com) and other
    # approved origins not present in the static ALLOWED_ORIGINS list.
    # Must be added BEFORE the static CORSMiddleware so it can intercept
    # preflight requests from dynamic origins first.
    app.add_middleware(DynamicCORSMiddleware)

    # Static CORS Middleware (handles localhost and configured origins)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Register Centralized Exception Handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # Include Versioned API Router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Convenience root health check for container probes (Render/Docker)
    @app.get("/health", tags=["System"])
    def root_health():
        return {"status": "ok", "service": settings.PROJECT_NAME, "version": settings.VERSION}

    return app


app = create_application()
