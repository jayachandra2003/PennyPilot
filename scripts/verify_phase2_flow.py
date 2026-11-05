"""End-to-end integration check for Phase 2."""
import os
import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# 1. Login demo
login_res = client.post("/api/v1/auth/login", json={"email": "demo@pennypilot.in", "password": "DemoPassword123!"})
assert login_res.status_code == 200, f"Login failed: {login_res.text}"
token = login_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("[PASS] Demo user logged in successfully.")

# 2. Parse NL
parse_res = client.post(
    "/api/v1/transactions/parse",
    headers=headers,
    json={"text": "₹120 milk and ₹450 groceries today, auto 80 yesterday"},
)
assert parse_res.status_code == 200, f"Parse failed: {parse_res.text}"
drafts = parse_res.json()["drafts"]
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
print(f"[PASS] Bulk created {len(saved)} transactions atomically in SQLite.")

# 4. Summary & Pace
summary_res = client.get("/api/v1/transactions/summary?year=2026&month=11", headers=headers)
assert summary_res.status_code == 200
s = summary_res.json()
print(f"[PASS] Month Summary: Income={s['income_formatted']}, Expense={s['expense_formatted']}, Net={s['net_balance_formatted']}, Savings Rate={s['savings_rate_percent']}%, TxCount={s['transaction_count']}")

pace_res = client.get("/api/v1/transactions/pace?year=2026&month=11", headers=headers)
assert pace_res.status_code == 200
p = pace_res.json()
print(f"[PASS] Budget Pace: Status={p['status']}, Spent={p['spent_formatted']}, Limit={p['limit_formatted']}, Utilization={p['utilization_percent']}%, Verdict='{p['verdict_sentence']}'")

# 5. Anomalies
anom_res = client.get("/api/v1/transactions/anomalies", headers=headers)
assert anom_res.status_code == 200
anoms = anom_res.json()
print(f"[PASS] MAD Outlier Detection: Found {anoms['anomalies_count']} anomalies:")
for a in anoms["anomalies"]:
    print(f"   * Spike: {a['description']} - {a['amount_formatted']} on {a['date']} (Evidence: {a['evidence']})")
