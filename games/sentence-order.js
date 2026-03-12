
/* ══════════════════════════════════════════════════════════════
   sentence-order.js  —  Sentence Order
   Show JP sentence + scrambled EN word tiles. Tap to build the sentence.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Sentence Order');
U.unlockAudio();

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

U.mount(`
  <div style="max-width:680px;margin:0 auto;padding:0 1rem 3rem;">

    <div class="game-hud">
      <div class="hud-pill">Sentence <b id="so-num">1</b>/15</div>
      <div class="hud-pill">Score <b id="so-score">0</b>/15</div>
    </div>

    <!-- JP prompt -->
    <div class="game-card" style="text-align:center;padding:1.2rem 1rem;margin:1rem 0;">
      <div id="so-jp"   style="font-family:var(--game-font-jp);font-weight:900;font-size:clamp(17px,4vw,24px);line-height:1.45;"></div>
      <div id="so-hira" style="font-family:var(--game-font-jp);font-size:clamp(12px,2.6vw,17px);color:var(--game-muted);margin-top:6px;"></div>
    </div>

    <!-- Answer zone (tapped words appear here) -->
    <div style="margin-bottom:0.5rem;font-size:0.8rem;color:var(--game-muted);text-align:center;">Tap words to build your answer →</div>
    <div id="so-answer" style="
      min-height:60px;
      display:flex;flex-wrap:wrap;gap:8px;
      padding:10px 12px;
      border-radius:16px;
      background:rgba(255,255,255,0.06);
      border:2px dashed rgba(255,255,255,0.2);
      margin-bottom:1rem;
      align-content:flex-start;
    "></div>

    <!-- Scrambled word tiles -->
    <div id="so-tiles" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:1rem;"></div>

    <!-- Controls -->
    <div style="display:flex;gap:10px;justify-content:center;">
      <button class="game-btn game-btn-secondary" id="so-clear">Clear</button>
      <button class="game-btn game-btn-primary"   id="so-check">Check ✓</button>
    </div>

    <div id="so-feedback" style="text-align:center;margin-top:0.8rem;min-height:1.6rem;font-weight:900;font-size:1rem;"></div>

    <div id="so-results" class="results-panel">
      <div class="results-msg"   id="so-rmsg"></div>
      <div class="results-score" id="so-rscore"></div>
      <div class="results-actions">
        <button class="game-btn game-btn-primary"   id="so-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="so-back">メニューへ</button>
      </div>
    </div>
  </div>
`);

const numEl      = document.getElementById('so-num');
const scoreEl    = document.getElementById('so-score');
const jpEl       = document.getElementById('so-jp');
const hiraEl     = document.getElementById('so-hira');
const answerEl   = document.getElementById('so-answer');
const tilesEl    = document.getElementById('so-tiles');
const feedbackEl = document.getElementById('so-feedback');
const results    = document.getElementById('so-results');

const order  = U.shuffle(CFG.cards.slice(0, 15));
let idx      = 0;
let score    = 0;
let placed   = [];   // words tapped into answer
let firstTry = true;
let locked   = false;

function showCard() {
  locked   = false;
  firstTry = true;
  placed   = [];
  feedbackEl.textContent = '';
  feedbackEl.style.color = '#fff';

  const card = order[idx];
  numEl.textContent   = idx + 1;
  jpEl.textContent    = card.jp;
  hiraEl.textContent  = card.hira ? `（${card.hira}）` : '';

  // Split sentence into words, shuffle
  const words = card.en.split(/\s+/);
  const shuffled = U.shuffle(words.slice());

  tilesEl.innerHTML  = '';
  answerEl.innerHTML = '';

  shuffled.forEach((word, wi) => {
    const tile = document.createElement('div');
    tile.className = 'letter-tile';
    tile.textContent = word;
    tile.dataset.wi = wi;
    tile.dataset.word = word;
    tile.addEventListener('click', () => placeTile(tile, word, wi));
    tilesEl.appendChild(tile);
  });
}

function renderAnswer() {
  answerEl.innerHTML = '';
  placed.forEach((item, pi) => {
    const tag = document.createElement('div');
    tag.className = 'letter-tile placed';
    tag.style.cursor = 'pointer';
    tag.textContent = item.word;
    tag.addEventListener('click', () => removeFromAnswer(pi, item.wi));
    answerEl.appendChild(tag);
  });
}

function placeTile(tileEl, word, wi) {
  if (locked || tileEl.classList.contains('used')) return;
  tileEl.classList.add('used');
  placed.push({ word, wi, tileEl });
  renderAnswer();
}

function removeFromAnswer(pi, wi) {
  if (locked) return;
  const item = placed[pi];
  if (!item) return;
  item.tileEl.classList.remove('used');
  placed.splice(pi, 1);
  renderAnswer();
}

document.getElementById('so-clear').addEventListener('click', () => {
  if (locked) return;
  placed.forEach(p => p.tileEl.classList.remove('used'));
  placed = [];
  renderAnswer();
});

document.getElementById('so-check').addEventListener('click', () => {
  if (locked) return;
  const card = order[idx];
  const target = card.en.trim();
  const answer = placed.map(p => p.word).join(' ').trim();

  if (!answer) {
    feedbackEl.textContent = 'Tap some words first!';
    feedbackEl.style.color = '#ffaa00';
    return;
  }

  const correct = answer.toLowerCase() === target.toLowerCase();

  if (correct) {
    locked = true;
    feedbackEl.textContent = '✓ ' + target;
    feedbackEl.style.color = '#22c55e';
    // Flash answer tiles green
    answerEl.querySelectorAll('.letter-tile').forEach(t => {
      t.style.background = '#22c55e';
      t.style.color = '#052b11';
      t.style.borderColor = '#22c55e';
    });
    U.showBurst('ok');
    U.playSFX('ding');
    U.confetti(answerEl);
    if (firstTry) { score++; scoreEl.textContent = score; }
    if (card.mp3) U.playSage(CFG.audioBase + card.mp3, 700);
    setTimeout(() => { idx++; if (idx >= order.length) showResults(); else showCard(); }, 1600);
  } else {
    firstTry = false;
    answerEl.querySelectorAll('.letter-tile').forEach(t => {
      t.style.animation = 'tileWrong 0.45s ease';
    });
    feedbackEl.textContent = 'Not quite — try again!';
    feedbackEl.style.color = '#ef4444';
    U.playSFX('fart');
    setTimeout(() => {
      placed.forEach(p => p.tileEl.classList.remove('used'));
      placed = [];
      renderAnswer();
      feedbackEl.textContent = '';
    }, 700);
  }
});

function showResults() {
  results.classList.add('show');
  const msg = U.getResultMsg(score);
  document.getElementById('so-rmsg').textContent   = msg.jp;
  document.getElementById('so-rscore').textContent = `${score} / 15`;
  if (score === 15) U.confetti(results, 120);
  const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
  snd.setAttribute('playsinline', ''); snd.play().catch(() => {});
}

document.getElementById('so-replay').addEventListener('click', () => {
  results.classList.remove('show');
  idx = 0; score = 0; scoreEl.textContent = 0;
  U.shuffle(order);
  showCard();
});
document.getElementById('so-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

showCard();

})();
