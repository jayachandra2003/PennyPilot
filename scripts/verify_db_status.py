import sys
import os
import sqlite3

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath('backend'))
from app.core.config import settings

print("=== CANONICAL DATABASE VERIFICATION ===")
print("settings.DATABASE_URL:", settings.DATABASE_URL)

# Extract real file path
db_path = settings.DATABASE_URL.replace("sqlite:///", "")
if not os.path.isabs(db_path):
    db_path = os.path.abspath(db_path)

print("Resolved absolute DB file:", db_path)
print("File exists on disk:", os.path.exists(db_path))
if os.path.exists(db_path):
    print("File size (bytes):", os.path.getsize(db_path))

con = sqlite3.connect(db_path)
cur = con.cursor()

# 1. Integrity check
integrity = cur.execute("PRAGMA integrity_check").fetchall()
print("PRAGMA integrity_check:", integrity)

# 2. Foreign key check
fk_check = cur.execute("PRAGMA foreign_key_check").fetchall()
print("PRAGMA foreign_key_check (empty means 0 violations):", fk_check)

# 3. Alembic revision
rev = cur.execute("SELECT version_num FROM alembic_version").fetchone()
print("Alembic current revision in DB:", rev[0] if rev else None)

# 4. Tables and counts
tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
print(f"Total tables: {len(tables)}")
for t in sorted(tables):
    cnt = cur.execute(f'SELECT COUNT(1) FROM "{t}"').fetchone()[0]
    print(f"  - {t}: {cnt} rows")

con.close()
