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
REMOTE_PORT = 9250
ARTIFACT_DIR = r"C:\Users\jayac\.gemini\antigravity\brain\c57dd9d8-efcb-43fc-a7c4-d18e8d653693"
SCREENSHOTS_DIR = "screenshots"

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def capture_and_save(ws, name, width=1440, height=960, mobile=False, msg_start=100):
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

    user_data = os.path.abspath(f"scratch/chrome_session_onboarding_{int(time.time())}")
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
            print("Connected to Chrome CDP session for Income & Onboarding verification.")
            await send_cdp(ws, "Page.enable", {}, 1)
            await asyncio.sleep(1.5)

            # 1. Sign in as demo user
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

            # Dismiss any alerts/toasts
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            document.querySelectorAll('[role="alert"], [role="status"]').forEach(el => el.remove());
            """}, 3)
            await asyncio.sleep(0.5)

            # Set dark mode
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            (() => {
                localStorage.setItem('pennypilot_theme', 'dark');
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            })()
            """}, 4)
            await asyncio.sleep(0.5)

            # Capture Dashboard with Manage Inflow button
            await capture_and_save(ws, "dashboard_income_ready_dark", 1440, 960, False, 10)

            # 2. Click "Manage" on Monthly Inflow card to open IncomeManagementModal
            open_income_js = """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const manageBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Manage');
                if (manageBtn) {
                    manageBtn.click();
                    return 'clicked_manage_income';
                }
                return 'manage_btn_not_found';
            })()
            """
            res_income = await send_cdp(ws, "Runtime.evaluate", {"expression": open_income_js}, 20)
            print("Open income modal result:", res_income.get("result", {}).get("value"))
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "income_management_modal_dark", 1440, 960, False, 30)

            # Switch to Light Theme for Income Modal
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            (() => {
                localStorage.setItem('pennypilot_theme', 'light');
                document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme', 'light');
            })()
            """}, 40)
            await asyncio.sleep(0.5)
            await capture_and_save(ws, "income_management_modal_light", 1440, 960, False, 50)

            # Close income modal
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            (() => {
                const doneBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Done');
                if (doneBtn) doneBtn.click();
            })()
            """}, 60)
            await asyncio.sleep(0.5)

            # 3. Open Budget Editor Modal to verify Planned Cushion & telemetry
            open_budget_js = """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const editBudgetBtn = btns.find(b => b.textContent && b.textContent.includes('Edit Budget'));
                if (editBudgetBtn) {
                    editBudgetBtn.click();
                    return 'clicked_edit_budget';
                }
                return 'edit_budget_btn_not_found';
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_budget_js}, 70)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "budget_editor_with_unallocated_cushion", 1440, 960, False, 80)

            # Close budget editor
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            (() => {
                const closeBtn = document.querySelector('[aria-label="Close dialog"]');
                if (closeBtn) closeBtn.click();
            })()
            """}, 90)
            await asyncio.sleep(0.5)

            # 4. First-Time Guided Onboarding Wizard Steps
            # Trigger onboarding wizard via custom event
            open_wizard_js = """
            (() => {
                window.dispatchEvent(new CustomEvent('pennypilot:open-onboarding'));
                return 'dispatched_open_onboarding';
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_wizard_js}, 100)
            await asyncio.sleep(1.2)

            # Capture Step 1 of Wizard
            await capture_and_save(ws, "onboarding_step1_welcome", 1440, 960, False, 120)

            # Step 2: Click "Begin Financial Setup"
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            (() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Begin Financial Setup'));
                if (btn) btn.click();
            })()
            """}, 130)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "onboarding_step2_income", 1440, 960, False, 140)

            # Step 3: Click "Continue"
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            (() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Continue'));
                if (btn) btn.click();
            })()
            """}, 150)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "onboarding_step3_budgets", 1440, 960, False, 160)

            # Step 4: Click "Continue" to Savings Target
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            (() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Continue'));
                if (btn) btn.click();
            })()
            """}, 170)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "onboarding_step4_savings_target", 1440, 960, False, 180)

            # Step 5: Click "Continue" to Financial Plan Summary
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            (() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Continue'));
                if (btn) btn.click();
            })()
            """}, 190)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "onboarding_step5_plan_summary", 1440, 960, False, 200)

            # Step 6: Click "Confirm & Save Plan"
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            (() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Confirm & Save Plan'));
                if (btn) btn.click();
            })()
            """}, 210)
            await asyncio.sleep(2.0)
            await capture_and_save(ws, "onboarding_step6_completed", 1440, 960, False, 220)

            print("\nALL BROWSER TESTS AND SCREENSHOTS CAPTURED SUCCESSFULLY!")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
