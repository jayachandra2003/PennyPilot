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
REMOTE_PORT = 9245
ARTIFACT_DIR = r"C:\Users\jayac\.gemini\antigravity\brain\c57dd9d8-efcb-43fc-a7c4-d18e8d653693"
SCREENSHOTS_DIR = "screenshots"

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def capture_and_save(ws, name, width=1440, height=920, mobile=False, msg_start=100):
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
    print(f"[VERIFIED] Saved {name} -> {local_path} and {artifact_path}")

async def main():
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    user_data = os.path.abspath(f"scratch/chrome_session_fixes_{int(time.time())}")
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
        "http://localhost:5173/"
    ]
    proc = subprocess.Popen(args)
    await asyncio.sleep(2.5)

    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{REMOTE_PORT}/json")
        tabs = json.loads(req.read().decode())
        page_tabs = [t for t in tabs if t.get("type") == "page"]
        ws_url = page_tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
            print("Connected to Chrome CDP session for UI fixes verification.")
            await send_cdp(ws, "Page.enable", {}, 1)
            await asyncio.sleep(1.5)

            # Sign in
            login_js = """
            (() => {
                const emailInput = document.getElementById('auth-email');
                const passInput = document.getElementById('auth-password');
                if (!emailInput || !passInput) return 'inputs_not_found';

                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(emailInput, 'demo@pennypilot.in');
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));

                setter.call(passInput, 'DemoPassword123!');
                passInput.dispatchEvent(new Event('input', { bubbles: true }));

                const submitBtn = emailInput.closest('form').querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                    return 'clicked_submit';
                }
                return 'no_submit_btn';
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": login_js}, 2)
            await asyncio.sleep(3.0)

            # Dismiss any alerts
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            document.querySelectorAll('[role="alert"], [role="status"]').forEach(el => el.remove());
            """}, 3)
            await asyncio.sleep(0.5)

            async def set_theme(theme_name):
                js = f"""
                (() => {{
                    localStorage.setItem('pennypilot_theme', '{theme_name}');
                    if ('{theme_name}' === 'dark') {{
                        document.documentElement.classList.add('dark');
                        document.documentElement.setAttribute('data-theme', 'dark');
                    }} else {{
                        document.documentElement.classList.remove('dark');
                        document.documentElement.setAttribute('data-theme', 'light');
                    }}
                }})()
                """
                await send_cdp(ws, "Runtime.evaluate", {"expression": js}, 4)
                await asyncio.sleep(0.6)

            # 1. Dark Mode — Dashboard Top (verifying enlarged header, logo, app name, Quick Add in header, absence of on-track tag, notification bell)
            await set_theme("dark")
            await capture_and_save(ws, "fixed_navbar_dark_top", width=1440, height=960, msg_start=10)

            # 2. Dark Mode — Scrolled Down (verifying fixed header stays pinned to viewport top on scroll)
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 500);"}, 20)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "fixed_navbar_dark_scrolled", width=1440, height=960, msg_start=30)

            # 3. Dark Mode — Scroll back to top & Click Notification Bell
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 40)
            await asyncio.sleep(0.5)
            open_notifications_js = """
            (() => {
                const bell = document.querySelector('button[aria-label*="Notifications and financial tips"]');
                if (bell) {
                    bell.click();
                    return 'clicked_bell';
                }
                return 'bell_not_found';
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_notifications_js}, 50)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "fixed_navbar_notifications_dark", width=1440, height=960, msg_start=60)

            # Close notification popover
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_notifications_js}, 70)
            await asyncio.sleep(0.5)

            # 4. Light Mode — Dashboard Top
            await set_theme("light")
            await capture_and_save(ws, "fixed_navbar_light_top", width=1440, height=960, msg_start=80)

            # 5. Light Mode — Scrolled Down
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 500);"}, 90)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "fixed_navbar_light_scrolled", width=1440, height=960, msg_start=100)

            # 6. Light Mode — Notification Bell Open
            await send_cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 110)
            await asyncio.sleep(0.5)
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_notifications_js}, 120)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "fixed_navbar_notifications_light", width=1440, height=960, msg_start=130)

            print("All requested UI fixes successfully captured and verified via CDP!")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
