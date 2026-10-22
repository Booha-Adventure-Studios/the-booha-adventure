/* ══════════════════════════════════════════════════════════════
   booha-bites.js — Booha Bites (Games Pass 6, extra game)
   Booha ate one word out of each of this week's 15 sentences. Pick the
   missing word. The Japanese is always shown, so meaning settles the
   answer even when two words could fit the grammar.

   Bite choice: the week's vocab word when it appears in the sentence
   (own card first, then any vocab of the week), otherwise the sentence's
   strongest content word. Decoys come from the same week.

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
.bb-booha{width:74px;height:74px;object-fit:contain}
.bb-booha.chomp{animation:bbChomp .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes bbChomp{30%{transform:scale(1.18) rotate(-6deg)}60%{transform:scale(.94) rotate(4deg)}}
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
.bb-choice:active{transform:scale(.96)}
.bb-choice:focus-visible{outline:3px solid var(--game-amber);outline-offset:3px}
.bb-choice.correct{background:#22c55e;border-color:#16a34a;color:#fff}
.bb-choice.wrong{opacity:.38;pointer-events:none}
.bb-choice.locked{pointer-events:none}
.bb-choice.enter{opacity:0;transform:translateY(8px) scale(.97)}
@media (max-width:420px){.bb-choices{gap:8px}.bb-choice{min-height:54px}}
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
    <img class="bb-booha" id="bb-booha" src="/the-booha-adventure/assets/img/booha_ghost.webp" alt="" decoding="async">
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
  gap.setAttribute('aria-label', 'missing word / ぬけた ことば');
  sentenceEl.appendChild(gap);
  sentenceEl.appendChild(document.createTextNode(s.slice(b.end)));
  jpEl.textContent = r.card.jp || '';
  hiraEl.textContent = PB && r.card.hira ? r.card.hira : '';
  boohaEl.classList.remove('chomp'); void boohaEl.offsetWidth; boohaEl.classList.add('chomp');

  choicesEl.innerHTML = '';
  r.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bb-choice enter';
    btn.textContent = opt;
    btn.addEventListener('click', () => pick(btn, opt));
    choicesEl.appendChild(btn);
    setTimeout(() => btn.classList.remove('enter'), 60 + i * 55);
  });
  // Sharp window grows with sentence length (reading time).
  run.ready(2000 + 160 * s.split(/\s+/).length);
}

function pick(btn, opt) {
  if (busy || pickCooldown) return;
  pickCooldown = true;
  setTimeout(() => { pickCooldown = false; }, 500);
  const r = rounds[idx];
  if (opt === r.answer) {
    busy = true;
    if (firstTry) { run.hit(); score++; scoreEl.textContent = score; dotState[idx] = 'ok'; }
    else { run.recover(); dotState[idx] = 'miss'; }
    btn.classList.add('correct');
    Array.from(choicesEl.children).forEach(b => b.classList.add('locked'));
    const gapEl = $('bb-gap');
    gapEl.textContent = r.bite.word;
    gapEl.removeAttribute('aria-label');
    gapEl.classList.add('filled');
    renderDots();
    let moved = false;
    const next = () => {
      if (moved) return; moved = true;
      setTimeout(() => { idx++; if (idx >= rounds.length) showResults(); else showCard(); }, 260);
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
