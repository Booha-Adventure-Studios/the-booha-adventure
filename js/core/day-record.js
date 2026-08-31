
/**
 * day-record.js
 * The Booha Adventure — Daily Record Layer
 *
 * Invisibly records student activity into the `meta` save section
 * (survives the Monday-midnight weekly reset).
 *
 *   meta.dayLog["2026-07-05"] = { s: 2, g: 3 }
 *       s = sessions today (new session after 15+ min of inactivity)
 *       g = games completed today (pct >= 40)
 *
 *   meta.weekLog["2026-08-30|august-w4"] = {
 *       adv:   { "br:vocab_tap": 92, ... }   // best pct per game this week
 *       blitz: { "vocab": 41.2, ... }        // best clear time (s), 100% only
 *       duel:  { "liar": { w: 2, p: 3 } }    // wins / plays
 *   }
 *
 * Rules:
 *  - Date/week keys come from CALENDAR (Tokyo time) — NEVER the browser clock.
 *  - If CALENDAR is missing, we record NOTHING (never guess the week).
 *  - Listens to the same `booha:gameEnd` event the score system uses.
 *    saveId prefix decides the category:
 *      "blitz:*" → blitz   |   "duel:*" → duel   |   anything else → adv
 */

const BoohaDayRecord = (() => {
  'use strict';

  const SESSION_GAP_MS = 15 * 60 * 1000; // 15 minutes

  function _keys() {
    if (!window.CALENDAR || !CALENDAR.getTodayKey || !CALENDAR.getCurrentCurriculumWeek) {
      console.error('[DayRecord] CALENDAR missing — activity NOT recorded.');
      return null;
    }
    const day = CALENDAR.getTodayKey();
    const cw = CALENDAR.getCurrentCurriculumWeek();
    const week = CALENDAR.getCurriculumWeekOccurrenceKey?.(cw) || cw?.occurrenceKey ||
      (cw?.weekStart && cw?.weekId ? `${cw.weekStart}|${cw.weekId}` : null);
    if (!week) {
      console.error('[DayRecord] Curriculum occurrence missing — activity NOT recorded.');
      return null;
    }
    return {
      day,
      // Exact Sunday start keeps a repeated Week 4 occurrence separate.
      week
    };
  }

  function _meta() {
    const save = BoohaAdventure.save.load();
    const meta = save.meta || {};
    meta.dayLog         = meta.dayLog         || {};
    meta.weekLog        = meta.weekLog        || {};
    meta.lastActivityTs = meta.lastActivityTs || 0;
    return meta;
  }

  /** Record one gameEnd event into dayLog + weekLog. */
  function record(detail) {
    const keys = _keys();
    if (!keys) return;

    const { saveId, score, completed, time } = detail || {};
    if (!saveId) return;

    const meta = _meta();
    const now  = Date.now();

    // ── dayLog: sessions + completions ─────────────────────────────
    const day = meta.dayLog[keys.day] || { s: 0, g: 0 };
    if (now - meta.lastActivityTs > SESSION_GAP_MS) day.s += 1;
    if (completed) day.g += 1;
    meta.dayLog[keys.day] = day;
    meta.lastActivityTs   = now;

    // ── weekLog: best result per game, by category ─────────────────
    const wk = meta.weekLog[keys.week] || { adv: {}, blitz: {}, duel: {} };

    if (saveId.startsWith('blitz:')) {
      // Blitz reports best clear TIME; only 100% clears fire completed=true
      const id = saveId.slice(6);
      if (completed && typeof time === 'number') {
        const best = wk.blitz[id];
        if (best == null || time < best) wk.blitz[id] = time;
      }
    } else if (saveId.startsWith('duel:')) {
      const id = saveId.slice(5);
      const d  = wk.duel[id] || { w: 0, p: 0 };
      d.p += 1;
      if (detail.won) d.w += 1;
      wk.duel[id] = d;
    } else {
      // Adventure games: score IS a pct (0-100); keep the best
      if (typeof score === 'number') {
        const best = wk.adv[saveId];
        if (best == null || score > best) wk.adv[saveId] = score;
      }
    }

    meta.weekLog[keys.week] = wk;
    BoohaAdventure.save.patch('meta', meta);

    document.dispatchEvent(new CustomEvent('booha:dayRecorded', {
      detail: { day: keys.day, week: keys.week }
    }));
  }

  // ── Read API (for the future profile page) ───────────────────────
  function getDayLog()  { return { ...(_meta().dayLog)  }; }
  function getWeekLog() { return { ...(_meta().weekLog) }; }

  /** Weekly understanding %: mean of best adventure pcts (null if none). */
  function weeklyPct(weekKey) {
    const wk = _meta().weekLog[weekKey];
    if (!wk) return null;
    const vals = Object.values(wk.adv || {});
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  // ── Hook up ──────────────────────────────────────────────────────
  document.addEventListener('booha:gameEnd', (e) => {
    try { record(e.detail); }
    catch (err) { console.error('[DayRecord] failed:', err); } // never break a game
  });

  return { record, getDayLog, getWeekLog, weeklyPct, getCurrentKeys: _keys };
})();

window.BoohaDayRecord = BoohaDayRecord;
