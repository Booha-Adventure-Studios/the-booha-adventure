
/* ══════════════════════════════════════════════════════════════
   sentence-order.js  —  Sentence Order  v3
   Show JP sentence + scrambled EN word tiles. Tap to build it.
   15 sentences, first-try correct = 1 point, 15 max.

   CHANGES v3:
   - No audio on tile taps
   - Wrong x3 → glowing LISTEN button (debounced, no smashing)
   - First word capitalised, last word gets period; tiles lowercase otherwise
   - Correct: ding → confetti → dance chips → audio plays
   - Answer word removed from under check button on correct
   - Results: centered, vivid multi-color, game header stays visible
   - Fully responsive / mobile-safe
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.unlockAudio();

/* ══════════════════════════════════════════════════════════════
   AUDIO — mobile-safe, NO audio on tile taps
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

let audioUnlocked = false;
function unlockAllAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  Object.values(sentCache).forEach(a => {
    try {
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      setTimeout(() => { try { a.pause(); a.currentTime = 0; } catch {} }, 30);
    } catch {}
  });
}
document.addEventListener('touchstart', unlockAllAudio, { once: true, passive: true });
document.addEventListener('mousedown',  unlockAllAudio, { once: true, passive: true });

let activeSent = null;
let listenLocked = false;
let lastListenAt = 0;
const LISTEN_DEBOUNCE_MS = 800;

function stopSent() {
  if (!activeSent) return;
  try { activeSent.pause(); activeSent.currentTime = 0; } catch {}
  activeSent = null;
}

/* Debounced play for LISTEN button — no callback */
function playSentListen(mp3) {
  if (listenLocked) return;
  const now = Date.now();
  if (now - lastListenAt < LISTEN_DEBOUNCE_MS) return;
  lastListenAt = now;
  listenLocked = true;
  setTimeout(() => { listenLocked = false; }, LISTEN_DEBOUNCE_MS + 200);
  if (!mp3) return;
  const a = sentCache[mp3];
  if (!a) return;
  stopSent();
  activeSent = a;
  try { a.currentTime = 0; } catch {}
  const p = a.play();
  if (p && p.catch) p.catch(() => {});
}

/* Play with callback — for post-correct advance */
function playSentOnCorrect(mp3, onEnd) {
  if (!mp3) { if (onEnd) onEnd(); return; }
  const a = sentCache[mp3];
  if (!a) { if (onEnd) onEnd(); return; }
  stopSent();
  activeSent = a;
  try { a.currentTime = 0; } catch {}
  if (onEnd) {
    a.onended = () => { activeSent = null; onEnd(); };
    a.onerror = () => { activeSent = null; onEnd(); };
    setTimeout(() => { if (activeSent === a) { activeSent = null; onEnd(); } }, 8000);
  }
  const p = a.play();
  if (p && p.catch) p.catch(() => { if (onEnd) onEnd(); });
}

/* ══════════════════════════════════════════════════════════════
   WORD HELPERS
   ══════════════════════════════════════════════════════════════ */
function tokenise(sentence) {
  const raw = sentence.trim().replace(/[.!?]+$/, '').split(/\s+/);
  return raw.map((w, i) => ({
    raw: w,
    key: `${w}_${i}`,
    idx: i,
  }));
}

/*
  Display a token:
  - If it is the first word: first letter UPPER, rest lower
  - If it is the last word: append a period, all lower (except the cap above)
  - Otherwise: fully lowercase
  Tiles always show the lowercase version; only placed-first-word gets cap.
*/
function displayWordPlaced(token, isFirst, isLast) {
  let w = token.raw.toLowerCase().replace(/[.,!?]*$/, '');
  if (isFirst) w = w.charAt(0).toUpperCase() + w.slice(1);
  if (isLast)  w = w + '.';
  return w;
}

/* Tile bank always shows fully lowercase (no cap, no period) */
function displayWordTile(token) {
  return token.raw.toLowerCase().replace(/[.,!?]*$/, '');
}

/* ══════════════════════════════════════════════════════════════
   DATA / TIERS
   ══════════════════════════════════════════════════════════════ */
const allCards = U.shuffle(CFG.cards.slice(0, 15));

const TIERS = [
  { min:0,  max:5,  sound:'result_0-5.mp3',
    label:'TRY AGAIN',
    en:"Sentences are tricky — keep at it!",
    jp:'文は難しい！あきらめないで！', kanji:'文章は難しい！諦めないで！',
    color:'#ef4444', glow:'rgba(239,68,68,0.4)' },
  { min:6,  max:10, sound:'result_6-10.mp3',
    label:'KEEP GOING',
    en:"Good effort! The order is clicking!",
    jp:'いい感じ！もっと練習しよう！', kanji:'良い調子！もっと練習しよう！',
    color:'#f97316', glow:'rgba(249,115,22,0.4)' },
  { min:11, max:14, sound:'result_11-14.mp3',
    label:'SO CLOSE!',
    en:"Your word order is really flowing!",
    jp:'ほぼペラペラ！惜しい！', kanji:'ほぼ流暢！惜しい！',
    color:'#22ddff', glow:'rgba(34,221,255,0.4)' },
  { min:15, max:15, sound:'result_15.mp3',
    label:'PERFECT!',
    en:"Every sentence in perfect order!",
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

/* ── base ── */
.so-wrap{
  position:relative; z-index:1;
  max-width:680px; margin:0 auto;
  padding:0 1rem 6rem;
  box-sizing:border-box;
}

/* ── header ── */
.so-header{ text-align:center; padding:.6rem 3rem .8rem; }
.so-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(22px,5vw,48px); font-weight:900;
  letter-spacing:.12em; text-transform:uppercase;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  animation:soRainbow 3s linear infinite;
}
[data-curriculum="bc"] .so-curriculum{
  background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);
  background-size:220% auto;
  -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .so-curriculum{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto;
  -webkit-background-clip:text; background-clip:text;
}
@keyframes soRainbow{ to{ background-position:220% center; } }

.so-date{
  margin-top:4px; font-family:var(--game-font-body);
  font-size:clamp(11px,2vw,15px); font-weight:800;
  color:var(--game-muted); letter-spacing:.06em;
}
[data-curriculum="pb"] .so-date{ color:rgba(58,26,46,.55); }

/* ── 15 progress dots ── */
.so-dots-row{
  display:flex; justify-content:center; gap:5px;
  margin:.5rem 0 .4rem; flex-wrap:wrap;
  padding:0 .5rem;
}
.so-dot{
  width:9px; height:9px; border-radius:50%;
  background:rgba(255,255,255,.12);
  border:1.5px solid rgba(255,255,255,.18);
  transition:all .3s; flex-shrink:0;
}
.so-dot.active{
  background:var(--game-primary); border-color:var(--game-primary);
  box-shadow:0 0 8px var(--game-primary);
}
.so-dot.done{
  background:#22c55e; border-color:#22c55e;
  box-shadow:0 0 8px rgba(34,197,94,.7);
}
[data-curriculum="pb"] .so-dot{
  background:rgba(255,110,180,.15); border-color:rgba(255,110,180,.25);
}

/* ── HUD pills ── */
.so-hud{
  display:flex; justify-content:center; gap:10px; margin-bottom:.6rem;
  flex-wrap:wrap;
}
.so-pill{
  padding:5px 14px; border-radius:999px;
  background:var(--game-pill-bg); border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text);
  font-size:clamp(12px,2vw,15px); font-weight:900; letter-spacing:.03em;
  box-shadow:0 2px 12px rgba(0,0,0,.2);
}
.so-pill b{ color:var(--game-primary); font-size:1.1em; text-shadow:0 0 10px var(--game-primary); }
[data-curriculum="pb"] .so-pill{
  background:#fff; border-color:#ffb0d8; color:#2a1020; box-shadow:0 3px 0 #ffccdd;
}
[data-curriculum="pb"] .so-pill b{ text-shadow:none; }

/* ══════════════════════════════════════════════════════════════
   JP SENTENCE CONTAINER
   ══════════════════════════════════════════════════════════════ */
.so-jp-box{
  border-radius:20px; padding:1rem 1.2rem .9rem;
  margin-bottom:.9rem; text-align:center;
  position:relative; overflow:hidden;
  background:var(--game-surface); border:2px solid var(--game-border);
  backdrop-filter:blur(12px); box-shadow:0 8px 32px rgba(0,0,0,.22);
  transition:border-color .3s, box-shadow .3s;
}
[data-curriculum="br"] .so-jp-box{
  background:linear-gradient(145deg,rgba(255,140,0,.09),rgba(255,80,0,.05),rgba(0,0,0,.18));
  border-color:rgba(255,140,0,.28);
  box-shadow:0 8px 32px rgba(0,0,0,.35), 0 0 0 1px rgba(255,140,0,.1);
}
[data-curriculum="bc"] .so-jp-box{
  background:linear-gradient(145deg,rgba(0,255,180,.07),rgba(0,200,255,.05),rgba(0,0,0,.28));
  border-color:rgba(0,230,180,.25);
  box-shadow:0 8px 32px rgba(0,0,0,.5), 0 0 28px rgba(0,200,180,.09);
}
[data-curriculum="pb"] .so-jp-box{
  background:#ffffff; border:3px solid #ff6eb4;
  box-shadow:0 5px 0 #ffb0d8, 0 10px 24px rgba(255,110,180,.15);
}
.so-jp-box::before{
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto; animation:soRainbow 2.4s linear infinite; pointer-events:none;
}
[data-curriculum="pb"] .so-jp-box::before{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto;
}

.so-jp-label{
  font-family:var(--game-font-title);
  font-size:clamp(8px,1.5vw,11px); letter-spacing:.22em;
  text-transform:uppercase; color:var(--game-primary); opacity:.7; margin-bottom:.45rem;
}
[data-curriculum="br"] .so-jp-label{ color:rgba(255,160,40,1); }
[data-curriculum="bc"] .so-jp-label{ color:rgba(0,220,180,1); }
[data-curriculum="pb"] .so-jp-label{ color:#ff6eb4; }

.so-jp-kanji{
  font-family:var(--game-font-jp);
  font-size:clamp(18px,4vw,32px); font-weight:900;
  color:var(--game-ink); line-height:1.4; letter-spacing:.02em;
  text-wrap:balance;
}
[data-curriculum="pb"] .so-jp-kanji{ color:#2a1020; }
.so-jp-hira{
  font-family:var(--game-font-jp);
  font-size:clamp(14px,2.5vw,20px); font-weight:900;
  color:var(--game-ink); line-height:1.4;
  text-wrap:balance; display:none;
}
[data-curriculum="pb"] .so-jp-hira{ color:#2a1020; }
body.hira-mode .so-jp-kanji{ display:none; }
body.hira-mode .so-jp-hira{ display:block; }

/* ══════════════════════════════════════════════════════════════
   ANSWER ZONE
   ══════════════════════════════════════════════════════════════ */
.so-answer-zone{
  min-height:66px; border-radius:18px; padding:9px 10px;
  display:flex; flex-wrap:wrap; gap:7px; align-content:flex-start;
  background:rgba(255,255,255,.04);
  border:2.5px dashed rgba(255,255,255,.18);
  margin-bottom:.8rem; position:relative;
  transition:border-color .2s, background .2s;
  box-sizing:border-box;
}
[data-curriculum="br"] .so-answer-zone{
  background:rgba(255,140,0,.04); border-color:rgba(255,140,0,.2);
}
[data-curriculum="bc"] .so-answer-zone{
  background:rgba(0,200,180,.04); border-color:rgba(0,200,180,.18);
}
[data-curriculum="pb"] .so-answer-zone{
  background:rgba(255,110,180,.05); border-color:rgba(255,110,180,.28);
}
.so-answer-zone.has-words{ border-style:solid; }
[data-curriculum="br"] .so-answer-zone.has-words{ border-color:rgba(255,140,0,.4); }
[data-curriculum="bc"] .so-answer-zone.has-words{ border-color:rgba(0,200,180,.35); }
[data-curriculum="pb"] .so-answer-zone.has-words{ border-color:#ff6eb4; }

.so-answer-empty-hint{
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  font-family:var(--game-font-body);
  font-size:clamp(10px,1.8vw,12px); letter-spacing:.1em;
  text-transform:uppercase; color:rgba(255,255,255,.2);
  pointer-events:none;
}
[data-curriculum="pb"] .so-answer-empty-hint{ color:rgba(58,26,46,.25); }

/* ── placed word chip ── */
.so-placed-chip{
  display:inline-flex; align-items:center; justify-content:center;
  padding:7px 13px; border-radius:13px; cursor:pointer;
  user-select:none; -webkit-tap-highlight-color:transparent;
  font-family:var(--game-font-body); font-weight:700;
  font-size:clamp(12px,2.2vw,16px); line-height:1.25;
  text-align:center;
  background:linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07));
  border:2px solid rgba(255,255,255,.32);
  color:var(--game-ink);
  box-shadow:0 4px 0 rgba(0,0,0,.28), 0 6px 14px rgba(0,0,0,.2);
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, background .14s;
  animation:soChipIn .22s cubic-bezier(.34,1.56,.64,1);
}
@keyframes soChipIn{
  from{ transform:scale(.7) translateY(6px); opacity:0; }
  to{ transform:none; opacity:1; }
}
.so-placed-chip:hover{ transform:translateY(-3px) scale(1.04); }
.so-placed-chip:active{ transform:scale(.93); }

[data-curriculum="pb"] .so-placed-chip{
  background:#fff; border:2.5px solid #cc88ff; color:#2a1020;
  box-shadow:0 4px 0 #ddb8ff, 0 6px 14px rgba(204,136,255,.2);
}

/* correct/wrong chip states */
.so-placed-chip.so-correct{
  background:rgba(34,197,94,.18) !important;
  border:2.5px solid #22c55e !important;
  color:#22c55e !important;
  box-shadow:0 0 0 3px rgba(34,197,94,.22), 0 0 18px rgba(34,197,94,.38) !important;
  cursor:default; pointer-events:none;
}
.so-placed-chip.so-wrong{
  background:rgba(239,68,68,.15) !important;
  border:2.5px solid #ef4444 !important;
  color:#ef4444 !important;
  box-shadow:0 0 0 3px rgba(239,68,68,.22), 0 0 20px rgba(239,68,68,.45) !important;
  cursor:default; pointer-events:none;
}

/* Dance on correct */
.so-placed-chip.so-dance{
  animation:soChipDance .55s cubic-bezier(.34,1.56,.64,1) both !important;
}
@keyframes soChipDance{
  0%  { transform:translateY(0) scale(1) rotate(0deg); }
  20% { transform:translateY(-10px) scale(1.12) rotate(-5deg); }
  40% { transform:translateY(-5px) scale(1.07) rotate(4deg); }
  60% { transform:translateY(-8px) scale(1.09) rotate(-3deg); }
  80% { transform:translateY(-3px) scale(1.04) rotate(2deg); }
  100%{ transform:translateY(0) scale(1) rotate(0deg); }
}

@keyframes soChipPop{
  from{ transform:scale(.85); } 60%{ transform:scale(1.1); } to{ transform:scale(1); }
}
@keyframes soChipShake{
  0%,100%{ transform:translateX(0); }
  20%{ transform:translateX(-6px); } 40%{ transform:translateX(6px); }
  60%{ transform:translateX(-4px); } 80%{ transform:translateX(4px); }
}

/* ══════════════════════════════════════════════════════════════
   WORD TILES — bank, always lowercase (no period, no cap)
   ══════════════════════════════════════════════════════════════ */
.so-tiles{
  display:flex; flex-wrap:wrap; gap:8px; justify-content:center;
  margin:0 0 .9rem; min-height:52px;
}

.so-tile{
  display:inline-flex; align-items:center; justify-content:center;
  padding:8px 14px; border-radius:14px;
  min-width:48px; max-width:170px;
  min-height:48px;
  font-family:var(--game-font-body); font-weight:700;
  font-size:clamp(12px,2.3vw,16px); line-height:1.25; text-align:center;
  text-transform:lowercase;
  cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
  position:relative; overflow:hidden;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, opacity .18s;

  background:var(--so-tile-bg, linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07)));
  border:2px solid var(--so-tile-border, rgba(255,255,255,.28));
  color:var(--so-tile-text, var(--game-tile-text));
  box-shadow:
    0 5px 0 var(--so-tile-shadow, rgba(0,0,0,.35)),
    0 8px 16px rgba(0,0,0,.28),
    inset 0 1px 0 rgba(255,255,255,.2);
  text-shadow:0 1px 2px rgba(0,0,0,.4);
}
.so-tile::after{
  content:''; position:absolute; top:-60%; left:-80%;
  width:50%; height:200%;
  background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.28) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .45s ease; pointer-events:none;
}
.so-tile:hover::after{ left:150%; }
.so-tile:hover{
  transform:translateY(-4px) scale(1.06);
  box-shadow:
    0 8px 0 var(--so-tile-shadow, rgba(0,0,0,.35)),
    0 14px 24px rgba(0,0,0,.35),
    inset 0 1px 0 rgba(255,255,255,.22);
}
.so-tile:active{ transform:scale(.92); }
.so-tile.used{
  opacity:0; pointer-events:none; transform:scale(.8);
}
.so-tile.so-tile-in{
  animation:soTileIn .34s ease backwards;
  animation-delay:calc(var(--ti,0) * 0.06s);
}
@keyframes soTileIn{
  from{ transform:translateY(12px) scale(.88); opacity:0; }
  to{ transform:none; opacity:1; }
}

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
  background:#ffffff !important;
  box-shadow:0 5px 0 var(--so-tile-shadow,#ffb0d8), 0 8px 16px rgba(255,110,180,.15) !important;
  text-shadow:none !important; --so-tile-text:#2a1020;
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
  gap:9px; margin-top:14px; flex-wrap:wrap;
}

/* Hira toggle */
.so-hira-btn{
  font-family:var(--game-font-jp);
  font-size:clamp(11px,2vw,14px); font-weight:900;
  padding:10px 15px; border-radius:999px;
  border:2px solid var(--game-border);
  background:var(--game-surface); color:var(--game-muted);
  cursor:pointer; transition:all .2s; letter-spacing:.03em;
  white-space:nowrap; display:flex; align-items:center; gap:6px;
  -webkit-tap-highlight-color:transparent;
}
.so-hira-btn:hover{ border-color:var(--game-primary); color:var(--game-primary); }
body.hira-mode .so-hira-btn{
  border-color:var(--game-primary);
  background:color-mix(in srgb,var(--game-primary) 12%,var(--game-surface));
  color:var(--game-primary);
  box-shadow:0 0 14px color-mix(in srgb,var(--game-primary) 35%,transparent);
}
.so-hira-icon{ font-size:1.1em; display:inline-block; transition:transform .3s; }
body.hira-mode .so-hira-icon{ transform:rotate(180deg); }
[data-curriculum="pb"] .so-hira-btn{
  background:#fff; border-color:#cc88ff; color:#aa44cc; box-shadow:0 3px 0 #ddb8ff;
}

/* CHECK button */
.so-check-btn{
  font-family:var(--game-font-title);
  font-size:clamp(15px,3vw,20px); letter-spacing:.08em;
  padding:13px 38px; border:none; border-radius:999px;
  cursor:pointer; position:relative; overflow:hidden;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:
    0 0 26px color-mix(in srgb,var(--game-primary) 50%,transparent),
    0 4px 0 color-mix(in srgb,var(--game-primary) 40%,#000),
    0 8px 20px rgba(0,0,0,.3);
  transition:transform .15s, opacity .2s, box-shadow .15s;
  -webkit-tap-highlight-color:transparent;
}
.so-check-btn::after{
  content:''; position:absolute; top:-50%; left:-80%;
  width:48%; height:200%;
  background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.3) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .5s ease; pointer-events:none;
}
.so-check-btn:hover::after{ left:150%; }
.so-check-btn:hover{
  transform:translateY(-3px) scale(1.04);
  box-shadow:
    0 0 36px color-mix(in srgb,var(--game-primary) 65%,transparent),
    0 6px 0 color-mix(in srgb,var(--game-primary) 40%,#000),
    0 12px 28px rgba(0,0,0,.35);
}
.so-check-btn:active{ transform:scale(.96); box-shadow:none; }
.so-check-btn:disabled{ opacity:.32; pointer-events:none; box-shadow:none; }

/* CLEAR button */
.so-clear-btn{
  font-family:var(--game-font-title);
  font-size:clamp(13px,2.5vw,16px); letter-spacing:.06em;
  padding:11px 22px; border-radius:999px;
  border:2.5px solid rgba(239,68,68,.5);
  background:rgba(239,68,68,.12); color:#ef4444; font-weight:900;
  cursor:pointer;
  transition:transform .15s, background .18s, box-shadow .15s, border-color .15s;
  -webkit-tap-highlight-color:transparent;
  display:none;
}
.so-clear-btn.visible{
  display:block; animation:soClearIn .3s cubic-bezier(.34,1.56,.64,1);
}
@keyframes soClearIn{
  from{ transform:scale(0) rotate(-12deg); opacity:0; }
  to{ transform:none; opacity:1; }
}
.so-clear-btn:hover{
  background:rgba(239,68,68,.22); border-color:#ef4444;
  transform:scale(1.05) rotate(-2deg); box-shadow:0 0 18px rgba(239,68,68,.35);
}
.so-clear-btn:active{ transform:scale(.93); }

/* LISTEN button — glowing, debounced */
.so-listen-btn{
  font-family:var(--game-font-title);
  font-size:clamp(12px,2.2vw,15px); letter-spacing:.06em;
  padding:11px 20px; border-radius:999px; border:none;
  background:linear-gradient(135deg,#ffaa00,#ff6600);
  color:#1a0800; font-weight:900;
  cursor:pointer;
  transition:transform .15s, box-shadow .2s, opacity .2s;
  -webkit-tap-highlight-color:transparent;
  display:none;
  white-space:nowrap;
  animation:soListenGlow 1.6s ease-in-out infinite;
  box-shadow:0 0 8px 2px rgba(255,160,0,.5), 0 4px 0 rgba(120,50,0,.5);
}
.so-listen-btn.visible{ display:block; }
.so-listen-btn:disabled{
  opacity:.45; pointer-events:none; animation:none;
}
@keyframes soListenGlow{
  0%,100%{ box-shadow:0 0 8px 2px rgba(255,160,0,.5), 0 4px 0 rgba(120,50,0,.5); }
  50%{     box-shadow:0 0 26px 6px rgba(255,160,0,.9), 0 4px 0 rgba(120,50,0,.5); }
}
.so-listen-btn:hover:not(:disabled){ transform:scale(1.06); }
.so-listen-btn:active:not(:disabled){ transform:scale(.93); }
[data-curriculum="pb"] .so-listen-btn{
  background:linear-gradient(135deg,#ff88cc,#ff44aa); color:#fff;
  animation:soListenGlowPb 1.6s ease-in-out infinite;
}
@keyframes soListenGlowPb{
  0%,100%{ box-shadow:0 0 8px 2px rgba(255,100,180,.5),0 5px 0 #cc0077; }
  50%{     box-shadow:0 0 26px 6px rgba(255,100,180,.9),0 5px 0 #cc0077; }
}
[data-curriculum="bc"] .so-listen-btn{
  background:linear-gradient(135deg,#00ddb0,#0099cc); color:#001a14;
  animation:soListenGlowBc 1.6s ease-in-out infinite;
}
@keyframes soListenGlowBc{
  0%,100%{ box-shadow:0 0 8px 2px rgba(0,200,180,.5),0 4px 0 rgba(0,60,50,.6); }
  50%{     box-shadow:0 0 26px 6px rgba(0,220,180,.9),0 4px 0 rgba(0,60,50,.6); }
}

.so-help-btn{
  width:44px; height:44px; border-radius:50%;
  border:2px solid var(--game-border); background:var(--game-surface);
  color:var(--game-muted); font-size:1.2rem; font-weight:900;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  transition:all .2s; flex-shrink:0; -webkit-tap-highlight-color:transparent;
}
.so-help-btn:hover{
  border-color:var(--game-primary); color:var(--game-primary);
  box-shadow:0 0 14px color-mix(in srgb,var(--game-primary) 40%,transparent);
  transform:scale(1.08);
}
[data-curriculum="pb"] .so-help-btn{
  background:#fff; border-color:#cc88ff; color:#aa44cc; box-shadow:0 3px 0 #ddb8ff;
}

/* CLOSE / X */
.game-close{
  position:fixed; top:1rem; right:1rem; z-index:50;
  width:48px; height:48px; border-radius:50%;
  background:rgba(255,255,255,.1); border:2px solid rgba(255,255,255,.22);
  color:#fff; font-size:1.2rem;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; backdrop-filter:blur(10px);
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
  text-decoration:none; font-weight:900;
  box-shadow:0 4px 16px rgba(0,0,0,.25); -webkit-tap-highlight-color:transparent;
}
.game-close:hover{
  background:rgba(239,68,68,.55); border-color:rgba(239,68,68,.7);
  transform:scale(1.18) rotate(12deg);
}
.game-close:active{ transform:scale(.9) rotate(0deg); }
[data-curriculum="pb"] .game-close{
  background:#fff; border:3px solid #ff6eb4; color:#ff6eb4; box-shadow:0 4px 0 #ffb0d8;
}
[data-curriculum="bc"] .game-close{ border-color:rgba(0,200,180,.22); }

/* ── feedback text ── */
.so-feedback{
  text-align:center; min-height:1.8rem; margin-top:.5rem;
  font-family:var(--game-font-body);
  font-size:clamp(13px,2.4vw,17px); font-weight:900; transition:color .2s;
}
[data-curriculum="pb"] .so-feedback{ color:#2a1020; }

/* ══════════════════════════════════════════════════════════════
   HOW TO PLAY MODAL
   ══════════════════════════════════════════════════════════════ */
.so-modal-overlay{
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,.72); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  opacity:0; pointer-events:none; transition:opacity .25s;
  padding:1rem;
}
.so-modal-overlay.open{ opacity:1; pointer-events:all; }
.so-modal{
  max-width:460px; width:100%;
  border-radius:24px; overflow:hidden;
  background:var(--game-bg); border:2px solid var(--game-primary);
  box-shadow:0 0 48px color-mix(in srgb,var(--game-primary) 30%,transparent), 0 24px 48px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
  max-height:90vh; overflow-y:auto;
}
.so-modal-overlay.open .so-modal{ transform:none; }
[data-curriculum="pb"] .so-modal{ background:#fff8fc; border-color:#ff6eb4; }
[data-curriculum="bc"] .so-modal{ background:#030e0c; border-color:rgba(0,220,180,.6); }

.so-modal-header{
  padding:1rem 1.2rem .7rem;
  border-bottom:1px solid var(--game-border); text-align:center;
}
.so-modal-title{
  font-family:var(--game-font-title);
  font-size:clamp(18px,3.5vw,24px); letter-spacing:.06em;
  color:var(--game-primary);
}
[data-curriculum="pb"] .so-modal-title{ color:#ff6eb4; }
.so-modal-title-jp{
  font-family:var(--game-font-jp);
  font-size:clamp(11px,1.8vw,14px); color:var(--game-muted); margin-top:3px;
}
.so-modal-body{ padding:1rem 1.2rem 1.2rem; }
.so-how-step{
  display:grid; grid-template-columns:32px 1fr;
  gap:8px; align-items:start; margin-bottom:.75rem;
}
.so-how-step:last-child{ margin-bottom:0; }
.so-how-num{
  width:32px; height:32px; border-radius:50%;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-family:var(--game-font-title);
  font-size:clamp(13px,2.2vw,16px); font-weight:900;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.so-how-en{
  font-family:var(--game-font-body); font-size:clamp(12px,2vw,14px);
  font-weight:800; color:var(--game-ink); line-height:1.35; padding-top:2px;
}
[data-curriculum="pb"] .so-how-en{ color:#2a1020; }
.so-how-jp{
  font-family:var(--game-font-jp); font-size:clamp(10px,1.6vw,12px);
  color:var(--game-muted); margin-top:2px; line-height:1.4;
}
.so-modal-close{
  display:block; width:100%; margin-top:1rem;
  font-family:var(--game-font-title);
  font-size:clamp(14px,2.5vw,17px); letter-spacing:.06em;
  padding:11px; border-radius:999px; border:none; cursor:pointer;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-weight:900; transition:transform .15s;
}
.so-modal-close:hover{ transform:scale(1.03); }

/* ══════════════════════════════════════════════════════════════
   RESULTS PANEL — centered, vivid multi-color, header stays
   ══════════════════════════════════════════════════════════════ */
.so-results{
  display:none; text-align:center;
  max-width:520px;
  margin:1rem auto 2rem;
  padding:2.2rem 1.4rem 1.8rem;
  border-radius:28px; position:relative; overflow:hidden;
  border:2.5px solid var(--tier-color,var(--game-primary));
  background:color-mix(in srgb,var(--tier-color,var(--game-primary)) 7%,var(--game-bg));
  box-shadow:
    0 0 60px color-mix(in srgb,var(--tier-color,var(--game-primary)) 28%,transparent),
    0 24px 48px rgba(0,0,0,.4);
}
.so-results.show{
  display:block; animation:soResultIn .55s cubic-bezier(.22,.8,.36,1) both;
}
@keyframes soResultIn{
  from{ opacity:0; transform:scale(.82) translateY(28px); }
  to{ opacity:1; transform:none; }
}
/* rainbow top bar */
.so-results::before{
  content:''; position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto; animation:soRainbow 2.4s linear infinite;
}
/* ambient glow */
.so-results::after{
  content:''; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(circle at 20% 80%,color-mix(in srgb,var(--tier-color,var(--game-primary)) 14%,transparent) 0%,transparent 55%),
    radial-gradient(circle at 80% 20%,color-mix(in srgb,#22ddff 10%,transparent) 0%,transparent 55%),
    radial-gradient(circle at 50% 50%,color-mix(in srgb,#cc88ff 6%,transparent) 0%,transparent 70%);
}
.so-res-inner{ position:relative; z-index:1; }

.so-res-score{
  font-family:var(--game-font-title); font-size:clamp(56px,14vw,90px);
  line-height:1; color:var(--tier-color,var(--game-primary));
  text-shadow:0 0 32px var(--tier-color,var(--game-primary)), 0 0 60px var(--tier-color,var(--game-primary));
  margin-bottom:4px;
  animation:soScorePop .55s cubic-bezier(.22,.8,.36,1) .3s both;
}
@keyframes soScorePop{
  from{ transform:scale(.55) rotate(-6deg); opacity:0; }
  50%{ transform:scale(1.08) rotate(2deg); }
  to{ transform:none; opacity:1; }
}
.so-res-pct{
  font-size:clamp(13px,2.4vw,17px); color:var(--game-muted);
  font-weight:700; margin-bottom:10px;
  animation:soFadeUp .4s ease .5s both;
}
.so-res-label{
  font-family:var(--game-font-title); font-size:clamp(24px,5vw,38px);
  /* vivid rainbow label */
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:200% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  animation:soRainbow 2s linear infinite, soFadeUp .4s ease .52s both;
  margin-bottom:10px; letter-spacing:.06em;
}
.so-res-divider{
  width:80px; height:3px; border-radius:99px;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff);
  margin:0 auto 12px; opacity:.8;
  animation:soFadeUp .4s ease .56s both;
}
.so-res-en{
  font-family:var(--game-font-body); font-weight:900;
  font-size:clamp(13px,2.2vw,17px); color:var(--game-ink);
  margin-bottom:4px; animation:soFadeUp .4s ease .6s both;
}
.so-res-jp{
  font-family:var(--game-font-jp); font-size:clamp(13px,2vw,16px);
  color:var(--game-muted); margin-bottom:3px; animation:soFadeUp .4s ease .64s both;
}
.so-res-kanji{
  font-family:var(--game-font-jp); font-size:clamp(10px,1.6vw,13px);
  color:var(--game-muted); opacity:.7; margin-bottom:1.2rem;
  animation:soFadeUp .4s ease .68s both;
}
.so-res-actions{
  display:flex; gap:10px; justify-content:center; flex-wrap:wrap;
  animation:soFadeUp .4s ease .76s both;
}
@keyframes soFadeUp{
  from{ transform:translateY(14px); opacity:0; }
  to{ transform:none; opacity:1; }
}

/* sparkles */
@keyframes soSparkle{
  0%{   transform:translate(0,0) scale(1);   opacity:1; }
  60%{  transform:translate(var(--sx),var(--sy)) scale(var(--ss,.5)); opacity:.9; }
  100%{ transform:translate(var(--sx2),var(--sy2)) scale(0); opacity:0; }
}
.so-sparkle{
  position:fixed; pointer-events:none; z-index:9999;
  font-size:var(--sz,18px); line-height:1;
  filter:drop-shadow(0 0 4px var(--sc,#ffcc00));
  animation:soSparkle var(--sd,1s) ease-out forwards;
  animation-delay:var(--sdel,0s);
  user-select:none;
}
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   MOUNT HTML
   ══════════════════════════════════════════════════════════════ */
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
    <button class="so-listen-btn"  id="so-listen">LISTEN</button>
    <button class="so-check-btn"   id="so-check" disabled>CHECK</button>
    <button class="so-help-btn"    id="so-help">?</button>
  </div>

  <div class="so-feedback" id="so-feedback"></div>

  <div class="so-results" id="so-results">
    <div class="so-res-inner">
      <div class="so-res-score"  id="so-rs"></div>
      <div class="so-res-pct"    id="so-rp"></div>
      <div class="so-res-label"  id="so-rl"></div>
      <div class="so-res-divider"></div>
      <div class="so-res-en"     id="so-re"></div>
      <div class="so-res-jp"     id="so-rj"></div>
      <div class="so-res-kanji"  id="so-rk"></div>
      <div class="so-res-actions">
        <button class="game-btn game-btn-primary"   id="so-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="so-back">メニューへ</button>
      </div>
    </div>
  </div>

</div>

<!-- HOW TO PLAY MODAL -->
<div class="so-modal-overlay" id="so-modal-overlay">
  <div class="so-modal" role="dialog" aria-modal="true">
    <div class="so-modal-header">
      <div class="so-modal-title">HOW TO PLAY</div>
      <div class="so-modal-title-jp">あそびかた</div>
    </div>
    <div class="so-modal-body">
      <div class="so-how-step">
        <div class="so-how-num">1</div>
        <div>
          <div class="so-how-en">Read the Japanese sentence above.</div>
          <div class="so-how-jp">日本語の文を読もう。</div>
        </div>
      </div>
      <div class="so-how-step">
        <div class="so-how-num">2</div>
        <div>
          <div class="so-how-en">Tap word tiles to build the English sentence in order.</div>
          <div class="so-how-jp">単語を順番にタップして英語の文を作ろう。</div>
        </div>
      </div>
      <div class="so-how-step">
        <div class="so-how-num">3</div>
        <div>
          <div class="so-how-en">Tap a placed word to remove it. Press CHECK when ready.</div>
          <div class="so-how-jp">置いた単語をタップすると戻るよ。できたらCHECK！</div>
        </div>
      </div>
      <div class="so-how-step">
        <div class="so-how-num">4</div>
        <div>
          <div class="so-how-en">After 3 wrong tries, a LISTEN button appears. Tap it to hear the sentence!</div>
          <div class="so-how-jp">3回まちがえるとLISTENボタンで文を聞けるよ！</div>
        </div>
      </div>
      <div class="so-how-step">
        <div class="so-how-num">あ</div>
        <div>
          <div class="so-how-en">Press あ to switch between kanji and hiragana.</div>
          <div class="so-how-jp">「あ」で漢字とひらがなを切りかえられるよ。</div>
        </div>
      </div>
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
const listenBtn  = document.getElementById('so-listen');
const helpBtn    = document.getElementById('so-help');
const hiraBtn    = document.getElementById('so-hira-toggle');
const hiraLabel  = document.getElementById('so-hira-label');
const dotsRow    = document.getElementById('so-dots');
const results    = document.getElementById('so-results');
const wrap       = document.querySelector('.so-wrap');
const modalOverlay = document.getElementById('so-modal-overlay');

/* ── 15 progress dots ── */
for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'so-dot'; d.id = `so-d${i}`;
  dotsRow.appendChild(d);
}

/* ══════════════════════════════════════════════════════════════
   HIRA TOGGLE
   ══════════════════════════════════════════════════════════════ */
let hiraMode = false;
hiraBtn.addEventListener('click', () => {
  hiraMode = !hiraMode;
  document.body.classList.toggle('hira-mode', hiraMode);
  hiraLabel.textContent = hiraMode ? '漢字' : 'ひらがな';
});

/* ══════════════════════════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════════════════════════ */
helpBtn.addEventListener('click', () => modalOverlay.classList.add('open'));
document.getElementById('so-modal-ok').addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOverlay.classList.remove('open'); });

/* ══════════════════════════════════════════════════════════════
   LISTEN BUTTON — debounced, no smashing
   ══════════════════════════════════════════════════════════════ */
listenBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  unlockAllAudio();
  fireListenBtn();
}, { passive: false });
listenBtn.addEventListener('click', e => {
  if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
  fireListenBtn();
});

function fireListenBtn() {
  if (!currentCard || listenLocked) return;
  playSentListen(currentCard.mp3);
  listenBtn.disabled = true;
  setTimeout(() => { listenBtn.disabled = false; }, 1000);
}

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
let idx        = 0;
let score      = 0;
let currentCard = null;
let tokens     = [];
let placed     = [];
let tileEls    = [];
let firstTry   = true;
let locked     = false;
let wrongCount = 0;

let lastCheckAt = 0;
const CHECK_DEBOUNCE_MS = 800;

/* ══════════════════════════════════════════════════════════════
   DOTS
   ══════════════════════════════════════════════════════════════ */
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
  locked = false;
  firstTry = true;
  wrongCount = 0;
  placed = [];
  feedbackEl.textContent = '';
  feedbackEl.style.color = '';
  clearBtn.classList.remove('visible');
  listenBtn.classList.remove('visible');
  listenBtn.disabled = false;
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
   BUILD WORD TILES — always lowercase in the bank
   ══════════════════════════════════════════════════════════════ */
function buildTiles() {
  tilesEl.innerHTML = '';
  tileEls = [];

  const n = tokens.length;
  const shuffled = U.shuffle(tokens.map((t, i) => ({ token: t, origIdx: i })));

  shuffled.forEach(({ token, origIdx }, ti) => {
    const label = displayWordTile(token); /* fully lowercase, no period */

    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'so-tile so-tile-in';
    tile.textContent = label;
    tile.dataset.ti  = ti;
    tile.dataset.origIdx = origIdx;
    tile.style.setProperty('--ti', ti);

    /* NO audio on tile tap */
    tile.addEventListener('touchstart', e => {
      e.preventDefault();
      unlockAllAudio();
      handleTileTap(tile, origIdx);
    }, { passive: false });
    tile.addEventListener('click', e => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      handleTileTap(tile, origIdx);
    });

    tilesEl.appendChild(tile);
    tileEls[origIdx] = tile;
  });
}

/* ══════════════════════════════════════════════════════════════
   TILE TAP — add word to answer, NO audio
   ══════════════════════════════════════════════════════════════ */
function handleTileTap(tile, origIdx) {
  if (locked) return;
  if (tile.classList.contains('used')) return;
  tile.classList.add('used');
  placed.push(origIdx);
  renderAnswer();
  checkBtn.disabled = placed.length < tokens.length;
}

/* ══════════════════════════════════════════════════════════════
   RENDER ANSWER ZONE
   First word: capital first letter. Last word: period at end.
   ══════════════════════════════════════════════════════════════ */
function renderAnswer() {
  Array.from(answerEl.children).forEach(el => {
    if (!el.classList.contains('so-answer-empty-hint')) el.remove();
  });

  emptyHint.style.display = placed.length === 0 ? '' : 'none';
  answerEl.classList.toggle('has-words', placed.length > 0);

  const n = tokens.length;
  placed.forEach((origIdx, pi) => {
    const isFirst = pi === 0;          /* first PLACED position gets cap */
    const isLast  = pi === placed.length - 1 && placed.length === n; /* last position AND all filled → period */
    const label   = displayWordPlaced(tokens[origIdx], isFirst, isLast);

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'so-placed-chip';
    chip.textContent = label;
    chip.dataset.pi = pi;

    chip.addEventListener('touchstart', e => {
      e.preventDefault();
      handleChipTap(pi);
    }, { passive: false });
    chip.addEventListener('click', e => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      handleChipTap(pi);
    });

    answerEl.appendChild(chip);
  });
}

/* ══════════════════════════════════════════════════════════════
   CHIP TAP — remove word from answer
   ══════════════════════════════════════════════════════════════ */
function handleChipTap(pi) {
  if (locked) return;
  const origIdx = placed[pi];
  placed.splice(pi, 1);
  if (tileEls[origIdx]) tileEls[origIdx].classList.remove('used');
  renderAnswer();
  checkBtn.disabled = placed.length < tokens.length;
}

/* ══════════════════════════════════════════════════════════════
   CLEAR
   ══════════════════════════════════════════════════════════════ */
clearBtn.addEventListener('click', () => {
  if (locked) return;
  placed.forEach(origIdx => {
    if (tileEls[origIdx]) tileEls[origIdx].classList.remove('used');
  });
  placed = [];
  renderAnswer();
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

  if (placed.length < tokens.length) {
    feedbackEl.textContent = 'Place all the words first!';
    feedbackEl.style.color = '#ffaa00';
    return;
  }

  const n = tokens.length;

  /* Build answer & target strings using the placed display logic */
  const answerWords = placed.map((origIdx, pi) => {
    const isFirst = pi === 0;
    const isLast  = pi === n - 1;
    return displayWordPlaced(tokens[origIdx], isFirst, isLast);
  });
  const answerStr = answerWords.join(' ');

  const targetWords = tokens.map((t, i) => displayWordPlaced(t, i === 0, i === n - 1));
  const targetStr   = targetWords.join(' ');

  const correct = answerStr.toLowerCase() === targetStr.toLowerCase();

  const chips = Array.from(answerEl.querySelectorAll('.so-placed-chip'));

  if (correct) {
    locked = true;

    /* 1. Show all chips green */
    chips.forEach((chip, i) => {
      setTimeout(() => {
        chip.classList.remove('so-wrong');
        chip.classList.add('so-correct');
      }, i * 55);
    });

    const chipDelay = chips.length * 55;

    /* 2. Feedback */
    feedbackEl.textContent = targetStr;
    feedbackEl.style.color = '#22c55e';

    /* 3. Score */
    if (firstTry) {
      score++;
      scoreEl.textContent = score;
    }
    updateDots();

    /* 4. Ding */
    setTimeout(() => {
      U.playSFX('ding');
    }, chipDelay);

    /* 5. Sparkles / confetti */
    setTimeout(() => {
      if (firstTry) fireSparkles(answerEl, false);
    }, chipDelay + 120);

    /* 6. Dance on chips */
    setTimeout(() => {
      const currentChips = Array.from(answerEl.querySelectorAll('.so-placed-chip'));
      currentChips.forEach((chip, i) => {
        setTimeout(() => {
          chip.classList.add('so-dance');
          chip.addEventListener('animationend', () => chip.classList.remove('so-dance'), { once: true });
        }, i * 55);
      });
    }, chipDelay + 200);

    /* 7. Play sentence audio — after ding + dance have had a moment */
    setTimeout(() => {
      playSentOnCorrect(currentCard.mp3, () => {
        setTimeout(() => {
          idx++;
          if (idx >= allCards.length) showResults();
          else showCard();
        }, 350);
      });
    }, chipDelay + 550);

  } else {
    /* wrong */
    locked = true;
    firstTry = false;
    wrongCount++;
    clearBtn.classList.add('visible');
    if (wrongCount >= 3) listenBtn.classList.add('visible');

    chips.forEach((chip, pi) => {
      const placedOrigIdx = placed[pi];
      const expectedOrigIdx = pi;
      setTimeout(() => {
        chip.classList.remove('so-correct');
        if (placedOrigIdx === expectedOrigIdx) {
          chip.classList.add('so-correct');
        } else {
          chip.classList.add('so-wrong');
        }
      }, pi * 55);
    });

    feedbackEl.textContent = 'Try again!';
    feedbackEl.style.color = '#ef4444';
    U.playSFX('fart');

    const totalDelay = chips.length * 55 + 700;
    setTimeout(() => { locked = false; }, totalDelay);
  }
});

/* ══════════════════════════════════════════════════════════════
   SPARKLES
   ══════════════════════════════════════════════════════════════ */
function fireSparkles(originEl, big = false) {
  const chars  = ['+','x','*','#','o'];
  const colors = ['#ffcc00','#ffffff','#aaff22','#22ddff','#ff88cc','#cc88ff','#ffaa44'];
  const rect   = originEl ? originEl.getBoundingClientRect() : null;
  const cx = rect ? rect.left + rect.width  / 2 : window.innerWidth  / 2;
  const cy = rect ? rect.top  + rect.height / 2 : window.innerHeight * 0.45;
  const count  = big ? 70 : 32;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'so-sparkle';
    const angle = Math.random() * Math.PI * 2;
    const dist1 = (big ? 80 : 40)  + Math.random() * (big ? 200 : 120);
    const dist2 = (big ? 160 : 80) + Math.random() * (big ? 280 : 180);
    const sz    = (big ? 14 : 10) + Math.random() * (big ? 20 : 14);
    const col   = colors[Math.floor(Math.random() * colors.length)];
    const dur   = (.55 + Math.random() * .6).toFixed(2);
    const del   = (Math.random() * .25).toFixed(2);
    const scale = (.2 + Math.random() * .5).toFixed(2);
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
    el.style.cssText = `
      left:${cx}px; top:${cy}px;
      --sx:${(Math.cos(angle)*dist1).toFixed(1)}px;
      --sy:${(Math.sin(angle)*dist1).toFixed(1)}px;
      --sx2:${(Math.cos(angle)*dist2).toFixed(1)}px;
      --sy2:${(Math.sin(angle)*dist2 + 30).toFixed(1)}px;
      --ss:${scale};
      --sz:${sz.toFixed(0)}px;
      --sc:${col};
      --sd:${dur}s;
      --sdel:${del}s;
      color:${col};
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

  /* hide gameplay UI — header STAYS visible */
  [
    jpBox, answerEl, tilesEl,
    document.querySelector('.so-bottom-bar'),
    feedbackEl,
    document.querySelector('.so-hud'),
    dotsRow,
  ].forEach(el => { if (el) el.style.display = 'none'; });

  results.classList.add('show');
  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);
  results.style.setProperty('--tier-color', tier.color);

  document.getElementById('so-rs').textContent = `${score} / 15`;
  document.getElementById('so-rp').textContent = `${pct}%`;
  document.getElementById('so-rl').textContent = tier.label;
  document.getElementById('so-re').textContent = tier.en;
  document.getElementById('so-rj').textContent = tier.jp;
  document.getElementById('so-rk').textContent = tier.kanji;

  if (score >= 15) {
    setTimeout(() => fireSparkles(results, true), 400);
    setTimeout(() => fireSparkles(results, true), 950);
  } else if (score >= 11) {
    setTimeout(() => fireSparkles(results, false), 500);
  }

  const snd = new Audio(CFG.sfxBase + tier.sound);
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

/* ══════════════════════════════════════════════════════════════
   REPLAY / BACK
   ══════════════════════════════════════════════════════════════ */
document.getElementById('so-replay').addEventListener('click', () => {
  results.classList.remove('show');
  [
    jpBox, answerEl, tilesEl,
    document.querySelector('.so-bottom-bar'),
    feedbackEl,
    document.querySelector('.so-hud'),
    dotsRow,
  ].forEach(el => { if (el) el.style.display = ''; });
  idx = 0; score = 0;
  scoreEl.textContent = '0';
  document.body.classList.remove('hira-mode');
  hiraMode = false;
  hiraLabel.textContent = 'ひらがな';
  U.shuffle(allCards);
  showCard();
});

document.getElementById('so-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

/* ══════════════════════════════════════════════════════════════
   GO
   ══════════════════════════════════════════════════════════════ */
showCard();

})();
