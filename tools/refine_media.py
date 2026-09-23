#!/usr/bin/env python3
"""
Refinement pass: rotate the sideways photos and crop the phone UI chrome
(status bar + call buttons) off the video-call screenshots, so they read as
photographs rather than screenshots.

Re-writes full/ and thumb/ WebP from the original sources.
"""
import json, os
from PIL import Image, ImageOps

PROJ = "/home/ayush/anjali-birthday"
SRC = os.path.expanduser("~/.hermes/cache/images")
FULL, THUMB = f"{PROJ}/assets/photo/full", f"{PROJ}/assets/photo/thumb"

# pid -> extra operations
ROTATE = {                      # rotate 180: the photo was saved upside-down
    "p05": 180,
    "p16": 180,
}
# video-call screenshots: strip status bar (top) and call-button row (bottom)
VCALL = {
    "p06", "p08", "p09", "p11", "p12", "p13", "p15", "p17",
    "p20", "p22", "p23", "p24", "p27", "p28", "p29", "p31", "p32",
    "p33", "p40", "p42",
}
TOP_F, BOT_F = 0.038, 0.105     # fractions of height to trim

# p39 is a Google Meet screenshot: crop hard to just her portrait
SPECIAL = {"p39": (0.11, 0.66)}  # (top fraction, bottom fraction)

man = json.load(open(f"{PROJ}/assets/manifest.json"))
report = []
for rec in man["photos"]:
    pid = rec["id"]
    im = ImageOps.exif_transpose(Image.open(f"{SRC}/{rec['src']}")).convert("RGB")

    if pid in ROTATE:
        im = im.rotate(ROTATE[pid], expand=True)

    before = im.size
    if pid in SPECIAL:
        t, b = SPECIAL[pid]
        w, h = im.size
        im = im.crop((0, int(h * t), w, int(h * b)))
    elif pid in VCALL:
        w, h = im.size
        im = im.crop((0, int(h * TOP_F), w, int(h * (1 - BOT_F))))

    full = im.copy(); full.thumbnail((1100, 1100), Image.LANCZOS)
    full.save(f"{FULL}/{pid}.webp", "WEBP", quality=82, method=6)
    th = im.copy(); th.thumbnail((520, 520), Image.LANCZOS)
    th.save(f"{THUMB}/{pid}.webp", "WEBP", quality=78, method=6)

    rec["w"], rec["h"] = im.size
    rec["portrait"] = im.height > im.width
    rec["kb_full"] = round(os.path.getsize(f"{FULL}/{pid}.webp") / 1024, 1)
    rec["ops"] = (f"rot{ROTATE[pid]}" if pid in ROTATE else "") + \
                 ("+crop" if (pid in VCALL or pid in SPECIAL) else "")
    report.append((pid, before, im.size, rec["ops"]))

json.dump(man, open(f"{PROJ}/assets/manifest.json", "w"), indent=1)

print(f"{'pid':5} {'before':>11} -> {'after':>11}  ops")
for pid, b, a, ops in report:
    mark = "  <-- " + ops if ops else ""
    print(f"{pid:5} {str(b[0])+'x'+str(b[1]):>11} -> {str(a[0])+'x'+str(a[1]):>11}{mark}")
tot = sum(r["kb_full"] for r in man["photos"])
print(f"\nre-cropped: {sum(1 for _,_,_,o in report if 'crop' in o)}  rotated: {sum(1 for _,_,_,o in report if 'rot' in o)}")
print(f"full WebP total: {tot:.0f} KB")
