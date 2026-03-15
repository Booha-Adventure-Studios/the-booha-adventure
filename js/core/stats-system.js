
/**
 * stats-system.js
 * The Booha Adventure — Stats System
 * Tracks arbitrary numeric counters and named stats across the adventure.
 * Lightweight: any game can increment any stat by name.
 */

const BoohaStatsSystem = (() => {
  'use strict';

  function _getStats() {
    return BoohaAdventure.save.load().stats || {};
  }

  // ── Core operations ───────────────────────────────────────────────────────

  /**
   * Increment a stat by a given amount (default 1).
   * Creates the stat if it doesn't exist.
   */
  function increment(key, amount = 1) {
    const stats = _getStats();
    stats[key]  = (stats[key] || 0) + amount;
    BoohaAdventure.save.patch('stats', stats);
    document.dispatchEvent(new CustomEvent('booha:statChanged', {
      detail: { key, value: stats[key], delta: amount }
    }));
    return stats[key];
  }

  /**
   * Set a stat to an exact value.
   */
  function set(key, value) {
    const stats = _getStats();
    stats[key]  = value;
    BoohaAdventure.save.patch('stats', stats);
    return value;
  }

  /**
   * Get a stat value (returns 0 if not set).
   */
  function get(key) {
    return _getStats()[key] || 0;
  }

  /**
   * Get all stats.
   */
  function getAll() {
    return { ..._getStats() };
  }

  /**
   * Record the max value seen for a stat.
   * Useful for "personal best" style tracking.
   */
  function recordMax(key, value) {
    const current = get(key);
    if (value > current) {
      set(key, value);
      return true; // new max
    }
    return false;
  }

  // ── Predefined stat keys (use these for consistency) ─────────────────────
  const KEYS = {
    TOTAL_PLAYS:       'totalPlays',
    TOTAL_SCORE:       'totalScoreAllTime',
    PAGES_VISITED:     'pagesVisited',
    COLLECTIBLES_FOUND:'collectiblesFound',
    DAYS_PLAYED:       'daysPlayed',
    LAST_PLAYED_DATE:  'lastPlayedDate',
  };

  // ── Daily play tracking ───────────────────────────────────────────────────
  function trackDailyPlay() {
    const today    = new Date().toDateString();
    const last     = get(KEYS.LAST_PLAYED_DATE);
    if (last !== today) {
      increment(KEYS.DAYS_PLAYED);
      set(KEYS.LAST_PLAYED_DATE, today);
    }
    increment(KEYS.TOTAL_PLAYS);
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    increment,
    set,
    get,
    getAll,
    recordMax,
    trackDailyPlay,
    KEYS,
    init() {
      trackDailyPlay();
    }
  };

  BoohaAdventure.registerSystem('statsSystem', api);
  return api;
})();

window.BoohaStatsSystem = BoohaStatsSystem;
