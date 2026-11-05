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


class MonthlySummaryResponse(BaseModel):
    year: int
    month: int
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
