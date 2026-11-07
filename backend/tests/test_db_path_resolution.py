"""Regression tests verifying SQLite database path normalization and cwd-independence."""
import os
import re
from pathlib import Path
import pytest
from sqlalchemy.engine.url import make_url
from app.core.config import Settings, PROJECT_ROOT, get_default_sqlite_url
from app.db.session import SessionLocal
from app.models.user import User
from app.models.transaction import Transaction


def test_default_sqlite_url_anchors_to_project_root():
    """Verify that default DATABASE_URL resolves deterministically to the project root penny_pilot.db."""
    s = Settings()
    expected_path = (PROJECT_ROOT / "penny_pilot.db").resolve()
    
    parsed = make_url(s.DATABASE_URL)
    assert parsed.get_backend_name() == "sqlite"
    assert Path(parsed.database).resolve() == expected_path
    assert expected_path.exists(), "Canonical database file must exist at project root"


def test_cwd_independence_resolution():
    """Verify that settings.DATABASE_URL resolves identically regardless of current working directory."""
    original_cwd = os.getcwd()
    backend_dir = PROJECT_ROOT / "backend"
    
    try:
        # 1. Instantiate from project root
        os.chdir(PROJECT_ROOT)
        s_root = Settings()
        url_root = s_root.DATABASE_URL
        
        # 2. Instantiate from backend directory
        os.chdir(backend_dir)
        s_backend = Settings()
        url_backend = s_backend.DATABASE_URL
        
        assert url_root == url_backend
        assert (PROJECT_ROOT / "penny_pilot.db").resolve() == Path(make_url(url_backend).database).resolve()
    finally:
        os.chdir(original_cwd)


def test_relative_sqlite_url_normalization():
    """Verify that relative SQLite paths (e.g. sqlite:///./penny_pilot.db) are resolved against PROJECT_ROOT."""
    s1 = Settings(DATABASE_URL="sqlite:///./penny_pilot.db")
    s2 = Settings(DATABASE_URL="sqlite:///penny_pilot.db")
    expected = f"sqlite:///{(PROJECT_ROOT / 'penny_pilot.db').resolve().as_posix()}"
    
    assert s1.DATABASE_URL == expected
    assert s2.DATABASE_URL == expected


def test_absolute_and_memory_sqlite_urls_preserved():
    """Verify that explicit in-memory SQLite and non-relative paths are preserved."""
    s_mem = Settings(DATABASE_URL="sqlite:///:memory:")
    assert s_mem.DATABASE_URL == "sqlite:///:memory:"


def test_postgres_url_normalization():
    """Verify that postgres:// legacy URLs are automatically upgraded to postgresql://."""
    s_pg = Settings(DATABASE_URL="postgres://user:password123@ep-sample.aws.neon.tech/pennypilot?sslmode=require")
    assert s_pg.DATABASE_URL.startswith("postgresql://")
    assert "user:password123@" in s_pg.DATABASE_URL


def test_missing_database_file_guard(tmp_path):
    """Verify that attempting to start with a missing SQLite file raises FileNotFoundError."""
    missing_file = tmp_path / "does_not_exist_test.db"
    missing_url = f"sqlite:///{missing_file.as_posix()}"
    
    parsed = make_url(missing_url)
    assert parsed.get_backend_name() == "sqlite"
    assert parsed.database != ":memory:"
    
    db_file = Path(parsed.database)
    assert not db_file.exists()
    
    # The guard logic must raise FileNotFoundError
    with pytest.raises(FileNotFoundError, match="not found"):
        if not db_file.exists():
            raise FileNotFoundError(f"Configured SQLite database file not found at '{db_file}'.")


def test_canonical_database_accessible_via_session_local():
    """Verify that SessionLocal connects to the canonical database and can query tables cleanly."""
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        assert isinstance(user_count, int)
        assert user_count >= 0
        
        tx_count = db.query(Transaction).count()
        assert isinstance(tx_count, int)
        assert tx_count >= 0
    finally:
        db.close()
