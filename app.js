/* ============================================================================
   Anjali's birthday site — behaviour
   Reads everything from data.js. No dependencies, no build step.
   ============================================================================ */
(function () {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ==========================================================================
     ENCRYPTED ASSETS
     The photographs and clips are AES-256-GCM encrypted in the repository, so
     the repo can be public while publishing nothing personal. The master key
     is never written down anywhere — it is wrapped once per accepted password
     with PBKDF2, so unlocking the page IS the decryption. Wrong password means
     the ciphertext stays ciphertext, even if someone fetches the raw files.
     ========================================================================== */
  const ASSET_CACHE = new Map();
  let META = null, MASTER = null;

  /* A remembered key is proven by decrypting one real asset (see initGate).
     Chosen from the manifest at runtime so it can never name a deleted file. */
  const verifyKey = () =>
    META.files["p01.thumb"] ? "p01.thumb" : Object.keys(META.files)[0];

  const subtle = (window.crypto && window.crypto.subtle) || null;
  const b64ToBytes = (s) => {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
  const b64FromBytes = (b) => {
    const u8 = b instanceof Uint8Array ? b : new Uint8Array(b);
    let s = "";
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  };
  const mimeFor = (key) => (key.endsWith(".mp4") ? "video/mp4" : "image/webp");

  async function loadMeta() {
    const res = await fetch("assets/crypto.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("cannot load assets/crypto.json");
    return (META = await res.json());
  }

  async function deriveKek(password) {
    const base = await subtle.importKey(
      "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return subtle.deriveKey(
      { name: "PBKDF2", salt: b64ToBytes(META.kdf.salt),
        iterations: META.kdf.iterations, hash: META.kdf.hash },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  }

  /* Returns { key, raw } for a correct password, or null for a wrong one.
     There is no separate password check: if the unwrap decrypts, it was right. */
  async function unlockWith(password) {
    if (!subtle || !META) return null;
    const kek = await deriveKek(password);
    for (const w of META.wraps) {
      try {
        const raw = await subtle.decrypt(
          { name: "AES-GCM", iv: b64ToBytes(w.iv) }, kek, b64ToBytes(w.ct));
        return { key: await subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]), raw };
      } catch (e) { /* not this password — try the next wrap */ }
    }
    return null;
  }

  const importMaster = (rawB64) =>
    subtle.importKey("raw", b64ToBytes(rawB64), "AES-GCM", false, ["decrypt"]);

  /* Decrypted object-URL for a logical key ("p01.thumb", "v2", …). Cached, and
     the promise is cached too so simultaneous requests share one fetch. */
  function assetURL(key) {
    if (ASSET_CACHE.has(key)) return ASSET_CACHE.get(key);
    const job = (async () => {
      const name = META && META.files[key];
      if (!name) throw new Error("unknown asset: " + key);
      const res = await fetch("assets/enc/" + name);
      if (!res.ok) throw new Error("fetch failed: " + name);
      const buf = new Uint8Array(await res.arrayBuffer());
      const plain = await subtle.decrypt(
        { name: "AES-GCM", iv: buf.subarray(0, 12) }, MASTER, buf.subarray(12));
      return URL.createObjectURL(new Blob([plain], { type: mimeFor(key) }));
    })();
    ASSET_CACHE.set(key, job);
    job.catch(() => ASSET_CACHE.delete(key));
    return job;
  }

  async function hydrateNode(n) {
    const key = n.dataset.asset || n.dataset.assetLazy;
    if (!key) return;
    try {
      const url = await assetURL(key);
      if (n.tagName === "VIDEO") {
        if (n.dataset.poster) n.poster = await assetURL(n.dataset.poster);
        n.src = url;
        n.load();
      } else {
        n.src = url;
      }
    } catch (e) {
      console.warn("asset failed:", key, e && e.message);
    }
    delete n.dataset.asset;
    delete n.dataset.assetLazy;
  }

  /* Fill every [data-asset] under `scope` (eager — used for thumbnails). */
  function hydrate(scope) {
    return Promise.all($$("[data-asset]", scope || document).map(hydrateNode));
  }

  /* ---------------------------------------------------------------- state */
  const now = () => new Date();
  const BIRTHDAY = new Date(CONFIG.BIRTHDAY);
  const SINCE = new Date(CONFIG.TOGETHER_SINCE);
  const isBirthday = () => now() >= BIRTHDAY;

  /* -------------------------------------------------- viewport trigger
     IntersectionObserver is the obvious tool here, but it silently fails to
     fire in some embedded/headless contexts — and a reveal that never fires
     leaves content invisible. A plain rect check on scroll works everywhere,
     so that's what we use for anything correctness-critical. */
  function onEnterViewport(nodes, cb, ratio) {
    const list = Array.from(nodes).filter(Boolean);
    if (!list.length) return;
    const r0 = ratio || 0.88;
    const run = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight || 1;
      for (let i = list.length - 1; i >= 0; i--) {
        const r = list[i].getBoundingClientRect();
        // "has entered the fold, or is already above it" — one-way, so content
        // can never end up permanently hidden if the user scrolls quickly past.
        if (r.top < vh * r0) { const n = list.splice(i, 1)[0]; cb(n); }
      }
      if (!list.length) {
        window.removeEventListener("scroll", run);
        window.removeEventListener("resize", run);
      }
    };
    // Deliberately NOT rAF-throttled: rAF does not fire in every embedded or
    // headless context, and a viewport trigger that silently never runs is a
    // far worse failure than a handful of cheap getBoundingClientRect calls.
    window.addEventListener("scroll", run, { passive: true });
    window.addEventListener("resize", run);
    run();
    setTimeout(run, 1200);
  }
  const inView = (node, ratio) => {
    if (!node) return false;
    const vh = window.innerHeight || document.documentElement.clientHeight || 1;
    const r = node.getBoundingClientRect();
    return r.top < vh * (ratio || 0.88) && r.bottom > 0;
  };

  /* Category for the gallery filter — every photo gets exactly one. */
  const CATS = [
    { key: "calls",     label: "On call",       ids: "p01 p06 p08 p09 p11 p12 p13 p15 p17 p20 p22 p23 p24 p27 p28 p29 p31 p32 p33 p40 p42".split(" ") },
    { key: "festivals", label: "Festivals",     ids: "p03 p07 p25 p35".split(" ") },
    { key: "outside",   label: "Out and about", ids: "p19 p26 p30 p38 p43 p44 p45".split(" ") },
    { key: "work",      label: "Your world",    ids: "p02 p14 p18 p34 p36 p41".split(" ") },
    { key: "us",        label: "The two of us", ids: "p05 p37".split(" ") },
    { key: "portraits", label: "Just you",      ids: "p10 p35 p04".split(" ") },
  ];
  const catOf = (id) => (CATS.find((c) => c.ids.includes(id)) || {}).key || "other";
  const ALL_IDS = Object.keys(PHOTOS);

  /* ==========================================================================
     FX — falling petals (gate) and confetti (celebration)
     ========================================================================== */
  function makeFX(canvas, opts) {
    if (!canvas || reduced) return { burst() {}, start() {}, stop() {} };
    const ctx = canvas.getContext("2d");
    let W, H, parts = [], raf = null, running = false;
    const COLORS = opts.colors || ["#f2b544", "#ffd47a", "#ff7fa3", "#ffa8c2", "#fff6e9"];

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = canvas.width = Math.max(1, r.width * dpr);
      H = canvas.height = Math.max(1, r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = r.width; H = r.height;
    }
    const rand = (a, b) => a + Math.random() * (b - a);

    function spawn(n, burst) {
      for (let i = 0; i < n; i++) {
        parts.push({
          x: burst ? W / 2 + rand(-70, 70) : rand(0, W),
          y: burst ? H * 0.42 : rand(-H * 0.3, -12),
          vx: burst ? rand(-5.5, 5.5) : rand(-0.5, 0.5),
          vy: burst ? rand(-11, -3) : rand(0.5, 1.7),
          s: rand(5, 12),
          rot: rand(0, 6.3), vr: rand(-0.09, 0.09),
          c: COLORS[(Math.random() * COLORS.length) | 0],
          petal: Math.random() > .45,
          life: burst ? rand(90, 190) : Infinity,
        });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      parts = parts.filter((p) => p.life > 0 && p.y < H + 60);
      for (const p of parts) {
        p.life--;
        p.vy += p.petal ? 0.012 : 0.24;
        p.vx *= 0.995;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.globalAlpha = p.life < 40 ? Math.max(0, p.life / 40) : 1;
        if (p.petal) {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s * 0.5, p.s * 0.26, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.62);
        }
        ctx.restore();
      }
      if (parts.length || running) raf = requestAnimationFrame(frame);
      else raf = null;
    }
    function ensure() { if (!raf) raf = requestAnimationFrame(frame); }
    window.addEventListener("resize", size);
    size();
    return {
      start(n) { running = true; size(); spawn(n || 26); ensure(); },
      burst(n) { size(); spawn(n || 130, true); ensure(); },
      stop() { running = false; },
    };
  }

  const gateFX = makeFX($("#gatePetals"), { colors: ["#ffd47a", "#ffa8c2", "#fff6e9"] });
  const siteFX = makeFX($("#fx"), {});

  /* ==========================================================================
     THE GATE
     ========================================================================== */
  function initGate() {
    const gate = $("#gate"), input = $("#gateInput"), err = $("#gateError"),
          form = $("#gateForm"), hint = $("#gateHint");
    const btn = $("#gateForm button");

    $("#gateName").textContent = CONFIG.her;
    hint.textContent = CONFIG.PASSWORD_HINT;

    if (!subtle) {
      err.textContent = "This browser can't decrypt the page. Try opening the link in Chrome or Safari.";
      return;
    }

    function reveal() {
      gate.classList.add("gate--out");
      document.body.classList.remove("locked");
      setTimeout(() => {
        gate.hidden = true;
        const site = $("#site");
        site.hidden = false;
        startSite();
        siteFX.burst(150);
      }, 700);
    }

    function fail(msg) {
      err.textContent = msg;
      gate.classList.remove("gate--shake");
      void gate.offsetWidth;
      gate.classList.add("gate--shake");
      if (input) input.select();
    }

    // Boot: fetch the crypto metadata, then honour a key remembered from earlier
    // in this browser session so a reload doesn't ask her again.
    (async () => {
      try {
        await loadMeta();
      } catch (e) {
        fail("Couldn't load the page's security data — check your connection and reload.");
        return;
      }

      let saved = null;
      try { saved = sessionStorage.getItem("anjali-key"); } catch (e) {}
      if (saved) {
        try {
          MASTER = await importMaster(saved);
          // A remembered key must be PROVEN, not assumed. importKey() happily
          // accepts any 32 bytes, so a key from before a re-key would unlock the
          // gate and then fail on every asset — an all-blank page. Decrypting one
          // real asset is the only honest check. (It caches, so no wasted fetch.)
          await assetURL(verifyKey());
          gate.hidden = true;
          document.body.classList.remove("locked");
          $("#site").hidden = false;
          startSite();
          return;
        } catch (e) {
          // Stale or corrupt — forget it and ask her properly.
          MASTER = null;
          try {
            sessionStorage.removeItem("anjali-key");
            sessionStorage.removeItem("anjali-unlocked");
          } catch (e2) {}
        }
      }

      document.body.classList.add("locked");
      gateFX.start(30);
      setTimeout(() => input && input.focus(), 500);
    })();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const typed = (input.value || "").trim().toLowerCase();
      if (!typed) return;
      if (btn) { btn.disabled = true; btn.textContent = "checking…"; }
      err.textContent = "";

      let got = null;
      try { got = await unlockWith(typed); } catch (e2) { got = null; }
      if (btn) { btn.disabled = false; btn.textContent = "Unlock"; }

      if (!got) { fail("Not quite — that's not one of the names Ayush calls you."); return; }

      MASTER = got.key;
      try {
        sessionStorage.setItem("anjali-key", b64FromBytes(got.raw));
        sessionStorage.setItem("anjali-unlocked", "1");
      } catch (e2) {}
      reveal();
    });
  }

  /* ==========================================================================
     HERO
     ========================================================================== */
  function initHero() {
    const bg = $("#heroBg");
    if (bg) {
      assetURL(HERO_PHOTO + ".full")
        .then((u) => { bg.style.backgroundImage = `url("${u}")`; })
        .catch(() => {});
    }
    $("#heroName").textContent = CONFIG.her;
    $("#cdName").textContent = CONFIG.her;

    const sub = $("#heroSub");
    if (isBirthday()) {
      $("#heroEyebrow").textContent = "24th September";
      sub.textContent = `${CONFIG.her}, it's your day. I built you a whole corner of the internet and filled it with three years and nine months of you.`;
    } else {
      $("#heroEyebrow").textContent = "Almost there…";
      sub.textContent = `Something is waiting for you here, ${CONFIG.her}. Come back at midnight.`;
    }

    // Garlands
    const g = $("#garland");
    for (let i = 0; i < 14; i++) g.appendChild(el("i"));

    // Ticker (duplicated so the loop is seamless)
    const track = $("#tickerTrack");
    const line = TICKER.map((t) => `<span>${t}</span>`).join("");
    track.innerHTML = line + line;
  }

  /* Countdown to her birthday, or nothing if it's already the day. */
  function initCountdown() {
    const box = $("#countdown");
    if (isBirthday()) { box.hidden = true; return; }
    box.hidden = false;
    const cells = [["days", "d"], ["hours", "h"], ["mins", "m"], ["secs", "s"]];
    const grid = $("#cdGrid");
    grid.innerHTML = cells.map(([k, l]) =>
      `<div class="cd-cell"><b id="cd-${k}">0</b><span>${l === "d" ? "days" : l === "h" ? "hours" : l === "m" ? "minutes" : "seconds"}</span></div>`).join("");
    const tick = () => {
      let ms = BIRTHDAY - now();
      if (ms <= 0) { box.hidden = true; location.reload(); return; }
      const s = Math.floor(ms / 1000);
      $("#cd-days").textContent = Math.floor(s / 86400);
      $("#cd-hours").textContent = String(Math.floor(s % 86400 / 3600)).padStart(2, "0");
      $("#cd-mins").textContent = String(Math.floor(s % 3600 / 60)).padStart(2, "0");
      $("#cd-secs").textContent = String(s % 60).padStart(2, "0");
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ==========================================================================
     THE COUNTER
     ========================================================================== */
  function initCounter() {
    const lead = $("#counterLead");
    lead.textContent =
      `We got together in December ${SINCE.getFullYear()}. Everything below has been ticking since — ` +
      `it updates while you're reading it.`;

    const grid = $("#yrs");
    grid.innerHTML = `
      <div class="yr-cell"><b id="c-years">0</b><span>years</span></div>
      <div class="yr-cell"><b id="c-months">0</b><span>months</span></div>
      <div class="yr-cell"><b id="c-days">0</b><span>days</span></div>
      <div class="yr-cell yr-cell--live"><b id="c-hours">0</b><span>hours</span></div>
      <div class="yr-cell yr-cell--live"><b id="c-mins">0</b><span>minutes</span></div>
      <div class="yr-cell yr-cell--live"><b id="c-secs">0</b><span>seconds</span></div>`;

    function tick() {
      const t = now();
      let y = t.getFullYear() - SINCE.getFullYear();
      let m = t.getMonth() - SINCE.getMonth();
      let d = t.getDate() - SINCE.getDate();
      if (d < 0) { m--; const pm = new Date(t.getFullYear(), t.getMonth(), 0).getDate(); d += pm; }
      if (m < 0) { y--; m += 12; }
      $("#c-years").textContent = y;
      $("#c-months").textContent = m;
      $("#c-days").textContent = d;
      $("#c-hours").textContent = String(t.getHours()).padStart(2, "0");
      $("#c-mins").textContent = String(t.getMinutes()).padStart(2, "0");
      $("#c-secs").textContent = String(t.getSeconds()).padStart(2, "0");

      const totalDays = Math.floor((t - SINCE) / 86400000);
      $("#yrsFine").textContent =
        `${totalDays.toLocaleString("en-IN")} days. And still counting — that's ${Math.floor(totalDays * 24).toLocaleString("en-IN")} hours of us.`;
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ==========================================================================
     GALLERY + LIGHTBOX
     ========================================================================== */
  let visible = ALL_IDS.slice();
  function initGallery() {
    const wrap = $("#masonry"), bar = $("#filters");

    const chips = [{ key: "all", label: "Everything" }].concat(CATS);
    bar.innerHTML = chips.map((c) =>
      `<button class="chip" type="button" data-cat="${c.key}" aria-pressed="${c.key === "all"}">${c.label}` +
      `<span style="opacity:.5"> ${c.key === "all" ? ALL_IDS.length : c.ids.length}</span></button>`).join("");

    function draw(cat) {
      const ids = cat === "all" ? ALL_IDS : (CATS.find((c) => c.key === cat) || { ids: [] }).ids;
      visible = ids;
      wrap.innerHTML = ids.map((id, i) => `
        <figure tabindex="0" role="button" data-id="${id}" data-i="${i}"
                aria-label="Photo ${i + 1}: ${(PHOTOS[id] || "").replace(/"/g, "&quot;")}">
          <img data-asset="${id}.thumb" alt="${(PHOTOS[id] || "").replace(/"/g, "&quot;")}" decoding="async">
          <figcaption>${PHOTOS[id] || ""}</figcaption>
        </figure>`).join("");
      hydrate(wrap);
    }
    draw("all");

    bar.addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      $$(".chip", bar).forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
      draw(b.dataset.cat);
    });

    wrap.addEventListener("click", (e) => {
      const f = e.target.closest("figure"); if (f) openLightbox(+f.dataset.i);
    });
    wrap.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const f = e.target.closest("figure"); if (!f) return;
      e.preventDefault(); openLightbox(+f.dataset.i);
    });

    // Any chapter image opens the lightbox too
    document.addEventListener("click", (e) => {
      const img = e.target.closest("[data-open]");
      if (!img) return;
      const id = img.dataset.open;
      const local = PHOTOS[id] ? ALL_IDS.indexOf(id) : -1;
      if (local > -1) { visible = ALL_IDS; openLightbox(local); }
    });
  }

  let lbIndex = 0;
  function openLightbox(i) {
    if (!visible.length) return;
    lbIndex = Math.max(0, Math.min(i, visible.length - 1));
    paintLightbox();
    const lb = $("#lightbox");
    lb.hidden = false;
    document.body.classList.add("locked");
  }
  function paintLightbox() {
    const id = visible[lbIndex];
    const img = $("#lbImg");
    img.removeAttribute("src");               // never show the previous photo
    img.alt = PHOTOS[id] || "";
    $("#lbCap").textContent = PHOTOS[id] || "";
    $("#lbCount").textContent = `${lbIndex + 1} of ${visible.length}`;
    // decrypt the full-size version on demand, and ignore it if she has moved on
    assetURL(id + ".full").then((u) => {
      if (visible[lbIndex] === id) img.src = u;
    }).catch(() => {});
  }
  function closeLightbox() {
    $("#lightbox").hidden = true;
    document.body.classList.remove("locked");
  }
  function step(d) {
    lbIndex = (lbIndex + d + visible.length) % visible.length;
    paintLightbox();
  }
  function initLightbox() {
    $("#lbClose").addEventListener("click", closeLightbox);
    $("#lbPrev").addEventListener("click", () => step(-1));
    $("#lbNext").addEventListener("click", () => step(1));
    $("#lightbox").addEventListener("click", (e) => {
      if (e.target.id === "lightbox") closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if ($("#lightbox").hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

  /* ==========================================================================
     VIDEO CLIPS
     ========================================================================== */
  function initClips() {
    const labels = {
      v1: "Walking in the garden",
      v2: "The little pose in the red kurta",
      v3: "Twirling on the path",
      v4: "Aarti, with everybody home",
    };
    $("#clips").innerHTML = Object.entries(labels).map(([v, label]) => `
      <div class="clip">
        <video data-asset-lazy="${v}" data-poster="${VIDEO_POSTERS[v]}.thumb"
               muted loop playsinline preload="none"></video>
        <span>${label}</span>
      </div>`).join("");

    // Decrypt each clip only once it comes into view, so the first load stays
    // light — the four clips together are the heaviest thing on the page.
    const vids = $$(".clip video");
    let playing = [];
    const wake = (v) => {
      const key = v.dataset.assetLazy;
      if (!key) return;
      hydrateNode(v).then(() => {
        v.play().catch(() => {});
        if (!playing.includes(v)) playing.push(v);
      });
    };
    onEnterViewport(vids, wake);

    // Belt and braces: whatever is on screen and still not decrypted gets
    // picked up within a few seconds, even if a scroll event was missed.
    setInterval(() => {
      vids.forEach((v) => {
        if (v.dataset.assetLazy && inView(v, 0.95)) wake(v);
      });
    }, 4000);

    // Pause anything that scrolls out of view (battery, and it stops the
    // browser juggling four decoders at once).
    window.addEventListener("scroll", () => {
      for (const v of playing) {
        if (v.readyState > 2) {
          if (inView(v, 1.05)) { if (v.paused) v.play().catch(() => {}); }
          else if (!v.paused) v.pause();
        }
      }
    }, { passive: true });
  }

  /* ==========================================================================
     KOLKATA — the bridge is generated rather than hand-drawn, so the cable
     curve and hangers actually line up.
     ========================================================================== */
  function initKolkata() {
    $("#kolTag").textContent = CONFIG.kolkata.tag;
    $("#kolWish").textContent = CONFIG.kolkata.bengaliWish;
    $("#kolRoman").textContent = CONFIG.kolkata.bengaliRoman;
    $("#kolMeaning").textContent = CONFIG.kolkata.bengaliMeaning;

    // marigolds (CSS circles, never emoji, so no tofu boxes)
    $("#kolMarigold").innerHTML = "<i></i>".repeat(9);

    /* --- Howrah-style suspension bridge silhouette --- */
    const W = 1200, H = 340, deckY = 246, towerTop = 74;
    const tA = 268, tB = 932, tw = 26;
    const cable = (t, p0, p1, p2) => {
      const u = 1 - t;
      return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
              u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
    };
    const mainP = [[tA, towerTop], [600, 300], [tB, towerTop]];

    let hangers = "";
    for (let i = 1; i < 15; i++) {
      const t = i / 15;
      const [x, y] = cable(t, mainP[0], mainP[1], mainP[2]);
      if (y < deckY) hangers += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${deckY}"/>`;
    }

    $("#kolkataBridge").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1b0e22"/><stop offset="100%" stop-color="#0e0713"/>
          </linearGradient>
        </defs>
        <!-- water line -->
        <rect x="0" y="${deckY + 22}" width="${W}" height="${H - deckY - 22}" fill="url(#bg1)" opacity=".85"/>
        <!-- deck -->
        <rect x="0" y="${deckY}" width="${W}" height="15" fill="url(#bg1)"/>
        <rect x="0" y="${deckY - 3}" width="${W}" height="3" fill="#c9962f" opacity=".38"/>
        <!-- towers -->
        <g fill="url(#bg1)">
          <rect x="${tA - tw / 2}" y="${towerTop}" width="${tw}" height="${deckY - towerTop + 40}"/>
          <rect x="${tB - tw / 2}" y="${towerTop}" width="${tw}" height="${deckY - towerTop + 40}"/>
        </g>
        <g stroke="#c9962f" stroke-width="1.5" opacity=".34" fill="none">
          <rect x="${tA - tw / 2}" y="${towerTop}" width="${tw}" height="${deckY - towerTop + 40}"/>
          <rect x="${tB - tw / 2}" y="${towerTop}" width="${tw}" height="${deckY - towerTop + 40}"/>
        </g>
        <!-- main cable + hangers -->
        <path d="M${tA},${towerTop} Q600,300 ${tB},${towerTop}" fill="none" stroke="#c9962f" stroke-width="3" opacity=".55"/>
        <g stroke="#c9962f" stroke-width="1.4" opacity=".38">${hangers}</g>
        <!-- side spans to the banks -->
        <path d="M28,150 Q150,84 ${tA},${towerTop}" fill="none" stroke="#c9962f" stroke-width="2.6" opacity=".45"/>
        <path d="M${tB},${towerTop} Q1050,84 1172,150" fill="none" stroke="#c9962f" stroke-width="2.6" opacity=".45"/>
        <!-- banks -->
        <path d="M0,${H} L0,206 L58,206 L58,${H} Z" fill="url(#bg1)"/>
        <path d="M1142,${H} L1142,206 L${W},206 L${W},${H} Z" fill="url(#bg1)"/>
      </svg>`;

    const box = $("#kolkataLights");
    const n = window.innerWidth < 700 ? 22 : 46;
    let html = "";
    for (let i = 0; i < n; i++) {
      html += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 40 + 52).toFixed(1)}%;` +
              `animation-delay:${(Math.random() * 3).toFixed(2)}s"></i>`;
    }
    box.innerHTML = html;
  }

  /* ==========================================================================
     STORY CHAPTERS
     ========================================================================== */
  function initChapters() {
    $("#chapters").innerHTML = STORY.map((c) => `
      <article class="chapter reveal">
        <p class="chapter__when">${c.when}</p>
        <h3 class="chapter__name">${c.chapter}</h3>
        <p class="chapter__text">${c.text}</p>
        <div class="chapter__photos">
          ${c.photos.map((id) => `<img data-asset="${id}.thumb" alt="${(PHOTOS[id] || "").replace(/"/g, "&quot;")}"
              data-open="${id}">`).join("")}
        </div>
      </article>`).join("");
    hydrate($("#chapters"));
  }

  /* ==========================================================================
     24 REASONS
     ========================================================================== */
  function initReasons() {
    $("#reasonsGrid").innerHTML = REASONS.map((r, i) => `
      <div class="rcard reveal" role="button" tabindex="0" aria-pressed="false" data-i="${i}">
        <div class="rcard__in">
          <div class="rcard__face rcard__front">
            <span class="rcard__num">${i + 1}</span>
            <span class="rcard__tap">tap to turn</span>
          </div>
          <div class="rcard__face rcard__back">${r}</div>
        </div>
      </div>`).join("");

    $("#reasonsFoot").textContent =
      `That's twenty-four. I could have kept going — I had to stop somewhere, and ${CONFIG.her} said the site should end eventually.`;

    const flip = (card) => card.setAttribute("aria-pressed", card.getAttribute("aria-pressed") !== "true");
    $("#reasonsGrid").addEventListener("click", (e) => {
      const c = e.target.closest(".rcard"); if (c) flip(c);
    });
    $("#reasonsGrid").addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const c = e.target.closest(".rcard"); if (!c) return;
      e.preventDefault(); flip(c);
    });
  }

  /* ==========================================================================
     THE LETTER — types itself out
     ========================================================================== */
  let letterTimer = null;
  function typeLetter() {
    const box = $("#letterBody");
    if (letterTimer) { clearTimeout(letterTimer); letterTimer = null; }
    box.innerHTML = "";

    const paras = LETTER.map((txt) => {
      const p = el("p");
      box.appendChild(p);
      return { p, chars: Array.from(txt) };
    });

    if (reduced) {
      paras.forEach(({ p, chars }) => { p.textContent = chars.join(""); });
      return;
    }

    const cursor = el("span", "cursor");
    let pi = 0, ci = 0;
    const put = () => { if (!cursor.isConnected) paras[pi].p.appendChild(cursor); };

    function step() {
      if (pi >= paras.length) { cursor.remove(); return; }
      const cur = paras[pi];
      if (ci === 0) put();
      if (ci >= cur.chars.length) {
        pi++; ci = 0;
        if (pi < paras.length) { paras[pi].p.appendChild(cursor); letterTimer = setTimeout(step, 520); }
        else { cursor.remove(); }
        return;
      }
      cur.p.textContent = cur.chars.slice(0, ++ci).join("");
      cur.p.appendChild(cursor);
      const ch = cur.chars[ci - 1];
      letterTimer = setTimeout(step, ch === "\n" ? 120 : 16 + Math.random() * 22);
    }
    step();
  }

  function initLetter() {
    $("#letterReplay").addEventListener("click", typeLetter);
    let done = false;
    onEnterViewport([$("#letter").querySelector(".letter")], () => {
      if (done) return;
      done = true;
      typeLetter();
    }, 0.75);
  }

  /* ==========================================================================
     ENVELOPES
     ========================================================================== */
  function initEnvelopes() {
    $("#envelopesGrid").innerHTML = ENVELOPES.map((e, i) => `
      <div class="env reveal" role="button" tabindex="0" aria-expanded="false" data-i="${i}">
        <div class="env__head">
          <span class="env__seal">🤍</span>
          <div>
            <p class="env__label">${e.label}</p>
            <p class="env__hint">tap to open</p>
          </div>
        </div>
        <div class="env__body"><p>${e.body}</p></div>
      </div>`).join("");

    const toggle = (n) => {
      const open = n.getAttribute("aria-expanded") === "true";
      n.setAttribute("aria-expanded", String(!open));
      const h = n.querySelector(".env__hint");
      if (h) h.textContent = !open ? "tap to close" : "tap to open";
      if (!open && !reduced) siteFX.burst(26);
    };
    $("#envelopesGrid").addEventListener("click", (e) => {
      const n = e.target.closest(".env"); if (n) toggle(n);
    });
    $("#envelopesGrid").addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const n = e.target.closest(".env"); if (!n) return;
      e.preventDefault(); toggle(n);
    });
  }

  /* ==========================================================================
     QUIZ
     ========================================================================== */
  function initQuiz() {
    let answered = 0, score = 0;
    const box = $("#quizBox");

    box.innerHTML = QUIZ.map((q, qi) => `
      <div class="q reveal">
        <p class="q__num">Question ${qi + 1} of ${QUIZ.length}</p>
        <p class="q__text">${q.q}</p>
        <div class="q__opts" data-q="${qi}">
          ${q.options.map((o, oi) => `<button class="opt" type="button" data-o="${oi}">${o}</button>`).join("")}
        </div>
        <p class="q__fb" role="status"></p>
      </div>`).join("") + `<p class="quiz__score" id="quizScore" hidden></p>`;

    box.addEventListener("click", (e) => {
      const btn = e.target.closest(".opt"); if (!btn) return;
      const set = btn.closest(".q__opts");
      if (set.dataset.done === "1") return;
      set.dataset.done = "1";

      const qi = +set.dataset.q, pick = +btn.dataset.o, q = QUIZ[qi];
      const right = q.correct === -1 ? true : pick === q.correct;

      $$(".opt", set).forEach((b, i) => {
        b.disabled = true;
        if (q.correct === -1) b.classList.add("opt--right");
        else if (i === q.correct) b.classList.add("opt--right");
        else if (i === pick) b.classList.add("opt--wrong");
      });
      set.parentElement.querySelector(".q__fb").textContent = right ? q.right : q.wrong;

      answered++; if (right) score++;
      if (q.correct === -1) score++;   // the last one can't be wrong

      if (answered === QUIZ.length) {
        const s = $("#quizScore");
        s.hidden = false;
        s.textContent = score >= QUIZ.length
          ? `${score} out of ${QUIZ.length}. You know us better than I do. Show-off. 🤍`
          : score >= QUIZ.length - 2
            ? `${score} out of ${QUIZ.length}. Good enough — you were there for most of it.`
            : `${score} out of ${QUIZ.length}. It's fine. I love you anyway. 🤍`;
        if (!reduced) siteFX.burst(90);
      }
    });
  }

  /* ==========================================================================
     THE CAKE
     ========================================================================== */
  function initCake() {
    const N = 7;
    const CANDLE_TOP = 166, CANDLE_BOT = 220;      // candles sit ON the top tier
    const TOP_TIER_Y = 206;
    const firstX = 104, step = 18.6;

    let candles = "";
    for (let i = 0; i < N; i++) {
      const x = (firstX + i * step).toFixed(1);
      const col = i % 2 ? "#ffa8c2" : "#ffd47a";
      candles += `
        <g class="candle">
          <rect x="${x - 3.2}" y="${CANDLE_TOP}" width="6.4" height="${CANDLE_BOT - CANDLE_TOP}" rx="2.6" fill="${col}"/>
          <rect x="${x - 3.2}" y="${CANDLE_TOP}" width="2.4" height="${CANDLE_BOT - CANDLE_TOP}" fill="rgba(255,255,255,.45)"/>
          <!-- wrapper carries the translate; the inner group carries the CSS
               animation, because a CSS transform REPLACES the transform
               attribute and would otherwise fling the flame to the origin -->
          <g transform="translate(${x},${CANDLE_TOP})">
            <circle class="flame-hit" data-f="${i}" cx="0" cy="-12" r="20" fill="transparent"/>
            <g class="flame" data-f="${i}">
              <ellipse cx="0" cy="-13" rx="6.4" ry="14" fill="#ff9c2e"/>
              <ellipse cx="0" cy="-12" rx="4.2" ry="10" fill="#ffd166"/>
              <ellipse cx="0" cy="-10" rx="2.1" ry="5.4" fill="#fffbe8"/>
            </g>
          </g>
        </g>`;
    }

    $("#cake").innerHTML = `
      <svg viewBox="0 0 320 300" role="img" aria-label="A birthday cake with ${N} candles">
        <ellipse cx="160" cy="288" rx="142" ry="12" fill="rgba(0,0,0,.5)"/>
        <!-- bottom tier -->
        <rect x="58" y="258" width="204" height="34" rx="12" fill="#efc9a3"/>
        <path d="M58,268 q25,16 51,0 q25,16 51,0 q25,16 51,0 q25,16 51,0 v8 H58 z" fill="#ff9ec0"/>
        <!-- top tier -->
        <rect x="80" y="${TOP_TIER_Y}" width="160" height="58" rx="12" fill="#f8dcbe"/>
        <rect x="80" y="${TOP_TIER_Y}" width="160" height="15" rx="7" fill="#fff3e4"/>
        <path d="M80,220 q20,15 40,0 q20,15 40,0 q20,15 40,0 q20,15 40,0 v7 H80 z" fill="#ffd47a"/>
        <!-- roshogolla dots on the bottom tier -->
        <circle cx="104" cy="276" r="5" fill="#fffdf7" stroke="#e2cba8"/>
        <circle cx="160" cy="277" r="5" fill="#fffdf7" stroke="#e2cba8"/>
        <circle cx="216" cy="276" r="5" fill="#fffdf7" stroke="#e2cba8"/>
        <!-- the age, on the cake -->
        <text x="160" y="252" text-anchor="middle" font-family="Playfair Display,Georgia,serif"
              font-size="23" fill="#c98a1e" opacity=".9">24</text>
        <text x="160" y="252" text-anchor="middle" font-family="Playfair Display,Georgia,serif"
              font-size="23" fill="none" stroke="#fff6e9" stroke-width=".4" opacity=".7">24</text>
        ${candles}
      </svg>`;

    let out = 0;
    const cake = $("#cake"), hint = $("#cakeHint");

    function killFlame(g) {
      if (!g || g.dataset.done === "1") return;
      g.dataset.done = "1";
      g.classList.add("flame--out");
      out++;
      if (out >= N) finish();
      else if (!reduced) siteFX.burst(14);
    }
    function finish() {
      hint.textContent = "all out 🤍";
      $("#wish").hidden = false;
      if (!reduced) siteFX.burst(190);
      $("#wishSub").textContent =
        `Whatever you just wished for — I want it too. Specially the CA thing. And the party.`;
    }

    cake.addEventListener("click", (e) => {
      const hit = e.target.closest(".flame");
      if (hit) { killFlame(hit); return; }
      const h = e.target.closest(".flame-hit");
      if (h) {
        const g = h.parentElement.querySelector(".flame");
        killFlame(g);
        return;
      }
      // tapping anywhere else on the cake blows them all out
      $$(".flame", cake).forEach(killFlame);
    });
  }

  /* ==========================================================================
     FINALE MESSAGE
     ========================================================================== */
  function initFinale() {
    $("#finaleTitle").textContent = `Happy birthday, ${CONFIG.her}`;
    $("#finaleMsg").innerHTML = `
      <p class="big">${CONFIG.her} — 24th September. Yours.</p>
      <p>I'm not there to hand you a cake, so this is what I had instead: forty-two photographs of you,
      four little films, three years and nine months of us, and a letter I actually meant.</p>
      <p>I hope this year is the year it all clicks into place — the CA, the work, everything you've been
      quietly working for while nobody was watching. And I hope I get to come and see you soon, because
      missing you is genuinely exhausting.</p>
      <p>Be happy today. Eat something sweet. Call me when you've read all of it.</p>
      <p class="big script" style="font-size:1.9rem;color:var(--gold-2)">Happy birthday, sonna. 🤍</p>`;
  }

  /* ==========================================================================
     PROGRESS + REVEAL
     ========================================================================== */
  function initProgress() {
    const bar = $("#progressBar");
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = max > 0 ? `${(h.scrollTop / max) * 100}%` : "0%";
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }

  function initReveal() {
    const nodes = $$(".reveal");
    // Anything already on screen comes in immediately; the rest as she scrolls.
    onEnterViewport(nodes, (n) => n.classList.add("in"));
    // Absolute safety net: never leave content invisible.
    setTimeout(() => nodes.forEach((n) => n.classList.add("in")), 9000);
  }

  /* ==========================================================================
     BOOT
     ========================================================================== */
  let started = false;
  function startSite() {
    if (started) return;
    started = true;
    initHero();
    initCountdown();
    initCounter();
    initGallery();
    initLightbox();
    initClips();
    initKolkata();
    initChapters();
    initReasons();
    initLetter();
    initEnvelopes();
    initQuiz();
    initCake();
    initFinale();
    initProgress();
    initReveal();

    // a gentle drift of petals over the whole page
    if (!reduced) {
      siteFX.start(18);
      setInterval(() => { if (!document.hidden) siteFX.start(10); }, 5200);
    }
  }

  initGate();
})();
