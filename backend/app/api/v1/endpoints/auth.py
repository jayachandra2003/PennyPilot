"""Authentication router: registration, login, and current user profile."""
from datetime import timedelta
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.config import settings
from app.core.errors import BadRequestException, UnauthorizedException
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse

router = APIRouter()

DEFAULT_CATEGORIES = [
    # Expenses
    {"name": "Groceries", "kind": "expense", "icon": "shopping-cart", "color_token": "emerald", "sort_order": 1},
    {"name": "Dining & Food", "kind": "expense", "icon": "utensils", "color_token": "amber", "sort_order": 2},
    {"name": "Housing & Rent", "kind": "expense", "icon": "home", "color_token": "indigo", "sort_order": 3},
    {"name": "Utilities & Bills", "kind": "expense", "icon": "zap", "color_token": "blue", "sort_order": 4},
    {"name": "Transportation", "kind": "expense", "icon": "car", "color_token": "cyan", "sort_order": 5},
    {"name": "Healthcare", "kind": "expense", "icon": "heart-pulse", "color_token": "rose", "sort_order": 6},
    {"name": "Entertainment", "kind": "expense", "icon": "film", "color_token": "purple", "sort_order": 7},
    {"name": "Shopping", "kind": "expense", "icon": "shopping-bag", "color_token": "orange", "sort_order": 8},
    {"name": "Other Expenses", "kind": "expense", "icon": "more-horizontal", "color_token": "slate", "sort_order": 9},
    # Incomes
    {"name": "Salary", "kind": "income", "icon": "banknote", "color_token": "emerald", "sort_order": 1},
    {"name": "Investments", "kind": "income", "icon": "trending-up", "color_token": "teal", "sort_order": 2},
    {"name": "Freelance / Other", "kind": "income", "icon": "briefcase", "color_token": "blue", "sort_order": 3},
]


def seed_default_categories(db: Session, user_id: str) -> None:
    """Seed user-isolated default categories at registration."""
    for cat_data in DEFAULT_CATEGORIES:
        category = Category(user_id=user_id, **cat_data)
        db.add(category)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account, seed default categories, and issue JWT."""
    normalized_email = user_in.email.strip().lower()

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise BadRequestException(message="An account with this email already exists", code="EMAIL_ALREADY_EXISTS")

    new_user = User(
        email=normalized_email,
        password_hash=hash_password(user_in.password),
        display_name=user_in.display_name.strip(),
        timezone=user_in.timezone or settings.DEFAULT_TIMEZONE,
        currency=user_in.currency or settings.DEFAULT_CURRENCY,
    )
    db.add(new_user)
    db.flush()  # Generate user.id

    seed_default_categories(db, new_user.id)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(subject=new_user.id)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(new_user))


@router.post("/login", response_model=TokenResponse)
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate email and password, returning JWT access token."""
    normalized_email = login_data.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise UnauthorizedException(message="Invalid email or password", code="INVALID_CREDENTIALS")

    if not user.is_active:
        raise UnauthorizedException(message="Account is deactivated", code="ACCOUNT_DEACTIVATED")

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get authenticated user profile."""
    return UserResponse.model_validate(current_user)
