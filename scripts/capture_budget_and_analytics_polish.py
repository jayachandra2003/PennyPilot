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
REMOTE_PORT = 9295
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

    user_data = os.path.abspath(f"scratch/chrome_session_budget_analytics_{int(time.time())}")
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

            # ============================================================
            # 1. BUDGET MANAGEMENT PAGE (LIGHT MODE)
            # ============================================================
            print("=== Navigating to Budgets tab ===", flush=True)
            nav_budget = """
                const buttons = Array.from(document.querySelectorAll('nav button, header button'));
                const btn = buttons.find(b => b.textContent && b.textContent.includes('Budgets'));
                if (btn) btn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": nav_budget}, 10)
            await asyncio.sleep(2.0)

            # 1a. Budget Top: Calendar picker, 4 KPI cards, Streamlined Velocity card
            await capture_and_save(ws, "audit_budget_top_velocity_light", 1440, 950, msg_start=20)

            # 1b. Click Calendar picker on Budget page to capture open popover
            open_calendar_budget = """
                const pickerBtn = document.querySelector('button[aria-label="Open month selector"], button[aria-label*="month selector"], button[aria-label="Previous month"] + button');
                if (pickerBtn) pickerBtn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_calendar_budget}, 30)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_budget_calendar_popover_light", 1440, 950, msg_start=32)

            # Close calendar picker by clicking outside
            await send_cdp(ws, "Runtime.evaluate", {"expression": "document.body.click();"}, 40)
            await asyncio.sleep(0.5)

            # 1c. Scroll to Category Allocation Ceilings (Humanized status badges + tactile buttons)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 480)"}, 50)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_budget_category_cards_light", 1440, 950, msg_start=52)

            # ============================================================
            # 2. BUDGET MANAGEMENT PAGE (DARK MODE)
            # ============================================================
            print("=== Switching to Dark Mode ===", flush=True)
            theme_dark = """
                document.documentElement.classList.add('dark');
                localStorage.setItem('pennypilot_theme', 'dark');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": theme_dark}, 60)
            await asyncio.sleep(0.8)

            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"}, 65)
            await asyncio.sleep(0.6)
            await capture_and_save(ws, "audit_budget_top_dark", 1440, 950, msg_start=68)

            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 480)"}, 75)
            await asyncio.sleep(0.6)
            await capture_and_save(ws, "audit_budget_category_cards_dark", 1440, 950, msg_start=78)

            # ============================================================
            # 3. HISTORICAL ANALYTICS PAGE (LIGHT MODE)
            # ============================================================
            print("=== Navigating to Analytics tab (Light Mode) ===", flush=True)
            theme_light = """
                document.documentElement.classList.remove('dark');
                localStorage.setItem('pennypilot_theme', 'light');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": theme_light}, 90)

            nav_analytics = """
                const buttons = Array.from(document.querySelectorAll('nav button, header button'));
                const btn = buttons.find(b => b.textContent && b.textContent.includes('Analytics'));
                if (btn) btn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": nav_analytics}, 92)
            await asyncio.sleep(2.0)

            # 3a. Top half: 4 Macro cards + 6-Month Income vs Expense Trends
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"}, 95)
            await asyncio.sleep(0.6)
            await capture_and_save(ws, "audit_analytics_top_trends_light", 1440, 950, msg_start=100)

            # 3b. Open Export Report dropdown menu
            open_export_menu = """
                const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Export Report'));
                if (exportBtn) exportBtn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_export_menu}, 110)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_analytics_export_menu_open", 1440, 950, msg_start=112)

            # Close export menu
            await send_cdp(ws, "Runtime.evaluate", {"expression": "document.body.click();"}, 120)
            await asyncio.sleep(0.5)

            # 3c. Open Calendar picker on Analytics page
            open_calendar_analytics = """
                const pickerBtn = document.querySelector('button[aria-label="Open month selector"], button[aria-label*="month selector"], button[aria-label="Previous period"] + div button, button[aria-label="Previous period"] + button');
                if (pickerBtn) pickerBtn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_calendar_analytics}, 130)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_analytics_calendar_popover_light", 1440, 950, msg_start=132)

            # Close calendar
            await send_cdp(ws, "Runtime.evaluate", {"expression": "document.body.click();"}, 140)
            await asyncio.sleep(0.5)

            # 3d. Scroll down to DE-BLURRED bottom half (Inspecting Period, MoM Shift, Category Breakdown, Top Categories)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 480)"}, 150)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_analytics_deblurred_bottom_light", 1440, 950, msg_start=152)

            # ============================================================
            # 4. HISTORICAL ANALYTICS PAGE (DARK MODE)
            # ============================================================
            print("=== Analytics Dark Mode De-Blurred Verification ===", flush=True)
            await send_cdp(ws, "Runtime.evaluate", {"expression": theme_dark}, 160)
            await asyncio.sleep(0.8)

            await capture_and_save(ws, "audit_analytics_deblurred_bottom_dark", 1440, 950, msg_start=162)

            print("=== All budget & analytics visual verifications completed successfully ===", flush=True)

    finally:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            pass
        shutil.rmtree(user_data, ignore_errors=True)

if __name__ == "__main__":
    asyncio.run(main())
