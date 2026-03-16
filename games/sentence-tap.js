
/* ══════════════════════════════════════════════════════════════
   sentence-tap.js  —  Sentence Tap Match  v3
   Pair all 5 EN → JP sentences, then press Check.
   3 rounds × 5 = 15 points max.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.unlockAudio();

/* ══════════════════════════════════════════════════════════════
   AUDIO — load() only during init; no play() warm-up
   The iOS "unlock all at once" trick was causing every audio
   file to play simultaneously on the first user gesture.
   We avoid it: just call load() for buffering, never play().
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
  try { a.load(); } catch (_) {}
  sentCache[card.mp3] = a;
}

/* ── Audio state ── */
let activeSent = null;

const lastPlayedAt   = {};
const AUDIO_DEBOUNCE = 500;

function stopSent() {
  if (!activeSent) return;
  try { activeSent.pause(); activeSent.currentTime = 0; } catch (_) {}
  activeSent = null;
}

function playSent(mp3) {
  if (!mp3) return;
  const a = sentCache[mp3];
  if (!a) return;
  const now = Date.now();
  if (lastPlayedAt[mp3] && now - lastPlayedAt[mp3] < AUDIO_DEBOUNCE) return;
  lastPlayedAt[mp3] = now;
  stopSent();
  activeSent = a;
  try { a.currentTime = 0; } catch (_) {}
  const p = a.play();
  if (p && p.catch) p.catch(() => {});
}

/* ══════════════════════════════════════════════════════════════
   SENTENCE CASE HELPER
   ══════════════════════════════════════════════════════════════ */
function sentenceCase(str) {
  if (!str) return str;
  const s = str.trim();
  let result = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  if (!/[.!?]$/.test(result)) result += '.';
  return result;
}

/* ══════════════════════════════════════════════════════════════
   DATA — shuffle here AND on every replay
   ══════════════════════════════════════════════════════════════ */
function buildShuffledDeck() {
  return U.shuffle(CFG.cards.slice(0, 15)).map((c, i) => ({
    ...c,
    enDisplay: sentenceCase(c.en),
    _key: String(c.id ?? c.n ?? c.mp3 ?? `${c.en}__${i}`)
  }));
}

let allCards = buildShuffledDeck();

/* ══════════════════════════════════════════════════════════════
   TIERS
   ══════════════════════════════════════════════════════════════ */
const TIERS = [
  {
    min: 0,  max: 5,  sound: 'result_0-5.mp3',
    label: 'TRY AGAIN',
    en:    "Sentences are tough — keep at it!",
    jp:    '文は難しい！あきらめないで！',
    kanji: '文章は難しい！諦めないで！',
    color: '#ef4444',
    actions: [
      { id:'st-replay', label:'もう一度', cls:'st-res-btn game-btn-danger' },
      { id:'st-back',   label:'メニューへ', cls:'st-res-btn game-btn-ghost' },
    ],
  },
  {
    min: 6,  max: 10, sound: 'result_6-10.mp3',
    label: 'KEEP READING',
    en:    "Good effort! Those sentences are sinking in.",
    jp:    'いい感じ！もっと練習しよう！',
    kanji: '良い調子！もっと練習しよう！',
    color: '#f97316',
    actions: [
      { id:'st-replay', label:'もう一度', cls:'st-res-btn game-btn-warning' },
      { id:'st-back',   label:'メニューへ', cls:'st-res-btn game-btn-ghost' },
    ],
  },
  {
    min: 11, max: 14, sound: 'result_11-14.mp3',
    label: 'ALMOST FLUENT',
    en:    "Your Japanese is really flowing now!",
    jp:    'ほぼペラペラ！惜しい！',
    kanji: 'ほぼ流暢！惜しい！',
    color: '#22ddff',
    actions: [
      { id:'st-replay', label:'もう一度', cls:'st-res-btn game-btn-cyan' },
      { id:'st-back',   label:'メニューへ', cls:'st-res-btn game-btn-ghost' },
    ],
  },
  {
    min: 15, max: 15, sound: 'result_15.mp3',
    label: 'FLUENT!',
    en:    "Every sentence matched perfectly!",
    jp:    'ペラペラ！全文正解！すごい！',
    kanji: '流暢！全問正解！',
    color: '#ffcc00',
    actions: [
      { id:'st-replay', label:'もう一度', cls:'st-res-btn game-btn-gold' },
      { id:'st-back',   label:'メニューへ', cls:'st-res-btn game-btn-ghost' },
    ],
  },
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
  const MM = {
    jan:'January', feb:'February', mar:'March',  apr:'April',
    may:'May',     jun:'June',     jul:'July',   aug:'August',
    sep:'September', oct:'October', nov:'November', dec:'December'
  };
  return `${MM[m[1].toLowerCase()]} Week ${m[2]}`;
}

const curriculum = document.documentElement.dataset.curriculum || CFG.curriculum || 'br';

/* ══════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `

.game-header{ display:none !important; }

.st-wrap{
  position:relative; z-index:1;
  max-width:960px; margin:0 auto;
  padding:0 .75rem 6rem;
  box-sizing:border-box;
}

/* ══ HEADER ══ */
.st-header{
  text-align:center;
  padding:.6rem 3rem .8rem;
}
.st-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(24px,5.5vw,52px);
  font-weight:900; letter-spacing:.12em; text-transform:uppercase;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  animation:stRainbow 3s linear infinite;
}
[data-curriculum="bc"] .st-curriculum{
  background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .st-curriculum{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
@keyframes stRainbow{ to{ background-position:220% center; } }

.st-date{
  margin-top:4px; font-family:var(--game-font-body);
  font-size:clamp(11px,2vw,16px); font-weight:800;
  color:var(--game-muted); letter-spacing:.06em;
}
[data-curriculum="pb"] .st-date{ color:rgba(58,26,46,.55); }

/* ══ DOTS ══ */
.st-dots-row{ display:flex; justify-content:center; align-items:center; gap:14px; margin:.65rem 0 .5rem; }
.st-dot{
  width:15px; height:15px; border-radius:50%;
  background:rgba(255,255,255,.12); border:2px solid rgba(255,255,255,.18);
  position:relative; transition:all .3s ease;
}
.st-dot.active{
  background:var(--game-primary); border-color:var(--game-primary);
  box-shadow:0 0 12px var(--game-primary),0 0 28px color-mix(in srgb, var(--game-primary) 45%, transparent);
}
.st-dot.active::after{
  content:''; position:absolute; inset:-6px; border-radius:50%;
  border:2px solid var(--game-primary); opacity:.4;
  animation:stRipple 1.6s ease-out infinite;
}
.st-dot.done{ background:#22c55e; border-color:#22c55e; box-shadow:0 0 12px rgba(34,197,94,.7); }
@keyframes stRipple{ from{ transform:scale(1); opacity:.4; } to{ transform:scale(2.5); opacity:0; } }

/* ══ SCORE PILL ══ */
.st-score-row{ display:flex; justify-content:center; margin-bottom:.65rem; }
.st-score-pill{
  padding:7px 22px; border-radius:999px;
  background:var(--game-pill-bg); border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text); font-size:clamp(13px,2.2vw,16px); font-weight:900;
  letter-spacing:.03em; box-shadow:0 2px 12px rgba(0,0,0,.2);
}
.st-score-pill b{ color:var(--game-primary); font-size:1.1em; text-shadow:0 0 10px var(--game-primary); }
[data-curriculum="pb"] .st-score-pill{ background:#fff; border-color:#ffb0d8; color:#2a1020; box-shadow:0 3px 0 #ffccdd; }
[data-curriculum="pb"] .st-score-pill b{ text-shadow:none; }

/* ══ COLUMNS ══ */
.st-columns{
  display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:start;
}
@media(max-width:600px){ .st-columns{ grid-template-columns:1fr; gap:10px; } }

/* ══ PANEL ══ */
.st-panel{
  border-radius:20px; padding:12px 10px;
  background:var(--game-surface); border:1px solid var(--game-border);
  backdrop-filter:blur(10px); box-shadow:0 8px 32px rgba(0,0,0,.22);
}
[data-curriculum="br"] .st-panel{ background:rgba(255,170,0,.04); border-color:rgba(255,170,0,.14); }
[data-curriculum="bc"] .st-panel{ background:rgba(170,80,255,.04); border-color:rgba(170,80,255,.14); }
.st-stack{ display:grid; grid-template-columns:1fr; gap:10px; }

/* ══════════════════════════════════════════════════════════════
   ENGLISH SENTENCE CARDS
   ══════════════════════════════════════════════════════════════ */
.st-en-card{
  --card-hue:calc(var(--i,0) * 52deg);
  position:relative; overflow:hidden; border-radius:18px;
  padding:10px 12px; min-height:100px;
  background:
    linear-gradient(135deg,
      hsl(from var(--game-primary) h calc(s + 10%) l / 0.22),
      hsl(from var(--game-secondary) h s l / 0.18)),
    linear-gradient(145deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.04) 60%, rgba(0,0,0,.06) 100%);
  border:2px solid rgba(255,255,255,.22);
  box-shadow:0 8px 24px rgba(0,0,0,.32),0 2px 0 rgba(255,255,255,.14) inset,0 -2px 0 rgba(0,0,0,.12) inset;
  cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
  display:flex; align-items:center; text-align:left;
  transition:transform .16s cubic-bezier(.34,1.56,.64,1),box-shadow .16s,border-color .16s,opacity .2s;
  filter:hue-rotate(var(--card-hue));
}
.st-en-card.animating{
  animation:stTileIn .38s ease backwards;
  animation-delay:calc(var(--i,0) * 0.06s);
}
@keyframes stTileIn{ from{ transform:translateY(14px) scale(.95); opacity:0; } to{ transform:none; opacity:1; } }
.st-en-card::before{
  content:''; position:absolute; inset:0;
  background:repeating-linear-gradient(118deg,transparent 0 12px,rgba(255,255,255,.055) 12px 14px);
  pointer-events:none; z-index:0;
}
.st-en-card::after{
  content:''; position:absolute; top:-60%; left:-80%;
  width:50%; height:200%;
  background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.28) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .5s ease; pointer-events:none; z-index:1;
}
.st-en-card:hover::after{ left:150%; }
.st-en-card:hover{ transform:translateY(-4px) scale(1.025); box-shadow:0 14px 32px rgba(0,0,0,.38),0 0 24px color-mix(in srgb, var(--game-primary) 40%, transparent),0 2px 0 rgba(255,255,255,.18) inset; border-color:rgba(255,255,255,.38); }
.st-en-card:active{ transform:scale(.96); }
.st-card-inner{ position:relative; z-index:2; width:100%; }
.st-en-text{
  font-family:var(--game-font-body); font-weight:700;
  font-size:clamp(12px,2vw,16px);
  color:var(--game-tile-text); line-height:1.4;
  display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;
  text-wrap:balance; text-shadow:0 1px 0 rgba(255,255,255,.5);
}
.st-en-card.selected{
  border-color:var(--game-primary);
  background:linear-gradient(135deg,color-mix(in srgb, var(--game-primary) 18%, transparent),color-mix(in srgb, var(--game-secondary) 12%, transparent));
  box-shadow:0 0 0 3px color-mix(in srgb, var(--game-primary) 38%, transparent),0 0 30px color-mix(in srgb, var(--game-primary) 50%, transparent),0 8px 24px rgba(0,0,0,.32);
  transform:translateY(-3px) scale(1.02);
}
.st-en-card.selected .st-en-text{ color:color-mix(in srgb, var(--game-primary) 80%, var(--game-tile-text)); }
.st-en-card.leaving{ opacity:0; transform:translateX(22px) scale(.94); pointer-events:none; transition:opacity .22s, transform .22s; }

/* BR amber card colors */
[data-curriculum="br"] .st-en-card{
  filter:none;
  background:var(--br-card-bg, linear-gradient(145deg,#4a2800,#703800));
  border-color:var(--br-card-border, rgba(255,170,0,.5));
  box-shadow:0 6px 0 var(--br-card-shadow,rgba(0,0,0,.4)),0 10px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.18);
}
[data-curriculum="br"] .st-en-card .st-en-text{ color:#fff; text-shadow:0 1px 3px rgba(0,0,0,.5); }
[data-curriculum="br"] .st-en-card[data-ci="0"]{ --br-card-bg:linear-gradient(145deg,#4a2800,#703800); --br-card-border:rgba(255,170,0,.55); --br-card-shadow:rgba(80,40,0,.6); }
[data-curriculum="br"] .st-en-card[data-ci="1"]{ --br-card-bg:linear-gradient(145deg,#5a0a00,#8a1400); --br-card-border:rgba(255,90,50,.55); --br-card-shadow:rgba(90,10,0,.6); }
[data-curriculum="br"] .st-en-card[data-ci="2"]{ --br-card-bg:linear-gradient(145deg,#3a3000,#5a4a00); --br-card-border:rgba(220,200,0,.5); --br-card-shadow:rgba(50,40,0,.6); }
[data-curriculum="br"] .st-en-card[data-ci="3"]{ --br-card-bg:linear-gradient(145deg,#44200a,#6a3210); --br-card-border:rgba(255,140,60,.5); --br-card-shadow:rgba(60,24,8,.6); }
[data-curriculum="br"] .st-en-card[data-ci="4"]{ --br-card-bg:linear-gradient(145deg,#40100a,#601814); --br-card-border:rgba(255,100,80,.55); --br-card-shadow:rgba(60,10,8,.6); }
[data-curriculum="br"] .st-en-card:hover{ filter:brightness(1.14); transform:translateY(-4px) scale(1.025); }
[data-curriculum="br"] .st-en-card.selected{ filter:brightness(1.18); transform:translateY(-3px) scale(1.03); box-shadow:0 0 0 3px var(--br-card-border,rgba(255,170,0,.5)),0 0 28px var(--br-card-border,rgba(255,170,0,.4)),0 6px 0 var(--br-card-shadow,rgba(0,0,0,.4)); }
[data-curriculum="br"] .st-en-card.selected .st-en-text{ color:#fff; }

/* BC purple card colors */
[data-curriculum="bc"] .st-en-card{
  filter:none;
  background:var(--bc-card-bg, linear-gradient(145deg,#140828,#1e103a));
  border:2px solid var(--bc-card-border, rgba(170,80,255,.45));
  box-shadow:0 0 14px var(--bc-card-glow,rgba(170,80,255,.2)),0 6px 20px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07);
}
[data-curriculum="bc"] .st-en-card .st-en-text{ color:#f5ecff; text-shadow:0 0 10px var(--bc-card-border,rgba(170,80,255,.4)); }
[data-curriculum="bc"] .st-en-card[data-ci="0"]{ --bc-card-bg:linear-gradient(145deg,#140828,#1e103a); --bc-card-border:rgba(170,80,255,.55); --bc-card-glow:rgba(170,80,255,.22); }
[data-curriculum="bc"] .st-en-card[data-ci="1"]{ --bc-card-bg:linear-gradient(145deg,#0a0828,#100e3a); --bc-card-border:rgba(110,80,255,.55); --bc-card-glow:rgba(110,80,255,.22); }
[data-curriculum="bc"] .st-en-card[data-ci="2"]{ --bc-card-bg:linear-gradient(145deg,#280818,#3a0c28); --bc-card-border:rgba(255,60,180,.5); --bc-card-glow:rgba(255,60,180,.2); }
[data-curriculum="bc"] .st-en-card[data-ci="3"]{ --bc-card-bg:linear-gradient(145deg,#080a2a,#0c1040); --bc-card-border:rgba(80,100,255,.55); --bc-card-glow:rgba(80,100,255,.22); }
[data-curriculum="bc"] .st-en-card[data-ci="4"]{ --bc-card-bg:linear-gradient(145deg,#200830,#2e1044); --bc-card-border:rgba(200,100,255,.5); --bc-card-glow:rgba(200,100,255,.2); }
[data-curriculum="bc"] .st-en-card:hover{ transform:translateY(-4px) scale(1.025); box-shadow:0 0 24px var(--bc-card-glow,rgba(170,80,255,.3)),0 10px 28px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.09); border-color:var(--bc-card-border,rgba(170,80,255,.7)); }
[data-curriculum="bc"] .st-en-card.selected{ transform:translateY(-3px) scale(1.03); border-color:var(--bc-card-border,rgba(170,80,255,.9)); box-shadow:0 0 0 3px var(--bc-card-glow,rgba(170,80,255,.25)),0 0 32px var(--bc-card-glow,rgba(170,80,255,.3)),0 8px 24px rgba(0,0,0,.5); background:var(--bc-card-bg); filter:brightness(1.3); }
[data-curriculum="bc"] .st-en-card.selected .st-en-text{ color:#fff; text-shadow:0 0 14px var(--bc-card-border,rgba(170,80,255,.6)); }

/* PB pastel card colors */
[data-curriculum="pb"] .st-en-card{
  filter:none; background:#ffffff;
  border:3px solid var(--pb-card-border,#ff88bb);
  box-shadow:0 5px 0 var(--pb-card-shadow,#ffb0d0),0 8px 20px rgba(255,110,180,.15);
}
[data-curriculum="pb"] .st-en-card .st-en-text{ color:#2a1020; text-shadow:none; }
[data-curriculum="pb"] .st-en-card[data-ci="0"]{ --pb-card-border:#ff6eb4; --pb-card-shadow:#ffb0d8; }
[data-curriculum="pb"] .st-en-card[data-ci="1"]{ --pb-card-border:#cc88ff; --pb-card-shadow:#ddb8ff; }
[data-curriculum="pb"] .st-en-card[data-ci="2"]{ --pb-card-border:#44ccff; --pb-card-shadow:#99e8ff; }
[data-curriculum="pb"] .st-en-card[data-ci="3"]{ --pb-card-border:#ffcc44; --pb-card-shadow:#ffe088; }
[data-curriculum="pb"] .st-en-card[data-ci="4"]{ --pb-card-border:#44ddaa; --pb-card-shadow:#88eedd; }
[data-curriculum="pb"] .st-en-card:hover{ transform:translateY(-4px) scale(1.025); box-shadow:0 7px 0 var(--pb-card-shadow,#ffb0d8),0 12px 24px rgba(0,0,0,.12); }
[data-curriculum="pb"] .st-en-card.selected{ transform:translateY(-2px) scale(1.02); box-shadow:0 0 0 3px var(--pb-card-border,#ff88bb),0 5px 0 var(--pb-card-shadow,#ffb0d0),0 8px 20px rgba(0,0,0,.12); background:#fff8fc; }
[data-curriculum="pb"] .st-en-card.selected .st-en-text{ color:var(--pb-card-border,#ff6eb4); }

/* ══════════════════════════════════════════════════════════════
   JAPANESE SENTENCE SLOTS
   ══════════════════════════════════════════════════════════════ */
.st-jp-slot{
  min-height:100px; border-radius:18px; padding:10px 12px;
  background:linear-gradient(160deg,rgba(255,255,255,.055),rgba(255,255,255,.02));
  border:2px dashed rgba(255,255,255,.18);
  display:grid; grid-template-rows:1fr auto; align-content:center; gap:5px;
  cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
  transition:border-color .15s,background .15s,box-shadow .15s,transform .15s;
  position:relative; overflow:hidden; text-align:left;
}
.st-jp-slot:hover{ border-color:var(--game-primary); }

[data-curriculum="br"] .st-jp-slot{ background:linear-gradient(160deg,rgba(255,170,0,.06),rgba(0,0,0,.15)); border-color:rgba(255,170,0,.2); }
[data-curriculum="br"] .st-jp-slot:hover{ border-color:rgba(255,170,0,.55); }
[data-curriculum="br"] .st-jp-slot.has-pair{ border-color:#ffaa00; background:rgba(255,170,0,.08); box-shadow:0 0 0 2px rgba(255,170,0,.18),0 0 16px rgba(255,170,0,.25); }
[data-curriculum="br"] .st-drop.filled{ color:#ffaa00; border-color:rgba(255,170,0,.4); background:rgba(255,170,0,.08); }

[data-curriculum="bc"] .st-jp-slot{ background:linear-gradient(160deg,rgba(170,80,255,.05),rgba(0,0,0,.25)); border-color:rgba(170,80,255,.18); }
[data-curriculum="bc"] .st-jp-slot:hover{ border-color:rgba(170,80,255,.5); }
[data-curriculum="bc"] .st-jp-slot.has-pair{ border-color:#aa50ff; background:rgba(170,80,255,.07); box-shadow:0 0 0 2px rgba(170,80,255,.15),0 0 18px rgba(170,80,255,.2); }
[data-curriculum="bc"] .st-drop.filled{ color:#aa50ff; border-color:rgba(170,80,255,.4); background:rgba(170,80,255,.07); }

[data-curriculum="pb"] .st-jp-slot{ background:#ffffff; border:2px dashed rgba(68,204,255,.38); box-shadow:0 3px 12px rgba(68,204,255,.1); }
[data-curriculum="pb"] .st-jp-slot:hover{ border-color:#44ccff; }
[data-curriculum="pb"] .st-jp-slot.has-pair{ border-style:solid; border-color:#44ccff; background:#f0fbff; box-shadow:0 0 0 2px rgba(68,204,255,.2),0 4px 0 #99e8ff; }
[data-curriculum="pb"] .st-drop.empty{ border-color:rgba(68,204,255,.22); color:rgba(58,26,46,.28); }
[data-curriculum="pb"] .st-drop.filled{ color:#0088cc; border-color:rgba(68,204,255,.5); background:rgba(68,204,255,.1); }
[data-curriculum="pb"] .st-jp-kanji,
[data-curriculum="pb"] .st-jp-hira-text{ color:#2a1020; }

.st-jp-word-wrap{ display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:3px; min-height:44px; }
.st-jp-kanji{ font-family:var(--game-font-jp); font-weight:900; font-size:clamp(13px,2.1vw,18px); color:var(--game-ink); line-height:1.4; display:block; text-wrap:balance; }
.st-jp-hira-text{ font-family:var(--game-font-jp); font-size:clamp(12px,1.8vw,16px); font-weight:900; color:var(--game-ink); line-height:1.4; display:none; text-wrap:balance; }
body.hira-mode .st-jp-kanji{ display:none; }
body.hira-mode .st-jp-hira-text{ display:block; }

.st-drop{
  min-height:26px; border-radius:9px; padding:3px 9px;
  display:flex; align-items:center;
  font-family:var(--game-font-body); font-weight:700;
  font-size:clamp(10px,1.5vw,13px); line-height:1.25; text-align:left;
  overflow:hidden; transition:all .2s ease;
}
.st-drop.empty{ border:2px dashed rgba(255,255,255,.15); color:rgba(255,255,255,.22); letter-spacing:.06em; font-size:10px; justify-content:center; }

.st-jp-slot.has-pair{
  border-style:solid; border-color:var(--game-secondary);
  background:color-mix(in srgb, var(--game-secondary) 9%, rgba(255,255,255,.03));
  box-shadow:0 0 0 2px color-mix(in srgb, var(--game-secondary) 22%, transparent),0 0 18px color-mix(in srgb, var(--game-secondary) 38%, transparent);
  transform:scale(1.015);
}
.st-drop.filled{
  color:var(--game-secondary);
  border:1.5px solid color-mix(in srgb, var(--game-secondary) 55%, transparent);
  background:color-mix(in srgb, var(--game-secondary) 10%, transparent);
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}

/* ── Result states with punchy animations ── */
.st-jp-slot.slot-correct{
  border-style:solid; border-color:#22c55e;
  background:rgba(34,197,94,.13);
  box-shadow:0 0 0 3px rgba(34,197,94,.35),0 0 28px rgba(34,197,94,.5),0 0 48px rgba(34,197,94,.25);
  animation:stPop .45s cubic-bezier(.34,1.56,.64,1);
}
.st-jp-slot.slot-correct .st-drop{ color:#22c55e; border-color:rgba(34,197,94,.5); background:rgba(34,197,94,.12); }
.st-jp-slot.slot-correct .st-jp-kanji,
.st-jp-slot.slot-correct .st-jp-hira-text{ color:#22c55e; text-shadow:0 0 12px rgba(34,197,94,.7); }

.st-jp-slot.slot-wrong{
  border-style:solid; border-color:#ef4444;
  background:rgba(239,68,68,.11);
  box-shadow:0 0 0 3px rgba(239,68,68,.3),0 0 20px rgba(239,68,68,.4);
  animation:stShake .5s cubic-bezier(.36,.07,.19,.97);
}
.st-jp-slot.slot-wrong .st-drop{ color:#ef4444; border-color:rgba(239,68,68,.45); background:rgba(239,68,68,.1); }
.st-jp-slot.slot-wrong .st-jp-kanji,
.st-jp-slot.slot-wrong .st-jp-hira-text{ color:#ef4444; }

@keyframes stPop{
  0%{ transform:scale(1); }
  30%{ transform:scale(1.1) rotate(-1deg); }
  60%{ transform:scale(.97) rotate(.5deg); }
  80%{ transform:scale(1.04); }
  100%{ transform:scale(1.015); }
}
@keyframes stShake{
  0%,100%{ transform:translateX(0) rotate(0); }
  10%{ transform:translateX(-8px) rotate(-1.5deg); }
  25%{ transform:translateX(8px)  rotate(1.5deg); }
  40%{ transform:translateX(-6px) rotate(-1deg); }
  55%{ transform:translateX(6px)  rotate(1deg); }
  70%{ transform:translateX(-4px) rotate(-.5deg); }
  85%{ transform:translateX(3px)  rotate(.5deg); }
}

  60%{ transform:translate(-50%,-150%) scale(1.3) rotate(var(--rot)); opacity:1; }
  100%{ transform:translate(-50%,-260%) scale(.8) rotate(var(--rot)); opacity:0; }
}

/* wrong flash */
.st-wrong-flash{
  position:fixed; inset:0; z-index:9000;
  background:rgba(239,68,68,.14); pointer-events:none;
  animation:stWrongFlash .4s ease-out forwards;
}
@keyframes stWrongFlash{ 0%{ opacity:1; } 100%{ opacity:0; } }

/* ══ BOTTOM BAR ══ */
.st-bottom-bar{ display:flex; justify-content:center; align-items:center; gap:12px; margin-top:18px; flex-wrap:wrap; }

.st-hira-btn{
  font-family:var(--game-font-jp); font-size:clamp(11px,2vw,15px); font-weight:900;
  padding:10px 16px; border-radius:999px;
  border:2px solid var(--game-border); background:var(--game-surface); color:var(--game-muted);
  cursor:pointer; transition:all .2s; letter-spacing:.03em;
  white-space:nowrap; display:flex; align-items:center; gap:7px; touch-action:manipulation;
}
.st-hira-btn:hover{ border-color:var(--game-primary); color:var(--game-primary); }
body.hira-mode .st-hira-btn{
  border-color:var(--game-primary);
  background:color-mix(in srgb, var(--game-primary) 12%, var(--game-surface));
  color:var(--game-primary);
  box-shadow:0 0 14px color-mix(in srgb, var(--game-primary) 35%, transparent);
}
.st-hira-icon{ font-size:1.15em; display:inline-block; transition:transform .3s; }
body.hira-mode .st-hira-icon{ transform:rotate(180deg); }
[data-curriculum="pb"] .st-hira-btn{ background:#fff; border-color:#cc88ff; color:#aa44cc; box-shadow:0 3px 0 #ddb8ff; }

.st-check-btn{
  font-family:var(--game-font-title); font-size:clamp(15px,3vw,23px); letter-spacing:.07em;
  padding:13px 42px; border:none; border-radius:999px;
  cursor:pointer; position:relative; overflow:hidden;
  background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));
  color:#000; font-weight:900;
  box-shadow:0 0 26px color-mix(in srgb, var(--game-primary) 50%, transparent),0 4px 0 color-mix(in srgb, var(--game-primary) 40%, #000),0 8px 20px rgba(0,0,0,.3);
  transition:transform .15s,opacity .2s,box-shadow .15s; touch-action:manipulation;
}
.st-check-btn::after{
  content:''; position:absolute; top:-50%; left:-80%;
  width:48%; height:200%;
  background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.3) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .5s ease; pointer-events:none;
}
.st-check-btn:hover::after{ left:150%; }
.st-check-btn:hover{ transform:translateY(-3px) scale(1.04); }
.st-check-btn:active{ transform:scale(.96); box-shadow:none; }
.st-check-btn:disabled,
.st-check-btn.grading{ opacity:.3; pointer-events:none; box-shadow:none; cursor:not-allowed; }

.st-help-btn{
  width:44px; height:44px; border-radius:50%;
  border:2px solid var(--game-border); background:var(--game-surface); color:var(--game-muted);
  font-size:1.2rem; font-weight:900; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .2s; flex-shrink:0; touch-action:manipulation;
}
.st-help-btn:hover{ border-color:var(--game-primary); color:var(--game-primary); transform:scale(1.08); }
[data-curriculum="pb"] .st-help-btn{ background:#fff; border-color:#cc88ff; color:#aa44cc; box-shadow:0 3px 0 #ddb8ff; }

/* ══ CLOSE ══ */
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
[data-curriculum="bc"] .game-close{ border-color:rgba(170,80,255,.22); }
[data-curriculum="bc"] .game-close:hover{ background:rgba(170,80,255,.14); border-color:#aa50ff; transform:scale(1.12) rotate(8deg); }

/* ══ MODAL ══ */
.st-modal-overlay{ position:fixed; inset:0; z-index:2000; background:rgba(0,0,0,.72); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity .25s; }
.st-modal-overlay.open{ opacity:1; pointer-events:all; }
.st-modal{ max-width:480px; width:calc(100% - 2rem); border-radius:28px; overflow:hidden; background:var(--game-bg); border:2px solid var(--game-primary); box-shadow:0 0 48px color-mix(in srgb, var(--game-primary) 30%, transparent),0 24px 48px rgba(0,0,0,.5); transform:scale(.88) translateY(16px); transition:transform .3s cubic-bezier(.34,1.56,.64,1); }
.st-modal-overlay.open .st-modal{ transform:none; }
[data-curriculum="pb"] .st-modal{ background:#fff8fc; }
[data-curriculum="bc"] .st-modal{ background:#030810; }
.st-modal-header{ padding:1.2rem 1.4rem .8rem; background:linear-gradient(135deg,color-mix(in srgb, var(--game-primary) 14%, transparent),color-mix(in srgb, var(--game-secondary) 8%, transparent)); border-bottom:1px solid var(--game-border); text-align:center; }
.st-modal-title{ font-family:var(--game-font-title); font-size:clamp(20px,4vw,28px); color:var(--game-primary); letter-spacing:.06em; text-shadow:0 0 16px color-mix(in srgb, var(--game-primary) 55%, transparent); }
[data-curriculum="pb"] .st-modal-title{ text-shadow:none; }
.st-modal-title-jp{ font-family:var(--game-font-jp); font-size:clamp(12px,2vw,15px); color:var(--game-muted); margin-top:4px; }
[data-curriculum="pb"] .st-modal-title-jp{ color:rgba(58,26,46,.55); }
.st-modal-body{ padding:1.2rem 1.4rem 1.4rem; }
.st-how-step{ display:grid; grid-template-columns:36px 1fr; gap:10px; align-items:start; margin-bottom:.95rem; }
.st-how-step:last-child{ margin-bottom:0; }
.st-how-num{ width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,var(--game-primary),var(--game-secondary)); color:#000; font-family:var(--game-font-title); font-size:clamp(14px,2.5vw,18px); font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.st-how-text{ padding-top:6px; }
.st-how-en{ font-family:var(--game-font-body); font-size:clamp(13px,2.2vw,15px); font-weight:800; color:var(--game-ink); line-height:1.35; }
[data-curriculum="pb"] .st-how-en{ color:#2a1020; }
.st-how-jp{ font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,13px); color:var(--game-muted); margin-top:2px; line-height:1.4; }
[data-curriculum="pb"] .st-how-jp{ color:rgba(58,26,46,.55); }
.st-modal-close{ display:block; width:100%; margin-top:1.2rem; font-family:var(--game-font-title); font-size:clamp(15px,2.8vw,19px); letter-spacing:.06em; padding:13px; border-radius:999px; border:none; cursor:pointer; background:linear-gradient(135deg,var(--game-primary),var(--game-secondary)); color:#000; font-weight:900; transition:transform .15s; }
.st-modal-close:hover{ transform:scale(1.03); }

/* ══════════════════════════════════════════════════════════════
   RESULTS — centered with header
   ══════════════════════════════════════════════════════════════ */
.st-results-wrap{
  display:none; flex-direction:column; align-items:center;
  padding:0 .75rem 6rem; box-sizing:border-box; width:100%;
}
.st-results-wrap.show{ display:flex; }

.st-results{
  width:100%; max-width:520px;
  text-align:center; padding:2.4rem 1.4rem 2rem;
  border-radius:32px; position:relative; overflow:hidden;
  border:2.5px solid var(--tier-color,var(--game-primary));
  background:color-mix(in srgb, var(--tier-color,var(--game-primary)) 6%, var(--game-bg));
  box-shadow:0 0 60px color-mix(in srgb, var(--tier-color,var(--game-primary)) 22%, transparent),0 24px 48px rgba(0,0,0,.4);
  animation:stResultIn .5s cubic-bezier(.22,.8,.36,1) both;
}
@keyframes stResultIn{ from{ opacity:0; transform:scale(.84) translateY(24px); } to{ opacity:1; transform:none; } }
.st-results::before{ content:''; position:absolute; top:0; left:0; right:0; height:5px; background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary)); background-size:220% auto; animation:stRainbow 2.4s linear infinite; }
.st-results::after{ content:''; position:absolute; inset:0; z-index:0; pointer-events:none; background:radial-gradient(circle at 20% 80%, color-mix(in srgb, var(--tier-color,var(--game-primary)) 12%, transparent) 0%, transparent 50%),radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--game-secondary) 8%, transparent) 0%, transparent 50%); }
.st-res-inner{ position:relative; z-index:1; }

.st-res-score{ font-family:var(--game-font-title); font-size:clamp(56px,15vw,98px); line-height:1; color:var(--tier-color,var(--game-primary)); text-shadow:0 0 28px var(--tier-color,var(--game-primary)); margin-bottom:4px; animation:stScorePop .5s cubic-bezier(.22,.8,.36,1) .35s both; }
@keyframes stScorePop{ from{ transform:scale(.6); opacity:0; } to{ transform:none; opacity:1; } }
.st-res-pct{ font-size:clamp(13px,2.4vw,18px); color:var(--game-muted); font-weight:700; margin-bottom:10px; }
.st-res-label{ font-family:var(--game-font-title); font-size:clamp(24px,5vw,40px); color:var(--tier-color,var(--game-primary)); margin-bottom:10px; letter-spacing:.05em; text-shadow:0 0 18px color-mix(in srgb, var(--tier-color,var(--game-primary)) 55%, transparent); animation:stLabelSlide .45s ease .5s both; }
@keyframes stLabelSlide{ from{ transform:translateY(12px); opacity:0; } to{ transform:none; opacity:1; } }
.st-res-divider{ width:60px; height:3px; border-radius:99px; background:linear-gradient(90deg,var(--game-primary),var(--game-secondary)); margin:0 auto 12px; opacity:.6; }
.st-res-en{ font-family:var(--game-font-body); font-weight:900; font-size:clamp(13px,2.2vw,17px); color:var(--game-ink); margin-bottom:4px; animation:stLabelSlide .45s ease .6s both; }
.st-res-jp{ font-family:var(--game-font-jp); font-size:clamp(13px,2vw,17px); color:var(--game-muted); margin-bottom:3px; animation:stLabelSlide .45s ease .65s both; }
.st-res-kanji{ font-family:var(--game-font-jp); font-size:clamp(11px,1.7vw,14px); color:var(--game-muted); opacity:.7; margin-bottom:1.4rem; animation:stLabelSlide .45s ease .7s both; }

/* ── Colorful action buttons ── */
.st-res-actions{ display:flex; gap:10px; justify-content:center; flex-wrap:wrap; animation:stLabelSlide .45s ease .8s both; }

.st-res-btn{
  font-family:var(--game-font-title); font-size:clamp(13px,2.4vw,17px);
  font-weight:900; letter-spacing:.05em;
  padding:12px 22px; border-radius:999px; border:none;
  cursor:pointer; display:flex; align-items:center; gap:8px;
  position:relative; overflow:hidden;
  transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s;
  touch-action:manipulation;
}
.st-res-btn:hover{ transform:translateY(-3px) scale(1.06); }
.st-res-btn:active{ transform:scale(.94); }

.st-res-btn.game-btn-danger{ background:linear-gradient(135deg,#ef4444,#ff6060); color:#fff; box-shadow:0 4px 0 #b91c1c,0 0 20px rgba(239,68,68,.45); }
.st-res-btn.game-btn-warning{ background:linear-gradient(135deg,#f97316,#fbbf24); color:#1a0500; box-shadow:0 4px 0 #b45309,0 0 20px rgba(249,115,22,.45); }
.st-res-btn.game-btn-cyan{ background:linear-gradient(135deg,#06b6d4,#22ddff); color:#001418; box-shadow:0 4px 0 #0e7490,0 0 20px rgba(34,221,255,.4); }
.st-res-btn.game-btn-gold{ background:linear-gradient(135deg,#f59e0b,#ffcc00); color:#1a0c00; box-shadow:0 4px 0 #b45309,0 0 24px rgba(255,204,0,.55); }
.st-res-btn.game-btn-ghost{ background:transparent; border:2px solid rgba(255,255,255,.28); color:var(--game-muted); box-shadow:none; }
.st-res-btn.game-btn-ghost:hover{ border-color:rgba(255,255,255,.55); color:var(--game-ink); }
[data-curriculum="pb"] .st-res-btn.game-btn-ghost{ border-color:rgba(58,26,46,.25); color:rgba(58,26,46,.6); }

/* ── confetti ── */
@keyframes stConfetti{ 0%{ transform:translate(0,0) rotate(0deg) scale(1); opacity:1; } 100%{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; } }
.st-confetti-piece{ position:fixed; width:9px; height:9px; border-radius:2px; pointer-events:none; z-index:9999; animation:stConfetti 1.1s ease-out forwards; }

/* ── mobile safe ── */
@media(max-width:480px){
  .st-wrap{ padding:0 .5rem 5rem; }
  .st-check-btn{ padding:12px 32px; }
  .st-hira-btn{ padding:9px 13px; }
  .st-columns{ gap:8px; }
  .st-panel{ padding:9px 8px; }
}
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   HTML
   ══════════════════════════════════════════════════════════════ */
U.mount(`
<div class="st-wrap" id="st-main-wrap">

  <div class="st-header">
    <div class="st-curriculum">${curriculumLabel()}</div>
    <div class="st-date">${titleDateLabel()}</div>
  </div>

  <div class="st-dots-row">
    <div class="st-dot active" id="st-d0"></div>
    <div class="st-dot" id="st-d1"></div>
    <div class="st-dot" id="st-d2"></div>
  </div>

  <div class="st-score-row">
    <div class="st-score-pill">Score <b id="st-score">0</b> / 15</div>
  </div>

  <div class="st-columns" id="st-game">
    <div class="st-panel">
      <div class="st-stack" id="st-en-bank"></div>
    </div>
    <div class="st-panel">
      <div class="st-stack" id="st-jp-slots"></div>
    </div>
  </div>

  <div class="st-bottom-bar" id="st-bottom-bar">
    <button class="st-hira-btn" id="st-hira-toggle" title="Toggle hiragana / kanji">
      <span class="st-hira-icon">あ</span>
      <span id="st-hira-label">ひらがな</span>
    </button>
    <button class="st-check-btn" id="st-check" disabled>CHECK</button>
    <button class="st-help-btn" id="st-help" title="How to play">？</button>
  </div>

</div>

<!-- RESULTS (separate from main wrap) -->
<div class="st-results-wrap" id="st-results-wrap">
  <div class="st-header" style="text-align:center;padding:.6rem 1rem .8rem;width:100%;max-width:520px;">
    <div class="st-curriculum">${curriculumLabel()}</div>
    <div class="st-date">${titleDateLabel()}</div>
  </div>
  <div class="st-results" id="st-results">
    <div class="st-res-inner">
      <div class="st-res-score" id="st-rs"></div>
      <div class="st-res-pct"   id="st-rp"></div>
      <div class="st-res-label" id="st-rl"></div>
      <div class="st-res-divider"></div>
      <div class="st-res-en"    id="st-re"></div>
      <div class="st-res-jp"    id="st-rj"></div>
      <div class="st-res-kanji" id="st-rk"></div>
      <div class="st-res-actions" id="st-res-actions"></div>
    </div>
  </div>
</div>

<!-- HOW TO PLAY MODAL -->
<div class="st-modal-overlay" id="st-modal-overlay">
  <div class="st-modal" role="dialog" aria-modal="true">
    <div class="st-modal-header">
      <div class="st-modal-title">HOW TO PLAY</div>
      <div class="st-modal-title-jp">あそびかた</div>
    </div>
    <div class="st-modal-body">
      <div class="st-how-step">
        <div class="st-how-num">1</div>
        <div class="st-how-text">
          <div class="st-how-en">Tap an English sentence — it will play out loud!</div>
          <div class="st-how-jp">英語の文をタップ → 音が流れるよ！</div>
        </div>
      </div>
      <div class="st-how-step">
        <div class="st-how-num">2</div>
        <div class="st-how-text">
          <div class="st-how-en">Then tap the matching Japanese sentence on the right.</div>
          <div class="st-how-jp">右の日本語の文と合わせよう。</div>
        </div>
      </div>
      <div class="st-how-step">
        <div class="st-how-num">3</div>
        <div class="st-how-text">
          <div class="st-how-en">Match all 5 pairs, then press CHECK!</div>
          <div class="st-how-jp">5つ全部合わせたら「CHECK」を押そう！</div>
        </div>
      </div>
      <div class="st-how-step">
        <div class="st-how-num">あ</div>
        <div class="st-how-text">
          <div class="st-how-en">Press あ to switch between kanji and hiragana.</div>
          <div class="st-how-jp">「あ」で漢字・ひらがなを切りかえられるよ！</div>
        </div>
      </div>
      <button class="st-modal-close" id="st-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>
`);

/* ══════════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════════ */
const scoreEl     = document.getElementById('st-score');
const enBank      = document.getElementById('st-en-bank');
const jpSlots     = document.getElementById('st-jp-slots');
const checkBtn    = document.getElementById('st-check');
const gameEl      = document.getElementById('st-game');
const mainWrap    = document.getElementById('st-main-wrap');
const bottomBar   = document.getElementById('st-bottom-bar');
const resultsWrap = document.getElementById('st-results-wrap');
const resActions  = document.getElementById('st-res-actions');
const hiraBtn     = document.getElementById('st-hira-toggle');
const hiraLabel   = document.getElementById('st-hira-label');
const helpBtn     = document.getElementById('st-help');
const modalOverlay= document.getElementById('st-modal-overlay');

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
document.getElementById('st-modal-ok').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
let score         = 0;
let roundIdx      = 0;
let roundCards    = [];
let roundJpOrder  = [];   /* shuffled independently from EN */
let selectedEnKey = null;
let pairs         = {};
let globalLocked  = false;
let isGrading     = false; /* hard lock during grading sequence */

/* ══════════════════════════════════════════════════════════════
   DOTS
   ══════════════════════════════════════════════════════════════ */
function updateDots(ri) {
  [0,1,2].forEach(i => {
    const d = document.getElementById(`st-d${i}`);
    d.className = 'st-dot' + (i < ri ? ' done' : i === ri ? ' active' : '');
  });
}

/* ══════════════════════════════════════════════════════════════
   ROUND
   ══════════════════════════════════════════════════════════════ */
function startRound(ri) {
  roundIdx     = ri;
  roundCards   = allCards.slice(ri * 5, ri * 5 + 5);
  /* Shuffle JP slots independently — ensure answers aren't aligned */
  roundJpOrder = U.shuffle(roundCards.slice());
  selectedEnKey = null;
  pairs         = {};
  globalLocked  = false;
  isGrading     = false;
  _animatedKeys = new Set();
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
    const domId      = `st-en-${card._key.replace(/[^a-zA-Z0-9]/g,'_')}`;

    let btn = document.getElementById(domId);

    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id   = domId;
      btn.setAttribute('data-ci', idx);
      btn.style.setProperty('--i', idx);
      btn.innerHTML = `<div class="st-card-inner"><div class="st-en-text">${card.enDisplay}</div></div>`;

      btn.addEventListener('touchstart', (e) => {
        if (isGrading || globalLocked || btn.classList.contains('leaving')) return;
        e.preventDefault();
        const curPaired = new Set(Object.values(pairs));
        if (curPaired.has(card._key)) return;
        playSent(card.mp3);
        selectedEnKey = selectedEnKey === card._key ? null : card._key;
        render();
      }, { passive: false });

      btn.addEventListener('click', (e) => {
        if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
        if (isGrading || globalLocked || btn.classList.contains('leaving')) return;
        const curPaired = new Set(Object.values(pairs));
        if (curPaired.has(card._key)) return;
        playSent(card.mp3);
        selectedEnKey = selectedEnKey === card._key ? null : card._key;
        render();
      });

      enBank.appendChild(btn);

      if (!_animatedKeys.has(card._key)) {
        _animatedKeys.add(card._key);
        btn.classList.add('animating');
        const dur = 380 + idx * 60 + 50;
        setTimeout(() => btn.classList.remove('animating'), dur);
      }
    }

    btn.className = 'st-en-card'
      + (isSelected ? ' selected' : '')
      + (isPaired   ? ' leaving'  : '');
  });
}

function renderJpSlots() {
  jpSlots.innerHTML = '';

  roundJpOrder.forEach(card => {
    const pairedEnKey = pairs[card._key] ?? null;
    const pairedCard  = pairedEnKey ? roundCards.find(c => c._key === pairedEnKey) : null;

    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'st-jp-slot' + (pairedCard ? ' has-pair' : '');
    slot.innerHTML = `
      <div class="st-jp-word-wrap">
        <span class="st-jp-kanji">${card.jp}</span>
        <span class="st-jp-hira-text">${card.hira || card.jp}</span>
      </div>
      <div class="st-drop${pairedCard ? ' filled' : ' empty'}">
        ${pairedCard ? pairedCard.enDisplay : 'TAP TO PAIR'}
      </div>`;

    slot.addEventListener('click', () => {
      if (isGrading || globalLocked) return;
      if (!selectedEnKey && pairedCard) {
        delete pairs[card._key];
        render();
        return;
      }
      if (selectedEnKey) {
        for (const [jk, ek] of Object.entries(pairs)) {
          if (ek === selectedEnKey) { delete pairs[jk]; break; }
        }
        pairs[card._key] = selectedEnKey;
        selectedEnKey = null;
        render();
      }
    });

    jpSlots.appendChild(slot);
  });
}

/* ══════════════════════════════════════════════════════════════
   FX helpers
   ══════════════════════════════════════════════════════════════ */


function flashWrong() {
  const div = document.createElement('div');
  div.className = 'st-wrong-flash';
  document.body.appendChild(div);
  div.addEventListener('animationend', () => div.remove());
}

/* ══════════════════════════════════════════════════════════════
   CHECK — one-by-one grading with breathing room between sounds
   ══════════════════════════════════════════════════════════════ */


async function gradeRound() {
  if (isGrading) return;
  isGrading    = true;
  globalLocked = true;
  checkBtn.disabled = true;
  checkBtn.classList.add('grading');
  stopSent();

  const slotEls  = [...jpSlots.querySelectorAll('.st-jp-slot')];
  let roundScore = 0;

  for (let i = 0; i < slotEls.length; i++) {
    const el     = slotEls[i];
    const jpCard = roundJpOrder[i];
    const correct = pairs[jpCard._key] === jpCard._key;

    el.classList.remove('slot-correct', 'slot-wrong');
    void el.offsetWidth; /* force reflow so animation fires each time */

    if (correct) {
      el.classList.add('slot-correct');
      U.playSFX('ding');
      roundScore++;
      await new Promise(r => setTimeout(r, 700));
    } else {
      el.classList.add('slot-wrong');
      U.playSFX('fart');
      flashWrong();
      await new Promise(r => setTimeout(r, 750));
    }
  }

  score += roundScore;
  scoreEl.textContent = String(score);

  await new Promise(r => setTimeout(r, 500));

  isGrading    = false;
  globalLocked = false;
  checkBtn.classList.remove('grading');

  if (roundIdx < 2) {
    startRound(roundIdx + 1);
  } else {
    showResults();
  }
}

checkBtn.addEventListener('click', () => {
  if (checkBtn.disabled || isGrading || globalLocked) return;
  gradeRound();
});

/* ══════════════════════════════════════════════════════════════
   CONFETTI
   ══════════════════════════════════════════════════════════════ */
function fireConfetti() {
  const colors = ['#ffcc00','#aaff22','#ff2288','#22ddff','#cc88ff','#ff6600','#ffffff'];
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < 70; i++) {
    const el    = document.createElement('div');
    el.className = 'st-confetti-piece';
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

/* ══════════════════════════════════════════════════════════════
   DROP-IN REPLACEMENT for showResults() in sentence-tap.js

   REPLACE from `function showResults() {` through the final
   `startRound(0);` and `})();` with this entire block.

   WHAT WAS BROKEN:
   1. BoohaAdventure direct reference → ReferenceError crash.
   2. getElementById('vt-results') — wrong prefix, should be 'st-results'.
      All other IDs (st-rs, st-rp … st-rk) were already correct.
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   RESULTS
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  updateDots(3);
  mainWrap.style.display = 'none';
  resultsWrap.classList.add('show');

  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);

  /* ── Save score to Booha Adventure save system ── */
  document.dispatchEvent(new CustomEvent('booha:gameEnd', {
    detail: {
      saveId:    (window.BoohaAdventure?.registry?.saveId ?? ((c, g) => `${c}__${g}`))(
                   CFG.curriculum, 'sentence_tap'),
      score:     pct,
      completed: score === 15,
    }
  }));

  /* ✅ Fixed: was 'vt-results' (vocab-tap leftover), now 'st-results' */
  const resEl = document.getElementById('st-results');
  resEl.style.setProperty('--tier-color', tier.color);
  document.getElementById('st-rs').textContent = `${score} / 15`;
  document.getElementById('st-rp').textContent = `${pct}%`;
  document.getElementById('st-rl').textContent = tier.label;
  document.getElementById('st-re').textContent = tier.en;
  document.getElementById('st-rj').textContent = tier.jp;
  document.getElementById('st-rk').textContent = tier.kanji;

  /* Build colorful action buttons */
  resActions.innerHTML = '';
  tier.actions.forEach(act => {
    const btn = document.createElement('button');
    btn.id        = act.id;
    btn.className = `st-res-btn ${act.cls}`;
    btn.innerHTML = `<span>${act.label}</span>`;
    resActions.appendChild(btn);
  });

  /* Wire up actions */
  const replayBtn = document.getElementById('st-replay');
  const backBtn   = document.getElementById('st-back');

  if (replayBtn) replayBtn.addEventListener('click', () => {
    resultsWrap.classList.remove('show');
    mainWrap.style.display = '';
    allCards = buildShuffledDeck();
    score    = 0;
    scoreEl.textContent   = '0';
    document.body.classList.remove('hira-mode');
    hiraMode              = false;
    hiraLabel.textContent = 'ひらがな';
    startRound(0);
  });

  if (backBtn) backBtn.addEventListener('click', () => {
    window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
  });

  if (score === 15) {
    setTimeout(fireConfetti, 400);
    setTimeout(fireConfetti, 900);
  }

  const snd = new Audio(CFG.sfxBase + tier.sound);
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

/* ══════════════════════════════════════════════════════════════
   GO
   ══════════════════════════════════════════════════════════════ */
startRound(0);
})();
