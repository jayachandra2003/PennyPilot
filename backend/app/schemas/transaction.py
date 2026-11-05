"""Transaction schemas."""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.domain.currency import format_inr, paise_to_rupees


class TransactionBase(BaseModel):
    category_id: str
    kind: str = Field(pattern="^(expense|income)$", default="expense")
    amount_paise: int = Field(gt=0, description="Amount in integer paise (e.g. ₹100.50 -> 10050)")
    occurred_on: date
    description: str = Field(min_length=1, max_length=255)
    merchant: Optional[str] = None
    note: Optional[str] = None
    source: str = Field(pattern="^(manual|nl|csv)$", default="manual")
    nl_original_text: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    category_id: Optional[str] = None
    kind: Optional[str] = Field(default=None, pattern="^(expense|income)$")
    amount_paise: Optional[int] = Field(default=None, gt=0)
    occurred_on: Optional[date] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=255)
    merchant: Optional[str] = None
    note: Optional[str] = None


class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    amount_rupees: Optional[float] = None
    formatted_amount: Optional[str] = None

    def model_post_init(self, __context):
        if self.amount_rupees is None and self.amount_paise is not None:
            self.amount_rupees = paise_to_rupees(self.amount_paise)
        if self.formatted_amount is None and self.amount_paise is not None:
            self.formatted_amount = format_inr(self.amount_paise)
