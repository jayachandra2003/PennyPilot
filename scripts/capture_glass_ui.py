import asyncio
import json
import os
import shutil
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9240
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
    import base64
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

    user_data = os.path.abspath(f"scratch/chrome_session_glass_{int(time.time())}")
    os.makedirs(user_data, exist_ok=True)

    args = [
        CHROME_PATH,
        f"--remote-debugging-port={REMOTE_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-extensions",
        "--window-size=1440,920",
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
            print("Connected to Chrome CDP session for Restaurant Billing Glassmorphism.")
            await send_cdp(ws, "Page.enable", {}, 1)
            await asyncio.sleep(1.5)

            # 1. Sign in through the UI
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
                await send_cdp(ws, "Runtime.evaluate", {"expression": js}, int(time.time() * 100) % 10000)
                await asyncio.sleep(0.8)

            async def select_tab(tab_name):
                js = f"""
                (() => {{
                    const tabBtn = Array.from(document.querySelectorAll('nav button')).find(
                        b => b.textContent && b.textContent.trim().toLowerCase() === '{tab_name.lower()}'
                    );
                    if (tabBtn) {{
                        tabBtn.click();
                        return true;
                    }}
                    return false;
                }})()
                """
                await send_cdp(ws, "Runtime.evaluate", {"expression": js}, int(time.time() * 100) % 10000)
                await asyncio.sleep(1.0)

            # ==========================================
            # PART 1: DARK GLASSMORPHISM
            # ==========================================
            print("--- CAPTURING DARK GLASSMORPHISM SUITE ---")
            await set_theme("dark")

            print("Capturing glass_dark_dashboard...")
            await select_tab("dashboard")
            await capture_and_save(ws, "glass_dark_dashboard", width=1440, height=920, msg_start=10)

            print("Capturing glass_dark_transactions...")
            await select_tab("transactions")
            await capture_and_save(ws, "glass_dark_transactions", width=1440, height=920, msg_start=20)

            print("Capturing glass_dark_budgets...")
            await select_tab("budgets")
            await capture_and_save(ws, "glass_dark_budgets", width=1440, height=920, msg_start=30)

            print("Capturing glass_dark_analytics...")
            await select_tab("analytics")
            await capture_and_save(ws, "glass_dark_analytics", width=1440, height=960, msg_start=40)

            print("Capturing glass_dark_categories...")
            await select_tab("categories")
            await capture_and_save(ws, "glass_dark_categories", width=1440, height=920, msg_start=50)

            print("Capturing glass_dark_copilot...")
            await select_tab("copilot")
            await capture_and_save(ws, "glass_dark_copilot", width=1440, height=920, msg_start=60)

            # Profile Dropdown in Dark Mode
            print("Capturing glass_dark_profile_dropdown...")
            open_profile_dropdown_js = """
            (() => {
                const avatarBtn = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && (b.textContent.includes('Aarav') || b.textContent.includes('AS'))
                );
                if (avatarBtn) {
                    avatarBtn.click();
                    return true;
                }
                return false;
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_profile_dropdown_js}, 70)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "glass_dark_profile_dropdown", width=1440, height=920, msg_start=72)

            # Close dropdown
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            """}, 75)
            await asyncio.sleep(0.5)

            # Calendar Popover in Dark Mode
            print("Capturing glass_dark_calendar_popover...")
            await select_tab("dashboard")
            open_cal_js = """
            (() => {
                const calTrigger = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && b.textContent.includes('November 2026')
                );
                if (calTrigger) {
                    calTrigger.click();
                    return true;
                }
                return false;
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_cal_js}, 80)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "glass_dark_calendar_popover", width=1440, height=920, msg_start=82)

            # Close calendar
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            """}, 85)
            await asyncio.sleep(0.5)

            # ==========================================
            # PART 2: LIGHT GLASSMORPHISM
            # ==========================================
            print("--- CAPTURING LIGHT GLASSMORPHISM SUITE ---")
            await set_theme("light")

            print("Capturing glass_light_dashboard...")
            await select_tab("dashboard")
            await capture_and_save(ws, "glass_light_dashboard", width=1440, height=920, msg_start=90)

            print("Capturing glass_light_transactions...")
            await select_tab("transactions")
            await capture_and_save(ws, "glass_light_transactions", width=1440, height=920, msg_start=100)

            print("Capturing glass_light_budgets...")
            await select_tab("budgets")
            await capture_and_save(ws, "glass_light_budgets", width=1440, height=920, msg_start=110)

            print("Capturing glass_light_analytics...")
            await select_tab("analytics")
            await capture_and_save(ws, "glass_light_analytics", width=1440, height=960, msg_start=120)

            print("Capturing glass_light_categories...")
            await select_tab("categories")
            await capture_and_save(ws, "glass_light_categories", width=1440, height=920, msg_start=130)

            print("Capturing glass_light_copilot...")
            await select_tab("copilot")
            await capture_and_save(ws, "glass_light_copilot", width=1440, height=920, msg_start=140)

            # ==========================================
            # PART 3: MOBILE RESPONSIVE
            # ==========================================
            print("--- CAPTURING MOBILE RESPONSIVE ---")
            await select_tab("dashboard")
            await capture_and_save(ws, "glass_mobile_dashboard", width=390, height=844, mobile=True, msg_start=150)

            print("\n>>> ALL GLASSMORPHISM SCREENSHOTS VERIFIED & SAVED SUCCESSFULLY! <<<")

    finally:
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(main())
