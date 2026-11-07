import asyncio
import base64
import json
import os
import subprocess
import sys
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9293
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
    user_data = os.path.abspath("scratch/test_chrome_insights")
    os.makedirs(user_data, exist_ok=True)

    args = [
        CHROME_PATH,
        f"--remote-debugging-port={REMOTE_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1600,1100",
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
                location.reload();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": setup_script}, 1)
            await asyncio.sleep(2.5)

            # 1. Click "Insights" nav button
            click_insights = """
                const btn = Array.from(document.querySelectorAll('nav[aria-label="Primary Navigation"] button')).find(b => b.innerText.includes('Insights'));
                if (btn) btn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": click_insights}, 2)
            await asyncio.sleep(2.0)
            await capture_screenshot(ws, "audit_insights_view_redesigned_light.png", 3)

            # Scroll down in Insights to see both signal rows
            scroll_insights = "window.scrollTo({top: 450, behavior: 'instant'});"
            await send_cdp(ws, "Runtime.evaluate", {"expression": scroll_insights}, 4)
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_insights_view_signals_light.png", 5)

            # Test Dark Mode in Insights
            set_dark = """
                document.documentElement.classList.add('dark');
                localStorage.setItem('pennypilot_theme', 'dark');
                window.scrollTo({top: 0, behavior: 'instant'});
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_dark}, 6)
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_insights_view_redesigned_dark.png", 7)

            # Scroll down in dark mode
            await send_cdp(ws, "Runtime.evaluate", {"expression": scroll_insights}, 8)
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_insights_view_signals_dark.png", 9)

            # Switch back to light and go to Categories -> Income tab
            set_light_and_cat = """
                document.documentElement.classList.remove('dark');
                localStorage.setItem('pennypilot_theme', 'light');
                window.scrollTo({top: 0, behavior: 'instant'});
                const catBtn = Array.from(document.querySelectorAll('nav[aria-label="Primary Navigation"] button')).find(b => b.innerText.includes('Categories'));
                if (catBtn) catBtn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_light_and_cat}, 10)
            await asyncio.sleep(1.5)

            # Click Income categories
            click_income_tab = """
                const incBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Income Categories'));
                if (incBtn) incBtn.click();
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": click_income_tab}, 11)
            await asyncio.sleep(1.0)
            await capture_screenshot(ws, "audit_categories_income_verified.png", 12)

            print("Captured all verified insights and income screenshots!")

    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
