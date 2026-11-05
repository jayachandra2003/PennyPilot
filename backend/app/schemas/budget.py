"""Budget schemas."""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.domain.currency import format_inr, paise_to_rupees


class BudgetBase(BaseModel):
    category_id: Optional[str] = None
    month: date = Field(description="First day of target month (YYYY-MM-01)")
    limit_paise: int = Field(gt=0, description="Budget limit in integer paise")


class BudgetCreate(BudgetBase):
    pass


class BudgetResponse(BudgetBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
    limit_rupees: Optional[float] = None
    limit_formatted: Optional[str] = None

    def model_post_init(self, __context):
        if self.limit_rupees is None and self.limit_paise is not None:
            self.limit_rupees = paise_to_rupees(self.limit_paise)
        if self.limit_formatted is None and self.limit_paise is not None:
            self.limit_formatted = format_inr(self.limit_paise)
