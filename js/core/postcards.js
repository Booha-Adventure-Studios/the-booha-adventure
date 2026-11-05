/* ═══════════════════════════════════════════════════════════════════════
   postcards.js  —  The Booha Adventure  ·  Weekly postcards (permanent)
   ─────────────────────────────────────────────────────────────────────
   Any visit in a week earns that week's postcard; a 5-day week (any 5+
   visit days, Sunday–Saturday, weekends count) earns the deluxe frame
   and the 5-DAY WEEK stamp. Postcards are permanent
   and live in the Trophy Case (Adventure Log).

   Stored in the student's own save (never device-wide):
     meta.postcards = { 'YYYY-MM-DD': { m: 'MM', v: <visit days>, g: <gold days> } }
       key = the week's Tokyo Sunday start; m = month of the latest visit
       day (decides the ornament art, resolved when shown so renamed art
       never breaks an old card); v / g only ever go up within a week.

   Reads this week from BoohaVisitDays (visit days + Daily Check gold days).
   Writes only after identity is ready; never touches weekly data, so the
   Sunday reset leaves postcards alone.
   ═══════════════════════════════════════════════════════════════════════ */
(function attachPostcards(root, factory) {
  const api = factory(root);
  if (root) root.BoohaPostcards = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis, function createPostcards(root) {
  'use strict';

  const FULL_WEEK = 5;                       // visit days for the deluxe frame
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

  function normalizeCard(c) {
    if (!isObj(c)) return null;
    const v = Math.max(0, Math.min(7, Math.floor(Number(c.v) || 0)));
    const g = Math.max(0, Math.min(v, Math.floor(Number(c.g) || 0)));
    const m = /^(0[1-9]|1[0-2])$/.test(String(c.m)) ? String(c.m) : null;
    if (!v || !m) return null;
    return { m, v, g };
  }
  function isDeluxe(card) { return !!card && card.v >= FULL_WEEK; }

  function saveFile() { return root && root.BoohaSaveFile ? root.BoohaSaveFile : null; }
  function ready() {
    const sf = saveFile();
    if (!root || !root.BOOHA_READY || !sf) return false;
    try { return typeof sf.key !== 'function' || !!sf.key(); } catch (e) { return false; }
  }
  function readAll() {
    if (!ready()) return {};
    try {
      const meta = (saveFile().load() || {}).meta || {};
      const out = {};
      if (isObj(meta.postcards)) {
        Object.keys(meta.postcards).forEach(week => {
          if (!DAY_RE.test(week)) return;
          const c = normalizeCard(meta.postcards[week]);
          if (c) out[week] = c;
        });
      }
      return out;
    } catch (e) { return {}; }
  }

  /* Fold this week's visits into its postcard. Returns the card or null. */
  function record() {
    if (!ready() || !root.BoohaVisitDays) return null;
    let summary;
    try { summary = root.BoohaVisitDays.current(); } catch (e) { return null; }
    if (!summary || !DAY_RE.test(String(summary.weekStart)) || !summary.visits) return null;
    const week = summary.weekStart;
    const last = summary.days[summary.days.length - 1].day;
    const all = readAll();
    const prev = all[week] || null;
    const next = {
      m: last.slice(5, 7),
      v: Math.max(prev ? prev.v : 0, summary.visits),
      g: Math.max(prev ? prev.g : 0, summary.checks),
    };
    if (prev && prev.m === next.m && prev.v === next.v && prev.g === next.g) return prev;   // nothing new
    all[week] = next;
    let ok = false;
    try { ok = !!saveFile().patch('meta', { postcards: all }); } catch (e) { ok = false; }
    if (!ok) return null;
    try {
      root.document.dispatchEvent(new root.CustomEvent('booha:postcardUpdated', {
        detail: { week, card: next, deluxe: isDeluxe(next), upgraded: !!prev && !isDeluxe(prev) && isDeluxe(next) },
      }));
    } catch (e) {}
    return next;
  }

  /* All postcards, newest first: [{ week, m, v, g, deluxe }] */
  function list() {
    const all = readAll();
    return Object.keys(all).sort().reverse().map(week => Object.assign({ week, deluxe: isDeluxe(all[week]) }, all[week]));
  }

  /* ── rendering (pure; the profile page injects art lookup + escaping) ── */
  function weekLabel(week) {
    const mm = Number(week.slice(5, 7)), dd = Number(week.slice(8, 10));
    return { en: `Week of ${MONTHS_EN[mm - 1]} ${dd}`, jp: `${mm}月${dd}日の しゅう` };
  }
  function renderHTML(cards, opts) {
    opts = opts || {};
    const esc = opts.esc || (s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const artFor = opts.artFor || (() => null);
    const max = opts.max || 12;
    const shown = (cards || []).slice(0, max);
    const deluxeCount = (cards || []).filter(c => c.deluxe).length;
    const head = `<div class="rb-pc-head"><h4>えはがき <span>POSTCARDS · ${(cards || []).length}${deluxeCount ? ` · ★ ${deluxeCount}` : ''}</span></h4>`
      + `<p class="rb-pc-how">あそびに きた しゅうに 1まい · ${FULL_WEEK}日 きたら きんの わく <span>One for every week you visit · gold frame for ${FULL_WEEK}+ days</span></p></div>`;
    if (!shown.length) {
      return `<div class="rb-postcards">${head}<p class="rb-pc-empty">はじめての えはがきは、あそびに きた しゅうに とどくよ。<span>Your first postcard arrives the week you visit.</span></p></div>`;
    }
    const items = shown.map(c => {
      const art = artFor(`${c.week.slice(0, 4)}-${c.m}-15`);
      const label = weekLabel(c.week);
      return `<figure class="rb-postcard${c.deluxe ? ' deluxe' : ''}" aria-label="${esc(label.en)}: ${c.v} visit${c.v === 1 ? '' : 's'}, ${c.g} Daily Check${c.g === 1 ? '' : 's'}${c.deluxe ? ', 5-day week' : ''}">`
        + (art ? `<img src="${esc(art)}" alt="" width="48" height="72" loading="lazy" decoding="async">` : '')
        + `<figcaption><b>${esc(label.jp)}</b><span>${esc(label.en)}</span>`
        + `<em>${c.v}日 · ✓${c.g}</em>${c.deluxe ? '<i class="rb-pc-stamp">5-DAY WEEK</i>' : ''}</figcaption></figure>`;
    }).join('');
    return `<div class="rb-postcards">${head}<div class="rb-pc-grid">${items}</div></div>`;
  }

  // Keep this week's postcard current as visits and check-ins happen, and
  // catch up once when the page has the student's save.
  if (root && root.document && typeof root.document.addEventListener === 'function') {
    const update = () => { try { record(); } catch (e) {} };
    root.document.addEventListener('booha:ready', update);
    root.document.addEventListener('booha:visitRecorded', update);
    root.document.addEventListener('booha:checkIn', update);
    // Loaded after the save was already ready (e.g. the Adventure Log page):
    // booha:ready has been and gone, so catch up now.
    if (root.BOOHA_READY) update();
  }

  return { FULL_WEEK, record, list, isDeluxe, normalizeCard, weekLabel, renderHTML };
});
