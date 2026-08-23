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

  // The real return path (Pass 2) — mirrors Karasuki's own MUENBA_PORTAL
  // (room_13, glowing orb, click + walk-proximity trigger) so the return
  // trip uses the exact interaction language the player already learned on
  // the way in. Sits at the same bottom-of-room_01 spot the 'fromKarasuki'
  // spawn already uses, so arriving and leaving feel like the same doorway.
  const KARASUKI_RETURN_PORTAL = { roomId: 'room_01', x: 768, y: 830, r: 44, triggerR: 36 };
  const POPUP_COOLDOWN_MS = 900;

  const params = new URLSearchParams(window.location.search);
  const DEV_MODE = params.get('dev') === '1';
  if (DEV_MODE) window.__devMuenba = true;
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
    fogX: 0,
    returnExiting: false
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
  let devCoordToggle;
  let devArrowList;
  let devHover = null;
  let currentBg;
  let vignetteCanvas;
  let fogTexture;
  let lastTouchEnd = 0;
  let entryDrift = null;
  let pins = [];
  let returnPortalOverlay = null;
  let returnPortalOpen = false;
  let returnPortalCooldownUntil = 0;
  let motes = [];
  let moteSprite = null;
  const imageCache = new Map();
  const roomGlowCache = new Map();
  const roomGlowRgbCache = new Map();
  // Two soft light pools per room (near the up-hallway opening and a
  // broader ambient wash lower down) — identical placement across rooms
  // since the corridor framing is identical; only the color (from each
  // room's ATMOSPHERE.glow) changes.
  const GLOW_SPOTS = [
    { x: 767, y: 300, r: 260 },
    { x: 800, y: 560, r: 320 }
  ];
  const MOTE_COUNT = 6;
  const ghostImg = new Image();
  ghostImg.src = 'assets/img/booha_ghost.png';
  const music = new Audio('assets/img/muenba/muenba_BGM.mp3');
  music.loop = true;
  music.volume = 0.55;

  function worldGateOpen() {
    // Deliberately NOT the weekly world gate — Muenba is still being built,
    // so it stays locked for real students no matter how many games they
    // finish this week. Only the ?dev=1 URL / window.__devMuenba bypass, or
    // BoohaUnlockSystem.isMuenbaUnlocked() once that flag ships, opens it.
    if (DEV_MODE || window.__devMuenba) return true;
    return window.BoohaUnlockSystem &&
      typeof BoohaUnlockSystem.isMuenbaUnlocked === 'function'
      ? BoohaUnlockSystem.isMuenbaUnlocked()
      : false;
  }

  function showLockedWorld() {
    const style = document.createElement('style');
    style.textContent = `
      html,body{margin:0;min-height:100%;background:#020605;color:#e0eee8;}
      body{display:grid;place-items:center;font-family:Georgia,'Times New Roman',serif;}
      .muenba-lock{box-sizing:border-box;width:min(460px,calc(100% - 36px));padding:28px 26px 30px;border:1px solid rgba(111,166,145,.45);border-radius:18px;background:linear-gradient(155deg,rgba(8,27,20,.96),rgba(1,4,4,.98));box-shadow:0 24px 70px rgba(0,0,0,.72),0 0 55px rgba(16,65,45,.28),inset 0 0 70px rgba(0,0,0,.58);text-align:center;}
      .muenba-lock img{display:block;width:min(150px,38vw);height:auto;max-height:180px;object-fit:contain;margin:0 auto 10px;filter:drop-shadow(0 0 18px rgba(122,180,151,.22));}
      .muenba-lock h1{margin:6px 0 3px;font-size:clamp(1.25rem,5vw,1.8rem);font-weight:400;letter-spacing:.08em;text-transform:uppercase;}
      .muenba-lock .jp{margin:0;color:#aac2b5;font-size:.88rem;letter-spacing:.12em;}
      .muenba-lock p{margin:20px auto 0;max-width:31em;color:#c5d8cd;font-size:.94rem;line-height:1.7;}
      .muenba-lock p small{display:block;margin-top:8px;color:#7e9c8b;font-size:.86em;}
      .muenba-lock a{display:inline-block;margin-top:22px;padding:9px 16px;border:1px solid rgba(156,203,182,.58);border-radius:999px;color:#dcefe4;text-decoration:none;font-size:.78rem;letter-spacing:.05em;background:rgba(111,166,145,.10);}
      .muenba-lock a:hover,.muenba-lock a:focus-visible{background:rgba(111,166,145,.22);outline:none;}
    `;
    document.head.appendChild(style);
    document.body.innerHTML = `<main class="muenba-lock" aria-labelledby="muenba-lock-title"><img src="assets/img/muenba/muenba_logo.png" alt="Muenba"><h1 id="muenba-lock-title">This world is locked</h1><p class="jp">この世界は封印されています</p><p>Something waits beyond the cemetery path.<small>This path isn't open yet.</small></p><a href="karasuki.html">Return to Karasuki</a></main>`;
  }

  function startMusic() {
    if (state.musicStarted) return;
    state.musicStarted = true;
    music.play().catch(() => { state.musicStarted = false; });
  }

  // Reads the same 'muenba_return_room' key enterMuenba() in karasuki.js
  // already writes on the way in, so it lands back in the right room via
  // karasuki.js's own checkReturnFromMuenba(). Called either from the
  // return-portal popup (Pass 2, the real path) or the DEV-only exit
  // button (Pass 0's stopgap, kept as a fast escape hatch while testing).
  function returnToKarasuki() {
    if (state.returnExiting) return;
    state.returnExiting = true;
    state.clickTarget = null;
    state.moving = false;
    try { music.pause(); } catch (_) {}
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`;
    fadeEl.style.opacity = '1';
    window.setTimeout(() => {
      window.location.href = 'karasuki.html';
    }, FADE_MS + 60);
  }

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
      #muenba-dev { position:fixed; left:12px; top:12px; z-index:100; display:${DEV_MODE ? 'block' : 'none'}; color:#bde5e4; background:rgba(0,8,12,.88); border:1px solid rgba(125,220,216,.35); border-radius:10px; padding:9px 10px; font:700 11px/1.5 ui-monospace,monospace; pointer-events:auto; min-width:210px; box-shadow:0 0 20px rgba(0,0,0,.4); }
      #muenba-dev strong { color:#f0ffff; }
      #muenba-dev button { border:1px solid rgba(125,220,216,.4); border-radius:5px; background:rgba(10,40,40,.62); color:#bde5e4; padding:4px 7px; font:700 10px ui-monospace,monospace; cursor:pointer; }
      #muenba-dev button.active { background:rgba(75,135,122,.65); color:#f0ffff; }
      #muenba-dev .muenba-dev-small { color:rgba(189,229,228,.64); font-size:10px; margin-top:4px; }
      #muenba-dev .muenba-dev-arrows { margin-top:5px; padding-top:5px; border-top:1px solid rgba(125,220,216,.18); color:rgba(189,229,228,.72); white-space:pre-line; }
      #muenba-room-list { position:fixed; right:12px; bottom:12px; z-index:100; display:${DEV_MODE ? 'flex' : 'none'}; flex-wrap:wrap; justify-content:flex-end; gap:4px; max-width:330px; }
      #muenba-room-list button { border:1px solid rgba(125,220,216,.35); border-radius:5px; background:rgba(0,8,12,.8); color:#bde5e4; padding:4px 6px; font:700 10px ui-monospace,monospace; cursor:pointer; }
      #muenba-room-list button:hover { background:rgba(30,80,84,.8); }
      /* Pass 0's floating exit button — now DEV-only. The real players'
         return is the in-world portal in room_01 (Pass 2, below); this stays
         around purely as a fast escape hatch while testing other passes. */
      #muenba-exit { position:fixed; right:12px; top:12px; z-index:100; display:${DEV_MODE ? 'block' : 'none'}; border:1px solid rgba(180,200,192,.4); border-radius:8px; background:rgba(0,8,12,.78); color:#d8e8e0; padding:7px 12px; font:700 11px ui-monospace,monospace; letter-spacing:.04em; cursor:pointer; }
      #muenba-exit:hover, #muenba-exit:focus-visible { background:rgba(30,70,60,.8); outline:none; }
      /* Return-to-Karasuki confirm popup — matches the locked-world screen's
         parchment-less, dark-cemetery styling so it reads as part of this
         world rather than a generic browser dialog. */
      #muenba-return-overlay { position:fixed; inset:0; z-index:200; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0); transition:background .35s ease; }
      #muenba-return-overlay.open { display:flex; background:rgba(0,0,0,.82); }
      .muenba-return-box { box-sizing:border-box; width:min(420px,calc(100% - 40px)); padding:26px 24px 24px; border:1px solid rgba(111,166,145,.45); border-radius:16px; background:linear-gradient(155deg,rgba(8,27,20,.97),rgba(1,4,4,.98)); box-shadow:0 24px 70px rgba(0,0,0,.72),0 0 45px rgba(16,65,45,.26),inset 0 0 60px rgba(0,0,0,.55); text-align:center; font-family:Georgia,'Times New Roman',serif; color:#e0eee8; transform:scale(.94); opacity:0; transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .25s ease; }
      #muenba-return-overlay.open .muenba-return-box { transform:scale(1); opacity:1; }
      .muenba-return-box h2 { margin:0 0 4px; font-size:1.2rem; font-weight:400; letter-spacing:.06em; text-transform:uppercase; }
      .muenba-return-box .jp { margin:0 0 16px; color:#aac2b5; font-size:.85rem; letter-spacing:.1em; }
      .muenba-return-box p { margin:0 0 20px; color:#c5d8cd; font-size:.92rem; line-height:1.6; }
      .muenba-return-actions { display:flex; gap:10px; justify-content:center; }
      .muenba-return-actions button { flex:1; max-width:150px; padding:9px 14px; border-radius:999px; font:700 12px ui-monospace,monospace; letter-spacing:.04em; cursor:pointer; }
      #muenba-return-yes { border:1px solid rgba(156,203,182,.7); color:#e0f4e9; background:rgba(52,104,78,.28); box-shadow:0 0 16px rgba(93,162,124,.22); }
      #muenba-return-yes:hover, #muenba-return-yes:focus-visible { background:rgba(52,104,78,.44); outline:none; }
      #muenba-return-no { border:1px solid rgba(90,130,112,.5); color:#aec8bb; background:transparent; }
      #muenba-return-no:hover, #muenba-return-no:focus-visible { background:rgba(90,130,112,.16); outline:none; }
      @media (prefers-reduced-motion: reduce) { #muenba-fade, .muenba-return-box, #muenba-return-overlay { transition:none !important; } }
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

    const exitBtn = document.createElement('button');
    exitBtn.id = 'muenba-exit';
    exitBtn.type = 'button';
    exitBtn.textContent = 'Exit to Karasuki';
    exitBtn.addEventListener('click', returnToKarasuki);
    document.body.appendChild(exitBtn);

    buildReturnPortalOverlay();

    const dev = document.createElement('div');
    dev.id = 'muenba-dev';
    dev.innerHTML = '<strong>MUENBA DEV</strong><br><span id="muenba-dev-text"></span><br><button id="muenba-dev-coords" type="button">COORDS ON</button><div class="muenba-dev-small">Coords mode: click to pin, movement paused</div><div id="muenba-dev-arrows" class="muenba-dev-arrows"></div>';
    document.body.appendChild(dev);
    devReadout = document.getElementById('muenba-dev-text');
    devCoordToggle = document.getElementById('muenba-dev-coords');
    devArrowList = document.getElementById('muenba-dev-arrows');
    devCoordToggle.classList.toggle('active', state.coordMode);
    devCoordToggle.addEventListener('click', () => {
      state.coordMode = !state.coordMode;
      devCoordToggle.classList.toggle('active', state.coordMode);
      devCoordToggle.textContent = state.coordMode ? 'COORDS ON' : 'COORDS OFF';
    });

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

  // ── Per-room eerie glow + spirit motes ──────────────────────────────────
  // Every gradient below is built ONCE (cached in a Map, or lazily once for
  // the shared mote sprite) and reused with drawImage() every frame after
  // that. This is the same trick the Maze/Utsuroba passes already used to
  // keep createRadialGradient() off the per-frame hot path — cheap however
  // many rooms get visited in a session.

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function lightenRgb(rgb, amt) {
    return {
      r: Math.round(rgb.r + (255 - rgb.r) * amt),
      g: Math.round(rgb.g + (255 - rgb.g) * amt),
      b: Math.round(rgb.b + (255 - rgb.b) * amt)
    };
  }

  function roomGlowHex(roomId) {
    return (DATA.rooms[roomId].atmosphere && DATA.rooms[roomId].atmosphere.glow) || '#5a7a8a';
  }

  function getRoomGlow(roomId) {
    if (roomGlowCache.has(roomId)) return roomGlowCache.get(roomId);
    const rgb = hexToRgb(roomGlowHex(roomId));
    const canvas = document.createElement('canvas');
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
    const gctx = canvas.getContext('2d');
    GLOW_SPOTS.forEach(spot => {
      const grad = gctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.r);
      grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},.32)`);
      grad.addColorStop(.55, `rgba(${rgb.r},${rgb.g},${rgb.b},.12)`);
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      gctx.fillStyle = grad;
      gctx.beginPath();
      gctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
      gctx.fill();
    });
    roomGlowCache.set(roomId, canvas);
    return canvas;
  }

  // Lightened version of the same color, used for the exit arrows — the raw
  // glow hex is tuned to sit low and moody as ambient light, but needs a
  // boost to still read clearly as a UI element against a dark room.
  function getRoomGlowRgb(roomId) {
    if (roomGlowRgbCache.has(roomId)) return roomGlowRgbCache.get(roomId);
    const rgb = lightenRgb(hexToRgb(roomGlowHex(roomId)), .42);
    roomGlowRgbCache.set(roomId, rgb);
    return rgb;
  }

  function getMoteSprite() {
    if (moteSprite) return moteSprite;
    const c = document.createElement('canvas');
    c.width = 28;
    c.height = 28;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(14, 14, 0, 14, 14, 14);
    grad.addColorStop(0, 'rgba(224,238,232,.85)');
    grad.addColorStop(.5, 'rgba(196,220,214,.30)');
    grad.addColorStop(1, 'rgba(196,220,214,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(14, 14, 14, 0, Math.PI * 2);
    g.fill();
    moteSprite = c;
    return c;
  }

  // Motes are pure functions of elapsed time (no per-frame position
  // mutation) — reseeding a room just picks new base points and restarts
  // the clock, so there's nothing to update() every tick, only draw().
  function reseedMotes(roomId) {
    const now = performance.now();
    const next = [];
    for (let i = 0; i < MOTE_COUNT; i++) {
      next.push({
        baseX: 420 + Math.random() * 700,
        baseY: 380 + Math.random() * 420,
        phase: Math.random() * Math.PI * 2,
        swayAmp: 10 + Math.random() * 14,
        swayFreq: .4 + Math.random() * .3,
        speed: 10 + Math.random() * 10,
        range: 160 + Math.random() * 140,
        size: 1.6 + Math.random() * 1.8,
        baseAlpha: .35 + Math.random() * .3,
        twinkleFreq: .6 + Math.random() * .6,
        startedAt: now - Math.random() * 5000
      });
    }
    motes = next;
    void roomId; // motes don't vary by room identity, only by fresh random seed
  }

  function drawMotes(now) {
    const sprite = getMoteSprite();
    motes.forEach(m => {
      const t = (now - m.startedAt) / 1000;
      const y = m.baseY - ((t * m.speed) % m.range);
      const x = m.baseX + Math.sin(t * m.swayFreq + m.phase) * m.swayAmp;
      const twinkle = .5 + .5 * Math.sin(t * m.twinkleFreq + m.phase * 2);
      const alpha = m.baseAlpha * (.55 + twinkle * .45);
      const size = m.size * 8;
      atmosphereCtx.save();
      atmosphereCtx.globalAlpha = alpha;
      atmosphereCtx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      atmosphereCtx.restore();
    });
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
    reseedMotes(roomId);
    renderDevArrowList();
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

  // ── Return-to-Karasuki portal (Pass 2) ──────────────────────────────────
  // Same shape as Karasuki's own MUENBA_PORTAL: a glowing spot the player
  // can either click or simply walk up to, opening a themed confirm popup
  // rather than leaving instantly — matches the "Enter Muenba?" prompt on
  // the way in, so the round trip feels like one consistent doorway.

  function buildReturnPortalOverlay() {
    if (returnPortalOverlay) return;
    returnPortalOverlay = document.createElement('div');
    returnPortalOverlay.id = 'muenba-return-overlay';
    returnPortalOverlay.innerHTML = `
      <div class="muenba-return-box">
        <h2>Leave Muenba?</h2>
        <p class="jp">カラスキに戻りますか？</p>
        <p>The path back to Karasuki is open here.</p>
        <div class="muenba-return-actions">
          <button id="muenba-return-yes" type="button">Yes, return</button>
          <button id="muenba-return-no" type="button">Stay</button>
        </div>
      </div>`;
    document.body.appendChild(returnPortalOverlay);
    document.getElementById('muenba-return-yes').addEventListener('click', () => {
      closeReturnPortalPopup();
      returnToKarasuki();
    });
    document.getElementById('muenba-return-no').addEventListener('click', closeReturnPortalPopup);
    returnPortalOverlay.addEventListener('click', event => {
      if (event.target === returnPortalOverlay) closeReturnPortalPopup();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && returnPortalOpen) closeReturnPortalPopup();
    });
  }

  function openReturnPortalPopup() {
    if (returnPortalOpen || state.returnExiting) return;
    returnPortalOpen = true;
    state.clickTarget = null;
    state.moving = false;
    returnPortalOverlay.classList.add('open');
  }

  function closeReturnPortalPopup() {
    returnPortalOpen = false;
    returnPortalOverlay.classList.remove('open');
    returnPortalCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
  }

  function isReturnPortalOpen() { return returnPortalOpen; }

  function inReturnPortalRoom() { return state.roomId === KARASUKI_RETURN_PORTAL.roomId; }

  function checkReturnPortalProximity(now) {
    if (!inReturnPortalRoom() || returnPortalOpen || now < returnPortalCooldownUntil) return;
    if (state.inputLocked || state.transitioning) return;
    const d = Math.hypot(state.x - KARASUKI_RETURN_PORTAL.x, state.y - KARASUKI_RETURN_PORTAL.y);
    if (d <= KARASUKI_RETURN_PORTAL.triggerR) openReturnPortalPopup();
  }

  function clickCheckReturnPortal(worldX, worldY) {
    if (!inReturnPortalRoom() || returnPortalOpen || performance.now() < returnPortalCooldownUntil) return false;
    const d = Math.hypot(worldX - KARASUKI_RETURN_PORTAL.x, worldY - KARASUKI_RETURN_PORTAL.y);
    if (d <= KARASUKI_RETURN_PORTAL.r) {
      openReturnPortalPopup();
      return true;
    }
    return false;
  }

  function drawReturnPortal(now) {
    if (!inReturnPortalRoom()) return;
    const seconds = now / 1000;
    const pulse = .5 + .5 * Math.sin(seconds * 1.7);
    const cx = KARASUKI_RETURN_PORTAL.x;
    const cy = KARASUKI_RETURN_PORTAL.y;
    actorCtx.save();
    actorCtx.globalAlpha = .16 + pulse * .1;
    actorCtx.fillStyle = 'rgba(180,220,205,.9)';
    actorCtx.beginPath();
    actorCtx.arc(cx, cy, 46 + pulse * 10, 0, Math.PI * 2);
    actorCtx.fill();
    actorCtx.globalAlpha = .55 + pulse * .25;
    actorCtx.fillStyle = '#d8f4e6';
    actorCtx.shadowColor = 'rgba(150,210,190,.8)';
    actorCtx.shadowBlur = 18;
    actorCtx.beginPath();
    actorCtx.arc(cx, cy, 12 + pulse * 3, 0, Math.PI * 2);
    actorCtx.fill();
    actorCtx.restore();
  }

  function drawExitArrows(now) {
    const exits = getRoom().exits || [];
    const reveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    if (reveal <= 0) return;
    const backDir = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    const seconds = now / 1000;
    const glow = getRoomGlowRgb(state.roomId);
    const glowStr = `${glow.r},${glow.g},${glow.b}`;
    const coreStr = `${Math.min(255, glow.r + 35)},${Math.min(255, glow.g + 35)},${Math.min(255, glow.b + 35)}`;
    exits.forEach((exit, index) => {
      const hiddenUntil = exit.dir === backDir
        ? state.spawnLockUntil + ARRIVAL_ARROW_BACK_DELAY_MS
        : state.spawnLockUntil + ARRIVAL_ARROW_DELAY_MS;
      if (now < hiddenUntil) return;
      const fade = Math.min(1, (now - hiddenUntil) / 450) * reveal;
      const angle = DIR_ANGLE[exit.dir] || 0;
      // Two overlapping sine waves (instead of one smooth pulse) read as an
      // unsteady, slightly ghostly flicker rather than a mechanical glow.
      const flicker = .68 + .2 * Math.sin(seconds * 1.9 + index) + .12 * Math.sin(seconds * 6.3 + index * 2.4);
      const bounce = Math.sin(seconds * 1.5 + index) * 6;
      const x = exit.x + Math.cos(angle) * bounce;
      const y = exit.y + Math.sin(angle) * bounce;

      // Faint spectral trail behind the arrowhead — two small dots, no
      // extra gradients, cheap.
      actorCtx.save();
      actorCtx.translate(x, y);
      actorCtx.rotate(angle);
      for (let t = 1; t <= 2; t++) {
        actorCtx.globalAlpha = fade * flicker * (.15 / t);
        actorCtx.fillStyle = `rgb(${glowStr})`;
        actorCtx.beginPath();
        actorCtx.arc(-t * 13, 0, 5 - t, 0, Math.PI * 2);
        actorCtx.fill();
      }
      actorCtx.restore();

      actorCtx.save();
      actorCtx.translate(x, y);
      actorCtx.rotate(angle);
      actorCtx.globalAlpha = fade * (.55 + flicker * .35);
      actorCtx.strokeStyle = `rgb(${glowStr})`;
      actorCtx.lineWidth = 3;
      actorCtx.lineCap = 'round';
      actorCtx.lineJoin = 'round';
      actorCtx.beginPath();
      actorCtx.moveTo(-15, -10);
      actorCtx.lineTo(0, 0);
      actorCtx.lineTo(-15, 10);
      actorCtx.stroke();
      actorCtx.globalAlpha = fade * (.16 + flicker * .16);
      actorCtx.fillStyle = `rgb(${coreStr})`;
      actorCtx.beginPath();
      actorCtx.arc(0, 0, 30 + flicker * 10, 0, Math.PI * 2);
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

    // Room's eerie glow — cached gradient, screen-blended, slow uneven
    // pulse so it breathes instead of sitting static.
    const roomSeed = state.roomId.charCodeAt(state.roomId.length - 1);
    const glowPulse = .78 + .22 * Math.sin(now / 2100 + roomSeed);
    atmosphereCtx.save();
    atmosphereCtx.globalAlpha = glowPulse;
    atmosphereCtx.globalCompositeOperation = 'screen';
    atmosphereCtx.drawImage(getRoomGlow(state.roomId), 0, 0);
    atmosphereCtx.restore();

    drawMotes(now);

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

  function renderDevArrowList() {
    if (!devArrowList) return;
    const exits = getRoom().exits || [];
    devArrowList.textContent = exits.length
      ? exits.map(exit => `${exit.dir.padEnd(5, ' ')} x:${exit.x} y:${exit.y} → ${exit.to}`).join('\n')
      : 'No exits in this room';
  }

  function dropPin(x, y) {
    pins.push({ x, y, label: `${Math.round(x)}, ${Math.round(y)}` });
    if (pins.length > 30) pins.shift();
  }

  function drawPins() {
    if (!DEV_MODE || !state.coordMode) return;
    pins.forEach((pin, index) => {
      actorCtx.save();
      actorCtx.globalAlpha = .9;
      actorCtx.strokeStyle = '#8de8d2';
      actorCtx.lineWidth = 1.5;
      actorCtx.beginPath();
      actorCtx.moveTo(pin.x - 12, pin.y); actorCtx.lineTo(pin.x + 12, pin.y);
      actorCtx.moveTo(pin.x, pin.y - 12); actorCtx.lineTo(pin.x, pin.y + 12);
      actorCtx.stroke();
      actorCtx.fillStyle = '#d8fff2';
      actorCtx.beginPath(); actorCtx.arc(pin.x, pin.y, 4, 0, Math.PI * 2); actorCtx.fill();
      actorCtx.font = '700 11px ui-monospace,monospace';
      actorCtx.fillStyle = '#c8f8e8';
      actorCtx.fillText(`${index + 1}. ${pin.label}`, pin.x + 9, pin.y - 10);
      actorCtx.restore();
    });
  }

  function drawFrame(now) {
    atmosphereCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    actorCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    drawAtmosphere(now);
    drawReturnPortal(now);
    drawExitArrows(now);
    drawBooha(now);
    drawPins();
    if (DEV_MODE && devReadout) {
      const hover = devHover ? `  mouse:${Math.round(devHover.x)},${Math.round(devHover.y)}` : '';
      devReadout.textContent = `${state.roomId}  player:${Math.round(state.x)},${Math.round(state.y)}${hover}`;
    }
  }

  function stagePoint(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * WORLD_W / rect.width,
      y: (clientY - rect.top) * WORLD_H / rect.height
    };
  }

  function handleInput(clientX, clientY) {
    startMusic();
    if (state.transitioning || state.inputLocked || returnPortalOpen) return;
    const point = stagePoint(clientX, clientY);
    if (DEV_MODE && state.coordMode) {
      dropPin(point.x, point.y);
      return;
    }
    if (clickCheckReturnPortal(point.x, point.y)) return;
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
      devHover = point;
    });
    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('touchend', startMusic, { once: true, passive: true });
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
    if (!state.transitioning && !returnPortalOpen) {
      const drifting = tickEntryDrift(now);
      if (!drifting && !state.inputLocked) {
        handleMovement(now);
        const exit = getAvailableExit(now);
        if (exit) transitionTo(exit);
        checkReturnPortalProximity(now);
      }
    }
    drawFrame(now);
    window.requestAnimationFrame(tick);
  }

  function init() {
    if (!worldGateOpen()) {
      showLockedWorld();
      return;
    }
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

  Object.defineProperty(window, 'b_muenba', {
    value: () => {
      window.__devMuenba = true;
      if (!DEV_MODE) window.location.href = 'muenba.html?dev=1';
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
