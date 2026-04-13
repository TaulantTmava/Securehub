from PIL import Image, ImageDraw
import os

def create_icon():
    sizes = [16, 32, 48, 64, 128, 256]
    images = []

    for size in sizes:
        img  = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Dark background circle
        draw.ellipse([2, 2, size-2, size-2], fill=(13, 13, 20, 255))

        # Red shield (hexagon)
        shield_margin = size // 6
        draw.polygon([
            (size//2,          shield_margin),
            (size-shield_margin, size//3),
            (size-shield_margin, size*2//3),
            (size//2,          size-shield_margin),
            (shield_margin,    size*2//3),
            (shield_margin,    size//3),
        ], fill=(212, 53, 28, 255))

        # White "S" in centre (only for sizes where it's readable)
        if size >= 32:
            font_size = size // 3
            draw.text((size//2, size//2), "S", fill=(255, 255, 255, 255), anchor="mm")

        images.append(img)

    os.makedirs('build',  exist_ok=True)
    os.makedirs('public', exist_ok=True)

    # Save multi-size ICO (largest image first, rest as append_images)
    images[-1].save(
        'build/icon.ico',
        format='ICO',
        sizes=[(s, s) for s in sizes],
        append_images=images[:-1],
    )
    images[-1].save('public/icon.png', format='PNG')
    # Also copy to public/icon.ico for dev use
    images[-1].save(
        'public/icon.ico',
        format='ICO',
        sizes=[(s, s) for s in sizes],
        append_images=images[:-1],
    )
    print("Icon created successfully")

create_icon()
