
/* ══════════════════════════════════════════════════════════════
   vocab-tap.js  —  Vocabulary Tap Match
   Pair all 5 EN→JP, then press Check.
   3 rounds × 5 cards = 15 points max.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Vocabulary Tap');
U.unlockAudio();

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

/* ── Audio: one active word audio at a time, debounced ── */
let wordAudio = null;
let audioLocked = false;

function playWordAudio(mp3Filename) {
  if (audioLocked) return;
  if (!mp3Filename) return;
  audioLocked = true;
  if (wordAudio) { wordAudio.pause(); wordAudio.currentTime = 0; }
  wordAudio = new Audio(CFG.audioBase + mp3Filename);
  wordAudio.setAttribute('playsinline', '');
  wordAudio.play().catch(() => {});
  wordAudio.addEventListener('ended', () => { audioLocked = false; });
  wordAudio.addEventListener('error', () => { audioLocked = false; });
  setTimeout(() => { audioLocked = false; }, 2000); // hard reset fallback
}

/* ── Result messages ── */
const RESULT_MSGS = [
  // 0–5
  {
    en: "Rough start, you've got this!",
    jp: "まだまだ！がんばろう！",
    kanji: "頑張れ！次はもっとできる！"
  },
  // 6–10
  {
    en: "Not bad! Keep pushing!",
    jp: "いい感じ！もっとできるよ！",
    kanji: "良い調子！もう一歩！"
  },
  // 11–14
  {
    en: "So close! Almost perfect!",
    jp: "もう少し！ほぼ完璧！",
    kanji: "惜しい！ほぼ満点！"
  },
  // 15
  {
    en: "PERFECT! You crushed it!",
    jp: "パーフェクト！すごい！",
    kanji: "完璧！全問正解！"
  }
];

function getMsg(score) {
  if (score === 15)        return RESULT_MSGS[3];
  if (score >= 11)         return RESULT_MSGS[2];
  if (score >= 6)          return RESULT_MSGS[1];
  return RESULT_MSGS[0];
}

function resultSound(score) {
  if (score === 15)   return CFG.sfxBase + 'result_15.mp3';
  if (score >= 11)    return CFG.sfxBase + 'result_11-14.mp3';
  if (score >= 6)     return CFG.sfxBase + 'result_6-10.mp3';
  return CFG.sfxBase + 'result_0-5.mp3';
}

/* ── Build UI ── */
U.mount(`
<div class="game-wrap">

  <div class="game-hud" id="vt-hud">
    <div class="hud-pill">Round <b id="vt-round">1</b> / 3</div>
    <div class="hud-pill">Score <b id="vt-score">0</b> / 15</div>
  </div>

  <div class="game-prompt" id="vt-prompt">
    <div class="game-prompt-main">Vocabulary Tap</div>
    <div class="game-prompt-sub">英語をタップしてから日本語をタップ</div>
  </div>

  <div class="game-grid-2" id="vt-game">

    <!-- EN bank -->
    <div class="game-board">
      <div class="game-board-title">English</div>
      <div id="vt-en-bank" class="game-stack"></div>
    </div>

    <!-- JP slots -->
    <div class="game-board">
      <div class="game-board-title">日本語</div>
      <div id="vt-jp-slots" class="game-stack"></div>
    </div>

  </div>

  <div class="check-btn-wrap" id="vt-check-wrap">
    <button class="game-btn-check" id="vt-check" disabled>Check ✓</button>
  </div>

  <!-- Results -->
  <div id="vt-results" class="results-panel">
    <div class="results-score" id="vt-rscore"></div>
    <div class="results-pct"   id="vt-rpct"></div>
    <div class="results-msg"   id="vt-rmsg-title"></div>
    <div class="results-msg-en"    id="vt-rmsg-en"></div>
    <div class="results-msg-jp"    id="vt-rmsg-jp"></div>
    <div class="results-msg-kanji" id="vt-rmsg-kanji"></div>
    <div class="results-actions" style="margin-top:1.5rem;">
      <button class="game-btn game-btn-primary"   id="vt-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="vt-back">メニューへ</button>
    </div>
  </div>

</div>
`);

/* ── Refs ── */
const roundEl   = document.getElementById('vt-round');
const scoreEl   = document.getElementById('vt-score');
const enBank    = document.getElementById('vt-en-bank');
const jpSlots   = document.getElementById('vt-jp-slots');
const checkBtn  = document.getElementById('vt-check');
const gameEl    = document.getElementById('vt-game');
const checkWrap = document.getElementById('vt-check-wrap');
const promptEl  = document.getElementById('vt-prompt');
const hudEl     = document.getElementById('vt-hud');
const results   = document.getElementById('vt-results');

/* ── State ── */
const allCards   = U.shuffle(CFG.cards.slice(0, 15));
let score        = 0;
let roundIdx     = 0;
let roundCards   = [];
let selectedEnKey = null;   // _key of tapped EN tile
let pairs         = {};     // { jpKey: enKey }
let checkLocked   = false;  // prevent double-tap on Check
let globalLocked  = false;  // during result animation

function cardKey(card, i) {
  return String(card.id ?? card.mp3 ?? `${card.en}__${i}`);
}

/* ── Round lifecycle ── */
function startRound(ri) {
  roundIdx    = ri;
  roundCards  = allCards.slice(ri * 5, ri * 5 + 5).map((c, i) => ({
    ...c, _key: cardKey(c, ri * 5 + i)
  }));
  selectedEnKey = null;
  pairs         = {};
  checkLocked   = false;
  roundEl.textContent = String(ri + 1);
  checkBtn.disabled   = true;
  render();
}

/* ── Render ── */
function render() {
  renderEnBank();
  renderJpSlots();
  checkBtn.disabled = (Object.keys(pairs).length < roundCards.length) || checkLocked;
}

function renderEnBank() {
  enBank.innerHTML = '';
  /* show only unpaired EN cards */
  const paired = new Set(Object.values(pairs));
  roundCards.forEach(card => {
    if (paired.has(card._key)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'match-tile' + (selectedEnKey === card._key ? ' selected' : '');
    btn.textContent = card.en;
    btn.addEventListener('click', () => {
      if (globalLocked) return;
      playWordAudio(card.mp3);
      selectedEnKey = (selectedEnKey === card._key) ? null : card._key;
      render();
    });
    enBank.appendChild(btn);
  });
}

function renderJpSlots() {
  jpSlots.innerHTML = '';
  /* JP slots stay in fixed shuffled order per round */
  const jpOrder = roundCards; // already shuffled in startRound

  jpOrder.forEach(card => {
    const pairedEnKey = Object.entries(pairs).find(([jk]) => jk === card._key)?.[1] ?? null;
    const pairedCard  = pairedEnKey ? roundCards.find(c => c._key === pairedEnKey) : null;

    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'match-slot' + (pairedCard ? ' has-pair' : '');
    slot.innerHTML = `
      <div class="slot-jp-text">${card.jp}</div>
      <div class="slot-hira-text">${card.hira || ''}</div>
      ${pairedCard ? `<div class="slot-pair-label">${pairedCard.en}</div>` : ''}
    `;

    slot.addEventListener('click', () => {
      if (globalLocked) return;
      if (!selectedEnKey && !pairedCard) return; // nothing to do
      if (!selectedEnKey && pairedCard) {
        // un-pair this slot
        const jk = card._key;
        delete pairs[jk];
        render();
        return;
      }
      if (selectedEnKey) {
        // assign selected EN → this JP slot (overwrite if slot already had one)
        // first, remove selectedEnKey from any other slot it may occupy
        for (const [jk, ek] of Object.entries(pairs)) {
          if (ek === selectedEnKey) { delete pairs[jk]; break; }
        }
        pairs[card._key] = selectedEnKey;
        selectedEnKey = null;
        render();
      }
    });

    jpSlots.appendChild(slot);
  });
}

/* ── Check ── */
checkBtn.addEventListener('click', () => {
  if (checkBtn.disabled || checkLocked || globalLocked) return;
  checkLocked  = true;
  globalLocked = true;

  let roundScore = 0;
  const slotEls  = jpSlots.querySelectorAll('.match-slot');

  slotEls.forEach((slotEl, i) => {
    const jpCard  = roundCards[i];
    const enKey   = pairs[jpCard._key];
    const enCard  = roundCards.find(c => c._key === enKey);
    const correct = enCard && enCard._key === jpCard._key;

    slotEl.classList.add(correct ? 'slot-correct' : 'slot-wrong');
    if (correct) roundScore++;
  });

  score += roundScore;
  scoreEl.textContent = String(score);

  /* SFX */
  if (roundScore === roundCards.length) {
    U.playSFX('ding');
    U.confetti(gameEl, 60);
  } else if (roundScore === 0) {
    U.playSFX('fart');
  } else {
    U.playSFX('ding');
  }

  /* advance after brief delay */
  setTimeout(() => {
    globalLocked = false;
    if (roundIdx < 2) {
      startRound(roundIdx + 1);
    } else {
      showResults();
    }
  }, 1100);
});

/* ── Results ── */
function showResults() {
  gameEl.style.display    = 'none';
  checkWrap.style.display = 'none';
  promptEl.style.display  = 'none';
  hudEl.style.display     = 'none';
  results.classList.add('show');

  const msg = getMsg(score);
  const pct = Math.round((score / 15) * 100);

  document.getElementById('vt-rscore').textContent     = `${score} / 15`;
  document.getElementById('vt-rpct').textContent       = `${pct}%`;
  document.getElementById('vt-rmsg-title').textContent = score === 15 ? 'PERFECT!' : score >= 11 ? 'Great job!' : score >= 6 ? 'Keep it up!' : 'Try again!';
  document.getElementById('vt-rmsg-en').textContent    = msg.en;
  document.getElementById('vt-rmsg-jp').textContent    = msg.jp;
  document.getElementById('vt-rmsg-kanji').textContent = msg.kanji;

  if (score === 15) U.confetti(results, 130);

  const snd = new Audio(resultSound(score));
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

/* ── Replay / Back ── */
document.getElementById('vt-replay').addEventListener('click', () => {
  results.classList.remove('show');
  gameEl.style.display    = '';
  checkWrap.style.display = '';
  promptEl.style.display  = '';
  hudEl.style.display     = '';
  score = 0;
  scoreEl.textContent = '0';
  startRound(0);
});

document.getElementById('vt-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

startRound(0);

})();
