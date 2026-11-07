"""Regression tests verifying verification script safety and non-pollution of database.

Ensures that scripts/verify_phase2_flow.py executes in complete database and user
isolation, and that running verification scripts repeatedly never alters, mutates,
or pollutes the canonical database.
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


def _get_canonical_telemetry():
    """Read current baseline telemetry for the canonical database."""
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        tx_count = db.query(Transaction).count()
        budget_count = db.query(Budget).count()
        user_ids = {u.id for u in db.query(User.id).all()}
        tx_ids = {t.id for t in db.query(Transaction.id).all()}
        budget_ids = {b.id for b in db.query(Budget.id).all()}

        return {
            "user_count": user_count,
            "user_ids": user_ids,
            "tx_count": tx_count,
            "tx_ids": tx_ids,
            "budget_count": budget_count,
            "budget_ids": budget_ids,
        }
    finally:
        db.close()


def test_verify_phase2_flow_does_not_pollute_demo_account():
    """Verify that running scripts/verify_phase2_flow.py cannot alter canonical database records."""
    baseline = _get_canonical_telemetry()

    # Execute verification flow
    result = run_verification(verbose=False)
    assert result["status"] == "success"
    assert result["user"] == ISOLATED_TEST_EMAIL
    assert result["saved_count"] == 3

    # Inspect canonical database state after execution
    after = _get_canonical_telemetry()

    # Assert strict zero-pollution invariants
    assert after["user_count"] == baseline["user_count"], (
        f"Pollution detected! User count changed from {baseline['user_count']} to {after['user_count']}"
    )
    assert after["user_ids"] == baseline["user_ids"], "Canonical user IDs were mutated"
    assert after["tx_count"] == baseline["tx_count"], (
        f"Pollution detected! Transaction count changed from {baseline['tx_count']} to {after['tx_count']}"
    )
    assert after["tx_ids"] == baseline["tx_ids"], "Canonical transaction IDs were mutated"
    assert after["budget_count"] == baseline["budget_count"], "Canonical budget count was mutated"
    assert after["budget_ids"] == baseline["budget_ids"], "Canonical budget IDs were mutated"


def test_verify_phase2_flow_repeated_execution_is_idempotent():
    """Verify that multiple consecutive runs are completely idempotent and non-polluting."""
    baseline = _get_canonical_telemetry()

    for run_idx in range(3):
        result = run_verification(verbose=False)
        assert result["status"] == "success", f"Run {run_idx + 1} failed"

        current = _get_canonical_telemetry()
        assert current["user_count"] == baseline["user_count"], (
            f"Pollution on run {run_idx + 1}: expected {baseline['user_count']} users, got {current['user_count']}"
        )
        assert current["tx_count"] == baseline["tx_count"], (
            f"Pollution on run {run_idx + 1}: expected {baseline['tx_count']} txs, got {current['tx_count']}"
        )
        assert current["tx_ids"] == baseline["tx_ids"]


def test_isolated_verifier_identity_is_not_demo():
    """Ensure verifier credentials and identities are distinct from demo credentials."""
    assert ISOLATED_TEST_EMAIL != "demo@pennypilot.in"
    assert "demo" not in ISOLATED_TEST_EMAIL.lower()
