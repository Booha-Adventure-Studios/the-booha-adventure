
/* ══════════════════════════════════════════════════════════════
   vocab-speed.js — Vocabulary Speed  v3
   JP prompt → pick the correct English word. Heat-bar timer.
   3 curricula: br / pb / bc — themed per context.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.unlockAudio();

/* ══════════════════════════════════════════════════════════════
   AUDIO
   ══════════════════════════════════════════════════════════════ */
await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

let activeLvl4 = null;

function playFireSound(level) {
  if (level >= 4) {
    stopLvl4();
    const a = new Audio(CFG.sfxBase + 'level4.mp3');
    a.setAttribute('playsinline', ''); a.loop = false;
    a.play().catch(() => {});
    activeLvl4 = a;
    a.onended = () => { if (activeLvl4 === a) activeLvl4 = null; };
    return;
  }
  const a = new Audio(CFG.sfxBase + 'fire.mp3');
  a.setAttribute('playsinline', ''); a.loop = false;
  a.play().catch(() => {});
}

function stopLvl4() {
  if (!activeLvl4) return;
  try { activeLvl4.pause(); activeLvl4.currentTime = 0; } catch {}
  activeLvl4 = null;
}

function stopStreakAudio() { stopLvl4(); }

let audioUnlocked = false;
function unlockAllAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
}
document.addEventListener('touchstart', unlockAllAudio, { once: true, passive: true });
document.addEventListener('mousedown',  unlockAllAudio, { once: true, passive: true });

let lastPickAt = 0;
const PICK_DEBOUNCE_MS = 320;

/* ══════════════════════════════════════════════════════════════
   DATA / TIERS
   ══════════════════════════════════════════════════════════════ */
const TIERS = [
  { min:0,  max:5,  sound:'result_0-5.mp3',
    label:'TRY AGAIN', en:"Rough start — but you've got this!",
    jp:'もう一回やってみよう！', kanji:'もう一回挑戦！',
    color:'#ef4444', glow:'rgba(239,68,68,0.4)' },
  { min:6,  max:10, sound:'result_6-10.mp3',
    label:'KEEP GOING', en:'Nice effort. You are getting stronger!',
    jp:'いい感じ！どんどん上手！', kanji:'良い調子！どんどん上達！',
    color:'#f97316', glow:'rgba(249,115,22,0.4)' },
  { min:11, max:14, sound:'result_11-14.mp3',
    label:'SO CLOSE!', en:'Almost perfect. Really strong work!',
    jp:'おしい！すごく上手！', kanji:'惜しい！とても上手！',
    color:'#22ddff', glow:'rgba(34,221,255,0.4)' },
  { min:15, max:15, sound:'result_15.mp3',
    label:'PERFECT!', en:'Flawless! Every single word!',
    jp:'パーフェクト！全問正解！', kanji:'完璧！全問正解！',
    color:'#ffcc00', glow:'rgba(255,204,0,0.5)' },
];
const getTier = s => TIERS.find(t => s >= t.min && s <= t.max) ?? TIERS[0];

const STREAK_LEVELS = [
  { min:0, max:2, level:0 },
  { min:3, max:3, level:1 },
  { min:4, max:4, level:2 },
  { min:5, max:5, level:3 },
  { min:6, max:99, level:4 },
];
function getStreakLevel(s) {
  return (STREAK_LEVELS.find(t => s >= t.min && s <= t.max) ?? STREAK_LEVELS[0]).level;
}

const STREAK_MSG = {
  1: { en:'Great start! Keep going!',        jp:'いいね！続けよう！',         kanji:'好調！続けよう！' },
  2: { en:"On fire! You're on a roll!",      jp:'すごい！どんどんいこう！',    kanji:'絶好調！どんどん行こう！' },
  3: { en:'Unstoppable! Amazing speed!',     jp:'止まらない！スピードすごい！', kanji:'止まらない！驚異の速さ！' },
  4: { en:'LEGENDARY! You are the fastest!', jp:'最強！世界一速い！',          kanji:'最強！世界最速！' },
};

const HEAT_DURATIONS = [5000, 4200, 3200, 2400, 1600];

/* ══════════════════════════════════════════════════════════════
   LABEL HELPERS
   ══════════════════════════════════════════════════════════════ */
function curriculumLabel() {
  const c = document.documentElement.dataset.curriculum || CFG.curriculum || '';
  if (c === 'pb') return 'PRE-BOO';
  if (c === 'bc') return 'BOO-CONTINUUM';
  return 'BOO-RICULUM';
}
function titleDateLabel() {
  if (CFG.weekLabel) return CFG.weekLabel;
  const wp = String(CFG.weekParam || '');
  const m = wp.match(/_(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)_w([1-4])/i);
  if (!m) return 'This Week';
  const MM = {jan:'January',feb:'February',mar:'March',apr:'April',
    may:'May',jun:'June',jul:'July',aug:'August',
    sep:'September',oct:'October',nov:'November',dec:'December'};
  return `${MM[m[1].toLowerCase()]} Week ${m[2]}`;
}

const curriculum = document.documentElement.dataset.curriculum || CFG.curriculum || 'br';

/* ══════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `

/* ── base ── */
.game-header{ display:none !important; }
.vs-wrap{
  position:relative; z-index:1;
  max-width:900px; margin:0 auto;
  padding:0 1rem 6rem;
}

/* ══════════════════════════════════════════════════════════════
   START OVERLAY
   ══════════════════════════════════════════════════════════════ */
.vs-start-overlay{
  position:fixed; inset:0; z-index:1000;
  display:flex; align-items:center; justify-content:center;
  background:var(--game-bg);
  padding:1rem;
  transition:opacity .35s ease;
}
.vs-start-overlay.hiding{
  opacity:0; pointer-events:none;
}
.vs-start-card{
  max-width:480px; width:100%;
  border-radius:32px; overflow:hidden;
  background:var(--game-surface);
  border:2px solid var(--game-primary);
  box-shadow:
    0 0 60px color-mix(in srgb, var(--game-primary) 28%, transparent),
    0 24px 48px rgba(0,0,0,.45);
  text-align:center;
}
[data-curriculum="pb"] .vs-start-card{
  background:#fff8fc; border-color:#ff6eb4;
  box-shadow:0 8px 0 #ffb0d8, 0 20px 40px rgba(255,110,180,.2);
}
[data-curriculum="bc"] .vs-start-card{
  background:#030810; border-color:rgba(0,240,255,.5);
  box-shadow:0 0 60px rgba(0,240,255,.15), 0 24px 48px rgba(0,0,0,.6);
}
.vs-start-header{
  padding:1.6rem 1.4rem 1rem;
  background:linear-gradient(135deg,
    color-mix(in srgb, var(--game-primary) 14%, transparent),
    color-mix(in srgb, var(--game-secondary) 8%, transparent));
  border-bottom:1px solid var(--game-border);
}
.vs-start-title{
  font-family:var(--game-font-title);
  font-size:clamp(28px,6vw,48px);
  font-weight:900; letter-spacing:.1em;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:vsRainbow 3s linear infinite;
}
[data-curriculum="bc"] .vs-start-title{
  background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);
  background-size:220% auto;
  -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .vs-start-title{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto;
  -webkit-background-clip:text; background-clip:text;
}
.vs-start-subtitle{
  font-family:var(--game-font-jp);
  font-size:clamp(12px,2vw,15px);
  color:var(--game-muted); margin-top:6px;
}
[data-curriculum="pb"] .vs-start-subtitle{ color:rgba(58,26,46,.5); }

.vs-start-body{ padding:1.2rem 1.4rem 1.6rem; }
.vs-start-step{
  display:grid; grid-template-columns:32px 1fr;
  gap:10px; align-items:start; margin-bottom:.85rem; text-align:left;
}
.vs-start-step:last-of-type{ margin-bottom:0; }
.vs-start-num{
  width:32px; height:32px; border-radius:50%;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000; font-family:var(--game-font-title);
  font-size:clamp(13px,2.2vw,16px); font-weight:900;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
  box-shadow:0 0 10px color-mix(in srgb, var(--game-primary) 45%, transparent);
}
.vs-start-en{
  font-family:var(--game-font-body);
  font-size:clamp(13px,2.2vw,15px); font-weight:800;
  color:var(--game-ink); line-height:1.35; padding-top:2px;
}
[data-curriculum="pb"] .vs-start-en{ color:#2a1020; }
.vs-start-jp{
  font-family:var(--game-font-jp);
  font-size:clamp(11px,1.8vw,13px); color:var(--game-muted); margin-top:2px;
}
[data-curriculum="pb"] .vs-start-jp{ color:rgba(58,26,46,.5); }

.vs-start-btn{
  display:block; width:calc(100% - 2.8rem);
  margin:1.3rem 1.4rem 0;
  font-family:var(--game-font-title);
  font-size:clamp(18px,3.8vw,26px); letter-spacing:.1em;
  padding:16px 24px; border:none; border-radius:999px;
  cursor:pointer; position:relative; overflow:hidden;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:
    0 0 32px color-mix(in srgb, var(--game-primary) 55%, transparent),
    0 5px 0 color-mix(in srgb, var(--game-primary) 40%, #000),
    0 10px 24px rgba(0,0,0,.3);
  transition:transform .15s, box-shadow .15s;
  -webkit-tap-highlight-color:transparent;
  margin-bottom:1.6rem;
}
.vs-start-btn::after{
  content:''; position:absolute; top:-50%; left:-80%;
  width:48%; height:200%;
  background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.3) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .5s ease; pointer-events:none;
}
.vs-start-btn:hover::after{ left:150%; }
.vs-start-btn:hover{
  transform:translateY(-3px) scale(1.03);
  box-shadow:
    0 0 44px color-mix(in srgb, var(--game-primary) 65%, transparent),
    0 7px 0 color-mix(in srgb, var(--game-primary) 40%, #000),
    0 14px 30px rgba(0,0,0,.35);
}
.vs-start-btn:active{ transform:scale(.96); }

/* ── header ── */
.vs-header{ text-align:center; padding:.6rem 3rem .8rem; }
.vs-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(28px,6vw,52px);
  font-weight:900; letter-spacing:.12em; text-transform:uppercase;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text; animation:vsRainbow 3s linear infinite;
}
[data-curriculum="bc"] .vs-curriculum{
  background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);
  background-size:220% auto;
  -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .vs-curriculum{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto;
  -webkit-background-clip:text; background-clip:text;
}
@keyframes vsRainbow{ to{ background-position:220% center; } }

.vs-date{
  margin-top:4px; font-family:var(--game-font-body);
  font-size:clamp(12px,2.2vw,16px); font-weight:800;
  color:var(--game-muted); letter-spacing:.06em;
}
[data-curriculum="pb"] .vs-date{ color:rgba(58,26,46,.55); }

/* ── progress dots ── */
.vs-dots-row{
  display:flex; justify-content:center; gap:6px;
  margin:.4rem 0; flex-wrap:wrap;
}
.vs-dot{
  width:10px; height:10px; border-radius:50%;
  background:rgba(255,255,255,.12); border:1.5px solid rgba(255,255,255,.18);
  transition:all .3s; flex-shrink:0;
}
.vs-dot.active{
  background:var(--game-primary); border-color:var(--game-primary);
  box-shadow:0 0 8px var(--game-primary);
}
.vs-dot.done{
  background:#22c55e; border-color:#22c55e;
  box-shadow:0 0 8px rgba(34,197,94,.7);
}
[data-curriculum="pb"] .vs-dot{
  background:rgba(255,110,180,.15); border-color:rgba(255,110,180,.28);
}

/* ── HUD pills ── */
.vs-hud{
  display:flex; justify-content:center; gap:10px;
  flex-wrap:wrap; margin-bottom:.5rem;
}
.vs-pill{
  padding:6px 18px; border-radius:999px;
  background:var(--game-pill-bg); border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text);
  font-size:clamp(13px,2.2vw,16px); font-weight:900; letter-spacing:.03em;
  box-shadow:0 2px 12px rgba(0,0,0,.2);
}
.vs-pill b{ color:var(--game-primary); font-size:1.1em; text-shadow:0 0 10px var(--game-primary); }
[data-curriculum="pb"] .vs-pill{
  background:#fff; border-color:#ffb0d8; color:#2a1020;
  box-shadow:0 3px 0 #ffccdd;
}
[data-curriculum="pb"] .vs-pill b{ text-shadow:none; }

.vs-streak-pill{
  padding:6px 20px; border-radius:999px;
  background:color-mix(in srgb, var(--streak-color,var(--game-primary)) 14%, var(--game-pill-bg));
  border:1.5px solid color-mix(in srgb, var(--streak-color,var(--game-primary)) 55%, transparent);
  color:var(--game-pill-text);
  font-size:clamp(13px,2.2vw,16px); font-weight:900;
  box-shadow:0 0 14px color-mix(in srgb, var(--streak-color,var(--game-primary)) 30%, transparent);
  transition:background .4s, border-color .4s, box-shadow .4s;
}
.vs-streak-pill b{
  color:var(--streak-color, var(--game-primary));
  font-size:1.1em;
  text-shadow:0 0 10px color-mix(in srgb, var(--streak-color,var(--game-primary)) 60%, transparent);
  transition:color .4s, text-shadow .4s;
}
[data-curriculum="pb"] .vs-streak-pill{
  background:#fff; border-color:var(--streak-color,#ff6eb4);
  box-shadow:0 3px 0 #ffccdd;
}

/* ══════════════════════════════════════════════════════════════
   HEAT TIMER BAR
   ══════════════════════════════════════════════════════════════ */
.vs-timer-wrap{
  padding:0 .25rem; margin-bottom:.6rem;
}
.vs-timer-label{
  text-align:center;
  font-family:var(--game-font-body);
  font-size:clamp(9px,1.6vw,11px); font-weight:800;
  letter-spacing:.18em; text-transform:uppercase;
  color:var(--game-muted); margin-bottom:6px;
}
[data-curriculum="pb"] .vs-timer-label{ color:rgba(58,26,46,.45); }
.vs-timer-track{
  height:14px; border-radius:99px; overflow:hidden;
  background:rgba(255,255,255,.08);
  border:1.5px solid rgba(255,255,255,.1);
  position:relative;
}
[data-curriculum="pb"] .vs-timer-track{
  background:rgba(255,110,180,.08); border-color:rgba(255,110,180,.2);
}
.vs-timer-fill{
  height:100%; border-radius:99px;
  transform-origin:left center;
  transition:background .5s;
  position:relative;
  overflow:hidden;
}
.vs-timer-fill{
  background:linear-gradient(90deg,
    var(--timer-lo, #22c55e) 0%,
    var(--timer-mid, #ffcc00) 55%,
    var(--timer-hi, #ef4444) 100%
  );
}
[data-curriculum="br"] .vs-timer-fill{
  --timer-lo:#aaff22; --timer-mid:#ffcc00; --timer-hi:#ff2288;
}
[data-curriculum="bc"] .vs-timer-fill{
  --timer-lo:#22ddff; --timer-mid:#4455ff; --timer-hi:#cc00ff;
}
[data-curriculum="pb"] .vs-timer-fill{
  --timer-lo:#44ddaa; --timer-mid:#cc88ff; --timer-hi:#ff6eb4;
}
.vs-timer-fill::after{
  content:''; position:absolute; inset:0;
  background:linear-gradient(90deg, transparent 20%, rgba(255,255,255,.3) 50%, transparent 80%);
  background-size:200% 100%;
  animation:vsTimerShimmer 1.4s linear infinite;
}
@keyframes vsTimerShimmer{ from{ background-position:200% 0; } to{ background-position:-200% 0; } }

.vs-timer-fill.warning{
  animation:vsTimerPulse .55s ease-in-out infinite;
}
@keyframes vsTimerPulse{
  0%,100%{ filter:brightness(1); }
  50%{ filter:brightness(1.5) saturate(1.6); }
}

/* ══════════════════════════════════════════════════════════════
   JP PROMPT BOX
   ══════════════════════════════════════════════════════════════ */
.vs-prompt-box{
  border-radius:28px; padding:1.4rem 1.4rem 1.2rem;
  margin:0 0 1rem;
  text-align:center; position:relative; overflow:hidden;
  background:var(--game-surface); border:2px solid var(--game-border);
  backdrop-filter:blur(14px);
  box-shadow:0 8px 32px rgba(0,0,0,.22);
  transition:border-color .4s, box-shadow .4s, background .4s;
}
[data-curriculum="br"] .vs-prompt-box{
  background:linear-gradient(145deg,rgba(170,255,34,.07),rgba(255,204,0,.04),rgba(0,0,0,.18));
  border-color:rgba(170,255,34,.22);
  box-shadow:0 8px 32px rgba(0,0,0,.35),0 0 0 1px rgba(170,255,34,.08);
}
[data-curriculum="bc"] .vs-prompt-box{
  background:linear-gradient(145deg,rgba(0,240,255,.06),rgba(68,85,255,.08),rgba(0,0,0,.28));
  border-color:rgba(0,240,255,.22);
  box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 24px rgba(0,240,255,.08);
}
[data-curriculum="pb"] .vs-prompt-box{
  background:#ffffff; border:3px solid #ff6eb4;
  box-shadow:0 5px 0 #ffb0d8, 0 10px 24px rgba(255,110,180,.15);
}
.vs-prompt-box::before{
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto; animation:vsRainbow 2.4s linear infinite;
}
[data-curriculum="pb"] .vs-prompt-box::before{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto;
}

.vs-prompt-box.streak-1{ box-shadow:0 8px 32px rgba(255,204,0,.15); }
.vs-prompt-box.streak-2{ box-shadow:0 8px 40px rgba(255,120,0,.22); }
.vs-prompt-box.streak-3{
  animation:vsBoxPulse3 1.8s ease-in-out infinite;
}
.vs-prompt-box.streak-4{
  animation:vsBoxPulse4 .9s ease-in-out infinite;
}
@keyframes vsBoxPulse3{
  0%,100%{ box-shadow:0 8px 40px rgba(255,80,0,.28), 0 0 60px rgba(255,80,0,.08); }
  50%{     box-shadow:0 8px 60px rgba(255,80,0,.5),  0 0 80px rgba(255,80,0,.18); }
}
@keyframes vsBoxPulse4{
  0%,100%{ box-shadow:0 8px 60px rgba(255,200,0,.45), 0 0 100px rgba(255,200,0,.18); border-color:rgba(255,200,0,.5); }
  50%{     box-shadow:0 8px 80px rgba(255,200,0,.8),  0 0 130px rgba(255,200,0,.35); border-color:rgba(255,200,0,.9); }
}

.vs-jp{
  font-family:var(--game-font-jp);
  font-weight:900;
  font-size:clamp(34px,8vw,68px);
  line-height:1.15;
  color:var(--game-ink);
  word-break:keep-all;
}
[data-curriculum="pb"] .vs-jp{ color:#2a1020; }

.vs-hira{
  margin-top:.45rem;
  font-family:var(--game-font-jp);
  font-size:clamp(15px,2.8vw,22px);
  color:var(--game-muted);
}
[data-curriculum="pb"] .vs-hira{ color:rgba(58,26,46,.55); }

/* ══════════════════════════════════════════════════════════════
   CHOICE GRID
   ══════════════════════════════════════════════════════════════ */
.vs-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px;
  margin-bottom:.8rem;
}
@media(max-width:560px){ .vs-grid{ grid-template-columns:1fr; gap:12px; } }

.vs-choice{
  min-height:88px;
  display:flex; align-items:center; justify-content:center;
  text-align:center; padding:.9rem 1rem;
  border-radius:22px;
  font-family:var(--game-font-body);
  font-size:clamp(18px,3vw,28px);
  font-weight:700; line-height:1.15;
  text-transform:lowercase;
  cursor:pointer; user-select:none;
  -webkit-tap-highlight-color:transparent;
  position:relative; overflow:hidden;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, border-color .14s, filter .14s;

  background:linear-gradient(145deg,rgba(255,255,255,.11),rgba(255,255,255,.04));
  border:2px solid rgba(255,255,255,.2);
  color:var(--game-tile-text);
  box-shadow:0 5px 0 rgba(0,0,0,.3), 0 8px 18px rgba(0,0,0,.22),
             inset 0 1px 0 rgba(255,255,255,.12);
}
.vs-choice::after{
  content:''; position:absolute; top:-60%; left:-80%;
  width:50%; height:200%;
  background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.24) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .45s ease; pointer-events:none;
}
.vs-choice:hover::after{ left:150%; }
.vs-choice:hover{
  transform:translateY(-4px) scale(1.03);
  box-shadow:0 9px 0 rgba(0,0,0,.3), 0 14px 24px rgba(0,0,0,.3),
             inset 0 1px 0 rgba(255,255,255,.15);
}
.vs-choice:active{ transform:scale(.94); }

[data-curriculum="br"] .vs-choice[data-ci="0"]{
  background:linear-gradient(145deg,#1e5c00,#2e8800);
  border-color:rgba(170,255,34,.5); color:#fff;
  box-shadow:0 5px 0 rgba(20,80,0,.6), 0 8px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.18);
}
[data-curriculum="br"] .vs-choice[data-ci="1"]{
  background:linear-gradient(145deg,#6a003a,#a0005a);
  border-color:rgba(255,60,160,.5); color:#fff;
  box-shadow:0 5px 0 rgba(100,0,50,.6), 0 8px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.18);
}
[data-curriculum="br"] .vs-choice[data-ci="2"]{
  background:linear-gradient(145deg,#003a44,#005566);
  border-color:rgba(0,200,220,.5); color:#fff;
  box-shadow:0 5px 0 rgba(0,50,60,.6), 0 8px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.18);
}
[data-curriculum="br"] .vs-choice[data-ci="3"]{
  background:linear-gradient(145deg,#2a0060,#440090);
  border-color:rgba(180,100,255,.5); color:#fff;
  box-shadow:0 5px 0 rgba(30,0,80,.6), 0 8px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.18);
}
[data-curriculum="br"] .vs-choice:hover{ filter:brightness(1.14); }

[data-curriculum="bc"] .vs-choice[data-ci="0"]{
  background:linear-gradient(145deg,#041820,#062430);
  border:2px solid rgba(0,230,255,.5); color:#ecfeff;
  box-shadow:0 0 14px rgba(0,230,255,.2), 0 6px 20px rgba(0,0,0,.5);
}
[data-curriculum="bc"] .vs-choice[data-ci="1"]{
  background:linear-gradient(145deg,#04201a,#063028);
  border:2px solid rgba(0,220,160,.5); color:#ecfeff;
  box-shadow:0 0 14px rgba(0,220,160,.18), 0 6px 20px rgba(0,0,0,.5);
}
[data-curriculum="bc"] .vs-choice[data-ci="2"]{
  background:linear-gradient(145deg,#180828,#24103a);
  border:2px solid rgba(170,80,255,.5); color:#ecfeff;
  box-shadow:0 0 14px rgba(170,80,255,.2), 0 6px 20px rgba(0,0,0,.5);
}
[data-curriculum="bc"] .vs-choice[data-ci="3"]{
  background:linear-gradient(145deg,#060a20,#0a1238);
  border:2px solid rgba(80,120,255,.5); color:#ecfeff;
  box-shadow:0 0 14px rgba(80,120,255,.2), 0 6px 20px rgba(0,0,0,.5);
}
[data-curriculum="bc"] .vs-choice:hover{ filter:brightness(1.25); }

[data-curriculum="pb"] .vs-choice{
  background:#ffffff; color:#2a1020;
  box-shadow:0 5px 0 var(--pb-choice-shadow,#ffb0d8), 0 8px 18px rgba(255,110,180,.12);
}
[data-curriculum="pb"] .vs-choice[data-ci="0"]{ border:3px solid #ff6eb4; --pb-choice-shadow:#ffb0d8; }
[data-curriculum="pb"] .vs-choice[data-ci="1"]{ border:3px solid #cc88ff; --pb-choice-shadow:#ddb8ff; }
[data-curriculum="pb"] .vs-choice[data-ci="2"]{ border:3px solid #44ccff; --pb-choice-shadow:#99e8ff; }
[data-curriculum="pb"] .vs-choice[data-ci="3"]{ border:3px solid #ffcc44; --pb-choice-shadow:#ffe088; }
[data-curriculum="pb"] .vs-choice:hover{
  transform:translateY(-5px) scale(1.03);
  box-shadow:0 9px 0 var(--pb-choice-shadow,#ffb0d8), 0 14px 24px rgba(0,0,0,.1);
}

.vs-choice.vs-correct{
  background:linear-gradient(135deg, #0a3d1a, #0d5e28) !important;
  border-color:#22c55e !important;
  color:#22c55e !important;
  box-shadow:
    0 0 0 4px rgba(34,197,94,.3),
    0 0 40px rgba(34,197,94,.55),
    0 6px 24px rgba(0,0,0,.35) !important;
  transform:scale(1.06) !important;
  filter:none !important;
  animation:vsCorrectPop .4s cubic-bezier(.34,1.56,.64,1);
}
[data-curriculum="pb"] .vs-choice.vs-correct{
  background:#f0fff4 !important;
  border-color:#22c55e !important;
  color:#22c55e !important;
  box-shadow:0 0 0 4px rgba(34,197,94,.25), 0 0 30px rgba(34,197,94,.3), 0 5px 0 #86efac !important;
}
@keyframes vsCorrectPop{
  from{ transform:scale(.9); } 60%{ transform:scale(1.1); } to{ transform:scale(1.06); }
}

.vs-choice.vs-wrong{
  background:linear-gradient(135deg, #3d0a0a, #5e1010) !important;
  border-color:#ef4444 !important;
  color:#ef4444 !important;
  box-shadow:
    0 0 0 4px rgba(239,68,68,.3),
    0 0 36px rgba(239,68,68,.55),
    0 6px 24px rgba(0,0,0,.35) !important;
  filter:none !important;
  animation:vsWrongShake .45s ease;
}
[data-curriculum="pb"] .vs-choice.vs-wrong{
  background:#fff5f5 !important;
  border-color:#ef4444 !important;
  color:#ef4444 !important;
  box-shadow:0 0 0 4px rgba(239,68,68,.2), 0 0 24px rgba(239,68,68,.25), 0 5px 0 #fca5a5 !important;
}
@keyframes vsWrongShake{
  0%,100%{ transform:translateX(0); }
  15%{ transform:translateX(-8px); } 35%{ transform:translateX(8px); }
  55%{ transform:translateX(-5px); } 75%{ transform:translateX(5px); }
}

.vs-choice.vs-locked{
  opacity:.42;
  pointer-events:none;
  transform:none !important;
}

/* ══════════════════════════════════════════════════════════════
   STREAK BANNER
   ══════════════════════════════════════════════════════════════ */
.vs-streak-banner{
  max-width:680px; margin:.7rem auto 0;
  padding:12px 20px; border-radius:20px;
  text-align:center; overflow:hidden; position:relative;
  border:2px solid var(--banner-border, rgba(255,204,0,.35));
  background:var(--banner-bg, rgba(255,204,0,.1));
  box-shadow:0 0 28px var(--banner-glow, rgba(255,204,0,.12));
  transition:border-color .4s, background .4s, box-shadow .4s;
  display:none;
}
.vs-streak-banner.show{ display:block; animation:vsBannerIn .38s cubic-bezier(.34,1.56,.64,1); }
@keyframes vsBannerIn{
  from{ transform:scale(.88) translateY(8px); opacity:0; }
  to{ transform:none; opacity:1; }
}
.vs-streak-banner.slvl-1{
  --banner-border:rgba(255,204,0,.4);
  --banner-bg:rgba(255,204,0,.1);
  --banner-glow:rgba(255,204,0,.15);
}
.vs-streak-banner.slvl-2{
  --banner-border:rgba(255,120,0,.5);
  --banner-bg:rgba(255,120,0,.12);
  --banner-glow:rgba(255,120,0,.2);
  animation:vsBannerPulse2 2.2s ease-in-out infinite;
}
@keyframes vsBannerPulse2{
  0%,100%{ box-shadow:0 0 28px rgba(255,120,0,.2); }
  50%{     box-shadow:0 0 50px rgba(255,120,0,.45); }
}
.vs-streak-banner.slvl-3{
  --banner-border:rgba(255,60,0,.6);
  --banner-bg:rgba(255,60,0,.13);
  --banner-glow:rgba(255,60,0,.25);
  animation:vsBannerPulse3 1.4s ease-in-out infinite;
}
@keyframes vsBannerPulse3{
  0%,100%{ box-shadow:0 0 40px rgba(255,60,0,.3), 0 0 80px rgba(255,60,0,.1); }
  50%{     box-shadow:0 0 70px rgba(255,60,0,.6), 0 0 110px rgba(255,60,0,.25); }
}
.vs-streak-banner.slvl-4{
  --banner-border:rgba(255,200,0,.8);
  --banner-bg:rgba(255,180,0,.18);
  --banner-glow:rgba(255,200,0,.4);
  animation:vsBannerFlare 0.8s ease-in-out infinite;
}
@keyframes vsBannerFlare{
  0%,100%{ box-shadow:0 0 60px rgba(255,200,0,.5), 0 0 110px rgba(255,100,0,.2); border-color:rgba(255,200,0,.8); }
  50%{     box-shadow:0 0 100px rgba(255,200,0,.9),0 0 160px rgba(255,100,0,.4); border-color:rgba(255,255,100,1); }
}
.vs-banner-en{
  font-family:var(--game-font-title);
  font-size:clamp(16px,3.2vw,24px);
  font-weight:900; line-height:1.1;
  color:var(--banner-text, #ffd166);
  text-shadow:0 0 14px rgba(255,209,102,.3);
}
.vs-streak-banner.slvl-3 .vs-banner-en{ color:#ff8822; text-shadow:0 0 20px rgba(255,120,0,.5); }
.vs-streak-banner.slvl-4 .vs-banner-en{
  color:#ffe000;
  text-shadow:0 0 24px rgba(255,224,0,.8), 0 0 48px rgba(255,100,0,.4);
  animation:vsTextFlicker .7s ease-in-out infinite;
}
@keyframes vsTextFlicker{
  0%,100%{ opacity:1; } 45%{ opacity:.85; } 55%{ opacity:1; }
}
.vs-banner-jp{
  margin-top:3px; font-family:var(--game-font-jp);
  font-size:clamp(12px,2.2vw,16px); color:var(--game-ink);
}
.vs-banner-kanji{
  font-family:var(--game-font-jp);
  font-size:clamp(10px,1.8vw,13px); color:var(--game-muted); margin-top:1px;
}
[data-curriculum="pb"] .vs-banner-jp{ color:#2a1020; }
[data-curriculum="pb"] .vs-banner-kanji{ color:rgba(58,26,46,.5); }

/* ── CLOSE / X button ── */
.game-close{
  position:fixed; top:1rem; right:1rem; z-index:50;
  width:50px; height:50px; border-radius:50%;
  background:rgba(255,255,255,.1); border:2px solid rgba(255,255,255,.22);
  color:#fff; font-size:1.25rem;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; backdrop-filter:blur(10px);
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
  text-decoration:none; font-weight:900;
  box-shadow:0 4px 16px rgba(0,0,0,.25);
  -webkit-tap-highlight-color:transparent;
}
.game-close:hover{
  background:rgba(239,68,68,.55); border-color:rgba(239,68,68,.7);
  transform:scale(1.18) rotate(12deg);
  box-shadow:0 0 22px rgba(239,68,68,.45), 0 6px 20px rgba(0,0,0,.3);
}
.game-close:active{ transform:scale(.9) rotate(0deg); }
[data-curriculum="pb"] .game-close{
  background:#fff; border:3px solid #ff6eb4; color:#ff6eb4;
  box-shadow:0 4px 0 #ffb0d8;
}
[data-curriculum="pb"] .game-close:hover{
  background:#fff0f8; transform:rotate(15deg) scale(1.18);
  box-shadow:0 4px 0 #ffb0d8, 0 0 16px rgba(255,110,180,.4);
}
[data-curriculum="bc"] .game-close{ border-color:rgba(0,240,255,.22); }
[data-curriculum="bc"] .game-close:hover{
  background:rgba(0,240,255,.14); border-color:#00f0ff;
  box-shadow:0 0 24px rgba(0,240,255,.4); transform:scale(1.12) rotate(10deg);
}

/* ── help button ── */
.vs-help-btn{
  width:46px; height:46px; border-radius:50%;
  border:2px solid var(--game-border);
  background:var(--game-surface);
  color:var(--game-muted); font-size:1.3rem; font-weight:900;
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .2s; flex-shrink:0;
  position:fixed; bottom:1.5rem; right:1rem; z-index:40;
  box-shadow:0 4px 16px rgba(0,0,0,.2);
  -webkit-tap-highlight-color:transparent;
}
.vs-help-btn:hover{
  border-color:var(--game-primary); color:var(--game-primary);
  box-shadow:0 0 14px color-mix(in srgb, var(--game-primary) 40%, transparent);
  transform:scale(1.08);
}
[data-curriculum="pb"] .vs-help-btn{
  background:#fff; border-color:#cc88ff; color:#aa44cc;
  box-shadow:0 3px 0 #ddb8ff;
}

/* ══════════════════════════════════════════════════════════════
   HOW TO PLAY MODAL
   ══════════════════════════════════════════════════════════════ */
.vs-modal-overlay{
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,.72); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  opacity:0; pointer-events:none; transition:opacity .25s;
}
.vs-modal-overlay.open{ opacity:1; pointer-events:all; }
.vs-modal{
  max-width:480px; width:calc(100% - 2rem);
  border-radius:28px; overflow:hidden;
  background:var(--game-bg); border:2px solid var(--game-primary);
  box-shadow:0 0 48px color-mix(in srgb,var(--game-primary) 30%,transparent), 0 24px 48px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
.vs-modal-overlay.open .vs-modal{ transform:none; }
[data-curriculum="pb"] .vs-modal{ background:#fff8fc; border-color:#ff6eb4; box-shadow:0 8px 0 #ffb0d8, 0 16px 40px rgba(255,110,180,.25); }
[data-curriculum="bc"] .vs-modal{ background:#030810; }
.vs-modal-header{
  padding:1.2rem 1.4rem .8rem;
  background:linear-gradient(135deg,color-mix(in srgb,var(--game-primary) 14%,transparent),color-mix(in srgb,var(--game-secondary) 8%,transparent));
  border-bottom:1px solid var(--game-border); text-align:center;
}
.vs-modal-title{
  font-family:var(--game-font-title);
  font-size:clamp(20px,4vw,26px); letter-spacing:.06em;
  color:var(--game-primary);
  text-shadow:0 0 16px color-mix(in srgb,var(--game-primary) 55%,transparent);
}
[data-curriculum="pb"] .vs-modal-title{ color:#ff6eb4; text-shadow:none; }
.vs-modal-title-jp{ font-family:var(--game-font-jp); font-size:clamp(12px,2vw,15px); color:var(--game-muted); margin-top:4px; }
[data-curriculum="pb"] .vs-modal-title-jp{ color:rgba(58,26,46,.55); }
.vs-modal-body{ padding:1.2rem 1.4rem 1.4rem; }
.vs-how-step{ display:grid; grid-template-columns:36px 1fr; gap:10px; align-items:start; margin-bottom:.9rem; }
.vs-how-step:last-child{ margin-bottom:0; }
.vs-how-num{
  width:36px; height:36px; border-radius:50%;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-family:var(--game-font-title);
  font-size:clamp(14px,2.5vw,18px); font-weight:900;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
  box-shadow:0 0 12px color-mix(in srgb,var(--game-primary) 45%,transparent);
}
.vs-how-en{
  font-family:var(--game-font-body); font-size:clamp(13px,2.2vw,15px);
  font-weight:800; color:var(--game-ink); line-height:1.35; padding-top:2px;
}
[data-curriculum="pb"] .vs-how-en{ color:#2a1020; }
.vs-how-jp{ font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,13px); color:var(--game-muted); margin-top:3px; line-height:1.4; }
[data-curriculum="pb"] .vs-how-jp{ color:rgba(58,26,46,.55); }
.vs-modal-close{
  display:block; width:100%; margin-top:1.1rem;
  font-family:var(--game-font-title);
  font-size:clamp(15px,2.8vw,19px); letter-spacing:.06em;
  padding:12px; border-radius:999px; border:none; cursor:pointer;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:0 0 20px color-mix(in srgb,var(--game-primary) 45%,transparent);
  transition:transform .15s;
}
.vs-modal-close:hover{ transform:scale(1.03); }
.vs-modal-close:active{ transform:scale(.96); }

/* ══════════════════════════════════════════════════════════════
   RESULTS PANEL
   ══════════════════════════════════════════════════════════════ */
.vs-results{
  display:none; text-align:center;
  max-width:560px; margin:1.5rem auto;
  padding:2.6rem 1.6rem 2rem;
  border-radius:32px; position:relative; overflow:hidden;
  border:2.5px solid var(--tier-color, var(--game-primary));
  background:color-mix(in srgb, var(--tier-color,var(--game-primary)) 6%, var(--game-bg));
  box-shadow:0 0 60px color-mix(in srgb,var(--tier-color,var(--game-primary)) 22%,transparent),0 24px 48px rgba(0,0,0,.4);
}
.vs-results.show{ display:block; animation:vsResultIn .55s cubic-bezier(.22,.8,.36,1) both; }
@keyframes vsResultIn{
  from{ opacity:0; transform:scale(.82) translateY(28px); }
  to{ opacity:1; transform:none; }
}
.vs-results::before{
  content:''; position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto; animation:vsRainbow 2.4s linear infinite;
}
.vs-results::after{
  content:''; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(circle at 20% 80%, color-mix(in srgb,var(--tier-color,var(--game-primary)) 12%,transparent) 0%,transparent 50%),
    radial-gradient(circle at 80% 20%, color-mix(in srgb,var(--game-secondary) 8%,transparent) 0%,transparent 50%);
}
.vs-res-inner{ position:relative; z-index:1; }
.vs-res-score{
  font-family:var(--game-font-title); font-size:clamp(62px,16vw,98px);
  line-height:1; color:var(--tier-color,var(--game-primary));
  text-shadow:0 0 28px var(--tier-color,var(--game-primary)); margin-bottom:4px;
  animation:vsScorePop .55s cubic-bezier(.22,.8,.36,1) .3s both;
}
@keyframes vsScorePop{
  from{ transform:scale(.55) rotate(-6deg); opacity:0; }
  50%{ transform:scale(1.08) rotate(2deg); }
  to{ transform:none; opacity:1; }
}
.vs-res-pct{ font-size:clamp(14px,2.6vw,19px); color:var(--game-muted); font-weight:700; margin-bottom:12px; animation:vsFadeUp .4s ease .5s both; }
.vs-res-label{
  font-family:var(--game-font-title); font-size:clamp(26px,5.5vw,40px);
  color:var(--tier-color,var(--game-primary)); margin-bottom:10px; letter-spacing:.05em;
  text-shadow:0 0 18px color-mix(in srgb,var(--tier-color,var(--game-primary)) 55%,transparent);
  animation:vsFadeUp .4s ease .52s both;
}
.vs-res-divider{
  width:60px; height:3px; border-radius:99px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary));
  margin:0 auto 12px; opacity:.6; animation:vsFadeUp .4s ease .56s both;
}
.vs-res-en{ font-family:var(--game-font-body); font-weight:900; font-size:clamp(14px,2.4vw,18px); color:var(--game-ink); margin-bottom:4px; animation:vsFadeUp .4s ease .6s both; }
.vs-res-jp{ font-family:var(--game-font-jp); font-size:clamp(14px,2.2vw,17px); color:var(--game-muted); margin-bottom:3px; animation:vsFadeUp .4s ease .64s both; }
.vs-res-kanji{ font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,14px); color:var(--game-muted); opacity:.7; margin-bottom:1.4rem; animation:vsFadeUp .4s ease .68s both; }
.vs-res-actions{ display:flex; gap:12px; justify-content:center; flex-wrap:wrap; animation:vsFadeUp .4s ease .76s both; }
@keyframes vsFadeUp{ from{ transform:translateY(14px); opacity:0; } to{ transform:none; opacity:1; } }

/* confetti pieces */
@keyframes vsConfetti{
  0%{ transform:translate(0,0) rotate(0deg) scale(1); opacity:1; }
  100%{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; }
}
.vs-confetti-piece{
  position:fixed; pointer-events:none; z-index:9999; border-radius:2px;
  animation:vsConfetti 1.1s ease-out forwards;
}
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   MOUNT HTML
   ══════════════════════════════════════════════════════════════ */
U.mount(`
<div class="vs-wrap" id="vs-main-wrap">

  <div class="vs-header">
    <div class="vs-curriculum">${curriculumLabel()}</div>
    <div class="vs-date">${titleDateLabel()}</div>
  </div>

  <div class="vs-dots-row" id="vs-dots"></div>

  <div class="vs-hud">
    <div class="vs-pill">Q <b id="vs-qnum">1</b> / 15</div>
    <div class="vs-pill">Score <b id="vs-score">0</b> / 15</div>
    <div class="vs-streak-pill" id="vs-streak-pill">Streak <b id="vs-streak">0</b></div>
  </div>

  <div class="vs-timer-wrap">
    <div class="vs-timer-label">SPEED TIMER / タイムアタック</div>
    <div class="vs-timer-track">
      <div class="vs-timer-fill" id="vs-heat" style="width:100%"></div>
    </div>
  </div>

  <div class="vs-prompt-box" id="vs-prompt-box">
    <div id="vs-jp"   class="vs-jp"></div>
    <div id="vs-hira" class="vs-hira"></div>
  </div>

  <div id="vs-grid" class="vs-grid"></div>

  <div id="vs-streak-banner" class="vs-streak-banner">
    <div id="vs-banner-en"    class="vs-banner-en"></div>
    <div id="vs-banner-jp"    class="vs-banner-jp"></div>
    <div id="vs-banner-kanji" class="vs-banner-kanji"></div>
  </div>

</div>

<!-- RESULTS — separate from main wrap so header stays visible above it -->
<div class="vs-results" id="vs-results">
  <div class="vs-res-inner">
    <div class="vs-res-score"  id="vs-rs"></div>
    <div class="vs-res-pct"    id="vs-rp"></div>
    <div class="vs-res-label"  id="vs-rl"></div>
    <div class="vs-res-divider"></div>
    <div class="vs-res-en"     id="vs-re"></div>
    <div class="vs-res-jp"     id="vs-rj"></div>
    <div class="vs-res-kanji"  id="vs-rk"></div>
    <div class="vs-res-actions">
      <button class="game-btn game-btn-primary"   id="vs-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="vs-back">メニューへ</button>
    </div>
  </div>
</div>

<!-- HELP BUTTON (fixed) -->
<button class="vs-help-btn" id="vs-help">？</button>

<!-- HOW TO PLAY MODAL -->
<div class="vs-modal-overlay" id="vs-modal-overlay">
  <div class="vs-modal" role="dialog" aria-modal="true">
    <div class="vs-modal-header">
      <div class="vs-modal-title">HOW TO PLAY</div>
      <div class="vs-modal-title-jp">あそびかた</div>
    </div>
    <div class="vs-modal-body">
      <div class="vs-how-step">
        <div class="vs-how-num">1</div>
        <div>
          <div class="vs-how-en">Look at the Japanese word and read it carefully.</div>
          <div class="vs-how-jp">日本語の言葉をよく見よう。よめるかな？</div>
        </div>
      </div>
      <div class="vs-how-step">
        <div class="vs-how-num">2</div>
        <div>
          <div class="vs-how-en">Tap the correct English answer before time runs out!</div>
          <div class="vs-how-jp">時間切れになる前に正しい英語を選ぼう！</div>
        </div>
      </div>
      <div class="vs-how-step">
        <div class="vs-how-num">3</div>
        <div>
          <div class="vs-how-en">Score a point for each correct first-try answer.</div>
          <div class="vs-how-jp">一発正解でポイントゲット！</div>
        </div>
      </div>
      <div class="vs-how-step">
        <div class="vs-how-num">4</div>
        <div>
          <div class="vs-how-en">Build a streak for faster timers and bigger rewards!</div>
          <div class="vs-how-jp">連続正解でタイマーが速くなるよ！レベルアップをめざそう！</div>
        </div>
      </div>
      <button class="vs-modal-close" id="vs-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>

<!-- START OVERLAY -->
<div class="vs-start-overlay" id="vs-start-overlay">
  <div class="vs-start-card">
    <div class="vs-start-header">
      <div class="vs-start-title">${curriculumLabel()}</div>
      <div class="vs-start-subtitle">ボキャブラリースピード / Vocab Speed</div>
    </div>
    <div class="vs-start-body">
      <div class="vs-start-step">
        <div class="vs-start-num">1</div>
        <div>
          <div class="vs-start-en">Read the Japanese word shown.</div>
          <div class="vs-start-jp">日本語を見て読もう。</div>
        </div>
      </div>
      <div class="vs-start-step">
        <div class="vs-start-num">2</div>
        <div>
          <div class="vs-start-en">Tap the correct English word — fast!</div>
          <div class="vs-start-jp">素早く正しい英語をタップ！</div>
        </div>
      </div>
      <div class="vs-start-step">
        <div class="vs-start-num">3</div>
        <div>
          <div class="vs-start-en">Keep your streak alive to level up the challenge!</div>
          <div class="vs-start-jp">連続正解でレベルアップ！タイマーが速くなるよ！</div>
        </div>
      </div>
      <button class="vs-start-btn" id="vs-start-btn">START / はじめよう</button>
    </div>
  </div>
</div>
`);

/* ══════════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════════ */
const mainWrap    = document.getElementById('vs-main-wrap');
const qnumEl      = document.getElementById('vs-qnum');
const scoreEl     = document.getElementById('vs-score');
const streakEl    = document.getElementById('vs-streak');
const streakPill  = document.getElementById('vs-streak-pill');
const heatEl      = document.getElementById('vs-heat');
const jpEl        = document.getElementById('vs-jp');
const hiraEl      = document.getElementById('vs-hira');
const grid        = document.getElementById('vs-grid');
const promptBox   = document.getElementById('vs-prompt-box');
const streakBanner= document.getElementById('vs-streak-banner');
const bannerEn    = document.getElementById('vs-banner-en');
const bannerJp    = document.getElementById('vs-banner-jp');
const bannerKanji = document.getElementById('vs-banner-kanji');
const results     = document.getElementById('vs-results');
const dotsRow     = document.getElementById('vs-dots');
const startOverlay= document.getElementById('vs-start-overlay');
const helpBtn     = document.getElementById('vs-help');
const modalOverlay= document.getElementById('vs-modal-overlay');

/* ── Build 15 progress dots ── */
for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'vs-dot'; d.id = `vs-d${i}`;
  dotsRow.appendChild(d);
}

/* ══════════════════════════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════════════════════════ */
helpBtn.addEventListener('click', () => modalOverlay.classList.add('open'));
document.getElementById('vs-modal-ok').addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOverlay.classList.remove('open'); });

/* ══════════════════════════════════════════════════════════════
   START OVERLAY
   ══════════════════════════════════════════════════════════════ */
document.getElementById('vs-start-btn').addEventListener('click', () => {
  unlockAllAudio();
  startOverlay.classList.add('hiding');
  setTimeout(() => { startOverlay.style.display = 'none'; }, 380);
  renderQ();
});
document.getElementById('vs-start-btn').addEventListener('touchstart', (e) => {
  e.preventDefault();
  unlockAllAudio();
  startOverlay.classList.add('hiding');
  setTimeout(() => { startOverlay.style.display = 'none'; }, 380);
  renderQ();
}, { passive: false });

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
const order   = U.shuffle(CFG.cards.slice(0, 15));
let idx       = 0;
let score     = 0;
let streak    = 0;
let lastLevel = 0;
let locked    = false;
let firstTry  = true;
let heatRAF   = 0;
let heatStart = 0;
let heatDur   = 5000;

/* ══════════════════════════════════════════════════════════════
   DOTS
   ══════════════════════════════════════════════════════════════ */
function updateDots() {
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`vs-d${i}`);
    if (!d) continue;
    d.className = 'vs-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
  }
}

/* ══════════════════════════════════════════════════════════════
   STREAK COLORS
   ══════════════════════════════════════════════════════════════ */
const STREAK_COLORS = ['','#ffcc00','#ff9900','#ff4400','#ffe000'];
function updateStreakUI() {
  const lv = getStreakLevel(streak);
  const col = STREAK_COLORS[lv] || 'var(--game-primary)';
  streakPill.style.setProperty('--streak-color', col);
  streakEl.textContent = streak;

  promptBox.classList.remove('streak-0','streak-1','streak-2','streak-3','streak-4');
  if (lv > 0) promptBox.classList.add(`streak-${lv}`);
}

/* ══════════════════════════════════════════════════════════════
   HEAT TIMER
   ══════════════════════════════════════════════════════════════ */
function stopHeat() {
  cancelAnimationFrame(heatRAF);
  heatRAF = 0;
  heatEl.classList.remove('warning');
}

function startHeat() {
  stopHeat();
  const lv = getStreakLevel(streak);
  heatDur  = HEAT_DURATIONS[lv] ?? 5000;
  heatStart = performance.now();
  heatEl.style.width = '100%';
  heatEl.classList.remove('warning');

  const tick = (t) => {
    if (locked) { heatRAF = requestAnimationFrame(tick); return; }
    const p = 1 - (t - heatStart) / heatDur;
    const pct = Math.max(0, p);
    heatEl.style.width = `${pct * 100}%`;
    if (pct < 0.2) heatEl.classList.add('warning');
    else heatEl.classList.remove('warning');
    if (pct <= 0) { onTimeout(); return; }
    heatRAF = requestAnimationFrame(tick);
  };
  heatRAF = requestAnimationFrame(tick);
}

/* ══════════════════════════════════════════════════════════════
   RENDER QUESTION
   ══════════════════════════════════════════════════════════════ */
function renderQ() {
  if (idx >= order.length) { showResults(); return; }

  locked   = false;
  firstTry = true;
  grid.innerHTML = '';

  const card = order[idx];
  qnumEl.textContent = idx + 1;
  jpEl.textContent   = card.jp;
  hiraEl.textContent = card.hira || '';
  updateDots();

  const pool        = order.filter((_, i) => i !== idx);
  const distractors = U.shuffle(pool).slice(0, 3);
  const choices     = U.shuffle([card, ...distractors]);

  choices.forEach((c, ci) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vs-choice';
    btn.setAttribute('data-ci', ci);
    btn.setAttribute('aria-label', c.en);
    btn.textContent = c.en;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      unlockAllAudio();
      handlePick(btn, c.en);
    }, { passive: false });
    btn.addEventListener('click', (e) => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      handlePick(btn, c.en);
    });

    grid.appendChild(btn);
  });

  Array.from(grid.children).forEach((btn, i) => {
    btn.style.opacity = '0';
    btn.style.transform = 'translateY(12px) scale(.95)';
    setTimeout(() => {
      btn.style.transition = 'opacity .28s ease, transform .28s cubic-bezier(.34,1.56,.64,1)';
      btn.style.opacity = '1';
      btn.style.transform = '';
    }, i * 55);
  });

  startHeat();
}

/* ══════════════════════════════════════════════════════════════
   HANDLE PICK
   ══════════════════════════════════════════════════════════════ */
function handlePick(btn, en) {
  if (locked) return;
  const now = Date.now();
  if (now - lastPickAt < PICK_DEBOUNCE_MS) return;
  lastPickAt = now;

  locked = true;
  stopHeat();

  Array.from(grid.children).forEach(b => {
    if (b !== btn) b.classList.add('vs-locked');
  });

  const correct = en === order[idx].en;

  if (correct) {
    btn.classList.add('vs-correct');
    U.playSFX('ding');

    if (firstTry) {
      score++;
      streak++;
    } else {
      streak = 0;
    }

    scoreEl.textContent = score;
    updateStreakUI();
    updateStreakBanner();
    updateDots();

    setTimeout(() => {
      idx++;
      renderQ();
    }, 480);

  } else {
    btn.classList.add('vs-wrong');
    firstTry = false;
    streak   = 0;
    updateStreakUI();
    updateStreakBanner();
    U.playSFX('fart');

    setTimeout(() => {
      locked = false;
      firstTry = false;
      Array.from(grid.children).forEach(b => {
        b.classList.remove('vs-locked', 'vs-wrong');
        b.style.transition = '';
      });
      startHeat();
    }, 560);
  }
}

/* ══════════════════════════════════════════════════════════════
   TIMEOUT
   ══════════════════════════════════════════════════════════════ */
function onTimeout() {
  if (locked) return;
  locked   = true;
  firstTry = false;
  streak   = 0;
  updateStreakUI();
  updateStreakBanner();
  U.playSFX('fart');

  Array.from(grid.children).forEach(b => b.classList.add('vs-locked'));

  setTimeout(() => {
    locked = false;
    firstTry = false;
    Array.from(grid.children).forEach(b => b.classList.remove('vs-locked'));
    startHeat();
  }, 560);
}

/* ══════════════════════════════════════════════════════════════
   STREAK BANNER + AUDIO
   ══════════════════════════════════════════════════════════════ */
function updateStreakBanner() {
  const lv = getStreakLevel(streak);

  if (lv < 4 && lastLevel >= 4) stopLvl4();

  if (lv > 0 && lv > lastLevel) {
    playFireSound(lv);
  }

  if (lv === 0) {
    streakBanner.classList.remove('show');
    streakBanner.className = 'vs-streak-banner';
    lastLevel = 0;
    return;
  }

  const msg = STREAK_MSG[lv];
  bannerEn.textContent    = msg.en;
  bannerJp.textContent    = msg.jp;
  bannerKanji.textContent = msg.kanji;

  streakBanner.className = `vs-streak-banner slvl-${lv}`;
  if (!streakBanner.classList.contains('show')) {
    streakBanner.classList.add('show');
  }

  lastLevel = lv;
}

/* ══════════════════════════════════════════════════════════════
   CONFETTI
   ══════════════════════════════════════════════════════════════ */
function fireConfetti(big = false) {
  const colors = ['#ffcc00','#aaff22','#ff2288','#22ddff','#cc88ff','#ff6600','#ffffff'];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.38;
  const count = big ? 80 : 36;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'vs-confetti-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist  = (big ? 200 : 110) + Math.random() * 220;
    el.style.cssText = `
      left:${cx}px; top:${cy}px;
      background:${colors[i % colors.length]};
      --cx:${Math.cos(angle)*dist}px;
      --cy:${Math.sin(angle)*dist}px;
      --cr:${(Math.random()-.5)*720}deg;
      animation-delay:${Math.random()*.2}s;
      animation-duration:${.85+Math.random()*.5}s;
      border-radius:${Math.random()>.5?'50%':'2px'};
      width:${5+Math.random()*8}px;
      height:${5+Math.random()*8}px;
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* ══════════════════════════════════════════════════════════════
   RESULTS  ← FIXED: uses vs-* IDs, hides main wrap, dispatches
             booha:gameEnd with correct saveId for vocab_speed
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  stopHeat();
  stopStreakAudio();

  /* Mark all dots done */
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`vs-d${i}`);
    if (d) d.className = 'vs-dot done';
  }

  /* Hide the gameplay area */
  mainWrap.style.display = 'none';

  /* Show results card */
  results.classList.add('show');

  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);

  /* ── Dispatch to Booha Adventure save system ── */
  document.dispatchEvent(new CustomEvent('booha:gameEnd', {
    detail: {
      saveId:    (window.BoohaAdventure?.registry?.saveId ?? ((c, g) => `${c}__${g}`))(
                   CFG.curriculum, 'vocab_speed'),
      score:     pct,
      completed: score === 15,
    }
  }));

  /* Populate scorecard */
  results.style.setProperty('--tier-color', tier.color);
  document.getElementById('vs-rs').textContent = `${score} / 15`;
  document.getElementById('vs-rp').textContent = `${pct}%`;
  document.getElementById('vs-rl').textContent = tier.label;
  document.getElementById('vs-re').textContent = tier.en;
  document.getElementById('vs-rj').textContent = tier.jp;
  document.getElementById('vs-rk').textContent = tier.kanji;

  /* Confetti + result sound */
  if (score === 15) {
    setTimeout(() => fireConfetti(false), 400);
    setTimeout(() => fireConfetti(true),  900);
  }
  const snd = new Audio(CFG.sfxBase + tier.sound);
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

/* ══════════════════════════════════════════════════════════════
   REPLAY / BACK
   ══════════════════════════════════════════════════════════════ */
document.getElementById('vs-replay').addEventListener('click', () => {
  results.classList.remove('show');
  mainWrap.style.display = '';

  streakBanner.className = 'vs-streak-banner';

  idx = 0; score = 0; streak = 0; lastLevel = 0;
  scoreEl.textContent  = '0';
  streakEl.textContent = '0';
  updateStreakUI();
  U.shuffle(order);
  renderQ();
});

document.getElementById('vs-back').addEventListener('click', () => {
  stopStreakAudio();
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

/* ══════════════════════════════════════════════════════════════
   NOTE: renderQ() is triggered by the START button, not here.
   ══════════════════════════════════════════════════════════════ */

})();
    
