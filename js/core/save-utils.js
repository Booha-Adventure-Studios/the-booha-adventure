
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
    return new Promise((resolve) => {
      const input    = document.createElement('input');
      input.type     = 'file';
      input.accept   = '.json,application/json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return resolve({ ok: false, error: 'No file selected.' });
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = BoohaAdventure.save.importJSON(ev.target.result);
          resolve(result);
        };
        reader.onerror = () => resolve({ ok: false, error: 'File read error.' });
        reader.readAsText(file);
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
  }

  // ── Reset / wipe everything ───────────────────────────────────────────────
  function resetAll(confirm = true) {
    if (confirm && !window.confirm('Reset your entire Booha Adventure? This cannot be undone.')) {
      return false;
    }
    BoohaAdventure.save.clear();
    document.dispatchEvent(new Event('booha:reset'));
    return true;
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
