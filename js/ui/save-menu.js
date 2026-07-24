
/**
 * save-menu.js
 * The Booha Adventure — Save Menu UI Controller
 * Wires the save-panel.html UI to the core save systems.
 * Include after adventure-core.js and all core systems.
 */

const BoohaSaveMenu = (() => {
  'use strict';

  let _panel      = null;
  let _overlay    = null;
  let _isOpen     = false;

  // ── Panel injection ───────────────────────────────────────────────────────
  /**
   * Load save-panel.html into the page via fetch and inject it into <body>.
   * Falls back to inline HTML if fetch isn't available.
   */
  async function _injectPanel() {
    if (document.getElementById('booha-save-panel')) return; // already injected

    try {
      // Try to fetch the external panel (works when served, not file://)
      const depth = window.location.pathname.split('/').filter(Boolean).length;
      const prefix = depth > 0 ? '../'.repeat(depth) : './';
      const res = await fetch('/the-booha-adventure/ui/save-panel.html');
      if (res.ok) {
        const html = await res.text();
        document.body.insertAdjacentHTML('beforeend', html);
        _bindEvents();
        return;
      }
    } catch (_) { /* fall through to inline */ }

    // Inline fallback (same markup as save-panel.html)
    document.body.insertAdjacentHTML('beforeend', _inlineHTML());
    _bindEvents();
  }

  function _inlineHTML() {
    return `
<div id="booha-save-overlay" class="booha-overlay" aria-hidden="true"></div>
<aside id="booha-save-panel" class="booha-save-panel" role="dialog" aria-label="Save Menu" aria-hidden="true">
  <button id="booha-save-close" class="booha-close-btn" aria-label="Close save menu">✕</button>
  <h2 class="booha-panel-title">Adventure Save</h2>

  <section class="booha-save-section">
    <h3>Save &amp; Load</h3>
    <button id="booha-btn-export-file" class="booha-btn">📥 Export Save File</button>
    <button id="booha-btn-import-file" class="booha-btn" hidden>📤 Import Save File</button>
  </section>

  <section class="booha-save-section">
    <h3>Memory Code</h3>
    <button id="booha-btn-show-code"  class="booha-btn">🔑 Show Memory Code</button>
    <button id="booha-btn-enter-code" class="booha-btn" hidden>📋 Enter Memory Code</button>
  </section>

  <section class="booha-save-section booha-danger-zone" hidden>
    <h3>Reset</h3>
    <button id="booha-btn-reset" class="booha-btn booha-btn-danger">🗑 Reset Adventure</button>
  </section>

  <p class="booha-save-status" id="booha-save-status" aria-live="polite"></p>
</aside>`;
  }

  // ── Open / Close ──────────────────────────────────────────────────────────
  function open() {
    _panel   = document.getElementById('booha-save-panel');
    _overlay = document.getElementById('booha-save-overlay');
    if (!_panel) return;

    _panel.setAttribute('aria-hidden', 'false');
    _panel.classList.add('booha-save-panel--open');
    _overlay.setAttribute('aria-hidden', 'false');
    _overlay.classList.add('booha-overlay--visible');
    _isOpen = true;

    document.dispatchEvent(new Event('booha:saveMenuOpened'));
  }

  function close() {
    if (!_panel) return;
    _panel.setAttribute('aria-hidden', 'true');
    _panel.classList.remove('booha-save-panel--open');
    _overlay.setAttribute('aria-hidden', 'true');
    _overlay.classList.remove('booha-overlay--visible');
    _isOpen = false;
  }

  function toggle() { _isOpen ? close() : open(); }

  // ── Status message ────────────────────────────────────────────────────────
  function _setStatus(msg, type = 'info') {
    const el = document.getElementById('booha-save-status');
    if (!el) return;
    el.textContent = msg;
    el.className   = `booha-save-status booha-status--${type}`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.textContent = ''; el.className = 'booha-save-status'; }, 3500);
  }

  // ── Event binding ─────────────────────────────────────────────────────────
  function _bindEvents() {
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    on('booha-save-close',     close);
    on('booha-save-overlay',   close);

    on('booha-btn-export-file', () => {
      BoohaAdventure.utils && BoohaAdventure.utils.downloadSaveFile
        ? BoohaAdventure.utils.downloadSaveFile()
        : BoohaSaveUtils.downloadSaveFile();
      _setStatus('Save file downloaded!', 'ok');
    });

    on('booha-btn-import-file', async () => {
      const utils = window.BoohaSaveUtils;
      if (!utils) return;
      const { ok, error } = await utils.uploadSaveFile();
      _setStatus(ok ? 'Save imported! ✓' : `Import failed: ${error}`, ok ? 'ok' : 'error');
    });

    on('booha-btn-show-code', () => {
      if (window.BoohaMemoryCodeUI) BoohaMemoryCodeUI.showCode();
    });

    on('booha-btn-enter-code', () => {
      if (window.BoohaMemoryCodeUI) BoohaMemoryCodeUI.promptEnterCode();
    });

    on('booha-btn-reset', async () => {
      const ok = window.BoohaSaveUtils && BoohaSaveUtils.resetAll(true);
      if (ok) {
        _setStatus('Adventure reset.', 'warn');
        setTimeout(() => window.location.reload(), 1200);
      }
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _isOpen) close();
    });
  }

  // ── Toggle button injection ───────────────────────────────────────────────
  /**
   * Injects a floating save button into the page.
   * Alternatively, call BoohaSaveMenu.toggle() from your own button.
   */
  function injectToggleButton() {
    if (document.getElementById('booha-save-toggle')) return;
    const btn         = document.createElement('button');
    btn.id            = 'booha-save-toggle';
    btn.className     = 'booha-save-toggle-btn';
    btn.innerHTML     = '💾';
    btn.title         = 'Save Menu';
    btn.setAttribute('aria-label', 'Open save menu');
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    open,
    close,
    toggle,
    injectToggleButton,
    async init() {
      await _injectPanel();
      injectToggleButton();
    }
  };

  BoohaAdventure.registerSystem('saveMenu', api);
  return api;
})();

window.BoohaSaveMenu = BoohaSaveMenu;
