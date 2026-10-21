/**
 * weekly-medals.js
 * The Booha Adventure — eight medals that reset every Sunday.
 *
 * Progress is DERIVED from data the app already keeps (weekLog, checkIn,
 * Blitz results, wanderer timestamps). The only new save data is the award
 * record, so each medal pops up exactly once and its bonus stars count once:
 *
 *   meta.medalLog["2026-10-18|october-w3"]["link_master"] = {
 *     at: <ms>, shown: false, seen: false
 *   }
 *     shown — the popup has played (any page)
 *     seen  — the student has looked at it on the Adventure Log
 *
 * Fresh start: only the CURRENT week is ever evaluated. Past weeks are never
 * back-filled, so no one is grandfathered into medals or bonus stars.
 * A medal is earned once per week, from the student's best curriculum.
 */
const BoohaWeeklyMedals = (() => {
  'use strict';

  const TIER_STARS = Object.freeze({ bronze: 3, silver: 5, gold: 10 });
  const MEDALS = Object.freeze([
    { id: 'warm_up', tier: 'bronze', jp: 'ウォームアップ', en: 'Warm Up', how: 'めいろゲームを 3つ あそぶ', img: 'medal-warm-up.webp' },
    { id: 'wanderer_week', tier: 'bronze', jp: 'たびびと ウィーク', en: 'Wanderer Week', how: 'たびびとに 3人 あう', img: 'medal-wanderer-week.webp' },
    { id: 'lantern_week', tier: 'silver', jp: 'ランタン ウィーク', en: 'Lantern Week', how: 'まいにちチェック 7日', img: 'medal-lantern-week.webp' },
    { id: 'arcade_open', tier: 'silver', jp: 'アーケード オープン', en: 'Arcade Open', how: 'ぜんぶの ゲームを ★★', img: 'medal-arcade-open.webp' },
    { id: 'blitz_triple', tier: 'silver', jp: 'Blitz トリプル', en: 'Blitz Triple', how: 'Blitz を 3つ クリア', img: 'medal-blitz-triple.webp' },
    { id: 'link_master', tier: 'gold', jp: 'つながり マスター', en: 'Link Master', how: 'みちを ぜんぶ ひからせる', img: 'medal-link-master.webp' },
    { id: 'blitz_perfect', tier: 'gold', jp: 'Blitz パーフェクト', en: 'Blitz Perfect', how: 'Blitz を ミスなしで クリア', img: 'medal-blitz-perfect.webp' },
    { id: 'perfect_week', tier: 'gold', jp: 'パーフェクト ウィーク', en: 'Perfect Week', how: 'ぜんぶの ゲームを ★★★', img: 'medal-perfect-week.webp' },
  ].map(Object.freeze));
  const BY_ID = Object.freeze(Object.fromEntries(MEDALS.map(m => [m.id, m])));

  // Pages without the game registry (hub, maze) use the same defaults.
  const DEFAULT_GAME_IDS = Object.freeze([
    'ask_question', 'say_sentence', 'say_word', 'sentence_order', 'sentence_speed',
    'sentence_tap', 'spell_word', 'vocab_speed', 'vocab_tap',
  ]);
  const DEFAULT_THRESHOLDS = Object.freeze([40, 70, 90]);
  const CURRICULA = Object.freeze(['pb', 'br', 'bc']);
  const BLITZ_TYPES = Object.freeze(['vocab', 'sentence', 'question']);
  const DAY_MS = 86400000;

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function bonusFor(id) {
    const medal = BY_ID[id];
    return medal ? TIER_STARS[medal.tier] : 0;
  }

  /* ── pure progress ───────────────────────────────────────────── */

  function defaultStarsFor(saveId, pct) {
    const [s1, s2, s3] = DEFAULT_THRESHOLDS;
    return pct >= s3 ? 3 : pct >= s2 ? 2 : pct >= s1 ? 1 : 0;
  }

  /** Tokyo-midnight start of a Sunday week key like "2026-10-18". */
  function weekStartMs(weekStart) {
    const ms = Date.parse(`${String(weekStart || '').slice(0, 10)}T00:00:00+09:00`);
    return Number.isFinite(ms) ? ms : null;
  }

  function perfectBlitzResult(value) {
    // Legacy numeric stamps were written only by record-eligible clears and
    // are therefore treated as perfect for the all-perfect weekly medal.
    if (typeof value === 'number') return Number.isFinite(value);
    return isObject(value) && Number.isFinite(value.ms) && value.tier === 'perfect';
  }

  function blitzPerfect(week) {
    const blitz = isObject(week && week.blitz) ? week.blitz : {};
    return CURRICULA.some(curr => BLITZ_TYPES.every(type => perfectBlitzResult(blitz[`${curr}:${type}`])));
  }

  /**
   * Progress for all eight medals in one week.
   * input: { week, checkIn, weekStart, wanderers, gamesByCurr, starsFor, L }
   * Returns [{ id, n, of, earned }] using the best curriculum for each medal.
   */
  function progress(input) {
    const L = input.L;
    const gamesByCurr = input.gamesByCurr || {};
    const starsFor = input.starsFor || defaultStarsFor;
    const best = { played: 0, two: 0, three: 0, links: 0, blitz: 0, games: DEFAULT_GAME_IDS.length };
    CURRICULA.forEach(curr => {
      const ids = Array.isArray(gamesByCurr[curr]) && gamesByCurr[curr].length ? gamesByCurr[curr] : DEFAULT_GAME_IDS;
      const s = L.weekStars(input.week, curr, ids, starsFor);
      best.played = Math.max(best.played, s.played);
      best.two = Math.max(best.two, s.twoStarCount);
      best.three = Math.max(best.three, s.stars.filter(v => v === 3).length);
      best.links = Math.max(best.links, s.linkCount);
      best.blitz = Math.max(best.blitz, s.blitzCount);
      best.games = ids.length;
    });
    const daily = L.dailyDoneInWeek(input.checkIn, input.weekStart);
    const start = weekStartMs(input.weekStart);
    const wanderers = isObject(input.wanderers) ? input.wanderers : {};
    const met = start == null ? 0 : Object.keys(wanderers).filter(id => {
      const rec = wanderers[id];
      if (!isObject(rec)) return false;
      const at = Number(rec.lastFoundAt) || Number(rec.firstFoundAt) || 0;
      return at >= start && at < start + 7 * DAY_MS;
    }).length;
    const links = Math.max(0, best.games - 1);
    const rows = {
      warm_up: [best.played, 3],
      wanderer_week: [met, 3],
      lantern_week: [daily, 7],
      arcade_open: [best.two, best.games],
      blitz_triple: [best.blitz, 3],
      link_master: [best.links, links],
      blitz_perfect: [blitzPerfect(input.week) ? 1 : 0, 1],
      perfect_week: [best.three, best.games],
    };
    return MEDALS.map(m => {
      const [n, of] = rows[m.id];
      return { id: m.id, n: Math.min(n, of), of, earned: of > 0 && n >= of };
    });
  }

  /** Bonus stars for every medal ever recorded (unknown ids count zero). */
  function logStars(medalLog) {
    if (!isObject(medalLog)) return 0;
    let total = 0;
    Object.keys(medalLog).forEach(week => {
      const entries = medalLog[week];
      if (!isObject(entries)) return;
      Object.keys(entries).forEach(id => { if (isObject(entries[id])) total += bonusFor(id); });
    });
    return total;
  }

  function weekStars(medalLog, weekKey) {
    const entries = isObject(medalLog) && isObject(medalLog[weekKey]) ? medalLog[weekKey] : {};
    return Object.keys(entries).reduce((sum, id) => sum + (isObject(entries[id]) ? bonusFor(id) : 0), 0);
  }

  function weekCount(medalLog, weekKey) {
    const entries = isObject(medalLog) && isObject(medalLog[weekKey]) ? medalLog[weekKey] : {};
    return Object.keys(entries).filter(id => BY_ID[id] && isObject(entries[id])).length;
  }

  /* ── browser glue ────────────────────────────────────────────── */

  function registryGames() {
    const R = typeof window !== 'undefined' ? window.BoohaGameRegistry : null;
    const out = {};
    CURRICULA.forEach(curr => {
      try {
        const list = R && R.getForCurriculum ? R.getForCurriculum(curr) : null;
        out[curr] = Array.isArray(list) && list.length
          ? list.map(g => g.baseId || String(g.id || '').split(':').pop())
          : DEFAULT_GAME_IDS.slice();
      } catch (_) {
        out[curr] = DEFAULT_GAME_IDS.slice();
      }
    });
    return out;
  }

  function starsForRuntime(saveId, pct) {
    const R = typeof window !== 'undefined' ? window.BoohaGameRegistry : null;
    try {
      if (R && R.starsForScore) return R.starsForScore(saveId, pct);
    } catch (_) {}
    return defaultStarsFor(saveId, pct);
  }

  function currentWeek() {
    const C = typeof window !== 'undefined' ? window.CALENDAR : null;
    if (!C || !C.getCurrentCurriculumWeek) return null;
    const cw = C.getCurrentCurriculumWeek();
    const key = C.getCurriculumWeekOccurrenceKey ? C.getCurriculumWeekOccurrenceKey(cw) : cw && cw.occurrenceKey;
    return key && cw && cw.weekStart ? { key, weekStart: cw.weekStart } : null;
  }

  function saveApi() {
    const A = typeof window !== 'undefined' ? window.BoohaAdventure : null;
    return A && A.save && typeof A.save.load === 'function' ? A.save : null;
  }

  /** Everything a page needs about this week's medals, read-only. */
  function snapshot() {
    const save = saveApi();
    const wk = currentWeek();
    const L = typeof window !== 'undefined' ? window.BoohaLevelStars : null;
    if (!save || !wk || !L) return null;
    const data = save.load() || {};
    const meta = isObject(data.meta) ? data.meta : {};
    const weekLog = isObject(meta.weekLog) ? meta.weekLog : {};
    const checkIn = isObject(meta.checkIn) ? meta.checkIn : {};
    const medalLog = isObject(meta.medalLog) ? meta.medalLog : {};
    const gamesByCurr = registryGames();
    const rows = progress({
      week: weekLog[wk.key], checkIn, weekStart: wk.weekStart,
      wanderers: isObject(data.collection) ? data.collection.wanderers : {},
      gamesByCurr, starsFor: starsForRuntime, L,
    });
    const logged = isObject(medalLog[wk.key]) ? medalLog[wk.key] : {};
    const life = L.lifetime(weekLog, checkIn, gamesByCurr, starsForRuntime);
    const medalStars = logStars(medalLog);
    return {
      data, meta, week: wk, rows, logged, medalLog,
      lifetimeStars: life.total + medalStars,
      medalStars,
      level: L.levelFor(life.total + medalStars),
    };
  }

  /**
   * Record any medal earned this week that is not yet in the log.
   * Returns the newly recorded medal definitions (empty when nothing new).
   */
  function sync() {
    const s = snapshot();
    if (!s) return [];
    const fresh = s.rows.filter(r => r.earned && !isObject(s.logged[r.id]));
    if (!fresh.length) return [];
    const save = saveApi();
    try {
      const data = save.load() || {};
      if (!isObject(data.meta)) data.meta = {};
      if (!isObject(data.meta.medalLog)) data.meta.medalLog = {};
      if (!isObject(data.meta.medalLog[s.week.key])) data.meta.medalLog[s.week.key] = {};
      const now = Date.now();
      fresh.forEach(r => {
        data.meta.medalLog[s.week.key][r.id] = { at: now, shown: false, seen: false };
      });
      if (!save.save(data)) return [];
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('booha:medalEarned', { detail: { week: s.week.key, ids: fresh.map(r => r.id) } }));
      }
      return fresh.map(r => BY_ID[r.id]);
    } catch (e) {
      console.warn('[WeeklyMedals] sync failed:', e);
      return [];
    }
  }

  function updateFlags(ids, flag) {
    const save = saveApi();
    const wk = currentWeek();
    if (!save || !wk) return false;
    try {
      const data = save.load() || {};
      const entries = data.meta && isObject(data.meta.medalLog) && data.meta.medalLog[wk.key];
      if (!isObject(entries)) return false;
      let changed = false;
      Object.keys(entries).forEach(id => {
        if ((ids == null || ids.includes(id)) && isObject(entries[id]) && !entries[id][flag]) {
          entries[id][flag] = true;
          changed = true;
        }
      });
      return changed ? save.save(data) : false;
    } catch (_) {
      return false;
    }
  }

  /** This week's medals whose popup has not played yet. */
  function pendingPopups() {
    const s = snapshot();
    if (!s) return [];
    return Object.keys(s.logged)
      .filter(id => BY_ID[id] && isObject(s.logged[id]) && !s.logged[id].shown)
      .map(id => BY_ID[id]);
  }

  function unseenCount() {
    const s = snapshot();
    if (!s) return 0;
    return Object.keys(s.logged).filter(id => BY_ID[id] && isObject(s.logged[id]) && !s.logged[id].seen).length;
  }

  return Object.freeze({
    MEDALS, TIER_STARS,
    bonusFor, progress, logStars, weekStars, weekCount,
    snapshot, sync, pendingPopups, unseenCount,
    markShown: ids => updateFlags(ids, 'shown'),
    markSeen: () => updateFlags(null, 'seen'),
  });
})();

if (typeof window !== 'undefined') window.BoohaWeeklyMedals = BoohaWeeklyMedals;
if (typeof module !== 'undefined' && module.exports) module.exports = BoohaWeeklyMedals;
