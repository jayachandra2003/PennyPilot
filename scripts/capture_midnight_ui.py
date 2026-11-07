import asyncio
import json
import os
import shutil
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9235
ARTIFACT_DIR = r"C:\Users\jayac\.gemini\antigravity\brain\c57dd9d8-efcb-43fc-a7c4-d18e8d653693"
SCREENSHOTS_DIR = "screenshots"

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def capture_and_save(ws, name, width=1440, height=900, mobile=False, msg_start=100):
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

    user_data = os.path.abspath(f"scratch/chrome_session_midnight_{int(time.time())}")
    os.makedirs(user_data, exist_ok=True)

    args = [
        CHROME_PATH,
        f"--remote-debugging-port={REMOTE_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-extensions",
        "--window-size=1440,900",
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
            print("Connected to Chrome CDP session for Midnight Ledger verification.")
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

            # 2. Switch theme explicitly to Dark (Midnight Ledger) via profile dropdown
            switch_to_dark_js = """
            (() => {
                // Ensure localStorage and documentElement have dark class
                localStorage.setItem('pennypilot_theme', 'dark');
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
                
                // Also click through the UI to ensure state is synchronized
                const avatarBtn = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && (b.textContent.includes('Aarav') || b.textContent.includes('AS'))
                );
                if (avatarBtn) {
                    avatarBtn.click();
                    setTimeout(() => {
                        const darkBtn = Array.from(document.querySelectorAll('button')).find(
                            b => b.textContent && b.textContent.trim() === 'Dark'
                        );
                        if (darkBtn) darkBtn.click();
                        setTimeout(() => {
                            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                        }, 150);
                    }, 150);
                }
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": switch_to_dark_js}, 4)
            await asyncio.sleep(1.5)

            # Helper to navigate to a primary tab
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

            # -------------------------------------------------------------
            # 1. Dark dashboard, full page
            # -------------------------------------------------------------
            print("1. Capturing dark_dashboard...")
            await select_tab("dashboard")
            await capture_and_save(ws, "dark_dashboard", width=1440, height=920, msg_start=10)

            # -------------------------------------------------------------
            # 2. Dark transactions
            # -------------------------------------------------------------
            print("2. Capturing dark_transactions...")
            await select_tab("transactions")
            await capture_and_save(ws, "dark_transactions", width=1440, height=920, msg_start=20)

            # -------------------------------------------------------------
            # 3. Dark budgets
            # -------------------------------------------------------------
            print("3. Capturing dark_budgets...")
            await select_tab("budgets")
            await capture_and_save(ws, "dark_budgets", width=1440, height=920, msg_start=30)

            # -------------------------------------------------------------
            # 4. Dark analytics
            # -------------------------------------------------------------
            print("4. Capturing dark_analytics...")
            await select_tab("analytics")
            await capture_and_save(ws, "dark_analytics", width=1440, height=960, msg_start=40)

            # -------------------------------------------------------------
            # 5. Dark categories
            # -------------------------------------------------------------
            print("5. Capturing dark_categories...")
            await select_tab("categories")
            await capture_and_save(ws, "dark_categories", width=1440, height=920, msg_start=50)

            # -------------------------------------------------------------
            # 6. Dark Copilot
            # -------------------------------------------------------------
            print("6. Capturing dark_copilot...")
            await select_tab("ai copilot")
            await capture_and_save(ws, "dark_copilot", width=1440, height=920, msg_start=60)

            # -------------------------------------------------------------
            # 7. Dark profile dropdown
            # -------------------------------------------------------------
            print("7. Capturing dark_profile_dropdown...")
            open_dropdown_js = """
            (() => {
                const avatarBtn = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && (b.textContent.includes('Aarav') || b.textContent.includes('AS'))
                );
                if (avatarBtn) avatarBtn.click();
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_dropdown_js}, 70)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "dark_profile_dropdown", width=1440, height=850, msg_start=80)

            # -------------------------------------------------------------
            # 8. Dark settings
            # -------------------------------------------------------------
            print("8. Capturing dark_settings...")
            open_settings_js = """
            (() => {
                const settingsBtn = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && b.textContent.includes('Settings')
                );
                if (settingsBtn) {
                    settingsBtn.click();
                } else {
                    const avatarBtn = Array.from(document.querySelectorAll('button')).find(
                        b => b.textContent && (b.textContent.includes('Aarav') || b.textContent.includes('AS'))
                    );
                    if (avatarBtn) avatarBtn.click();
                    setTimeout(() => {
                        const sBtn = Array.from(document.querySelectorAll('button')).find(
                            b => b.textContent && b.textContent.includes('Settings')
                        );
                        if (sBtn) sBtn.click();
                    }, 200);
                }
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_settings_js}, 90)
            await asyncio.sleep(1.2)
            await capture_and_save(ws, "dark_settings", width=1440, height=960, msg_start=100)

            # -------------------------------------------------------------
            # 9. Dark calendar popover (on Dashboard)
            # -------------------------------------------------------------
            print("9. Capturing dark_calendar_popover...")
            await select_tab("dashboard")
            open_calendar_js = """
            (() => {
                const monthBtn = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && (b.textContent.includes('November 2026') || b.textContent.includes('Nov 2026'))
                );
                if (monthBtn) monthBtn.click();
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_calendar_js}, 110)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "dark_calendar_popover", width=1440, height=920, msg_start=120)

            # Close calendar popover
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            """}, 130)
            await asyncio.sleep(0.5)

            # -------------------------------------------------------------
            # 10. Mobile dark dashboard (390px)
            # -------------------------------------------------------------
            print("10. Capturing dark_mobile_dashboard...")
            await capture_and_save(ws, "dark_mobile_dashboard", width=390, height=844, mobile=True, msg_start=140)

            print("\nAll 10 Midnight Ledger verification screenshots captured successfully!")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
