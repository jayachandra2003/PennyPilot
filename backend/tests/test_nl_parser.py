"""Unit tests for deterministic natural language expense parser."""
from datetime import date, timedelta
from app.domain.nl_parser import parse_expense_phrase

MOCK_CATEGORIES = [
    {"id": "cat-groceries", "name": "Groceries", "kind": "expense"},
    {"id": "cat-dining", "name": "Dining & Food", "kind": "expense"},
    {"id": "cat-transport", "name": "Transportation", "kind": "expense"},
    {"id": "cat-housing", "name": "Housing & Rent", "kind": "expense"},
    {"id": "cat-utilities", "name": "Utilities & Bills", "kind": "expense"},
    {"id": "cat-shopping", "name": "Shopping", "kind": "expense"},
    {"id": "cat-salary", "name": "Salary", "kind": "income"},
    {"id": "cat-other", "name": "Other Expenses", "kind": "expense"},
]


def test_single_item_parsing():
    ref = date(2026, 11, 5)
    drafts = parse_expense_phrase("coffee 150", MOCK_CATEGORIES, reference_date=ref)
    assert len(drafts) == 1
    d = drafts[0]
    assert d["amount_paise"] == 15000  # ₹150
    assert d["category_name"] == "Dining & Food"
    assert d["occurred_on"] == "2026-11-05"
    assert d["needs_review"] is False


def test_rupee_symbol_and_k_multiplier():
    ref = date(2026, 11, 5)
    drafts = parse_expense_phrase("₹120 milk", MOCK_CATEGORIES, reference_date=ref)
    assert len(drafts) == 1
    assert drafts[0]["amount_paise"] == 12000
    assert drafts[0]["category_name"] == "Groceries"

    drafts_k = parse_expense_phrase("1.5k shopping at Zara", MOCK_CATEGORIES, reference_date=ref)
    assert len(drafts_k) == 1
    assert drafts_k[0]["amount_paise"] == 150000  # ₹1,500
    assert drafts_k[0]["category_name"] == "Shopping"


def test_multi_item_and_relative_dates():
    ref = date(2026, 11, 5)
    # The signature phrase from NIVUNA blueprint!
    text = "₹120 milk and ₹450 groceries today, auto 80 yesterday"
    drafts = parse_expense_phrase(text, MOCK_CATEGORIES, reference_date=ref)
    assert len(drafts) == 3

    # Draft 1: milk
    assert drafts[0]["amount_paise"] == 12000
    assert drafts[0]["category_name"] == "Groceries"
    assert drafts[0]["occurred_on"] == "2026-11-05"

    # Draft 2: groceries
    assert drafts[1]["amount_paise"] == 45000
    assert drafts[1]["category_name"] == "Groceries"
    assert drafts[1]["occurred_on"] == "2026-11-05"

    # Draft 3: auto 80 yesterday
    yesterday = (ref - timedelta(days=1)).isoformat()
    assert drafts[2]["amount_paise"] == 8000
    assert drafts[2]["category_name"] == "Transportation"
    assert drafts[2]["occurred_on"] == yesterday


def test_rs_and_utilities_parsing():
    ref = date(2026, 11, 5)
    drafts = parse_expense_phrase("Rs 2500 wifi bill", MOCK_CATEGORIES, reference_date=ref)
    assert len(drafts) == 1
    assert drafts[0]["amount_paise"] == 250000
    assert drafts[0]["category_name"] == "Utilities & Bills"


def test_low_confidence_flagged():
    ref = date(2026, 11, 5)
    drafts = parse_expense_phrase("500 random xyz thing", MOCK_CATEGORIES, reference_date=ref)
    assert len(drafts) == 1
    assert drafts[0]["amount_paise"] == 50000
    assert drafts[0]["needs_review"] is True  # Ambiguous category
