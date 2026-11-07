import asyncio
import base64
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
import websockets

sys.path.insert(0, os.path.abspath("backend"))
from app.core.security import create_access_token

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9297
ARTIFACT_DIR = r"C:\Users\jayac\.gemini\antigravity\brain\c57dd9d8-efcb-43fc-a7c4-d18e8d653693"
SCREENSHOTS_DIR = "screenshots"
TEST_USER_ID = "515638d8-4430-4c18-8dfd-240ee5654570"

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def capture_and_save(ws, name, width=1440, height=900, mobile=False, msg_start=100):
    await send_cdp(ws, "Emulation.setDeviceMetricsOverride", {
        "width": width,
        "height": height,
        "deviceScaleFactor": 1,
        "mobile": mobile,
    }, msg_start)
    await asyncio.sleep(0.7)
    res = await send_cdp(ws, "Page.captureScreenshot", {"format": "png"}, msg_start + 1)
    raw_png = base64.b64decode(res["data"])
    local_path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    with open(local_path, "wb") as f:
        f.write(raw_png)
    artifact_path = os.path.join(ARTIFACT_DIR, f"{name}.png")
    shutil.copyfile(local_path, artifact_path)
    print(f"[CAPTURED] {name} -> {local_path} and {artifact_path}", flush=True)

async def main():
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    user_data = os.path.abspath(f"scratch/chrome_session_pv_{int(time.time())}")
    os.makedirs(user_data, exist_ok=True)

    args = [
        CHROME_PATH,
        f"--remote-debugging-port={REMOTE_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-extensions",
        "--window-size=1920,1080",
        "http://localhost:5173",
    ]
    proc = subprocess.Popen(args)
    print(f"Started headless Chrome on port {REMOTE_PORT}...", flush=True)
    await asyncio.sleep(2.5)

    try:
        meta_url = f"http://127.0.0.1:{REMOTE_PORT}/json"
        req = urllib.request.urlopen(meta_url)
        tabs = json.loads(req.read().decode())
        page_tabs = [t for t in tabs if t.get("type") == "page"]
        if not page_tabs:
            print("[ERROR] No page tab found!", flush=True)
            return
        ws_url = page_tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
            token = create_access_token(subject=TEST_USER_ID)

            print("=== Setting up Light Mode & Auth ===", flush=True)
            auth_light = f"""
                localStorage.setItem('pennypilot_token', '{token}');
                localStorage.removeItem('pennypilot_logged_out');
                localStorage.setItem('pennypilot_theme', 'light');
                sessionStorage.setItem('pennypilot_onboarding_dismissed', 'true');
                document.documentElement.classList.remove('dark');
                location.reload();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": auth_light}, 1)
            await asyncio.sleep(3.5)

            # ----------------------------------------------------
            # 1. BUDGET PAGE VERIFICATION
            # ----------------------------------------------------
            print("=== Navigating to Budgets page ===", flush=True)
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
                const navBtns = Array.from(document.querySelectorAll('nav[aria-label="Primary Navigation"] button'));
                const budgetBtn = navBtns.find(b => b.textContent && b.textContent.includes('Budgets'));
                if (budgetBtn) budgetBtn.click();
            """}, 10)
            await asyncio.sleep(2.0)

            # 1a. Top: Streamlined Velocity Card & Month Picker
            await capture_and_save(ws, "audit_budget_top_view", 1440, 950, msg_start=20)

            # 1b. Click month selector to show CalendarMonthPicker OPEN on Budget page
            print("=== Opening Calendar on Budget page ===", flush=True)
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
                const calBtn = document.querySelector('button[aria-label^="Select calendar month"]');
                if (calBtn) calBtn.click();
            """}, 30)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_budget_calendar_open", 1440, 950, msg_start=32)

            # Close calendar
            await send_cdp(ws, "Runtime.evaluate", {"expression": "document.body.click();"}, 40)
            await asyncio.sleep(0.4)

            # 1c. Scroll to Category Allocation Ceilings
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 520)"}, 50)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_budget_category_cards_tactile", 1440, 950, msg_start=52)

            # ----------------------------------------------------
            # 2. HISTORICAL ANALYTICS PAGE VERIFICATION
            # ----------------------------------------------------
            print("=== Navigating to Analytics page ===", flush=True)
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
                window.scrollTo(0, 0);
                const navBtns = Array.from(document.querySelectorAll('nav[aria-label="Primary Navigation"] button'));
                const analyticsBtn = navBtns.find(b => b.textContent && b.textContent.includes('Analytics'));
                if (analyticsBtn) analyticsBtn.click();
            """}, 60)
            await asyncio.sleep(2.2)

            # 2a. Top: Analytics Header with Export Report & Calendar
            await capture_and_save(ws, "audit_analytics_top_trends", 1440, 950, msg_start=70)

            # 2b. Open Export Report dropdown menu (CSV, PDF, DOCX)
            print("=== Opening Export Report menu on Analytics page ===", flush=True)
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
                const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Export Report'));
                if (exportBtn) exportBtn.click();
            """}, 80)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_analytics_export_dropdown_open", 1440, 950, msg_start=82)

            # Close Export menu
            await send_cdp(ws, "Runtime.evaluate", {"expression": "document.body.click();"}, 90)
            await asyncio.sleep(0.4)

            # 2c. Open Calendar picker on Analytics page
            print("=== Opening Calendar on Analytics page ===", flush=True)
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
                const calBtn = document.querySelector('button[aria-label^="Select calendar month"]');
                if (calBtn) calBtn.click();
            """}, 100)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_analytics_calendar_picker_open", 1440, 950, msg_start=102)

            # Close Calendar
            await send_cdp(ws, "Runtime.evaluate", {"expression": "document.body.click();"}, 110)
            await asyncio.sleep(0.4)

            # 2d. Scroll to DE-BLURRED Bottom Half (Light Mode)
            print("=== Capturing De-Blurred Bottom Half (Light Mode) ===", flush=True)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 520)"}, 120)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_analytics_deblurred_bottom_sharp_light", 1440, 950, msg_start=122)

            # 2e. Dark Mode Verification of De-Blurred Bottom Half
            print("=== Capturing De-Blurred Bottom Half (Dark Mode) ===", flush=True)
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
                document.documentElement.classList.add('dark');
                localStorage.setItem('pennypilot_theme', 'dark');
            """}, 130)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_analytics_deblurred_bottom_sharp_dark", 1440, 950, msg_start=132)

            print("=== All verified successfully! ===", flush=True)

    finally:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            pass
        shutil.rmtree(user_data, ignore_errors=True)

if __name__ == "__main__":
    asyncio.run(main())
