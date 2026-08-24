/*
 * Muenba world shell — navigation, atmosphere, Nuppi's lobby welcome, durable
 * Muenba save/progress, and the ghost-hunting core loop: one
 * wandering ghost per room, an ignore-vs-chase behavior split, a Hide
 * button, and click-to-attempt capture. Pass 8A owns the explicit capture
 * session hand-off, Pass 8B supplies the first two-lane rhythm capture, and
 * Pass 8C/8D complete the orb-return loop and its testing/accessibility polish.
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
  // Booha and the Muenba ghosts use separate scales. The ghost artwork has
  // generous transparent padding, so its draw radius is larger than its
  // gameplay footprint to make the visible character read correctly.
  const BOOHA_R = 26;
  const GHOST_R = 36;
  const GHOST_DRAW_R = 52;
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

  // ── Ghost hunting core loop (Pass 7) ────────────────────────────────────
  // Chase speed stays well under BASE_SPEED (5.5-8) on purpose — a chasing
  // ghost can close in if the player stands still or walks toward it, but
  // never actually corners anyone. Getting caught is a startle, not a fail
  // state: it bumps the player back a step and costs nothing.
  const GHOST_WANDER_SPEED = 1.1;
  const GHOST_CHASE_SPEED = 2.7;
  const GHOST_DETECT_R = 230;
  const GHOST_CATCH_R = 60;
  const GHOST_CLICK_R = 64;
  const GHOST_GIVEUP_HIDE_MS = 1100;
  const GHOST_STARTLE_COOLDOWN_MS = 1400;
  const GHOST_TELEPORT_MIN_MS = 16000;
  const GHOST_TELEPORT_MAX_MS = 24000;
  const GHOST_TELEPORT_WARNING_MS = 1400;
  const ORB_REWARD_PER_CAPTURE = 3;

  // Pass 8B — first rhythm chart. It is intentionally short and forgiving:
  // no simultaneous notes, holds, combos, or punishment yet. The chart is
  // data-shaped so a later pass can move it into muenba-data.js without
  // changing the timing engine.
  const RHYTHM_CHART = ['don', 'kat', 'don', 'kat', 'kat', 'don', 'kat', 'don'];
  const RHYTHM_BPM = 96;
  const RHYTHM_NOTE_MS = 60000 / RHYTHM_BPM;
  const RHYTHM_COUNTDOWN_MS = 1800;
  const RHYTHM_TRAVEL_MS = 1200;
  const RHYTHM_NOTE_DISTANCE = 168;
  const RHYTHM_PERFECT_MS = 110;
  const RHYTHM_GOOD_MS = 220;
  const RHYTHM_PASS_ACCURACY = 60;

  // Pass 3 — the hostile ghost gets a shorter, faster danger chart. It is
  // intentionally readable rather than punishing: six notes at 150 BPM,
  // with the same 60% pass line as the normal capture.
  const DANGER_RHYTHM_CHART = ['don', 'kat', 'kat', 'don', 'kat', 'don'];
  const DANGER_RHYTHM_BPM = 150;
  const DANGER_RHYTHM_NOTE_MS = 60000 / DANGER_RHYTHM_BPM;
  const DANGER_RHYTHM_COUNTDOWN_MS = 1000;
  const DANGER_RHYTHM_TRAVEL_MS = 700;
  const DANGER_RHYTHM_PERFECT_MS = 80;
  const DANGER_RHYTHM_GOOD_MS = 170;
  const DANGER_RHYTHM_PASS_ACCURACY = 60;

  const params = new URLSearchParams(window.location.search);
  const DEV_MODE = params.get('dev') === '1';
  if (DEV_MODE) window.__devMuenba = true;
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
    // DEV opens in playable mode. Coordinate pinning is still available from
    // the DEV toggle, but it must not freeze Booha immediately after Nuppi's
    // lobby closes.
    coordMode: false,
    lastTickTime: 0,
    speed: BASE_SPEED,
    fogX: 0,
    returnExiting: false,
    hiding: false,
    captureResolving: false,
    dangerFlashUntil: 0
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
  let lowFogTexture;
  let lastTouchEnd = 0;
  let entryDrift = null;
  let pins = [];
  let returnPortalOverlay = null;
  let returnPortalOpen = false;
  let returnPortalCooldownUntil = 0;
  let lobbyOverlay = null;
  let lobbyOpen = false;
  // Ghost hunting core loop (Pass 7): the current room's wandering ghost
  // (or null when this room has none today), its day-seeded room
  // assignment, a Hide-button toggle, and the capture-result overlay.
  let activeGhost = null;
  let ghostRoomMap = null;
  let ghostRoomMapDay = null;
  const ghostSpriteCache = new Map();
  let hideBtn = null;
  let captureOverlay = null;
  let captureOpen = false;
  // Pass 8A: one explicit capture session owns the hand-off from the
  // wandering ghost to the future rhythm game. Keeping the phase here means
  // Pass 8B can attach timing/input without also changing movement, ghost AI,
  // or save writes.
  let captureSession = null;
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

  // 9B: fog is still drawn from the same cached textures, but each room gets
  // a different composition so the cemetery does not feel like one repeated
  // filter. The values are deliberately restrained around the walkable path.
  const FOG_MOODS = {
    low:     { speed: .72, direction: 1,  upper: .34, middle: .18, low: .92, echo: .38, upperY: 165, middleY: 360, phase: .2 },
    high:    { speed: .44, direction: -1, upper: .92, middle: .58, low: .24, echo: .16, upperY: 95,  middleY: 275, phase: 1.8 },
    cross:   { speed: 1.02, direction: 1,  upper: .58, middle: .92, low: .44, echo: .60, upperY: 215, middleY: 405, phase: 3.1 },
    sparse:  { speed: .38, direction: -1, upper: .30, middle: .24, low: .32, echo: .18, upperY: 125, middleY: 430, phase: 4.5 },
    sinking: { speed: .66, direction: -1, upper: .52, middle: .52, low: .84, echo: .48, upperY: 255, middleY: 465, phase: 5.7 }
  };

  // The first 5 hunt-able ghosts (Pass 4) now live in muenba-data.js
  // (Pass 5) so muenba-profile.html's case-file roster reads the exact
  // same list instead of a second hand-kept copy — see muenba-data.js for
  // the tinklet/"Tinkley" naming note.
  const GHOSTS = DATA.ghosts || [];
  const ANGRY_CHANGE_IMG = DATA.ghostAngryChangeImg || '';

  const ghostImg = new Image();
  ghostImg.src = 'assets/img/booha_ghost.png';
  const hidingImg = new Image();
  hidingImg.src = 'assets/img/muenba/hiding.png';
  // Reusing Nuppi's existing wandering-NPC art from Karasuki (same asset
  // path, no new files) rather than a new character for the lobby host.
  const nuppiLobbyImg = new Image();
  nuppiLobbyImg.src = 'assets/img/wanderers/nuppi-2.png';
  const music = new Audio('assets/img/muenba/muenba_BGM.mp3');
  music.loop = true;
  music.volume = 0.55;
  const dangerScream = new Audio('assets/img/muenba/scream.mp3');
  dangerScream.loop = true;
  dangerScream.volume = 0.78;
  const dangerRhythmMusic = new Audio('assets/img/muenba/rhythm.mp3');
  dangerRhythmMusic.loop = true;
  dangerRhythmMusic.volume = 0.62;

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

  function startDangerScream() {
    try {
      dangerScream.currentTime = 0;
      dangerScream.play().catch(() => {});
    } catch (_) {}
  }

  function stopDangerScream() {
    try {
      dangerScream.pause();
      dangerScream.currentTime = 0;
    } catch (_) {}
  }

  function startDangerRhythmMusic() {
    stopDangerScream();
    try {
      dangerRhythmMusic.currentTime = 0;
      dangerRhythmMusic.play().catch(() => {});
    } catch (_) {}
  }

  function stopDangerRhythmMusic() {
    try {
      dangerRhythmMusic.pause();
      dangerRhythmMusic.currentTime = 0;
    } catch (_) {}
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
    const ghostIds = new Set();
    for (const ghost of DATA.ghosts || []) {
      if (!ghost || !ghost.id || ghostIds.has(ghost.id)) errors.push('ghost roster contains a missing or duplicate id');
      if (ghost) {
        ghostIds.add(ghost.id);
        if (typeof ghost.kana !== 'string' || !ghost.kana.trim()) errors.push(`${ghost.id} has no katakana name`);
        else if (!/^[\u30a0-\u30ffー・\s]+$/.test(ghost.kana)) errors.push(`${ghost.id} katakana name contains non-katakana text`);
        if (typeof ghost.personality !== 'string' || !ghost.personality.trim()) errors.push(`${ghost.id} has no personality note`);
        else if (/[\u3040-\u30ff\u3400-\u9fff]/.test(ghost.personality)) errors.push(`${ghost.id} personality note contains Japanese story text`);
      }
    }
    if (errors.length) console.error('[Muenba] Data validation failed:', errors);
    else console.info('[Muenba] 15-room data validation passed.');
  }

  function validateCaseData() {
    const errors = [];
    const cases = DATA.cases && typeof DATA.cases === 'object' ? DATA.cases : {};
    const order = Array.isArray(DATA.caseOrder) ? DATA.caseOrder : [];
    const ghostIds = new Set((DATA.ghosts || []).map(ghost => ghost.id));
    const japanese = /[\u3040-\u30ff\u3400-\u9fff]/;
    const englishOnly = (value, label) => {
      if (typeof value !== 'string' || !value.trim()) errors.push(`${label} must be non-empty text`);
      else if (japanese.test(value)) errors.push(`${label} contains Japanese story text`);
    };

    if (!order.length) errors.push('caseOrder must contain at least one case');
    const seenIds = new Set();
    for (const caseId of order) {
      if (seenIds.has(caseId)) errors.push(`caseOrder repeats ${caseId}`);
      seenIds.add(caseId);
      const caseData = cases[caseId];
      if (!caseData) {
        errors.push(`caseOrder points to missing ${caseId}`);
        continue;
      }
      if (caseData.id !== caseId) errors.push(`${caseId} has mismatched id`);
      if (!ghostIds.has(caseData.ghostId)) errors.push(`${caseId} points to missing ghost ${caseData.ghostId}`);
      englishOnly(caseData.title, `${caseId}.title`);
      englishOnly(caseData.eyebrow, `${caseId}.eyebrow`);
      englishOnly(caseData.intro, `${caseId}.intro`);
      for (const modeName of ['fresh', 'deep']) {
        const mode = caseData[modeName];
        if (!mode || !Array.isArray(mode.clues) || !mode.clues.length) {
          errors.push(`${caseId}.${modeName} needs at least one clue`);
          continue;
        }
        mode.clues.forEach((clue, index) => {
          englishOnly(clue && clue.title, `${caseId}.${modeName}.clues[${index}].title`);
          englishOnly(clue && clue.text, `${caseId}.${modeName}.clues[${index}].text`);
        });
        englishOnly(mode.prompt, `${caseId}.${modeName}.prompt`);
        if (typeof mode.promptJP !== 'string' || !mode.promptJP.trim()) errors.push(`${caseId}.${modeName}.promptJP must be non-empty text`);
        if (!Array.isArray(mode.choices) || !mode.choices.length) errors.push(`${caseId}.${modeName}.choices must be non-empty`);
        else mode.choices.forEach((choice, index) => englishOnly(choice, `${caseId}.${modeName}.choices[${index}]`));
        if (!Number.isInteger(mode.correct) || mode.correct < 0 || mode.correct >= (mode.choices || []).length) {
          errors.push(`${caseId}.${modeName}.correct is out of range`);
        }
        englishOnly(mode.resolution, `${caseId}.${modeName}.resolution`);
      }
    }
    Object.keys(cases).forEach(caseId => {
      if (!seenIds.has(caseId)) errors.push(`${caseId} is missing from caseOrder`);
    });
    if (errors.length) console.error('[Muenba] Case contract validation failed:', errors);
    else console.info(`[Muenba] ${order.length} case contract${order.length === 1 ? '' : 's'} passed.`);
  }

  // Muenba-only deterministic helpers. They keep the cemetery layout and
  // ghost behavior stable for one calendar day without reading curriculum
  // content or participating in the site's daily check.
  function _muenbaHashStr(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function _muenbaRng(seedStr) {
    let a = _muenbaHashStr(seedStr) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function _muenbaShuffle(arr, seedStr) {
    const r = _muenbaRng(seedStr);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function _muenbaTodayKey() {
    try {
      return window.CALENDAR && CALENDAR.getTodayKey ? CALENDAR.getTodayKey() : null;
    } catch (_) {
      return null;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     SAVE LAYER (Pass 6)
     Durable Muenba progress — ghosts found, orbs collected, pending orbs,
     rooms visited, and a rhythm-game stat bucket. Mirrors utsuroba.js's own
     loadSave()/writeSave()/
     migrate*Save() idiom — one top-level data.muenba section, defensive
     shape-fill on every load, single dirty-flag write-back — rather than
     inventing a different pattern for this world. Capture/orb fields
     exist here but the successful capture reward writes them in Pass 8C. This
     room-visit tracking already implicit in setRoom(), a real home.
     ═══════════════════════════════════════════════════════════════════ */

  function loadSave() {
    try {
      const d = (window.BoohaAdventure && BoohaAdventure.save)
        ? BoohaAdventure.save.load()
        : {};
      return migrateMuenbaSave(d);
    } catch (e) {
      console.error('[Muenba] Save read failed:', e);
    }
    return { muenba: {} };
  }

  function writeSave(data) {
    try {
      if (window.BoohaAdventure && BoohaAdventure.save) return BoohaAdventure.save.save(data);
      console.error('[Muenba] Save system unavailable — progress NOT written.');
      return false;
    } catch (e) {
      console.error('[Muenba] Save write failed:', e);
      return false;
    }
  }

  function migrateMuenbaSave(data) {
    let dirty = false;
    if (!data.muenba || typeof data.muenba !== 'object') { data.muenba = {}; dirty = true; }
    const mu = data.muenba;
    if (!mu.ghostsFound || typeof mu.ghostsFound !== 'object') { mu.ghostsFound = {}; dirty = true; }
    if (!Number.isInteger(mu.orbsCollected)) { mu.orbsCollected = 0; dirty = true; }
    if (!Number.isInteger(mu.orbsPending)) { mu.orbsPending = 0; dirty = true; }
    if (!mu.visitedRooms || typeof mu.visitedRooms !== 'object') { mu.visitedRooms = {}; dirty = true; }
    if (!mu.huntJournal || typeof mu.huntJournal !== 'object') {
      mu.huntJournal = { entries: [] };
      dirty = true;
    } else if (!Array.isArray(mu.huntJournal.entries)) {
      mu.huntJournal.entries = [];
      dirty = true;
    }
    if (!mu.caseRecords || typeof mu.caseRecords !== 'object') {
      mu.caseRecords = {};
      dirty = true;
    }
    if (mu.readingDifficulty !== 'fresh' && mu.readingDifficulty !== 'deep') {
      mu.readingDifficulty = 'fresh';
      dirty = true;
    }
    if (!mu.caseProgress || typeof mu.caseProgress !== 'object') {
      mu.caseProgress = { completedCaseIds: [], activeCaseId: null };
      dirty = true;
    }
    if (!Array.isArray(mu.caseProgress.completedCaseIds)) {
      mu.caseProgress.completedCaseIds = [];
      dirty = true;
    }
    if (mu.caseProgress.activeCaseId !== null && typeof mu.caseProgress.activeCaseId !== 'string') {
      mu.caseProgress.activeCaseId = null;
      dirty = true;
    }
    const recordedCaseIds = Object.keys(mu.caseRecords).filter(caseId => {
      const record = mu.caseRecords[caseId];
      return record && record.completed;
    });
    const mergedCaseIds = [...new Set([...mu.caseProgress.completedCaseIds, ...recordedCaseIds])];
    if (mergedCaseIds.length !== mu.caseProgress.completedCaseIds.length || mergedCaseIds.some((id, index) => id !== mu.caseProgress.completedCaseIds[index])) {
      mu.caseProgress.completedCaseIds = mergedCaseIds;
      dirty = true;
    }
    if (!mu.rhythm || typeof mu.rhythm !== 'object') {
      mu.rhythm = { bestAccuracy: 0, attempts: 0 };
      dirty = true;
    }
    if (dirty) writeSave(data);
    return data;
  }

  function readMuenba() {
    return loadSave().muenba || {};
  }

  function getMuenbaReadingDifficulty() {
    return readMuenba().readingDifficulty === 'deep' ? 'deep' : 'fresh';
  }

  function writeMuenba(patchObj) {
    const d = loadSave();
    d.muenba = { ...d.muenba, ...patchObj };
    return writeSave(d);
  }

  // Mirrors utsuroba.js's markVisited() — one write site, called from
  // setRoom() below, only actually writes the first time a given room is
  // seen (idempotent, so re-entering a room every tick doesn't spam saves).
  function markMuenbaRoomVisited(roomId) {
    try {
      const d = loadSave();
      if (!d.muenba || typeof d.muenba !== 'object') d.muenba = {};
      if (!d.muenba.visitedRooms || typeof d.muenba.visitedRooms !== 'object') d.muenba.visitedRooms = {};
      if (!d.muenba.visitedRooms[roomId]) {
        d.muenba.visitedRooms[roomId] = Date.now();
        writeSave(d);
      }
    } catch (_) {}
  }

  /* ═══════════════════════════════════════════════════════════════════
     GHOST HUNTING CORE LOOP
     One wandering ghost per room, day-seeded so the layout is stable across
     re-entries but can change tomorrow. Each ghost is either 'ignore'
     (wanders, never reacts) or 'chase' (notices the player within range and
     closes in — but never faster than the player can walk away). Catching up
     to the player is a soft startle, not a fail state. Every encountered ghost
     is currently capturable; later Muenba casework can attach a personality
     episode to the encounter without bringing back a daily quiz target.
     ═══════════════════════════════════════════════════════════════════ */

  // Which of the 15 rooms gets which of the 5 ghosts, and which ghosts are
  // 'chase' vs 'ignore' today — both reseed on the next calendar day but
  // hold steady across re-entries the same day.
  function getGhostRoomMap() {
    const today = _muenbaTodayKey() || 'nodate';
    if (ghostRoomMap && ghostRoomMapDay === today) return ghostRoomMap;
    const roomIds = Object.keys(DATA.rooms);
    const pickedRooms = _muenbaShuffle(roomIds, today + '|muenbaGhostRooms').slice(0, GHOSTS.length);
    const shuffledGhosts = _muenbaShuffle(GHOSTS, today + '|muenbaGhostAssign');
    const map = {};
    shuffledGhosts.forEach((ghost, i) => {
      if (pickedRooms[i]) map[pickedRooms[i]] = ghost;
    });
    ghostRoomMap = map;
    ghostRoomMapDay = today;
    return map;
  }

  function ghostBehaviorFor(ghostId) {
    const today = _muenbaTodayKey() || 'nodate';
    return _muenbaRng(today + '|muenbaGhostBehavior|' + ghostId)() < 0.5 ? 'ignore' : 'chase';
  }

  // Random point inside one of this room's walkable rects — same corridor
  // shape the player moves through, so a wandering ghost never drifts
  // somewhere the player can't reach it.
  function pickGhostWanderTarget() {
    const rects = getRoom().walkable || [];
    if (!rects.length) return { x: CENTER_X, y: CENTER_Y };
    const rect = rects[Math.floor(Math.random() * rects.length)];
    return clampToWorld(rect.x + Math.random() * rect.w, rect.y + Math.random() * rect.h);
  }

  function getGhostSprite(src) {
    if (ghostSpriteCache.has(src)) return ghostSpriteCache.get(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    ghostSpriteCache.set(src, img);
    return img;
  }

  function scheduleGhostTeleport(g, now) {
    const delay = GHOST_TELEPORT_MIN_MS + Math.random() * (GHOST_TELEPORT_MAX_MS - GHOST_TELEPORT_MIN_MS);
    g.teleportAt = now + delay;
    g.teleportWarningAt = g.teleportAt - GHOST_TELEPORT_WARNING_MS;
    g.teleporting = false;
  }

  function pickGhostTeleportRoom(fromRoomId) {
    const map = getGhostRoomMap();
    const candidates = Object.keys(DATA.rooms).filter(roomId => roomId !== fromRoomId && !map[roomId]);
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function teleportGhostToAnotherRoom(g, now) {
    const fromRoomId = g.roomId || state.roomId;
    const destinationRoomId = pickGhostTeleportRoom(fromRoomId);
    if (!destinationRoomId) {
      scheduleGhostTeleport(g, now);
      return;
    }
    const map = getGhostRoomMap();
    if (map[fromRoomId]?.id === g.ghost.id) delete map[fromRoomId];
    map[destinationRoomId] = g.ghost;
    activeGhost = null;
  }

  // Called from setRoom() for every room entry. The current exploration pass
  // lets any ghost begin a capture, so there is no daily target to persist or
  // hide after capture.
  function spawnRoomGhost(roomId) {
    activeGhost = null;
    const ghost = getGhostRoomMap()[roomId];
    if (!ghost) return;
    const pos = pickGhostWanderTarget();
    activeGhost = {
      ghost,
      x: pos.x,
      y: pos.y,
      behavior: ghostBehaviorFor(ghost.id),
      chasing: false,
      wanderTarget: pos,
      nextWanderAt: performance.now() + 1800 + Math.random() * 1600,
      angryUntil: 0,
      startleUntil: 0,
      hideGiveupAt: 0,
      roomId,
      teleportAt: 0,
      teleportWarningAt: 0,
      teleporting: false
    };
  }

  function moveGhostToward(g, tx, ty, speed) {
    const dx = tx - g.x, dy = ty - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;
    const step = Math.min(dist, speed);
    const next = clampToWorld(g.x + (dx / dist) * step, g.y + (dy / dist) * step);
    g.x = next.x;
    g.y = next.y;
  }

  function tickGhost(now) {
    if (!activeGhost) return;
    const g = activeGhost;
    if (state.hiding) {
      // Only the give-up timer runs while hidden — a chasing ghost that
      // loses the player takes a beat to wander off, rather than snapping
      // back to 'ignore' the instant Hide is pressed.
      if (g.chasing) {
        if (!g.hideGiveupAt) g.hideGiveupAt = now + GHOST_GIVEUP_HIDE_MS;
        else if (now >= g.hideGiveupAt) {
          g.chasing = false;
          g.hideGiveupAt = 0;
          g.wanderTarget = pickGhostWanderTarget();
          g.nextWanderAt = now + 400;
        }
      }
      return;
    }
    g.hideGiveupAt = 0;
    if (!g.teleportAt) scheduleGhostTeleport(g, now);
    if (g.teleporting) {
      if (now >= g.teleportAt) teleportGhostToAnotherRoom(g, now);
      return;
    }
    if (now >= g.teleportWarningAt) {
      g.teleporting = true;
      g.chasing = false;
      g.hideGiveupAt = 0;
      g.wanderTarget = { x: g.x, y: g.y };
      return;
    }
    const dist = Math.hypot(g.x - state.x, g.y - state.y);
    if (g.behavior === 'chase') {
      if (!g.chasing && dist <= GHOST_DETECT_R) g.chasing = true;
      if (g.chasing && dist > GHOST_DETECT_R * 1.5) g.chasing = false;
      if (g.chasing) {
        moveGhostToward(g, state.x, state.y, GHOST_CHASE_SPEED);
        if (dist <= GHOST_CATCH_R && now >= g.startleUntil) {
          g.startleUntil = now + GHOST_STARTLE_COOLDOWN_MS;
          g.angryUntil = now + 1200;
          state.dangerFlashUntil = now + 900;
          const away = dist || 1;
          const pushed = clampToWorld(
            state.x + ((state.x - g.x) / away) * 46,
            state.y + ((state.y - g.y) / away) * 46
          );
          if (canMoveTo(pushed.x, pushed.y)) { state.x = pushed.x; state.y = pushed.y; }
          state.clickTarget = null;
          beginDangerEncounter(g.ghost);
        }
        return;
      }
    }
    if (now >= (g.nextWanderAt || 0) || Math.hypot(g.wanderTarget.x - g.x, g.wanderTarget.y - g.y) < 8) {
      g.wanderTarget = pickGhostWanderTarget();
      g.nextWanderAt = now + 2400 + Math.random() * 1800;
    }
    moveGhostToward(g, g.wanderTarget.x, g.wanderTarget.y, GHOST_WANDER_SPEED);
  }

  function toggleHide() {
    if (state.transitioning || lobbyOpen || returnPortalOpen || captureOpen) return;
    state.hiding = !state.hiding;
    if (hideBtn) {
      hideBtn.classList.toggle('active', state.hiding);
      hideBtn.textContent = state.hiding ? 'Come out' : 'Hide';
    }
    if (state.hiding) {
      state.clickTarget = null;
      state.moving = false;
    }
  }

  function clickCheckGhost(worldX, worldY) {
    if (!activeGhost || state.captureResolving) return false;
    if (Math.hypot(worldX - activeGhost.x, worldY - activeGhost.y) <= GHOST_CLICK_R) {
      attemptCapture();
      return true;
    }
    return false;
  }

  function attemptCapture() {
    if (!activeGhost || state.captureResolving) return;
    const now = performance.now();
    const ghost = activeGhost.ghost;
    activeGhost.angryUntil = now + 900;
    state.captureResolving = true;
    beginCaptureSession(ghost);
  }

  function beginDangerEncounter(ghost) {
    if (!ghost || captureOpen || state.captureResolving) return;
    captureOpen = true;
    state.captureResolving = true;
    state.clickTarget = null;
    state.moving = false;
    activeGhost = null;
    captureSession = {
      ghost,
      caseData: null,
      caseDifficulty: null,
      caseIndex: 0,
      caseResolved: false,
      danger: true,
      phase: 'danger-ready',
      openedAt: performance.now()
    };
    startDangerScream();
    renderDangerReady();
  }

  function renderDangerReady() {
    if (!captureSession || !captureSession.danger || !captureOverlay) return;
    setDangerOverlay(true);
    const box = captureBox();
    box.classList.add('muenba-danger-box');
    captureImage(box, captureSession.ghost, ANGRY_CHANGE_IMG);

    const eyebrow = document.createElement('div');
    eyebrow.className = 'muenba-case-eyebrow muenba-danger-eyebrow';
    eyebrow.textContent = 'DANGER ENCOUNTER';
    box.appendChild(eyebrow);

    const h2 = document.createElement('h2');
    h2.textContent = 'The ghost is angry';
    box.appendChild(h2);
    const jp = document.createElement('p');
    jp.className = 'jp';
    jp.textContent = '幽霊が怒っている';
    box.appendChild(jp);

    renderCaseDirection(
      box,
      'It touched Booha. Face the danger rhythm, or hide now and let it lose interest.',
      '<ruby>幽霊<rt>ゆうれい</rt></ruby>がブーハに<ruby>触<rt>ふ</rt></ruby>れました。<ruby>危険<rt>きけん</rt></ruby>なリズムに<ruby>挑<rt>いど</rt></ruby>むか、<ruby>今<rt>いま</rt></ruby>すぐ<ruby>隠<rt>かく</rt></ruby>れて<ruby>興味<rt>きょうみ</rt></ruby>をなくすのを<ruby>待<rt>ま</rt></ruby>ちましょう。'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    actions.appendChild(captureButton('Face the danger rhythm', 'muenba-danger-begin', beginDangerRhythm));
    actions.appendChild(captureButton('Hide now', 'muenba-danger-hide', escapeDangerToHide));
    box.appendChild(actions);
    captureOverlay.classList.add('open');
    focusCaptureControl('#muenba-danger-begin');
  }

  function escapeDangerToHide() {
    if (!captureSession || !captureSession.danger) return;
    stopRhythmCapture();
    stopDangerScream();
    stopDangerRhythmMusic();
    captureOpen = false;
    state.captureResolving = false;
    state.hiding = true;
    state.clickTarget = null;
    state.moving = false;
    setDangerOverlay(false);
    if (captureOverlay) captureOverlay.classList.remove('open');
    captureSession = null;
    spawnRoomGhost(state.roomId);
    if (activeGhost) {
      activeGhost.chasing = true;
      activeGhost.angryUntil = performance.now() + 800;
      activeGhost.hideGiveupAt = performance.now() + GHOST_GIVEUP_HIDE_MS;
    }
    if (hideBtn) {
      hideBtn.classList.add('active');
      hideBtn.textContent = 'Come out';
    }
    resumeWorldMusicAfterCapture();
  }

  function orderedMuenbaCases() {
    const cases = DATA.cases && typeof DATA.cases === 'object' ? DATA.cases : {};
    const ids = Array.isArray(DATA.caseOrder) ? DATA.caseOrder : Object.keys(cases);
    return ids.map(caseId => cases[caseId]).filter(Boolean);
  }

  function completedMuenbaCaseIds() {
    const mu = readMuenba();
    const progressIds = mu.caseProgress && Array.isArray(mu.caseProgress.completedCaseIds)
      ? mu.caseProgress.completedCaseIds
      : [];
    const recordIds = mu.caseRecords && typeof mu.caseRecords === 'object'
      ? Object.keys(mu.caseRecords).filter(caseId => mu.caseRecords[caseId] && mu.caseRecords[caseId].completed)
      : [];
    return new Set([...progressIds, ...recordIds]);
  }

  function nextMuenbaCase() {
    const completed = completedMuenbaCaseIds();
    return orderedMuenbaCases().find(caseData => !completed.has(caseData.id)) || null;
  }

  function caseForGhost(ghostId) {
    const next = nextMuenbaCase();
    return next && next.ghostId === ghostId ? next : null;
  }

  function caseRecordComplete(caseData) {
    if (!caseData) return true;
    const records = readMuenba().caseRecords;
    return !!(records && records[caseData.id] && records[caseData.id].completed);
  }

  function buildCaptureOverlay() {
    if (captureOverlay) return;
    captureOverlay = document.createElement('div');
    captureOverlay.id = 'muenba-capture-overlay';
    captureOverlay.setAttribute('role', 'dialog');
    captureOverlay.setAttribute('aria-modal', 'true');
    captureOverlay.setAttribute('aria-label', 'Muenba ghost capture');
    document.body.appendChild(captureOverlay);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && captureOpen) {
        const phase = captureSession && captureSession.phase;
        if (phase !== 'reward' && phase !== 'nuppi' && phase !== 'nuppi-recovery') {
          cancelCaptureSession();
        }
        return;
      }
      if (!captureOpen || event.repeat) return;
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault();
        handleRhythmInput('don');
      } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleRhythmInput('kat');
      }
    });
  }

  // Pass 2 / Pass 8A session boundary. No permanent save is written here: the
  // rhythm game must decide whether this session succeeds before the ghost,
  // journal, or orb reward can be committed. The ghost is removed from the
  // scene while the session is open and respawned on cancel, so a failed or
  // abandoned attempt remains a soft miss rather than consuming the target.
  function beginCaptureSession(ghost) {
    captureOpen = true;
    const caseData = caseForGhost(ghost && ghost.id);
    captureSession = {
      ghost,
      caseData,
      caseDifficulty: caseData ? getMuenbaReadingDifficulty() : null,
      caseIndex: 0,
      caseResolved: false,
      phase: caseData && !caseRecordComplete(caseData) ? 'case-intro' : 'ready',
      openedAt: performance.now()
    };
    state.clickTarget = null;
    state.moving = false;
    activeGhost = null;
    if (captureSession.phase === 'case-intro') renderCaseIntro();
    else renderCaptureReady();
  }

  function captureBox() {
    captureOverlay.textContent = '';
    const box = document.createElement('div');
    box.className = 'muenba-lobby-box';
    captureOverlay.appendChild(box);
    return box;
  }

  function setDangerOverlay(active) {
    if (!captureOverlay) return;
    captureOverlay.classList.toggle('danger', !!active);
  }

  function captureImage(box, ghost, src = ghost.img) {
    const img = document.createElement('img');
    img.className = 'muenba-lobby-portrait';
    img.src = src || ghost.img;
    img.alt = ghost.name;
    box.appendChild(img);
  }

  function captureButton(label, id, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = id;
    button.className = 'muenba-capture-action';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  function focusCaptureControl(selector) {
    window.setTimeout(() => {
      const control = captureOverlay && captureOverlay.querySelector(selector);
      if (control && typeof control.focus === 'function') control.focus();
    }, 0);
  }

  function renderCaseDirection(box, english, japaneseHtml) {
    const direction = document.createElement('div');
    direction.className = 'muenba-case-direction';
    const en = document.createElement('p');
    en.className = 'muenba-case-direction-en';
    en.textContent = english;
    const jp = document.createElement('p');
    jp.className = 'muenba-case-direction-jp';
    jp.innerHTML = japaneseHtml;
    direction.append(en, jp);
    box.appendChild(direction);
  }

  function caseActionButton(label, japaneseHtml, id, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = id;
    button.className = 'muenba-capture-action muenba-case-action';
    const en = document.createElement('span');
    en.textContent = label;
    const jp = document.createElement('small');
    jp.innerHTML = japaneseHtml;
    button.append(en, jp);
    button.addEventListener('click', handler);
    return button;
  }

  function renderCaseIntro() {
    if (!captureSession || !captureSession.caseData || !captureOverlay) return;
    const caseData = captureSession.caseData;
    const box = captureBox();
    captureImage(box, captureSession.ghost);

    const eyebrow = document.createElement('div');
    eyebrow.className = 'muenba-case-eyebrow';
    eyebrow.textContent = caseData.eyebrow;
    box.appendChild(eyebrow);

    const h2 = document.createElement('h2');
    h2.textContent = caseData.title;
    box.appendChild(h2);

    const intro = document.createElement('p');
    intro.className = 'muenba-case-record';
    intro.textContent = caseData.intro;
    box.appendChild(intro);

    const selectedMode = captureSession.caseDifficulty === 'deep' ? 'deep' : 'fresh';
    const selectedModeJP = selectedMode === 'deep'
      ? '<ruby>深<rt>ふか</rt></ruby>い<ruby>記憶<rt>きおく</rt></ruby>'
      : '<ruby>新<rt>あたら</rt></ruby>しい<ruby>記憶<rt>きおく</rt></ruby>';

    renderCaseDirection(
      box,
      `Your profile is set to ${selectedMode === 'deep' ? 'Deep Memory' : 'Fresh Memory'}. Start with that mode, or choose the other one for this case.`,
      `プロフィールの<ruby>設定<rt>せってい</rt></ruby>は${selectedModeJP}です。この<ruby>事件<rt>じけん</rt></ruby>ではその<ruby>読<rt>よ</rt></ruby>み<ruby>方<rt>かた</rt></ruby>を<ruby>始<rt>はじ</rt></ruby>めるか、もう<ruby>一<rt>ひと</rt></ruby>つの<ruby>読<rt>よ</rt></ruby>み<ruby>方<rt>かた</rt></ruby>を<ruby>選<rt>えら</rt></ruby>びましょう。`
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-case-actions';
    const freshButton = caseActionButton(
      captureSession.caseDifficulty === 'fresh' ? 'Begin Fresh Memory' : 'Use Fresh Memory',
      '<ruby>新<rt>あたら</rt></ruby>しい<ruby>記憶<rt>きおく</rt></ruby>',
      'muenba-case-fresh',
      () => selectCaseDifficulty('fresh')
    );
    const deepButton = caseActionButton(
      captureSession.caseDifficulty === 'deep' ? 'Begin Deep Memory' : 'Use Deep Memory',
      '<ruby>深<rt>ふか</rt></ruby>い<ruby>記憶<rt>きおく</rt></ruby>',
      'muenba-case-deep',
      () => selectCaseDifficulty('deep')
    );
    if (captureSession.caseDifficulty === 'fresh') freshButton.classList.add('is-selected');
    if (captureSession.caseDifficulty === 'deep') deepButton.classList.add('is-selected');
    actions.append(freshButton, deepButton);
    box.appendChild(actions);

    captureOverlay.classList.add('open');
    focusCaptureControl(`#muenba-case-${captureSession.caseDifficulty || 'fresh'}`);
  }

  function selectCaseDifficulty(difficulty) {
    if (!captureSession || !captureSession.caseData) return;
    if (!['fresh', 'deep'].includes(difficulty)) return;
    captureSession.caseDifficulty = difficulty;
    captureSession.caseIndex = 0;
    captureSession.phase = 'case-clues';
    renderCaseClue();
  }

  function renderCaseClue() {
    if (!captureSession || !captureSession.caseData || !captureOverlay) return;
    const caseData = captureSession.caseData;
    const mode = caseData[captureSession.caseDifficulty];
    const clue = mode.clues[captureSession.caseIndex];
    const lastClue = captureSession.caseIndex >= mode.clues.length - 1;
    const box = captureBox();
    captureImage(box, captureSession.ghost);

    const progress = document.createElement('div');
    progress.className = 'muenba-case-progress';
    progress.textContent = `CASE RECORD · ${captureSession.caseIndex + 1} / ${mode.clues.length}`;
    box.appendChild(progress);

    const h2 = document.createElement('h2');
    h2.textContent = clue.title;
    box.appendChild(h2);

    const record = document.createElement('p');
    record.className = 'muenba-case-record';
    record.textContent = clue.text;
    box.appendChild(record);

    renderCaseDirection(
      box,
      'Read the record. When you are ready, open the next clue.',
      '<ruby>記録<rt>きろく</rt></ruby>を<ruby>読<rt>よ</rt></ruby>みましょう。<ruby>準備<rt>じゅんび</rt></ruby>ができたら、<ruby>次<rt>つぎ</rt></ruby>の<ruby>手<rt>て</rt></ruby>がかりを<ruby>開<rt>ひら</rt></ruby>きましょう。'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-case-actions';
    actions.appendChild(caseActionButton(
      lastClue ? 'Solve the case' : 'Open next clue',
      lastClue
        ? '<ruby>事件<rt>じけん</rt></ruby>を<ruby>解<rt>と</rt></ruby>く'
        : '<ruby>次<rt>つぎ</rt></ruby>の<ruby>手<rt>て</rt></ruby>がかりを<ruby>開<rt>ひら</rt></ruby>く',
      'muenba-case-next',
      () => {
        if (lastClue) renderCaseQuestion();
        else {
          captureSession.caseIndex += 1;
          renderCaseClue();
        }
      }
    ));
    box.appendChild(actions);
    captureOverlay.classList.add('open');
    focusCaptureControl('#muenba-case-next');
  }

  function renderCaseQuestion(feedback = '') {
    if (!captureSession || !captureSession.caseData || !captureOverlay) return;
    const mode = captureSession.caseData[captureSession.caseDifficulty];
    const box = captureBox();
    captureImage(box, captureSession.ghost);

    const progress = document.createElement('div');
    progress.className = 'muenba-case-progress';
    progress.textContent = 'CASE RECORD · FINAL CLUE';
    box.appendChild(progress);

    const records = document.createElement('div');
    records.className = 'muenba-case-record-list';
    mode.clues.forEach((clue, index) => {
      const record = document.createElement('article');
      record.className = 'muenba-case-record-item';
      const label = document.createElement('h3');
      label.textContent = `${index + 1}. ${clue.title}`;
      const text = document.createElement('p');
      text.textContent = clue.text;
      record.append(label, text);
      records.appendChild(record);
    });
    box.appendChild(records);

    renderCaseDirection(box, mode.prompt, mode.promptJP);
    if (feedback) renderCaseDirection(
      box,
      feedback,
      '<ruby>手<rt>て</rt></ruby>がかりをもう<ruby>一度<rt>いちど</rt></ruby><ruby>見<rt>み</rt></ruby>て、もう<ruby>一度<rt>いちど</rt></ruby><ruby>選<rt>えら</rt></ruby>びましょう。'
    );

    const choices = document.createElement('div');
    choices.className = 'muenba-case-choices';
    mode.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'muenba-case-choice';
      button.textContent = choice;
      button.addEventListener('click', () => {
        if (index === mode.correct) renderCaseResolved();
        else renderCaseQuestion('That explanation does not fit all three records yet.');
      });
      choices.appendChild(button);
    });
    box.appendChild(choices);
    captureOverlay.classList.add('open');
    focusCaptureControl('.muenba-case-choice');
  }

  function renderCaseResolved() {
    if (!captureSession || !captureSession.caseData || !captureOverlay) return;
    const mode = captureSession.caseData[captureSession.caseDifficulty];
    captureSession.caseResolved = true;
    captureSession.phase = 'case-resolved';
    const box = captureBox();
    captureImage(box, captureSession.ghost);

    const eyebrow = document.createElement('div');
    eyebrow.className = 'muenba-case-eyebrow';
    eyebrow.textContent = 'CASE SETTLED';
    box.appendChild(eyebrow);

    const h2 = document.createElement('h2');
    h2.textContent = captureSession.caseData.title;
    box.appendChild(h2);

    const resolution = document.createElement('p');
    resolution.className = 'muenba-case-record';
    resolution.textContent = mode.resolution;
    box.appendChild(resolution);

    renderCaseDirection(
      box,
      'The case is settled. Now begin the energy capture.',
      '<ruby>事件<rt>じけん</rt></ruby>は<ruby>解決<rt>かいけつ</rt></ruby>しました。<ruby>次<rt>つぎ</rt></ruby>にエネルギーを<ruby>集<rt>あつ</rt></ruby>めましょう。'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-case-actions';
    actions.appendChild(caseActionButton(
      'Begin energy capture',
      'エネルギーを<ruby>集<rt>あつ</rt></ruby>める',
      'muenba-case-capture',
      () => {
        captureSession.phase = 'ready';
        renderCaptureReady();
      }
    ));
    box.appendChild(actions);
    captureOverlay.classList.add('open');
    focusCaptureControl('#muenba-case-capture');
  }

  function renderCaptureReady() {
    if (!captureSession || !captureOverlay) return;
    const ghost = captureSession.ghost;
    const box = captureBox();
    captureImage(box, ghost);

    const h2 = document.createElement('h2');
    h2.textContent = 'Capture ready';
    box.appendChild(h2);

    if (ghost.personality) {
      const personality = document.createElement('p');
      personality.className = 'muenba-ghost-flavor';
      personality.textContent = ghost.personality;
      box.appendChild(personality);
    }

    renderCaseDirection(
      box,
      `You found ${ghost.name}. When you are ready, begin the capture sequence.`,
      `${ghost.name}を<ruby>見<rt>み</rt></ruby>つけました。<ruby>準備<rt>じゅんび</rt></ruby>ができたら、<ruby>捕<rt>つか</rt></ruby>まえましょう。`
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    actions.appendChild(captureButton('Begin rhythm', 'muenba-capture-begin', beginRhythmCapture));
    box.appendChild(actions);

    captureOverlay.classList.add('open');
    focusCaptureControl('#muenba-capture-begin');
  }

  function beginRhythmCapture() {
    if (!captureSession || captureSession.phase !== 'ready') return;
    startRhythmCapture(false);
  }

  function beginDangerRhythm() {
    if (!captureSession || !captureSession.danger || captureSession.phase !== 'danger-ready') return;
    startRhythmCapture(true);
  }

  function startRhythmCapture(danger) {
    const config = danger
      ? {
          chart: DANGER_RHYTHM_CHART,
          noteMs: DANGER_RHYTHM_NOTE_MS,
          countdownMs: DANGER_RHYTHM_COUNTDOWN_MS,
          travelMs: DANGER_RHYTHM_TRAVEL_MS,
          perfectMs: DANGER_RHYTHM_PERFECT_MS,
          goodMs: DANGER_RHYTHM_GOOD_MS,
          passAccuracy: DANGER_RHYTHM_PASS_ACCURACY
        }
      : {
          chart: RHYTHM_CHART,
          noteMs: RHYTHM_NOTE_MS,
          countdownMs: RHYTHM_COUNTDOWN_MS,
          travelMs: RHYTHM_TRAVEL_MS,
          perfectMs: RHYTHM_PERFECT_MS,
          goodMs: RHYTHM_GOOD_MS,
          passAccuracy: RHYTHM_PASS_ACCURACY
        };
    const startAt = performance.now() + config.countdownMs;
    captureSession.phase = 'countdown';
    captureSession.rhythm = {
      ...config,
      chart: config.chart.slice(),
      startAt,
      nextIndex: 0,
      perfect: 0,
      good: 0,
      miss: 0,
      noteEls: [],
      statusEl: null,
      accuracyEl: null,
      countdownEl: null,
      rafId: 0
    };

    pauseWorldMusicForCapture();
    if (danger) startDangerRhythmMusic();
    renderRhythmCapture();
    captureSession.rhythm.rafId = window.requestAnimationFrame(tickRhythmCapture);
  }

  function pauseWorldMusicForCapture() {
    try { music.pause(); } catch (_) {}
  }

  function resumeWorldMusicAfterCapture() {
    if (!state.musicStarted) return;
    music.play().catch(() => {});
  }

  function rhythmExpectedAt(rhythm, index) {
    return rhythm.startAt + rhythm.travelMs + index * rhythm.noteMs;
  }

  function rhythmAccuracy(rhythm) {
    const total = rhythm.chart.length || 1;
    return Math.round(((rhythm.perfect + rhythm.good) / total) * 100);
  }

  function renderRhythmCapture() {
    if (!captureSession || !captureSession.rhythm || !captureOverlay) return;
    const rhythm = captureSession.rhythm;
    const ghost = captureSession.ghost;
    const danger = !!captureSession.danger;
    setDangerOverlay(danger);
    const box = captureBox();
    if (danger) box.classList.add('muenba-danger-box');
    captureImage(box, ghost, danger ? ANGRY_CHANGE_IMG : ghost.img);

    const h2 = document.createElement('h2');
    h2.textContent = danger ? 'Danger rhythm' : 'Keep the rhythm';
    box.appendChild(h2);
    const jp = document.createElement('p');
    jp.className = 'jp';
    jp.textContent = danger ? '危険なリズム' : 'リズムでつかまえよう';
    box.appendChild(jp);

    const status = document.createElement('p');
    status.className = 'muenba-rhythm-status';
    status.textContent = 'Get ready…';
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('role', 'status');
    box.appendChild(status);
    rhythm.statusEl = status;

    const accuracy = document.createElement('p');
    accuracy.className = 'muenba-rhythm-accuracy';
    accuracy.textContent = 'Accuracy: 0%';
    box.appendChild(accuracy);
    rhythm.accuracyEl = accuracy;

    const board = document.createElement('div');
    board.className = 'muenba-rhythm-board';
    board.setAttribute('aria-label', 'Two lane rhythm capture');

    const hitLine = document.createElement('div');
    hitLine.className = 'muenba-rhythm-hit-line';
    hitLine.setAttribute('aria-hidden', 'true');
    board.appendChild(hitLine);

    ['don', 'kat'].forEach(lane => {
      const laneButton = document.createElement('button');
      laneButton.type = 'button';
      laneButton.className = `muenba-rhythm-lane muenba-rhythm-${lane}`;
      laneButton.setAttribute('aria-label', lane === 'don' ? 'Don lane' : 'Kat lane');

      const label = document.createElement('span');
      label.className = 'muenba-rhythm-lane-label';
      label.textContent = lane === 'don' ? 'DON / ドン' : 'KAT / カッ';
      laneButton.appendChild(label);

      const rail = document.createElement('span');
      rail.className = 'muenba-rhythm-rail';
      laneButton.appendChild(rail);

      laneButton.addEventListener('pointerdown', event => {
        event.preventDefault();
        handleRhythmInput(lane);
      });
      laneButton.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleRhythmInput(lane);
        }
      });

      rhythm.chart.forEach((noteLane, index) => {
        if (noteLane !== lane) return;
        const note = document.createElement('span');
        note.className = `muenba-rhythm-note muenba-rhythm-note-${lane}`;
        note.textContent = lane === 'don' ? '●' : '◆';
        note.setAttribute('aria-hidden', 'true');
        rail.appendChild(note);
        rhythm.noteEls[index] = note;
      });

      board.appendChild(laneButton);
    });

    box.appendChild(board);

    renderCaseDirection(
      box,
      'Tap a lane, or use ← / A for Don and → / S for Kat.',
      'レーンを<ruby>押<rt>お</rt></ruby>しましょう。ドンは← / A、カッは→ / Sです。'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    actions.appendChild(danger
      ? captureButton('Hide and escape', 'muenba-danger-hide', escapeDangerToHide)
      : captureButton('Cancel capture', 'muenba-capture-cancel', cancelCaptureSession));
    box.appendChild(actions);

    captureOverlay.classList.add('open');
    focusCaptureControl('.muenba-rhythm-lane');
  }

  function tickRhythmCapture(now) {
    if (!captureSession || !captureSession.rhythm) return;
    const rhythm = captureSession.rhythm;
    if (captureSession.phase !== 'countdown' && captureSession.phase !== 'playing') return;

    if (captureSession.phase === 'countdown') {
      const remaining = rhythm.startAt - now;
      if (remaining <= 0) {
        captureSession.phase = 'playing';
        showRhythmFeedback('GO!', 'go');
      } else if (rhythm.statusEl) {
        rhythm.statusEl.textContent = String(Math.max(1, Math.ceil(remaining / 600)));
      }
    }

    if (captureSession.phase === 'playing') {
      advanceMissedRhythmNotes(now);
      updateRhythmNotes(now);
      if (rhythm.nextIndex >= rhythm.chart.length &&
          now >= rhythmExpectedAt(rhythm, rhythm.chart.length - 1) + rhythm.goodMs) {
        finishRhythmCapture();
        return;
      }
    }

    rhythm.rafId = window.requestAnimationFrame(tickRhythmCapture);
  }

  function advanceMissedRhythmNotes(now) {
    const rhythm = captureSession.rhythm;
    while (rhythm.nextIndex < rhythm.chart.length &&
           now > rhythmExpectedAt(rhythm, rhythm.nextIndex) + rhythm.goodMs) {
      markRhythmNote('miss');
    }
  }

  function updateRhythmNotes(now) {
    const rhythm = captureSession.rhythm;
    rhythm.chart.forEach((_, index) => {
      const note = rhythm.noteEls[index];
      if (!note) return;
      if (index < rhythm.nextIndex) {
        note.classList.add('is-resolved');
        return;
      }
      const progress = (now - (rhythmExpectedAt(rhythm, index) - rhythm.travelMs)) / rhythm.travelMs;
      const y = Math.max(-26, Math.min(RHYTHM_NOTE_DISTANCE, progress * RHYTHM_NOTE_DISTANCE));
      note.style.transform = `translate(-50%, ${y}px)`;
    });
  }

  function markRhythmNote(result) {
    const rhythm = captureSession.rhythm;
    const index = rhythm.nextIndex;
    const note = rhythm.noteEls[index];
    if (note) note.classList.add(result === 'miss' ? 'is-miss' : 'is-hit');
    if (result === 'perfect') rhythm.perfect += 1;
    else if (result === 'good') rhythm.good += 1;
    else rhythm.miss += 1;
    rhythm.nextIndex += 1;
    if (rhythm.accuracyEl) rhythm.accuracyEl.textContent = `Accuracy: ${rhythmAccuracy(rhythm)}%`;
  }

  function showRhythmFeedback(text, kind) {
    const rhythm = captureSession && captureSession.rhythm;
    if (!rhythm || !rhythm.statusEl) return;
    rhythm.statusEl.textContent = text;
    rhythm.statusEl.className = `muenba-rhythm-status ${kind || ''}`;
  }

  function handleRhythmInput(lane) {
    if (!captureSession || !captureSession.rhythm || captureSession.phase !== 'playing') return;
    const rhythm = captureSession.rhythm;
    const now = performance.now();
    advanceMissedRhythmNotes(now);
    if (rhythm.nextIndex >= rhythm.chart.length) return;

    const index = rhythm.nextIndex;
    const expected = rhythmExpectedAt(rhythm, index);
    const delta = now - expected;
    if (delta < -rhythm.goodMs) {
      showRhythmFeedback('A little later…', 'early');
      return;
    }
    if (rhythm.chart[index] !== lane) {
      markRhythmNote('miss');
      showRhythmFeedback('Wrong lane', 'miss');
      return;
    }
    const absoluteDelta = Math.abs(delta);
    if (absoluteDelta <= rhythm.perfectMs) {
      markRhythmNote('perfect');
      showRhythmFeedback('Perfect!', 'perfect');
    } else if (absoluteDelta <= rhythm.goodMs) {
      markRhythmNote('good');
      showRhythmFeedback('Good!', 'good');
    } else {
      markRhythmNote('miss');
      showRhythmFeedback(delta < 0 ? 'Too early' : 'Too late', 'miss');
    }
  }

  function recordRhythmResult(accuracy) {
    try {
      const d = loadSave();
      if (!d.muenba || typeof d.muenba !== 'object') d.muenba = {};
      if (!d.muenba.rhythm || typeof d.muenba.rhythm !== 'object') {
        d.muenba.rhythm = { bestAccuracy: 0, attempts: 0 };
      }
      const rhythm = d.muenba.rhythm;
      rhythm.attempts = (Number.isInteger(rhythm.attempts) ? rhythm.attempts : 0) + 1;
      rhythm.bestAccuracy = Math.max(Number(rhythm.bestAccuracy) || 0, accuracy);
      writeSave(d);
    } catch (_) {}
  }

  function finishRhythmCapture() {
    if (!captureSession || !captureSession.rhythm) return;
    const rhythm = captureSession.rhythm;
    if (rhythm.rafId) window.cancelAnimationFrame(rhythm.rafId);
    rhythm.rafId = 0;
    const accuracy = rhythmAccuracy(rhythm);
    const success = accuracy >= rhythm.passAccuracy;
    if (captureSession.danger) {
      stopDangerScream();
      stopDangerRhythmMusic();
    }
    rhythm.accuracy = accuracy;
    rhythm.success = success;
    recordRhythmResult(accuracy);
    if (!success) {
      captureSession.phase = 'result';
      renderRhythmResult(accuracy, false);
      return;
    }

    const rewardCount = commitSuccessfulCapture();
    if (rewardCount == null) {
      captureSession.phase = 'result';
      renderRhythmResult(accuracy, false, 'The rhythm was good, but the capture could not be saved. Please try again.');
      return;
    }

    captureSession.phase = 'reward';
    captureSession.reward = {
      total: rewardCount,
      revealed: 0,
      revealTimer: 0,
      orbListEl: null,
      statusEl: null,
      actionsEl: null,
      returnAfter: 'hunt'
    };
    renderCaptureReward();
    releaseNextOrb();
  }

  function commitSuccessfulCapture() {
    if (!captureSession || !captureSession.ghost) return null;
    if (captureSession.rewardCommitted) return captureSession.rewardCount || 0;

    const ghost = captureSession.ghost;
    const d = loadSave();
    if (!d.muenba || typeof d.muenba !== 'object') d.muenba = {};
    const mu = d.muenba;
    if (!mu.ghostsFound || typeof mu.ghostsFound !== 'object') mu.ghostsFound = {};
    if (!Number.isInteger(mu.orbsPending)) mu.orbsPending = 0;
    if (!mu.huntJournal || !Array.isArray(mu.huntJournal.entries)) mu.huntJournal = { entries: [] };
    if (!mu.caseRecords || typeof mu.caseRecords !== 'object') mu.caseRecords = {};

    const isNewCapture = !mu.ghostsFound[ghost.id];
    mu.ghostsFound[ghost.id] = true;
    let journalEntry = mu.huntJournal.entries.find(entry => entry && entry.ghostId === ghost.id);
    if (!journalEntry) {
      journalEntry = { ghostId: ghost.id, capturedAt: Date.now() };
      mu.huntJournal.entries.push(journalEntry);
    }

    const caseData = captureSession.caseData;
    if (caseData && captureSession.caseResolved && captureSession.caseDifficulty) {
      const completedAt = Date.now();
      mu.caseRecords[caseData.id] = {
        completed: true,
        ghostId: caseData.ghostId,
        difficulty: captureSession.caseDifficulty,
        completedAt
      };
      if (!mu.caseProgress || typeof mu.caseProgress !== 'object') {
        mu.caseProgress = { completedCaseIds: [], activeCaseId: null };
      }
      if (!Array.isArray(mu.caseProgress.completedCaseIds)) mu.caseProgress.completedCaseIds = [];
      if (!mu.caseProgress.completedCaseIds.includes(caseData.id)) mu.caseProgress.completedCaseIds.push(caseData.id);
      mu.caseProgress.activeCaseId = null;
      journalEntry.caseId = caseData.id;
      journalEntry.caseDifficulty = captureSession.caseDifficulty;
      journalEntry.caseCompletedAt = completedAt;
    }
    const rewardCount = isNewCapture ? ORB_REWARD_PER_CAPTURE : 0;
    mu.orbsPending += rewardCount;
    if (!writeSave(d)) return null;

    captureSession.rewardCommitted = true;
    captureSession.rewardCount = rewardCount;
    try {
      if (window.BoohaUnlockSystem && typeof BoohaUnlockSystem.checkAll === 'function') BoohaUnlockSystem.checkAll();
    } catch (_) {}
    return rewardCount;
  }

  function renderRhythmResult(accuracy, success, message) {
    const ghost = captureSession.ghost;
    const p = document.createElement('p');
    const danger = !!captureSession.danger;
    setDangerOverlay(danger);
    const box = captureBox();
    if (danger) box.classList.add('muenba-danger-box');
    captureImage(box, ghost, danger ? ANGRY_CHANGE_IMG : ghost.img);

    const h2 = document.createElement('h2');
    h2.textContent = danger
      ? (success ? 'You broke the anger' : 'The ghost broke through')
      : (success ? 'Rhythm complete' : 'Try again');
    box.appendChild(h2);
    const jp = document.createElement('p');
    jp.className = 'jp';
    jp.textContent = danger
      ? (success ? '怒りをしずめた' : 'まだ危険')
      : (success ? 'リズム成功' : 'もう一度');
    box.appendChild(jp);

    p.textContent = message || (danger
      ? `Accuracy: ${accuracy}%. ${success ? 'The angry ghost has been calmed. Continue to the capture reward.' : 'The angry ghost knocked Booha back. Hide, or face the danger rhythm again.'}`
      : `Accuracy: ${accuracy}%. ${success ? 'The capture is ready for the reward step.' : 'The ghost is still waiting for you.'}`);
    box.appendChild(p);

    renderCaseDirection(
      box,
      danger
        ? (success ? 'The angry ghost has calmed down. Continue to the capture reward.' : 'Hide to stop the scream, or try the danger rhythm again.')
        : (success ? 'The capture is ready for the reward step.' : 'The ghost is still waiting. Try the rhythm again.'),
      danger
        ? (success
          ? '<ruby>怒<rt>おこ</rt></ruby>った<ruby>幽霊<rt>ゆうれい</rt></ruby>は<ruby>落<rt>お</rt></ruby>ち<ruby>着<rt>つ</rt></ruby>きました。<ruby>報酬<rt>ほうしゅう</rt></ruby>を<ruby>受<rt>う</rt></ruby>け<ruby>取<rt>と</rt></ruby>りましょう。'
          : '<ruby>隠<rt>かく</rt></ruby>れると<ruby>叫<rt>さけ</rt></ruby>び<ruby>声<rt>ごえ</rt></ruby>が<ruby>止<rt>と</rt></ruby>まります。もう<ruby>一度<rt>いちど</rt></ruby><ruby>挑<rt>いど</rt></ruby>むこともできます。')
        : (success
          ? '<ruby>捕<rt>つか</rt></ruby>まえる<ruby>準備<rt>じゅんび</rt></ruby>ができました。<ruby>次<rt>つぎ</rt></ruby>に<ruby>報酬<rt>ほうしゅう</rt></ruby>を<ruby>受<rt>う</rt></ruby>け<ruby>取<rt>と</rt></ruby>りましょう。'
          : '<ruby>幽霊<rt>ゆうれい</rt></ruby>はまだ<ruby>待<rt>ま</rt></ruby>っています。リズムをもう<ruby>一度<rt>いちど</rt></ruby><ruby>試<rt>ため</rt></ruby>しましょう。')
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    if (danger) {
      if (!success) actions.appendChild(captureButton('Try danger rhythm again', 'muenba-danger-retry', retryDangerRhythm));
      actions.appendChild(captureButton('Hide and escape', 'muenba-danger-hide', escapeDangerToHide));
    } else {
      if (!success) actions.appendChild(captureButton('Try rhythm again', 'muenba-capture-retry', retryRhythmCapture));
      actions.appendChild(captureButton('Return to hunt', 'muenba-capture-cancel', cancelCaptureSession));
    }
    box.appendChild(actions);
  }

  function retryRhythmCapture() {
    if (!captureSession || captureSession.phase !== 'result') return;
    stopRhythmCapture();
    captureSession.phase = 'ready';
    captureSession.rhythm = null;
    renderCaptureReady();
  }

  function retryDangerRhythm() {
    if (!captureSession || !captureSession.danger || captureSession.phase !== 'result') return;
    stopRhythmCapture();
    captureSession.phase = 'danger-ready';
    captureSession.rhythm = null;
    startDangerScream();
    renderDangerReady();
  }

  function renderCaptureReward() {
    if (!captureSession || !captureSession.reward || !captureOverlay) return;
    setDangerOverlay(false);
    const ghost = captureSession.ghost;
    const reward = captureSession.reward;
    const box = captureBox();
    captureImage(box, ghost);

    const h2 = document.createElement('h2');
    h2.textContent = 'Captured!';
    box.appendChild(h2);
    const copy = document.createElement('p');
    copy.textContent = `${ghost.name} is safe now. Energy orbs are coming free one at a time.`;
    box.appendChild(copy);
    renderCaseDirection(
      box,
      'Watch the energy release, then return the orbs to Nuppi.',
      'エネルギーが<ruby>出<rt>で</rt></ruby>てきます。<ruby>見<rt>み</rt></ruby>てから、オーブをヌッピに<ruby>届<rt>とど</rt></ruby>けましょう。'
    );

    const orbList = document.createElement('div');
    orbList.className = 'muenba-orb-release-list';
    orbList.setAttribute('aria-label', 'Released energy orbs');
    box.appendChild(orbList);
    reward.orbListEl = orbList;

    const status = document.createElement('p');
    status.className = 'muenba-orb-release-status';
    status.textContent = `Energy released: 0 / ${reward.total}`;
    status.setAttribute('aria-live', 'polite');
    box.appendChild(status);
    reward.statusEl = status;

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    box.appendChild(actions);
    reward.actionsEl = actions;
  }

  function releaseNextOrb() {
    if (!captureSession || captureSession.phase !== 'reward' || !captureSession.reward) return;
    const reward = captureSession.reward;
    if (reward.revealed >= reward.total) {
      if (reward.statusEl) reward.statusEl.textContent = `Energy released: ${reward.total} / ${reward.total}`;
      if (reward.actionsEl && !reward.actionsEl.children.length) {
        reward.actionsEl.appendChild(captureButton('Return to Nuppi', 'muenba-capture-return', depositOrbsAtNuppi));
        focusCaptureControl('#muenba-capture-return');
      }
      return;
    }

    const orb = document.createElement('span');
    orb.className = 'muenba-orb-release';
    orb.textContent = '✦';
    orb.setAttribute('aria-label', `Energy orb ${reward.revealed + 1}`);
    reward.orbListEl.appendChild(orb);
    reward.revealed += 1;
    if (reward.statusEl) reward.statusEl.textContent = `Energy released: ${reward.revealed} / ${reward.total}`;
    reward.revealTimer = window.setTimeout(releaseNextOrb, 520);
  }

  function depositOrbsAtNuppi() {
    if (!captureSession || (captureSession.phase !== 'reward' && captureSession.phase !== 'nuppi-recovery')) return;
    const d = loadSave();
    if (!d.muenba || typeof d.muenba !== 'object') d.muenba = {};
    const mu = d.muenba;
    const pending = Number.isInteger(mu.orbsPending) ? mu.orbsPending : 0;
    const collected = Number.isInteger(mu.orbsCollected) ? mu.orbsCollected : 0;
    mu.orbsCollected = collected + pending;
    mu.orbsPending = 0;
    if (!writeSave(d)) return;

    captureSession.phase = 'nuppi';
    captureSession.depositedOrbs = pending;
    renderNuppiThanks(pending);
  }

  function renderNuppiThanks(deposited) {
    if (!captureSession || !captureOverlay) return;
    const box = captureBox();
    const img = document.createElement('img');
    img.className = 'muenba-lobby-portrait';
    img.src = 'assets/img/wanderers/nuppi-2.png';
    img.alt = 'Nuppi';
    box.appendChild(img);

    const h2 = document.createElement('h2');
    h2.textContent = 'Nuppi receives the orbs';
    box.appendChild(h2);

    const p = document.createElement('p');
    p.textContent = deposited > 0
      ? `Nuppi smiles. ${deposited} energy orb${deposited === 1 ? '' : 's'} came safely home.`
      : 'Nuppi smiles. The energy trail is already safe.';
    box.appendChild(p);
    renderCaseDirection(
      box,
      'The energy is safe with Nuppi. Return to the hunt when you are ready.',
      'エネルギーはヌッピのところで<ruby>安全<rt>あんぜん</rt></ruby>です。<ruby>準備<rt>じゅんび</rt></ruby>ができたら、<ruby>探索<rt>たんさく</rt></ruby>に<ruby>戻<rt>もど</rt></ruby>りましょう。'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    const buttonLabel = 'Back to the hunt';
    actions.appendChild(captureButton(buttonLabel, 'muenba-capture-finish', () => {
      closeCaptureOverlay({ resumeHunt: true });
    }));
    box.appendChild(actions);
    focusCaptureControl('#muenba-capture-finish');
  }

  function openPendingOrbRecovery() {
    const pending = readMuenba().orbsPending;
    if (!(pending > 0)) {
      return;
    }
    captureOpen = true;
    state.clickTarget = null;
    state.moving = false;
    captureSession = {
      ghost: null,
      phase: 'nuppi-recovery',
      reward: { total: pending, revealed: pending, returnAfter: 'hunt' }
    };
    renderPendingOrbRecovery(pending);
  }

  function renderPendingOrbRecovery(pending) {
    const box = captureBox();
    const img = document.createElement('img');
    img.className = 'muenba-lobby-portrait';
    img.src = 'assets/img/wanderers/nuppi-2.png';
    img.alt = 'Nuppi';
    box.appendChild(img);

    const h2 = document.createElement('h2');
    h2.textContent = 'Your orbs are waiting';
    box.appendChild(h2);
    const p = document.createElement('p');
    p.textContent = `Nuppi has a safe place for your ${pending} pending energy orb${pending === 1 ? '' : 's'}.`;
    box.appendChild(p);
    renderCaseDirection(
      box,
      'Return the waiting orbs to Nuppi before you continue.',
      '<ruby>続<rt>つづ</rt></ruby>ける<ruby>前<rt>まえ</rt></ruby>に、<ruby>待<rt>ま</rt></ruby>っているオーブをヌッピに<ruby>届<rt>とど</rt></ruby>けましょう。'
    );
    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    actions.appendChild(captureButton('Return orbs to Nuppi', 'muenba-capture-return', depositOrbsAtNuppi));
    box.appendChild(actions);
    captureOverlay.classList.add('open');
    focusCaptureControl('#muenba-capture-return');
  }

  function cancelCaptureSession() {
    if (!captureOpen) return;
    if (captureSession && captureSession.danger) {
      escapeDangerToHide();
      return;
    }
    const phase = captureSession && captureSession.phase;
    if (phase === 'reward' || phase === 'nuppi' || phase === 'nuppi-recovery') return;
    stopRhythmCapture();
    captureOpen = false;
    state.captureResolving = false;
    setDangerOverlay(false);
    if (captureOverlay) captureOverlay.classList.remove('open');

    // Re-seed the room ghost after a cancel. This does not write ghostsFound,
    // huntJournal, or orbs.
    captureSession = null;
    spawnRoomGhost(state.roomId);
    resumeWorldMusicAfterCapture();
  }

  // Pass 8C calls this after the reward has been deposited. It remains
  // separate from cancelCaptureSession() so success cannot accidentally
  // respawn the just-captured target or clear a future reward state.
  function closeCaptureOverlay({ resumeHunt = false } = {}) {
    stopRhythmCapture();
    captureOpen = false;
    state.captureResolving = false;
    setDangerOverlay(false);
    if (captureOverlay) captureOverlay.classList.remove('open');
    captureSession = null;
    if (resumeHunt) spawnRoomGhost(state.roomId);
    resumeWorldMusicAfterCapture();
  }

  function stopRhythmCapture() {
    const rhythm = captureSession && captureSession.rhythm;
    if (rhythm && rhythm.rafId) window.cancelAnimationFrame(rhythm.rafId);
    if (rhythm) rhythm.rafId = 0;
    if (captureSession && captureSession.danger) stopDangerRhythmMusic();
    const reward = captureSession && captureSession.reward;
    if (reward && reward.revealTimer) window.clearTimeout(reward.revealTimer);
    if (reward) reward.revealTimer = 0;
  }

  function drawGhost(now) {
    if (!activeGhost) return;
    const seconds = now / 1000;
    const bob = Math.sin(seconds * 3.4 + 1) * 6;
    const isAngry = now < activeGhost.angryUntil;
    const src = isAngry ? ANGRY_CHANGE_IMG : activeGhost.ghost.img;
    const img = src ? getGhostSprite(src) : null;
    const x = activeGhost.x;
    const y = activeGhost.y + bob;
    const teleporting = activeGhost.teleporting;
    const teleportProgress = teleporting
      ? Math.max(0, Math.min(1, (activeGhost.teleportAt - now) / GHOST_TELEPORT_WARNING_MS))
      : 1;
    actorCtx.save();
    actorCtx.globalAlpha = .95 * (teleporting ? .18 + teleportProgress * .82 : 1);
    if (teleporting) {
      const pulse = .5 + .5 * Math.sin(now / 70);
      actorCtx.strokeStyle = `rgba(190, 154, 255, ${.38 + pulse * .3})`;
      actorCtx.lineWidth = 3;
      actorCtx.beginPath();
      actorCtx.arc(x, y, GHOST_DRAW_R * (1.12 + pulse * .18), 0, Math.PI * 2);
      actorCtx.stroke();
      actorCtx.strokeStyle = `rgba(119, 213, 183, ${.24 + pulse * .2})`;
      actorCtx.lineWidth = 1.5;
      actorCtx.beginPath();
      actorCtx.arc(x, y, GHOST_DRAW_R * (.78 + pulse * .12), 0, Math.PI * 2);
      actorCtx.stroke();
    }
    if (img && img.complete && img.naturalWidth > 0) {
      actorCtx.drawImage(img, x - GHOST_DRAW_R, y - GHOST_DRAW_R, GHOST_DRAW_R * 2, GHOST_DRAW_R * 2);
    } else {
      actorCtx.fillStyle = isAngry ? '#e0687e' : '#cfe8df';
      actorCtx.beginPath();
      actorCtx.arc(x, y, GHOST_R * .7, 0, Math.PI * 2);
      actorCtx.fill();
    }
    actorCtx.restore();
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
      #muenba-rotate-overlay { display:none; position:fixed; inset:0; z-index:9999; background:#000; flex-direction:column; align-items:center; justify-content:center; gap:18px; text-align:center; padding:32px; box-sizing:border-box; }
      @media screen and (orientation:portrait) and (max-width:1023px) { #muenba-rotate-overlay { display:flex !important; } }
      .muenba-rotate-phone { display:inline-flex; align-items:center; justify-content:center; color:#d8f4e6; transform-origin:center; animation:muenbaRotateHint 2.4s ease-in-out infinite; }
      @keyframes muenbaRotateHint { 0%,100% { transform:rotate(0deg); } 40%,60% { transform:rotate(-90deg); } }
      .muenba-rotate-bar { width:120px; height:3px; border-radius:999px; background:linear-gradient(90deg,#477f6a,#a7e1c5,#477f6a); background-size:200%; animation:muenbaBarShimmer 2s linear infinite; box-shadow:0 0 14px rgba(122,210,170,.46); }
      @keyframes muenbaBarShimmer { 0% { background-position:0%; } 100% { background-position:200%; } }
      .muenba-rotate-title { font-family:system-ui,-apple-system,sans-serif; font-size:clamp(18px,5vw,28px); font-weight:900; letter-spacing:.04em; color:#f0fff7; margin:0; text-shadow:0 0 28px rgba(143,220,178,.52); }
      .muenba-rotate-sub { font-size:14px; color:rgba(216,244,230,.62); margin:0; line-height:1.7; }
      @media (prefers-reduced-motion: reduce) { .muenba-rotate-phone, .muenba-rotate-bar { animation:none; } }
      #muenba-dev { position:fixed; left:12px; top:12px; z-index:100; display:${DEV_MODE ? 'block' : 'none'}; color:#bde5e4; background:rgba(0,8,12,.88); border:1px solid rgba(125,220,216,.35); border-radius:10px; padding:9px 10px; font:700 11px/1.5 ui-monospace,monospace; pointer-events:auto; min-width:210px; box-shadow:0 0 20px rgba(0,0,0,.4); }
      #muenba-dev strong { color:#f0ffff; }
      #muenba-dev-text { white-space:pre-line; }
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
      /* Nuppi's lobby welcome — same dark-cemetery popup language as the
         return prompt, just roomier: it holds a portrait plus a few lines
         of text instead of a one-line question. Shows every time the
         player enters Muenba (Pass 3b). */
      #muenba-lobby-overlay { position:fixed; inset:0; z-index:210; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0); transition:background .4s ease; padding:20px; box-sizing:border-box; }
      #muenba-lobby-overlay.open { display:flex; background:rgba(0,0,0,.86); }
      .muenba-lobby-box { box-sizing:border-box; width:min(480px,100%); max-height:calc(100vh - 40px); overflow-y:auto; padding:28px 26px 26px; border:1px solid rgba(111,166,145,.45); border-radius:18px; background:linear-gradient(155deg,rgba(8,27,20,.97),rgba(1,4,4,.98)); box-shadow:0 24px 70px rgba(0,0,0,.75),0 0 55px rgba(16,65,45,.28),inset 0 0 70px rgba(0,0,0,.58); text-align:center; font-family:Georgia,'Times New Roman',serif; color:#e0eee8; transform:scale(.94); opacity:0; transition:transform .32s cubic-bezier(.34,1.56,.64,1),opacity .26s ease; }
      #muenba-lobby-overlay.open .muenba-lobby-box { transform:scale(1); opacity:1; }
      .muenba-lobby-portrait { display:block; width:96px; height:96px; object-fit:contain; margin:0 auto 12px; filter:drop-shadow(0 0 16px rgba(122,180,151,.3)); animation:muenbaNuppiTalk 2.8s ease-in-out infinite; transform-origin:50% 86%; }
      @keyframes muenbaNuppiTalk { 0%,100% { transform:translateY(0) rotate(-1deg); } 25% { transform:translateY(-3px) rotate(1deg); } 52% { transform:translateY(1px) rotate(0deg); } 76% { transform:translateY(-2px) rotate(-1deg); } }
      .muenba-lobby-box h2 { margin:0 0 4px; font-size:1.2rem; font-weight:400; letter-spacing:.06em; text-transform:uppercase; }
      .muenba-lobby-box .jp { margin:0 0 16px; color:#aac2b5; font-size:.85rem; letter-spacing:.1em; text-align:center; }
      .muenba-lobby-box p { margin:0 0 14px; color:#c5d8cd; font-size:.92rem; line-height:1.65; text-align:left; }
      .muenba-lobby-box p.jp-line { color:#8fa89b; font-size:.82rem; }
      .muenba-lobby-box p:last-of-type { margin-bottom:20px; }
      .muenba-ghost-flavor { margin:12px 0 16px !important; padding:10px 12px; border-left:2px solid rgba(216,201,139,.5); background:rgba(216,201,139,.06); color:#e7dca9 !important; font-size:.86rem !important; font-style:italic; line-height:1.5 !important; text-align:center !important; }
      .muenba-lobby-box.is-case-board { width:min(600px,100%); padding:34px 30px 32px; border-color:rgba(216,201,139,.48); box-shadow:0 24px 80px rgba(0,0,0,.8),0 0 70px rgba(126,111,48,.18),inset 0 0 70px rgba(0,0,0,.58); }
      .muenba-lobby-case-board { margin:22px 0 24px; padding:21px 20px 19px; border:1px solid rgba(216,201,139,.4); border-radius:12px; background:linear-gradient(145deg,rgba(216,201,139,.1),rgba(216,201,139,.025)); text-align:left; }
      .muenba-lobby-case-board h3 { margin:0 0 10px; color:#fff5d5; font:400 clamp(1.25rem,4vw,1.7rem)/1.2 Georgia,'Times New Roman',serif; letter-spacing:.01em; }
      .muenba-lobby-case-board p { margin:0 0 7px; color:#fff5d5; font-size:1rem; line-height:1.55; }
      .muenba-lobby-case-board p.muenba-case-board-copy { color:#d9d0a5; font-size:.9rem; }
      .muenba-lobby-case-board p.muenba-case-direction-jp { color:#9fc3af; font-size:.84rem; }
      .muenba-case-board-eyebrow { margin:0 0 8px; color:#d8c98b; font:700 .62rem/1.4 ui-monospace,monospace; letter-spacing:.16em; text-transform:uppercase; }
      .muenba-lobby-actions { display:flex; justify-content:center; margin-top:4px; }
      #muenba-lobby-begin, .muenba-capture-action { border:1px solid rgba(156,203,182,.7); color:#e0f4e9; background:rgba(52,104,78,.28); box-shadow:0 0 16px rgba(93,162,124,.22); border-radius:999px; padding:10px 28px; font:700 12px ui-monospace,monospace; letter-spacing:.05em; cursor:pointer; }
      #muenba-case-board-start { min-width:190px; padding:13px 38px; border-color:rgba(216,201,139,.9); color:#fff5d5; background:rgba(126,111,48,.3); box-shadow:0 0 24px rgba(216,201,139,.34),inset 0 0 12px rgba(216,201,139,.12); font-size:13px; }
      #muenba-case-board-start:hover, #muenba-case-board-start:focus-visible { background:rgba(126,111,48,.48); box-shadow:0 0 34px rgba(216,201,139,.48),inset 0 0 16px rgba(216,201,139,.16); }
      #muenba-lobby-begin:hover, #muenba-lobby-begin:focus-visible, .muenba-capture-action:hover, .muenba-capture-action:focus-visible { background:rgba(52,104,78,.44); outline:none; }
      .muenba-case-eyebrow { margin:0 0 8px; color:#d8c98b; font:700 10px/1.4 ui-monospace,monospace; letter-spacing:.15em; }
      .muenba-case-progress { margin:0 0 10px; color:#9ccbb6; font:700 10px/1.4 ui-monospace,monospace; letter-spacing:.12em; }
      .muenba-case-record { margin:15px 0 18px !important; padding:14px 15px; border-left:3px solid #d8c98b; background:rgba(216,201,139,.08); color:#fff5d5 !important; font-size:1rem !important; line-height:1.65 !important; text-align:left !important; }
      .muenba-case-record-list { display:grid; gap:7px; margin:13px 0 16px; text-align:left; }
      .muenba-case-record-item { padding:9px 11px; border-left:2px solid rgba(216,201,139,.42); background:rgba(216,201,139,.045); }
      .muenba-case-record-item h3 { margin:0 0 4px; color:#e7dca9; font:700 .72rem/1.35 ui-monospace,monospace; letter-spacing:.04em; }
      .muenba-case-record-item p { margin:0; color:#fff5d5; font-size:.82rem; line-height:1.45; }
      .muenba-case-direction { margin:16px 0; padding:10px 12px; border:1px solid rgba(156,203,182,.24); border-radius:10px; background:rgba(255,255,255,.035); text-align:left; }
      .muenba-case-direction-en { margin:0; color:#dff5e8; font-size:.86rem; line-height:1.45; }
      .muenba-case-direction-jp { margin:5px 0 0; color:#9fc3af; font-size:.82rem; line-height:1.55; }
      .muenba-case-direction ruby, .muenba-case-action ruby { ruby-position:over; line-height:1.45; }
      .muenba-case-direction rt, .muenba-case-action rt { font-size:.78em; opacity:.95; }
      .muenba-case-actions { display:flex; justify-content:center; gap:9px; flex-wrap:wrap; margin-top:6px; }
      .muenba-case-action { min-width:150px; display:inline-flex; flex-direction:column; align-items:center; gap:3px; }
      .muenba-case-action.is-selected { border-color:#d8c98b; background:rgba(216,201,139,.2); box-shadow:0 0 18px rgba(216,201,139,.2); }
      .muenba-case-action small { color:#a8cbb8; font:400 .76rem Georgia,'Times New Roman',serif; letter-spacing:0; }
      .muenba-case-choices { display:grid; gap:9px; margin:14px 0 4px; }
      .muenba-case-choice { width:100%; padding:12px 14px; border:1px solid rgba(216,201,139,.34); border-radius:10px; background:rgba(216,201,139,.07); color:#fff5d5; font:400 .9rem Georgia,'Times New Roman',serif; line-height:1.4; text-align:left; cursor:pointer; }
      .muenba-case-choice:hover, .muenba-case-choice:focus-visible { border-color:#d8c98b; background:rgba(216,201,139,.16); outline:none; }
      /* Hide button (Pass 7) — always visible during free-roam, not a DEV
         tool. Matches the exit button's box language but sits bottom-left
         so it never competes with the DEV-only bottom-right room list. */
      #muenba-hide { position:fixed; left:12px; bottom:12px; z-index:100; border:1px solid rgba(156,203,182,.5); border-radius:8px; background:rgba(0,8,12,.78); color:#d8e8e0; padding:8px 16px; font:700 11px ui-monospace,monospace; letter-spacing:.05em; cursor:pointer; }
      #muenba-hide:hover, #muenba-hide:focus-visible { background:rgba(30,70,60,.8); outline:none; }
      #muenba-hide.active { background:rgba(93,162,124,.42); border-color:#5dd08c; color:#eafff2; }
      /* Capture session overlay — reuses .muenba-lobby-box for
         the card shell and adds the two-lane
         rhythm board inside that modal. */
      #muenba-capture-overlay { position:fixed; inset:0; z-index:215; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0); transition:background .4s ease; padding:20px; box-sizing:border-box; }
      #muenba-capture-overlay.open { display:flex; background:rgba(0,0,0,.86); }
      #muenba-capture-overlay.danger.open { background:rgba(90,0,12,.9); animation:muenbaDangerFlash .38s steps(2,end) infinite; }
      #muenba-capture-overlay.open .muenba-lobby-box { transform:scale(1); opacity:1; }
      @keyframes muenbaDangerFlash { 0%,100% { box-shadow:inset 0 0 0 rgba(238,36,63,0); } 50% { box-shadow:inset 0 0 120px rgba(238,36,63,.32); } }
      .muenba-danger-box { border-color:rgba(255,82,96,.82) !important; box-shadow:0 24px 80px rgba(0,0,0,.82),0 0 70px rgba(235,28,57,.35),inset 0 0 70px rgba(98,0,12,.46) !important; }
      .muenba-danger-box .muenba-danger-eyebrow { color:#ff8290; }
      .muenba-danger-box .muenba-rhythm-lane { border-color:rgba(255,93,104,.68); background:linear-gradient(180deg,rgba(100,21,31,.74),rgba(24,5,10,.92)); }
      .muenba-danger-box .muenba-rhythm-lane:hover, .muenba-danger-box .muenba-rhythm-lane:focus-visible { border-color:#ff9aa4; background:linear-gradient(180deg,rgba(142,29,42,.82),rgba(32,5,11,.96)); }
      .muenba-danger-box .muenba-rhythm-lane:active { background:rgba(177,35,50,.86); }
      .muenba-danger-box .muenba-rhythm-hit-line { background:#ffb0b8; box-shadow:0 0 18px rgba(255,56,78,.92); }
      .muenba-danger-box .muenba-rhythm-note { border-color:#ffd5d9; background:rgba(173,34,52,.95); box-shadow:0 0 18px rgba(255,55,81,.58); }
      .muenba-danger-box .muenba-rhythm-note-kat { background:rgba(113,30,88,.95); box-shadow:0 0 18px rgba(244,65,149,.5); }
      .muenba-danger-box .muenba-rhythm-note.is-hit { border-color:#b9ffcb; }
      .muenba-danger-box .muenba-rhythm-note.is-miss { border-color:#ff7180; background:rgba(83,7,19,.8); }
      .muenba-capture-orbs { margin-top:-6px; color:#9ccbb6; font-size:.82rem; letter-spacing:.05em; }
      .muenba-capture-action { touch-action:manipulation; }
      .muenba-rhythm-status { min-height:1.5em; margin:2px 0 2px !important; color:#d8f2e2 !important; font:700 1.08rem/1.4 ui-monospace,monospace !important; text-align:center !important; letter-spacing:.08em; }
      .muenba-rhythm-status.perfect, .muenba-rhythm-status.good, .muenba-rhythm-status.go { color:#8fe0ad !important; }
      .muenba-rhythm-status.miss, .muenba-rhythm-status.early { color:#e8b0b8 !important; }
      .muenba-rhythm-accuracy { margin:0 0 7px !important; color:#9ccbb6 !important; font:700 .72rem/1.4 ui-monospace,monospace !important; text-align:center !important; letter-spacing:.08em; }
      .muenba-rhythm-board { position:relative; display:grid; grid-template-columns:1fr 1fr; gap:8px; height:250px; margin:8px 0 6px; }
      .muenba-rhythm-lane { position:relative; min-width:0; height:250px; overflow:hidden; padding:0; border:1px solid rgba(156,203,182,.35); border-radius:14px; color:#dcefe4; background:linear-gradient(180deg,rgba(25,55,44,.58),rgba(5,15,12,.86)); cursor:pointer; touch-action:none; user-select:none; }
      .muenba-rhythm-lane:hover, .muenba-rhythm-lane:focus-visible { border-color:rgba(156,203,182,.8); background:linear-gradient(180deg,rgba(42,88,67,.68),rgba(7,22,17,.92)); outline:none; }
      .muenba-rhythm-lane:active { background:rgba(57,110,82,.76); }
      .muenba-rhythm-lane-label { position:absolute; z-index:4; left:0; right:0; top:9px; color:#aacdbb; font:700 .68rem/1.2 ui-monospace,monospace; letter-spacing:.08em; pointer-events:none; }
      .muenba-rhythm-rail { position:absolute; inset:29px 0 0; pointer-events:none; }
      .muenba-rhythm-hit-line { position:absolute; z-index:5; left:8px; right:8px; top:218px; height:3px; border-radius:99px; background:rgba(218,249,229,.8); box-shadow:0 0 14px rgba(143,220,178,.72); pointer-events:none; }
      .muenba-rhythm-note { position:absolute; z-index:3; left:50%; top:0; display:grid; place-items:center; width:42px; height:42px; border:2px solid rgba(220,248,231,.92); border-radius:50%; color:#f0fff5; background:rgba(44,105,76,.92); box-shadow:0 0 16px rgba(112,214,151,.42); font:900 1.1rem/1 ui-monospace,monospace; will-change:transform; }
      .muenba-rhythm-note-kat { border-radius:10px; background:rgba(75,72,126,.92); box-shadow:0 0 16px rgba(144,137,221,.4); }
      .muenba-rhythm-note.is-resolved { opacity:.14; box-shadow:none; }
      .muenba-rhythm-note.is-hit { opacity:.94; border-color:#8fe0ad; }
      .muenba-rhythm-note.is-miss { opacity:.18; border-color:#e8b0b8; background:rgba(120,48,64,.65); box-shadow:none; }
      .muenba-rhythm-hint { margin:7px 0 13px !important; color:#8fa89b !important; font-size:.73rem !important; line-height:1.45 !important; text-align:center !important; }
      .muenba-orb-release-list { display:flex; justify-content:center; align-items:center; gap:12px; min-height:52px; margin:5px 0 8px; }
      .muenba-orb-release { display:grid; place-items:center; width:38px; height:38px; color:#dfffea; border:1px solid rgba(181,238,202,.75); border-radius:50%; background:radial-gradient(circle,rgba(113,206,153,.72),rgba(30,83,59,.68)); box-shadow:0 0 22px rgba(113,206,153,.58); font-size:1.45rem; animation:muenbaOrbRelease .42s cubic-bezier(.2,1.5,.4,1) both; }
      @keyframes muenbaOrbRelease { from { opacity:0; transform:translateY(12px) scale(.35); } to { opacity:1; transform:translateY(0) scale(1); } }
      .muenba-orb-release-status { margin:0 0 18px !important; color:#9ccbb6 !important; font:700 .76rem/1.4 ui-monospace,monospace !important; text-align:center !important; letter-spacing:.05em; }
      @media (prefers-reduced-motion: reduce) { .muenba-orb-release { animation:none; } }
      @media (prefers-reduced-motion: reduce) { #muenba-fade, .muenba-return-box, #muenba-return-overlay, .muenba-lobby-box, #muenba-lobby-overlay, #muenba-capture-overlay { transition:none !important; } .muenba-lobby-portrait { animation:none !important; } }
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
    buildNuppiLobbyOverlay();
    buildCaptureOverlay();

    hideBtn = document.createElement('button');
    hideBtn.id = 'muenba-hide';
    hideBtn.type = 'button';
    hideBtn.textContent = 'Hide';
    hideBtn.addEventListener('click', toggleHide);
    document.body.appendChild(hideBtn);

    const dev = document.createElement('div');
    dev.id = 'muenba-dev';
    dev.innerHTML = '<strong>MUENBA DEV</strong><br><span id="muenba-dev-text"></span><br><button id="muenba-dev-coords" type="button">COORDS OFF</button> <button id="muenba-dev-rhythm" type="button">RHYTHM TEST</button><div class="muenba-dev-small">Coords ON: click to pin, movement paused</div><div id="muenba-dev-arrows" class="muenba-dev-arrows"></div>';
    document.body.appendChild(dev);
    devReadout = document.getElementById('muenba-dev-text');
    devCoordToggle = document.getElementById('muenba-dev-coords');
    devArrowList = document.getElementById('muenba-dev-arrows');
    document.getElementById('muenba-dev-rhythm').addEventListener('click', openDevRhythmTest);
    devCoordToggle.classList.toggle('active', state.coordMode);
    devCoordToggle.textContent = state.coordMode ? 'COORDS ON' : 'COORDS OFF';
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

    // Muenba is a landscape world like Karasuki and Utsuroba. In portrait,
    // cover-scaling would hide the side exits, so give the player a clear
    // orientation prompt instead of leaving a partially playable room.
    const rotateOverlay = document.createElement('div');
    rotateOverlay.id = 'muenba-rotate-overlay';
    rotateOverlay.innerHTML = '<span class="muenba-rotate-phone" aria-hidden="true"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.4"></rect><line x1="11" y1="18.4" x2="13" y2="18.4"></line></svg></span><div class="muenba-rotate-bar"></div><p class="muenba-rotate-title">Turn your device sideways!</p><p class="muenba-rotate-sub">ムエンバは<strong style="color:#a7e1c5">横画面</strong>で遊べるよ。<br>スマホを横にしてね。</p>';
    document.body.appendChild(rotateOverlay);

    atmosphereCtx = atmosphereCanvas.getContext('2d');
    actorCtx = actorCanvas.getContext('2d');
  }

  function openDevRhythmTest() {
    if (!DEV_MODE || captureOpen || lobbyOpen || returnPortalOpen) return;
    const ghost = activeGhost?.ghost || GHOSTS[0];
    if (!ghost) return;
    state.captureResolving = true;
    beginCaptureSession(ghost);
  }

  function resizeCanvas() {
    // Two full-world canvases at DPR 2 are unnecessarily expensive on many
    // touch devices. DPR 1.5 keeps the fixed stage clean while cutting the
    // backing-store pixels substantially; desktop/high-density screens retain
    // the sharper DPR 2 path.
    const maxDpr = TOUCH_DEVICE ? 1.5 : 2;
    const dpr = Math.min(maxDpr, Math.max(1, window.devicePixelRatio || 1));
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
    const gradient = vctx.createRadialGradient(CENTER_X, CENTER_Y, 280, CENTER_X, CENTER_Y, 860);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.56, 'rgba(0,0,0,.02)');
    gradient.addColorStop(0.72, 'rgba(0,0,0,.10)');
    gradient.addColorStop(0.88, 'rgba(0,0,0,.30)');
    gradient.addColorStop(1, 'rgba(0,0,0,.58)');
    vctx.fillStyle = gradient;
    vctx.fillRect(0, 0, WORLD_W, WORLD_H);

    fogTexture = document.createElement('canvas');
    fogTexture.width = 640;
    fogTexture.height = 180;
    const fctx = fogTexture.getContext('2d');
    const fogGradient = fctx.createRadialGradient(320, 90, 4, 320, 90, 310);
    fogGradient.addColorStop(0, 'rgba(190,215,216,.30)');
    fogGradient.addColorStop(.42, 'rgba(170,205,210,.16)');
    fogGradient.addColorStop(1, 'rgba(170,205,210,0)');
    fctx.fillStyle = fogGradient;
    fctx.fillRect(0, 0, fogTexture.width, fogTexture.height);

    // A flatter, lower bank gives the corridor some depth without introducing
    // a per-frame particle system. It is deliberately softer than the main
    // fog texture so Booha and the exit hotspots remain readable through it.
    lowFogTexture = document.createElement('canvas');
    lowFogTexture.width = 720;
    lowFogTexture.height = 140;
    const lowCtx = lowFogTexture.getContext('2d');
    const lowGradient = lowCtx.createLinearGradient(0, 0, 0, lowFogTexture.height);
    lowGradient.addColorStop(0, 'rgba(170,205,210,0)');
    lowGradient.addColorStop(.34, 'rgba(170,205,210,.08)');
    lowGradient.addColorStop(.72, 'rgba(190,215,216,.18)');
    lowGradient.addColorStop(1, 'rgba(170,205,210,0)');
    lowCtx.fillStyle = lowGradient;
    lowCtx.fillRect(0, 0, lowFogTexture.width, lowFogTexture.height);
    [120, 350, 590].forEach((x, index) => {
      const bank = lowCtx.createRadialGradient(x, 78, 6, x, 78, 150 + index * 18);
      bank.addColorStop(0, 'rgba(205,225,222,.16)');
      bank.addColorStop(.58, 'rgba(180,210,212,.07)');
      bank.addColorStop(1, 'rgba(180,210,212,0)');
      lowCtx.fillStyle = bank;
      lowCtx.beginPath();
      lowCtx.ellipse(x, 78, 150 + index * 18, 42, 0, 0, Math.PI * 2);
      lowCtx.fill();
    });
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
      const t = REDUCED_MOTION ? 0 : (now - m.startedAt) / 1000;
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
    state.hiding = false;
    state.captureResolving = false;
    if (hideBtn) { hideBtn.classList.remove('active'); hideBtn.textContent = 'Hide'; }
    markMuenbaRoomVisited(roomId);
    spawnRoomGhost(roomId);
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

  function clampToWorld(x, y, radius = GHOST_R) {
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
    if (canMoveTo(point.x, point.y)) {
      state.x = point.x;
      state.y = point.y;
      return true;
    }
    const horizontal = clampToWorld(x, state.y, BOOHA_R);
    if (canMoveTo(horizontal.x, horizontal.y)) {
      state.x = horizontal.x;
      state.y = horizontal.y;
      return true;
    }
    const vertical = clampToWorld(state.x, y, BOOHA_R);
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
    if (!REDUCED_MOTION && moved && now % 240 < 30) state.fogX += .15;
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

  // ── Player name helper (Pass 3b) ────────────────────────────────────────
  // muenba.html doesn't load karasuki.js or any of the blitz files, so the
  // getBoohaFirstName()/getPlayerName() helpers those files already define
  // aren't reachable here. This reads the exact same localStorage keys
  // js/token.js writes (which muenba.html DOES load), rather than pulling
  // in a whole extra script just for one string.
  function getPlayerFirstName() {
    try {
      const direct = localStorage.getItem('booha_first_name');
      if (direct) return direct.charAt(0).toUpperCase() + direct.slice(1).toLowerCase().slice(0, 12);
      const full = localStorage.getItem('booha_user_name') || '';
      const first = full.split(' ')[0].slice(0, 12);
      return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
    } catch (_) {
      return '';
    }
  }

  // ── Nuppi's lobby welcome ────────────────────────────────────────────────
  // Same themed-popup pattern as the return portal above, not a new screen.
  // Per the locked decision, this shows every time the player enters
  // Muenba (not just the first time), in a warm-guide tone, addressing the
  // player by name when one is on file. The welcome beat hands off to a
  // larger case-board beat, which ends on the real Start button.
  function buildNuppiLobbyOverlay() {
    if (lobbyOverlay) return;
    lobbyOverlay = document.createElement('div');
    lobbyOverlay.id = 'muenba-lobby-overlay';
    document.body.appendChild(lobbyOverlay);
    renderNuppiWelcome();
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && lobbyOpen) closeNuppiLobby();
    });
  }

  function renderNuppiWelcome() {
    if (!lobbyOverlay) return;
    const name = getPlayerFirstName();
    const greetEn = name ? `${name}, there you are.` : 'There you are.';
    const greetJp = name ? `${name}……ようこそ。` : 'ようこそ。';
    lobbyOverlay.innerHTML = `
      <div class="muenba-lobby-box">
        <img class="muenba-lobby-portrait" src="assets/img/wanderers/nuppi-2.png" alt="Nuppi">
        <h2>Nuppi</h2>
        <p class="jp">ヌッピ</p>
        <p>${greetEn}</p>
        <p class="jp-line">${greetJp}</p>
        <p>Somewhere among these fifteen rooms, a ghost is hiding. Some won't notice you at all, while others will come looking. If one gets close, you can hide until it loses interest. When you see one, walk up and give it a tap.</p>
        <p class="jp-line">この15の<ruby>部屋<rt>へや</rt></ruby>のどこかに、<ruby>幽霊<rt>ゆうれい</rt></ruby>が<ruby>隠<rt>かく</rt></ruby>れているよ。<ruby>気<rt>き</rt></ruby>づかない<ruby>幽霊<rt>ゆうれい</rt></ruby>もいれば、<ruby>探<rt>さが</rt></ruby>しに<ruby>来<rt>く</rt></ruby>る<ruby>幽霊<rt>ゆうれい</rt></ruby>もいる。<ruby>近<rt>ちか</rt></ruby>づかれたら、<ruby>隠<rt>かく</rt></ruby>れて<ruby>興味<rt>きょうみ</rt></ruby>をなくすのを<ruby>待<rt>ま</rt></ruby>とう。<ruby>見<rt>み</rt></ruby>つけたら、<ruby>近<rt>ちか</rt></ruby>づいてそっとタップしてみて。</p>
        <div class="muenba-lobby-actions">
          <button id="muenba-lobby-begin" type="button">Let's begin</button>
        </div>
      </div>`;
    lobbyOverlay.querySelector('#muenba-lobby-begin').addEventListener('click', renderNuppiCaseBoard);
    focusLobbyControl('#muenba-lobby-begin');
  }

  function renderNuppiCaseBoard() {
    if (!lobbyOverlay) return;
    lobbyOverlay.innerHTML = `
      <div class="muenba-lobby-box is-case-board">
        <img class="muenba-lobby-portrait" src="assets/img/wanderers/nuppi-2.png" alt="Nuppi">
        <div class="muenba-case-board-eyebrow">CASE DESK / NUPPI</div>
        <h2>Nuppi's case board</h2>
        <p class="jp">ヌッピの<ruby>事件<rt>じけん</rt></ruby>ボード</p>
        <section class="muenba-lobby-case-board" aria-labelledby="muenba-case-board-title">
          <h3 id="muenba-case-board-title"></h3>
          <p id="muenba-case-board-copy" class="muenba-case-board-copy"></p>
          <p id="muenba-case-board-jp" class="muenba-case-direction-jp"></p>
        </section>
        <div class="muenba-lobby-actions">
          <button id="muenba-case-board-start" type="button">Start</button>
        </div>
      </div>`;
    refreshNuppiCaseBoard();
    lobbyOverlay.querySelector('#muenba-case-board-start').addEventListener('click', () => {
      closeNuppiLobby();
      if (readMuenba().orbsPending > 0) openPendingOrbRecovery();
    });
    focusLobbyControl('#muenba-case-board-start');
  }

  function focusLobbyControl(selector) {
    window.setTimeout(() => {
      const control = lobbyOverlay && lobbyOverlay.querySelector(selector);
      if (control && typeof control.focus === 'function') control.focus();
    }, 0);
  }

  function refreshNuppiCaseBoard() {
    if (!lobbyOverlay) return;
    const title = lobbyOverlay.querySelector('#muenba-case-board-title');
    const copy = lobbyOverlay.querySelector('#muenba-case-board-copy');
    const jp = lobbyOverlay.querySelector('#muenba-case-board-jp');
    if (!title || !copy || !jp) return;
    const next = nextMuenbaCase();
    if (next) {
      const ghost = (DATA.ghosts || []).find(candidate => candidate.id === next.ghostId);
      const ghostName = ghost ? ghost.name : next.ghostId;
      title.textContent = next.title;
      copy.textContent = `Case ready. Find ${ghostName} and untangle its energy.`;
      jp.innerHTML = '<ruby>事件<rt>じけん</rt></ruby>の<ruby>準備<rt>じゅんび</rt></ruby>ができたよ。<ruby>幽霊<rt>ゆうれい</rt></ruby>を<ruby>探<rt>さが</rt></ruby>して、エネルギーを<ruby>解<rt>と</rt></ruby>こう。';
    } else {
      title.textContent = 'The case board is quiet.';
      copy.textContent = 'Nuppi is waiting for the next strange ghost.';
      jp.innerHTML = '<ruby>事件<rt>じけん</rt></ruby>ボードは<ruby>静<rt>しず</rt></ruby>かだよ。<ruby>次<rt>つぎ</rt></ruby>の<ruby>変<rt>へん</rt></ruby>な<ruby>幽霊<rt>ゆうれい</rt></ruby>を<ruby>待<rt>ま</rt></ruby>っているよ。';
    }
  }

  function openNuppiLobby() {
    if (lobbyOpen || !lobbyOverlay) return;
    lobbyOpen = true;
    state.clickTarget = null;
    state.moving = false;
    renderNuppiWelcome();
    refreshNuppiCaseBoard();
    lobbyOverlay.classList.add('open');
  }

  // Pass 9I: the entry drift is part of Muenba's arrival beat. Wait until
  // Booha has reached the center before opening Nuppi's lobby so the modal
  // cannot hide or pause a player who is still locked at the doorway spawn.
  function openNuppiLobbyAfterEntry() {
    if (!entryDrift) {
      openNuppiLobby();
      return;
    }
    const waitForArrival = () => {
      if (!entryDrift) openNuppiLobby();
      else window.requestAnimationFrame(waitForArrival);
    };
    window.requestAnimationFrame(waitForArrival);
  }

  function closeNuppiLobby() {
    lobbyOpen = false;
    if (lobbyOverlay) lobbyOverlay.classList.remove('open');
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
      const distanceToExit = Math.hypot(state.x - exit.x, state.y - exit.y);
      const proximity = Math.max(0, Math.min(1, 1 - distanceToExit / (NPP_RADIUS * 5)));
      const angle = DIR_ANGLE[exit.dir] || 0;
      // Two overlapping sine waves (instead of one smooth pulse) read as an
      // unsteady, slightly ghostly flicker rather than a mechanical glow.
      const flicker = REDUCED_MOTION
        ? .78
        : .68 + .2 * Math.sin(seconds * 1.9 + index) + .12 * Math.sin(seconds * 6.3 + index * 2.4);
      const bounce = REDUCED_MOTION ? 0 : Math.sin(seconds * 1.5 + index) * 4.5;
      const x = exit.x + Math.cos(angle) * bounce;
      const y = exit.y + Math.sin(angle) * bounce;

      // Faint spectral trail behind the arrowhead — two small dots, no
      // extra gradients, cheap.
      actorCtx.save();
      actorCtx.translate(x, y);
      actorCtx.rotate(angle);
      for (let t = 1; t <= 2; t++) {
        actorCtx.globalAlpha = fade * flicker * ((.18 + proximity * .08) / t);
        actorCtx.fillStyle = `rgb(${glowStr})`;
        actorCtx.beginPath();
        actorCtx.arc(-t * 10, 0, 3.5 - t * .8, 0, Math.PI * 2);
        actorCtx.fill();
      }
      actorCtx.restore();

      // Pass 9C: a small eerie chevron replaces the old large filled circle.
      // The glow is local to the stroke, while NPP_RADIUS remains generous so
      // the visual can be atmospheric without making the exit hard to use.
      actorCtx.save();
      actorCtx.translate(x, y);
      actorCtx.rotate(angle);
      // Two light strokes make the small arrow survive the room fog: a broad
      // low-alpha aura underneath, then a thin bright core on top. The arrow
      // grows clearer as Booha approaches the actual 42px exit hotspot.
      actorCtx.globalAlpha = fade * (.24 + flicker * .14 + proximity * .12);
      actorCtx.strokeStyle = `rgba(${glowStr},.9)`;
      actorCtx.shadowColor = `rgba(${glowStr},.65)`;
      actorCtx.shadowBlur = 11;
      actorCtx.lineWidth = 3.6;
      actorCtx.lineCap = 'round';
      actorCtx.lineJoin = 'round';
      actorCtx.beginPath();
      actorCtx.moveTo(-11, -7);
      actorCtx.lineTo(0, 0);
      actorCtx.lineTo(-11, 7);
      actorCtx.stroke();

      actorCtx.shadowBlur = 0;
      actorCtx.globalAlpha = fade * (.62 + flicker * .22 + proximity * .14);
      actorCtx.strokeStyle = `rgba(${coreStr},.98)`;
      actorCtx.lineWidth = 1.8;
      actorCtx.beginPath();
      actorCtx.moveTo(-11, -7);
      actorCtx.lineTo(0, 0);
      actorCtx.lineTo(-11, 7);
      actorCtx.stroke();

      // A tiny bright point at the tip gives the arrow a living center without
      // bringing back a conspicuous circular UI marker.
      actorCtx.shadowBlur = 0;
      actorCtx.globalAlpha = fade * (.58 + flicker * .22 + proximity * .12);
      actorCtx.fillStyle = `rgb(${coreStr})`;
      actorCtx.beginPath();
      actorCtx.arc(0, 0, 1.7 + flicker * .7, 0, Math.PI * 2);
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
    // Hiding (Pass 7) reads visually as faded and slightly smaller —
    // "crouching out of sight" rather than vanishing outright, since the
    // player can still see themselves and knows they're still there.
    const hidingFade = state.hiding ? .4 : 1;
    actorCtx.save();
    actorCtx.globalAlpha = (.18 + pulse * .08) * hidingFade;
    actorCtx.fillStyle = 'rgba(180,220,215,.55)';
    actorCtx.beginPath();
    actorCtx.ellipse(state.x, state.y + BOOHA_R * .88, BOOHA_R * .78, BOOHA_R * .27, 0, 0, Math.PI * 2);
    actorCtx.fill();
    actorCtx.restore();
    actorCtx.save();
    actorCtx.translate(x, y);
    actorCtx.rotate(wobble * Math.PI / 180);
    actorCtx.globalAlpha = .96 * hidingFade;
    if (state.hiding) actorCtx.scale(.82, .82);
    const boohaSprite = state.hiding ? hidingImg : ghostImg;
    if (boohaSprite.complete && boohaSprite.naturalWidth > 0) {
      actorCtx.drawImage(boohaSprite, -BOOHA_R, -BOOHA_R, BOOHA_R * 2, BOOHA_R * 2);
    } else {
      actorCtx.fillStyle = '#ffe56d';
      actorCtx.beginPath();
      actorCtx.arc(0, 0, BOOHA_R * .72, 0, Math.PI * 2);
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
      if (!REDUCED_MOTION) state.fogX = (state.fogX + .12) % 780;
      const mood = FOG_MOODS[profile.fogMood] || FOG_MOODS.low;
      const fogMotion = state.fogX * mood.speed * mood.direction;
      const fogPulse = REDUCED_MOTION ? .90 : .86 + .14 * Math.sin(now / 2600 + mood.phase);
      const fogAlpha = profile.fog * fogPulse;
      const slowDrift = fogMotion * .46;
      atmosphereCtx.save();
      // Distant haze: room moods change its height, strength, and direction.
      atmosphereCtx.globalAlpha = fogAlpha * mood.upper;
      atmosphereCtx.drawImage(fogTexture, -700 + slowDrift, mood.upperY, 900, 230);
      atmosphereCtx.globalAlpha = fogAlpha * mood.middle;
      atmosphereCtx.drawImage(fogTexture, 140 - slowDrift * 1.35, mood.middleY, 820, 190);

      // Near-ground bank: a second cached texture moving at a different rate
      // makes the room feel alive without the cost of many individual motes.
      if (lowFogTexture) {
        atmosphereCtx.globalAlpha = fogAlpha * mood.low;
        atmosphereCtx.drawImage(lowFogTexture, -110 + fogMotion, 620, 980, 170);
        atmosphereCtx.globalAlpha = fogAlpha * mood.echo;
        atmosphereCtx.drawImage(lowFogTexture, 760 - fogMotion * .72, 510, 760, 150);
      }
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

  function getDevQaSummary() {
    const scale = Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    const visibleWorldWidth = window.innerWidth / scale;
    const visibleWorldHeight = window.innerHeight / scale;
    const cropX = Math.max(0, (WORLD_W - visibleWorldWidth) / 2);
    const cropY = Math.max(0, (WORLD_H - visibleWorldHeight) / 2);
    const exits = getRoom().exits || [];
    const exitStatus = exits.length
      ? exits.map(exit => {
          const visible = exit.x >= cropX && exit.x <= cropX + visibleWorldWidth
            && exit.y >= cropY && exit.y <= cropY + visibleWorldHeight;
          return `${exit.dir}:${visible ? 'OK' : 'OFF'}`;
        }).join(' ')
      : 'none';
    const profile = getRoom().atmosphere || {};
    const orientation = window.innerWidth >= window.innerHeight ? 'LANDSCAPE' : 'PORTRAIT';
    const rotateWarning = orientation === 'PORTRAIT' && window.innerWidth <= 1023 ? ' ROTATE' : '';
    const dpr = atmosphereCanvas ? (atmosphereCanvas.width / WORLD_W).toFixed(2) : '?';
    return `QA ${window.innerWidth}x${window.innerHeight} ${orientation}${rotateWarning}\nscale:${scale.toFixed(3)} crop:${Math.round(cropX)},${Math.round(cropY)} dpr:${dpr} hit:${NPP_RADIUS}\nfog:${profile.fogMood || '—'} exits:${exitStatus}`;
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

  function drawDangerFlash(now) {
    if (now >= state.dangerFlashUntil) return;
    const remaining = state.dangerFlashUntil - now;
    const pulse = .5 + .5 * Math.sin(now / 48);
    const alpha = Math.min(.34, .12 + pulse * .12, remaining / 260);
    actorCtx.save();
    actorCtx.fillStyle = `rgba(190, 12, 35, ${Math.max(.04, alpha)})`;
    actorCtx.fillRect(0, 0, WORLD_W, WORLD_H);
    actorCtx.strokeStyle = `rgba(255, 88, 103, ${.18 + pulse * .18})`;
    actorCtx.lineWidth = 10;
    actorCtx.strokeRect(6, 6, WORLD_W - 12, WORLD_H - 12);
    actorCtx.restore();
  }

  function drawFrame(now) {
    atmosphereCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    actorCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    drawAtmosphere(now);
    drawReturnPortal(now);
    drawExitArrows(now);
    drawGhost(now);
    drawBooha(now);
    drawDangerFlash(now);
    drawPins();
    if (DEV_MODE && devReadout) {
      const hover = devHover ? `  mouse:${Math.round(devHover.x)},${Math.round(devHover.y)}` : '';
      const ghostInfo = activeGhost ? `  ghost:${activeGhost.ghost.id}(${activeGhost.behavior}${activeGhost.chasing ? '*chasing*' : ''}${activeGhost.teleporting ? '*teleporting*' : ''})` : '';
      devReadout.textContent = `${state.roomId}  player:${Math.round(state.x)},${Math.round(state.y)}${hover}${ghostInfo}\n${getDevQaSummary()}`;
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
    if (state.transitioning || state.inputLocked || returnPortalOpen || lobbyOpen || captureOpen || state.hiding) return;
    const point = stagePoint(clientX, clientY);
    if (DEV_MODE && state.coordMode) {
      dropPin(point.x, point.y);
      return;
    }
    if (clickCheckReturnPortal(point.x, point.y)) return;
    if (clickCheckGhost(point.x, point.y)) return;
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
    // Entry drift must continue independently of overlays. The lobby now
    // waits for it on initial arrival, but this guard also protects any future
    // handoff that opens a modal during the same arrival window.
    const drifting = !state.transitioning && tickEntryDrift(now);
    if (!state.transitioning && !returnPortalOpen && !lobbyOpen && !captureOpen) {
      if (!drifting && !state.inputLocked) {
        if (!state.hiding) {
          handleMovement(now);
          const exit = getAvailableExit(now);
          if (exit) transitionTo(exit);
          checkReturnPortalProximity(now);
        }
        tickGhost(now);
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
    validateCaseData();
    injectStyles();
    buildApp();
    fitStage();
    resizeCanvas();
    setRoom(state.roomId, state.spawnId, null);
    bindInput();
    window.addEventListener('resize', () => { fitStage(); resizeCanvas(); });
    window.requestAnimationFrame(tick);
    openNuppiLobbyAfterEntry();
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
