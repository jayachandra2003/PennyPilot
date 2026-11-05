"""API router for Grounded AI Financial Copilot and Monthly Intelligence Reports."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.rate_limiter import copilot_rate_limiter
from app.db.session import get_db
from app.domain.copilot import FactBundleBuilder, IntentClassifier
from app.domain.narrative import MonthlyNarrativeReportGenerator
from app.models.category import Category
from app.models.user import User
from app.schemas.copilot import (
    AIProviderStatusResponse,
    CopilotQueryRequest,
    CopilotQueryResponse,
    MonthlyReportResponse,
)
from app.services.ai_client import ai_service

router = APIRouter()


@router.get("/status", response_model=AIProviderStatusResponse)
async def get_ai_status(current_user: User = Depends(get_current_user)):
    """Check live status and active tier of the 3-Tier AI Fallback Chain."""
    status_info = await ai_service.get_provider_status()
    return AIProviderStatusResponse(**status_info)


@router.post("/query", response_model=CopilotQueryResponse)
async def ask_copilot(
    query_in: CopilotQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Query the Grounded AI Financial Copilot.
    Enforces:
    - User rate limiting (15 queries/min)
    - Compute, Then Explain (Zero financial hallucination)
    - Multi-tenant data isolation
    - Verified FactBundle evidence attachment
    """
    # 1. Rate Limiting Check
    copilot_rate_limiter.check(current_user.id)

    year = query_in.year or 2026
    month = query_in.month or 11

    # 2. Get user categories for context
    categories = (
        db.query(Category)
        .filter(Category.user_id == current_user.id, Category.is_archived == False)
        .all()
    )
    cat_dicts = [{"id": c.id, "name": c.name, "kind": c.kind} for c in categories]

    # 3. Classify question intent
    intent, target_cat = IntentClassifier.classify(query_in.query, cat_dicts)

    # 4. Gather verified FactBundle
    fact_bundle = FactBundleBuilder.build(
        db=db,
        user_id=current_user.id,
        year=year,
        month=month,
        question=query_in.query,
    )

    # 5. Generate grounded response with multi-tier fallback
    res = await ai_service.generate_grounded_answer(
        question=query_in.query,
        facts=fact_bundle,
        intent=intent,
        target_cat=target_cat,
    )

    disclaimer = (
        "PennyPilot calculates figures strictly from your verified ledger records. "
        "This analysis is provided for budgeting intelligence and does not constitute SEBI-registered financial advice."
    )

    return CopilotQueryResponse(
        query=query_in.query,
        answer=res["answer"],
        intent=intent,
        target_category=target_cat,
        provider=res["provider"],
        tier=res["tier"],
        evidence=fact_bundle,
        disclaimer=disclaimer,
    )


@router.get("/monthly-report", response_model=MonthlyReportResponse)
async def get_monthly_report(
    year: int = Query(default=2026, ge=2020, le=2030),
    month: int = Query(default=11, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate structured monthly intelligence report separating Measured Facts from AI Guidance."""
    copilot_rate_limiter.check(current_user.id)

    report = MonthlyNarrativeReportGenerator.generate(
        db=db,
        user_id=current_user.id,
        year=year,
        month=month,
    )
    return MonthlyReportResponse(**report)
