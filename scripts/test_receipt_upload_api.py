import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
import json
import urllib.request
import uuid
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import create_access_token

db = SessionLocal()
user = db.query(User).filter(User.email == "jayachandravennam.jc@gmail.com").first()
if not user:
    user = db.query(User).first()
token = create_access_token(subject=user.id, extra_claims={'email': user.email})

img_path = r'C:/Users/jayac/.gemini/antigravity/brain/c57dd9d8-efcb-43fc-a7c4-d18e8d653693/.user_uploaded/media_1794082914274_16a36aaa.png'
with open(img_path, 'rb') as f:
    content = f.read()

boundary = '----WebKitFormBoundary' + uuid.uuid4().hex
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="zomato_receipt.png"\r\n'
    f'Content-Type: image/png\r\n\r\n'
).encode('utf-8') + content + f'\r\n--{boundary}--\r\n'.encode('utf-8')

# Test direct to backend (port 8000)
req_direct = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/receipts/extract',
    data=body,
    headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Authorization': f'Bearer {token}'
    }
)
try:
    resp = urllib.request.urlopen(req_direct)
    data = json.loads(resp.read().decode('utf-8'))
    print('Direct Port 8000 Status:', resp.getcode())
    print('Extracted Merchant:', data.get('merchant'))
    print('Extracted Amount Paise:', data.get('amount_paise'))
    print('Extracted Date:', data.get('date'))
    print('[SUCCESS] Direct backend /api/v1/receipts/extract working!')
except Exception as e:
    print('Direct failed:', e)

# Test via Vite proxy (port 5173)
req = urllib.request.Request(
    'http://localhost:5173/api/v1/receipts/extract',
    data=body,
    headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Authorization': f'Bearer {token}'
    }
)
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode('utf-8'))
    print('Vite Proxy Status:', resp.getcode())
    print('Extracted Merchant:', data.get('merchant'))
    print('Extracted Amount Paise:', data.get('amount_paise'))
    print('[SUCCESS] Vite proxy working!')
except Exception as e:
    print('Vite Proxy Failed:', e)
