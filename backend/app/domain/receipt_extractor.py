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
                reconstructed = reconstruct_spatial_lines(result)
                full_text = "\n".join(reconstructed).strip()
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


def reconstruct_spatial_lines(ocr_results: List[Any]) -> List[str]:
    """
    Spatially reconstruct text lines from 2D OCR bounding boxes.
    RapidOCR returns boxes in raw scan order. This algorithm clusters boxes into
    horizontal text rows by vertical bounding box overlap and sorts left-to-right,
    preserving multi-column tabular data (Item | Qty | Rate | Amount).
    """
    if not ocr_results:
        return []

    items = []
    for r in ocr_results:
        if not r or len(r) < 2 or not str(r[1]).strip():
            continue
        pts = r[0]
        try:
            ymin = min(pt[1] for pt in pts)
            ymax = max(pt[1] for pt in pts)
            xmin = min(pt[0] for pt in pts)
            xmax = max(pt[0] for pt in pts)
        except Exception:
            continue
        ycenter = (ymin + ymax) / 2.0
        h = max(ymax - ymin, 1.0)
        items.append({
            "text": str(r[1]).strip(),
            "ymin": ymin,
            "ymax": ymax,
            "xmin": xmin,
            "xmax": xmax,
            "ycenter": ycenter,
            "height": h,
        })

    if not items:
        return []

    # Sort items top-to-bottom initially
    items.sort(key=lambda x: x["ycenter"])

    # Cluster into horizontal rows
    lines: List[List[Dict[str, Any]]] = []
    for item in items:
        placed = False
        for line in lines:
            line_avg_h = sum(it["height"] for it in line) / len(line)
            line_avg_yc = sum(it["ycenter"] for it in line) / len(line)
            if abs(item["ycenter"] - line_avg_yc) < (line_avg_h * 0.55):
                line.append(item)
                placed = True
                break
        if not placed:
            lines.append([item])

    # Sort rows top-to-bottom
    lines.sort(key=lambda l: sum(it["ycenter"] for it in l) / len(l))

    # Sort tokens in each row left-to-right and join with double space
    reconstructed_lines: List[str] = []
    for line in lines:
        line.sort(key=lambda it: it["xmin"])
        line_text = "  ".join(it["text"] for it in line)
        if line_text:
            reconstructed_lines.append(line_text)

    return reconstructed_lines


def clean_currency_amount(raw_val: str, allow_zero: bool = False) -> Optional[int]:
    """Clean string number into integer paise (e.g. '1,250.50' -> 125050)."""
    cleaned = raw_val.strip()
    cleaned = re.sub(r"^(?:₹|inr|rs\.?|rs|\?|<|>|r)\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace(",", "").replace("?", "").replace("₹", "").replace("<", "").replace(">", "").strip()
    try:
        val = float(cleaned)
        if val < 0 or (val == 0 and not allow_zero):
            return None
        return int(round(val * 100))
    except ValueError:
        return None


def clean_signed_currency_amount(raw_val: str) -> Optional[int]:
    """Clean signed currency amount into integer paise (e.g. '-0.03' -> -3)."""
    cleaned = raw_val.strip()
    is_neg = "-" in cleaned
    cleaned = re.sub(r"^(?:₹|inr|rs\.?|rs|\?|<|>|r|\-|\+)\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace(",", "").replace("?", "").replace("₹", "").replace("<", "").replace(">", "").strip()
    try:
        val = float(cleaned)
        p = int(round(val * 100))
        return -p if is_neg else p
    except ValueError:
        return None


def decompose_jammed_rate_amount(jammed_str: str, qty: int) -> Tuple[Optional[int], Optional[int]]:
    """
    Decompose jammed print rates and amounts on thermal receipts.
    e.g. '95475.00' with qty 5 -> rate 95, amount 475.00 (5 * 95 = 475).
    Returns (rate_paise, amount_paise).
    """
    cleaned = jammed_str.strip().replace(",", "").replace("₹", "").replace("rs.", "")
    m = re.match(r"^(\d+)(?:\.(\d{1,2}))?$", cleaned)
    if not m:
        return None, None
    int_part = m.group(1)
    dec_part = m.group(2) or "00"
    if len(dec_part) == 1:
        dec_part += "0"

    for split_idx in range(1, len(int_part)):
        r_str = int_part[:split_idx]
        a_str = int_part[split_idx:]
        try:
            r_val = float(r_str)
            a_val = float(f"{a_str}.{dec_part}")
            if qty > 0 and abs(qty * r_val - a_val) < 0.05:
                return int(round(r_val * 100)), int(round(a_val * 100))
        except ValueError:
            continue
    return None, None


def parse_receipt_text(text: str, categories: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Deterministic rule-based parser for receipt text.
    Extracts merchant, date, amount_paise, subtotal_paise, round_off_paise, tax_paise, line items, and category.
    """
    if not text:
        return {
            "merchant": None,
            "date": date.today().isoformat(),
            "amount_paise": None,
            "subtotal_paise": None,
            "round_off_paise": None,
            "tax_paise": None,
            "line_items": [],
            "suggested_category_id": categories[0]["id"] if categories else None,
            "suggested_category_name": categories[0]["name"] if categories else None,
            "description": None,
            "confidence_score": 0.0,
            "warnings": ["No text could be extracted from receipt."],
        }

    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

    amount_paise: Optional[int] = None
    subtotal_paise: Optional[int] = None
    round_off_paise: Optional[int] = None
    cgst_paise: Optional[int] = None
    sgst_paise: Optional[int] = None
    tax_paise: Optional[int] = None

    non_item_keywords = [
        "sub total", "subtotal", "total", "tax", "round off", "roundoff", "gst", "cgst", "sgst",
        "vat", "fssai", "gstin", "thank you", "bill no", "token", "cashier", "dine in",
        "particulars", "summary", "item", "qty", "amount", "rate", "date", "cash memo",
        "order", "0rder", "lic", "e.&o.e.", "t.no.", "w.no.", "total qty", "balance", "change"
    ]

    def extract_val_from_line(l: str) -> Optional[int]:
        if any(w in l.lower() for w in ["order", "0rder", "otp", "fssai", "gstin", "phone", "lic", "bill no", "t.no", "w. no", "total qty"]):
            return None
        if re.search(r"\b\d{1,2}:\d{2}\b", l):
            return None
        if re.search(r"\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2}|\d{2})\b", l):
            return None
        candidates = re.findall(r"(?:₹|inr|rs\.?|rs|\?|<|r)?\s*([\d,]+(?:\.\d{1,2})?)", l, re.IGNORECASE)
        for cand in reversed(candidates):
            p = clean_currency_amount(cand)
            if p and p > 0:
                return p
        return None

    # 1. Line Items Extraction
    line_items: List[Dict[str, Any]] = []
    i = 0

    while i < len(lines):
        line = lines[i].strip()
        low = line.lower()
        if not line or any(k in low for k in ["particulars", "summary", "qty. priceamount", "qty  rate  amount"]):
            i += 1
            continue
        if any(k in low for k in ["sub total", "subtotal", "round off", "fssai", "gstin", "thank you"]) or ("total" in low and "total qty" in low and "sub" in low):
            i += 1
            continue

        # Split multiple spaces or tabs into columns
        parts = [p.strip() for p in re.split(r"\s{2,}|\t+", line) if p.strip()]
        parsed_item: Optional[Dict[str, Any]] = None

        # Case A: 4 columns: Name, Qty, Rate, Amount
        if len(parts) == 4:
            p_name, p_qty, p_rate, p_amt = parts
            if re.match(r"^\d{1,3}$", p_qty):
                q = int(p_qty)
                r_paise = clean_currency_amount(p_rate)
                a_paise = clean_currency_amount(p_amt)
                if a_paise:
                    parsed_item = {"name": p_name, "quantity": q, "amount_paise": a_paise}
                    if r_paise:
                        parsed_item["unit_price_paise"] = r_paise

        # Case B: 3 columns: Name, Qty, Amount (or Name, Rate, Amount)
        elif len(parts) == 3:
            p0, p1, p2 = parts
            if re.match(r"^\d{1,3}$", p1):
                q = int(p1)
                dec_r, dec_a = decompose_jammed_rate_amount(p2, q)
                if dec_a:
                    parsed_item = {"name": p0, "quantity": q, "amount_paise": dec_a}
                    if dec_r:
                        parsed_item["unit_price_paise"] = dec_r
                else:
                    a_paise = clean_currency_amount(p2)
                    if a_paise:
                        parsed_item = {"name": p0, "quantity": q, "amount_paise": a_paise}
            else:
                a_paise = clean_currency_amount(p2)
                r_paise = clean_currency_amount(p1)
                if a_paise and r_paise:
                    parsed_item = {"name": p0, "quantity": 1, "unit_price_paise": r_paise, "amount_paise": a_paise}

        # Case C: 2 columns: e.g. 'Ghee Podi Masala 5' and '95475.00'
        elif len(parts) == 2:
            p0, p1 = parts
            m_q = re.search(r"^(.*?)\s+(\d{1,3})$", p0)
            if m_q:
                item_name = m_q.group(1).strip()
                q = int(m_q.group(2))
                dec_r, dec_a = decompose_jammed_rate_amount(p1, q)
                if dec_a:
                    parsed_item = {"name": item_name, "quantity": q, "amount_paise": dec_a}
                    if dec_r:
                        parsed_item["unit_price_paise"] = dec_r
                else:
                    a_paise = clean_currency_amount(p1)
                    if a_paise:
                        parsed_item = {"name": item_name, "quantity": q, "amount_paise": a_paise}
            else:
                a_paise = clean_currency_amount(p1)
                if a_paise and not any(k in p0.lower() for k in non_item_keywords):
                    parsed_item = {"name": p0, "quantity": 1, "amount_paise": a_paise}

        # Case D: Vertical layout (Item Name -> Qty -> Rate -> Amount) across lines
        if not parsed_item and i + 3 < len(lines):
            l_qty = lines[i + 1]
            l_rate = lines[i + 2]
            l_amt = lines[i + 3]
            if (
                re.match(r"^\d{1,3}$", l_qty)
                and clean_currency_amount(l_rate) is not None
                and clean_currency_amount(l_amt) is not None
                and re.search(r"^[A-Za-z\s]{3,35}$", line)
                and low not in ["total", "sub total", "subtotal", "tax", "cgst", "sgst"]
            ):
                tot_p = clean_currency_amount(l_amt)
                r_p = clean_currency_amount(l_rate)
                if tot_p and tot_p > 0:
                    parsed_item = {"name": line.strip(), "quantity": int(l_qty), "amount_paise": tot_p}
                    if r_p:
                        parsed_item["unit_price_paise"] = r_p
                    line_items.append(parsed_item)
                    i += 4
                    continue

        # Case E: Regex row pattern (e.g. 'ITEM 2 200 400')
        if not parsed_item:
            m_row = re.search(r"^([A-Za-z0-9\s&\'\.\(\)\-]+?)\s+(\d{1,3})\s+([\d,\.]+)\s+([\d,\.]+)$", line)
            if m_row:
                name, q_str, r_str, a_str = m_row.group(1), m_row.group(2), m_row.group(3), m_row.group(4)
                a_paise = clean_currency_amount(a_str)
                r_paise = clean_currency_amount(r_str)
                if a_paise and not any(k in name.lower() for k in non_item_keywords):
                    parsed_item = {"name": name.strip(), "quantity": int(q_str), "amount_paise": a_paise}
                    if r_paise:
                        parsed_item["unit_price_paise"] = r_paise

        # Case F: Surcharges / Delivery / Packaging
        if not parsed_item:
            m_fee = re.search(
                r"^(Delivery\s*Fee|Packaging\s*Charges|Restaurant\s*Packaging|Platform\s*Fee)[\s\?₹rs\.\:]*([\d,]+(?:\.\d{1,2})?)$",
                line,
                re.IGNORECASE,
            )
            if m_fee:
                fee_name = m_fee.group(1).strip()
                fee_paise = clean_currency_amount(m_fee.group(2))
                if fee_paise:
                    parsed_item = {"name": fee_name, "quantity": 1, "amount_paise": fee_paise}

        # Case G: Single line item: Item Name Amount
        if not parsed_item:
            m_single = re.search(r"^([A-Za-z0-9\s&'\.\(\)\-]{3,40}?)\s+[\?₹rs\.\s]*([\d,]+(?:\.\d{1,2})?)$", line)
            if m_single:
                it_name = m_single.group(1).strip()
                it_paise = clean_currency_amount(m_single.group(2))
                if it_paise and not any(k in it_name.lower() for k in non_item_keywords):
                    parsed_item = {"name": it_name, "quantity": 1, "amount_paise": it_paise}

        if parsed_item:
            # Check if next line is wrapped description continuation (e.g. 'Idli (1Pcs)' or 'Dosa')
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                next_low = next_line.lower()
                has_no_digits = not bool(re.search(r"\d{2,}", next_line))
                is_not_keyword = not any(k in next_low for k in non_item_keywords)
                if is_not_keyword and len(next_line) < 30 and (has_no_digits or re.search(r"^\([0-9a-zA-Z\s]+\)$", next_line)):
                    parsed_item["name"] = f"{parsed_item['name']} {next_line}".strip()
                    i += 1  # Skip the wrapped continuation line
            line_items.append(parsed_item)

        i += 1

    item_amounts = {it["amount_paise"] for it in line_items}

    # 2. Subtotal Detection (isolate after 'total' keyword)
    for idx in range(len(lines)):
        line = lines[idx]
        low = line.lower()
        if "sub total" in low or "subtotal" in low or "items total" in low:
            after = line.lower().split("total", 1)[1]
            val = extract_val_from_line(after)
            if not val and idx + 1 < len(lines):
                val = extract_val_from_line(lines[idx + 1])
            if val:
                subtotal_paise = val
                break

    if not subtotal_paise and line_items:
        items_sum = sum(it["amount_paise"] for it in line_items)
        if items_sum > 0:
            subtotal_paise = items_sum

    # 3. Round off Detection
    for idx, line in enumerate(lines):
        if "round off" in line.lower() or "roundoff" in line.lower():
            m_ro = re.search(r"([+-]?\s*[\d,]+(?:\.\d{1,2})?)", line.split("off", 1)[1] if "off" in line else line)
            if m_ro:
                round_off_paise = clean_signed_currency_amount(m_ro.group(1))
                break

    # 4. Tax Detection (CGST, SGST, IGST, VAT, or Total Tax)
    for idx in range(len(lines)):
        line = lines[idx]
        low = line.lower()
        if "cgst" in low:
            after = line.split(":", 1)[1] if ":" in line else line
            val = extract_val_from_line(after)
            if not val and idx + 1 < len(lines):
                val = extract_val_from_line(lines[idx + 1])
            if val:
                cgst_paise = val
        if "sgst" in low:
            after = line.split(":", 1)[1] if ":" in line else line
            val = extract_val_from_line(after)
            if not val and idx + 1 < len(lines):
                val = extract_val_from_line(lines[idx + 1])
            if val:
                sgst_paise = val

    if cgst_paise or sgst_paise:
        tax_paise = (cgst_paise or 0) + (sgst_paise or 0)
    else:
        total_tax_pat = re.compile(
            r"(?:total\s*tax|tax\s*amount|taxes|tax)\s*[:\-\=]?\s*(?:₹|inr|rs\.?|rs|\?|r)?\s*([\d,]+(?:\.\d{1,2})?)",
            re.IGNORECASE,
        )
        for line in lines:
            m = total_tax_pat.search(line)
            if m:
                p = clean_currency_amount(m.group(1), allow_zero=True)
                if p is not None:
                    tax_paise = p
                    break

    expected_total = (subtotal_paise or 0) + (tax_paise or 0) + (round_off_paise or 0) if subtotal_paise else None

    # 5. Final Total Amount Extraction with Prioritized Keyword Scoring
    final_total_keywords = [
        "grand total", "net amount", "amount payable", "final amount",
        "bill amount", "total amount", "total due", "total payable",
        "amount paid", "paid amount", "food total", "total"
    ]

    candidate_totals = []
    for kw in final_total_keywords:
        for idx in range(len(lines) - 1, -1, -1):
            line = lines[idx]
            low = line.lower()
            if kw in low:
                if "total qty" in low or "total quantity" in low or "total items" in low:
                    continue
                if kw == "total" and ("sub total" in low or "subtotal" in low):
                    continue
                after_kw = low.split(kw, 1)[1]
                val = extract_val_from_line(after_kw)
                if val:
                    candidate_totals.append((val, kw, 0))
                if idx + 1 < len(lines):
                    val = extract_val_from_line(lines[idx + 1])
                    if val:
                        candidate_totals.append((val, kw, 1))
                if idx - 1 >= 0:
                    val = extract_val_from_line(lines[idx - 1])
                    if val:
                        candidate_totals.append((val, kw, -1))

    # Score candidates deterministically
    best_amt = None
    best_score = -9999

    for cand, kw, dist in candidate_totals:
        score = 100
        if kw in ["grand total", "net amount", "amount payable", "food total", "total"]:
            score += 100
        if dist == 0:
            score += 50
        # Mathematical consistency verification:
        if expected_total and abs(cand - expected_total) <= 100:
            score += 1000
        # A final payable total cannot be less than subtotal if taxes exist:
        if subtotal_paise and tax_paise and tax_paise > 0 and cand < subtotal_paise:
            score -= 1000
        # Penalize selecting an individual line item amount when a larger bill exists:
        if cand in item_amounts and (expected_total and cand != expected_total):
            score -= 500
        # Penalize selecting subtotal before taxes:
        if subtotal_paise and cand == subtotal_paise and tax_paise and tax_paise > 0:
            score -= 300
        if score > best_score:
            best_score = score
            best_amt = cand

    if best_amt:
        amount_paise = best_amt
    elif expected_total:
        amount_paise = expected_total

    # Secondary fallback for total: largest currency figure
    if not amount_paise:
        max_paise = 0
        currency_pat = re.compile(r"(?:₹|inr|rs\.?|rs|\?)\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)
        for line in lines:
            if any(term in line.lower() for term in ["order", "0rder", "otp", "fssai", "phone", "lic", "total qty"]):
                continue
            matches = currency_pat.findall(line)
            for m in matches:
                paise = clean_currency_amount(m)
                if paise and paise > max_paise:
                    max_paise = paise
        if max_paise > 0:
            amount_paise = max_paise

    # 6. Date Extraction (Preferring Indian DD/MM/YYYY or DD/MM/YY)
    receipt_date: Optional[str] = None
    month_name_map = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
    }

    date_patterns = [
        # Named month with optional spaces/suffixes: 14thFeb2025 or 14-Feb-2025
        (re.compile(r"\b(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?[\s\-/]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-/]*(20\d{2})\b", re.IGNORECASE), "named"),
        # DD-MM-YYYY or DD/MM/YY (Indian standard)
        (re.compile(r"\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2}|\d{2})\b"), "%d-%m-%Y"),
        # YYYY-MM-DD (ISO standard)
        (re.compile(r"\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b"), "%Y-%m-%d"),
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
                        receipt_date = parsed.isoformat()
                        break
                    elif fmt == "%d-%m-%Y":
                        day = int(m.group(1))
                        month = int(m.group(2))
                        yr_str = m.group(3)
                        year = int(yr_str) if len(yr_str) == 4 else (2000 + int(yr_str))
                        parsed = date(year, month, day)
                        receipt_date = parsed.isoformat()
                        break
                    else:
                        parsed = datetime.strptime(f"{m.group(1)}-{m.group(2)}-{m.group(3)}", "%Y-%m-%d").date()
                        receipt_date = parsed.isoformat()
                        break
                except ValueError:
                    continue
        if receipt_date:
            break

    # 7. Merchant Extraction with noise filtering and business priority scoring
    merchant: Optional[str] = None
    platform = None
    text_lower = text.lower()
    if "zomato" in text_lower:
        platform = "Zomato"
    elif "swiggy" in text_lower:
        platform = "Swiggy"

    chat_noise = {
        "you", "today", "yesterday", "reply", "forwarded", "message", "chat",
        "online", "typing", "screenshot", "camera", "photo", "status", "battery",
        "whatsapp", "telegram", "airtel", "jio", "vodafone", "bsnl", "volte",
        "lte", "am", "pm", "mon", "tue", "wed", "thu", "fri", "sat", "sun"
    }

    merchant_priority_terms = [
        "resto", "restaurant", "veg", "hotel", "cafe", "coffee", "dhaba", "bhojanalaya",
        "sweets", "bakery", "kitchen", "foods", "supermarket", "mart",
        "bazaar", "traders", "enterprises", "hospital", "pharmacy", "clinic", "bakers", "bistro", "grill",
        "idli", "dosa", "brahmin"
    ]

    skip_keywords = [
        "order", "0rder", "fssai", "lic", "paid", "delivery", "name:", "address",
        "otp", "summary", "total", "tax", "invoice", "gstin", "ph:", "phone", "tel:", "cash memo",
        "store #", "branch #", "road", "street", "lane", "floor", "dine in", "cashier", "token"
    ]

    # Special check: Hyphenated merchant heading (e.g. 'Brahmins Thatte Idli-' with branch on next line)
    for idx, l in enumerate(lines[:5]):
        clean_alpha = re.sub(r"[^A-Za-z]", "", l)
        if len(clean_alpha) >= 4 and ("brahmin" in l.lower() or l.strip().endswith("-")) and idx + 1 < len(lines):
            l0 = l.strip().rstrip("-").strip()
            l1 = lines[idx + 1].strip()
            clean_alpha_next = re.sub(r"[^A-Za-z]", "", l1)
            if len(clean_alpha_next) >= 3 and not any(k in l1.lower() for k in ["#", "road", "gst", "fssai", "date", "cash", "memo"]):
                merchant = f"{l0} - {l1.title()}"
                break

    if not merchant:
        merchant_candidates = []
        for idx, line in enumerate(lines[:12]):
            cleaned_line = re.sub(r"[^A-Za-z\s]", "", line).strip()
            low = cleaned_line.lower()
            if not low or len(low) < 4:
                continue
            if any(w in chat_noise for w in low.split()):
                continue
            if any(k in line.lower() for k in skip_keywords):
                continue
            if len(line) > 60:
                continue
            m_score = 10 - idx
            if any(term in low for term in merchant_priority_terms):
                m_score += 50
            merchant_candidates.append((line.strip(), m_score))

        merchant_candidates.sort(key=lambda x: x[1], reverse=True)
        if merchant_candidates:
            raw_merchant = merchant_candidates[0][0]
            cleaned_m = re.sub(
                r"(?<=[a-zA-Z])(VEG|NONVEG|RESTO|RESTAURANT|SWEETS|BHOJANALAYA|DHABA|CAFE|BAKERY|HOTEL|STORE|MART|SUPERMARKET)",
                r" \1",
                raw_merchant,
            )
            merchant = re.sub(r"\s+", " ", cleaned_m).strip()
            if platform and platform.lower() not in merchant.lower():
                merchant = f"{merchant} ({platform})"
        elif platform:
            merchant = platform

    # 8. Category Suggestion
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

    # 9. Description derivation
    if line_items:
        item_names = [it["name"] for it in line_items if "fee" not in it["name"].lower() and "charge" not in it["name"].lower()][:3]
        if item_names:
            items_str = ", ".join(item_names)
            description = f"{merchant}: {items_str}" if merchant else items_str
        else:
            description = merchant or "Receipt Expense"
    else:
        description = merchant or "Receipt Expense"

    # 10. Confidence Calculation & Validation Warnings
    score = 0.0
    parse_warnings: List[str] = []
    if amount_paise:
        score += 0.35
    else:
        parse_warnings.append("Could not automatically confirm the final total amount. Please review and verify manually.")

    if merchant:
        score += 0.25
    if receipt_date:
        score += 0.25
    if suggested_cat_id and best_match_count > 0:
        score += 0.15

    if score < 0.6 and not parse_warnings:
        parse_warnings.append("Confidence is low; please review and verify extracted amount and details manually.")

    return {
        "merchant": merchant,
        "date": receipt_date or date.today().isoformat(),
        "amount_paise": amount_paise,
        "subtotal_paise": subtotal_paise,
        "round_off_paise": round_off_paise,
        "tax_paise": tax_paise,
        "line_items": line_items,
        "suggested_category_id": suggested_cat_id,
        "suggested_category_name": suggested_cat_name,
        "description": description,
        "confidence_score": round(score, 2),
        "warnings": parse_warnings,
    }
