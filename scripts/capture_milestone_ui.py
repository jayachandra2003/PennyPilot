import asyncio
import json
import os
import shutil
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9224
ARTIFACT_DIR = r"C:\Users\jayac\.gemini\antigravity\brain\c57dd9d8-efcb-43fc-a7c4-d18e8d653693"

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def capture_state(name, width=1440, height=900, prep_js=None, wait_time=2.0, mobile=False):
    output_path = os.path.join("screenshots", f"{name}.png")
    os.makedirs("screenshots", exist_ok=True)

    user_data = os.path.abspath(f"scratch/chrome_shot_{name}_{int(time.time()*1000)%10000}")
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
        "http://localhost:5173/"
    ]
    proc = subprocess.Popen(args)
    await asyncio.sleep(2.0)

    try:
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
                "mobile": mobile,
            }, 10)

            # Authenticate as demo user Aarav Sharma
            login_req = urllib.request.Request(
                'http://127.0.0.1:8000/api/v1/auth/login',
                data=json.dumps({'email': 'demo@pennypilot.in', 'password': 'DemoPassword123!'}).encode(),
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(login_req) as resp:
                data = json.loads(resp.read().decode())
                token = data["access_token"]
                user = data["user"]

            auth_js = f"""
            localStorage.setItem('pennypilot_token', '{token}');
            localStorage.setItem('pennypilot_user', '{json.dumps(user)}');
            """
            await send_cdp(ws, "Runtime.evaluate", {"expression": auth_js}, 20)
            await send_cdp(ws, "Page.reload", {}, 30)
            await asyncio.sleep(wait_time)

            if prep_js:
                await send_cdp(ws, "Runtime.evaluate", {"expression": prep_js}, 40)
                await asyncio.sleep(1.0)

            res = await send_cdp(ws, "Page.captureScreenshot", {"format": "png"}, 50)
            import base64
            raw_png = base64.b64decode(res["data"])
            with open(output_path, "wb") as f:
                f.write(raw_png)
            
            # Copy to artifact directory
            artifact_file = os.path.join(ARTIFACT_DIR, f"{name}.png")
            shutil.copyfile(output_path, artifact_file)
            print(f"[OK] Saved {output_path} and copied to {artifact_file}")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

async def main():
    print("Capturing UI verification screenshots for Milestone Deliverables...")

    # 1. Desktop Navbar at 1440px
    await capture_state(
        "milestone_desktop_navbar",
        width=1440,
        height=850,
        prep_js=None,
        wait_time=2.5
    )

    # 2. Profile Dropdown open
    dropdown_js = """
    (() => {
        // Find avatar button in header and click it
        const buttons = Array.from(document.querySelectorAll('button'));
        const avatarBtn = buttons.find(b => b.querySelector('img[alt="Aarav Sharma"]') || (b.textContent && b.textContent.includes('AS')));
        if (avatarBtn) avatarBtn.click();
    })()
    """
    await capture_state(
        "milestone_profile_dropdown",
        width=1440,
        height=850,
        prep_js=dropdown_js,
        wait_time=2.5
    )

    # 3. Profile Modal (Edit Profile) open
    modal_js = """
    (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const avatarBtn = buttons.find(b => b.querySelector('img[alt="Aarav Sharma"]') || (b.textContent && b.textContent.includes('AS')));
        if (avatarBtn) {
            avatarBtn.click();
            setTimeout(() => {
                const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Edit Profile'));
                if (editBtn) editBtn.click();
            }, 300);
        }
    })()
    """
    await capture_state(
        "milestone_profile_modal",
        width=1440,
        height=900,
        prep_js=modal_js,
        wait_time=2.5
    )

    # 4. Settings Page
    settings_js = """
    (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const avatarBtn = buttons.find(b => b.querySelector('img[alt="Aarav Sharma"]') || (b.textContent && b.textContent.includes('AS')));
        if (avatarBtn) {
            avatarBtn.click();
            setTimeout(() => {
                const settingsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Settings'));
                if (settingsBtn) settingsBtn.click();
            }, 300);
        }
    })()
    """
    await capture_state(
        "milestone_settings_page",
        width=1440,
        height=950,
        prep_js=settings_js,
        wait_time=2.5
    )

    # 5. Dark Theme Dashboard
    dark_dash_js = """
    (() => {
        localStorage.setItem('pennypilot_theme', 'dark');
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
    })()
    """
    await capture_state(
        "milestone_dark_dashboard",
        width=1440,
        height=950,
        prep_js=dark_dash_js,
        wait_time=2.5
    )

    # 6. Interactive Calendar Navigation Popover
    calendar_js = """
    (() => {
        // Find month button e.g. "November 2026" or "Nov 2026"
        const buttons = Array.from(document.querySelectorAll('button'));
        const monthBtn = buttons.find(b => b.textContent && (b.textContent.includes('2026') || b.textContent.includes('Nov')));
        if (monthBtn) monthBtn.click();
    })()
    """
    await capture_state(
        "milestone_calendar_picker",
        width=1440,
        height=900,
        prep_js=calendar_js,
        wait_time=2.5
    )

    # 7. Mobile interactions (390px)
    await capture_state(
        "milestone_mobile_interactions",
        width=390,
        height=844,
        prep_js=None,
        wait_time=2.5,
        mobile=True
    )

    print("All milestone screenshots captured successfully!")

if __name__ == "__main__":
    asyncio.run(main())
