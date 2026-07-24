
/**
 * save-utils.js
 * The Booha Adventure — Save Utilities
 * Exportable .json file downloads, file upload imports, and shared helpers.
 */

const BoohaSaveUtils = (() => {
  'use strict';

  // ── Download save as .json file ───────────────────────────────────────────
  function downloadSaveFile() {
    const json     = BoohaAdventure.save.exportJSON();
    const blob     = new Blob([json], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const ts       = new Date().toISOString().slice(0, 10);
    a.href         = url;
    a.download     = `booha-save-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Upload a .json file and import it ────────────────────────────────────
  /**
   * Opens a file picker. Returns a Promise<{ ok, error }>.
   */
  function uploadSaveFile() {
    return Promise.resolve({
      ok: false,
      error: 'Save import has been retired. Progress now follows your login.'
    });
  }

  // ── Reset / wipe everything ───────────────────────────────────────────────
  function resetAll(confirm = true) {
    window.alert('Progress reset is teacher-managed now that saves follow your login.');
    return false;
  }

  // ── Deep merge helper (used by other systems) ─────────────────────────────
  function deepMerge(target, source) {
    const out = Object.assign({}, target);
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        out[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        out[key] = source[key];
      }
    });
    return out;
  }

  // ── Timestamp formatter ───────────────────────────────────────────────────
  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    downloadSaveFile,
    uploadSaveFile,
    resetAll,
    deepMerge,
    formatDate,
    init() { /* no async setup needed */ }
  };

  BoohaAdventure.registerSystem('saveUtils', api);
  return api;
})();

window.BoohaSaveUtils = BoohaSaveUtils;
