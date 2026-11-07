"""Local Application User Data Reset Script.
Safely backs up the canonical SQLite database via SQLite Online Backup API,
verifies backup integrity, and purges all user accounts and associated records
inside a transactional, foreign-key-safe execution order without dropping tables
or altering schema.
"""
from datetime import datetime
import os
from pathlib import Path
import sqlite3

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CANONICAL_DB_PATH = PROJECT_ROOT / "penny_pilot.db"
BACKUP_DIR = PROJECT_ROOT / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def reset_user_data():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"penny_pilot_backup_{timestamp}.db"

    print("=== STEP 1: CREATE TIMESTAMPED SQLITE ONLINE BACKUP ===")
    print(f"Source canonical DB: {CANONICAL_DB_PATH}")
    print(f"Target backup DB:    {backup_file}")

    if not CANONICAL_DB_PATH.exists():
        raise FileNotFoundError(f"Canonical database not found at {CANONICAL_DB_PATH}")

    # Use SQLite Online Backup API (thread-safe, atomic)
    src_conn = sqlite3.connect(str(CANONICAL_DB_PATH))
    dst_conn = sqlite3.connect(str(backup_file))
    src_conn.backup(dst_conn)
    dst_conn.close()
    src_conn.close()

    print(f"Backup created successfully: {backup_file.stat().st_size} bytes")

    print("\n=== STEP 2: VERIFY BACKUP INTEGRITY ===")
    b_conn = sqlite3.connect(str(backup_file))
    b_cur = b_conn.cursor()
    b_integrity = b_cur.execute("PRAGMA integrity_check").fetchall()
    print(f"Backup PRAGMA integrity_check: {b_integrity}")
    assert b_integrity == [("ok",)], f"Backup integrity check failed: {b_integrity}"

    b_fk_check = b_cur.execute("PRAGMA foreign_key_check").fetchall()
    print(f"Backup PRAGMA foreign_key_check: {b_fk_check}")
    assert len(b_fk_check) == 0, f"Backup FK errors detected: {b_fk_check}"

    b_rev = b_cur.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    print(f"Backup Alembic revision: {b_rev}")
    assert b_rev == "c1a2b3c4d5e6", f"Unexpected Alembic revision in backup: {b_rev}"
    b_conn.close()
    print("Backup verified 100% OK and pristine.")

    print("\n=== STEP 3: PERFORM LOCAL USER DATA RESET ===")
    conn = sqlite3.connect(str(CANONICAL_DB_PATH))
    cur = conn.cursor()

    # Enable FKs
    cur.execute("PRAGMA foreign_keys = ON")
    fk_enabled = cur.execute("PRAGMA foreign_keys").fetchone()[0]
    print(f"Foreign keys enabled on canonical connection: {fk_enabled == 1}")

    # Record counts before deletion
    user_associated_tables = [
        "transactions",
        "recurring_transactions",
        "budgets",
        "financial_goals",
        "insights",
        "sessions",
        "oauth_accounts",
        "oauth_transactions",
        "email_verification_tokens",
        "password_reset_tokens",
        "categories",
        "users",
    ]

    counts_before = {}
    print("\nCounts BEFORE reset:")
    for t in user_associated_tables:
        cnt = cur.execute(f'SELECT count(1) FROM "{t}"').fetchone()[0]
        counts_before[t] = cnt
        print(f"  - {t}: {cnt} rows")

    alembic_rev_before = cur.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    print(f"  - alembic_version: 1 row (rev={alembic_rev_before})")

    # Transactional child-first deletion
    print("\nExecuting deletions inside transaction...")
    cur.execute("BEGIN TRANSACTION")
    try:
        for t in user_associated_tables:
            cur.execute(f'DELETE FROM "{t}"')
            print(f"  Deleted all records from {t}")
        conn.commit()
        print("Transaction COMMITTED successfully.")
    except Exception as e:
        conn.rollback()
        conn.close()
        raise RuntimeError(f"Deletion failed, rolled back: {e}")

    # Vacuum database to reclaim unused pages
    print("\nVacuuming database...")
    cur.execute("VACUUM")
    print("Database vacuumed successfully.")

    print("\n=== STEP 4: VERIFY POST-RESET DATABASE STATE ===")
    # 1. Integrity check
    integrity = cur.execute("PRAGMA integrity_check").fetchall()
    print(f"Post-reset PRAGMA integrity_check: {integrity}")
    assert integrity == [("ok",)], f"Integrity check failed: {integrity}"

    # 2. Foreign key check
    fk_check = cur.execute("PRAGMA foreign_key_check").fetchall()
    print(f"Post-reset PRAGMA foreign_key_check (empty means 0 violations): {fk_check}")
    assert len(fk_check) == 0, f"FK errors detected: {fk_check}"

    # 3. Alembic revision check
    alembic_rev_after = cur.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    print(f"Post-reset Alembic revision: {alembic_rev_after}")
    assert alembic_rev_after == "c1a2b3c4d5e6", f"Alembic revision altered! Expected c1a2b3c4d5e6, got {alembic_rev_after}"

    # 4. Table counts check
    counts_after = {}
    print("\nCounts AFTER reset:")
    for t in user_associated_tables:
        cnt = cur.execute(f'SELECT count(1) FROM "{t}"').fetchone()[0]
        counts_after[t] = cnt
        print(f"  - {t}: {cnt} rows")
        assert cnt == 0, f"Table {t} must contain 0 rows, found {cnt}!"

    alembic_rows = cur.execute("SELECT count(1) FROM alembic_version").fetchone()[0]
    assert alembic_rows == 1, "alembic_version must contain exactly 1 row!"

    total_tables = cur.execute("SELECT count(1) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchone()[0]
    print(f"\nTotal tables preserved: {total_tables} (Expected: 13)")
    assert total_tables == 13, f"Expected 13 tables, found {total_tables}!"

    conn.close()

    print("\n=== RESET SUMMARY ===")
    print(f"Timestamped backup preserved at: {backup_file}")
    print("Records deleted per table:")
    total_deleted = 0
    for t in user_associated_tables:
        del_count = counts_before[t] - counts_after[t]
        total_deleted += del_count
        print(f"  - {t}: {del_count} deleted (now {counts_after[t]})")
    print(f"Total application user records deleted: {total_deleted}")
    print("Database reset COMPLETED with 100% verification.")


if __name__ == "__main__":
    reset_user_data()
