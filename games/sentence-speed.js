
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

/* ══════════════════════════════════════════════════════════════
   INJECT STYLES — scoped to .ss-wrap so vocab-speed is untouched
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `

/* ── heat bar track ── */
.ss-wrap .heat-track{
  height:14px; border-radius:99px; overflow:hidden;
  position:relative;
  background:rgba(255,255,255,.08);
  border:1.5px solid rgba(255,255,255,.1);
}
[data-curriculum="pb"] .ss-wrap .heat-track{
  background:rgba(255,200,50,.08); border-color:rgba(255,180,30,.2);
}

/* ── heat fill — distinct from vocab-speed ──
   vocab-speed BR: chartreuse → gold → magenta
   sentence-speed BR: aqua → electric-blue → violet          */
[data-curriculum="br"] .ss-wrap .heat-fill{
  background:linear-gradient(90deg, #00ffcc 0%, #0099ff 50%, #aa00ff 100%) !important;
}
/* vocab-speed BC: cyan → blue → purple
   sentence-speed BC: amber → blood-orange → crimson          */
[data-curriculum="bc"] .ss-wrap .heat-fill{
  background:linear-gradient(90deg, #ff8800 0%, #ff3300 50%, #cc0055 100%) !important;
}
/* vocab-speed PB: mint → lavender → pink
   sentence-speed PB: yellow → tangerine → hot-pink           */
[data-curriculum="pb"] .ss-wrap .heat-fill{
  background:linear-gradient(90deg, #ffee44 0%, #ff9922 55%, #ff4488 100%) !important;
}

/* shimmer sweep */
.ss-wrap .heat-fill::after{
  content:''; position:absolute; inset:0; border-radius:99px;
  background:linear-gradient(90deg, transparent 20%, rgba(255,255,255,.32) 50%, transparent 80%);
  background-size:200% 100%;
  animation:ssHeatShimmer 1.4s linear infinite;
  pointer-events:none;
}
@keyframes ssHeatShimmer{ from{ background-position:200% 0; } to{ background-position:-200% 0; } }

/* ── banner — electric teal/cyan/lightning palette
   vocab-speed uses amber → orange → gold fire
   sentence-speed uses teal → cyan → electric-white           ── */
#ss-banner{
  display:none;
  text-align:center; margin-top:1rem; padding:12px 20px;
  border-radius:20px; overflow:hidden; position:relative;
  border:2px solid var(--ss-bb, rgba(0,230,200,.35));
  background:var(--ss-bg, rgba(0,210,180,.1));
  box-shadow:0 0 28px var(--ss-glow, rgba(0,210,180,.12));
  transition:border-color .4s, background .4s, box-shadow .4s;
}
#ss-banner.show{ display:block; animation:ssBannerIn .38s cubic-bezier(.34,1.56,.64,1); }
@keyframes ssBannerIn{
  from{ transform:scale(.88) translateY(8px); opacity:0; }
  to{   transform:none; opacity:1; }
}
/* level 1 — teal */
#ss-banner.slvl-1{
  --ss-bb:rgba(0,230,200,.4); --ss-bg:rgba(0,210,180,.1); --ss-glow:rgba(0,220,190,.15);
}
/* level 2 — cyan, gentle pulse */
#ss-banner.slvl-2{
  --ss-bb:rgba(0,200,255,.5); --ss-bg:rgba(0,185,255,.12); --ss-glow:rgba(0,200,255,.2);
  animation:ssBannerIn .38s cubic-bezier(.34,1.56,.64,1), ssBannerPulse2 2.2s ease-in-out infinite;
}
@keyframes ssBannerPulse2{
  0%,100%{ box-shadow:0 0 28px rgba(0,200,255,.2); }
  50%{     box-shadow:0 0 54px rgba(0,200,255,.5); }
}
/* level 3 — electric blue, faster pulse */
#ss-banner.slvl-3{
  --ss-bb:rgba(60,140,255,.65); --ss-bg:rgba(40,110,255,.14); --ss-glow:rgba(60,140,255,.28);
  animation:ssBannerIn .38s cubic-bezier(.34,1.56,.64,1), ssBannerPulse3 1.4s ease-in-out infinite;
}
@keyframes ssBannerPulse3{
  0%,100%{ box-shadow:0 0 40px rgba(60,140,255,.3), 0 0 80px rgba(60,140,255,.1); }
  50%{     box-shadow:0 0 72px rgba(60,140,255,.65), 0 0 120px rgba(60,140,255,.25); }
}
/* level 4 — lightning white, rapid flare */
#ss-banner.slvl-4{
  --ss-bb:rgba(180,240,255,.9); --ss-bg:rgba(160,230,255,.18); --ss-glow:rgba(180,240,255,.45);
  animation:ssBannerIn .38s cubic-bezier(.34,1.56,.64,1), ssBannerFlare .8s ease-in-out infinite;
}
@keyframes ssBannerFlare{
  0%,100%{ box-shadow:0 0 60px rgba(100,220,255,.55), 0 0 110px rgba(60,180,255,.2); border-color:rgba(180,240,255,.9); }
  50%{     box-shadow:0 0 100px rgba(180,240,255,1),  0 0 160px rgba(100,220,255,.45); border-color:#ffffff; }
}

/* banner text */
#ss-banner .ss-banner-en{
  font-family:var(--game-font-title);
  font-size:clamp(16px,3.2vw,24px); font-weight:900; line-height:1.1;
  color:#44eedd;
  text-shadow:0 0 14px rgba(0,220,200,.35);
}
#ss-banner.slvl-2 .ss-banner-en{ color:#44ccff; text-shadow:0 0 16px rgba(0,200,255,.45); }
#ss-banner.slvl-3 .ss-banner-en{ color:#88aaff; text-shadow:0 0 20px rgba(80,140,255,.55); }
#ss-banner.slvl-4 .ss-banner-en{
  color:#e8f8ff;
  text-shadow:0 0 24px rgba(180,240,255,.9), 0 0 50px rgba(100,200,255,.5);
  animation:ssBannerTextFlicker .7s ease-in-out infinite;
}
@keyframes ssBannerTextFlicker{
  0%,100%{ opacity:1; } 45%{ opacity:.82; } 55%{ opacity:1; }
}
#ss-banner .ss-banner-jp{
  margin-top:3px; font-family:var(--game-font-jp);
  font-size:clamp(12px,2.2vw,16px); color:var(--game-ink);
}
[data-curriculum="pb"] #ss-banner .ss-banner-jp{ color:#2a1020; }

/* PB banner: softens to warm candy (PB is a light bg, electric teal doesn't fit) */
[data-curriculum="pb"] #ss-banner.slvl-1{ --ss-bb:rgba(255,170,50,.4);  --ss-bg:rgba(255,160,30,.1);  --ss-glow:rgba(255,170,50,.15); }
[data-curriculum="pb"] #ss-banner.slvl-2{ --ss-bb:rgba(255,100,180,.5); --ss-bg:rgba(255,80,160,.12); --ss-glow:rgba(255,100,180,.22); }
[data-curriculum="pb"] #ss-banner.slvl-3{ --ss-bb:rgba(180,80,255,.6);  --ss-bg:rgba(160,60,255,.13); --ss-glow:rgba(180,80,255,.28); }
[data-curriculum="pb"] #ss-banner.slvl-4{ --ss-bb:rgba(255,200,0,.8);   --ss-bg:rgba(255,190,0,.18);  --ss-glow:rgba(255,200,0,.4); }
[data-curriculum="pb"] #ss-banner.slvl-1 .ss-banner-en{ color:#ff9922; text-shadow:none; }
[data-curriculum="pb"] #ss-banner.slvl-2 .ss-banner-en{ color:#ff44aa; text-shadow:none; }
[data-curriculum="pb"] #ss-banner.slvl-3 .ss-banner-en{ color:#aa44ff; text-shadow:none; }
[data-curriculum="pb"] #ss-banner.slvl-4 .ss-banner-en{ color:#cc8800; text-shadow:none; animation:none; }
`;
document.head.appendChild(S);

U.mount(`
  <div class="ss-wrap" style="max-width:680px;margin:0 auto;padding:0 1rem 3rem;">

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
    <div id="ss-banner" class="hide">
      <div id="ss-banner-en" class="ss-banner-en"></div>
      <div id="ss-banner-jp" class="ss-banner-jp"></div>
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
    banner.className = `show slvl-${lv}`;
  } else if (lv === 0) {
    lastLvl = 0;
    banner.className = 'hide';
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
  banner.className = 'hide';
  U.shuffle(order);
  renderQ();
});
document.getElementById('ss-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

renderQ();

})();
