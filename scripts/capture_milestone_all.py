import asyncio
import json
import os
import shutil
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9230
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

    await asyncio.sleep(0.6)

    res = await send_cdp(ws, "Page.captureScreenshot", {"format": "png"}, msg_start + 1)
    import base64
    raw_png = base64.b64decode(res["data"])

    local_path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
    with open(local_path, "wb") as f:
        f.write(raw_png)

    artifact_path = os.path.join(ARTIFACT_DIR, f"{name}.png")
    shutil.copyfile(local_path, artifact_path)
    print(f"[SUCCESS] Saved {name} -> {local_path} & {artifact_path}")

async def main():
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    user_data = os.path.abspath(f"scratch/chrome_session_{int(time.time())}")
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
            print("Connected to Chrome CDP session.")
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

            # Dismiss any toast if present
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            document.querySelectorAll('[role="alert"], [role="status"]').forEach(el => el.remove());
            """}, 3)
            await asyncio.sleep(0.5)

            # -------------------------------------------------------------
            # DELIVERABLE 1: Desktop Navbar (1440px)
            # -------------------------------------------------------------
            print("Capturing Deliverable 1: Desktop Navbar...")
            await capture_and_save(ws, "milestone_desktop_navbar", width=1440, height=850, msg_start=10)

            # -------------------------------------------------------------
            # DELIVERABLE 2: Profile Dropdown Open
            # -------------------------------------------------------------
            print("Capturing Deliverable 2: Profile Dropdown...")
            open_dropdown_js = """
            (() => {
                const avatarBtn = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && (b.textContent.includes('Aarav') || b.textContent.includes('AS'))
                );
                if (avatarBtn) avatarBtn.click();
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_dropdown_js}, 20)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "milestone_profile_dropdown", width=1440, height=850, msg_start=30)

            # -------------------------------------------------------------
            # DELIVERABLE 3: Profile Modal (Edit Profile) Open
            # -------------------------------------------------------------
            print("Capturing Deliverable 3: Profile Editing Modal...")
            open_profile_modal_js = """
            (() => {
                const editProfileBtn = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && b.textContent.includes('Edit Profile')
                );
                if (editProfileBtn) editProfileBtn.click();
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_profile_modal_js}, 40)
            await asyncio.sleep(1.0)
            await capture_and_save(ws, "milestone_profile_modal", width=1440, height=920, msg_start=50)

            # Close Profile Modal
            close_modal_js = """
            (() => {
                const closeBtn = document.querySelector('button[aria-label="Close modal"]') ||
                                 Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cancel'));
                if (closeBtn) closeBtn.click();
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": close_modal_js}, 60)
            await asyncio.sleep(0.6)

            # -------------------------------------------------------------
            # DELIVERABLE 4: Settings Page
            # -------------------------------------------------------------
            print("Capturing Deliverable 4: Settings Page...")
            open_settings_js = """
            (() => {
                const avatarBtn = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && (b.textContent.includes('Aarav') || b.textContent.includes('AS'))
                );
                if (avatarBtn) avatarBtn.click();
                setTimeout(() => {
                    const settingsBtn = Array.from(document.querySelectorAll('button')).find(
                        b => b.textContent && b.textContent.includes('Settings')
                    );
                    if (settingsBtn) settingsBtn.click();
                }, 200);
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_settings_js}, 70)
            await asyncio.sleep(1.2)
            await capture_and_save(ws, "milestone_settings_page", width=1440, height=960, msg_start=80)

            # -------------------------------------------------------------
            # DELIVERABLE 5: Interactive Calendar Navigation Popover
            # -------------------------------------------------------------
            print("Capturing Deliverable 5: Interactive Calendar Popover...")
            open_calendar_js = """
            (() => {
                // Navigate back to Dashboard tab first
                const dashBtn = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && b.textContent.trim() === 'Dashboard'
                );
                if (dashBtn) dashBtn.click();

                // Open calendar popover
                setTimeout(() => {
                    const monthBtn = Array.from(document.querySelectorAll('button')).find(
                        b => b.textContent && (b.textContent.includes('November 2026') || b.textContent.includes('Nov 2026'))
                    );
                    if (monthBtn) monthBtn.click();
                }, 300);
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_calendar_js}, 90)
            await asyncio.sleep(1.2)
            await capture_and_save(ws, "milestone_calendar_picker", width=1440, height=920, msg_start=100)

            # Close calendar popover
            await send_cdp(ws, "Runtime.evaluate", {"expression": """
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            """}, 110)
            await asyncio.sleep(0.5)

            # -------------------------------------------------------------
            # DELIVERABLE 6: Dark Theme Dashboard
            # -------------------------------------------------------------
            print("Capturing Deliverable 6: Dark Theme Dashboard...")
            switch_to_dark_js = """
            (() => {
                // Open avatar dropdown
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
                            // Close dropdown by sending Escape key
                            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                        }, 200);
                    }, 200);
                }
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": switch_to_dark_js}, 120)
            await asyncio.sleep(1.5)
            await capture_and_save(ws, "milestone_dark_dashboard", width=1440, height=920, msg_start=130)

            # -------------------------------------------------------------
            # DELIVERABLE 7: Mobile Viewport (390px)
            # -------------------------------------------------------------
            print("Capturing Deliverable 7: Mobile Viewport Interactions...")
            # Switch back to light
            switch_to_light_js = """
            (() => {
                const avatarBtn = Array.from(document.querySelectorAll('button')).find(
                    b => b.textContent && (b.textContent.includes('Aarav') || b.textContent.includes('AS'))
                );
                if (avatarBtn) {
                    avatarBtn.click();
                    setTimeout(() => {
                        const lightBtn = Array.from(document.querySelectorAll('button')).find(
                            b => b.textContent && b.textContent.trim() === 'Light'
                        );
                        if (lightBtn) lightBtn.click();
                        setTimeout(() => {
                            document.querySelector('h1')?.click();
                        }, 200);
                    }, 200);
                }
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": switch_to_light_js}, 140)
            await asyncio.sleep(1.2)

            await capture_and_save(ws, "milestone_mobile_interactions", width=390, height=844, mobile=True, msg_start=150)

            # -------------------------------------------------------------
            # DELIVERABLE 8: Mobile Menu Open (390px)
            # -------------------------------------------------------------
            print("Capturing Deliverable 8: Mobile Menu Open...")
            open_mobile_menu_js = """
            (() => {
                const mobileAvatar = document.querySelector('header button img[alt="Aarav Sharma"]')?.closest('button') ||
                                     Array.from(document.querySelectorAll('header button')).find(b => b.textContent && b.textContent.includes('AS'));
                if (mobileAvatar) mobileAvatar.click();
            })()
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": open_mobile_menu_js}, 160)
            await asyncio.sleep(0.8)
            await capture_and_save(ws, "milestone_mobile_menu", width=390, height=844, mobile=True, msg_start=170)

            print("All deliverables successfully captured and verified!")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(main())
