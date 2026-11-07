"""End-to-end integration check for Phase 2 with strict database and user isolation.

This script verifies NL parsing, bulk save, monthly summary, budget pace,
and MAD anomaly detection. It is designed to be 100% safe, idempotent,
and repeatable without ever touching or polluting the canonical demo account.
"""
import os
import sys
import tempfile
from datetime import date
from pathlib import Path

# Configure UTF-8 stdout on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root and backend are on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.domain.currency import rupees_to_paise
from app.main import app
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

# Dedicated, isolated test user credentials — NEVER demo@pennypilot.in
ISOLATED_TEST_EMAIL = "verifier_test@pennypilot.in"
ISOLATED_TEST_PASSWORD = "TestVerifierPass123!"


def setup_isolated_environment():
    """Create a temporary SQLite database with fresh schema for test isolation."""
    temp_fd, temp_path = tempfile.mkstemp(prefix="pennypilot_verify_", suffix=".db")
    os.close(temp_fd)

    isolated_url = f"sqlite:///{Path(temp_path).as_posix()}"
    engine = create_engine(isolated_url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    IsolatedSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Seed isolated test user and initial state
    db = IsolatedSession()
    try:
        user = User(
            email=ISOLATED_TEST_EMAIL,
            password_hash=hash_password(ISOLATED_TEST_PASSWORD),
            display_name="Isolated Flow Tester",
            timezone="Asia/Kolkata",
            currency="INR",
        )
        user.email_verified = True
        db.add(user)
        db.flush()

        from app.models.auth_tokens import EmailVerificationToken
        from datetime import datetime, timezone
        tok = EmailVerificationToken(
            user_id=user.id,
            token_hash="isolated_seed_verified_hash",
            expires_at=datetime.now(timezone.utc),
            consumed_at=datetime.now(timezone.utc),
        )
        db.add(tok)

        # Seed categories for parser and budgets
        cats_data = [
            ("Salary", "income", "banknote", "emerald"),
            ("Groceries", "expense", "shopping-cart", "emerald"),
            ("Dining & Food", "expense", "utensils", "amber"),
            ("Transportation", "expense", "car", "cyan"),
            ("Utilities & Bills", "expense", "zap", "blue"),
            ("Housing & Rent", "expense", "home", "indigo"),
        ]
        cats = {}
        for name, kind, icon, color in cats_data:
            c = Category(user_id=user.id, name=name, kind=kind, icon=icon, color_token=color)
            db.add(c)
            db.flush()
            cats[name] = c

        # November 2026 Budget
        b = Budget(
            user_id=user.id,
            category_id=cats["Groceries"].id,
            month=date(2026, 11, 1),
            limit_paise=rupees_to_paise(12000),
        )
        db.add(b)

        # Baseline Income
        db.add(
            Transaction(
                user_id=user.id,
                category_id=cats["Salary"].id,
                kind="income",
                amount_paise=rupees_to_paise(85000),
                occurred_on=date(2026, 11, 1),
                description="Monthly Salary",
                source="manual",
            )
        )

        # Statistical baseline for MAD anomaly engine (5 historical normal expenses)
        for i in range(1, 6):
            db.add(
                Transaction(
                    user_id=user.id,
                    category_id=cats["Dining & Food"].id,
                    kind="expense",
                    amount_paise=rupees_to_paise(300 + i * 20),
                    occurred_on=date(2026, 10, i * 4),
                    description=f"Normal Lunch {i}",
                    source="manual",
                )
            )

        # Deliberate anomaly spike for MAD outlier detection
        db.add(
            Transaction(
                user_id=user.id,
                category_id=cats["Dining & Food"].id,
                kind="expense",
                amount_paise=rupees_to_paise(6800),
                occurred_on=date(2026, 11, 5),
                description="Celebration Dinner @ Toit",
                source="manual",
            )
        )

        db.commit()
    finally:
        db.close()

    return temp_path, engine, IsolatedSession


def run_verification(verbose: bool = True) -> dict:
    """Execute end-to-end Phase 2 integration check with full database isolation."""
    temp_path, engine, IsolatedSession = setup_isolated_environment()

    def override_get_db():
        db = IsolatedSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    results = {}

    try:
        if verbose:
            print("=================================================================")
            print("  PENNYPILOT PHASE 2 — ISOLATED END-TO-END FLOW VERIFICATION")
            print("  Safety Guarantee: 100% Isolated Temporary Database")
            print("=================================================================")

        # 1. Login with isolated test credentials
        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": ISOLATED_TEST_EMAIL, "password": ISOLATED_TEST_PASSWORD},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        if verbose:
            print(f"[PASS] Authenticated as isolated user: {ISOLATED_TEST_EMAIL}")

        # 2. Parse NL
        nl_text = "₹120 milk and ₹450 groceries today, auto 80 yesterday"
        parse_res = client.post(
            "/api/v1/transactions/parse",
            headers=headers,
            json={"text": nl_text},
        )
        assert parse_res.status_code == 200, f"Parse failed: {parse_res.text}"
        drafts = parse_res.json()["drafts"]
        assert len(drafts) == 3, f"Expected 3 drafts, got {len(drafts)}"
        if verbose:
            print(f"[PASS] NL Parser returned {len(drafts)} drafts:")
            for d in drafts:
                print(f"   * {d['description']}: {d['formatted_amount']} (cat: {d['category_name']}, conf: {d['confidence']})")

        # 3. Bulk save
        bulk_payload = {
            "transactions": [
                {
                    "category_id": d["category_id"],
                    "kind": d["kind"],
                    "amount_paise": d["amount_paise"],
                    "occurred_on": d["occurred_on"],
                    "description": d["description"],
                }
                for d in drafts
            ]
        }
        bulk_res = client.post("/api/v1/transactions/bulk", headers=headers, json=bulk_payload)
        assert bulk_res.status_code == 201, f"Bulk save failed: {bulk_res.text}"
        saved = bulk_res.json()
        assert len(saved) == 3, f"Expected 3 saved records, got {len(saved)}"
        if verbose:
            print(f"[PASS] Bulk created {len(saved)} transactions atomically in isolated SQLite.")

        # 4. Summary & Pace
        summary_res = client.get("/api/v1/transactions/summary?year=2026&month=11", headers=headers)
        assert summary_res.status_code == 200, f"Summary failed: {summary_res.text}"
        s = summary_res.json()
        assert s["income_paise"] == 8500000, f"Expected 8500000 income, got {s['income_paise']}"
        assert s["transaction_count"] >= 4, f"Expected >= 4 txs in Nov, got {s['transaction_count']}"
        if verbose:
            print(f"[PASS] Month Summary: Income={s['income_formatted']}, Expense={s['expense_formatted']}, "
                  f"Net={s['net_balance_formatted']}, Savings Rate={s['savings_rate_percent']}%, TxCount={s['transaction_count']}")

        pace_res = client.get("/api/v1/transactions/pace?year=2026&month=11", headers=headers)
        assert pace_res.status_code == 200, f"Pace failed: {pace_res.text}"
        p = pace_res.json()
        if verbose:
            print(f"[PASS] Budget Pace: Status={p['status']}, Spent={p['spent_formatted']}, Limit={p['limit_formatted']}, "
                  f"Utilization={p['utilization_percent']}%, Verdict='{p['verdict_sentence']}'")

        # 5. Anomalies
        anom_res = client.get("/api/v1/transactions/anomalies", headers=headers)
        assert anom_res.status_code == 200, f"Anomalies failed: {anom_res.text}"
        anoms = anom_res.json()
        assert anoms["anomalies_count"] >= 1, "Expected at least 1 anomaly detected"
        if verbose:
            print(f"[PASS] MAD Outlier Detection: Found {anoms['anomalies_count']} anomalies:")
            for a in anoms["anomalies"]:
                print(f"   * Spike: {a['description']} - {a['amount_formatted']} on {a['date']} (Evidence: {a['evidence']})")

        results = {
            "status": "success",
            "user": ISOLATED_TEST_EMAIL,
            "drafts_count": len(drafts),
            "saved_count": len(saved),
            "summary": s,
            "pace": p,
            "anomalies_count": anoms["anomalies_count"],
        }
        if verbose:
            print("\n>>> ALL PHASE 2 FLOW CHECKS PASSED IN TOTAL ISOLATION! <<<")

    finally:
        # Tear down dependency override and clean up temporary database file
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

    return results


if __name__ == "__main__":
    run_verification(verbose=True)
