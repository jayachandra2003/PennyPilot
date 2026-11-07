from logging.config import fileConfig
import sqlalchemy as sa
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.config import settings
from app.db.base import Base
import app.models  # Ensure all models are registered

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Override URL with environment settings (prefer explicit DATABASE_URL env var if set)
db_url = os.environ.get("DATABASE_URL") or settings.DATABASE_URL
if db_url.startswith("sqlite:///"):
    from sqlalchemy.engine.url import make_url
    from pathlib import Path
    parsed_sqlite = make_url(db_url)
    if parsed_sqlite.database and parsed_sqlite.database != ":memory:":
        Path(parsed_sqlite.database).parent.mkdir(parents=True, exist_ok=True)

config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # Essential for SQLite column alterations
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        is_sqlite = connection.dialect.name == "sqlite"

        if is_sqlite:
            # 1. Disable foreign keys via raw DBAPI connection BEFORE starting the migration transaction
            raw_cursor = connection.connection.dbapi_connection.cursor()
            raw_cursor.execute("PRAGMA foreign_keys = OFF")
            raw_cursor.close()

        try:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                render_as_batch=True,  # SQLite compatibility
            )

            with context.begin_transaction():
                context.run_migrations()

            # 2. Re-enable foreign keys and verify integrity post-migration on SQLite
            if is_sqlite:
                raw_cursor = connection.connection.dbapi_connection.cursor()
                raw_cursor.execute("PRAGMA foreign_keys = ON")
                fk_errors = raw_cursor.execute("PRAGMA foreign_key_check").fetchall()
                raw_cursor.close()
                if fk_errors:
                    raise RuntimeError(
                        f"SQLite foreign key constraint violation detected after migration: {fk_errors}"
                    )
        finally:
            if is_sqlite:
                # 3. Guaranteed restoration of foreign keys on connection cleanup (success or failure)
                raw_cursor = connection.connection.dbapi_connection.cursor()
                raw_cursor.execute("PRAGMA foreign_keys = ON")
                raw_cursor.close()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
