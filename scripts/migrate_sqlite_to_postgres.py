"""
PennyPilot — Deterministic SQLite to PostgreSQL Migration Utility.

Safely transfers verified user accounts, categories, transactions, budgets,
and recurring rules from local SQLite (penny_pilot.db) to Neon PostgreSQL.

Guarantees:
- Strict SQLite integer-to-PostgreSQL Boolean conversion (0/1 -> False/True).
- Pure integer paise preservation (Zero float corruption).
- Foreign key topological insertion ordering.
- Idempotent upsert via ON CONFLICT (id) DO NOTHING.
- Dry-run verification mode before applying live writes.
"""
import argparse
import os
import sys
import sqlite3
from typing import Dict, Any, List, Set

# Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import psycopg2
from psycopg2.extras import execute_values


TABLES_ORDERED = [
    "users",
    "categories",
    "budgets",
    "recurring_transactions",
    "transactions",
    "oauth_accounts",
    "notifications",
    "financial_goals",
    "insights",
]

# Explicit mapping of all PostgreSQL Boolean columns across all migrated tables
BOOLEAN_COLUMNS: Dict[str, Set[str]] = {
    "users": {"is_active", "email_verified", "onboarding_completed", "tutorial_completed"},
    "categories": {"is_archived"},
    "recurring_transactions": {"is_active"},
    "notifications": {"is_read"},
}


def clean_value_for_postgres(table: str, col: str, val: Any) -> Any:
    """
    Format and clean a SQLite value for PostgreSQL insertion.
    - Explicitly converts integer/string boolean flags (1, 0, '1', '0') to Python bool (True/False)
      for all known Boolean columns to prevent PostgreSQL DatatypeMismatch errors.
    - Preserves exact integer paise values without float contamination.
    - Preserves UUIDs, timestamps, and None/NULL values.
    """
    if val is None:
        return None

    # Boolean columns conversion with strict rejection of invalid representations
    if table in BOOLEAN_COLUMNS and col in BOOLEAN_COLUMNS[table]:
        if isinstance(val, bool):
            return val
        if isinstance(val, (int, float)):
            int_val = int(val)
            if int_val in (0, 1):
                return bool(int_val)
            raise ValueError(f"Invalid numeric boolean value '{val}' for {table}.{col}; expected 0 or 1.")
        if isinstance(val, str):
            clean_str = val.strip().lower()
            if clean_str in ("1", "true", "t", "yes"):
                return True
            if clean_str in ("0", "false", "f", "no"):
                return False
            raise ValueError(f"Invalid boolean string representation '{val}' for {table}.{col}; cannot map to boolean.")
        raise TypeError(f"Unsupported type {type(val)} for boolean column {table}.{col}")

    # Strictly preserve integer paise (Reject floats)
    if "paise" in col and val is not None:
        if isinstance(val, float):
            raise ValueError(f"Floating-point monetary value detected in {table}.{col}: {val}. Paise must be integer.")
        return int(val)

    return val


def get_sqlite_columns(sqlite_conn: sqlite3.Connection, table: str) -> List[str]:
    cursor = sqlite_conn.cursor()
    cursor.execute(f"PRAGMA table_info({table});")
    return [col[1] for col in cursor.fetchall()]


def get_postgres_columns(pg_conn, table: str) -> List[str]:
    with pg_conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND table_schema = 'public';
            """,
            (table,)
        )
        return [row[0] for row in cur.fetchall()]


def migrate_table(sqlite_conn: sqlite3.Connection, pg_conn, table: str, dry_run: bool = True):
    sqlite_cols = get_sqlite_columns(sqlite_conn, table)
    pg_cols = get_postgres_columns(pg_conn, table)
    
    # Common columns
    common_cols = [c for c in sqlite_cols if c in pg_cols]
    if not common_cols:
        print(f"  [SKIP] Table '{table}' has no matching columns or does not exist in target.")
        return 0

    cur = sqlite_conn.cursor()
    cur.execute(f"SELECT {', '.join(common_cols)} FROM {table};")
    rows = cur.fetchall()
    
    if not rows:
        print(f"  [INFO] Table '{table}' has 0 records in SQLite source.")
        return 0

    print(f"  [MIGRATE] Table '{table}': found {len(rows)} source records across {len(common_cols)} columns.")
    
    # Clean all rows with strict type conversions
    cleaned_rows = []
    for r in rows:
        cleaned_row = [
            clean_value_for_postgres(table, col, val)
            for col, val in zip(common_cols, r)
        ]
        cleaned_rows.append(cleaned_row)

    if dry_run:
        # Strict validation of types in dry run
        for cr in cleaned_rows:
            for col, val in zip(common_cols, cr):
                if table in BOOLEAN_COLUMNS and col in BOOLEAN_COLUMNS[table]:
                    assert val is None or isinstance(val, bool), f"Validation failed: {table}.{col} must be bool, got {type(val)}"
                if "paise" in col and val is not None:
                    assert isinstance(val, int), f"Validation failed: {table}.{col} must be int paise, got {type(val)}"
        print(f"    [DRY-RUN] Verified {len(cleaned_rows)} records with strict Boolean & Integer Paise types.")
        return len(cleaned_rows)

    cols_str = ", ".join(common_cols)
    placeholders = ", ".join(["%s"] * len(common_cols))
    
    # Identify primary key for ON CONFLICT DO NOTHING
    pk = "id" if "id" in common_cols else common_cols[0]
    
    insert_sql = f"""
    INSERT INTO {table} ({cols_str}) 
    VALUES ({placeholders}) 
    ON CONFLICT ({pk}) DO NOTHING;
    """

    with pg_conn.cursor() as pg_cur:
        for cr in cleaned_rows:
            pg_cur.execute(insert_sql, tuple(cr))
    pg_conn.commit()
    print(f"    [COMMITTED] Successfully written {len(cleaned_rows)} records into '{table}'.")
    return len(cleaned_rows)


def audit_sqlite_source(sqlite_path: str):
    """Perform comprehensive local read-only audit of SQLite source database."""
    sqlite_conn = sqlite3.connect(sqlite_path)
    print("\nSQLite Source Table Summary & Type Audit:")
    total = 0
    for t in TABLES_ORDERED:
        try:
            cols = get_sqlite_columns(sqlite_conn, t)
            c = sqlite_conn.cursor().execute(f"SELECT count(*) FROM {t};").fetchone()[0]
            bool_cols_in_table = [col for col in cols if t in BOOLEAN_COLUMNS and col in BOOLEAN_COLUMNS[t]]
            paise_cols_in_table = [col for col in cols if "paise" in col]
            
            print(f"  • {t:<26}: {c:>4} records | Booleans: {bool_cols_in_table or 'None'} | Paise: {paise_cols_in_table or 'None'}")
            total += c
        except Exception as e:
            print(f"  • {t:<26}: table missing ({e})")
    print(f"\nTotal Source Records across key financial tables: {total}")
    sqlite_conn.close()
    return total


def main():
    parser = argparse.ArgumentParser(description="PennyPilot SQLite to PostgreSQL Migration")
    parser.add_argument("--sqlite", default="penny_pilot.db", help="Path to SQLite database file")
    parser.add_argument("--postgres", required=False, help="PostgreSQL connection string (e.g. postgresql://user:pass@host/db?sslmode=require)")
    parser.add_argument("--dry-run", action="store_true", help="Inspect and simulate migration without writing to Postgres")
    parser.add_argument("--execute", action="store_true", help="Perform real migration into target PostgreSQL database")
    args = parser.parse_args()

    sqlite_path = os.path.abspath(args.sqlite)
    if not os.path.exists(sqlite_path):
        print(f"[ERROR] SQLite database file not found: {sqlite_path}")
        sys.exit(1)

    print("=" * 70)
    print("PENNYPILOT — SQLITE TO POSTGRESQL DATA MIGRATION")
    print(f"Source SQLite:   {sqlite_path}")
    
    pg_url = args.postgres or os.environ.get("DATABASE_URL")
    if not pg_url or pg_url.startswith("sqlite"):
        print("[INFO] No PostgreSQL URL provided via --postgres or DATABASE_URL.")
        print("[INFO] Running in SQLite Source Audit mode only.")
        audit_sqlite_source(sqlite_path)
        return

    is_dry_run = not args.execute
    print(f"Target Postgres: {pg_url.split('@')[-1] if '@' in pg_url else pg_url}")
    print(f"Mode:            {'DRY-RUN (Simulated)' if is_dry_run else 'LIVE MIGRATION (Commits to DB)'}")
    print("=" * 70)

    try:
        sqlite_conn = sqlite3.connect(sqlite_path)
        pg_conn = psycopg2.connect(pg_url)
    except Exception as e:
        print(f"[FATAL] Connection error: {e}")
        sys.exit(1)

    total_migrated = 0
    for table in TABLES_ORDERED:
        try:
            migrated = migrate_table(sqlite_conn, pg_conn, table, dry_run=is_dry_run)
            total_migrated += migrated
        except Exception as e:
            print(f"  [ERROR] Error migrating table '{table}': {e}")
            if not is_dry_run:
                pg_conn.rollback()

    sqlite_conn.close()
    pg_conn.close()

    print("\n" + "=" * 70)
    if is_dry_run:
        print(f"[COMPLETE] Dry run finished. {total_migrated} records verified and ready for migration.")
        print("To apply live migration, pass: --execute")
    else:
        print(f"[SUCCESS] All {total_migrated} financial records successfully migrated to PostgreSQL!")
    print("=" * 70)


if __name__ == "__main__":
    main()
