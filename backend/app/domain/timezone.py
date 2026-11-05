"""Asia/Kolkata timezone and month boundary calculations."""
from calendar import monthrange
from datetime import date, datetime, time
from typing import Tuple
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    """Get current datetime localized to Asia/Kolkata."""
    return datetime.now(IST)


def today_ist() -> date:
    """Get today's date in Asia/Kolkata timezone."""
    return now_ist().date()


def get_month_boundaries(year: int, month: int) -> Tuple[date, date, int]:
    """
    Get (first_day, last_day, total_days) for a given month.
    Example: (2026, 2) -> (date(2026, 2, 1), date(2026, 2, 28), 28)
    """
    _, total_days = monthrange(year, month)
    first_day = date(year, month, 1)
    last_day = date(year, month, total_days)
    return first_day, last_day, total_days


def get_month_range_for_date(d: date) -> Tuple[date, date, int]:
    """Get month boundaries for a specific date."""
    return get_month_boundaries(d.year, d.month)


def to_ist_datetime(dt: datetime) -> datetime:
    """Convert an arbitrary datetime to Asia/Kolkata timezone."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=IST)
    return dt.astimezone(IST)
