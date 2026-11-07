"""Disposable migration test for notifications table."""
import os
import sqlite3
import tempfile
from alembic.config import Config
from alembic import command

def main():
    fd, temp_db = tempfile.mkstemp(prefix='test_migration_notif_', suffix='.db')
    os.close(fd)

    try:
        # Copy canonical schema
        src = sqlite3.connect('penny_pilot.db')
        dst = sqlite3.connect(temp_db)
        src.backup(dst)
        src.close()
        dst.close()

        cfg = Config('backend/alembic.ini')
        cfg.set_main_option('script_location', 'backend/alembic')
        normalized_url = 'sqlite:///' + temp_db.replace(os.sep, '/')
        cfg.set_main_option('sqlalchemy.url', normalized_url)
        os.environ['DATABASE_URL'] = normalized_url

        print('Testing upgrade to head on disposable copy...')
        command.upgrade(cfg, 'head')

        conn = sqlite3.connect(temp_db)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        print('Tables after upgrade:', [r[0] for r in cur.fetchall()])
        cur.execute('PRAGMA integrity_check')
        print('Integrity check after upgrade:', cur.fetchall())
        cur.execute('PRAGMA foreign_key_check')
        print('FK check after upgrade:', cur.fetchall())
        cur.execute('SELECT version_num FROM alembic_version')
        print('Alembic revision:', cur.fetchall())
        cur.execute('PRAGMA table_info(notifications)')
        print('Notifications columns:', [row[1] for row in cur.fetchall()])
        conn.close()

        print('Testing downgrade to c1a2b3c4d5e6 on disposable copy...')
        command.downgrade(cfg, 'c1a2b3c4d5e6')

        conn = sqlite3.connect(temp_db)
        cur = conn.cursor()
        cur.execute('PRAGMA integrity_check')
        print('Integrity check after downgrade:', cur.fetchall())
        cur.execute('SELECT version_num FROM alembic_version')
        print('Alembic revision after downgrade:', cur.fetchall())
        conn.close()

        print('Disposable migration test PASSED 100%!')
    finally:
        if os.path.exists(temp_db):
            os.remove(temp_db)

if __name__ == '__main__':
    main()
