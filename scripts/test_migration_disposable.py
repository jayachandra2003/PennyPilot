import os
import shutil
import sqlite3
from pathlib import Path
from alembic.config import Config
from alembic import command

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
CANONICAL_DB = PROJECT_ROOT / "penny_pilot.db"
DISPOSABLE_DB = PROJECT_ROOT / "scratch" / "test_migration_disposable.db"
os.makedirs(PROJECT_ROOT / "scratch", exist_ok=True)

def test_migration():
    if DISPOSABLE_DB.exists():
        DISPOSABLE_DB.unlink()

    # Backup canonical DB to disposable DB
    src = sqlite3.connect(CANONICAL_DB)
    dst = sqlite3.connect(DISPOSABLE_DB)
    src.backup(dst)
    src.close()
    dst.close()

    print(f"Created disposable test database at {DISPOSABLE_DB}")

    # Set up Alembic config
    os.environ["DATABASE_URL"] = f"sqlite:///{DISPOSABLE_DB.as_posix()}"
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{DISPOSABLE_DB.as_posix()}")
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))

    print("Checking current revision on disposable DB...")
    conn = sqlite3.connect(DISPOSABLE_DB)
    cur = conn.cursor()
    rev = cur.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    print(f"Initial revision: {rev}")
    users_count = cur.execute("SELECT count(*) FROM users").fetchone()[0]
    print(f"Users count before upgrade: {users_count}")
    conn.close()

    print("Running alembic upgrade head on disposable DB...")
    command.upgrade(cfg, "head")

    conn = sqlite3.connect(DISPOSABLE_DB)
    cur = conn.cursor()
    new_rev = cur.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    print(f"New revision after upgrade: {new_rev}")

    cols = [col[1] for col in cur.execute("PRAGMA table_info(users)").fetchall()]
    print(f"Users table columns: {cols}")
    assert "onboarding_completed" in cols, "onboarding_completed column missing!"
    assert "monthly_savings_target_paise" in cols, "monthly_savings_target_paise column missing!"

    # Verify all existing users have onboarding_completed = 1
    onboarded_count = cur.execute("SELECT count(*) FROM users WHERE onboarding_completed = 1").fetchone()[0]
    print(f"Existing users with onboarding_completed = 1: {onboarded_count}/{users_count}")
    assert onboarded_count == users_count, "Existing users must have onboarding_completed = 1!"

    # Check foreign keys
    fk_errors = cur.execute("PRAGMA foreign_key_check").fetchall()
    print(f"Foreign key violations: {len(fk_errors)}")
    assert len(fk_errors) == 0, f"FK errors detected: {fk_errors}"

    # Test downgrade
    print("Testing downgrade...")
    command.downgrade(cfg, "9b8c7d6e5f4a")
    down_rev = cur.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    print(f"Revision after downgrade: {down_rev}")
    assert down_rev == "9b8c7d6e5f4a"

    # Test re-upgrade
    print("Testing re-upgrade to head...")
    command.upgrade(cfg, "head")
    re_rev = cur.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    print(f"Revision after re-upgrade: {re_rev}")
    assert re_rev == new_rev

    conn.close()
    print("Disposable migration test PASSED 100%!")

if __name__ == "__main__":
    test_migration()
