
/* ══════════════════════════════════════════════════════════════
   vocab-tap.js  —  Vocabulary Tap Match
   Pair all 5 EN → JP, then press Check.
   3 rounds × 5 cards = 15 points max.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Vocab Tap');
U.unlockAudio();

/* ══════════════════════════════════════════════════════════════
   PRELOAD ALL AUDIO UP FRONT
   ══════════════════════════════════════════════════════════════ */
await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

/* Cache every word audio so first tap is instant */
const wordCache = {};
for (const card of CFG.cards.slice(0, 15)) {
  if (!card.mp3 || wordCache[card.mp3]) continue;
  const a = new Audio(CFG.audioBase + card.mp3);
  a.preload = 'auto';
  wordCache[card.mp3] = a;
}

/* One word at a time, no smashing */
let activeWord  = null;
let wordLocked  = false;

function playWord(mp3) {
  if (!mp3 || wordLocked) return;
  const a = wordCache[mp3];
  if (!a) return;
  wordLocked = true;
  if (activeWord) { activeWord.pause(); activeWord.currentTime = 0; }
  activeWord = a;
  a.currentTime = 0;
  a.play().catch(() => {});
  const unlock = () => { wordLocked = false; };
  a.onended = unlock;
  a.onerror = unlock;
  setTimeout(unlock, 3500); /* hard cap */
}

/* ══════════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════════ */
const allCards = U.shuffle(CFG.cards.slice(0, 15)).map((c, i) => ({
  ...c,
  _key: String(c.id ?? c.mp3 ?? `${c.en}__${i}`)
}));

/* ══════════════════════════════════════════════════════════════
   RESULT TIERS
   ══════════════════════════════════════════════════════════════ */
const TIERS = [
  {
    min: 0,  max: 5,  sound: 'result_0-5.mp3',
    label: 'Try Again!',
    en:    "Rough start — but you've totally got this!",
    jp:    'またチャレンジ！絶対できる！',
    kanji: '再挑戦！絶対にできる！',
    color: '#ef4444',
  },
  {
    min: 6,  max: 10, sound: 'result_6-10.mp3',
    label: 'Keep Going!',
    en:    'Not bad! Every round you get stronger.',
    jp:    'いい感じ！どんどん上手くなってる！',
    kanji: '良い調子！どんどん上達！',
    color: '#f97316',
  },
  {
    min: 11, max: 14, sound: 'result_11-14.mp3',
    label: 'So Close!',
    en:    "Almost perfect — you're absolutely on fire!",
    jp:    'ほぼ満点！すごく上手い！',
    kanji: '惜しい！ほぼ満点！',
    color: '#22ddff',
  },
  {
    min: 15, max: 15, sound: 'result_15.mp3',
    label: 'PERFECT!',
    en:    'Flawless! Every single word, every time!',
    jp:    'パーフェクト！全問正解！やった！',
    kanji: '完璧！全問正解！',
    color: '#ffcc00',
  },
];
const getTier = s => TIERS.find(t => s >= t.min && s <= t.max) ?? TIERS[0];

/* ══════════════════════════════════════════════════════════════
   INJECT STYLES
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `

/* ── Page background ── */
.vt-bg {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; overflow: hidden;
}
.vt-blob {
  position: absolute; border-radius: 50%;
  filter: blur(90px); opacity: 0;
  animation:
    vtBlobIn 1.4s ease forwards,
    vtBlobFloat var(--dur, 14s) ease-in-out infinite alternate;
}
@keyframes vtBlobIn    { to { opacity: 0.16; } }
@keyframes vtBlobFloat {
  from { transform: translate(0,   0  ) scale(1);   }
  to   { transform: translate(30px,40px) scale(1.12); }
}

/* ── Outer wrapper ── */
.vt-wrap {
  position: relative; z-index: 1;
  max-width: 780px; margin: 0 auto;
  padding: 0 1rem 5rem;
}

/* ── Rainbow + main title ── */
.vt-header {
  text-align: center;
  padding: 0.2rem 3rem 0.6rem;
}
.vt-title-rainbow {
  font-family: var(--game-font-title);
  font-size: clamp(11px, 2.2vw, 15px);
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  background: linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: vtRainbowShift 3s linear infinite;
  margin-bottom: 4px;
}
@keyframes vtRainbowShift { to { background-position: 200% center; } }

.vt-title-main {
  font-family: var(--game-font-title);
  font-size: clamp(26px, 6vw, 42px);
  color: #fff;
  text-shadow:
    0 0 18px var(--game-primary),
    0 0 36px color-mix(in srgb, var(--game-primary) 45%, transparent);
  line-height: 1.05;
  letter-spacing: 0.03em;
}
[data-curriculum="pb"] .vt-title-main {
  text-shadow: 3px 4px 0 #ffb0d8, 0 0 22px rgba(255,110,180,0.4);
}

/* ── Round dots ── */
.vt-dots-row {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; margin: 0.6rem 0 0.5rem;
}
.vt-dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: rgba(255,255,255,0.15);
  border: 2px solid rgba(255,255,255,0.2);
  transition: all 0.3s ease;
  position: relative; flex-shrink: 0;
}
.vt-dot.active {
  background: var(--game-primary);
  border-color: var(--game-primary);
  box-shadow:
    0 0 12px var(--game-primary),
    0 0 26px color-mix(in srgb, var(--game-primary) 50%, transparent);
}
.vt-dot.active::after {
  content: '';
  position: absolute; inset: -5px; border-radius: 50%;
  border: 2px solid var(--game-primary);
  opacity: 0.5;
  animation: vtRipple 1.5s ease-out infinite;
}
@keyframes vtRipple {
  from { transform: scale(1);   opacity: 0.5; }
  to   { transform: scale(2.4); opacity: 0;   }
}
.vt-dot.done {
  background: #22c55e; border-color: #22c55e;
  box-shadow: 0 0 10px rgba(34,197,94,0.6);
}

/* ── Score pill ── */
.vt-score-row {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; margin-bottom: 0.6rem;
  font-size: clamp(13px, 2.4vw, 16px); font-weight: 900;
}
.vt-score-pill {
  padding: 5px 18px; border-radius: 999px;
  background: var(--game-pill-bg);
  border: 1px solid var(--game-pill-border);
  color: var(--game-pill-text);
}
.vt-score-pill b { color: var(--game-primary); }

/* ── Instruction ── */
.vt-instruction {
  text-align: center; margin-bottom: 0.8rem;
  font-family: var(--game-font-jp);
  font-size: clamp(13px, 2.4vw, 16px);
  color: var(--game-muted); line-height: 1.5;
}

/* ── Two-column layout ── */
.vt-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px; align-items: start;
}
@media (max-width: 560px) {
  .vt-columns { grid-template-columns: 1fr; }
}

/* ── Panel ── */
.vt-panel {
  border-radius: 20px; padding: 12px;
  background: var(--game-surface);
  border: 1px solid var(--game-border);
  backdrop-filter: blur(8px);
}
.vt-panel-label {
  text-align: center;
  font-family: var(--game-font-title);
  font-size: clamp(11px, 2vw, 14px);
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--game-primary);
  margin-bottom: 10px;
}
.vt-stack { display: flex; flex-direction: column; gap: 10px; }

/* ── EN card — flashy arcade tile ── */
.vt-en-card {
  position: relative; overflow: hidden;
  border-radius: 16px; padding: 14px 16px;
  background: var(--game-tile-bg);
  border: 2.5px solid var(--game-tile-border);
  box-shadow:
    0 5px 20px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.18);
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
  text-align: center;
  transition:
    transform .14s cubic-bezier(.34,1.56,.64,1),
    box-shadow .14s, border-color .14s;
}
/* diagonal candy stripe */
.vt-en-card::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(
    105deg, transparent 0 18px, rgba(255,255,255,0.045) 18px 20px
  );
  pointer-events: none; z-index: 0;
}
/* shine sweep on hover */
.vt-en-card::after {
  content: ''; position: absolute;
  top: -60%; left: -80%;
  width: 50%; height: 200%;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255,255,255,0.26) 50%,
    transparent 70%
  );
  transform: skewX(-18deg);
  transition: left 0.55s ease;
  pointer-events: none; z-index: 1;
}
.vt-en-card:hover::after { left: 140%; }
.vt-en-card:hover  { transform: translateY(-3px) scale(1.02); }
.vt-en-card:active { transform: scale(0.95); }

.vt-card-inner { position: relative; z-index: 2; }
.vt-en-text {
  font-family: var(--game-font-body);
  font-weight: 900;
  font-size: clamp(15px, 3vw, 21px);
  color: var(--game-tile-text);
  line-height: 1.2;
}

/* SELECTED — hot pink/primary glow */
.vt-en-card.selected {
  border-color: var(--game-primary);
  transform: translateY(-3px) scale(1.03);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--game-primary) 38%, transparent),
    0 0 26px color-mix(in srgb, var(--game-primary) 55%, transparent),
    0 6px 22px rgba(0,0,0,0.35);
  background: color-mix(in srgb, var(--game-primary) 9%, var(--game-tile-bg));
}
.vt-en-card.selected .vt-en-text {
  color: color-mix(in srgb, var(--game-primary) 70%, var(--game-tile-text));
}
/* PAIRED — collapse with fade */
.vt-en-card.paired {
  opacity: 0; pointer-events: none;
  height: 0; padding: 0; margin: 0;
  border-width: 0; overflow: hidden;
  transition: opacity 0.25s, height 0.25s, padding 0.25s;
}

/* ── JP slot — quieter target ── */
.vt-jp-slot {
  border-radius: 16px; padding: 12px 14px;
  background: var(--game-surface);
  border: 2.5px dashed var(--game-border);
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
  min-height: 74px;
  display: flex; flex-direction: column; justify-content: center;
  transition:
    border-color .14s, background .14s,
    box-shadow .14s, transform .14s;
}
.vt-jp-slot:hover { border-color: var(--game-primary); }

.vt-jp-text {
  font-family: var(--game-font-jp); font-weight: 900;
  font-size: clamp(17px, 3.2vw, 23px);
  color: var(--game-ink);
  text-align: center; line-height: 1.2;
}
.vt-jp-hira {
  font-family: var(--game-font-jp);
  font-size: clamp(11px, 1.9vw, 14px);
  color: var(--game-muted);
  text-align: center; margin-top: 3px;
}
.vt-drop {
  margin-top: 8px; min-height: 34px;
  border-radius: 10px; padding: 4px 8px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--game-font-body);
  font-weight: 900; line-height: 1.2;
  text-align: center;
  transition: all 0.2s;
}
.vt-drop.empty {
  border: 2px dashed rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.28);
  font-size: 11px; letter-spacing: 0.1em;
}
[data-curriculum="pb"] .vt-drop.empty {
  border-color: rgba(255,110,180,0.25);
  color: rgba(58,26,46,0.3);
}
/* PAIRED state — blue glow on the slot */
.vt-jp-slot.has-pair {
  border-style: solid;
  border-color: var(--game-secondary);
  background: color-mix(in srgb, var(--game-secondary) 9%, var(--game-surface));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--game-secondary) 25%, transparent),
    0 0 18px color-mix(in srgb, var(--game-secondary) 50%, transparent);
  transform: scale(1.01);
}
.vt-drop.filled {
  font-size: clamp(12px, 2.2vw, 15px);
  border: 2px solid color-mix(in srgb, var(--game-secondary) 60%, transparent);
  background: color-mix(in srgb, var(--game-secondary) 12%, transparent);
  color: var(--game-secondary);
}
/* CORRECT after check */
.vt-jp-slot.slot-correct {
  border-color: #22c55e; border-style: solid;
  background: rgba(34,197,94,0.13);
  box-shadow:
    0 0 0 3px rgba(34,197,94,0.3),
    0 0 24px rgba(34,197,94,0.5);
  animation: vtPopCorrect 0.32s cubic-bezier(.34,1.56,.64,1);
}
.vt-jp-slot.slot-correct .vt-drop {
  border-color: rgba(34,197,94,0.5);
  background: rgba(34,197,94,0.1);
  color: #22c55e;
}
/* WRONG after check */
.vt-jp-slot.slot-wrong {
  border-color: #ef4444; border-style: solid;
  background: rgba(239,68,68,0.1);
  box-shadow: 0 0 0 3px rgba(239,68,68,0.3);
  animation: vtShake 0.44s ease;
}
.vt-jp-slot.slot-wrong .vt-drop {
  border-color: rgba(239,68,68,0.45);
  background: rgba(239,68,68,0.08);
  color: #ef4444;
}
@keyframes vtPopCorrect {
  from { transform: scale(0.95); }
  to   { transform: scale(1.01); }
}
@keyframes vtShake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-7px); }
  40%     { transform: translateX(7px); }
  60%     { transform: translateX(-5px); }
  80%     { transform: translateX(5px); }
}

/* ── Check button ── */
.vt-check-row {
  display: flex; justify-content: center;
  margin-top: 20px;
}
.vt-check-btn {
  font-family: var(--game-font-title);
  font-size: clamp(16px, 3.5vw, 22px);
  letter-spacing: 0.07em;
  padding: 14px 48px;
  border-radius: 999px; border: none; cursor: pointer;
  background: linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color: #000;
  box-shadow:
    0 0 26px color-mix(in srgb, var(--game-primary) 60%, transparent),
    0 5px 0  color-mix(in srgb, var(--game-primary) 45%, #000);
  transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s;
}
.vt-check-btn:hover  { transform: translateY(-2px) scale(1.03); }
.vt-check-btn:active { transform: scale(0.95); box-shadow: none; }
.vt-check-btn:disabled {
  opacity: 0.28; pointer-events: none; box-shadow: none;
}

/* ── Results panel ── */
.vt-results {
  display: none;
  text-align: center;
  max-width: 560px;
  margin: 1.5rem auto;
  padding: 2.5rem 1.5rem 2rem;
  border-radius: var(--game-radius);
  border: 2px solid var(--tier-color, var(--game-primary));
  background: color-mix(in srgb, var(--tier-color, var(--game-primary)) 6%, var(--game-bg));
  box-shadow:
    0 0 60px color-mix(in srgb, var(--tier-color, var(--game-primary)) 22%, transparent),
    0 0 0 1px color-mix(in srgb, var(--tier-color, var(--game-primary)) 15%, transparent);
  position: relative; overflow: hidden;
}
.vt-results.show {
  display: block;
  animation: vtResultIn 0.5s cubic-bezier(0.22, 0.8, 0.36, 1) both;
}
@keyframes vtResultIn {
  from { opacity: 0; transform: scale(0.88) translateY(24px); }
  to   { opacity: 1; transform: none; }
}
/* top accent stripe */
.vt-results::before {
  content: ''; position: absolute;
  top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg,
    var(--game-primary), var(--game-secondary), var(--game-accent), var(--game-primary));
  background-size: 200% auto;
  animation: vtRainbowShift 2.5s linear infinite;
}

.vt-res-score {
  font-family: var(--game-font-title);
  font-size: clamp(58px, 15vw, 96px);
  color: var(--tier-color, var(--game-primary));
  text-shadow: 0 0 32px var(--tier-color, var(--game-primary));
  line-height: 1; margin-bottom: 4px;
}
.vt-res-pct {
  font-size: clamp(15px, 3vw, 21px);
  color: var(--game-muted); font-weight: 700;
  margin-bottom: 12px;
}
.vt-res-label {
  font-family: var(--game-font-title);
  font-size: clamp(24px, 5.5vw, 38px);
  color: var(--tier-color, var(--game-primary));
  letter-spacing: 0.04em; margin-bottom: 10px;
}
.vt-res-en {
  font-family: var(--game-font-body); font-weight: 900;
  font-size: clamp(14px, 2.8vw, 19px);
  color: var(--game-ink); margin-bottom: 4px;
}
.vt-res-jp {
  font-family: var(--game-font-jp);
  font-size: clamp(13px, 2.5vw, 17px);
  color: var(--game-muted); margin-bottom: 3px;
}
.vt-res-kanji {
  font-family: var(--game-font-jp);
  font-size: clamp(11px, 2vw, 14px);
  color: var(--game-muted); opacity: 0.72;
  margin-bottom: 1.4rem;
}
.vt-res-actions {
  display: flex; gap: 12px;
  justify-content: center; flex-wrap: wrap;
}

`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   BACKGROUND BLOBS
   ══════════════════════════════════════════════════════════════ */
const bgEl = document.createElement('div');
bgEl.className = 'vt-bg';
[
  { size: 440, color: 'var(--game-primary)',   top:  '-100px', left: '-100px', dur: '13s', delay: '0s'   },
  { size: 360, color: 'var(--game-accent)',    bottom: '-80px', right: '-80px', dur: '17s', delay: '0.4s' },
  { size: 300, color: 'var(--game-secondary)', top:   '38%',   left:  '50%',   dur: '11s', delay: '0.2s' },
].forEach(b => {
  const el = document.createElement('div');
  el.className = 'vt-blob';
  Object.assign(el.style, {
    width: b.size + 'px', height: b.size + 'px',
    background: b.color,
    top: b.top || '', left: b.left || '',
    bottom: b.bottom || '', right: b.right || '',
    '--dur': b.dur,
    animationDelay: b.delay,
  });
  bgEl.appendChild(el);
});
document.body.insertBefore(bgEl, document.body.firstChild);

/* ══════════════════════════════════════════════════════════════
   MOUNT HTML
   ══════════════════════════════════════════════════════════════ */
U.mount(`
<div class="vt-wrap">

  <!-- Header: rainbow label + glowing game title (single) -->
  <div class="vt-header">
    <div class="vt-title-rainbow">Booha Adventure</div>
    <div class="vt-title-main">Vocabulary Tap</div>
  </div>

  <!-- Round progress dots -->
  <div class="vt-dots-row">
    <div class="vt-dot active" id="vt-d0"></div>
    <div class="vt-dot"        id="vt-d1"></div>
    <div class="vt-dot"        id="vt-d2"></div>
  </div>

  <!-- Score -->
  <div class="vt-score-row">
    <div class="vt-score-pill">Score <b id="vt-score">0</b> / 15</div>
  </div>

  <!-- Instruction -->
  <div class="vt-instruction">英語をタップ → 日本語をタップして合わせよう</div>

  <!-- Game board -->
  <div class="vt-columns" id="vt-game">
    <div class="vt-panel">
      <div class="vt-panel-label">English</div>
      <div class="vt-stack" id="vt-en-bank"></div>
    </div>
    <div class="vt-panel">
      <div class="vt-panel-label">日本語</div>
      <div class="vt-stack" id="vt-jp-slots"></div>
    </div>
  </div>

  <!-- Check -->
  <div class="vt-check-row">
    <button class="vt-check-btn" id="vt-check" disabled>Check ✓</button>
  </div>

  <!-- Results -->
  <div class="vt-results" id="vt-results">
    <div class="vt-res-score"   id="vt-rs"></div>
    <div class="vt-res-pct"     id="vt-rp"></div>
    <div class="vt-res-label"   id="vt-rl"></div>
    <div class="vt-res-en"      id="vt-re"></div>
    <div class="vt-res-jp"      id="vt-rj"></div>
    <div class="vt-res-kanji"   id="vt-rk"></div>
    <div class="vt-res-actions">
      <button class="game-btn game-btn-primary"   id="vt-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="vt-back">メニューへ</button>
    </div>
  </div>

</div>
`);

/* ══════════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════════ */
const scoreEl   = document.getElementById('vt-score');
const enBank    = document.getElementById('vt-en-bank');
const jpSlots   = document.getElementById('vt-jp-slots');
const checkBtn  = document.getElementById('vt-check');
const gameEl    = document.getElementById('vt-game');
const checkRow  = document.querySelector('.vt-check-row');
const instrEl   = document.querySelector('.vt-instruction');
const results   = document.getElementById('vt-results');

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
let score         = 0;
let roundIdx      = 0;
let roundCards    = [];
let selectedEnKey = null;
let pairs         = {};       // jpKey → enKey
let checkLocked   = false;
let globalLocked  = false;

/* ══════════════════════════════════════════════════════════════
   DOTS
   ══════════════════════════════════════════════════════════════ */
function updateDots(ri) {
  [0, 1, 2].forEach(i => {
    const d = document.getElementById(`vt-d${i}`);
    d.className = 'vt-dot' +
      (i < ri ? ' done' : i === ri ? ' active' : '');
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
  checkLocked   = false;
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
  checkBtn.disabled =
    Object.keys(pairs).length < roundCards.length || checkLocked;
}

function renderEnBank() {
  enBank.innerHTML = '';
  const pairedKeys = new Set(Object.values(pairs));

  roundCards.forEach(card => {
    const isPaired   = pairedKeys.has(card._key);
    const isSelected = selectedEnKey === card._key;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'vt-en-card' +
      (isSelected ? ' selected' : '') +
      (isPaired   ? ' paired'   : '');
    btn.innerHTML = `
      <div class="vt-card-inner">
        <div class="vt-en-text">${card.en}</div>
      </div>`;

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
    const pairedCard  = pairedEnKey
      ? roundCards.find(c => c._key === pairedEnKey)
      : null;

    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'vt-jp-slot' + (pairedCard ? ' has-pair' : '');
    slot.innerHTML = `
      <div class="vt-jp-text">${card.jp}</div>
      <div class="vt-jp-hira">${card.hira || ''}</div>
      <div class="vt-drop ${pairedCard ? 'filled' : 'empty'}">
        ${pairedCard ? pairedCard.en : 'TAP TO PAIR'}
      </div>`;

    slot.addEventListener('click', () => {
      if (globalLocked) return;
      /* tap a filled slot with no EN selected → un-pair */
      if (!selectedEnKey && pairedCard) {
        delete pairs[card._key];
        render();
        return;
      }
      if (selectedEnKey) {
        /* remove this EN key from any existing slot */
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
   CHECK
   ══════════════════════════════════════════════════════════════ */
checkBtn.addEventListener('click', () => {
  if (checkBtn.disabled || checkLocked || globalLocked) return;
  checkLocked = globalLocked = true;
  checkBtn.disabled = true;

  let roundScore = 0;
  jpSlots.querySelectorAll('.vt-jp-slot').forEach((el, i) => {
    const jpCard  = roundCards[i];
    const correct = pairs[jpCard._key] === jpCard._key;
    el.classList.add(correct ? 'slot-correct' : 'slot-wrong');
    if (correct) roundScore++;
  });

  score += roundScore;
  scoreEl.textContent = String(score);

  if (roundScore === 5)      { U.playSFX('ding'); U.confetti(gameEl, 55); }
  else if (roundScore === 0) { U.playSFX('fart'); }
  else                       { U.playSFX('ding'); }

  setTimeout(() => {
    globalLocked = false;
    if (roundIdx < 2) startRound(roundIdx + 1);
    else              showResults();
  }, 1150);
});

/* ══════════════════════════════════════════════════════════════
   RESULTS
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  updateDots(3);
  [gameEl, checkRow, instrEl].forEach(el => el.style.display = 'none');
  results.classList.add('show');

  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);
  results.style.setProperty('--tier-color', tier.color);

  document.getElementById('vt-rs').textContent = `${score} / 15`;
  document.getElementById('vt-rp').textContent = `${pct}%`;
  document.getElementById('vt-rl').textContent = tier.label;
  document.getElementById('vt-re').textContent = tier.en;
  document.getElementById('vt-rj').textContent = tier.jp;
  document.getElementById('vt-rk').textContent = tier.kanji;

  if (score === 15) U.confetti(results, 140);

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

/* ── GO ── */
startRound(0);

})();
