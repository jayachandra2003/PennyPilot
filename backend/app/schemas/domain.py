"""Financial Intelligence & Domain schema representations."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class CategoryBreakdownItem(BaseModel):
    category_id: str
    category_name: str
    total_paise: int
    total_rupees: float
    formatted_total: str
    percentage: float
    transaction_count: int


class YearlyMonthTrajectoryItem(BaseModel):
    month: int
    month_name: str
    income_paise: int
    income_formatted: str
    expense_paise: int
    expense_formatted: str
    net_balance_paise: int
    net_balance_formatted: str
    savings_rate_percent: float
    transaction_count: int


class MonthlySummaryResponse(BaseModel):
    period: str = "monthly"
    year: int
    month: Optional[int] = None
    first_day: str
    last_day: str
    total_days: int
    transaction_count: int
    income_paise: int
    income_formatted: str
    expense_paise: int
    expense_formatted: str
    net_balance_paise: int
    net_balance_formatted: str
    savings_rate_percent: float
    category_breakdown: List[CategoryBreakdownItem]
    monthly_trajectory: Optional[List[YearlyMonthTrajectoryItem]] = None


class BudgetPaceResponse(BaseModel):
    spent_paise: int
    spent_formatted: str
    limit_paise: int
    limit_formatted: str
    remaining_paise: int
    remaining_formatted: str
    overrun_paise: int
    overrun_formatted: str
    utilization_percent: float
    is_over_budget: bool
    as_of_date: str
    total_days: int
    elapsed_days: int
    remaining_days: int
    target_pace_paise: int
    target_pace_formatted: str
    projected_total_paise: int
    projected_total_formatted: str
    projected_overrun_paise: int
    projected_overrun_formatted: str
    status: str
    verdict_sentence: str


class AnomalyItem(BaseModel):
    transaction_id: str
    description: str
    date: str
    amount_paise: int
    amount_formatted: str
    baseline_median_paise: int
    baseline_median_formatted: str
    modified_z_score: float
    multiple_of_median: float
    evidence: str


class AnomalyReportResponse(BaseModel):
    status: str
    sample_size: Optional[int] = None
    baseline_median_paise: Optional[int] = None
    baseline_median_formatted: Optional[str] = None
    mad_paise: Optional[int] = None
    anomalies_count: int = 0
    anomalies: List[AnomalyItem] = []


class HistoricalMonthSummary(BaseModel):
    year: int
    month: int
    month_name: str
    month_short: str
    first_day: str
    last_day: str
    total_days: int
    transaction_count: int
    is_empty: bool
    income_paise: int
    income_formatted: str
    expense_paise: int
    expense_formatted: str
    net_balance_paise: int
    net_balance_formatted: str
    savings_rate_percent: float
    category_breakdown: List[CategoryBreakdownItem]
    expense_mom_delta_paise: Optional[int] = None
    expense_mom_delta_formatted: Optional[str] = None
    expense_mom_pct: Optional[float] = None
    income_mom_delta_paise: Optional[int] = None
    income_mom_delta_formatted: Optional[str] = None
    income_mom_pct: Optional[float] = None
    savings_rate_mom_delta: Optional[float] = None


class HistoricalAnalyticsOverall(BaseModel):
    total_income_paise: int
    total_income_formatted: str
    total_expense_paise: int
    total_expense_formatted: str
    total_net_savings_paise: int
    total_net_savings_formatted: str
    average_monthly_income_paise: int
    average_monthly_income_formatted: str
    average_monthly_expense_paise: int
    average_monthly_expense_formatted: str
    average_monthly_savings_paise: int
    average_monthly_savings_formatted: str
    overall_savings_rate_percent: float
    months_count: int
    active_months_count: int
    top_categories: List[CategoryBreakdownItem]


class HistoricalAnalyticsResponse(BaseModel):
    months: List[HistoricalMonthSummary]
    overall: HistoricalAnalyticsOverall

