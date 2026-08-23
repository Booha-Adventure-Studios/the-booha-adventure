/*
 * Muenba world shell — navigation and atmosphere only.
 * Ghost hunting, lobby dialogue, capture, and durable Muenba progress belong
 * to later passes.
 */
(() => {
  'use strict';

  const DATA = window.MUENBA_DATA;
  if (!DATA) {
    console.error('[Muenba] MUENBA_DATA is missing.');
    return;
  }

  const WORLD_W = DATA.worldWidth;
  const WORLD_H = DATA.worldHeight;
  const GHOST_R = 26;
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
  const ENTRY_DRIFT_MAX_MS = 2200;
  const NPP_RADIUS = 42;
  const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

  const params = new URLSearchParams(window.location.search);
  const DEV_MODE = params.get('dev') === '1';
  const requestedRoom = params.get('room');

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
    coordMode: DEV_MODE,
    lastTickTime: 0,
    speed: BASE_SPEED,
    fogX: 0
  };

  let app;
  let stage;
  let roomLayer;
  let atmosphereCanvas;
  let actorCanvas;
  let atmosphereCtx;
  let actorCtx;
  let fadeEl;
  let devReadout;
  let currentBg;
  let vignetteCanvas;
  let fogTexture;
  let lastTouchEnd = 0;
  let entryDrift = null;
  const imageCache = new Map();
  const ghostImg = new Image();
  ghostImg.src = 'assets/img/booha_ghost.png';

  function validateData() {
    const errors = [];
    const roomIds = Object.keys(DATA.rooms);
    if (roomIds.length !== 15) errors.push(`expected 15 rooms, found ${roomIds.length}`);
    for (const roomId of roomIds) {
      const room = DATA.rooms[roomId];
      for (const exit of room.exits || []) {
        if (!DATA.rooms[exit.to]) errors.push(`${roomId} points to missing ${exit.to}`);
        if (!room.spawns?.[exit.spawn]) errors.push(`${roomId} has missing spawn ${exit.spawn}`);
      }
      if (!room.spawns?.default) errors.push(`${roomId} has no default spawn`);
    }
    if (errors.length) console.error('[Muenba] Data validation failed:', errors);
    else console.info('[Muenba] 15-room data validation passed.');
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#000; }
      body { font-family: system-ui, -apple-system, sans-serif; }
      #muenba-app { position:relative; width:100vw; height:100vh; overflow:hidden; background:#000; }
      #muenba-stage { position:absolute; left:50%; top:50%; width:${WORLD_W}px; height:${WORLD_H}px; transform-origin:50% 50%; overflow:hidden; cursor:crosshair; }
      #muenba-room-layer, #muenba-atmosphere, #muenba-canvas, #muenba-fade { position:absolute; inset:0; }
      #muenba-room-layer { z-index:1; }
      .muenba-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center center; display:block; pointer-events:none; user-select:none; }
      #muenba-atmosphere { z-index:4; pointer-events:none; }
      #muenba-canvas { z-index:10; pointer-events:none; }
      #muenba-fade { z-index:30; background:#000; opacity:0; pointer-events:none; }
      #muenba-dev { position:fixed; left:12px; top:12px; z-index:100; display:${DEV_MODE ? 'block' : 'none'}; color:#bde5e4; background:rgba(0,8,12,.78); border:1px solid rgba(125,220,216,.35); border-radius:10px; padding:8px 10px; font:700 11px/1.5 ui-monospace,monospace; pointer-events:none; }
      #muenba-dev strong { color:#f0ffff; }
      #muenba-room-list { position:fixed; right:12px; bottom:12px; z-index:100; display:${DEV_MODE ? 'flex' : 'none'}; flex-wrap:wrap; justify-content:flex-end; gap:4px; max-width:330px; }
      #muenba-room-list button { border:1px solid rgba(125,220,216,.35); border-radius:5px; background:rgba(0,8,12,.8); color:#bde5e4; padding:4px 6px; font:700 10px ui-monospace,monospace; cursor:pointer; }
      #muenba-room-list button:hover { background:rgba(30,80,84,.8); }
      @media (prefers-reduced-motion: reduce) { #muenba-fade { transition:none !important; } }
    `;
    document.head.appendChild(style);
  }

  function buildApp() {
    app = document.createElement('div');
    app.id = 'muenba-app';
    stage = document.createElement('div');
    stage.id = 'muenba-stage';
    roomLayer = document.createElement('div');
    roomLayer.id = 'muenba-room-layer';
    atmosphereCanvas = document.createElement('canvas');
    atmosphereCanvas.id = 'muenba-atmosphere';
    actorCanvas = document.createElement('canvas');
    actorCanvas.id = 'muenba-canvas';
    fadeEl = document.createElement('div');
    fadeEl.id = 'muenba-fade';
    stage.append(roomLayer, atmosphereCanvas, actorCanvas, fadeEl);
    app.appendChild(stage);
    document.body.replaceChildren(app);

    const dev = document.createElement('div');
    dev.id = 'muenba-dev';
    dev.innerHTML = '<strong>MUENBA DEV</strong><br><span id="muenba-dev-text"></span>';
    document.body.appendChild(dev);
    devReadout = document.getElementById('muenba-dev-text');

    const roomList = document.createElement('div');
    roomList.id = 'muenba-room-list';
    for (let i = 1; i <= 15; i++) {
      const roomId = `room_${String(i).padStart(2, '0')}`;
      const button = document.createElement('button');
      button.textContent = roomId.replace('room_', '#');
      button.addEventListener('click', () => jumpToRoom(roomId));
      roomList.appendChild(button);
    }
    document.body.appendChild(roomList);

    atmosphereCtx = atmosphereCanvas.getContext('2d');
    actorCtx = actorCanvas.getContext('2d');
  }

  function resizeCanvas() {
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    for (const canvas of [atmosphereCanvas, actorCanvas]) {
      canvas.width = Math.round(WORLD_W * dpr);
      canvas.height = Math.round(WORLD_H * dpr);
      canvas.style.width = `${WORLD_W}px`;
      canvas.style.height = `${WORLD_H}px`;
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    vignetteCanvas = null;
    buildAtmosphereCache();
  }

  function fitStage() {
    const scale = Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function buildAtmosphereCache() {
    vignetteCanvas = document.createElement('canvas');
    vignetteCanvas.width = WORLD_W;
    vignetteCanvas.height = WORLD_H;
    const vctx = vignetteCanvas.getContext('2d');
    const gradient = vctx.createRadialGradient(CENTER_X, CENTER_Y, 260, CENTER_X, CENTER_Y, 820);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.72, 'rgba(0,0,0,.10)');
    gradient.addColorStop(1, 'rgba(0,0,0,.62)');
    vctx.fillStyle = gradient;
    vctx.fillRect(0, 0, WORLD_W, WORLD_H);

    fogTexture = document.createElement('canvas');
    fogTexture.width = 640;
    fogTexture.height = 180;
    const fctx = fogTexture.getContext('2d');
    const fogGradient = fctx.createRadialGradient(320, 90, 4, 320, 90, 310);
    fogGradient.addColorStop(0, 'rgba(190,215,216,.22)');
    fogGradient.addColorStop(.42, 'rgba(170,205,210,.11)');
    fogGradient.addColorStop(1, 'rgba(170,205,210,0)');
    fctx.fillStyle = fogGradient;
    fctx.fillRect(0, 0, fogTexture.width, fogTexture.height);
  }

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
    image.className = 'muenba-bg';
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
    state.distMovedSinceSpawn = 0;
    state.transitionReadyAt = performance.now() + TRANSITION_COOLDOWN_MS;
    state.spawnLockUntil = performance.now() + 700;
    showRoom(roomId);
    beginEntryDrift();
  }

  function beginEntryDrift() {
    entryDrift = {
      start: performance.now(),
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
    if (distance <= 24 || now >= entryDrift.maxUntil) {
      state.x = entryDrift.targetX;
      state.y = entryDrift.targetY;
      entryDrift = null;
      state.inputLocked = false;
      return false;
    }
    const step = Math.min(distance, state.speed * 1.1);
    state.x += (dx / distance) * step;
    state.y += (dy / distance) * step;
    state.moving = true;
    return true;
  }

  function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  function clampToWorld(x, y) {
    return {
      x: Math.max(GHOST_R, Math.min(WORLD_W - GHOST_R, x)),
      y: Math.max(GHOST_R, Math.min(WORLD_H - GHOST_R, y))
    };
  }

  function canMoveTo(x, y) {
    const point = clampToWorld(x, y);
    return (getRoom().walkable || []).some(rect => pointInRect(point.x, point.y, rect));
  }

  function tryMove(x, y) {
    const point = clampToWorld(x, y);
    if (canMoveTo(point.x, point.y)) {
      state.x = point.x;
      state.y = point.y;
      return true;
    }
    const horizontal = clampToWorld(x, state.y);
    if (canMoveTo(horizontal.x, horizontal.y)) {
      state.x = horizontal.x;
      state.y = horizontal.y;
      return true;
    }
    const vertical = clampToWorld(state.x, y);
    if (canMoveTo(vertical.x, vertical.y)) {
      state.x = vertical.x;
      state.y = vertical.y;
      return true;
    }
    return false;
  }

  function handleMovement(now) {
    if (!state.clickTarget) {
      state.moving = false;
      return;
    }
    const dx = state.clickTarget.x - state.x;
    const dy = state.clickTarget.y - state.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= CLICK_STOP_DIST) {
      state.clickTarget = null;
      state.moving = false;
      return;
    }
    const previousX = state.x;
    const previousY = state.y;
    const moved = tryMove(state.x + (dx / distance) * state.speed, state.y + (dy / distance) * state.speed);
    state.moving = moved;
    if (!moved) state.clickTarget = null;
    if (moved) state.distMovedSinceSpawn += Math.hypot(state.x - previousX, state.y - previousY);
    if (moved && now % 240 < 30) state.fogX += .15;
  }

  function getAvailableExit(now) {
    if (state.inputLocked || state.transitioning) return null;
    if (now < state.transitionReadyAt || now < state.spawnLockUntil) return null;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return null;
    const backDir = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    for (const exit of getRoom().exits || []) {
      if (Math.hypot(state.x - exit.x, state.y - exit.y) > NPP_RADIUS) continue;
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
      window.setTimeout(() => {
        state.transitioning = false;
      }, FADE_MS / 2 + 30);
    }, FADE_MS / 2 + 20);
  }

  function drawExitArrows(now) {
    const exits = getRoom().exits || [];
    const reveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    if (reveal <= 0) return;
    const backDir = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    const seconds = now / 1000;
    exits.forEach((exit, index) => {
      const hiddenUntil = exit.dir === backDir
        ? state.spawnLockUntil + ARRIVAL_ARROW_BACK_DELAY_MS
        : state.spawnLockUntil + ARRIVAL_ARROW_DELAY_MS;
      if (now < hiddenUntil) return;
      const fade = Math.min(1, (now - hiddenUntil) / 450) * reveal;
      const angle = DIR_ANGLE[exit.dir] || 0;
      const pulse = .5 + .5 * Math.sin(seconds * 2.2 + index);
      const bounce = Math.sin(seconds * 2.2 + index) * 5;
      const x = exit.x + Math.cos(angle) * bounce;
      const y = exit.y + Math.sin(angle) * bounce;
      actorCtx.save();
      actorCtx.translate(x, y);
      actorCtx.rotate(angle);
      actorCtx.globalAlpha = fade * (.7 + pulse * .2);
      actorCtx.strokeStyle = '#d2f0df';
      actorCtx.lineWidth = 3;
      actorCtx.lineCap = 'round';
      actorCtx.lineJoin = 'round';
      actorCtx.beginPath();
      actorCtx.moveTo(-15, -10);
      actorCtx.lineTo(0, 0);
      actorCtx.lineTo(-15, 10);
      actorCtx.stroke();
      actorCtx.globalAlpha = fade * (.22 + pulse * .12);
      actorCtx.fillStyle = '#c8f6e1';
      actorCtx.beginPath();
      actorCtx.arc(0, 0, 32 + pulse * 8, 0, Math.PI * 2);
      actorCtx.fill();
      actorCtx.restore();
    });
  }

  function drawBooha(now) {
    const seconds = now / 1000;
    const bob = Math.sin(seconds * 4.18) * 8;
    const wobble = Math.sin(seconds * 8.36) * 2.2;
    const x = state.x;
    const y = state.y + bob;
    const pulse = .5 + .5 * Math.sin(seconds * 2.1);
    actorCtx.save();
    actorCtx.globalAlpha = .18 + pulse * .08;
    actorCtx.fillStyle = 'rgba(180,220,215,.55)';
    actorCtx.beginPath();
    actorCtx.ellipse(state.x, state.y + GHOST_R * .88, GHOST_R * .78, GHOST_R * .27, 0, 0, Math.PI * 2);
    actorCtx.fill();
    actorCtx.restore();
    actorCtx.save();
    actorCtx.translate(x, y);
    actorCtx.rotate(wobble * Math.PI / 180);
    actorCtx.globalAlpha = .96;
    if (ghostImg.complete && ghostImg.naturalWidth > 0) {
      actorCtx.drawImage(ghostImg, -GHOST_R, -GHOST_R, GHOST_R * 2, GHOST_R * 2);
    } else {
      actorCtx.fillStyle = '#ffe56d';
      actorCtx.beginPath();
      actorCtx.arc(0, 0, GHOST_R * .72, 0, Math.PI * 2);
      actorCtx.fill();
    }
    actorCtx.restore();
  }

  function drawAtmosphere(now) {
    const profile = getRoom().atmosphere;
    atmosphereCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    atmosphereCtx.fillStyle = `rgba(3, 8, 18, ${profile.darkness})`;
    atmosphereCtx.fillRect(0, 0, WORLD_W, WORLD_H);
    atmosphereCtx.fillStyle = profile.tint;
    atmosphereCtx.fillRect(0, 0, WORLD_W, WORLD_H);
    if (fogTexture && profile.fog > 0) {
      state.fogX = (state.fogX + .12) % 780;
      const fogAlpha = profile.fog * (.78 + .22 * Math.sin(now / 2600));
      atmosphereCtx.save();
      atmosphereCtx.globalAlpha = fogAlpha;
      atmosphereCtx.drawImage(fogTexture, -700 + state.fogX, 180, 760, 215);
      atmosphereCtx.drawImage(fogTexture, 160 - state.fogX, 560, 840, 205);
      atmosphereCtx.restore();
    }
    if (vignetteCanvas) atmosphereCtx.drawImage(vignetteCanvas, 0, 0);
  }

  function drawFrame(now) {
    atmosphereCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    actorCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    drawAtmosphere(now);
    drawExitArrows(now);
    drawBooha(now);
    if (DEV_MODE && devReadout) devReadout.textContent = `${state.roomId}  x:${Math.round(state.x)} y:${Math.round(state.y)}  exits:${getRoom().exits.length}`;
  }

  function stagePoint(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * WORLD_W / rect.width,
      y: (clientY - rect.top) * WORLD_H / rect.height
    };
  }

  function handleInput(clientX, clientY) {
    if (state.transitioning || state.inputLocked) return;
    const point = stagePoint(clientX, clientY);
    if (Math.hypot(point.x - state.x, point.y - state.y) < 30) return;
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
    stage.addEventListener('mousemove', event => {
      if (!DEV_MODE || !devReadout) return;
      const point = stagePoint(event.clientX, event.clientY);
      devReadout.textContent = `${state.roomId}  x:${Math.round(point.x)} y:${Math.round(point.y)}  exits:${getRoom().exits.length}`;
    });
    document.addEventListener('click', () => { state.musicStarted = true; }, { once: true });
  }

  function jumpToRoom(roomId) {
    if (!DATA.rooms[roomId]) return;
    state.transitioning = false;
    fadeEl.style.opacity = '0';
    setRoom(roomId, 'default', null);
  }

  function tick(now) {
    const dt = Math.min(32, Math.max(8, now - (state.lastTickTime || now)));
    state.lastTickTime = now;
    state.speed = BASE_SPEED * Math.min(1.6, dt / TARGET_DT);
    if (!state.transitioning) {
      const drifting = tickEntryDrift(now);
      if (!drifting && !state.inputLocked) {
        handleMovement(now);
        const exit = getAvailableExit(now);
        if (exit) transitionTo(exit);
      }
    }
    drawFrame(now);
    window.requestAnimationFrame(tick);
  }

  function init() {
    validateData();
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
})();
