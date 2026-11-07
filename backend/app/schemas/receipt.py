"""Receipt extraction and OCR response schemas."""
from typing import List, Optional
from pydantic import BaseModel, Field


class ReceiptLineItem(BaseModel):
    name: str
    amount_paise: int


class ReceiptExtractResponse(BaseModel):
    file_id: str
    file_name: str
    file_size: int
    mime_type: str
    merchant: Optional[str] = None
    amount_paise: Optional[int] = None
    date: Optional[str] = None  # YYYY-MM-DD
    tax_paise: Optional[int] = None
    line_items: List[ReceiptLineItem] = Field(default_factory=list)
    suggested_category_id: Optional[str] = None
    suggested_category_name: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    extraction_method: str = "deterministic_rules"
    warnings: List[str] = Field(default_factory=list)
