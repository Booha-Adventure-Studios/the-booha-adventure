
/* ══════════════════════════════════════════════════════════════
   ask-question.js  —  Ask the Question  v3
   Show JP question → mic to say the English answer (Android/Desktop)
                    → 4-choice answer picker (iOS)
   Progress bar timer. Word chips reveal as heard.
   Full themed results panel. All 3 curricula supported.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Ask the Question');

const isIOS  = U.isIOS();
const PASS   = 80;    /* keyword score % to pass — slightly easier than say-sentence */
const DUR_MS = 7000;  /* listening window ms */

await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

/* ══════════════════════════════════════════════════════════════
   TIERS — answer/communication focused, EN / Kanji / JP order
   ══════════════════════════════════════════════════════════════ */
const TIERS = [
  { min:0,  max:5,  sound:'result_0-5.mp3',
    label:'KEEP ANSWERING',
    en:    "Answering questions takes practice — keep going!",
    kanji: '質問に答える練習を続けよう！',
    jp:    'もっと練習して答えられるようになろう！',
    color: '#f43f5e' },
  { min:6,  max:10, sound:'result_6-10.mp3',
    label:'GOOD ANSWERS!',
    en:    "You are finding your words — great effort!",
    kanji: '言葉が出てきた！素晴らしい努力！',
    jp:    'だんだん言葉が出てきてるよ！すごい！',
    color: '#f97316' },
  { min:11, max:14, sound:'result_11-14.mp3',
    label:'ALMOST FLUENT',
    en:    "Your answers are strong and clear!",
    kanji: 'はっきりした答えが言えてる！',
    jp:    '答えがはっきり言えてる！すごく上手！',
    color: '#10b981' },
  { min:15, max:15, sound:'result_15.mp3',
    label:'PERFECT ANSWERS!',
    en:    "Every question answered perfectly — incredible!",
    kanji: '全問完璧回答！最強のコミュニケーション力！',
    jp:    '全部の質問に完璧に答えられた！すごい！',
    color: '#06b6d4' },
];
const getTier = s => TIERS.find(t => s >= t.min && s <= t.max) ?? TIERS[0];

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
  'new':['new','knew'],'knew':['new','knew'],
  'one':['one','won'],'won':['one','won'],
  'see':['see','sea'],'sea':['see','sea'],
  'be':['be','bee'],'bee':['be','bee'],
  'meet':['meet','meat'],'meat':['meet','meat'],
  'week':['week','weak'],'weak':['week','weak'],
  'write':['write','right','rite'],'right':['write','right','rite'],
  'sun':['sun','son'],'son':['sun','son'],
  'hair':['hair','hare'],'hare':['hair','hare'],
  'bare':['bare','bear'],'bear':['bare','bear'],
  'pair':['pair','pear'],'pear':['pair','pear'],
  'blue':['blue','blew'],'blew':['blue','blew'],
  'night':['night','knight'],'knight':['night','knight'],
  'wear':['wear','where','ware'],'where':['wear','where','ware'],
  'whole':['whole','hole'],'hole':['whole','hole'],
  'plain':['plain','plane'],'plane':['plain','plane'],
  'peace':['peace','piece'],'piece':['peace','piece'],
  'sale':['sale','sail'],'sail':['sale','sail'],
  'made':['made','maid'],'maid':['made','maid'],
  'mail':['mail','male'],'male':['mail','male'],
  'tale':['tale','tail'],'tail':['tale','tail'],
};

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
   STYLES
   Accent palette differs from say-sentence:
     BR: gold/amber primary  (say-sentence: purple)
     BC: teal/emerald        (say-sentence: purple/cyan)
     PB: coral/orange        (say-sentence: purple/pink)
   ══════════════════════════════════════════════════════════════ */
const S = document.createElement('style');
S.textContent = `

.game-header{ display:none !important; }

/* ── wrap ── */
.aq-outer{
  max-width:660px; margin:0 auto;
  padding:0 1rem 6rem;
  display:flex; flex-direction:column; align-items:center; gap:.8rem;
  box-sizing:border-box;
}

/* ── header ── */
.aq-header{
  text-align:center; padding:.5rem 3rem .6rem;
  width:100%; max-width:660px; margin:0 auto;
}
.aq-curriculum{
  font-family:var(--game-font-title);
  font-size:clamp(22px,5.5vw,46px); font-weight:900;
  letter-spacing:.12em; text-transform:uppercase;
  /* BR: gold sweep */
  background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44,#ff6600,#ffcc00);
  background-size:220% auto;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  background-clip:text; animation:aqRainbow 3s linear infinite;
}
[data-curriculum="bc"] .aq-curriculum{
  background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa,#0055cc,#00e8b0);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
[data-curriculum="pb"] .aq-curriculum{
  background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622,#ffaa22,#ff8844);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text;
}
@keyframes aqRainbow{ to{ background-position:220% center; } }

.aq-date{
  margin-top:3px; font-family:var(--game-font-body);
  font-size:clamp(10px,1.8vw,14px); font-weight:800;
  color:var(--game-muted); letter-spacing:.06em;
}
[data-curriculum="pb"] .aq-date{ color:rgba(58,26,46,.55); }

/* ── dots ── */
.aq-dots-row{
  display:flex; justify-content:center; gap:5px;
  margin:.3rem 0 .2rem; flex-wrap:wrap; width:100%;
}
.aq-dot{
  width:9px; height:9px; border-radius:50%;
  background:rgba(255,255,255,.12); border:1.5px solid rgba(255,255,255,.18);
  transition:all .3s; flex-shrink:0;
}
/* BR: gold dot */
.aq-dot.active{ background:#ffcc00; border-color:#ffcc00; box-shadow:0 0 8px #ffcc00; }
.aq-dot.done{ background:#22c55e; border-color:#22c55e; box-shadow:0 0 7px rgba(34,197,94,.7); }
[data-curriculum="bc"] .aq-dot.active{ background:#00ddaa; border-color:#00ddaa; box-shadow:0 0 8px #00ddaa; }
[data-curriculum="pb"] .aq-dot{ background:rgba(255,136,68,.15); border-color:rgba(255,136,68,.25); }
[data-curriculum="pb"] .aq-dot.active{ background:#ff8844; border-color:#ff8844; box-shadow:0 0 8px #ff8844; }

/* ── hud ── */
.aq-hud{ display:flex; justify-content:center; gap:8px; flex-wrap:wrap; width:100%; }
.aq-pill{
  padding:5px 16px; border-radius:999px;
  background:var(--game-pill-bg); border:1.5px solid var(--game-pill-border);
  color:var(--game-pill-text); font-size:clamp(12px,2vw,15px);
  font-weight:900; letter-spacing:.03em; box-shadow:0 2px 10px rgba(0,0,0,.2);
}
/* BR: gold accent */
.aq-pill b{ color:#ffcc00; font-size:1.1em; text-shadow:0 0 9px #ffcc00; }
[data-curriculum="bc"] .aq-pill b{ color:#00ddaa; text-shadow:0 0 9px #00ddaa; }
[data-curriculum="pb"] .aq-pill{ background:#fff; border-color:#ffd0aa; color:#2a1020; box-shadow:0 3px 0 #ffe0cc; }
[data-curriculum="pb"] .aq-pill b{ color:#ff8844; text-shadow:none; }

/* ── question card ── */
.aq-card{
  width:100%; border-radius:22px; padding:1.2rem 1.2rem 1rem;
  position:relative; overflow:hidden;
  background:var(--game-surface); border:2px solid var(--game-border);
  backdrop-filter:blur(12px); box-shadow:0 6px 26px rgba(0,0,0,.22);
  box-sizing:border-box;
}
/* BR: amber/gold theme */
[data-curriculum="br"] .aq-card{
  background:linear-gradient(145deg,rgba(255,204,0,.08),rgba(255,136,0,.05),rgba(0,0,0,.2));
  border-color:rgba(255,204,0,.28);
}
[data-curriculum="bc"] .aq-card{
  background:linear-gradient(145deg,rgba(0,220,180,.07),rgba(0,136,255,.05),rgba(0,0,0,.28));
  border-color:rgba(0,210,170,.22);
}
[data-curriculum="pb"] .aq-card{
  background:#fff; border:3px solid #ff9966;
  box-shadow:0 5px 0 #ffcc99, 0 8px 22px rgba(255,136,68,.12);
}
/* Top accent bar */
.aq-card::before{
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44,#ff6600,#ffcc00);
  background-size:220% auto; animation:aqRainbow 2.4s linear infinite;
}
[data-curriculum="bc"] .aq-card::before{
  background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa,#0055cc,#00e8b0);
  background-size:220% auto;
}
[data-curriculum="pb"] .aq-card::before{
  background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622,#ffaa22,#ff8844);
  background-size:220% auto;
}

.aq-card-top{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px; margin-bottom:.6rem;
}
.aq-q-block{ flex:1; }
.aq-q-label{
  font-family:var(--game-font-title);
  font-size:clamp(7px,1.3vw,10px); letter-spacing:.2em;
  text-transform:uppercase; color:#ffcc00; opacity:.8;
  margin-bottom:.35rem;
}
[data-curriculum="bc"] .aq-q-label{ color:#00ddaa; }
[data-curriculum="pb"] .aq-q-label{ color:#ff8844; opacity:1; }

.aq-jp-kanji{
  font-family:var(--game-font-jp); font-weight:900;
  font-size:clamp(15px,3.2vw,22px); color:var(--game-ink);
  line-height:1.45; text-wrap:balance;
}
[data-curriculum="pb"] .aq-jp-kanji{ color:#2a1020; }
.aq-jp-hira{
  font-family:var(--game-font-jp); font-size:clamp(11px,2vw,15px);
  color:var(--game-muted); margin-top:3px;
}
[data-curriculum="pb"] .aq-jp-hira{ color:rgba(58,26,46,.5); }

/* play button */
.aq-play-btn{
  width:50px; height:50px; border-radius:50%; flex-shrink:0;
  border:none; cursor:pointer; display:grid; place-items:center;
  font-size:18px; color:#1a0a00;
  background:radial-gradient(circle at 30% 30%,#ffe8a3,#ffd36a 60%,#ffb800 100%);
  box-shadow:0 0 0 3px rgba(255,213,120,.35), 0 0 16px rgba(255,214,120,.55);
  animation:aqGoldPulse 1.8s ease-in-out infinite;
  transition:transform .15s, opacity .2s;
  -webkit-tap-highlight-color:transparent;
}
.aq-play-btn:hover{ transform:scale(1.1); }
.aq-play-btn:active{ transform:scale(.92); }
.aq-play-btn:disabled{ opacity:.35; pointer-events:none; animation:none; }
@keyframes aqGoldPulse{
  0%,100%{ box-shadow:0 0 0 3px rgba(255,213,120,.25),0 0 10px rgba(255,214,120,.35); }
  50%{     box-shadow:0 0 0 4px rgba(255,213,120,.5), 0 0 24px rgba(255,214,120,.9); }
}

/* ── answer zone ── */
.aq-answer-zone{
  width:100%; border-radius:16px; padding:.85rem 1rem;
  min-height:52px;
  display:flex; flex-wrap:wrap; gap:6px; justify-content:center; align-items:center;
  background:rgba(255,255,255,.04); border:2px dashed rgba(255,255,255,.14);
  transition:border-color .3s, background .3s;
  box-sizing:border-box;
}
[data-curriculum="br"] .aq-answer-zone{ background:rgba(255,204,0,.04); border-color:rgba(255,204,0,.18); }
[data-curriculum="bc"] .aq-answer-zone{ background:rgba(0,210,170,.04); border-color:rgba(0,210,170,.16); }
[data-curriculum="pb"] .aq-answer-zone{ background:rgba(255,136,68,.05); border-color:rgba(255,136,68,.25); }
.aq-answer-zone.has-words{ border-style:solid; border-color:rgba(255,204,0,.35); }
[data-curriculum="bc"] .aq-answer-zone.has-words{ border-color:rgba(0,210,170,.35); }
[data-curriculum="pb"] .aq-answer-zone.has-words{ border-color:#ff9966; }

.aq-answer-placeholder{
  font-family:var(--game-font-body); font-size:clamp(13px,2.4vw,17px);
  font-weight:700; font-style:italic;
  color:rgba(255,255,255,.2); pointer-events:none; width:100%; text-align:center;
}
[data-curriculum="pb"] .aq-answer-placeholder{ color:rgba(58,26,46,.28); }

/* EN word chips */
.aq-word{
  display:inline-flex; align-items:center; justify-content:center;
  padding:5px 10px; border-radius:10px;
  font-family:var(--game-font-body); font-weight:700;
  font-size:clamp(13px,2.6vw,19px); line-height:1.2;
  background:rgba(255,255,255,.07); border:1.5px solid rgba(255,255,255,.14);
  color:var(--game-ink);
  transition:background .2s, border-color .2s, color .2s, transform .2s, box-shadow .2s;
}
[data-curriculum="pb"] .aq-word{ background:rgba(255,136,68,.08); border-color:rgba(255,136,68,.2); color:#2a1020; }
.aq-word.heard{
  background:rgba(34,197,94,.18); border-color:#22c55e; color:#22c55e;
  box-shadow:0 0 10px rgba(34,197,94,.35);
  transform:translateY(-3px) scale(1.06);
}
.aq-word.missed{
  background:rgba(239,68,68,.14); border-color:#ef4444; color:#ef4444;
}

/* progress bar */
.aq-progress-wrap{ width:100%; margin:.55rem 0 .35rem; }
.aq-progress-track{
  height:10px; border-radius:99px; overflow:hidden;
  background:rgba(255,255,255,.08); border:1.5px solid rgba(255,255,255,.1);
}
[data-curriculum="pb"] .aq-progress-track{ background:rgba(255,136,68,.08); border-color:rgba(255,136,68,.18); }
.aq-progress-fill{
  height:100%; border-radius:99px; transform-origin:left center;
  /* BR: gold/amber gradient */
  background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44);
  transition:width .1s linear;
  position:relative; overflow:hidden;
}
[data-curriculum="bc"] .aq-progress-fill{ background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa); }
[data-curriculum="pb"] .aq-progress-fill{ background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622); }
.aq-progress-fill::after{
  content:''; position:absolute; inset:0;
  background:linear-gradient(90deg,transparent 20%,rgba(255,255,255,.35) 50%,transparent 80%);
  background-size:200% 100%; animation:aqShimmer 1.2s linear infinite;
}
@keyframes aqShimmer{ from{ background-position:200% 0; } to{ background-position:-200% 0; } }
.aq-progress-fill.warning{ animation:aqPulseWarn .5s ease-in-out infinite; }
@keyframes aqPulseWarn{ 0%,100%{ filter:brightness(1); } 50%{ filter:brightness(1.7) saturate(2); } }

/* heard box */
.aq-heard-wrap{ width:100%; }
.aq-heard-box{
  width:100%; min-height:44px;
  border-radius:14px; padding:.6rem 1rem;
  display:flex; align-items:center; justify-content:center;
  font-family:var(--game-font-body); font-size:clamp(13px,2.4vw,17px);
  font-weight:700; letter-spacing:.02em; text-align:center;
  background:rgba(255,255,255,.06); border:1.5px solid rgba(255,255,255,.12);
  color:var(--game-muted); transition:border-color .3s, color .3s, background .3s;
  box-sizing:border-box;
}
[data-curriculum="pb"] .aq-heard-box{ background:#fff; border-color:#ffd0aa; color:rgba(58,26,46,.45); box-shadow:0 3px 0 #ffe4cc; }
.aq-heard-box.correct{ background:rgba(34,197,94,.1); border-color:#22c55e; color:#22c55e; }
.aq-heard-box.wrong{ background:rgba(239,68,68,.1); border-color:#ef4444; color:#ef4444; animation:aqShake .42s ease; }
@keyframes aqShake{
  0%,100%{ transform:translateX(0); }
  20%{ transform:translateX(-6px); } 40%{ transform:translateX(6px); }
  60%{ transform:translateX(-4px); } 80%{ transform:translateX(4px); }
}
[data-curriculum="pb"] .aq-heard-box.correct{ background:#f0fff4; border-color:#22c55e; color:#22c55e; box-shadow:0 3px 0 #86efac; }
[data-curriculum="pb"] .aq-heard-box.wrong{ background:#fff5f5; border-color:#ef4444; color:#ef4444; box-shadow:0 3px 0 #fca5a5; }

/* mic button */
.aq-mic-btn{
  width:72px; height:72px; border-radius:50%;
  border:none; cursor:pointer;
  display:grid; place-items:center;
  /* BR: gold/amber mic */
  background:linear-gradient(135deg, #ffcc00, #ff8800);
  box-shadow:0 0 24px rgba(255,200,0,.5), 0 5px 0 rgba(140,80,0,.5), 0 8px 20px rgba(0,0,0,.3);
  transition:transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .15s;
  -webkit-tap-highlight-color:transparent;
}
[data-curriculum="bc"] .aq-mic-btn{
  background:linear-gradient(135deg, #00ddaa, #0088cc);
  box-shadow:0 0 24px rgba(0,200,170,.5), 0 5px 0 rgba(0,60,80,.5), 0 8px 20px rgba(0,0,0,.3);
}
[data-curriculum="pb"] .aq-mic-btn{
  background:linear-gradient(135deg, #ff9966, #ff6622);
  box-shadow:0 0 24px rgba(255,136,68,.5), 0 5px 0 #ffccaa, 0 8px 20px rgba(0,0,0,.2);
}
.aq-mic-btn svg{ width:32px; height:32px; fill:#1a0a00; }
[data-curriculum="bc"] .aq-mic-btn svg{ fill:#001a14; }
[data-curriculum="pb"] .aq-mic-btn svg{ fill:#fff; }
.aq-mic-btn:hover{ transform:translateY(-3px) scale(1.07); }
.aq-mic-btn:active{ transform:scale(.91); }
.aq-mic-btn:disabled{ opacity:.32; pointer-events:none; }

/* Listening — green pulse */
.aq-mic-btn.listening{
  background:linear-gradient(135deg, #22c55e, #15803d);
  box-shadow:0 0 0 0 rgba(34,197,94,.6), 0 5px 0 rgba(10,80,30,.5), 0 8px 20px rgba(0,0,0,.3);
  animation:aqMicRing 1s ease-out infinite;
}
.aq-mic-btn.listening svg{ fill:#fff; }
[data-curriculum="bc"] .aq-mic-btn.listening{
  background:linear-gradient(135deg, #06b6d4, #0e7490);
  animation:aqMicRingCyan 1s ease-out infinite;
}
@keyframes aqMicRing{
  0%{   box-shadow:0 0 0 0    rgba(34,197,94,.7),  0 5px 0 rgba(10,80,30,.5),  0 8px 20px rgba(0,0,0,.3); }
  70%{  box-shadow:0 0 0 24px rgba(34,197,94,0),   0 5px 0 rgba(10,80,30,.5),  0 8px 20px rgba(0,0,0,.3); }
  100%{ box-shadow:0 0 0 0    rgba(34,197,94,0),   0 5px 0 rgba(10,80,30,.5),  0 8px 20px rgba(0,0,0,.3); }
}
@keyframes aqMicRingCyan{
  0%{   box-shadow:0 0 0 0    rgba(6,182,212,.7),  0 5px 0 rgba(0,60,80,.5),   0 8px 20px rgba(0,0,0,.3); }
  70%{  box-shadow:0 0 0 24px rgba(6,182,212,0),   0 5px 0 rgba(0,60,80,.5),   0 8px 20px rgba(0,0,0,.3); }
  100%{ box-shadow:0 0 0 0    rgba(6,182,212,0),   0 5px 0 rgba(0,60,80,.5),   0 8px 20px rgba(0,0,0,.3); }
}

/* status label */
.aq-status{
  font-family:var(--game-font-body); font-size:clamp(12px,2.2vw,15px);
  font-weight:900; letter-spacing:.06em; text-transform:uppercase;
  color:var(--game-muted); text-align:center; min-height:1.4em;
  transition:color .3s;
}
.aq-status.listening{ color:#22c55e; }
[data-curriculum="pb"] .aq-status{ color:rgba(58,26,46,.5); }
[data-curriculum="pb"] .aq-status.listening{ color:#22c55e; }

/* bottom bar */
.aq-bottom-bar{
  display:flex; gap:10px; flex-wrap:wrap;
  justify-content:center; align-items:center;
  width:100%;
}

.aq-begin-btn, .aq-retry-btn, .aq-next-btn, .aq-skip-btn, .aq-help-btn{
  font-family:var(--game-font-title);
  font-size:clamp(13px,2.4vw,17px); font-weight:900; letter-spacing:.06em;
  padding:11px 24px; border-radius:999px; border:none; cursor:pointer;
  position:relative; overflow:hidden;
  transition:transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .15s;
  -webkit-tap-highlight-color:transparent;
}
/* BR: gold start button */
.aq-begin-btn{
  background:linear-gradient(135deg,#ffcc00,#ff8800);
  color:#1a0800;
  box-shadow:0 0 20px rgba(255,200,0,.45),0 4px 0 rgba(140,80,0,.5),0 7px 16px rgba(0,0,0,.3);
}
[data-curriculum="bc"] .aq-begin-btn{
  background:linear-gradient(135deg,#00ddaa,#0088cc);
  color:#001a14;
  box-shadow:0 0 20px rgba(0,200,170,.4),0 4px 0 rgba(0,60,80,.5),0 7px 16px rgba(0,0,0,.3);
}
[data-curriculum="pb"] .aq-begin-btn{
  background:linear-gradient(135deg,#ff9966,#ff6622);
  color:#fff;
  box-shadow:0 0 20px rgba(255,136,68,.4),0 4px 0 rgba(160,50,0,.4),0 7px 16px rgba(0,0,0,.25);
}
.aq-retry-btn{
  background:linear-gradient(135deg,#f97316,#fbbf24);
  color:#1a0500;
  box-shadow:0 4px 0 #b45309,0 0 18px rgba(249,115,22,.4);
}
.aq-next-btn{
  background:linear-gradient(135deg,#22c55e,#16a34a);
  color:#fff;
  box-shadow:0 0 22px rgba(34,197,94,.55),0 4px 0 rgba(10,90,30,.5),0 7px 16px rgba(0,0,0,.25);
  animation:aqNextGlow 1.4s ease-in-out infinite;
}
@keyframes aqNextGlow{
  0%,100%{ box-shadow:0 0 22px rgba(34,197,94,.55),0 4px 0 rgba(10,90,30,.5); }
  50%{     box-shadow:0 0 44px rgba(34,197,94,1),  0 4px 0 rgba(10,90,30,.5); }
}
.aq-skip-btn{
  background:transparent; border:2px solid rgba(255,255,255,.22);
  color:var(--game-muted); box-shadow:none;
}
.aq-skip-btn:hover{ border-color:rgba(255,255,255,.5); color:var(--game-ink); }
[data-curriculum="pb"] .aq-skip-btn{ border-color:rgba(58,26,46,.22); color:rgba(58,26,46,.5); }

.aq-help-btn{
  width:44px; height:44px; border-radius:50%; padding:0;
  background:var(--game-surface); border:2px solid var(--game-border);
  color:var(--game-muted); font-size:1.15rem;
  display:flex; align-items:center; justify-content:center;
  box-shadow:none;
}
.aq-help-btn:hover{ border-color:#ffcc00; color:#ffcc00; transform:scale(1.08); }
[data-curriculum="bc"] .aq-help-btn:hover{ border-color:#00ddaa; color:#00ddaa; }
[data-curriculum="pb"] .aq-help-btn{ background:#fff; border-color:#ff9966; color:#cc5522; box-shadow:0 3px 0 #ffccaa; }
[data-curriculum="pb"] .aq-help-btn:hover{ border-color:#ff6622; color:#ff6622; }

.aq-begin-btn:hover,.aq-retry-btn:hover,.aq-next-btn:hover{ transform:translateY(-2px) scale(1.04); }
.aq-begin-btn:active,.aq-retry-btn:active,.aq-next-btn:active,.aq-skip-btn:active{ transform:scale(.94); }

/* ══════════════════════════════════════════════════════════════
   iOS CHOICE GRID
   ══════════════════════════════════════════════════════════════ */
.aq-ios-grid{ width:100%; display:flex; flex-direction:column; gap:10px; }
.aq-ios-choice{
  width:100%; min-height:64px; padding:.85rem 1.1rem;
  display:flex; align-items:center; text-align:left;
  border-radius:18px; cursor:pointer; user-select:none;
  -webkit-tap-highlight-color:transparent; position:relative; overflow:hidden;
  font-family:var(--game-font-body); font-size:clamp(13px,2.3vw,17px);
  font-weight:700; line-height:1.45;
  transition:transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s, filter .14s;
  /* BR: amber family default */
  background:linear-gradient(145deg,rgba(255,200,0,.12),rgba(200,100,0,.07));
  border:2px solid rgba(255,200,0,.28); color:var(--game-tile-text);
  box-shadow:0 4px 0 rgba(0,0,0,.28),0 6px 14px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.1);
  box-sizing:border-box;
}
.aq-ios-choice::after{
  content:''; position:absolute; top:-60%; left:-80%; width:50%; height:200%;
  background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.2) 50%,transparent 72%);
  transform:skewX(-16deg); transition:left .45s ease; pointer-events:none;
}
.aq-ios-choice:hover::after{ left:150%; }
.aq-ios-choice:hover{ transform:translateY(-2px) scale(1.01); filter:brightness(1.1); }
.aq-ios-choice:active{ transform:scale(.97); }

/* BR per-card */
[data-curriculum="br"] .aq-ios-choice[data-ci="0"]{ background:linear-gradient(145deg,#4a2800,#703800); border-color:rgba(255,170,0,.55); color:#fff; box-shadow:0 5px 0 rgba(80,40,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15); }
[data-curriculum="br"] .aq-ios-choice[data-ci="1"]{ background:linear-gradient(145deg,#5a1200,#8a1e00); border-color:rgba(255,90,40,.55); color:#fff; box-shadow:0 5px 0 rgba(80,10,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15); }
[data-curriculum="br"] .aq-ios-choice[data-ci="2"]{ background:linear-gradient(145deg,#3a3000,#5a4a00); border-color:rgba(220,200,0,.5); color:#fff; box-shadow:0 5px 0 rgba(50,40,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15); }
[data-curriculum="br"] .aq-ios-choice[data-ci="3"]{ background:linear-gradient(145deg,#40100a,#601814); border-color:rgba(255,80,60,.55); color:#fff; box-shadow:0 5px 0 rgba(60,10,8,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15); }
[data-curriculum="br"] .aq-ios-choice:hover{ filter:brightness(1.16); }
/* BC per-card */
[data-curriculum="bc"] .aq-ios-choice[data-ci="0"]{ background:linear-gradient(145deg,#041e18,#062e24); border-color:rgba(0,220,180,.55); color:#e0fff8; box-shadow:0 5px 0 rgba(0,20,15,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08); }
[data-curriculum="bc"] .aq-ios-choice[data-ci="1"]{ background:linear-gradient(145deg,#041820,#062430); border-color:rgba(0,200,240,.5); color:#e0fff8; box-shadow:0 5px 0 rgba(0,15,25,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08); }
[data-curriculum="bc"] .aq-ios-choice[data-ci="2"]{ background:linear-gradient(145deg,#021e14,#042e20); border-color:rgba(0,230,160,.5); color:#e0fff8; box-shadow:0 5px 0 rgba(0,20,12,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08); }
[data-curriculum="bc"] .aq-ios-choice[data-ci="3"]{ background:linear-gradient(145deg,#021824,#033040); border-color:rgba(0,200,230,.55); color:#e0fff8; box-shadow:0 5px 0 rgba(0,15,28,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08); }
[data-curriculum="bc"] .aq-ios-choice:hover{ filter:brightness(1.18); }
/* PB per-card */
[data-curriculum="pb"] .aq-ios-choice[data-ci="0"]{ background:#fff; border:2.5px solid #ff9966; color:#2a1020; box-shadow:0 5px 0 #ffccaa,0 7px 14px rgba(255,136,68,.12); }
[data-curriculum="pb"] .aq-ios-choice[data-ci="1"]{ background:#fff; border:2.5px solid #ffcc44; color:#2a1020; box-shadow:0 5px 0 #ffe088,0 7px 14px rgba(255,200,50,.1); }
[data-curriculum="pb"] .aq-ios-choice[data-ci="2"]{ background:#fff; border:2.5px solid #44ccff; color:#2a1020; box-shadow:0 5px 0 #99e8ff,0 7px 14px rgba(50,180,255,.1); }
[data-curriculum="pb"] .aq-ios-choice[data-ci="3"]{ background:#fff; border:2.5px solid #ff6eb4; color:#2a1020; box-shadow:0 5px 0 #ffb0d8,0 7px 14px rgba(255,110,180,.12); }
[data-curriculum="pb"] .aq-ios-choice:hover{ transform:translateY(-3px) scale(1.01); filter:brightness(1.02); }

.aq-ios-choice.ios-correct{
  background:linear-gradient(135deg,#0a3d1a,#0d5e28) !important;
  border-color:#22c55e !important; color:#22c55e !important;
  box-shadow:0 0 0 4px rgba(34,197,94,.3),0 0 36px rgba(34,197,94,.5),0 5px 20px rgba(0,0,0,.3) !important;
  animation:aqChoicePop .4s cubic-bezier(.34,1.56,.64,1);
}
[data-curriculum="pb"] .aq-ios-choice.ios-correct{ background:#f0fff4 !important; border-color:#22c55e !important; color:#22c55e !important; box-shadow:0 0 0 3px rgba(34,197,94,.22),0 4px 0 #86efac !important; }
@keyframes aqChoicePop{ from{ transform:scale(.92); } 60%{ transform:scale(1.05); } to{ transform:scale(1.01); } }
.aq-ios-choice.ios-wrong{
  background:linear-gradient(135deg,#3d0a0a,#5e1010) !important;
  border-color:#ef4444 !important; color:#ef4444 !important;
  box-shadow:0 0 0 3px rgba(239,68,68,.28),0 0 28px rgba(239,68,68,.45) !important;
  animation:aqShake .42s ease;
}
[data-curriculum="pb"] .aq-ios-choice.ios-wrong{ background:#fff5f5 !important; border-color:#ef4444 !important; color:#ef4444 !important; box-shadow:0 0 0 3px rgba(239,68,68,.18),0 4px 0 #fca5a5 !important; }
.aq-ios-choice.ios-locked{ opacity:.4; pointer-events:none; }

/* ══ RESULTS ══ */
.aq-results-outer{
  max-width:660px; margin:0 auto;
  padding:0 1rem; box-sizing:border-box; width:100%;
}
.aq-results{
  display:none; text-align:center; width:100%;
  padding:2.4rem 1.4rem 2rem; border-radius:32px;
  position:relative; overflow:hidden;
  border:2.5px solid var(--aq-tier-color,#ffcc00);
  background:color-mix(in srgb,var(--aq-tier-color,#ffcc00) 6%,var(--game-bg));
  box-shadow:0 0 56px color-mix(in srgb,var(--aq-tier-color,#ffcc00) 22%,transparent),0 22px 44px rgba(0,0,0,.4);
  box-sizing:border-box;
}
.aq-results.show{ display:block; animation:aqResultIn .5s cubic-bezier(.22,.8,.36,1) both; }
@keyframes aqResultIn{ from{ opacity:0; transform:scale(.84) translateY(24px); } to{ opacity:1; transform:none; } }
.aq-results::before{
  content:''; position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44,#ff6600,#ffcc00);
  background-size:220% auto; animation:aqRainbow 2.4s linear infinite;
}
[data-curriculum="bc"] .aq-results::before{ background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa,#0055cc,#00e8b0); background-size:220% auto; }
[data-curriculum="pb"] .aq-results::before{ background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622,#ffaa22,#ff8844); background-size:220% auto; }
.aq-results::after{
  content:''; position:absolute; inset:0; z-index:0; pointer-events:none;
  background:radial-gradient(circle at 22% 78%,color-mix(in srgb,var(--aq-tier-color,#ffcc00) 12%,transparent) 0%,transparent 50%),
             radial-gradient(circle at 78% 22%,color-mix(in srgb,#22ddff 8%,transparent) 0%,transparent 50%);
}
.aq-res-inner{ position:relative; z-index:1; }
.aq-res-score{ font-family:var(--game-font-title); font-size:clamp(58px,14vw,96px); line-height:1; color:var(--aq-tier-color,#ffcc00); text-shadow:0 0 26px var(--aq-tier-color,#ffcc00); margin-bottom:4px; animation:aqScorePop .5s cubic-bezier(.22,.8,.36,1) .3s both; }
@keyframes aqScorePop{ from{ transform:scale(.58) rotate(-5deg); opacity:0; } 50%{ transform:scale(1.08) rotate(2deg); } to{ transform:none; opacity:1; } }
.aq-res-pct{ font-size:clamp(13px,2.2vw,17px); color:var(--game-muted); font-weight:700; margin-bottom:10px; animation:aqFadeUp .4s ease .5s both; }
.aq-res-label{ font-family:var(--game-font-title); font-size:clamp(22px,4.8vw,38px); color:var(--aq-tier-color,#ffcc00); margin-bottom:10px; letter-spacing:.05em; text-shadow:0 0 16px color-mix(in srgb,var(--aq-tier-color,#ffcc00) 55%,transparent); animation:aqFadeUp .4s ease .52s both; }
.aq-res-divider{ width:60px; height:3px; border-radius:99px; background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44); margin:0 auto 12px; opacity:.6; animation:aqFadeUp .4s ease .56s both; }
[data-curriculum="bc"] .aq-res-divider{ background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa); }
[data-curriculum="pb"] .aq-res-divider{ background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622); }
.aq-res-en{ font-family:var(--game-font-body); font-weight:900; font-size:clamp(13px,2.2vw,17px); color:var(--game-ink); margin-bottom:4px; animation:aqFadeUp .4s ease .6s both; }
.aq-res-kanji{ font-family:var(--game-font-jp); font-size:clamp(13px,2vw,17px); color:var(--game-muted); margin-bottom:3px; animation:aqFadeUp .4s ease .64s both; }
.aq-res-jp{ font-family:var(--game-font-jp); font-size:clamp(11px,1.7vw,14px); color:var(--game-muted); opacity:.75; margin-bottom:1.3rem; animation:aqFadeUp .4s ease .68s both; }
.aq-res-actions{ display:flex; gap:10px; justify-content:center; flex-wrap:wrap; animation:aqFadeUp .4s ease .76s both; }
@keyframes aqFadeUp{ from{ transform:translateY(12px); opacity:0; } to{ transform:none; opacity:1; } }

/* confetti */
@keyframes aqConfetti{ 0%{ transform:translate(0,0) rotate(0deg) scale(1); opacity:1; } 100%{ transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0); opacity:0; } }
.aq-confetti-piece{ position:fixed; pointer-events:none; z-index:9999; border-radius:2px; animation:aqConfetti 1.1s ease-out forwards; }

/* ══ MODAL ══ */
.aq-modal-overlay{ position:fixed; inset:0; z-index:2000; background:rgba(0,0,0,.72); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; transition:opacity .25s; padding:1rem; }
.aq-modal-overlay.open{ opacity:1; pointer-events:all; }
.aq-modal{ max-width:460px; width:100%; border-radius:24px; overflow:hidden; background:var(--game-bg); border:2px solid #ffcc00; box-shadow:0 0 44px rgba(255,200,0,.3),0 20px 40px rgba(0,0,0,.5); transform:scale(.88) translateY(16px); transition:transform .3s cubic-bezier(.34,1.56,.64,1); max-height:90vh; overflow-y:auto; }
.aq-modal-overlay.open .aq-modal{ transform:none; }
[data-curriculum="bc"] .aq-modal{ border-color:#00ddaa; background:#030810; box-shadow:0 0 44px rgba(0,200,170,.25),0 20px 40px rgba(0,0,0,.5); }
[data-curriculum="pb"] .aq-modal{ background:#fff8fc; border-color:#ff9966; box-shadow:0 8px 0 #ffccaa,0 16px 40px rgba(255,136,68,.18); }
.aq-modal-header{ padding:.9rem 1.1rem .6rem; border-bottom:1px solid var(--game-border); text-align:center; background:linear-gradient(135deg,rgba(255,200,0,.1),rgba(200,100,0,.06)); }
[data-curriculum="bc"] .aq-modal-header{ background:linear-gradient(135deg,rgba(0,200,170,.08),rgba(0,100,150,.05)); }
[data-curriculum="pb"] .aq-modal-header{ background:linear-gradient(135deg,rgba(255,136,68,.08),rgba(255,80,30,.05)); }
.aq-modal-title{ font-family:var(--game-font-title); font-size:clamp(18px,3.5vw,22px); letter-spacing:.06em; color:#ffcc00; }
[data-curriculum="bc"] .aq-modal-title{ color:#00ddaa; }
[data-curriculum="pb"] .aq-modal-title{ color:#ff8844; }
.aq-modal-title-jp{ font-family:var(--game-font-jp); font-size:clamp(10px,1.7vw,13px); color:var(--game-muted); margin-top:3px; }
.aq-modal-body{ padding:.9rem 1.1rem 1.1rem; }
.aq-how-step{ display:grid; grid-template-columns:30px 1fr; gap:8px; align-items:start; margin-bottom:.65rem; }
.aq-how-step:last-child{ margin-bottom:0; }
.aq-how-num{ width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,var(--game-primary),var(--game-secondary)); color:#000; font-family:var(--game-font-title); font-size:clamp(11px,2vw,14px); font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.aq-how-en{ font-family:var(--game-font-body); font-size:clamp(11px,1.9vw,13px); font-weight:800; color:var(--game-ink); line-height:1.35; padding-top:2px; }
[data-curriculum="pb"] .aq-how-en{ color:#2a1020; }
.aq-how-jp{ font-family:var(--game-font-jp); font-size:clamp(9px,1.5vw,11px); color:var(--game-muted); margin-top:2px; line-height:1.4; }
.aq-modal-close{ display:block; width:100%; margin-top:.9rem; font-family:var(--game-font-title); font-size:clamp(13px,2.4vw,16px); letter-spacing:.06em; padding:10px; border-radius:999px; border:none; cursor:pointer; background:linear-gradient(135deg,var(--game-primary),var(--game-secondary)); color:#000; font-weight:900; transition:transform .15s; }
.aq-modal-close:hover{ transform:scale(1.03); }
`;
document.head.appendChild(S);

/* ══════════════════════════════════════════════════════════════
   MOUNT HTML
   ══════════════════════════════════════════════════════════════ */
const MIC_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor"/><path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

U.mount(`
<div class="aq-header">
  <div class="aq-curriculum">${curriculumLabel()}</div>
  <div class="aq-date">${titleDateLabel()}</div>
</div>

<div class="aq-outer" id="aq-main-wrap">
  <div class="aq-dots-row" id="aq-dots"></div>

  <div class="aq-hud">
    <div class="aq-pill">Q <b id="aq-num">1</b> / 15</div>
    <div class="aq-pill">Score <b id="aq-score">0</b> / 15</div>
  </div>

  <!-- Question card -->
  <div class="aq-card" id="aq-card">
    <div class="aq-card-top">
      <div class="aq-q-block">
        <div class="aq-q-label">QUESTION / 質問</div>
        <div class="aq-jp-kanji" id="aq-jp"></div>
        <div class="aq-jp-hira"  id="aq-hira"></div>
      </div>
      <button class="aq-play-btn" id="aq-play" aria-label="Listen to question">▶</button>
    </div>

    <!-- Answer zone — words appear as heard -->
    <div class="aq-answer-zone" id="aq-answer-zone">
      <div class="aq-answer-placeholder" id="aq-placeholder">…your answer here…</div>
      <div id="aq-en" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;width:100%;"></div>
    </div>

    <div class="aq-progress-wrap" id="aq-prog-wrap" style="display:none">
      <div class="aq-progress-track">
        <div class="aq-progress-fill" id="aq-prog-fill" style="width:100%"></div>
      </div>
    </div>
  </div>

  ${!isIOS ? `
  <div class="aq-heard-wrap">
    <div class="aq-heard-box" id="aq-heard">
      <span id="aq-heard-text">…</span>
    </div>
  </div>
  <button class="aq-mic-btn" id="aq-mic" aria-label="Tap to answer">${MIC_SVG}</button>
  <div class="aq-status" id="aq-status">TAP MIC TO ANSWER</div>
  ` : `
  <div class="aq-ios-grid" id="aq-ios-grid"></div>
  `}

  <div class="aq-bottom-bar">
    <button class="aq-begin-btn" id="aq-begin">START / スタート</button>
    <button class="aq-retry-btn" id="aq-retry" style="display:none">TRY AGAIN / もう一回</button>
    <button class="aq-next-btn"  id="aq-next"  style="display:none">NEXT ▶ / 次へ</button>
    <button class="aq-skip-btn"  id="aq-skip"  style="display:none">SKIP / スキップ</button>
    <button class="aq-help-btn"  id="aq-help">？</button>
  </div>
</div>

<!-- RESULTS -->
<div class="aq-results-outer">
<div class="aq-results" id="aq-results">
  <div class="aq-res-inner">
    <div class="aq-res-score"  id="aq-rs"></div>
    <div class="aq-res-pct"    id="aq-rp"></div>
    <div class="aq-res-label"  id="aq-rl"></div>
    <div class="aq-res-divider"></div>
    <div class="aq-res-en"     id="aq-re"></div>
    <div class="aq-res-kanji"  id="aq-rk"></div>
    <div class="aq-res-jp"     id="aq-rj"></div>
    <div class="aq-res-actions">
      <button class="game-btn game-btn-primary"   id="aq-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="aq-back">メニューへ</button>
    </div>
  </div>
</div>
</div>

<!-- HELP MODAL -->
<div class="aq-modal-overlay" id="aq-modal-overlay">
  <div class="aq-modal" role="dialog" aria-modal="true">
    <div class="aq-modal-header">
      <div class="aq-modal-title">HOW TO PLAY</div>
      <div class="aq-modal-title-jp">あそびかた</div>
    </div>
    <div class="aq-modal-body">
      ${isIOS ? `
      <div class="aq-how-step"><div class="aq-how-num">1</div><div>
        <div class="aq-how-en">Read the Japanese question and press ▶ to hear it.</div>
        <div class="aq-how-jp">日本語の質問を読んで▶で聞こう。</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">2</div><div>
        <div class="aq-how-en">Tap the correct English answer from the 4 choices.</div>
        <div class="aq-how-jp">4つの英語から正しい答えをえらぼう。</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">3</div><div>
        <div class="aq-how-en">First-try correct answers score a point!</div>
        <div class="aq-how-jp">一発正解でポイントゲット！</div>
      </div></div>
      ` : `
      <div class="aq-how-step"><div class="aq-how-num">1</div><div>
        <div class="aq-how-en">Read the Japanese question and press ▶ to hear it.</div>
        <div class="aq-how-jp">日本語の質問を読んで▶で聞こう。</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">2</div><div>
        <div class="aq-how-en">Press START, then tap the mic and say the English answer!</div>
        <div class="aq-how-jp">STARTを押してマイクをタップして英語で答えよう！</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">3</div><div>
        <div class="aq-how-en">Words light up green as you say them — answer the question!</div>
        <div class="aq-how-jp">言えた言葉が緑に光るよ！質問に答えよう！</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">4</div><div>
        <div class="aq-how-en">80%+ correct = point! Retry as many times as you need.</div>
        <div class="aq-how-jp">80%以上でポイント！何回でも挑戦できるよ！</div>
      </div></div>
      `}
      <button class="aq-modal-close" id="aq-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>

<!-- iOS NOTICE OVERLAY -->
${isIOS ? `
<div class="aq-modal-overlay" id="aq-ios-overlay" style="z-index:3000;">
  <div class="aq-modal">
    <div class="aq-modal-header">
      <div class="aq-modal-title">iPhone / iPad モード</div>
      <div class="aq-modal-title-jp">iOS Practice Mode</div>
    </div>
    <div class="aq-modal-body">
      <p style="font-family:var(--game-font-body);font-size:clamp(13px,2.2vw,15px);font-weight:700;color:var(--game-ink);line-height:1.55;margin-bottom:.8rem;">
        The full microphone version of this game works on Android and desktop browsers.
        On iPhone and iPad you'll choose the correct English answer from 4 options — press ▶ to hear the question first!
      </p>
      <p style="font-family:var(--game-font-jp);font-size:clamp(12px,2vw,14px);color:var(--game-muted);line-height:1.55;">
        フルバージョン（マイク判定）はAndroid・パソコンで遊べます。iPad・iPhoneでは4択で答えを選ぶ練習モードになります。
      </p>
      <button class="aq-modal-close" id="aq-ios-ok">わかった！ Got it!</button>
    </div>
  </div>
</div>
` : ''}
`);

/* ══════════════════════════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════════════════════════ */
const mainWrap   = document.getElementById('aq-main-wrap');
const numEl      = document.getElementById('aq-num');
const scoreEl    = document.getElementById('aq-score');
const enEl       = document.getElementById('aq-en');
const jpEl       = document.getElementById('aq-jp');
const hiraEl     = document.getElementById('aq-hira');
const answerZone = document.getElementById('aq-answer-zone');
const placeholder= document.getElementById('aq-placeholder');
const progWrap   = document.getElementById('aq-prog-wrap');
const progFill   = document.getElementById('aq-prog-fill');
const playBtn    = document.getElementById('aq-play');
const beginBtn   = document.getElementById('aq-begin');
const retryBtn   = document.getElementById('aq-retry');
const nextBtn    = document.getElementById('aq-next');
const skipBtn    = document.getElementById('aq-skip');
const results    = document.getElementById('aq-results');
const dotsRow    = document.getElementById('aq-dots');
const helpBtn    = document.getElementById('aq-help');
const modalOver  = document.getElementById('aq-modal-overlay');

const micBtn     = isIOS ? null : document.getElementById('aq-mic');
const heardBox   = isIOS ? null : document.getElementById('aq-heard');
const heardText  = isIOS ? null : document.getElementById('aq-heard-text');
const statusEl   = isIOS ? null : document.getElementById('aq-status');
const iosGrid    = isIOS ? document.getElementById('aq-ios-grid') : null;

/* Build 15 progress dots */
for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'aq-dot'; d.id = `aq-d${i}`;
  dotsRow.appendChild(d);
}

/* Modal */
helpBtn.addEventListener('click', () => modalOver.classList.add('open'));
document.getElementById('aq-modal-ok').addEventListener('click', () => modalOver.classList.remove('open'));
modalOver.addEventListener('click', e => { if (e.target === modalOver) modalOver.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOver.classList.remove('open'); });

/* iOS notice overlay */
if (isIOS) {
  const iosOverlay = document.getElementById('aq-ios-overlay');
  const iosOk      = document.getElementById('aq-ios-ok');
  if (iosOverlay && iosOk) {
    iosOverlay.classList.add('open');
    iosOk.addEventListener('click', () => {
      iosOverlay.classList.remove('open');
      U.unlockAudio();
    }, { once: true });
  }
}

function updateDots() {
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`aq-d${i}`);
    if (!d) continue;
    d.className = 'aq-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
  }
}

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
const order      = U.shuffle(CFG.cards.slice(0, 15));
let idx          = 0;
let score        = 0;
let firstScores  = new Array(15).fill(null);
let isBusy       = false;
let listening    = false;
let collecting   = false;
let heard        = '';
let SR_inst      = null;
let iosAnswered  = false;
let iosFirstTry  = true;

/* ══════════════════════════════════════════════════════════════
   PROGRESS BAR
   ══════════════════════════════════════════════════════════════ */
let progRAF   = 0;
let progStart = 0;

function startProgress() {
  stopProgress();
  progWrap.style.display = '';
  progFill.style.width = '100%';
  progFill.classList.remove('warning');
  progStart = performance.now();
  const tick = (t) => {
    const p   = 1 - (t - progStart) / DUR_MS;
    const pct = Math.max(0, p);
    progFill.style.width = `${pct * 100}%`;
    if (pct < 0.2) progFill.classList.add('warning');
    else           progFill.classList.remove('warning');
    if (pct > 0)   progRAF = requestAnimationFrame(tick);
  };
  progRAF = requestAnimationFrame(tick);
}

function stopProgress() {
  cancelAnimationFrame(progRAF);
  progRAF = 0;
  progFill.style.width = '0%';
  progFill.classList.remove('warning');
}

/* ══════════════════════════════════════════════════════════════
   WORD CHIPS — hidden until heard (answer reveal mode)
   ══════════════════════════════════════════════════════════════ */
function mountWords(text) {
  /* Render chips but keep them invisible until heard */
  enEl.innerHTML = text.split(/\s+/)
    .map(w => `<span class="aq-word" data-word="${w.toLowerCase().replace(/[.?!,'"]/g,'')}" style="opacity:0;transform:scale(.7)">${w}</span>`)
    .join(' ');
  placeholder.style.display = '';
  answerZone.classList.remove('has-words');
}

function markHeard(spokenText) {
  const words = spokenText.toLowerCase().replace(/[.?!,'"]/g,'').split(/\s+/);
  const heardSet = new Set();
  words.forEach(w => {
    heardSet.add(w);
    const phones = HOMOPHONES[w];
    if (phones) phones.forEach(p => heardSet.add(p));
  });

  let anyRevealed = false;
  enEl.querySelectorAll('.aq-word').forEach(span => {
    if (heardSet.has(span.dataset.word) && !span.classList.contains('heard')) {
      span.classList.add('heard');
      /* Animate in */
      span.style.transition = 'opacity .2s ease, transform .2s cubic-bezier(.34,1.56,.64,1)';
      span.style.opacity = '1';
      span.style.transform = 'translateY(-3px) scale(1.06)';
      anyRevealed = true;
    }
  });

  if (anyRevealed) {
    placeholder.style.display = 'none';
    answerZone.classList.add('has-words');
  }
}

function revealAllWords() {
  enEl.querySelectorAll('.aq-word').forEach((span, i) => {
    setTimeout(() => {
      span.style.transition = 'opacity .2s ease, transform .2s cubic-bezier(.34,1.56,.64,1)';
      span.style.opacity = '1';
      span.style.transform = '';
      if (!span.classList.contains('heard')) span.classList.add('missed');
    }, i * 40);
  });
  placeholder.style.display = 'none';
  answerZone.classList.add('has-words');
}

function revealCorrect() {
  enEl.querySelectorAll('.aq-word').forEach((span, i) => {
    setTimeout(() => {
      span.style.transition = 'opacity .2s ease, transform .2s cubic-bezier(.34,1.56,.64,1)';
      span.style.opacity = '1';
      span.style.transform = '';
      span.classList.add('heard');
    }, i * 40);
  });
  placeholder.style.display = 'none';
  answerZone.classList.add('has-words');
}

/* ══════════════════════════════════════════════════════════════
   SHOW CARD
   ══════════════════════════════════════════════════════════════ */
function showCard() {
  isBusy = false;
  const card = order[idx];
  numEl.textContent  = idx + 1;
  jpEl.textContent   = card.jp;
  hiraEl.textContent = card.hira || '';
  mountWords(card.en);
  stopProgress();
  progWrap.style.display = 'none';

  beginBtn.style.display = '';
  retryBtn.style.display = 'none';
  nextBtn.style.display  = 'none';
  skipBtn.style.display  = 'none';
  playBtn.disabled = false;
  updateDots();

  if (!isIOS) {
    if (heardText) heardText.textContent = '…';
    if (heardBox)  heardBox.className = 'aq-heard-box';
    if (micBtn)    { micBtn.disabled = false; micBtn.classList.remove('listening'); }
    if (statusEl)  { statusEl.textContent = 'TAP MIC TO ANSWER'; statusEl.classList.remove('listening'); }
  } else {
    iosAnswered = false;
    iosFirstTry = true;
    buildIosChoices(card);
  }
}

/* ══════════════════════════════════════════════════════════════
   SR SETUP
   ══════════════════════════════════════════════════════════════ */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

function makeSR() {
  if (!SR || isIOS) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.continuous = true;
  r.interimResults = true;
  try { r.maxAlternatives = 5; } catch(e) {}
  r.onresult = e => {
    if (!collecting) return;
    let txt = '';
    for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript + ' ';
    heard = (heard + ' ' + txt).trim();
    markHeard(heard);
    if (heardText) heardText.textContent = heard;
  };
  r.onend = () => { if (listening) try { r.start(); } catch(e) {} };
  return r;
}

/* ══════════════════════════════════════════════════════════════
   BEGIN ROUND (Android / Desktop)
   ══════════════════════════════════════════════════════════════ */
async function beginRound() {
  if (isIOS) return;
  if (isBusy) return;
  isBusy = true;
  beginBtn.style.display = 'none';
  playBtn.disabled = true;
  U.unlockAudio();

  heard      = '';
  listening  = false;
  collecting = false;

  if (statusEl) { statusEl.textContent = 'GETTING READY…'; statusEl.classList.remove('listening'); }

  SR_inst = makeSR();
  if (SR_inst) {
    listening = true;
    try { SR_inst.start(); } catch(e) {}
    await U.wait(650);
  }

  for (const n of [3, 2, 1]) {
    if (statusEl) statusEl.textContent = `${n}…`;
    await U.wait(700);
  }

  if (statusEl) { statusEl.textContent = 'LISTENING…'; statusEl.classList.add('listening'); }
  if (micBtn)   micBtn.classList.add('listening');

  heard      = '';
  collecting = true;
  startProgress();
  await U.wait(DUR_MS + 140);

  collecting = false;
  listening  = false;
  if (SR_inst) { try { SR_inst.stop(); } catch(e) {} }
  stopProgress();

  if (micBtn)   micBtn.classList.remove('listening');
  if (statusEl) { statusEl.textContent = 'DONE'; statusEl.classList.remove('listening'); }
  playBtn.disabled = false;

  /* Reveal any words not yet shown */
  revealAllWords();

  /* Score by word coverage */
  const total  = enEl.querySelectorAll('.aq-word').length;
  const nHeard = enEl.querySelectorAll('.aq-word.heard').length;
  const s      = total > 0 ? Math.round((nHeard / total) * 100) : 0;

  if (firstScores[idx] === null) firstScores[idx] = s;

  if (s >= PASS) {
    if (heardBox) heardBox.className = 'aq-heard-box correct';
    U.playSFX('ding');
    if (firstScores[idx] === s) { score++; scoreEl.textContent = score; }
    updateDots();
    nextBtn.style.display = '';
    skipBtn.style.display = 'none';
  } else {
    if (heardBox) heardBox.className = 'aq-heard-box wrong';
    U.playSFX('fart');
    retryBtn.style.display = '';
    skipBtn.style.display  = '';
  }

  isBusy = false;
}

/* ══════════════════════════════════════════════════════════════
   iOS MODE — 4-CHOICE ANSWER PICKER
   ══════════════════════════════════════════════════════════════ */
function buildIosChoices(card) {
  if (!iosGrid) return;
  iosGrid.innerHTML = '';
  const pool        = order.filter((_, i) => i !== idx);
  const distractors = U.shuffle(pool).slice(0, 3);
  const choices     = U.shuffle([card, ...distractors]);

  choices.forEach((c, ci) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aq-ios-choice';
    btn.setAttribute('data-ci', ci);
    btn.textContent = c.en;

    btn.addEventListener('touchstart', e => { e.preventDefault(); U.unlockAudio(); handleIosPick(btn, c); }, { passive: false });
    btn.addEventListener('click', e => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      handleIosPick(btn, c);
    });

    btn.style.opacity = '0';
    btn.style.transform = 'translateY(8px) scale(.97)';
    setTimeout(() => {
      btn.style.transition = 'opacity .24s ease, transform .24s cubic-bezier(.34,1.56,.64,1)';
      btn.style.opacity = '1';
      btn.style.transform = '';
    }, ci * 55);

    iosGrid.appendChild(btn);
  });
}

function handleIosPick(btn, card) {
  if (iosAnswered) return;
  const correct = card.en === order[idx].en;

  if (correct) {
    iosAnswered = true;
    btn.classList.add('ios-correct');
    Array.from(iosGrid.children).forEach(b => { if (b !== btn) b.classList.add('ios-locked'); });

    U.playSFX('ding');
    if (iosFirstTry) { score++; scoreEl.textContent = score; }
    updateDots();

    /* Reveal the answer words in green */
    revealCorrect();

    /* Play audio then show next */
    if (order[idx].mp3) {
      const a = new Audio(CFG.audioBase + order[idx].mp3);
      a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline','');
      a.play().catch(()=>{});
      a.onended = () => { nextBtn.style.display = ''; };
      setTimeout(() => { if (nextBtn.style.display === 'none') nextBtn.style.display = ''; }, 5000);
    } else {
      setTimeout(() => { nextBtn.style.display = ''; }, 500);
    }

  } else {
    iosFirstTry = false;
    btn.classList.add('ios-wrong');
    U.playSFX('fart');
    skipBtn.style.display = '';
    setTimeout(() => { btn.classList.remove('ios-wrong'); }, 500);
  }
}

/* ══════════════════════════════════════════════════════════════
   PLAY BUTTON
   ══════════════════════════════════════════════════════════════ */
playBtn.addEventListener('click', () => {
  if (isBusy || listening) return;
  const card = order[idx];
  if (!card.mp3) return;
  try {
    const a = new Audio(CFG.audioBase + card.mp3);
    a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline','');
    a.play().catch(()=>{});
  } catch(e) {}
});

/* ══════════════════════════════════════════════════════════════
   BUTTON WIRING
   ══════════════════════════════════════════════════════════════ */
beginBtn.addEventListener('click', () => { U.unlockAudio(); beginRound(); });
beginBtn.addEventListener('touchstart', e => { e.preventDefault(); U.unlockAudio(); beginRound(); }, { passive: false });

retryBtn.addEventListener('click', () => {
  U.unlockAudio();
  retryBtn.style.display = 'none';
  skipBtn.style.display  = 'none';
  if (heardBox)  heardBox.className = 'aq-heard-box';
  if (heardText) heardText.textContent = '…';
  mountWords(order[idx].en);
  beginRound();
});

nextBtn.addEventListener('click', () => {
  if (isBusy) return;
  idx++;
  scoreEl.textContent = score;
  if (idx >= order.length) { showResults(); return; }
  iosAnswered = false;
  iosFirstTry = true;
  showCard();
});

skipBtn.addEventListener('click', () => {
  if (isBusy) return;
  idx++;
  scoreEl.textContent = score;
  if (idx >= order.length) { showResults(); return; }
  iosAnswered = false;
  iosFirstTry = true;
  showCard();
});

/* ══════════════════════════════════════════════════════════════
   CONFETTI
   ══════════════════════════════════════════════════════════════ */
function fireConfetti(big = false) {
  /* Gold/amber confetti for ask-question */
  const colors = ['#ffcc00','#ff8800','#ffee44','#22ddff','#fff','#ff6600','#aaff22'];
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight * 0.38;
  for (let i = 0, n = big ? 80 : 36; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'aq-confetti-piece';
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
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`aq-d${i}`);
    if (d) d.className = 'aq-dot done';
  }

  mainWrap.style.display = 'none';
  results.classList.add('show');

  const tier = getTier(score);
  const pct  = Math.round((score / 15) * 100);

  document.dispatchEvent(new CustomEvent('booha:gameEnd', {
    detail: {
      saveId:    `${CFG.curriculum}:ask_sentence`,
      score:     pct,
      completed: pct >= 40,
    }
  }));

  results.style.setProperty('--aq-tier-color', tier.color);
  document.getElementById('aq-rs').textContent = `${score} / 15`;
  document.getElementById('aq-rp').textContent = `${pct}%`;
  document.getElementById('aq-rl').textContent = tier.label;
  document.getElementById('aq-re').textContent = tier.en;
  document.getElementById('aq-rk').textContent = tier.kanji;
  document.getElementById('aq-rj').textContent = tier.jp;

  if (score === 15) {
    fireConfetti(false);
    setTimeout(() => fireConfetti(true), 500);
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
document.getElementById('aq-replay').addEventListener('click', () => {
  results.classList.remove('show');
  mainWrap.style.display = '';
  idx = 0; score = 0;
  firstScores = new Array(15).fill(null);
  scoreEl.textContent = '0';
  iosAnswered = false; iosFirstTry = true;
  U.shuffle(order);
  showCard();
});

document.getElementById('aq-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

/* ══════════════════════════════════════════════════════════════
   GO
   ══════════════════════════════════════════════════════════════ */
U.unlockAudio();
showCard();

})();
