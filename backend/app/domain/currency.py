"""Pure deterministic currency conversion and Indian Rupee (INR) formatting."""
from decimal import Decimal, ROUND_HALF_UP
from typing import Union


def rupees_to_paise(amount_rupees: Union[float, int, str, Decimal]) -> int:
    """
    Convert an amount in Rupees to integer paise.
    Uses Decimal with ROUND_HALF_UP to avoid IEEE 754 floating-point inaccuracies.
    Example: 120.45 -> 12045, "120.50" -> 12050, 100 -> 10000.
    """
    if isinstance(amount_rupees, (float, int)):
        dec = Decimal(str(amount_rupees))
    elif isinstance(amount_rupees, str):
        cleaned = amount_rupees.replace(",", "").replace("₹", "").replace("Rs.", "").replace("Rs", "").strip()
        dec = Decimal(cleaned)
    elif isinstance(amount_rupees, Decimal):
        dec = amount_rupees
    else:
        raise ValueError(f"Unsupported amount type for currency conversion: {type(amount_rupees)}")

    paise = int((dec * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return paise


def paise_to_rupees(paise: int) -> float:
    """Convert integer paise back to float Rupees for display purposes."""
    return round(paise / 100.0, 2)


def format_inr(paise: int, include_symbol: bool = True, show_paise: bool = True) -> str:
    """
    Format integer paise according to the standard Indian numbering system (Lakhs, Crores).
    Examples:
        paise=123456789 -> "₹12,34,567.89"
        paise=50000 -> "₹500.00" (or "₹500" if show_paise=False)
        paise=-150000 -> "-₹1,500.00"
    """
    is_negative = paise < 0
    abs_paise = abs(paise)

    rupees_part = abs_paise // 100
    paise_part = abs_paise % 100

    s = str(rupees_part)
    if len(s) <= 3:
        formatted_rupees = s
    else:
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        formatted_rupees = ",".join(groups) + "," + last3

    if show_paise:
        result = f"{formatted_rupees}.{paise_part:02d}"
    else:
        result = formatted_rupees

    prefix = ""
    if is_negative:
        prefix = "-"
    if include_symbol:
        prefix += "₹"

    return prefix + result
