
/* ══════════════════════════════════════════════════════════════
   vocab-tap.js  —  Vocabulary Tap Match
   Show EN word, tap matching JP. 3 rounds × 5 cards.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Vocabulary Tap');
U.unlockAudio();

const sfxBase = CFG.sfxBase;
await Promise.all([
  U.loadSFX('ding', sfxBase + 'ding.mp3'),
  U.loadSFX('fart', sfxBase + 'fart.mp3'),
]);

/* ── Build UI ── */
U.mount(`
  <div style="max-width:680px;margin:0 auto;padding:0 1rem 3rem;">
    <div id="vt-hud" class="game-hud">
      <div class="hud-pill">Round <b id="vt-round">1</b>/3</div>
      <div class="hud-pill">Score <b id="vt-score">0</b>/15</div>
    </div>
    <div id="vt-prompt" style="text-align:center;margin:1.2rem 0 0.8rem;">
      <div id="vt-en" style="font-family:var(--game-font-title);font-size:clamp(28px,8vw,52px);color:var(--game-primary);text-shadow:0 0 20px var(--game-primary);"></div>
      <div id="vt-en-hira" style="font-family:var(--game-font-jp);font-size:clamp(14px,3vw,20px);color:var(--game-muted);margin-top:4px;"></div>
    </div>
    <div id="vt-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:1rem;"></div>
    <div id="vt-results" class="results-panel">
      <div class="results-msg" id="vt-rmsg"></div>
      <div class="results-score" id="vt-rscore"></div>
      <div class="results-actions">
        <button class="game-btn game-btn-primary" id="vt-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="vt-back">メニューへ</button>
      </div>
    </div>
  </div>
`);

const roundEl = document.getElementById('vt-round');
const scoreEl = document.getElementById('vt-score');
const enEl    = document.getElementById('vt-en');
const hiraEl  = document.getElementById('vt-en-hira');
const grid    = document.getElementById('vt-grid');
const results = document.getElementById('vt-results');
const rMsg    = document.getElementById('vt-rmsg');
const rScore  = document.getElementById('vt-rscore');

/* ── State ── */
const cards   = U.shuffle(CFG.cards.slice(0, 15));
let score     = 0;
let roundIdx  = 0;     // 0,1,2  (3 rounds of 5)
let cardIdx   = 0;     // index within current round's 5
let locked    = false;
let roundCards = [];
let currentCard = null;
let firstTry  = true;

function getPromptCards(roundI) {
  return cards.slice(roundI * 5, roundI * 5 + 5);
}

function startRound(ri) {
  roundIdx  = ri;
  cardIdx   = 0;
  roundCards = getPromptCards(ri);
  roundEl.textContent = ri + 1;
  nextCard();
}

function nextCard() {
  if (cardIdx >= roundCards.length) {
    if (roundIdx < 2) {
      setTimeout(() => startRound(roundIdx + 1), 400);
    } else {
      showResults();
    }
    return;
  }
  firstTry = true;
  currentCard = roundCards[cardIdx];
  enEl.textContent  = currentCard.en;
  hiraEl.textContent = currentCard.hira || '';
  renderChoices();
}

function renderChoices() {
  grid.innerHTML = '';
  locked = false;

  // Pool: current round cards shuffled
  const pool = U.shuffle(roundCards.slice());

  // Ensure correct answer is in pool
  const hasCorrect = pool.some(c => c.id === currentCard.id);
  if (!hasCorrect) pool[0] = currentCard;

  // Pick 4: correct + 3 distractors from pool
  const correctItem = pool.find(c => c.id === currentCard.id);
  const others = U.shuffle(pool.filter(c => c.id !== currentCard.id)).slice(0, 3);
  const choices = U.shuffle([correctItem, ...others]);

  choices.forEach(card => {
    const btn = document.createElement('div');
    btn.className = 'choice-tile';
    btn.innerHTML = `
      <div class="tile-en" style="font-family:var(--game-font-jp);font-size:clamp(16px,3vw,22px);">${card.jp}</div>
      <div class="tile-jp" style="font-size:clamp(11px,2vw,14px);margin-top:3px;">${card.hira || ''}</div>
    `;
    btn.addEventListener('click', () => onPick(btn, card));
    grid.appendChild(btn);
  });
}

function onPick(btn, card) {
  if (locked) return;
  locked = true;
  const correct = card.id === currentCard.id;

  if (correct) {
    btn.classList.add('correct');
    U.showBurst('ok');
    U.playSFX('ding');
    U.confetti(btn);
    if (firstTry) score++;
    scoreEl.textContent = score;
    setTimeout(() => {
      btn.classList.remove('correct');
      cardIdx++;
      nextCard();
    }, 500);
  } else {
    btn.classList.add('wrong');
    firstTry = false;
    U.playSFX('fart');
    setTimeout(() => {
      btn.classList.remove('wrong');
      locked = false;
    }, 500);
  }
}

function showResults() {
  grid.style.display = 'none';
  document.getElementById('vt-prompt').style.display = 'none';
  document.getElementById('vt-hud').style.display = 'none';
  results.classList.add('show');
  const msg = U.getResultMsg(score);
  rMsg.textContent   = msg.jp;
  rScore.textContent = `${score} / 15`;
  if (score === 15) U.confetti(results, 120);
  // Play result sound
  const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

document.getElementById('vt-replay').addEventListener('click', () => {
  results.classList.remove('show');
  grid.style.display = '';
  document.getElementById('vt-prompt').style.display = '';
  document.getElementById('vt-hud').style.display = '';
  score = 0;
  scoreEl.textContent = 0;
  startRound(0);
});
document.getElementById('vt-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

startRound(0);

})();
