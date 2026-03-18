
/* ══════════════════════════════════════════════════════════════
   vocab-tap.js — Vocabulary Tap Match  v3
   Pair all 5 EN → JP, then press Check.
   3 rounds × 5 cards = 15 points max.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.unlockAudio();

/* ══════════════════════════════════════════════════════════════
   AUDIO — load SFX only; word audio is created lazily on demand.
   The iOS "warm-up" trick was causing all clips to auto-play on
   the first gesture. We avoid that by NOT pre-playing every file.
   Instead we decode/load them silently via load() only.
   ══════════════════════════════════════════════════════════════ */
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

  const now = Date.now();
  if (lastPlayedAt[mp3] && now - lastPlayedAt[mp3] < AUDIO_DEBOUNCE) return;
  lastPlayedAt[mp3] = now;

  /* Stop whatever is currently playing */
  stopWord();

  activeWord  = a;
  wordLocked  = true;

  try { a.currentTime = 0; } catch (_) {}

  const p = a.play();
  if (p && p.catch) {
    p.catch(() => { wordLocked = false; });
  }

  /* Re-enable tapping once the clip ends */
  a.onended = () => { wordLocked = false; };
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
   TIERS
   ══════════════════════════════════════════════════════════════ */
const TIERS = [
  {
    min: 0,  max: 5,  sound: 'result_0-5.mp3',
    label: 'TRY AGAIN',
    en:    "Rough start — but you've got this!",
    jp:    'もう一回やってみよう！',
    kanji: 'もう一回挑戦！',
    color: '#ef4444',
    glow:  'rgba(239,68,68,0.4)',
    actions: [
      { id:'vt-replay', label:'もう一度', cls:'game-btn-danger' },
      { id:'vt-back',   label:'メニューへ', cls:'game-btn-ghost' },
    ],
  },
  {
    min: 6,  max: 10, sound: 'result_6-10.mp3',
    label: 'KEEP GOING',
    en:    'Nice effort. You are getting stronger!',
    jp:    'いい感じ！どんどん上手！',
    kanji: '良い調子！どんどん上達！',
    color: '#f97316',
    glow:  'rgba(249,115,22,0.4)',
    actions: [
      { id:'vt-replay', label:'もう一度', cls:'game-btn-warning' },
      { id:'vt-back',   label:'メニューへ', cls:'game-btn-ghost' },
    ],
  },
  {
    min: 11, max: 14, sound: 'result_11-14.mp3',
    label: 'SO CLOSE!',
    en:    'Almost perfect. Really strong work!',
    jp:    'おしい！すごく上手！',
    kanji: '惜しい！とても上手！',
    color: '#22ddff',
    glow:  'rgba(34,221,255,0.4)',
    actions: [
      { id:'vt-replay', label:'もう一度', cls:'game-btn-cyan' },
      { id:'vt-back',   label:'メニューへ', cls:'game-btn-ghost' },
    ],
  },
  {
    min: 15, max: 15, sound: 'result_15.mp3',
    label: 'PERFECT!',
    en:    'Flawless! Every single word matched!',
    jp:    'パーフェクト！全問正解！',
    kanji: '完璧！全問正解！',
    color: '#ffcc00',
    glow:  'rgba(255,204,0,0.5)',
    actions: [
      { id:'vt-replay', label:'もう一度', cls:'game-btn-gold' },
      { id:'vt-back',   label:'メニューへ', cls:'game-btn-ghost' },
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
  gap:clamp(8px, 2vw, 14px);
  align-items:start;
}

@media(max-width:600px){
  .vt-columns{ grid-template-columns:1fr; gap:10px; }
}

/* ── panel ── */
.vt-panel{
  border-radius:20px;
  padding:clamp(8px, 1.5vw, 12px) clamp(7px, 1.2vw, 10px);
  background:var(--game-surface);
  border:1px solid var(--game-border);
  backdrop-filter:blur(10px);
  box-shadow:0 8px 32px rgba(0,0,0,.22);
}
[data-curriculum="br"] .vt-panel{
  background:rgba(170,255,34,.04);
  border-color:rgba(170,255,34,.14);
}
[data-curriculum="bc"] .vt-panel{
  background:rgba(0,240,255,.04);
  border-color:rgba(0,240,255,.14);
}
.vt-stack{ display:grid; grid-template-columns:1fr; gap:clamp(7px, 1.4vw, 10px); }

/* ══════════════════════════════════════════════════════════════
   ENGLISH CARDS
   ══════════════════════════════════════════════════════════════ */
.vt-en-card{
  --card-hue: calc(var(--i,0) * 52deg);
  position:relative; overflow:hidden;
  border-radius:18px;
  padding:10px 12px;
  min-height:72px; height:auto;
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
  min-height:72px; height:auto;
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

  60%{ transform:translate(-50%,-150%) scale(1.3) rotate(var(--rot)); opacity:1; }
  100%{ transform:translate(-50%,-260%) scale(.8) rotate(var(--rot)); opacity:0; }
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

/* ══════════════════════════════════════════════════════════════
   RESULTS — centered with header above
   ══════════════════════════════════════════════════════════════ */
.vt-results-wrap{
  display:none;
  flex-direction:column;
  align-items:center;
  padding:0 .75rem 6rem;
  box-sizing:border-box;
  width:100%;
}
.vt-results-wrap.show{ display:flex; }

.vt-results{
  width:100%;
  max-width:520px;
  text-align:center;
  padding:2.4rem 1.4rem 2rem;
  border-radius:32px;
  position:relative; overflow:hidden;
  border:2.5px solid var(--tier-color,var(--game-primary));
  background:color-mix(in srgb, var(--tier-color,var(--game-primary)) 6%, var(--game-bg));
  box-shadow:0 0 60px color-mix(in srgb, var(--tier-color,var(--game-primary)) 22%, transparent),0 24px 48px rgba(0,0,0,.4);
  animation:vtResultIn .5s cubic-bezier(.22,.8,.36,1) both;
}
@keyframes vtResultIn{
  from{ opacity:0; transform:scale(.84) translateY(24px); }
  to{ opacity:1; transform:none; }
}
.vt-results::before{
  content:''; position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto; animation:vtRainbowShift 2.4s linear infinite;
}
.vt-results::after{
  content:''; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:
    radial-gradient(circle at 20% 80%, color-mix(in srgb, var(--tier-color,var(--game-primary)) 12%, transparent) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--game-secondary) 8%, transparent) 0%, transparent 50%);
}
.vt-res-inner{ position:relative; z-index:1; }

.vt-res-score{
  font-family:var(--game-font-title);
  font-size:clamp(56px,15vw,98px);
  line-height:1; color:var(--tier-color,var(--game-primary));
  text-shadow:0 0 28px var(--tier-color,var(--game-primary));
  margin-bottom:4px;
  animation:vtScoreCount .5s cubic-bezier(.22,.8,.36,1) .35s both;
}
@keyframes vtScoreCount{ from{ transform:scale(.6); opacity:0; } to{ transform:none; opacity:1; } }

.vt-res-pct{ font-size:clamp(13px,2.4vw,18px); color:var(--game-muted); font-weight:700; margin-bottom:10px; }
.vt-res-label{
  font-family:var(--game-font-title);
  font-size:clamp(24px,5vw,40px);
  color:var(--tier-color,var(--game-primary)); margin-bottom:10px; letter-spacing:.05em;
  text-shadow:0 0 18px color-mix(in srgb, var(--tier-color,var(--game-primary)) 55%, transparent);
  animation:vtLabelSlide .45s ease .5s both;
}
@keyframes vtLabelSlide{ from{ transform:translateY(12px); opacity:0; } to{ transform:none; opacity:1; } }

.vt-res-divider{ width:60px; height:3px; border-radius:99px; background:linear-gradient(90deg,var(--game-primary),var(--game-secondary)); margin:0 auto 12px; opacity:.6; }
.vt-res-en{ font-family:var(--game-font-body); font-weight:900; font-size:clamp(13px,2.2vw,17px); color:var(--game-ink); margin-bottom:4px; animation:vtLabelSlide .45s ease .6s both; }
.vt-res-jp{ font-family:var(--game-font-jp); font-size:clamp(13px,2vw,17px); color:var(--game-muted); margin-bottom:3px; animation:vtLabelSlide .45s ease .65s both; }
.vt-res-kanji{ font-family:var(--game-font-jp); font-size:clamp(11px,1.7vw,14px); color:var(--game-muted); opacity:.7; margin-bottom:1.4rem; animation:vtLabelSlide .45s ease .7s both; }

/* ── Colorful action buttons ── */
.vt-res-actions{
  display:flex; gap:10px; justify-content:center; flex-wrap:wrap;
  animation:vtLabelSlide .45s ease .8s both;
}
.vt-res-btn{
  font-family:var(--game-font-title);
  font-size:clamp(13px,2.4vw,17px);
  font-weight:900; letter-spacing:.05em;
  padding:12px 24px; border-radius:999px; border:none;
  cursor:pointer; display:flex; align-items:center; gap:8px;
  position:relative; overflow:hidden;
  transition:transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s;
  touch-action:manipulation;
}
.vt-res-btn:hover{ transform:translateY(-3px) scale(1.06); }
.vt-res-btn:active{ transform:scale(.94); }

/* Replay variants per tier */
.vt-res-btn.game-btn-danger{
  background:linear-gradient(135deg,#ef4444,#ff6060);
  color:#fff;
  box-shadow:0 4px 0 #b91c1c, 0 0 20px rgba(239,68,68,.45);
}
.vt-res-btn.game-btn-warning{
  background:linear-gradient(135deg,#f97316,#fbbf24);
  color:#1a0500;
  box-shadow:0 4px 0 #b45309, 0 0 20px rgba(249,115,22,.45);
}
.vt-res-btn.game-btn-cyan{
  background:linear-gradient(135deg,#06b6d4,#22ddff);
  color:#001418;
  box-shadow:0 4px 0 #0e7490, 0 0 20px rgba(34,221,255,.4);
}
.vt-res-btn.game-btn-gold{
  background:linear-gradient(135deg,#f59e0b,#ffcc00);
  color:#1a0c00;
  box-shadow:0 4px 0 #b45309, 0 0 24px rgba(255,204,0,.55);
}
.vt-res-btn.game-btn-ghost{
  background:transparent;
  border:2px solid rgba(255,255,255,.28);
  color:var(--game-muted);
  box-shadow:none;
}
.vt-res-btn.game-btn-ghost:hover{ border-color:rgba(255,255,255,.55); color:var(--game-ink); }
[data-curriculum="pb"] .vt-res-btn.game-btn-ghost{ border-color:rgba(58,26,46,.25); color:rgba(58,26,46,.6); }

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

<!-- RESULTS (separate from main wrap so centering is independent) -->
<div class="vt-results-wrap" id="vt-results-wrap">
  <div class="vt-header" style="text-align:center;padding:.6rem 1rem .8rem;width:100%;max-width:520px;">
    <div class="vt-curriculum">${curriculumLabel()}</div>
    <div class="vt-date">${titleDateLabel()}</div>
  </div>
  <div class="vt-results" id="vt-results">
    <div class="vt-res-inner">
      <div class="vt-res-score" id="vt-rs"></div>
      <div class="vt-res-pct"   id="vt-rp"></div>
      <div class="vt-res-label" id="vt-rl"></div>
      <div class="vt-res-divider"></div>
      <div class="vt-res-en"    id="vt-re"></div>
      <div class="vt-res-jp"    id="vt-rj"></div>
      <div class="vt-res-kanji" id="vt-rk"></div>
      <div class="vt-res-actions" id="vt-res-actions"></div>
    </div>
  </div>
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
const resultsWrap  = document.getElementById('vt-results-wrap');
const resActions   = document.getElementById('vt-res-actions');
const hiraBtn      = document.getElementById('vt-hira-toggle');
const hiraLabel    = document.getElementById('vt-hira-label');
const helpBtn      = document.getElementById('vt-help');
const modalOverlay = document.getElementById('vt-modal-overlay');

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
  roundCards    = allCards.slice(ri * 5, ri * 5 + 5);
  /* Shuffle JP slots independently so they're never aligned with EN */
  roundJpOrder  = U.shuffle(roundCards.slice());
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
      }, { passive: false });

      btn.addEventListener('click', (e) => {
        if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
        if (isGrading || globalLocked || btn.classList.contains('leaving')) return;
        const curPaired = new Set(Object.values(pairs));
        if (curPaired.has(card._key)) return;
        playWord(card.mp3);
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

    btn.className = 'vt-en-card'
      + (isSelected ? ' selected' : '')
      + (isPaired   ? ' leaving'  : '');
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
    slot.className = 'vt-jp-slot' + (pairedCard ? ' has-pair' : '');
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
  globalLocked  = true;
  checkBtn.disabled = true;
  checkBtn.classList.add('grading');
  stopWord();

  /* We need to find each JP slot element by the card's key.
     Slots are rendered in roundJpOrder, so we iterate that. */
  const slotEls = [...jpSlots.querySelectorAll('.vt-jp-slot')];
  let roundScore = 0;

  for (let i = 0; i < slotEls.length; i++) {
    const el     = slotEls[i];
    const jpCard = roundJpOrder[i];
    const correct = pairs[jpCard._key] === jpCard._key;

    el.classList.remove('slot-correct', 'slot-wrong');
    void el.offsetWidth; /* force reflow */

    if (correct) {
      el.classList.add('slot-correct');
      /* Stagger: play ding, wait a beat, then next */
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

/* ══════════════════════════════════════════════════════════════
   DROP-IN REPLACEMENT for showResults() in vocab-tap.js
   Replace the entire showResults function (from `function showResults() {`
   through its closing `}`) with this block.

   WHAT CHANGED:
   1. BoohaAdventure reference is now safely guarded with optional
      chaining + fallback — no more "Can't find variable: BoohaAdventure"
      crash that was killing the whole function and hiding the results panel.
   2. Fixed resultsWrap selector (was using hard-coded 'vt-results-wrap'
      which is already correct, but the display logic is now explicit).
   3. No other game logic changed.
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  updateDots(3);
  mainWrap.style.display = 'none';
  resultsWrap.classList.add('show');

  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);

  /* ── Save score to Booha Adventure save system ─────────────────────────
     Guard with optional chaining so the game never crashes if
     BoohaAdventure isn't mounted yet (e.g. standalone testing).        */
  document.dispatchEvent(new CustomEvent('booha:gameEnd', {
  detail: {
    saveId:    `${CFG.curriculum}:vocab_tap`,
    score:     pct,
    completed: pct >= 40,
  }
}));
  /* ────────────────────────────────────────────────────────────────────── */

  const resEl = document.getElementById('vt-results');
  resEl.style.setProperty('--tier-color', tier.color);
  document.getElementById('vt-rs').textContent = `${score} / 15`;
  document.getElementById('vt-rp').textContent = `${pct}%`;
  document.getElementById('vt-rl').textContent = tier.label;
  document.getElementById('vt-re').textContent = tier.en;
  document.getElementById('vt-rj').textContent = tier.jp;
  document.getElementById('vt-rk').textContent = tier.kanji;

  /* Build colorful action buttons */
  resActions.innerHTML = '';
  tier.actions.forEach(act => {
    const btn = document.createElement('button');
    btn.id        = act.id;
    btn.className = `vt-res-btn ${act.cls}`;
    btn.innerHTML = `<span>${act.label}</span>`;
    resActions.appendChild(btn);
  });

  /* Wire up actions */
  const replayBtn = document.getElementById('vt-replay');
  const backBtn   = document.getElementById('vt-back');

  if (replayBtn) replayBtn.addEventListener('click', () => {
    resultsWrap.classList.remove('show');
    mainWrap.style.display = '';
    /* Re-shuffle everything on replay */
    allCards = buildShuffledDeck();
    score    = 0;
    scoreEl.textContent = '0';
    document.body.classList.remove('hira-mode');
    hiraMode            = false;
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
