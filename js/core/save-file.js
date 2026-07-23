
/**
 * save-file.js
 * The Booha Adventure — Save File (localStorage layer)
 * v2: adds weekly, meta, and collection sections.
 */

const BoohaSaveFile = (() => {
  'use strict';

  const STORAGE_BASE = 'booha_save';
  const SAVE_VERSION = 2;
  const KEY_USER_ID  = 'booha_userid';

  // ── Identity-scoped storage key ───────────────────────────────────────────
  // Saves live under the logged-in student's Wix _id, so two students sharing
  // one device never inherit each other's progress. Falls back to the legacy
  // unscoped key when nobody is identified — behaviour then matches the old
  // build exactly, so a missing userId degrades instead of breaking.

  function _uid() {
    try { return localStorage.getItem(KEY_USER_ID) || ''; } catch (e) { return ''; }
  }

  function _key() {
    const uid = _uid();
    return uid ? `${STORAGE_BASE}:${uid}` : STORAGE_BASE;
  }

  // ── One-time adoption of the pre-identity save ────────────────────────────
  // The first student to log in on a device claims the existing anonymous
  // save. The legacy blob is stamped `meta.adoptedBy` and LEFT IN PLACE: it
  // is the rollback path, and the stamp stops a second student claiming it.

  let _adoptDone = false;

  function _adoptLegacy() {
    if (_adoptDone) return;
    const uid = _uid();
    if (!uid) return;                 // not identified yet — retry on next call
    _adoptDone = true;
    try {
      const nsKey = `${STORAGE_BASE}:${uid}`;
      if (localStorage.getItem(nsKey) !== null) return;  // already has own save
      const legacy = localStorage.getItem(STORAGE_BASE);
      if (legacy === null) return;                       // nothing to adopt
      const parsed = JSON.parse(legacy);
      if (parsed && parsed.meta && parsed.meta.adoptedBy) return;  // claimed
      if (!parsed.meta) parsed.meta = {};
      parsed.meta.adoptedBy = uid;
      const stamped = JSON.stringify(parsed);
      localStorage.setItem(nsKey, stamped);
      localStorage.setItem(STORAGE_BASE, stamped);
      console.log('[BoohaSaveFile] Legacy save adopted by', uid);
    } catch (e) {
      console.error('[BoohaSaveFile] Legacy adoption failed:', e);
    }
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
    if (save.version < 2) {
      // Add new sections without touching existing data
      if (!save.meta) {
        save.meta = { lastWeeklyKey: '', allTimeStars: 0 };
      }
      if (!save.meta.lastWeeklyKey) save.meta.lastWeeklyKey = '';
      
      if (typeof save.meta.allTimeStars !== 'number') save.meta.allTimeStars = 0;
      if (!save.meta.dayLog)  save.meta.dayLog  = {};
      if (!save.meta.weekLog) save.meta.weekLog = {};
      if (typeof save.meta.lastActivityTs !== 'number') save.meta.lastActivityTs = 0;
      

      if (!save.weekly) {
        save.weekly = {
          completedGames:     {},
          gameScores:         {},
          gameStars:          {},
          unlockedBonusGames: {},
          wanderers:          [],
        };
      }
      if (!save.collection) {
        save.collection = { wanderers: [] };
      }
      save.version = 2;
    }
    return save;
  }

  // ── Core read / write ─────────────────────────────────────────────────────
  function load() {
    try {
      _adoptLegacy();
      const raw = localStorage.getItem(_key());
      if (!raw) return _defaultSave();
      const parsed = JSON.parse(raw);
      return _migrate(parsed);
    } catch (e) {
      console.error('[BoohaSaveFile] Load error:', e);
      return _defaultSave();
    }
  }

  function save(data) {
    try {
      data.updatedAt = Date.now();
      data.version   = SAVE_VERSION;
      _adoptLegacy();
      localStorage.setItem(_key(), JSON.stringify(data));
      document.dispatchEvent(new CustomEvent('booha:saved', { detail: data }));
      return true;
    } catch (e) {
      console.error('[BoohaSaveFile] Write error:', e);
      return false;
    }
  }

  function clear() {
    localStorage.removeItem(_key());
    document.dispatchEvent(new Event('booha:saveCleared'));
  }

  function exists() {
    _adoptLegacy();
    return localStorage.getItem(_key()) !== null;
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
    return JSON.stringify(load(), null, 2);
  }

  function importJSON(jsonString) {
    try {
      const incoming = JSON.parse(jsonString);
      if (typeof incoming !== 'object' || Array.isArray(incoming)) {
        return { ok: false, error: 'Invalid save data.' };
      }
      const migrated = _migrate(incoming);
      save(migrated);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    load, save, clear, exists,
    patch, patchDeep,
    resetWeekly,
    exportJSON, importJSON,
    init() {
      if (!exists()) save(_defaultSave());
    }
  };

  BoohaAdventure.registerSystem('saveFile', api);
  return api;
})();

window.BoohaSaveFile = BoohaSaveFile;
