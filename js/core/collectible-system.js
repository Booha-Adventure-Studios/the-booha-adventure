
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
  const POOLS = Object.freeze(['standard', 'special']);
  const BLITZ_TYPES = Object.freeze(['vocab', 'sentences', 'questions']);
  const CURRICULA = Object.freeze(['pb', 'br', 'bc']);

  // ── Read ──────────────────────────────────────────────────────────────────
  function _getCollectibles() {
    return BoohaAdventure.save.load().collectibles || {};
  }

  function _currentWeek() {
    try {
      if (!window.CALENDAR || !CALENDAR.getCurrentCurriculumWeek) return null;
      const current = CALENDAR.getCurrentCurriculumWeek();
      const key = CALENDAR.getCurriculumWeekOccurrenceKey
        ? CALENDAR.getCurriculumWeekOccurrenceKey(current)
        : current.occurrenceKey;
      return key && current.weekStart ? { key, start: current.weekStart } : null;
    } catch (_) { return null; }
  }

  function _isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function _dailyDoneCount(meta, weekStart) {
    const checkIn = _isObject(meta.checkIn) ? meta.checkIn : {};
    const start = Date.parse(`${String(weekStart).slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(start)) return 0;
    let count = 0;
    for (let day = 0; day < 7; day++) {
      const key = new Date(start + day * 86400000).toISOString().slice(0, 10);
      if (_isObject(checkIn[key]) && checkIn[key].st === 'done') count++;
    }
    return count;
  }

  function _blitzTripleDone(meta, weekKey) {
    const blitz = meta.blitz;
    if (!_isObject(blitz) || blitz.weeklyKey !== weekKey || !_isObject(blitz.weekly)) return false;
    return CURRICULA.some(curriculum => BLITZ_TYPES.every(type => !!blitz.weekly[type]?.[curriculum]));
  }

  function _hash(value) {
    let hash = 2166136261;
    for (const char of String(value)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function _ownedIds(data) {
    const found = _isObject(data.collectibles) ? data.collectibles : {};
    return new Set(Object.keys(found).filter(id => !!found[id]));
  }

  // Items earned but still waiting in Karasuki. They are not drawn again
  // while they wait, so one item is never placed twice.
  function _waitingIds(meta) {
    const log = _isObject(meta.findsLog) ? meta.findsLog : {};
    const ids = new Set();
    Object.keys(log).forEach(week => {
      const entry = log[week];
      if (!_isObject(entry)) return;
      POOLS.forEach(pool => {
        const record = entry[pool];
        if (_isObject(record) && record.itemId && !record.foundAt) ids.add(record.itemId);
      });
    });
    return ids;
  }

  // A per-student seed kept in the student's own save (synced, never
  // device-wide). Each student draws in their own order, so a class does not
  // all find the same item in the same week.
  function _studentSeed(meta) {
    if (typeof meta.findsSeed !== 'string' || !meta.findsSeed) {
      meta.findsSeed = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    }
    return meta.findsSeed;
  }

  // Draw from items the student does not own and is not already hunting.
  // Only when that set is empty is a duplicate drawn: a second copy of an
  // owned item, shown as ×2 in the cabinet.
  function _draw(pool, weekKey, data, seed) {
    const poolItems = COLLECTIBLES.filter(item => item.pool === pool);
    if (!poolItems.length) return { item: null, duplicate: false };
    const owned = _ownedIds(data);
    const waiting = _waitingIds(data.meta || {});
    const available = poolItems.filter(item => !owned.has(item.id) && !waiting.has(item.id));
    const hash = _hash(`${seed}|${weekKey}|${pool}`);
    if (available.length) return { item: available[hash % available.length], duplicate: false };
    const copies = poolItems.filter(item => !waiting.has(item.id));
    if (!copies.length) return { item: null, duplicate: false };
    return { item: copies[hash % copies.length], duplicate: true };
  }

  function _emptyFindsEntry() {
    return { standard: null, special: null };
  }

  function _findsLog(meta) {
    if (!_isObject(meta.findsLog)) meta.findsLog = {};
    return meta.findsLog;
  }

  // The draw record for an item: the one still waiting to be picked up if
  // there is one (a duplicate copy), otherwise the most recent.
  function _earnedRecord(meta, id) {
    const log = _isObject(meta.findsLog) ? meta.findsLog : {};
    const weeks = Object.keys(log).sort().reverse();
    let latest = null;
    for (const week of weeks) {
      const entry = log[week];
      if (!_isObject(entry)) continue;
      for (const pool of POOLS) {
        if (!entry[pool] || entry[pool].itemId !== id) continue;
        const hit = { week, pool, entry: entry[pool] };
        if (!entry[pool].foundAt) return hit;
        if (!latest) latest = hit;
      }
    }
    return latest;
  }

  function pendingFinds() {
    const data = BoohaAdventure.save.load() || {};
    const log = _isObject(data.meta?.findsLog) ? data.meta.findsLog : {};
    const pending = [];
    Object.keys(log).sort().forEach(week => {
      const entry = log[week];
      if (!_isObject(entry)) return;
      POOLS.forEach(pool => {
        const record = entry[pool];
        if (!_isObject(record) || !record.itemId || record.foundAt) return;
        const item = _byId[record.itemId];
        if (item) pending.push({ week, pool, item, record });
      });
    });
    return pending;
  }

  function recordPlacement(id, placement) {
    if (!_byId[id] || !_isObject(placement)) return false;
    const x = Number(placement.x);
    const y = Number(placement.y);
    if (!placement.room || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const data = BoohaAdventure.save.load() || {};
    const earned = _earnedRecord(data.meta || {}, id);
    if (!earned || earned.entry.foundAt || earned.entry.room) return false;
    earned.entry.room = String(placement.room);
    earned.entry.x = Math.round(x);
    earned.entry.y = Math.round(y);
    earned.entry.placedAt = Date.now();
    if (!BoohaAdventure.save.save(data)) return false;
    if (window.BoohaSync && BoohaSync.checkpoint) {
      try { BoohaSync.checkpoint('adventure'); } catch (_) {}
    }
    return true;
  }

  /**
   * Evaluate both permanent oddity channels after a completed Daily Check or
   * Blitz clear. This records the draw, not the physical Karasuki pickup.
   */
  function evaluateWeekly() {
    const current = _currentWeek();
    const save = BoohaAdventure.save;
    if (!current || !save || typeof save.save !== 'function') return [];

    const data = save.load() || {};
    const meta = _isObject(data.meta) ? data.meta : {};
    const log = _findsLog(meta);
    const entry = _isObject(log[current.key]) ? log[current.key] : _emptyFindsEntry();
    const dailyCount = _dailyDoneCount(meta, current.start);
    const blitzDone = _blitzTripleDone(meta, current.key);
    const awards = [];
    const now = Date.now();

    const channels = [
      { pool: 'standard', eligible: dailyCount >= 3 && blitzDone },
      { pool: 'special', eligible: dailyCount >= 7 },
    ];
    const seed = _studentSeed(meta);
    data.meta = meta;
    channels.forEach(({ pool, eligible }) => {
      if (!eligible || entry[pool]) return;
      const draw = _draw(pool, current.key, data, seed);
      if (!draw.item) return;
      const record = {
        itemId: draw.item.id,
        earnedAt: now,
        foundAt: null,
        duplicate: draw.duplicate,
      };
      entry[pool] = record;
      awards.push({ pool, item: draw.item || null, record, week: current.key });
    });

    if (!awards.length) return [];
    log[current.key] = entry;
    meta.findsLog = log;
    data.meta = meta;
    if (!save.save(data)) return [];

    if (window.BoohaSync && BoohaSync.checkpoint) {
      try { BoohaSync.checkpoint('adventure'); } catch (_) {}
    }
    document.dispatchEvent(new CustomEvent('booha:collectibleEarned', {
      detail: { awards },
    }));
    return awards;
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
      copies:  found[c.id] ? Math.max(1, Number(found[c.id].copies) || 1) : 0,
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

    const data = BoohaAdventure.save.load() || {};
    const found = _isObject(data.collectibles) ? data.collectibles : {};
    const alreadyFound = !!found[id];

    // A duplicate draw waiting in Karasuki: picking it up adds a copy (×2).
    if (alreadyFound) {
      const waiting = _earnedRecord(data.meta || {}, id);
      if (!waiting || waiting.entry.foundAt) return { alreadyFound, collectible: _byId[id] };
      const now = Date.now();
      found[id].copies = Math.max(1, Number(found[id].copies) || 1) + 1;
      waiting.entry.foundAt = now;
      data.collectibles = found;
      if (!BoohaAdventure.save.save(data)) return { alreadyFound, duplicate: true, collectible: _byId[id], saveFailed: true };
      if (window.BoohaSync && BoohaSync.checkpoint) {
        try { BoohaSync.checkpoint('adventure'); } catch (_) {}
      }
      document.dispatchEvent(new CustomEvent('booha:collectibleFound', {
        detail: { collectible: _byId[id], foundAt: now, duplicate: true, copies: found[id].copies }
      }));
      return { alreadyFound, duplicate: true, copies: found[id].copies, collectible: _byId[id] };
    }

    if (!alreadyFound) {
      const now = Date.now();
      const earned = _earnedRecord(data.meta || {}, id);
      found[id] = {
        found: true,
        foundAt: now,
        channel: earned ? earned.pool : null,
        week: earned ? earned.week : null,
      };
      data.collectibles = found;
      if (earned) earned.entry.foundAt = now;
      if (!BoohaAdventure.save.save(data)) return { alreadyFound: false, collectible: _byId[id], saveFailed: true };

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
    pendingFinds,
    recordPlacement,
    isFound,
    totalFound,
    totalDefined,
    getAll,
    evaluateWeekly,
    init() { /* event listeners below evaluate after completed work */ }
  };

  document.addEventListener('booha:checkIn', evaluateWeekly);
  document.addEventListener('booha:gameEnd', evaluateWeekly);
  // Also evaluate once the student is identified on every page load. A
  // trigger met on a page that did not evaluate it (or before a failed save)
  // is caught on the next visit in the same week instead of being lost.
  // evaluateWeekly is idempotent: each channel awards at most once per week.
  if (window.BOOHA_READY) evaluateWeekly();
  else document.addEventListener('booha:ready', evaluateWeekly, { once: true });

  BoohaAdventure.registerSystem('collectibleSystem', api);
  return api;
})();

window.BoohaCollectibleSystem = BoohaCollectibleSystem;
