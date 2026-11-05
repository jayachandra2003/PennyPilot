"""Transactions router with user-isolated queries and domain aggregations."""
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.errors import NotFoundException
from app.db.session import get_db
from app.domain.aggregates import calculate_monthly_aggregation
from app.domain.anomaly import detect_anomalies_mad
from app.domain.budget_engine import calculate_budget_pace
from app.domain.timezone import today_ist
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.domain import AnomalyReportResponse, BudgetPaceResponse, MonthlySummaryResponse
from app.schemas.transaction import TransactionCreate, TransactionResponse

router = APIRouter()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new transaction strictly scoped to the authenticated user."""
    # Verify category belongs to user
    category = (
        db.query(Category)
        .filter(Category.id == tx_in.category_id, Category.user_id == current_user.id)
        .first()
    )
    if not category:
        raise NotFoundException(message="Category not found for this user", code="CATEGORY_NOT_FOUND")

    tx = Transaction(
        user_id=current_user.id,
        category_id=category.id,
        kind=tx_in.kind,
        amount_paise=tx_in.amount_paise,
        occurred_on=tx_in.occurred_on,
        description=tx_in.description.strip(),
        merchant=tx_in.merchant.strip() if tx_in.merchant else None,
        note=tx_in.note,
        source=tx_in.source,
        nl_original_text=tx_in.nl_original_text,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return TransactionResponse.model_validate(tx)


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[str] = None,
    kind: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List active transactions for the authenticated user with optional filters."""
    query = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.deleted_at == None,
    )

    if start_date:
        query = query.filter(Transaction.occurred_on >= start_date)
    if end_date:
        query = query.filter(Transaction.occurred_on <= end_date)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if kind:
        query = query.filter(Transaction.kind == kind)

    transactions = query.order_by(Transaction.occurred_on.desc(), Transaction.created_at.desc()).limit(limit).all()
    return [TransactionResponse.model_validate(t) for t in transactions]


@router.get("/summary", response_model=MonthlySummaryResponse)
def get_monthly_summary(
    year: int = Query(default=2026),
    month: int = Query(default=11, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get verified, deterministic monthly totals and category breakdowns."""
    txs = (
        db.query(Transaction)
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.deleted_at == None,
        )
        .all()
    )

    # Attach category_name for breakdown aggregation
    tx_dicts = []
    for t in txs:
        tx_dicts.append({
            "kind": t.kind,
            "amount_paise": t.amount_paise,
            "occurred_on": t.occurred_on,
            "category_id": t.category_id,
            "category_name": t.category.name if t.category else "Uncategorized",
            "deleted_at": t.deleted_at,
        })

    summary = calculate_monthly_aggregation(tx_dicts, year, month)
    return MonthlySummaryResponse(**summary)


@router.get("/pace", response_model=BudgetPaceResponse)
def get_budget_pace(
    year: int = Query(default=2026),
    month: int = Query(default=11, ge=1, le=12),
    as_of: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get deterministic budget pacing projection through the month."""
    month_first = date(year, month, 1)
    as_of_date = as_of or today_ist()

    # Get overall monthly budget or sum of category budgets
    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == month_first,
        )
        .all()
    )
    total_budget_paise = sum(b.limit_paise for b in budgets) if budgets else 5000000  # Default ₹50,000 if unset

    # Calculate month spent
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.deleted_at == None,
            Transaction.kind == "expense",
            Transaction.occurred_on >= month_first,
            Transaction.occurred_on <= as_of_date,
        )
        .all()
    )
    spent_paise = sum(t.amount_paise for t in txs)

    pace = calculate_budget_pace(
        spent_paise=spent_paise,
        limit_paise=total_budget_paise,
        as_of_date=as_of_date,
        month_first_day=month_first,
    )
    return BudgetPaceResponse(**pace)


@router.get("/anomalies", response_model=AnomalyReportResponse)
def get_anomalies(
    threshold: float = Query(default=3.0, ge=1.5, le=5.0),
    min_history: int = Query(default=5, ge=3),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Detect statistical spending anomalies using Median Absolute Deviation (MAD)."""
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.deleted_at == None,
            Transaction.kind == "expense",
        )
        .all()
    )
    res = detect_anomalies_mad(txs, threshold_multiplier=threshold, min_history=min_history)
    return AnomalyReportResponse(**res)
