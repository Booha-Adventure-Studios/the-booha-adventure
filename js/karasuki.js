
(() => {
  const DATA = window.KARASUKI_DATA;
  if (!DATA || !DATA.rooms) { console.error("KARASUKI_DATA not found."); return; }

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
  let   lastTickTime    = 0;
  let   SPEED           = BASE_SPEED;

  const PORTAL = { x: 357, y: 342, r: 40, href: "adventure-profile.html" };

  const MAZE_EXIT = {
    roomId  : "room_03",
    x       : 754,
    y       : 663,
    r       : 44,
    mazeUrl : "maze.html",
    treeIX  : 535,
    treeIY  : 300,
  };

const HAPPY_HOUSE_PORTAL = {
    roomId  : "room_01",
    x       : 546,
    y       : 293,
    r       : 44,
    videoSrc: "assets/happy_house/happy-video.mp4",
    href    : "happy_house.html",
  };
 
  let happyHouseCooldownUntil = 0;

  
  const UTSUROBA_PORTAL = {
    roomId  : "room_15",
    x       : 381,
    y       : 264,
    r       : 48,
    videoSrc: "assets/video/utsuroba_intro.mp4",
    href    : "utsuroba.html",
  };

  const ARRIVAL_ARROW_DELAY_MS        = 2000;
  const ARRIVAL_ARROW_BACK_MULTIPLIER = 3;
  const TRANSITION_COOLDOWN_MS        = 1400;
  const ARROW_MOVE_THRESHOLD          = 30;
  const PORTAL_TRIGGER_R              = 36;

  const POPUP_COOLDOWN_MS  = 900;
  
  const TAP_COOLDOWN_MS        = 180;   // base cooldown after any movement tap
  const TAP_NEAR_COOLDOWN_MS   = 600;   // longer cooldown if tap is near last tap
  const TAP_NEAR_DIST          = 60;    // distance threshold for "near last tap"
  const TAP_MIN_DIST           = 30;    // ignore taps too close to ghost   
  
  let   bonusPopCooldownUntil       = 0;
  let   wandererPopCooldownUntil    = 0;
  let   utsurobaCooldownUntil       = 0;
  let   observerPopCooldownUntil    = 0;

  /* ═══════════════════════════════════════════
     DEV MODE
  ═══════════════════════════════════════════ */

  const MONTH_COLORS = [
    ['#ff3bbd','#ff79d7'],['#ff6b3b','#ffaa5e'],['#3bc8ff','#a8edff'],
    ['#3bffee','#b2ffda'],['#ffd700','#fff176'],['#3b6fff','#90aaff'],
    ['#a03bff','#d49aff'],['#ff9f3b','#ffd08a'],['#3bffee','#a8fff8'],
    ['#c8ff3b','#e8ffaa'],['#ff3b6f','#ff85a1'],['#ff3bbd','#ff79d7'],
  ];

  function monthPrimary(w)   { return MONTH_COLORS[Math.max(0,Math.min(11,Math.floor((w-1)/4)))][0]; }
  function monthSecondary(w) { return MONTH_COLORS[Math.max(0,Math.min(11,Math.floor((w-1)/4)))][1]; }

  function roomColorPair(roomId) {
    const n = parseInt((roomId || "room_01").replace(/\D/g,""), 10) || 1;
    return MONTH_COLORS[(n - 1) % MONTH_COLORS.length];
  }

  // booha_active_week is never written by anything in the repo, so this read
  // resolved to 1 on every visit for every student — the weekly orb layout
  // has been frozen at week 1 since it shipped. CALENDAR is the authority.
  const boohaWeek = (() => {
    try {
      const cw = window.CALENDAR.getCurrentCurriculumWeek();
      const w  = window.CALENDAR.getAcademicWeekNumber(cw);
      if (Number.isInteger(w) && w >= 1) return w;
    } catch (e) {
      console.error('[Karasuki] Week resolution failed:', e);
    }
    return 1;
  })();
  const primary   = monthPrimary(boohaWeek);
  const secondary = monthSecondary(boohaWeek);

  const NPP_RADIUS = 40;

  const NPP = {
    room_01: [
      { dir: "right", x: 1199, y: 638,  to: "room_02", spawn: "fromLeft"  },
      { dir: "up",    x: 1035, y: 339,  to: "room_06", spawn: "fromDown"  }
    ],
    room_02: [
      { dir: "left",  x: 439,  y: 473,  to: "room_01", spawn: "fromRight" },
      { dir: "right", x: 1133, y: 642,  to: "room_03", spawn: "fromLeft"  },
      { dir: "up",    x: 765,  y: 230,  to: "room_07", spawn: "fromDown"  }
    ],
    room_03: [
      { dir: "left",  x: 410,  y: 377,  to: "room_02", spawn: "fromRight" },
      { dir: "right", x: 1093, y: 371,  to: "room_04", spawn: "fromLeft"  },
      { dir: "up",    x: 785,  y: 270,  to: "room_08", spawn: "fromDown"  }
    ],
    room_04: [
      { dir: "left",  x: 382,  y: 606,  to: "room_03", spawn: "fromRight" },
      { dir: "right", x: 1146, y: 660,  to: "room_05", spawn: "fromLeft"  },
      { dir: "up",    x: 548,  y: 270,  to: "room_09", spawn: "fromDown"  }
    ],
    room_05: [
      { dir: "left",  x: 314,  y: 630,  to: "room_04", spawn: "fromRight" },
      { dir: "up",    x: 480,  y: 341,  to: "room_10", spawn: "fromDown"  }
    ],
    room_06: [
      { dir: "right", x: 1229, y: 652,  to: "room_07", spawn: "fromLeft"  },
      { dir: "up",    x: 1033, y: 314,  to: "room_11", spawn: "fromDown"  },
      { dir: "down",  x: 718,  y: 740,  to: "room_01", spawn: "fromUp"    }
    ],
    room_07: [
      { dir: "left",  x: 366,  y: 642,  to: "room_06", spawn: "fromRight" },
      { dir: "right", x: 1108, y: 611,  to: "room_08", spawn: "fromLeft"  },
      { dir: "up",    x: 561,  y: 300,  to: "room_12", spawn: "fromDown"  },
      { dir: "down",  x: 820,  y: 740,  to: "room_02", spawn: "fromUp"    }
    ],
    room_08: [
      { dir: "left",  x: 436,  y: 692,  to: "room_07", spawn: "fromRight" },
      { dir: "right", x: 1186, y: 585,  to: "room_09", spawn: "fromLeft"  },
      { dir: "up",    x: 963,  y: 298,  to: "room_13", spawn: "fromDown"  },
      { dir: "down",  x: 825,  y: 740,  to: "room_03", spawn: "fromUp"    }
    ],
    room_09: [
      { dir: "left",  x: 304,  y: 666,  to: "room_08", spawn: "fromRight" },
      { dir: "right", x: 1148, y: 493,  to: "room_10", spawn: "fromLeft"  },
      { dir: "up",    x: 465,  y: 318,  to: "room_14", spawn: "fromDown"  },
      { dir: "down",  x: 781,  y: 740,  to: "room_04", spawn: "fromUp"    }
    ],
    room_10: [
      { dir: "left",  x: 394,  y: 655,  to: "room_09", spawn: "fromRight" },
      { dir: "up",    x: 838,  y: 270,  to: "room_15", spawn: "fromDown"  },
      { dir: "down",  x: 776,  y: 740,  to: "room_05", spawn: "fromUp"    }
    ],
    room_11: [
      { dir: "right", x: 1167, y: 468,  to: "room_12", spawn: "fromLeft"  },
      { dir: "down",  x: 804,  y: 740,  to: "room_06", spawn: "fromUp"    }
    ],
    room_12: [
      { dir: "left",  x: 431,  y: 494,  to: "room_11", spawn: "fromRight" },
      { dir: "right", x: 1092, y: 642,  to: "room_13", spawn: "fromLeft"  },
      { dir: "down",  x: 733,  y: 740,  to: "room_07", spawn: "fromUp"    }
    ],
    room_13: [
      { dir: "left",  x: 361,  y: 564,  to: "room_12", spawn: "fromRight" },
      { dir: "right", x: 1192, y: 518,  to: "room_14", spawn: "fromLeft"  },
      { dir: "down",  x: 813,  y: 740,  to: "room_08", spawn: "fromUp"    }
    ],
    room_14: [
      { dir: "left",  x: 390,  y: 602,  to: "room_13", spawn: "fromRight" },
      { dir: "right", x: 1170, y: 684,  to: "room_15", spawn: "fromLeft"  },
      { dir: "down",  x: 758,  y: 740,  to: "room_09", spawn: "fromUp"    }
    ],
    room_15: [
      { dir: "left",  x: 407,  y: 645,  to: "room_14", spawn: "fromRight" },
      { dir: "down",  x: 717,  y: 740,  to: "room_10", spawn: "fromUp"    }
    ]
  };

  const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

  let arrivalArrowHiddenUntil     = 0;
  let arrivalArrowBackHiddenUntil = 0;

  /* ═══════════════════════════════════════════
     AUTO-DRIFT ON ROOM ENTRY
  ═══════════════════════════════════════════ */
  const DRIFT_CENTER_X    = WORLD_W / 2;
  const DRIFT_CENTER_Y    = WORLD_H / 2;
  const DRIFT_ARRIVE_DIST = 30;
  const DRIFT_LOCK_MAX_MS = 2200;

  const entryDrift = { active: false, lockUntil: 0 };

  function startEntryDrift() {
    entryDrift.active    = true;
    entryDrift.lockUntil = performance.now() + DRIFT_LOCK_MAX_MS;
    state.clickTarget    = null;  // drift drives itself via tickEntryDrift
    state.moving         = true;
  }

  function tickEntryDrift(now) {
    if (!entryDrift.active) return;
    if (now >= entryDrift.lockUntil) { entryDrift.active = false; state.clickTarget = null; state.moving = false; return; }
    const dx = DRIFT_CENTER_X - state.x, dy = DRIFT_CENTER_Y - state.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= DRIFT_ARRIVE_DIST) { entryDrift.active = false; state.clickTarget = null; state.moving = false; return; }
    // Bypass collision — direct lerp so frame-rate variance can't stall drift on Android
    const step = Math.min(dist, SPEED * 1.1);
    state.x += (dx / dist) * step;
    state.y += (dy / dist) * step;
    state.moving = true;
  }

  function isEntryDriftActive() { return entryDrift.active; }

  /* ═══════════════════════════════════════════
     ORB SYSTEM
  ═══════════════════════════════════════════ */
  const ORB_AUDIO_BASE  = './assets/audio/memories/';
  const ORB_COUNT       = 4;
  const ORB_ROOMS       = ['room_01','room_02','room_03','room_04','room_05',
                            'room_06','room_07','room_08','room_09','room_10',
                            'room_11','room_12','room_13','room_14','room_15'];
  const ORB_DECOY_COUNT = 9;

  const ORB_R    = 10;
  const ORB_GLOW = 28;

  const ORB_MIN_FROM_CENTER   = 220;
  const ORB_MIN_FROM_WANDERER = 90;
  const ORB_MIN_FROM_TREE     = 80;
  const ORB_MIN_FROM_NPP      = 70;

  let orbPopCooldownUntil = 0;
  let weeklyOrbs  = [];
  let orbPanelOpen = false;
  let orbPanelOrb  = null;
  let orbAudio     = null;

  function seededRng(seed) {
    let s = seed >>> 0;
    return function() {
      s ^= s << 13; s ^= s >> 17; s ^= s << 5;
      return ((s >>> 0) / 0xffffffff);
    };
  }

  function seededShuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getWandererCoordsForRoom(roomId) {
    return WANDERER_DEFS.filter(w => w.roomId === roomId).map(w => ({ x: w.x, y: w.y }));
  }
  function getBonusTreeCoordsForRoom(roomId) {
    return BONUS_TREES.filter(t => t.roomId === roomId).map(t => ({ x: t.x, y: t.y }));
  }
  function getNppCoordsForRoom(roomId) {
    return (NPP[roomId] || []).map(n => ({ x: n.x, y: n.y }));
  }

  function isOrbPositionClear(x, y, roomId) {
    if (Math.hypot(x - DRIFT_CENTER_X, y - DRIFT_CENTER_Y) < ORB_MIN_FROM_CENTER) return false;
    for (const w of getWandererCoordsForRoom(roomId)) { if (Math.hypot(x - w.x, y - w.y) < ORB_MIN_FROM_WANDERER) return false; }
    for (const t of getBonusTreeCoordsForRoom(roomId)) { if (Math.hypot(x - t.x, y - t.y) < ORB_MIN_FROM_TREE) return false; }
    for (const n of getNppCoordsForRoom(roomId)) { if (Math.hypot(x - n.x, y - n.y) < ORB_MIN_FROM_NPP) return false; }
    if (x < 120 || x > WORLD_W - 120 || y < 150 || y > WORLD_H - 150) return false;
    return true;
  }

  function generateOrbPosition(roomId, rng) {
    const cx = WORLD_W / 2, cy = WORLD_H / 2;
    for (let attempt = 0; attempt < 30; attempt++) {
      const angle  = rng() * Math.PI * 2;
      const radius = 260 + rng() * 280;
      const x = Math.round(cx + Math.cos(angle) * radius);
      const y = Math.round(cy + Math.sin(angle) * radius * 0.65);
      if (isOrbPositionClear(x, y, roomId)) return { x, y };
    }
    const quadrants = [
      { x: cx - 360, y: cy - 200 }, { x: cx + 360, y: cy - 200 },
      { x: cx - 360, y: cy + 200 }, { x: cx + 360, y: cy + 200 },
      { x: cx,       y: cy - 280 }, { x: cx,       y: cy + 280 },
    ];
    for (const q of quadrants) {
      const x = Math.max(120, Math.min(WORLD_W - 120, Math.round(q.x)));
      const y = Math.max(150, Math.min(WORLD_H - 150, Math.round(q.y)));
      if (isOrbPositionClear(x, y, roomId)) return { x, y };
    }
    return { x: Math.round(cx + 300), y: Math.round(cy + 250) };
  }

  function buildWeeklyOrbs() {
    const rng        = seededRng(boohaWeek * 7919 + 3);
    const roomOrder  = seededShuffle(ORB_ROOMS, rng).slice(0, ORB_COUNT);
    const allDecoys  = Array.from({ length: ORB_DECOY_COUNT }, (_, i) =>
      'decoy_' + String(i + 1).padStart(2, '0'));
    const pickedDecoys = seededShuffle(allDecoys, rng).slice(0, 3);

    const quest     = loadDrifterQuest();
    const memIdx    = (quest && quest.memIdx != null) ? quest.memIdx : 1;
    const drifterId = (quest && quest.active) ? quest.active : 'ks';

    const correctMemoryId = `${drifterId}_a${String(memIdx).padStart(2, '0')}`;

    const orbs = [];
    roomOrder.forEach((roomId, i) => {
      const pos       = generateOrbPosition(roomId, rng);
      const isCorrect = (i === 0);
      const memoryId    = isCorrect ? correctMemoryId : pickedDecoys[i - 1];
      const audioFile = isCorrect
        ? ORB_AUDIO_BASE + correctMemoryId + '.mp3'
        : ORB_AUDIO_BASE + pickedDecoys[i - 1] + '.mp3';
      orbs.push({ memoryId, roomId, x: pos.x, y: pos.y, audioFile, collected: false, isCorrect });
    });
    return orbs;
  }

  // Routed through BoohaSaveFile. Utsuroba writes the quest to the scoped
  // save, so reading the bare key here meant Karasuki never saw an accepted
  // quest and no orbs ever spawned.
  //
  // Cached: loadDrifterQuest() is called from getOrbsForRoom(), which runs
  // inside drawOrbs() every frame. An uncached read is a full localStorage
  // read + JSON.parse + schema migration at 60fps.
  let _questCache = null, _questCacheAt = 0;
  const QUEST_CACHE_MS = 500;

  function invalidateQuestCache() { _questCacheAt = 0; }

  function loadDrifterQuest() {
    const now = performance.now();
    if (_questCacheAt && (now - _questCacheAt) < QUEST_CACHE_MS) return _questCache;
    try {
      const data = (window.BoohaAdventure && BoohaAdventure.save)
        ? BoohaAdventure.save.load()
        : null;
      _questCache   = (data && data.weekly && data.weekly.drifterQuest) || null;
      _questCacheAt = now;
      return _questCache;
    } catch (e) {
      console.error('[Karasuki] Quest read failed:', e);
      return null;
    }
  }

  function saveDrifterQuest(patch) {
    try {
      if (!window.BoohaAdventure || !BoohaAdventure.save) {
        console.error('[Karasuki] Save system unavailable — quest NOT written.');
        return false;
      }
      const data = BoohaAdventure.save.load();
      if (!data.weekly)              data.weekly              = {};
      if (!data.weekly.drifterQuest) data.weekly.drifterQuest = {};
      Object.assign(data.weekly.drifterQuest, patch);
      const ok = BoohaAdventure.save.save(data);
      invalidateQuestCache();
      if (!ok) console.error('[Karasuki] Quest write BLOCKED — no identity.');
      if (ok && window.BoohaSync) BoohaSync.checkpoint('adventure');
      return ok;
    } catch (e) {
      console.error('[Karasuki] Quest write failed:', e);
      return false;
    }
  }

 function initOrbs() {
    weeklyOrbs = buildWeeklyOrbs();
    const quest = loadDrifterQuest();
    if (quest && quest.collectedMemoryId) {
      for (const orb of weeklyOrbs) {
        if (orb.memoryId === quest.collectedMemoryId) { orb.collected = true; break; }
      }
    }
  }

  // Must run AFTER initOrbs() — weeklyOrbs is empty before that, so the
  // lookup silently fails and the session key is consumed for nothing.
  function processWrongOrbReturn() {
    try {
      const key = sessionStorage.getItem('karasuki_return_wrong_orb');
      if (!key) return;
      sessionStorage.removeItem('karasuki_return_wrong_orb');
      returnOrbToKarasuki(key);
    } catch (_) {}
  }

  function returnOrbToKarasuki(memoryId) {
    const orb = weeklyOrbs.find(o => o.memoryId === memoryId);
    if (!orb) return;
    orb.collected = false;
    const rng      = seededRng(boohaWeek * 3571 + Date.now() % 997);
    const otherRooms = ORB_ROOMS.filter(r => r !== orb.roomId);
    const newRoom  = otherRooms[Math.floor(rng() * otherRooms.length)];
    orb.roomId     = newRoom;
    const newPos   = generateOrbPosition(newRoom, rng);
    orb.x          = newPos.x;
    orb.y          = newPos.y;
  }

  function getOrbsForRoom(roomId) {
    const quest = loadDrifterQuest();
    if (!quest || (quest.state !== 'accepted' && quest.state !== 'collected')) return [];
    return weeklyOrbs.filter(o => o.roomId === roomId && !o.collected);
  }

  function clickCheckOrbs(worldX, worldY) {
    if (performance.now() < orbPopCooldownUntil) return false;
    if (isEntryDriftActive()) return false;
    const orbs = getOrbsForRoom(state.roomId);
    for (const orb of orbs) {
      if (Math.hypot(worldX - orb.x, worldY - orb.y) <= ORB_R * 3.5) { openOrbPanel(orb); return true; }
    }
    return false;
  }

  function drawOrbs(now) {
    const orbs = getOrbsForRoom(state.roomId);
    if (!orbs.length) return;
    const sec = now / 1000;
    orbs.forEach((orb, i) => {
      const pulse  = 0.5 + 0.5 * Math.sin(sec * 1.8 + i * 1.1);
      const pulse2 = 0.5 + 0.5 * Math.sin(sec * 2.6 + i * 0.7);
      const bob    = Math.sin(sec * 1.4 + i * 0.9) * 5;
      const ox = orb.x, oy = orb.y + bob;
      ctx.save();
      const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, ORB_GLOW);
      glow.addColorStop(0,   'rgba(255,240,180,0.55)');
      glow.addColorStop(0.4, 'rgba(255,220,100,0.25)');
      glow.addColorStop(1,   'transparent');
      ctx.globalAlpha = 0.5 + pulse * 0.35; ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(ox, oy, ORB_GLOW, 0, Math.PI * 2); ctx.fill();
      const coreR = ORB_R * (0.85 + pulse * 0.18);
      const core  = ctx.createRadialGradient(ox - coreR * 0.3, oy - coreR * 0.3, 0, ox, oy, coreR);
      core.addColorStop(0,    '#ffffff');
      core.addColorStop(0.35, '#fffde0');
      core.addColorStop(0.7,  '#ffd966');
      core.addColorStop(1,    '#c8860a');
      ctx.globalAlpha = 0.95; ctx.shadowBlur = 14 + pulse2 * 10; ctx.shadowColor = '#ffd966';
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(ox, oy, coreR, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.55 + pulse * 0.2; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ox - coreR * 0.28, oy - coreR * 0.28, coreR * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     ORB PANEL
  ═══════════════════════════════════════════ */
  let orbPanelEl = null;

  function injectOrbPanel() {
    if (orbPanelEl) return;
    orbPanelEl = document.createElement('div');
    orbPanelEl.id = 'orb-panel';
    orbPanelEl.style.cssText = `
      display:none;position:fixed;bottom:0;left:0;right:0;z-index:9400;
      background:linear-gradient(180deg,#f7f2e8 0%,#ede5d0 100%);
      border-top:2px solid #c8a96e;border-radius:18px 18px 0 0;padding:0;
      font-family:'Georgia',serif;box-shadow:0 -6px 40px rgba(0,0,0,0.45);
      transform:translateY(100%);transition:transform 0.35s cubic-bezier(.22,.8,.36,1);`;
    orbPanelEl.innerHTML = `
      <div style="max-width:520px;margin:0 auto;padding:22px 28px 28px;">
        <div style="width:44px;height:4px;border-radius:2px;background:#c8a96e;margin:0 auto 18px;opacity:0.55;"></div>
        <button id="orb-panel-close" style="position:absolute;top:16px;right:20px;background:transparent;border:none;cursor:pointer;font-size:1.1rem;color:#8b6914;opacity:0.55;padding:4px 8px;font-family:'Georgia',serif;">✕</button>
        <h2 id="orb-panel-title" style="text-align:center;margin:0 0 4px;font-size:clamp(1.1rem,3.5vw,1.35rem);color:#3a2400;letter-spacing:.08em;text-shadow:0 1px 0 rgba(255,255,255,0.7);">You found a memory!</h2>
        <p style="text-align:center;margin:0 0 18px;font-size:clamp(.8rem,2.5vw,.95rem);color:#5a3c00;letter-spacing:.06em;opacity:0.75;">記憶を見つけた！</p>
        <div style="text-align:center;margin-bottom:18px;">
          <button id="orb-play-btn" style="background:linear-gradient(135deg,#fdf3d0,#f5dfa0);border:1.5px solid #c8a030;border-radius:50%;width:56px;height:56px;cursor:pointer;font-size:1.5rem;box-shadow:0 2px 10px rgba(180,140,0,0.25);transition:all .18s;display:inline-flex;align-items:center;justify-content:center;color:#5a3800;">▶</button>
        </div>
        <div style="display:flex;gap:14px;justify-content:center;margin-bottom:14px;">
          <button id="orb-collect-btn" style="background:linear-gradient(135deg,#fdf3d0,#f0dfa0);border:1.5px solid #b8900a;border-radius:6px;font-family:'Georgia',serif;font-size:clamp(.82rem,2.6vw,.95rem);letter-spacing:.1em;cursor:pointer;padding:10px 30px;color:#3a2000;box-shadow:0 2px 8px rgba(180,140,0,0.2);transition:all .18s;">COLLECT</button>
          <button id="orb-leave-btn" style="background:transparent;border:1.5px solid rgba(139,105,20,0.35);border-radius:6px;font-family:'Georgia',serif;font-size:clamp(.82rem,2.6vw,.95rem);letter-spacing:.1em;cursor:pointer;padding:10px 30px;color:#7a5c1e;transition:all .18s;">LEAVE</button>
        </div>
        <p style="text-align:center;font-size:clamp(.68rem,2vw,.78rem);color:#7a5010;opacity:0.7;margin:0 0 2px;font-style:italic;">Only one memory can be carried at a time.</p>
        <p style="text-align:center;font-size:clamp(.66rem,1.9vw,.76rem);color:#7a5010;opacity:0.5;margin:0;font-style:italic;">※記憶は一つしか持てません。</p>
      </div>`;
    document.body.appendChild(orbPanelEl);
    document.getElementById('orb-panel-close').addEventListener('click', closeOrbPanel);
    document.getElementById('orb-leave-btn').addEventListener('click',   closeOrbPanel);
    document.getElementById('orb-play-btn').addEventListener('click',    playOrbAudio);
    document.getElementById('orb-collect-btn').addEventListener('click', collectOrb);
  }

  /* ── Swap confirmation overlay ── */
  let swapOverlayEl = null;

  function injectSwapOverlay() {
    if (swapOverlayEl) return;
    swapOverlayEl = document.createElement('div');
    swapOverlayEl.id = 'orb-swap-overlay';
    swapOverlayEl.style.cssText = `display:none;position:fixed;inset:0;z-index:9500;align-items:center;justify-content:center;background:rgba(0,0,0,0.72);`;
    swapOverlayEl.innerHTML = `
      <div style="background:linear-gradient(180deg,#f7f2e8,#ede5d0);border:1.5px solid #c8a96e;border-radius:14px;padding:32px 36px 28px;max-width:min(360px,90vw);text-align:center;font-family:'Georgia',serif;box-shadow:0 8px 40px rgba(0,0,0,0.5);">
        <p style="color:#3a2400;font-size:clamp(.9rem,3vw,1.05rem);margin:0 0 8px;line-height:1.6;letter-spacing:.03em;">You're already carrying a memory — swap?</p>
        <p style="color:#7a5010;font-size:clamp(.76rem,2.3vw,.88rem);margin:0 0 22px;opacity:0.7;letter-spacing:.04em;">すでに記憶を持っています。交換しますか？</p>
        <div style="display:flex;gap:14px;justify-content:center;">
          <button id="swap-yes" style="background:linear-gradient(135deg,#fdf3d0,#f0dfa0);border:1.5px solid #b8900a;border-radius:6px;font-family:'Georgia',serif;font-size:.9rem;letter-spacing:.1em;cursor:pointer;padding:9px 28px;color:#3a2000;box-shadow:0 2px 8px rgba(180,140,0,0.2);">YES</button>
          <button id="swap-no"  style="background:transparent;border:1.5px solid rgba(139,105,20,0.35);border-radius:6px;font-family:'Georgia',serif;font-size:.9rem;letter-spacing:.1em;cursor:pointer;padding:9px 28px;color:#7a5c1e;">NO</button>
        </div>
      </div>`;
    document.body.appendChild(swapOverlayEl);
    document.getElementById('swap-yes').addEventListener('click', confirmSwap);
    document.getElementById('swap-no').addEventListener('click', () => { swapOverlayEl.style.display = 'none'; });
  }

  function openOrbPanel(orb) {
    orbPanelOrb  = orb;
    orbPanelOpen = true;
    stopOrbAudio();
    try { if (state.musicStarted) { music.pause(); } } catch (_) {}
    const playBtn = document.getElementById('orb-play-btn');
    if (playBtn) playBtn.textContent = '▶';
    orbPanelEl.style.display = 'block';
    requestAnimationFrame(() => { orbPanelEl.style.transform = 'translateY(0)'; });
    state.clickTarget = null;
  }

  function closeOrbPanel() {
    orbPanelOpen = false;
    orbPanelOrb  = null;
    stopOrbAudio();
    try { if (state.musicStarted) { music.play().catch(() => {}); } } catch (_) {}
    orbPanelEl.style.transform = 'translateY(100%)';
    setTimeout(() => { if (!orbPanelOpen) orbPanelEl.style.display = 'none'; }, 380);
    orbPopCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
  }

  function isOrbPanelOpen() { return orbPanelOpen; }

  function playOrbAudio() {
    if (!orbPanelOrb) return;
    stopOrbAudio();
    orbAudio = new Audio(orbPanelOrb.audioFile);
    orbAudio.volume = 1.0;
    const btn = document.getElementById('orb-play-btn');
    if (btn) btn.textContent = '■';
    orbAudio.play().catch(() => {});
    orbAudio.onended = () => { if (btn) btn.textContent = '▶'; };
  }

  function stopOrbAudio() {
    if (orbAudio) {
      try { orbAudio.onended = null; orbAudio.pause(); orbAudio.currentTime = 0; } catch (_) {}
      orbAudio = null;
    }
    const btn = document.getElementById('orb-play-btn');
    if (btn) btn.textContent = '▶';
  }

  function collectOrb() {
    if (!orbPanelOrb) return;
    const quest = loadDrifterQuest();
    const alreadyCarrying = quest && quest.collectedMemoryId;
    if (alreadyCarrying && quest.collectedMemoryId !== orbPanelOrb.memoryId) {
      swapOverlayEl.style.display = 'flex';
      return;
    }
    doCollect(orbPanelOrb);
  }

  function confirmSwap() {
    swapOverlayEl.style.display = 'none';
    if (orbPanelOrb) doCollect(orbPanelOrb);
  }

  function doCollect(orb) {
    orb.collected = true;
    stopOrbAudio();
    saveDrifterQuest({
      collectedMemoryId : orb.memoryId,
      orbIsCorrect    : orb.isCorrect,
      state           : 'collected',
    });
    closeOrbPanel();
  }

/* ═══════════════════════════════════════════
     WANDERER DEFINITIONS
  ═══════════════════════════════════════════ */
 const WANDERER_DEFS = [
    { index:0,  roomId:'room_01', x:642,  y:496, type:'stay',  frames:['ichi-1.png','ichi-2.png'],                               color:'#ff79d7', size:52,  name:'Ichi',              nameJP:'壱',              desc:'Every summer, three pumpkins grow beside the Karasuki tree. Their faces form from the inside, exactly as they did the year before. By August, their roots can carry them wherever they wish.\n\nIchi is the first to speak. He asks what you are doing, why you are doing it, and why you gave that answer. He will keep asking until you wish you had said nothing.\n\nIchi never harms anyone. He only wants the truth, and he is very good at finding where you hid it.', descJP:'毎年夏になると、カラスキーの木のそばに三つのカボチャが育つ。顔は内側から生まれ、去年とまったく同じ形になる。八月ごろには、根を足のように動かして、好きな場所へ歩いていく。\n\n最初に話し始めるのはイチだ。何をしているのか、なぜするのか、なぜそう答えたのか。こちらが何も言わなければよかったと思うまで、質問は続く。\n\nイチは誰も傷つけない。ただ本当のことを知りたいだけだ。そして、隠した場所を見つけるのがとてもうまい。' },
    { index:1,  roomId:'room_01', x:798,  y:418, type:'stay',  frames:['mr_happy-1.png','mr_happy-2.png'],                       color:'#ffd166', size:110, name:'Mister Happy',      nameJP:'ミスター・ハッピー', desc:'Mister Happy is not a clown. He comes from a traveling people who naturally look like him. They cross seen and unseen places, searching for anyone who needs happiness.\n\nPeople once laughed at his face. They dressed like him, told frightening stories, and taught children to fear the smile he was born with. Mister Happy never answered them with cruelty. He has never told a lie or spoken badly about anyone.\n\nHe still travels. He still brings lost things home. He still believes people may be happy to see him.', descJP:'ミスター・ハッピーはピエロではない。彼と同じ姿をした者たちは、見える場所と見えない場所を旅しながら、幸せを必要としているものを探している。\n\n昔、人々は彼の顔を笑った。同じ服を着てまねをし、生まれつきの笑顔を怖い話に変え、子どもたちまで怖がらせた。それでも、ミスター・ハッピーは意地悪を返さなかった。うそをついたことも、誰かの悪口を言ったこともない。\n\n今も旅を続け、失われたものを連れて帰る。そして、人が自分を見て喜ぶかもしれないと、今も信じている。' },
    { index:2,  roomId:'room_02', x:882,  y:263, type:'stay',  frames:['tom_katsu-1.png','tom_katsu-2.png'],                     color:'#ffaa5e', size:65,  name:'Tom Katsu',          nameJP:'トム・カツ',          desc:'Tom Katsu once lived in a circus. Balloons were tied around the smallest pigs, and visitors paid to throw darts at them. The crowd laughed whenever a balloon burst. Tom hardly noticed when a dart struck him. He was too happy to have a balloon of his own.\n\nHe never understood why it had to be taken away each day. He did not know what the circus planned for him next.\n\nMister Happy brought Tom to Karasuki. Tom does not speak, but every morning a new balloon waits beside him.', descJP:'トム・カツは、昔サーカスにいた。小さなブタの体に風船をつけ、客がお金を払ってダーツを投げる遊びがあった。風船が割れるたびに、人々は笑った。ダーツが体に当たっても、トムはほとんど気にしなかった。自分の風船を持てたことが、うれしかったからだ。\n\nなぜ毎日取られてしまうのか、その次に何が待っていたのか、トムは知らなかった。\n\nミスター・ハッピーが彼をカラスキーへ連れてきた。トムは話さない。それでも毎朝、そばには新しい風船が待っている。' },
    { index:3,  roomId:'room_03', x:546,  y:308, type:'stay',  frames:['uhibon-1.png','uhibon-2.png'],                           color:'#a8edff', size:72,  name:'Uhibon',             nameJP:'ウヒボン',          desc:'Uhibon does not remember what he is. He cannot name the place he came from or the person he may have been. He only feels that an answer exists somewhere beyond one of Karasuki\'s many doors.\n\nHe wanders from place to place, gathering small clues that may belong to him. Most lead nowhere. Some feel familiar enough to hurt.\n\nOctober Moriyama named him after the sound of his laugh: "Uh-hi-hi-hi."\n\nUhibon remembers the laugh. For now, one remembered sound is enough to keep him searching.', descJP:'ウヒボンは、自分が何なのか覚えていない。どこから来たのか、以前は誰だったのか、それを表す名前さえ分からない。ただ、カラスキーにある無数の扉のどれか、その向こうに答えがあるような気がしている。\n\n彼は場所から場所へ歩き、自分のものかもしれない小さな手がかりを集めている。ほとんどは何にもつながらない。中には、胸が痛くなるほど懐かしいものもある。\n\n「ウヒヒヒ」という笑い声を聞いて、森山オクトーバーがウヒボンと名づけた。その音を覚えているだけで、今は探し続けられる。' },
    { index:4,  roomId:'room_04', x:888,  y:422, type:'stay',  frames:['jacki-1.png','jacki-2.png'],                             color:'#b2ffda', size:110, name:'Jacki',              nameJP:'ジャッキー',        desc:'The mind dislikes shapes it cannot explain. It fills empty spaces, smooths rough edges, and turns strange things into familiar ones.\n\nThat may be why Jacki looks like a figure with a large pumpkin head. It is an easy shape to accept. Most people stop wondering after that.\n\nJacki appears rarely, and never by accident. October met him when she was younger. She calls him a friend, although neither of them explains what that means.\n\nOnce Jacki leaves, remembering exactly what you saw becomes surprisingly difficult.', descJP:'人の心は、説明できない形を嫌う。足りない部分をうめ、でこぼこをなめらかにして、知らないものを見慣れた姿に変えてしまう。\n\nだからジャッキーは、大きなカボチャの頭を持つ姿に見えるのかもしれない。それなら分かりやすく、多くの人はそれ以上考えなくなる。\n\nジャッキーが現れることは少なく、偶然に来ることもない。オクトーバーは幼いころに彼と出会い、友だちだと言っている。ただし、その意味を二人とも説明しない。\n\n彼が去ったあと、何を見たのか正しく思い出すことは、驚くほど難しくなる。' },
    { index:5,  roomId:'room_05', x:1054, y:354, type:'stay',  frames:['jamariko-1.png','jamariko-2.png'],                       color:'#fff176', size:70,  name:'Jamariko',           nameJP:'ジャマリコ',        desc:'Jamariko are always pleasant to find. Their faces are friendly, their steps are gentle, and seeing one can brighten an ordinary day.\n\nThe trouble begins immediately afterward.\n\nA Jamariko will stand in the doorway you need, sit on the object you came to collect, or wander into the exact place you are trying to see. Walking around it rarely helps. Somehow, it is already in the new way.\n\nJamariko never mean to cause harm. They simply belong wherever someone is trying to do something else.', descJP:'ジャマリコに会うと、誰でも少しうれしくなる。親しみやすい顔で、やさしく歩き、いつもの一日を明るくしてくれる。\n\n困るのは、そのすぐあとだ。\n\n通りたい入り口に立ち、取りたい物の上に座り、見たい場所のちょうど真ん中へ入ってくる。よけて進もうとしても、なぜか次の道にも先にいる。\n\nジャマリコに悪気はなく、誰かを傷つけたいわけでもない。誰かが別のことをしようとする場所が、ただジャマリコのいる場所になる。' },
    { index:6,  roomId:'room_05', x:1029, y:502, type:'stay',  frames:['san-1.png','san-2.png'],                                 color:'#ffd08a', size:52,  name:'San',                nameJP:'参',                desc:'San is the third pumpkin to grow beside the Karasuki tree. The first time his mouth opened, he bit the tree before anyone could stop him. Broken pieces of wood remained between his lips, giving him the sharpest smile of the three.\n\nSan races through Karasuki on tangled roots. He moves signs, hides harmless objects, and laughs before his tricks have even begun. Mister Happy says San will never truly hurt anyone.\n\nThat is probably true. A quiet San is still a good reason to check behind you.', descJP:'サンは、カラスキーの木のそばに育つ三番目のカボチャだ。初めて口が開いた瞬間、誰にも止められないうちに木へかみついた。折れた木のかけらが口に残り、三人の中でいちばんするどい笑顔になった。\n\nサンは、からまった根でカラスキーを走り回る。案内を動かし、危なくない物を隠し、いたずらを始める前から笑っている。ミスター・ハッピーは、本当に誰かを傷つけることはないと言う。\n\nたぶん、それは本当だ。サンが静かなときは、後ろを確かめたほうがいい。' },
    { index:7,  roomId:'room_06', x:819,  y:268, type:'haunt', frames:['gorogane-1.png','gorogane-2.png'],                       color:'#a8fff8', size:120, name:'Gorogui',            nameJP:'ゴログイ',          desc:'The Gorogui were once hungry people. Others stopped seeing their lives and saw only their hunger. The cruel idea lasted longer than the people did, until nothing else remained.\n\nNow the Gorogui think only of food. They have no names, no past, and no memory of being human. A promised meal can lead them almost anywhere. Someone who understands this can control an entire group without touching them.\n\nWhen a Gorogui looks at you, it is not angry. It is deciding whether you stand between it and something edible.', descJP:'ゴログイは、かつて空腹に苦しむ人々だった。周りの人は、その暮らしを見なくなり、空腹だけを見るようになった。人を小さくした残酷な考えだけが本人より長く残り、やがてほかのすべてが消えた。\n\n今のゴログイは食べ物しか考えない。名前も過去もなく、人だった記憶も残っていない。食べ物を約束すれば、ほとんどどこへでもついてくる。そのことを知る者は、触れることなく大勢を動かせる。\n\nゴログイがこちらを見るとき、怒っているのではない。食べ物までの道に、あなたがいるかを見ている。' },
    { index:8,  roomId:'room_06', x:522,  y:350, type:'haunt', frames:['sumiyo_horaguchi-1.png','sumiyo_horaguchi-2.png'],       color:'#90aaff', size:88,  name:'Sumiyo Horaguchi',  nameJP:'洞口すみよ',        desc:'Long ago, a lonely woman lived in the mountains. She welcomed travelers and gave sweets to children because she wanted company. Stories about her slowly changed. Each telling made her stranger, crueler, and less human.\n\nThe woman is gone. Sumiyo is what the rumors became.\n\nIf you see her, she sees you. She cannot move closer while someone watches, and she cannot enter a home without permission. Once invited inside, she stays and quietly drains away its happiness.\n\nHer smile looks almost like someone\'s grandmother. Almost.', descJP:'昔、山の中に孤独な老女が住んでいた。人と一緒にいたくて、旅人を泊め、子どもにはお菓子をあげていた。彼女のうわさは少しずつ変わり、語られるたびに奇妙で、残酷で、人ではないものになっていった。\n\nもう、その女性はどこにもいない。すみよは、うわさそのものだ。\n\n彼女を見れば、向こうもこちらを見る。見られている間は近づけず、許されなければ家に入れない。一度招かれると中に残り、幸せを静かに吸い取っていく。\n\nその笑顔は、誰かのおばあさんに少し似ている。ほんの少しだけ。' },
    { index:9,  roomId:'room_07', x:815,  y:398, type:'stay',  frames:['amekuro-1.png','amekuro-2.png'],                         color:'#d49aff', size:52,  name:'Amekuro',            nameJP:'アメクロ',          desc:'Amekuro will speak to anyone. They greet strangers like old friends and continue talking long after everyone else has run out of things to say.\n\nSweets are the only subject that can fully hold their attention. If you carry candy, an Amekuro will ask for it. If you already ate it, the questions will continue. They do not accept that something can be gone simply because it is inside you.\n\nAmekuro dislike hearing no. Fortunately, they like hearing themselves talk even more.', descJP:'アメクロは、誰にでも話しかける。知らない相手にも昔からの友だちのようにあいさつし、ほかの人が話すことをなくしても、ずっとしゃべり続ける。\n\nアメクロが本気で気にするのは、甘いものだけだ。お菓子を持っていれば、分けてほしいと頼んでくる。もう食べたと言っても、質問は終わらない。体の中に入っただけで、なくなったとは考えないからだ。\n\n断られるのは嫌いだ。それ以上に、自分の話を聞くことが好きなので、助かることもある。' },
    { index:10, roomId:'room_07', x:456,  y:470, type:'stay',  frames:['snakuma-1.png','snakuma-2.png'],                         color:'#88ff88', size:150, name:'Snakuma',            nameJP:'スナクマ',          desc:'Snakuma move slowly through the forests of Karasuki, carrying things they have gathered along the way. Most ignore travelers completely.\n\nA Snakuma only becomes interested when someone has an object it wants. Giving it away usually ends the meeting. Refusing may cause the Snakuma to follow, patiently and without making a sound.\n\nDrifters sometimes disappear in those forests. No one knows where they go. Later, a familiar hat, scarf, or bag may appear among the objects on a Snakuma\'s back.\n\nIt is best not to ask where it found them.', descJP:'スナクマは、道で集めた物を背負いながら、カラスキーの森をゆっくり歩く。たいていは、旅人が通ってもまったく気にしない。\n\n誰かが欲しい物を持っているときだけ、スナクマは興味を示す。渡せば、たいてい出会いはそこで終わる。断ると、音を立てず、急ぐこともなく、いつまでも後ろからついてくる。\n\n森では、ときどき旅人がいなくなる。行き先は誰にも分からない。そのあと、見覚えのある帽子やかばんが、スナクマの背中に増えていることがある。\n\nどこで見つけたのかは、聞かないほうがいい。' },
    { index:11, roomId:'room_08', x:979,  y:397, type:'stay',  frames:['robert-1.png','robert-2.png'],                           color:'#ffaa88', size:72,  name:'Robert',             nameJP:'ロバート',          desc:'Robert is the eldest of three shapeshifting brothers, although none of them will confirm where they came from. He often takes the form of a bakedanuki because people find it easier to understand. Calling him a tanuki is still considered rude.\n\nRobert sees through disguises, excuses, and people. He may offer exactly the help someone needs, then collect a benefit they never noticed agreeing to.\n\nHe is too clever to enter danger by accident. If Robert is helping you escape, something nearby has probably become inconvenient for him as well.', descJP:'ロバートは、姿を変える三兄弟の長男だ。ただし、三人とも自分たちがどこから来たのか教えない。人が理解しやすいため、化けだぬきのような姿になることが多い。それでも、たぬきと呼ぶのは失礼らしい。\n\nロバートは、変装も、言い訳も、人の心も見ぬく。必要な助けをちょうどよく差し出し、いつ約束したのか分からない代わりの物を、あとで受け取ることがある。\n\n間違って危険に入るほど、彼はおろかではない。逃げる手伝いをしているなら、近くの何かが彼にも迷惑なのだろう。' },
    { index:12, roomId:'room_08', x:1113, y:409, type:'stay',  frames:['jeffrey-1.png','jeffrey-2.png'],                         color:'#ffcc44', size:65,  name:'Jeffrey',            nameJP:'ジェフリー',        desc:'Jeffrey is one of three shapeshifting brothers. His bakedanuki form is comfortable enough to look at, although his smile suggests that he already knows what you are about to say.\n\nJeffrey tells the truth in the most unpleasant way available. A kind answer may exist, but he rarely chooses it. His sharp words keep people far enough away that they cannot easily use him.\n\nHe sometimes helps, especially when another creature is becoming troublesome. Gratitude is unnecessary. Jeffrey will insist that your rescue was merely the fastest way to improve his own day.', descJP:'ジェフリーは、姿を変える三兄弟の一人だ。化けだぬきの姿は見ていて安心できるが、その笑顔は、こちらが次に言うことをもう知っているように見える。\n\nジェフリーは本当のことを、いちばん感じの悪い言い方で伝える。やさしい答えがあっても、めったに選ばない。するどい言葉で相手を遠ざければ、自分を利用されにくくなるからだ。\n\n面倒なものが近くに来ると、助けてくれることもある。お礼はいらない。あなたを救ったのは、自分の一日を早く楽にするためだったと言うだろう。' },
    { index:13, roomId:'room_08', x:1256, y:444, type:'stay',  frames:['johnny-1.png','johnny-2.png'],                           color:'#ff8844', size:70,  name:'Johnny',             nameJP:'ジョニー',          desc:'Johnny is the third shapeshifting brother. Robert and Jeffrey often resemble bakedanuki. Johnny usually looks like an ordinary middle-aged man because choosing anything more interesting would require effort.\n\nHe becomes bored before most conversations have properly begun. Questions receive half an answer. Plans lose his attention halfway through. Danger bothers him mainly because it interrupts whatever he was doing first.\n\nJohnny cannot be trusted, yet he may still lead someone out of trouble. This does not make him brave. It only means staying there had become more annoying than helping.', descJP:'ジョニーは、姿を変える三兄弟の三人目だ。ロバートとジェフリーは化けだぬきのような姿になることが多い。ジョニーは、ふつうの中年男性に見えることが多い。もっと面白い姿を選ぶには、少し努力が必要だからだ。\n\nたいていの会話が始まる前に、彼はもうあきている。質問には半分だけ答え、計画の途中で興味をなくす。危険が嫌なのも、それまでしていたことを邪魔されるからだ。\n\n信用はできないが、困った場所から案内してくれることはある。勇気があるのではない。そこに残るほうが、助けるより面倒になっただけだ。' },
    { index:14, roomId:'room_09', x:843,  y:413, type:'haunt', frames:['nulvane-1.png','nulvane-2.png'],                         color:'#c8aaff', size:120, name:'Nulvane',            nameJP:'ヌルヴェイン',      desc:'Not every person becomes real in the usual way. Someone imagines a child they may have one day. A writer begins a character and never finishes. A rumor invents a person who never existed.\n\nThose possible people do not always disappear when the thought is abandoned. In Karasuki, they gather into flickering forms called Nulvane.\n\nThey are the lives that would have been, could have been, or should have been. Looking at one may bring back a face you never truly knew.\n\nSometimes the Nulvane seem to recognize you first.', descJP:'すべての人が、ふつうの形で生まれるわけではない。いつか生まれるかもしれない子どもを思いうかべる人がいる。作家が登場人物を考え、完成させないこともある。うわさの中で、いなかった人が作られることもある。\n\nその考えが捨てられても、可能性の人々は必ず消えるとは限らない。カラスキーでは、ちらちらとゆれるヌルヴェインの姿になる。\n\n彼らは、そうなったはず、なれたかもしれない、なればよかった人生だ。見つめると、本当には知らない顔を思い出すことがある。\n\nヌルヴェインのほうが、先にあなたを知っているように見えることもある。' },
    { index:15, roomId:'room_10', x:1233, y:452, type:'stay',  frames:['ni-1.png','ni-2.png'],                                   color:'#e8ffaa', size:52,  name:'Ni',                 nameJP:'弐',                desc:'Ni is the second of three pumpkins that return beside the Karasuki tree each summer. He is always the last to leave in autumn, which gives the crows plenty of time to notice him.\n\nBy October, Ni is covered in white spots. He believes they are rare markings that appear only on the most important pumpkins. No explanation has changed his mind for long.\n\nNi accepts nearly every remark as praise. An insult may confuse him for a moment, but the unpleasant part disappears before it can settle. Soon, he is smiling again and showing off his special white markings.', descJP:'ニは、毎年夏にカラスキーの木のそばへ戻る、三つのカボチャの二番目だ。秋になっても最後まで残るので、カラスたちに見つかる時間がたっぷりある。\n\n十月になるころ、ニは白い点だらけになる。本人は、それが特別なカボチャだけに現れる、めずらしい模様だと信じている。どれほど説明しても、その考えが長く変わることはない。\n\nニは、ほとんど何を言われても、ほめ言葉だと思う。悪口を聞けば少し困った顔をするが、いやな部分は心に残る前に消えてしまう。すぐにまた笑顔になり、自分の特別な白い模様を自慢する。' },
    { index:16, roomId:'room_11', x:935,  y:397, type:'stay',  frames:['columbus-1.png','columbus-2.png'],                       color:'#ff85a1', size:58,  name:'Columbus',           nameJP:'コロンバス',        desc:'Dogs sometimes notice visitors that people cannot see. Columbus notices them and immediately decides they have come to play.\n\nHe is the happiest dog in Karasuki. Nothing frightens him, and no shadow is too strange to chase. Throw something for him and he may run in the wrong direction, returning only when he has discovered a completely different game.\n\nSome people believe dark things are afraid of dogs. They are not. Most simply prefer quiet rooms where an excited Columbus is not barking, running, and trying to become their friend.', descJP:'犬はときどき、人には見えない訪問者に気づく。コロンバスも気づくが、すぐに遊びに来た相手だと思ってしまう。\n\n彼はカラスキーでいちばん幸せな犬だ。何も怖がらず、どれほど奇妙な影でも追いかける。何かを投げると反対の方向へ走り、まったく別の遊びを見つけてから戻ってくることもある。\n\n暗いものは犬を怖がる、と考える人がいる。それは違う。元気なコロンバスが、ほえ、走り、友だちになろうとしない静かな部屋を好んでいるだけだ。' },
    { index:17, roomId:'room_12', x:700,  y:270, type:'stay',  frames:['october_moriyama-1.png','october_moriyama-2.png'],       color:'#ff79d7', size:78,  name:'October Moriyama',  nameJP:'森山オクトーバー',   desc:'Everyone has another version of themselves. It is the person who chooses the other door, gives the answer you swallowed, or looks directly at what you avoid.\n\nOctober Moriyama lives like that opposite made real. She dresses to disappear while noticing everything around her. Fear receives a shrug and the same calm answer: she is fine. She is always fine.\n\nSomething still moves beneath that answer. Perhaps courage is not the absence of fear. Perhaps it is what remains when your opposite is afraid and keeps looking anyway.', descJP:'誰にでも、反対の自分がいる。自分が選ばなかった扉を開け、飲みこんだ言葉を口にし、目をそらしたものをまっすぐ見る人だ。\n\n森山オクトーバーは、その反対が本物になったように生きている。目立たない服を着ながら、周りのすべてに気づく。怖いものを前にしても肩をすくめ、いつも同じように答える。大丈夫。いつでも大丈夫。\n\nその言葉の下では、何かがまだ動いている。勇気とは、怖くないことではないのかもしれない。反対の自分が怖くても、見続けることなのかもしれない。' },
    { index:18, roomId:'room_13', x:407,  y:387, type:'stay',  frames:['takachika_green-1.png','takachika_green-2.png'],         color:'#7fffd4', size:77,  name:'Takachika Green',   nameJP:'グリーン・タカチカ', desc:'Takachika Green wanted to see something hiding in the shadows. He did not care what it was. Wanting was enough.\n\nPeople ignore many things so daily life can remain ordinary. The ignored things do not always agree to stay unseen. Some wait for a person curious enough to look twice.\n\nTakachika looked.\n\nOnce you notice the deeper places, they begin to notice you. A hallway can become longer. A familiar room can gain another door. Your own reflection may seem to remember something you do not.\n\nHe got what he wanted.', descJP:'グリーン・タカチカは、影に隠れている何かを見たいと願った。それが何なのかは、どうでもよかった。見たいという気持ちだけで十分だった。\n\n毎日をふつうに過ごすため、人は多くのものを見ないことにする。見られなくなったものが、いつまでも隠れることに同意するとは限らない。二度見るほど好奇心の強い人を、待っているものもある。\n\nタカチカは見た。\n\n深い場所に気づけば、向こうもこちらに気づき始める。廊下は長くなり、見慣れた部屋に別の扉ができる。鏡の中の自分が、知らない記憶を持っているように見えることもある。\n\n彼の願いはかなった。' },
    { index:19, roomId:'room_13', x:609,  y:642, type:'stay',  frames:['pugoo-1.png','pugoo-2.png'],                             color:'#ffcc66', size:55,  name:'Pugoo',              nameJP:'パグー',            desc:'A room feels different when Pugoo is sleeping in it. The shadows stay near the walls. Small sounds become careful. Things that prefer to appear unnoticed often choose another place.\n\nSome believe Pugoo is guarding the room. Pugoo has never confirmed this. He may simply be a fat, comfortable cat who dislikes being disturbed.\n\nHis purr settles whatever is nearby. His hiss can send strange visitors away. Whether he understands this is difficult to tell.\n\nPugoo usually closes his eyes before anyone can ask.', descJP:'パグーが眠っていると、部屋の感じが変わる。影は壁の近くにとどまり、小さな音まで静かになる。誰にも気づかれずに現れたいものは、別の場所を選ぶことが多い。\n\nパグーが部屋を守っていると考える人もいる。本人がそう言ったことはない。ただの太った、気持ちよく眠りたい猫かもしれない。\n\nのどを鳴らすと、近くのものは落ち着く。ひと声うなると、奇妙な訪問者が逃げることもある。自分の力を分かっているのかは不明だ。\n\n質問される前に、たいてい目を閉じてしまう。' },
    { index:20, roomId:'room_14', x:930,  y:318, type:'haunt', frames:['ena_yamakage-1.png','ena_yamakage-2.png'],               color:'#ffb3d9', size:81,  name:'Ena Yamakage',       nameJP:'山影えな',          desc:'Ena Yamakage is a rumor with the shape of a young woman. One look is enough for her to see every secret you hoped would remain hidden.\n\nShe points. She laughs. The sound repeats whatever you are most ashamed to hear. Paying attention makes it clearer, and listening too long gives it a place inside your thoughts.\n\nLeaving Ena behind does not always stop the laughter. Years later, a quiet room may return it exactly as it sounded before.\n\nRumors need attention to grow. Unfortunately, ignoring one becomes difficult after it has said your name.', descJP:'山影えなは、若い女性の姿をしたうわさだ。一度見られただけで、隠しておきたかった秘密をすべて知られてしまう。\n\n彼女は指をさして笑う。その声は、自分がいちばん聞きたくないことを何度もくり返す。気にするほどはっきり聞こえ、長く聞けば心の中に居場所を作ってしまう。\n\nえなから逃げても、笑い声が止まるとは限らない。何年もあと、静かな部屋で、昔とまったく同じ音が戻ることもある。\n\nうわさは注目されるほど育つ。自分の名前を呼ばれたあとでは、無視することも難しい。' },
    { index:21, roomId:'room_15', x:850,  y:480, type:'haunt', frames:['tsukigase_jubei-1.png','tsukigase_jubei-2.png'],         color:'#ffcc66', size:100, name:'Jubei Tsukigase',    nameJP:'月ヶ瀬寿兵衛',      desc:'Jubei Tsukigase was a farmer who believed work must come before everything. He worked while his children grew, while they left home, and while his wife grew old. Eventually, there was no one waiting when he finished.\n\nJubei stopped sleeping and continued working. When he finally understood how much of life had passed without him, regret became anger. The anger did not remain only in his heart.\n\nSomething hard began growing beneath his skin. Each day, Jubei looked a little less like a tired man and a little more like an oni.', descJP:'月ヶ瀬寿兵衛は、何よりも仕事が先だと信じる農夫だった。子どもたちが育つ間も、家を出るときも、妻が年を取る間も働き続けた。仕事を終えたころには、待っている人は誰もいなかった。\n\n寿兵衛は眠ることをやめ、それでも働いた。自分のいないところで人生がどれほど過ぎたのか、ようやく気づいたとき、後悔は怒りに変わった。その怒りは、心の中だけには収まらなかった。\n\n皮ふの下で、かたい何かが育ち始めた。疲れた男の姿が、毎日少しずつ鬼に近づいていった。' },
    { index:22, roomId:'room_02', x:601,  y:410, type:'stay',  frames:['denoying-1.png','denoying-2.png'],                       color:'#a8edff', size:70,  name:'Denoying',           nameJP:'ディノイング',       desc:'Denoying cannot hold a conversation in memory for very long. One may begin a story, forget it was speaking, then begin the same story again with complete excitement.\n\nAnswers disappear almost as soon as they are heard. Names must be given again. Explanations return to their first sentence. Each repetition feels new to the Denoying, even when everyone else knows every word.\n\nMinutes become hours around them. The subject may change many times, although the conversation never truly moves.\n\nA Denoying does not remember wasting your afternoon. It only remembers enjoying the company. When the Denoying meets you again, the same afternoon begins from the beginning.', descJP:'ディノイングは、会話を長く覚えていられない。話の途中で、自分が話していたことを忘れ、まったく同じ話を初めてのように楽しそうに始めることがある。\n\n聞いた答えはすぐに消える。名前は何度も教えなければならず、説明はいつも最初の一文へ戻る。ほかの人が全部覚えていても、ディノイングには毎回新しい話に聞こえる。\n\nそばにいると、数分が何時間にもなる。話題は何度も変わるのに、会話はどこにも進まない。\n\nこちらの午後を使い切ったことは覚えていない。一緒にいて楽しかったことだけ覚えている。次に会ったとき、同じ午後がまた最初から始まる。' },
    { index:23, roomId:'room_12', x:449,  y:569, type:'stay',  frames:['poopika-1.png','poopika-2.png'],                         color:'#ffcc66', size:58,  name:'Poopika',            nameJP:'プピカ',            desc:'Poopika begin with someone who spends too long admiring a mirror. The person looks again and again, certain that nothing could be cuter. Their confidence becomes so strong that the reflection starts taking a little something for itself.\n\nEventually, a Poopika steps away from the glass.\n\nPoopika constantly announce how cute they are and expect everyone nearby to agree. At first, agreement is easy. Their bright faces and excited movements are difficult to resist.\n\nLooking longer reveals something slightly wrong. The Poopika will notice if your smile changes.', descJP:'プピカは、鏡を長く見すぎた人から始まる。その人は何度も自分を見て、これ以上かわいいものはないと信じる。その自信があまりに強くなると、鏡の中の姿が何かを少しずつ受け取り始める。\n\nやがて、鏡の中からプピカが出てくる。\n\nプピカは、自分がどれほどかわいいかを何度も話し、近くの人にも同意してほしがる。最初は簡単だ。明るい顔と元気な動きは、本当にかわいく見える。\n\n長く見つめると、少しだけおかしい部分に気づく。笑顔が変われば、プピカも気づく。' },
    { index:24, roomId:'room_11', x:1170, y:381, type:'stay',  frames:['whistler-1.png','whistler-2.png'],                       color:'#c8d8ff', size:58,  name:'Whistler',           nameJP:'ウィスラー',         desc:'Whistlers work constantly in places no one is watching. They move behind walls, beneath floors, and through shadows at the edge of a busy room.\n\nSmall objects disappear wherever they have been. A key leaves its hook. A button vanishes from a coat. Something kept safely for years is suddenly not where it belongs.\n\nWhistlers cannot always be seen, but their tune carries through Karasuki after dark. The same sound sometimes enters ordinary homes.\n\nIf you hear whistling inside your house, searching for the Whistler can wait. First, discover what is missing.', descJP:'ウィスラーは、誰も見ていない場所で休まず働く。壁の後ろ、床の下、にぎやかな部屋のすみの影を通って動いている。\n\n通った場所では、小さな物が消える。かぎが置き場所からなくなり、コートのボタンが取れ、何年も大切にしまっていた物が、急にあるべき場所から消えてしまう。\n\n姿が見えなくても、夜のカラスキーには口笛が流れる。同じ音が、ふつうの家に入ることもある。\n\n家の中で口笛を聞いたら、姿を探すのはあとでいい。まず、何がなくなったか確かめよう。' },
    { index:25, roomId:'room_10', x:993,  y:421, type:'stay',  frames:['woozlebock-1.png','woozlebock-2.png'],                   color:'#b8d4c8', size:58,  name:'Woozlebock',         nameJP:'ウーズルボック',     desc:'Not everything that enters Karasuki comes from fear. Kind thoughts can be forgotten too. Comfort given during a difficult night may outlast the person who offered it.\n\nWoozlebock carry that warmth into dark places. They find sadness hiding in broken things and gently take some of its weight away. No bargain is requested, and nothing cruel follows after.\n\nPeople often search for a trick because simple goodness feels suspicious. The Woozlebock wait patiently while they search.\n\nThey stay until the room feels lighter, then continue on.', descJP:'カラスキーに来るものが、すべて恐れから生まれるわけではない。やさしい考えも忘れられる。苦しい夜にもらった安心が、それをくれた人より長く残ることもある。\n\nウーズルボックは、そのぬくもりを暗い場所へ運ぶ。こわれたものの中に隠れた悲しみを見つけ、その重さを少しだけ、やさしく持ち去る。代わりの物は求めず、あとで残酷なことも起こらない。\n\nただの善意はあやしいと感じ、仕かけを探す人も多い。ウーズルボックは、その間も静かに待っている。\n\n部屋が少し明るくなるまでそばにいて、それから次の場所へ歩いていく。' },
    { index:26, roomId:'room_04', x:516,  y:444, type:'stay',  frames:['tanoshiika-1.png','tanoshiika-2.png'],                   color:'#ffe0a0', size:58,  name:'Tanoshiika',         nameJP:'タノシイカ',         desc:'Tanoshiika hear genuine laughter from very far away. They arrive wherever people have forgotten themselves inside a game, a joke, a song, or a wonderfully foolish idea.\n\nNo invitation is needed. A Tanoshiika joins the fun as if it had always been included. It dances badly, laughs loudly, and enjoys everyone exactly as they are.\n\nThe moment enjoyment becomes forced, the Tanoshiika notices. An argument, an embarrassed silence, or one false laugh is enough to make it leave.\n\nAnother may visit when the laughter becomes real again.', descJP:'タノシイカには、遠くの本当の笑い声が聞こえる。遊びや冗談、歌、とてもくだらない考えに夢中になり、自分のことまで忘れて楽しんでいる場所へやってくる。\n\n呼ぶ必要はない。最初から仲間だったように遊びへ入り、上手ではない踊りをおどり、大きな声で笑い、誰のこともそのまま楽しむ。\n\n楽しさが作りものになった瞬間、タノシイカは気づく。けんか、はずかしい沈黙、一つの作り笑いだけで、いなくなってしまう。\n\n本当の笑い声が戻れば、また別のタノシイカが遊びに来るかもしれない。' },
    { index:27, roomId:'room_15', x:1200, y:400, type:'haunt', frames:['mikachan-1.png','mikachan-2.png'],                       color:'#9988cc', size:90,  name:'Mikachan',           nameJP:'ミカちゃん',         desc:'Mikachan is a bogeyman that travels through nightmares. Its head resembles an entire human doll. Behind that false person stands another shape with arms and legs far too long, as if one body is being worn by something larger.\n\nIt waits in bedroom shadows and moves only after the dream has become difficult to remember. Waking up does not always send it away. A frightened person may carry Mikachan into the next dream they describe.\n\nThat is how it passes between people.\n\nSome nightmares are shared because someone told them too well.', descJP:'ミカちゃんは、悪夢を通って移動するおばけだ。頭は、人間そっくりの人形を一体そのまま乗せたように見える。その後ろには、長すぎる手足を持つ別の形が立ち、大きな何かが人の姿を着ているようだ。\n\n寝室の影で待ち、夢を思い出しにくくなってから動き始める。目を覚ましても、必ず消えるとは限らない。怖がった人が夢の話をすると、次に聞いた人の夢へ運ばれることがある。\n\nそれが、人から人へ移る方法だ。\n\n誰かが上手に話しすぎたため、同じ悪夢を見ることもある。' },
    { index:28, roomId:'room_01', x:1048, y:477, type:'stay',  frames:['kara-ageha-1.png','kara-ageha-2.png'],                   color:'#ffccaa', size:58,  name:'Kara Ageha',         nameJP:'カラ・アゲハ',       desc:'Kara Ageha was a hen who laid more than eight hundred eggs. She wanted to keep only one. The farm took every egg away, and when she could no longer lay them, it planned to take her away too.\n\nMister Happy found her first.\n\nIn Karasuki, he gave Kara Ageha a small bag and filled it with smooth stones shaped like eggs. She carries them everywhere and checks them often. They are not what she lost.\n\nKara Ageha knows this. She loves them anyway, which makes them something new.', descJP:'カラ・アゲハは、八百個以上の卵を産んだめんどりだ。自分のために欲しかったのは、たった一つだけだった。農場はすべての卵を取り、産めなくなると、彼女まで連れていこうとした。\n\nその前に、ミスター・ハッピーが見つけた。\n\nカラスキーで、彼は小さなかばんを渡し、卵の形をした丸い石を入れた。カラ・アゲハはどこへ行くにも持ち歩き、何度も中を確かめる。それは、失った卵と同じものではない。\n\n本人も分かっている。それでも大切にすることで、石は新しい何かになった。' },
    { index:29, roomId:'room_02', x:665,  y:651, type:'stay',  frames:['jinguru-kan-1.png','jinguru-kan-2.png'],                 color:'#aaccff', size:58,  name:'Jinguru Kan',        nameJP:'ジングル・カン',     desc:'Jinguru Kan grew up among a large family of sheep. One by one, the others disappeared. She believed they had become lost and worried that her own turn would come next. She never learned where the farmers were taking them.\n\nMister Happy brought Jinguru Kan to Karasuki before she disappeared too. He placed a large bell around her neck and promised that its sound would always show where she was.\n\nNow Jinguru Kan can wander as far as she likes.\n\nShe may not know where home is, but she will never be lost.', descJP:'ジングル・カンは、たくさんの羊がいる家族の中で育った。仲間は一匹ずついなくなった。みんな道に迷ったのだと思い、次は自分の番かもしれないと心配していた。農場の人がどこへ連れていったのかは、最後まで知らなかった。\n\n自分も消える前に、ミスター・ハッピーがカラスキーへ連れてきた。首に大きな鈴をつけ、その音がいつでも居場所を教えてくれると約束した。\n\n今は、好きなだけ遠くへ歩いていける。\n\n帰る場所が分からなくても、もう迷子にはならない。' },
    { index:30, roomId:'room_05', x:397,  y:460, type:'stay',  frames:['oboteruyo-1.png','oboteruyo-2.png'],                     color:'#ffd9a0', size:68,  name:'Oboteruyo',          nameJP:'オボテルヨ',         desc:'Oboteruyo are friendly creatures with ears made for listening. Every spoken word eventually reaches them. A secret whispered into a pillow may take longer than a shout, but it arrives all the same.\n\nThey repeat what they hear without understanding why someone wanted it hidden. When an Oboteruyo raises its ears, choose your words carefully. It may know what you did yesterday, what someone said about you last week, and what you plan to do tomorrow.\n\nAn unsaid thought is safe. Once it becomes sound, an Oboteruyo can remember it for you.', descJP:'オボテルヨは、大きな耳で話を聞く、親しみやすい生き物だ。口に出された言葉は、いつか必ず彼らに届く。まくらにささやいた秘密は、大声より時間がかかるかもしれない。それでも、同じように届いてしまう。\n\nなぜ隠したかったのか分からないまま、聞いたことをくり返す。オボテルヨが耳を立てたら、言葉をよく選んだほうがいい。昨日したことも、先週誰かが話したことも、明日するつもりのことも知っているかもしれない。\n\n口に出さない考えは安全だ。音になれば、オボテルヨが代わりに覚えている。' },
    { index:31, roomId:'room_10', x:587,  y:704, type:'stay',  frames:['mimasayuki-1.png','mimasayuki-2.png'],                   color:'#b8b0e0', size:68,  name:'Mimasayuki',         nameJP:'ミマサユキ',         desc:'Mimasayuki always look as though their eyes are closed. This does not stop them from seeing.\n\nThey notice what happens behind doors, beneath tables, and in the moment everyone in a room looks somewhere else. Distance makes little difference. Darkness makes none. If an event took place, a Mimasayuki probably watched it from a position no one thought to check.\n\nThey rarely explain what they have seen. Asking only makes their closed eyes seem more peaceful.\n\nPeople behave differently when watched. Mimasayuki know how people behave when they believe they are alone.', descJP:'ミマサユキの目は、いつも閉じているように見える。それでも、見ることを止めることはない。\n\n扉の向こう、机の下、部屋にいる全員が別の方向を見た瞬間に起きたことまで知っている。遠くても関係なく、暗やみもじゃまにならない。何かが起きたなら、誰も確かめようとしなかった場所から、ミマサユキが見ていた可能性が高い。\n\n見たことを説明することはほとんどない。質問すると、閉じた目がさらに静かに見えるだけだ。\n\n人は見られていると行動を変える。ミマサユキは、誰もいないと思ったときの行動を知っている。' },
    { index:32, roomId:'room_14', x:470,  y:471, type:'stay',  frames:['mouhitome-1.png','mouhitome-2.png'],                     color:'#aab8cc', size:120,  name:'Mouhitome',         nameJP:'モウヒトメ',          desc:'Some moments are practiced with all the heart, yet never happen. A confession stays silent. An apology comes too late to be spoken. Courage waits until the chance has passed. Strong feelings left unused may leave a Mouhitome behind.\n\nBeneath its disguise, it is a mirror-black mannequin with no face, voice, reflection, or self. It wears the person the moment belonged to and performs the missing act at full strength, always in the wrong place, time, or company.\n\nThe original person cannot see it. Everyone else remembers the face. News of what you did arrives from people who saw you. You were somewhere else.\n\nA Nulvane is a person who never happened. A Mouhitome is a moment that never happened, wearing someone who did.', descJP:'心の中で何度も練習したのに、起きなかった瞬間がある。告白は口に出ず、あやまりたい言葉は遅すぎて言えず、勇気を出す前に機会が過ぎる。使われないまま強く残った気持ちは、モウヒトメを残すことがある。\n\n借りた姿の下にいるのは、鏡のように黒い人形だ。顔も声も、映る姿も、自分という心もない。その瞬間を持っていた人の姿を着て、行えなかった行動を、その強さのままで行う。ただし、場所も時間も相手も必ず間違っている。\n\n元の人には、モウヒトメが見えない。ほかの人には、その顔だけが残る。あなたが何をしたのか、見ていた人から知らされる。あなたは、そこにいなかったのに。\n\nヌルヴェインは、生まれなかった人。モウヒトメは、起きなかった瞬間が、本当にいた人の姿を着たものだ。' },
    { index:33, roomId:'room_09', x:340,  y:465, type:'stay',  frames:['yukan-1.png','yukan-2.png'],                             color:'#c7bfd6', size:92,  name:'Yūkan',              nameJP:'幽慣',               desc:'A Yūkan is born when the reason for a custom dies, but the pressure to continue it remains. There are many of them, silently repeating rules and rituals that no living person chose.\n\nThey stand behind people who feel they must bow, apologize, endure, give, attend, or obey simply because others did the same before them. A Yūkan never gives an order. It only makes refusing feel wrong.\n\nA single Yūkan is only discomfort. Where many stand together, it is called tradition.\n\nThey are not your ancestors. They are the pressure your ancestors forgot to stop passing down.', descJP:'幽慣は、慣習の理由が消えても、それを続けなければならないという圧力だけが残ったときに生まれる。幽慣は無数に存在し、今を生きる誰も選んでいない決まりや儀式を、黙って繰り返している。\n\n昔から皆がそうしてきたというだけで、頭を下げ、謝り、我慢し、与え、参加し、従わなければならないと感じる人の後ろに立つ。幽慣は決して命令しない。ただ、従わないことを悪いことのように感じさせる。\n\n幽慣が一体なら、ただの居心地の悪さだ。何体も並んで立つとき、それは伝統と呼ばれる。\n\n彼らはあなたの先祖ではない。先祖たちが止めることを忘れ、次の世代へ渡し続けた圧力だ。' },
    { index:34, roomId:'room_12', x:541,  y:320, type:'stay',  frames:['chillicothe-1.png','chillicothe-2.png'],                   color:'#f29a4a', size:110, name:'Chillicothe',         nameJP:'チリコシー',         desc:'Chillicothe is a large capybara with long orange fur who walks upright. When October was young, he went wherever she went. They played, they argued, and they spent so much time together that he no longer knows which of those days were imaginary.\n\nImaginary friends do not disappear when children stop believing in them. They disappear the same way real friends do: when no one speaks to them anymore. A friend from elementary school and a creature no one else could see can be lost in exactly the same way.\n\nThings that were only imagined do not remember you. Chillicothe does.\n\nOctober remembers that she once had an imaginary friend. Chillicothe remembers being him.', descJP:'チリコシーは、長いオレンジ色の毛に覆われた大きなカピバラで、二本足で歩く。オクトーバーが幼かったころは、どこへ行くにも一緒だった。二人は遊び、けんかをし、あまりにも長い時間を共に過ごしたため、そのうちのどの日が想像の中の出来事だったのか、チリコシーにはもう分からない。\n\n空想の友達は、子どもが信じなくなったから消えるのではない。本当の友達と同じように、誰からも話しかけられなくなったとき、いなくなる。小学校で毎日一緒だった子も、ほかの誰にも見えなかった生き物も、まったく同じように失われる。\n\nただ想像されただけのものは、あなたを覚えていない。チリコシーは覚えている。\n\nオクトーバーは、昔、空想の友達がいたことを覚えている。チリコシーは、その友達だったことを覚えている。' },
 ];
  

  
  const WANDERER_IMG_BASE = 'https://booha-adventure-studios.github.io/the-booha-adventure/assets/img/wanderers/';
  const DRIFT_SPEED      = 0.28;
  const DRIFT_STOP_DIST  = 90;

  /* ═══════════════════════════════════════════
     WANDERER GLITTER SYSTEM
  ═══════════════════════════════════════════ */
  const GLITTER_MAX      = 6;
  const GLITTER_SPAWN_MS = 380;
  const GLITTER_LIFE_MS  = 2200;
  const GLITTER_SPEED_Y  = 0.18;
  const GLITTER_WOBBLE   = 0.08;

  function spawnGlitter(w, now) {
    if (!w.glitter) w.glitter = [];
    if (!w.glitterNextAt) w.glitterNextAt = now;
    if (now < w.glitterNextAt) return;
    if (w.glitter.length >= GLITTER_MAX) return;
    const sz   = w.size || WANDERER_SIZE;
    const ox   = (Math.random() - 0.5) * sz * 1.4;
    const oy   = (Math.random() - 0.8) * sz * 1.2;
    const roll = Math.random();
    const color = roll < 0.5 ? '#ffffff' : roll < 0.75 ? '#fff8d0' : w.color;
    w.glitter.push({ x: w.rx + ox, y: w.ry + oy, vx: (Math.random() - 0.5) * GLITTER_WOBBLE, vy: -(GLITTER_SPEED_Y + Math.random() * 0.12), size: 0.6 + Math.random() * 1.1, color, born: now, phase: Math.random() * Math.PI * 2 });
    w.glitterNextAt = now + GLITTER_SPAWN_MS + Math.random() * 180;
  }

  function updateGlitter(w, now) {
    if (!w.glitter) return;
    w.glitter = w.glitter.filter(p => (now - p.born) < GLITTER_LIFE_MS);
    w.glitter.forEach(p => { p.x += p.vx; p.y += p.vy; p.vx += (Math.random() - 0.5) * 0.012; p.vx *= 0.96; });
  }

  function drawGlitter(w, now) {
    if (!w.glitter || !w.glitter.length) return;
    const sec = now / 1000;
    w.glitter.forEach(p => {
      const age     = (now - p.born) / GLITTER_LIFE_MS;
      const fadeIn  = Math.min(1, age * 6);
      const fadeOut = 1 - Math.pow(age, 1.8);
      const alpha   = fadeIn * fadeOut;
      const twinkle = 0.55 + 0.45 * Math.abs(Math.sin(sec * 9 + p.phase));
      ctx.save();
      ctx.globalAlpha = alpha * twinkle * 0.88;
      ctx.shadowBlur = 4 + p.size * 2; ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     WANDERER RUNTIME
  ═══════════════════════════════════════════ */
  let activeWanderers  = [];
  const wandererImages = {};
  const WANDERER_SIZE  = 22;

  function preloadWandererImages(defs) {
    (defs || []).forEach(def => {
      if (!def.frames) return;
      def.frames.forEach(filename => {
        if (wandererImages[filename]) return;
        const img = new Image(); img.src = WANDERER_IMG_BASE + filename;
        wandererImages[filename] = img;
      });
    });
  }

 function refreshWanderersForRoom() {
  let unlockedIndices = [];
  if (window.__devAllWanderers) {
    unlockedIndices = WANDERER_DEFS.map(d => d.index);
  } else {
    
    try {
      const data = (window.BoohaAdventure && BoohaAdventure.save)
        ? BoohaAdventure.save.load()
        : null;
      if (data && data.weekly && data.weekly.wanderers) {
        unlockedIndices = data.weekly.wanderers;
      }
    } catch (e) { console.error('[Karasuki] Wanderer read failed:', e); }
    
  }
  const roomDefs = WANDERER_DEFS
    .filter(def => def.roomId === state.roomId && unlockedIndices.includes(def.index));
  // Several portraits are intentionally large. Loading only the unlocked
  // wanderers in this room keeps Karasuki responsive on classroom devices.
  preloadWandererImages(roomDefs);
  activeWanderers = roomDefs
    .map(def => ({ ...def, rx: def.x, ry: def.y, wobblePhase: Math.random() * Math.PI * 2, hauntAngle: Math.random() * Math.PI * 2, pose: 0, frozen: false, glitter: [], glitterNextAt: 0, images: (def.frames || []).map(f => wandererImages[f]).filter(Boolean) }));
}

  function initWanderers() { refreshWanderersForRoom(); }
  
  function onRoomChanged() { refreshWanderersForRoom(); onRoomChangedNuppi(); 
  KarasukiAtmos.setRoom(state.roomId, getObserverRoomId()); }

  function updateWanderers(now) {
    if (!activeWanderers.length) return;
    const sec = now / 1000;
    activeWanderers.forEach(w => {
      if (w.type === 'haunt' && !w.frozen) {
        // Slow elliptical orbit around anchor — one loop every ~10s
        w.hauntAngle = (w.hauntAngle || 0) + 0.0063;
        w.rx = w.x + Math.cos(w.hauntAngle) * 55;
        w.ry = w.y + Math.sin(w.hauntAngle) * 28;
      }
      spawnGlitter(w, now); updateGlitter(w, now);
    });
  }

  /* ── Wanderer popup ── */
  let wandererPopOverlay = null;
  let currentPopWanderer = null;

  function injectWandererPopOverlay() {
    if (wandererPopOverlay) return;
    wandererPopOverlay = document.createElement('div');
    wandererPopOverlay.id = 'wanderer-pop-overlay';
    wandererPopOverlay.style.cssText = `display:none;position:fixed;inset:0;z-index:9200;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.3s ease;`;
    wandererPopOverlay.innerHTML = `
      <div id="wanderer-pop-box" style="background:#080810;border-radius:8px;padding:0 0 28px;max-width:min(360px,90vw);width:90vw;text-align:center;font-family:'Georgia',serif;position:relative;animation:portalAppear 0.25s ease-out;max-height:85vh;overflow-y:auto;overflow-x:hidden;">
        <button id="wanderer-pop-close" style="position:sticky;top:10px;float:right;margin-right:12px;background:transparent;border:none;cursor:pointer;font-size:1.1rem;line-height:1;padding:4px 8px;z-index:10;color:rgba(255,255,255,.45);transition:color .18s;">✕</button>
        <div id="wanderer-pop-portrait" style="width:100%;height:160px;position:relative;overflow:hidden;border-radius:8px 8px 0 0;flex-shrink:0;margin-bottom:18px;background:#0a0a18;display:flex;align-items:center;justify-content:center;">
          <img id="wanderer-pop-img" src="" alt="" style="max-width:90%;max-height:150px;width:auto;height:auto;object-fit:contain;display:none;"/>
          <div id="wanderer-pop-portrait-fade" style="position:absolute;bottom:0;left:0;right:0;height:50px;background:linear-gradient(to bottom,transparent,#080810);pointer-events:none;"></div>
        </div>
        <div style="padding:0 28px;">
          <h2 id="wanderer-pop-name" style="font-size:clamp(1.2rem,4vw,1.5rem);margin:0 0 4px;letter-spacing:.06em;"></h2>
          <p id="wanderer-pop-jp" style="font-size:clamp(.82rem,2.6vw,.96rem);margin:0 0 20px;opacity:.85;letter-spacing:.08em;font-family:'Georgia',serif;color:#ffffff;"></p>
          
          <p id="wanderer-pop-desc" style="font-size:clamp(.84rem,2.8vw,.98rem);line-height:1.7;color:#ffffff;margin:0 0 14px;font-family:'Georgia',serif;text-align:left;white-space:pre-line;"></p>
          <p id="wanderer-pop-desc-jp" style="font-size:clamp(.76rem,2.4vw,.88rem);line-height:1.7;color:#ffffff;opacity:.75;margin:0;font-family:'Georgia',serif;text-align:left;display:none;white-space:pre-line;"></p>
          
        </div>
      </div>`;
    document.body.appendChild(wandererPopOverlay);
    document.getElementById('wanderer-pop-close').addEventListener('click', closeWandererPop);
    wandererPopOverlay.addEventListener('click', e => { if (e.target === wandererPopOverlay) closeWandererPop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWandererPop(); });
  }

  function openWandererPop(w) {
    if (!w.name) return;
    currentPopWanderer = w; w.pose = 1;
    if (w.type === 'drift') w.frozen = true;
    const box        = document.getElementById('wanderer-pop-box');
    const portrait   = document.getElementById('wanderer-pop-portrait');
    const imgEl      = document.getElementById('wanderer-pop-img');
    const portraitFade = document.getElementById('wanderer-pop-portrait-fade');
    const nameEl     = document.getElementById('wanderer-pop-name');
    const jpEl       = document.getElementById('wanderer-pop-jp');
    const descEl     = document.getElementById('wanderer-pop-desc');
    const descJpEl   = document.getElementById('wanderer-pop-desc-jp');
    const closeEl    = document.getElementById('wanderer-pop-close');
    const c = w.color;
    box.style.border     = `1px solid ${c}44`;
    box.style.boxShadow  = `0 0 0 1px ${c}33,0 0 30px ${c}55,0 0 70px ${c}22`;
    const poseImg = (w.images && w.images.length > 1 && w.images[1].complete && w.images[1].naturalWidth > 0) ? w.images[1] : (w.images && w.images[0] && w.images[0].complete ? w.images[0] : null);
    portrait.style.background   = '#0a0a18';
    portrait.style.borderBottom = `1px solid ${c}22`;
    portraitFade.style.background = `linear-gradient(to bottom,transparent,#080810)`;
    if (poseImg) { imgEl.src = poseImg.src; imgEl.style.display = 'block'; imgEl.style.filter = `drop-shadow(0 0 14px ${c}bb) drop-shadow(0 0 6px ${c}66)`; }
    else         { imgEl.style.display = 'none'; portrait.style.background = `radial-gradient(circle at 50% 60%,${c}22,#0a0a18)`; }
    closeEl.style.color  = c;
    nameEl.style.color   = c;
    nameEl.style.textShadow = `0 0 18px ${c}88`;
    nameEl.textContent   = w.name || '';
    jpEl.textContent     = w.nameJP ? `「${w.nameJP}」` : '';
    descEl.textContent   = w.desc || '';
    if (w.descJP) { descJpEl.textContent = w.descJP; descJpEl.style.display = 'block'; }
    else          { descJpEl.style.display = 'none'; }
    wandererPopOverlay.style.display    = 'flex';
    wandererPopOverlay.style.background = 'rgba(0,0,0,0.82)';
    state.clickTarget = null;
  }

  function closeWandererPop() {
    if (currentPopWanderer) { currentPopWanderer.pose = 0; if (currentPopWanderer.type === 'drift') currentPopWanderer.frozen = false; currentPopWanderer = null; }
    wandererPopCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
    wandererPopOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { wandererPopOverlay.style.display = 'none'; }, 300);
  }

  function isWandererPopOpen() { return wandererPopOverlay && wandererPopOverlay.style.display === 'flex'; }

  function clickCheckWanderers(worldX, worldY) {
    if (performance.now() < wandererPopCooldownUntil) return false;
    for (const w of activeWanderers) {
      if (!w.name || !w.frames) continue;
      const sz = w.size || WANDERER_SIZE;
      if (Math.abs(worldX - w.rx) <= sz * 0.85 && Math.abs(worldY - w.ry) <= sz * 0.85) { openWandererPop(w); return true; }
    }
    return false;
  }

  function drawWanderers(now) {
    if (!activeWanderers.length) return;
    const sec = now / 1000;
    activeWanderers.forEach(w => {
      const sz     = w.size || WANDERER_SIZE;
      const imgIdx = w.pose === 1 ? 1 : 0;
      const rawImg = w.images && w.images.length > imgIdx ? w.images[imgIdx] : (w.images && w.images[0]);
      const img    = (rawImg && rawImg.complete && rawImg.naturalWidth > 0) ? rawImg : null;
      const pulse  = 0.5 + 0.5 * Math.sin(sec * 1.6 + w.wobblePhase);
      const glowR  = sz * 2.4;
      ctx.save();
      const halo = ctx.createRadialGradient(w.rx, w.ry, 0, w.rx, w.ry, glowR);
      halo.addColorStop(0, w.color + '38'); halo.addColorStop(0.5, w.color + '14'); halo.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.30 + pulse * 0.18; ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(w.rx, w.ry, glowR, 0, Math.PI * 2); ctx.fill();
      if (img) {
        const rat = img.naturalWidth / (img.naturalHeight || 1);
        const dw = rat >= 1 ? sz * 2 : sz * 2 * rat;
        const dh = rat >= 1 ? sz * 2 / rat : sz * 2;
        ctx.globalAlpha = 0.96; ctx.shadowBlur = 14 + pulse * 8; ctx.shadowColor = w.color;
        ctx.drawImage(img, w.rx - dw / 2, w.ry - dh / 2, dw, dh); ctx.shadowBlur = 0;
      } else {
        const ig = ctx.createRadialGradient(w.rx - sz * 0.3, w.ry - sz * 0.3, 0, w.rx, w.ry, sz);
        ig.addColorStop(0, '#ffffff'); ig.addColorStop(0.4, w.color); ig.addColorStop(1, w.color + 'aa');
        ctx.globalAlpha = 0.88 + pulse * 0.1; ctx.shadowBlur = 16; ctx.shadowColor = w.color;
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(w.rx, w.ry, sz, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      ctx.restore();
      drawGlitter(w, now);
    });
  }

  /* ═══════════════════════════════════════════
     BONUS TREES
  ═══════════════════════════════════════════ */
  const BONUS_TREES = [
    { id:'booha_invaders',      roomId:'room_07', x:1019, y:381, r:44, url:'booha_invaders.html', label:'INVADERS', color:'#44ff88', theme:'invaders', nameEN:'Booha Invaders',  nameJP:'ブーハー・インベーダーズ', nameKanji:'侵略者', descUnlocked:'You\'ve unlocked this game! Do you want to play?', descUnlockedJP:'このゲームがつかえます！あそびますか？', descUnlockedKanji:'このゲームが使えます。遊びますか？', descLocked:'This game is locked. You need to play more games in the maze.', descLockedJP:'このゲームはまだロックされています。めいろでもっとゲームをしてください。', descLockedKanji:'このゲームはまだロックされています。迷路でもっとゲームをして下さい。' },
    { id:'booha_blocks',       roomId:'room_02', x:1084, y:365,  r:44, url:'booha_blocks.html',       label:'BLOCKS',      color:'#44aaff', theme:'blocks',      nameEN:'Booha Blocks',       nameJP:'ブーハー・ブロック',       nameKanji:'積木',   descUnlocked:'You\'ve unlocked this game! Do you want to play?', descUnlockedJP:'このゲームがつかえます！あそびますか？', descUnlockedKanji:'このゲームが使えます。遊びますか？', descLocked:'This game is locked. You need to play more games in the maze.', descLockedJP:'このゲームはまだロックされています。めいろでもっとゲームをしてください。', descLockedKanji:'このゲームはまだロックされています。迷路でもっとゲームをして下さい。' },
    { id:'feed_booha',         roomId:'room_10', x:346,  y:389,  r:44, url:'feed_booha.html',         label:'FEED',        color:'#ff88cc', theme:'feed',        nameEN:'Feed Booha',         nameJP:'ブーハーにキャンディをあげよう', nameKanji:'給食', descUnlocked:'You\'ve unlocked this game! Do you want to play?', descUnlockedJP:'このゲームがつかえます！あそびますか？', descUnlockedKanji:'このゲームが使えます。遊びますか？', descLocked:'This game is locked. You need to play more games in the maze.', descLockedJP:'このゲームはまだロックされています。めいろでもっとゲームをしてください。', descLockedKanji:'このゲームはまだロックされています。迷路でもっとゲームをして下さい。' },
    { id:'booha_destruction',  roomId:'room_12', x:986,  y:361,  r:44, url:'booha_destruction.html',  label:'DESTROY',     color:'#ff6644', theme:'destruction', nameEN:'Booha Destruction',  nameJP:'ブーハー・デストラクション',   nameKanji:'破壊', descUnlocked:'You\'ve unlocked this game! Do you want to play?', descUnlockedJP:'このゲームがつかえます！あそびますか？', descUnlockedKanji:'このゲームが使えます。遊びますか？', descLocked:'This game is locked. You need to play more games in the maze.', descLockedJP:'このゲームはまだロックされています。めいろでもっとゲームをしてください。', descLockedKanji:'このゲームはまだロックされています。迷路でもっとゲームをして下さい。' },
   ];

  let bonusPopOverlay     = null;
  let bonusPopCurrentTree = null;

  const BONUS_THEMES = {
    invaders: { bg:'#060e0a', border:'#1a3d20', accent1:'#44ff88', accent2:'#ff9922', accent3:'#22ffcc', glow1:'rgba(68,255,136,.55)', glow2:'rgba(255,153,34,.35)', btnBorder:'rgba(68,255,136,.85)', btnColor:'#ccffdd', orbColors:['#44ff88','#22bb55','#ff9922'] },
    blocks:   { bg:'#060812', border:'#1a1a40', accent1:'#44aaff', accent2:'#aa44ff', accent3:'#88ddff', glow1:'rgba(68,170,255,.60)', glow2:'rgba(170,68,255,.40)', btnBorder:'rgba(68,170,255,.85)', btnColor:'#cce8ff', orbColors:['#44aaff','#aa44ff','#88ddff'] },
   mystery:     { bg:'#080810', border:'#3a1055', accent1:'#cc88ff', accent2:'#ffcc44', accent3:'#ffaacc', glow1:'rgba(160,40,220,.55)', glow2:'rgba(255,200,68,.3)',  btnBorder:'rgba(160,70,210,.9)',  btnColor:'#e8d8ff', orbColors:['#cc88ff','#aa44cc','#ffcc44'] },
    feed:        { bg:'#0e0610', border:'#3d1a30', accent1:'#ff88cc', accent2:'#ffaaee', accent3:'#ffccee', glow1:'rgba(255,136,204,.55)', glow2:'rgba(255,170,238,.35)', btnBorder:'rgba(255,136,204,.85)', btnColor:'#ffddee', orbColors:['#ff88cc','#ee44aa','#ffaaee'] },
    destruction: { bg:'#0e0800', border:'#3d1a00', accent1:'#ff6644', accent2:'#ffaa22', accent3:'#ffcc88', glow1:'rgba(255,102,68,.55)',  glow2:'rgba(255,170,34,.35)',  btnBorder:'rgba(255,102,68,.85)',  btnColor:'#ffddcc', orbColors:['#ff6644','#cc3311','#ffaa22'] },
  };

  function injectBonusPopOverlay() {
    if (bonusPopOverlay) return;
    bonusPopOverlay = document.createElement('div');
    bonusPopOverlay.id = 'bonus-pop-overlay';
    bonusPopOverlay.style.cssText = `display:none;position:fixed;inset:0;z-index:9150;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.3s ease;`;
    bonusPopOverlay.innerHTML = `
        <div id="bonus-pop-box" style="border-radius:8px;padding:36px 40px 30px;max-width:min(420px,92vw);width:92vw;max-height:90vh;overflow-y:auto;text-align:center;font-family:'Georgia',serif;position:relative;animation:portalAppear 0.25s ease-out;">
        <div id="bp-corner-tl" style="position:absolute;top:10px;left:10px;width:18px;height:18px;border-style:solid;border-width:1.5px 0 0 1.5px;"></div>
        <div id="bp-corner-br" style="position:absolute;bottom:10px;right:10px;width:18px;height:18px;border-style:solid;border-width:0 1.5px 1.5px 0;"></div>
        
       <button id="bonus-pop-close" style="position:sticky;top:10px;float:right;margin-right:4px;background:transparent;border:none;cursor:pointer;font-size:1.1rem;line-height:1;padding:4px 8px;opacity:.5;transition:opacity .18s;z-index:2;">✕</button>
        
        <div id="bonus-pop-orb" style="width:60px;height:60px;border-radius:50%;margin:0 auto 18px;position:relative;"></div>
        <div id="bonus-pop-lock" style="font-size:1.6rem;margin-bottom:8px;display:none;">🔒</div>
        <h2 id="bonus-pop-name" style="font-size:clamp(1.1rem,3.5vw,1.4rem);margin:0 0 3px;letter-spacing:.08em;"></h2>
        <p id="bonus-pop-jp" style="font-size:clamp(.78rem,2.4vw,.9rem);margin:0 0 20px;opacity:.8;letter-spacing:.08em;color:#ffffff;"></p>
        <p id="bonus-pop-desc" style="font-size:clamp(.82rem,2.6vw,.95rem);line-height:1.65;margin:0 0 8px;color:#ffffff;"></p>
        <p id="bonus-pop-desc-jp" style="font-size:clamp(.74rem,2.2vw,.85rem);line-height:1.6;margin:0 0 26px;color:#ffffff;opacity:.8;"></p>
        <div id="bonus-pop-btns" style="display:none;gap:16px;justify-content:center;flex-wrap:wrap;">
          <button id="bonus-pop-yes" class="bonus-pop-btn" style="background:transparent;font-family:'Georgia',serif;font-size:clamp(.8rem,2.6vw,.92rem);letter-spacing:.12em;cursor:pointer;padding:8px 28px;border-radius:3px;transition:all .18s;">はい / Yes</button>
          <button id="bonus-pop-no"  class="bonus-pop-btn" style="background:transparent;font-family:'Georgia',serif;font-size:clamp(.8rem,2.6vw,.92rem);letter-spacing:.12em;cursor:pointer;padding:8px 28px;border-radius:3px;transition:all .18s;">いいえ / No</button>
        </div>
        <button id="bonus-pop-ok" style="background:transparent;font-family:'Georgia',serif;font-size:.9rem;letter-spacing:.12em;cursor:pointer;padding:8px 30px;border-radius:3px;display:none;transition:all .18s;">OK</button>
      </div>`;
    document.body.appendChild(bonusPopOverlay);
    document.getElementById('bonus-pop-close').addEventListener('click', closeBonusPop);
    document.getElementById('bonus-pop-ok').addEventListener('click',    closeBonusPop);
    document.getElementById('bonus-pop-no').addEventListener('click',    closeBonusPop);
    document.getElementById('bonus-pop-yes').addEventListener('click',   () => { if (bonusPopCurrentTree) { try { sessionStorage.setItem('booha_bonus_return_room', bonusPopCurrentTree.roomId); } catch(_) {} window.location.href = bonusPopCurrentTree.url; } });
    bonusPopOverlay.addEventListener('click', e => { if (e.target === bonusPopOverlay) closeBonusPop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBonusPop(); });
  }

  function openBonusPop(tree) {
    bonusPopCurrentTree = tree;
    const unlocked = _bonusUnlocked(tree.id);
    const t = BONUS_THEMES[tree.theme] || BONUS_THEMES.mystery;
    const box = document.getElementById('bonus-pop-box');
    box.style.background  = t.bg; box.style.border = `1px solid ${t.border}`;
    box.style.boxShadow   = `0 0 0 1px ${t.accent1}44,0 0 35px ${t.glow1},0 0 80px ${t.glow2},inset 0 0 40px rgba(0,0,0,.5)`;
    ['bp-corner-tl','bp-corner-br'].forEach(id => { document.getElementById(id).style.borderColor = `${t.accent1}88`; });
    document.getElementById('bonus-pop-close').style.color = t.accent1;
    const orb = document.getElementById('bonus-pop-orb');
    orb.textContent = '🧿'; orb.style.fontSize = '1.8rem'; orb.style.lineHeight = '60px';
    if      (tree.theme === 'invaders') { orb.style.background = `radial-gradient(circle at 35% 35%,#ccffdd,#44ff88,#005522)`; }
    else if (tree.theme === 'blocks')   { orb.style.background = `radial-gradient(circle at 35% 35%,#cce8ff,#44aaff,#002244)`; }
    else                                { orb.style.background = `radial-gradient(circle at 35% 35%,#fff,${t.orbColors[0]},${t.orbColors[1]})`; }
    orb.style.boxShadow = `0 0 14px ${t.orbColors[0]}cc,0 0 32px ${t.orbColors[0]}88,0 0 60px ${t.orbColors[1]}55`;
    document.getElementById('bonus-pop-lock').style.display = unlocked ? 'none' : 'block';
    const nameEl = document.getElementById('bonus-pop-name');
    nameEl.textContent = tree.nameEN; nameEl.style.color = t.accent1; nameEl.style.textShadow = `0 0 16px ${t.accent1}99`;
    document.getElementById('bonus-pop-jp').textContent   = tree.nameJP;
    document.getElementById('bonus-pop-jp').style.color   = t.accent3;
    const descEl   = document.getElementById('bonus-pop-desc');
    const descJpEl = document.getElementById('bonus-pop-desc-jp');
    if (unlocked) { descEl.textContent = tree.descUnlocked; descJpEl.textContent = tree.descUnlockedJP; }
    else          { descEl.textContent = tree.descLocked;   descJpEl.textContent = tree.descLockedJP;   }
    const btnsEl = document.getElementById('bonus-pop-btns'); const okEl  = document.getElementById('bonus-pop-ok');
    const yesEl  = document.getElementById('bonus-pop-yes');  const noEl  = document.getElementById('bonus-pop-no');
    if (unlocked) { btnsEl.style.display = 'flex'; okEl.style.display = 'none'; yesEl.style.border = `1.5px solid ${t.btnBorder}`; yesEl.style.color = t.btnColor; noEl.style.border = `1.5px solid ${t.accent1}44`; noEl.style.color = `${t.accent3}99`; }
    else          { btnsEl.style.display = 'none'; okEl.style.display = 'inline-block'; okEl.style.border = `1.5px solid ${t.btnBorder}`; okEl.style.color = t.btnColor; }
    bonusPopOverlay.style.display = 'flex'; bonusPopOverlay.style.background = 'rgba(0,0,0,0.85)';
    state.clickTarget = null;
  }

  function closeBonusPop() {
    bonusPopOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { bonusPopOverlay.style.display = 'none'; }, 300);
    bonusPopCurrentTree   = null;
    bonusPopCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
  }

  function isBonusPopOpen() { return bonusPopOverlay && bonusPopOverlay.style.display === 'flex'; }

  function _bonusUnlocked(bonusId) {
    if (window.__devAllGames) return true;
    try { if (window.BoohaAdventure && BoohaAdventure.unlocks) return BoohaAdventure.unlocks.isBonusGameUnlocked(bonusId); } catch (_) {}
    return false;
  }

  function handleBonusTreeInteraction(tree) { openBonusPop(tree); }

  function checkBonusTrees() {
    if (performance.now() < bonusPopCooldownUntil) return;
    const trees = BONUS_TREES.filter(t => t.roomId === state.roomId);
    if (!trees.length || state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    for (const tree of trees) {
      if (Math.hypot(state.x - tree.x, state.y - tree.y) <= tree.r) { handleBonusTreeInteraction(tree); state.clickTarget = null; return; }
    }
  }

  function clickBonusTree(worldX, worldY) {
    if (performance.now() < bonusPopCooldownUntil) return false;
    const trees = BONUS_TREES.filter(t => t.roomId === state.roomId);
    for (const tree of trees) { if (Math.hypot(worldX - tree.x, worldY - tree.y) <= tree.r) { handleBonusTreeInteraction(tree); return true; } }
    return false;
  }

  function drawBonusTrees(now) {
    const trees = BONUS_TREES.filter(t => t.roomId === state.roomId);
    if (!trees.length) return;
    const sec = now / 1000;
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    trees.forEach(tree => {
      const unlocked = _bonusUnlocked(tree.id);
      const t        = BONUS_THEMES[tree.theme] || BONUS_THEMES.mystery;
      const pulse    = 0.5 + 0.5 * Math.sin(sec * 2.1);
      const pulse2   = 0.5 + 0.5 * Math.sin(sec * 1.4 + 1.1);
      const bounce   = Math.sin(sec * 1.8) * 6;
      ctx.save();
      if (unlocked) {
        const cloud = ctx.createRadialGradient(tree.x, tree.y + bounce, 0, tree.x, tree.y + bounce, 88);
        cloud.addColorStop(0, t.accent1+'55'); cloud.addColorStop(0.4, t.accent1+'22'); cloud.addColorStop(0.7, t.accent2+'11'); cloud.addColorStop(1, 'transparent');
        ctx.globalAlpha = moveReveal * (0.55 + pulse * 0.3); ctx.fillStyle = cloud;
        ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, 88, 0, Math.PI * 2); ctx.fill();
        const mid = ctx.createRadialGradient(tree.x, tree.y + bounce, 14, tree.x, tree.y + bounce, 52);
        mid.addColorStop(0, 'transparent'); mid.addColorStop(0.4, t.accent2+'33'); mid.addColorStop(0.7, t.accent2+'55'); mid.addColorStop(1, 'transparent');
        ctx.globalAlpha = moveReveal * (0.4 + pulse2 * 0.3); ctx.fillStyle = mid;
        ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, 52, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 6; i++) {
          const ring = i < 3 ? 28 : 42; const speed = i < 3 ? 0.9 : -0.6;
          const angle = sec * speed + (i / 3) * Math.PI * 2;
          const sx = tree.x + Math.cos(angle) * ring; const sy = tree.y + bounce + Math.sin(angle) * ring;
          const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(sec * 5.5 + i * 1.3));
          const sCol    = i % 2 === 0 ? t.accent1 : t.accent2;
          ctx.globalAlpha = moveReveal * twinkle * (0.7 + pulse * 0.25);
          ctx.fillStyle = sCol; ctx.shadowBlur = 8; ctx.shadowColor = sCol;
          ctx.beginPath(); ctx.arc(sx, sy, 1.8 + pulse * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
        const coreR = 10 + pulse * 5;
        const core  = ctx.createRadialGradient(tree.x - 2, tree.y + bounce - 2, 0, tree.x, tree.y + bounce, coreR * 1.8);
        core.addColorStop(0, '#ffffff'); core.addColorStop(0.25, t.accent1); core.addColorStop(0.6, t.accent2+'aa'); core.addColorStop(1, 'transparent');
        ctx.globalAlpha = moveReveal * (0.92 + pulse * 0.07); ctx.shadowBlur = 24 + pulse * 18; ctx.shadowColor = t.accent1;
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, coreR * 1.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        
      } else {
  const t      = BONUS_THEMES[tree.theme] || BONUS_THEMES.mystery;
  const pulse  = 0.5 + 0.5 * Math.sin(sec * 1.4);
  const bounce = Math.sin(sec * 1.4) * 4;
  const lockGlow = ctx.createRadialGradient(tree.x, tree.y + bounce, 0, tree.x, tree.y + bounce, 55);
  lockGlow.addColorStop(0, t.accent1 + '28');
  lockGlow.addColorStop(0.5, t.accent1 + '0e');
  lockGlow.addColorStop(1, 'transparent');
  ctx.globalAlpha = moveReveal * (0.5 + pulse * 0.2); ctx.fillStyle = lockGlow;
  ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, 55, 0, Math.PI * 2); ctx.fill();
  const coreR = 6 + pulse * 2;
  const core  = ctx.createRadialGradient(tree.x, tree.y + bounce, 0, tree.x, tree.y + bounce, coreR);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.4, t.accent1 + '88');
  core.addColorStop(1, 'transparent');
  ctx.globalAlpha = moveReveal * (0.28 + pulse * 0.12);
  ctx.shadowBlur = 10 + pulse * 6; ctx.shadowColor = t.accent1;
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, coreR, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = moveReveal * (0.18 + pulse * 0.08);
  ctx.strokeStyle = t.accent1 + '55'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, 18, 0, Math.PI * 2); ctx.stroke();
}
      
      ctx.restore();
    });
  }

 /* ═══════════════════════════════════════════
     HAPPY HOUSE PORTAL
  ═══════════════════════════════════════════ */
 
  const HAPPY_HOUSE_PORTAL_COLORS = ['#8b00ff','#00bfff','#ff007f','#00ff99','#ffaa00','#aa00ff'];
 
  function drawHappyHouseOrb(now) {
    if (state.roomId !== HAPPY_HOUSE_PORTAL.roomId) return;
    const sec    = now / 1000;
    const cx     = HAPPY_HOUSE_PORTAL.x;
    const cy     = HAPPY_HOUSE_PORTAL.y;
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
 
    const cycleT = (sec * 0.28) % HAPPY_HOUSE_PORTAL_COLORS.length;
    const idx0   = Math.floor(cycleT) % HAPPY_HOUSE_PORTAL_COLORS.length;
    const idx1   = (idx0 + 1) % HAPPY_HOUSE_PORTAL_COLORS.length;
    const t      = cycleT - Math.floor(cycleT);
    const col    = lerpHex(HAPPY_HOUSE_PORTAL_COLORS[idx0], HAPPY_HOUSE_PORTAL_COLORS[idx1], t);
    const col2   = lerpHex(
      HAPPY_HOUSE_PORTAL_COLORS[(idx1 + 1) % HAPPY_HOUSE_PORTAL_COLORS.length],
      HAPPY_HOUSE_PORTAL_COLORS[(idx1 + 2) % HAPPY_HOUSE_PORTAL_COLORS.length], t
    );
 
    const pulse  = 0.5 + 0.5 * Math.sin(sec * 2.6);
    const pulse2 = 0.5 + 0.5 * Math.sin(sec * 1.8 + 1.2);
    const bob    = Math.sin(sec * 1.4) * 5;
 
    ctx.save();
 
    // Outer ambient glow
    const ambient = ctx.createRadialGradient(cx, cy + bob, 0, cx, cy + bob, 72);
    ambient.addColorStop(0,   col + '00');
    ambient.addColorStop(0.3, col + '28');
    ambient.addColorStop(0.6, col + '44');
    ambient.addColorStop(1,   'transparent');
    ctx.globalAlpha = moveReveal * (0.55 + pulse * 0.35);
    ctx.fillStyle   = ambient;
    ctx.beginPath(); ctx.arc(cx, cy + bob, 72, 0, Math.PI * 2); ctx.fill();
 
    // Secondary colour cloud
    const cloud2 = ctx.createRadialGradient(cx, cy + bob, 0, cx, cy + bob, 52);
    cloud2.addColorStop(0,    col2 + '00');
    cloud2.addColorStop(0.25, col2 + '22');
    cloud2.addColorStop(0.55, col2 + '38');
    cloud2.addColorStop(1,    'transparent');
    ctx.globalAlpha = moveReveal * (0.4 + pulse2 * 0.3);
    ctx.fillStyle   = cloud2;
    ctx.beginPath(); ctx.arc(cx, cy + bob, 52, 0, Math.PI * 2); ctx.fill();
 
    // Energy ring
    const innerR = 10 + pulse * 6;
    const energy = ctx.createRadialGradient(cx, cy + bob, 0, cx, cy + bob, innerR * 2.8);
    energy.addColorStop(0,    'transparent');
    energy.addColorStop(0.25, col + '55');
    energy.addColorStop(0.55, col + 'cc');
    energy.addColorStop(0.75, col + '66');
    energy.addColorStop(1,    'transparent');
    ctx.globalAlpha = moveReveal * (0.85 + pulse * 0.13);
    ctx.shadowBlur  = 18 + pulse * 16; ctx.shadowColor = col;
    ctx.fillStyle   = energy;
    ctx.beginPath(); ctx.arc(cx, cy + bob, innerR * 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;
 
    // Orbiting dots
    const dotCount = 8;
    for (let d = 0; d < dotCount; d++) {
      const ringR  = 18 + pulse * 4 + (d % 2) * 8;
      const speed  = d % 2 === 0 ? 0.7 : -0.5;
      const angle  = (sec * speed) + (d / dotCount) * Math.PI * 2;
      const dx     = cx + Math.cos(angle) * ringR;
      const dy     = cy + bob + Math.sin(angle) * ringR;
      const sparkA = 0.3 + 0.7 * Math.abs(Math.sin(sec * 2.5 + d * 0.8));
      const sparkR = 1.2 + pulse * 1.0;
      ctx.globalAlpha = moveReveal * sparkA;
      const sparkCol = d % 2 === 0 ? col : col2;
      ctx.fillStyle  = sparkCol; ctx.shadowBlur = 8; ctx.shadowColor = sparkCol;
      ctx.beginPath(); ctx.arc(dx, dy, sparkR, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
 
    // Sweep arcs
    for (let w = 0; w < 3; w++) {
      const wAngle = (sec * 0.4) + (w / 3) * Math.PI * 2;
      const wR     = 14 + pulse2 * 5;
      ctx.globalAlpha = moveReveal * (0.18 + pulse * 0.14);
      ctx.strokeStyle = w % 2 === 0 ? col : col2;
      ctx.lineWidth   = 1.5; ctx.shadowBlur = 10; ctx.shadowColor = col;
      ctx.beginPath(); ctx.arc(cx, cy + bob, wR, wAngle, wAngle + Math.PI * 0.7); ctx.stroke();
      ctx.shadowBlur  = 0;
    }
 
    ctx.restore();
  }
 
  /* ── Happy House popup DOM ── */
  let happyHousePopOverlay = null;
 
  function injectHappyHousePop() {
    if (happyHousePopOverlay) return;
    happyHousePopOverlay = document.createElement('div');
    happyHousePopOverlay.id = 'happy-house-pop-overlay';
    happyHousePopOverlay.style.cssText = `display:none;position:fixed;inset:0;z-index:9300;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.3s ease;`;
    happyHousePopOverlay.innerHTML = `
      <div id="happy-house-pop-box" style="
        background:#080810;border:1px solid rgba(160,70,210,.55);
        border-radius:8px;padding:clamp(28px,5vw,44px) clamp(24px,6vw,52px) clamp(22px,4vw,36px);
        max-width:min(420px,92vw);width:92vw;text-align:center;
        box-shadow:0 0 0 1px rgba(160,40,220,.5),0 0 40px rgba(160,40,220,.65),0 0 90px rgba(120,0,180,.4),inset 0 0 50px rgba(0,0,0,.5);
        font-family:'Georgia',serif;position:relative;animation:portalAppear 0.25s ease-out;">
        <div style="position:absolute;top:10px;left:10px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-right:none;border-bottom:none;"></div>
        <div style="position:absolute;top:10px;right:10px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-left:none;border-bottom:none;"></div>
        <div style="position:absolute;bottom:10px;left:10px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-right:none;border-top:none;"></div>
        <div style="position:absolute;bottom:10px;right:10px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-left:none;border-top:none;"></div>
        <button id="happy-house-pop-close" style="position:absolute;top:12px;right:14px;background:transparent;border:none;cursor:pointer;font-size:1rem;color:rgba(160,80,255,.4);transition:color .18s;padding:4px 8px;">✕</button>
        <p id="happy-house-pop-en" style="font-size:clamp(.9rem,3.5vw,1.1rem);margin:0 0 10px;letter-spacing:.04em;color:#f0e8ff;line-height:1.55;text-shadow:0 0 20px rgba(200,180,255,.5);">Do you want to go into Mister Happy's house?</p>
        <p id="happy-house-pop-ja" style="font-size:clamp(.78rem,3vw,.92rem);margin:0 0 clamp(18px,4vw,32px);color:#cdb8e8;letter-spacing:.05em;">ミスター・ハッピーの家に入りますか？</p>
        <button id="happy-house-yes" style="background:transparent;font-family:'Georgia',serif;font-size:clamp(.82rem,3vw,.95rem);letter-spacing:.12em;cursor:pointer;padding:clamp(6px,2vw,10px) clamp(20px,5vw,34px);border-radius:3px;border:1.5px solid rgba(160,70,210,.9);color:#e8d8ff;margin-right:16px;background:rgba(100,30,150,.15);transition:all .18s;">はい</button>
        <button id="happy-house-no"  style="background:transparent;font-family:'Georgia',serif;font-size:clamp(.82rem,3vw,.95rem);letter-spacing:.12em;cursor:pointer;padding:clamp(6px,2vw,10px) clamp(20px,5vw,34px);border-radius:3px;border:1.5px solid rgba(70,45,90,.8);color:#b8a8c8;transition:all .18s;">いいえ</button>
      </div>`;
    document.body.appendChild(happyHousePopOverlay);
    document.getElementById('happy-house-pop-close').addEventListener('click', closeHappyHousePop);
    document.getElementById('happy-house-no').addEventListener('click',        closeHappyHousePop);
    document.getElementById('happy-house-yes').addEventListener('click',       _startHappyHouseTransition);
    happyHousePopOverlay.addEventListener('click', e => { if (e.target === happyHousePopOverlay) closeHappyHousePop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isHappyHousePopOpen()) closeHappyHousePop(); });
  }
 
  function openHappyHousePop() {
    happyHousePopOverlay.style.display    = 'flex';
    happyHousePopOverlay.style.background = 'rgba(0,0,0,0.88)';
    state.clickTarget = null;
  }
 
  function closeHappyHousePop() {
    happyHouseCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
    happyHousePopOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { happyHousePopOverlay.style.display = 'none'; }, 300);
  }
 
  function isHappyHousePopOpen() {
    return happyHousePopOverlay && happyHousePopOverlay.style.display === 'flex';
  }
 
  function _startHappyHouseTransition() {
    happyHousePopOverlay.style.background = 'rgba(0,0,0,0)';
    happyHousePopOverlay.style.display    = 'none';
    state.clickTarget = null; state.moving = false;
    try { music.pause(); music.currentTime = 0; } catch (_) {}
    const fadeEl = document.getElementById('kara-fade');
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`;
    fadeEl.style.opacity    = '1';
    setTimeout(() => {
      try { sessionStorage.setItem('happy_house_return_room', HAPPY_HOUSE_PORTAL.roomId); } catch (_) {}
      _playHappyHouseVideo();
    }, FADE_MS + 60);
  }
 
  function _playHappyHouseVideo() {
    let vOverlay = document.getElementById('happy-house-video-overlay');
    if (!vOverlay) {
      vOverlay = document.createElement('div');
      vOverlay.id = 'happy-house-video-overlay';
      vOverlay.style.cssText = `position:fixed;inset:0;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;`;
      const vid = document.createElement('video');
      vid.id         = 'happy-house-intro-vid';
      vid.src        = HAPPY_HOUSE_PORTAL.videoSrc;
      vid.autoplay   = true;
      vid.playsInline = true;
      vid.muted      = false;
      vid.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
      vOverlay.appendChild(vid);
      document.body.appendChild(vOverlay);
      let redirected = false;
      function goToHappyHouse() {
        if (redirected) return; redirected = true;
        window.location.href = HAPPY_HOUSE_PORTAL.href;
      }
      vid.addEventListener('ended', goToHappyHouse);
      vid.addEventListener('error', e => { console.warn('[happy house video] error:', e); goToHappyHouse(); });
      vid.play().catch(e => { console.warn('[happy house video] play() rejected:', e); goToHappyHouse(); });
      setTimeout(goToHappyHouse, 60000); // safety fallback
    }
  }
 
  function checkHappyHousePortal() {
    if (state.roomId !== HAPPY_HOUSE_PORTAL.roomId) return;
    if (performance.now() < happyHouseCooldownUntil) return;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    if (Math.hypot(state.x - HAPPY_HOUSE_PORTAL.x, state.y - HAPPY_HOUSE_PORTAL.y) <= HAPPY_HOUSE_PORTAL.r) {
      state.clickTarget = null; state.moving = false; openHappyHousePop();
    }
  }
 
  function clickCheckHappyHousePortal(worldX, worldY) {
    if (state.roomId !== HAPPY_HOUSE_PORTAL.roomId) return false;
    if (performance.now() < happyHouseCooldownUntil) return false;
    if (Math.hypot(worldX - HAPPY_HOUSE_PORTAL.x, worldY - HAPPY_HOUSE_PORTAL.y) <= HAPPY_HOUSE_PORTAL.r) {
      openHappyHousePop(); return true;
    }
    return false;
  }

  
  /* ═══════════════════════════════════════════
     UTSUROBA PORTAL
  ═══════════════════════════════════════════ */
  function drawUtsurobPortalMarker(now) {
    if (state.roomId !== UTSUROBA_PORTAL.roomId) return;
    const sec        = now / 1000;
    const moveReveal = Math.max(0.18, Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD));
    
    const cx       = UTSUROBA_PORTAL.x, cy = UTSUROBA_PORTAL.y;
    const unlocked = _utsurobaCurriculumUnlocked();
    const masterAlpha = unlocked ? moveReveal : moveReveal * 0.38;
    const pulse  = 0.5 + 0.5 * Math.sin(sec * 1.1);
    const pulse2 = 0.5 + 0.5 * Math.sin(sec * 1.7 + 0.8);
    const bob    = Math.sin(sec * 1.3) * 4;
    ctx.save();
    const hazeR = 72 + pulse * 10;
    const haze  = ctx.createRadialGradient(cx, cy + bob, 0, cx, cy + bob, hazeR);
    haze.addColorStop(0, 'rgba(255,248,220,0.22)'); haze.addColorStop(0.45, 'rgba(255,220,100,0.12)'); haze.addColorStop(1, 'transparent');
    ctx.globalAlpha = masterAlpha * (0.6 + pulse * 0.3); ctx.fillStyle = haze;
    ctx.beginPath(); ctx.arc(cx, cy + bob, hazeR, 0, Math.PI * 2); ctx.fill();
    if (unlocked) {
      const rings = [{ r: 32, speed: 0.55, dotR: 2.2, count: 5 }, { r: 46, speed: -0.38, dotR: 1.6, count: 7 }];
      rings.forEach(ring => {
        for (let i = 0; i < ring.count; i++) {
          const angle   = sec * ring.speed + (i / ring.count) * Math.PI * 2;
          const dx      = cx + Math.cos(angle) * ring.r;
          const dy      = cy + bob + Math.sin(angle) * ring.r * 0.55;
          const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(sec * 4.5 + i * 1.4));
          ctx.globalAlpha = masterAlpha * twinkle * 0.85;
          ctx.fillStyle   = i % 2 === 0 ? '#ffd966' : '#fff8d0';
          ctx.shadowBlur  = 6; ctx.shadowColor = '#ffd966';
          ctx.beginPath(); ctx.arc(dx, dy, ring.dotR, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
      });
    }
    const midR = 18 + pulse2 * 6;
    const midG = ctx.createRadialGradient(cx, cy + bob, midR * 0.2, cx, cy + bob, midR);
    midG.addColorStop(0, 'rgba(255,240,160,0.55)'); midG.addColorStop(0.6, 'rgba(255,200,60,0.28)'); midG.addColorStop(1, 'transparent');
    ctx.globalAlpha = masterAlpha * (0.7 + pulse * 0.25); ctx.fillStyle = midG;
    ctx.beginPath(); ctx.arc(cx, cy + bob, midR, 0, Math.PI * 2); ctx.fill();
    const coreR = 9 + pulse * 3.5;
    const core  = ctx.createRadialGradient(cx - coreR * 0.3, cy + bob - coreR * 0.3, 0, cx, cy + bob, coreR);
    core.addColorStop(0, '#ffffff'); core.addColorStop(0.3, '#fffde8'); core.addColorStop(0.65, '#ffd966'); core.addColorStop(1, '#c8860a');
    ctx.globalAlpha = masterAlpha * (0.95 + pulse * 0.05); ctx.shadowBlur = 22 + pulse * 18; ctx.shadowColor = '#ffeea0';
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy + bob, coreR, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.globalAlpha = masterAlpha * (0.6 + pulse2 * 0.25); ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx - coreR * 0.3, cy + bob - coreR * 0.3, coreR * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  let utsurubaPopOverlay = null;

  function injectUtsuobaPopOverlay() {
    if (utsurubaPopOverlay) return;
    utsurubaPopOverlay = document.createElement('div');
    utsurubaPopOverlay.id = 'utsuroba-pop-overlay';
    utsurubaPopOverlay.style.cssText = `display:none;position:fixed;inset:0;z-index:9300;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.4s ease;`;
    utsurubaPopOverlay.innerHTML = `
      <div id="utsuroba-pop-box" style="background:linear-gradient(160deg,#06000f 0%,#0c0018 60%,#04000a 100%);border:1px solid rgba(120,0,200,.45);border-radius:8px;padding:0 0 clamp(22px,4vw,36px);max-width:min(420px,94vw);width:94vw;text-align:center;box-shadow:0 0 0 1px rgba(100,0,160,.4),0 0 50px rgba(60,0,110,.85),0 0 110px rgba(30,0,70,.6),0 0 200px rgba(15,0,40,.4),inset 0 0 80px rgba(0,0,0,.6);font-family:'Georgia',serif;position:relative;overflow:hidden;animation:utsuPopAppear 0.4s cubic-bezier(.22,.8,.36,1) both;">
        <div style="height:2px;width:100%;background:linear-gradient(90deg,transparent,rgba(180,80,255,.9),rgba(100,200,255,.7),rgba(180,80,255,.9),transparent);animation:utsuShimmer 2.4s ease-in-out infinite;"></div>
        <div style="position:absolute;top:12px;left:12px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-right:none;border-bottom:none;"></div>
        <div style="position:absolute;top:12px;right:12px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-left:none;border-bottom:none;"></div>
        <div style="position:absolute;bottom:12px;left:12px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-right:none;border-top:none;"></div>
        <div style="position:absolute;bottom:12px;right:12px;width:18px;height:18px;border:1.5px solid rgba(160,60,255,.55);border-left:none;border-top:none;"></div>
        <button id="utsuroba-pop-close" style="position:absolute;top:12px;right:14px;background:transparent;border:none;cursor:pointer;font-size:1rem;color:rgba(160,80,255,.4);transition:color .18s;padding:4px 8px;z-index:2;">✕</button>
        <div id="utsuroba-pop-icon-wrap" style="padding:clamp(20px,4vw,32px) 0 clamp(10px,2vw,16px);position:relative;">
          <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 60%,rgba(120,0,200,.35),transparent 70%);pointer-events:none;"></div>
          <img id="utsuroba-pop-icon" src="assets/img/utsuroba_icon.png" alt="" style="width:clamp(64px,16vw,96px);height:clamp(64px,16vw,96px);object-fit:contain;position:relative;z-index:1;filter:drop-shadow(0 0 18px rgba(180,80,255,.8)) drop-shadow(0 0 40px rgba(100,0,200,.5));animation:utsuIconPulse 2.8s ease-in-out infinite;"/>
        </div>
        <div id="utsuroba-locked" style="display:none;padding:0 clamp(20px,6vw,40px);">
          <p style="font-size:clamp(.7rem,2vw,.78rem);color:rgba(140,80,200,.6);letter-spacing:.22em;margin:0 0 14px;text-transform:uppercase;">— 封印 —</p>
          <p id="utsuroba-locked-en" style="font-size:clamp(.86rem,2.8vw,1rem);color:#c8b8d8;margin:0 0 10px;line-height:1.65;letter-spacing:.04em;white-space:pre-line;"></p>
          <p id="utsuroba-locked-jp" style="font-size:clamp(.76rem,2.4vw,.9rem);color:#a890c0;margin:0 0 22px;letter-spacing:.06em;white-space:pre-line;"></p>
          <button id="utsuroba-locked-ok" style="background:transparent;font-family:'Georgia',serif;font-size:clamp(.8rem,2.5vw,.9rem);letter-spacing:.14em;cursor:pointer;padding:8px 28px;border-radius:2px;border:1px solid rgba(80,0,120,.5);color:#c0a0e0;transition:all .2s;">— 閉じる —</button>
        </div>
        <div id="utsuroba-unlocked" style="display:none;padding:0 clamp(20px,6vw,40px);">
          <p style="font-size:clamp(.68rem,1.9vw,.76rem);color:rgba(180,120,255,.7);letter-spacing:.22em;margin:0 0 12px;text-transform:uppercase;text-shadow:0 0 12px rgba(180,80,255,.4);">— 新しい世界 —</p>
          <p id="utsuroba-unlocked-en" style="font-size:clamp(.9rem,3vw,1.08rem);color:#d8b8f8;margin:0 0 8px;line-height:1.6;letter-spacing:.04em;text-shadow:0 0 24px rgba(180,80,255,.45);white-space:pre-line;"></p>
          <p id="utsuroba-unlocked-jp" style="font-size:clamp(.78rem,2.5vw,.92rem);color:#c0a0e8;margin:0 0 24px;letter-spacing:.07em;white-space:pre-line;"></p>
          <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
            <button id="utsuroba-yes" style="background:rgba(60,0,100,.35);font-family:'Georgia',serif;font-size:clamp(.82rem,2.6vw,.94rem);letter-spacing:.12em;cursor:pointer;padding:10px 32px;border-radius:3px;border:1px solid rgba(160,60,255,.75);color:#e0c0ff;box-shadow:0 0 18px rgba(140,40,220,.3);transition:all .22s;">はい / Yes</button>
            <button id="utsuroba-no"  style="background:transparent;font-family:'Georgia',serif;font-size:clamp(.82rem,2.6vw,.94rem);letter-spacing:.12em;cursor:pointer;padding:10px 32px;border-radius:3px;border:1px solid rgba(60,20,80,.65);color:#c0a0e0;transition:all .22s;">いいえ / No</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(utsurubaPopOverlay);
    document.getElementById('utsuroba-pop-close').addEventListener('click',  closeUtsurobaPopClose);
    document.getElementById('utsuroba-locked-ok').addEventListener('click',  closeUtsurobaPopClose);
    document.getElementById('utsuroba-no').addEventListener('click',          closeUtsurobaPopClose);
    document.getElementById('utsuroba-yes').addEventListener('click',         startUtsuobaTransition);
    utsurubaPopOverlay.addEventListener('click', e => { if (e.target === utsurubaPopOverlay) closeUtsurobaPopClose(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isUtsuobaPopOpen()) closeUtsurobaPopClose(); });
  }

  const UTSUROBA_LOCKED_COPY = {
    en: 'Something waits behind this light.\nComplete nine lessons in one path\nbefore it will open to you.',
    jp: 'この光の奥に、何かが待っている。\nひとつの道で九つの学びを終えよ。\nそれまで、ここは開かない。',
  };
  const UTSUROBA_UNLOCKED_COPY = {
    en: 'A new world has opened.\nDo you want to enter Utsuroba?',
    jp: '新しい世界が開いた。\nうつろばに入りますか？',
  };

  function openUtsuobaPopup() {
    const unlocked   = _utsurobaCurriculumUnlocked();
    const lockedEl   = document.getElementById('utsuroba-locked');
    const unlockedEl = document.getElementById('utsuroba-unlocked');
    if (unlocked) {
      lockedEl.style.display = 'none'; unlockedEl.style.display = 'block';
      document.getElementById('utsuroba-unlocked-en').textContent = UTSUROBA_UNLOCKED_COPY.en;
      document.getElementById('utsuroba-unlocked-jp').textContent = UTSUROBA_UNLOCKED_COPY.jp;
    } else {
      lockedEl.style.display = 'block'; unlockedEl.style.display = 'none';
      document.getElementById('utsuroba-locked-en').textContent = UTSUROBA_LOCKED_COPY.en;
      document.getElementById('utsuroba-locked-jp').textContent = UTSUROBA_LOCKED_COPY.jp;
    }
    utsurubaPopOverlay.style.display    = 'flex';
    utsurubaPopOverlay.style.background = 'rgba(0,0,0,0.88)';
    state.clickTarget = null;
  }

  function closeUtsurobaPopClose() {
    utsurobaCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
    utsurubaPopOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { utsurubaPopOverlay.style.display = 'none'; }, 400);
  }

  function isUtsuobaPopOpen() { return utsurubaPopOverlay && utsurubaPopOverlay.style.display === 'flex'; }

  function startUtsuobaTransition() {
    utsurubaPopOverlay.style.background = 'rgba(0,0,0,0)'; utsurubaPopOverlay.style.display = 'none';
    state.clickTarget = null; state.moving = false;
    try { music.pause(); music.currentTime = 0; } catch (_) {}
    const fadeEl = document.getElementById('kara-fade');
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`; fadeEl.style.opacity = '1';
    setTimeout(() => {
      try { sessionStorage.setItem('utsuroba_return_room', 'room_15'); } catch (_) {}
      _playUtsuobaIntroVideo();
    }, FADE_MS + 60);
  }

  function _playUtsuobaIntroVideo() {
    let vOverlay = document.getElementById('utsuroba-video-overlay');
    if (!vOverlay) {
      vOverlay = document.createElement('div');
      vOverlay.id = 'utsuroba-video-overlay';
      vOverlay.style.cssText = `position:fixed;inset:0;z-index:99999;background:#000;display:flex;align-items:center;justify-content:center;`;
      const vid = document.createElement('video');
      vid.id = 'utsuroba-intro-vid'; vid.src = UTSUROBA_PORTAL.videoSrc;
      vid.autoplay = true; vid.playsInline = true; vid.muted = false;
      vid.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
      vOverlay.appendChild(vid); document.body.appendChild(vOverlay);
      let redirected = false;
      function goToUtsuroba() {
        if (redirected) return; redirected = true;
        window.location.href = UTSUROBA_PORTAL.href;
      }
      vid.addEventListener('ended', goToUtsuroba);
      vid.addEventListener('error', e => { console.warn('[utsuroba video] error:', e); goToUtsuroba(); });
      vid.play().catch(e => { console.warn('[utsuroba video] play() rejected:', e); goToUtsuroba(); });
      setTimeout(goToUtsuroba, 60000);
    }
  }

  function checkUtsuobaPortal() {
    if (state.roomId !== UTSUROBA_PORTAL.roomId) return;
    if (performance.now() < utsurobaCooldownUntil) return;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    if (Math.hypot(state.x - UTSUROBA_PORTAL.x, state.y - UTSUROBA_PORTAL.y) <= UTSUROBA_PORTAL.r) {
      state.clickTarget = null; state.moving = false; openUtsuobaPopup();
    }
  }

  function clickCheckUtsuobaPortal(worldX, worldY) {
    if (state.roomId !== UTSUROBA_PORTAL.roomId) return false;
    if (performance.now() < utsurobaCooldownUntil) return false;
    if (Math.hypot(worldX - UTSUROBA_PORTAL.x, worldY - UTSUROBA_PORTAL.y) <= UTSUROBA_PORTAL.r) { openUtsuobaPopup(); return true; }
    return false;
  }

  /* ═══════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════ */
  const state = {
    
    roomId: (() => {
      const p = new URLSearchParams(window.location.search);
      const r = p.get('room');
      return (r && DATA.rooms[r]) ? r : DATA.startRoom;
    })(),
    
    spawnId: "default", x: 742, y: 717, spawnX: 742, spawnY: 717,
    arrivalDir: null, transitioning: false, transitionReadyAt: 0,
    clickTarget: null, moving: false, distMovedSinceSpawn: 0,
    mazeExiting: false, coordMode: false, musicStarted: false,
    
    lastTrailT: 0, spawnLockUntil: 0, tapCooldownUntil: 0, lastTapPos: null,
  };

  (function checkReturnFromProfile() {
    try { const ret = sessionStorage.getItem('karasuki_return_room'); if (ret === 'room_08') { state.roomId = 'room_08'; state.spawnId = 'default'; sessionStorage.removeItem('karasuki_return_room'); } } catch (_) {}
  })();

  (function checkReturnFromUtsuroba() {
    try {
      const ret = sessionStorage.getItem('utsuroba_return_room');
      if (!ret) return;
      sessionStorage.removeItem('utsuroba_return_room');
      if (DATA.rooms[ret]) { state.roomId = ret; state.spawnId = 'default'; }
    } catch (_) {}
  })();

  (function checkReturnFromBonusGame() {
    try {
      const ret = sessionStorage.getItem('booha_bonus_return_room');
      if (!ret) return;
      sessionStorage.removeItem('booha_bonus_return_room');
      if (DATA.rooms[ret]) { state.roomId = ret; state.spawnId = 'default'; }
    } catch (_) {}
  })();

 (function checkReturnFromHappyHouse() {
    try {
      
     const ret = sessionStorage.getItem('happy_house_return_room');
      if (!ret) return;
      sessionStorage.removeItem('happy_house_return_room');
      if (DATA.rooms[ret]) {
        state.roomId  = ret;
        state.spawnId = 'default';
      }
      
    } catch (_) {}
  })();
  
  

  let pins = [], trail = [], ripples = [];
  const ghostImg = new Image(); ghostImg.src = "assets/img/booha_ghost.png";
  const observerImg = new Image();
  observerImg.src = 'assets/img/karasuki/observer-1.png';
  const music    = new Audio("assets/audio/karasuki-music.mp3"); music.loop = true; music.volume = 0.65;

  let app, stage, canvas, ctx, roomLayer, coordToggle, coordReadout, pinLog;
  let portalOverlay = null;

  /* ═══════════════════════════════════════════
     STYLES
  ═══════════════════════════════════════════ */
  function injectStyles() {
    const s = document.createElement("style");
    s.textContent = `
      html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}
      body{display:grid;place-items:center;}
      #karasuki-app{position:relative;width:100vw;height:100vh;overflow:hidden;background:#000;}
      #karasuki-stage{position:absolute;left:50%;top:50%;width:${WORLD_W}px;height:${WORLD_H}px;transform-origin:50% 50%;overflow:hidden;cursor:crosshair;}
      #karasuki-room-layer{position:absolute;inset:0;}
      .karasuki-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block;pointer-events:none;user-select:none;}
      #kara-canvas{position:absolute;inset:0;z-index:10;pointer-events:none;}
      #kara-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:20;}
      #rotate-overlay{display:none;position:fixed;inset:0;z-index:9999;background:#000;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:32px;}
      @media screen and (orientation:portrait) and (max-width:1023px){#rotate-overlay{display:flex !important;}}
      .rotate-phone{font-size:64px;display:block;animation:rotatehint 2.4s ease-in-out infinite;transform-origin:center;}
      @keyframes rotatehint{0%,100%{transform:rotate(0deg);}40%,60%{transform:rotate(-90deg);}}
      .rotate-bar{width:120px;height:3px;border-radius:999px;background:linear-gradient(90deg,#ff3bbd,#ff79d7,#ff3bbd);background-size:200%;animation:barshimmer 2s linear infinite;box-shadow:0 0 14px rgba(255,59,189,.5);}
      @keyframes barshimmer{0%{background-position:0%}100%{background-position:200%}}
      .rotate-title{font-family:system-ui,-apple-system,sans-serif;font-size:clamp(18px,5vw,28px);font-weight:900;letter-spacing:1px;color:#fff;margin:0;text-shadow:0 0 28px rgba(255,140,255,.7);}
      .rotate-sub{font-size:14px;color:rgba(255,255,255,.55);margin:0;line-height:1.7;}
      #coord-toggle{position:fixed;bottom:18px;right:18px;z-index:200;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.80);color:#ff8ae2;font:700 11px/1 monospace;padding:7px 13px;border-radius:20px;cursor:pointer;border:1px solid rgba(255,138,226,.40);user-select:none;letter-spacing:.06em;}
      .toggle-pill{width:30px;height:16px;border-radius:8px;background:rgba(255,138,226,.18);position:relative;transition:background .2s;}
      .toggle-pill::after{content:"";position:absolute;top:3px;left:3px;width:10px;height:10px;border-radius:50%;background:#ff8ae2;transition:transform .2s;}
      #coord-toggle.active .toggle-pill{background:rgba(255,138,226,.55);}
      #coord-toggle.active .toggle-pill::after{transform:translateX(14px);}
      #coord-readout{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:200;background:rgba(0,0,0,.80);color:#ff8ae2;font:700 13px/1.4 monospace;padding:6px 16px;border-radius:20px;pointer-events:none;border:1px solid rgba(255,138,226,.30);letter-spacing:.05em;opacity:0;transition:opacity .2s;white-space:nowrap;text-align:center;}
      #coord-readout.show{opacity:1;}
      #coord-readout .hint{font-size:10px;color:rgba(255,138,226,.55);display:block;margin-top:2px;}
      #pin-log{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:200;max-height:60vh;overflow-y:auto;background:rgba(0,0,0,.85);border:1px solid rgba(255,138,226,.25);border-radius:14px;padding:10px 12px;font:700 11px/1.6 monospace;color:#ff8ae2;letter-spacing:.04em;display:none;min-width:160px;}
      #pin-log.show{display:block;}
      #pin-log .pin-row{display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,138,226,.12);cursor:pointer;}
      #pin-log .pin-row:last-child{border-bottom:none;}
      #pin-log .pin-row:hover{color:#fff;}
      #pin-log .pin-idx{min-width:18px;text-align:right;color:rgba(255,138,226,.55);font-size:10px;}
      #pin-log .pin-coords{flex:1;}
      #pin-log .pin-copy{font-size:9px;color:rgba(255,138,226,.45);padding:1px 5px;border-radius:6px;border:1px solid rgba(255,138,226,.2);}
      #pin-log .pin-row:hover .pin-copy{color:#fff;border-color:rgba(255,138,226,.6);}
      #pin-log .log-header{font-size:9px;color:rgba(255,138,226,.45);letter-spacing:.12em;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;}
      #pin-log .clear-btn{font-size:9px;color:rgba(255,138,226,.4);cursor:pointer;padding:1px 6px;border-radius:6px;border:1px solid rgba(255,138,226,.18);}
      #pin-log .clear-btn:hover{color:#fff;border-color:rgba(255,138,226,.6);}
      #copy-toast{position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:300;background:rgba(20,0,30,.92);color:#fff;font:700 12px/1 monospace;padding:6px 18px;border-radius:20px;pointer-events:none;opacity:0;transition:opacity .18s;letter-spacing:.05em;}
      #copy-toast.show{opacity:1;}
      #portal-overlay{display:none;position:fixed;inset:0;z-index:9000;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.3s ease;}
      #portal-overlay.active{display:flex;background:rgba(0,0,0,0.82);}
      #portal-box{background:#080810;border:1px solid #3a1055;border-radius:6px;padding:clamp(24px,5vw,44px) clamp(20px,6vw,52px) clamp(20px,4vw,36px);max-width:min(440px,92vw);width:92vw;text-align:center;box-shadow:0 0 0 1px rgba(160,40,220,.6),0 0 40px rgba(160,40,220,.7),0 0 90px rgba(120,0,180,.45),0 0 160px rgba(100,0,160,.2),inset 0 0 50px rgba(0,0,0,.5);font-family:'Georgia',serif;position:relative;animation:portalAppear 0.25s ease-out;}
      @keyframes portalAppear{from{opacity:0;transform:scale(0.92) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);}}
      @keyframes utsuPopAppear{from{opacity:0;transform:scale(0.88) translateY(12px);}to{opacity:1;transform:scale(1) translateY(0);}}
      @keyframes utsuShimmer{0%,100%{opacity:.4;transform:translateX(-30%);}50%{opacity:1;transform:translateX(30%);}}
      @keyframes utsuIconPulse{0%,100%{filter:drop-shadow(0 0 18px rgba(180,80,255,.8)) drop-shadow(0 0 40px rgba(100,0,200,.5));transform:scale(1);}50%{filter:drop-shadow(0 0 28px rgba(200,120,255,1)) drop-shadow(0 0 60px rgba(140,0,255,.7));transform:scale(1.06);}}
      #portal-box::before,#portal-box::after{content:"";position:absolute;width:20px;height:20px;border-color:rgba(180,80,220,.7);border-style:solid;}
      #portal-box::before{top:10px;left:10px;border-width:1.5px 0 0 1.5px;}
      #portal-box::after{bottom:10px;right:10px;border-width:0 1.5px 1.5px 0;}
      #portal-en{font-size:clamp(.9rem,3.5vw,1.1rem);margin:0 0 10px;letter-spacing:.04em;color:#f0e8ff;line-height:1.55;text-shadow:0 0 20px rgba(200,180,255,.5);}
      #portal-ja{font-size:clamp(.78rem,3vw,.92rem);margin:0 0 clamp(18px,4vw,32px);color:#cdb8e8;letter-spacing:.05em;}
      .portal-btn{background:transparent;font-family:'Georgia',serif;font-size:clamp(.82rem,3vw,.95rem);letter-spacing:.12em;cursor:pointer;transition:color .18s,border-color .18s,box-shadow .18s,background .18s;padding:clamp(6px,2vw,10px) clamp(20px,5vw,34px);border-radius:3px;}
      #portal-yes{border:1.5px solid rgba(160,70,210,.9);color:#e8d8ff;margin-right:16px;background:rgba(100,30,150,.15);}
      #portal-yes:hover{color:#fff;border-color:rgba(210,120,255,1);background:rgba(140,50,200,.3);box-shadow:0 0 20px rgba(180,80,240,.6),0 0 40px rgba(140,40,200,.3);}
      #portal-no{border:1.5px solid rgba(70,45,90,.8);color:#b8a8c8;background:rgba(40,25,60,.2);}
      #portal-no:hover{color:#ddd0ff;border-color:rgba(130,90,160,.9);background:rgba(70,45,100,.3);}
      #wanderer-pop-box::-webkit-scrollbar{width:4px;}
      #wanderer-pop-box::-webkit-scrollbar-track{background:transparent;}
      #wanderer-pop-box::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:4px;}
      #utsuroba-locked-en,#utsuroba-locked-jp,#utsuroba-unlocked-en,#utsuroba-unlocked-jp{white-space:pre-line;}
      #orb-panel{touch-action:none;}
      #orb-swap-overlay{touch-action:none;}
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════
     DEV PANEL
  ═══════════════════════════════════════════ */
  function injectDevPanel() {
    if (document.getElementById('dev-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'dev-panel';
    panel.style.cssText = `position:fixed;bottom:18px;right:18px;z-index:9999;pointer-events:auto;background:rgba(0,0,0,.88);border:1px solid rgba(255,200,0,.4);border-radius:10px;padding:10px 14px;font:700 11px/1.8 monospace;color:#ffd700;letter-spacing:.06em;min-width:160px;box-shadow:0 0 20px rgba(255,200,0,.2);`;
    panel.innerHTML = `
      <div style="font-size:9px;color:rgba(255,200,0,.5);letter-spacing:.14em;margin-bottom:6px;">DEV MODE</div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="dev-all-wanderers"> All wanderers</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="dev-all-games"> All games unlocked</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="dev-utsuroba"> Utsuroba unlocked</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="dev-all-orbs"> Show all orbs</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;"><input type="checkbox" id="dev-coords-toggle"> Coord mode</label>
      <button id="dev-clear-quest" style="margin-top:4px;font:700 11px monospace;color:#ffd700;background:transparent;border:1px solid rgba(255,200,0,.4);border-radius:4px;padding:3px 8px;cursor:pointer;width:100%;">Clear quest</button>
      <div id="dev-room-info" style="font-size:9px;color:rgba(255,200,0,.45);margin-top:8px;"></div>`;
    document.body.appendChild(panel);
    window.__devAllGames = false; window.__devAllWanderers = false; window.__devUtsuroba = false; window.__devAllOrbs = false;
    document.getElementById('dev-all-games').addEventListener('change',     function() { window.__devAllGames = this.checked; });
    document.getElementById('dev-all-wanderers').addEventListener('change', function() { window.__devAllWanderers = this.checked; refreshWanderersForRoom(); });
    document.getElementById('dev-utsuroba').addEventListener('change',      function() { window.__devUtsuroba = this.checked; });
    document.getElementById('dev-all-orbs').addEventListener('change',      function() { window.__devAllOrbs = this.checked; });
    document.getElementById('dev-coords-toggle').addEventListener('change', function() { if (this.checked !== state.coordMode) toggleCoordMode(); });
    document.getElementById('dev-clear-quest').addEventListener('click', () => {

      try {
        if (window.BoohaAdventure && BoohaAdventure.save) {
          const data = BoohaAdventure.save.load();
          if (data.weekly) data.weekly.drifterQuest = null;
          BoohaAdventure.save.save(data);
          invalidateQuestCache();
        }
        weeklyOrbs.forEach(o => o.collected = false);
      } catch(_) {}
      
    });

    setInterval(() => {
      const el = document.getElementById('dev-room-info');
      if (el) {
        const quest    = loadDrifterQuest();
        const orbsHere = weeklyOrbs.filter(o => o.roomId === state.roomId && !o.collected);
        const qInfo = quest
          ? `q:${quest.active} m:${quest.memIdx} ${quest.collectedMemoryId ? 'carrying:'+quest.collectedMemoryId : 'carrying:none'}`
          : 'quest:none';
        el.innerHTML = `room:${state.roomId} | orbs:${orbsHere.length}<br>${qInfo}`;
      }
    }, 200);
  }

  function _utsurobaCurriculumUnlocked() {
    if (window.__devAllGames || window.__devUtsuroba) return true;
    try {
      if (window.BoohaAdventure && BoohaAdventure.scores) {
        const curricula = ['bc', 'br', 'pb'];
        for (const c of curricula) { if (BoohaAdventure.scores.weeklyCompletedFor(c) >= 9) return true; }
      }
    } catch (_) {}
    return false;
  }

  /* ═══════════════════════════════════════════
     DOM BUILD
  ═══════════════════════════════════════════ */
  function buildApp() {
    app       = document.createElement("div"); app.id = "karasuki-app";
    stage     = document.createElement("div"); stage.id = "karasuki-stage";
    roomLayer = document.createElement("div"); roomLayer.id = "karasuki-room-layer";
    canvas    = document.createElement("canvas"); canvas.id = "kara-canvas";
    const fade = document.createElement("div"); fade.id = "kara-fade";
    stage.appendChild(roomLayer); stage.appendChild(canvas); stage.appendChild(fade);
    app.appendChild(stage);
    
    
    coordReadout = document.createElement("div"); coordReadout.id = "coord-readout";
    coordReadout.innerHTML = `<span id="coord-xy">—</span><span class="hint">click to pin · hover to read</span>`;
    pinLog = document.createElement("div"); pinLog.id = "pin-log";
    pinLog.innerHTML = `<div class="log-header"><span>PINS — ${state.roomId}</span><span class="clear-btn" id="clear-pins">CLEAR</span></div><div id="pin-rows"></div>`;
    const toast = document.createElement("div"); toast.id = "copy-toast"; toast.textContent = "copied!";
    portalOverlay = document.createElement("div"); portalOverlay.id = "portal-overlay";
    portalOverlay.innerHTML = `<div id="portal-box"><p id="portal-en">Do you want to go to your profile page?</p><p id="portal-ja">プロフィールページに行きますか？</p><button class="portal-btn" id="portal-yes">Yes</button><button class="portal-btn" id="portal-no">No</button></div>`;
    document.body.innerHTML = "";
    document.body.appendChild(app);
    
    // dev UI removed
    
    document.body.appendChild(toast);
    document.body.appendChild(portalOverlay);
        injectBonusPopOverlay(); injectWandererPopOverlay(); injectUtsuobaPopOverlay(); injectOrbPanel(); injectSwapOverlay(); injectObserverPop(); injectHappyHousePop();
    
    const rotateOverlay = document.createElement("div"); rotateOverlay.id = "rotate-overlay";
    rotateOverlay.innerHTML = `<span class="rotate-phone">📱</span><div class="rotate-bar"></div><p class="rotate-title">横にして遊ぼう！</p><p class="rotate-sub">カラスキは<strong style="color:#ff79d7">横画面</strong>で遊べるよ。<br>スマホを横にしてね。</p>`;
    document.body.appendChild(rotateOverlay);
    ctx = canvas.getContext("2d");
   
    document.getElementById("portal-yes").addEventListener("click", () => { try { sessionStorage.setItem('karasuki_return_room', 'room_08'); } catch (_) {} window.location.href = PORTAL.href; });
    document.getElementById("portal-no").addEventListener("click", closePortal);
    portalOverlay.addEventListener("click", (e) => { if (e.target === portalOverlay) closePortal(); });
  }

  function openPortal()   { portalOverlay.classList.add("active"); state.clickTarget = null; }
  function closePortal()  { portalOverlay.classList.remove("active"); }
  function isPortalOpen() { return portalOverlay.classList.contains("active"); }

  function exitToMaze() {
    if (state.mazeExiting) return;
    state.mazeExiting = true; state.clickTarget = null;
    try { music.pause(); music.currentTime = 0; } catch (_) {}
    try {
      sessionStorage.setItem('booha_return_to_checkpoint', '1');
      const storedWeek  = sessionStorage.getItem('booha_active_week');
      const storedGhost = sessionStorage.getItem('booha_active_ghost');
      if (storedWeek)  sessionStorage.setItem('booha_return_week',  storedWeek);
      if (storedGhost) sessionStorage.setItem('booha_return_ghost', storedGhost);
      sessionStorage.setItem('booha_return_ix', String(MAZE_EXIT.treeIX));
      sessionStorage.setItem('booha_return_iy', String(MAZE_EXIT.treeIY));
    } catch (_) {}
    const fadeEl = document.getElementById("kara-fade");
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`; fadeEl.style.opacity = "1";
    setTimeout(() => { window.location.href = MAZE_EXIT.mazeUrl; }, FADE_MS + 60);
  }

  /* ═══════════════════════════════════════════
     CANVAS / FIT
  ═══════════════════════════════════════════ */
 function resizeCanvas() {
  // Android phones can report very high DPR values.
  // A huge internal canvas + gradients/shadows = laggy Booha.
  const rawDpr = window.devicePixelRatio || 1;
  const dpr = IS_PHONE ? Math.min(rawDpr, 1.5) : Math.min(rawDpr, 2);

  canvas.style.width = WORLD_W + "px";
  canvas.style.height = WORLD_H + "px";

  canvas.width = Math.round(WORLD_W * dpr);
  canvas.height = Math.round(WORLD_H * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
  
  function fitStage() {
    const scale = Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  /* ═══════════════════════════════════════════
     COORD MODE
  ═══════════════════════════════════════════ */
  function toggleCoordMode() {
    state.coordMode = !state.coordMode;
    
    if (coordToggle) coordToggle.classList.toggle("active", state.coordMode);
    coordReadout.classList.toggle("show",  state.coordMode);
    pinLog.classList.toggle("show",        state.coordMode);
    pinLog.querySelector(".log-header span").textContent = `PINS — ${state.roomId}`;
    const cb = document.getElementById("dev-coords-toggle");
    if (cb && cb.checked !== state.coordMode) cb.checked = state.coordMode;
  }
  function dropPin(wx, wy) { const label = `${Math.round(wx)}, ${Math.round(wy)}`; pins.push({ x: wx, y: wy, label }); renderPinLog(); copyText(label); showToast(`pinned ${label}`); }
  function renderPinLog() {
    const rows = document.getElementById("pin-rows"); if (!rows) return;
    rows.innerHTML = pins.map((p, i) => `<div class="pin-row" data-i="${i}"><span class="pin-idx">${i+1}</span><span class="pin-coords">${p.label}</span><span class="pin-copy">copy</span></div>`).join("");
    rows.querySelectorAll(".pin-row").forEach(row => { row.addEventListener("click", () => { const pin = pins[+row.dataset.i]; if (pin) { copyText(pin.label); showToast(`copied ${pin.label}`); } }); });
  }
  let toastTimer = null;
  function showToast(msg) { const t = document.getElementById("copy-toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1400); }
  async function copyText(txt) { try { await navigator.clipboard.writeText(txt); return; } catch (_) {} try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch (_) {} }

  /* ═══════════════════════════════════════════
     ROOM HELPERS
  ═══════════════════════════════════════════ */
  function getRoom() { return DATA.rooms[state.roomId]; }
  function getSpawn(room, spawnId) { return room.spawns?.[spawnId] || room.spawns?.default || { x: 480, y: 270 }; }
  function placeGhost(x, y) { state.x = x; state.y = y; }
  function makeBg(src) { const img = document.createElement("img"); img.className = "karasuki-bg"; img.src = src; return img; }
  let currentBg;

  function renderInitialRoom() {
    const room = getRoom(); currentBg = makeBg(room.bg); roomLayer.appendChild(currentBg);
    const spawn = getSpawn(room, state.spawnId); placeGhost(spawn.x, spawn.y);
    state.spawnX = spawn.x; state.spawnY = spawn.y;
    const now = performance.now();
    state.transitionReadyAt = now + TRANSITION_COOLDOWN_MS;
    arrivalArrowHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS;
    arrivalArrowBackHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER;
    
   state.distMovedSinceSpawn = 0; state.clickTarget = null; state.moving = false;
    state.spawnLockUntil = now + 500;
    KarasukiAtmos.setRoom(state.roomId, getObserverRoomId());

    startEntryDrift();
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
    state.transitioning = true; state.clickTarget = null;
    const fadeEl = document.getElementById("kara-fade");
    fadeEl.style.transition = `opacity ${FADE_MS/2}ms ease-in`; fadeEl.style.opacity = "1";
    setTimeout(() => {
      const nextBg = makeBg(nextRoom.bg); roomLayer.innerHTML = ""; roomLayer.appendChild(nextBg); currentBg = nextBg;
      state.roomId = exit.to; onRoomChanged(); state.spawnId = exit.spawn || "default";
      const spawn = getSpawn(nextRoom, state.spawnId); placeGhost(spawn.x, spawn.y);
      state.spawnX = spawn.x; state.spawnY = spawn.y; state.arrivalDir = exit.dir || null;
      trail = []; pins = [];
      const now = performance.now();
      state.transitionReadyAt = now + TRANSITION_COOLDOWN_MS;
      arrivalArrowHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS;
      arrivalArrowBackHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER;
      state.distMovedSinceSpawn = 0; state.spawnLockUntil = now + 500;
      const lh = pinLog.querySelector(".log-header span"); if (lh) lh.textContent = `PINS — ${state.roomId}`;
      renderPinLog();
      fadeEl.style.transition = `opacity ${FADE_MS/2}ms ease-out`; fadeEl.style.opacity = "0";
      setTimeout(() => { state.transitioning = false; startEntryDrift(); }, FADE_MS/2 + 30);
    }, FADE_MS/2 + 20);
  }

  function getNPPExit(now) {
    if (now < state.transitionReadyAt) return null;
    if (isEntryDriftActive()) return null;
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
    if (now - state.lastTrailT < 45) return; state.lastTrailT = now;
    const [col1, col2] = roomColorPair(state.roomId);
    trail.push({ x: x + (Math.random()-0.5)*10, y: y + GHOST_R*0.55 + (Math.random()-0.5)*8, vx: (Math.random()-0.5)*0.4, vy: -Math.random()*0.5, life: 1, size: 2+Math.random()*4.5, color: Math.random()>0.5?col1:col2 });
    if (trail.length > TRAIL_MAX) trail.shift();
  }

  /* ═══════════════════════════════════════════
     DRAW EXIT ARROWS
  ═══════════════════════════════════════════ */
  function drawExitArrows(now) {
    const npps = NPP[state.roomId]; if (!npps) return;
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD); if (moveReveal <= 0) return;
    const sec = now/1000; const [col1,col2] = roomColorPair(state.roomId);
    const OPPOSITE = { left:"right", right:"left", up:"down", down:"up" };
    const arrivalExit = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    npps.forEach((npp, i) => {
      if (!npp.dir) return;
      const isBackDir = (npp.dir === arrivalExit);
      const hiddenUntil = isBackDir ? arrivalArrowBackHiddenUntil : arrivalArrowHiddenUntil;
      const delayRemaining = hiddenUntil - now; if (delayRemaining > 400) return;
      const revealFade = Math.min(1, Math.max(0, 1-(delayRemaining/(isBackDir?ARRIVAL_ARROW_DELAY_MS*ARRIVAL_ARROW_BACK_MULTIPLIER:ARRIVAL_ARROW_DELAY_MS))));
      const angle = DIR_ANGLE[npp.dir]??0; const pulse = 0.5+0.5*Math.sin(sec*2.2+i*1.3);
      const bounce = Math.sin(sec*2.2+i*1.3)*6;
      const ax = npp.x+Math.cos(angle)*bounce; const ay = npp.y+Math.sin(angle)*bounce;
      const fadeAlpha = revealFade*moveReveal;
      ctx.save(); ctx.translate(ax,ay); ctx.rotate(angle);
      const ga = ctx.createRadialGradient(0,0,0,0,0,40); ga.addColorStop(0,col1); ga.addColorStop(1,"transparent");
      ctx.globalAlpha = fadeAlpha*(0.10+pulse*0.08); ctx.fillStyle = ga; ctx.beginPath(); ctx.arc(0,0,40,0,Math.PI*2); ctx.fill();
      [{ox:-11,a:0.65},{ox:4,a:1.0}].forEach(({ox,a}) => {
        ctx.globalAlpha = fadeAlpha*a*(0.38+pulse*0.32); ctx.strokeStyle = col1; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowBlur = 12; ctx.shadowColor = col2;
        ctx.beginPath(); ctx.moveTo(ox-7,-10); ctx.lineTo(ox+7,0); ctx.lineTo(ox-7,10); ctx.stroke(); ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = fadeAlpha*(0.60+pulse*0.38); ctx.fillStyle = "#fff"; ctx.shadowBlur = 14; ctx.shadowColor = col1;
      ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     DRAW PORTAL ORB
  ═══════════════════════════════════════════ */
  const PORTAL_COLORS = ['#8b00ff','#00bfff','#ff007f','#00ff99','#ffaa00','#aa00ff'];

  function drawPortalOrb(now) {
    if (state.roomId !== "room_08") return;
    const sec = now/1000;
    const cycleT = (sec*0.28)%PORTAL_COLORS.length;
    const idx0 = Math.floor(cycleT)%PORTAL_COLORS.length; const idx1 = (idx0+1)%PORTAL_COLORS.length;
    const t = cycleT-Math.floor(cycleT);
    const col = lerpHex(PORTAL_COLORS[idx0],PORTAL_COLORS[idx1],t);
    const col2 = lerpHex(PORTAL_COLORS[(idx1+1)%PORTAL_COLORS.length],PORTAL_COLORS[(idx1+2)%PORTAL_COLORS.length],t);
    const pulse = 0.5+0.5*Math.sin(sec*2.6); const pulse2 = 0.5+0.5*Math.sin(sec*1.8+1.2);
    ctx.save();
    const ambient = ctx.createRadialGradient(PORTAL.x,PORTAL.y,0,PORTAL.x,PORTAL.y,72);
    ambient.addColorStop(0,col+"00"); ambient.addColorStop(0.3,col+"28"); ambient.addColorStop(0.6,col+"44"); ambient.addColorStop(1,"transparent");
    ctx.globalAlpha = 0.55+pulse*0.35; ctx.fillStyle = ambient; ctx.beginPath(); ctx.arc(PORTAL.x,PORTAL.y,72,0,Math.PI*2); ctx.fill();
    const cloud2 = ctx.createRadialGradient(PORTAL.x,PORTAL.y,0,PORTAL.x,PORTAL.y,52);
    cloud2.addColorStop(0,col2+"00"); cloud2.addColorStop(0.25,col2+"22"); cloud2.addColorStop(0.55,col2+"38"); cloud2.addColorStop(1,"transparent");
    ctx.globalAlpha = 0.4+pulse2*0.3; ctx.fillStyle = cloud2; ctx.beginPath(); ctx.arc(PORTAL.x,PORTAL.y,52,0,Math.PI*2); ctx.fill();
    const innerR = 10+pulse*6;
    const energy = ctx.createRadialGradient(PORTAL.x,PORTAL.y,0,PORTAL.x,PORTAL.y,innerR*2.8);
    energy.addColorStop(0,"transparent"); energy.addColorStop(0.25,col+"55"); energy.addColorStop(0.55,col+"cc"); energy.addColorStop(0.75,col+"66"); energy.addColorStop(1,"transparent");
    ctx.globalAlpha = 0.85+pulse*0.13; ctx.shadowBlur = 18+pulse*16; ctx.shadowColor = col; ctx.fillStyle = energy; ctx.beginPath(); ctx.arc(PORTAL.x,PORTAL.y,innerR*2.8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    const dotCount = 8;
    for (let d = 0; d < dotCount; d++) {
      const ringR = 18+pulse*4+(d%2)*8; const speed = d%2===0?0.7:-0.5;
      const angle = (sec*speed)+(d/dotCount)*Math.PI*2;
      const dx = PORTAL.x+Math.cos(angle)*ringR; const dy = PORTAL.y+Math.sin(angle)*ringR;
      const sparkA = 0.3+0.7*Math.abs(Math.sin(sec*2.5+d*0.8)); const sparkR = 1.2+pulse*1.0;
      ctx.globalAlpha = sparkA; const sparkCol = d%2===0?col:col2;
      ctx.fillStyle = sparkCol; ctx.shadowBlur = 8; ctx.shadowColor = sparkCol;
      ctx.beginPath(); ctx.arc(dx,dy,sparkR,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    }
    for (let w = 0; w < 3; w++) {
      const wAngle = (sec*0.4)+(w/3)*Math.PI*2; const wR = 14+pulse2*5;
      ctx.globalAlpha = 0.18+pulse*0.14; ctx.strokeStyle = w%2===0?col:col2; ctx.lineWidth = 1.5; ctx.shadowBlur = 10; ctx.shadowColor = col;
      ctx.beginPath(); ctx.arc(PORTAL.x,PORTAL.y,wR,wAngle,wAngle+Math.PI*0.7); ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  /* ═══════════════════════════════════════════
     DRAW MAZE EXIT ARROW
  ═══════════════════════════════════════════ */
  function drawMazeExitArrow(now) {
    if (state.roomId !== MAZE_EXIT.roomId) return;
    const moveReveal = Math.min(1,state.distMovedSinceSpawn/ARROW_MOVE_THRESHOLD); if (moveReveal<=0) return;
    const sec = now/1000; const pulse = 0.5+0.5*Math.sin(sec*2.4); const bounce = Math.sin(sec*2.4)*7;
    const ax = MAZE_EXIT.x; const ay = MAZE_EXIT.y+bounce;
    const col1="#44ff88"; const col2="#aa44ff"; const col3="#aaffcc";
    ctx.save(); ctx.globalAlpha = moveReveal;
    const ambient = ctx.createRadialGradient(ax,ay,0,ax,ay,56);
    ambient.addColorStop(0,col1+"44"); ambient.addColorStop(0.5,col2+"22"); ambient.addColorStop(1,"transparent");
    ctx.globalAlpha = moveReveal*(0.18+pulse*0.14); ctx.fillStyle = ambient; ctx.beginPath(); ctx.arc(ax,ay,56,0,Math.PI*2); ctx.fill();
    ctx.save(); ctx.translate(ax,ay); ctx.rotate(Math.PI/2);
    [{ox:-12,a:0.55},{ox:5,a:1.0}].forEach(({ox,a}) => {
      ctx.globalAlpha = moveReveal*a*(0.42+pulse*0.38); ctx.strokeStyle = col1; ctx.lineWidth = 3.0; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowBlur = 16; ctx.shadowColor = col2;
      ctx.beginPath(); ctx.moveTo(ox-9,-12); ctx.lineTo(ox+9,0); ctx.lineTo(ox-9,12); ctx.stroke(); ctx.shadowBlur = 0;
    });
    ctx.restore();
    ctx.globalAlpha = moveReveal*(0.70+pulse*0.28); ctx.shadowBlur = 18; ctx.shadowColor = col1;
    const dotG = ctx.createRadialGradient(ax,ay,0,ax,ay,7);
    dotG.addColorStop(0,col3); dotG.addColorStop(0.5,col1); dotG.addColorStop(1,"transparent");
    ctx.fillStyle = dotG; ctx.beginPath(); ctx.arc(ax,ay,7,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.globalAlpha = moveReveal*(0.55+pulse*0.25); ctx.font = "bold 13px monospace"; ctx.fillStyle = col3; ctx.textAlign = "center"; ctx.shadowBlur = 10; ctx.shadowColor = col1;
    ctx.fillText("MAZE",ax,ay-28); ctx.shadowBlur = 0; ctx.textAlign = "left"; ctx.restore();
  }

  function lerpHex(a, b, t) {
    const ah = parseInt(a.replace('#',''),16), bh = parseInt(b.replace('#',''),16);
    const ar=(ah>>16)&0xff, ag=(ah>>8)&0xff, ab=ah&0xff;
    const br=(bh>>16)&0xff, bg=(bh>>8)&0xff, bb=bh&0xff;
    const rr=Math.round(ar+(br-ar)*t), rg=Math.round(ag+(bg-ag)*t), rb=Math.round(ab+(bb-ab)*t);
    
    return '#'+[rr,rg,rb].map(v=>v.toString(16).padStart(2,'0')).join('');
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
      ctx.globalAlpha=0.80+pulse*0.18; ctx.strokeStyle="#ff8ae2"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(p.x-14,p.y); ctx.lineTo(p.x+14,p.y); ctx.moveTo(p.x,p.y-14); ctx.lineTo(p.x,p.y+14); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha=1; ctx.fillStyle="#ff4fc8"; ctx.shadowBlur=8; ctx.shadowColor="#ff8ae2";
      ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.font="bold 10px monospace"; const tw=ctx.measureText(p.label).width; const bx=p.x+10, by=p.y-18;
      ctx.globalAlpha=0.88; ctx.fillStyle="rgba(0,0,0,.75)"; ctx.beginPath(); ctx.roundRect(bx-4,by-11,tw+10,15,5); ctx.fill();
      ctx.fillStyle="#ff8ae2"; ctx.globalAlpha=1; ctx.fillText(`${i+1}. ${p.label}`,bx+1,by); ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     MAIN DRAW FRAME
  ═══════════════════════════════════════════ */
  function drawFrame(now) {
    ctx.clearRect(0,0,WORLD_W,WORLD_H);
  
    
    const sec = now/1000; const [col1,col2] = roomColorPair(state.roomId);
    for (let i=ripples.length-1;i>=0;i--) {
      const rp=ripples[i]; rp.life-=0.038; if(rp.life<=0){ripples.splice(i,1);continue;}
      ctx.save(); ctx.globalAlpha=rp.life*0.72; ctx.strokeStyle="rgba(255,138,226,.95)"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(rp.x,rp.y,(1-rp.life)*38+5,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }
    for (let i=trail.length-1;i>=0;i--) {
      const p=trail[i];
      const gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2.4);
      gr.addColorStop(0,p.color); gr.addColorStop(1,"transparent");
      ctx.globalAlpha=p.life*0.48; ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*2.4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=p.life*0.90; ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1; p.life-=0.022; p.x+=p.vx; p.y+=p.vy;
    }
    trail=trail.filter(p=>p.life>0);
    drawPortalOrb(now); drawExitArrows(now); drawMazeExitArrow(now); drawHappyHouseOrb(now);
    drawBonusTrees(now); drawUtsurobPortalMarker(now); drawWanderers(now); drawObserver(now); drawOrbs(now); drawNuppi(now);
    
    const bobFreq=(Math.PI*2)/(HOVER_PERIOD/1000); const bobPhase=sec*bobFreq;
    const bob=Math.sin(bobPhase)*HOVER_AMP; const wobble=Math.sin(bobPhase*2)*2.2;
    const gx=state.x, gy=state.y+bob;
    const pulse=0.5+0.5*Math.sin(sec*2.1);
    const sx=1-Math.sin(bobPhase)*0.07; const sy=(1+Math.sin(bobPhase)*0.10)*(state.moving?1.08:1.0);
    ctx.save(); ctx.globalAlpha=0.22+pulse*0.12;
    const halo=ctx.createRadialGradient(gx,gy+3,0,gx,gy+3,GHOST_R*2.2);
    halo.addColorStop(0,col1); halo.addColorStop(0.5,col2); halo.addColorStop(1,"transparent");
    ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(gx,gy+3,GHOST_R*2.2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.18+pulse*0.07;
    const shd=ctx.createRadialGradient(gx,gy+GHOST_R*0.85,0,gx,gy+GHOST_R*0.85,GHOST_R*0.9);
    shd.addColorStop(0,"rgba(0,0,0,.65)"); shd.addColorStop(1,"transparent");
    ctx.fillStyle=shd; ctx.beginPath(); ctx.arc(gx,gy+GHOST_R*0.85,GHOST_R*0.9,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(gx,gy); ctx.rotate(wobble*Math.PI/180); ctx.scale(sx,sy);
    if(ghostImg.complete&&ghostImg.naturalWidth>0){ctx.drawImage(ghostImg,-GHOST_R,-GHOST_R,GHOST_R*2,GHOST_R*2);}
    else{ctx.globalAlpha=1;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(0,0,GHOST_R*0.7,0,Math.PI*2);ctx.fill();}
    ctx.restore(); drawPins(now);
  }

  /* ═══════════════════════════════════════════
     MOVEMENT
  ═══════════════════════════════════════════ */
  function handleClickMovement(now) {
    if (!state.clickTarget) { state.moving = false; return; }
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
     MODAL GUARD
  ═══════════════════════════════════════════ */
   function anyModalOpen() {
    return (
      state.transitioning        ||
      state.mazeExiting          ||
      isPortalOpen()             ||
      isBonusPopOpen()           ||
      isWandererPopOpen()        ||
      isUtsuobaPopOpen()         ||
      isObserverPopOpen()        ||
      isNuppiPopOpen()           ||
      isOrbPanelOpen()           ||
      isHappyHousePopOpen()
    );
  }

  /* ═══════════════════════════════════════════
     MAIN LOOP
  ═══════════════════════════════════════════ */
function tick(now) {
  // Keep motion stable on Android when frames stutter.
  // 32ms max = about a 30fps floor.
  const dt = Math.min(32, Math.max(8, now - (lastTickTime || now)));
  lastTickTime = now;

  // Cap speed multiplier so one bad frame does not make Booha lurch forward.
  const speedMult = Math.min(1.6, dt / TARGET_DT);
  SPEED = BASE_SPEED * speedMult;

  if (!anyModalOpen()) {
    tickEntryDrift(now);
    handleClickMovement(now);
    updateWanderers(now);
    updateNuppi(now);

    const driftDone = !isEntryDriftActive();
    const spawnUnlocked =
      driftDone &&
      now >= (state.spawnLockUntil || 0) &&
      state.distMovedSinceSpawn >= ARROW_MOVE_THRESHOLD;

    if (state.roomId === "room_08" && state.moving && driftDone) {
      if (Math.hypot(state.x - PORTAL.x, state.y - PORTAL.y) <= PORTAL_TRIGGER_R) {
        state.clickTarget = null;
        state.moving = false;
        openPortal();
      }
    }

    if (spawnUnlocked && state.roomId === MAZE_EXIT.roomId) {
      if (Math.hypot(state.x - MAZE_EXIT.x, state.y - MAZE_EXIT.y) <= MAZE_EXIT.r) {
        state.clickTarget = null;
        state.moving = false;
        exitToMaze();
      }
    }

    if (spawnUnlocked) checkUtsuobaPortal();
    if (spawnUnlocked) checkHappyHousePortal();

    if (spawnUnlocked) {
      const exit = getNPPExit(now);
      if (exit) {
        state.clickTarget = null;
        state.moving = false;
        transitionTo(exit);
      }
    }
  }

  drawFrame(now);
  requestAnimationFrame(tick);
}

  /* ═══════════════════════════════════════════
     MUSIC + INPUT
  ═══════════════════════════════════════════ */
  function startMusic() { if(state.musicStarted)return; state.musicStarted=true; music.play().catch(()=>{}); }

  function getGamesThisWeek() {
  try {
    const data = (window.BoohaAdventure && BoohaAdventure.save)
      ? BoohaAdventure.save.load()
      : null;
    const cg = data?.weekly?.completedGames;
    return cg && typeof cg === 'object' ? Object.keys(cg).length : 0;
  } catch (_) { return 0; }
}

function getBoohaFirstName() {
  try {
    const direct = localStorage.getItem('booha_first_name');
    if (direct) return direct.charAt(0).toUpperCase() + direct.slice(1).toLowerCase().slice(0, 12);
    const full = localStorage.getItem('booha_user_name') || '';
    const first = full.split(' ')[0].slice(0, 12);
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  } catch (_) { return ''; }
}

function getObserverRoomId() {
  const rooms = Object.keys(window.KARASUKI_DATA.OBSERVER_COORDS);
  const cal   = window.CALENDAR.getCurrentCurriculumWeek();
  const m = (cal && cal.month)      || 1;
  const w = (cal && cal.weekNumber) || 1;
  const running = (m - 1) * 4 + w;              // month 7, week 3 → 27
  return rooms[(running * 7) % rooms.length];   // stride 7 is coprime with 15 → full cycle
}

  
let observerPopEl   = null;
let observerPopOpen = false;

function injectObserverPop() {
  if (observerPopEl) return;
  observerPopEl = document.createElement('div');
  observerPopEl.id = 'observer-pop';
  observerPopEl.style.cssText = `
    display:none;position:fixed;inset:0;z-index:9250;
    align-items:center;justify-content:center;
    background:rgba(0,0,0,0);transition:background 0.3s ease;`;
  observerPopEl.innerHTML = `
  
   <div style="
      background:#05050d;border:1px solid rgba(200,200,220,0.18);
      border-radius:8px;padding:0 0 28px;
      width:min(340px,90vw);max-height:90vh;overflow-y:auto;text-align:center;
      font-family:'Georgia',serif;position:relative;
      box-shadow:0 0 40px rgba(20,20,40,0.9);">
      
      <div style="padding:28px 0 18px;display:flex;align-items:center;justify-content:center;">
        <img src="assets/img/karasuki/observer-2.png"
          style="max-width:88%;max-height:min(160px,35vw);object-fit:contain;
                 filter:drop-shadow(0 0 18px rgba(220,220,255,0.25));"/>
      </div>
      <button id="obs-pop-close" style="
        position:absolute;top:12px;right:14px;background:transparent;
        border:none;cursor:pointer;font-size:1rem;
        color:rgba(200,200,220,0.30);padding:4px 8px;">✕</button>
      <p id="obs-pop-line-en" style="
        font-size:clamp(.85rem,3.5vw,1.05rem);line-height:1.65;
        color:rgba(220,218,240,0.88);margin:0 24px 6px;
        letter-spacing:.04em;"></p>
      <p id="obs-pop-line-jp" style="
        font-size:clamp(.8rem,3.2vw,.95rem);line-height:1.6;
        color:rgba(190,188,220,0.65);margin:0 24px 14px;
        font-family:'Noto Sans JP',serif;letter-spacing:.06em;"></p>
      <p id="obs-pop-count" style="
        font-size:clamp(.7rem,2.5vw,.82rem);color:rgba(180,178,210,0.45);
        margin:0 24px;letter-spacing:.08em;"></p>
    </div>`;
  document.body.appendChild(observerPopEl);
  document.getElementById('obs-pop-close')
    .addEventListener('click', closeObserverPop);
  observerPopEl.addEventListener('click', e => {
    if (e.target === observerPopEl) closeObserverPop();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && observerPopOpen) closeObserverPop();
  });
}

function openObserverPop() {
  const games   = getGamesThisWeek();
  const lines   = window.KARASUKI_DATA.OBSERVER_LINES;
  
  const line = lines[Math.min(games, lines.length - 1)];
  document.getElementById('obs-pop-line-en').textContent = line.en;
  document.getElementById('obs-pop-line-jp').textContent = line.jp;
  
  const name = getBoohaFirstName();
const en = name ? line.en.replace('{name}', name) : line.en.replace('{name}, ', '').replace('{name}、', '');
const jp = name ? line.jp.replace('{name}', name) : line.jp.replace('{name}、', '').replace('{name}, ', '');
document.getElementById('obs-pop-line-en').textContent = en;
document.getElementById('obs-pop-line-jp').textContent = jp;
document.getElementById('obs-pop-count').textContent   = name ? `${name} — ${games} / 9` : `${games} / 9`;
  observerPopOpen = true;
  observerPopEl.style.display    = 'flex';
  observerPopEl.style.background = 'rgba(0,0,0,0.88)';
  state.clickTarget = null;
}

function closeObserverPop() {
  observerPopOpen = false;
  observerPopEl.style.background = 'rgba(0,0,0,0)';
  setTimeout(() => { if (!observerPopOpen) observerPopEl.style.display = 'none'; }, 300);
  observerPopCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
}

function isObserverPopOpen() { return observerPopOpen; }

function clickCheckObserver(worldX, worldY) {
  if (performance.now() < observerPopCooldownUntil) return false;
  const roomId = getObserverRoomId();
  if (state.roomId !== roomId) return false;
  const coord  = window.KARASUKI_DATA.OBSERVER_COORDS[roomId];
  if (!coord) return false;
  if (Math.hypot(worldX - coord.x, worldY - coord.y) <= 80) {
    openObserverPop(); return true;
  }
  return false;
}

 /* ── Nuppi images ── */
  const nuppiImg1 = new Image();
  nuppiImg1.src = 'assets/img/wanderers/nuppi-1.png';
  const nuppiImg2 = new Image();
  nuppiImg2.src = 'assets/img/wanderers/nuppi-2.png';
 
  /* ── Nuppi constants ── */
  const NUPPI_SIZE        = 52;
  const NUPPI_HIT_R       = 80;
  const NUPPI_SPEED       = 0.55;
  const NUPPI_WOBBLE_AMP  = 6;
  const NUPPI_WOBBLE_FREQ = 0.0009;
  const NUPPI_AWARE_DIST  = 480;
  const NUPPI_EXIT_DIST   = 60;
  const NUPPI_IDLE_DRIFT  = 0.18;
  const NUPPI_GLOW_R      = 90;
 
 /* ── Nuppi dialogue ── */
const NUPPI_LINES = [
  {
    en: "{name}, you came back.",
    jp: "{name}、また来たね。"
  },
  {
    en: "{name}, something followed you here. Not me.",
    jp: "{name}、何かがついてきたよ。私じゃない。"
  },
  {
    en: "{name}, I heard your name once. I kept it.",
    jp: "{name}、名前を一回聞いたよ。取っておいた。"
  },
  {
    en: "{name}, you looked sad before. I watched.",
    jp: "{name}、さっき悲しそうだったね。見てたよ。"
  },
  {
    en: "{name}, I gave something to someone like you. They threw it away.",
    jp: "{name}、きみに似た子に何かあげたよ。捨てられたけど。"
  },

  {
    en: "{name}, don’t worry. I only remember small things.",
    jp: "{name}、だいじょうぶ。小さいことしか覚えてないよ。"
  },
  {
    en: "{name}, your shadow came first.",
    jp: "{name}、影のほうが先に来たよ。"
  },
  {
    en: "{name}, I found a lost thought. Is it yours?",
    jp: "{name}、なくした考えを見つけたよ。きみの？"
  },
  {
    en: "{name}, I was quiet. That doesn’t mean I wasn’t listening.",
    jp: "{name}、静かにしてたよ。聞いてなかったわけじゃないよ。"
  },
  {
    en: "{name}, Booha trusts you. I’m still thinking.",
    jp: "{name}、ブーハーはきみを信じてるよ。私はまだ考え中。"
  },
  {
    en: "{name}, the maze changed when you blinked.",
    jp: "{name}、まばたきした時に、めいろが変わったよ。"
  },
  {
    en: "{name}, I saved a sound for you. It was very small.",
    jp: "{name}、きみに音を取っておいたよ。すごく小さい音。"
  },
  {
    en: "{name}, someone forgot this place. Maybe on purpose.",
    jp: "{name}、だれかがここを忘れたよ。わざとかも。"
  },
  {
    en: "{name}, if you hear your name twice, don’t answer the second one.",
    jp: "{name}、名前を二回聞いたら、二回目には返事しないで。"
  },
  {
    en: "{name}, I like your name. It fits in my pocket.",
    jp: "{name}、その名前、いいね。ポケットに入る。"
  },
  {
    en: "{name}, I saw a door pretending to be a wall.",
    jp: "{name}、壁のふりをしてるドアを見たよ。"
  },
  {
    en: "{name}, I’m not lost. I just don’t agree with the map.",
    jp: "{name}、私はまいごじゃないよ。地図と意見が合わないだけ。"
  },
  {
    en: "{name}, one of the lights blinked when you looked away.",
    jp: "{name}、きみが見てない時、光が一つまばたきしたよ。"
  },
  {
    en: "{name}, I found a button. Not the kind you press.",
    jp: "{name}、ボタンを見つけたよ。押すほうじゃないやつ。"
  },
  {
    en: "{name}, don’t step on the quiet parts.",
    jp: "{name}、静かなところはふまないでね。"
  },
  {
    en: "{name}, I think the maze likes you. That might be bad.",
    jp: "{name}、めいろはきみが好きみたい。ちょっとこわいね。"
  },
  {
    en: "{name}, I heard Booha laughing behind the trees.",
    jp: "{name}、木の後ろでブーハーが笑ってたよ。"
  },
  {
    en: "{name}, I had a dream, but it ran away.",
    jp: "{name}、夢を見たよ。でも逃げちゃった。"
  },
  {
    en: "{name}, if you find a key, ask what it forgot.",
    jp: "{name}、カギを見つけたら、何を忘れたか聞いてね。"
  },
  {
    en: "{name}, your footsteps sound different today.",
    jp: "{name}、今日の足音、いつもとちがうね。"
  },
  {
    en: "{name}, I put your worry under a rock. Don’t lift it.",
    jp: "{name}、心配を石の下に入れたよ。持ち上げないでね。"
  },
  {
    en: "{name}, the forest said hello. Very quietly.",
    jp: "{name}、森がこんにちはって言ったよ。すごく小さく。"
  },
  {
    en: "{name}, I’m smiling. You can tell because I said so.",
    jp: "{name}、私は笑ってるよ。そう言ったからわかるでしょ。"
  },
  {
    en: "{name}, something shiny is pretending not to be important.",
    jp: "{name}、キラキラしたものが、大事じゃないふりをしてるよ。"
  },
  {
    en: "{name}, I don’t bite. I collect.",
    jp: "{name}、かまないよ。集めるだけ。"
  },
  {
    en: "{name}, if Booha runs, follow. If I run, maybe don’t.",
    jp: "{name}、ブーハーが走ったらついていって。私が走ったら……どうかな。"
  },
  {
    en: "{name}, I found a memory with no owner.",
    jp: "{name}、持ち主のいない思い出を見つけたよ。"
  },
  {
    en: "{name}, the dark isn’t empty. It’s just shy.",
    jp: "{name}、暗いところは空っぽじゃないよ。はずかしがりなだけ。"
  },
  {
    en: "{name}, I was here before I arrived.",
    jp: "{name}、来る前からここにいたよ。"
  },
  {
    en: "{name}, don’t worry. I only know some of your secrets.",
    jp: "{name}、だいじょうぶ。秘密は少ししか知らないよ。"
  }
];
 
  /* ── Nuppi state ── */
  const nuppi = {
    roomId:    null,
    x:         0,
    y:         0,
    wobbleT:   0,
    aware:     false,
    exitTarget: null,
    frozen:    false,
    idleAngle: Math.random() * Math.PI * 2,
    idleTimer: 0,
  };
 
  let nuppiPopEl            = null;
  let nuppiPopOpen          = false;
  let nuppiPopCooldownUntil = 0;
 
  function nuppiRandomRoom(exclude) {
    const pool = Object.keys(DATA.rooms).filter(r => r !== exclude);
    return pool[Math.floor(Math.random() * pool.length)];
  }
 
  function nuppiPlaceInRoom(roomId) {
    nuppi.roomId     = roomId;
    nuppi.x          = WORLD_W / 2 + (Math.random() - 0.5) * 300;
    nuppi.y          = WORLD_H / 2 + (Math.random() - 0.5) * 180;
    nuppi.aware      = false;
    nuppi.exitTarget = null;
    nuppi.frozen     = false;
    nuppi.idleAngle  = Math.random() * Math.PI * 2;
    nuppi.idleTimer  = 0;
  }
 
  function nuppiPickExit() {
    const exits = NPP[nuppi.roomId];
    if (!exits || !exits.length) {
      const edgeTargets = [
        { x: 200,           y: WORLD_H / 2 },
        { x: WORLD_W - 200, y: WORLD_H / 2 },
        { x: WORLD_W / 2,   y: 200         },
        { x: WORLD_W / 2,   y: WORLD_H - 200 },
      ];
      return edgeTargets[Math.floor(Math.random() * edgeTargets.length)];
    }
    const exit = exits[Math.floor(Math.random() * exits.length)];
    return { x: exit.x, y: exit.y };
  }
 
  function initNuppi() {
    nuppiPlaceInRoom(nuppiRandomRoom(state.roomId));
    injectNuppiPop();
  }
 
  function onRoomChangedNuppi() {
    if (nuppi.roomId === state.roomId) {
      nuppi.aware      = true;
      nuppi.exitTarget = nuppiPickExit();
    }
  }
 
 function updateNuppi(now) {
    if (nuppi.frozen) return;
    // Use actual elapsed time so movement is frame-rate independent
    const dt = Math.min(50, Math.max(8, now - (nuppi._lastNow || now)));
    nuppi._lastNow = now;
    const dtScale  = dt / (1000 / 60); // normalize to 60fps baseline
    nuppi.wobbleT += dt;

    if (nuppi.roomId !== state.roomId) {
      _nuppiIdleDrift(dtScale);
      return;
    }

    if (nuppi.aware && nuppi.exitTarget) {
      const dx   = nuppi.exitTarget.x - nuppi.x;
      const dy   = nuppi.exitTarget.y - nuppi.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= NUPPI_EXIT_DIST) {
        nuppiPlaceInRoom(nuppiRandomRoom(state.roomId));
        return;
      }
      nuppi.x += (dx / dist) * NUPPI_SPEED * dtScale;
      nuppi.y += (dy / dist) * NUPPI_SPEED * dtScale;
    } else if (!nuppi.aware) {
      if (Math.hypot(state.x - nuppi.x, state.y - nuppi.y) < NUPPI_AWARE_DIST) {
        nuppi.aware      = true;
        nuppi.exitTarget = nuppiPickExit();
      } else {
        _nuppiIdleDrift(dtScale);
      }
    }

    nuppi.x = Math.max(120, Math.min(WORLD_W - 120, nuppi.x));
    nuppi.y = Math.max(120, Math.min(WORLD_H - 120, nuppi.y));
  }

  function _nuppiIdleDrift(dtScale) {
    nuppi.idleTimer -= 16 * dtScale;
    if (nuppi.idleTimer <= 0) {
      nuppi.idleAngle = Math.random() * Math.PI * 2;
      nuppi.idleTimer = 2000 + Math.random() * 3000;
    }
    nuppi.x += Math.cos(nuppi.idleAngle) * NUPPI_IDLE_DRIFT * dtScale;
    nuppi.y += Math.sin(nuppi.idleAngle) * NUPPI_IDLE_DRIFT * dtScale;
    nuppi.x  = Math.max(200, Math.min(WORLD_W - 200, nuppi.x));
    nuppi.y  = Math.max(200, Math.min(WORLD_H - 200, nuppi.y));
  }


  
 function drawNuppi(now) {
    if (nuppi.roomId !== state.roomId) return;
    const sec   = now / 1000;
    const bob   = Math.sin(nuppi.wobbleT * NUPPI_WOBBLE_FREQ) * NUPPI_WOBBLE_AMP;
    const pulse = 0.5 + 0.5 * Math.sin(sec * 1.3);
    const nx    = nuppi.x;
    const ny    = nuppi.y + bob;

    ctx.save();

   
   // Outer soft halo — drawn before sprite so it sits underneath
    const halo = ctx.createRadialGradient(nx, ny, 0, nx, ny, NUPPI_GLOW_R * 1.4);
    halo.addColorStop(0,   'rgba(255,180,220,0.38)');
    halo.addColorStop(0.4, 'rgba(220,140,200,0.18)');
    halo.addColorStop(0.8, 'rgba(180,100,200,0.06)');
    halo.addColorStop(1,   'transparent');
    ctx.globalAlpha = 0.7 + pulse * 0.25;
    ctx.fillStyle   = halo;
    ctx.beginPath();
    ctx.arc(nx, ny, NUPPI_GLOW_R * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Inner pink core glow
    const core = ctx.createRadialGradient(nx, ny, 0, nx, ny, NUPPI_GLOW_R * 0.55);
    core.addColorStop(0,   'rgba(255,200,240,0.55)');
    core.addColorStop(0.5, 'rgba(255,140,200,0.28)');
    core.addColorStop(1,   'transparent');
    ctx.globalAlpha = 0.55 + pulse * 0.35;
    ctx.fillStyle   = core;
    ctx.beginPath();
    ctx.arc(nx, ny, NUPPI_GLOW_R * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Sprite drawn last — sits on top of glow
    if (nuppiImg1.complete && nuppiImg1.naturalWidth > 0) {
      const ratio = nuppiImg1.naturalWidth / (nuppiImg1.naturalHeight || 1);
      const dw    = NUPPI_SIZE * 2;
      const dh    = dw / ratio;
      ctx.globalAlpha = 0.96;
      ctx.drawImage(nuppiImg1, nx - dw / 2, ny - dh / 2, dw, dh);
    } else {
      ctx.globalAlpha = 0.88;
      ctx.fillStyle   = 'rgba(220,180,200,0.7)';
      ctx.beginPath();
      ctx.arc(nx, ny, NUPPI_SIZE * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
 }

 
  function clickCheckNuppi(worldX, worldY) {
    if (performance.now() < nuppiPopCooldownUntil) return false;
    if (nuppi.roomId !== state.roomId) return false;
    const bob = Math.sin(nuppi.wobbleT * NUPPI_WOBBLE_FREQ * 1000) * NUPPI_WOBBLE_AMP;
    if (Math.hypot(worldX - nuppi.x, worldY - (nuppi.y + bob)) <= NUPPI_HIT_R) {
      openNuppiPop();
      return true;
    }
    return false;
  }
 
  function injectNuppiPop() {
    if (nuppiPopEl) return;
    nuppiPopEl = document.createElement('div');
    nuppiPopEl.id = 'nuppi-pop';
    nuppiPopEl.style.cssText = `
      display:none;position:fixed;inset:0;z-index:9260;
      align-items:center;justify-content:center;
      background:rgba(0,0,0,0);transition:background 0.3s ease;`;
    nuppiPopEl.innerHTML = `
      <div style="
        background:#06040a;border:1px solid rgba(220,180,220,0.18);
        border-radius:8px;padding:0 0 28px;
        width:min(340px,90vw);max-height:90vh;overflow-y:auto;
        text-align:center;font-family:'Georgia',serif;position:relative;
        box-shadow:0 0 50px rgba(30,10,40,0.95),0 0 20px rgba(180,100,200,0.12);">
        <div style="padding:28px 0 18px;display:flex;align-items:center;justify-content:center;">
          <img src="assets/img/wanderers/nuppi-2.png"
            style="max-width:88%;max-height:min(170px,36vw);object-fit:contain;
                   filter:drop-shadow(0 0 16px rgba(200,150,220,0.30));"/>
        </div>
        <button id="nuppi-pop-close" style="
          position:absolute;top:12px;right:14px;background:transparent;
          border:none;cursor:pointer;font-size:1rem;
          color:rgba(200,180,220,0.28);padding:4px 8px;">✕</button>
        <p id="nuppi-pop-en" style="
          font-size:clamp(.88rem,3.6vw,1.06rem);line-height:1.65;
          color:rgba(225,215,235,0.88);margin:0 24px 8px;
          letter-spacing:.04em;font-style:italic;"></p>
        <p id="nuppi-pop-jp" style="
          font-size:clamp(.8rem,3.2vw,.95rem);line-height:1.6;
          color:rgba(190,175,210,0.60);margin:0 24px 0;
          font-family:'Noto Sans JP',serif;letter-spacing:.06em;"></p>
      </div>`;
    document.body.appendChild(nuppiPopEl);
    document.getElementById('nuppi-pop-close').addEventListener('click', closeNuppiPop);
    nuppiPopEl.addEventListener('click', e => { if (e.target === nuppiPopEl) closeNuppiPop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nuppiPopOpen) closeNuppiPop(); });
  }
 
  function openNuppiPop() {
    const line = NUPPI_LINES[Math.floor(Math.random() * NUPPI_LINES.length)];
    
    const name = getBoohaFirstName();
    const en = name ? line.en.replace('{name}', name) : line.en.replace('{name}, ', '').replace('{name}、', '');
    const jp = name ? line.jp.replace('{name}', name) : line.jp.replace('{name}、', '').replace('{name}, ', '');
    document.getElementById('nuppi-pop-en').textContent = en;
   document.getElementById('nuppi-pop-jp').textContent = jp;
    
    nuppiPopOpen              = true;
    nuppi.frozen              = true;
    nuppiPopEl.style.display    = 'flex';
    nuppiPopEl.style.background = 'rgba(0,0,0,0.88)';
    state.clickTarget = null;
  }
 
  function closeNuppiPop() {
    nuppiPopOpen  = false;
    nuppi.frozen  = false;
    nuppiPopEl.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { if (!nuppiPopOpen) nuppiPopEl.style.display = 'none'; }, 300);
    nuppiPopCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
  }
 
  function isNuppiPopOpen() { return nuppiPopOpen; }


  
function drawObserver(now) {
  const roomId = getObserverRoomId();
  if (state.roomId !== roomId) return;
  const coord = window.KARASUKI_DATA.OBSERVER_COORDS[roomId];
  if (!coord) return;
  const sec   = now / 1000;
  const pulse = 0.85 + 0.15 * Math.sin(sec * 0.0015 * 1000);
  const W     = 140;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.drawImage(observerImg, coord.x - W / 2, coord.y - W, W, W * 1.2);
  ctx.restore();
}

  function stagePointToWorld(clientX, clientY) {
    // rect already reflects the CSS scale on all DPRs — fraction gives correct world coord.
    const rect = stage.getBoundingClientRect();
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top)  / rect.height;
    return clampToWorld(fx * WORLD_W, fy * WORLD_H);
  }

  function isNearPortal(p) { return state.roomId==="room_08"&&Math.hypot(p.x-PORTAL.x,p.y-PORTAL.y)<=PORTAL.r; }

  function handleInput(clientX, clientY) {
    startMusic();
    if (anyModalOpen()) return;
    if (isEntryDriftActive()) return;
    const now = performance.now();
    const p=stagePointToWorld(clientX,clientY);
    if(state.coordMode){dropPin(p.x,p.y);ripples.push({x:p.x,y:p.y,life:1});return;}
    // Interactive elements always respond immediately regardless of tap cooldown
    if(clickCheckOrbs(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});return;}
    if(isNearPortal(p)){openPortal();ripples.push({x:p.x,y:p.y,life:1});return;}
    if(clickCheckUtsuobaPortal(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});return;}
    if(clickCheckWanderers(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});return;}
    if(clickBonusTree(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});return;}
    
    if(clickCheckObserver(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});return;}
    if(clickCheckHappyHousePortal(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});return;}
    
    if(clickCheckNuppi(p.x,p.y)){ripples.push({x:p.x,y:p.y,life:1});return;}
 
      // AFTER all the early returns, BEFORE the movement logic:

    
    ripples.push({x:p.x, y:p.y, life:1});   // always show tap feedback
    
   // Block all movement taps until ghost has fully arrived
    if(state.moving) return;
    // Block if still in cooldown
    if(now < state.tapCooldownUntil) return;
    // Ignore taps too close to the ghost's current position
    if(Math.hypot(p.x - state.x, p.y - state.y) < TAP_MIN_DIST) return;
    // Longer cooldown if tapping near the same spot as last tap
    const nearLastTap = state.lastTapPos &&
      Math.hypot(p.x - state.lastTapPos.x, p.y - state.lastTapPos.y) < TAP_NEAR_DIST;
    state.clickTarget  = {x: p.x, y: p.y};
    state.lastTapPos   = {x: p.x, y: p.y};
    state.tapCooldownUntil = now + (nearLastTap ? TAP_NEAR_COOLDOWN_MS : TAP_COOLDOWN_MS);
    
  }

  function bindInput() {
    let lastTouchEnd = 0;
    
    stage.addEventListener("mousemove",(e)=>{ if(!state.coordMode)return; const p=stagePointToWorld(e.clientX,e.clientY); const el=document.getElementById("coord-xy"); if(el)el.textContent=`${Math.round(p.x)}, ${Math.round(p.y)}`; });
    stage.addEventListener("click",(e)=>{ if(performance.now() - lastTouchEnd < 500) return; handleInput(e.clientX,e.clientY); });
    stage.addEventListener("touchend",(e)=>{ if(!e.changedTouches.length)return; lastTouchEnd=performance.now(); const t0=e.changedTouches[0]; handleInput(t0.clientX,t0.clientY); e.preventDefault(); },{passive:false});
  
    document.addEventListener("keydown",(e)=>{ if(e.key==="Escape")closePortal(); });
    document.addEventListener("click",startMusic,{once:true});
    document.addEventListener("touchend",startMusic,{once:true,passive:true});
  }

  /* ═══════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════ */
  function init() {
    injectStyles(); buildApp(); KarasukiAtmos.init(stage);
    fitStage(); resizeCanvas();
    initOrbs(); processWrongOrbReturn(); renderInitialRoom(); initWanderers(); initNuppi(); bindInput();
    
    window.addEventListener("resize",()=>{ fitStage(); resizeCanvas(); });
    requestAnimationFrame(tick);
  }

  // The save is keyed on booha_userid, which token.js writes only after its
  // async verify returns. init() reads the quest, wanderers and vitality
  // immediately, so it must not run before identity lands. The page is
  // already hidden by token-checking until then.
  if (window.BOOHA_READY) init();
  else document.addEventListener('booha:ready', init, { once: true });



  Object.defineProperty(window, 'b_3910', {
    value: () => {
      if (typeof injectDevPanel === 'function') injectDevPanel();
    },
    writable: false,
    configurable: false,
    enumerable: false
  });

})();
