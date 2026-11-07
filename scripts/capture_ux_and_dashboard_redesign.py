import asyncio
import base64
import json
import os
import shutil
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9255
ARTIFACT_DIR = r"C:\Users\jayac\.gemini\antigravity\brain\c57dd9d8-efcb-43fc-a7c4-d18e8d653693"
SCREENSHOTS_DIR = "screenshots"

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def capture_and_save(ws, name, width=1440, height=960, mobile=False, msg_start=100):
    await send_cdp(ws, "Emulation.setDeviceMetricsOverride", {
        "width": width,
        "height": height,
        "deviceScaleFactor": 1,
        "mobile": mobile,
    }, msg_start)

    await asyncio.sleep(1.0)

    res = await send_cdp(ws, "Page.captureScreenshot", {"format": "png"}, msg_start + 1)
    raw_png = base64.b64decode(res["data"])

    local_path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    with open(local_path, "wb") as f:
        f.write(raw_png)

    artifact_path = os.path.join(ARTIFACT_DIR, f"{name}.png")
    shutil.copyfile(local_path, artifact_path)
    print(f"[VERIFIED] Saved {name} -> {local_path} and {artifact_path}")

async def main():
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    user_data = os.path.abspath(f"scratch/chrome_session_redesign_{int(time.time())}")
    os.makedirs(user_data, exist_ok=True)

    args = [
        CHROME_PATH,
        f"--remote-debugging-port={REMOTE_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-extensions",
        "--window-size=1440,960",
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

        async with websockets.connect(ws_url, max_size=20*1024*1024) as ws:
            # 1. Login session setup
            mock_user = {
                "id": "u-king-test-id",
                "email": "king@pennypilot.in",
                "display_name": "King",
                "timezone": "Asia/Kolkata",
                "currency": "INR",
                "email_verified": True,
                "onboarding_completed": True,
                "created_at": "2026-11-01T00:00:00Z"
            }
            auth_setup_script = f"""
                localStorage.setItem('pennypilot_token', 'mock-valid-verification-token');
                localStorage.setItem('pennypilot_theme', 'dark');
                sessionStorage.setItem('pennypilot_onboarding_dismissed', 'true');
                document.documentElement.classList.add('dark');
                location.reload();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": auth_setup_script}, 1)
            await asyncio.sleep(2.5)

            # 2. Dark Mode Dashboard Redesign
            await capture_and_save(ws, "redesigned_dashboard_dark", 1440, 960, False, 10)

            # 3. Yearly View on Dashboard
            yearly_click_script = """
                const buttons = Array.from(document.querySelectorAll('button'));
                const yearlyBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Yearly');
                if (yearlyBtn) yearlyBtn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": yearly_click_script}, 20)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "redesigned_dashboard_yearly", 1440, 960, False, 30)

            # Switch back to Monthly
            monthly_click_script = """
                const buttons = Array.from(document.querySelectorAll('button'));
                const monthlyBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Monthly');
                if (monthlyBtn) monthlyBtn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": monthly_click_script}, 40)
            await asyncio.sleep(0.8)

            # 4. Open Notification Bell Popover
            notif_click_script = """
                const notifBtn = document.querySelector('button[aria-label*="notification" i], button[title*="notification" i], header button');
                const bellBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('lucide-bell') || b.querySelector('svg.lucide-bell'));
                if (bellBtn) bellBtn.click();
                else if (notifBtn) notifBtn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": notif_click_script}, 50)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "redesigned_notifications_dark", 1440, 960, False, 60)

            # Close notification popover by clicking body
            await send_cdp(ws, "Runtime.evaluate", {"expression": "document.body.click();"}, 70)
            await asyncio.sleep(0.5)

            # 5. Light Mode Dashboard Redesign
            light_mode_script = """
                localStorage.setItem('pennypilot_theme', 'light');
                document.documentElement.classList.remove('dark');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": light_mode_script}, 80)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "redesigned_dashboard_light", 1440, 960, False, 90)

            # 6. Financial Onboarding Wizard (Phase 1 Refinement check)
            wizard_open_script = """
                window.dispatchEvent(new CustomEvent('pennypilot:open-onboarding'));
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": wizard_open_script}, 100)
            await asyncio.sleep(1.2)
            await capture_and_save(ws, "redesigned_onboarding_step1", 1440, 960, False, 110)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        print("[DONE] Verification screenshots completed.")

if __name__ == "__main__":
    asyncio.run(main())
