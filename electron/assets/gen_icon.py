#!/usr/bin/env python3
"""Generate PRView icon: </> + checkmark on blue gradient background."""
import sys
from PIL import Image, ImageDraw

SIZE = 1024
RADIUS = int(SIZE * 0.224)  # macOS-style corner rounding (~230px)

BLUE_TOP = (0, 44, 130)    # deep navy at top
BLUE_BOT = (0, 115, 205)   # primary app blue at bottom
WHITE    = (255, 255, 255, 255)


def make_bg(size, radius):
    """Blue vertical gradient, clipped to rounded rectangle."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        r = int(BLUE_TOP[0] + (BLUE_BOT[0] - BLUE_TOP[0]) * t)
        g = int(BLUE_TOP[1] + (BLUE_BOT[1] - BLUE_TOP[1]) * t)
        b = int(BLUE_TOP[2] + (BLUE_BOT[2] - BLUE_TOP[2]) * t)
        draw.line([(0, y), (size - 1, y)], fill=(r, g, b, 255))

    # Apply rounded-rect mask
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (size - 1, size - 1)], radius=radius, fill=255
    )
    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(img, mask=mask)
    return result


def thick_line(draw, p1, p2, color, width):
    """Thick line with round end-caps (circle at each endpoint)."""
    draw.line([p1, p2], fill=color, width=width)
    r = width // 2
    for cx, cy in (p1, p2):
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=color)


def draw_symbol(base_img):
    """Draw </> and checkmark at 2x resolution, then downscale for AA."""
    W = SIZE * 2
    s = W / 1024.0
    work = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    draw = ImageDraw.Draw(work)

    LW  = int(54 * s)   # line width
    cy  = 512 * s       # vertical center
    ht  = 150 * s       # half-height of the symbol

    # ── < bracket ──────────────────────────────────────────
    # apex at (248, cy), wings at (300, cy-ht) and (300, cy+ht)
    lt_apex = (248 * s, cy)
    lt_top  = (300 * s, cy - ht)
    lt_bot  = (300 * s, cy + ht)
    thick_line(draw, lt_top,  lt_apex, WHITE, LW)
    thick_line(draw, lt_apex, lt_bot,  WHITE, LW)

    # ── / slash ─────────────────────────────────────────────
    # from (352, cy+ht) to (400, cy-ht)
    sl_bot = (352 * s, cy + ht)
    sl_top = (400 * s, cy - ht)
    thick_line(draw, sl_bot, sl_top, WHITE, LW)

    # ── > bracket ──────────────────────────────────────────
    # wings at (420, cy-ht) and (420, cy+ht), apex at (472, cy)
    rt_top  = (420 * s, cy - ht)
    rt_bot  = (420 * s, cy + ht)
    rt_apex = (472 * s, cy)
    thick_line(draw, rt_top, rt_apex, WHITE, LW)
    thick_line(draw, rt_apex, rt_bot, WHITE, LW)

    # ── ✓ checkmark ─────────────────────────────────────────
    # left end → valley → right end
    ck_left   = (572 * s, cy + 14 * s)
    ck_valley = (636 * s, cy + 92 * s)
    ck_right  = (780 * s, cy - 116 * s)
    thick_line(draw, ck_left,   ck_valley, WHITE, LW)
    thick_line(draw, ck_valley, ck_right,  WHITE, LW)

    # Downscale with LANCZOS for clean anti-aliasing
    work = work.resize((SIZE, SIZE), Image.LANCZOS)
    base_img.alpha_composite(work)


# ── Generate ────────────────────────────────────────────────────────────────
img = make_bg(SIZE, RADIUS)
draw_symbol(img)

out = sys.argv[1] if len(sys.argv) > 1 else 'icon_1024.png'
img.save(out, 'PNG')
print(f'Saved: {out}')
