
/* ══════════════════════════════════════════════════════════════
   vocab-tap.js — Vocabulary Tap Match
   Pair all 5 EN → JP, then press Check.
   3 rounds × 5 cards = 15 points max.
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

const wordCache = {};
for (const card of CFG.cards.slice(0, 15)) {
  if (!card.mp3 || wordCache[card.mp3]) continue;
  const a = new Audio(CFG.audioBase + card.mp3);
  a.preload = 'auto';
  a.setAttribute('playsinline', '');
  try { a.load(); } catch {}
  wordCache[card.mp3] = a;
}

let activeWord = null;
let wordLocked = false;

function warmWordAudio() {
  Object.values(wordCache).slice(0, 4).forEach(a => {
    try {
      const wasMuted = a.muted;
      const wasVol = a.volume;
      a.muted = true;
      a.volume = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      setTimeout(() => {
        try {
          a.pause();
          a.currentTime = 0;
          a.muted = wasMuted;
          a.volume = wasVol;
        } catch {}
      }, 20);
    } catch {}
  });
}
warmWordAudio();

function stopWord() {
  if (!activeWord) return;
  try {
    activeWord.pause();
    activeWord.currentTime = 0;
  } catch {}
  activeWord = null;
  wordLocked = false;
}

function playWord(mp3) {
  if (!mp3 || wordLocked) return;
  const a = wordCache[mp3];
  if (!a) return;

  stopWord();
  wordLocked = true;
  activeWord = a;

  try { a.currentTime = 0; } catch {}
  const p = a.play();
  if (p && p.catch) p.catch(() => { wordLocked = false; });

  const unlock = () => { wordLocked = false; };
  a.onended = unlock;
  a.onerror = unlock;
  setTimeout(unlock, 2400);
}

/* ══════════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════════ */
const allCards = U.shuffle(CFG.cards.slice(0, 15)).map((c, i) => ({
  ...c,
  _key: String(c.id ?? c.n ?? c.mp3 ?? `${c.en}__${i}`)
}));

const TIERS = [
  {
    min: 0,  max: 5,  sound: 'result_0-5.mp3',
    label: 'TRY AGAIN',
    en:    "Rough start — but you've got this.",
    jp:    'もう一回やってみよう！',
    kanji: 'もう一回挑戦！',
    color: '#ef4444',
  },
  {
    min: 6,  max: 10, sound: 'result_6-10.mp3',
    label: 'KEEP GOING',
    en:    'Nice effort. You are getting stronger.',
    jp:    'いい感じ！どんどん上手！',
    kanji: '良い調子！どんどん上達！',
    color: '#f97316',
  },
  {
    min: 11, max: 14, sound: 'result_11-14.mp3',
    label: 'SO CLOSE',
    en:    'Almost perfect. Really strong work.',
    jp:    'おしい！すごく上手！',
    kanji: '惜しい！とても上手！',
    color: '#22ddff',
  },
  {
    min: 15, max: 15, sound: 'result_15.mp3',
    label: 'PERFECT',
    en:    'Flawless. Every word matched.',
    jp:    'パーフェクト！全問正解！',
    kanji: '完璧！全問正解！',
    color: '#ffcc00',
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
    may:'May', jun:'June', jul:'July', aug:'August',
    sep:'September', oct:'October', nov:'November', dec:'December'
  };
  return `${monthMap[m[1].toLowerCase()]} Week ${m[2]}`;
}

/* ══════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `

.vt-wrap{
  position:relative; z-index:1;
  max-width:940px; margin:0 auto;
  padding:0 .95rem 5rem;
}

.vt-header{
  text-align:center;
  padding:.25rem 3rem .7rem;
}
.vt-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(12px,2.2vw,16px);
  font-weight:900;
  letter-spacing:.22em;
  text-transform:uppercase;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:vtRainbowShift 3s linear infinite;
}
@keyframes vtRainbowShift{ to{ background-position:220% center; } }

.vt-game-title{
  margin-top:4px;
  font-family:var(--game-font-title);
  font-size:clamp(28px,6vw,46px);
  line-height:1.04;
  color:#fff;
  text-shadow:0 0 18px var(--game-primary), 0 0 36px color-mix(in srgb, var(--game-primary) 45%, transparent);
}
[data-curriculum="pb"] .vt-game-title{
  text-shadow:3px 4px 0 #ffb0d8, 0 0 20px rgba(255,110,180,.35);
}

.vt-date{
  margin-top:6px;
  font-family:var(--game-font-body);
  font-size:clamp(13px,2.4vw,17px);
  font-weight:800;
  color:var(--game-muted);
  letter-spacing:.05em;
}

.vt-dots-row{
  display:flex; justify-content:center; align-items:center; gap:12px;
  margin:.7rem 0 .55rem;
}
.vt-dot{
  width:14px; height:14px; border-radius:50%;
  background:rgba(255,255,255,.15);
  border:2px solid rgba(255,255,255,.2);
  position:relative;
  transition:all .28s ease;
}
.vt-dot.active{
  background:var(--game-primary);
  border-color:var(--game-primary);
  box-shadow:0 0 10px var(--game-primary), 0 0 24px color-mix(in srgb, var(--game-primary) 45%, transparent);
}
.vt-dot.active::after{
  content:'';
  position:absolute; inset:-5px; border-radius:50%;
  border:2px solid var(--game-primary);
  opacity:.45;
  animation:vtRipple 1.5s ease-out infinite;
}
.vt-dot.done{
  background:#22c55e;
  border-color:#22c55e;
  box-shadow:0 0 10px rgba(34,197,94,.6);
}
@keyframes vtRipple{
  from{ transform:scale(1); opacity:.45; }
  to{ transform:scale(2.3); opacity:0; }
}

.vt-score-row{
  display:flex; justify-content:center; align-items:center;
  gap:8px; margin-bottom:.65rem;
}
.vt-score-pill{
  padding:6px 18px; border-radius:999px;
  background:var(--game-pill-bg);
  border:1px solid var(--game-pill-border);
  color:var(--game-pill-text);
  font-size:clamp(13px,2.4vw,16px);
  font-weight:900;
}
.vt-score-pill b{ color:var(--game-primary); }

.vt-instruction{
  text-align:center;
  margin-bottom:1rem;
  font-family:var(--game-font-jp);
  font-size:clamp(13px,2.3vw,16px);
  color:var(--game-muted);
}

.vt-columns{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:16px;
  align-items:start;
}
@media (max-width: 680px){
  .vt-columns{ grid-template-columns:1fr; }
}

.vt-panel{
  border-radius:22px;
  padding:14px;
  background:var(--game-surface);
  border:1px solid var(--game-border);
  backdrop-filter:blur(8px);
}
.vt-panel-label{
  text-align:center;
  margin-bottom:12px;
  font-family:var(--game-font-title);
  font-size:clamp(11px,2vw,14px);
  letter-spacing:.16em;
  text-transform:uppercase;
  color:var(--game-primary);
}

.vt-stack{
  display:grid;
  grid-template-columns:1fr;
  gap:12px;
}

.vt-en-card,
.vt-jp-slot{
  min-height:92px;
  height:92px;
}
@media (max-width: 680px){
  .vt-en-card,
  .vt-jp-slot{
    min-height:86px;
    height:86px;
  }
}

.vt-en-card{
  filter:hue-rotate(calc(var(--i) * 40deg));
  animation:vtTileIn .35s ease backwards;
  position:relative;
  overflow:hidden;
  border-radius:18px;
  padding:12px 14px;
  background:linear-gradient(
  135deg,
  color-mix(in srgb, var(--game-primary) 12%, #fff),
  color-mix(in srgb, var(--game-secondary) 12%, #fff)
);

@keyframes vtTileIn{
  from{ transform:translateY(10px); opacity:.0 }
  to{ transform:none; opacity:1 }
}
  
  border:2px solid var(--game-tile-border);
  box-shadow:0 8px 24px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.16);
  cursor:pointer;
  user-select:none;
  -webkit-tap-highlight-color:transparent;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, border-color .14s, opacity .18s;
}
.vt-en-card::before{
  content:'';
  position:absolute; inset:0;
  background:
    repeating-linear-gradient(
      115deg,
      transparent 0 14px,
      rgba(255,255,255,.06) 14px 16px
    );
  opacity:.9;
  pointer-events:none;
}
.vt-en-card::after{
  content:'';
  position:absolute;
  top:-50%; left:-75%;
  width:44%; height:180%;
  background:linear-gradient(105deg, transparent 30%, rgba(255,255,255,.20) 50%, transparent 70%);
  transform:skewX(-18deg);
  transition:left .48s ease;
  pointer-events:none;
}
.vt-en-card:hover::after{ left:135%; }
.vt-en-card:hover{
  transform:translateY(-3px) scale(1.03);
  box-shadow:
    0 10px 28px rgba(0,0,0,.35),
    0 0 20px color-mix(in srgb, var(--game-primary) 35%, transparent);
}
.vt-en-card:hover{ transform:translateY(-2px) scale(1.02); }
.vt-en-card:active{ transform:scale(.97); }

.vt-card-inner{ position:relative; z-index:2; width:100%; }
.vt-en-text{
  font-family:var(--game-font-body);
  font-weight:900;
  font-size:clamp(17px,2.6vw,23px);
  color:var(--game-tile-text);
  line-height:1.14;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
  text-wrap:balance;
}

.vt-en-card.selected{
  border-color:var(--game-primary);
  background:color-mix(in srgb, var(--game-primary) 9%, var(--game-tile-bg));
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--game-primary) 34%, transparent),
    0 0 24px color-mix(in srgb, var(--game-primary) 44%, transparent),
    0 8px 24px rgba(0,0,0,.3);
  transform:translateY(-2px) scale(1.02);
}
.vt-en-card.selected .vt-en-text{
  color:color-mix(in srgb, var(--game-primary) 68%, var(--game-tile-text));
}

.vt-en-card.leaving{
  opacity:0;
  transform:translateX(18px) scale(.96);
  pointer-events:none;
}

.vt-jp-slot{
  border-radius:18px;
  padding:10px 12px;
  background:var(--game-surface);
  background:linear-gradient(
  160deg,
  rgba(255,255,255,.05),
  rgba(255,255,255,.02)
);
  border:2px dashed var(--game-border);
  display:grid;
  grid-template-rows:auto auto auto;
  align-content:center;
  cursor:pointer;
  user-select:none;
  -webkit-tap-highlight-color:transparent;
  transition:border-color .14s, background .14s, box-shadow .14s, transform .14s;
}



.vt-jp-slot:hover{ border-color:var(--game-primary); }

.vt-jp-text{
  font-family:var(--game-font-jp);
  font-weight:900;
  font-size:clamp(18px,2.7vw,24px);
  line-height:1.15;
  color:var(--game-ink);
  text-align:center;
  display:-webkit-box;
  -webkit-line-clamp:1;
  -webkit-box-orient:vertical;
  overflow:hidden;
}

.vt-jp-word{
  position:relative;
  text-align:center;
  height:28px;
}

.vt-jp-word span{
  position:absolute;
  left:0;
  right:0;
  top:0;
  transition:opacity .35s ease;
}

.vt-jp-word .kanji{
  font-size:clamp(18px,2.7vw,24px);
  opacity:1;
}

.vt-jp-word .hira{
  font-size:clamp(12px,2vw,16px);
  color:var(--game-muted);
  opacity:0;
}

.vt-jp-slot:hover .kanji{
  opacity:0;
}

.vt-jp-slot:hover .hira{
  opacity:1;
}


.vt-jp-hira{
  margin-top:3px;
  font-family:var(--game-font-jp);
  font-size:clamp(11px,1.8vw,14px);
  color:var(--game-muted);
  text-align:center;
  line-height:1.15;
  min-height:1.2em;
  display:-webkit-box;
  -webkit-line-clamp:1;
  -webkit-box-orient:vertical;
  overflow:hidden;
}

.vt-drop{
  margin-top:8px;
  min-height:32px;
  border-radius:10px;
  padding:4px 8px;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  font-family:var(--game-font-body);
  font-weight:900;
  line-height:1.12;
  transition:all .18s ease;
}
.vt-drop.empty{
  border:2px dashed rgba(255,255,255,.18);
  color:rgba(255,255,255,.28);
  font-size:11px;
  letter-spacing:.08em;
}
[data-curriculum="pb"] .vt-drop.empty{
  border-color:rgba(255,110,180,.24);
  color:rgba(58,26,46,.3);
}

.vt-jp-slot.has-pair{
  border-style:solid;
  border-color:var(--game-secondary);
  background:color-mix(in srgb, var(--game-secondary) 8%, var(--game-surface));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--game-secondary) 20%, transparent),
    0 0 16px color-mix(in srgb, var(--game-secondary) 35%, transparent);
  transform:scale(1.01);
}
.vt-drop.filled{
  font-size:clamp(12px,1.9vw,15px);
  color:var(--game-secondary);
  border:2px solid color-mix(in srgb, var(--game-secondary) 55%, transparent);
  background:color-mix(in srgb, var(--game-secondary) 10%, transparent);
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
}

.vt-jp-slot.slot-correct{
  border-style:solid;
  border-color:#22c55e;
  background:rgba(34,197,94,.12);
  box-shadow:0 0 0 3px rgba(34,197,94,.24), 0 0 22px rgba(34,197,94,.34);
  animation:vtGood .25s cubic-bezier(.34,1.56,.64,1);
}
.vt-jp-slot.slot-correct .vt-drop{
  color:#22c55e;
  border-color:rgba(34,197,94,.5);
  background:rgba(34,197,94,.09);
}

.vt-jp-slot.slot-wrong{
  border-style:solid;
  border-color:#ef4444;
  background:rgba(239,68,68,.10);
  box-shadow:0 0 0 3px rgba(239,68,68,.22);
  animation:vtBad .42s ease;
}
.vt-jp-slot.slot-wrong .vt-drop{
  color:#ef4444;
  border-color:rgba(239,68,68,.45);
  background:rgba(239,68,68,.08);
}

@keyframes vtGood{
  from{ transform:scale(.96); }
  to{ transform:scale(1.01); }
}
@keyframes vtBad{
  0%,100%{ transform:translateX(0); }
  20%{ transform:translateX(-6px); }
  40%{ transform:translateX(6px); }
  60%{ transform:translateX(-4px); }
  80%{ transform:translateX(4px); }
}

.vt-check-row{
  display:flex;
  justify-content:center;
  margin-top:20px;
}
.vt-check-btn{
  font-family:var(--game-font-title);
  font-size:clamp(16px,3vw,21px);
  letter-spacing:.06em;
  padding:14px 44px;
  border:none;
  border-radius:999px;
  cursor:pointer;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000;
  box-shadow:0 0 24px color-mix(in srgb, var(--game-primary) 44%, transparent);
  transition:transform .15s, opacity .2s, box-shadow .15s;
}
.vt-check-btn:hover{ transform:translateY(-2px) scale(1.02); }
.vt-check-btn:active{ transform:scale(.96); }
.vt-check-btn:disabled{
  opacity:.28;
  pointer-events:none;
  box-shadow:none;
}

.vt-results{
  display:none;
  text-align:center;
  max-width:560px;
  margin:1.5rem auto;
  padding:2.4rem 1.4rem 2rem;
  border-radius:var(--game-radius);
  border:2px solid var(--tier-color, var(--game-primary));
  background:color-mix(in srgb, var(--tier-color, var(--game-primary)) 6%, var(--game-bg));
  box-shadow:0 0 52px color-mix(in srgb, var(--tier-color, var(--game-primary)) 18%, transparent);
  position:relative;
  overflow:hidden;
}
.vt-results.show{
  display:block;
  animation:vtResultIn .42s cubic-bezier(.22,.8,.36,1) both;
}
@keyframes vtResultIn{
  from{ opacity:0; transform:scale(.90) translateY(18px); }
  to{ opacity:1; transform:none; }
}
.vt-results::before{
  content:'';
  position:absolute;
  top:0; left:0; right:0; height:4px;
  background:linear-gradient(90deg, var(--game-primary), var(--game-secondary), var(--game-accent), var(--game-primary));
  background-size:220% auto;
  animation:vtRainbowShift 2.6s linear infinite;
}
.vt-res-score{
  font-family:var(--game-font-title);
  font-size:clamp(58px,15vw,94px);
  line-height:1;
  color:var(--tier-color, var(--game-primary));
  text-shadow:0 0 24px var(--tier-color, var(--game-primary));
  margin-bottom:4px;
}
.vt-res-pct{
  font-size:clamp(14px,2.8vw,20px);
  color:var(--game-muted);
  font-weight:700;
  margin-bottom:12px;
}
.vt-res-label{
  font-family:var(--game-font-title);
  font-size:clamp(24px,5vw,38px);
  color:var(--tier-color, var(--game-primary));
  margin-bottom:10px;
  letter-spacing:.04em;
}
.vt-res-en{
  font-family:var(--game-font-body);
  font-weight:900;
  font-size:clamp(14px,2.5vw,18px);
  color:var(--game-ink);
  margin-bottom:4px;
}
.vt-res-jp{
  font-family:var(--game-font-jp);
  font-size:clamp(13px,2.3vw,17px);
  color:var(--game-muted);
  margin-bottom:4px;
}
.vt-res-kanji{
  font-family:var(--game-font-jp);
  font-size:clamp(11px,1.9vw,14px);
  color:var(--game-muted);
  opacity:.75;
  margin-bottom:1.35rem;
}
.vt-res-actions{
  display:flex;
  gap:12px;
  justify-content:center;
  flex-wrap:wrap;
}
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   BACKGROUND**removed**
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   HTML
   ══════════════════════════════════════════════════════════════ */
U.mount(`
<div class="vt-wrap">

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

  <div class="vt-check-row">
    <button class="vt-check-btn" id="vt-check" disabled>CHECK</button>
  </div>

  <div class="vt-results" id="vt-results">

    <div class="vt-res-score" id="vt-rs"></div>
    <div class="vt-res-pct" id="vt-rp"></div>
    <div class="vt-res-label" id="vt-rl"></div>

    <div class="vt-res-en" id="vt-re"></div>
    <div class="vt-res-jp" id="vt-rj"></div>
    <div class="vt-res-kanji" id="vt-rk"></div>

    <div class="vt-res-actions">
      <button class="game-btn game-btn-primary" id="vt-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="vt-back">メニューへ</button>
    </div>

  </div>

</div>
`);

/* ══════════════════════════════════════════════════════════════
   DOM
   ══════════════════════════════════════════════════════════════ */
const scoreEl  = document.getElementById('vt-score');
const enBank   = document.getElementById('vt-en-bank');
const jpSlots  = document.getElementById('vt-jp-slots');
const checkBtn = document.getElementById('vt-check');
const gameEl   = document.getElementById('vt-game');
const checkRow = document.querySelector('.vt-check-row');
const instrEl  = document.querySelector('.vt-instruction');
const results  = document.getElementById('vt-results');

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
let score         = 0;
let roundIdx      = 0;
let roundCards    = [];
let selectedEnKey = null;
let pairs         = {};
let globalLocked  = false;

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
  selectedEnKey = null;
  pairs         = {};
  globalLocked  = false;
  updateDots(ri);
  checkBtn.disabled = true;
  render();
}

/* ══════════════════════════════════════════════════════════════
   RENDER
   ══════════════════════════════════════════════════════════════ */
function render() {
  renderEnBank();
  renderJpSlots();
  checkBtn.disabled = Object.keys(pairs).length !== roundCards.length || globalLocked;
}

function renderEnBank() {
  enBank.innerHTML = '';
  const pairedKeys = new Set(Object.values(pairs));

  roundCards.forEach(card => {
    const isPaired   = pairedKeys.has(card._key);
    const isSelected = selectedEnKey === card._key;

    const btn = document.createElement('button');
    btn.style.setProperty('--i', Math.random()); 
    btn.type = 'button';
    btn.className = 'vt-en-card' + (isSelected ? ' selected' : '') + (isPaired ? ' leaving' : '');
    btn.innerHTML = `
      <div class="vt-card-inner">
        <div class="vt-en-text">${card.en}</div>
      </div>
    `;

    btn.addEventListener('click', () => {
      if (globalLocked || isPaired) return;
      playWord(card.mp3);
      selectedEnKey = isSelected ? null : card._key;
      render();
    });

    enBank.appendChild(btn);
  });
}

function renderJpSlots() {
  jpSlots.innerHTML = '';

  roundCards.forEach(card => {
    const pairedEnKey = pairs[card._key] ?? null;
    const pairedCard  = pairedEnKey ? roundCards.find(c => c._key === pairedEnKey) : null;

    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'vt-jp-slot' + (pairedCard ? ' has-pair' : '');
    slot.innerHTML = `
      <div class="vt-jp-word">
        <span class="kanji">${card.jp}</span>
        <span class="hira">${card.hira || ''}</span>
      </div>
      
      <div class="vt-drop ${pairedCard ? ' filled' : ' empty'}">
      ${pairedCard ? pairedCard.en : ''}
      </div>
    `;

    slot.addEventListener('click', () => {
      if (globalLocked) return;

      if (!selectedEnKey && pairedCard) {
        delete pairs[card._key];
        render();
        return;
      }

      if (selectedEnKey) {
        for (const [jk, ek] of Object.entries(pairs)) {
          if (ek === selectedEnKey) delete pairs[jk];
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
   CHECK — one-by-one grading with breathing room
   ══════════════════════════════════════════════════════════════ */
async function gradeRound() {
  globalLocked = true;
  checkBtn.disabled = true;
  stopWord();

  const slotEls = [...jpSlots.querySelectorAll('.vt-jp-slot')];
  let roundScore = 0;

  for (let i = 0; i < slotEls.length; i++) {
    const el = slotEls[i];
    const jpCard = roundCards[i];
    const correct = pairs[jpCard._key] === jpCard._key;

    el.classList.remove('slot-correct', 'slot-wrong');
    void el.offsetWidth;

    if (correct) {
      el.classList.add('slot-correct');
      U.playSFX('ding');
      roundScore++;
    } else {
      el.classList.add('slot-wrong');
      U.playSFX('fart');
    }

    await new Promise(r => setTimeout(r, 640));
  }

  score += roundScore;
  scoreEl.textContent = String(score);

  await new Promise(r => setTimeout(r, 520));

  globalLocked = false;
  if (roundIdx < 2) startRound(roundIdx + 1);
  else showResults();
}

checkBtn.addEventListener('click', () => {
  if (checkBtn.disabled || globalLocked) return;
  gradeRound();
});

/* ══════════════════════════════════════════════════════════════
   RESULTS
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  updateDots(3);
  [gameEl, checkRow, instrEl].forEach(el => el.style.display = 'none');
  results.classList.add('show');

  const tier = getTier(score);
  const pct = Math.round((score / 15) * 100);
  results.style.setProperty('--tier-color', tier.color);

  document.getElementById('vt-rs').textContent = `${score} / 15`;
  document.getElementById('vt-rp').textContent = `${pct}%`;
  document.getElementById('vt-rl').textContent = tier.label;
  document.getElementById('vt-re').textContent = tier.en;
  document.getElementById('vt-rj').textContent = tier.jp;
  document.getElementById('vt-rk').textContent = tier.kanji;

  const snd = new Audio(CFG.sfxBase + tier.sound);
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

/* ══════════════════════════════════════════════════════════════
   REPLAY / BACK
   ══════════════════════════════════════════════════════════════ */
document.getElementById('vt-replay').addEventListener('click', () => {
  results.classList.remove('show');
  [gameEl, checkRow, instrEl].forEach(el => el.style.display = '');
  score = 0;
  scoreEl.textContent = '0';
  startRound(0);
});

document.getElementById('vt-back').addEventListener('click', () => {
  window.location.assign(
    CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam)
  );
});

/* GO */
startRound(0);

})();
