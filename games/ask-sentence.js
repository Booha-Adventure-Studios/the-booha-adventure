
/* ══════════════════════════════════════════════════════════════
   ask-question.js  —  Ask the Question
   Show the JP question, speak (or reveal) the English answer.
   Uses questions.json: {id, en (answer), jp (question), hira, mp3}
   Android/Desktop: SR keyword scoring. iOS: reveal mode.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Ask the Question');

const isIOS  = U.isIOS();
const DUR_MS = 7000;
const PASS   = 80;

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

U.mount(`
  <div style="max-width:640px;margin:0 auto;padding:0 1rem 3rem;display:flex;flex-direction:column;align-items:center;gap:1rem;">

    <div class="game-hud" style="width:100%;">
      <div class="hud-pill">Q <b id="aq-num">1</b>/15</div>
      <div class="hud-pill">Score <b id="aq-score">0</b>/15</div>
    </div>

    <!-- Question card (JP) with play button -->
    <div style="position:relative;width:min(600px,92vw);border-radius:22px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);padding:1.4rem 4.5rem 1.4rem 1.4rem;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--game-primary),transparent);opacity:0.5;"></div>

      <div style="font-size:0.7rem;font-weight:900;letter-spacing:0.12em;color:var(--game-muted);margin-bottom:6px;text-transform:uppercase;">Question / 質問</div>
      <div id="aq-jp"   style="font-family:var(--game-font-jp);font-weight:900;font-size:clamp(18px,4.5vw,28px);line-height:1.4;"></div>
      <div id="aq-hira" style="font-family:var(--game-font-jp);font-size:clamp(13px,3vw,17px);color:var(--game-muted);margin-top:5px;"></div>

      <!-- Play question audio button -->
      <button id="aq-play" title="Listen to question" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;font-size:20px;color:#351b00;background:radial-gradient(circle at 30% 30%,#ffe8a3,#ffd36a 60%,#ffb800 100%);box-shadow:0 0 16px rgba(255,214,120,0.45);animation:goldPulse 1.8s ease-in-out infinite;">▶</button>
    </div>

    <!-- Answer zone with sweep -->
    <div style="position:relative;width:min(600px,92vw);border-radius:22px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);padding:1.2rem 1.4rem;overflow:hidden;min-height:80px;display:flex;align-items:center;justify-content:center;">
      <div id="aq-sweep" style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(170,255,34,0.4),rgba(170,255,34,0.2));mix-blend-mode:screen;opacity:0;border-radius:inherit;transform:translateX(-100%);"></div>
      <div id="aq-en" style="position:relative;z-index:2;font-family:var(--game-font-body);font-weight:900;font-size:clamp(18px,4vw,26px);text-align:center;line-height:1.35;color:var(--game-muted);font-style:italic;">…your answer here…</div>
    </div>

    <!-- Meter -->
    <div style="position:relative;width:min(200px,52vw);height:min(200px,52vw);display:grid;place-items:center;">
      <div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(#ff7eb9,#a6f7b2,#7dd3fc,#fff680,#c77dff,#ff7eb9);-webkit-mask:radial-gradient(circle,transparent 60%,black 62%);mask:radial-gradient(circle,transparent 60%,black 62%);animation:rainbowSpin 3s linear infinite;"></div>
      <div style="position:absolute;inset:12%;border-radius:50%;background:rgba(255,255,255,0.05);display:grid;place-items:center;text-align:center;">
        <div id="aq-meter" style="font-family:var(--game-font-title);font-weight:900;font-size:clamp(18px,4.5vw,28px);line-height:1.2;">Ready</div>
      </div>
    </div>

    <!-- Controls -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
      <button class="game-btn game-btn-primary"   id="aq-begin">スタート / Start</button>
      <button class="game-btn game-btn-secondary hide" id="aq-retry">もう一回 / Retry</button>
      <button class="game-btn game-btn-gold hide" id="aq-next">つぎへ / Next →</button>
    </div>

    <div id="aq-score-box" class="hide" style="font-weight:900;font-size:1rem;color:var(--game-primary);"></div>

    <div id="aq-results" class="results-panel">
      <div class="results-msg"   id="aq-rmsg"></div>
      <div class="results-score" id="aq-rscore"></div>
      <div class="results-actions">
        <button class="game-btn game-btn-primary"   id="aq-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="aq-back">メニューへ</button>
      </div>
    </div>
  </div>

  <style>
    @keyframes goldPulse {
      0%,100%{box-shadow:0 0 0 3px rgba(255,213,120,.25),0 0 10px rgba(255,214,120,.35)}
      50%{box-shadow:0 0 0 4px rgba(255,213,120,.45),0 0 22px rgba(255,214,120,.85)}
    }
    @keyframes rainbowSpin { to{filter:hue-rotate(360deg)} }
    #aq-en .word-span { display:inline-block;padding:0 0.05em;transition:color .2s; }
    #aq-en .word-span.heard { color:var(--game-primary);text-shadow:0 0 10px var(--game-primary); }
    #aq-en .word-span.missed { color:#ff4466; }
  </style>
`);

const numEl    = document.getElementById('aq-num');
const scoreEl  = document.getElementById('aq-score');
const jpEl     = document.getElementById('aq-jp');
const hiraEl   = document.getElementById('aq-hira');
const enEl     = document.getElementById('aq-en');
const meterEl  = document.getElementById('aq-meter');
const sweepEl  = document.getElementById('aq-sweep');
const playBtn  = document.getElementById('aq-play');
const beginBtn = document.getElementById('aq-begin');
const retryBtn = document.getElementById('aq-retry');
const nextBtn  = document.getElementById('aq-next');
const scoreBox = document.getElementById('aq-score-box');
const results  = document.getElementById('aq-results');

const order = U.shuffle(CFG.cards.slice(0, 15));
let idx       = 0;
let score     = 0;
let firstScores = new Array(15).fill(null);
let isBusy    = false;
let listening = false;
let collecting = false;
let heard     = '';
let SR_inst   = null;

const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

function makeSR() {
  if (!SR || isIOS) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.continuous = true;
  r.interimResults = true;
  r.onresult = e => {
    if (!collecting) return;
    let txt = '';
    for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript + ' ';
    heard = (heard + ' ' + txt).trim();
    mountWords(order[idx].en, heard);
  };
  r.onend = () => { if (listening) try { r.start(); } catch(e) {} };
  return r;
}

function setMeter(html) { meterEl.innerHTML = html; }

function startSweep() {
  sweepEl.style.transition = 'none';
  sweepEl.style.opacity = '1';
  sweepEl.style.transform = 'translateX(-100%)';
  void sweepEl.offsetWidth;
  sweepEl.style.transition = `transform ${DUR_MS}ms linear`;
  sweepEl.style.transform = 'translateX(0)';
}
function stopSweep() {
  sweepEl.style.transition = 'none';
  sweepEl.style.opacity = '0';
  sweepEl.style.transform = 'translateX(-100%)';
}

function mountWords(text, heardText) {
  const heardSet = heardText ? new Set(U.tokensOf(heardText)) : null;
  enEl.innerHTML = text.split(/\s+/).map(w => {
    const v = U.normalizeToken(w);
    const cls = heardSet && heardSet.has(v) ? ' heard' : '';
    return `<span class="word-span${cls}">${w}</span>`;
  }).join(' ');
  enEl.style.color = '#fff';
  enEl.style.fontStyle = 'normal';
}

function finalizeColors(heardText) {
  const heardSet = new Set(U.tokensOf(heardText));
  enEl.querySelectorAll('.word-span').forEach(span => {
    const v = U.normalizeToken(span.textContent);
    if (!span.classList.contains('heard') && !heardSet.has(v)) span.classList.add('missed');
  });
}

function showCard() {
  isBusy = false;
  const card = order[idx];
  numEl.textContent   = idx + 1;
  jpEl.textContent    = card.jp;
  hiraEl.textContent  = card.hira || '';
  // Reset answer zone
  enEl.innerHTML = '…your answer here…';
  enEl.style.color = 'var(--game-muted)';
  enEl.style.fontStyle = 'italic';
  stopSweep();
  setMeter('Ready');
  scoreBox.classList.add('hide');
  beginBtn.classList.remove('hide');
  retryBtn.classList.add('hide');
  nextBtn.classList.add('hide');
}

async function beginRoundIOS() {
  if (isBusy) return;
  isBusy = true;
  beginBtn.classList.add('hide');
  U.unlockAudio();
  mountWords(order[idx].en);

  for (const n of [3, 2, 1]) {
    setMeter(`<span style="font-size:1.5em">${n}</span>`);
    await U.wait(700);
  }
  setMeter('<span style="color:#fff680;font-size:1.3em;">GO!</span>');
  startSweep();
  await U.wait(DUR_MS);
  stopSweep();
  setMeter('おわり！');
  retryBtn.classList.remove('hide');
  nextBtn.classList.remove('hide');
  isBusy = false;
}

async function beginRound() {
  if (isIOS) { beginRoundIOS(); return; }
  if (isBusy) return;
  isBusy = true;
  beginBtn.classList.add('hide');
  U.unlockAudio();
  heard = ''; listening = false; collecting = false;

  setMeter('<span style="font-size:0.6em;opacity:0.7;">準備中…</span>');
  SR_inst = makeSR();
  if (SR_inst) { listening = true; try { SR_inst.start(); } catch(e) {} await U.wait(650); }

  for (const n of [3, 2, 1]) {
    setMeter(`<span style="font-size:1.5em">${n}</span>`);
    await U.wait(700);
  }
  setMeter('<span style="color:#fff680;font-size:1.3em;">GO!</span>');
  heard = ''; collecting = true;
  mountWords(order[idx].en);
  startSweep();
  await U.wait(DUR_MS + 140);

  collecting = false; listening = false;
  if (SR_inst) try { SR_inst.stop(); } catch(e) {}
  stopSweep();
  finalizeColors(heard);

  const s = U.keywordScore(order[idx].en, heard);
  scoreBox.textContent = `スコア：${s}%`;
  scoreBox.classList.remove('hide');
  if (firstScores[idx] === null) firstScores[idx] = s;

  if (s >= PASS) {
    U.showBurst('ok');
    U.playSFX('ding');
    U.confetti(enEl);
    if (firstScores[idx] === s) score++;
    setMeter('Good!');
    retryBtn.classList.add('hide');
    nextBtn.classList.remove('hide');
  } else {
    U.showBurst('ng');
    U.playSFX('fart');
    setMeter('Try Again');
    retryBtn.classList.remove('hide');
    nextBtn.classList.add('hide');
  }

  isBusy = false;
}

playBtn.addEventListener('click', async () => {
  const card = order[idx];
  if (card.mp3) { U.stopSage(); await U.playSage(CFG.audioBase + card.mp3); }
});

beginBtn.addEventListener('click', () => { U.unlockAudio(); beginRound(); });
retryBtn.addEventListener('click', () => { U.unlockAudio(); showCard(); beginRound(); });

nextBtn.addEventListener('click', () => {
  if (isBusy) return;
  idx++;
  scoreEl.textContent = score;
  if (idx >= order.length) { showResults(); return; }
  showCard();
});

function showResults() {
  results.classList.add('show');
  const msg = U.getResultMsg(score);
  document.getElementById('aq-rmsg').textContent   = isIOS ? '練習おわり' : msg.jp;
  document.getElementById('aq-rscore').textContent = isIOS ? 'Practice Complete' : `${score} / 15`;
  if (score === 15) U.confetti(results, 120);
  if (!isIOS) {
    const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
    snd.setAttribute('playsinline', ''); snd.play().catch(() => {});
  }
}

document.getElementById('aq-replay').addEventListener('click', () => {
  results.classList.remove('show');
  idx = 0; score = 0;
  firstScores = new Array(15).fill(null);
  scoreEl.textContent = 0;
  U.shuffle(order);
  showCard();
});
document.getElementById('aq-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

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
