
/**
 * week-system.js
 * The Booha Adventure — Week System
 * Manages curriculum week state: current, last, next, and the 3-week active window.
 * Designed to integrate with calendar.js when present.
 */

const BoohaWeekSystem = (() => {
  'use strict';

  const DEFAULT_WEEK      = 1;
  const MAX_WEEK          = 9;
  const ACTIVE_WINDOW     = 3;   // player can access current ± adjacent weeks

  // ── Read / Write week data ────────────────────────────────────────────────
  function _getWeekData() {
    const save = BoohaAdventure.save.load();
    return save.weekData || { currentWeek: DEFAULT_WEEK, lastVisited: null };
  }

  function _saveWeekData(data) {
    BoohaAdventure.save.patch('weekData', data);
  }

  // ── Current week ──────────────────────────────────────────────────────────
  function currentWeek() {
    return _getWeekData().currentWeek || DEFAULT_WEEK;
  }

  function lastWeek() {
    return Math.max(1, currentWeek() - 1);
  }

  function nextWeek() {
    return Math.min(MAX_WEEK, currentWeek() + 1);
  }

  // ── 3-week active window ─────────────────────────────────────────────────
  /**
   * Returns an array of week numbers the player currently has access to.
   * Always includes currentWeek and any adjacent weeks within [1, MAX_WEEK].
   * Window size = ACTIVE_WINDOW (default 3: last, current, next).
   */
  function activeWeeks() {
    const cw    = currentWeek();
    const half  = Math.floor(ACTIVE_WINDOW / 2);
    const weeks = [];
    for (let w = cw - half; w <= cw + half; w++) {
      if (w >= 1 && w <= MAX_WEEK) weeks.push(w);
    }
    return weeks;
  }

  /**
   * Is a given week accessible to the player right now?
   */
  function isWeekActive(week) {
    return activeWeeks().includes(week);
  }

  /**
   * Is a given game accessible to the player right now?
   */
  function isGameActive(gameId) {
    const game = BoohaAdventure.registry && BoohaAdventure.registry.getById(gameId);
    if (!game) return false;
    return isWeekActive(game.week);
  }

  // ── Advance to a new week ─────────────────────────────────────────────────
  /**
   * Advance the current week by 1 (or to a specific week).
   * Will not exceed MAX_WEEK.
   * @param {number} [toWeek]  Specific week to jump to
   */
  function advanceWeek(toWeek) {
    const data = _getWeekData();
    const next = toWeek !== undefined
      ? Math.min(MAX_WEEK, Math.max(1, toWeek))
      : Math.min(MAX_WEEK, (data.currentWeek || DEFAULT_WEEK) + 1);

    data.currentWeek  = next;
    data.lastVisited  = Date.now();
    _saveWeekData(data);

    document.dispatchEvent(new CustomEvent('booha:weekAdvanced', { detail: { week: next } }));
    if (BoohaAdventure.unlocks) BoohaAdventure.unlocks.checkAll();
    return next;
  }

  // ── Calendar.js integration ───────────────────────────────────────────────
  /**
   * If a calendar.js is present and exposes window.BoohaCalendar,
   * sync the week from it. calendar.js should expose:
   *   BoohaCalendar.getWeekNumber() → number
   */
  function syncFromCalendar() {
    if (window.BoohaCalendar && typeof window.BoohaCalendar.getWeekNumber === 'function') {
      const calWeek = window.BoohaCalendar.getWeekNumber();
      if (calWeek && calWeek !== currentWeek()) {
        advanceWeek(calWeek);
        return true;
      }
    }
    return false;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  function getSummary() {
    return {
      currentWeek: currentWeek(),
      lastWeek:    lastWeek(),
      nextWeek:    nextWeek(),
      activeWeeks: activeWeeks(),
      maxWeek:     MAX_WEEK,
    };
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    currentWeek,
    lastWeek,
    nextWeek,
    activeWeeks,
    isWeekActive,
    isGameActive,
    advanceWeek,
    syncFromCalendar,
    getSummary,
    init() {
      // Stamp last visited
      const data = _getWeekData();
      data.lastVisited = Date.now();
      _saveWeekData(data);

      // Attempt calendar sync
      syncFromCalendar();
    }
  };

  BoohaAdventure.registerSystem('weekSystem', api);
  return api;
})();

window.BoohaWeekSystem = BoohaWeekSystem;
