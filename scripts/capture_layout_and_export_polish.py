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
REMOTE_PORT = 9292
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
    print(f"[CAPTURED] {name} -> {local_path} and {artifact_path}", flush=True)

async def main():
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    user_data = os.path.abspath(f"scratch/chrome_session_polish_{int(time.time())}")
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

            # 1. Desktop Dashboard - Light Mode (Cashflow/Donut equal size, Trajectory 65% + Income 35%, Full-width Ledger)
            await capture_and_save(ws, "audit_polish_dashboard_light", 1440, 950, msg_start=10)

            # Scroll down to capture the full Trajectory, Income Streams, and Full-Width Recent Transactions
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 480)"}, 20)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_polish_dashboard_lower_light", 1440, 950, msg_start=22)

            # Scroll down to capture Full-Width Recent Transactions
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 950)"}, 25)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_polish_recent_tx_fullwidth", 1440, 950, msg_start=27)

            # 2. Income Management Modal (Verify liquid glass is gone, solid Quiet Ledger theme)
            click_manage_script = """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const manageBtn = btns.find(b => b.textContent.includes('Manage'));
                    if (manageBtn) {
                        manageBtn.click();
                        return true;
                    }
                    return false;
                })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": click_manage_script}, 30)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "audit_polish_income_modal_light", 1440, 950, msg_start=32)

            # Close modal with Done button
            close_modal_script = """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const doneBtn = btns.find(b => b.textContent.includes('Done'));
                    if (doneBtn) doneBtn.click();
                })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": close_modal_script}, 40)
            await asyncio.sleep(0.5)

            # 3. Desktop Dashboard - Dark Mode
            print("=== Setting up Dark Mode ===", flush=True)
            toggle_dark_script = """
                localStorage.setItem('pennypilot_theme', 'dark');
                document.documentElement.classList.add('dark');
                window.scrollTo(0, 0);
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": toggle_dark_script}, 50)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "audit_polish_dashboard_dark", 1440, 950, msg_start=52)

            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 480)"}, 60)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_polish_dashboard_lower_dark", 1440, 950, msg_start=62)

            # Income modal in Dark Mode (Midnight Ledger verification)
            await send_cdp(ws, "Runtime.evaluate", {"expression": click_manage_script}, 70)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "audit_polish_income_modal_dark", 1440, 950, msg_start=72)
            await send_cdp(ws, "Runtime.evaluate", {"expression": close_modal_script}, 80)
            await asyncio.sleep(0.5)

            # Switch back to light for clean page navigations
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
                localStorage.setItem('pennypilot_theme', 'light');
                document.documentElement.classList.remove('dark');
                window.scrollTo(0, 0);
            """}, 90)
            await asyncio.sleep(0.5)

            # 4. Transactions Page (Check: No 'Audit Trail' above Financial Ledger, Export Report dropdown open with CSV/PDF/DOCX)
            print("=== Testing Transactions Page ===", flush=True)
            nav_transactions_script = """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const txBtn = btns.find(b => b.textContent.includes('Transactions'));
                    if (txBtn) {
                        txBtn.click();
                        return true;
                    }
                    return false;
                })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": nav_transactions_script}, 100)
            await asyncio.sleep(1.5)

            # Open Export Report dropdown
            open_export_script = """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const exportBtn = btns.find(b => b.textContent.includes('Export Report'));
                    if (exportBtn) {
                        exportBtn.click();
                        return true;
                    }
                    return false;
                })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_export_script}, 110)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_polish_transactions_export_menu", 1440, 950, msg_start=112)

            # 5. Budget Management Page (Check: No Capital Allocation, No Timeline Calibration, No Granular Limits)
            print("=== Testing Budget Management Page ===", flush=True)
            nav_budget_script = """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const bBtn = btns.find(b => b.textContent.includes('Budgets'));
                    if (bBtn) {
                        bBtn.click();
                        return true;
                    }
                    return false;
                })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": nav_budget_script}, 120)
            await asyncio.sleep(1.5)
            await capture_and_save(ws, "audit_polish_budget_page_top", 1440, 950, msg_start=122)

            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 480)"}, 130)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_polish_budget_page_lower", 1440, 950, msg_start=132)

            print("[SUCCESS] All layout & polish screenshots captured successfully.", flush=True)

    finally:
        proc.terminate()
        try:
            shutil.rmtree(user_data, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(main())
