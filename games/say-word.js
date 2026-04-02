
/* ══════════════════════════════════════════════════════════════
   say-word.js  —  Say the Word  v3
   Show big JP card → mic to say it (Android/Desktop)
                   → 4-choice tap (iOS — can still get it wrong)
   Heat: correct = ding + word-dance + audio + auto-advance
   Full themed results panel (speaking-focused messages).
   3 curricula: br / pb / bc
   ══════════════════════════════════════════════════════════════ */

(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Say the Word');
U.unlockAudio();

const isIOS = U.isIOS();

/* ══════════════════════════════════════════════════════════════
   PRE-LOAD SFX — plain Audio objects, cloned on each play
   This bypasses U.playSFX entirely and works reliably on desktop
   ══════════════════════════════════════════════════════════════ */
const SFX = {};
function loadSfx(name, url) {
  return new Promise(resolve => {
    const a = new Audio(url);
    a.setAttribute('playsinline', '');
    a.setAttribute('webkit-playsinline', '');
    a.addEventListener('canplaythrough', () => { SFX[name] = a; resolve(); }, { once: true });
    a.addEventListener('error', resolve, { once: true });
    a.load();
    /* Fallback if canplaythrough never fires */
    setTimeout(() => { if (!SFX[name]) { SFX[name] = a; resolve(); } }, 2000);
  });
}
function playSfx(name) {
  const src = SFX[name];
  if (!src) return;
  try {
    const clone = src.cloneNode();
    clone.setAttribute('playsinline', '');
    clone.setAttribute('webkit-playsinline', '');
    clone.play().catch(() => {});
  } catch(e) {}
}

await Promise.all([
  loadSfx('ding', CFG.sfxBase + 'ding.mp3'),
  loadSfx('fart', CFG.sfxBase + 'fart.mp3'),
]);


/* ── Persistent word-audio element (iOS-safe, unlocked on first gesture) ── */
const wordAudio = new Audio();
wordAudio.setAttribute('playsinline', '');
wordAudio.setAttribute('webkit-playsinline', '');
   
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
  const MM = {jan:'January',feb:'February',mar:'March',apr:'April',
    may:'May',jun:'June',jul:'July',aug:'August',
    sep:'September',oct:'October',nov:'November',dec:'December'};
  return `${MM[m[1].toLowerCase()]} Week ${m[2]}`;
}

/* ══════════════════════════════════════════════════════════════
   TIERS  — speaking-focused
   ══════════════════════════════════════════════════════════════ */
const TIERS = [
  { min:0,  max:5,  sound:'result_0-5.mp3',
    label:'KEEP SPEAKING',
    en:"Your voice is getting stronger — keep at it!",
    jp:'もっと声に出して練習しよう！',
    kanji:'発声練習を続けよう！',
    color:'#f43f5e' },
  { min:6,  max:10, sound:'result_6-10.mp3',
    label:'GOOD VOICE!',
    en:"You're speaking up — that takes courage!",
    jp:'声が出てる！すごく勇気がいるね！',
    kanji:'勇気を出して発声！素晴らしい！',
    color:'#f97316' },
  { min:11, max:14, sound:'result_11-14.mp3',
    label:'ALMOST PERFECT',
    en:'Nearly flawless pronunciation — amazing!',
    jp:'ほぼ完璧な発音！すごい！',
    kanji:'ほぼ完璧な発音！驚異的！',
    color:'#22d3ee' },
  { min:15, max:15, sound:'result_15.mp3',
    label:'PERFECT VOICE!',
    en:'Flawless! You said every word perfectly!',
    jp:'全部の言葉をきれいに言えた！完璧！',
    kanji:'全言語完璧発音！最強の声！',
    color:'#a78bfa' },
];
const getTier = s => TIERS.find(t => s >= t.min && s <= t.max) ?? TIERS[0];

/* ══════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `

/* Rainbow twinkle — fires on correct mic answer */
.stw-heard-box.heard-correct{
  animation:stwRainbowTwinkle .9s ease forwards;
}
@keyframes stwRainbowTwinkle{
  0%  { background:rgba(167,139,250,.2); border-color:#a78bfa; box-shadow:0 0 0 3px rgba(167,139,250,.2); }
  20% { background:rgba(255,44,136,.15); border-color:#ff2288; box-shadow:0 0 18px rgba(255,44,136,.5); }
  40% { background:rgba(255,204,0,.15);  border-color:#ffcc00; box-shadow:0 0 18px rgba(255,204,0,.5); }
  60% { background:rgba(170,255,34,.15); border-color:#aaff22; box-shadow:0 0 18px rgba(170,255,34,.5); }
  80% { background:rgba(34,221,255,.15); border-color:#22ddff; box-shadow:0 0 18px rgba(34,221,255,.5); }
  100%{ background:rgba(34,197,94,.12);  border-color:#22c55e; box-shadow:0 0 14px rgba(34,197,94,.4); }
}

.game-header{ display:none !important; }
.stw-wrap{
  max-width:640px; margin:0 auto;
  padding:0 1rem 6rem;
  display:flex; flex-direction:column; align-items:center; gap:0;
}

/* ══ HEADER ══ */
.stw-header{ text-align:center; padding:.6rem 3rem .6rem; width:100%; max-width:640px; margin:0 auto; }
.stw-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(26px,5.5vw,48px);
  font-weight:900; letter-spacing:.12em; text-transform:uppercase;
  background:linear-gradient(90deg,#ff2288,#ffcc00,#aaff22,#22ddff,#cc88ff,#ff2288);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text; animation:stwRainbow 3s linear infinite;
}
[data-curriculum="bc"] .stw-curriculum{
  background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .stw-curriculum{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
@keyframes stwRainbow{ to{ background-position:220% center; } }
.stw-date{
  margin-top:3px; font-family:var(--game-font-body);
  font-size:clamp(11px,2vw,14px); font-weight:800;
  color:var(--game-muted); letter-spacing:.06em;
}
[data-curriculum="pb"] .stw-date{ color:rgba(58,26,46,.55); }

/* ══ PROGRESS DOTS ══ */
.stw-dots-row{ display:flex; justify-content:center; gap:6px; margin:.35rem 0 .5rem; flex-wrap:wrap; width:100%; }
.stw-dot{
  width:10px; height:10px; border-radius:50%;
  background:rgba(255,255,255,.12); border:1.5px solid rgba(255,255,255,.18);
  transition:all .3s; flex-shrink:0;
}
.stw-dot.active{ background:#a78bfa; border-color:#a78bfa; box-shadow:0 0 8px #a78bfa; }
.stw-dot.done{ background:#22c55e; border-color:#22c55e; box-shadow:0 0 8px rgba(34,197,94,.7); }
[data-curriculum="pb"] .stw-dot{ background:rgba(255,110,180,.15); border-color:rgba(255,110,180,.28); }
[data-curriculum="pb"] .stw-dot.active{ background:#ff9922; border-color:#ff9922; box-shadow:0 0 8px #ff9922; }

/* ══ HUD ══ */
.stw-hud{ display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin-bottom:.5rem; width:100%; }
.stw-pill{
  padding:6px 18px; border-radius:999px;
  background:var(--game-pill-bg); border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text); font-size:clamp(13px,2.2vw,16px); font-weight:900; letter-spacing:.03em;
  box-shadow:0 2px 12px rgba(0,0,0,.2);
}
.stw-pill b{ color:#a78bfa; font-size:1.1em; text-shadow:0 0 10px #a78bfa; }
[data-curriculum="bc"] .stw-pill b{ color:#00ddff; text-shadow:0 0 10px #00ddff; }
[data-curriculum="pb"] .stw-pill{ background:#fff; border-color:#ffb0d8; color:#2a1020; box-shadow:0 3px 0 #ffccdd; }
[data-curriculum="pb"] .stw-pill b{ color:#ff9922; text-shadow:none; }

/* ══ JP CARD ══ */
.stw-jp-card{
  width:100%; border-radius:28px;
  padding:1.6rem 1.6rem 1.4rem;
  margin-bottom:1rem;
  text-align:center; position:relative; overflow:hidden;
  background:var(--game-surface); border:2.5px solid var(--game-border);
  box-shadow:0 10px 40px rgba(0,0,0,.28), 0 0 0 1px rgba(255,255,255,.05);
  transition:box-shadow .4s;
  container-type:inline-size;
}
[data-curriculum="br"] .stw-jp-card{
  background:linear-gradient(145deg,rgba(167,139,250,.08),rgba(255,204,0,.04),rgba(0,0,0,.22));
  border-color:rgba(167,139,250,.28);
}
[data-curriculum="bc"] .stw-jp-card{
  background:linear-gradient(145deg,rgba(0,240,255,.06),rgba(68,85,255,.08),rgba(0,0,0,.28));
  border-color:rgba(0,240,255,.22);
}
[data-curriculum="pb"] .stw-jp-card{
  background:#ffffff; border:3px solid #cc88ff;
  box-shadow:0 6px 0 #ddb8ff, 0 12px 28px rgba(180,100,255,.12);
}
.stw-jp-card::before{
  content:''; position:absolute; top:0; left:0; right:0; height:4px;
  background:linear-gradient(90deg,#a78bfa,#ff2288,#ffcc00,#aaff22,#22ddff,#a78bfa);
  background-size:220% auto; animation:stwRainbow 2.4s linear infinite;
}
[data-curriculum="bc"] .stw-jp-card::before{
  background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff); background-size:220% auto;
}
[data-curriculum="pb"] .stw-jp-card::before{
  background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4); background-size:220% auto;
}

/* mode badge */
.stw-mode-badge{
  display:inline-flex; align-items:center; gap:5px;
  padding:4px 14px; border-radius:99px; margin-bottom:.8rem;
  font-family:var(--game-font-body); font-size:clamp(10px,1.8vw,12px);
  font-weight:800; letter-spacing:.14em; text-transform:uppercase;
  background:rgba(167,139,250,.14); border:1px solid rgba(167,139,250,.3); color:#a78bfa;
}
[data-curriculum="bc"] .stw-mode-badge{ background:rgba(0,220,255,.1); border-color:rgba(0,220,255,.3); color:#00ddff; }
[data-curriculum="pb"] .stw-mode-badge{ background:rgba(204,136,255,.12); border-color:rgba(204,136,255,.35); color:#aa44cc; }
.stw-mode-dot{
  width:7px; height:7px; border-radius:50%; background:#a78bfa;
  animation:stwDotBlink 1.4s ease-in-out infinite;
}
[data-curriculum="bc"] .stw-mode-dot{ background:#00ddff; }
[data-curriculum="pb"] .stw-mode-dot{ background:#cc88ff; }
.stw-jp-card.listening .stw-mode-dot{ background:#22c55e; animation:stwDotBlink .7s ease-in-out infinite; }
@keyframes stwDotBlink{ 0%,100%{ opacity:1; } 50%{ opacity:.3; } }

/* ── JP word — auto-sizes via JS-set --stw-jp-len ── */
.stw-jp-word{
  font-family:var(--game-font-jp); font-weight:900;
  /* Base size scales down as character count grows */
  font-size:clamp(28px, calc(17cqi - var(--stw-jp-len, 0) * 1.2cqi), 88px);
  line-height:1.2; color:var(--game-ink);
  word-break:break-all; overflow-wrap:anywhere;
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
[data-curriculum="pb"] .stw-jp-word{ color:#2a1020; }

.stw-hira{
  margin-top:.4rem; font-family:var(--game-font-jp);
  font-size:clamp(12px,2.4vw,18px); color:var(--game-muted);
  word-break:break-all;
}
[data-curriculum="pb"] .stw-hira{ color:rgba(58,26,46,.55); }

/* card states */
.stw-jp-card.dancing .stw-jp-word{ animation:stwDance .6s ease-in-out infinite alternate; }
@keyframes stwDance{
  0%{ transform:scale(1.0) rotate(-2deg); }
  33%{ transform:scale(1.12) rotate(3deg); }
  66%{ transform:scale(1.08) rotate(-3deg); }
  100%{ transform:scale(1.14) rotate(2deg); }
}
.stw-jp-card.correct-state{
  border-color:#22c55e !important;
  box-shadow:0 0 0 4px rgba(34,197,94,.2), 0 0 50px rgba(34,197,94,.3), 0 10px 40px rgba(0,0,0,.3) !important;
}
[data-curriculum="pb"] .stw-jp-card.correct-state{
  border-color:#22c55e !important;
  box-shadow:0 6px 0 #86efac, 0 0 30px rgba(34,197,94,.25), 0 10px 28px rgba(0,0,0,.1) !important;
}
.stw-jp-card.wrong-state{
  animation:stwCardShake .45s ease;
  border-color:#ef4444 !important;
  box-shadow:0 0 0 4px rgba(239,68,68,.2), 0 0 40px rgba(239,68,68,.3) !important;
}
@keyframes stwCardShake{
  0%,100%{ transform:translateX(0); }
  15%{ transform:translateX(-10px); } 35%{ transform:translateX(10px); }
  55%{ transform:translateX(-6px); } 75%{ transform:translateX(6px); }
}
.stw-jp-card.listening{
  border-color:rgba(34,197,94,.6) !important;
  animation:stwListenPulse 1s ease-in-out infinite;
}
@keyframes stwListenPulse{
  0%,100%{ box-shadow:0 0 0 4px rgba(34,197,94,.15), 0 10px 40px rgba(0,0,0,.35); }
  50%{     box-shadow:0 0 0 12px rgba(34,197,94,.28), 0 10px 50px rgba(0,0,0,.45); }
}
.stw-jp-card.listening .stw-mode-dot{ background:#22c55e; }

/* ══ HEARD BOX ══ */
.stw-heard-box{
  width:100%; min-height:48px;
  display:flex; align-items:center; justify-content:center;
  border-radius:16px; padding:.65rem 1.2rem;
  margin-bottom:.75rem;
  background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.1);
  font-family:var(--game-font-body); font-size:clamp(14px,2.6vw,18px);
  font-weight:700; letter-spacing:.03em; color:var(--game-muted);
  transition:border-color .3s, color .3s, background .3s;
}
.stw-heard-box.heard-wrong{
  background:rgba(239,68,68,.1); border-color:#ef4444; color:#ef4444;
  animation:stwCardShake .4s ease;
}
[data-curriculum="pb"] .stw-heard-box{
  background:#fff; border-color:#e8d4ff; color:rgba(58,26,46,.45); box-shadow:0 3px 0 #eeddff;
}
[data-curriculum="pb"] .stw-heard-box.heard-wrong{
  border-color:#ef4444; color:#ef4444; background:#fff5f5; box-shadow:0 3px 0 #fca5a5;
}

/* ══ MIC BUTTON ══ */
.stw-mic-btn{
  width:80px; height:80px; border-radius:50%;
  border:none; cursor:pointer; outline:none;
  background:linear-gradient(135deg, #a78bfa, #7c3aed);
  box-shadow:0 0 28px rgba(167,139,250,.5), 0 6px 0 rgba(80,20,160,.5), 0 10px 24px rgba(0,0,0,.3);
  display:flex; align-items:center; justify-content:center;
  transition:transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .15s;
  -webkit-tap-highlight-color:transparent; position:relative; overflow:hidden;
  margin:0 auto .75rem;
}
[data-curriculum="bc"] .stw-mic-btn{
  background:linear-gradient(135deg, #00ddff, #0055cc);
  box-shadow:0 0 28px rgba(0,200,220,.5), 0 6px 0 rgba(0,30,120,.5), 0 10px 24px rgba(0,0,0,.3);
}
[data-curriculum="pb"] .stw-mic-btn{
  background:linear-gradient(135deg, #ff6eb4, #cc44aa);
  box-shadow:0 0 28px rgba(255,110,180,.5), 0 6px 0 #ffb0d8, 0 10px 24px rgba(0,0,0,.2);
}
.stw-mic-btn svg{ width:36px; height:36px; fill:#fff; display:block; }
.stw-mic-btn:hover{ transform:translateY(-3px) scale(1.07); }
.stw-mic-btn:active{ transform:scale(.9); }
.stw-mic-btn:disabled{ opacity:.35; pointer-events:none; transform:none !important; box-shadow:none !important; }
.stw-mic-btn.listening{
  background:linear-gradient(135deg, #22c55e, #15803d);
  animation:stwMicRing 1s ease-out infinite;
}
[data-curriculum="bc"] .stw-mic-btn.listening{
  background:linear-gradient(135deg, #a78bfa, #7c3aed);
  animation:stwMicRingPurple 1s ease-out infinite;
}
@keyframes stwMicRing{
  0%{  box-shadow:0 0 0 0    rgba(34,197,94,.7),  0 6px 0 rgba(10,80,30,.5),  0 10px 24px rgba(0,0,0,.35); }
  70%{ box-shadow:0 0 0 26px rgba(34,197,94,0),   0 6px 0 rgba(10,80,30,.5),  0 10px 24px rgba(0,0,0,.35); }
  100%{box-shadow:0 0 0 0    rgba(34,197,94,0),   0 6px 0 rgba(10,80,30,.5),  0 10px 24px rgba(0,0,0,.35); }
}
@keyframes stwMicRingPurple{
  0%{  box-shadow:0 0 0 0    rgba(167,139,250,.7), 0 6px 0 rgba(60,10,160,.5), 0 10px 24px rgba(0,0,0,.35); }
  70%{ box-shadow:0 0 0 26px rgba(167,139,250,0),  0 6px 0 rgba(60,10,160,.5), 0 10px 24px rgba(0,0,0,.35); }
  100%{box-shadow:0 0 0 0    rgba(167,139,250,0),  0 6px 0 rgba(60,10,160,.5), 0 10px 24px rgba(0,0,0,.35); }
}

/* hint */
.stw-hint{
  font-family:var(--game-font-jp); font-size:clamp(11px,1.9vw,14px);
  color:var(--game-muted); text-align:center; margin-bottom:.6rem; line-height:1.45;
}
[data-curriculum="pb"] .stw-hint{ color:rgba(58,26,46,.5); }

/* ══ iOS 4-CHOICE GRID ══ */
.stw-ios-grid{
  width:100%; display:grid; grid-template-columns:1fr 1fr;
  gap:12px; margin-bottom:.75rem;
}
@media(max-width:380px){ .stw-ios-grid{ grid-template-columns:1fr; } }

.stw-ios-choice{
  min-height:72px; padding:.85rem .9rem;
  border-radius:18px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  text-align:center; position:relative; overflow:hidden;
  font-family:var(--game-font-body); font-size:clamp(14px,2.8vw,20px);
  font-weight:700; line-height:1.2; text-transform:lowercase;
  -webkit-tap-highlight-color:transparent; user-select:none;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, filter .14s;
  background:linear-gradient(145deg,rgba(167,139,250,.14),rgba(120,80,220,.08));
  border:2px solid rgba(167,139,250,.28); color:var(--game-tile-text);
  box-shadow:0 5px 0 rgba(0,0,0,.28), 0 8px 18px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.1);
}
.stw-ios-choice::after{
  content:''; position:absolute; top:-60%; left:-80%; width:50%; height:200%;
  background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.22) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .45s ease; pointer-events:none;
}
.stw-ios-choice:hover::after{ left:150%; }
.stw-ios-choice:hover{ transform:translateY(-3px) scale(1.02); filter:brightness(1.1); }
.stw-ios-choice:active{ transform:scale(.94); }

.stw-ios-choice.ios-correct{
  background:linear-gradient(135deg,#0a3d1a,#0d5e28) !important;
  border-color:#22c55e !important; color:#22c55e !important;
  box-shadow:0 0 0 4px rgba(34,197,94,.3), 0 0 36px rgba(34,197,94,.5), 0 6px 24px rgba(0,0,0,.3) !important;
  transform:scale(1.04) !important;
  animation:stwChoicePop .4s cubic-bezier(.34,1.56,.64,1);
}
@keyframes stwChoicePop{ from{ transform:scale(.9); } 60%{ transform:scale(1.08); } to{ transform:scale(1.04); } }
.stw-ios-choice.ios-wrong{
  background:linear-gradient(135deg,#3d0a0a,#5e1010) !important;
  border-color:#ef4444 !important; color:#ef4444 !important;
  box-shadow:0 0 0 4px rgba(239,68,68,.25), 0 0 32px rgba(239,68,68,.5) !important;
  animation:stwWrongShake .45s ease;
}
@keyframes stwWrongShake{
  0%,100%{ transform:translateX(0); }
  15%{ transform:translateX(-8px); } 35%{ transform:translateX(8px); }
  55%{ transform:translateX(-5px); } 75%{ transform:translateX(5px); }
}
.stw-ios-choice.ios-locked{ opacity:.42; pointer-events:none; transform:none !important; }

/* BR palette */
[data-curriculum="br"] .stw-ios-choice[data-ci="0"]{ background:linear-gradient(145deg,#4a2800,#703800); border:2px solid rgba(255,170,0,.55); color:#fff; box-shadow:0 5px 0 rgba(80,40,0,.6),0 8px 18px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15); }
[data-curriculum="br"] .stw-ios-choice[data-ci="1"]{ background:linear-gradient(145deg,#5a1200,#8a1e00); border:2px solid rgba(255,90,40,.55); color:#fff; box-shadow:0 5px 0 rgba(80,10,0,.6),0 8px 18px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15); }
[data-curriculum="br"] .stw-ios-choice[data-ci="2"]{ background:linear-gradient(145deg,#3a3000,#5a4a00); border:2px solid rgba(220,200,0,.5); color:#fff; box-shadow:0 5px 0 rgba(50,40,0,.6),0 8px 18px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15); }
[data-curriculum="br"] .stw-ios-choice[data-ci="3"]{ background:linear-gradient(145deg,#40100a,#601814); border:2px solid rgba(255,80,60,.55); color:#fff; box-shadow:0 5px 0 rgba(60,10,8,.6),0 8px 18px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15); }
[data-curriculum="br"] .stw-ios-choice:hover{ filter:brightness(1.16); }
/* BC palette */
[data-curriculum="bc"] .stw-ios-choice[data-ci="0"]{ background:linear-gradient(145deg,#041e18,#062e24); border:2px solid rgba(0,220,180,.55); color:#e0fff8; box-shadow:0 5px 0 rgba(0,20,15,.7),0 8px 18px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08); }
[data-curriculum="bc"] .stw-ios-choice[data-ci="1"]{ background:linear-gradient(145deg,#041820,#062430); border:2px solid rgba(0,200,240,.5); color:#e0fff8; box-shadow:0 5px 0 rgba(0,15,25,.7),0 8px 18px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08); }
[data-curriculum="bc"] .stw-ios-choice[data-ci="2"]{ background:linear-gradient(145deg,#180828,#24103a); border:2px solid rgba(170,80,255,.55); color:#f5ecff; box-shadow:0 5px 0 rgba(20,0,40,.7),0 8px 18px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08); }
[data-curriculum="bc"] .stw-ios-choice[data-ci="3"]{ background:linear-gradient(145deg,#042018,#063028); border:2px solid rgba(40,230,160,.5); color:#e0fff8; box-shadow:0 5px 0 rgba(0,20,15,.7),0 8px 18px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08); }
[data-curriculum="bc"] .stw-ios-choice:hover{ filter:brightness(1.18); }
/* PB palette */
[data-curriculum="pb"] .stw-ios-choice[data-ci="0"]{ background:#fff; border:2.5px solid #ff6eb4; color:#2a1020; box-shadow:0 5px 0 #ffb0d8,0 8px 18px rgba(255,110,180,.12); }
[data-curriculum="pb"] .stw-ios-choice[data-ci="1"]{ background:#fff; border:2.5px solid #cc88ff; color:#2a1020; box-shadow:0 5px 0 #ddb8ff,0 8px 18px rgba(180,120,255,.12); }
[data-curriculum="pb"] .stw-ios-choice[data-ci="2"]{ background:#fff; border:2.5px solid #44ccff; color:#2a1020; box-shadow:0 5px 0 #99e8ff,0 8px 18px rgba(50,180,255,.1); }
[data-curriculum="pb"] .stw-ios-choice[data-ci="3"]{ background:#fff; border:2.5px solid #ffcc44; color:#2a1020; box-shadow:0 5px 0 #ffe088,0 8px 18px rgba(255,200,50,.1); }
[data-curriculum="pb"] .stw-ios-choice:hover{ transform:translateY(-4px) scale(1.02); filter:brightness(1.02); }
[data-curriculum="pb"] .stw-ios-choice.ios-correct{ background:#f0fff4 !important; border-color:#22c55e !important; color:#22c55e !important; box-shadow:0 0 0 4px rgba(34,197,94,.2),0 4px 0 #86efac !important; }
[data-curriculum="pb"] .stw-ios-choice.ios-wrong{ background:#fff5f5 !important; border-color:#ef4444 !important; color:#ef4444 !important; box-shadow:0 4px 0 #fca5a5 !important; }

/* ══ HELP BUTTON ══ */
.stw-help-btn{
  width:46px; height:46px; border-radius:50%;
  border:2px solid var(--game-border); background:var(--game-surface);
  color:var(--game-muted); font-size:1.25rem; font-weight:900;
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  position:fixed; bottom:1.5rem; right:1rem; z-index:40;
  box-shadow:0 4px 16px rgba(0,0,0,.2); -webkit-tap-highlight-color:transparent; transition:all .2s;
}
.stw-help-btn:hover{ border-color:#a78bfa; color:#a78bfa; box-shadow:0 0 14px rgba(167,139,250,.4); transform:scale(1.08); }
[data-curriculum="pb"] .stw-help-btn{ background:#fff; border-color:#cc88ff; color:#aa44cc; box-shadow:0 3px 0 #ddb8ff; }
[data-curriculum="bc"] .stw-help-btn{ border-color:rgba(0,220,255,.3); }
[data-curriculum="bc"] .stw-help-btn:hover{ border-color:#00ddff; color:#00ddff; }

/* ══ MODAL ══ */
.stw-modal-overlay{
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,.72); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  opacity:0; pointer-events:none; transition:opacity .25s; padding:1rem;
}
.stw-modal-overlay.open{ opacity:1; pointer-events:all; }
.stw-modal{
  max-width:460px; width:100%; border-radius:28px; overflow:hidden;
  background:var(--game-bg); border:2px solid #a78bfa;
  box-shadow:0 0 48px rgba(167,139,250,.3), 0 24px 48px rgba(0,0,0,.5);
  transform:scale(.88) translateY(16px); transition:transform .3s cubic-bezier(.34,1.56,.64,1);
}
.stw-modal-overlay.open .stw-modal{ transform:none; }
[data-curriculum="bc"] .stw-modal{ border-color:#00ddff; }
[data-curriculum="pb"] .stw-modal{ background:#fff8fc; border-color:#cc88ff; box-shadow:0 8px 0 #ddb8ff,0 16px 40px rgba(180,100,255,.2); }
.stw-modal-header{ padding:1.2rem 1.4rem .8rem; background:linear-gradient(135deg,rgba(167,139,250,.12),rgba(120,60,220,.07)); border-bottom:1px solid var(--game-border); text-align:center; }
[data-curriculum="bc"] .stw-modal-header{ background:linear-gradient(135deg,rgba(0,200,220,.1),rgba(0,80,180,.07)); }
.stw-modal-title{ font-family:var(--game-font-title); font-size:clamp(20px,4vw,26px); letter-spacing:.06em; color:#a78bfa; }
[data-curriculum="bc"] .stw-modal-title{ color:#00ddff; }
[data-curriculum="pb"] .stw-modal-title{ color:#cc88ff; }
.stw-modal-title-jp{ font-family:var(--game-font-jp); font-size:clamp(12px,2vw,15px); color:var(--game-muted); margin-top:4px; }
.stw-modal-body{ padding:1.2rem 1.4rem 1.4rem; }
.stw-how-step{ display:grid; grid-template-columns:36px 1fr; gap:10px; align-items:start; margin-bottom:.9rem; }
.stw-how-step:last-child{ margin-bottom:0; }
.stw-how-num{ width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,var(--game-primary),var(--game-secondary)); color:#000; font-family:var(--game-font-title); font-size:clamp(14px,2.5vw,18px); font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.stw-how-en{ font-family:var(--game-font-body); font-size:clamp(13px,2.2vw,15px); font-weight:800; color:var(--game-ink); line-height:1.35; padding-top:2px; }
[data-curriculum="pb"] .stw-how-en{ color:#2a1020; }
.stw-how-jp{ font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,13px); color:var(--game-muted); margin-top:3px; line-height:1.4; }
.stw-modal-close{ display:block; width:100%; margin-top:1.1rem; font-family:var(--game-font-title); font-size:clamp(15px,2.8vw,19px); letter-spacing:.06em; padding:12px; border-radius:999px; border:none; cursor:pointer; background:linear-gradient(135deg,var(--game-primary),var(--game-secondary)); color:#000; font-weight:900; transition:transform .15s; }
.stw-modal-close:hover{ transform:scale(1.03); }

/* ══ START OVERLAY ══ */
.stw-start-overlay{
  position:fixed; inset:0; z-index:1000;
  display:flex; align-items:center; justify-content:center;
  background:var(--game-bg); padding:1rem; transition:opacity .35s ease;
}
.stw-start-overlay.hiding{ opacity:0; pointer-events:none; }
.stw-start-card{ max-width:460px; width:100%; border-radius:32px; overflow:hidden; background:var(--game-surface); border:2px solid var(--game-primary); box-shadow:0 0 60px color-mix(in srgb,var(--game-primary) 28%,transparent),0 24px 48px rgba(0,0,0,.45); text-align:center; }
[data-curriculum="pb"] .stw-start-card{ background:#fff8fc; border-color:#cc88ff; box-shadow:0 8px 0 #ddb8ff,0 20px 40px rgba(180,100,255,.15); }
[data-curriculum="bc"] .stw-start-card{ background:#030810; border-color:rgba(0,240,255,.5); }
.stw-start-header{ padding:1.5rem 1.4rem .9rem; background:linear-gradient(135deg,color-mix(in srgb,var(--game-primary) 12%,transparent),color-mix(in srgb,var(--game-secondary) 7%,transparent)); border-bottom:1px solid var(--game-border); }
.stw-start-title{ font-family:var(--game-font-title); font-size:clamp(24px,5.5vw,44px); font-weight:900; letter-spacing:.1em; background:linear-gradient(90deg,#a78bfa,#ff2288,#ffcc00,#22ddff,#a78bfa); background-size:220% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:stwRainbow 3s linear infinite; }
[data-curriculum="bc"] .stw-start-title{ background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff); background-size:220% auto; -webkit-background-clip:text; background-clip:text; }
[data-curriculum="pb"] .stw-start-title{ background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4); background-size:220% auto; -webkit-background-clip:text; background-clip:text; }
.stw-start-subtitle{ font-family:var(--game-font-jp); font-size:clamp(11px,1.9vw,14px); color:var(--game-muted); margin-top:5px; }
[data-curriculum="pb"] .stw-start-subtitle{ color:rgba(58,26,46,.5); }
.stw-start-body{ padding:1.1rem 1.4rem 1.5rem; }
.stw-start-step{ display:grid; grid-template-columns:30px 1fr; gap:9px; align-items:start; margin-bottom:.75rem; text-align:left; }
.stw-start-step:last-of-type{ margin-bottom:0; }
.stw-start-num{ width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,var(--game-primary),var(--game-secondary)); color:#000; font-family:var(--game-font-title); font-size:clamp(12px,2vw,15px); font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.stw-start-en{ font-family:var(--game-font-body); font-size:clamp(12px,2vw,14px); font-weight:800; color:var(--game-ink); line-height:1.35; padding-top:2px; }
[data-curriculum="pb"] .stw-start-en{ color:#2a1020; }
.stw-start-jp{ font-family:var(--game-font-jp); font-size:clamp(10px,1.7vw,12px); color:var(--game-muted); margin-top:2px; }
.stw-start-btn{ display:block; width:calc(100% - 2.8rem); margin:1.2rem 1.4rem 1.5rem; font-family:var(--game-font-title); font-size:clamp(17px,3.5vw,24px); letter-spacing:.1em; padding:15px 22px; border:none; border-radius:999px; cursor:pointer; position:relative; overflow:hidden; background:linear-gradient(135deg,var(--game-primary),var(--game-secondary)); color:#000; font-weight:900; box-shadow:0 0 30px color-mix(in srgb,var(--game-primary) 50%,transparent),0 5px 0 color-mix(in srgb,var(--game-primary) 38%,#000),0 10px 22px rgba(0,0,0,.3); transition:transform .15s; -webkit-tap-highlight-color:transparent; }
.stw-start-btn:hover{ transform:translateY(-3px) scale(1.03); }
.stw-start-btn:active{ transform:scale(.96); }

/* ══ RESULTS ══ */
.stw-results{
  display:none; text-align:center; width:100%; max-width:520px; margin:1.5rem auto;
  padding:2.6rem 1.6rem 2rem; border-radius:32px; position:relative; overflow:hidden;
  border:2.5px solid var(--stw-tier-color,#a78bfa);
  background:color-mix(in srgb,var(--stw-tier-color,#a78bfa) 6%,var(--game-bg));
  box-shadow:0 0 60px color-mix(in srgb,var(--stw-tier-color,#a78bfa) 22%,transparent),0 24px 48px rgba(0,0,0,.4);
}
.stw-results.show{ display:block; animation:stwResultIn .55s cubic-bezier(.22,.8,.36,1) both; }
@keyframes stwResultIn{ from{ opacity:0; transform:scale(.82) translateY(28px); } to{ opacity:1; transform:none; } }
.stw-results::before{ content:''; position:absolute; top:0; left:0; right:0; height:5px; background:linear-gradient(90deg,#a78bfa,#ff2288,#ffcc00,#22ddff,#a78bfa); background-size:220% auto; animation:stwRainbow 2.4s linear infinite; }
[data-curriculum="bc"] .stw-results::before{ background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff); background-size:220% auto; }
[data-curriculum="pb"] .stw-results::before{ background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4); background-size:220% auto; }
.stw-results::after{ content:''; position:absolute; inset:0; z-index:0; pointer-events:none; background:radial-gradient(circle at 25% 75%,color-mix(in srgb,var(--stw-tier-color,#a78bfa) 12%,transparent) 0%,transparent 50%),radial-gradient(circle at 75% 25%,color-mix(in srgb,var(--game-secondary) 8%,transparent) 0%,transparent 50%); }
.stw-res-inner{ position:relative; z-index:1; }
.stw-res-score{ font-family:var(--game-font-title); font-size:clamp(62px,16vw,98px); line-height:1; color:var(--stw-tier-color,#a78bfa); text-shadow:0 0 28px var(--stw-tier-color,#a78bfa); margin-bottom:4px; animation:stwScorePop .55s cubic-bezier(.22,.8,.36,1) .3s both; }
@keyframes stwScorePop{ from{ transform:scale(.55) rotate(4deg); opacity:0; } 50%{ transform:scale(1.09) rotate(-2deg); } to{ transform:none; opacity:1; } }
.stw-res-pct{ font-size:clamp(14px,2.6vw,19px); color:var(--game-muted); font-weight:700; margin-bottom:12px; animation:stwFadeUp .4s ease .5s both; }
.stw-res-label{ font-family:var(--game-font-title); font-size:clamp(24px,5.5vw,38px); color:var(--stw-tier-color,#a78bfa); margin-bottom:10px; letter-spacing:.05em; text-shadow:0 0 18px color-mix(in srgb,var(--stw-tier-color,#a78bfa) 55%,transparent); animation:stwFadeUp .4s ease .52s both; }
.stw-res-divider{ width:60px; height:3px; border-radius:99px; background:linear-gradient(90deg,#a78bfa,#ff2288,#22ddff); margin:0 auto 12px; opacity:.6; animation:stwFadeUp .4s ease .56s both; }
[data-curriculum="bc"] .stw-res-divider{ background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff); }
[data-curriculum="pb"] .stw-res-divider{ background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff); }
.stw-res-en{ font-family:var(--game-font-body); font-weight:900; font-size:clamp(14px,2.4vw,18px); color:var(--game-ink); margin-bottom:4px; animation:stwFadeUp .4s ease .6s both; }
.stw-res-jp{ font-family:var(--game-font-jp); font-size:clamp(14px,2.2vw,17px); color:var(--game-muted); margin-bottom:3px; animation:stwFadeUp .4s ease .64s both; }
.stw-res-kanji{ font-family:var(--game-font-jp); font-size:clamp(11px,1.8vw,14px); color:var(--game-muted); opacity:.7; margin-bottom:1.4rem; animation:stwFadeUp .4s ease .68s both; }
.stw-res-actions{ display:flex; gap:12px; justify-content:center; flex-wrap:wrap; animation:stwFadeUp .4s ease .76s both; }
@keyframes stwFadeUp{ from{ transform:translateY(14px); opacity:0; } to{ transform:none; opacity:1; } }

/* confetti */
@keyframes stwConfetti{ 0%{ transform:translate(0,0) rotate(0deg) scale(1); opacity:1; } 100%{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; } }
.stw-confetti-piece{ position:fixed; pointer-events:none; z-index:9999; border-radius:2px; animation:stwConfetti 1.1s ease-out forwards; }
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   BUILD HTML
   ══════════════════════════════════════════════════════════════ */
const modeBadgeText = isIOS ? 'TAP TO CHOOSE / えらんで！' : 'TAP MIC / マイクをタップ';
const hintTextEN    = isIOS
  ? 'Read the Japanese — then choose the right English word!'
  : 'Read the Japanese — then tap the mic and say the English word!';
const hintTextJP    = isIOS
  ? '日本語を読んで、正しい英語を選ぼう。'
  : '日本語を読んで、マイクをタップして英語で言おう。';
const startStep2EN  = isIOS
  ? 'Pick the correct English word from 4 choices!'
  : 'Tap the mic and say the English word out loud!';
const startStep2JP  = isIOS
  ? 'えらぶだけじゃなく、ちゃんと声に出して練習してね！'
  : 'はっきり英語で言おう！マイクが聞いているよ！';

U.mount(`
<div class="stw-header">
  <div class="stw-curriculum">${curriculumLabel()}</div>
  <div class="stw-date">${titleDateLabel()}</div>
</div>

<div class="stw-wrap" id="stw-main-wrap">

  <div class="stw-hud">
    <div class="stw-pill">Word <b id="stw-num">1</b> / 15</div>
    <div class="stw-pill">Score <b id="stw-score">0</b> / 15</div>
    <div class="stw-pill">Streak <b id="stw-streak">0</b></div>
  </div>

  <div class="stw-dots-row" id="stw-dots"></div>

  <div class="stw-jp-card" id="stw-jp-card" style="width:100%">
    <div class="stw-mode-badge" id="stw-badge">
      <div class="stw-mode-dot"></div>
      <span id="stw-badge-text">${modeBadgeText}</span>
    </div>
    <div class="stw-jp-word" id="stw-jp"></div>
    <div class="stw-hira"    id="stw-hira"></div>
  </div>

  ${!isIOS ? `
  <div class="stw-heard-box" id="stw-heard">
    <span id="stw-heard-text">…</span>
  </div>
  <button class="stw-mic-btn" id="stw-mic" aria-label="Tap to speak">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="2" width="6" height="12" rx="3" fill="white"/>
      <path d="M5 10a7 7 0 0 0 14 0" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="9" y1="21" x2="15" y2="21" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </button>
  ` : `<div class="stw-ios-grid" id="stw-ios-grid"></div>`}

  <div class="stw-hint">${hintTextEN}<br>${hintTextJP}</div>

</div>

<!-- RESULTS -->
<div style="max-width:640px;margin:0 auto;padding:0 1rem;box-sizing:border-box;">
<div class="stw-results" id="stw-results">
  <div class="stw-res-inner">
    <div class="stw-res-score"  id="stw-rs"></div>
    <div class="stw-res-pct"    id="stw-rp"></div>
    <div class="stw-res-label"  id="stw-rl"></div>
    <div class="stw-res-divider"></div>
    <div class="stw-res-en"     id="stw-re"></div>
    <div class="stw-res-kanji"  id="stw-rk"></div>
    <div class="stw-res-jp"     id="stw-rj"></div>
    <div class="stw-res-actions">
      <button class="game-btn game-btn-primary"   id="stw-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="stw-back">メニューへ</button>
    </div>
  </div>
</div>
</div>

<button class="stw-help-btn" id="stw-help">？</button>

<!-- MODAL -->
<div class="stw-modal-overlay" id="stw-modal-overlay">
  <div class="stw-modal" role="dialog" aria-modal="true">
    <div class="stw-modal-header">
      <div class="stw-modal-title">HOW TO PLAY</div>
      <div class="stw-modal-title-jp">あそびかた</div>
    </div>
    <div class="stw-modal-body">
      <div class="stw-how-step"><div class="stw-how-num">1</div><div>
        <div class="stw-how-en">Look at the big Japanese word carefully.</div>
        <div class="stw-how-jp">大きな日本語をよく見よう。</div>
      </div></div>
      ${isIOS ? `
      <div class="stw-how-step"><div class="stw-how-num">2</div><div>
        <div class="stw-how-en">Choose the correct English word from the 4 options.</div>
        <div class="stw-how-jp">4つの英語から正しいものをえらぼう。</div>
      </div></div>
      <div class="stw-how-step"><div class="stw-how-num">3</div><div>
        <div class="stw-how-en">Say the word out loud too — practice your voice!</div>
        <div class="stw-how-jp">えらんだら声に出して言ってみよう！</div>
      </div></div>
      ` : `
      <div class="stw-how-step"><div class="stw-how-num">2</div><div>
        <div class="stw-how-en">Tap the microphone and say the English word clearly!</div>
        <div class="stw-how-jp">マイクをタップして英語をはっきり言おう！</div>
      </div></div>
      `}
      <div class="stw-how-step"><div class="stw-how-num">${isIOS?4:3}</div><div>
        <div class="stw-how-en">Score a point for each correct first-try answer!</div>
        <div class="stw-how-jp">一発正解でポイントゲット！</div>
      </div></div>
      <button class="stw-modal-close" id="stw-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>

<!-- START OVERLAY -->
<div class="stw-start-overlay" id="stw-start-overlay">
  <div class="stw-start-card">
    <div class="stw-start-header">
      <div class="stw-start-title">${curriculumLabel()}</div>
      <div class="stw-start-subtitle">セイ・ザ・ワード / Say the Word</div>
    </div>
    <div class="stw-start-body">
      <div class="stw-start-step"><div class="stw-start-num">1</div><div>
        <div class="stw-start-en">Look at the Japanese word.</div>
        <div class="stw-start-jp">日本語の言葉を見よう。</div>
      </div></div>
      <div class="stw-start-step"><div class="stw-start-num">2</div><div>
        <div class="stw-start-en">${startStep2EN}</div>
        <div class="stw-start-jp">${startStep2JP}</div>
      </div></div>
      <div class="stw-start-step"><div class="stw-start-num">3</div><div>
        <div class="stw-start-en">Score points for first-try correct answers!</div>
        <div class="stw-start-jp">一発正解でポイントゲット！声が大事！</div>
      </div></div>
      <button class="stw-start-btn" id="stw-start-btn">START / はじめよう</button>
    </div>
  </div>
</div>
`);

/* ══════════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════════ */
const mainWrap  = document.getElementById('stw-main-wrap');
const numEl     = document.getElementById('stw-num');
const scoreEl   = document.getElementById('stw-score');
const jpCard    = document.getElementById('stw-jp-card');
const jpEl      = document.getElementById('stw-jp');
const hiraEl    = document.getElementById('stw-hira');
const badgeText = document.getElementById('stw-badge-text');
const results   = document.getElementById('stw-results');
const dotsRow   = document.getElementById('stw-dots');
const startOver = document.getElementById('stw-start-overlay');
const helpBtn   = document.getElementById('stw-help');
const modalOver = document.getElementById('stw-modal-overlay');

const micBtn    = isIOS ? null : document.getElementById('stw-mic');
const heardBox  = isIOS ? null : document.getElementById('stw-heard');
const heardText = isIOS ? null : document.getElementById('stw-heard-text');
const iosGrid   = isIOS ? document.getElementById('stw-ios-grid') : null;

/* Build dots */
for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'stw-dot'; d.id = `stw-d${i}`;
  dotsRow.appendChild(d);
}

/* ══════════════════════════════════════════════════════════════
   MODAL / START
   ══════════════════════════════════════════════════════════════ */
helpBtn.addEventListener('click', () => modalOver.classList.add('open'));
document.getElementById('stw-modal-ok').addEventListener('click', () => modalOver.classList.remove('open'));
modalOver.addEventListener('click', e => { if (e.target === modalOver) modalOver.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOver.classList.remove('open'); });

// In doStart(), after U.unlockAudio():
function doStart() {
  U.unlockAudio();
  try {
    const warm = SFX['fart'] ? SFX['fart'].cloneNode() : null;
    if (warm) { warm.volume = 0; warm.play().catch(()=>{}); }
    if (isIOS) {
      wordAudio.volume = 0;
      wordAudio.play().catch(()=>{});
      wordAudio.volume = 1;
    }
  } catch(e) {}
  startOver.classList.add('hiding');
  setTimeout(() => { startOver.style.display = 'none'; }, 380);
  showCard();
}
   
document.getElementById('stw-start-btn').addEventListener('click', doStart);
document.getElementById('stw-start-btn').addEventListener('touchstart', e => { e.preventDefault(); doStart(); }, { passive: false });

/* ══════════════════════════════════════════════════════════════
   HOMOPHONE MAP
   ══════════════════════════════════════════════════════════════ */
const HOMOPHONES = {
  'by':['by','buy','bye'],'buy':['by','buy','bye'],'bye':['by','buy','bye'],
  'to':['to','too','two'],'too':['to','too','two'],'two':['to','too','two'],
  'for':['for','four','fore'],'four':['for','four','fore'],
  'there':['there','their',"they're"],'their':['there','their',"they're"],
  'here':['here','hear'],'hear':['here','hear'],
  'know':['know','no'],'no':['know','no'],
  'new':['new','knew','gnu'],'knew':['new','knew','gnu'],
  'one':['one','won'],'won':['one','won'],
  'see':['see','sea'],'sea':['see','sea'],
  'be':['be','bee'],'bee':['be','bee'],
  'meet':['meet','meat'],'meat':['meet','meat'],
  'week':['week','weak'],'weak':['week','weak'],
  'write':['write','right','rite'],'right':['write','right','rite'],
  'sun':['sun','son'],'son':['sun','son'],
  'flower':['flower','flour'],'flour':['flower','flour'],
  'hair':['hair','hare'],'hare':['hair','hare'],
  'bare':['bare','bear'],'bear':['bare','bear'],
  'pair':['pair','pear'],'pear':['pair','pear'],
  'read':['read','red'],
  'blue':['blue','blew'],'blew':['blue','blew'],
  'night':['night','knight'],'knight':['night','knight'],
  'wear':['wear','where','ware'],'where':['wear','where','ware'],
  'whole':['whole','hole'],'hole':['whole','hole'],
  'plain':['plain','plane'],'plane':['plain','plane'],
  'made':['made','maid'],'maid':['made','maid'],
  'waist':['waist','waste'],'waste':['waist','waste'],
  'peace':['peace','piece'],'piece':['peace','piece'],
  'sale':['sale','sail'],'sail':['sale','sail'],
  'tale':['tale','tail'],'tail':['tale','tail'],
  'mail':['mail','male'],'male':['mail','male'],
};

function matchesWord(alternatives, target) {
  const clean = s => s.toLowerCase().replace(/[.?!,'"]/g, '').trim();
  const tClean = clean(target);
  const tWords = tClean.split(/\s+/);
  const acceptSet = new Set([tClean]);
  if (tWords.length === 1) {
    (HOMOPHONES[tWords[0]] || []).forEach(h => acceptSet.add(h));
  } else {
    const variants = [tWords];
    tWords.forEach((w, wi) => {
      (HOMOPHONES[w] || []).forEach(p => {
        const v = [...tWords]; v[wi] = p; variants.push(v);
      });
    });
    variants.forEach(v => acceptSet.add(v.join(' ')));
  }
  return alternatives.some(alt => acceptSet.has(clean(alt)));
}

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
const order   = U.shuffle(CFG.cards.slice(0, 15));
let idx       = 0;
let score     = 0;
let streak    = 0;
let firstTry  = true;
let answered  = false;
let iosLocked = false;


   
/* ══════════════════════════════════════════════════════════════
   DOTS
   ══════════════════════════════════════════════════════════════ */
function updateDots() {
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`stw-d${i}`);
    if (!d) continue;
    d.className = 'stw-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
  }
}

/* ══════════════════════════════════════════════════════════════
   SHOW CARD
   ══════════════════════════════════════════════════════════════ */
function showCard() {
  if (idx >= order.length) { showResults(); return; }
  answered  = false;
  firstTry  = true;
  iosLocked = false;
  lastTranscript = '';
  micSessionId++; 
   
  const card = order[idx];
  numEl.textContent  = idx + 1;
  jpEl.textContent   = card.jp;
  hiraEl.textContent = card.hira ? `（${card.hira}）` : '';

  /* Auto-size JP word by character count */
  const len = (card.jp || '').length;
  jpCard.style.setProperty('--stw-jp-len', len);

  jpCard.classList.remove('dancing','correct-state','wrong-state','listening');
  updateDots();

  if (isIOS) {
    buildIosChoices(card);
  } else {
    if (heardText) heardText.textContent = '…';
    if (heardBox)  heardBox.className = 'stw-heard-box';
    if (micBtn)    { micBtn.disabled = false; micBtn.classList.remove('listening'); }
    badgeText.textContent = 'TAP MIC / マイクをタップ';
  }
}

/* ══════════════════════════════════════════════════════════════
   AUTO-ADVANCE AFTER CORRECT
   ══════════════════════════════════════════════════════════════ */
function advanceAfterCorrect() {
  const card = order[idx];

  let advanced = false;
  let chainStarted = false;
  let wordStarted = false;
  let dingFailTimer = null;
  let advanceSafetyTimer = null;

  function doAdvance() {
    if (advanced) return;
    advanced = true;
    clearTimeout(dingFailTimer);
    clearTimeout(advanceSafetyTimer);
    wordAudio.onended = null;
    idx++;
    showCard();
  }

  function startWordAudio() {
    if (wordStarted) return;
    wordStarted = true;

    if (!card.mp3) {
      setTimeout(doAdvance, 800);
      return;
    }

    wordAudio.onended = null;
    wordAudio.pause();
    wordAudio.currentTime = 0;
    wordAudio.src = CFG.audioBase + card.mp3;
    wordAudio.onended = () => setTimeout(doAdvance, 800);
    wordAudio.play().catch(() => setTimeout(doAdvance, 800));

    advanceSafetyTimer = setTimeout(doAdvance, 7000);
  }

  const dingClone = SFX['ding'] ? SFX['ding'].cloneNode() : null;

  if (dingClone) {
    dingClone.setAttribute('playsinline', '');
    dingClone.setAttribute('webkit-playsinline', '');

    dingClone.onended = () => {
      if (chainStarted) return;
      chainStarted = true;
      clearTimeout(dingFailTimer);
      startWordAudio();
    };

    dingClone.play().catch(() => {
      if (chainStarted) return;
      chainStarted = true;
      clearTimeout(dingFailTimer);
      startWordAudio();
    });

    dingFailTimer = setTimeout(() => {
      if (chainStarted) return;
      chainStarted = true;
      startWordAudio();
    }, 3000);

  } else {
    startWordAudio();
  }
}

/* ══════════════════════════════════════════════════════════════
   iOS: BUILD 4 CHOICES
   ══════════════════════════════════════════════════════════════ */
function buildIosChoices(card) {
  iosGrid.innerHTML = '';
  const pool        = order.filter((_, i) => i !== idx);
  const distractors = U.shuffle(pool).slice(0, 3);
  const choices     = U.shuffle([card, ...distractors]);

  choices.forEach((c, ci) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'stw-ios-choice';
    btn.setAttribute('data-ci', ci);
    btn.textContent = c.en;

    btn.addEventListener('touchstart', e => { e.preventDefault(); U.unlockAudio(); handleIosPick(btn, c.en); }, { passive: false });
    btn.addEventListener('click', e => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      handleIosPick(btn, c.en);
    });

    btn.style.opacity = '0';
    btn.style.transform = 'translateY(10px) scale(.96)';
    setTimeout(() => {
      btn.style.transition = 'opacity .25s ease, transform .25s cubic-bezier(.34,1.56,.64,1)';
      btn.style.opacity = '1';
      btn.style.transform = '';
    }, ci * 60);

    iosGrid.appendChild(btn);
  });
}

/* ══════════════════════════════════════════════════════════════
   iOS: HANDLE PICK
   ══════════════════════════════════════════════════════════════ */
function handleIosPick(btn, en) {
  if (iosLocked || answered) return;
  const correct = en === order[idx].en;

  if (correct) {
    iosLocked = true;
    answered  = true;
    btn.classList.add('ios-correct');
    Array.from(iosGrid.children).forEach(b => { if (b !== btn) b.classList.add('ios-locked'); });

    if (firstTry) {
      score++; streak++;
      scoreEl.textContent = score;
      const streakEl = document.getElementById('stw-streak');
      if (streakEl) streakEl.textContent = streak;
    }

    jpCard.classList.add('dancing','correct-state');
    updateDots();
    advanceAfterCorrect();

  } else {
    firstTry = false;
    streak   = 0;
    const streakEl = document.getElementById('stw-streak');
    if (streakEl) streakEl.textContent = streak;
    btn.classList.add('ios-wrong');
    jpCard.classList.add('wrong-state');
    U.unlockAudio();
    playSfx('fart');
    setTimeout(() => {
      btn.classList.remove('ios-wrong');
      jpCard.classList.remove('wrong-state');
    }, 520);
  }
}

/* ══════════════════════════════════════════════════════════════
   MIC MODE: SPEECH RECOGNITION
   ══════════════════════════════════════════════════════════════ */
let recognition = null;
let srListening = false;
let lastMicAt   = 0;
let micTimeout  = null;
let lastTranscript = '';
let micSessionId = 0;
let thisSession  = 0;

function clearMicUi() {
  srListening = false;
  if (micBtn) micBtn.classList.remove('listening');
  jpCard.classList.remove('listening');
  if (!answered) badgeText.textContent = 'TAP MIC / マイクをタップ';
  clearTimeout(micTimeout);
}   

   
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
   
if (SR && !isIOS) {
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  recognition.continuous = false;

  recognition.onstart = () => {
    srListening = true;
    micBtn.classList.add('listening');
    jpCard.classList.add('listening');
    badgeText.textContent = 'LISTENING… / きいてる…';
    if (heardBox) {
      heardBox.className = 'stw-heard-box';
      heardText.textContent = '…';
    }

    clearTimeout(micTimeout);
    micTimeout = setTimeout(() => {
      try { recognition.abort(); } catch (e) {}
    }, 2200);
  };

 recognition.onresult = e => {
  if (thisSession !== micSessionId) return;
  if (answered || !srListening) return;

  answered = true;       // HARD LOCK (this is the real fix)
  srListening = false;
    

    try { recognition.abort(); } catch (e) {}
    clearMicUi();

    const result = e.results?.[0];
    if (!result) return;

    const alts = Array.from(result).map(r => r.transcript);
    const heard = (alts[0] || '').toLowerCase().replace(/[.?!,'"]/g, '').trim();

    if (heard === lastTranscript) return;
    lastTranscript = heard;
    
    const target = order[idx].en;
    const matched = matchesWord(alts, target);

    if (heardText && !matched) heardText.textContent = `"${heard}"`;

    if (matched) {
   onMicCorrect();
   } else {
   answered = false;   // allow retry
   onMicWrong();
 }
    
  };

  recognition.onerror = () => {
    clearMicUi();
    if (heardBox) {
      heardBox.className = 'stw-heard-box';
      heardText.textContent = 'Try again';
    }
  };

  recognition.onend = () => {
  if (!srListening) return; // ignore forced abort end
  clearMicUi();
};
}

function onMicCorrect() {
  answered = true;

  clearMicUi();
  if (recognition) {
    try { recognition.abort(); } catch (e) {}
  }

  if (heardBox) {
    heardText.textContent = '✓';
    heardBox.classList.add('heard-correct');
  }
  if (micBtn) micBtn.disabled = true;

  if (firstTry) {
    score++;
    streak++;
    scoreEl.textContent = score;
    const streakEl = document.getElementById('stw-streak');
    if (streakEl) streakEl.textContent = streak;
  }

  jpCard.classList.add('dancing', 'correct-state');
  updateDots();
  setTimeout(() => advanceAfterCorrect(), 250);
}

function onMicWrong() {
  firstTry = false;
  streak   = 0;
  const streakEl = document.getElementById('stw-streak');
  if (streakEl) streakEl.textContent = streak;

  if (heardBox) {
    heardBox.classList.add('heard-wrong');
    setTimeout(() => heardBox.classList.remove('heard-wrong'), 500);
  }
  jpCard.classList.add('wrong-state');
  U.unlockAudio();
  playSfx('fart');
  setTimeout(() => jpCard.classList.remove('wrong-state'), 500);
  if (micBtn) micBtn.disabled = false;
}

if (micBtn) {
  const triggerMic = () => {
  if (answered || srListening) return;
  const now = Date.now();
  if (now - lastMicAt < 400) return;
  lastMicAt = now;
  U.unlockAudio();
  wordAudio.pause();
  wordAudio.currentTime = 0;
  wordAudio.onended = null;
  if (!recognition) {
    alert('Speech recognition needs Chrome on Android or a desktop browser.');
    return;
  }
  thisSession = ++micSessionId;
  try { recognition.start(); } catch(e) {}
  };
  micBtn.addEventListener('click', triggerMic);
  micBtn.addEventListener('touchstart', e => { e.preventDefault(); triggerMic(); }, { passive: false });
}

/* ══════════════════════════════════════════════════════════════
   CONFETTI
   ══════════════════════════════════════════════════════════════ */
function fireConfetti(big = false) {
  const colors = ['#a78bfa','#ff2288','#ffcc00','#22ddff','#ffffff','#ff6eb4','#aaff22'];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.38;
  for (let i = 0, n = big ? 80 : 36; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'stw-confetti-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist  = (big ? 200 : 110) + Math.random() * 220;
    el.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i%colors.length]};--cx:${(Math.cos(angle)*dist).toFixed(1)}px;--cy:${(Math.sin(angle)*dist).toFixed(1)}px;--cr:${((Math.random()-.5)*720).toFixed(0)}deg;animation-delay:${(Math.random()*.2).toFixed(3)}s;animation-duration:${(.85+Math.random()*.5).toFixed(3)}s;border-radius:${Math.random()>.5?'50%':'2px'};width:${(5+Math.random()*8).toFixed(1)}px;height:${(5+Math.random()*8).toFixed(1)}px;`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* ══════════════════════════════════════════════════════════════
   RESULTS
   ══════════════════════════════════════════════════════════════ */
function showResults() {
  if (srListening && recognition) { try { recognition.stop(); } catch(e) {} }
  jpCard.classList.remove('dancing','correct-state','listening');

  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`stw-d${i}`);
    if (d) d.className = 'stw-dot done';
  }

  mainWrap.style.display = 'none';
  results.classList.add('show');

  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);

  document.dispatchEvent(new CustomEvent('booha:gameEnd', {
    detail: { saveId:`${CFG.curriculum}:say_word`, score:pct, completed:pct >= 40 }
  }));

  results.style.setProperty('--stw-tier-color', tier.color);
  document.getElementById('stw-rs').textContent = `${score} / 15`;
  document.getElementById('stw-rp').textContent = `${pct}%`;
  document.getElementById('stw-rl').textContent = tier.label;
  document.getElementById('stw-re').textContent = tier.en;
  document.getElementById('stw-rj').textContent = tier.jp;
  document.getElementById('stw-rk').textContent = tier.kanji;

  if (score === 15) {
    setTimeout(() => fireConfetti(false), 400);
    setTimeout(() => fireConfetti(true),  900);
  }
  if (CFG.sfxBase && tier.sound) {
    const snd = new Audio(CFG.sfxBase + tier.sound);
    snd.setAttribute('playsinline',''); snd.setAttribute('webkit-playsinline','');
    snd.play().catch(()=>{});
  }
}

/* ══════════════════════════════════════════════════════════════
   REPLAY / BACK
   ══════════════════════════════════════════════════════════════ */
document.getElementById('stw-replay').addEventListener('click', () => {
  results.classList.remove('show');
  mainWrap.style.display = '';
  idx = 0; score = 0; streak = 0;
  scoreEl.textContent = '0';
  const streakEl = document.getElementById('stw-streak');
  if (streakEl) streakEl.textContent = '0';
  U.shuffle(order);
  showCard();
});

document.getElementById('stw-back').addEventListener('click', () => {
  if (srListening && recognition) { try { recognition.stop(); } catch(e) {} }
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

/* ══════════════════════════════════════════════════════════════
   GO
   ══════════════════════════════════════════════════════════════ */
U.unlockAudio();

})();
