/**
 * curriculum.js
 * The student's saved curriculum and its short-lived device mirror.
 *
 * The save blob is canonical and syncs with the student's Adventure record.
 * booha_last_curr remains only as a compatibility bridge for older readers and
 * is cleared whenever identity changes.
 */
const BoohaCurriculum = (() => {
  'use strict';

  const VALID = Object.freeze(['pb', 'br', 'bc']);
  const MIRROR_KEY = 'booha_last_curr';

  function isValid(value) {
    return VALID.includes(value);
  }

  function readSaveCurriculum() {
    try {
      const value = window.BoohaAdventure?.save?.load?.()?.meta?.curriculum;
      return isValid(value) ? value : null;
    } catch (_) {
      return null;
    }
  }

  function readMirror() {
    try {
      const value = localStorage.getItem(MIRROR_KEY);
      return isValid(value) ? value : null;
    } catch (_) {
      return null;
    }
  }

  function get() {
    return readSaveCurriculum() || readMirror();
  }

  // Pre-Boo is the quiet first-run default. Only call this after the synced
  // save has been loaded, so a remembered Boo-riculum/Boo-continuum choice
  // can win before a blank student record is initialized.
  const DEFAULT = 'pb';
  function ensureDefault() {
    const saved = readSaveCurriculum();
    if (saved) return saved;
    set(DEFAULT);
    return DEFAULT;
  }

  function set(code) {
    if (!isValid(code)) return false;

    let saved = false;
    try {
      const data = window.BoohaAdventure?.save?.load?.();
      if (data && window.BoohaAdventure?.save?.save) {
        data.meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
        data.meta.curriculum = code;
        saved = window.BoohaAdventure.save.save(data) === true;
      }
    } catch (error) {
      console.warn('[curriculum] Could not save curriculum:', error);
    }

    // Keep the bridge current even when a transient save failure leaves the
    // student in this page. The next sync-ready hydration restores the
    // durable value as the authority.
    try { localStorage.setItem(MIRROR_KEY, code); } catch (_) {}
    return saved;
  }

  function clearMirror() {
    try { localStorage.removeItem(MIRROR_KEY); } catch (_) {}
  }

  function hydrateMirror() {
    const value = readSaveCurriculum();
    if (value) {
      try { localStorage.setItem(MIRROR_KEY, value); } catch (_) {}
    } else {
      clearMirror();
    }
    return value;
  }

  return Object.freeze({ VALID, isValid, get, set, clearMirror, hydrateMirror, ensureDefault });
})();

window.BoohaCurriculum = BoohaCurriculum;
