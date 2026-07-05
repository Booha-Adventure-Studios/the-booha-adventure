
/**
 * save-file.js
 * The Booha Adventure — Save File (localStorage layer)
 * v2: adds weekly, meta, and collection sections.
 */

const BoohaSaveFile = (() => {
  'use strict';

  const STORAGE_KEY  = 'booha_save';
  const SAVE_VERSION = 2;

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
      const raw = localStorage.getItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      document.dispatchEvent(new CustomEvent('booha:saved', { detail: data }));
      return true;
    } catch (e) {
      console.error('[BoohaSaveFile] Write error:', e);
      return false;
    }
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    document.dispatchEvent(new Event('booha:saveCleared'));
  }

  function exists() {
    return localStorage.getItem(STORAGE_KEY) !== null;
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
