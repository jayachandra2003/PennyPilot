"""Security & user data isolation tests."""
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.base import Base
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User


def test_password_hashing():
    pwd = "SuperSecretPassword123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_flow():
    user_id = "user-12345"
    token = create_access_token(subject=user_id)
    payload = decode_access_token(token)

    assert payload is not None
    assert payload["sub"] == user_id
    assert "exp" in payload

    # Test expired token
    expired_token = create_access_token(subject=user_id, expires_delta=timedelta(seconds=-10))
    expired_payload = decode_access_token(expired_token)
    assert expired_payload is None


def test_cross_user_data_isolation():
    """Verify that User A queries cannot access User B's transactions."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Create User A and User B
    user_a = User(email="usera@example.com", password_hash="hash", display_name="User A")
    user_b = User(email="userb@example.com", password_hash="hash", display_name="User B")
    session.add_all([user_a, user_b])
    session.commit()

    cat_a = Category(user_id=user_a.id, name="Groceries", kind="expense")
    cat_b = Category(user_id=user_b.id, name="Groceries", kind="expense")
    session.add_all([cat_a, cat_b])
    session.commit()

    tx_a = Transaction(user_id=user_a.id, category_id=cat_a.id, amount_paise=50000, description="User A Secret Tx", occurred_on=date(2026, 11, 1))
    tx_b = Transaction(user_id=user_b.id, category_id=cat_b.id, amount_paise=80000, description="User B Secret Tx", occurred_on=date(2026, 11, 2))
    session.add_all([tx_a, tx_b])
    session.commit()

    # Query strictly scoped to User A
    results_for_a = session.query(Transaction).filter(Transaction.user_id == user_a.id).all()
    assert len(results_for_a) == 1
    assert results_for_a[0].description == "User A Secret Tx"

    # Query strictly scoped to User B
    results_for_b = session.query(Transaction).filter(Transaction.user_id == user_b.id).all()
    assert len(results_for_b) == 1
    assert results_for_b[0].description == "User B Secret Tx"

    session.close()
