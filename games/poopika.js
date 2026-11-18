/* ══════════════════════════════════════════════════════════════
   poopika.js — Don't Talk to Poopika (extra game)

   "Poopika ate the question word. Put it back before the forest changes."

   The week's questions play out loud, a little warped (Poopika's forest
   bends sound), with the start of the question eaten. The student picks
   the missing words from candy buttons. Put it back and the world snaps
   into focus: the question plays once more, clean.

   What Poopika eats (see chunkOf):
     Pre-Boo        the first word            ___ you like hiking?   → Do
     Boo-riculum /  the question opening      ___ you relax?         → How do
     Boo-Continuum                            ___ rooms are there?   → How many
   Wrong choices are wrong for a reason a student can see: the classic
   slips ("Are you like…?", "Does it cold?"), broken agreement ("How does
   you…"), a word that cannot go before a noun ("How often rooms…"), or a
   question word with a different meaning (the Japanese line says which).
   A choice that also makes a right question is never offered.

   Players know the week's questions from class: this is practice, not a
   first meeting, so the audio may be strange and the choices close.

   The scene is weird; the question card and buttons never are. Reduced
   motion keeps the pops and drops the stretching and drifting.

   Extra game: saves as "{curriculum}-extra:poopika" (outside the nine).
   ══════════════════════════════════════════════════════════════ */
(async function () {
'use strict';

/* ── Question logic (pure: also loaded by tests/poopika.test.cjs) ─────────
   Poopika eats the start of the question. What she eats depends on level:
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

/* What Poopika eats. Returns { eat: [words], kind } or null to skip the card. */
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

/* Warp: how the playback rate wobbles. Gentle enough to follow, odd enough
   to feel like Poopika's forest. Returns the rate at time t (seconds). */
function warpRate(t, w) {
  return w.base + w.depth * Math.sin(2 * Math.PI * w.hz * t + w.phase) + w.dip * Math.max(0, Math.sin(2 * Math.PI * 0.45 * t + w.phase * 2)) ** 6;
}
function makeWarp(rand) {
  return { base: 0.93 + rand() * 0.1, depth: 0.05 + rand() * 0.035, hz: 1.6 + rand() * 1.4, phase: rand() * 6.28, dip: -(0.06 + rand() * 0.06) };
}

const PoopikaLogic = { WH, FAMILY, TWIN, BREAKS, chunkOf, wrongs, buildRound, spread, rng, warpRate, makeWarp, baseVerb };
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
  idle:  '/the-booha-adventure/assets/img/wanderers/poopika-3.webp',   // paw at her mouth: she has the word
  right: '/the-booha-adventure/assets/img/wanderers/poopika-1.webp',   // happy
  wrong: '/the-booha-adventure/assets/img/wanderers/poopika-2.webp',   // hides her face
};
const IMG = src => src;
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
await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);
// Poses load before the first card, so she never pops in late.
await Promise.all(Object.values(POSE).map(n => new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = IMG(n); })));

const STYLE = `
/* Poopika's version of the curriculum forest: same art, candy tint. */
html.pk-world{--world-ink:#fff7fd}
html[data-skin="v2"].pk-world body::before{filter:blur(8px) saturate(1.7) hue-rotate(var(--pk-hue,290deg)) brightness(.95);transition:filter .5s ease,transform .5s ease}
html[data-skin="v2"].pk-world body::after{background:
  radial-gradient(120% 70% at 85% 10%,rgba(255,212,94,.28),transparent 60%),
  radial-gradient(90% 60% at 10% 90%,rgba(114,242,208,.30),transparent 60%),
  linear-gradient(165deg,rgba(255,105,189,.62),rgba(150,96,255,.58) 52%,rgba(38,17,61,.78))}
html[data-skin="v2"][data-power="minimal"].pk-world body::after{background:linear-gradient(165deg,rgba(255,105,189,.86),rgba(110,70,200,.9) 55%,rgba(38,17,61,.94))}
html.pk-world .game-title,html.pk-world .game-week{color:#fff7fd;-webkit-text-fill-color:#fff7fd;text-shadow:0 2px 0 rgba(38,17,61,.55),0 0 18px rgba(255,105,189,.7)}
/* A wrong answer: the forest melts for a moment (never the card). */
html.pk-world.pk-melt body::before{filter:blur(12px) saturate(2.2) hue-rotate(calc(var(--pk-hue,290deg) + 70deg));transform:scale(1.08,1.22) skewX(6deg)}
html.pk-world.pk-snap body::before{filter:blur(3px) saturate(1.3) hue-rotate(var(--pk-hue,290deg));transform:scale(1.02)}
@media (prefers-reduced-motion:reduce){html.pk-world.pk-melt body::before,html.pk-world.pk-snap body::before{transform:none}}
html[data-motion="reduced"].pk-world.pk-melt body::before,html[data-motion="reduced"].pk-world.pk-snap body::before{transform:none}

.pk-wrap{
  --pk-pink:#ff69bd;--pk-mint:#72f2d0;--pk-lilac:#b98cff;--pk-yellow:#ffd45e;--pk-sky:#7fd3ff;--pk-ink:#24152f;--pk-night:#26113d;
  --game-pill-bg:rgba(38,17,61,.62);--game-pill-border:rgba(255,247,253,.35);--game-pill-text:#fff7fd;--game-meter-bg:rgba(255,247,253,.28);
  position:relative;max-width:720px;margin:0 auto;padding:.3rem 1rem 3rem;display:flex;flex-direction:column;align-items:center;gap:.7rem;box-sizing:border-box;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.pk-intro{margin:0;text-align:center;font-weight:900;font-size:clamp(13px,2.2vw,16px);color:#fff7fd;text-shadow:0 2px 0 rgba(38,17,61,.5)}
.pk-hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.pk-pill{padding:5px 16px;border-radius:999px;background:var(--game-pill-bg);border:1.5px solid var(--game-pill-border);color:var(--game-pill-text);font-size:clamp(12px,2vw,15px);font-weight:900;font-variant-numeric:tabular-nums}
.pk-dots{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.pk-dot{width:10px;height:10px;border-radius:50%;background:var(--game-meter-bg)}
.pk-dot.done{background:#22c55e}.pk-dot.half{background:var(--pk-yellow)}.pk-dot.miss{background:#ff7a45}
.pk-dot.now{background:#fff7fd;transform:scale(1.3);box-shadow:0 0 10px var(--pk-pink)}

/* The stage: Poopika leans in from the side, a little too big. */
/* She never covers the English: beside the play button on phones and
   tablets, her own column left of the card on wide screens. */
.pk-stage{position:relative;width:100%;display:grid;grid-template-columns:1fr auto 1fr;grid-template-areas:"sign sign sign" ". listen poo";align-items:center;row-gap:.6rem;padding-top:4px}
.pk-sign{grid-area:sign}
.pk-listen{grid-area:listen}
.pk-poo{grid-area:poo;justify-self:start;align-self:start;z-index:2;width:clamp(96px,17vw,140px);height:auto;margin:-16px 0 0 4px;pointer-events:none;transform-origin:50% 90%;
  transform:rotate(7deg);filter:drop-shadow(0 10px 18px rgba(38,17,61,.45));animation:pkSway 3.4s ease-in-out infinite}
@keyframes pkSway{50%{transform:rotate(3deg) translateY(-4px) scale(1.02,.99)}}
.pk-poo.bounce{animation:pkBounce .6s cubic-bezier(.3,1.8,.5,1)}
@keyframes pkBounce{0%{transform:rotate(7deg) scale(.86,1.12)}45%{transform:rotate(-4deg) scale(1.16,.9)}100%{transform:rotate(7deg) scale(1)}}
.pk-poo.cringe{animation:pkCringe .55s ease}
@keyframes pkCringe{30%{transform:rotate(12deg) scale(.92,1.06) translateX(6px)}70%{transform:rotate(4deg) scale(1.04,.95)}}

/* The candy wrapper: plain and readable, always. */
.pk-sign{position:relative;z-index:1;width:calc(100% - 28px);box-sizing:border-box;margin:0 14px;padding:1rem 1.1rem 1.05rem;border-radius:22px;
  background:#fffaf6;color:var(--pk-ink);box-shadow:0 0 0 4px var(--pk-pink),0 0 0 8px rgba(255,247,253,.6),0 14px 30px rgba(38,17,61,.4);text-align:left}
.pk-sign::before,.pk-sign::after{content:'';position:absolute;top:50%;width:26px;height:46px;margin-top:-23px;background:var(--pk-pink);
  clip-path:polygon(0 0,100% 30%,100% 70%,0 100%,30% 75%,0 50%,30% 25%)}
.pk-sign::before{left:-30px}.pk-sign::after{right:-30px;transform:scaleX(-1)}
.pk-jp{margin:0 0 .35rem;font-weight:800;font-size:clamp(13px,2.4vw,16px);color:#6b4a73;line-height:1.35}
.pk-q{margin:0;font:900 clamp(22px,4.6vw,34px)/1.3 var(--game-font-body);letter-spacing:.005em;color:var(--pk-ink);overflow-wrap:anywhere}
.pk-gap{display:inline-flex;align-items:center;justify-content:center;min-width:3.4em;height:1.25em;margin-right:.18em;padding:0 .3em;box-sizing:border-box;vertical-align:-.12em;
  border-radius:.4em .4em .55em .55em;background:var(--pk-night);color:var(--pk-yellow);font-size:.92em;
  clip-path:polygon(0 0,100% 0,100% 72%,92% 100%,82% 78%,70% 100%,58% 80%,46% 100%,34% 78%,22% 100%,10% 80%,0 100%)}
.pk-gap.wob{animation:pkGap 1.3s ease-in-out infinite}
@keyframes pkGap{50%{transform:scale(1.06,.94) rotate(-1.5deg)}}
.pk-gap.ok{clip-path:none;background:#1f7a46;color:#fff;animation:pkSpit .5s cubic-bezier(.3,1.7,.5,1)}
.pk-gap.shown{clip-path:none;background:var(--pk-yellow);color:var(--pk-ink);animation:pkSpit .5s ease}
@keyframes pkSpit{0%{transform:scale(.2) rotate(-20deg)}60%{transform:scale(1.25) rotate(4deg)}100%{transform:none}}

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
.pk-choice .pk-key{display:none}
.pk-choice.right{background:#1f7a46;color:#fff;box-shadow:0 7px 0 #0f4a29}
.pk-choice.right::after{content:' ✓'}
.pk-choice.wrong{background:#d9d0dd;color:#5a4a60;box-shadow:0 3px 0 #a99bb0;text-decoration:line-through;text-decoration-thickness:3px;animation:pkNo .4s ease}
@keyframes pkNo{25%{transform:translateX(-7px) rotate(-2deg)}55%{transform:translateX(6px) rotate(2deg)}}
.pk-choice:disabled{cursor:default}
.pk-fb{min-height:1.4em;margin:0;text-align:center;font-weight:900;font-size:clamp(14px,2.5vw,17px);color:#fff7fd;text-shadow:0 2px 0 rgba(38,17,61,.55)}
.pk-next{border:none;border-radius:999px;padding:13px 26px;min-height:50px;font:900 17px/1 var(--game-font-body);cursor:pointer;color:var(--pk-ink);
  background:linear-gradient(135deg,var(--pk-yellow),var(--pk-pink));box-shadow:0 5px 0 rgba(38,17,61,.4)}
.pk-next[hidden]{display:none}
.pk-burst{position:fixed;left:50%;top:24%;transform:translate(-50%,-50%) scale(0);z-index:60;pointer-events:none;white-space:nowrap;
  font:900 clamp(34px,8vw,66px)/1 var(--game-font-title,var(--game-font-body));color:#fff;text-shadow:0 4px 0 var(--pk-pink),0 0 30px var(--pk-lilac)}
.pk-burst.show{animation:pkBurst 1.05s cubic-bezier(.3,1.6,.5,1) both}
@keyframes pkBurst{0%{transform:translate(-50%,-50%) scale(0) rotate(-14deg)}25%{transform:translate(-50%,-50%) scale(1.2) rotate(5deg)}40%,75%{transform:translate(-50%,-50%) scale(1) rotate(0)}100%{transform:translate(-50%,-75%) scale(1);opacity:0}}

/* Candy weather: translucent sweets and question-mark flowers drift by. */
.pk-sky{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.pk-sky i{position:absolute;display:block;border-radius:50%;opacity:.5;animation:pkDrift linear infinite}
.pk-sky i.q{border-radius:0;opacity:.55;font:900 normal 34px/1 var(--game-font-title,var(--game-font-body));color:#fff7fd;text-shadow:0 0 12px var(--pk-pink)}
.pk-sky i.q::before{content:'?'}
@keyframes pkDrift{from{transform:translateY(0) rotate(0)}to{transform:translateY(-118vh) rotate(260deg)}}
.pk-wrap>*:not(.pk-sky){position:relative;z-index:1}
@media (prefers-reduced-motion:reduce){.pk-sky i,.pk-poo,.pk-gap.wob,.pk-play.is-waiting{animation:none !important}.pk-burst.show{animation:none;transform:translate(-50%,-50%) scale(1)}}
html[data-motion="reduced"] .pk-sky i,html[data-motion="reduced"] .pk-poo,html[data-motion="reduced"] .pk-gap.wob{animation:none !important}

/* Phones: the intro goes (the buttons say it), Poopika peeks smaller. */
@media (max-width:600px){
  .pk-intro{display:none}
  .pk-wrap{gap:.55rem;padding-top:0}
  .pk-poo{width:96px;margin-top:-14px}
  .pk-sign{padding:.8rem .85rem .9rem}
  .pk-choice{min-height:56px;border-radius:18px}
  .pk-play{width:56px;height:56px;font-size:21px}
}
/* Wide screens: Poopika leans in from the left, big and off-centre. */
@media (min-width:1060px){
  .pk-wrap{max-width:900px}
  .pk-stage{grid-template-columns:auto 1fr;grid-template-areas:"poo sign" "poo listen";column-gap:0}
  .pk-poo{align-self:center;justify-self:end;width:210px;margin:0 -22px 0 0;transform:rotate(-8deg) scaleX(-1);animation-name:pkSwayL}
  @keyframes pkSwayL{50%{transform:rotate(-4deg) scaleX(-1) translateY(-4px)}}
  .pk-poo.bounce,.pk-poo.cringe{animation:pkSwayL 3.4s ease-in-out infinite}
  .pk-choices{margin-left:188px;width:calc(100% - 188px)}
}
`;

U.mount(`<style>${STYLE}</style>
<div class="pk-sky" id="pk-sky" aria-hidden="true"></div>
<div class="pk-wrap" id="pk-main">
  <p class="pk-intro">Poopika ate the question word! Put it back. · プピカが ことばを たべちゃった！もどしてね</p>
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
    <img class="pk-poo" id="pk-poo" src="${IMG(POSE.idle)}" alt="Poopika">
  </div>
  <div class="pk-choices" id="pk-choices" role="group" aria-label="Choices / えらんでね"></div>
  <p class="pk-fb" id="pk-fb" aria-live="polite"></p>
  <button type="button" class="pk-next" id="pk-next" hidden>Next · つぎへ →</button>
  <button type="button" id="pk-replay" hidden>もう一度</button>
  <button type="button" id="pk-back" hidden>メニューへ</button>
</div>
<div class="pk-burst" id="pk-burst" aria-hidden="true"></div>`);

const $ = id => document.getElementById(id);
const pooEl = $('pk-poo'), signEl = $('pk-sign'), jpEl = $('pk-jp'), qEl = $('pk-q'), playBtn = $('pk-play'), listenLbl = $('pk-listen-label');
const choicesEl = $('pk-choices'), fb = $('pk-fb'), nextBtn = $('pk-next'), numEl = $('pk-num'), scoreEl = $('pk-score'), dotsEl = $('pk-dots'), burstEl = $('pk-burst');
document.documentElement.classList.add('pk-world');
document.documentElement.style.setProperty('--pk-hue', { pb: '300deg', br: '250deg', bc: '40deg' }[CFG.curriculum] || '290deg');

const POP = window.BoohaPop || new Proxy({}, { get: (_, k) => (k === 'color' ? () => '' : k === 'canFlash' ? () => true : () => {}) });
POP.init({ pill: '#pk-score' });
const PLAY_HTML = playBtn.innerHTML;
const CANDY = ['#ff69bd', '#b98cff', '#ffd45e', '#7fd3ff', '#ff9ad5', '#d7b5ff'];

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

/* Candy weather (a handful of DOM sweets; none at all for reduced motion
   beyond a few still shapes). */
(function sky() {
  const el = $('pk-sky');
  const still = stillMotion();
  const n = still ? 6 : (window.innerWidth < 600 ? 9 : 14);
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    const isQ = i % 3 === 0;
    if (isQ) s.className = 'q';
    else {
      const d = 18 + Math.random() * 46;
      s.style.width = s.style.height = d + 'px';
      s.style.background = `radial-gradient(circle at 35% 30%,rgba(255,255,255,.9),${CANDY[i % CANDY.length]} 70%)`;
    }
    s.style.left = (Math.random() * 100) + 'vw';
    s.style.top = still ? (Math.random() * 90) + 'vh' : (100 + Math.random() * 20) + 'vh';
    s.style.animationDuration = (16 + Math.random() * 18) + 's';
    s.style.animationDelay = (-Math.random() * 30) + 's';
    el.appendChild(s);
  }
})();

/* ── Poopika ──────────────────────────────────────────────────────────── */
let poseTimer = 0;
function pose(name, ms) {
  clearTimeout(poseTimer);
  pooEl.src = IMG(POSE[name]);
  pooEl.classList.remove('bounce', 'cringe'); void pooEl.offsetWidth;
  if (name === 'right') pooEl.classList.add('bounce');
  if (name === 'wrong') pooEl.classList.add('cringe');
  if (ms) poseTimer = setTimeout(() => { pooEl.src = IMG(POSE.idle); }, ms);
}
function worldFlash(cls, ms) {
  const h = document.documentElement;
  h.classList.remove('pk-melt', 'pk-snap'); void h.offsetWidth;
  h.classList.add(cls);
  setTimeout(() => h.classList.remove(cls), ms);
}

/* ── Voice: warped until the question is whole again ─────────────────── */
let warpTimer = 0;
function stopWarp() { clearInterval(warpTimer); warpTimer = 0; }
function stopVoice() {
  stopWarp();
  voiceGate.stop();
  playBtn.classList.remove('playing');
  playBtn.innerHTML = PLAY_HTML; POP.speakerWait(playBtn);
}
function play(clean) {
  const card = rounds[idx] && rounds[idx].card;
  if (!card || !card.mp3) return;
  const myIdx = idx;
  run.pauseClock();   // listening time is not answer time
  U.unlockAudio();
  stopWarp();
  const a = new Audio(CFG.audioBase + card.mp3);
  a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', '');
  // A warped play bends pitch with speed, like a tape in a hot car.
  const warp = clean ? null : makeWarp(rng((Date.now() ^ (idx * 9973)) >>> 0));
  try {
    a.preservesPitch = !!clean; a.webkitPreservesPitch = !!clean; a.mozPreservesPitch = !!clean;
    a.playbackRate = warp ? warpRate(0, warp) : 1;
  } catch (_) {}
  if (warp) {
    const t0 = performance.now();
    warpTimer = setInterval(() => {
      if (myIdx !== idx || a.paused && a.currentTime > 0) return;
      try { a.playbackRate = Math.max(0.6, Math.min(1.15, warpRate((performance.now() - t0) / 1000, warp))); } catch (_) {}
    }, 70);
  }
  playBtn.classList.add('playing');
  POP.eq(playBtn);
  const spkId = POP.speaker(playBtn);
  const end = () => {
    stopWarp();
    if (myIdx !== idx) return;
    playBtn.innerHTML = PLAY_HTML; POP.speakerEnd(playBtn, spkId);
    playBtn.classList.remove('playing', 'is-waiting');
    if (!heardAny) { heardAny = true; }
    run.audioDone();
    if (clean && afterClean) { const f = afterClean; afterClean = null; f(); }
  };
  if (!voiceGate.play(a, { replace: true, ignoreCooldown: true, onEnd: end })) end();
}
let afterClean = null;

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
function gapEl() { return qEl.querySelector('.pk-gap'); }
function renderQuestion() {
  const { round } = rounds[idx];
  qEl.innerHTML = '';
  const gap = document.createElement('span');
  gap.className = 'pk-gap wob';
  gap.textContent = '?';
  gap.setAttribute('aria-label', 'missing words / ぬけた ことば');
  qEl.appendChild(gap);
  qEl.appendChild(document.createTextNode(round.rest));
}
function renderChoices() {
  const { round } = rounds[idx];
  choicesEl.innerHTML = '';
  const n = round.choices.length;
  // Phones: two columns for four choices; three in a row for Pre-Boo's three.
  choicesEl.style.setProperty('--pk-cols', n === 3 ? '3' : '2');
  const colours = U.shuffle(CANDY.slice(0, 4));
  round.choices.forEach((text, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pk-choice';
    b.textContent = text;
    b.dataset.choice = text;
    b.style.setProperty('--c', colours[i % colours.length]);
    b.setAttribute('aria-keyshortcuts', String(i + 1));
    b.addEventListener('click', () => pick(b));
    choicesEl.appendChild(b);
  });
}
function showCard() {
  stopVoice();
  afterClean = null;
  const { card } = rounds[idx];
  tries = 0; busy = false; done = false; cardMissed = false;
  numEl.textContent = idx + 1;
  renderDots();
  jpEl.textContent = (CFG.curriculum === 'pb' ? (card.hira || card.jp) : card.jp) || '';
  renderQuestion();
  renderChoices();
  pose('idle');
  nextBtn.hidden = true;
  fb.textContent = heardAny ? '' : 'Tap ▶ to listen · ▶ を タップ';
  listenLbl.textContent = 'Listen · きいて';
  playBtn.classList.add('is-waiting');
  run.ready(6000 + 2000 * rounds[idx].round.choices.length, { waitAudio: true });
  if (heardAny) setTimeout(() => play(false), 380);   // after the first card, each question plays by itself
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

function pick(btn) {
  if (busy || done || btn.disabled) return;
  const { round, card } = rounds[idx];
  const right = btn.dataset.choice === round.answer;
  tries++;
  if (right) { finishCard(btn, tries === 1 ? 'ok' : 'half'); return; }
  // Wrong: the forest melts, Poopika hides her face. One more try.
  btn.classList.add('wrong'); btn.disabled = true;
  POP.wrong(btn);
  U.playSFX('fart', { volume: 0.7, rate: 0.8 + Math.random() * 0.4 });
  pose('wrong', 1100);
  worldFlash('pk-melt', 700);
  if (!cardMissed) { cardMissed = true; run.miss(); perfectRun = 0; }
  if (tries >= 2) { finishCard(null, 'miss'); return; }
  fb.textContent = 'Blech! Try again · もう いちど！';
  busy = true; setTimeout(() => { busy = false; }, 450);
}

const YUM = ['PTOO!', 'YUM!', 'POP!', 'SPIT!', 'BLEP!'];
function finishCard(btn, result) {
  done = true;
  const { round, card } = rounds[idx];
  dotState[idx] = result;
  const gap = gapEl();
  choicesEl.querySelectorAll('.pk-choice').forEach(b => { b.disabled = true; if (b.dataset.choice === round.answer && result !== 'miss') b.classList.add('right'); });
  gap.classList.remove('wob');
  gap.textContent = round.answer;
  if (result === 'ok' || result === 'half') {
    gap.classList.add('ok');
    pose('right', 1600);
    worldFlash('pk-snap', 900);
    U.playSFX('ding');
    if (result === 'ok') {
      const r = run.hit(); score += 1; perfectRun++;
      POP.correct(gap, `pk${idx}`, (r && r.combo) || 1);
      if (!stillMotion()) U.confetti(gap, 18);
      if (perfectRun === TOTAL) { POP.fireworks(signEl, 7, 220); popBurst('PERFECT!!'); }
      else if (perfectRun >= 3 && perfectRun % 3 === 0) { POP.round(perfectRun >= 9 ? 5 : 3, signEl, 5); popBurst(`${perfectRun} IN A ROW!`); }
      else popBurst(YUM[Math.floor(Math.random() * YUM.length)]);
      fb.textContent = 'You got it back! · とりもどした！';
    } else {
      run.recover(); score += 0.5;
      POP.correct(gap, `pk${idx}`, 1);
      if (!missedItems.includes(card)) missedItems.push(card);
      fb.textContent = 'Got it on the second try · 2かいめで せいかい';
    }
    // The world is whole again: hear the real question, then move on.
    listenLbl.textContent = 'Fixed! · なおった！';
    let moved = false;
    const go = () => { if (moved) return; moved = true; later(advance, 350); };
    afterClean = go;
    setTimeout(() => play(true), 450);
    later(go, 7000);   // never stall on a slow or silent clip
  } else {
    gap.classList.add('shown');
    if (!missedItems.includes(card)) missedItems.push(card);
    fb.textContent = `It was “${round.answer}” · こたえは「${round.answer}」`;
    nextBtn.hidden = false;
    try { nextBtn.focus({ preventScroll: true }); } catch (_) {}
    setTimeout(() => play(true), 500);   // hear it clean with the answer in view
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

playBtn.addEventListener('click', () => play(done));
nextBtn.addEventListener('click', advance);
document.addEventListener('keydown', e => {
  const n = Number(e.key);
  if (!n || done) return;
  const b = choicesEl.querySelectorAll('.pk-choice')[n - 1];
  if (b) { e.preventDefault(); pick(b); }
});

function showResults() {
  stopVoice();
  const runSum = run.summary();
  const pct = TOTAL ? Math.round((score / TOTAL) * 100) : 0;
  pose(pct >= 70 ? 'right' : 'idle');
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
  stopVoice();
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});
window.addEventListener('pagehide', () => { document.documentElement.classList.remove('pk-world', 'pk-melt', 'pk-snap'); });

if (!TOTAL) {
  fb.textContent = 'No questions to play this week. · こんしゅうは あそべる しつもんが ないよ';
  return;
}
showCard();
})();
