
// =====================================================
// Feed Booha — Engine (v7)
// =====================================================
// CHANGES v7:
//   • AUDIO: Global rotating eatSoundIndex (0→1→2→3→0…)
//             One sound per successful catch, not a chain
//   • STARS: Per-level parCuts field drives star calculation
//             3★ = cutCount ≤ parCuts
//             2★ = cutCount ≤ parCuts + 1
//             1★ = anything else that clears
//             Bounce no longer penalizes UNLESS level sets noBounce:true
//   • CUT FX: Slash replaced with soft sparkle/poof burst
//             Pastel circles + tiny stars, fades gently
//   • HUD: Shows "Cuts: X / parCuts" live
// =====================================================

(() => {
  'use strict';

  const canvas         = document.getElementById('gameCanvas');
  const ctx            = canvas.getContext('2d');
  const startOverlay   = document.getElementById('startOverlay');
  const messageOverlay = document.getElementById('messageOverlay');
  const helpPanel      = document.getElementById('helpPanel');
  const startBtn       = document.getElementById('startBtn');
  const restartBtn     = document.getElementById('restartBtn');
  const retryBtn       = document.getElementById('retryBtn');
  const nextBtn        = document.getElementById('nextBtn');
  const helpBtn        = document.getElementById('helpBtn');
  const closeHelpBtn   = document.getElementById('closeHelpBtn');
  const LEVELS         = window.FEED_BOOHA_LEVELS || [];
  const levelText      = document.getElementById('levelText');
  const stateText      = document.getElementById('stateText');
  const messageTitle   = document.getElementById('messageTitle');
  const messageText    = document.getElementById('messageText');
  const totalStarsEl   = document.getElementById('totalStars');
  const hudStarsEl     = document.getElementById('hudStars');

  let starContainer = null;

  const W       = canvas.width;   // 540
  const H       = canvas.height;  // 960
  const FLOOR_Y = H - 60;

  const GRAVITY            = 0.45;
  const AIR_DRAG           = 0.999;
  const ROPE_CUT_RADIUS    = 32;
  const BOOHA_W            = 160;
  const BOOHA_H            = 160;
  const CANDY_R            = 26;
  const MOUTH_TRIGGER_DIST = 160;
  const SURPRISED_TRIGGER  = 80;
  const FAIL_BUFFER        = 36;
  const TRAIL_LENGTH       = 8;
  const TRAIL_SPEED_THRESH = 6;
  const MAGNET_DIST        = 140;
  const MAGNET_FORCE       = 0.40;
  const LAST_CHANCE_DIST   = 90;

  const swipe        = { active: false, x0: 0, y0: 0, x1: 0, y1: 0 };
  // v7: poof effects replace slash effects
  const poofEffects  = [];
  const confetti     = [];
  const images       = {};

  const imageSources = {
    bg:           './assets/img/feed_booha-1.png',
    booEat:       './assets/img/boo-eat.png',
    booMouthOpen: './assets/img/boo-mouth-open.png',
    booSad:       './assets/img/boo-sad.png',
    booSurprised: './assets/img/boo-surprised.png',
    booWait:      './assets/img/boo-wait.png',
    booWin:       './assets/img/boo-win.png',
    candy:        './assets/img/candy.png'
  };



  // ─────────────────────────────────────────────────
  // Audio — v7: rotating global index, one sound per catch
  // ─────────────────────────────────────────────────
  let audioCtx     = null;
  // Global across the whole session — survives level resets
  let eatSoundIndex = 0;

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playFile(src, loop = false, vol = 1) {
    const a = new Audio(src);
    a.loop   = loop;
    a.volume = vol;
    a.play().catch(() => {});
    return a;
  }

  function stopFile(a) {
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch(e) {}
  }

  // v7: Play exactly one eat sound, then advance the global index
  // Index cycles: 0 (get-1) → 1 (get-2) → 2 (get-3) → 3 (get-4) → 0 …
  function playEatSound() {
    const files = ['get-1.mp3', 'get-2.mp3', 'get-3.mp3', 'get-4.mp3'];
    const src   = './assets/audio/' + files[eatSoundIndex % files.length];
    eatSoundIndex = (eatSoundIndex + 1) % files.length;
    const a = new Audio(src);
    a.play().catch(() => {});
    return a;
  }

  // Synth helpers
  function playTone({ freq = 440, freq2 = null, type = 'sine', gain = 0.32, duration = 0.18,
                      attack = 0.01, decay = 0.08, sustain = 0.4, release = 0.10, delay = 0 } = {}) {
    try {
      const ac  = getAudioCtx();
      const osc = ac.createOscillator();
      const env = ac.createGain();
      osc.connect(env); env.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
      if (freq2) osc.frequency.linearRampToValueAtTime(freq2, ac.currentTime + delay + duration * 0.6);
      const t0 = ac.currentTime + delay;
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(gain, t0 + attack);
      env.gain.linearRampToValueAtTime(gain * sustain, t0 + attack + decay);
      env.gain.setValueAtTime(gain * sustain, t0 + duration - release);
      env.gain.linearRampToValueAtTime(0, t0 + duration);
      osc.start(t0); osc.stop(t0 + duration + 0.01);
    } catch(e) {}
  }

  // v7: Cut sound is now softer — little "snip" tone fits the poof FX better
  function playSfxCut() {
    // Soft high snip
    playTone({ freq: 1400, freq2: 900, type: 'sine', gain: 0.12, duration: 0.08,
               attack: 0.003, decay: 0.03, sustain: 0.1, release: 0.04 });
    // Tiny pop body
    playTone({ freq: 300, freq2: 180, type: 'sine', gain: 0.18, duration: 0.10,
               attack: 0.004, decay: 0.04, sustain: 0.15, release: 0.04, delay: 0.02 });
  }

  function playSfxBounce() {
    playTone({ freq: 190, freq2: 90, type: 'sine', gain: 0.48, duration: 0.18,
               attack: 0.004, decay: 0.08, sustain: 0.22, release: 0.07 });
    playTone({ freq: 320, type: 'triangle', gain: 0.12, duration: 0.10,
               attack: 0.004, decay: 0.04, sustain: 0.1, release: 0.04 });
  }
  function playSfxFall() {
    playTone({ freq: 680, freq2: 300, type: 'sine', gain: 0.20, duration: 0.32,
               attack: 0.01, decay: 0.10, sustain: 0.55, release: 0.12 });
  }
  function playSfxMiss() {
    playTone({ freq: 440, freq2: 210, type: 'sine', gain: 0.26, duration: 0.28,
               attack: 0.01, decay: 0.10, sustain: 0.38, release: 0.10 });
    playTone({ freq: 330, freq2: 155, type: 'triangle', gain: 0.14, duration: 0.22,
               attack: 0.02, decay: 0.08, sustain: 0.28, release: 0.10, delay: 0.14 });
  }
  function playSfxFan() {
    playTone({ freq: 200, freq2: 620, type: 'sawtooth', gain: 0.10, duration: 0.24,
               attack: 0.04, decay: 0.10, sustain: 0.28, release: 0.10 });
  }
  function playSfxWin() {
    [0, 0.13, 0.26, 0.40, 0.50].forEach((d, i) => {
      playTone({ freq: [523, 659, 784, 1047, 1319][i], type: 'triangle', gain: 0.22,
                 duration: 0.20, attack: 0.01, decay: 0.06, sustain: 0.38, release: 0.09, delay: d });
    });
  }
  function playSfxPerfect() {
    [0, 0.08, 0.16, 0.26, 0.38, 0.52, 0.68].forEach((d, i) => {
      playTone({ freq: [523, 784, 1047, 1319, 1047, 1319, 1568][i], type: 'triangle',
                 gain: 0.28, duration: 0.22, attack: 0.01, decay: 0.06, sustain: 0.45,
                 release: 0.10, delay: d });
    });
  }

  // ─────────────────────────────────────────────────
  // v7 STARS — per-level parCuts, no bounce penalty
  // unless level sets noBounce: true
  //
  // 3★ = cutCount ≤ parCuts
  // 2★ = cutCount ≤ parCuts + 1
  // 1★ = anything else that still clears
  // ─────────────────────────────────────────────────
  let totalStarsEarned = 0;

  function getParCuts() {
    const lvl = state.currentLevel;
    // Fall back to 1 if level author didn't set parCuts
    return (lvl && lvl.parCuts != null) ? lvl.parCuts : 1;
  }

  function starsForCuts(cutCount, hitBounce) {
    const par = getParCuts();
    // Only penalize bounce if the level explicitly opts in
    const bouncePenalty = hitBounce && state.currentLevel && state.currentLevel.noBounce;
    if (bouncePenalty) {
      // Bounce disqualifies 3★ on noBounce levels
      if (cutCount <= par + 1) return 2;
      return 1;
    }
    if (cutCount <= par)     return 3;
    if (cutCount <= par + 1) return 2;
    return 1;
  }

  function updateHudStars() {
    if (!hudStarsEl) return;
    const s = starsForCuts(state.cutCount, state.hitBounce);
    hudStarsEl.textContent = '★'.repeat(s) + '☆'.repeat(3 - s);
  }

  // ─────────────────────────────────────────────────
  // v7 POOF FX — replaces slash effects
  // Soft sparkle burst: pastel circles + mini stars
  // ─────────────────────────────────────────────────
  const POOF_COLORS = ['#ffb3d9', '#ffd6f0', '#fff0c0', '#c6eaff', '#e0c6ff', '#ffffff'];

  function spawnPoof(x, y) {
    // Puff cloud particles
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1;
      poofEffects.push({
        type:  'puff',
        x, y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed - 1.5,
        size:  Math.random() * 18 + 8,
        color: POOF_COLORS[Math.floor(Math.random() * POOF_COLORS.length)],
        life:  1.0,
        decay: Math.random() * 0.04 + 0.03
      });
    }
    // Tiny star sparkles
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.4;
      const speed = Math.random() * 5 + 2;
      poofEffects.push({
        type:  'star',
        x, y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed - 2,
        size:  Math.random() * 7 + 4,
        color: Math.random() > 0.5 ? '#ffe8a0' : '#ffc8e8',
        life:  1.0,
        decay: Math.random() * 0.05 + 0.03,
        rot:   Math.random() * Math.PI * 2
      });
    }
  }

  function updatePoofEffects(dt) {
    const f = dt / 16.667;
    for (let i = poofEffects.length - 1; i >= 0; i--) {
      const p = poofEffects[i];
      p.x   += p.vx * f;
      p.y   += p.vy * f;
      p.vy  += 0.08 * f;   // gentle gravity
      p.vx  *= 0.94;
      p.life -= p.decay * f;
      if (p.type === 'puff') p.size += 0.6 * f; // puffs expand as they fade
      if (p.life <= 0) poofEffects.splice(i, 1);
    }
  }

  function drawStar5(ctx, cx, cy, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a  = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const ai = a + Math.PI / 5;
      i === 0
        ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(ai) * r * 0.42, cy + Math.sin(ai) * r * 0.42);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPoofEffects() {
    for (const p of poofEffects) {
      const alpha = Math.max(0, p.life);
      if (p.type === 'puff') {
        ctx.save();
        ctx.globalAlpha = alpha * 0.72;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // star sparkle
        drawStar5(ctx, p.x, p.y, p.size, p.color, alpha * 0.9);
      }
    }
  }

  // ─────────────────────────────────────────────────
  // Confetti burst (3-star celebration)
  // ─────────────────────────────────────────────────
  const CONFETTI_COLORS = ['#ff5fa8','#ffdd44','#44ddff','#ff8fd1','#ffe066','#a8ffee'];

  function spawnConfetti(x, y) {
    confetti.length = 0;
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 14 + 4;
      confetti.push({
        x, y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed - 6,
        size:  Math.random() * 8 + 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rot:   Math.random() * Math.PI * 2,
        rotV:  (Math.random() - 0.5) * 0.3,
        life:  1.0,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }
    state.perfectTextLife = 120;
  }

  function updateConfetti(dt) {
    const g = 0.28 * (dt / 16.667);
    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i];
      p.vy  += g;
      p.x   += p.vx * (dt / 16.667);
      p.y   += p.vy * (dt / 16.667);
      p.rot += p.rotV;
      p.vx  *= 0.985;
      p.life -= 0.012 * (dt / 16.667);
      if (p.life <= 0 || p.y > H + 40) confetti.splice(i, 1);
    }
    if (state.perfectTextLife > 0) state.perfectTextLife -= dt / 16.667;
  }

  function drawConfetti() {
    for (const p of confetti) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      } else {
        ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    if (state.perfectTextLife > 0) {
      const alpha = Math.min(1, state.perfectTextLife / 20);
      const scale = 1 + 0.12 * Math.sin(state.perfectTextLife * 0.25);
      const m = boohaMouthPoint();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(m.x, m.y - 100);
      ctx.scale(scale, scale);
      ctx.font = 'bold 52px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#c0006a';
      ctx.fillText('PERFECT!', 2, 4);
      ctx.fillStyle = '#fff';
      ctx.fillText('PERFECT!', 0, 0);
      ctx.restore();
    }
  }

  // ─────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────
  const state = {
    started: false, levelIndex: 0, running: false,
    won: false, lost: false, cutCount: 0,
    hitBounce: false,
    currentLevel: null, candy: null, ropes: [], objects: [],
    booha: null, boohaSprite: 'booWait',
    effectTimers: [], lastTime: 0,
    bounceCooldown: 0,
    pendingSuccessTimeout: null, pendingFailTimeout: null, pendingFailTimeout2: null, 
    bouncePattern: null,
    shakeFrames: 0, shakeAmt: 0,
    trail: [],
    lastChanceFired: false, boohaJumpOffset: 0, boohaJumpFrame: 0,
    cutTimers: {}, missDir: 0, fallSoundPlayed: false,
    perfectTextLife: 0
  };

  // ─────────────────────────────────────────────────
  // Assets
  // ─────────────────────────────────────────────────
  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img); img.onerror = rej; img.src = src;
    });
  }

  async function preloadAssets() {
    for (const [k, src] of Object.entries(imageSources)) {
      try { images[k] = await loadImage(src); } catch(e) { console.warn('img fail:', src); }
    }
    buildBouncePattern();
 
  }

  function buildBouncePattern() {
    const sz = 12, pc = document.createElement('canvas');
    pc.width = pc.height = sz;
    const px = pc.getContext('2d');
    px.fillStyle = '#ff8fd1'; px.fillRect(0, 0, sz, sz);
    px.strokeStyle = 'rgba(255,255,255,0.45)'; px.lineWidth = 2;
    px.beginPath(); px.moveTo(0, sz); px.lineTo(sz, 0); px.stroke();
    state.bouncePattern = ctx.createPattern(pc, 'repeat');
  }

  // ─────────────────────────────────────────────────
  // Timers
  // ─────────────────────────────────────────────────
  function stopAllTimers() {
    if (state.pendingSuccessTimeout) { clearTimeout(state.pendingSuccessTimeout); state.pendingSuccessTimeout = null; }
    if (state.pendingFailTimeout)    { clearTimeout(state.pendingFailTimeout);    state.pendingFailTimeout    = null; }
    if (state.pendingFailTimeout2) { clearTimeout(state.pendingFailTimeout2); state.pendingFailTimeout2 = null; }
    for (const id of state.effectTimers) clearTimeout(id);
    state.effectTimers = [];
    for (const id of Object.values(state.cutTimers)) clearTimeout(id);
    state.cutTimers = {};
  }

  function setHud(lvl, status) {
    if (levelText) levelText.textContent = String(lvl);
    if (stateText) stateText.textContent = status;
  }

  // v7: HUD shows "Cuts: X / par" live during play
  function setHudCuts() {
    const par = getParCuts();
    setHud(state.levelIndex + 1, `Cuts: ${state.cutCount} / ${par}`);
  }

  function cloneLevel(l) { return JSON.parse(JSON.stringify(l)); }

  // ─────────────────────────────────────────────────
  // Stars overlay
  // ─────────────────────────────────────────────────
  function buildStarUI() {
    if (starContainer) return;
    const card = messageOverlay.querySelector('.overlay-card');
    if (!card) return;
    starContainer = document.createElement('div');
    starContainer.id = 'starRating';
    const p = card.querySelector('p');
    if (p) p.after(starContainer); else card.prepend(starContainer);
  }

  function showStars(cutCount, hitBounce) {
    buildStarUI();
    if (!starContainer) return;
    const stars = starsForCuts(cutCount, hitBounce);
    starContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.textContent = i < stars ? '★' : '☆';
      s.className   = i < stars ? 'star star--earned' : 'star star--empty';
      if (i < stars) s.style.animationDelay = `${i * 0.13}s`;
      starContainer.appendChild(s);
    }
    totalStarsEarned += stars;
    if (totalStarsEl) totalStarsEl.textContent = totalStarsEarned;
    if (hudStarsEl) {
      hudStarsEl.classList.add('star-flash');
      setTimeout(() => hudStarsEl.classList.remove('star-flash'), 600);
    }
  }

  // ─────────────────────────────────────────────────
  // Level build
  // ─────────────────────────────────────────────────
  function buildLevel(index) {
    stopAllTimers();
    poofEffects.length = 0;
    confetti.length    = 0;
    state.trail.length = 0;

    const rawLevel = LEVELS[index] || LEVELS[0];
    if (!rawLevel) { console.error('No levels.'); return; }
    const level = cloneLevel(rawLevel);

    state.currentLevel    = level;
    state.cutCount        = 0;
    state.hitBounce       = false;
    state.won             = false;
    state.lost            = false;
    state.missDir         = 0;
    state.running         = true;
    state.boohaSprite     = 'booWait';
    state.effectTimers    = [];
    state.cutTimers       = {};
    state.bounceCooldown  = 0;
    state.shakeFrames     = 0;
    state.lastChanceFired = false;
    state.boohaJumpOffset = 0;
    state.boohaJumpFrame  = 0;
    state.fallSoundPlayed = false;
    state.perfectTextLife = 0;

    updateHudStars();

    const ropeCount = (level.ropes || []).length;
    let kickVx;
    if (ropeCount >= 2) {
      const avgX = level.ropes.reduce((s, r) => s + r.anchor.x, 0) / ropeCount;
      kickVx = (avgX >= W / 2 ? -1 : 1) * 6;
    } else {
      kickVx = (level.candy.x >= W / 2 ? -1 : 1) * 5.5;
    }

    state.candy = {
      x: level.candy.x, y: level.candy.y,
      vx: kickVx, vy: 0,
      r: CANDY_R, attached: true, alive: true
    };

    state.ropes = (level.ropes || []).map(r => ({
      id:      r.id,
      anchor:  { x: r.anchor.x, y: r.anchor.y },
      cut:     false,
      type:    r.type    || 'normal',
      delayMs: r.delayMs || 400,
      pending: false,
      length:  Math.hypot(level.candy.x - r.anchor.x, level.candy.y - r.anchor.y)
    }));

    state.objects = (level.objects || []).map(o => ({
      ...o,
      activated: false,
      fanTimer: 0
    }));

    const bh = level.booha;
    let initDir = 1;
    if (bh.range) {
      const mid = (bh.range.min + bh.range.max) / 2;
      initDir   = bh.x <= mid ? 1 : -1;
    }
    state.booha = {
      x: bh.x, y: bh.y,
      baseX: bh.x, baseY: bh.y,
      behavior: bh.behavior || 'idle',
      range:    bh.range    || null,
      speed:    bh.speed    || 0,
      dir:      initDir,
      w: BOOHA_W, h: BOOHA_H
    };

    setHud(index + 1, 'Ready');
  }

  // ─────────────────────────────────────────────────
  // Flow
  // ─────────────────────────────────────────────────
  function startGame() {
    if (!LEVELS.length) return;
    state.started = true;
    startOverlay.classList.remove('overlay--show');
    startOverlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => { startOverlay.style.display = 'none'; }, 300);
    buildLevel(state.levelIndex);
  }

  function resetLevel() { buildLevel(state.levelIndex); }
  function nextLevel()  { state.levelIndex = (state.levelIndex + 1) % LEVELS.length; hideMessage(); buildLevel(state.levelIndex); }

  function showMessage(title, text, nextVisible = true, cutCount = 0, hitBounce = false) {
    messageTitle.textContent = title;
    messageText.textContent  = text;
    const stars = starsForCuts(cutCount, hitBounce);
    nextBtn.style.display  = nextVisible ? 'inline-flex' : 'none';
    retryBtn.style.display = (!nextVisible || stars < 3) ? 'inline-flex' : 'none';
    if (nextVisible) showStars(cutCount, hitBounce);
    else if (starContainer) starContainer.innerHTML = '';
    messageOverlay.classList.add('overlay--show');
    messageOverlay.setAttribute('aria-hidden', 'false');
  }

  function hideMessage() {
    messageOverlay.classList.remove('overlay--show');
    messageOverlay.setAttribute('aria-hidden', 'true');
  }

  function toggleHelp(show) {
    helpPanel.classList.toggle('help-panel--show', show);
    helpPanel.setAttribute('aria-hidden', String(!show));
  }

  function getActiveRopes() { return state.ropes.filter(r => !r.cut && !r.pending); }

  // ─────────────────────────────────────────────────
  // Booha movement
  // ─────────────────────────────────────────────────
  function updateBooha(dt) {
    if (!state.booha) return;
    const b = state.booha;
    if (b.behavior === 'horizontal' && b.range && b.speed > 0) {
      b.x += b.speed * b.dir * (dt / 16.667);
      if (b.x >= b.range.max) { b.x = b.range.max; b.dir = -1; }
      else if (b.x <= b.range.min) { b.x = b.range.min; b.dir = 1; }
    }
    if (state.boohaJumpFrame > 0) {
      state.boohaJumpFrame--;
      const p = 1 - state.boohaJumpFrame / 16;
      state.boohaJumpOffset = -18 * Math.sin(p * Math.PI);
      if (state.boohaJumpFrame === 0) state.boohaJumpOffset = 0;
    }
  }

  // ─────────────────────────────────────────────────
  // Physics
  // ─────────────────────────────────────────────────
  function updateAttachedCandy(dt) {
    const active = getActiveRopes();
    if (!active.length) { state.candy.attached = false; return; }
    const c = state.candy;
    const steps = 3, subDt = dt / steps;
    for (let s = 0; s < steps; s++) {
      c.vy += GRAVITY * subDt / 16.667;
      c.x  += c.vx   * subDt / 16.667;
      c.y  += c.vy   * subDt / 16.667;
      for (const rope of active) {
        const dx = c.x - rope.anchor.x, dy = c.y - rope.anchor.y;
        const dist = Math.hypot(dx, dy);
        const len  = rope.length || 120;
        if (dist < 0.001 || dist <= len) continue;
        const over = (dist - len) / dist;
        c.x -= dx * over; c.y -= dy * over;
        const nx = dx/dist, ny = dy/dist;
        const vd = c.vx*nx + c.vy*ny;
        if (vd > 0) { c.vx -= vd*nx; c.vy -= vd*ny; }
      }
    }
    c.vx *= 0.999; c.vy *= 0.999;
  }

  function applyMagnet() {
    if (!state.booha || state.won || state.lost) return;
    const c = state.candy, m = boohaMouthPoint();
    const dx = m.x - c.x, dy = m.y - c.y, dist = Math.hypot(dx, dy);
    if (dist > MAGNET_DIST || dist < 1) return;
    const str = MAGNET_FORCE * (1 - dist / MAGNET_DIST);
    c.vx += (dx/dist) * str; c.vy += (dy/dist) * str;
  }

  function updateFreeCandy() {
    const c = state.candy;
    c.vy += GRAVITY; c.x += c.vx; c.y += c.vy;
    c.vx *= AIR_DRAG; c.vy *= AIR_DRAG;
  }

  function updateFans(dt) {
    const c = state.candy;
    if (!c || c.attached) return;
    for (const obj of state.objects) {
      if (obj.type !== 'fan') continue;
      const baseForce  = 0.32 * (dt / 16.667);
      const burstForce = obj.fanTimer > 0 ? 0.26 * (dt / 16.667) : 0;
      const f = baseForce + burstForce;
      if (obj.direction === 'right') c.vx += f;
      else if (obj.direction === 'left')  c.vx -= f;
      else if (obj.direction === 'up')    c.vy -= f * 1.2;
      if (obj.fanTimer > 0) obj.fanTimer -= dt;
    }
  }

  function activateFan(obj) {
    obj.fanTimer = 600;
    playSfxFan();
    if (navigator.vibrate) navigator.vibrate(30);
  }

  function updateTrail() {
    const c = state.candy;
    if (!c || c.attached) { state.trail.length = 0; return; }
    if (Math.hypot(c.vx, c.vy) >= TRAIL_SPEED_THRESH) {
      state.trail.unshift({ x: c.x, y: c.y, alpha: 1 });
      if (state.trail.length > TRAIL_LENGTH) state.trail.length = TRAIL_LENGTH;
    }
    for (const t of state.trail) t.alpha -= 0.12;
    for (let i = state.trail.length - 1; i >= 0; i--) {
      if (state.trail[i].alpha <= 0) state.trail.splice(i, 1);
    }
  }

  function handleBouncePads() {
    if (state.bounceCooldown > 0) state.bounceCooldown--;
    const c = state.candy;
    if (!c || c.attached) return;
    for (const obj of state.objects) {
      if (obj.type !== 'bounce') continue;
      const l = obj.x - obj.width/2, r = obj.x + obj.width/2;
      const top = obj.y - obj.height/2;
      if (c.x+c.r > l && c.x-c.r < r && c.y+c.r >= top && c.y+c.r <= top+22 && c.vy > 0) {
        c.y = top - c.r;
        c.vy = -Math.max(10, Math.abs(c.vy) * 0.95);
        c.vx *= 1.02;
        // Only flag hitBounce if level cares about it (noBounce levels)
        if (state.currentLevel && state.currentLevel.noBounce) {
          state.hitBounce = true;
          updateHudStars();
        }
        if (state.bounceCooldown <= 0) {
          playSfxBounce();
          state.shakeFrames = 7; state.shakeAmt = 3; state.bounceCooldown = 8;
        }
      }
    }
  }

  function checkLastChance() {
    if (state.lastChanceFired || state.won || state.lost) return;
    const c = state.candy;
    if (!c || c.attached) return;
    if (c.y + c.r >= FLOOR_Y - LAST_CHANCE_DIST && c.vy > 0) {
      state.lastChanceFired = true;
      state.boohaJumpFrame  = 16;
    }
  }

  function boohaMouthPoint() {
    return { x: state.booha.x, y: state.booha.y + state.boohaJumpOffset - 12 };
  }

  function updateBoohaMood() {
    if (state.won || state.lost) return;
    const c = state.candy, m = boohaMouthPoint();
    const dist = Math.hypot(c.x - m.x, c.y - m.y);
    if (dist < SURPRISED_TRIGGER && !c.attached) {
      state.boohaSprite = 'booSurprised';
    } else if (dist < MOUTH_TRIGGER_DIST && !c.attached) {
      state.boohaSprite = 'booMouthOpen';
    } else {
      state.boohaSprite = 'booWait';
    }
    // Live cut count HUD after first cut
    if (state.cutCount > 0 || !c.attached) {
      setHudCuts();
    }
  }

  function checkFallSound() {
    if (!state.fallSoundPlayed && !state.candy.attached) {
      state.fallSoundPlayed = true;
      playSfxFall();
    }
  }

  function checkSuccess() {
    if (state.won || state.lost) return;
    const c = state.candy, m = boohaMouthPoint();
    if (Math.hypot(c.x - m.x, c.y - m.y) >= 52) return;
    state.won = true; state.running = false; state.candy.alive = false;
    state.boohaSprite = 'booEat';

    // v7: ONE rotating eat sound per catch
    playEatSound();

    const cuts      = state.cutCount;
    const hitBounce = state.hitBounce;
    const stars     = starsForCuts(cuts, hitBounce);

    if (stars === 3) {
      spawnConfetti(m.x, m.y);
      state.shakeFrames = 18;
      state.shakeAmt    = 4;
      playSfxPerfect();
    }

    state.pendingSuccessTimeout = setTimeout(() => {
      state.boohaSprite = 'booWin';
      if (stars < 3) playSfxWin();
      const title = stars === 3 ? 'Perfect!' : stars === 2 ? 'Tasty!' : 'Good job!';
      showMessage(title, 'Booha is happy!', true, cuts, hitBounce);
    }, 1400);
  }

  function checkFail() {
    if (state.won || state.lost) return;
    const c = state.candy;
    if (c.y + c.r < FLOOR_Y - FAIL_BUFFER) return;
    state.lost = true; state.running = false;
    const m = boohaMouthPoint();
    state.missDir = c.x < m.x ? -1 : 1;
    state.boohaSprite = 'booSad';
    setHud(state.levelIndex+1, 'Miss');
    playSfxMiss();
    state.pendingFailTimeout = setTimeout(() => {
    showMessage('Oops!', 'Booha missed the candy.', false);
    state.pendingFailTimeout2 = setTimeout(() => { hideMessage(); resetLevel(); }, 1400);
    }, 300);
  }

  function clampCandyToFloor() {
    const c = state.candy;
    if (c.y + c.r > FLOOR_Y && !state.won) { c.y = FLOOR_Y - c.r; c.vx *= 0.95; c.vy = 0; }
  }

  // ─────────────────────────────────────────────────
  // Rope cutting
  // ─────────────────────────────────────────────────
  function spawnPoofAtRope(rope) {
    // Poof appears midway along the rope
    const c = state.candy;
    spawnPoof(
      (rope.anchor.x + c.x) / 2,
      (rope.anchor.y + c.y) / 2
    );
  }

  function tryCutRope(rope) {
    if (rope.cut || rope.pending) return false;
    if (rope.type === 'delayed') {
      rope.pending = true;
      const id = setTimeout(() => {
        rope.cut = true; rope.pending = false; state.cutCount++;
        spawnPoofAtRope(rope);
        playSfxCut();
        if (navigator.vibrate) navigator.vibrate(40);
        if (!getActiveRopes().length) state.candy.attached = false;
        updateHudStars();
        setHudCuts();
      }, rope.delayMs);
      state.cutTimers[rope.id] = id;
      return true;
    }
    rope.cut = true; state.cutCount++;
    spawnPoofAtRope(rope);
    playSfxCut();
    if (navigator.vibrate) navigator.vibrate(40);
    if (!getActiveRopes().length) state.candy.attached = false;
    updateHudStars();
    setHudCuts();
    return true;
  }

  function cutNearestRope(mx, my) {
    if (!state.currentLevel || state.won || state.lost) return;
    const active = state.ropes.filter(r => !r.cut && !r.pending);
    if (!active.length) return;
    let best = null, bestD = Infinity;
    for (const rope of active) {
      const d = distPtSeg(mx, my, rope.anchor.x, rope.anchor.y, state.candy.x, state.candy.y);
      if (d < bestD) { bestD = d; best = rope; }
    }
    if (best && bestD <= ROPE_CUT_RADIUS) tryCutRope(best);
  }

  function tapObjects(mx, my) {
    for (const obj of state.objects) {
      if (obj.type !== 'fan') continue;
      if (Math.hypot(mx - obj.x, my - obj.y) < 48) { activateFan(obj); return true; }
    }
    return false;
  }

  function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const d1x=bx-ax, d1y=by-ay, d2x=dx-cx, d2y=dy-cy;
    const cross = d1x*d2y - d1y*d2x;
    if (Math.abs(cross) < 1e-10) return false;
    const t = ((cx-ax)*d2y - (cy-ay)*d2x) / cross;
    const u = ((cx-ax)*d1y - (cy-ay)*d1x) / cross;
    return t>=0 && t<=1 && u>=0 && u<=1;
  }

  function checkSwipeCuts() {
    if (!state.currentLevel || state.won || state.lost) return;
    for (const rope of state.ropes.filter(r => !r.cut && !r.pending)) {
      if (segmentsIntersect(swipe.x0, swipe.y0, swipe.x1, swipe.y1,
        rope.anchor.x, rope.anchor.y, state.candy.x, state.candy.y)) tryCutRope(rope);
    }
  }

  function distPtSeg(px, py, x1, y1, x2, y2) {
    const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
    const lenSq = C*C+D*D;
    const t = lenSq ? Math.max(0, Math.min(1, (A*C+B*D)/lenSq)) : 0;
    return Math.hypot(px-(x1+C*t), py-(y1+D*t));
  }

  // ─────────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────────
  function update(dt) {
    if (!state.started || !state.currentLevel) return;
    updateBooha(dt);
    updateTrail();
    updateConfetti(dt);
    updatePoofEffects(dt);   // v7
    if (state.shakeFrames > 0) state.shakeFrames--;
    if (state.running) {
      if (state.candy.attached) {
        updateAttachedCandy(dt);
      } else {
        checkFallSound();
        applyMagnet();
        updateFreeCandy();
        updateFans(dt);
        handleBouncePads();
        checkLastChance();
        checkSuccess();
        checkFail();
        clampCandyToFloor();
      }
      updateBoohaMood();
    }
    // poofEffects update is above — no slashEffects anymore
  }

  // ─────────────────────────────────────────────────
  // Draw
  // ─────────────────────────────────────────────────
  function drawFloor() {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  }

  function drawRopes() {
    const c = state.candy;
    for (const rope of state.ropes) {
      if (rope.cut) continue;
      const ax=rope.anchor.x, ay=rope.anchor.y, bx=c.x, by=c.y;
      const mx=(ax+bx)/2, my=(ay+by)/2;
      const straightD = Math.hypot(bx-ax, by-ay);
      const slack     = Math.max(0, (rope.length||straightD) - straightD);
      const sagY      = Math.min(slack*0.5 + straightD*0.08, 70);
      ctx.save();
      ctx.globalAlpha = rope.pending ? 0.45 : 1;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.quadraticCurveTo(mx, my+sagY, bx,by);
      ctx.strokeStyle='#c8a84b'; ctx.lineWidth=7; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.quadraticCurveTo(mx, my+sagY, bx,by);
      ctx.strokeStyle='#f0d070'; ctx.lineWidth=3; ctx.stroke();
      ctx.setLineDash([6,10]); ctx.lineDashOffset=(state.lastTime*0.02)%16;
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.quadraticCurveTo(mx, my+sagY, bx,by);
      ctx.strokeStyle='rgba(255,245,200,0.35)'; ctx.lineWidth=2; ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='#fff6cf'; ctx.beginPath(); ctx.arc(ax,ay,7,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  function drawObjects() {
    const t = state.lastTime * 0.001;
    for (const obj of state.objects) {
      if (obj.type === 'bounce') {
        const x=obj.x-obj.width/2, y=obj.y-obj.height/2;
        ctx.save();
        ctx.fillStyle = state.bouncePattern || '#ff8fd1';
        ctx.fillRect(x,y,obj.width,obj.height);
        ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.strokeRect(x,y,obj.width,obj.height);
        ctx.fillStyle='#fff'; ctx.font='bold 13px system-ui';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('▲', obj.x, obj.y);
        ctx.restore();
      }
      if (obj.type === 'fan') {
        const active = obj.fanTimer > 0;
        const spinSpeed = active ? 8 : 3;
        ctx.save(); ctx.translate(obj.x, obj.y); ctx.rotate(t * spinSpeed);
        ctx.fillStyle = active ? '#ffcc44' : '#ddbbff';
        ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
        for (let i=0;i<4;i++) {
          ctx.save(); ctx.rotate((Math.PI*2/4)*i);
          ctx.fillStyle = active ? 'rgba(255,200,50,0.85)' : 'rgba(200,160,255,0.7)';
          ctx.beginPath(); ctx.ellipse(0,-18,7,16,0,0,Math.PI*2); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        ctx.save(); ctx.fillStyle='#fff'; ctx.font='14px system-ui';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(obj.direction==='left'?'←':obj.direction==='up'?'↑':'→', obj.x, obj.y+28);
        ctx.strokeStyle = active ? 'rgba(255,220,50,0.55)' : 'rgba(200,160,255,0.30)';
        ctx.lineWidth = active ? 2 : 1;
        ctx.setLineDash(active ? [] : [4,6]);
        ctx.beginPath(); ctx.arc(obj.x, obj.y, 40, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  function drawTrail() {
    const c = state.candy;
    if (!c||!c.alive) return;
    for (let i=0;i<state.trail.length;i++) {
      const t=state.trail[i], ratio=1-i/state.trail.length;
      ctx.save(); ctx.globalAlpha=t.alpha*ratio*0.45; ctx.fillStyle='#ff88cc';
      ctx.beginPath(); ctx.arc(t.x,t.y,CANDY_R*ratio*0.8,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  function drawCandy() {
    const c = state.candy;
    if (!c.alive) return;
    if (images.candy) { ctx.drawImage(images.candy, c.x-c.r, c.y-c.r, c.r*2, c.r*2); return; }
    ctx.save(); ctx.fillStyle='#ff5fa8';
    ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawBooha() {
    const b=state.booha, img=images[state.boohaSprite]||images.booWait;
    const yOff=state.boohaJumpOffset;
    const dx=b.x-b.w/2+(state.lost&&state.missDir?state.missDir*8:0);
    const dy=b.y+yOff-b.h/2;
    if (img) { ctx.drawImage(img,dx,dy,b.w,b.h); return; }
    ctx.save(); ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(b.x,b.y+yOff,70,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function draw() {
    const sx = state.shakeFrames>0 ? (Math.random()-0.5)*state.shakeAmt*2 : 0;
    const sy = state.shakeFrames>0 ? (Math.random()-0.5)*state.shakeAmt*2 : 0;
    ctx.save(); ctx.translate(sx, sy);
    ctx.clearRect(-10,-10,W+20,H+20);
    if (!state.currentLevel) { ctx.restore(); return; }
    drawFloor();
    drawObjects();
    drawRopes();
    drawPoofEffects();   // v7: poof instead of slash, drawn behind candy
    drawTrail();
    drawCandy();
    drawBooha();
    drawConfetti();
    ctx.restore();
  }

  // ─────────────────────────────────────────────────
  // DOM particle layer
  // ─────────────────────────────────────────────────
  function buildDomParticles() {
    const wrap = document.querySelector('.game-wrap');
    if (!wrap) return;
    const layer = document.createElement('div');
    layer.className = 'particle-layer';
    wrap.insertBefore(layer, canvas);
    for (let i = 0; i < 22; i++) {
      const el       = document.createElement('div');
      const isBubble = i < 13;
      el.className   = isBubble ? 'dom-bubble' : 'dom-sparkle';
      const size     = isBubble ? Math.random()*26+8 : Math.random()*4+1.5;
      const dur      = isBubble ? Math.random()*14+9 : Math.random()*3+1.8;
      el.style.cssText = [
        `left:${Math.random()*100}%`,
        `width:${size}px`,
        `height:${size}px`,
        `animation-duration:${dur}s`,
        `animation-delay:${(Math.random()*-dur).toFixed(1)}s`,
        `opacity:${(Math.random()*0.18+0.05).toFixed(2)}`,
        !isBubble ? `bottom:${Math.random()*100}%` : ''
      ].filter(Boolean).join(';');
      layer.appendChild(el);
    }
  }

  // ─────────────────────────────────────────────────
  // Main loop
  // ─────────────────────────────────────────────────
  function frame(ts) {
    const dt = state.lastTime ? Math.min(ts - state.lastTime, 50) : 16.67;
    state.lastTime = ts;
    update(dt); draw();
    requestAnimationFrame(frame);
  }

  // ─────────────────────────────────────────────────
  // Input
  // ─────────────────────────────────────────────────
  function getCanvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width/rect.width, sy = canvas.height/rect.height;
    const touch = evt.touches&&evt.touches[0];
    return {
      x: ((touch?touch.clientX:evt.clientX) - rect.left) * sx,
      y: ((touch?touch.clientY:evt.clientY) - rect.top)  * sy
    };
  }

  function handleTap(p) {
    if (!state.started) return;
    if (!tapObjects(p.x, p.y)) cutNearestRope(p.x, p.y);
  }

  function bindEvents() {
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', resetLevel);
    retryBtn.addEventListener('click', () => { hideMessage(); resetLevel(); });
    nextBtn.addEventListener('click', nextLevel);
    helpBtn.addEventListener('click', () => toggleHelp(true));
    closeHelpBtn.addEventListener('click', () => toggleHelp(false));
    canvas.addEventListener('click', evt => handleTap(getCanvasPoint(evt)));
    canvas.addEventListener('touchstart', evt => {
      if (!state.started) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      swipe.active=true; swipe.x0=p.x; swipe.y0=p.y; swipe.x1=p.x; swipe.y1=p.y;
    }, { passive: false });
    canvas.addEventListener('touchmove', evt => {
      if (!state.started||!swipe.active) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      swipe.x1=p.x; swipe.y1=p.y; checkSwipeCuts(); swipe.x0=p.x; swipe.y0=p.y;
    }, { passive: false });
    canvas.addEventListener('touchend', evt => {
      evt.preventDefault();
      if (Math.hypot(swipe.x1-swipe.x0, swipe.y1-swipe.y0) < 10) handleTap({x:swipe.x0,y:swipe.y0});
      swipe.active = false;
    }, { passive: false });
  }

  async function boot() {
    setHud(1, 'Loading');
    buildDomParticles();
    bindEvents();
    await preloadAssets();
    setHud(1, 'Ready');
    requestAnimationFrame(frame);
  }

  boot();
})();
