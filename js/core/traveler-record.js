/**
 * traveler-record.js
 * The Booha Adventure — permanent record of traveling characters a player
 * actually tapped (Nuppi, and seasonal travelers such as Barba).
 *
 *   save.collection.travelers["barba"] = {
 *     id, visits, firstMetAt, lastMetAt, seasonId
 *   }
 *
 * Travelers are not Karasuki wanderers, so they live beside
 * collection.wanderers instead of inside it. The Adventure Log reads this.
 */
window.BoohaTravelers = (function () {
  'use strict';

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function record(id, opts) {
    if (typeof id !== 'string' || !id) return null;
    try {
      if (!window.BoohaAdventure || !BoohaAdventure.save) return null;
      var data = BoohaAdventure.save.load();
      if (!isObject(data.collection)) data.collection = {};
      if (!isObject(data.collection.travelers)) data.collection.travelers = {};
      var previous = isObject(data.collection.travelers[id]) ? data.collection.travelers[id] : {};
      var now = Date.now();
      var seasonId = (opts && opts.seasonId) || previous.seasonId || null;
      data.collection.travelers[id] = Object.assign({}, previous, {
        id: id,
        visits: Math.max(0, Number(previous.visits) || 0) + 1,
        firstMetAt: Number(previous.firstMetAt) || now,
        lastMetAt: now,
        seasonId: seasonId
      });
      if (!BoohaAdventure.save.save(data)) return null;
      return data.collection.travelers[id];
    } catch (e) {
      console.warn('[Travelers] record failed:', e);
      return null;
    }
  }

  function all() {
    try {
      var data = window.BoohaAdventure && BoohaAdventure.save ? BoohaAdventure.save.load() : null;
      var travelers = data && isObject(data.collection) ? data.collection.travelers : null;
      return isObject(travelers) ? travelers : {};
    } catch (_) {
      return {};
    }
  }

  return { record: record, all: all };
})();
