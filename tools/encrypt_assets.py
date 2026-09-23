#!/usr/bin/env python3
"""
Encrypt the personal media so it can live in a public repository safely.

Why: Render (free/static, no GitHub App) can only build from a PUBLIC repo, and
these are private photos of a real person. Encrypting them means the repository
can be public without publishing anything, and the live site's assets are
undecryptable without the password — which the on-page gate alone could not
achieve, since anyone could fetch /assets/photo/full/x.webp directly.

Design
------
* One random 32-byte master key (K) encrypts every asset with AES-256-GCM.
* K is wrapped once per accepted password, with a key derived from that
  password via PBKDF2-SHA256. The master key itself is never written down.
* Each encrypted file is  nonce(12) || ciphertext+tag.
* assets/crypto.json holds the KDF parameters, the wrapped keys and the file map.

Run:  python3 tools/encrypt_assets.py
Then commit assets/enc/ and assets/crypto.json (assets/photo and assets/video
are gitignored).
"""
import base64
import json
import os
import secrets
import sys

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    sys.exit("Needs the 'cryptography' package:  pip install cryptography")

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(PROJ, "assets", "enc")
ITERS = 250_000
SALT_LEN = 16
NONCE_LEN = 12

# Passwords are NOT stored in this file on purpose — this repo is public, and a
# list of candidate passwords would make the wrapped key trivially brute-forced.
# Supply them at build time instead, either as a comma-separated env var:
#
#   ANJALI_PASSWORDS='golu,sonna,sona,baby,darlo,babu,jaan' \
#     python3 tools/encrypt_assets.py
#
# or in a local, git-ignored file `tools/.passwords` (one per line).
def load_passwords():
    env = os.environ.get("ANJALI_PASSWORDS", "").strip()
    if env:
        return [p.strip() for p in env.split(",") if p.strip()]
    local = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".passwords")
    if os.path.isfile(local):
        with open(local) as fh:
            return [l.strip() for l in fh if l.strip() and not l.startswith("#")]
    sys.exit("No passwords supplied. Set ANJALI_PASSWORDS or create tools/.passwords")


def b64(b):
    return base64.b64encode(b).decode()


def derive(password: str, salt: bytes) -> bytes:
    """PBKDF2-SHA256, 32 bytes. Mirrors the WebCrypto call in app.js."""
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITERS)
    return kdf.derive(password.encode("utf-8"))


def encrypt_bytes(key: bytes, data: bytes) -> bytes:
    nonce = secrets.token_bytes(NONCE_LEN)
    return nonce + AESGCM(key).encrypt(nonce, data, None)


def main():
    # ---- collect the assets to protect -------------------------------------
    jobs = []  # (logical key, source path)
    pdir = os.path.join(PROJ, "assets", "photo")
    for size in ("thumb", "full"):
        d = os.path.join(pdir, size)
        if not os.path.isdir(d):
            sys.exit(f"missing {d} — run tools/process_media.py first")
        for f in sorted(os.listdir(d)):
            if f.endswith(".webp"):
                jobs.append((f"{os.path.splitext(f)[0]}.{size}", os.path.join(d, f)))
    vdir = os.path.join(PROJ, "assets", "video")
    for f in sorted(os.listdir(vdir)):
        if f.endswith(".mp4"):
            jobs.append((os.path.splitext(f)[0], os.path.join(vdir, f)))

    if not jobs:
        sys.exit("nothing to encrypt")

    # ---- master key + wrapped copies ---------------------------------------
    passwords = load_passwords()
    master = secrets.token_bytes(32)
    salt = secrets.token_bytes(SALT_LEN)
    wraps = []
    for pw in passwords:
        wkey = derive(pw, salt)
        nonce = secrets.token_bytes(NONCE_LEN)
        ct = AESGCM(wkey).encrypt(nonce, master, None)
        wraps.append({"iv": b64(nonce), "ct": b64(ct)})

    os.makedirs(OUT, exist_ok=True)
    files = {}
    total_in = total_out = 0
    for key, path in jobs:
        data = open(path, "rb").read()
        blob = encrypt_bytes(master, data)
        name = key.replace(".", "_") + ".bin"
        with open(os.path.join(OUT, name), "wb") as fh:
            fh.write(blob)
        files[key] = name
        total_in += len(data)
        total_out += len(blob)

    meta = {
        "v": 1,
        "note": ("Assets are AES-256-GCM encrypted. The master key is wrapped once "
                 "per accepted password with PBKDF2-SHA256; it is not stored in "
                 "plaintext anywhere."),
        "kdf": {"name": "PBKDF2", "hash": "SHA-256", "iterations": ITERS, "salt": b64(salt)},
        "wraps": wraps,
        "files": files,
    }
    with open(os.path.join(PROJ, "assets", "crypto.json"), "w") as fh:
        json.dump(meta, fh, indent=1)

    print(f"encrypted {len(jobs)} assets  ({total_in/1024/1024:.1f} MB -> {total_out/1024/1024:.1f} MB)")
    print(f"wrapped the master key for {len(wraps)} accepted passwords")
    print(f"output: assets/enc/  ({len(os.listdir(OUT))} files) + assets/crypto.json")

    # sanity: decrypt one back and compare
    k = f"{jobs[0][0]}"
    blob = open(os.path.join(OUT, files[k]), "rb").read()
    back = AESGCM(master).decrypt(blob[:NONCE_LEN], blob[NONCE_LEN:], None)
    orig = open(jobs[0][1], "rb").read()
    print("round-trip check:", "OK" if back == orig else "FAILED")


if __name__ == "__main__":
    main()
