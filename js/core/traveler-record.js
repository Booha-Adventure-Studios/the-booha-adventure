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

  // Until Nov 15 2026, Karasuki recorded every seasonal visitor as "barba".
  // Christmas taps on Grubb therefore landed in Barba's record and relabeled
  // it christmas-2026. Read-time repair, the save is not rewritten: a Barba
  // record first met on or after Nov 1 2026 was only ever Grubb; an older one
  // is a real Halloween Barba (its visit count may include Grubb taps).
  var CHRISTMAS_2026_START = Date.parse('2026-11-01T00:00:00+09:00');
  function repaired(travelers) {
    var barba = travelers.barba;
    if (!isObject(barba) || barba.seasonId !== 'christmas-2026') return travelers;
    var out = Object.assign({}, travelers);
    if ((Number(barba.firstMetAt) || 0) >= CHRISTMAS_2026_START) {
      var grubb = isObject(out.grubb) ? out.grubb : null;
      out.grubb = {
        id: 'grubb',
        visits: (Number(barba.visits) || 0) + (grubb ? Number(grubb.visits) || 0 : 0),
        firstMetAt: grubb ? Math.min(Number(grubb.firstMetAt) || Infinity, Number(barba.firstMetAt)) : Number(barba.firstMetAt),
        lastMetAt: Math.max(Number(barba.lastMetAt) || 0, grubb ? Number(grubb.lastMetAt) || 0 : 0),
        seasonId: 'christmas-2026'
      };
      delete out.barba;
    } else {
      out.barba = Object.assign({}, barba, { seasonId: 'halloween-2026' });
    }
    return out;
  }
  function all() {
    try {
      var data = window.BoohaAdventure && BoohaAdventure.save ? BoohaAdventure.save.load() : null;
      var travelers = data && isObject(data.collection) ? data.collection.travelers : null;
      return isObject(travelers) ? repaired(travelers) : {};
    } catch (_) {
      return {};
    }
  }

  return { record: record, all: all };
})();
