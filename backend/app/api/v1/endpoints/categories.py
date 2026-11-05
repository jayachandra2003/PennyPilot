"""Categories router with multi-tenant user isolation."""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.errors import BadRequestException, NotFoundException
from app.db.session import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter()


@router.get("", response_model=List[CategoryResponse])
def list_categories(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List categories owned by the authenticated user."""
    query = db.query(Category).filter(Category.user_id == current_user.id)
    if not include_archived:
        query = query.filter(Category.is_archived == False)

    categories = query.order_by(Category.kind.desc(), Category.sort_order.asc(), Category.name.asc()).all()
    return [CategoryResponse.model_validate(c) for c in categories]


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
    return CategoryResponse.model_validate(cat)


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

    if cat_in.name is not None:
        new_name = cat_in.name.strip()
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
    if cat_in.is_archived is not None:
        cat.is_archived = cat_in.is_archived
    if cat_in.sort_order is not None:
        cat.sort_order = cat_in.sort_order

    db.commit()
    db.refresh(cat)
    return CategoryResponse.model_validate(cat)


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

    cat.is_archived = True
    db.commit()
    return None
