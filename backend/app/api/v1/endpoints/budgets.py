"""Budgets router with spending pace and per-category utilization."""
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.domain.budget_engine import calculate_budget_pace, calculate_budget_utilization
from app.domain.currency import format_inr
from app.domain.timezone import get_month_boundaries, today_ist
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.budget import (
    BudgetBatchUpdateRequest,
    BudgetResponse,
    CategoryBudgetStatus,
    MonthlyBudgetOverview,
)

router = APIRouter()


@router.get("", response_model=MonthlyBudgetOverview)
def get_monthly_budgets(
    year: int = Query(default=2026),
    month: int = Query(default=11, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get monthly budget overview with real-time utilization and pace for every category.
    """
    first_day, last_day, total_days = get_month_boundaries(year, month)
    as_of = today_ist() if (year == today_ist().year and month == today_ist().month) else last_day

    # 1. Fetch user's active expense categories
    categories = (
        db.query(Category)
        .filter(Category.user_id == current_user.id, Category.kind == "expense", Category.is_archived == False)
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .all()
    )

    # 2. Fetch existing budget limits for this month
    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id, Budget.month == first_day)
        .all()
    )
    budget_map = {b.category_id: b.limit_paise for b in budgets if b.category_id}

    # 3. Calculate category spending in this month
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.deleted_at == None,
            Transaction.kind == "expense",
            Transaction.occurred_on >= first_day,
            Transaction.occurred_on <= last_day,
        )
        .all()
    )
    spend_map = {}
    for t in transactions:
        spend_map[t.category_id] = spend_map.get(t.category_id, 0) + t.amount_paise

    cat_statuses: List[CategoryBudgetStatus] = []
    total_limit = 0
    total_spent = 0

    for cat in categories:
        limit = budget_map.get(cat.id, 0)
        spent = spend_map.get(cat.id, 0)
        total_limit += limit
        total_spent += spent

        if limit > 0:
            pace_data = calculate_budget_pace(spent, limit, as_of_date=as_of, month_first_day=first_day)
            status_str = pace_data["status"]
            rem = pace_data["remaining_paise"]
            util = pace_data["utilization_percent"]
        else:
            status_str = "no_budget" if spent == 0 else "unbudgeted"
            rem = 0
            util = 0.0

        cat_statuses.append(CategoryBudgetStatus(
            category_id=cat.id,
            category_name=cat.name,
            icon=cat.icon,
            color_token=cat.color_token,
            limit_paise=limit,
            limit_formatted=format_inr(limit),
            spent_paise=spent,
            spent_formatted=format_inr(spent),
            remaining_paise=rem,
            remaining_formatted=format_inr(rem),
            utilization_percent=util,
            status=status_str,
        ))

    overall_util = round((total_spent / total_limit * 100.0), 2) if total_limit > 0 else 0.0
    overall_rem = max(0, total_limit - total_spent)

    return MonthlyBudgetOverview(
        month=first_day.strftime("%Y-%m"),
        total_limit_paise=total_limit,
        total_limit_formatted=format_inr(total_limit),
        total_spent_paise=total_spent,
        total_spent_formatted=format_inr(total_spent),
        remaining_paise=overall_rem,
        remaining_formatted=format_inr(overall_rem),
        utilization_percent=overall_util,
        category_budgets=cat_statuses,
    )


@router.put("", response_model=MonthlyBudgetOverview)
def set_monthly_budgets(
    batch_in: BudgetBatchUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Set or update budget limits for categories for a target month.
    """
    month_normalized = date(batch_in.month.year, batch_in.month.month, 1)

    for item in batch_in.budgets:
        if not item.category_id:
            continue

        existing = (
            db.query(Budget)
            .filter(
                Budget.user_id == current_user.id,
                Budget.category_id == item.category_id,
                Budget.month == month_normalized,
            )
            .first()
        )

        if item.limit_paise > 0:
            if existing:
                existing.limit_paise = item.limit_paise
            else:
                new_budget = Budget(
                    user_id=current_user.id,
                    category_id=item.category_id,
                    month=month_normalized,
                    limit_paise=item.limit_paise,
                )
                db.add(new_budget)
        else:
            if existing:
                db.delete(existing)

    db.commit()

    return get_monthly_budgets(
        year=month_normalized.year,
        month=month_normalized.month,
        db=db,
        current_user=current_user,
    )
