"""Integration and unit tests for AI Financial Copilot, FactBundle grounding, and Rate Limiting."""
from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.rate_limiter import TokenBucketRateLimiter
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, get_db
from app.domain.copilot import (
    DeterministicNarrativeGenerator,
    FactBundleBuilder,
    FactBundleVerifier,
    IntentClassifier,
)
from app.main import app
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_db():
    """Ensure complete test isolation using an in-memory SQLite database."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestingSession
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _setup_copilot_user():
    override = app.dependency_overrides.get(get_db)
    db = next(override()) if override else SessionLocal()
    u = db.query(User).filter(User.email == "copilot_test@pennypilot.in").first()
    if not u:
        u = User(
            email="copilot_test@pennypilot.in",
            password_hash="fakehash",
            display_name="Copilot Tester",
        )
        db.add(u)
        db.flush()

    c1 = db.query(Category).filter(Category.user_id == u.id, Category.name == "Groceries").first()
    if not c1:
        c1 = Category(user_id=u.id, name="Groceries", kind="expense", icon="shopping-cart", color_token="emerald")
        c2 = Category(user_id=u.id, name="Dining & Food", kind="expense", icon="utensils", color_token="amber")
        c3 = Category(user_id=u.id, name="Income", kind="income", icon="wallet", color_token="teal")
        db.add_all([c1, c2, c3])
        db.flush()

    c3 = db.query(Category).filter(Category.user_id == u.id, Category.name == "Income").first()
    c2 = db.query(Category).filter(Category.user_id == u.id, Category.name == "Dining & Food").first()

    # Ensure transactions exist
    tx_count = db.query(Transaction).filter(Transaction.user_id == u.id).count()
    if tx_count < 3:
        t1 = Transaction(user_id=u.id, category_id=c3.id, kind="income", amount_paise=10000000, occurred_on=date(2026, 11, 1), description="Salary")
        t2 = Transaction(user_id=u.id, category_id=c1.id, kind="expense", amount_paise=350000, occurred_on=date(2026, 11, 2), description="Supermarket")
        t3 = Transaction(user_id=u.id, category_id=c2.id, kind="expense", amount_paise=250000, occurred_on=date(2026, 11, 3), description="Dinner Out")
        db.add_all([t1, t2, t3])
        db.commit()

    token = create_access_token(subject=u.id)
    user_id = u.id
    db.close()
    return token, user_id


def test_intent_classification():
    dummy_cats = [{"name": "Groceries"}, {"name": "Dining & Food"}, {"name": "Transportation"}]

    intent1, _ = IntentClassifier.classify("Why did my expenses increase this month?", dummy_cats)
    assert intent1 == "expense_increase"

    intent2, _ = IntentClassifier.classify("Which category consumes most of my income?", dummy_cats)
    assert intent2 == "top_category"

    intent3, target3 = IntentClassifier.classify("How much did I spend on food?", dummy_cats)
    assert intent3 == "category_spend"
    assert target3 == "Dining & Food"

    intent4, _ = IntentClassifier.classify("Which transactions look unusual?", dummy_cats)
    assert intent4 == "unusual_transactions"

    intent5, _ = IntentClassifier.classify("Am I on track with my monthly budget?", dummy_cats)
    assert intent5 == "budget_pace"

    intent6, _ = IntentClassifier.classify("How can I improve my savings rate?", dummy_cats)
    assert intent6 == "savings_advice"


def test_fact_bundle_and_deterministic_narrative():
    token, user_id = _setup_copilot_user()
    override = app.dependency_overrides.get(get_db)
    db = next(override()) if override else SessionLocal()

    facts = FactBundleBuilder.build(
        db=db,
        user_id=user_id,
        year=2026,
        month=11,
        question="Which category consumes most of my income?",
    )
    db.close()

    assert "totals" in facts
    assert facts["totals"]["income_paise"] == 10000000  # ₹1,00,000
    assert facts["totals"]["expense_paise"] >= 600000   # ₹6,000
    assert facts["top_category"] is not None
    assert facts["top_category"]["category_name"] == "Groceries"

    narrative = DeterministicNarrativeGenerator.generate(
        intent="top_category",
        target_cat=None,
        facts=facts,
    )
    assert "Groceries" in narrative
    assert "consumes the largest portion" in narrative
    assert "₹" in narrative


def test_copilot_query_endpoint():
    token, _ = _setup_copilot_user()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "query": "Am I on track with my monthly budget?",
        "year": 2026,
        "month": 11,
    }
    res = client.post("/api/v1/copilot/query", headers=headers, json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["intent"] == "budget_pace"
    assert "answer" in data
    assert len(data["answer"]) > 20
    assert data["provider"] in ["gemini", "ollama", "deterministic"]
    assert "evidence" in data
    assert "totals" in data["evidence"]
    assert "disclaimer" in data


def test_copilot_monthly_report_endpoint():
    token, _ = _setup_copilot_user()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/copilot/monthly-report?year=2026&month=11", headers=headers)
    assert res.status_code == 200
    report = res.json()

    assert "executive_summary" in report
    assert "measured_facts" in report
    assert "income" in report["measured_facts"]
    assert "expenses" in report["measured_facts"]
    assert "recommendations" in report
    assert len(report["recommendations"]) > 0
    assert "disclaimer" in report


def test_copilot_status_endpoint():
    token, _ = _setup_copilot_user()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/copilot/status", headers=headers)
    assert res.status_code == 200
    status_data = res.json()

    assert "active_provider" in status_data
    assert "providers" in status_data
    assert status_data["active_tier"] in [1, 2, 3]


def test_token_bucket_rate_limiter():
    limiter = TokenBucketRateLimiter(capacity=3, refill_rate_per_sec=0.1)
    user = "rate_limit_test_user"

    # First 3 should succeed
    allowed1, _ = limiter.is_allowed(user)
    allowed2, _ = limiter.is_allowed(user)
    allowed3, _ = limiter.is_allowed(user)
    assert allowed1 is True
    assert allowed2 is True
    assert allowed3 is True

    # 4th should be rejected
    allowed4, retry_after = limiter.is_allowed(user)
    assert allowed4 is False
    assert retry_after > 0


def test_fact_bundle_verifier():
    facts = {
        "totals": {
            "income_paise": 8500000,
            "income_formatted": "₹85,000.00",
            "expense_paise": 2903000,
            "expense_formatted": "₹29,030.00",
            "net_balance_formatted": "+₹55,970.00",
            "savings_rate_percent": 65.85,
            "transaction_count": 19,
        },
        "categories": [
            {
                "category_id": "cat_rent",
                "category_name": "Housing & Rent",
                "formatted_total": "₹18,500.00",
                "total_paise": 1850000,
                "percentage": 63.73,  # 63.73% of EXPENSE
                "transaction_count": 1,
            }
        ],
        "top_expenses": [],
        "anomalies": [],
        "budget_pace": {
            "spent_formatted": "₹29,030.00",
            "limit_formatted": "₹55,000.00",
            "utilization_percent": 52.78,
        },
        "mom_delta": {
            "expense_pct_change": 18.6,
        },
    }

    # 1. Valid grounded text
    grounded_text = "You spent ₹29,030.00 this month, retaining a net balance of +₹55,970.00 with a 65.85% savings rate across 19 transactions."
    _, is_grounded = FactBundleVerifier.verify(grounded_text, facts)
    assert is_grounded is True

    # 2. Unsupported currency value (Hallucination)
    hallucinated_curr = "You spent ₹99,999.00 this month."
    _, is_curr_valid = FactBundleVerifier.verify(hallucinated_curr, facts)
    assert is_curr_valid is False

    # 3. Unsupported percentage (Hallucinated metric)
    hallucinated_pct = "Your spending velocity increased by 43.69% this month."
    _, is_pct_valid = FactBundleVerifier.verify(hallucinated_pct, facts)
    assert is_pct_valid is False

    # 4. Semantic Contradiction: Claiming 63.73% of INCOME when it was 63.73% of EXPENSES
    # Note: 18500/85000 is 21.8% of income, NOT 63.73%
    contradictory_text = "Housing & Rent consumes 63.73% of your total income."
    _, is_contradiction_valid = FactBundleVerifier.verify(contradictory_text, facts)
    assert is_contradiction_valid is False

    # 5. Incorrect transaction count
    incorrect_count_text = "Housing & Rent accounted for ₹18,500.00 across 14 transactions."
    _, is_count_valid = FactBundleVerifier.verify(incorrect_count_text, facts)
    assert is_count_valid is False


def test_financial_health_classification():
    from app.domain.narrative import classify_financial_health

    # 1. High savings rate (65.85%) but OVER PACE -> MUST NOT be Exceptional, must be Pacing Alert
    status1, tone1 = classify_financial_health(
        savings_rate_percent=65.85,
        net_balance_paise=5597000,
        pace_status="over_pace",
        is_over_budget=False,
        projected_overrun_formatted="₹90,150.00",
    )
    assert status1 == "Pacing Alert"
    assert "overrun of ₹90,150.00" in tone1

    # 2. Deficit / Negative Cash Flow
    status2, _ = classify_financial_health(
        savings_rate_percent=0.0,
        net_balance_paise=-500000,
        pace_status="over_budget",
        is_over_budget=True,
        projected_overrun_formatted="₹5,000.00",
    )
    assert status2 == "Deficit"

    # 3. Over Budget ceiling breached
    status3, _ = classify_financial_health(
        savings_rate_percent=10.0,
        net_balance_paise=200000,
        pace_status="over_budget",
        is_over_budget=True,
        projected_overrun_formatted="₹10,000.00",
    )
    assert status3 == "Over Budget"

    # 4. Truly Exceptional: High savings (45%) AND strictly on_track
    status4, _ = classify_financial_health(
        savings_rate_percent=45.0,
        net_balance_paise=3500000,
        pace_status="on_track",
        is_over_budget=False,
        projected_overrun_formatted="₹0.00",
    )
    assert status4 == "Exceptional"

    # 5. Healthy: Good savings (25%) AND on_track
    status5, _ = classify_financial_health(
        savings_rate_percent=25.0,
        net_balance_paise=2000000,
        pace_status="on_track",
        is_over_budget=False,
        projected_overrun_formatted="₹0.00",
    )
    assert status5 == "Healthy"
