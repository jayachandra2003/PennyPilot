import json
import urllib.request
import websockets
import asyncio
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.abspath("backend"))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import create_access_token

db = SessionLocal()
user = db.query(User).filter(User.email == "jayachandravennam.jc@gmail.com").first()
token = create_access_token(subject=user.id, extra_claims={"email": user.email})
db.close()

async def run():
    req = urllib.request.urlopen("http://localhost:9222/json")
    tabs = json.loads(req.read().decode())
    target_tab = None
    for tab in tabs:
        if tab.get("type") == "page" and "5173" in tab.get("url", ""):
            target_tab = tab
            break
    if not target_tab:
        for tab in tabs:
            if tab.get("type") == "page":
                target_tab = tab
                break
    
    ws_url = target_tab["webSocketDebuggerUrl"]
    async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
        msg_id = 1
        async def call(method, params=None):
            nonlocal msg_id
            m_id = msg_id
            msg_id += 1
            await ws.send(json.dumps({"id": m_id, "method": method, "params": params or {}}))
            while True:
                resp = json.loads(await ws.recv())
                if resp.get("id") == m_id:
                    return resp.get("result", {})

        await call("Page.enable")
        await call("Runtime.enable")
        await call("Emulation.setDeviceMetricsOverride", {
            "width": 1440,
            "height": 900,
            "deviceScaleFactor": 1,
            "mobile": False
        })

        # Inject auth token and navigate to copilot
        user_json = json.dumps({
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name or "Jaya Chandra V",
            "is_active": True,
            "email_verified": True
        })

        inject_script = f"""
            localStorage.setItem('pennypilot_token', '{token}');
            localStorage.setItem('pennypilot_user', '{user_json}');
            window.location.hash = '#copilot';
        """
        await call("Runtime.evaluate", {"expression": inject_script})
        await call("Page.navigate", {"url": "http://localhost:5173"})
        await asyncio.sleep(2.0)

        # Switch to Copilot tab if not active
        click_copilot_tab = """
            const buttons = Array.from(document.querySelectorAll('nav button, header button'));
            const copilotBtn = buttons.find(b => b.textContent && b.textContent.includes('AI Copilot'));
            if (copilotBtn) { copilotBtn.click(); true; } else { false; }
        """
        await call("Runtime.evaluate", {"expression": click_copilot_tab})
        await asyncio.sleep(1.5)

        # Send greeting "Hi"
        send_greeting = """
            (async () => {
                const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
                const input = inputs[inputs.length - 1];
                if (!input) return "no input";
                input.value = "Hi";
                input.dispatchEvent(new Event('input', { bubbles: true }));
                const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-send') || b.textContent.includes('Send'));
                if (sendBtn) sendBtn.click();
                return "sent greeting";
            })()
        """
        await call("Runtime.evaluate", {"expression": send_greeting, "awaitPromise": True})
        await asyncio.sleep(1.5)

        # Capture Copilot greeting screenshot
        shot = await call("Page.captureScreenshot", {"format": "png"})
        import base64
        with open("artifacts/audit_copilot_greeting.png", "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print("Captured artifacts/audit_copilot_greeting.png")

        # Send question with navigation action: "Where can I change my theme?"
        send_theme_q = """
            (async () => {
                const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
                const input = inputs[inputs.length - 1];
                if (!input) return "no input";
                input.value = "Where can I change my theme?";
                input.dispatchEvent(new Event('input', { bubbles: true }));
                const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-send') || b.textContent.includes('Send'));
                if (sendBtn) sendBtn.click();
                return "sent theme query";
            })()
        """
        await call("Runtime.evaluate", {"expression": send_theme_q, "awaitPromise": True})
        await asyncio.sleep(2.0)

        # Capture Copilot navigation question screenshot
        shot = await call("Page.captureScreenshot", {"format": "png"})
        with open("artifacts/audit_copilot_nav_question.png", "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print("Captured artifacts/audit_copilot_nav_question.png")

        # Click the navigation action button [Open Appearance Settings]
        click_nav_action = """
            (() => {
                const actionBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('Open Appearance Settings'));
                if (actionBtns.length > 0) {
                    actionBtns[actionBtns.length - 1].click();
                    return "clicked action button";
                }
                return "no action button found";
            })()
        """
        res = await call("Runtime.evaluate", {"expression": click_nav_action})
        print("Nav action click result:", res.get("value"))
        await asyncio.sleep(1.5)

        # Capture destination page (Settings Appearance tab active)
        shot = await call("Page.captureScreenshot", {"format": "png"})
        with open("artifacts/audit_copilot_nav_destination_settings.png", "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print("Captured artifacts/audit_copilot_nav_destination_settings.png")

asyncio.run(run())
