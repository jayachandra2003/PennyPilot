"""Categories router with multi-tenant user isolation."""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.api.v1.endpoints.auth import DEFAULT_CATEGORIES
from app.core.errors import BadRequestException, NotFoundException
from app.db.session import get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter()

DEFAULT_CATEGORY_PAIRS = {(c["name"].strip().lower(), c["kind"]) for c in DEFAULT_CATEGORIES}


def _is_default_category(name: str, kind: str) -> bool:
    return (name.strip().lower(), kind) in DEFAULT_CATEGORY_PAIRS


@router.get("", response_model=List[CategoryResponse])
def list_categories(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List categories owned by the authenticated user with metadata."""
    query = db.query(Category).filter(Category.user_id == current_user.id)
    if not include_archived:
        query = query.filter(Category.is_archived == False)

    categories = query.order_by(Category.kind.desc(), Category.sort_order.asc(), Category.name.asc()).all()

    # Aggregate active transaction counts per category
    tx_counts = dict(
        db.query(Transaction.category_id, func.count(Transaction.id))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.deleted_at.is_(None),
        )
        .group_by(Transaction.category_id)
        .all()
    )

    # Active budget category IDs
    active_budget_cat_ids = set(
        row[0]
        for row in db.query(Budget.category_id)
        .filter(
            Budget.user_id == current_user.id,
            Budget.limit_paise > 0,
        )
        .distinct()
        .all()
    )

    results = []
    for c in categories:
        resp = CategoryResponse.model_validate(c)
        resp.transaction_count = tx_counts.get(c.id, 0)
        resp.has_active_budget = c.id in active_budget_cat_ids
        resp.is_default = _is_default_category(c.name, c.kind)
        results.append(resp)

    return results


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom category for the user."""
    existing = (
        db.query(Category)
        .filter(
            Category.user_id == current_user.id,
            Category.name.ilike(cat_in.name.strip()),
            Category.kind == cat_in.kind,
        )
        .first()
    )
    if existing:
        raise BadRequestException(
            message=f"A category named '{cat_in.name.strip()}' already exists for {cat_in.kind}.",
            code="CATEGORY_ALREADY_EXISTS",
        )

    cat = Category(
        user_id=current_user.id,
        name=cat_in.name.strip(),
        kind=cat_in.kind,
        icon=cat_in.icon,
        color_token=cat_in.color_token,
        sort_order=cat_in.sort_order,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)

    resp = CategoryResponse.model_validate(cat)
    resp.transaction_count = 0
    resp.has_active_budget = False
    resp.is_default = _is_default_category(cat.name, cat.kind)
    return resp


@router.patch("/{id}", response_model=CategoryResponse)
def update_category(
    id: str,
    cat_in: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user category."""
    cat = db.query(Category).filter(Category.id == id, Category.user_id == current_user.id).first()
    if not cat:
        raise NotFoundException(message="Category not found", code="CATEGORY_NOT_FOUND")

    is_default = _is_default_category(cat.name, cat.kind)

    if cat_in.name is not None:
        new_name = cat_in.name.strip()
        if is_default and new_name.lower() != cat.name.lower():
            raise BadRequestException(
                message="Default system categories cannot be renamed. You can create a custom category with your preferred name.",
                code="CANNOT_RENAME_DEFAULT_CATEGORY",
            )
        conflict = (
            db.query(Category)
            .filter(
                Category.user_id == current_user.id,
                Category.id != id,
                Category.name.ilike(new_name),
                Category.kind == cat.kind,
            )
            .first()
        )
        if conflict:
            raise BadRequestException(
                message=f"A category named '{new_name}' already exists for {cat.kind}.",
                code="CATEGORY_ALREADY_EXISTS",
            )
        cat.name = new_name

    if cat_in.icon is not None:
        cat.icon = cat_in.icon
    if cat_in.color_token is not None:
        cat.color_token = cat_in.color_token
    if cat_in.sort_order is not None:
        cat.sort_order = cat_in.sort_order

    if cat_in.is_archived is not None:
        if cat_in.is_archived is True:
            if is_default:
                raise BadRequestException(
                    message="Default system categories cannot be archived or removed.",
                    code="CANNOT_ARCHIVE_DEFAULT_CATEGORY",
                )
            active_budget = (
                db.query(Budget)
                .filter(
                    Budget.user_id == current_user.id,
                    Budget.category_id == id,
                    Budget.limit_paise > 0,
                )
                .first()
            )
            if active_budget:
                raise BadRequestException(
                    message="Cannot archive category with active monthly budgets. Please remove or zero the budget limit first.",
                    code="CATEGORY_HAS_ACTIVE_BUDGET",
                )
        cat.is_archived = cat_in.is_archived

    db.commit()
    db.refresh(cat)

    tx_count = (
        db.query(func.count(Transaction.id))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id == cat.id,
            Transaction.deleted_at.is_(None),
        )
        .scalar()
        or 0
    )
    has_active_budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category_id == cat.id,
            Budget.limit_paise > 0,
        )
        .first()
        is not None
    )

    resp = CategoryResponse.model_validate(cat)
    resp.transaction_count = tx_count
    resp.has_active_budget = has_active_budget
    resp.is_default = _is_default_category(cat.name, cat.kind)
    return resp


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_category(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-archive a category instead of deleting (preserves historical ledger records)."""
    cat = db.query(Category).filter(Category.id == id, Category.user_id == current_user.id).first()
    if not cat:
        raise NotFoundException(message="Category not found", code="CATEGORY_NOT_FOUND")

    if _is_default_category(cat.name, cat.kind):
        raise BadRequestException(
            message="Default system categories cannot be archived or removed.",
            code="CANNOT_ARCHIVE_DEFAULT_CATEGORY",
        )

    active_budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category_id == id,
            Budget.limit_paise > 0,
        )
        .first()
    )
    if active_budget:
        raise BadRequestException(
            message="Cannot archive category with active monthly budgets. Please remove or zero the budget limit first.",
            code="CATEGORY_HAS_ACTIVE_BUDGET",
        )

    cat.is_archived = True
    db.commit()
    return None

