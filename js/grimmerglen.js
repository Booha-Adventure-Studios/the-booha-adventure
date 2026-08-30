/*
 * Grimmerglen world shell — foundation pass 1.
 *
 * This is the room-walker engine only: 9 rooms, fade transitions, exit
 * arrows, entry drift, movement/collision, a lightweight DEV coordinate
 * tool, and a static idle Marietta in room_01. Cloned from Muenba's engine
 * shape (js/muenba.js) with everything Muenba-specific stripped out (no
 * ghosts, no rhythm game, no case/briefing content) — this file is meant to
 * stay small and generic so later passes can build Marietta's popup,
 * dialogue, and the typing engine on top of it without fighting inherited
 * hunt-loop code that doesn't apply here.
 *
 * Deliberately NOT in this pass (see claude/grimmerglen-audit-and-pass-plan.md):
 *   - No access lock yet. isGrimmerglenUnlocked()/GRIMMERGLEN_BUILD_READY and
 *     the Karasuki portal are pass 2 — this page is reachable only by direct
 *     URL until that lands, same as any freshly-scaffolded area before its
 *     doorway exists.
 *   - No Marietta popup/dialogue (pass 3/4), no typing engine (pass 5), no
 *     tutorial (pass 6), no save section (pass 7), no service-worker
 *     precache entry (pass 8).
 *   - Exit coordinates and walkable rectangles are placeholders (see
 *     grimmerglen-data.js) — tune them per room with the DEV overlay below
 *     once someone has actually walked all 9 rooms.
 */
(() => {
  'use strict';

  const DATA = window.GRIMMERGLEN_DATA;
  if (!DATA) {
    console.error('[Grimmerglen] GRIMMERGLEN_DATA is missing.');
    return;
  }

  const WORLD_W = DATA.world?.width || DATA.worldWidth || 1536;
  const WORLD_H = DATA.world?.height || DATA.worldHeight || 1024;
  const BOOHA_R = 26;
  const CENTER_X = WORLD_W / 2;
  const CENTER_Y = WORLD_H / 2;
  const BASE_SPEED = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 768 ? 8 : 5.5;
  const TARGET_DT = 1000 / 60;
  const FADE_MS = 600;
  const TRANSITION_COOLDOWN_MS = 1400;
  const ARRIVAL_ARROW_DELAY_MS = 1300;
  const ARRIVAL_ARROW_BACK_DELAY_MS = 3800;
  const ARROW_MOVE_THRESHOLD = 30;
  const CLICK_STOP_DIST = 6;
  const ENTRY_DRIFT_MAX_MS = 3200;
  const EXIT_RADIUS = 42;
  const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };
  const MARIETTA = DATA.marietta || null;

  // Pass 3: the return trip out. Placed at the same spot the player spawns
  // in from Karasuki (room_01, the fromKarasuki spawn point) so the way
  // back is exactly where they arrived, mirroring Muenba's own
  // KARASUKI_RETURN_PORTAL convention.
  const MARIETTA_RETURN_PORTAL = { roomId: 'room_01', x: 768, y: 820, r: 44, triggerR: 36 };
  const POPUP_COOLDOWN_MS = 900;

  const params = new URLSearchParams(window.location.search);
  const DEV_MODE = params.get('dev') === '1';
  if (DEV_MODE) window.__devGrimmerglen = true;
  const requestedRoom = params.get('room');
  const TOUCH_DEVICE = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const REDUCED_MOTION = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    roomId: DATA.rooms[requestedRoom] ? requestedRoom : DATA.startRoom,
    spawnId: params.get('from') === 'karasuki' ? 'fromKarasuki' : 'default',
    x: CENTER_X,
    y: CENTER_Y,
    clickTarget: null,
    moving: false,
    transitioning: false,
    transitionReadyAt: 0,
    arrivalDir: null,
    distMovedSinceSpawn: 0,
    spawnLockUntil: 0,
    inputLocked: false,
    musicStarted: false,
    lastTickTime: 0,
    speed: BASE_SPEED,
    returnExiting: false
  };

  let app, stage, roomLayer, atmosphereCanvas, atmosphereCtx, actorCanvas, actorCtx, fadeEl, currentBg;
  let devPanel, devReadout;
  let entryDrift = null;
  let mariettaPanel = null, mariettaPanelOpen = false, mariettaPanelCooldown = 0;
  let returnPortalOverlay = null, returnPortalOpen = false, returnPortalCooldownUntil = 0;
  let lastTouchEnd = 0;
  const imageCache = new Map();
  const roomGlowCache = new Map();
  const sparkles = [];

  const boohaImg = new Image();
  boohaImg.decoding = 'async';
  boohaImg.src = 'assets/img/booha_ghost.webp';

  const mariettaImg = new Image();
  if (MARIETTA && MARIETTA.poses && MARIETTA.poses[0]) {
    mariettaImg.decoding = 'async';
    mariettaImg.src = MARIETTA.poses[0];
  }

  // ── Pastel room glow (cached gradient, built once per room, drawn with
  //    drawImage every frame — same discipline the Maze/Utsuroba/Muenba
  //    audits all independently landed on for cheap per-frame cost) ──────
  function hexToRgb(hex) {
    const clean = String(hex || '#ffffff').replace('#', '');
    const n = parseInt(clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function getRoomGlow(roomId) {
    if (roomGlowCache.has(roomId)) return roomGlowCache.get(roomId);
    const color = DATA.rooms[roomId]?.color?.glow || '#ffffff';
    const rgb = hexToRgb(color);
    const canvas = document.createElement('canvas');
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
    const ctx = canvas.getContext('2d');
    // Two soft, off-center light pools rather than one centered spotlight —
    // reads as an ambient wash instead of a colored circle sitting behind
    // Booha.
    const spots = [
      { x: WORLD_W * 0.32, y: WORLD_H * 0.38, r: WORLD_W * 0.55 },
      { x: WORLD_W * 0.7,  y: WORLD_H * 0.62, r: WORLD_W * 0.5 }
    ];
    for (const spot of spots) {
      const gradient = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.r);
      gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},.55)`);
      gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }
    roomGlowCache.set(roomId, canvas);
    return canvas;
  }

  function getRoomGlowRgb(roomId) {
    return hexToRgb(DATA.rooms[roomId]?.color?.glow || '#ffffff');
  }

  function reseedSparkles(roomId) {
    sparkles.length = 0;
    const seed = Number(roomId.slice(-2)) || 1;
    const count = 10;
    for (let i = 0; i < count; i++) {
      sparkles.push({
        x: (Math.sin(seed * 13.1 + i * 7.7) * .5 + .5) * WORLD_W,
        y: (Math.sin(seed * 5.3 + i * 11.9) * .5 + .5) * WORLD_H,
        phase: (seed + i) * 1.7,
        speed: 0.4 + (i % 3) * 0.15,
        size: 1.6 + (i % 4) * 0.6
      });
    }
  }

  function drawSparkles(now) {
    if (REDUCED_MOTION) return;
    const rgb = getRoomGlowRgb(state.roomId);
    const seconds = now / 1000;
    for (const sparkle of sparkles) {
      const drift = Math.sin(seconds * sparkle.speed + sparkle.phase) * 26;
      const bob = Math.cos(seconds * sparkle.speed * 1.3 + sparkle.phase) * 18;
      const twinkle = .35 + .35 * Math.sin(seconds * 2.4 + sparkle.phase * 2);
      atmosphereCtx.save();
      atmosphereCtx.globalAlpha = Math.max(0, twinkle);
      atmosphereCtx.shadowBlur = 8;
      atmosphereCtx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},.9)`;
      atmosphereCtx.fillStyle = '#ffffff';
      atmosphereCtx.beginPath();
      atmosphereCtx.arc(sparkle.x + drift, sparkle.y + bob, sparkle.size, 0, Math.PI * 2);
      atmosphereCtx.fill();
      atmosphereCtx.restore();
    }
  }

  function drawAtmosphere(now) {
    atmosphereCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    const seed = Number(state.roomId.slice(-2)) || 1;
    const pulse = REDUCED_MOTION ? .85 : .78 + .22 * Math.sin(now / 2100 + seed);
    atmosphereCtx.save();
    atmosphereCtx.globalAlpha = pulse;
    atmosphereCtx.globalCompositeOperation = 'screen';
    atmosphereCtx.drawImage(getRoomGlow(state.roomId), 0, 0);
    atmosphereCtx.restore();
    drawSparkles(now);
  }

  // ── Room / spawn / transition ───────────────────────────────────────────
  function getRoom() { return DATA.rooms[state.roomId]; }

  function getImage(roomId) {
    if (imageCache.has(roomId)) return imageCache.get(roomId);
    const image = new Image();
    image.decoding = 'async';
    image.src = DATA.rooms[roomId].bg;
    imageCache.set(roomId, image);
    return image;
  }

  function preloadAdjacent(roomId) {
    getImage(roomId);
    for (const exit of DATA.rooms[roomId].exits || []) getImage(exit.to);
  }

  function getSpawn(room, spawnId) {
    return room.spawns?.[spawnId] || room.spawns?.default || { x: CENTER_X, y: CENTER_Y };
  }

  function showRoom(roomId) {
    preloadAdjacent(roomId);
    const image = getImage(roomId);
    roomLayer.replaceChildren(image);
    image.className = DATA.roomClass || 'grimmerglen-bg';
    currentBg = image;
  }

  function setRoom(roomId, spawnId, arrivalDir) {
    state.roomId = roomId;
    state.spawnId = spawnId || 'default';
    state.arrivalDir = arrivalDir || null;
    const spawn = getSpawn(getRoom(), state.spawnId);
    state.x = spawn.x;
    state.y = spawn.y;
    state.clickTarget = null;
    state.moving = false;
    state.inputLocked = false;
    state.distMovedSinceSpawn = 0;
    state.transitionReadyAt = performance.now() + TRANSITION_COOLDOWN_MS;
    state.spawnLockUntil = performance.now() + 700;
    showRoom(roomId);
    reseedSparkles(roomId);
    updateDevReadout();
    entryDrift = null;
    if (state.spawnId === 'fromKarasuki' || state.arrivalDir) beginEntryDrift();
  }

  function beginEntryDrift() {
    entryDrift = {
      targetX: CENTER_X,
      targetY: CENTER_Y,
      maxUntil: performance.now() + ENTRY_DRIFT_MAX_MS
    };
    state.inputLocked = true;
    state.clickTarget = null;
    state.moving = false;
  }

  function tickEntryDrift(now) {
    if (!entryDrift) return false;
    const dx = entryDrift.targetX - state.x;
    const dy = entryDrift.targetY - state.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 24) {
      state.x = entryDrift.targetX;
      state.y = entryDrift.targetY;
      entryDrift = null;
      state.inputLocked = false;
      return false;
    }
    if (now >= entryDrift.maxUntil) entryDrift.maxUntil = now + ENTRY_DRIFT_MAX_MS;
    const step = Math.min(distance, state.speed * 1.1);
    state.x += (dx / distance) * step;
    state.y += (dy / distance) * step;
    state.moving = true;
    return true;
  }

  function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  function clampToWorld(x, y, radius = BOOHA_R) {
    return {
      x: Math.max(radius, Math.min(WORLD_W - radius, x)),
      y: Math.max(radius, Math.min(WORLD_H - radius, y))
    };
  }

  function canMoveTo(x, y) {
    const point = clampToWorld(x, y, BOOHA_R);
    return (getRoom().walkable || []).some(rect => pointInRect(point.x, point.y, rect));
  }

  function tryMove(x, y) {
    const point = clampToWorld(x, y, BOOHA_R);
    if (canMoveTo(point.x, point.y)) { state.x = point.x; state.y = point.y; return true; }
    const horizontal = clampToWorld(x, state.y, BOOHA_R);
    if (canMoveTo(horizontal.x, horizontal.y)) { state.x = horizontal.x; state.y = horizontal.y; return true; }
    const vertical = clampToWorld(state.x, y, BOOHA_R);
    if (canMoveTo(vertical.x, vertical.y)) { state.x = vertical.x; state.y = vertical.y; return true; }
    return false;
  }

  function handleMovement() {
    if (!state.clickTarget) { state.moving = false; return; }
    const dx = state.clickTarget.x - state.x;
    const dy = state.clickTarget.y - state.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= CLICK_STOP_DIST) { state.clickTarget = null; state.moving = false; return; }
    const moved = tryMove(state.x + (dx / distance) * state.speed, state.y + (dy / distance) * state.speed);
    state.moving = moved;
    if (!moved) state.clickTarget = null;
    else state.distMovedSinceSpawn += state.speed;
  }

  function getAvailableExit(now) {
    if (state.inputLocked || state.transitioning) return null;
    if (now < state.transitionReadyAt || now < state.spawnLockUntil) return null;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return null;
    const backDir = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    for (const exit of getRoom().exits || []) {
      if (Math.hypot(state.x - exit.x, state.y - exit.y) > EXIT_RADIUS) continue;
      if (exit.dir === backDir && now < state.spawnLockUntil + ARRIVAL_ARROW_BACK_DELAY_MS) continue;
      return exit;
    }
    return null;
  }

  function transitionTo(exit) {
    if (!exit || state.transitioning) return;
    state.transitioning = true;
    state.inputLocked = true;
    state.clickTarget = null;
    state.moving = false;
    fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-in`;
    fadeEl.style.opacity = '1';
    window.setTimeout(() => {
      setRoom(exit.to, exit.spawn, exit.dir);
      fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-out`;
      fadeEl.style.opacity = '0';
      window.setTimeout(() => { state.transitioning = false; }, FADE_MS / 2 + 30);
    }, FADE_MS / 2 + 20);
  }

  // ── Drawing ──────────────────────────────────────────────────────────────
  function drawExitArrows(now) {
    const exits = getRoom().exits || [];
    const reveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    if (reveal <= 0) return;
    const backDir = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    const seconds = now / 1000;
    const glow = getRoomGlowRgb(state.roomId);
    const glowStr = `${glow.r},${glow.g},${glow.b}`;
    exits.forEach((exit, index) => {
      const hiddenUntil = exit.dir === backDir
        ? state.spawnLockUntil + ARRIVAL_ARROW_BACK_DELAY_MS
        : state.spawnLockUntil + ARRIVAL_ARROW_DELAY_MS;
      if (now < hiddenUntil) return;
      const fade = Math.min(1, (now - hiddenUntil) / 450) * reveal;
      const distanceToExit = Math.hypot(state.x - exit.x, state.y - exit.y);
      const proximity = Math.max(0, Math.min(1, 1 - distanceToExit / (EXIT_RADIUS * 5)));
      const angle = DIR_ANGLE[exit.dir] || 0;
      const bob = REDUCED_MOTION ? 0 : Math.sin(seconds * 2.4 + index) * 5;
      const x = exit.x + Math.cos(angle) * bob;
      const y = exit.y + Math.sin(angle) * bob;
      const twinkle = REDUCED_MOTION ? .85 : .72 + .24 * Math.sin(seconds * 3.1 + index * 1.6);

      actorCtx.save();
      actorCtx.translate(x, y);
      actorCtx.rotate(angle);
      actorCtx.globalAlpha = fade * (.5 + twinkle * .3 + proximity * .2);
      actorCtx.strokeStyle = `rgba(${glowStr},.95)`;
      actorCtx.shadowColor = `rgba(${glowStr},.75)`;
      actorCtx.shadowBlur = 16;
      actorCtx.lineWidth = 4.2;
      actorCtx.lineCap = 'round';
      actorCtx.lineJoin = 'round';
      actorCtx.beginPath();
      actorCtx.moveTo(-12, -8);
      actorCtx.lineTo(1, 0);
      actorCtx.lineTo(-12, 8);
      actorCtx.stroke();
      actorCtx.shadowBlur = 0;
      actorCtx.globalAlpha = fade * (.7 + twinkle * .3);
      actorCtx.fillStyle = '#ffffff';
      actorCtx.beginPath();
      actorCtx.arc(1, 0, 2.4 + twinkle, 0, Math.PI * 2);
      actorCtx.fill();
      actorCtx.restore();
    });
  }

  function drawMarietta(now) {
    if (!MARIETTA || state.roomId !== MARIETTA.roomId) return;
    if (!mariettaImg.complete || mariettaImg.naturalWidth === 0) return;
    const seconds = now / 1000;
    const bob = REDUCED_MOTION ? 0 : Math.sin(seconds * 2.6) * 6;
    const size = MARIETTA.drawR * 2;
    actorCtx.save();
    actorCtx.globalAlpha = .98;
    actorCtx.drawImage(mariettaImg, MARIETTA.x - size / 2, MARIETTA.y - size / 2 + bob, size, size);
    actorCtx.restore();
  }

  function drawBooha(now) {
    const seconds = now / 1000;
    const bob = Math.sin(seconds * 4.18) * 8;
    const wobble = Math.sin(seconds * 8.36) * 2.2;
    actorCtx.save();
    actorCtx.translate(state.x, state.y + bob);
    actorCtx.rotate(wobble * Math.PI / 180);
    actorCtx.globalAlpha = .96;
    if (boohaImg.complete && boohaImg.naturalWidth > 0) {
      const boxSize = BOOHA_R * 2;
      actorCtx.drawImage(boohaImg, -boxSize / 2, -boxSize / 2, boxSize, boxSize);
    } else {
      actorCtx.fillStyle = '#ffe56d';
      actorCtx.beginPath();
      actorCtx.arc(0, 0, BOOHA_R * .72, 0, Math.PI * 2);
      actorCtx.fill();
    }
    actorCtx.restore();
  }

  function drawFrame(now) {
    atmosphereCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    actorCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    drawAtmosphere(now);
    drawExitArrows(now);
    drawReturnPortal(now);
    drawMarietta(now);
    drawBooha(now);
  }


  /* ═══════════════════════════════════════════
     MARIETTA'S ENTRY POPUP + THE RETURN TRIP
  ═══════════════════════════════════════════ */
  // Foundation pass 3: the "Talk to Marietta / Leave Grimmerglen" choice
  // card the player sees on arrival, built on the shared utsu-card.js
  // parchment-card shell (the same .utsu-card/.dp-* system Utsuroba's
  // drifter panel and Karasuki's orb panel already use) rather than a
  // sixth hand-copied popup. "Talk to Marietta" is a short placeholder
  // reaction for now -- her real dialogue system (big-text drawer,
  // typewriter reveal, the daydream/daymare lore) is pass 4; this pass
  // only builds the choice card itself and the way back out, matching
  // the plan doc's pass boundary.
  function furiJP(text, readings) {
    const renderer = window.UtsuFurigana && window.UtsuFurigana.sentence;
    return renderer ? renderer(text, readings || {}) : text;
  }

  // Whole-phrase-to-whole-reading entries, same convention Utsuroba's own
  // DRIFTER_UI_READINGS uses for short fixed UI copy (as opposed to the
  // per-kanji-term maps long authored prose gets) -- these strings are
  // static button/body text, not variable dialogue.
  const MARIETTA_UI_READINGS = {
    'マリエッタと話す': 'マリエッタとはなす',
    'グリマーグレンを出る': 'グリマーグレンをでる',
    '閉じる': 'とじる',
    'マリエッタは、あなたが来てくれてとても嬉しいです！': 'マリエッタは、あなたがきてくれてとてもうれしいです！',
    'マリエッタは嬉しそうに揺れています…まだ話す準備ができていないみたい！':
      'マリエッタはうれしそうにゆれています…まだはなすじゅんびができていないみたい！',
    'カラスキに戻りますか？': 'カラスキにもどりますか？',
    'ここからカラスキへ戻る道が開いています。': 'ここからカラスキへもどるみちがひらいています。',
    'はい、戻る': 'はい、もどる',
  };

  function buildMariettaPanel() {
    if (mariettaPanel) return;
    mariettaPanel = document.createElement('div');
    mariettaPanel.id = 'grimmerglen-marietta-panel';
    mariettaPanel.className = 'utsu-card is-floating';
    // A fixed pastel-pink/gold motif rather than the per-drifter lookup
    // UtsuCard.motifForDrifter() does -- Grimmerglen has one host, not six.
    mariettaPanel.style.setProperty('--card-ring', '#ff9fc2');
    mariettaPanel.style.setProperty('--card-glow', 'rgba(255,159,194,.5)');
    document.body.appendChild(mariettaPanel);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && mariettaPanelOpen) closeMariettaPanel();
    });
    // One delegated listener covers every .dp-btn this panel will ever
    // render (its innerHTML is rebuilt per screen), matching the drifter
    // panel's own delegated-click pattern in utsuroba.js.
    mariettaPanel.addEventListener('click', event => {
      if (window.UtsuSfx && event.target.closest('.dp-btn')) window.UtsuSfx.buttonPress();
    });
  }

  function renderMariettaWelcome() {
    if (!mariettaPanel || !MARIETTA) return;
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner">
        <div class="dp-portrait-wrap"><span class="dp-portrait-halo"></span>
          <div class="dp-portrait"><img src="${MARIETTA.poses[0]}" alt="Marietta"></div>
        </div>
        <div class="dp-body">
          <p class="dp-name-en">GRIMMERGLEN GUIDE</p>
          <p class="dp-name-kanji">Marietta <span style="font-weight:400;color:#9a7850;">・マリエッタ</span></p>
          <div class="dp-divider"></div>
          <p class="dp-line-en">Marietta is so happy you're here!</p>
          <p class="dp-line-jp">${furiJP('マリエッタは、あなたが来てくれてとても嬉しいです！', MARIETTA_UI_READINGS)}</p>
          <div class="dp-btns">
            <button class="dp-btn yes" id="mg-talk-btn">Talk to Marietta / ${furiJP('マリエッタと話す', MARIETTA_UI_READINGS)}</button>
            <button class="dp-btn no" id="mg-leave-btn">Leave Grimmerglen / ${furiJP('グリマーグレンを出る', MARIETTA_UI_READINGS)}</button>
          </div>
        </div>
      </div>`;
    const talkBtn = mariettaPanel.querySelector('#mg-talk-btn');
    const leaveBtn = mariettaPanel.querySelector('#mg-leave-btn');
    if (talkBtn) talkBtn.addEventListener('click', renderMariettaDialogue);
    if (leaveBtn) leaveBtn.addEventListener('click', () => { closeMariettaPanel(); returnToKarasuki(); });
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Marietta's own typewriter blip -- foundation pass 4. Distinct timbre
  // from Utsuroba's playTypeTick() (a flat square-wave buzz): a sine tone
  // with a quick upward pitch glide, higher and rounder, matching
  // Grimmerglen's "cute bubbly pastel" identity.
  let mariettaTypeAudioCtx = null;
  function playMariettaTypeTick() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!mariettaTypeAudioCtx) mariettaTypeAudioCtx = new AC();
      if (mariettaTypeAudioCtx.state === 'suspended') mariettaTypeAudioCtx.resume().catch(() => {});
      const now = mariettaTypeAudioCtx.currentTime;
      const osc = mariettaTypeAudioCtx.createOscillator();
      const gain = mariettaTypeAudioCtx.createGain();
      osc.type = 'sine';
      const base = 760 + Math.random() * 120;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, now + 0.045);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.connect(gain); gain.connect(mariettaTypeAudioCtx.destination);
      osc.start(now); osc.stop(now + 0.065);
    } catch (_) {}
  }

  // Marietta's lore intro -- prose-rich per the plan doc (deliberately
  // distinct from the typing content's simple sentences, which stay
  // Pass 5/6's job). Explains why Grimmerglen exists and who Marietta is:
  // cute *and* a little spooky, forgetful by nature, matching how fast
  // daydreams/daymares arrive and how quickly they slip away again --
  // instability is the point, not a bug to smooth over.
  const MARIETTA_DIALOGUE = [
    { en: "Oh! Hello, hello! You found me — I'm Marietta!",
      jp: 'あっ、こんにちは！わたしを見つけたのね。マリエッタです！' },
    { en: 'Welcome to Grimmerglen. This is where daydreams and daymares end up.',
      jp: 'ようこそ、グリマーグレンへ。ここは、たのしい夢と、こわい夢が集まる場所なの。' },
    { en: 'Nobody knows why. They just arrive, one after another, and pile up all around us.',
      jp: 'どうしてかは、だれも知らない。夢たちは、つぎつぎとやってきて、ここにたまっていくの。' },
    { en: "I'm a Marietta too — that's what my whole species is called! Funny, isn't it?",
      jp: 'わたしも「マリエッタ」っていう種族なのよ。おなじ名前で、ちょっとおもしろいでしょ？' },
    { en: "Some of the daymares look a little spooky. Don't worry — they can't hurt you here. Probably!",
      jp: 'こわい夢も、ちょっとだけいるけど……だいじょうぶ、ここでは何もできないから。たぶん！' },
    { en: 'I try to remember every one that comes through... but they slip away so fast, even for me.',
      jp: 'やってきた夢を、ぜんぶ覚えていたいんだけど……わたしも、あっというまに忘れちゃうの。' }
  ];

  // Per-kanji-term reading map -- prose gets individual term readings
  // (the site's real furigana convention for authored dialogue), unlike
  // MARIETTA_UI_READINGS' whole-phrase style for short fixed button copy.
  const MARIETTA_DIALOGUE_READINGS = {
    '見つけた': 'みつけた',
    '夢': 'ゆめ',
    '場所': 'ばしょ',
    '知らない': 'しらない',
    '種族': 'しゅぞく',
    '名前': 'なまえ',
    '覚えて': 'おぼえて',
    '忘れちゃう': 'わすれちゃう'
  };

  // PASS 6 HOOK: once the tutorial is built, its "Do you want to try
  // first?" branch launches from the closing button below instead of
  // just closing the panel back out to free exploration.
  function renderMariettaDialogue() {
    if (!mariettaPanel || !MARIETTA) return;
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner">
        <div class="dp-portrait-wrap"><span class="dp-portrait-halo"></span>
          <div class="dp-portrait"><img src="${MARIETTA.poses[0]}" alt="Marietta"></div>
        </div>
        <div class="dp-body">
          <p class="dp-name-en">GRIMMERGLEN GUIDE</p>
          <p class="dp-name-kanji">Marietta <span style="font-weight:400;color:#9a7850;">・マリエッタ</span></p>
          <div class="dp-divider"></div>
          <div id="mg-dialogue-lines"></div>
          <div id="mg-dialogue-actions" class="dp-btns" style="opacity:0;transition:opacity .3s;">
            <button class="dp-btn yes" id="mg-dialogue-close-btn">Got it! / わかった！</button>
          </div>
        </div>
      </div>`;

    const linesEl = mariettaPanel.querySelector('#mg-dialogue-lines');
    const actionsEl = mariettaPanel.querySelector('#mg-dialogue-actions');
    let finished = false;

    function showActions() {
      if (finished) return;
      finished = true;
      linesEl.innerHTML = MARIETTA_DIALOGUE.map(line =>
        `<p class="dp-line-en" style="margin-bottom:2px;">${escapeHTML(line.en)}</p><p class="dp-line-jp" style="margin:0 0 6px;">${furiJP(line.jp, MARIETTA_DIALOGUE_READINGS)}</p>`
      ).join('');
      actionsEl.style.opacity = '1';
      const closeBtn = mariettaPanel.querySelector('#mg-dialogue-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', closeMariettaPanel);
    }

    // Click anywhere on the card to skip straight to the end -- deferred
    // a tick so the very click that opened this screen (bubbling up from
    // the "Talk to Marietta" button, a descendant of this same panel)
    // doesn't immediately trigger its own skip.
    setTimeout(() => {
      mariettaPanel.addEventListener('click', showActions, { once: true });
    }, 0);

    let lineIdx = 0, charIdx = 0, currentEnEl = null;
    const CHAR_MS = 36, LINE_PAUSE_MS = 360;

    function typeLine() {
      if (finished) return;
      if (lineIdx >= MARIETTA_DIALOGUE.length) { setTimeout(showActions, 400); return; }
      currentEnEl = document.createElement('p');
      currentEnEl.className = 'dp-line-en';
      currentEnEl.style.marginBottom = '2px';
      linesEl.appendChild(currentEnEl);
      charIdx = 0;
      typeChar();
    }

    function typeChar() {
      if (finished) return;
      const line = MARIETTA_DIALOGUE[lineIdx];
      if (charIdx <= line.en.length) {
        currentEnEl.textContent = line.en.slice(0, charIdx);
        if (charIdx > 0 && line.en[charIdx - 1] !== ' ') playMariettaTypeTick();
        charIdx++;
        setTimeout(typeChar, CHAR_MS);
      } else {
        const jpEl = document.createElement('p');
        jpEl.className = 'dp-line-jp';
        jpEl.style.margin = '0 0 6px';
        jpEl.innerHTML = furiJP(line.jp, MARIETTA_DIALOGUE_READINGS);
        linesEl.appendChild(jpEl);
        lineIdx++;
        setTimeout(typeLine, LINE_PAUSE_MS);
      }
    }

    typeLine();
  }

  function openMariettaPanel() {
    if (!mariettaPanel || mariettaPanelOpen || performance.now() < mariettaPanelCooldown) return;
    if (window.UtsuSfx) window.UtsuSfx.panelOpen();
    mariettaPanelOpen = true;
    state.clickTarget = null;
    state.moving = false;
    renderMariettaWelcome();
    mariettaPanel.classList.add('open');
  }

  function closeMariettaPanel() {
    if (!mariettaPanel) return;
    if (window.UtsuSfx) window.UtsuSfx.panelClose();
    mariettaPanelCooldown = performance.now() + POPUP_COOLDOWN_MS;
    mariettaPanelOpen = false;
    mariettaPanel.classList.remove('open');
  }

  // Opens automatically once per arrival from Karasuki (after any entry
  // drift finishes), the same "shows every visit, not just the first"
  // shape Muenba's Nuppi welcome uses -- but Marietta's sprite in room_01
  // stays clickable too, so the player can reopen the same card any time
  // they walk back to her mid-visit.
  function openMariettaPanelAfterEntry() {
    if (state.spawnId !== 'fromKarasuki') return;
    const waitForArrival = () => {
      if (!entryDrift) openMariettaPanel();
      else window.requestAnimationFrame(waitForArrival);
    };
    window.requestAnimationFrame(waitForArrival);
  }

  function clickCheckMarietta(worldX, worldY) {
    if (!MARIETTA || state.roomId !== MARIETTA.roomId || mariettaPanelOpen) return false;
    const bob = REDUCED_MOTION ? 0 : Math.sin(performance.now() / 1000 * 2.6) * 6;
    if (Math.hypot(worldX - MARIETTA.x, worldY - (MARIETTA.y + bob)) > MARIETTA.hitR) return false;
    openMariettaPanel();
    return true;
  }

  // ── Return portal: a small standalone confirm popup (raw markup, not
  //    the utsu-card system, matching Muenba's own KARASUKI_RETURN_PORTAL
  //    treatment exactly) so a player who dismissed Marietta's welcome and
  //    went exploring still has a clear way back without hunting her down
  //    again. Grimmerglen's own spec asks for furigana on every button,
  //    instruction, and direction -- unlike Muenba's plain-kana return
  //    popup, this one furigana's its Japanese throughout. ──────────────
  function buildReturnPortalOverlay() {
    if (returnPortalOverlay) return;
    returnPortalOverlay = document.createElement('div');
    returnPortalOverlay.id = 'grimmerglen-return-overlay';
    returnPortalOverlay.innerHTML = `
      <div class="grimmerglen-return-box">
        <h2>Leave Grimmerglen?</h2>
        <p class="jp">${furiJP('カラスキに戻りますか？', MARIETTA_UI_READINGS)}</p>
        <p>The path back to Karasuki is open here.</p>
        <p class="jp-line">${furiJP('ここからカラスキへ戻る道が開いています。', MARIETTA_UI_READINGS)}</p>
        <div class="grimmerglen-return-actions">
          <button id="grimmerglen-return-yes" type="button"><span>Yes, return</span><small>${furiJP('はい、戻る', MARIETTA_UI_READINGS)}</small></button>
          <button id="grimmerglen-return-no" type="button"><span>Stay</span><small>ここにいる</small></button>
        </div>
      </div>`;
    document.body.appendChild(returnPortalOverlay);
    const yesBtn = document.getElementById('grimmerglen-return-yes');
    const noBtn  = document.getElementById('grimmerglen-return-no');
    yesBtn.addEventListener('click', () => {
      if (window.UtsuSfx) window.UtsuSfx.buttonPress();
      closeReturnPortalPopup();
      returnToKarasuki();
    });
    noBtn.addEventListener('click', () => {
      if (window.UtsuSfx) window.UtsuSfx.buttonPress();
      closeReturnPortalPopup();
    });
    returnPortalOverlay.addEventListener('click', event => {
      if (event.target === returnPortalOverlay) closeReturnPortalPopup();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && returnPortalOpen) closeReturnPortalPopup();
    });
  }

  function openReturnPortalPopup() {
    if (returnPortalOpen || state.returnExiting || performance.now() < returnPortalCooldownUntil) return;
    if (!returnPortalOverlay) buildReturnPortalOverlay();
    returnPortalOpen = true;
    state.clickTarget = null;
    state.moving = false;
    if (window.UtsuSfx) window.UtsuSfx.popupOpen();
    returnPortalOverlay.classList.add('open');
  }

  function closeReturnPortalPopup() {
    if (!returnPortalOverlay) return;
    returnPortalOpen = false;
    if (window.UtsuSfx) window.UtsuSfx.popupClose();
    returnPortalCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
    returnPortalOverlay.classList.remove('open');
  }

  function inReturnPortalRoom() { return state.roomId === MARIETTA_RETURN_PORTAL.roomId; }

  function checkReturnPortalProximity(now) {
    if (!inReturnPortalRoom() || returnPortalOpen || mariettaPanelOpen) return;
    if (now < returnPortalCooldownUntil) return;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    const d = Math.hypot(state.x - MARIETTA_RETURN_PORTAL.x, state.y - MARIETTA_RETURN_PORTAL.y);
    if (d <= MARIETTA_RETURN_PORTAL.triggerR) openReturnPortalPopup();
  }

  function clickCheckReturnPortal(worldX, worldY) {
    if (!inReturnPortalRoom() || returnPortalOpen || mariettaPanelOpen) return false;
    if (performance.now() < returnPortalCooldownUntil) return false;
    const d = Math.hypot(worldX - MARIETTA_RETURN_PORTAL.x, worldY - MARIETTA_RETURN_PORTAL.y);
    if (d <= MARIETTA_RETURN_PORTAL.r) { openReturnPortalPopup(); return true; }
    return false;
  }

  function drawReturnPortal(now) {
    if (!inReturnPortalRoom()) return;
    const seconds = now / 1000;
    const pulse = REDUCED_MOTION ? .78 : .58 + .22 * Math.sin(seconds * 1.7);
    const cx = MARIETTA_RETURN_PORTAL.x;
    const cy = MARIETTA_RETURN_PORTAL.y;
    actorCtx.save();
    const gradient = actorCtx.createRadialGradient(cx, cy, 0, cx, cy, 46);
    gradient.addColorStop(0, `rgba(255,214,140,${.55 * pulse})`);
    gradient.addColorStop(1, 'rgba(255,214,140,0)');
    actorCtx.fillStyle = gradient;
    actorCtx.beginPath(); actorCtx.arc(cx, cy, 46, 0, Math.PI * 2); actorCtx.fill();
    actorCtx.globalAlpha = .8 + pulse * .2;
    actorCtx.strokeStyle = 'rgba(255,255,255,.85)';
    actorCtx.lineWidth = 2.4;
    actorCtx.beginPath(); actorCtx.arc(cx, cy, 22, 0, Math.PI * 2); actorCtx.stroke();
    actorCtx.restore();
  }

  function returnToKarasuki() {
    if (state.returnExiting) return;
    state.returnExiting = true;
    state.clickTarget = null;
    state.moving = false;
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`;
    fadeEl.style.opacity = '1';
    window.setTimeout(() => { window.location.href = 'karasuki.html'; }, FADE_MS + 60);
  }

  // ── DEV overlay (foundation tool for calibrating exits/walkables later) ──
  function updateDevReadout(worldX, worldY) {
    if (!DEV_MODE || !devReadout) return;
    const room = DATA.rooms[state.roomId]?.color?.name || state.roomId;
    const coordText = (typeof worldX === 'number')
      ? `last click: ${Math.round(worldX)}, ${Math.round(worldY)}`
      : `booha: ${Math.round(state.x)}, ${Math.round(state.y)}`;
    devReadout.textContent = `${state.roomId} (${room}) — ${coordText}`;
  }

  function buildDevPanel() {
    if (!DEV_MODE) return;
    devPanel = document.createElement('div');
    devPanel.id = 'grimmerglen-dev';
    const select = document.createElement('select');
    select.id = 'grimmerglen-dev-jump';
    Object.keys(DATA.rooms).forEach(roomId => {
      const opt = document.createElement('option');
      opt.value = roomId;
      opt.textContent = `${roomId} — ${DATA.rooms[roomId].color?.name || ''}`;
      select.appendChild(opt);
    });
    select.value = state.roomId;
    select.addEventListener('change', () => setRoom(select.value, 'default', null));
    devReadout = document.createElement('div');
    devReadout.id = 'grimmerglen-dev-readout';
    devPanel.append(select, devReadout);
    document.body.appendChild(devPanel);
    updateDevReadout();
  }

  // ── Input / tick / init ─────────────────────────────────────────────────
  function stagePoint(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * WORLD_W / rect.width,
      y: (clientY - rect.top) * WORLD_H / rect.height
    };
  }

  function handleInput(clientX, clientY) {
    if (mariettaPanelOpen || returnPortalOpen) return;
    const point = stagePoint(clientX, clientY);
    if (entryDrift) {
      if (Math.hypot(point.x - state.x, point.y - state.y) < 30) return;
      entryDrift = null;
      state.inputLocked = false;
      state.distMovedSinceSpawn = Math.max(state.distMovedSinceSpawn, ARROW_MOVE_THRESHOLD);
      state.clickTarget = point;
      return;
    }
    if (state.inputLocked || state.transitioning) return;
    if (clickCheckMarietta(point.x, point.y)) return;
    if (clickCheckReturnPortal(point.x, point.y)) return;
    if (DEV_MODE) updateDevReadout(point.x, point.y);
    if (Math.hypot(point.x - state.x, point.y - state.y) < 30) return;
    state.distMovedSinceSpawn = Math.max(state.distMovedSinceSpawn, ARROW_MOVE_THRESHOLD);
    state.clickTarget = point;
  }

  function bindInput() {
    stage.addEventListener('click', event => {
      if (performance.now() - lastTouchEnd < 500) return;
      handleInput(event.clientX, event.clientY);
    });
    stage.addEventListener('touchend', event => {
      if (!event.changedTouches.length) return;
      lastTouchEnd = performance.now();
      const touch = event.changedTouches[0];
      handleInput(touch.clientX, touch.clientY);
      event.preventDefault();
    }, { passive: false });
  }

  function resizeCanvas() {
    const maxDpr = TOUCH_DEVICE ? 1.5 : 2;
    const dpr = Math.min(maxDpr, Math.max(1, window.devicePixelRatio || 1));
    for (const canvas of [atmosphereCanvas, actorCanvas]) {
      canvas.width = Math.round(WORLD_W * dpr);
      canvas.height = Math.round(WORLD_H * dpr);
      canvas.style.width = `${WORLD_W}px`;
      canvas.style.height = `${WORLD_H}px`;
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    roomGlowCache.clear();
  }

  function fitStage() {
    const scale = Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function buildApp() {
    app = document.createElement('div');
    app.id = 'grimmerglen-app';
    stage = document.createElement('div');
    stage.id = 'grimmerglen-stage';
    roomLayer = document.createElement('div');
    roomLayer.id = 'grimmerglen-room-layer';
    atmosphereCanvas = document.createElement('canvas');
    atmosphereCanvas.id = 'grimmerglen-atmosphere';
    actorCanvas = document.createElement('canvas');
    actorCanvas.id = 'grimmerglen-canvas';
    fadeEl = document.createElement('div');
    fadeEl.id = 'grimmerglen-fade';
    stage.append(roomLayer, atmosphereCanvas, actorCanvas, fadeEl);
    app.appendChild(stage);
    document.body.replaceChildren(app);

    const rotateOverlay = document.createElement('div');
    rotateOverlay.id = 'grimmerglen-rotate-overlay';
    rotateOverlay.innerHTML = '<span class="grimmerglen-rotate-phone" aria-hidden="true"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.4"></rect><line x1="11" y1="18.4" x2="13" y2="18.4"></line></svg></span><div class="grimmerglen-rotate-bar"></div><p class="grimmerglen-rotate-title">Turn your phone sideways!</p><p class="grimmerglen-rotate-sub">Explore Grimmerglen in landscape mode.<br>スマホを<ruby>横向<rt>よこむ</rt></ruby>きにしてね。</p>';
    document.body.appendChild(rotateOverlay);

    atmosphereCtx = atmosphereCanvas.getContext('2d');
    actorCtx = actorCanvas.getContext('2d');
    buildDevPanel();
    buildMariettaPanel();
    buildReturnPortalOverlay();
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#fff6fa; }
      body { font-family: system-ui, -apple-system, sans-serif; }
      #grimmerglen-app { position:relative; width:100vw; height:100vh; overflow:hidden; background:#fff6fa; }
      #grimmerglen-stage { position:absolute; left:50%; top:50%; width:${WORLD_W}px; height:${WORLD_H}px; transform-origin:50% 50%; overflow:hidden; cursor:pointer; }
      #grimmerglen-room-layer, #grimmerglen-atmosphere, #grimmerglen-canvas, #grimmerglen-fade { position:absolute; inset:0; }
      #grimmerglen-room-layer { z-index:1; }
      .grimmerglen-bg, .grimmerglen-room { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center center; display:block; pointer-events:none; user-select:none; }
      #grimmerglen-atmosphere { z-index:4; pointer-events:none; }
      #grimmerglen-canvas { z-index:10; pointer-events:none; }
      #grimmerglen-fade { z-index:30; background:#fff; opacity:0; pointer-events:none; }
      #grimmerglen-rotate-overlay { display:none; position:fixed; inset:0; z-index:9999; background:#fff0f6; flex-direction:column; align-items:center; justify-content:center; gap:18px; text-align:center; padding:32px; box-sizing:border-box; }
      @media screen and (orientation:portrait) and (max-width:1023px) { #grimmerglen-rotate-overlay { display:flex; } }
      .grimmerglen-rotate-phone { display:inline-flex; align-items:center; justify-content:center; color:#e0559e; transform-origin:center; animation:grimmerglenRotateHint 2.4s ease-in-out infinite; }
      @keyframes grimmerglenRotateHint { 0%,100% { transform:rotate(0deg); } 40%,60% { transform:rotate(-90deg); } }
      .grimmerglen-rotate-bar { width:120px; height:3px; border-radius:999px; background:linear-gradient(90deg,#ffb3c6,#ffe066,#ffb3c6); background-size:200%; animation:grimmerglenBarShimmer 2s linear infinite; box-shadow:0 0 14px rgba(255,179,198,.55); }
      @keyframes grimmerglenBarShimmer { 0% { background-position:0%; } 100% { background-position:200%; } }
      .grimmerglen-rotate-title { font-family:system-ui,-apple-system,sans-serif; font-size:clamp(18px,5vw,28px); font-weight:900; letter-spacing:.02em; color:#a3306e; margin:0; }
      .grimmerglen-rotate-sub { font-size:14px; color:#c46b96; margin:0; line-height:1.7; }
      @media (prefers-reduced-motion: reduce) { .grimmerglen-rotate-phone, .grimmerglen-rotate-bar { animation:none; } }
      #grimmerglen-dev { position:fixed; left:10px; bottom:10px; z-index:9500; display:flex; flex-direction:column; gap:6px; padding:8px 10px; background:rgba(0,0,0,.72); border-radius:10px; font:11px ui-monospace,monospace; color:#fff; }
      #grimmerglen-dev select { font:11px ui-monospace,monospace; }
      #grimmerglen-return-overlay { position:fixed; inset:0; z-index:9300; display:none; align-items:center; justify-content:center; background:rgba(120,40,80,0); transition:background .35s ease; }
      #grimmerglen-return-overlay.open { display:flex; background:rgba(120,40,80,.4); }
      .grimmerglen-return-box { box-sizing:border-box; width:min(420px,calc(100% - 40px)); padding:26px 24px 24px; border:1px solid rgba(255,150,190,.55); border-radius:16px; background:linear-gradient(155deg,rgba(255,244,249,.98),rgba(255,228,239,.99)); box-shadow:0 24px 70px rgba(224,85,158,.2),0 0 45px rgba(255,150,190,.28),inset 0 0 60px rgba(255,255,255,.6); text-align:center; font-family:Georgia,'Times New Roman',serif; color:#7a1f4b; transform:scale(.94); opacity:0; transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .25s ease; }
      #grimmerglen-return-overlay.open .grimmerglen-return-box { transform:scale(1); opacity:1; }
      .grimmerglen-return-box h2 { margin:0 0 4px; font-size:1.2rem; font-weight:400; letter-spacing:.06em; text-transform:uppercase; color:#a3306e; }
      .grimmerglen-return-box .jp { margin:0 0 16px; color:#c07aa3; font-size:.85rem; letter-spacing:.1em; }
      .grimmerglen-return-box p { margin:0 0 20px; color:#8a3d68; font-size:.92rem; line-height:1.6; }
      .grimmerglen-return-box p.jp-line { margin-top:-10px; color:#b06a94; font-size:.82rem; line-height:1.55; }
      .grimmerglen-return-box ruby { ruby-position:over; } .grimmerglen-return-box rt { font-size:.72em; }
      .grimmerglen-return-actions { display:flex; gap:10px; justify-content:center; }
      .grimmerglen-return-actions button { flex:1; max-width:150px; padding:9px 14px; border-radius:999px; font:700 12px ui-monospace,monospace; letter-spacing:.04em; cursor:pointer; }
      #grimmerglen-return-yes { background:linear-gradient(135deg,#ff8fc0,#ffd166); border:1px solid rgba(224,85,158,.7); color:#5a1638; }
      #grimmerglen-return-no { background:transparent; border:1px solid rgba(224,85,158,.4); color:#a9548a; }
      .utsu-card#grimmerglen-marietta-panel .dp-btn.no { color:#a9548a; border-color:rgba(224,85,158,.4); }
    `;
    document.head.appendChild(style);
  }

  function tick(now) {
    const dt = Math.min(50, Math.max(8, now - (state.lastTickTime || now)));
    state.lastTickTime = now;
    state.speed = BASE_SPEED * (dt / TARGET_DT);
    const drifting = !state.transitioning && tickEntryDrift(now);
    if (!state.transitioning && !drifting && !state.inputLocked && !mariettaPanelOpen && !returnPortalOpen) {
      handleMovement();
      const exit = getAvailableExit(now);
      if (exit) transitionTo(exit);
      checkReturnPortalProximity(now);
      if (DEV_MODE) updateDevReadout();
    }
    drawFrame(now);
    window.requestAnimationFrame(tick);
  }

  // Grimmerglen is still under construction -- GRIMMERGLEN_BUILD_READY in
  // js/core/unlock-system.js keeps the door shut for real students even
  // once they've earned the weekly gate, the same temporary-scaffold shape
  // Muenba's own gate carried while it was being built. DEV_MODE / the dev
  // panel checkbox bypasses it for testing.
  function worldGateOpen() {
    if (DEV_MODE || window.__devGrimmerglen) return true;
    return window.BoohaUnlockSystem &&
      typeof BoohaUnlockSystem.isGrimmerglenUnlocked === 'function'
      ? BoohaUnlockSystem.isGrimmerglenUnlocked()
      : false;
  }

  function showLockedWorld() {
    const style = document.createElement('style');
    style.textContent = `
      html,body{margin:0;min-height:100%;background:#fff3f8;color:#7a1f4b;}
      body{display:grid;place-items:center;font-family:Georgia,'Times New Roman',serif;}
      .grimmerglen-lock{box-sizing:border-box;width:min(460px,calc(100% - 36px));padding:28px 26px 30px;border:1px solid rgba(255,150,190,.55);border-radius:18px;background:linear-gradient(155deg,rgba(255,244,249,.97),rgba(255,228,239,.98));box-shadow:0 24px 70px rgba(224,85,158,.18),0 0 55px rgba(255,150,190,.28),inset 0 0 70px rgba(255,255,255,.65);text-align:center;}
      .grimmerglen-lock img{display:block;width:min(150px,38vw);height:auto;max-height:180px;object-fit:contain;margin:0 auto 10px;filter:drop-shadow(0 0 18px rgba(255,150,190,.35));}
      .grimmerglen-lock h1{margin:6px 0 3px;font-size:clamp(1.25rem,5vw,1.8rem);font-weight:400;letter-spacing:.08em;text-transform:uppercase;color:#a9548a;}
      .grimmerglen-lock .jp{margin:0;color:#c07aa3;font-size:.88rem;letter-spacing:.12em;}
      .grimmerglen-lock p{margin:20px auto 0;max-width:31em;color:#8a3d68;font-size:.94rem;line-height:1.7;}
      .grimmerglen-lock p small{display:block;margin-top:8px;color:#b06a94;font-size:.86em;}
      .grimmerglen-lock p.jp-line{margin-top:6px;color:#b06a94;font-size:.86em;letter-spacing:0;}
      .grimmerglen-lock a{display:inline-block;margin-top:22px;padding:9px 16px;border:1px solid rgba(224,85,158,.5);border-radius:999px;color:#7a1f4b;text-decoration:none;font-size:.78rem;letter-spacing:.05em;background:rgba(255,150,190,.14);}
      .grimmerglen-lock a:hover,.grimmerglen-lock a:focus-visible{background:rgba(255,150,190,.26);outline:none;}
      .grimmerglen-lock a small{display:block;margin-top:2px;color:#b06a94;font-size:.9em;}
    `;
    document.head.appendChild(style);
    document.body.innerHTML = `<main class="grimmerglen-lock" aria-labelledby="grimmerglen-lock-title"><img src="assets/img/grimmerglen/marietta/marietta_01.webp" alt="Marietta"><h1 id="grimmerglen-lock-title">This world is locked</h1><p class="jp">この世界は封印されています</p><p>Something dreamy waits beyond this path.<small>Complete nine lessons in one path this week before it will open to you.</small></p><p class="jp-line">この<ruby>道<rt>みち</rt></ruby>の<ruby>先<rt>さき</rt></ruby>で、<ruby>夢<rt>ゆめ</rt></ruby>のような<ruby>何<rt>なに</rt></ruby>かが<ruby>待<rt>ま</rt></ruby>っている。<br><small>今週、ひとつの道で九つの学びを終えよ。それまで、ここは開かない。</small></p><a href="karasuki.html">Return to Karasuki<small>カラスキに<ruby>戻<rt>もど</rt></ruby>る</small></a></main>`;
  }

  function init() {
    if (!worldGateOpen()) {
      showLockedWorld();
      return;
    }
    injectStyles();
    buildApp();
    fitStage();
    resizeCanvas();
    setRoom(state.roomId, state.spawnId, null);
    bindInput();
    window.addEventListener('resize', () => { fitStage(); resizeCanvas(); });
    window.requestAnimationFrame(tick);
    openMariettaPanelAfterEntry();
  }

  if (window.BOOHA_READY) init();
  else document.addEventListener('booha:ready', init, { once: true });

  Object.defineProperty(window, 'b_grimmerglen', {
    value: () => {
      window.__devGrimmerglen = true;
      if (!DEV_MODE) window.location.href = 'grimmerglen.html?dev=1';
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
