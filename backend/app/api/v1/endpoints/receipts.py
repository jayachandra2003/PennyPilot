"""Receipt processing, OCR text extraction, and isolated file management endpoints."""
import os
import re
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.errors import BadRequestException, NotFoundException
from app.db.session import get_db
from app.domain.receipt_extractor import (
    MAX_RECEIPT_FILE_SIZE,
    detect_file_type,
    extract_raw_text,
    parse_receipt_text,
)
from app.models.category import Category
from app.models.user import User
from app.schemas.receipt import ReceiptExtractResponse, ReceiptLineItem
from app.services.storage import get_storage_provider, receipt_storage_key

router = APIRouter()


@router.post("/extract", response_model=ReceiptExtractResponse)
async def extract_receipt_details(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Extract structured receipt details from PDF, PNG, JPG, WebP, or DOCX documents.
    
    Security & Privacy Guarantees:
    - Max 5MB file size limit enforced.
    - Magic bytes signature verified (file extensions alone are untrusted).
    - User-isolated storage directory: uploads/receipts/{user_id}/
    - Cryptographically unguessable file IDs (UUIDv4).
    - Zero auto-creation of ledger transactions; returns draft review data only.
    """
    if not file.filename:
        raise BadRequestException(message="File must have a valid filename.", code="INVALID_FILENAME")

    # Read file content safely
    content = await file.read()
    if len(content) > MAX_RECEIPT_FILE_SIZE:
        raise BadRequestException(
            message=f"File exceeds maximum allowed size of 5 MB ({len(content) / (1024*1024):.2f} MB).",
            code="FILE_TOO_LARGE",
        )

    # 1. Magic bytes & format validation
    ext, mime_type = detect_file_type(content, file.filename)

    # 2. Secure file isolation & persistent storage
    file_id = uuid.uuid4().hex
    storage = get_storage_provider()
    storage_key = receipt_storage_key(current_user.id, file_id, ext)
    storage.save_file(storage_key, content, mime_type)

    # Optional local fallback write if local directory available
    try:
        user_receipt_dir = settings.RECEIPT_UPLOAD_DIR / current_user.id
        user_receipt_dir.mkdir(parents=True, exist_ok=True)
        saved_filename = f"{file_id}{ext}"
        saved_path = user_receipt_dir / saved_filename
        if str(saved_path.resolve()).startswith(str(user_receipt_dir.resolve())):
            with open(saved_path, "wb") as f:
                f.write(content)
    except Exception:
        pass

    # 3. Extract text from document / image
    raw_text, extraction_method, warnings = extract_raw_text(content, ext)

    # 4. Fetch user categories for intelligent deterministic matching
    user_cats = (
        db.query(Category)
        .filter(Category.user_id == current_user.id, Category.is_archived == False)
        .all()
    )
    cat_dicts = [{"id": c.id, "name": c.name, "kind": c.kind} for c in user_cats]

    # 5. Parse receipt text into structured financial drafts
    parsed = parse_receipt_text(raw_text, cat_dicts)

    line_items = [
        ReceiptLineItem(name=item["name"], amount_paise=item["amount_paise"])
        for item in parsed.get("line_items", [])
    ]

    return ReceiptExtractResponse(
        file_id=file_id,
        file_name=file.filename,
        file_size=len(content),
        mime_type=mime_type,
        merchant=parsed.get("merchant"),
        amount_paise=parsed.get("amount_paise"),
        subtotal_paise=parsed.get("subtotal_paise"),
        round_off_paise=parsed.get("round_off_paise"),
        date=parsed.get("date"),
        tax_paise=parsed.get("tax_paise"),
        line_items=line_items,
        suggested_category_id=parsed.get("suggested_category_id"),
        suggested_category_name=parsed.get("suggested_category_name"),
        description=parsed.get("description"),
        notes=f"Attached receipt: {file.filename}",
        confidence_score=parsed.get("confidence_score", 0.0),
        extraction_method=extraction_method,
        warnings=warnings + parsed.get("warnings", []),
    )


@router.get("/file/{file_id}")
def get_receipt_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve authenticated user's uploaded receipt file.
    Enforces multi-tenant user isolation and prevents path traversal.
    """
    if not re.match(r"^[a-fA-F0-9]{32}$", file_id):
        raise BadRequestException(message="Invalid receipt identifier.", code="INVALID_FILE_ID")

    storage = get_storage_provider()
    for ext in (".png", ".jpg", ".jpeg", ".pdf", ".webp", ".docx"):
        key = receipt_storage_key(current_user.id, file_id, ext)
        res = storage.get_file(key)
        if res is not None:
            data, mime = res
            return Response(
                content=data,
                media_type=mime,
                headers={"Content-Disposition": f'inline; filename="{file_id}{ext}"'},
            )

    # Local filesystem fallback
    user_receipt_dir = settings.RECEIPT_UPLOAD_DIR / current_user.id
    if user_receipt_dir.is_dir():
        matched_files = list(user_receipt_dir.glob(f"{file_id}.*"))
        if matched_files and str(matched_files[0].resolve()).startswith(str(user_receipt_dir.resolve())):
            return FileResponse(
                path=matched_files[0],
                filename=matched_files[0].name,
            )

    raise NotFoundException(message="Receipt file not found.", code="RECEIPT_NOT_FOUND")


@router.delete("/file/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_receipt_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a user-owned receipt file from persistent storage."""
    if not re.match(r"^[a-fA-F0-9]{32}$", file_id):
        raise BadRequestException(message="Invalid receipt identifier.", code="INVALID_FILE_ID")

    storage = get_storage_provider()
    for ext in (".png", ".jpg", ".jpeg", ".pdf", ".webp", ".docx"):
        key = receipt_storage_key(current_user.id, file_id, ext)
        storage.delete_file(key)

    user_receipt_dir = settings.RECEIPT_UPLOAD_DIR / current_user.id
    if user_receipt_dir.is_dir():
        matched_files = list(user_receipt_dir.glob(f"{file_id}.*"))
        for f in matched_files:
            if str(f.resolve()).startswith(str(user_receipt_dir.resolve())):
                try:
                    f.unlink(missing_ok=True)
                except Exception:
                    pass

    return None
