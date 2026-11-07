import asyncio
import json
import os
import subprocess
import time
import urllib.request
import websockets
from PIL import Image

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9223

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def capture_screen(url, output_path, width=1440, height=900, evaluate_js=None, wait_time=2.5):
    # Launch Chrome
    user_data = os.path.abspath(f"scratch/chrome_shot_profile_{width}_{int(time.time()*1000)%10000}")
    os.makedirs(user_data, exist_ok=True)
    args = [
        CHROME_PATH,
        f"--remote-debugging-port={REMOTE_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-extensions",
        f"--window-size={width},{height}",
        url
    ]
    proc = subprocess.Popen(args)
    await asyncio.sleep(1.8)

    try:
        # Get devtools ws endpoint
        meta_url = f"http://127.0.0.1:{REMOTE_PORT}/json"
        req = urllib.request.urlopen(meta_url)
        tabs = json.loads(req.read().decode())
        page_tabs = [t for t in tabs if t.get("type") == "page"]
        ws_url = page_tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
            # Emulate device metrics
            await send_cdp(ws, "Emulation.setDeviceMetricsOverride", {
                "width": width,
                "height": height,
                "deviceScaleFactor": 1,
                "mobile": width < 600,
            }, 10)

            # Authenticate with mock token in localStorage
            mock_auth_token = "mock-brand-cleanup-jwt-token"
            mock_user = {
                "id": "brand-clean-uuid",
                "email": "demo@pennypilot.in",
                "display_name": "Jayanth A",
                "currency": "INR",
                "is_active": True,
                "email_verified": True
            }
            auth_script = f"""
            localStorage.setItem('pennypilot_token', '{mock_auth_token}');
            localStorage.setItem('pennypilot_user', '{json.dumps(mock_user)}');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": auth_script}, 20)

            # Reload to apply auth state
            await send_cdp(ws, "Page.reload", {}, 30)
            await asyncio.sleep(wait_time)

            if evaluate_js:
                await send_cdp(ws, "Runtime.evaluate", {"expression": evaluate_js}, 40)
                await asyncio.sleep(1.2)

            # Capture screenshot
            res = await send_cdp(ws, "Page.captureScreenshot", {"format": "png"}, 50)
            img_data = res["data"]
            import base64
            raw_png = base64.b64decode(img_data)
            with open(output_path, "wb") as f:
                f.write(raw_png)
            print(f"Captured: {output_path} ({width}x{height})")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

async def main():
    os.makedirs("screenshots", exist_ok=True)

    # 1. Desktop Dashboard with new logo & cleaned navbar
    await capture_screen(
        "http://localhost:5173/",
        "screenshots/verified_brand_desktop_1440.png",
        width=1440,
        height=900,
        wait_time=2.5
    )

    # 2. Desktop Widescreen 1640
    await capture_screen(
        "http://localhost:5173/",
        "screenshots/verified_brand_desktop_1640.png",
        width=1640,
        height=950,
        wait_time=2.5
    )

    # 3. Mobile View (390x844)
    await capture_screen(
        "http://localhost:5173/",
        "screenshots/verified_brand_mobile_390.png",
        width=390,
        height=844,
        wait_time=2.5
    )

    # 4. Login Screen / Auth Modal
    open_login_js = """
    localStorage.removeItem('pennypilot_token');
    localStorage.removeItem('pennypilot_user');
    window.location.reload();
    """
    # Or click Sign In
    await capture_screen(
        "http://localhost:5173/",
        "screenshots/verified_brand_login_modal.png",
        width=1280,
        height=800,
        evaluate_js="""
        localStorage.removeItem('pennypilot_token');
        localStorage.removeItem('pennypilot_user');
        window.location.reload();
        """,
        wait_time=2.0
    )

if __name__ == "__main__":
    asyncio.run(main())
