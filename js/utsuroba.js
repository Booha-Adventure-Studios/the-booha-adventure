
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
  const PAGE_ID = 'utsuroba';

  function isProfileEntry() {
    try { return new URLSearchParams(window.location.search).get('from') === 'profile'; }
    catch (_) { return false; }
  }

  function worldGateOpen() {
    return window.BoohaUnlockSystem &&
      typeof BoohaUnlockSystem.isWeeklyWorldGateOpen === 'function'
      ? BoohaUnlockSystem.isWeeklyWorldGateOpen()
      : false;
  }

  function showLockedWorld() {
    const style = document.createElement('style');
    style.textContent = `
      html,body{margin:0;min-height:100%;background:#050308;color:#f7efff;}
      body{display:grid;place-items:center;font-family:Georgia,'Times New Roman',serif;}
      .world-lock{width:min(440px,calc(100% - 36px));padding:34px 26px 30px;border:1px solid rgba(216,168,255,.32);border-radius:20px;background:linear-gradient(155deg,rgba(40,18,55,.92),rgba(8,5,15,.96));box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 36px rgba(150,75,210,.12);text-align:center;}
      .world-lock-mark{font-size:2.2rem;color:#d8a8ff;text-shadow:0 0 24px rgba(216,168,255,.7);}
      .world-lock h1{margin:12px 0 6px;font-size:clamp(1.35rem,5vw,1.9rem);font-weight:400;letter-spacing:.04em;}
      .world-lock-jp{margin:0;color:#b9a9c8;font-size:.9rem;letter-spacing:.12em;}
      .world-lock p{margin:22px auto 0;max-width:31em;color:#c9bad5;font-size:.92rem;line-height:1.65;}
      .world-lock p small{display:block;margin-top:7px;color:#81718f;font-size:.86em;}
      .world-lock-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:24px;}
      .world-lock-actions a{padding:9px 15px;border:1px solid rgba(216,168,255,.42);border-radius:999px;color:#f5eaff;text-decoration:none;font-size:.78rem;letter-spacing:.04em;background:rgba(216,168,255,.08);}
      .world-lock-actions a:hover,.world-lock-actions a:focus-visible{border-color:#d8a8ff;background:rgba(216,168,255,.18);outline:none;}
    `;
    document.head.appendChild(style);
    document.body.innerHTML = '<main class="world-lock" aria-labelledby="world-lock-title"><div class="world-lock-mark" aria-hidden="true">✦</div><h1 id="world-lock-title">Utsuroba</h1><p class="world-lock-jp">うつろば</p><p>This room opens after the 9 games for this week.<small>今週の9つのゲームを終えると、この部屋がひらきます。</small></p><div class="world-lock-actions"><a href="profile.html">Output profile</a><a href="maze.html">Back to Maze</a></div></main>';
  }

  function saveCurrentRoom() {
    try {
      const pageState = window.BoohaAdventure && BoohaAdventure.pageState;
      if (pageState && typeof pageState.setSpawnPoint === 'function') {
        pageState.setSpawnPoint({ roomId: state.roomId, spawnId: state.spawnId }, PAGE_ID);
      }
    } catch (_) {}
  }

  function restoreProfileRoom() {
    if (!isProfileEntry()) return;
    try {
      const params = new URLSearchParams(window.location.search);
      /* An explicit room is a deliberate landing point (for example the
         profile's "back to Utsuroba" button). Only resume the last room when
         the profile doorway did not specify one. */
      if (params.has('room')) return;
      const pageState = window.BoohaAdventure && BoohaAdventure.pageState;
      const saved = pageState && typeof pageState.getSpawnPoint === 'function'
        ? pageState.getSpawnPoint(PAGE_ID)
        : null;
      if (saved && DATA.rooms[saved.roomId]) {
        state.roomId = saved.roomId;
        state.spawnId = saved.spawnId || 'default';
      }
    } catch (_) {}
  }

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
// Routed through BoohaSaveFile, never localStorage directly. The bare
  // 'booha_save' key is unscoped: the drifter world lived on the orphaned
  // pre-epoch blob, shared by every student using the device.
  function loadSave() {
    try {
      const d = (window.BoohaAdventure && BoohaAdventure.save)
        ? BoohaAdventure.save.load()
        : {};
      return migrateUtsurobaSave(d);
    } catch(e) { console.error('[Utsuroba] Save read failed:', e); }
    return { utsuroba:{}, karasuki:{}, weekly:{} };
  }

  // Returns true only if the write landed. BoohaSaveFile refuses to write
  // when no student is identified, and dispatches the failure banner itself.
  function writeSave(data) {
    try {
      if (window.BoohaAdventure && BoohaAdventure.save) return BoohaAdventure.save.save(data);
      console.error('[Utsuroba] Save system unavailable — progress NOT written.');
      return false;
    } catch(e) {
      console.error('[Utsuroba] Save write failed:', e);
      return false;
    }
  }

  function curriculumWeekKey(cw) {
    if (!cw || typeof cw !== 'object') return String(cw == null ? '' : cw);
    return `${cw.monthSlug || cw.month || 'week'}-w${cw.weekNumber || 0}`;
  }

  function seedToUint32(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
    const text = String(seed == null ? '' : seed);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
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
    if (!data.utsuroba.readingJournal) {
      data.utsuroba.readingJournal = { entries: [] };
      dirty = true;
    } else if (!Array.isArray(data.utsuroba.readingJournal.entries)) {
      data.utsuroba.readingJournal.entries = [];
      dirty = true;
    }
    data.utsuroba.readingJournal.entries.forEach(entry => {
      if (!Number.isInteger(entry.masteryLevel)) { entry.masteryLevel = 0; dirty = true; }
      if (!Number.isInteger(entry.guidedSessions)) { entry.guidedSessions = 0; dirty = true; }
      if (!Number.isInteger(entry.independentSessions)) { entry.independentSessions = 0; dirty = true; }
      if (!Number.isInteger(entry.reviewCount)) { entry.reviewCount = 1; dirty = true; }
    });
    if (!data.utsuroba.wordCabinet) {
      data.utsuroba.wordCabinet = { entries: [] };
      dirty = true;
    } else if (!Array.isArray(data.utsuroba.wordCabinet.entries)) {
      data.utsuroba.wordCabinet.entries = [];
      dirty = true;
    }
    data.utsuroba.wordCabinet.entries.forEach(entry => {
      if (!Number.isInteger(entry.reviewCount)) { entry.reviewCount = 0; dirty = true; }
      if (!Number.isInteger(entry.attempts)) { entry.attempts = 0; dirty = true; }
      if (!Number.isInteger(entry.misses)) { entry.misses = 0; dirty = true; }
      if (!Number.isFinite(entry.nextReviewAt)) { entry.nextReviewAt = 0; dirty = true; }
    });
    if (!data.utsuroba.readingEchoes || typeof data.utsuroba.readingEchoes !== 'object') {
      data.utsuroba.readingEchoes = {};
      dirty = true;
    }
    if (!data.utsuroba.readingOnboarding || typeof data.utsuroba.readingOnboarding !== 'object') {
      data.utsuroba.readingOnboarding = { seen: false, calibration: null };
      dirty = true;
    } else {
      if (typeof data.utsuroba.readingOnboarding.seen !== 'boolean') {
        data.utsuroba.readingOnboarding.seen = false;
        dirty = true;
      }
      if (!['guided', 'independent', null].includes(data.utsuroba.readingOnboarding.calibration)) {
        data.utsuroba.readingOnboarding.calibration = null;
        dirty = true;
      }
    }

    Object.values(data.utsuroba.drifters).forEach(record => {
      if (record && record.wrongWeek && typeof record.wrongWeek === 'object') {
        record.wrongWeek = curriculumWeekKey(record.wrongWeek);
        dirty = true;
      }
    });

    /* ── Weekly drifter tracking (Pass 1 fix, see
       claude/utsuroba-audit-and-pass-plan.md) ───────────────
       This block used to WIPE every drifter's completed
       memories and readingEchoes on every curriculum-week
       rollover. But the Three Echoes convergence needs
       ks + nto + cg restored at the same time, only one quest
       can be active at once, and every current drifter has
       memoryCount:1 — so a weekly wipe never unlocked new
       content, it only forced re-doing the same one-shot story
       and made convergence nearly impossible to reach before
       progress reset out from under a kid. Drifter memories and
       readingEchoes are now permanent once earned. We still
       stamp driftersWeekKey (unused for resets now) so a future
       drifter with memoryCount > 1 can opt into a real weekly
       rotation without anyone touching this block again.
       Only rolls when CALENDAR gives an authoritative week —
       never guess on an unknown week. */
    try {
      if (window.CALENDAR?.getCurrentCurriculumWeek) {
        const cw = CALENDAR.getCurrentCurriculumWeek();
        const wk = curriculumWeekKey(cw);
        if (data.utsuroba.driftersWeekKey !== wk) {
          data.utsuroba.driftersWeekKey = wk;
          dirty = true;
        }
      }
    } catch (_) {}
    
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
    if (q && q.active) {
      const questDrifter = DATA.drifters.find(d => d.id === q.active);
      if (questDrifter && questDrifter.episodeId && q.episodeId !== questDrifter.episodeId) {
        q.episodeId = questDrifter.episodeId;
        if (!Number.isInteger(q.trailIndex)) q.trailIndex = 0;
        if (!Array.isArray(q.collectedFragments)) q.collectedFragments = [];
        if (!Number.isInteger(q.mechanicIndex)) q.mechanicIndex = Number.isInteger(q.theatreIndex) ? q.theatreIndex : 0;
        dirty = true;
      }
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
    const a = arr.slice(); let s = seedToUint32(seed);
    for (let i = a.length-1; i > 0; i--) {
      s = (s*1664525+1013904223) & 0xffffffff;
      const j = Math.abs(s) % (i+1); [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }
  
  function getWeekSeed() {
    if (window.CALENDAR?.getCurrentCurriculumWeek) {
      return curriculumWeekKey(CALENDAR.getCurrentCurriculumWeek());
    }
    // calendar.js missing or API changed — fail LOUDLY, never guess the week
    const msg = '[Utsuroba] calendar.js is not loaded — cannot compute week seed.';
    console.error(msg);
    document.body.insertAdjacentHTML('beforeend',
      '<div style="position:fixed;inset:0;display:grid;place-items:center;' +
      'background:#111;color:#fff;font:16px sans-serif;z-index:9999;text-align:center">' +
      'Something went wrong loading this world.<br>Please tell your teacher! 🙏</div>');
    throw new Error(msg);
  }

  function dialogueVariantFor(drifter) {
    const variants = window.UTSUROBA_DIALOGUE?.[drifter && drifter.id];
    if (!Array.isArray(variants) || !variants.length) return null;
    const seed = `${getWeekSeed()}:drifter-dialogue:${drifter.id}`;
    return variants[seedToUint32(seed) % variants.length];
  }

  function dialogueLineFor(value) {
    if (typeof value === 'string') return { en: value, jpHTML: '' };
    if (!value || typeof value !== 'object') return { en: '', jpHTML: '' };
    const jp = value.jp;
    let jpHTML = '';
    if (jp && typeof jp === 'object') {
      jpHTML = window.UtsuFurigana?.sentence
        ? window.UtsuFurigana.sentence(jp.text, jp.readings)
        : escapeHTML(jp.text);
    } else if (jp) {
      jpHTML = escapeHTML(jp);
    }
    return { en: String(value.en || ''), jpHTML };
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
  function activateQuest(id) {
    const memIdx = pickRandomMemory(id); if (memIdx === null) return null;
    const drifter = DATA.drifters.find(d => d.id === id);
    const data   = loadSave();
    if (!data.weekly) data.weekly = {};
    data.weekly.drifterQuest = {
      active           : id,
      state            : 'accepted',
      memIdx,
      episodeId        : drifter && drifter.episodeId ? drifter.episodeId : null,
      readingState     : 'locked',
      trailIndex       : 0,
      collectedFragments: [],
      theatreIndex     : 0,
      mechanicIndex    : 0,
      collectedMemoryId: null,
      orbIsCorrect     : false,
    };
    const ok = writeSave(data);
    invalidateQuestCache();
    if (ok && window.BoohaSync) BoohaSync.checkpoint('adventure');
    return ok ? data.weekly.drifterQuest : null;
  }

  function completeMemory(id, memIdx) {
    const data = loadSave();
    if (!data.utsuroba.drifters[id]) data.utsuroba.drifters[id] = { completed: [] };
    if (!data.utsuroba.drifters[id].completed.includes(memIdx))
      data.utsuroba.drifters[id].completed.push(memIdx);
    const quest = data.weekly?.drifterQuest;
    if (quest && quest.active === id && quest.memIdx === memIdx && quest.episodeId) {
      const journal = data.utsuroba.readingJournal || { entries: [] };
      const entries = Array.isArray(journal.entries) ? journal.entries : [];
      const existing = entries.find(entry => entry.episodeId === quest.episodeId);
      if (existing) {
        existing.completedAt = Date.now();
        existing.reviewCount = (existing.reviewCount || 1) + 1;
        existing.drifterId = id;
        existing.memIdx = memIdx;
      } else {
        entries.unshift({
          episodeId: quest.episodeId,
          drifterId: id,
          memIdx,
          completedAt: Date.now(),
          reviewCount: 1,
          masteryLevel: 0,
          guidedSessions: 0,
          independentSessions: 0,
        });
      }
      const journalEntry = existing || entries[0];
      if (journalEntry && quest.postcard && quest.postcard.text) journalEntry.postcard = quest.postcard;
      if (existing) {
        if (!Number.isInteger(existing.masteryLevel)) existing.masteryLevel = 0;
        if (!Number.isInteger(existing.guidedSessions)) existing.guidedSessions = 0;
        if (!Number.isInteger(existing.independentSessions)) existing.independentSessions = 0;
      }
      journal.entries = entries.slice(0, 12);
      data.utsuroba.readingJournal = journal;
      const episode = window.UTSUROBA_EPISODES?.[quest.episodeId];
      if (episode && Array.isArray(episode.vocabulary)) {
        const cabinet = data.utsuroba.wordCabinet || { entries: [] };
        const words = Array.isArray(cabinet.entries) ? cabinet.entries : [];
        episode.vocabulary.slice(0, 8).forEach(item => {
          if (!item?.word || !item.definition || !item.definitionJP) return;
          const key = `${quest.episodeId}:${item.word}`;
          if (!words.some(word => word.key === key)) {
            words.unshift({
              key,
              episodeId: quest.episodeId,
              word: item.word,
              definition: item.definition,
              definitionJP: item.definitionJP,
              discoveredAt: Date.now(),
              reviewCount: 0,
              attempts: 0,
              misses: 0,
              nextReviewAt: 0,
            });
          }
        });
        cabinet.entries = words.slice(0, 60);
        data.utsuroba.wordCabinet = cabinet;
      }
      data.utsuroba.readingEchoes[quest.episodeId] = {
        drifterId: id,
        restoredAt: Date.now(),
      };
    }
    if (data.weekly) data.weekly.drifterQuest = null;
    const ok = writeSave(data);
    invalidateQuestCache();
    if (ok && window.BoohaSync) BoohaSync.checkpoint('adventure');
    return ok;
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

  /* Round 2 Pass 13 (celebration dance): three dedicated dance-pose
     frames, swapped on a beat during startCelebration() instead of
     just spinning the base sprite. Measured each PNG's own opaque
     content as a fraction of its canvas (booha_ghost.png: ~65% of a
     1024×1024 square; the three dance frames: ~80-84% of their own,
     slightly taller-than-wide canvases, since the raised/spread poses
     were cropped tight) — contentScale below shrinks the destination
     draw box just enough that the character reads as the same size in
     every pose instead of visibly growing when a dance frame swaps in
     (the "these files' ghosts are a tad bigger" the user flagged).
     offsetX/offsetY (a few percent of the frame, also measured from
     each PNG's content bounding box) re-centers each pose on the same
     point booha_ghost.png centers on, so the swap doesn't nudge the
     ghost sideways either. */
  const danceArmsUpImg = new Image(); danceArmsUpImg.src = './assets/img/booha_ghost_dance_arms_up.png';
  const danceSwayImg   = new Image(); danceSwayImg.src   = './assets/img/booha_ghost_dance_sway.png';
  const danceWaveImg   = new Image(); danceWaveImg.src   = './assets/img/booha_ghost_dance_wave.png';
  const DANCE_FRAMES = [
    { img: danceArmsUpImg, contentScale: 0.817, offsetX: -0.007, offsetY: -0.026 },
    { img: danceSwayImg,   contentScale: 0.801, offsetX:  0.009, offsetY: -0.015 },
    { img: danceWaveImg,   contentScale: 0.811, offsetX:  0.009, offsetY: -0.009 },
  ];
  const music = new Audio('./assets/audio/utsuroba-music.mp3');
  music.loop = true;
  music.volume = 0.65;
  const booDance = new Audio('./assets/audio/boo-dance.mp3');
  booDance.loop = true;
  booDance.volume = 0.72;

  function stopBooDance() {
    try { booDance.pause(); booDance.currentTime = 0; } catch (_) {}
  }

  /* ── small SFX (Pass 1) — no drifter voice, just light feedback
     for typing/collecting, per house convention (ding.mp3 is the
     same "correct/success" cue used across the curriculum games). ── */
  function playChime(pitch = 1) {
    try {
      const a = new Audio('./assets/audio/ding.mp3');
      a.volume = 0.55;
      a.playbackRate = pitch;
      a.play().catch(() => {});
    } catch (_) {}
  }
  function playCelebrationChime() {
    /* Round 2 Pass 3: a memory handed back to its drifter now gets its
       own distinct three-note rise (UtsuSfx.giveMemory) instead of the
       same ding.mp3 the reading challenge's correct-answer feel and
       the orb pickup also use. Falls back to the old two-ding chime if
       utsu-sfx.js somehow isn't loaded. */
    if (window.UtsuSfx) { window.UtsuSfx.giveMemory(); return; }
    playChime(1);
    setTimeout(() => playChime(1.28), 150);
  }

  /* Tiny WebAudio blip for the dialogue typewriter — a real audio
     file per character would be heavy; a short oscillator tone is
     the standard, cheap way to give text reveal a "typing" feel. */
  let typeAudioCtx = null;
  function playTypeTick() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!typeAudioCtx) typeAudioCtx = new AC();
      if (typeAudioCtx.state === 'suspended') typeAudioCtx.resume().catch(() => {});
      const now  = typeAudioCtx.currentTime;
      const osc  = typeAudioCtx.createOscillator();
      const gain = typeAudioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 560 + Math.random() * 90;
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      osc.connect(gain); gain.connect(typeAudioCtx.destination);
      osc.start(now); osc.stop(now + 0.05);
    } catch (_) {}
  }

  let app, stage, canvas, ctx, roomLayer, echoLayer, echoesTrackerEl;
  let coordToggle, coordReadout, pinLog, readingJournalButton, readingChallengeButton;
  let exitPopOverlay = null, exitPopCooldownUntil = 0;
  let drifterPanel = null, drifterPanelOpen = false, drifterPanelCooldown = 0;
  let readingJournalOverlay = null, readingJournalOpen = false;
  let weeklyChallengeOverlay = null, weeklyChallengeOpen = false;
  let modalPreviousFocus = null;
  let convergenceOverlay = null, convergenceOpen = false;
  let gardenOverlay = null, gardenOpen = false;
  let utsuProfilePortal = null;
  let utsuProfileOverlay = null, utsuProfileOpen = false;

  let drifterFadeStart = 0;
  let _lastWrongId     = '';

  /* The user asked for the celebration dance to run "00:11" — the same
     length as boo-dance.mp3 (~10.6s measured). DANCE_MS is the energetic
     phase; DANCE_SETTLE_MS is the wind-down that follows it (shared with
     the settleEase calc in drawFrame() so the two can't drift apart);
     together they land on 11000ms. THANK_YOU_PANEL_MS is unrelated to
     the dance itself — just how long the post-celebration card stays up
     before auto-dismissing. */
  const DANCE_MS           = 10100;
  const DANCE_SETTLE_MS    = 900;
  const THANK_YOU_PANEL_MS = 7200;

  const THANK_YOU = {
    ks:  { en:"Thank you… don't slow me down again." },
    nto: { en:"Thank you! You're the best!" },
    cg:  { en:"Thank you… I really mean it." },
  };
  const WAITING_LINES = {
    ks:  { en:"Hurry up, you little blob." },
    nto: { en:"See you soon, cutie." },
    cg:  { en:"I'll be waiting here… don't take too long." },
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
      #utsuroba-memory-echo-layer{position:absolute;inset:0;z-index:8;pointer-events:none;overflow:hidden;}
      .utsu-memory-echo{position:absolute;transform:translate(-50%,-50%);width:110px;height:110px;padding:0;border:0;background:transparent;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 0 16px rgba(255,203,117,.34));}
      .utsu-memory-echo .echo-aura{position:absolute;inset:18px;border-radius:50%;background:radial-gradient(circle,rgba(255,230,150,.3),rgba(255,203,117,.08) 42%,transparent 70%);animation:echoBreathe 2.8s ease-in-out infinite;}
      .utsu-memory-echo .echo-icon{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:31px;line-height:1;color:#ffe7a8;text-shadow:0 0 14px #ffcb75;animation:echoFloat 2.2s ease-in-out infinite;}
      .utsu-memory-echo .echo-label{position:absolute;left:50%;top:calc(100% - 7px);transform:translateX(-50%);min-width:130px;padding:5px 8px;border:1px solid rgba(255,203,117,.35);border-radius:6px;background:rgba(18,7,28,.86);color:#ffe7b2;text-align:center;font:700 10px/1.2 Georgia,serif;white-space:nowrap;opacity:.88;}
      .utsu-memory-echo .echo-label small{display:block;margin-top:3px;color:rgba(255,231,178,.6);font-size:9px;font-weight:400;}
      .utsu-memory-echo.motif-candy{filter:drop-shadow(0 0 16px rgba(255,145,175,.38));}
      .utsu-memory-echo.motif-candy .echo-aura{background:radial-gradient(circle,rgba(255,167,194,.3),rgba(255,126,180,.08) 42%,transparent 70%);}
      .utsu-memory-echo.motif-candy .echo-icon{color:#ffb4d0;text-shadow:0 0 14px #ff70b0;}
      .utsu-memory-echo.motif-reflection{filter:drop-shadow(0 0 16px rgba(145,210,255,.34));}
      .utsu-memory-echo.motif-reflection .echo-aura{background:radial-gradient(circle,rgba(145,210,255,.3),rgba(100,170,255,.08) 42%,transparent 70%);}
      .utsu-memory-echo.motif-reflection .echo-icon{color:#b8e4ff;text-shadow:0 0 14px #7dc8ff;}
      .utsu-memory-echo.motif-thorn{filter:drop-shadow(0 0 16px rgba(217,80,58,.4));}
      .utsu-memory-echo.motif-thorn .echo-aura{background:radial-gradient(circle,rgba(217,110,80,.32),rgba(150,50,30,.08) 42%,transparent 70%);}
      .utsu-memory-echo.motif-thorn .echo-icon{color:#e88a6e;text-shadow:0 0 14px #d9503a;}
      .utsu-memory-echo.motif-ribbon{filter:drop-shadow(0 0 16px rgba(217,168,255,.36));}
      .utsu-memory-echo.motif-ribbon .echo-aura{background:radial-gradient(circle,rgba(225,180,255,.3),rgba(160,110,220,.08) 42%,transparent 70%);}
      .utsu-memory-echo.motif-ribbon .echo-icon{color:#e4c2ff;text-shadow:0 0 14px #d9a8ff;}
      @keyframes echoBreathe{0%,100%{transform:scale(.82);opacity:.55}50%{transform:scale(1.12);opacity:1}}
      @keyframes echoFloat{0%,100%{transform:translate(-50%,-48%)}50%{transform:translate(-50%,-58%)}}
      .utsu-memory-gate{position:absolute;transform:translate(-50%,-50%);width:140px;height:120px;padding:0;border:0;background:transparent;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 0 20px rgba(216,168,255,.48));}
      .utsu-memory-gate .gate-ring{position:absolute;left:50%;top:50%;width:72px;height:72px;transform:translate(-50%,-50%) rotate(45deg);border:2px solid rgba(216,168,255,.78);box-shadow:0 0 24px rgba(216,168,255,.48),inset 0 0 22px rgba(216,168,255,.18);animation:gatePulse 2.6s ease-in-out infinite;}
      .utsu-memory-gate .gate-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#f1d9ff;font-size:28px;text-shadow:0 0 18px #d8a8ff;animation:echoFloat 2.2s ease-in-out infinite;}
      .utsu-memory-gate .gate-label{position:absolute;left:50%;top:calc(100% - 5px);transform:translateX(-50%);min-width:150px;padding:5px 8px;border:1px solid rgba(216,168,255,.42);border-radius:6px;background:rgba(18,7,28,.9);color:#f1d9ff;text-align:center;font:700 10px/1.2 Georgia,serif;white-space:nowrap;}
      .utsu-memory-gate .gate-label small{display:block;margin-top:3px;color:rgba(241,217,255,.6);font-size:9px;font-weight:400;}
      @keyframes gatePulse{0%,100%{transform:translate(-50%,-50%) rotate(45deg) scale(.86);opacity:.65}50%{transform:translate(-50%,-50%) rotate(45deg) scale(1.08);opacity:1}}
      .utsu-profile-portal{position:absolute;transform:translate(-50%,-50%);width:118px;height:118px;padding:0;border:0;background:transparent;pointer-events:auto;cursor:pointer;color:#f1d9ff;filter:drop-shadow(0 0 18px rgba(216,168,255,.42));}
      .utsu-profile-portal::before{content:"";position:absolute;left:50%;top:43%;width:86px;height:86px;transform:translate(-50%,-50%);border:1px solid rgba(216,168,255,.48);border-radius:50%;background:radial-gradient(circle,rgba(216,168,255,.2),rgba(95,55,140,.08) 50%,transparent 72%);box-shadow:0 0 24px rgba(216,168,255,.34);animation:utsuProfilePortalPulse 2.8s ease-in-out infinite;}
      .utsu-profile-portal img{position:absolute;left:50%;top:43%;width:72px;height:72px;object-fit:contain;transform:translate(-50%,-50%);filter:drop-shadow(0 0 5px #f1d9ff) drop-shadow(0 0 15px #d8a8ff);animation:utsuProfilePortalFloat 2.6s ease-in-out infinite;}
      @keyframes utsuProfilePortalPulse{0%,100%{transform:translate(-50%,-50%) scale(.86);opacity:.58}50%{transform:translate(-50%,-50%) scale(1.08);opacity:1}}
      @keyframes utsuProfilePortalFloat{0%,100%{transform:translate(-50%,-48%)}50%{transform:translate(-50%,-58%)}}
      .utsu-profile-pop-overlay{display:none;position:fixed;inset:0;z-index:9400;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:rgba(0,0,0,.86);}
      .utsu-profile-pop-overlay.is-open{display:flex;animation:utsuProfileOverlayIn .22s ease-out both;}
      .utsu-profile-pop-box{position:relative;width:min(440px,94vw);max-height:88vh;overflow:auto;padding:38px 30px 28px;box-sizing:border-box;text-align:center;border:1px solid rgba(216,168,255,.7);border-radius:14px;background:linear-gradient(155deg,#211332,#0c0713 72%);box-shadow:0 0 0 1px rgba(216,168,255,.16),0 0 42px rgba(150,75,210,.5),0 0 100px rgba(75,30,110,.34),inset 0 0 50px rgba(0,0,0,.5);font-family:Georgia,serif;animation:utsuProfilePopIn .32s cubic-bezier(.22,.8,.36,1) both;}
      .utsu-profile-pop-box::before{content:"";position:absolute;left:0;top:0;width:100%;height:2px;background:linear-gradient(90deg,transparent,#d8a8ff,#f1d9ff,#d8a8ff,transparent);background-size:200% 100%;animation:utsuProfileShimmer 2.6s ease-in-out infinite;}
      .utsu-profile-pop-box::after{content:"";position:absolute;inset:12px;border:1px solid rgba(216,168,255,.18);pointer-events:none;}
      .utsu-profile-pop-close{position:absolute;right:7px;top:5px;width:40px;height:40px;border:0;background:transparent;color:rgba(255,255,255,.55);font-size:18px;cursor:pointer;z-index:2;}
      .utsu-profile-pop-close:hover,.utsu-profile-pop-close:focus-visible{color:#fff;outline:none;}
      .utsu-profile-pop-icon{position:relative;width:104px;height:104px;margin:0 auto 12px;display:grid;place-items:center;z-index:1;}
      .utsu-profile-pop-icon::before{content:"";position:absolute;inset:-14%;border-radius:50%;background:radial-gradient(ellipse,rgba(216,168,255,.4),transparent 70%);filter:blur(8px);animation:utsuProfilePortalPulse 2.8s ease-in-out infinite;}
      .utsu-profile-pop-icon img{position:relative;width:92px;height:92px;object-fit:contain;filter:drop-shadow(0 0 6px #f1d9ff) drop-shadow(0 0 18px #d8a8ff);}
      .utsu-profile-pop-eyebrow{position:relative;margin:0 0 12px;color:#d8a8ff;font:800 .66rem/1.4 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;}
      .utsu-profile-pop-box h2{position:relative;margin:0 0 3px;color:#f1d9ff;font-size:clamp(1.1rem,3.6vw,1.35rem);letter-spacing:.05em;text-shadow:0 0 16px rgba(216,168,255,.6);}
      .utsu-profile-pop-title-jp{position:relative;margin:0 0 17px;color:rgba(241,217,255,.72);font-size:.82rem;letter-spacing:.08em;}
      .utsu-profile-pop-copy{position:relative;margin:0 0 6px;color:#fff4ff;font-size:.92rem;line-height:1.6;}
      .utsu-profile-pop-copy small{display:block;margin-top:4px;color:rgba(245,232,255,.62);font-size:.84em;}
      .utsu-profile-pop-actions{position:relative;display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-top:20px;z-index:1;}
      .utsu-profile-pop-actions button{min-width:108px;min-height:44px;padding:8px 18px;border:1px solid rgba(216,168,255,.65);border-radius:7px;background:rgba(216,168,255,.12);color:#f5eaff;font:600 .83rem/1.25 Georgia,serif;cursor:pointer;transition:background .18s,border-color .18s,transform .18s;}
      .utsu-profile-pop-actions button span{display:block;margin-top:3px;font-size:.74em;opacity:.8;}
      .utsu-profile-pop-actions button:hover,.utsu-profile-pop-actions button:focus-visible{border-color:#fff;background:rgba(216,168,255,.25);transform:translateY(-1px);outline:none;}
      .utsu-profile-pop-actions button:last-child{border-color:rgba(255,255,255,.24);background:transparent;color:rgba(255,255,255,.72);}
      @keyframes utsuProfileOverlayIn{from{background:rgba(0,0,0,0)}to{background:rgba(0,0,0,.86)}}
      @keyframes utsuProfilePopIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
      @keyframes utsuProfileShimmer{0%,100%{background-position:200% 0}50%{background-position:0 0}}
      @media (prefers-reduced-motion:reduce){.utsu-profile-portal::before,.utsu-profile-portal img,.utsu-profile-pop-icon::before,.utsu-profile-pop-box::before{animation:none;}}
      .utsu-memory-garden{position:absolute;transform:translate(-50%,-50%);width:164px;height:138px;padding:0;border:0;background:transparent;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 0 22px rgba(159,228,186,.5));}
      .utsu-memory-garden .garden-bloom{position:absolute;left:50%;top:44%;width:82px;height:60px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(ellipse,rgba(159,228,186,.9) 0 7%,rgba(104,212,178,.48) 18%,rgba(216,168,255,.28) 42%,transparent 72%);animation:gardenBreathe 3.4s ease-in-out infinite;}
      .utsu-memory-garden .garden-spark{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);color:#dcffe8;font-size:31px;text-shadow:0 0 18px #9fe4ba;animation:gardenSpark 2.4s ease-in-out infinite;}
      .utsu-memory-garden .garden-label{position:absolute;left:50%;top:calc(100% - 8px);transform:translateX(-50%);min-width:154px;padding:5px 8px;border:1px solid rgba(159,228,186,.48);border-radius:6px;background:rgba(7,25,22,.92);color:#d7ffe3;text-align:center;font:700 10px/1.2 Georgia,serif;white-space:nowrap;}
      .utsu-memory-garden .garden-label small{display:block;margin-top:3px;color:rgba(215,255,227,.62);font-size:9px;font-weight:400;}
      @keyframes gardenBreathe{0%,100%{transform:translate(-50%,-50%) scale(.84);opacity:.7}50%{transform:translate(-50%,-50%) scale(1.12);opacity:1}}
      @keyframes gardenSpark{0%,100%{transform:translate(-50%,-50%) rotate(-5deg) scale(.9)}50%{transform:translate(-50%,-57%) rotate(6deg) scale(1.08)}}
      #utsuroba-memory-convergence{position:fixed;inset:0;z-index:9350;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(4,0,12,.88);font-family:Georgia,serif;}
      .memory-convergence-card{position:relative;width:min(760px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:clamp(22px,4vw,36px);box-sizing:border-box;border:1px solid rgba(216,168,255,.48);border-radius:16px;background:linear-gradient(160deg,#171020,#0b0712 68%,#130b1b);box-shadow:0 0 75px rgba(100,30,160,.38);animation:utsuPopIn .22s ease-out;}
      .memory-convergence-close{position:absolute;right:14px;top:12px;background:transparent;border:0;color:rgba(255,255,255,.55);font-size:18px;cursor:pointer;padding:8px;}
      .memory-convergence-eyebrow{color:#d8a8ff;font:700 11px/1.4 monospace;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px;}
      .memory-convergence-card h2{margin:0 42px 6px;color:#fff4ff;font-size:clamp(1.35rem,3vw,2rem);}
      .memory-convergence-card h2 span{display:block;color:rgba(255,220,255,.58);font-size:.5em;font-weight:400;margin-top:4px;}
      .memory-convergence-intro{margin:0 0 16px;color:#f5e8ff;font-size:.88rem;line-height:1.5;}
      .memory-convergence-intro small{display:block;margin-top:3px;color:rgba(245,232,255,.54);font-size:.82em;}
      .memory-convergence-map{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 18px;}
      .memory-convergence-memory{padding:10px 8px;border:1px solid rgba(216,168,255,.24);border-radius:8px;background:rgba(255,255,255,.045);}
      .memory-convergence-memory strong{display:block;color:#fff;font-size:.77rem;line-height:1.3;}
      .memory-convergence-memory small{display:block;margin-top:4px;color:rgba(255,231,178,.58);font-size:.66rem;line-height:1.3;}
      .memory-convergence-stage{margin:0 0 10px;color:#d8a8ff;font-size:.76rem;font-weight:700;line-height:1.4;}
      .memory-convergence-stage small{display:block;margin-top:3px;color:rgba(216,168,255,.58);font-size:.9em;font-weight:400;}
      .memory-convergence-clue-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:0 0 17px;}
      .memory-convergence-clue{padding:10px 9px;border:1px solid rgba(216,168,255,.27);border-radius:8px;background:rgba(255,255,255,.04);}
      .memory-convergence-clue h3{margin:0 0 8px;color:#fff;font-size:.74rem;line-height:1.3;}
      .memory-convergence-clue h3 span{display:block;margin-top:3px;color:rgba(255,255,255,.48);font-size:.86em;font-weight:400;}
      .memory-convergence-clue-choice{display:block;width:100%;margin-top:6px;padding:8px;text-align:left;border:1px solid rgba(216,168,255,.2);border-radius:6px;background:rgba(255,255,255,.045);color:#f6efff;cursor:pointer;font:inherit;font-size:.68rem;line-height:1.35;}
      .memory-convergence-clue-choice:hover,.memory-convergence-clue-choice:focus-visible{background:rgba(216,168,255,.14);border-color:#d8a8ff;outline:none;}
      .memory-convergence-clue-choice small{display:block;margin-top:3px;color:rgba(255,255,255,.46);font-size:.9em;}
      .memory-convergence-clue-selected{padding:8px;border-left:3px solid #9fe4ba;color:#d7ffe3;font-size:.68rem;line-height:1.4;}
      .memory-convergence-clue-selected small{display:block;margin-top:3px;color:rgba(215,255,227,.56);font-size:.9em;}
      .memory-convergence-clue-status{display:block;margin-top:7px;color:#9fe4ba;font-size:.62rem;line-height:1.3;}
      .memory-convergence-question{margin:0 0 8px;color:#ffdf9b;font-size:.86rem;line-height:1.4;}
      .memory-convergence-question small{display:block;margin-top:3px;color:rgba(255,231,178,.58);font-size:.86em;}
      .memory-convergence-choice{display:block;width:100%;margin-top:7px;padding:9px 10px;text-align:left;border:1px solid rgba(216,168,255,.32);border-radius:7px;background:rgba(255,255,255,.055);color:#fff;cursor:pointer;font:inherit;font-size:.78rem;line-height:1.35;}
      .memory-convergence-choice:hover,.memory-convergence-choice:focus-visible{background:rgba(216,168,255,.14);border-color:#d8a8ff;outline:none;}
      .memory-convergence-choice small{display:block;margin-top:3px;color:rgba(255,255,255,.48);font-size:.9em;}
      .memory-convergence-feedback{margin-top:11px;padding:9px 10px;border-left:3px solid #ffcb75;color:#ffe7b2;font-size:.78rem;line-height:1.45;}
      .memory-convergence-feedback small{display:block;margin-top:3px;color:rgba(255,231,178,.58);font-size:.9em;}
      .memory-convergence-close-btn{margin-top:17px;padding:9px 18px;border:1px solid #ffcb75;border-radius:7px;background:rgba(255,203,117,.12);color:#ffe7b2;cursor:pointer;font:700 .78rem Georgia,serif;}
      @media(max-width:700px){.memory-convergence-map,.memory-convergence-clue-grid{grid-template-columns:1fr}.memory-convergence-card{padding:21px 16px}}
      #utsuroba-memory-garden{position:fixed;inset:0;z-index:9350;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(1,12,9,.88);font-family:Georgia,serif;}
      .memory-garden-card{position:relative;width:min(700px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:clamp(22px,4vw,36px);box-sizing:border-box;border:1px solid rgba(159,228,186,.5);border-radius:16px;background:linear-gradient(160deg,#10221b,#08120f 68%,#101a19);box-shadow:0 0 75px rgba(39,153,112,.34);animation:utsuPopIn .22s ease-out;}
      .memory-garden-close{position:absolute;right:14px;top:12px;background:transparent;border:0;color:rgba(255,255,255,.58);font-size:18px;cursor:pointer;padding:8px;}
      .memory-garden-eyebrow{color:#9fe4ba;font:700 11px/1.4 monospace;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px;}
      .memory-garden-card h2{margin:0 42px 6px;color:#effff4;font-size:clamp(1.35rem,3vw,2rem);}
      .memory-garden-card h2 span{display:block;color:rgba(215,255,227,.6);font-size:.5em;font-weight:400;margin-top:4px;}
      .memory-garden-intro{margin:0 0 16px;color:#e5fff0;font-size:.88rem;line-height:1.5;}
      .memory-garden-intro small{display:block;margin-top:3px;color:rgba(229,255,240,.56);font-size:.82em;}
      .memory-garden-quotes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:0 0 17px;}
      .memory-garden-quote{padding:11px 10px;border:1px solid rgba(159,228,186,.24);border-radius:8px;background:rgba(255,255,255,.045);}
      .memory-garden-quote strong{display:block;color:#d7ffe3;font-size:.74rem;line-height:1.3;}
      .memory-garden-quote p{margin:7px 0 0;color:#fff;font-size:.72rem;line-height:1.45;}
      .memory-garden-return{margin:0;padding:10px;border-left:3px solid #9fe4ba;color:#d7ffe3;font-size:.78rem;line-height:1.45;}
      .memory-garden-return small{display:block;margin-top:3px;color:rgba(215,255,227,.58);font-size:.9em;}
      .memory-garden-close-btn{margin-top:17px;padding:9px 18px;border:1px solid #9fe4ba;border-radius:7px;background:rgba(159,228,186,.12);color:#d7ffe3;cursor:pointer;font:700 .78rem Georgia,serif;}
      @media(max-width:700px){.memory-garden-quotes{grid-template-columns:1fr}.memory-garden-card{padding:21px 16px}}
      .utsuroba-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block;pointer-events:none;user-select:none;}
      #buki-canvas{position:absolute;inset:0;z-index:10;pointer-events:none;}
      #buki-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:20;}
      .booha-profile-exit{position:fixed;left:16px;top:16px;z-index:260;display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid rgba(216,168,255,.46);border-radius:999px;background:rgba(9,0,18,.82);color:#f1d9ff;font:700 11px/1.2 Georgia,serif;letter-spacing:.03em;text-decoration:none;box-shadow:0 0 16px rgba(100,30,160,.18);transition:background .18s,border-color .18s,transform .18s;}
      .booha-profile-exit:hover,.booha-profile-exit:focus-visible{background:rgba(39,0,65,.92);border-color:#d8a8ff;outline:none;transform:translateY(-1px);}
      #rotate-overlay{display:none;position:fixed;inset:0;z-index:9999;background:#000;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:32px;}
      @media screen and (orientation:portrait) and (max-width:1023px){#rotate-overlay{display:flex !important;}}
      .rotate-phone{font-size:64px;display:block;animation:rotatehint 2.4s ease-in-out infinite;transform-origin:center;}
      @keyframes rotatehint{0%,100%{transform:rotate(0deg);}40%,60%{transform:rotate(-90deg);}}
      .rotate-bar{width:120px;height:3px;border-radius:999px;background:linear-gradient(90deg,#9b2c7a,#c45fa3,#9b2c7a);background-size:200%;animation:barshimmer 2s linear infinite;}
      @keyframes barshimmer{0%{background-position:0%}100%{background-position:200%}}
      .rotate-title{font-family:system-ui,-apple-system,sans-serif;font-size:clamp(18px,5vw,28px);font-weight:900;color:#fff;margin:0;}
      .rotate-sub{font-size:14px;color:rgba(255,255,255,.55);margin:0;line-height:1.7;}
      @keyframes utsuPopIn{from{opacity:0;transform:scale(0.94) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);}}
      #utsuroba-app button:focus-visible,#utsuroba-reading-journal button:focus-visible,#utsuroba-weekly-reading button:focus-visible{outline:3px solid #d7ffe3;outline-offset:3px;}
      @media(prefers-reduced-motion:reduce){#utsuroba-app *,#utsuroba-app *::before,#utsuroba-app *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;scroll-behavior:auto !important;transition-duration:.01ms !important;}}
      /* The wrong-memory toast lives outside #utsuroba-app (appended
         straight to document.body), so the blanket rule above doesn't
         reach its inline shake animation — drop just the shake here. */
      @media(prefers-reduced-motion:reduce){.utsu-toast-card{animation:utsuPopIn .01ms ease-out !important;}}
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
      #utsuroba-reading-journal-button{position:fixed;top:16px;right:16px;z-index:220;background:rgba(9,0,18,.84);border:1px solid rgba(216,168,255,.42);border-radius:999px;padding:8px 13px;color:#f1d9ff;font:700 11px/1.2 Georgia,serif;letter-spacing:.03em;cursor:pointer;box-shadow:0 0 18px rgba(100,30,160,.18);transition:background .18s,border-color .18s,transform .18s;}
      #utsuroba-reading-journal-button:hover,#utsuroba-reading-journal-button:focus-visible{background:rgba(46,12,68,.94);border-color:#d8a8ff;transform:translateY(-1px);outline:none;}
      #utsuroba-reading-journal-button span{display:block;margin-top:2px;color:rgba(241,217,255,.5);font-size:9px;font-weight:400;}
      #utsuroba-reading-journal-button .journal-count{display:inline-block;margin-left:6px;padding:2px 5px;border-radius:999px;background:#ffcb75;color:#241507;font:700 9px/1 monospace;vertical-align:1px;}
      #utsuroba-reading-challenge-button{position:fixed;top:60px;right:16px;z-index:220;background:rgba(8,20,19,.9);border:1px solid rgba(159,228,186,.44);border-radius:999px;padding:8px 13px;color:#d7ffe3;font:700 11px/1.2 Georgia,serif;letter-spacing:.03em;cursor:pointer;box-shadow:0 0 18px rgba(39,153,112,.18);transition:background .18s,border-color .18s,transform .18s;}
      #utsuroba-reading-challenge-button:hover,#utsuroba-reading-challenge-button:focus-visible{background:rgba(12,52,40,.94);border-color:#9fe4ba;transform:translateY(-1px);outline:none;}
      #utsuroba-reading-challenge-button span{display:block;margin-top:2px;color:rgba(215,255,227,.52);font-size:9px;font-weight:400;}
      #utsuroba-reading-challenge-button .challenge-count{display:inline-block;margin-left:6px;padding:2px 5px;border-radius:999px;background:#9fe4ba;color:#082016;font:700 9px/1 monospace;vertical-align:1px;}
      /* Round 2 Pass 2: #utsu-echoes-tracker's own CSS moved into the
         shared .utsu-hud-chip definition in js/utsu-card.js. */
      #utsuroba-reading-journal{position:fixed;inset:0;z-index:9300;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(4,0,12,.86);font-family:Georgia,serif;}
      .reading-journal-card{position:relative;width:min(760px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:clamp(22px,4vw,36px);box-sizing:border-box;border:1px solid rgba(216,168,255,.42);border-radius:16px;background:linear-gradient(160deg,#171020,#0b0712 68%,#130b1b);box-shadow:0 0 70px rgba(100,30,160,.3);animation:utsuPopIn .22s ease-out;}
      .reading-journal-close{position:absolute;right:14px;top:12px;background:transparent;border:0;color:rgba(255,255,255,.55);font-size:20px;cursor:pointer;padding:8px;}
      .reading-journal-eyebrow{display:flex;align-items:center;flex-wrap:wrap;color:#d8a8ff;font:700 12px/1.5 monospace;letter-spacing:.14em;text-transform:uppercase;margin-bottom:9px;}
      .reading-journal-card h2{margin:0 42px 6px;color:#fff4ff;font-size:clamp(1.4rem,3vw,2.1rem);}
      .reading-journal-card h2 span{display:block;color:rgba(255,220,255,.62);font-size:.56em;font-weight:400;margin-top:5px;}
      .reading-journal-intro{margin:0 0 18px;color:#f5e8ff;line-height:1.5;font-size:1rem;}
      .reading-journal-intro small{display:block;margin-top:4px;color:rgba(255,224,168,.72);font-size:.94em;}
      .reading-journal-cabinet{margin:0 0 18px;border:1px solid rgba(255,203,117,.28);border-radius:10px;background:rgba(255,203,117,.05);}
      .reading-journal-cabinet summary{cursor:pointer;padding:11px 13px;color:#ffe0a0;font-size:.88rem;font-weight:700;list-style-position:inside;}
      .reading-journal-cabinet summary span{display:block;margin:4px 0 0 18px;color:rgba(255,231,178,.6);font-size:.76rem;font-weight:400;}
      .reading-journal-cabinet-body{padding:0 13px 13px;}
      .reading-journal-words{display:flex;flex-wrap:wrap;gap:7px;}
      /* Higher-contrast pill: solid-feeling fill + a real border, so a word
         chip visibly separates from the cabinet's own faint amber wash
         instead of reading as the same tint at a slightly different alpha. */
      .reading-journal-word{padding:7px 12px;border:1.5px solid rgba(255,203,117,.8);border-radius:999px;background:rgba(255,203,117,.24);color:#fff8e6;cursor:pointer;font:700 .82rem Georgia,serif;box-shadow:0 1px 0 rgba(0,0,0,.15);}
      .reading-journal-word:hover,.reading-journal-word:focus-visible{background:#ffcb75;color:#241507;border-color:#ffcb75;outline:none;}
      .reading-journal-word-detail{min-height:32px;margin-top:11px;padding:9px 11px;border-left:3px solid #ffcb75;color:#ffe7b2;font-size:.88rem;line-height:1.4;background:rgba(255,203,117,.05);}
      .reading-journal-word-detail strong{color:#fff;font-size:.96rem;}
      .reading-journal-word-detail small{display:block;margin-top:4px;color:rgba(255,231,178,.75);font-size:.92em;}
      .reading-journal-practice{margin:0 0 18px;padding:14px;border:1px solid rgba(216,168,255,.28);border-radius:10px;background:rgba(216,168,255,.05);}
      .reading-journal-practice-heading{color:#e4c2ff;font:700 .9rem Georgia,serif;}
      .reading-journal-practice-heading span{display:block;margin-top:4px;color:rgba(245,232,255,.6);font-size:.86em;font-weight:400;}
      .reading-journal-practice-intro{margin:9px 0 11px;color:rgba(245,232,255,.8);font-size:.84rem;line-height:1.4;}
      .reading-journal-practice-intro small{display:block;margin-top:4px;color:rgba(245,232,255,.58);font-size:.94em;}
      .reading-journal-practice-start{padding:8px 13px;border:1px solid rgba(216,168,255,.5);border-radius:6px;background:rgba(216,168,255,.12);color:#f3ddff;cursor:pointer;font:700 .84rem Georgia,serif;}
      .reading-journal-practice-start:hover,.reading-journal-practice-start:focus-visible{background:rgba(216,168,255,.22);outline:none;}
      .reading-journal-practice-start:disabled{cursor:not-allowed;opacity:.45;}
      .reading-word-practice-panel{margin-top:12px;padding:13px;border:1px solid rgba(255,203,117,.32);border-radius:8px;background:rgba(255,203,117,.06);}
      .reading-word-practice-progress{color:rgba(255,231,178,.68);font:700 .72rem monospace;letter-spacing:.1em;text-transform:uppercase;}
      .reading-word-practice-word{margin:10px 0;color:#fff;font-size:1.28rem;font-weight:700;}
      .reading-word-practice-prompt{margin:0 0 10px;color:#ffe7b2;font-size:.88rem;line-height:1.4;}
      .reading-word-practice-prompt small{display:block;margin-top:4px;color:rgba(255,231,178,.65);font-size:.94em;}
      .reading-word-practice-options{display:grid;gap:8px;}
      .reading-word-practice-option{padding:9px 11px;text-align:left;border:1px solid rgba(255,203,117,.34);border-radius:6px;background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font:inherit;font-size:.86rem;line-height:1.35;}
      .reading-word-practice-option:hover,.reading-word-practice-option:focus-visible{background:rgba(255,203,117,.16);border-color:#ffcb75;outline:none;}
      .reading-word-practice-option small{display:block;margin-top:4px;color:rgba(255,231,178,.62);font-size:.92em;}
      .reading-word-practice-feedback{margin-top:11px;padding:9px 11px;border-left:3px solid #ffcb75;color:#ffe7b2;font-size:.86rem;line-height:1.4;}
      .reading-word-practice-feedback small{display:block;margin-top:4px;color:rgba(255,231,178,.68);font-size:.92em;}
      .reading-word-practice-next{margin-top:10px;padding:7px 12px;border:1px solid rgba(216,168,255,.48);border-radius:6px;background:rgba(216,168,255,.12);color:#f3ddff;cursor:pointer;font:700 .82rem Georgia,serif;}
      .reading-journal-list{display:grid;gap:11px;}
      /* Collapsible entry: a <details>/<summary> pair (same pattern as the
         Word Cabinet above) so each memory shows only its title + status by
         default, and the meta/postcard/vocab/review action only render once
         a kid taps it open — no custom JS state, the browser handles it. */
      .reading-journal-entry{border:1px solid rgba(216,168,255,.24);border-radius:10px;background:rgba(255,255,255,.05);overflow:hidden;}
      .reading-journal-entry-summary{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px;cursor:pointer;list-style:none;}
      .reading-journal-entry-summary::-webkit-details-marker{display:none;}
      .reading-journal-entry-summary::after{content:'▸';flex:0 0 auto;margin-top:2px;color:rgba(255,255,255,.42);font-size:.9rem;transition:transform .15s ease;}
      .reading-journal-entry[open] .reading-journal-entry-summary::after{transform:rotate(90deg);}
      .reading-journal-entry-summary:hover{background:rgba(255,255,255,.04);}
      .reading-journal-entry-title h3{margin:0;color:#fff;font-size:1.08rem;line-height:1.35;}
      .reading-journal-entry-title h3 span{display:block;margin-top:4px;color:rgba(255,231,178,.68);font-size:.82rem;font-weight:400;}
      /* Status chip: color now carries meaning (gray/amber/green = not
         started/in progress/mastered), so it stands out from the plain text
         around it instead of every status line sharing one faint tint. */
      .reading-journal-status{flex:0 0 auto;padding:5px 11px;border-radius:999px;font-size:.72rem;font-weight:700;letter-spacing:.02em;white-space:nowrap;}
      .reading-journal-status small{display:block;margin-top:3px;font-size:.9em;font-weight:400;opacity:.9;}
      .reading-journal-status.level-0{border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.07);color:rgba(255,255,255,.8);}
      .reading-journal-status.level-1{border:1px solid rgba(255,203,117,.6);background:rgba(255,203,117,.16);color:#ffcb75;}
      .reading-journal-status.level-2{border:1px solid rgba(159,228,186,.6);background:rgba(159,228,186,.16);color:#9fe4ba;}
      .reading-journal-entry-body{padding:0 14px 14px;}
      .reading-journal-meta{margin:0 0 10px;color:rgba(245,232,255,.66);font-size:.84rem;line-height:1.4;}
      .reading-journal-postcard{margin:0 0 10px;padding:7px 9px;border:1px solid rgba(216,168,255,.38);border-radius:7px;background:rgba(216,168,255,.06);color:#e4c2ff;font-size:.76rem;}
      .reading-journal-postcard summary{cursor:pointer;font-weight:700;}
      .reading-journal-postcard p{margin:7px 0 0;color:rgba(245,232,255,.8);font-size:.82rem;line-height:1.4;}
      .reading-journal-vocab{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
      .reading-journal-vocab span{padding:5px 9px;border:1px solid rgba(216,168,255,.34);border-radius:999px;color:#e9cfff;font-size:.78rem;}
      .reading-journal-review{padding:8px 13px;border:1px solid #ffcb75;border-radius:6px;background:rgba(255,203,117,.12);color:#ffe7b2;cursor:pointer;font:700 .86rem Georgia,serif;}
      .reading-journal-review:hover,.reading-journal-review:focus-visible{background:rgba(255,203,117,.22);outline:none;}
      .reading-journal-empty,.reading-journal-loading{padding:28px 12px;text-align:center;color:#f1dcff;line-height:1.55;font-size:1rem;}
      .reading-journal-empty small,.reading-journal-loading small{display:block;margin-top:3px;color:rgba(255,224,168,.7);font-size:.86em;}
      @media(max-width:700px){#utsuroba-reading-journal-button{top:10px;right:10px;padding:7px 10px;font-size:10px}.reading-journal-card{padding:21px 16px}.reading-journal-card h2{font-size:1.4rem}}
      #utsuroba-weekly-reading{position:fixed;inset:0;z-index:9300;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(1,12,9,.88);font-family:Georgia,serif;}
      .weekly-reading-card{position:relative;width:min(700px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:clamp(22px,4vw,36px);box-sizing:border-box;border:1px solid rgba(159,228,186,.46);border-radius:16px;background:linear-gradient(160deg,#10221b,#08120f 68%,#101a19);box-shadow:0 0 70px rgba(39,153,112,.3);animation:utsuPopIn .22s ease-out;}
      .weekly-reading-close{position:absolute;right:14px;top:12px;background:transparent;border:0;color:rgba(255,255,255,.58);font-size:20px;cursor:pointer;padding:8px;}
      .weekly-reading-eyebrow{display:flex;align-items:center;flex-wrap:wrap;color:#9fe4ba;font:700 12px/1.5 monospace;letter-spacing:.14em;text-transform:uppercase;margin-bottom:9px;}
      /* Trail palette: green is now reserved for the "done" signal (the
         checkmark badge, the complete-goal border, the progress fill) —
         everything else (title, body copy, incomplete-goal borders) moved
         to warm neutrals so green actually reads as a distinct accent
         instead of every line on the card being another shade of mint. */
      .weekly-reading-card h2{margin:0 42px 6px;color:#fffaf2;font-size:clamp(1.4rem,3vw,2.1rem);}
      .weekly-reading-card h2 span{display:block;color:rgba(255,224,168,.78);font-size:.56em;font-weight:400;margin-top:5px;}
      .weekly-reading-intro{margin:0 0 17px;color:#f7f2e6;font-size:1rem;line-height:1.5;}
      .weekly-reading-intro small{display:block;margin-top:4px;color:rgba(255,224,168,.72);font-size:.94em;}
      .weekly-reading-goals{display:grid;gap:9px;margin:0 0 17px;}
      .weekly-reading-goal{padding:11px 12px;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(255,255,255,.045);}
      .weekly-reading-goal.is-complete{border-color:rgba(159,228,186,.68);background:rgba(159,228,186,.1);}
      .weekly-reading-goal-head{display:flex;justify-content:space-between;gap:10px;color:#fff;font-size:.9rem;line-height:1.35;}
      .weekly-reading-goal-head strong{color:#fff;}
      .weekly-reading-goal.is-complete .weekly-reading-goal-head strong{color:#d7ffe3;}
      .weekly-reading-goal-head span{color:rgba(255,255,255,.6);font:700 .74rem monospace;white-space:nowrap;}
      .weekly-reading-goal small{display:block;margin-top:4px;color:rgba(255,224,168,.68);font-size:.92em;}
      .weekly-reading-bar{height:6px;margin-top:9px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden;}
      .weekly-reading-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#6fd09e,#d7ffe3);}
      .weekly-reading-complete{margin:0;padding:11px;border-left:3px solid #9fe4ba;color:#d7ffe3;font-size:.9rem;line-height:1.45;background:rgba(159,228,186,.06);}
      .weekly-reading-complete small{display:block;margin-top:4px;color:rgba(215,255,227,.68);font-size:.92em;}
      .weekly-reading-close-btn{margin-top:17px;padding:10px 19px;border:1px solid #9fe4ba;border-radius:7px;background:rgba(159,228,186,.14);color:#d7ffe3;cursor:pointer;font:700 .86rem Georgia,serif;}
      @media(max-width:700px){#utsuroba-reading-challenge-button{top:51px;right:10px;padding:7px 10px;font-size:10px}.weekly-reading-card{padding:21px 16px}.weekly-reading-close,.weekly-reading-close-btn,.reading-journal-close{min-width:44px;min-height:44px}}
      /* ══ DRIFTER PANEL ══
         Round 2 Pass 1: the drifter-panel-specific CSS that used to live
         here (its own #utsuroba-drifter-panel sizing plus a full copy of
         the .dp-* content classes) has moved into js/utsu-card.js, the
         shared "parchment card" component now also used by the orb
         panel, thank-you panel, and wrong-memory toast. That file also
         fixes the old mobile-bigger-than-desktop max-height bug. See
         claude/utsuroba-audit-and-pass-plan.md, Round 2. */
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
        try {
          if (window.BoohaAdventure && BoohaAdventure.save) BoohaAdventure.save.clear();
        } catch(_) {}
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
    drifterPanel.className = 'utsu-card is-floating';
    document.body.appendChild(drifterPanel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && drifterPanelOpen) closeDrifterPanel(); });
    /* Round 2 Pass 3: one delegated listener covers every .dp-btn this
       panel will ever render (its innerHTML is rebuilt per-quest-state),
       so a fresh listener never needs to be attached after each render. */
    drifterPanel.addEventListener('click', e => {
      if (window.UtsuSfx && e.target.closest('.dp-btn')) window.UtsuSfx.buttonPress();
    });
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function drifterMemoryRestored(drifter) {
    const episodeId = drifter && drifter.episodeId;
    return !!(episodeId && readUtsuroba().readingEchoes?.[episodeId]);
  }

  function renderMemoryEchoes() {
    if (!echoLayer) return;
    echoLayer.innerHTML = '';
    renderUtsurobaProfilePortal();
    /* The start room is a calm landing page. Reading echoes, the convergence
       gate, and the persistent tracker remain available elsewhere and are
       represented in the Utsuroba profile, but do not crowd the entrance. */
    if (state.roomId === DATA.startRoom) {
      if (echoesTrackerEl) echoesTrackerEl.style.display = 'none';
      return;
    }
    const restored = readUtsuroba().readingEchoes || {};
    const episodes = window.UTSUROBA_EPISODES || {};
    const iconFor = { lantern: '✦', candy: '●', reflection: '◈', thorn: '◆', ribbon: '✿' };
    Object.entries(restored).forEach(([episodeId, entry]) => {
      const episode = episodes[episodeId];
      const echo = episode && episode.worldEcho;
      if (!echo) return;
      let echoRoomId = echo.roomId;
      let echoX = Number(echo.x);
      let echoY = Number(echo.y);
      if (echo.anchorDrifterId) {
        const drifterIndex = DATA.drifters.findIndex(drifter => drifter.id === echo.anchorDrifterId);
        const anchorRoomId = drifterIndex >= 0 ? weeklyRooms[drifterIndex] : null;
        const anchorCoords = anchorRoomId ? DATA.roomStandingCoords[anchorRoomId] : null;
        const authoredCoords = DATA.roomStandingCoords[echo.roomId];
        if (anchorRoomId && anchorCoords && authoredCoords) {
          echoRoomId = anchorRoomId;
          echoX = (anchorCoords.x + (echo.x * WORLD_W - authoredCoords.x)) / WORLD_W;
          echoY = (anchorCoords.y + (echo.y * WORLD_H - authoredCoords.y)) / WORLD_H;
        }
      }
      if (echoRoomId !== state.roomId) return;
      const motif = Object.prototype.hasOwnProperty.call(iconFor, echo.motif) ? echo.motif : 'lantern';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `utsu-memory-echo motif-${motif}`;
      button.style.left = `${Math.max(0, Math.min(1, echoX)) * 100}%`;
      button.style.top = `${Math.max(0, Math.min(1, echoY)) * 100}%`;
      button.setAttribute('aria-label', `${echo.label}. Read memory again.`);
      button.innerHTML = `<span class="echo-aura"></span><span class="echo-icon" aria-hidden="true">${iconFor[motif]}</span><span class="echo-label">${escapeHTML(echo.label)}<small>${escapeHTML(echo.labelJP)}</small></span>`;
      button.addEventListener('click', event => {
        event.stopPropagation();
        openReadingReview({ episodeId, drifterId: entry.drifterId });
      });
      echoLayer.appendChild(button);
    });
    const gate = DATA.readingConvergence;
    if (gate && gate.gateRoom === state.roomId && allReadingMemoriesRestored()) {
      const worldUnderstood = !!readUtsuroba().flags?.convergenceSeen;
      const gardenButton = document.createElement('button');
      gardenButton.type = 'button';
      gardenButton.style.left = `${Math.max(0, Math.min(1, gate.x)) * 100}%`;
      gardenButton.style.top = `${Math.max(0, Math.min(1, gate.y)) * 100}%`;
      if (worldUnderstood) {
        const garden = gate.garden;
        gardenButton.className = 'utsu-memory-garden';
        gardenButton.setAttribute('aria-label', `${garden.title}. Open the memory garden.`);
        gardenButton.innerHTML = `<span class="garden-bloom"></span><span class="garden-spark" aria-hidden="true">✿</span><span class="garden-label">${escapeHTML(garden.title)}<small>${escapeHTML(garden.titleJP)}</small></span>`;
        gardenButton.addEventListener('click', event => { event.stopPropagation(); openMemoryGarden(); });
      } else {
        gardenButton.className = 'utsu-memory-gate';
        gardenButton.setAttribute('aria-label', `${gate.title}. Open convergence reading.`);
        gardenButton.innerHTML = `<span class="gate-ring"></span><span class="gate-core" aria-hidden="true">✦</span><span class="gate-label">${escapeHTML(gate.title)}<small>${escapeHTML(gate.titleJP)}</small></span>`;
        gardenButton.addEventListener('click', event => { event.stopPropagation(); openMemoryConvergence(); });
      }
      echoLayer.appendChild(gardenButton);
    }
    renderEchoesTracker();
  }

  function closeUtsurobaProfilePopup() {
    utsuProfileOpen = false;
    if (utsuProfileOverlay) utsuProfileOverlay.classList.remove('is-open');
    state.inputLocked = false;
  }

  function openUtsurobaProfilePopup() {
    if (utsuProfileOpen || state.roomId !== DATA.startRoom || !utsuProfileOverlay) return;
    utsuProfileOpen = true;
    state.inputLocked = true;
    utsuProfileOverlay.classList.add('is-open');
    const close = utsuProfileOverlay.querySelector('.utsu-profile-pop-close');
    if (close) close.focus();
  }

  function injectUtsurobaProfilePopup() {
    if (utsuProfileOverlay) return;
    utsuProfileOverlay = document.createElement('div');
    utsuProfileOverlay.id = 'utsu-profile-pop-overlay';
    utsuProfileOverlay.className = 'utsu-profile-pop-overlay';
    utsuProfileOverlay.innerHTML = `
      <div class="utsu-profile-pop-box" role="dialog" aria-modal="true" aria-labelledby="utsu-profile-pop-title">
        <button class="utsu-profile-pop-close" type="button" aria-label="Close / 閉じる">✕</button>
        <div class="utsu-profile-pop-icon"><img src="./assets/img/utsuroba_icon.png" alt="Utsuroba profile"></div>
        <p class="utsu-profile-pop-eyebrow">MEMORY ARCHIVE / 記憶の記録</p>
        <h2 id="utsu-profile-pop-title">Utsuroba profile</h2>
        <p class="utsu-profile-pop-title-jp">うつろばプロフィール</p>
        <p class="utsu-profile-pop-copy">Open the record of the memories you have found?<small>見つけた記憶の記録をひらきますか？</small></p>
        <div class="utsu-profile-pop-actions">
          <button type="button" data-utsu-profile-open>Open profile<span>プロフィールをひらく</span></button>
          <button type="button" data-utsu-profile-close>Stay here<span>ここにいる</span></button>
        </div>
      </div>`;
    document.body.appendChild(utsuProfileOverlay);
    utsuProfileOverlay.querySelector('.utsu-profile-pop-close').addEventListener('click', closeUtsurobaProfilePopup);
    utsuProfileOverlay.querySelector('[data-utsu-profile-close]').addEventListener('click', closeUtsurobaProfilePopup);
    utsuProfileOverlay.querySelector('[data-utsu-profile-open]').addEventListener('click', () => {
      saveCurrentRoom();
      window.location.href = 'utsuroba-profile.html';
    });
    utsuProfileOverlay.addEventListener('click', event => {
      if (event.target === utsuProfileOverlay) closeUtsurobaProfilePopup();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && utsuProfileOpen) closeUtsurobaProfilePopup();
    });
  }

  function renderUtsurobaProfilePortal() {
    if (utsuProfilePortal) { utsuProfilePortal.remove(); utsuProfilePortal = null; }
    if (!echoLayer || state.roomId !== DATA.startRoom) return;
    utsuProfilePortal = document.createElement('button');
    utsuProfilePortal.type = 'button';
    utsuProfilePortal.className = 'utsu-profile-portal';
    utsuProfilePortal.style.left = '84%';
    utsuProfilePortal.style.top = '78%';
    utsuProfilePortal.setAttribute('aria-label', 'Open Utsuroba profile / うつろばプロフィールをひらく');
    utsuProfilePortal.innerHTML = '<img src="./assets/img/utsuroba_icon.png" alt="">';
    utsuProfilePortal.addEventListener('click', event => { event.stopPropagation(); openUtsurobaProfilePopup(); });
    echoLayer.appendChild(utsuProfilePortal);
  }

  /* Persistent "Three Echoes" tracker — Pass 1 (see
     claude/utsuroba-audit-and-pass-plan.md). Unlike the room-scoped
     echo buttons above, this is visible from anywhere in Utsuroba so a
     kid always knows how many of the three convergence memories they
     have, without needing to stand in the right room to see it. */
  function injectEchoesTracker() {
    if (echoesTrackerEl) return;
    echoesTrackerEl = document.createElement('div');
    echoesTrackerEl.id = 'utsu-echoes-tracker';
    /* Round 2 Pass 2: was its own bordered-rectangle "food label" box
       (see claude/utsuroba-audit-and-pass-plan.md); now built on the
       shared .utsu-hud-chip shape/layout from js/utsu-card.js, same as
       Karasuki's mirror tracker and the Memory Trail hint. */
    echoesTrackerEl.className = 'utsu-hud-chip is-left';
    echoesTrackerEl.style.display = 'none';
    document.body.appendChild(echoesTrackerEl);
  }

  // Round 2 Pass 16: last-seen lit episode IDs, so renderEchoesTracker()
  // can tell "this dot just lit up" apart from "this dot was already lit
  // the last ten times we redrew this chip." null until the first render
  // establishes a baseline — that first paint reflects existing save data,
  // not a new event, so it should never animate.
  let lastLitEchoIds = null;

  function renderEchoesTracker() {
    if (!echoesTrackerEl) return;
    const convergence = DATA.readingConvergence;
    const requiredIds = convergence?.requiredDrifterIds;
    const episodeDrifters = Array.isArray(requiredIds) && requiredIds.length
      ? DATA.drifters.filter(d => requiredIds.includes(d.id))
      : [];
    if (!episodeDrifters.length) { echoesTrackerEl.style.display = 'none'; return; }

    const utsu = readUtsuroba();
    const restored = utsu.readingEchoes || {};
    const episodes = window.UTSUROBA_EPISODES || {};
    const iconFor = { lantern: '✦', candy: '●', reflection: '◈' };
    const worldUnderstood = !!utsu.flags?.convergenceSeen;
    const garden = convergence.garden;
    const label   = worldUnderstood && garden ? garden.title   : convergence.title;
    const labelJP = worldUnderstood && garden ? garden.titleJP : convergence.titleJP;

    const nextLitEchoIds = new Set();
    const dots = episodeDrifters.map(d => {
      const episode = d.episodeId ? episodes[d.episodeId] : null;
      const motif = episode?.worldEcho?.motif && iconFor[episode.worldEcho.motif] ? episode.worldEcho.motif : 'lantern';
      const isLit = !!(d.episodeId && restored[d.episodeId]);
      if (isLit && d.episodeId) nextLitEchoIds.add(d.episodeId);
      const justLit = isLit && d.episodeId && lastLitEchoIds && !lastLitEchoIds.has(d.episodeId);
      const status = isLit ? 'found' : 'not found yet';
      return `<button type="button" class="utsu-hud-chip-dot motif-${motif}${isLit ? ' is-lit' : ''}${justLit ? ' is-just-lit' : ''}" ${isLit ? '' : 'disabled tabindex="-1"'} data-echo-episode="${escapeHTML(d.episodeId || '')}" aria-label="${escapeHTML(`${d.name} — ${status}`)}"><span aria-hidden="true">${iconFor[motif]}</span></button>`;
    }).join('');
    lastLitEchoIds = nextLitEchoIds;

    echoesTrackerEl.style.display = 'flex';
    echoesTrackerEl.innerHTML = `<div class="utsu-hud-chip-dots">${dots}</div><div class="utsu-hud-chip-text"><span class="utsu-hud-chip-primary">${escapeHTML(label || 'The Three Echoes')}</span><span class="utsu-hud-chip-secondary">${escapeHTML(labelJP || '')}</span></div>`;
    echoesTrackerEl.querySelectorAll('.utsu-hud-chip-dot.is-lit').forEach(btn => {
      btn.addEventListener('click', () => {
        const episodeId = btn.dataset.echoEpisode;
        const entry = episodeId ? restored[episodeId] : null;
        if (episodeId && entry) openReadingReview({ episodeId, drifterId: entry.drifterId });
      });
    });
  }

  function allReadingMemoriesRestored() {
    const requiredIds = DATA.readingConvergence?.requiredDrifterIds;
    const episodeDrifters = Array.isArray(requiredIds) && requiredIds.length
      ? DATA.drifters.filter(drifter => requiredIds.includes(drifter.id))
      : DATA.drifters.filter(drifter => drifter.episodeId);
    const restored = readUtsuroba().readingEchoes || {};
    return episodeDrifters.length >= 3 && episodeDrifters.every(drifter =>
      !!(drifter.episodeId && restored[drifter.episodeId]));
  }

  function closeMemoryConvergence() {
    convergenceOpen = false;
    if (convergenceOverlay) convergenceOverlay.remove();
    convergenceOverlay = null;
    state.inputLocked = false;
  }

  function closeMemoryGarden() {
    gardenOpen = false;
    if (gardenOverlay) gardenOverlay.remove();
    gardenOverlay = null;
    state.inputLocked = false;
  }

  function openMemoryGarden() {
    if (gardenOpen || !allReadingMemoriesRestored() || !readUtsuroba().flags?.convergenceSeen || drifterPanelOpen || readingJournalOpen || convergenceOpen) return;
    const garden = DATA.readingConvergence?.garden;
    if (!garden) return;
    gardenOpen = true;
    state.inputLocked = true;
    gardenOverlay = document.createElement('div');
    gardenOverlay.id = 'utsuroba-memory-garden';
    const quotes = garden.quotes.map(quote => `<article class="memory-garden-quote"><strong>${escapeHTML(quote.name)}</strong><p>${escapeHTML(quote.quote)}</p></article>`).join('');
    gardenOverlay.innerHTML = `<div class="memory-garden-card"><button class="memory-garden-close" type="button" aria-label="Close memory garden">✕</button><div class="memory-garden-eyebrow">THE WORLD NOW / 世界の変化</div><h2>${escapeHTML(garden.title)}<span>${escapeHTML(garden.titleJP)}</span></h2><p class="memory-garden-intro">${escapeHTML(garden.intro)}<small>${escapeHTML(garden.introJP)}</small></p><div class="memory-garden-quotes">${quotes}</div><p class="memory-garden-return">${escapeHTML(garden.returnText)}<small>${escapeHTML(garden.returnTextJP)}</small></p><button class="memory-garden-close-btn" type="button" id="memory-garden-done">Close the garden / 庭を閉じる</button></div>`;
    document.body.appendChild(gardenOverlay);
    gardenOverlay.querySelector('.memory-garden-close').addEventListener('click', closeMemoryGarden);
    gardenOverlay.querySelector('#memory-garden-done').addEventListener('click', closeMemoryGarden);
    gardenOverlay.addEventListener('click', event => { if (event.target === gardenOverlay) closeMemoryGarden(); });
  }

  async function openMemoryConvergence() {
    if (convergenceOpen || !allReadingMemoriesRestored() || drifterPanelOpen || readingJournalOpen) return;
    convergenceOpen = true;
    state.inputLocked = true;
    convergenceOverlay = document.createElement('div');
    convergenceOverlay.id = 'utsuroba-memory-convergence';
    convergenceOverlay.innerHTML = '<div class="memory-convergence-card"><div class="memory-convergence-eyebrow">MEMORY GATE / 記憶の門</div><h2>Opening the gate…<span>門を開いています…</span></h2></div>';
    document.body.appendChild(convergenceOverlay);
    try {
      await window.UTSUROBA_EPISODES_READY;
      if (!convergenceOpen) return;
      const convergence = DATA.readingConvergence;
      const requiredIds = convergence.requiredDrifterIds;
      const episodeDrifters = Array.isArray(requiredIds) && requiredIds.length
        ? DATA.drifters.filter(drifter => requiredIds.includes(drifter.id))
        : DATA.drifters.filter(drifter => drifter.episodeId);
      const memories = episodeDrifters.map(drifter => window.UTSUROBA_EPISODES[drifter.episodeId]).filter(Boolean);
      let revealed = !!readUtsuroba().flags?.convergenceSeen;
      const selectedClues = new Set(revealed ? convergence.clueChecks.map(check => check.episodeId) : []);
      let clueFeedback = '';
      let finalFeedback = '';
      const memoryCards = memories.map(episode => `<article class="memory-convergence-memory"><strong>${escapeHTML(episode.title)}</strong><small>${escapeHTML(episode.worldEcho.label)}</small></article>`).join('');
      const clueCards = () => convergence.clueChecks.map(check => {
        const episode = memories.find(item => item.id === check.episodeId);
        const selected = selectedClues.has(check.episodeId);
        const selectedChoice = check.choices[check.correct];
        return `<section class="memory-convergence-clue"><h3>${escapeHTML(check.title)}<span>${escapeHTML(check.titleJP)}${episode ? ` · ${escapeHTML(episode.title)}` : ''}</span></h3>${selected ? `<div class="memory-convergence-clue-selected">${escapeHTML(selectedChoice)}<small>${escapeHTML(check.choicesJP[check.correct] || '')}</small></div><span class="memory-convergence-clue-status">✓ Clue connected / 手がかりがつながりました</span>` : check.choices.map((choice, index) => `<button class="memory-convergence-clue-choice" type="button" data-convergence-clue="${escapeHTML(check.episodeId)}" data-convergence-clue-choice="${index}">${escapeHTML(choice)}<small>${escapeHTML(check.choicesJP[index] || '')}</small></button>`).join('')}</section>`;
      }).join('');
      const render = () => {
        const cluesComplete = convergence.clueChecks.every(check => selectedClues.has(check.episodeId));
        const activity = revealed ? `<div class="memory-convergence-feedback">${escapeHTML(convergence.success)}<small>${escapeHTML(convergence.successJP)}</small></div><button class="memory-convergence-close-btn" id="memory-convergence-done" type="button">Close the gate / 門を閉じる</button>` : `<p class="memory-convergence-stage">${escapeHTML(convergence.cluePrompt)}<small>${escapeHTML(convergence.cluePromptJP)}</small></p><div class="memory-convergence-clue-grid">${clueCards()}</div>${clueFeedback ? `<div class="memory-convergence-feedback">${clueFeedback}</div>` : ''}${cluesComplete ? `<p class="memory-convergence-question">${escapeHTML(convergence.prompt)}<small>${escapeHTML(convergence.promptJP)}</small></p>${finalFeedback ? `<div class="memory-convergence-feedback">${finalFeedback}</div>` : ''}${convergence.choices.map((choice, index) => `<button class="memory-convergence-choice" type="button" data-convergence-choice="${index}">${escapeHTML(choice)}<small>${escapeHTML(convergence.choicesJP[index] || '')}</small></button>`).join('')}` : ''}`;
        convergenceOverlay.innerHTML = `<div class="memory-convergence-card"><button class="memory-convergence-close" type="button" aria-label="Close memory gate">✕</button><div class="memory-convergence-eyebrow">MEMORY GATE / 記憶の門</div><h2>${escapeHTML(convergence.title)}<span>${escapeHTML(convergence.titleJP)}</span></h2><p class="memory-convergence-intro">${escapeHTML(convergence.intro)}<small>${escapeHTML(convergence.introJP)}</small></p><div class="memory-convergence-map">${memoryCards}</div>${activity}</div>`;
        convergenceOverlay.querySelector('.memory-convergence-close').addEventListener('click', closeMemoryConvergence);
        const done = convergenceOverlay.querySelector('#memory-convergence-done');
        if (done) done.addEventListener('click', closeMemoryConvergence);
        convergenceOverlay.querySelectorAll('[data-convergence-clue-choice]').forEach(button => button.addEventListener('click', () => {
          const check = convergence.clueChecks.find(item => item.episodeId === button.dataset.convergenceClue);
          const choice = Number(button.dataset.convergenceClueChoice);
          if (!check) return;
          if (choice === check.correct) {
            selectedClues.add(check.episodeId);
            clueFeedback = `<strong>${escapeHTML(convergence.clueSuccess)}</strong><small>${escapeHTML(convergence.clueSuccessJP)}</small>`;
          } else {
            clueFeedback = `<strong>${escapeHTML(convergence.clueRetry)}</strong><small>${escapeHTML(convergence.clueRetryJP)}</small>`;
          }
          render();
        }));
        convergenceOverlay.querySelectorAll('[data-convergence-choice]').forEach(button => button.addEventListener('click', () => {
          const choice = Number(button.dataset.convergenceChoice);
          if (choice === convergence.correct) {
            const data = loadSave();
            data.utsuroba.flags.convergenceSeen = true;
            writeSave(data);
            renderMemoryEchoes();
            revealed = true;
            clueFeedback = '';
            finalFeedback = '';
            render();
          } else {
            finalFeedback = '<strong>Look at all three clues again.</strong> The connection is about understanding fear.<small>三つの手がかりをもう一度見ましょう。恐怖を理解することがつながりです。</small>';
            render();
          }
        }));
      };
      render();
      convergenceOverlay.addEventListener('click', event => { if (event.target === convergenceOverlay) closeMemoryConvergence(); });
    } catch (error) {
      console.error('[Utsuroba] Could not open memory gate:', error);
      convergenceOverlay.innerHTML = '<div class="memory-convergence-card"><button class="memory-convergence-close" type="button">Close / 閉じる</button><p class="memory-convergence-intro">The gate is cloudy. Please try again.<small>門がぼやけています。もう一度試してください。</small></p></div>';
      convergenceOverlay.querySelector('.memory-convergence-close').addEventListener('click', closeMemoryConvergence);
    }
  }

  function refreshMemoryEchoes() {
    if (!echoLayer || !window.UTSUROBA_EPISODES_READY) return;
    window.UTSUROBA_EPISODES_READY.then(renderMemoryEchoes).catch(() => {});
  }

  function readingJournalEntries() {
    const entries = readUtsuroba().readingJournal?.entries;
    return Array.isArray(entries) ? entries : [];
  }

  function wordCabinetEntries() {
    const entries = readUtsuroba().wordCabinet?.entries;
    return Array.isArray(entries) ? entries : [];
  }

  function readingWeekKey() {
    try {
      const cw = window.CALENDAR?.getCurrentCurriculumWeek?.();
      return cw && cw.monthSlug && Number.isInteger(cw.weekNumber)
        ? `${cw.monthSlug}:w${cw.weekNumber}` : null;
    } catch (_) { return null; }
  }

  function weeklyReadingChallengeState() {
    const data = loadSave();
    const weekKey = readingWeekKey();
    if (!weekKey) return { data, state: null };
    if (!data.weekly) data.weekly = {};
    let state = data.weekly.readingChallenge;
    if (!state || state.weekKey !== weekKey) {
      state = { weekKey, evidenceUsed: false, postcardSaved: false, lensReplayed: false, completedAt: null };
      data.weekly.readingChallenge = state;
      writeSave(data);
    }
    return { data, state };
  }

  function weeklyReadingChallengeProgress() {
    const challenge = DATA.readingChallenge;
    const bundle = weeklyReadingChallengeState();
    const state = bundle.state || { evidenceUsed: false, postcardSaved: false, lensReplayed: false };
    const restoredCount = Object.keys(bundle.data.utsuroba?.readingEchoes || {}).length;
    const values = {
      memories: restoredCount,
      evidence: state.evidenceUsed ? 1 : 0,
      postcard: state.postcardSaved ? 1 : 0,
      lens: state.lensReplayed ? 1 : 0,
    };
    const goals = (challenge?.goals || []).map(goal => ({
      ...goal,
      value: Math.min(goal.target, values[goal.id] || 0),
      // Named isComplete (not "complete") on purpose — goal.complete/goal.completeJP
      // are the authored completion-message strings from utsuroba-data.js, and
      // spreading ...goal onto a same-named boolean here used to silently clobber
      // them (rendered the literal word "true" instead of the message).
      isComplete: (values[goal.id] || 0) >= goal.target,
    }));
    const complete = goals.length > 0 && goals.every(goal => goal.isComplete);
    if (complete && bundle.state && !bundle.state.completedAt) {
      bundle.state.completedAt = Date.now();
      writeSave(bundle.data);
    }
    return { challenge, goals, complete };
  }

  function recordWeeklyReadingEvent(eventName) {
    const bundle = weeklyReadingChallengeState();
    if (!bundle.state) return;
    if (eventName === 'evidence') bundle.state.evidenceUsed = true;
    if (eventName === 'postcard') bundle.state.postcardSaved = true;
    if (eventName === 'lens') bundle.state.lensReplayed = true;
    bundle.state.lastActivityAt = Date.now();
    writeSave(bundle.data);
    refreshReadingChallengeButton();
  }

  function refreshReadingChallengeButton() {
    if (!readingChallengeButton) return;
    const progress = weeklyReadingChallengeProgress();
    const count = progress.goals.filter(goal => goal.isComplete).length;
    readingChallengeButton.innerHTML = `Weekly Trail<b class="challenge-count">${count}/${progress.goals.length}</b><span>週間読書</span>`;
    readingChallengeButton.setAttribute('aria-label', `Weekly Reading Trail, ${count} of ${progress.goals.length} goals complete`);
  }

  function closeWeeklyReadingChallenge() {
    weeklyChallengeOpen = false;
    if (weeklyChallengeOverlay) weeklyChallengeOverlay.remove();
    weeklyChallengeOverlay = null;
    state.inputLocked = false;
    if (modalPreviousFocus && typeof modalPreviousFocus.focus === 'function') modalPreviousFocus.focus();
    modalPreviousFocus = null;
  }

  function trapOverlayFocus(container, event) {
    if (event.key !== 'Tab' || !container) return;
    const controls = Array.from(container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(control => control.getClientRects().length > 0);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!container.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openWeeklyReadingChallenge() {
    if (weeklyChallengeOpen || readingJournalOpen || drifterPanelOpen || convergenceOpen || gardenOpen || state.celebrating) return;
    const progress = weeklyReadingChallengeProgress();
    if (!progress.challenge) return;
    modalPreviousFocus = document.activeElement;
    weeklyChallengeOpen = true;
    state.inputLocked = true;
    weeklyChallengeOverlay = document.createElement('div');
    weeklyChallengeOverlay.id = 'utsuroba-weekly-reading';
    weeklyChallengeOverlay.setAttribute('role', 'dialog');
    weeklyChallengeOverlay.setAttribute('aria-modal', 'true');
    weeklyChallengeOverlay.setAttribute('aria-label', 'Weekly Reading Trail');
    weeklyChallengeOverlay.tabIndex = -1;
    const goals = progress.goals.map(goal => {
      // Complete goals: drop the progress bar (100% is redundant next to a
      // checkmark) and show the authored completion message, not the label
      // again — a finished goal shouldn't still be explaining itself.
      if (goal.isComplete) {
        return `<article class="weekly-reading-goal is-complete"><div class="weekly-reading-goal-head"><strong>✓ ${escapeHTML(goal.label)}</strong><span>${goal.value} / ${goal.target}</span></div><small>${escapeHTML(goal.complete)}<br>${goal.completeJP}</small></article>`;
      }
      // Incomplete goals: one JP line, not the same line duplicated twice.
      const percent = Math.round((goal.value / goal.target) * 100);
      return `<article class="weekly-reading-goal"><div class="weekly-reading-goal-head"><strong>${escapeHTML(goal.label)}</strong><span>${goal.value} / ${goal.target}</span></div><small>${goal.labelJP}</small><div class="weekly-reading-bar"><i style="width:${percent}%"></i></div></article>`;
    }).join('');
    const completion = progress.complete
      ? `<p class="weekly-reading-complete">${escapeHTML(progress.challenge.complete)}<small>${progress.challenge.completeJP}</small></p>`
      : '';
    weeklyChallengeOverlay.innerHTML = `<div class="weekly-reading-card"><button class="weekly-reading-close" type="button" aria-label="Close weekly reading trail">✕</button><div class="weekly-reading-eyebrow">WEEKLY READING TRAIL / 週間読書</div><h2>${escapeHTML(progress.challenge.title)}<span>${progress.challenge.titleJP}</span></h2><p class="weekly-reading-intro">${escapeHTML(progress.challenge.intro)}<small>${progress.challenge.introJP}</small></p><div class="weekly-reading-goals">${goals}</div>${completion}<button class="weekly-reading-close-btn" type="button" id="weekly-reading-done">Close trail / トレイルを閉じる</button></div>`;
    document.body.appendChild(weeklyChallengeOverlay);
    weeklyChallengeOverlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeWeeklyReadingChallenge(); return; }
      trapOverlayFocus(weeklyChallengeOverlay, event);
    });
    weeklyChallengeOverlay.querySelector('.weekly-reading-close').addEventListener('click', closeWeeklyReadingChallenge);
    weeklyChallengeOverlay.querySelector('#weekly-reading-done').addEventListener('click', closeWeeklyReadingChallenge);
    weeklyChallengeOverlay.addEventListener('click', event => { if (event.target === weeklyChallengeOverlay) closeWeeklyReadingChallenge(); });
    requestAnimationFrame(() => weeklyChallengeOverlay.querySelector('.weekly-reading-close')?.focus());
  }

  function recordWordPracticeResult(item, correct) {
    const data = loadSave();
    const entries = data.utsuroba.wordCabinet?.entries;
    const current = Array.isArray(entries)
      ? entries.find(word => (word.key || `${word.episodeId}:${word.word}`) === (item.key || `${item.episodeId}:${item.word}`))
      : null;
    if (!current) return;
    const now = Date.now();
    current.attempts = (current.attempts || 0) + 1;
    if (correct) {
      current.reviewCount = (current.reviewCount || 0) + 1;
      current.lastReviewedAt = now;
      const intervals = [1, 3, 7, 14];
      const days = intervals[Math.min(intervals.length - 1, current.reviewCount - 1)];
      current.nextReviewAt = now + days * 24 * 60 * 60 * 1000;
    } else {
      current.misses = (current.misses || 0) + 1;
      current.nextReviewAt = now;
    }
    writeSave(data);
  }

  function refreshReadingJournalButton() {
    if (!readingJournalButton) return;
    const count = readingJournalEntries().length;
    readingJournalButton.innerHTML = `Reading Journal${count ? `<b class="journal-count">${count}</b>` : ''}<span>読書ノート</span>`;
    readingJournalButton.setAttribute('aria-label', `Reading Journal, ${count} completed memories`);
  }

  function closeReadingJournal() {
    readingJournalOpen = false;
    if (readingJournalOverlay) readingJournalOverlay.remove();
    readingJournalOverlay = null;
    state.inputLocked = false;
    if (modalPreviousFocus && typeof modalPreviousFocus.focus === 'function') modalPreviousFocus.focus();
    modalPreviousFocus = null;
  }

  async function openReadingReview(entry) {
    const savedEntry = readingJournalEntries().find(item => item.episodeId === entry.episodeId);
    const reviewEntry = savedEntry || entry;
    const drifter = DATA.drifters.find(item => item.id === reviewEntry.drifterId) || {
      id: reviewEntry.drifterId || 'memory', name: 'A restored memory', nameKanji: '記憶'
    };
    closeReadingJournal();
    if (!window.UtsurobaReading) return;
    const adaptiveMode = Number(reviewEntry.masteryLevel) >= 1 ? 'independent' : 'guided';
    window.UtsurobaReading.start({
      drifter,
      reviewOnly: true,
      skipOnboarding: true,
      adaptiveMode,
      quest: { episodeId: reviewEntry.episodeId, readingIndex: 0, mechanicIndex: 0, postcard: reviewEntry.postcard || null },
      onClose: () => { state.inputLocked = false; },
      onReadingEvent: recordWeeklyReadingEvent,
      onReviewComplete: result => recordReadingReview(reviewEntry, result),
      onPostcardSave: postcard => recordReadingPostcard(reviewEntry, postcard),
    });
  }

  function recordReadingReview(entry, result) {
    const data = loadSave();
    const journalEntries = data.utsuroba.readingJournal?.entries;
    const current = Array.isArray(journalEntries)
      ? journalEntries.find(item => item.episodeId === entry.episodeId) : null;
    if (!current) return;
    const mode = result && result.supportLevel === 'independent' ? 'independent' : 'guided';
    current.reviewCount = (current.reviewCount || 1) + 1;
    current.guidedSessions = (current.guidedSessions || 0) + (mode === 'guided' ? 1 : 0);
    current.independentSessions = (current.independentSessions || 0) + (mode === 'independent' ? 1 : 0);
    if (mode === 'guided') {
      current.masteryLevel = Math.max(1, Number(current.masteryLevel) || 0);
    } else if (Number(result?.mistakes) === 0 && result?.usedEvidence !== true) {
      current.masteryLevel = 2;
    } else {
      current.masteryLevel = Math.max(1, Number(current.masteryLevel) || 0);
    }
    current.lastReview = {
      mode,
      mistakes: Number(result?.mistakes) || 0,
      usedEvidence: result?.usedEvidence === true,
      completedAt: Date.now(),
    };
    writeSave(data);
  }

  function recordReadingPostcard(entry, postcard) {
    if (!postcard || !postcard.text) return;
    const data = loadSave();
    const entries = data.utsuroba.readingJournal?.entries;
    const current = Array.isArray(entries)
      ? entries.find(item => item.episodeId === entry.episodeId) : null;
    if (!current) return;
    current.postcard = { text: postcard.text, savedAt: postcard.savedAt || Date.now() };
    writeSave(data);
    recordWeeklyReadingEvent('postcard');
  }

  // Local, Reading-Journal-scoped furigana for episode titles. The shared
  // `episode.titleJP` content field has other consumers (Karasuki, the live
  // reading screen, the profile page) that escape it as plain text — adding
  // <ruby> markup there would break those. So instead of touching the
  // content field, this lookup only supplies ruby readings to the journal's
  // own render call site; anything not in the table falls back to the plain
  // escaped title, same as before this pass.
  const READING_JOURNAL_TITLE_JP = {
    ks_lantern_v1: '消<rt>き</rt>えた灯<rt>あか</rt>り',
    nto_candy_v1: '残<rt>のこ</rt>ったキャンディ',
    cg_door_v1: '背後<rt>はいご</rt>の扉<rt>とびら</rt>',
    bh_window_v1: '窓<rt>まど</rt>の名前<rt>なまえ</rt>',
    bk_badge_v1: '見張<rt>みは</rt>り続<rt>つづ</rt>けたバッジ',
    ph_ribbon_v1: '誰<rt>だれ</rt>も取<rt>と</rt>りに来<rt>こ</rt>なかったリボン'
  };

  function readingJournalTitleJP(episode) {
    const marked = READING_JOURNAL_TITLE_JP[episode.id];
    if (!marked) return escapeHTML(episode.titleJP);
    // The lookup values use bare <rt> tags (no <ruby> wrapper) so each kanji
    // run can carry its own reading; wrap every kanji+<rt> run for the
    // browser's ruby renderer.
    return marked.replace(/([一-鿿]+)(<rt>[^<]*<\/rt>)/g, '<ruby>$1$2</ruby>');
  }

  async function openReadingJournal() {
    if (readingJournalOpen || weeklyChallengeOpen || drifterPanelOpen || state.celebrating) return;
    modalPreviousFocus = document.activeElement;
    readingJournalOpen = true;
    state.inputLocked = true;
    const R = UtsuFurigana.rb;
    readingJournalOverlay = document.createElement('div');
    readingJournalOverlay.id = 'utsuroba-reading-journal';
    readingJournalOverlay.innerHTML = `<div class="reading-journal-card"><button class="reading-journal-close" type="button" aria-label="Close journal">✕</button><div class="reading-journal-eyebrow">READING JOURNAL / ${R('読書','どくしょ')}ノート</div><h2>Restored memories <span>${R('戻','もど')}した${R('記憶','きおく')}</span></h2><p class="reading-journal-intro">Read a memory again whenever you want. Try to remember the details.<small>いつでも${R('記憶','きおく')}を${R('読','よ')}み${R('返','かえ')}せます。${R('細','こま')}かい${R('部分','ぶぶん')}を${R('思','おも')}い${R('出','だ')}してみましょう。</small></p><details class="reading-journal-cabinet" id="reading-word-cabinet"><summary>Word Cabinet / ${R('言葉','ことば')}${R('箱','ばこ')}<span>Words from the memories you restored. / ${R('戻','もど')}した${R('記憶','きおく')}の${R('言葉','ことば')}です。</span></summary><div class="reading-journal-cabinet-body"><div class="reading-journal-words"></div><div class="reading-journal-word-detail" id="reading-word-detail">Choose a word for help.<small>${R('言葉','ことば')}を${R('選','えら')}ぶと${R('意味','いみ')}が${R('出','で')}ます。</small></div></div></details><section class="reading-journal-practice" id="reading-word-practice"><div class="reading-journal-practice-heading">Word practice / ${R('言葉','ことば')}の${R('練習','れんしゅう')}<span>Review three words with no pressure. / ${R('三','みっ')}つの${R('言葉','ことば')}を${R('気軽','きがる')}に${R('練習','れんしゅう')}しましょう。</span></div><p class="reading-journal-practice-intro">Choose the simple meaning. Words you miss will return sooner.<small>やさしい${R('意味','いみ')}を${R('選','えら')}びましょう。${R('間違','まちが')}えた${R('言葉','ことば')}は${R('早','はや')}く${R('戻','もど')}ります。</small></p><button class="reading-journal-practice-start" id="reading-word-practice-start" type="button">Practice 3 words / 3${R('語','ご')}を${R('練習','れんしゅう')}</button><div class="reading-word-practice-panel" id="reading-word-practice-panel" hidden></div></section><div class="reading-journal-list"><div class="reading-journal-loading">Opening your journal…<small>ノートを${R('開','ひら')}いています…</small></div></div></div>`;
    document.body.appendChild(readingJournalOverlay);
    readingJournalOverlay.querySelector('.reading-journal-close').addEventListener('click', closeReadingJournal);
    readingJournalOverlay.setAttribute('role', 'dialog');
    readingJournalOverlay.setAttribute('aria-modal', 'true');
    readingJournalOverlay.setAttribute('aria-label', 'Reading Journal');
    readingJournalOverlay.tabIndex = -1;
    readingJournalOverlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeReadingJournal(); return; }
      trapOverlayFocus(readingJournalOverlay, event);
    });
    readingJournalOverlay.addEventListener('click', event => { if (event.target === readingJournalOverlay) closeReadingJournal(); });
    requestAnimationFrame(() => readingJournalOverlay?.querySelector('.reading-journal-close')?.focus());
    try {
      await window.UTSUROBA_EPISODES_READY;
      if (!readingJournalOpen) return;
      const entries = readingJournalEntries();
      const list = readingJournalOverlay.querySelector('.reading-journal-list');
      const cabinetWords = wordCabinetEntries();
      const wordList = readingJournalOverlay.querySelector('.reading-journal-words');
      const wordDetail = readingJournalOverlay.querySelector('#reading-word-detail');
      const practiceStart = readingJournalOverlay.querySelector('#reading-word-practice-start');
      const practicePanel = readingJournalOverlay.querySelector('#reading-word-practice-panel');
      if (!cabinetWords.length) {
        wordList.innerHTML = `<span style="color:rgba(255,231,178,.55);font-size:.72rem;">Restore a memory to collect words.<br>${R('記憶','きおく')}を${R('戻','もど')}すと、${R('言葉','ことば')}を${R('集','あつ')}められます。</span>`;
      } else {
        wordList.innerHTML = cabinetWords.map((item, index) => `<button class="reading-journal-word" type="button" data-cabinet-word="${index}">${escapeHTML(item.word)}</button>`).join('');
        wordList.querySelectorAll('[data-cabinet-word]').forEach(button => button.addEventListener('click', () => {
          const item = cabinetWords[Number(button.dataset.cabinetWord)];
          if (item && wordDetail) wordDetail.innerHTML = `<strong>${escapeHTML(item.word)}</strong> — ${escapeHTML(item.definition)}<small>${escapeHTML(item.definitionJP)}</small>`;
        }));
      }
      if (cabinetWords.length < 3) {
        practiceStart.disabled = true;
        practiceStart.innerHTML = `Collect 3 words first / まず3${R('語','ご')}${R('集','あつ')}めましょう`;
      } else {
        const practiceQueue = cabinetWords.slice().sort((a, b) => (a.nextReviewAt || 0) - (b.nextReviewAt || 0)).slice(0, 3);
        let practiceIndex = 0;
        let practiceMistakes = 0;

        const closePractice = () => {
          practicePanel.hidden = true;
          practicePanel.innerHTML = '';
          practiceStart.hidden = false;
        };

        const renderPractice = (feedback = '') => {
          if (practiceIndex >= practiceQueue.length) {
            practicePanel.innerHTML = `<div class="reading-word-practice-feedback">Practice complete. You reviewed ${practiceQueue.length} words.<small>${R('練習','れんしゅう')}${R('完了','かんりょう')}。${practiceQueue.length}${R('語','ご')}を${R('復習','ふくしゅう')}しました。</small>${practiceMistakes ? `<br>You needed another try on ${practiceMistakes} answer${practiceMistakes === 1 ? '' : 's'}.<small>${practiceMistakes}${R('問','もん')}をもう${R('一度','いちど')}${R('考','かんが')}えました。</small>` : '<br>Clean round.<small>きれいにできました。</small>'}</div><button class="reading-word-practice-next" type="button" id="reading-word-practice-close">Close practice / ${R('練習','れんしゅう')}を${R('閉','と')}じる</button>`;
            practicePanel.hidden = false;
            practicePanel.querySelector('#reading-word-practice-close').addEventListener('click', closePractice);
            return;
          }
          const target = practiceQueue[practiceIndex];
          const distractors = cabinetWords.filter(item => item.word !== target.word && item.definition !== target.definition).slice(0, 2);
          const options = [target, ...distractors].sort((a, b) => (a.word === target.word ? -1 : b.word === target.word ? 1 : a.word.localeCompare(b.word)));
          practicePanel.innerHTML = `<div class="reading-word-practice-progress">WORD ${practiceIndex + 1} / ${practiceQueue.length}</div><div class="reading-word-practice-word">${escapeHTML(target.word)}</div><p class="reading-word-practice-prompt">What does this word mean?<small>この${R('言葉','ことば')}の${R('意味','いみ')}は${R('何','なん')}ですか？</small></p>${feedback ? `<div class="reading-word-practice-feedback">${feedback}</div>` : ''}<div class="reading-word-practice-options">${options.map((item, index) => `<button class="reading-word-practice-option" type="button" data-practice-option="${index}">${escapeHTML(item.definition)}<small>${escapeHTML(item.definitionJP)}</small></button>`).join('')}</div>`;
          practicePanel.hidden = false;
          practicePanel.querySelectorAll('[data-practice-option]').forEach(button => button.addEventListener('click', () => {
            const choice = options[Number(button.dataset.practiceOption)];
            if (choice.word === target.word) {
              recordWordPracticeResult(target, true);
              practiceIndex += 1;
              renderPractice(`<strong>Correct.</strong> The word is clearer now.<small>${R('正解','せいかい')}。${R('言葉','ことば')}が${R('少','すこ')}し${R('分','わ')}かりやすくなりました。</small>`);
            } else {
              recordWordPracticeResult(target, false);
              practiceMistakes += 1;
              renderPractice(`<strong>Not yet.</strong> Try the meaning again.<small>もう${R('一度','いちど')}、${R('意味','いみ')}を${R('考','かんが')}えましょう。</small>`);
            }
          }));
        };
        practiceStart.addEventListener('click', () => {
          practiceStart.hidden = true;
          practiceIndex = 0;
          practiceMistakes = 0;
          renderPractice();
        });
      }
      if (!entries.length) {
        list.innerHTML = `<div class="reading-journal-empty">Restore a memory to place it here.<small>${R('記憶','きおく')}を${R('戻','もど')}すと、ここに${R('記録','きろく')}されます。</small></div>`;
        return;
      }
      list.innerHTML = entries.map((entry, index) => {
        const episode = window.UTSUROBA_EPISODES[entry.episodeId];
        if (!episode) return '';
        const words = Array.isArray(episode.vocabulary) ? episode.vocabulary.slice(0, 5).map(item => `<span>${escapeHTML(item.word)}</span>`).join('') : '';
        const reviews = Math.max(1, Number(entry.reviewCount) || 1);
        const masteryLevel = Math.max(0, Math.min(2, Number(entry.masteryLevel) || 0));
        // en/jp are a status label ("where you are"); action is the button's
        // own imperative label ("what happens if you tap it"). These used to
        // say almost the same sentence, which is why the status chip and the
        // button beneath it read as two copies of one instruction — reworded
        // the status side to describe state, not repeat the call to action.
        const mastery = masteryLevel >= 2
          ? { en: 'Mastered', jp: `${R('習得','しゅうとく')}${R('済','ず')}み`, action: `Check again / ${R('習得','しゅうとく')}チェック`, level: 2 }
          : masteryLevel === 1
            ? { en: 'Ready to try alone', jp: `${R('自力','じりき')}${R('復習','ふくしゅう')}の${R('準備','じゅんび')}${R('完了','かんりょう')}`, action: `Try without hints / ヒントなしで${R('挑戦','ちょうせん')}`, level: 1 }
            : { en: 'Not started yet', jp: `まだ${R('挑戦','ちょうせん')}していません`, action: `Read with help / ${R('案内','あんない')}${R('付','つ')}き${R('復習','ふくしゅう')}`, level: 0 };
        const postcardNote = entry.postcard ? `<details class="reading-journal-postcard"><summary>Postcard saved / ${R('文章','ぶんしょう')}カードあり</summary><p>${escapeHTML(entry.postcard.text)}</p></details>` : '';
        // Collapsed by default: a <details>/<summary> pair shows only the
        // title and status chip until a kid taps it — the meta line,
        // postcard, vocab pills, and review button only render once open.
        return `<details class="reading-journal-entry"><summary class="reading-journal-entry-summary"><div class="reading-journal-entry-title"><h3>${escapeHTML(episode.title)}<span>${readingJournalTitleJP(episode)}</span></h3></div><span class="reading-journal-status level-${mastery.level}">${mastery.en}<small>${mastery.jp}</small></span></summary><div class="reading-journal-entry-body"><p class="reading-journal-meta">${reviews} reading ${reviews === 1 ? 'completed' : 'sessions'} · ${escapeHTML(episode.eyebrow)}<br>${reviews === 1 ? `1${R('回','かい')}${R('読了','どくりょう')}` : `${reviews}${R('回','かい')}${R('読','よ')}み${R('返','かえ')}しました`}</p>${postcardNote}${words ? `<div class="reading-journal-vocab" aria-label="Vocabulary">${words}</div>` : ''}<button class="reading-journal-review" type="button" data-journal-entry="${index}">${mastery.action}</button></div></details>`;
      }).join('');
      list.querySelectorAll('[data-journal-entry]').forEach(button => button.addEventListener('click', () => {
        const entry = entries[Number(button.dataset.journalEntry)];
        if (entry) openReadingReview(entry);
      }));
    } catch (error) {
      console.error('[Utsuroba Journal] Could not load journal:', error);
      const list = readingJournalOverlay.querySelector('.reading-journal-list');
      if (list) list.innerHTML = `<div class="reading-journal-empty">The journal is cloudy. Please try again.<small>ノートがぼやけています。もう${R('一度','いちど')}${R('試','ため')}してください。</small></div>`;
    }
  }

  function injectReadingJournal() {
    if (readingJournalButton) return;
    readingJournalButton = document.createElement('button');
    readingJournalButton.id = 'utsuroba-reading-journal-button';
    readingJournalButton.type = 'button';
    readingJournalButton.addEventListener('click', openReadingJournal);
    document.body.appendChild(readingJournalButton);
    refreshReadingJournalButton();
  }

  function injectWeeklyReadingChallenge() {
    if (readingChallengeButton) return;
    readingChallengeButton = document.createElement('button');
    readingChallengeButton.id = 'utsuroba-reading-challenge-button';
    readingChallengeButton.type = 'button';
    readingChallengeButton.addEventListener('click', openWeeklyReadingChallenge);
    document.body.appendChild(readingChallengeButton);
    refreshReadingChallengeButton();
  }

  function openDrifterPanel(drifter, forcedQuest = null) {
    if (performance.now() < drifterPanelCooldown || !drifter || !drifterPanel) return;

    if (window.UtsuSfx) window.UtsuSfx.panelOpen();
    drifterPanelOpen  = true;
    state.inputLocked = true;
    state.clickTarget = null;
    try { music.pause(); } catch(_) {}

    /* Round 2 Pass 1: accent the shared card with this drifter's own
       motif color (same lantern/candy/reflection/thorn/ribbon language
       already used by their orb and reading-modal portrait ring) so six
       different voices don't all get the identical tan box. */
    if (window.UtsuCard) {
      const motif = window.UtsuCard.motifForDrifter(drifter);
      drifterPanel.style.setProperty('--card-ring', window.UtsuCard.ringFor(motif));
      drifterPanel.style.setProperty('--card-glow', window.UtsuCard.glowFor(motif));
    }

    invalidateQuestCache();
    const quest       = forcedQuest || getCachedQuest();
    const hasMemories = drifterHasMemories(drifter.id);
    const hasRestoredMemory = drifterMemoryRestored(drifter);
    const worldUnderstood = !!readUtsuroba().flags?.convergenceSeen && allReadingMemoriesRestored();
    const relationshipEpisodeId = DATA.readingRelationships?.triggerEpisodeId;
    const relationshipAwake = worldUnderstood && !!relationshipEpisodeId && !!readUtsuroba().readingEchoes?.[relationshipEpisodeId];

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
      const wl = WAITING_LINES[drifter.id] || { en:"I'll be waiting…" };
      actionHTML = `
        <p class="dp-line-en" style="margin-bottom:2px;">${wl.en}</p>
        <div class="dp-divider"></div>
        <div class="dp-btns">
          <button class="dp-btn yes dp-dismiss">Continue helping / 助けを続ける</button>
          <button class="dp-btn no" id="dp-cancel-quest-btn">Cancel help / 助けをやめる</button>
        </div>`;

    } else if (quest && quest.active === drifter.id && quest.state === 'reading') {
      actionHTML = `
        <p class="dp-line-en" style="margin-bottom:2px;">The memory is open. Reconstruct it.</p>
        <p class="dp-line-jp" style="margin-bottom:10px;">記憶が開いている。再構成しよう。</p>
        <div class="dp-btns"><button class="dp-btn yes" id="dp-resume-reading">Resume reading / 読み直す</button></div>`;

    } else if (quest && quest.active === drifter.id && quest.state === 'collected') {
      actionHTML = `
        <p class="dp-line-en" style="margin-bottom:2px;">You have a memory… give it to me?</p>
        <div class="dp-divider"></div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;margin-top:10px;">
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
      /* no active quest — offer one using questLines. Pass 6: the actual
         ask already plays through the typewriter above (each drifter's own
         questLines, e.g. Ned's "Will you find it for me? Please please
         please?") — this used to repeat a flat, identical "Will you help
         me find a memory?" line for every drifter right after that, which
         just duplicated it in a less personal voice. Buttons only now. */
      actionHTML = `
        <div class="dp-divider"></div>
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
        <div class="dp-portrait-wrap"><span class="dp-portrait-halo"></span><div class="dp-portrait"><img id="dp-portrait-img" src="${drifter.sprite1 || drifter.sprite2}" alt="${drifter.name}"></div></div>
        <div class="dp-body">
          <button class="dp-close-x dp-dismiss">✕</button>
          <p class="dp-name-en">${drifter.name}</p>
          <p class="dp-name-kanji">${drifter.nameKanji}</p>
          
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
    
    /* use questLines for quest-offer state, greeting for everything else.
       Bug fix (caught directly by the user in Bryan's dialogue): a quest
       already in progress with THIS drifter (accepted / reading /
       collected) fell all the way through to drifter.greeting here —
       greeting was only ever authored as "nothing going on" chat filler
       ("Come back later."), so it was printing above actionHTML's own
       state-specific line ("You have a memory… give it to me?" + Give
       Memory buttons) and flatly contradicting it. Each of those three
       states already has its own status text baked into actionHTML above
       (WAITING_LINES, "The memory is open…", the give-memory prompt), so
       no separate greeting line belongs on top of it — every drifter,
       not just Bryan, had this bug. */
    const hasQuestOffer = !quest && drifter.memoryCount > 0 && drifterHasMemories(drifter.id);
    const questInProgressWithThisDrifter = !!(quest && quest.active === drifter.id);
    const baseLines = (hasQuestOffer && drifter.questLines)
      ? drifter.questLines
      : questInProgressWithThisDrifter
        ? []
        : (relationshipAwake && drifter.relationshipGreeting
          ? drifter.relationshipGreeting
          : (worldUnderstood && drifter.convergenceGreeting
          ? drifter.convergenceGreeting
          : (hasRestoredMemory && drifter.restoredGreeting ? drifter.restoredGreeting : drifter.greeting)));
    const dialogueMode = hasQuestOffer
      ? 'offer'
      : (relationshipAwake || worldUnderstood || hasRestoredMemory ? 'restored' : 'idle');
    const dialogueVariant = dialogueVariantFor(drifter);
    const weeklyLine = !questInProgressWithThisDrifter && dialogueVariant
      ? dialogueVariant[dialogueMode]
      : null;
    const dialogueLines = [weeklyLine, ...baseLines]
      .filter(Boolean)
      .map(dialogueLineFor)
      .filter(line => line.en);
    
    let   finished    = false;

    /* Pass 6: swap the portrait from sprite1 to sprite2 the moment the
       conversation reaches its "live" moment (the action buttons appear)
       — the same idle→engaged pairing already used for on-map drifters
       (drawDrifters() switches to img2 once a quest is active with them),
       just applied to the drawer portrait so it isn't a frozen plaque. */
    function swapPortraitEngaged() {
      const portraitImg = drifterPanel.querySelector('#dp-portrait-img');
      if (!portraitImg || !drifter.sprite2) return;
      portraitImg.style.opacity = '0';
      setTimeout(() => {
        portraitImg.src = drifter.sprite2;
        portraitImg.style.opacity = '1';
      }, 140);
    }

    function showActionArea() {
      if (finished) return;
      finished = true;
      twContainer.innerHTML = dialogueLines.map(line =>
        `<p class="dp-line-en" style="margin-bottom:2px;">${escapeHTML(line.en)}</p>${line.jpHTML ? `<p class="dp-line-jp" style="margin:0 0 6px;">${line.jpHTML}</p>` : ''}`
      ).join('');
      actionArea.style.opacity = '1';
      swapPortraitEngaged();
      drifterPanel.querySelectorAll('.dp-dismiss').forEach(btn =>
        btn.addEventListener('click', closeDrifterPanel));
      bindActionButtons();
    }

    if (skipTypewriter) {
      showActionArea();
    } else {
      drifterPanel.addEventListener('click', showActionArea, { once: true });

      let lineIdx = 0, charIdx = 0;
      let currentEnEl = null;
      const CHAR_MS = 38, LINE_PAUSE_MS = 320;

      function typeLine() {
        if (finished) return;
        if (lineIdx >= dialogueLines.length) { setTimeout(showActionArea, 400); return; }
        currentEnEl = document.createElement('p');
        currentEnEl.className = 'dp-line-en';
        currentEnEl.style.marginBottom = '2px';
        twContainer.appendChild(currentEnEl);
        charIdx = 0;
        typeChar();
      }

      function typeChar() {
        if (finished) return;
        const dialogueLine = dialogueLines[lineIdx];
        if (charIdx <= dialogueLine.en.length) {
          currentEnEl.textContent = dialogueLine.en.slice(0, charIdx);
          if (charIdx > 0 && dialogueLine.en[charIdx - 1] !== ' ') playTypeTick();
          charIdx++;
          setTimeout(typeChar, CHAR_MS);
        } else {
          if (dialogueLine.jpHTML) {
            const jpEl = document.createElement('p');
            jpEl.className = 'dp-line-jp';
            jpEl.style.margin = '0 0 6px';
            jpEl.innerHTML = dialogueLine.jpHTML;
            twContainer.appendChild(jpEl);
          }
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

      const resumeReadingBtn = drifterPanel.querySelector('#dp-resume-reading');
      if (resumeReadingBtn) resumeReadingBtn.addEventListener('click', () => {
        const q = getCachedQuest();
        if (!q || !startReadingChallenge(drifter, q)) closeDrifterPanel();
      });

      const cancelQuestBtn = drifterPanel.querySelector('#dp-cancel-quest-btn');
      if (cancelQuestBtn) cancelQuestBtn.addEventListener('click', () => {
        clearQuest();
        closeDrifterPanel();
      });

      const giveBtn = drifterPanel.querySelector('#dp-give-btn');
      if (giveBtn) giveBtn.addEventListener('click', () => {
        const q = getCachedQuest();
        if (!q || q.state !== 'collected') { closeDrifterPanel(); return; }
        const expectedMemKey = `${drifter.id}_a${String(q.memIdx).padStart(2,'0')}`;
        const correct = q.orbIsCorrect === true && q.collectedMemoryId === expectedMemKey;
        if (correct) {
          if (q.episodeId && window.UtsurobaReading) {
            startReadingChallenge(drifter, q);
          } else {
            closeDrifterPanel();
            if (completeMemory(drifter.id, q.memIdx)) startCelebration(drifter);
          }
        } else {
          closeDrifterPanel();
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
    if (window.UtsuSfx) window.UtsuSfx.panelClose();
    drifterPanelCooldown = performance.now() + POPUP_COOLDOWN_MS;
    drifterPanelOpen     = false;
    drifterPanel.classList.remove('open');
    setTimeout(() => { state.inputLocked = false; }, PANEL_SLIDE_MS);
    try { music.play().catch(() => {}); } catch(_) {}
  }

  function persistQuestPatch(patch) {
    const data = loadSave();
    if (!data.weekly) data.weekly = {};
    if (!data.weekly.drifterQuest) return false;
    Object.assign(data.weekly.drifterQuest, patch);
    const ok = writeSave(data);
    invalidateQuestCache();
    return ok;
  }

  function persistReadingOnboarding(patch) {
    const data = loadSave();
    data.utsuroba.readingOnboarding = { ...(data.utsuroba.readingOnboarding || {}), ...patch };
    return writeSave(data);
  }

  /* Pass 2 adapter: quest code supplies state callbacks; the reading module
     owns the episode loading, transcript UI, and comprehension interaction. */
  function startReadingChallenge(drifter, quest) {
    if (!window.UtsurobaReading) return false;
    closeDrifterPanel();
    try { music.pause(); } catch (_) {}
    window.UtsurobaReading.start({
      drifter,
      quest,
      persist: persistQuestPatch,
      adaptiveMode: readUtsuroba().readingOnboarding?.calibration || 'guided',
      onboarding: readUtsuroba().readingOnboarding,
      persistOnboarding: persistReadingOnboarding,
      onReadingEvent: recordWeeklyReadingEvent,
      onClose: () => {
        state.inputLocked = false;
        setTimeout(() => {
          if (!state.celebrating && !state.exitingToKarasuki) {
            try { music.play().catch(() => {}); } catch(_) {}
          }
        }, 0);
      },
      onComplete: () => {
        if (completeMemory(drifter.id, quest.memIdx)) {
          refreshReadingJournalButton();
          refreshReadingChallengeButton();
          refreshMemoryEchoes();
          startCelebration(drifter);
        }
      }
    });
    return true;
  }

  function showWrongMemoryMsg() {
    const msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;pointer-events:none;';
    msg.innerHTML = `<div class="utsu-toast-card" style="text-align:center;animation:utsuPopIn .22s ease-out, utsuToastShake .4s ease-in-out .22s;">
      <p class="dp-line-en" style="margin:0 0 4px;">Sorry… this isn't for me.</p>
      <p class="dp-line-jp" style="margin:0;">ごめん…これは私のじゃない。</p></div>`;
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
    try { music.pause(); } catch(_) {}
    try { booDance.currentTime = 0; booDance.play().catch(() => {}); } catch(_) {}
    playCelebrationChime();

    const pos = drifterWorldPos(drifter, weeklyRooms[DATA.drifters.indexOf(drifter)]);
    state.celebrateOrbitX = pos.x;
    state.celebrateOrbitY = pos.y;

    const finishCelebration = () => {
      if (!state.celebrating) return;
      state.celebrateSettling    = true;
      state.celebrateSettleStart = performance.now();
      setTimeout(() => {
        if (!state.celebrating) return;
        state.celebrateDancing  = false;
        state.celebrateSettling = false;
        state.celebrating       = false;
        danceSparkles           = [];
        state.x = state.celebrateOrbitX;
        state.y = state.celebrateOrbitY;
        stopBooDance();
        try { music.play().catch(() => {}); } catch(_) {}
        state.inputLocked = false;
        showThankYouPanel(drifter);
      }, DANCE_SETTLE_MS);
    };

    setTimeout(finishCelebration, DANCE_MS);

    state.celebrateDancing = true;
  }

  function showThankYouPanel(drifter) {
    const ty = THANK_YOU[drifter.id] || { en:'Thank you!' };
    const panel = document.createElement('div');
    panel.className = 'utsu-card';
    if (window.UtsuCard) {
      const motif = window.UtsuCard.motifForDrifter(drifter);
      panel.style.setProperty('--card-ring', window.UtsuCard.ringFor(motif));
      panel.style.setProperty('--card-glow', window.UtsuCard.glowFor(motif));
    }
    panel.innerHTML = `
      <div class="dp-handle"></div>
      <div class="dp-inner" style="max-width:480px;margin:0 auto;padding-bottom:20px;">
        <div class="dp-portrait" style="width:clamp(60px,12vw,92px);height:clamp(60px,12vw,92px);">
          <img src="${drifter.sprite2}" alt="${escapeHTML(drifter.name)}">
        </div>
        <div class="dp-body">
          <p class="dp-name-en">${escapeHTML(drifter.name)}</p>
          <div class="dp-divider"></div>
          <p class="dp-line-en">${escapeHTML(ty.en)}</p>
          <div class="dp-btns"><button class="dp-btn no" id="ty-close-btn">Close / 閉じる</button></div>
        </div>
      </div>`;
    document.body.appendChild(panel);
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open')));
    function dismissPanel() { panel.classList.remove('open'); setTimeout(() => panel.remove(), 360); }
    panel.querySelector('#ty-close-btn').addEventListener('click', dismissPanel);
    setTimeout(dismissPanel, THANK_YOU_PANEL_MS);
  }

  /* ═══════════════════════════════════════════
     DOM BUILD
  ═══════════════════════════════════════════ */
  function buildApp() {
    app      = document.createElement('div'); app.id = 'utsuroba-app';
    stage    = document.createElement('div'); stage.id = 'utsuroba-stage';
    roomLayer= document.createElement('div'); roomLayer.id = 'utsuroba-room-layer';
    echoLayer = document.createElement('div'); echoLayer.id = 'utsuroba-memory-echo-layer';
    canvas   = document.createElement('canvas'); canvas.id = 'buki-canvas';
    const fade = document.createElement('div'); fade.id = 'buki-fade';
    stage.appendChild(roomLayer); stage.appendChild(echoLayer); stage.appendChild(canvas); stage.appendChild(fade);
    app.appendChild(stage);
    const toast = document.createElement('div'); toast.id = 'buki-copy-toast'; toast.textContent = 'copied!';
    document.body.innerHTML = '';
    document.body.appendChild(app);
    document.body.appendChild(toast);
    injectExitPopOverlay();
    buildDrifterPanel();
    injectReadingJournal();
    injectWeeklyReadingChallenge();
    injectEchoesTracker();
    injectUtsurobaProfilePopup();
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
    saveCurrentRoom();
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
      markVisited();
      saveCurrentRoom();
      arriveInRoom(nextRoom, state.spawnId, exit.dir);
      refreshMemoryEchoes();
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

      /* Round 2 Pass 13: the drifter receiving the memory now visibly
         reacts during Booha's celebration dance too — a small beat-
         synced bounce (same 6.2 rad/s beat the ghost's squash/stretch
         already uses, so the two read as dancing together) plus a
         gold glow, instead of standing there as a static portrait
         while Booha does all the celebrating alone. */
      const isCelebratingDrifter = state.celebrating && state.celebrateDrifter && state.celebrateDrifter.id === drifter.id;
      const bounceY = isCelebratingDrifter
        ? -Math.abs(Math.sin(((now - state.celebrateSpinStart) / 1000) * 6.2)) * dh * 0.06
        : 0;

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

      if (questActive || isCelebratingDrifter) {
        const slowPulse = 0.5 + 0.5 * Math.sin(sec * 1.4);
        const bloomR    = Math.max(dw, dh) * 1.1 + slowPulse * 18;
        const cx = pos.x, cy = pos.y + bounceY - dh * 0.5;
        ctx.save();
        const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR);
        if (isCelebratingDrifter) {
          bloom.addColorStop(0,   `rgba(255,215,0,${0.6 + slowPulse*0.30})`);
          bloom.addColorStop(0.45,`rgba(255,170,0,${0.25 + slowPulse*0.18})`);
          bloom.addColorStop(0.75,`rgba(255,100,10,${0.10 + slowPulse*0.06})`);
        } else {
          bloom.addColorStop(0,   `rgba(255,210,60,${0.55 + slowPulse*0.30})`);
          bloom.addColorStop(0.45,`rgba(255,160,20,${0.22 + slowPulse*0.18})`);
          bloom.addColorStop(0.75,`rgba(255,100,10,${0.08 + slowPulse*0.06})`);
        }
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
          ctx.shadowBlur  = (questActive || isCelebratingDrifter) ? 28 : 18;
          ctx.shadowColor = isCelebratingDrifter
            ? '#ffd700'
            : questActive
              ? (isCollected ? '#44ffaa' : '#ffcc40')
              : '#d8c0f8';
        }
        ctx.drawImage(img, pos.x-dw/2, pos.y-dh+bounceY, dw, dh);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#c090e8';
        ctx.beginPath(); ctx.arc(pos.x, pos.y-40+bounceY, 24, 0, Math.PI*2); ctx.fill();
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
    let drawImg = ghostImg, drawScale = 1, drawOffX = 0, drawOffY = 0;
    if (state.celebrateDancing) {
      const elapsed = (now - state.celebrateSpinStart) / 1000;

      const settleEase = state.celebrateSettling
        ? Math.max(0, 1 - ((now - state.celebrateSettleStart) / DANCE_SETTLE_MS))
        : 1;

      const driftX = (Math.sin(elapsed * 1.1) * 60 + Math.sin(elapsed * 2.3) * 25) * settleEase;
      const driftY = (Math.cos(elapsed * 1.4) * 40 + Math.cos(elapsed * 2.9) * 16) * settleEase;
      const bigBob = (Math.sin(elapsed * 6.2) * 20 + Math.sin(elapsed * 3.7) * 9) * settleEase;

      /* Round 2 Pass 13: a bounded side-to-side tilt reads as dancing.
         The old build rotated the whole sprite continuously (spinAngle
         = elapsed * 3.8, a full 360°+ per second) — past a certain
         speed that just reads as spinning in place, face included, not
         dancing, which is exactly what the Round 2 audit called out as
         the likely reason this didn't land as a "dance." */
      const beat = Math.sin(elapsed * 6.2);
      wobble = Math.sin(elapsed * 3.1) * 16 * settleEase;
      sx = (1.0 + beat * 0.16) * settleEase + (1 - settleEase);
      sy = (1.0 - beat * 0.2)  * settleEase + (1 - settleEase);

      gx     = state.celebrateOrbitX + driftX;
      gy     = state.celebrateOrbitY + driftY + bigBob;

      /* Swap between the three dance-pose frames every half beat (0.5s
         — matches the ~1s squash/stretch cycle above), so the pose
         itself changes on rhythm instead of one static image just
         spinning. During the final wind-down, hold on a single "ta-da"
         arms-up pose rather than continuing to cycle poses while
         everything else is calming down — a finishing beat, not a jump
         cut mid-cycle. */
      const frame = state.celebrateSettling
        ? DANCE_FRAMES[0]
        : DANCE_FRAMES[Math.floor(elapsed / 0.5) % DANCE_FRAMES.length];
      drawImg   = frame.img;
      drawScale = frame.contentScale;
      drawOffX  = frame.offsetX;
      drawOffY  = frame.offsetY;

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
    if (drawImg.complete && drawImg.naturalWidth > 0) {
      if (shadowsEnabled) {
        ctx.shadowBlur  = state.celebrating ? 28+pulse*14 : 14+pulse*8;
        ctx.shadowColor = state.celebrating ? '#ffd700' : col1;
      }
      const boxSize = GHOST_R * 2 * drawScale;
      ctx.drawImage(drawImg, -boxSize/2 + drawOffX*boxSize, -boxSize/2 + drawOffY*boxSize, boxSize, boxSize);
      ctx.shadowBlur=0;
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
      convergenceOpen        ||
      gardenOpen              ||
      weeklyChallengeOpen    ||
      (window.UtsurobaReading && window.UtsurobaReading.isOpen()) ||
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
  function startMusic() {
    if (state.musicStarted) return;
    state.musicStarted = true;
    music.play().catch(() => { state.musicStarted = false; });
  }

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
      if (!d.utsuroba || typeof d.utsuroba !== 'object') d.utsuroba = {};
      if (!d.utsuroba.flags || typeof d.utsuroba.flags !== 'object') d.utsuroba.flags = {};
      if (!d.utsuroba.visitedRooms || typeof d.utsuroba.visitedRooms !== 'object') d.utsuroba.visitedRooms = {};
      let dirty = false;
      if (!d.utsuroba.flags.visited) { d.utsuroba.flags.visited = true; dirty = true; }
      if (!d.utsuroba.visitedRooms[state.roomId]) {
        d.utsuroba.visitedRooms[state.roomId] = Date.now();
        dirty = true;
      }
      if (dirty) writeSave(d);
    } catch(_) {}
  }

  /* ═══════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════ */
  function init() {
    if (!worldGateOpen()) { showLockedWorld(); return; }
    injectStyles();
    buildApp();
    restoreProfileRoom();
    if (isProfileEntry()) {
      const exit = document.createElement('a');
      exit.id = 'booha-profile-exit';
      exit.className = 'booha-profile-exit';
      exit.href = 'profile.html';
      exit.innerHTML = '← <span>Output profile</span>';
      exit.setAttribute('aria-label', 'Back to Output profile');
      exit.addEventListener('click', saveCurrentRoom);
      document.body.appendChild(exit);
    }
    fitStage();
    resizeCanvas();
    renderInitialRoom();
    refreshMemoryEchoes();
    bindInput();
    window.addEventListener('resize', () => { fitStage(); resizeCanvas(); });
    markVisited();
    requestAnimationFrame(tick);
  }

  // The save is keyed on booha_userid, which token.js writes only after its
  // async verify returns. init() reads and writes immediately (markVisited,
  // the drifter quest), so it must not run before identity lands. The page is
  // already hidden by token-checking until then, so this adds no visible wait.
  if (window.BOOHA_READY) init();
  else document.addEventListener('booha:ready', init, { once: true });

  Object.defineProperty(window, 'b_4911', {
    
    value: () => {
      if (typeof injectDevPanel === 'function') injectDevPanel();
    },
    writable: false,
    configurable: false,
    enumerable: false
  });

})();
