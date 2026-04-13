"""
Generate SecureHub app icons using Pillow.
Clean minimal design: dark bg + red shield + white lock.
"""
import os
from PIL import Image, ImageDraw

BG    = (10,  10,  15)     # #0a0a0f
RED   = (212, 53,  28)     # #d4351c
WHITE = (255, 255, 255)


def rounded_rect(draw, x0, y0, x1, y1, r, fill):
    draw.rectangle([x0 + r, y0,     x1 - r, y1    ], fill=fill)
    draw.rectangle([x0,     y0 + r, x1,     y1 - r], fill=fill)
    draw.ellipse(  [x0,          y0,          x0 + 2*r, y0 + 2*r], fill=fill)
    draw.ellipse(  [x1 - 2*r,    y0,          x1,       y0 + 2*r], fill=fill)
    draw.ellipse(  [x0,          y1 - 2*r,    x0 + 2*r, y1      ], fill=fill)
    draw.ellipse(  [x1 - 2*r,    y1 - 2*r,    x1,       y1      ], fill=fill)


def shield_poly(cx, cy, w, h):
    """
    Heater-shield: flat top with bevelled corners, sides taper to bottom tip.
    """
    hw  = w / 2
    bev = w * 0.09          # top-corner bevel size
    top = cy - h * 0.44
    mid = cy + h * 0.08     # mid-height, slightly inward
    bot = cy + h * 0.50     # tip

    return [
        (cx - hw + bev,  top),           # top-left  (bevelled)
        (cx + hw - bev,  top),           # top-right (bevelled)
        (cx + hw,        top + bev),     # bevel corner right
        (cx + hw * 0.72, mid),           # right side
        (cx,             bot),           # tip
        (cx - hw * 0.72, mid),           # left side
        (cx - hw,        top + bev),     # bevel corner left
    ]


def make_icon(size: int) -> Image.Image:
    s    = size
    img  = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── Background ────────────────────────────────────────────────────────────
    pad = int(s * 0.055)
    r   = int(s * 0.20)
    rounded_rect(draw, pad, pad, s - pad, s - pad, r, BG)

    # ── Shield ────────────────────────────────────────────────────────────────
    cx = s * 0.500
    cy = s * 0.455        # slightly above centre
    sw = s * 0.560
    sh = s * 0.580

    pts = shield_poly(cx, cy, sw, sh)
    draw.polygon(pts, fill=RED)

    # ── Lock body ─────────────────────────────────────────────────────────────
    lx  = cx
    ly  = cy + s * 0.05   # centred a bit lower in the shield

    bw  = s * 0.200
    bh  = s * 0.165
    br  = int(s * 0.025)

    # Shackle arc
    aw  = bw * 0.62
    ah  = s  * 0.110
    alw = max(2, int(s * 0.028))
    draw.arc(
        [lx - aw/2, ly - bh/2 - ah,
         lx + aw/2, ly - bh/2 + ah * 0.12],
        start=180, end=0, fill=WHITE, width=alw,
    )

    # Rectangular body
    rounded_rect(draw,
                 lx - bw/2, ly - bh/2,
                 lx + bw/2, ly + bh/2,
                 br, WHITE)

    # Keyhole — circle + stem in RED
    kcy = ly + bh * 0.06
    kr  = s  * 0.030
    draw.ellipse([lx - kr, kcy - kr, lx + kr, kcy + kr], fill=RED)
    ksw = s * 0.020
    ksh = s * 0.048
    draw.rectangle(
        [lx - ksw/2, kcy + kr * 0.5,
         lx + ksw/2, kcy + kr * 0.5 + ksh],
        fill=RED,
    )

    return img


def main():
    pub   = r"C:\Users\Taula\Securehub\frontend\public"
    build = r"C:\Users\Taula\Securehub\frontend\build"
    os.makedirs(pub,   exist_ok=True)
    os.makedirs(build, exist_ok=True)

    # 512 × 512 PNG
    img512 = make_icon(512)
    img512.save(os.path.join(pub,   "icon.png"))
    img512.save(os.path.join(build, "icon.png"))
    print("Saved icon.png (512×512)")

    # ICO — multiple sizes
    sizes    = [256, 128, 64, 48, 32, 16]
    ico_imgs = [make_icon(s).convert("RGBA") for s in sizes]
    for dest in [os.path.join(pub, "icon.ico"), os.path.join(build, "icon.ico")]:
        ico_imgs[0].save(
            dest, format="ICO",
            sizes=[(s, s) for s in sizes],
            append_images=ico_imgs[1:],
        )
        print(f"Saved {dest}")


if __name__ == "__main__":
    main()
