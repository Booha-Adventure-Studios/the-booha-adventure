
/* ══════════════════════════════════════════════════════════════
   say-word.js  —  Say the Word
   Show JP, say the English word. Mic on Android/Desktop, reveal on iOS.
   Based on saytheword.html adapted for GAME_CONFIG.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Say the Word');

const isIOS = U.isIOS();

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

U.mount(`
  <div style="max-width:600px;margin:0 auto;padding:0 1rem 3rem;display:flex;flex-direction:column;align-items:center;gap:1.2rem;">

    <div class="game-hud" style="width:100%;">
      <div class="hud-pill">Word <b id="stw-num">1</b>/15</div>
      <div class="hud-pill">Score <b id="stw-score">0</b>/15</div>
    </div>

    <!-- JP stripe bar -->
    <div class="stripe-bar">
      <div class="stripe-inner"></div>
      <div class="stripe-label">
        <span id="stw-jp"   class="stripe-jp"></span>
        <span id="stw-hira" class="stripe-hira"></span>
      </div>
    </div>

    <!-- Answer row: box + mic/check -->
    <div style="width:min(560px,90vw);display:grid;grid-template-columns:${isIOS ? '1fr' : '1fr 56px'};gap:14px;align-items:center;">
      <div class="answer-box" id="stw-answer">
        <span id="stw-answer-text">&nbsp;</span>
      </div>
      ${isIOS
        ? '<button class="game-btn game-btn-primary" id="stw-mic" style="width:100%;margin-top:4px;">✔ Reveal</button>'
        : `<button class="mic-btn" id="stw-mic" aria-label="Speak">
            <svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/><path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V21h-3a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-3.07A7 7 0 0 0 19 11z"/></svg>
          </button>`
      }
    </div>

    <button class="game-btn game-btn-gold hide" id="stw-next">NEXT → / 次へ</button>
    <div style="color:var(--game-muted);font-size:0.9rem;" id="stw-hint">${isIOS ? 'Tap ✔ to reveal the answer' : 'Tap the mic and say the word'}</div>

    <div id="stw-results" class="results-panel">
      <div class="results-msg"   id="stw-rmsg"></div>
      <div class="results-score" id="stw-rscore"></div>
      <div class="results-actions">
        <button class="game-btn game-btn-primary"   id="stw-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="stw-back">メニューへ</button>
      </div>
    </div>
  </div>
`);

/* DOM */
const numEl      = document.getElementById('stw-num');
const scoreEl    = document.getElementById('stw-score');
const jpEl       = document.getElementById('stw-jp');
const hiraEl     = document.getElementById('stw-hira');
const answerBox  = document.getElementById('stw-answer');
const answerText = document.getElementById('stw-answer-text');
const micBtn     = document.getElementById('stw-mic');
const nextBtn    = document.getElementById('stw-next');
const results    = document.getElementById('stw-results');

/* State */
const order  = U.shuffle(CFG.cards.slice(0, 15));
let idx       = 0;
let score     = 0;
let firstTry  = true;
let answered  = false;
let listening = false;
let recognition = null;

/* SR setup (Android/Desktop) */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
if (SR && !isIOS) {
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    listening = true;
    micBtn.classList.add('pulsing');
    answerBox.classList.add('pulsing');
  };
  recognition.onresult = e => {
    listening = false;
    micBtn.classList.remove('pulsing');
    answerBox.classList.remove('pulsing');
    const raw = e.results[0][0].transcript;
    answerText.textContent = raw.toLowerCase().replace(/[.?!]/g, '');
    evaluate(raw);
  };
  recognition.onerror = () => {
    listening = false;
    micBtn.classList.remove('pulsing');
    answerBox.classList.remove('pulsing');
    answerText.textContent = '';
  };
  recognition.onend = () => {
    listening = false;
    micBtn.classList.remove('pulsing');
    answerBox.classList.remove('pulsing');
  };
}

function showCard() {
  answered  = false;
  firstTry  = true;
  const card = order[idx];
  numEl.textContent   = idx + 1;
  jpEl.textContent    = card.jp;
  hiraEl.textContent  = card.hira ? `（${card.hira}）` : '';
  answerText.innerHTML = '&nbsp;';
  answerBox.className = 'answer-box';
  nextBtn.classList.add('hide');
  micBtn.disabled = false;
}

function onCorrect(target) {
  answered = true;
  U.stopSage();
  answerBox.className = 'answer-box correct';
  answerText.textContent = target.toLowerCase();
  U.showBurst('ok');
  U.playSFX('ding');
  U.confetti(answerBox);
  if (firstTry) { score++; scoreEl.textContent = score; }
  micBtn.disabled = true;
  nextBtn.classList.add('hide');
  micBtn.disabled = true;
  // Sage audio after ding
  const card = order[idx];
  if (card.mp3) U.playSage(CFG.audioBase + card.mp3, 900).then(() => {
    nextBtn.classList.remove('hide');
  });
  else nextBtn.classList.remove('hide');
}

function onWrong() {
  firstTry = false;
  answerBox.classList.add('wrong');
  U.playSFX('fart');
  setTimeout(() => {
    answerBox.classList.remove('wrong');
    answerText.innerHTML = '&nbsp;';
  }, 700);
}

function evaluate(raw) {
  const target = order[idx].en;
  if (U.matchesTarget(raw, target)) { onCorrect(target); }
  else { onWrong(); }
}

/* iOS: tap reveal */
async function iosReveal() {
  if (answered) return;
  answered = true;
  const card = order[idx];
  answerBox.className = 'answer-box correct';
  answerText.textContent = card.en.toLowerCase();
  U.playSFX('ding');
  U.confetti(answerBox);
  micBtn.disabled = true;
  if (card.mp3) await U.playSage(CFG.audioBase + card.mp3, 900);
  nextBtn.classList.remove('hide');
}

micBtn.addEventListener('click', () => {
  if (answered) return;
  U.unlockAudio();
  if (isIOS) { iosReveal(); return; }
  if (listening) return;
  if (!recognition) { alert('Speech recognition not supported. Use Chrome on Android.'); return; }
  try { recognition.start(); } catch(e) {}
});

nextBtn.addEventListener('click', () => {
  idx++;
  if (idx >= order.length) { showResults(); return; }
  showCard();
  nextBtn.classList.add('hide');
});

function showResults() {
  results.classList.add('show');
  const msg = U.getResultMsg(score);
  document.getElementById('stw-rmsg').textContent   = isIOS ? '練習おわり' : msg.jp;
  document.getElementById('stw-rscore').textContent  = isIOS ? 'Practice Complete' : `${score} / 15`;
  if (score === 15) U.confetti(results, 120);
  if (!isIOS) {
    const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
    snd.setAttribute('playsinline', ''); snd.play().catch(() => {});
  }
}

document.getElementById('stw-replay').addEventListener('click', () => {
  results.classList.remove('show');
  idx = 0; score = 0;
  scoreEl.textContent = 0;
  U.shuffle(order);
  showCard();
});
document.getElementById('stw-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

showCard();
U.unlockAudio();

})();
