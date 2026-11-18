/* ══════════════════════════════════════════════════════════════
   vowel-pop.js — Vowel Pop: hear it, draw the missing vowel (extra game)

   The week's vocab is played aloud and shown with its vowel(s) missing.
   The student draws each missing letter with a finger (or mouse) on a
   four-line pad, like an English notebook. Vowels are the hard part of
   English spelling for Japanese learners: one sound, many spellings.

   Ladder (see buildRound):
     Pre-Boo       one vowel per word (a vowel team if the word has no
                   single vowel, e.g. b__r)
     Boo-riculum   a vowel team when the word has one (fr__ndship), else
                   the second vowel, often the quiet one (trav_l)
     Boo-Continuum every vowel, up to three letters a card, silent e too

   Reading the drawing (see recognize): a small $P point-cloud recognizer
   that runs on the device, no network and no AI service. Fairness first:
     - "Did you write a or o?" when two vowels look alike
     - an unreadable drawing never counts as a wrong answer
     - after two unreadable drawings the five vowel buttons appear, so
       the spelling still counts
   A wrong letter gets one more try (+0.5), then the answer is shown.
   No timer on screen: neat letters read better than fast ones.

   Fun, poppy and loud: every letter lands with a pop, a right word
   spins its tiles, streaks build, a perfect game ends in fireworks.

   Extra game: saves as "{curriculum}-extra:vowel_pop" (outside the nine).
   ══════════════════════════════════════════════════════════════ */
(async function () {
'use strict';

/* ── Pure logic (exported as window.VowelPopLogic for tests) ──────────────── */

const VOWELS = ['a', 'e', 'i', 'o', 'u'];

/* ── Which word, which vowels ──────────────────────────────────────────────
   The weekly "vocab" item may be a phrase ("water conservation practices").
   One key word is played with: the longest real word (not a short function
   word, not an acronym like "IC"). A card may name it itself: card.blankWord.

   Vowel groups are runs of a/e/i/o/u ("ea" in clean). "qu" is a consonant
   sound, so its u is never a blank. A final e after a consonant ("make") is
   the silent e: Pre-Boo and Boo-riculum leave it alone; Boo-Continuum, which
   blanks every vowel, includes it (the magic e is a real spelling trap).

   Blanks by curriculum (the ladder):
     pb  one single vowel (the first one), or a vowel team if there is none
     br  one vowel team if the word has one, else the second vowel (often the
         quiet, unstressed one), else the first
     bc  every vowel, up to three letters a card (silent e included)
   y is never a blank.                                                      */
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'for', 'in', 'on', 'at', 'my', 'your',
  'with', 'out', 'up', 'is', 'are', 'it', 'its', 'by', 'or', 'as', 'be', 'do', 'off']);

function wordsOf(en) {
  const words = [];
  const re = /[A-Za-z’']+/g;
  let m;
  while ((m = re.exec(String(en || '')))) words.push({ text: m[0], start: m.index });
  return words;
}

function pickWord(card) {
  const en = String((card && card.en) || '');
  const words = wordsOf(en);
  if (card && card.blankWord) {
    const forced = words.find(w => w.text.toLowerCase() === String(card.blankWord).toLowerCase());
    if (forced) return forced;
  }
  const usable = words.filter(w => {
    const t = w.text.replace(/[’']/g, '');
    if (t.length < 3) return false;
    if (/^[A-Z]{2,}$/.test(t)) return false;        // acronyms: IC, TV
    if (STOP.has(t.toLowerCase())) return false;
    return vowelGroups(t).length > 0;
  });
  if (!usable.length) {
    // A short card ("go"): any real word with a vowel, still never an acronym.
    const short = words.filter(w => w.text.length >= 2 && !/^[A-Z]{2,}$/.test(w.text) && vowelGroups(w.text).length);
    return short.length === 1 ? short[0] : null;
  }
  return usable.reduce((best, w) => (w.text.length > best.text.length ? w : best), usable[0]);
}

/* Real vowel teams (two letters, one sound). A longer run of vowels is
   split so a blank is never three letters: "sightseeing" → ee + i,
   "curious" → i + ou. */
const TEAMS = ['ee', 'oo', 'ea', 'ai', 'oa', 'ou', 'oi', 'au', 'ie', 'ei', 'ue', 'ui'];

/* [{ start, end, silentE, team }] — indexes into the word */
function vowelGroups(word) {
  const w = String(word || '').toLowerCase();
  const isV = i => VOWELS.includes(w[i]) && !(w[i] === 'u' && i > 0 && w[i - 1] === 'q');
  const runs = [];
  let i = 0;
  while (i < w.length) {
    if (!isV(i)) { i++; continue; }
    let j = i;
    while (j < w.length && isV(j)) j++;
    runs.push([i, j]);
    i = j;
  }
  const groups = [];
  runs.forEach(([a, b]) => {
    let k = a;
    while (k < b) {
      const left = b - k;
      if (left >= 3) {
        const firstTwo = TEAMS.includes(w.slice(k, k + 2));
        const lastTwo = TEAMS.includes(w.slice(k + 1, k + 3));
        const take = firstTwo || !lastTwo ? 2 : 1;
        groups.push({ start: k, end: k + take });
        k += take;
      } else {
        groups.push({ start: k, end: b });
        k = b;
      }
    }
  });
  groups.forEach(g => {
    g.silentE = false;
    g.team = g.end - g.start === 2 && TEAMS.includes(w.slice(g.start, g.end));
  });
  const last = groups[groups.length - 1];
  if (last && groups.length > 1 && last.end === w.length && last.end - last.start === 1 &&
      w[last.start] === 'e' && w.length > 3 && !VOWELS.includes(w[last.start - 1])) {
    last.silentE = true;
  }
  return groups;
}

function chooseGroups(groups, curriculum) {
  const spoken = groups.filter(g => !g.silentE);
  const pool = spoken.length ? spoken : groups;
  if (!pool.length) return [];
  if (curriculum === 'bc') {
    // Every vowel, up to three letters a card (about 40 drawings a game):
    // first, last, then the middle ones, kept in word order.
    const order = [groups[0], groups[groups.length - 1]].concat(groups.slice(1, -1));
    const picked = [];
    let letters = 0;
    order.forEach(g => {
      const n = g.end - g.start;
      if (!picked.includes(g) && letters + n <= 3) { picked.push(g); letters += n; }
    });
    if (!picked.length) picked.push(groups[0]);
    return picked.sort((a, b) => a.start - b.start);
  }
  if (curriculum === 'br') {
    const team = pool.find(g => g.team);
    if (team) return [team];
    return [pool[1] || pool[0]];
  }
  const single = pool.find(g => g.end - g.start === 1);
  return [single || pool[0]];
}

/* The round for one card: the phrase split into parts, with the blanked
   letters as slots in order. null when the card has nothing to blank. */
function buildRound(card, curriculum) {
  const pick = pickWord(card);
  if (!pick) return null;
  const en = String(card.en);
  const groups = chooseGroups(vowelGroups(pick.text), curriculum);
  if (!groups.length) return null;
  const blanked = new Set();
  groups.forEach(g => { for (let k = g.start; k < g.end; k++) blanked.add(pick.start + k); });
  const parts = [];
  const slots = [];
  for (let k = 0; k < en.length; k++) {
    if (blanked.has(k)) {
      slots.push({ index: k, letter: en[k].toLowerCase() });
      parts.push({ slot: slots.length - 1 });
    } else {
      parts.push({ ch: en[k] });
    }
  }
  return { word: pick.text, parts, slots };
}

/* ── Drawing recognizer ───────────────────────────────────────────────────
   A $P point-cloud recognizer (Vatavu, Anthony & Wobbrock, 2012), on the
   device, no network: the drawing is resampled to 32 points, scaled and
   centred, then matched against letter templates as an unordered cloud, so
   stroke order, direction and the number of strokes do not matter.
   Only five answers exist (a e i o u), each with lowercase and capital
   forms. The result says how sure it is:
     sure      clear best match
     choose    two letters are close (a / o, u / o): ask which one
     unsure    nothing looks like a vowel: draw it again                     */
const N = 32;

function pathLen(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].s === pts[i - 1].s) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return d;
}
function resample(input, n) {
  const pts = input.map(p => ({ x: p.x, y: p.y, s: p.s }));
  const I = pathLen(pts) / (n - 1);
  if (!(I > 0)) return null;
  let D = 0;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].s !== pts[i - 1].s) continue;
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (D + d >= I && d > 0) {
      const t = (I - D) / d;
      const q = { x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y), s: pts[i].s };
      out.push(q);
      pts.splice(i, 0, q);
      D = 0;
    } else {
      D += d;
    }
  }
  while (out.length < n) out.push(Object.assign({}, pts[pts.length - 1]));
  return out.slice(0, n);
}
function normalize(strokes) {
  const pts = [];
  strokes.forEach((stroke, s) => stroke.forEach(p => pts.push({ x: p.x, y: p.y, s })));
  if (pts.length < 2) return null;
  const r = resample(pts, N);
  if (!r) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  r.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  const s = r.map(p => ({ x: (p.x - minX) / size, y: (p.y - minY) / size }));
  const cx = s.reduce((a, p) => a + p.x, 0) / N, cy = s.reduce((a, p) => a + p.y, 0) / N;
  return s.map(p => ({ x: p.x - cx, y: p.y - cy }));
}
// Squared-free distances (Math.hypot is slow on older iPads) and an early
// stop once a start point can no longer beat the best match so far.
function cloudDistance(a, b, start, limit) {
  const matched = new Uint8Array(N);
  let sum = 0, i = start, k = 0;
  do {
    let index = -1, min = Infinity;
    const ax = a[i].x, ay = a[i].y;
    for (let j = 0; j < N; j++) {
      if (matched[j]) continue;
      const dx = ax - b[j].x, dy = ay - b[j].y;
      const d = dx * dx + dy * dy;
      if (d < min) { min = d; index = j; }
    }
    matched[index] = 1;
    sum += (1 - k / N) * Math.sqrt(min);
    if (sum >= limit) return sum;
    i = (i + 1) % N;
    k++;
  } while (i !== start);
  return sum;
}
function greedyMatch(a, b, limit = Infinity) {
  const step = Math.floor(Math.pow(N, 0.5));
  let min = limit;
  for (let i = 0; i < N; i += step) {
    min = Math.min(min, cloudDistance(a, b, i, min));
    min = Math.min(min, cloudDistance(b, a, i, min));
  }
  return min;
}

/* ── Letter templates (unit box, y down; x-height letters sit in 0.35-1) ── */
function arc(cx, cy, rx, ry, from, to, n = 24) {
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t = (from + (to - from) * k / n) * Math.PI / 180;
    out.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
  }
  return out;
}
function line(x1, y1, x2, y2, n = 12) {
  const out = [];
  for (let k = 0; k <= n; k++) out.push({ x: x1 + (x2 - x1) * k / n, y: y1 + (y2 - y1) * k / n });
  return out;
}
const TEMPLATE_STROKES = {
  a: [
    [arc(.42, .68, .3, .32, -10, -370), line(.72, .36, .72, 1)],          // ball and stick
    [arc(.42, .68, .3, .32, -20, -360).concat(line(.72, .36, .75, 1))],   // one stroke
    [arc(.42, .68, .3, .32, -30, -380), line(.74, .4, .76, .98)],         // looser ball
    [line(.5, 0, .1, 1), line(.5, 0, .9, 1), line(.27, .62, .73, .62)],   // A
    [line(.1, 1, .5, 0).concat(line(.5, 0, .9, 1)), line(.27, .62, .73, .62)],
  ],
  e: [
    [line(.12, .68, .82, .68).concat(arc(.47, .68, .35, .32, 0, -300))],
    [line(.15, .66, .8, .66), arc(.47, .66, .33, .32, 0, -305)],
    [line(.12, .7, .82, .64).concat(arc(.47, .68, .35, .34, -5, -290))],
    [line(.2, 0, .2, 1), line(.2, 0, .85, 0), line(.2, .5, .75, .5), line(.2, 1, .85, 1)],   // E
    [line(.85, 0, .2, 0).concat(line(.2, 0, .2, 1), line(.2, 1, .85, 1)), line(.2, .5, .75, .5)],
  ],
  i: [
    [line(.5, .38, .5, 1), [{ x: .5, y: .12 }, { x: .51, y: .15 }]],
    [line(.5, .35, .5, 1)],
    [line(.48, .36, .54, 1), [{ x: .46, y: .12 }, { x: .5, y: .16 }]],
    [line(.5, 0, .5, 1), line(.3, 0, .7, 0), line(.3, 1, .7, 1)],      // I with bars
    [line(.5, 0, .5, 1)],                                              // I
  ],
  o: [
    [arc(.5, .66, .34, .34, -90, -450)],
    [arc(.5, .66, .34, .34, -90, 270)],
    [arc(.5, .5, .34, .48, -90, -450)],                                 // O
    [arc(.5, .66, .38, .3, -60, -420)],
  ],
  u: [
    [line(.18, .36, .18, .78).concat(arc(.43, .78, .25, .22, 180, 0, 16), line(.68, .78, .68, .36)), line(.68, .36, .7, 1)],
    [line(.18, .36, .18, .78).concat(arc(.43, .78, .25, .22, 180, 0, 16), line(.68, .78, .68, .36))],
    [line(.18, .36, .18, .78).concat(arc(.43, .78, .25, .22, 180, 0, 16), line(.68, .78, .68, .36), line(.68, .36, .7, 1))],
    [line(.15, 0, .15, .65).concat(arc(.5, .65, .35, .35, 180, 0, 16), line(.85, .65, .85, 0))],   // U
  ],
};
/* Shapes that are clearly not vowels. If one of these is the best match,
   the drawing is "unsure" (draw again), so a scribbled s is never read as e. */
const NOT_VOWEL_STROKES = {
  s: [[arc(.5, .42, .32, .2, -10, -270).concat(arc(.5, .82, .32, .2, -90, 170))]],
  x: [[line(.1, .3, .9, 1), line(.9, .3, .1, 1)]],
  z: [[line(.1, .3, .9, .3).concat(line(.9, .3, .1, 1), line(.1, 1, .9, 1))]],
  k: [[line(.2, 0, .2, 1), line(.8, .3, .2, .65), line(.35, .55, .85, 1)]],
  m: [[line(.1, 1, .1, .4).concat(arc(.3, .55, .2, .15, 180, 360), line(.5, .55, .5, 1), arc(.7, .55, .2, .15, 180, 360), line(.9, .55, .9, 1))]],
};
let TEMPLATES = null;
/* Children's letters vary a lot in width, and the reader keeps a letter's
   proportions, so every template is also stored squeezed and stretched.
   (A narrow u must not look like an i; a wide e must stay an e.) */
const WIDTHS = [1, 0.55, 1.6];
function widen(strokes, sx) {
  return strokes.map(stroke => stroke.map(p => ({ x: p.x * sx, y: p.y })));
}
function templates() {
  if (!TEMPLATES) {
    TEMPLATES = [];
    const add = (letter, shape, strokes) => WIDTHS.forEach(sx => {
      if (letter === 'i' && sx !== 1) return;   // an i is a line: width means nothing
      const cloud = normalize(widen(strokes, sx));
      if (cloud) TEMPLATES.push({ letter, shape, cloud });
    });
    Object.keys(TEMPLATE_STROKES).forEach(letter => TEMPLATE_STROKES[letter].forEach(strokes => add(letter, letter, strokes)));
    Object.keys(NOT_VOWEL_STROKES).forEach(shape => NOT_VOWEL_STROKES[shape].forEach(strokes => add(null, shape, strokes)));
  }
  return TEMPLATES;
}

/* Thresholds were set from tests/vowel-pop.test.cjs (drawn variants with
   jitter, slant and size changes). Distances are small numbers: a clean
   vowel is usually under 1.2. */
const UNSURE = 2.0;   // nothing this far from a vowel counts
const CLOSE = 0.2;    // two vowels this close: ask which one
// Pairs that really get mixed up in handwriting get a wider "ask" margin:
// a narrow u with a tail looks like a, a tight a like o, an e like o.
const LOOKALIKE = { au: 0.3, ao: 0.25, ou: 0.2, eo: 0.2 };

function recognize(strokes) {
  const usable = (strokes || []).filter(s => Array.isArray(s) && s.length);
  const cloud = normalize(usable);
  if (!cloud) return { kind: 'unsure', letter: null, scores: {} };
  const best = {};
  let notVowel = Infinity;
  templates().forEach(t => {
    const key = t.letter === null ? '' : t.letter;
    const sofar = t.letter === null ? notVowel : (key in best ? best[key] : Infinity);
    const d = greedyMatch(cloud, t.cloud, sofar);
    if (t.letter === null) { notVowel = Math.min(notVowel, d); return; }
    if (!(t.letter in best) || d < best[t.letter]) best[t.letter] = d;
  });
  const ranked = Object.keys(best).sort((a, b) => best[a] - best[b]);
  const [first, second] = ranked;
  const scores = Object.fromEntries(ranked.map(l => [l, Math.round(best[l] * 100) / 100]));
  if (best[first] > UNSURE || notVowel < best[first]) return { kind: 'unsure', letter: null, scores };
  // An o is one stroke. A ball-and-stick a is usually two, and its stick can
  // hug the ball so the shapes look alike: two strokes read as "o" ask.
  if (first === 'o' && usable.length >= 2 && best.a - best.o < 0.6) return { kind: 'choose', letter: 'o', other: 'a', scores };
  const pair = [first, second].sort().join('');
  if (second && best[second] - best[first] < (LOOKALIKE[pair] || CLOSE)) return { kind: 'choose', letter: first, other: second, scores };
  return { kind: 'sure', letter: first, other: second, scores };
}

/* ── Scoring: one card is right first time only if every slot was ── */
function cardResult(slotTries) {
  if (!slotTries.length) return 'miss';
  if (slotTries.some(t => t === 0)) return 'miss';
  return slotTries.every(t => t === 1) ? 'ok' : 'half';
}

const VowelPopLogic = { VOWELS, wordsOf, pickWord, vowelGroups, chooseGroups, buildRound, normalize, recognize, templates, cardResult, TEMPLATE_STROKES, UNSURE, CLOSE, LOOKALIKE };

if (typeof window !== 'undefined') window.VowelPopLogic = VowelPopLogic;

/* ── Game ─────────────────────────────────────────────────────────────── */
const CFG = typeof window !== 'undefined' ? window.GAME_CONFIG : null;
const U   = typeof window !== 'undefined' ? window.GAME_UTILS : null;
if (!CFG || !U || typeof document === 'undefined') return;

U.setTitle('Vowel Pop');
U.unlockAudio();

const SAVE_ID = `${CFG.curriculum}-extra:vowel_pop`;
function buildRounds() {
  return U.shuffle(CFG.cards.slice(0, 15))
    .map(card => ({ card, round: buildRound(card, CFG.curriculum) }))
    .filter(r => r.round);
}
let rounds = buildRounds();
const TOTAL = rounds.length;
const run = U.createRun({ total: TOTAL, recoverPoints: 50 });
const voiceGate = U.createAudioGate({ cooldownMs: 300, timeoutMs: 9000 });
await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

const STYLE = `
.vp-wrap{max-width:660px;margin:0 auto;padding:.5rem 1rem 3rem;display:flex;flex-direction:column;align-items:center;gap:.8rem;box-sizing:border-box;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.vp-intro{text-align:center;font-weight:900;font-size:clamp(13px,2.2vw,16px);color:var(--game-muted)}
.vp-hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.vp-pill{padding:5px 16px;border-radius:999px;background:var(--game-pill-bg);border:1.5px solid var(--game-pill-border);color:var(--game-pill-text);font-size:clamp(12px,2vw,15px);font-weight:900;font-variant-numeric:tabular-nums}
.vp-dots{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.vp-dot{width:10px;height:10px;border-radius:50%;background:var(--game-meter-bg)}
.vp-dot.done{background:var(--game-primary)}.vp-dot.half{background:var(--game-amber)}.vp-dot.miss{background:#ef4444}
.vp-dot.now{background:var(--game-amber);transform:scale(1.25)}
.vp-card{width:100%;border-radius:26px;padding:1.1rem 1rem 1.2rem;box-sizing:border-box;text-align:center;background:var(--game-surface);border:2px solid var(--game-border);
  box-shadow:0 6px 26px rgba(0,0,0,.22);display:flex;flex-direction:column;align-items:center;gap:.75rem}
.vp-card.shake{animation:vpShake .38s ease}
@keyframes vpShake{20%{transform:translateX(-8px)}45%{transform:translateX(7px)}70%{transform:translateX(-3px)}}
.vp-audio{display:flex;gap:12px;align-items:center;justify-content:center}
.vp-play{position:relative;width:78px;height:78px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;font-size:28px;color:#2b1a05;
  background:radial-gradient(circle at 35% 30%,#ffe39a,#ffc94a 55%,#d48a1a);box-shadow:0 5px 0 rgba(140,80,0,.45);transition:transform .14s}
.vp-play:active{transform:scale(.94)}
.vp-play.playing{background:radial-gradient(circle at 35% 30%,#ffe0ea,#ff9fb9 60%,#e2547c)}
.vp-pulse{position:absolute;inset:-6px;border-radius:50%;border:3px solid #ffc94a;opacity:0;pointer-events:none}
.vp-play.is-waiting .vp-pulse{animation:vpPulse 1.4s ease-out infinite}
@keyframes vpPulse{from{opacity:.9;transform:scale(.92)}to{opacity:0;transform:scale(1.35)}}
.vp-slow{border:none;border-radius:999px;padding:8px 14px;font:800 13px/1 var(--game-font-body);cursor:pointer;background:var(--game-pill-bg);color:var(--game-pill-text);box-shadow:inset 0 0 0 1.5px var(--game-pill-border)}
.vp-jp{margin:0;font-size:clamp(14px,2.4vw,17px);font-weight:800;color:var(--game-muted)}
.vp-word{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;gap:10px 18px;min-height:64px}
.vp-chunk{display:flex;gap:3px;align-items:flex-end}
.vp-ch{font:900 clamp(26px,5.6vw,40px)/1 var(--game-font-title,var(--game-font-body));color:var(--game-ink);min-width:.42em;text-align:center}
.vp-ch.mark{color:var(--game-muted)}
.vp-slot{position:relative;display:grid;place-items:center;width:clamp(36px,7vw,50px);height:clamp(46px,8.6vw,62px);border-radius:14px;box-sizing:border-box;
  border:3px dashed var(--game-border);background:var(--game-answer-bg,rgba(255,255,255,.06));color:var(--game-ink);font:900 clamp(26px,5.6vw,40px)/1 var(--game-font-title,var(--game-font-body))}
.vp-slot.now{border-style:solid;border-color:var(--game-amber);box-shadow:0 0 0 4px color-mix(in srgb,var(--game-amber) 30%,transparent),0 0 22px color-mix(in srgb,var(--game-amber) 55%,transparent);animation:vpBob 1s ease-in-out infinite}
.vp-slot.now::after{content:'?';color:var(--game-amber);opacity:.85}
@keyframes vpBob{50%{transform:translateY(-5px) rotate(-2deg)}}
.vp-slot.ok{border-style:solid;border-color:#22c55e;background:#22c55e;color:#fff;animation:vpLand .42s cubic-bezier(.3,1.7,.5,1) both}
.vp-slot.fixed{border-style:solid;border-color:var(--game-amber);background:var(--game-amber);color:#fff;animation:vpLand .42s cubic-bezier(.3,1.7,.5,1) both}
.vp-slot.missed{border-style:solid;border-color:#ef4444;background:#ef4444;color:#fff;animation:vpLand .42s ease both}
@keyframes vpLand{0%{transform:scale(.2) rotate(-25deg);opacity:0}60%{transform:scale(1.28) rotate(6deg);opacity:1}100%{transform:none}}
.vp-word.is-right .vp-slot,.vp-word.is-right .vp-ch{animation:vpSpin .6s ease both}
@keyframes vpSpin{0%{transform:none}40%{transform:translateY(-10px) scale(1.15) rotate(-6deg)}100%{transform:none}}
.vp-feedback{min-height:1.5em;margin:0;font-weight:900;font-size:clamp(14px,2.4vw,17px);color:var(--game-muted)}
.vp-feedback.ok{color:#22c55e}.vp-feedback.near{color:var(--game-amber)}.vp-feedback.bad{color:#ef4444}
.vp-feedback b{font-size:1.25em}
.vp-padwrap{position:relative;width:min(380px,88vw)}
.vp-pad{display:block;width:100%;aspect-ratio:5/4;border-radius:22px;background:#fffdf6;box-shadow:inset 0 0 0 3px var(--game-border),0 6px 0 rgba(0,0,0,.18);
  touch-action:none;cursor:crosshair;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.vp-padwrap.wobble{animation:vpShake .4s ease}
.vp-see{position:absolute;left:50%;top:-18px;transform:translate(-50%,0) scale(0);padding:6px 16px;border-radius:999px;background:var(--game-primary);color:#0b0614;
  font:900 18px/1.1 var(--game-font-body);white-space:nowrap;pointer-events:none;box-shadow:0 4px 0 rgba(0,0,0,.25)}
.vp-see b{font:900 26px/1 var(--game-font-title,var(--game-font-body));margin-left:4px}
.vp-see.show{animation:vpSee .9s cubic-bezier(.3,1.7,.5,1) both}
@keyframes vpSee{0%{transform:translate(-50%,10px) scale(0)}30%{transform:translate(-50%,0) scale(1.15)}45%,80%{transform:translate(-50%,0) scale(1)}100%{transform:translate(-50%,-6px) scale(1);opacity:0}}
.vp-tools{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.vp-tool{border:none;border-radius:999px;padding:12px 20px;min-height:48px;font:900 16px/1 var(--game-font-body);cursor:pointer;color:var(--game-pill-text);background:var(--game-pill-bg);box-shadow:inset 0 0 0 2px var(--game-pill-border),0 4px 0 rgba(0,0,0,.2)}
.vp-tool.go{color:#0b0614;background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));box-shadow:0 5px 0 rgba(0,0,0,.25)}
.vp-tool:active{transform:translateY(3px);box-shadow:none}
.vp-tool:disabled{opacity:.4;cursor:default}
.vp-choose,.vp-vowels{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;align-items:center}
.vp-choose[hidden],.vp-vowels[hidden]{display:none}
/* Both sit on the pad, so the card never grows and nothing drops below the screen. */
.vp-choose{position:absolute;inset:0;z-index:3;align-content:center;border-radius:22px;background:rgba(255,253,246,.94);box-shadow:inset 0 0 0 3px var(--game-amber)}
.vp-vowels{position:absolute;left:6px;right:6px;top:6px;z-index:3;gap:6px 8px;pointer-events:none}
.vp-vowels .vp-letter{pointer-events:auto;width:46px;height:46px;border-radius:15px;font-size:26px}
.vp-vowels .vp-ask{font-size:12px;line-height:1.1;color:var(--game-muted)}
.vp-ask{width:100%;font-weight:900;color:var(--game-ink)}
.vp-letter{width:64px;height:64px;border:none;border-radius:20px;cursor:pointer;font:900 34px/1 var(--game-font-title,var(--game-font-body));color:#0b0614;
  background:radial-gradient(circle at 35% 30%,#fff,var(--c,#ffc94a) 70%);box-shadow:0 6px 0 rgba(0,0,0,.25);transition:transform .12s;animation:vpPopIn .35s cubic-bezier(.3,1.7,.5,1) both}
.vp-letter:active{transform:translateY(4px) scale(.94);box-shadow:none}
@keyframes vpPopIn{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}
.vp-streak{position:fixed;left:50%;top:22%;transform:translate(-50%,-50%) scale(0);z-index:60;pointer-events:none;font:900 clamp(34px,8vw,64px)/1 var(--game-font-title,var(--game-font-body));
  color:#fff;text-shadow:0 4px 0 var(--game-secondary),0 0 30px var(--game-primary);white-space:nowrap}
.vp-streak.show{animation:vpStreak 1.1s cubic-bezier(.3,1.6,.5,1) both}
@keyframes vpStreak{0%{transform:translate(-50%,-50%) scale(0) rotate(-12deg)}25%{transform:translate(-50%,-50%) scale(1.2) rotate(4deg)}40%,75%{transform:translate(-50%,-50%) scale(1) rotate(0)}100%{transform:translate(-50%,-70%) scale(1);opacity:0}}
#vp-next[hidden]{display:none}
.vp-side{display:flex;flex-direction:column;align-items:center;gap:.75rem;width:100%;min-width:0}
/* Phones: a shorter pad and speaker so OK stays on screen. */
@media (max-width:600px){
  .vp-intro{display:none}
  .vp-pad{aspect-ratio:4/3}
  .vp-play{width:64px;height:64px;font-size:24px}
  .vp-card{gap:.6rem}
}
/* Wide screens (iPad landscape, laptops): the word on the left, the pad on
   the right, so the pad and its buttons stay on screen. */
@media (min-width:860px){
  .vp-wrap{max-width:980px}
  .vp-card{flex-direction:row;align-items:center;justify-content:center;gap:1.4rem;padding:1.2rem 1.4rem}
  .vp-side:first-child{flex:1 1 0}
  .vp-side:last-child{flex:0 0 auto;width:auto}
  .vp-padwrap{width:min(380px,calc((100vh - 330px) * 1.25))}
  .vp-padwrap{min-width:260px}
}
@media (prefers-reduced-motion:reduce){.vp-slot,.vp-slot.now,.vp-word.is-right .vp-slot,.vp-word.is-right .vp-ch,.vp-letter,.vp-play .vp-pulse,.vp-card.shake,.vp-padwrap.wobble{animation:none !important}
  .vp-see.show,.vp-streak.show{animation:none;transform:translate(-50%,0) scale(1)}}
html[data-motion="reduced"] .vp-slot,html[data-motion="reduced"] .vp-slot.now,html[data-motion="reduced"] .vp-word.is-right .vp-ch,html[data-motion="reduced"] .vp-letter{animation:none !important}
`;

U.mount(`
<style>${STYLE}</style>
<div class="vp-wrap" id="vp-main">
  <div class="vp-intro">Listen, then draw the missing vowel! · きいて、ぬけた もじを ゆびで かこう！</div>
  <div class="vp-hud">
    <span class="vp-pill">Card <b id="vp-num">1</b> / ${TOTAL}</span>
    <span class="vp-pill">Score <b id="vp-score">0</b> / ${TOTAL}</span>
  </div>
  <div class="vp-dots" id="vp-dots"></div>
  <div class="vp-card" id="vp-card">
    <div class="vp-side">
      <div class="vp-audio">
        <button type="button" class="vp-play" id="vp-play" aria-label="Play / きく">▶<span class="vp-pulse" aria-hidden="true"></span></button>
        <button type="button" class="vp-slow" id="vp-slow">Slow / ゆっくり</button>
      </div>
      <p class="vp-jp" id="vp-jp"></p>
      <div class="vp-word" id="vp-word" aria-live="polite"></div>
      <p class="vp-feedback" id="vp-fb" aria-live="polite"></p>
    </div>
    <div class="vp-side">
      <div class="vp-padwrap" id="vp-padwrap">
        <canvas class="vp-pad" id="vp-pad" aria-label="Draw the missing letter here / ここに かこう"></canvas>
        <div class="vp-see" id="vp-see" aria-hidden="true"></div>
        <div class="vp-choose" id="vp-choose" hidden></div>
        <div class="vp-vowels" id="vp-vowels" hidden></div>
      </div>
      <div class="vp-tools">
        <button type="button" class="vp-tool" id="vp-clear">けす · Clear</button>
        <button type="button" class="vp-tool go" id="vp-ok">OK!</button>
        <button type="button" class="vp-tool go" id="vp-next" hidden>Next · つぎへ →</button>
      </div>
    </div>
  </div>
  <button type="button" id="vp-replay" hidden>もう一度</button>
  <button type="button" id="vp-back" hidden>メニューへ</button>
</div>
<div class="vp-streak" id="vp-streak" aria-hidden="true"></div>`);

const $ = id => document.getElementById(id);
const playBtn = $('vp-play'), slowBtn = $('vp-slow'), jpEl = $('vp-jp'), wordEl = $('vp-word'), fb = $('vp-fb');
const pad = $('vp-pad'), padWrap = $('vp-padwrap'), seeEl = $('vp-see'), chooseEl = $('vp-choose'), vowelsEl = $('vp-vowels');
const clearBtn = $('vp-clear'), okBtn = $('vp-ok'), nextBtn = $('vp-next');
const cardEl = $('vp-card'), numEl = $('vp-num'), scoreEl = $('vp-score'), dotsEl = $('vp-dots'), streakEl = $('vp-streak');

/* Palette Pop (js/game-pop.js). A no-op stand-in keeps the game playable
   if that file ever fails to load. */
const POP = window.BoohaPop || new Proxy({}, { get: (_, k) => (k === 'color' ? () => '' : k === 'canFlash' ? () => true : () => {}) });
POP.init({ pill: '#vp-score' });
const PLAY_HTML = playBtn.innerHTML;

let idx = 0, score = 0, perfectRun = 0, heardAny = false;
let slot = 0, tries = 0, unread = 0, slotTries = [], cardMissed = false, busy = false, done = false;
let missedItems = [];
const dotState = [];
const tileKey = i => `vp${idx}-s${i}`;

function stillMotion() {
  const m = window.BoohaMotion;
  try { if (m && m.reduced && m.reduced()) return true; } catch (_) {}
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function later(fn, ms) { const my = idx; setTimeout(() => { if (my === idx) fn(); }, ms); }

/* ── Sounds: a bright tick per stroke, rising (Web Audio from BoohaSFX) ── */
function tick(step) {
  try {
    const c = window.BoohaSFX && window.BoohaSFX.context && window.BoohaSFX.context();
    if (!c || c.state !== 'running') return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'triangle';
    o.frequency.setValueAtTime(660 * Math.pow(1.122, Math.min(step, 8)), t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.09);
  } catch (_) {}
}

/* ── The drawing pad ──────────────────────────────────────────────────── */
let strokes = [], drawing = null, autoTimer = 0, pendingNext = 0;
const ctx2d = pad.getContext('2d');
function padSize() {
  const r = pad.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (pad.width !== w || pad.height !== h) { pad.width = w; pad.height = h; }
  return { w: r.width, h: r.height, dpr };
}
// Four lines, like an English notebook: top, dashed middle, red base, bottom.
function drawGuides(w, h) {
  const g = ctx2d;
  const line = (y, color, dash, width) => {
    g.save(); g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash);
    g.beginPath(); g.moveTo(w * .05, y); g.lineTo(w * .95, y); g.stroke(); g.restore();
  };
  line(h * .14, '#b9c3d6', [], 1.5);
  line(h * .40, '#b9c3d6', [8, 7], 1.5);
  line(h * .68, '#ef8a9a', [], 2);
  line(h * .90, '#b9c3d6', [], 1.5);
}
function redraw() {
  const { w, h, dpr } = padSize();
  const g = ctx2d;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  drawGuides(w, h);
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--game-secondary').trim() || '#3b2a8a';
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = Math.max(7, w * .028);
  strokes.forEach(s => {
    if (s.length === 1) { g.beginPath(); g.arc(s[0].x, s[0].y, g.lineWidth / 1.6, 0, Math.PI * 2); g.fill(); return; }
    g.beginPath(); g.moveTo(s[0].x, s[0].y);
    for (let i = 1; i < s.length; i++) g.lineTo(s[i].x, s[i].y);
    g.stroke();
  });
}
function padPoint(e) {
  const r = pad.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function clearPad() {
  clearTimeout(autoTimer);
  strokes = []; drawing = null;
  redraw();
  okBtn.disabled = true;
}
function canDraw() { return !done && !busy && chooseEl.hidden; }
pad.addEventListener('pointerdown', e => {
  // Starting the next letter right after a right one skips the little pause.
  if (pendingNext) { clearTimeout(pendingNext); pendingNext = 0; nextSlot(); }
  if (!canDraw()) return;
  e.preventDefault();
  clearTimeout(autoTimer);
  try { pad.setPointerCapture(e.pointerId); } catch (_) {}
  drawing = [padPoint(e)];
  strokes.push(drawing);
  tick(strokes.length);
  redraw();
  okBtn.disabled = false;
});
pad.addEventListener('pointermove', e => {
  if (!drawing) return;
  e.preventDefault();
  const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
  (list.length ? list : [e]).forEach(ev => drawing.push(padPoint(ev)));
  redraw();
});
function endStroke() {
  if (!drawing) return;
  drawing = null;
  clearTimeout(autoTimer);
  // Lift the finger and wait a moment: an i needs time for its dot.
  autoTimer = setTimeout(() => { if (strokes.length) readDrawing(); }, 1100);
}
pad.addEventListener('pointerup', endStroke);
pad.addEventListener('pointercancel', endStroke);
pad.addEventListener('touchmove', e => e.preventDefault(), { passive: false });   // never scroll or zoom while writing
window.addEventListener('resize', () => { strokes = []; redraw(); }, { passive: true });

/* ── Reading the drawing ──────────────────────────────────────────────── */
function showSee(letter) {
  seeEl.innerHTML = `I see<b>${letter}</b>`;
  seeEl.classList.remove('show'); void seeEl.offsetWidth; seeEl.classList.add('show');
}
function readDrawing() {
  clearTimeout(autoTimer);
  if (!canDraw() || !strokes.length) return;
  const r = recognize(strokes);
  if (window.__VP_DEBUG) window.__VP_DEBUG.push({ strokes: strokes.map(st => st.length), r });   // test hook, off unless a test sets it
  if (r.kind === 'unsure') {
    unread++;
    padWrap.classList.remove('wobble'); void padWrap.offsetWidth; padWrap.classList.add('wobble');
    fb.className = 'vp-feedback near';
    fb.textContent = 'Hmm… I can’t read that. Draw it again! · もういちど かいてね';
    setTimeout(clearPad, 450);
    if (unread >= 2) showVowelButtons();
    return;
  }
  if (r.kind === 'choose') { askWhich(r.letter, r.other); return; }
  showSee(r.letter);
  answer(r.letter);
}
function letterButton(letter, onPick) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'vp-letter'; b.textContent = letter;
  b.setAttribute('aria-label', letter);
  b.style.setProperty('--c', POP.color(`vp-letter-${letter}`) || '#ffc94a');
  b.addEventListener('click', () => onPick(letter));
  return b;
}
// Two vowels looked alike: the student says which one they wrote.
function askWhich(a, b) {
  chooseEl.innerHTML = '<div class="vp-ask">Which one did you write? · どっち？</div>';
  [a, b].forEach(l => chooseEl.appendChild(letterButton(l, pick => { chooseEl.hidden = true; showSee(pick); answer(pick); })));
  chooseEl.hidden = false;
}
// After two unreadable drawings: tap the vowel instead (it still counts).
function showVowelButtons() {
  if (!vowelsEl.hidden) return;
  vowelsEl.innerHTML = '<div class="vp-ask">Or tap it · タップしても いいよ</div>';
  VOWELS.forEach(l => vowelsEl.appendChild(letterButton(l, pick => { if (canDraw()) { showSee(pick); answer(pick); } })));
  vowelsEl.hidden = false;
}

/* ── Cards ────────────────────────────────────────────────────────────── */
function renderDots() {
  dotsEl.innerHTML = '';
  for (let i = 0; i < TOTAL; i++) {
    const d = document.createElement('span');
    const st = dotState[i];
    d.className = 'vp-dot' + (st === 'ok' ? ' done' : st === 'half' ? ' half' : st === 'miss' ? ' miss' : i === idx ? ' now' : '');
    dotsEl.appendChild(d);
  }
}
function renderWord() {
  const { round } = rounds[idx];
  wordEl.className = 'vp-word';
  wordEl.innerHTML = '';
  let chunk = document.createElement('span');
  chunk.className = 'vp-chunk';
  const flush = () => { if (chunk.childNodes.length) wordEl.appendChild(chunk); chunk = document.createElement('span'); chunk.className = 'vp-chunk'; };
  round.parts.forEach(p => {
    if (p.slot !== undefined) {
      const s = document.createElement('span');
      s.className = 'vp-slot' + (p.slot === slot ? ' now' : '');
      s.dataset.slot = String(p.slot);
      s.setAttribute('aria-label', 'missing letter');
      chunk.appendChild(s);
    } else if (p.ch === ' ') {
      flush();
    } else {
      const c = document.createElement('span');
      c.className = 'vp-ch' + (/[A-Za-z]/.test(p.ch) ? '' : ' mark');
      c.textContent = p.ch;
      chunk.appendChild(c);
    }
  });
  flush();
}
function slotEl(i) { return wordEl.querySelector(`.vp-slot[data-slot="${i}"]`); }
function markNow() {
  wordEl.querySelectorAll('.vp-slot.now').forEach(el => el.classList.remove('now'));
  const el = slotEl(slot);
  if (el && !el.textContent) el.classList.add('now');
}

function stopVoice() {
  voiceGate.stop();
  playBtn.classList.remove('playing');
  playBtn.innerHTML = PLAY_HTML; POP.speakerWait(playBtn);
}
function play(rate) {
  const card = rounds[idx] && rounds[idx].card;
  if (!card || !card.mp3) return;
  const myIdx = idx;
  run.pauseClock();   // a replay is listening time, not answer time
  U.unlockAudio();
  const a = new Audio(CFG.audioBase + card.mp3);
  a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', '');
  try { a.playbackRate = rate || 1; a.preservesPitch = true; a.webkitPreservesPitch = true; } catch (_) {}
  playBtn.classList.add('playing');
  POP.eq(playBtn);
  const spkId = POP.speaker(playBtn);
  const end = () => {
    if (myIdx !== idx) return;
    playBtn.innerHTML = PLAY_HTML; POP.speakerEnd(playBtn, spkId);
    playBtn.classList.remove('playing', 'is-waiting');
    heardAny = true; run.audioDone();
  };
  if (!voiceGate.play(a, { replace: true, ignoreCooldown: true, onEnd: end })) end();
}

function showCard() {
  stopVoice();
  const { card, round } = rounds[idx];
  slot = 0; tries = 0; unread = 0; cardMissed = false; busy = false; done = false;
  slotTries = round.slots.map(() => null);
  numEl.textContent = idx + 1;
  renderDots();
  // Pre-Boo shows hiragana: small children should not need to read kanji.
  jpEl.textContent = (CFG.curriculum === 'pb' ? (card.hira || card.jp) : card.jp) || '';
  POP.newRound(round.slots.map((_, i) => tileKey(i)));
  renderWord();
  chooseEl.hidden = true; vowelsEl.hidden = true;
  nextBtn.hidden = true; okBtn.hidden = false; clearBtn.hidden = false;
  clearPad();
  fb.className = 'vp-feedback';
  fb.textContent = round.slots.length > 1
    ? `Draw ${round.slots.length} letters, one at a time · ${round.slots.length}つ かこう`
    : 'Draw the missing letter · ぬけた もじを かこう';
  playBtn.classList.add('is-waiting');
  run.ready(6000 + 3000 * round.slots.length, { waitAudio: true });
  if (heardAny) setTimeout(() => play(1), 350);   // after the first card, each word plays by itself
  fitCard();
}
// Phones: scroll so the whole card (word, pad, Clear/OK) is on screen.
function fitCard() {
  if (window.innerWidth > 600) return;
  const r = cardEl.getBoundingClientRect();
  if (r.top >= 0 && r.bottom <= window.innerHeight) return;
  const y = window.scrollY + Math.min(r.top - 8, r.bottom - window.innerHeight + 10);
  try { window.scrollTo({ top: Math.max(0, y), behavior: stillMotion() ? 'auto' : 'smooth' }); } catch (_) { window.scrollTo(0, Math.max(0, y)); }
}

function popStreak(text) {
  streakEl.textContent = text;
  streakEl.classList.remove('show'); void streakEl.offsetWidth; streakEl.classList.add('show');
}

function answer(letter) {
  if (done || busy) return;
  busy = true;
  clearTimeout(autoTimer);
  const { round } = rounds[idx];
  const want = round.slots[slot].letter;
  const el = slotEl(slot);
  tries++;
  if (letter === want) {
    slotTries[slot] = tries;
    el.classList.remove('now');
    el.textContent = want;
    el.classList.add(tries === 1 ? 'ok' : 'fixed');
    POP.paint(el, tileKey(slot));
    POP.place(el, tileKey(slot), slot);
    fb.className = 'vp-feedback ok';
    fb.innerHTML = tries === 1 ? `<b>${want}</b> — Yes! · せいかい！` : `<b>${want}</b> — Fixed it! · なおせた！`;
    if (slot + 1 < round.slots.length) {
      const my = idx;
      pendingNext = setTimeout(() => { pendingNext = 0; if (my === idx) nextSlot(); }, 520);
    } else {
      later(nextSlot, 520);
    }
    return;
  }
  // Wrong letter: one more try, then the answer is shown.
  U.playSFX('fart');
  POP.wrong(el);
  cardEl.classList.remove('shake'); void cardEl.offsetWidth; cardEl.classList.add('shake');
  if (!cardMissed) { cardMissed = true; run.miss(); perfectRun = 0; }
  if (tries >= 2) {
    slotTries[slot] = 0;
    el.classList.remove('now');
    el.textContent = want;
    el.classList.add('missed');
    fb.className = 'vp-feedback bad';
    fb.innerHTML = `I see <b>${letter}</b>. It’s <b>${want}</b>! · こたえは <b>${want}</b>`;
    later(nextSlot, 1200);
    return;
  }
  fb.className = 'vp-feedback bad';
  fb.innerHTML = `I see <b>${letter}</b> — not quite! Listen and try again · ちがうよ、もういちど`;
  later(() => { busy = false; clearPad(); }, 650);
}

function nextSlot() {
  const { round } = rounds[idx];
  slot++; tries = 0; unread = 0;
  chooseEl.hidden = true; vowelsEl.hidden = true;
  if (slot < round.slots.length) {
    busy = false;
    clearPad();
    markNow();
    fb.className = 'vp-feedback';
    fb.textContent = `Next letter! · つぎの もじ (${slot + 1}/${round.slots.length})`;
    return;
  }
  finishCard();
}

function finishCard() {
  done = true;
  clearPad();
  const { card } = rounds[idx];
  const result = cardResult(slotTries);
  dotState[idx] = result;
  const tiles = Array.from(wordEl.querySelectorAll('.vp-slot'));
  if (result === 'ok') {
    const r = run.hit(); score += 1;
    perfectRun++;
    wordEl.classList.add('is-right');
    U.playSFX('ding');
    POP.spell(tiles, tiles.map((_, i) => tileKey(i)), (r && r.combo) || 1, 70, wordEl);
    if (!stillMotion()) U.confetti(wordEl, 14);
    if (perfectRun === TOTAL) { POP.fireworks(cardEl, 7, 220); popStreak('PERFECT!!'); }
    else if (perfectRun >= 3 && perfectRun % 3 === 0) { POP.round(perfectRun >= 9 ? 5 : 3, cardEl, 5); popStreak(`${perfectRun} IN A ROW!`); }
    else popStreak(['POP!', 'YES!', 'NICE!', 'WOW!'][Math.floor(Math.random() * 4)]);
  } else if (result === 'half') {
    run.recover(); score += 0.5;
    POP.spell(tiles, tiles.map((_, i) => tileKey(i)), 1, 70, wordEl, '+½');
    if (!missedItems.includes(card)) missedItems.push(card);
  } else if (!missedItems.includes(card)) {
    missedItems.push(card);
  }
  scoreEl.textContent = String(score);
  renderDots();
  if (result === 'miss') {
    okBtn.hidden = true; clearBtn.hidden = true;
    nextBtn.hidden = false; try { nextBtn.focus({ preventScroll: true }); } catch (_) {}
    play(1);   // hear it once more with the answer in view
  } else {
    later(advance, perfectRun === TOTAL ? 2200 : 1250);
  }
}

function advance() {
  idx++;
  if (idx >= rounds.length) showResults();
  else showCard();
}

playBtn.addEventListener('click', () => play(1));
slowBtn.addEventListener('click', () => play(0.72));
clearBtn.addEventListener('click', () => { if (canDraw()) clearPad(); });
okBtn.addEventListener('click', () => readDrawing());
nextBtn.addEventListener('click', advance);
// A keyboard may answer only when the vowel buttons are showing.
document.addEventListener('keydown', e => {
  if (vowelsEl.hidden || !canDraw()) return;
  const k = String(e.key || '').toLowerCase();
  if (!VOWELS.includes(k)) return;
  e.preventDefault();
  showSee(k); answer(k);
});

function showResults() {
  const runSum = run.summary();
  const pct = TOTAL ? Math.round((score / TOTAL) * 100) : 0;
  voiceGate.stop();
  U.emitGameEnd({
    points: runSum.points, maxCombo: runSum.maxCombo, crown: runSum.fullCombo,
    saveId: SAVE_ID, score: pct, completed: pct >= 40,
  });
  if (score === TOTAL) U.confetti(cardEl, 80);
  U.showScorecard({
    run: runSum,
    gameId: SAVE_ID,
    title: 'Vowel Pop',
    correct: score,
    total: TOTAL,
    pct,
    replayId: 'vp-replay',
    backId: 'vp-back',
    stats: [
      { label: 'First-try words / せいかい', value: `${runSum.firstTry} / ${TOTAL}` },
      { label: 'Fixed / なおした', value: String(runSum.recovered) },
      { label: 'Review words / ふくしゅう', value: String(missedItems.length) },
    ],
    reviewItems: missedItems,
    audioBase: CFG.audioBase,
  });
}

$('vp-replay').addEventListener('click', () => {
  POP.reset();
  perfectRun = 0;
  rounds = buildRounds();
  idx = 0; score = 0; missedItems = []; dotState.length = 0;
  scoreEl.textContent = '0';
  run.reset();
  showCard();
});
$('vp-back').addEventListener('click', () => {
  voiceGate.stop();
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

if (!TOTAL) {
  fb.className = 'vp-feedback bad';
  fb.textContent = 'No words to play this week. · こんしゅうは あそべる ことばが ないよ';
  return;
}
redraw();
showCard();
})();
