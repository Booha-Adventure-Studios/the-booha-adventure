
/* ══════════════════════════════════════════════════════════════
   sentence-speed.js  —  Sentence Speed
   JP sentence → pick the English. Heat bar timer. Fire streaks.
   Same engine as vocab-speed, adapted for sentences.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Sentence Speed');
U.unlockAudio();

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

U.mount(`
  <div style="max-width:680px;margin:0 auto;padding:0 1rem 3rem;">

    <div class="game-hud">
      <div class="hud-pill">Q <b id="ss-qnum">1</b>/15</div>
      <div class="hud-pill">Score <b id="ss-score">0</b></div>
      <div class="hud-pill">🔥 <b id="ss-streak">0</b></div>
    </div>

    <div class="heat-track" style="margin:0.5rem 1rem;">
      <div class="heat-fill" id="ss-heat"></div>
    </div>

    <!-- JP prompt card -->
    <div class="game-card" style="text-align:center;padding:1.5rem 1rem;margin:1rem 0;">
      <div id="ss-jp"   style="font-family:var(--game-font-jp);font-weight:900;font-size:clamp(18px,4.5vw,28px);line-height:1.4;"></div>
      <div id="ss-hira" style="font-family:var(--game-font-jp);font-size:clamp(13px,3vw,18px);color:var(--game-muted);margin-top:6px;"></div>
    </div>

    <!-- EN choices stacked (sentences are long) -->
    <div id="ss-grid" style="display:flex;flex-direction:column;gap:10px;"></div>

    <!-- Fire banner -->
    <div id="ss-banner" class="hide" style="text-align:center;margin-top:1rem;padding:12px;border-radius:16px;background:rgba(255,209,102,0.12);border:1px solid rgba(255,209,102,0.3);">
      <div id="ss-banner-en" style="font-family:var(--game-font-title);font-size:clamp(16px,3.5vw,24px);color:#ffd166;"></div>
      <div id="ss-banner-jp" style="font-family:var(--game-font-jp);font-size:clamp(13px,2.8vw,18px);margin-top:4px;"></div>
    </div>

    <div id="ss-results" class="results-panel">
      <div class="results-msg"   id="ss-rmsg"></div>
      <div class="results-score" id="ss-rscore"></div>
      <div class="results-actions">
        <button class="game-btn game-btn-primary"   id="ss-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="ss-back">メニューへ</button>
      </div>
    </div>
  </div>
`);

const qnumEl   = document.getElementById('ss-qnum');
const scoreEl  = document.getElementById('ss-score');
const streakEl = document.getElementById('ss-streak');
const heatEl   = document.getElementById('ss-heat');
const jpEl     = document.getElementById('ss-jp');
const hiraEl   = document.getElementById('ss-hira');
const grid     = document.getElementById('ss-grid');
const banner   = document.getElementById('ss-banner');
const bannerEn = document.getElementById('ss-banner-en');
const bannerJp = document.getElementById('ss-banner-jp');
const results  = document.getElementById('ss-results');

const FIRE_MSG = {
  1: { en:"You are awesome!",                     jp:"すごい！" },
  2: { en:"You are even more awesome!",           jp:"もっとすごい！" },
  3: { en:"What? You are the most awesome!",      jp:"えっ！？一番すごい！" },
  4: { en:"You are the smartest person alive!!!", jp:"あなたは世界一かしこい！！！" }
};

function fireLvl(n) {
  if (n >= 15) return 4;
  if (n >= 10) return 3;
  if (n >= 6)  return 2;
  if (n >= 3)  return 1;
  return 0;
}

const order   = U.shuffle(CFG.cards.slice(0, 15));
let idx       = 0;
let score     = 0;
let streak    = 0;
let lastLvl   = 0;
let locked    = false;
let firstTry  = true;
let heatRAF   = 0;
let heatStart = 0;

function getHeatDur() {
  return [6500, 5200, 4200, 3200, 2400][fireLvl(streak)];
}

function stopHeat() { cancelAnimationFrame(heatRAF); heatRAF = 0; }

function startHeat() {
  stopHeat();
  const dur = getHeatDur();
  heatStart = performance.now();
  heatEl.style.transform = 'scaleX(1)';
  const tick = t => {
    if (locked) { heatRAF = requestAnimationFrame(tick); return; }
    const p = 1 - (t - heatStart) / dur;
    heatEl.style.transform = `scaleX(${Math.max(0, p)})`;
    if (p <= 0) { onTimeout(); return; }
    heatRAF = requestAnimationFrame(tick);
  };
  heatRAF = requestAnimationFrame(tick);
}

function renderQ() {
  if (idx >= order.length) { showResults(); return; }
  locked = false; firstTry = true;
  grid.innerHTML = '';

  const card = order[idx];
  qnumEl.textContent  = idx + 1;
  jpEl.textContent    = card.jp;
  hiraEl.textContent  = card.hira || '';

  const pool = order.filter((_, i) => i !== idx);
  const distractors = U.shuffle(pool).slice(0, 3);
  const choices = U.shuffle([card, ...distractors]);

  choices.forEach(c => {
    const btn = document.createElement('div');
    btn.className = 'choice-tile';
    btn.style.padding = '14px 16px';
    btn.innerHTML = `<div class="tile-en" style="font-size:clamp(13px,2.6vw,17px);line-height:1.4;">${c.en}</div>`;
    btn.addEventListener('click', () => pick(btn, c));
    grid.appendChild(btn);
  });

  startHeat();
}

function pick(btn, card) {
  if (locked) return;
  locked = true;
  stopHeat();
  grid.querySelectorAll('.choice-tile').forEach(t => t.classList.add('locked'));

  const correct = card.id === order[idx].id;
  if (correct) {
    btn.classList.add('correct');
    U.showBurst('ok');
    U.playSFX('ding');
    U.confetti(btn);
    if (firstTry) { score++; streak++; }
    else streak = 0;
    scoreEl.textContent  = score;
    streakEl.textContent = streak;
    checkFire();
    setTimeout(() => { idx++; renderQ(); }, 550);
  } else {
    btn.classList.add('wrong');
    firstTry = false;
    streak = 0;
    streakEl.textContent = 0;
    U.playSFX('fart');
    checkFire();
    setTimeout(() => { locked = false; renderQ(); }, 550);
  }
}

function onTimeout() {
  locked = true;
  firstTry = false;
  streak = 0; streakEl.textContent = 0;
  U.playSFX('fart');
  checkFire();
  setTimeout(() => { locked = false; renderQ(); }, 520);
}

function checkFire() {
  const lv = fireLvl(streak);
  if (lv > 0 && lv > lastLvl) {
    lastLvl = lv;
    bannerEn.textContent = FIRE_MSG[lv].en;
    bannerJp.textContent = FIRE_MSG[lv].jp;
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
  document.getElementById('ss-rmsg').textContent   = msg.jp;
  document.getElementById('ss-rscore').textContent = `${score} / 15`;
  if (score === 15) U.confetti(results, 120);
  const snd = new Audio(U.resultSoundFor(score, CFG.sfxBase));
  snd.setAttribute('playsinline', ''); snd.play().catch(() => {});
}

document.getElementById('ss-replay').addEventListener('click', () => {
  results.classList.remove('show');
  idx = 0; score = 0; streak = 0; lastLvl = 0;
  scoreEl.textContent = 0; streakEl.textContent = 0;
  banner.classList.add('hide');
  U.shuffle(order);
  renderQ();
});
document.getElementById('ss-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

renderQ();

})();
