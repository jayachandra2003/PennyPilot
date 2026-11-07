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
REMOTE_PORT = 9295
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
    user_data = os.path.abspath("scratch/test_chrome_full_audit")
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

            # Helper for clicking desktop nav items
            async def nav_to(tab_name, call_id):
                click_js = f"""
                    const btns = Array.from(document.querySelectorAll('nav[aria-label="Primary Navigation"] button'));
                    const target = btns.find(b => b.innerText.toLowerCase().includes('{tab_name.lower()}'));
                    if (target) {{ target.click(); 'clicked'; }} else {{ 'not found'; }}
                """
                await send_cdp(ws, "Runtime.evaluate", {"expression": click_js}, call_id)
                await asyncio.sleep(1.2)

            msg_id = 10

            # 1. Historical Analytics (Light)
            await nav_to("analytics", msg_id)
            msg_id += 1
            await capture_screenshot(ws, "audit_final_analytics_light.png", msg_id)
            msg_id += 1

            # 2. Historical Analytics (Dark)
            set_dark = """
                document.documentElement.classList.add('dark');
                localStorage.setItem('pennypilot_theme', 'dark');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_dark}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_final_analytics_dark.png", msg_id)
            msg_id += 1

            # Switch back to light
            set_light = """
                document.documentElement.classList.remove('dark');
                localStorage.setItem('pennypilot_theme', 'light');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_light}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # 3. Financial Insights (Light)
            await nav_to("insights", msg_id)
            msg_id += 1
            await capture_screenshot(ws, "audit_final_insights_light.png", msg_id)
            msg_id += 1

            # 4. Financial Insights (Dark)
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_dark}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_final_insights_dark.png", msg_id)
            msg_id += 1

            # Switch back to light
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_light}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # 5. Categories Page (Light)
            await nav_to("categories", msg_id)
            msg_id += 1
            await capture_screenshot(ws, "audit_final_categories_light.png", msg_id)
            msg_id += 1

            # 6. Categories Page (Dark)
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_dark}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_final_categories_dark.png", msg_id)
            msg_id += 1

            # Switch back to light
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_light}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # 7. Account Settings Page (Light)
            # Open settings via ProfileDropdown or direct tab click
            open_settings_js = """
                // find profile dropdown button (avatar or user name button)
                const avatarBtn = document.querySelector('button[aria-haspopup="menu"]');
                if (avatarBtn) {
                    avatarBtn.click();
                    setTimeout(() => {
                        const settingsItem = Array.from(document.querySelectorAll('[role="menuitem"], button')).find(b => b.innerText.includes('Account Settings') || b.innerText.includes('Settings'));
                        if (settingsItem) settingsItem.click();
                    }, 200);
                }
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_settings_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(1.0)
            await capture_screenshot(ws, "audit_final_settings_light.png", msg_id)
            msg_id += 1

            # 8. Account Settings Page (Dark)
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_dark}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_final_settings_dark.png", msg_id)
            msg_id += 1

            # Switch back to light
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_light}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # 9. Edit Profile Modal (Light)
            open_profile_modal_js = """
                const avatarBtn = document.querySelector('button[aria-haspopup="menu"]');
                if (avatarBtn) {
                    avatarBtn.click();
                    setTimeout(() => {
                        const profileItem = Array.from(document.querySelectorAll('[role="menuitem"], button')).find(b => b.innerText.includes('Edit Profile') || b.innerText.includes('Profile'));
                        if (profileItem) profileItem.click();
                    }, 200);
                }
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_profile_modal_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(1.0)
            await capture_screenshot(ws, "audit_final_profile_modal_light.png", msg_id)
            msg_id += 1

            # 10. Edit Profile Modal (Dark)
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_dark}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_final_profile_modal_dark.png", msg_id)
            msg_id += 1

            # Switch back to light
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_light}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # Close modal
            close_modal_js = """
                const closeBtn = document.querySelector('button[aria-label="Close profile modal"]');
                if (closeBtn) closeBtn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": close_modal_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # 11. Mobile Viewport (390px) - Settings
            await send_cdp(ws, "Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True
            }, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_final_settings_mobile_light.png", msg_id)
            msg_id += 1

            # 12. Mobile Viewport (390px) - Profile Modal
            # Reopen profile modal on mobile
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_profile_modal_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(1.0)
            await capture_screenshot(ws, "audit_final_profile_modal_mobile_light.png", msg_id)
            msg_id += 1

            print("All audit captures completed successfully!")

    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
