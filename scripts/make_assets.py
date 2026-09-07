#!/usr/bin/env python3
"""
Generate Sumday's app icons, splash mark and Play feature graphic.

The mark is a sum: two dim operand bars, a rule, and one lime result bar.
It is drawn geometrically rather than from a font so it stays crisp at every
size and needs no font files committed to the repo.

    python3 scripts/make_assets.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BG = (8, 9, 13)
LIME = (198, 242, 78)
DIM = (98, 107, 126)
DIM_SOFT = (62, 69, 85)
TEXT_DIM = (139, 147, 167)

ASSETS = Path(__file__).resolve().parent.parent / "assets"
FONT_DIR = Path("/usr/share/fonts/truetype/google-fonts")


def _font(name: str, size: int):
    """Marketing-only font. Never shipped in the app bundle."""
    path = FONT_DIR / name
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def _bar(draw, cx, y, w, h, fill):
    """A centre-aligned bar with fully rounded caps."""
    draw.rounded_rectangle([cx - w / 2, y, cx + w / 2, y + h], radius=h / 2, fill=fill)


def draw_mark(size, bg=None, scale=1.0):
    """
    The Sumday mark, optically centred on a square canvas.

    `scale` shrinks the mark inside the canvas, which is how the Android
    adaptive foreground stays clear of the system's circular mask.
    """
    img = Image.new("RGBA", (size, size), (*bg, 255) if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    box = size * 0.60 * scale
    cx = size / 2

    bar_h = box * 0.150
    gap = box * 0.105
    rule_h = box * 0.052
    result_h = bar_h * 1.14

    # Lay the stack out from zero, then translate so it is genuinely centred
    # rather than centred-by-eye on the containing box.
    rows = [
        (box * 0.58, bar_h, DIM),         # first operand
        (box * 0.86, bar_h, DIM_SOFT),    # second operand
        (box * 1.00, rule_h, DIM),        # the rule
        (box * 0.70, result_h, LIME),     # the result
    ]

    total = bar_h + gap + bar_h + gap + rule_h + gap * 1.2 + result_h
    y = (size - total) / 2

    for i, (w, h, fill) in enumerate(rows):
        _bar(d, cx, y, w, h, fill)
        y += h + (gap * 1.2 if i == 2 else gap)

    return img


def main():
    ASSETS.mkdir(exist_ok=True)

    # iOS / general app icon: opaque. The App Store rejects icons with alpha.
    draw_mark(1024, bg=BG).convert("RGB").save(ASSETS / "icon.png")

    # Android adaptive foreground: transparent, mark inside the safe zone.
    draw_mark(1024, scale=0.62).save(ASSETS / "adaptive-icon.png")

    # Splash mark: transparent, sits on the splash background colour.
    draw_mark(512).save(ASSETS / "splash-icon.png")

    # Play Store feature graphic, exactly 1024x500.
    fg = Image.new("RGB", (1024, 500), BG)
    mark = draw_mark(340)
    # Nudged right so the mark-plus-wordmark lockup is optically centred,
    # rather than the mark alone sitting on the left margin.
    fg.paste(mark, (146, 80), mark)

    d = ImageDraw.Draw(fg)
    d.text((518, 186), "SUMDAY", font=_font("Poppins-Bold.ttf", 82), fill=LIME)
    d.text((522, 286), "A number puzzle, once a day.", font=_font("Poppins-Medium.ttf", 28), fill=TEXT_DIM)
    fg.save(ASSETS / "play-feature-graphic.png")

    for name in ("icon.png", "adaptive-icon.png", "splash-icon.png", "play-feature-graphic.png"):
        p = ASSETS / name
        with Image.open(p) as im:
            print(f"  {name:28} {im.size[0]}x{im.size[1]}  {im.mode}  {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
