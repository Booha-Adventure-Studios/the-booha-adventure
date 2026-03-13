
/* ══════════════════════════════════════════════════════════════
   spell-word.js  —  Spell the Word  v2
   Show JP/hira, tap letter tiles to spell the English word.
   3 curricula: br / pb / bc  — same engine, themed per context.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.unlockAudio();

/* ══════════════════════════════════════════════════════════════
   AUDIO — mobile-safe
   ══════════════════════════════════════════════════════════════ */
await Promise.all([
  U.loadSFX('ding',  CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart',  CFG.sfxBase + 'fart.mp3'),
]);

const wordCache = {};
for (const card of CFG.cards.slice(0, 15)) {
  if (!card.mp3 || wordCache[card.mp3]) continue;
  const a = new Audio(CFG.audioBase + card.mp3);
  a.preload = 'auto';
  a.setAttribute('playsinline', '');
  a.setAttribute('webkit-playsinline', '');
  try { a.load(); } catch {}
  wordCache[card.mp3] = a;
}

let audioUnlocked = false;
function unlockAllAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  Object.values(wordCache).forEach(a => {
    try {
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      setTimeout(() => { try { a.pause(); a.currentTime = 0; } catch {} }, 30);
    } catch {}
  });
}
document.addEventListener('touchstart', unlockAllAudio, { once: true, passive: true });
document.addEventListener('mousedown',  unlockAllAudio, { once: true, passive: true });

let activeWord = null;
const lastPlayedAt = {};
const AUDIO_DEBOUNCE_MS = 500;

function stopWord() {
  if (!activeWord) return;
  try { activeWord.pause(); activeWord.currentTime = 0; } catch {}
  activeWord = null;
}

function playWord(mp3, onEnd) {
  if (!mp3) { if (onEnd) onEnd(); return; }
  const a = wordCache[mp3];
  if (!a) { if (onEnd) onEnd(); return; }
  const now = Date.now();
  if (lastPlayedAt[mp3] && now - lastPlayedAt[mp3] < AUDIO_DEBOUNCE_MS) {
    if (onEnd) onEnd();
    return;
  }
  lastPlayedAt[mp3] = now;
  stopWord();
  activeWord = a;
  try { a.currentTime = 0; } catch {}
  if (onEnd) {
    a.onended = () => { activeWord = null; onEnd(); };
    a.onerror = () => { activeWord = null; onEnd(); };
    setTimeout(() => { if (activeWord === a) { activeWord = null; onEnd(); } }, 3000);
  }
  const p = a.play();
  if (p && p.catch) p.catch(() => { if (onEnd) onEnd(); });
}

/* ══════════════════════════════════════════════════════════════
   DATA / TIERS
   ══════════════════════════════════════════════════════════════ */
const allCards = U.shuffle(CFG.cards.slice(0, 15));

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
   STYLES
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `

/* ── base ── */
.game-header{ display:none !important; }
.sw-wrap{
  position:relative; z-index:1;
  max-width:680px; margin:0 auto;
  padding:0 1rem 6rem;
}

/* ── header ── */
.sw-header{ text-align:center; padding:.6rem 3rem .8rem; }
.sw-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(28px,6vw,52px);
  font-weight:900;
  letter-spacing:.12em;
  text-transform:uppercase;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:swRainbow 3s linear infinite;
}
[data-curriculum="bc"] .sw-curriculum{
  background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);
  background-size:220% auto;
  -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .sw-curriculum{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto;
  -webkit-background-clip:text; background-clip:text;
}
@keyframes swRainbow{ to{ background-position:220% center; } }

.sw-date{
  margin-top:4px;
  font-family:var(--game-font-body);
  font-size:clamp(12px,2.2vw,16px);
  font-weight:800; color:var(--game-muted); letter-spacing:.06em;
}
[data-curriculum="pb"] .sw-date{ color:rgba(58,26,46,.55); }

/* ── progress dots ── */
.sw-dots-row{
  display:flex; justify-content:center; gap:6px;
  margin:.5rem 0 .4rem; flex-wrap:wrap;
}
.sw-dot{
  width:10px; height:10px; border-radius:50%;
  background:rgba(255,255,255,.12);
  border:1.5px solid rgba(255,255,255,.18);
  transition:all .3s;
  flex-shrink:0;
}
.sw-dot.active{
  background:var(--game-primary); border-color:var(--game-primary);
  box-shadow:0 0 8px var(--game-primary);
}
.sw-dot.done{
  background:#22c55e; border-color:#22c55e;
  box-shadow:0 0 8px rgba(34,197,94,.7);
}
[data-curriculum="pb"] .sw-dot{
  background:rgba(255,110,180,.15); border-color:rgba(255,110,180,.25);
}

/* ── score pill ── */
.sw-hud{
  display:flex; justify-content:center; gap:10px;
  margin-bottom:.6rem;
}
.sw-pill{
  padding:6px 18px; border-radius:999px;
  background:var(--game-pill-bg);
  border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text);
  font-size:clamp(13px,2.2vw,16px);
  font-weight:900; letter-spacing:.03em;
  box-shadow:0 2px 12px rgba(0,0,0,.2);
}
.sw-pill b{ color:var(--game-primary); font-size:1.1em; text-shadow:0 0 10px var(--game-primary); }
[data-curriculum="pb"] .sw-pill{
  background:#fff; border-color:#ffb0d8; color:#2a1020;
  box-shadow:0 3px 0 #ffccdd;
}
[data-curriculum="pb"] .sw-pill b{ text-shadow:none; }

/* ══════════════════════════════════════════════════════════════
   JP WORD CONTAINER — themed per curriculum
   ══════════════════════════════════════════════════════════════ */
.sw-jp-box{
  border-radius:24px;
  padding:1.1rem 1.4rem 1rem;
  margin-bottom:1.2rem;
  text-align:center;
  position:relative;
  overflow:hidden;
  background:var(--game-surface);
  border:2px solid var(--game-border);
  backdrop-filter:blur(12px);
  box-shadow:0 8px 32px rgba(0,0,0,.22);
  transition:border-color .3s, box-shadow .3s;
}
/* BR — warm dark green panel (matches menu) */
[data-curriculum="br"] .sw-jp-box{
  background:linear-gradient(145deg,rgba(170,255,34,.07),rgba(255,204,0,.04),rgba(0,0,0,.18));
  border-color:rgba(170,255,34,.22);
  box-shadow:0 8px 32px rgba(0,0,0,.35),0 0 0 1px rgba(170,255,34,.08);
}
/* BC — deep cold space panel (matches menu) */
[data-curriculum="bc"] .sw-jp-box{
  background:linear-gradient(145deg,rgba(0,240,255,.06),rgba(68,85,255,.08),rgba(0,0,0,.28));
  border-color:rgba(0,240,255,.22);
  box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 24px rgba(0,240,255,.08);
}
/* PB — white bubbly card with pink border (matches menu) */
[data-curriculum="pb"] .sw-jp-box{
  background:#ffffff;
  border:3px solid #ff6eb4;
  box-shadow:0 5px 0 #ffb0d8, 0 10px 24px rgba(255,110,180,.15);
}

/* shimmer top bar on jp box */
.sw-jp-box::before{
  content:'';
  position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto;
  animation:swRainbow 2.4s linear infinite;
}
[data-curriculum="pb"] .sw-jp-box::before{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto;
}

.sw-jp-label{
  font-family:var(--game-font-title);
  font-size:clamp(9px,1.6vw,12px);
  letter-spacing:.22em;
  text-transform:uppercase;
  color:var(--game-primary);
  opacity:.7;
  margin-bottom:.55rem;
}
[data-curriculum="pb"] .sw-jp-label{ color:#ff6eb4; }

.sw-jp-kanji{
  font-family:var(--game-font-jp);
  font-size:clamp(28px,6vw,44px);
  font-weight:900;
  color:var(--game-ink);
  line-height:1.15;
  letter-spacing:.04em;
}
[data-curriculum="pb"] .sw-jp-kanji{ color:#2a1020; }

.sw-jp-hira{
  font-family:var(--game-font-jp);
  font-size:clamp(15px,2.8vw,20px);
  color:var(--game-muted);
  margin-top:4px;
  letter-spacing:.03em;
}
[data-curriculum="pb"] .sw-jp-hira{ color:rgba(58,26,46,.55); }

/* ══════════════════════════════════════════════════════════════
   ANSWER SLOTS
   ══════════════════════════════════════════════════════════════ */
.sw-slots{
  display:flex; flex-wrap:wrap;
  gap:8px; justify-content:center;
  margin:0 0 .8rem; min-height:68px;
}
.sw-slot{
  width:clamp(46px,9vw,62px);
  height:clamp(52px,10vw,68px);
  border-radius:14px;
  display:flex; align-items:center; justify-content:center;
  font-family:var(--game-font-title);
  font-size:clamp(20px,4.5vw,30px);
  font-weight:900;
  cursor:pointer;
  user-select:none;
  -webkit-tap-highlight-color:transparent;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, background .14s, border-color .14s;
  position:relative;
}
/* empty slot */
.sw-slot.empty{
  background:rgba(255,255,255,.06);
  border:2.5px dashed rgba(255,255,255,.2);
  color:rgba(255,255,255,.18);
}
[data-curriculum="pb"] .sw-slot.empty{
  background:rgba(255,110,180,.06);
  border:2.5px dashed rgba(255,110,180,.3);
}
/* filled slot */
.sw-slot.filled{
  background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(255,255,255,.06));
  border:2.5px solid rgba(255,255,255,.3);
  color:var(--game-ink);
  box-shadow:0 4px 0 rgba(0,0,0,.25), 0 6px 14px rgba(0,0,0,.22);
  transform:translateY(-2px);
}
.sw-slot.filled:hover{
  transform:translateY(-4px) scale(1.06);
  box-shadow:0 8px 0 rgba(0,0,0,.25), 0 10px 20px rgba(0,0,0,.3);
}
.sw-slot.filled:active{ transform:scale(.94); }
[data-curriculum="pb"] .sw-slot.filled{
  background:#fff;
  border:2.5px solid #cc88ff;
  color:#2a1020;
  box-shadow:0 4px 0 #ddb8ff, 0 6px 14px rgba(204,136,255,.2);
}

/* correct slot */
.sw-slot.sw-correct{
  background:rgba(34,197,94,.18) !important;
  border:2.5px solid #22c55e !important;
  color:#22c55e !important;
  box-shadow:0 0 0 3px rgba(34,197,94,.25), 0 0 18px rgba(34,197,94,.4) !important;
  animation:swSlotPop .3s cubic-bezier(.34,1.56,.64,1);
}
/* wrong slot */
.sw-slot.sw-wrong{
  background:rgba(239,68,68,.15) !important;
  border:2.5px solid #ef4444 !important;
  color:#ef4444 !important;
  box-shadow:0 0 0 3px rgba(239,68,68,.25), 0 0 20px rgba(239,68,68,.5) !important;
  animation:swSlotShake .42s ease;
}
@keyframes swSlotPop{
  from{ transform:scale(.88); } 60%{ transform:scale(1.1); } to{ transform:scale(1); }
}
@keyframes swSlotShake{
  0%,100%{ transform:translateX(0); }
  20%{ transform:translateX(-6px); } 40%{ transform:translateX(6px); }
  60%{ transform:translateX(-4px); } 80%{ transform:translateX(4px); }
}

/* ══════════════════════════════════════════════════════════════
   LETTER TILES — big, colorful per curriculum like the menu
   ══════════════════════════════════════════════════════════════ */
.sw-tiles{
  display:flex; flex-wrap:wrap;
  gap:10px; justify-content:center;
  margin:0 0 1rem;
  min-height:74px;
}
.sw-tile{
  width:clamp(52px,10vw,70px);
  height:clamp(58px,11vw,76px);
  border-radius:16px;
  display:flex; align-items:center; justify-content:center;
  font-family:var(--game-font-title);
  font-size:clamp(22px,5vw,34px);
  font-weight:900;
  cursor:pointer;
  user-select:none;
  -webkit-tap-highlight-color:transparent;
  position:relative;
  overflow:hidden;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, opacity .18s;

  /* default (BR) rich gradient tiles */
  background:var(--sw-tile-bg, linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07)));
  border:2px solid var(--sw-tile-border, rgba(255,255,255,.28));
  color:var(--sw-tile-text, var(--game-tile-text));
  box-shadow:
    0 5px 0 var(--sw-tile-shadow, rgba(0,0,0,.35)),
    0 8px 16px rgba(0,0,0,.28),
    inset 0 1px 0 rgba(255,255,255,.2);
  text-shadow:0 1px 2px rgba(0,0,0,.4);
}
/* shimmer sweep */
.sw-tile::after{
  content:'';
  position:absolute; top:-60%; left:-80%;
  width:50%; height:200%;
  background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.28) 50%,transparent 72%);
  transform:skewX(-16deg);
  transition:left .45s ease;
  pointer-events:none;
}
.sw-tile:hover::after{ left:150%; }
.sw-tile:hover{
  transform:translateY(-4px) scale(1.07);
  box-shadow:
    0 8px 0 var(--sw-tile-shadow, rgba(0,0,0,.35)),
    0 14px 24px rgba(0,0,0,.35),
    inset 0 1px 0 rgba(255,255,255,.22);
}
.sw-tile:active{ transform:scale(.92); }
.sw-tile.used{
  opacity:0;
  pointer-events:none;
  transform:scale(.8);
}

/* ── BR tiles: solid vivid colors cycling (5 hues like menu) ── */
[data-curriculum="br"] .sw-tile[data-ti="0"]{
  --sw-tile-bg:linear-gradient(145deg,#1e5c00,#2e8800);
  --sw-tile-border:rgba(170,255,34,.55); --sw-tile-shadow:rgba(20,80,0,.6); --sw-tile-text:#fff;
}
[data-curriculum="br"] .sw-tile[data-ti="1"]{
  --sw-tile-bg:linear-gradient(145deg,#6a003a,#a0005a);
  --sw-tile-border:rgba(255,60,160,.55); --sw-tile-shadow:rgba(100,0,50,.6); --sw-tile-text:#fff;
}
[data-curriculum="br"] .sw-tile[data-ti="2"]{
  --sw-tile-bg:linear-gradient(145deg,#003a44,#005566);
  --sw-tile-border:rgba(0,200,220,.5); --sw-tile-shadow:rgba(0,50,60,.6); --sw-tile-text:#fff;
}
[data-curriculum="br"] .sw-tile[data-ti="3"]{
  --sw-tile-bg:linear-gradient(145deg,#4a3000,#704800);
  --sw-tile-border:rgba(255,180,0,.5); --sw-tile-shadow:rgba(60,30,0,.6); --sw-tile-text:#fff;
}
[data-curriculum="br"] .sw-tile[data-ti="4"]{
  --sw-tile-bg:linear-gradient(145deg,#2a0060,#440090);
  --sw-tile-border:rgba(180,100,255,.55); --sw-tile-shadow:rgba(30,0,80,.6); --sw-tile-text:#fff;
}
/* cycle mod-5 for longer words */
[data-curriculum="br"] .sw-tile[data-ti="5"]{ --sw-tile-bg:linear-gradient(145deg,#1e5c00,#2e8800); --sw-tile-border:rgba(170,255,34,.55); --sw-tile-shadow:rgba(20,80,0,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="6"]{ --sw-tile-bg:linear-gradient(145deg,#6a003a,#a0005a); --sw-tile-border:rgba(255,60,160,.55); --sw-tile-shadow:rgba(100,0,50,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="7"]{ --sw-tile-bg:linear-gradient(145deg,#003a44,#005566); --sw-tile-border:rgba(0,200,220,.5); --sw-tile-shadow:rgba(0,50,60,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="8"]{ --sw-tile-bg:linear-gradient(145deg,#4a3000,#704800); --sw-tile-border:rgba(255,180,0,.5); --sw-tile-shadow:rgba(60,30,0,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="9"]{ --sw-tile-bg:linear-gradient(145deg,#2a0060,#440090); --sw-tile-border:rgba(180,100,255,.55); --sw-tile-shadow:rgba(30,0,80,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="10"]{ --sw-tile-bg:linear-gradient(145deg,#1e5c00,#2e8800); --sw-tile-border:rgba(170,255,34,.55); --sw-tile-shadow:rgba(20,80,0,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="11"]{ --sw-tile-bg:linear-gradient(145deg,#6a003a,#a0005a); --sw-tile-border:rgba(255,60,160,.55); --sw-tile-shadow:rgba(100,0,50,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="12"]{ --sw-tile-bg:linear-gradient(145deg,#003a44,#005566); --sw-tile-border:rgba(0,200,220,.5); --sw-tile-shadow:rgba(0,50,60,.6); --sw-tile-text:#fff; }

/* ── BC tiles: very dark with glowing neon borders ── */
[data-curriculum="bc"] .sw-tile[data-ti="0"]{ --sw-tile-bg:linear-gradient(145deg,#041820,#062430); --sw-tile-border:rgba(0,230,255,.55); --sw-tile-shadow:rgba(0,20,40,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="1"]{ --sw-tile-bg:linear-gradient(145deg,#04201a,#063028); --sw-tile-border:rgba(0,220,160,.5); --sw-tile-shadow:rgba(0,20,20,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="2"]{ --sw-tile-bg:linear-gradient(145deg,#180828,#24103a); --sw-tile-border:rgba(170,80,255,.55); --sw-tile-shadow:rgba(20,0,40,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="3"]{ --sw-tile-bg:linear-gradient(145deg,#201200,#301a00); --sw-tile-border:rgba(255,170,0,.5); --sw-tile-shadow:rgba(30,10,0,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="4"]{ --sw-tile-bg:linear-gradient(145deg,#060a20,#0a1238); --sw-tile-border:rgba(80,120,255,.55); --sw-tile-shadow:rgba(0,0,40,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="5"]{ --sw-tile-bg:linear-gradient(145deg,#041820,#062430); --sw-tile-border:rgba(0,230,255,.55); --sw-tile-shadow:rgba(0,20,40,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="6"]{ --sw-tile-bg:linear-gradient(145deg,#04201a,#063028); --sw-tile-border:rgba(0,220,160,.5); --sw-tile-shadow:rgba(0,20,20,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="7"]{ --sw-tile-bg:linear-gradient(145deg,#180828,#24103a); --sw-tile-border:rgba(170,80,255,.55); --sw-tile-shadow:rgba(20,0,40,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="8"]{ --sw-tile-bg:linear-gradient(145deg,#201200,#301a00); --sw-tile-border:rgba(255,170,0,.5); --sw-tile-shadow:rgba(30,10,0,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="9"]{ --sw-tile-bg:linear-gradient(145deg,#060a20,#0a1238); --sw-tile-border:rgba(80,120,255,.55); --sw-tile-shadow:rgba(0,0,40,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="10"]{ --sw-tile-bg:linear-gradient(145deg,#041820,#062430); --sw-tile-border:rgba(0,230,255,.55); --sw-tile-shadow:rgba(0,20,40,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="11"]{ --sw-tile-bg:linear-gradient(145deg,#04201a,#063028); --sw-tile-border:rgba(0,220,160,.5); --sw-tile-shadow:rgba(0,20,20,.7); --sw-tile-text:#ecfeff; }
[data-curriculum="bc"] .sw-tile[data-ti="12"]{ --sw-tile-bg:linear-gradient(145deg,#180828,#24103a); --sw-tile-border:rgba(170,80,255,.55); --sw-tile-shadow:rgba(20,0,40,.7); --sw-tile-text:#ecfeff; }

/* ── PB tiles: white with thick pastel borders ── */
[data-curriculum="pb"] .sw-tile{
  background:#ffffff !important;
  box-shadow:0 5px 0 var(--sw-tile-shadow,#ffb0d8), 0 8px 16px rgba(255,110,180,.15) !important;
  text-shadow:none !important;
  --sw-tile-text:#2a1020;
}
[data-curriculum="pb"] .sw-tile[data-ti="0"]{ --sw-tile-border:#ff6eb4; --sw-tile-shadow:#ffb0d8; }
[data-curriculum="pb"] .sw-tile[data-ti="1"]{ --sw-tile-border:#cc88ff; --sw-tile-shadow:#ddb8ff; }
[data-curriculum="pb"] .sw-tile[data-ti="2"]{ --sw-tile-border:#44ccff; --sw-tile-shadow:#99e8ff; }
[data-curriculum="pb"] .sw-tile[data-ti="3"]{ --sw-tile-border:#ffcc44; --sw-tile-shadow:#ffe088; }
[data-curriculum="pb"] .sw-tile[data-ti="4"]{ --sw-tile-border:#44ddaa; --sw-tile-shadow:#88eedd; }
[data-curriculum="pb"] .sw-tile[data-ti="5"]{ --sw-tile-border:#ff6eb4; --sw-tile-shadow:#ffb0d8; }
[data-curriculum="pb"] .sw-tile[data-ti="6"]{ --sw-tile-border:#cc88ff; --sw-tile-shadow:#ddb8ff; }
[data-curriculum="pb"] .sw-tile[data-ti="7"]{ --sw-tile-border:#44ccff; --sw-tile-shadow:#99e8ff; }
[data-curriculum="pb"] .sw-tile[data-ti="8"]{ --sw-tile-border:#ffcc44; --sw-tile-shadow:#ffe088; }
[data-curriculum="pb"] .sw-tile[data-ti="9"]{ --sw-tile-border:#44ddaa; --sw-tile-shadow:#88eedd; }
[data-curriculum="pb"] .sw-tile[data-ti="10"]{ --sw-tile-border:#ff6eb4; --sw-tile-shadow:#ffb0d8; }
[data-curriculum="pb"] .sw-tile[data-ti="11"]{ --sw-tile-border:#cc88ff; --sw-tile-shadow:#ddb8ff; }
[data-curriculum="pb"] .sw-tile[data-ti="12"]{ --sw-tile-border:#44ccff; --sw-tile-shadow:#99e8ff; }
[data-curriculum="pb"] .sw-tile .vt-en-text{ color:#2a1020; }

/* tile entrance animation */
.sw-tile.sw-tile-in{
  animation:swTileIn .34s ease backwards;
  animation-delay:calc(var(--ti,0) * 0.055s);
}
@keyframes swTileIn{
  from{ transform:translateY(12px) scale(.9); opacity:0; }
  to{   transform:none; opacity:1; }
}

/* ══════════════════════════════════════════════════════════════
   BOTTOM BAR
   ══════════════════════════════════════════════════════════════ */
.sw-bottom-bar{
  display:flex; justify-content:center; align-items:center;
  gap:12px; margin-top:16px; flex-wrap:wrap;
}

/* CHECK button — gradient shimmer pill like vocab-tap */
.sw-check-btn{
  font-family:var(--game-font-title);
  font-size:clamp(17px,3.2vw,22px);
  letter-spacing:.08em;
  padding:14px 44px;
  border:none; border-radius:999px;
  cursor:pointer; position:relative; overflow:hidden;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:
    0 0 26px color-mix(in srgb, var(--game-primary) 50%, transparent),
    0 4px 0 color-mix(in srgb, var(--game-primary) 40%, #000),
    0 8px 20px rgba(0,0,0,.3);
  transition:transform .15s, opacity .2s, box-shadow .15s;
  -webkit-tap-highlight-color:transparent;
}
.sw-check-btn::after{
  content:'';
  position:absolute; top:-50%; left:-80%;
  width:48%; height:200%;
  background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.3) 50%,transparent 72%);
  transform:skewX(-16deg);
  transition:left .5s ease; pointer-events:none;
}
.sw-check-btn:hover::after{ left:150%; }
.sw-check-btn:hover{
  transform:translateY(-3px) scale(1.04);
  box-shadow:
    0 0 36px color-mix(in srgb, var(--game-primary) 65%, transparent),
    0 6px 0 color-mix(in srgb, var(--game-primary) 40%, #000),
    0 12px 28px rgba(0,0,0,.35);
}
.sw-check-btn:active{ transform:scale(.96); box-shadow:none; }
.sw-check-btn:disabled{ opacity:.32; pointer-events:none; box-shadow:none; }

/* CLEAR button — fun danger style, hidden until first wrong attempt */
.sw-clear-btn{
  font-family:var(--game-font-title);
  font-size:clamp(14px,2.8vw,18px);
  letter-spacing:.06em;
  padding:12px 28px;
  border-radius:999px;
  border:2.5px solid rgba(239,68,68,.5);
  background:rgba(239,68,68,.12);
  color:#ef4444;
  font-weight:900;
  cursor:pointer; position:relative; overflow:hidden;
  transition:transform .15s, background .18s, box-shadow .15s, border-color .15s;
  -webkit-tap-highlight-color:transparent;
  display:none; /* hidden until needed */
}
.sw-clear-btn.visible{ display:block; animation:swClearIn .3s cubic-bezier(.34,1.56,.64,1); }
@keyframes swClearIn{
  from{ transform:scale(0) rotate(-12deg); opacity:0; }
  to{ transform:none; opacity:1; }
}
.sw-clear-btn:hover{
  background:rgba(239,68,68,.22);
  border-color:#ef4444;
  transform:scale(1.05) rotate(-2deg);
  box-shadow:0 0 18px rgba(239,68,68,.35);
}
.sw-clear-btn:active{ transform:scale(.93); }

/* HELP button */
.sw-help-btn{
  width:46px; height:46px; border-radius:50%;
  border:2px solid var(--game-border);
  background:var(--game-surface);
  color:var(--game-muted);
  font-size:1.3rem; font-weight:900;
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .2s;
  flex-shrink:0;
  -webkit-tap-highlight-color:transparent;
}
.sw-help-btn:hover{
  border-color:var(--game-primary); color:var(--game-primary);
  box-shadow:0 0 14px color-mix(in srgb, var(--game-primary) 40%, transparent);
  transform:scale(1.08);
}
[data-curriculum="pb"] .sw-help-btn{
  background:#fff; border-color:#cc88ff; color:#aa44cc;
  box-shadow:0 3px 0 #ddb8ff;
}

/* ── CLOSE / X button ── */
.game-close{
  position:fixed; top:1rem; right:1rem; z-index:50;
  width:50px; height:50px; border-radius:50%;
  background:rgba(255,255,255,.1);
  border:2px solid rgba(255,255,255,.22);
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

/* ── feedback text ── */
.sw-feedback{
  text-align:center; min-height:2rem; margin-top:.6rem;
  font-family:var(--game-font-body);
  font-size:clamp(14px,2.6vw,18px); font-weight:900;
  transition:color .2s;
}
[data-curriculum="pb"] .sw-feedback{ color:#2a1020; }

/* ══════════════════════════════════════════════════════════════
   HOW TO PLAY MODAL
   ══════════════════════════════════════════════════════════════ */
.sw-modal-overlay{
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,.72); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  opacity:0; pointer-events:none; transition:opacity .25s;
}
.sw-modal-overlay.open{ opacity:1; pointer-events:all; }
.sw-modal{
  max-width:480px; width:calc(100% - 2rem);
  border-radius:28px; overflow:hidden;
  background:var(--game-bg);
  border:2px solid var(--game-primary);
  box-shadow:0 0 48px color-mix(in srgb, var(--game-primary) 30%, transparent), 0 24px 48px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
.sw-modal-overlay.open .sw-modal{ transform:none; }
[data-curriculum="pb"] .sw-modal{ background:#fff8fc; border-color:#ff6eb4; box-shadow:0 8px 0 #ffb0d8, 0 16px 40px rgba(255,110,180,.25); }
[data-curriculum="bc"] .sw-modal{ background:#030810; }

.sw-modal-header{
  padding:1.2rem 1.4rem .8rem;
  background:linear-gradient(135deg, color-mix(in srgb,var(--game-primary) 14%,transparent), color-mix(in srgb,var(--game-secondary) 8%,transparent));
  border-bottom:1px solid var(--game-border);
  text-align:center;
}
.sw-modal-title{
  font-family:var(--game-font-title);
  font-size:clamp(20px,4vw,26px); letter-spacing:.06em;
  color:var(--game-primary);
  text-shadow:0 0 16px color-mix(in srgb,var(--game-primary) 55%,transparent);
}
[data-curriculum="pb"] .sw-modal-title{ color:#ff6eb4; text-shadow:none; }
.sw-modal-title-jp{
  font-family:var(--game-font-jp);
  font-size:clamp(12px,2vw,15px); color:var(--game-muted); margin-top:4px;
}
[data-curriculum="pb"] .sw-modal-title-jp{ color:rgba(58,26,46,.55); }

.sw-modal-body{ padding:1.2rem 1.4rem 1.4rem; }
.sw-how-step{
  display:grid; grid-template-columns:36px 1fr;
  gap:10px; align-items:start; margin-bottom:.9rem;
}
.sw-how-step:last-child{ margin-bottom:0; }
.sw-how-num{
  width:36px; height:36px; border-radius:50%;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000;
  font-family:var(--game-font-title);
  font-size:clamp(14px,2.5vw,18px); font-weight:900;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
  box-shadow:0 0 12px color-mix(in srgb,var(--game-primary) 45%,transparent);
}
.sw-how-en{
  font-family:var(--game-font-body);
  font-size:clamp(13px,2.2vw,15px); font-weight:800;
  color:var(--game-ink); line-height:1.35; padding-top:2px;
}
[data-curriculum="pb"] .sw-how-en{ color:#2a1020; }
.sw-how-jp{
  font-family:var(--game-font-jp);
  font-size:clamp(11px,1.8vw,13px); color:var(--game-muted); margin-top:3px; line-height:1.4;
}
[data-curriculum="pb"] .sw-how-jp{ color:rgba(58,26,46,.55); }
.sw-modal-close{
  display:block; width:100%; margin-top:1.1rem;
  font-family:var(--game-font-title);
  font-size:clamp(15px,2.8vw,19px); letter-spacing:.06em;
  padding:12px; border-radius:999px; border:none; cursor:pointer;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:0 0 20px color-mix(in srgb,var(--game-primary) 45%,transparent);
  transition:transform .15s;
}
.sw-modal-close:hover{ transform:scale(1.03); }
.sw-modal-close:active{ transform:scale(.96); }

/* ══════════════════════════════════════════════════════════════
   RESULTS PANEL
   ══════════════════════════════════════════════════════════════ */
.sw-results{
  display:none;
  text-align:center; max-width:560px;
  margin:1.5rem auto;
  padding:2.6rem 1.6rem 2rem;
  border-radius:32px; position:relative; overflow:hidden;
  border:2.5px solid var(--tier-color, var(--game-primary));
  background:color-mix(in srgb, var(--tier-color,var(--game-primary)) 6%, var(--game-bg));
  box-shadow:
    0 0 60px color-mix(in srgb,var(--tier-color,var(--game-primary)) 22%,transparent),
    0 24px 48px rgba(0,0,0,.4);
}
.sw-results.show{
  display:block;
  animation:swResultIn .55s cubic-bezier(.22,.8,.36,1) both;
}
@keyframes swResultIn{
  from{ opacity:0; transform:scale(.82) translateY(28px); }
  to{ opacity:1; transform:none; }
}
.sw-results::before{
  content:''; position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto; animation:swRainbow 2.4s linear infinite;
}
.sw-results::after{
  content:''; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(circle at 20% 80%, color-mix(in srgb,var(--tier-color,var(--game-primary)) 12%,transparent) 0%,transparent 50%),
    radial-gradient(circle at 80% 20%, color-mix(in srgb,var(--game-secondary) 8%,transparent) 0%,transparent 50%);
}
.sw-res-inner{ position:relative; z-index:1; }

.sw-res-score{
  font-family:var(--game-font-title);
  font-size:clamp(62px,16vw,98px);
  line-height:1;
  color:var(--tier-color,var(--game-primary));
  text-shadow:0 0 28px var(--tier-color,var(--game-primary));
  margin-bottom:4px;
  animation:swScorePop .55s cubic-bezier(.22,.8,.36,1) .3s both;
}
@keyframes swScorePop{
  from{ transform:scale(.55) rotate(-6deg); opacity:0; }
  50%{ transform:scale(1.08) rotate(2deg); }
  to{ transform:none; opacity:1; }
}
.sw-res-pct{
  font-size:clamp(14px,2.6vw,19px); color:var(--game-muted);
  font-weight:700; margin-bottom:12px;
  animation:swFadeUp .4s ease .5s both;
}
.sw-res-label{
  font-family:var(--game-font-title);
  font-size:clamp(26px,5.5vw,40px);
  color:var(--tier-color,var(--game-primary));
  margin-bottom:10px; letter-spacing:.05em;
  text-shadow:0 0 18px color-mix(in srgb,var(--tier-color,var(--game-primary)) 55%,transparent);
  animation:swFadeUp .4s ease .52s both;
}
.sw-res-divider{
  width:60px; height:3px; border-radius:99px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary));
  margin:0 auto 12px; opacity:.6;
  animation:swFadeUp .4s ease .56s both;
}
.sw-res-en{
  font-family:var(--game-font-body); font-weight:900;
  font-size:clamp(14px,2.4vw,18px); color:var(--game-ink);
  margin-bottom:4px; animation:swFadeUp .4s ease .6s both;
}
.sw-res-jp{
  font-family:var(--game-font-jp); font-size:clamp(14px,2.2vw,17px);
  color:var(--game-muted); margin-bottom:3px; animation:swFadeUp .4s ease .64s both;
}
.sw-res-kanji{
  font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,14px);
  color:var(--game-muted); opacity:.7; margin-bottom:1.4rem;
  animation:swFadeUp .4s ease .68s both;
}
.sw-res-actions{
  display:flex; gap:12px; justify-content:center; flex-wrap:wrap;
  animation:swFadeUp .4s ease .76s both;
}
@keyframes swFadeUp{
  from{ transform:translateY(14px); opacity:0; }
  to{ transform:none; opacity:1; }
}

/* ── confetti ── */
@keyframes swConfetti{
  0%{ transform:translate(0,0) rotate(0deg) scale(1); opacity:1; }
  100%{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; }
}
.sw-confetti-piece{
  position:fixed; pointer-events:none; z-index:9999;
  border-radius:2px;
  animation:swConfetti 1.1s ease-out forwards;
}
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   MOUNT HTML
   ══════════════════════════════════════════════════════════════ */
U.mount(`
<div class="sw-wrap">

  <div class="sw-header">
    <div class="sw-curriculum">${curriculumLabel()}</div>
    <div class="sw-date">${titleDateLabel()}</div>
  </div>

  <div class="sw-dots-row" id="sw-dots"></div>

  <div class="sw-hud">
    <div class="sw-pill">Word <b id="sw-num">1</b> / 15</div>
    <div class="sw-pill">Score <b id="sw-score">0</b> / 15</div>
  </div>

  <div class="sw-jp-box" id="sw-jp-box">
    <div class="sw-jp-label">SPELL THE WORD / ことばをつづろう</div>
    <div class="sw-jp-kanji" id="sw-jp"></div>
    <div class="sw-jp-hira"  id="sw-hira"></div>
  </div>

  <div class="sw-slots" id="sw-slots"></div>
  <div class="sw-tiles" id="sw-tiles"></div>

  <div class="sw-bottom-bar">
    <button class="sw-clear-btn" id="sw-clear">CLEAR</button>
    <button class="sw-check-btn" id="sw-check" disabled>CHECK</button>
    <button class="sw-help-btn"  id="sw-help">？</button>
  </div>

  <div class="sw-feedback" id="sw-feedback"></div>

  <div class="sw-results" id="sw-results">
    <div class="sw-res-inner">
      <div class="sw-res-score"  id="sw-rs"></div>
      <div class="sw-res-pct"    id="sw-rp"></div>
      <div class="sw-res-label"  id="sw-rl"></div>
      <div class="sw-res-divider"></div>
      <div class="sw-res-en"     id="sw-re"></div>
      <div class="sw-res-jp"     id="sw-rj"></div>
      <div class="sw-res-kanji"  id="sw-rk"></div>
      <div class="sw-res-actions">
        <button class="game-btn game-btn-primary"   id="sw-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="sw-back">メニューへ</button>
      </div>
    </div>
  </div>

</div>

<!-- HOW TO PLAY MODAL -->
<div class="sw-modal-overlay" id="sw-modal-overlay">
  <div class="sw-modal" role="dialog" aria-modal="true">
    <div class="sw-modal-header">
      <div class="sw-modal-title">HOW TO PLAY</div>
      <div class="sw-modal-title-jp">あそびかた</div>
    </div>
    <div class="sw-modal-body">
      <div class="sw-how-step">
        <div class="sw-how-num">1</div>
        <div>
          <div class="sw-how-en">Look at the Japanese word above.</div>
          <div class="sw-how-jp">上の日本語の言葉を見よう。</div>
        </div>
      </div>
      <div class="sw-how-step">
        <div class="sw-how-num">2</div>
        <div>
          <div class="sw-how-en">Tap a letter tile to place it in the next slot.</div>
          <div class="sw-how-jp">文字タイルをタップしてスロットに入れよう。</div>
        </div>
      </div>
      <div class="sw-how-step">
        <div class="sw-how-num">3</div>
        <div>
          <div class="sw-how-en">Tap a filled slot to remove that letter.</div>
          <div class="sw-how-jp">スロットをタップすると文字が消えるよ。</div>
        </div>
      </div>
      <div class="sw-how-step">
        <div class="sw-how-num">4</div>
        <div>
          <div class="sw-how-en">Press CHECK when the word is spelled. First try = a point!</div>
          <div class="sw-how-jp">CHECKボタンを押そう。一発正解でポイントゲット！</div>
        </div>
      </div>
      <button class="sw-modal-close" id="sw-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>
`);

/* ══════════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════════ */
const numEl      = document.getElementById('sw-num');
const scoreEl    = document.getElementById('sw-score');
const jpEl       = document.getElementById('sw-jp');
const hiraEl     = document.getElementById('sw-hira');
const slotsEl    = document.getElementById('sw-slots');
const tilesEl    = document.getElementById('sw-tiles');
const feedbackEl = document.getElementById('sw-feedback');
const checkBtn   = document.getElementById('sw-check');
const clearBtn   = document.getElementById('sw-clear');
const helpBtn    = document.getElementById('sw-help');
const dotsRow    = document.getElementById('sw-dots');
const results    = document.getElementById('sw-results');
const wrap       = document.querySelector('.sw-wrap');
const modalOverlay = document.getElementById('sw-modal-overlay');

/* ── build 15 progress dots ── */
for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'sw-dot';
  d.id = `sw-d${i}`;
  dotsRow.appendChild(d);
}

/* ══════════════════════════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════════════════════════ */
helpBtn.addEventListener('click', () => modalOverlay.classList.add('open'));
document.getElementById('sw-modal-ok').addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOverlay.classList.remove('open'); });

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
let idx      = 0;
let score    = 0;
/* placed[i] = { letter, tileEl } or null */
let placed   = [];
let firstTry = true;
/* locked: true while grading, playing audio, or after correct before advance */
let locked   = false;
/* smashGuard: timestamp of last check press */
let lastCheckAt = 0;
const CHECK_DEBOUNCE_MS = 800;
/* hasMadeWrongAttempt: controls Clear button visibility */
let hasMadeWrongAttempt = false;

function updateDots() {
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`sw-d${i}`);
    if (!d) continue;
    d.className = 'sw-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
  }
}

/* ══════════════════════════════════════════════════════════════
   SHOW CARD
   ══════════════════════════════════════════════════════════════ */
function showCard() {
  locked = false;
  firstTry = true;
  hasMadeWrongAttempt = false;
  placed = [];
  feedbackEl.textContent = '';
  feedbackEl.style.color = '';
  clearBtn.classList.remove('visible');
  checkBtn.disabled = true;

  const card = allCards[idx];
  numEl.textContent  = idx + 1;
  jpEl.textContent   = card.jp;
  hiraEl.textContent = card.hira ? `（${card.hira}）` : '';
  updateDots();

  buildTiles(card);
  buildSlots(card);
}

/* ══════════════════════════════════════════════════════════════
   BUILD TILES
   ══════════════════════════════════════════════════════════════ */
function buildTiles(card) {
  tilesEl.innerHTML = '';
  const letters = U.shuffle(card.en.toLowerCase().split(''));

  letters.forEach((letter, ti) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'sw-tile sw-tile-in';
    tile.textContent = letter.toUpperCase();
    tile.dataset.ti = ti;
    tile.dataset.letter = letter;
    tile.style.setProperty('--ti', ti);

    /* touch: fire in same gesture for iOS audio */
    tile.addEventListener('touchstart', e => {
      e.preventDefault();
      unlockAllAudio();
      handleTileTap(tile);
    }, { passive: false });
    tile.addEventListener('click', e => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      handleTileTap(tile);
    });

    tilesEl.appendChild(tile);
  });
}

/* ══════════════════════════════════════════════════════════════
   BUILD SLOTS
   ══════════════════════════════════════════════════════════════ */
function buildSlots(card) {
  slotsEl.innerHTML = '';
  placed = new Array(card.en.length).fill(null);

  for (let i = 0; i < card.en.length; i++) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'sw-slot empty';
    slot.dataset.idx = i;
    slot.setAttribute('aria-label', `Slot ${i + 1}`);

    slot.addEventListener('touchstart', e => {
      e.preventDefault();
      handleSlotTap(i);
    }, { passive: false });
    slot.addEventListener('click', e => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      handleSlotTap(i);
    });

    slotsEl.appendChild(slot);
  }
}

/* ══════════════════════════════════════════════════════════════
   TILE TAP — place letter in first empty slot
   ══════════════════════════════════════════════════════════════ */
function handleTileTap(tile) {
  if (locked) return;
  if (tile.classList.contains('used')) return;

  /* find first empty slot */
  let emptyIdx = -1;
  for (let i = 0; i < placed.length; i++) {
    if (!placed[i]) { emptyIdx = i; break; }
  }
  if (emptyIdx === -1) return;

  tile.classList.add('used');
  placed[emptyIdx] = { letter: tile.dataset.letter, tileEl: tile };
  renderSlots();
  checkBtn.disabled = placed.some(p => !p);
}

/* ══════════════════════════════════════════════════════════════
   SLOT TAP — remove placed letter, return tile
   ══════════════════════════════════════════════════════════════ */
function handleSlotTap(i) {
  if (locked) return;
  if (!placed[i]) return;
  placed[i].tileEl.classList.remove('used');
  placed[i] = null;
  renderSlots();
  checkBtn.disabled = placed.some(p => !p);
}

/* ══════════════════════════════════════════════════════════════
   RENDER SLOTS
   ══════════════════════════════════════════════════════════════ */
function renderSlots() {
  const slotEls = slotsEl.querySelectorAll('.sw-slot');
  slotEls.forEach((slot, i) => {
    slot.classList.remove('sw-correct', 'sw-wrong');
    if (placed[i]) {
      slot.textContent = placed[i].letter.toUpperCase();
      slot.className = 'sw-slot filled';
      slot.dataset.idx = i;
      /* re-attach listeners after className wipe */
      attachSlotListeners(slot, i);
    } else {
      slot.textContent = '';
      slot.className = 'sw-slot empty';
      slot.dataset.idx = i;
      attachSlotListeners(slot, i);
    }
  });
}

function attachSlotListeners(slot, i) {
  /* Clone to remove old listeners, then re-add */
  const fresh = slot.cloneNode(true);
  fresh.addEventListener('touchstart', e => {
    e.preventDefault();
    handleSlotTap(i);
  }, { passive: false });
  fresh.addEventListener('click', e => {
    if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
    handleSlotTap(i);
  });
  slot.parentNode.replaceChild(fresh, slot);
}

/* ══════════════════════════════════════════════════════════════
   CLEAR
   ══════════════════════════════════════════════════════════════ */
clearBtn.addEventListener('click', () => {
  if (locked) return;
  placed.forEach(p => { if (p) p.tileEl.classList.remove('used'); });
  const card = allCards[idx];
  placed = new Array(card.en.length).fill(null);
  renderSlots();
  feedbackEl.textContent = '';
  checkBtn.disabled = true;
});

/* ══════════════════════════════════════════════════════════════
   CHECK
   ══════════════════════════════════════════════════════════════ */
checkBtn.addEventListener('click', () => {
  if (locked) return;
  const now = Date.now();
  if (now - lastCheckAt < CHECK_DEBOUNCE_MS) return;
  lastCheckAt = now;

  const card = allCards[idx];
  if (placed.some(p => !p)) {
    feedbackEl.textContent = 'Fill all the letters first!';
    feedbackEl.style.color = '#ffaa00';
    return;
  }

  const answer = placed.map(p => p.letter).join('');
  const correct = answer.toLowerCase() === card.en.toLowerCase();

  const slotEls = Array.from(slotsEl.querySelectorAll('.sw-slot'));

  if (correct) {
    locked = true;
    /* show all slots green */
    slotEls.forEach((sl, i) => {
      /* stagger pop-in */
      setTimeout(() => {
        sl.classList.remove('sw-wrong', 'filled', 'empty');
        sl.classList.add('sw-correct');
      }, i * 60);
    });

    feedbackEl.textContent = card.en.toUpperCase() + '!';
    feedbackEl.style.color = '#22c55e';
    U.playSFX('ding');

    if (firstTry) {
      score++;
      scoreEl.textContent = score;
    }
    updateDots();

    /* fire confetti on perfect-so-far */
    if (score === 15 || firstTry) fireConfetti(false);

    /* play word audio ONCE, then advance */
    const advanceDelay = 300;
    setTimeout(() => {
      playWord(card.mp3, () => {
        setTimeout(() => {
          idx++;
          if (idx >= allCards.length) showResults();
          else showCard();
        }, 400);
      });
    }, advanceDelay);

  } else {
    /* wrong answer */
    locked = true;
    firstTry = false;
    hasMadeWrongAttempt = true;
    clearBtn.classList.add('visible');

    /* per-slot: green if correct position, red if wrong */
    const target = card.en.toLowerCase();
    slotEls.forEach((sl, i) => {
      setTimeout(() => {
        sl.classList.remove('filled', 'empty');
        if (placed[i] && placed[i].letter === target[i]) {
          sl.classList.add('sw-correct');
        } else {
          sl.classList.add('sw-wrong');
        }
      }, i * 55);
    });

    feedbackEl.textContent = 'Not quite — try again!';
    feedbackEl.style.color = '#ef4444';
    U.playSFX('fart');

    /* after showing the result, unlock so student can clear + retry */
    const totalDelay = slotEls.length * 55 + 700;
    setTimeout(() => {
      locked = false;
    }, totalDelay);
  }
});

/* ══════════════════════════════════════════════════════════════
   CONFETTI
   ══════════════════════════════════════════════════════════════ */
function fireConfetti(big = false) {
  const colors = ['#ffcc00','#aaff22','#ff2288','#22ddff','#cc88ff','#ff6600','#ffffff'];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.4;
  const count = big ? 80 : 38;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'sw-confetti-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist  = (big ? 180 : 100) + Math.random() * 220;
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
   RESULTS
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  updateDots();
  const gameContent = wrap.querySelector('.sw-jp-box');
  /* hide gameplay UI */
  [
    document.getElementById('sw-jp-box'),
    slotsEl, tilesEl,
    document.querySelector('.sw-bottom-bar'),
    feedbackEl,
    document.querySelector('.sw-hud'),
    dotsRow,
  ].forEach(el => { if (el) el.style.display = 'none'; });

  results.classList.add('show');
  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);
  results.style.setProperty('--tier-color', tier.color);

  document.getElementById('sw-rs').textContent = `${score} / 15`;
  document.getElementById('sw-rp').textContent = `${pct}%`;
  document.getElementById('sw-rl').textContent = tier.label;
  document.getElementById('sw-re').textContent = tier.en;
  document.getElementById('sw-rj').textContent = tier.jp;
  document.getElementById('sw-rk').textContent = tier.kanji;

  if (score >= 15) {
    setTimeout(() => fireConfetti(true), 400);
    setTimeout(() => fireConfetti(true), 900);
  } else if (score >= 11) {
    setTimeout(() => fireConfetti(false), 500);
  }

  const snd = new Audio(CFG.sfxBase + tier.sound);
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

/* ══════════════════════════════════════════════════════════════
   REPLAY / BACK
   ══════════════════════════════════════════════════════════════ */
document.getElementById('sw-replay').addEventListener('click', () => {
  results.classList.remove('show');
  [
    document.getElementById('sw-jp-box'),
    slotsEl, tilesEl,
    document.querySelector('.sw-bottom-bar'),
    feedbackEl,
    document.querySelector('.sw-hud'),
    dotsRow,
  ].forEach(el => { if (el) el.style.display = ''; });
  idx = 0; score = 0;
  scoreEl.textContent = '0';
  U.shuffle(allCards);
  showCard();
});

document.getElementById('sw-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

/* ══════════════════════════════════════════════════════════════
   GO
   ══════════════════════════════════════════════════════════════ */
showCard();

})();
