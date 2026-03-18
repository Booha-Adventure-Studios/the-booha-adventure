
/* ══════════════════════════════════════════════════════════════
   sentence-order.js  —  Sentence Order  v4
   ══════════════════════════════════════════════════════════════
   FIXES v4:
   - Audio unlock uses SILENT AudioContext oscillator — fixes the
     "all audio plays at once on first tap" root cause.
   - Word tiles fire ZERO audio on click.
   - Correct sequence (nothing overlaps):
       chips go green → ding plays → ding.onended fires →
       sparkles + dance → sentence audio plays → advance
   - No feedback text shown on correct answer.
   - LISTEN replaced with themed speaker SVG circle button.
   - First placed word capitalised; last placed word gets period.
     Bank tiles always fully lowercase.
   - Fully responsive / mobile-safe.
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

const sentCache = {};
for (const card of CFG.cards.slice(0, 15)) {
  if (!card.mp3 || sentCache[card.mp3]) continue;
  const a = new Audio(CFG.audioBase + card.mp3);
  a.preload = 'auto';
  a.setAttribute('playsinline', '');
  a.setAttribute('webkit-playsinline', '');
  try { a.load(); } catch {}
  sentCache[card.mp3] = a;
}

/* ── Silent AudioContext unlock ─────────────────────────────
   Plays a zero-gain oscillator for 1 ms on first user gesture.
   Does NOT play any game audio files — fixes "all audio at once". */
let ctxUnlocked = false;
function unlockCtx() {
  if (ctxUnlocked) return;
  ctxUnlocked = true;
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(0); osc.stop(ctx.currentTime + 0.001);
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

function playAudio(mp3, onEnd) {
  if (!mp3) { if (onEnd) setTimeout(onEnd, 0); return; }
  const a = sentCache[mp3];
  if (!a)  { if (onEnd) setTimeout(onEnd, 0); return; }
  stopActive();
  activeAudio = a;
  let safety;
  a.onended = () => { clearTimeout(safety); activeAudio = null; if (onEnd) onEnd(); };
  a.onerror = () => { clearTimeout(safety); activeAudio = null; if (onEnd) onEnd(); };
  safety = setTimeout(() => { if (activeAudio === a) { stopActive(); if (onEnd) onEnd(); } }, 8000);
  try { a.currentTime = 0; } catch {}
  const p = a.play();
  if (p && p.catch) p.catch(() => { clearTimeout(safety); if (onEnd) onEnd(); });
}

/* Debounced play for speaker button — no callback, no smashing */
let speakerDebounce = false;
function playListen(mp3) {
  if (speakerDebounce) return;
  speakerDebounce = true;
  setTimeout(() => { speakerDebounce = false; }, 1300);
  if (!mp3) return;
  const a = sentCache[mp3];
  if (!a) return;
  stopActive();
  activeAudio = a;
  a.onended = () => { activeAudio = null; };
  a.onerror = () => { activeAudio = null; };
  try { a.currentTime = 0; } catch {}
  const p = a.play();
  if (p && p.catch) p.catch(() => {});
}

/* ── U.playSFX callback shim ── */
(function shimSFX() {
  if (!U.playSFX) return;
  const _orig = U.playSFX.bind(U);
  U.playSFX = function(name, onEnd) {
    _orig(name);
    if (onEnd) setTimeout(onEnd, name === 'ding' ? 680 : 520);
  };
})();

/* ══════════════════════════════════════════════════════════════
   WORD HELPERS
   ══════════════════════════════════════════════════════════════ */
function tokenise(sentence) {
  const raw = sentence.trim().replace(/[.!?]+$/, '').split(/\s+/);
  return raw.map((w, i) => ({ raw: w, key: `${w}_${i}`, idx: i }));
}

/* Bank tiles: fully lowercase, no punctuation */
function displayTile(token) {
  return token.raw.toLowerCase().replace(/[.,!?]*$/, '');
}

/* Placed chips: first position capitalised, last position gets period */
function displayChip(token, isFirst, isLast) {
  let w = token.raw.toLowerCase().replace(/[.,!?]*$/, '');
  if (isFirst) w = w.charAt(0).toUpperCase() + w.slice(1);
  if (isLast)  w = w + '.';
  return w;
}

/* ══════════════════════════════════════════════════════════════
   DATA / TIERS
   ══════════════════════════════════════════════════════════════ */
const allCards = U.shuffle(CFG.cards.slice(0, 15));

const TIERS = [
  { min:0,  max:5,  sound:'result_0-5.mp3',
    label:'TRY AGAIN', en:"Sentences are tricky — keep at it!",
    jp:'文は難しい！あきらめないで！', kanji:'文章は難しい！諦めないで！', color:'#ef4444' },
  { min:6,  max:10, sound:'result_6-10.mp3',
    label:'KEEP GOING', en:"Good effort! The order is clicking!",
    jp:'いい感じ！もっと練習しよう！', kanji:'良い調子！もっと練習しよう！', color:'#f97316' },
  { min:11, max:14, sound:'result_11-14.mp3',
    label:'SO CLOSE!', en:"Your word order is really flowing!",
    jp:'ほぼペラペラ！惜しい！', kanji:'ほぼ流暢！惜しい！', color:'#22ddff' },
  { min:15, max:15, sound:'result_15.mp3',
    label:'PERFECT!', en:"Every sentence in perfect order!",
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
  const m  = wp.match(/_(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)_w([1-4])/i);
  if (!m) return 'This Week';
  const MM = { jan:'January', feb:'February', mar:'March', apr:'April',
    may:'May', jun:'June', jul:'July', aug:'August',
    sep:'September', oct:'October', nov:'November', dec:'December' };
  return `${MM[m[1].toLowerCase()]} Week ${m[2]}`;
}

/* ══════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `
*,*::before,*::after{ box-sizing:border-box; }
/* suppress the host-page injected header — so-wrap draws its own */
.game-header{ display:none !important; }

.so-wrap{
  position:relative; z-index:1;
  max-width:640px; margin:0 auto;
  padding:0 .75rem 5rem; width:100%;
}

/* ── header ── */
.so-header{ text-align:center; padding:.5rem 3rem .65rem; }
.so-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(19px,5.5vw,46px); font-weight:900;
  letter-spacing:.12em; text-transform:uppercase;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  animation:soRainbow 3s linear infinite;
}
[data-curriculum="bc"] .so-curriculum{
  background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .so-curriculum{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
@keyframes soRainbow{ to{ background-position:220% center; } }

.so-date{
  margin-top:3px; font-family:var(--game-font-body);
  font-size:clamp(10px,1.8vw,14px); font-weight:800;
  color:var(--game-muted); letter-spacing:.06em;
}
[data-curriculum="pb"] .so-date{ color:rgba(58,26,46,.55); }

/* ── dots ── */
.so-dots-row{
  display:flex; justify-content:center; gap:5px;
  margin:.4rem 0 .3rem; flex-wrap:wrap; padding:0 .5rem;
}
.so-dot{
  width:9px; height:9px; border-radius:50%;
  background:rgba(255,255,255,.12); border:1.5px solid rgba(255,255,255,.18);
  transition:all .3s; flex-shrink:0;
}
.so-dot.active{ background:var(--game-primary); border-color:var(--game-primary); box-shadow:0 0 8px var(--game-primary); }
.so-dot.done{ background:#22c55e; border-color:#22c55e; box-shadow:0 0 7px rgba(34,197,94,.7); }
[data-curriculum="pb"] .so-dot{ background:rgba(255,110,180,.15); border-color:rgba(255,110,180,.25); }

/* ── HUD pills ── */
.so-hud{ display:flex; justify-content:center; gap:8px; margin-bottom:.5rem; flex-wrap:wrap; }
.so-pill{
  padding:4px 13px; border-radius:999px;
  background:var(--game-pill-bg); border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text); font-size:clamp(11px,1.9vw,14px);
  font-weight:900; letter-spacing:.03em; box-shadow:0 2px 10px rgba(0,0,0,.2);
}
.so-pill b{ color:var(--game-primary); font-size:1.1em; text-shadow:0 0 9px var(--game-primary); }
[data-curriculum="pb"] .so-pill{ background:#fff; border-color:#ffb0d8; color:#2a1020; box-shadow:0 3px 0 #ffccdd; }
[data-curriculum="pb"] .so-pill b{ text-shadow:none; }

/* ── JP box ── */
.so-jp-box{
  border-radius:18px; padding:.9rem 1.1rem .8rem;
  margin-bottom:.8rem; text-align:center;
  position:relative; overflow:hidden;
  background:var(--game-surface); border:2px solid var(--game-border);
  backdrop-filter:blur(12px); box-shadow:0 6px 26px rgba(0,0,0,.22);
}
[data-curriculum="br"] .so-jp-box{
  background:linear-gradient(145deg,rgba(255,140,0,.09),rgba(255,80,0,.05),rgba(0,0,0,.18));
  border-color:rgba(255,140,0,.28);
}
[data-curriculum="bc"] .so-jp-box{
  background:linear-gradient(145deg,rgba(0,255,180,.07),rgba(0,200,255,.05),rgba(0,0,0,.28));
  border-color:rgba(0,230,180,.25);
}
[data-curriculum="pb"] .so-jp-box{
  background:#fff; border:3px solid #ff6eb4;
  box-shadow:0 5px 0 #ffb0d8, 0 8px 20px rgba(255,110,180,.15);
}
.so-jp-box::before{
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto; animation:soRainbow 2.4s linear infinite; pointer-events:none;
}
[data-curriculum="pb"] .so-jp-box::before{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4); background-size:220% auto;
}
.so-jp-label{
  font-family:var(--game-font-title); font-size:clamp(7px,1.4vw,10px);
  letter-spacing:.22em; text-transform:uppercase; color:var(--game-primary); opacity:.7; margin-bottom:.4rem;
}
[data-curriculum="br"] .so-jp-label{ color:rgba(255,160,40,1); }
[data-curriculum="bc"] .so-jp-label{ color:rgba(0,220,180,1); }
[data-curriculum="pb"] .so-jp-label{ color:#ff6eb4; }
.so-jp-kanji{
  font-family:var(--game-font-jp); font-size:clamp(17px,4vw,32px);
  font-weight:900; color:var(--game-ink); line-height:1.4; text-wrap:balance;
}
[data-curriculum="pb"] .so-jp-kanji{ color:#2a1020; }
.so-jp-hira{
  font-family:var(--game-font-jp); font-size:clamp(14px,2.5vw,20px);
  font-weight:900; color:var(--game-ink); line-height:1.4; text-wrap:balance; display:none;
}
[data-curriculum="pb"] .so-jp-hira{ color:#2a1020; }
body.hira-mode .so-jp-kanji{ display:none; }
body.hira-mode .so-jp-hira{ display:block; }

/* ── answer zone ── */
.so-answer-zone{
  min-height:62px; border-radius:16px; padding:8px 10px;
  display:flex; flex-wrap:wrap; gap:7px; align-content:flex-start;
  background:rgba(255,255,255,.04); border:2.5px dashed rgba(255,255,255,.18);
  margin-bottom:.75rem; position:relative; transition:border-color .2s, background .2s;
}
[data-curriculum="br"] .so-answer-zone{ background:rgba(255,140,0,.04); border-color:rgba(255,140,0,.2); }
[data-curriculum="bc"] .so-answer-zone{ background:rgba(0,200,180,.04); border-color:rgba(0,200,180,.18); }
[data-curriculum="pb"] .so-answer-zone{ background:rgba(255,110,180,.05); border-color:rgba(255,110,180,.28); }
.so-answer-zone.has-words{ border-style:solid; }
[data-curriculum="br"] .so-answer-zone.has-words{ border-color:rgba(255,140,0,.4); }
[data-curriculum="bc"] .so-answer-zone.has-words{ border-color:rgba(0,200,180,.35); }
[data-curriculum="pb"] .so-answer-zone.has-words{ border-color:#ff6eb4; }
.so-answer-empty-hint{
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-family:var(--game-font-body); font-size:clamp(10px,1.8vw,12px);
  letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,.2); pointer-events:none;
}
[data-curriculum="pb"] .so-answer-empty-hint{ color:rgba(58,26,46,.25); }

/* ── placed word chip ── */
.so-placed-chip{
  display:inline-flex; align-items:center; justify-content:center;
  padding:6px 12px; border-radius:12px; cursor:pointer;
  user-select:none; -webkit-tap-highlight-color:transparent;
  font-family:var(--game-font-body); font-weight:700;
  font-size:clamp(12px,2.2vw,16px); line-height:1.25; text-align:center;
  background:linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07));
  border:2px solid rgba(255,255,255,.32); color:var(--game-ink);
  box-shadow:0 4px 0 rgba(0,0,0,.28),0 5px 12px rgba(0,0,0,.2);
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s;
  animation:soChipIn .2s cubic-bezier(.34,1.56,.64,1);
}
@keyframes soChipIn{ from{ transform:scale(.72) translateY(6px); opacity:0; } to{ transform:none; opacity:1; } }
.so-placed-chip:hover{ transform:translateY(-3px) scale(1.04); }
.so-placed-chip:active{ transform:scale(.93); }
[data-curriculum="pb"] .so-placed-chip{ background:#fff; border:2.5px solid #cc88ff; color:#2a1020; box-shadow:0 4px 0 #ddb8ff; }

.so-placed-chip.so-correct{
  background:rgba(34,197,94,.18) !important; border:2.5px solid #22c55e !important;
  color:#22c55e !important;
  box-shadow:0 0 0 3px rgba(34,197,94,.2),0 0 16px rgba(34,197,94,.35) !important;
  cursor:default; pointer-events:none;
}
.so-placed-chip.so-wrong{
  background:rgba(239,68,68,.15) !important; border:2.5px solid #ef4444 !important;
  color:#ef4444 !important;
  box-shadow:0 0 0 3px rgba(239,68,68,.2),0 0 18px rgba(239,68,68,.42) !important;
  cursor:default; pointer-events:none;
  animation:soChipShake .42s ease;
}
.so-placed-chip.so-dance{
  animation:soChipDance .55s cubic-bezier(.34,1.56,.64,1) both !important;
}
@keyframes soChipShake{
  0%,100%{ transform:translateX(0); }
  20%{ transform:translateX(-5px); } 40%{ transform:translateX(5px); }
  60%{ transform:translateX(-3px); } 80%{ transform:translateX(3px); }
}
@keyframes soChipDance{
  0%  { transform:translateY(0) scale(1) rotate(0deg); }
  20% { transform:translateY(-9px) scale(1.12) rotate(-5deg); }
  40% { transform:translateY(-5px) scale(1.07) rotate(4deg); }
  60% { transform:translateY(-8px) scale(1.09) rotate(-3deg); }
  80% { transform:translateY(-3px) scale(1.04) rotate(2deg); }
  100%{ transform:translateY(0) scale(1) rotate(0deg); }
}

/* ── word tiles (bank) — always lowercase ── */
.so-tiles{
  display:flex; flex-wrap:wrap; gap:7px; justify-content:center;
  margin:0 0 .8rem; min-height:50px;
}
.so-tile{
  display:inline-flex; align-items:center; justify-content:center;
  padding:7px 13px; border-radius:13px;
  min-width:46px; max-width:165px; min-height:46px;
  font-family:var(--game-font-body); font-weight:700;
  font-size:clamp(12px,2.3vw,16px); line-height:1.25; text-align:center;
  text-transform:lowercase;
  cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
  position:relative; overflow:hidden; flex-shrink:0;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, opacity .18s;
  background:var(--so-tile-bg,linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07)));
  border:2px solid var(--so-tile-border,rgba(255,255,255,.28));
  color:var(--so-tile-text,var(--game-tile-text));
  box-shadow:0 5px 0 var(--so-tile-shadow,rgba(0,0,0,.35)),0 7px 14px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.2);
  text-shadow:0 1px 2px rgba(0,0,0,.4);
}
.so-tile::after{
  content:''; position:absolute; top:-60%; left:-80%; width:50%; height:200%;
  background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.28) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .45s ease; pointer-events:none;
}
.so-tile:hover::after{ left:150%; }
.so-tile:hover{ transform:translateY(-4px) scale(1.06); }
.so-tile:active{ transform:scale(.92); }
.so-tile.used{ opacity:0; pointer-events:none; transform:scale(.8); }
.so-tile.so-tile-in{
  animation:soTileIn .32s ease backwards;
  animation-delay:calc(var(--ti,0)*0.055s);
}
@keyframes soTileIn{ from{ transform:translateY(10px) scale(.88); opacity:0; } to{ transform:none; opacity:1; } }

/* ── BR tiles ── */
[data-curriculum="br"] .so-tile{ text-shadow:0 1px 3px rgba(0,0,0,.5); --so-tile-text:#fff; }
[data-curriculum="br"] .so-tile[data-ti="0"]{ --so-tile-bg:linear-gradient(145deg,#5a1200,#8a1e00); --so-tile-border:rgba(255,90,40,.55); --so-tile-shadow:rgba(80,10,0,.6); }
[data-curriculum="br"] .so-tile[data-ti="1"]{ --so-tile-bg:linear-gradient(145deg,#4a2800,#703800); --so-tile-border:rgba(255,160,0,.55); --so-tile-shadow:rgba(80,40,0,.6); }
[data-curriculum="br"] .so-tile[data-ti="2"]{ --so-tile-bg:linear-gradient(145deg,#3a3000,#5a4a00); --so-tile-border:rgba(220,200,0,.5); --so-tile-shadow:rgba(50,40,0,.6); }
[data-curriculum="br"] .so-tile[data-ti="3"]{ --so-tile-bg:linear-gradient(145deg,#44200a,#6a3210); --so-tile-border:rgba(255,130,50,.5); --so-tile-shadow:rgba(60,24,8,.6); }
[data-curriculum="br"] .so-tile[data-ti="4"]{ --so-tile-bg:linear-gradient(145deg,#40100a,#601814); --so-tile-border:rgba(255,80,60,.55); --so-tile-shadow:rgba(60,10,8,.6); }
[data-curriculum="br"] .so-tile[data-ti="5"]{ --so-tile-bg:linear-gradient(145deg,#5a1200,#8a1e00); --so-tile-border:rgba(255,90,40,.55); --so-tile-shadow:rgba(80,10,0,.6); }
[data-curriculum="br"] .so-tile[data-ti="6"]{ --so-tile-bg:linear-gradient(145deg,#4a2800,#703800); --so-tile-border:rgba(255,160,0,.55); --so-tile-shadow:rgba(80,40,0,.6); }
[data-curriculum="br"] .so-tile[data-ti="7"]{ --so-tile-bg:linear-gradient(145deg,#3a3000,#5a4a00); --so-tile-border:rgba(220,200,0,.5); --so-tile-shadow:rgba(50,40,0,.6); }
[data-curriculum="br"] .so-tile[data-ti="8"]{ --so-tile-bg:linear-gradient(145deg,#44200a,#6a3210); --so-tile-border:rgba(255,130,50,.5); --so-tile-shadow:rgba(60,24,8,.6); }
[data-curriculum="br"] .so-tile[data-ti="9"]{ --so-tile-bg:linear-gradient(145deg,#40100a,#601814); --so-tile-border:rgba(255,80,60,.55); --so-tile-shadow:rgba(60,10,8,.6); }
[data-curriculum="br"] .so-tile[data-ti="10"]{ --so-tile-bg:linear-gradient(145deg,#5a1200,#8a1e00); --so-tile-border:rgba(255,90,40,.55); --so-tile-shadow:rgba(80,10,0,.6); }
[data-curriculum="br"] .so-tile[data-ti="11"]{ --so-tile-bg:linear-gradient(145deg,#4a2800,#703800); --so-tile-border:rgba(255,160,0,.55); --so-tile-shadow:rgba(80,40,0,.6); }
[data-curriculum="br"] .so-tile[data-ti="12"]{ --so-tile-bg:linear-gradient(145deg,#3a3000,#5a4a00); --so-tile-border:rgba(220,200,0,.5); --so-tile-shadow:rgba(50,40,0,.6); }
/* ── BC tiles ── */
[data-curriculum="bc"] .so-tile{ --so-tile-text:#e0fff8; }
[data-curriculum="bc"] .so-tile[data-ti="0"]{ --so-tile-bg:linear-gradient(145deg,#041e18,#062e24); --so-tile-border:rgba(0,220,180,.55); --so-tile-shadow:rgba(0,20,15,.7); }
[data-curriculum="bc"] .so-tile[data-ti="1"]{ --so-tile-bg:linear-gradient(145deg,#041820,#062430); --so-tile-border:rgba(0,200,240,.5); --so-tile-shadow:rgba(0,15,25,.7); }
[data-curriculum="bc"] .so-tile[data-ti="2"]{ --so-tile-bg:linear-gradient(145deg,#042018,#063028); --so-tile-border:rgba(40,230,160,.5); --so-tile-shadow:rgba(0,20,15,.7); }
[data-curriculum="bc"] .so-tile[data-ti="3"]{ --so-tile-bg:linear-gradient(145deg,#041c14,#062a1e); --so-tile-border:rgba(0,240,140,.5); --so-tile-shadow:rgba(0,20,10,.7); }
[data-curriculum="bc"] .so-tile[data-ti="4"]{ --so-tile-bg:linear-gradient(145deg,#041a20,#062830); --so-tile-border:rgba(0,210,220,.55); --so-tile-shadow:rgba(0,15,20,.7); }
[data-curriculum="bc"] .so-tile[data-ti="5"]{ --so-tile-bg:linear-gradient(145deg,#041e18,#062e24); --so-tile-border:rgba(0,220,180,.55); --so-tile-shadow:rgba(0,20,15,.7); }
[data-curriculum="bc"] .so-tile[data-ti="6"]{ --so-tile-bg:linear-gradient(145deg,#041820,#062430); --so-tile-border:rgba(0,200,240,.5); --so-tile-shadow:rgba(0,15,25,.7); }
[data-curriculum="bc"] .so-tile[data-ti="7"]{ --so-tile-bg:linear-gradient(145deg,#042018,#063028); --so-tile-border:rgba(40,230,160,.5); --so-tile-shadow:rgba(0,20,15,.7); }
[data-curriculum="bc"] .so-tile[data-ti="8"]{ --so-tile-bg:linear-gradient(145deg,#041c14,#062a1e); --so-tile-border:rgba(0,240,140,.5); --so-tile-shadow:rgba(0,20,10,.7); }
[data-curriculum="bc"] .so-tile[data-ti="9"]{ --so-tile-bg:linear-gradient(145deg,#041a20,#062830); --so-tile-border:rgba(0,210,220,.55); --so-tile-shadow:rgba(0,15,20,.7); }
[data-curriculum="bc"] .so-tile[data-ti="10"]{ --so-tile-bg:linear-gradient(145deg,#041e18,#062e24); --so-tile-border:rgba(0,220,180,.55); --so-tile-shadow:rgba(0,20,15,.7); }
[data-curriculum="bc"] .so-tile[data-ti="11"]{ --so-tile-bg:linear-gradient(145deg,#041820,#062430); --so-tile-border:rgba(0,200,240,.5); --so-tile-shadow:rgba(0,15,25,.7); }
[data-curriculum="bc"] .so-tile[data-ti="12"]{ --so-tile-bg:linear-gradient(145deg,#042018,#063028); --so-tile-border:rgba(40,230,160,.5); --so-tile-shadow:rgba(0,20,15,.7); }
/* ── PB tiles ── */
[data-curriculum="pb"] .so-tile{
  background:#fff !important; text-shadow:none !important;
  box-shadow:0 5px 0 var(--so-tile-shadow,#ffb0d8),0 7px 14px rgba(255,110,180,.15) !important;
  --so-tile-text:#2a1020;
}
[data-curriculum="pb"] .so-tile[data-ti="0"]{ --so-tile-border:#ff6eb4; --so-tile-shadow:#ffb0d8; }
[data-curriculum="pb"] .so-tile[data-ti="1"]{ --so-tile-border:#cc88ff; --so-tile-shadow:#ddb8ff; }
[data-curriculum="pb"] .so-tile[data-ti="2"]{ --so-tile-border:#44ccff; --so-tile-shadow:#99e8ff; }
[data-curriculum="pb"] .so-tile[data-ti="3"]{ --so-tile-border:#ffcc44; --so-tile-shadow:#ffe088; }
[data-curriculum="pb"] .so-tile[data-ti="4"]{ --so-tile-border:#44ddaa; --so-tile-shadow:#88eedd; }
[data-curriculum="pb"] .so-tile[data-ti="5"]{ --so-tile-border:#ff6eb4; --so-tile-shadow:#ffb0d8; }
[data-curriculum="pb"] .so-tile[data-ti="6"]{ --so-tile-border:#cc88ff; --so-tile-shadow:#ddb8ff; }
[data-curriculum="pb"] .so-tile[data-ti="7"]{ --so-tile-border:#44ccff; --so-tile-shadow:#99e8ff; }
[data-curriculum="pb"] .so-tile[data-ti="8"]{ --so-tile-border:#ffcc44; --so-tile-shadow:#ffe088; }
[data-curriculum="pb"] .so-tile[data-ti="9"]{ --so-tile-border:#44ddaa; --so-tile-shadow:#88eedd; }
[data-curriculum="pb"] .so-tile[data-ti="10"]{ --so-tile-border:#ff6eb4; --so-tile-shadow:#ffb0d8; }
[data-curriculum="pb"] .so-tile[data-ti="11"]{ --so-tile-border:#cc88ff; --so-tile-shadow:#ddb8ff; }
[data-curriculum="pb"] .so-tile[data-ti="12"]{ --so-tile-border:#44ccff; --so-tile-shadow:#99e8ff; }

/* ══════════════════════════════════════════════════════════════
   BOTTOM BAR
   ══════════════════════════════════════════════════════════════ */
.so-bottom-bar{
  display:flex; justify-content:center; align-items:center;
  gap:9px; margin-top:12px; flex-wrap:wrap;
}

/* Hira toggle */
.so-hira-btn{
  font-family:var(--game-font-jp); font-size:clamp(11px,2vw,14px); font-weight:900;
  padding:10px 14px; border-radius:999px;
  border:2px solid var(--game-border); background:var(--game-surface); color:var(--game-muted);
  cursor:pointer; transition:all .2s; white-space:nowrap;
  display:flex; align-items:center; gap:5px; -webkit-tap-highlight-color:transparent;
}
.so-hira-btn:hover{ border-color:var(--game-primary); color:var(--game-primary); }
body.hira-mode .so-hira-btn{
  border-color:var(--game-primary);
  background:color-mix(in srgb,var(--game-primary) 12%,var(--game-surface));
  color:var(--game-primary);
}
.so-hira-icon{ font-size:1.05em; display:inline-block; transition:transform .3s; }
body.hira-mode .so-hira-icon{ transform:rotate(180deg); }
[data-curriculum="pb"] .so-hira-btn{ background:#fff; border-color:#cc88ff; color:#aa44cc; box-shadow:0 3px 0 #ddb8ff; }

/* CLEAR */
.so-clear-btn{
  font-family:var(--game-font-title); font-size:clamp(12px,2.4vw,15px); letter-spacing:.06em;
  padding:10px 20px; border-radius:999px;
  border:2.5px solid rgba(239,68,68,.5); background:rgba(239,68,68,.12);
  color:#ef4444; font-weight:900; cursor:pointer;
  transition:transform .15s, background .18s; -webkit-tap-highlight-color:transparent; display:none;
}
.so-clear-btn.visible{ display:block; animation:soClearIn .28s cubic-bezier(.34,1.56,.64,1); }
@keyframes soClearIn{ from{ transform:scale(0) rotate(-12deg); opacity:0; } to{ transform:none; opacity:1; } }
.so-clear-btn:hover{ background:rgba(239,68,68,.22); border-color:#ef4444; transform:scale(1.05) rotate(-2deg); }
.so-clear-btn:active{ transform:scale(.93); }

/* ── SPEAKER button — themed circle ── */
.so-speaker-btn{
  width:46px; height:46px; border-radius:50%; padding:0;
  border:2.5px solid #ff6eb4;
  background:linear-gradient(135deg,#ff88cc,#ff44aa);
  color:#fff;
  display:none; align-items:center; justify-content:center;
  cursor:pointer; flex-shrink:0;
  transition:transform .15s, box-shadow .2s, opacity .2s;
  -webkit-tap-highlight-color:transparent;
}
.so-speaker-btn svg{ width:22px; height:22px; display:block; pointer-events:none; }
.so-speaker-btn.visible{
  display:flex;
  animation:soSpeakerGlowPb 1.6s ease-in-out infinite, soSpeakerIn .28s cubic-bezier(.34,1.56,.64,1);
}
.so-speaker-btn:disabled{ opacity:.38; pointer-events:none; animation:none; box-shadow:none; }
.so-speaker-btn:hover:not(:disabled){ transform:scale(1.13); }
.so-speaker-btn:active:not(:disabled){ transform:scale(.91); }
@keyframes soSpeakerIn{ from{ transform:scale(0) rotate(-15deg); opacity:0; } to{ transform:none; opacity:1; } }
@keyframes soSpeakerGlowPb{
  0%,100%{ box-shadow:0 0 10px 2px rgba(255,100,180,.55),0 4px 0 rgba(160,0,80,.5); }
  50%{     box-shadow:0 0 26px 6px rgba(255,100,180,.95),0 4px 0 rgba(160,0,80,.5); }
}
[data-curriculum="bc"] .so-speaker-btn{
  background:linear-gradient(135deg,#00ddb0,#0099cc); border-color:rgba(0,220,180,.7); color:#001a14;
}
[data-curriculum="bc"] .so-speaker-btn.visible{
  animation:soSpeakerGlowBc 1.6s ease-in-out infinite, soSpeakerIn .28s cubic-bezier(.34,1.56,.64,1);
}
@keyframes soSpeakerGlowBc{
  0%,100%{ box-shadow:0 0 10px 2px rgba(0,200,180,.55),0 4px 0 rgba(0,60,50,.6); }
  50%{     box-shadow:0 0 26px 6px rgba(0,220,180,.95),0 4px 0 rgba(0,60,50,.6); }
}
[data-curriculum="br"] .so-speaker-btn{
  background:linear-gradient(135deg,#ffaa00,#ff6600); border-color:rgba(255,160,0,.7); color:#1a0800;
}
[data-curriculum="br"] .so-speaker-btn.visible{
  animation:soSpeakerGlowBr 1.6s ease-in-out infinite, soSpeakerIn .28s cubic-bezier(.34,1.56,.64,1);
}
@keyframes soSpeakerGlowBr{
  0%,100%{ box-shadow:0 0 10px 2px rgba(255,160,0,.55),0 4px 0 rgba(120,50,0,.5); }
  50%{     box-shadow:0 0 26px 6px rgba(255,160,0,.95),0 4px 0 rgba(120,50,0,.5); }
}

/* CHECK */
.so-check-btn{
  font-family:var(--game-font-title); font-size:clamp(14px,3vw,19px); letter-spacing:.08em;
  padding:12px 36px; border:none; border-radius:999px;
  cursor:pointer; position:relative; overflow:hidden;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:0 0 22px color-mix(in srgb,var(--game-primary) 48%,transparent),
    0 4px 0 color-mix(in srgb,var(--game-primary) 40%,#000), 0 7px 16px rgba(0,0,0,.3);
  transition:transform .15s, opacity .2s, box-shadow .15s; -webkit-tap-highlight-color:transparent;
}
.so-check-btn::after{
  content:''; position:absolute; top:-50%; left:-80%; width:48%; height:200%;
  background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.3) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .5s ease; pointer-events:none;
}
.so-check-btn:hover::after{ left:150%; }
.so-check-btn:hover{ transform:translateY(-2px) scale(1.04); }
.so-check-btn:active{ transform:scale(.96); box-shadow:none; }
.so-check-btn:disabled{ opacity:.32; pointer-events:none; box-shadow:none; }

/* HELP */
.so-help-btn{
  width:44px; height:44px; border-radius:50%;
  border:2px solid var(--game-border); background:var(--game-surface);
  color:var(--game-muted); font-size:1.15rem; font-weight:900;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  transition:all .2s; flex-shrink:0; -webkit-tap-highlight-color:transparent;
}
.so-help-btn:hover{ border-color:var(--game-primary); color:var(--game-primary); transform:scale(1.08); }
[data-curriculum="pb"] .so-help-btn{ background:#fff; border-color:#cc88ff; color:#aa44cc; box-shadow:0 3px 0 #ddb8ff; }

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
[data-curriculum="bc"] .game-close{ border-color:rgba(0,200,180,.22); }

/* feedback — empty on correct */
.so-feedback{
  text-align:center; min-height:1.5rem; margin-top:.35rem;
  font-family:var(--game-font-body); font-size:clamp(12px,2.2vw,16px);
  font-weight:900; transition:color .2s;
}
[data-curriculum="pb"] .so-feedback{ color:#2a1020; }

/* ── HOW TO PLAY MODAL ── */
.so-modal-overlay{
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,.72); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  opacity:0; pointer-events:none; transition:opacity .25s; padding:1rem;
}
.so-modal-overlay.open{ opacity:1; pointer-events:all; }
.so-modal{
  max-width:440px; width:100%; border-radius:22px; overflow:hidden;
  background:var(--game-bg); border:2px solid var(--game-primary);
  box-shadow:0 0 40px color-mix(in srgb,var(--game-primary) 28%,transparent),0 20px 40px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
  max-height:90vh; overflow-y:auto;
}
.so-modal-overlay.open .so-modal{ transform:none; }
[data-curriculum="pb"] .so-modal{ background:#fff8fc; border-color:#ff6eb4; }
[data-curriculum="bc"] .so-modal{ background:#030e0c; border-color:rgba(0,220,180,.6); }
.so-modal-header{ padding:.9rem 1.1rem .6rem; border-bottom:1px solid var(--game-border); text-align:center; }
.so-modal-title{ font-family:var(--game-font-title); font-size:clamp(17px,3.5vw,22px); letter-spacing:.06em; color:var(--game-primary); }
[data-curriculum="pb"] .so-modal-title{ color:#ff6eb4; }
.so-modal-title-jp{ font-family:var(--game-font-jp); font-size:clamp(10px,1.7vw,13px); color:var(--game-muted); margin-top:3px; }
.so-modal-body{ padding:.9rem 1.1rem 1.1rem; }
.so-how-step{ display:grid; grid-template-columns:30px 1fr; gap:8px; align-items:start; margin-bottom:.65rem; }
.so-how-step:last-child{ margin-bottom:0; }
.so-how-num{
  width:30px; height:30px; border-radius:50%;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-family:var(--game-font-title); font-size:clamp(11px,2vw,14px);
  font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.so-how-en{ font-family:var(--game-font-body); font-size:clamp(11px,1.9vw,13px); font-weight:800; color:var(--game-ink); line-height:1.35; padding-top:2px; }
[data-curriculum="pb"] .so-how-en{ color:#2a1020; }
.so-how-jp{ font-family:var(--game-font-jp); font-size:clamp(9px,1.5vw,11px); color:var(--game-muted); margin-top:2px; line-height:1.4; }
.so-modal-close{
  display:block; width:100%; margin-top:.9rem;
  font-family:var(--game-font-title); font-size:clamp(13px,2.4vw,16px);
  letter-spacing:.06em; padding:10px; border-radius:999px; border:none; cursor:pointer;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-weight:900; transition:transform .15s;
}
.so-modal-close:hover{ transform:scale(1.03); }

/* ── RESULTS ── */
.so-results{
  display:none; text-align:center; max-width:500px;
  margin:.8rem auto 1.5rem; padding:1.9rem 1.2rem 1.5rem;
  border-radius:26px; position:relative; overflow:hidden;
  border:2.5px solid var(--tier-color,var(--game-primary));
  background:color-mix(in srgb,var(--tier-color,var(--game-primary)) 7%,var(--game-bg));
  box-shadow:0 0 52px color-mix(in srgb,var(--tier-color,var(--game-primary)) 28%,transparent),0 20px 42px rgba(0,0,0,.4);
}
.so-results.show{ display:block; animation:soResultIn .5s cubic-bezier(.22,.8,.36,1) both; }
@keyframes soResultIn{ from{ opacity:0; transform:scale(.82) translateY(24px); } to{ opacity:1; transform:none; } }
.so-results::before{
  content:''; position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto; animation:soRainbow 2.4s linear infinite;
}
.so-results::after{
  content:''; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(circle at 18% 80%,color-mix(in srgb,var(--tier-color,var(--game-primary)) 14%,transparent) 0%,transparent 55%),
    radial-gradient(circle at 82% 18%,color-mix(in srgb,#22ddff 10%,transparent) 0%,transparent 55%),
    radial-gradient(circle at 50% 50%,color-mix(in srgb,#cc88ff 5%,transparent) 0%,transparent 70%);
}
.so-res-inner{ position:relative; z-index:1; }
.so-res-score{
  font-family:var(--game-font-title); font-size:clamp(50px,13vw,88px);
  line-height:1; color:var(--tier-color,var(--game-primary));
  text-shadow:0 0 28px var(--tier-color,var(--game-primary)),0 0 52px var(--tier-color,var(--game-primary));
  margin-bottom:4px; animation:soScorePop .5s cubic-bezier(.22,.8,.36,1) .3s both;
}
@keyframes soScorePop{ from{ transform:scale(.55) rotate(-6deg); opacity:0; } 50%{ transform:scale(1.08) rotate(2deg); } to{ transform:none; opacity:1; } }
.so-res-pct{ font-size:clamp(11px,2.1vw,15px); color:var(--game-muted); font-weight:700; margin-bottom:9px; animation:soFadeUp .4s ease .5s both; }
.so-res-label{
  font-family:var(--game-font-title); font-size:clamp(21px,5vw,36px);
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  animation:soRainbow 2s linear infinite, soFadeUp .4s ease .52s both;
  margin-bottom:9px; letter-spacing:.06em;
}
.so-res-divider{
  width:80px; height:3px; border-radius:99px;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff);
  margin:0 auto 10px; opacity:.85; animation:soFadeUp .4s ease .56s both;
}
.so-res-en{ font-family:var(--game-font-body); font-weight:900; font-size:clamp(12px,2vw,16px); color:var(--game-ink); margin-bottom:4px; animation:soFadeUp .4s ease .6s both; }
.so-res-jp{ font-family:var(--game-font-jp); font-size:clamp(12px,1.9vw,15px); color:var(--game-muted); margin-bottom:3px; animation:soFadeUp .4s ease .64s both; }
.so-res-kanji{ font-family:var(--game-font-jp); font-size:clamp(9px,1.5vw,12px); color:var(--game-muted); opacity:.7; margin-bottom:1rem; animation:soFadeUp .4s ease .68s both; }
.so-res-actions{ display:flex; gap:9px; justify-content:center; flex-wrap:wrap; animation:soFadeUp .4s ease .76s both; }
@keyframes soFadeUp{ from{ transform:translateY(12px); opacity:0; } to{ transform:none; opacity:1; } }

/* sparkles */
@keyframes soSparkle{
  0%{ transform:translate(0,0) scale(1); opacity:1; }
  60%{ transform:translate(var(--sx),var(--sy)) scale(var(--ss,.5)); opacity:.9; }
  100%{ transform:translate(var(--sx2),var(--sy2)) scale(0); opacity:0; }
}
.so-sparkle{
  position:fixed; pointer-events:none; z-index:9999;
  font-size:var(--sz,18px); line-height:1;
  filter:drop-shadow(0 0 4px var(--sc,#ffcc00));
  animation:soSparkle var(--sd,1s) ease-out forwards;
  animation-delay:var(--sdel,0s); user-select:none;
}
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   MOUNT HTML
   ══════════════════════════════════════════════════════════════ */
const SPEAKER_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z" opacity=".6"/></svg>`;

U.mount(`
<div class="so-wrap">
  <div class="so-header">
    <div class="so-curriculum">${curriculumLabel()}</div>
    <div class="so-date">${titleDateLabel()}</div>
  </div>
  <div class="so-dots-row" id="so-dots"></div>
  <div class="so-hud">
    <div class="so-pill">Sentence <b id="so-num">1</b> / 15</div>
    <div class="so-pill">Score <b id="so-score">0</b> / 15</div>
  </div>
  <div class="so-jp-box" id="so-jp-box">
    <div class="so-jp-label">ことばをならべよう</div>
    <div class="so-jp-kanji" id="so-jp"></div>
    <div class="so-jp-hira"  id="so-hira"></div>
  </div>
  <div class="so-answer-zone" id="so-answer">
    <div class="so-answer-empty-hint" id="so-empty-hint">Tap words to build the sentence</div>
  </div>
  <div class="so-tiles" id="so-tiles"></div>
  <div class="so-bottom-bar">
    <button class="so-hira-btn" id="so-hira-toggle">
      <span class="so-hira-icon">あ</span>
      <span id="so-hira-label">ひらがな</span>
    </button>
    <button class="so-clear-btn"   id="so-clear">CLEAR</button>
    <button class="so-speaker-btn" id="so-speaker" aria-label="Listen">${SPEAKER_SVG}</button>
    <button class="so-check-btn"   id="so-check" disabled>CHECK</button>
    <button class="so-help-btn"    id="so-help">?</button>
  </div>
  <div class="so-feedback" id="so-feedback"></div>
  <div class="so-results" id="so-results">
    <div class="so-res-inner">
      <div class="so-res-score" id="so-rs"></div>
      <div class="so-res-pct"   id="so-rp"></div>
      <div class="so-res-label" id="so-rl"></div>
      <div class="so-res-divider"></div>
      <div class="so-res-en"    id="so-re"></div>
      <div class="so-res-jp"    id="so-rj"></div>
      <div class="so-res-kanji" id="so-rk"></div>
      <div class="so-res-actions">
        <button class="game-btn game-btn-primary"   id="so-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="so-back">メニューへ</button>
      </div>
    </div>
  </div>
</div>
<div class="so-modal-overlay" id="so-modal-overlay">
  <div class="so-modal" role="dialog" aria-modal="true">
    <div class="so-modal-header">
      <div class="so-modal-title">HOW TO PLAY</div>
      <div class="so-modal-title-jp">あそびかた</div>
    </div>
    <div class="so-modal-body">
      <div class="so-how-step"><div class="so-how-num">1</div><div>
        <div class="so-how-en">Read the Japanese sentence above.</div>
        <div class="so-how-jp">日本語の文を読もう。</div>
      </div></div>
      <div class="so-how-step"><div class="so-how-num">2</div><div>
        <div class="so-how-en">Tap word tiles to build the English sentence in order.</div>
        <div class="so-how-jp">単語を順番にタップして英語の文を作ろう。</div>
      </div></div>
      <div class="so-how-step"><div class="so-how-num">3</div><div>
        <div class="so-how-en">Tap a placed word to remove it. Press CHECK when ready.</div>
        <div class="so-how-jp">置いた単語をタップすると戻るよ。できたらCHECK！</div>
      </div></div>
      <div class="so-how-step"><div class="so-how-num">4</div><div>
        <div class="so-how-en">After 3 wrong tries the speaker button appears — tap to hear it!</div>
        <div class="so-how-jp">3回まちがえるとスピーカーで文を聞けるよ！</div>
      </div></div>
      <div class="so-how-step"><div class="so-how-num">あ</div><div>
        <div class="so-how-en">Press あ to switch between kanji and hiragana.</div>
        <div class="so-how-jp">「あ」で漢字とひらがなを切りかえられるよ。</div>
      </div></div>
      <button class="so-modal-close" id="so-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>
`);

/* ══════════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════════ */
const numEl      = document.getElementById('so-num');
const scoreEl    = document.getElementById('so-score');
const jpEl       = document.getElementById('so-jp');
const hiraEl     = document.getElementById('so-hira');
const jpBox      = document.getElementById('so-jp-box');
const answerEl   = document.getElementById('so-answer');
const emptyHint  = document.getElementById('so-empty-hint');
const tilesEl    = document.getElementById('so-tiles');
const feedbackEl = document.getElementById('so-feedback');
const checkBtn   = document.getElementById('so-check');
const clearBtn   = document.getElementById('so-clear');
const speakerBtn = document.getElementById('so-speaker');
const helpBtn    = document.getElementById('so-help');
const hiraBtn    = document.getElementById('so-hira-toggle');
const hiraLabel  = document.getElementById('so-hira-label');
const dotsRow    = document.getElementById('so-dots');
const results    = document.getElementById('so-results');
const modalOverlay = document.getElementById('so-modal-overlay');

for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'so-dot'; d.id = `so-d${i}`;
  dotsRow.appendChild(d);
}

/* hira toggle */
let hiraMode = false;
hiraBtn.addEventListener('click', () => {
  hiraMode = !hiraMode;
  document.body.classList.toggle('hira-mode', hiraMode);
  hiraLabel.textContent = hiraMode ? '漢字' : 'ひらがな';
});

/* modal */
helpBtn.addEventListener('click', () => modalOverlay.classList.add('open'));
document.getElementById('so-modal-ok').addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOverlay.classList.remove('open'); });

/* speaker — debounced */
function fireSpeaker() {
  if (speakerBtn.disabled) return;
  speakerBtn.disabled = true;
  setTimeout(() => { speakerBtn.disabled = false; }, 1400);
  playListen(currentCard?.mp3);
}
speakerBtn.addEventListener('touchstart', e => { e.preventDefault(); unlockCtx(); fireSpeaker(); }, { passive: false });
speakerBtn.addEventListener('click', e => {
  if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
  fireSpeaker();
});

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
let idx         = 0;
let score       = 0;
let currentCard = null;
let tokens      = [];
let placed      = [];
let tileEls     = [];
let firstTry    = true;
let locked      = false;
let wrongCount  = 0;
let lastCheckAt = 0;
const CHECK_DEBOUNCE = 700;

function updateDots() {
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`so-d${i}`);
    if (!d) continue;
    d.className = 'so-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
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

  currentCard = allCards[idx];
  numEl.textContent  = idx + 1;
  jpEl.textContent   = currentCard.jp;
  hiraEl.textContent = currentCard.hira || '';
  updateDots();
  tokens = tokenise(currentCard.en);
  buildTiles();
  renderAnswer();
}

/* ══════════════════════════════════════════════════════════════
   BUILD TILES — fully lowercase, zero audio
   ══════════════════════════════════════════════════════════════ */
function buildTiles() {
  tilesEl.innerHTML = ''; tileEls = [];
  const n = tokens.length;
  const shuffled = U.shuffle(tokens.map((t, i) => ({ token: t, origIdx: i })));

  shuffled.forEach(({ token, origIdx }, ti) => {
    const label = displayTile(token);
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'so-tile so-tile-in';
    tile.textContent = label;       /* lowercase, no audio */
    tile.dataset.ti = ti;
    tile.dataset.origIdx = origIdx;
    tile.style.setProperty('--ti', ti);

    tile.addEventListener('touchstart', e => { e.preventDefault(); handleTileTap(tile, origIdx); }, { passive: false });
    tile.addEventListener('click', e => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      handleTileTap(tile, origIdx);
    });

    tilesEl.appendChild(tile);
    tileEls[origIdx] = tile;
  });
}

/* ══════════════════════════════════════════════════════════════
   TILE TAP — zero audio
   ══════════════════════════════════════════════════════════════ */
function handleTileTap(tile, origIdx) {
  if (locked || tile.classList.contains('used')) return;
  tile.classList.add('used');
  placed.push(origIdx);
  renderAnswer();
  checkBtn.disabled = placed.length < tokens.length;
}

/* ══════════════════════════════════════════════════════════════
   RENDER ANSWER — first chip cap, last chip period
   ══════════════════════════════════════════════════════════════ */
function renderAnswer() {
  Array.from(answerEl.children).forEach(el => {
    if (!el.classList.contains('so-answer-empty-hint')) el.remove();
  });

  emptyHint.style.display = placed.length === 0 ? '' : 'none';
  answerEl.classList.toggle('has-words', placed.length > 0);

  const n = tokens.length;
  placed.forEach((origIdx, pi) => {
    const isFirst = pi === 0;
    const isLast  = pi === placed.length - 1 && placed.length === n;
    const label   = displayChip(tokens[origIdx], isFirst, isLast);

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'so-placed-chip';
    chip.textContent = label;
    chip.dataset.pi = pi;

    chip.addEventListener('touchstart', e => { e.preventDefault(); handleChipTap(pi); }, { passive: false });
    chip.addEventListener('click', e => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      handleChipTap(pi);
    });
    answerEl.appendChild(chip);
  });
}

/* ── chip tap — remove word ── */
function handleChipTap(pi) {
  if (locked) return;
  const origIdx = placed[pi];
  placed.splice(pi, 1);
  if (tileEls[origIdx]) tileEls[origIdx].classList.remove('used');
  renderAnswer();
  checkBtn.disabled = placed.length < tokens.length;
}

/* ── clear ── */
clearBtn.addEventListener('click', () => {
  if (locked) return;
  placed.forEach(origIdx => { if (tileEls[origIdx]) tileEls[origIdx].classList.remove('used'); });
  placed = [];
  renderAnswer();
  feedbackEl.textContent = '';
  checkBtn.disabled = true;
});

/* ══════════════════════════════════════════════════════════════
   CHECK
   Correct sequence — nothing overlaps:
   1. chips go green (staggered)
   2. ding plays
   3. ding.onended → sparkles + dance chips
   4. after dance → sentence audio
   5. audio.onended → advance
   ══════════════════════════════════════════════════════════════ */
checkBtn.addEventListener('click', () => {
  if (locked) return;
  const now = Date.now();
  if (now - lastCheckAt < CHECK_DEBOUNCE) return;
  lastCheckAt = now;

  if (placed.length < tokens.length) {
    feedbackEl.textContent = 'Place all the words first!';
    feedbackEl.style.color = '#ffaa00';
    return;
  }

  const n = tokens.length;
  const answerStr = placed.map((oi, pi) => displayChip(tokens[oi], pi===0, pi===n-1)).join(' ');
  const targetStr = tokens.map((t, i) => displayChip(t, i===0, i===n-1)).join(' ');
  const correct   = answerStr.toLowerCase() === targetStr.toLowerCase();

  const chips = Array.from(answerEl.querySelectorAll('.so-placed-chip'));

  if (correct) {
    locked = true;

    /* 1. chips green */
    chips.forEach((chip, i) => {
      setTimeout(() => {
        chip.classList.remove('so-wrong');
        chip.classList.add('so-correct');
      }, i * 55);
    });

    /* no feedback text on correct */
    feedbackEl.textContent = '';

    if (firstTry) { score++; scoreEl.textContent = score; }
    updateDots();

    /* 2. ding after chips */
    setTimeout(() => {
      U.playSFX('ding', () => {
        /* 3. sparkles */
        if (firstTry) fireSparkles(answerEl, false);

        /* 3. dance */
        Array.from(answerEl.querySelectorAll('.so-placed-chip')).forEach((chip, i) => {
          setTimeout(() => {
            chip.classList.add('so-dance');
            chip.addEventListener('animationend', () => chip.classList.remove('so-dance'), { once: true });
          }, i * 50);
        });

        /* 4 & 5. sentence audio → advance */
        const danceMs = chips.length * 50 + 280;
        setTimeout(() => {
          playAudio(currentCard.mp3, () => {
            setTimeout(() => {
              idx++;
              if (idx >= allCards.length) showResults();
              else showCard();
            }, 300);
          });
        }, danceMs);
      });
    }, chips.length * 55 + 20);

  } else {
    locked = true; firstTry = false; wrongCount++;
    clearBtn.classList.add('visible');
    if (wrongCount >= 3) speakerBtn.classList.add('visible');

    chips.forEach((chip, pi) => {
      const placedOi = placed[pi];
      setTimeout(() => {
        chip.classList.remove('so-correct');
        chip.classList.add(placedOi === pi ? 'so-correct' : 'so-wrong');
      }, pi * 55);
    });

    feedbackEl.textContent = 'Try again!';
    feedbackEl.style.color = '#ef4444';
    U.playSFX('fart');

    setTimeout(() => { locked = false; }, chips.length * 55 + 620);
  }
});

/* ══════════════════════════════════════════════════════════════
   SPARKLES
   ══════════════════════════════════════════════════════════════ */
function fireSparkles(originEl, big = false) {
  const chars  = ['+','x','*','#','o'];
  const colors = ['#ffcc00','#fff','#aaff22','#22ddff','#ff88cc','#cc88ff','#ffaa44'];
  const rect   = originEl ? originEl.getBoundingClientRect() : null;
  const cx = rect ? rect.left + rect.width  / 2 : window.innerWidth  / 2;
  const cy = rect ? rect.top  + rect.height / 2 : window.innerHeight * 0.45;

  for (let i = 0, n = big ? 70 : 30; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'so-sparkle';
    const angle = Math.random() * Math.PI * 2;
    const d1 = (big?80:38) + Math.random()*(big?200:110);
    const d2 = (big?160:76) + Math.random()*(big?280:170);
    const sz  = (big?14:10) + Math.random()*(big?20:12);
    const col = colors[Math.floor(Math.random()*colors.length)];
    el.textContent = chars[Math.floor(Math.random()*chars.length)];
    el.style.cssText = `left:${cx}px;top:${cy}px;--sx:${(Math.cos(angle)*d1).toFixed(1)}px;--sy:${(Math.sin(angle)*d1).toFixed(1)}px;--sx2:${(Math.cos(angle)*d2).toFixed(1)}px;--sy2:${(Math.sin(angle)*d2+28).toFixed(1)}px;--ss:${(.2+Math.random()*.5).toFixed(2)};--sz:${sz.toFixed(0)}px;--sc:${col};--sd:${(.55+Math.random()*.6).toFixed(2)}s;--sdel:${(Math.random()*.22).toFixed(2)}s;color:${col};`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* ══════════════════════════════════════════════════════════════
   DROP-IN REPLACEMENT for the END of sentence-order.js

   REPLACE everything from `function showResults() {` all the way
   to the end of the file (including the stray so-replay / so-back
   listeners and the final showCard() call) with this entire block.

   WHAT WAS BROKEN:
   1. BoohaAdventure direct reference → ReferenceError crash → results
      panel never shown, no scores displayed.
   2. showResults() was populating vt-* element IDs (copy-pasted from
      vocab-tap) — those elements don't exist in sentence-order, so
      the scorecard was invisible even if it did open.
   3. Duplicate replay/back listeners existed both inside showResults()
      and again below it as loose event listeners — double-firing on
      every replay. Removed the loose ones; showResults() owns them.
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   RESULTS
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  /* Hide gameplay elements — leave .so-header and .so-dots-row visible */
  document.getElementById('so-jp-box').style.display    = 'none';
  document.getElementById('so-answer').style.display    = 'none';
  document.getElementById('so-tiles').style.display     = 'none';
  document.getElementById('so-feedback').style.display  = 'none';
  document.querySelector('.so-bottom-bar').style.display = 'none';
  document.querySelector('.so-hud').style.display       = 'none';
  /* .so-dots-row intentionally kept visible — shows all-done state */

  /* Mark all dots done */
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`so-d${i}`);
    if (d) d.className = 'so-dot done';
  }

  /* Show results card */
  results.classList.add('show');

  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);

  /* ── Save score to Booha Adventure save system ── */
  document.dispatchEvent(new CustomEvent('booha:gameEnd', {
    detail: {
      saveId:    `${CFG.curriculum}:sentence_order`,
      score:     pct,
      completed: pct >= 40,
    }
  }));

  /* Populate scorecard */
  results.style.setProperty('--tier-color', tier.color);
  document.getElementById('so-rs').textContent = `${score} / 15`;
  document.getElementById('so-rp').textContent = `${pct}%`;
  document.getElementById('so-rl').textContent = tier.label;
  document.getElementById('so-re').textContent = tier.en;
  document.getElementById('so-rj').textContent = tier.jp;
  document.getElementById('so-rk').textContent = tier.kanji;

  /* Wire the hardcoded buttons already in the HTML */
  const replayBtn = document.getElementById('so-replay');
  const backBtn   = document.getElementById('so-back');

  if (replayBtn) replayBtn.addEventListener('click', () => {
    /* Restore gameplay elements */
    document.getElementById('so-jp-box').style.display    = '';
    document.getElementById('so-answer').style.display    = '';
    document.getElementById('so-tiles').style.display     = '';
    document.getElementById('so-feedback').style.display  = '';
    document.querySelector('.so-bottom-bar').style.display = '';
    document.querySelector('.so-hud').style.display       = '';

    results.classList.remove('show');

    /* Reset state */
    idx   = 0;
    score = 0;
    scoreEl.textContent = '0';
    document.body.classList.remove('hira-mode');
    hiraMode = false;
    hiraLabel.textContent = 'ひらがな';
    U.shuffle(allCards);
    showCard();
  });

  if (backBtn) backBtn.addEventListener('click', () => {
    window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
  });

  if (score === 15) {
    setTimeout(() => fireSparkles(null, true),  400);
    setTimeout(() => fireSparkles(null, true),  900);
  }

  /* Results sound */
  if (CFG.sfxBase && tier.sound) {
    const snd = new Audio(CFG.sfxBase + tier.sound);
    snd.setAttribute('playsinline', '');
    snd.setAttribute('webkit-playsinline', '');
    snd.play().catch(() => {});
  }
}

/* ══════════════════════════════════════════════════════════════
   GO
   ══════════════════════════════════════════════════════════════ */
showCard();
})();
