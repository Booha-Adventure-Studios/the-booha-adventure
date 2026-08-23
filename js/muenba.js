/*
 * Muenba world shell — navigation, atmosphere, Nuppi's lobby briefing, and
 * the briefing Q&A gate that reveals the day's target ghost. Ghost AI
 * (ignore vs. chase), hiding, click-to-attempt capture, the rhythm game,
 * and durable Muenba save/progress still belong to later passes.
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
    returnExiting: false,
    targetGhost: null
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
  let lobbyOverlay = null;
  let lobbyOpen = false;
  let briefingOverlay = null;
  let briefingOpen = false;
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

  // The first 5 hunt-able ghosts (Pass 4) now live in muenba-data.js
  // (Pass 5) so muenba-profile.html's case-file roster reads the exact
  // same list instead of a second hand-kept copy — see muenba-data.js for
  // the tinklet/"Tinkley" naming note.
  const GHOSTS = DATA.ghosts || [];
  const ANGRY_CHANGE_IMG = DATA.ghostAngryChangeImg || '';

  const ghostImg = new Image();
  ghostImg.src = 'assets/img/booha_ghost.png';
  // Reusing Nuppi's existing wandering-NPC art from Karasuki (same asset
  // path, no new files) rather than a new character for the lobby host.
  const nuppiLobbyImg = new Image();
  nuppiLobbyImg.src = 'assets/img/wanderers/nuppi-2.png';
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

  /* ═══════════════════════════════════════════════════════════════════
     SAVE LAYER (Pass 6)
     Durable Muenba progress — ghosts found, orbs collected, briefings
     passed, rooms visited, today's target ghost, and a rhythm-game stat
     bucket for Pass 8. Mirrors utsuroba.js's own loadSave()/writeSave()/
     migrate*Save() idiom — one top-level data.muenba section, defensive
     shape-fill on every load, single dirty-flag write-back — rather than
     inventing a different pattern for this world. Capture/orb fields
     exist here but nothing writes to them yet; that's Pass 7/8. This
     pass just gives Pass 4's in-memory-only state.targetGhost, and the
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
    if (!Number.isInteger(mu.briefingsPassed)) { mu.briefingsPassed = 0; dirty = true; }
    if (!mu.visitedRooms || typeof mu.visitedRooms !== 'object') { mu.visitedRooms = {}; dirty = true; }
    if (!mu.huntJournal || typeof mu.huntJournal !== 'object') {
      mu.huntJournal = { entries: [] };
      dirty = true;
    } else if (!Array.isArray(mu.huntJournal.entries)) {
      mu.huntJournal.entries = [];
      dirty = true;
    }
    if (!mu.rhythm || typeof mu.rhythm !== 'object') {
      mu.rhythm = { bestAccuracy: 0, attempts: 0 };
      dirty = true;
    }
    if (mu.targetGhost != null &&
        (typeof mu.targetGhost !== 'object' || typeof mu.targetGhost.id !== 'string')) {
      mu.targetGhost = null;
      dirty = true;
    }
    if (dirty) writeSave(data);
    return data;
  }

  function readMuenba() {
    return loadSave().muenba || {};
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
      /* Nuppi's lobby briefing — same dark-cemetery popup language as the
         return prompt, just roomier: it holds a portrait plus a few lines
         of text instead of a one-line question. Shows every time the
         player enters Muenba (Pass 3b). */
      #muenba-lobby-overlay { position:fixed; inset:0; z-index:210; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0); transition:background .4s ease; padding:20px; box-sizing:border-box; }
      #muenba-lobby-overlay.open { display:flex; background:rgba(0,0,0,.86); }
      .muenba-lobby-box { box-sizing:border-box; width:min(480px,100%); max-height:calc(100vh - 40px); overflow-y:auto; padding:28px 26px 26px; border:1px solid rgba(111,166,145,.45); border-radius:18px; background:linear-gradient(155deg,rgba(8,27,20,.97),rgba(1,4,4,.98)); box-shadow:0 24px 70px rgba(0,0,0,.75),0 0 55px rgba(16,65,45,.28),inset 0 0 70px rgba(0,0,0,.58); text-align:center; font-family:Georgia,'Times New Roman',serif; color:#e0eee8; transform:scale(.94); opacity:0; transition:transform .32s cubic-bezier(.34,1.56,.64,1),opacity .26s ease; }
      #muenba-lobby-overlay.open .muenba-lobby-box { transform:scale(1); opacity:1; }
      .muenba-lobby-portrait { display:block; width:96px; height:96px; object-fit:contain; margin:0 auto 12px; filter:drop-shadow(0 0 16px rgba(122,180,151,.3)); }
      .muenba-lobby-box h2 { margin:0 0 4px; font-size:1.2rem; font-weight:400; letter-spacing:.06em; text-transform:uppercase; }
      .muenba-lobby-box .jp { margin:0 0 16px; color:#aac2b5; font-size:.85rem; letter-spacing:.1em; text-align:center; }
      .muenba-lobby-box p { margin:0 0 14px; color:#c5d8cd; font-size:.92rem; line-height:1.65; text-align:left; }
      .muenba-lobby-box p.jp-line { color:#8fa89b; font-size:.82rem; }
      .muenba-lobby-box p:last-of-type { margin-bottom:20px; }
      .muenba-lobby-actions { display:flex; justify-content:center; margin-top:4px; }
      #muenba-lobby-begin { border:1px solid rgba(156,203,182,.7); color:#e0f4e9; background:rgba(52,104,78,.28); box-shadow:0 0 16px rgba(93,162,124,.22); border-radius:999px; padding:10px 28px; font:700 12px ui-monospace,monospace; letter-spacing:.05em; cursor:pointer; }
      #muenba-lobby-begin:hover, #muenba-lobby-begin:focus-visible { background:rgba(52,104,78,.44); outline:none; }
      /* Briefing Q&A gate (Pass 4) — same overlay/box shell as the lobby
         briefing, just holding a quiz card or the target-ghost reveal
         instead of static copy. Not dismissible by clicking the backdrop
         or Escape — it's a gate, not a message. */
      #muenba-briefing-overlay { position:fixed; inset:0; z-index:220; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0); transition:background .4s ease; padding:20px; box-sizing:border-box; }
      #muenba-briefing-overlay.open { display:flex; background:rgba(0,0,0,.88); }
      .muenba-briefing-box { text-align:left; }
      .muenba-briefing-box h2 { text-align:center; }
      .muenba-briefing-box > .jp { text-align:center; }
      .muenba-briefing-count { text-align:center; color:#8fa89b; font-size:.76rem; letter-spacing:.08em; text-transform:uppercase; margin:0 0 12px; }
      .muenba-briefing-box .muenba-briefing-prompt { font-size:1.15rem; text-align:center; color:#e8f2ec; margin:0 0 18px; line-height:1.5; }
      .muenba-briefing-choices { display:flex; flex-direction:column; gap:9px; margin-bottom:4px; }
      .muenba-briefing-choice { padding:11px 14px; border-radius:12px; border:1px solid rgba(156,203,182,.32); background:rgba(20,38,32,.5); color:#dcefe4; font:400 .92rem Georgia,'Times New Roman',serif; text-align:left; cursor:pointer; transition:transform .1s,background .2s,border-color .2s; }
      .muenba-briefing-choice:hover, .muenba-briefing-choice:focus-visible { background:rgba(52,104,78,.32); outline:none; }
      .muenba-briefing-choice.right { border-color:#5dd08c; background:rgba(56,180,110,.28); }
      .muenba-briefing-choice.wrong { border-color:#e0687e; background:rgba(200,70,90,.24); }
      .muenba-briefing-choice.dim { opacity:.4; }
      .muenba-briefing-ghost-portrait { display:block; width:120px; height:120px; object-fit:contain; margin:0 auto 14px; filter:drop-shadow(0 0 20px rgba(122,180,151,.35)); }
      @media (prefers-reduced-motion: reduce) { #muenba-fade, .muenba-return-box, #muenba-return-overlay, .muenba-lobby-box, #muenba-lobby-overlay, #muenba-briefing-overlay { transition:none !important; } }
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
    buildBriefingOverlay();

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
    markMuenbaRoomVisited(roomId);
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

  // ── Nuppi's lobby briefing (Pass 3b) ────────────────────────────────────
  // Same themed-popup pattern as the return portal above, not a new screen.
  // Per the locked decision, this shows every time the player enters
  // Muenba (not just the first time), in a warm-guide tone, addressing the
  // player by name when one is on file. It ends on a dismiss button —
  // Pass 4's briefing-question gate will later hook into that dismiss
  // point instead of dropping straight to free-roam.
  function buildNuppiLobbyOverlay() {
    if (lobbyOverlay) return;
    const name = getPlayerFirstName();
    const greetEn = name ? `${name}, there you are.` : 'There you are.';
    const greetJp = name ? `${name}……ようこそ。` : 'ようこそ。';
    lobbyOverlay = document.createElement('div');
    lobbyOverlay.id = 'muenba-lobby-overlay';
    lobbyOverlay.innerHTML = `
      <div class="muenba-lobby-box">
        <img class="muenba-lobby-portrait" src="assets/img/wanderers/nuppi-2.png" alt="Nuppi">
        <h2>Nuppi</h2>
        <p class="jp">ヌッピ</p>
        <p>${greetEn} I'm glad you made it back to Muenba.</p>
        <p class="jp-line">${greetJp} ムエンバへようこそ戻ってきたね。</p>
        <p>Somewhere among these fifteen rooms, a ghost is hiding. Some won't notice you at all — others will come looking, and if one gets close, you can hide until it loses interest. When you think you've spotted the right one, walk up and give it a tap.</p>
        <p class="jp-line">この15の部屋のどこかに、幽霊が隠れているよ。気づかない幽霊もいれば、追いかけてくる幽霊もいる。近づかれたら隠れて、興味をなくすのを待とう。これだと思ったら、そっと近づいてタップしてみて。</p>
        <div class="muenba-lobby-actions">
          <button id="muenba-lobby-begin" type="button">Let's begin</button>
        </div>
      </div>`;
    document.body.appendChild(lobbyOverlay);
    document.getElementById('muenba-lobby-begin').addEventListener('click', () => {
      closeNuppiLobby();
      openBriefingQuiz();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && lobbyOpen) closeNuppiLobby();
    });
  }

  function openNuppiLobby() {
    if (lobbyOpen || !lobbyOverlay) return;
    lobbyOpen = true;
    state.clickTarget = null;
    state.moving = false;
    lobbyOverlay.classList.add('open');
  }

  function closeNuppiLobby() {
    lobbyOpen = false;
    if (lobbyOverlay) lobbyOverlay.classList.remove('open');
  }

  // ── Briefing Q&A gate (Pass 4) ───────────────────────────────────────────
  // Nuppi's "answer a few questions" check, styled after daily-check.js's
  // own engine (seeded shuffle, this week's curriculum content, tap-only
  // choices) but run as its own short flow here — it deliberately does NOT
  // call into BoohaDailyCheck or touch its meta.checkIn/streak record,
  // since that's a separate feature students already see elsewhere. Runs
  // right after the lobby's "Let's begin" button, ends with Nuppi
  // revealing the day's target ghost, then releases the player to
  // free-roam. Matches the site's no-punishment ESL tone: a wrong answer
  // just reveals the right one and moves on, nothing blocks completion.
  const BRIEFING_TYPES = ['vocab', 'sentences', 'questions'];
  const BRIEFING_LEN = 4;
  const BRIEFING_CHOICES = 4;

  function _briHashStr(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function _briRng(seedStr) {
    let a = _briHashStr(seedStr) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function _briShuffle(arr, seedStr) {
    const r = _briRng(seedStr);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function _briTodayKey() {
    try {
      return window.CALENDAR && CALENDAR.getTodayKey ? CALENDAR.getTodayKey() : null;
    } catch (_) {
      return null;
    }
  }
  // Same localStorage key index.html/daily-check.js already write the
  // selected curriculum to — reused read-only here, no picker screen of
  // our own. Defaults to 'pb' only so DEV testing never hard-blocks before
  // a curriculum has been picked elsewhere; production players reaching
  // Muenba will always have this set already.
  function _briKnownCurr() {
    const c = localStorage.getItem('booha_last_curr');
    return (c === 'pb' || c === 'br' || c === 'bc') ? c : 'pb';
  }
  function _briWeekInfo() {
    try {
      const cw = CALENDAR.getCurrentCurriculumWeek();
      return { monthSlug: cw.monthSlug, weekNumber: Math.min(cw.weekNumber || 1, 4) };
    } catch (_) {
      return null;
    }
  }
  function _briSliceForWeek(cards, wk) {
    const lo = (wk - 1) * 15 + 1, hi = wk * 15;
    return (cards || []).filter(c => c.n >= lo && c.n <= hi);
  }

  async function _loadBriefingContent(curr) {
    const wi = _briWeekInfo();
    if (!wi) throw new Error('[Muenba] briefing: no week info available');
    const entries = await Promise.all(BRIEFING_TYPES.map(async type => {
      const url = `content/${curr}/${wi.monthSlug}/${type}.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`[Muenba] briefing: ${type} ${res.status}`);
      const data = await res.json();
      return [type, _briSliceForWeek(data.cards, wi.weekNumber)];
    }));
    const sets = {};
    entries.forEach(e => { sets[e[0]] = e[1]; });
    return { curr, sets };
  }

  // Mirrors daily-check.js's buildDay() quiz step: mixed pool of this
  // week's vocab/sentences/questions, seeded by today's date so the set is
  // stable across re-entries the same day, distractors drawn from the same
  // type as the answer so length alone never gives it away.
  function _buildBriefingQuiz(content) {
    const seedBase = (_briTodayKey() || 'nodate') + '|' + content.curr + '|muenbaBriefing';
    const promptKey = content.curr === 'pb' ? 'hira' : 'jp';
    const pool = [];
    BRIEFING_TYPES.forEach(type => {
      (content.sets[type] || []).forEach(c => pool.push({ ...c, _type: type }));
    });
    if (!pool.length) return [];
    const picked = _briShuffle(pool, seedBase).slice(0, Math.min(BRIEFING_LEN, pool.length));
    return picked.map(item => {
      const sameType = (content.sets[item._type] || []).filter(c => c.n !== item.n);
      const distractors = _briShuffle(sameType, seedBase + '|d' + item._type + item.n)
        .slice(0, Math.min(BRIEFING_CHOICES - 1, sameType.length));
      const choices = _briShuffle([item, ...distractors], seedBase + '|c' + item._type + item.n)
        .map(c => ({ n: c.n, label: c.en }));
      return {
        prompt: item[promptKey] || item.jp || item.en,
        answerN: item.n,
        choices
      };
    });
  }

  // Picked once per calendar day (not per entry) so re-entering Muenba the
  // same day keeps pointing at the same ghost rather than reshuffling on
  // every visit — the lobby greeting re-shows every entry, but the hunt
  // itself stays put until it's actually caught (Pass 7+).
  function _pickTargetGhost() {
    const seedBase = (_briTodayKey() || String(Math.random())) + '|muenbaTargetGhost';
    const r = _briRng(seedBase);
    const idx = Math.floor(r() * GHOSTS.length);
    return GHOSTS[idx];
  }

  // Pass 6: gives Pass 4's seeded-but-in-memory-only pick a real save
  // record, so a reload mid-hunt reloads the SAME target instead of
  // recomputing it. The seed is already deterministic per day on its own
  // (same day → same ghost, with or without a save), so this mostly
  // guards a persisted record for muenba-profile.html and Pass 7 to read,
  // rather than guarding against the pick itself ever drifting.
  function getOrPickTodaysTargetGhost() {
    const today = _briTodayKey();
    const mu = readMuenba();
    if (today && mu.targetGhost && mu.targetGhost.pickedForDay === today) {
      const saved = GHOSTS.find(g => g.id === mu.targetGhost.id);
      if (saved) return saved;
    }
    const ghost = _pickTargetGhost();
    if (today) writeMuenba({ targetGhost: { id: ghost.id, pickedForDay: today } });
    return ghost;
  }

  function buildBriefingOverlay() {
    if (briefingOverlay) return;
    briefingOverlay = document.createElement('div');
    briefingOverlay.id = 'muenba-briefing-overlay';
    document.body.appendChild(briefingOverlay);
  }

  // House rule carried over from daily-check.js: textContent for every
  // data-sourced string (curriculum JSON), never innerHTML with card data.
  function _briClear() {
    briefingOverlay.textContent = '';
    const box = document.createElement('div');
    box.className = 'muenba-lobby-box muenba-briefing-box';
    briefingOverlay.appendChild(box);
    return box;
  }

  function _renderBriefingLoading() {
    const box = _briClear();
    const jp = document.createElement('p'); jp.className = 'jp-line';
    jp.textContent = 'きろくをよみこみ中……';
    const en = document.createElement('p');
    en.textContent = "Nuppi is gathering this week's words...";
    box.append(jp, en);
  }

  function _runBriefingQuiz(quiz, qi) {
    const box = _briClear();
    const q = quiz[qi];

    const count = document.createElement('div');
    count.className = 'muenba-briefing-count';
    count.textContent = `Question ${qi + 1} / ${quiz.length}`;
    box.appendChild(count);

    const h2 = document.createElement('h2');
    h2.textContent = 'Nuppi asks…';
    box.appendChild(h2);

    const prompt = document.createElement('p');
    prompt.className = 'muenba-briefing-prompt';
    prompt.textContent = q.prompt;
    box.appendChild(prompt);

    const list = document.createElement('div');
    list.className = 'muenba-briefing-choices';
    let answered = false;
    q.choices.forEach((choice, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'muenba-briefing-choice';
      b.textContent = choice.label;
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const isRight = choice.n === q.answerN;
        if (isRight) {
          b.classList.add('right');
        } else {
          b.classList.add('wrong');
          Array.from(list.children).forEach((cb, j) => {
            if (q.choices[j].n === q.answerN) cb.classList.add('right');
            else if (cb !== b) cb.classList.add('dim');
          });
        }
        setTimeout(() => {
          const next = qi + 1;
          if (next >= quiz.length) _revealTargetGhost();
          else _runBriefingQuiz(quiz, next);
        }, isRight ? 550 : 1050);
      });
      list.appendChild(b);
    });
    box.appendChild(list);
  }

  // Counts every completed briefing (including the auto-skip-on-error
  // path in openBriefingQuiz()'s .catch()), since the quiz has no real
  // fail state — reaching the reveal IS "passing" it, per the locked
  // gentle/no-punishment decision. One combined load+write rather than
  // readMuenba() then writeMuenba() back to back, to avoid a redundant
  // round trip on a call site this cheap should stay cheap.
  function _bumpBriefingsPassed() {
    try {
      const d = loadSave();
      if (!d.muenba || typeof d.muenba !== 'object') d.muenba = {};
      const prev = Number.isInteger(d.muenba.briefingsPassed) ? d.muenba.briefingsPassed : 0;
      d.muenba.briefingsPassed = prev + 1;
      writeSave(d);
    } catch (_) {}
  }

  function _revealTargetGhost() {
    _bumpBriefingsPassed();
    const box = _briClear();
    const ghost = state.targetGhost || GHOSTS[0];

    const img = document.createElement('img');
    img.className = 'muenba-briefing-ghost-portrait';
    img.src = ghost.img;
    img.alt = ghost.name;
    box.appendChild(img);

    const h2 = document.createElement('h2');
    h2.textContent = 'Nuppi points...';
    box.appendChild(h2);
    const jp = document.createElement('p'); jp.className = 'jp';
    jp.textContent = '見つけて。';
    box.appendChild(jp);

    const p1 = document.createElement('p');
    p1.textContent = `That's the one — ${ghost.name}. Somewhere in these fifteen rooms, ${ghost.name} is waiting for you to find it.`;
    box.appendChild(p1);
    const p2 = document.createElement('p');
    p2.className = 'jp-line';
    p2.textContent = `${ghost.name}を探して。この15の部屋のどこかに隠れているよ。`;
    box.appendChild(p2);

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    const go = document.createElement('button');
    go.type = 'button';
    go.id = 'muenba-briefing-go';
    go.textContent = "I'll find it";
    go.addEventListener('click', closeBriefingQuiz);
    actions.appendChild(go);
    box.appendChild(actions);
  }

  function openBriefingQuiz() {
    if (briefingOpen || !briefingOverlay) return;
    briefingOpen = true;
    state.clickTarget = null;
    state.moving = false;
    briefingOverlay.classList.add('open');
    state.targetGhost = getOrPickTodaysTargetGhost();

    _renderBriefingLoading();
    const curr = _briKnownCurr();
    _loadBriefingContent(curr).then(content => {
      const quiz = _buildBriefingQuiz(content);
      if (!quiz.length) { _revealTargetGhost(); return; }
      _runBriefingQuiz(quiz, 0);
    }).catch(err => {
      // Offline/404/missing week content must never hard-lock the player
      // out of Muenba — skip straight to the reveal instead.
      console.warn('[Muenba] Briefing content unavailable, skipping quiz:', err);
      _revealTargetGhost();
    });
  }

  function closeBriefingQuiz() {
    briefingOpen = false;
    if (briefingOverlay) briefingOverlay.classList.remove('open');
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
    if (state.transitioning || state.inputLocked || returnPortalOpen || lobbyOpen || briefingOpen) return;
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
    if (!state.transitioning && !returnPortalOpen && !lobbyOpen && !briefingOpen) {
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
    openNuppiLobby();
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
