import os
import base64
import numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, distance_transform_edt, gaussian_filter

src_path = 'C:/Users/jayac/.gemini/antigravity/brain/c57dd9d8-efcb-43fc-a7c4-d18e8d653693/.user_uploaded/media_1794035294517_d236c59d.jpg'
img = Image.open(src_path)
arr = np.array(img, dtype=float)
H, W, _ = arr.shape

print(f'Original image loaded: {W}x{H}')

# 1. 2D Background estimation using border pixels
y_idx, x_idx = np.mgrid[:H, :W]
outer_bg_mask = (x_idx < 250) | (x_idx > 820) | (y_idx < 40) | (y_idx > 530)
full_X = np.column_stack([
    np.ones(H*W),
    x_idx.ravel(),
    y_idx.ravel(),
    (x_idx.ravel()/W)**2,
    (y_idx.ravel()/H)**2,
    (x_idx.ravel()/W) * (y_idx.ravel()/H)
])
bg_est = np.zeros_like(arr)
for c in range(3):
    y_c = arr[outer_bg_mask, c]
    coef, _, _, _ = np.linalg.lstsq(full_X[outer_bg_mask.ravel()], y_c, rcond=None)
    bg_est[:, :, c] = (full_X @ coef).reshape(H, W)

diff = np.sqrt(np.sum((arr - bg_est)**2, axis=2))
r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
bright = (r + g + b) / 3.0

# 2. Strict solid core segmentation
in_bounds = (x_idx >= 318) & (x_idx <= 752) & (y_idx >= 78) & (y_idx <= 485)
# A pixel belongs to solid logo if it has high chroma (gold/teal/cyan) OR dark interior facets/bevels
is_solid = in_bounds & ((chroma > 14) | ((bright < 175) & (diff > 28)))
# Fill small interior highlights and creases
closed = binary_closing(is_solid, structure=np.ones((7,7)))

# Distance transforms for antialiased subpixel edge ramp
d_in = distance_transform_edt(closed)
d_out = distance_transform_edt(~closed)

# Antialiased alpha ramp
alpha = np.zeros((H, W), dtype=float)
alpha[closed] = 1.0
edge_band = (~closed) & (d_out <= 2.2) & in_bounds & (diff > 8)
alpha[edge_band] = np.clip(1.0 - d_out[edge_band] / 2.2, 0.0, 1.0)
alpha[d_out > 2.2] = 0.0
alpha[diff < 6] = 0.0

# Unmix foreground color on edges to eliminate background fringe
fg = np.copy(arr)
fringe = (alpha > 0.04) & (alpha < 0.98)
for c in range(3):
    fg[fringe, c] = np.clip((arr[fringe, c] - (1.0 - alpha[fringe]) * bg_est[fringe, c]) / np.maximum(alpha[fringe], 0.08), 0, 255)

rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)

# Crop to tight symbol bounds
nonzeros = alpha > 0.05
y_nz, x_nz = np.where(nonzeros)
rmin, rmax = y_nz.min(), y_nz.max()
cmin, cmax = x_nz.min(), x_nz.max()
print(f'Symbol bounding box: rows [{rmin}, {rmax}], cols [{cmin}, {cmax}], size: {cmax-cmin+1}x{rmax-rmin+1}')

cropped = rgba[rmin:rmax+1, cmin:cmax+1]
sym_raw = Image.fromarray(cropped, 'RGBA')

# Target high-resolution 512x512 canvas with symbol centered
size_512 = 512
# Scale symbol to 440px max dimension with 36px safe padding
scale_512 = 440.0 / max(sym_raw.size)
w_scaled = int(sym_raw.width * scale_512)
h_scaled = int(sym_raw.height * scale_512)
sym_512 = sym_raw.resize((w_scaled, h_scaled), Image.Resampling.LANCZOS)

# 1. High-Res Transparent Symbol 512x512
canvas_trans_512 = Image.new('RGBA', (size_512, size_512), (0, 0, 0, 0))
off_x = (size_512 - w_scaled) // 2
off_y = (size_512 - h_scaled) // 2
canvas_trans_512.paste(sym_512, (off_x, off_y), sym_512)

# Ensure output directories exist
os.makedirs('frontend/src/assets', exist_ok=True)
os.makedirs('frontend/public', exist_ok=True)
os.makedirs('screenshots', exist_ok=True)

# Save master symbol assets
canvas_trans_512.save('frontend/src/assets/pennypilot-symbol.png')
canvas_trans_512.save('frontend/public/pwa-symbol-512.png')
canvas_trans_512.save('screenshots/pennypilot-symbol.png')

# 2. Quiet Ledger Warm Off-White (#F7F5F0) App Icon (Standard for PWA / iOS / Android maskable)
canvas_ledger_512 = Image.new('RGBA', (size_512, size_512), (247, 245, 240, 255))
canvas_ledger_512.paste(sym_512, (off_x, off_y), sym_512)
canvas_ledger_512.save('frontend/public/pwa-512x512.png')

# 3. 192x192 icons
pwa_192_trans = canvas_trans_512.resize((192, 192), Image.Resampling.LANCZOS)
pwa_192_trans.save('frontend/public/pwa-symbol-192.png')

pwa_192_ledger = canvas_ledger_512.resize((192, 192), Image.Resampling.LANCZOS)
pwa_192_ledger.save('frontend/public/pwa-192x192.png')

# 4. Apple Touch Icon 180x180
apple_touch = canvas_ledger_512.resize((180, 180), Image.Resampling.LANCZOS)
apple_touch.save('frontend/public/apple-touch-icon.png')

# 5. Favicon PNGs
fav_32 = canvas_trans_512.resize((32, 32), Image.Resampling.LANCZOS)
fav_32.save('frontend/public/favicon-32x32.png')
fav_16 = canvas_trans_512.resize((16, 16), Image.Resampling.LANCZOS)
fav_16.save('frontend/public/favicon-16x16.png')

# 6. Multi-resolution favicon.ico
canvas_trans_512.save(
    'frontend/public/favicon.ico',
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
)

# 7. Generate SVG representations with embedded high-res lossless PNG data URI
with open('frontend/src/assets/pennypilot-symbol.png', 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

svg_content_favicon = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,{b64_data}" x="0" y="0" width="512" height="512" />
</svg>'''

with open('frontend/public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content_favicon)

svg_content_pwa = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="112" fill="#F7F5F0" />
  <image href="data:image/png;base64,{b64_data}" x="0" y="0" width="512" height="512" />
</svg>'''

with open('frontend/public/pwa-512x512.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content_pwa)

with open('frontend/public/pwa-192x192.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content_pwa)

print('All official PennyPilot brand assets generated successfully!')
