import asyncio
import json
import os
import sys
import subprocess
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9291

async def main():
    user_data = os.path.abspath("scratch/test_chrome_check")
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
            await ws.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {"expression": setup_script}}))
            await ws.recv()
            await asyncio.sleep(2.0)

            # Inspect all CSS rules matching .glass-panel
            inspect_js = """
                const el = document.querySelectorAll('.glass-panel')[1]; // the Total Income card
                const sheets = Array.from(document.styleSheets);
                const matching = [];
                for (const sheet of sheets) {
                    try {
                        for (const rule of sheet.cssRules) {
                            if (rule.selectorText && el.matches(rule.selectorText)) {
                                matching.push({
                                    selector: rule.selectorText,
                                    cssText: rule.cssText
                                });
                            }
                        }
                    } catch(e) {}
                }
                const s = window.getComputedStyle(el);
                JSON.stringify({
                    matchingRules: matching,
                    computedBg: s.backgroundColor,
                    opacity: s.opacity,
                    backdrop: s.backdropFilter,
                    filter: s.filter,
                    mixBlendMode: s.mixBlendMode
                });
            """
            await ws.send(json.dumps({"id": 2, "method": "Runtime.evaluate", "params": {"expression": inspect_js}}))
            r = json.loads(await ws.recv())
            print(r.get("result", {}).get("result", {}).get("value"))

    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
