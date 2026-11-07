"""Pydantic schemas for AI Financial Copilot and Grounded FactBundles."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CopilotQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500, description="Natural language financial question.")
    year: Optional[int] = Field(default=2026, ge=2020, le=2030)
    month: Optional[int] = Field(default=11, ge=1, le=12)


class NavigationAction(BaseModel):
    label: str
    target: str
    section: Optional[str] = None


class CopilotQueryResponse(BaseModel):
    query: str
    answer: str
    intent: str
    target_category: Optional[str] = None
    provider: str
    tier: int
    evidence: Dict[str, Any]
    disclaimer: str
    navigation_action: Optional[NavigationAction] = None


class MonthlyReportResponse(BaseModel):
    year: int
    month: int
    title: str
    health_status: str
    executive_summary: str
    measured_facts: Dict[str, Any]
    category_shifts: List[str]
    anomalies: List[Dict[str, Any]]
    recommendations: List[str]
    disclaimer: str


class AIProviderStatusResponse(BaseModel):
    active_provider: str
    active_tier: int
    display_name: str
    providers: Dict[str, Any]
