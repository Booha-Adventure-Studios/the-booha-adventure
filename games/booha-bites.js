/* ══════════════════════════════════════════════════════════════
   booha-bites.js — Booha Bites (Games Pass 6, extra game)
   Booha ate one word out of each of this week's 15 sentences. Pick the
   missing word. The Japanese is always shown, so meaning settles the
   answer even when two words could fit the grammar.

   Bite choice: the week's vocab word when it appears in the sentence
   (own card first, then any vocab of the week), otherwise the sentence's
   strongest content word. Decoys come from the same week.

   Booha comes alive (Pass B1): each card, Booha swoops across the
   sentence, crunches the word away (crumbs fly, the gap pops in — the
   word itself is never shown) and floats back to bob above the card. A
   right answer is burped back: the word flies from Booha into the gap and
   Booha throws his arms up. A wrong choice gets gobbled: the button flies
   into Booha's mouth and he goes "bleh!". The speed window starts once the
   crunch is over. Transform/opacity only; reduced motion or low power
   keeps the poses, sounds and colours and skips the flying.

   The game layer (Pass B2): a hunger ring around Booha shrinks through
   the speed-bonus window, so students can see they are racing him. Booha
   gets rounder with every first-try answer in a row (back to normal on a
   miss) and dances at the combo milestones: sway at 3, wave at 6, arms up
   with a spin at 10. Choices are chunky snacks with a springy press. After
   the last card, Booha does a full-belly BURP! before the results.

   Extra game: saves as "{curriculum}-extra:booha_bites", so it never
   counts toward the nine-game unlock (see game-registry EXTRA_GAMES).
   Shared systems: GAME_UTILS SFX / createRun / showScorecard.
   ══════════════════════════════════════════════════════════════ */
(async function () {
'use strict';

/* ── Pure logic (exported for tests/games-extras-audit.cjs) ─────────────── */
const STOP = new Set(('the a an and or but to of in on at for with is are was were be been being am i you he she it we they ' +
  'my your his her its our their this that these those do does did done will would can could should may might must not no yes ' +
  'me him us them there here what when where who whom why how which very so too than then just also from by as if about into ' +
  'over up down out off again more most some any all each every both few many much own same other such only one two have has ' +
  'had get got make made let lets because before after while during through without within between among until since').split(' '));

const escapeRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Content words of a sentence, in order: { word, start, end }. */
function contentWords(sentence) {
  const out = [];
  const re = /[A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z]/g;
  let m;
  while ((m = re.exec(sentence))) {
    const w = m[0];
    const bare = w.toLowerCase().replace(/['’]s$/, '');
    if (bare.length >= 4 && !STOP.has(bare)) out.push({ word: w, start: m.index, end: m.index + w.length });
  }
  return out;
}

function findPhrase(sentence, phrase) {
  if (!phrase) return null;
  const re = new RegExp('(^|[^A-Za-z])(' + escapeRe(phrase) + ')(?![A-Za-z])', 'i');
  const m = re.exec(sentence);
  if (!m) return null;
  const start = m.index + m[1].length;
  return { word: sentence.slice(start, start + m[2].length), start, end: start + m[2].length };
}

/* Which word does Booha bite? */
function pickBite(sentence, ownVocab, weekVocab) {
  const own = ownVocab && findPhrase(sentence, ownVocab);
  if (own) return { ...own, source: 'vocab' };
  const others = (weekVocab || []).filter(v => v && v !== ownVocab).sort((a, b) => b.length - a.length);
  for (const v of others) {
    const hit = findPhrase(sentence, v);
    if (hit) return { ...hit, source: 'vocab' };
  }
  const words = contentWords(sentence);
  if (!words.length) {
    const any = /[A-Za-z]+/.exec(sentence);
    return any ? { word: any[0], start: any.index, end: any.index + any[0].length, source: 'word' } : null;
  }
  let best = words[0];
  for (const w of words) if (w.word.length > best.word.length) best = w;
  return { ...best, source: 'word' };
}

/* How an option is shown: lower case unless it is a name / acronym. */
function displayForm(word, atSentenceStart) {
  if (/[A-Z]/.test(word.slice(1))) return word;              // IC card, New Year’s
  if (atSentenceStart) return word.charAt(0).toLowerCase() + word.slice(1);
  return word;
}

/* Four options: the answer plus three distinct decoys from the same week. */
function buildOptions(answer, source, weekVocab, poolWords, rand) {
  const rnd = typeof rand === 'function' ? rand : Math.random;
  const key = w => w.toLowerCase().replace(/[’']/g, "'");
  const ans = key(answer);
  const seen = new Set([ans]);
  const pick = [];
  const take = list => {
    const shuffled = list.slice().sort(() => rnd() - 0.5);
    for (const w of shuffled) {
      if (pick.length >= 3) return;
      const k = key(w);
      if (!w || seen.has(k) || k.includes(ans) || ans.includes(k)) continue;
      seen.add(k);
      pick.push(w);
    }
  };
  const near = list => list.filter(w => Math.abs(w.length - answer.length) <= 4);
  // A capitalised answer (a name or acronym: English, Monday, TV) must not
  // stand out by its capital: prefer capitalised decoys, capitalise the rest.
  const proper = /^[A-Z]/.test(answer);
  if (proper) take([...(weekVocab || []), ...(poolWords || [])].filter(w => /^[A-Z]/.test(w)));
  if (source === 'vocab') { take(near(weekVocab || [])); take(weekVocab || []); }
  take(near(poolWords || []));
  take(poolWords || []);
  take(weekVocab || []);
  return proper ? pick.map(w => w.charAt(0).toUpperCase() + w.slice(1)) : pick;
}

if (typeof window !== 'undefined') window.BoohaBitesLogic = { contentWords, findPhrase, pickBite, buildOptions, displayForm, STOP };

/* ── Game ─────────────────────────────────────────────────────────────── */
const CFG = typeof window !== 'undefined' ? window.GAME_CONFIG : null;
const U   = typeof window !== 'undefined' ? window.GAME_UTILS : null;
if (!CFG || !U || typeof document === 'undefined') return;

U.setTitle('Booha Bites');
U.unlockAudio();

const SAVE_ID = `${CFG.curriculum}-extra:booha_bites`;
const run = U.createRun({ total: 15, recoverPoints: 0 });   // multiple choice: a second try earns 0
const voiceGate = U.createAudioGate({ cooldownMs: 300, timeoutMs: 9000 });
await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

const VOCAB = ((CFG.alsoCards && CFG.alsoCards.vocab) || []).map(v => v.en).filter(Boolean);
const PB = CFG.curriculum === 'pb';

/* Build the 15 rounds once per game (order reshuffles on replay). */
function buildRounds() {
  const cards = CFG.cards.slice(0, 15);
  const bites = cards.map((c, i) => pickBite(c.en, VOCAB[i], VOCAB));
  const pool = [];
  bites.forEach(b => { if (b && b.source === 'word') pool.push(displayForm(b.word, b.start === 0)); });
  cards.forEach(c => contentWords(c.en).forEach(w => pool.push(displayForm(w.word, w.start === 0))));
  return U.shuffle(cards.map((c, i) => {
    const b = bites[i];
    if (!b) return null;
    const answer = displayForm(b.word, b.start === 0);
    const others = pool.filter(w => !c.en.toLowerCase().includes(w.toLowerCase()));
    const decoys = buildOptions(answer, b.source, VOCAB, others);
    return { card: c, bite: b, answer, options: U.shuffle([answer, ...decoys]) };
  }).filter(Boolean));
}

const STYLE = `
.bb-wrap{max-width:720px;margin:0 auto;padding:.5rem 1rem 5rem;display:flex;flex-direction:column;align-items:center;gap:.9rem;box-sizing:border-box}
.bb-intro{text-align:center;font-weight:900;font-size:clamp(13px,2.2vw,16px);color:var(--game-muted)}
.bb-hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.bb-pill{padding:5px 16px;border-radius:999px;background:var(--game-pill-bg);border:1.5px solid var(--game-pill-border);color:var(--game-pill-text);font-size:clamp(12px,2vw,15px);font-weight:900;font-variant-numeric:tabular-nums}
.bb-dots{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.bb-dot{width:10px;height:10px;border-radius:50%;background:var(--game-meter-bg)}
.bb-dot.done{background:var(--game-primary)}
.bb-dot.miss{background:#ef4444}
.bb-dot.now{background:var(--game-amber);transform:scale(1.25)}
.bb-card{position:relative;width:100%;border-radius:24px;padding:1.4rem 1.2rem 1.3rem;box-sizing:border-box;text-align:center;
  background:var(--game-surface);border:2px solid var(--game-border);box-shadow:0 6px 26px rgba(0,0,0,.22);display:flex;flex-direction:column;gap:.8rem;align-items:center}
.bb-card.shake{animation:bbShake .38s ease}
@keyframes bbShake{20%{transform:translateX(-7px)}45%{transform:translateX(6px)}70%{transform:translateX(-3px)}}
.bb-bwrap{position:relative;z-index:3;width:74px;height:74px;transition:transform .42s cubic-bezier(.45,0,.3,1),opacity .25s ease}
.bb-bwrap.is-away{opacity:0}
.bb-bwrap.is-fast{transition:none}
.bb-booha{display:block;width:74px;height:74px;object-fit:contain}
.bb-booha.is-idle{animation:bbBob 2.4s ease-in-out infinite}
@keyframes bbBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.bb-booha.chomp{animation:bbChomp .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes bbChomp{30%{transform:scale(1.18) rotate(-6deg)}60%{transform:scale(.94) rotate(4deg)}}
.bb-booha.cheer{animation:bbCheer .7s cubic-bezier(.3,1.6,.5,1)}
@keyframes bbCheer{0%{transform:none}35%{transform:translateY(-14px) scale(1.12)}70%{transform:translateY(2px) scale(.96)}100%{transform:none}}
.bb-booha.bleh{animation:bbBleh .6s ease}
@keyframes bbBleh{15%{transform:scale(1.15,.88)}35%{transform:rotate(-10deg) scale(.95)}55%{transform:rotate(9deg)}75%{transform:rotate(-5deg)}100%{transform:none}}
.bb-belly{transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.bb-ring{position:absolute;left:-12px;top:-12px;right:-12px;bottom:-12px;border-radius:50%;border:4px solid var(--game-amber);pointer-events:none;opacity:0;transform-origin:50% 50%}
.bb-ring.is-on{opacity:.85}
.bb-ring.is-out{opacity:0;transition:opacity .3s ease !important}
.bb-booha.dance{animation:bbDance 1.2s ease-in-out}
@keyframes bbDance{0%,100%{transform:none}20%{transform:rotate(-12deg) translateY(-6px)}40%{transform:rotate(10deg)}60%{transform:rotate(-8deg) translateY(-4px)}80%{transform:rotate(6deg)}}
.bb-booha.spin{animation:bbSpin 1.2s cubic-bezier(.3,1.3,.5,1)}
@keyframes bbSpin{0%{transform:none}50%{transform:rotate(360deg) scale(1.2)}100%{transform:rotate(360deg)}}
.bb-burp{position:absolute;z-index:5;left:50%;top:-6px;margin:0;padding:.2em .55em;border-radius:14px;background:var(--game-amber);color:#2b1a05;font-family:var(--game-font-title);font-size:clamp(20px,4vw,28px);line-height:1.1;white-space:nowrap;pointer-events:none;
  transform:translate(-50%,0) scale(.3);opacity:0;transition:transform .35s cubic-bezier(.3,1.6,.5,1),opacity .2s ease}
.bb-burp.is-on{transform:translate(-50%,-70%) scale(1);opacity:1}
.bb-gap.is-hidden{opacity:0}
.bb-gap.pop{animation:bbGapPop .35s cubic-bezier(.3,1.6,.5,1) both}
@keyframes bbGapPop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
.bb-crumb{position:absolute;z-index:2;width:9px;height:9px;margin:-4px 0 0 -4px;border-radius:3px;background:var(--game-amber);pointer-events:none;transition:transform .55s cubic-bezier(.2,.7,.3,1),opacity .55s ease-in}
.bb-flyword{position:absolute;z-index:4;margin:0;font-family:var(--game-font-title);font-size:clamp(22px,4.6vw,34px);line-height:1;color:var(--game-primary);white-space:nowrap;pointer-events:none;
  transition:transform .38s cubic-bezier(.3,1.2,.5,1),opacity .2s ease}
[data-curriculum="pb"] .bb-flyword{color:#e0439a}
.bb-choice.eaten{transition:transform .42s cubic-bezier(.5,0,.8,.4),opacity .42s ease-in;opacity:0;pointer-events:none}
.bb-choice.gone{visibility:hidden}
@media (prefers-reduced-motion:reduce){.bb-booha.is-idle,.bb-booha.chomp,.bb-booha.cheer,.bb-booha.bleh,.bb-booha.dance,.bb-booha.spin,.bb-gap.pop{animation:none}.bb-bwrap,.bb-belly,.bb-choice{transition:opacity .25s ease}.bb-ring{display:none}}
html[data-motion="reduced"] .bb-booha,html[data-power]:not([data-power="full"]) .bb-booha,html[data-motion="reduced"] .bb-gap.pop,html[data-power]:not([data-power="full"]) .bb-gap.pop{animation:none}
html[data-power]:not([data-power="full"]) .bb-ring{display:none}
html[data-power]:not([data-power="full"]) .bb-belly{transition:none}
html[data-motion="reduced"] .bb-ring{display:none}
html[data-motion="reduced"] .bb-belly{transition:none}
.bb-sentence{font-family:var(--game-font-title);font-size:clamp(22px,4.6vw,34px);line-height:1.35;color:var(--game-ink);margin:0;text-wrap:balance}
[data-curriculum="bc"] .bb-sentence,[data-curriculum="br"] .bb-sentence{font-size:clamp(18px,3.6vw,27px)}
.bb-gap{display:inline-block;min-width:4.2em;border-bottom:4px dashed var(--game-amber);line-height:1.1}
.bb-gap.filled{color:var(--game-primary);border-bottom-style:solid}
[data-curriculum="pb"] .bb-gap.filled{color:#e0439a}
.bb-jp{font-family:var(--game-font-jp);font-weight:800;font-size:clamp(14px,2.6vw,18px);color:var(--game-ink);margin:0;opacity:.92}
.bb-hira{font-family:var(--game-font-jp);font-weight:700;font-size:clamp(11px,2vw,13px);color:var(--game-muted);margin:-.4rem 0 0}
.bb-choices{width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.bb-choice{min-height:60px;padding:.7rem .8rem;border-radius:18px;cursor:pointer;font-family:var(--game-font-title);font-size:clamp(17px,3.2vw,22px);
  color:var(--game-tile-text);background:var(--game-tile-bg);border:2px solid var(--game-tile-border);box-shadow:0 4px 0 rgba(0,0,0,.25);
  transition:transform .14s cubic-bezier(.34,1.56,.64,1),opacity .2s;-webkit-tap-highlight-color:transparent}
.bb-choice{box-shadow:0 6px 0 rgba(0,0,0,.22),inset 0 0 0 3px rgba(255,255,255,.35);border-radius:22px;transition:transform .22s cubic-bezier(.3,1.7,.5,1),opacity .2s}
.bb-choice:active{transform:translateY(4px) scale(.95);transition:transform .05s ease-out}
.bb-choice:focus-visible{outline:3px solid var(--game-amber);outline-offset:3px}
.bb-choice.correct{background:#22c55e;border-color:#16a34a;color:#fff}
.bb-choice.wrong{opacity:.38;pointer-events:none}
.bb-choice.locked{pointer-events:none}
.bb-choice.enter{opacity:0;transform:translateY(8px) scale(.97)}
@media (max-width:420px){.bb-choices{gap:8px}.bb-choice{min-height:54px}}
/* PALETTE POP (2026-11-13, js/game-pop.js): the snacks are candy — each
   card deals four fresh palette colours as solid fills with the
   engine-picked ink. Correct-green (+ ✓) and the gobbled fade still win. */
html[data-skin="v2"][data-curriculum] .bb-choice.bb-pal:not(.correct):not(.wrong){
  background:var(--c);color:var(--c-ink);box-shadow:0 6px 0 color-mix(in srgb,var(--c) 55%,#000),inset 0 0 0 3px rgba(255,255,255,.4),0 10px 18px rgba(0,0,0,.22)}
`;

U.mount(`
<style>${STYLE}</style>
<div class="bb-wrap" id="bb-main">
  <div class="bb-intro">Booha ate a word! Pick the missing word. · ブーハーが ことばを たべちゃった！</div>
  <div class="bb-hud">
    <span class="bb-pill">Card <b id="bb-num">1</b> / 15</span>
    <span class="bb-pill">Score <b id="bb-score">0</b> / 15</span>
  </div>
  <div class="bb-dots" id="bb-dots"></div>
  <div class="bb-card" id="bb-card">
    <div class="bb-bwrap" id="bb-bwrap"><span class="bb-ring" id="bb-ring" aria-hidden="true"></span><div class="bb-belly" id="bb-belly"><img class="bb-booha is-idle" id="bb-booha" src="/the-booha-adventure/assets/img/booha_ghost.webp" alt="" decoding="async"></div></div>
    <p class="bb-sentence" id="bb-sentence"></p>
    <p class="bb-jp" id="bb-jp"></p>
    <p class="bb-hira" id="bb-hira"></p>
  </div>
  <div class="bb-choices" id="bb-choices"></div>
  <button type="button" id="bb-replay" hidden>もう一度</button>
  <button type="button" id="bb-back" hidden>メニューへ</button>
</div>`);

const $ = id => document.getElementById(id);
const sentenceEl = $('bb-sentence'), jpEl = $('bb-jp'), hiraEl = $('bb-hira'), choicesEl = $('bb-choices');
const cardEl = $('bb-card'), boohaEl = $('bb-booha'), numEl = $('bb-num'), scoreEl = $('bb-score'), dotsEl = $('bb-dots');
const bwrapEl = $('bb-bwrap');

/* Palette Pop (js/game-pop.js). A no-op stand-in keeps the game playable
   if that file ever fails to load. */
const POP = window.BoohaPop || new Proxy({}, { get: (_, k) => (k === 'color' ? () => '' : k === 'canFlash' ? () => true : () => {}) });
POP.init({ pill: '#bb-score' });

/* ── Booha comes alive (Pass B1) ───────────────────────────────────────── */
const IMG = '/the-booha-adventure/assets/img/';
const POSE = {
  idle: IMG + 'booha_ghost.webp', cheer: IMG + 'booha_ghost_dance_arms_up.webp',
  sway: IMG + 'booha_ghost_dance_sway.webp', wave: IMG + 'booha_ghost_dance_wave.webp',
};
const INTRO_MS = 900;                   // swoop in, crunch, float back
const FLY_MS = 380;                     // a burped-back word reaching the gap
[POSE.cheer, POSE.sway, POSE.wave].forEach(src => { const im = new Image(); im.src = src; });   // no flash on the first pose
let cardToken = 0;                      // timers from an older card do nothing
function calm() {
  const m = window.BoohaMotion;
  try { if (m && ((m.reduced && m.reduced()) || (m.lowPower && m.lowPower()))) return true; } catch (_) {}
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function later(token, ms, fn) { setTimeout(() => { if (token === cardToken) fn(); }, ms); }
function replayClass(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
// Booha's one-shot moves (chomp, cheer, bleh, dance, spin) only when motion is
// welcome: reduced motion and low/minimal power keep the pose, skip the move.
function bounce(cls) { if (!calm()) replayClass(boohaEl, cls); }
function centerIn(el) {
  const c = cardEl.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 };
}
function pose(name) { const src = POSE[name] || POSE.idle; if (boohaEl.getAttribute('src') !== src) boohaEl.setAttribute('src', src); }
function moveBooha(x, y, instant) {
  bwrapEl.classList.toggle('is-fast', !!instant);
  bwrapEl.style.transform = x || y ? `translate(${Math.round(x)}px,${Math.round(y)}px)` : '';
  if (instant) { void bwrapEl.offsetWidth; bwrapEl.classList.remove('is-fast'); }
}

// Little sounds from the game's own Web Audio context (no new files).
function sfx(kind) {
  try {
    const c = window.BoohaSFX && window.BoohaSFX.context && window.BoohaSFX.context();
    if (!c || c.state !== 'running') return;
    const t = c.currentTime;
    const out = c.createGain();
    out.connect(c.destination);
    if (kind === 'crunch') {
      // three quick noise bites
      const len = Math.floor(c.sampleRate * 0.05);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      [0, 0.07, 0.15].forEach((at, i) => {
        const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
        src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 1400 - i * 250; f.Q.value = 1.2;
        g.gain.setValueAtTime(0.16, t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.05);
        src.connect(f); f.connect(g); g.connect(out); src.start(t + at);
      });
      return;
    }
    const o = c.createOscillator();
    o.connect(out);
    if (kind === 'burp') {
      o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t); o.frequency.linearRampToValueAtTime(95, t + 0.32);
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
      o.disconnect(); o.connect(f); f.connect(out);
      out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.16, t + 0.04); out.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.start(t); o.stop(t + 0.36);
    } else if (kind === 'gulp') {
      o.type = 'sine'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.18);
      out.gain.setValueAtTime(0.12, t); out.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.start(t); o.stop(t + 0.21);
    } else {   // pop: the word comes back
      o.type = 'triangle'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1250, t + 0.08);
      out.gain.setValueAtTime(0.09, t); out.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.start(t); o.stop(t + 0.13);
    }
  } catch (_) {}
}

function crumbs(at) {
  for (let i = 0; i < 7; i++) {
    const b = document.createElement('span');
    b.className = 'bb-crumb';
    b.style.left = `${at.x}px`; b.style.top = `${at.y}px`;
    cardEl.appendChild(b);
    const a = (i / 7) * Math.PI * 2 + Math.random() * 0.6, d = 26 + Math.random() * 34;
    void b.offsetWidth;
    b.style.transform = `translate(${Math.round(Math.cos(a) * d)}px,${Math.round(Math.sin(a) * d + 18)}px) rotate(${Math.round(Math.random() * 180)}deg)`;
    b.style.opacity = '0';
    setTimeout(() => b.remove(), 650);
  }
}

// Each card: Booha swoops over the gap, crunches the word away, floats back.
function introBite(token, gap, done) {
  pose('idle');
  if (calm()) {
    gap.classList.remove('is-hidden');
    bounce('chomp');
    sfx('crunch');
    done();
    return;
  }
  const home = centerIn(bwrapEl), g = centerIn(gap);
  boohaEl.classList.remove('is-idle');
  moveBooha(30 - home.x, g.y - home.y, true);           // start at the card's left edge (fades in; never widens the page)
  bwrapEl.classList.add('is-away');
  void bwrapEl.offsetWidth;
  bwrapEl.classList.remove('is-away');
  moveBooha(g.x - home.x, g.y - home.y - 10);
  later(token, 400, () => {
    bounce('chomp');
    sfx('crunch');
    crumbs(g);
    POP.burst(gap, null, 22, { mixed: true, confetti: 8, spread: .6 });   // Palette Pop: candy crumbs everywhere
    gap.classList.remove('is-hidden');
    replayClass(gap, 'pop');
  });
  later(token, 620, () => moveBooha(0, 0));
  later(token, INTRO_MS, () => { boohaEl.classList.add('is-idle'); done(); });
}

// Right answer: the word flies from Booha into the gap, then Booha cheers.
let landKey = null;   // the right snack's colour: the burped-back word explodes in it
function burpBack(token, word, gap, land) {
  pose('cheer');
  bounce('cheer');
  later(token, 900, () => { if (!boohaEl.classList.contains('dance') && !boohaEl.classList.contains('spin')) pose('idle'); });
  if (calm()) { land(); sfx('pop'); return; }
  const from = centerIn(bwrapEl), to = centerIn(gap);
  const w = document.createElement('span');
  w.className = 'bb-flyword';
  w.textContent = word;
  cardEl.appendChild(w);
  const half = { x: w.offsetWidth / 2, y: w.offsetHeight / 2 };
  w.style.left = `${from.x - half.x}px`; w.style.top = `${from.y - half.y}px`;
  w.style.transform = 'scale(.3)';
  void w.offsetWidth;
  w.style.transform = `translate(${Math.round(to.x - from.x)}px,${Math.round(to.y - from.y)}px) scale(1)`;
  setTimeout(() => {
    w.remove();
    if (token !== cardToken) return;
    land();
    replayClass(gap, 'pop');
    sfx('pop');
    if (window.GAME_UTILS && U.confetti) U.confetti(gap, 14);
    if (landKey) POP.correct(gap, landKey, Math.max(1, streak));   // Palette Pop: the word explodes into gems for the score
  }, FLY_MS);
}

/* ── The game layer (Pass B2) ──────────────────────────────────────────── */
const ringEl = $('bb-ring'), bellyEl = $('bb-belly');
const BELLY_STEP = 0.05, BELLY_MAX = 6;     // up to 1.3× after six in a row
const MILESTONES = { 3: 'sway', 6: 'wave', 10: 'cheer' };
let streak = 0;

// The hunger ring shrinks through the speed-bonus window (run.ready ms).
function startRing(ms) {
  if (calm()) return;
  ringEl.classList.remove('is-out');
  ringEl.style.transition = 'none';
  ringEl.style.transform = 'scale(1)';
  ringEl.classList.add('is-on');
  void ringEl.offsetWidth;
  ringEl.style.transition = `transform ${Math.round(ms)}ms linear`;
  ringEl.style.transform = 'scale(.55)';
  ringEl.timer = setTimeout(stopRing, ms);
}
function stopRing() {
  clearTimeout(ringEl.timer);
  const now = getComputedStyle(ringEl).transform;
  ringEl.style.transition = 'none';
  if (now && now !== 'none') ringEl.style.transform = now;   // freeze where it was
  ringEl.classList.add('is-out');
  ringEl.classList.remove('is-on');
}

// Rounder with each first-try answer in a row; back to normal on a miss.
function setBelly(n) {
  if (calm()) { bellyEl.style.transform = ''; return; }   // no growing on reduced motion / low power
  bellyEl.style.transform = n > 0 ? `scale(${(1 + BELLY_STEP * Math.min(n, BELLY_MAX)).toFixed(2)})` : '';
}
// At 3 / 6 / 10 in a row Booha dances (the run's combo banner shows too).
function milestone(n) {
  const p = MILESTONES[n];
  if (!p) return false;
  pose(p);
  bounce(n >= 10 ? 'spin' : 'dance');
  sfx('pop');
  POP.round(n >= 10 ? 5 : 3, cardEl, 5);            // Palette Pop: a palette firework at 3 / 6…
  if (n >= 10) POP.fireworks(cardEl, 6, 200);       // …and a full volley at 10
  const token = cardToken;
  setTimeout(() => { boohaEl.classList.remove('dance', 'spin'); if (token === cardToken) pose('idle'); }, 1250);
  return true;
}

// After the last card: a full-belly BURP! before the results.
function finalBurp(done) {
  const bubble = document.createElement('p');
  bubble.className = 'bb-burp';
  bubble.textContent = 'BURP! · げっぷ！';
  bwrapEl.appendChild(bubble);
  bellyEl.style.transform = calm() ? '' : 'scale(1.45)';
  sfx('gulp');
  setTimeout(() => {
    bubble.classList.add('is-on'); sfx('burp');
    // Palette Pop: the BURP is an explosion of colour out of Booha.
    POP.burst(bwrapEl, null, 40, { mixed: true, round: true, grow: 70, speed: 1.4, confetti: 30, spread: 1.1 });
    POP.fireworks(bwrapEl, 4, 150);
    if (score === 15) POP.fireworks(cardEl, 8, 180);
  }, calm() ? 0 : 280);
  setTimeout(() => { setBelly(0); bubble.remove(); done(); }, 1300);
}

// Wrong choice: Booha gobbles the button and goes "bleh!".
function gobble(btn) {
  const from = centerIn(btn), mouth = centerIn(bwrapEl);
  btn.classList.add('eaten');
  if (!calm()) btn.style.transform = `translate(${Math.round(mouth.x - from.x)}px,${Math.round(mouth.y - from.y)}px) scale(.12) rotate(-14deg)`;
  setTimeout(() => {
    btn.classList.add('gone');
    bounce('bleh');
    sfx('gulp');
    POP.burst(bwrapEl, btn.style.getPropertyValue('--c') || null, 14, { smoke: 6, speed: .7, white: 0 });   // Palette Pop: bleh! the snack comes out as smoke and crumbs
  }, calm() ? 0 : 400);
}

let rounds = buildRounds();
let idx = 0, score = 0, firstTry = true, busy = false, pickCooldown = false;
let missedItems = [];
const dotState = [];

function renderDots() {
  dotsEl.innerHTML = '';
  for (let i = 0; i < 15; i++) {
    const d = document.createElement('span');
    d.className = 'bb-dot' + (dotState[i] === 'ok' ? ' done' : dotState[i] === 'miss' ? ' miss' : i === idx ? ' now' : '');
    dotsEl.appendChild(d);
  }
}

function showCard() {
  const r = rounds[idx];
  firstTry = true; busy = false; pickCooldown = false;
  numEl.textContent = idx + 1;
  renderDots();
  const s = r.card.en, b = r.bite;
  sentenceEl.textContent = '';
  sentenceEl.appendChild(document.createTextNode(s.slice(0, b.start)));
  const gap = document.createElement('span');
  gap.className = 'bb-gap';
  gap.id = 'bb-gap';
  gap.textContent = '\u00a0';                     // empty until answered: no hint in the text
  gap.classList.add('is-hidden');                // appears where Booha bites
  gap.setAttribute('aria-label', 'missing word / ぬけた ことば');
  sentenceEl.appendChild(gap);
  sentenceEl.appendChild(document.createTextNode(s.slice(b.end)));
  jpEl.textContent = r.card.jp || '';
  hiraEl.textContent = PB && r.card.hira ? r.card.hira : '';
  const token = ++cardToken;
  busy = true;                                   // no picks while Booha is biting

  choicesEl.innerHTML = '';
  POP.newRound(r.options.map((_, i) => `bb${idx}-${i}`));   // Palette Pop: four candy colours per card
  r.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bb-choice enter bb-pal';
    btn.textContent = opt;
    btn.dataset.popKey = `bb${idx}-${i}`;
    POP.paint(btn, btn.dataset.popKey);
    btn.addEventListener('click', () => pick(btn, opt));
    choicesEl.appendChild(btn);
    setTimeout(() => btn.classList.remove('enter'), 60 + i * 55);
  });
  // Sharp window grows with sentence length (reading time); it starts
  // once Booha has finished his bite.
  introBite(token, gap, () => {
    busy = false;
    const sharp = 2000 + 160 * s.split(/\s+/).length;
    run.ready(sharp);
    startRing(sharp);
  });
}

function pick(btn, opt) {
  if (busy || pickCooldown) return;
  pickCooldown = true;
  setTimeout(() => { pickCooldown = false; }, 500);
  const r = rounds[idx];
  if (opt === r.answer) {
    busy = true;
    stopRing();
    if (firstTry) { run.hit(); score++; scoreEl.textContent = score; dotState[idx] = 'ok'; streak++; }
    else { run.recover(); dotState[idx] = 'miss'; streak = 0; }
    setBelly(streak);
    landKey = firstTry ? btn.dataset.popKey : null;   // only a first-try answer bursts into gems
    if (firstTry && streak >= 3) POP.burst(bwrapEl, null, 6 + streak * 2, { ring: false, mixed: true, speed: .6 });   // a full Booha hiccups sparkles
    btn.classList.add('correct');
    Array.from(choicesEl.children).forEach(b => b.classList.add('locked'));
    const gapEl = $('bb-gap');
    const reached = streak;
    burpBack(cardToken, r.bite.word, gapEl, () => {
      gapEl.textContent = r.bite.word;
      gapEl.removeAttribute('aria-label');
      gapEl.classList.add('filled');
      milestone(reached);
    });
    renderDots();
    let moved = false;
    const answeredAt = Date.now();
    const next = () => {
      if (moved) return; moved = true;
      // Give the burped-back word time to land and be seen, even when the
      // ding or the voice clip is missing.
      const wait = Math.max(260, FLY_MS + 450 - (Date.now() - answeredAt));
      setTimeout(() => {
        idx++;
        if (idx >= rounds.length) finalBurp(showResults);
        else showCard();
      }, wait);
    };
    let dingDone = false;
    const afterDing = () => {
      if (dingDone) return; dingDone = true;
      if (!r.card.mp3) { setTimeout(next, 500); return; }
      const a = new Audio(CFG.audioBase + r.card.mp3);
      a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', '');
      if (!voiceGate.play(a, { replace: true, ignoreCooldown: true, onEnd: next })) next();
    };
    U.playSFX('ding', afterDing);
    setTimeout(afterDing, 450);
  } else {
    firstTry = false;
    run.miss();
    if (!missedItems.some(m => m.jp === r.card.jp)) missedItems.push(r.card);
    btn.classList.add('wrong');
    streak = 0; setBelly(0); stopRing();   // the speed bonus is gone after a wrong pick
    gobble(btn);
    U.playSFX('fart');
    cardEl.classList.remove('shake'); void cardEl.offsetWidth; cardEl.classList.add('shake');
  }
}

function showResults() {
  const runSum = run.summary();
  const pct = Math.round((score / 15) * 100);
  voiceGate.stop();
  U.emitGameEnd({
    points: runSum.points, maxCombo: runSum.maxCombo, crown: runSum.fullCombo,
    saveId: SAVE_ID, score: pct, completed: pct >= 40,
  });
  if (score === 15) U.confetti(cardEl, 70);
  U.showScorecard({
    run: runSum,
    gameId: SAVE_ID,
    title: 'Booha Bites',
    correct: score,
    total: 15,
    pct,
    replayId: 'bb-replay',
    backId: 'bb-back',
    stats: [
      { label: 'First-try correct / せいかい', value: `${score} / 15` },
      { label: 'Review items / ふくしゅう', value: String(missedItems.length) },
    ],
    reviewItems: missedItems,
    audioBase: CFG.audioBase,
  });
}

$('bb-replay').addEventListener('click', () => {
  cardToken++;
  streak = 0; setBelly(0); stopRing();
  POP.reset();   /* Palette Pop: cancel any frames, timers and sounds still in flight */
  rounds = buildRounds();
  idx = 0; score = 0; missedItems = []; dotState.length = 0;
  scoreEl.textContent = '0';
  run.reset();
  showCard();
});
$('bb-back').addEventListener('click', () => {
  voiceGate.stop();
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

showCard();
})();
