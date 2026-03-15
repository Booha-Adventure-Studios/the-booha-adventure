
/**
 * collectible-system.js
 * The Booha Adventure — Collectible System
 * Tracks hidden items found across all pages/games.
 * Define collectibles here; pages call collect() when found.
 */

const BoohaCollectibleSystem = (() => {
  'use strict';

  /**
   * COLLECTIBLE DEFINITIONS
   * id       — unique key stored in save
   * name     — display name
   * hint     — vague hint for the UI (don't spoil it)
   * page     — which page/game it's found on
   * week     — curriculum week
   */
  const COLLECTIBLES = [
    {
      id:   'booha_stamp_1',
      name: 'Booha Stamp #1',
      hint: 'Hidden in the maze…',
      page: 'maze',
      week: 1,
    },
    {
      id:   'booha_stamp_2',
      name: 'Booha Stamp #2',
      hint: 'Somewhere in karasuki…',
      page: 'karasuki',
      week: 2,
    },
    {
      id:   'secret_scroll',
      name: 'Secret Scroll',
      hint: 'Finish your homework perfectly.',
      page: 'homework',
      week: 3,
    },
    // Add more as you build pages
  ];

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
    return Object.keys(_getCollectibles()).length;
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
