
/* ══════════════════════════════════════════════════════════════
   say-sentence.js  —  Say the Sentence (Eigo Pera Pera)
   Show JP sentence, listen while sweep runs, keyword score.
   Android/Desktop: live SR scoring. iOS: practice + reveal mode.
   Based on eigoperapera.html adapted for GAME_CONFIG.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Say the Sentence');

const isIOS  = U.isIOS();
const PASS   = 88;   // keyword score % to pass
const DUR_MS = 7500; // listening window

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

U.mount(`
  <div style="max-width:660px;margin:0 auto;padding:0 1rem 3rem;display:flex;flex-direction:column;align-items:center;gap:1rem;">

    <div class="game-hud" style="width:100%;">
      <div class="hud-pill">Sentence <b id="sas-num">1</b>/15</div>
      <div class="hud-pill">Score <b id="sas-score">0</b>/15</div>
    </div>

    <!-- Sentence card with sweep -->
    <div style="position:relative;width:min(620px,92vw);border-radius:22px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);padding:1.2rem 4rem 1.2rem 1.2rem;overflow:hidden;">
      <!-- Sweep overlay -->
      <div id="sas-sweep" style="position:absolute;inset:0;width:100%;height:100%;background:linear-gradient(0deg,rgba(255,246,128,0.85),rgba(255,246,128,0.65));mix-blend-mode:screen;opacity:0.8;border-radius:6px;transform:translateX(-100%);z-index:0;"></div>

      <!-- Play button -->
      <button id="sas-play" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;font-size:20px;color:#351b00;z-index:3;background:radial-gradient(circle at 30% 30%,#ffe8a3,#ffd36a 60%,#ffb800 100%);box-shadow:0 0 0 3px rgba(255,213,120,.35),0 0 16px rgba(255,214,120,.45);animation:goldPulse 1.8s ease-in-out infinite;">▶</button>

      <!-- EN text with word highlighting -->
      <div id="sas-en" style="position:relative;z-index:2;font-family:var(--game-font-body);font-weight:900;font-size:clamp(20px,5vw,32px);text-align:center;line-height:1.3;"></div>
    </div>

    <!-- JP strip -->
    <div style="text-align:center;">
      <div id="sas-jp"   style="font-family:var(--game-font-jp);font-weight:700;font-size:clamp(15px,3.5vw,20px);color:rgba(255,255,255,0.85);"></div>
      <div id="sas-hira" style="font-family:var(--game-font-jp);font-size:clamp(12px,2.8vw,16px);color:var(--game-muted);margin-top:4px;"></div>
    </div>

    <!-- Meter circle -->
    <div style="position:relative;width:min(220px,55vw);height:min(220px,55vw);display:grid;place-items:center;">
      <div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(#ff7eb9,#a6f7b2,#7dd3fc,#fff680,#c77dff,#8aff80,#ff7eb9);-webkit-mask:radial-gradient(circle,transparent 60%,black 62%);mask:radial-gradient(circle,transparent 60%,black 62%);animation:rainbowSpin 3s linear infinite;"></div>
      <div style="position:absolute;inset:12%;border-radius:50%;background:rgba(255,255,255,0.05);display:grid;place-items:center;text-align:center;">
        <div id="sas-meter" style="font-family:var(--game-font-title);font-weight:900;font-size:clamp(20px,5vw,32px);line-height:1.2;">Ready<br><small style="font-size:0.55em;opacity:0.8;">スタンバイ</small></div>
      </div>
    </div>

    <!-- Counter -->
    <div id="sas-counter" style="color:var(--game-muted);font-size:0.95rem;">1 / 15</div>

    <!-- Buttons -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
      <button class="game-btn game-btn-primary" id="sas-begin">スタート / Start</button>
      <button class="game-btn game-btn-secondary hide" id="sas-retry">もう一回 / Retry</button>
      <button class="game-btn game-btn-gold hide" id="sas-next">つぎへ / Next</button>
    </div>

    <div id="sas-score-box" class="hide" style="margin-top:0.5rem;font-weight:900;font-size:1.1rem;color:var(--game-primary);"></div>

    <div id="sas-results" class="results-panel">
      <div class="results-msg"   id="sas-rmsg"></div>
      <div class="results-score" id="sas-rscore"></div>
      <div class="results-actions">
        <button class="game-btn game-btn-primary"   id="sas-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="sas-back">メニューへ</button>
      </div>
    </div>
  </div>

  <style>
    @keyframes goldPulse {
      0%,100%{box-shadow:0 0 0 3px rgba(255,213,120,.25),0 0 10px rgba(255,214,120,.35)}
      50%{box-shadow:0 0 0 4px rgba(255,213,120,.45),0 0 22px rgba(255,214,120,.85)}
    }
    @keyframes rainbowSpin { to{filter:hue-rotate(360deg)} }
    .word-span { display:inline-block;padding:0 0.06em;color:#fff;transition:color .2s,transform .2s; }
    .word-span.heard { color:var(--game-primary);text-shadow:0 0 12px var(--game-primary);transform:translateY(-4px) scale(1.06); }
    .word-span.missed { color:#ff4466;text-shadow:0 0 8px #ff4466; }
  </style>
`);

/* DOM refs */
const numEl    = document.getElementById('sas-num');
const scoreEl  = document.getElementById('sas-score');
const enEl     = document.getElementById('sas-en');
const jpEl     = document.getElementById('sas-jp');
const hiraEl   = document.getElementById('sas-hira');
const meterEl  = document.getElementById('sas-meter');
const counter  = document.getElementById('sas-counter');
const sweepEl  = document.getElementById('sas-sweep');
const playBtn  = document.getElementById('sas-play');
const beginBtn = document.getElementById('sas-begin');
const retryBtn = document.getElementById('sas-retry');
const nextBtn  = document.getElementById('sas-next');
const scoreBox = document.getElementById('sas-score-box');
const results  = document.getElementById('sas-results');

const order = U.shuffle(CFG.cards.slice(0, 15));
let idx       = 0;
let score     = 0;
let firstScores = new Array(15).fill(null);
let isBusy    = false;
let listening = false;
let collecting = false;
let heard     = '';
let SR_inst   = null;

/* SR setup */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

function makeSR() {
  if (!SR || isIOS) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.continuous = true;
  r.interimResults = true;
  try { r.maxAlternatives = 5; } catch(e) {}
  r.onresult = e => {
    if (!collecting) return;
    let txt = '';
    for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript + ' ';
    heard = (heard + ' ' + txt).trim();
    markHeard(heard);
  };
  r.onend = () => { if (listening) try { r.start(); } catch(e) {} };
  return r;
}

function setMeter(html) { meterEl.innerHTML = html; }
function startSweep() {
  sweepEl.style.transition = 'none';
  sweepEl.style.transform = 'translateX(-100%)';
  void sweepEl.offsetWidth;
  sweepEl.style.transition = `transform ${DUR_MS}ms linear`;
  sweepEl.style.transform = 'translateX(0)';
}
function stopSweep() {
  sweepEl.style.transition = 'none';
  sweepEl.style.transform = 'translateX(-100%)';
}

function mountWords(text) {
  enEl.innerHTML = text.split(/\s+/).map(w => `<span class="word-span">${w}</span>`).join(' ');
}

function markHeard(spokenText) {
  const set = new Set(U.tokensOf(spokenText));
  enEl.querySelectorAll('.word-span').forEach(span => {
    const v = U.normalizeToken(span.textContent);
    if (set.has(v) && !span.classList.contains('heard')) span.classList.add('heard');
  });
}

function finalizeColors() {
  enEl.querySelectorAll('.word-span').forEach(span => {
    if (!span.classList.contains('heard')) span.classList.add('missed');
  });
}

function showCard() {
  isBusy = false;
  const card = order[idx];
  numEl.textContent   = idx + 1;
  counter.textContent = `${idx + 1} / 15`;
  jpEl.textContent    = card.jp;
  hiraEl.textContent  = card.hira || '';
  mountWords(card.en);
  stopSweep();
  setMeter('Ready<br><small style="font-size:0.5em;opacity:0.75;">スタンバイ</small>');
  scoreBox.classList.add('hide');
  beginBtn.classList.remove('hide');
  retryBtn.classList.add('hide');
  nextBtn.classList.add('hide');
}

/* iOS practice round */
async function beginRoundIOS() {
  if (isBusy) return;
  isBusy = true;
  beginBtn.classList.add('hide');
  U.unlockAudio();

  for (const n of [3, 2, 1]) {
    setMeter(`<span style="font-size:1.6em;color:${['#ff7eb9','#7dd3fc','#a6f7b2'][[3,2,1].indexOf(n)]}">${n}</span>`);
    await U.wait(700);
  }
  setMeter('<span style="color:#fff680;font-size:1.4em;">GO!</span>');
  startSweep();
  await U.wait(DUR_MS);
  stopSweep();
  setMeter('おわり！<br><small style="font-size:0.5em">Finished</small>');
  retryBtn.classList.remove('hide');
  nextBtn.classList.remove('hide');
  isBusy = false;
}

/* Android/Desktop round */
async function beginRound() {
  if (isIOS) { beginRoundIOS(); return; }
  if (isBusy) return;
  isBusy = true;
  beginBtn.classList.add('hide');
  U.unlockAudio();

  heard = '';
  listening = false;
  collecting = false;

  setMeter('<span style="font-size:0.65em;opacity:0.8;">準備中…</span>');

  SR_inst = makeSR();
  if (SR_inst) {
    listening = true;
    try { SR_inst.start(); } catch(e) {}
    await U.wait(650); // warmup
  }

  for (const n of [3, 2, 1]) {
    setMeter(`<span style="font-size:1.6em;color:${['#ff7eb9','#7dd3fc','#a6f7b2'][[3,2,1].indexOf(n)]}">${n}</span>`);
    await U.wait(700);
  }
  setMeter('<span style="color:#fff680;font-size:1.4em;">GO!</span>');
  heard = '';
  collecting = true;

  startSweep();
  await U.wait(DUR_MS + 140);

  collecting = false;
  listening = false;
  if (SR_inst) { try { SR_inst.stop(); } catch(e) {} }
  stopSweep();
  finalizeColors();

  const s = U.keywordScore(order[idx].en, heard);
  scoreBox.textContent = `スコア：${s}%`;
  scoreBox.classList.remove('hide');

  if (firstScores[idx] === null) firstScores[idx] = s;

  if (s >= PASS) {
    U.showBurst('ok');
    U.playSFX('ding');
    U.confetti(enEl);
    if (firstScores[idx] === s) score++;
    setMeter('Good!<br><small style="font-size:0.5em;color:#22c55e">よくできました</small>');
    retryBtn.classList.add('hide');
    nextBtn.classList.remove('hide');
  } else {
    U.showBurst('ng');
    U.playSFX('fart');
    setMeter('Try<br>Again');
    retryBtn.classList.remove('hide');
    nextBtn.classList.add('hide');
  }

  isBusy = false;
}

/* Play sage audio */
playBtn.addEventListener('click', async () => {
  if (isBusy || listening) return;
  const card = order[idx];
  if (card.mp3) {
    U.stopSage();
    await U.playSage(CFG.audioBase + card.mp3);
  }
});

beginBtn.addEventListener('click', () => { U.unlockAudio(); showCard(); beginRound(); });
retryBtn.addEventListener('click', () => { U.unlockAudio(); showCard(); beginRound(); });

nextBtn.addEventListener('click', () => {
  if (isBusy) return;
  idx++;
  scoreEl.textContent = score;
  if (idx >= order.length) { showResults(); return; }
  showCard();
  nextBtn.classList.add('hide');
  retryBtn.classList.add('hide');
  beginBtn.classList.remove('hide');
});

function showResults() {
  results.classList.add('show');
  const msg = U.getResultMsg(score);
  document.getElementById('sas-rmsg').textContent   = isIOS ? '練習おわり' : msg.jp;
  document.getElementById('sas-rscore').textContent = isIOS ? 'Practice Complete' : `${score} / 15`;
  if (score === 15) U.confetti(results, 120);
  if (!isIOS) {
    const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
    snd.setAttribute('playsinline', ''); snd.play().catch(() => {});
  }
}

document.getElementById('sas-replay').addEventListener('click', () => {
  results.classList.remove('show');
  idx = 0; score = 0;
  firstScores = new Array(15).fill(null);
  scoreEl.textContent = 0;
  U.shuffle(order);
  showCard();
});
document.getElementById('sas-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

/* iOS notice */
if (isIOS) {
  const overlay = document.getElementById('ios-overlay');
  const body    = document.getElementById('ios-overlay-body');
  const ok      = document.getElementById('ios-overlay-ok');
  if (overlay && body && ok) {
    body.textContent = 'このゲームのフル版（マイクで判定）はAndroid / パソコンで遊べます。iPad / iPhoneでは練習モードになります。';
    overlay.classList.add('show');
    ok.addEventListener('click', () => { overlay.classList.remove('show'); U.unlockAudio(); }, { once: true });
  }
}

U.unlockAudio();
showCard();

})();
