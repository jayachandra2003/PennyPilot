"""Unit and integration tests for SQLAlchemy models, constraints, and relationships."""
from datetime import date
import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.models.budget import Budget
from app.models.category import Category
from app.models.goal import FinancialGoal
from app.models.recurring import RecurringTransaction
from app.models.transaction import Transaction
from app.models.user import User


@pytest.fixture
def db_session():
    """Create a fresh in-memory SQLite database session for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_user_creation_and_unique_email(db_session):
    u1 = User(
        email="test@example.com",
        password_hash="hashed_secret",
        display_name="Test User",
    )
    db_session.add(u1)
    db_session.commit()

    assert u1.id is not None
    assert u1.created_at is not None

    # Duplicate email must raise IntegrityError
    u2 = User(
        email="test@example.com",
        password_hash="another_hash",
        display_name="Duplicate",
    )
    db_session.add(u2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_category_unique_constraint_per_user(db_session):
    u = User(email="cat_user@example.com", password_hash="hash", display_name="Cat User")
    db_session.add(u)
    db_session.commit()

    c1 = Category(user_id=u.id, name="Groceries", kind="expense")
    db_session.add(c1)
    db_session.commit()

    # Same category name and kind for same user must fail
    c2 = Category(user_id=u.id, name="Groceries", kind="expense")
    db_session.add(c2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_transaction_creation_and_soft_delete(db_session):
    u = User(email="tx_user@example.com", password_hash="hash", display_name="Tx User")
    db_session.add(u)
    db_session.commit()

    cat = Category(user_id=u.id, name="Food", kind="expense")
    db_session.add(cat)
    db_session.commit()

    tx = Transaction(
        user_id=u.id,
        category_id=cat.id,
        kind="expense",
        amount_paise=12050,  # ₹120.50
        occurred_on=date(2026, 11, 5),
        description="Lunch Thali",
    )
    db_session.add(tx)
    db_session.commit()

    assert tx.id is not None
    assert tx.amount_paise == 12050
    assert tx.deleted_at is None
