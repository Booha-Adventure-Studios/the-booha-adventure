
/* ══════════════════════════════════════════════════════════════
   sentence-tap.js  —  Sentence Tap Match
   Show JP sentences, pair with EN sentences, then Check.
   3 rounds × 5 = 15 points max.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Sentence Tap');
U.unlockAudio();

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

/* ── Audio: one sentence at a time, no smashing ── */
let sentenceAudio = null;
let audioLocked   = false;

function playSentenceAudio(mp3Filename) {
  if (audioLocked || !mp3Filename) return;
  audioLocked = true;
  if (sentenceAudio) { sentenceAudio.pause(); sentenceAudio.currentTime = 0; }
  sentenceAudio = new Audio(CFG.audioBase + mp3Filename);
  sentenceAudio.setAttribute('playsinline', '');
  sentenceAudio.play().catch(() => {});
  sentenceAudio.addEventListener('ended', () => { audioLocked = false; });
  sentenceAudio.addEventListener('error', () => { audioLocked = false; });
  setTimeout(() => { audioLocked = false; }, 5000); // hard reset for long sentences
}

/* ── Result messages (sentence-specific) ── */
const RESULT_MSGS = [
  // 0–5
  {
    en: "Sentences are tough, don't quit!",
    jp: "むずかしいね！あきらめないで！",
    kanji: "難しいね！諦めないで！"
  },
  // 6–10
  {
    en: "Getting there! Keep reading!",
    jp: "いい感じ！もっと読もう！",
    kanji: "良い調子！もっと読もう！"
  },
  // 11–14
  {
    en: "Almost fluent! So close!",
    jp: "ほぼペラペラ！惜しい！",
    kanji: "ほぼ流暢！惜しい！"
  },
  // 15
  {
    en: "Fluent! You nailed every sentence!",
    jp: "ペラペラ！全文正解！",
    kanji: "流暢！全問正解！"
  }
];

function getMsg(score) {
  if (score === 15) return RESULT_MSGS[3];
  if (score >= 11)  return RESULT_MSGS[2];
  if (score >= 6)   return RESULT_MSGS[1];
  return RESULT_MSGS[0];
}

function resultSound(score) {
  if (score === 15)  return CFG.sfxBase + 'result_15.mp3';
  if (score >= 11)   return CFG.sfxBase + 'result_11-14.mp3';
  if (score >= 6)    return CFG.sfxBase + 'result_6-10.mp3';
  return CFG.sfxBase + 'result_0-5.mp3';
}

/* ── Mount UI ── */
U.mount(`
<div class="game-wrap">

  <div class="game-hud" id="st-hud">
    <div class="hud-pill">Round <b id="st-round">1</b> / 3</div>
    <div class="hud-pill">Score <b id="st-score">0</b> / 15</div>
  </div>

  <div class="game-prompt" id="st-prompt">
    <div class="game-prompt-main">Sentence Tap</div>
    <div class="game-prompt-sub">英語の文をタップして日本語に合わせよう</div>
  </div>

  <div id="st-game">

    <!-- EN bank: stacked tiles, auto-height for sentence length -->
    <div class="game-board" style="margin-bottom:14px;">
      <div class="game-board-title">English</div>
      <div id="st-en-bank" class="game-stack"></div>
    </div>

    <!-- JP slots: each shows the JP sentence + drop zone for EN -->
    <div class="game-board">
      <div class="game-board-title">日本語</div>
      <div id="st-jp-slots" class="game-stack"></div>
    </div>

  </div>

  <div class="check-btn-wrap" id="st-check-wrap">
    <button class="game-btn-check" id="st-check" disabled>Check ✓</button>
  </div>

  <!-- Results -->
  <div id="st-results" class="results-panel">
    <div class="results-score"     id="st-rscore"></div>
    <div class="results-pct"       id="st-rpct"></div>
    <div class="results-msg"       id="st-rmsg-title"></div>
    <div class="results-msg-en"    id="st-rmsg-en"></div>
    <div class="results-msg-jp"    id="st-rmsg-jp"></div>
    <div class="results-msg-kanji" id="st-rmsg-kanji"></div>
    <div class="results-actions" style="margin-top:1.5rem;">
      <button class="game-btn game-btn-primary"   id="st-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="st-back">メニューへ</button>
    </div>
  </div>

</div>
`);

/* ── Refs ── */
const roundEl   = document.getElementById('st-round');
const scoreEl   = document.getElementById('st-score');
const enBank    = document.getElementById('st-en-bank');
const jpSlots   = document.getElementById('st-jp-slots');
const checkBtn  = document.getElementById('st-check');
const gameEl    = document.getElementById('st-game');
const checkWrap = document.getElementById('st-check-wrap');
const promptEl  = document.getElementById('st-prompt');
const hudEl     = document.getElementById('st-hud');
const results   = document.getElementById('st-results');

/* ── State ── */
const allCards    = U.shuffle(CFG.cards.slice(0, 15));
let score         = 0;
let roundIdx      = 0;
let roundCards    = [];
let roundJpOrder  = [];   // shuffled JP order (different from EN order)
let selectedEnKey = null;
let pairs         = {};   // { jpKey: enKey }
let checkLocked   = false;
let globalLocked  = false;

function cardKey(card, i) {
  return String(card.id ?? card.mp3 ?? `${card.en}__${i}`);
}

/* ── Round lifecycle ── */
function startRound(ri) {
  roundIdx    = ri;
  roundCards  = allCards.slice(ri * 5, ri * 5 + 5).map((c, i) => ({
    ...c, _key: cardKey(c, ri * 5 + i)
  }));
  // JP order is shuffled independently so EN and JP sides don't align visually
  roundJpOrder  = U.shuffle(roundCards.slice());
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
  const paired = new Set(Object.values(pairs));

  roundCards.forEach(card => {
    if (paired.has(card._key)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'match-tile' + (selectedEnKey === card._key ? ' selected' : '');
    // Sentences need wrapping text — let the tile grow
    btn.style.cssText = 'white-space:normal;height:auto;min-height:52px;padding:12px 16px;text-align:left;font-size:clamp(13px,2.5vw,17px);line-height:1.4;';
    btn.textContent = card.en;
    btn.addEventListener('click', () => {
      if (globalLocked) return;
      playSentenceAudio(card.mp3);
      selectedEnKey = (selectedEnKey === card._key) ? null : card._key;
      render();
    });
    enBank.appendChild(btn);
  });
}

function renderJpSlots() {
  jpSlots.innerHTML = '';

  roundJpOrder.forEach(card => {
    const pairedEnKey = Object.entries(pairs).find(([jk]) => jk === card._key)?.[1] ?? null;
    const pairedCard  = pairedEnKey ? roundCards.find(c => c._key === pairedEnKey) : null;

    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'match-slot' + (pairedCard ? ' has-pair' : '');
    slot.style.cssText = 'height:auto;min-height:72px;padding:12px;text-align:left;display:block;width:100%;';

    slot.innerHTML = `
      <div class="slot-jp-text" style="font-size:clamp(15px,3vw,20px);line-height:1.4;text-align:left;">${card.jp}</div>
      <div class="slot-hira-text" style="text-align:left;">${card.hira || ''}</div>
      ${pairedCard
        ? `<div class="slot-pair-label" style="text-align:left;font-size:clamp(12px,2.3vw,16px);line-height:1.4;margin-top:8px;">${pairedCard.en}</div>`
        : `<div style="margin-top:8px;font-size:12px;font-weight:800;letter-spacing:.06em;color:var(--game-muted);opacity:0.6;">TAP TO PAIR</div>`
      }
    `;

    slot.addEventListener('click', () => {
      if (globalLocked) return;

      if (!selectedEnKey && !pairedCard) return;

      if (!selectedEnKey && pairedCard) {
        // un-pair
        delete pairs[card._key];
        render();
        return;
      }

      if (selectedEnKey) {
        // remove selectedEnKey from any existing slot
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
    const jpCard  = roundJpOrder[i];
    const enKey   = pairs[jpCard._key];
    const enCard  = roundCards.find(c => c._key === enKey);
    const correct = enCard && enCard._key === jpCard._key;

    slotEl.classList.add(correct ? 'slot-correct' : 'slot-wrong');
    if (correct) roundScore++;
  });

  score += roundScore;
  scoreEl.textContent = String(score);

  if (roundScore === roundCards.length) {
    U.playSFX('ding');
    U.confetti(gameEl, 60);
  } else if (roundScore === 0) {
    U.playSFX('fart');
  } else {
    U.playSFX('ding');
  }

  setTimeout(() => {
    globalLocked = false;
    if (roundIdx < 2) {
      startRound(roundIdx + 1);
    } else {
      showResults();
    }
  }, 1200);
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

  document.getElementById('st-rscore').textContent     = `${score} / 15`;
  document.getElementById('st-rpct').textContent       = `${pct}%`;
  document.getElementById('st-rmsg-title').textContent = score === 15 ? 'PERFECT!' : score >= 11 ? 'Great job!' : score >= 6 ? 'Keep going!' : 'Try again!';
  document.getElementById('st-rmsg-en').textContent    = msg.en;
  document.getElementById('st-rmsg-jp').textContent    = msg.jp;
  document.getElementById('st-rmsg-kanji').textContent = msg.kanji;

  if (score === 15) U.confetti(results, 130);

  const snd = new Audio(resultSound(score));
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

/* ── Replay / Back ── */
document.getElementById('st-replay').addEventListener('click', () => {
  results.classList.remove('show');
  gameEl.style.display    = '';
  checkWrap.style.display = '';
  promptEl.style.display  = '';
  hudEl.style.display     = '';
  score = 0;
  scoreEl.textContent = '0';
  startRound(0);
});

document.getElementById('st-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

startRound(0);

})();
