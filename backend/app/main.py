"""FastAPI application initialization and middleware configuration."""
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from starlette.exceptions import HTTPException as StarletteHTTPException
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

    # CORS Middleware
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
