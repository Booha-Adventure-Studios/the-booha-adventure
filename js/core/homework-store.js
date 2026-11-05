/* ═══════════════════════════════════════════════════════════════════════
   homework-store.js  —  The Booha Adventure  ·  Per-student homework state
   ─────────────────────────────────────────────────────────────────────
   One bucket in the student's own save, shared by the hub's homework list
   (index.html) and the standalone study sheet (homework.html):

     weekly.homework = {
       weekStart: 'YYYY-MM-DD',               // stamps `copied` (this week only)
       copied: { pb: ['vocab:3', …], … },     // hub: "copied into my notebook"
       known:  { 'YYYY-MM-DD': { pb: { vocab: [1, 2], … } } }
                                               // sheet: "hide items I know",
                                               // last / this / next week only
     }

   Rules:
     · Nothing is read or written before identity is ready (BOOHA_READY and
       a save key) — never device-wide localStorage.
     · Every write loads the whole bucket, normalizes it, changes only its
       own field and writes the whole bucket back, so the hub and the sheet
       never erase each other's data.
     · Week keys come from CALENDAR (Tokyo). `known` reads and writes are
       limited to last / this / next week; older weeks are ignored (and the
       Sunday reset prunes them, see save-file.js).
     · Old device-wide booha_hw_copied_* / booha_hw_known_* keys are never
       migrated (they cannot be attributed to a student); clearLegacy()
       removes them, and callers run it only after identity is ready.
   ═══════════════════════════════════════════════════════════════════════ */
(function attachHomeworkStore(root, factory) {
  const api = factory(root);
  if (root) root.BoohaHomeworkStore = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis, function createHomeworkStore(root) {
  'use strict';

  const CURRICULA = ['pb', 'br', 'bc'];
  const SECTIONS = ['vocab', 'sentences', 'questions'];
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const COPIED_RE = /^(vocab|sentences|questions):([1-9]|1[0-5])$/;
  const DAY_MS = 86400000;
  const LEGACY_PREFIXES = ['booha_hw_copied_', 'booha_hw_known_'];

  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const validCurr = c => CURRICULA.indexOf(c) >= 0;
  const validSection = s => SECTIONS.indexOf(s) >= 0;
  const validDay = d => typeof d === 'string' && DAY_RE.test(d);

  /* ── normalization (mirrors save-file.js, applied on every read/write) ── */
  function normalizeKnownWeek(week) {
    const out = {};
    if (!isObj(week)) return out;
    CURRICULA.forEach(curr => {
      if (!isObj(week[curr])) return;
      const sections = {};
      SECTIONS.forEach(section => {
        const list = week[curr][section];
        if (!Array.isArray(list)) return;
        const nums = Array.from(new Set(list.map(Number)))
          .filter(n => Number.isInteger(n) && n >= 1 && n <= 15)
          .sort((a, b) => a - b);
        if (nums.length) sections[section] = nums;
      });
      if (Object.keys(sections).length) out[curr] = sections;
    });
    return out;
  }
  function normalize(value) {
    const out = { weekStart: '', copied: {}, known: {} };
    if (!isObj(value)) return out;
    if (validDay(value.weekStart)) out.weekStart = value.weekStart;
    const copied = isObj(value.copied) ? value.copied : {};
    CURRICULA.forEach(curr => {
      if (Array.isArray(copied[curr])) out.copied[curr] = copied[curr].filter(k => typeof k === 'string' && COPIED_RE.test(k));
    });
    const known = isObj(value.known) ? value.known : {};
    Object.keys(known).forEach(week => {
      if (!validDay(week)) return;
      const w = normalizeKnownWeek(known[week]);
      if (Object.keys(w).length) out.known[week] = w;
    });
    return out;
  }

  /* ── calendar window ─────────────────────────────────────────────────── */
  function currentWeekStart() {
    try {
      const cw = root.CALENDAR && root.CALENDAR.getCurrentCurriculumWeek && root.CALENDAR.getCurrentCurriculumWeek();
      return cw && validDay(cw.weekStart) ? cw.weekStart : null;
    } catch (e) { return null; }
  }
  function inWindow(weekStart) {
    const now = currentWeekStart();
    if (!now || !validDay(weekStart)) return false;
    const t = Date.parse(now + 'T00:00:00Z');
    const day = ms => new Date(ms).toISOString().slice(0, 10);
    return weekStart >= day(t - 7 * DAY_MS) && weekStart <= day(t + 7 * DAY_MS);
  }

  /* ── save access ─────────────────────────────────────────────────────── */
  function saveFile() { return root && root.BoohaSaveFile ? root.BoohaSaveFile : null; }
  function ready() {
    const sf = saveFile();
    if (!root || !root.BOOHA_READY || !sf) return false;
    try { return typeof sf.key !== 'function' || !!sf.key(); } catch (e) { return false; }
  }
  function readBucket() {
    if (!ready()) return null;
    try {
      const save = saveFile().load() || {};
      return normalize(save.weekly && save.weekly.homework);
    } catch (e) { return null; }
  }
  function writeBucket(bucket) {
    try { return !!saveFile().patch('weekly', { homework: normalize(bucket) }); } catch (e) { return false; }
  }
  function emit(type, detail) {
    try { root.document.dispatchEvent(new root.CustomEvent(type, { detail })); } catch (e) {}
  }

  /* ── hub: copied into my notebook (current week only) ───────────────── */
  function getCopied(curr, weekStart) {
    const b = readBucket();
    if (!b || !validCurr(curr) || !validDay(weekStart) || b.weekStart !== weekStart) return new Set();
    return new Set(b.copied[curr] || []);
  }
  function setCopied(curr, weekStart, set) {
    if (!validCurr(curr) || !validDay(weekStart)) return false;
    const b = readBucket();
    if (!b) return false;
    if (b.weekStart !== weekStart) { b.weekStart = weekStart; b.copied = {}; }   // known is untouched
    b.copied[curr] = Array.from(set || []).filter(k => typeof k === 'string' && COPIED_RE.test(k)).sort();
    const ok = writeBucket(b);
    if (ok) emit('booha:homeworkChanged', { curr, copied: b.copied[curr].length });
    return ok;
  }

  /* ── sheet: hide items I know (last / this / next week) ─────────────── */
  function getKnown(weekStart, curr, section) {
    const b = readBucket();
    if (!b || !validCurr(curr) || !validSection(section) || !inWindow(weekStart)) return new Set();
    const list = b.known[weekStart] && b.known[weekStart][curr] && b.known[weekStart][curr][section];
    return new Set(Array.isArray(list) ? list : []);
  }
  function setKnown(weekStart, curr, section, set) {
    if (!validCurr(curr) || !validSection(section) || !inWindow(weekStart)) return false;
    const b = readBucket();
    if (!b) return false;
    const week = b.known[weekStart] || (b.known[weekStart] = {});
    const sections = week[curr] || (week[curr] = {});
    sections[section] = Array.from(set || []).map(Number);   // normalize() validates + sorts
    const ok = writeBucket(b);                               // weekStart + copied untouched
    if (ok) emit('booha:homeworkKnownChanged', { weekStart, curr, section });
    return ok;
  }

  /* ── legacy device-wide keys ─────────────────────────────────────────── */
  function clearLegacy() {
    if (!ready()) return 0;                 // only once a student is identified
    let removed = 0;
    try {
      const ls = root.localStorage;
      const old = [];
      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);
        if (key && LEGACY_PREFIXES.some(p => key.indexOf(p) === 0)) old.push(key);
      }
      old.forEach(key => { ls.removeItem(key); removed++; });
    } catch (e) {}
    return removed;
  }

  return { normalize, inWindow, getCopied, setCopied, getKnown, setKnown, clearLegacy };
});
