
/* ══════════════════════════════════════════════════════════════
   vocab-speed.js  —  Vocabulary Speed
   JP prompt → pick the English word. Heat bar timer. Fire streaks.
   Based on wordspeed.html but uses GAME_CONFIG data.
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
  <div style="max-width:680px;margin:0 auto;padding:0 1rem 3rem;">

    <div class="game-hud">
      <div class="hud-pill">Q <b id="vs-qnum">1</b>/15</div>
      <div class="hud-pill">Score <b id="vs-score">0</b></div>
      <div class="hud-pill">🔥 <b id="vs-streak">0</b></div>
    </div>

    <!-- Heat bar -->
    <div class="heat-track" style="margin:0.5rem 1rem;">
      <div class="heat-fill" id="vs-heat"></div>
    </div>

    <!-- JP Prompt card -->
    <div class="game-card" style="text-align:center;padding:1.5rem 1rem;margin:1rem 0;">
      <div id="vs-jp"   style="font-family:var(--game-font-jp);font-weight:900;font-size:clamp(28px,7vw,48px);"></div>
      <div id="vs-hira" style="font-family:var(--game-font-jp);font-size:clamp(16px,3.5vw,22px);color:var(--game-muted);margin-top:6px;"></div>
    </div>

    <!-- 4 EN choice tiles -->
    <div id="vs-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"></div>

    <!-- Fire banner -->
    <div id="vs-banner" class="hide" style="text-align:center;margin-top:1rem;padding:12px;border-radius:16px;background:rgba(255,209,102,0.12);border:1px solid rgba(255,209,102,0.3);">
      <div id="vs-banner-en" style="font-family:var(--game-font-title);font-size:clamp(18px,4vw,28px);color:#ffd166;"></div>
      <div id="vs-banner-jp" style="font-family:var(--game-font-jp);font-size:clamp(14px,3vw,20px);margin-top:4px;"></div>
    </div>

    <div id="vs-results" class="results-panel">
      <div class="results-msg"   id="vs-rmsg"></div>
      <div class="results-score" id="vs-rscore"></div>
      <div class="results-actions">
        <button class="game-btn game-btn-primary"   id="vs-replay">もう一度</button>
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

function stopHeat() { cancelAnimationFrame(heatRAF); heatRAF = 0; }

function startHeat() {
  stopHeat();
  heatDur = getHeatDur();
  heatStart = performance.now();
  heatEl.style.transform = 'scaleX(1)';

  const tick = t => {
    if (locked) { heatRAF = requestAnimationFrame(tick); return; }
    const p = 1 - (t - heatStart) / heatDur;
    heatEl.style.transform = `scaleX(${Math.max(0, p)})`;
    if (p <= 0) { onTimeout(); return; }
    heatRAF = requestAnimationFrame(tick);
  };
  heatRAF = requestAnimationFrame(tick);
}

function renderQ() {
  if (idx >= order.length) { showResults(); return; }
  locked   = false;
  firstTry = true;
  grid.innerHTML = '';

  const card = order[idx];
  qnumEl.textContent  = idx + 1;
  jpEl.textContent    = card.jp;
  hiraEl.textContent  = card.hira || '';

  // Choices: correct + 3 distractors from other cards
  const pool = order.filter((_, i) => i !== idx);
  const distractors = U.shuffle(pool).slice(0, 3).map(c => c.en);
  const choices = U.shuffle([card.en, ...distractors]);

  choices.forEach(en => {
    const btn = document.createElement('div');
    btn.className = 'choice-tile';
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
    if (firstTry) { score++; streak++; }
    else streak = 0;
    scoreEl.textContent  = score;
    streakEl.textContent = streak;
    checkFireLevel();
    setTimeout(() => { idx++; renderQ(); }, 500);
  } else {
    btn.classList.add('wrong');
    firstTry = false;
    streak = 0;
    streakEl.textContent = 0;
    U.playSFX('fart');
    U.showBurst('ng');
    checkFireLevel();
    setTimeout(() => { locked = false; renderQ(); }, 500);
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
  setTimeout(() => { locked = false; renderQ(); }, 520);
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
  const msg = U.getResultMsg(score);
  document.getElementById('vs-rmsg').textContent   = msg.jp;
  document.getElementById('vs-rscore').textContent = `${score} / 15`;
  if (score === 15) U.confetti(results, 120);
  const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
  snd.setAttribute('playsinline', ''); snd.play().catch(() => {});
}

document.getElementById('vs-replay').addEventListener('click', () => {
  results.classList.remove('show');
  idx = 0; score = 0; streak = 0; lastLvl = 0;
  scoreEl.textContent = 0; streakEl.textContent = 0;
  banner.classList.add('hide');
  U.shuffle(order);
  renderQ();
});
document.getElementById('vs-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

renderQ();

})();
