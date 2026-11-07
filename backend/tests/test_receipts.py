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
    assert method == "image_heuristic"
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
