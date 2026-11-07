"""Pydantic schemas for Income Management."""
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.domain.currency import format_inr


class IncomeCreate(BaseModel):
    amount_paise: int = Field(..., gt=0, description="Income amount in integer paise")
    source: str = Field(..., min_length=1, max_length=255, description="Income source, e.g. Acme Corp, Upwork")
    category_id: Optional[str] = Field(None, description="Category ID; defaults to user's matching income category")
    occurred_on: date = Field(..., description="Date income received")
    description: Optional[str] = Field(None, max_length=255, description="Income description or note")
    is_recurring: bool = Field(False, description="Whether this is a recurring monthly income")


class IncomeUpdate(BaseModel):
    amount_paise: Optional[int] = Field(None, gt=0)
    source: Optional[str] = Field(None, min_length=1, max_length=255)
    category_id: Optional[str] = None
    occurred_on: Optional[date] = None
    description: Optional[str] = None
    is_recurring: Optional[bool] = None


class IncomeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    amount_paise: int
    amount_formatted: str
    source: str
    category_id: str
    category_name: str
    occurred_on: date
    description: str
    is_recurring: bool
    created_at: datetime


class SourceBreakdownItem(BaseModel):
    source: str
    total_paise: int
    total_formatted: str
    count: int
    percentage: float


class MonthlyIncomeOverview(BaseModel):
    period: str = "monthly"
    period_label: str = ""
    month: str  # YYYY-MM or YYYY for backward compatibility
    total_income_paise: int
    total_income_formatted: str
    projected_recurring_annual_paise: Optional[int] = None
    projected_recurring_annual_formatted: Optional[str] = None
    items: List[IncomeResponse]
    sources_breakdown: List[SourceBreakdownItem]
