"""Unit tests for currency conversion and Indian Rupee (INR) formatting."""
import pytest
from app.domain.currency import format_inr, paise_to_rupees, rupees_to_paise


def test_rupees_to_paise_conversions():
    assert rupees_to_paise(100) == 10000
    assert rupees_to_paise(0) == 0
    assert rupees_to_paise(0.01) == 1
    assert rupees_to_paise(120.45) == 12045
    assert rupees_to_paise("120.50") == 12050
    assert rupees_to_paise("₹1,24,500.75") == 12450075
    assert rupees_to_paise("Rs. 500") == 50000
    assert rupees_to_paise("Rs 2500.5") == 250050


def test_paise_to_rupees_conversions():
    assert paise_to_rupees(10000) == 100.0
    assert paise_to_rupees(12045) == 120.45
    assert paise_to_rupees(0) == 0.0
    assert paise_to_rupees(50) == 0.5


def test_inr_formatting_standard_amounts():
    # Hundreds
    assert format_inr(50000) == "₹500.00"
    assert format_inr(50000, show_paise=False) == "₹500"

    # Thousands
    assert format_inr(150000) == "₹1,500.00"

    # Tens of thousands
    assert format_inr(2500000) == "₹25,000.00"

    # Lakhs (Indian grouping: 1,00,000)
    assert format_inr(10000000) == "₹1,00,000.00"
    assert format_inr(123456789) == "₹12,34,567.89"

    # Crores (1,00,00,000)
    assert format_inr(1000000000) == "₹1,00,00,000.00"


def test_inr_formatting_negative_and_zero():
    assert format_inr(0) == "₹0.00"
    assert format_inr(-150000) == "-₹1,500.00"
    assert format_inr(-50000, include_symbol=False) == "-500.00"


def test_invalid_currency_inputs():
    with pytest.raises(Exception):
        rupees_to_paise("not-a-number")
