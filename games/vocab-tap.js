
/* ══════════════════════════════════════════════════════════════
   vocab-tap.js — Vocabulary Tap Match  v3
   Pair all 5 EN → JP, then press Check.
   3 rounds × 5 cards = 15 points max.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

/* Check reveal pacing (Games Pass 2: was 700 / 750 / 500 ms). */
const REVEAL_OK_MS = 220, REVEAL_MISS_MS = 300, REVEAL_END_MS = 350;

/* Games Pass 4: combo / sharp / points. Each pair is one item; sharp = the
   whole round of 5 matched inside the par time (but not under 2 s). */
// Razzle-dazzle Pass 6: on the full impact kit (rune per match + round finisher).
const run = U.createRun({ total: 15, recoverPoints: 0, impactKit: true });
const ROUND_PAR_MS = 12000;
let roundStartedAt = 0;

U.unlockAudio();

/* ══════════════════════════════════════════════════════════════
   AUDIO — load SFX only; word audio is created lazily on demand.
   The iOS "warm-up" trick was causing all clips to auto-play on
   the first gesture. We avoid that by NOT pre-playing every file.
   Instead we decode/load them silently via load() only.
   ══════════════════════════════════════════════════════════════ */
/* Ding/fart use the shared Web Audio engine (js/booha-sfx.js via
   GAME_UTILS): decoded once, instant, and safe to fire after the awaits
   in the Check reveal below (cloned <audio> elements were not, on iPad). */
await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

/* Build audio cache — load() only, never play() during warm-up */
const wordCache = {};
for (const card of CFG.cards.slice(0, 15)) {
  if (!card.mp3 || wordCache[card.mp3]) continue;
  const a = new Audio(CFG.audioBase + card.mp3);
  a.preload = 'auto';
  a.setAttribute('playsinline', '');
  a.setAttribute('webkit-playsinline', '');
  try { a.load(); } catch (_) {}
  wordCache[card.mp3] = a;
}

/* ── Audio state ── */
let activeWord   = null;
let wordLocked   = false; /* true while a clip is playing → block new taps */

/* Track last-played timestamps per clip to debounce rapid re-taps */
const lastPlayedAt   = {};
const AUDIO_DEBOUNCE = 500;

function stopWord() {
  if (!activeWord) return;
  try { activeWord.pause(); activeWord.currentTime = 0; } catch (_) {}
  activeWord  = null;
  wordLocked  = false;
}

function playWord(mp3) {
  if (!mp3) return;
  const a = wordCache[mp3];
  if (!a) return;
  if (wordLocked) return;

  const now = Date.now();
  if (lastPlayedAt[mp3] && now - lastPlayedAt[mp3] < AUDIO_DEBOUNCE) return;
  lastPlayedAt[mp3] = now;

  activeWord  = a;
  wordLocked  = true;

  try { a.currentTime = 0; } catch (_) {}

  const p = a.play();
  if (p && p.catch) p.catch(() => { wordLocked = false; activeWord = null; });

  /* Re-enable tapping once the clip ends */
  const finish = () => { if (activeWord === a) activeWord = null; wordLocked = false; };
  a.onended = finish;
  a.onerror = finish;
  setTimeout(finish, 5000);
}

/* ══════════════════════════════════════════════════════════════
   DATA  — shuffle happens here AND on every replay
   ══════════════════════════════════════════════════════════════ */
function buildShuffledDeck() {
  return U.shuffle(CFG.cards.slice(0, 15)).map((c, i) => ({
    ...c,
    _key: String(c.id ?? c.n ?? c.mp3 ?? `${c.en}__${i}`)
  }));
}

let allCards = buildShuffledDeck();

/* ══════════════════════════════════════════════════════════════
   RESULT TIERS → js/game-scorecard.js
   ══════════════════════════════════════════════════════════════ */
/* Result tiers now live in js/game-scorecard.js (shared score card). */

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
  const monthMap = {
    jan:'January', feb:'February', mar:'March', apr:'April',
    may:'May',     jun:'June',     jul:'July',   aug:'August',
    sep:'September', oct:'October', nov:'November', dec:'December'
  };
  return `${monthMap[m[1].toLowerCase()]} Week ${m[2]}`;
}

const curriculum = document.documentElement.dataset.curriculum || CFG.curriculum || 'br';

/* ══════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `

/* ── base wrap ── */
.vt-wrap{
  position:relative; z-index:1;
  max-width:960px; margin:0 auto;
  padding:0 .75rem 6rem;
  box-sizing:border-box;
}

/* ── header ── */
.vt-header{
  text-align:center;
  padding:.6rem 3rem .8rem;
}
.vt-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(24px,5.5vw,52px);
  font-weight:900;
  letter-spacing:.12em;
  text-transform:uppercase;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:vtRainbowShift 3s linear infinite;
}
[data-curriculum="bc"] .vt-curriculum{
  background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);
  background-size:220% auto;
  -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .vt-curriculum{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto;
  -webkit-background-clip:text; background-clip:text;
}
@keyframes vtRainbowShift{ to{ background-position:220% center; } }

.game-header{ display:none !important; }

.vt-date{
  margin-top:4px;
  font-family:var(--game-font-body);
  font-size:clamp(11px,2vw,16px);
  font-weight:800;
  color:var(--game-muted);
  letter-spacing:.06em;
}
[data-curriculum="pb"] .vt-date{ color:rgba(58,26,46,.55); }
[data-curriculum="pb"] .vt-score-pill{
  background:#fff; border-color:#ffb0d8; color:#2a1020;
  box-shadow:0 3px 0 #ffccdd;
}
[data-curriculum="pb"] .vt-score-pill b{ text-shadow:none; }

/* ── dots ── */
.vt-dots-row{
  display:flex; justify-content:center; align-items:center; gap:14px;
  margin:.65rem 0 .5rem;
}
.vt-dot{
  width:15px; height:15px; border-radius:50%;
  background:rgba(255,255,255,.12);
  border:2px solid rgba(255,255,255,.18);
  position:relative;
  transition:all .3s ease;
}
.vt-dot.active{
  background:var(--game-primary);
  border-color:var(--game-primary);
  box-shadow:0 0 12px var(--game-primary), 0 0 28px color-mix(in srgb, var(--game-primary) 45%, transparent);
}
.vt-dot.active::after{
  content:''; position:absolute; inset:-6px; border-radius:50%;
  border:2px solid var(--game-primary); opacity:.4;
  animation:vtRipple 1.6s ease-out infinite;
}
.vt-dot.done{
  background:#22c55e; border-color:#22c55e;
  box-shadow:0 0 12px rgba(34,197,94,.7);
}
@keyframes vtRipple{
  from{ transform:scale(1); opacity:.4; }
  to{   transform:scale(2.5); opacity:0; }
}

/* ── score pill ── */
.vt-score-row{
  display:flex; justify-content:center; margin-bottom:.65rem;
}
.vt-score-pill{
  padding:7px 22px; border-radius:999px;
  background:var(--game-pill-bg);
  border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text);
  font-size:clamp(13px,2.2vw,16px); font-weight:900;
  letter-spacing:.03em;
  box-shadow:0 2px 12px rgba(0,0,0,.2);
}
.vt-score-pill b{
  color:var(--game-primary); font-size:1.1em;
  text-shadow:0 0 10px var(--game-primary);
}

/* ── columns ── */
.vt-columns{
  display:grid;
  grid-template-columns:1fr 1fr;
  grid-template-rows:auto;
  gap:clamp(8px, 2vw, 14px);
  align-items:stretch;
}
@media(max-width:600px){
  .vt-columns{ grid-template-columns:1fr; gap:10px; }
  .vt-panel{ grid-template-rows:repeat(5, auto); }
}

/* ── panel ── */
.vt-panel{
  border-radius:20px;
  padding:clamp(8px, 1.5vw, 12px) clamp(7px, 1.2vw, 10px);
  background:var(--game-surface);
  border:1px solid var(--game-border);
  backdrop-filter:blur(10px);
  box-shadow:0 8px 32px rgba(0,0,0,.22);
  display:grid;
  grid-template-rows:repeat(5, 1fr);
  gap:clamp(7px, 1.4vw, 10px);
}
.vt-stack{
  display:contents; /* lets panel's grid control row sizing */
}
[data-curriculum="br"] .vt-panel{
  background:rgba(170,255,34,.04);
  border-color:rgba(170,255,34,.14);
}
[data-curriculum="bc"] .vt-panel{
  background:rgba(0,240,255,.04);
  border-color:rgba(0,240,255,.14);
}

/* ══════════════════════════════════════════════════════════════
   ENGLISH CARDS
   ══════════════════════════════════════════════════════════════ */
.vt-en-card{
  --card-hue: calc(var(--i,0) * 52deg);
  position:relative; overflow:hidden;
  border-radius:18px;
  padding:10px 12px;
  min-height:64px; height:100%;
  box-sizing:border-box;
  background:
    linear-gradient(135deg,
      hsl(from var(--game-primary) h calc(s + 10%) l / 0.22),
      hsl(from var(--game-secondary) h s l / 0.18)),
    linear-gradient(145deg,
      rgba(255,255,255,.18) 0%,rgba(255,255,255,.04) 60%,rgba(0,0,0,.06) 100%);
  border:2px solid rgba(255,255,255,.22);
  box-shadow:0 8px 24px rgba(0,0,0,.32),0 2px 0 rgba(255,255,255,.14) inset,0 -2px 0 rgba(0,0,0,.12) inset;
  cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
  display:flex; align-items:center; justify-content:center; text-align:center;
  transition:transform .16s cubic-bezier(.34,1.56,.64,1),box-shadow .16s,border-color .16s,opacity .2s;
  filter:hue-rotate(var(--card-hue));
}
.vt-en-card.animating{
  animation:vtTileIn .38s ease backwards;
  animation-delay:calc(var(--i,0) * 0.06s);
}
@keyframes vtTileIn{
  from{ transform:translateY(14px) scale(.95); opacity:0; }
  to{   transform:none; opacity:1; }
}
.vt-en-card::before{
  content:''; position:absolute; inset:0;
  background:repeating-linear-gradient(118deg,transparent 0 12px,rgba(255,255,255,.055) 12px 14px);
  pointer-events:none; z-index:0;
}
.vt-en-card::after{
  content:''; position:absolute; top:-60%; left:-80%;
  width:50%; height:200%;
  background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.28) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .5s ease; pointer-events:none; z-index:1;
}
.vt-en-card:hover::after{ left:150%; }
.vt-en-card:hover{
  transform:translateY(-4px) scale(1.035);
  box-shadow:0 14px 32px rgba(0,0,0,.38),0 0 24px color-mix(in srgb, var(--game-primary) 40%, transparent),0 2px 0 rgba(255,255,255,.18) inset;
  border-color:rgba(255,255,255,.38);
}
.vt-en-card:active{ transform:scale(.96); }
.vt-card-inner{ position:relative; z-index:2; width:100%; }
.vt-en-text{
  font-family:var(--game-font-body);
  font-weight:900;
  font-size:clamp(16px,2.5vw,23px);
  color:var(--game-tile-text);
  line-height:1.15;
  display:-webkit-box;
  -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  text-wrap:balance;
  text-shadow:0 1px 0 rgba(255,255,255,.5);
}
.vt-en-card.selected{
  border-color:var(--game-primary);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--game-primary) 18%, transparent),
      color-mix(in srgb, var(--game-secondary) 12%, transparent));
  box-shadow:0 0 0 3px color-mix(in srgb, var(--game-primary) 38%, transparent),0 0 30px color-mix(in srgb, var(--game-primary) 50%, transparent),0 8px 24px rgba(0,0,0,.32);
  transform:translateY(-3px) scale(1.03);
}
.vt-en-card.selected .vt-en-text{
  color:color-mix(in srgb, var(--game-primary) 80%, var(--game-tile-text));
}
.vt-en-card.leaving{
  opacity:0; transform:translateX(22px) scale(.94);
  pointer-events:none; transition:opacity .22s, transform .22s;
}

/* BR card colors */
[data-curriculum="br"] .vt-en-card{
  filter:none;
  background:var(--br-card-bg, linear-gradient(145deg,#1a4a00,#2d7a00));
  border-color:var(--br-card-border, rgba(170,255,34,.5));
  box-shadow:0 6px 0 var(--br-card-shadow, rgba(0,0,0,.4)),0 10px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.18);
}
[data-curriculum="br"] .vt-en-card .vt-en-text{ color:#fff; text-shadow:0 1px 3px rgba(0,0,0,.5); }
[data-curriculum="br"] .vt-en-card[data-ci="0"]{ --br-card-bg:linear-gradient(145deg,#1e5c00,#2e8800); --br-card-border:rgba(170,255,34,.55); --br-card-shadow:rgba(20,80,0,.6); }
[data-curriculum="br"] .vt-en-card[data-ci="1"]{ --br-card-bg:linear-gradient(145deg,#6a003a,#a0005a); --br-card-border:rgba(255,60,160,.55); --br-card-shadow:rgba(100,0,50,.6); }
[data-curriculum="br"] .vt-en-card[data-ci="2"]{ --br-card-bg:linear-gradient(145deg,#003a44,#005566); --br-card-border:rgba(0,200,220,.5); --br-card-shadow:rgba(0,50,60,.6); }
[data-curriculum="br"] .vt-en-card[data-ci="3"]{ --br-card-bg:linear-gradient(145deg,#4a3000,#704800); --br-card-border:rgba(255,180,0,.5); --br-card-shadow:rgba(60,30,0,.6); }
[data-curriculum="br"] .vt-en-card[data-ci="4"]{ --br-card-bg:linear-gradient(145deg,#2a0060,#440090); --br-card-border:rgba(180,100,255,.55); --br-card-shadow:rgba(30,0,80,.6); }
[data-curriculum="br"] .vt-en-card:hover{ transform:translateY(-4px) scale(1.035); filter:brightness(1.12); }
[data-curriculum="br"] .vt-en-card.selected{ filter:brightness(1.18); transform:translateY(-3px) scale(1.04); box-shadow:0 0 0 3px var(--br-card-border,rgba(170,255,34,.5)),0 0 28px var(--br-card-border,rgba(170,255,34,.4)),0 6px 0 var(--br-card-shadow,rgba(0,0,0,.4)); }
[data-curriculum="br"] .vt-en-card.selected .vt-en-text{ color:#fff; }

/* BC card colors */
[data-curriculum="bc"] .vt-en-card{
  filter:none;
  background:var(--bc-card-bg, linear-gradient(145deg,#040d1a,#071428));
  border:2px solid var(--bc-card-border, rgba(0,240,255,.45));
  box-shadow:0 0 14px var(--bc-card-glow,rgba(0,240,255,.2)),0 6px 20px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07);
}
[data-curriculum="bc"] .vt-en-card .vt-en-text{ color:#ecfeff; text-shadow:0 0 10px var(--bc-card-border,rgba(0,240,255,.4)); }
[data-curriculum="bc"] .vt-en-card[data-ci="0"]{ --bc-card-bg:linear-gradient(145deg,#041820,#062430); --bc-card-border:rgba(0,230,255,.55); --bc-card-glow:rgba(0,230,255,.22); }
[data-curriculum="bc"] .vt-en-card[data-ci="1"]{ --bc-card-bg:linear-gradient(145deg,#04201a,#063028); --bc-card-border:rgba(0,220,160,.5); --bc-card-glow:rgba(0,220,160,.18); }
[data-curriculum="bc"] .vt-en-card[data-ci="2"]{ --bc-card-bg:linear-gradient(145deg,#180828,#24103a); --bc-card-border:rgba(170,80,255,.55); --bc-card-glow:rgba(170,80,255,.22); }
[data-curriculum="bc"] .vt-en-card[data-ci="3"]{ --bc-card-bg:linear-gradient(145deg,#201200,#301a00); --bc-card-border:rgba(255,170,0,.5); --bc-card-glow:rgba(255,170,0,.18); }
[data-curriculum="bc"] .vt-en-card[data-ci="4"]{ --bc-card-bg:linear-gradient(145deg,#060a20,#0a1238); --bc-card-border:rgba(80,120,255,.55); --bc-card-glow:rgba(80,120,255,.22); }
[data-curriculum="bc"] .vt-en-card:hover{ transform:translateY(-4px) scale(1.035); box-shadow:0 0 24px var(--bc-card-glow,rgba(0,240,255,.3)),0 10px 28px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.09); border-color:var(--bc-card-border,rgba(0,240,255,.7)); }
[data-curriculum="bc"] .vt-en-card.selected{ transform:translateY(-3px) scale(1.04); border-color:var(--bc-card-border,rgba(0,240,255,.9)); box-shadow:0 0 0 3px var(--bc-card-glow,rgba(0,240,255,.25)),0 0 32px var(--bc-card-glow,rgba(0,240,255,.3)),0 8px 24px rgba(0,0,0,.5); background:var(--bc-card-bg); filter:brightness(1.3); }
[data-curriculum="bc"] .vt-en-card.selected .vt-en-text{ color:#fff; text-shadow:0 0 14px var(--bc-card-border,rgba(0,240,255,.6)); }

/* PB card colors */
[data-curriculum="pb"] .vt-en-card{
  filter:none; background:#ffffff;
  border:3px solid var(--pb-card-border,#ff88bb);
  box-shadow:0 5px 0 var(--pb-card-shadow,#ffb0d0),0 8px 20px rgba(255,110,180,.15);
}
[data-curriculum="pb"] .vt-en-card .vt-en-text{ color:#2a1020; text-shadow:none; }
[data-curriculum="pb"] .vt-en-card[data-ci="0"]{ --pb-card-border:#ff6eb4; --pb-card-shadow:#ffb0d8; }
[data-curriculum="pb"] .vt-en-card[data-ci="1"]{ --pb-card-border:#cc88ff; --pb-card-shadow:#ddb8ff; }
[data-curriculum="pb"] .vt-en-card[data-ci="2"]{ --pb-card-border:#44ccff; --pb-card-shadow:#99e8ff; }
[data-curriculum="pb"] .vt-en-card[data-ci="3"]{ --pb-card-border:#ffcc44; --pb-card-shadow:#ffe088; }
[data-curriculum="pb"] .vt-en-card[data-ci="4"]{ --pb-card-border:#44ddaa; --pb-card-shadow:#88eedd; }
[data-curriculum="pb"] .vt-en-card:hover{ transform:translateY(-4px) scale(1.035); box-shadow:0 7px 0 var(--pb-card-shadow,#ffb0d8),0 12px 24px rgba(0,0,0,.12); }
[data-curriculum="pb"] .vt-en-card.selected{ transform:translateY(-2px) scale(1.03); box-shadow:0 0 0 3px var(--pb-card-border,#ff88bb),0 5px 0 var(--pb-card-shadow,#ffb0d0),0 8px 20px rgba(0,0,0,.12); background:#fff8fc; }
[data-curriculum="pb"] .vt-en-card.selected .vt-en-text{ color:var(--pb-card-border,#ff6eb4); }

/* ══════════════════════════════════════════════════════════════
   JAPANESE SLOTS
   ══════════════════════════════════════════════════════════════ */
.vt-jp-slot{
  min-height:64px; height:100%;
  box-sizing:border-box;
  border-radius:18px;
  padding:8px 11px;
  background:linear-gradient(160deg,rgba(255,255,255,.055),rgba(255,255,255,.02));
  border:2px dashed rgba(255,255,255,.18);
  display:grid; grid-template-rows:1fr auto;
  align-content:center; gap:5px;
  cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
  transition:border-color .15s, background .15s, box-shadow .15s, transform .15s;
  position:relative; overflow:hidden;
}
.vt-jp-slot:hover{ border-color:var(--game-primary); }

[data-curriculum="br"] .vt-jp-slot{ background:linear-gradient(160deg,rgba(170,255,34,.06),rgba(0,0,0,.15)); border-color:rgba(170,255,34,.2); }
[data-curriculum="br"] .vt-jp-slot:hover{ border-color:rgba(170,255,34,.55); }
[data-curriculum="br"] .vt-jp-slot.has-pair{ border-color:#22ddff; background:rgba(0,200,220,.08); box-shadow:0 0 0 2px rgba(0,200,220,.18),0 0 16px rgba(0,200,220,.25); }
[data-curriculum="br"] .vt-drop.filled{ color:#22ddff; border-color:rgba(0,200,220,.4); background:rgba(0,200,220,.08); }

[data-curriculum="bc"] .vt-jp-slot{ background:linear-gradient(160deg,rgba(0,240,255,.05),rgba(0,0,0,.25)); border-color:rgba(0,240,255,.18); }
[data-curriculum="bc"] .vt-jp-slot:hover{ border-color:rgba(0,240,255,.5); }
[data-curriculum="bc"] .vt-jp-slot.has-pair{ border-color:#00f0ff; background:rgba(0,240,255,.07); box-shadow:0 0 0 2px rgba(0,240,255,.15),0 0 18px rgba(0,240,255,.2); }
[data-curriculum="bc"] .vt-drop.filled{ color:#00f0ff; border-color:rgba(0,240,255,.4); background:rgba(0,240,255,.07); }

[data-curriculum="pb"] .vt-jp-slot{ background:#ffffff; border:2px dashed rgba(255,110,180,.35); box-shadow:0 3px 12px rgba(255,110,180,.08); }
[data-curriculum="pb"] .vt-jp-slot:hover{ border-color:#ff6eb4; }
[data-curriculum="pb"] .vt-jp-slot.has-pair{ border-style:solid; border-color:#cc88ff; background:#fdf5ff; box-shadow:0 0 0 2px rgba(204,136,255,.2),0 4px 0 #ddb8ff; }
[data-curriculum="pb"] .vt-drop.empty{ border-color:rgba(255,110,180,.2); color:rgba(58,26,46,.25); }
[data-curriculum="pb"] .vt-drop.filled{ color:#aa44cc; border-color:rgba(204,136,255,.5); background:rgba(204,136,255,.1); }
[data-curriculum="pb"] .vt-jp-kanji,
[data-curriculum="pb"] .vt-jp-hira-text{ color:#2a1020; }

.vt-jp-word-wrap{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:2px; min-height:38px;
}
.vt-jp-kanji{
  font-family:var(--game-font-jp); font-weight:900;
  font-size:clamp(18px,2.6vw,24px);
  color:var(--game-ink); line-height:1.1; text-align:center; display:block;
}
.vt-jp-hira-text{
  font-family:var(--game-font-jp); font-size:clamp(15px,2.3vw,20px);
  font-weight:900; color:var(--game-ink); line-height:1.2;
  text-align:center; display:none;
}
body.hira-mode .vt-jp-kanji{ display:none; }
body.hira-mode .vt-jp-hira-text{ display:block; }

.vt-drop{
  min-height:24px; border-radius:9px; padding:3px 8px;
  display:flex; align-items:center; justify-content:center; text-align:center;
  font-family:var(--game-font-body); font-weight:900;
  font-size:clamp(10px,1.6vw,13px); line-height:1.12;
  transition:all .2s ease;
}
.vt-drop.empty{ border:2px dashed rgba(255,255,255,.15); color:rgba(255,255,255,.22); letter-spacing:.06em; }

.vt-jp-slot.has-pair{
  border-style:solid; border-color:var(--game-secondary);
  background:color-mix(in srgb, var(--game-secondary) 9%, rgba(255,255,255,.03));
  box-shadow:0 0 0 2px color-mix(in srgb, var(--game-secondary) 22%, transparent),0 0 18px color-mix(in srgb, var(--game-secondary) 38%, transparent);
  transform:scale(1.015);
}
.vt-drop.filled{
  color:var(--game-secondary);
  border:1.5px solid color-mix(in srgb, var(--game-secondary) 55%, transparent);
  background:color-mix(in srgb, var(--game-secondary) 10%, transparent);
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}

/* ── Result states with punchy animations ── */
.vt-jp-slot.slot-correct{
  border-style:solid; border-color:#22c55e;
  background:rgba(34,197,94,.13);
  box-shadow:0 0 0 3px rgba(34,197,94,.35), 0 0 28px rgba(34,197,94,.5), 0 0 48px rgba(34,197,94,.25);
  animation:vtPop .45s cubic-bezier(.34,1.56,.64,1);
}
.vt-jp-slot.slot-correct .vt-drop{
  color:#22c55e; border-color:rgba(34,197,94,.5); background:rgba(34,197,94,.12);
}
.vt-jp-slot.slot-correct .vt-jp-kanji,
.vt-jp-slot.slot-correct .vt-jp-hira-text{
  color:#22c55e;
  text-shadow:0 0 12px rgba(34,197,94,.7);
}

.vt-jp-slot.slot-wrong{
  border-style:solid; border-color:#ef4444;
  background:rgba(239,68,68,.11);
  box-shadow:0 0 0 3px rgba(239,68,68,.3), 0 0 20px rgba(239,68,68,.4);
  animation:vtShake .5s cubic-bezier(.36,.07,.19,.97);
}
.vt-jp-slot.slot-wrong .vt-drop{
  color:#ef4444; border-color:rgba(239,68,68,.45); background:rgba(239,68,68,.1);
}
.vt-jp-slot.slot-wrong .vt-jp-kanji,
.vt-jp-slot.slot-wrong .vt-jp-hira-text{
  color:#ef4444;
}

@keyframes vtPop{
  0%{ transform:scale(1); }
  30%{ transform:scale(1.12) rotate(-1deg); }
  60%{ transform:scale(0.97) rotate(.5deg); }
  80%{ transform:scale(1.04); }
  100%{ transform:scale(1.015); }
}
@keyframes vtShake{
  0%,100%{ transform:translateX(0) rotate(0); }
  10%{ transform:translateX(-8px) rotate(-1.5deg); }
  25%{ transform:translateX(8px)  rotate(1.5deg); }
  40%{ transform:translateX(-6px) rotate(-1deg); }
  55%{ transform:translateX(6px)  rotate(1deg); }
  70%{ transform:translateX(-4px) rotate(-.5deg); }
  85%{ transform:translateX(3px)  rotate(.5deg); }
}

/* ── pulse overlay on wrong ── */
.vt-wrong-flash{
  position:fixed; inset:0; z-index:9000;
  background:rgba(239,68,68,.14);
  pointer-events:none;
  animation:vtWrongFlash .4s ease-out forwards;
}
@keyframes vtWrongFlash{
  0%{ opacity:1; } 100%{ opacity:0; }
}

/* ══════════════════════════════════════════════════════════════
   BOTTOM BAR
   ══════════════════════════════════════════════════════════════ */
.vt-bottom-bar{
  display:flex; justify-content:center; align-items:center;
  gap:12px; margin-top:18px; flex-wrap:wrap;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  margin-bottom:  env(safe-area-inset-bottom, 0px);
}

.vt-hira-btn{
  font-family:var(--game-font-jp);
  font-size:clamp(11px,2vw,15px); font-weight:900;
  padding:10px 16px; border-radius:999px;
  border:2px solid var(--game-border);
  background:var(--game-surface); color:var(--game-muted);
  cursor:pointer; transition:all .2s; letter-spacing:.03em;
  white-space:nowrap; display:flex; align-items:center; gap:7px;
  touch-action:manipulation;
}
.vt-hira-btn:hover{ border-color:var(--game-primary); color:var(--game-primary); }
body.hira-mode .vt-hira-btn{
  border-color:var(--game-primary);
  background:color-mix(in srgb, var(--game-primary) 12%, var(--game-surface));
  color:var(--game-primary);
  box-shadow:0 0 14px color-mix(in srgb, var(--game-primary) 35%, transparent);
}
.vt-hira-icon{ font-size:1.15em; display:inline-block; transition:transform .3s; }
body.hira-mode .vt-hira-icon{ transform:rotate(180deg); }

.vt-check-btn{
  font-family:var(--game-font-title);
  font-size:clamp(15px,3vw,23px); letter-spacing:.07em;
  padding:13px 42px; border:none; border-radius:999px;
  cursor:pointer; position:relative; overflow:hidden;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:0 0 26px color-mix(in srgb, var(--game-primary) 50%, transparent),0 4px 0 color-mix(in srgb, var(--game-primary) 40%, #000),0 8px 20px rgba(0,0,0,.3);
  transition:transform .15s, opacity .2s, box-shadow .15s;
  touch-action:manipulation;
}
.vt-check-btn::after{
  content:''; position:absolute; top:-50%; left:-80%;
  width:48%; height:200%;
  background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.3) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .5s ease; pointer-events:none;
}
.vt-check-btn:hover::after{ left:150%; }
.vt-check-btn:hover{ transform:translateY(-3px) scale(1.04); }
.vt-check-btn:active{ transform:scale(.96); box-shadow:none; }
/* Hard visual lock during grading */
.vt-check-btn:disabled,
.vt-check-btn.grading{
  opacity:.3; pointer-events:none; box-shadow:none; cursor:not-allowed;
}

.vt-help-btn{
  width:44px; height:44px; border-radius:50%;
  border:2px solid var(--game-border); background:var(--game-surface); color:var(--game-muted);
  font-size:1.2rem; font-weight:900; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .2s; flex-shrink:0; touch-action:manipulation;
}
.vt-help-btn:hover{ border-color:var(--game-primary); color:var(--game-primary); box-shadow:0 0 14px color-mix(in srgb, var(--game-primary) 40%, transparent); transform:scale(1.08); }

/* ══════════════════════════════════════════════════════════════
   CLOSE BUTTON
   ══════════════════════════════════════════════════════════════ */
.game-close{
  position:fixed; top:1rem; right:1rem; z-index:50;
  width:44px; height:44px; border-radius:50%;
  background:rgba(255,255,255,.1); border:2px solid rgba(255,255,255,.22);
  color:#fff; font-size:1.2rem;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; backdrop-filter:blur(10px);
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
  line-height:1; text-decoration:none; font-weight:900;
  box-shadow:0 4px 16px rgba(0,0,0,.25); touch-action:manipulation;
}
.game-close:hover{ background:rgba(239,68,68,.55); border-color:rgba(239,68,68,.7); transform:scale(1.15) rotate(10deg); color:#fff; }
[data-curriculum="pb"] .game-close{ background:#fff; border:3px solid var(--game-primary); color:var(--game-primary); box-shadow:0 4px 0 #ffb0d8; }
[data-curriculum="pb"] .game-close:hover{ background:#fff0f8; transform:rotate(14deg) scale(1.15); }
[data-curriculum="bc"] .game-close{ border-color:rgba(0,240,255,.22); }
[data-curriculum="bc"] .game-close:hover{ background:rgba(0,240,255,.14); border-color:var(--game-primary); transform:scale(1.12) rotate(8deg); }

/* ══════════════════════════════════════════════════════════════
   HOW TO PLAY MODAL
   ══════════════════════════════════════════════════════════════ */
.vt-modal-overlay{
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,.72); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  opacity:0; pointer-events:none; transition:opacity .25s;
}
.vt-modal-overlay.open{ opacity:1; pointer-events:all; }
.vt-modal{
  max-width:480px; width:calc(100% - 2rem);
  border-radius:28px; overflow:hidden;
  background:var(--game-bg); border:2px solid var(--game-primary);
  box-shadow:0 0 48px color-mix(in srgb, var(--game-primary) 30%, transparent),0 24px 48px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
.vt-modal-overlay.open .vt-modal{ transform:none; }
[data-curriculum="pb"] .vt-modal{ background:#fff8fc; }
[data-curriculum="bc"] .vt-modal{ background:#030810; }

.vt-modal-header{
  padding:1.2rem 1.4rem .8rem;
  background:linear-gradient(135deg,color-mix(in srgb, var(--game-primary) 14%, transparent),color-mix(in srgb, var(--game-secondary) 8%, transparent));
  border-bottom:1px solid var(--game-border); text-align:center;
}
.vt-modal-title{ font-family:var(--game-font-title); font-size:clamp(20px,4vw,28px); color:var(--game-primary); letter-spacing:.06em; text-shadow:0 0 16px color-mix(in srgb, var(--game-primary) 55%, transparent); }
.vt-modal-title-jp{ font-family:var(--game-font-jp); font-size:clamp(12px,2vw,15px); color:var(--game-muted); margin-top:4px; }
.vt-modal-body{ padding:1.2rem 1.4rem 1.4rem; }
.vt-how-step{ display:grid; grid-template-columns:36px 1fr; gap:10px; align-items:start; margin-bottom:.95rem; }
.vt-how-step:last-child{ margin-bottom:0; }
.vt-how-num{ width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,var(--game-primary),var(--game-secondary)); color:#000; font-family:var(--game-font-title); font-size:clamp(14px,2.5vw,18px); font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.vt-how-text{ padding-top:6px; }
.vt-how-en{ font-family:var(--game-font-body); font-size:clamp(13px,2.2vw,15px); font-weight:800; color:var(--game-ink); line-height:1.35; }
.vt-how-jp{ font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,13px); color:var(--game-muted); margin-top:2px; line-height:1.4; }
.vt-modal-close{ display:block; width:100%; margin-top:1.2rem; font-family:var(--game-font-title); font-size:clamp(15px,2.8vw,19px); letter-spacing:.06em; padding:13px; border-radius:999px; border:none; cursor:pointer; background:linear-gradient(135deg,var(--game-primary),var(--game-secondary)); color:#000; font-weight:900; transition:transform .15s; }
.vt-modal-close:hover{ transform:scale(1.03); }
@keyframes vtResultIn{
  from{ opacity:0; transform:scale(.84) translateY(24px); }
  to{ opacity:1; transform:none; }
}
@keyframes vtScoreCount{ from{ transform:scale(.6); opacity:0; } to{ transform:none; opacity:1; } }
@keyframes vtLabelSlide{ from{ transform:translateY(12px); opacity:0; } to{ transform:none; opacity:1; } }

/* ── confetti ── */
@keyframes vtConfetti{
  0%{ transform:translate(0,0) rotate(0deg) scale(1); opacity:1; }
  100%{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; }
}
.vt-confetti-piece{
  position:fixed; width:9px; height:9px; border-radius:2px;
  pointer-events:none; z-index:9999;
  animation:vtConfetti 1.1s ease-out forwards;
}

/* ── mobile safe touch ── */
@media(max-width:480px){
  .vt-wrap{ padding:0 .5rem 5rem; }
  .vt-bottom-bar{ gap:8px; flex-wrap:nowrap; }
  .vt-check-btn{ padding:12px 20px; min-width:110px; }
  .vt-hira-btn{ padding:9px 10px; gap:5px; }
  .vt-columns{ gap:8px; }
  .vt-panel{ padding:9px 8px; }
}

/* Hide the text label on the very smallest phones — icon alone is enough */
@media(max-width:360px){
  #vt-hira-label{ display:none; }
  .vt-hira-btn{ padding:9px 12px; }
}

/* ══════════════════════════════════════════════════════════════
   PALETTE POP (2026-11-12): every English card carries a colour from
   the world's palette (--pal-1..12 in game-skin.css). The cream card
   stays; the colour rings it and sits under it, and a selected card
   fills with it. A pair carries its colour to the Japanese slot until
   Check, when correct-green / wrong-orange take over as always.
   ══════════════════════════════════════════════════════════════ */
html[data-skin="v2"][data-curriculum] .vt-en-card.vt-pal[data-ci]{
  box-shadow:inset 0 0 0 3px var(--c),0 5px 0 color-mix(in srgb,var(--c) 62%,#000),0 10px 20px rgba(0,0,0,.28);
  transition:transform .16s cubic-bezier(.34,1.56,.64,1),box-shadow .2s,background-color .2s,opacity .2s;
}
html[data-skin="v2"][data-curriculum] .vt-en-card.vt-pal[data-ci]:hover{ box-shadow:inset 0 0 0 3px var(--c),0 9px 0 color-mix(in srgb,var(--c) 62%,#000),0 16px 26px rgba(0,0,0,.3); }
html[data-skin="v2"][data-curriculum] .vt-en-card.vt-pal[data-ci]:active{ box-shadow:inset 0 0 0 3px var(--c),0 2px 0 color-mix(in srgb,var(--c) 62%,#000),0 6px 12px rgba(0,0,0,.25); }
html[data-skin="v2"][data-curriculum] .vt-en-card.vt-pal.selected[data-ci]{
  background:var(--c);
  box-shadow:0 0 0 3px #fff,0 0 28px var(--c),0 9px 0 color-mix(in srgb,var(--c) 55%,#000),0 16px 26px rgba(0,0,0,.32);
}
html[data-skin="v2"][data-curriculum="pb"] .vt-en-card.vt-pal.selected[data-ci]{
  box-shadow:0 0 0 3px #fff,0 0 0 6px color-mix(in srgb,var(--c) 55%,transparent),0 0 24px color-mix(in srgb,var(--c) 60%,transparent),0 9px 0 color-mix(in srgb,var(--c) 55%,#000);
}
html[data-skin="v2"][data-curriculum] .vt-en-card.vt-pal.selected[data-ci] .vt-en-text{ color:var(--c-ink); }
html[data-skin="v2"][data-curriculum] .vt-en-card.vt-pal.selected[data-ci]::after{ border-color:var(--c); }
html[data-skin="v2"][data-curriculum] .vt-jp-slot.has-pair.vt-pp:not(.slot-correct):not(.slot-wrong){
  box-shadow:inset 0 0 0 3px var(--pc),0 0 18px color-mix(in srgb,var(--pc) 55%,transparent),0 5px 0 rgba(0,0,0,.35);
}
html[data-skin="v2"][data-curriculum="pb"] .vt-jp-slot.has-pair.vt-pp:not(.slot-correct):not(.slot-wrong){
  box-shadow:inset 0 0 0 3px var(--pc),0 0 14px color-mix(in srgb,var(--pc) 50%,transparent),0 5px 0 #f0d6a8;
}
html[data-skin="v2"][data-curriculum] .vt-jp-slot.vt-pp:not(.slot-correct):not(.slot-wrong) .vt-drop.filled{ box-shadow:0 3px 0 var(--pc); }
.vt-pop-fx{ position:fixed; left:0; top:0; width:100vw; height:100vh; pointer-events:none; z-index:66; }
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   HTML
   ══════════════════════════════════════════════════════════════ */
U.mount(`
<div class="vt-wrap" id="vt-main-wrap">

  <div class="vt-header">
    <div class="vt-curriculum">${curriculumLabel()}</div>
    <div class="vt-date">${titleDateLabel()}</div>
  </div>

  <div class="vt-dots-row">
    <div class="vt-dot active" id="vt-d0"></div>
    <div class="vt-dot" id="vt-d1"></div>
    <div class="vt-dot" id="vt-d2"></div>
  </div>

  <div class="vt-score-row">
    <div class="vt-score-pill">Score <b id="vt-score">0</b> / 15</div>
  </div>

  <div class="vt-columns" id="vt-game">
    <div class="vt-panel">
      <div class="vt-stack" id="vt-en-bank"></div>
    </div>
    <div class="vt-panel">
      <div class="vt-stack" id="vt-jp-slots"></div>
    </div>
  </div>

  <div class="vt-bottom-bar" id="vt-bottom-bar">
    <button class="vt-hira-btn" id="vt-hira-toggle" title="Toggle hiragana / kanji">
      <span class="vt-hira-icon">あ</span>
      <span id="vt-hira-label">ひらがな</span>
    </button>
    <button class="vt-check-btn" id="vt-check" disabled>CHECK</button>
    <button class="vt-help-btn" id="vt-help" title="How to play">？</button>
  </div>

</div>

<!-- The shared score card (js/game-scorecard.js) presses these two. -->
<div class="vt-actions" hidden>
  <button type="button" id="vt-replay">もう一度</button>
  <button type="button" id="vt-back">メニューへ</button>
</div>

<!-- HOW TO PLAY MODAL -->
<div class="vt-modal-overlay" id="vt-modal-overlay">
  <div class="vt-modal" role="dialog" aria-modal="true">
    <div class="vt-modal-header">
      <div class="vt-modal-title">HOW TO PLAY</div>
      <div class="vt-modal-title-jp">あそびかた</div>
    </div>
    <div class="vt-modal-body">
      <div class="vt-how-step">
        <div class="vt-how-num">1</div>
        <div class="vt-how-text">
          <div class="vt-how-en">Tap an English word on the left — it will play out loud!</div>
          <div class="vt-how-jp">左の英語をタップ → 音が流れるよ！</div>
        </div>
      </div>
      <div class="vt-how-step">
        <div class="vt-how-num">2</div>
        <div class="vt-how-text">
          <div class="vt-how-en">Then tap the matching Japanese word on the right.</div>
          <div class="vt-how-jp">右の日本語と合わせよう。</div>
        </div>
      </div>
      <div class="vt-how-step">
        <div class="vt-how-num">3</div>
        <div class="vt-how-text">
          <div class="vt-how-en">Match all 5 pairs, then press CHECK!</div>
          <div class="vt-how-jp">5つ全部合わせたら「CHECK」を押そう！</div>
        </div>
      </div>
      <div class="vt-how-step">
        <div class="vt-how-num">あ</div>
        <div class="vt-how-text">
          <div class="vt-how-en">Press あ to switch between Kanji and Hiragana.</div>
          <div class="vt-how-jp">「あ」で漢字・ひらがなを切りかえられるよ！</div>
        </div>
      </div>
      <button class="vt-modal-close" id="vt-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>
`);

/* ══════════════════════════════════════════════════════════════
   DOM refs
   ══════════════════════════════════════════════════════════════ */
const scoreEl      = document.getElementById('vt-score');
const enBank       = document.getElementById('vt-en-bank');
const jpSlots      = document.getElementById('vt-jp-slots');
const checkBtn     = document.getElementById('vt-check');
const gameEl       = document.getElementById('vt-game');
const mainWrap     = document.getElementById('vt-main-wrap');
const bottomBar    = document.getElementById('vt-bottom-bar');
const hiraBtn      = document.getElementById('vt-hira-toggle');
const hiraLabel    = document.getElementById('vt-hira-label');
const helpBtn      = document.getElementById('vt-help');
const modalOverlay = document.getElementById('vt-modal-overlay');

/* ══════════════════════════════════════════════════════════════
   PALETTE POP (2026-11-12)
   Colour + spectacle layer. It never changes pairs, grading, scoring or
   timing: the game calls it after each thing has already happened.
     tap(key, btn)   English tap: re-roll that card's colour and pop
     lock(key)       a pair lands: slot takes the colour, thump + clack
     unlock(key)     a pair is undone
     correct(el,key,combo) / wrong(el) / round(n)   the Check reveal
   One fixed canvas that only runs while something is flying; a fixed
   particle pool; tiers from BoohaMotion; at most 3 bright flashes a
   second (shared with flashWrong). Sounds are WebAudio on the shared
   BoohaSFX context, short, and quieter than the word clips.
   ══════════════════════════════════════════════════════════════ */
const POP = (() => {
  const FALLBACK = ['#FFE600','#C6FF1A','#00FFC2','#22DDFF','#7DF9FF','#2E9BFF','#5B5CFF','#A855FF','#D400FF','#F03CFF','#FF2288','#FF7AD9'];
  const colorOf = {};
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const BM = () => window.BoohaMotion || null;
  const reduced = () => { const m = BM(); return !!(m && m.reduced && m.reduced()); };
  const power = () => { const m = BM(); return (m && m.power && m.power()) || 'full'; };
  const light = () => (document.documentElement.dataset.curriculum || CFG.curriculum) === 'pb';

  function palette() {
    const cs = getComputedStyle(document.documentElement), out = [];
    for (let i = 1; i <= 12; i++) { const v = cs.getPropertyValue('--pal-' + i).trim(); if (v) out.push(v); }
    return out.length >= 6 ? out : FALLBACK;
  }
  function inkFor(hex) {
    const h = hex.replace('#', ''); if (h.length !== 6) return '#2b1a05';
    const c = [0, 2, 4].map(i => { const v = parseInt(h.substr(i, 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) > .32 ? '#2b1a05' : '#ffffff';
  }
  function paint(el, key) { if (!el || !colorOf[key]) return; el.style.setProperty('--c', colorOf[key]); el.style.setProperty('--c-ink', inkFor(colorOf[key])); }

  /* ── colours ── */
  function newRound(cards) {
    const p = palette().slice();
    cards.forEach(c => { colorOf[c._key] = p.length ? p.splice(Math.floor(Math.random() * p.length), 1)[0] : pick(palette()); });
    prevOk = null;
  }
  const color = key => colorOf[key] || palette()[0];

  /* ── sound (shared context; silent until a tap has unlocked it) ── */
  let lastTink = 0;
  function ctx() { try { const S = window.BoohaSFX, c = S && S.context && S.context(); return c && c.state === 'running' ? c : null; } catch (_) { return null; } }
  function tone(c, type, f0, f1, t, dur, peak) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .02);
  }
  function noise(c, t, dur, peak, freq, q, type) {
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1; g.gain.value = peak;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
  const SFX = {
    pop() { const c = ctx(); if (!c) return; const t = c.currentTime + .005, f = pick(PENTA);
      tone(c, 'sine', f * .5, f, t, .06, .14); tone(c, 'triangle', f * 2, 0, t + .03, .06, .035); noise(c, t, .02, .08, 5000, 2); },
    lock() { const c = ctx(); if (!c) return; const t = c.currentTime + .005;
      tone(c, 'sine', 150, 52, t, .11, .32); noise(c, t, .018, .16, 2300, 5); noise(c, t + .038, .022, .14, 1600, 5); tone(c, 'square', 78, 0, t + .036, .035, .03); },
    unlock() { const c = ctx(); if (!c) return; const t = c.currentTime + .005; noise(c, t, .02, .1, 1500, 4); tone(c, 'sine', 220, 120, t, .07, .09); },
    sparkle(k) { const c = ctx(); if (!c) return; const t = c.currentTime + .05, b = 3 + Math.min(4, k);
      [0, 1, 2].forEach(i => tone(c, 'sine', PENTA[(b + i) % PENTA.length] * 2, 0, t + i * .035, .045, .035)); },
    tink() { const n = performance.now(); if (n - lastTink < 50) return; lastTink = n; const c = ctx(); if (!c) return; tone(c, 'sine', 2400 + Math.random() * 600, 0, c.currentTime + .003, .03, .03); },
    crunch() { const c = ctx(); if (!c) return; const t = c.currentTime + .005; noise(c, t, .12, .22, 700, .9); noise(c, t + .004, .03, .1, 5200, .7, 'highpass'); tone(c, 'square', 95, 48, t, .12, .04); },
    finale(n) { const c = ctx(); if (!c) return; const t = c.currentTime + .02;
      const notes = n >= 5 ? [523.25, 659.25, 783.99, 1046.5] : n >= 3 ? [523.25, 659.25, 783.99] : n >= 1 ? [523.25] : [];
      notes.forEach((f, i) => tone(c, 'triangle', f, 0, t + i * .045, .22, .07));
      if (n >= 5) noise(c, t + .05, .3, .05, 6000, .6); },
  };

  /* ── canvas, pooled particles ── */
  let cv = null, g = null, W = 0, H = 0, DPR = 1, raf = 0, last = 0;
  const POOL = 360, pool = []; for (let i = 0; i < POOL; i++) pool.push({ on: false });
  let cur = 0, live = 0, prevOk = null, pill = null, pillBumpAt = 0;
  const rings = [], texts = [], bolts = [], cracks = [];
  let tint = null;
  const cap = () => (power() === 'minimal' ? 50 : power() === 'reduced' ? 150 : POOL);
  const mul = () => (power() === 'minimal' ? .3 : power() === 'reduced' ? .55 : 1);
  const flashes = [];
  function canFlash() { const t = performance.now(); while (flashes.length && t - flashes[0] > 1000) flashes.shift(); if (flashes.length >= 3) return false; flashes.push(t); return true; }
  function ensureCanvas() {
    if (cv && cv.isConnected) return true;
    if (!document.body) return false;
    cv = document.createElement('canvas'); cv.className = 'vt-pop-fx'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv); g = cv.getContext('2d'); size(); return !!g;
  }
  function size() {
    if (!cv) return;
    W = innerWidth; H = innerHeight; DPR = Math.min(power() === 'full' ? 2 : 1, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  addEventListener('resize', size);
  const glowCache = new Map();
  function glow(col) {
    if (glowCache.has(col)) return glowCache.get(col);
    const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'), gr = x.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.3, col); gr.addColorStop(1, col + '00');
    x.fillStyle = gr; x.fillRect(0, 0, 48, 48); glowCache.set(col, c); return c;
  }
  function spawn(p) {
    if (reduced() || live >= cap() || !ensureCanvas()) return null;
    for (let n = 0; n < POOL; n++) {
      const o = pool[cur]; cur = (cur + 1) % POOL;
      if (!o.on) { Object.assign(o, { on: true, vx: 0, vy: 0, g: 0, drag: 0, rot: 0, vr: 0, size: 3, life: .5, kind: 'spark', col: '#fff', home: null, delay: 0 }, p); o.max = o.life; live++; wake(); return o; }
    }
    return null;
  }
  const n = k => Math.max(1, Math.round(k * mul()));
  function edge(r) {
    const per = 2 * (r.width + r.height), s = Math.random() * per;
    if (s < r.width) return { x: r.left + s, y: r.top, nx: 0, ny: -1 };
    if (s < r.width + r.height) return { x: r.right, y: r.top + s - r.width, nx: 1, ny: 0 };
    if (s < 2 * r.width + r.height) return { x: r.right - (s - r.width - r.height), y: r.bottom, nx: 0, ny: 1 };
    return { x: r.left, y: r.bottom - (s - 2 * r.width - r.height), nx: -1, ny: 0 };
  }
  function sparks(r, k, col, speed = 1, white = 0) {
    for (let i = 0; i < n(k); i++) { const e = edge(r), sp = rnd(180, 460) * speed;
      spawn({ x: e.x, y: e.y, vx: (e.nx + rnd(-.6, .6)) * sp, vy: (e.ny + rnd(-.6, .6)) * sp - 40, g: 420, drag: 2.2, life: rnd(.22, .45), size: rnd(1.6, 2.8), col: i < white ? '#ffffff' : col }); }
  }
  function gems(r, k, col, home) {
    for (let i = 0; i < n(k); i++) { const e = edge(r);
      spawn({ x: e.x, y: e.y, vx: (e.nx + rnd(-.8, .8)) * rnd(120, 300), vy: -rnd(160, 360), g: 900, drag: 1.2, life: home ? 1.6 : rnd(.5, .8), size: rnd(4, 6.5), rot: rnd(0, 6), vr: rnd(-12, 12), col, kind: 'gem', home, delay: home ? rnd(.16, .3) : 0 }); }
  }
  function debris(r, k) {
    for (let i = 0; i < n(k); i++) { const e = edge(r), pts = [];
      for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2; pts.push([Math.cos(a) * rnd(.5, 1), Math.sin(a) * rnd(.5, 1)]); }
      spawn({ x: e.x, y: e.y, vx: (e.nx + rnd(-.7, .7)) * rnd(80, 260), vy: -rnd(60, 260), g: 1300, drag: .6, life: rnd(.6, .9), size: rnd(4, 9), rot: rnd(0, 6), vr: rnd(-14, 14), col: light() ? '#7a6a72' : pick(['#3a3442', '#4a4552', '#2a2530', '#5b5566']), kind: 'chunk', pts }); }
  }
  function smoke(x, y, k) { for (let i = 0; i < n(k); i++) spawn({ x: x + rnd(-10, 10), y: y + rnd(-6, 6), vx: rnd(-30, 30), vy: rnd(-60, -20), g: -20, drag: 1.5, life: rnd(.45, .75), size: rnd(6, 11), col: light() ? '#b9a9b2' : '#6f6a7a', kind: 'smoke' }); }
  function confetti(x, y, k, spread) { const P = palette();
    for (let i = 0; i < n(k); i++) { const a = rnd(-Math.PI, 0), sp = rnd(220, 620) * spread;
      spawn({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 520, drag: 1.4, life: rnd(.9, 1.5), size: rnd(4, 8), rot: rnd(0, 6), vr: rnd(-16, 16), col: pick(P), kind: 'confetti' }); }
  }
  function ring(r, col, grow = 18, life = .32, width = 3) { if (reduced() || !ensureCanvas()) return; rings.push({ r, col, grow, life, t: 0, width }); wake(); }
  function text(str, x, y, col, sz, life = .7, rise = 46) { if (reduced() || !ensureCanvas()) return; texts.push({ str, x, y, col, size: sz, life, t: 0, rise }); wake(); }
  function bolt(a, b, cols) {
    if (reduced() || power() === 'minimal' || !ensureCanvas()) return;
    const out = Math.max(a.right, b.right) + rnd(14, 22);
    bolts.push({ pts: [{ x: a.right - 2, y: a.top + a.height / 2 }, { x: out, y: a.top + a.height / 2 }, { x: out, y: b.top + b.height / 2 }, { x: b.right - 2, y: b.top + b.height / 2 }], cols, t: 0, life: .3, jag: null, jt: 0 });
    wake();
  }
  function jag(pts, amp) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, st = Math.max(1, Math.round(len / 9));
      for (let s = 0; s < st; s++) { const t = s / st, o = s ? rnd(-amp, amp) : 0; out.push([a.x + dx * t - dy / len * o, a.y + dy * t + dx / len * o]); } }
    const l = pts[pts.length - 1]; out.push([l.x, l.y]); return out;
  }

  /* ── loop: runs only while something is on screen ── */
  function busy() { return live || rings.length || texts.length || bolts.length || cracks.length || tint; }
  function wake() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function frame(t) {
    raf = 0;
    if (!busy()) { if (g) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); } return; }
    raf = requestAnimationFrame(frame);
    if (last && t - last < (power() === 'minimal' ? 31 : 14)) return;
    const dt = Math.min(.05, last ? (t - last) / 1000 : .016); last = t;
    step(dt); draw();
  }
  function step(dt) {
    for (const p of pool) {
      if (!p.on) continue;
      p.life -= dt; if (p.life <= 0) { p.on = false; live--; continue; }
      if (p.home && p.delay <= 0 && pill) {
        const dx = pill.x - p.x, dy = pill.y - p.y, d = Math.hypot(dx, dy) || 1, pull = 2600 + (1.6 - p.life) * 4000;
        p.vx += dx / d * pull * dt; p.vy += dy / d * pull * dt; p.vx *= Math.pow(.02, dt); p.vy *= Math.pow(.02, dt);
        if (d < 18) { p.on = false; live--; SFX.tink(); bumpPill(); continue; }
      } else {
        if (p.home) p.delay -= dt;
        p.vy += p.g * dt; const k = Math.pow(1 / (1 + p.drag), dt); p.vx *= k; p.vy *= k;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.kind === 'smoke') p.size += dt * 16;
      if (p.kind === 'confetti') p.vx += Math.sin(p.rot * 2) * 40 * dt;
    }
    for (const arr of [rings, texts, bolts, cracks]) for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt; if (arr[i].t > arr[i].life) arr.splice(i, 1); }
    if (tint) { tint.t += dt; if (tint.t > tint.life) tint = null; }
  }
  function bumpPill() {
    const el = document.querySelector('.vt-score-pill'), now = performance.now();
    if (!el || !el.animate || now - pillBumpAt < 90) return; pillBumpAt = now;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 150, easing: 'ease-out' });
  }
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  let titleFont = null;
  function draw() {
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
    const add = light() ? 'source-over' : 'lighter';
    if (tint) { g.globalAlpha = .18 * Math.sin(Math.PI * tint.t / tint.life); g.fillStyle = tint.col; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    for (const r of rings) { const q = r.t / r.life, inf = 4 + q * r.grow, b = r.r; g.globalAlpha = 1 - q; g.strokeStyle = r.col; g.lineWidth = r.width * (1 - q) + .5; rr(b.left - inf, b.top - inf, b.width + inf * 2, b.height + inf * 2, 16 + inf); g.stroke(); }
    g.globalAlpha = 1; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const c of cracks) { const q = c.t / c.life; g.globalAlpha = 1 - q * q; g.strokeStyle = light() ? '#3a2a30' : '#f2eee6'; g.lineWidth = 1.6;
      g.beginPath(); let x = c.x, y = c.y; g.moveTo(x, y); const L = c.len * Math.min(1, q * 5) / 3;
      for (const s of c.segs) { x -= (c.nx + s * c.ny) * L; y -= (c.ny + s * c.nx) * L; g.lineTo(x, y); } g.stroke(); }
    g.globalAlpha = 1; g.globalCompositeOperation = add;
    for (const b of bolts) {
      b.jt -= .016; if (!b.jag || b.jt <= 0) { b.jag = jag(b.pts, 5); b.jt = .033; }
      const q = b.t / b.life;
      g.beginPath(); b.jag.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
      g.strokeStyle = b.cols[0]; g.lineWidth = 7; g.globalAlpha = (1 - q) * .35; g.stroke();
      g.globalAlpha = 1 - q; g.strokeStyle = light() ? b.cols[0] : '#ffffff'; g.lineWidth = 2; g.stroke();
    }
    g.globalAlpha = 1;
    for (const p of pool) {
      if (!p.on) continue; const q = Math.max(0, Math.min(1, p.life / p.max));
      if (p.kind === 'spark') { g.globalAlpha = q; g.strokeStyle = p.col; g.lineWidth = p.size; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); g.stroke(); }
      else if (p.kind === 'gem') {
        g.globalAlpha = p.home ? 1 : Math.min(1, q * 2); const s = p.size;
        if (!light() && power() === 'full') g.drawImage(glow(p.col), p.x - s * 2.2, p.y - s * 2.2, s * 4.4, s * 4.4);
        g.save(); g.globalCompositeOperation = 'source-over'; g.translate(p.x, p.y); g.rotate(p.rot);
        g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .7, 0); g.lineTo(0, s); g.lineTo(-s * .7, 0); g.closePath(); g.fillStyle = p.col; g.fill();
        g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .7, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = 'rgba(255,255,255,.65)'; g.fill();
        if (light()) { g.strokeStyle = 'rgba(60,20,40,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .7, 0); g.lineTo(0, s); g.lineTo(-s * .7, 0); g.closePath(); g.stroke(); }
        g.restore();
      }
    }
    g.globalCompositeOperation = 'source-over';
    for (const p of pool) {
      if (!p.on) continue; const q = Math.max(0, Math.min(1, p.life / p.max));
      if (p.kind === 'chunk') { g.globalAlpha = Math.min(1, q * 2); g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.beginPath(); p.pts.forEach(([x, y], i) => i ? g.lineTo(x * p.size, y * p.size) : g.moveTo(x * p.size, y * p.size)); g.closePath(); g.fillStyle = p.col; g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke(); g.restore(); }
      else if (p.kind === 'smoke') { g.globalAlpha = q * .45; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill(); }
      else if (p.kind === 'confetti') { g.globalAlpha = Math.min(1, q * 2); g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.abs(Math.cos(p.rot * 1.5)) + .15); g.fillStyle = p.col; g.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66); g.restore(); }
    }
    g.globalAlpha = 1;
    if (!titleFont) titleFont = (getComputedStyle(document.documentElement).getPropertyValue('--game-font-title') || 'sans-serif').trim();
    for (const tx of texts) {
      const q = tx.t / tx.life, pop = q < .15 ? .6 + q / .15 * .6 : 1.2 - Math.min(.2, (q - .15) * .6), y = tx.y - tx.rise * Math.sqrt(q);
      g.save(); g.translate(tx.x, y); g.scale(pop, pop); g.globalAlpha = q > .7 ? (1 - q) / .3 : 1;
      g.font = `900 ${tx.size}px ${titleFont}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 5; g.strokeStyle = light() ? '#ffffff' : '#0a0612'; g.strokeText(tx.str, 0, 0); g.fillStyle = tx.col; g.fillText(tx.str, 0, 0);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  /* ── events from the game ── */
  return {
    newRound, color, paint, canFlash,
    tap(key, btn) {
      const prev = colorOf[key], p = palette().filter(c => c !== prev);
      colorOf[key] = pick(p.length ? p : palette());
      paint(btn, key);
      SFX.pop();
      if (!btn) return;
      if (btn.animate && !reduced()) btn.animate([{ transform: 'scale(1)' }, { transform: `scale(1.12) rotate(${rnd(-3, 3).toFixed(1)}deg)`, offset: .3 }, { transform: 'scale(.97)', offset: .65 }, { transform: 'scale(1.04)' }], { duration: 260, easing: 'ease-out' });
      const r = btn.getBoundingClientRect(), c = colorOf[key];
      ring(r, c, 16, .3, 3); sparks(r, 18, c, .9, 3); gems(r, 5, c, null);
    },
    lock(slot, key) {
      SFX.lock();
      if (!slot) return;
      if (slot.animate && !reduced()) slot.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(.97)', offset: .45 }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' });
      const r = slot.getBoundingClientRect(), c = color(key);
      ring(r, c, 10, .22, 4); sparks(r, 10, c, .7, 2);
    },
    unlock(slot) {
      SFX.unlock();
      if (!slot) return; const r = slot.getBoundingClientRect(); smoke(r.right - 10, r.top + r.height / 2, 3);
    },
    correct(el, key, combo) {
      const c = color(key), r = el.getBoundingClientRect(), k = Math.max(1, combo || 1);
      const pr = document.querySelector('.vt-score-pill'); if (pr) { const b = pr.getBoundingClientRect(); pill = { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
      SFX.sparkle(k);
      ring(r, c, 22 + Math.min(5, k) * 4, .36, 4); ring(r, '#ffffff', 10, .2, 2);
      sparks(r, 26 + Math.min(5, k) * 6, c, 1 + Math.min(5, k) * .08, 8);
      gems(r, 6 + Math.min(5, k), c, 'pill');
      text('+1', r.right - 34, r.top + 6, c, 30 + Math.min(5, k) * 2);
      if (prevOk && prevOk.isConnected) bolt(prevOk.getBoundingClientRect(), r, [c, '#ffffff']);
      prevOk = el;
    },
    wrong(el) {
      prevOk = null;
      const r = el.getBoundingClientRect();
      SFX.crunch();
      debris(r, 16); smoke(r.left + r.width * .75, r.top + r.height * .5, 7);
      if (!reduced() && ensureCanvas()) { for (let i = 0; i < 4; i++) { const e = edge(r); cracks.push({ x: e.x, y: e.y, nx: e.nx, ny: e.ny, len: rnd(16, 30), t: 0, life: .5, segs: [rnd(-.6, .6), rnd(-.6, .6), rnd(-.6, .6)] }); } wake(); }
    },
    round(score, board) {
      prevOk = null;
      SFX.finale(score);
      if (!board) return;
      const r = board.getBoundingClientRect(), cx = r.left + r.width / 2;
      if (score >= 5) {
        if (!reduced() && canFlash()) { tint = { col: pick(palette()), t: 0, life: .32 }; ensureCanvas() && wake(); }
        confetti(cx, r.top + r.height * .45, 110, 1.15); confetti(r.left + r.width * .2, r.bottom, 40, .9); confetti(r.right - r.width * .2, r.bottom, 40, .9);
        ring(r, pick(palette()), 30, .45, 6); ring(r, '#ffffff', 14, .3, 3);
      } else if (score >= 3) { confetti(cx, r.top + r.height * .5, 50, .9); ring(r, pick(palette()), 18, .35, 4); }
      else if (score >= 1) confetti(cx, r.top + r.height * .5, 16, .6);
      else smoke(cx, r.top + r.height * .5, 10);
    },
  };
})();

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
function openModal()  { modalOverlay.classList.add('open'); }
function closeModal() { modalOverlay.classList.remove('open'); }
helpBtn.addEventListener('click', openModal);
document.getElementById('vt-modal-ok').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
let score         = 0;
let roundIdx      = 0;
let roundCards    = [];
let roundJpOrder  = [];   /* shuffled JP order, separate from EN order */
let missedItems   = [];
let selectedEnKey = null;
let pairs         = {};
let globalLocked  = false;
let isGrading     = false;  /* hard lock during check sequence */

/* ══════════════════════════════════════════════════════════════
   DOTS
   ══════════════════════════════════════════════════════════════ */
function updateDots(ri) {
  [0,1,2].forEach(i => {
    const d = document.getElementById(`vt-d${i}`);
    d.className = 'vt-dot' + (i < ri ? ' done' : i === ri ? ' active' : '');
  });
}

/* ══════════════════════════════════════════════════════════════
   ROUND
   ══════════════════════════════════════════════════════════════ */
function startRound(ri) {
  roundIdx      = ri;
  roundStartedAt = performance.now();
  roundCards    = allCards.slice(ri * 5, ri * 5 + 5);
  /* Shuffle JP slots independently so they're never aligned with EN */
  roundJpOrder  = U.shuffle(roundCards.slice());
  selectedEnKey = null;
  pairs         = {};
  globalLocked  = false;
  isGrading     = false;
  _animatedKeys = new Set();
  POP.newRound(roundCards);   /* Palette Pop: five different palette colours */
  enBank.innerHTML  = '';
  jpSlots.innerHTML = '';
  updateDots(ri);
  checkBtn.classList.remove('grading');
  checkBtn.disabled = true;
  render();
}

/* ══════════════════════════════════════════════════════════════
   RENDER
   ══════════════════════════════════════════════════════════════ */
function render() {
  renderEnBank();
  renderJpSlots();
  const allPaired = Object.keys(pairs).length === roundCards.length;
  checkBtn.disabled = !allPaired || globalLocked || isGrading;
}

let _animatedKeys = new Set();

function renderEnBank() {
  const pairedKeys = new Set(Object.values(pairs));

  roundCards.forEach((card, idx) => {
    const isPaired   = pairedKeys.has(card._key);
    const isSelected = selectedEnKey === card._key;
    const domId      = `vt-en-${card._key.replace(/[^a-zA-Z0-9]/g,'_')}`;

    let btn = document.getElementById(domId);

    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id   = domId;
      btn.setAttribute('data-ci', idx);
      btn.style.setProperty('--i', idx);
      btn.innerHTML = `<div class="vt-card-inner"><div class="vt-en-text">${card.en}</div></div>`;

      btn.addEventListener('touchstart', (e) => {
        if (isGrading || globalLocked || btn.classList.contains('leaving')) return;
        e.preventDefault();
        const curPaired = new Set(Object.values(pairs));
        if (curPaired.has(card._key)) return;
        playWord(card.mp3);
        selectedEnKey = selectedEnKey === card._key ? null : card._key;
        render();
        POP.tap(card._key, btn);   /* Palette Pop: re-roll the colour + pop */
      }, { passive: false });

      btn.addEventListener('click', (e) => {
        if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
        if (isGrading || globalLocked || btn.classList.contains('leaving')) return;
        const curPaired = new Set(Object.values(pairs));
        if (curPaired.has(card._key)) return;
        playWord(card.mp3);
        selectedEnKey = selectedEnKey === card._key ? null : card._key;
        render();
        POP.tap(card._key, btn);   /* Palette Pop: re-roll the colour + pop */
      });

      enBank.appendChild(btn);

      if (!_animatedKeys.has(card._key)) {
        _animatedKeys.add(card._key);
        btn.classList.add('animating');
        const dur = 380 + idx * 60 + 50;
        setTimeout(() => btn.classList.remove('animating'), dur);
      }
    }

    btn.className = 'vt-en-card vt-pal'
      + (isSelected ? ' selected' : '')
      + (isPaired   ? ' leaving'  : '');
    POP.paint(btn, card._key);
  });
}

function renderJpSlots() {
  jpSlots.innerHTML = '';

  /* Render in shuffled JP order */
  roundJpOrder.forEach(card => {
    const pairedEnKey = pairs[card._key] ?? null;
    const pairedCard  = pairedEnKey ? roundCards.find(c => c._key === pairedEnKey) : null;

    const slot = document.createElement('button');
    slot.type = 'button';
    slot.dataset.key = card._key;
    slot.className = 'vt-jp-slot' + (pairedCard ? ' has-pair vt-pp' : '');
    if (pairedCard) slot.style.setProperty('--pc', POP.color(pairedEnKey));   /* the colour travels with the word */
    slot.innerHTML = `
      <div class="vt-jp-word-wrap">
        <span class="vt-jp-kanji">${card.jp}</span>
        <span class="vt-jp-hira-text">${card.hira || card.jp}</span>
      </div>
      <div class="vt-drop${pairedCard ? ' filled' : ' empty'}">
        ${pairedCard ? pairedCard.en : ''}
      </div>`;

    slot.addEventListener('click', () => {
      if (isGrading || globalLocked) return;

      if (!selectedEnKey && pairedCard) {
        delete pairs[card._key];
        render();
        POP.unlock(jpSlots.querySelector(`[data-key="${card._key}"]`));
        return;
      }
      if (selectedEnKey) {
        for (const [jk, ek] of Object.entries(pairs)) {
          if (ek === selectedEnKey) { delete pairs[jk]; break; }
        }
        const lockedKey = selectedEnKey;
        pairs[card._key] = selectedEnKey;
        selectedEnKey = null;
        render();
        POP.lock(jpSlots.querySelector(`[data-key="${card._key}"]`), lockedKey);   /* thump + clack */
      }
    });

    jpSlots.appendChild(slot);
  });
}

/* ══════════════════════════════════════════════════════════════
   FX helpers
   ══════════════════════════════════════════════════════════════ */


function flashWrong() {
  if (!POP.canFlash()) return;   // at most 3 bright flashes a second, shared with Palette Pop
  const div = document.createElement('div');
  div.className = 'vt-wrong-flash';
  document.body.appendChild(div);
  div.addEventListener('animationend', () => div.remove());
}

/* ══════════════════════════════════════════════════════════════
   CHECK — one-by-one grading with breathing room
   ══════════════════════════════════════════════════════════════ */


async function gradeRound() {
  if (isGrading) return;
  isGrading     = true;
  const checkedAt = performance.now();
  globalLocked  = true;
  checkBtn.disabled = true;
  checkBtn.classList.add('grading');
  stopWord();

  /* We need to find each JP slot element by the card's key.
     Slots are rendered in roundJpOrder, so we iterate that. */
  const slotEls = [...jpSlots.querySelectorAll('.vt-jp-slot')];
  let roundScore = 0;
  let dingStep = 0;

  for (let i = 0; i < slotEls.length; i++) {
    const el     = slotEls[i];
    const jpCard = roundJpOrder[i];
    const correct = pairs[jpCard._key] === jpCard._key;

    el.classList.remove('slot-correct', 'slot-wrong');
    void el.offsetWidth; /* force reflow */

    if (correct) {
      el.classList.add('slot-correct');
      run.ready(ROUND_PAR_MS, { at: roundStartedAt, minMs: 2000 });
      // Combo sparks come from the slot being graded, not the Check button.
      window.__brunTap = { el, t: performance.now() };
      const hit = run.hit(checkedAt) || {};
      // The match lights like a connected rune; it climbs with the streak.
      U.impact({ source: el, outcome: 'hit', combo: hit.combo || 1, sharp: !!hit.sharp, flavor: 'match', squash: false });
      POP.correct(el, pairs[jpCard._key], hit.combo || 1);   // Palette Pop: burst, +1, gems to the score, chain
      /* Pass 2: quick cascade; each correct answer in a row dings a step higher */
      U.playSFX('ding', { rate: Math.min(1.5, 1 + dingStep * 0.06) });
      dingStep++;
      roundScore++;
      await new Promise(r => setTimeout(r, REVEAL_OK_MS));
    } else {
      el.classList.add('slot-wrong');
      run.ready(ROUND_PAR_MS, { at: roundStartedAt, minMs: 2000 });
      window.__brunTap = { el, t: performance.now() };
      run.miss();
      U.impact({ source: el, outcome: 'miss', flavor: 'match', squash: false });   // a dusty poof
      POP.wrong(el);   // Palette Pop: crunch, debris, smoke, cracks (never gems or colour)
      if (jpCard && !missedItems.some(item => item.jp === jpCard.jp)) missedItems.push(jpCard);
      U.playSFX('fart');
       
      flashWrong();
      dingStep = 0;
      await new Promise(r => setTimeout(r, REVEAL_MISS_MS));
    }
  }

  // One finisher for the whole round, sized by how many were right (none
  // for 0), inside the existing end-of-round pause.
  POP.round(roundScore, jpSlots);   // Palette Pop: palette firework on 5/5
  U.impactRound(jpSlots, roundScore, slotEls.length);
  score += roundScore;
  scoreEl.textContent = String(score);

  await new Promise(r => setTimeout(r, REVEAL_END_MS));

  isGrading    = false;
  globalLocked = false;
  checkBtn.classList.remove('grading');

  if (roundIdx < 2) {
    startRound(roundIdx + 1);
  } else {
    showResults();
  }
}

/* Single-tap guard on check button */
checkBtn.addEventListener('click', () => {
  if (checkBtn.disabled || isGrading || globalLocked) return;
  gradeRound();
});

/* ══════════════════════════════════════════════════════════════
   CONFETTI
   ══════════════════════════════════════════════════════════════ */
function fireConfetti() {
  const colors = ['#ffcc00','#aaff22','#ff2288','#22ddff','#cc88ff','#ff6600','#ffffff'];
  const vv = window.visualViewport || window;
  const cx = (vv.width  ?? vv.innerWidth)  / 2;
  const cy = (vv.height ?? vv.innerHeight) / 2;

   
  for (let i = 0; i < 70; i++) {
    const el    = document.createElement('div');
    el.className = 'vt-confetti-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist  = 100 + Math.random() * 300;
    el.style.cssText = `
      left:${cx}px;top:${cy}px;
      background:${colors[i % colors.length]};
      --cx:${Math.cos(angle)*dist}px;
      --cy:${Math.sin(angle)*dist}px;
      --cr:${(Math.random()-.5)*720}deg;
      animation-delay:${Math.random()*.25}s;
      animation-duration:${.9+Math.random()*.6}s;
      border-radius:${Math.random()>.5?'50%':'2px'};
      width:${6+Math.random()*8}px;
      height:${6+Math.random()*8}px;
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

function showResults() {
  const runSum = run.summary();   /* Games Pass 4 */
  updateDots(3);
  mainWrap.style.display = 'none';

  const pct  = Math.round((score / 15) * 100);

  /* ── Save score to Booha Adventure save system ─────────────────────────
     Guard with optional chaining so the game never crashes if
     BoohaAdventure isn't mounted yet (e.g. standalone testing).        */
  U.emitGameEnd({
    points: runSum.points, maxCombo: runSum.maxCombo, crown: runSum.fullCombo,
    saveId:    `${CFG.curriculum}:vocab_tap`,
    score:     pct,
    completed: pct >= 40,
  });
  /* ────────────────────────────────────────────────────────────────────── */


  /* Wire up actions */
  const replayBtn = document.getElementById('vt-replay');
  const backBtn   = document.getElementById('vt-back');

  if (replayBtn) replayBtn.addEventListener('click', () => {
    mainWrap.style.display = '';
    /* Re-shuffle everything on replay */
    allCards = buildShuffledDeck();
    score    = 0;
    missedItems = [];
    run.reset();
    scoreEl.textContent = '0';
    document.body.classList.remove('hira-mode');
    hiraMode            = false;
    hiraLabel.textContent = 'ひらがな';
    startRound(0);
  }, { once: true });

  if (backBtn) backBtn.addEventListener('click', () => {
    window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
  }, { once: true });

  if (score === 15) {
    setTimeout(fireConfetti, 400);
    setTimeout(fireConfetti, 900);
  }

  /* Games Pass 3: shared score card (js/game-scorecard.js). It plays the tier
     sound and its buttons press this game's own vt-replay / vt-back. */
  U.showScorecard(Object.assign({
    run:      runSum,
    gameId:   `${CFG.curriculum}:vocab_tap`,
    title:    'Vocabulary Tap',
    correct:  score,
    total:    15,
    pct,
    replayId: 'vt-replay',
    backId:   'vt-back',
  }, {
      stats: [
        { label: 'Correct pairs / せいかい', value: `${score} / 15` },
        { label: 'Review items / ふくしゅう', value: String(missedItems.length) },
      ],
      reviewItems: missedItems,
      audioBase: CFG.audioBase,
    }));
}
/* ══════════════════════════════════════════════════════════════
   GO
   ══════════════════════════════════════════════════════════════ */
startRound(0);

})();
