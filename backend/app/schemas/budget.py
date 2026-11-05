"""Budget schemas including monthly overview and batch updates."""
from datetime import date, datetime
from typing import List, Optional
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


class BudgetSetItem(BaseModel):
    category_id: Optional[str] = None
    limit_paise: int = Field(ge=0, description="Budget limit in integer paise (0 to remove)")


class BudgetBatchUpdateRequest(BaseModel):
    month: date = Field(description="First day of month (YYYY-MM-01)")
    budgets: List[BudgetSetItem]


class CategoryBudgetStatus(BaseModel):
    category_id: str
    category_name: str
    icon: str
    color_token: str
    limit_paise: int
    limit_formatted: str
    spent_paise: int
    spent_formatted: str
    remaining_paise: int
    remaining_formatted: str
    utilization_percent: float
    status: str  # "on_track" | "caution" | "over_pace" | "over_budget"


class MonthlyBudgetOverview(BaseModel):
    month: str
    total_limit_paise: int
    total_limit_formatted: str
    total_spent_paise: int
    total_spent_formatted: str
    remaining_paise: int
    remaining_formatted: str
    utilization_percent: float
    category_budgets: List[CategoryBudgetStatus]
