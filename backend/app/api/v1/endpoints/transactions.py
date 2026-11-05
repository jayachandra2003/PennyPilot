"""Transactions router with user-isolated queries, NL parsing, and bulk operations."""
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.errors import BadRequestException, NotFoundException
from app.db.session import get_db
from app.domain.aggregates import calculate_monthly_aggregation
from app.domain.anomaly import detect_anomalies_mad
from app.domain.budget_engine import calculate_budget_pace
from app.domain.nl_parser import parse_expense_phrase
from app.domain.timezone import today_ist
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.domain import AnomalyReportResponse, BudgetPaceResponse, MonthlySummaryResponse
from app.schemas.transaction import (
    BulkTransactionCreate,
    NLParseRequest,
    NLParseResponse,
    ParsedDraftItem,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter()


@router.post("/parse", response_model=NLParseResponse)
def parse_natural_language_expense(
    parse_in: NLParseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Two-stage natural language expense parser.
    Stage 1: Deterministic Indian currency & keyword rules (sub-millisecond).
    Returns draft transactions with confidence ratings and editable review flags.
    """
    categories = (
        db.query(Category)
        .filter(Category.user_id == current_user.id, Category.is_archived == False)
        .all()
    )
    cat_dicts = [{"id": c.id, "name": c.name, "kind": c.kind} for c in categories]

    # Stage 1: Deterministic Rule Parser
    drafts = parse_expense_phrase(
        text=parse_in.text,
        user_categories=cat_dicts,
        reference_date=today_ist(),
    )

    parsed_items = [ParsedDraftItem(**d) for d in drafts]

    return NLParseResponse(
        raw_text=parse_in.text,
        drafts=parsed_items,
        parser_tier="rules",
    )


@router.post("/bulk", response_model=List[TransactionResponse], status_code=status.HTTP_201_CREATED)
def create_transactions_bulk(
    bulk_in: BulkTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Atomic bulk save of reviewed natural-language drafts or imported items.
    If any single transaction fails validation, the entire batch is rolled back.
    """
    # Fetch valid user category IDs
    user_cat_ids = {
        c.id for c in db.query(Category.id).filter(Category.user_id == current_user.id).all()
    }

    created_txs = []
    try:
        for item in bulk_in.transactions:
            if item.category_id not in user_cat_ids:
                raise BadRequestException(
                    message=f"Category '{item.category_id}' does not exist for this user",
                    code="INVALID_CATEGORY",
                )

            tx = Transaction(
                user_id=current_user.id,
                category_id=item.category_id,
                kind=item.kind,
                amount_paise=item.amount_paise,
                occurred_on=item.occurred_on,
                description=item.description.strip(),
                merchant=item.merchant.strip() if item.merchant else None,
                note=item.note,
                source=item.source,
                nl_original_text=item.nl_original_text,
            )
            db.add(tx)
            created_txs.append(tx)

        db.commit()
        for tx in created_txs:
            db.refresh(tx)

        # Attach category_name for response serialization
        cat_map = {c.id: c.name for c in db.query(Category).filter(Category.user_id == current_user.id).all()}
        results = []
        for tx in created_txs:
            resp = TransactionResponse.model_validate(tx)
            resp.category_name = cat_map.get(tx.category_id, "Expense")
            results.append(resp)

        return results
    except Exception as e:
        db.rollback()
        if isinstance(e, BadRequestException):
            raise e
        raise BadRequestException(message=f"Bulk save failed: {str(e)}", code="BULK_SAVE_FAILED")


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new manual transaction strictly scoped to the authenticated user."""
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

    resp = TransactionResponse.model_validate(tx)
    resp.category_name = category.name
    return resp


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[str] = None,
    kind: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List active transactions for the authenticated user with search and filters."""
    query = (
        db.query(Transaction, Category.name.label("category_name"))
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.deleted_at == None,
        )
    )

    if start_date:
        query = query.filter(Transaction.occurred_on >= start_date)
    if end_date:
        query = query.filter(Transaction.occurred_on <= end_date)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if kind:
        query = query.filter(Transaction.kind == kind)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (Transaction.description.ilike(search_term)) |
            (Transaction.merchant.ilike(search_term))
        )

    rows = query.order_by(Transaction.occurred_on.desc(), Transaction.created_at.desc()).limit(limit).all()

    results = []
    for tx, cat_name in rows:
        resp = TransactionResponse.model_validate(tx)
        resp.category_name = cat_name
        results.append(resp)
    return results


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

    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == month_first,
        )
        .all()
    )
    total_budget_paise = sum(b.limit_paise for b in budgets) if budgets else 5000000

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


@router.get("/{id}", response_model=TransactionResponse)
def get_transaction(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single transaction by ID scoped to current user."""
    row = (
        db.query(Transaction, Category.name.label("category_name"))
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.id == id,
            Transaction.user_id == current_user.id,
            Transaction.deleted_at == None,
        )
        .first()
    )
    if not row:
        raise NotFoundException(message="Transaction not found", code="TRANSACTION_NOT_FOUND")

    tx, cat_name = row
    resp = TransactionResponse.model_validate(tx)
    resp.category_name = cat_name
    return resp


@router.patch("/{id}", response_model=TransactionResponse)
def update_transaction(
    id: str,
    tx_in: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing transaction."""
    tx = (
        db.query(Transaction)
        .filter(
            Transaction.id == id,
            Transaction.user_id == current_user.id,
            Transaction.deleted_at == None,
        )
        .first()
    )
    if not tx:
        raise NotFoundException(message="Transaction not found", code="TRANSACTION_NOT_FOUND")

    if tx_in.category_id is not None:
        cat = db.query(Category).filter(Category.id == tx_in.category_id, Category.user_id == current_user.id).first()
        if not cat:
            raise NotFoundException(message="Category not found", code="CATEGORY_NOT_FOUND")
        tx.category_id = cat.id

    if tx_in.amount_paise is not None:
        tx.amount_paise = tx_in.amount_paise
    if tx_in.description is not None:
        tx.description = tx_in.description.strip()
    if tx_in.occurred_on is not None:
        tx.occurred_on = tx_in.occurred_on
    if tx_in.kind is not None:
        tx.kind = tx_in.kind
    if tx_in.merchant is not None:
        tx.merchant = tx_in.merchant.strip() if tx_in.merchant else None
    if tx_in.note is not None:
        tx.note = tx_in.note

    tx.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tx)

    cat_name = db.query(Category.name).filter(Category.id == tx.category_id).scalar()
    resp = TransactionResponse.model_validate(tx)
    resp.category_name = cat_name
    return resp


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a transaction to preserve auditable ledger history."""
    tx = (
        db.query(Transaction)
        .filter(
            Transaction.id == id,
            Transaction.user_id == current_user.id,
            Transaction.deleted_at == None,
        )
        .first()
    )
    if not tx:
        raise NotFoundException(message="Transaction not found", code="TRANSACTION_NOT_FOUND")

    tx.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return None
