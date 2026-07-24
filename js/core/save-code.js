
/**
 * save-code.js
 * The Booha Adventure — Memory Code System
 * Encodes the save into a short shareable text string and decodes it back.
 *
 * Format: base64(JSON) prefixed with "BOOHA-"
 * Human-friendly, copy-pasteable, cross-device compatible.
 */

const BoohaSaveCode = (() => {
  'use strict';

  const PREFIX      = 'BOOHA-';
  const CHUNK_SIZE  = 40; // characters per display line

  // ── Encode ────────────────────────────────────────────────────────────────
  /**
   * Generates a Memory Code string from the current save.
   * @returns {string} e.g. "BOOHA-eyJ2ZXJzaW9u..."
   */
  function encode() {
    const json    = BoohaAdventure.save.exportJSON();
    const b64     = btoa(unescape(encodeURIComponent(json)));
    return PREFIX + b64;
  }

  /**
   * Returns the code split into fixed-width chunks for easy display / copying.
   * @returns {string[]}
   */
  function encodeChunked() {
    const code   = encode();
    const chunks = [];
    for (let i = 0; i < code.length; i += CHUNK_SIZE) {
      chunks.push(code.slice(i, i + CHUNK_SIZE));
    }
    return chunks;
  }

  // ── Decode ────────────────────────────────────────────────────────────────
  /**
   * Imports a Memory Code string into the save.
   * Strips whitespace and the prefix, then decodes.
   * @param {string} codeInput
   * @returns {{ ok: boolean, error?: string }}
   */
  function decode(codeInput) {
    return {
      ok: false,
      error: 'Memory Code restore has been retired. Progress now follows your login.'
    };
  }

  // ── Clipboard helpers ─────────────────────────────────────────────────────
  async function copyToClipboard() {
    const code = encode();
    try {
      await navigator.clipboard.writeText(code);
      return { ok: true };
    } catch (e) {
      // Fallback: select a textarea
      return { ok: false, error: 'Clipboard unavailable. Please copy manually.' };
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      return decode(text);
    } catch (e) {
      return { ok: false, error: 'Could not read clipboard.' };
    }
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    encode,
    encodeChunked,
    decode,
    copyToClipboard,
    pasteFromClipboard,
    init() { /* no async setup needed */ }
  };

  BoohaAdventure.registerSystem('saveCode', api);
  return api;
})();

window.BoohaSaveCode = BoohaSaveCode;
