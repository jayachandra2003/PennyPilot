"""Verification script testing database path resolution from both root and backend directories."""
import os
import sys

# Configure UTF-8 stdout for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
from fastapi.testclient import TestClient

# Ensure backend package is in path
current_dir = os.getcwd()
sys.path.insert(0, current_dir)
if os.path.basename(current_dir) != "backend":
    sys.path.insert(0, os.path.join(current_dir, "backend"))

from app.core.config import settings, PROJECT_ROOT
from app.main import app

def run_checks():
    client = TestClient(app)
    print(f"CWD: {os.getcwd()}")
    print(f"PROJECT_ROOT: {PROJECT_ROOT}")
    print(f"DATABASE_URL: {settings.DATABASE_URL}")

    # 1. Demo login
    login_res = client.post("/api/v1/auth/login", json={"email": "demo@pennypilot.in", "password": "DemoPassword123!"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    user = login_res.json()["user"]
    print(f"[OK] Demo user authenticated: {user['display_name']} ({user['email']})")
    assert user["email"] == "demo@pennypilot.in"

    # 2. Authenticated user profile (/auth/me)
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200, f"/auth/me failed: {me_res.text}"
    profile = me_res.json()
    print(f"[OK] Profile lookup: id={profile['id']}, timezone={profile['timezone']}, currency={profile['currency']}")

    # 3. November 2026 Monthly summary
    summary_res = client.get("/api/v1/transactions/summary?year=2026&month=11", headers={"Authorization": f"Bearer {token}"})
    assert summary_res.status_code == 200, f"Summary failed: {summary_res.text}"
    s = summary_res.json()
    print(f"[OK] Nov 2026 Summary: Income={s['income_formatted']}, Expense={s['expense_formatted']}, Net={s['net_balance_formatted']}, Tx Count={s['transaction_count']}")
    assert s["income_paise"] == 8500000, f"Expected 8500000 income, got {s['income_paise']}"
    assert s["expense_paise"] == 2903000, f"Expected 2903000 expense, got {s['expense_paise']}"

    # 4. Transaction list count
    tx_res = client.get("/api/v1/transactions", headers={"Authorization": f"Bearer {token}"})
    assert tx_res.status_code == 200, f"Transactions fetch failed: {tx_res.text}"
    txs = tx_res.json()
    print(f"[OK] Total transactions count for demo user: {len(txs)}")
    assert len(txs) >= 19, f"Expected at least 19 transactions, got {len(txs)}"

    # 5. Budget records
    budgets_res = client.get("/api/v1/budgets?year=2026&month=11", headers={"Authorization": f"Bearer {token}"})
    assert budgets_res.status_code == 200, f"Budgets fetch failed: {budgets_res.text}"
    b = budgets_res.json()
    print(f"[OK] Total budget: {b['total_limit_formatted']}, Category budgets: {len(b['category_budgets'])}")

    # 6. User-level data isolation
    bob_login = client.post("/api/v1/auth/login", json={"email": "bob_private@pennypilot.in", "password": "DemoPassword123!"})
    if bob_login.status_code == 200:
        bob_token = bob_login.json()["access_token"]
        bob_txs = client.get("/api/v1/transactions", headers={"Authorization": f"Bearer {bob_token}"}).json()
        print(f"[OK] Bob private transactions: {len(bob_txs)} (Isolated from Demo user's {len(txs)} txs)")
        assert len(bob_txs) != len(txs), "Cross-tenant leakage detected"

    print("ALL CHECKS PASSED.")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--child":
        run_checks()
    else:
        print("=== CHECK 1: EXECUTING FROM CURRENT DIRECTORY ===")
        run_checks()
        print("\n=== CHECK 2: EXECUTING SUBPROCESS WITH CWD='backend' ===")
        import subprocess
        child_res = subprocess.run(
            [sys.executable, os.path.abspath(__file__), "--child"],
            cwd=os.path.join(str(PROJECT_ROOT), "backend"),
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        print(child_res.stdout)
        if child_res.stderr:
            print("Child stderr:", child_res.stderr)
        assert child_res.returncode == 0, f"Child check failed with returncode {child_res.returncode}"
        print(">>> ALL PATH NORMALIZATION CHECKS VERIFIED SUCCESSFULLY IN BOTH CONTEXTS! <<<")
