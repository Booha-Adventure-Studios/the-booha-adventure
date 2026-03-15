
/**
 * save-file.js
 * The Booha Adventure — Save File (localStorage layer)
 * Handles all direct read/write to localStorage with versioning & migration.
 */

const BoohaSaveFile = (() => {
  'use strict';

  const STORAGE_KEY  = 'booha_save';
  const SAVE_VERSION = 1;

  // ── Default save structure ────────────────────────────────────────────────
  function _defaultSave() {
    return {
      version:     SAVE_VERSION,
      createdAt:   Date.now(),
      updatedAt:   Date.now(),
      playerName:  '',

      scores:      {},   // { [gameId]: { highScore, stars, completed, attempts } }
      unlocks:     {},   // { [itemId]: true }
      stats:       {},   // arbitrary stat counters
      collectibles:{},   // { [collectibleId]: { found, foundAt } }
      pageState:   {},   // { [pageId]: { visited, spawnPoint, returnPos, ... } }
      weekData:    {},   // { currentWeek, lastVisited }
    };
  }

  // ── Migrate older saves to current version ────────────────────────────────
  function _migrate(save) {
    // v0 → v1: ensure all top-level keys exist
    if (!save.version || save.version < 1) {
      save = Object.assign(_defaultSave(), save);
      save.version = 1;
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
  /**
   * Update a nested section of the save without loading the whole object.
   * @param {string} section  Top-level key (e.g. 'scores', 'unlocks')
   * @param {object} patch    Key-value pairs to merge into that section
   */
  function patch(section, patch) {
    const data = load();
    if (typeof data[section] !== 'object') data[section] = {};
    Object.assign(data[section], patch);
    return save(data);
  }

  // ── Export raw JSON string ────────────────────────────────────────────────
  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  /**
   * Import a raw JSON string, validates version, merges into current save.
   * Returns { ok, error }
   */
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
    load, save, clear, exists, patch, exportJSON, importJSON,
    init() {
      // Ensure a save record exists so all systems have a base to work from
      if (!exists()) save(_defaultSave());
    }
  };

  BoohaAdventure.registerSystem('saveFile', api);
  return api;
})();

window.BoohaSaveFile = BoohaSaveFile;
