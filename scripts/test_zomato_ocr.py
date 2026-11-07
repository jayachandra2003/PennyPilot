import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'backend')
from app.domain.receipt_extractor import extract_raw_text, parse_receipt_text

img_path = r'C:/Users/jayac/.gemini/antigravity/brain/c57dd9d8-efcb-43fc-a7c4-d18e8d653693/.user_uploaded/media_1794082914274_16a36aaa.png'
with open(img_path, 'rb') as f:
    img_bytes = f.read()

raw_text, method, warnings = extract_raw_text(img_bytes, '.png')
print('=== EXTRACTION METHOD ===')
print(method)
print('=== RAW OCR TEXT ===')
print(raw_text)

categories = [
    {'id': 'cat_dining', 'name': 'Dining & Food', 'kind': 'expense'},
    {'id': 'cat_groceries', 'name': 'Groceries', 'kind': 'expense'},
    {'id': 'cat_shopping', 'name': 'Shopping', 'kind': 'expense'}
]
parsed = parse_receipt_text(raw_text, categories)

print('=== PARSED RECEIPT DETAILS ===')
print('Merchant:', parsed['merchant'])
print('Date:', parsed['date'])
amount_paise = parsed['amount_paise']
print(f"Amount (Paise): {amount_paise} -> INR {amount_paise / 100:.2f}")
print('Tax (Paise):', parsed['tax_paise'])
print('Category:', parsed['suggested_category_name'])
print('Description:', parsed['description'])
print('Confidence:', parsed['confidence_score'])
print('Line Items:')
for it in parsed['line_items']:
    amt = it['amount_paise']
    print(f"  - {it['name']} (qty: {it.get('quantity', 1)}): {amt} paise (INR {amt / 100:.2f})")

assert parsed['amount_paise'] == 53700, f"Expected 53700 paise, got {parsed['amount_paise']}"
print("\n[SUCCESS] Arithmetic verified: INR 537.00 == 53700 paise.")
