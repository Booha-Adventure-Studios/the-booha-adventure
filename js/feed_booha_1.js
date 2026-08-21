
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
//   • HUD: Keeps score and total stars visible while per-level cut feedback
//             remains in the result popup
// =====================================================

(() => {
  'use strict';

  const canvas         = document.getElementById('gameCanvas');
  const ctx            = canvas.getContext('2d');
  const startOverlay   = document.getElementById('startOverlay');
  const messageOverlay = document.getElementById('messageOverlay');
  const helpPanel      = document.getElementById('helpPanel');
  const exitConfirmOverlay = document.getElementById('exitConfirmOverlay');
  const restartConfirmOverlay = document.getElementById('restartConfirmOverlay');
  const startBtn       = document.getElementById('startBtn');
  const restartBtn     = document.getElementById('restartBtn');
  const retryBtn       = document.getElementById('retryBtn');
  const continueBtn    = document.getElementById('continueBtn');
  const nextBtn        = document.getElementById('nextBtn');
  const helpBtn        = document.getElementById('helpBtn');
  const closeHelpBtn   = document.getElementById('closeHelpBtn');
  const confirmExitBtn = document.getElementById('confirmExitBtn');
  const cancelExitBtn  = document.getElementById('cancelExitBtn');
  const bottomRestartBtn = document.getElementById('bottomRestartBtn');
  const bottomExitBtn = document.getElementById('bottomExitBtn');
  const confirmRestartBtn = document.getElementById('confirmRestartBtn');
  const cancelRestartBtn = document.getElementById('cancelRestartBtn');
  const LEVELS         = window.FEED_BOOHA_LEVELS || [];
  const levelText      = document.getElementById('levelText');
  const messageTitle   = document.getElementById('messageTitle');
  const messageText    = document.getElementById('messageText');
  const totalStarsEl   = document.getElementById('totalStars');
  const hudStarsEl     = document.getElementById('hudStars');
  const scoreTextEl    = document.getElementById('scoreText');
  const bestScoreEl    = document.getElementById('bestScoreText');
  const continueStatusEl = document.getElementById('continueStatusText');

  const GAME_ID           = 'bonus:feed_booha';
  const LEVEL_BASE_SCORE  = 1000;
  const LEVEL_STAR_BONUS  = 250;
  const EXTRA_CUT_PENALTY = 150;
  const MAX_CONTINUES     = 3;
  const TOTAL_LEVELS      = LEVELS.length;
  const DEBUG_MODE        = new URLSearchParams(window.location.search).has('debug')
    || window.FEED_BOOHA_DEBUG === true;

  let starContainer = null;
  let helpReturnFocus = null;
  let exitReturnFocus = null;
  let restartReturnFocus = null;

  const W       = canvas.width;   // 540
  const H       = canvas.height;  // 960
  const FLOOR_Y = H - 60;

  const GRAVITY            = 0.45;
  const AIR_DRAG           = 0.999;
  // Generous touch target: the visible rope is narrow, but the playable
  // slash/tap target should feel forgiving on a phone or tablet.
  const ROPE_CUT_RADIUS    = 54;
  const BOOHA_W            = 160;
  const BOOHA_H            = 160;
  const CANDY_R            = 26;
  const MOUTH_TRIGGER_DIST = 160;
  const SURPRISED_TRIGGER  = 80;
  const FAIL_BUFFER        = 36;
  const TRAIL_LENGTH       = 8;
  const TRAIL_SPEED_THRESH = 6;
  // Keep normal throws skill-based. The rescue only wakes up very late and
  // very close to Booha, so it cannot pull a bad throw across the stage.
  // v8: both assist zones used to reach well past the actual catch radius
  // (52px — see checkSuccess), so most throws were being steered in before
  // a miss was even possible. Tightened to sit just outside that radius.
  const MAGNET_DIST        = 60;
  const MAGNET_FORCE       = 0.09;
  const SAFETY_CATCH_Y     = FLOOR_Y - 50;
  const SAFETY_CATCH_DIST  = 62;
  const SAFETY_CATCH_STEER = 0.045;
  const LAST_CHANCE_DIST   = 90;
  // Fans only push while activated by a tap (see activateFan/tapObjects).
  // Full impulse while active, so a tap reads as a clear, controllable
  // shove instead of a constant ambient breeze the player never asked for.
  const FAN_FORCE          = 0.58;
  // Near-miss camera beat: the instant the safety-catch magnet first grabs
  // a throw (see applyMagnet), briefly slow time and punch the camera in
  // toward the catch point, so the save reads as a dramatic near-miss
  // instead of an invisible nudge — this is also the exact moment that
  // now costs the round a star (see starsForCuts).
  const RESCUE_FX_FRAMES     = 14;   // real frames the beat lasts
  const RESCUE_SLOWMO_SCALE  = 0.35; // time scale while the beat plays
  const RESCUE_ZOOM_MAX      = 0.05; // peak camera punch-in, tapers to 0

  const swipe        = { active: false, x0: 0, y0: 0, x1: 0, y1: 0, startX: 0, startY: 0 };
  // v7: poof effects replace slash effects
  const poofEffects  = [];
  const confetti     = [];
  const comboTexts   = [];
  const images       = {};

  const imageSources = {
    bg:           './assets/feed/feed_booha-1.png',
    booEat:       './assets/feed/boo-eat.png',
    booMouthOpen: './assets/feed/boo-mouth-open.png',
    booSad:       './assets/feed/boo-sad.png',
    booSurprised: './assets/feed/boo-surprised.png',
    booWait:      './assets/feed/boo-wait.png',
    booWin:       './assets/feed/boo-win.png',
    candy:        './assets/feed/candy.png'
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
  // Index cycles through the four shipped catch sounds.
  function playEatSound() {
    const files = ['get-1.mp3', 'get-2.mp3', 'get-3.mp3', 'get-0.mp3'];
    const src   = './assets/feed/' + files[eatSoundIndex % files.length];
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
  //
  // v8: parCuts is set equal to a level's total rope count for every one
  // of the 50 levels (see tests/feed-level-audit.cjs), and a level can't
  // be won without cutting every rope — so cutCount === par on literally
  // every legitimate clear, and the tiers above always land on 3★ by
  // themselves. The real differentiators are now the two assists below,
  // which dock a star each (floor of 1★) since a round that needed
  // rescuing wasn't actually a clean throw: using a Helper/continue
  // (state.continueAssist — a fresh attempt with a wider, stronger
  // magnet), or needing the last-second safety-catch steer near Booha's
  // mouth (state.usedSafetyCatch, set in applyMagnet()). Most players
  // never touch the Helper, so the safety-catch is the one that actually
  // gives most rounds real variation.
  // ─────────────────────────────────────────────────
  function getParCuts() {
    const lvl = state.currentLevel;
    // Fall back to 1 if level author didn't set parCuts
    return (lvl && lvl.parCuts != null) ? lvl.parCuts : 1;
  }

  function starsForCuts(cutCount, hitBounce) {
    const par = getParCuts();
    // Only penalize bounce if the level explicitly opts in
    const bouncePenalty = hitBounce && state.currentLevel && state.currentLevel.noBounce;
    let stars;
    if (bouncePenalty) {
      // Bounce disqualifies 3★ on noBounce levels
      stars = (cutCount <= par + 1) ? 2 : 1;
    } else if (cutCount <= par) {
      stars = 3;
    } else if (cutCount <= par + 1) {
      stars = 2;
    } else {
      stars = 1;
    }
    if (state.continueAssist)  stars -= 1;
    if (state.usedSafetyCatch) stars -= 1;
    return Math.max(1, Math.min(3, stars));
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
  // Bounce-chain combo readout
  // state.bounceCombo counts consecutive top-face bounce-pad launches
  // within one fall (see handleBouncePads) — a chain always ends the
  // instant the candy misses (touching the floor is itself a fail
  // condition, see checkFail), so there's no separate "reset on floor
  // touch" case to handle: buildLevel() resetting it per attempt is enough.
  // ×1 isn't shown — the popup only starts once there's an actual chain.
  // ─────────────────────────────────────────────────
  function spawnComboText(x, y, combo) {
    comboTexts.push({ x, y, vy: -1.1, life: 1.0, text: `×${combo}` });
  }

  function updateComboTexts(dt) {
    const f = dt / 16.667;
    for (let i = comboTexts.length - 1; i >= 0; i--) {
      const t = comboTexts[i];
      t.y    += t.vy * f;
      t.vy   *= 0.97;
      t.life -= 0.022 * f;
      if (t.life <= 0) comboTexts.splice(i, 1);
    }
  }

  function drawComboTexts() {
    for (const t of comboTexts) {
      const alpha = Math.max(0, Math.min(1, t.life * 1.3));
      const scale = 1 + 0.25 * (1 - Math.max(0, t.life));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(t.x, t.y);
      ctx.scale(scale, scale);
      ctx.font = 'bold 30px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
  }

  function drawDebugOverlay() {
    if (!DEBUG_MODE || !state.currentLevel || !state.candy || !state.booha) return;
    const c = state.candy;
    const m = boohaMouthPoint();
    ctx.save();
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(8, 70, 250, 112);
    ctx.fillStyle = '#9fffd0';
    const lines = [
      `DEBUG L${state.levelIndex + 1}  cuts:${state.cutCount}`,
      `candy ${Math.round(c.x)},${Math.round(c.y)} v:${c.vx.toFixed(1)},${c.vy.toFixed(1)}`,
      `booha ${Math.round(state.booha.x)} mouth:${Math.round(m.x)},${Math.round(m.y)}`,
      `attached:${c.attached} ropes:${state.ropes.filter(r => !r.cut).length}`,
      `pending:${state.ropes.filter(r => r.pending).length} dist:${Math.round(Math.hypot(c.x-m.x,c.y-m.y))}`
    ];
    lines.forEach((line, i) => ctx.fillText(line, 16, 78 + i * 19));

    ctx.strokeStyle = 'rgba(120,255,220,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,120,180,0.65)';
    ctx.beginPath(); ctx.arc(m.x, m.y, 52, 0, Math.PI * 2); ctx.stroke();
    for (const obj of state.objects) {
      if (obj.type === 'bounce') {
        ctx.strokeStyle = 'rgba(255,230,100,0.7)';
        ctx.strokeRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height);
      }
      if (obj.type === 'fan') {
        ctx.strokeStyle = 'rgba(120,180,255,0.7)';
        ctx.beginPath(); ctx.arc(obj.x, obj.y, 48, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
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
    pendingSuccessTimeout: null, pendingFailTimeout: null,
    bouncePattern: null,
    shakeFrames: 0, shakeAmt: 0,
    rescueFxFrames: 0, rescueFxX: 0, rescueFxY: 0,
    bounceCombo: 0,
    trail: [],
    lastChanceFired: false, boohaJumpOffset: 0, boohaJumpFrame: 0,
    boohaJumpTotal: 16, boohaJumpAmt: 1,
    cutTimers: {}, missDir: 0, fallSoundPlayed: false,
    perfectTextLife: 0,
    levelStartedAt: 0,
    campaignStartedAt: 0,
    campaignScore: 0,
    campaignStars: 0,
    campaignComplete: false,
    continuesLeft: MAX_CONTINUES,
    continueAssist: false,
    usedSafetyCatch: false
  };

  const DEFAULT_PROGRESS = () => ({
    version: 1,
    currentLevel: 0,
    currentScore: 0,
    currentStars: 0,
    bestScore: 0,
    totalStars: 0,
    levelStars: {},
    levelScores: {},
    completedLevels: [],
    attempts: 0,
    campaignComplete: false,
    continuesChapter: 1,
    continuesLeft: MAX_CONTINUES,
    lastPlayedAt: null
  });

  let feedProgress = DEFAULT_PROGRESS();
  let persistenceReady = false;

  function getSaveSystem() {
    try {
      return window.BoohaAdventure && BoohaAdventure.save;
    } catch (e) {
      return null;
    }
  }

  function getScoreSystem() {
    try {
      return window.BoohaScoreSystem || (window.BoohaAdventure && BoohaAdventure.scores);
    } catch (e) {
      return null;
    }
  }

  function levelKey(index) {
    const level = LEVELS[index];
    return String(level && level.id != null ? level.id : index + 1);
  }

  function normalizeProgress(raw) {
    const next = Object.assign(DEFAULT_PROGRESS(), raw || {});
    next.levelStars = Object.assign({}, raw && raw.levelStars);
    next.levelScores = Object.assign({}, raw && raw.levelScores);
    next.completedLevels = Array.isArray(next.completedLevels)
      ? next.completedLevels.map(Number).filter(Number.isFinite)
      : [];
    next.currentLevel = Math.max(0, Math.min(Math.max(0, TOTAL_LEVELS - 1), Number(next.currentLevel) || 0));
    next.currentScore = Math.max(0, Number(next.currentScore) || 0);
    next.currentStars = Math.max(0, Number(next.currentStars) || 0);
    next.bestScore = Math.max(0, Number(next.bestScore) || 0);
    next.totalStars = Math.max(0, Number(next.totalStars) || 0);
    next.attempts = Math.max(0, Number(next.attempts) || 0);
    next.continuesChapter = Math.max(1, Number(next.continuesChapter) || 1);
    next.continuesLeft = Math.max(0, Math.min(MAX_CONTINUES, Number(next.continuesLeft) || 0));
    return next;
  }

  function readFeedProgress() {
    const save = getSaveSystem();
    if (!save || typeof save.load !== 'function') return DEFAULT_PROGRESS();
    try {
      const data = save.load();
      return normalizeProgress(data && data.stats && data.stats.feed_booha);
    } catch (e) {
      console.warn('[Feed Booha] Progress load failed:', e);
      return DEFAULT_PROGRESS();
    }
  }

  function writeFeedProgress() {
    const save = getSaveSystem();
    if (!save || typeof save.load !== 'function' || typeof save.save !== 'function') return false;
    try {
      const data = save.load();
      if (!data.stats || typeof data.stats !== 'object') data.stats = {};
      data.stats.feed_booha = normalizeProgress(feedProgress);
      return save.save(data);
    } catch (e) {
      console.warn('[Feed Booha] Progress save failed:', e);
      return false;
    }
  }

  function setBilingual(element, english, japanese) {
    if (!element) return;
    element.replaceChildren();
    const en = document.createElement('span');
    en.className = 'bilingual-en';
    en.textContent = english;
    const ja = document.createElement('span');
    ja.className = 'bilingual-ja';
    ja.textContent = japanese;
    element.append(en, ja);
  }

  function setButtonLabel(button, english, japanese) {
    if (!button) return;
    button.replaceChildren();
    const en = document.createElement('span');
    en.className = 'button-en';
    en.textContent = english;
    const ja = document.createElement('span');
    ja.className = 'button-ja';
    ja.textContent = japanese;
    button.append(en, ja);
    if (english === 'Next' || english === 'Play Again') {
      button.append(document.createTextNode(' ▶'));
    }
  }

  function syncProgressHud() {
    if (scoreTextEl) {
      const nextScore = Math.round(state.campaignScore || 0);
      const prevScore = Number(scoreTextEl.textContent) || 0;
      scoreTextEl.textContent = String(nextScore);
      // v8: give the score a little punch when it actually goes up, so the
      // board reads as alive instead of a number that silently changes.
      if (nextScore > prevScore) {
        scoreTextEl.classList.remove('score-pop');
        void scoreTextEl.offsetWidth; // restart the animation
        scoreTextEl.classList.add('score-pop');
      }
    }
    if (totalStarsEl) totalStarsEl.textContent = String(feedProgress.totalStars || 0);
    const bestScore = Math.round(feedProgress.bestScore || 0);
    setBilingual(bestScoreEl, `Best score: ${bestScore}`, `ベストスコア: ${bestScore}`);
    setBilingual(continueStatusEl,
      `Helpers left: ${state.continuesLeft} / ${MAX_CONTINUES}`,
      `のこりのたすけ: ${state.continuesLeft} / ${MAX_CONTINUES}`);
  }

  function chapterForLevel(index) {
    return Math.floor(index / 10) + 1;
  }

  function ensureChapterContinues(index) {
    const chapter = chapterForLevel(index);
    if (feedProgress.continuesChapter !== chapter) {
      feedProgress.continuesChapter = chapter;
      feedProgress.continuesLeft = MAX_CONTINUES;
    }
    state.continuesLeft = Math.max(0, Math.min(MAX_CONTINUES, Number(feedProgress.continuesLeft) || 0));
    syncProgressHud();
  }

  function hydrateProgress() {
    if (persistenceReady) return;
    feedProgress = readFeedProgress();
    const scores = getScoreSystem();
    if (scores && typeof scores.getHighScore === 'function') {
      feedProgress.bestScore = Math.max(
        feedProgress.bestScore,
        Number(scores.getHighScore(GAME_ID)) || 0
      );
    }
    if (feedProgress.campaignComplete) feedProgress.currentLevel = 0;
    state.levelIndex = feedProgress.currentLevel;
    state.campaignScore = feedProgress.currentScore;
    state.campaignStars = feedProgress.currentStars;
    state.campaignComplete = !!feedProgress.campaignComplete;
    ensureChapterContinues(state.levelIndex);
    persistenceReady = true;
    syncProgressHud();
  }

  document.addEventListener('booha:ready', hydrateProgress, { once: true });
  if (window.BOOHA_READY) hydrateProgress();

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
    for (const id of state.effectTimers) clearTimeout(id);
    state.effectTimers = [];
    for (const id of Object.values(state.cutTimers)) clearTimeout(id);
    state.cutTimers = {};
  }

  function setHud(lvl, englishStatus, japaneseStatus = '') {
    if (levelText) levelText.textContent = String(lvl);
  }

  // v7: HUD shows "Cuts: X / par" live during play
  function setHudCuts() {
    const par = getParCuts();
    setHud(
      state.levelIndex + 1,
      `Cuts ${state.cutCount} · Goal ${par}`,
      `カット ${state.cutCount} · 目標 ${par}`
    );
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
    if (hudStarsEl) {
      hudStarsEl.classList.add('star-flash');
      setTimeout(() => hudStarsEl.classList.remove('star-flash'), 600);
    }
  }

  function calculateLevelScore(cutCount, stars) {
    const extraCuts = Math.max(0, cutCount - getParCuts());
    return Math.max(
      100,
      LEVEL_BASE_SCORE + stars * LEVEL_STAR_BONUS - extraCuts * EXTRA_CUT_PENALTY
    );
  }

  function persistRoundResult(stars, levelScore) {
    state.campaignScore += levelScore;
    state.campaignStars += stars;
    state.campaignComplete = state.levelIndex >= TOTAL_LEVELS - 1;

    if (!persistenceReady) {
      syncProgressHud();
      return;
    }

    const key = levelKey(state.levelIndex);
    const previousBestStars = Number(feedProgress.levelStars[key]) || 0;
    const previousBestScore = Number(feedProgress.levelScores[key]) || 0;

    feedProgress.levelStars[key] = Math.max(previousBestStars, stars);
    feedProgress.levelScores[key] = Math.max(previousBestScore, levelScore);
    feedProgress.totalStars = Object.values(feedProgress.levelStars)
      .reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (!feedProgress.completedLevels.includes(state.levelIndex + 1)) {
      feedProgress.completedLevels.push(state.levelIndex + 1);
    }
    feedProgress.currentLevel = state.campaignComplete ? 0 : state.levelIndex + 1;
    feedProgress.currentScore = state.campaignScore;
    feedProgress.currentStars = state.campaignStars;
    feedProgress.campaignComplete = state.campaignComplete;
    feedProgress.lastPlayedAt = Date.now();

    const scores = getScoreSystem();
    if (scores && typeof scores.submit === 'function') {
      const elapsed = state.campaignComplete && state.campaignStartedAt
        ? performance.now() - state.campaignStartedAt
        : null;
      document.dispatchEvent(new CustomEvent('booha:gameEnd', {
        detail: {
          saveId: GAME_ID,
          score: state.campaignScore,
          completed: state.campaignComplete,
          time: elapsed
        }
      }));
      feedProgress.bestScore = Math.max(
        feedProgress.bestScore,
        Number(scores.getHighScore(GAME_ID)) || 0
      );
    }

    feedProgress.bestScore = Math.max(feedProgress.bestScore, state.campaignScore);
    writeFeedProgress();
    syncProgressHud();
  }

  // ─────────────────────────────────────────────────
  // Level build
  // ─────────────────────────────────────────────────
  function buildLevel(index, options = {}) {
    stopAllTimers();
    poofEffects.length = 0;
    confetti.length    = 0;
    comboTexts.length  = 0;
    state.trail.length = 0;

    const rawLevel = LEVELS[index] || LEVELS[0];
    if (!rawLevel) { console.error('No levels.'); return; }
    const level = cloneLevel(rawLevel);

    state.currentLevel    = level;
    state.cutCount        = 0;
    state.hitBounce       = false;
    state.usedSafetyCatch = false;
    state.won             = false;
    state.lost            = false;
    state.missDir         = 0;
    state.running         = true;
    state.boohaSprite     = 'booWait';
    state.effectTimers    = [];
    state.cutTimers       = {};
    state.bounceCooldown  = 0;
    state.shakeFrames     = 0;
    state.rescueFxFrames  = 0;
    state.bounceCombo     = 0;
    state.lastChanceFired = false;
    state.boohaJumpOffset = 0;
    state.boohaJumpFrame  = 0;
    state.boohaJumpTotal  = 16;
    state.boohaJumpAmt    = 1;
    state.fallSoundPlayed = false;
    state.perfectTextLife = 0;
    state.continueAssist = !!options.assist;

    ensureChapterContinues(index);

    const ropeCount = (level.ropes || []).length;
    let kickVx;
    if (typeof level.launchVx === 'number') {
      kickVx = level.launchVx;
    } else if (ropeCount >= 2) {
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
      releaseAt: 0,
      length:  Math.hypot(level.candy.x - r.anchor.x, level.candy.y - r.anchor.y)
    }));

    state.objects = (level.objects || []).map(o => ({
      ...o,
      activated: false,
      fanTimer: 0,
      used: false
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

    state.levelStartedAt = performance.now();
    if (persistenceReady) {
      feedProgress.attempts++;
      feedProgress.lastPlayedAt = Date.now();
      writeFeedProgress();
    }
    syncProgressHud();
    setHud(
      index + 1,
      options.assist ? 'Helper' : 'Ready',
      options.assist ? 'たすけモード' : '準備OK'
    );
  }

  // ─────────────────────────────────────────────────
  // Flow
  // ─────────────────────────────────────────────────
  function startGame() {
    if (!LEVELS.length) return;
    if (state.campaignComplete) {
      state.levelIndex = 0;
      state.campaignScore = 0;
      state.campaignStars = 0;
      state.campaignComplete = false;
      feedProgress.currentLevel = 0;
      feedProgress.currentScore = 0;
      feedProgress.currentStars = 0;
      feedProgress.campaignComplete = false;
      writeFeedProgress();
    }
    state.started = true;
    state.campaignStartedAt = performance.now();
    startOverlay.classList.remove('overlay--show');
    startOverlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => { startOverlay.style.display = 'none'; }, 300);
    buildLevel(state.levelIndex);
  }

  function resetLevel() { buildLevel(state.levelIndex); }

  function useContinue() {
    if (state.continuesLeft <= 0 || state.won) return;
    state.continuesLeft--;
    feedProgress.continuesLeft = state.continuesLeft;
    feedProgress.lastPlayedAt = Date.now();
    writeFeedProgress();
    hideMessage();
    // A helper is a protected restart: Booha's pull is stronger for this attempt.
    buildLevel(state.levelIndex, { assist: true });
  }

  function resetCampaign() {
    state.levelIndex = 0;
    state.campaignScore = 0;
    state.campaignStars = 0;
    state.campaignComplete = false;
    state.campaignStartedAt = performance.now();
    feedProgress.currentLevel = 0;
    feedProgress.currentScore = 0;
    feedProgress.currentStars = 0;
    feedProgress.campaignComplete = false;
    writeFeedProgress();
    hideMessage();
    buildLevel(0);
  }

  function nextLevel() {
    if (state.campaignComplete) {
      resetCampaign();
      return;
    }
    state.levelIndex++;
    hideMessage();
    buildLevel(state.levelIndex);
  }

  function showMessage(title, text, nextVisible = true, cutCount = 0, hitBounce = false) {
    setBilingual(messageTitle, title.en, title.ja);
    setBilingual(messageText, text.en, text.ja);
    const stars = starsForCuts(cutCount, hitBounce);
    nextBtn.style.display  = nextVisible ? 'inline-flex' : 'none';
    nextBtn.classList.toggle('message-primary', nextVisible);
    if (continueBtn) continueBtn.style.display = 'none';
    if (continueStatusEl) continueStatusEl.style.display = 'none';
    setButtonLabel(nextBtn,
      state.campaignComplete ? 'Play Again' : 'Next',
      state.campaignComplete ? 'もう一度' : '次へ');
    retryBtn.style.display = (!nextVisible || stars < 3) ? 'inline-flex' : 'none';
    retryBtn.classList.toggle('retry-centered', nextVisible || state.continuesLeft <= 0);
    if (nextVisible) showStars(cutCount, hitBounce);
    else if (starContainer) starContainer.innerHTML = '';
    messageOverlay.classList.add('overlay--show');
    messageOverlay.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => (nextVisible ? nextBtn : retryBtn).focus(), 0);
  }

  function showFailureMessage() {
    setBilingual(messageTitle, 'Oops!', 'ざんねん！');
    setBilingual(messageText,
      'Booha missed the candy. Retry for free, or use a helper to make this level easier.',
      'ブーハーがキャンディを逃がしたよ。無料でもう一度やるか、たすけモードでこのレベルをかんたんにできるよ。');
    nextBtn.style.display = 'none';
    nextBtn.classList.remove('message-primary');
    retryBtn.style.display = 'inline-flex';
    retryBtn.classList.toggle('retry-centered', state.continuesLeft <= 0);
    if (continueBtn) continueBtn.style.display = state.continuesLeft > 0 ? 'inline-flex' : 'none';
    if (continueStatusEl) {
      setBilingual(continueStatusEl,
        `Helpers left: ${state.continuesLeft} / ${MAX_CONTINUES}`,
        `のこりのたすけ: ${state.continuesLeft} / ${MAX_CONTINUES}`);
      continueStatusEl.style.display = 'block';
    }
    if (starContainer) starContainer.innerHTML = '';
    messageOverlay.classList.add('overlay--show');
    messageOverlay.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => (state.continuesLeft > 0 ? continueBtn : retryBtn).focus(), 0);
  }

  function hideMessage() {
    messageOverlay.classList.remove('overlay--show');
    messageOverlay.setAttribute('aria-hidden', 'true');
  }

  function toggleHelp(show) {
    if (show) {
      helpReturnFocus = document.activeElement;
      helpPanel.classList.add('help-panel--show');
      helpPanel.setAttribute('aria-hidden', 'false');
      window.setTimeout(() => closeHelpBtn.focus(), 0);
      return;
    }
    helpPanel.classList.toggle('help-panel--show', show);
    helpPanel.setAttribute('aria-hidden', String(!show));
    if (helpReturnFocus && typeof helpReturnFocus.focus === 'function') {
      window.setTimeout(() => helpReturnFocus.focus(), 0);
    }
  }

  function toggleExitConfirm(show) {
    if (!exitConfirmOverlay) return;
    if (show) {
      exitReturnFocus = document.activeElement;
      exitConfirmOverlay.classList.add('overlay--show');
      exitConfirmOverlay.setAttribute('aria-hidden', 'false');
      window.setTimeout(() => cancelExitBtn.focus(), 0);
      return;
    }
    exitConfirmOverlay.classList.toggle('overlay--show', show);
    exitConfirmOverlay.setAttribute('aria-hidden', String(!show));
    if (exitReturnFocus && typeof exitReturnFocus.focus === 'function') {
      window.setTimeout(() => exitReturnFocus.focus(), 0);
    }
  }

  function requestExit() {
    toggleExitConfirm(true);
  }

  function confirmExit() {
    window.location.href = 'karasuki.html?room=room_10';
  }

  function toggleRestartConfirm(show) {
    if (!restartConfirmOverlay) return;
    if (show) {
      restartReturnFocus = document.activeElement;
      restartConfirmOverlay.classList.add('overlay--show');
      restartConfirmOverlay.setAttribute('aria-hidden', 'false');
      window.setTimeout(() => cancelRestartBtn.focus(), 0);
      return;
    }
    restartConfirmOverlay.classList.remove('overlay--show');
    restartConfirmOverlay.setAttribute('aria-hidden', 'true');
    if (restartReturnFocus && typeof restartReturnFocus.focus === 'function') {
      window.setTimeout(() => restartReturnFocus.focus(), 0);
    }
  }

  function requestRestartGame() {
    toggleRestartConfirm(true);
  }

  function confirmRestartGame() {
    toggleRestartConfirm(false);
    resetCampaign();
  }

  // A pending delayed rope has been requested, but it still holds the candy
  // until its release timer fires. Excluding it here makes delayed ropes
  // release immediately and only delays their visual cleanup.
  function getActiveRopes() { return state.ropes.filter(r => !r.cut); }

  // ─────────────────────────────────────────────────
  // Booha movement
  // ─────────────────────────────────────────────────
  // Starts (or restarts) a Booha hop: `frames` sets how long it lasts,
  // `amt` scales how high it goes (1 = the original last-chance-save
  // hop height). Used both for the last-chance surprise jump and for the
  // per-star-count celebration hop in checkSuccess(), so one curve drives
  // every "Booha physically reacts" moment instead of duplicating it.
  function triggerBoohaHop(frames, amt) {
    state.boohaJumpFrame = frames;
    state.boohaJumpTotal = frames;
    state.boohaJumpAmt   = amt;
  }

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
      const p = 1 - state.boohaJumpFrame / state.boohaJumpTotal;
      state.boohaJumpOffset = -18 * state.boohaJumpAmt * Math.sin(p * Math.PI);
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

  function applyMagnet(dt) {
    if (!state.booha || state.won || state.lost) return;
    const k = dt ? dt / 16.667 : 1;
    const c = state.candy, m = boohaMouthPoint();
    const dx = m.x - c.x, dy = m.y - c.y, dist = Math.hypot(dx, dy);
    if (c.y >= SAFETY_CATCH_Y && dist > 0 && dist <= SAFETY_CATCH_DIST) {
      // Last-second rescue is a small near-floor nudge, not a homing vector:
      // it ADDS a gentle pull on top of the player's real velocity instead
      // of replacing it, so a genuinely bad throw can still miss.
      const steer = SAFETY_CATCH_STEER * k;
      c.vx += dx * steer;
      c.vy += dy * steer;
      if (!state.usedSafetyCatch) {
        // First frame of the rescue only — fire the beat once per attempt,
        // centered on the midpoint of the catch so it reads as "zooming in
        // on the save" rather than snapping toward either point.
        state.rescueFxFrames = RESCUE_FX_FRAMES;
        state.rescueFxX = (c.x + m.x) / 2;
        state.rescueFxY = (c.y + m.y) / 2;
      }
      state.usedSafetyCatch = true;
      return;
    }
    const magnetDist = state.continueAssist ? MAGNET_DIST * 1.35 : MAGNET_DIST;
    const magnetForce = state.continueAssist ? MAGNET_FORCE * 1.35 : MAGNET_FORCE;
    if (dist > magnetDist || dist < 1) return;
    const str = magnetForce * (1 - dist / magnetDist) * k;
    c.vx += (dx/dist) * str; c.vy += (dy/dist) * str;
  }

  function updateFreeCandy(dt) {
    const c = state.candy;
    const k = dt ? dt / 16.667 : 1;
    c.vy += GRAVITY * k; c.x += c.vx * k; c.y += c.vy * k;
    c.vx *= Math.pow(AIR_DRAG, k); c.vy *= Math.pow(AIR_DRAG, k);
    // Screen edges are part of the puzzle: a wide miss can rebound and still
    // be recovered with a well-timed throw, while a near miss remains fair.
    if (c.x < c.r) {
      c.x = c.r;
      if (c.vx < 0) c.vx = Math.abs(c.vx) * 0.82;
    } else if (c.x > W - c.r) {
      c.x = W - c.r;
      if (c.vx > 0) c.vx = -Math.abs(c.vx) * 0.82;
    }
  }

  function updateFans(dt) {
    const c = state.candy;
    if (!c || c.attached) return;
    for (const obj of state.objects) {
      if (obj.type !== 'fan' || obj.fanTimer <= 0) continue;
      const f = FAN_FORCE * (dt / 16.667);
      if (obj.direction === 'right') c.vx += f;
      else if (obj.direction === 'left')  c.vx -= f;
      else if (obj.direction === 'up')    c.vy -= f * 1.2;
      obj.fanTimer -= dt;
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

  // Swept point-vs-box test: finds where the segment (x0,y0)-(x1,y1) first
  // enters the box [left,right]x[top,bottom], if it does. Returns the entry
  // fraction t and which face was crossed (nx/ny is the outward normal of
  // that face), or null if the segment never enters the box. This replaces
  // a "did we land on the top edge this exact frame" check, which missed
  // fast/diagonal approaches (candy's center can jump clean across a pad's
  // width in one physics step) and had no notion of the other three faces
  // at all, so candy arriving from the side or from underneath just passed
  // through with no collision.
  function sweptBoxHit(x0, y0, x1, y1, left, right, top, bottom) {
    const dx = x1 - x0, dy = y1 - y0;
    let tMin = 0, tMax = 1, nx = 0, ny = 0;

    if (dx !== 0) {
      const tx1 = (left - x0) / dx, tx2 = (right - x0) / dx;
      const txEnter = Math.min(tx1, tx2), txExit = Math.max(tx1, tx2);
      if (txEnter > tMin) { tMin = txEnter; nx = dx > 0 ? -1 : 1; ny = 0; }
      tMax = Math.min(tMax, txExit);
    } else if (x0 <= left || x0 >= right) {
      return null;
    }

    if (dy !== 0) {
      const ty1 = (top - y0) / dy, ty2 = (bottom - y0) / dy;
      const tyEnter = Math.min(ty1, ty2), tyExit = Math.max(ty1, ty2);
      if (tyEnter > tMin) { tMin = tyEnter; nx = 0; ny = dy > 0 ? -1 : 1; }
      tMax = Math.min(tMax, tyExit);
    } else if (y0 <= top || y0 >= bottom) {
      return null;
    }

    if (tMin > tMax || tMin < 0 || tMin > 1) return null;
    if (nx === 0 && ny === 0) return null; // started inside; nothing to resolve
    return { t: tMin, nx, ny };
  }

  function handleBouncePads() {
    if (state.bounceCooldown > 0) state.bounceCooldown--;
    const c = state.candy;
    if (!c || c.attached) return;
    const prevX = c.x - c.vx, prevY = c.y - c.vy;
    for (const obj of state.objects) {
      if (obj.type !== 'bounce' || obj.used) continue;
      // Expand the box by the candy's radius so we can test the swept
      // *center point* against it (Minkowski-sum trick) instead of trying
      // to sweep a full circle, which keeps this a simple line-vs-box test.
      const halfW = obj.width / 2 + c.r, halfH = obj.height / 2 + c.r;
      const hit = sweptBoxHit(prevX, prevY, c.x, c.y,
        obj.x - halfW, obj.x + halfW, obj.y - halfH, obj.y + halfH);
      if (!hit) continue;

      if (hit.ny === -1) {
        // Landed on the top face — the pad's actual launch mechanic.
        obj.used = true;
        c.y = obj.y - obj.height / 2 - c.r;
        c.vy = -Math.max(10, Math.abs(c.vy) * 0.95);
        c.vx = c.vx * 1.02 + (obj.pushX || 0);
        // Only flag hitBounce if level cares about it (noBounce levels)
        if (state.currentLevel && state.currentLevel.noBounce) {
          state.hitBounce = true;
        }
        state.bounceCombo++;
        if (state.bounceCombo >= 2) {
          spawnComboText(obj.x, obj.y - obj.height / 2 - c.r - 14, state.bounceCombo);
        }
      } else if (hit.ny === 1) {
        // Bonked the underside — it's a solid block, not a landing pad:
        // stop the rise and let the candy fall back, don't consume the pad.
        c.y = obj.y + obj.height / 2 + c.r;
        c.vy = Math.abs(c.vy) * 0.5;
      } else if (hit.nx === -1) {
        c.x = obj.x - obj.width / 2 - c.r;
        c.vx = -Math.abs(c.vx) * 0.82;
      } else if (hit.nx === 1) {
        c.x = obj.x + obj.width / 2 + c.r;
        c.vx = Math.abs(c.vx) * 0.82;
      }

      if (state.bounceCooldown <= 0) {
        playSfxBounce();
        state.shakeFrames = 7; state.shakeAmt = hit.ny === -1 ? 3 : 2;
        state.bounceCooldown = 8;
      }
    }
  }

  function checkLastChance() {
    if (state.lastChanceFired || state.won || state.lost) return;
    const c = state.candy;
    if (!c || c.attached) return;
    if (c.y + c.r >= FLOOR_Y - LAST_CHANCE_DIST && c.vy > 0) {
      state.lastChanceFired = true;
      triggerBoohaHop(16, 1);
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
    const levelScore = calculateLevelScore(cuts, stars);
    persistRoundResult(stars, levelScore);

    // Reaction intensity scales with the star grade, so a clean 3★ throw
    // reads as a real celebration and a scraped-through 1★ reads calmer —
    // distinct from each other, not just a different HUD number.
    if (stars === 3) {
      spawnConfetti(m.x, m.y);
      state.shakeFrames = 18;
      state.shakeAmt    = 4;
      playSfxPerfect();
      triggerBoohaHop(26, 1.6);
    } else if (stars === 2) {
      state.shakeFrames = 8;
      state.shakeAmt    = 2;
      triggerBoohaHop(16, 1);
    }
    // 1★: no shake, no hop — a plain, relieved catch rather than a party.

    state.pendingSuccessTimeout = setTimeout(() => {
      state.boohaSprite = 'booWin';
      if (stars < 3) playSfxWin();
      const chapterComplete = (state.levelIndex + 1) % 10 === 0;
      let title;
      let text;
      if (state.campaignComplete) {
        title = { en: 'Campaign Clear!', ja: 'キャンペーンクリア！' };
        text = {
          en: `Score: ${Math.round(state.campaignScore)} · Best: ${Math.round(feedProgress.bestScore)} · Stars: ${state.campaignStars}`,
          ja: `スコア: ${Math.round(state.campaignScore)} · ベスト: ${Math.round(feedProgress.bestScore)} · スター: ${state.campaignStars}`
        };
      } else if (chapterComplete) {
        const chapter = Math.floor(state.levelIndex / 10) + 1;
        title = { en: `Chapter ${chapter} Clear!`, ja: `チャプター${chapter}クリア！` };
        text = {
          en: `Score: ${Math.round(state.campaignScore)} · Best: ${Math.round(feedProgress.bestScore)} · Stars: ${state.campaignStars}`,
          ja: `スコア: ${Math.round(state.campaignScore)} · ベスト: ${Math.round(feedProgress.bestScore)} · スター: ${state.campaignStars}`
        };
      } else {
        title = stars === 3
          ? { en: 'Perfect!', ja: 'パーフェクト！' }
          : stars === 2
            ? { en: 'Tasty!', ja: 'おいしい！' }
            : { en: 'Good job!', ja: 'よくできた！' };
        // Flavor text also varies by star count now, not just the title —
        // pairs with the hop/shake intensity above for a reaction that
        // actually differs by outcome instead of always being the same line.
        text = stars === 3
          ? { en: 'Booha does a happy dance!', ja: 'ブーハーが よろこんで ダンス！' }
          : stars === 2
            ? { en: 'Booha licks his lips!', ja: 'ブーハーが したをぺろり！' }
            : { en: 'Booha caught it just in time!', ja: 'ブーハーが ぎりぎりキャッチ！' };
      }
      showMessage(title, text, true, cuts, hitBounce);
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
    setHud(state.levelIndex + 1, 'Miss', 'ミス');
    playSfxMiss();
    state.pendingFailTimeout = setTimeout(() => {
      showFailureMessage();
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
      rope.releaseAt = performance.now() + rope.delayMs;
      state.cutCount++;
      playSfxCut();
      if (navigator.vibrate) navigator.vibrate(40);
      setHudCuts();
      const id = setTimeout(() => {
        rope.cut = true; rope.pending = false; rope.releaseAt = 0;
        spawnPoofAtRope(rope);
        if (!getActiveRopes().length) state.candy.attached = false;
      }, rope.delayMs);
      state.cutTimers[rope.id] = id;
      return true;
    }
    rope.cut = true; state.cutCount++;
    spawnPoofAtRope(rope);
    playSfxCut();
    if (navigator.vibrate) navigator.vibrate(40);
    if (!getActiveRopes().length) state.candy.attached = false;
    setHudCuts();
    return true;
  }

  function ropeCurvePoint(rope, t) {
    const c = state.candy;
    const ax = rope.anchor.x, ay = rope.anchor.y;
    const bx = c.x, by = c.y;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const straightD = Math.hypot(bx - ax, by - ay);
    const slack = Math.max(0, (rope.length || straightD) - straightD);
    const sagY = Math.min(slack * 0.5 + straightD * 0.08, 70);
    const u = 1 - t;
    return {
      x: u * u * ax + 2 * u * t * mx + t * t * bx,
      y: u * u * ay + 2 * u * t * (my + sagY) + t * t * by
    };
  }

  function distanceToRopePath(x, y, rope) {
    let best = Infinity;
    let previous = ropeCurvePoint(rope, 0);
    for (let i = 1; i <= 12; i++) {
      const current = ropeCurvePoint(rope, i / 12);
      best = Math.min(best, distPtSeg(x, y, previous.x, previous.y, current.x, current.y));
      previous = current;
    }
    return best;
  }

  function distanceBetweenSegments(ax, ay, bx, by, cx, cy, dx, dy) {
    if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
    return Math.min(
      distPtSeg(ax, ay, cx, cy, dx, dy),
      distPtSeg(bx, by, cx, cy, dx, dy),
      distPtSeg(cx, cy, ax, ay, bx, by),
      distPtSeg(dx, dy, ax, ay, bx, by)
    );
  }

  function cutNearestRope(mx, my) {
    if (!state.currentLevel || state.won || state.lost) return;
    const active = state.ropes.filter(r => !r.cut && !r.pending);
    if (!active.length) return;
    let best = null, bestD = Infinity;
    for (const rope of active) {
      const d = distanceToRopePath(mx, my, rope);
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
      const crossed = segmentsIntersect(swipe.x0, swipe.y0, swipe.x1, swipe.y1,
        rope.anchor.x, rope.anchor.y, state.candy.x, state.candy.y);
      let closeToCurve = false;
      let previous = ropeCurvePoint(rope, 0);
      for (let i = 1; i <= 12 && !closeToCurve; i++) {
        const current = ropeCurvePoint(rope, i / 12);
        closeToCurve = distanceBetweenSegments(
          swipe.x0, swipe.y0, swipe.x1, swipe.y1,
          previous.x, previous.y, current.x, current.y
        ) <= ROPE_CUT_RADIUS;
        previous = current;
      }
      if (crossed || closeToCurve) tryCutRope(rope);
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
    updateComboTexts(dt);
    if (state.shakeFrames > 0) state.shakeFrames--;
    if (state.running) {
      if (state.candy.attached) {
        updateAttachedCandy(dt);
      } else {
        checkFallSound();
        applyMagnet(dt);
        updateFreeCandy(dt);
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
    // Clear in the untransformed frame first — the rescue zoom below only
    // ever scales content *up*, so clearing before it applies keeps the
    // full canvas covered regardless of zoom.
    ctx.clearRect(-10,-10,W+20,H+20);
    if (state.rescueFxFrames > 0) {
      const p    = state.rescueFxFrames / RESCUE_FX_FRAMES; // 1 → 0
      const ease = Math.sin(p * Math.PI / 2);                // eased taper
      const zoom = 1 + RESCUE_ZOOM_MAX * ease;
      ctx.translate(state.rescueFxX, state.rescueFxY);
      ctx.scale(zoom, zoom);
      ctx.translate(-state.rescueFxX, -state.rescueFxY);
    }
    if (!state.currentLevel) { ctx.restore(); return; }
    drawFloor();
    drawObjects();
    drawRopes();
    drawPoofEffects();   // v7: poof instead of slash, drawn behind candy
    drawTrail();
    drawCandy();
    drawBooha();
    drawConfetti();
    drawComboTexts();
    drawDebugOverlay();
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
    const rawDt = state.lastTime ? Math.min(ts - state.lastTime, 50) : 16.67;
    state.lastTime = ts;
    // While the near-miss beat is playing, stretch time briefly so the
    // save reads as a beat, not a blip — draw() reads rescueFxFrames for
    // its own zoom-taper below, so decrement after drawing this frame.
    const rescueActive = state.rescueFxFrames > 0;
    const dt = rescueActive ? rawDt * RESCUE_SLOWMO_SCALE : rawDt;
    update(dt);
    draw();
    if (rescueActive) state.rescueFxFrames--;
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
    continueBtn?.addEventListener('click', useContinue);
    nextBtn.addEventListener('click', nextLevel);
    helpBtn.addEventListener('click', () => toggleHelp(true));
    closeHelpBtn.addEventListener('click', () => toggleHelp(false));
    document.getElementById('startExitBtn')?.addEventListener('click', requestExit);
    bottomExitBtn?.addEventListener('click', requestExit);
    bottomRestartBtn?.addEventListener('click', requestRestartGame);
    confirmExitBtn?.addEventListener('click', confirmExit);
    cancelExitBtn?.addEventListener('click', () => toggleExitConfirm(false));
    confirmRestartBtn?.addEventListener('click', confirmRestartGame);
    cancelRestartBtn?.addEventListener('click', () => toggleRestartConfirm(false));
    // Pointer events unify touch, stylus, and mouse. A short press is a tap;
    // any longer stroke is treated as a slash across the rope path.
    canvas.addEventListener('pointerdown', evt => {
      if (!state.started) return;
      evt.preventDefault();
      canvas.setPointerCapture?.(evt.pointerId);
      const p = getCanvasPoint(evt);
      swipe.active = true;
      swipe.startX = swipe.x0 = swipe.x1 = p.x;
      swipe.startY = swipe.y0 = swipe.y1 = p.y;
    });
    canvas.addEventListener('pointermove', evt => {
      if (!state.started || !swipe.active) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      swipe.x1 = p.x; swipe.y1 = p.y;
      checkSwipeCuts();
      swipe.x0 = p.x; swipe.y0 = p.y;
    });
    const finishPointerStroke = evt => {
      if (!swipe.active) return;
      evt.preventDefault();
      const p = getCanvasPoint(evt);
      swipe.x1 = p.x; swipe.y1 = p.y;
      checkSwipeCuts();
      if (Math.hypot(swipe.x1 - swipe.startX, swipe.y1 - swipe.startY) < 14) {
        handleTap({ x: swipe.x1, y: swipe.y1 });
      }
      swipe.active = false;
    };
    canvas.addEventListener('pointerup', finishPointerStroke);
    canvas.addEventListener('pointercancel', finishPointerStroke);
  }

  async function boot() {
    setHud(1, 'Loading', '読み込み中');
    buildDomParticles();
    bindEvents();
    await preloadAssets();
    setHud(1, 'Ready', '準備OK');
    requestAnimationFrame(frame);
  }

  if (DEBUG_MODE) {
    window.FEED_BOOHA_DEBUG_STATE = () => ({
      levelIndex: state.levelIndex,
      levelId: state.currentLevel && state.currentLevel.id,
      cutCount: state.cutCount,
      candy: state.candy && {
        x: state.candy.x, y: state.candy.y,
        vx: state.candy.vx, vy: state.candy.vy,
        attached: state.candy.attached
      },
      booha: state.booha && { x: state.booha.x, y: state.booha.y },
      ropes: state.ropes.map(rope => ({
        id: rope.id, cut: rope.cut, pending: rope.pending,
        releaseAt: rope.releaseAt
      })),
      objects: state.objects.map(obj => ({
        type: obj.type, x: obj.x, y: obj.y,
        width: obj.width, height: obj.height,
        direction: obj.direction
      }))
    });
  }

  boot();
})();
