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
REMOTE_PORT = 9298
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

    user_data = os.path.abspath(f"scratch/chrome_session_analytics_{int(time.time())}")
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
            await asyncio.sleep(4.0)

            # Wait until Navbar is hydrated, then click Analytics
            print("=== Navigating directly to Analytics tab ===", flush=True)
            click_analytics = """
                (function() {
                    const btns = Array.from(document.querySelectorAll('header button, nav button'));
                    const target = btns.find(b => b.textContent && b.textContent.trim().toLowerCase() === 'analytics');
                    if (target) {
                        target.click();
                        return 'CLICKED_ANALYTICS';
                    }
                    return 'NOT_FOUND: ' + btns.map(b => b.textContent.trim()).join(' | ');
                })()
            """
            res = await send_cdp(ws, "Runtime.evaluate", {"expression": click_analytics, "returnByValue": True}, 10)
            print("Analytics Nav Result:", res.get("value"), flush=True)
            await asyncio.sleep(2.5)

            # 1. Top of Analytics Page
            await capture_and_save(ws, "audit_analytics_top_trends_verified", 1440, 950, msg_start=20)

            # 2. Click Export Report button to open the dropdown menu
            print("=== Opening Export Report menu on Analytics ===", flush=True)
            click_export = """
                (function() {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const expBtn = btns.find(b => b.textContent && b.textContent.includes('Export Report'));
                    if (expBtn) {
                        expBtn.click();
                        return 'CLICKED_EXPORT';
                    }
                    return 'EXPORT_BTN_NOT_FOUND';
                })()
            """
            res = await send_cdp(ws, "Runtime.evaluate", {"expression": click_export, "returnByValue": True}, 30)
            print("Export Menu Result:", res.get("value"), flush=True)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "audit_analytics_export_dropdown_verified", 1440, 950, msg_start=32)

            # Close Export menu
            await send_cdp(ws, "Runtime.evaluate", {"expression": "document.body.click();"}, 40)
            await asyncio.sleep(0.5)

            # 3. Click CalendarMonthPicker on Analytics page
            print("=== Opening Calendar on Analytics page ===", flush=True)
            click_cal = """
                (function() {
                    const calBtn = document.querySelector('button[aria-label^="Select calendar month"]');
                    if (calBtn) {
                        calBtn.click();
                        return 'CLICKED_CALENDAR';
                    }
                    return 'CAL_NOT_FOUND';
                })()
            """
            res = await send_cdp(ws, "Runtime.evaluate", {"expression": click_cal, "returnByValue": True}, 50)
            print("Calendar Open Result:", res.get("value"), flush=True)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "audit_analytics_calendar_popover_verified", 1440, 950, msg_start=52)

            # Close Calendar
            await send_cdp(ws, "Runtime.evaluate", {"expression": "document.body.click();"}, 60)
            await asyncio.sleep(0.5)

            # 4. Scroll down to show DE-BLURRED bottom half (Light Mode)
            print("=== Capturing De-Blurred Bottom Half (Light Mode) ===", flush=True)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 480);"}, 70)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "audit_analytics_deblurred_bottom_verified_light", 1440, 950, msg_start=72)

            # 5. Switch to Dark Mode and capture DE-BLURRED bottom half (Dark Mode)
            print("=== Capturing De-Blurred Bottom Half (Dark Mode) ===", flush=True)
            dark_script = """
                document.documentElement.classList.add('dark');
                localStorage.setItem('pennypilot_theme', 'dark');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": dark_script}, 80)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "audit_analytics_deblurred_bottom_verified_dark", 1440, 950, msg_start=82)

            print("=== Analytics verification complete! ===", flush=True)

    finally:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            pass
        shutil.rmtree(user_data, ignore_errors=True)

if __name__ == "__main__":
    asyncio.run(main())
