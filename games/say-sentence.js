
/* ══════════════════════════════════════════════════════════════
   say-sentence.js  —  Say the Sentence  v4
   Desktop/Android: big JP card → mic → word chips glow rainbow
   iOS: big JP card → 4-choice pick, auto-advance on correct
   No countdown. Auto-advance on pass. Streak counter.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Say the Sentence');
U.unlockAudio();

const isIOS  = U.isIOS();
const PASS   = 80;
const DUR_MS = 3600; // PATCH #3: was 7500

/* ═══ PRE-LOAD SFX — clone pattern ═══ */
const SFX = {};
function loadSfx(name, url) {
  return new Promise(resolve => {
    const a = new Audio(url);
    a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline','');
    a.addEventListener('canplaythrough', () => { SFX[name] = a; resolve(); }, { once:true });
    a.addEventListener('error', resolve, { once:true });
    a.load();
    setTimeout(() => { if (!SFX[name]) { SFX[name] = a; resolve(); } }, 2000);
  });
}
function playSfx(name) {
  const src = SFX[name]; if (!src) return;
  try { const c = src.cloneNode(); c.setAttribute('playsinline',''); c.setAttribute('webkit-playsinline',''); c.play().catch(()=>{}); } catch(e) {}
}

await Promise.all([
  loadSfx('ding', CFG.sfxBase + 'ding.mp3'),
  loadSfx('fart', CFG.sfxBase + 'fart.mp3'),
]);

/* ═══ TIERS ═══ */
const TIERS = [
  { min:0,  max:5,  sound:'result_0-5.mp3',  label:'KEEP SPEAKING', en:'Every sentence you say makes you stronger!', kanji:'発声練習を続けよう！', jp:'もっと声に出して練習しよう！', color:'#f43f5e' },
  { min:6,  max:10, sound:'result_6-10.mp3', label:'GOOD VOICE!',    en:'You spoke up — that takes real courage!',   kanji:'勇気を出して発声！素晴らしい！', jp:'声が出てる！すごく勇気がいるね！', color:'#f97316' },
  { min:11, max:14, sound:'result_11-14.mp3',label:'ALMOST PERFECT', en:'Nearly every sentence was perfect!',        kanji:'ほぼ完璧な発音！驚異的！', jp:'ほぼ完璧な発音！すごい！', color:'#22d3ee' },
  { min:15, max:15, sound:'result_15.mp3',   label:'PERFECT VOICE!', en:'Every sentence said perfectly — incredible!',kanji:'全文完璧発音！最強の声！', jp:'全部の文をきれいに言えた！完璧！', color:'#a78bfa' },
];
const getTier = s => TIERS.find(t => s >= t.min && s <= t.max) ?? TIERS[0];

/* ═══ RAINBOW CHIP COLORS ═══ */
const CHIP_COLORS = [
  { bg:'rgba(167,139,250,.22)', border:'#a78bfa', text:'#c4b5fd', shadow:'rgba(167,139,250,.5)' },
  { bg:'rgba(255,34,136,.18)',  border:'#ff2288', text:'#ff80c0', shadow:'rgba(255,34,136,.5)'  },
  { bg:'rgba(255,204,0,.18)',   border:'#ffcc00', text:'#ffe566', shadow:'rgba(255,204,0,.5)'   },
  { bg:'rgba(34,221,255,.18)',  border:'#22ddff', text:'#88eeff', shadow:'rgba(34,221,255,.5)'  },
  { bg:'rgba(170,255,34,.16)',  border:'#aaff22', text:'#ccff77', shadow:'rgba(170,255,34,.45)' },
  { bg:'rgba(255,110,180,.18)', border:'#ff6eb4', text:'#ffaacc', shadow:'rgba(255,110,180,.5)' },
  { bg:'rgba(255,120,0,.18)',   border:'#ff7800', text:'#ffaa55', shadow:'rgba(255,120,0,.45)'  },
];

/* ═══ HOMOPHONES ═══ */
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

/* ═══ LABEL HELPERS ═══ */
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
  const MM = {jan:'January',feb:'February',mar:'March',apr:'April',may:'May',jun:'June',jul:'July',aug:'August',sep:'September',oct:'October',nov:'November',dec:'December'};
  return `${MM[m[1].toLowerCase()]} Week ${m[2]}`;
}

/* ═══ STYLES ═══ */
const S = document.createElement('style');
S.textContent = `
.game-header{display:none!important}
.sas-outer{max-width:660px;margin:0 auto;padding:0 1rem 6rem;display:flex;flex-direction:column;align-items:center;gap:.75rem;box-sizing:border-box}
.sas-header{text-align:center;padding:.5rem 3rem .5rem;width:100%;max-width:660px;margin:0 auto}
.sas-curriculum{font-family:var(--game-font-title);font-size:clamp(22px,5.5vw,46px);font-weight:900;letter-spacing:.12em;text-transform:uppercase;background:linear-gradient(90deg,#a78bfa,#ff2288,#ffcc00,#22ddff,#a78bfa);background-size:220% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:sasRainbow 3s linear infinite}
[data-curriculum="bc"] .sas-curriculum{background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);background-size:220% auto;-webkit-background-clip:text;background-clip:text}
[data-curriculum="pb"] .sas-curriculum{background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);background-size:220% auto;-webkit-background-clip:text;background-clip:text}
@keyframes sasRainbow{to{background-position:220% center}}
.sas-date{margin-top:2px;font-family:var(--game-font-body);font-size:clamp(10px,1.8vw,14px);font-weight:800;color:var(--game-muted);letter-spacing:.06em}
[data-curriculum="pb"] .sas-date{color:rgba(58,26,46,.55)}
.sas-dots-row{display:flex;justify-content:center;gap:5px;flex-wrap:wrap;width:100%}
.sas-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.18);transition:all .3s;flex-shrink:0}
.sas-dot.active{background:#a78bfa;border-color:#a78bfa;box-shadow:0 0 8px #a78bfa}
.sas-dot.done{background:#22c55e;border-color:#22c55e;box-shadow:0 0 7px rgba(34,197,94,.7)}
[data-curriculum="pb"] .sas-dot{background:rgba(255,110,180,.15);border-color:rgba(255,110,180,.25)}
[data-curriculum="pb"] .sas-dot.active{background:#ff9922;border-color:#ff9922;box-shadow:0 0 8px #ff9922}
[data-curriculum="bc"] .sas-dot.active{background:#00ddff;border-color:#00ddff;box-shadow:0 0 8px #00ddff}
.sas-hud{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;width:100%}
.sas-pill{padding:5px 16px;border-radius:999px;background:var(--game-pill-bg);border:1.5px solid var(--game-pill-border);color:var(--game-pill-text);font-size:clamp(12px,2vw,15px);font-weight:900;letter-spacing:.03em;box-shadow:0 2px 10px rgba(0,0,0,.2)}
.sas-pill b{color:#a78bfa;font-size:1.1em;text-shadow:0 0 9px #a78bfa}
[data-curriculum="bc"] .sas-pill b{color:#00ddff;text-shadow:0 0 9px #00ddff}
[data-curriculum="pb"] .sas-pill{background:#fff;border-color:#ffb0d8;color:#2a1020;box-shadow:0 3px 0 #ffccdd}
[data-curriculum="pb"] .sas-pill b{color:#ff9922;text-shadow:none}
.sas-card{width:100%;border-radius:22px;padding:1.8rem 1.4rem 1.4rem;position:relative;overflow:hidden;text-align:center;background:var(--game-surface);border:2px solid var(--game-border);box-shadow:0 6px 26px rgba(0,0,0,.22);box-sizing:border-box;container-type:inline-size}
[data-curriculum="br"] .sas-card{background:linear-gradient(145deg,rgba(167,139,250,.07),rgba(255,204,0,.04),rgba(0,0,0,.2));border-color:rgba(167,139,250,.25)}
[data-curriculum="bc"] .sas-card{background:linear-gradient(145deg,rgba(0,240,255,.06),rgba(68,85,255,.07),rgba(0,0,0,.28));border-color:rgba(0,240,255,.2)}
[data-curriculum="pb"] .sas-card{background:#fff;border:3px solid #cc88ff;box-shadow:0 5px 0 #ddb8ff,0 8px 22px rgba(180,100,255,.12)}
.sas-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#a78bfa,#ff2288,#ffcc00,#22ddff,#a78bfa);background-size:220% auto;animation:sasRainbow 2.4s linear infinite}
[data-curriculum="bc"] .sas-card::before{background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);background-size:220% auto}
[data-curriculum="pb"] .sas-card::before{background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);background-size:220% auto}
.sas-jp-kanji{font-family:var(--game-font-jp);font-weight:900;font-size:clamp(16px,calc(13cqi - var(--sas-jp-len,0) * 0.4cqi),48px);line-height:1.5;color:var(--game-ink);word-break:break-all;overflow-wrap:anywhere}
[data-curriculum="pb"] .sas-jp-kanji{color:#2a1020}
.sas-jp-hira{font-family:var(--game-font-jp);font-size:clamp(11px,2vw,16px);color:var(--game-muted);margin-top:4px;word-break:break-all}
[data-curriculum="pb"] .sas-jp-hira{color:rgba(58,26,46,.5)}
.sas-card.listening{border-color:rgba(34,197,94,.6)!important;animation:sasListenPulse 1s ease-in-out infinite}
@keyframes sasListenPulse{0%,100%{box-shadow:0 0 0 4px rgba(34,197,94,.15),0 6px 26px rgba(0,0,0,.22)}50%{box-shadow:0 0 0 12px rgba(34,197,94,.28),0 6px 30px rgba(0,0,0,.3)}}
.sas-card.wrong-state{animation:sasCardShake .45s ease;border-color:#ef4444!important;box-shadow:0 0 0 4px rgba(239,68,68,.2),0 0 30px rgba(239,68,68,.3)!important}
@keyframes sasCardShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}35%{transform:translateX(8px)}55%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.sas-progress-wrap{width:100%;margin:.5rem 0 0}
.sas-progress-track{height:8px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.1)}
[data-curriculum="pb"] .sas-progress-track{background:rgba(180,100,255,.08);border-color:rgba(180,100,255,.18)}
.sas-progress-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#a78bfa,#ff2288,#22ddff);transition:width .1s linear;position:relative;overflow:hidden}
[data-curriculum="bc"] .sas-progress-fill{background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff)}
[data-curriculum="pb"] .sas-progress-fill{background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff)}
.sas-progress-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 20%,rgba(255,255,255,.35) 50%,transparent 80%);background-size:200% 100%;animation:sasShimmer 1.2s linear infinite}
@keyframes sasShimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.sas-progress-fill.warning{animation:sasPulseWarn .5s ease-in-out infinite}
@keyframes sasPulseWarn{0%,100%{filter:brightness(1)}50%{filter:brightness(1.7) saturate(2)}}
.sas-chips-row{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;align-items:center;width:100%;padding:.2rem 0}
.sas-word{display:inline-flex;align-items:center;justify-content:center;padding:6px 12px;border-radius:11px;font-family:var(--game-font-body);font-weight:700;font-size:clamp(13px,2.6vw,19px);line-height:1.2;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.14);color:var(--game-ink);transition:background .25s,border-color .25s,color .25s,transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s}
[data-curriculum="pb"] .sas-word{background:rgba(180,100,255,.08);border-color:rgba(180,100,255,.2);color:#2a1020}
.sas-word.missed{background:rgba(239,68,68,.12)!important;border-color:#ef4444!important;color:#ef4444!important;box-shadow:none!important;transform:none!important}
.sas-mic-row{display:flex;gap:16px;align-items:center;justify-content:center;width:100%}
.sas-play-btn{width:52px;height:52px;border-radius:50%;flex-shrink:0;border:none;cursor:pointer;display:grid;place-items:center;font-size:19px;color:#1a0a00;background:radial-gradient(circle at 30% 30%,#ffe8a3,#ffd36a 60%,#ffb800 100%);box-shadow:0 0 0 3px rgba(255,213,120,.35),0 0 16px rgba(255,214,120,.55);animation:sasGoldPulse 1.8s ease-in-out infinite;transition:transform .15s,opacity .2s;-webkit-tap-highlight-color:transparent}
.sas-play-btn:hover{transform:scale(1.1)}
.sas-play-btn:active{transform:scale(.92)}
.sas-play-btn:disabled{opacity:.35;pointer-events:none;animation:none}
@keyframes sasGoldPulse{0%,100%{box-shadow:0 0 0 3px rgba(255,213,120,.25),0 0 10px rgba(255,214,120,.35)}50%{box-shadow:0 0 0 4px rgba(255,213,120,.5),0 0 24px rgba(255,214,120,.9)}}
.sas-mic-btn{width:72px;height:72px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;background:linear-gradient(135deg,#a78bfa,#7c3aed);box-shadow:0 0 24px rgba(167,139,250,.5),0 5px 0 rgba(60,10,160,.5),0 8px 20px rgba(0,0,0,.3);transition:transform .15s cubic-bezier(.34,1.56,.64,1),box-shadow .15s;-webkit-tap-highlight-color:transparent}
[data-curriculum="bc"] .sas-mic-btn{background:linear-gradient(135deg,#00ddff,#0055cc);box-shadow:0 0 24px rgba(0,200,220,.5),0 5px 0 rgba(0,30,100,.5),0 8px 20px rgba(0,0,0,.3)}
[data-curriculum="pb"] .sas-mic-btn{background:linear-gradient(135deg,#ff6eb4,#cc44aa);box-shadow:0 0 24px rgba(255,110,180,.5),0 5px 0 #ffb0d8,0 8px 20px rgba(0,0,0,.2)}
.sas-mic-btn svg{width:32px;height:32px;fill:#fff}
.sas-mic-btn:hover{transform:translateY(-3px) scale(1.07)}
.sas-mic-btn:active{transform:scale(.91)}
.sas-mic-btn:disabled{opacity:.32;pointer-events:none}
.sas-mic-btn.listening{background:linear-gradient(135deg,#22c55e,#15803d);animation:sasMicRing 1s ease-out infinite}
[data-curriculum="bc"] .sas-mic-btn.listening{background:linear-gradient(135deg,#a78bfa,#7c3aed);animation:sasMicRingPurple 1s ease-out infinite}
@keyframes sasMicRing{0%{box-shadow:0 0 0 0 rgba(34,197,94,.7),0 5px 0 rgba(10,80,30,.5),0 8px 20px rgba(0,0,0,.3)}70%{box-shadow:0 0 0 24px rgba(34,197,94,0),0 5px 0 rgba(10,80,30,.5),0 8px 20px rgba(0,0,0,.3)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0),0 5px 0 rgba(10,80,30,.5),0 8px 20px rgba(0,0,0,.3)}}
@keyframes sasMicRingPurple{0%{box-shadow:0 0 0 0 rgba(167,139,250,.7),0 5px 0 rgba(60,10,160,.5),0 8px 20px rgba(0,0,0,.3)}70%{box-shadow:0 0 0 24px rgba(167,139,250,0),0 5px 0 rgba(60,10,160,.5),0 8px 20px rgba(0,0,0,.3)}100%{box-shadow:0 0 0 0 rgba(167,139,250,0),0 5px 0 rgba(60,10,160,.5),0 8px 20px rgba(0,0,0,.3)}}
.sas-status{font-family:var(--game-font-body);font-size:clamp(12px,2.2vw,15px);font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--game-muted);text-align:center;min-height:1.4em;transition:color .3s}
.sas-status.listening{color:#22c55e}
[data-curriculum="pb"] .sas-status{color:rgba(58,26,46,.5)}
[data-curriculum="pb"] .sas-status.listening{color:#22c55e}
.sas-bottom-bar{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center;width:100%}
.sas-retry-btn,.sas-skip-btn,.sas-help-btn{font-family:var(--game-font-title);font-size:clamp(13px,2.4vw,17px);font-weight:900;letter-spacing:.06em;padding:11px 24px;border-radius:999px;border:none;cursor:pointer;position:relative;overflow:hidden;transition:transform .15s cubic-bezier(.34,1.56,.64,1),box-shadow .15s;-webkit-tap-highlight-color:transparent}
.sas-retry-btn{background:linear-gradient(135deg,#f97316,#fbbf24);color:#1a0500;box-shadow:0 4px 0 #b45309,0 0 18px rgba(249,115,22,.4)}
.sas-skip-btn{background:transparent;border:2px solid rgba(255,255,255,.22);color:var(--game-muted);box-shadow:none}
.sas-skip-btn:hover{border-color:rgba(255,255,255,.5);color:var(--game-ink)}
[data-curriculum="pb"] .sas-skip-btn{border-color:rgba(58,26,46,.22);color:rgba(58,26,46,.5)}
.sas-help-btn{width:44px;height:44px;border-radius:50%;padding:0;background:var(--game-surface);border:2px solid var(--game-border);color:var(--game-muted);font-size:1.15rem;display:flex;align-items:center;justify-content:center;box-shadow:none}
.sas-help-btn:hover{border-color:#a78bfa;color:#a78bfa;transform:scale(1.08)}
[data-curriculum="pb"] .sas-help-btn{background:#fff;border-color:#cc88ff;color:#aa44cc;box-shadow:0 3px 0 #ddb8ff}
[data-curriculum="bc"] .sas-help-btn:hover{border-color:#00ddff;color:#00ddff}
.sas-retry-btn:hover{transform:translateY(-2px) scale(1.04)}
.sas-retry-btn:active,.sas-skip-btn:active{transform:scale(.94)}
.sas-ios-grid{width:100%;display:flex;flex-direction:column;gap:10px}
.sas-ios-choice{width:100%;min-height:64px;padding:.85rem 1.1rem;display:flex;align-items:center;text-align:left;border-radius:18px;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;position:relative;overflow:hidden;font-family:var(--game-font-body);font-size:clamp(13px,2.3vw,17px);font-weight:700;line-height:1.45;transition:transform .14s cubic-bezier(.34,1.56,.64,1),box-shadow .14s,filter .14s;background:linear-gradient(145deg,rgba(167,139,250,.12),rgba(120,60,220,.07));border:2px solid rgba(167,139,250,.28);color:var(--game-tile-text);box-shadow:0 4px 0 rgba(0,0,0,.28),0 6px 14px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.1);box-sizing:border-box}
.sas-ios-choice::after{content:'';position:absolute;top:-60%;left:-80%;width:50%;height:200%;background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.2) 50%,transparent 72%);transform:skewX(-16deg);transition:left .45s ease;pointer-events:none}
.sas-ios-choice:hover::after{left:150%}
.sas-ios-choice:hover{transform:translateY(-2px) scale(1.01);filter:brightness(1.1)}
.sas-ios-choice:active{transform:scale(.97)}
[data-curriculum="br"] .sas-ios-choice[data-ci="0"]{background:linear-gradient(145deg,#4a2800,#703800);border-color:rgba(255,170,0,.55);color:#fff;box-shadow:0 5px 0 rgba(80,40,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .sas-ios-choice[data-ci="1"]{background:linear-gradient(145deg,#5a1200,#8a1e00);border-color:rgba(255,90,40,.55);color:#fff;box-shadow:0 5px 0 rgba(80,10,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .sas-ios-choice[data-ci="2"]{background:linear-gradient(145deg,#3a3000,#5a4a00);border-color:rgba(220,200,0,.5);color:#fff;box-shadow:0 5px 0 rgba(50,40,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .sas-ios-choice[data-ci="3"]{background:linear-gradient(145deg,#40100a,#601814);border-color:rgba(255,80,60,.55);color:#fff;box-shadow:0 5px 0 rgba(60,10,8,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .sas-ios-choice:hover{filter:brightness(1.16)}
[data-curriculum="bc"] .sas-ios-choice[data-ci="0"]{background:linear-gradient(145deg,#041e18,#062e24);border-color:rgba(0,220,180,.55);color:#e0fff8;box-shadow:0 5px 0 rgba(0,20,15,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .sas-ios-choice[data-ci="1"]{background:linear-gradient(145deg,#041820,#062430);border-color:rgba(0,200,240,.5);color:#e0fff8;box-shadow:0 5px 0 rgba(0,15,25,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .sas-ios-choice[data-ci="2"]{background:linear-gradient(145deg,#180828,#24103a);border-color:rgba(170,80,255,.55);color:#f5ecff;box-shadow:0 5px 0 rgba(20,0,40,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .sas-ios-choice[data-ci="3"]{background:linear-gradient(145deg,#042018,#063028);border-color:rgba(40,230,160,.5);color:#e0fff8;box-shadow:0 5px 0 rgba(0,20,15,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .sas-ios-choice:hover{filter:brightness(1.18)}
[data-curriculum="pb"] .sas-ios-choice[data-ci="0"]{background:#fff;border:2.5px solid #ff6eb4;color:#2a1020;box-shadow:0 5px 0 #ffb0d8,0 7px 14px rgba(255,110,180,.12)}
[data-curriculum="pb"] .sas-ios-choice[data-ci="1"]{background:#fff;border:2.5px solid #cc88ff;color:#2a1020;box-shadow:0 5px 0 #ddb8ff,0 7px 14px rgba(180,120,255,.12)}
[data-curriculum="pb"] .sas-ios-choice[data-ci="2"]{background:#fff;border:2.5px solid #44ccff;color:#2a1020;box-shadow:0 5px 0 #99e8ff,0 7px 14px rgba(50,180,255,.1)}
[data-curriculum="pb"] .sas-ios-choice[data-ci="3"]{background:#fff;border:2.5px solid #ffcc44;color:#2a1020;box-shadow:0 5px 0 #ffe088,0 7px 14px rgba(255,200,50,.1)}
[data-curriculum="pb"] .sas-ios-choice:hover{transform:translateY(-3px) scale(1.01);filter:brightness(1.02)}
.sas-ios-choice.ios-correct{background:linear-gradient(135deg,#0a3d1a,#0d5e28)!important;border-color:#22c55e!important;color:#22c55e!important;box-shadow:0 0 0 4px rgba(34,197,94,.3),0 0 36px rgba(34,197,94,.5),0 5px 20px rgba(0,0,0,.3)!important;animation:sasChoicePop .4s cubic-bezier(.34,1.56,.64,1)}
[data-curriculum="pb"] .sas-ios-choice.ios-correct{background:#f0fff4!important;border-color:#22c55e!important;color:#22c55e!important;box-shadow:0 0 0 3px rgba(34,197,94,.22),0 4px 0 #86efac!important}
@keyframes sasChoicePop{from{transform:scale(.92)}60%{transform:scale(1.05)}to{transform:scale(1.01)}}
.sas-ios-choice.ios-wrong{background:linear-gradient(135deg,#3d0a0a,#5e1010)!important;border-color:#ef4444!important;color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.28),0 0 28px rgba(239,68,68,.45)!important;animation:sasShake .42s ease}
@keyframes sasShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
[data-curriculum="pb"] .sas-ios-choice.ios-wrong{background:#fff5f5!important;border-color:#ef4444!important;color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.18),0 4px 0 #fca5a5!important}
.sas-ios-choice.ios-locked{opacity:.4;pointer-events:none}
.sas-results-outer{max-width:660px;margin:0 auto;padding:0 1rem;box-sizing:border-box;width:100%}
.sas-results{display:none;text-align:center;width:100%;padding:2.4rem 1.4rem 2rem;border-radius:32px;position:relative;overflow:hidden;border:2.5px solid var(--sas-tier-color,#a78bfa);background:color-mix(in srgb,var(--sas-tier-color,#a78bfa) 6%,var(--game-bg));box-shadow:0 0 56px color-mix(in srgb,var(--sas-tier-color,#a78bfa) 22%,transparent),0 22px 44px rgba(0,0,0,.4);box-sizing:border-box}
.sas-results.show{display:block;animation:sasResultIn .5s cubic-bezier(.22,.8,.36,1) both}
@keyframes sasResultIn{from{opacity:0;transform:scale(.84) translateY(24px)}to{opacity:1;transform:none}}
.sas-results::before{content:'';position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#a78bfa,#ff2288,#ffcc00,#22ddff,#a78bfa);background-size:220% auto;animation:sasRainbow 2.4s linear infinite}
[data-curriculum="bc"] .sas-results::before{background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);background-size:220% auto}
[data-curriculum="pb"] .sas-results::before{background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);background-size:220% auto}
.sas-results::after{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(circle at 22% 78%,color-mix(in srgb,var(--sas-tier-color,#a78bfa) 12%,transparent) 0%,transparent 50%),radial-gradient(circle at 78% 22%,color-mix(in srgb,#22ddff 8%,transparent) 0%,transparent 50%)}
.sas-res-inner{position:relative;z-index:1}
.sas-res-score{font-family:var(--game-font-title);font-size:clamp(58px,14vw,96px);line-height:1;color:var(--sas-tier-color,#a78bfa);text-shadow:0 0 26px var(--sas-tier-color,#a78bfa);margin-bottom:4px;animation:sasScorePop .5s cubic-bezier(.22,.8,.36,1) .3s both}
@keyframes sasScorePop{from{transform:scale(.58) rotate(-5deg);opacity:0}50%{transform:scale(1.08) rotate(2deg)}to{transform:none;opacity:1}}
.sas-res-pct{font-size:clamp(13px,2.2vw,17px);color:var(--game-muted);font-weight:700;margin-bottom:10px;animation:sasFadeUp .4s ease .5s both}
.sas-res-label{font-family:var(--game-font-title);font-size:clamp(22px,4.8vw,38px);color:var(--sas-tier-color,#a78bfa);margin-bottom:10px;letter-spacing:.05em;text-shadow:0 0 16px color-mix(in srgb,var(--sas-tier-color,#a78bfa) 55%,transparent);animation:sasFadeUp .4s ease .52s both}
.sas-res-divider{width:60px;height:3px;border-radius:99px;background:linear-gradient(90deg,#a78bfa,#ff2288,#22ddff);margin:0 auto 12px;opacity:.6;animation:sasFadeUp .4s ease .56s both}
[data-curriculum="bc"] .sas-res-divider{background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff)}
[data-curriculum="pb"] .sas-res-divider{background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff)}
.sas-res-en{font-family:var(--game-font-body);font-weight:900;font-size:clamp(13px,2.2vw,17px);color:var(--game-ink);margin-bottom:4px;animation:sasFadeUp .4s ease .6s both}
.sas-res-kanji{font-family:var(--game-font-jp);font-size:clamp(13px,2vw,17px);color:var(--game-muted);margin-bottom:3px;animation:sasFadeUp .4s ease .64s both}
.sas-res-jp{font-family:var(--game-font-jp);font-size:clamp(11px,1.7vw,14px);color:var(--game-muted);opacity:.75;margin-bottom:1.3rem;animation:sasFadeUp .4s ease .68s both}
.sas-res-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;animation:sasFadeUp .4s ease .76s both}
@keyframes sasFadeUp{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
@keyframes sasConfetti{0%{transform:translate(0,0) rotate(0deg) scale(1);opacity:1}100%{transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0);opacity:0}}
.sas-confetti-piece{position:fixed;pointer-events:none;z-index:9999;border-radius:2px;animation:sasConfetti 1.1s ease-out forwards}
.sas-modal-overlay{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s;padding:1rem}
.sas-modal-overlay.open{opacity:1;pointer-events:all}
.sas-modal{max-width:460px;width:100%;border-radius:24px;overflow:hidden;background:var(--game-bg);border:2px solid #a78bfa;box-shadow:0 0 44px rgba(167,139,250,.3),0 20px 40px rgba(0,0,0,.5);transform:scale(.88) translateY(16px);transition:transform .3s cubic-bezier(.34,1.56,.64,1);max-height:90vh;overflow-y:auto}
.sas-modal-overlay.open .sas-modal{transform:none}
[data-curriculum="bc"] .sas-modal{border-color:#00ddff;background:#030810}
[data-curriculum="pb"] .sas-modal{background:#fff8fc;border-color:#cc88ff}
.sas-modal-header{padding:.9rem 1.1rem .6rem;border-bottom:1px solid var(--game-border);text-align:center;background:linear-gradient(135deg,rgba(167,139,250,.1),rgba(120,60,220,.06))}
[data-curriculum="bc"] .sas-modal-header{background:linear-gradient(135deg,rgba(0,200,220,.08),rgba(0,80,180,.05))}
.sas-modal-title{font-family:var(--game-font-title);font-size:clamp(18px,3.5vw,22px);letter-spacing:.06em;color:#a78bfa}
[data-curriculum="bc"] .sas-modal-title{color:#00ddff}
[data-curriculum="pb"] .sas-modal-title{color:#cc88ff}
.sas-modal-title-jp{font-family:var(--game-font-jp);font-size:clamp(10px,1.7vw,13px);color:var(--game-muted);margin-top:3px}
.sas-modal-body{padding:.9rem 1.1rem 1.1rem}
.sas-how-step{display:grid;grid-template-columns:30px 1fr;gap:8px;align-items:start;margin-bottom:.65rem}
.sas-how-step:last-child{margin-bottom:0}
.sas-how-num{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));color:#000;font-family:var(--game-font-title);font-size:clamp(11px,2vw,14px);font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sas-how-en{font-family:var(--game-font-body);font-size:clamp(11px,1.9vw,13px);font-weight:800;color:var(--game-ink);line-height:1.35;padding-top:2px}
[data-curriculum="pb"] .sas-how-en{color:#2a1020}
.sas-how-jp{font-family:var(--game-font-jp);font-size:clamp(9px,1.5vw,11px);color:var(--game-muted);margin-top:2px;line-height:1.4}
.sas-modal-close{display:block;width:100%;margin-top:.9rem;font-family:var(--game-font-title);font-size:clamp(13px,2.4vw,16px);letter-spacing:.06em;padding:10px;border-radius:999px;border:none;cursor:pointer;background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));color:#000;font-weight:900;transition:transform .15s}
.sas-modal-close:hover{transform:scale(1.03)}
.sas-start-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:var(--game-bg);padding:1rem;transition:opacity .35s ease}
.sas-start-overlay.hiding{opacity:0;pointer-events:none}
.sas-start-card{max-width:460px;width:100%;border-radius:32px;overflow:hidden;background:var(--game-surface);border:2px solid var(--game-primary);box-shadow:0 0 60px color-mix(in srgb,var(--game-primary) 28%,transparent),0 24px 48px rgba(0,0,0,.45);text-align:center}
[data-curriculum="pb"] .sas-start-card{background:#fff8fc;border-color:#cc88ff;box-shadow:0 8px 0 #ddb8ff,0 20px 40px rgba(180,100,255,.15)}
[data-curriculum="bc"] .sas-start-card{background:#030810;border-color:rgba(0,240,255,.5)}
.sas-start-header{padding:1.5rem 1.4rem .9rem;background:linear-gradient(135deg,color-mix(in srgb,var(--game-primary) 12%,transparent),color-mix(in srgb,var(--game-secondary) 7%,transparent));border-bottom:1px solid var(--game-border)}
.sas-start-title{font-family:var(--game-font-title);font-size:clamp(24px,5.5vw,44px);font-weight:900;letter-spacing:.1em;background:linear-gradient(90deg,#a78bfa,#ff2288,#ffcc00,#22ddff,#a78bfa);background-size:220% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:sasRainbow 3s linear infinite}
[data-curriculum="bc"] .sas-start-title{background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);background-size:220% auto;-webkit-background-clip:text;background-clip:text}
[data-curriculum="pb"] .sas-start-title{background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);background-size:220% auto;-webkit-background-clip:text;background-clip:text}
.sas-start-subtitle{font-family:var(--game-font-jp);font-size:clamp(11px,1.9vw,14px);color:var(--game-muted);margin-top:5px}
[data-curriculum="pb"] .sas-start-subtitle{color:rgba(58,26,46,.5)}
.sas-start-body{padding:1.1rem 1.4rem 1.5rem}
.sas-start-step{display:grid;grid-template-columns:30px 1fr;gap:9px;align-items:start;margin-bottom:.75rem;text-align:left}
.sas-start-step:last-of-type{margin-bottom:0}
.sas-start-num{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));color:#000;font-family:var(--game-font-title);font-size:clamp(12px,2vw,15px);font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sas-start-en{font-family:var(--game-font-body);font-size:clamp(12px,2vw,14px);font-weight:800;color:var(--game-ink);line-height:1.35;padding-top:2px}
[data-curriculum="pb"] .sas-start-en{color:#2a1020}
.sas-start-jp{font-family:var(--game-font-jp);font-size:clamp(10px,1.7vw,12px);color:var(--game-muted);margin-top:2px}
.sas-start-btn{display:block;width:calc(100% - 2.8rem);margin:1.2rem 1.4rem 1.5rem;font-family:var(--game-font-title);font-size:clamp(17px,3.5vw,24px);letter-spacing:.1em;padding:15px 22px;border:none;border-radius:999px;cursor:pointer;position:relative;overflow:hidden;background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));color:#000;font-weight:900;box-shadow:0 0 30px color-mix(in srgb,var(--game-primary) 50%,transparent),0 5px 0 color-mix(in srgb,var(--game-primary) 38%,#000),0 10px 22px rgba(0,0,0,.3);transition:transform .15s;-webkit-tap-highlight-color:transparent}
.sas-start-btn:hover{transform:translateY(-3px) scale(1.03)}
.sas-start-btn:active{transform:scale(.96)}
`;
document.head.appendChild(S);

/* ═══ HTML ═══ */
const MIC_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="2" width="6" height="12" rx="3" fill="white"/><path d="M5 10a7 7 0 0 0 14 0" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="21" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="21" x2="15" y2="21" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`;

U.mount(`
<div class="sas-header">
  <div class="sas-curriculum">${curriculumLabel()}</div>
  <div class="sas-date">${titleDateLabel()}</div>
</div>
<div class="sas-outer" id="sas-main-wrap">
  <div class="sas-dots-row" id="sas-dots"></div>
  <div class="sas-hud">
    <div class="sas-pill">Sentence <b id="sas-num">1</b> / 15</div>
    <div class="sas-pill">Score <b id="sas-score">0</b> / 15</div>
    <div class="sas-pill">Streak <b id="sas-streak">0</b></div>
  </div>
  <div class="sas-card" id="sas-card">
    <div class="sas-jp-kanji" id="sas-jp"></div>
    <div class="sas-jp-hira"  id="sas-hira"></div>
    <div class="sas-progress-wrap" id="sas-prog-wrap" style="display:none">
      <div class="sas-progress-track"><div class="sas-progress-fill" id="sas-prog-fill" style="width:100%"></div></div>
    </div>
  </div>
  ${!isIOS ? `
  <div class="sas-chips-row" id="sas-en"></div>
  <div class="sas-mic-row">
    <button class="sas-play-btn" id="sas-play" aria-label="Listen">▶</button>
    <button class="sas-mic-btn"  id="sas-mic"  aria-label="Tap to speak">${MIC_SVG}</button>
  </div>
  <div class="sas-status" id="sas-status">TAP MIC TO SPEAK</div>
  ` : `
  <div class="sas-ios-grid" id="sas-ios-grid"></div>
  `}
  <div class="sas-bottom-bar">
    <button class="sas-retry-btn" id="sas-retry" style="display:none">TRY AGAIN / もう一回</button>
    <button class="sas-skip-btn"  id="sas-skip"  style="display:none">SKIP / スキップ</button>
    <button class="sas-help-btn"  id="sas-help">？</button>
  </div>
</div>
<div class="sas-results-outer">
<div class="sas-results" id="sas-results">
  <div class="sas-res-inner">
    <div class="sas-res-score" id="sas-rs"></div>
    <div class="sas-res-pct"   id="sas-rp"></div>
    <div class="sas-res-label" id="sas-rl"></div>
    <div class="sas-res-divider"></div>
    <div class="sas-res-en"    id="sas-re"></div>
    <div class="sas-res-kanji" id="sas-rk"></div>
    <div class="sas-res-jp"    id="sas-rj"></div>
    <div class="sas-res-actions">
      <button class="game-btn game-btn-primary"   id="sas-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="sas-back">メニューへ</button>
    </div>
  </div>
</div>
</div>
<div class="sas-modal-overlay" id="sas-modal-overlay">
  <div class="sas-modal" role="dialog" aria-modal="true">
    <div class="sas-modal-header">
      <div class="sas-modal-title">HOW TO PLAY</div>
      <div class="sas-modal-title-jp">あそびかた</div>
    </div>
    <div class="sas-modal-body">
      ${isIOS ? `
      <div class="sas-how-step"><div class="sas-how-num">1</div><div>
        <div class="sas-how-en">Press ▶ to hear the sentence, then choose the English you heard.</div>
        <div class="sas-how-jp">▶で聞いて、聞こえた英語をえらぼう。</div>
      </div></div>
      <div class="sas-how-step"><div class="sas-how-num">2</div><div>
        <div class="sas-how-en">First-try correct answers score a point and auto-advance!</div>
        <div class="sas-how-jp">一発正解でポイント＆自動で次へ！</div>
      </div></div>
      ` : `
      <div class="sas-how-step"><div class="sas-how-num">1</div><div>
        <div class="sas-how-en">Read the Japanese. Press ▶ to hear it if you need to.</div>
        <div class="sas-how-jp">日本語を読もう。必要なら▶で聞けるよ。</div>
      </div></div>
      <div class="sas-how-step"><div class="sas-how-num">2</div><div>
        <div class="sas-how-en">Tap the mic and say the English sentence out loud!</div>
        <div class="sas-how-jp">マイクをタップして英語を言おう！</div>
      </div></div>
      <div class="sas-how-step"><div class="sas-how-num">3</div><div>
        <div class="sas-how-en">Word chips glow rainbow as you say them. Say them all!</div>
        <div class="sas-how-jp">言えた言葉が虹色に光るよ！全部言おう！</div>
      </div></div>
      <div class="sas-how-step"><div class="sas-how-num">4</div><div>
        <div class="sas-how-en">Pass first try = point + auto-advance. Retry or Skip anytime.</div>
        <div class="sas-how-jp">一発合格でポイント＆自動で次へ！</div>
      </div></div>
      `}
      <button class="sas-modal-close" id="sas-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>
${isIOS ? `
<div class="sas-modal-overlay" id="sas-ios-overlay" style="z-index:3000;">
  <div class="sas-modal">
    <div class="sas-modal-header">
      <div class="sas-modal-title">iPhone / iPad モード</div>
      <div class="sas-modal-title-jp">iOS Listening Mode</div>
    </div>
    <div class="sas-modal-body">
      <p style="font-family:var(--game-font-body);font-size:clamp(13px,2.2vw,15px);font-weight:700;color:var(--game-ink);line-height:1.55;margin-bottom:.8rem;">The full microphone version works on Android and desktop. On iPhone and iPad: press ▶ to hear the sentence, then choose the one you heard. First-try correct answers score a point!</p>
      <p style="font-family:var(--game-font-jp);font-size:clamp(12px,2vw,14px);color:var(--game-muted);line-height:1.55;">フルバージョン（マイク）はAndroid・パソコン用。iPad・iPhoneでは▶で聞いて4択で選ぶ練習モードです。一発正解でポイント！</p>
      <button class="sas-modal-close" id="sas-ios-ok">わかった！ Got it!</button>
    </div>
  </div>
</div>
` : `
<div class="sas-start-overlay" id="sas-start-overlay">
  <div class="sas-start-card">
    <div class="sas-start-header">
      <div class="sas-start-title">${curriculumLabel()}</div>
      <div class="sas-start-subtitle">セイ・ザ・センテンス / Say the Sentence</div>
    </div>
    <div class="sas-start-body">
      <div class="sas-start-step"><div class="sas-start-num">1</div><div>
        <div class="sas-start-en">Read the Japanese sentence.</div>
        <div class="sas-start-jp">日本語の文を読もう。</div>
      </div></div>
      <div class="sas-start-step"><div class="sas-start-num">2</div><div>
        <div class="sas-start-en">Tap the mic and say the English sentence out loud!</div>
        <div class="sas-start-jp">マイクをタップして英語を声に出して言おう！</div>
      </div></div>
      <div class="sas-start-step"><div class="sas-start-num">3</div><div>
        <div class="sas-start-en">Word chips glow rainbow as you speak — pass first try for points!</div>
        <div class="sas-start-jp">言えた言葉が虹色に光る！一発合格でポイントゲット！</div>
      </div></div>
      <button class="sas-start-btn" id="sas-start-btn">START / はじめよう</button>
    </div>
  </div>
</div>
`}
`);

/* ═══ DOM REFS ═══ */
const mainWrap  = document.getElementById('sas-main-wrap');
const numEl     = document.getElementById('sas-num');
const scoreEl   = document.getElementById('sas-score');
const jpEl      = document.getElementById('sas-jp');
const hiraEl    = document.getElementById('sas-hira');
const progWrap  = document.getElementById('sas-prog-wrap');
const progFill  = document.getElementById('sas-prog-fill');
const playBtn   = document.getElementById('sas-play');
const retryBtn  = document.getElementById('sas-retry');
const skipBtn   = document.getElementById('sas-skip');
const results   = document.getElementById('sas-results');
const dotsRow   = document.getElementById('sas-dots');
const helpBtn   = document.getElementById('sas-help');
const modalOver = document.getElementById('sas-modal-overlay');
const sasCard   = document.getElementById('sas-card');
const enEl      = isIOS ? null : document.getElementById('sas-en');
const micBtn    = isIOS ? null : document.getElementById('sas-mic');
const statusEl  = isIOS ? null : document.getElementById('sas-status');
const iosGrid   = isIOS ? document.getElementById('sas-ios-grid') : null;
const startOver = isIOS ? null : document.getElementById('sas-start-overlay');

for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'sas-dot'; d.id = `sas-d${i}`;
  dotsRow.appendChild(d);
}

helpBtn.addEventListener('click', () => modalOver.classList.add('open'));
document.getElementById('sas-modal-ok').addEventListener('click', () => modalOver.classList.remove('open'));
modalOver.addEventListener('click', e => { if (e.target === modalOver) modalOver.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOver.classList.remove('open'); });

if (isIOS) {
  const ov = document.getElementById('sas-ios-overlay');
  const ok = document.getElementById('sas-ios-ok');
  if (ov && ok) { ov.classList.add('open'); ok.addEventListener('click', () => { ov.classList.remove('open'); U.unlockAudio(); }, { once:true }); }
}

if (!isIOS && startOver) {
  const startBtn = document.getElementById('sas-start-btn');
  const doStart = () => {
    U.unlockAudio();
    try { const w = SFX['fart'] ? SFX['fart'].cloneNode() : null; if (w) { w.volume=0; w.play().catch(()=>{}); } } catch(e) {}
    try { const w = SFX['ding'] ? SFX['ding'].cloneNode() : null; if (w) { w.volume=0; w.play().catch(()=>{}); } } catch(e) {}
    if (SR && !isIOS) {
      try {
        const probe = new SR();
        probe.lang = 'en-US';
        probe.maxAlternatives = 1;
        probe.onstart = () => { try { probe.stop(); } catch(e) {} };
        probe.onerror = () => {};
        probe.start();
      } catch(e) {}
    }
    startOver.classList.add('hiding');
    setTimeout(() => { startOver.style.display = 'none'; }, 380);
  };
  startBtn.addEventListener('click', doStart);
  startBtn.addEventListener('touchstart', e => { e.preventDefault(); doStart(); }, { passive:false });
}

function updateDots() {
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`sas-d${i}`);
    if (!d) continue;
    d.className = 'sas-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
  }
}

/* ═══ STATE ═══ */
const order = U.shuffle(CFG.cards.slice(0, 15));
let idx=0, score=0, streak=0;
let firstScores = new Array(15).fill(null);
let isBusy=false, listening=false, collecting=false, heard='', SR_inst=null;
let iosAnswered=false, iosFirstTry=true, iosPickCooldown=false;
// PATCH #1: unified advance state
let desktopFirstTry = true;
let advancedThisCard = false;

function updateStreak(n) {
  streak = n;
  const el = document.getElementById('sas-streak');
  if (el) el.textContent = streak;
}

// PATCH #1: single advance function
function advanceToNextCard() {
  if (advancedThisCard) return;
  advancedThisCard = true;
  isBusy = false;
  idx++;
  if (idx >= order.length) showResults();
  else showCard();
}

// PATCH #1: single success audio + advance — replaces all duplicated onended chains
function playSuccessThenAdvance(mp3) {
  const goNext = () => setTimeout(advanceToNextCard, 220);

  const playAnswer = () => {
    if (!mp3) { goNext(); return; }
    const a = new Audio(CFG.audioBase + mp3);
    a.setAttribute('playsinline','');
    a.setAttribute('webkit-playsinline','');
    a.setAttribute('preload','auto');
    let done = false;
    const finish = () => { if (done) return; done = true; goNext(); };
    a.onended = finish;
    a.onerror = finish;
    setTimeout(finish, 4000);
    a.play().catch(finish);
  };

  const ding = SFX['ding'] ? SFX['ding'].cloneNode() : null;
  if (!ding) { playAnswer(); return; }
  ding.setAttribute('playsinline','');
  ding.setAttribute('webkit-playsinline','');
  let dingDone = false;
  const afterDing = () => { if (dingDone) return; dingDone = true; playAnswer(); };
  ding.onended = afterDing;
  ding.onerror = afterDing;
  setTimeout(afterDing, 450);
  ding.play().catch(afterDing);
}

/* ═══ PROGRESS BAR ═══ */
let progRAF=0, progStart=0;
function startProgress() {
  stopProgress();
  progWrap.style.display = ''; progFill.style.width = '100%'; progFill.classList.remove('warning');
  progStart = performance.now();
  const tick = t => {
    const pct = Math.max(0, 1 - (t - progStart) / DUR_MS);
    progFill.style.width = `${pct * 100}%`;
    if (pct < 0.2) progFill.classList.add('warning'); else progFill.classList.remove('warning');
    if (pct > 0) progRAF = requestAnimationFrame(tick);
  };
  progRAF = requestAnimationFrame(tick);
}
function stopProgress() {
  cancelAnimationFrame(progRAF); progRAF = 0;
  progFill.style.width = '0%'; progFill.classList.remove('warning');
}

/* ═══ WORD CHIPS ═══ */
function mountWords(text) {
  if (!enEl) return;
  enEl.innerHTML = text.split(/\s+/)
    .map((w,i) => `<span class="sas-word" data-word="${w.toLowerCase().replace(/[.?!,'"]/g,'')}" data-ci="${i % CHIP_COLORS.length}">${w}</span>`)
    .join(' ');
}
function markHeard(spokenText) {
  if (!enEl) return;
  const words = spokenText.toLowerCase().replace(/[.?!,'"]/g,'').split(/\s+/);
  const hs = new Set();
  words.forEach(w => { hs.add(w); (HOMOPHONES[w]||[]).forEach(p => hs.add(p)); });
  enEl.querySelectorAll('.sas-word').forEach(span => {
    if (hs.has(span.dataset.word) && !span.classList.contains('heard')) {
      span.classList.add('heard');
      const c = CHIP_COLORS[parseInt(span.dataset.ci)];
      span.style.background = c.bg; span.style.borderColor = c.border;
      span.style.color = c.text; span.style.boxShadow = `0 0 12px ${c.shadow}`;
      span.style.transform = 'translateY(-3px) scale(1.07)';
    }
  });
}
function finalizeColors() {
  if (!enEl) return;
  enEl.querySelectorAll('.sas-word').forEach(span => { if (!span.classList.contains('heard')) span.classList.add('missed'); });
}

/* ═══ SHOW CARD ═══ */
function showCard() {
  // PATCH #2: reset all per-card locks at the top
  isBusy = false;
  iosPickCooldown = false;
  advancedThisCard = false;
  desktopFirstTry = true;
  iosAnswered = false;
  iosFirstTry = true;
  const card = order[idx];
  numEl.textContent = idx + 1;
  jpEl.textContent  = card.jp;
  hiraEl.textContent = card.hira || '';
  sasCard.style.setProperty('--sas-jp-len', (card.jp || '').length);
  stopProgress(); progWrap.style.display = 'none';
  retryBtn.style.display = 'none'; skipBtn.style.display = 'none';
  if (playBtn) playBtn.disabled = false;
  sasCard.classList.remove('listening','wrong-state');
  updateDots();
  if (!isIOS) {
    mountWords(card.en);
    if (micBtn) { micBtn.disabled = false; micBtn.classList.remove('listening'); }
    if (statusEl) { statusEl.textContent = 'TAP MIC TO SPEAK'; statusEl.classList.remove('listening'); }
  } else {
    // PATCH #2: resets already done above — no redundant inline resets needed
    buildIosChoices(card);
  }
}

/* ═══ SR ═══ */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
function makeSR() {
  if (!SR || isIOS) return null;
  const r = new SR();
  r.lang = 'en-US'; r.continuous = true; r.interimResults = true;
  try { r.maxAlternatives = 5; } catch(e) {}
  r.onresult = e => {
    if (!collecting) return;
    let txt = '';
    for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript + ' ';
    heard = (heard + ' ' + txt).trim();
    markHeard(heard);
  };
  r.onend = () => { if (listening) try { r.start(); } catch(e) {} };
  return r;
}

/* ═══ MIC ROUND ═══ */
async function beginRound() {
  if (isIOS || isBusy) return;
  isBusy = true; playBtn.disabled = true;
  if (micBtn) micBtn.disabled = true;
  U.unlockAudio();
  heard = ''; listening = false; collecting = false;
  if (statusEl) { statusEl.textContent = 'STARTING…'; statusEl.classList.remove('listening'); }
  SR_inst = makeSR();
  if (SR_inst) { listening = true; try { SR_inst.start(); } catch(e) {} await U.wait(600); }
  if (statusEl) { statusEl.textContent = 'LISTENING…'; statusEl.classList.add('listening'); }
  if (micBtn) micBtn.classList.add('listening');
  sasCard.classList.add('listening');
  heard = ''; collecting = true;
  startProgress();
  await U.wait(DUR_MS); // PATCH #3: was DUR_MS + 140
  collecting = false; listening = false;
  if (SR_inst) { try { SR_inst.stop(); } catch(e) {} }
  stopProgress(); finalizeColors();
  sasCard.classList.remove('listening');
  if (micBtn) micBtn.classList.remove('listening');
  if (statusEl) { statusEl.textContent = 'DONE'; statusEl.classList.remove('listening'); }
  playBtn.disabled = false; if (micBtn) micBtn.disabled = false;
  if (!enEl) { isBusy = false; return; }
  const total = enEl.querySelectorAll('.sas-word').length;
  const nHeard = enEl.querySelectorAll('.sas-word.heard').length;
  const s = total > 0 ? Math.round((nHeard / total) * 100) : 0;
  if (firstScores[idx] === null) firstScores[idx] = s;
  if (s >= PASS) {
    // PATCH #4: use desktopFirstTry, not firstScores comparison
    if (desktopFirstTry) {
      score++;
      scoreEl.textContent = score;
    }
    updateStreak(streak + 1);
    updateDots();
    // PATCH #1: unified advance
    playSuccessThenAdvance(order[idx].mp3);
  } else {
    // PATCH #4: mark desktop first try used on failure
    desktopFirstTry = false;
    playSfx('fart'); updateStreak(0);
    sasCard.classList.add('wrong-state');
    setTimeout(() => sasCard.classList.remove('wrong-state'), 500);
    retryBtn.style.display = ''; skipBtn.style.display = '';
    isBusy = false;
  }
}

/* ═══ iOS CHOICES ═══ */
function buildIosChoices(card) {
  if (!iosGrid) return;
  iosGrid.innerHTML = '';
  // PATCH #7: exclude same-en distractors
  const pool = order.filter((c,i) => i !== idx && c.en !== card.en);
  const distractors = U.shuffle(pool).slice(0,3);
  const choices = U.shuffle([card, ...distractors]);
  choices.forEach((c,ci) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'sas-ios-choice'; btn.setAttribute('data-ci', ci); btn.textContent = c.en;
    btn.addEventListener('touchstart', e => { e.preventDefault(); U.unlockAudio(); handleIosPick(btn,c); }, { passive:false });
    btn.addEventListener('click', e => { if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; handleIosPick(btn,c); });
    btn.style.opacity = '0'; btn.style.transform = 'translateY(8px) scale(.97)';
    setTimeout(() => { btn.style.transition = 'opacity .24s ease,transform .24s cubic-bezier(.34,1.56,.64,1)'; btn.style.opacity='1'; btn.style.transform=''; }, ci*55);
    iosGrid.appendChild(btn);
  });
}

function handleIosPick(btn, card) {
  if (iosAnswered || iosPickCooldown) return;
  iosPickCooldown = true;
  setTimeout(() => { iosPickCooldown = false; }, 600);
  const correct = card.en === order[idx].en;
  if (correct) {
    // PATCH #5: set isBusy immediately; lock all buttons including correct one
    isBusy = true;
    iosAnswered = true;
    btn.classList.add('ios-correct');
    Array.from(iosGrid.children).forEach(b => b.classList.add('ios-locked'));
    if (iosFirstTry) {
      score++;
      scoreEl.textContent = score;
    }
    updateStreak(streak + 1);
    updateDots();
    // PATCH #1 + #5: unified advance
    playSuccessThenAdvance(order[idx].mp3);
  } else {
    iosFirstTry = false; updateStreak(0);
    btn.classList.add('ios-wrong'); U.unlockAudio(); playSfx('fart');
    sasCard.classList.add('wrong-state');
    setTimeout(() => { btn.classList.remove('ios-wrong'); sasCard.classList.remove('wrong-state'); }, 500);
  }
}

/* ═══ PLAY BUTTON ═══ */
if (playBtn) playBtn.addEventListener('click', () => {
  if (listening || playBtn.disabled) return;
  const card = order[idx]; if (!card.mp3) return;
  try {
    const a = new Audio(CFG.audioBase + card.mp3);
    a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline','');
    playBtn.disabled = true;
    a.onended = () => { playBtn.disabled = false; };
    a.onerror = () => { playBtn.disabled = false; };
    setTimeout(() => { playBtn.disabled = false; }, 8000);
    a.play().catch(() => { playBtn.disabled = false; });
  } catch(e) { playBtn.disabled = false; }
});

/* ═══ MIC BUTTON ═══ */
if (micBtn) {
  const triggerMic = () => {
    if (isBusy) return;
    U.unlockAudio();
    try { const w = SFX['fart'] ? SFX['fart'].cloneNode() : null; if (w) { w.volume=0; w.play().catch(()=>{}); } } catch(e) {}
    beginRound();
  };
  micBtn.addEventListener('click', triggerMic);
  micBtn.addEventListener('touchstart', e => { e.preventDefault(); triggerMic(); }, { passive:false });
}

/* ═══ RETRY / SKIP ═══ */
// PATCH #6
retryBtn.addEventListener('click', () => {
  if (isBusy) return;
  retryBtn.style.display = 'none';
  skipBtn.style.display = 'none';
  if (enEl) mountWords(order[idx].en);
  isBusy = false;
  beginRound();
});
// PATCH #6: showCard() handles all resets
skipBtn.addEventListener('click', () => {
  if (isBusy) return;
  idx++;
  scoreEl.textContent = score;
  if (idx >= order.length) { showResults(); return; }
  showCard();
});

/* ═══ CONFETTI ═══ */
function fireConfetti(big=false) {
  const colors = ['#a78bfa','#ff2288','#ffcc00','#22ddff','#fff','#ff6eb4','#aaff22'];
  const cx = window.innerWidth/2, cy = window.innerHeight*0.38;
  for (let i=0,n=big?80:36; i<n; i++) {
    const el = document.createElement('div'); el.className = 'sas-confetti-piece';
    const angle = Math.random()*Math.PI*2, dist=(big?200:110)+Math.random()*220;
    el.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i%colors.length]};--cx:${(Math.cos(angle)*dist).toFixed(1)}px;--cy:${(Math.sin(angle)*dist).toFixed(1)}px;--cr:${((Math.random()-.5)*720).toFixed(0)}deg;animation-delay:${(Math.random()*.2).toFixed(3)}s;animation-duration:${(.85+Math.random()*.5).toFixed(3)}s;border-radius:${Math.random()>.5?'50%':'2px'};width:${(5+Math.random()*8).toFixed(1)}px;height:${(5+Math.random()*8).toFixed(1)}px;`;
    document.body.appendChild(el); el.addEventListener('animationend', ()=>el.remove());
  }
}

/* ═══ RESULTS ═══ */
function showResults() {
  for (let i=0;i<15;i++) { const d=document.getElementById(`sas-d${i}`); if(d) d.className='sas-dot done'; }
  mainWrap.style.display = 'none'; results.classList.add('show');
  const tier=getTier(score), pct=Math.round((score/15)*100);
  document.dispatchEvent(new CustomEvent('booha:gameEnd',{ detail:{ saveId:`${CFG.curriculum}:say_sentence`, score:pct, completed:pct>=40 } }));
  results.style.setProperty('--sas-tier-color', tier.color);
  document.getElementById('sas-rs').textContent = `${score} / 15`;
  document.getElementById('sas-rp').textContent = `${pct}%`;
  document.getElementById('sas-rl').textContent = tier.label;
  document.getElementById('sas-re').textContent = tier.en;
  document.getElementById('sas-rk').textContent = tier.kanji;
  document.getElementById('sas-rj').textContent = tier.jp;
  if (score===15) { fireConfetti(false); setTimeout(()=>fireConfetti(true),500); }
  if (CFG.sfxBase && tier.sound) { const snd=new Audio(CFG.sfxBase+tier.sound); snd.setAttribute('playsinline',''); snd.setAttribute('webkit-playsinline',''); snd.play().catch(()=>{}); }
}

/* ═══ REPLAY / BACK ═══ */
document.getElementById('sas-replay').addEventListener('click', () => {
  results.classList.remove('show'); mainWrap.style.display = '';
  idx=0; score=0; streak=0; firstScores=new Array(15).fill(null);
  scoreEl.textContent='0';
  const se=document.getElementById('sas-streak'); if(se) se.textContent='0';
  iosAnswered=false; iosFirstTry=true; iosPickCooldown=false;
  desktopFirstTry=true; advancedThisCard=false;
  U.shuffle(order); showCard();
});
document.getElementById('sas-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget+'?week='+encodeURIComponent(CFG.weekParam));
});

U.unlockAudio();
showCard();

})();
