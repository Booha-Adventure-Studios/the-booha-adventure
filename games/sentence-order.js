
/* ══════════════════════════════════════════════════════════════
   sentence-order.js  —  Sentence Order  v2
   Show JP sentence + scrambled EN word tiles. Tap to build it.
   15 sentences, first-try correct = 1 point, 15 max.
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
const lastPlayedAt = {};
const AUDIO_DEBOUNCE_MS = 500;

function stopSent() {
  if (!activeSent) return;
  try { activeSent.pause(); activeSent.currentTime = 0; } catch {}
  activeSent = null;
}

function playSent(mp3) {
  if (!mp3) return;
  const a = sentCache[mp3];
  if (!a) return;
  const now = Date.now();
  if (lastPlayedAt[mp3] && now - lastPlayedAt[mp3] < AUDIO_DEBOUNCE_MS) return;
  lastPlayedAt[mp3] = now;
  stopSent();
  activeSent = a;
  try { a.currentTime = 0; } catch {}
  const p = a.play();
  if (p && p.catch) p.catch(() => {});
}

function playSentOnCorrect(mp3, onEnd) {
  /* version with callback for post-correct advance */
  if (!mp3) { if (onEnd) onEnd(); return; }
  const a = sentCache[mp3];
  if (!a) { if (onEnd) onEnd(); return; }
  stopSent();
  activeSent = a;
  try { a.currentTime = 0; } catch {}
  if (onEnd) {
    a.onended = () => { activeSent = null; onEnd(); };
    a.onerror = () => { activeSent = null; onEnd(); };
    setTimeout(() => { if (activeSent === a) { activeSent = null; onEnd(); } }, 6000);
  }
  const p = a.play();
  if (p && p.catch) p.catch(() => { if (onEnd) onEnd(); });
}

/* ══════════════════════════════════════════════════════════════
   WORD HELPERS
   ══════════════════════════════════════════════════════════════ */
/* Split sentence into word tokens with position metadata */
function tokenise(sentence) {
  /* Strip leading/trailing punctuation for clean words, but track them */
  const raw = sentence.trim().replace(/[.!?]+$/, '').split(/\s+/);
  return raw.map((w, i) => ({
    raw: w,                          /* original word incl. any internal punctuation */
    key: `${w}_${i}`,               /* stable identity */
    idx: i,
  }));
}

/* Build display label for a token: capitalise first, period on last */
function displayWord(token, isFirst, isLast) {
  let w = token.raw;
  if (isFirst) w = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  else          w = w.toLowerCase();
  if (isLast)  w = w.replace(/[.,!?]*$/, '') + '.';
  return w;
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
.game-header{ display:none !important; }
.so-wrap{
  position:relative; z-index:1;
  max-width:680px; margin:0 auto;
  padding:0 1rem 6rem;
}

/* ── header ── */
.so-header{ text-align:center; padding:.6rem 3rem .8rem; }
.so-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(28px,6vw,52px); font-weight:900;
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
  font-size:clamp(12px,2.2vw,16px); font-weight:800;
  color:var(--game-muted); letter-spacing:.06em;
}
[data-curriculum="pb"] .so-date{ color:rgba(58,26,46,.55); }

/* ── 15 progress dots ── */
.so-dots-row{
  display:flex; justify-content:center; gap:6px;
  margin:.5rem 0 .4rem; flex-wrap:wrap;
}
.so-dot{
  width:10px; height:10px; border-radius:50%;
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
}
.so-pill{
  padding:6px 18px; border-radius:999px;
  background:var(--game-pill-bg); border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text);
  font-size:clamp(13px,2.2vw,16px); font-weight:900; letter-spacing:.03em;
  box-shadow:0 2px 12px rgba(0,0,0,.2);
}
.so-pill b{ color:var(--game-primary); font-size:1.1em; text-shadow:0 0 10px var(--game-primary); }
[data-curriculum="pb"] .so-pill{
  background:#fff; border-color:#ffb0d8; color:#2a1020; box-shadow:0 3px 0 #ffccdd;
}
[data-curriculum="pb"] .so-pill b{ text-shadow:none; }

/* ══════════════════════════════════════════════════════════════
   JP SENTENCE CONTAINER — themed per curriculum
   ══════════════════════════════════════════════════════════════ */
.so-jp-box{
  border-radius:24px; padding:1.1rem 1.4rem 1rem;
  margin-bottom:1rem; text-align:center;
  position:relative; overflow:hidden;
  background:var(--game-surface); border:2px solid var(--game-border);
  backdrop-filter:blur(12px); box-shadow:0 8px 32px rgba(0,0,0,.22);
  transition:border-color .3s, box-shadow .3s;
  cursor:pointer; user-select:none;
  -webkit-tap-highlight-color:transparent;
}
.so-jp-box:hover{ filter:brightness(1.06); }
.so-jp-box:active{ transform:scale(.99); }
/* BR — warm orange/amber panel */
[data-curriculum="br"] .so-jp-box{
  background:linear-gradient(145deg,rgba(255,140,0,.09),rgba(255,80,0,.05),rgba(0,0,0,.18));
  border-color:rgba(255,140,0,.28);
  box-shadow:0 8px 32px rgba(0,0,0,.35), 0 0 0 1px rgba(255,140,0,.1);
}
/* BC — deep teal/emerald space panel */
[data-curriculum="bc"] .so-jp-box{
  background:linear-gradient(145deg,rgba(0,255,180,.07),rgba(0,200,255,.05),rgba(0,0,0,.28));
  border-color:rgba(0,230,180,.25);
  box-shadow:0 8px 32px rgba(0,0,0,.5), 0 0 28px rgba(0,200,180,.09);
}
/* PB — white bubbly card with pink border */
[data-curriculum="pb"] .so-jp-box{
  background:#ffffff; border:3px solid #ff6eb4;
  box-shadow:0 5px 0 #ffb0d8, 0 10px 24px rgba(255,110,180,.15);
}
/* shimmer top bar */
.so-jp-box::before{
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto; animation:soRainbow 2.4s linear infinite; pointer-events:none;
}
[data-curriculum="pb"] .so-jp-box::before{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto;
}
/* audio pulse ring when tapped */
.so-jp-box.playing::after{
  content:''; position:absolute; inset:-4px; border-radius:26px;
  border:2px solid var(--game-primary); opacity:.6;
  animation:soRing .7s ease-out forwards; pointer-events:none;
}
@keyframes soRing{
  from{ transform:scale(1); opacity:.6; }
  to{ transform:scale(1.03); opacity:0; }
}

.so-jp-label{
  font-family:var(--game-font-title);
  font-size:clamp(9px,1.6vw,12px); letter-spacing:.22em;
  text-transform:uppercase; color:var(--game-primary); opacity:.7; margin-bottom:.55rem;
}
[data-curriculum="br"] .so-jp-label{ color:rgba(255,160,40,1); }
[data-curriculum="bc"] .so-jp-label{ color:rgba(0,220,180,1); }
[data-curriculum="pb"] .so-jp-label{ color:#ff6eb4; }

/* hira / kanji toggle inside jp box */
.so-jp-kanji{
  font-family:var(--game-font-jp);
  font-size:clamp(20px,4.5vw,34px); font-weight:900;
  color:var(--game-ink); line-height:1.4; letter-spacing:.02em;
  text-wrap:balance;
}
[data-curriculum="pb"] .so-jp-kanji{ color:#2a1020; }
.so-jp-hira{
  font-family:var(--game-font-jp);
  font-size:clamp(14px,2.6vw,20px); font-weight:900;
  color:var(--game-ink); line-height:1.4;
  text-wrap:balance; display:none;
}
[data-curriculum="pb"] .so-jp-hira{ color:#2a1020; }
body.hira-mode .so-jp-kanji{ display:none; }
body.hira-mode .so-jp-hira{ display:block; }

.so-play-hint{
  font-family:var(--game-font-body);
  font-size:clamp(9px,1.5vw,11px); letter-spacing:.12em; text-transform:uppercase;
  color:var(--game-muted); opacity:.55; margin-top:.5rem;
}
[data-curriculum="pb"] .so-play-hint{ color:rgba(58,26,46,.4); }

/* ══════════════════════════════════════════════════════════════
   ANSWER ZONE — tapped words appear here as chips
   ══════════════════════════════════════════════════════════════ */
.so-answer-zone{
  min-height:72px; border-radius:20px; padding:10px 12px;
  display:flex; flex-wrap:wrap; gap:8px; align-content:flex-start;
  background:rgba(255,255,255,.04);
  border:2.5px dashed rgba(255,255,255,.18);
  margin-bottom:.9rem; position:relative;
  transition:border-color .2s, background .2s;
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
  font-size:clamp(11px,2vw,13px); letter-spacing:.1em;
  text-transform:uppercase; color:rgba(255,255,255,.2);
  pointer-events:none;
}
[data-curriculum="pb"] .so-answer-empty-hint{ color:rgba(58,26,46,.25); }

/* ── placed word chip ── */
.so-placed-chip{
  display:inline-flex; align-items:center; justify-content:center;
  padding:7px 14px; border-radius:14px; cursor:pointer;
  user-select:none; -webkit-tap-highlight-color:transparent;
  font-family:var(--game-font-body); font-weight:700;
  font-size:clamp(13px,2.4vw,17px); line-height:1.25;
  text-align:center;
  background:linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07));
  border:2px solid rgba(255,255,255,.32);
  color:var(--game-ink);
  box-shadow:0 4px 0 rgba(0,0,0,.28), 0 6px 14px rgba(0,0,0,.2);
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, background .14s;
  animation:soChipIn .22s cubic-bezier(.34,1.56,.64,1);
  max-width:160px;
  display:-webkit-box;
  -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden;
}
@keyframes soChipIn{
  from{ transform:scale(.7) translateY(6px); opacity:0; }
  to{ transform:none; opacity:1; }
}
.so-placed-chip:hover{ transform:translateY(-3px) scale(1.04); box-shadow:0 7px 0 rgba(0,0,0,.28), 0 10px 20px rgba(0,0,0,.28); }
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
  animation:soChipPop .32s cubic-bezier(.34,1.56,.64,1);
  cursor:default; pointer-events:none;
}
.so-placed-chip.so-wrong{
  background:rgba(239,68,68,.15) !important;
  border:2.5px solid #ef4444 !important;
  color:#ef4444 !important;
  box-shadow:0 0 0 3px rgba(239,68,68,.22), 0 0 20px rgba(239,68,68,.45) !important;
  animation:soChipShake .42s ease;
  cursor:default; pointer-events:none;
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
   WORD TILES — scrambled bank
   Wide word-shaped, Nunito, 2-line, distinct colors per curriculum
   ══════════════════════════════════════════════════════════════ */
.so-tiles{
  display:flex; flex-wrap:wrap; gap:9px; justify-content:center;
  margin:0 0 1rem; min-height:56px;
}

.so-tile{
  display:inline-flex; align-items:center; justify-content:center;
  padding:9px 16px; border-radius:16px;
  min-width:52px; max-width:180px;
  min-height:52px;
  font-family:var(--game-font-body); font-weight:700;
  font-size:clamp(13px,2.5vw,17px); line-height:1.25; text-align:center;
  display:-webkit-inline-box;
  -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden;
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
/* shimmer sweep */
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
/* entrance animation */
.so-tile.so-tile-in{
  animation:soTileIn .34s ease backwards;
  animation-delay:calc(var(--ti,0) * 0.06s);
}
@keyframes soTileIn{
  from{ transform:translateY(12px) scale(.88); opacity:0; }
  to{ transform:none; opacity:1; }
}

/* ══════════════════════════════════════════════════════════════
   BR TILES — coral / orange / warm palette (≠ spell-word's green)
   5 hues cycling: coral, amber, ochre, sienna, deep orange
   ══════════════════════════════════════════════════════════════ */
[data-curriculum="br"] .so-tile{
  text-shadow:0 1px 3px rgba(0,0,0,.5);
  --so-tile-text:#fff;
}
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

[data-curriculum="br"] .so-tile:hover{
  filter:brightness(1.15);
  box-shadow:0 8px 0 var(--so-tile-shadow,rgba(0,0,0,.4)), 0 14px 24px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.22);
}

/* ══════════════════════════════════════════════════════════════
   BC TILES — teal/emerald neon (≠ spell-word's cyan)
   5 hues: teal, emerald, seafoam, jade, mint-neon
   ══════════════════════════════════════════════════════════════ */
[data-curriculum="bc"] .so-tile{
  --so-tile-text:#e0fff8;
  text-shadow:0 0 10px var(--so-tile-border, rgba(0,220,180,.4));
}
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

[data-curriculum="bc"] .so-tile:hover{
  box-shadow:
    0 0 20px var(--so-tile-border, rgba(0,220,180,.3)),
    0 8px 0 var(--so-tile-shadow,rgba(0,0,0,.4)),
    0 14px 24px rgba(0,0,0,.45),
    inset 0 1px 0 rgba(255,255,255,.09);
  filter:brightness(1.25);
  border-color:var(--so-tile-border, rgba(0,220,180,.7));
}

/* ══════════════════════════════════════════════════════════════
   PB TILES — white with thick pastel borders (matches menu)
   Same palette as spell-word but it's a different game so fine
   ══════════════════════════════════════════════════════════════ */
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
[data-curriculum="pb"] .so-tile:hover{
  transform:translateY(-4px) scale(1.06);
  box-shadow:0 8px 0 var(--so-tile-shadow,#ffb0d8), 0 12px 20px rgba(255,110,180,.2) !important;
}

/* ══════════════════════════════════════════════════════════════
   BOTTOM BAR — hira toggle + clear + check + help
   ══════════════════════════════════════════════════════════════ */
.so-bottom-bar{
  display:flex; justify-content:center; align-items:center;
  gap:12px; margin-top:16px; flex-wrap:wrap;
}

/* Hira toggle */
.so-hira-btn{
  font-family:var(--game-font-jp);
  font-size:clamp(12px,2.2vw,15px); font-weight:900;
  padding:11px 18px; border-radius:999px;
  border:2px solid var(--game-border);
  background:var(--game-surface); color:var(--game-muted);
  cursor:pointer; transition:all .2s; letter-spacing:.03em;
  white-space:nowrap; display:flex; align-items:center; gap:7px;
  -webkit-tap-highlight-color:transparent;
}
.so-hira-btn:hover{ border-color:var(--game-primary); color:var(--game-primary); }
body.hira-mode .so-hira-btn{
  border-color:var(--game-primary);
  background:color-mix(in srgb,var(--game-primary) 12%,var(--game-surface));
  color:var(--game-primary);
  box-shadow:0 0 14px color-mix(in srgb,var(--game-primary) 35%,transparent);
}
.so-hira-icon{ font-size:1.15em; display:inline-block; transition:transform .3s; }
body.hira-mode .so-hira-icon{ transform:rotate(180deg); }
[data-curriculum="pb"] .so-hira-btn{
  background:#fff; border-color:#cc88ff; color:#aa44cc; box-shadow:0 3px 0 #ddb8ff;
}

/* CHECK button */
.so-check-btn{
  font-family:var(--game-font-title);
  font-size:clamp(17px,3.2vw,22px); letter-spacing:.08em;
  padding:14px 44px; border:none; border-radius:999px;
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

/* CLEAR button — danger style, hidden until first wrong */
.so-clear-btn{
  font-family:var(--game-font-title);
  font-size:clamp(14px,2.8vw,18px); letter-spacing:.06em;
  padding:12px 28px; border-radius:999px;
  border:2.5px solid rgba(239,68,68,.5);
  background:rgba(239,68,68,.12); color:#ef4444; font-weight:900;
  cursor:pointer; position:relative; overflow:hidden;
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

/* HELP button */
.so-help-btn{
  width:46px; height:46px; border-radius:50%;
  border:2px solid var(--game-border); background:var(--game-surface);
  color:var(--game-muted); font-size:1.3rem; font-weight:900;
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

/* CLOSE / X button */
.game-close{
  position:fixed; top:1rem; right:1rem; z-index:50;
  width:50px; height:50px; border-radius:50%;
  background:rgba(255,255,255,.1); border:2px solid rgba(255,255,255,.22);
  color:#fff; font-size:1.25rem;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; backdrop-filter:blur(10px);
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
  text-decoration:none; font-weight:900;
  box-shadow:0 4px 16px rgba(0,0,0,.25); -webkit-tap-highlight-color:transparent;
}
.game-close:hover{
  background:rgba(239,68,68,.55); border-color:rgba(239,68,68,.7);
  transform:scale(1.18) rotate(12deg);
  box-shadow:0 0 22px rgba(239,68,68,.45), 0 6px 20px rgba(0,0,0,.3);
}
.game-close:active{ transform:scale(.9) rotate(0deg); }
[data-curriculum="pb"] .game-close{
  background:#fff; border:3px solid #ff6eb4; color:#ff6eb4; box-shadow:0 4px 0 #ffb0d8;
}
[data-curriculum="pb"] .game-close:hover{
  background:#fff0f8; transform:rotate(15deg) scale(1.18);
  box-shadow:0 4px 0 #ffb0d8, 0 0 16px rgba(255,110,180,.4);
}
[data-curriculum="bc"] .game-close{ border-color:rgba(0,200,180,.22); }
[data-curriculum="bc"] .game-close:hover{
  background:rgba(0,200,180,.14); border-color:rgba(0,200,180,.8);
  box-shadow:0 0 24px rgba(0,200,180,.4); transform:scale(1.12) rotate(10deg);
}

/* ── feedback text ── */
.so-feedback{
  text-align:center; min-height:2rem; margin-top:.6rem;
  font-family:var(--game-font-body);
  font-size:clamp(14px,2.6vw,18px); font-weight:900; transition:color .2s;
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
}
.so-modal-overlay.open{ opacity:1; pointer-events:all; }
.so-modal{
  max-width:480px; width:calc(100% - 2rem);
  border-radius:28px; overflow:hidden;
  background:var(--game-bg); border:2px solid var(--game-primary);
  box-shadow:0 0 48px color-mix(in srgb,var(--game-primary) 30%,transparent), 0 24px 48px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
.so-modal-overlay.open .so-modal{ transform:none; }
[data-curriculum="pb"] .so-modal{ background:#fff8fc; border-color:#ff6eb4; box-shadow:0 8px 0 #ffb0d8, 0 16px 40px rgba(255,110,180,.25); }
[data-curriculum="bc"] .so-modal{ background:#030e0c; border-color:rgba(0,220,180,.6); }

.so-modal-header{
  padding:1.2rem 1.4rem .8rem;
  background:linear-gradient(135deg,color-mix(in srgb,var(--game-primary) 14%,transparent),color-mix(in srgb,var(--game-secondary) 8%,transparent));
  border-bottom:1px solid var(--game-border); text-align:center;
}
.so-modal-title{
  font-family:var(--game-font-title);
  font-size:clamp(20px,4vw,26px); letter-spacing:.06em;
  color:var(--game-primary);
  text-shadow:0 0 16px color-mix(in srgb,var(--game-primary) 55%,transparent);
}
[data-curriculum="pb"] .so-modal-title{ color:#ff6eb4; text-shadow:none; }
.so-modal-title-jp{
  font-family:var(--game-font-jp);
  font-size:clamp(12px,2vw,15px); color:var(--game-muted); margin-top:4px;
}
[data-curriculum="pb"] .so-modal-title-jp{ color:rgba(58,26,46,.55); }
.so-modal-body{ padding:1.2rem 1.4rem 1.4rem; }
.so-how-step{
  display:grid; grid-template-columns:36px 1fr;
  gap:10px; align-items:start; margin-bottom:.9rem;
}
.so-how-step:last-child{ margin-bottom:0; }
.so-how-num{
  width:36px; height:36px; border-radius:50%;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-family:var(--game-font-title);
  font-size:clamp(14px,2.5vw,18px); font-weight:900;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
  box-shadow:0 0 12px color-mix(in srgb,var(--game-primary) 45%,transparent);
}
.so-how-en{
  font-family:var(--game-font-body); font-size:clamp(13px,2.2vw,15px);
  font-weight:800; color:var(--game-ink); line-height:1.35; padding-top:2px;
}
[data-curriculum="pb"] .so-how-en{ color:#2a1020; }
.so-how-jp{
  font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,13px);
  color:var(--game-muted); margin-top:3px; line-height:1.4;
}
[data-curriculum="pb"] .so-how-jp{ color:rgba(58,26,46,.55); }
.so-modal-close{
  display:block; width:100%; margin-top:1.1rem;
  font-family:var(--game-font-title);
  font-size:clamp(15px,2.8vw,19px); letter-spacing:.06em;
  padding:12px; border-radius:999px; border:none; cursor:pointer;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:0 0 20px color-mix(in srgb,var(--game-primary) 45%,transparent);
  transition:transform .15s;
}
.so-modal-close:hover{ transform:scale(1.03); }
.so-modal-close:active{ transform:scale(.96); }

/* ══════════════════════════════════════════════════════════════
   RESULTS PANEL
   ══════════════════════════════════════════════════════════════ */
.so-results{
  display:none; text-align:center; max-width:560px;
  margin:1.5rem auto; padding:2.6rem 1.6rem 2rem;
  border-radius:32px; position:relative; overflow:hidden;
  border:2.5px solid var(--tier-color,var(--game-primary));
  background:color-mix(in srgb,var(--tier-color,var(--game-primary)) 6%,var(--game-bg));
  box-shadow:0 0 60px color-mix(in srgb,var(--tier-color,var(--game-primary)) 22%,transparent),
    0 24px 48px rgba(0,0,0,.4);
}
.so-results.show{
  display:block; animation:soResultIn .55s cubic-bezier(.22,.8,.36,1) both;
}
@keyframes soResultIn{
  from{ opacity:0; transform:scale(.82) translateY(28px); }
  to{ opacity:1; transform:none; }
}
.so-results::before{
  content:''; position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto; animation:soRainbow 2.4s linear infinite;
}
.so-results::after{
  content:''; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(circle at 20% 80%,color-mix(in srgb,var(--tier-color,var(--game-primary)) 12%,transparent) 0%,transparent 50%),
    radial-gradient(circle at 80% 20%,color-mix(in srgb,var(--game-secondary) 8%,transparent) 0%,transparent 50%);
}
.so-res-inner{ position:relative; z-index:1; }
.so-res-score{
  font-family:var(--game-font-title); font-size:clamp(62px,16vw,98px);
  line-height:1; color:var(--tier-color,var(--game-primary));
  text-shadow:0 0 28px var(--tier-color,var(--game-primary));
  margin-bottom:4px;
  animation:soScorePop .55s cubic-bezier(.22,.8,.36,1) .3s both;
}
@keyframes soScorePop{
  from{ transform:scale(.55) rotate(-6deg); opacity:0; }
  50%{ transform:scale(1.08) rotate(2deg); }
  to{ transform:none; opacity:1; }
}
.so-res-pct{
  font-size:clamp(14px,2.6vw,19px); color:var(--game-muted);
  font-weight:700; margin-bottom:12px;
  animation:soFadeUp .4s ease .5s both;
}
.so-res-label{
  font-family:var(--game-font-title); font-size:clamp(26px,5.5vw,40px);
  color:var(--tier-color,var(--game-primary)); margin-bottom:10px; letter-spacing:.05em;
  text-shadow:0 0 18px color-mix(in srgb,var(--tier-color,var(--game-primary)) 55%,transparent);
  animation:soFadeUp .4s ease .52s both;
}
.so-res-divider{
  width:60px; height:3px; border-radius:99px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary));
  margin:0 auto 12px; opacity:.6; animation:soFadeUp .4s ease .56s both;
}
.so-res-en{
  font-family:var(--game-font-body); font-weight:900;
  font-size:clamp(14px,2.4vw,18px); color:var(--game-ink);
  margin-bottom:4px; animation:soFadeUp .4s ease .6s both;
}
.so-res-jp{
  font-family:var(--game-font-jp); font-size:clamp(14px,2.2vw,17px);
  color:var(--game-muted); margin-bottom:3px; animation:soFadeUp .4s ease .64s both;
}
.so-res-kanji{
  font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,14px);
  color:var(--game-muted); opacity:.7; margin-bottom:1.4rem;
  animation:soFadeUp .4s ease .68s both;
}
.so-res-actions{
  display:flex; gap:12px; justify-content:center; flex-wrap:wrap;
  animation:soFadeUp .4s ease .76s both;
}
@keyframes soFadeUp{
  from{ transform:translateY(14px); opacity:0; }
  to{ transform:none; opacity:1; }
}

/* confetti */
@keyframes soConfetti{
  0%{ transform:translate(0,0) rotate(0deg) scale(1); opacity:1; }
  100%{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; }
}
.so-confetti-piece{
  position:fixed; pointer-events:none; z-index:9999; border-radius:2px;
  animation:soConfetti 1.1s ease-out forwards;
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

  <div class="so-jp-box" id="so-jp-box" title="Tap to hear the sentence">
    <div class="so-jp-label">ORDER THE SENTENCE / ことばをならべよう</div>
    <div class="so-jp-kanji" id="so-jp"></div>
    <div class="so-jp-hira"  id="so-hira"></div>
    <div class="so-play-hint">▶ TAP TO LISTEN</div>
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
    <button class="so-clear-btn" id="so-clear">CLEAR</button>
    <button class="so-check-btn" id="so-check" disabled>CHECK</button>
    <button class="so-help-btn"  id="so-help">？</button>
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
          <div class="so-how-en">Tap the Japanese box to hear the sentence!</div>
          <div class="so-how-jp">日本語をタップ → 文が聞こえるよ！</div>
        </div>
      </div>
      <div class="so-how-step">
        <div class="so-how-num">2</div>
        <div>
          <div class="so-how-en">Tap word tiles to build the English sentence in order.</div>
          <div class="so-how-jp">単語タイルをタップして英文を作ろう。</div>
        </div>
      </div>
      <div class="so-how-step">
        <div class="so-how-num">3</div>
        <div>
          <div class="so-how-en">Tap a placed word to remove it from the sentence.</div>
          <div class="so-how-jp">並べた単語をタップすると元に戻るよ。</div>
        </div>
      </div>
      <div class="so-how-step">
        <div class="so-how-num">4</div>
        <div>
          <div class="so-how-en">Press CHECK when done. First try = a point!</div>
          <div class="so-how-jp">CHECKボタンを押そう。一発正解でポイントゲット！</div>
        </div>
      </div>
      <div class="so-how-step">
        <div class="so-how-num">あ</div>
        <div>
          <div class="so-how-en">Press あ to switch between kanji and hiragana.</div>
          <div class="so-how-jp">「あ」で漢字・ひらがなを切りかえられるよ！</div>
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
   JP BOX — tap to play sentence audio
   ══════════════════════════════════════════════════════════════ */
jpBox.addEventListener('touchstart', e => {
  e.preventDefault();
  unlockAllAudio();
  fireJpBoxPlay();
}, { passive: false });
jpBox.addEventListener('click', e => {
  if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
  fireJpBoxPlay();
});

function fireJpBoxPlay() {
  if (!currentCard) return;
  playSent(currentCard.mp3);
  jpBox.classList.remove('playing');
  void jpBox.offsetWidth;
  jpBox.classList.add('playing');
  jpBox.addEventListener('animationend', () => jpBox.classList.remove('playing'), { once: true });
}

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
let idx        = 0;
let score      = 0;
let currentCard = null;
let tokens     = [];    /* word tokens for current card */
let placed     = [];    /* array of token indices in answer order */
let tileEls    = [];    /* parallel array of tile DOM elements */
let firstTry   = true;
let locked     = false;
let hasMadeWrongAttempt = false;

/* button smash guard */
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
  hasMadeWrongAttempt = false;
  placed = [];
  feedbackEl.textContent = '';
  feedbackEl.style.color = '';
  clearBtn.classList.remove('visible');
  checkBtn.disabled = true;

  currentCard = allCards[idx];
  numEl.textContent  = idx + 1;
  jpEl.textContent   = currentCard.jp;
  hiraEl.textContent = currentCard.hira || '';
  updateDots();

  /* tokenise the EN sentence */
  tokens = tokenise(currentCard.en);

  buildTiles();
  renderAnswer();
}

/* ══════════════════════════════════════════════════════════════
   BUILD WORD TILES (shuffled bank)
   ══════════════════════════════════════════════════════════════ */
function buildTiles() {
  tilesEl.innerHTML = '';
  tileEls = [];

  /* assign a stable display label to each token based on its ORIGINAL position */
  const n = tokens.length;
  const shuffled = U.shuffle(tokens.map((t, i) => ({ token: t, origIdx: i })));

  shuffled.forEach(({ token, origIdx }, ti) => {
    const isFirst = origIdx === 0;
    const isLast  = origIdx === n - 1;
    const label   = displayWord(token, isFirst, isLast);

    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'so-tile so-tile-in';
    tile.textContent = label;
    tile.dataset.ti  = ti;
    tile.dataset.origIdx = origIdx;
    tile.style.setProperty('--ti', ti);

    tile.addEventListener('touchstart', e => {
      e.preventDefault();
      unlockAllAudio();
      /* play sentence audio on tile tap */
      playSent(currentCard.mp3);
      handleTileTap(tile, origIdx);
    }, { passive: false });
    tile.addEventListener('click', e => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      playSent(currentCard.mp3);
      handleTileTap(tile, origIdx);
    });

    tilesEl.appendChild(tile);
    tileEls[origIdx] = tile;
  });
}

/* ══════════════════════════════════════════════════════════════
   TILE TAP — add word to answer
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
   ══════════════════════════════════════════════════════════════ */
function renderAnswer() {
  /* remove all chips (but keep the empty hint element) */
  Array.from(answerEl.children).forEach(el => {
    if (!el.classList.contains('so-answer-empty-hint')) el.remove();
  });

  emptyHint.style.display = placed.length === 0 ? '' : 'none';
  answerEl.classList.toggle('has-words', placed.length > 0);

  const n = tokens.length;
  placed.forEach((origIdx, pi) => {
    const isFirst = origIdx === 0;
    const isLast  = origIdx === n - 1;
    const label   = displayWord(tokens[origIdx], isFirst, isLast);

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
   CHIP TAP — remove word from answer, return to bank
   ══════════════════════════════════════════════════════════════ */
function handleChipTap(pi) {
  if (locked) return;
  const origIdx = placed[pi];
  placed.splice(pi, 1);
  /* return tile to bank */
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

  /* build answer string from placed token indices */
  const n = tokens.length;
  const answerWords = placed.map((origIdx, pi) => {
    const isFirst = origIdx === 0;
    const isLast  = origIdx === n - 1;
    return displayWord(tokens[origIdx], isFirst, isLast);
  });
  const answerStr = answerWords.join(' ');

  /* build target string the same way (tokens in order 0..n-1) */
  const targetWords = tokens.map((t, i) => displayWord(t, i === 0, i === n - 1));
  const targetStr   = targetWords.join(' ');

  const correct = answerStr.toLowerCase() === targetStr.toLowerCase();

  /* get all chips in answer zone for visual feedback */
  const chips = Array.from(answerEl.querySelectorAll('.so-placed-chip'));

  if (correct) {
    locked = true;
    chips.forEach((chip, i) => {
      setTimeout(() => {
        chip.classList.remove('so-wrong');
        chip.classList.add('so-correct');
      }, i * 55);
    });

    feedbackEl.textContent = targetStr + '!';
    feedbackEl.style.color = '#22c55e';
    U.playSFX('ding');

    if (firstTry) {
      score++;
      scoreEl.textContent = score;
    }
    updateDots();

    if (firstTry) fireConfetti(false);

    /* play audio then advance */
    setTimeout(() => {
      playSentOnCorrect(currentCard.mp3, () => {
        setTimeout(() => {
          idx++;
          if (idx >= allCards.length) showResults();
          else showCard();
        }, 400);
      });
    }, chips.length * 55 + 200);

  } else {
    /* wrong — grade per word position */
    locked = true;
    firstTry = false;
    hasMadeWrongAttempt = true;
    clearBtn.classList.add('visible');

    chips.forEach((chip, pi) => {
      const placedOrigIdx = placed[pi];
      const expectedOrigIdx = pi; /* correct order = 0,1,2,... */
      setTimeout(() => {
        chip.classList.remove('so-correct');
        if (placedOrigIdx === expectedOrigIdx) {
          chip.classList.add('so-correct');
        } else {
          chip.classList.add('so-wrong');
        }
      }, pi * 55);
    });

    feedbackEl.textContent = 'Not quite — try again!';
    feedbackEl.style.color = '#ef4444';
    U.playSFX('fart');

    /* unlock after animation so student can clear + retry */
    const totalDelay = chips.length * 55 + 700;
    setTimeout(() => { locked = false; }, totalDelay);
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
    el.className = 'so-confetti-piece';
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
