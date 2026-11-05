"""Deterministic rule-based natural language parser for Indian financial expenses.

Stage 1: Pure Python deterministic rule parser.
- Handles Indian currency formats (₹, Rs, Rs., INR, "k" thousands).
- Handles relative dates ("today", "yesterday", day-of-week).
- Handles multi-item input splitting ("and", ",", ";", "\n").
- Handles keyword-to-category mapping for common Indian expenses.
- Computes confidence scores and flags low-confidence items for review.
"""
import re
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple
from app.domain.currency import rupees_to_paise
from app.domain.timezone import today_ist

# Keyword dictionary mapping to standard category names
CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "Groceries": [
        "milk", "curd", "paneer", "bread", "eggs", "vegetables", "veggies", "fruits",
        "grocery", "groceries", "dmart", "blinkit", "zepto", "instamart", "bigbasket",
        "supermarket", "atta", "rice", "dal", "oil", "ration", "kirana", "provisions"
    ],
    "Dining & Food": [
        "swiggy", "zomato", "chai", "tea", "coffee", "breakfast", "lunch", "dinner",
        "thali", "biryani", "burger", "pizza", "starbucks", "cafe", "restaurant",
        "snacks", "samosa", "dosa", "idli", "mcdonalds", "kfc", "dominos", "toit",
        "bar", "pub", "brewery", "eating out"
    ],
    "Transportation": [
        "auto", "cab", "uber", "ola", "rapido", "metro", "bus", "train", "flight",
        "petrol", "diesel", "fuel", "cng", "toll", "parking", "fare", "ticket"
    ],
    "Housing & Rent": [
        "rent", "maintenance", "flat rent", "house rent", "society maintenance",
        "maid", "cook", "ironing", "laundry"
    ],
    "Utilities & Bills": [
        "electricity", "power bill", "wifi", "internet", "broadband", "mobile recharge",
        "dth", "water bill", "gas cylinder", "lpg", "bill payment", "jio", "airtel"
    ],
    "Healthcare": [
        "medicine", "pharmacy", "medical", "doctor", "clinic", "hospital", "chemist",
        "apollo", "1mg", "pharmeasy", "test", "dentist", "consultation"
    ],
    "Entertainment": [
        "movie", "cinema", "theatre", "bookmyshow", "netflix", "prime", "hotstar",
        "spotify", "concert", "event", "gaming", "steam"
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "clothes", "shoes", "apparel", "zara",
        "h&m", "electronics", "gadget", "mall", "shopping"
    ],
    "Salary": [
        "salary", "stipend", "bonus", "payroll", "credited"
    ],
    "Freelance / Other": [
        "freelance", "consulting", "gig", "contract", "upwork", "client payment"
    ],
}

# Regex to detect currency and numeric values
# Handles: "₹120", "120 rs", "Rs. 450", "1.5k", "2k", "120.50", "50000"
AMOUNT_PATTERN = re.compile(
    r'(?:(?:₹|rs\.?|inr)\s*)?([0-9]+(?:\.[0-9]{1,2})?)\s*(k|thousand|lakh)?\s*(?:rs\.?|inr|rupees)?',
    re.IGNORECASE,
)

DATE_KEYWORDS = {
    "today": 0,
    "tonight": 0,
    "this morning": 0,
    "yesterday": -1,
    "last night": -1,
    "day before yesterday": -2,
}

WEEKDAYS = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


def _split_clauses(text: str) -> List[str]:
    """Split input text into individual candidate transaction phrases."""
    # Split on newlines, semicolons
    raw_chunks = re.split(r'[\n;]+', text)
    clauses: List[str] = []

    for chunk in raw_chunks:
        chunk = chunk.strip()
        if not chunk:
            continue
        # Split on commas or " and " only if both sides have amounts or substantial text
        sub_chunks = re.split(r'(?:,\s*|\s+and\s+)', chunk, flags=re.IGNORECASE)
        # Re-merge if a subchunk does not look like a transaction (no numbers)
        current = ""
        for sc in sub_chunks:
            sc = sc.strip()
            if not sc:
                continue
            if re.search(r'\d', sc):
                if current:
                    clauses.append(current)
                current = sc
            else:
                if current:
                    current += " " + sc
                else:
                    current = sc
        if current:
            clauses.append(current)

    return clauses if clauses else [text.strip()]


def _extract_date(clause: str, reference_date: date) -> Tuple[date, str]:
    """Extract relative or explicit date from clause and return (extracted_date, cleaned_clause)."""
    cleaned = clause.lower()

    # Check relative date keywords
    for kw, offset in sorted(DATE_KEYWORDS.items(), key=lambda x: -len(x[0])):
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, cleaned):
            target_date = reference_date + timedelta(days=offset)
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip()
            return target_date, cleaned

    # Check weekday references (e.g. "on monday", "last friday")
    for day_name, day_idx in WEEKDAYS.items():
        pattern = r'\b(?:last\s+|on\s+)?' + day_name + r'\b'
        if re.search(pattern, cleaned):
            current_day_idx = reference_date.weekday()
            days_ago = (current_day_idx - day_idx) % 7
            if days_ago == 0:
                days_ago = 7  # Assume previous week if today is same weekday
            target_date = reference_date - timedelta(days=days_ago)
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip()
            return target_date, cleaned

    return reference_date, clause


def _extract_amount(clause: str) -> Tuple[Optional[int], str]:
    """
    Extract amount in integer paise and return (amount_paise, cleaned_clause).
    Example: '₹120 milk' -> (12000, 'milk'), '1.5k shopping' -> (150000, 'shopping')
    """
    matches = list(AMOUNT_PATTERN.finditer(clause))
    # Filter matches that actually have digits
    valid_matches = [m for m in matches if m.group(1)]
    if not valid_matches:
        return None, clause

    # Take the first prominent numeric match
    best_match = valid_matches[0]
    num_str = best_match.group(1)
    multiplier_str = (best_match.group(2) or "").lower()

    try:
        val = float(num_str)
        if multiplier_str == "k" or multiplier_str == "thousand":
            val *= 1000
        elif multiplier_str == "lakh":
            val *= 100000

        paise = rupees_to_paise(val)
        # Remove matched amount from clause text
        start, end = best_match.span()
        cleaned = (clause[:start] + " " + clause[end:]).strip()
        cleaned = re.sub(r'\s+', ' ', cleaned)
        return paise, cleaned
    except Exception:
        return None, clause


def _match_category(description: str, categories: List[Dict[str, Any]]) -> Tuple[Optional[str], Optional[str], float]:
    """
    Match description against user's categories or default keyword dictionary.
    Returns (category_id, category_name, confidence).
    """
    desc_lower = description.lower()
    cat_by_name = {c["name"].lower(): c for c in categories}

    # 1. Exact or keyword match from dictionary
    for cat_name, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', desc_lower):
                # Find matching user category by name
                user_cat = cat_by_name.get(cat_name.lower())
                if user_cat:
                    return user_cat["id"], user_cat["name"], 0.95
                return None, cat_name, 0.85

    # 2. Substring matching against user categories
    for cat in categories:
        c_name = cat["name"].lower()
        if c_name in desc_lower or desc_lower in c_name:
            return cat["id"], cat["name"], 0.80

    # 3. Default fallback category
    default_cat = cat_by_name.get("other expenses") or cat_by_name.get("uncategorized")
    if default_cat:
        return default_cat["id"], default_cat["name"], 0.50

    if categories:
        return categories[0]["id"], categories[0]["name"], 0.40

    return None, "Uncategorized", 0.30


def parse_expense_phrase(
    text: str,
    user_categories: List[Dict[str, Any]],
    reference_date: Optional[date] = None,
) -> List[Dict[str, Any]]:
    """
    Deterministic rule-based parser for Indian expense text.
    Returns a list of parsed transaction drafts with confidence scores.
    """
    ref_date = reference_date or today_ist()
    clauses = _split_clauses(text)
    drafts: List[Dict[str, Any]] = []

    for clause in clauses:
        clause_clean = clause.strip()
        if not clause_clean:
            continue

        # 1. Extract Date
        tx_date, without_date = _extract_date(clause_clean, ref_date)

        # 2. Extract Amount
        amount_paise, without_amount = _extract_amount(without_date)
        if not amount_paise or amount_paise <= 0:
            continue

        # 3. Clean Description
        desc = without_amount.strip(" ,.-#₹@")
        if not desc:
            desc = "Expense"
        else:
            # Capitalize first letter of description
            desc = desc[0].upper() + desc[1:]

        # 4. Match Category
        cat_id, cat_name, cat_conf = _match_category(desc, user_categories)

        # 5. Determine Kind (Income vs Expense)
        kind = "expense"
        desc_lower = desc.lower()
        if any(w in desc_lower for w in ["salary", "stipend", "bonus", "freelance income", "dividend"]):
            kind = "income"

        # Calculate overall confidence
        confidence = round(cat_conf, 2)
        needs_review = confidence < 0.70

        drafts.append({
            "amount_paise": amount_paise,
            "occurred_on": tx_date.isoformat(),
            "description": desc,
            "category_id": cat_id,
            "category_name": cat_name,
            "kind": kind,
            "source": "nl",
            "nl_original_text": clause_clean,
            "confidence": confidence,
            "needs_review": needs_review,
        })

    return drafts
