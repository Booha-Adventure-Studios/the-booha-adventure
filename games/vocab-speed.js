
/* ══════════════════════════════════════════════════════════════
   vocab-speed.js — Vocabulary Speed
   JP prompt → pick the English word. Heat bar timer. Fire streaks.
   Cleaner full-layout version using game.css better.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Vocabulary Speed');
U.unlockAudio();

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

U.mount(`
  <style>
    .vs-wrap{
      max-width:920px;
      margin:0 auto;
      padding:0 1rem 3rem;
    }

    .vs-top{
      display:grid;
      gap:14px;
      margin-bottom:1rem;
    }

    .vs-hud{
      display:flex;
      justify-content:center;
      gap:10px;
      flex-wrap:wrap;
    }

    .vs-meter-wrap{
      padding:0 .25rem;
    }

    .vs-meter-label{
      text-align:center;
      font-size:12px;
      font-weight:800;
      letter-spacing:.08em;
      color:var(--game-muted);
      margin-bottom:6px;
      text-transform:uppercase;
    }

    .vs-prompt{
      display:flex;
      align-items:center;
      justify-content:center;
      min-height:clamp(180px, 34vh, 280px);
      padding:1.25rem;
      text-align:center;
      margin:1rem 0 1.2rem;
    }

    .vs-prompt-inner{
      width:100%;
    }

    .vs-jp{
      font-family:var(--game-font-jp);
      font-weight:900;
      font-size:clamp(34px, 8vw, 66px);
      line-height:1.15;
      color:#fff;
      text-shadow:0 0 22px rgba(255,255,255,.10);
      word-break:keep-all;
    }

    .vs-hira{
      margin-top:.55rem;
      font-family:var(--game-font-jp);
      font-size:clamp(16px, 3vw, 24px);
      color:var(--game-muted);
      line-height:1.35;
    }

    .vs-grid{
      display:grid;
      grid-template-columns:repeat(2, minmax(0, 1fr));
      gap:16px;
      margin-top:.5rem;
    }

    .vs-choice{
      min-height:92px;
      display:flex;
      align-items:center;
      justify-content:center;
      text-align:center;
      padding:1rem 1rem;
      border-radius:24px;
      font-family:var(--game-font-title);
      font-size:clamp(22px, 3.2vw, 34px);
      line-height:1.15;
    }

    .vs-choice .tile-en{
      width:100%;
    }

    .vs-banner{
      margin:1rem auto 0;
      max-width:680px;
      text-align:center;
      padding:14px 18px;
      border-radius:20px;
      background:rgba(255,209,102,0.12);
      border:1px solid rgba(255,209,102,0.30);
      box-shadow:0 8px 24px rgba(255,209,102,.08);
    }

    .vs-banner-en{
      font-family:var(--game-font-title);
      font-size:clamp(20px, 4vw, 30px);
      line-height:1.1;
      color:#ffd166;
      text-shadow:0 0 14px rgba(255,209,102,.24);
    }

    .vs-banner-jp{
      margin-top:4px;
      font-family:var(--game-font-jp);
      font-size:clamp(14px, 2.8vw, 20px);
      color:#fff;
    }

    @media (max-width: 720px){
      .vs-grid{
        grid-template-columns:1fr;
        gap:14px;
      }

      .vs-choice{
        min-height:84px;
        border-radius:20px;
      }

      .vs-prompt{
        min-height:clamp(160px, 30vh, 240px);
        padding:1rem .8rem;
      }
    }
  </style>

  <div class="vs-wrap">

    <div class="vs-top">
      <div class="game-hud vs-hud">
        <div class="hud-pill">Q <b id="vs-qnum">1</b>/15</div>
        <div class="hud-pill">Score <b id="vs-score">0</b></div>
        <div class="hud-pill">🔥 <b id="vs-streak">0</b></div>
      </div>

      <div class="vs-meter-wrap">
        <div class="vs-meter-label">Speed Meter</div>
        <div class="heat-track">
          <div class="heat-fill" id="vs-heat"></div>
        </div>
      </div>
    </div>

    <div class="game-card vs-prompt">
      <div class="vs-prompt-inner">
        <div id="vs-jp" class="vs-jp"></div>
        <div id="vs-hira" class="vs-hira"></div>
      </div>
    </div>

    <div id="vs-grid" class="vs-grid"></div>

    <div id="vs-banner" class="vs-banner hide">
      <div id="vs-banner-en" class="vs-banner-en"></div>
      <div id="vs-banner-jp" class="vs-banner-jp"></div>
    </div>

    <div id="vs-results" class="results-panel">
      <div class="results-msg" id="vs-rmsg"></div>
      <div class="results-score" id="vs-rscore"></div>
      <div class="results-actions">
        <button class="game-btn game-btn-primary" id="vs-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="vs-back">メニューへ</button>
      </div>
    </div>

  </div>
`);

/* DOM */
const qnumEl   = document.getElementById('vs-qnum');
const scoreEl  = document.getElementById('vs-score');
const streakEl = document.getElementById('vs-streak');
const heatEl   = document.getElementById('vs-heat');
const jpEl     = document.getElementById('vs-jp');
const hiraEl   = document.getElementById('vs-hira');
const grid     = document.getElementById('vs-grid');
const banner   = document.getElementById('vs-banner');
const bannerEn = document.getElementById('vs-banner-en');
const bannerJp = document.getElementById('vs-banner-jp');
const results  = document.getElementById('vs-results');

/* Fire messages */
const FIRE_MSG = {
  1: { en:"You are awesome!",                     jp:"すごい！" },
  2: { en:"You are even more awesome!",           jp:"もっとすごい！" },
  3: { en:"What? You are the most awesome!",      jp:"えっ！？一番すごい！" },
  4: { en:"You are the smartest person alive!!!", jp:"あなたは世界一かしこい！！！" }
};

function fireLvl(streak) {
  if (streak >= 15) return 4;
  if (streak >= 10) return 3;
  if (streak >= 6)  return 2;
  if (streak >= 3)  return 1;
  return 0;
}

/* State */
const order = U.shuffle(CFG.cards.slice(0, 15));
let idx       = 0;
let score     = 0;
let streak    = 0;
let lastLvl   = 0;
let locked    = false;
let firstTry  = true;
let heatRAF   = 0;
let heatStart = 0;
let heatDur   = 5000;

function getHeatDur() {
  const lv = fireLvl(streak);
  return [5000, 4000, 3200, 2400, 1800][lv];
}

function stopHeat() {
  cancelAnimationFrame(heatRAF);
  heatRAF = 0;
}

function startHeat() {
  stopHeat();
  heatDur = getHeatDur();
  heatStart = performance.now();
  heatEl.style.transform = 'scaleX(1)';

  const tick = t => {
    if (locked) {
      heatRAF = requestAnimationFrame(tick);
      return;
    }
    const p = 1 - (t - heatStart) / heatDur;
    heatEl.style.transform = `scaleX(${Math.max(0, p)})`;
    if (p <= 0) {
      onTimeout();
      return;
    }
    heatRAF = requestAnimationFrame(tick);
  };
  heatRAF = requestAnimationFrame(tick);
}

function renderQ() {
  if (idx >= order.length) {
    showResults();
    return;
  }

  locked   = false;
  firstTry = true;
  grid.innerHTML = '';

  const card = order[idx];
  qnumEl.textContent = idx + 1;
  jpEl.textContent   = card.jp;
  hiraEl.textContent = card.hira || '';

  const pool = order.filter((_, i) => i !== idx);
  const distractors = U.shuffle(pool).slice(0, 3).map(c => c.en);
  const choices = U.shuffle([card.en, ...distractors]);

  choices.forEach(en => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-tile vs-choice';
    btn.innerHTML = `<div class="tile-en">${en}</div>`;
    btn.addEventListener('click', () => pick(btn, en));
    grid.appendChild(btn);
  });

  startHeat();
}

function pick(btn, en) {
  if (locked) return;

  locked = true;
  stopHeat();
  grid.querySelectorAll('.choice-tile').forEach(t => t.classList.add('locked'));

  const correct = en === order[idx].en;

  if (correct) {
    btn.classList.add('correct');
    U.showBurst('ok');
    U.playSFX('ding');
    U.confetti(btn);

    if (firstTry) {
      score++;
      streak++;
    } else {
      streak = 0;
    }

    scoreEl.textContent  = score;
    streakEl.textContent = streak;
    checkFireLevel();

    setTimeout(() => {
      idx++;
      renderQ();
    }, 520);

  } else {
    btn.classList.add('wrong');
    firstTry = false;
    streak = 0;
    streakEl.textContent = 0;
    U.playSFX('fart');
    U.showBurst('ng');
    checkFireLevel();

    setTimeout(() => {
      locked = false;
      renderQ();
    }, 520);
  }
}

function onTimeout() {
  locked = true;
  streak = 0;
  streakEl.textContent = 0;
  firstTry = false;
  U.playSFX('fart');
  U.showBurst('ng');
  checkFireLevel();

  setTimeout(() => {
    locked = false;
    renderQ();
  }, 540);
}

function checkFireLevel() {
  const lv = fireLvl(streak);

  if (lv > 0 && lv > lastLvl) {
    lastLvl = lv;
    const msg = FIRE_MSG[lv];
    bannerEn.textContent = msg.en;
    bannerJp.textContent = msg.jp;
    banner.classList.remove('hide');
  } else if (lv === 0) {
    lastLvl = 0;
    banner.classList.add('hide');
  }
}

function showResults() {
  stopHeat();
  results.classList.add('show');
  document.getElementById('vs-rmsg').textContent   = U.getResultMsg(score).jp;
  document.getElementById('vs-rscore').textContent = `${score} / 15`;

  if (score === 15) U.confetti(results, 120);

  const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

document.getElementById('vs-replay').addEventListener('click', () => {
  results.classList.remove('show');
  idx = 0;
  score = 0;
  streak = 0;
  lastLvl = 0;
  scoreEl.textContent = 0;
  streakEl.textContent = 0;
  banner.classList.add('hide');
  U.shuffle(order);
  renderQ();
});

document.getElementById('vs-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

renderQ();

})();
