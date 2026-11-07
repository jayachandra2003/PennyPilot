"""Application configuration using Pydantic Settings."""
import re
from pathlib import Path
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchored to the repository root: parent directory of 'backend' package
PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent.parent


def get_default_sqlite_url() -> str:
    """
    Resolve the default SQLite URL deterministically relative to the repository root.
    Ensures forward-slash posix formatting for cross-platform SQLAlchemy compatibility.
    """
    db_path = PROJECT_ROOT / "penny_pilot.db"
    return f"sqlite:///{db_path.as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(PROJECT_ROOT / ".env"), str(PROJECT_ROOT / "backend" / ".env"), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    PROJECT_NAME: str = "PennyPilot"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars-required"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    DATABASE_URL: str = get_default_sqlite_url()

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if not v or not isinstance(v, str) or not v.strip():
            return get_default_sqlite_url()

        v = v.strip()
        if v.startswith("postgres://"):
            # SQLAlchemy 1.4+ / 2.0 requires postgresql:// instead of postgres://
            return v.replace("postgres://", "postgresql://", 1)

        # In-memory SQLite or external non-sqlite schemes preserved directly
        if v == "sqlite:///:memory:" or v.startswith("postgresql://") or ("://" in v and not v.startswith("sqlite:///")):
            return v

        # Normalize SQLite paths to deterministic project root location
        if v.startswith("sqlite:///"):
            raw_path = v[len("sqlite:///"):]
            # Check if raw_path is already absolute
            # On Windows: drive letter like C:/ or C:\
            # On POSIX: starts with /
            is_absolute = bool(re.match(r"^[a-zA-Z]:[/\\\\]", raw_path) or raw_path.startswith("/"))
            if is_absolute:
                p = Path(raw_path).resolve()
                return f"sqlite:///{p.as_posix()}"
            else:
                # Relative path: anchor to PROJECT_ROOT deterministically
                p = (PROJECT_ROOT / raw_path).resolve()
                return f"sqlite:///{p.as_posix()}"

        return v

    # CORS
    ALLOWED_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Localization
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"
    DEFAULT_CURRENCY: str = "INR"

    # Frontend & Backend Base URL Integration
    FRONTEND_BASE_URL: str = "http://localhost:5173"
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_BASE_URL: str = "http://localhost:8000"

    # Brevo SMTP Relay Configuration
    SMTP_HOST: str = "smtp-relay.brevo.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "jayachandravennam.jc@gmail.com"
    SMTP_FROM_NAME: str = "PennyPilot"
    SMTP_USE_TLS: bool = True
    EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES: int = 30
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 15

    # Google OAuth 2.0 / OpenID Connect
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    GOOGLE_AUTH_URL: str = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL: str = "https://oauth2.googleapis.com/token"
    GOOGLE_CERTS_URL: str = "https://www.googleapis.com/oauth2/v3/certs"

    # Session & Cookie Security
    SESSION_COOKIE_NAME: str = "pennypilot_session"
    CSRF_COOKIE_NAME: str = "pennypilot_csrf"
    OAUTH_TXN_COOKIE_NAME: str = "pennypilot_oauth_txn"
    SESSION_IDLE_TIMEOUT_MINUTES: int = 120  # 120 minutes idle timeout
    SESSION_ABSOLUTE_TIMEOUT_DAYS: int = 14  # 14 days absolute timeout
    COOKIE_SECURE: bool = False  # Auto-promoted to True in production or HTTPS
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: Union[str, None] = None  # Host-only cookie scope

    @model_validator(mode="after")
    def sync_production_and_oauth_urls(self) -> "Settings":
        """
        Normalize and synchronize frontend, backend, and OAuth URLs for both
        local development and production deployment.
        """
        if self.FRONTEND_BASE_URL:
            self.FRONTEND_BASE_URL = self.FRONTEND_BASE_URL.rstrip("/")
        if self.FRONTEND_URL:
            self.FRONTEND_URL = self.FRONTEND_URL.rstrip("/")
        else:
            self.FRONTEND_URL = self.FRONTEND_BASE_URL

        if self.BACKEND_BASE_URL:
            self.BACKEND_BASE_URL = self.BACKEND_BASE_URL.rstrip("/")

        # Dynamically set GOOGLE_REDIRECT_URI from BACKEND_BASE_URL if not explicitly specified
        if not self.GOOGLE_REDIRECT_URI or not self.GOOGLE_REDIRECT_URI.strip():
            self.GOOGLE_REDIRECT_URI = f"{self.BACKEND_BASE_URL}{self.API_V1_STR}/auth/google/callback"
        else:
            self.GOOGLE_REDIRECT_URI = self.GOOGLE_REDIRECT_URI.strip()

        # Ensure active frontend URL is present in CORS ALLOWED_ORIGINS
        if isinstance(self.ALLOWED_ORIGINS, list):
            if self.FRONTEND_BASE_URL and self.FRONTEND_BASE_URL not in self.ALLOWED_ORIGINS:
                self.ALLOWED_ORIGINS.append(self.FRONTEND_BASE_URL)
            if self.FRONTEND_URL and self.FRONTEND_URL not in self.ALLOWED_ORIGINS:
                self.ALLOWED_ORIGINS.append(self.FRONTEND_URL)

        # In production environments or HTTPS deployments, automatically enforce secure cookies
        is_https = (
            self.FRONTEND_BASE_URL.startswith("https://")
            or self.BACKEND_BASE_URL.startswith("https://")
            or self.GOOGLE_REDIRECT_URI.startswith("https://")
        )
        if self.ENVIRONMENT == "production" or is_https or (self.COOKIE_SAMESITE and self.COOKIE_SAMESITE.lower() == "none"):
            self.COOKIE_SECURE = True

        return self

    # AI Configuration (3-Tier Fallback Chain)
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"

    # Profile & Receipt Storage
    AVATAR_UPLOAD_DIR: Path = PROJECT_ROOT / "uploads" / "avatars"
    RECEIPT_UPLOAD_DIR: Path = PROJECT_ROOT / "uploads" / "receipts"


settings = Settings()
settings.AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.RECEIPT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
