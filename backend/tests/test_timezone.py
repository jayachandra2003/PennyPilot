"""Unit tests for Asia/Kolkata timezone and calendar boundaries."""
from datetime import date, datetime
from zoneinfo import ZoneInfo
from app.domain.timezone import IST, get_month_boundaries, to_ist_datetime


def test_ist_timezone_offset():
    # IST is UTC+5:30 (19800 seconds offset)
    dt = datetime(2026, 11, 5, 23, 30, tzinfo=IST)
    assert dt.utcoffset().total_seconds() == 19800


def test_month_boundaries_standard_months():
    # November has 30 days
    start, end, days = get_month_boundaries(2026, 11)
    assert start == date(2026, 11, 1)
    assert end == date(2026, 11, 30)
    assert days == 30

    # December has 31 days
    start, end, days = get_month_boundaries(2026, 12)
    assert start == date(2026, 12, 1)
    assert end == date(2026, 12, 31)
    assert days == 31


def test_february_leap_and_non_leap_years():
    # 2024 is a leap year (29 days)
    _, _, days_2024 = get_month_boundaries(2024, 2)
    assert days_2024 == 29

    # 2025 and 2026 are non-leap years (28 days)
    _, _, days_2026 = get_month_boundaries(2026, 2)
    assert days_2026 == 28


def test_to_ist_conversion():
    utc = ZoneInfo("UTC")
    # 18:30 UTC on Nov 5th is 00:00 IST on Nov 6th!
    dt_utc = datetime(2026, 11, 5, 18, 30, tzinfo=utc)
    dt_ist = to_ist_datetime(dt_utc)

    assert dt_ist.tzinfo == IST
    assert dt_ist.day == 6
    assert dt_ist.hour == 0
    assert dt_ist.minute == 0
