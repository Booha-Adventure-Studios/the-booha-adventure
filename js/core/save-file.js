
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
  const SAVE_VERSION    = 2;

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

      // ── Meta — permanent counters ────────────────────────────────────────
     meta: {
        lastWeeklyKey:  '',      // e.g. "2026-march-w3" — used to detect Monday reset
        allTimeStars:   0,       // running total, only goes up
        dayLog:         {},      // { "2026-07-22": { s, g } }  — accountability
        weekLog:        {},      // { "2026-w27": { adv, blitz, duel } }
        lastActivityTs: 0,
      },

      // ── Weekly — resets every Monday midnight Tokyo ──────────────────────
      weekly: {
        completedGames:    {},   // { [saveId]: true }
        gameScores:        {},   // { [saveId]: highScore this week }
        gameStars:         {},   // { [saveId]: stars this week }
        unlockedBonusGames:{},   // { booha_invaders: true, booha_blocks: true, ... }
        wanderers:         [],   // [ wandererId, ... ] unlocked this week (index = order)
      },

      // ── Collection — permanent discoveries ──────────────────────────────
      collection: {
        wanderers: [],           // permanent pool — stays across resets
      },
    };
  }

  // ── Migrate v1 → v2 ──────────────────────────────────────────────────────
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
      };
    }
    if (!save.collection) save.collection = { wanderers: [] };

    if (save.version < 2) save.version = 2;
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
   * Clears all weekly data. Called by adventure-core on week change.
   * Does NOT touch scores, unlocks, meta.allTimeStars, or collection.
   */
  function resetWeekly() {
    const data = load();
    data.weekly = {
      completedGames:     {},
      gameScores:         {},
      gameStars:          {},
      unlockedBonusGames: {},
      wanderers:          [],
    };
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
