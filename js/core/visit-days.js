/* ═══════════════════════════════════════════════════════════════════════
   visit-days.js  —  The Booha Adventure  ·  Weekly visit record
   ─────────────────────────────────────────────────────────────────────
   Data contract for the hub's weekly ornament banner.

   Stored (per student, in the identity-scoped save):
     weekly.visitDays = { "2026-11-05": 1, ... }
       One key per Tokyo day the student opened the hub this week.
       Cleared by BoohaSaveFile.resetWeekly() at each Sunday occurrence
       (day keys already inside the new week are carried over).

   Read (never stored):
     summarize(visitDays, checkIn, weekStart) →
       { weekStart, visits, checks,
         days: [{ day, gold }] }      // earned days only, oldest first
     · A day counts as a visit if visitDays has it OR the Daily Check was
       completed that day (a check-in implies a visit).
     · gold = Daily Check completed (meta.checkIn[day].st === 'done').
     · Only days inside weekStart … weekStart+6 count, so a stray key from
       the edge of a rollover can never inflate this week.
     · There are no "missed" entries: the list only ever grows in a week.

   House rules honoured:
     · Day/week keys from CALENDAR (Tokyo) only — never the browser clock.
     · Writes only after identity is ready (BOOHA_READY + a save key), via
       BoohaSaveFile.patchDeep — never device-wide localStorage.
     · At most one write per student per day.
   ═══════════════════════════════════════════════════════════════════════ */
(function attachVisitDays(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BoohaVisitDays = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis, function createVisitDays(root) {
  'use strict';

  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const DAY_MS = 86400000;

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  /* The seven Tokyo day keys of the week that starts on weekStart (Sunday). */
  function weekDays(weekStart) {
    if (typeof weekStart !== 'string' || !DAY_RE.test(weekStart.slice(0, 10))) return [];
    const start = Date.parse(`${weekStart.slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(start)) return [];
    const out = [];
    for (let i = 0; i < 7; i++) out.push(new Date(start + i * DAY_MS).toISOString().slice(0, 10));
    return out;
  }

  function summarize(visitDays, checkIn, weekStart) {
    const visits = isObject(visitDays) ? visitDays : {};
    const checks = isObject(checkIn) ? checkIn : {};
    const week = weekDays(weekStart);
    const days = [];
    week.forEach(day => {
      const gold = isObject(checks[day]) && checks[day].st === 'done';
      if (gold || visits[day]) days.push({ day, gold });
    });
    return {
      weekStart: week.length ? week[0] : null,
      visits: days.length,
      checks: days.filter(d => d.gold).length,
      days,
    };
  }

  /* ── Browser-bound helpers ───────────────────────────────────────────── */
  function _saveFile() {
    return root && root.BoohaSaveFile ? root.BoohaSaveFile : null;
  }
  function _calendar() {
    const cal = root && root.CALENDAR;
    return cal && typeof cal.getTodayKey === 'function' &&
      typeof cal.getCurrentCurriculumWeek === 'function' ? cal : null;
  }
  function _identityReady(saveFile) {
    if (!root || !root.BOOHA_READY || !saveFile) return false;
    try { return typeof saveFile.key !== 'function' || !!saveFile.key(); } catch (e) { return false; }
  }

  /* Record today as a visit. Returns true only when a new day was written. */
  function record() {
    const saveFile = _saveFile();
    const cal = _calendar();
    if (!cal || !_identityReady(saveFile)) return false;
    let today;
    try { today = String(cal.getTodayKey()); } catch (e) { return false; }
    if (!DAY_RE.test(today)) return false;

    const save = saveFile.load() || {};
    const existing = isObject(save.weekly) && isObject(save.weekly.visitDays) ? save.weekly.visitDays : {};
    if (existing[today]) return false;

    const ok = saveFile.patchDeep('weekly', 'visitDays', { [today]: 1 });
    if (!ok) return false;
    try {
      root.document.dispatchEvent(new root.CustomEvent('booha:visitRecorded', { detail: { day: today } }));
    } catch (e) {}
    if (root.BoohaSync) {
      try { root.BoohaSync.checkpoint('adventure'); } catch (e) {
        console.warn('[VisitDays] Cloud checkpoint will retry later:', e);
      }
    }
    return true;
  }

  /* This week's summary for the current student (empty before identity). */
  function current() {
    const saveFile = _saveFile();
    const cal = _calendar();
    if (!cal || !_identityReady(saveFile)) return summarize({}, {}, null);
    let cw;
    try { cw = cal.getCurrentCurriculumWeek(); } catch (e) { cw = null; }
    const save = saveFile.load() || {};
    return summarize(
      isObject(save.weekly) ? save.weekly.visitDays : {},
      isObject(save.meta) ? save.meta.checkIn : {},
      cw && cw.weekStart
    );
  }

  return { weekDays, summarize, record, current };
});
