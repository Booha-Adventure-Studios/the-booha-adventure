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
.ec-input{flex:1;min-width:0;font:800 18px var(--game-font-body);padding:14px 16px;border-radius:16px;border:2px solid var(--game-border);
  background:var(--game-answer-bg);color:var(--game-answer-text);outline:none}
.ec-input:focus{border-color:var(--game-primary)}
.ec-input.ok{border-color:#22c55e}.ec-input.bad{border-color:#ef4444}
.ec-check{min-width:96px;min-height:54px;border:none;border-radius:16px;cursor:pointer;font:900 17px var(--game-font-body);color:#0b0614;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));box-shadow:0 4px 0 rgba(0,0,0,.25)}
.ec-check:disabled{opacity:.45;cursor:default}
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
    <form class="ec-row" id="ec-form" autocomplete="off">
      <label for="ec-input" class="ec-visually-hidden" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Type what you hear</label>
      <input class="ec-input" id="ec-input" type="text" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false"
        enterkeyhint="done" placeholder="type here · かこう">
      <button type="submit" class="ec-check" id="ec-check">Check</button>
    </form>
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
const playBtn = $('ec-play'), slowBtn = $('ec-slow'), jpEl = $('ec-jp'), hintEl = $('ec-hint'), form = $('ec-form');
const input = $('ec-input'), checkBtn = $('ec-check'), fb = $('ec-feedback'), hintBtn = $('ec-hintbtn'), nextBtn = $('ec-next');
const cardEl = $('ec-card'), numEl = $('ec-num'), scoreEl = $('ec-score'), dotsEl = $('ec-dots');

let order = U.shuffle(CFG.cards.slice(0, 15));
let idx = 0, score = 0, tries = 0, hinted = false, heard = false, done = false;
let missedItems = [];
const dotState = [];

function renderDots() {
  dotsEl.innerHTML = '';
  for (let i = 0; i < 15; i++) {
    const d = document.createElement('span');
    const st = dotState[i];
    d.className = 'ec-dot' + (st === 'ok' ? ' done' : st === 'half' ? ' half' : st === 'miss' ? ' miss' : i === idx ? ' now' : '');
    dotsEl.appendChild(d);
  }
}

function play(rate) {
  const card = order[idx];
  if (!card || !card.mp3) return;
  U.unlockAudio();
  const a = new Audio(CFG.audioBase + card.mp3);
  a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', '');
  try { a.playbackRate = rate || 1; a.preservesPitch = true; a.webkitPreservesPitch = true; } catch (_) {}
  playBtn.classList.add('playing');
  const end = () => {
    playBtn.classList.remove('playing');
    if (!heard) { heard = true; run.audioDone(); }
    if (!done) { try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); } }
  };
  if (!voiceGate.play(a, { replace: true, ignoreCooldown: true, onEnd: end })) end();
}

function showCard() {
  const card = order[idx];
  tries = 0; hinted = false; heard = false; done = false;
  numEl.textContent = idx + 1;
  renderDots();
  jpEl.textContent = card.jp || '';
  hintEl.textContent = '';
  input.value = '';
  input.className = 'ec-input';
  input.disabled = false;
  checkBtn.disabled = false;
  hintBtn.disabled = false;
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
  input.disabled = true; checkBtn.disabled = true; hintBtn.disabled = true;
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
  if (result === 'miss') { nextBtn.hidden = false; try { nextBtn.focus({ preventScroll: true }); } catch (_) {} }
  else setTimeout(advance, 900);
}

function advance() {
  idx++;
  if (idx >= order.length) showResults();
  else showCard();
}

form.addEventListener('submit', e => {
  e.preventDefault();
  if (done) return;
  const card = order[idx];
  const typed = input.value;
  if (!normalize(typed)) { input.focus(); return; }
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
  try { input.select(); } catch (_) {}
});

playBtn.addEventListener('click', () => play(1));
slowBtn.addEventListener('click', () => play(0.72));
hintBtn.addEventListener('click', () => {
  if (done || hinted) return;
  hinted = true;
  hintBtn.disabled = true;
  run.miss();   // a hint ends the combo: the item can still earn +0.5, never a first try
  if (!missedItems.includes(order[idx])) missedItems.push(order[idx]);
  hintEl.textContent = hintFor(order[idx].en);
  try { input.focus({ preventScroll: true }); } catch (_) {}
});
nextBtn.addEventListener('click', advance);

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
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

showCard();
})();
