/**
 * level-stars.js
 * The Booha Adventure — lifetime level stars for the Adventure Log.
 *
 * Levels are DERIVED, never stored. Every number comes from history the app
 * already keeps, so old weeks count and nothing can be double-counted:
 *
 *   meta.weekLog[week].adv["br:vocab_tap"] = best pct   → maze stars (0–3 each)
 *   adjacent maze games both at ★★ or better            → +1★ per link
 *   meta.weekLog[week].blitz["br:vocab"]                 → +3★ per Blitz clear
 *   meta.checkIn[day].st === 'done'                      → +2★ per Daily Check
 *
 * meta.allTimeStars is NOT used: it only grows when a game's best-ever star
 * count improves, so it stops growing after the first few weeks.
 */

const BoohaLevelStars = (() => {
  'use strict';

  // Level N starts at LEVELS[N - 1] stars. Nine levels match the nine coins.
  const LEVELS = Object.freeze([0, 40, 120, 240, 400, 600, 850, 1150, 1500]);
  const RULES = Object.freeze({ link: 1, blitz: 3, daily: 2, maxPerGame: 3 });
  const BLITZ_TYPES = Object.freeze(['vocab', 'sentence', 'question']);
  const CURRICULA = Object.freeze(['pb', 'br', 'bc']);

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function blitzCleared(value) {
    if (typeof value === 'number') return Number.isFinite(value);
    return isObject(value) && Number.isFinite(value.ms);
  }

  /** { level, floor, next, into, span, toNext, max } for a star total. */
  function levelFor(stars) {
    const total = Math.max(0, Math.floor(Number(stars) || 0));
    let index = 0;
    for (let i = 0; i < LEVELS.length; i++) if (total >= LEVELS[i]) index = i;
    const floor = LEVELS[index];
    const next = index + 1 < LEVELS.length ? LEVELS[index + 1] : null;
    return {
      level: index + 1,
      floor,
      next,
      into: total - floor,
      span: next == null ? 0 : next - floor,
      toNext: next == null ? 0 : next - total,
      max: next == null,
    };
  }

  /**
   * Stars for one curriculum in one week.
   * gameIds: base ids in trail order. starsFor(saveId, pct) → 0..3.
   */
  function weekStars(week, curr, gameIds, starsFor) {
    const adv = isObject(week && week.adv) ? week.adv : {};
    const blitz = isObject(week && week.blitz) ? week.blitz : {};
    const stars = gameIds.map(id => {
      const pct = adv[`${curr}:${id}`];
      if (pct == null || !Number.isFinite(Number(pct))) return null;
      const s = Number(starsFor(`${curr}:${id}`, Number(pct))) || 0;
      return Math.max(0, Math.min(RULES.maxPerGame, s));
    });
    const links = [];
    for (let i = 0; i < stars.length - 1; i++) {
      links.push((stars[i] || 0) >= 2 && (stars[i + 1] || 0) >= 2);
    }
    const blitzDone = {};
    BLITZ_TYPES.forEach(type => { blitzDone[type] = blitzCleared(blitz[`${curr}:${type}`]); });
    const maze = stars.reduce((sum, s) => sum + (s || 0), 0);
    const linkCount = links.filter(Boolean).length;
    const blitzCount = BLITZ_TYPES.filter(type => blitzDone[type]).length;
    return {
      stars,
      links,
      blitzDone,
      maze,
      linkCount,
      linkStars: linkCount * RULES.link,
      blitzCount,
      blitzStars: blitzCount * RULES.blitz,
      twoStarCount: stars.filter(s => (s || 0) >= 2).length,
      played: stars.filter(s => s != null).length,
      total: maze + linkCount * RULES.link + blitzCount * RULES.blitz,
    };
  }

  function dailyDoneCount(checkIn) {
    if (!isObject(checkIn)) return 0;
    return Object.keys(checkIn).filter(key => isObject(checkIn[key]) && checkIn[key].st === 'done').length;
  }

  /** Daily Check days done inside one Sunday-started week. */
  function dailyDoneInWeek(checkIn, weekStart) {
    if (!isObject(checkIn) || typeof weekStart !== 'string') return 0;
    const start = Date.parse(`${weekStart.slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(start)) return 0;
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const key = new Date(start + i * 86400000).toISOString().slice(0, 10);
      if (isObject(checkIn[key]) && checkIn[key].st === 'done') n++;
    }
    return n;
  }

  /**
   * Lifetime stars across every recorded week and curriculum.
   * gamesByCurr: { pb: [ids], br: [ids], bc: [ids] }.
   */
  function lifetime(weekLog, checkIn, gamesByCurr, starsFor) {
    const out = { maze: 0, links: 0, blitz: 0, daily: 0, total: 0 };
    if (isObject(weekLog)) {
      Object.keys(weekLog).forEach(key => {
        const week = weekLog[key];
        if (!isObject(week)) return;
        CURRICULA.forEach(curr => {
          const ids = gamesByCurr && Array.isArray(gamesByCurr[curr]) ? gamesByCurr[curr] : [];
          if (!ids.length) return;
          const s = weekStars(week, curr, ids, starsFor);
          out.maze += s.maze;
          out.links += s.linkStars;
          out.blitz += s.blitzStars;
        });
      });
    }
    out.daily = dailyDoneCount(checkIn) * RULES.daily;
    out.total = out.maze + out.links + out.blitz + out.daily;
    return out;
  }

  /**
   * All derived stars earned during one current week, across curricula.
   * This is used only to calculate the level before the week's progress;
   * the profile's visible weekly breakdown remains curriculum-specific.
   */
  function weekTotalAllCurricula(week, checkIn, weekStart, gamesByCurr, starsFor) {
    let total = 0;
    CURRICULA.forEach(curr => {
      const ids = gamesByCurr && Array.isArray(gamesByCurr[curr]) ? gamesByCurr[curr] : [];
      if (ids.length) total += weekStars(week, curr, ids, starsFor).total;
    });
    total += dailyDoneInWeek(checkIn, weekStart) * RULES.daily;
    return total;
  }

  return Object.freeze({
    LEVELS, RULES, BLITZ_TYPES,
    levelFor, weekStars, lifetime, weekTotalAllCurricula, dailyDoneCount, dailyDoneInWeek,
  });
})();

if (typeof window !== 'undefined') window.BoohaLevelStars = BoohaLevelStars;
if (typeof module !== 'undefined' && module.exports) module.exports = BoohaLevelStars;
