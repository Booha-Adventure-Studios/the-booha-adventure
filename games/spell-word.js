
/* ══════════════════════════════════════════════════════════════
   spell-word.js  —  Spell the Word
   Show JP, arrange letter tiles to spell the English word.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Spell the Word');
U.unlockAudio();

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

U.mount(`
  <div style="max-width:600px;margin:0 auto;padding:0 1rem 3rem;">
    <div class="game-hud">
      <div class="hud-pill">Word <b id="sw-num">1</b>/15</div>
      <div class="hud-pill">Score <b id="sw-score">0</b>/15</div>
    </div>

    <div class="stripe-bar" style="margin:1rem auto;">
      <div class="stripe-inner"></div>
      <div class="stripe-label">
        <span id="sw-jp"  class="stripe-jp"></span>
        <span id="sw-hira" class="stripe-hira"></span>
      </div>
    </div>

    <!-- Answer slots -->
    <div id="sw-slots" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:1.2rem 0 0.5rem;min-height:60px;"></div>

    <!-- Letter tiles -->
    <div id="sw-tiles" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:0.8rem 0 1rem;"></div>

    <!-- Check + clear -->
    <div style="display:flex;gap:10px;justify-content:center;margin-top:0.5rem;">
      <button class="game-btn game-btn-secondary" id="sw-clear">Clear</button>
      <button class="game-btn game-btn-primary"   id="sw-check">Check ✓</button>
    </div>

    <div id="sw-feedback" style="text-align:center;min-height:2rem;margin-top:0.8rem;font-size:1.1rem;font-weight:900;"></div>

    <div id="sw-results" class="results-panel">
      <div class="results-msg"   id="sw-rmsg"></div>
      <div class="results-score" id="sw-rscore"></div>
      <div class="results-actions">
        <button class="game-btn game-btn-primary"   id="sw-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="sw-back">メニューへ</button>
      </div>
    </div>
  </div>
`);

/* DOM refs */
const numEl      = document.getElementById('sw-num');
const scoreEl    = document.getElementById('sw-score');
const jpEl       = document.getElementById('sw-jp');
const hiraEl     = document.getElementById('sw-hira');
const slotsEl    = document.getElementById('sw-slots');
const tilesEl    = document.getElementById('sw-tiles');
const feedbackEl = document.getElementById('sw-feedback');
const results    = document.getElementById('sw-results');

/* State */
const order  = U.shuffle(CFG.cards.slice(0, 15));
let idx      = 0;
let score    = 0;
let placed   = [];   // array of { letter, tileEl }
let firstTry = true;
let locked   = false;

function showCard() {
  locked   = false;
  firstTry = true;
  placed   = [];
  feedbackEl.textContent = '';
  feedbackEl.style.color = '#fff';

  const card = order[idx];
  numEl.textContent  = idx + 1;
  jpEl.textContent   = card.jp;
  hiraEl.textContent = card.hira ? `（${card.hira}）` : '';

  // Build shuffled letter tiles
  const letters = U.shuffle(card.en.toLowerCase().split(''));
  tilesEl.innerHTML = '';
  slotsEl.innerHTML = '';

  // Create slots
  for (let i = 0; i < card.en.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.idx = i;
    slot.addEventListener('click', () => removeSlot(i));
    slotsEl.appendChild(slot);
  }

  // Create tiles
  letters.forEach((letter, ti) => {
    const tile = document.createElement('div');
    tile.className = 'letter-tile';
    tile.textContent = letter;
    tile.dataset.ti  = ti;
    tile.addEventListener('click', () => placeTile(tile, letter));
    tilesEl.appendChild(tile);
  });
}

function updateSlots() {
  const slots = slotsEl.querySelectorAll('.slot');
  slots.forEach((slot, i) => {
    if (placed[i]) {
      slot.textContent = placed[i].letter;
      slot.classList.add('filled');
    } else {
      slot.textContent = '';
      slot.classList.remove('filled', 'correct', 'wrong');
    }
  });
}

function placeTile(tileEl, letter) {
  if (locked) return;
  if (tileEl.classList.contains('used')) return;

  // Find first empty slot
  const card = order[idx];
  const slotCount = card.en.length;
  let emptyIdx = -1;
  for (let i = 0; i < slotCount; i++) {
    if (!placed[i]) { emptyIdx = i; break; }
  }
  if (emptyIdx === -1) return;

  tileEl.classList.add('used');
  placed[emptyIdx] = { letter, tileEl };
  updateSlots();
}

function removeSlot(i) {
  if (locked || !placed[i]) return;
  placed[i].tileEl.classList.remove('used');
  placed[i] = null;
  updateSlots();
}

document.getElementById('sw-clear').addEventListener('click', () => {
  if (locked) return;
  placed = [];
  tilesEl.querySelectorAll('.letter-tile').forEach(t => t.classList.remove('used'));
  updateSlots();
});

document.getElementById('sw-check').addEventListener('click', () => {
  if (locked) return;
  const card = order[idx];
  const answer = placed.map(p => p ? p.letter : '').join('');
  if (answer.length < card.en.length) {
    feedbackEl.textContent = 'Fill all the letters first!';
    feedbackEl.style.color = '#ffaa00';
    return;
  }

  const correct = answer.toLowerCase() === card.en.toLowerCase();
  const slots = slotsEl.querySelectorAll('.slot');

  if (correct) {
    locked = true;
    slots.forEach(s => s.classList.add('correct'));
    feedbackEl.textContent = '✓ ' + card.en + '!';
    feedbackEl.style.color = '#22c55e';
    U.showBurst('ok');
    U.playSFX('ding');
    U.confetti(slotsEl);
    if (firstTry) score++;
    scoreEl.textContent = score;

    // Play sage audio
    const sageUrl = CFG.audioBase + (card.mp3 || '');
    if (card.mp3) U.playSage(sageUrl, 600);

    setTimeout(() => {
      idx++;
      if (idx >= order.length) { showResults(); return; }
      showCard();
    }, 1600);
  } else {
    firstTry = false;
    slots.forEach(s => s.classList.add('wrong'));
    feedbackEl.textContent = 'Not quite — try again!';
    feedbackEl.style.color = '#ef4444';
    U.playSFX('fart');
    setTimeout(() => {
      slots.forEach(s => s.classList.remove('wrong'));
      feedbackEl.textContent = '';
      // Clear slots, return tiles
      placed = [];
      tilesEl.querySelectorAll('.letter-tile').forEach(t => t.classList.remove('used'));
      updateSlots();
    }, 600);
  }
});

function showResults() {
  document.getElementById('game-mount').querySelector(':first-child').style.display = 'none';
  results.classList.add('show');
  results.style.display = 'block';
  const msg = U.getResultMsg(score);
  document.getElementById('sw-rmsg').textContent   = msg.jp;
  document.getElementById('sw-rscore').textContent = `${score} / 15`;
  if (score === 15) U.confetti(results, 120);
  const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
  snd.setAttribute('playsinline', ''); snd.play().catch(() => {});
}

document.getElementById('sw-replay').addEventListener('click', () => {
  results.classList.remove('show');
  document.getElementById('game-mount').querySelector(':first-child').style.display = '';
  idx = 0; score = 0;
  scoreEl.textContent = 0;
  U.shuffle(order);
  showCard();
});
document.getElementById('sw-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

showCard();

})();
