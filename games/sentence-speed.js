
/* ══════════════════════════════════════════════════════════════
   sentence-speed.js  —  Sentence Speed  v2
   JP sentence → pick the English. Heat bar timer. Fire streaks.
   Full results scorecard + booha:gameEnd, distinct from vocab-speed.
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
   AUDIO — one-shot streak SFX, same as vocab-speed
   ══════════════════════════════════════════════════════════════ */
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

let audioUnlocked = false;
function unlockAllAudio() { if (audioUnlocked) return; audioUnlocked = true; }
document.addEventListener('touchstart', unlockAllAudio, { once: true, passive: true });
document.addEventListener('mousedown',  unlockAllAudio, { once: true, passive: true });

let lastPickAt = 0;
const PICK_DEBOUNCE_MS = 320;

/* ══════════════════════════════════════════════════════════════
   TIERS — distinct wording from vocab-speed
   (Vocab: "Try Again / Keep Going / So Close / Perfect")
   (Sentence: "Keep Trying / Good Work / Almost There / Flawless")
   ══════════════════════════════════════════════════════════════ */
const TIERS = [
  { min:0,  max:5,  sound:'result_0-5.mp3',
    label:'KEEP TRYING',
    en:"Sentences are tough — you'll crack them!",
    jp:'むずかしいけど、きっとできる！',
    kanji:'難しいけど、絶対できる！',
    color:'#f43f5e', glow:'rgba(244,63,94,0.4)' },
  { min:6,  max:10, sound:'result_6-10.mp3',
    label:'GOOD WORK',
    en:"You're reading Japanese sentences — amazing!",
    jp:'日本語の文が読める！すごい！',
    kanji:'日本語の文が読めてすごい！',
    color:'#f97316', glow:'rgba(249,115,22,0.4)' },
  { min:11, max:14, sound:'result_11-14.mp3',
    label:'ALMOST THERE',
    en:'One more push — a perfect score is close!',
    jp:'あとちょっと！パーフェクトまであと少し！',
    kanji:'惜しい！完璧まで目前！',
    color:'#06b6d4', glow:'rgba(6,182,212,0.4)' },
  { min:15, max:15, sound:'result_15.mp3',
    label:'FLAWLESS!',
    en:'You understood every sentence perfectly!',
    jp:'全部の文がわかった！完璧！',
    kanji:'全文完璧！驚異の理解力！',
    color:'#22d3ee', glow:'rgba(34,211,238,0.55)' },
];
const getTier = s => TIERS.find(t => s >= t.min && s <= t.max) ?? TIERS[0];

/* ══════════════════════════════════════════════════════════════
   STREAK — same thresholds as vocab-speed, different messages
   ══════════════════════════════════════════════════════════════ */
const STREAK_LEVELS = [
  { min:0,  max:2,  level:0 },
  { min:3,  max:3,  level:1 },
  { min:4,  max:4,  level:2 },
  { min:5,  max:5,  level:3 },
  { min:6,  max:99, level:4 },
];
function getStreakLevel(s) {
  return (STREAK_LEVELS.find(t => s >= t.min && s <= t.max) ?? STREAK_LEVELS[0]).level;
}

/* Sentence-speed streak messages — different flavour from vocab-speed */
const STREAK_MSG = {
  1: { en:'Reading streak! Keep it up!',            jp:'続けてるね！すごい！',           kanji:'連続正解！すごい！' },
  2: { en:'Sentence master in the making!',         jp:'文の達人になってきた！',          kanji:'文の達人への道！' },
  3: { en:'Unstoppable reader! Full speed ahead!',  jp:'読むのが止まらない！全速前進！',   kanji:'読解無双！全速前進！' },
  4: { en:'LEGENDARY! You speak English!',          jp:'最強！もう英語ペラペラ！',       kanji:'伝説！英語マスター！' },
};

/* Heat durations — slightly longer than vocab (sentences need more thinking) */
const HEAT_DURATIONS = [7000, 5600, 4400, 3200, 2200];

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

/* ══════════════════════════════════════════════════════════════
   STYLES — scoped to .ssp-wrap; visually distinct from vs-
   Key palette differences:
     BR: aqua → electric-blue → violet heat bar  (vs vocab gold fire)
     BC: amber → blood-orange → crimson heat bar  (vs vocab cyan/purple)
     PB: yellow → tangerine → hot-pink heat bar  (vs vocab mint/lavender)
     Streak banner: electric teal/cyan/lightning  (vs vocab amber/orange/gold)
     Results top bar: cyan/teal sweep  (vs vocab rainbow sweep)
     Score color: cyan-family tier colors  (vs vocab warm tiers)
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `

/* ── base ── */
.game-header{ display:none !important; }
.ssp-wrap{
  position:relative; z-index:1;
  max-width:760px; margin:0 auto;
  padding:0 1rem 6rem;
}

/* ══ START OVERLAY ══ */
.ssp-start-overlay{
  position:fixed; inset:0; z-index:1000;
  display:flex; align-items:center; justify-content:center;
  background:var(--game-bg); padding:1rem;
  transition:opacity .35s ease;
}
.ssp-start-overlay.hiding{ opacity:0; pointer-events:none; }
.ssp-start-card{
  max-width:480px; width:100%; border-radius:32px; overflow:hidden;
  background:var(--game-surface); border:2px solid var(--game-primary);
  box-shadow:0 0 60px color-mix(in srgb, var(--game-primary) 28%, transparent), 0 24px 48px rgba(0,0,0,.45);
  text-align:center;
}
[data-curriculum="pb"] .ssp-start-card{ background:#fff8fc; border-color:#ff6eb4; box-shadow:0 8px 0 #ffb0d8, 0 20px 40px rgba(255,110,180,.2); }
[data-curriculum="bc"] .ssp-start-card{ background:#030810; border-color:rgba(0,240,255,.5); box-shadow:0 0 60px rgba(0,240,255,.15), 0 24px 48px rgba(0,0,0,.6); }

.ssp-start-header{
  padding:1.6rem 1.4rem 1rem;
  background:linear-gradient(135deg, color-mix(in srgb, var(--game-primary) 14%, transparent), color-mix(in srgb, var(--game-secondary) 8%, transparent));
  border-bottom:1px solid var(--game-border);
}
/* Sentence-speed title uses cyan/teal gradient instead of rainbow */
.ssp-start-title{
  font-family:var(--game-font-title);
  font-size:clamp(26px,6vw,46px); font-weight:900; letter-spacing:.1em;
  background:linear-gradient(90deg,#00f0dd,#0088ff,#aa44ff,#00ddff,#00f0dd);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:sspCyan 3s linear infinite;
}
[data-curriculum="bc"] .ssp-start-title{
  background:linear-gradient(90deg,#ff8800,#ff3300,#cc0055,#ff8800);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .ssp-start-title{
  background:linear-gradient(90deg,#ffee44,#ff9922,#ff4488,#cc44ff,#ffee44);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
@keyframes sspCyan{ to{ background-position:220% center; } }

.ssp-start-subtitle{
  font-family:var(--game-font-jp); font-size:clamp(12px,2vw,15px);
  color:var(--game-muted); margin-top:6px;
}
[data-curriculum="pb"] .ssp-start-subtitle{ color:rgba(58,26,46,.5); }
.ssp-start-body{ padding:1.2rem 1.4rem 1.6rem; }
.ssp-start-step{ display:grid; grid-template-columns:32px 1fr; gap:10px; align-items:start; margin-bottom:.85rem; text-align:left; }
.ssp-start-step:last-of-type{ margin-bottom:0; }
.ssp-start-num{
  width:32px; height:32px; border-radius:50%;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000; font-family:var(--game-font-title); font-size:clamp(13px,2.2vw,16px); font-weight:900;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
  box-shadow:0 0 10px color-mix(in srgb, var(--game-primary) 45%, transparent);
}
.ssp-start-en{ font-family:var(--game-font-body); font-size:clamp(13px,2.2vw,15px); font-weight:800; color:var(--game-ink); line-height:1.35; padding-top:2px; }
[data-curriculum="pb"] .ssp-start-en{ color:#2a1020; }
.ssp-start-jp{ font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,13px); color:var(--game-muted); margin-top:2px; }
[data-curriculum="pb"] .ssp-start-jp{ color:rgba(58,26,46,.5); }
.ssp-start-btn{
  display:block; width:calc(100% - 2.8rem); margin:1.3rem 1.4rem 1.6rem;
  font-family:var(--game-font-title); font-size:clamp(18px,3.8vw,26px); letter-spacing:.1em;
  padding:16px 24px; border:none; border-radius:999px;
  cursor:pointer; position:relative; overflow:hidden;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:0 0 32px color-mix(in srgb, var(--game-primary) 55%, transparent), 0 5px 0 color-mix(in srgb, var(--game-primary) 40%, #000), 0 10px 24px rgba(0,0,0,.3);
  transition:transform .15s, box-shadow .15s; -webkit-tap-highlight-color:transparent;
}
.ssp-start-btn::after{
  content:''; position:absolute; top:-50%; left:-80%; width:48%; height:200%;
  background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.3) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .5s ease; pointer-events:none;
}
.ssp-start-btn:hover::after{ left:150%; }
.ssp-start-btn:hover{ transform:translateY(-3px) scale(1.03); }
.ssp-start-btn:active{ transform:scale(.96); }

/* ══ HEADER ══ */
.ssp-header{ text-align:center; padding:.6rem 3rem .8rem; }
.ssp-curriculum{
  font-family:var(--game-font-title); font-size:clamp(28px,6vw,52px);
  font-weight:900; letter-spacing:.12em; text-transform:uppercase;
  background:linear-gradient(90deg,#00f0dd,#0088ff,#aa44ff,#00ddff,#00f0dd);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text; animation:sspCyan 3s linear infinite;
}
[data-curriculum="bc"] .ssp-curriculum{
  background:linear-gradient(90deg,#ff8800,#ff3300,#cc0055,#ff8800);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .ssp-curriculum{
  background:linear-gradient(90deg,#ffee44,#ff9922,#ff4488,#cc44ff,#ffee44);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
.ssp-date{
  margin-top:4px; font-family:var(--game-font-body); font-size:clamp(12px,2.2vw,16px);
  font-weight:800; color:var(--game-muted); letter-spacing:.06em;
}
[data-curriculum="pb"] .ssp-date{ color:rgba(58,26,46,.55); }

/* ══ PROGRESS DOTS ══ */
.ssp-dots-row{ display:flex; justify-content:center; gap:6px; margin:.4rem 0; flex-wrap:wrap; }
.ssp-dot{
  width:10px; height:10px; border-radius:50%;
  background:rgba(255,255,255,.12); border:1.5px solid rgba(255,255,255,.18);
  transition:all .3s; flex-shrink:0;
}
.ssp-dot.active{ background:#00ddff; border-color:#00ddff; box-shadow:0 0 8px #00ddff; }
.ssp-dot.done{ background:#22c55e; border-color:#22c55e; box-shadow:0 0 8px rgba(34,197,94,.7); }
[data-curriculum="pb"] .ssp-dot{ background:rgba(255,110,180,.15); border-color:rgba(255,110,180,.28); }

/* ══ HUD PILLS ══ */
.ssp-hud{ display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin-bottom:.5rem; }
.ssp-pill{
  padding:6px 18px; border-radius:999px;
  background:var(--game-pill-bg); border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text); font-size:clamp(13px,2.2vw,16px); font-weight:900; letter-spacing:.03em;
  box-shadow:0 2px 12px rgba(0,0,0,.2);
}
.ssp-pill b{ color:#00ddff; font-size:1.1em; text-shadow:0 0 10px #00ddff; }
[data-curriculum="br"] .ssp-pill b{ color:#00ddff; }
[data-curriculum="bc"] .ssp-pill b{ color:#ff8800; text-shadow:0 0 10px #ff8800; }
[data-curriculum="pb"] .ssp-pill{ background:#fff; border-color:#ffb0d8; color:#2a1020; box-shadow:0 3px 0 #ffccdd; }
[data-curriculum="pb"] .ssp-pill b{ color:#ff9922; text-shadow:none; }

.ssp-streak-pill{
  padding:6px 20px; border-radius:999px;
  background:color-mix(in srgb, var(--streak-color,#00ddff) 14%, var(--game-pill-bg));
  border:1.5px solid color-mix(in srgb, var(--streak-color,#00ddff) 55%, transparent);
  color:var(--game-pill-text); font-size:clamp(13px,2.2vw,16px); font-weight:900;
  box-shadow:0 0 14px color-mix(in srgb, var(--streak-color,#00ddff) 30%, transparent);
  transition:background .4s, border-color .4s, box-shadow .4s;
}
.ssp-streak-pill b{
  color:var(--streak-color, #00ddff); font-size:1.1em;
  text-shadow:0 0 10px color-mix(in srgb, var(--streak-color,#00ddff) 60%, transparent);
  transition:color .4s, text-shadow .4s;
}
[data-curriculum="pb"] .ssp-streak-pill{ background:#fff; border-color:var(--streak-color,#ff9922); box-shadow:0 3px 0 #ffccdd; }

/* ══ HEAT TIMER BAR ══ */
.ssp-timer-wrap{ padding:0 .25rem; margin-bottom:.6rem; }
.ssp-timer-label{
  text-align:center; font-family:var(--game-font-body);
  font-size:clamp(9px,1.6vw,11px); font-weight:800;
  letter-spacing:.18em; text-transform:uppercase;
  color:var(--game-muted); margin-bottom:6px;
}
[data-curriculum="pb"] .ssp-timer-label{ color:rgba(58,26,46,.45); }
.ssp-timer-track{
  height:14px; border-radius:99px; overflow:hidden;
  background:rgba(255,255,255,.08); border:1.5px solid rgba(255,255,255,.1); position:relative;
}
[data-curriculum="pb"] .ssp-timer-track{ background:rgba(255,200,50,.08); border-color:rgba(255,180,30,.2); }

/* Heat fills — opposite palette from vocab-speed */
.ssp-timer-fill{
  height:100%; border-radius:99px; transform-origin:left center;
  position:relative; overflow:hidden;
}
/* BR: aqua → electric-blue → violet  (vocab-speed BR: chartreuse→gold→magenta) */
[data-curriculum="br"] .ssp-timer-fill{
  background:linear-gradient(90deg, #00ffcc 0%, #0099ff 50%, #aa00ff 100%);
}
/* BC: amber → blood-orange → crimson  (vocab-speed BC: cyan→blue→purple) */
[data-curriculum="bc"] .ssp-timer-fill{
  background:linear-gradient(90deg, #ff8800 0%, #ff3300 50%, #cc0055 100%);
}
/* PB: yellow → tangerine → hot-pink  (vocab-speed PB: mint→lavender→pink) */
[data-curriculum="pb"] .ssp-timer-fill{
  background:linear-gradient(90deg, #ffee44 0%, #ff9922 55%, #ff4488 100%);
}
/* fallback */
.ssp-timer-fill{
  background:linear-gradient(90deg, #00ffcc 0%, #0099ff 50%, #aa00ff 100%);
}
.ssp-timer-fill::after{
  content:''; position:absolute; inset:0;
  background:linear-gradient(90deg, transparent 20%, rgba(255,255,255,.3) 50%, transparent 80%);
  background-size:200% 100%; animation:sspTimerShimmer 1.4s linear infinite;
}
@keyframes sspTimerShimmer{ from{ background-position:200% 0; } to{ background-position:-200% 0; } }
.ssp-timer-fill.warning{ animation:sspTimerPulse .55s ease-in-out infinite; }
@keyframes sspTimerPulse{ 0%,100%{ filter:brightness(1); } 50%{ filter:brightness(1.6) saturate(1.8); } }

/* ══ JP PROMPT BOX ══ */
.ssp-prompt-box{
  border-radius:24px; padding:1.4rem 1.4rem 1.2rem;
  margin:0 0 1rem; text-align:center; position:relative; overflow:hidden;
  background:var(--game-surface); border:2px solid var(--game-border);
  backdrop-filter:blur(14px); box-shadow:0 8px 32px rgba(0,0,0,.22);
  transition:border-color .4s, box-shadow .4s, background .4s;
}
[data-curriculum="br"] .ssp-prompt-box{
  background:linear-gradient(145deg,rgba(0,240,220,.06),rgba(0,136,255,.05),rgba(0,0,0,.18));
  border-color:rgba(0,220,255,.22);
  box-shadow:0 8px 32px rgba(0,0,0,.35),0 0 0 1px rgba(0,220,255,.08);
}
[data-curriculum="bc"] .ssp-prompt-box{
  background:linear-gradient(145deg,rgba(255,136,0,.06),rgba(255,60,0,.05),rgba(0,0,0,.28));
  border-color:rgba(255,136,0,.22);
  box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 24px rgba(255,100,0,.08);
}
[data-curriculum="pb"] .ssp-prompt-box{
  background:#ffffff; border:3px solid #ff9922;
  box-shadow:0 5px 0 #ffd08a, 0 10px 24px rgba(255,160,50,.15);
}
/* Top accent bar — teal for sentence-speed */
.ssp-prompt-box::before{
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,#00f0dd,#0088ff,#aa44ff,#00ddff,#00f0dd);
  background-size:220% auto; animation:sspCyan 2.4s linear infinite;
}
[data-curriculum="bc"] .ssp-prompt-box::before{
  background:linear-gradient(90deg,#ff8800,#ff3300,#cc0055,#ff8800);
  background-size:220% auto;
}
[data-curriculum="pb"] .ssp-prompt-box::before{
  background:linear-gradient(90deg,#ffee44,#ff9922,#ff4488,#cc44ff,#ffee44);
  background-size:220% auto;
}

/* streak animation on box — teal family */
.ssp-prompt-box.streak-1{ box-shadow:0 8px 32px rgba(0,200,220,.15); }
.ssp-prompt-box.streak-2{ box-shadow:0 8px 40px rgba(0,150,255,.22); }
.ssp-prompt-box.streak-3{ animation:sspBoxPulse3 1.8s ease-in-out infinite; }
.ssp-prompt-box.streak-4{ animation:sspBoxPulse4 .9s ease-in-out infinite; }
@keyframes sspBoxPulse3{
  0%,100%{ box-shadow:0 8px 40px rgba(0,140,255,.28), 0 0 60px rgba(0,140,255,.08); }
  50%{     box-shadow:0 8px 60px rgba(0,140,255,.5),  0 0 80px rgba(0,140,255,.18); }
}
@keyframes sspBoxPulse4{
  0%,100%{ box-shadow:0 8px 60px rgba(0,220,255,.45), 0 0 100px rgba(0,220,255,.18); border-color:rgba(0,220,255,.5); }
  50%{     box-shadow:0 8px 80px rgba(0,220,255,.8),  0 0 130px rgba(0,220,255,.35); border-color:rgba(0,255,255,.9); }
}

.ssp-jp{
  font-family:var(--game-font-jp); font-weight:900;
  font-size:clamp(20px,4.5vw,34px);
  line-height:1.45; color:var(--game-ink);
}
[data-curriculum="pb"] .ssp-jp{ color:#2a1020; }
.ssp-hira{
  margin-top:.45rem; font-family:var(--game-font-jp);
  font-size:clamp(13px,2.4vw,18px); color:var(--game-muted);
}
[data-curriculum="pb"] .ssp-hira{ color:rgba(58,26,46,.55); }

/* ══ CHOICE TILES (stacked — sentences are long) ══ */
.ssp-grid{ display:flex; flex-direction:column; gap:11px; margin-bottom:.8rem; }

.ssp-choice{
  width:100%; min-height:64px; padding:.85rem 1.1rem;
  display:flex; align-items:center; justify-content:flex-start;
  text-align:left;
  border-radius:18px; cursor:pointer; user-select:none;
  -webkit-tap-highlight-color:transparent;
  position:relative; overflow:hidden;
  font-family:var(--game-font-body);
  font-size:clamp(14px,2.6vw,18px);
  font-weight:700; line-height:1.4;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, filter .14s;

  background:linear-gradient(145deg,rgba(0,220,255,.1),rgba(0,160,200,.05),rgba(0,0,0,.18));
  border:2px solid rgba(0,200,240,.18);
  color:var(--game-tile-text);
  box-shadow:0 4px 0 rgba(0,0,0,.3), 0 6px 16px rgba(0,0,0,.2),
             inset 0 1px 0 rgba(255,255,255,.1);
}
.ssp-choice::after{
  content:''; position:absolute; top:-60%; left:-80%; width:50%; height:200%;
  background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.2) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .45s ease; pointer-events:none;
}
.ssp-choice:hover::after{ left:150%; }
.ssp-choice:hover{
  transform:translateY(-3px) scale(1.01);
  box-shadow:0 7px 0 rgba(0,0,0,.3), 0 12px 22px rgba(0,0,0,.28),
             inset 0 1px 0 rgba(255,255,255,.15);
  filter:brightness(1.12);
}
.ssp-choice:active{ transform:scale(.97); }

/* BC tiles get warm variant */
[data-curriculum="bc"] .ssp-choice{
  background:linear-gradient(145deg,rgba(255,120,0,.1),rgba(200,60,0,.05),rgba(0,0,0,.22));
  border-color:rgba(255,100,0,.22);
}
/* PB tiles get white with warm border */
[data-curriculum="pb"] .ssp-choice{
  background:#ffffff; color:#2a1020;
  border:2.5px solid #ffb84d;
  box-shadow:0 4px 0 #ffd49a, 0 6px 16px rgba(255,160,50,.12);
}
[data-curriculum="pb"] .ssp-choice:hover{
  transform:translateY(-4px) scale(1.01);
  box-shadow:0 7px 0 #ffd49a, 0 12px 22px rgba(0,0,0,.1);
}

/* Correct / wrong states */
.ssp-choice.ssp-correct{
  background:linear-gradient(135deg, #0a3d1a, #0d5e28) !important;
  border-color:#22c55e !important; color:#22c55e !important;
  box-shadow:0 0 0 4px rgba(34,197,94,.3), 0 0 40px rgba(34,197,94,.55), 0 6px 24px rgba(0,0,0,.35) !important;
  transform:scale(1.02) !important; filter:none !important;
  animation:sspCorrectPop .4s cubic-bezier(.34,1.56,.64,1);
}
[data-curriculum="pb"] .ssp-choice.ssp-correct{
  background:#f0fff4 !important; border-color:#22c55e !important; color:#22c55e !important;
  box-shadow:0 0 0 4px rgba(34,197,94,.25), 0 0 30px rgba(34,197,94,.3), 0 4px 0 #86efac !important;
}
@keyframes sspCorrectPop{ from{ transform:scale(.94); } 60%{ transform:scale(1.05); } to{ transform:scale(1.02); } }

.ssp-choice.ssp-wrong{
  background:linear-gradient(135deg, #3d0a0a, #5e1010) !important;
  border-color:#ef4444 !important; color:#ef4444 !important;
  box-shadow:0 0 0 4px rgba(239,68,68,.3), 0 0 36px rgba(239,68,68,.55), 0 6px 24px rgba(0,0,0,.35) !important;
  filter:none !important; animation:sspWrongShake .45s ease;
}
[data-curriculum="pb"] .ssp-choice.ssp-wrong{
  background:#fff5f5 !important; border-color:#ef4444 !important; color:#ef4444 !important;
  box-shadow:0 0 0 4px rgba(239,68,68,.2), 0 0 24px rgba(239,68,68,.25), 0 4px 0 #fca5a5 !important;
}
@keyframes sspWrongShake{
  0%,100%{ transform:translateX(0); }
  15%{ transform:translateX(-8px); } 35%{ transform:translateX(8px); }
  55%{ transform:translateX(-5px); } 75%{ transform:translateX(5px); }
}

.ssp-choice.ssp-locked{ opacity:.42; pointer-events:none; transform:none !important; }

/* ══ STREAK BANNER — electric teal/cyan palette ══ */
.ssp-streak-banner{
  max-width:680px; margin:.7rem auto 0;
  padding:12px 20px; border-radius:20px;
  text-align:center; overflow:hidden; position:relative;
  border:2px solid var(--ssp-bb, rgba(0,220,200,.35));
  background:var(--ssp-bg, rgba(0,210,180,.1));
  box-shadow:0 0 28px var(--ssp-glow, rgba(0,210,180,.12));
  transition:border-color .4s, background .4s, box-shadow .4s;
  display:none;
}
.ssp-streak-banner.show{ display:block; animation:sspBannerIn .38s cubic-bezier(.34,1.56,.64,1); }
@keyframes sspBannerIn{ from{ transform:scale(.88) translateY(8px); opacity:0; } to{ transform:none; opacity:1; } }

.ssp-streak-banner.slvl-1{
  --ssp-bb:rgba(0,230,200,.4); --ssp-bg:rgba(0,210,180,.1); --ssp-glow:rgba(0,220,190,.15);
}
.ssp-streak-banner.slvl-2{
  --ssp-bb:rgba(0,200,255,.5); --ssp-bg:rgba(0,185,255,.12); --ssp-glow:rgba(0,200,255,.2);
  animation:sspBannerIn .38s cubic-bezier(.34,1.56,.64,1), sspBannerPulse2 2.2s ease-in-out .4s infinite;
}
@keyframes sspBannerPulse2{ 0%,100%{ box-shadow:0 0 28px rgba(0,200,255,.2); } 50%{ box-shadow:0 0 54px rgba(0,200,255,.5); } }
.ssp-streak-banner.slvl-3{
  --ssp-bb:rgba(60,140,255,.65); --ssp-bg:rgba(40,110,255,.14); --ssp-glow:rgba(60,140,255,.28);
  animation:sspBannerIn .38s cubic-bezier(.34,1.56,.64,1), sspBannerPulse3 1.4s ease-in-out .4s infinite;
}
@keyframes sspBannerPulse3{
  0%,100%{ box-shadow:0 0 40px rgba(60,140,255,.3), 0 0 80px rgba(60,140,255,.1); }
  50%{     box-shadow:0 0 72px rgba(60,140,255,.65), 0 0 120px rgba(60,140,255,.25); }
}
.ssp-streak-banner.slvl-4{
  --ssp-bb:rgba(180,240,255,.9); --ssp-bg:rgba(160,230,255,.18); --ssp-glow:rgba(180,240,255,.45);
  animation:sspBannerIn .38s cubic-bezier(.34,1.56,.64,1), sspBannerFlare .8s ease-in-out .4s infinite;
}
@keyframes sspBannerFlare{
  0%,100%{ box-shadow:0 0 60px rgba(100,220,255,.55), 0 0 110px rgba(60,180,255,.2); border-color:rgba(180,240,255,.9); }
  50%{     box-shadow:0 0 100px rgba(180,240,255,1),  0 0 160px rgba(100,220,255,.45); border-color:#ffffff; }
}
/* PB streaks warm candy */
[data-curriculum="pb"] .ssp-streak-banner.slvl-1{ --ssp-bb:rgba(255,170,50,.4);  --ssp-bg:rgba(255,160,30,.1);  --ssp-glow:rgba(255,170,50,.15); }
[data-curriculum="pb"] .ssp-streak-banner.slvl-2{ --ssp-bb:rgba(255,100,180,.5); --ssp-bg:rgba(255,80,160,.12); --ssp-glow:rgba(255,100,180,.22); }
[data-curriculum="pb"] .ssp-streak-banner.slvl-3{ --ssp-bb:rgba(180,80,255,.6);  --ssp-bg:rgba(160,60,255,.13); --ssp-glow:rgba(180,80,255,.28); }
[data-curriculum="pb"] .ssp-streak-banner.slvl-4{ --ssp-bb:rgba(255,200,0,.8);   --ssp-bg:rgba(255,190,0,.18);  --ssp-glow:rgba(255,200,0,.4); }

.ssp-banner-en{
  font-family:var(--game-font-title); font-size:clamp(16px,3.2vw,24px);
  font-weight:900; line-height:1.1; color:#44eedd;
  text-shadow:0 0 14px rgba(0,220,200,.35);
}
.ssp-streak-banner.slvl-2 .ssp-banner-en{ color:#44ccff; text-shadow:0 0 16px rgba(0,200,255,.45); }
.ssp-streak-banner.slvl-3 .ssp-banner-en{ color:#88aaff; text-shadow:0 0 20px rgba(80,140,255,.55); }
.ssp-streak-banner.slvl-4 .ssp-banner-en{
  color:#e8f8ff; text-shadow:0 0 24px rgba(180,240,255,.9), 0 0 50px rgba(100,200,255,.5);
  animation:sspTextFlicker .7s ease-in-out infinite;
}
@keyframes sspTextFlicker{ 0%,100%{ opacity:1; } 45%{ opacity:.82; } 55%{ opacity:1; } }
[data-curriculum="pb"] .ssp-streak-banner .ssp-banner-en{ color:#ff9922; text-shadow:none; }
[data-curriculum="pb"] .ssp-streak-banner.slvl-2 .ssp-banner-en{ color:#ff44aa; }
[data-curriculum="pb"] .ssp-streak-banner.slvl-3 .ssp-banner-en{ color:#aa44ff; }
[data-curriculum="pb"] .ssp-streak-banner.slvl-4 .ssp-banner-en{ color:#cc8800; animation:none; }

.ssp-banner-jp{ margin-top:3px; font-family:var(--game-font-jp); font-size:clamp(12px,2.2vw,16px); color:var(--game-ink); }
.ssp-banner-kanji{ font-family:var(--game-font-jp); font-size:clamp(10px,1.8vw,13px); color:var(--game-muted); margin-top:1px; }
[data-curriculum="pb"] .ssp-banner-jp{ color:#2a1020; }
[data-curriculum="pb"] .ssp-banner-kanji{ color:rgba(58,26,46,.5); }

/* ══ HELP BUTTON ══ */
.ssp-help-btn{
  width:46px; height:46px; border-radius:50%;
  border:2px solid var(--game-border); background:var(--game-surface);
  color:var(--game-muted); font-size:1.3rem; font-weight:900;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  transition:all .2s; flex-shrink:0;
  position:fixed; bottom:1.5rem; right:1rem; z-index:40;
  box-shadow:0 4px 16px rgba(0,0,0,.2); -webkit-tap-highlight-color:transparent;
}
.ssp-help-btn:hover{
  border-color:#00ddff; color:#00ddff;
  box-shadow:0 0 14px rgba(0,200,220,.4); transform:scale(1.08);
}
[data-curriculum="pb"] .ssp-help-btn{ background:#fff; border-color:#ff9922; color:#cc6600; box-shadow:0 3px 0 #ffd49a; }

/* ══ HOW TO PLAY MODAL ══ */
.ssp-modal-overlay{
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,.72); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  opacity:0; pointer-events:none; transition:opacity .25s;
}
.ssp-modal-overlay.open{ opacity:1; pointer-events:all; }
.ssp-modal{
  max-width:480px; width:calc(100% - 2rem); border-radius:28px; overflow:hidden;
  background:var(--game-bg); border:2px solid #00ddff;
  box-shadow:0 0 48px rgba(0,200,220,.3), 0 24px 48px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
.ssp-modal-overlay.open .ssp-modal{ transform:none; }
[data-curriculum="pb"] .ssp-modal{ background:#fff8fc; border-color:#ff9922; box-shadow:0 8px 0 #ffd49a, 0 16px 40px rgba(255,160,50,.2); }
[data-curriculum="bc"] .ssp-modal{ background:#030810; border-color:#ff6600; }
.ssp-modal-header{
  padding:1.2rem 1.4rem .8rem;
  background:linear-gradient(135deg,rgba(0,200,220,.12),rgba(0,100,200,.07));
  border-bottom:1px solid var(--game-border); text-align:center;
}
.ssp-modal-title{ font-family:var(--game-font-title); font-size:clamp(20px,4vw,26px); letter-spacing:.06em; color:#00ddff; text-shadow:0 0 16px rgba(0,200,220,.5); }
[data-curriculum="pb"] .ssp-modal-title{ color:#ff9922; text-shadow:none; }
[data-curriculum="bc"] .ssp-modal-title{ color:#ff8800; text-shadow:0 0 16px rgba(255,120,0,.5); }
.ssp-modal-title-jp{ font-family:var(--game-font-jp); font-size:clamp(12px,2vw,15px); color:var(--game-muted); margin-top:4px; }
[data-curriculum="pb"] .ssp-modal-title-jp{ color:rgba(58,26,46,.55); }
.ssp-modal-body{ padding:1.2rem 1.4rem 1.4rem; }
.ssp-how-step{ display:grid; grid-template-columns:36px 1fr; gap:10px; align-items:start; margin-bottom:.9rem; }
.ssp-how-step:last-child{ margin-bottom:0; }
.ssp-how-num{
  width:36px; height:36px; border-radius:50%;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000; font-family:var(--game-font-title); font-size:clamp(14px,2.5vw,18px); font-weight:900;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
  box-shadow:0 0 12px color-mix(in srgb, var(--game-primary) 45%, transparent);
}
.ssp-how-en{ font-family:var(--game-font-body); font-size:clamp(13px,2.2vw,15px); font-weight:800; color:var(--game-ink); line-height:1.35; padding-top:2px; }
[data-curriculum="pb"] .ssp-how-en{ color:#2a1020; }
.ssp-how-jp{ font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,13px); color:var(--game-muted); margin-top:3px; line-height:1.4; }
[data-curriculum="pb"] .ssp-how-jp{ color:rgba(58,26,46,.55); }
.ssp-modal-close{
  display:block; width:100%; margin-top:1.1rem;
  font-family:var(--game-font-title); font-size:clamp(15px,2.8vw,19px); letter-spacing:.06em;
  padding:12px; border-radius:999px; border:none; cursor:pointer;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:0 0 20px color-mix(in srgb, var(--game-primary) 45%, transparent);
  transition:transform .15s;
}
.ssp-modal-close:hover{ transform:scale(1.03); }
.ssp-modal-close:active{ transform:scale(.96); }

/* ══ RESULTS PANEL — cyan/teal palette ══ */
.ssp-results{
  display:none; text-align:center;
  max-width:560px; margin:1.5rem auto;
  padding:2.6rem 1.6rem 2rem;
  border-radius:32px; position:relative; overflow:hidden;
  border:2.5px solid var(--ssp-tier-color, #00ddff);
  background:color-mix(in srgb, var(--ssp-tier-color,#00ddff) 6%, var(--game-bg));
  box-shadow:0 0 60px color-mix(in srgb,var(--ssp-tier-color,#00ddff) 22%,transparent), 0 24px 48px rgba(0,0,0,.4);
}
.ssp-results.show{ display:block; animation:sspResultIn .55s cubic-bezier(.22,.8,.36,1) both; }
@keyframes sspResultIn{ from{ opacity:0; transform:scale(.82) translateY(28px); } to{ opacity:1; transform:none; } }

/* Top bar — teal sweep for sentence-speed */
.ssp-results::before{
  content:''; position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,#00f0dd,#0088ff,#aa44ff,#00ddff,#00f0dd);
  background-size:220% auto; animation:sspCyan 2.4s linear infinite;
}
[data-curriculum="bc"] .ssp-results::before{
  background:linear-gradient(90deg,#ff8800,#ff3300,#cc0055,#ff8800);
  background-size:220% auto;
}
[data-curriculum="pb"] .ssp-results::before{
  background:linear-gradient(90deg,#ffee44,#ff9922,#ff4488,#cc44ff,#ffee44);
  background-size:220% auto;
}

.ssp-results::after{
  content:''; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(circle at 20% 80%, color-mix(in srgb,var(--ssp-tier-color,#00ddff) 12%,transparent) 0%,transparent 50%),
    radial-gradient(circle at 80% 20%, color-mix(in srgb,var(--game-secondary) 8%,transparent) 0%,transparent 50%);
}
.ssp-res-inner{ position:relative; z-index:1; }
.ssp-res-score{
  font-family:var(--game-font-title); font-size:clamp(62px,16vw,98px);
  line-height:1; color:var(--ssp-tier-color,#00ddff);
  text-shadow:0 0 28px var(--ssp-tier-color,#00ddff); margin-bottom:4px;
  animation:sspScorePop .55s cubic-bezier(.22,.8,.36,1) .3s both;
}
@keyframes sspScorePop{
  from{ transform:scale(.55) rotate(6deg); opacity:0; }
  50%{ transform:scale(1.08) rotate(-2deg); }
  to{ transform:none; opacity:1; }
}
.ssp-res-pct{ font-size:clamp(14px,2.6vw,19px); color:var(--game-muted); font-weight:700; margin-bottom:12px; animation:sspFadeUp .4s ease .5s both; }
.ssp-res-label{
  font-family:var(--game-font-title); font-size:clamp(26px,5.5vw,40px);
  color:var(--ssp-tier-color,#00ddff); margin-bottom:10px; letter-spacing:.05em;
  text-shadow:0 0 18px color-mix(in srgb,var(--ssp-tier-color,#00ddff) 55%,transparent);
  animation:sspFadeUp .4s ease .52s both;
}
.ssp-res-divider{
  width:60px; height:3px; border-radius:99px;
  background:linear-gradient(90deg,#00f0dd,#0088ff,#aa44ff);
  margin:0 auto 12px; opacity:.6; animation:sspFadeUp .4s ease .56s both;
}
[data-curriculum="bc"] .ssp-res-divider{ background:linear-gradient(90deg,#ff8800,#ff3300,#cc0055); }
[data-curriculum="pb"] .ssp-res-divider{ background:linear-gradient(90deg,#ffee44,#ff9922,#ff4488); }

.ssp-res-en{ font-family:var(--game-font-body); font-weight:900; font-size:clamp(14px,2.4vw,18px); color:var(--game-ink); margin-bottom:4px; animation:sspFadeUp .4s ease .6s both; }
.ssp-res-jp{ font-family:var(--game-font-jp); font-size:clamp(14px,2.2vw,17px); color:var(--game-muted); margin-bottom:3px; animation:sspFadeUp .4s ease .64s both; }
.ssp-res-kanji{ font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,14px); color:var(--game-muted); opacity:.7; margin-bottom:1.4rem; animation:sspFadeUp .4s ease .68s both; }
.ssp-res-actions{ display:flex; gap:12px; justify-content:center; flex-wrap:wrap; animation:sspFadeUp .4s ease .76s both; }
@keyframes sspFadeUp{ from{ transform:translateY(14px); opacity:0; } to{ transform:none; opacity:1; } }

/* confetti */
@keyframes sspConfetti{
  0%{ transform:translate(0,0) rotate(0deg) scale(1); opacity:1; }
  100%{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; }
}
.ssp-confetti-piece{
  position:fixed; pointer-events:none; z-index:9999; border-radius:2px;
  animation:sspConfetti 1.1s ease-out forwards;
}
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   MOUNT HTML
   ══════════════════════════════════════════════════════════════ */
U.mount(`
<div class="ssp-wrap" id="ssp-main-wrap">

  <div class="ssp-header">
    <div class="ssp-curriculum">${curriculumLabel()}</div>
    <div class="ssp-date">${titleDateLabel()}</div>
  </div>

  <div class="ssp-dots-row" id="ssp-dots"></div>

  <div class="ssp-hud">
    <div class="ssp-pill">Q <b id="ssp-qnum">1</b> / 15</div>
    <div class="ssp-pill">Score <b id="ssp-score">0</b> / 15</div>
    <div class="ssp-streak-pill" id="ssp-streak-pill">Streak <b id="ssp-streak">0</b></div>
  </div>

  <div class="ssp-timer-wrap">
    <div class="ssp-timer-label">READING TIMER / よむタイムアタック</div>
    <div class="ssp-timer-track">
      <div class="ssp-timer-fill" id="ssp-heat" style="width:100%"></div>
    </div>
  </div>

  <div class="ssp-prompt-box" id="ssp-prompt-box">
    <div id="ssp-jp"   class="ssp-jp"></div>
    <div id="ssp-hira" class="ssp-hira"></div>
  </div>

  <div id="ssp-grid" class="ssp-grid"></div>

  <div id="ssp-streak-banner" class="ssp-streak-banner">
    <div id="ssp-banner-en"    class="ssp-banner-en"></div>
    <div id="ssp-banner-jp"    class="ssp-banner-jp"></div>
    <div id="ssp-banner-kanji" class="ssp-banner-kanji"></div>
  </div>

</div>

<!-- RESULTS — separate from main so header stays visible above it -->
<div class="ssp-results" id="ssp-results">
  <div class="ssp-res-inner">
    <div class="ssp-res-score"  id="ssp-rs"></div>
    <div class="ssp-res-pct"    id="ssp-rp"></div>
    <div class="ssp-res-label"  id="ssp-rl"></div>
    <div class="ssp-res-divider"></div>
    <div class="ssp-res-en"     id="ssp-re"></div>
    <div class="ssp-res-jp"     id="ssp-rj"></div>
    <div class="ssp-res-kanji"  id="ssp-rk"></div>
    <div class="ssp-res-actions">
      <button class="game-btn game-btn-primary"   id="ssp-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="ssp-back">メニューへ</button>
    </div>
  </div>
</div>

<!-- HELP BUTTON -->
<button class="ssp-help-btn" id="ssp-help">？</button>

<!-- HOW TO PLAY MODAL -->
<div class="ssp-modal-overlay" id="ssp-modal-overlay">
  <div class="ssp-modal" role="dialog" aria-modal="true">
    <div class="ssp-modal-header">
      <div class="ssp-modal-title">HOW TO PLAY</div>
      <div class="ssp-modal-title-jp">あそびかた</div>
    </div>
    <div class="ssp-modal-body">
      <div class="ssp-how-step">
        <div class="ssp-how-num">1</div>
        <div>
          <div class="ssp-how-en">Read the Japanese sentence carefully.</div>
          <div class="ssp-how-jp">日本語の文をよく読もう。</div>
        </div>
      </div>
      <div class="ssp-how-step">
        <div class="ssp-how-num">2</div>
        <div>
          <div class="ssp-how-en">Tap the English sentence that matches — fast!</div>
          <div class="ssp-how-jp">合う英語の文を素早くタップ！</div>
        </div>
      </div>
      <div class="ssp-how-step">
        <div class="ssp-how-num">3</div>
        <div>
          <div class="ssp-how-en">Score a point for each correct first-try answer.</div>
          <div class="ssp-how-jp">一発正解でポイントゲット！</div>
        </div>
      </div>
      <div class="ssp-how-step">
        <div class="ssp-how-num">4</div>
        <div>
          <div class="ssp-how-en">Keep your streak to unlock faster timers!</div>
          <div class="ssp-how-jp">連続正解でタイマーがどんどん速くなる！</div>
        </div>
      </div>
      <button class="ssp-modal-close" id="ssp-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>

<!-- START OVERLAY -->
<div class="ssp-start-overlay" id="ssp-start-overlay">
  <div class="ssp-start-card">
    <div class="ssp-start-header">
      <div class="ssp-start-title">${curriculumLabel()}</div>
      <div class="ssp-start-subtitle">センテンススピード / Sentence Speed</div>
    </div>
    <div class="ssp-start-body">
      <div class="ssp-start-step">
        <div class="ssp-start-num">1</div>
        <div>
          <div class="ssp-start-en">Read the Japanese sentence shown.</div>
          <div class="ssp-start-jp">日本語の文を読もう。</div>
        </div>
      </div>
      <div class="ssp-start-step">
        <div class="ssp-start-num">2</div>
        <div>
          <div class="ssp-start-en">Tap the matching English sentence — quick!</div>
          <div class="ssp-start-jp">合う英語を素早くタップ！</div>
        </div>
      </div>
      <div class="ssp-start-step">
        <div class="ssp-start-num">3</div>
        <div>
          <div class="ssp-start-en">Build your streak to speed up the timer!</div>
          <div class="ssp-start-jp">連続正解でタイマーが速くなるよ！</div>
        </div>
      </div>
      <button class="ssp-start-btn" id="ssp-start-btn">START / はじめよう</button>
    </div>
  </div>
</div>
`);

/* ══════════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════════ */
const mainWrap    = document.getElementById('ssp-main-wrap');
const qnumEl      = document.getElementById('ssp-qnum');
const scoreEl     = document.getElementById('ssp-score');
const streakEl    = document.getElementById('ssp-streak');
const streakPill  = document.getElementById('ssp-streak-pill');
const heatEl      = document.getElementById('ssp-heat');
const jpEl        = document.getElementById('ssp-jp');
const hiraEl      = document.getElementById('ssp-hira');
const grid        = document.getElementById('ssp-grid');
const promptBox   = document.getElementById('ssp-prompt-box');
const streakBanner= document.getElementById('ssp-streak-banner');
const bannerEn    = document.getElementById('ssp-banner-en');
const bannerJp    = document.getElementById('ssp-banner-jp');
const bannerKanji = document.getElementById('ssp-banner-kanji');
const results     = document.getElementById('ssp-results');
const dotsRow     = document.getElementById('ssp-dots');
const startOverlay= document.getElementById('ssp-start-overlay');
const helpBtn     = document.getElementById('ssp-help');
const modalOverlay= document.getElementById('ssp-modal-overlay');

/* Build 15 progress dots */
for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'ssp-dot'; d.id = `ssp-d${i}`;
  dotsRow.appendChild(d);
}

/* ══════════════════════════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════════════════════════ */
helpBtn.addEventListener('click', () => modalOverlay.classList.add('open'));
document.getElementById('ssp-modal-ok').addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOverlay.classList.remove('open'); });

/* ══════════════════════════════════════════════════════════════
   START OVERLAY
   ══════════════════════════════════════════════════════════════ */
function doStart() {
  unlockAllAudio();
  startOverlay.classList.add('hiding');
  setTimeout(() => { startOverlay.style.display = 'none'; }, 380);
  renderQ();
}
document.getElementById('ssp-start-btn').addEventListener('click', doStart);
document.getElementById('ssp-start-btn').addEventListener('touchstart', (e) => {
  e.preventDefault(); doStart();
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
let heatDur   = 7000;

/* ══════════════════════════════════════════════════════════════
   DOTS
   ══════════════════════════════════════════════════════════════ */
function updateDots() {
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`ssp-d${i}`);
    if (!d) continue;
    d.className = 'ssp-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
  }
}

/* ══════════════════════════════════════════════════════════════
   STREAK UI — cyan family for sentence-speed
   ══════════════════════════════════════════════════════════════ */
const STREAK_COLORS = ['','#00ddff','#0099ff','#4466ff','#e8f8ff'];
function updateStreakUI() {
  const lv = getStreakLevel(streak);
  const col = STREAK_COLORS[lv] || '#00ddff';
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
  heatDur   = HEAT_DURATIONS[lv] ?? 7000;
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

  choices.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ssp-choice';
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

  /* Entrance stagger */
  Array.from(grid.children).forEach((btn, i) => {
    btn.style.opacity = '0';
    btn.style.transform = 'translateY(10px) scale(.97)';
    setTimeout(() => {
      btn.style.transition = 'opacity .26s ease, transform .26s cubic-bezier(.34,1.56,.64,1)';
      btn.style.opacity = '1';
      btn.style.transform = '';
    }, i * 60);
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
    if (b !== btn) b.classList.add('ssp-locked');
  });

  const correct = en === order[idx].en;

  if (correct) {
    btn.classList.add('ssp-correct');
    U.playSFX('ding');

    if (firstTry) { score++; streak++; }
    else           { streak = 0; }

    scoreEl.textContent = score;
    updateStreakUI();
    updateStreakBanner();
    updateDots();

    setTimeout(() => { idx++; renderQ(); }, 500);

  } else {
    btn.classList.add('ssp-wrong');
    firstTry = false;
    streak   = 0;
    updateStreakUI();
    updateStreakBanner();
    U.playSFX('fart');

    setTimeout(() => {
      locked = false;
      firstTry = false;
      Array.from(grid.children).forEach(b => {
        b.classList.remove('ssp-locked', 'ssp-wrong');
        b.style.transition = '';
      });
      startHeat();
    }, 580);
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

  Array.from(grid.children).forEach(b => b.classList.add('ssp-locked'));

  setTimeout(() => {
    locked = false;
    firstTry = false;
    Array.from(grid.children).forEach(b => b.classList.remove('ssp-locked'));
    startHeat();
  }, 580);
}

/* ══════════════════════════════════════════════════════════════
   STREAK BANNER + AUDIO
   ══════════════════════════════════════════════════════════════ */
function updateStreakBanner() {
  const lv = getStreakLevel(streak);

  if (lv < 4 && lastLevel >= 4) stopLvl4();
  if (lv > 0 && lv > lastLevel) playFireSound(lv);

  if (lv === 0) {
    streakBanner.classList.remove('show');
    streakBanner.className = 'ssp-streak-banner';
    lastLevel = 0;
    return;
  }

  const msg = STREAK_MSG[lv];
  bannerEn.textContent    = msg.en;
  bannerJp.textContent    = msg.jp;
  bannerKanji.textContent = msg.kanji;

  streakBanner.className = `ssp-streak-banner slvl-${lv}`;
  if (!streakBanner.classList.contains('show')) {
    streakBanner.classList.add('show');
  }

  lastLevel = lv;
}

/* ══════════════════════════════════════════════════════════════
   CONFETTI — cyan/teal pieces for sentence-speed
   ══════════════════════════════════════════════════════════════ */
function fireConfetti(big = false) {
  const colors = ['#00f0dd','#0088ff','#aa44ff','#00ddff','#ffffff','#88ffee','#4455ff'];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.38;
  const count = big ? 80 : 36;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'ssp-confetti-piece';
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
   RESULTS  — uses ssp-* IDs, dispatches booha:gameEnd with
              saveId for sentence_speed
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  stopHeat();
  stopLvl4();

  /* Mark all dots done */
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`ssp-d${i}`);
    if (d) d.className = 'ssp-dot done';
  }

  /* Hide gameplay */
  mainWrap.style.display = 'none';

  /* Show results card */
  results.classList.add('show');

  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);

  /* ── Dispatch to Booha Adventure save system ── */
  document.dispatchEvent(new CustomEvent('booha:gameEnd', {
    detail: {
      saveId:    (window.BoohaAdventure?.registry?.saveId ?? ((c, g) => `${c}__${g}`))(
                   CFG.curriculum, 'sentence_speed'),
      score:     pct,
      completed: score === 15,
    }
  }));

  /* Populate scorecard */
  results.style.setProperty('--ssp-tier-color', tier.color);
  document.getElementById('ssp-rs').textContent = `${score} / 15`;
  document.getElementById('ssp-rp').textContent = `${pct}%`;
  document.getElementById('ssp-rl').textContent = tier.label;
  document.getElementById('ssp-re').textContent = tier.en;
  document.getElementById('ssp-rj').textContent = tier.jp;
  document.getElementById('ssp-rk').textContent = tier.kanji;

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
document.getElementById('ssp-replay').addEventListener('click', () => {
  results.classList.remove('show');
  mainWrap.style.display = '';

  streakBanner.className = 'ssp-streak-banner';
  idx = 0; score = 0; streak = 0; lastLevel = 0;
  scoreEl.textContent  = '0';
  streakEl.textContent = '0';
  updateStreakUI();
  U.shuffle(order);
  renderQ();
});

document.getElementById('ssp-back').addEventListener('click', () => {
  stopLvl4();
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

/* renderQ() is triggered by the START button only. */

})();
