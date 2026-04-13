"""
SecureHub icon generator.
Draws: dark circle bg → red shield → white padlock.
Run from frontend/: python generate_icon.py
"""
from PIL import Image, ImageDraw
import os, math


BG_FILL    = (13,  13,  20,  255)   # #0d0d14
SHIELD_COL = (212, 53,  28,  255)   # #d4351c
LOCK_COL   = (255, 255, 255, 255)
HOLE_COL   = SHIELD_COL             # keyhole same red as shield


def rounded_rect(draw, x0, y0, x1, y1, r, fill):
    r = max(1, int(r))
    draw.rectangle([x0+r, y0,   x1-r, y1  ], fill=fill)
    draw.rectangle([x0,   y0+r, x1,   y1-r], fill=fill)
    draw.ellipse(  [x0,        y0,        x0+2*r, y0+2*r], fill=fill)
    draw.ellipse(  [x1-2*r,    y0,        x1,     y0+2*r], fill=fill)
    draw.ellipse(  [x0,        y1-2*r,    x0+2*r, y1    ], fill=fill)
    draw.ellipse(  [x1-2*r,    y1-2*r,    x1,     y1    ], fill=fill)


def shield_poly(cx, cy, w, h):
    """
    Classic heater-shield:
      - wide flat top with small bevels at the two upper corners
      - sides curve inward gently
      - pointed bottom tip
    """
    hw  = w / 2
    bev = w * 0.10           # top-corner bevel
    top = cy - h * 0.44
    bot = cy + h * 0.50
    # mid-height control: sides have tapered to 72 % of half-width
    mx  = hw * 0.72
    my  = cy + h * 0.08

    return [
        (cx - hw + bev,  top        ),   # top-left  bevel start
        (cx + hw - bev,  top        ),   # top-right bevel start
        (cx + hw,        top + bev  ),   # top-right bevel end
        (cx + mx,        my         ),   # right taper
        (cx,             bot        ),   # tip
        (cx - mx,        my         ),   # left taper
        (cx - hw,        top + bev  ),   # top-left  bevel end
    ]


def draw_lock(draw, cx, cy, size):
    """White padlock centred at (cx, cy). size is the icon dimension."""
    bw  = size * 0.190          # body width
    bh  = size * 0.160          # body height
    br  = size * 0.024          # body corner radius

    # ── Shackle (arc) ─────────────────────────────────────────────────────────
    aw   = bw * 0.60            # arc width
    ah   = size * 0.105         # arc height
    alw  = max(1, int(size * 0.026))
    draw.arc(
        [cx - aw/2, cy - bh/2 - ah,
         cx + aw/2, cy - bh/2 + ah * 0.12],
        start=180, end=0,
        fill=LOCK_COL, width=alw,
    )

    # ── Body ──────────────────────────────────────────────────────────────────
    rounded_rect(draw,
                 cx - bw/2, cy - bh/2,
                 cx + bw/2, cy + bh/2,
                 br, LOCK_COL)

    # ── Keyhole ───────────────────────────────────────────────────────────────
    kcy = cy + bh * 0.06
    kr  = size * 0.028
    draw.ellipse([cx-kr, kcy-kr, cx+kr, kcy+kr], fill=HOLE_COL)
    # stem
    ksw = size * 0.018
    ksh = size * 0.044
    draw.rectangle(
        [cx - ksw/2, kcy + kr * 0.5,
         cx + ksw/2, kcy + kr * 0.5 + ksh],
        fill=HOLE_COL,
    )


def make_frame(size: int) -> Image.Image:
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── Background circle ─────────────────────────────────────────────────────
    pad = max(1, int(size * 0.03))
    draw.ellipse([pad, pad, size-pad, size-pad], fill=BG_FILL)

    # ── Shield ────────────────────────────────────────────────────────────────
    cx  = size * 0.500
    cy  = size * 0.460          # slightly above centre
    sw  = size * 0.560
    sh  = size * 0.580
    pts = shield_poly(cx, cy, sw, sh)
    draw.polygon(pts, fill=SHIELD_COL)

    # ── Lock ──────────────────────────────────────────────────────────────────
    draw_lock(draw, cx, cy + size * 0.04, size)

    return img


def main():
    sizes = [16, 32, 48, 64, 128, 256]
    frames = [make_frame(s) for s in sizes]

    os.makedirs("build",  exist_ok=True)
    os.makedirs("public", exist_ok=True)

    # Multi-size ICO — largest first, rest as append_images
    for dest in ["build/icon.ico", "public/icon.ico"]:
        frames[-1].save(
            dest, format="ICO",
            sizes=[(s, s) for s in sizes],
            append_images=frames[:-1],
        )
        print(f"Saved {dest}  ({', '.join(str(s) for s in sizes)} px)")

    # 256×256 PNG preview
    frames[-1].save("public/icon.png", format="PNG")
    print("Saved public/icon.png (256×256)")


if __name__ == "__main__":
    main()
