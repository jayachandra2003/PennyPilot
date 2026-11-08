"""Tests for receipt processing, OCR text extraction, and isolated file management."""
import io
import os
import shutil
import uuid
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, get_db
from app.domain.receipt_extractor import (
    clean_currency_amount,
    detect_file_type,
    extract_raw_text,
    parse_receipt_text,
)
from app.models.category import Category
from app.models.user import User

client = TestClient(app)


@pytest.fixture
def isolated_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestingSession
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _create_user(db_session_factory, email: str = "receipt_user@pennypilot.in") -> tuple[str, User]:
    db = db_session_factory()
    u = User(
        id=str(uuid.uuid4()),
        email=email,
        display_name="Receipt Tester",
        is_active=True,
        _email_verified=True,
    )
    db.add(u)
    cat = Category(
        id=str(uuid.uuid4()),
        user_id=u.id,
        name="Dining & Food",
        kind="expense",
        icon="utensils",
        color_token="teal",
    )
    db.add(cat)
    db.commit()
    token = create_access_token(subject=u.id, extra_claims={"email": u.email})
    return token, u


def test_clean_currency_amount():
    assert clean_currency_amount("1,250.50") == 125050
    assert clean_currency_amount("500") == 50000
    assert clean_currency_amount("0.75") == 75
    assert clean_currency_amount("invalid") is None
    assert clean_currency_amount("-100") is None


def test_detect_file_type_magic_bytes():
    assert detect_file_type(b"%PDF-1.4 sample content", "bill.pdf") == (".pdf", "application/pdf")
    assert detect_file_type(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR", "receipt.png") == (".png", "image/png")
    assert detect_file_type(b"\xff\xd8\xff\xe0\x00\x10JFIF", "photo.jpg") == (".jpg", "image/jpeg")
    assert detect_file_type(b"RIFF\x24\x00\x00\x00WEBPVP8 ", "scan.webp") == (".webp", "image/webp")

    with pytest.raises(Exception):
        detect_file_type(b"PLAIN TEXT CONTENT", "file.txt")

    with pytest.raises(Exception):
        detect_file_type(b"NOT A REAL PNG", "fake.png")


def test_parse_receipt_text_comprehensive():
    sample_text = """
    STARBUCKS COFFEE INDIA
    Store #4120, Indiranagar, Bangalore
    GSTIN: 29AABCS1429B1Z
    Date: 05-Nov-2026  Time: 14:32
    Bill No: SB-98214

    ITEMS:
    Caffe Latte Grande       280.00
    Chocolate Muffin         180.00

    Subtotal: 460.00
    CGST (2.5%): 11.50
    SGST (2.5%): 11.50
    Total Tax: 23.00

    GRAND TOTAL: ₹483.00
    Paid via UPI
    Thank you for visiting!
    """

    categories = [
        {"id": "cat-dining", "name": "Dining & Food", "kind": "expense"},
        {"id": "cat-groceries", "name": "Groceries", "kind": "expense"},
        {"id": "cat-shopping", "name": "Shopping", "kind": "expense"},
    ]

    result = parse_receipt_text(sample_text, categories)

    assert result["merchant"] == "STARBUCKS COFFEE INDIA"
    assert result["date"] == "2026-11-05"
    assert result["amount_paise"] == 48300
    assert result["tax_paise"] == 2300
    assert result["suggested_category_id"] == "cat-dining"
    assert result["suggested_category_name"] == "Dining & Food"
    assert len(result["line_items"]) >= 2
    assert result["confidence_score"] >= 0.8


def test_parse_receipt_text_groceries_dmart():
    dmart_text = """
    AVENUE SUPERMARTS LTD (D-MART)
    Sarjapur Road, Bangalore
    Date: 2026-10-28
    
    Aashirvaad Atta 5kg     245.00
    Amul Butter 500g        275.00
    Tata Salt 1kg            28.00

    NET AMOUNT: 548.00
    """
    categories = [
        {"id": "cat-groceries", "name": "Groceries", "kind": "expense"},
        {"id": "cat-utilities", "name": "Utilities & Bills", "kind": "expense"},
    ]
    result = parse_receipt_text(dmart_text, categories)

    assert result["amount_paise"] == 54800
    assert result["date"] == "2026-10-28"
    assert result["suggested_category_id"] == "cat-groceries"


def test_receipt_image_validation_and_preprocessing():
    img = Image.new("RGB", (200, 200), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    jpeg_bytes = buf.getvalue()

    ext, mime = detect_file_type(jpeg_bytes, "camera_capture.jpg")
    assert ext == ".jpg"
    assert mime == "image/jpeg"

    text, method, warnings = extract_raw_text(jpeg_bytes, ext)
    assert method in ("manual_review", "image_heuristic", "local_ocr_rapid")
    assert len(warnings) > 0


def test_receipt_api_extract_endpoint(isolated_db):
    token, user = _create_user(isolated_db)

    # Generate synthetic image
    img = Image.new("RGB", (150, 150), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    headers = {"Authorization": f"Bearer {token}"}
    files = {"file": ("my_receipt.png", png_bytes, "image/png")}

    resp = client.post("/api/v1/receipts/extract", headers=headers, files=files)
    assert resp.status_code == 200
    data = resp.json()

    assert "file_id" in data
    assert data["file_name"] == "my_receipt.png"
    assert data["mime_type"] == "image/png"
    assert len(data["file_id"]) == 32

    # Verify physical file was saved in user isolated directory
    user_receipt_dir = settings.RECEIPT_UPLOAD_DIR / user.id
    saved_file = user_receipt_dir / f"{data['file_id']}.png"
    assert saved_file.is_file()

    # Test file download endpoint (authorized)
    dl_resp = client.get(f"/api/v1/receipts/file/{data['file_id']}", headers=headers)
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) == len(png_bytes)

    # Test multi-tenant isolation: another user cannot access this receipt
    token2, user2 = _create_user(isolated_db, email="other_user@pennypilot.in")
    headers2 = {"Authorization": f"Bearer {token2}"}
    forbidden_resp = client.get(f"/api/v1/receipts/file/{data['file_id']}", headers=headers2)
    assert forbidden_resp.status_code == 404

    # Test delete receipt file
    del_resp = client.delete(f"/api/v1/receipts/file/{data['file_id']}", headers=headers)
    assert del_resp.status_code == 204
    assert not saved_file.exists()

    # Clean up test user directory
    if user_receipt_dir.exists():
        shutil.rmtree(user_receipt_dir, ignore_errors=True)


def test_harishanker_indian_receipt_parsing():
    sample_ocr = """HARISHANKERVEGRESTO
TRIVENI NAGAR,GOPALPURA,JAIPUR
Cash Memo
Bill No.: 1925
Date:07/11/2026
T.No.: 5
W. No. :
Particulars
Qty
Rate
Amount
HANDIPANEER
2
?200
400
SEVTAMATAR
2
150
300
PLAINRAITA
2
<110
220
JEERARICE
2
<110
220
TAVA ROTI BUTTER
10
12
120
TANDURIROTIBUTTER
8
15
120
VANILAICECREAM
5
40
R200
Sub Total :
1580.00
CGST@9%On1580.00:
142.20
SGST @9% On 1580.00 :
142.20
Food Total:
1864.4
1864.4
Total :
(01:01 PM)
E.&O.E.
Thank You
Visit Again"""

    cats = [
        {"id": "cat-food", "name": "Dining & Food", "kind": "expense"},
        {"id": "cat-groceries", "name": "Groceries", "kind": "expense"},
    ]
    parsed = parse_receipt_text(sample_ocr, cats)

    assert parsed["merchant"] == "HARISHANKER VEG RESTO"
    assert parsed["date"] == "2026-11-07"
    assert parsed["amount_paise"] == 186440  # ₹1,864.40
    assert parsed["subtotal_paise"] == 158000  # ₹1,580.00
    assert parsed["tax_paise"] == 28440  # ₹284.40 (CGST 142.20 + SGST 142.20)
    assert len(parsed["line_items"]) == 7
    assert parsed["suggested_category_name"] == "Dining & Food"
    assert parsed["confidence_score"] == 1.0


def test_harishanker_exact_uploaded_whatsapp_screenshot():
    """Test parsing the exact OCR text produced from the mobile WhatsApp receipt screenshot."""
    raw_ocr_with_chat_chrome = """
6:33
35%
You
Today,1:51PM
HARISHANKERVEGRESTO
TRIVENI NAGAR，GOPALPURA,JAIPUR
CashMemo-
Date:07/11/2026
Bill No.:1925
T.No.:5
W.No.:
Particulars
Qty
Rate
Amount
HANDIPANEER
2
200
400
SEVTAMATAR
2
150
300
PLAINRAITA
2
110
220
JEERARICE
2
110
220
TAVAROTIBUTTER
10
12
120
TANDURIROTIBUTTER
8
15
120
VANILAICECREAM
5
40
200
Sub Total:
1580.00
CGST@9%On1580.00:
142.20
SGST@9%On1580.00:
142.20
FoodTotal:
1864.4
Total:
1864.4
(01:01PM)
E.&O.E.
ThankYou
VisitAgain
Reply
    """
    cats = [{"id": "cat-food", "name": "Dining & Food", "kind": "expense"}]
    parsed = parse_receipt_text(raw_ocr_with_chat_chrome, cats)

    # Must extract the actual restaurant, NOT 'You' or 'Today'
    assert parsed["merchant"] == "HARISHANKER VEG RESTO"
    assert parsed["date"] == "2026-11-07"
    # Must NOT select 400 (Handi Paneer line-item) or 200 (unit price)
    assert parsed["amount_paise"] == 186440  # Exactly ₹1,864.40
    assert parsed["subtotal_paise"] == 158000
    assert parsed["tax_paise"] == 28440
    assert len(parsed["line_items"]) == 7


def test_receipt_with_separate_grand_total():
    """Test receipt where grand total is labeled separately from subtotal and taxes."""
    text = """
    PVR CINEMAS FORUM MALL
    Date: 12/11/2026
    Ticket Qty 2       ₹600.00
    Popcorn Combo      ₹450.00
    Sub Total: ₹1,050.00
    CGST @ 9%: ₹94.50
    SGST @ 9%: ₹94.50
    GRAND TOTAL: ₹1,239.00
    Payment: Credit Card
    """
    cats = [{"id": "cat-ent", "name": "Entertainment", "kind": "expense"}]
    parsed = parse_receipt_text(text, cats)

    assert parsed["merchant"] == "PVR CINEMAS FORUM MALL"
    assert parsed["amount_paise"] == 123900  # ₹1,239.00
    assert parsed["subtotal_paise"] == 105000
    assert parsed["tax_paise"] == 18900
    # Must not pick subtotal 105000 or item 60000 or 45000
    assert parsed["amount_paise"] != 105000
    assert parsed["amount_paise"] != 60000


def test_receipt_without_tax():
    """Test receipt with multiple items and no tax lines."""
    text = """
    LOCAL KIRANA STORE
    Date: 02/11/2026
    Milk 1L            ₹60.00
    Eggs 12pk          ₹90.00
    Bread              ₹45.00
    Total Amount: ₹195.00
    """
    cats = [{"id": "cat-groc", "name": "Groceries", "kind": "expense"}]
    parsed = parse_receipt_text(text, cats)

    assert parsed["merchant"] == "LOCAL KIRANA STORE"
    assert parsed["amount_paise"] == 19500
    assert parsed["tax_paise"] is None


def test_receipt_multiple_item_prices_never_picks_line_item():
    """Ensure no individual line item (even large items like ₹400, ₹500, ₹800) is chosen as total."""
    text = """
    FASHION RETAIL STORE
    Date: 04/11/2026
    Casual Shirt        ₹800.00
    Jeans               ₹1200.00
    Socks               ₹150.00
    Sub Total: ₹2150.00
    Amount Payable: ₹2150.00
    """
    cats = [{"id": "cat-shop", "name": "Shopping", "kind": "expense"}]
    parsed = parse_receipt_text(text, cats)

    assert parsed["amount_paise"] == 215000
    assert parsed["amount_paise"] not in [80000, 120000, 15000]


def test_receipt_poor_quality_and_ambiguous_totals():
    """Ensure garbled/unclear receipt flags manual review and low confidence."""
    garbled_text = """
    XYZ??? ???
    --- --- ---
    ??? 45???
    ---
    """
    parsed = parse_receipt_text(garbled_text, [])
    assert parsed["confidence_score"] < 0.6
    assert len(parsed["warnings"]) > 0
    assert "manual" in parsed["warnings"][0].lower() or "verify" in parsed["warnings"][0].lower()


def test_brahmins_thatte_idli_receipt_extraction():
    """
    Verify complete extraction of multi-column thermal receipt: Brahmins Thatte Idli.
    Tests: 2-digit year (09/11/26 -> 2026-11-09), wrapped item description,
    jammed rate/amount decomposition (5 @ 95 = 475.00), round off (-0.03), and grand total (550.00).
    """
    raw_lines = """
    Brahmins Thatte Idli-
    Basaveshwar nagar
    #19,Karania Chambers,3RD Block
    Basaveshwaranagar.Bengaluru-79
    GST-29AAQFP6766L1Z5
    Name:
    Date:09/11/26  Dine In: BTI
    07:57
    Cashier:biller  Bill No.: 27
    Token No.: 27
    Item  Qty. PriceAmount
    Ghee Podi Thatte  1  75  75.00
    Idli (1Pcs)
    Ghee Podi Masala 5  95475.00
    Dosa
    Total Qty: 6  Sub Total  550.00
    Round off  -0.03
    Grand Total  550.00
    FSSAI LicNo.11219332000580
    Thank You, Visit Again.
    """
    cats = [{"id": "cat-food", "name": "Dining & Food", "kind": "expense"}]
    parsed = parse_receipt_text(raw_lines, cats)

    assert parsed["merchant"] == "Brahmins Thatte Idli - Basaveshwar Nagar"
    assert parsed["date"] == "2026-11-09"
    assert parsed["subtotal_paise"] == 55000
    assert parsed["round_off_paise"] == -3
    assert parsed["amount_paise"] == 55000  # Grand Total

    # Check line items
    assert len(parsed["line_items"]) == 2
    item1 = parsed["line_items"][0]
    assert "Idli" in item1["name"]
    assert item1["quantity"] == 1
    assert item1["amount_paise"] == 7500
    assert item1.get("unit_price_paise") == 7500

    item2 = parsed["line_items"][1]
    assert "Dosa" in item2["name"]
    assert item2["quantity"] == 5
    assert item2["amount_paise"] == 47500
    assert item2.get("unit_price_paise") == 9500


def test_harishanker_veg_resto_receipt_extraction():
    """
    Verify complete extraction of Harishanker Veg Resto cash memo:
    Tests: multi-item table, subtotal (1,580.00), CGST (142.20) + SGST (142.20),
    final food total (1,864.40), and rejection of line items (e.g. 400 Handi Paneer).
    """
    raw_lines = """
    HARISHANKERVEGRESTO
    TRIVENI NAGAR, GOPALPURA, JAIPUR
    Cash Memo
    Date: 07/11/2026  Bill No.: 1925
    T.No.: 5  W.No.:
    Particulars  Qty  Rate  Amount
    HANDIPANEER  2  200  400
    SEVTAMATAR  2  150  300
    PLAINRAITA  2  110  220
    JEERARICE  2  110  220
    TAVAROTIBUTTER  10  12  120
    TANDURIROTIBUTTER  8  15  120
    VANILAICECREAM  5  40  200
    Sub Total:  1580.00
    CGST@9%On1580.00:  142.20
    SGST@9%On1580.00:  142.20
    FoodTotal:  1864.4
    Total:  1864.4
    (01:01PM)
    E.&O.E.  ThankYou  VisitAgain
    """
    cats = [{"id": "cat-food", "name": "Dining & Food", "kind": "expense"}]
    parsed = parse_receipt_text(raw_lines, cats)

    assert "HARISHANKER" in parsed["merchant"]
    assert parsed["date"] == "2026-11-07"
    assert parsed["subtotal_paise"] == 158000
    assert parsed["tax_paise"] == 28440
    assert parsed["amount_paise"] == 186440  # Final total ₹1,864.40 (NEVER ₹400 or ₹200)

    # Confirm Handi Paneer 400 is in line items, NOT the total
    assert len(parsed["line_items"]) == 7
    handi = next(it for it in parsed["line_items"] if "HANDIPANEER" in it["name"])
    assert handi["amount_paise"] == 40000
    assert parsed["amount_paise"] != 40000

