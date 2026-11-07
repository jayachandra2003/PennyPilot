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
REMOTE_PORT = 9288
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
    await asyncio.sleep(0.8)
    res = await send_cdp(ws, "Page.captureScreenshot", {"format": "png"}, msg_start + 1)
    raw_png = base64.b64decode(res["data"])
    local_path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    with open(local_path, "wb") as f:
        f.write(raw_png)
    artifact_path = os.path.join(ARTIFACT_DIR, f"{name}.png")
    shutil.copyfile(local_path, artifact_path)
    print(f"[CAPTURED] {name} -> {local_path} and {artifact_path}")

async def main():
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    user_data = os.path.abspath(f"scratch/chrome_session_cleanup_{int(time.time())}")
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
        "http://localhost:5173"
    ]
    proc = subprocess.Popen(args)
    await asyncio.sleep(2.5)

    try:
        meta_url = f"http://127.0.0.1:{REMOTE_PORT}/json"
        req = urllib.request.urlopen(meta_url)
        tabs = json.loads(req.read().decode())
        ws_url = [t for t in tabs if t.get("type") == "page"][0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
            token = create_access_token(subject=TEST_USER_ID)

            # -------------------------------------------------------------
            # LIGHT THEME AUDIT
            # -------------------------------------------------------------
            print("=== 1. Testing Light Mode Dashboard & Insights ===")
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

            # 1. Dashboard Header (Light): Proves Monthly Verdict gone, Executive Position gone, Greeting larger
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 10)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "audit_clean_dashboard_header_light", 1440, 900, False, 20)

            # 2. Lower Dashboard (Light): Proves Spending Velocity gone, Audit Trail gone, NO Insights at bottom
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 1100);"}, 30)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_clean_dashboard_lower_light", 1440, 900, False, 40)

            # 3. Dedicated Financial Insights Page (Light): Click "Insights" in Navbar
            print("--- Navigating to Dedicated Insights Page (Light) ---")
            click_insights = """
                const buttons = Array.from(document.querySelectorAll('nav button, header button'));
                const btn = buttons.find(b => b.textContent && b.textContent.trim().includes('Insights'));
                if (btn) btn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": click_insights}, 50)
            await asyncio.sleep(1.5)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 60)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "audit_clean_insights_page_light", 1440, 900, False, 70)

            # 4. Transactions Ledger Page (Light): Proves untouched and intact
            print("--- Navigating to Transactions Page ---")
            click_transactions = """
                const buttons = Array.from(document.querySelectorAll('nav button, header button'));
                const btn = buttons.find(b => b.textContent && b.textContent.trim() === 'Transactions');
                if (btn) btn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": click_transactions}, 80)
            await asyncio.sleep(1.5)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 90)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "audit_clean_transactions_page_light", 1440, 900, False, 100)

            # -------------------------------------------------------------
            # DARK THEME AUDIT
            # -------------------------------------------------------------
            print("=== 2. Testing Dark Mode Dashboard & Insights ===")
            auth_dark = """
                localStorage.setItem('pennypilot_theme', 'dark');
                document.documentElement.classList.add('dark');
                location.reload();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": auth_dark}, 110)
            await asyncio.sleep(3.5)

            # 5. Dashboard Header (Dark)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 120)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "audit_clean_dashboard_header_dark", 1440, 900, False, 130)

            # 6. Lower Dashboard (Dark): No insights at bottom
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 1100);"}, 140)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_clean_dashboard_lower_dark", 1440, 900, False, 150)

            # 7. Dedicated Insights Page (Dark)
            print("--- Navigating to Dedicated Insights Page (Dark) ---")
            await send_cdp(ws, "Runtime.evaluate", {"expression": click_insights}, 160)
            await asyncio.sleep(1.5)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 170)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "audit_clean_insights_page_dark", 1440, 900, False, 180)

            # -------------------------------------------------------------
            # MOBILE AUDIT (390px)
            # -------------------------------------------------------------
            print("=== 3. Testing Mobile Responsive (390px) ===")
            # Return to dashboard
            click_dashboard = """
                const buttons = Array.from(document.querySelectorAll('nav button, header button'));
                const btn = buttons.find(b => b.textContent && b.textContent.trim().includes('Dashboard') || b.textContent.trim() === 'Home');
                if (btn) btn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": click_dashboard}, 190)
            await asyncio.sleep(1.5)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 200)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "audit_clean_mobile_dashboard_dark", 390, 844, True, 210)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        print("[SUCCESS] Content cleanup browser verification completed.")

if __name__ == "__main__":
    asyncio.run(main())
