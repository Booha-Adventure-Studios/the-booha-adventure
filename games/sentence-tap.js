
/* ══════════════════════════════════════════════════════════════
   sentence-tap.js  —  Sentences Tap Match
   Show JP sentence, tap matching English sentence. 3 rounds × 5.
   Same mechanic as vocab-tap but with sentences.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Sentences Tap');
U.unlockAudio();

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

U.mount(`
  <div style="max-width:700px;margin:0 auto;padding:0 1rem 3rem;">

    <div class="game-hud">
      <div class="hud-pill">Round <b id="st-round">1</b>/3</div>
      <div class="hud-pill">Score <b id="st-score">0</b>/15</div>
    </div>

    <!-- JP prompt -->
    <div class="game-card" style="text-align:center;padding:1.4rem 1rem;margin:1rem 0;">
      <div id="st-jp"   style="font-family:var(--game-font-jp);font-weight:900;font-size:clamp(18px,4vw,26px);line-height:1.4;"></div>
      <div id="st-hira" style="font-family:var(--game-font-jp);font-size:clamp(13px,2.8vw,18px);color:var(--game-muted);margin-top:6px;"></div>
    </div>

    <!-- EN choices (stacked - sentences can be long) -->
    <div id="st-grid" style="display:flex;flex-direction:column;gap:10px;"></div>

    <div id="st-results" class="results-panel">
      <div class="results-msg"   id="st-rmsg"></div>
      <div class="results-score" id="st-rscore"></div>
      <div class="results-actions">
        <button class="game-btn game-btn-primary"   id="st-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="st-back">メニューへ</button>
      </div>
    </div>
  </div>
`);

const roundEl = document.getElementById('st-round');
const scoreEl = document.getElementById('st-score');
const jpEl    = document.getElementById('st-jp');
const hiraEl  = document.getElementById('st-hira');
const grid    = document.getElementById('st-grid');
const results = document.getElementById('st-results');

const cards = U.shuffle(CFG.cards.slice(0, 15));
let score     = 0;
let roundIdx  = 0;
let cardIdx   = 0;
let locked    = false;
let firstTry  = true;
let roundCards = [];
let currentCard = null;

function startRound(ri) {
  roundIdx   = ri;
  cardIdx    = 0;
  roundCards = cards.slice(ri * 5, ri * 5 + 5);
  roundEl.textContent = ri + 1;
  nextCard();
}

function nextCard() {
  if (cardIdx >= roundCards.length) {
    if (roundIdx < 2) setTimeout(() => startRound(roundIdx + 1), 400);
    else showResults();
    return;
  }
  firstTry    = true;
  currentCard = roundCards[cardIdx];
  jpEl.textContent   = currentCard.jp;
  hiraEl.textContent = currentCard.hira || '';
  renderChoices();
}

function renderChoices() {
  grid.innerHTML = '';
  locked = false;

  const pool = U.shuffle(roundCards.slice());
  const hasCorrect = pool.some(c => c.id === currentCard.id);
  if (!hasCorrect) pool[0] = currentCard;

  const correct = pool.find(c => c.id === currentCard.id);
  const others  = U.shuffle(pool.filter(c => c.id !== currentCard.id)).slice(0, 3);
  const choices = U.shuffle([correct, ...others]);

  choices.forEach(card => {
    const btn = document.createElement('div');
    btn.className = 'choice-tile';
    btn.style.padding = '14px 16px';
    btn.innerHTML = `<div class="tile-en" style="font-size:clamp(14px,2.8vw,18px);line-height:1.35;">${card.en}</div>`;
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
    setTimeout(() => { btn.classList.remove('correct'); cardIdx++; nextCard(); }, 550);
  } else {
    btn.classList.add('wrong');
    firstTry = false;
    U.playSFX('fart');
    setTimeout(() => { btn.classList.remove('wrong'); locked = false; }, 500);
  }
}

function showResults() {
  grid.style.display = 'none';
  results.classList.add('show');
  const msg = U.getResultMsg(score);
  document.getElementById('st-rmsg').textContent   = msg.jp;
  document.getElementById('st-rscore').textContent = `${score} / 15`;
  if (score === 15) U.confetti(results, 120);
  const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
  snd.setAttribute('playsinline', ''); snd.play().catch(() => {});
}

document.getElementById('st-replay').addEventListener('click', () => {
  results.classList.remove('show');
  grid.style.display = '';
  score = 0; scoreEl.textContent = 0;
  startRound(0);
});
document.getElementById('st-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

startRound(0);

})();
