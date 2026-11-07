import asyncio
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9290
ARTIFACTS_DIR = r"C:\Users\jayac\.gemini\antigravity\brain\c57dd9d8-efcb-43fc-a7c4-d18e8d653693"

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def capture_screenshot(ws, filename, msg_id):
    res = await send_cdp(ws, "Page.captureScreenshot", {"format": "png"}, msg_id)
    data = base64.b64decode(res["data"])
    filepath = os.path.join(ARTIFACTS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(data)
    print(f"Captured: {filename}")

async def main():
    user_data = os.path.abspath("scratch/test_chrome_restored_gradient")
    os.makedirs(user_data, exist_ok=True)

    args = [
        CHROME_PATH,
        f"--remote-debugging-port={REMOTE_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1440,960",
        "http://localhost:5173",
    ]
    proc = subprocess.Popen(args)
    await asyncio.sleep(2.0)

    try:
        meta_url = f"http://127.0.0.1:{REMOTE_PORT}/json"
        req = urllib.request.urlopen(meta_url)
        tabs = json.loads(req.read().decode())
        ws_url = [t for t in tabs if t.get("type") == "page"][0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
            sys.path.insert(0, os.path.abspath("backend"))
            from app.core.security import create_access_token
            token = create_access_token(subject="515638d8-4430-4c18-8dfd-240ee5654570")

            setup_script = f"""
                localStorage.setItem('pennypilot_token', '{token}');
                localStorage.removeItem('pennypilot_logged_out');
                localStorage.setItem('pennypilot_theme', 'light');
                document.documentElement.classList.remove('dark');
                sessionStorage.setItem('pennypilot_onboarding_dismissed', 'true');
                location.href = 'http://localhost:5173';
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": setup_script}, 1)
            await asyncio.sleep(2.5)

            msg_id = 10

            # 1. Dashboard (Light) - Top View
            await capture_screenshot(ws, "audit_restored_dashboard_light.png", msg_id)
            msg_id += 1

            # 1b. Dashboard (Light) - Lower View (scroll down 500px)
            scroll_js = "window.scrollTo({top: 480, behavior: 'instant'});"
            await send_cdp(ws, "Runtime.evaluate", {"expression": scroll_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_restored_dashboard_lower_light.png", msg_id)
            msg_id += 1

            scroll_top_js = "window.scrollTo({top: 0, behavior: 'instant'});"
            await send_cdp(ws, "Runtime.evaluate", {"expression": scroll_top_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.3)

            # Helper for clicking desktop nav items cleanly
            async def nav_to(name, call_id):
                click_js = f"""
                    {{
                        const btns = Array.from(document.querySelectorAll('nav[aria-label="Primary Navigation"] button'));
                        const b = btns.find(btn => btn.textContent.trim().toLowerCase().includes('{name.lower()}'));
                        if (b) {{ b.click(); 'clicked'; }} else {{ 'not found'; }}
                    }}
                """
                await send_cdp(ws, "Runtime.evaluate", {"expression": click_js}, call_id)
                await asyncio.sleep(1.2)

            # 2. Budget Management (Light)
            await nav_to("budgets", msg_id)
            msg_id += 1
            await capture_screenshot(ws, "audit_restored_budgets_light.png", msg_id)
            msg_id += 1

            # 3. Analytics (Light)
            await nav_to("analytics", msg_id)
            msg_id += 1
            await capture_screenshot(ws, "audit_restored_analytics_light.png", msg_id)
            msg_id += 1

            # 4. Insights (Light)
            await nav_to("insights", msg_id)
            msg_id += 1
            await capture_screenshot(ws, "audit_restored_insights_light.png", msg_id)
            msg_id += 1

            # 5. Categories (Light)
            await nav_to("categories", msg_id)
            msg_id += 1
            await capture_screenshot(ws, "audit_restored_categories_light.png", msg_id)
            msg_id += 1

            # 6. Settings (Light)
            open_settings_js = """
                {
                    const avatarBtn = document.querySelector('button[aria-haspopup="menu"]');
                    if (avatarBtn) {
                        avatarBtn.click();
                        setTimeout(() => {
                            const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
                            const s = items.find(i => i.textContent.includes('Settings'));
                            if (s) s.click();
                        }, 200);
                    }
                }
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_settings_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(1.0)
            await capture_screenshot(ws, "audit_restored_settings_light.png", msg_id)
            msg_id += 1

            # 7. Dashboard Dark Mode (Midnight Ledger) to verify dark mode unchanged
            await nav_to("dashboard", msg_id)
            msg_id += 1
            set_dark = """
                document.documentElement.classList.add('dark');
                localStorage.setItem('pennypilot_theme', 'dark');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_dark}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_restored_dashboard_dark.png", msg_id)
            msg_id += 1

            # 8. Mobile Viewport 390px (Light Mode)
            set_light = """
                document.documentElement.classList.remove('dark');
                localStorage.setItem('pennypilot_theme', 'light');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_light}, msg_id)
            msg_id += 1
            await send_cdp(ws, "Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True
            }, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_restored_dashboard_mobile_light.png", msg_id)
            msg_id += 1

            print("All audit captures completed!")

    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
