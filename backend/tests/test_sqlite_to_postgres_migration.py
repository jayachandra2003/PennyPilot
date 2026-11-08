"""
Strengthened unit and regression tests for SQLite to PostgreSQL migration utility.
Verifies:
1. Strict integer-to-boolean conversions for all 7 Boolean columns across all 4 tables.
2. Rejection of invalid boolean strings and invalid numeric values (never converts silently).
3. 100% preservation of integer paise values and rejection of floating-point contamination.
4. Preservation of UUID strings, ISO timestamps, and NULL values.
5. Topological table dependency ordering for foreign key constraints.
"""
import pytest
import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from scripts.migrate_sqlite_to_postgres import (
    BOOLEAN_COLUMNS,
    clean_value_for_postgres,
    TABLES_ORDERED,
)


def test_boolean_columns_specification():
    """Verify all expected boolean columns are mapped across the 4 affected tables."""
    assert "users" in BOOLEAN_COLUMNS
    assert "categories" in BOOLEAN_COLUMNS
    assert "recurring_transactions" in BOOLEAN_COLUMNS
    assert "notifications" in BOOLEAN_COLUMNS

    assert BOOLEAN_COLUMNS["users"] == {"is_active", "email_verified", "onboarding_completed", "tutorial_completed"}
    assert BOOLEAN_COLUMNS["categories"] == {"is_archived"}
    assert BOOLEAN_COLUMNS["recurring_transactions"] == {"is_active"}
    assert BOOLEAN_COLUMNS["notifications"] == {"is_read"}


@pytest.mark.parametrize("table,col", [
    ("users", "is_active"),
    ("users", "email_verified"),
    ("users", "onboarding_completed"),
    ("users", "tutorial_completed"),
    ("categories", "is_archived"),
    ("recurring_transactions", "is_active"),
    ("notifications", "is_read"),
])
def test_valid_boolean_conversions(table, col):
    """Verify that integer 1, 0, string '1', '0', 'yes', 'no', 't', 'f', and booleans correctly convert to Python bool."""
    # Integers
    assert clean_value_for_postgres(table, col, 1) is True
    assert clean_value_for_postgres(table, col, 0) is False

    # Strings: Truthy
    assert clean_value_for_postgres(table, col, "1") is True
    assert clean_value_for_postgres(table, col, "true") is True
    assert clean_value_for_postgres(table, col, "True") is True
    assert clean_value_for_postgres(table, col, "t") is True
    assert clean_value_for_postgres(table, col, "yes") is True

    # Strings: Falsy
    assert clean_value_for_postgres(table, col, "0") is False
    assert clean_value_for_postgres(table, col, "false") is False
    assert clean_value_for_postgres(table, col, "False") is False
    assert clean_value_for_postgres(table, col, "f") is False
    assert clean_value_for_postgres(table, col, "no") is False

    # Native Python booleans
    assert clean_value_for_postgres(table, col, True) is True
    assert clean_value_for_postgres(table, col, False) is False

    # NULL / None preserved
    assert clean_value_for_postgres(table, col, None) is None


@pytest.mark.parametrize("table,col", [
    ("users", "is_active"),
    ("users", "email_verified"),
    ("categories", "is_archived"),
    ("notifications", "is_read"),
])
def test_invalid_boolean_rejection(table, col):
    """Verify that invalid boolean representations are rejected with ValueError rather than silently mapped to False."""
    with pytest.raises(ValueError, match="cannot map to boolean"):
        clean_value_for_postgres(table, col, "invalid_string")

    with pytest.raises(ValueError, match="cannot map to boolean"):
        clean_value_for_postgres(table, col, "maybe")

    with pytest.raises(ValueError, match="cannot map to boolean"):
        clean_value_for_postgres(table, col, "unknown")

    # Invalid integer boolean values (e.g. 2, -1, 100)
    with pytest.raises(ValueError, match="expected 0 or 1"):
        clean_value_for_postgres(table, col, 2)

    with pytest.raises(ValueError, match="expected 0 or 1"):
        clean_value_for_postgres(table, col, -1)


@pytest.mark.parametrize("table,col,paise_val", [
    ("transactions", "amount_paise", 186440),
    ("transactions", "amount_paise", 0),
    ("budgets", "limit_paise", 500000),
    ("recurring_transactions", "amount_paise", 29900),
    ("financial_goals", "target_paise", 10000000),
    ("financial_goals", "saved_paise", 2500000),
    ("users", "monthly_savings_target_paise", 1500000),
])
def test_integer_paise_preservation_and_float_rejection(table, col, paise_val):
    """Verify integer paise values are preserved as int and floating-point values are rejected."""
    cleaned = clean_value_for_postgres(table, col, paise_val)
    assert isinstance(cleaned, int)
    assert cleaned == paise_val

    # Edge cases: 0 and 1 must remain int, NOT bool!
    assert clean_value_for_postgres(table, col, 1) == 1
    assert type(clean_value_for_postgres(table, col, 1)) is int
    assert clean_value_for_postgres(table, col, 0) == 0
    assert type(clean_value_for_postgres(table, col, 0)) is int

    # Floating point rejection
    with pytest.raises(ValueError, match="Floating-point monetary value"):
        clean_value_for_postgres(table, col, 1864.40)


def test_uuid_and_timestamp_preservation():
    """Verify UUID primary keys, foreign keys, and ISO timestamps remain unchanged."""
    test_uuid = "515638d8-4430-4c18-8dfd-240ee5654570"
    test_ts = "2026-11-08 12:10:30.604668"

    assert clean_value_for_postgres("users", "id", test_uuid) == test_uuid
    assert clean_value_for_postgres("transactions", "user_id", test_uuid) == test_uuid
    assert clean_value_for_postgres("budgets", "category_id", test_uuid) == test_uuid
    assert clean_value_for_postgres("users", "created_at", test_ts) == test_ts
    assert clean_value_for_postgres("transactions", "occurred_on", "2026-11-08") == "2026-11-08"


def test_table_dependency_ordering():
    """Verify parent tables precede child tables in TABLES_ORDERED."""
    user_idx = TABLES_ORDERED.index("users")
    cat_idx = TABLES_ORDERED.index("categories")
    budget_idx = TABLES_ORDERED.index("budgets")
    tx_idx = TABLES_ORDERED.index("transactions")
    recurring_idx = TABLES_ORDERED.index("recurring_transactions")
    oauth_idx = TABLES_ORDERED.index("oauth_accounts")

    assert user_idx < cat_idx
    assert user_idx < budget_idx
    assert user_idx < tx_idx
    assert user_idx < recurring_idx
    assert user_idx < oauth_idx
    assert cat_idx < budget_idx
    assert cat_idx < tx_idx
    assert cat_idx < recurring_idx
