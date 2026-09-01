/*
 * Grimmerglen world shell — Pass 8 placement and pickup foundation.
 *
 * This is the room-walker engine: 15 rooms, fade transitions, exit arrows,
 * entry drift, movement/collision, Marietta's card, and the 24-object memory
 * hunt. Cloned from Muenba's engine shape (js/muenba.js) with everything
 * Muenba-specific stripped out (no ghosts, rhythm game, or case/briefing
 * content).
 *
 * The world gate follows the shared nine-game weekly readiness gate. DEV mode
 * still bypasses that gate for room and coordinate calibration.
 *
 * Per-room walkable/exit calibration remains a later follow-up after someone
 * has walked all nine rooms with the DEV overlay.
 *   - Exit coordinates and walkable rectangles are placeholders (see
 *     grimmerglen-data.js) — tune them per room with the DEV overlay below
 *     once someone has actually walked all 15 rooms.
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
  const GRIMMERGLEN_PROFILE_PORTAL = { roomId: 'room_01', x: 1111, y: 787 };
  const POPUP_COOLDOWN_MS = 900;
  const OBJECT_HIT_R = 58;
  const OBJECT_DRAW_SIZE = 58;
  const OBJECT_PROXIMITY_R = 58;
  // Keep collectibles in the flower-bed clearings around the four-way path.
  // The central cross is deliberately never a spawn zone, so the travel
  // lanes stay readable and unobstructed.
  const OBJECT_CLEARING_ZONES = [
    { x: [410, 580], y: [150, 300] },
    { x: [950, 1120], y: [150, 300] },
    { x: [410, 580], y: [770, 920] },
    { x: [950, 1120], y: [770, 920] },
    { x: [110, 280], y: [440, 650] },
    { x: [1250, 1425], y: [440, 650] }
  ];
  const OBJECT_LABELS = {
    banner: 'Banner',
    ticket: 'Ticket',
    pillow: 'Pillow',
    backpack: 'Backpack',
    book: 'Book',
    teddyBear: 'Teddy bear',
    toGoCoffeeCup: 'To-go coffee cup',
    ball: 'Ball'
  };

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
    returnExiting: false,
    boohaTransformed: false,
    boohaTransforming: false,
    boohaTransformStartedAt: 0,
    boohaTransformPoofUntil: 0,
    entryWelcomePending: false,
    navigationUnlocked: false,
    helpAccepted: false,
    celebrating: false,
    celebrationStart: 0,
    celebrationTimer: 0,
    celebrationFinishing: false
  };

  let app, stage, roomLayer, atmosphereCanvas, atmosphereCtx, actorCanvas, actorCtx, fadeEl, currentBg;
  let devPanel, devReadout, devMousePoint = null;
  let entryDrift = null;
  let mariettaPanel = null, mariettaPanelOpen = false, mariettaPanelCooldown = 0;
  let grimmerglenProfilePortal = null;
  let boohaChangeOverlay = null;
  let carriedObject = null, handoffObject = null;
  let returnPortalOverlay = null, returnPortalOpen = false, returnPortalCooldownUntil = 0;
  let objectProgressCache = null, objectSlotsCache = null, activeTargetTypeCache = null;
  let lastTouchEnd = 0;
  const imageCache = new Map();
  const objectImageCache = new Map();
  const roomGlowCache = new Map();
  const sparkles = [];
  const edgeLeaves = [];
  let objectVisitLayout = new Map();

  const boohaImg = new Image();
  boohaImg.decoding = 'async';
  boohaImg.src = 'assets/img/booha_ghost.webp';

  // Booha's Grimmerglen sprite -- swapped in after the player accepts the
  // entry-change prompt (see triggerBoohaTransformIfNeeded()/playBoohaTransform()
  // near the tutorial section below), with a full recorded change cue.
  const boohaGrimmerglenImg = new Image();
  boohaGrimmerglenImg.decoding = 'async';
  boohaGrimmerglenImg.src = (DATA.booha && DATA.booha.sprite) || 'assets/img/grimmerglen/booha_grimmerglen.webp';
  let boohaShakeUntil = 0;
  let boohaShakeSeed = Math.random() * 1000;
  const boohaTransformParticles = [];
  const BOOHA_CHANGE_FALLBACK_MS = 3000;
  const BOOHA_CHANGE_START_DELAY_MS = 900;
  const BOOHA_TRANSFORM_POOF_MS = 620;

  // Grimmerglen music follows the existing world-audio convention: the room
  // track loops, while the celebration track is loaded only when the future
  // memory-complete dance is actually triggered. Keeping the dance lazy avoids
  // making every room entry pay for an audio track it may never use.
  const GRIMMERGLEN_MUSIC_VOLUME = 0.46;
  const GRIMMERGLEN_DANCE_VOLUME = 0.72;
  const GRIMMERGLEN_DANCE_FALLBACK_MS = 15100;
  const grimmerglenMusic = new Audio('assets/img/grimmerglen/grimmerglen_bgm.mp3');
  grimmerglenMusic.preload = 'auto';
  grimmerglenMusic.loop = true;
  grimmerglenMusic.volume = GRIMMERGLEN_MUSIC_VOLUME;
  const grimmerglenDance = new Audio('assets/img/grimmerglen/grimmerglen_dance.mp3');
  grimmerglenDance.preload = 'metadata';
  grimmerglenDance.loop = false;
  grimmerglenDance.volume = GRIMMERGLEN_DANCE_VOLUME;
  const boohaChangeAudio = new Audio('assets/img/grimmerglen/booha_change.mp3');
  boohaChangeAudio.preload = 'auto';
  boohaChangeAudio.loop = false;
  boohaChangeAudio.volume = 0.88;
  let boohaChangePromptOpen = false;
  let boohaChangeStartTimer = 0;
  let grimmerglenDanceAudioActive = false;
  let grimmerglenDanceAudioToken = 0;
  const GRIMMERGLEN_DANCE_FRAME_MS = 480;
  const GRIMMERGLEN_DANCE_MARIETTA_SIZE = 82;
  const GRIMMERGLEN_DANCE_BOOHA_SIZE = 66;
  const GRIMMERGLEN_DANCE_GAP = 54;
  const grimmerglenDanceImages = {
    marietta: ((DATA.dance && DATA.dance.marietta) || []).map(src => {
      const image = new Image(); image.decoding = 'async'; image.src = src; return image;
    }),
    booha: ((DATA.dance && DATA.dance.booha) || []).map(src => {
      const image = new Image(); image.decoding = 'async'; image.src = src; return image;
    })
  };
  const grimmerglenDanceSparkles = [];

  function startGrimmerglenMusic() {
    if (state.returnExiting || grimmerglenDanceAudioActive) return;
    if (!grimmerglenMusic.paused && !grimmerglenMusic.ended) {
      state.musicStarted = true;
      return;
    }
    state.musicStarted = true;
    const playback = grimmerglenMusic.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => { state.musicStarted = false; });
    }
  }

  function stopGrimmerglenMusic(reset = true) {
    state.musicStarted = false;
    grimmerglenMusic.pause();
    if (reset) {
      try { grimmerglenMusic.currentTime = 0; } catch (_) {}
    }
  }

  function stopGrimmerglenDanceMusic() {
    grimmerglenDanceAudioToken += 1;
    grimmerglenDanceAudioActive = false;
    grimmerglenDance.pause();
    try { grimmerglenDance.currentTime = 0; } catch (_) {}
  }

  // The later center-room dance pass can use the returned duration to keep
  // both dance sprites and their glitter effect exactly in sync with audio.
  function playGrimmerglenDanceMusic(onFinished) {
    const token = ++grimmerglenDanceAudioToken;
    grimmerglenDanceAudioActive = true;
    stopGrimmerglenMusic();
    grimmerglenDance.preload = 'auto';
    grimmerglenDance.pause();
    try { grimmerglenDance.currentTime = 0; } catch (_) {}
    const finish = () => {
      if (token !== grimmerglenDanceAudioToken) return;
      grimmerglenDanceAudioActive = false;
      grimmerglenDance.pause();
      try { grimmerglenDance.currentTime = 0; } catch (_) {}
      if (typeof onFinished === 'function') onFinished();
      startGrimmerglenMusic();
    };
    grimmerglenDance.addEventListener('ended', finish, { once: true });
    const playback = grimmerglenDance.play();
    if (playback && typeof playback.catch === 'function') playback.catch(() => {});
    return Number.isFinite(grimmerglenDance.duration) && grimmerglenDance.duration > 0
      ? Math.round(grimmerglenDance.duration * 1000)
      : GRIMMERGLEN_DANCE_FALLBACK_MS;
  }

  grimmerglenMusic.addEventListener('ended', () => {
    if (!state.returnExiting && !grimmerglenDanceAudioActive) startGrimmerglenMusic();
  });

  const mariettaImg = new Image();
  if (MARIETTA && MARIETTA.poses && MARIETTA.poses[0]) {
    mariettaImg.decoding = 'async';
    mariettaImg.src = MARIETTA.poses[0];
  }
  const mariettaWaitingImg = new Image();
  if (MARIETTA && MARIETTA.poses && MARIETTA.poses[4]) {
    mariettaWaitingImg.decoding = 'async';
    mariettaWaitingImg.src = MARIETTA.poses[4];
  }

  Object.keys(DATA.collectibles || {}).forEach(type => {
    const image = new Image();
    image.decoding = 'async';
    image.src = DATA.collectibles[type];
    objectImageCache.set(type, image);
  });

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
      gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},.34)`);
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
    edgeLeaves.length = 0;
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
    // Keep the leaves petite, but make the edge vignette feel fuller. Each
    // edge gets an even lane distribution so the extra leaves add coverage
    // instead of clustering in a few corners.
    const EDGE_LEAF_COUNT = 72;
    const leavesPerSide = EDGE_LEAF_COUNT / 4;
    for (let i = 0; i < EDGE_LEAF_COUNT; i++) {
      const side = i % 4;
      const lane = (Math.floor(i / 4) + .5) / leavesPerSide;
      const inset = 28 + ((seed * 19 + i * 23) % 105);
      edgeLeaves.push({
        side,
        x: side < 2 ? lane * WORLD_W : (side === 2 ? inset : WORLD_W - inset),
        y: side < 2 ? (side === 0 ? inset : WORLD_H - inset) : lane * WORLD_H,
        phase: seed * .7 + i * 1.83,
        size: 5.5 + (i % 4) * 1.2,
        speed: .34 + (i % 4) * .07,
        baseAlpha: .3 + ((seed * 17 + i * 29) % 8) * .055
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

  function drawEdgeLeaves(now) {
    if (REDUCED_MOTION) return;
    const rgb = getRoomGlowRgb(state.roomId);
    const seconds = now / 1000;
    for (const leaf of edgeLeaves) {
      const sway = Math.sin(seconds * leaf.speed + leaf.phase) * 30;
      const bob = Math.cos(seconds * leaf.speed * 1.35 + leaf.phase) * 22;
      let x = leaf.x;
      let y = leaf.y;
      if (leaf.side < 2) { x += sway; y += bob; }
      else { x += bob; y += sway; }
      const rotation = seconds * (leaf.side % 2 ? -.18 : .18) + leaf.phase;
      const alpha = Math.max(.22, Math.min(.78, leaf.baseAlpha + .07 * Math.sin(seconds * 1.4 + leaf.phase)));
      atmosphereCtx.save();
      atmosphereCtx.translate(x, y);
      atmosphereCtx.rotate(rotation);
      atmosphereCtx.globalAlpha = alpha;
      atmosphereCtx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      atmosphereCtx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},.75)`;
      atmosphereCtx.shadowBlur = 11;
      atmosphereCtx.beginPath();
      atmosphereCtx.moveTo(0, -leaf.size);
      atmosphereCtx.quadraticCurveTo(leaf.size * 1.15, -leaf.size * .15, 0, leaf.size);
      atmosphereCtx.quadraticCurveTo(-leaf.size * 1.15, -leaf.size * .15, 0, -leaf.size);
      atmosphereCtx.fill();
      atmosphereCtx.shadowBlur = 0;
      atmosphereCtx.strokeStyle = 'rgba(255,255,255,.3)';
      atmosphereCtx.lineWidth = .8;
      atmosphereCtx.beginPath();
      atmosphereCtx.moveTo(0, -leaf.size * .72);
      atmosphereCtx.lineTo(0, leaf.size * .68);
      atmosphereCtx.stroke();
      atmosphereCtx.restore();
    }
  }

  function drawPastelVignette() {
    const rgb = getRoomGlowRgb(state.roomId);
    const radius = Math.max(WORLD_W, WORLD_H) * .72;
    const gradient = atmosphereCtx.createRadialGradient(CENTER_X, CENTER_Y, radius * .18, CENTER_X, CENTER_Y, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(.62, `rgba(${rgb.r},${rgb.g},${rgb.b},.025)`);
    gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},.3)`);
    atmosphereCtx.save();
    atmosphereCtx.fillStyle = gradient;
    atmosphereCtx.fillRect(0, 0, WORLD_W, WORLD_H);
    atmosphereCtx.restore();
  }

  function drawAtmosphere(now) {
    atmosphereCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    const seed = Number(state.roomId.slice(-2)) || 1;
    const pulse = REDUCED_MOTION ? .85 : .78 + .22 * Math.sin(now / 2100 + seed);
    atmosphereCtx.save();
    atmosphereCtx.globalAlpha = pulse * .72;
    atmosphereCtx.globalCompositeOperation = 'screen';
    atmosphereCtx.drawImage(getRoomGlow(state.roomId), 0, 0);
    atmosphereCtx.restore();
    drawPastelVignette();
    drawEdgeLeaves(now);
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

  function getRoomExits(roomId) {
    return (DATA.rooms[roomId]?.exits || []).filter(exit => exit && DATA.rooms[exit.to]);
  }

  function preloadAdjacent(roomId) {
    getImage(roomId);
    for (const exit of getRoomExits(roomId)) getImage(exit.to);
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

  function updateGrimmerglenProfilePortal() {
    if (!grimmerglenProfilePortal) return;
    const visible = state.roomId === GRIMMERGLEN_PROFILE_PORTAL.roomId && !state.celebrating && !state.returnExiting;
    grimmerglenProfilePortal.classList.toggle('is-visible', visible);
    grimmerglenProfilePortal.setAttribute('aria-hidden', visible ? 'false' : 'true');
    grimmerglenProfilePortal.tabIndex = visible ? 0 : -1;
  }

  function buildGrimmerglenProfilePortal() {
    if (grimmerglenProfilePortal) return;
    grimmerglenProfilePortal = document.createElement('a');
    grimmerglenProfilePortal.id = 'grimmerglen-profile-portal';
    grimmerglenProfilePortal.href = 'grimmerglen-profile.html';
    grimmerglenProfilePortal.setAttribute('aria-label', 'Open Grimmerglen profile / グリマーグレンプロフィールをひらく');
    grimmerglenProfilePortal.title = 'Open Grimmerglen profile';
    grimmerglenProfilePortal.innerHTML = '<span aria-hidden="true">G</span>';
    grimmerglenProfilePortal.addEventListener('click', event => {
      if (state.celebrating || state.returnExiting) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    stage.appendChild(grimmerglenProfilePortal);
    updateGrimmerglenProfilePortal();
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
    state.entryWelcomePending = false;
    state.inputLocked = false;
    state.distMovedSinceSpawn = 0;
    state.transitionReadyAt = performance.now() + TRANSITION_COOLDOWN_MS;
    state.spawnLockUntil = performance.now() + 700;
    showRoom(roomId);
    updateGrimmerglenProfilePortal();
    markGrimmerglenRoomVisited(roomId);
    reseedSparkles(roomId);
    reseedObjectLayout(roomId);
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
      // Do not leave a clickable frame between arriving at the center and
      // starting the transformation sequence.
      state.inputLocked = state.spawnId === 'fromKarasuki';
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
    if (!state.navigationUnlocked) return null;
    if (state.inputLocked || state.transitioning || state.celebrating || state.returnExiting) return null;
    if (now < state.transitionReadyAt || now < state.spawnLockUntil) return null;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return null;
    const backDir = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    for (const exit of getRoomExits(state.roomId)) {
      if (Math.hypot(state.x - exit.x, state.y - exit.y) > EXIT_RADIUS) continue;
      if (exit.dir === backDir && now < state.spawnLockUntil + ARRIVAL_ARROW_BACK_DELAY_MS) continue;
      return exit;
    }
    return null;
  }

  function transitionTo(exit) {
    if (!exit || state.transitioning || state.celebrating || state.returnExiting) return;
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
    if (!state.navigationUnlocked) return;
    if (state.celebrating || state.returnExiting) return;
    const exits = getRoomExits(state.roomId);
    // Help is the visibility gate. Once navigation is unlocked, show every
    // real room connection as soon as the room is ready, including when the
    // player has not moved yet in a newly entered room.
    const reveal = 1;
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
    const waitingForMemory = isMariettaWaitingForMemory();
    const sprite = waitingForMemory && mariettaWaitingImg.complete && mariettaWaitingImg.naturalWidth > 0
      ? mariettaWaitingImg : mariettaImg;
    if (!sprite.complete || sprite.naturalWidth === 0) return;
    const seconds = now / 1000;
    const pulse = REDUCED_MOTION ? .82 : .72 + Math.sin(seconds * 2.2) * .1;
    const size = MARIETTA.drawR * 2;
    const haloRadius = size * (waitingForMemory ? 1.78 : 1.45);
    actorCtx.save();
    const halo = actorCtx.createRadialGradient(MARIETTA.x, MARIETTA.y, 5, MARIETTA.x, MARIETTA.y, haloRadius);
    halo.addColorStop(0, `rgba(255,245,252,${.72 * pulse})`);
    halo.addColorStop(.45, `rgba(255,159,194,${(waitingForMemory ? .48 : .28) * pulse})`);
    halo.addColorStop(1, 'rgba(184,164,255,0)');
    actorCtx.fillStyle = halo;
    actorCtx.beginPath();
    actorCtx.arc(MARIETTA.x, MARIETTA.y, haloRadius, 0, Math.PI * 2);
    actorCtx.fill();
    if (waitingForMemory) {
      actorCtx.globalAlpha = .28 + pulse * .1;
      actorCtx.strokeStyle = '#ff9fc2';
      actorCtx.shadowColor = 'rgba(255,159,194,.9)';
      actorCtx.shadowBlur = 22;
      actorCtx.lineWidth = 3;
      actorCtx.beginPath();
      actorCtx.arc(MARIETTA.x, MARIETTA.y, size * 1.2 + Math.sin(seconds * 2) * 3, 0, Math.PI * 2);
      actorCtx.stroke();
    }
    actorCtx.globalAlpha = .98;
    actorCtx.shadowColor = waitingForMemory ? 'rgba(255,159,194,.72)' : 'transparent';
    actorCtx.shadowBlur = waitingForMemory ? 12 : 0;
    actorCtx.drawImage(sprite, MARIETTA.x - size / 2, MARIETTA.y - size / 2, size, size);
    actorCtx.restore();
  }

  function spawnGrimmerglenDanceSparkle(now) {
    if (REDUCED_MOTION) return;
    const colors = ['#ff9fc2', '#ffe066', '#b8a4ff', '#8fe6c4', '#ffffff'];
    const angle = Math.random() * Math.PI * 2;
    const radius = 18 + Math.random() * 60;
    grimmerglenDanceSparkles.push({
      x: CENTER_X + Math.cos(angle) * radius,
      y: CENTER_Y + Math.sin(angle) * radius * .7,
      vx: (Math.random() - .5) * .55,
      vy: -(0.25 + Math.random() * .5),
      life: 1,
      size: 1.5 + Math.random() * 2.6,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2,
      bornAt: now
    });
  }

  function drawGrimmerglenDanceSparkles(now) {
    if (!grimmerglenDanceSparkles.length) return;
    for (let i = grimmerglenDanceSparkles.length - 1; i >= 0; i--) {
      const sparkle = grimmerglenDanceSparkles[i];
      sparkle.life -= .022;
      if (sparkle.life <= 0) { grimmerglenDanceSparkles.splice(i, 1); continue; }
      sparkle.x += sparkle.vx;
      sparkle.y += sparkle.vy;
      const twinkle = .55 + .45 * Math.sin(now / 90 + sparkle.phase);
      actorCtx.save();
      actorCtx.globalAlpha = sparkle.life * twinkle;
      actorCtx.fillStyle = sparkle.color;
      actorCtx.shadowColor = sparkle.color;
      actorCtx.shadowBlur = 10;
      actorCtx.beginPath();
      actorCtx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
      actorCtx.fill();
      actorCtx.restore();
    }
  }

  function drawGrimmerglenCelebration(now) {
    const elapsed = Math.max(0, (now - state.celebrationStart) / 1000);
    const frameIndex = REDUCED_MOTION ? 0 : Math.floor(elapsed * 1000 / GRIMMERGLEN_DANCE_FRAME_MS) % 3;
    const mariettaFrame = grimmerglenDanceImages.marietta[frameIndex];
    const boohaFrame = grimmerglenDanceImages.booha[frameIndex];
    const beat = REDUCED_MOTION ? 0 : Math.sin(elapsed * 6.3);
    const mariettaX = CENTER_X - GRIMMERGLEN_DANCE_GAP;
    const boohaX = CENTER_X + GRIMMERGLEN_DANCE_GAP;
    const mariettaY = CENTER_Y + (REDUCED_MOTION ? 0 : Math.cos(elapsed * 3.15) * 7 + beat * 3);
    const boohaY = CENTER_Y + (REDUCED_MOTION ? 0 : Math.sin(elapsed * 3.15 + .8) * 8 - beat * 2);

    if (!REDUCED_MOTION && Math.random() < .42) spawnGrimmerglenDanceSparkle(now);
    drawGrimmerglenDanceSparkles(now);

    actorCtx.save();
    actorCtx.globalAlpha = .22;
    actorCtx.fillStyle = '#fff4fb';
    actorCtx.shadowColor = '#ff9fc2';
    actorCtx.shadowBlur = 34;
    actorCtx.beginPath();
    actorCtx.ellipse(CENTER_X, CENTER_Y + 30, 150, 86, 0, 0, Math.PI * 2);
    actorCtx.fill();
    actorCtx.restore();

    if (mariettaFrame && mariettaFrame.complete && mariettaFrame.naturalWidth > 0) {
      actorCtx.drawImage(mariettaFrame, mariettaX - GRIMMERGLEN_DANCE_MARIETTA_SIZE / 2, mariettaY - GRIMMERGLEN_DANCE_MARIETTA_SIZE / 2, GRIMMERGLEN_DANCE_MARIETTA_SIZE, GRIMMERGLEN_DANCE_MARIETTA_SIZE);
    }
    if (boohaFrame && boohaFrame.complete && boohaFrame.naturalWidth > 0) {
      actorCtx.drawImage(boohaFrame, boohaX - GRIMMERGLEN_DANCE_BOOHA_SIZE / 2, boohaY - GRIMMERGLEN_DANCE_BOOHA_SIZE / 2, GRIMMERGLEN_DANCE_BOOHA_SIZE, GRIMMERGLEN_DANCE_BOOHA_SIZE);
    }
  }

  function randomInRange(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
  }

  function getObjectViewportBounds() {
    const scale = Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    const visibleWorldW = Math.min(WORLD_W, window.innerWidth / scale);
    const visibleWorldH = Math.min(WORLD_H, window.innerHeight / scale);
    // Keep both the drawn object and its pickup radius inside the visible
    // crop. This matters on landscape phones, where fitStage intentionally
    // fills the viewport and trims a little from the top and bottom.
    const margin = Math.max(OBJECT_HIT_R, OBJECT_DRAW_SIZE / 2) + 8;
    return {
      minX: Math.max(margin, (WORLD_W - visibleWorldW) / 2 + margin),
      maxX: Math.min(WORLD_W - margin, (WORLD_W + visibleWorldW) / 2 - margin),
      minY: Math.max(margin, (WORLD_H - visibleWorldH) / 2 + margin),
      maxY: Math.min(WORLD_H - margin, (WORLD_H + visibleWorldH) / 2 - margin)
    };
  }

  function safeObjectRange(range, min, max) {
    const low = Math.max(range[0], min);
    const high = Math.min(range[1], max);
    if (low <= high) return [low, high];
    const nearest = Math.max(min, Math.min(max, (range[0] + range[1]) / 2));
    return [nearest, nearest];
  }

  function constrainObjectLayoutToViewport() {
    if (!objectVisitLayout.size) return;
    const viewport = getObjectViewportBounds();
    objectVisitLayout = new Map(Array.from(objectVisitLayout.entries(), ([id, point]) => [id, {
      x: Math.max(viewport.minX, Math.min(viewport.maxX, point.x)),
      y: Math.max(viewport.minY, Math.min(viewport.maxY, point.y))
    }]));
  }

  function reseedObjectLayout(roomId) {
    objectVisitLayout = new Map();
    const entries = [];
    Object.keys(DATA.objects || {}).forEach(type => {
      (DATA.objects[type] || []).forEach((placement, index) => {
        if (placement && placement.room === roomId) {
          entries.push({ id: `${type}-${index + 1}` });
        }
      });
    });
    const zones = OBJECT_CLEARING_ZONES.slice().sort(() => Math.random() - .5);
    const viewport = getObjectViewportBounds();
    const used = [];
    entries.forEach((entry, entryIndex) => {
      let point = null;
      for (let attempt = 0; attempt < 20 && !point; attempt++) {
        const zone = zones[(entryIndex + attempt) % zones.length];
        const xRange = safeObjectRange(zone.x, viewport.minX, viewport.maxX);
        const yRange = safeObjectRange(zone.y, viewport.minY, viewport.maxY);
        const candidate = { x: randomInRange(xRange), y: randomInRange(yRange) };
        if (used.every(other => Math.hypot(candidate.x - other.x, candidate.y - other.y) >= 120)) {
          point = candidate;
        }
      }
      if (!point) point = {
        x: Math.max(viewport.minX, Math.min(viewport.maxX, 768 + entryIndex * 130)),
        y: Math.max(viewport.minY, Math.min(viewport.maxY, 220 + entryIndex * 210))
      };
      used.push(point);
      objectVisitLayout.set(entry.id, point);
    });
  }

  function getRoomObjects(roomId) {
    const objects = [];
    Object.keys(DATA.objects || {}).forEach(type => {
      (DATA.objects[type] || []).forEach((placement, index) => {
        if (!placement || placement.room !== roomId) return;
        const point = objectVisitLayout.get(`${type}-${index + 1}`);
        objects.push(Object.assign({
          id: `${type}-${index + 1}`,
          type,
          index,
          label: OBJECT_LABELS[type] || type
        }, placement, point || {}));
      });
    });
    return objects;
  }

  function isGrimmerglenObjectFound(object, progress, slots) {
    if (slots[object.id] === true) return true;
    // Early count-only saves did not record which physical copy was found.
    // Do not guess that the first manifest slot was found: most first slots
    // live in room_01, which made its hunted items disappear in test saves.
    // Exact objectSlots are authoritative for all new pickups.
    return false;
  }

  function drawGrimmerglenObjects(now) {
    const objects = getRoomObjects(state.roomId);
    if (!objects.length) return;
    const progress = getGrimmerglenObjectsProgress();
    const slots = getGrimmerglenObjectSlots();
    const seconds = now / 1000;
    objects.forEach((object, index) => {
      if (isGrimmerglenObjectFound(object, progress, slots)) return;
      if (carriedObject && carriedObject.id === object.id) return;
      const image = objectImageCache.get(object.type);
      if (!image || !image.complete || image.naturalWidth === 0) return;
      const bob = REDUCED_MOTION ? 0 : Math.sin(seconds * 2.2 + index * 1.7) * 3;
      const glow = getRoomGlowRgb(state.roomId);
      actorCtx.save();
      actorCtx.globalAlpha = .95;
      actorCtx.shadowColor = `rgba(${glow.r},${glow.g},${glow.b},.9)`;
      actorCtx.shadowBlur = 15;
      actorCtx.beginPath();
      actorCtx.fillStyle = `rgba(255,255,255,${REDUCED_MOTION ? .24 : .16 + .06 * Math.sin(seconds * 2.2 + index)})`;
      actorCtx.arc(object.x, object.y + bob, 31, 0, Math.PI * 2);
      actorCtx.fill();
      actorCtx.shadowBlur = 0;
      actorCtx.drawImage(image, object.x - OBJECT_DRAW_SIZE / 2, object.y - OBJECT_DRAW_SIZE / 2 + bob, OBJECT_DRAW_SIZE, OBJECT_DRAW_SIZE);
      actorCtx.restore();
    });
  }

  function getNearestUnfoundObject(worldX, worldY, maxDistance) {
    const progress = getGrimmerglenObjectsProgress();
    const slots = getGrimmerglenObjectSlots();
    let nearest = null;
    let nearestDistance = maxDistance;
    getRoomObjects(state.roomId).forEach(object => {
      if (isGrimmerglenObjectFound(object, progress, slots)) return;
      const distance = Math.hypot(worldX - object.x, worldY - object.y);
      if (distance <= nearestDistance) {
        nearest = object;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  function findGrimmerglenObjectById(id) {
    if (!id) return null;
    for (const type of Object.keys(DATA.objects || {})) {
      const index = (DATA.objects[type] || []).findIndex((placement, slotIndex) => `${type}-${slotIndex + 1}` === id);
      if (index >= 0) {
        const placement = DATA.objects[type][index];
        return Object.assign({ id, type, index, label: OBJECT_LABELS[type] || type }, placement, objectVisitLayout.get(id) || {});
      }
    }
    return null;
  }

  function drawCarriedObject(now) {
    if (!carriedObject) return;
    const image = objectImageCache.get(carriedObject.type);
    if (!image || !image.complete || image.naturalWidth === 0) return;
    const bob = REDUCED_MOTION ? 0 : Math.sin(now / 1000 * 3.4) * 2;
    actorCtx.save();
    actorCtx.globalAlpha = .98;
    actorCtx.shadowColor = 'rgba(255,159,194,.85)';
    actorCtx.shadowBlur = 12;
    actorCtx.drawImage(image, state.x + 27, state.y - 54 + bob, 42, 42);
    actorCtx.restore();
  }

  function drawBooha(now) {
    const seconds = now / 1000;
    const bob = Math.sin(seconds * 4.18) * 8;
    const wobble = Math.sin(seconds * 8.36) * 2.2;
    // Keep the normal yellow Booha visibly shaking for the full recorded
    // reveal. The sprite swaps only at the end, so the player sees the
    // transformation instead of arriving to an already-changed character.
    const shakeActive = !REDUCED_MOTION && (state.boohaTransforming || now < boohaShakeUntil);
    const shakeT = state.boohaTransforming ? 1 : (shakeActive ? (boohaShakeUntil - now) / 520 : 0);
    const shakeX = shakeActive ? Math.sin(now * 0.12 + boohaShakeSeed) * 7 * shakeT : 0;
    const shakeY = shakeActive ? Math.cos(now * 0.17 + boohaShakeSeed) * 5 * shakeT : 0;
    const shakeWobble = shakeActive ? Math.sin(now * 0.2 + boohaShakeSeed) * 10 * shakeT : 0;
    actorCtx.save();
    actorCtx.translate(state.x + shakeX, state.y + bob + shakeY);
    actorCtx.rotate((wobble + shakeWobble) * Math.PI / 180);
    actorCtx.globalAlpha = .96;
    const sprite = state.boohaTransformed ? boohaGrimmerglenImg : boohaImg;
    if (sprite.complete && sprite.naturalWidth > 0) {
      const boxSize = BOOHA_R * 2;
      actorCtx.drawImage(sprite, -boxSize / 2, -boxSize / 2, boxSize, boxSize);
    } else {
      actorCtx.fillStyle = '#ffe56d';
      actorCtx.beginPath();
      actorCtx.arc(0, 0, BOOHA_R * .72, 0, Math.PI * 2);
      actorCtx.fill();
    }
    actorCtx.restore();
  }

  // Sparkle-burst particles for the transform reveal -- canvas-native
  // (drawn on actorCtx, same as drawBooha itself) rather than the DOM/CSS
  // particle technique grimmerglen-typing.js uses for its correct-answer
  // celebration, since Booha lives on a <canvas>, not in the DOM.
  const BOOHA_TRANSFORM_COLORS = ['#ff9fc2', '#ffe066', '#8fd0ff', '#b8a4ff', '#8fe6c4'];
  function spawnBoohaTransformSparkles() {
    if (REDUCED_MOTION) return;
    boohaTransformParticles.length = 0;
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const dist = 46 + Math.random() * 40;
      boohaTransformParticles.push({
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: 3 + Math.random() * 3,
        color: BOOHA_TRANSFORM_COLORS[i % BOOHA_TRANSFORM_COLORS.length],
        bornAt: performance.now(),
        lifeMs: 620 + Math.random() * 180
      });
    }
  }

  function drawBoohaTransformFX(now) {
    if (state.boohaTransforming && !REDUCED_MOTION && Math.random() < .42) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 32 + Math.random() * 58;
      boohaTransformParticles.push({
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: 2 + Math.random() * 4,
        color: BOOHA_TRANSFORM_COLORS[Math.floor(Math.random() * BOOHA_TRANSFORM_COLORS.length)],
        bornAt: now,
        lifeMs: 520 + Math.random() * 380
      });
    }
    if (state.boohaTransformPoofUntil > now) {
      const poofT = Math.max(0, (state.boohaTransformPoofUntil - now) / BOOHA_TRANSFORM_POOF_MS);
      actorCtx.save();
      actorCtx.globalAlpha = poofT * .72;
      actorCtx.strokeStyle = '#fff4fb';
      actorCtx.shadowColor = '#b8a4ff';
      actorCtx.shadowBlur = 26;
      actorCtx.lineWidth = 4 + poofT * 5;
      actorCtx.beginPath();
      actorCtx.arc(state.x, state.y, 28 + (1 - poofT) * 70, 0, Math.PI * 2);
      actorCtx.stroke();
      actorCtx.restore();
    }
    if (!boohaTransformParticles.length) return;
    for (let i = boohaTransformParticles.length - 1; i >= 0; i--) {
      const p = boohaTransformParticles[i];
      const age = now - p.bornAt;
      if (age >= p.lifeMs) { boohaTransformParticles.splice(i, 1); continue; }
      const t = age / p.lifeMs;
      const ease = 1 - Math.pow(1 - t, 2);
      const x = state.x + p.dx * ease;
      const y = state.y + p.dy * ease;
      actorCtx.save();
      actorCtx.globalAlpha = (1 - t) * .95;
      actorCtx.shadowBlur = 10;
      actorCtx.shadowColor = p.color;
      actorCtx.fillStyle = p.color;
      actorCtx.beginPath();
      actorCtx.arc(x, y, (1 - t * .55) * p.size, 0, Math.PI * 2);
      actorCtx.fill();
      actorCtx.restore();
    }
  }

  function getBoohaChangeDurationMs() {
    const duration = Number(boohaChangeAudio.duration);
    return Number.isFinite(duration) && duration > 0
      ? Math.round(duration * 1000)
      : BOOHA_CHANGE_FALLBACK_MS;
  }

  function playBoohaChangeAudio() {
    boohaChangeAudio.pause();
    try { boohaChangeAudio.currentTime = 0; } catch (_) {}
    const playback = boohaChangeAudio.play();
    if (playback && typeof playback.catch === 'function') playback.catch(() => {});
  }

  function playBoohaTransform() {
    if (state.boohaTransformed || state.boohaTransforming) return;
    state.boohaTransforming = true;
    state.boohaTransformStartedAt = performance.now();
    state.boohaTransformPoofUntil = 0;
    state.inputLocked = true;
    state.clickTarget = null;
    state.moving = false;
    const durationMs = getBoohaChangeDurationMs();
    boohaShakeUntil = state.boohaTransformStartedAt + durationMs;
    boohaShakeSeed = Math.random() * 1000;
    spawnBoohaTransformSparkles();
    window.setTimeout(() => {
      if (!state.boohaTransforming) return;
      state.boohaTransforming = false;
      state.boohaTransformed = true;
      state.inputLocked = false;
      state.navigationUnlocked = false;
      state.entryWelcomePending = state.spawnId === 'fromKarasuki';
      state.boohaTransformPoofUntil = performance.now() + BOOHA_TRANSFORM_POOF_MS;
      boohaShakeUntil = 0;
      spawnBoohaTransformSparkles();
    }, durationMs);
  }

  // Fires once, right as the player actually arrives via the Karasuki
  // portal (after entry drift finishes), then waits for the player's cute
  // readiness confirmation. A direct/DEV
  // entry (no fromKarasuki spawn) skips the reveal and starts already
  // transformed -- Booha is just always the Grimmerglen sprite once
  // you're actually inside, whether or not you saw the moment it happened.
  function triggerBoohaTransformIfNeeded() {
    if (state.spawnId !== 'fromKarasuki') { state.boohaTransformed = true; return; }
    const waitForArrival = () => {
      if (!entryDrift) openBoohaChangePrompt();
      else window.requestAnimationFrame(waitForArrival);
    };
    window.requestAnimationFrame(waitForArrival);
  }

  function drawFrame(now) {
    atmosphereCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    actorCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    drawAtmosphere(now);
    drawExitArrows(now);
    drawReturnPortal(now);
    if (state.celebrating) {
      drawGrimmerglenCelebration(now);
    } else {
      drawMarietta(now);
      drawGrimmerglenObjects(now);
      drawBooha(now);
      drawCarriedObject(now);
    }
    drawBoohaTransformFX(now);
  }


  /* ═══════════════════════════════════════════
     MARIETTA'S ENTRY POPUP + THE RETURN TRIP
  ═══════════════════════════════════════════ */
  // Foundation pass 3: the "Talk to Marietta / Leave Grimmerglen" choice
  // card the player sees on arrival, built on the shared utsu-card.js
  // parchment-card shell (the same .utsu-card/.dp-* system Utsuroba's
  // drifter panel and Karasuki's orb panel already use) rather than a
  // sixth hand-copied popup. The card owns the welcome, memory hint, and
  // help handoff, while the return portal remains a separate confirmation.
  function furiJP(text, readings) {
    const renderer = window.UtsuFurigana && window.UtsuFurigana.sentence;
    return renderer ? renderer(text, readings || {}) : text;
  }

  // Short UI readings use the same term-level convention as authored prose.
  // Keeping each reading on its word prevents the ruby annotation from
  // looking like a second copy of the whole Japanese sentence.
  const MARIETTA_UI_READINGS = {
    '来てくれて': 'きてくれて',
    '嬉しい': 'うれしい',
    '手伝う': 'てつだう',
    '出る': 'でる',
    '閉じる': 'とじる',
    '戻る': 'もどる',
    '道': 'みち',
    '今週': 'こんしゅう',
    'もう一度': 'もういちど',
    '見る': 'みる',
    '踊ろう': 'おどろう',
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
    ['copy', 'cut', 'paste'].forEach(type => {
      mariettaPanel.addEventListener(type, event => event.preventDefault());
    });
  }

  function renderMariettaQuestBriefing() {
    if (!mariettaPanel || !MARIETTA) return;
    const targetType = getActiveGrimmerglenTargetType();
    const story = targetType ? getGrimmerglenMemoryStory(targetType) : null;
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner">
        <div class="dp-portrait-wrap"><span class="dp-portrait-halo"></span>
          <div class="dp-portrait"><img src="${MARIETTA.poses[0]}" alt="Marietta"></div>
        </div>
        <div class="dp-body">
          <p class="dp-name-en mg-guide-title">GRIMMERGLEN GUIDE</p>
          <p class="dp-name-kanji mg-character-name">Marietta <span>・マリエッタ</span></p>
          <div class="dp-divider"></div>
          <p class="dp-line-en mg-welcome-en">Marietta is so happy you're here!</p>
          <p class="dp-line-jp mg-welcome-jp">${furiJP('マリエッタは、あなたが来てくれてとても嬉しいです！', MARIETTA_UI_READINGS)}</p>
          <p class="dp-line-en mg-memory-lead">${story ? 'I am trying to remember something...' : 'The memories are all safe now.'}</p>
          <div class="dp-btns">
            <button class="dp-btn yes" id="mg-help-btn">I'll help Marietta! / ${furiJP('マリエッタを手伝う', MARIETTA_UI_READINGS)}</button>
            <button class="dp-btn no" id="mg-leave-btn">Leave Grimmerglen / ${furiJP('グリマーグレンを出る', MARIETTA_UI_READINGS)}</button>
          </div>
        </div>
      </div>`;
    const helpBtn = mariettaPanel.querySelector('#mg-help-btn');
    const leaveBtn = mariettaPanel.querySelector('#mg-leave-btn');
    if (helpBtn) helpBtn.addEventListener('click', acceptMariettaHelp);
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
  // Pass 5/6's job). Updated wholesale per the user's own verbatim script
  // (two silent typo fixes: "the can't hurt you her" -> "they can't hurt
  // you here"; the daymare framing dropped in favor of daydreams only,
  // matching the new text exactly) plus two authored closing lines (not
  // verbatim -- freely written) that carry the real narrative hook: she
  // just remembered what she forgot, and needs Booha to find it. Those
  // closing lines are what the tutorial launches from. No em dashes
  // anywhere below, per the "going forward" style rule -- everything here
  // and after uses commas/periods instead.
  const MARIETTA_DIALOGUE = [
    { en: 'Oh! Hello, hello! You found me.',
      jp: 'あっ、こんにちは、こんにちは！わたしを見つけたのね。' },
    { en: 'Welcome to Grimmerglen. This is where daydreams end up.',
      jp: 'ようこそ、グリマーグレンへ。ここは、夢がたどりつく場所なの。' },
    { en: 'Nobody knows why, they just arrive, one after another, and pile up all around this place.',
      jp: 'どうしてかは、だれも知らない。夢たちは、つぎつぎとやってきて、ここにたまっていくの。' },
    { en: "I'm a Marietta too! That's my name and what my whole species is called! Funny, right?",
      jp: 'わたしも「マリエッタ」なの！それが名前で、わたしたちの種族の名前でもあるのよ。おもしろいでしょ？' },
    { en: "Some of the daydreams look a little strange. Don't worry, they can't hurt you here. Probably!",
      jp: '夢の中には、ちょっと不思議に見えるものもあるの。だいじょうぶ、ここでは何もできないから。たぶん！' },
    { en: 'If you have a daydream, that means a Marietta is nearby. We try to remember every one that comes through...but they slip away so fast.',
      jp: '夢を見たなら、それは近くにマリエッタがいるということなの。やってきた夢を、ぜんぶ覚えていたいんだけど...でも、あっというまに忘れちゃうの。' },
    { en: 'Oh! Wait a moment...I just remembered something!',
      jp: 'あっ、ちょっと待って...たった今、思い出したことがあるの！' },
    { en: 'I forgot something important, and I finally remembered what it was.',
      jp: '大切なことを忘れていて、それが何だったのか、やっと思い出したの。' },
    { en: 'Will you help me? I need Booha to find the things from my daydreams.',
      jp: '手伝ってくれる？わたしの夢の中にあるものを、ブーハに見つけてほしいの。' }
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
    '忘れちゃう': 'わすれちゃう',
    '不思議': 'ふしぎ',
    '近く': 'ちかく',
    '大切': 'たいせつ',
    '手伝って': 'てつだって',
    '見つけて': 'みつけて',
    '忘れて': 'わすれて',
    '待って': 'まって',
    '今': 'いま'
  };

  // Pass 9A: the introduction is now the first Marietta screen. The caller
  // supplies the next screen so the same dialogue renderer cannot put the
  // quest briefing ahead of the hello again.
  function renderMariettaDialogue(onFinished, options = {}) {
    const allowSkip = options.allowSkip === true;
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
            ${allowSkip ? `<button class="dp-btn no" id="mg-dialogue-skip-btn">Skip this week's hello / ${furiJP('今週はあいさつをスキップ', { '今週': 'こんしゅう' })}</button>` : ''}
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
      if (closeBtn) closeBtn.addEventListener('click', () => {
        if (typeof onFinished === 'function') onFinished();
      });
      const skipBtn = mariettaPanel.querySelector('#mg-dialogue-skip-btn');
      if (skipBtn) skipBtn.addEventListener('click', event => {
        event.stopPropagation();
        if (typeof options.onSkip === 'function') options.onSkip();
      });
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

  /* ===============================================
     SAVE LAYER
  =============================================== */
  // window.BoohaSaveFile (from js/core/save-file.js, already included on this
  // page) exposes load()/save()/patch() directly, so this mirrors Muenba's
  // own readMuenba()/writeMuenba() shape without a second local save layer.
  function readGrimmerglen() {
    try {
      const d = window.BoohaSaveFile ? window.BoohaSaveFile.load() : {};
      return (d && typeof d.grimmerglen === 'object' && d.grimmerglen) || {};
    } catch (e) {
      console.error('[Grimmerglen] Save read failed:', e);
      return {};
    }
  }

  function ensureWeeklyGrimmerglen(data) {
    if (!data.weekly || typeof data.weekly !== 'object' || Array.isArray(data.weekly)) data.weekly = {};
    if (!data.weekly.worlds || typeof data.weekly.worlds !== 'object' || Array.isArray(data.weekly.worlds)) data.weekly.worlds = {};
    if (!data.weekly.worlds.grimmerglen || typeof data.weekly.worlds.grimmerglen !== 'object' || Array.isArray(data.weekly.worlds.grimmerglen)) data.weekly.worlds.grimmerglen = {};
    const world = data.weekly.worlds.grimmerglen;
    if (!world.objects || typeof world.objects !== 'object' || Array.isArray(world.objects)) world.objects = {};
    if (!world.objectSlots || typeof world.objectSlots !== 'object' || Array.isArray(world.objectSlots)) world.objectSlots = {};
    if (world.activeTargetType === undefined) world.activeTargetType = null;
    if (world.carriedObjectId === undefined) world.carriedObjectId = null;
    if (world.memoryQuestAccepted === undefined) world.memoryQuestAccepted = false;
    return world;
  }

  function loadGrimmerglenSave() {
    try { return window.BoohaSaveFile ? window.BoohaSaveFile.load() : {}; }
    catch (e) { console.error('[Grimmerglen] Full save read failed:', e); return {}; }
  }

  function readGrimmerglenWeekly() {
    const data = loadGrimmerglenSave();
    const world = ensureWeeklyGrimmerglen(data);
    const root = data.grimmerglen;
    // Old root counts are preserved as lifetime history. The first live
    // occurrence after this migration starts with a fresh item hunt.
    if (root && root.weeklyReplayInitialized !== true) {
      root.weeklyReplayInitialized = true;
      delete root.activeTargetType;
      delete root.carriedObjectId;
      try { if (window.BoohaSaveFile) window.BoohaSaveFile.save(data); } catch (_) {}
    }
    return world;
  }

  function writeGrimmerglenWeekly(patchObj) {
    const data = loadGrimmerglenSave();
    Object.assign(ensureWeeklyGrimmerglen(data), patchObj);
    return window.BoohaSaveFile && typeof window.BoohaSaveFile.save === 'function'
      ? window.BoohaSaveFile.save(data)
      : false;
  }

  function writeGrimmerglen(patchObj) {
    try {
      if (window.BoohaSaveFile && typeof window.BoohaSaveFile.patch === 'function') {
        return window.BoohaSaveFile.patch('grimmerglen', patchObj);
      }
      console.error('[Grimmerglen] Save system unavailable -- progress NOT written.');
      return false;
    } catch (e) {
      console.error('[Grimmerglen] Save write failed:', e);
      return false;
    }
  }

  function getGrimmerglenTutorial() {
    const t = readGrimmerglen().tutorial;
    return {
      completed: !!(t && t.completed === true),
      skipPrompted: !!(t && t.skipPrompted === true)
    };
  }

  function writeGrimmerglenTutorial(patchObj) {
    const current = getGrimmerglenTutorial();
    return writeGrimmerglen({ tutorial: Object.assign({}, current, patchObj) });
  }

  function hasMariettaIntroBeenSeenThisWeek() {
    return readGrimmerglenWeekly().mariettaIntroSeen === true;
  }

  function hasMariettaIntroEverBeenSeen() {
    return readGrimmerglen().mariettaIntroEverSeen === true;
  }

  function markMariettaIntroSeenThisWeek(skipped) {
    const data = loadGrimmerglenSave();
    const weekly = ensureWeeklyGrimmerglen(data);
    weekly.mariettaIntroSeen = true;
    weekly.mariettaIntroSkipped = skipped === true;
    if (!data.grimmerglen || typeof data.grimmerglen !== 'object') data.grimmerglen = {};
    data.grimmerglen.mariettaIntroEverSeen = true;
    return window.BoohaSaveFile && typeof window.BoohaSaveFile.save === 'function'
      ? window.BoohaSaveFile.save(data)
      : false;
  }

  // Room-visit running totals, mirroring Muenba's own
  // markMuenbaRoomVisited() -- first-time-per-room timestamps plus an
  // always-incrementing total, called once per setRoom() (not per tick).
  function markGrimmerglenRoomVisited(roomId) {
    try {
      const d = readGrimmerglen();
      if (!d.visitedRooms || typeof d.visitedRooms !== 'object') d.visitedRooms = {};
      if (!Number.isInteger(d.roomVisitsTotal) || d.roomVisitsTotal < 0) d.roomVisitsTotal = 0;
      if (!d.visitedRooms[roomId]) d.visitedRooms[roomId] = Date.now();
      d.roomVisitsTotal += 1;
      writeGrimmerglen(d);
    } catch (_) {}
  }

  // Per-object-type/per-tier progress: found 0 or 1 copies -> Starter,
  // 2 -> Case, 3 -> Deep. objectSlots records the exact solved instance so
  // a player can find copies in any order without the clicked item respawning.
  const GRIMMERGLEN_TIER_BY_FOUND = ['start', 'start', 'case', 'deep'];

  function getGrimmerglenObjectsProgress() {
    if (objectProgressCache) return objectProgressCache;
    const stored = readGrimmerglenWeekly().objects || {};
    const progress = {};
    (DATA.objectTypes || []).forEach(type => {
      const entry = stored[type];
      const found = Number.isInteger(entry && entry.found)
        ? Math.max(0, Math.min(3, entry.found))
        : 0;
      progress[type] = { found, tier: GRIMMERGLEN_TIER_BY_FOUND[found] };
    });
    objectProgressCache = progress;
    return progress;
  }

  function getGrimmerglenMemoryStory(type) {
    const tier = getGrimmerglenObjectsProgress()[type]?.tier || 'start';
    return DATA.tierMemories?.[type]?.[tier]?.story || DATA.stories?.[type] || null;
  }

  function getGrimmerglenObjectSlots() {
    if (objectSlotsCache) return objectSlotsCache;
    const slots = readGrimmerglenWeekly().objectSlots;
    objectSlotsCache = slots && typeof slots === 'object' ? slots : {};
    return objectSlotsCache;
  }

  function isMariettaWaitingForMemory() {
    if (!state.helpAccepted || state.celebrating) return false;
    return Object.values(getGrimmerglenObjectsProgress()).some(entry => entry.found < 3);
  }

  function getActiveGrimmerglenTargetType() {
    if (activeTargetTypeCache && getGrimmerglenObjectsProgress()[activeTargetTypeCache]?.found < 3) {
      return activeTargetTypeCache;
    }
    const progress = getGrimmerglenObjectsProgress();
    const unfinished = (DATA.objectTypes || []).filter(type => progress[type] && progress[type].found < 3);
    if (!unfinished.length) {
      activeTargetTypeCache = null;
      if (readGrimmerglenWeekly().activeTargetType) writeGrimmerglenWeekly({ activeTargetType: null });
      return null;
    }

    const savedTarget = readGrimmerglenWeekly().activeTargetType;
    if (unfinished.includes(savedTarget)) {
      activeTargetTypeCache = savedTarget;
      return savedTarget;
    }

    // Each memory lane gets its own stable target until that lane is solved.
    // The first target is chosen once and persisted, so a redraw never changes
    // the object Booha is currently looking for; after a return, the next lane
    // is freshly chosen from the remaining unfinished memories.
    const nextTarget = unfinished[Math.floor(Math.random() * unfinished.length)];
    activeTargetTypeCache = nextTarget;
    writeGrimmerglenWeekly({ activeTargetType: nextTarget });
    return nextTarget;
  }

  function writeGrimmerglenCarriedObject(object) {
    return writeGrimmerglenWeekly({ carriedObjectId: object ? object.id : null });
  }

  function restoreGrimmerglenCarriedObject() {
    const savedId = readGrimmerglenWeekly().carriedObjectId;
    const object = findGrimmerglenObjectById(savedId);
    if (!object) return;
    const progress = getGrimmerglenObjectsProgress();
    const slots = getGrimmerglenObjectSlots();
    if (!isGrimmerglenObjectFound(object, progress, slots)) carriedObject = object;
  }

  function writeGrimmerglenObjectFound(type, slotId) {
    if (!DATA.objectTypes || !DATA.objectTypes.includes(type)) return false;
    const progress = getGrimmerglenObjectsProgress();
    const weeklyStored = {};
    Object.keys(progress).forEach(t => { weeklyStored[t] = { found: progress[t].found }; });
    weeklyStored[type] = { found: Math.min(3, progress[type].found + 1) };
    const weeklySlots = Object.assign({}, getGrimmerglenObjectSlots());
    if (slotId) weeklySlots[slotId] = true;

    const data = loadGrimmerglenSave();
    if (!data.grimmerglen || typeof data.grimmerglen !== 'object') data.grimmerglen = {};
    const lifetimeObjects = data.grimmerglen.objects && typeof data.grimmerglen.objects === 'object'
      ? data.grimmerglen.objects : {};
    const lifetimeStored = {};
    (DATA.objectTypes || []).forEach(t => {
      const found = Number.isInteger(lifetimeObjects[t]?.found) ? lifetimeObjects[t].found : 0;
      lifetimeStored[t] = { found: Math.max(0, Math.min(3, found)) };
    });
    lifetimeStored[type] = { found: Math.min(3, lifetimeStored[type].found + 1) };
    const lifetimeSlots = Object.assign({}, data.grimmerglen.objectSlots || {});
    if (slotId) lifetimeSlots[slotId] = true;

    const weekly = ensureWeeklyGrimmerglen(data);
    weekly.objects = weeklyStored;
    weekly.objectSlots = weeklySlots;
    weekly.carriedObjectId = null;
    data.grimmerglen.objects = lifetimeStored;
    data.grimmerglen.objectSlots = lifetimeSlots;
    data.grimmerglen.weeklyReplayInitialized = true;
    const ok = window.BoohaSaveFile && typeof window.BoohaSaveFile.save === 'function'
      ? window.BoohaSaveFile.save(data)
      : false;
    if (ok) {
      objectProgressCache = null;
      objectSlotsCache = weeklySlots;
      activeTargetTypeCache = null;
      carriedObject = null;
    }
    return ok;
  }

  /* ===============================================
     TUTORIAL (pass 6)
  =============================================== */
  // Mandatory the very first time the player finishes Marietta's dialogue
  // (data.grimmerglen.tutorial.completed === false, .skipPrompted ===
  // false): launches straight into the 3-step sequence, no choice asked,
  // and skipPrompted flips true the moment that happens -- that's the
  // tri-state's whole reason for existing, a "used their one mandatory
  // pass" marker distinct from "never seen" and from "finished." Every
  // later entry (completed still false, skipPrompted already true) shows
  // a small ask-first-or-not screen instead of forcing it. Once completed
  // is true, "Talk to Marietta" never surfaces the tutorial again -- just
  // free chat, same as before this pass existed.
  //
  // Fading-support arc per the plan doc: options -> options -> none.
  // Step 3 repeats step 1's question on purpose (pure recall of what was
  // just practiced, not a new question) rather than adding a fourth topic.
  const GRIMMERGLEN_TUTORIAL_STEPS = [
    {
      promptEn: 'How are you today?',
      promptJp: '今日の気分はどうですか？',
      promptReadings: { '今日': 'きょう', '気分': 'きぶん' },
      accepted: ["i'm happy", "i'm sad", "i'm tired", "i'm stinky"],
      options: ["I'm happy", "I'm sad", "I'm tired", "I'm stinky"],
      optionsVisible: true
    },
    {
      promptEn: "How's the weather today?",
      promptJp: '今日の天気はどうですか？',
      promptReadings: { '今日': 'きょう', '天気': 'てんき' },
      accepted: ["it's sunny", "it's hot", "it's a monster", "it's rainy"],
      options: ["It's sunny", "It's hot", "It's a monster", "It's rainy"],
      optionsVisible: true
    },
    {
      promptEn: 'How are you today?',
      promptJp: '今日の気分はどうですか？',
      promptReadings: { '今日': 'きょう', '気分': 'きぶん' },
      accepted: ["i'm happy", "i'm sad", "i'm tired", "i'm stinky"],
      options: null,
      optionsVisible: false
    }
  ];

  const GRIMMERGLEN_TUTORIAL_READINGS = {
    '練習': 'れんしゅう',
    '少し': 'すこし',
    '言葉': 'ことば',
    '忘れた': 'わすれた',
    '見つけに': 'みつけに',
    '行こう': 'いこう',
    '今': 'いま'
  };

  function renderTutorialStep(index) {
    if (!mariettaPanel || !MARIETTA) return;
    const total = GRIMMERGLEN_TUTORIAL_STEPS.length;
    const step = GRIMMERGLEN_TUTORIAL_STEPS[index];
    const introHTML = index === 0
      ? `<p class="dp-line-en" style="margin-bottom:10px;">Let's practice together. I will show you some words, then you type them in.</p>
         <p class="dp-line-jp" style="margin:0 0 10px;">${furiJP('いっしょに練習しましょう。まず言葉を見せるから、それをタイプしてね。', GRIMMERGLEN_TUTORIAL_READINGS)}</p>`
      : '';
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner">
        <div class="dp-portrait-wrap"><span class="dp-portrait-halo"></span>
          <div class="dp-portrait"><img src="${MARIETTA.poses[0]}" alt="Marietta"></div>
        </div>
        <div class="dp-body">
          <p class="dp-name-en">PRACTICE TIME &middot; STEP ${index + 1} OF ${total}</p>
          <p class="dp-name-kanji">Marietta <span style="font-weight:400;color:#9a7850;">・マリエッタ</span></p>
          <div class="dp-divider"></div>
          ${introHTML}
          <div id="mg-tutorial-exercise-mount"></div>
        </div>
      </div>`;
    const mount = mariettaPanel.querySelector('#mg-tutorial-exercise-mount');
    if (!mount || !window.GrimmerglenTyping) return;
    window.GrimmerglenTyping.renderExercise(mount, step, {
      onCorrect: () => advanceTutorial(index),
      onWrong: () => {}
    });
  }

  function advanceTutorial(index) {
    const next = index + 1;
    if (next >= GRIMMERGLEN_TUTORIAL_STEPS.length) { finishGrimmerglenTutorial(); return; }
    renderTutorialStep(next);
  }

  function startGrimmerglenTutorial() {
    renderTutorialStep(0);
  }

  function finishGrimmerglenTutorial() {
    writeGrimmerglenTutorial({ completed: true });
    if (!mariettaPanel || !MARIETTA) return;
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner">
        <div class="dp-portrait-wrap"><span class="dp-portrait-halo"></span>
          <div class="dp-portrait"><img src="${MARIETTA.poses[0]}" alt="Marietta"></div>
        </div>
        <div class="dp-body">
          <p class="dp-name-en">GREAT JOB!</p>
          <p class="dp-name-kanji">Marietta <span style="font-weight:400;color:#9a7850;">・マリエッタ</span></p>
          <div class="dp-divider"></div>
          <p class="dp-line-en">You did it! Now, let's go find what I forgot.</p>
          <p class="dp-line-jp">${furiJP('できたね！さあ、わたしが忘れたものを見つけに行こう。', GRIMMERGLEN_TUTORIAL_READINGS)}</p>
          <div class="dp-btns">
            <button class="dp-btn yes" id="mg-tutorial-done-btn">Let's go! / ${furiJP('行こう！', GRIMMERGLEN_TUTORIAL_READINGS)}</button>
          </div>
        </div>
      </div>`;
    const doneBtn = mariettaPanel.querySelector('#mg-tutorial-done-btn');
    if (doneBtn) doneBtn.addEventListener('click', () => {
      unlockGrimmerglenNavigation();
      closeMariettaPanel();
    });
  }

  // Every later entry (tutorial not completed, already offered once
  // before) -- ask rather than force. "Not right now" just closes the
  // panel and changes nothing, so the same ask appears again next time.
  function renderMariettaTutorialAsk() {
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
          <p class="dp-line-en">Want to try a little practice with me?</p>
          <p class="dp-line-jp">${furiJP('少し、いっしょに練習してみる？', GRIMMERGLEN_TUTORIAL_READINGS)}</p>
          <div class="dp-btns">
            <button class="dp-btn yes" id="mg-tutorial-yes-btn">Yes, let's try! / ${furiJP('うん、やってみる！', GRIMMERGLEN_TUTORIAL_READINGS)}</button>
            <button class="dp-btn no" id="mg-tutorial-no-btn">Not right now / ${furiJP('今はやめておく', GRIMMERGLEN_TUTORIAL_READINGS)}</button>
          </div>
        </div>
      </div>`;
    const yesBtn = mariettaPanel.querySelector('#mg-tutorial-yes-btn');
    const noBtn = mariettaPanel.querySelector('#mg-tutorial-no-btn');
    if (yesBtn) yesBtn.addEventListener('click', startGrimmerglenTutorial);
    if (noBtn) noBtn.addEventListener('click', closeMariettaPanel);
  }

  function finishMariettaIntroduction() {
    markMariettaIntroSeenThisWeek(false);
    renderMariettaQuestBriefing();
  }

  function skipMariettaIntroduction() {
    markMariettaIntroSeenThisWeek(true);
    renderMariettaQuestBriefing();
  }

  function renderMariettaMemoryHint(onConfirmed) {
    if (!mariettaPanel || !MARIETTA) return;
    const targetType = getActiveGrimmerglenTargetType();
    const story = targetType ? getGrimmerglenMemoryStory(targetType) : null;
    if (!story) {
      if (typeof onConfirmed === 'function') onConfirmed();
      return;
    }
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner mg-hint-inner">
        <div class="dp-portrait-wrap"><span class="dp-portrait-halo"></span>
          <div class="dp-portrait"><img src="${MARIETTA.poses[0]}" alt="Marietta"></div>
        </div>
        <div class="dp-body">
          <p class="dp-name-en mg-guide-title">MEMORY HINT</p>
          <p class="dp-name-kanji mg-character-name">Marietta <span>・マリエッタ</span></p>
          <div class="dp-divider"></div>
          <p class="dp-line-en mg-memory-hint-en">${escapeHTML(story.en)}</p>
          <p class="dp-line-jp mg-memory-hint-jp">${furiJP(story.jp, story.readings)}</p>
          <div class="dp-btns">
            <button class="dp-btn yes" id="mg-hint-ok-btn" type="button">OK! / わかった！</button>
          </div>
        </div>
      </div>`;
    mariettaPanel.querySelector('#mg-hint-ok-btn')?.addEventListener('click', () => {
      if (typeof onConfirmed === 'function') onConfirmed();
    });
  }

  // The explicit help choice opens the memory hint and reveals the room
  // arrows immediately. The practice flow continues after the hint, but it
  // is no longer a movement gate, so Booha can wander room_01 while deciding.
  function acceptMariettaHelp() {
    state.helpAccepted = true;
    writeGrimmerglenWeekly({ memoryQuestAccepted: true });
    unlockGrimmerglenNavigation();
    const t = getGrimmerglenTutorial();
    const firstHelp = !t.skipPrompted && !t.completed;
    if (firstHelp) {
      writeGrimmerglenTutorial({ skipPrompted: true });
    }
    renderMariettaMemoryHint(() => {
      if (firstHelp) startGrimmerglenTutorial();
      else continueAfterMariettaHelp();
    });
  }

  function continueAfterMariettaHelp() {
    const t = getGrimmerglenTutorial();
    if (t.completed) {
      unlockGrimmerglenNavigation();
      closeMariettaPanel();
      return;
    }
    if (!t.skipPrompted) {
      writeGrimmerglenTutorial({ skipPrompted: true });
      startGrimmerglenTutorial();
    } else {
      renderMariettaTutorialAsk();
    }
  }

  function openMariettaPanel() {
    if (!mariettaPanel || mariettaPanelOpen || performance.now() < mariettaPanelCooldown) return;
    if (window.UtsuSfx) window.UtsuSfx.panelOpen();
    mariettaPanelOpen = true;
    state.clickTarget = null;
    state.moving = false;
    if (carriedObject) renderMariettaHandoff();
    else if (hasMariettaIntroBeenSeenThisWeek()) renderMariettaQuestBriefing();
    else renderMariettaDialogue(finishMariettaIntroduction, {
      allowSkip: hasMariettaIntroEverBeenSeen(),
      onSkip: skipMariettaIntroduction
    });
    mariettaPanel.classList.add('open');
  }

  function closeMariettaPanel() {
    if (!mariettaPanel) return;
    if (window.UtsuSfx) window.UtsuSfx.panelClose();
    mariettaPanelCooldown = performance.now() + POPUP_COOLDOWN_MS;
    mariettaPanelOpen = false;
    handoffObject = null;
    mariettaPanel.classList.remove('open');
  }

  function unlockGrimmerglenNavigation() {
    if (!state.helpAccepted) return;
    state.navigationUnlocked = true;
    state.entryWelcomePending = false;
    state.inputLocked = false;
    state.clickTarget = null;
    state.moving = false;
    // Let the player walk a little before exit arrows fade in.
    state.distMovedSinceSpawn = 0;
  }

  function clearCarriedGrimmerglenObject() {
    if (!writeGrimmerglenCarriedObject(null)) return false;
    carriedObject = null;
    handoffObject = null;
    return true;
  }

  function renderMariettaHandoff() {
    if (!mariettaPanel || !carriedObject) return;
    const object = carriedObject;
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner mg-handoff-inner">
        <div class="mg-object-art-wrap"><img class="mg-object-art" src="${DATA.collectibles[object.type]}" alt="${escapeHTML(object.label)}"></div>
        <div class="dp-body">
          <p class="dp-name-en">MEMORY RETURN</p>
          <p class="dp-name-kanji">You brought Marietta a ${escapeHTML(object.label)}.</p>
          <div class="dp-divider"></div>
          <p class="dp-line-en">Do you want to give the item to Marietta?</p>
          <p class="dp-line-jp">${furiJP('このアイテムをマリエッタに渡す？', { '渡す': 'わたす' })}</p>
          <div class="dp-btns">
            <button class="dp-btn yes" id="mg-give-item-btn" type="button">Give it to Marietta / 渡す</button>
            <button class="dp-btn no" id="mg-keep-item-btn" type="button">Not yet / まだだよ</button>
          </div>
        </div>
      </div>`;
    mariettaPanel.querySelector('#mg-give-item-btn')?.addEventListener('click', handleMariettaGiveItem);
    mariettaPanel.querySelector('#mg-keep-item-btn')?.addEventListener('click', closeMariettaPanel);
  }

  function renderMariettaWrongItem(object) {
    const targetType = getActiveGrimmerglenTargetType();
    const story = targetType ? getGrimmerglenMemoryStory(targetType) : null;
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner">
        <div class="dp-portrait-wrap"><span class="dp-portrait-halo"></span><div class="dp-portrait"><img src="${MARIETTA.poses[0]}" alt="Marietta"></div></div>
        <div class="dp-body">
          <p class="dp-name-en">NOT THIS MEMORY</p>
          <p class="dp-name-kanji">Marietta <span style="font-weight:400;color:#9a7850;">・ちがうよ</span></p>
          <div class="dp-divider"></div>
          <p class="dp-line-en">What is this thing? Were you even listening to me? He he!</p>
          <p class="dp-line-jp">${furiJP('これは何？ちゃんと聞いていたの？ふふ！', { '何': 'なに', '聞いて': 'きいて' })}</p>
          ${story ? `<p class="dp-line-en mg-memory-story">${escapeHTML(story.en)}</p><p class="dp-line-jp mg-memory-story">${furiJP(story.jp, story.readings)}</p>` : ''}
          <div class="dp-btns"><button class="dp-btn yes" id="mg-memory-try-again" type="button">I’ll listen again / もう一度聞く</button></div>
        </div>
      </div>`;
    mariettaPanel.querySelector('#mg-memory-try-again')?.addEventListener('click', renderMariettaQuestBriefing);
  }

  function renderMariettaMemoryExercise(object) {
    const progress = getGrimmerglenObjectsProgress();
    const tier = progress[object.type]?.tier || 'start';
    const exercise = DATA.memories?.[object.type]?.[tier];
    if (!exercise || !window.GrimmerglenTyping) return;
    const tierLabel = tier === 'start' ? 'STARTER MEMORY' : tier === 'case' ? 'CASE MEMORY' : 'DEEP MEMORY';
    const recheckHTML = tier === 'deep'
      ? `<div class="dp-btns mg-memory-recheck-wrap"><button class="dp-btn no mg-memory-recheck" id="mg-memory-see-again" type="button">Check again / ${furiJP('もう一度確認する', { '確認する': 'かくにんする' })}</button></div>`
      : '';
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner mg-memory-inner">
        <div class="dp-body">
          <p class="dp-name-en">${tierLabel}</p>
          <p class="dp-name-kanji">Help Marietta remember her ${escapeHTML(object.label)} memory.</p>
          <div class="dp-divider"></div>
          <p class="dp-line-en">You found my ${escapeHTML(object.label)}! Help me remember:</p>
          ${recheckHTML}
          <div id="mg-memory-exercise-mount"></div>
        </div>
      </div>`;
    mariettaPanel.querySelector('#mg-memory-see-again')?.addEventListener('click', () => {
      renderMariettaMemoryReplay(object, false, () => renderMariettaMemoryExercise(object), tier);
    });
    const mount = mariettaPanel.querySelector('#mg-memory-exercise-mount');
    window.GrimmerglenTyping.renderExercise(mount, exercise, {
      onCorrect: () => completeGrimmerglenMemory(object),
      onWrong: () => {}
    });
  }

  function renderMariettaMemoryReplay(object, memoryComplete, onClose, memoryTier = 'deep') {
    const exercise = DATA.memories?.[object.type]?.[memoryTier] || DATA.memories?.[object.type]?.deep || {};
    const answerEn = exercise.answerEn || exercise.accepted?.[0] || '';
    const answerJp = exercise.answerJp || exercise.helpText || '';
    const answerReadings = exercise.answerReadings || exercise.helpReadings || {};
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner mg-memory-replay">
        <div class="dp-portrait-wrap"><span class="dp-portrait-halo"></span><div class="dp-portrait"><img src="${MARIETTA.poses[0]}" alt="Marietta"></div></div>
        <div class="dp-body">
          <p class="dp-name-en mg-guide-title">MEMORY REPLAY</p>
          <p class="dp-name-kanji mg-character-name">Marietta <span>・マリエッタ</span></p>
          <div class="dp-divider"></div>
          <p class="mg-memory-replay-label">Here is the sentence again:</p>
          <div class="mg-memory-replay-answer" aria-live="polite">
            <p id="mg-memory-replay-en"></p>
            <p id="mg-memory-replay-jp"></p>
          </div>
          <div class="mg-memory-replay-scroll-cue" role="note" aria-label="Scroll down to close">↓ <span>Scroll down to close / ${furiJP('下へスクロール', { '下へ': 'したへ' })}</span> ↓</div>
          <div class="dp-btns">
            <button class="dp-btn no" id="mg-memory-replay-close" type="button">Close / ${furiJP('閉じる', MARIETTA_UI_READINGS)}</button>
          </div>
        </div>
      </div>`;

    const enEl = mariettaPanel.querySelector('#mg-memory-replay-en');
    const jpEl = mariettaPanel.querySelector('#mg-memory-replay-jp');
    let cancelled = false;
    const typeText = (element, text, render) => {
      let index = 0;
      const step = () => {
        if (cancelled) return;
        if (index <= text.length) {
          render(element, text.slice(0, index));
          if (index > 0 && text[index - 1] !== ' ') playMariettaTypeTick();
          index += 1;
          window.setTimeout(step, 38);
        }
      };
      step();
    };
    typeText(enEl, answerEn, (element, text) => { element.textContent = text; });
    window.setTimeout(() => {
      if (cancelled) return;
      typeText(jpEl, answerJp, (element, text) => { element.innerHTML = furiJP(text, answerReadings); });
    }, Math.max(500, answerEn.length * 38 + 220));
    mariettaPanel.querySelector('#mg-memory-replay-close')?.addEventListener('click', () => {
      cancelled = true;
      if (typeof onClose === 'function') onClose();
      else renderMariettaMemorySuccess(object, { memoryComplete });
    });
  }

  function renderMariettaMemorySuccess(object, { memoryComplete = false, memoryTier = 'deep' } = {}) {
    const nextType = getActiveGrimmerglenTargetType();
    const nextStory = nextType ? getGrimmerglenMemoryStory(nextType) : null;
    const foundForMemory = Number(getGrimmerglenObjectsProgress()[object.type]?.found) || 0;
    const remainingForMemory = Math.max(0, 3 - foundForMemory);
    const remainingCue = !memoryComplete && remainingForMemory === 2
      ? `<p class="mg-memory-remaining" role="status">Two more! / ${furiJP('あと二つ！', { '二つ': 'ふたつ' })}</p>`
      : !memoryComplete && remainingForMemory === 1
        ? `<p class="mg-memory-remaining" role="status">One more! / ${furiJP('あと一つ！', { '一つ': 'ひとつ' })}</p>`
        : '';
    const nextHintHTML = !memoryComplete && nextStory
      ? `<p class="dp-line-en mg-memory-hint-en">${escapeHTML(nextStory.en)}</p><p class="dp-line-jp mg-memory-hint-jp">${furiJP(nextStory.jp, nextStory.readings)}</p>`
      : '';
    mariettaPanel.innerHTML = `
      <span class="dp-handle"></span>
      <div class="dp-inner">
        <div class="dp-portrait-wrap"><span class="dp-portrait-halo"></span><div class="dp-portrait"><img src="${MARIETTA.poses[0]}" alt="Marietta"></div></div>
        <div class="dp-body">
          ${memoryComplete ? `
            <div class="mg-memory-celebration">
              <div class="mg-memory-celebration-stars" aria-hidden="true">✦ ♡ ✦</div>
              <p class="dp-name-en mg-memory-celebration-title">MEMORY FOUND!</p>
              <p class="dp-name-kanji mg-character-name">Marietta <span>・マリエッタ</span></p>
              <div class="dp-divider"></div>
              <p class="mg-memory-celebration-copy">You did it! You found my memory! Thank you!</p>
              <p class="mg-memory-celebration-jp">${furiJP('できた！わたしの記憶を見つけてくれて、ありがとう！', { '記憶': 'きおく', '見つけてくれて': 'みつけてくれて' })}</p>
              <div class="dp-btns">
                <button class="dp-btn yes" id="mg-memory-done" type="button">Let's dance! / ${furiJP('踊ろう！', MARIETTA_UI_READINGS)}</button>
              </div>
            </div>
          ` : `
            <p class="dp-name-en">MEMORY SAVED</p>
            <p class="dp-name-kanji">Marietta <span style="font-weight:400;color:#9a7850;">・ありがとう！</span></p>
            <div class="dp-divider"></div>
            <p class="dp-line-en">Thanks, but I forgot again! There are still more of this memory to find.</p>
            <p class="dp-line-jp">${furiJP('ありがとう。でも、また忘れちゃった！この記憶はまだ残っているよ。', { '忘れちゃった': 'わすれちゃった', '記憶': 'きおく', '残っている': 'のこっている' })}</p>
            ${remainingCue}
            ${nextHintHTML}
            <div class="dp-btns">
              <button class="dp-btn yes" id="mg-memory-done" type="button">Keep exploring / 探し続ける</button>
            </div>
          `}
        </div>
      </div>`;
    mariettaPanel.querySelector('#mg-memory-see-again')?.addEventListener('click', () => renderMariettaMemoryReplay(object, memoryComplete, undefined, memoryTier));
    mariettaPanel.querySelector('#mg-memory-done')?.addEventListener('click', () => {
      if (memoryComplete) startGrimmerglenCelebration();
      else closeMariettaPanel();
    });
  }

  function finishGrimmerglenCelebration() {
    if (!state.celebrating || state.celebrationFinishing) return;
    state.celebrationFinishing = true;
    if (state.celebrationTimer) window.clearTimeout(state.celebrationTimer);
    state.celebrationTimer = 0;
    state.celebrating = false;
    state.celebrationFinishing = false;
    state.inputLocked = false;
    updateGrimmerglenProfilePortal();
    grimmerglenDanceSparkles.length = 0;
    stopGrimmerglenDanceMusic();
    startGrimmerglenMusic();
  }

  function startGrimmerglenCelebration() {
    if (state.celebrating || state.returnExiting) return;
    state.celebrating = true;
    state.celebrationFinishing = false;
    state.celebrationStart = performance.now();
    state.inputLocked = true;
    state.clickTarget = null;
    state.moving = false;
    state.x = CENTER_X;
    state.y = CENTER_Y;
    grimmerglenDanceSparkles.length = 0;
    updateGrimmerglenProfilePortal();
    closeMariettaPanel();
    const duration = playGrimmerglenDanceMusic(finishGrimmerglenCelebration);
    state.celebrationTimer = window.setTimeout(finishGrimmerglenCelebration, Math.max(1200, duration + 120));
  }

  function completeGrimmerglenMemory(object) {
    if (!mariettaPanelOpen || !carriedObject || carriedObject.id !== object.id) return;
    const completedTier = getGrimmerglenObjectsProgress()[object.type]?.tier || 'start';
    if (!writeGrimmerglenObjectFound(object.type, object.id)) {
      const feedback = mariettaPanel.querySelector('.mgty-feedback');
      if (feedback) {
        feedback.textContent = 'The memory could not be saved. Please try again.';
        feedback.className = 'mgty-feedback is-wrong';
      }
      return;
    }
    handoffObject = null;
    const memoryComplete = getGrimmerglenObjectsProgress()[object.type]?.found >= 3;
    renderMariettaMemorySuccess(object, { memoryComplete, memoryTier: completedTier });
  }

  function handleMariettaGiveItem() {
    if (!carriedObject) return;
    const object = carriedObject;
    if (object.type !== getActiveGrimmerglenTargetType()) {
      if (!clearCarriedGrimmerglenObject()) return;
      renderMariettaWrongItem(object);
      return;
    }
    handoffObject = object;
    renderMariettaMemoryExercise(object);
  }

  function clickCheckGrimmerglenObject(worldX, worldY) {
    if (mariettaPanelOpen || returnPortalOpen || state.entryWelcomePending) return false;
    const object = getNearestUnfoundObject(worldX, worldY, OBJECT_HIT_R);
    if (!object) return false;
    // Booha can change his mind: clicking another collectible drops the
    // carried item back at its current room coordinate and picks up the new
    // one. Approaching an item while carrying still does not auto-swap, so
    // an accidental walk cannot steal the player's intended choice.
    if (carriedObject) {
      if (carriedObject.id === object.id) return false;
      writeGrimmerglenCarriedObject(null);
      carriedObject = null;
    }
    return pickUpGrimmerglenObject(object);
  }

  function checkGrimmerglenObjectProximity(now) {
    if (mariettaPanelOpen || returnPortalOpen || carriedObject || state.entryWelcomePending) return;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    const object = getNearestUnfoundObject(state.x, state.y, OBJECT_PROXIMITY_R);
    if (object) pickUpGrimmerglenObject(object);
  }

  function pickUpGrimmerglenObject(object) {
    if (!object || carriedObject || isGrimmerglenObjectFound(object, getGrimmerglenObjectsProgress(), getGrimmerglenObjectSlots())) return false;
    if (!writeGrimmerglenCarriedObject(object)) return false;
    carriedObject = object;
    state.clickTarget = null;
    state.moving = false;
    return true;
  }

  // Marietta's card is deliberately player-opened. Arrival from Karasuki
  // never opens a popup by itself; after the transformation, Marietta is the
  // first memory-world interaction and remains clickable later in the visit.
  function clickCheckMarietta(worldX, worldY) {
    if (!MARIETTA || state.roomId !== MARIETTA.roomId || mariettaPanelOpen || state.boohaTransforming || !state.boohaTransformed) return false;
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
    if (returnPortalOpen || state.returnExiting || state.celebrating || performance.now() < returnPortalCooldownUntil) return;
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
    if (!inReturnPortalRoom() || returnPortalOpen || mariettaPanelOpen || state.celebrating || state.returnExiting) return;
    if (now < returnPortalCooldownUntil) return;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    const d = Math.hypot(state.x - MARIETTA_RETURN_PORTAL.x, state.y - MARIETTA_RETURN_PORTAL.y);
    if (d <= MARIETTA_RETURN_PORTAL.triggerR) openReturnPortalPopup();
  }

  function clickCheckReturnPortal(worldX, worldY) {
    if (!inReturnPortalRoom() || returnPortalOpen || mariettaPanelOpen || state.celebrating || state.returnExiting) return false;
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
    if (state.returnExiting || state.celebrating) return;
    state.returnExiting = true;
    stopGrimmerglenDanceMusic();
    stopGrimmerglenMusic();
    state.clickTarget = null;
    state.moving = false;
    try { sessionStorage.setItem('grimmerglen_return_room', 'room_14'); } catch (_) {}
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`;
    fadeEl.style.opacity = '1';
    window.setTimeout(() => { window.location.href = 'karasuki.html'; }, FADE_MS + 60);
  }

  // ── DEV overlay (foundation tool for calibrating exits/walkables later) ──
  function updateDevReadout(worldX, worldY) {
    if (!DEV_MODE || !devReadout) return;
    if (typeof worldX === 'number' && typeof worldY === 'number') {
      devMousePoint = { x: worldX, y: worldY };
    }
    const room = DATA.rooms[state.roomId]?.color?.name || state.roomId;
    const mouseText = devMousePoint
      ? `mouse: ${Math.round(devMousePoint.x)}, ${Math.round(devMousePoint.y)}`
      : 'mouse: —, —';
    const boohaText = `booha: ${Math.round(state.x)}, ${Math.round(state.y)}`;
    devReadout.textContent = `${state.roomId} (${room}) — ${mouseText} · ${boohaText}`;
  }

  function clearDevMouseReadout() {
    devMousePoint = null;
    updateDevReadout();
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
    const testTypingBtn = document.createElement('button');
    testTypingBtn.id = 'grimmerglen-dev-test-typing';
    testTypingBtn.type = 'button';
    testTypingBtn.textContent = 'Test typing exercise';
    testTypingBtn.addEventListener('click', openTypingTestHarness);
    devPanel.append(select, devReadout, testTypingBtn);
    document.body.appendChild(devPanel);
    updateDevReadout();
  }

  // DEV-only manual QA harness for pass 5's typing engine -- nothing
  // else calls GrimmerglenTyping.renderExercise() yet (pass 6's tutorial
  // is the real caller); this exists purely so the engine can actually
  // be tried in a browser before that pass wires it in for real.
  let typingTestPanel = null;
  function openTypingTestHarness() {
    if (!window.GrimmerglenTyping) return;
    if (!typingTestPanel) {
      typingTestPanel = document.createElement('div');
      typingTestPanel.id = 'grimmerglen-typing-test-panel';
      typingTestPanel.className = 'utsu-card is-floating';
      typingTestPanel.style.setProperty('--card-ring', '#ff9fc2');
      typingTestPanel.style.setProperty('--card-glow', 'rgba(255,159,194,.5)');
      typingTestPanel.innerHTML = `
        <span class="dp-handle"></span>
        <div class="dp-inner"><div class="dp-body">
          <button class="dp-close-x" id="grimmerglen-typing-test-close">\u2715</button>
          <p class="dp-name-en">DEV: TYPING ENGINE TEST</p>
          <div class="dp-divider"></div>
          <div id="grimmerglen-typing-test-mount"></div>
        </div></div>`;
      document.body.appendChild(typingTestPanel);
      typingTestPanel.querySelector('#grimmerglen-typing-test-close')
        .addEventListener('click', () => typingTestPanel.classList.remove('open'));
    }
    const mount = typingTestPanel.querySelector('#grimmerglen-typing-test-mount');
    window.GrimmerglenTyping.renderExercise(mount, {
      promptEn: 'How are you today?',
      promptJp: '\u4eca\u65e5\u306e\u6c17\u5206\u306f\u3069\u3046\u3067\u3059\u304b\uff1f',
      promptReadings: { '\u4eca\u65e5': '\u304d\u3087\u3046', '\u6c17\u5206': '\u304d\u3076\u3093' },
      accepted: ["i'm happy", "i'm sad", "i'm tired", "i'm stinky"],
      options: ["I'm happy", "I'm sad", "I'm tired", "I'm stinky"],
      optionsVisible: true
    }, {
      onCorrect: () => console.log('[Grimmerglen dev] typing test: correct'),
      onWrong: () => console.log('[Grimmerglen dev] typing test: wrong')
    });
    typingTestPanel.classList.add('open');
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
    if (mariettaPanelOpen || returnPortalOpen || state.inputLocked || state.boohaTransforming) return;
    startGrimmerglenMusic();
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
    // Before help, room_01 remains walkable, but collectibles stay dormant
    // until the player has completed the welcome/help choice.
    if (clickCheckGrimmerglenObject(point.x, point.y)) return;
    if (clickCheckReturnPortal(point.x, point.y)) return;
    if (DEV_MODE) updateDevReadout(point.x, point.y);
    if (Math.hypot(point.x - state.x, point.y - state.y) < 30) return;
    state.distMovedSinceSpawn = Math.max(state.distMovedSinceSpawn, ARROW_MOVE_THRESHOLD);
    state.clickTarget = point;
  }

  function bindInput() {
    if (DEV_MODE) {
      stage.addEventListener('mousemove', event => {
        const point = stagePoint(event.clientX, event.clientY);
        updateDevReadout(point.x, point.y);
      });
      stage.addEventListener('mouseleave', clearDevMouseReadout);
    }
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

  function buildBoohaChangeOverlay() {
    if (boohaChangeOverlay) return;
    boohaChangeOverlay = document.createElement('div');
    boohaChangeOverlay.id = 'grimmerglen-change-overlay';
    boohaChangeOverlay.setAttribute('role', 'dialog');
    boohaChangeOverlay.setAttribute('aria-modal', 'true');
    boohaChangeOverlay.setAttribute('aria-labelledby', 'grimmerglen-change-title');
    boohaChangeOverlay.innerHTML = `
      <div class="grimmerglen-change-box">
        <div class="grimmerglen-change-stars" aria-hidden="true">✦　✧　✦</div>
        <p class="grimmerglen-change-kicker">A pastel surprise is waiting...</p>
        <h2 id="grimmerglen-change-title">Grimmerglen changes who enters!!</h2>
        <p class="grimmerglen-change-jp">グリマーグレンは<ruby>入<rt>はい</rt></ruby>る<ruby>人<rt>ひと</rt></ruby>を<ruby>変<rt>か</rt></ruby>える！！</p>
        <p class="grimmerglen-change-copy">Are you ready for your cute new form?</p>
        <p class="grimmerglen-change-jp">かわいい<ruby>姿<rt>すがた</rt></ruby>に<ruby>変身<rt>へんしん</rt></ruby>する<ruby>準備<rt>じゅんび</rt></ruby>はできた？</p>
        <button type="button" id="grimmerglen-change-ready">
          <span>I'm super ready!!</span>
          <small>すっごく<ruby>準備<rt>じゅんび</rt></ruby>できたよ！！</small>
        </button>
      </div>`;
    document.body.appendChild(boohaChangeOverlay);
    boohaChangeOverlay.querySelector('#grimmerglen-change-ready')?.addEventListener('click', beginBoohaChange);
  }

  function openBoohaChangePrompt() {
    if (state.boohaTransformed || state.boohaTransforming || boohaChangePromptOpen) return;
    buildBoohaChangeOverlay();
    boohaChangePromptOpen = true;
    state.inputLocked = true;
    boohaChangeOverlay.classList.add('open');
    window.setTimeout(() => boohaChangeOverlay.querySelector('#grimmerglen-change-ready')?.focus(), 0);
  }

  function closeBoohaChangePrompt() {
    boohaChangePromptOpen = false;
    boohaChangeOverlay?.classList.remove('open');
  }

  function beginBoohaChange() {
    if (!boohaChangePromptOpen || state.boohaTransforming || state.boohaTransformed) return;
    const button = boohaChangeOverlay.querySelector('#grimmerglen-change-ready');
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span>Get ready... ✦</span><small>わくわく<ruby>待<rt>ま</rt></ruby>ってね！！</small>';
    }
    // Start the media element from the user gesture so browser autoplay
    // rules are satisfied. It stays silent during the tiny anticipation beat,
    // then resets and becomes audible exactly when the visual change begins.
    boohaChangeAudio.volume = 0;
    const primingPlayback = boohaChangeAudio.play();
    if (primingPlayback && typeof primingPlayback.catch === 'function') primingPlayback.catch(() => {});
    window.clearTimeout(boohaChangeStartTimer);
    boohaChangeStartTimer = window.setTimeout(() => {
      closeBoohaChangePrompt();
      try { boohaChangeAudio.currentTime = 0; } catch (_) {}
      boohaChangeAudio.volume = 0.88;
      playBoohaChangeAudio();
      playBoohaTransform();
    }, BOOHA_CHANGE_START_DELAY_MS);
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
    buildGrimmerglenProfilePortal();

    const rotateOverlay = document.createElement('div');
    rotateOverlay.id = 'grimmerglen-rotate-overlay';
    rotateOverlay.innerHTML = '<span class="grimmerglen-rotate-phone" aria-hidden="true"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.4"></rect><line x1="11" y1="18.4" x2="13" y2="18.4"></line></svg></span><div class="grimmerglen-rotate-bar"></div><p class="grimmerglen-rotate-title">Turn your phone sideways!</p><p class="grimmerglen-rotate-sub">Explore Grimmerglen in landscape mode.<br>スマホを<ruby>横向<rt>よこむ</rt></ruby>きにしてね。</p>';
    document.body.appendChild(rotateOverlay);

    atmosphereCtx = atmosphereCanvas.getContext('2d');
    actorCtx = actorCanvas.getContext('2d');
    buildDevPanel();
    buildMariettaPanel();
    buildReturnPortalOverlay();
    buildBoohaChangeOverlay();
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
      #grimmerglen-change-overlay { position:fixed; inset:0; z-index:9400; display:none; align-items:center; justify-content:center; padding:24px; box-sizing:border-box; background:rgba(92,54,112,.38); }
      #grimmerglen-change-overlay.open { display:flex; }
      .grimmerglen-change-box { box-sizing:border-box; width:min(510px,calc(100% - 12px)); padding:28px 26px 26px; border:2px solid rgba(255,255,255,.78); border-radius:28px; background:linear-gradient(155deg,rgba(255,248,253,.98),rgba(238,229,255,.98) 52%,rgba(225,247,255,.98)); box-shadow:0 25px 80px rgba(92,54,112,.25),0 0 42px rgba(255,159,194,.52),inset 0 0 45px rgba(255,255,255,.78); text-align:center; color:#703b70; animation:grimmerglenChangePop .42s cubic-bezier(.34,1.56,.64,1) both; }
      @keyframes grimmerglenChangePop { from { opacity:0; transform:scale(.84) rotate(-2deg); } to { opacity:1; transform:scale(1) rotate(0deg); } }
      .grimmerglen-change-stars { margin:0 0 9px; color:#d886c2; font-size:19px; letter-spacing:.08em; text-shadow:0 0 12px rgba(255,159,194,.65); }
      .grimmerglen-change-kicker { margin:0 0 7px; color:#b06a94; font:800 .7rem/1.3 ui-monospace,monospace; letter-spacing:.15em; text-transform:uppercase; }
      .grimmerglen-change-box h2 { margin:0 0 9px; color:#8b3d76; font:900 clamp(1.35rem,4vw,1.9rem)/1.15 system-ui,-apple-system,sans-serif; letter-spacing:-.02em; }
      .grimmerglen-change-jp { margin:0 0 10px; color:#a85291; font:700 1rem/1.75 system-ui,-apple-system,sans-serif; }
      .grimmerglen-change-jp rt, .grimmerglen-change-box button rt { font-size:.58em; }
      .grimmerglen-change-copy { margin:14px 0 3px; color:#764b83; font:700 1rem/1.5 Georgia,'Times New Roman',serif; }
      .grimmerglen-change-box button { display:inline-flex; flex-direction:column; align-items:center; gap:3px; min-width:min(310px,100%); margin-top:11px; padding:13px 24px 12px; border:2px solid rgba(224,85,158,.72); border-radius:999px; color:#6c2c58; background:linear-gradient(135deg,#ff9fc9,#d9c2ff 54%,#aee6ff); box-shadow:0 0 22px rgba(255,159,194,.42),inset 0 0 12px rgba(255,255,255,.7); font:900 1rem/1.15 system-ui,-apple-system,sans-serif; cursor:pointer; transition:transform .15s ease,filter .15s ease; }
      .grimmerglen-change-box button:hover,.grimmerglen-change-box button:focus-visible { transform:translateY(-2px) scale(1.02); filter:saturate(1.12) brightness(1.04); outline:none; }
      .grimmerglen-change-box button:disabled { cursor:wait; opacity:.86; transform:none; }
      .grimmerglen-change-box button small { font:700 .73rem/1.3 system-ui,-apple-system,sans-serif; color:#8a4c86; }
      @media (prefers-reduced-motion: reduce) { .grimmerglen-change-box { animation:none; } .grimmerglen-change-box button { transition:none; } }
      #grimmerglen-dev { position:fixed; left:10px; bottom:10px; z-index:9500; display:flex; flex-direction:column; gap:6px; padding:8px 10px; background:rgba(0,0,0,.72); border-radius:10px; font:11px ui-monospace,monospace; color:#fff; }
      #grimmerglen-dev select { font:11px ui-monospace,monospace; }
      #grimmerglen-dev button { font:11px ui-monospace,monospace; cursor:pointer; margin-top:2px; }
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
      #grimmerglen-marietta-panel .mg-guide-title{font-size:clamp(.72rem,1.7vw,.86rem);font-weight:800;letter-spacing:.16em;color:#9a7850;margin-bottom:4px;}
      #grimmerglen-marietta-panel .mg-character-name{font-size:clamp(1.15rem,2.8vw,1.45rem);font-weight:700;margin-bottom:4px;}
      #grimmerglen-marietta-panel .mg-character-name span{font-weight:400;color:#9a7850;}
      #grimmerglen-marietta-panel .mg-welcome-en{font-size:clamp(.98rem,2.3vw,1.16rem);font-weight:700;line-height:1.35;margin-bottom:3px;}
      #grimmerglen-marietta-panel .mg-welcome-jp{font-size:clamp(.78rem,1.9vw,.94rem);color:#7c5a38;line-height:1.55;margin-bottom:8px;}
      #grimmerglen-marietta-panel .mg-memory-lead{margin-top:10px!important;font-size:clamp(.94rem,2.1vw,1.08rem);font-weight:700;color:#a9548a!important;line-height:1.35;}
      #grimmerglen-marietta-panel .mg-memory-hint-en{font-size:clamp(.98rem,2.2vw,1.15rem);font-weight:700;line-height:1.4;margin:7px 0 3px;padding:8px 10px 5px;border-left:3px solid #ff9fc2;background:rgba(255,159,194,.1);}
      #grimmerglen-marietta-panel .mg-memory-hint-jp{font-size:clamp(.8rem,1.9vw,.96rem);line-height:1.55;margin:0;padding:3px 10px 8px;border-left:3px solid #ff9fc2;background:rgba(255,159,194,.1);}
      #grimmerglen-marietta-panel .mg-memory-recheck-wrap{margin:2px 0 10px;justify-content:flex-start;}
      #grimmerglen-marietta-panel .mg-memory-recheck{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 16px;border:2px solid rgba(216,93,154,.62);border-radius:12px;color:#8a315f;background:linear-gradient(135deg,rgba(255,226,240,.98),rgba(255,246,211,.98));box-shadow:0 4px 0 rgba(216,93,154,.18),0 0 12px rgba(255,159,194,.24);font-weight:800;cursor:pointer;transition:transform .16s,box-shadow .16s,filter .16s;}
      #grimmerglen-marietta-panel .mg-memory-recheck:hover,#grimmerglen-marietta-panel .mg-memory-recheck:focus-visible{transform:translateY(-2px);filter:saturate(1.08);box-shadow:0 6px 0 rgba(216,93,154,.18),0 0 18px rgba(255,159,194,.38);outline:none;}
      #grimmerglen-marietta-panel .mg-memory-recheck:active{transform:translateY(1px);box-shadow:0 2px 0 rgba(216,93,154,.18),0 0 10px rgba(255,159,194,.25);}
      #grimmerglen-marietta-panel .mg-memory-remaining{margin:10px 0 8px;padding:9px 12px;border:2px solid rgba(84,203,169,.4);border-radius:14px;background:linear-gradient(135deg,rgba(230,255,247,.92),rgba(255,255,255,.86));color:#2f8a72;font-size:clamp(1.16rem,3vw,1.48rem);font-weight:900;line-height:1.25;text-align:center;text-shadow:0 1px 0 #fff;box-shadow:0 5px 12px rgba(84,203,169,.12);}
      #grimmerglen-marietta-panel .mg-memory-remaining ruby{ruby-position:over;} #grimmerglen-marietta-panel .mg-memory-remaining rt{font-size:.62em;color:#4ba98f;}
      #grimmerglen-marietta-panel .mg-memory-celebration{position:relative;text-align:center;padding-top:4px;}
      #grimmerglen-marietta-panel .mg-memory-celebration-stars{margin:0 0 6px;color:#e0559e;font-size:1.3rem;letter-spacing:.18em;text-shadow:0 0 14px rgba(255,159,194,.85);}
      #grimmerglen-marietta-panel .mg-memory-celebration-title{font-size:clamp(.84rem,1.9vw,1rem);font-weight:900;letter-spacing:.16em;color:#b04b88;margin:0 0 8px;}
      #grimmerglen-marietta-panel .mg-memory-celebration-copy{margin:8px 0 4px;color:#291507;font-size:clamp(1.16rem,3vw,1.55rem);font-weight:800;line-height:1.3;}
      #grimmerglen-marietta-panel .mg-memory-celebration-jp{margin:0 0 14px;color:#8c5c78;font-size:clamp(.9rem,2.2vw,1.08rem);line-height:1.6;}
      #grimmerglen-marietta-panel .mg-memory-celebration-jp rt{font-size:.62em;color:#aa6a91;}
      #grimmerglen-marietta-panel .mg-memory-celebration .dp-btns{align-items:stretch;justify-content:center;}
      #grimmerglen-marietta-panel .mg-memory-celebration .dp-btn.yes{border:2px solid #8bc9ee;color:#1d5572;background:linear-gradient(135deg,#aee6ff,#d5f1ff 52%,#b9ddff);box-shadow:0 0 14px rgba(174,230,255,.92),0 0 32px rgba(174,230,255,.62),inset 0 0 14px rgba(255,255,255,.84);text-shadow:0 1px 0 rgba(255,255,255,.65);}
      #grimmerglen-marietta-panel .mg-memory-celebration .dp-btn.yes:hover{filter:saturate(1.12) brightness(1.06);box-shadow:0 0 18px rgba(174,230,255,1),0 0 40px rgba(174,230,255,.72),inset 0 0 14px rgba(255,255,255,.9);}
      #grimmerglen-marietta-panel .mg-memory-replay{user-select:none;-webkit-user-select:none;}
      #grimmerglen-marietta-panel .mg-memory-replay-label{margin:8px 0 6px;color:#9a7850;font-size:.86rem;font-weight:700;}
      #grimmerglen-marietta-panel .mg-memory-replay-answer{min-height:150px;display:grid;align-content:center;gap:13px;margin:0 0 14px;padding:18px 16px;border:2px solid rgba(255,159,194,.48);border-radius:18px;background:linear-gradient(145deg,rgba(255,244,249,.96),rgba(238,229,255,.78));box-shadow:inset 0 0 25px rgba(255,255,255,.75),0 8px 24px rgba(184,164,255,.16);}
      #grimmerglen-marietta-panel .mg-memory-replay-answer p{margin:0;color:#281507;line-height:1.45;word-break:normal;}
      #grimmerglen-marietta-panel .mg-memory-replay-answer p:first-child{font-size:clamp(1.18rem,3vw,1.62rem);font-weight:700;}
      #grimmerglen-marietta-panel .mg-memory-replay-answer p:last-child{color:#765737;font-size:clamp(.92rem,2.3vw,1.13rem);}
      #grimmerglen-marietta-panel .mg-memory-replay-answer rt{font-size:.62em;color:#a07851;}
      #grimmerglen-marietta-panel .mg-memory-replay-scroll-cue{position:sticky;bottom:0;z-index:2;display:flex;align-items:center;justify-content:center;gap:9px;margin:0 -2px;padding:7px 10px 6px;border:1px solid rgba(255,159,194,.45);border-radius:999px;background:linear-gradient(180deg,rgba(255,248,252,.72),rgba(255,226,241,.97));color:#b04b88;font-size:clamp(.7rem,1.8vw,.82rem);font-weight:800;letter-spacing:.04em;text-align:center;box-shadow:0 -4px 12px rgba(255,255,255,.72),0 0 13px rgba(255,159,194,.25);animation:mgMemoryReplayScrollCue 1.5s ease-in-out infinite;}
      #grimmerglen-marietta-panel .mg-memory-replay-scroll-cue span{display:inline-flex;flex-direction:column;line-height:1.2;}
      #grimmerglen-marietta-panel .mg-memory-replay-scroll-cue rt{font-size:.62em;color:#aa6a91;}
      @keyframes mgMemoryReplayScrollCue{0%,100%{transform:translateY(0);opacity:.86;}50%{transform:translateY(4px);opacity:1;}}
      @media(prefers-reduced-motion:reduce){#grimmerglen-marietta-panel .mg-memory-replay-scroll-cue{animation:none;}}
      #grimmerglen-profile-portal{position:absolute;left:${GRIMMERGLEN_PROFILE_PORTAL.x}px;top:${GRIMMERGLEN_PROFILE_PORTAL.y}px;z-index:15;display:none;place-items:center;width:70px;height:70px;transform:translate(-50%,-50%);border:2px solid rgba(255,159,194,.8);border-radius:50%;background:radial-gradient(circle at 38% 30%,#fff8fd 0%,#ffd1e8 42%,#d8c7ff 100%);color:#8f4c9f;text-decoration:none;box-shadow:0 0 12px rgba(255,159,194,.75),0 0 28px rgba(184,164,255,.58),inset 0 0 14px rgba(255,255,255,.92);cursor:pointer;transition:transform .18s ease,filter .18s ease,box-shadow .18s ease;}
      #grimmerglen-profile-portal.is-visible{display:grid;}
      #grimmerglen-profile-portal::before{content:'';position:absolute;inset:-9px;border:1px solid rgba(255,224,102,.42);border-radius:50%;box-shadow:0 0 17px rgba(255,224,102,.42);animation:grimmerglenProfilePortalPulse 2.5s ease-in-out infinite;}
      #grimmerglen-profile-portal span{position:relative;display:grid;place-items:center;color:#a24c9e;font:900 2rem/1 ui-rounded,'Avenir Next Rounded','Trebuchet MS',sans-serif;letter-spacing:-.08em;text-shadow:0 2px 0 #fff,0 0 9px rgba(255,255,255,.9);}
      #grimmerglen-profile-portal span::before{content:'✧';position:absolute;left:-22px;bottom:-13px;color:#fff;font-size:.7rem;line-height:1;text-shadow:0 0 8px #fff,0 0 12px #ffd166;}
      #grimmerglen-profile-portal span::after{content:'✦';position:absolute;top:-16px;right:-19px;color:#fff;font-size:.72rem;line-height:1;text-shadow:0 0 8px #fff,0 0 12px #ffd166;}
      #grimmerglen-profile-portal::after{content:'✦  ✧  ✦';position:absolute;left:0;right:0;bottom:7px;color:#fff;font-size:.58rem;letter-spacing:.28em;line-height:1;text-align:center;text-shadow:0 0 7px #fff,0 0 12px rgba(255,209,102,.9);pointer-events:none;}
      #grimmerglen-profile-portal:hover,#grimmerglen-profile-portal:focus-visible{transform:translate(-50%,-50%) scale(1.08);filter:saturate(1.12) brightness(1.05);box-shadow:0 0 16px rgba(255,159,194,.95),0 0 38px rgba(184,164,255,.8),inset 0 0 16px rgba(255,255,255,1);outline:none;}
      @keyframes grimmerglenProfilePortalPulse{0%,100%{transform:scale(.88);opacity:.58;}50%{transform:scale(1.08);opacity:1;}}
      @media(prefers-reduced-motion:reduce){#grimmerglen-profile-portal::before{animation:none;opacity:.8;}#grimmerglen-profile-portal{transition:none;}}
      .mg-object-art-wrap{flex:0 0 clamp(68px,10vw,104px);width:clamp(68px,10vw,104px);height:clamp(68px,10vw,104px);display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9),rgba(255,201,224,.28));box-shadow:0 0 24px rgba(184,164,255,.42);}
      .mg-object-art{display:block;width:92%;height:92%;object-fit:contain;filter:drop-shadow(0 5px 7px rgba(120,58,105,.2));}
      #grimmerglen-marietta-panel .mg-memory-inner,#grimmerglen-marietta-panel .mg-handoff-inner{align-items:center;}
      #grimmerglen-marietta-panel .mg-memory-inner .dp-body,#grimmerglen-marietta-panel .mg-handoff-inner .dp-body{min-width:0;}
      @media(max-width:700px){#grimmerglen-marietta-panel .mg-object-art-wrap{flex-basis:64px;width:64px;height:64px;}#grimmerglen-marietta-panel .mgty-input-row{flex-wrap:wrap;}#grimmerglen-marietta-panel .mgty-submit{min-height:42px;flex:0 0 100%;padding:10px 16px;}}
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
      checkGrimmerglenObjectProximity(now);
      const exit = getAvailableExit(now);
      if (exit) transitionTo(exit);
      checkReturnPortalProximity(now);
      if (DEV_MODE) updateDevReadout();
    }
    drawFrame(now);
    window.requestAnimationFrame(tick);
  }

  // Grimmerglen opens after the shared nine-game weekly gate. DEV_MODE / the
  // dev panel checkbox bypasses it for room and coordinate calibration.
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
    restoreGrimmerglenCarriedObject();
    bindInput();
    window.addEventListener('resize', () => {
      fitStage();
      resizeCanvas();
      // Orientation changes can alter the cropped world area without a
      // reload; preserve item layout while keeping every item reachable.
      constrainObjectLayoutToViewport();
    });
    window.requestAnimationFrame(tick);
    triggerBoohaTransformIfNeeded();
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
