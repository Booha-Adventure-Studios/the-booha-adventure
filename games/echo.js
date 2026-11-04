/* ══════════════════════════════════════════════════════════════
   echo.js — Echo: hear it, type it (Games Pass 7, extra game)
   The week's 15 vocab items are dictated; the student types what they
   hear. Guessing cannot help here, so it rewards preparation the most.

   Answer check (strict, but fair):
     - case, curly apostrophes, trailing punctuation and extra spaces
       never matter; "round trip" = "round-trip"; "plan／think" accepts
       either alternative
     - one slip on a longer item (two on a long phrase) is "so close":
       the student gets one more try (+0.5, +50 points, combo ends)
     - otherwise one more try after listening again, then the answer
       is shown and the game moves on
   A hint (first letter + length) is allowed, but a hinted item can no
   longer be a first-try answer.

   Keys (Pass E1): no text box, so the iPad keyboard, its suggestions and
   autofill never appear and nothing can be pasted. The shared on-screen
   keyboard (js/booha-keys.js), in the curriculum's game colours, is docked
   at the bottom while a card is being answered; a physical keyboard still
   types. After a wrong try the next letter starts the word again (like the
   old select-all), backspace edits it instead.

   Extra game: saves as "{curriculum}-extra:echo" (outside the nine).
   ══════════════════════════════════════════════════════════════ */
(async function () {
'use strict';

/* ── Pure logic (exported for tests/games-extras-audit.cjs) ─────────────── */
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[‐‑‒–—-]/g, ' ')
    .replace(/[.,!?;:"“”。、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
/* "plan／think" → ["plan", "think"] */
function targetsOf(target) {
  return String(target || '').split(/[／/]/).map(normalize).filter(Boolean);
}
/* Edit distance where a swapped pair ("trian") counts as one slip. */
function distance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}
function allowedSlips(t) {
  const letters = t.replace(/[^a-z]/g, '').length;
  return letters >= 15 ? 2 : letters >= 5 ? 1 : 0;
}
/* 'exact' | 'near' | 'wrong' */
function check(target, typed) {
  const got = normalize(typed);
  if (!got) return 'wrong';
  const alts = targetsOf(target);
  // Typing the whole "plan／think" (or "plan/think") is fine too.
  if (/[／/]/.test(got)) {
    const parts = targetsOf(got);
    if (parts.length && parts.every(p => alts.includes(p))) return 'exact';
  }
  let near = false;
  for (const t of alts) {
    if (got === t) return 'exact';
    const slips = allowedSlips(t);
    if (slips && distance(got, t) <= slips) near = true;
  }
  return near ? 'near' : 'wrong';
}
/* How many leading characters of the typed answer are right (for feedback). */
function rightPrefix(target, typed) {
  const got = normalize(typed);
  let best = 0;
  for (const t of targetsOf(target)) {
    let i = 0;
    while (i < got.length && i < t.length && got[i] === t[i]) i++;
    best = Math.max(best, i);
  }
  return best;
}
/* "c _ _ _ _ _ _ _ _" style hint for the first alternative. */
function hintFor(target) {
  const t = String(target || '').split(/[／/]/)[0].trim();
  return t.split('').map((ch, i) => (i === 0 || !/[A-Za-z]/.test(ch) ? ch : '_')).join(' ').replace(/ {3}/g, '   ');
}

if (typeof window !== 'undefined') window.EchoLogic = { normalize, targetsOf, check, rightPrefix, hintFor, distance, allowedSlips };

/* ── Game ─────────────────────────────────────────────────────────────── */
const CFG = typeof window !== 'undefined' ? window.GAME_CONFIG : null;
const U   = typeof window !== 'undefined' ? window.GAME_UTILS : null;
if (!CFG || !U || typeof document === 'undefined') return;

U.setTitle('Echo');
U.unlockAudio();

const SAVE_ID = `${CFG.curriculum}-extra:echo`;
const run = U.createRun({ total: 15, recoverPoints: 50 });   // typing can't be guessed: a fixed second try earns +50
const voiceGate = U.createAudioGate({ cooldownMs: 300, timeoutMs: 9000 });
await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

const STYLE = `
.ec-wrap{max-width:640px;margin:0 auto;padding:.5rem 1rem 5rem;display:flex;flex-direction:column;align-items:center;gap:.85rem;box-sizing:border-box}
.ec-intro{text-align:center;font-weight:900;font-size:clamp(13px,2.2vw,16px);color:var(--game-muted)}
.ec-hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.ec-pill{padding:5px 16px;border-radius:999px;background:var(--game-pill-bg);border:1.5px solid var(--game-pill-border);color:var(--game-pill-text);font-size:clamp(12px,2vw,15px);font-weight:900;font-variant-numeric:tabular-nums}
.ec-dots{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}
.ec-dot{width:10px;height:10px;border-radius:50%;background:var(--game-meter-bg)}
.ec-dot.done{background:var(--game-primary)}.ec-dot.half{background:var(--game-amber)}.ec-dot.miss{background:#ef4444}
.ec-dot.now{background:var(--game-amber);transform:scale(1.25)}
.ec-card{width:100%;border-radius:24px;padding:1.3rem 1.1rem;box-sizing:border-box;text-align:center;background:var(--game-surface);border:2px solid var(--game-border);
  box-shadow:0 6px 26px rgba(0,0,0,.22);display:flex;flex-direction:column;align-items:center;gap:.8rem}
.ec-card.shake{animation:ecShake .38s ease}
@keyframes ecShake{20%{transform:translateX(-7px)}45%{transform:translateX(6px)}70%{transform:translateX(-3px)}}
.ec-audio{display:flex;gap:12px;align-items:center;justify-content:center}
.ec-play{width:84px;height:84px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;font-size:30px;color:#2b1a05;
  background:radial-gradient(circle at 35% 30%,#ffe39a,#ffc94a 55%,#d48a1a);box-shadow:0 5px 0 rgba(140,80,0,.45);transition:transform .14s}
.ec-play:active{transform:scale(.94)}
.ec-play.playing{background:radial-gradient(circle at 35% 30%,#a8f0c8,#22c55e 60%,#16a34a)}
.ec-slow{min-height:44px;padding:8px 14px;border-radius:999px;border:1.5px solid var(--game-border);background:var(--game-surface-2);color:var(--game-ink);font-weight:900;cursor:pointer}
.ec-jp{font-family:var(--game-font-jp);font-weight:800;font-size:clamp(15px,2.8vw,19px);color:var(--game-ink);margin:0}
.ec-hint{font-family:ui-monospace,Menlo,monospace;font-size:clamp(16px,3vw,20px);letter-spacing:.08em;color:var(--game-amber);min-height:1.4em;margin:0}
.ec-row{width:100%;display:flex;gap:10px}
.ec-input{flex:1;min-width:0;min-height:54px;display:flex;align-items:center;flex-wrap:wrap;font:800 18px var(--game-font-body);padding:12px 16px;border-radius:16px;border:2px solid var(--game-primary);
  background:var(--game-answer-bg);color:var(--game-answer-text);white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;box-sizing:border-box;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.ec-ph{margin-left:4px;color:var(--game-muted);font-weight:700}
.ec-ph[hidden]{display:none}
.ec-caret{display:inline-block;width:2px;height:1.15em;margin-left:1px;border-radius:1px;background:var(--game-primary);animation:ecCaret 1s steps(1) infinite}
@keyframes ecCaret{50%{opacity:0}}
.ec-input.ok{border-color:#22c55e}.ec-input.bad{border-color:#ef4444}
.ec-input.is-done .ec-caret{opacity:0;animation:none}
#ec-keys-dock{position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;justify-content:center;box-sizing:border-box;
  padding:0 max(8px,env(safe-area-inset-right,0px)) max(8px,env(safe-area-inset-bottom,0px)) max(8px,env(safe-area-inset-left,0px));
  pointer-events:none;opacity:0;transform:translateY(110%);transition:transform .28s ease-out,opacity .2s ease-out}
#ec-keys-dock.is-open{opacity:1;transform:none}
#ec-keys-dock[hidden]{display:none}
#ec-keys-dock .ec-keys{width:min(800px,100%);pointer-events:auto;
  --kc:var(--game-primary);--kd:var(--game-border);--cap:var(--game-surface);--cap2:var(--game-surface-2,var(--game-surface));
  --kt:var(--game-ink);--kt2:var(--game-muted);--kok:#0b0614;--kbg:var(--game-bg,#fff);--kring:var(--game-border);--kshadow:rgba(0,0,0,.28);
  box-shadow:inset 0 0 0 1.5px var(--kring),0 -6px 22px rgba(0,0,0,.22)}
#ec-keys-dock .bk-key{font-family:var(--game-font-body)}
#ec-keys-dock .bk-key.is-ok{background:linear-gradient(135deg,var(--game-primary),var(--game-secondary))}
@media (prefers-reduced-motion:reduce){#ec-keys-dock{transform:none}.ec-caret{animation:none}}
html[data-motion="reduced"] #ec-keys-dock,html[data-power]:not([data-power="full"]) #ec-keys-dock{transform:none}
.ec-tools{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.ec-tool{min-height:44px;padding:8px 16px;border-radius:999px;border:1.5px solid var(--game-border);background:transparent;color:var(--game-muted);font-weight:900;cursor:pointer}
.ec-tool:disabled{opacity:.4;cursor:default}
.ec-feedback{min-height:1.5em;font-weight:900;font-size:clamp(14px,2.6vw,17px);text-align:center;margin:0}
.ec-feedback.ok{color:#22c55e}.ec-feedback.near{color:var(--game-amber)}.ec-feedback.bad{color:#ef4444}
.ec-answer{font-family:var(--game-font-title);font-size:clamp(22px,4.6vw,32px);color:var(--game-primary);margin:0}
.ec-typed b{color:#22c55e;font-weight:900}.ec-typed s{color:#ef4444;text-decoration:none}
`;

U.mount(`
<style>${STYLE}</style>
<div class="ec-wrap" id="ec-main">
  <div class="ec-intro">Listen, then type what you hear. · きいて、かこう！</div>
  <div class="ec-hud">
    <span class="ec-pill">Card <b id="ec-num">1</b> / 15</span>
    <span class="ec-pill">Score <b id="ec-score">0</b> / 15</span>
  </div>
  <div class="ec-dots" id="ec-dots"></div>
  <div class="ec-card" id="ec-card">
    <div class="ec-audio">
      <button type="button" class="ec-play" id="ec-play" aria-label="Play / きく">▶</button>
      <button type="button" class="ec-slow" id="ec-slow">Slow / ゆっくり</button>
    </div>
    <p class="ec-jp" id="ec-jp"></p>
    <p class="ec-hint" id="ec-hint" aria-live="polite"></p>
    <div class="ec-row">
      <div class="ec-input" id="ec-input" role="textbox" aria-readonly="true" aria-label="Type what you hear"><span class="ec-typed-now" id="ec-typed"></span><i class="ec-caret" aria-hidden="true"></i><span class="ec-ph" id="ec-ph">type here · かこう</span></div>
    </div>
    <p class="ec-feedback" id="ec-feedback" aria-live="polite"></p>
    <div class="ec-tools">
      <button type="button" class="ec-tool" id="ec-hintbtn">Hint · ヒント</button>
      <button type="button" class="ec-tool" id="ec-next" hidden>Next · つぎへ →</button>
    </div>
  </div>
  <button type="button" id="ec-replay" hidden>もう一度</button>
  <button type="button" id="ec-back" hidden>メニューへ</button>
</div>`);

const $ = id => document.getElementById(id);
const playBtn = $('ec-play'), slowBtn = $('ec-slow'), jpEl = $('ec-jp'), hintEl = $('ec-hint');
const input = $('ec-input'), typedEl = $('ec-typed'), phEl = $('ec-ph'), fb = $('ec-feedback'), hintBtn = $('ec-hintbtn'), nextBtn = $('ec-next');
const cardEl = $('ec-card'), numEl = $('ec-num'), scoreEl = $('ec-score'), dotsEl = $('ec-dots');

let order = U.shuffle(CFG.cards.slice(0, 15));
let idx = 0, score = 0, tries = 0, hinted = false, heard = false, done = false;
let typed = '', restartWord = false;   // restartWord: the next letter replaces a wrong try
let missedItems = [];
const dotState = [];

/* ── On-screen keys (Pass E1) ──────────────────────────────────────────── */
const MAX_TYPED = 60;
let dock = null, keys = null;
function showTyped() {
  typedEl.textContent = typed;
  phEl.hidden = typed.length > 0;
  input.classList.remove('bad');
}
function onKey(k) {
  if (done) return false;
  if (k === 'ok') { submit(); return true; }
  if (k === 'back') { restartWord = false; typed = typed.slice(0, -1); }
  else {
    if (restartWord) { typed = ''; restartWord = false; }
    if (typed.length < MAX_TYPED) typed += k;
  }
  showTyped();
  return true;
}
function measureKeys() {
  const wrap = $('ec-main');
  if (!dock || !wrap) return;
  wrap.style.paddingBottom = dock.classList.contains('is-open') ? `${dock.offsetHeight + 16}px` : '';
}
// Keep the card's answer, feedback and Hint above the docked keys (iPad
// landscape has room for the card, not for the title above it too).
function keepCardVisible() {
  if (!dock || !dock.classList.contains('is-open')) return;
  requestAnimationFrame(() => {
    const tools = cardEl.querySelector('.ec-tools');
    const room = window.innerHeight - dock.offsetHeight - 12;
    const over = tools.getBoundingClientRect().bottom - room;
    const top = cardEl.getBoundingClientRect().top;
    if (over > 0) window.scrollBy(0, Math.min(over, Math.max(0, top - 8)));
  });
}
function showKeys() {
  if (!window.BoohaKeys) return;
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'ec-keys-dock';
    dock.hidden = true;
    keys = window.BoohaKeys.create({
      className: 'ec-keys', marks: ["'", '-'], okHTML: 'Check<small lang="ja">けってい</small>',
      label: 'Keyboard', repeatBack: true, onKey,
    });
    dock.appendChild(keys.el);
    document.body.appendChild(dock);
    window.addEventListener('resize', measureKeys, { passive: true });
  }
  dock.hidden = false;
  void dock.offsetWidth;
  dock.classList.add('is-open');
  measureKeys();
  setTimeout(keepCardVisible, 320);
}
function hideKeys() {
  if (!dock) return;
  dock.classList.remove('is-open');
  measureKeys();
  setTimeout(() => { if (dock && !dock.classList.contains('is-open')) dock.hidden = true; }, 300);
}
// A physical keyboard (teacher Mac, iPad keyboard case) types the same keys.
document.addEventListener('keydown', e => {
  if (!keys || !dock || !dock.classList.contains('is-open') || done) return;
  const k = keys.keyFromEvent(e);
  if (k === null) return;
  e.preventDefault();                 // never scroll or press a focused button
  keys.tap(k);
});

function renderDots() {
  dotsEl.innerHTML = '';
  for (let i = 0; i < 15; i++) {
    const d = document.createElement('span');
    const st = dotState[i];
    d.className = 'ec-dot' + (st === 'ok' ? ' done' : st === 'half' ? ' half' : st === 'miss' ? ' miss' : i === idx ? ' now' : '');
    dotsEl.appendChild(d);
  }
}

function stopVoice() {
  voiceGate.stop();                       // stop() never fires the old onEnd
  playBtn.classList.remove('playing');
}

function play(rate) {
  const card = order[idx];
  if (!card || !card.mp3) return;
  const myIdx = idx;
  run.pauseClock();   // a replay is listening time, not answer time
  U.unlockAudio();
  const a = new Audio(CFG.audioBase + card.mp3);
  a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', '');
  try { a.playbackRate = rate || 1; a.preservesPitch = true; a.webkitPreservesPitch = true; } catch (_) {}
  playBtn.classList.add('playing');
  const end = () => {
    if (myIdx !== idx) return;            // a clip from an earlier card: ignore
    playBtn.classList.remove('playing');
    heard = true; run.audioDone();   // also resumes the clock after a replay
  };
  if (!voiceGate.play(a, { replace: true, ignoreCooldown: true, onEnd: end })) end();
}

function showCard() {
  stopVoice();
  const card = order[idx];
  tries = 0; hinted = false; heard = false; done = false;
  numEl.textContent = idx + 1;
  renderDots();
  // Pre-Boo shows hiragana: small children should not need to read kanji.
  jpEl.textContent = (CFG.curriculum === 'pb' ? (card.hira || card.jp) : card.jp) || '';
  hintEl.textContent = '';
  typed = ''; restartWord = false;
  showTyped();
  input.className = 'ec-input';
  hintBtn.disabled = false;
  showKeys();
  nextBtn.hidden = true;
  fb.className = 'ec-feedback';
  fb.textContent = 'Tap ▶ to listen · ▶ を おして きこう';
  // Sharp window starts when the clip ends: about 0.9 s per word to type it.
  const words = String(card.en || '').trim().split(/\s+/).filter(Boolean).length;
  run.ready(2500 + 900 * words, { waitAudio: true });
}

function typedHTML(target, typed) {
  const n = rightPrefix(target, typed);
  const t = normalize(typed);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<span class="ec-typed"><b>${esc(t.slice(0, n))}</b><s>${esc(t.slice(n))}</s></span>`;
}

function finishItem(result) {
  done = true;
  hintBtn.disabled = true;
  input.classList.add('is-done');
  const card = order[idx];
  if (result === 'ok') { dotState[idx] = 'ok'; }
  else if (result === 'half') { dotState[idx] = 'half'; }
  else {
    dotState[idx] = 'miss';
    fb.className = 'ec-feedback bad';
    fb.innerHTML = `The answer: <span class="ec-answer"></span>`;
    fb.querySelector('.ec-answer').textContent = card.en;
  }
  renderDots();
  if (result === 'miss') {
    hideKeys();                         // the answer and Next stay in view
    nextBtn.hidden = false; try { nextBtn.focus({ preventScroll: true }); } catch (_) {}
  }
  else setTimeout(advance, 900);
}

function advance() {
  idx++;
  if (idx >= order.length) showResults();
  else showCard();
}

function submit() {
  if (done) return;
  const card = order[idx];
  if (!normalize(typed)) return;
  const verdict = check(card.en, typed);
  tries++;
  if (verdict === 'exact') {
    input.className = 'ec-input ok';
    U.playSFX('ding');
    if (tries === 1 && !hinted) {
      run.hit(); score += 1;
      fb.className = 'ec-feedback ok'; fb.textContent = 'Perfect! · せいかい！';
      finishItem('ok');
    } else {
      run.recover(); score += 0.5;
      fb.className = 'ec-feedback ok'; fb.textContent = hinted && tries === 1 ? 'Right, with a hint! +0.5' : 'Fixed it! +0.5';
      finishItem('half');
    }
    scoreEl.textContent = String(score);
    return;
  }
  // Wrong or near: one more try, then show the answer.
  run.miss();
  if (!missedItems.includes(card)) missedItems.push(card);
  U.playSFX('fart');
  cardEl.classList.remove('shake'); void cardEl.offsetWidth; cardEl.classList.add('shake');
  input.className = 'ec-input bad';
  if (tries >= 2) { finishItem('miss'); return; }
  fb.className = 'ec-feedback ' + (verdict === 'near' ? 'near' : 'bad');
  fb.innerHTML = (verdict === 'near' ? 'So close! Check the spelling: ' : 'Not quite. Listen again: ') + typedHTML(card.en, typed);
  keepCardVisible();
  restartWord = true;                   // like the old select-all: the next letter starts again
}

playBtn.addEventListener('click', () => play(1));
slowBtn.addEventListener('click', () => play(0.72));
hintBtn.addEventListener('click', () => {
  if (done || hinted) return;
  hinted = true;
  hintBtn.disabled = true;
  run.miss();   // a hint ends the combo: the item can still earn +0.5, never a first try
  if (!missedItems.includes(order[idx])) missedItems.push(order[idx]);
  hintEl.textContent = hintFor(order[idx].en);
});
nextBtn.addEventListener('click', advance);

function showResults() {
  const runSum = run.summary();
  const pct = Math.round((score / 15) * 100);
  voiceGate.stop();
  hideKeys();
  U.emitGameEnd({
    points: runSum.points, maxCombo: runSum.maxCombo, crown: runSum.fullCombo,
    saveId: SAVE_ID, score: pct, completed: pct >= 40,
  });
  if (score === 15) U.confetti(cardEl, 70);
  U.showScorecard({
    run: runSum,
    gameId: SAVE_ID,
    title: 'Echo',
    correct: score,
    total: 15,
    pct,
    replayId: 'ec-replay',
    backId: 'ec-back',
    stats: [
      { label: 'First-try spelled / せいかい', value: `${runSum.firstTry} / 15` },
      { label: 'Fixed / なおした', value: String(runSum.recovered) },
      { label: 'Review items / ふくしゅう', value: String(missedItems.length) },
    ],
    reviewItems: missedItems,
    audioBase: CFG.audioBase,
  });
}

$('ec-replay').addEventListener('click', () => {
  order = U.shuffle(CFG.cards.slice(0, 15));
  idx = 0; score = 0; missedItems = []; dotState.length = 0;
  scoreEl.textContent = '0';
  run.reset();
  showCard();
});
$('ec-back').addEventListener('click', () => {
  voiceGate.stop();
  hideKeys();
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

showCard();
})();
