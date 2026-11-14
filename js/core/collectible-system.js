
/**
 * collectible-system.js
 * The Booha Adventure — Collectible System
 * Tracks hidden items found across all pages/games.
 * Definitions live in collectibles-data.js; pages call collect() when found.
 */

const BoohaCollectibleSystem = (() => {
  'use strict';

  const COLLECTIBLES = Array.isArray(window.BoohaCollectiblesData)
    ? window.BoohaCollectiblesData
    : [];

  const _byId = {};
  COLLECTIBLES.forEach(c => { _byId[c.id] = c; });

  // ── Read ──────────────────────────────────────────────────────────────────
  function _getCollectibles() {
    return BoohaAdventure.save.load().collectibles || {};
  }

  function isFound(id) {
    return !!_getCollectibles()[id];
  }

  function totalFound() {
    const found = _getCollectibles();
    return COLLECTIBLES.filter(c => !!found[c.id]).length;
  }

  function totalDefined() {
    return COLLECTIBLES.length;
  }

  function getAll() {
    const found = _getCollectibles();
    return COLLECTIBLES.map(c => ({
      ...c,
      found:   !!found[c.id],
      foundAt: found[c.id] ? found[c.id].foundAt : null,
    }));
  }

  // ── Collect ───────────────────────────────────────────────────────────────
  /**
   * Mark a collectible as found. No-op if already found.
   * @param {string} id
   * @returns {{ alreadyFound: bool, collectible }}
   */
  function collect(id) {
    if (!_byId[id]) {
      console.warn(`[BoohaCollectibleSystem] Unknown collectible: "${id}"`);
      return null;
    }

    const found = _getCollectibles();
    const alreadyFound = !!found[id];

    if (!alreadyFound) {
      found[id] = { foundAt: Date.now() };
      BoohaAdventure.save.patch('collectibles', found);

      // Update stat counter
      if (BoohaAdventure.stats) {
        BoohaAdventure.stats.increment(BoohaAdventure.stats.KEYS.COLLECTIBLES_FOUND);
      }

      const collectible = _byId[id];
      document.dispatchEvent(new CustomEvent('booha:collectibleFound', {
        detail: { collectible, foundAt: found[id].foundAt }
      }));

      // Trigger unlock checks
      if (BoohaAdventure.unlocks) BoohaAdventure.unlocks.checkAll();
    }

    return { alreadyFound, collectible: _byId[id] };
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    collect,
    isFound,
    totalFound,
    totalDefined,
    getAll,
    init() { /* reads from save, no setup needed */ }
  };

  BoohaAdventure.registerSystem('collectibleSystem', api);
  return api;
})();

window.BoohaCollectibleSystem = BoohaCollectibleSystem;
