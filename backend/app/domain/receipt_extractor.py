"""Pure domain receipt extraction and parsing engine (₹0 budget guarantee)."""
import io
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple
import pypdf
import docx
from PIL import Image, ImageOps
import numpy as np

from app.core.config import settings
from app.core.errors import BadRequestException

# Maximum file size: 5 MB
MAX_RECEIPT_FILE_SIZE = 5 * 1024 * 1024

# Category mapping keywords
CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "dining & food": [
        "restaurant", "cafe", "coffee", "bistro", "starbucks", "swiggy", "zomato", "mcdonald",
        "kfc", "burger", "pizza", "biryani", "dining", "bakery", "eatery", "canteen", "kitchen",
        "paneer", "naan", "roti", "dal", "masala", "curry", "thali", "rice", "spice route"
    ],
    "groceries": [
        "grocery", "groceries", "supermarket", "mart", "dmart", "d-mart", "reliance fresh",
        "bigbasket", "blinkit", "zepto", "instamart", "milk", "vegetables", "fruits", "dairy", "provisions"
    ],
    "utilities & bills": [
        "electricity", "power", "water", "gas", "cylinder", "bescom", "tneb", "broadband",
        "wifi", "internet", "airtel", "jio", "vi", "vodafone", "telecom", "utility", "bill"
    ],
    "transportation": [
        "transport", "travel", "uber", "ola", "rapido", "taxi", "cab", "auto", "petrol",
        "fuel", "diesel", "shell", "indian oil", "hpcl", "bpcl", "metro", "toll", "parking"
    ],
    "shopping": [
        "shopping", "retail", "amazon", "flipkart", "myntra", "ajio", "apparel", "clothing",
        "shoes", "store", "electronics", "fashion", "mall", "zara", "h&m"
    ],
    "healthcare": [
        "health", "medical", "pharmacy", "chemist", "apollo", "medplus", "hospital", "clinic",
        "doctor", "lab", "diagnostic", "medicine", "pharma"
    ],
    "entertainment": [
        "entertainment", "movie", "cinema", "pvr", "inox", "cinepolis", "theatre", "netflix",
        "spotify", "prime", "hotstar", "concert", "ticket", "amusement"
    ],
}


def detect_file_type(file_bytes: bytes, filename: str) -> Tuple[str, str]:
    """
    Validate magic bytes and file extension.
    Returns (normalized_extension, mime_type).
    Raises BadRequestException on invalid or unsupported files.
    """
    if len(file_bytes) > MAX_RECEIPT_FILE_SIZE:
        raise BadRequestException(
            message=f"File exceeds maximum allowed size of 5 MB ({len(file_bytes) / (1024*1024):.2f} MB).",
            code="FILE_TOO_LARGE",
        )

    if len(file_bytes) < 4:
        raise BadRequestException(message="Invalid or empty file.", code="INVALID_FILE")

    # PDF
    if file_bytes.startswith(b"%PDF"):
        return ".pdf", "application/pdf"

    # PNG
    if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png", "image/png"

    # JPEG
    if file_bytes.startswith(b"\xff\xd8\xff"):
        return ".jpg", "image/jpeg"

    # WebP: RIFF....WEBP
    if file_bytes[:4] == b"RIFF" and len(file_bytes) >= 12 and file_bytes[8:12] == b"WEBP":
        return ".webp", "image/webp"

    # DOCX: PK\x03\x04 (zip archive) and filename ends with .docx
    if file_bytes.startswith(b"PK\x03\x04") and filename.lower().endswith(".docx"):
        return ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    # Reject unsupported formats
    raise BadRequestException(
        message="Unsupported file format. Please upload a PDF, PNG, JPG, WebP, or DOCX document.",
        code="UNSUPPORTED_FORMAT",
    )


def extract_raw_text(file_bytes: bytes, ext: str) -> Tuple[str, str, List[str]]:
    """
    Extract readable text from PDF, DOCX, or preprocess and OCR image.
    Returns (raw_text, method, warnings).
    """
    warnings: List[str] = []

    if ext == ".pdf":
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            if reader.is_encrypted:
                try:
                    reader.decrypt("")
                except Exception:
                    raise BadRequestException(
                        message="PDF file is encrypted or password-protected.",
                        code="ENCRYPTED_PDF",
                    )

            pages_text = []
            for i, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                pages_text.append(txt)

            full_text = "\n".join(pages_text).strip()
            if not full_text:
                warnings.append("No embedded selectable text found in PDF. Review extracted fields manually.")
            return full_text, "pdf_text", warnings
        except BadRequestException:
            raise
        except Exception as e:
            raise BadRequestException(
                message=f"Could not parse PDF document: {str(e)}",
                code="CORRUPT_PDF",
            )

    elif ext == ".docx":
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            lines = []
            for p in doc.paragraphs:
                if p.text.strip():
                    lines.append(p.text.strip())
            for table in doc.tables:
                for row in table.rows:
                    row_txt = "  ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_txt:
                        lines.append(row_txt)
            full_text = "\n".join(lines).strip()
            if not full_text:
                warnings.append("No text found in DOCX file. Review fields manually.")
            return full_text, "docx_text", warnings
        except Exception as e:
            raise BadRequestException(
                message=f"Could not parse DOCX document: {str(e)}",
                code="CORRUPT_DOCX",
            )

    elif ext in (".png", ".jpg", ".webp"):
        # Image handling: Local RapidOCR engine -> Gemini Vision fallback -> Manual review
        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.verify()
            with Image.open(io.BytesIO(file_bytes)) as img:
                transposed = ImageOps.exif_transpose(img)
                rgb_img = transposed.convert("RGB")
                width, height = rgb_img.size
                if width < 50 or height < 50:
                    warnings.append("Low-resolution image; manual review recommended.")
                # Prevent OOM on memory-constrained servers (e.g. Render 512MB RAM) by bounding max dimension to 2000px
                if max(width, height) > 2000:
                    resample_mode = getattr(getattr(Image, "Resampling", Image), "LANCZOS", Image.LANCZOS)
                    rgb_img.thumbnail((2000, 2000), resample_mode)
                img_array = np.array(rgb_img)
        except Exception as e:
            raise BadRequestException(
                message=f"Corrupt or invalid image file: {str(e)}",
                code="CORRUPT_IMAGE",
            )

        # 1. Attempt RapidOCR (100% free, local ONNX engine)
        try:
            from rapidocr_onnxruntime import RapidOCR
            ocr_engine = RapidOCR()
            result, _ = ocr_engine(img_array)
            if result:
                ocr_lines = [r[1] for r in result if r and len(r) > 1 and r[1].strip()]
                full_text = "\n".join(ocr_lines).strip()
                if full_text:
                    return full_text, "local_ocr_rapid", warnings
        except ImportError:
            pass
        except Exception as ocr_err:
            warnings.append(f"Local OCR engine encountered an error: {str(ocr_err)}")

        # 2. Attempt Hosted Gemini Vision if API key is present
        if getattr(settings, "GEMINI_API_KEY", None):
            try:
                import requests
                import base64
                b64_data = base64.b64encode(file_bytes).decode("utf-8")
                mime = "image/png" if ext == ".png" else ("image/webp" if ext == ".webp" else "image/jpeg")
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": "Extract all text from this receipt image accurately without formatting."},
                            {"inline_data": {"mime_type": mime, "data": b64_data}}
                        ]
                    }]
                }
                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                resp = requests.post(gemini_url, json=payload, timeout=12)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text.strip():
                            return text.strip(), "gemini_vision", warnings
            except Exception as g_err:
                warnings.append(f"Hosted vision fallback error: {str(g_err)}")

        # 3. Honest Fallback to Manual Review
        warnings.append("OCR text extraction was inconclusive. Please review and fill in transaction fields manually.")
        return "", "manual_review", warnings

    return "", "unknown", warnings


def clean_currency_amount(raw_val: str, allow_zero: bool = False) -> Optional[int]:
    """Clean string number into integer paise (e.g. '1,250.50' -> 125050)."""
    cleaned = raw_val.replace(",", "").replace("?", "").replace("₹", "").strip()
    try:
        val = float(cleaned)
        if val < 0 or (val == 0 and not allow_zero):
            return None
        return int(round(val * 100))
    except ValueError:
        return None


def parse_receipt_text(text: str, categories: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Deterministic rule-based parser for receipt text.
    Extracts merchant, date, amount_paise, tax_paise, line items, and category.
    """
    if not text:
        return {
            "merchant": None,
            "date": date.today().isoformat(),
            "amount_paise": None,
            "tax_paise": None,
            "line_items": [],
            "suggested_category_id": categories[0]["id"] if categories else None,
            "suggested_category_name": categories[0]["name"] if categories else None,
            "description": None,
            "confidence_score": 0.0,
        }

    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

    # 1. Total Amount Extraction
    amount_paise: Optional[int] = None
    total_patterns = [
        re.compile(r"(?:grand\s*total|net\s*total|net\s*amount|final\s*amount|bill\s*amount|total\s*amount|amount\s*paid|paid\s*amount|total\s*due)\s*[:\-\=]?\s*(?:₹|inr|rs\.?|rs|\?)?\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE),
        re.compile(r"^total\s*[:\-\=]?\s*(?:₹|inr|rs\.?|rs|\?)?\s*([\d,]+(?:\.\d{1,2})?)$", re.IGNORECASE),
        re.compile(r"(?:^|\s)total[\s\:\=\-\?₹rs\.]*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE),
    ]

    for pat in total_patterns:
        for line in reversed(lines):
            # Guard against order numbers, OTPs, or phone numbers labeled as total
            if any(term in line.lower() for term in ["order", "0rder", "otp", "fssai", "gstin", "phone"]):
                continue
            m = pat.search(line)
            if m:
                paise = clean_currency_amount(m.group(1))
                if paise and paise > 0:
                    amount_paise = paise
                    break
        if amount_paise:
            break

    # Secondary fallback: find the largest reasonable currency amount
    if not amount_paise:
        max_paise = 0
        currency_pat = re.compile(r"(?:₹|inr|rs\.?|rs|\?)\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)
        for line in lines:
            if any(term in line.lower() for term in ["order", "0rder", "otp", "fssai", "phone", "lic"]):
                continue
            matches = currency_pat.findall(line)
            for m in matches:
                paise = clean_currency_amount(m)
                if paise and paise > max_paise:
                    max_paise = paise
        if max_paise > 0:
            amount_paise = max_paise

    # 2. Tax Extraction
    tax_paise: Optional[int] = None
    total_tax_pat = re.compile(r"(?:total\s*tax|tax\s*amount|taxes|tax)\s*[:\-\=]?\s*(?:₹|inr|rs\.?|rs|\?|r)?\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)
    component_tax_pat = re.compile(r"(?:cgst|sgst|igst|vat|gst)\s*(?:\([^)]*\))?\s*[:\-\=]?\s*(?:₹|inr|rs\.?|rs|\?|r)?\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)

    for line in lines:
        m = total_tax_pat.search(line)
        if m:
            p = clean_currency_amount(m.group(1), allow_zero=True)
            if p is not None:
                tax_paise = p
                break

    if tax_paise is None:
        component_sum = 0
        for line in lines:
            m = component_tax_pat.search(line)
            if m:
                p = clean_currency_amount(m.group(1))
                if p:
                    component_sum += p
        if component_sum > 0:
            tax_paise = component_sum

    # 3. Date Extraction
    receipt_date: Optional[str] = None
    month_name_map = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
    }

    date_patterns = [
        # Named month with optional spaces/suffixes: 14thFeb2025 or 14-Feb-2025
        (re.compile(r"\b(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?[\s\-/]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-/]*(20\d{2})\b", re.IGNORECASE), "named"),
        # YYYY-MM-DD
        (re.compile(r"\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b"), "%Y-%m-%d"),
        # DD-MM-YYYY or DD/MM/YYYY
        (re.compile(r"\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b"), "%d-%m-%Y"),
    ]

    for pat, fmt in date_patterns:
        for line in lines:
            m = pat.search(line)
            if m:
                try:
                    if fmt == "named":
                        day = int(m.group(1))
                        m_str = m.group(2)[:3].lower()
                        m_int = month_name_map.get(m_str, 1)
                        year = int(m.group(3))
                        parsed = date(year, m_int, day)
                    elif fmt == "%d-%m-%Y":
                        parsed = datetime.strptime(f"{m.group(1)}-{m.group(2)}-{m.group(3)}", "%d-%m-%Y").date()
                    else:
                        parsed = datetime.strptime(f"{m.group(1)}-{m.group(2)}-{m.group(3)}", "%Y-%m-%d").date()
                    receipt_date = parsed.isoformat()
                    break
                except ValueError:
                    continue
        if receipt_date:
            break

    # 4. Merchant Extraction
    merchant: Optional[str] = None
    platform = None
    text_lower = text.lower()
    if "zomato" in text_lower:
        platform = "Zomato"
    elif "swiggy" in text_lower:
        platform = "Swiggy"

    skip_keywords = [
        "order", "0rder", "fssai", "lic", "paid", "delivery", "name:", "address",
        "otp", "summary", "total", "tax", "invoice", "gstin", "ph:", "phone", "tel:"
    ]

    candidate_lines = []
    for line in lines[:8]:
        low = line.lower()
        if any(re.search(r"\b" + k, low) or k in low for k in skip_keywords):
            continue
        if re.search(r"[A-Za-z]{3,}", line) and len(line) <= 60:
            candidate_lines.append(line.strip())

    if candidate_lines:
        merchant = candidate_lines[0]
        if platform and platform.lower() not in merchant.lower():
            merchant = f"{merchant} ({platform})"
    elif platform:
        merchant = platform

    # 5. Line items extraction
    line_items: List[Dict[str, Any]] = []
    i = 0
    item_header_passed = False

    while i < len(lines):
        line = lines[i]
        low = line.lower()
        if "summary" in low or "items" in low:
            item_header_passed = True
            i += 1
            continue

        # Look ahead for quantity x price line (e.g. '1x285285.00' or '1 x 120 120.00')
        if i + 1 < len(lines):
            next_l = lines[i + 1]
            mq = re.search(r"^(\d+)\s*[xX×]\s*(.+)$", next_l)
            if mq:
                qty = int(mq.group(1))
                rest = mq.group(2).strip()
                # Check for compressed repeated figures like '285285.00'
                m_rep = re.match(r"^(\d+?)(\1(?:\.\d{1,2})?)$", rest)
                if m_rep:
                    tot_paise = clean_currency_amount(m_rep.group(2))
                else:
                    m_dec = re.search(r"([\d,]+(?:\.\d{1,2})?)$", rest)
                    tot_paise = clean_currency_amount(m_dec.group(1)) if m_dec else None

                if tot_paise and line.lower() not in ["total", "subtotal", "tax"]:
                    line_items.append({
                        "name": line,
                        "quantity": qty,
                        "amount_paise": tot_paise,
                    })
                    i += 2
                    continue

        # Surcharges / Delivery / Packaging
        m_fee = re.search(
            r"^(Delivery\s*Fee|Packaging\s*Charges|Restaurant\s*Packaging|Platform\s*Fee)[\s\?₹rs\.\:]*([\d,]+(?:\.\d{1,2})?)$",
            line,
            re.IGNORECASE,
        )
        if m_fee:
            fee_name = m_fee.group(1).strip()
            fee_paise = clean_currency_amount(m_fee.group(2))
            if fee_paise:
                line_items.append({"name": fee_name, "quantity": 1, "amount_paise": fee_paise})
            i += 1
            continue

        # Single line item: Item Name Amount
        m_single = re.search(r"^([A-Za-z0-9\s&'\.\(\)\-]{3,40}?)\s+[\?₹rs\.\s]*([\d,]+(?:\.\d{1,2})?)$", line)
        if m_single:
            it_name = m_single.group(1).strip()
            it_paise = clean_currency_amount(m_single.group(2))
            if it_paise and it_name.lower() not in ["total", "subtotal", "grand total", "net total", "taxes", "tax"]:
                line_items.append({"name": it_name, "quantity": 1, "amount_paise": it_paise})

        i += 1

    # 6. Category Suggestion
    suggested_cat_id: Optional[str] = None
    suggested_cat_name: Optional[str] = None
    if merchant:
        text_lower += f" {merchant.lower()}"

    best_match_count = 0
    cat_map = {c["name"].lower(): c for c in categories}

    for cat_key, keywords in CATEGORY_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > best_match_count:
            best_match_count = count
            for user_cat_name, cat_obj in cat_map.items():
                if cat_key in user_cat_name or user_cat_name in cat_key:
                    suggested_cat_id = cat_obj["id"]
                    suggested_cat_name = cat_obj["name"]
                    break

    if not suggested_cat_id and categories:
        expense_cats = [c for c in categories if c.get("kind") == "expense"]
        target = expense_cats[0] if expense_cats else categories[0]
        suggested_cat_id = target["id"]
        suggested_cat_name = target["name"]

    # 7. Description derivation
    if line_items:
        item_names = [it["name"] for it in line_items if "fee" not in it["name"].lower() and "charge" not in it["name"].lower()][:3]
        if item_names:
            items_str = ", ".join(item_names)
            description = f"{merchant}: {items_str}" if merchant else items_str
        else:
            description = merchant or "Receipt Expense"
    else:
        description = merchant or "Receipt Expense"

    # 8. Confidence Calculation
    score = 0.0
    if amount_paise:
        score += 0.35
    if merchant:
        score += 0.25
    if receipt_date:
        score += 0.25
    if suggested_cat_id and best_match_count > 0:
        score += 0.15

    return {
        "merchant": merchant,
        "date": receipt_date or date.today().isoformat(),
        "amount_paise": amount_paise,
        "tax_paise": tax_paise,
        "line_items": line_items,
        "suggested_category_id": suggested_cat_id,
        "suggested_category_name": suggested_cat_name,
        "description": description,
        "confidence_score": round(score, 2),
    }
