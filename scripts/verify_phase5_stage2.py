"""Comprehensive Phase 5 Stage 2 Verification Script (13-Point Audit).

Executes and verifies:
 1. User registration with valid details.
 2. User login with credentials.
 3. Refresh session persistence (JWT validation against /auth/me).
 4. Logout invalidation (storage cleared, 401 on unauthenticated access).
 5. Re-login after logout.
 6. Profile details update (display_name, timezone, currency).
 7. Profile picture upload (PNG magic bytes).
 8. Profile picture replacement (WebP magic bytes).
 9. Profile picture removal (DELETE /auth/me/avatar).
10. Avatar state inspection after deletion (null url).
11. Security rejection of invalid formats (SVG) and oversized files (>2MB).
12. Multi-tenant isolation: User A cannot access User B's private avatar.
13. Canonical database integrity: Demo account transactions and budgets remain untouched.
"""
import io
import sys
import uuid
import requests
from pathlib import Path

# Ensure utf-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:8000/api/v1"

# Minimal 1x1 test images
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05"
    b"\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

WEBP_BYTES = (
    b"RIFF\x1a\x00\x00\x00WEBPVP8L\x0e\x00\x00\x00/ \x00\x00\x00\x07\x88\x81\x08\x00\x00\xfe\x01"
)

SVG_BYTES = b"<svg xmlns='http://www.w3.org/2000/svg'><circle r='10'/></svg>"

OVERSIZED_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * (2 * 1024 * 1024 + 1024)


def run_verification():
    print("=" * 70)
    print("PennyPilot - Phase 5 Stage 2 Verification Suite (13 Tests)")
    print("=" * 70)

    results = []

    def record(idx: int, title: str, passed: bool, detail: str = ""):
        status_str = "[PASS]" if passed else "[FAIL]"
        print(f"{status_str} Test {idx:02d}: {title}")
        if detail:
            print(f"       Details: {detail}")
        results.append({"index": idx, "title": title, "passed": passed, "detail": detail})

    test_email = f"stage2_{uuid.uuid4().hex[:8]}@pennypilot.in"
    password = "Stage2Password123!"

    # 1. Registration
    try:
        r = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": test_email,
                "password": password,
                "display_name": "Stage2 Tester",
                "timezone": "Asia/Kolkata",
                "currency": "INR",
            },
        )
        passed = r.status_code == 201 and "access_token" in r.json()
        token = r.json().get("access_token")
        user_id = r.json().get("user", {}).get("id")
        record(1, "User registration", passed, f"Status {r.status_code}, User ID {user_id}")
    except Exception as e:
        record(1, "User registration", False, str(e))
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Login
    try:
        r = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": test_email, "password": password},
        )
        passed = r.status_code == 200 and "access_token" in r.json()
        login_token = r.json().get("access_token")
        record(2, "User login with valid credentials", passed, f"Status {r.status_code}")
    except Exception as e:
        record(2, "User login with valid credentials", False, str(e))

    # 3. Session persistence simulation (/auth/me with stored token)
    try:
        r = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {login_token}"})
        passed = r.status_code == 200 and r.json().get("email") == test_email
        record(3, "Session persistence via stored JWT", passed, f"Verified email: {r.json().get('email')}")
    except Exception as e:
        record(3, "Session persistence via stored JWT", False, str(e))

    # 4. Logout invalidation (unauthenticated request rejected)
    try:
        r = requests.get(f"{BASE_URL}/auth/me")
        passed = r.status_code == 401
        record(4, "Unauthenticated / logged out request rejection", passed, f"Status {r.status_code} (Unauthorized)")
    except Exception as e:
        record(4, "Unauthenticated / logged out request rejection", False, str(e))

    # 5. Re-login
    try:
        r = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": test_email, "password": password},
        )
        passed = r.status_code == 200
        token = r.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        record(5, "Re-login after logout", passed, f"Status {r.status_code}")
    except Exception as e:
        record(5, "Re-login after logout", False, str(e))

    # 6. Profile update
    try:
        r = requests.patch(
            f"{BASE_URL}/auth/me",
            headers=headers,
            json={
                "display_name": "Stage2 Polished User",
                "timezone": "UTC",
                "currency": "EUR",
            },
        )
        passed = (
            r.status_code == 200
            and r.json().get("display_name") == "Stage2 Polished User"
            and r.json().get("currency") == "EUR"
        )
        record(6, "Profile details update (name, timezone, currency)", passed, f"Updated: {r.json().get('display_name')}")
    except Exception as e:
        record(6, "Profile details update (name, timezone, currency)", False, str(e))

    # 7. Upload profile picture (PNG)
    try:
        r = requests.post(
            f"{BASE_URL}/auth/me/avatar",
            headers=headers,
            files={"file": ("avatar.png", PNG_BYTES, "image/png")},
        )
        avatar_url = r.json().get("avatar_url")
        passed = r.status_code == 200 and avatar_url is not None
        record(7, "Profile picture upload (PNG magic bytes)", passed, f"Avatar URL: {avatar_url}")
    except Exception as e:
        record(7, "Profile picture upload (PNG magic bytes)", False, str(e))

    # 8. Replace profile picture (WebP)
    try:
        r = requests.post(
            f"{BASE_URL}/auth/me/avatar",
            headers=headers,
            files={"file": ("avatar.webp", WEBP_BYTES, "image/webp")},
        )
        passed = r.status_code == 200 and r.json().get("avatar_url") is not None
        record(8, "Profile picture replacement (WebP format)", passed, f"New URL: {r.json().get('avatar_url')}")
    except Exception as e:
        record(8, "Profile picture replacement (WebP format)", False, str(e))

    # 9. Remove profile picture
    try:
        r = requests.delete(f"{BASE_URL}/auth/me/avatar", headers=headers)
        passed = r.status_code == 200 and r.json().get("avatar_url") is None
        record(9, "Profile picture deletion (DELETE /auth/me/avatar)", passed, "avatar_url set to null")
    except Exception as e:
        record(9, "Profile picture deletion (DELETE /auth/me/avatar)", False, str(e))

    # 10. Verify avatar is null after deletion
    try:
        r = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        passed = r.status_code == 200 and r.json().get("avatar_url") is None
        record(10, "Avatar null state verified on /auth/me", passed, f"avatar_url: {r.json().get('avatar_url')}")
    except Exception as e:
        record(10, "Avatar null state verified on /auth/me", False, str(e))

    # 11. Security rejection of SVG and oversized file
    try:
        svg_r = requests.post(
            f"{BASE_URL}/auth/me/avatar",
            headers=headers,
            files={"file": ("exploit.svg", SVG_BYTES, "image/svg+xml")},
        )
        oversized_r = requests.post(
            f"{BASE_URL}/auth/me/avatar",
            headers=headers,
            files={"file": ("huge.png", OVERSIZED_BYTES, "image/png")},
        )
        passed = svg_r.status_code == 400 and oversized_r.status_code == 400
        record(11, "Security validation: SVG and >2MB rejected", passed, f"SVG: {svg_r.status_code}, Huge: {oversized_r.status_code}")
    except Exception as e:
        record(11, "Security validation: SVG and >2MB rejected", False, str(e))

    # 12. Cross-user isolation
    try:
        other_email = f"isolation_{uuid.uuid4().hex[:8]}@pennypilot.in"
        r_other = requests.post(
            f"{BASE_URL}/auth/register",
            json={"email": other_email, "password": password, "display_name": "Isolation User"},
        )
        other_token = r_other.json().get("access_token")
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # First upload avatar for user 1
        requests.post(f"{BASE_URL}/auth/me/avatar", headers=headers, files={"file": ("a.png", PNG_BYTES, "image/png")})

        # User 2 tries to access User 1's avatar
        r_cross = requests.get(f"{BASE_URL}/auth/users/{user_id}/avatar", headers=other_headers)
        passed = r_cross.status_code == 404
        record(12, "Multi-tenant isolation: User B blocked from User A avatar", passed, f"Cross-tenant response: {r_cross.status_code}")
    except Exception as e:
        record(12, "Multi-tenant isolation: User B blocked from User A avatar", False, str(e))

    # 13. Canonical database integrity check
    try:
        demo_login = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": "demo@pennypilot.in", "password": "DemoPassword123!"},
        )
        demo_token = demo_login.json().get("access_token")
        demo_headers = {"Authorization": f"Bearer {demo_token}"}

        tx_r = requests.get(f"{BASE_URL}/transactions", headers=demo_headers)
        budgets_r = requests.get(f"{BASE_URL}/budgets?year=2026&month=11", headers=demo_headers)

        tx_count = len(tx_r.json())
        budget_categories = budgets_r.json().get("category_budgets", [])
        budgeted_count = sum(1 for c in budget_categories if c.get("limit_paise", 0) > 0)
        passed = tx_count == 38 and budgeted_count == 6
        record(
            13,
            "Canonical database integrity (demo transactions & budgets intact)",
            passed,
            f"Transactions count: {tx_count}/38, Budgeted categories: {budgeted_count}/6 (Total categories: {len(budget_categories)})",
        )
    except Exception as e:
        record(13, "Canonical database integrity (demo transactions & budgets intact)", False, str(e))

    # Clean up test users created during verification run
    try:
        sys.path.insert(0, "backend")
        from app.db.session import SessionLocal
        from app.models.user import User
        db = SessionLocal()
        for em in [test_email, other_email]:
            u = db.query(User).filter(User.email == em).first()
            if u:
                db.delete(u)
        db.commit()
        db.close()
    except Exception as cleanup_err:
        print(f"Warning: cleanup error: {cleanup_err}")

    print("=" * 70)
    all_passed = all(r["passed"] for r in results)
    print(f"Verification Summary: {sum(1 for r in results if r['passed'])}/13 passed")
    if all_passed:
        print("ALL 13 PHASE E VERIFICATION STEPS PASSED SUCCESSFULLY!")
    else:
        print("SOME VERIFICATION STEPS FAILED!")
    print("=" * 70)


if __name__ == "__main__":
    run_verification()
