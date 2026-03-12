
/* ══════════════════════════════════════════════════════════════
   vocab-tap.js — Vocabulary Tap Match  v2
   Pair all 5 EN → JP, then press Check.
   3 rounds × 5 cards = 15 points max.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.unlockAudio();

/* ══════════════════════════════════════════════════════════════
   AUDIO — mobile-safe: decode on first user gesture
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
  a.setAttribute('webkit-playsinline', '');
  try { a.load(); } catch {}
  wordCache[card.mp3] = a;
}

let activeWord = null;
let wordLocked = false;

/* Warm audio on first tap anywhere — iOS unlock */
let audioUnlocked = false;
function unlockAllAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  Object.values(wordCache).forEach(a => {
    try {
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
      setTimeout(() => { try { a.pause(); a.currentTime = 0; } catch {} }, 30);
    } catch {}
  });
}
document.addEventListener('touchstart', unlockAllAudio, { once: true, passive: true });
document.addEventListener('mousedown',  unlockAllAudio, { once: true, passive: true });

function stopWord() {
  if (!activeWord) return;
  try { activeWord.pause(); activeWord.currentTime = 0; } catch {}
  activeWord = null;
  wordLocked = false;
}

function playWord(mp3) {
  if (!mp3) return;
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
    en:    "Rough start — but you've got this!",
    jp:    'もう一回やってみよう！',
    kanji: 'もう一回挑戦！',
    color: '#ef4444',
    glow:  'rgba(239,68,68,0.4)',
  },
  {
    min: 6,  max: 10, sound: 'result_6-10.mp3',
    label: 'KEEP GOING',
    en:    'Nice effort. You are getting stronger!',
    jp:    'いい感じ！どんどん上手！',
    kanji: '良い調子！どんどん上達！',
    color: '#f97316',
    glow:  'rgba(249,115,22,0.4)',
  },
  {
    min: 11, max: 14, sound: 'result_11-14.mp3',
    label: 'SO CLOSE!',
    en:    'Almost perfect. Really strong work!',
    jp:    'おしい！すごく上手！',
    kanji: '惜しい！とても上手！',
    color: '#22ddff',
    glow:  'rgba(34,221,255,0.4)',
  },
  {
    min: 15, max: 15, sound: 'result_15.mp3',
    label: 'PERFECT!',
    en:    'Flawless! Every single word matched!',
    jp:    'パーフェクト！全問正解！',
    kanji: '完璧！全問正解！',
    color: '#ffcc00',
    glow:  'rgba(255,204,0,0.5)',
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
   CURRICULUM
   ══════════════════════════════════════════════════════════════ */
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
  padding:0 .95rem 6rem;
}

/* ── header ── */
.vt-header{
  text-align:center;
  padding:.5rem 3rem .6rem;
}
.vt-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(11px,2vw,15px);
  font-weight:900;
  letter-spacing:.24em;
  text-transform:uppercase;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:vtRainbowShift 3s linear infinite;
}
@keyframes vtRainbowShift{ to{ background-position:220% center; } }

/* hide any pre-existing game-header from the page shell */
.game-header{ display:none !important; }

.vt-date{
  margin-top:4px;
  font-family:var(--game-font-body);
  font-size:clamp(12px,2.2vw,16px);
  font-weight:800;
  color:var(--game-muted);
  letter-spacing:.06em;
}

/* ── dots ── */
.vt-dots-row{
  display:flex; justify-content:center; align-items:center; gap:14px;
  margin:.65rem 0 .5rem;
}
.vt-dot{
  width:16px; height:16px; border-radius:50%;
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
  content:'';
  position:absolute; inset:-6px; border-radius:50%;
  border:2px solid var(--game-primary);
  opacity:.4;
  animation:vtRipple 1.6s ease-out infinite;
}
.vt-dot.done{
  background:#22c55e;
  border-color:#22c55e;
  box-shadow:0 0 12px rgba(34,197,94,.7);
}
@keyframes vtRipple{
  from{ transform:scale(1); opacity:.4; }
  to{ transform:scale(2.5); opacity:0; }
}

/* ── score pill ── */
.vt-score-row{
  display:flex; justify-content:center; align-items:center;
  gap:10px; margin-bottom:.65rem;
}
.vt-score-pill{
  padding:7px 22px; border-radius:999px;
  background:var(--game-pill-bg);
  border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text);
  font-size:clamp(13px,2.2vw,16px);
  font-weight:900;
  letter-spacing:.03em;
  box-shadow:0 2px 12px rgba(0,0,0,.2);
}
.vt-score-pill b{
  color:var(--game-primary);
  font-size:1.1em;
  text-shadow:0 0 10px var(--game-primary);
}

/* ── columns ── */
.vt-columns{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:18px;
  align-items:start;
}
@media(max-width:680px){
  .vt-columns{ grid-template-columns:1fr; }
}

/* ── panel ── */
.vt-panel{
  border-radius:24px;
  padding:14px 12px;
  background:var(--game-surface);
  border:1px solid var(--game-border);
  backdrop-filter:blur(10px);
  box-shadow:0 8px 32px rgba(0,0,0,.22);
}

/* BR — warm dark green tint to panels */
[data-curriculum="br"] .vt-panel{
  background:rgba(170,255,34,.04);
  border-color:rgba(170,255,34,.14);
  box-shadow:0 8px 32px rgba(0,0,0,.3), 0 0 0 1px rgba(170,255,34,.06);
}

/* BC — deep cold blue tint to panels */
[data-curriculum="bc"] .vt-panel{
  background:rgba(0,240,255,.04);
  border-color:rgba(0,240,255,.14);
  box-shadow:0 8px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(0,240,255,.06);
}
.vt-panel-label{
  text-align:center;
  margin-bottom:12px;
  font-family:var(--game-font-title);
  font-size:clamp(10px,1.8vw,13px);
  letter-spacing:.2em;
  text-transform:uppercase;
  color:var(--game-primary);
  opacity:.8;
}

.vt-stack{
  display:grid;
  grid-template-columns:1fr;
  gap:11px;
}

/* ══════════════════════════════════════════════════════════════
   ENGLISH CARDS — more pop, shimmer, hue-rotated per card
   ══════════════════════════════════════════════════════════════ */
.vt-en-card{
  --card-hue: calc(var(--i,0) * 52deg);
  position:relative;
  overflow:hidden;
  border-radius:20px;
  padding:0 14px;
  min-height:94px;
  height:94px;

  /* rich multi-layer gradient */
  background:
    linear-gradient(
      135deg,
      hsl(from var(--game-primary) h calc(s + 10%) l / 0.22),
      hsl(from var(--game-secondary) h s l / 0.18)
    ),
    linear-gradient(
      145deg,
      rgba(255,255,255,.18) 0%,
      rgba(255,255,255,.04) 60%,
      rgba(0,0,0,.06) 100%
    );

  border:2px solid rgba(255,255,255,.22);
  box-shadow:
    0 8px 24px rgba(0,0,0,.32),
    0 2px 0 rgba(255,255,255,.14) inset,
    0 -2px 0 rgba(0,0,0,.12) inset;

  cursor:pointer;
  user-select:none;
  -webkit-tap-highlight-color:transparent;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  transition:
    transform .16s cubic-bezier(.34,1.56,.64,1),
    box-shadow .16s,
    border-color .16s,
    opacity .2s;
  filter:hue-rotate(var(--card-hue));
}

/* one-time entrance animation — class removed after play */
.vt-en-card.animating{
  animation:vtTileIn .38s ease backwards;
  animation-delay:calc(var(--i,0) * 0.06s);
}
@keyframes vtTileIn{
  from{ transform:translateY(14px) scale(.95); opacity:0; }
  to{   transform:none; opacity:1; }
}

/* stripe texture */
.vt-en-card::before{
  content:'';
  position:absolute; inset:0;
  background:repeating-linear-gradient(
    118deg,
    transparent 0 12px,
    rgba(255,255,255,.055) 12px 14px
  );
  pointer-events:none;
  z-index:0;
}

/* shimmer sweep */
.vt-en-card::after{
  content:'';
  position:absolute;
  top:-60%; left:-80%;
  width:50%; height:200%;
  background:linear-gradient(
    108deg,
    transparent 28%,
    rgba(255,255,255,.28) 50%,
    transparent 72%
  );
  transform:skewX(-16deg);
  transition:left .5s ease;
  pointer-events:none;
  z-index:1;
}
.vt-en-card:hover::after{ left:150%; }

.vt-en-card:hover{
  transform:translateY(-4px) scale(1.035);
  box-shadow:
    0 14px 32px rgba(0,0,0,.38),
    0 0 24px color-mix(in srgb, var(--game-primary) 40%, transparent),
    0 2px 0 rgba(255,255,255,.18) inset;
  border-color:rgba(255,255,255,.38);
}
.vt-en-card:active{ transform:scale(.96); }

.vt-card-inner{
  position:relative; z-index:2; width:100%;
}
.vt-en-text{
  font-family:var(--game-font-body);
  font-weight:900;
  font-size:clamp(19px,2.8vw,25px);
  color:var(--game-tile-text);
  line-height:1.15;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
  text-wrap:balance;
  text-shadow:0 1px 0 rgba(255,255,255,.5);
}

/* selected state */
.vt-en-card.selected{
  border-color:var(--game-primary);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--game-primary) 18%, transparent),
      color-mix(in srgb, var(--game-secondary) 12%, transparent)
    );
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--game-primary) 38%, transparent),
    0 0 30px color-mix(in srgb, var(--game-primary) 50%, transparent),
    0 8px 24px rgba(0,0,0,.32);
  transform:translateY(-3px) scale(1.03);
}
.vt-en-card.selected .vt-en-text{
  color:color-mix(in srgb, var(--game-primary) 80%, var(--game-tile-text));
}

/* leaving (paired) state */
.vt-en-card.leaving{
  opacity:0;
  transform:translateX(22px) scale(.94);
  pointer-events:none;
  transition:opacity .22s, transform .22s;
}

/* ── BR: warm electric green/yellow tiles ── */
[data-curriculum="br"] .vt-en-card{
  background:
    linear-gradient(135deg, rgba(170,255,34,.18), rgba(255,204,0,.12)),
    linear-gradient(145deg, rgba(255,255,255,.16) 0%, rgba(0,0,0,.06) 100%);
  border-color:rgba(170,255,34,.28);
}
[data-curriculum="br"] .vt-en-card.selected{
  border-color:#aaff22;
  background:linear-gradient(135deg, rgba(170,255,34,.24), rgba(255,204,0,.16));
}

/* ── BC: cold blue/cyan tiles ── */
[data-curriculum="bc"] .vt-en-card{
  background:
    linear-gradient(135deg, rgba(0,240,255,.14), rgba(68,85,255,.16)),
    linear-gradient(145deg, rgba(255,255,255,.10) 0%, rgba(0,0,0,.10) 100%);
  border-color:rgba(0,240,255,.22);
  filter:none; /* override hue-rotate — bc has its own palette */
}
[data-curriculum="bc"] .vt-en-card .vt-en-text{
  color:#ecfeff;
  text-shadow:0 0 12px rgba(0,240,255,.35), 0 1px 0 rgba(0,0,0,.4);
}
[data-curriculum="bc"] .vt-en-card.selected{
  border-color:#00f0ff;
  background:linear-gradient(135deg, rgba(0,240,255,.22), rgba(68,85,255,.18));
  box-shadow:0 0 0 3px rgba(0,240,255,.3), 0 0 28px rgba(0,240,255,.4), 0 8px 24px rgba(0,0,0,.4);
}
[data-curriculum="bc"] .vt-en-card.selected .vt-en-text{
  color:#00f0ff;
}

/* ── PB: white pastel tiles (existing feel, tweak text) ── */
[data-curriculum="pb"] .vt-en-card{
  filter:none;
  background:
    linear-gradient(135deg, rgba(255,110,180,.14), rgba(204,136,255,.12)),
    linear-gradient(145deg, rgba(255,255,255,.85) 0%, rgba(255,220,240,.6) 100%);
  border-color:rgba(255,110,180,.3);
}
[data-curriculum="pb"] .vt-en-card .vt-en-text{
  color:#3a1a2e;
  text-shadow:none;
}
[data-curriculum="pb"] .vt-en-card.selected{
  border-color:#ff6eb4;
  background:linear-gradient(135deg, rgba(255,110,180,.22), rgba(204,136,255,.18));
}
[data-curriculum="pb"] .vt-en-card.selected .vt-en-text{
  color:#c4006a;
}

/* ══════════════════════════════════════════════════════════════
   JAPANESE SLOTS
   ══════════════════════════════════════════════════════════════ */
.vt-jp-slot{
  min-height:94px;
  height:94px;
  border-radius:20px;
  padding:10px 12px;
  background:linear-gradient(160deg,rgba(255,255,255,.055),rgba(255,255,255,.02));
  border:2px dashed rgba(255,255,255,.18);
  display:grid;
  grid-template-rows:1fr auto;
  align-content:center;
  gap:6px;
  cursor:pointer;
  user-select:none;
  -webkit-tap-highlight-color:transparent;
  transition:border-color .15s, background .15s, box-shadow .15s, transform .15s;
  position:relative;
  overflow:hidden;
}
.vt-jp-slot:hover{ border-color:var(--game-primary); }

/* jp text toggle area */
.vt-jp-word-wrap{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;
  min-height:44px;
}

.vt-jp-kanji{
  font-family:var(--game-font-jp);
  font-weight:900;
  font-size:clamp(20px,2.9vw,26px);
  color:var(--game-ink);
  line-height:1.1;
  text-align:center;
  display:block;
}
/* hira is hidden by default — only shown when toggle is active */
.vt-jp-hira-text{
  font-family:var(--game-font-jp);
  font-size:clamp(17px,2.6vw,22px);
  font-weight:900;
  color:var(--game-ink);
  line-height:1.2;
  text-align:center;
  display:none;
}

/* when hira-mode is active: swap visibility */
body.hira-mode .vt-jp-kanji{
  display:none;
}
body.hira-mode .vt-jp-hira-text{
  display:block;
}

/* drop zone */
.vt-drop{
  min-height:28px;
  border-radius:10px;
  padding:3px 8px;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  font-family:var(--game-font-body);
  font-weight:900;
  font-size:clamp(11px,1.8vw,14px);
  line-height:1.12;
  transition:all .2s ease;
}
.vt-drop.empty{
  border:2px dashed rgba(255,255,255,.15);
  color:rgba(255,255,255,.22);
  letter-spacing:.06em;
}
[data-curriculum="pb"] .vt-drop.empty{
  border-color:rgba(255,110,180,.2);
  color:rgba(58,26,46,.28);
}

.vt-jp-slot.has-pair{
  border-style:solid;
  border-color:var(--game-secondary);
  background:color-mix(in srgb, var(--game-secondary) 9%, rgba(255,255,255,.03));
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--game-secondary) 22%, transparent),
    0 0 18px color-mix(in srgb, var(--game-secondary) 38%, transparent);
  transform:scale(1.015);
}
.vt-drop.filled{
  font-size:clamp(11px,1.8vw,14px);
  color:var(--game-secondary);
  border:1.5px solid color-mix(in srgb, var(--game-secondary) 55%, transparent);
  background:color-mix(in srgb, var(--game-secondary) 10%, transparent);
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  overflow:hidden;
}

/* result states */
.vt-jp-slot.slot-correct{
  border-style:solid;
  border-color:#22c55e;
  background:rgba(34,197,94,.13);
  box-shadow:0 0 0 3px rgba(34,197,94,.26), 0 0 24px rgba(34,197,94,.38);
  animation:vtGood .28s cubic-bezier(.34,1.56,.64,1);
}
.vt-jp-slot.slot-correct .vt-drop{
  color:#22c55e;
  border-color:rgba(34,197,94,.5);
  background:rgba(34,197,94,.09);
}
.vt-jp-slot.slot-wrong{
  border-style:solid;
  border-color:#ef4444;
  background:rgba(239,68,68,.11);
  box-shadow:0 0 0 3px rgba(239,68,68,.24);
  animation:vtBad .44s ease;
}
.vt-jp-slot.slot-wrong .vt-drop{
  color:#ef4444;
  border-color:rgba(239,68,68,.45);
  background:rgba(239,68,68,.08);
}

@keyframes vtGood{
  from{ transform:scale(.95); }
  50%{ transform:scale(1.04); }
  to{ transform:scale(1.015); }
}
@keyframes vtBad{
  0%,100%{ transform:translateX(0); }
  18%{ transform:translateX(-7px); }
  38%{ transform:translateX(7px); }
  58%{ transform:translateX(-5px); }
  78%{ transform:translateX(5px); }
}

/* ══════════════════════════════════════════════════════════════
   BOTTOM BAR — check + hira toggle + help
   ══════════════════════════════════════════════════════════════ */
.vt-bottom-bar{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:14px;
  margin-top:22px;
  flex-wrap:wrap;
}

/* Hira toggle */
.vt-hira-btn{
  font-family:var(--game-font-jp);
  font-size:clamp(12px,2.2vw,15px);
  font-weight:900;
  padding:11px 18px;
  border-radius:999px;
  border:2px solid var(--game-border);
  background:var(--game-surface);
  color:var(--game-muted);
  cursor:pointer;
  transition:all .2s;
  letter-spacing:.03em;
  white-space:nowrap;
  display:flex; align-items:center; gap:7px;
}
.vt-hira-btn:hover{
  border-color:var(--game-primary);
  color:var(--game-primary);
}
body.hira-mode .vt-hira-btn{
  border-color:var(--game-primary);
  background:color-mix(in srgb, var(--game-primary) 12%, var(--game-surface));
  color:var(--game-primary);
  box-shadow:0 0 14px color-mix(in srgb, var(--game-primary) 35%, transparent);
}
.vt-hira-icon{
  font-size:1.15em;
  display:inline-block;
  transition:transform .3s;
}
body.hira-mode .vt-hira-icon{ transform:rotate(180deg); }

/* Check button */
.vt-check-btn{
  font-family:var(--game-font-title);
  font-size:clamp(17px,3.2vw,23px);
  letter-spacing:.07em;
  padding:14px 46px;
  border:none;
  border-radius:999px;
  cursor:pointer;
  position:relative;
  overflow:hidden;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000;
  font-weight:900;
  box-shadow:
    0 0 26px color-mix(in srgb, var(--game-primary) 50%, transparent),
    0 4px 0 color-mix(in srgb, var(--game-primary) 40%, #000),
    0 8px 20px rgba(0,0,0,.3);
  transition:transform .15s, opacity .2s, box-shadow .15s;
}
.vt-check-btn::after{
  content:'';
  position:absolute;
  top:-50%; left:-80%;
  width:48%; height:200%;
  background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,.3) 50%,transparent 72%);
  transform:skewX(-16deg);
  transition:left .5s ease;
  pointer-events:none;
}
.vt-check-btn:hover::after{ left:150%; }
.vt-check-btn:hover{
  transform:translateY(-3px) scale(1.04);
  box-shadow:
    0 0 36px color-mix(in srgb, var(--game-primary) 65%, transparent),
    0 6px 0 color-mix(in srgb, var(--game-primary) 40%, #000),
    0 12px 28px rgba(0,0,0,.35);
}
.vt-check-btn:active{ transform:scale(.96); box-shadow:none; }
.vt-check-btn:disabled{
  opacity:.3;
  pointer-events:none;
  box-shadow:none;
}

/* Help button */
.vt-help-btn{
  width:46px; height:46px;
  border-radius:50%;
  border:2px solid var(--game-border);
  background:var(--game-surface);
  color:var(--game-muted);
  font-size:1.3rem;
  font-weight:900;
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .2s;
  flex-shrink:0;
}
.vt-help-btn:hover{
  border-color:var(--game-primary);
  color:var(--game-primary);
  box-shadow:0 0 14px color-mix(in srgb, var(--game-primary) 40%, transparent);
  transform:scale(1.08);
}

/* ══════════════════════════════════════════════════════════════
   CLOSE / X BUTTON OVERRIDE — fun version
   ══════════════════════════════════════════════════════════════ */
.game-close{
  position:fixed;
  top:1rem; right:1rem;
  z-index:50;
  width:46px; height:46px;
  border-radius:50%;
  background:rgba(255,255,255,.1);
  border:2px solid rgba(255,255,255,.22);
  color:#fff;
  font-size:1.2rem;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer;
  backdrop-filter:blur(10px);
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
  line-height:1;
  text-decoration:none;
  font-weight:900;
  box-shadow:0 4px 16px rgba(0,0,0,.25);
}
.game-close:hover{
  background:rgba(239,68,68,.55);
  border-color:rgba(239,68,68,.7);
  transform:scale(1.15) rotate(10deg);
  box-shadow:0 0 20px rgba(239,68,68,.45), 0 6px 20px rgba(0,0,0,.3);
  color:#fff;
}
.game-close:active{ transform:scale(.92) rotate(0deg); }

[data-curriculum="pb"] .game-close{
  background:#fff;
  border:3px solid var(--game-primary);
  color:var(--game-primary);
  box-shadow:0 4px 0 #ffb0d8, 0 6px 16px rgba(255,110,180,.25);
}
[data-curriculum="pb"] .game-close:hover{
  background:#fff0f8;
  transform:rotate(14deg) scale(1.15);
  box-shadow:0 4px 0 #ffb0d8, 0 0 16px rgba(255,110,180,.4);
}
[data-curriculum="bc"] .game-close{
  border-color:rgba(0,240,255,.22);
  box-shadow:0 0 14px rgba(0,240,255,.1);
}
[data-curriculum="bc"] .game-close:hover{
  background:rgba(0,240,255,.14);
  border-color:var(--game-primary);
  box-shadow:0 0 24px rgba(0,240,255,.35);
  transform:scale(1.12) rotate(8deg);
}

/* ══════════════════════════════════════════════════════════════
   HOW TO PLAY MODAL
   ══════════════════════════════════════════════════════════════ */
.vt-modal-overlay{
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,.72);
  backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  opacity:0; pointer-events:none;
  transition:opacity .25s;
}
.vt-modal-overlay.open{
  opacity:1; pointer-events:all;
}
.vt-modal{
  max-width:480px; width:calc(100% - 2rem);
  border-radius:28px;
  overflow:hidden;
  background:var(--game-bg);
  border:2px solid var(--game-primary);
  box-shadow:0 0 48px color-mix(in srgb, var(--game-primary) 30%, transparent), 0 24px 48px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
.vt-modal-overlay.open .vt-modal{
  transform:none;
}

[data-curriculum="pb"] .vt-modal{
  background:#fff8fc;
  border-color:var(--game-primary);
  box-shadow:0 8px 0 #ffb0d8, 0 16px 40px rgba(255,110,180,.25);
}
[data-curriculum="bc"] .vt-modal{
  background:#030810;
  border-color:var(--game-primary);
}

.vt-modal-header{
  padding:1.2rem 1.4rem .8rem;
  background:linear-gradient(135deg, color-mix(in srgb, var(--game-primary) 14%, transparent), color-mix(in srgb, var(--game-secondary) 8%, transparent));
  border-bottom:1px solid var(--game-border);
  text-align:center;
}
.vt-modal-title{
  font-family:var(--game-font-title);
  font-size:clamp(20px,4vw,28px);
  color:var(--game-primary);
  text-shadow:0 0 16px color-mix(in srgb, var(--game-primary) 55%, transparent);
  letter-spacing:.06em;
}
.vt-modal-title-jp{
  font-family:var(--game-font-jp);
  font-size:clamp(12px,2vw,15px);
  color:var(--game-muted);
  margin-top:4px;
}

.vt-modal-body{
  padding:1.2rem 1.4rem 1.4rem;
}
.vt-how-step{
  display:grid;
  grid-template-columns:36px 1fr;
  gap:10px;
  align-items:start;
  margin-bottom:.95rem;
}
.vt-how-step:last-child{ margin-bottom:0; }
.vt-how-num{
  width:36px; height:36px;
  border-radius:50%;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000;
  font-family:var(--game-font-title);
  font-size:clamp(14px,2.5vw,18px);
  font-weight:900;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
  box-shadow:0 0 12px color-mix(in srgb, var(--game-primary) 45%, transparent);
}
.vt-how-text{
  padding-top:6px;
}
.vt-how-en{
  font-family:var(--game-font-body);
  font-size:clamp(13px,2.2vw,15px);
  font-weight:800;
  color:var(--game-ink);
  line-height:1.35;
}
.vt-how-jp{
  font-family:var(--game-font-jp);
  font-size:clamp(11px,1.8vw,13px);
  color:var(--game-muted);
  margin-top:2px;
  line-height:1.4;
}

.vt-modal-close{
  display:block;
  width:100%;
  margin-top:1.2rem;
  font-family:var(--game-font-title);
  font-size:clamp(15px,2.8vw,19px);
  letter-spacing:.06em;
  padding:13px;
  border-radius:999px;
  border:none;
  cursor:pointer;
  background:linear-gradient(135deg, var(--game-primary), var(--game-secondary));
  color:#000;
  font-weight:900;
  box-shadow:0 0 20px color-mix(in srgb, var(--game-primary) 45%, transparent);
  transition:transform .15s, box-shadow .15s;
}
.vt-modal-close:hover{ transform:scale(1.03); }
.vt-modal-close:active{ transform:scale(.96); }

/* ══════════════════════════════════════════════════════════════
   RESULTS PANEL
   ══════════════════════════════════════════════════════════════ */
.vt-results{
  display:none;
  text-align:center;
  max-width:560px;
  margin:1.5rem auto;
  padding:2.6rem 1.6rem 2rem;
  border-radius:32px;
  position:relative;
  overflow:hidden;
}
.vt-results.show{
  display:block;
  animation:vtResultIn .5s cubic-bezier(.22,.8,.36,1) both;
}
@keyframes vtResultIn{
  from{ opacity:0; transform:scale(.84) translateY(24px); }
  to{ opacity:1; transform:none; }
}

/* tier-colored border + glow */
.vt-results{
  border:2.5px solid var(--tier-color, var(--game-primary));
  background:color-mix(in srgb, var(--tier-color, var(--game-primary)) 6%, var(--game-bg));
  box-shadow:
    0 0 60px color-mix(in srgb, var(--tier-color, var(--game-primary)) 22%, transparent),
    0 24px 48px rgba(0,0,0,.4);
}

/* animated rainbow top bar */
.vt-results::before{
  content:'';
  position:absolute;
  top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,var(--game-primary),var(--game-secondary),var(--game-accent),var(--game-primary));
  background-size:220% auto;
  animation:vtRainbowShift 2.4s linear infinite;
}

/* sparkle particles inside results */
.vt-results::after{
  content:'';
  position:absolute; inset:0; z-index:0;
  background:
    radial-gradient(circle at 20% 80%, color-mix(in srgb, var(--tier-color, var(--game-primary)) 12%, transparent) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--game-secondary) 8%, transparent) 0%, transparent 50%);
  pointer-events:none;
}

.vt-res-inner{ position:relative; z-index:1; }


.vt-res-score{
  font-family:var(--game-font-title);
  font-size:clamp(62px,16vw,98px);
  line-height:1;
  color:var(--tier-color, var(--game-primary));
  text-shadow:0 0 28px var(--tier-color, var(--game-primary));
  margin-bottom:4px;
  animation:vtScoreCount .5s cubic-bezier(.22,.8,.36,1) .35s both;
}
@keyframes vtScoreCount{
  from{ transform:scale(.6); opacity:0; }
  to{ transform:none; opacity:1; }
}

.vt-res-pct{
  font-size:clamp(14px,2.6vw,19px);
  color:var(--game-muted);
  font-weight:700;
  margin-bottom:12px;
}

.vt-res-label{
  font-family:var(--game-font-title);
  font-size:clamp(26px,5.5vw,40px);
  color:var(--tier-color, var(--game-primary));
  margin-bottom:12px;
  letter-spacing:.05em;
  text-shadow:0 0 18px color-mix(in srgb, var(--tier-color, var(--game-primary)) 55%, transparent);
  animation:vtLabelSlide .45s ease .5s both;
}
@keyframes vtLabelSlide{
  from{ transform:translateY(12px); opacity:0; }
  to{ transform:none; opacity:1; }
}

.vt-res-divider{
  width:60px; height:3px;
  border-radius:99px;
  background:linear-gradient(90deg, var(--game-primary), var(--game-secondary));
  margin:0 auto 14px;
  opacity:.6;
  animation:vtLabelSlide .45s ease .55s both;
}

.vt-res-en{
  font-family:var(--game-font-body);
  font-weight:900;
  font-size:clamp(14px,2.4vw,18px);
  color:var(--game-ink);
  margin-bottom:5px;
  animation:vtLabelSlide .45s ease .6s both;
}
.vt-res-jp{
  font-family:var(--game-font-jp);
  font-size:clamp(14px,2.2vw,17px);
  color:var(--game-muted);
  margin-bottom:3px;
  animation:vtLabelSlide .45s ease .65s both;
}
.vt-res-kanji{
  font-family:var(--game-font-jp);
  font-size:clamp(11px,1.8vw,14px);
  color:var(--game-muted);
  opacity:.7;
  margin-bottom:1.5rem;
  animation:vtLabelSlide .45s ease .7s both;
}

.vt-res-actions{
  display:flex;
  gap:12px;
  justify-content:center;
  flex-wrap:wrap;
  animation:vtLabelSlide .45s ease .8s both;
}

/* ── confetti burst on perfect ── */
@keyframes vtConfetti{
  0%{ transform:translate(0,0) rotate(0deg) scale(1); opacity:1; }
  100%{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; }
}
.vt-confetti-piece{
  position:fixed;
  width:9px; height:9px;
  border-radius:2px;
  pointer-events:none;
  z-index:9999;
  animation:vtConfetti 1.1s ease-out forwards;
}
`;
document.head.appendChild(S);

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

  <div class="vt-bottom-bar">
    <button class="vt-hira-btn" id="vt-hira-toggle" title="Toggle hiragana / kanji">
      <span class="vt-hira-icon">あ</span>
      <span id="vt-hira-label">ひらがな</span>
    </button>
    <button class="vt-check-btn" id="vt-check" disabled>CHECK</button>
    <button class="vt-help-btn" id="vt-help" title="How to play">？</button>
  </div>

  <div class="vt-results" id="vt-results">
    <div class="vt-res-inner">
      <div class="vt-res-score" id="vt-rs"></div>
      <div class="vt-res-pct" id="vt-rp"></div>
      <div class="vt-res-label" id="vt-rl"></div>
      <div class="vt-res-divider"></div>
      <div class="vt-res-en" id="vt-re"></div>
      <div class="vt-res-jp" id="vt-rj"></div>
      <div class="vt-res-kanji" id="vt-rk"></div>
      <div class="vt-res-actions">
        <button class="game-btn game-btn-primary" id="vt-replay">もう一度</button>
        <button class="game-btn game-btn-secondary" id="vt-back">メニューへ</button>
      </div>
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
const scoreEl     = document.getElementById('vt-score');
const enBank      = document.getElementById('vt-en-bank');
const jpSlots     = document.getElementById('vt-jp-slots');
const checkBtn    = document.getElementById('vt-check');
const gameEl      = document.getElementById('vt-game');
const bottomBar   = document.querySelector('.vt-bottom-bar');
const results     = document.getElementById('vt-results');
const hiraBtn     = document.getElementById('vt-hira-toggle');
const hiraLabel   = document.getElementById('vt-hira-label');
const helpBtn     = document.getElementById('vt-help');
const modalOverlay= document.getElementById('vt-modal-overlay');

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
   HELP MODAL
   ══════════════════════════════════════════════════════════════ */
function openModal() { modalOverlay.classList.add('open'); }
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
  _animatedKeys = new Set();
  enBank.innerHTML  = '';  /* clear old cards so new round's cards are created fresh */
  jpSlots.innerHTML = '';
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

/* Track which card keys have been intro-animated already this round */
let _animatedKeys = new Set();

function renderEnBank() {
  const pairedKeys = new Set(Object.values(pairs));

  roundCards.forEach((card, idx) => {
    const isPaired   = pairedKeys.has(card._key);
    const isSelected = selectedEnKey === card._key;
    const domId      = `vt-en-${card._key.replace(/[^a-zA-Z0-9]/g,'_')}`;

    let btn = document.getElementById(domId);

    if (!btn) {
      /* First render for this card this round — create it */
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id   = domId;
      btn.style.setProperty('--i', idx);
      btn.innerHTML = `<div class="vt-card-inner"><div class="vt-en-text">${card.en}</div></div>`;

      /* Play on touchstart for mobile — fires in same gesture as audio unlock */
      btn.addEventListener('touchstart', (e) => {
        if (globalLocked || btn.classList.contains('leaving')) return;
        e.preventDefault();
        unlockAllAudio();
        const curPaired = new Set(Object.values(pairs));
        if (curPaired.has(card._key)) return;
        const curSelected = selectedEnKey === card._key;
        playWord(card.mp3);
        selectedEnKey = curSelected ? null : card._key;
        render();
      }, { passive: false });

      btn.addEventListener('click', (e) => {
        /* Skip on touch — touchstart already handled it */
        if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
        if (globalLocked || btn.classList.contains('leaving')) return;
        const curPaired = new Set(Object.values(pairs));
        if (curPaired.has(card._key)) return;
        const curSelected = selectedEnKey === card._key;
        playWord(card.mp3);
        selectedEnKey = curSelected ? null : card._key;
        render();
      });

      enBank.appendChild(btn);

      /* Trigger intro animation only once per card per round */
      if (!_animatedKeys.has(card._key)) {
        _animatedKeys.add(card._key);
        btn.classList.add('animating');
        /* Remove after animation completes so it never re-triggers */
        const dur = 380 + idx * 60 + 50;
        setTimeout(() => btn.classList.remove('animating'), dur);
      }
    }

    /* Surgically update classes without touching innerHTML */
    btn.className = 'vt-en-card'
      + (isSelected ? ' selected' : '')
      + (isPaired   ? ' leaving'  : '');
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
      <div class="vt-jp-word-wrap">
        <span class="vt-jp-kanji">${card.jp}</span>
        <span class="vt-jp-hira-text">${card.hira || card.jp}</span>
      </div>
      <div class="vt-drop${pairedCard ? ' filled' : ' empty'}">
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
   CHECK — one-by-one grading
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
   CONFETTI BURST
   ══════════════════════════════════════════════════════════════ */
function fireConfetti() {
  const colors = ['#ffcc00','#aaff22','#ff2288','#22ddff','#cc88ff','#ff6600','#ffffff'];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'vt-confetti-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist  = 120 + Math.random() * 260;
    el.style.cssText = `
      left:${cx}px; top:${cy}px;
      background:${colors[i % colors.length]};
      --cx:${Math.cos(angle)*dist}px;
      --cy:${Math.sin(angle)*dist}px;
      --cr:${(Math.random()-0.5)*720}deg;
      animation-delay:${Math.random()*0.22}s;
      animation-duration:${0.9+Math.random()*0.5}s;
      border-radius:${Math.random()>0.5?'50%':'2px'};
      width:${6+Math.random()*8}px;
      height:${6+Math.random()*8}px;
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* ══════════════════════════════════════════════════════════════
   RESULTS
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  updateDots(3);
  [gameEl, bottomBar].forEach(el => { if (el) el.style.display = 'none'; });
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

  /* fire confetti on perfect */
  if (score === 15) {
    setTimeout(fireConfetti, 400);
    setTimeout(fireConfetti, 800);
  }

  /* play result sound */
  const snd = new Audio(CFG.sfxBase + tier.sound);
  snd.setAttribute('playsinline', '');
  snd.play().catch(() => {});
}

/* ══════════════════════════════════════════════════════════════
   REPLAY / BACK
   ══════════════════════════════════════════════════════════════ */
document.getElementById('vt-replay').addEventListener('click', () => {
  results.classList.remove('show');
  [gameEl, bottomBar].forEach(el => { if (el) el.style.display = ''; });
  score = 0;
  scoreEl.textContent = '0';
  document.body.classList.remove('hira-mode');
  hiraMode = false;
  hiraLabel.textContent = 'ひらがな';
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
