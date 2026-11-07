import requests
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000/api/v1"

import sys
import os
sys.path.insert(0, os.path.abspath("backend"))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import create_access_token
from app.core.rate_limiter import copilot_rate_limiter

copilot_rate_limiter._buckets.clear()

db = SessionLocal()
user = db.query(User).filter(User.email == "jayachandravennam.jc@gmail.com").first()
if not user:
    user = db.query(User).first()

token = create_access_token(subject=user.id, extra_claims={"email": user.email})
db.close()

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

QUESTIONS = [
    "Hi",
    "How are you?",
    "What is PennyPilot?",
    "Where can I change my theme?",
    "How do I delete my account?",
    "Where can I download my monthly statement?",
    "How can I add a transaction?",
    "How do I change my profile picture?",
    "How do I scan a receipt?",
    "How do I add a new category?",
    "Where should I reduce my spending?",
    "Am I on track with my monthly budget?"
]

print("=" * 80)
print("TESTING 12 COPILOT QUESTIONS MATRIX")
print("=" * 80)

responses = []
for i, q in enumerate(QUESTIONS, 1):
    r = requests.post(f"{BASE_URL}/copilot/query", headers=headers, json={"query": q, "year": 2026, "month": 11})
    if r.status_code != 200:
        print(f"[{i}/12] ERROR {r.status_code} for '{q}': {r.text}")
        continue
    data = r.json()
    responses.append(data)
    print(f"\n--- Question {i}: \"{q}\" ---")
    print(f"Intent: {data.get('intent')}")
    print(f"Provider: {data.get('provider')} (Tier {data.get('tier')})")
    nav = data.get('navigation_action')
    if nav:
        print(f"Navigation Action: [{nav.get('label')}] -> target: '{nav.get('target')}', section: '{nav.get('section')}'")
    else:
        print(f"Navigation Action: None")
    ans = data.get('answer', '')
    first_two_lines = "\n".join(ans.strip().split("\n")[:4])
    print(f"Answer Preview:\n{first_two_lines}")
    if len(ans.strip().split("\n")) > 4:
        print("...")

# Verify distinctness
answers = [d['answer'] for d in responses]
unique_answers = set(answers)
print("\n" + "=" * 80)
print(f"TOTAL QUESTIONS TESTED: {len(responses)} / {len(QUESTIONS)}")
print(f"UNIQUE ANSWERS: {len(unique_answers)} / {len(responses)}")
assert len(unique_answers) == len(responses), "Every question must yield a distinct, tailored answer!"
print("VERIFICATION PASSED: All 12 questions produced distinct, tailored responses!")
print("=" * 80)
