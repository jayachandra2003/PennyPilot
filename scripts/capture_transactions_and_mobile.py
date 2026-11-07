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
REMOTE_PORT = 9299
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
    user_data = os.path.abspath(f"scratch/chrome_session_tx_{int(time.time())}")
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
            auth_script = f"""
                localStorage.setItem('pennypilot_token', '{token}');
                localStorage.removeItem('pennypilot_logged_out');
                localStorage.setItem('pennypilot_theme', 'light');
                sessionStorage.setItem('pennypilot_onboarding_dismissed', 'true');
                document.documentElement.classList.remove('dark');
                location.reload();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": auth_script}, 1)
            await asyncio.sleep(3.5)

            # 1. Click Transactions
            print("--- Navigating to Transactions Page ---")
            click_tx = """
                const buttons = Array.from(document.querySelectorAll('nav button'));
                const btn = buttons.find(b => b.textContent && b.textContent.includes('Transactions'));
                if (btn) btn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": click_tx}, 10)
            await asyncio.sleep(1.5)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 20)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "audit_clean_transactions_page_light", 1440, 900, False, 30)

            # 2. Click Insights on mobile
            print("--- Navigating to Mobile Insights ---")
            click_insights = """
                const buttons = Array.from(document.querySelectorAll('nav button, header button'));
                const btn = buttons.find(b => b.textContent && b.textContent.includes('Insights'));
                if (btn) btn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": click_insights}, 40)
            await asyncio.sleep(1.5)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 50)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "audit_clean_mobile_insights_light", 390, 844, True, 60)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        print("[SUCCESS] Transactions and mobile captures completed.")

if __name__ == "__main__":
    asyncio.run(main())
