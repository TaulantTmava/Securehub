from PIL import Image, ImageDraw
import os

sizes = [16, 32, 48, 64, 128, 256]
images = []

for size in sizes:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Dark background
    draw.ellipse([0, 0, size, size], fill=(13, 13, 20, 255))

    # Shield shape
    m = size // 8
    points = [
        (size//2, m),
        (size-m, m*2),
        (size-m, size*5//8),
        (size//2, size-m),
        (m, size*5//8),
        (m, m*2),
    ]
    draw.polygon(points, fill=(212, 53, 28, 255))

    # White lock body
    lw = size // 5
    lh = size // 5
    lx = size//2 - lw//2
    ly = size//2 - lh//8
    draw.rectangle([lx, ly, lx+lw, ly+lh], fill=(255, 255, 255, 255), outline=None)

    # Lock shackle
    sw = lw // 2
    sx = size//2 - sw//2
    draw.arc([sx, ly-lh//2, sx+sw, ly+4], 0, 180, fill=(255,255,255,255), width=max(1, size//32))

    images.append(img)

os.makedirs('build', exist_ok=True)
os.makedirs('public', exist_ok=True)

# PIL ICO: save largest first, append the rest WITHOUT sizes= parameter
# (sizes= causes PIL to resize only the primary image, ignoring append_images)
images[-1].save(
    'build/icon.ico',
    format='ICO',
    append_images=images[:-1],
)

import shutil
shutil.copy('build/icon.ico', 'public/icon.ico')
images[-1].save('public/icon.png', format='PNG')
print("Icons created successfully!")
