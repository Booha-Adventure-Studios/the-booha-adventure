
/**
 * memory-code-ui.js
 * The Booha Adventure — Memory Code UI
 * Handles the modal display for showing/entering Memory Codes.
 */

const BoohaMemoryCodeUI = (() => {
  'use strict';

  // ── Show code modal ───────────────────────────────────────────────────────
  function showCode() {
    const code   = window.BoohaSaveCode ? BoohaSaveCode.encode() : '(code system not loaded)';
    const chunks = window.BoohaSaveCode ? BoohaSaveCode.encodeChunked() : [code];

    const modal = _createModal('Your Memory Code', `
      <p class="booha-code-instructions">Write down or copy this code to save your adventure across devices.</p>
      <div class="booha-code-display" id="booha-code-text">${chunks.join('\n')}</div>
      <div class="booha-code-actions">
        <button id="booha-copy-code-btn" class="booha-btn">📋 Copy Code</button>
      </div>
      <p class="booha-code-status" id="booha-copy-status" aria-live="polite"></p>
    `);

    document.body.appendChild(modal);

    document.getElementById('booha-copy-code-btn').addEventListener('click', async () => {
      if (!window.BoohaSaveCode) return;
      const { ok, error } = await BoohaSaveCode.copyToClipboard();
      const status = document.getElementById('booha-copy-status');
      if (status) {
        status.textContent = ok ? 'Copied! ✓' : error;
        status.className   = `booha-code-status ${ok ? 'booha-status--ok' : 'booha-status--error'}`;
      }
    });
  }

  // ── Enter code modal ──────────────────────────────────────────────────────
  function promptEnterCode() {
    const modal = _createModal('Enter Memory Code', `
      <p class="booha-code-instructions">Paste or type your Memory Code below to restore your adventure.</p>
      <textarea
        id="booha-code-input"
        class="booha-code-input"
        rows="6"
        placeholder="BOOHA-eyJ2ZXJzaW9u..."
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      ></textarea>
      <div class="booha-code-actions">
        <button id="booha-paste-code-btn" class="booha-btn">📋 Paste from Clipboard</button>
        <button id="booha-submit-code-btn" class="booha-btn booha-btn-primary">✓ Load Code</button>
      </div>
      <p class="booha-code-status" id="booha-enter-status" aria-live="polite"></p>
    `);

    document.body.appendChild(modal);

    document.getElementById('booha-paste-code-btn').addEventListener('click', async () => {
      if (!window.BoohaSaveCode) return;
      const textarea = document.getElementById('booha-code-input');
      try {
        const text = await navigator.clipboard.readText();
        textarea.value = text;
      } catch (_) {
        _setModalStatus('booha-enter-status', 'Paste manually — clipboard unavailable.', 'error');
      }
    });

    document.getElementById('booha-submit-code-btn').addEventListener('click', () => {
      const input = document.getElementById('booha-code-input');
      if (!input || !input.value.trim()) {
        _setModalStatus('booha-enter-status', 'Please enter a code first.', 'error');
        return;
      }
      if (!window.BoohaSaveCode) return;
      const { ok, error } = BoohaSaveCode.decode(input.value.trim());
      if (ok) {
        _setModalStatus('booha-enter-status', 'Code loaded! Reloading…', 'ok');
        setTimeout(() => { _closeModal(modal); window.location.reload(); }, 1200);
      } else {
        _setModalStatus('booha-enter-status', error || 'Invalid code.', 'error');
      }
    });
  }

  // ── Unlock notification toast ─────────────────────────────────────────────
  /**
   * Show a toast when an unlock fires.
   * Auto-dismisses after 4 seconds.
   */
  function showUnlockToast(unlock) {
    const toast       = document.createElement('div');
    toast.className   = 'booha-unlock-toast';
    toast.innerHTML   = `
      <span class="booha-unlock-icon">🏆</span>
      <div>
        <strong>${_esc(unlock.name)}</strong>
        <p>${_esc(unlock.description)}</p>
      </div>
    `;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('booha-unlock-toast--visible'));

    setTimeout(() => {
      toast.classList.remove('booha-unlock-toast--visible');
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function _setModalStatus(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className   = `booha-code-status booha-status--${type}`;
  }

  function _closeModal(modal) {
    modal.classList.remove('booha-modal--visible');
    setTimeout(() => modal.remove(), 300);
  }

  function _createModal(title, bodyHTML) {
    const modal      = document.createElement('div');
    modal.className  = 'booha-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', title);
    modal.innerHTML  = `
      <div class="booha-modal-inner">
        <button class="booha-close-btn booha-modal-close" aria-label="Close">✕</button>
        <h2 class="booha-modal-title">${_esc(title)}</h2>
        ${bodyHTML}
      </div>
    `;

    modal.querySelector('.booha-modal-close').addEventListener('click', () => _closeModal(modal));
    modal.addEventListener('click', e => { if (e.target === modal) _closeModal(modal); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { _closeModal(modal); document.removeEventListener('keydown', handler); }
    });

    requestAnimationFrame(() => modal.classList.add('booha-modal--visible'));
    return modal;
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    showCode,
    promptEnterCode,
    showUnlockToast,
    init() {
      // Listen for unlock events to show toasts automatically
      document.addEventListener('booha:unlocked', e => {
        showUnlockToast(e.detail);
      });
    }
  };

  BoohaAdventure.registerSystem('memoryCodeUI', api);
  return api;
})();

window.BoohaMemoryCodeUI = BoohaMemoryCodeUI;
