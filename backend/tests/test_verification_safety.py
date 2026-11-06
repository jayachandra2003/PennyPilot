"""Regression tests verifying verification script safety and non-pollution of demo account.

Ensures that scripts/verify_phase2_flow.py executes in complete database and user
isolation, and that running verification scripts repeatedly never alters, mutates,
or pollutes the canonical demo account or database.
"""
import sys
from pathlib import Path

# Ensure paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.db.session import SessionLocal
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.user import User
from scripts.verify_phase2_flow import run_verification, ISOLATED_TEST_EMAIL


def _get_demo_telemetry():
    """Read current baseline telemetry for the canonical demo user."""
    db = SessionLocal()
    try:
        demo_user = db.query(User).filter(User.email == "demo@pennypilot.in").first()
        assert demo_user is not None, "Canonical demo user must exist"

        txs = db.query(Transaction).filter(Transaction.user_id == demo_user.id).all()
        budgets = db.query(Budget).filter(Budget.user_id == demo_user.id).all()

        inflow_paise = sum(t.amount_paise for t in txs if t.kind == "income")
        outflow_paise = sum(t.amount_paise for t in txs if t.kind == "expense")

        return {
            "user_id": demo_user.id,
            "tx_count": len(txs),
            "tx_ids": {t.id for t in txs},
            "budget_count": len(budgets),
            "budget_ids": {b.id for b in budgets},
            "inflow_paise": inflow_paise,
            "outflow_paise": outflow_paise,
        }
    finally:
        db.close()


def test_verify_phase2_flow_does_not_pollute_demo_account():
    """Verify that running scripts/verify_phase2_flow.py cannot alter demo records."""
    baseline = _get_demo_telemetry()
    assert baseline["tx_count"] > 0, "Demo user must have baseline transactions"

    # Execute verification flow
    result = run_verification(verbose=False)
    assert result["status"] == "success"
    assert result["user"] == ISOLATED_TEST_EMAIL
    assert result["saved_count"] == 3

    # Inspect demo user state after execution
    after = _get_demo_telemetry()

    # Assert strict zero-pollution invariants
    assert after["tx_count"] == baseline["tx_count"], (
        f"Pollution detected! Demo transaction count changed from {baseline['tx_count']} to {after['tx_count']}"
    )
    assert after["tx_ids"] == baseline["tx_ids"], "Demo transaction IDs were mutated"
    assert after["budget_count"] == baseline["budget_count"], "Demo budget count was mutated"
    assert after["budget_ids"] == baseline["budget_ids"], "Demo budget IDs were mutated"
    assert after["inflow_paise"] == baseline["inflow_paise"], "Demo inflow total was mutated"
    assert after["outflow_paise"] == baseline["outflow_paise"], "Demo outflow total was mutated"


def test_verify_phase2_flow_repeated_execution_is_idempotent():
    """Verify that multiple consecutive runs are completely idempotent and non-polluting."""
    baseline = _get_demo_telemetry()

    for run_idx in range(3):
        result = run_verification(verbose=False)
        assert result["status"] == "success", f"Run {run_idx + 1} failed"

        current = _get_demo_telemetry()
        assert current["tx_count"] == baseline["tx_count"], (
            f"Pollution on run {run_idx + 1}: expected {baseline['tx_count']}, got {current['tx_count']}"
        )
        assert current["tx_ids"] == baseline["tx_ids"]


def test_isolated_verifier_identity_is_not_demo():
    """Ensure verifier credentials and identities are distinct from demo credentials."""
    assert ISOLATED_TEST_EMAIL != "demo@pennypilot.in"
    assert "demo" not in ISOLATED_TEST_EMAIL.lower()
