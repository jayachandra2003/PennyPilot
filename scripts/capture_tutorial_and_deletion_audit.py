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
    user_data = os.path.abspath("scratch/test_chrome_tutorial_audit")
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
                localStorage.removeItem('pennypilot_tutorial_completed_515638d8-4430-4c18-8dfd-240ee5654570');
                localStorage.removeItem('pennypilot_tutorial_skipped_515638d8-4430-4c18-8dfd-240ee5654570');
                location.href = 'http://localhost:5173';
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": setup_script}, 1)
            await asyncio.sleep(3.0)

            msg_id = 10

            # 1. Trigger tutorial replay explicitly
            replay_script = "window.dispatchEvent(new CustomEvent('pennypilot:replay-tutorial'));"
            await send_cdp(ws, "Runtime.evaluate", {"expression": replay_script}, msg_id)
            msg_id += 1
            await asyncio.sleep(1.0)

            # Capture Step 1 (Dashboard) Light
            await capture_screenshot(ws, "audit_tutorial_step1_dashboard_light.png", msg_id)
            msg_id += 1

            # Click Next button to go to Step 2 (Transactions)
            click_next_js = """
                (() => {
                    const nextBtn = document.querySelector('aside[aria-label*="onboarding"] button:has(svg.lucide-chevron-right)');
                    if (nextBtn) { nextBtn.click(); return 'clicked'; }
                    const allBtns = Array.from(document.querySelectorAll('aside[aria-label*="onboarding"] button'));
                    const b = allBtns.find(x => x.textContent.includes('Next Step') || x.textContent.includes('Next'));
                    if (b) { b.click(); return 'clicked text'; }
                    return 'not found';
                })()
            """
            res = await send_cdp(ws, "Runtime.evaluate", {"expression": click_next_js}, msg_id)
            msg_id += 1
            print("Next step 2 result:", res)
            await asyncio.sleep(1.2)

            # Capture Step 2 (Transactions) Light
            await capture_screenshot(ws, "audit_tutorial_step2_transactions_light.png", msg_id)
            msg_id += 1

            # Click Next button to go to Step 3 (Budgets)
            res = await send_cdp(ws, "Runtime.evaluate", {"expression": click_next_js}, msg_id)
            msg_id += 1
            print("Next step 3 result:", res)
            await asyncio.sleep(1.2)

            # Capture Step 3 (Budgets) Light
            await capture_screenshot(ws, "audit_tutorial_step3_budgets_light.png", msg_id)
            msg_id += 1

            # Switch to Dark theme and step 1
            dark_script = """
                localStorage.setItem('pennypilot_theme', 'dark');
                document.documentElement.classList.add('dark');
                window.dispatchEvent(new CustomEvent('pennypilot:replay-tutorial'));
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": dark_script}, msg_id)
            msg_id += 1
            await asyncio.sleep(1.2)

            # Capture Step 1 Dark
            await capture_screenshot(ws, "audit_tutorial_step1_dark.png", msg_id)
            msg_id += 1

            # Mobile 390 viewport
            await send_cdp(ws, "Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True,
            }, msg_id)
            msg_id += 1

            light_mobile_script = """
                localStorage.setItem('pennypilot_theme', 'light');
                document.documentElement.classList.remove('dark');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": light_mobile_script}, msg_id)
            msg_id += 1
            await asyncio.sleep(1.0)

            # Capture Mobile 390 Light
            await capture_screenshot(ws, "audit_tutorial_mobile_390.png", msg_id)
            msg_id += 1

            # Reset viewport to desktop
            await send_cdp(ws, "Emulation.clearDeviceMetricsOverride", {}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # Dismiss tutorial and navigate to Settings
            dismiss_and_nav_settings = """
                (() => {
                    const skipBtns = Array.from(document.querySelectorAll('aside[aria-label*="onboarding"] button'));
                    const skipBtn = skipBtns.find(b => b.textContent.includes('Skip') || b.getAttribute('aria-label')?.includes('Skip'));
                    if (skipBtn) skipBtn.click();
                    window.dispatchEvent(new CustomEvent('pennypilot:open-settings'));
                })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": dismiss_and_nav_settings}, msg_id)
            msg_id += 1
            await asyncio.sleep(1.5)

            # Ensure tutorial is closed
            ensure_closed = """
                (() => {
                    const skipBtns = Array.from(document.querySelectorAll('aside[aria-label*="onboarding"] button'));
                    const skipBtn = skipBtns.find(b => b.textContent.includes('Skip') || b.getAttribute('aria-label')?.includes('Skip'));
                    if (skipBtn) skipBtn.click();
                })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": ensure_closed}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # Switch to Account section in Settings
            switch_to_account_js = """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const acctBtn = btns.find(b => b.textContent.includes('Account & Security') || b.textContent.includes('Account'));
                    if (acctBtn) { acctBtn.click(); return 'clicked account'; }
                    return 'not found';
                })()
            """
            res = await send_cdp(ws, "Runtime.evaluate", {"expression": switch_to_account_js}, msg_id)
            msg_id += 1
            print("Switch to account section:", res)
            await asyncio.sleep(1.0)

            # Scroll down to Danger Zone
            scroll_danger_js = "window.scrollTo({top: 550, behavior: 'instant'});"
            await send_cdp(ws, "Runtime.evaluate", {"expression": scroll_danger_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # Capture Settings Danger Zone (Light)
            await capture_screenshot(ws, "audit_settings_danger_zone_light.png", msg_id)
            msg_id += 1

            # Click Appearance tab in Settings to show Replay Tutorial
            switch_to_appearance_js = """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const appBtn = btns.find(b => b.textContent.includes('Appearance'));
                    if (appBtn) { appBtn.click(); return 'clicked appearance'; }
                    return 'not found';
                })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": switch_to_appearance_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.8)
            await capture_screenshot(ws, "audit_settings_appearance_replay_light.png", msg_id)
            msg_id += 1

            # Switch back to Account section
            await send_cdp(ws, "Runtime.evaluate", {"expression": switch_to_account_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.8)

            # Capture Settings Danger Zone (Dark)
            set_dark_settings = """
                localStorage.setItem('pennypilot_theme', 'dark');
                document.documentElement.classList.add('dark');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_dark_settings}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)
            await capture_screenshot(ws, "audit_settings_danger_zone_dark.png", msg_id)
            msg_id += 1

            # Open Delete Account Modal in Dark Mode
            open_modal_js = """
                (() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const delBtn = btns.find(b => b.textContent.trim() === 'Delete Account' || b.textContent.includes('Delete Account'));
                    if (delBtn) { delBtn.click(); return 'clicked delete button'; }
                    return 'not found';
                })()
            """
            res = await send_cdp(ws, "Runtime.evaluate", {"expression": open_modal_js}, msg_id)
            msg_id += 1
            print("Open delete modal result:", res)
            await asyncio.sleep(1.0)

            # Capture Delete Modal (Dark)
            await capture_screenshot(ws, "audit_delete_modal_dark.png", msg_id)
            msg_id += 1

            # Switch Delete Modal to Light Mode
            set_light_modal = """
                localStorage.setItem('pennypilot_theme', 'light');
                document.documentElement.classList.remove('dark');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": set_light_modal}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # Type partially into the confirmation input to demonstrate phrase validation
            type_phrase_js = """
                (() => {
                    const inputs = Array.from(document.querySelectorAll('input'));
                    const phraseInput = inputs.find(i => i.placeholder && i.placeholder.includes('DELETE MY ACCOUNT'));
                    if (phraseInput) {
                        phraseInput.value = 'DELETE MY';
                        phraseInput.dispatchEvent(new Event('input', { bubbles: true }));
                        return 'typed';
                    }
                    return 'input not found';
                })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": type_phrase_js}, msg_id)
            msg_id += 1
            await asyncio.sleep(0.5)

            # Capture Delete Modal (Light)
            await capture_screenshot(ws, "audit_delete_modal_light.png", msg_id)
            msg_id += 1

            print("All audit screenshots successfully captured.")

    finally:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
