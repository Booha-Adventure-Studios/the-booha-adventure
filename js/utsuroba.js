
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
  const BASE_SPEED      = 3.2;
  const FADE_MS         = 600;
  const CLICK_STOP_DIST = 6;
  const HOVER_AMP       = 9;
  const HOVER_PERIOD    = 1500;
  const TRAIL_MAX       = 90;
  const TARGET_DT       = 1000 / 60;

  /* Center of the world — ghost always travels here on room enter */
  const CENTER_X = WORLD_W * 0.5;   // 768
  const CENTER_Y = WORLD_H * 0.5;   // 512

  /* Ghost is "arrived" when within this many px of center target */
  const ARRIVE_DIST = 10;

  let lastTickTime = 0;
  let SPEED        = BASE_SPEED;

  const MAX_DPR = Math.min(window.devicePixelRatio || 1, 2);

  let perfTier       = 'high';
  let perfFrameCount = 0;
  let perfFirstTime  = 0;
  let shadowsEnabled = true;

  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  let   NPP_RADIUS    = isTouchDevice ? 58 : 40;

  const ARRIVAL_ARROW_DELAY_MS        = 2000;
  const ARRIVAL_ARROW_BACK_MULTIPLIER = 3;
  const TRANSITION_COOLDOWN_MS        = 1400;
  const ARROW_MOVE_THRESHOLD          = 30;
  const POPUP_COOLDOWN_MS             = 900;
  const DRIFTER_HIT_R                 = isTouchDevice ? 60 : 44;
  const DRIFTER_SPRITE_SIZE           = 96; // px drawn on canvas

  const KARASUKI_EXIT = {
    roomId : 'room_03',
    /* stored as world fractions, resolved at runtime */
    px     : 762 / WORLD_W,
    py     : 816 / WORLD_H,
    r      : isTouchDevice ? 58 : 44,
    href   : 'karasuki.html',
  };

  /* ═══════════════════════════════════════════
     DEV MODE
  ═══════════════════════════════════════════ */
  const DEV_MODE = true; // ← flip false before deploying

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
    const n = parseInt((roomId || 'room_01').replace(/\D/g,''), 10) || 1;
    return MONTH_COLORS[(n - 1) % MONTH_COLORS.length];
  }

  /* ═══════════════════════════════════════════
     COORDINATE HELPERS
     Spawns stored as fractions (0‒1).
     NPP stored in raw world px (unchanged).
     All draw/hit code uses world px.
  ═══════════════════════════════════════════ */
  function spawnToWorld(sp) {
    return { x: sp.x * WORLD_W, y: sp.y * WORLD_H };
  }

  function exitPxX() { return KARASUKI_EXIT.px * WORLD_W; }
  function exitPxY() { return KARASUKI_EXIT.py * WORLD_H; }

  /* ═══════════════════════════════════════════
     NPP — raw world coords (unchanged from original)
  ═══════════════════════════════════════════ */
  const NPP = {
    room_01: [
      { dir: 'right', x: 1134, y: 473, to: 'room_02', spawn: 'fromLeft'  },
      { dir: 'up',    x: 631,  y: 308, to: 'room_06', spawn: 'fromDown'  }
    ],
    room_02: [
      { dir: 'left',  x: 409,  y: 597, to: 'room_01', spawn: 'fromRight' },
      { dir: 'right', x: 1131, y: 470, to: 'room_03', spawn: 'fromLeft'  },
      { dir: 'up',    x: 559,  y: 318, to: 'room_07', spawn: 'fromDown'  }
    ],
    room_03: [
      { dir: 'left',  x: 411,  y: 426, to: 'room_02', spawn: 'fromRight' },
      { dir: 'right', x: 1086, y: 426, to: 'room_04', spawn: 'fromLeft'  },
      { dir: 'up',    x: 760,  y: 346, to: 'room_08', spawn: 'fromDown'  }
    ],
    room_04: [
      { dir: 'left',  x: 382,  y: 611, to: 'room_03', spawn: 'fromRight' },
      { dir: 'right', x: 1101, y: 504, to: 'room_05', spawn: 'fromLeft'  },
      { dir: 'up',    x: 711,  y: 329, to: 'room_09', spawn: 'fromDown'  }
    ],
    room_05: [
      { dir: 'left',  x: 413,  y: 605, to: 'room_04', spawn: 'fromRight' },
      { dir: 'up',    x: 710,  y: 309, to: 'room_10', spawn: 'fromDown'  }
    ],
    room_06: [
      { dir: 'right', x: 1069, y: 488, to: 'room_07', spawn: 'fromLeft'  },
      { dir: 'up',    x: 695,  y: 307, to: 'room_11', spawn: 'fromDown'  },
      { dir: 'down',  x: 999,  y: 756, to: 'room_01', spawn: 'fromUp'    }
    ],
    room_07: [
      { dir: 'left',  x: 361,  y: 610, to: 'room_06', spawn: 'fromRight' },
      { dir: 'right', x: 1111, y: 497, to: 'room_08', spawn: 'fromLeft'  },
      { dir: 'up',    x: 705,  y: 326, to: 'room_12', spawn: 'fromDown'  },
      { dir: 'down',  x: 995,  y: 759, to: 'room_02', spawn: 'fromUp'    }
    ],
    room_08: [
      { dir: 'left',  x: 352,  y: 603, to: 'room_07', spawn: 'fromRight' },
      { dir: 'right', x: 1131, y: 498, to: 'room_09', spawn: 'fromLeft'  },
      { dir: 'up',    x: 713,  y: 338, to: 'room_13', spawn: 'fromDown'  },
      { dir: 'down',  x: 1011, y: 770, to: 'room_03', spawn: 'fromUp'    }
    ],
    room_09: [
      { dir: 'left',  x: 394,  y: 590, to: 'room_08', spawn: 'fromRight' },
      { dir: 'right', x: 1123, y: 502, to: 'room_10', spawn: 'fromLeft'  },
      { dir: 'up',    x: 707,  y: 318, to: 'room_14', spawn: 'fromDown'  },
      { dir: 'down',  x: 1000, y: 747, to: 'room_04', spawn: 'fromUp'    }
    ],
    room_10: [
      { dir: 'left',  x: 401,  y: 603, to: 'room_09', spawn: 'fromRight' },
      { dir: 'up',    x: 705,  y: 316, to: 'room_15', spawn: 'fromDown'  },
      { dir: 'down',  x: 994,  y: 753, to: 'room_05', spawn: 'fromUp'    }
    ],
    room_11: [
      { dir: 'right', x: 1208, y: 322, to: 'room_12', spawn: 'fromLeft'  },
      { dir: 'down',  x: 1006, y: 784, to: 'room_06', spawn: 'fromUp'    }
    ],
    room_12: [
      { dir: 'left',  x: 371,  y: 639, to: 'room_11', spawn: 'fromRight' },
      { dir: 'right', x: 1210, y: 434, to: 'room_13', spawn: 'fromLeft'  },
      { dir: 'down',  x: 1037, y: 800, to: 'room_07', spawn: 'fromUp'    }
    ],
    room_13: [
      { dir: 'left',  x: 368,  y: 626, to: 'room_12', spawn: 'fromRight' },
      { dir: 'right', x: 1233, y: 322, to: 'room_14', spawn: 'fromLeft'  },
      { dir: 'down',  x: 1078, y: 796, to: 'room_08', spawn: 'fromUp'    }
    ],
    room_14: [
      { dir: 'left',  x: 303,  y: 631, to: 'room_13', spawn: 'fromRight' },
      { dir: 'right', x: 1210, y: 405, to: 'room_15', spawn: 'fromLeft'  },
      { dir: 'down',  x: 930,  y: 812, to: 'room_09', spawn: 'fromUp'    }
    ],
    room_15: [
      { dir: 'left',  x: 402,  y: 614, to: 'room_14', spawn: 'fromRight' },
      { dir: 'down',  x: 1003, y: 790, to: 'room_10', spawn: 'fromUp'    }
    ]
  };

  const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

  let arrivalArrowHiddenUntil     = 0;
  let arrivalArrowBackHiddenUntil = 0;

  /* ═══════════════════════════════════════════
     DRIFTER SYSTEM
  ═══════════════════════════════════════════ */

  /* Seeded shuffle — deterministic per curriculum week */
  function seededShuffle(arr, seed) {
    const a = arr.slice();
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const j = Math.abs(s) % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Get curriculum week seed — falls back gracefully */
  function getWeekSeed() {
    try {
      if (window.CALENDAR && typeof CALENDAR.getCurrentCurriculumWeek === 'function') {
        return CALENDAR.getCurrentCurriculumWeek();
      }
    } catch (_) {}
    /* Fallback: ISO week number */
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  }

  /* Build this week's room assignment: drifter index → roomId */
  function buildWeeklyRoomAssignment() {
    const seed  = getWeekSeed();
    const rooms = seededShuffle(DATA.drifterRoomPool, seed);
    /* rooms.length may be < drifters.length — wrap if needed */
    return DATA.drifters.map((_, i) => rooms[i % rooms.length]);
  }

  /* Random integer in [0, n) using Math.random — for quest picks */
  function randInt(n) { return Math.floor(Math.random() * n); }

  /* Load save data */
  function loadSave() {
    try {
      if (window.BoohaAdventure && BoohaAdventure.save) {
        return BoohaAdventure.save.load() || {};
      }
    } catch (_) {}
    return {};
  }

  function writeSave(data) {
    try {
      if (window.BoohaAdventure && BoohaAdventure.save) {
        BoohaAdventure.save.save(data);
      }
    } catch (_) {}
  }

  /* Permanent drifter completion record (never resets) */
  function getDrifterPermanent() {
    const data = loadSave();
    if (!data.drifters) data.drifters = {};
    DATA.drifters.forEach(d => {
      if (!data.drifters[d.id]) data.drifters[d.id] = { completed: [] };
    });
    return { data, drifters: data.drifters };
  }

  /* Weekly quest state */
  function getWeeklyQuest(data) {
    if (!data.weekly) data.weekly = {};
    return data.weekly.drifterQuest || null;
  }

  /* Pick a random uncompleted memory index for a drifter */
  function pickRandomMemory(drifterId) {
    const { data, drifters } = getDrifterPermanent();
    const d = DATA.drifters.find(x => x.id === drifterId);
    if (!d) return null;
    const completed = drifters[drifterId].completed || [];
    const pool = [];
    for (let i = 1; i <= d.memoryCount; i++) {
      if (!completed.includes(i)) pool.push(i);
    }
    if (!pool.length) return null;
    return pool[randInt(pool.length)];
  }

  /* Pick 3 random decoys from the pool, avoiding repeats if possible */
  function pickDecoys(count) {
    const total = DATA.decoyCount;
    const pool  = [];
    for (let i = 1; i <= total; i++) pool.push(i);
    const shuffled = seededShuffle(pool, Math.floor(Math.random() * 999999));
    return shuffled.slice(0, count);
  }

  /* Activate a quest for a drifter */
  function activateQuest(drifterId) {
    const memIdx = pickRandomMemory(drifterId);
    if (memIdx === null) return; /* all memories complete */
    const decoys = pickDecoys(DATA.decoysPerQuest);
    const data   = loadSave();
    if (!data.weekly) data.weekly = {};
    data.weekly.drifterQuest = {
      active  : drifterId,
      state   : 'accepted',   /* accepted | collected | failed */
      memIdx,
      decoys,
    };
    writeSave(data);
    return data.weekly.drifterQuest;
  }

  /* Mark memory as permanently completed */
  function completeMemory(drifterId, memIdx) {
    const { data, drifters } = getDrifterPermanent();
    if (!drifters[drifterId].completed.includes(memIdx)) {
      drifters[drifterId].completed.push(memIdx);
    }
    data.drifters = drifters;
    /* clear weekly quest */
    if (data.weekly) data.weekly.drifterQuest = null;
    writeSave(data);
  }

  /* Clear weekly quest (wrong memory or Monday reset) */
  function clearQuest() {
    const data = loadSave();
    if (data.weekly) data.weekly.drifterQuest = null;
    writeSave(data);
  }

  /* Check if a drifter has any uncompleted memories */
  function drifterHasMemories(drifterId) {
    const { drifters } = getDrifterPermanent();
    const d = DATA.drifters.find(x => x.id === drifterId);
    if (!d) return false;
    const completed = drifters[drifterId]?.completed || [];
    return completed.length < d.memoryCount;
  }

  /* ── Weekly room assignment (computed once on load) ── */
  const weeklyRooms = buildWeeklyRoomAssignment();

  /* Returns which drifter (if any) lives in the current room this week */
  function drifterForRoom(roomId) {
    const idx = weeklyRooms.indexOf(roomId);
    if (idx < 0) return null;
    return DATA.drifters[idx] || null;
  }

  /* World coords for a drifter's position this week */
  function drifterWorldPos(drifter) {
    return { x: drifter.roomCoords.x, y: drifter.roomCoords.y };
  }

  /* ── Drifter sprite images ── */
  const drifterImgs = {};
  DATA.drifters.forEach(d => {
    const i1 = new Image(); i1.src = d.sprite1;
    const i2 = new Image(); i2.src = d.sprite2;
    drifterImgs[d.id] = { img1: i1, img2: i2 };
  });

  /* ── Audio ── */
  let questAudio = null;

  function playQuestAudio(src) {
    if (questAudio) { try { questAudio.pause(); } catch (_) {} }
    questAudio = new Audio(src);
    questAudio.play().catch(() => {});
  }

  function questAudioSrc(drifterId, memIdx) {
    const d = DATA.drifters.find(x => x.id === drifterId);
    if (!d) return null;
    const n = String(memIdx).padStart(2, '0');
    return `./assets/audio/drifters/${d.audioPrefix}_q${n}.mp3`;
  }

  /* ═══════════════════════════════════════════
     FIRST-VISIT FLAG
  ═══════════════════════════════════════════ */
  function _markUtsuobaVisited() {
    try {
      const data = loadSave();
      if (!data.weekly) data.weekly = {};
      data.weekly.utsuobaVisited = true;
      writeSave(data);
    } catch (_) {}
  }

  /* ═══════════════════════════════════════════
     EXIT POPUP STATE
  ═══════════════════════════════════════════ */
  let exitPopOverlay       = null;
  let exitPopCooldownUntil = 0;

  /* ═══════════════════════════════════════════
     DRIFTER POPUP STATE
  ═══════════════════════════════════════════ */
  let drifterPopOverlay    = null;
  let drifterPopCooldown   = 0;
  let drifterPopOpen       = false;

  /* ═══════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════ */
  const state = {
    roomId: (() => {
      const p = new URLSearchParams(window.location.search);
      return p.get('room') || DATA.startRoom;
    })(),
    spawnId             : 'default',
    x                   : CENTER_X,
    y                   : CENTER_Y,
    spawnX              : CENTER_X,
    spawnY              : CENTER_Y,
    arrivalDir          : null,
    transitioning       : false,
    transitionReadyAt   : 0,
    clickTarget         : null,
    moving              : false,
    distMovedSinceSpawn : 0,
    coordMode           : false,
    musicStarted        : false,
    lastTrailT          : 0,
    spawnLockUntil      : 0,
    exitingToKarasuki   : false,
    /* Ghost travels to center on room enter — input locked during travel */
    travelingToCenter   : false,
    inputLocked         : false,
  };

  let pins    = [];
  let trail   = [];
  let ripples = [];

  /* Sparkle particles for correct memory */
  let sparkles = [];

  const ghostImg = new Image();
  ghostImg.src   = './assets/img/booha_ghost.png';

  const music  = new Audio('./assets/audio/utsuroba-music.mp3');
  music.loop   = true;
  music.volume = 0.65;

  let app, stage, canvas, ctx, roomLayer;
  let coordToggle, coordReadout, pinLog;

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
      .utsuroba-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block;pointer-events:none;user-select:none;}
      #buki-canvas{position:absolute;inset:0;z-index:10;pointer-events:none;}
      #buki-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:20;}
      #rotate-overlay{display:none;position:fixed;inset:0;z-index:9999;background:#000;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:32px;}
      @media screen and (orientation:portrait) and (max-width:1023px){#rotate-overlay{display:flex !important;}}
      .rotate-phone{font-size:64px;display:block;animation:rotatehint 2.4s ease-in-out infinite;transform-origin:center;}
      @keyframes rotatehint{0%,100%{transform:rotate(0deg);}40%,60%{transform:rotate(-90deg);}}
      .rotate-bar{width:120px;height:3px;border-radius:999px;background:linear-gradient(90deg,#9b2c7a,#c45fa3,#9b2c7a);background-size:200%;animation:barshimmer 2s linear infinite;}
      @keyframes barshimmer{0%{background-position:0%}100%{background-position:200%}}
      .rotate-title{font-family:system-ui,-apple-system,sans-serif;font-size:clamp(18px,5vw,28px);font-weight:900;letter-spacing:1px;color:#fff;margin:0;}
      .rotate-sub{font-size:14px;color:rgba(255,255,255,.55);margin:0;line-height:1.7;}
      @keyframes utsuExitAppear{from{opacity:0;transform:scale(0.93) translateY(6px);}to{opacity:1;transform:scale(1) translateY(0);}}
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

      /* ── Drifter popup ── */
      #utsuroba-drifter-overlay{display:none;position:fixed;inset:0;z-index:9100;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.3s ease;}
      #utsuroba-drifter-overlay.open{background:rgba(0,0,0,0.82);}
      .drifter-pop-box{background:linear-gradient(160deg,#06000f,#0c0018 60%,#04000a);border:1px solid rgba(120,60,200,.45);border-radius:8px;padding:clamp(22px,5vw,38px) clamp(20px,5vw,44px) clamp(18px,4vw,30px);max-width:min(440px,92vw);width:92vw;text-align:center;box-shadow:0 0 0 1px rgba(80,0,140,.35),0 0 40px rgba(40,0,80,.8);font-family:'Georgia',serif;position:relative;animation:utsuExitAppear 0.28s ease-out;}
      .drifter-corner{position:absolute;width:13px;height:13px;border:1px solid rgba(120,60,200,.45);}
      .drifter-corner.tl{top:8px;left:8px;border-right:none;border-bottom:none;}
      .drifter-corner.tr{top:8px;right:8px;border-left:none;border-bottom:none;}
      .drifter-corner.bl{bottom:8px;left:8px;border-right:none;border-top:none;}
      .drifter-corner.br{bottom:8px;right:8px;border-left:none;border-top:none;}
      .drifter-pop-close{position:absolute;top:10px;right:12px;background:transparent;border:none;cursor:pointer;font-size:.9rem;color:rgba(180,100,255,.4);padding:4px 7px;}
      .drifter-pop-name{font-size:clamp(.78rem,2.4vw,.9rem);color:#6a3a8a;letter-spacing:.12em;margin:0 0 4px;text-transform:uppercase;}
      .drifter-pop-namekanji{font-size:clamp(1rem,3.2vw,1.22rem);color:#c090e8;font-weight:700;margin:0 0 2px;letter-spacing:.06em;}
      .drifter-pop-namehira{font-size:clamp(.72rem,2.2vw,.82rem);color:#7a5090;margin:0 0 18px;letter-spacing:.08em;}
      .drifter-pop-lines{margin:0 0 20px;}
      .drifter-pop-line{font-size:clamp(.88rem,2.8vw,1rem);color:#c8a8e8;line-height:1.65;margin:0 0 3px;letter-spacing:.03em;}
      .drifter-pop-linejp{font-size:clamp(.78rem,2.4vw,.9rem);color:#7a5a9a;line-height:1.7;margin:0 0 2px;}
      .drifter-pop-divider{width:60px;height:1px;background:rgba(120,60,200,.3);margin:14px auto;}
      .drifter-pop-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:6px;}
      .drifter-pop-btn{font-family:'Georgia',serif;font-size:clamp(.8rem,2.5vw,.92rem);letter-spacing:.12em;cursor:pointer;padding:9px 28px;border-radius:3px;transition:all .2s;}
      .drifter-pop-btn.yes{background:rgba(60,10,100,.35);border:1px solid rgba(160,80,255,.65);color:#d4aaff;}
      .drifter-pop-btn.yes:hover{background:rgba(80,20,130,.5);}
      .drifter-pop-btn.no{background:transparent;border:1px solid rgba(60,30,90,.6);color:#6a4888;}
      .drifter-pop-btn.no:hover{color:#9a78b8;border-color:rgba(100,60,140,.6);}
      .drifter-pop-audio-btn{display:flex;align-items:center;gap:8px;margin:0 auto 18px;background:rgba(60,10,100,.35);border:1px solid rgba(160,80,255,.5);color:#c8a8e8;font-family:'Georgia',serif;font-size:clamp(.78rem,2.4vw,.88rem);letter-spacing:.08em;padding:8px 22px;border-radius:3px;cursor:pointer;transition:all .2s;}
      .drifter-pop-audio-btn:hover{background:rgba(80,20,130,.5);}
      .drifter-pop-status{font-size:clamp(.75rem,2.2vw,.85rem);color:#7a5090;letter-spacing:.06em;margin:0 0 16px;line-height:1.6;}
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
    panel.style.cssText = `position:fixed;bottom:60px;right:18px;z-index:9999;background:rgba(0,0,0,.90);border:1px solid rgba(255,200,0,.4);border-radius:10px;padding:10px 14px;font:700 11px/1.8 monospace;color:#ffd700;letter-spacing:.06em;min-width:190px;box-shadow:0 0 20px rgba(255,200,0,.2);`;
    panel.innerHTML = `
      <div style="font-size:9px;color:rgba(255,200,0,.5);letter-spacing:.14em;margin-bottom:6px;">DEV — utsuroba</div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="buki-dev-exit"> Exit always visible</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="buki-dev-shadows" checked> Shadows on</label>
      <div id="buki-dev-perf" style="font-size:9px;color:rgba(255,200,0,.45);margin-top:4px;"></div>
      <div id="buki-dev-room" style="font-size:9px;color:rgba(255,200,0,.45);margin-top:2px;"></div>
      <div id="buki-dev-quest" style="font-size:9px;color:rgba(255,200,0,.45);margin-top:2px;"></div>`;
    document.body.appendChild(panel);

    window.__devUtsuExit = false;
    document.getElementById('buki-dev-exit').addEventListener('change', function() { window.__devUtsuExit = this.checked; });
    document.getElementById('buki-dev-shadows').addEventListener('change', function() { shadowsEnabled = this.checked; });

    setInterval(() => {
      const r = document.getElementById('buki-dev-room');
      const p = document.getElementById('buki-dev-perf');
      const q = document.getElementById('buki-dev-quest');
      if (r) r.textContent = `room: ${state.roomId} | moved: ${Math.round(state.distMovedSinceSpawn)}`;
      if (p) p.textContent = `tier:${perfTier} dpr:${MAX_DPR} touch:${isTouchDevice}`;
      if (q) {
        const data = loadSave();
        const quest = getWeeklyQuest(data);
        if (q) q.textContent = quest ? `quest:${quest.active} s:${quest.state} m:${quest.memIdx}` : 'quest:none';
      }
    }, 200);
  }

  /* ═══════════════════════════════════════════
     EXIT POPUP
  ═══════════════════════════════════════════ */
  function injectExitPopOverlay() {
    if (exitPopOverlay) return;
    exitPopOverlay = document.createElement('div');
    exitPopOverlay.id = 'utsuroba-exit-overlay';
    exitPopOverlay.style.cssText = `display:none;position:fixed;inset:0;z-index:9200;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.35s ease;`;
    exitPopOverlay.innerHTML = `
      <div style="background:linear-gradient(160deg,#06000f,#0c0018 60%,#04000a);border:1px solid rgba(100,0,180,.45);border-radius:6px;padding:clamp(24px,5vw,40px) clamp(22px,6vw,48px) clamp(20px,4vw,32px);max-width:min(400px,94vw);width:94vw;text-align:center;box-shadow:0 0 0 1px rgba(80,0,140,.4),0 0 40px rgba(40,0,80,.8),inset 0 0 50px rgba(0,0,0,.6);font-family:'Georgia',serif;position:relative;animation:utsuExitAppear 0.3s ease-out;">
        <div style="position:absolute;top:9px;left:9px;width:14px;height:14px;border:1px solid rgba(100,0,160,.5);border-right:none;border-bottom:none;"></div>
        <div style="position:absolute;top:9px;right:9px;width:14px;height:14px;border:1px solid rgba(100,0,160,.5);border-left:none;border-bottom:none;"></div>
        <div style="position:absolute;bottom:9px;left:9px;width:14px;height:14px;border:1px solid rgba(100,0,160,.5);border-right:none;border-top:none;"></div>
        <div style="position:absolute;bottom:9px;right:9px;width:14px;height:14px;border:1px solid rgba(100,0,160,.5);border-left:none;border-top:none;"></div>
        <button id="utsuroba-exit-close" style="position:absolute;top:11px;right:13px;background:transparent;border:none;cursor:pointer;font-size:.95rem;color:rgba(120,0,180,.45);padding:4px 7px;">✕</button>
        <p style="font-size:clamp(.88rem,3vw,1.04rem);color:#b090d0;margin:0 0 10px;line-height:1.6;letter-spacing:.04em;text-shadow:0 0 16px rgba(120,0,180,.35);">Do you want to leave Utsuroba?</p>
        <p style="font-size:clamp(.78rem,2.5vw,.92rem);color:#8060a8;margin:0 0 6px;letter-spacing:.07em;">うつろばを出ますか？</p>
        <p style="font-size:clamp(.7rem,2.1vw,.82rem);color:#503070;margin:0 0 24px;letter-spacing:.12em;opacity:.65;">空洞場を去りますか？</p>
        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
          <button id="utsuroba-exit-yes" style="background:rgba(40,0,70,.3);font-family:'Georgia',serif;font-size:clamp(.8rem,2.7vw,.92rem);letter-spacing:.12em;cursor:pointer;padding:9px 28px;border-radius:3px;border:1px solid rgba(120,0,180,.65);color:#d0a8f0;transition:all .2s;">はい / Yes</button>
          <button id="utsuroba-exit-no" style="background:transparent;font-family:'Georgia',serif;font-size:clamp(.8rem,2.7vw,.92rem);letter-spacing:.12em;cursor:pointer;padding:9px 28px;border-radius:3px;border:1px solid rgba(50,20,70,.6);color:#6a4888;transition:all .2s;">いいえ / No</button>
        </div>
      </div>`;
    document.body.appendChild(exitPopOverlay);
    document.getElementById('utsuroba-exit-close').addEventListener('click', closeExitPop);
    document.getElementById('utsuroba-exit-no').addEventListener('click', closeExitPop);
    document.getElementById('utsuroba-exit-yes').addEventListener('click', doExitToKarasuki);
    exitPopOverlay.addEventListener('click', e => { if (e.target === exitPopOverlay) closeExitPop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isExitPopOpen()) closeExitPop(); });
  }

  function openExitPop() { exitPopOverlay.style.display = 'flex'; exitPopOverlay.style.background = 'rgba(0,0,0,0.88)'; state.clickTarget = null; }
  function closeExitPop() {
    exitPopCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
    exitPopOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { exitPopOverlay.style.display = 'none'; }, 350);
  }
  function isExitPopOpen() { return exitPopOverlay && exitPopOverlay.style.display === 'flex'; }

  function doExitToKarasuki() {
    if (state.exitingToKarasuki) return;
    state.exitingToKarasuki = true; state.clickTarget = null; state.moving = false;
    try { music.pause(); music.currentTime = 0; } catch (_) {}
    exitPopOverlay.style.display = 'none';
    const fadeEl = document.getElementById('buki-fade');
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`; fadeEl.style.opacity = '1';
    setTimeout(() => {
      try { sessionStorage.setItem('utsuroba_return_room', 'room_15'); } catch (_) {}
      window.location.href = KARASUKI_EXIT.href;
    }, FADE_MS + 60);
  }

  /* ═══════════════════════════════════════════
     DRIFTER POPUP
  ═══════════════════════════════════════════ */
  function injectDrifterPopOverlay() {
    if (drifterPopOverlay) return;
    drifterPopOverlay = document.createElement('div');
    drifterPopOverlay.id = 'utsuroba-drifter-overlay';
    document.body.appendChild(drifterPopOverlay);
    drifterPopOverlay.addEventListener('click', e => {
      if (e.target === drifterPopOverlay) closeDrifterPop();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drifterPopOpen) closeDrifterPop();
    });
  }

  function openDrifterPop(drifter) {
    if (performance.now() < drifterPopCooldown) return;
    if (!drifterPopOverlay) return;
    drifterPopOpen = true;
    state.inputLocked = true;
    state.clickTarget = null;

    const data  = loadSave();
    const quest = getWeeklyQuest(data);
    const hasMemories = drifterHasMemories(drifter.id);

    /* Build popup content based on quest state */
    let bodyHTML = '';

    if (!hasMemories) {
      /* All memories collected for this drifter */
      bodyHTML = `
        <p class="drifter-pop-status">✦ All memories have been found. ✦<br>すべての記憶が見つかりました。</p>
        <div class="drifter-pop-btns">
          <button class="drifter-pop-btn no" id="drifter-pop-close-btn">Close / 閉じる</button>
        </div>`;
    } else if (quest && quest.active === drifter.id) {
      /* This drifter's quest is active — show replay audio + status */
      const stateLabel = quest.state === 'collected'
        ? 'You have a memory! Come find me. / 記憶を持っている！見つけてね。'
        : 'I\'m waiting for you… / 待ってるよ…';
      bodyHTML = `
        <p class="drifter-pop-status">${stateLabel}</p>
        <button class="drifter-pop-audio-btn" id="drifter-replay-btn">
          <span>▶</span> Play memory again / もう一度聴く
        </button>`;

      if (quest.state === 'collected') {
        bodyHTML += `
        <div class="drifter-pop-divider"></div>
        <p class="drifter-pop-status">Give me the memory? / 記憶をくれる？</p>
        <div class="drifter-pop-btns">
          <button class="drifter-pop-btn yes" id="drifter-give-btn">はい / Yes</button>
          <button class="drifter-pop-btn no" id="drifter-pop-close-btn">いいえ / No</button>
        </div>`;
      } else {
        bodyHTML += `
        <div class="drifter-pop-btns">
          <button class="drifter-pop-btn no" id="drifter-pop-close-btn">Close / 閉じる</button>
        </div>`;
      }
    } else if (quest && quest.active !== drifter.id) {
      /* Another drifter's quest is active */
      bodyHTML = `
        <p class="drifter-pop-status">Please help my friend first…<br>先に友達を助けてあげて…</p>
        <div class="drifter-pop-btns">
          <button class="drifter-pop-btn no" id="drifter-pop-close-btn">Close / 閉じる</button>
        </div>`;
    } else {
      /* No active quest — initial greeting with YES/NO */
      const lines = drifter.greeting.map((l, i) =>
        `<p class="drifter-pop-line">${l}</p><p class="drifter-pop-linejp">${drifter.greetingJP[i]}</p>`
      ).join('');
      bodyHTML = `
        <div class="drifter-pop-lines">${lines}</div>
        <div class="drifter-pop-divider"></div>
        <p class="drifter-pop-line" style="font-size:clamp(.82rem,2.6vw,.94rem);margin-bottom:4px;">Will you help me find a memory?</p>
        <p class="drifter-pop-linejp" style="margin-bottom:18px;">記憶を探すのを手伝ってくれる？</p>
        <div class="drifter-pop-btns">
          <button class="drifter-pop-btn yes" id="drifter-yes-btn">はい / Yes</button>
          <button class="drifter-pop-btn no" id="drifter-no-btn">いいえ / No</button>
        </div>`;
    }

    drifterPopOverlay.innerHTML = `
      <div class="drifter-pop-box">
        <div class="drifter-corner tl"></div>
        <div class="drifter-corner tr"></div>
        <div class="drifter-corner bl"></div>
        <div class="drifter-corner br"></div>
        <button class="drifter-pop-close" id="drifter-x-btn">✕</button>
        <p class="drifter-pop-name">${drifter.name}</p>
        <p class="drifter-pop-namekanji">${drifter.nameKanji}</p>
        <p class="drifter-pop-namehira">${drifter.nameHira}</p>
        <div class="drifter-pop-divider"></div>
        ${bodyHTML}
      </div>`;

    drifterPopOverlay.style.display = 'flex';
    requestAnimationFrame(() => drifterPopOverlay.classList.add('open'));

    /* Wire buttons */
    const xBtn    = document.getElementById('drifter-x-btn');
    const closeBtn = document.getElementById('drifter-pop-close-btn');
    const yesBtn  = document.getElementById('drifter-yes-btn');
    const noBtn   = document.getElementById('drifter-no-btn');
    const replayBtn = document.getElementById('drifter-replay-btn');
    const giveBtn = document.getElementById('drifter-give-btn');

    if (xBtn)    xBtn.addEventListener('click', closeDrifterPop);
    if (closeBtn) closeBtn.addEventListener('click', closeDrifterPop);
    if (noBtn)   noBtn.addEventListener('click', closeDrifterPop);

    if (yesBtn) {
      yesBtn.addEventListener('click', () => {
        const newQuest = activateQuest(drifter.id);
        if (!newQuest) { closeDrifterPop(); return; }
        const src = questAudioSrc(drifter.id, newQuest.memIdx);
        if (src) playQuestAudio(src);
        closeDrifterPop();
      });
    }

    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        const d2 = loadSave();
        const q2 = getWeeklyQuest(d2);
        if (!q2) return;
        const src = questAudioSrc(q2.active, q2.memIdx);
        if (src) playQuestAudio(src);
      });
    }

    if (giveBtn) {
      giveBtn.addEventListener('click', () => {
        /* Validation happens in karasuki when orb is collected.
           Here the player is delivering to the drifter.
           The karasuki bridge should have set quest.state = 'collected'
           and collectedOrbId. We check correctness here. */
        const d2 = loadSave();
        const q2 = getWeeklyQuest(d2);
        if (!q2 || q2.state !== 'collected') { closeDrifterPop(); return; }

        const correct = q2.collectedOrbId === drifter.id;
        closeDrifterPop();

        if (correct) {
          completeMemory(drifter.id, q2.memIdx);
          triggerSparkle();
        } else {
          /* Wrong memory — show brief wrong message, return orb to karasuki */
          showWrongMemoryMessage(drifter);
          clearQuest();
        }
      });
    }
  }

  function closeDrifterPop() {
    drifterPopCooldown = performance.now() + POPUP_COOLDOWN_MS;
    drifterPopOpen = false;
    state.inputLocked = false;
    drifterPopOverlay.classList.remove('open');
    setTimeout(() => { drifterPopOverlay.style.display = 'none'; }, 300);
  }

  function showWrongMemoryMessage(drifter) {
    /* Brief overlay message — "Sorry, this isn't for me" */
    const msg = document.createElement('div');
    msg.style.cssText = `position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);font-family:'Georgia',serif;text-align:center;animation:utsuExitAppear .25s ease-out;`;
    msg.innerHTML = `
      <div style="color:#c090e8;font-size:clamp(1rem,3.5vw,1.3rem);letter-spacing:.06em;line-height:1.8;padding:32px;">
        <p style="margin:0 0 8px;">Sorry… this isn't for me.</p>
        <p style="margin:0;font-size:clamp(.78rem,2.4vw,.9rem);color:#7a5090;">ごめん…これは私のじゃない。</p>
      </div>`;
    document.body.appendChild(msg);
    setTimeout(() => {
      msg.style.opacity = '0';
      msg.style.transition = 'opacity .4s';
      setTimeout(() => msg.remove(), 420);
    }, 2200);
  }

  /* ═══════════════════════════════════════════
     SPARKLE DANCE (correct memory)
  ═══════════════════════════════════════════ */
  function triggerSparkle() {
    const colors = ['#ff79d7','#a8edff','#ffd700','#b2ffda','#ff85a1','#90aaff','#d49aff','#fff'];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      sparkles.push({
        x    : state.x,
        y    : state.y,
        vx   : Math.cos(angle) * speed,
        vy   : Math.sin(angle) * speed - 1.5,
        life : 1,
        size : 2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        spin : Math.random() * Math.PI * 2,
        dspin: (Math.random() - .5) * .2,
      });
    }
  }

  /* ═══════════════════════════════════════════
     DOM BUILD
  ═══════════════════════════════════════════ */
  function buildApp() {
    app       = document.createElement('div'); app.id = 'utsuroba-app';
    stage     = document.createElement('div'); stage.id = 'utsuroba-stage';
    roomLayer = document.createElement('div'); roomLayer.id = 'utsuroba-room-layer';
    canvas    = document.createElement('canvas'); canvas.id = 'buki-canvas';
    const fade = document.createElement('div'); fade.id = 'buki-fade';

    stage.appendChild(roomLayer); stage.appendChild(canvas); stage.appendChild(fade);
    app.appendChild(stage);

    const toast = document.createElement('div'); toast.id = 'buki-copy-toast'; toast.textContent = 'copied!';

    document.body.innerHTML = '';
    document.body.appendChild(app);
    document.body.appendChild(toast);

    injectExitPopOverlay();
    injectDrifterPopOverlay();

    if (DEV_MODE) {
      coordToggle = document.createElement('div');
      coordToggle.id = 'buki-coord-toggle';
      coordToggle.innerHTML = '<span>COORDS</span><div class="toggle-pill"></div>';
      coordToggle.addEventListener('click', toggleCoordMode);

      coordReadout = document.createElement('div');
      coordReadout.id = 'buki-coord-readout';
      coordReadout.innerHTML = '<span id="buki-coord-xy">—</span><span class="hint">click to pin · hover to read</span>';

      pinLog = document.createElement('div');
      pinLog.id = 'buki-pin-log';
      pinLog.innerHTML = `<div class="log-header"><span>PINS — ${state.roomId}</span><span class="clear-btn" id="buki-clear-pins">CLEAR</span></div><div id="buki-pin-rows"></div>`;

      document.body.appendChild(coordToggle);
      document.body.appendChild(coordReadout);
      document.body.appendChild(pinLog);

      document.getElementById('buki-clear-pins').addEventListener('click', () => { pins = []; renderPinLog(); });
      injectDevPanel();
    }

    const rotateOverlay = document.createElement('div');
    rotateOverlay.id = 'rotate-overlay';
    rotateOverlay.innerHTML = `
      <span class="rotate-phone">📱</span>
      <div class="rotate-bar"></div>
      <p class="rotate-title">横にして遊ぼう！</p>
      <p class="rotate-sub">うつろばは<strong style="color:#c45fa3">横画面</strong>で遊べるよ。<br>スマホを横にしてね。</p>`;
    document.body.appendChild(rotateOverlay);

    ctx = canvas.getContext('2d');
  }

  /* ═══════════════════════════════════════════
     CANVAS / FIT
  ═══════════════════════════════════════════ */
  function resizeCanvas() {
    canvas.style.width  = WORLD_W + 'px';
    canvas.style.height = WORLD_H + 'px';
    canvas.width  = Math.round(WORLD_W * MAX_DPR);
    canvas.height = Math.round(WORLD_H * MAX_DPR);
    ctx.setTransform(MAX_DPR, 0, 0, MAX_DPR, 0, 0);
  }

  function fitStage() {
    const scale = Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  /* ═══════════════════════════════════════════
     ADAPTIVE PERF DETECTION
  ═══════════════════════════════════════════ */
  function updatePerfTier(now) {
    if (perfTier === 'low') return;
    perfFrameCount++;
    if (perfFrameCount === 1) { perfFirstTime = now; return; }
    if (perfFrameCount === 90) {
      const avgFps = 89 / ((now - perfFirstTime) / 1000);
      if (avgFps < 40) { perfTier = 'low'; shadowsEnabled = false; }
    }
  }

  /* ═══════════════════════════════════════════
     COORD MODE
  ═══════════════════════════════════════════ */
  function toggleCoordMode() {
    state.coordMode = !state.coordMode;
    coordToggle.classList.toggle('active', state.coordMode);
    coordReadout.classList.toggle('show',  state.coordMode);
    pinLog.classList.toggle('show',        state.coordMode);
    pinLog.querySelector('.log-header span').textContent = `PINS — ${state.roomId}`;
  }

  function dropPin(wx, wy) {
    const label = `${Math.round(wx)}, ${Math.round(wy)}`;
    pins.push({ x: wx, y: wy, label }); renderPinLog(); copyText(label); showToast(`pinned ${label}`);
  }

  function renderPinLog() {
    const rows = document.getElementById('buki-pin-rows'); if (!rows) return;
    rows.innerHTML = pins.map((p, i) => `<div class="pin-row" data-i="${i}"><span class="pin-idx">${i+1}</span><span class="pin-coords">${p.label}</span><span class="pin-copy">copy</span></div>`).join('');
    rows.querySelectorAll('.pin-row').forEach(row => {
      row.addEventListener('click', () => { const pin = pins[+row.dataset.i]; if (pin) { copyText(pin.label); showToast(`copied ${pin.label}`); } });
    });
  }

  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById('buki-copy-toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
  }

  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); return; } catch (_) {}
    try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch (_) {}
  }

  /* ═══════════════════════════════════════════
     ROOM HELPERS
  ═══════════════════════════════════════════ */
  function getRoom() { return DATA.rooms[state.roomId]; }

  function getSpawn(room, spawnId) {
    const sp = room.spawns?.[spawnId] || room.spawns?.default;
    if (!sp) return { x: CENTER_X, y: CENTER_Y };
    return spawnToWorld(sp);
  }

  function placeGhost(x, y) { state.x = x; state.y = y; }
  function makeBg(src) { const img = document.createElement('img'); img.className = 'utsuroba-bg'; img.src = src; return img; }

  let currentBg;

  /* Ghost flies in from top on page open */
  function renderInitialRoom() {
    const room  = getRoom(); currentBg = makeBg(room.bg); roomLayer.appendChild(currentBg);
    const spawn = getSpawn(room, state.spawnId);

    /* Start off-screen above, travel to spawn point (near center) */
    placeGhost(spawn.x, -GHOST_R * 4);
    state.spawnX = spawn.x;
    state.spawnY = spawn.y;
    state.travelingToCenter = true;
    state.inputLocked       = true;
    state.clickTarget       = { x: spawn.x, y: spawn.y };

    const now = performance.now();
    state.transitionReadyAt     = now + TRANSITION_COOLDOWN_MS;
    arrivalArrowHiddenUntil     = now + ARRIVAL_ARROW_DELAY_MS;
    arrivalArrowBackHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER;
    state.distMovedSinceSpawn   = 0;
    state.moving                = false;
    state.spawnLockUntil        = now + 500;
  }

  /* On room transition: ghost appears at spawn edge, travels to center */
  function arriveInRoom(nextRoom, spawnId, arrivalDir) {
    const spawn = getSpawn(nextRoom, spawnId);
    placeGhost(spawn.x, spawn.y);
    state.spawnX = CENTER_X;
    state.spawnY = CENTER_Y;

    /* Set center as click target — ghost walks there automatically */
    state.travelingToCenter = true;
    state.inputLocked       = true;
    state.clickTarget       = { x: CENTER_X, y: CENTER_Y };
    state.arrivalDir        = arrivalDir || null;

    trail = []; pins = [];
    const now = performance.now();
    state.transitionReadyAt     = now + TRANSITION_COOLDOWN_MS;
    arrivalArrowHiddenUntil     = now + ARRIVAL_ARROW_DELAY_MS;
    arrivalArrowBackHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER;
    state.distMovedSinceSpawn   = 0;
    state.spawnLockUntil        = now + 800; /* slightly longer — wait for center arrival */
    if (DEV_MODE && pinLog) { const lh = pinLog.querySelector('.log-header span'); if (lh) lh.textContent = `PINS — ${state.roomId}`; renderPinLog(); }
  }

  /* ═══════════════════════════════════════════
     COLLISION
  ═══════════════════════════════════════════ */
  function clampToWorld(nx, ny) { return { x: Math.max(GHOST_RADIUS, Math.min(WORLD_W - GHOST_RADIUS, nx)), y: Math.max(GHOST_RADIUS, Math.min(WORLD_H - GHOST_RADIUS, ny)) }; }
  function pointInRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }
  function canMoveTo(nx, ny) { const rects = getRoom()?.collisions || []; if (!rects.length) return true; for (const r of rects) { if (pointInRect(nx, ny, r)) return true; } return false; }
  function tryMove(nx, ny) {
    const c = clampToWorld(nx, ny); if (canMoveTo(c.x, c.y)) { placeGhost(c.x, c.y); return true; }
    const tx = clampToWorld(nx, state.y); if (canMoveTo(tx.x, tx.y)) { placeGhost(tx.x, tx.y); return true; }
    const ty = clampToWorld(state.x, ny); if (canMoveTo(ty.x, ty.y)) { placeGhost(ty.x, ty.y); return true; }
    return false;
  }

  /* ═══════════════════════════════════════════
     FADE TRANSITION
  ═══════════════════════════════════════════ */
  function transitionTo(exit) {
    if (!exit?.to || state.transitioning) return;
    const nextRoom = DATA.rooms[exit.to]; if (!nextRoom) return;
    state.transitioning = true; state.clickTarget = null; state.inputLocked = true;
    const fadeEl = document.getElementById('buki-fade');
    fadeEl.style.transition = `opacity ${FADE_MS/2}ms ease-in`; fadeEl.style.opacity = '1';
    setTimeout(() => {
      const nextBg = makeBg(nextRoom.bg); roomLayer.innerHTML = ''; roomLayer.appendChild(nextBg); currentBg = nextBg;
      state.roomId  = exit.to;
      state.spawnId = exit.spawn || 'default';
      arriveInRoom(nextRoom, state.spawnId, exit.dir);
      fadeEl.style.transition = `opacity ${FADE_MS/2}ms ease-out`; fadeEl.style.opacity = '0';
      setTimeout(() => { state.transitioning = false; }, FADE_MS/2 + 30);
    }, FADE_MS/2 + 20);
  }

  function getNPPExit(now) {
    if (now < state.transitionReadyAt) return null;
    if (state.inputLocked) return null;
    const npps = NPP[state.roomId]; if (!npps) return null;
    const OPPOSITE = { left:'right', right:'left', up:'down', down:'up' };
    const arrivalExit = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    for (const npp of npps) {
      if (Math.hypot(state.x - npp.x, state.y - npp.y) <= NPP_RADIUS) {
        if (npp.dir === arrivalExit && now < arrivalArrowBackHiddenUntil) return null;
        return npp;
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════
     TRAIL
  ═══════════════════════════════════════════ */
  function addTrailParticle(x, y, now) {
    const interval = perfTier === 'low' ? 90 : 45;
    if (now - state.lastTrailT < interval) return;
    state.lastTrailT = now;
    const [col1, col2] = roomColorPair(state.roomId);
    const maxT = perfTier === 'low' ? 30 : TRAIL_MAX;
    trail.push({ x: x+(Math.random()-.5)*10, y: y+GHOST_R*.55+(Math.random()-.5)*8, vx:(Math.random()-.5)*.4, vy:-Math.random()*.5, life:1, size:2+Math.random()*4.5, color:Math.random()>.5?col1:col2 });
    if (trail.length > maxT) trail.shift();
  }

  /* ═══════════════════════════════════════════
     DRAW EXIT ARROWS
  ═══════════════════════════════════════════ */
  function drawExitArrows(now) {
    const npps = NPP[state.roomId]; if (!npps) return;
    /* Arrows always visible — scale by move threshold for gentle reveal */
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    /* Show immediately at low opacity even before movement so mobile users can see them */
    const baseReveal = 0.35;
    const totalReveal = Math.max(baseReveal, moveReveal);
    const sec = now / 1000;
    const [col1, col2] = roomColorPair(state.roomId);
    const OPPOSITE = { left:'right', right:'left', up:'down', down:'up' };
    const arrivalExit = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;

    npps.forEach((npp, i) => {
      if (!npp.dir) return;
      const isBackDir   = npp.dir === arrivalExit;
      const hiddenUntil = isBackDir ? arrivalArrowBackHiddenUntil : arrivalArrowHiddenUntil;
      const delayRem    = hiddenUntil - now;
      if (delayRem > 400) return;
      const revealFade = Math.min(1, Math.max(0, 1 - delayRem / (isBackDir ? ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER : ARRIVAL_ARROW_DELAY_MS)));
      const angle  = DIR_ANGLE[npp.dir] ?? 0;
      const pulse  = 0.5 + 0.5 * Math.sin(sec * 2.2 + i * 1.3);
      const bounce = Math.sin(sec * 2.2 + i * 1.3) * 6;
      const ax = npp.x + Math.cos(angle) * bounce;
      const ay = npp.y + Math.sin(angle) * bounce;
      const fa = revealFade * totalReveal;

      ctx.save();
      ctx.translate(ax, ay); ctx.rotate(angle);

      const ga = ctx.createRadialGradient(0,0,0,0,0,40); ga.addColorStop(0,col1); ga.addColorStop(1,'transparent');
      ctx.globalAlpha = fa*(0.10+pulse*0.08); ctx.fillStyle = ga;
      ctx.beginPath(); ctx.arc(0,0,40,0,Math.PI*2); ctx.fill();

      [{ox:-11,a:0.65},{ox:4,a:1.0}].forEach(({ox,a}) => {
        ctx.globalAlpha = fa*a*(0.38+pulse*0.32); ctx.strokeStyle = col1; ctx.lineWidth = 2.5; ctx.lineCap='round'; ctx.lineJoin='round';
        if (shadowsEnabled) { ctx.shadowBlur=12; ctx.shadowColor=col2; }
        ctx.beginPath(); ctx.moveTo(ox-7,-10); ctx.lineTo(ox+7,0); ctx.lineTo(ox-7,10); ctx.stroke();
        ctx.shadowBlur=0;
      });

      ctx.globalAlpha = fa*(0.60+pulse*0.38); ctx.fillStyle='#fff';
      if (shadowsEnabled) { ctx.shadowBlur=14; ctx.shadowColor=col1; }
      ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.restore();
    });
  }

  /* ── LEAVE arrow in room_03 ── */
  function drawKarasukiExitArrow(now) {
    if (state.roomId !== KARASUKI_EXIT.roomId) return;
    const show = window.__devUtsuExit || state.distMovedSinceSpawn >= ARROW_MOVE_THRESHOLD;
    const baseReveal = window.__devUtsuExit ? 1 : 0.35;
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    const totalReveal = Math.max(baseReveal, moveReveal);
    const sec = now/1000, pulse = 0.5+0.5*Math.sin(sec*1.6), bounce = Math.sin(sec*1.6)*7;
    const ax = exitPxX(), ay = exitPxY() + bounce;
    const col1='#6b1a2a', col2='#a03050', col3='#c06080';

    ctx.save();
    const amb = ctx.createRadialGradient(ax,ay,0,ax,ay,52); amb.addColorStop(0,col1+'44'); amb.addColorStop(.5,col2+'22'); amb.addColorStop(1,'transparent');
    ctx.globalAlpha = totalReveal*(0.18+pulse*0.12); ctx.fillStyle=amb; ctx.beginPath(); ctx.arc(ax,ay,52,0,Math.PI*2); ctx.fill();

    ctx.save(); ctx.translate(ax,ay); ctx.rotate(Math.PI/2);
    [{ox:-12,a:0.5},{ox:5,a:0.9}].forEach(({ox,a}) => {
      ctx.globalAlpha = totalReveal*a*(0.35+pulse*0.32); ctx.strokeStyle=col2; ctx.lineWidth=2.8; ctx.lineCap='round'; ctx.lineJoin='round';
      if (shadowsEnabled) { ctx.shadowBlur=12; ctx.shadowColor=col1; }
      ctx.beginPath(); ctx.moveTo(ox-8,-11); ctx.lineTo(ox+8,0); ctx.lineTo(ox-8,11); ctx.stroke(); ctx.shadowBlur=0;
    });
    ctx.restore();

    ctx.globalAlpha = totalReveal*(0.65+pulse*0.28);
    if (shadowsEnabled) { ctx.shadowBlur=16; ctx.shadowColor=col2; }
    const dg = ctx.createRadialGradient(ax,ay,0,ax,ay,6); dg.addColorStop(0,col3); dg.addColorStop(.5,col2); dg.addColorStop(1,'transparent');
    ctx.fillStyle=dg; ctx.beginPath(); ctx.arc(ax,ay,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

    ctx.globalAlpha = totalReveal*(0.50+pulse*0.22);
    ctx.font='bold 12px monospace'; ctx.fillStyle=col3; ctx.textAlign='center';
    if (shadowsEnabled) { ctx.shadowBlur=8; ctx.shadowColor=col1; }
    ctx.fillText('LEAVE', ax, ay-26); ctx.shadowBlur=0; ctx.textAlign='left';
    ctx.restore();
  }

  function checkKarasukiExit() {
    if (state.roomId !== KARASUKI_EXIT.roomId) return;
    if (performance.now() < exitPopCooldownUntil) return;
    if (state.inputLocked) return;
    if (!window.__devUtsuExit && state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    if (Math.hypot(state.x - exitPxX(), state.y - exitPxY()) <= KARASUKI_EXIT.r) {
      state.clickTarget = null; state.moving = false; openExitPop();
    }
  }

  function clickCheckKarasukiExit(worldX, worldY) {
    if (state.roomId !== KARASUKI_EXIT.roomId) return false;
    if (performance.now() < exitPopCooldownUntil) return false;
    if (Math.hypot(worldX - exitPxX(), worldY - exitPxY()) <= KARASUKI_EXIT.r) { openExitPop(); return true; }
    return false;
  }

  /* ═══════════════════════════════════════════
     DRAW DRIFTERS
  ═══════════════════════════════════════════ */
  function drawDrifters(now) {
    const drifter = drifterForRoom(state.roomId);
    if (!drifter) return;

    const hasMemories = drifterHasMemories(drifter.id);
    const pos  = drifterWorldPos(drifter);
    const imgs = drifterImgs[drifter.id];

    /* Pick sprite — use -2 if quest active for this drifter */
    const data  = loadSave();
    const quest = getWeeklyQuest(data);
    const useImg2 = quest && quest.active === drifter.id;
    const img = useImg2 ? imgs.img2 : imgs.img1;

    const sec    = now / 1000;
    const bob    = Math.sin(sec * 1.4) * 4;
    const alpha  = hasMemories ? 1 : 0.35;
    const half   = DRIFTER_SPRITE_SIZE / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    if (img.complete && img.naturalWidth > 0) {
      if (shadowsEnabled && hasMemories) {
        ctx.shadowBlur  = 18;
        ctx.shadowColor = '#c090e8';
      }
      ctx.drawImage(img, pos.x - half, pos.y - half + bob, DRIFTER_SPRITE_SIZE, DRIFTER_SPRITE_SIZE);
      ctx.shadowBlur = 0;
    } else {
      /* Placeholder circle while image loads */
      ctx.fillStyle = '#c090e8';
      ctx.beginPath(); ctx.arc(pos.x, pos.y + bob, 28, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* ═══════════════════════════════════════════
     DRAW SPARKLES
  ═══════════════════════════════════════════ */
  function drawSparkles() {
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sp = sparkles[i];
      sp.life -= 0.018;
      if (sp.life <= 0) { sparkles.splice(i, 1); continue; }
      sp.x  += sp.vx;
      sp.y  += sp.vy;
      sp.vy += 0.06; /* gravity */
      sp.spin += sp.dspin;

      ctx.save();
      ctx.globalAlpha = sp.life;
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.spin);
      if (shadowsEnabled) { ctx.shadowBlur = 8; ctx.shadowColor = sp.color; }
      ctx.fillStyle = sp.color;
      ctx.fillRect(-sp.size / 2, -sp.size / 2, sp.size, sp.size);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  /* ═══════════════════════════════════════════
     DRAW PINS
  ═══════════════════════════════════════════ */
  function drawPins(now) {
    if (!state.coordMode || !pins.length) return;
    const sec = now/1000;
    pins.forEach((p,i) => {
      const pulse = 0.5+0.5*Math.sin(sec*3+i);
      ctx.save();
      ctx.globalAlpha=0.80+pulse*0.18; ctx.strokeStyle='#ff8ae2'; ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(p.x-14,p.y); ctx.lineTo(p.x+14,p.y); ctx.moveTo(p.x,p.y-14); ctx.lineTo(p.x,p.y+14); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha=1; ctx.fillStyle='#ff4fc8'; if(shadowsEnabled){ctx.shadowBlur=8;ctx.shadowColor='#ff8ae2';}
      ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.font='bold 10px monospace'; const tw=ctx.measureText(p.label).width; const bx=p.x+10,by=p.y-18;
      ctx.globalAlpha=0.88; ctx.fillStyle='rgba(0,0,0,.75)'; ctx.beginPath(); ctx.roundRect(bx-4,by-11,tw+10,15,5); ctx.fill();
      ctx.fillStyle='#ff8ae2'; ctx.globalAlpha=1; ctx.fillText(`${i+1}. ${p.label}`,bx+1,by);
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     MAIN DRAW FRAME
  ═══════════════════════════════════════════ */
  function drawFrame(now) {
    ctx.clearRect(0,0,WORLD_W,WORLD_H);
    const sec=now/1000; const [col1,col2]=roomColorPair(state.roomId);

    for (let i=ripples.length-1;i>=0;i--) {
      const rp=ripples[i]; rp.life-=0.038; if(rp.life<=0){ripples.splice(i,1);continue;}
      ctx.save(); ctx.globalAlpha=rp.life*0.72; ctx.strokeStyle=col1+'cc'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(rp.x,rp.y,(1-rp.life)*38+5,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }

    for (let i=trail.length-1;i>=0;i--) {
      const p=trail[i]; const gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2.4);
      gr.addColorStop(0,p.color); gr.addColorStop(1,'transparent');
      ctx.globalAlpha=p.life*0.48; ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*2.4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=p.life*0.90; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1; p.life-=0.022; p.x+=p.vx; p.y+=p.vy;
    }
    trail=trail.filter(p=>p.life>0);

    drawDrifters(now);
    drawExitArrows(now);
    drawKarasukiExitArrow(now);
    drawSparkles();

    /* ghost */
    const bobFreq=(Math.PI*2)/(HOVER_PERIOD/1000), bobPhase=sec*bobFreq;
    const bob=Math.sin(bobPhase)*HOVER_AMP, wobble=Math.sin(bobPhase*2)*2.2;
    const gx=state.x, gy=state.y+bob;
    const pulse=0.5+0.5*Math.sin(sec*2.1);
    const sx=1-Math.sin(bobPhase)*0.07, sy=(1+Math.sin(bobPhase)*0.10)*(state.moving?1.08:1.0);

    ctx.save();
    ctx.globalAlpha=0.22+pulse*0.12;
    const halo=ctx.createRadialGradient(gx,gy+3,0,gx,gy+3,GHOST_R*2.2);
    halo.addColorStop(0,col1); halo.addColorStop(0.5,col2); halo.addColorStop(1,'transparent');
    ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(gx,gy+3,GHOST_R*2.2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.18+pulse*0.07;
    const shd=ctx.createRadialGradient(gx,gy+GHOST_R*.85,0,gx,gy+GHOST_R*.85,GHOST_R*.9);
    shd.addColorStop(0,'rgba(0,0,0,.65)'); shd.addColorStop(1,'transparent');
    ctx.fillStyle=shd; ctx.beginPath(); ctx.arc(gx,gy+GHOST_R*.85,GHOST_R*.9,0,Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save(); ctx.translate(gx,gy); ctx.rotate(wobble*Math.PI/180); ctx.scale(sx,sy);
    if (ghostImg.complete && ghostImg.naturalWidth>0) {
      if (shadowsEnabled) { ctx.shadowBlur=14+pulse*8; ctx.shadowColor=col1; }
      ctx.drawImage(ghostImg,-GHOST_R,-GHOST_R,GHOST_R*2,GHOST_R*2); ctx.shadowBlur=0;
    } else {
      ctx.globalAlpha=1; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,0,GHOST_R*.7,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    if (DEV_MODE) drawPins(now);
  }

  /* ═══════════════════════════════════════════
     CENTER TRAVEL
     Ghost automatically walks to center after
     entering a room. Input unlocks on arrival.
  ═══════════════════════════════════════════ */
  function handleCenterTravel(now) {
    if (!state.travelingToCenter) return;
    const tx = state.clickTarget?.x ?? CENTER_X;
    const ty = state.clickTarget?.y ?? CENTER_Y;
    const dx = tx - state.x, dy = ty - state.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= ARRIVE_DIST) {
      /* Arrived */
      state.travelingToCenter = false;
      state.inputLocked       = false;
      state.clickTarget       = null;
      state.moving            = false;
      return;
    }

    const prevX = state.x, prevY = state.y;
    const moved = tryMove(state.x + (dx/dist)*SPEED, state.y + (dy/dist)*SPEED);
    state.moving = moved;
    if (moved) {
      state.distMovedSinceSpawn += Math.hypot(state.x - prevX, state.y - prevY);
      addTrailParticle(state.x, state.y, now);
    } else {
      /* Stuck — unlock anyway */
      state.travelingToCenter = false;
      state.inputLocked       = false;
      state.clickTarget       = null;
      state.moving            = false;
    }
  }

  /* ═══════════════════════════════════════════
     MOVEMENT
  ═══════════════════════════════════════════ */
  function handleClickMovement(now) {
    if (state.travelingToCenter) return; /* handled by handleCenterTravel */
    if (state.inputLocked) return;
    if (!state.clickTarget) { state.moving=false; return; }
    const tx=state.clickTarget.x, ty=state.clickTarget.y;
    const dx=tx-state.x, dy=ty-state.y, dist=Math.hypot(dx,dy);
    if (dist<=CLICK_STOP_DIST) { state.clickTarget=null; state.moving=false; return; }
    const prevX=state.x, prevY=state.y;
    const moved=tryMove(state.x+(dx/dist)*SPEED, state.y+(dy/dist)*SPEED);
    state.moving=moved;
    if (!moved) { state.clickTarget=null; state.moving=false; }
    else { state.distMovedSinceSpawn+=Math.hypot(state.x-prevX,state.y-prevY); addTrailParticle(state.x,state.y,now); }
  }

  /* ═══════════════════════════════════════════
     DRIFTER HIT CHECK
  ═══════════════════════════════════════════ */
  function clickCheckDrifter(worldX, worldY) {
    if (state.inputLocked || drifterPopOpen) return false;
    const drifter = drifterForRoom(state.roomId);
    if (!drifter) return false;
    const pos = drifterWorldPos(drifter);
    if (Math.hypot(worldX - pos.x, worldY - pos.y) <= DRIFTER_HIT_R) {
      openDrifterPop(drifter);
      return true;
    }
    return false;
  }

  /* ═══════════════════════════════════════════
     MAIN LOOP
  ═══════════════════════════════════════════ */
  function tick(now) {
    updatePerfTier(now);
    const dt=Math.min(50,Math.max(8,now-(lastTickTime||now)));
    lastTickTime=now; SPEED=BASE_SPEED*(dt/TARGET_DT);

    const anyModalOpen = state.transitioning || isExitPopOpen() || state.exitingToKarasuki || drifterPopOpen;

    if (!anyModalOpen) {
      if (state.travelingToCenter) {
        handleCenterTravel(now);
      } else {
        handleClickMovement(now);
        const spawnUnlocked = now >= state.spawnLockUntil && state.distMovedSinceSpawn >= ARROW_MOVE_THRESHOLD;
        if (spawnUnlocked) checkKarasukiExit();
        if (spawnUnlocked) { const exit=getNPPExit(now); if(exit){state.clickTarget=null;state.moving=false;transitionTo(exit);} }
      }
    }

    drawFrame(now);
    requestAnimationFrame(tick);
  }

  /* ═══════════════════════════════════════════
     MUSIC + INPUT
  ═══════════════════════════════════════════ */
  function startMusic() {
    if (state.musicStarted) return;
    state.musicStarted=true; music.play().catch(()=>{});
  }

  function stagePointToWorld(clientX,clientY) {
    const rect=stage.getBoundingClientRect();
    return clampToWorld(((clientX-rect.left)/rect.width)*WORLD_W, ((clientY-rect.top)/rect.height)*WORLD_H);
  }

  function bindInput() {
    if (DEV_MODE) {
      stage.addEventListener('mousemove',(e)=>{
        if (!state.coordMode) return;
        const p=stagePointToWorld(e.clientX,e.clientY);
        const el=document.getElementById('buki-coord-xy'); if(el) el.textContent=`${Math.round(p.x)}, ${Math.round(p.y)}`;
      });
    }

    stage.addEventListener('click',(e)=>{
      startMusic();
      if (state.transitioning || state.travelingToCenter) return; /* block during center travel */
      if (state.inputLocked) return;
      const p=stagePointToWorld(e.clientX,e.clientY);
      if(DEV_MODE&&state.coordMode){dropPin(p.x,p.y);ripples.push({x:p.x,y:p.y,life:1});return;}
      if(clickCheckDrifter(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});return;}
      if(clickCheckKarasukiExit(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});return;}
      state.clickTarget={x:p.x,y:p.y}; ripples.push({x:p.x,y:p.y,life:1});
    });

    stage.addEventListener('touchend',(e)=>{
      startMusic();
      if (state.transitioning || state.travelingToCenter || state.inputLocked) { e.preventDefault(); return; }
      if(!e.changedTouches.length) return;
      const t0=e.changedTouches[0], p=stagePointToWorld(t0.clientX,t0.clientY);
      if(DEV_MODE&&state.coordMode){dropPin(p.x,p.y);ripples.push({x:p.x,y:p.y,life:1});e.preventDefault();return;}
      if(clickCheckDrifter(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});e.preventDefault();return;}
      if(clickCheckKarasukiExit(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});e.preventDefault();return;}
      state.clickTarget={x:p.x,y:p.y}; ripples.push({x:p.x,y:p.y,life:1}); e.preventDefault();
    },{passive:false});

    document.addEventListener('click',startMusic,{once:false});
    document.addEventListener('touchend',startMusic,{once:false,passive:true});
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
    window.addEventListener('resize',()=>{fitStage();resizeCanvas();});
    _markUtsuobaVisited();
    requestAnimationFrame(tick);
  }

  init();
})();
