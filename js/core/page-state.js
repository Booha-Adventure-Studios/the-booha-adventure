
/**
 * page-state.js
 * The Booha Adventure — Page State System
 * Tracks visited pages, player spawn points, and return positions.
 * Call PageState.enter() at the top of every page for automatic tracking.
 */

const BoohaPageState = (() => {
  'use strict';

  // ── Auto-detect current page ID ───────────────────────────────────────────
  function _currentPageId() {
    // Use the filename without extension as a stable page ID
    const path = window.location.pathname;
    const file = path.split('/').pop() || 'index';
    return file.replace(/\.html?$/, '') || 'index';
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  function _getPageStates() {
    return BoohaAdventure.save.load().pageState || {};
  }

  function _defaultPageEntry(pageId) {
    return {
      pageId,
      visited:      false,
      visitCount:   0,
      firstVisitAt: null,
      lastVisitAt:  null,
      spawnPoint:   null,   // { x, y } or named string e.g. "door_north"
      returnPos:    null,   // where to return to when leaving a sub-area
      flags:        {},     // arbitrary page-specific boolean flags
    };
  }

  function getPage(pageId) {
    const states = _getPageStates();
    return states[pageId] || _defaultPageEntry(pageId);
  }

  function totalVisited() {
    const states = _getPageStates();
    return Object.values(states).filter(p => p.visited).length;
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  function _savePage(entry) {
    BoohaAdventure.save.patch('pageState', { [entry.pageId]: entry });
  }

  // ── enter() — call at the top of every page ───────────────────────────────
  /**
   * Marks the current page as visited and updates visit counters.
   * @param {object} [opts]
   *   opts.pageId      — override auto-detected page ID
   *   opts.spawnPoint  — starting position/label for this visit
   * @returns {object} The updated page entry
   */
  function enter(opts = {}) {
    const pageId = opts.pageId || _currentPageId();
    const entry  = getPage(pageId);
    const now    = Date.now();

    entry.visited      = true;
    entry.visitCount   = (entry.visitCount || 0) + 1;
    entry.lastVisitAt  = now;
    if (!entry.firstVisitAt) entry.firstVisitAt = now;

    if (opts.spawnPoint !== undefined) entry.spawnPoint = opts.spawnPoint;

    _savePage(entry);

    // Update page-visit stat
    if (BoohaAdventure.stats) {
      BoohaAdventure.stats.set(
        BoohaAdventure.stats.KEYS.PAGES_VISITED,
        totalVisited()
      );
    }

    // Check unlocks that depend on page visits
    if (BoohaAdventure.unlocks) BoohaAdventure.unlocks.checkAll();

    document.dispatchEvent(new CustomEvent('booha:pageEntered', { detail: { pageId, entry } }));
    return entry;
  }

  // ── Spawn point management ────────────────────────────────────────────────
  function setSpawnPoint(point, pageId) {
    const id    = pageId || _currentPageId();
    const entry = getPage(id);
    entry.spawnPoint = point;
    _savePage(entry);
  }

  function getSpawnPoint(pageId) {
    return getPage(pageId || _currentPageId()).spawnPoint;
  }

  // ── Return position management ────────────────────────────────────────────
  /**
   * Save where the player should return to when they exit a sub-area.
   * e.g. setReturnPos('world_map', { x: 3, y: 7 })
   */
  function setReturnPos(returnTo, pageId) {
    const id    = pageId || _currentPageId();
    const entry = getPage(id);
    entry.returnPos = returnTo;
    _savePage(entry);
  }

  function getReturnPos(pageId) {
    return getPage(pageId || _currentPageId()).returnPos;
  }

  // ── Page flags (arbitrary booleans) ──────────────────────────────────────
  function setFlag(flagName, value = true, pageId) {
    const id    = pageId || _currentPageId();
    const entry = getPage(id);
    entry.flags = entry.flags || {};
    entry.flags[flagName] = value;
    _savePage(entry);
  }

  function getFlag(flagName, pageId) {
    return !!(getPage(pageId || _currentPageId()).flags || {})[flagName];
  }

  // ── Check if a page has been visited ─────────────────────────────────────
  function hasVisited(pageId) {
    return getPage(pageId || _currentPageId()).visited;
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    enter,
    getPage,
    hasVisited,
    totalVisited,
    setSpawnPoint,
    getSpawnPoint,
    setReturnPos,
    getReturnPos,
    setFlag,
    getFlag,
    currentPageId: _currentPageId,
    init() {
      // Automatically track the current page on load
      enter();
    }
  };

  BoohaAdventure.registerSystem('pageState', api);
  return api;
})();

window.BoohaPageState = BoohaPageState;
