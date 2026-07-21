import sys
from pathlib import Path

sys.path.insert(0, r"C:\xampp\htdocs\narjiss\.tmp_qrcode_pkg")

import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageOps


OUT_DIR = Path(r"C:\xampp\htdocs\narjiss\mimosas-business-card")
OUT_DIR.mkdir(exist_ok=True)

LOGO_PATH = Path(r"C:\xampp\htdocs\mimosas\images\logo-mimosas-tranparent.png")
URL = "https://www.mimosas.company"

# Credit card format: 85.60 x 53.98 mm at 300 dpi.
W, H = 1011, 638
MARGIN = 54
GOLD = (169, 125, 42)
DARK_GOLD = (116, 79, 24)
INK = (34, 34, 34)
MUTED = (98, 98, 98)
PAPER = (255, 253, 248)
SOFT = (247, 241, 229)


def font(path, size):
    return ImageFont.truetype(str(path), size)


FONT_DIR = Path(r"C:\Windows\Fonts")
F_TITLE = font(FONT_DIR / "georgiab.ttf", 48)
F_COMPANY = font(FONT_DIR / "arialbd.ttf", 25)
F_ROLE = font(FONT_DIR / "arial.ttf", 23)
F_LABEL = font(FONT_DIR / "arialbd.ttf", 19)
F_TEXT = font(FONT_DIR / "arial.ttf", 23)
F_SMALL = font(FONT_DIR / "arial.ttf", 18)


def draw_text(draw, xy, text, fnt, fill):
    draw.text(xy, text, font=fnt, fill=fill)


def rounded_rectangle(draw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


card = Image.new("RGB", (W, H), PAPER)
draw = ImageDraw.Draw(card)

# Subtle premium border and warm side panel.
draw.rectangle((0, 0, W - 1, H - 1), outline=(226, 210, 174), width=3)
draw.rectangle((0, 0, 315, H), fill=SOFT)
draw.line((315, 54, 315, H - 54), fill=(222, 202, 159), width=2)

logo = Image.open(LOGO_PATH).convert("RGBA")
logo.thumbnail((250, 205), Image.LANCZOS)
logo_x = (315 - logo.width) // 2
logo_y = 62
card.paste(logo, (logo_x, logo_y), logo)

qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
qr.add_data(URL)
qr.make(fit=True)
qr_img = qr.make_image(fill_color=DARK_GOLD, back_color=PAPER).convert("RGB")
qr_img = qr_img.resize((168, 168), Image.Resampling.NEAREST)
qr_x, qr_y = 74, 335
rounded_rectangle(draw, (qr_x - 16, qr_y - 16, qr_x + 184, qr_y + 184), 18, fill=(255, 255, 255), outline=(228, 212, 178), width=2)
card.paste(qr_img, (qr_x, qr_y))
draw_text(draw, (83, 517), "www.mimosas.company", F_SMALL, DARK_GOLD)

x = 375
draw_text(draw, (x, 96), "ACHBAD ABED", F_TITLE, INK)
draw.line((x, 166, W - MARGIN, 166), fill=GOLD, width=4)
draw_text(draw, (x, 195), "HOTEL MIMOSAS", F_COMPANY, DARK_GOLD)
draw_text(draw, (x, 230), "TIZNIT", F_ROLE, MUTED)

contact_y = 330
items = [
    ("TEL", "+212 661 65 88 07"),
    ("MAIL", "contact@mimosas.company"),
    ("WEB", "www.mimosas.company"),
]

for label, value in items:
    draw_text(draw, (x, contact_y), label + ":", F_LABEL, DARK_GOLD)
    draw_text(draw, (x + 72, contact_y - 2), value, F_TEXT, INK)
    contact_y += 56

draw_text(draw, (x, H - 76), "Hôtel à Tiznit | Rooftop | Restaurant | Visite 360", F_SMALL, MUTED)

png_path = OUT_DIR / "carte-visite-achbad-abed-hotel-mimosas.png"
pdf_path = OUT_DIR / "carte-visite-achbad-abed-hotel-mimosas.pdf"
card.save(png_path, quality=95)
card.save(pdf_path, "PDF", resolution=300.0)

print(png_path)
print(pdf_path)
