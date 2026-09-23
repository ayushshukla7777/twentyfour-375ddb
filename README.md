# Twenty-four — 24th September

A private birthday site. Not a template, not a card — a small hand-built corner of
the internet with 42 photographs, four films, a live counter, an interactive cake and
a letter.

**The media in this repository is encrypted** (see [Privacy](#privacy)), which is why
the repo itself is safe to be public. The plaintext photos and videos are git-ignored
and never leave the machine they were prepared on.

## What's on the page

A password gate, then, in order:

1. **Hero** — her name, a live countdown that flips to a celebration at midnight IST
2. **Us, by the numbers** — a counter ticking up in real time since the day they got together
3. **Gallery** — all 42 photographs, filterable, with an individual caption written for each one
4. **The moving ones** — four short clips, playing only while on screen
5. **Kolkata** — a generated suspension-bridge silhouette, a Bengali birthday wish, marigolds
6. **Our story, in chapters** — six chapters, each anchored to real photos
7. **Twenty-four reasons** — 24 flip cards, one per year
8. **A note from Ayush** — his own words, typed out live on screen
9. **Open when…** — seven sealed notes for days that aren't her birthday
10. **How well do you know us?** — a six-question quiz
11. **Make a wish** — seven candles to blow out, then confetti

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell and section markup |
| `styles.css` | All styling — Kolkata-at-night palette, responsive, no framework |
| `data.js` | **All content**: config, captions, story, reasons, envelopes, quiz, the letter |
| `app.js` | Behaviour: gate, counters, gallery, lightbox, cake, quiz, animations |
| `assets/photo/` | 41 photos, WebP in `full/` (1100px) and `thumb/` (520px) |
| `assets/video/` | 4 clips, remuxed H.264 with `+faststart` |
| `assets/manifest.json` | Inventory of the media as first built (snapshot — the live site doesn't read it) |
| `tools/` | The scripts used to prepare the media (kept for reproducibility) |

## Changing anything

Everything a person would want to edit is in `data.js`:

- `CONFIG.TOGETHER_SINCE` — **the live counter reads straight from this**
- `CONFIG.PASSWORDS` — what can be typed at the gate
- `PHOTOS` — the caption for each photo, keyed by id
- `LETTER` — Ayush's message, verbatim
- `REASONS`, `STORY`, `ENVELOPES`, `QUIZ`, `TICKER` — the rest of the content

No build step. Open `index.html` through any static server:

```bash
python3 -m http.server 8000
```

## Media pipeline

`tools/` documents how the originals became web assets:

- `process_media.py` — dedupes, writes WebP at two sizes, remuxes the videos
- `refine_media.py` — rotates the two sideways photos, crops phone UI
- `recrop.py` — the final, deeper crop of the video-call screenshots

Video-call screenshots had their status bar, call name-label and call-button row cropped
off so they read as photographs rather than screenshots.

## Privacy

The photographs and clips are **AES-256-GCM encrypted** (`assets/enc/`,
described by `assets/crypto.json`). That's why this repository can be public
without publishing anything personal:

- The master key is not stored anywhere. It is wrapped once per accepted
  password using PBKDF2-SHA256 (250,000 iterations), so unlocking the page in
  the browser *is* the decryption.
- Fetching `assets/enc/p02_thumb.bin` directly gets you ciphertext, not a photo.
- The password list is deliberately **not** in this repo — `tools/encrypt_assets.py`
  reads it from `ANJALI_PASSWORDS` or a git-ignored `tools/.passwords`, because a
  published list of candidates would make the wrapped key trivial to crack.
- `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` keeps it
  out of search engines.
- The site URL is deliberately neutral and unguessable.

Honest limits: the accepted passwords are short pet names, so someone who obtains
`crypto.json` *and* the password list could brute-force it offline. The encryption
defends against repo browsing, direct asset URLs, search engines and casual
visitors — not against a determined attacker with the password list.

## Deploying

Render static site. No build command; publish directory `/`.
