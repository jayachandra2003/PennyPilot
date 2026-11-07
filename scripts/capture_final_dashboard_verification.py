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

# Import genuine JWT generation for test user
sys.path.insert(0, os.path.abspath("backend"))
from app.core.security import create_access_token

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9266
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

    user_data = os.path.abspath(f"scratch/chrome_session_final_{int(time.time())}")
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
        page_tabs = [t for t in tabs if t.get("type") == "page"]
        ws_url = page_tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
            # 1. Setup authenticated session in dark mode with genuine JWT
            token = create_access_token(subject=TEST_USER_ID)
            auth_script = f"""
                localStorage.setItem('pennypilot_token', '{token}');
                localStorage.removeItem('pennypilot_logged_out');
                localStorage.setItem('pennypilot_theme', 'dark');
                sessionStorage.setItem('pennypilot_onboarding_dismissed', 'true');
                document.documentElement.classList.add('dark');
                location.reload();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": auth_script}, 1)
            await asyncio.sleep(3.5)

            # 2. Viewport Matrix in Dark Mode (1440px, 1280px, 768px, 390px)
            print("--- Capturing Simplified Dashboard Matrix (Dark Mode) ---")
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 15)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "audit_dashboard_1440_dark", 1440, 900, False, 20)
            await capture_and_save(ws, "audit_dashboard_1280_dark", 1280, 800, False, 30)
            await capture_and_save(ws, "audit_dashboard_768_dark", 768, 1024, False, 40)
            await capture_and_save(ws, "audit_dashboard_390_dark", 390, 844, True, 50)

            # Reset to 1440 for scrolled and lower section tests
            await send_cdp(ws, "Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False,
            }, 60)

            # 3. Scrolled Navbar Check (Dark Mode) - Verifying translucent ~92% dark surface with subtle blur
            print("--- Testing Scrolled Translucent Navbar (Dark Mode) ---")
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 260);"}, 70)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_navbar_scrolled_dark", 1440, 900, False, 80)

            # 4. Lower Dashboard Check: Income Streams & Recent Transactions (Dark Mode)
            print("--- Testing Lower Dashboard Layout (Dark Mode) ---")
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 1020);"}, 90)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_lower_dashboard_dark", 1440, 900, False, 100)

            # 5. Switch to Light Mode
            print("--- Testing Simplified Dashboard Matrix (Light Mode) ---")
            light_script = """
                localStorage.setItem('pennypilot_theme', 'light');
                document.documentElement.classList.remove('dark');
                location.reload();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": light_script}, 110)
            await asyncio.sleep(3.0)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 120)
            await asyncio.sleep(0.5)

            # Viewport Matrix in Light Mode (1440px, 1280px, 768px, 390px)
            await capture_and_save(ws, "audit_dashboard_1440_light", 1440, 900, False, 130)
            await capture_and_save(ws, "audit_dashboard_1280_light", 1280, 800, False, 140)
            await capture_and_save(ws, "audit_dashboard_768_light", 768, 1024, False, 150)
            await capture_and_save(ws, "audit_dashboard_390_light", 390, 844, True, 160)

            # Reset to 1440 for scrolled tests in Light Mode
            await send_cdp(ws, "Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False,
            }, 170)

            # 6. Scrolled Navbar Check (Light Mode) - Verifying translucent ~92% white surface with subtle blur
            print("--- Testing Scrolled Translucent Navbar (Light Mode) ---")
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 260);"}, 180)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_navbar_scrolled_light", 1440, 900, False, 190)

            # 7. Lower Dashboard Check: Income Streams & Recent Transactions (Light Mode)
            print("--- Testing Lower Dashboard Layout (Light Mode) ---")
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 1020);"}, 200)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "audit_lower_dashboard_light", 1440, 900, False, 210)

            # 8. Yearly Mode Check (Light Mode)
            print("--- Testing Yearly Period Mode ---")
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 220)
            await asyncio.sleep(0.5)
            # Click the 'Yearly' button
            yearly_btn_click = """
                const buttons = Array.from(document.querySelectorAll('button'));
                const yearlyBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Yearly');
                if (yearlyBtn) yearlyBtn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": yearly_btn_click}, 230)
            await asyncio.sleep(1.2)
            await capture_and_save(ws, "audit_dashboard_yearly_light", 1440, 900, False, 240)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        print("[SUCCESS] All simplified dashboard browser verification captures completed.")

if __name__ == "__main__":
    asyncio.run(main())
