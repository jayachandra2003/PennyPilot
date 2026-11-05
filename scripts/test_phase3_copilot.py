"""Live validation script for PennyPilot Phase 3 AI Copilot & Grounded Intelligence."""
import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
res_login = client.post("/api/v1/auth/login", json={"email": "demo@pennypilot.in", "password": "DemoPassword123!"})
assert res_login.status_code == 200, f"Login failed: {res_login.text}"
token = res_login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

questions = [
    "Why did my expenses increase this month?",
    "Which category consumes most of my income?",
    "How much did I spend on food?",
    "Which transactions look unusual?",
    "Am I on track with my monthly budget?",
    "How can I improve my savings rate?",
]

print("=================================================================")
print("  PENNYPILOT PHASE 3 — 6 CORE FINANCIAL COPILOT QUESTIONS CHECK")
print("=================================================================")

for q in questions:
    res = client.post("/api/v1/copilot/query", headers=headers, json={"query": q, "year": 2026, "month": 11})
    assert res.status_code == 200, f"Query failed for '{q}': {res.text}"
    data = res.json()
    print(f"\n[QUESTION]: {q}")
    print(f"  • Intent:   {data['intent']}")
    print(f"  • Provider: {data['provider'].upper()} (Tier {data['tier']})")
    print(f"  • Answer:   {data['answer']}")
    print(f"  • Evidence: Period={data['evidence']['period']['year']}-{data['evidence']['period']['month']:02d}, "
          f"Spent={data['evidence']['totals']['expense_formatted']}, "
          f"Anomalies={len(data['evidence']['anomalies'])}")

print("\n=================================================================")
print("  PENNYPILOT PHASE 3 — MONTHLY FINANCIAL NARRATIVE REPORT CHECK")
print("=================================================================")

rep_res = client.get("/api/v1/copilot/monthly-report?year=2026&month=11", headers=headers)
assert rep_res.status_code == 200, f"Report failed: {rep_res.text}"
rep = rep_res.json()
print(f"Title:             {rep['title']}")
print(f"Financial Health:  {rep['health_status']}")
print(f"Executive Summary: {rep['executive_summary']}")
print("\nMeasured Facts:")
for k, v in rep["measured_facts"].items():
    print(f"  - {k}: {v}")
print("\nActionable Recommendations:")
for r in rep["recommendations"]:
    print(f"  - {r}")
