/* ══════════════════════════════════════════════════════════════
   poopika.js — Don't Talk to Poopika (extra game)

   "What you see and hear changes around Poopika."

   Poopika: when someone admires themselves in a mirror too long, the
   mirror takes something, and that something is a Poopika. Cute at
   first; the longer you look, the less cute. She keeps asking
   "Am I cute?".

   The game: the week's question plays with its opening missing (static
   where the words should be). The student picks the missing words from
   candy buttons. While the card is open, a looking clock runs (listening
   does not count): her outline shifts between shapes, echoes drift off
   her, the real her flickers through less and less cute, the forest
   tints, breathes and closes in, a music box goes sour and a hum grows.
   The voice drifts between ears with a whisper of itself a beat behind
   and a reversed breath leading in (stranger the longer you look). A
   right answer snaps it all back: the real, cute her, the clean voice.

   What goes missing (see chunkOf):
     Pre-Boo        the first word            ___ you like hiking?   → Do
     Boo-riculum /  the question opening      ___ you relax?         → How do
     Boo-Continuum                            ___ rooms are there?   → How many
   Wrong choices are wrong for a reason a student can see: the classic
   slips ("Are you like…?", "Does it cold?"), broken agreement ("How does
   you…"), a word that cannot go before a noun ("How often rooms…"), or a
   question word with a different meaning (the Japanese line says which).
   A choice that also makes a right question is never offered.

   Players know the week's questions from class: this is practice, not a
   first meeting, so the sound may be strange and the choices close.

   The scene is weird; the question card and buttons never are. Reduced
   motion keeps the pops and colour, and drops the shape-shifting,
   flickers, stretching and static.

   Voice effects need the audio host to allow cross-origin reads (CORS on
   the R2 bucket). If a clip cannot be processed it plays plainly.

   Extra game: saves as "{curriculum}-extra:poopika" (outside the nine).
   ══════════════════════════════════════════════════════════════ */
(async function () {
'use strict';

/* ── Question logic (pure: also loaded by tests/poopika.test.cjs) ─────────
   The start of the question goes missing. How much depends on level:
     Pre-Boo        the first word:            ___ is the rug?        → Where
                                               ___ you have a garden? → Do
     Boo-riculum /  the question opening:      ___ ___ you relax?     → How do
     Boo-Continuum                             ___ ___ rooms are there? → How many
                                               ___ ___ ___ music do you like? → What kind of
   Wrong choices are built so each one is wrong for a reason a student can
   see: it breaks the grammar (Does you…, How is you spend…, How much rooms…)
   or, for a Pre-Boo question word, it means something else (the Japanese
   line and the audio say which). A choice that also makes a correct
   question (Can/Will for Do; Which for What; When for What time) is never
   offered. */
const WH = ['what', 'where', 'who', 'when', 'why', 'how', 'which', 'whose', 'whom'];
const FAMILY = {
  do: 'do', does: 'do', did: 'do',
  is: 'be', are: 'be', am: 'be', was: 'be', were: 'be',
  can: 'modal', could: 'modal', will: 'modal', would: 'modal', should: 'modal',
  must: 'modal', may: 'modal', might: 'modal', shall: 'modal',
  have: 'have', has: 'have', had: 'have',
};
// Swapping a twin breaks agreement: the data's own form is the right one.
const TWIN = { do: 'does', does: 'do', is: 'are', are: 'is', am: 'are', was: 'were', were: 'was', has: 'have', have: 'has' };
// Other families that are always ungrammatical in the answer's place.
// (do→be: "How is you spend…"; be→do: "What do your favourite…";
//  modal→be: "Are you swim?"; have→do: "How does it changed?")
const BREAKS = { do: ['is', 'are'], be: ['do', 'does'], modal: ['is', 'are'], have: ['does', 'do'] };
// Question words that can never be the subject of a verb: "How makes…" is broken.
const NOT_SUBJECT = ['how', 'where', 'when', 'why'];
// Pairs that would both be right, so never offered against each other.
const SAME = { what: ['which'], which: ['what'], who: ['whom'], whom: ['who'] };
// Pre-Boo question words, most useful first.
const WH_POOL = ['what', 'where', 'who', 'when', 'how', 'why'];
// How + these is a phrase: How often / How long / How old / How important…
const HOW_DET = ['many', 'much'];

function words(en) { return String(en || '').trim().split(/\s+/); }
function bare(w) { return String(w || '').toLowerCase().replace(/[^a-z'-]/g, ''); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function phrase(ws) { return cap(ws.join(' ').toLowerCase()); }
function baseVerb(v) {
  if (/ies$/.test(v)) return v.slice(0, -3) + 'y';
  if (/(ss|sh|ch|x|o)es$/.test(v)) return v.slice(0, -2);
  if (/[^s]s$/.test(v)) return v.slice(0, -1);
  return null;
}
// A small, stable shuffle (seeded) so tests can repeat a round exactly.
function rng(seed) {
  let s = (Math.imul((seed >>> 0) || 1, 2654435761) >>> 0) || 1;   // spread small seeds out
  const next = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  next(); next();
  return next;
}
function pickFrom(list, n, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
function otherWh(wh, rand, n, filter) {
  const ban = new Set([wh].concat(SAME[wh] || []));
  return pickFrom(WH_POOL.filter(w => !ban.has(w) && (!filter || filter(w))), n, rand);
}

/* What goes missing. Returns { eat: [words], kind } or null to skip the card. */
function chunkOf(en, curriculum) {
  const ws = words(en);
  const w = ws.map(bare);
  if (ws.length < 3 || !/\?\s*$/.test(String(en))) return null;
  const first = w[0];
  const isWh = WH.includes(first), isAux = !!FAMILY[first];
  if (!isWh && !isAux) return null;                    // "In what way…", "Describe…", "If…"
  if (curriculum === 'pb') return { eat: [ws[0]], kind: isWh ? 'wh' : 'aux', head: first, subj: w[1] };
  if (isAux) return { eat: [ws[0]], kind: 'aux', head: first, subj: w[1] };
  // Question word phrases
  let n = 1;
  if (first === 'what' && w[1] === 'time') n = 2;                           // What time (like When)
  else if (first === 'how' && w[1] && !FAMILY[w[1]] && !HOW_DET.includes(w[1])) n = 2;   // How often / How important
  else if ((first === 'how' && HOW_DET.includes(w[1])) ) {
    if (FAMILY[w[2]]) n = 2;                                                // How much does…
    else return { eat: ws.slice(0, 2), kind: 'det', head: w[1] };           // How many rooms…
  } else if (['what', 'which', 'whose'].includes(first) && w[1] && !FAMILY[w[1]]) {
    if (['kind', 'kinds', 'type', 'types', 'sort', 'sorts'].includes(w[1]) && w[2] === 'of') return { eat: ws.slice(0, 3), kind: 'det', head: 'kind' };
    if (baseVerb(w[1]) && !/ss$/.test(w[1]) && (FAMILY[w[2]] === undefined)) {
      // "What makes a…", "Who helps…" vs "What activities do…": a noun is followed by an aux.
      const auxAt = w.findIndex((x, i) => i > 1 && FAMILY[x]);
      if (auxAt === -1 || auxAt > 3) return { eat: ws.slice(0, 2), kind: 'subj', head: first };
    }
    return { eat: [ws[0]], kind: 'det', head: first };                     // What activities do you…
  } else if (['who', 'what'].includes(first) && w[1] && baseVerb(w[1]) && !FAMILY[w[1]]) {
    return { eat: ws.slice(0, 2), kind: 'subj', head: first };
  }
  const aux = w[n];
  if (!FAMILY[aux]) {
    if (['who', 'what'].includes(first) && n === 1 && baseVerb(aux)) return { eat: ws.slice(0, 2), kind: 'subj', head: first };
    return null;
  }
  return { eat: ws.slice(0, n + 1), kind: 'wh-aux', head: first, aux };
}

/* The wrong choices for one chunk. */
function wrongs(ch, curriculum, rand) {
  const need = curriculum === 'pb' ? 2 : 3;
  const eat = ch.eat.map(bare);
  const out = [];
  const add = arr => { const p = phrase(arr); if (!out.includes(p) && p !== phrase(eat)) out.push(p); };
  if (ch.kind === 'aux') {
    // The classic mistakes, matched to the subject so each one is wrong on
    // exactly one point: "Are you like…?", "Does it cold?", "Do you happy?".
    const a = eat[0], fam = FAMILY[a], subj = ch.subj || '';
    const plural = ['you', 'we', 'they'].includes(subj) || (/s$/.test(subj) && !['this', 'his', 'is', 'us'].includes(subj));
    const beFor = subj === 'i' ? 'am' : plural ? 'are' : 'is';
    const doFor = (subj === 'i' || plural) ? 'do' : 'does';
    if (TWIN[a]) add([TWIN[a]]);
    if (fam === 'do' || fam === 'modal') add([beFor]);
    if (fam === 'be') add([doFor]);
    if (fam === 'have') add([doFor]);
    if (out.length < need) BREAKS[fam].forEach(b => { if (out.length < need - 1) add([b]); });
    otherWh(null, rand, 3).forEach(wh => { if (out.length < need) add([wh]); });
  } else if (ch.kind === 'wh') {
    otherWh(eat[0], rand, need).forEach(wh => add([wh]));
  } else if (ch.kind === 'wh-aux') {
    const head = eat.slice(0, -1), a = eat[eat.length - 1], fam = FAMILY[a];
    const bad = [];
    if (TWIN[a]) bad.push(TWIN[a]);
    BREAKS[fam].forEach(b => { if (!bad.includes(b)) bad.push(b); });
    add(head.concat(bad[0]));
    if (bad[1]) add(head.concat(bad[1]));
    // A different question word, with a broken verb too, so it is wrong twice.
    const wh2 = otherWh(head[0], rand, 1, w => w !== 'what' || head[0] !== 'when')[0];
    add([wh2].concat(bad[0]));
    if (out.length < need) add([otherWh(head[0], rand, 2)[1] || 'where'].concat(bad[bad.length - 1]));
  } else if (ch.kind === 'det') {
    // Before a noun only a determiner fits: How many ↔ How much, never How often / Where / Why.
    if (eat[0] === 'how') add(['how', eat[1] === 'many' ? 'much' : 'many']);
    if (ch.head === 'kind' && !/s$/.test(eat[1])) add(['how', 'many', eat[1], 'of']);   // "How many types of…" would be right
    pickFrom(['how often', 'where', 'why', 'when', 'how long'], 4, rand).forEach(p => { if (out.length < need) add(p.split(' ')); });
  } else if (ch.kind === 'subj') {
    const v = eat[1], b = baseVerb(v);
    add([eat[0], b]);                                            // What make a good friend? (agreement)
    pickFrom(NOT_SUBJECT, 2, rand).forEach(wh => { if (out.length < need) add([wh, v]); });   // How makes…
  }
  return out.slice(0, need);
}

/* One round: the question with its opening eaten, and shuffled choices. */
function buildRound(card, curriculum, seed) {
  const ch = chunkOf(card && card.en, curriculum);
  if (!ch) return null;
  const rand = rng(seed == null ? (card.n || 1) * 7919 : seed);
  const answer = phrase(ch.eat.map(bare));
  const bad = wrongs(ch, curriculum, rand);
  const need = curriculum === 'pb' ? 2 : 3;
  if (bad.length < need) return null;
  const rest = words(card.en).slice(ch.eat.length).join(' ');
  return { answer, choices: pickFrom([answer].concat(bad), need + 1, rand), rest, eaten: ch.eat.length, kind: ch.kind };
}

/* Order the rounds so the same answer does not come twice in a row when it
   can be helped (a Pre-Boo week can be half "Do"). */
function spread(rounds, rand) {
  const left = rounds.slice(), out = [];
  while (left.length) {
    const last = out.length ? out[out.length - 1].round.answer : null;
    let i = left.findIndex(r => r.round.answer !== last);
    if (i === -1) i = 0;
    // among the allowed, take the one whose answer is most common (so it gets spread out)
    const counts = {};
    left.forEach(r => { counts[r.round.answer] = (counts[r.round.answer] || 0) + 1; });
    let best = -1;
    left.forEach((r, j) => { if (r.round.answer !== last && (best === -1 || counts[r.round.answer] > counts[left[best].round.answer] || (counts[r.round.answer] === counts[left[best].round.answer] && rand() < 0.5))) best = j; });
    if (best !== -1) i = best;
    out.push(left.splice(i, 1)[0]);
  }
  return out;
}

/* How long you have been looking, 0 (cute) to 1 (not so cute). Listening
   time does not count: only looking. Pre-Boo gets longer before it turns. */
function stare(ms, curriculum) {
  const T = curriculum === 'pb' ? 22000 : curriculum === 'br' ? 18000 : 16000;
  return Math.max(0, Math.min(1, ms / T));
}

/* She keeps asking. The longer you look, the stranger the asking. */
const CUTE_LINES = [
  ['Am I cute? · かわいい？', 'Am I cute?', 'Cute? · かわいい？'],
  ['Am I cute?? · かわいい？？', 'Still cute? · まだ かわいい？', 'Look at me. · みて。'],
  ['Am I cute? Am I cute?', 'Keep looking. · もっと みて。', 'Cute? Cute? Cute?'],
];
function cuteLine(s, rand) {
  const tier = CUTE_LINES[s < 0.34 ? 0 : s < 0.67 ? 1 : 2];
  return tier[Math.floor(rand() * tier.length)];
}

/* The three pictures are not drawn at one size: poopika-3 fills 95% of its
   frame, -1 and -2 about 70%. alphaBox finds the drawn part; fitPose
   scales and moves a pose so its height, feet and centre match the
   reference pose. Measured on the device from the real files. */
function alphaBox(alpha, w, h, threshold) {
  const t = threshold == null ? 24 : threshold;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (alpha[y * w + x] > t) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
}
function fitPose(box, ref) {
  if (!box || !ref) return { k: 1, ox: 50, oy: 100, dx: 0, dy: 0 };
  const k = (ref.y1 - ref.y0) / (box.y1 - box.y0);
  const cx = (box.x0 + box.x1) / 2, rcx = (ref.x0 + ref.x1) / 2;
  return { k, ox: cx * 100, oy: box.y1 * 100, dx: (rcx - cx) * 100, dy: (ref.y1 - box.y1) * 100 };
}

const PoopikaLogic = { WH, FAMILY, TWIN, BREAKS, chunkOf, wrongs, buildRound, spread, rng, stare, cuteLine, CUTE_LINES, alphaBox, fitPose, baseVerb };
if (typeof module !== 'undefined' && module.exports) module.exports = PoopikaLogic;
if (typeof window !== 'undefined') window.PoopikaLogic = PoopikaLogic;

/* ── Game ─────────────────────────────────────────────────────────────── */
const CFG = typeof window !== 'undefined' ? window.GAME_CONFIG : null;
const U   = typeof window !== 'undefined' ? window.GAME_UTILS : null;
if (!CFG || !U || typeof document === 'undefined') return;

const TITLE = "Don't Talk to Poopika";
U.setTitle(TITLE);
U.unlockAudio();

const SAVE_ID = `${CFG.curriculum}-extra:poopika`;
// Full paths, so tests/karasuki-wanderer-webp-audit.cjs tracks each pose.
const POSE = {
  idle:  '/the-booha-adventure/assets/img/wanderers/poopika-3.webp',   // paw at her mouth
  right: '/the-booha-adventure/assets/img/wanderers/poopika-1.webp',   // happy
  wrong: '/the-booha-adventure/assets/img/wanderers/poopika-2.webp',   // hides her face
};
const POSE_NAMES = Object.keys(POSE);
let seedBase = (Date.now() >>> 0) || 7;
function buildRounds() {
  seedBase += 101;
  const rand = rng(seedBase);
  const rs = U.shuffle(CFG.cards.slice(0, 15))
    .map((card, i) => ({ card, round: buildRound(card, CFG.curriculum, seedBase + i * 31) }))
    .filter(r => r.round);
  return spread(rs, rand);
}
let rounds = buildRounds();
const TOTAL = rounds.length;
const run = U.createRun({ total: TOTAL, recoverPoints: 50 });
const voiceGate = U.createAudioGate({ cooldownMs: 300, timeoutMs: 12000 });
await U.loadSFX('ding', CFG.sfxBase + 'ding.mp3');

/* Measure each pose once, so all three stand the same size on the same
   feet (the files are drawn at different scales). */
const FIT = {};
await (async function measurePoses() {
  const imgs = await Promise.all(POSE_NAMES.map(n => new Promise(res => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = POSE[n];
  })));
  const boxes = imgs.map(img => {
    if (!img) return null;
    try {
      const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, S, S);
      const d = g.getImageData(0, 0, S, S).data, a = new Uint8Array(S * S);
      for (let i = 0; i < S * S; i++) a[i] = d[i * 4 + 3];
      return alphaBox(a, S, S);
    } catch (_) { return null; }
  });
  const ref = boxes.reduce((best, b) => (b && (!best || (b.y1 - b.y0) > (best.y1 - best.y0)) ? b : best), null);
  POSE_NAMES.forEach((n, i) => { FIT[n] = fitPose(boxes[i], ref); });
})();
function fitStyle(n) {
  const f = FIT[n] || { k: 1, ox: 50, oy: 100, dx: 0, dy: 0 };
  return `transform-origin:${f.ox.toFixed(1)}% ${f.oy.toFixed(1)}%;transform:translate(${f.dx.toFixed(1)}%,${f.dy.toFixed(1)}%) scale(${f.k.toFixed(3)})`;
}

const STYLE = `
/* Poopika's version of the level forest. --pk-s is how long you have been
   looking (0 cute … 1 not so cute); the scene follows it. */
html.pk-world{--world-ink:#fff7fd;--pk-s:0}
html[data-skin="v2"].pk-world body::before{
  filter:blur(calc(8px + var(--pk-s) * 6px)) saturate(calc(1.6 + var(--pk-s) * 1.2)) hue-rotate(calc(var(--pk-hue,290deg) + var(--pk-s) * 80deg)) contrast(calc(1 + var(--pk-s) * .35));
  transition:filter 1.2s linear;animation:pkBreathe 7s ease-in-out infinite}
@keyframes pkBreathe{50%{transform:scale(calc(1.02 + var(--pk-s) * .07)) rotate(calc(var(--pk-s) * 1.5deg))}}
html[data-skin="v2"].pk-world body::after{background:
  radial-gradient(120% 70% at 85% 10%,rgba(255,212,94,.26),transparent 60%),
  radial-gradient(90% 60% at 10% 90%,rgba(114,242,208,.28),transparent 60%),
  linear-gradient(165deg,rgba(255,105,189,.62),rgba(150,96,255,.58) 52%,rgba(38,17,61,.8))}
html[data-skin="v2"][data-power="minimal"].pk-world body::after{background:linear-gradient(165deg,rgba(255,105,189,.86),rgba(110,70,200,.9) 55%,rgba(38,17,61,.94))}
html.pk-world .game-title,html.pk-world .game-week{color:#fff7fd;-webkit-text-fill-color:#fff7fd;text-shadow:0 2px 0 rgba(38,17,61,.55),0 0 18px rgba(255,105,189,.7)}
/* The edges close in the longer you look. */
.pk-vignette{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:calc(var(--pk-s) * .85);transition:opacity 1.2s linear;
  background:radial-gradient(ellipse 75% 70% at 50% 45%,transparent 45%,rgba(38,17,61,.65) 78%,rgba(14,4,24,.95))}
/* Wrong: the forest lurches. Right: everything snaps back. */
html.pk-world.pk-lurch body::before{transform:scale(1.12,1.28) skewX(7deg);transition:transform .25s}
html.pk-world.pk-snap body::before{filter:blur(3px) saturate(1.3) hue-rotate(var(--pk-hue,290deg));animation:none;transition:filter .3s}
@media (prefers-reduced-motion:reduce){html.pk-world body::before,html.pk-world.pk-lurch body::before{animation:none !important;transform:none !important}}
html[data-motion="reduced"].pk-world body::before,html[data-motion="reduced"].pk-world.pk-lurch body::before{animation:none !important;transform:none !important}

.pk-wrap{
  --pk-pink:#ff69bd;--pk-mint:#72f2d0;--pk-lilac:#b98cff;--pk-yellow:#ffd45e;--pk-sky:#7fd3ff;--pk-ink:#24152f;--pk-night:#26113d;
  --game-pill-bg:rgba(38,17,61,.62);--game-pill-border:rgba(255,247,253,.35);--game-pill-text:#fff7fd;--game-meter-bg:rgba(255,247,253,.28);
  position:relative;max-width:720px;margin:0 auto;padding:.3rem 1rem 3rem;display:flex;flex-direction:column;align-items:center;gap:.7rem;box-sizing:border-box;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.pk-wrap>*{position:relative;z-index:1}
.pk-intro{margin:0;text-align:center;font-weight:900;font-size:clamp(13px,2.2vw,16px);line-height:1.45;color:#fff7fd;text-shadow:0 2px 0 rgba(38,17,61,.5)}
.pk-intro span{display:block}
.pk-hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.pk-pill{padding:5px 16px;border-radius:999px;background:var(--game-pill-bg);border:1.5px solid var(--game-pill-border);color:var(--game-pill-text);font-size:clamp(12px,2vw,15px);font-weight:900;font-variant-numeric:tabular-nums}
.pk-dots{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.pk-dot{width:10px;height:10px;border-radius:50%;background:var(--game-meter-bg)}
.pk-dot.done{background:#22c55e}.pk-dot.half{background:var(--pk-yellow)}.pk-dot.miss{background:#ff7a45}
.pk-dot.now{background:#fff7fd;transform:scale(1.3);box-shadow:0 0 10px var(--pk-pink)}

/* She never covers the English: beside the play button on phones and
   tablets, her own column left of the card on wide screens. */
.pk-stage{position:relative;width:100%;display:grid;grid-template-columns:1fr auto 1fr;grid-template-areas:"sign sign sign" ". listen who";align-items:center;row-gap:.6rem;padding-top:4px}
.pk-sign{grid-area:sign}
.pk-listen{grid-area:listen}

/* Poopika: mostly a shape that will not hold still. Echoes drift off her;
   now and then the real her shows through. */
.pk-who{grid-area:who;justify-self:start;align-self:start;position:relative;z-index:2;width:clamp(100px,17vw,150px);aspect-ratio:1;margin:4px 0 0 2px;pointer-events:none}
.pk-who .pk-layer{position:absolute;inset:0;transform-origin:50% 95%}
.pk-who img{position:absolute;inset:0;width:100%;height:100%;display:block}
.pk-who .pk-sil img,.pk-who .pk-echo img{filter:brightness(0)}
.pk-who .pk-sil{filter:drop-shadow(0 0 5px var(--pk-pink)) drop-shadow(0 0 16px rgba(185,140,255,.9));
  transform:scale(calc(1 + var(--pk-s) * .12),calc(1 + var(--pk-s) * .07)) skewX(calc(var(--pk-s) * -10deg));transition:transform 1.2s linear}
.pk-who .pk-echo{opacity:calc(.1 + var(--pk-s) * .35);filter:blur(1px) drop-shadow(0 0 8px var(--pk-pink))}
.pk-who .pk-echo.a{transform:translate(calc(var(--pk-s) * -26px),calc(var(--pk-s) * -8px)) scale(calc(1 + var(--pk-s) * .12));animation:pkEchoA 3.1s ease-in-out infinite}
.pk-who .pk-echo.b{transform:translate(calc(var(--pk-s) * 22px),calc(var(--pk-s) * 6px)) scale(calc(.94 + var(--pk-s) * .2));animation:pkEchoB 4.3s ease-in-out infinite}
@keyframes pkEchoA{50%{translate:calc(var(--pk-s) * -10px) 4px}}
@keyframes pkEchoB{50%{translate:calc(var(--pk-s) * 9px) -5px}}
.pk-who .pk-real{opacity:0;transition:opacity .08s}
.pk-who.peek .pk-real{opacity:1}
.pk-who.peek.odd .pk-real img{filter:contrast(1.5) saturate(.35) hue-rotate(-25deg)}
.pk-who.peek.odd .pk-real{transform:scale(.93,1.16)}
.pk-who.cute .pk-real{opacity:1;transition:opacity .25s}
.pk-who.cute .pk-sil,.pk-who.cute .pk-echo{opacity:0;transition:opacity .25s}
.pk-who.cute .pk-real{animation:pkBounce .65s cubic-bezier(.3,1.8,.5,1)}
@keyframes pkBounce{0%{transform:scale(.85,1.14)}45%{transform:scale(1.14,.9)}100%{transform:none}}
.pk-who.lurch .pk-sil{animation:pkLurch .5s ease}
@keyframes pkLurch{20%{translate:-8px 0;scale:1.1 .9}50%{translate:7px -4px;scale:.9 1.2}80%{translate:-3px 0}}
.pk-bubble{position:absolute;left:50%;bottom:calc(100% - 6px);z-index:3;transform:translate(-50%,6px) scale(.6);opacity:0;white-space:nowrap;
  padding:5px 11px;border-radius:14px;background:#fff7fd;color:var(--pk-ink);font:900 13px/1.2 var(--game-font-body);box-shadow:0 3px 0 rgba(38,17,61,.35);transition:opacity .2s,transform .25s cubic-bezier(.3,1.7,.5,1)}
.pk-bubble::after{content:'';position:absolute;left:50%;top:100%;margin-left:-6px;border:6px solid transparent;border-top-color:#fff7fd}
.pk-bubble.show{opacity:1;transform:translate(-50%,0) scale(1)}
.pk-bubble.odd{background:var(--pk-night);color:#ffd2ec;letter-spacing:.06em}
.pk-bubble.odd::after{border-top-color:var(--pk-night)}

/* The question card: plain and readable, always. */
.pk-sign{position:relative;z-index:1;width:calc(100% - 28px);box-sizing:border-box;margin:0 14px;padding:1rem 1.1rem 1.05rem;border-radius:22px;
  background:#fffaf6;color:var(--pk-ink);box-shadow:0 0 0 4px var(--pk-pink),0 0 0 8px rgba(255,247,253,.6),0 14px 30px rgba(38,17,61,.4);text-align:left}
.pk-sign::before,.pk-sign::after{content:'';position:absolute;top:50%;width:26px;height:46px;margin-top:-23px;background:var(--pk-pink);
  clip-path:polygon(0 0,100% 30%,100% 70%,0 100%,30% 75%,0 50%,30% 25%)}
.pk-sign::before{left:-30px}.pk-sign::after{right:-30px;transform:scaleX(-1)}
.pk-jp{margin:0 0 .35rem;font-weight:800;font-size:clamp(13px,2.4vw,16px);color:#6b4a73;line-height:1.35}
.pk-q{margin:0;font:900 clamp(22px,4.6vw,34px)/1.3 var(--game-font-body);letter-spacing:.005em;color:var(--pk-ink);overflow-wrap:anywhere}
/* The missing words will not hold still either: static until you choose. */
.pk-gap{display:inline-flex;align-items:center;justify-content:center;min-width:3.6em;height:1.25em;margin-right:.18em;padding:0 .3em;box-sizing:border-box;vertical-align:-.12em;
  border-radius:.35em;background:var(--pk-night);color:#ffb3df;font-size:.9em;letter-spacing:.08em;font-family:ui-monospace,Menlo,Consolas,monospace;overflow:hidden}
.pk-gap.ok{background:#1f7a46;color:#fff;letter-spacing:0;font-family:inherit;animation:pkLand .5s cubic-bezier(.3,1.7,.5,1)}
.pk-gap.shown{background:var(--pk-yellow);color:var(--pk-ink);letter-spacing:0;font-family:inherit;animation:pkLand .5s ease}
@keyframes pkLand{0%{transform:scale(.3);filter:blur(4px)}60%{transform:scale(1.2);filter:none}100%{transform:none}}

.pk-listen{display:flex;align-items:center;gap:12px;justify-content:center}
.pk-play{position:relative;width:64px;height:64px;border:none;border-radius:50%;cursor:pointer;font-size:24px;color:var(--pk-ink);
  background:radial-gradient(circle at 35% 30%,#fff,var(--pk-yellow) 72%);box-shadow:0 6px 0 rgba(38,17,61,.45),0 0 0 5px rgba(255,247,253,.5)}
.pk-play:active{transform:translateY(4px);box-shadow:0 2px 0 rgba(38,17,61,.45)}
.pk-play.is-waiting{animation:pkCall 1.1s ease-in-out infinite}
@keyframes pkCall{50%{box-shadow:0 6px 0 rgba(38,17,61,.45),0 0 0 14px rgba(255,212,94,.35)}}
.pk-listen-label{font-weight:900;color:#fff7fd;text-shadow:0 2px 0 rgba(38,17,61,.5);font-size:clamp(13px,2.3vw,16px);line-height:1.2}

/* Gummy buttons: candy colours only, never a verdict green or orange. */
.pk-choices{display:grid;grid-template-columns:repeat(var(--pk-cols,2),minmax(0,1fr));gap:12px;width:100%;max-width:560px}
.pk-choice{min-height:62px;padding:10px 12px;border:none;border-radius:22px;cursor:pointer;color:var(--pk-ink);
  font:900 clamp(20px,4.2vw,27px)/1.1 var(--game-font-body);background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.85),var(--c) 62%);
  box-shadow:0 7px 0 color-mix(in srgb,var(--c) 55%,#26113d),inset 0 -6px 0 rgba(38,17,61,.12);transition:transform .1s;animation:pkIn .4s cubic-bezier(.3,1.7,.5,1) both}
.pk-choice:nth-child(2){animation-delay:.05s}.pk-choice:nth-child(3){animation-delay:.1s}.pk-choice:nth-child(4){animation-delay:.15s}
@keyframes pkIn{from{transform:scale(.4) rotate(-6deg);opacity:0}to{transform:none;opacity:1}}
.pk-choice:active{transform:translateY(5px);box-shadow:0 2px 0 color-mix(in srgb,var(--c) 55%,#26113d)}
.pk-choice.right{background:#1f7a46;color:#fff;box-shadow:0 7px 0 #0f4a29}
.pk-choice.right::after{content:' ✓'}
.pk-choice.wrong{background:#d9d0dd;color:#5a4a60;box-shadow:0 3px 0 #a99bb0;text-decoration:line-through;text-decoration-thickness:3px;animation:pkNo .4s ease}
@keyframes pkNo{25%{transform:translateX(-7px) rotate(-2deg)}55%{transform:translateX(6px) rotate(2deg)}}
.pk-choice:disabled{cursor:default}
/* Choices wait for the question, then will not stay put. */
.pk-choices.pk-wait{visibility:hidden}
.pk-choices.pk-wait .pk-choice{animation:none}
.pk-choices.glitching{pointer-events:none}
.pk-choices.glitching .pk-choice{filter:drop-shadow(4px 0 0 rgba(255,40,190,.75)) drop-shadow(-4px 0 0 rgba(40,255,230,.75));font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.04em}
@media (prefers-reduced-motion:reduce){.pk-choices.glitching .pk-choice{filter:none}}
.pk-fb{min-height:1.4em;margin:0;text-align:center;font-weight:900;font-size:clamp(14px,2.5vw,17px);color:#fff7fd;text-shadow:0 2px 0 rgba(38,17,61,.55)}
.pk-next{border:none;border-radius:999px;padding:13px 26px;min-height:50px;font:900 17px/1 var(--game-font-body);cursor:pointer;color:var(--pk-ink);
  background:linear-gradient(135deg,var(--pk-yellow),var(--pk-pink));box-shadow:0 5px 0 rgba(38,17,61,.4)}
.pk-next[hidden]{display:none}
.pk-burst{position:fixed;left:50%;top:24%;transform:translate(-50%,-50%) scale(0);z-index:60;pointer-events:none;white-space:nowrap;
  font:900 clamp(34px,8vw,66px)/1 var(--game-font-title,var(--game-font-body));color:#fff;text-shadow:0 4px 0 var(--pk-pink),0 0 30px var(--pk-lilac)}
.pk-burst.show{animation:pkBurst 1.05s cubic-bezier(.3,1.6,.5,1) both}
@keyframes pkBurst{0%{transform:translate(-50%,-50%) scale(0) rotate(-14deg)}25%{transform:translate(-50%,-50%) scale(1.2) rotate(5deg)}40%,75%{transform:translate(-50%,-50%) scale(1) rotate(0)}100%{transform:translate(-50%,-75%) scale(1);opacity:0}}

@media (prefers-reduced-motion:reduce){.pk-who .pk-echo,.pk-who.cute .pk-real,.pk-who.lurch .pk-sil,.pk-play.is-waiting{animation:none !important}.pk-burst.show{animation:none;transform:translate(-50%,-50%) scale(1)}}
html[data-motion="reduced"] .pk-who .pk-echo,html[data-motion="reduced"] .pk-who.lurch .pk-sil{animation:none !important}

/* Phones: the intro goes, Poopika stands beside the play button. */
@media (max-width:600px){
  .pk-intro{display:none}
  .pk-wrap{gap:.55rem;padding-top:0}
  .pk-who{width:100px}
  .pk-who .pk-sil{transform:scale(calc(1 + var(--pk-s) * .04),calc(1 + var(--pk-s) * .07)) skewX(calc(var(--pk-s) * -8deg))}
  .pk-stage{overflow-x:clip}
  .pk-bubble{left:auto;right:-6px;transform:translate(0,6px) scale(.6);transform-origin:85% 100%}
  .pk-bubble.show{transform:none}
  .pk-bubble::after{left:auto;right:30px}
  .pk-sign{padding:.8rem .85rem .9rem}
  .pk-choice{min-height:56px;border-radius:18px}
  .pk-play{width:56px;height:56px;font-size:21px}
}
/* Wide screens: she gets her own column, big, leaning in from the left. */
@media (min-width:1060px){
  .pk-wrap{max-width:900px}
  .pk-stage{grid-template-columns:auto 1fr;grid-template-areas:"who sign" "who listen";column-gap:0}
  .pk-who{align-self:center;justify-self:end;width:230px;margin:0 -16px 0 0;transform:scaleX(-1)}
  .pk-who .pk-sil{transform:scale(calc(1 - var(--pk-s) * .07),calc(1 + var(--pk-s) * .24)) skewX(calc(var(--pk-s) * -7deg))}
  .pk-who .pk-bubble{transform:translate(-50%,6px) scale(.6) scaleX(-1)}
  .pk-who .pk-bubble.show{transform:translate(-50%,0) scaleX(-1)}
  .pk-choices{margin-left:200px;width:calc(100% - 200px)}
}
`;

const layer = (cls, n) => `<span class="pk-layer ${cls}" data-pose="${n}"><img src="${POSE[n]}" alt="" style="${fitStyle(n)}"></span>`;
U.mount(`<style>${STYLE}</style>
<div class="pk-vignette" aria-hidden="true"></div>
<div class="pk-wrap" id="pk-main">
  <p class="pk-intro"><span>What you see and hear changes around Poopika. Don't look too long.</span><span>プピカの まわりでは、みえるものも きこえるものも かわるよ。じっと みないでね。</span></p>
  <div class="pk-hud">
    <span class="pk-pill">Card <b id="pk-num">1</b> / ${TOTAL}</span>
    <span class="pk-pill">Score <b id="pk-score">0</b> / ${TOTAL}</span>
  </div>
  <div class="pk-dots" id="pk-dots"></div>
  <div class="pk-stage" id="pk-stage">
    <div class="pk-sign" id="pk-sign">
      <p class="pk-jp" id="pk-jp"></p>
      <p class="pk-q" id="pk-q" aria-live="polite"></p>
    </div>
    <div class="pk-listen">
      <button type="button" class="pk-play" id="pk-play" aria-label="Listen / きく">▶</button>
      <span class="pk-listen-label" id="pk-listen-label">Listen · きいて</span>
    </div>
    <div class="pk-who" id="pk-who" role="img" aria-label="Poopika">
      ${layer('pk-echo a', 'idle')}${layer('pk-echo b', 'idle')}${layer('pk-sil', 'idle')}${layer('pk-real', 'idle')}
      <div class="pk-bubble" id="pk-bubble" aria-live="polite"></div>
    </div>
  </div>
  <div class="pk-choices" id="pk-choices" role="group" aria-label="Choices / えらんでね"></div>
  <p class="pk-fb" id="pk-fb" aria-live="polite"></p>
  <button type="button" class="pk-next" id="pk-next" hidden>Next · つぎへ →</button>
  <button type="button" id="pk-replay" hidden>もう一度</button>
  <button type="button" id="pk-back" hidden>メニューへ</button>
</div>
<div class="pk-burst" id="pk-burst" aria-hidden="true"></div>`);

const $ = id => document.getElementById(id);
const whoEl = $('pk-who'), bubbleEl = $('pk-bubble'), signEl = $('pk-sign'), jpEl = $('pk-jp'), qEl = $('pk-q'), playBtn = $('pk-play'), listenLbl = $('pk-listen-label');
const choicesEl = $('pk-choices'), fb = $('pk-fb'), nextBtn = $('pk-next'), numEl = $('pk-num'), scoreEl = $('pk-score'), dotsEl = $('pk-dots'), burstEl = $('pk-burst');
const html = document.documentElement;
html.classList.add('pk-world');
html.style.setProperty('--pk-hue', { pb: '300deg', br: '250deg', bc: '40deg' }[CFG.curriculum] || '290deg');

const POP = window.BoohaPop || new Proxy({}, { get: (_, k) => (k === 'color' ? () => '' : k === 'canFlash' ? () => true : () => {}) });
POP.init({ pill: '#pk-score' });
const PLAY_HTML = playBtn.innerHTML;
const CANDY = ['#ff69bd', '#b98cff', '#ffd45e', '#7fd3ff'];
const rand = rng((Date.now() ^ 0x5eed) >>> 0);

let idx = 0, score = 0, perfectRun = 0, heardAny = false;
let tries = 0, busy = false, done = false, cardMissed = false;
let missedItems = [];
const dotState = [];

function stillMotion() {
  const m = window.BoohaMotion;
  try { if (m && m.reduced && m.reduced()) return true; } catch (_) {}
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function later(fn, ms) { const my = idx; setTimeout(() => { if (my === idx) fn(); }, ms); }

/* ── Looking: the clock that makes her less cute ─────────────────────── */
// Only looking counts: the clock stops while a question is playing, while
// the card is answered, and while the page is hidden.
let lookedMs = 0, lookFrom = 0, looking = false, s = 0;
function lookStart() { if (!looking && !done) { looking = true; lookFrom = performance.now(); } }
function lookStop() { if (looking) { lookedMs += performance.now() - lookFrom; looking = false; } }
function lookedNow() { return lookedMs + (looking ? performance.now() - lookFrom : 0); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { lookStop(); Bed.stop(); } else if (!done && !speaking) { lookStart(); Bed.start(); } });

let nextShape = 0, nextPeek = 0, nextAsk = 0;
function setPose(cls, n) { whoEl.querySelectorAll(cls).forEach(l => { if (l.dataset.pose === n) return; l.dataset.pose = n; const img = l.querySelector('img'); img.src = POSE[n]; img.setAttribute('style', fitStyle(n)); }); }
function ask(text, odd) {
  bubbleEl.textContent = text;
  bubbleEl.classList.toggle('odd', !!odd);
  bubbleEl.classList.remove('show'); void bubbleEl.offsetWidth; bubbleEl.classList.add('show');
  clearTimeout(ask.t); ask.t = setTimeout(() => bubbleEl.classList.remove('show'), 1900);
}
function tick() {
  s = stare(lookedNow(), CFG.curriculum);
  html.style.setProperty('--pk-s', s.toFixed(3));
  Bed.mood(s);
  // The longer you look, the more often the choices jump.
  if (revealed && !done && performance.now() > nextGlitch) {
    glitch();
    nextGlitch = performance.now() + (stillMotion() ? 5200 : 4300 - 2500 * s) + rand() * 900;
  }
  if (done || stillMotion()) return;
  const t = performance.now();
  // Her outline keeps changing, faster the longer you look.
  if (t > nextShape) {
    const n = POSE_NAMES[Math.floor(rand() * POSE_NAMES.length)];
    setPose('.pk-sil', n);
    setPose('.pk-echo.a', POSE_NAMES[(POSE_NAMES.indexOf(n) + 1) % 3]);
    setPose('.pk-echo.b', POSE_NAMES[(POSE_NAMES.indexOf(n) + 2) % 3]);
    nextShape = t + 2600 - 1700 * s + rand() * 600;
  }
  // Now and then the real her shows through, cute at first, then not.
  if (t > nextPeek) {
    setPose('.pk-real', POSE_NAMES[Math.floor(rand() * 3)]);
    whoEl.classList.toggle('odd', s > 0.55);
    whoEl.classList.add('peek');
    setTimeout(() => whoEl.classList.remove('peek'), s > 0.55 ? 220 : 160);
    nextPeek = t + 3500 + rand() * 3500;
  }
  if (t > nextAsk && looking) {
    ask(cuteLine(s, rand), s >= 0.67);
    nextAsk = t + 6500 - 3500 * s + rand() * 1500;
  }
}
setInterval(tick, 120);

/* ── Sound: the question, and what is around it ──────────────────────── */
function ctx() { try { const S = window.BoohaSFX; const c = S && S.context && S.context(); return c && c.state === 'running' ? c : null; } catch (_) { return null; } }
// Inside a tap the shared context may still be waking up: give it a moment.
async function liveCtx() {
  let c = null;
  try { const S = window.BoohaSFX; c = S && S.context && S.context(); } catch (_) {}
  if (!c) return null;
  if (c.state !== 'running') { try { await Promise.race([c.resume(), new Promise(r => setTimeout(r, 400))]); } catch (_) {} }
  return c.state === 'running' ? c : null;
}

// A music box that goes sour, and a hum that grows, the longer you look.
const Bed = (function () {
  let c = null, out = null, hum = null, timer = 0, step = 0, sour = 0, duck = 1, nextAt = 0;
  const TUNE = [0, 4, 7, 12, 7, 4, 9, 7, 0, 4, 7, 11, 12, 7, 4, 2];
  function build() {
    c = ctx(); if (!c) return false;
    out = c.createGain(); out.gain.value = 0; out.connect(c.destination);
    out.gain.setTargetAtTime(0.9, c.currentTime, 0.4);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.connect(out);
    const hg = c.createGain(); hg.gain.value = 0; hg.connect(lp);
    const o1 = c.createOscillator(), o2 = c.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = 110; o2.frequency.value = 111.5;
    o1.connect(hg); o2.connect(hg); o1.start(); o2.start();
    hum = { hg, o2 };
    return true;
  }
  function note() {
    if (!c) return;
    const t = Math.max(c.currentTime + 0.02, nextAt);
    const semi = TUNE[step++ % TUNE.length];
    const cents = (rand() - 0.5) * 2 * (6 + 85 * sour);
    const f = 1046.5 * Math.pow(2, semi / 12) * Math.pow(2, cents / 1200);
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045 * duck, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.9);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 1);
    nextAt = t + 0.36 + sour * (rand() * 0.25);   // and the rhythm stumbles
  }
  return {
    start() {
      if (timer || document.hidden) return;
      if (!c && !build()) return;
      nextAt = 0;
      out.gain.setTargetAtTime(0.9, c.currentTime, 0.3);
      timer = setInterval(() => { if (c.currentTime + 0.15 > nextAt) note(); }, 90);
    },
    stop() { clearInterval(timer); timer = 0; if (c && out) out.gain.setTargetAtTime(0, c.currentTime, 0.15); },
    mood(v) {
      sour = v;
      if (!c || !hum) return;
      hum.hg.gain.setTargetAtTime(0.11 * v * duck, c.currentTime, 0.5);
      hum.o2.frequency.setTargetAtTime(111.5 + v * 5, c.currentTime, 0.8);
    },
    duck(on) { duck = on ? 0.25 : 1; this.mood(sour); },
    hush() { if (c && hum) hum.hg.gain.setTargetAtTime(0, c.currentTime, 0.05); },
  };
})();

// The voice: decoded once per card. A whisper of it lags behind in the
// other ear, it drifts between ears, and a reversed breath leads in. The
// stranger the longer you look. A fixed question plays clean.
const voices = new Map();
function decode(c, buf) {
  return new Promise((res, rej) => { const p = c.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); });
}
async function loadVoice(card) {
  if (!card || !card.mp3) return null;
  if (voices.has(card.mp3)) return voices.get(card.mp3);
  const job = (async () => {
    const c = await liveCtx(); if (!c) return null;
    const url = CFG.audioBase + card.mp3;
    let r = null;
    try { r = await fetch(url, { mode: 'cors' }); } catch (_) {}
    // A copy saved before the audio host allowed this cannot be used: reload it.
    if (!r || !r.ok) { try { r = await fetch(url, { mode: 'cors', cache: 'reload' }); } catch (_) { r = null; } }
    if (!r || !r.ok) return null;
    const b = await decode(c, await r.arrayBuffer());
    const rev = c.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
    for (let ch = 0; ch < b.numberOfChannels; ch++) { const a = b.getChannelData(ch), z = rev.getChannelData(ch), n = a.length; for (let i = 0; i < n; i++) z[i] = a[n - 1 - i]; }
    return { b, rev };
  })().catch(() => null);
  voices.set(card.mp3, job);
  const v = await job;
  if (!v) voices.delete(card.mp3);   // try again next time
  return v;
}

let speaking = false, stopSpeech = null;
function stopVoice() {
  if (stopSpeech) { try { stopSpeech(); } catch (_) {} stopSpeech = null; }
  voiceGate.stop();
  speaking = false;
  Bed.duck(false);
  playBtn.classList.remove('playing');
  playBtn.innerHTML = PLAY_HTML; POP.speakerWait(playBtn);
}
async function play(clean, auto) {
  const card = rounds[idx] && rounds[idx].card;
  if (!card || !card.mp3) return;
  // Booha is angry (game-angry.js): a tapped replay waits out the cooldown.
  const A = window.BoohaAngry;
  if (!auto && A && !A.voiceOk(card.mp3)) return;
  const myIdx = idx;
  run.pauseClock();   // listening time is not answer time
  U.unlockAudio();
  stopVoice();
  speaking = true; lookStop(); Bed.duck(true);
  later(reveal, 9000);   // a slow or stuck clip never hides the choices for long
  playBtn.classList.add('playing');
  POP.eq(playBtn);
  const spkId = POP.speaker(playBtn);
  const end = () => {
    if (myIdx !== idx || !speaking) return;
    speaking = false; stopSpeech = null;
    Bed.duck(false);
    playBtn.innerHTML = PLAY_HTML; POP.speakerEnd(playBtn, spkId);
    playBtn.classList.remove('playing', 'is-waiting');
    heardAny = true;
    run.audioDone();
    reveal();
    if (!done) lookStart();
    if (clean && afterClean) { const f = afterClean; afterClean = null; f(); }
  };
  const v = await loadVoice(card);
  const c = await liveCtx();
  Bed.start();
  if (myIdx !== idx || !speaking) return;
  if (!v || !c) {   // no Web Audio: the plain recording still plays
    const a = new Audio(CFG.audioBase + card.mp3);
    a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', '');
    if (!voiceGate.play(a, { replace: true, ignoreCooldown: true, onEnd: end })) end();
    return;
  }
  if (A) A.voiceStart(card.mp3);
  let ended = false;
  const done1 = () => { if (!ended) { ended = true; if (A) A.voiceEnd(card.mp3); } };
  const stopper = speak(c, v, clean ? 0 : 0.25 + 0.75 * s, () => { done1(); end(); });
  stopSpeech = () => { stopper(); done1(); };
}
function speak(c, v, weird, onEnd) {
  const t0 = c.currentTime + (weird ? 0.55 : 0.03);
  const out = c.createGain(); out.gain.value = 1;
  out.__boohaVoice = true;   // the English voice is not an effect: it stays on when Booha is angry
  out.connect(c.destination);
  const nodes = [];
  const src = (buf) => { const n = c.createBufferSource(); n.buffer = buf; nodes.push(n); return n; };
  const pan = () => (c.createStereoPanner ? c.createStereoPanner() : null);
  // the voice itself, clear
  const dry = src(v.b), dp = pan();
  if (dp) { dry.connect(dp); dp.connect(out); } else dry.connect(out);
  if (weird) {
    // it drifts from ear to ear
    if (dp) { const lfo = c.createOscillator(), d = c.createGain(); lfo.frequency.value = 0.3 + weird * 0.4; d.gain.value = 0.25 + weird * 0.5; lfo.connect(d); d.connect(dp.pan); lfo.start(t0); lfo.stop(t0 + v.b.duration + 0.2); nodes.push(lfo); }
    // a thin whisper of it, a beat behind, in the other ear
    const wh = src(v.b), hp = c.createBiquadFilter(), wg = c.createGain(), wp = pan();
    hp.type = 'highpass'; hp.frequency.value = 1700; wg.gain.value = 0.1 + weird * 0.35;
    wh.connect(hp); hp.connect(wg);
    if (wp) { wp.pan.value = dp ? -0.7 : 0; wg.connect(wp); wp.connect(out); } else wg.connect(out);
    wh.start(t0 + 0.08 + weird * 0.14);
    // a reversed breath of the start, swelling into the first word
    const lead = Math.min(0.55, v.rev.duration);
    const rv = src(v.rev), rg = c.createGain();
    rg.gain.setValueAtTime(0.0001, t0 - lead); rg.gain.exponentialRampToValueAtTime(0.18 + weird * 0.3, t0 - 0.02); rg.gain.linearRampToValueAtTime(0, t0);
    rv.connect(rg); rg.connect(out);
    rv.start(t0 - lead, v.rev.duration - lead, lead);
  }
  dry.start(t0);
  let finished = false;
  const finish = () => { if (finished) return; finished = true; clearTimeout(safety); onEnd(); };
  dry.onended = finish;
  const safety = setTimeout(finish, (v.b.duration + 1.5) * 1000);
  return () => { finished = true; clearTimeout(safety); nodes.forEach(n => { try { n.stop(); } catch (_) {} }); try { out.disconnect(); } catch (_) {} };
}
let afterClean = null;

// Small made sounds: a sour sting for a wrong answer, a bright chime when
// the world snaps back.
function sting() {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + 0.01, g = c.createGain(), lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 900; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.5);
  lp.connect(g); g.connect(c.destination);
  [196, 207.6].forEach(f => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f / 2.2, t + 0.45); o.connect(lp); o.start(t); o.stop(t + 0.52); });
}

/* ── Cards ────────────────────────────────────────────────────────────── */
function renderDots() {
  dotsEl.innerHTML = '';
  for (let i = 0; i < TOTAL; i++) {
    const d = document.createElement('span');
    const st = dotState[i];
    d.className = 'pk-dot' + (st === 'ok' ? ' done' : st === 'half' ? ' half' : st === 'miss' ? ' miss' : i === idx ? ' now' : '');
    dotsEl.appendChild(d);
  }
}
// The gap shows static, never the answer's length.
const STATIC = '▒░▓▚▞▙▟▛▜';
let staticTimer = 0;
function gapEl() { return qEl.querySelector('.pk-gap'); }
function renderQuestion() {
  const { round } = rounds[idx];
  qEl.innerHTML = '';
  const gap = document.createElement('span');
  gap.className = 'pk-gap';
  gap.setAttribute('aria-label', 'missing words / ぬけた ことば');
  qEl.appendChild(gap);
  qEl.appendChild(document.createTextNode(round.rest));
  const fill = () => { let t = ''; for (let i = 0; i < 4; i++) t += STATIC[Math.floor(rand() * STATIC.length)]; gap.textContent = t; };
  fill();
  clearInterval(staticTimer);
  if (!stillMotion()) staticTimer = setInterval(() => { if (!done) fill(); }, 110);
}
function renderChoices() {
  const { round } = rounds[idx];
  choicesEl.innerHTML = '';
  choicesEl.style.setProperty('--pk-cols', round.choices.length === 3 ? '3' : '2');
  const colours = U.shuffle(CANDY.slice());
  round.choices.forEach((text, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pk-choice';
    b.textContent = text;
    b.dataset.choice = text;
    b.style.setProperty('--c', colours[i % colours.length]);
    b.setAttribute('aria-keyshortcuts', String(i + 1));
    b.addEventListener('pointerdown', () => { b.dataset.down = String(performance.now()); });
    b.addEventListener('click', () => pick(b));
    choicesEl.appendChild(b);
  });
}
let revealed = false, stable = true, stableSince = 0, nextGlitch = 0;
// The choices appear only once the question has been heard.
function reveal() {
  if (revealed || done) return;
  revealed = true; stable = true; stableSince = performance.now();
  choicesEl.classList.remove('pk-wait');
  if (/^(Listen first|Tap ▶)/.test(fb.textContent)) fb.textContent = '';
  choicesEl.querySelectorAll('.pk-choice').forEach(b => { b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; });
  nextGlitch = performance.now() + 2600 + rand() * 900;
}
// A glitch: the buttons smear, flash static, and swap places.
function glitch() {
  if (!revealed || done) return;
  const btns = Array.from(choicesEl.querySelectorAll('.pk-choice'));
  if (btns.length < 2) return;
  stable = false;
  const first = new Map(btns.map(b => [b, b.getBoundingClientRect()]));
  let order;
  do { order = U.shuffle(btns.slice()); } while (order.every((b, i) => b === btns[i]));
  choicesEl.classList.add('glitching');
  buzz();
  const labels = btns.map(b => b.textContent);
  btns.forEach(b => { let t = ''; for (let i = 0; i < Math.max(3, b.dataset.choice.length); i++) t += STATIC[Math.floor(rand() * STATIC.length)]; b.textContent = t; });
  order.forEach(b => choicesEl.appendChild(b));
  const still = stillMotion();
  order.forEach(b => {
    const a = first.get(b), z = b.getBoundingClientRect();
    if (still || !b.animate) return;
    const dx = a.left - z.left, dy = a.top - z.top;
    b.animate([
      { transform: `translate(${dx}px,${dy}px)` },
      { transform: `translate(${dx * 0.6 + 6}px,${dy * 0.6}px) skewX(-12deg)`, offset: 0.3 },
      { transform: `translate(${dx * 0.2 - 5}px,${dy * 0.2}px) skewX(9deg)`, offset: 0.6 },
      { transform: 'none' },
    ], { duration: 320, easing: 'steps(6, end)' });
  });
  setTimeout(() => {
    btns.forEach((b, i) => { b.textContent = labels[i]; });
    choicesEl.classList.remove('glitching');
    stable = true; stableSince = performance.now();
  }, still ? 160 : 340);
}
function buzz() {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + 0.005, n = Math.floor(c.sampleRate * 0.18), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (rand() * 2 - 1) * (i % 400 < 200 ? 1 : 0.2);
  const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
  src.buffer = b; bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.2;
  g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.18);
  src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(t);
}

function showCard() {
  stopVoice();
  afterClean = null;
  const { card } = rounds[idx];
  tries = 0; busy = false; done = false; cardMissed = false;
  lookedMs = 0; looking = false; nextAsk = performance.now() + 2500;
  whoEl.classList.remove('cute', 'peek', 'odd', 'lurch');
  setPose('.pk-sil', 'idle');
  numEl.textContent = idx + 1;
  renderDots();
  jpEl.textContent = (CFG.curriculum === 'pb' ? (card.hira || card.jp) : card.jp) || '';
  renderQuestion();
  renderChoices();
  revealed = false; stable = true;
  choicesEl.classList.add('pk-wait');
  nextBtn.hidden = true;
  fb.textContent = heardAny ? 'Listen first… · まず きいて…' : 'Tap ▶ to listen · ▶ を タップ';
  listenLbl.textContent = 'Listen · きいて';
  playBtn.classList.add('is-waiting');
  run.ready(6000 + 2000 * rounds[idx].round.choices.length, { waitAudio: true });
  loadVoice(card);   // start decoding now
  const nextCard = rounds[idx + 1] && rounds[idx + 1].card;
  if (nextCard) setTimeout(() => loadVoice(nextCard), 1500);
  if (heardAny) { Bed.start(); setTimeout(() => play(false, true), 380); }   // after the first card, each question plays by itself
  else lookStart();
  fitCard();
}
// Phones: keep the whole question and every choice on screen.
function fitCard() {
  if (window.innerWidth > 600) return;
  const top = $('pk-stage').getBoundingClientRect().top, bottom = choicesEl.getBoundingClientRect().bottom;
  if (top >= 0 && bottom <= window.innerHeight - 6) return;
  const y = window.scrollY + Math.min(top - 26, bottom - window.innerHeight + 64);
  try { window.scrollTo({ top: Math.max(0, y), behavior: stillMotion() ? 'auto' : 'smooth' }); } catch (_) { window.scrollTo(0, Math.max(0, y)); }
}

function popBurst(text) {
  burstEl.textContent = text;
  burstEl.classList.remove('show'); void burstEl.offsetWidth; burstEl.classList.add('show');
}
function snap(cls, ms) {
  html.classList.remove('pk-lurch', 'pk-snap'); void html.offsetWidth;
  html.classList.add(cls);
  setTimeout(() => html.classList.remove(cls), ms);
}

function pick(btn) {
  if (busy || done || btn.disabled || !revealed) return;
  // Fair to fingers: no answer while the buttons move, and a press that
  // began before they settled does not count.
  if (!stable) return;
  const down = Number(btn.dataset.down || 0);
  if (down && down < stableSince) return;
  if (performance.now() - stableSince < 180) return;
  const { round } = rounds[idx];
  tries++;
  if (btn.dataset.choice === round.answer) { finishCard(tries === 1 ? 'ok' : 'half'); return; }
  // Wrong: the forest lurches, her shape jolts, and she gets less cute.
  btn.classList.add('wrong'); btn.disabled = true;
  POP.wrong(btn);
  sting();
  lookedMs += 5000;
  whoEl.classList.remove('lurch'); void whoEl.offsetWidth; whoEl.classList.add('lurch');
  setPose('.pk-sil', 'wrong');
  snap('pk-lurch', 450);
  ask(cuteLine(Math.max(0.4, s), rand), true);
  if (!cardMissed) { cardMissed = true; run.miss(); perfectRun = 0; }
  if (tries >= 2) { finishCard('miss'); return; }
  fb.textContent = 'Not that one! Try again · もう いちど！';
  busy = true; setTimeout(() => { busy = false; }, 450);
}

const YES = ['CUTE!', 'YES!', 'POP!', 'THERE!', 'PHEW!'];
function finishCard(result) {
  done = true;
  choicesEl.classList.remove('pk-wait', 'glitching');
  lookStop();
  clearInterval(staticTimer);
  const { round, card } = rounds[idx];
  dotState[idx] = result;
  const gap = gapEl();
  choicesEl.querySelectorAll('.pk-choice').forEach(b => { b.disabled = true; if (b.dataset.choice === round.answer && result !== 'miss') b.classList.add('right'); });
  gap.textContent = round.answer;
  if (result === 'ok' || result === 'half') {
    // Everything snaps back: the real, cute her, a clean voice, quiet.
    gap.classList.add('ok');
    lookedMs = 0; html.style.setProperty('--pk-s', '0'); Bed.mood(0); Bed.hush();
    setPose('.pk-real', 'right');
    whoEl.classList.remove('peek', 'odd', 'lurch'); whoEl.classList.add('cute');
    snap('pk-snap', 900);
    setTimeout(() => ask('Am I cute? · かわいい？', false), 500);
    U.playSFX('ding');
    if (result === 'ok') {
      const r = run.hit(); score += 1; perfectRun++;
      POP.correct(gap, `pk${idx}`, (r && r.combo) || 1);
      if (!stillMotion()) U.confetti(gap, 18);
      if (perfectRun === TOTAL) { POP.fireworks(signEl, 7, 220); popBurst('PERFECT!!'); }
      else if (perfectRun >= 3 && perfectRun % 3 === 0) { POP.round(perfectRun >= 9 ? 5 : 3, signEl, 5); popBurst(`${perfectRun} IN A ROW!`); }
      else popBurst(YES[Math.floor(rand() * YES.length)]);
      fb.textContent = 'Back to normal! · もとに もどった！';
    } else {
      run.recover(); score += 0.5;
      POP.correct(gap, `pk${idx}`, 1);
      if (!missedItems.includes(card)) missedItems.push(card);
      fb.textContent = 'Got it on the second try · 2かいめで せいかい';
    }
    listenLbl.textContent = 'Clear! · はっきり！';
    let moved = false;
    const go = () => { if (moved) return; moved = true; later(advance, 450); };
    afterClean = go;
    setTimeout(() => play(true, true), 450);
    later(go, 7000);   // never stall on a slow or silent clip
  } else {
    gap.classList.add('shown');
    if (!missedItems.includes(card)) missedItems.push(card);
    fb.textContent = `It was “${round.answer}” · こたえは「${round.answer}」`;
    nextBtn.hidden = false;
    try { nextBtn.focus({ preventScroll: true }); } catch (_) {}
    setTimeout(() => play(true, true), 500);   // hear it clean with the answer in view
  }
  scoreEl.textContent = String(score);
  renderDots();
}

function advance() {
  afterClean = null;
  idx++;
  if (idx >= rounds.length) showResults();
  else showCard();
}

playBtn.addEventListener('click', () => { Bed.start(); play(done); });
nextBtn.addEventListener('click', advance);
document.addEventListener('keydown', e => {
  const n = Number(e.key);
  if (!n || done || !revealed || !stable) return;
  const b = choicesEl.querySelectorAll('.pk-choice')[n - 1];
  if (b) { e.preventDefault(); pick(b); }
});

function showResults() {
  stopVoice();
  Bed.stop();
  done = true; lookStop();
  html.style.setProperty('--pk-s', '0');
  whoEl.classList.add('cute');
  const runSum = run.summary();
  const pct = TOTAL ? Math.round((score / TOTAL) * 100) : 0;
  U.emitGameEnd({
    points: runSum.points, maxCombo: runSum.maxCombo, crown: runSum.fullCombo,
    saveId: SAVE_ID, score: pct, completed: pct >= 40,
  });
  if (score === TOTAL) U.confetti(signEl, 80);
  U.showScorecard({
    run: runSum,
    gameId: SAVE_ID,
    title: TITLE,
    correct: score,
    total: TOTAL,
    pct,
    replayId: 'pk-replay',
    backId: 'pk-back',
    stats: [
      { label: 'First-try questions / せいかい', value: `${runSum.firstTry} / ${TOTAL}` },
      { label: 'Fixed / なおした', value: String(runSum.recovered) },
      { label: 'Review questions / ふくしゅう', value: String(missedItems.length) },
    ],
    reviewItems: missedItems,
    audioBase: CFG.audioBase,
  });
}

$('pk-replay').addEventListener('click', () => {
  POP.reset();
  perfectRun = 0;
  rounds = buildRounds();
  idx = 0; score = 0; missedItems = []; dotState.length = 0;
  scoreEl.textContent = '0';
  run.reset();
  showCard();
});
$('pk-back').addEventListener('click', () => {
  stopVoice(); Bed.stop();
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});
window.addEventListener('pagehide', () => { Bed.stop(); html.classList.remove('pk-world', 'pk-lurch', 'pk-snap'); });

if (!TOTAL) {
  fb.textContent = 'No questions to play this week. · こんしゅうは あそべる しつもんが ないよ';
  return;
}
showCard();
})();
