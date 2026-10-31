"""Service cover images for the launch kit (4:3, 1600x1200 JPEG — the frame the offer form crops to).

Illustrations only (never shown as client work). Drawn at 2x and downscaled for clean edges.
Run: python3 docs/launch-kit/make_covers.py <dir with pjs-500/600/700/800.ttf>
(static Plus Jakarta Sans, e.g. cdn.jsdelivr.net/fontsource/fonts/plus-jakarta-sans@latest/latin-800-normal.ttf)
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIR = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
OUT = Path(__file__).parent / "covers"
W, H, S = 1600, 1200, 2


def oklch(l, c, h):
    a, b = c * math.cos(math.radians(h)), c * math.sin(math.radians(h))
    l_, m_, s_ = l + 0.3963377774 * a + 0.2158037573 * b, l - 0.1055613458 * a - 0.0638541728 * b, l - 0.0894841775 * a - 1.2914855480 * b
    l3, m3, s3 = l_ ** 3, m_ ** 3, s_ ** 3
    rgb = (4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
           -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
           -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3)
    g = lambda x: 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
    return tuple(max(0, min(255, round(g(v) * 255))) for v in rgb)


INK, INK2 = oklch(0.20, 0.045, 255), oklch(0.27, 0.05, 250)
INK_DEEP = oklch(0.15, 0.035, 255)
LIME, SEA, SEA_L = oklch(0.89, 0.20, 128), oklch(0.62, 0.13, 245), oklch(0.80, 0.09, 238)
CLAY, CLAY_L = oklch(0.70, 0.15, 45), oklch(0.84, 0.08, 50)
SAND, CARD, MUTED = oklch(0.975, 0.01, 85), (255, 255, 255), oklch(0.90, 0.012, 85)
LINE = oklch(0.82, 0.015, 255)


def font(size, wght=700):
    w = min((500, 600, 700, 800), key=lambda x: abs(x - wght))
    return ImageFont.truetype(str(FONT_DIR / f"pjs-{w}.ttf"), size * S)


def P(*v):
    return [x * S for x in v]


def canvas(hue_shift=0):
    img = Image.new("RGB", (W * S, H * S), INK)
    d = ImageDraw.Draw(img)
    # vertical gradient ink → deeper ink
    top, bot = oklch(0.24, 0.05, 255 + hue_shift), INK_DEEP
    for y in range(0, H * S, 4):
        t = y / (H * S)
        d.rectangle([0, y, W * S, y + 4], fill=tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    contours(img)
    return img


def contours(img):
    """Mapped-loop ground: soft topographic lines."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = 1180 * S, 300 * S
    for k in range(1, 22):
        r = k * 62 * S
        pts = []
        for i in range(0, 361, 3):
            a = math.radians(i)
            wob = 1 + 0.09 * math.sin(3 * a + k * 0.7) + 0.05 * math.sin(5 * a - k)
            pts.append((cx + r * wob * math.cos(a) * 1.25, cy + r * wob * math.sin(a)))
        d.line(pts, fill=(255, 255, 255, 13), width=2 * S, joint="curve")
    img.paste(layer, (0, 0), layer)


def shadow(img, box, r, blur=40, alpha=110, dy=26):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(layer).rounded_rectangle([x0, y0 + dy * S, x1, y1 + dy * S], r, fill=(4, 8, 20, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur * S))
    img.paste(layer, (0, 0), layer)


def panel(img, box, r=24, fill=CARD, sh=True):
    box = P(*box)
    if sh:
        shadow(img, box, r * S)
    ImageDraw.Draw(img).rounded_rectangle(box, r * S, fill=fill)
    return box


def rr(d, box, r, fill=None, outline=None, width=0):
    d.rounded_rectangle(P(*box), r * S, fill=fill, outline=outline, width=width * S)


def bars(d, x, y, widths, h=14, gap=14, fill=MUTED, r=7):
    for i, w in enumerate(widths):
        rr(d, (x, y + i * (h + gap), x + w, y + i * (h + gap) + h), r, fill=fill)


def text(d, xy, s, size, fill, wght=700, anchor="la"):
    d.text(P(*xy), s, font=font(size, wght), fill=fill, anchor=anchor)


def chip(d, xy, label, fg, bg, size=26):
    f = font(size, 700)
    x, y = xy
    w = d.textlength(label, font=f) / S
    rr(d, (x, y, x + w + 44, y + size + 26), (size + 26) // 2, fill=bg)
    d.text(P(x + 22, y + 13), label, font=f, fill=fg)


def loop(d, cx, cy, a, color, width=7):
    """The brand infinity loop (lemniscate of Gerono-like curve) with a lime spark."""
    pts = []
    for i in range(0, 361, 2):
        t = math.radians(i)
        den = 1 + math.sin(t) ** 2
        pts.append(((cx + a * math.cos(t) / den) * S, (cy + a * math.sin(t) * math.cos(t) / den) * S))
    d.line(pts, fill=color, width=width * S, joint="curve")
    sx, sy = pts[20]
    rad = 11 * S
    d.ellipse([sx - rad, sy - rad, sx + rad, sy + rad], fill=LIME)


def headline(d, lines, kicker, accent, y=120):
    text(d, (110, y), kicker.upper(), 26, accent, 800)
    for i, ln in enumerate(lines):
        text(d, (106, y + 52 + i * 92), ln, 78, SAND, 800)
    rr(d, (110, y + 52 + len(lines) * 92 + 18, 250, y + 52 + len(lines) * 92 + 30), 6, fill=accent)


def footer(d, tags, accent):
    x = 110
    for tg in tags:
        f = font(26, 700)
        w = d.textlength(tg, font=f) / S
        rr(d, (x, 1052, x + w + 44, 1104), 26, outline=(255, 255, 255), width=2)
        d.text(P(x + 22, 1064), tg, font=f, fill=SAND)
        x += w + 64
    loop(d, 1440, 1078, 62, accent, 6)


def save(img, name):
    OUT.mkdir(exist_ok=True)
    img.resize((W, H), Image.LANCZOS).save(OUT / name, "JPEG", quality=90, optimize=True, progressive=True)
    print("wrote", OUT / name)


# 1 — Site web / landing page ---------------------------------------------------------------
def cover_web():
    img = canvas()
    d = ImageDraw.Draw(img)
    headline(d, ["Votre site", "prêt à vendre"], "Site web · Landing page", LIME, y=100)
    # browser
    b = panel(img, (640, 330, 1500, 960), 24)
    rr(d, (640, 330, 1500, 392), 24, fill=oklch(0.95, 0.01, 85))
    d.rectangle([640 * S, 370 * S, 1500 * S, 392 * S], fill=oklch(0.95, 0.01, 85))
    for i, c in enumerate([CLAY, oklch(0.85, 0.14, 90), LIME]):
        d.ellipse(P(672 + i * 34, 350, 692 + i * 34, 370), fill=c)
    rr(d, (800, 346, 1220, 376), 15, fill=CARD)
    text(d, (822, 349), "votre-marque.tn", 20, oklch(0.5, 0.02, 255), 600)
    # nav
    rr(d, (690, 420, 760, 446), 8, fill=INK)
    bars(d, 1050, 426, [70], 14)
    bars(d, 1140, 426, [70], 14)
    bars(d, 1230, 426, [70], 14)
    rr(d, (1340, 416, 1460, 452), 18, fill=LIME)
    # hero
    rr(d, (690, 486, 1050, 520), 10, fill=INK)
    rr(d, (690, 534, 980, 568), 10, fill=INK)
    bars(d, 690, 596, [330, 280], 14, 14)
    rr(d, (690, 664, 860, 712), 24, fill=LIME)
    rr(d, (876, 664, 1010, 712), 24, outline=INK, width=3)
    hero_box = (1090, 476, 1460, 730)
    rr(d, hero_box, 18, fill=SEA)
    d.polygon(P(1090, 700, 1200, 590, 1290, 670, 1360, 610, 1460, 700, 1460, 730, 1090, 730), fill=oklch(0.45, 0.12, 245))
    d.ellipse(P(1350, 510, 1410, 570), fill=LIME)
    # feature cards
    for i in range(3):
        x = 690 + i * 260
        rr(d, (x, 770, x + 240, 920), 16, fill=oklch(0.965, 0.01, 85))
        d.ellipse(P(x + 20, 790, x + 64, 834), fill=[CLAY, SEA, LIME][i])
        bars(d, x + 20, 852, [170, 120], 12, 12)
    # phone overlapping
    ph = panel(img, (470, 560, 690, 1010), 34, fill=INK_DEEP)
    rr(d, (482, 572, 678, 998), 26, fill=CARD)
    rr(d, (548, 582, 612, 596), 7, fill=INK_DEEP)
    rr(d, (500, 620, 640, 642), 8, fill=INK)
    rr(d, (500, 652, 600, 674), 8, fill=INK)
    bars(d, 500, 692, [150, 120], 10, 10)
    rr(d, (500, 740, 620, 776), 18, fill=LIME)
    rr(d, (500, 800, 660, 900), 14, fill=SEA)
    rr(d, (500, 916, 575, 980), 12, fill=oklch(0.965, 0.01, 85))
    rr(d, (585, 916, 660, 980), 12, fill=oklch(0.965, 0.01, 85))
    # code badge
    panel(img, (1290, 880, 1540, 990), 20, fill=INK2)
    text(d, (1318, 905), "</>", 34, LIME, 800)
    text(d, (1400, 912), "rapide", 24, SAND, 700)
    text(d, (1400, 944), "& mobile", 24, SEA_L, 600)
    footer(d, ["Responsive", "SEO de base", "Livré en ligne"], LIME)
    save(img, "01-site-web.jpg")


# 2 — UI/UX design d'application ------------------------------------------------------------
def phone(img, x, y, w, h, screen):
    panel(img, (x, y, x + w, y + h), 44, fill=INK_DEEP)
    d = ImageDraw.Draw(img)
    rr(d, (x + 14, y + 14, x + w - 14, y + h - 14), 34, fill=CARD)
    rr(d, (x + w / 2 - 40, y + 26, x + w / 2 + 40, y + 42), 8, fill=INK_DEEP)
    screen(d, x + 34, y + 64, w - 68)


def screen_home(d, x, y, w):
    rr(d, (x, y, x + 120, y + 22), 8, fill=INK)
    d.ellipse(P(x + w - 40, y - 6, x + w, y + 34), fill=CLAY_L)
    rr(d, (x, y + 50, x + w, y + 200), 22, fill=SEA)
    rr(d, (x + 22, y + 76, x + 150, y + 96), 8, fill=SAND)
    rr(d, (x + 22, y + 110, x + 110, y + 126), 7, fill=SEA_L)
    rr(d, (x + 22, y + 148, x + 120, y + 182), 17, fill=LIME)
    for i in range(3):
        cx = x + i * (w / 3)
        d.ellipse(P(cx + 10, y + 228, cx + 70, y + 288), fill=[oklch(0.95, 0.03, 128), oklch(0.95, 0.03, 245), oklch(0.95, 0.03, 45)][i])
    for i in range(2):
        yy = y + 320 + i * 96
        rr(d, (x, yy, x + w, yy + 80), 16, fill=oklch(0.965, 0.01, 85))
        rr(d, (x + 14, yy + 14, x + 66, yy + 66), 12, fill=[CLAY, SEA][i])
        bars(d, x + 82, yy + 20, [130, 90], 12, 14)


def screen_detail(d, x, y, w):
    rr(d, (x, y, x + w, y + 230), 22, fill=CLAY_L)
    d.ellipse(P(x + w / 2 - 60, y + 55, x + w / 2 + 60, y + 175), fill=CLAY)
    rr(d, (x, y + 256, x + 170, y + 280), 9, fill=INK)
    bars(d, x, y + 300, [w, w - 40, w - 90], 11, 12)
    for i in range(3):
        rr(d, (x + i * 72, y + 384, x + i * 72 + 60, y + 416), 16, fill=LIME if i == 1 else oklch(0.95, 0.01, 85))
    rr(d, (x, y + 452, x + w, y + 504), 26, fill=INK)
    rr(d, (x + w / 2 - 50, y + 470, x + w / 2 + 50, y + 486), 8, fill=LIME)


def cover_ui():
    img = canvas(-12)
    d = ImageDraw.Draw(img)
    headline(d, ["Une app claire", "qui convainc"], "UI/UX design · Figma", SEA_L)
    # design-tool frame
    fx0, fy0, fx1, fy1 = 700, 300, 1520, 1000
    text(d, (fx0 + 64, fy0 - 4), "Accueil", 22, SEA_L, 700)
    text(d, (fx0 + 444, fy0 + 56), "Détail", 22, SEA_L, 700)
    phone(img, 760, 340, 330, 640, screen_home)
    phone(img, 1140, 400, 330, 640, screen_detail)
    d = ImageDraw.Draw(img)
    # selection box with handles on the detail CTA
    sx0, sy0, sx1, sy1 = 1168, 908, 1442, 966
    d.rectangle(P(sx0, sy0, sx1, sy1), outline=SEA_L, width=3 * S)
    for hx, hy in [(sx0, sy0), (sx1, sy0), (sx0, sy1), (sx1, sy1)]:
        d.rectangle(P(hx - 8, hy - 8, hx + 8, hy + 8), fill=CARD, outline=SEA, width=3 * S)
    # cursor
    cx, cy = 1400, 950
    d.polygon(P(cx, cy, cx, cy + 62, cx + 16, cy + 46, cx + 30, cy + 74, cx + 42, cy + 68, cx + 28, cy + 42, cx + 50, cy + 42), fill=LIME, outline=INK_DEEP)
    # palette + type tokens
    panel(img, (110, 560, 600, 860), 24, fill=INK2)
    d = ImageDraw.Draw(img)
    text(d, (146, 594), "Design system", 26, SAND, 800)
    for i, c in enumerate([LIME, SEA, CLAY, SAND, INK_DEEP]):
        d.ellipse(P(146 + i * 84, 650, 210 + i * 84, 714), fill=c, outline=(255, 255, 255), width=2 * S)
    text(d, (146, 750), "Aa", 64, SAND, 800)
    bars(d, 260, 762, [250, 180], 14, 16, fill=oklch(0.45, 0.04, 250))
    # flow arrows
    d.line(P(1090, 640, 1140, 640), fill=SEA_L, width=4 * S)
    d.polygon(P(1140, 628, 1160, 640, 1140, 652), fill=SEA_L)
    footer(d, ["Maquettes Figma", "Prototype cliquable", "Fichiers sources"], SEA_L)
    save(img, "02-ui-ux-app.jpg")


# 3 — Identité visuelle / logo --------------------------------------------------------------
def cover_brand():
    img = canvas(20)
    d = ImageDraw.Draw(img)
    headline(d, ["Une marque", "qu'on retient"], "Logo · Identité visuelle", CLAY_L)
    # construction board
    panel(img, (700, 300, 1220, 820), 28, fill=SAND)
    d = ImageDraw.Draw(img)
    cx, cy = 960, 560
    for r in (210, 150, 90):
        d.ellipse(P(cx - r, cy - r, cx + r, cy + r), outline=LINE, width=2 * S)
    for k in range(-2, 3):
        d.line(P(cx + k * 75, 330, cx + k * 75, 790), fill=MUTED, width=2 * S)
        d.line(P(730, cy + k * 75, 1190, cy + k * 75), fill=MUTED, width=2 * S)
    d.line(P(760, 360, 1160, 760), fill=LINE, width=2 * S)
    d.line(P(1160, 360, 760, 760), fill=LINE, width=2 * S)
    # the mark: a bold monogram built from circle + square
    d.ellipse(P(cx - 120, cy - 120, cx + 40, cy + 40), fill=CLAY)
    rr(d, (cx - 30, cy - 30, cx + 120, cy + 120), 28, fill=INK)
    d.ellipse(P(cx + 20, cy + 20, cx + 70, cy + 70), fill=LIME)
    # business card
    panel(img, (1150, 690, 1530, 920), 18, fill=INK)
    d = ImageDraw.Draw(img)
    d.ellipse(P(1186, 726, 1236, 776), fill=CLAY)
    rr(d, (1214, 750, 1262, 798), 10, fill=SAND)
    bars(d, 1186, 820, [200, 140], 13, 14, fill=oklch(0.45, 0.04, 250))
    rr(d, (1440, 726, 1496, 742), 8, fill=LIME)
    # palette column
    for i, c in enumerate([CLAY, INK_DEEP, SAND, LIME]):
        panel(img, (1270 + (i % 2) * 130, 300 + (i // 2) * 170, 1380 + (i % 2) * 130, 450 + (i // 2) * 170), 18, fill=c)
    # type specimen
    panel(img, (110, 600, 600, 900), 24, fill=INK2)
    d = ImageDraw.Draw(img)
    text(d, (146, 628), "Aa", 120, CLAY_L, 800)
    text(d, (340, 650), "Titres", 30, SAND, 800)
    text(d, (340, 696), "Texte courant", 26, SEA_L, 500)
    bars(d, 146, 812, [380, 300], 13, 16, fill=oklch(0.45, 0.04, 250))
    footer(d, ["Logo + variantes", "Palette & typo", "Charte PDF"], CLAY_L)
    save(img, "03-identite-visuelle.jpg")


# 4 — Gestion réseaux sociaux / contenu -----------------------------------------------------
def cover_social():
    img = canvas(-30)
    d = ImageDraw.Draw(img)
    headline(d, ["Vos réseaux", "toujours actifs"], "Réseaux sociaux · Contenu", LIME)
    # phone with post grid
    panel(img, (760, 280, 1110, 1000), 46, fill=INK_DEEP)
    d = ImageDraw.Draw(img)
    rr(d, (774, 294, 1096, 986), 36, fill=CARD)
    d.ellipse(P(800, 330, 880, 410), fill=CLAY)
    d.ellipse(P(808, 338, 872, 402), fill=CLAY_L)
    for i in range(3):
        bars(d, 904 + i * 62, 348, [44], 14)
        bars(d, 904 + i * 62, 374, [44], 10, fill=oklch(0.93, 0.01, 85))
    rr(d, (800, 432, 1070, 466), 17, fill=LIME)
    cols = [SEA, CLAY, LIME, INK, SEA_L, CLAY_L, oklch(0.85, 0.14, 90), SEA, CLAY]
    for i in range(9):
        gx, gy = 800 + (i % 3) * 92, 490 + (i // 3) * 92
        rr(d, (gx, gy, gx + 86, gy + 86), 8, fill=cols[i])
    # play icon on one tile (reel)
    d.polygon(P(1004, 690, 1004, 726, 1034, 708), fill=SAND)
    bars(d, 800, 790, [260, 200, 230], 12, 14)
    # content calendar
    panel(img, (1160, 300, 1520, 640), 24, fill=SAND)
    d = ImageDraw.Draw(img)
    text(d, (1190, 326), "Planning", 28, INK, 800)
    for r in range(4):
        for c in range(5):
            x, y = 1190 + c * 62, 384 + r * 60
            on = (r * 5 + c) in (1, 4, 7, 10, 13, 16, 18)
            rr(d, (x, y, x + 50, y + 46), 10, fill=(LIME if on else oklch(0.93, 0.01, 85)))
    # rising engagement curve (no numbers: illustration only)
    panel(img, (1160, 680, 1520, 960), 24, fill=INK2)
    d = ImageDraw.Draw(img)
    pts = [(1190, 920), (1250, 890), (1310, 900), (1370, 840), (1430, 820), (1490, 740)]
    d.line([(x * S, y * S) for x, y in pts], fill=LIME, width=7 * S, joint="curve")
    x, y = pts[-1]
    d.ellipse(P(x - 13, y - 13, x + 13, y + 13), fill=LIME)
    text(d, (1190, 706), "Engagement", 24, SEA_L, 700)
    # heart / chat bubbles floating
    panel(img, (560, 560, 720, 640), 40, fill=CARD)
    d = ImageDraw.Draw(img)
    hx, hy = 600, 600
    d.ellipse(P(hx - 22, hy - 16, hx + 2, hy + 8), fill=CLAY)
    d.ellipse(P(hx - 2, hy - 16, hx + 22, hy + 8), fill=CLAY)
    d.polygon(P(hx - 21, hy - 1, hx + 21, hy - 1, hx, hy + 24), fill=CLAY)
    bars(d, 636, 592, [56], 16, fill=MUTED)
    panel(img, (520, 690, 720, 770), 40, fill=LIME)
    d = ImageDraw.Draw(img)
    bars(d, 552, 712, [130, 90], 12, 10, fill=INK)
    footer(d, ["Posts & Reels", "Calendrier", "Rapport mensuel"], LIME)
    save(img, "04-reseaux-sociaux.jpg")


if __name__ == "__main__":
    cover_web()
    cover_ui()
    cover_brand()
    cover_social()
