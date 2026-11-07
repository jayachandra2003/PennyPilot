import asyncio
import base64
import json
import os
import subprocess
import time
import urllib.request
import websockets
import sys

sys.path.insert(0, 'backend')
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import create_access_token

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9229

db = SessionLocal()
user = db.query(User).filter(User.email == "jayachandravennam.jc@gmail.com").first()
if not user:
    user = db.query(User).first()
token = create_access_token(subject=user.id, extra_claims={"email": user.email})

user_obj = {
    "id": user.id,
    "email": user.email,
    "display_name": user.display_name,
    "currency": user.currency,
    "is_active": True,
    "email_verified": True,
}

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def capture_views():
    user_data = os.path.abspath(f"scratch/chrome_shot_profile_{int(time.time()*1000)%10000}")
    os.makedirs(user_data, exist_ok=True)
    os.makedirs("artifacts", exist_ok=True)

    args = [
        CHROME_PATH,
        f"--remote-debugging-port={REMOTE_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-extensions",
        "--window-size=1440,900",
        "http://localhost:5173",
    ]
    proc = subprocess.Popen(args)
    await asyncio.sleep(2.5)

    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{REMOTE_PORT}/json")
        tabs = json.loads(req.read().decode())
        page_tabs = [t for t in tabs if t.get("type") == "page"]
        ws_url = page_tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
            msg_id = 1

            async def eval_js(js):
                nonlocal msg_id
                msg_id += 1
                return await send_cdp(ws, "Runtime.evaluate", {"expression": js, "awaitPromise": True}, msg_id)

            async def take_screenshot(filepath, width=1440, height=900):
                nonlocal msg_id
                msg_id += 1
                await send_cdp(ws, "Emulation.setDeviceMetricsOverride", {
                    "width": width, "height": height, "deviceScaleFactor": 1.0, "mobile": False
                }, msg_id)
                await asyncio.sleep(0.5)
                msg_id += 1
                res = await send_cdp(ws, "Page.captureScreenshot", {"format": "png"}, msg_id)
                data = base64.b64decode(res["data"])
                with open(filepath, "wb") as f:
                    f.write(data)
                print(f"Captured: {filepath} ({len(data)} bytes)", flush=True)

            # Setup auth token in localStorage + light mode
            setup_auth_js = f"""
            localStorage.setItem('pennypilot_theme', 'light');
            localStorage.setItem('pennypilot_token', '{token}');
            localStorage.setItem('pennypilot_user', '{json.dumps(user_obj)}');
            localStorage.setItem('pennypilot_tutorial_completed_{user.id}', 'true');
            localStorage.setItem('pennypilot_tutorial_skipped_{user.id}', 'true');
            localStorage.removeItem('pennypilot_logged_out');
            """
            await eval_js(setup_auth_js)
            await eval_js("window.location.href = '/'")
            await asyncio.sleep(3.0)

            # 1. Dashboard Light Mode
            await take_screenshot("artifacts/audit_dashboard_light_mode.png", 1440, 900)

            # 2. Insights Light Mode
            await eval_js("""
                const insightsNav = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Insights'));
                if (insightsNav) insightsNav.click();
            """)
            await asyncio.sleep(1.5)
            await take_screenshot("artifacts/audit_insights_light_mode.png", 1440, 900)

            # 3. Dedicated Copilot Page Light Mode
            await eval_js("""
                const copilotNav = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI Copilot'));
                if (copilotNav) copilotNav.click();
            """)
            await asyncio.sleep(1.5)
            await take_screenshot("artifacts/audit_copilot_light_mode.png", 1440, 900)

    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(capture_views())
