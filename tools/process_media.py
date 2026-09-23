#!/usr/bin/env python3
"""
Process Anjali's birthday media into web-ready assets.

  * drops exact duplicates
  * writes a full-size WebP (max 1100px) + a thumbnail WebP (max 520px)
  * records everything in a manifest for the site build

Source: ~/.hermes/cache/images/*.jpg   (WhatsApp-compressed originals)
Out:    <project>/assets/photo/*.webp  +  <project>/assets/video/*.mp4
"""
import glob, hashlib, json, os, shutil, subprocess, sys
from PIL import Image, ImageOps

SRC_IMG = os.path.expanduser("~/.hermes/cache/images")
SRC_VID = os.path.expanduser("~/.hermes/cache/documents")
PROJ = "/home/ayush/anjali-birthday"
OUT_FULL = f"{PROJ}/assets/photo/full"
OUT_THUMB = f"{PROJ}/assets/photo/thumb"
OUT_VID = f"{PROJ}/assets/video"
for d in (OUT_FULL, OUT_THUMB, OUT_VID):
    os.makedirs(d, exist_ok=True)

# ---- images: dedupe + convert ----
files = sorted(glob.glob(f"{SRC_IMG}/*.jpg"))
seen, kept, dropped = {}, [], []
for f in files:
    h = hashlib.md5(open(f, "rb").read()).hexdigest()
    if h in seen:
        dropped.append((os.path.basename(f), seen[h]))
        continue
    seen[h] = os.path.basename(f)
    kept.append(f)

manifest = []
for i, f in enumerate(kept, 1):
    pid = f"p{i:02d}"
    im = Image.open(f)
    im = ImageOps.exif_transpose(im).convert("RGB")
    w, h = im.size

    full = im.copy()
    full.thumbnail((1100, 1100), Image.LANCZOS)
    full.save(f"{OUT_FULL}/{pid}.webp", "WEBP", quality=82, method=6)

    th = im.copy()
    th.thumbnail((520, 520), Image.LANCZOS)
    th.save(f"{OUT_THUMB}/{pid}.webp", "WEBP", quality=78, method=6)

    manifest.append({
        "id": pid,
        "src": os.path.basename(f),
        "w": w, "h": h,
        "portrait": h > w,
        "full": f"assets/photo/full/{pid}.webp",
        "thumb": f"assets/photo/thumb/{pid}.webp",
        "kb_full": round(os.path.getsize(f"{OUT_FULL}/{pid}.webp") / 1024, 1),
    })

# ---- videos: remux to progressive-download MP4 (already H.264/yuv420p) ----
# No re-encode: the WhatsApp originals are already browser-compatible H.264.
# We just add faststart (so they begin playing before fully downloaded) and
# drop the audio track, because the site autoplays these muted.
vids = []
for i, v in enumerate(sorted(glob.glob(f"{SRC_VID}/vid_*.mp4")), 1):
    vid = f"v{i}"
    out = f"{OUT_VID}/{vid}.mp4"
    subprocess.run([
        "ffmpeg", "-v", "error", "-i", v,
        "-c:v", "copy", "-an",
        "-movflags", "+faststart",
        out, "-y",
    ], check=True)
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                            "format=duration", "-of", "csv=p=0", v],
                           capture_output=True, text=True).stdout.strip()
    vids.append({
        "id": vid, "src": os.path.basename(v),
        "path": f"assets/video/{vid}.mp4",
        "dur": round(float(probe or 0), 1),
        "kb": round(os.path.getsize(out) / 1024),
    })

json.dump({"photos": manifest, "videos": vids}, open(f"{PROJ}/assets/manifest.json", "w"), indent=1)

print(f"photos kept: {len(manifest)}   duplicates dropped: {len(dropped)}")
for d, orig in dropped:
    print(f"   dropped {d}  (same as {orig})")
tot = sum(m["kb_full"] for m in manifest)
print(f"full-size WebP total: {tot:.0f} KB  (avg {tot/len(manifest):.0f} KB)")
thumb_tot = sum(os.path.getsize(os.path.join(OUT_THUMB, m["id"] + ".webp")) for m in manifest) / 1024
print(f"thumb WebP total: {thumb_tot:.0f} KB")
print("\nvideos:")
for v in vids:
    print(f"   {v['id']}  {v['dur']}s  {v['kb']} KB  <- {v['src']}")
print("\nmanifest ->", f"{PROJ}/assets/manifest.json")
