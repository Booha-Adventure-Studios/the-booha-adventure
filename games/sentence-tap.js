
/* ══════════════════════════════════════════════════════════════
   sentence-tap.js  —  Sentence Tap Match
   Pair all 5 EN → JP sentences, then press Check.
   3 rounds × 5 = 15 points max.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Sentence Tap');
U.unlockAudio();

/* ══════════════════════════════════════════════════════════════
   PRELOAD ALL AUDIO UP FRONT
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
  sentCache[card.mp3] = a;
}

let activeSent  = null;
let sentLocked  = false;

function playSent(mp3) {
  if (!mp3 || sentLocked) return;
  const a = sentCache[mp3];
  if (!a) return;
  sentLocked = true;
  if (activeSent) { activeSent.pause(); activeSent.currentTime = 0; }
  activeSent = a;
  a.currentTime = 0;
  a.play().catch(() => {});
  const unlock = () => { sentLocked = false; };
  a.onended = unlock;
  a.onerror = unlock;
  setTimeout(unlock, 6000); /* sentences can be long */
}

/* ══════════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════════ */
const allCards = U.shuffle(CFG.cards.slice(0, 15)).map((c, i) => ({
  ...c,
  _key: String(c.id ?? c.mp3 ?? `${c.en}__${i}`)
}));

/* ══════════════════════════════════════════════════════════════
   RESULT TIERS  (sentence-specific messages)
   ══════════════════════════════════════════════════════════════ */
const TIERS = [
  {
    min: 0,  max: 5,  sound: 'result_0-5.mp3',
    label: 'Try Again!',
    en:    "Sentences are tough — don't give up!",
    jp:    '文は難しい！あきらめないで！',
    kanji: '文章は難しい！諦めないで！',
    color: '#ef4444',
  },
  {
    min: 6,  max: 10, sound: 'result_6-10.mp3',
    label: 'Keep Reading!',
    en:    "Getting there! Keep practicing those sentences.",
    jp:    'いい感じ！もっと練習しよう！',
    kanji: '良い調子！もっと練習しよう！',
    color: '#f97316',
  },
  {
    min: 11, max: 14, sound: 'result_11-14.mp3',
    label: 'Almost Fluent!',
    en:    "So close to perfect — your Japanese is flowing!",
    jp:    'ほぼペラペラ！惜しい！',
    kanji: 'ほぼ流暢！惜しい！',
    color: '#22ddff',
  },
  {
    min: 15, max: 15, sound: 'result_15.mp3',
    label: 'FLUENT!',
    en:    "Every sentence nailed! You sound amazing!",
    jp:    'ペラペラ！全文正解！すごい！',
    kanji: '流暢！全問正解！',
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
.st-bg {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; overflow: hidden;
}
.st-blob {
  position: absolute; border-radius: 50%;
  filter: blur(90px); opacity: 0;
  animation:
    stBlobIn 1.4s ease forwards,
    stBlobFloat var(--dur, 14s) ease-in-out infinite alternate;
}
@keyframes stBlobIn    { to { opacity: 0.16; } }
@keyframes stBlobFloat {
  from { transform: translate(0,   0  ) scale(1);   }
  to   { transform: translate(30px,40px) scale(1.12); }
}

/* ── Outer wrapper ── */
.st-wrap {
  position: relative; z-index: 1;
  max-width: 720px; margin: 0 auto;
  padding: 0 1rem 5rem;
}

/* ── Header ── */
.st-header {
  text-align: center;
  padding: 0.2rem 3rem 0.6rem;
}
.st-title-rainbow {
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
  animation: stRainbow 3s linear infinite;
  margin-bottom: 4px;
}
@keyframes stRainbow { to { background-position: 200% center; } }

.st-title-main {
  font-family: var(--game-font-title);
  font-size: clamp(26px, 6vw, 42px);
  color: #fff;
  text-shadow:
    0 0 18px var(--game-primary),
    0 0 36px color-mix(in srgb, var(--game-primary) 45%, transparent);
  line-height: 1.05; letter-spacing: 0.03em;
}
[data-curriculum="pb"] .st-title-main {
  text-shadow: 3px 4px 0 #ffb0d8, 0 0 22px rgba(255,110,180,0.4);
}

/* ── Round dots ── */
.st-dots-row {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; margin: 0.6rem 0 0.5rem;
}
.st-dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: rgba(255,255,255,0.15);
  border: 2px solid rgba(255,255,255,0.2);
  transition: all 0.3s; position: relative; flex-shrink: 0;
}
.st-dot.active {
  background: var(--game-primary); border-color: var(--game-primary);
  box-shadow: 0 0 12px var(--game-primary),
    0 0 26px color-mix(in srgb, var(--game-primary) 50%, transparent);
}
.st-dot.active::after {
  content: ''; position: absolute; inset: -5px; border-radius: 50%;
  border: 2px solid var(--game-primary); opacity: 0.5;
  animation: stRipple 1.5s ease-out infinite;
}
@keyframes stRipple {
  from { transform: scale(1);   opacity: 0.5; }
  to   { transform: scale(2.4); opacity: 0;   }
}
.st-dot.done {
  background: #22c55e; border-color: #22c55e;
  box-shadow: 0 0 10px rgba(34,197,94,0.6);
}

/* ── Score ── */
.st-score-row {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; margin-bottom: 0.6rem;
  font-size: clamp(13px, 2.4vw, 16px); font-weight: 900;
}
.st-score-pill {
  padding: 5px 18px; border-radius: 999px;
  background: var(--game-pill-bg);
  border: 1px solid var(--game-pill-border);
  color: var(--game-pill-text);
}
.st-score-pill b { color: var(--game-primary); }

/* ── Instruction ── */
.st-instruction {
  text-align: center; margin-bottom: 0.8rem;
  font-family: var(--game-font-jp);
  font-size: clamp(13px, 2.4vw, 16px);
  color: var(--game-muted); line-height: 1.5;
}

/* ── Stacked layout (EN bank above JP slots) ── */
.st-section { margin-bottom: 12px; }
.st-panel {
  border-radius: 20px; padding: 12px;
  background: var(--game-surface);
  border: 1px solid var(--game-border);
  backdrop-filter: blur(8px);
}
.st-panel-label {
  text-align: center;
  font-family: var(--game-font-title);
  font-size: clamp(11px, 2vw, 14px);
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--game-primary);
  margin-bottom: 10px;
}
.st-stack { display: flex; flex-direction: column; gap: 10px; }

/* ── EN sentence card ── */
.st-en-card {
  position: relative; overflow: hidden;
  border-radius: 16px;
  padding: 13px 16px;
  background: var(--game-tile-bg);
  border: 2.5px solid var(--game-tile-border);
  box-shadow:
    0 5px 20px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.18);
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
  text-align: left;
  transition:
    transform .14s cubic-bezier(.34,1.56,.64,1),
    box-shadow .14s, border-color .14s;
}
/* stripe texture */
.st-en-card::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(
    105deg, transparent 0 18px, rgba(255,255,255,0.04) 18px 20px
  );
  pointer-events: none; z-index: 0;
}
/* shine sweep */
.st-en-card::after {
  content: ''; position: absolute;
  top: -60%; left: -80%;
  width: 50%; height: 200%;
  background: linear-gradient(105deg,
    transparent 30%, rgba(255,255,255,0.24) 50%, transparent 70%);
  transform: skewX(-18deg);
  transition: left 0.55s ease;
  pointer-events: none; z-index: 1;
}
.st-en-card:hover::after { left: 140%; }
.st-en-card:hover  { transform: translateY(-2px) scale(1.01); }
.st-en-card:active { transform: scale(0.97); }

.st-card-inner {
  position: relative; z-index: 2;
}
.st-en-text {
  font-family: var(--game-font-body); font-weight: 900;
  font-size: clamp(13px, 2.5vw, 17px);
  color: var(--game-tile-text);
  line-height: 1.4; white-space: normal;
}

/* SELECTED */
.st-en-card.selected {
  border-color: var(--game-primary);
  transform: translateY(-2px) scale(1.015);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--game-primary) 38%, transparent),
    0 0 26px color-mix(in srgb, var(--game-primary) 55%, transparent),
    0 5px 20px rgba(0,0,0,0.35);
  background: color-mix(in srgb, var(--game-primary) 9%, var(--game-tile-bg));
}
.st-en-card.selected .st-en-text {
  color: color-mix(in srgb, var(--game-primary) 70%, var(--game-tile-text));
}
/* PAIRED — collapse */
.st-en-card.paired {
  opacity: 0; pointer-events: none;
  height: 0; padding: 0; margin: 0;
  border-width: 0; overflow: hidden;
  transition: opacity 0.25s, height 0.25s, padding 0.25s;
}

/* ── JP sentence slot ── */
.st-jp-slot {
  border-radius: 16px; padding: 12px 14px;
  background: var(--game-surface);
  border: 2.5px dashed var(--game-border);
  cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent;
  min-height: 80px;
  display: flex; flex-direction: column; justify-content: center;
  transition:
    border-color .14s, background .14s,
    box-shadow .14s, transform .14s;
  text-align: left;
}
.st-jp-slot:hover { border-color: var(--game-primary); }

.st-jp-text {
  font-family: var(--game-font-jp); font-weight: 900;
  font-size: clamp(15px, 2.8vw, 20px);
  color: var(--game-ink);
  line-height: 1.45; white-space: normal;
}
.st-jp-hira {
  font-family: var(--game-font-jp);
  font-size: clamp(11px, 1.9vw, 13px);
  color: var(--game-muted);
  margin-top: 3px; line-height: 1.3;
}
.st-drop {
  margin-top: 8px; min-height: 34px;
  border-radius: 10px; padding: 5px 10px;
  display: flex; align-items: center;
  font-family: var(--game-font-body);
  font-weight: 900; line-height: 1.35;
  text-align: left;
  transition: all 0.2s;
}
.st-drop.empty {
  border: 2px dashed rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.28);
  font-size: 11px; letter-spacing: 0.1em;
  justify-content: center;
}
[data-curriculum="pb"] .st-drop.empty {
  border-color: rgba(255,110,180,0.25);
  color: rgba(58,26,46,0.3);
}
/* PAIRED */
.st-jp-slot.has-pair {
  border-style: solid; border-color: var(--game-secondary);
  background: color-mix(in srgb, var(--game-secondary) 9%, var(--game-surface));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--game-secondary) 25%, transparent),
    0 0 18px color-mix(in srgb, var(--game-secondary) 50%, transparent);
  transform: scale(1.005);
}
.st-drop.filled {
  font-size: clamp(12px, 2.2vw, 15px);
  border: 2px solid color-mix(in srgb, var(--game-secondary) 55%, transparent);
  background: color-mix(in srgb, var(--game-secondary) 10%, transparent);
  color: var(--game-secondary);
}
/* CORRECT */
.st-jp-slot.slot-correct {
  border-color: #22c55e; border-style: solid;
  background: rgba(34,197,94,0.13);
  box-shadow: 0 0 0 3px rgba(34,197,94,0.3), 0 0 24px rgba(34,197,94,0.5);
  animation: stPopCorrect 0.32s cubic-bezier(.34,1.56,.64,1);
}
.st-jp-slot.slot-correct .st-drop {
  border-color: rgba(34,197,94,0.5);
  background: rgba(34,197,94,0.1);
  color: #22c55e;
}
/* WRONG */
.st-jp-slot.slot-wrong {
  border-color: #ef4444; border-style: solid;
  background: rgba(239,68,68,0.1);
  box-shadow: 0 0 0 3px rgba(239,68,68,0.3);
  animation: stShake 0.44s ease;
}
.st-jp-slot.slot-wrong .st-drop {
  border-color: rgba(239,68,68,0.45);
  background: rgba(239,68,68,0.08);
  color: #ef4444;
}
@keyframes stPopCorrect {
  from { transform: scale(0.96); }
  to   { transform: scale(1.005); }
}
@keyframes stShake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-7px); }
  40%     { transform: translateX(7px); }
  60%     { transform: translateX(-5px); }
  80%     { transform: translateX(5px); }
}

/* ── Check button ── */
.st-check-row {
  display: flex; justify-content: center;
  margin-top: 20px;
}
.st-check-btn {
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
.st-check-btn:hover  { transform: translateY(-2px) scale(1.03); }
.st-check-btn:active { transform: scale(0.95); box-shadow: none; }
.st-check-btn:disabled {
  opacity: 0.28; pointer-events: none; box-shadow: none;
}

/* ── Results ── */
.st-results {
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
.st-results.show {
  display: block;
  animation: stResultIn 0.5s cubic-bezier(0.22, 0.8, 0.36, 1) both;
}
@keyframes stResultIn {
  from { opacity: 0; transform: scale(0.88) translateY(24px); }
  to   { opacity: 1; transform: none; }
}
.st-results::before {
  content: ''; position: absolute;
  top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg,
    var(--game-primary), var(--game-secondary), var(--game-accent), var(--game-primary));
  background-size: 200% auto;
  animation: stRainbow 2.5s linear infinite;
}

.st-res-score {
  font-family: var(--game-font-title);
  font-size: clamp(58px, 15vw, 96px);
  color: var(--tier-color, var(--game-primary));
  text-shadow: 0 0 32px var(--tier-color, var(--game-primary));
  line-height: 1; margin-bottom: 4px;
}
.st-res-pct {
  font-size: clamp(15px, 3vw, 21px);
  color: var(--game-muted); font-weight: 700;
  margin-bottom: 12px;
}
.st-res-label {
  font-family: var(--game-font-title);
  font-size: clamp(24px, 5.5vw, 38px);
  color: var(--tier-color, var(--game-primary));
  letter-spacing: 0.04em; margin-bottom: 10px;
}
.st-res-en {
  font-family: var(--game-font-body); font-weight: 900;
  font-size: clamp(14px, 2.8vw, 19px);
  color: var(--game-ink); margin-bottom: 4px;
}
.st-res-jp {
  font-family: var(--game-font-jp);
  font-size: clamp(13px, 2.5vw, 17px);
  color: var(--game-muted); margin-bottom: 3px;
}
.st-res-kanji {
  font-family: var(--game-font-jp);
  font-size: clamp(11px, 2vw, 14px);
  color: var(--game-muted); opacity: 0.72;
  margin-bottom: 1.4rem;
}
.st-res-actions {
  display: flex; gap: 12px;
  justify-content: center; flex-wrap: wrap;
}

`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   BACKGROUND BLOBS
   ══════════════════════════════════════════════════════════════ */
const bgEl = document.createElement('div');
bgEl.className = 'st-bg';
[
  { size: 440, color: 'var(--game-accent)',    top:  '-100px', left: '-100px', dur: '15s', delay: '0s'   },
  { size: 360, color: 'var(--game-primary)',   bottom: '-80px', right: '-80px', dur: '18s', delay: '0.4s' },
  { size: 300, color: 'var(--game-secondary)', top:   '42%',   left:  '48%',   dur: '12s', delay: '0.2s' },
].forEach(b => {
  const el = document.createElement('div');
  el.className = 'st-blob';
  Object.assign(el.style, {
    width: b.size + 'px', height: b.size + 'px',
    background: b.color,
    top: b.top || '', left: b.left || '',
    bottom: b.bottom || '', right: b.right || '',
    '--dur': b.dur, animationDelay: b.delay,
  });
  bgEl.appendChild(el);
});
document.body.insertBefore(bgEl, document.body.firstChild);

/* ══════════════════════════════════════════════════════════════
   MOUNT HTML
   ══════════════════════════════════════════════════════════════ */
U.mount(`
<div class="st-wrap">

  <!-- Header -->
  <div class="st-header">
    <div class="st-title-rainbow">Booha Adventure</div>
    <div class="st-title-main">Sentence Tap</div>
  </div>

  <!-- Round dots -->
  <div class="st-dots-row">
    <div class="st-dot active" id="st-d0"></div>
    <div class="st-dot"        id="st-d1"></div>
    <div class="st-dot"        id="st-d2"></div>
  </div>

  <!-- Score -->
  <div class="st-score-row">
    <div class="st-score-pill">Score <b id="st-score">0</b> / 15</div>
  </div>

  <!-- Instruction -->
  <div class="st-instruction">英語をタップ → 日本語をタップして合わせよう</div>

  <!-- Game: EN bank stacked above JP slots -->
  <div id="st-game">
    <div class="st-section">
      <div class="st-panel">
        <div class="st-panel-label">English</div>
        <div class="st-stack" id="st-en-bank"></div>
      </div>
    </div>
    <div class="st-section">
      <div class="st-panel">
        <div class="st-panel-label">日本語</div>
        <div class="st-stack" id="st-jp-slots"></div>
      </div>
    </div>
  </div>

  <!-- Check -->
  <div class="st-check-row">
    <button class="st-check-btn" id="st-check" disabled>Check ✓</button>
  </div>

  <!-- Results -->
  <div class="st-results" id="st-results">
    <div class="st-res-score"  id="st-rs"></div>
    <div class="st-res-pct"    id="st-rp"></div>
    <div class="st-res-label"  id="st-rl"></div>
    <div class="st-res-en"     id="st-re"></div>
    <div class="st-res-jp"     id="st-rj"></div>
    <div class="st-res-kanji"  id="st-rk"></div>
    <div class="st-res-actions">
      <button class="game-btn game-btn-primary"   id="st-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="st-back">メニューへ</button>
    </div>
  </div>

</div>
`);

/* ══════════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════════ */
const scoreEl   = document.getElementById('st-score');
const enBank    = document.getElementById('st-en-bank');
const jpSlots   = document.getElementById('st-jp-slots');
const checkBtn  = document.getElementById('st-check');
const gameEl    = document.getElementById('st-game');
const checkRow  = document.querySelector('.st-check-row');
const instrEl   = document.querySelector('.st-instruction');
const results   = document.getElementById('st-results');

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
let score         = 0;
let roundIdx      = 0;
let roundCards    = [];
let roundJpOrder  = [];   // JP shuffled separately
let selectedEnKey = null;
let pairs         = {};
let checkLocked   = false;
let globalLocked  = false;

/* ══════════════════════════════════════════════════════════════
   DOTS
   ══════════════════════════════════════════════════════════════ */
function updateDots(ri) {
  [0, 1, 2].forEach(i => {
    const d = document.getElementById(`st-d${i}`);
    d.className = 'st-dot' +
      (i < ri ? ' done' : i === ri ? ' active' : '');
  });
}

/* ══════════════════════════════════════════════════════════════
   ROUND
   ══════════════════════════════════════════════════════════════ */
function startRound(ri) {
  roundIdx      = ri;
  roundCards    = allCards.slice(ri * 5, ri * 5 + 5);
  roundJpOrder  = U.shuffle(roundCards.slice()); // JP order ≠ EN order
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
      'st-en-card' +
      (isSelected ? ' selected' : '') +
      (isPaired   ? ' paired'   : '');
    btn.innerHTML = `
      <div class="st-card-inner">
        <div class="st-en-text">${card.en}</div>
      </div>`;

    btn.addEventListener('click', () => {
      if (globalLocked || isPaired) return;
      playSent(card.mp3);
      selectedEnKey = isSelected ? null : card._key;
      render();
    });

    enBank.appendChild(btn);
  });
}

function renderJpSlots() {
  jpSlots.innerHTML = '';

  roundJpOrder.forEach(card => {
    const pairedEnKey = pairs[card._key] ?? null;
    const pairedCard  = pairedEnKey
      ? roundCards.find(c => c._key === pairedEnKey)
      : null;

    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'st-jp-slot' + (pairedCard ? ' has-pair' : '');
    slot.innerHTML = `
      <div class="st-jp-text">${card.jp}</div>
      <div class="st-jp-hira">${card.hira || ''}</div>
      <div class="st-drop ${pairedCard ? 'filled' : 'empty'}">
        ${pairedCard ? pairedCard.en : 'TAP TO PAIR'}
      </div>`;

    slot.addEventListener('click', () => {
      if (globalLocked) return;
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
   CHECK
   ══════════════════════════════════════════════════════════════ */
checkBtn.addEventListener('click', () => {
  if (checkBtn.disabled || checkLocked || globalLocked) return;
  checkLocked = globalLocked = true;
  checkBtn.disabled = true;

  let roundScore = 0;
  jpSlots.querySelectorAll('.st-jp-slot').forEach((el, i) => {
    const jpCard  = roundJpOrder[i];
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
  }, 1200);
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

  document.getElementById('st-rs').textContent = `${score} / 15`;
  document.getElementById('st-rp').textContent = `${pct}%`;
  document.getElementById('st-rl').textContent = tier.label;
  document.getElementById('st-re').textContent = tier.en;
  document.getElementById('st-rj').textContent = tier.jp;
  document.getElementById('st-rk').textContent = tier.kanji;

  if (score === 15) U.confetti(results, 140);

  const snd = new Audio(CFG.sfxBase + tier.sound);
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

/* ══════════════════════════════════════════════════════════════
   REPLAY / BACK
   ══════════════════════════════════════════════════════════════ */
document.getElementById('st-replay').addEventListener('click', () => {
  results.classList.remove('show');
  [gameEl, checkRow, instrEl].forEach(el => el.style.display = '');
  score = 0;
  scoreEl.textContent = '0';
  startRound(0);
});

document.getElementById('st-back').addEventListener('click', () => {
  window.location.assign(
    CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam)
  );
});

/* ── GO ── */
startRound(0);

})();
