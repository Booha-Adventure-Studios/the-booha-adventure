/* ═══════════════════════════════════════════════════════════════════════
   hub-ornament-banner.js  —  The Booha Adventure  ·  Weekly ornament banner
   ─────────────────────────────────────────────────────────────────────
   The strand above the hub title. It replaces the hub's old decorative
   string lights; the start screen keeps its own atmospheric lights.

     · A wire with plain beads is always there (a finished base strand).
     · Each day the student visited this week hangs one ornament.
     · A completed Daily Check turns that day's ornament gold.
     · Only earned ornaments exist — no empty slots, no "missed" days.
     · Data comes from BoohaVisitDays.current(); this module never writes.

   Art is picked by Tokyo month (not by BoohaSkins season), so Jan 1–2
   already shows the New Year shimenawa. Months without art hide the
   banner. December's bulbs are the hub's Christmas lights.

   Rendering: the wire and beads are built once per art id. Ornaments are
   reused by day and updated in place (gold class, position), so earning a
   new one never rebuilds or flashes the strand. Only transform/opacity
   animate; CSS stops them for reduced motion / low power.
   ═══════════════════════════════════════════════════════════════════════ */
(function attachOrnamentBanner(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BoohaOrnamentBanner = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis, function createOrnamentBanner() {
  'use strict';

  const DIR = 'assets/img/hub/ornaments/';
  // All ornament art shares one 256×384 canvas with the hanging loop at the
  // top centre, so one box size and one loop offset fit every month.
  const ART_BY_MONTH = Object.freeze({
    '11': Object.freeze({ id: 'november-round',    src: DIR + 'ornament-november-round.webp',    glass: true }),
    '12': Object.freeze({ id: 'december-bulb',     src: DIR + 'ornament-december-bulb.webp',     glass: true,
                          tints: Object.freeze(['red', 'green', 'warm']) }),
    '01': Object.freeze({ id: 'january-shimenawa', src: DIR + 'ornament-january-shimenawa.webp', glass: false }),
    '02': Object.freeze({ id: 'february-oni',      src: DIR + 'ornament-february-oni.webp',      glass: false }),
  });

  // Wire geometry in viewBox units (0 0 1000 100, stretched to the box).
  const WIRE_TOP = 6;
  const WIRE_SAG = 14;
  const BEADS = 11;
  const STEP = 9;          // % of banner width between neighbouring ornaments

  function artForDay(dayKey) {
    const m = /^\d{4}-(\d{2})-\d{2}$/.exec(String(dayKey || ''));
    return m ? (ART_BY_MONTH[m[1]] || null) : null;
  }

  /* Height of the wire at t (0…1), in % of the banner height. */
  function wireY(t) {
    return WIRE_TOP + 4 * WIRE_SAG * t * (1 - t);
  }

  /* n ornaments gathered around the centre, evenly spaced, no gaps. */
  function positions(n) {
    const count = Math.max(0, Math.min(7, Math.floor(Number(n) || 0)));
    const out = [];
    for (let i = 0; i < count; i++) {
      const x = 50 + (i - (count - 1) / 2) * STEP;
      out.push({ x: round(x), y: round(wireY(x / 100)) });
    }
    return out;
  }

  function beadPositions() {
    const out = [];
    for (let i = 0; i < BEADS; i++) {
      const t = (i + 0.5) / BEADS;
      out.push({ x: round(t * 100), y: round(wireY(t)) });
    }
    return out;
  }

  function round(v) { return Math.round(v * 100) / 100; }

  function label(summary) {
    const v = summary ? summary.visits : 0;
    const c = summary ? summary.checks : 0;
    return `This week: ${v} ${v === 1 ? 'visit' : 'visits'}, ${c} Daily ${c === 1 ? 'Check' : 'Checks'} · ` +
      `今週 ${v}回 · デイリーチェック ${c}回`;
  }

  /* ── DOM ─────────────────────────────────────────────────────────────── */
  function build(el, art) {
    const doc = el.ownerDocument;
    while (el.firstChild) el.removeChild(el.firstChild);

    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1000 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'obWire');
    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M0 ${WIRE_TOP} Q500 ${WIRE_TOP + 2 * WIRE_SAG} 1000 ${WIRE_TOP}`);
    svg.appendChild(path);
    el.appendChild(svg);

    beadPositions().forEach(p => {
      const bead = doc.createElement('span');
      bead.className = 'obBead';
      bead.style.left = p.x + '%';
      bead.style.top = p.y + '%';
      el.appendChild(bead);
    });

    const wrap = doc.createElement('div');
    wrap.className = 'obOrnaments';
    el.appendChild(wrap);

    el.dataset.art = art.id;
    el.dataset.glass = art.glass ? 'true' : 'false';
    el._ob = { wrap, byDay: new Map(), art };
  }

  function makeOrnament(doc, art, day) {
    const o = doc.createElement('span');
    o.className = 'obOrn';
    o.dataset.day = day;
    const img = doc.createElement('img');
    img.src = art.src;
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    o.appendChild(img);
    return o;
  }

  /**
   * render(el, art, summary, { pop })
   *   art      artForDay(today) or null (null hides the banner)
   *   summary  BoohaVisitDays summary, or null before identity is ready
   *   pop      Set of day keys to animate in (new or just turned gold)
   */
  function render(el, art, summary, opts) {
    if (!el) return;
    if (!art) {
      while (el.firstChild) el.removeChild(el.firstChild);
      el.hidden = true;
      delete el.dataset.art;
      el._ob = null;
      return;
    }
    el.hidden = false;
    if (!el._ob || el.dataset.art !== art.id) build(el, art);

    const state = el._ob;
    const days = summary && Array.isArray(summary.days) ? summary.days.slice(0, 7) : [];
    const pos = positions(days.length);
    const pop = opts && opts.pop;
    const keep = new Set(days.map(d => d.day));

    state.byDay.forEach((node, day) => {
      if (!keep.has(day)) { node.remove(); state.byDay.delete(day); }
    });

    days.forEach((d, i) => {
      let node = state.byDay.get(d.day);
      if (!node) {
        node = makeOrnament(el.ownerDocument, art, d.day);
        state.wrap.appendChild(node);
        state.byDay.set(d.day, node);
      }
      node.style.left = pos[i].x + '%';
      node.style.top = pos[i].y + '%';
      node.dataset.tint = art.tints ? art.tints[i % art.tints.length] : 'warm';
      node.classList.toggle('gold', !!d.gold);
      if (pop && typeof pop.has === 'function' && pop.has(d.day)) {
        node.classList.remove('is-new');
        void node.offsetWidth;            // restart the one-shot animation
        node.classList.add('is-new');
      }
    });

    el.dataset.visits = String(days.length);
    el.dataset.checks = String(days.filter(d => d.gold).length);
    el.setAttribute('aria-label', label(summary));
  }

  return { ART_BY_MONTH, artForDay, wireY, positions, beadPositions, label, render };
});
