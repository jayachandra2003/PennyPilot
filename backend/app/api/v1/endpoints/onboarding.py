"""Financial Onboarding endpoints for first-time financial setup."""
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.errors import BadRequestException
from app.db.session import get_db
from app.domain.currency import format_inr
from app.domain.financial_plan import calculate_financial_plan_summary
from app.domain.timezone import get_month_boundaries, today_ist
from app.models.budget import Budget
from app.models.category import Category
from app.models.recurring import RecurringTransaction
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.onboarding import (
    FinancialPlanSummaryResponse,
    OnboardingBudgetItem,
    OnboardingIncomeItem,
    OnboardingSetupRequest,
    OnboardingStatusResponse,
    TutorialStatusResponse,
    TutorialStatusUpdate,
)

router = APIRouter()


def _parse_month(month_str: Optional[str]) -> date:
    """Parse YYYY-MM or YYYY-MM-01 string to first-day date."""
    if not month_str:
        now = today_ist()
        return date(now.year, now.month, 1)
    parts = month_str.split("-")
    if len(parts) >= 2:
        return date(int(parts[0]), int(parts[1]), 1)
    now = today_ist()
    return date(now.year, now.month, 1)


@router.get("/status", response_model=OnboardingStatusResponse)
def get_onboarding_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Check if the current user has completed onboarding,
    and whether they have active income and budget configurations.
    """
    now = today_ist()
    start_date, end_date, _ = get_month_boundaries(now.year, now.month)
    month_first = date(now.year, now.month, 1)

    has_income = (
        db.query(Transaction.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.kind == "income",
            Transaction.deleted_at.is_(None),
        )
        .first()
        is not None
    )

    has_budgets = (
        db.query(Budget.id)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == month_first,
        )
        .first()
        is not None
    )

    savings_target = getattr(current_user, "monthly_savings_target_paise", None)
    target_formatted = format_inr(savings_target) if savings_target is not None else None

    return OnboardingStatusResponse(
        onboarding_completed=bool(getattr(current_user, "onboarding_completed", False)),
        monthly_savings_target_paise=savings_target,
        monthly_savings_target_formatted=target_formatted,
        has_income_configured=has_income,
        has_budgets_configured=has_budgets,
        tutorial_completed=bool(getattr(current_user, "tutorial_completed", False)),
    )


@router.get("/tutorial", response_model=TutorialStatusResponse)
def get_tutorial_status(
    current_user: User = Depends(get_current_user),
):
    """
    Get user-scoped onboarding tutorial completion status.
    """
    return TutorialStatusResponse(
        tutorial_completed=bool(getattr(current_user, "tutorial_completed", False))
    )


@router.post("/tutorial", response_model=TutorialStatusResponse)
def update_tutorial_status(
    payload: TutorialStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user-scoped onboarding tutorial status (complete, skip, or reset for replay).
    """
    current_user.tutorial_completed = payload.completed or payload.skipped
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    return TutorialStatusResponse(
        tutorial_completed=bool(current_user.tutorial_completed)
    )



@router.post("/setup", response_model=FinancialPlanSummaryResponse)
def complete_onboarding_setup(
    setup_in: OnboardingSetupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Atomically execute first-time financial onboarding:
    1. Create initial income transaction(s) and recurring rules.
    2. Set category budgets for the target month.
    3. Save monthly savings target.
    4. Mark onboarding_completed = True.
    5. Return pure deterministic financial plan summary.
    """
    target_month_first = _parse_month(setup_in.month)
    start_date, end_date, _ = get_month_boundaries(target_month_first.year, target_month_first.month)

    # 1. Process Income Items
    total_new_income_paise = 0
    for inc in setup_in.incomes:
        if inc.amount_paise <= 0:
            continue

        total_new_income_paise += inc.amount_paise
        occ_date = inc.occurred_on or target_month_first

        # Resolve category
        cat = None
        if inc.category_id:
            cat = db.query(Category).filter(
                Category.id == inc.category_id,
                Category.user_id == current_user.id,
                Category.is_archived == False,
            ).first()

        if not cat:
            cat = db.query(Category).filter(
                Category.user_id == current_user.id,
                Category.kind == "income",
                Category.is_archived == False,
            ).first()

        if not cat:
            cat = Category(
                user_id=current_user.id,
                name="Income",
                kind="income",
                icon="banknote",
                color_token="emerald",
                sort_order=1,
            )
            db.add(cat)
            db.flush()

        recurring_id = None
        if inc.is_recurring:
            rec = RecurringTransaction(
                user_id=current_user.id,
                category_id=cat.id,
                description=f"Monthly Income: {inc.source}",
                amount_paise=inc.amount_paise,
                cadence="monthly",
                next_due=occ_date,
                detected_or_manual="manual",
                is_active=True,
            )
            db.add(rec)
            db.flush()
            recurring_id = rec.id

        tx = Transaction(
            user_id=current_user.id,
            category_id=cat.id,
            kind="income",
            amount_paise=inc.amount_paise,
            occurred_on=occ_date,
            description=inc.description or inc.source,
            merchant=inc.source,
            source="manual",
            recurring_id=recurring_id,
        )
        db.add(tx)

    # 2. Process Budgets
    total_allocated_budget_paise = 0
    for b_in in setup_in.budgets:
        if b_in.limit_paise < 0:
            continue
        total_allocated_budget_paise += b_in.limit_paise

        existing_budget = db.query(Budget).filter(
            Budget.user_id == current_user.id,
            Budget.category_id == b_in.category_id,
            Budget.month == target_month_first,
        ).first()

        if existing_budget:
            existing_budget.limit_paise = b_in.limit_paise
            existing_budget.updated_at = datetime.now(timezone.utc)
        else:
            new_b = Budget(
                user_id=current_user.id,
                category_id=b_in.category_id,
                month=target_month_first,
                limit_paise=b_in.limit_paise,
            )
            db.add(new_b)

    # 3. Update User Onboarding & Savings Target
    current_user.onboarding_completed = True
    if setup_in.monthly_savings_target_paise is not None:
        current_user.monthly_savings_target_paise = setup_in.monthly_savings_target_paise

    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()

    # 4. Compute Financial Plan Summary
    # Calculate actual expenses for the month
    expense_txs = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.kind == "expense",
            Transaction.deleted_at.is_(None),
            Transaction.occurred_on >= start_date,
            Transaction.occurred_on <= end_date,
        )
        .all()
    )
    actual_expense_paise = sum(t.amount_paise for t in expense_txs)

    # Calculate total income for month
    income_txs = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.kind == "income",
            Transaction.deleted_at.is_(None),
            Transaction.occurred_on >= start_date,
            Transaction.occurred_on <= end_date,
        )
        .all()
    )
    total_income_paise = sum(t.amount_paise for t in income_txs)

    summary_dict = calculate_financial_plan_summary(
        monthly_income_paise=total_income_paise,
        allocated_budget_paise=total_allocated_budget_paise,
        actual_expense_paise=actual_expense_paise,
        savings_target_paise=current_user.monthly_savings_target_paise,
    )

    from app.services.notification_service import create_notification
    create_notification(
        db=db,
        user_id=current_user.id,
        category="account",
        title="Financial Setup Completed",
        message=f"Your financial architecture is active. Monthly inflow: {summary_dict['monthly_income_formatted']}, Budget ceiling: {summary_dict['allocated_budget_formatted']}.",
        link_path="/budgets",
    )

    return FinancialPlanSummaryResponse(**summary_dict)


@router.post("/skip")
def skip_onboarding(
    current_user: User = Depends(get_current_user),
):
    """
    Dismiss the onboarding wizard without completing it.
    Does NOT block any application features. A non-intrusive reminder banner
    will be shown on the Dashboard.
    """
    return {
        "status": "skipped",
        "message": "Financial onboarding deferred. You can complete setup anytime from your dashboard.",
        "onboarding_completed": bool(getattr(current_user, "onboarding_completed", False)),
    }


@router.get("/plan-summary", response_model=FinancialPlanSummaryResponse)
def get_financial_plan_summary_endpoint(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get deterministic financial plan summary for a given month.
    Combines total monthly income, total allocated budgets, actual expenses,
    and user savings target.
    """
    now = today_ist()
    y = year or now.year
    m = month or now.month
    start_date, end_date, _ = get_month_boundaries(y, m)
    month_first = date(y, m, 1)

    # Total income for month
    income_txs = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.kind == "income",
            Transaction.deleted_at.is_(None),
            Transaction.occurred_on >= start_date,
            Transaction.occurred_on <= end_date,
        )
        .all()
    )
    total_income_paise = sum(t.amount_paise for t in income_txs)

    # Total allocated budgets for month
    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == month_first,
        )
        .all()
    )
    total_budget_paise = sum(b.limit_paise for b in budgets)

    # Actual expenses for month
    expense_txs = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.kind == "expense",
            Transaction.deleted_at.is_(None),
            Transaction.occurred_on >= start_date,
            Transaction.occurred_on <= end_date,
        )
        .all()
    )
    actual_expense_paise = sum(t.amount_paise for t in expense_txs)

    summary_dict = calculate_financial_plan_summary(
        monthly_income_paise=total_income_paise,
        allocated_budget_paise=total_budget_paise,
        actual_expense_paise=actual_expense_paise,
        savings_target_paise=getattr(current_user, "monthly_savings_target_paise", None),
    )

    return FinancialPlanSummaryResponse(**summary_dict)
