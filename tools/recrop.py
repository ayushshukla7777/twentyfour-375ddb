#!/usr/bin/env python3
"""Re-crop the video-call screenshots more aggressively (the name label and the
call-button row were still visible at the old, shallower crop)."""
import json, os
from PIL import Image, ImageOps

PROJ = "/home/ayush/anjali-birthday"
SRC = os.path.expanduser("~/.hermes/cache/images")
FULL, THUMB = f"{PROJ}/assets/photo/full", f"{PROJ}/assets/photo/thumb"

VCALL = ["p06","p08","p09","p11","p12","p13","p15","p17","p20","p22",
         "p23","p24","p27","p28","p29","p31","p32","p33","p40","p42"]
TOP_F, BOT_F = 0.085, 0.125

man = json.load(open(f"{PROJ}/assets/manifest.json"))
src = {p["id"]: p["src"] for p in man["photos"]}

for pid in VCALL:
    im = ImageOps.exif_transpose(Image.open(f"{SRC}/{src[pid]}")).convert("RGB")
    w, h = im.size
    im = im.crop((0, int(h * TOP_F), w, int(h * (1 - BOT_F))))

    full = im.copy(); full.thumbnail((1100, 1100), Image.LANCZOS)
    full.save(f"{FULL}/{pid}.webp", "WEBP", quality=82, method=6)
    th = im.copy(); th.thumbnail((520, 520), Image.LANCZOS)
    th.save(f"{THUMB}/{pid}.webp", "WEBP", quality=78, method=6)

    for rec in man["photos"]:
        if rec["id"] == pid:
            rec["w"], rec["h"] = im.size
            rec["portrait"] = im.height > im.width
            rec["kb_full"] = round(os.path.getsize(f"{FULL}/{pid}.webp") / 1024, 1)

json.dump(man, open(f"{PROJ}/assets/manifest.json", "w"), indent=1)
print(f"re-cropped {len(VCALL)} video-call screenshots at top={TOP_F:.1%} bottom={BOT_F:.1%}")

# verification sheet
from PIL import ImageDraw
CELL, PAD, COLS = 300, 8, 7
rows = (len(VCALL) + COLS - 1) // COLS
sh = Image.new("RGB", (COLS * (CELL + PAD) + PAD, rows * (CELL + PAD + 20) + PAD), (18, 18, 22))
d = ImageDraw.Draw(sh)
for i, pid in enumerate(VCALL):
    cx, cy = i % COLS, i // COLS
    x, y = PAD + cx * (CELL + PAD), PAD + cy * (CELL + PAD + 20)
    im = Image.open(f"{THUMB}/{pid}.webp").convert("RGB"); im.thumbnail((CELL, CELL))
    sh.paste(im, (x + (CELL - im.width) // 2, y + (CELL - im.height) // 2))
    d.rectangle([x, y, x + CELL, y + CELL], outline=(70, 70, 90))
    d.text((x + 4, y + CELL + 4), pid.upper(), fill=(250, 205, 90))
sh.save("/tmp/vcall_check.jpg", quality=90)
print("wrote /tmp/vcall_check.jpg", sh.size)
