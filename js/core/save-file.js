
/**
 * save-file.js
 * The Booha Adventure — Save File (localStorage layer)
 * v2: adds weekly, meta, and collection sections.
 */

const BoohaSaveFile = (() => {
  'use strict';

  const STORAGE_BASE    = 'booha_save';
  const KEY_USER_ID     = 'booha_userid';

  // Two different numbers. Do not read them together.
  //   ADVENTURE_EPOCH — key generation. Bump to ABANDON every existing save.
  //                     Old keys are orphaned, not migrated, not deleted.
  //   SAVE_VERSION    — schema shape. Bump to MIGRATE saves via _migrate().
  const ADVENTURE_EPOCH = 3;
  const SAVE_VERSION    = 3;

  // ── Identity-scoped storage key ───────────────────────────────────────────
  // Saves live under the logged-in student's Wix _id, so two students sharing
  // one device never inherit each other's progress. Falls back to the legacy
  // unscoped key when nobody is identified — behaviour then matches the old
  // build exactly, so a missing userId degrades instead of breaking.

  function _uid() {
    try { return localStorage.getItem(KEY_USER_ID) || ''; } catch (e) { return ''; }
  }

 // Returns null when no student is identified. All 13 pages that load this
  // file are token-gated, so there is no legitimate anonymous Adventure save:
  // no userId means the session is broken, not anonymous. Callers MUST treat
  // null as "refuse to touch storage" — an unscoped fallback is what let one
  // student's page load read and mutate another student's save.
  //
  // Returns null rather than throwing: load() and save() catch internally, so
  // a throw would be swallowed and silently become a blank _defaultSave().
  function _key() {
    const uid = _uid();
    return uid ? `${STORAGE_BASE}:v${ADVENTURE_EPOCH}:${uid}` : null;
  }

  let _lockWarned = false;
  function _warnLocked(op) {
    if (_lockWarned) return;
    _lockWarned = true;
    console.error(`[BoohaSaveFile] ${op} blocked — no identity. Saves are disabled.`);
    document.dispatchEvent(new Event('booha:saveLocked'));
  }

  

  // ── Default save structure ────────────────────────────────────────────────
  function _defaultSave() {
    return {
      version:     SAVE_VERSION,
      createdAt:   Date.now(),
      updatedAt:   Date.now(),
      playerName:  '',

      // ── Permanent (never reset) ──────────────────────────────────────────
      scores:      {},   // { [saveId]: { highScore, stars, completed, attempts, ... } }
      unlocks:     {},   // { [itemId]: { unlockedAt } }  — achievements only
      stats:       {},   // arbitrary permanent stat counters
      collectibles:{},   // { [id]: { found, foundAt } }
      pageState:   {},   // { [pageId]: { visited, spawnPoint, ... } }
      weekData:    {},   // legacy — kept for migration safety

      // ── Grimmerglen — permanent running totals ─────────────────────────
      // Per-object records remain separate and capped at three; these
      // counters record the player's full history, including replays.
      grimmerglen: {
        cluesReturnedTotal:    0,
        memoriesRestoredTotal: 0,
        roomVisitsTotal:       0,
        gardenVisitsTotal:     0,
      },

      // ── Meta — permanent counters ────────────────────────────────────────
     meta: {
        lastWeeklyKey:  '',      // occurrence key, e.g. "2026-08-30|august-w4"
        allTimeStars:   0,       // running total, only goes up
        dayLog:         {},      // { "2026-07-22": { s, g } }  — accountability
        weekLog:        {},      // { "2026-w27": { adv, blitz, duel } }
        lastActivityTs: 0,
      },

      // ── Weekly — resets at each Sunday-started Tokyo occurrence ──────────
      weekly: {
        completedGames:    {},   // { [saveId]: true }
        gameScores:        {},   // { [saveId]: highScore this week }
        gameStars:         {},   // { [saveId]: stars this week }
        unlockedBonusGames:{},   // { booha_invaders: true, booha_blocks: true, ... }
        wanderers:         [],   // [ wandererId, ... ] unlocked this week (index = order)
        worlds:            _defaultWeeklyWorlds(),
      },

      // ── Collection — permanent discoveries ──────────────────────────────
      collection: {
        wanderers: {},           // { [wandererId]: { visits, firstFoundAt, lastFoundAt } }
      },
    };
  }

  // ── Weekly replay contract ────────────────────────────────────────────────
  // Every output world has lifetime records in its own root save bucket, but
  // its playable hunt must be a fresh occurrence-scoped copy. Keep those
  // transient maps together under weekly.worlds so the rollover can clear the
  // opportunity to play again without erasing the lifetime record.
  function _defaultWeeklyWorlds() {
    return {
      occurrenceKey: '',
      utsuroba: {
        drifterQuest: null,
        drifters: {},
        readingChallenge: null,
      },
      muenba: {
        ghostsFound: {},
        huntGhostOrder: [],
        activeCaseId: null,
        orbsPending: 0,
      },
      grimmerglen: {
        objects: {},
        objectSlots: {},
        tierProgressSchema: 2,
        tierProgress: {
          start: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
          case: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
          deep: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
        },
        activeTargetType: null,
        carriedObjectId: null,
        memoryQuestAccepted: false,
        mariettaIntroSeen: false,
        mariettaIntroSkipped: false,
      },
    };
  }

  function _copyLegacyGrimmerglenTierProgress(world) {
    const legacyObjects = world.objects && typeof world.objects === 'object' && !Array.isArray(world.objects)
      ? world.objects : {};
    const legacySlots = world.objectSlots && typeof world.objectSlots === 'object' && !Array.isArray(world.objectSlots)
      ? world.objectSlots : {};
    const hasLegacyProgress = Object.keys(legacyObjects).length > 0 || Object.keys(legacySlots).length > 0
      || typeof world.activeTargetType === 'string' || typeof world.carriedObjectId === 'string';
    const tierProgress = {
      start: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
      case: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
      deep: { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null },
    };

    // The old ladder used one shared found count for Starter → Case → Deep,
    // so it cannot prove that a player completed any new tier in full. Keep
    // the discovered weekly items visible in Starter only; Case and Deep
    // begin clean, while lifetime records remain untouched.
    if (hasLegacyProgress) {
      Object.keys(legacyObjects).forEach(type => {
        const found = Number.isInteger(legacyObjects[type]?.found)
          ? Math.max(0, Math.min(3, legacyObjects[type].found)) : 0;
        tierProgress.start.objects[type] = { found };
      });
      tierProgress.start.objectSlots = Object.assign({}, legacySlots);
      tierProgress.start.activeTargetType = typeof world.activeTargetType === 'string' ? world.activeTargetType : null;
      tierProgress.start.carriedObjectId = typeof world.carriedObjectId === 'string' ? world.carriedObjectId : null;
    }
    world.tierProgress = tierProgress;
    world.tierProgressSchema = 2;
  }

  function _ensureWeeklyWorlds(save) {
    if (!save.weekly || typeof save.weekly !== 'object' || Array.isArray(save.weekly)) {
      save.weekly = {};
    }

    const current = save.weekly.worlds;
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      save.weekly.worlds = _defaultWeeklyWorlds();
      return;
    }

    if (typeof current.occurrenceKey !== 'string') current.occurrenceKey = '';

    if (!current.utsuroba || typeof current.utsuroba !== 'object' || Array.isArray(current.utsuroba)) current.utsuroba = {};
    if (current.utsuroba.drifterQuest === undefined) current.utsuroba.drifterQuest = null;
    if (!current.utsuroba.drifters || typeof current.utsuroba.drifters !== 'object' || Array.isArray(current.utsuroba.drifters)) current.utsuroba.drifters = {};
    if (current.utsuroba.readingChallenge === undefined) current.utsuroba.readingChallenge = null;

    if (!current.muenba || typeof current.muenba !== 'object' || Array.isArray(current.muenba)) current.muenba = {};
    if (!current.muenba.ghostsFound || typeof current.muenba.ghostsFound !== 'object' || Array.isArray(current.muenba.ghostsFound)) current.muenba.ghostsFound = {};
    if (!Array.isArray(current.muenba.huntGhostOrder)) current.muenba.huntGhostOrder = [];
    if (current.muenba.activeCaseId === undefined) current.muenba.activeCaseId = null;
    if (!Number.isFinite(current.muenba.orbsPending) || current.muenba.orbsPending < 0) current.muenba.orbsPending = 0;

    if (!current.grimmerglen || typeof current.grimmerglen !== 'object' || Array.isArray(current.grimmerglen)) current.grimmerglen = {};
    if (!current.grimmerglen.objects || typeof current.grimmerglen.objects !== 'object' || Array.isArray(current.grimmerglen.objects)) current.grimmerglen.objects = {};
    if (!current.grimmerglen.objectSlots || typeof current.grimmerglen.objectSlots !== 'object' || Array.isArray(current.grimmerglen.objectSlots)) current.grimmerglen.objectSlots = {};
    const priorTierProgressSchema = Number(current.grimmerglen.tierProgressSchema) || 0;
    const hasTierProgressBuckets = current.grimmerglen.tierProgress && typeof current.grimmerglen.tierProgress === 'object' && !Array.isArray(current.grimmerglen.tierProgress)
      && ['start', 'case', 'deep'].some(tier => current.grimmerglen.tierProgress[tier] && typeof current.grimmerglen.tierProgress[tier] === 'object' && !Array.isArray(current.grimmerglen.tierProgress[tier]));
    if (!hasTierProgressBuckets) {
      _copyLegacyGrimmerglenTierProgress(current.grimmerglen);
    } else {
      ['start', 'case', 'deep'].forEach(tier => {
        if (!current.grimmerglen.tierProgress[tier] || typeof current.grimmerglen.tierProgress[tier] !== 'object' || Array.isArray(current.grimmerglen.tierProgress[tier])) {
          current.grimmerglen.tierProgress[tier] = { objects: {}, objectSlots: {}, activeTargetType: null, carriedObjectId: null };
        }
        const progress = current.grimmerglen.tierProgress[tier];
        if (!progress.objects || typeof progress.objects !== 'object' || Array.isArray(progress.objects)) progress.objects = {};
        if (!progress.objectSlots || typeof progress.objectSlots !== 'object' || Array.isArray(progress.objectSlots)) progress.objectSlots = {};
        if (progress.activeTargetType === undefined) progress.activeTargetType = tier === 'start' && typeof current.grimmerglen.activeTargetType === 'string' ? current.grimmerglen.activeTargetType : null;
        if (progress.carriedObjectId === undefined) progress.carriedObjectId = tier === 'start' && typeof current.grimmerglen.carriedObjectId === 'string' ? current.grimmerglen.carriedObjectId : null;
      });
      const startProgress = current.grimmerglen.tierProgress.start;
      const legacyObjects = current.grimmerglen.objects && typeof current.grimmerglen.objects === 'object' && !Array.isArray(current.grimmerglen.objects)
        ? current.grimmerglen.objects : {};
      const legacySlots = current.grimmerglen.objectSlots && typeof current.grimmerglen.objectSlots === 'object' && !Array.isArray(current.grimmerglen.objectSlots)
        ? current.grimmerglen.objectSlots : {};
      // Pass 2 created empty tier buckets before the old runtime started
      // writing into them. Carry that interim root progress into Starter once,
      // but never overwrite a tier that Pass 3 has already begun using.
      if (priorTierProgressSchema < 2 && Object.keys(startProgress.objects).length === 0 && Object.keys(startProgress.objectSlots).length === 0 &&
          (Object.keys(legacyObjects).length > 0 || Object.keys(legacySlots).length > 0)) {
        startProgress.objects = Object.assign({}, legacyObjects);
        startProgress.objectSlots = Object.assign({}, legacySlots);
        if (typeof current.grimmerglen.activeTargetType === 'string') startProgress.activeTargetType = current.grimmerglen.activeTargetType;
        if (typeof current.grimmerglen.carriedObjectId === 'string') startProgress.carriedObjectId = current.grimmerglen.carriedObjectId;
      }
      current.grimmerglen.tierProgressSchema = 2;
    }
    if (current.grimmerglen.activeTargetType === undefined) current.grimmerglen.activeTargetType = null;
    if (current.grimmerglen.carriedObjectId === undefined) current.grimmerglen.carriedObjectId = null;
    if (current.grimmerglen.memoryQuestAccepted === undefined) current.grimmerglen.memoryQuestAccepted = false;
    if (current.grimmerglen.mariettaIntroSeen === undefined) current.grimmerglen.mariettaIntroSeen = false;
    if (current.grimmerglen.mariettaIntroSkipped === undefined) current.grimmerglen.mariettaIntroSkipped = false;
  }

  function _ensureGrimmerglenLifetime(save) {
    if (!save.grimmerglen || typeof save.grimmerglen !== 'object' || Array.isArray(save.grimmerglen)) {
      save.grimmerglen = {};
    }
    const root = save.grimmerglen;
    const objects = root.objects && typeof root.objects === 'object' && !Array.isArray(root.objects)
      ? root.objects : {};
    const foundLowerBound = Object.values(objects).reduce((sum, entry) => {
      const found = Number.isInteger(entry?.found) ? Math.max(0, Math.min(3, entry.found)) : 0;
      return sum + found;
    }, 0);
    const restoredLowerBound = Object.values(objects).reduce((sum, entry) => {
      const found = Number.isInteger(entry?.found) ? Math.max(0, Math.min(3, entry.found)) : 0;
      return sum + (found >= 3 ? 1 : 0);
    }, 0);
    const visitedRooms = root.visitedRooms && typeof root.visitedRooms === 'object' && !Array.isArray(root.visitedRooms)
      ? root.visitedRooms : {};

    // These fields are backfilled without a version bump so current-version
    // saves receive the same protection as older saves. Existing capped
    // records provide a conservative lower bound; future replays are counted
    // exactly by the live world.
    if (!Number.isSafeInteger(root.cluesReturnedTotal) || root.cluesReturnedTotal < 0) {
      root.cluesReturnedTotal = foundLowerBound;
    }
    if (!Number.isSafeInteger(root.memoriesRestoredTotal) || root.memoriesRestoredTotal < 0) {
      root.memoriesRestoredTotal = restoredLowerBound;
    }
    if (!Number.isSafeInteger(root.roomVisitsTotal) || root.roomVisitsTotal < 0) {
      root.roomVisitsTotal = Object.keys(visitedRooms).length;
    }
    if (!Number.isSafeInteger(root.gardenVisitsTotal) || root.gardenVisitsTotal < 0) {
      // There is no reliable historical marker for entering the world, so
      // start this new counter at zero rather than inventing visits.
      root.gardenVisitsTotal = 0;
    }
  }

  // ── Migrate legacy saves → current schema ────────────────────────────────
  function _migrate(save) {
    if (!save.version || save.version < 1) {
      save = Object.assign(_defaultSave(), save);
      save.version = 1;
    }
    
    // Field backfill runs UNCONDITIONALLY, not gated on version.
    // Gating it meant a save born at the current version never received these
    // fields at all — _defaultSave() didn't create dayLog/weekLog, and the
    // migration branch never ran, so the accountability log was silently empty
    // for every new save. Version gates guard *transformations*; presence
    // checks are idempotent and belong outside them.
    if (!save.meta) save.meta = {};
    if (typeof save.meta.lastWeeklyKey  !== 'string') save.meta.lastWeeklyKey  = '';
    if (typeof save.meta.allTimeStars   !== 'number') save.meta.allTimeStars   = 0;
    if (typeof save.meta.lastActivityTs !== 'number') save.meta.lastActivityTs = 0;
    if (!save.meta.dayLog)  save.meta.dayLog  = {};
    if (!save.meta.weekLog) save.meta.weekLog = {};

    if (!save.weekly) {
      save.weekly = {
        completedGames:     {},
        gameScores:         {},
        gameStars:          {},
        unlockedBonusGames: {},
        wanderers:          [],
        worlds:             _defaultWeeklyWorlds(),
      };
    }
    _ensureWeeklyWorlds(save);
    _ensureGrimmerglenLifetime(save);
    if (!save.collection || typeof save.collection !== 'object' || Array.isArray(save.collection)) {
      save.collection = {};
    }
    // Early scaffolding used an array here but never wrote entries. Convert
    // any imported legacy array into the permanent keyed collection shape.
    if (Array.isArray(save.collection.wanderers)) {
      const migrated = {};
      save.collection.wanderers.forEach((item, index) => {
        const source = item && typeof item === 'object' ? item : {};
        const id = String(source.id || source.name || item || index);
        migrated[id] = {
          ...source,
          visits: Math.max(1, Number(source.visits) || 1),
        };
      });
      save.collection.wanderers = migrated;
    } else if (!save.collection.wanderers || typeof save.collection.wanderers !== 'object') {
      save.collection.wanderers = {};
    }

    if (save.version < 2) save.version = 2;
    if (save.version < 3) save.version = 3;
    return save;
    
  }

  // ── Core read / write ─────────────────────────────────────────────────────
  function load() {
    try {
      
      const k = _key();
      if (!k) { _warnLocked('read'); return _defaultSave(); }
      const raw = localStorage.getItem(k);
      if (!raw) return _defaultSave();
      
      const parsed = JSON.parse(raw);
      return _migrate(parsed);
   } catch (e) {
      // A parse failure must not silently become a blank save: the next write
      // would persist the default over recoverable data. Stash the raw string.
      console.error('[BoohaSaveFile] Load error:', e);
      try {
        const raw = localStorage.getItem(_key());
        if (raw) localStorage.setItem(_key() + ':corrupt:' + Date.now(), raw);
      } catch (_) {}
      return _defaultSave();
    }
  }

  function save(data) {
    try {
      
      const k = _key();
      if (!k) { _warnLocked('write'); return false; }
      data.updatedAt = Date.now();
      data.version   = SAVE_VERSION;
      localStorage.setItem(k, JSON.stringify(data));
      
      document.dispatchEvent(new CustomEvent('booha:saved', { detail: data }));
      return true;
   } catch (e) {
      // Quota or private-mode failure. Callers get false, but the student needs
      // to know too — silent write failure looks identical to normal play.
      console.error('[BoohaSaveFile] Write error:', e);
      document.dispatchEvent(new CustomEvent('booha:saveFailed', { detail: { error: String(e) } }));
      return false;
    }
    
  }

  function clear() {
    const k = _key();
    if (!k) { _warnLocked('clear'); return; }
    localStorage.removeItem(k);
    document.dispatchEvent(new Event('booha:saveCleared'));
  }

  function exists() {
    const k = _key();
    if (!k) return false;
    return localStorage.getItem(k) !== null;
  }

  // ── Partial update helper ─────────────────────────────────────────────────
  function patch(section, patchObj) {
    const data = load();
    if (typeof data[section] !== 'object') data[section] = {};
    Object.assign(data[section], patchObj);
    return save(data);
  }

  // ── Deep patch for nested sections (e.g. weekly, meta) ───────────────────
  function patchDeep(section, key, patchObj) {
    const data = load();
    if (typeof data[section] !== 'object') data[section] = {};
    if (typeof data[section][key] !== 'object') data[section][key] = {};
    Object.assign(data[section][key], patchObj);
    return save(data);
  }

  // ── Weekly reset ──────────────────────────────────────────────────────────
  /**
   * Clears all weekly data. Called by adventure-core on occurrence change.
   * Does NOT touch scores, unlocks, meta.allTimeStars, or collection.
   */
  function resetWeekly(occurrenceKey) {
    const data = load();
    data.weekly = {
      completedGames:     {},
      gameScores:         {},
      gameStars:          {},
      unlockedBonusGames: {},
      wanderers:          [],
      worlds:             _defaultWeeklyWorlds(),
    };
    data.weekly.worlds.occurrenceKey = occurrenceKey || '';

    // Blitz keeps its weekly bucket inside meta for historical reasons, so it
    // must be cleared alongside the top-level weekly section.
    if (data.meta && data.meta.blitz && typeof data.meta.blitz === 'object') {
      data.meta.blitz.weekly = {};
      data.meta.blitz.weeklyKey = occurrenceKey || '';
    }

    // Clear legacy Muenba weekly fields too. The live hunt now uses
    // weekly.worlds.muenba, but older pages/saves may still carry these
    // compatibility fields. Lifetime ghosts, case records, room history,
    // and rhythm bests remain untouched.
    if (data.muenba && typeof data.muenba === 'object') {
      data.muenba.weeklyGhostsFound = {};
      data.muenba.weeklyGhostsFoundWeek = occurrenceKey || '';
      data.muenba.huntGhostOrder = [];
      data.muenba.huntGhostOrderWeek = occurrenceKey || '';
      data.muenba.orbsPending = 0;
      if (data.muenba.caseProgress && typeof data.muenba.caseProgress === 'object') {
        data.muenba.caseProgress.activeCaseId = null;
      }
    }

    // Grimmerglen's root object counts and slots are lifetime history. Clear
    // only the old transient target/carry fields; the live weekly item state
    // has already been recreated inside weekly.worlds.grimmerglen above.
    if (data.grimmerglen && typeof data.grimmerglen === 'object') {
      data.grimmerglen.activeTargetType = null;
      data.grimmerglen.carriedObjectId = null;
    }

    if (occurrenceKey) {
      if (!data.meta || typeof data.meta !== 'object') data.meta = {};
      data.meta.lastWeeklyKey = occurrenceKey;
    }

    const ok = save(data);
    if (ok) {
      document.dispatchEvent(new Event('booha:weeklyReset'));
      console.log('[BoohaSaveFile] Weekly data reset.');
    }
    return ok;
  }

  // ── Export / Import ───────────────────────────────────────────────────────
  function exportJSON() {
    // Guard explicitly: load() returns a default when locked, so without this
    // a student could export a legitimate-looking file containing nothing.
    if (!_key()) { _warnLocked('export'); return null; }
    return JSON.stringify(load(), null, 2);
  }

  function importJSON(jsonString) {
    // The authenticated Wix record is authoritative in Increment B. Accepting
    // arbitrary JSON here would upload another student's progress under the
    // current identity at the next sync checkpoint.
    return {
      ok: false,
      error: 'Save import has been retired. Progress now follows your login.'
    };
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    // Exposed for sync-client.js, which installs a restored blob before this
    // system boots. Never duplicate the key derivation — one source of truth.
    key: _key,
    load, save, clear, exists,
    
    patch, patchDeep,
    resetWeekly,
    exportJSON, importJSON,
    init() {
      if (!_key()) { _warnLocked('init'); return; }
      if (!exists()) save(_defaultSave());
    }
  };

  BoohaAdventure.registerSystem('saveFile', api);
  return api;
})();

window.BoohaSaveFile = BoohaSaveFile;
