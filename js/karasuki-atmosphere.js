
/* ═══════════════════════════════════════════════════════════
   KARASUKI — ATMOSPHERE ENGINE  (rev 2)
   Data: js/karasuki-atmos-data.js  (window.KARASUKI_ATMOS)
   Load order: karasuki-atmos-data.js → karasuki-atmosphere.js → karasuki.js

   rev 2 fixes a sprite-cache bug in rev 1: the cache key included
   the draw size, which varies continuously per particle per frame,
   so every mote minted a fresh offscreen canvas every frame
   (~3,700/sec on desktop) and the Map never evicted. Sprites are
   now baked once per colour at a reference radius and scaled at
   draw time. Fog and cloud no longer rebuild gradients per frame.

   Public API:
     KarasukiAtmos.init(stageEl)
     KarasukiAtmos.setRoom(roomId, observerRoomId)
     KarasukiAtmos.refreshVitality()
   Dev:
     b_4120()   toggle the performance readout
   ═══════════════════════════════════════════════════════════ */

window.KarasukiAtmos = (() => {
  'use strict';

  const CFG = window.KARASUKI_ATMOS;
  if (!CFG) { console.warn('[atmos] KARASUKI_ATMOS missing — atmosphere disabled.');
    return { init(){}, setRoom(){}, refreshVitality(){} }; }

  const WORLD_W = 1536;
  const WORLD_H = 1024;

  /* Backing-store scale for the atmosphere canvas.
     1.0 = 1536x1024. Everything here is soft gradients, so if an
     older machine still struggles, drop this to 0.75 or 0.5 —
     fill cost falls with the square and you will not see it. */
  const ATMOS_SCALE = 1.0;

  const IS_PHONE = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 768;
  const REDUCED  = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let canvas = null, ctx = null, rafId = 0, running = false;
  let roomId = null, room = null, observerRoom = null;

  const S = {
    vit: 0, baseline: 0, weekly: 0,
    wind: 0.24, windTarget: 0.24, gust: 0, hush: 0,
    camX: 0, camY: 0, flash: 0, tier: -1
  };

  /* ═══════════════ vitality ═══════════════ */
  function readSave() {
    try { const raw = localStorage.getItem('booha_save'); return raw ? JSON.parse(raw) : null; }
    catch (_) { return null; }
  }
  function computeVitality() {
    const d = readSave();
    const stars = (d && d.meta && typeof d.meta.allTimeStars === 'number') ? d.meta.allTimeStars : 0;
    const cg    = d && d.weekly && d.weekly.completedGames;
    const games = (cg && typeof cg === 'object') ? Object.keys(cg).length : 0;
    S.baseline = 0.45 * Math.min(1, stars / 27);
    S.weekly   = 0.55 * Math.min(1, games / 9);
    const next = Math.max(0, Math.min(1, S.baseline + S.weekly));
    const tier = tierOf(next);
    if (S.tier >= 0 && tier > S.tier) bloomMoment();
    S.tier = tier;
    S.vit  = next;
  }
  function tierOf(v) {
    const T = CFG.thresholds;
    if (v >= T.deep)   return 5;
    if (v >= T.secret) return 4;
    if (v >= T.life)   return 3;
    if (v >= T.flies)  return 2;
    if (v >= T.motes)  return 1;
    return 0;
  }

  /* ═══════════════ sprite cache ═══════════════
     Keyed by COLOUR + PROFILE only — never by size.
     Baked once at REF_R and scaled by drawImage at draw time,
     so the cache tops out at roughly two entries per colour.  */
  const REF_R   = 96;
  const sprites = new Map();

  function sprite(col, kind) {
    const key = col[0] + ',' + col[1] + ',' + col[2] + '|' + kind;
    let c = sprites.get(key);
    if (c) return c;
    const s = REF_R * 2;
    c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(REF_R, REF_R, 0, REF_R, REF_R, REF_R);
    if (kind === 'soft') {                       // fog / cloud: gentler falloff
      grd.addColorStop(0,    `rgba(${col[0]},${col[1]},${col[2]},1)`);
      grd.addColorStop(0.55, `rgba(${col[0]},${col[1]},${col[2]},0.45)`);
      grd.addColorStop(1,    `rgba(${col[0]},${col[1]},${col[2]},0)`);
    } else {                                     // glow: tight hot core
      grd.addColorStop(0,    `rgba(${col[0]},${col[1]},${col[2]},1)`);
      grd.addColorStop(0.35, `rgba(${col[0]},${col[1]},${col[2]},0.42)`);
      grd.addColorStop(1,    `rgba(${col[0]},${col[1]},${col[2]},0)`);
    }
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    sprites.set(key, c);
    return c;
  }

  function blit(x, y, col, size, alpha) {
    if (alpha <= 0.004 || size <= 0) return;
    ctx.globalAlpha = alpha > 1 ? 1 : alpha;
    ctx.drawImage(sprite(col, 'glow'), x - size, y - size, size * 2, size * 2);
    ctx.globalAlpha = 1;
  }
  function blitEllipse(cx, cy, rx, ry, col, alpha) {
    if (alpha <= 0.004 || rx <= 0 || ry <= 0) return;
    ctx.globalAlpha = alpha > 1 ? 1 : alpha;
    ctx.drawImage(sprite(col, 'soft'), cx - rx, cy - ry, rx * 2, ry * 2);
    ctx.globalAlpha = 1;
  }

  /* ═══════════════ particles ═══════════════ */
  let parts = [];
  function preset() { return CFG.presets[room.preset] || CFG.presets.dust; }
  function targetCount() {
    const base = IS_PHONE ? 10 + S.vit * 74 : 14 + S.vit * 108;
    return Math.floor(base * preset().dens);
  }
  function depthAt(y) { return 0.45 + (y / WORLD_H) * 0.95; }
  function newPart(fromEdge) {
    const p = preset();
    const y = fromEdge ? (p.rise ? WORLD_H + 12 : -12) : Math.random() * WORLD_H;
    return {
      x: Math.random() * (WORLD_W + 160) - 80, y,
      r: p.size[0] + Math.random() * (p.size[1] - p.size[0]),
      col: p.cols[(Math.random() * p.cols.length) | 0],
      vy: (p.rise ? -1 : 1) * (p.fall * 0.5 + Math.random() * p.fall * 0.5),
      phase: Math.random() * 6.283, rot: Math.random() * 6.283,
      spin: (Math.random() * 2 - 1) * 2,
      a: 0, aMax: 0.30 + Math.random() * 0.55,
      mem: false, mt: 0
    };
  }
  function reseed() { parts = []; const n = targetCount(); for (let i = 0; i < n; i++) parts.push(newPart(false)); }

  function updateParts(dt) {
    const p = preset(), want = targetCount();
    if (parts.length < want) for (let i = parts.length; i < want; i++) parts.push(newPart(true));
    if (parts.length > want) parts.length = want;
    const windNow = (S.wind + S.gust) * 40, damp = 1 - S.hush * 0.7;
    const lx = room.pathLight[0], ly = room.pathLight[1];
    const memOn = S.vit >= CFG.thresholds.life;
    for (const q of parts) {
      if (memOn && !q.mem && Math.random() < 0.00035 * dt * 60) { q.mem = true; q.mt = 0; }
      if (q.mem) {
        q.mt += dt;
        const dx = lx - q.x, dy = ly - q.y, d = Math.hypot(dx, dy) || 1;
        q.x += (dx / d) * 52 * dt; q.y += (dy / d) * 52 * dt;
        q.a = Math.max(0, q.aMax * (1 - q.mt / 5.5));
        if (d < 30 || q.mt > 5.5) Object.assign(q, newPart(true));
        continue;
      }
      const dep = depthAt(q.y);
      q.phase += dt * 1.2 * damp;
      q.y += q.vy * dep * dt * damp;
      q.x += (Math.sin(q.phase) * p.sway * 0.02 + windNow * 0.02) * damp * 60 * dt * dep;
      q.rot += q.spin * dt;
      if (q.a < q.aMax) q.a = Math.min(q.aMax, q.a + dt * 0.8);
      if (p.rise) { if (q.y < -24) Object.assign(q, newPart(true)); }
      else        { if (q.y > WORLD_H + 24) Object.assign(q, newPart(true)); }
      if (q.x < -90) q.x = WORLD_W + 80;
      if (q.x > WORLD_W + 90) q.x = -80;
    }
  }
  function drawParts() {
    const p = preset(), bright = 0.34 + S.vit * 0.66;
    for (const q of parts) {
      const dep = depthAt(q.y), a = q.a * bright * (1 - S.hush * 0.5);
      if (a <= 0.01) continue;
      const r = q.r * dep;
      if (q.mem) { blit(q.x, q.y, [236, 240, 225], r * 4.6, a * 1.15); continue; }
      if (p.glow) blit(q.x, q.y, q.col, r * 3.4, a);
      else {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        ctx.fillStyle = `rgba(${q.col[0]},${q.col[1]},${q.col[2]},${a})`;
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      }
    }
  }

  /* ═══════════════ fireflies ═══════════════ */
  let flies = [];
  function initFlies() {
    flies = [];
    const per = IS_PHONE ? 5 : 7;
    for (const z of (room.flyZones || [])) {
      for (let i = 0; i < per; i++) {
        const key = room.flyPalette[(Math.random() * room.flyPalette.length) | 0];
        flies.push({
          x: z[0] + Math.random() * z[2], y: z[1] + Math.random() * z[3],
          col: CFG.flyColors[key] || CFG.flyColors.teal,
          blink: Math.random() * 6.283, sp: 0.3 + Math.random() * 0.5,
          drift: Math.random() * 6.283
        });
      }
    }
  }
  function drawFlies(dt) {
    if (S.vit < CFG.thresholds.flies) return;
    const ramp = Math.min(1, (S.vit - CFG.thresholds.flies) / 0.25);
    for (const f of flies) {
      f.drift += dt * 0.4; f.blink += dt * (0.6 + f.sp);
      f.x += Math.cos(f.drift) * 7 * dt + (S.wind + S.gust) * 10 * dt;
      f.y += Math.sin(f.drift * 0.7) * 5 * dt;
      let pulse = Math.sin(f.blink) * 0.5 + 0.5;
      if (S.flash > 0) pulse = Math.max(pulse, S.flash);
      blit(f.x, f.y, f.col, (2 + pulse * 2.4) * 4, pulse * pulse * 0.95 * ramp);
    }
  }

  /* ═══════════════ fog / cloud / breath ═══════════════ */
  const FOG_COL = [190, 208, 214], CLOUD_COL = [0, 0, 0];
  const fogBands = [
    { x: 0.10, y: 0.30, sp: 0.008, rx: 0.60, ry: 0.10 },
    { x: 0.60, y: 0.24, sp: 0.005, rx: 0.50, ry: 0.08 },
    { x: 0.30, y: 0.56, sp: 0.011, rx: 0.55, ry: 0.13 }
  ];
  function drawFog(dt) {
    const amt = room.fog || 0; if (amt <= 0) return;
    for (const f of fogBands) {
      f.x += dt * f.sp * (1 + (S.wind + S.gust));
      if (f.x > 1.5) f.x = -0.6;
      blitEllipse(f.x * WORLD_W, f.y * WORLD_H, WORLD_W * f.rx, WORLD_H * f.ry, FOG_COL, 0.085 * amt);
    }
  }
  const cloud = { x: -0.5 };
  function drawCloud(dt) {
    const amt = room.cloud || 0; if (amt <= 0) return;
    cloud.x += dt * 0.016; if (cloud.x > 1.5) cloud.x = -0.6 - Math.random();
    blitEllipse(cloud.x * WORLD_W, WORLD_H * 0.42, WORLD_W * 0.6, WORLD_H * 0.55, CLOUD_COL, 0.26 * amt);
  }
  function drawBreath(now) {
    const pulse = Math.sin(now * 0.0006) * 0.5 + 0.5;
    blit(room.pathLight[0], room.pathLight[1], [214, 228, 238], 560,
         (0.030 + pulse * 0.040) * (0.35 + S.vit * 0.9));
  }
  function drawHush() {
    if (S.hush <= 0.01) return;
    ctx.fillStyle = `rgba(4,8,14,${S.hush * 0.20})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  /* ═══════════════ bloom moment ═══════════════ */
  let shower = [];
  function bloomMoment() {
    S.flash = 1;
    shower = Array.from({ length: 30 }, () => ({
      x: Math.random() * WORLD_W, y: -Math.random() * WORLD_H * 0.4,
      v: 90 + Math.random() * 170, r: 1.4 + Math.random() * 2.4, a: 0.7 + Math.random() * 0.3
    }));
  }
  function updateShower(dt) {
    S.flash = Math.max(0, S.flash - dt * 0.55);
    for (const s of shower) { s.y += s.v * dt; s.a -= dt * 0.30; }
    shower = shower.filter(s => s.a > 0.02 && s.y < WORLD_H + 24);
  }
  function drawShower() { for (const s of shower) blit(s.x, s.y, [255, 238, 206], s.r * 5.5, s.a * 0.8); }

  /* ═══════════════ rare events ═══════════════ */
  let active = null;
  const sched = { timer: 6 };

  function allowed() {
    const T = CFG.thresholds, out = {};
    if (S.vit < T.life) return out;
    const ev = room.events || {};
    for (const k in ev) {
      if (k === 'observer') {
        if (S.vit < T.deep) continue;
        if (roomId === observerRoom) continue;
        out[k] = ev[k]; continue;
      }
      if ((k === 'hush' || k === 'crow') && S.vit < T.deep) continue;
      out[k] = ev[k];
    }
    if (S.vit >= T.secret && room.signature) out.signature = 3.5;
    return out;
  }
  function pick() {
    const a = allowed(), keys = Object.keys(a);
    if (!keys.length) return null;
    let t = 0; for (const k of keys) t += a[k];
    let r = Math.random() * t;
    for (const k of keys) { r -= a[k]; if (r <= 0) return k; }
    return keys[0];
  }
  function fire(name) {
    if (name === 'gust') { S.gust = 1.15; S.windTarget = Math.min(0.95, S.wind + 0.55); return; }
    if (name === 'hush') { hushStage = 1; hushT = 0; return; }
    if (active) return;
    if (name === 'signature') { active = makeSignature(room.signature); return; }
    active = name === 'moth'      ? new Flyer(true)
           : name === 'butterfly' ? new Flyer(false)
           : name === 'critter'   ? new Critter()
           : name === 'crow'      ? new Crow()
           : name === 'observer'  ? new Glint()
           : null;
  }
  function updateSched(dt) {
    if (active) return;
    sched.timer -= dt;
    if (sched.timer <= 0) { const p = pick(); if (p) fire(p); sched.timer = 9 + Math.random() * 13; }
  }

  function Flyer(isMoth) {
    this.moth = isMoth;
    this.dir  = Math.random() < 0.5 ? 1 : -1;
    this.x    = this.dir > 0 ? -40 : WORLD_W + 40;
    this.y    = 260 + Math.random() * 300;
    this.t = 0; this.life = 0; this.dur = (isMoth ? 9 : 11) + Math.random() * 4;
    this.flap = 0; this.sp = (WORLD_W + 80) / this.dur;
    this.col = isMoth ? [232, 226, 206] : (Math.random() < 0.5 ? [244, 182, 206] : [236, 214, 150]);
  }
  Flyer.prototype.update = function (dt) {
    this.life += dt; this.t += dt;
    this.x += this.dir * this.sp * dt;
    this.y += Math.sin(this.t * (this.moth ? 3.2 : 1.6)) * (this.moth ? 34 : 26) * dt;
    if (this.moth) this.y += Math.sin(this.t * 7.3) * 11 * dt;
    this.flap += dt * (this.moth ? 19 : 14);
    if (this.life > this.dur) active = null;
  };
  Flyer.prototype.draw = function () {
    const fi = Math.min(1, this.life / 1.2), fo = Math.min(1, (this.dur - this.life) / 1.2);
    const a = Math.max(0, Math.min(fi, fo)) * 0.9;
    const w = (this.moth ? 7 : 8) + Math.abs(Math.sin(this.flap)) * (this.moth ? 6 : 9);
    if (this.moth) blit(this.x, this.y, [240, 236, 214], 20, a * 0.30);
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.fillStyle = `rgba(${this.col[0]},${this.col[1]},${this.col[2]},${a})`;
    ctx.beginPath(); ctx.ellipse(-4, 0, w, this.moth ? 7 : 9, 0.4, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, 0, w, this.moth ? 7 : 9, -0.4, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(18,18,22,${a})`; ctx.fillRect(-1.5, -7, 3, 14);
    ctx.restore();
  };

  function Critter() {
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.y   = 620 + Math.random() * 130;
    this.x   = this.dir > 0 ? -30 : WORLD_W + 30;
    this.sp  = (WORLD_W + 60) / 0.62;
    this.hop = 0;
  }
  Critter.prototype.update = function (dt) {
    this.hop += dt * 22; this.x += this.dir * this.sp * dt;
    if ((this.dir > 0 && this.x > WORLD_W + 30) || (this.dir < 0 && this.x < -30)) active = null;
  };
  Critter.prototype.draw = function () {
    const bob = Math.abs(Math.sin(this.hop)) * 6;
    ctx.save(); ctx.translate(this.x, this.y - bob);
    ctx.fillStyle = 'rgba(2,4,5,.94)';
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(this.dir * 11, -4, 4.5, 4, 0, 0, 6.283); ctx.fill();
    ctx.fillRect(-this.dir * 12, -1.5, 9, 3);
    ctx.restore();
  };

  function Crow() {
    this.x = WORLD_W * (0.24 + Math.random() * 0.5);
    this.y = 300 + Math.random() * 200;
    this.life = 0; this.turn = 0; this.hopY = 0; this.a = 0;
  }
  Crow.prototype.update = function (dt) {
    this.life += dt;
    this.a = this.life < 1 ? this.life : (this.life > 6 ? Math.max(0, 7 - this.life) : 1);
    if (this.life > 1.8 && this.life < 2.6) this.turn = Math.min(1, this.turn + dt * 3);
    if (this.life > 3.4 && this.life < 3.7) this.hopY = -7; else this.hopY += (0 - this.hopY) * Math.min(1, dt * 8);
    if (this.life > 7) active = null;
  };
  Crow.prototype.draw = function () {
    ctx.save(); ctx.translate(this.x, this.y + this.hopY); ctx.globalAlpha = this.a;
    ctx.fillStyle = '#04060a';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 9, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-25, 5); ctx.lineTo(-9, 7); ctx.closePath(); ctx.fill();
    const hx = 11 + this.turn * 4;
    ctx.beginPath(); ctx.arc(hx, -8, 5.5, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 5, -8); ctx.lineTo(hx + 14 + this.turn * 4, -6); ctx.lineTo(hx + 5, -4.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(232,170,90,${this.a * 0.85})`;
    ctx.beginPath(); ctx.arc(hx + 2, -9, 1.1, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1; ctx.restore();
  };

  function Glint() {
    const left = Math.random() < 0.5;
    this.x = left ? 90 + Math.random() * 240 : WORLD_W - 330 + Math.random() * 240;
    this.y = 220 + Math.random() * 240;
    this.gap = 11 + Math.random() * 5;
    this.life = 0; this.dur = 3.4; this.a = 0;
  }
  Glint.prototype.update = function (dt) {
    this.life += dt;
    const t = this.life;
    this.a = t < 0.9 ? t / 0.9 : (t > this.dur - 1.0 ? Math.max(0, (this.dur - t) / 1.0) : 1);
    if (t > 1.9 && t < 2.06) this.a *= 0.06;
    if (this.life > this.dur) active = null;
  };
  Glint.prototype.draw = function () {
    const a = this.a * 0.92;
    blit(this.x - this.gap, this.y, [255, 178, 84], 13, a * 0.75);
    blit(this.x + this.gap, this.y, [255, 178, 84], 13, a * 0.75);
    ctx.fillStyle = `rgba(255,208,140,${a})`;
    ctx.beginPath(); ctx.ellipse(this.x - this.gap, this.y, 2.8, 2.0, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(this.x + this.gap, this.y, 2.8, 2.0, 0, 0, 6.283); ctx.fill();
  };

  /* ═══════════════ silence beat ═══════════════ */
  let hushStage = 0, hushT = 0;
  function updateHush(dt) {
    if (hushStage === 0) { S.hush += (0 - S.hush) * Math.min(1, dt * 3); return; }
    hushT += dt;
    if (hushStage === 1) { S.hush = Math.min(1, S.hush + dt * 2.5); if (hushT > 2.6) hushStage = 2; }
    else if (hushStage === 2) { if (hushT > 3.4) hushStage = 3; }
    else { S.hush = Math.max(0, S.hush - dt * 0.5); if (S.hush <= 0.01) hushStage = 0; }
  }

  /* ═══════════════ signature events ═══════════════ */
  function makeSignature(s) {
    switch (s.type) {
      case 'glowPulse': return new SigGlow(s);
      case 'wisp':      return new SigWisp(s);
      case 'darkShape': return new SigShape(s);
      case 'sparkle':   return new SigSparkle(s);
      case 'orbit':     return new SigOrbit(s);
      case 'emberRise': return new SigEmber(s);
      case 'sway':      return new SigSway(s);
      default:          return null;
    }
  }
  function SigGlow(s) { this.s = s; this.life = 0; this.dur = 4.2; }
  SigGlow.prototype.update = function (dt) { this.life += dt; if (this.life > this.dur) active = null; };
  SigGlow.prototype.draw = function () {
    const env = Math.sin(Math.min(1, this.life / this.dur) * Math.PI);
    const fl  = 0.55 + 0.45 * Math.sin(this.life * 7.5);
    for (const p of this.s.points) blit(p[0], p[1], this.s.color, this.s.radius, env * fl * 0.62);
  };

  function SigWisp(s) { this.s = s; this.life = 0; this.dur = 5.4; }
  SigWisp.prototype.update = function (dt) { this.life += dt; if (this.life > this.dur) active = null; };
  SigWisp.prototype.draw = function () {
    const t = Math.min(1, this.life / this.dur), e = t * t * (3 - 2 * t);
    const x = this.s.from[0] + (this.s.to[0] - this.s.from[0]) * e;
    const y = this.s.from[1] + (this.s.to[1] - this.s.from[1]) * e + Math.sin(this.life * 2.4) * 8;
    const a = Math.sin(t * Math.PI);
    blit(x, y, this.s.color, 30, a * 0.85);
    blit(x, y, [255, 255, 255], 9, a * 0.55);
  };

  function SigShape(s) { this.s = s; this.life = 0; this.dur = 1.6; }
  SigShape.prototype.update = function (dt) { this.life += dt; if (this.life > this.dur) active = null; };
  SigShape.prototype.draw = function () {
    const t = Math.min(1, this.life / this.dur);
    const x = this.s.from[0] + (this.s.to[0] - this.s.from[0]) * t;
    const y = this.s.from[1] + (this.s.to[1] - this.s.from[1]) * t;
    ctx.fillStyle = `rgba(0,0,0,${Math.sin(t * Math.PI) * 0.9})`;
    ctx.beginPath(); ctx.ellipse(x, y, this.s.size, this.s.size * 1.45, 0, 0, 6.283); ctx.fill();
  };

  function SigSparkle(s) {
    this.s = s; this.life = 0; this.dur = 3.0;
    this.bits = Array.from({ length: 16 }, () => ({
      a: Math.random() * 6.283, sp: 18 + Math.random() * 46, r: 1 + Math.random() * 2
    }));
  }
  SigSparkle.prototype.update = function (dt) { this.life += dt; if (this.life > this.dur) active = null; };
  SigSparkle.prototype.draw = function () {
    const t = this.life / this.dur;
    for (const b of this.bits) {
      const d = b.sp * this.life;
      blit(this.s.at[0] + Math.cos(b.a) * d,
           this.s.at[1] + Math.sin(b.a) * d * 0.7 + this.life * 13,
           this.s.color, b.r * 5, Math.max(0, 1 - t) * 0.75);
    }
  };

  function SigOrbit(s) { this.s = s; this.life = 0; this.dur = 6.5; this.flap = 0; }
  SigOrbit.prototype.update = function (dt) { this.life += dt; this.flap += dt * 18; if (this.life > this.dur) active = null; };
  SigOrbit.prototype.draw = function () {
    const t = this.life / this.dur, ang = this.life * 2.2, rr = this.s.r * (1 - t * 0.55);
    const x = this.s.at[0] + Math.cos(ang) * rr, y = this.s.at[1] + Math.sin(ang) * rr * 0.6;
    const a = (t < 0.15 ? t / 0.15 : (t > 0.8 ? Math.max(0, (1 - t) / 0.2) : 1)) * 0.95;
    blit(x, y, [240, 232, 206], 16, a * 0.35);
    const w = 6 + Math.abs(Math.sin(this.flap)) * 6;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = `rgba(${this.s.color[0]},${this.s.color[1]},${this.s.color[2]},${a})`;
    ctx.beginPath(); ctx.ellipse(-2, 0, w, 6, 0.4, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2, 0, w, 6, -0.4, 0, 6.283); ctx.fill();
    ctx.restore();
  };

  function SigEmber(s) { this.s = s; this.life = 0; this.dur = 5.0; this.wob = Math.random() * 6.283; }
  SigEmber.prototype.update = function (dt) { this.life += dt; if (this.life > this.dur) active = null; };
  SigEmber.prototype.draw = function () {
    const t = this.life / this.dur;
    const x = this.s.at[0] + Math.sin(this.life * 1.7 + this.wob) * 26;
    const y = this.s.at[1] - t * WORLD_H * 0.26;
    const a = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.95;
    blit(x, y, this.s.color, 18, a);
    blit(x, y, [255, 236, 190], 6, a * 0.9);
  };

  function SigSway(s) {
    this.s = s; this.life = 0; this.dur = 4.0;
    S.gust = 1.0; S.windTarget = Math.min(0.95, S.wind + 0.5);
  }
  SigSway.prototype.update = function (dt) { this.life += dt; if (this.life > this.dur) active = null; };
  SigSway.prototype.draw = function () {
    const env = Math.sin(Math.min(1, this.life / this.dur) * Math.PI);
    for (let i = 0; i < 7; i++) {
      blit(this.s.at[0] + (i / 6) * this.s.spread + Math.sin(this.life * 3.1 + i) * 8,
           this.s.at[1] + Math.sin(this.life * 2.4 + i * 0.7) * 6,
           [220, 226, 214], 20, env * 0.20);
    }
  };

  /* ═══════════════ dev readout — b_4120() ═══════════════ */
  let statsEl = null, fps = 0, fAcc = 0, fCount = 0;
  function toggleStats() {
    if (statsEl) { statsEl.remove(); statsEl = null; return; }
    statsEl = document.createElement('div');
    statsEl.style.cssText = 'position:fixed;left:14px;top:14px;z-index:9999;background:rgba(0,0,0,.82);' +
      'color:#8fe3c0;font:700 11px/1.7 monospace;padding:8px 12px;border-radius:8px;' +
      'border:1px solid rgba(143,227,192,.3);pointer-events:none;letter-spacing:.05em;';
    document.body.appendChild(statsEl);
  }
  function updateStats(dt) {
    if (!statsEl) return;
    fAcc += dt; fCount++;
    if (fAcc >= 0.5) { fps = fCount / fAcc; fAcc = 0; fCount = 0; }
    statsEl.textContent =
      `${fps.toFixed(0)} fps   ${roomId || '—'}\n` +
      `vitality ${(S.vit * 100).toFixed(0)}%  (base ${(S.baseline * 100).toFixed(0)} + week ${(S.weekly * 100).toFixed(0)})\n` +
      `motes ${parts.length}   flies ${flies.length}   sprites ${sprites.size}\n` +
       
      `event ${active ? 'running'
        : S.vit < CFG.thresholds.life ? 'asleep (needs ' + (CFG.thresholds.life * 100).toFixed(0) + '%)'
        : 'in ' + Math.max(0, sched.timer).toFixed(0) + 's'}`;
     
    statsEl.style.whiteSpace = 'pre';
  }

  /* ═══════════════ loop ═══════════════ */
  let last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;

    S.windTarget += (0.22 + Math.sin(now * 0.0002) * 0.12 - S.windTarget) * 0.02;
    S.wind += (S.windTarget - S.wind) * Math.min(1, dt * 2);
    S.gust *= Math.pow(0.35, dt);

    updateHush(dt);
    updateParts(dt);
    updateShower(dt);
    updateSched(dt);
    if (active && active.update) active.update(dt);

    if (!REDUCED) { S.camX = Math.sin(now * 0.00013) * 2.6; S.camY = Math.cos(now * 0.00017) * 2.0; }

    ctx.clearRect(0, 0, WORLD_W, WORLD_H);
    ctx.save();
    ctx.translate(S.camX, S.camY);
    drawCloud(dt);
    drawFog(dt);
    drawBreath(now);
    drawParts();
    drawFlies(dt);
    if (active && active.draw) active.draw();
    drawShower();
    drawHush();
    ctx.restore();

    updateStats(dt);
    rafId = requestAnimationFrame(frame);
  }

  /* ═══════════════ public ═══════════════ */
  function sizeCanvas() {
    canvas.style.width  = WORLD_W + 'px';
    canvas.style.height = WORLD_H + 'px';
    canvas.width  = Math.round(WORLD_W * ATMOS_SCALE);
    canvas.height = Math.round(WORLD_H * ATMOS_SCALE);
    ctx.setTransform(ATMOS_SCALE, 0, 0, ATMOS_SCALE, 0, 0);
  }

  function init(stageEl) {
    if (!stageEl || canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'kara-atmos';
    canvas.style.cssText = 'position:absolute;inset:0;z-index:5;pointer-events:none;';
    const contentCanvas = stageEl.querySelector('#kara-canvas');
    if (contentCanvas) stageEl.insertBefore(canvas, contentCanvas);
    else stageEl.appendChild(canvas);
    ctx = canvas.getContext('2d');
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { running = false; cancelAnimationFrame(rafId); }
      else if (room && !running) { running = true; last = 0; rafId = requestAnimationFrame(frame); }
    });
    Object.defineProperty(window, 'b_4120', {
      value: toggleStats, writable: false, configurable: false, enumerable: false
    });
  }

  function setRoom(id, observerRoomId) {
    if (!canvas) return;
    const r = CFG.rooms[id];
    observerRoom = observerRoomId || null;
    if (!r) {
      running = false; cancelAnimationFrame(rafId);
      if (ctx) ctx.clearRect(0, 0, WORLD_W, WORLD_H);
      roomId = id; room = null; return;
    }
    roomId = id; room = r;
    active = null; sched.timer = 6; hushStage = 0; S.hush = 0; shower = [];
    computeVitality();
    initFlies();
    reseed();
    if (!running) { running = true; last = 0; rafId = requestAnimationFrame(frame); }
  }

  function refreshVitality() { if (room) { computeVitality(); reseed(); } }

  return { init, setRoom, refreshVitality };
})();
