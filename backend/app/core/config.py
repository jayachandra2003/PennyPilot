"""Application configuration using Pydantic Settings."""
import re
from pathlib import Path
from typing import Any, List, Optional, Union
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
    PUBLIC_BASE_URL: str = ""

    def resolve_base_url(self, request: Optional[Any] = None) -> str:
        """
        Safely determine the public application origin (scheme + host).
        1. Explicit settings.PUBLIC_BASE_URL (if configured).
        2. Verified incoming request (checking x-forwarded-host, origin, or host against an allowlist).
        3. Fallback to settings.FRONTEND_BASE_URL (http://localhost:5173).
        """
        if self.PUBLIC_BASE_URL and self.PUBLIC_BASE_URL.strip():
            return self.PUBLIC_BASE_URL.strip().rstrip("/")

        if request is not None:
            # Check Origin header (sent by browsers on POST)
            origin = request.headers.get("origin")
            if origin:
                origin_clean = origin.strip().rstrip("/")
                if not origin_clean.endswith(":8000") and self.is_origin_allowed(origin_clean):
                    return origin_clean

            # Check X-Forwarded-Host or Host
            f_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
            if f_host:
                f_host = f_host.strip().split(",")[0].strip()
                # If request host is the backend's direct port (:8000), target must be the frontend URL
                if f_host.endswith(":8000"):
                    return self.FRONTEND_BASE_URL.rstrip("/")
                f_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
                if "trycloudflare.com" in f_host.lower():
                    f_proto = "https"
                candidate = f"{f_proto}://{f_host}".rstrip("/")
                if self.is_origin_allowed(candidate):
                    return candidate

        return self.FRONTEND_BASE_URL.rstrip("/")

    def is_origin_allowed(self, url_or_host: str) -> bool:
        """Check if origin/host is authorized (localhost, 127.0.0.1, trycloudflare.com, or ALLOWED_ORIGINS)."""
        clean = url_or_host.lower().replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
        if clean in ("localhost", "127.0.0.1"):
            return True
        if clean.endswith(".trycloudflare.com"):
            return True
        for o in (self.ALLOWED_ORIGINS if isinstance(self.ALLOWED_ORIGINS, list) else []):
            o_clean = o.lower().replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
            if clean == o_clean:
                return True
        return False

    def is_https_request(self, request: Optional[Any] = None) -> bool:
        """Whether current request was received via HTTPS."""
        if self.COOKIE_SECURE or self.ENVIRONMENT == "production":
            return True
        if request is not None:
            proto = request.headers.get("x-forwarded-proto", "").lower()
            if proto == "https" or request.url.scheme == "https":
                return True
            host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").lower()
            if "trycloudflare.com" in host:
                return True
        return False

    # Brevo SMTP Relay Configuration
    SMTP_HOST: str = "smtp-relay.brevo.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
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

        # Production security validation
        if self.ENVIRONMENT.strip().lower() == 'production':
            if not self.DATABASE_URL.startswith('postgresql://'):
                raise ValueError(
                    'Production requires a PostgreSQL DATABASE_URL. '
                    'SQLite is not supported in production.'
                )

            if (
                not self.SECRET_KEY
                or len(self.SECRET_KEY) < 64
                or self.SECRET_KEY == 'dev-secret-key-change-in-production-min-32-chars-required'
            ):
                raise ValueError(
                    'Production requires a secure SECRET_KEY '
                    'of at least 64 characters.'
                )

        return self

    # AI Configuration (3-Tier Fallback Chain)
    GEMINI_API_KEY: str = ""
    GEMINI_VISION_MODEL: str = "gemini-3.8-flash"
    GEMINI_TEXT_MODEL: str = "gemini-3.8-flash"
    GROQ_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"

    # Storage Configuration (Local / Cloudflare R2 / Supabase S3-compatible)
    # STORAGE_BACKEND: "local" (default) | "r2" (Cloudflare R2) | "supabase" (Supabase Storage)
    STORAGE_BACKEND: str = "local"
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "pennypilot-storage"
    R2_ENDPOINT_URL: str = ""
    R2_PUBLIC_URL: str = ""
    # S3 region for the storage provider.
    # Cloudflare R2: leave as "auto" (default — R2 accepts this across all regions).
    # Supabase Storage: set to your project's actual region (e.g. "ap-southeast-1",
    # "us-east-1"). Using "auto" with Supabase causes SigV4 signing failures.
    R2_REGION: str = "auto"

    # Profile & Receipt Storage (Local Path Fallback)
    AVATAR_UPLOAD_DIR: Path = PROJECT_ROOT / "uploads" / "avatars"
    RECEIPT_UPLOAD_DIR: Path = PROJECT_ROOT / "uploads" / "receipts"


settings = Settings()
try:
    settings.AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.RECEIPT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    # On read-only serverless environments (e.g. Vercel Lambda), fallback to /tmp
    tmp_uploads = Path("/tmp/uploads")
    settings.AVATAR_UPLOAD_DIR = tmp_uploads / "avatars"
    settings.RECEIPT_UPLOAD_DIR = tmp_uploads / "receipts"
    try:
        settings.AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        settings.RECEIPT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass
