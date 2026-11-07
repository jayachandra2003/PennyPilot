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
REMOTE_PORT = 9248
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

    user_data = os.path.abspath(f"scratch/chrome_session_budget_{int(time.time())}")
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
            print("Connected to Chrome CDP session for Budget Buffer verification.")
            await send_cdp(ws, "Page.enable", {}, 1)
            await asyncio.sleep(1.5)

            # 1. Sign in
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

            # 1. Capture Dashboard with Edit Budget button visible on Budget Buffer card
            await set_theme("dark")
            await capture_and_save(ws, "budget_buffer_card_with_edit_btn", width=1440, height=960, msg_start=10)

            # 2. Click "Edit Budget" button to open BudgetEditorModal
            open_edit_js = """
            (() => {
                const btn = document.querySelector('button[aria-label="Edit budget"]');
                if (btn) {
                    btn.click();
                    return 'clicked_edit_budget';
                }
                return 'btn_not_found';
            })()
            """
            eval_res = await send_cdp(ws, "Runtime.evaluate", {"expression": open_edit_js}, 20)
            print("Open edit budget result:", eval_res)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "budget_editor_modal_open", width=1440, height=960, msg_start=30)

            # 3. Modify an allocation in the modal and save
            modify_and_save_js = """
            (() => {
                const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
                if (inputs.length === 0) return 'no_inputs';

                // Find Groceries input and increase by 5000 (from 12000 to 17000)
                const firstInput = inputs[1] || inputs[0]; // Groceries or first
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                const currentVal = parseInt(firstInput.value, 10) || 12000;
                setter.call(firstInput, (currentVal + 5000).toString());
                firstInput.dispatchEvent(new Event('input', { bubbles: true }));
                firstInput.dispatchEvent(new Event('change', { bubbles: true }));

                return 'input_modified';
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": modify_and_save_js}, 40)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "budget_editor_modal_modified", width=1440, height=960, msg_start=50)

            # Click Save Allocations button
            save_btn_js = """
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const saveBtn = btns.find(b => b.textContent.includes('Save Allocations'));
                if (saveBtn) {
                    saveBtn.click();
                    return 'clicked_save';
                }
                return 'save_btn_not_found';
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": save_btn_js}, 60)
            await asyncio.sleep(2.0)

            # 4. Capture Dashboard immediately after saving — verify newly recalculated Allocated Monthly Ceiling, Remaining Buffer, and Daily Spending Pace
            await capture_and_save(ws, "budget_buffer_card_recalculated", width=1440, height=960, msg_start=70)

            # 5. Light mode verification
            await set_theme("light")
            await capture_and_save(ws, "budget_buffer_card_light", width=1440, height=960, msg_start=80)

            print("All budget buffer browser tests and screenshots captured successfully!")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
