
(() => {
  const DATA = window.UTSUROBA_DATA;
  if (!DATA || !DATA.rooms) { console.error("UTSUROBA_DATA not found."); return; }

  /* ═══════════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════════ */
  const WORLD_W         = 1536;
  const WORLD_H         = 1024;
  const GHOST_R         = 26;
  const GHOST_RADIUS    = 18;

  const IS_PHONE        = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 768;
  const BASE_SPEED      = IS_PHONE ? 8.0 : 5.5;

  const FADE_MS         = 600;
  const CLICK_STOP_DIST = 6;
  const HOVER_AMP       = 9;
  const HOVER_PERIOD    = 1500;
  const TRAIL_MAX       = 90;
  const TARGET_DT       = 1000 / 60;

  const CENTER_X    = WORLD_W * 0.5;
  const CENTER_Y    = WORLD_H * 0.5;
  const ARRIVE_DIST = 10;

  const ENTER_START_X = CENTER_X;
  const ENTER_START_Y = WORLD_H + GHOST_R * 4;

  let lastTickTime = 0;
  let SPEED        = BASE_SPEED;

  const MAX_DPR = Math.min(window.devicePixelRatio || 1, 2);

  let perfTier       = 'high';
  let perfFrameCount = 0;
  let perfFirstTime  = 0;
  let shadowsEnabled = true;

  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const NPP_RADIUS    = isTouchDevice ? 58 : 40;

  const ARRIVAL_ARROW_DELAY_MS        = 2000;
  const ARRIVAL_ARROW_BACK_MULTIPLIER = 3;
  const TRANSITION_COOLDOWN_MS        = 1400;
  const ARROW_MOVE_THRESHOLD          = 30;
  const POPUP_COOLDOWN_MS             = 900;
  const DRIFTER_HIT_R                 = isTouchDevice ? 64 : 48;
  const PANEL_SLIDE_MS                = 340;

  const KARASUKI_EXIT = {
    roomId : 'room_03',
    px     : 762 / WORLD_W,
    py     : 816 / WORLD_H,
    r      : isTouchDevice ? 58 : 44,
    href   : 'karasuki.html',
  };

  /* ═══════════════════════════════════════════
     DEV MODE
  ═══════════════════════════════════════════ */
  const DEV_MODE = false;

  /* ═══════════════════════════════════════════
     COLOURS
  ═══════════════════════════════════════════ */
  const MONTH_COLORS = [
    ['#ff3bbd','#ff79d7'],['#ff6b3b','#ffaa5e'],['#3bc8ff','#a8edff'],
    ['#3bffee','#b2ffda'],['#ffd700','#fff176'],['#3b6fff','#90aaff'],
    ['#a03bff','#d49aff'],['#ff9f3b','#ffd08a'],['#3bffee','#a8fff8'],
    ['#c8ff3b','#e8ffaa'],['#ff3b6f','#ff85a1'],['#ff3bbd','#ff79d7'],
  ];
  function roomColorPair(roomId) {
    const n = parseInt((roomId||'room_01').replace(/\D/g,''),10)||1;
    return MONTH_COLORS[(n-1)%MONTH_COLORS.length];
  }

  /* ═══════════════════════════════════════════
     COORDINATE HELPERS
  ═══════════════════════════════════════════ */
  function spawnToWorld(sp) { return { x: sp.x*WORLD_W, y: sp.y*WORLD_H }; }
  function exitPxX() { return KARASUKI_EXIT.px * WORLD_W; }
  function exitPxY() { return KARASUKI_EXIT.py * WORLD_H; }

  /* ═══════════════════════════════════════════
     NPP
  ═══════════════════════════════════════════ */
  const NPP = {
    room_01:[{dir:'right',x:1134,y:473,to:'room_02',spawn:'fromLeft'},{dir:'up',x:631,y:308,to:'room_06',spawn:'fromDown'}],
    room_02:[{dir:'left',x:409,y:597,to:'room_01',spawn:'fromRight'},{dir:'right',x:1131,y:470,to:'room_03',spawn:'fromLeft'},{dir:'up',x:559,y:318,to:'room_07',spawn:'fromDown'}],
    room_03:[{dir:'left',x:411,y:426,to:'room_02',spawn:'fromRight'},{dir:'right',x:1086,y:426,to:'room_04',spawn:'fromLeft'},{dir:'up',x:760,y:346,to:'room_08',spawn:'fromDown'}],
    room_04:[{dir:'left',x:382,y:611,to:'room_03',spawn:'fromRight'},{dir:'right',x:1101,y:504,to:'room_05',spawn:'fromLeft'},{dir:'up',x:711,y:329,to:'room_09',spawn:'fromDown'}],
    room_05:[{dir:'left',x:413,y:605,to:'room_04',spawn:'fromRight'},{dir:'up',x:710,y:309,to:'room_10',spawn:'fromDown'}],
    room_06:[{dir:'right',x:1069,y:488,to:'room_07',spawn:'fromLeft'},{dir:'up',x:695,y:307,to:'room_11',spawn:'fromDown'},{dir:'down',x:999,y:756,to:'room_01',spawn:'fromUp'}],
    room_07:[{dir:'left',x:361,y:610,to:'room_06',spawn:'fromRight'},{dir:'right',x:1111,y:497,to:'room_08',spawn:'fromLeft'},{dir:'up',x:705,y:326,to:'room_12',spawn:'fromDown'},{dir:'down',x:995,y:759,to:'room_02',spawn:'fromUp'}],
    room_08:[{dir:'left',x:352,y:603,to:'room_07',spawn:'fromRight'},{dir:'right',x:1131,y:498,to:'room_09',spawn:'fromLeft'},{dir:'up',x:713,y:338,to:'room_13',spawn:'fromDown'},{dir:'down',x:1011,y:770,to:'room_03',spawn:'fromUp'}],
    room_09:[{dir:'left',x:394,y:590,to:'room_08',spawn:'fromRight'},{dir:'right',x:1123,y:502,to:'room_10',spawn:'fromLeft'},{dir:'up',x:707,y:318,to:'room_14',spawn:'fromDown'},{dir:'down',x:1000,y:747,to:'room_04',spawn:'fromUp'}],
    room_10:[{dir:'left',x:401,y:603,to:'room_09',spawn:'fromRight'},{dir:'up',x:705,y:316,to:'room_15',spawn:'fromDown'},{dir:'down',x:994,y:753,to:'room_05',spawn:'fromUp'}],
    room_11:[{dir:'right',x:1208,y:322,to:'room_12',spawn:'fromLeft'},{dir:'down',x:1006,y:784,to:'room_06',spawn:'fromUp'}],
    room_12:[{dir:'left',x:371,y:639,to:'room_11',spawn:'fromRight'},{dir:'right',x:1210,y:434,to:'room_13',spawn:'fromLeft'},{dir:'down',x:1037,y:800,to:'room_07',spawn:'fromUp'}],
    room_13:[{dir:'left',x:368,y:626,to:'room_12',spawn:'fromRight'},{dir:'right',x:1233,y:322,to:'room_14',spawn:'fromLeft'},{dir:'down',x:1078,y:796,to:'room_08',spawn:'fromUp'}],
    room_14:[{dir:'left',x:303,y:631,to:'room_13',spawn:'fromRight'},{dir:'right',x:1210,y:405,to:'room_15',spawn:'fromLeft'},{dir:'down',x:930,y:812,to:'room_09',spawn:'fromUp'}],
    room_15:[{dir:'left',x:402,y:614,to:'room_14',spawn:'fromRight'},{dir:'down',x:1003,y:790,to:'room_10',spawn:'fromUp'}]
  };
  const DIR_ANGLE = { right:0, down:Math.PI/2, left:Math.PI, up:-Math.PI/2 };

  let arrivalArrowHiddenUntil     = 0;
  let arrivalArrowBackHiddenUntil = 0;

  /* ═══════════════════════════════════════════
     SAVE LAYER
  ═══════════════════════════════════════════ */
  const SAVE_KEY = 'booha_save';

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const d   = raw ? JSON.parse(raw) : {};
      return migrateUtsurobaSave(d);
    } catch(_) {}
    return { utsuroba:{}, karasuki:{}, weekly:{} };
  }

  function writeSave(data) {
    try {
      data.updatedAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch(_) {}
    try { if (window.BoohaAdventure?.save?.invalidate) BoohaAdventure.save.invalidate(); } catch(_) {}
  }

  function migrateUtsurobaSave(data) {
    let dirty = false;
    if (!data.utsuroba) { data.utsuroba = {}; dirty = true; }
    if (!data.karasuki) { data.karasuki = {}; dirty = true; }
    if (!data.weekly)   { data.weekly   = {}; dirty = true; }
    if (data.drifters && !data.utsuroba.drifters) {
      data.utsuroba.drifters = data.drifters;
      delete data.drifters;
      dirty = true;
    }
    if (!data.utsuroba.drifters)     { data.utsuroba.drifters     = {}; dirty = true; }
    if (!data.utsuroba.visitedRooms) { data.utsuroba.visitedRooms = {}; dirty = true; }
    if (!data.utsuroba.flags)        { data.utsuroba.flags        = {}; dirty = true; }
    if (data.weekly.utsuobaVisited || data.weekly.utsurobaVisited) {
      data.utsuroba.flags.visited = true;
      delete data.weekly.utsuobaVisited;
      delete data.weekly.utsurobaVisited;
      dirty = true;
    }
    const q = data.weekly.drifterQuest;
    if (q && q.collectedMemKey !== undefined && q.collectedMemoryId === undefined) {
      q.collectedMemoryId = q.collectedMemKey;
      delete q.collectedMemKey;
      dirty = true;
    }
    if (dirty) writeSave(data);
    return data;
  }

  function readUtsuroba() {
    const d = loadSave();
    return d.utsuroba || {};
  }
  function writeUtsuroba(utsuData) {
    const d = loadSave();
    d.utsuroba = { ...d.utsuroba, ...utsuData };
    writeSave(d);
  }

  let _cachedQuest = null, _cachedQuestTime = 0;
  function getCachedQuest() {
    const now = performance.now();
    if (now - _cachedQuestTime > 500) {
      _cachedQuest      = loadSave().weekly?.drifterQuest || null;
      _cachedQuestTime  = now;
    }
    return _cachedQuest;
  }
  function invalidateQuestCache() { _cachedQuestTime = 0; }

  /* ═══════════════════════════════════════════
     DRIFTER SYSTEM
  ═══════════════════════════════════════════ */
  function seededShuffle(arr, seed) {
    const a = arr.slice(); let s = seed;
    for (let i = a.length-1; i > 0; i--) {
      s = (s*1664525+1013904223) & 0xffffffff;
      const j = Math.abs(s) % (i+1); [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }
  function getWeekSeed() {
    try { if (window.CALENDAR?.getCurrentCurriculumWeek) return CALENDAR.getCurrentCurriculumWeek(); } catch(_) {}
    const now = new Date(), jan1 = new Date(now.getFullYear(),0,1);
    return Math.ceil(((now-jan1)/86400000+jan1.getDay()+1)/7);
  }

  const weeklyRooms = (() => {
    const seed  = getWeekSeed();
    const rooms = seededShuffle(DATA.drifterRoomPool, seed);
    return DATA.drifters.map((_,i) => rooms[i % rooms.length]);
  })();

  function driftersForRoom(roomId) {
    return DATA.drifters.filter((_,i) => weeklyRooms[i] === roomId);
  }

  function drifterWorldPos(d, roomId) {
    const coords = DATA.roomStandingCoords[roomId];
    return { x: coords.x, y: coords.y };
  }

  const drifterImgs = {};
  DATA.drifters.forEach(d => {
    const load = src => { const img = new Image(); img.src = src; return img; };
    drifterImgs[d.id] = { img1: load(d.sprite1), img2: load(d.sprite2) };
  });

  function drifterHasMemories(id) {
    if (drifterIsWrong(id)) return false;
    const utsu = readUtsuroba();
    const rec  = utsu.drifters?.[id];
    const d    = DATA.drifters.find(x => x.id === id);
    return d ? (rec?.completed?.length || 0) < d.memoryCount : false;
  }
  function pickRandomMemory(id) {
    const utsu = readUtsuroba();
    const rec  = utsu.drifters?.[id] || { completed: [] };
    const d    = DATA.drifters.find(x => x.id === id); if (!d) return null;
    const pool = [];
    for (let i = 1; i <= d.memoryCount; i++) if (!rec.completed.includes(i)) pool.push(i);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
  function pickDecoys(n) {
    const pool = Array.from({ length: DATA.decoyCount }, (_,i) => i+1);
    return seededShuffle(pool, Math.floor(Math.random()*999999)).slice(0, n);
  }

  function activateQuest(id) {
    const memIdx = pickRandomMemory(id); if (memIdx === null) return null;
    const decoys = pickDecoys(DATA.decoysPerQuest);
    const data   = loadSave();
    if (!data.weekly) data.weekly = {};
    data.weekly.drifterQuest = {
      active           : id,
      state            : 'accepted',
      memIdx,
      decoys,
      collectedMemoryId: null,
      orbIsCorrect     : false,
    };
    writeSave(data); invalidateQuestCache();
    return data.weekly.drifterQuest;
  }

  function completeMemory(id, memIdx) {
    const data = loadSave();
    if (!data.utsuroba.drifters[id]) data.utsuroba.drifters[id] = { completed: [] };
    if (!data.utsuroba.drifters[id].completed.includes(memIdx))
      data.utsuroba.drifters[id].completed.push(memIdx);
    if (data.weekly) data.weekly.drifterQuest = null;
    writeSave(data); invalidateQuestCache();
  }

  function clearQuest() {
    const data = loadSave();
    if (data.weekly) data.weekly.drifterQuest = null;
    writeSave(data); invalidateQuestCache();
  }

  function markDrifterWrong(id) {
    const data = loadSave();
    if (!data.utsuroba.drifters[id]) data.utsuroba.drifters[id] = { completed: [] };
    data.utsuroba.drifters[id].wrongWeek = getWeekSeed();
    writeSave(data);
  }
  function drifterIsWrong(id) {
    const utsu = readUtsuroba();
    return (utsu.drifters?.[id]?.wrongWeek ?? -1) === getWeekSeed();
  }

  function questAudioSrc(id, memIdx) {
    const d = DATA.drifters.find(x => x.id === id); if (!d) return null;
    return `./assets/audio/memories/${d.audioPrefix}_q${String(memIdx).padStart(2,'0')}.mp3`;
  }

  let activeAudio = null;
  function stopActiveAudio() {
    if (!activeAudio) return;
    try { activeAudio.pause(); activeAudio.currentTime = 0; } catch(_) {}
    activeAudio = null;
  }

  /* ═══════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════ */
  const state = {
    roomId: (()=>{ const p = new URLSearchParams(window.location.search); return p.get('room') || DATA.startRoom; })(),
    spawnId:'default', x:CENTER_X, y:CENTER_Y, spawnX:CENTER_X, spawnY:CENTER_Y,
    arrivalDir:null, transitioning:false, transitionReadyAt:0,
    clickTarget:null, moving:false, distMovedSinceSpawn:0,
    coordMode:false, musicStarted:false, lastTrailT:0,
    spawnLockUntil:0, exitingToKarasuki:false,
    travelingToCenter:false, inputLocked:false,
    celebrating:false, celebrateSpinStart:0,
    celebrateOrbitX:CENTER_X, celebrateOrbitY:CENTER_Y,
    celebrateDancing:false, celebrateSettling:false, celebrateSettleStart:0,
  };

  let pins = [], trail = [], ripples = [];
  const ghostImg = new Image(); ghostImg.src = './assets/img/booha_ghost.png';
  const music = new Audio('./assets/audio/utsuroba-music.mp3'); music.loop = true; music.volume = 0.65;

  let app, stage, canvas, ctx, roomLayer;
  let coordToggle, coordReadout, pinLog;
  let exitPopOverlay = null, exitPopCooldownUntil = 0;
  let drifterPanel = null, drifterPanelOpen = false, drifterPanelCooldown = 0;

  let isMemoryPlaying  = false;
  let drifterFadeStart = 0;
  let _lastWrongId     = '';

  const CELEBRATE_MS = 8000;

  const THANK_YOU = {
    ks:  { en:"Thank you… don't slow me down again.", jp:"ありがとう…。もう足を引っ張るなよ。" },
    nto: { en:"Thank you! You're the best!",          jp:"ありがとう！あなたが一番だよ！" },
    cg:  { en:"Thank you… I really mean it.",         jp:"ありがとう…。本当に、心から。" },
  };
  const WAITING_LINES = {
    ks:  { en:"Hurry up, you little blob.",                 jp:"さっさと行けよ、このチビ。" },
    nto: { en:"See you soon, cutie.",                       jp:"じゃあね、かわいい子ちゃん。またね。" },
    cg:  { en:"I'll be waiting here… don't take too long.", jp:"ここで待ってるよ…あまり遅くなるなよ。" },
  };

  /* ═══════════════════════════════════════════
     STYLES
  ═══════════════════════════════════════════ */
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
      html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}
      body{display:grid;place-items:center;}
      #utsuroba-app{position:relative;width:100vw;height:100vh;overflow:hidden;background:#000;}
      #utsuroba-stage{position:absolute;left:50%;top:50%;width:${WORLD_W}px;height:${WORLD_H}px;transform-origin:50% 50%;overflow:hidden;cursor:crosshair;}
      #utsuroba-room-layer{position:absolute;inset:0;}
      .utsuroba-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block;pointer-events:none;user-select:none;}
      #buki-canvas{position:absolute;inset:0;z-index:10;pointer-events:none;}
      #buki-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:20;}
      #rotate-overlay{display:none;position:fixed;inset:0;z-index:9999;background:#000;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:32px;}
      @media screen and (orientation:portrait) and (max-width:1023px){#rotate-overlay{display:flex !important;}}
      .rotate-phone{font-size:64px;display:block;animation:rotatehint 2.4s ease-in-out infinite;transform-origin:center;}
      @keyframes rotatehint{0%,100%{transform:rotate(0deg);}40%,60%{transform:rotate(-90deg);}}
      .rotate-bar{width:120px;height:3px;border-radius:999px;background:linear-gradient(90deg,#9b2c7a,#c45fa3,#9b2c7a);background-size:200%;animation:barshimmer 2s linear infinite;}
      @keyframes barshimmer{0%{background-position:0%}100%{background-position:200%}}
      .rotate-title{font-family:system-ui,-apple-system,sans-serif;font-size:clamp(18px,5vw,28px);font-weight:900;color:#fff;margin:0;}
      .rotate-sub{font-size:14px;color:rgba(255,255,255,.55);margin:0;line-height:1.7;}
      @keyframes utsuPopIn{from{opacity:0;transform:scale(0.94) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);}}
      #buki-coord-toggle{position:fixed;bottom:18px;right:18px;z-index:200;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.85);color:#ff8ae2;font:700 11px/1 monospace;padding:7px 13px;border-radius:20px;cursor:pointer;border:1px solid rgba(255,138,226,.40);user-select:none;letter-spacing:.06em;}
      .toggle-pill{width:30px;height:16px;border-radius:8px;background:rgba(255,138,226,.18);position:relative;transition:background .2s;}
      .toggle-pill::after{content:"";position:absolute;top:3px;left:3px;width:10px;height:10px;border-radius:50%;background:#ff8ae2;transition:transform .2s;}
      #buki-coord-toggle.active .toggle-pill{background:rgba(255,138,226,.55);}
      #buki-coord-toggle.active .toggle-pill::after{transform:translateX(14px);}
      #buki-coord-readout{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:200;background:rgba(0,0,0,.85);color:#ff8ae2;font:700 13px/1.4 monospace;padding:6px 16px;border-radius:20px;pointer-events:none;border:1px solid rgba(255,138,226,.30);letter-spacing:.05em;opacity:0;transition:opacity .2s;white-space:nowrap;text-align:center;}
      #buki-coord-readout.show{opacity:1;}
      #buki-coord-readout .hint{font-size:10px;color:rgba(255,138,226,.55);display:block;margin-top:2px;}
      #buki-pin-log{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:200;max-height:60vh;overflow-y:auto;background:rgba(0,0,0,.88);border:1px solid rgba(255,138,226,.25);border-radius:14px;padding:10px 12px;font:700 11px/1.6 monospace;color:#ff8ae2;letter-spacing:.04em;display:none;min-width:160px;}
      #buki-pin-log.show{display:block;}
      #buki-pin-log .pin-row{display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,138,226,.12);cursor:pointer;}
      #buki-pin-log .pin-row:last-child{border-bottom:none;}
      #buki-pin-log .pin-row:hover{color:#fff;}
      #buki-pin-log .pin-idx{min-width:18px;text-align:right;color:rgba(255,138,226,.55);font-size:10px;}
      #buki-pin-log .pin-coords{flex:1;}
      #buki-pin-log .pin-copy{font-size:9px;color:rgba(255,138,226,.45);padding:1px 5px;border-radius:6px;border:1px solid rgba(255,138,226,.2);}
      #buki-pin-log .pin-row:hover .pin-copy{color:#fff;border-color:rgba(255,138,226,.6);}
      #buki-pin-log .log-header{font-size:9px;color:rgba(255,138,226,.45);letter-spacing:.12em;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;}
      #buki-pin-log .clear-btn{font-size:9px;color:rgba(255,138,226,.4);cursor:pointer;padding:1px 6px;border-radius:6px;border:1px solid rgba(255,138,226,.18);}
      #buki-pin-log .clear-btn:hover{color:#fff;border-color:rgba(255,138,226,.6);}
      #buki-copy-toast{position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:300;background:rgba(20,0,30,.92);color:#fff;font:700 12px/1 monospace;padding:6px 18px;border-radius:20px;pointer-events:none;opacity:0;transition:opacity .18s;letter-spacing:.05em;}
      #buki-copy-toast.show{opacity:1;}
      /* ══ DRIFTER PANEL ══ */
      #utsuroba-drifter-panel{position:fixed;bottom:0;left:0;right:0;z-index:9100;background:linear-gradient(180deg,#f7f2e8 0%,#ede5d0 100%);border-top:2px solid #c8b48a;border-radius:20px 20px 0 0;box-shadow:0 -6px 32px rgba(0,0,0,0.5);transform:translateY(100%);transition:transform ${PANEL_SLIDE_MS}ms cubic-bezier(0.22,1,0.36,1);font-family:'Georgia',serif;pointer-events:none;}
      #utsuroba-drifter-panel.open{transform:translateY(0);pointer-events:auto;}
      .dp-handle{width:38px;height:4px;border-radius:2px;background:#c0aa80;margin:10px auto 0;}
      .dp-inner{display:flex;align-items:flex-start;gap:clamp(10px,2.5vw,22px);padding:12px clamp(14px,3.5vw,28px) 22px;}
      .dp-portrait{flex-shrink:0;width:clamp(68px,13vw,108px);height:clamp(68px,13vw,108px);border-radius:10px;border:1.5px solid #c8b48a;background:#e8dfc8;display:flex;align-items:center;justify-content:center;overflow:hidden;}
      .dp-portrait img{width:100%;height:100%;object-fit:contain;display:block;}
      .dp-body{flex:1;min-width:0;position:relative;}
      .dp-close-x{position:absolute;top:0;right:0;background:transparent;border:none;cursor:pointer;font-size:.95rem;color:#b8a070;padding:2px 5px;line-height:1;}
      .dp-close-x:hover{color:#5a3010;}
      .dp-name-en{font-size:clamp(.62rem,1.7vw,.75rem);color:#9a7850;letter-spacing:.14em;text-transform:uppercase;margin:0 0 2px;}
      .dp-name-kanji{font-size:clamp(.95rem,2.6vw,1.14rem);color:#1e140a;font-weight:700;margin:0 0 1px;}
      .dp-name-hira{font-size:clamp(.64rem,1.7vw,.76rem);color:#806040;margin:0 0 9px;letter-spacing:.06em;}
      .dp-divider{width:44px;height:1px;background:#c8b48a;margin:0 0 9px;}
      .dp-line-en{font-size:clamp(.80rem,2.1vw,.94rem);color:#120c04;line-height:1.6;margin:0 0 2px;}
      .dp-line-jp{font-size:clamp(.72rem,1.9vw,.84rem);color:#6a5030;line-height:1.65;margin:0 0 4px;}
      .dp-status{font-size:clamp(.70rem,1.8vw,.82rem);color:#806040;line-height:1.6;margin:0 0 10px;font-style:italic;}
      .dp-btns{display:flex;gap:9px;flex-wrap:wrap;margin-top:10px;}
      .dp-btn{font-family:'Georgia',serif;font-size:clamp(.73rem,1.9vw,.86rem);letter-spacing:.1em;cursor:pointer;padding:8px 20px;border-radius:4px;transition:all .16s;}
      .dp-btn.yes{background:#2a1a06;border:1px solid #4a3010;color:#f0ddb0;}
      .dp-btn.yes:hover{background:#3a2810;}
      .dp-btn.no{background:transparent;border:1px solid #b8a478;color:#9a7850;}
      .dp-btn.no:hover{border-color:#806030;color:#4a2c08;}
      .dp-audio-btn{display:flex;align-items:center;gap:7px;background:#f0e8d0;border:1px solid #c0a060;color:#4a2c08;font-family:'Georgia',serif;font-size:clamp(.70rem,1.8vw,.82rem);letter-spacing:.08em;padding:7px 16px;border-radius:4px;cursor:pointer;transition:all .16s;margin-bottom:9px;}
      .dp-audio-btn:hover{background:#e8dab8;}
      .dp-audio-btn:disabled{opacity:.45;cursor:default;}
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════
     DEV PANEL
  ═══════════════════════════════════════════ */
  function injectDevPanel() {
    if (document.getElementById('buki-dev-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'buki-dev-panel';

    /* ── coord UI ── */
    if (!document.getElementById('buki-coord-toggle')) {
      coordToggle = document.createElement('div'); coordToggle.id = 'buki-coord-toggle';
      coordToggle.innerHTML = '<span>COORDS</span><div class="toggle-pill"></div>';
      coordToggle.addEventListener('click', toggleCoordMode);
      document.body.appendChild(coordToggle);
    } else {
      coordToggle = document.getElementById('buki-coord-toggle');
    }
    if (!document.getElementById('buki-coord-readout')) {
      coordReadout = document.createElement('div'); coordReadout.id = 'buki-coord-readout';
      coordReadout.innerHTML = '<span id="buki-coord-xy">—</span><span class="hint">click to pin · hover to read</span>';
      document.body.appendChild(coordReadout);
    } else {
      coordReadout = document.getElementById('buki-coord-readout');
    }
    if (!document.getElementById('buki-pin-log')) {
      pinLog = document.createElement('div'); pinLog.id = 'buki-pin-log';
      pinLog.innerHTML = `<div class="log-header"><span>PINS — ${state.roomId}</span><span class="clear-btn" id="buki-clear-pins">CLEAR</span></div><div id="buki-pin-rows"></div>`;
      document.body.appendChild(pinLog);
      document.getElementById('buki-clear-pins').addEventListener('click', () => { pins = []; renderPinLog(); });
    } else {
      pinLog = document.getElementById('buki-pin-log');
    }

    panel.style.cssText = 'position:fixed;bottom:60px;right:18px;z-index:9999;background:rgba(0,0,0,.90);border:1px solid rgba(255,200,0,.4);border-radius:10px;padding:10px 14px;font:700 11px/1.8 monospace;color:#ffd700;letter-spacing:.06em;min-width:190px;box-shadow:0 0 20px rgba(255,200,0,.2);';
    panel.innerHTML = `
      <div style="font-size:9px;color:rgba(255,200,0,.5);letter-spacing:.14em;margin-bottom:6px;">DEV — utsuroba</div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="buki-dev-exit"> Exit always visible</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="buki-dev-shadows" checked> Shadows on</label>
      <button id="buki-dev-clear-quest" style="margin-top:2px;margin-bottom:4px;font:700 11px monospace;color:#ffd700;background:transparent;border:1px solid rgba(255,200,0,.4);border-radius:4px;padding:3px 8px;cursor:pointer;width:100%;">Clear quest</button>
      <button id="buki-dev-clear-all" style="margin-bottom:6px;font:700 11px monospace;color:#ff8888;background:transparent;border:1px solid rgba(255,80,80,.4);border-radius:4px;padding:3px 8px;cursor:pointer;width:100%;">Clear all storage</button>
      <button id="buki-dev-celebrate" style="margin-bottom:6px;font:700 11px monospace;color:#ff79d7;background:transparent;border:1px solid rgba(255,121,215,.4);border-radius:4px;padding:3px 8px;cursor:pointer;width:100%;">Test celebration</button>
      <div id="buki-dev-perf" style="font-size:9px;color:rgba(255,200,0,.45);margin-top:2px;"></div>
      <div id="buki-dev-room" style="font-size:9px;color:rgba(255,200,0,.45);margin-top:2px;"></div>
      <div id="buki-dev-quest" style="font-size:9px;color:rgba(255,200,0,.45);margin-top:2px;"></div>`;
    document.body.appendChild(panel);

    window.__devUtsuExit = false;
    document.getElementById('buki-dev-exit').addEventListener('change', function() { window.__devUtsuExit = this.checked; });
    document.getElementById('buki-dev-shadows').addEventListener('change', function() { shadowsEnabled = this.checked; });
    document.getElementById('buki-dev-clear-quest').addEventListener('click', () => {
      const data = loadSave();
      if (data.weekly) data.weekly.drifterQuest = null;
      writeSave(data); invalidateQuestCache();
    });
    document.getElementById('buki-dev-clear-all').addEventListener('click', () => {
      if (confirm('Clear all booha_save data?')) {
        try { localStorage.removeItem(SAVE_KEY); } catch(_) {}
        invalidateQuestCache();
      }
    });
    document.getElementById('buki-dev-celebrate').addEventListener('click', () => {
      const drifter = DATA.drifters[0];
      if (drifter) startCelebration(drifter);
    });
    setInterval(() => {
      const r = document.getElementById('buki-dev-room');
      const p = document.getElementById('buki-dev-perf');
      const q = document.getElementById('buki-dev-quest');
      if (r) r.textContent = `room:${state.roomId} moved:${Math.round(state.distMovedSinceSpawn)}`;
      if (p) p.textContent = `tier:${perfTier} dpr:${MAX_DPR} touch:${isTouchDevice}`;
      if (q) {
        const quest = getCachedQuest();
        q.textContent = quest
          ? `q:${quest.active} s:${quest.state} m:${quest.memIdx} key:${quest.collectedMemoryId||'none'}`
          : 'quest:none';
      }
    }, 500);
  }

  /* ═══════════════════════════════════════════
     EXIT POPUP
  ═══════════════════════════════════════════ */
  function injectExitPopOverlay() {
    if (exitPopOverlay) return;
    exitPopOverlay = document.createElement('div');
    exitPopOverlay.id = 'utsuroba-exit-overlay';
    exitPopOverlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:9200;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.35s ease;';
    exitPopOverlay.innerHTML = `
      <div style="background:linear-gradient(160deg,#06000f,#0c0018 60%,#04000a);border:1px solid rgba(100,0,180,.45);border-radius:6px;padding:clamp(24px,5vw,40px) clamp(22px,6vw,48px) clamp(20px,4vw,32px);max-width:min(400px,94vw);width:94vw;text-align:center;box-shadow:0 0 40px rgba(40,0,80,.8);font-family:'Georgia',serif;position:relative;animation:utsuPopIn 0.3s ease-out;">
        <button id="utsuroba-exit-close" style="position:absolute;top:11px;right:13px;background:transparent;border:none;cursor:pointer;font-size:.95rem;color:rgba(120,0,180,.45);padding:4px 7px;">✕</button>
        <p style="font-size:clamp(.88rem,3vw,1.04rem);color:#b090d0;margin:0 0 10px;line-height:1.6;letter-spacing:.04em;">Do you want to leave Utsuroba?</p>
        <p style="font-size:clamp(.78rem,2.5vw,.92rem);color:#8060a8;margin:0 0 6px;letter-spacing:.07em;">うつろばを出ますか？</p>
        <p style="font-size:clamp(.7rem,2.1vw,.82rem);color:#503070;margin:0 0 24px;letter-spacing:.12em;opacity:.65;">空洞場を去りますか？</p>
        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
          <button id="utsuroba-exit-yes" style="background:rgba(40,0,70,.3);font-family:'Georgia',serif;font-size:clamp(.8rem,2.7vw,.92rem);letter-spacing:.12em;cursor:pointer;padding:9px 28px;border-radius:3px;border:1px solid rgba(120,0,180,.65);color:#d0a8f0;transition:all .2s;">はい / Yes</button>
          <button id="utsuroba-exit-no"  style="background:transparent;font-family:'Georgia',serif;font-size:clamp(.8rem,2.7vw,.92rem);letter-spacing:.12em;cursor:pointer;padding:9px 28px;border-radius:3px;border:1px solid rgba(50,20,70,.6);color:#6a4888;transition:all .2s;">いいえ / No</button>
        </div>
      </div>`;
    document.body.appendChild(exitPopOverlay);
    document.getElementById('utsuroba-exit-close').addEventListener('click', closeExitPop);
    document.getElementById('utsuroba-exit-no').addEventListener('click', closeExitPop);
    document.getElementById('utsuroba-exit-yes').addEventListener('click', doExitToKarasuki);
    exitPopOverlay.addEventListener('click', e => { if (e.target === exitPopOverlay) closeExitPop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isExitPopOpen()) closeExitPop(); });
  }
  function isExitPopOpen() { return exitPopOverlay?.style.display === 'flex'; }
  function openExitPop() { exitPopOverlay.style.display = 'flex'; exitPopOverlay.style.background = 'rgba(0,0,0,0.88)'; state.clickTarget = null; }
  function closeExitPop() {
    exitPopCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
    exitPopOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { exitPopOverlay.style.display = 'none'; }, 350);
  }
  function doExitToKarasuki() {
    if (state.exitingToKarasuki) return;
    state.exitingToKarasuki = true; state.clickTarget = null; state.moving = false;
    stopActiveAudio();
    try { music.pause(); music.currentTime = 0; } catch(_) {}
    exitPopOverlay.style.display = 'none';
    const fadeEl = document.getElementById('buki-fade');
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`;
    fadeEl.style.opacity    = '1';
    setTimeout(() => {
      try { sessionStorage.setItem('utsuroba_return_room','room_15'); } catch(_) {}
      window.location.href = KARASUKI_EXIT.href;
    }, FADE_MS+60);
  }

  /* ═══════════════════════════════════════════
     DRIFTER PANEL
  ═══════════════════════════════════════════ */
  function buildDrifterPanel() {
    if (drifterPanel) return;
    drifterPanel = document.createElement('div');
    drifterPanel.id = 'utsuroba-drifter-panel';
    document.body.appendChild(drifterPanel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && drifterPanelOpen) closeDrifterPanel(); });
  }

  function openDrifterPanel(drifter, forcedQuest = null) {
    if (performance.now() < drifterPanelCooldown || !drifter || !drifterPanel) return;

    drifterPanelOpen  = true;
    state.inputLocked = true;
    state.clickTarget = null;
    try { music.pause(); } catch(_) {}

    invalidateQuestCache();
    const quest       = forcedQuest || getCachedQuest();
    const hasMemories = drifterHasMemories(drifter.id);

    const currentAudioSrc = (quest && quest.active === drifter.id)
      ? questAudioSrc(quest.active, quest.memIdx)
      : null;

    /* ── build post-greeting action HTML ── */
    let actionHTML = '';

    if (drifter.memoryCount === 0) {
      actionHTML = `
        <div class="dp-btns"><button class="dp-btn no dp-dismiss">Close / 閉じる</button></div>`;

    } else if (!hasMemories) {
      actionHTML = `
        <p class="dp-status">✦ All memories found. ✦<br>すべての記憶が見つかりました。</p>
        <div class="dp-btns"><button class="dp-btn no dp-dismiss">Close / 閉じる</button></div>`;

    } else if (quest && quest.active === drifter.id && quest.state === 'accepted') {
      const wl = WAITING_LINES[drifter.id] || { en:"I'll be waiting…", jp:"待ってるよ…" };
      actionHTML = `
        <p class="dp-line-en" style="margin-bottom:2px;">${wl.en}</p>
        <p class="dp-line-jp" style="margin-bottom:10px;">${wl.jp}</p>
        <div class="dp-divider"></div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:10px;">
          <button class="dp-audio-btn" id="dp-replay-btn" style="margin-bottom:0;">▶ Play / 聴く</button>
          <button class="dp-btn no" id="dp-cancel-quest-btn">Cancel / キャンセル</button>
        </div>`;

    } else if (quest && quest.active === drifter.id && quest.state === 'collected') {
      actionHTML = `
        <p class="dp-line-en" style="margin-bottom:2px;">You have a memory… give it to me?</p>
        <p class="dp-line-jp" style="margin-bottom:10px;">記憶を持っている…くれる？</p>
        <div class="dp-divider"></div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;margin-top:10px;">
          <button class="dp-audio-btn" id="dp-replay-btn" style="margin-bottom:0;">▶ Play / 聴く</button>
          <button class="dp-btn no" id="dp-cancel-quest-btn">Cancel / キャンセル</button>
        </div>
        <div class="dp-btns">
          <button class="dp-btn yes" id="dp-give-btn">Give memory / 渡す</button>
          <button class="dp-btn no dp-dismiss">Not yet / まだ</button>
        </div>`;

    } else if (quest && quest.active !== drifter.id) {
      actionHTML = `
        <p class="dp-status">Please help my friend first…<br>先に友達を助けてあげて…</p>
        <div class="dp-btns"><button class="dp-btn no dp-dismiss">Close / 閉じる</button></div>`;

    } else {
      /* no active quest — offer one using questLines */
      actionHTML = `
        <div class="dp-divider"></div>
        <p class="dp-line-en" style="margin-bottom:2px;">Will you help me find a memory?</p>
        <p class="dp-line-jp" style="margin-bottom:10px;">記憶を探すのを手伝ってくれる？</p>
        <div class="dp-btns">
          <button class="dp-btn yes" id="dp-yes-btn">はい / Yes</button>
          <button class="dp-btn no dp-dismiss">いいえ / No</button>
        </div>`;
    }

    /* ── skip typewriter for mid-quest states ── */
    const skipTypewriter = !!(quest && quest.active === drifter.id);

    drifterPanel.innerHTML = `
      <div class="dp-handle"></div>
      <div class="dp-inner">
        <div class="dp-portrait"><img src="${drifter.sprite2}" alt="${drifter.name}"></div>
        <div class="dp-body">
          <button class="dp-close-x dp-dismiss">✕</button>
          <p class="dp-name-en">${drifter.name}</p>
          <p class="dp-name-kanji">${drifter.nameKanji}</p>
          <p class="dp-name-hira">${drifter.nameHira}</p>
          <div class="dp-divider"></div>
          <div id="dp-typewriter-lines"></div>
          <div id="dp-action-area" style="opacity:0;transition:opacity 0.3s;">${actionHTML}</div>
        </div>
      </div>`;

    drifterPanel.querySelectorAll('.dp-dismiss').forEach(btn =>
      btn.addEventListener('click', closeDrifterPanel));

    requestAnimationFrame(() => requestAnimationFrame(() => drifterPanel.classList.add('open')));

    /* ── typewriter engine ── */
    const twContainer = drifterPanel.querySelector('#dp-typewriter-lines');
    const actionArea  = drifterPanel.querySelector('#dp-action-area');
    
    /* use questLines for quest-offer state, greeting for everything else */
    const hasQuestOffer = !quest && drifter.memoryCount > 0 && drifterHasMemories(drifter.id);
    const enLines = (hasQuestOffer && drifter.questLines)   ? drifter.questLines   : drifter.greeting;
    const jpLines = (hasQuestOffer && drifter.questLinesJP) ? drifter.questLinesJP : drifter.greetingJP;
    
    let   finished    = false;

    function showActionArea() {
      if (finished) return;
      finished = true;
      twContainer.innerHTML = enLines.map((en, i) =>
        `<p class="dp-line-en" style="margin-bottom:2px;">${en}</p>
         <p class="dp-line-jp" style="margin-bottom:6px;">${jpLines[i] || ''}</p>`
      ).join('');
      actionArea.style.opacity = '1';
      drifterPanel.querySelectorAll('.dp-dismiss').forEach(btn =>
        btn.addEventListener('click', closeDrifterPanel));
      bindActionButtons();
    }

    if (skipTypewriter) {
      showActionArea();
    } else {
      drifterPanel.addEventListener('click', showActionArea, { once: true });

      let lineIdx = 0, charIdx = 0;
      let currentEnEl = null, currentJpEl = null;
      const CHAR_MS = 38, LINE_PAUSE_MS = 320;

      function typeLine() {
        if (finished) return;
        if (lineIdx >= enLines.length) { setTimeout(showActionArea, 400); return; }
        currentEnEl = document.createElement('p');
        currentEnEl.className = 'dp-line-en';
        currentEnEl.style.marginBottom = '2px';
        currentJpEl = document.createElement('p');
        currentJpEl.className = 'dp-line-jp';
        currentJpEl.style.marginBottom = '6px';
        twContainer.appendChild(currentEnEl);
        twContainer.appendChild(currentJpEl);
        charIdx = 0;
        typeChar();
      }

      function typeChar() {
        if (finished) return;
        const enLine = enLines[lineIdx];
        const jpLine = jpLines[lineIdx] || '';
        if (charIdx <= enLine.length) {
          currentEnEl.textContent = enLine.slice(0, charIdx);
          const jpProgress = Math.round((charIdx / enLine.length) * jpLine.length);
          currentJpEl.textContent = jpLine.slice(0, jpProgress);
          charIdx++;
          setTimeout(typeChar, CHAR_MS);
        } else {
          lineIdx++;
          setTimeout(typeLine, LINE_PAUSE_MS);
        }
      }

      typeLine();
    }

    function bindActionButtons() {
      const yesBtn = drifterPanel.querySelector('#dp-yes-btn');
      if (yesBtn) yesBtn.addEventListener('click', () => {
        const newQuest = activateQuest(drifter.id);
        if (!newQuest) { closeDrifterPanel(); return; }
        closeDrifterPanel();
        setTimeout(() => {
          drifterPanelCooldown = 0;
          openDrifterPanel(drifter, newQuest);
        }, PANEL_SLIDE_MS + 20);
      });

      const replayBtn = drifterPanel.querySelector('#dp-replay-btn');
      if (replayBtn) {
        if (!currentAudioSrc) {
          replayBtn.disabled = true;
        } else {
          if (isMemoryPlaying) replayBtn.disabled = true;
          replayBtn.addEventListener('click', () => {
            if (isMemoryPlaying) return;
            isMemoryPlaying       = true;
            replayBtn.disabled    = true;
            replayBtn.textContent = '▶ Playing…';
            stopActiveAudio();
            const a = new Audio(currentAudioSrc);
            activeAudio = a;
            a.play().catch(() => {});
            a.onended = () => {
              if (activeAudio === a) activeAudio = null;
              isMemoryPlaying = false;
              if (replayBtn.isConnected) {
                replayBtn.disabled    = false;
                replayBtn.textContent = '▶ Play / 聴く';
              }
            };
          });
        }
      }

      const cancelQuestBtn = drifterPanel.querySelector('#dp-cancel-quest-btn');
      if (cancelQuestBtn) cancelQuestBtn.addEventListener('click', () => {
        stopActiveAudio();
        clearQuest();
        closeDrifterPanel();
      });

      const giveBtn = drifterPanel.querySelector('#dp-give-btn');
      if (giveBtn) giveBtn.addEventListener('click', () => {
        const q = getCachedQuest();
        if (!q || q.state !== 'collected') { closeDrifterPanel(); return; }
        const expectedMemKey = `${drifter.id}_a${String(q.memIdx).padStart(2,'0')}`;
        const correct = q.orbIsCorrect === true && q.collectedMemoryId === expectedMemKey;
        closeDrifterPanel();
        if (correct) {
          completeMemory(drifter.id, q.memIdx);
          startCelebration(drifter);
        } else {
          try { sessionStorage.setItem('karasuki_return_wrong_orb', q.collectedMemoryId || ''); } catch(_) {}
          showWrongMemoryMsg();
          markDrifterWrong(drifter.id);
          clearQuest();
          _lastWrongId = drifter.id;
          setTimeout(() => { drifterFadeStart = performance.now(); }, 1800);
        }
      });
    }
  }

  function closeDrifterPanel() {
    drifterPanelCooldown = performance.now() + POPUP_COOLDOWN_MS;
    drifterPanelOpen     = false;
    drifterPanel.classList.remove('open');
    stopActiveAudio();
    isMemoryPlaying = false;
    setTimeout(() => { state.inputLocked = false; }, PANEL_SLIDE_MS);
    try { music.play().catch(() => {}); } catch(_) {}
  }

  function showWrongMemoryMsg() {
    const msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;pointer-events:none;';
    msg.innerHTML = `<div style="background:rgba(247,242,232,0.97);border:1.5px solid #c8b48a;border-radius:10px;padding:24px 36px;text-align:center;font-family:Georgia,serif;box-shadow:0 8px 32px rgba(0,0,0,0.35);animation:utsuPopIn .22s ease-out;">
      <p style="margin:0 0 6px;font-size:1.04rem;color:#1e140a;">Sorry… this isn't for me.</p>
      <p style="margin:0;font-size:.84rem;color:#806040;">ごめん…これは私のじゃない。</p></div>`;
    document.body.appendChild(msg);
    setTimeout(() => { msg.style.opacity='0'; msg.style.transition='opacity .5s'; setTimeout(() => msg.remove(), 520); }, 3200);
  }

  /* ── soft dance sparkles ── */
  let danceSparkles = [];

  function spawnDanceSparkle(originX, originY) {
    const colors = ['#ffd700','#ffe066','#fff0a0','#c8960a','#ffffff','#fffde0'];
    const angle  = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 28;
    danceSparkles.push({
      x     : originX + Math.cos(angle) * radius,
      y     : originY + Math.sin(angle) * radius,
      vx    : (Math.random() - 0.5) * 0.35,
      vy    : -(0.2 + Math.random() * 0.4),
      life  : 1,
      size  : 0.8 + Math.random() * 1.8,
      color : colors[Math.floor(Math.random() * colors.length)],
      phase : Math.random() * Math.PI * 2,
    });
  }

  function startCelebration(drifter) {
    state.celebrating        = true;
    state.inputLocked        = true;
    state.celebrateSpinStart = performance.now();
    state.celebrateDrifter   = drifter;
    danceSparkles            = [];
    stopActiveAudio();
    try { music.pause(); } catch(_) {}

    const pos = drifterWorldPos(drifter, weeklyRooms[DATA.drifters.indexOf(drifter)]);
    state.celebrateOrbitX = pos.x;
    state.celebrateOrbitY = pos.y;

    const danceAudio = new Audio('./assets/audio/boo-dance.mp3');
    danceAudio.volume = 0.85;
    setTimeout(() => { danceAudio.play().catch(() => {}); }, 300);

    danceAudio.onended = () => {
      state.celebrateSettling    = true;
      state.celebrateSettleStart = performance.now();
      setTimeout(() => {
        state.celebrateDancing  = false;
        state.celebrateSettling = false;
        state.celebrating       = false;
        danceSparkles           = [];
        state.x = state.celebrateOrbitX;
        state.y = state.celebrateOrbitY;
        try { music.play().catch(() => {}); } catch(_) {}
        state.inputLocked = false;
        showThankYouPanel(drifter);
      }, 1000);
    };

    setTimeout(() => {
      if (state.celebrating) danceAudio.dispatchEvent(new Event('ended'));
    }, 18000);

    state.celebrateDancing = true;
  }

  function showThankYouPanel(drifter) {
    const ty = THANK_YOU[drifter.id] || { en:'Thank you!', jp:'ありがとう！' };
    const panel = document.createElement('div');
    panel.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;z-index:9200;
      background:linear-gradient(180deg,#f7f2e8 0%,#ede5d0 100%);
      border-top:2px solid #c8b48a;border-radius:20px 20px 0 0;
      box-shadow:0 -6px 32px rgba(0,0,0,0.5);
      font-family:'Georgia',serif;
      transform:translateY(100%);
      transition:transform 0.32s cubic-bezier(0.22,1,0.36,1);
      pointer-events:auto;`;
    panel.innerHTML = `
      <div style="max-width:480px;margin:0 auto;padding:14px clamp(14px,3.5vw,28px) 26px;">
        <div style="width:38px;height:4px;border-radius:2px;background:#c0aa80;margin:0 auto 14px;"></div>
        <div style="display:flex;align-items:flex-start;gap:clamp(10px,2.5vw,20px);">
          <div style="flex-shrink:0;width:clamp(60px,12vw,96px);height:clamp(60px,12vw,96px);border-radius:10px;border:1.5px solid #c8b48a;background:#e8dfc8;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img src="${drifter.sprite2}" alt="${drifter.name}" style="width:100%;height:100%;object-fit:contain;">
          </div>
          <div style="flex:1;min-width:0;">
            <p style="font-size:clamp(.62rem,1.7vw,.75rem);color:#9a7850;letter-spacing:.14em;text-transform:uppercase;margin:0 0 2px;">${drifter.name}</p>
            <div style="width:44px;height:1px;background:#c8b48a;margin:0 0 10px;"></div>
            <p style="font-size:clamp(.88rem,2.4vw,1.04rem);color:#1e140a;line-height:1.6;margin:0 0 4px;">${ty.en}</p>
            <p style="font-size:clamp(.76rem,2vw,.9rem);color:#6a5030;line-height:1.65;margin:0 0 14px;">${ty.jp}</p>
            <button id="ty-close-btn" style="background:transparent;border:1px solid #b8a478;color:#9a7850;font-family:'Georgia',serif;font-size:clamp(.73rem,1.9vw,.86rem);letter-spacing:.1em;cursor:pointer;padding:7px 20px;border-radius:4px;transition:all .16s;">Close / 閉じる</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(panel);
    requestAnimationFrame(() => requestAnimationFrame(() => { panel.style.transform = 'translateY(0)'; }));
    function dismissPanel() { panel.style.transform = 'translateY(100%)'; setTimeout(() => panel.remove(), 360); }
    panel.querySelector('#ty-close-btn').addEventListener('click', dismissPanel);
    setTimeout(dismissPanel, CELEBRATE_MS - 800 + 600);
  }

  /* ═══════════════════════════════════════════
     DOM BUILD
  ═══════════════════════════════════════════ */
  function buildApp() {
    app      = document.createElement('div'); app.id = 'utsuroba-app';
    stage    = document.createElement('div'); stage.id = 'utsuroba-stage';
    roomLayer= document.createElement('div'); roomLayer.id = 'utsuroba-room-layer';
    canvas   = document.createElement('canvas'); canvas.id = 'buki-canvas';
    const fade = document.createElement('div'); fade.id = 'buki-fade';
    stage.appendChild(roomLayer); stage.appendChild(canvas); stage.appendChild(fade);
    app.appendChild(stage);
    const toast = document.createElement('div'); toast.id = 'buki-copy-toast'; toast.textContent = 'copied!';
    document.body.innerHTML = '';
    document.body.appendChild(app);
    document.body.appendChild(toast);
    injectExitPopOverlay();
    buildDrifterPanel();
    if (DEV_MODE) { injectDevPanel(); }
    const ro = document.createElement('div'); ro.id = 'rotate-overlay';
    ro.innerHTML = `<span class="rotate-phone">📱</span><div class="rotate-bar"></div><p class="rotate-title">横にして遊ぼう！</p><p class="rotate-sub">うつろばは<strong style="color:#c45fa3">横画面</strong>で遊べるよ。<br>スマホを横にしてね。</p>`;
    document.body.appendChild(ro);
    ctx = canvas.getContext('2d');
  }

  /* ═══════════════════════════════════════════
     CANVAS / FIT
  ═══════════════════════════════════════════ */
  function resizeCanvas() {
    canvas.style.width = WORLD_W+'px'; canvas.style.height = WORLD_H+'px';
    canvas.width  = Math.round(WORLD_W*MAX_DPR);
    canvas.height = Math.round(WORLD_H*MAX_DPR);
    ctx.setTransform(MAX_DPR,0,0,MAX_DPR,0,0);
  }
  function fitStage() {
    const scale = Math.max(window.innerWidth/WORLD_W, window.innerHeight/WORLD_H);
    stage.style.transform = `translate(-50%,-50%) scale(${scale})`;
  }

  /* ═══════════════════════════════════════════
     PERF
  ═══════════════════════════════════════════ */
  function updatePerfTier(now) {
    if (perfTier === 'low') return;
    perfFrameCount++;
    if (perfFrameCount === 1) { perfFirstTime = now; return; }
    if (perfFrameCount === 90) { const avg = 89/((now-perfFirstTime)/1000); if (avg < 40) { perfTier = 'low'; shadowsEnabled = false; } }
  }

  /* ═══════════════════════════════════════════
     COORD MODE
  ═══════════════════════════════════════════ */
  function toggleCoordMode() {
    state.coordMode = !state.coordMode;
    if (coordToggle) coordToggle.classList.toggle('active', state.coordMode);
    if (coordReadout) coordReadout.classList.toggle('show', state.coordMode);
    if (pinLog) {
      pinLog.classList.toggle('show', state.coordMode);
      pinLog.querySelector('.log-header span').textContent = `PINS — ${state.roomId}`;
    }
  }
  function dropPin(wx,wy) { const label = `${Math.round(wx)}, ${Math.round(wy)}`; pins.push({x:wx,y:wy,label}); renderPinLog(); copyText(label); showToast(`pinned ${label}`); }
  function renderPinLog() {
    const rows = document.getElementById('buki-pin-rows'); if (!rows) return;
    rows.innerHTML = pins.map((p,i) => `<div class="pin-row" data-i="${i}"><span class="pin-idx">${i+1}</span><span class="pin-coords">${p.label}</span><span class="pin-copy">copy</span></div>`).join('');
    rows.querySelectorAll('.pin-row').forEach(row => row.addEventListener('click', () => { const pin = pins[+row.dataset.i]; if (pin) { copyText(pin.label); showToast(`copied ${pin.label}`); } }));
  }
  let toastTimer = null;
  function showToast(msg) { const t = document.getElementById('buki-copy-toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1400); }
  async function copyText(txt) { try { await navigator.clipboard.writeText(txt); return; } catch(_) {} try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch(_) {} }

  /* ═══════════════════════════════════════════
     ROOM HELPERS
  ═══════════════════════════════════════════ */
  function getRoom()  { return DATA.rooms[state.roomId]; }
  function getSpawn(room, spawnId) {
    const sp = room.spawns?.[spawnId] || room.spawns?.default;
    if (!sp) return { x:CENTER_X, y:CENTER_Y };
    return spawnToWorld(sp);
  }
  function placeGhost(x,y) { state.x = x; state.y = y; }
  function makeBg(src) { const img = document.createElement('img'); img.className = 'utsuroba-bg'; img.src = src; return img; }
  let currentBg;

  function renderInitialRoom() {
    const room = getRoom(); currentBg = makeBg(room.bg); roomLayer.appendChild(currentBg);
    const spawn = getSpawn(room, state.spawnId);
    placeGhost(ENTER_START_X, ENTER_START_Y);
    state.spawnX = spawn.x; state.spawnY = spawn.y;
    state.travelingToCenter = true; state.inputLocked = true;
    state.clickTarget = { x:spawn.x, y:spawn.y };
    const now = performance.now();
    state.transitionReadyAt = now + TRANSITION_COOLDOWN_MS;
    arrivalArrowHiddenUntil     = now + ARRIVAL_ARROW_DELAY_MS;
    arrivalArrowBackHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER;
    state.distMovedSinceSpawn = 0; state.moving = false; state.spawnLockUntil = now+500;
  }

  function arriveInRoom(nextRoom, spawnId, arrivalDir) {
    const spawn = getSpawn(nextRoom, spawnId);
    placeGhost(spawn.x, spawn.y);
    state.travelingToCenter = true; state.inputLocked = true;
    state.clickTarget = { x:CENTER_X, y:CENTER_Y };
    state.arrivalDir = arrivalDir || null;
    trail = []; pins = [];
    const now = performance.now();
    state.transitionReadyAt = now + TRANSITION_COOLDOWN_MS;
    arrivalArrowHiddenUntil     = now + ARRIVAL_ARROW_DELAY_MS;
    arrivalArrowBackHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER;
    state.distMovedSinceSpawn = 0; state.spawnLockUntil = now+800;
    if (pinLog) { const lh = pinLog.querySelector('.log-header span'); if (lh) lh.textContent = `PINS — ${state.roomId}`; renderPinLog(); }
  }

  /* ═══════════════════════════════════════════
     COLLISION
  ═══════════════════════════════════════════ */
  function clampToWorld(nx,ny) { return { x:Math.max(GHOST_RADIUS,Math.min(WORLD_W-GHOST_RADIUS,nx)), y:Math.max(GHOST_RADIUS,Math.min(WORLD_H-GHOST_RADIUS,ny)) }; }
  function pointInRect(px,py,r) { return px>=r.x && px<=r.x+r.w && py>=r.y && py<=r.y+r.h; }
  function canMoveTo(nx,ny) { const rects = getRoom()?.collisions||[]; if (!rects.length) return true; for (const r of rects) { if (pointInRect(nx,ny,r)) return true; } return false; }
  function tryMove(nx,ny) {
    const c = clampToWorld(nx,ny); if (canMoveTo(c.x,c.y)) { placeGhost(c.x,c.y); return true; }
    const tx = clampToWorld(nx,state.y); if (canMoveTo(tx.x,tx.y)) { placeGhost(tx.x,tx.y); return true; }
    const ty = clampToWorld(state.x,ny); if (canMoveTo(ty.x,ty.y)) { placeGhost(ty.x,ty.y); return true; }
    return false;
  }

  /* ═══════════════════════════════════════════
     TRANSITIONS
  ═══════════════════════════════════════════ */
  function transitionTo(exit) {
    if (!exit?.to || state.transitioning) return;
    const nextRoom = DATA.rooms[exit.to]; if (!nextRoom) return;
    state.transitioning = true; state.clickTarget = null; state.inputLocked = true;
    const fadeEl = document.getElementById('buki-fade');
    fadeEl.style.transition = `opacity ${FADE_MS/2}ms ease-in`; fadeEl.style.opacity = '1';
    setTimeout(() => {
      const nextBg = makeBg(nextRoom.bg); roomLayer.innerHTML = ''; roomLayer.appendChild(nextBg); currentBg = nextBg;
      state.roomId  = exit.to; state.spawnId = exit.spawn || 'default';
      arriveInRoom(nextRoom, state.spawnId, exit.dir);
      fadeEl.style.transition = `opacity ${FADE_MS/2}ms ease-out`; fadeEl.style.opacity = '0';
      setTimeout(() => { state.transitioning = false; }, FADE_MS/2+30);
    }, FADE_MS/2+20);
  }

  function getNPPExit(now) {
    if (now < state.transitionReadyAt || state.inputLocked) return null;
    const npps = NPP[state.roomId]; if (!npps) return null;
    const OPP = { left:'right', right:'left', up:'down', down:'up' };
    const arrivalExit = state.arrivalDir ? OPP[state.arrivalDir] : null;
    for (const npp of npps) {
      if (Math.hypot(state.x-npp.x, state.y-npp.y) <= NPP_RADIUS) {
        if (npp.dir === arrivalExit && now < arrivalArrowBackHiddenUntil) return null;
        return npp;
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════
     TRAIL
  ═══════════════════════════════════════════ */
  function addTrailParticle(x,y,now) {
    const interval = perfTier === 'low' ? 90 : 45;
    if (now - state.lastTrailT < interval) return;
    state.lastTrailT = now;
    const [col1,col2] = roomColorPair(state.roomId);
    const maxT = perfTier === 'low' ? 30 : TRAIL_MAX;
    trail.push({x:x+(Math.random()-.5)*10, y:y+GHOST_R*.55+(Math.random()-.5)*8, vx:(Math.random()-.5)*.4, vy:-Math.random()*.5, life:1, size:2+Math.random()*4.5, color:Math.random()>.5?col1:col2});
    if (trail.length > maxT) trail.shift();
  }

  /* ═══════════════════════════════════════════
     DRAW EXIT ARROWS
  ═══════════════════════════════════════════ */
  function drawExitArrows(now) {
    const npps = NPP[state.roomId]; if (!npps) return;
    const moveReveal   = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    const totalReveal  = Math.max(0.35, moveReveal);
    const sec = now/1000; const [col1,col2] = roomColorPair(state.roomId);
    const OPP = { left:'right', right:'left', up:'down', down:'up' };
    const arrivalExit = state.arrivalDir ? OPP[state.arrivalDir] : null;
    npps.forEach((npp,i) => {
      if (!npp.dir) return;
      const isBack     = npp.dir === arrivalExit;
      const hiddenUntil= isBack ? arrivalArrowBackHiddenUntil : arrivalArrowHiddenUntil;
      const delayRem   = hiddenUntil - now; if (delayRem > 400) return;
      const rf         = Math.min(1, Math.max(0, 1 - delayRem/(isBack ? ARRIVAL_ARROW_DELAY_MS*ARRIVAL_ARROW_BACK_MULTIPLIER : ARRIVAL_ARROW_DELAY_MS)));
      const angle      = DIR_ANGLE[npp.dir] ?? 0;
      const pulse      = 0.5+0.5*Math.sin(sec*2.2+i*1.3);
      const bounce     = Math.sin(sec*2.2+i*1.3)*6;
      const ax         = npp.x+Math.cos(angle)*bounce, ay = npp.y+Math.sin(angle)*bounce;
      const fa         = rf * totalReveal;
      ctx.save(); ctx.translate(ax,ay); ctx.rotate(angle);
      const ga = ctx.createRadialGradient(0,0,0,0,0,40); ga.addColorStop(0,col1); ga.addColorStop(1,'transparent');
      ctx.globalAlpha = fa*(0.10+pulse*0.08); ctx.fillStyle = ga; ctx.beginPath(); ctx.arc(0,0,40,0,Math.PI*2); ctx.fill();
      [{ox:-11,a:0.65},{ox:4,a:1.0}].forEach(({ox,a}) => {
        ctx.globalAlpha = fa*a*(0.38+pulse*0.32); ctx.strokeStyle = col1; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (shadowsEnabled) { ctx.shadowBlur = 12; ctx.shadowColor = col2; }
        ctx.beginPath(); ctx.moveTo(ox-7,-10); ctx.lineTo(ox+7,0); ctx.lineTo(ox-7,10); ctx.stroke(); ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = fa*(0.60+pulse*0.38); ctx.fillStyle = '#fff';
      if (shadowsEnabled) { ctx.shadowBlur = 14; ctx.shadowColor = col1; }
      ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
    });
  }

  function drawKarasukiExitArrow(now) {
    if (state.roomId !== KARASUKI_EXIT.roomId) return;
    const moveReveal  = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    const totalReveal = window.__devUtsuExit ? 1 : Math.max(0.35, moveReveal);
    const sec=now/1000, pulse=0.5+0.5*Math.sin(sec*1.6), bounce=Math.sin(sec*1.6)*7;
    const ax=exitPxX(), ay=exitPxY()+bounce;
    const col1='#6b1a2a', col2='#a03050', col3='#c06080';
    ctx.save();
    const amb = ctx.createRadialGradient(ax,ay,0,ax,ay,52); amb.addColorStop(0,col1+'44'); amb.addColorStop(.5,col2+'22'); amb.addColorStop(1,'transparent');
    ctx.globalAlpha = totalReveal*(0.18+pulse*0.12); ctx.fillStyle = amb; ctx.beginPath(); ctx.arc(ax,ay,52,0,Math.PI*2); ctx.fill();
    ctx.save(); ctx.translate(ax,ay); ctx.rotate(Math.PI/2);
    [{ox:-12,a:0.5},{ox:5,a:0.9}].forEach(({ox,a}) => {
      ctx.globalAlpha = totalReveal*a*(0.35+pulse*0.32); ctx.strokeStyle = col2; ctx.lineWidth = 2.8; ctx.lineCap='round'; ctx.lineJoin='round';
      if (shadowsEnabled) { ctx.shadowBlur=12; ctx.shadowColor=col1; }
      ctx.beginPath(); ctx.moveTo(ox-8,-11); ctx.lineTo(ox+8,0); ctx.lineTo(ox-8,11); ctx.stroke(); ctx.shadowBlur=0;
    }); ctx.restore();
    ctx.globalAlpha = totalReveal*(0.65+pulse*0.28);
    if (shadowsEnabled) { ctx.shadowBlur=16; ctx.shadowColor=col2; }
    const dg = ctx.createRadialGradient(ax,ay,0,ax,ay,6); dg.addColorStop(0,col3); dg.addColorStop(.5,col2); dg.addColorStop(1,'transparent');
    ctx.fillStyle=dg; ctx.beginPath(); ctx.arc(ax,ay,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.globalAlpha = totalReveal*(0.50+pulse*0.22);
    ctx.font='bold 12px monospace'; ctx.fillStyle=col3; ctx.textAlign='center';
    if (shadowsEnabled) { ctx.shadowBlur=8; ctx.shadowColor=col1; }
    ctx.fillText('LEAVE',ax,ay-26); ctx.shadowBlur=0; ctx.textAlign='left'; ctx.restore();
  }

  function checkKarasukiExit() {
    if (state.roomId !== KARASUKI_EXIT.roomId || state.inputLocked) return;
    if (performance.now() < exitPopCooldownUntil) return;
    if (!window.__devUtsuExit && state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    if (Math.hypot(state.x-exitPxX(), state.y-exitPxY()) <= KARASUKI_EXIT.r) { state.clickTarget=null; state.moving=false; openExitPop(); }
  }
  function clickCheckKarasukiExit(wx,wy) {
    if (state.roomId !== KARASUKI_EXIT.roomId) return false;
    if (performance.now() < exitPopCooldownUntil) return false;
    if (Math.hypot(wx-exitPxX(), wy-exitPxY()) <= KARASUKI_EXIT.r) { openExitPop(); return true; }
    return false;
  }

  /* ═══════════════════════════════════════════
     DRAW DRIFTERS
  ═══════════════════════════════════════════ */
  function drawDrifters(now) {
    const drifters = driftersForRoom(state.roomId);
    if (!drifters.length) return;
    const quest = getCachedQuest();
    const sec   = now / 1000;

    drifters.forEach(drifter => {
      const hasMemories = drifterHasMemories(drifter.id);
      const isWaiting   = !!(quest && quest.active === drifter.id && quest.state === 'accepted');
      const isCollected = !!(quest && quest.active === drifter.id && quest.state === 'collected');
      const questActive = isWaiting || isCollected;
      const useImg2     = !!(quest && quest.active === drifter.id);
      const imgs        = drifterImgs[drifter.id];
      const img         = useImg2 ? imgs.img2 : imgs.img1;
      const pos         = drifterWorldPos(drifter, state.roomId);

      const dw = img.naturalWidth  * drifter.scale;
      const dh = img.naturalHeight * drifter.scale;

      /* ── wrong-memory fade ── */
      const FADE_OUT_MS = 2500;
      if (drifterIsWrong(drifter.id) && drifterFadeStart === 0) return;
      let alpha;
      if (drifterFadeStart > 0 && _lastWrongId === drifter.id) {
        const elapsed = now - drifterFadeStart;
        alpha = Math.max(0, 1 - elapsed / FADE_OUT_MS);
        if (alpha === 0) { drifterFadeStart = 0; return; }
      } else {
        alpha = (hasMemories || drifter.memoryCount === 0) ? 1 : 0.35;
      }

      if (questActive) {
        const slowPulse = 0.5 + 0.5 * Math.sin(sec * 1.4);
        const bloomR    = Math.max(dw, dh) * 1.1 + slowPulse * 18;
        const cx = pos.x, cy = pos.y - dh * 0.5;
        ctx.save();
        const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR);
        bloom.addColorStop(0,   `rgba(255,210,60,${0.55 + slowPulse*0.30})`);
        bloom.addColorStop(0.45,`rgba(255,160,20,${0.22 + slowPulse*0.18})`);
        bloom.addColorStop(0.75,`rgba(255,100,10,${0.08 + slowPulse*0.06})`);
        bloom.addColorStop(1,   'transparent');
        ctx.globalAlpha = 1;
        ctx.fillStyle   = bloom;
        ctx.beginPath(); ctx.arc(cx, cy, bloomR, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      if (img.complete && img.naturalWidth > 0) {
        if (shadowsEnabled && (hasMemories || drifter.memoryCount === 0)) {
          ctx.shadowBlur  = questActive ? 28 : 18;
          ctx.shadowColor = questActive
            ? (isCollected ? '#44ffaa' : '#ffcc40')
            : '#d8c0f8';
        }
        ctx.drawImage(img, pos.x-dw/2, pos.y-dh, dw, dh);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#c090e8';
        ctx.beginPath(); ctx.arc(pos.x, pos.y-40, 24, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     DRAW PINS
  ═══════════════════════════════════════════ */
  function drawPins(now) {
    if (!state.coordMode || !pins.length) return;
    const sec = now/1000;
    pins.forEach((p,i) => {
      const pulse = 0.5+0.5*Math.sin(sec*3+i);
      ctx.save(); ctx.globalAlpha = 0.80+pulse*0.18; ctx.strokeStyle = '#ff8ae2'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(p.x-14,p.y); ctx.lineTo(p.x+14,p.y); ctx.moveTo(p.x,p.y-14); ctx.lineTo(p.x,p.y+14); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.fillStyle = '#ff4fc8'; if (shadowsEnabled) { ctx.shadowBlur=8; ctx.shadowColor='#ff8ae2'; }
      ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.font = 'bold 10px monospace'; const tw = ctx.measureText(p.label).width, bx=p.x+10, by=p.y-18;
      ctx.globalAlpha = 0.88; ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.beginPath(); ctx.roundRect(bx-4,by-11,tw+10,15,5); ctx.fill();
      ctx.fillStyle = '#ff8ae2'; ctx.globalAlpha = 1; ctx.fillText(`${i+1}. ${p.label}`,bx+1,by); ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     MAIN DRAW FRAME
  ═══════════════════════════════════════════ */
  function drawFrame(now) {
    ctx.clearRect(0,0,WORLD_W,WORLD_H);
    const sec = now/1000; const [col1,col2] = roomColorPair(state.roomId);

    for (let i = ripples.length-1; i >= 0; i--) {
      const rp = ripples[i]; rp.life -= 0.038; if (rp.life <= 0) { ripples.splice(i,1); continue; }
      ctx.save(); ctx.globalAlpha = rp.life*0.72; ctx.strokeStyle = col1+'cc'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(rp.x,rp.y,(1-rp.life)*38+5,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }
    for (let i = trail.length-1; i >= 0; i--) {
      const p = trail[i];
      const gr = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2.4);
      gr.addColorStop(0,p.color); gr.addColorStop(1,'transparent');
      ctx.globalAlpha = p.life*0.48; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*2.4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = p.life*0.90; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1; p.life -= 0.022; p.x += p.vx; p.y += p.vy;
    }
    trail = trail.filter(p => p.life > 0);

    drawDrifters(now);
    drawExitArrows(now);
    drawKarasukiExitArrow(now);

    /* Ghost */
    const bobFreq  = (Math.PI*2)/(HOVER_PERIOD/1000);
    const bobPhase = sec * bobFreq;
    const bob      = Math.sin(bobPhase) * HOVER_AMP;
    const pulse    = 0.5+0.5*Math.sin(sec*2.1);

    /* ── Dance celebration ── */
    let gx, gy, wobble, sx, sy;
    if (state.celebrateDancing) {
      const elapsed = (now - state.celebrateSpinStart) / 1000;

      const settleEase = state.celebrateSettling
        ? Math.max(0, 1 - ((now - state.celebrateSettleStart) / 900))
        : 1;

      const driftX = (Math.sin(elapsed * 1.1) * 60 + Math.sin(elapsed * 2.3) * 25) * settleEase;
      const driftY = (Math.cos(elapsed * 1.4) * 40 + Math.cos(elapsed * 2.9) * 16) * settleEase;
      const bigBob = (Math.sin(elapsed * 6.2) * 20 + Math.sin(elapsed * 3.7) * 9) * settleEase;

      const spinAngle = elapsed * 3.8 * settleEase;
      const beat      = Math.sin(elapsed * 6.2);
      sx = (1.0 + beat * 0.18) * settleEase + (1 - settleEase);
      sy = (1.0 - beat * 0.22) * settleEase + (1 - settleEase);

      gx     = state.celebrateOrbitX + driftX;
      gy     = state.celebrateOrbitY + driftY + bigBob;
      wobble = spinAngle * (180 / Math.PI);

      if (settleEase > 0 && Math.random() < 0.45) spawnDanceSparkle(gx, gy);

      for (let i = danceSparkles.length - 1; i >= 0; i--) {
        const sp = danceSparkles[i];
        sp.life -= 0.014;
        if (sp.life <= 0) { danceSparkles.splice(i, 1); continue; }
        sp.x += sp.vx; sp.y += sp.vy;
        const twinkle = 0.5 + 0.5 * Math.sin(now / 100 + sp.phase);
        ctx.save();
        ctx.globalAlpha = sp.life * twinkle * 0.9;
        if (shadowsEnabled) { ctx.shadowBlur = 6; ctx.shadowColor = '#ffd700'; }
        ctx.fillStyle = sp.color;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.restore();
      }

    } else {
      gx     = state.x;
      gy     = state.y + bob;
      wobble = Math.sin(bobPhase*2) * 2.2;
      sx     = 1-Math.sin(bobPhase)*0.07;
      sy     = (1+Math.sin(bobPhase)*0.10) * (state.moving?1.08:1.0);
    }

    ctx.save(); ctx.globalAlpha = 0.22+pulse*0.12;
    const halo     = ctx.createRadialGradient(gx,gy+3,0,gx,gy+3,GHOST_R*2.2);
    const haloCol1 = state.celebrating ? '#ffd700' : col1;
    const haloCol2 = state.celebrating ? '#ffaa00' : col2;
    halo.addColorStop(0,haloCol1); halo.addColorStop(0.5,haloCol2); halo.addColorStop(1,'transparent');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(gx,gy+3,GHOST_R*2.2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.18+pulse*0.07;
    const shd = ctx.createRadialGradient(gx,gy+GHOST_R*.85,0,gx,gy+GHOST_R*.85,GHOST_R*.9);
    shd.addColorStop(0,'rgba(0,0,0,.65)'); shd.addColorStop(1,'transparent');
    ctx.fillStyle = shd; ctx.beginPath(); ctx.arc(gx,gy+GHOST_R*.85,GHOST_R*.9,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(gx,gy); ctx.rotate(wobble*Math.PI/180); ctx.scale(sx,sy);
    if (ghostImg.complete && ghostImg.naturalWidth > 0) {
      if (shadowsEnabled) {
        ctx.shadowBlur  = state.celebrating ? 28+pulse*14 : 14+pulse*8;
        ctx.shadowColor = state.celebrating ? '#ffd700' : col1;
      }
      ctx.drawImage(ghostImg,-GHOST_R,-GHOST_R,GHOST_R*2,GHOST_R*2); ctx.shadowBlur=0;
    } else { ctx.globalAlpha=1; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,0,GHOST_R*.7,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
    if (state.coordMode) drawPins(now);
  }

  /* ═══════════════════════════════════════════
     CENTER TRAVEL
  ═══════════════════════════════════════════ */
  function handleCenterTravel(now) {
    if (!state.travelingToCenter) return;
    const tx = state.clickTarget?.x ?? CENTER_X, ty = state.clickTarget?.y ?? CENTER_Y;
    const dx = tx-state.x, dy = ty-state.y, dist = Math.hypot(dx,dy);
    if (dist <= ARRIVE_DIST) { state.travelingToCenter=false; state.inputLocked=false; state.clickTarget=null; state.moving=false; return; }
    const prevX=state.x, prevY=state.y;
    const moved = tryMove(state.x+(dx/dist)*SPEED, state.y+(dy/dist)*SPEED);
    state.moving = moved;
    if (moved) { state.distMovedSinceSpawn += Math.hypot(state.x-prevX,state.y-prevY); addTrailParticle(state.x,state.y,now); }
    else { state.travelingToCenter=false; state.inputLocked=false; state.clickTarget=null; state.moving=false; }
  }

  /* ═══════════════════════════════════════════
     PLAYER MOVEMENT
  ═══════════════════════════════════════════ */
  function handleClickMovement(now) {
    if (state.travelingToCenter || state.inputLocked) return;
    if (!state.clickTarget) { state.moving = false; return; }
    const tx=state.clickTarget.x, ty=state.clickTarget.y;
    const dx=tx-state.x, dy=ty-state.y, dist=Math.hypot(dx,dy);
    if (dist <= CLICK_STOP_DIST) { state.clickTarget=null; state.moving=false; return; }
    const prevX=state.x, prevY=state.y;
    const moved = tryMove(state.x+(dx/dist)*SPEED, state.y+(dy/dist)*SPEED);
    state.moving = moved;
    if (!moved) { state.clickTarget=null; state.moving=false; }
    else { state.distMovedSinceSpawn += Math.hypot(state.x-prevX,state.y-prevY); addTrailParticle(state.x,state.y,now); }
  }

  /* ═══════════════════════════════════════════
     DRIFTER HIT CHECK
  ═══════════════════════════════════════════ */
  function tapInNPPZone(wx,wy) {
    const npps = NPP[state.roomId]; if (!npps) return false;
    for (const npp of npps) {
      if (Math.hypot(wx-npp.x, wy-npp.y) <= NPP_RADIUS) return true;
    }
    if (state.roomId === KARASUKI_EXIT.roomId &&
        Math.hypot(wx-exitPxX(), wy-exitPxY()) <= KARASUKI_EXIT.r) return true;
    return false;
  }

  function clickCheckDrifter(wx,wy) {
    if (state.inputLocked || drifterPanelOpen) return false;
    if (tapInNPPZone(wx,wy)) return false;
    const drifters = driftersForRoom(state.roomId);
    for (const drifter of drifters) {
      const pos         = drifterWorldPos(drifter, state.roomId);
      const imgs = drifterImgs[drifter.id];
      const img  = imgs.img1;
      const dw   = img.naturalWidth  * drifter.scale;
      const dh   = img.naturalHeight * drifter.scale;
      if (wx >= pos.x-dw/2 && wx <= pos.x+dw/2 && wy >= pos.y-dh && wy <= pos.y) {
        openDrifterPanel(drifter); return true;
      }
    }
    return false;
  }

  /* ═══════════════════════════════════════════
     UNIFIED TAP HANDLER
  ═══════════════════════════════════════════ */
  function handleWorldTap(wx,wy) {
    if (state.coordMode) { dropPin(wx,wy); ripples.push({x:wx,y:wy,life:1}); return; }
    if (clickCheckKarasukiExit(wx,wy)) { ripples.push({x:wx,y:wy,life:1}); return; }
    if (clickCheckDrifter(wx,wy))      { ripples.push({x:wx,y:wy,life:1}); return; }
    state.clickTarget = { x:wx, y:wy }; ripples.push({x:wx,y:wy,life:1});
  }

  /* ═══════════════════════════════════════════
     MODAL GUARD
  ═══════════════════════════════════════════ */
  function anyModalOpen() {
    return (
      state.transitioning     ||
      state.exitingToKarasuki ||
      state.celebrating       ||
      drifterPanelOpen        ||
      isExitPopOpen()
    );
  }

  /* ═══════════════════════════════════════════
     MAIN LOOP
  ═══════════════════════════════════════════ */
  function tick(now) {
    updatePerfTier(now);
    const dt = Math.min(50, Math.max(8, now-(lastTickTime||now)));
    lastTickTime = now; SPEED = BASE_SPEED * (dt/TARGET_DT);
    if (!anyModalOpen()) {
      if (state.travelingToCenter) { handleCenterTravel(now); }
      else {
        handleClickMovement(now);
        const unlocked = now >= state.spawnLockUntil && state.distMovedSinceSpawn >= ARROW_MOVE_THRESHOLD;
        if (unlocked) checkKarasukiExit();
        if (unlocked) { const exit = getNPPExit(now); if (exit) { state.clickTarget=null; state.moving=false; transitionTo(exit); } }
      }
    }
    drawFrame(now);
    requestAnimationFrame(tick);
  }

  /* ═══════════════════════════════════════════
     MUSIC + INPUT
  ═══════════════════════════════════════════ */
  function startMusic() { if (state.musicStarted) return; state.musicStarted=true; music.play().catch(()=>{}); }

  function stagePointToWorld(cx,cy) {
    const rect = stage.getBoundingClientRect();
    return clampToWorld(((cx-rect.left)/rect.width)*WORLD_W, ((cy-rect.top)/rect.height)*WORLD_H);
  }

  function bindInput() {
    stage.addEventListener('mousemove', e => {
      if (!state.coordMode) return;
      const p  = stagePointToWorld(e.clientX, e.clientY);
      const el = document.getElementById('buki-coord-xy'); if (el) el.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
    });
    stage.addEventListener('click', e => {
      startMusic();
      if (state.transitioning || state.travelingToCenter || state.inputLocked) return;
      const p = stagePointToWorld(e.clientX, e.clientY);
      handleWorldTap(p.x, p.y);
    });
    stage.addEventListener('touchend', e => {
      startMusic();
      if (state.transitioning || state.travelingToCenter || state.inputLocked) { e.preventDefault(); return; }
      if (!e.changedTouches.length) return;
      const t0 = e.changedTouches[0];
      const p  = stagePointToWorld(t0.clientX, t0.clientY);
      handleWorldTap(p.x, p.y);
      e.preventDefault();
    }, { passive:false });
    document.addEventListener('click',    startMusic, { once:true });
    document.addEventListener('touchend', startMusic, { once:true, passive:true });
  }

  function markVisited() {
    try {
      const d = loadSave();
      if (d.utsuroba.flags.visited) return;
      d.utsuroba.flags.visited = true;
      writeSave(d);
    } catch(_) {}
  }

  /* ═══════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════ */
  function init() {
    injectStyles();
    buildApp();
    fitStage();
    resizeCanvas();
    renderInitialRoom();
    bindInput();
    window.addEventListener('resize', () => { fitStage(); resizeCanvas(); });
    markVisited();
    requestAnimationFrame(tick);
  }

  init();

  Object.defineProperty(window, 'b_4911', {
    value: () => {
      if (typeof injectDevPanel === 'function') injectDevPanel();
    },
    writable: false,
    configurable: false,
    enumerable: false
  });

})();
