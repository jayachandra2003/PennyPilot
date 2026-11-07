"""Pydantic schemas for Financial Onboarding."""
from datetime import date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas.income import IncomeResponse
from app.domain.currency import format_inr


class OnboardingIncomeItem(BaseModel):
    source: str = Field(..., min_length=1, max_length=255, description="Income source, e.g. Salary, Freelance")
    amount_paise: int = Field(..., gt=0, description="Amount in integer paise")
    category_id: Optional[str] = None
    occurred_on: Optional[date] = None
    description: Optional[str] = None
    is_recurring: bool = True


class OnboardingBudgetItem(BaseModel):
    category_id: str
    limit_paise: int = Field(..., ge=0, description="Monthly category limit in integer paise")


class OnboardingSetupRequest(BaseModel):
    month: Optional[str] = Field(None, description="Target month in YYYY-MM or YYYY-MM-01 format")
    incomes: List[OnboardingIncomeItem] = Field(default_factory=list)
    budgets: List[OnboardingBudgetItem] = Field(default_factory=list)
    monthly_savings_target_paise: Optional[int] = Field(None, ge=0)


class OnboardingStatusResponse(BaseModel):
    onboarding_completed: bool
    monthly_savings_target_paise: Optional[int] = None
    monthly_savings_target_formatted: Optional[str] = None
    has_income_configured: bool = False
    has_budgets_configured: bool = False
    tutorial_completed: bool = False


class TutorialStatusResponse(BaseModel):
    tutorial_completed: bool


class TutorialStatusUpdate(BaseModel):
    completed: bool = True
    skipped: bool = False



class FinancialPlanSummaryResponse(BaseModel):
    monthly_income_paise: int
    monthly_income_formatted: str
    allocated_budget_paise: int
    allocated_budget_formatted: str
    planned_savings_paise: int
    planned_savings_formatted: str
    unallocated_income_paise: int
    unallocated_income_formatted: str
    actual_expense_paise: int
    actual_expense_formatted: str
    actual_savings_paise: int
    actual_savings_formatted: str
    remaining_budget_paise: int
    remaining_budget_formatted: str
    savings_rate_pct: float
    savings_target_paise: Optional[int] = None
    savings_target_formatted: Optional[str] = None
    is_budget_exceeded: bool
    is_income_exceeded_by_budget: bool
    target_met: Optional[bool] = None
