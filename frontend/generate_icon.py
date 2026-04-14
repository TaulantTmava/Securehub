from PIL import Image, ImageDraw
import os

def draw_icon(size):
    # Work at 4x for anti-aliasing, then downscale
    scale = 4
    s = size * scale
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Dark circle background
    draw.ellipse([0, 0, s, s], fill=(13, 13, 20, 255))

    # Shield shape
    m = s // 8
    points = [
        (s // 2, m),
        (s - m, m * 2),
        (s - m, s * 5 // 8),
        (s // 2, s - m),
        (m, s * 5 // 8),
        (m, m * 2),
    ]
    draw.polygon(points, fill=(212, 53, 28, 255))

    # Lock body
    lw = s // 5
    lh = s // 5
    lx = s // 2 - lw // 2
    ly = s // 2 - lh // 8
    draw.rectangle([lx, ly, lx + lw, ly + lh], fill=(255, 255, 255, 255))

    # Lock shackle
    sw = lw // 2
    sx = s // 2 - sw // 2
    line_width = max(2, s // 24)
    draw.arc([sx, ly - lh // 2, sx + sw, ly + 4], 0, 180, fill=(255, 255, 255, 255), width=line_width)

    # Downscale with high-quality resampling
    return img.resize((size, size), Image.LANCZOS)

os.makedirs('build', exist_ok=True)
os.makedirs('public', exist_ok=True)

# Build all sizes; save via the 256x256 image using sizes= (Pillow resizes from it)
sizes = [16, 24, 32, 48, 64, 128, 256]
base = draw_icon(256)

# Use sizes= so Pillow embeds every resolution in one ICO
base.save(
    'build/icon.ico',
    format='ICO',
    sizes=[(s, s) for s in sizes],
)

# Save 512x512 PNG as reference
draw_icon(512).save('build/icon.png', format='PNG')

import shutil
shutil.copy('build/icon.ico', 'public/icon.ico')
draw_icon(256).save('public/icon.png', format='PNG')

print(f"Icons created: {sizes} -> build/icon.ico")
