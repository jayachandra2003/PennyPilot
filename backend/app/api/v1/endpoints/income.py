"""Income management endpoints reusing the existing transactions table (kind='income')."""
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.errors import BadRequestException, NotFoundException
from app.db.session import get_db
from app.domain.currency import format_inr
from app.domain.timezone import get_month_boundaries, today_ist
from app.models.category import Category
from app.models.recurring import RecurringTransaction
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.income import (
    IncomeCreate,
    IncomeResponse,
    IncomeUpdate,
    MonthlyIncomeOverview,
    SourceBreakdownItem,
)

router = APIRouter()


def _resolve_income_category(db: Session, user_id: str, category_id: Optional[str], source: str) -> Category:
    """Find or assign an appropriate user-isolated income category."""
    if category_id:
        cat = db.query(Category).filter(
            Category.id == category_id,
            Category.user_id == user_id,
            Category.is_archived == False,
        ).first()
        if not cat:
            raise NotFoundException(message="Income category not found", code="CATEGORY_NOT_FOUND")
        return cat

    # Keyword heuristic matching
    source_lower = source.lower()
    target_name = "Salary" if any(w in source_lower for w in ["salary", "payroll", "stipend", "wages"]) else (
        "Investments" if any(w in source_lower for w in ["invest", "dividend", "interest", "stock", "crypto", "mutual"]) else "Freelance / Other"
    )

    cat = db.query(Category).filter(
        Category.user_id == user_id,
        Category.kind == "income",
        Category.name == target_name,
        Category.is_archived == False,
    ).first()

    if not cat:
        # Fallback to any active income category
        cat = db.query(Category).filter(
            Category.user_id == user_id,
            Category.kind == "income",
            Category.is_archived == False,
        ).first()

    if not cat:
        # If user has no income category, create one
        cat = Category(
            user_id=user_id,
            name="Income",
            kind="income",
            icon="banknote",
            color_token="emerald",
            sort_order=1,
        )
        db.add(cat)
        db.flush()

    return cat


@router.get("", response_model=MonthlyIncomeOverview)
def get_monthly_income_overview(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    period: str = Query(default="monthly", pattern="^(monthly|yearly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all active income transactions for a specific month or year,
    with source breakdown, total sum in integer paise, and INR formatting.
    """
    now = today_ist()
    y = year or now.year

    if period == "yearly":
        start_date = date(y, 1, 1)
        end_date = date(y, 12, 31)
        period_label = str(y)
    else:
        m = month or now.month
        start_date, end_date, _ = get_month_boundaries(y, m)
        period_label = f"{y}-{m:02d}"

    txs = (
        db.query(Transaction, Category.name.label("category_name"))
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.kind == "income",
            Transaction.deleted_at.is_(None),
            Transaction.occurred_on >= start_date,
            Transaction.occurred_on <= end_date,
        )
        .order_by(Transaction.occurred_on.desc(), Transaction.created_at.desc())
        .all()
    )

    items: List[IncomeResponse] = []
    source_totals: dict[str, int] = {}
    source_counts: dict[str, int] = {}
    total_income_paise = 0

    for tx, cat_name in txs:
        total_income_paise += tx.amount_paise
        src = (tx.merchant or "Other Income").strip()
        source_totals[src] = source_totals.get(src, 0) + tx.amount_paise
        source_counts[src] = source_counts.get(src, 0) + 1

        items.append(
            IncomeResponse(
                id=tx.id,
                amount_paise=tx.amount_paise,
                amount_formatted=format_inr(tx.amount_paise),
                source=src,
                category_id=tx.category_id,
                category_name=cat_name,
                occurred_on=tx.occurred_on,
                description=tx.description or src,
                is_recurring=tx.recurring_id is not None,
                created_at=tx.created_at,
            )
        )

    # Source breakdown
    breakdown: List[SourceBreakdownItem] = []
    for src, amt in sorted(source_totals.items(), key=lambda x: x[1], reverse=True):
        pct = round((amt / total_income_paise * 100.0), 2) if total_income_paise > 0 else 0.0
        breakdown.append(
            SourceBreakdownItem(
                source=src,
                total_paise=amt,
                total_formatted=format_inr(amt),
                count=source_counts[src],
                percentage=pct,
            )
        )

    # Calculate projected annual recurring income from active recurring transactions
    from app.models.recurring import RecurringTransaction
    recurring_rules = (
        db.query(RecurringTransaction)
        .join(Category, RecurringTransaction.category_id == Category.id)
        .filter(
            RecurringTransaction.user_id == current_user.id,
            Category.kind == "income",
            RecurringTransaction.is_active.is_(True),
        )
        .all()
    )
    monthly_recurring_paise = sum(r.amount_paise for r in recurring_rules)
    projected_annual_paise = monthly_recurring_paise * 12 if monthly_recurring_paise > 0 else None

    return MonthlyIncomeOverview(
        period=period,
        period_label=period_label,
        month=period_label,
        total_income_paise=total_income_paise,
        total_income_formatted=format_inr(total_income_paise),
        projected_recurring_annual_paise=projected_annual_paise,
        projected_recurring_annual_formatted=format_inr(projected_annual_paise) if projected_annual_paise else None,
        items=items,
        sources_breakdown=breakdown,
    )


@router.post("", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def create_income_record(
    income_in: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record an income entry in integer paise.
    Reuses the existing Transaction table with kind='income'.
    Creates an optional RecurringTransaction rule if is_recurring=True.
    """
    category = _resolve_income_category(db, current_user.id, income_in.category_id, income_in.source)

    recurring_id = None
    if income_in.is_recurring:
        rec = RecurringTransaction(
            user_id=current_user.id,
            category_id=category.id,
            description=f"Monthly Income: {income_in.source}",
            amount_paise=income_in.amount_paise,
            cadence="monthly",
            next_due=income_in.occurred_on,
            detected_or_manual="manual",
            is_active=True,
        )
        db.add(rec)
        db.flush()
        recurring_id = rec.id

    desc = (income_in.description or income_in.source).strip()
    tx = Transaction(
        user_id=current_user.id,
        category_id=category.id,
        kind="income",
        amount_paise=income_in.amount_paise,
        occurred_on=income_in.occurred_on,
        description=desc,
        merchant=income_in.source.strip(),
        source="manual",
        recurring_id=recurring_id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    return IncomeResponse(
        id=tx.id,
        amount_paise=tx.amount_paise,
        amount_formatted=format_inr(tx.amount_paise),
        source=tx.merchant or income_in.source,
        category_id=category.id,
        category_name=category.name,
        occurred_on=tx.occurred_on,
        description=tx.description,
        is_recurring=income_in.is_recurring,
        created_at=tx.created_at,
    )


@router.put("/{id}", response_model=IncomeResponse)
def update_income_record(
    id: str,
    income_in: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing income record."""
    tx = (
        db.query(Transaction)
        .filter(
            Transaction.id == id,
            Transaction.user_id == current_user.id,
            Transaction.kind == "income",
            Transaction.deleted_at.is_(None),
        )
        .first()
    )
    if not tx:
        raise NotFoundException(message="Income record not found", code="INCOME_NOT_FOUND")

    if income_in.source is not None:
        tx.merchant = income_in.source.strip()
    if income_in.description is not None:
        tx.description = income_in.description.strip()
    if income_in.amount_paise is not None:
        tx.amount_paise = income_in.amount_paise
    if income_in.occurred_on is not None:
        tx.occurred_on = income_in.occurred_on
    if income_in.category_id is not None:
        category = _resolve_income_category(db, current_user.id, income_in.category_id, tx.merchant or "")
        tx.category_id = category.id

    if income_in.is_recurring is not None:
        if income_in.is_recurring and not tx.recurring_id:
            rec = RecurringTransaction(
                user_id=current_user.id,
                category_id=tx.category_id,
                description=f"Monthly Income: {tx.merchant or 'Income'}",
                amount_paise=tx.amount_paise,
                cadence="monthly",
                next_due=tx.occurred_on,
                detected_or_manual="manual",
                is_active=True,
            )
            db.add(rec)
            db.flush()
            tx.recurring_id = rec.id
        elif not income_in.is_recurring and tx.recurring_id:
            rec = db.query(RecurringTransaction).filter(RecurringTransaction.id == tx.recurring_id).first()
            if rec:
                rec.is_active = False
            tx.recurring_id = None

    tx.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tx)

    cat = db.query(Category).filter(Category.id == tx.category_id).first()
    cat_name = cat.name if cat else "Income"

    return IncomeResponse(
        id=tx.id,
        amount_paise=tx.amount_paise,
        amount_formatted=format_inr(tx.amount_paise),
        source=tx.merchant or "Income",
        category_id=tx.category_id,
        category_name=cat_name,
        occurred_on=tx.occurred_on,
        description=tx.description,
        is_recurring=tx.recurring_id is not None,
        created_at=tx.created_at,
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income_record(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete an income transaction."""
    tx = (
        db.query(Transaction)
        .filter(
            Transaction.id == id,
            Transaction.user_id == current_user.id,
            Transaction.kind == "income",
            Transaction.deleted_at.is_(None),
        )
        .first()
    )
    if not tx:
        raise NotFoundException(message="Income record not found", code="INCOME_NOT_FOUND")

    tx.deleted_at = datetime.now(timezone.utc)
    if tx.recurring_id:
        rec = db.query(RecurringTransaction).filter(RecurringTransaction.id == tx.recurring_id).first()
        if rec:
            rec.is_active = False

    db.commit()
    return None
