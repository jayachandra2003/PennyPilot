import asyncio
import json
import os
import subprocess
import sys
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9299

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def main():
    user_data = os.path.abspath("scratch/test_chrome_nav")
    os.makedirs(user_data, exist_ok=True)

    args = [
        CHROME_PATH,
        f"--remote-debugging-port={REMOTE_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1920,1080",
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
            # Login and token setup
            sys.path.insert(0, os.path.abspath("backend"))
            from app.core.security import create_access_token
            token = create_access_token(subject="515638d8-4430-4c18-8dfd-240ee5654570")

            setup_script = f"""
                localStorage.setItem('pennypilot_token', '{token}');
                localStorage.removeItem('pennypilot_logged_out');
                localStorage.setItem('pennypilot_theme', 'light');
                sessionStorage.setItem('pennypilot_onboarding_dismissed', 'true');
                location.reload();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": setup_script}, 1)
            await asyncio.sleep(3.0)

            # Check buttons
            inspect_script = """
                Array.from(document.querySelectorAll('button')).map(b => ({
                    tag: b.tagName,
                    text: b.innerText.trim(),
                    visible: b.offsetParent !== null,
                    classes: b.className
                }))
            """
            res = await send_cdp(ws, "Runtime.evaluate", {"expression": inspect_script, "returnByValue": True}, 2)
            print("Buttons found:", json.dumps(res.get("value", []), indent=2))

    finally:
        proc.terminate()
        proc.wait(timeout=2)

if __name__ == "__main__":
    asyncio.run(main())
