/* ══════════════════════════════════════════════════════════════
   game-pop.js — Palette Pop (2026-11-12), shared by the Words games
   Loaded by game.html after game-scorecard.js. window.BoohaPop.
   Colour + spectacle only: engines call it AFTER pairing / grading has
   already happened, so it can never change answers, scores or timing.
   ══════════════════════════════════════════════════════════════ */
(function () {
'use strict';
if (window.BoohaPop) return;
/* ══════════════════════════════════════════════════════════════
   PALETTE POP (2026-11-12)
   Colour + spectacle layer. It never changes pairs, grading, scoring or
   timing: the game calls it after each thing has already happened.
     tap(key, btn)   English tap: re-roll that card's colour and pop
     lock(key)       a pair lands: slot takes the colour, thump + clack
     unlock(key)     a pair is undone
     correct(el,key,combo) / wrong(el) / round(n)   the Check reveal
   One fixed canvas that only runs while something is flying; a fixed
   particle pool; tiers from BoohaMotion; at most 3 bright flashes a
   second (shared with flashWrong). Sounds are WebAudio on the shared
   BoohaSFX context, short, and quieter than the word clips.
   ══════════════════════════════════════════════════════════════ */
window.BoohaPop = (() => {
  const FALLBACK = ['#FFE600','#C6FF1A','#00FFC2','#22DDFF','#7DF9FF','#2E9BFF','#5B5CFF','#B266FF','#DC33FF','#F03CFF','#FF2288','#FF7AD9'];
  const colorOf = {};
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const BM = () => window.BoohaMotion || null;
  const reduced = () => { const m = BM(); return !!(m && m.reduced && m.reduced()); };
  const power = () => { const m = BM(); return (m && m.power && m.power()) || 'full'; };
  const light = () => document.documentElement.dataset.curriculum === 'pb';
  let pillSel = '.vt-score-pill';

  function palette() {
    const cs = getComputedStyle(document.documentElement), out = [];
    for (let i = 1; i <= 12; i++) { const v = cs.getPropertyValue('--pal-' + i).trim(); if (v) out.push(v); }
    return out.length >= 6 ? out : FALLBACK;
  }
  /* The higher-contrast of dark or white ink (every palette colour clears 4.5:1). */
  function lum(hex) {
    const h = String(hex).replace('#', ''); if (h.length !== 6) return 1;
    const c = [0, 2, 4].map(i => { const v = parseInt(h.substr(i, 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  const DARK_INK = '#2b1a05', DARK_L = lum(DARK_INK);
  function inkFor(hex) {
    const l = lum(hex), dark = (l + .05) / (DARK_L + .05), white = 1.05 / (l + .05);
    return dark >= white ? DARK_INK : '#ffffff';
  }
  function paint(el, key) { if (!el || !colorOf[key]) return; el.style.setProperty('--c', colorOf[key]); el.style.setProperty('--c-ink', inkFor(colorOf[key])); }

  /* ── colours ── */
  /* Different palette colours for a new set of items (keys or {_key}). */
  function newRound(items) {
    const p = palette().slice();
    items.forEach(c => { const k = typeof c === 'object' ? c._key : c; colorOf[k] = p.length ? p.splice(Math.floor(Math.random() * p.length), 1)[0] : pick(palette()); });
    prevOk = null;
  }
  const color = key => colorOf[key] || palette()[0];

  /* ── sound (shared context; silent until a tap has unlocked it) ── */
  let lastTink = 0;
  function ctx() { try { const S = window.BoohaSFX, c = S && S.context && S.context(); return c && c.state === 'running' ? c : null; } catch (_) { return null; } }
  let voices = 0; const MAX_VOICES = 10;   // grading can stack; never more than 10 layers at once
  const liveNodes = new Set();              // so reset() can stop sounds mid-flight
  const track = node => { voices++; liveNodes.add(node); node.onended = () => { voices--; liveNodes.delete(node); }; };
  function tone(c, type, f0, f1, t, dur, peak) {
    if (voices >= MAX_VOICES) return;
    const o = c.createOscillator(), g = c.createGain();
    track(o);
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .02);
  }
  function noise(c, t, dur, peak, freq, q, type) {
    if (voices >= MAX_VOICES) return;
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1; g.gain.value = peak;
    track(s);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
  const SFX = {
    pop() { const c = ctx(); if (!c) return; const t = c.currentTime + .005, f = pick(PENTA);
      tone(c, 'sine', f * .5, f, t, .06, .14); tone(c, 'triangle', f * 2, 0, t + .03, .06, .035); noise(c, t, .02, .08, 5000, 2); },
    lock() { const c = ctx(); if (!c) return; const t = c.currentTime + .005;
      tone(c, 'sine', 150, 52, t, .11, .32); noise(c, t, .018, .16, 2300, 5); noise(c, t + .038, .022, .14, 1600, 5); tone(c, 'square', 78, 0, t + .036, .035, .03); },
    unlock() { const c = ctx(); if (!c) return; const t = c.currentTime + .005; noise(c, t, .02, .1, 1500, 4); tone(c, 'sine', 220, 120, t, .07, .09); },
    sparkle(k) { const c = ctx(); if (!c) return; const t = c.currentTime + .05, b = 3 + Math.min(4, k);
      [0, 1, 2].forEach(i => tone(c, 'sine', PENTA[(b + i) % PENTA.length] * 2, 0, t + i * .035, .045, .035)); },
    note(step) { const c = ctx(); if (!c) return; const t = c.currentTime + .004, f = PENTA[Math.min(PENTA.length - 1, step % PENTA.length)] * (step >= PENTA.length ? 2 : 1);
      tone(c, 'triangle', f, 0, t, .09, .06); },
    tink() { const n = performance.now(); if (n - lastTink < 50) return; lastTink = n; const c = ctx(); if (!c) return; tone(c, 'sine', 2400 + Math.random() * 600, 0, c.currentTime + .003, .03, .03); },
    crunch() { const c = ctx(); if (!c) return; const t = c.currentTime + .005; noise(c, t, .12, .22, 700, .9); noise(c, t + .004, .03, .1, 5200, .7, 'highpass'); tone(c, 'square', 95, 48, t, .12, .04); },
    finale(n) { const c = ctx(); if (!c) return; const t = c.currentTime + .02;
      const notes = n >= 5 ? [523.25, 659.25, 783.99, 1046.5] : n >= 3 ? [523.25, 659.25, 783.99] : n >= 1 ? [523.25] : [];
      notes.forEach((f, i) => tone(c, 'triangle', f, 0, t + i * .045, .22, .07));
      if (n >= 5) noise(c, t + .05, .3, .05, 6000, .6); },
  };

  /* ── canvas, pooled particles ── */
  let cv = null, g = null, W = 0, H = 0, DPR = 1, raf = 0, last = 0;
  const POOL = 360, pool = []; for (let i = 0; i < POOL; i++) pool.push({ on: false });
  let cur = 0, live = 0, prevOk = null, pill = null, pillBumpAt = 0;
  const rings = [], texts = [], bolts = [], cracks = [];
  let tint = null;
  const cap = () => (power() === 'minimal' ? 50 : power() === 'reduced' ? 150 : POOL);
  /* Self-governor: if frames run slow while effects are flying (a busy
     older iPad), new bursts are halved until the frame time recovers.
     The big beats stay; only the number of pieces drops. */
  let slowAvg = 16, govern = 1;
  // Essential pieces (the answer's own sparks, score gems, debris) only follow
  // the device tier; decorative ones (confetti, smoke, tap gems) also follow
  // the governor and are the first to go when the pool fills up.
  const tierMul = () => (power() === 'minimal' ? .3 : power() === 'reduced' ? .55 : 1);
  const mul = deco => tierMul() * (deco ? govern : 1);
  /* Resolution: Retina-sharp (2×) while frames are healthy; the first time the
     governor trips, the canvas drops to 1× for the rest of the session (it is
     resized only between bursts, never mid-animation). Labels are DOM text,
     so they are always sharp. */
  let wantDPR = Math.min(2, window.devicePixelRatio || 1), pendingResize = false;
  const flashes = [];
  function canFlash() { const t = performance.now(); while (flashes.length && t - flashes[0] > 1000) flashes.shift(); if (flashes.length >= 3) return false; flashes.push(t); return true; }
  function ensureCanvas() {
    if (cv && cv.isConnected) return true;
    if (!document.body) return false;
    cv = document.createElement('canvas'); cv.className = 'bpop-fx'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:66';
    document.body.appendChild(cv); g = cv.getContext('2d'); size(); return !!g;
  }
  function size() {
    if (!cv) return;
    // Measured at 4× CPU throttle: a 2× canvas doubled the slow frames during
    // a Check reveal, 1× matched the game without effects. So 2× only while
    // the device keeps up (see wantDPR).
    W = innerWidth; H = innerHeight; DPR = power() === 'full' ? wantDPR : 1;
    pendingResize = false;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  addEventListener('resize', size);
  const glowCache = new Map();
  function glow(col) {
    if (glowCache.has(col)) return glowCache.get(col);
    const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'), gr = x.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.3, col); gr.addColorStop(1, col + '00');
    x.fillStyle = gr; x.fillRect(0, 0, 48, 48); glowCache.set(col, c); return c;
  }
  function spawn(p, deco) {
    if (reduced() || live >= cap() || !ensureCanvas()) return null;
    if (deco && (govern < 1 || live >= cap() * .6) && live >= cap() * .35) return null;   // decorative goes first
    for (let n = 0; n < POOL; n++) {
      const o = pool[cur]; cur = (cur + 1) % POOL;
      if (!o.on) { Object.assign(o, { on: true, vx: 0, vy: 0, g: 0, drag: 0, rot: 0, vr: 0, size: 3, life: .5, kind: 'spark', col: '#fff', home: null, delay: 0 }, p); o.max = o.life; live++; wake(); return o; }
    }
    return null;
  }
  const n = (k, deco) => Math.max(1, Math.round(k * mul(deco)));
  function edge(r) {
    const per = 2 * (r.width + r.height), s = Math.random() * per;
    if (s < r.width) return { x: r.left + s, y: r.top, nx: 0, ny: -1 };
    if (s < r.width + r.height) return { x: r.right, y: r.top + s - r.width, nx: 1, ny: 0 };
    if (s < 2 * r.width + r.height) return { x: r.right - (s - r.width - r.height), y: r.bottom, nx: 0, ny: 1 };
    return { x: r.left, y: r.bottom - (s - 2 * r.width - r.height), nx: -1, ny: 0 };
  }
  function sparks(r, k, col, speed = 1, white = 0) {
    for (let i = 0; i < n(k); i++) { const e = edge(r), sp = rnd(180, 460) * speed;
      spawn({ x: e.x, y: e.y, vx: (e.nx + rnd(-.6, .6)) * sp, vy: (e.ny + rnd(-.6, .6)) * sp - 40, g: 420, drag: 2.2, life: rnd(.22, .45), size: rnd(1.6, 2.8), col: i < white ? '#ffffff' : col }); }
  }
  function gems(r, k, col, home) {
    for (let i = 0; i < n(k, !home); i++) { const e = edge(r);
      spawn({ x: e.x, y: e.y, vx: (e.nx + rnd(-.8, .8)) * rnd(120, 300), vy: -rnd(160, 360), g: 900, drag: 1.2, life: home ? 1.6 : rnd(.5, .8), size: rnd(4, 6.5), rot: rnd(0, 6), vr: rnd(-12, 12), col, kind: 'gem', home, delay: home ? rnd(.16, .3) : 0 }, !home); }
  }
  function debris(r, k) {
    for (let i = 0; i < n(k); i++) { const e = edge(r), pts = [];
      for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2; pts.push([Math.cos(a) * rnd(.5, 1), Math.sin(a) * rnd(.5, 1)]); }
      spawn({ x: e.x, y: e.y, vx: (e.nx + rnd(-.7, .7)) * rnd(80, 260), vy: -rnd(60, 260), g: 1300, drag: .6, life: rnd(.6, .9), size: rnd(4, 9), rot: rnd(0, 6), vr: rnd(-14, 14), col: light() ? '#7a6a72' : pick(['#3a3442', '#4a4552', '#2a2530', '#5b5566']), kind: 'chunk', pts }); }
  }
  // keep = the smoke IS the feedback (a timeout): fewer pieces when slow, never dropped.
  function smoke(x, y, k, keep) { for (let i = 0; i < n(k, true); i++) spawn({ x: x + rnd(-10, 10), y: y + rnd(-6, 6), vx: rnd(-30, 30), vy: rnd(-60, -20), g: -20, drag: 1.5, life: rnd(.45, .75), size: rnd(6, 11), col: light() ? '#b9a9b2' : '#6f6a7a', kind: 'smoke' }, !keep); }
  // keep = the burst IS the feedback (a streak or round finale): fewer pieces when slow, never dropped.
  function confetti(x, y, k, spread, keep) { const P = palette();
    for (let i = 0; i < n(k, true); i++) { const a = rnd(-Math.PI, 0), sp = rnd(220, 620) * spread;
      spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 520, drag: 1.4, life: rnd(.9, 1.5), size: rnd(4, 8), rot: rnd(0, 6), vr: rnd(-16, 16), col: pick(P), kind: 'confetti' }, !keep); }
  }
  function ring(r, col, grow = 18, life = .32, width = 3) { if (reduced() || !ensureCanvas()) return; rings.push({ r, col, grow, life, t: 0, width }); wake(); }
  /* "+1" / "×3" labels are real text (always sharp on Retina), animated with
     transform/opacity only, and removed by a tracked timer. */
  const labels = new Set();
  function text(str, x, y, col, sz, life = .7, rise = 46) {
    if (reduced() || !document.body) return;
    const el = document.createElement('i');
    el.className = 'bpop-label'; el.setAttribute('aria-hidden', 'true'); el.textContent = str;
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:67;pointer-events:none;font:900 ${sz}px/1 ${titleFont || (titleFont = (getComputedStyle(document.documentElement).getPropertyValue('--game-font-title') || 'sans-serif').trim())};` +
      `color:${col};font-style:normal;white-space:nowrap;transform:translate(-50%,-50%);-webkit-text-stroke:${light() ? '4px #fff' : '4px #0a0612'};paint-order:stroke fill;`;
    document.body.appendChild(el); labels.add(el);
    if (el.animate) el.animate([
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.2)', opacity: 1, offset: .15 },
      { transform: `translate(-50%,calc(-50% - ${rise * .7}px)) scale(1.05)`, opacity: 1, offset: .7 },
      { transform: `translate(-50%,calc(-50% - ${rise}px)) scale(1)`, opacity: 0 },
    ], { duration: life * 1000, easing: 'ease-out', fill: 'forwards' });
    later(() => { el.remove(); labels.delete(el); }, life * 1000 + 40);
  }
  function bolt(a, b, cols) {
    if (reduced() || power() === 'minimal' || !ensureCanvas()) return;
    const out = Math.max(a.right, b.right) + rnd(14, 22);
    bolts.push({ pts: [{ x: a.right - 2, y: a.top + a.height / 2 }, { x: out, y: a.top + a.height / 2 }, { x: out, y: b.top + b.height / 2 }, { x: b.right - 2, y: b.top + b.height / 2 }], cols, t: 0, life: .3, jag: null, jt: 0 });
    wake();
  }
  function jag(pts, amp) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, st = Math.max(1, Math.round(len / 9));
      for (let s = 0; s < st; s++) { const t = s / st, o = s ? rnd(-amp, amp) : 0; out.push([a.x + dx * t - dy / len * o, a.y + dy * t + dx / len * o]); } }
    const l = pts[pts.length - 1]; out.push([l.x, l.y]); return out;
  }

  /* Every delayed effect goes through later(), so reset() can cancel it. */
  const timers = new Set();
  // One firing per event: a repeated call for the same target inside 250 ms is ignored.
  const lastFire = new Map();
  function once(tag, el) { const t = performance.now(), k = lastFire.get(tag); if (k && k.el === el && t - k.t < 250) return false; lastFire.set(tag, { el, t }); return true; }
  function later(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; }

  /* ── loop: runs only while something is on screen ── */
  function busy() { return live || rings.length || bolts.length || cracks.length || tint; }
  function wake() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function frame(t) {
    raf = 0;
    if (!busy()) { if (g) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); } if (pendingResize) size(); return; }
    raf = requestAnimationFrame(frame);
    if (last && t - last < (power() === 'minimal' ? 31 : 14)) return;
    const raw = last ? t - last : 16, dt = Math.min(.05, raw / 1000); last = t;
    slowAvg = slowAvg * .85 + Math.min(raw, 120) * .15;
    govern = slowAvg > 28 ? .5 : slowAvg < 20 ? 1 : govern;
    if (govern < 1 && wantDPR > 1) { wantDPR = 1; pendingResize = true; }   // drop to 1× once, between bursts
    step(dt); draw();
  }
  function step(dt) {
    for (const p of pool) {
      if (!p.on) continue;
      p.life -= dt; if (p.life <= 0) { p.on = false; live--; continue; }
      if (p.home && p.delay <= 0 && pill) {
        const dx = pill.x - p.x, dy = pill.y - p.y, d = Math.hypot(dx, dy) || 1, pull = 2600 + (1.6 - p.life) * 4000;
        p.vx += dx / d * pull * dt; p.vy += dy / d * pull * dt; p.vx *= Math.pow(.02, dt); p.vy *= Math.pow(.02, dt);
        if (d < 18) { p.on = false; live--; SFX.tink(); bumpPill(); continue; }
      } else {
        if (p.home) p.delay -= dt;
        p.vy += p.g * dt; const k = Math.pow(1 / (1 + p.drag), dt); p.vx *= k; p.vy *= k;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.kind === 'smoke') p.size += dt * 16;
      if (p.kind === 'confetti') p.vx += Math.sin(p.rot * 2) * 40 * dt;
    }
    for (const arr of [rings, texts, bolts, cracks]) for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt; if (arr[i].t > arr[i].life) arr.splice(i, 1); }
    if (tint) { tint.t += dt; if (tint.t > tint.life) tint = null; }
  }
  function bumpPill() {
    const el = document.querySelector(pillSel), now = performance.now();
    if (!el || !el.animate || now - pillBumpAt < 90) return; pillBumpAt = now;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 150, easing: 'ease-out' });
  }
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  let titleFont = null;
  function draw() {
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
    const add = light() ? 'source-over' : 'lighter';
    if (tint) { g.globalAlpha = .18 * Math.sin(Math.PI * tint.t / tint.life); g.fillStyle = tint.col; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    for (const r of rings) { const q = r.t / r.life, inf = 4 + q * r.grow, b = r.r; g.globalAlpha = 1 - q; g.strokeStyle = r.col; g.lineWidth = r.width * (1 - q) + .5; rr(b.left - inf, b.top - inf, b.width + inf * 2, b.height + inf * 2, 16 + inf); g.stroke(); }
    g.globalAlpha = 1; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const c of cracks) { const q = c.t / c.life; g.globalAlpha = 1 - q * q; g.strokeStyle = light() ? '#3a2a30' : '#f2eee6'; g.lineWidth = 1.6;
      g.beginPath(); let x = c.x, y = c.y; g.moveTo(x, y); const L = c.len * Math.min(1, q * 5) / 3;
      for (const s of c.segs) { x -= (c.nx + s * c.ny) * L; y -= (c.ny + s * c.nx) * L; g.lineTo(x, y); } g.stroke(); }
    g.globalAlpha = 1; g.globalCompositeOperation = add;
    for (const b of bolts) {
      b.jt -= .016; if (!b.jag || b.jt <= 0) { b.jag = jag(b.pts, 5); b.jt = .033; }
      const q = b.t / b.life;
      g.beginPath(); b.jag.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
      g.strokeStyle = b.cols[0]; g.lineWidth = 7; g.globalAlpha = (1 - q) * .35; g.stroke();
      g.globalAlpha = 1 - q; g.strokeStyle = light() ? b.cols[0] : '#ffffff'; g.lineWidth = 2; g.stroke();
    }
    g.globalAlpha = 1;
    for (const p of pool) {
      if (!p.on) continue; const q = Math.max(0, Math.min(1, p.life / p.max));
      if (p.kind === 'spark') { g.globalAlpha = q; g.strokeStyle = p.col; g.lineWidth = p.size; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); g.stroke(); }
      else if (p.kind === 'gem') {
        g.globalAlpha = p.home ? 1 : Math.min(1, q * 2); const s = p.size;
        if (!light() && power() === 'full') g.drawImage(glow(p.col), p.x - s * 2.2, p.y - s * 2.2, s * 4.4, s * 4.4);
        g.save(); g.globalCompositeOperation = 'source-over'; g.translate(p.x, p.y); g.rotate(p.rot);
        g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .7, 0); g.lineTo(0, s); g.lineTo(-s * .7, 0); g.closePath(); g.fillStyle = p.col; g.fill();
        g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .7, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = 'rgba(255,255,255,.65)'; g.fill();
        if (light()) { g.strokeStyle = 'rgba(60,20,40,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .7, 0); g.lineTo(0, s); g.lineTo(-s * .7, 0); g.closePath(); g.stroke(); }
        g.restore();
      }
    }
    g.globalCompositeOperation = 'source-over';
    for (const p of pool) {
      if (!p.on) continue; const q = Math.max(0, Math.min(1, p.life / p.max));
      if (p.kind === 'chunk') { g.globalAlpha = Math.min(1, q * 2); g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath(); p.pts.forEach(([x, y], i) => i ? g.lineTo(x * p.size, y * p.size) : g.moveTo(x * p.size, y * p.size)); g.closePath(); g.fillStyle = p.col; g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke(); g.restore(); }
      else if (p.kind === 'smoke') { g.globalAlpha = q * .45; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill(); }
      else if (p.kind === 'confetti') { g.globalAlpha = Math.min(1, q * 2); g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.abs(Math.cos(p.rot * 1.5)) + .15); g.fillStyle = p.col; g.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66); g.restore(); }
    }
    g.globalAlpha = 1;
    if (!titleFont) titleFont = (getComputedStyle(document.documentElement).getPropertyValue('--game-font-title') || 'sans-serif').trim();
    for (const tx of texts) {
      const q = tx.t / tx.life, pop = q < .15 ? .6 + q / .15 * .6 : 1.2 - Math.min(.2, (q - .15) * .6), y = tx.y - tx.rise * Math.sqrt(q);
      g.save(); g.translate(tx.x, y); g.scale(pop, pop); g.globalAlpha = q > .7 ? (1 - q) / .3 : 1;
      g.font = `900 ${tx.size}px ${titleFont}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 5; g.strokeStyle = light() ? '#ffffff' : '#0a0612'; g.strokeText(tx.str, 0, 0); g.fillStyle = tx.col; g.fillText(tx.str, 0, 0);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  /* ── cleanup: restart, close, hide, back/forward cache ── */
  function reset() {
    if (raf) cancelAnimationFrame(raf); raf = 0; last = 0;
    timers.forEach(clearTimeout); timers.clear();
    for (const p of pool) p.on = false; live = 0;
    lastFire.clear();
    rings.length = 0; texts.length = 0; bolts.length = 0; cracks.length = 0; tint = null; prevOk = null;
    labels.forEach(el => el.remove()); labels.clear();
    liveNodes.forEach(node => { try { node.onended = null; node.stop(); } catch (_) {} }); liveNodes.clear(); voices = 0;
    if (g && cv) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); }
  }
  addEventListener('pagehide', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });

  /* ── events from the game ── */
  return {
    newRound, color, paint, canFlash, inkFor, palette, reset,
    init(opts = {}) { if (opts.pill) pillSel = opts.pill; },
    stats() { return { live, rings: rings.length, labels: labels.size, bolts: bolts.length, cracks: cracks.length, running: !!raf, voices, timers: timers.size, govern, dpr: DPR }; },
    tap(key, btn, quiet) {
      const prev = colorOf[key], p = palette().filter(c => c !== prev);
      colorOf[key] = pick(p.length ? p : palette());
      paint(btn, key);
      if (!quiet) SFX.pop();   // Spell the Word plays its own landing note instead
      if (!btn) return;
      if (btn.animate && !reduced()) btn.animate([{ transform: 'scale(1)' }, { transform: `scale(1.12) rotate(${rnd(-3, 3).toFixed(1)}deg)`, offset: .3 }, { transform: 'scale(.97)', offset: .65 }, { transform: 'scale(1.04)' }], { duration: 260, easing: 'ease-out' });
      const r = btn.getBoundingClientRect(), c = colorOf[key];
      ring(r, c, 16, .3, 3); sparks(r, 18, c, .9, 3); gems(r, 5, c, null);
    },
    lock(slot, key) {
      SFX.lock();
      if (!slot) return;
      if (slot.animate && !reduced()) slot.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(.97)', offset: .45 }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
      const r = slot.getBoundingClientRect(), c = color(key);
      ring(r, c, 10, .22, 4); sparks(r, 10, c, .7, 2);
    },
    unlock(slot) {
      SFX.unlock();
      if (!slot) return; const r = slot.getBoundingClientRect(); smoke(r.right - 10, r.top + r.height / 2, 3);
    },
    correct(el, key, combo) {
      const c = color(key), r = el.getBoundingClientRect(), k = Math.max(1, combo || 1);
      const pr = document.querySelector(pillSel); if (pr) { const b = pr.getBoundingClientRect(); pill = { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
      SFX.sparkle(k);
      ring(r, c, 22 + Math.min(5, k) * 4, .36, 4); ring(r, '#ffffff', 10, .2, 2);
      sparks(r, 26 + Math.min(5, k) * 6, c, 1 + Math.min(5, k) * .08, 8);
      gems(r, 6 + Math.min(5, k), c, 'pill');
      text('+1', r.right - 34, r.top + 6, c, 30 + Math.min(5, k) * 2);
      if (prevOk && prevOk.isConnected) bolt(prevOk.getBoundingClientRect(), r, [c, '#ffffff']);
      prevOk = el;
    },
    wrong(el) {
      prevOk = null;
      const r = el.getBoundingClientRect();
      SFX.crunch();
      debris(r, 16); smoke(r.left + r.width * .75, r.top + r.height * .5, 7);
      if (!reduced() && ensureCanvas()) { for (let i = 0; i < 4; i++) { const e = edge(r); cracks.push({ x: e.x, y: e.y, nx: e.nx, ny: e.ny, len: rnd(16, 30), t: 0, life: .5, segs: [rnd(-.6, .6), rnd(-.6, .6), rnd(-.6, .6)] }); } wake(); }
    },
    /* ── Spell the Word: letters ──────────────────────────────── */
    // A tapped tile lands in its slot: thump + clack + a note that climbs
    // with each letter, and a colour ring on the slot ("placed", not "right").
    place(slot, key, step) {
      SFX.lock(); SFX.note(step || 0);
      if (!slot) return;
      if (slot.animate && !reduced()) slot.animate([{ transform: 'scale(1.18) translateY(-6px)' }, { transform: 'scale(.94)', offset: .5 }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
      const r = slot.getBoundingClientRect(), c = color(key);
      ring(r, c, 8, .22, 3); sparks(r, 6, c, .55, 1);
    },
    // A correct word: each letter bursts in its own colour as it turns green
    // (on the game's own stagger), gems fly to the score, then the word rings.
    spell(slots, keys, combo, stagger, board) {
      const pr = document.querySelector(pillSel); if (pr) { const b = pr.getBoundingClientRect(); pill = { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
      const k = Math.max(1, combo || 1), list = Array.from(slots || []);
      list.forEach((el, i) => later(() => {
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect(), c = color(keys[i]);
        sparks(r, 7, c, .8, 2); gems(r, 1 + (i % 2), c, 'pill'); SFX.note(i + 2);
      }, i * (stagger || 55)));
      later(() => {
        const host = board && board.isConnected ? board : list[list.length - 1];
        if (!host) return;
        const r = host.getBoundingClientRect(), c = color(keys[keys.length - 1]);
        SFX.sparkle(k);
        ring(r, c, 18 + Math.min(5, k) * 3, .38, 4); ring(r, '#ffffff', 8, .22, 2);
        text('+1', r.right - 10, r.top - 4, c, 30 + Math.min(5, k) * 2);
        if (k >= 2) text('×' + k, r.right - 52, r.top - 8, '#ffffff', 20, .6, 30);
        confetti(r.left + r.width / 2, r.top, 10 + Math.min(5, k) * 4, .7);
      }, list.length * (stagger || 55) + 20);
    },
    // A wrong try: the crunch once, then the wrong letters crumble on the
    // game's own stagger. Right letters are left alone (they stay anchored).
    misspell(slots, isRight, stagger) {
      prevOk = null;
      SFX.crunch();
      Array.from(slots || []).forEach((el, i) => {
        if (isRight && isRight(el, i)) return;
        later(() => {
          if (!el.isConnected) return;
          const r = el.getBoundingClientRect();
          debris(r, 5); smoke(r.left + r.width / 2, r.top, 2);
          if (!reduced() && ensureCanvas()) { const e = edge(r); cracks.push({ x: e.x, y: e.y, nx: e.nx, ny: e.ny, len: rnd(10, 18), t: 0, life: .45, segs: [rnd(-.6, .6), rnd(-.6, .6), rnd(-.6, .6)] }); wake(); }
        }, i * (stagger || 50));
      });
    },
    // Time ran out: the timer bar smokes and fizzles (a miss, never a prize).
    fizzle(el) {
      if (!once('fizzle', el)) return;
      prevOk = null;
      SFX.unlock();
      if (!el) return;
      const r = el.getBoundingClientRect();
      for (let i = 0; i < 5; i++) smoke(r.left + r.width * (i + .5) / 5, r.top + r.height / 2, 1, true);
      sparks(r, 6, light() ? '#9a8a92' : '#8d8a99', .5);
    },
    round(score, board, total = 5) {
      if (!once('round', board)) return;
      prevOk = null;
      score = Math.round(score / Math.max(1, total) * 5);   // finale sized on a 0–5 scale
      SFX.finale(score);
      if (!board) return;
      const r = board.getBoundingClientRect(), cx = r.left + r.width / 2;
      if (score >= 5) {
        if (!reduced() && canFlash()) { tint = { col: pick(palette()), t: 0, life: .32 }; ensureCanvas() && wake(); }
        confetti(cx, r.top + r.height * .45, 80, 1.15, true); confetti(r.left + r.width * .2, r.bottom, 26, .9); confetti(r.right - r.width * .2, r.bottom, 26, .9);
        ring(r, pick(palette()), 30, .45, 6); ring(r, '#ffffff', 14, .3, 3);
      } else if (score >= 3) { confetti(cx, r.top + r.height * .5, 50, .9, true); ring(r, pick(palette()), 18, .35, 4); }
      else if (score >= 1) confetti(cx, r.top + r.height * .5, 16, .6, true);
      else smoke(cx, r.top + r.height * .5, 10, true);
    },
  };
})();

})();
