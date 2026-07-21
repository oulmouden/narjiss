from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

skin_dir = Path(r"C:\xampp\htdocs\mimosas\Mimosas\Tour\skin")
out = Path(r"C:\xampp\htdocs\narjiss\mimosas-report\3dvista-skin-buttons.png")
files = sorted([p for p in skin_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"} and ("Button_" in p.name or "IconButton_" in p.name)])

thumb_w, thumb_h = 120, 96
label_h = 42
cols = 5
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "white")
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 9)
except Exception:
    font = ImageFont.load_default()

for i, path in enumerate(files):
    x = (i % cols) * thumb_w
    y = (i // cols) * (thumb_h + label_h)
    try:
        img = Image.open(path).convert("RGBA")
        img.thumbnail((72, 60), Image.LANCZOS)
        bg = Image.new("RGB", (thumb_w, thumb_h), (245, 245, 245))
        bg.paste(img, ((thumb_w - img.width) // 2, (thumb_h - img.height) // 2), img)
        sheet.paste(bg, (x, y))
    except Exception:
        pass
    draw.rectangle((x, y, x + thumb_w - 1, y + thumb_h + label_h - 1), outline=(220, 220, 220))
    label = path.stem.replace("_pressed", "_p").replace("_rollover", "_r").replace("_mobile", "_m")
    label = label[:22] + ("\n" + label[22:44] if len(label) > 22 else "")
    draw.text((x + 4, y + thumb_h + 4), label, fill=(20, 20, 20), font=font)

sheet.save(out)
print(out)
