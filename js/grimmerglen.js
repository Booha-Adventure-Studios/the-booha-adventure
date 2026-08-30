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
    speed: BASE_SPEED
  };

  let app, stage, roomLayer, atmosphereCanvas, atmosphereCtx, actorCanvas, actorCtx, fadeEl, currentBg;
  let devPanel, devReadout;
  let entryDrift = null;
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
    drawMarietta(now);
    drawBooha(now);
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
    `;
    document.head.appendChild(style);
  }

  function tick(now) {
    const dt = Math.min(50, Math.max(8, now - (state.lastTickTime || now)));
    state.lastTickTime = now;
    state.speed = BASE_SPEED * (dt / TARGET_DT);
    const drifting = !state.transitioning && tickEntryDrift(now);
    if (!state.transitioning && !drifting && !state.inputLocked) {
      handleMovement();
      const exit = getAvailableExit(now);
      if (exit) transitionTo(exit);
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
