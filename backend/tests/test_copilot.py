"""Integration and unit tests for AI Financial Copilot, FactBundle grounding, and Rate Limiting."""
from datetime import date
import pytest
from fastapi.testclient import TestClient
from app.core.rate_limiter import TokenBucketRateLimiter
from app.core.security import create_access_token
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
from app.db.session import SessionLocal

client = TestClient(app)


def _setup_copilot_user():
    db = SessionLocal()
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
    db = SessionLocal()

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
            "income_formatted": "₹85,000.00",
            "expense_formatted": "₹29,030.00",
            "net_balance_formatted": "+₹55,970.00",
        },
        "categories": [
            {"formatted_total": "₹18,500.00"}
        ],
        "top_expenses": [],
        "anomalies": [],
        "budget_pace": {},
    }

    # Grounded text using valid numbers
    grounded_text = "You spent ₹29,030.00 this month, retaining a net balance of +₹55,970.00."
    _, is_grounded = FactBundleVerifier.verify(grounded_text, facts)
    assert is_grounded is True

    # Hallucinated text with made-up numbers
    hallucinated_text = "You spent ₹99,999.00 this month."
    _, is_grounded_bad = FactBundleVerifier.verify(hallucinated_text, facts)
    assert is_grounded_bad is False
