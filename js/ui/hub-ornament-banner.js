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
     · Blitz centerpiece (Pass 13): when the hub says all three Blitz games
       are done this week, one bigger ornament hangs in the middle with the
       red bow on the wire, and the day ornaments move aside for it. It is
       only ever added: no empty slot while Blitz is unfinished.

   Art is picked by Tokyo month (not by BoohaSkins season), so Jan 1–2
   already shows the New Year shimenawa. All twelve months have art; a
   month without an entry would hide the banner.

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
  // One ornament per Tokyo month. Every file shares a 192×288 canvas; the
  // artist's loop height and the body's centre differ per piece, so each
  // entry carries them (fractions of the canvas height, measured from the
  // files): loop → where the ornament meets the wire, glowY → where the
  // light sits. Replaced art gets a new file name (-r3, …) so iPads don't
  // keep a cached copy.
  function art(id, loop, glowY) {
    return Object.freeze({ id, src: DIR + 'ornament-' + id + '-r2.webp', loop, glowY });
  }
  const ART_BY_MONTH = Object.freeze({
    '01': art('january-shimenawa', 0.087, 0.54),
    '02': art('february-oni', 0.014, 0.61),
    '03': art('march-hinamatsuri', 0.010, 0.55),
    '04': art('april-sakura', 0.080, 0.60),
    '05': art('may-tulip', 0.083, 0.61),
    '06': art('june-hydrangea', 0.062, 0.61),
    '07': art('july-tanabata', 0.062, 0.55),
    '08': art('august-watermelon', 0.097, 0.64),
    '09': art('september-dragonfly', 0.115, 0.53),
    '10': art('october-pumpkin', 0.104, 0.61),
    '11': art('november-tree', 0.118, 0.64),
    '12': art('december-stocking', 0.028, 0.58),
  });

  // The centerpiece's bow. Same 192×288 canvas as the month art; knotY is
  // the gold knot's centre (fraction of the canvas height, measured from
  // the file), which CSS sets on the wire.
  const CENTERPIECE_BOW = Object.freeze({
    id: 'centerpiece-bow', src: DIR + 'ornament-centerpiece-bow-r1.webp', knotY: 0.467,
  });

  // Wire geometry in viewBox units (0 0 1000 100, stretched to the box).
  const WIRE_TOP = 6;
  const WIRE_SAG = 14;
  const BEADS = 11;
  const STEP = 7.5;        // % of banner width between neighbouring ornaments
  const CENTER_GAP = 10.5; // % from the middle to the nearest day ornament when the centerpiece hangs

  function artForDay(dayKey) {
    const m = /^\d{4}-(\d{2})-\d{2}$/.exec(String(dayKey || ''));
    return m ? (ART_BY_MONTH[m[1]] || null) : null;
  }

  /* Height of the wire at t (0…1), in % of the banner height. */
  function wireY(t) {
    return WIRE_TOP + 4 * WIRE_SAG * t * (1 - t);
  }

  /* n ornaments gathered around the centre, evenly spaced, no gaps.
     With the centerpiece, the days keep their order left to right and
     split around it: the first half (rounded up) on the left. */
  function positions(n, centerpiece) {
    const count = Math.max(0, Math.min(7, Math.floor(Number(n) || 0)));
    const xs = [];
    if (centerpiece) {
      const left = Math.ceil(count / 2);
      for (let i = 0; i < count; i++) {
        xs.push(i < left ? 50 - CENTER_GAP - (left - 1 - i) * STEP : 50 + CENTER_GAP + (i - left) * STEP);
      }
    } else {
      for (let i = 0; i < count; i++) xs.push(50 + (i - (count - 1) / 2) * STEP);
    }
    return xs.map(x => ({ x: round(x), y: round(wireY(x / 100)) }));
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

  /* 0 (Sun) … 6 (Sat) for a YYYY-MM-DD key. Drives the tiny per-day tilt,
     so a given day always hangs the same way whatever order nodes were added. */
  function weekday(dayKey) {
    const t = Date.parse(`${String(dayKey).slice(0, 10)}T00:00:00Z`);
    return Number.isFinite(t) ? new Date(t).getUTCDay() : 0;
  }

  function label(summary, centerpiece) {
    const v = summary ? summary.visits : 0;
    const c = summary ? summary.checks : 0;
    return `This week: ${v} ${v === 1 ? 'visit' : 'visits'}, ${c} Daily ${c === 1 ? 'Check' : 'Checks'}` +
      (centerpiece ? ', Blitz 3/3' : '') + ' · ' +
      `今週 ${v}回 · デイリーチェック ${c}回` + (centerpiece ? ' · ブリッツ 3/3' : '');
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
    el.style.setProperty('--ob-loop', String(art.loop));
    el.style.setProperty('--ob-glow-y', Math.round(art.glowY * 100) + '%');
    el.style.setProperty('--ob-bow-knot', String(CENTERPIECE_BOW.knotY));
    el._ob = { wrap, byDay: new Map(), art, center: null };
  }

  function makeCenterpiece(doc, art) {
    // span.obOrn.gold.obCenter — bigger month ornament in the middle
    //   i.obRays               — soft gold light behind it (CSS)
    //   span.obArt > img       — the month art
    //   img.obBow              — the bow, knot on the wire (no tilt)
    const o = doc.createElement('span');
    o.className = 'obOrn gold obCenter';
    o.dataset.center = '1';
    const rays = doc.createElement('i');
    rays.className = 'obRays';
    o.appendChild(rays);
    const artBox = doc.createElement('span');
    artBox.className = 'obArt';
    const img = doc.createElement('img');
    img.src = art.src;
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    artBox.appendChild(img);
    o.appendChild(artBox);
    const bow = doc.createElement('img');
    bow.className = 'obBow';
    bow.src = CENTERPIECE_BOW.src;
    bow.alt = '';
    bow.decoding = 'async';
    bow.draggable = false;
    o.appendChild(bow);
    o.style.left = '50%';
    o.style.top = round(wireY(0.5)) + '%';
    return o;
  }

  function makeOrnament(doc, art, day) {
    // span.obOrn   — position on the wire, glow (::before), hang animation
    //   span.obArt — static per-day tilt + December glass tint (::after)
    //     img
    const o = doc.createElement('span');
    o.className = 'obOrn';
    o.dataset.day = day;
    o.dataset.wd = String(weekday(day));
    const artBox = doc.createElement('span');
    artBox.className = 'obArt';
    const img = doc.createElement('img');
    img.src = art.src;
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    artBox.appendChild(img);
    o.appendChild(artBox);
    return o;
  }

  /**
   * render(el, art, summary, { pop, centerpiece, popCenter })
   *   art          artForDay(today) or null (null hides the banner)
   *   summary      BoohaVisitDays summary, or null before identity is ready
   *   pop          Set of day keys to animate in (new or just turned gold)
   *   centerpiece  true when all three Blitz games are done this week
   *   popCenter    animate the centerpiece in (just earned, hub on screen)
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
    const center = !!(opts && opts.centerpiece);
    const pos = positions(days.length, center);
    const pop = opts && opts.pop;

    if (center && !state.center) {
      state.center = makeCenterpiece(el.ownerDocument, art);
      state.wrap.appendChild(state.center);
    } else if (!center && state.center) {
      state.center.remove();
      state.center = null;
    }
    if (state.center && opts && opts.popCenter) {
      state.center.classList.remove('is-new');
      void state.center.offsetWidth;
      state.center.classList.add('is-new');
    }
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
      node.classList.toggle('gold', !!d.gold);
      if (pop && typeof pop.has === 'function' && pop.has(d.day)) {
        node.classList.remove('is-new');
        void node.offsetWidth;            // restart the one-shot animation
        node.classList.add('is-new');
      }
    });

    el.dataset.visits = String(days.length);
    el.dataset.checks = String(days.filter(d => d.gold).length);
    el.dataset.centerpiece = center ? '1' : '0';
    el.setAttribute('aria-label', label(summary, center));
  }

  return { ART_BY_MONTH, CENTERPIECE_BOW, artForDay, wireY, positions, beadPositions, weekday, label, render };
});
