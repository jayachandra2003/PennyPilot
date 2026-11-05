"""Application configuration using Pydantic Settings."""
import re
from pathlib import Path
from typing import List, Union
from pydantic import field_validator
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
        env_file=(str(PROJECT_ROOT / ".env"), ".env"),
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

    # AI Configuration (3-Tier Fallback Chain)
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"


settings = Settings()
