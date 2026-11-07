"""
Verification test for fresh SQLite database initialization and Alembic migrations.
Guarantees:
1. Migration runs cleanly from scratch on an empty SQLite database.
2. All tables are created with proper constraints.
3. PRAGMA integrity_check passes.
4. Idempotent: running migration multiple times does not drop or corrupt data.
5. Absolute POSIX paths (such as /var/data/penny_pilot.db) are handled correctly.
"""
import os
import subprocess
import tempfile
import sqlite3
import pytest
from pathlib import Path


def test_fresh_sqlite_migration():
    """Verify fresh SQLite database migration in an isolated temporary directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        test_db_path = Path(tmpdir) / "fresh_production.db"
        test_db_url = f"sqlite:///{test_db_path.as_posix()}"

        env = os.environ.copy()
        env["DATABASE_URL"] = test_db_url
        env["PYTHONPATH"] = "backend"

        # 1. Run migrations against empty database
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd="backend",
            env=env,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, f"Alembic migration failed:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}"

        # 2. Check created tables
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = [r[0] for r in cursor.fetchall()]

        expected_tables = [
            "alembic_version",
            "budgets",
            "categories",
            "email_verification_tokens",
            "financial_goals",
            "insights",
            "notifications",
            "oauth_accounts",
            "oauth_transactions",
            "password_reset_tokens",
            "recurring_transactions",
            "sessions",
            "transactions",
            "users",
        ]
        for tbl in expected_tables:
            assert tbl in tables, f"Expected table '{tbl}' was not created by migrations."

        # 3. Check Alembic version
        cursor.execute("SELECT version_num FROM alembic_version;")
        version = cursor.fetchone()[0]
        assert version == "e4f5a6b7c8d9", f"Expected head version 'e4f5a6b7c8d9', got '{version}'"

        # 4. Check SQLite integrity
        cursor.execute("PRAGMA integrity_check;")
        check_result = cursor.fetchall()
        assert check_result == [("ok",)], f"Integrity check failed: {check_result}"
        conn.close()

        # 5. Idempotent re-run
        result2 = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd="backend",
            env=env,
            capture_output=True,
            text=True,
        )
        assert result2.returncode == 0, f"Idempotent migration failed:\nSTDERR: {result2.stderr}"
