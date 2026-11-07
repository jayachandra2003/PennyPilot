import asyncio
import base64
import json
import os
import subprocess
import time
import urllib.request
import websockets
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
from app.db.session import SessionLocal
from app.models.user import User
from app.models.transaction import Transaction
from app.core.security import create_access_token

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REMOTE_PORT = 9235

db = SessionLocal()
user = db.query(User).filter(User.email == "jayachandravennam.jc@gmail.com").first()
if not user:
    user = db.query(User).first()
token = create_access_token(subject=user.id, extra_claims={"email": user.email})

user_obj = {
    "id": user.id,
    "email": user.email,
    "display_name": user.display_name,
    "currency": user.currency,
    "is_active": True,
    "email_verified": True,
}

zomato_img_path = os.path.abspath(r'C:/Users/jayac/.gemini/antigravity/brain/c57dd9d8-efcb-43fc-a7c4-d18e8d653693/.user_uploaded/media_1794082914274_16a36aaa.png')
print(f"Sample Zomato Receipt Image Path: {zomato_img_path}")
assert os.path.exists(zomato_img_path), "Zomato receipt image file must exist!"

async def send_cdp(ws, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == msg_id:
            return resp.get("result", {})

async def test_receipt_flow():
    # 0. Count transactions before test
    tx_count_before = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.deleted_at == None
    ).count()
    print(f"Transactions in DB before upload: {tx_count_before}")

    user_data = os.path.abspath(f"scratch/chrome_shot_profile_{int(time.time()*1000)%10000}")
    os.makedirs(user_data, exist_ok=True)
    os.makedirs("artifacts", exist_ok=True)

    args = [
        CHROME_PATH,
        f"--remote-debugging-port={REMOTE_PORT}",
        f"--user-data-dir={user_data}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-extensions",
        "--window-size=1440,900",
        "http://localhost:5173",
    ]
    proc = subprocess.Popen(args)
    await asyncio.sleep(2.5)

    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{REMOTE_PORT}/json")
        tabs = json.loads(req.read().decode())
        page_tabs = [t for t in tabs if t.get("type") == "page"]
        ws_url = page_tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
            m_id = 1

            async def eval_js(js):
                nonlocal m_id
                m_id += 1
                return await send_cdp(ws, "Runtime.evaluate", {"expression": js, "awaitPromise": True}, m_id)

            async def take_screenshot(filepath, width=1440, height=900):
                nonlocal m_id
                m_id += 1
                await send_cdp(ws, "Emulation.setDeviceMetricsOverride", {
                    "width": width, "height": height, "deviceScaleFactor": 1.0, "mobile": False
                }, m_id)
                await asyncio.sleep(0.5)
                m_id += 1
                res = await send_cdp(ws, "Page.captureScreenshot", {"format": "png"}, m_id)
                data = base64.b64decode(res["data"])
                with open(filepath, "wb") as f:
                    f.write(data)
                print(f"Captured: {filepath} ({len(data)} bytes)", flush=True)

            # Auth setup
            setup_auth_js = f"""
            localStorage.setItem('pennypilot_theme', 'dark');
            localStorage.setItem('pennypilot_token', '{token}');
            localStorage.setItem('pennypilot_user', '{json.dumps(user_obj)}');
            localStorage.setItem('pennypilot_tutorial_completed_{user.id}', 'true');
            localStorage.setItem('pennypilot_tutorial_skipped_{user.id}', 'true');
            localStorage.removeItem('pennypilot_logged_out');
            """
            await eval_js(setup_auth_js)
            await eval_js("window.location.href = '/'")
            await asyncio.sleep(3.0)

            # 1. Click Quick Add button
            await eval_js("""
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Quick Add'));
                if (btn) btn.click();
            """)
            await asyncio.sleep(1.0)

            # 2. Upload Zomato Receipt file into file input
            doc_res = await send_cdp(ws, "DOM.getDocument", msg_id=m_id)
            m_id += 1
            root_node_id = doc_res["root"]["nodeId"]

            query_res = await send_cdp(ws, "DOM.querySelector", {
                "nodeId": root_node_id,
                "selector": "input[type=file]"
            }, msg_id=m_id)
            m_id += 1
            file_node_id = query_res["nodeId"]

            print("Found file input node:", file_node_id)
            await send_cdp(ws, "DOM.setFileInputFiles", {
                "nodeId": file_node_id,
                "files": [zomato_img_path]
            }, msg_id=m_id)
            m_id += 1

            # Wait for OCR extraction & review screen
            print("Waiting for OCR extraction...")
            ocr_ready = await eval_js("""
                (async () => {
                    for (let i = 0; i < 50; i++) {
                        const inputs = Array.from(document.querySelectorAll('input'));
                        const hasAmount = inputs.some(i => i.value === '537' || i.value === '537.00');
                        if (hasAmount) return true;
                        await new Promise(r => setTimeout(r, 500));
                    }
                    return false;
                })()
            """)
            print("OCR ready in browser:", ocr_ready)
            await asyncio.sleep(1.0)

            # 3. Expand line items and check extracted fields
            await eval_js("""
                (() => {
                    const lineItemToggle = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Detected Line Items'));
                    if (lineItemToggle) lineItemToggle.click();
                })()
            """)
            await asyncio.sleep(0.8)

            extracted_info = await eval_js("""
                (() => {
                    const inputs = Array.from(document.querySelectorAll('input'));
                    const merchantInput = inputs.find(i => i.value && (i.value.includes('Spice') || i.value.includes('Zomato')));
                    const amountInput = inputs.find(i => i.value === '537' || i.value === '537.00');
                    const dateInput = inputs.find(i => i.type === 'date');
                    
                    const lineItemDivs = Array.from(document.querySelectorAll('div.flex.justify-between')).filter(el => 
                        el.textContent && (el.textContent.includes('Paneer') || el.textContent.includes('Garlic') || el.textContent.includes('Dal') || el.textContent.includes('Packaging') || el.textContent.includes('Delivery'))
                    );
                    
                    const lineItems = lineItemDivs.map(el => ({
                        name: el.children[0]?.textContent?.trim() || el.textContent.trim(),
                        amount: el.children[1]?.textContent?.trim() || ''
                    }));

                    return {
                        merchant: merchantInput ? merchantInput.value : null,
                        amount: amountInput ? amountInput.value : null,
                        date: dateInput ? dateInput.value : null,
                        line_items: lineItems
                    };
                })()
            """)
            print("Extracted Info raw response:", extracted_info)
            val = extracted_info.get("result", {}).get("value") or extracted_info.get("value") or {}
            print("Extracted Info in Browser:", json.dumps(val, indent=2))

            # Verify values
            assert val.get("merchant") and "Spice Route" in val.get("merchant"), "Merchant name must contain 'Spice Route'"
            assert val.get("amount") in ["537", "537.00"], f"Amount must be ₹537, got {val.get('amount')}"
            assert val.get("date") == "2025-02-14", f"Date must be 2025-02-14, got {val.get('date')}"
            assert len(val.get("line_items", [])) >= 3, f"Expected detected line items, got {val.get('line_items')}"

            # 4. Check DB BEFORE explicit save: confirm transaction NOT yet saved!
            db.expire_all()
            tx_count_during_review = db.query(Transaction).filter(
                Transaction.user_id == user.id,
                Transaction.deleted_at == None
            ).count()
            print(f"Transactions in DB during review (BEFORE save click): {tx_count_during_review}")
            assert tx_count_during_review == tx_count_before, "Transaction must NOT be committed before user clicks Save!"

            await take_screenshot("artifacts/audit_receipt_review_card.png", 1440, 900)

            # 5. Explicit user confirmation: Click "Save Transaction to Ledger"
            print("Clicking 'Save Transaction to Ledger'...")
            click_save_res = await eval_js("""
                (() => {
                    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => 
                        b.textContent && (b.textContent.includes('Save Transaction') || b.textContent.includes('Record Transaction'))
                    );
                    if (saveBtn) {
                        saveBtn.click();
                        return "clicked save";
                    }
                    return "save button not found";
                })()
            """)
            print("Save click result:", click_save_res.get("result", {}).get("value"))
            await asyncio.sleep(2.0)

            # 6. Verify DB AFTER explicit save: confirm transaction IS saved!
            db.expire_all()
            tx_count_after = db.query(Transaction).filter(
                Transaction.user_id == user.id,
                Transaction.deleted_at == None
            ).count()
            print(f"Transactions in DB AFTER save click: {tx_count_after}")
            assert tx_count_after == tx_count_before + 1, "Exactly one transaction must be added after save!"

            saved_tx = db.query(Transaction).filter(
                Transaction.user_id == user.id,
                Transaction.deleted_at == None
            ).order_by(Transaction.created_at.desc()).first()

            print(f"Confirmed Saved Transaction: ID={saved_tx.id}, Description='{saved_tx.description}', Amount={saved_tx.amount_paise} paise (₹{saved_tx.amount_paise/100:.2f}), Date={saved_tx.occurred_on}")
            assert saved_tx.amount_paise == 53700, f"Expected 53700 paise (₹537.00), got {saved_tx.amount_paise}"
            assert str(saved_tx.occurred_on) == "2025-02-14", f"Expected 2025-02-14, got {saved_tx.occurred_on}"
            assert "The Spice Route" in saved_tx.description, "Description should reference merchant"

            await take_screenshot("artifacts/audit_receipt_saved_confirmation.png", 1440, 900)
            print("ALL RECEIPT VERIFICATION CHECKS PASSED SUCCESSFULLY!")

    finally:
        proc.kill()
        db.close()

if __name__ == "__main__":
    asyncio.run(test_receipt_flow())
