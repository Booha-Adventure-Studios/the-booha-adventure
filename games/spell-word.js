
/* ══════════════════════════════════════════════════════════════
   spell-word.js  —  Spell the Word  v4
   ══════════════════════════════════════════════════════════════
   FIXES v4:
   - Audio unlock uses SILENT AudioContext oscillator — fixes the
     "all audio plays at once on first tap" root cause.
   - Tiles fire ZERO audio on click. Slots fire ZERO audio.
   - Tiles and slots always display LOWERCASE (CSS + JS).
   - Correct sequence (nothing overlaps):
       slots go green → ding plays → ding.onended fires →
       confetti + dance → word audio plays → advance
   - No feedback text shown on correct answer
   - LISTEN replaced with pink speaker SVG circle button
   - Per-curriculum speaker glow theme (pink / cyan / amber)
   - Fully responsive: clamp() on every size, box-sizing border-box
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.unlockAudio();

/* ══════════════════════════════════════════════════════════════
   AUDIO ENGINE
   ══════════════════════════════════════════════════════════════ */
await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

/* Cache word audio objects — only load, never auto-play */
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

/* ── Silent AudioContext unlock ─────────────────────────────
   Plays a zero-gain oscillator for 1 ms on first user gesture.
   This warm-starts the audio context on iOS/Android WITHOUT
   playing any game audio files simultaneously.               */
let ctxUnlocked = false;
function unlockCtx() {
  if (ctxUnlocked) return;
  ctxUnlocked = true;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(ctx.currentTime + 0.001);
    ctx.resume().catch(() => {});
  } catch {}
}
document.addEventListener('touchstart', unlockCtx, { once: true, passive: true });
document.addEventListener('mousedown',  unlockCtx, { once: true, passive: true });

/* ── One active audio track at a time ── */
let activeAudio = null;

function stopActive() {
  if (!activeAudio) return;
  try { activeAudio.pause(); activeAudio.currentTime = 0; } catch {}
  activeAudio.onended = null;
  activeAudio.onerror = null;
  activeAudio = null;
}

/* Play a word audio; onEnd fires when it finishes (or errors/times out) */
function playAudio(mp3, onEnd) {
  if (!mp3) { if (onEnd) setTimeout(onEnd, 0); return; }
  const a = wordCache[mp3];
  if (!a)  { if (onEnd) setTimeout(onEnd, 0); return; }
  stopActive();
  activeAudio = a;
  let safety;
  a.onended = () => { clearTimeout(safety); activeAudio = null; if (onEnd) onEnd(); };
  a.onerror = () => { clearTimeout(safety); activeAudio = null; if (onEnd) onEnd(); };
  safety = setTimeout(() => {
    if (activeAudio === a) { stopActive(); if (onEnd) onEnd(); }
  }, 5000);
  try { a.currentTime = 0; } catch {}
  const p = a.play();
  if (p && p.catch) p.catch(() => { clearTimeout(safety); if (onEnd) onEnd(); });
}

/* Debounced play for the speaker button — no callback, no smashing */
let speakerDebounce = false;
function playListen(mp3) {
  if (speakerDebounce) return;
  speakerDebounce = true;
  setTimeout(() => { speakerDebounce = false; }, 1300);
  if (!mp3) return;
  const a = wordCache[mp3];
  if (!a) return;
  stopActive();
  activeAudio = a;
  a.onended = () => { activeAudio = null; };
  a.onerror = () => { activeAudio = null; };
  try { a.currentTime = 0; } catch {}
  const p = a.play();
  if (p && p.catch) p.catch(() => {});
}

/* ── U.playSFX callback shim ─────────────────────────────────
   If GAME_UTILS.playSFX doesn't accept a callback, wrap it so
   the correct-answer chain (ding → word audio) works reliably. */
(function shimSFX() {
  if (!U.playSFX) return;
  const _orig = U.playSFX.bind(U);
  U.playSFX = function(name, onEnd) {
    _orig(name);
    if (onEnd) {
      /* Approximate ding ~650 ms, fart ~500 ms */
      setTimeout(onEnd, name === 'ding' ? 680 : 520);
    }
  };
})();

/* ══════════════════════════════════════════════════════════════
   DATA / TIERS
   ══════════════════════════════════════════════════════════════ */
const allCards = U.shuffle(CFG.cards.slice(0, 15));

const TIERS = [
  { min:0,  max:5,  sound:'result_0-5.mp3',
    label:'TRY AGAIN', en:"Rough start — but you've got this!",
    jp:'もう一回やってみよう！', kanji:'もう一回挑戦！', color:'#ef4444' },
  { min:6,  max:10, sound:'result_6-10.mp3',
    label:'KEEP GOING', en:'Nice effort. You are getting stronger!',
    jp:'いい感じ！どんどん上手！', kanji:'良い調子！どんどん上達！', color:'#f97316' },
  { min:11, max:14, sound:'result_11-14.mp3',
    label:'SO CLOSE!', en:'Almost perfect. Really strong work!',
    jp:'おしい！すごく上手！', kanji:'惜しい！とても上手！', color:'#22ddff' },
  { min:15, max:15, sound:'result_15.mp3',
    label:'PERFECT!', en:'Flawless! Every single word!',
    jp:'パーフェクト！全問正解！', kanji:'完璧！全問正解！', color:'#ffcc00' },
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
*,*::before,*::after{ box-sizing:border-box; }

/* suppress the host-page injected header — sw-wrap draws its own */
.game-header{ display:none !important; }
.sw-wrap{
  position:relative; z-index:1;
  max-width:640px; margin:0 auto;
  padding:0 .75rem 5rem; width:100%;
}

/* ── header ── */
.sw-header{ text-align:center; padding:.5rem 3rem .65rem; }
.sw-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(19px,5.5vw,46px); font-weight:900;
  letter-spacing:.12em; text-transform:uppercase;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  animation:swRainbow 3s linear infinite;
}
[data-curriculum="bc"] .sw-curriculum{
  background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .sw-curriculum{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
@keyframes swRainbow{ to{ background-position:220% center; } }

.sw-date{
  margin-top:3px; font-family:var(--game-font-body);
  font-size:clamp(10px,1.8vw,14px); font-weight:800;
  color:var(--game-muted); letter-spacing:.06em;
}
[data-curriculum="pb"] .sw-date{ color:rgba(58,26,46,.55); }

/* ── dots ── */
.sw-dots-row{
  display:flex; justify-content:center; gap:5px;
  margin:.4rem 0 .3rem; flex-wrap:wrap; padding:0 .5rem;
}
.sw-dot{
  width:9px; height:9px; border-radius:50%;
  background:rgba(255,255,255,.12); border:1.5px solid rgba(255,255,255,.18);
  transition:all .3s; flex-shrink:0;
}
.sw-dot.active{ background:var(--game-primary); border-color:var(--game-primary); box-shadow:0 0 8px var(--game-primary); }
.sw-dot.done{ background:#22c55e; border-color:#22c55e; box-shadow:0 0 7px rgba(34,197,94,.7); }
[data-curriculum="pb"] .sw-dot{ background:rgba(255,110,180,.15); border-color:rgba(255,110,180,.25); }

/* ── HUD pills ── */
.sw-hud{ display:flex; justify-content:center; gap:8px; margin-bottom:.5rem; flex-wrap:wrap; }
.sw-pill{
  padding:4px 13px; border-radius:999px;
  background:var(--game-pill-bg); border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text); font-size:clamp(11px,1.9vw,14px);
  font-weight:900; letter-spacing:.03em; box-shadow:0 2px 10px rgba(0,0,0,.2);
}
.sw-pill b{ color:var(--game-primary); font-size:1.1em; text-shadow:0 0 9px var(--game-primary); }
[data-curriculum="pb"] .sw-pill{ background:#fff; border-color:#ffb0d8; color:#2a1020; box-shadow:0 3px 0 #ffccdd; }
[data-curriculum="pb"] .sw-pill b{ text-shadow:none; }

/* ── JP box ── */
.sw-jp-box{
  border-radius:18px; padding:.9rem 1.1rem .8rem;
  margin-bottom:.85rem; text-align:center;
  position:relative; overflow:hidden;
  background:var(--game-surface); border:2px solid var(--game-border);
  backdrop-filter:blur(12px); box-shadow:0 6px 26px rgba(0,0,0,.22);
}
[data-curriculum="br"] .sw-jp-box{
  background:linear-gradient(145deg,rgba(170,255,34,.07),rgba(255,204,0,.04),rgba(0,0,0,.18));
  border-color:rgba(170,255,34,.22);
}
[data-curriculum="bc"] .sw-jp-box{
  background:linear-gradient(145deg,rgba(0,240,255,.06),rgba(68,85,255,.08),rgba(0,0,0,.28));
  border-color:rgba(0,240,255,.22);
}
[data-curriculum="pb"] .sw-jp-box{
  background:#fff; border:3px solid #ff6eb4;
  box-shadow:0 5px 0 #ffb0d8, 0 8px 20px rgba(255,110,180,.15);
}
.sw-jp-box::before{
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto; animation:swRainbow 2.4s linear infinite; pointer-events:none;
}
[data-curriculum="pb"] .sw-jp-box::before{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4); background-size:220% auto;
}
.sw-jp-label{
  font-family:var(--game-font-title); font-size:clamp(7px,1.4vw,10px);
  letter-spacing:.22em; text-transform:uppercase; color:var(--game-primary); opacity:.7; margin-bottom:.4rem;
}
[data-curriculum="pb"] .sw-jp-label{ color:#ff6eb4; }
.sw-jp-kanji{
  font-family:var(--game-font-jp); font-size:clamp(23px,5.5vw,42px);
  font-weight:900; color:var(--game-ink); line-height:1.15; letter-spacing:.04em;
}
[data-curriculum="pb"] .sw-jp-kanji{ color:#2a1020; }
.sw-jp-hira{
  font-family:var(--game-font-jp); font-size:clamp(12px,2.2vw,17px);
  color:var(--game-muted); margin-top:3px;
}
[data-curriculum="pb"] .sw-jp-hira{ color:rgba(58,26,46,.55); }

/* ══════════════════════════════════════════════════════════════
   ANSWER SLOTS
   ══════════════════════════════════════════════════════════════ */
.sw-slots{
  display:flex; flex-wrap:wrap; gap:5px; justify-content:center;
  margin:0 0 .6rem; min-height:54px;
}
.sw-slot{
  width:clamp(36px,8vw,55px);
  height:clamp(42px,9vw,60px);
  border-radius:11px;
  display:flex; align-items:center; justify-content:center;
  font-family:var(--game-font-title);
  font-size:clamp(15px,3.8vw,26px);
  font-weight:900;
  text-transform:lowercase;
  cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, background .14s;
  position:relative; flex-shrink:0;
}
.sw-slot.empty{
  background:rgba(255,255,255,.06); border:2.5px dashed rgba(255,255,255,.2);
  color:rgba(255,255,255,.15);
}
[data-curriculum="pb"] .sw-slot.empty{
  background:rgba(255,110,180,.06); border:2.5px dashed rgba(255,110,180,.3);
}
.sw-slot.filled{
  background:linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07));
  border:2.5px solid rgba(255,255,255,.3); color:var(--game-ink);
  box-shadow:0 4px 0 rgba(0,0,0,.25),0 5px 12px rgba(0,0,0,.2);
  transform:translateY(-2px);
}
.sw-slot.filled:active{ transform:scale(.92); }
[data-curriculum="pb"] .sw-slot.filled{
  background:#fff; border:2.5px solid #cc88ff; color:#2a1020;
  box-shadow:0 4px 0 #ddb8ff;
}
.sw-slot.sw-correct{
  background:rgba(34,197,94,.18) !important;
  border:2.5px solid #22c55e !important; color:#22c55e !important;
  box-shadow:0 0 0 3px rgba(34,197,94,.22),0 0 16px rgba(34,197,94,.4) !important;
  animation:swSlotPop .3s cubic-bezier(.34,1.56,.64,1);
}
.sw-slot.sw-wrong{
  background:rgba(239,68,68,.15) !important;
  border:2.5px solid #ef4444 !important; color:#ef4444 !important;
  box-shadow:0 0 0 3px rgba(239,68,68,.22),0 0 18px rgba(239,68,68,.5) !important;
  animation:swSlotShake .42s ease;
}
.sw-slot.sw-dance{
  animation:swSlotDance .55s cubic-bezier(.34,1.56,.64,1) both !important;
}
@keyframes swSlotPop{ from{ transform:scale(.85); } 60%{ transform:scale(1.1); } to{ transform:scale(1); } }
@keyframes swSlotShake{
  0%,100%{ transform:translateX(0); }
  20%{ transform:translateX(-5px); } 40%{ transform:translateX(5px); }
  60%{ transform:translateX(-3px); } 80%{ transform:translateX(3px); }
}
@keyframes swSlotDance{
  0%  { transform:translateY(0) scale(1) rotate(0deg); }
  20% { transform:translateY(-9px) scale(1.12) rotate(-6deg); }
  40% { transform:translateY(-5px) scale(1.07) rotate(5deg); }
  60% { transform:translateY(-9px) scale(1.1) rotate(-4deg); }
  80% { transform:translateY(-3px) scale(1.04) rotate(2deg); }
  100%{ transform:translateY(0) scale(1) rotate(0deg); }
}

/* ══════════════════════════════════════════════════════════════
   LETTER TILES — always lowercase in CSS and JS
   ══════════════════════════════════════════════════════════════ */
.sw-tiles{
  display:flex; flex-wrap:wrap; gap:6px; justify-content:center;
  margin:0 0 .8rem; min-height:60px;
}
.sw-tile{
  width:clamp(42px,9vw,62px);
  height:clamp(48px,10vw,68px);
  border-radius:13px;
  display:flex; align-items:center; justify-content:center;
  font-family:'Nunito', sans-serif;
  font-size:clamp(17px,4vw,29px);
  font-weight:900;
  text-transform:lowercase;
  cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
  position:relative; overflow:hidden; flex-shrink:0;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, opacity .18s;
  background:var(--sw-tile-bg,linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07)));
  border:2px solid var(--sw-tile-border,rgba(255,255,255,.28));
  color:var(--sw-tile-text,var(--game-tile-text));
  box-shadow:0 5px 0 var(--sw-tile-shadow,rgba(0,0,0,.35)),0 7px 14px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.2);
  text-shadow:0 1px 2px rgba(0,0,0,.4);
}
.sw-tile::after{
  content:''; position:absolute; top:-60%; left:-80%; width:50%; height:200%;
  background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.28) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .45s ease; pointer-events:none;
}
.sw-tile:hover::after{ left:150%; }
.sw-tile:hover{ transform:translateY(-4px) scale(1.07); }
.sw-tile:active{ transform:scale(.92); }
.sw-tile.used{ opacity:0; pointer-events:none; transform:scale(.8); }
.sw-tile.sw-tile-in{
  animation:swTileIn .32s ease backwards;
  animation-delay:calc(var(--ti,0)*0.05s);
}
@keyframes swTileIn{ from{ transform:translateY(10px) scale(.9); opacity:0; } to{ transform:none; opacity:1; } }

/* ── BR tile palette ── */
[data-curriculum="br"] .sw-tile[data-ti="0"]{ --sw-tile-bg:linear-gradient(145deg,#1e5c00,#2e8800); --sw-tile-border:rgba(170,255,34,.55); --sw-tile-shadow:rgba(20,80,0,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="1"]{ --sw-tile-bg:linear-gradient(145deg,#6a003a,#a0005a); --sw-tile-border:rgba(255,60,160,.55); --sw-tile-shadow:rgba(100,0,50,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="2"]{ --sw-tile-bg:linear-gradient(145deg,#003a44,#005566); --sw-tile-border:rgba(0,200,220,.5); --sw-tile-shadow:rgba(0,50,60,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="3"]{ --sw-tile-bg:linear-gradient(145deg,#4a3000,#704800); --sw-tile-border:rgba(255,180,0,.5); --sw-tile-shadow:rgba(60,30,0,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="4"]{ --sw-tile-bg:linear-gradient(145deg,#2a0060,#440090); --sw-tile-border:rgba(180,100,255,.55); --sw-tile-shadow:rgba(30,0,80,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="5"]{ --sw-tile-bg:linear-gradient(145deg,#1e5c00,#2e8800); --sw-tile-border:rgba(170,255,34,.55); --sw-tile-shadow:rgba(20,80,0,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="6"]{ --sw-tile-bg:linear-gradient(145deg,#6a003a,#a0005a); --sw-tile-border:rgba(255,60,160,.55); --sw-tile-shadow:rgba(100,0,50,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="7"]{ --sw-tile-bg:linear-gradient(145deg,#003a44,#005566); --sw-tile-border:rgba(0,200,220,.5); --sw-tile-shadow:rgba(0,50,60,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="8"]{ --sw-tile-bg:linear-gradient(145deg,#4a3000,#704800); --sw-tile-border:rgba(255,180,0,.5); --sw-tile-shadow:rgba(60,30,0,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="9"]{ --sw-tile-bg:linear-gradient(145deg,#2a0060,#440090); --sw-tile-border:rgba(180,100,255,.55); --sw-tile-shadow:rgba(30,0,80,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="10"]{ --sw-tile-bg:linear-gradient(145deg,#1e5c00,#2e8800); --sw-tile-border:rgba(170,255,34,.55); --sw-tile-shadow:rgba(20,80,0,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="11"]{ --sw-tile-bg:linear-gradient(145deg,#6a003a,#a0005a); --sw-tile-border:rgba(255,60,160,.55); --sw-tile-shadow:rgba(100,0,50,.6); --sw-tile-text:#fff; }
[data-curriculum="br"] .sw-tile[data-ti="12"]{ --sw-tile-bg:linear-gradient(145deg,#003a44,#005566); --sw-tile-border:rgba(0,200,220,.5); --sw-tile-shadow:rgba(0,50,60,.6); --sw-tile-text:#fff; }
/* ── BC tile palette ── */
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
/* ── PB tile palette ── */
[data-curriculum="pb"] .sw-tile{
  background:#fff !important; text-shadow:none !important;
  box-shadow:0 5px 0 var(--sw-tile-shadow,#ffb0d8),0 7px 14px rgba(255,110,180,.15) !important;
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

/* ══════════════════════════════════════════════════════════════
   BOTTOM BAR
   ══════════════════════════════════════════════════════════════ */
.sw-bottom-bar{
  display:flex; justify-content:center; align-items:center;
  gap:9px; margin-top:12px; flex-wrap:wrap;
}

/* CHECK */
.sw-check-btn{
  font-family:var(--game-font-title);
  font-size:clamp(14px,3vw,19px); letter-spacing:.08em;
  padding:12px 36px; border:none; border-radius:999px;
  cursor:pointer; position:relative; overflow:hidden;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:0 0 22px color-mix(in srgb,var(--game-primary) 48%,transparent),
    0 4px 0 color-mix(in srgb,var(--game-primary) 40%,#000), 0 7px 16px rgba(0,0,0,.3);
  transition:transform .15s, opacity .2s, box-shadow .15s;
  -webkit-tap-highlight-color:transparent;
}
.sw-check-btn::after{
  content:''; position:absolute; top:-50%; left:-80%; width:48%; height:200%;
  background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.3) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .5s ease; pointer-events:none;
}
.sw-check-btn:hover::after{ left:150%; }
.sw-check-btn:hover{ transform:translateY(-2px) scale(1.04); }
.sw-check-btn:active{ transform:scale(.96); box-shadow:none; }
.sw-check-btn:disabled{ opacity:.32; pointer-events:none; box-shadow:none; }

/* CLEAR */
.sw-clear-btn{
  font-family:var(--game-font-title);
  font-size:clamp(12px,2.4vw,15px); letter-spacing:.06em;
  padding:10px 22px; border-radius:999px;
  border:2.5px solid rgba(239,68,68,.5); background:rgba(239,68,68,.12);
  color:#ef4444; font-weight:900; cursor:pointer;
  transition:transform .15s, background .18s, border-color .15s;
  -webkit-tap-highlight-color:transparent; display:none;
}
.sw-clear-btn.visible{ display:block; animation:swClearIn .28s cubic-bezier(.34,1.56,.64,1); }
@keyframes swClearIn{ from{ transform:scale(0) rotate(-12deg); opacity:0; } to{ transform:none; opacity:1; } }
.sw-clear-btn:hover{ background:rgba(239,68,68,.22); border-color:#ef4444; transform:scale(1.05) rotate(-2deg); }
.sw-clear-btn:active{ transform:scale(.93); }

/* ── SPEAKER button — pink circle with SVG ────────────────── */
.sw-speaker-btn{
  width:46px; height:46px; border-radius:50%; padding:0;
  border:2.5px solid #ff6eb4;
  background:linear-gradient(135deg,#ff88cc,#ff44aa);
  color:#fff;
  display:none; align-items:center; justify-content:center;
  cursor:pointer; flex-shrink:0;
  transition:transform .15s, box-shadow .2s, opacity .2s;
  -webkit-tap-highlight-color:transparent;
}
.sw-speaker-btn svg{ width:22px; height:22px; display:block; pointer-events:none; }
.sw-speaker-btn.visible{
  display:flex;
  animation:swSpeakerGlowPb 1.6s ease-in-out infinite, swSpeakerIn .28s cubic-bezier(.34,1.56,.64,1);
}
.sw-speaker-btn:disabled{ opacity:.38; pointer-events:none; animation:none; box-shadow:none; }
.sw-speaker-btn:hover:not(:disabled){ transform:scale(1.13); }
.sw-speaker-btn:active:not(:disabled){ transform:scale(.91); }

@keyframes swSpeakerIn{ from{ transform:scale(0) rotate(-15deg); opacity:0; } to{ transform:none; opacity:1; } }
@keyframes swSpeakerGlowPb{
  0%,100%{ box-shadow:0 0 10px 2px rgba(255,100,180,.55),0 4px 0 rgba(160,0,80,.5); }
  50%{     box-shadow:0 0 26px 6px rgba(255,100,180,.95),0 4px 0 rgba(160,0,80,.5); }
}

/* BC — cyan speaker */
[data-curriculum="bc"] .sw-speaker-btn{
  background:linear-gradient(135deg,#00ddb0,#0099cc);
  border-color:rgba(0,220,180,.7); color:#001a14;
}
[data-curriculum="bc"] .sw-speaker-btn.visible{
  animation:swSpeakerGlowBc 1.6s ease-in-out infinite, swSpeakerIn .28s cubic-bezier(.34,1.56,.64,1);
}
@keyframes swSpeakerGlowBc{
  0%,100%{ box-shadow:0 0 10px 2px rgba(0,200,180,.55),0 4px 0 rgba(0,60,50,.6); }
  50%{     box-shadow:0 0 26px 6px rgba(0,220,180,.95),0 4px 0 rgba(0,60,50,.6); }
}

/* BR — amber speaker */
[data-curriculum="br"] .sw-speaker-btn{
  background:linear-gradient(135deg,#ffaa00,#ff6600);
  border-color:rgba(255,160,0,.7); color:#1a0800;
}
[data-curriculum="br"] .sw-speaker-btn.visible{
  animation:swSpeakerGlowBr 1.6s ease-in-out infinite, swSpeakerIn .28s cubic-bezier(.34,1.56,.64,1);
}
@keyframes swSpeakerGlowBr{
  0%,100%{ box-shadow:0 0 10px 2px rgba(255,160,0,.55),0 4px 0 rgba(120,50,0,.5); }
  50%{     box-shadow:0 0 26px 6px rgba(255,160,0,.95),0 4px 0 rgba(120,50,0,.5); }
}

/* HELP */
.sw-help-btn{
  width:44px; height:44px; border-radius:50%;
  border:2px solid var(--game-border); background:var(--game-surface);
  color:var(--game-muted); font-size:1.15rem; font-weight:900;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  transition:all .2s; flex-shrink:0; -webkit-tap-highlight-color:transparent;
}
.sw-help-btn:hover{ border-color:var(--game-primary); color:var(--game-primary); transform:scale(1.08); }
[data-curriculum="pb"] .sw-help-btn{ background:#fff; border-color:#cc88ff; color:#aa44cc; box-shadow:0 3px 0 #ddb8ff; }

/* CLOSE */
.game-close{
  position:fixed; top:.9rem; right:.9rem; z-index:50;
  width:46px; height:46px; border-radius:50%;
  background:rgba(255,255,255,.1); border:2px solid rgba(255,255,255,.22);
  color:#fff; font-size:1.15rem;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; backdrop-filter:blur(10px);
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
  text-decoration:none; font-weight:900;
  box-shadow:0 4px 14px rgba(0,0,0,.25); -webkit-tap-highlight-color:transparent;
}
.game-close:hover{ background:rgba(239,68,68,.55); border-color:rgba(239,68,68,.7); transform:scale(1.18) rotate(12deg); }
.game-close:active{ transform:scale(.9); }
[data-curriculum="pb"] .game-close{ background:#fff; border:3px solid #ff6eb4; color:#ff6eb4; box-shadow:0 4px 0 #ffb0d8; }
[data-curriculum="bc"] .game-close{ border-color:rgba(0,240,255,.22); }

/* feedback — empty on correct */
.sw-feedback{
  text-align:center; min-height:1.5rem; margin-top:.35rem;
  font-family:var(--game-font-body); font-size:clamp(12px,2.2vw,16px);
  font-weight:900; transition:color .2s;
}
[data-curriculum="pb"] .sw-feedback{ color:#2a1020; }

/* ── HOW TO PLAY MODAL ── */
.sw-modal-overlay{
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,.72); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  opacity:0; pointer-events:none; transition:opacity .25s; padding:1rem;
}
.sw-modal-overlay.open{ opacity:1; pointer-events:all; }
.sw-modal{
  max-width:440px; width:100%; border-radius:22px; overflow:hidden;
  background:var(--game-bg); border:2px solid var(--game-primary);
  box-shadow:0 0 40px color-mix(in srgb,var(--game-primary) 28%,transparent),0 20px 40px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
  max-height:90vh; overflow-y:auto;
}
.sw-modal-overlay.open .sw-modal{ transform:none; }
[data-curriculum="pb"] .sw-modal{ background:#fff8fc; border-color:#ff6eb4; }
[data-curriculum="bc"] .sw-modal{ background:#030810; }
.sw-modal-header{ padding:.9rem 1.1rem .6rem; border-bottom:1px solid var(--game-border); text-align:center; }
.sw-modal-title{ font-family:var(--game-font-title); font-size:clamp(17px,3.5vw,22px); letter-spacing:.06em; color:var(--game-primary); }
[data-curriculum="pb"] .sw-modal-title{ color:#ff6eb4; }
.sw-modal-title-jp{ font-family:var(--game-font-jp); font-size:clamp(10px,1.7vw,13px); color:var(--game-muted); margin-top:3px; }
.sw-modal-body{ padding:.9rem 1.1rem 1.1rem; }
.sw-how-step{ display:grid; grid-template-columns:30px 1fr; gap:8px; align-items:start; margin-bottom:.65rem; }
.sw-how-step:last-child{ margin-bottom:0; }
.sw-how-num{
  width:30px; height:30px; border-radius:50%;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-family:var(--game-font-title); font-size:clamp(11px,2vw,14px);
  font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.sw-how-en{ font-family:var(--game-font-body); font-size:clamp(11px,1.9vw,13px); font-weight:800; color:var(--game-ink); line-height:1.35; padding-top:2px; }
[data-curriculum="pb"] .sw-how-en{ color:#2a1020; }
.sw-how-jp{ font-family:var(--game-font-jp); font-size:clamp(9px,1.5vw,11px); color:var(--game-muted); margin-top:2px; line-height:1.4; }
.sw-modal-close{
  display:block; width:100%; margin-top:.9rem;
  font-family:var(--game-font-title); font-size:clamp(13px,2.4vw,16px);
  letter-spacing:.06em; padding:10px; border-radius:999px; border:none; cursor:pointer;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-weight:900; transition:transform .15s;
}
.sw-modal-close:hover{ transform:scale(1.03); }

/* ── RESULTS ── */
.sw-results{
  display:none; text-align:center; max-width:500px;
  margin:.8rem auto 1.5rem; padding:1.9rem 1.2rem 1.5rem;
  border-radius:26px; position:relative; overflow:hidden;
  border:2.5px solid var(--tier-color,var(--game-primary));
  background:color-mix(in srgb,var(--tier-color,var(--game-primary)) 7%,var(--game-bg));
  box-shadow:0 0 52px color-mix(in srgb,var(--tier-color,var(--game-primary)) 28%,transparent),0 20px 42px rgba(0,0,0,.4);
}
.sw-results.show{ display:block; animation:swResultIn .5s cubic-bezier(.22,.8,.36,1) both; }
@keyframes swResultIn{ from{ opacity:0; transform:scale(.82) translateY(24px); } to{ opacity:1; transform:none; } }
.sw-results::before{
  content:''; position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto; animation:swRainbow 2.4s linear infinite;
}
.sw-results::after{
  content:''; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(circle at 18% 80%,color-mix(in srgb,var(--tier-color,var(--game-primary)) 14%,transparent) 0%,transparent 55%),
    radial-gradient(circle at 82% 18%,color-mix(in srgb,#22ddff 10%,transparent) 0%,transparent 55%),
    radial-gradient(circle at 50% 50%,color-mix(in srgb,#cc88ff 5%,transparent) 0%,transparent 70%);
}
.sw-res-inner{ position:relative; z-index:1; }
.sw-res-score{
  font-family:var(--game-font-title); font-size:clamp(50px,13vw,88px);
  line-height:1; color:var(--tier-color,var(--game-primary));
  text-shadow:0 0 28px var(--tier-color,var(--game-primary)),0 0 52px var(--tier-color,var(--game-primary));
  margin-bottom:4px; animation:swScorePop .5s cubic-bezier(.22,.8,.36,1) .3s both;
}
@keyframes swScorePop{ from{ transform:scale(.55) rotate(-6deg); opacity:0; } 50%{ transform:scale(1.08) rotate(2deg); } to{ transform:none; opacity:1; } }
.sw-res-pct{ font-size:clamp(11px,2.1vw,15px); color:var(--game-muted); font-weight:700; margin-bottom:9px; animation:swFadeUp .4s ease .5s both; }
.sw-res-label{
  font-family:var(--game-font-title); font-size:clamp(21px,5vw,36px);
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  animation:swRainbow 2s linear infinite, swFadeUp .4s ease .52s both;
  margin-bottom:9px; letter-spacing:.06em;
}
.sw-res-divider{
  width:80px; height:3px; border-radius:99px;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff);
  margin:0 auto 10px; opacity:.85; animation:swFadeUp .4s ease .56s both;
}
.sw-res-en{ font-family:var(--game-font-body); font-weight:900; font-size:clamp(12px,2vw,16px); color:var(--game-ink); margin-bottom:4px; animation:swFadeUp .4s ease .6s both; }
.sw-res-jp{ font-family:var(--game-font-jp); font-size:clamp(12px,1.9vw,15px); color:var(--game-muted); margin-bottom:3px; animation:swFadeUp .4s ease .64s both; }
.sw-res-kanji{ font-family:var(--game-font-jp); font-size:clamp(9px,1.5vw,12px); color:var(--game-muted); opacity:.7; margin-bottom:1rem; animation:swFadeUp .4s ease .68s both; }
.sw-res-actions{ display:flex; gap:9px; justify-content:center; flex-wrap:wrap; animation:swFadeUp .4s ease .76s both; }
@keyframes swFadeUp{ from{ transform:translateY(12px); opacity:0; } to{ transform:none; opacity:1; } }

/* confetti */
@keyframes swConfetti{
  0%{ transform:translate(0,0) rotate(0deg) scale(1); opacity:1; }
  100%{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; }
}
.sw-confetti-piece{
  position:fixed; pointer-events:none; z-index:9999; border-radius:2px;
  animation:swConfetti 1.1s ease-out forwards;
}
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   MOUNT HTML
   ══════════════════════════════════════════════════════════════ */
const SPEAKER_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z" opacity=".6"/></svg>`;

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
    <button class="sw-clear-btn"   id="sw-clear">CLEAR</button>
    <button class="sw-speaker-btn" id="sw-speaker" aria-label="Listen">${SPEAKER_SVG}</button>
    <button class="sw-check-btn"   id="sw-check" disabled>CHECK</button>
    <button class="sw-help-btn"    id="sw-help">?</button>
  </div>
  <div class="sw-feedback" id="sw-feedback"></div>
  <div class="sw-results" id="sw-results">
    <div class="sw-res-inner">
      <div class="sw-res-score" id="sw-rs"></div>
      <div class="sw-res-pct"   id="sw-rp"></div>
      <div class="sw-res-label" id="sw-rl"></div>
      <div class="sw-res-divider"></div>
      <div class="sw-res-en"    id="sw-re"></div>
      <div class="sw-res-jp"    id="sw-rj"></div>
      <div class="sw-res-kanji" id="sw-rk"></div>
      <div class="sw-res-actions">
        <button class="game-btn game-btn-primary"   id="sw-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="sw-back">メニューへ</button>
      </div>
    </div>
  </div>
</div>
<div class="sw-modal-overlay" id="sw-modal-overlay">
  <div class="sw-modal" role="dialog" aria-modal="true">
    <div class="sw-modal-header">
      <div class="sw-modal-title">HOW TO PLAY</div>
      <div class="sw-modal-title-jp">あそびかた</div>
    </div>
    <div class="sw-modal-body">
      <div class="sw-how-step"><div class="sw-how-num">1</div><div>
        <div class="sw-how-en">Look at the Japanese word shown above.</div>
        <div class="sw-how-jp">上の日本語の言葉を見よう。</div>
      </div></div>
      <div class="sw-how-step"><div class="sw-how-num">2</div><div>
        <div class="sw-how-en">Tap letter tiles to spell it in the slots below.</div>
        <div class="sw-how-jp">文字タイルをタップしてスロットに入れよう。</div>
      </div></div>
      <div class="sw-how-step"><div class="sw-how-num">3</div><div>
        <div class="sw-how-en">Tap a filled slot to remove that letter.</div>
        <div class="sw-how-jp">スロットをタップすると文字が消えるよ。</div>
      </div></div>
      <div class="sw-how-step"><div class="sw-how-num">4</div><div>
        <div class="sw-how-en">Press CHECK when done. First-try correct = 1 point!</div>
        <div class="sw-how-jp">CHECKを押そう。一発正解でポイントゲット！</div>
      </div></div>
      <div class="sw-how-step"><div class="sw-how-num">5</div><div>
        <div class="sw-how-en">After 3 wrong tries the speaker button appears — tap to hear the word.</div>
        <div class="sw-how-jp">3回まちがえるとスピーカーボタンで言葉を聞けるよ。</div>
      </div></div>
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
const speakerBtn = document.getElementById('sw-speaker');
const helpBtn    = document.getElementById('sw-help');
const dotsRow    = document.getElementById('sw-dots');
const results    = document.getElementById('sw-results');
const modalOverlay = document.getElementById('sw-modal-overlay');

for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'sw-dot'; d.id = `sw-d${i}`;
  dotsRow.appendChild(d);
}

helpBtn.addEventListener('click', () => modalOverlay.classList.add('open'));
document.getElementById('sw-modal-ok').addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOverlay.classList.remove('open'); });

/* ── speaker button — debounced, disables for 1.3 s after tap ── */
function fireSpeaker() {
  if (speakerBtn.disabled) return;
  speakerBtn.disabled = true;
  setTimeout(() => { speakerBtn.disabled = false; }, 1400);
  playListen(allCards[idx]?.mp3);
}
speakerBtn.addEventListener('touchstart', e => { e.preventDefault(); unlockCtx(); fireSpeaker(); }, { passive: false });
speakerBtn.addEventListener('click', e => {
  if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
  fireSpeaker();
});

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
let idx        = 0;
let score      = 0;
let placed     = [];
let firstTry   = true;
let locked     = false;
let wrongCount = 0;
let lastCheckAt = 0;
const CHECK_DEBOUNCE = 700;

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
  locked = false; firstTry = true; wrongCount = 0; placed = [];
  feedbackEl.textContent = ''; feedbackEl.style.color = '';
  clearBtn.classList.remove('visible');
  speakerBtn.classList.remove('visible');
  speakerBtn.disabled = false;
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
   BUILD TILES — lowercase, zero audio
   ══════════════════════════════════════════════════════════════ */
function buildTiles(card) {
  tilesEl.innerHTML = '';
  const letters = U.shuffle(card.en.toLowerCase().split(''));
  letters.forEach((letter, ti) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'sw-tile sw-tile-in';
    tile.textContent = letter;          /* lowercase only, no audio */
    tile.dataset.ti = ti;
    tile.dataset.letter = letter;
    tile.style.setProperty('--ti', ti);
    tile.addEventListener('touchstart', e => { e.preventDefault(); handleTileTap(tile); }, { passive: false });
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
    slot.type = 'button'; slot.className = 'sw-slot empty'; slot.dataset.idx = i;
    attachSlot(slot, i);
    slotsEl.appendChild(slot);
  }
}

/* ══════════════════════════════════════════════════════════════
   TILE TAP — place letter, zero audio
   ══════════════════════════════════════════════════════════════ */
function handleTileTap(tile) {
  if (locked || tile.classList.contains('used')) return;
  const emptyIdx = placed.indexOf(null);
  if (emptyIdx === -1) return;
  tile.classList.add('used');
  placed[emptyIdx] = { letter: tile.dataset.letter, tileEl: tile };
  renderSlots();
  checkBtn.disabled = placed.some(p => !p);
}

/* ══════════════════════════════════════════════════════════════
   SLOT TAP — remove letter, zero audio
   ══════════════════════════════════════════════════════════════ */
function handleSlotTap(i) {
  if (locked || !placed[i]) return;
  placed[i].tileEl.classList.remove('used');
  placed[i] = null;
  renderSlots();
  checkBtn.disabled = placed.some(p => !p);
}

/* ══════════════════════════════════════════════════════════════
   RENDER SLOTS — always lowercase
   ══════════════════════════════════════════════════════════════ */
function renderSlots() {
  Array.from(slotsEl.querySelectorAll('.sw-slot')).forEach((slot, i) => {
    slot.classList.remove('sw-correct', 'sw-wrong', 'sw-dance');
    if (placed[i]) {
      slot.textContent = placed[i].letter; /* already lowercase */
      slot.className = 'sw-slot filled';
    } else {
      slot.textContent = '';
      slot.className = 'sw-slot empty';
    }
    slot.dataset.idx = i;
    attachSlot(slot, i);
  });
}

function attachSlot(slot, i) {
  const fresh = slot.cloneNode(true);
  fresh.addEventListener('touchstart', e => { e.preventDefault(); handleSlotTap(i); }, { passive: false });
  fresh.addEventListener('click', e => {
    if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
    handleSlotTap(i);
  });
  if (slot.parentNode) slot.parentNode.replaceChild(fresh, slot);
}

/* ══════════════════════════════════════════════════════════════
   CLEAR
   ══════════════════════════════════════════════════════════════ */
clearBtn.addEventListener('click', () => {
  if (locked) return;
  placed.forEach(p => { if (p) p.tileEl.classList.remove('used'); });
  placed = new Array(allCards[idx].en.length).fill(null);
  renderSlots();
  feedbackEl.textContent = '';
  checkBtn.disabled = true;
});

/* ══════════════════════════════════════════════════════════════
   CHECK
   Correct sequence — nothing overlaps:
   1. slots go green (staggered)
   2. ding plays
   3. ding.onended → confetti + dance start
   4. after dance completes → word audio plays
   5. word.onended → advance to next card
   ══════════════════════════════════════════════════════════════ */
checkBtn.addEventListener('click', () => {
  if (locked) return;
  const now = Date.now();
  if (now - lastCheckAt < CHECK_DEBOUNCE) return;
  lastCheckAt = now;

  const card = allCards[idx];
  if (placed.some(p => !p)) {
    feedbackEl.textContent = 'Fill all the letters first!';
    feedbackEl.style.color = '#ffaa00';
    return;
  }

  const answer  = placed.map(p => p.letter).join('').toLowerCase();
  const correct = answer === card.en.toLowerCase();
  const slotEls = Array.from(slotsEl.querySelectorAll('.sw-slot'));

  if (correct) {
    locked = true;

    /* 1. slots go green */
    slotEls.forEach((sl, i) => {
      setTimeout(() => {
        sl.classList.remove('sw-wrong', 'filled', 'empty');
        sl.classList.add('sw-correct');
      }, i * 55);
    });

    /* clear feedback — no correct-answer text */
    feedbackEl.textContent = '';

    if (firstTry) { score++; scoreEl.textContent = score; }
    updateDots();

    /* 2. ding after slots finish */
    setTimeout(() => {
      U.playSFX('ding', () => {
        /* 3. confetti */
        fireConfetti(false);

        /* 3. dance on slots */
        Array.from(slotsEl.querySelectorAll('.sw-slot')).forEach((sl, i) => {
          setTimeout(() => {
            sl.classList.add('sw-dance');
            sl.addEventListener('animationend', () => sl.classList.remove('sw-dance'), { once: true });
          }, i * 50);
        });

        /* 4 & 5. word audio → advance */
        const danceMs = slotEls.length * 50 + 280;
        setTimeout(() => {
          playAudio(card.mp3, () => {
            setTimeout(() => {
              idx++;
              if (idx >= allCards.length) showResults();
              else showCard();
            }, 300);
          });
        }, danceMs);
      });
    }, slotEls.length * 55 + 20);

  } else {
    /* wrong */
    locked = true; firstTry = false; wrongCount++;
    clearBtn.classList.add('visible');
    if (wrongCount >= 3) speakerBtn.classList.add('visible');

    const target = card.en.toLowerCase();
    slotEls.forEach((sl, i) => {
      setTimeout(() => {
        sl.classList.remove('filled', 'empty');
        sl.classList.add(placed[i] && placed[i].letter === target[i] ? 'sw-correct' : 'sw-wrong');
      }, i * 50);
    });

    feedbackEl.textContent = 'Not quite — try again!';
    feedbackEl.style.color = '#ef4444';
    U.playSFX('fart');

    setTimeout(() => { locked = false; }, slotEls.length * 50 + 620);
  }
});

/* ══════════════════════════════════════════════════════════════
   CONFETTI
   ══════════════════════════════════════════════════════════════ */
function fireConfetti(big = false) {
  const colors = ['#ffcc00','#aaff22','#ff2288','#22ddff','#cc88ff','#ff6600','#fff'];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.38;
  for (let i = 0, n = big ? 80 : 36; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'sw-confetti-piece';
    const a = Math.random() * Math.PI * 2;
    const d = (big ? 180 : 90) + Math.random() * 200;
    el.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i%colors.length]};--cx:${(Math.cos(a)*d).toFixed(1)}px;--cy:${(Math.sin(a)*d).toFixed(1)}px;--cr:${((Math.random()-.5)*700).toFixed(0)}deg;animation-delay:${(Math.random()*.18).toFixed(3)}s;animation-duration:${(.8+Math.random()*.45).toFixed(3)}s;border-radius:${Math.random()>.5?'50%':'2px'};width:${(5+Math.random()*7).toFixed(1)}px;height:${(5+Math.random()*7).toFixed(1)}px;`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* ══════════════════════════════════════════════════════════════
   DROP-IN REPLACEMENT for showResults() in spell-word.js

   REPLACE everything from `function showResults() {` through
   the final `showCard();` and `})();` with this block.

   BUGS THAT WERE THERE:
   1. BoohaAdventure direct reference → ReferenceError crash.
   2. mainWrap.style.display = 'none' → mainWrap doesn't exist
      in this game. Results live inside .sw-wrap, not a separate
      wrapper. The card elements hide individually.
   3. resultsWrap.classList.add('show') → resultsWrap doesn't
      exist. #sw-results hides/shows itself directly.
   4. resActions.innerHTML / tier.actions → this game uses
      hardcoded game-btn buttons in the HTML, not a dynamic
      resActions container. Wired by getElementById directly.
   5. buildShuffledDeck(), startRound(), hiraMode, hiraLabel →
      none of these exist in spell-word. Replay uses allCards,
      idx, score, showCard().
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   RESULTS
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  /* Hide gameplay elements — leave .sw-header and .sw-dots-row visible */
  document.getElementById('sw-jp-box').style.display   = 'none';
  document.getElementById('sw-slots').style.display    = 'none';
  document.getElementById('sw-tiles').style.display    = 'none';
  document.getElementById('sw-feedback').style.display = 'none';
  document.querySelector('.sw-bottom-bar').style.display = 'none';
  document.querySelector('.sw-hud').style.display      = 'none';
  /* .sw-dots-row intentionally kept visible — shows all-done state */

  /* Mark all dots done */
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`sw-d${i}`);
    if (d) d.className = 'sw-dot done';
  }

   
  /* Show results card */
  results.classList.add('show');

  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);

  /* ── Save score to Booha Adventure save system ── */
 document.dispatchEvent(new CustomEvent('booha:gameEnd', {
    detail: {
      saveId:    `${CFG.curriculum}:spell_word`,
      score:     pct,
      completed: score === 40,
    }
  }));

  /* Populate scorecard — sw-* IDs matching this game's HTML */
  results.style.setProperty('--tier-color', tier.color);
  document.getElementById('sw-rs').textContent = `${score} / 15`;
  document.getElementById('sw-rp').textContent = `${pct}%`;
  document.getElementById('sw-rl').textContent = tier.label;
  document.getElementById('sw-re').textContent = tier.en;
  document.getElementById('sw-rj').textContent = tier.jp;
  document.getElementById('sw-rk').textContent = tier.kanji;

  /* Wire the hardcoded buttons already in the HTML */
  const replayBtn = document.getElementById('sw-replay');
  const backBtn   = document.getElementById('sw-back');

  if (replayBtn) replayBtn.addEventListener('click', () => {
    /* Restore all gameplay elements */
    document.getElementById('sw-jp-box').style.display   = '';
    document.getElementById('sw-slots').style.display    = '';
    document.getElementById('sw-tiles').style.display    = '';
    document.getElementById('sw-feedback').style.display = '';
    document.querySelector('.sw-bottom-bar').style.display = '';
    document.querySelector('.sw-hud').style.display      = '';
    /* .sw-dots-row was never hidden, no need to restore */
    results.classList.remove('show');

    /* Reset state — spell-word uses idx/score/allCards/showCard */
    idx   = 0;
    score = 0;
    scoreEl.textContent = '0';
    U.shuffle(allCards);
    showCard();
  });

  if (backBtn) backBtn.addEventListener('click', () => {
    window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
  });

  if (score === 15) {
    setTimeout(() => fireConfetti(false), 400);
    setTimeout(() => fireConfetti(true),  900);
  }

 if (CFG.sfxBase && tier.sound) {
    const snd = new Audio(CFG.sfxBase + tier.sound);
    snd.setAttribute('playsinline', '');
    snd.setAttribute('webkit-playsinline', '');
    snd.play().catch(() => {});
  }

/* ══════════════════════════════════════════════════════════════
   GO
   ══════════════════════════════════════════════════════════════ */
showCard();
})();
