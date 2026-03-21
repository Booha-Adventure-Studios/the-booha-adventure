
/* ══════════════════════════════════════════════════════════════
   ask-question.js  —  Ask the Question  v4
   Based on say-sentence v4 — gold/amber palette
   Desktop/Android: big JP card → mic → word chips glow rainbow
   iOS: big JP card → 4-choice pick, auto-advance on correct
   No countdown. Auto-advance on pass. Streak counter.
   Full button-smash protection throughout.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Ask the Question');
U.unlockAudio();

const isIOS  = U.isIOS();
const PASS   = 80;
const DUR_MS = 7500;

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

/* ═══ TIERS — answer/communication focused ═══ */
const TIERS = [
  { min:0,  max:5,  sound:'result_0-5.mp3',
    label:'KEEP ANSWERING',
    en:'Answering questions takes practice — keep going!',
    kanji:'質問に答える練習を続けよう！',
    jp:'もっと練習して答えられるようになろう！',
    color:'#f43f5e' },
  { min:6,  max:10, sound:'result_6-10.mp3',
    label:'GOOD ANSWERS!',
    en:'You are finding your words — great effort!',
    kanji:'言葉が出てきた！素晴らしい努力！',
    jp:'だんだん言葉が出てきてるよ！すごい！',
    color:'#f97316' },
  { min:11, max:14, sound:'result_11-14.mp3',
    label:'ALMOST FLUENT',
    en:'Your answers are strong and clear!',
    kanji:'はっきりした答えが言えてる！',
    jp:'答えがはっきり言えてる！すごく上手！',
    color:'#10b981' },
  { min:15, max:15, sound:'result_15.mp3',
    label:'PERFECT ANSWERS!',
    en:'Every question answered perfectly — incredible!',
    kanji:'全問完璧回答！最強のコミュニケーション力！',
    jp:'全部の質問に完璧に答えられた！すごい！',
    color:'#ffcc00' },
];
const getTier = s => TIERS.find(t => s >= t.min && s <= t.max) ?? TIERS[0];

/* ═══ RAINBOW CHIP COLORS ═══ */
const CHIP_COLORS = [
  { bg:'rgba(255,204,0,.22)',   border:'#ffcc00', text:'#ffe566', shadow:'rgba(255,204,0,.5)'   },
  { bg:'rgba(255,120,0,.18)',   border:'#ff7800', text:'#ffaa55', shadow:'rgba(255,120,0,.45)'  },
  { bg:'rgba(34,221,255,.18)',  border:'#22ddff', text:'#88eeff', shadow:'rgba(34,221,255,.5)'  },
  { bg:'rgba(170,255,34,.16)',  border:'#aaff22', text:'#ccff77', shadow:'rgba(170,255,34,.45)' },
  { bg:'rgba(255,34,136,.18)',  border:'#ff2288', text:'#ff80c0', shadow:'rgba(255,34,136,.5)'  },
  { bg:'rgba(167,139,250,.22)', border:'#a78bfa', text:'#c4b5fd', shadow:'rgba(167,139,250,.5)' },
  { bg:'rgba(255,110,180,.18)', border:'#ff6eb4', text:'#ffaacc', shadow:'rgba(255,110,180,.5)' },
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

/* ═══ STYLES — gold/amber palette ═══ */
const S = document.createElement('style');
S.textContent = `
.game-header{display:none!important}
.aq-outer{max-width:660px;margin:0 auto;padding:0 1rem 6rem;display:flex;flex-direction:column;align-items:center;gap:.75rem;box-sizing:border-box}
.aq-header{text-align:center;padding:.5rem 3rem .5rem;width:100%;max-width:660px;margin:0 auto}
.aq-curriculum{font-family:var(--game-font-title);font-size:clamp(22px,5.5vw,46px);font-weight:900;letter-spacing:.12em;text-transform:uppercase;background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44,#ff6600,#ffcc00);background-size:220% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:aqRainbow 3s linear infinite}
[data-curriculum="bc"] .aq-curriculum{background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa,#0055cc,#00e8b0);background-size:220% auto;-webkit-background-clip:text;background-clip:text}
[data-curriculum="pb"] .aq-curriculum{background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622,#ffaa22,#ff8844);background-size:220% auto;-webkit-background-clip:text;background-clip:text}
@keyframes aqRainbow{to{background-position:220% center}}
.aq-date{margin-top:2px;font-family:var(--game-font-body);font-size:clamp(10px,1.8vw,14px);font-weight:800;color:var(--game-muted);letter-spacing:.06em}
[data-curriculum="pb"] .aq-date{color:rgba(58,26,46,.55)}
.aq-dots-row{display:flex;justify-content:center;gap:5px;flex-wrap:wrap;width:100%}
.aq-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.18);transition:all .3s;flex-shrink:0}
.aq-dot.active{background:#ffcc00;border-color:#ffcc00;box-shadow:0 0 8px #ffcc00}
.aq-dot.done{background:#22c55e;border-color:#22c55e;box-shadow:0 0 7px rgba(34,197,94,.7)}
[data-curriculum="bc"] .aq-dot.active{background:#00ddaa;border-color:#00ddaa;box-shadow:0 0 8px #00ddaa}
[data-curriculum="pb"] .aq-dot{background:rgba(255,136,68,.15);border-color:rgba(255,136,68,.25)}
[data-curriculum="pb"] .aq-dot.active{background:#ff8844;border-color:#ff8844;box-shadow:0 0 8px #ff8844}
.aq-hud{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;width:100%}
.aq-pill{padding:5px 16px;border-radius:999px;background:var(--game-pill-bg);border:1.5px solid var(--game-pill-border);color:var(--game-pill-text);font-size:clamp(12px,2vw,15px);font-weight:900;letter-spacing:.03em;box-shadow:0 2px 10px rgba(0,0,0,.2)}
.aq-pill b{color:#ffcc00;font-size:1.1em;text-shadow:0 0 9px #ffcc00}
[data-curriculum="bc"] .aq-pill b{color:#00ddaa;text-shadow:0 0 9px #00ddaa}
[data-curriculum="pb"] .aq-pill{background:#fff;border-color:#ffd0aa;color:#2a1020;box-shadow:0 3px 0 #ffe0cc}
[data-curriculum="pb"] .aq-pill b{color:#ff8844;text-shadow:none}
.aq-card{width:100%;border-radius:22px;padding:1.8rem 1.4rem 1.4rem;position:relative;overflow:hidden;text-align:center;background:var(--game-surface);border:2px solid var(--game-border);box-shadow:0 6px 26px rgba(0,0,0,.22);box-sizing:border-box;container-type:inline-size}
[data-curriculum="br"] .aq-card{background:linear-gradient(145deg,rgba(255,204,0,.08),rgba(255,136,0,.05),rgba(0,0,0,.2));border-color:rgba(255,204,0,.28)}
[data-curriculum="bc"] .aq-card{background:linear-gradient(145deg,rgba(0,220,180,.07),rgba(0,136,255,.05),rgba(0,0,0,.28));border-color:rgba(0,210,170,.22)}
[data-curriculum="pb"] .aq-card{background:#fff;border:3px solid #ff9966;box-shadow:0 5px 0 #ffcc99,0 8px 22px rgba(255,136,68,.12)}
.aq-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44,#ff6600,#ffcc00);background-size:220% auto;animation:aqRainbow 2.4s linear infinite}
[data-curriculum="bc"] .aq-card::before{background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa,#0055cc,#00e8b0);background-size:220% auto}
[data-curriculum="pb"] .aq-card::before{background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622,#ffaa22,#ff8844);background-size:220% auto}
.aq-jp-kanji{font-family:var(--game-font-jp);font-weight:900;font-size:clamp(16px,calc(13cqi - var(--aq-jp-len,0) * 0.4cqi),48px);line-height:1.5;color:var(--game-ink);word-break:break-all;overflow-wrap:anywhere}
[data-curriculum="pb"] .aq-jp-kanji{color:#2a1020}
.aq-jp-hira{font-family:var(--game-font-jp);font-size:clamp(11px,2vw,16px);color:var(--game-muted);margin-top:4px;word-break:break-all}
[data-curriculum="pb"] .aq-jp-hira{color:rgba(58,26,46,.5)}
.aq-card.listening{border-color:rgba(34,197,94,.6)!important;animation:aqListenPulse 1s ease-in-out infinite}
@keyframes aqListenPulse{0%,100%{box-shadow:0 0 0 4px rgba(34,197,94,.15),0 6px 26px rgba(0,0,0,.22)}50%{box-shadow:0 0 0 12px rgba(34,197,94,.28),0 6px 30px rgba(0,0,0,.3)}}
.aq-card.wrong-state{animation:aqCardShake .45s ease;border-color:#ef4444!important;box-shadow:0 0 0 4px rgba(239,68,68,.2),0 0 30px rgba(239,68,68,.3)!important}
@keyframes aqCardShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}35%{transform:translateX(8px)}55%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.aq-progress-wrap{width:100%;margin:.5rem 0 0}
.aq-progress-track{height:8px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.1)}
[data-curriculum="pb"] .aq-progress-track{background:rgba(255,136,68,.08);border-color:rgba(255,136,68,.18)}
.aq-progress-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44);transition:width .1s linear;position:relative;overflow:hidden}
[data-curriculum="bc"] .aq-progress-fill{background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa)}
[data-curriculum="pb"] .aq-progress-fill{background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622)}
.aq-progress-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 20%,rgba(255,255,255,.35) 50%,transparent 80%);background-size:200% 100%;animation:aqShimmer 1.2s linear infinite}
@keyframes aqShimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.aq-progress-fill.warning{animation:aqPulseWarn .5s ease-in-out infinite}
@keyframes aqPulseWarn{0%,100%{filter:brightness(1)}50%{filter:brightness(1.7) saturate(2)}}
.aq-chips-row{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;align-items:center;width:100%;padding:.2rem 0}
.aq-word{display:inline-flex;align-items:center;justify-content:center;padding:6px 12px;border-radius:11px;font-family:var(--game-font-body);font-weight:700;font-size:clamp(13px,2.6vw,19px);line-height:1.2;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.14);color:var(--game-ink);transition:background .25s,border-color .25s,color .25s,transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s}
[data-curriculum="pb"] .aq-word{background:rgba(255,136,68,.08);border-color:rgba(255,136,68,.2);color:#2a1020}
.aq-word.missed{background:rgba(239,68,68,.12)!important;border-color:#ef4444!important;color:#ef4444!important;box-shadow:none!important;transform:none!important}
.aq-mic-row{display:flex;gap:16px;align-items:center;justify-content:center;width:100%}
.aq-play-btn{width:52px;height:52px;border-radius:50%;flex-shrink:0;border:none;cursor:pointer;display:grid;place-items:center;font-size:19px;color:#1a0a00;background:radial-gradient(circle at 30% 30%,#ffe8a3,#ffd36a 60%,#ffb800 100%);box-shadow:0 0 0 3px rgba(255,213,120,.35),0 0 16px rgba(255,214,120,.55);animation:aqGoldPulse 1.8s ease-in-out infinite;transition:transform .15s,opacity .2s;-webkit-tap-highlight-color:transparent}
.aq-play-btn:hover{transform:scale(1.1)}
.aq-play-btn:active{transform:scale(.92)}
.aq-play-btn:disabled{opacity:.35;pointer-events:none;animation:none}
@keyframes aqGoldPulse{0%,100%{box-shadow:0 0 0 3px rgba(255,213,120,.25),0 0 10px rgba(255,214,120,.35)}50%{box-shadow:0 0 0 4px rgba(255,213,120,.5),0 0 24px rgba(255,214,120,.9)}}
.aq-mic-btn{width:72px;height:72px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;background:linear-gradient(135deg,#ffcc00,#ff8800);box-shadow:0 0 24px rgba(255,200,0,.5),0 5px 0 rgba(140,80,0,.5),0 8px 20px rgba(0,0,0,.3);transition:transform .15s cubic-bezier(.34,1.56,.64,1),box-shadow .15s;-webkit-tap-highlight-color:transparent}
[data-curriculum="bc"] .aq-mic-btn{background:linear-gradient(135deg,#00ddaa,#0088cc);box-shadow:0 0 24px rgba(0,200,170,.5),0 5px 0 rgba(0,60,80,.5),0 8px 20px rgba(0,0,0,.3)}
[data-curriculum="pb"] .aq-mic-btn{background:linear-gradient(135deg,#ff9966,#ff6622);box-shadow:0 0 24px rgba(255,136,68,.5),0 5px 0 #ffccaa,0 8px 20px rgba(0,0,0,.2)}
.aq-mic-btn svg{width:32px;height:32px;fill:#1a0a00}
[data-curriculum="bc"] .aq-mic-btn svg{fill:#001a14}
[data-curriculum="pb"] .aq-mic-btn svg{fill:#fff}
.aq-mic-btn:hover{transform:translateY(-3px) scale(1.07)}
.aq-mic-btn:active{transform:scale(.91)}
.aq-mic-btn:disabled{opacity:.32;pointer-events:none}
.aq-mic-btn.listening{background:linear-gradient(135deg,#22c55e,#15803d);animation:aqMicRing 1s ease-out infinite}
.aq-mic-btn.listening svg{fill:#fff}
[data-curriculum="bc"] .aq-mic-btn.listening{background:linear-gradient(135deg,#06b6d4,#0e7490);animation:aqMicRingCyan 1s ease-out infinite}
@keyframes aqMicRing{0%{box-shadow:0 0 0 0 rgba(34,197,94,.7),0 5px 0 rgba(10,80,30,.5),0 8px 20px rgba(0,0,0,.3)}70%{box-shadow:0 0 0 24px rgba(34,197,94,0),0 5px 0 rgba(10,80,30,.5),0 8px 20px rgba(0,0,0,.3)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0),0 5px 0 rgba(10,80,30,.5),0 8px 20px rgba(0,0,0,.3)}}
@keyframes aqMicRingCyan{0%{box-shadow:0 0 0 0 rgba(6,182,212,.7),0 5px 0 rgba(0,60,80,.5),0 8px 20px rgba(0,0,0,.3)}70%{box-shadow:0 0 0 24px rgba(6,182,212,0),0 5px 0 rgba(0,60,80,.5),0 8px 20px rgba(0,0,0,.3)}100%{box-shadow:0 0 0 0 rgba(6,182,212,0),0 5px 0 rgba(0,60,80,.5),0 8px 20px rgba(0,0,0,.3)}}
.aq-status{font-family:var(--game-font-body);font-size:clamp(12px,2.2vw,15px);font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--game-muted);text-align:center;min-height:1.4em;transition:color .3s}
.aq-status.listening{color:#22c55e}
[data-curriculum="pb"] .aq-status{color:rgba(58,26,46,.5)}
[data-curriculum="pb"] .aq-status.listening{color:#22c55e}
.aq-bottom-bar{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center;width:100%}
.aq-retry-btn,.aq-skip-btn,.aq-help-btn{font-family:var(--game-font-title);font-size:clamp(13px,2.4vw,17px);font-weight:900;letter-spacing:.06em;padding:11px 24px;border-radius:999px;border:none;cursor:pointer;position:relative;overflow:hidden;transition:transform .15s cubic-bezier(.34,1.56,.64,1),box-shadow .15s;-webkit-tap-highlight-color:transparent}
.aq-retry-btn{background:linear-gradient(135deg,#f97316,#fbbf24);color:#1a0500;box-shadow:0 4px 0 #b45309,0 0 18px rgba(249,115,22,.4)}
.aq-skip-btn{background:transparent;border:2px solid rgba(255,255,255,.22);color:var(--game-muted);box-shadow:none}
.aq-skip-btn:hover{border-color:rgba(255,255,255,.5);color:var(--game-ink)}
[data-curriculum="pb"] .aq-skip-btn{border-color:rgba(58,26,46,.22);color:rgba(58,26,46,.5)}
.aq-help-btn{width:44px;height:44px;border-radius:50%;padding:0;background:var(--game-surface);border:2px solid var(--game-border);color:var(--game-muted);font-size:1.15rem;display:flex;align-items:center;justify-content:center;box-shadow:none}
.aq-help-btn:hover{border-color:#ffcc00;color:#ffcc00;transform:scale(1.08)}
[data-curriculum="bc"] .aq-help-btn:hover{border-color:#00ddaa;color:#00ddaa}
[data-curriculum="pb"] .aq-help-btn{background:#fff;border-color:#ff9966;color:#cc5522;box-shadow:0 3px 0 #ffccaa}
[data-curriculum="pb"] .aq-help-btn:hover{border-color:#ff6622;color:#ff6622}
.aq-retry-btn:hover{transform:translateY(-2px) scale(1.04)}
.aq-retry-btn:active,.aq-skip-btn:active{transform:scale(.94)}
.aq-ios-grid{width:100%;display:flex;flex-direction:column;gap:10px}
.aq-ios-choice{width:100%;min-height:64px;padding:.85rem 1.1rem;display:flex;align-items:center;text-align:left;border-radius:18px;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;position:relative;overflow:hidden;font-family:var(--game-font-body);font-size:clamp(13px,2.3vw,17px);font-weight:700;line-height:1.45;transition:transform .14s cubic-bezier(.34,1.56,.64,1),box-shadow .14s,filter .14s;background:linear-gradient(145deg,rgba(255,200,0,.12),rgba(200,100,0,.07));border:2px solid rgba(255,200,0,.28);color:var(--game-tile-text);box-shadow:0 4px 0 rgba(0,0,0,.28),0 6px 14px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.1);box-sizing:border-box}
.aq-ios-choice::after{content:'';position:absolute;top:-60%;left:-80%;width:50%;height:200%;background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.2) 50%,transparent 72%);transform:skewX(-16deg);transition:left .45s ease;pointer-events:none}
.aq-ios-choice:hover::after{left:150%}
.aq-ios-choice:hover{transform:translateY(-2px) scale(1.01);filter:brightness(1.1)}
.aq-ios-choice:active{transform:scale(.97)}
[data-curriculum="br"] .aq-ios-choice[data-ci="0"]{background:linear-gradient(145deg,#4a2800,#703800);border-color:rgba(255,170,0,.55);color:#fff;box-shadow:0 5px 0 rgba(80,40,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .aq-ios-choice[data-ci="1"]{background:linear-gradient(145deg,#5a1200,#8a1e00);border-color:rgba(255,90,40,.55);color:#fff;box-shadow:0 5px 0 rgba(80,10,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .aq-ios-choice[data-ci="2"]{background:linear-gradient(145deg,#3a3000,#5a4a00);border-color:rgba(220,200,0,.5);color:#fff;box-shadow:0 5px 0 rgba(50,40,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .aq-ios-choice[data-ci="3"]{background:linear-gradient(145deg,#40100a,#601814);border-color:rgba(255,80,60,.55);color:#fff;box-shadow:0 5px 0 rgba(60,10,8,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .aq-ios-choice:hover{filter:brightness(1.16)}
[data-curriculum="bc"] .aq-ios-choice[data-ci="0"]{background:linear-gradient(145deg,#041e18,#062e24);border-color:rgba(0,220,180,.55);color:#e0fff8;box-shadow:0 5px 0 rgba(0,20,15,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .aq-ios-choice[data-ci="1"]{background:linear-gradient(145deg,#041820,#062430);border-color:rgba(0,200,240,.5);color:#e0fff8;box-shadow:0 5px 0 rgba(0,15,25,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .aq-ios-choice[data-ci="2"]{background:linear-gradient(145deg,#021e14,#042e20);border-color:rgba(0,230,160,.5);color:#e0fff8;box-shadow:0 5px 0 rgba(0,20,12,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .aq-ios-choice[data-ci="3"]{background:linear-gradient(145deg,#021824,#033040);border-color:rgba(0,200,230,.55);color:#e0fff8;box-shadow:0 5px 0 rgba(0,15,28,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .aq-ios-choice:hover{filter:brightness(1.18)}
[data-curriculum="pb"] .aq-ios-choice[data-ci="0"]{background:#fff;border:2.5px solid #ff9966;color:#2a1020;box-shadow:0 5px 0 #ffccaa,0 7px 14px rgba(255,136,68,.12)}
[data-curriculum="pb"] .aq-ios-choice[data-ci="1"]{background:#fff;border:2.5px solid #ffcc44;color:#2a1020;box-shadow:0 5px 0 #ffe088,0 7px 14px rgba(255,200,50,.1)}
[data-curriculum="pb"] .aq-ios-choice[data-ci="2"]{background:#fff;border:2.5px solid #44ccff;color:#2a1020;box-shadow:0 5px 0 #99e8ff,0 7px 14px rgba(50,180,255,.1)}
[data-curriculum="pb"] .aq-ios-choice[data-ci="3"]{background:#fff;border:2.5px solid #ff6eb4;color:#2a1020;box-shadow:0 5px 0 #ffb0d8,0 7px 14px rgba(255,110,180,.12)}
[data-curriculum="pb"] .aq-ios-choice:hover{transform:translateY(-3px) scale(1.01);filter:brightness(1.02)}
.aq-ios-choice.ios-correct{background:linear-gradient(135deg,#0a3d1a,#0d5e28)!important;border-color:#22c55e!important;color:#22c55e!important;box-shadow:0 0 0 4px rgba(34,197,94,.3),0 0 36px rgba(34,197,94,.5),0 5px 20px rgba(0,0,0,.3)!important;animation:aqChoicePop .4s cubic-bezier(.34,1.56,.64,1)}
[data-curriculum="pb"] .aq-ios-choice.ios-correct{background:#f0fff4!important;border-color:#22c55e!important;color:#22c55e!important;box-shadow:0 0 0 3px rgba(34,197,94,.22),0 4px 0 #86efac!important}
@keyframes aqChoicePop{from{transform:scale(.92)}60%{transform:scale(1.05)}to{transform:scale(1.01)}}
.aq-ios-choice.ios-wrong{background:linear-gradient(135deg,#3d0a0a,#5e1010)!important;border-color:#ef4444!important;color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.28),0 0 28px rgba(239,68,68,.45)!important;animation:aqShake .42s ease}
@keyframes aqShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
[data-curriculum="pb"] .aq-ios-choice.ios-wrong{background:#fff5f5!important;border-color:#ef4444!important;color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.18),0 4px 0 #fca5a5!important}
.aq-ios-choice.ios-locked{opacity:.4;pointer-events:none}
.aq-results-outer{max-width:660px;margin:0 auto;padding:0 1rem;box-sizing:border-box;width:100%}
.aq-results{display:none;text-align:center;width:100%;padding:2.4rem 1.4rem 2rem;border-radius:32px;position:relative;overflow:hidden;border:2.5px solid var(--aq-tier-color,#ffcc00);background:color-mix(in srgb,var(--aq-tier-color,#ffcc00) 6%,var(--game-bg));box-shadow:0 0 56px color-mix(in srgb,var(--aq-tier-color,#ffcc00) 22%,transparent),0 22px 44px rgba(0,0,0,.4);box-sizing:border-box}
.aq-results.show{display:block;animation:aqResultIn .5s cubic-bezier(.22,.8,.36,1) both}
@keyframes aqResultIn{from{opacity:0;transform:scale(.84) translateY(24px)}to{opacity:1;transform:none}}
.aq-results::before{content:'';position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44,#ff6600,#ffcc00);background-size:220% auto;animation:aqRainbow 2.4s linear infinite}
[data-curriculum="bc"] .aq-results::before{background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa,#0055cc,#00e8b0);background-size:220% auto}
[data-curriculum="pb"] .aq-results::before{background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622,#ffaa22,#ff8844);background-size:220% auto}
.aq-results::after{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(circle at 22% 78%,color-mix(in srgb,var(--aq-tier-color,#ffcc00) 12%,transparent) 0%,transparent 50%),radial-gradient(circle at 78% 22%,color-mix(in srgb,#22ddff 8%,transparent) 0%,transparent 50%)}
.aq-res-inner{position:relative;z-index:1}
.aq-res-score{font-family:var(--game-font-title);font-size:clamp(58px,14vw,96px);line-height:1;color:var(--aq-tier-color,#ffcc00);text-shadow:0 0 26px var(--aq-tier-color,#ffcc00);margin-bottom:4px;animation:aqScorePop .5s cubic-bezier(.22,.8,.36,1) .3s both}
@keyframes aqScorePop{from{transform:scale(.58) rotate(-5deg);opacity:0}50%{transform:scale(1.08) rotate(2deg)}to{transform:none;opacity:1}}
.aq-res-pct{font-size:clamp(13px,2.2vw,17px);color:var(--game-muted);font-weight:700;margin-bottom:10px;animation:aqFadeUp .4s ease .5s both}
.aq-res-label{font-family:var(--game-font-title);font-size:clamp(22px,4.8vw,38px);color:var(--aq-tier-color,#ffcc00);margin-bottom:10px;letter-spacing:.05em;text-shadow:0 0 16px color-mix(in srgb,var(--aq-tier-color,#ffcc00) 55%,transparent);animation:aqFadeUp .4s ease .52s both}
.aq-res-divider{width:60px;height:3px;border-radius:99px;background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44);margin:0 auto 12px;opacity:.6;animation:aqFadeUp .4s ease .56s both}
[data-curriculum="bc"] .aq-res-divider{background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa)}
[data-curriculum="pb"] .aq-res-divider{background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622)}
.aq-res-en{font-family:var(--game-font-body);font-weight:900;font-size:clamp(13px,2.2vw,17px);color:var(--game-ink);margin-bottom:4px;animation:aqFadeUp .4s ease .6s both}
.aq-res-kanji{font-family:var(--game-font-jp);font-size:clamp(13px,2vw,17px);color:var(--game-muted);margin-bottom:3px;animation:aqFadeUp .4s ease .64s both}
.aq-res-jp{font-family:var(--game-font-jp);font-size:clamp(11px,1.7vw,14px);color:var(--game-muted);opacity:.75;margin-bottom:1.3rem;animation:aqFadeUp .4s ease .68s both}
.aq-res-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;animation:aqFadeUp .4s ease .76s both}
@keyframes aqFadeUp{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
@keyframes aqConfetti{0%{transform:translate(0,0) rotate(0deg) scale(1);opacity:1}100%{transform:translate(var(--cx),var(--cy)) rotate(var(--cr)) scale(0);opacity:0}}
.aq-confetti-piece{position:fixed;pointer-events:none;z-index:9999;border-radius:2px;animation:aqConfetti 1.1s ease-out forwards}
.aq-modal-overlay{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s;padding:1rem}
.aq-modal-overlay.open{opacity:1;pointer-events:all}
.aq-modal{max-width:460px;width:100%;border-radius:24px;overflow:hidden;background:var(--game-bg);border:2px solid #ffcc00;box-shadow:0 0 44px rgba(255,200,0,.3),0 20px 40px rgba(0,0,0,.5);transform:scale(.88) translateY(16px);transition:transform .3s cubic-bezier(.34,1.56,.64,1);max-height:90vh;overflow-y:auto}
.aq-modal-overlay.open .aq-modal{transform:none}
[data-curriculum="bc"] .aq-modal{border-color:#00ddaa;background:#030810;box-shadow:0 0 44px rgba(0,200,170,.25),0 20px 40px rgba(0,0,0,.5)}
[data-curriculum="pb"] .aq-modal{background:#fff8fc;border-color:#ff9966;box-shadow:0 8px 0 #ffccaa,0 16px 40px rgba(255,136,68,.18)}
.aq-modal-header{padding:.9rem 1.1rem .6rem;border-bottom:1px solid var(--game-border);text-align:center;background:linear-gradient(135deg,rgba(255,200,0,.1),rgba(200,100,0,.06))}
[data-curriculum="bc"] .aq-modal-header{background:linear-gradient(135deg,rgba(0,200,170,.08),rgba(0,100,150,.05))}
[data-curriculum="pb"] .aq-modal-header{background:linear-gradient(135deg,rgba(255,136,68,.08),rgba(255,80,30,.05))}
.aq-modal-title{font-family:var(--game-font-title);font-size:clamp(18px,3.5vw,22px);letter-spacing:.06em;color:#ffcc00}
[data-curriculum="bc"] .aq-modal-title{color:#00ddaa}
[data-curriculum="pb"] .aq-modal-title{color:#ff8844}
.aq-modal-title-jp{font-family:var(--game-font-jp);font-size:clamp(10px,1.7vw,13px);color:var(--game-muted);margin-top:3px}
.aq-modal-body{padding:.9rem 1.1rem 1.1rem}
.aq-how-step{display:grid;grid-template-columns:30px 1fr;gap:8px;align-items:start;margin-bottom:.65rem}
.aq-how-step:last-child{margin-bottom:0}
.aq-how-num{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));color:#000;font-family:var(--game-font-title);font-size:clamp(11px,2vw,14px);font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.aq-how-en{font-family:var(--game-font-body);font-size:clamp(11px,1.9vw,13px);font-weight:800;color:var(--game-ink);line-height:1.35;padding-top:2px}
[data-curriculum="pb"] .aq-how-en{color:#2a1020}
.aq-how-jp{font-family:var(--game-font-jp);font-size:clamp(9px,1.5vw,11px);color:var(--game-muted);margin-top:2px;line-height:1.4}
.aq-modal-close{display:block;width:100%;margin-top:.9rem;font-family:var(--game-font-title);font-size:clamp(13px,2.4vw,16px);letter-spacing:.06em;padding:10px;border-radius:999px;border:none;cursor:pointer;background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));color:#000;font-weight:900;transition:transform .15s}
.aq-modal-close:hover{transform:scale(1.03)}
.aq-start-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:var(--game-bg);padding:1rem;transition:opacity .35s ease}
.aq-start-overlay.hiding{opacity:0;pointer-events:none}
.aq-start-card{max-width:460px;width:100%;border-radius:32px;overflow:hidden;background:var(--game-surface);border:2px solid var(--game-primary);box-shadow:0 0 60px color-mix(in srgb,var(--game-primary) 28%,transparent),0 24px 48px rgba(0,0,0,.45);text-align:center}
[data-curriculum="pb"] .aq-start-card{background:#fff8fc;border-color:#ff9966;box-shadow:0 8px 0 #ffccaa,0 20px 40px rgba(255,136,68,.15)}
[data-curriculum="bc"] .aq-start-card{background:#030810;border-color:rgba(0,220,180,.5)}
.aq-start-header{padding:1.5rem 1.4rem .9rem;background:linear-gradient(135deg,color-mix(in srgb,var(--game-primary) 12%,transparent),color-mix(in srgb,var(--game-secondary) 7%,transparent));border-bottom:1px solid var(--game-border)}
.aq-start-title{font-family:var(--game-font-title);font-size:clamp(24px,5.5vw,44px);font-weight:900;letter-spacing:.1em;background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44,#ff6600,#ffcc00);background-size:220% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:aqRainbow 3s linear infinite}
[data-curriculum="bc"] .aq-start-title{background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa,#0055cc,#00e8b0);background-size:220% auto;-webkit-background-clip:text;background-clip:text}
[data-curriculum="pb"] .aq-start-title{background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622,#ffaa22,#ff8844);background-size:220% auto;-webkit-background-clip:text;background-clip:text}
.aq-start-subtitle{font-family:var(--game-font-jp);font-size:clamp(11px,1.9vw,14px);color:var(--game-muted);margin-top:5px}
[data-curriculum="pb"] .aq-start-subtitle{color:rgba(58,26,46,.5)}
.aq-start-body{padding:1.1rem 1.4rem 1.5rem}
.aq-start-step{display:grid;grid-template-columns:30px 1fr;gap:9px;align-items:start;margin-bottom:.75rem;text-align:left}
.aq-start-step:last-of-type{margin-bottom:0}
.aq-start-num{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));color:#000;font-family:var(--game-font-title);font-size:clamp(12px,2vw,15px);font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.aq-start-en{font-family:var(--game-font-body);font-size:clamp(12px,2vw,14px);font-weight:800;color:var(--game-ink);line-height:1.35;padding-top:2px}
[data-curriculum="pb"] .aq-start-en{color:#2a1020}
.aq-start-jp{font-family:var(--game-font-jp);font-size:clamp(10px,1.7vw,12px);color:var(--game-muted);margin-top:2px}
.aq-start-btn{display:block;width:calc(100% - 2.8rem);margin:1.2rem 1.4rem 1.5rem;font-family:var(--game-font-title);font-size:clamp(17px,3.5vw,24px);letter-spacing:.1em;padding:15px 22px;border:none;border-radius:999px;cursor:pointer;position:relative;overflow:hidden;background:linear-gradient(135deg,var(--game-primary),var(--game-secondary));color:#000;font-weight:900;box-shadow:0 0 30px color-mix(in srgb,var(--game-primary) 50%,transparent),0 5px 0 color-mix(in srgb,var(--game-primary) 38%,#000),0 10px 22px rgba(0,0,0,.3);transition:transform .15s;-webkit-tap-highlight-color:transparent}
.aq-start-btn:hover{transform:translateY(-3px) scale(1.03)}
.aq-start-btn:active{transform:scale(.96)}
`;
document.head.appendChild(S);

/* ═══ HTML ═══ */
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
    <div class="aq-pill">Streak <b id="aq-streak">0</b></div>
  </div>
  <div class="aq-card" id="aq-card">
    <div class="aq-jp-kanji" id="aq-jp"></div>
    <div class="aq-jp-hira"  id="aq-hira"></div>
    <div class="aq-progress-wrap" id="aq-prog-wrap" style="display:none">
      <div class="aq-progress-track"><div class="aq-progress-fill" id="aq-prog-fill" style="width:100%"></div></div>
    </div>
  </div>
  ${!isIOS ? `
  <div class="aq-chips-row" id="aq-en"></div>
  <div class="aq-mic-row">
    <button class="aq-play-btn" id="aq-play" aria-label="Listen">▶</button>
    <button class="aq-mic-btn"  id="aq-mic"  aria-label="Tap to answer">${MIC_SVG}</button>
  </div>
  <div class="aq-status" id="aq-status">TAP MIC TO ANSWER</div>
  ` : `
  <div style="display:flex;justify-content:center;margin-bottom:.25rem;">
    <button class="aq-play-btn" id="aq-play" aria-label="Listen">▶</button>
  </div>
  <div class="aq-ios-grid" id="aq-ios-grid"></div>
  `}
  <div class="aq-bottom-bar">
    <button class="aq-retry-btn" id="aq-retry" style="display:none">TRY AGAIN / もう一回</button>
    <button class="aq-skip-btn"  id="aq-skip"  style="display:none">SKIP / スキップ</button>
    <button class="aq-help-btn"  id="aq-help">？</button>
  </div>
</div>
<div class="aq-results-outer">
<div class="aq-results" id="aq-results">
  <div class="aq-res-inner">
    <div class="aq-res-score" id="aq-rs"></div>
    <div class="aq-res-pct"   id="aq-rp"></div>
    <div class="aq-res-label" id="aq-rl"></div>
    <div class="aq-res-divider"></div>
    <div class="aq-res-en"    id="aq-re"></div>
    <div class="aq-res-kanji" id="aq-rk"></div>
    <div class="aq-res-jp"    id="aq-rj"></div>
    <div class="aq-res-actions">
      <button class="game-btn game-btn-primary"   id="aq-replay">もう一度</button>
      <button class="game-btn game-btn-secondary" id="aq-back">メニューへ</button>
    </div>
  </div>
</div>
</div>
<div class="aq-modal-overlay" id="aq-modal-overlay">
  <div class="aq-modal" role="dialog" aria-modal="true">
    <div class="aq-modal-header">
      <div class="aq-modal-title">HOW TO PLAY</div>
      <div class="aq-modal-title-jp">あそびかた</div>
    </div>
    <div class="aq-modal-body">
      ${isIOS ? `
      <div class="aq-how-step"><div class="aq-how-num">1</div><div>
        <div class="aq-how-en">Press ▶ to hear the question, then choose the correct English answer.</div>
        <div class="aq-how-jp">▶で聞いて、正しい英語の答えをえらぼう。</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">2</div><div>
        <div class="aq-how-en">First-try correct answers score a point and auto-advance!</div>
        <div class="aq-how-jp">一発正解でポイント＆自動で次へ！</div>
      </div></div>
      ` : `
      <div class="aq-how-step"><div class="aq-how-num">1</div><div>
        <div class="aq-how-en">Read the Japanese question. Press ▶ to hear it if you need to.</div>
        <div class="aq-how-jp">日本語の質問を読もう。必要なら▶で聞けるよ。</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">2</div><div>
        <div class="aq-how-en">Tap the mic and say the English answer out loud!</div>
        <div class="aq-how-jp">マイクをタップして英語で答えよう！</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">3</div><div>
        <div class="aq-how-en">Word chips glow rainbow as you say them. Say them all!</div>
        <div class="aq-how-jp">言えた言葉が虹色に光るよ！全部言おう！</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">4</div><div>
        <div class="aq-how-en">Pass first try = point + auto-advance. Retry or Skip anytime.</div>
        <div class="aq-how-jp">一発合格でポイント＆自動で次へ！</div>
      </div></div>
      `}
      <button class="aq-modal-close" id="aq-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>
${isIOS ? `
<div class="aq-modal-overlay" id="aq-ios-overlay" style="z-index:3000;">
  <div class="aq-modal">
    <div class="aq-modal-header">
      <div class="aq-modal-title">iPhone / iPad モード</div>
      <div class="aq-modal-title-jp">iOS Practice Mode</div>
    </div>
    <div class="aq-modal-body">
      <p style="font-family:var(--game-font-body);font-size:clamp(13px,2.2vw,15px);font-weight:700;color:var(--game-ink);line-height:1.55;margin-bottom:.8rem;">The full microphone version works on Android and desktop. On iPhone and iPad: press ▶ to hear the question, then choose the correct English answer from 4 choices. First-try correct answers score a point!</p>
      <p style="font-family:var(--game-font-jp);font-size:clamp(12px,2vw,14px);color:var(--game-muted);line-height:1.55;">フルバージョン（マイク）はAndroid・パソコン用。iPad・iPhoneでは▶で聞いて4択で答えを選ぶ練習モードです。一発正解でポイント！</p>
      <button class="aq-modal-close" id="aq-ios-ok">わかった！ Got it!</button>
    </div>
  </div>
</div>
` : `
<div class="aq-start-overlay" id="aq-start-overlay">
  <div class="aq-start-card">
    <div class="aq-start-header">
      <div class="aq-start-title">${curriculumLabel()}</div>
      <div class="aq-start-subtitle">アスク・ザ・クエスチョン / Ask the Question</div>
    </div>
    <div class="aq-start-body">
      <div class="aq-start-step"><div class="aq-start-num">1</div><div>
        <div class="aq-start-en">Read the Japanese question.</div>
        <div class="aq-start-jp">日本語の質問を読もう。</div>
      </div></div>
      <div class="aq-start-step"><div class="aq-start-num">2</div><div>
        <div class="aq-start-en">Tap the mic and say the English answer out loud!</div>
        <div class="aq-start-jp">マイクをタップして英語で答えよう！</div>
      </div></div>
      <div class="aq-start-step"><div class="aq-start-num">3</div><div>
        <div class="aq-start-en">Word chips glow as you speak — pass first try for points!</div>
        <div class="aq-start-jp">言えた言葉が光る！一発合格でポイントゲット！</div>
      </div></div>
      <button class="aq-start-btn" id="aq-start-btn">START / はじめよう</button>
    </div>
  </div>
</div>
`}
`);

/* ═══ DOM REFS ═══ */
const mainWrap  = document.getElementById('aq-main-wrap');
const numEl     = document.getElementById('aq-num');
const scoreEl   = document.getElementById('aq-score');
const jpEl      = document.getElementById('aq-jp');
const hiraEl    = document.getElementById('aq-hira');
const progWrap  = document.getElementById('aq-prog-wrap');
const progFill  = document.getElementById('aq-prog-fill');
const playBtn   = document.getElementById('aq-play');
const retryBtn  = document.getElementById('aq-retry');
const skipBtn   = document.getElementById('aq-skip');
const results   = document.getElementById('aq-results');
const dotsRow   = document.getElementById('aq-dots');
const helpBtn   = document.getElementById('aq-help');
const modalOver = document.getElementById('aq-modal-overlay');
const aqCard    = document.getElementById('aq-card');
const enEl      = isIOS ? null : document.getElementById('aq-en');
const micBtn    = isIOS ? null : document.getElementById('aq-mic');
const statusEl  = isIOS ? null : document.getElementById('aq-status');
const iosGrid   = isIOS ? document.getElementById('aq-ios-grid') : null;
const startOver = isIOS ? null : document.getElementById('aq-start-overlay');

for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'aq-dot'; d.id = `aq-d${i}`;
  dotsRow.appendChild(d);
}

helpBtn.addEventListener('click', () => modalOver.classList.add('open'));
document.getElementById('aq-modal-ok').addEventListener('click', () => modalOver.classList.remove('open'));
modalOver.addEventListener('click', e => { if (e.target === modalOver) modalOver.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOver.classList.remove('open'); });

if (isIOS) {
  const ov = document.getElementById('aq-ios-overlay');
  const ok = document.getElementById('aq-ios-ok');
  if (ov && ok) { ov.classList.add('open'); ok.addEventListener('click', () => { ov.classList.remove('open'); U.unlockAudio(); }, { once:true }); }
}

if (!isIOS && startOver) {
  const startBtn = document.getElementById('aq-start-btn');
  const doStart = () => {
    U.unlockAudio();
    /* Pre-warm SFX on genuine gesture */
    try { const w = SFX['fart'] ? SFX['fart'].cloneNode() : null; if (w) { w.volume=0; w.play().catch(()=>{}); } } catch(e) {}
    try { const w = SFX['ding'] ? SFX['ding'].cloneNode() : null; if (w) { w.volume=0; w.play().catch(()=>{}); } } catch(e) {}
    /* Probe mic permission before any timer starts */
    if (SR && !isIOS) {
      try {
        const probe = new SR();
        probe.lang = 'en-US';
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
    const d = document.getElementById(`aq-d${i}`);
    if (!d) continue;
    d.className = 'aq-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
  }
}

/* ═══ STATE ═══ */
const order = U.shuffle(CFG.cards.slice(0, 15));
let idx=0, score=0, streak=0;
let firstScores = new Array(15).fill(null);
let isBusy=false, listening=false, collecting=false, heard='', SR_inst=null;
let iosAnswered=false, iosFirstTry=true, iosPickCooldown=false;

function updateStreak(n) {
  streak = n;
  const el = document.getElementById('aq-streak');
  if (el) el.textContent = streak;
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
    .map((w,i) => `<span class="aq-word" data-word="${w.toLowerCase().replace(/[.?!,'"]/g,'')}" data-ci="${i % CHIP_COLORS.length}">${w}</span>`)
    .join(' ');
}
function markHeard(spokenText) {
  if (!enEl) return;
  const words = spokenText.toLowerCase().replace(/[.?!,'"]/g,'').split(/\s+/);
  const hs = new Set();
  words.forEach(w => { hs.add(w); (HOMOPHONES[w]||[]).forEach(p => hs.add(p)); });
  enEl.querySelectorAll('.aq-word').forEach(span => {
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
  enEl.querySelectorAll('.aq-word').forEach(span => { if (!span.classList.contains('heard')) span.classList.add('missed'); });
}

/* ═══ SHOW CARD ═══ */
function showCard() {
  isBusy = false;
  iosPickCooldown = false;
  const card = order[idx];
  numEl.textContent = idx + 1;
  jpEl.textContent  = card.jp;
  hiraEl.textContent = card.hira || '';
  aqCard.style.setProperty('--aq-jp-len', (card.jp || '').length);
  stopProgress(); progWrap.style.display = 'none';
  retryBtn.style.display = 'none'; skipBtn.style.display = 'none';
  playBtn.disabled = false;
  aqCard.classList.remove('listening','wrong-state');
  updateDots();
  if (!isIOS) {
    mountWords(card.en);
    if (micBtn) { micBtn.disabled = false; micBtn.classList.remove('listening'); }
    if (statusEl) { statusEl.textContent = 'TAP MIC TO ANSWER'; statusEl.classList.remove('listening'); }
  } else {
    iosAnswered = false; iosFirstTry = true;
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

/* ═══ MIC ROUND — no countdown ═══ */
async function beginRound() {
  if (isIOS || isBusy) return;
  isBusy = true; playBtn.disabled = true;
  if (micBtn) micBtn.disabled = true;
  U.unlockAudio();
  heard = ''; listening = false; collecting = false;
  if (statusEl) { statusEl.textContent = 'STARTING…'; statusEl.classList.remove('listening'); }
  SR_inst = makeSR();
  if (SR_inst) { listening = true; try { SR_inst.start(); } catch(e) {} await U.wait(400); }
  if (statusEl) { statusEl.textContent = 'LISTENING…'; statusEl.classList.add('listening'); }
  if (micBtn) micBtn.classList.add('listening');
  aqCard.classList.add('listening');
  heard = ''; collecting = true;
  startProgress();
  await U.wait(DUR_MS + 140);
  collecting = false; listening = false;
  if (SR_inst) { try { SR_inst.stop(); } catch(e) {} }
  stopProgress(); finalizeColors();
  aqCard.classList.remove('listening');
  if (micBtn) micBtn.classList.remove('listening');
  if (statusEl) { statusEl.textContent = 'DONE'; statusEl.classList.remove('listening'); }
  playBtn.disabled = false; if (micBtn) micBtn.disabled = false;
  if (!enEl) { isBusy = false; return; }
  const total = enEl.querySelectorAll('.aq-word').length;
  const nHeard = enEl.querySelectorAll('.aq-word.heard').length;
  const s = total > 0 ? Math.round((nHeard / total) * 100) : 0;
  if (firstScores[idx] === null) firstScores[idx] = s;
  if (s >= PASS) {
    playSfx('ding');
    if (firstScores[idx] === s) { score++; scoreEl.textContent = score; updateStreak(streak + 1); }
    updateDots();
    const card = order[idx];
    /* Play word audio, then wait a full breath before advancing */
    if (card.mp3) {
      setTimeout(() => {
        const a = new Audio(CFG.audioBase + card.mp3);
        a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline','');
        a.play().catch(()=>{});
      }, 300);
    }
    /* 3000ms total — ding + audio + breathing room before next card */
    setTimeout(() => { idx++; if (idx >= order.length) { showResults(); } else { showCard(); } }, 3000);
  } else {
    playSfx('fart'); updateStreak(0);
    aqCard.classList.add('wrong-state');
    setTimeout(() => aqCard.classList.remove('wrong-state'), 500);
    retryBtn.style.display = ''; skipBtn.style.display = '';
    isBusy = false;
  }
}

/* ═══ iOS CHOICES ═══ */
function buildIosChoices(card) {
  if (!iosGrid) return;
  iosGrid.innerHTML = '';
  const pool = order.filter((_,i) => i !== idx);
  const distractors = U.shuffle(pool).slice(0,3);
  const choices = U.shuffle([card, ...distractors]);
  choices.forEach((c,ci) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'aq-ios-choice'; btn.setAttribute('data-ci', ci); btn.textContent = c.en;
    btn.addEventListener('touchstart', e => { e.preventDefault(); U.unlockAudio(); handleIosPick(btn,c); }, { passive:false });
    btn.addEventListener('click', e => { if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; handleIosPick(btn,c); });
    btn.style.opacity = '0'; btn.style.transform = 'translateY(8px) scale(.97)';
    setTimeout(() => { btn.style.transition = 'opacity .24s ease,transform .24s cubic-bezier(.34,1.56,.64,1)'; btn.style.opacity='1'; btn.style.transform=''; }, ci*55);
    iosGrid.appendChild(btn);
  });
}

function handleIosPick(btn, card) {
  /* Full smash protection: answered lock + cooldown between taps */
  if (iosAnswered || iosPickCooldown) return;
  iosPickCooldown = true;
  setTimeout(() => { iosPickCooldown = false; }, 600);

  const correct = card.en === order[idx].en;
  if (correct) {
    iosAnswered = true;
    btn.classList.add('ios-correct');
    Array.from(iosGrid.children).forEach(b => { if (b !== btn) b.classList.add('ios-locked'); });
    playSfx('ding');
    if (iosFirstTry) { score++; scoreEl.textContent = score; updateStreak(streak+1); }
    updateDots();
    const mp3 = order[idx].mp3;
    if (mp3) {
      const a = new Audio(CFG.audioBase+mp3);
      a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline','');
      a.play().catch(()=>{});
    }
    /* 3000ms breathing room before next card */
    setTimeout(() => { idx++; isBusy = false; if (idx >= order.length) { showResults(); } else { showCard(); } }, 3000);
  } else {
    iosFirstTry = false; updateStreak(0);
    btn.classList.add('ios-wrong'); U.unlockAudio(); playSfx('fart');
    aqCard.classList.add('wrong-state');
    setTimeout(() => { btn.classList.remove('ios-wrong'); aqCard.classList.remove('wrong-state'); }, 500);
  }
}

/* ═══ PLAY BUTTON — smash protection ═══ */
playBtn.addEventListener('click', () => {
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

/* ═══ MIC BUTTON — smash protection ═══ */
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

/* ═══ RETRY / SKIP — smash protection ═══ */
retryBtn.addEventListener('click', () => {
  if (isBusy) return;
  retryBtn.style.display = 'none'; skipBtn.style.display = 'none';
  if (enEl) mountWords(order[idx].en);
  beginRound();
});
skipBtn.addEventListener('click', () => {
  if (isBusy) return;
  idx++; scoreEl.textContent = score;
  if (idx >= order.length) { showResults(); return; }
  iosAnswered = false; iosFirstTry = true; iosPickCooldown = false;
  showCard();
});

/* ═══ CONFETTI ═══ */
function fireConfetti(big=false) {
  const colors = ['#ffcc00','#ff8800','#ffee44','#22ddff','#fff','#ff6600','#aaff22'];
  const cx = window.innerWidth/2, cy = window.innerHeight*0.38;
  for (let i=0,n=big?80:36; i<n; i++) {
    const el = document.createElement('div'); el.className = 'aq-confetti-piece';
    const angle = Math.random()*Math.PI*2, dist=(big?200:110)+Math.random()*220;
    el.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i%colors.length]};--cx:${(Math.cos(angle)*dist).toFixed(1)}px;--cy:${(Math.sin(angle)*dist).toFixed(1)}px;--cr:${((Math.random()-.5)*720).toFixed(0)}deg;animation-delay:${(Math.random()*.2).toFixed(3)}s;animation-duration:${(.85+Math.random()*.5).toFixed(3)}s;border-radius:${Math.random()>.5?'50%':'2px'};width:${(5+Math.random()*8).toFixed(1)}px;height:${(5+Math.random()*8).toFixed(1)}px;`;
    document.body.appendChild(el); el.addEventListener('animationend', ()=>el.remove());
  }
}

/* ═══ RESULTS ═══ */
function showResults() {
  for (let i=0;i<15;i++) { const d=document.getElementById(`aq-d${i}`); if(d) d.className='aq-dot done'; }
  mainWrap.style.display = 'none'; results.classList.add('show');
  const tier=getTier(score), pct=Math.round((score/15)*100);
  document.dispatchEvent(new CustomEvent('booha:gameEnd',{ detail:{ saveId:`${CFG.curriculum}:ask_question`, score:pct, completed:pct>=40 } }));
  results.style.setProperty('--aq-tier-color', tier.color);
  document.getElementById('aq-rs').textContent = `${score} / 15`;
  document.getElementById('aq-rp').textContent = `${pct}%`;
  document.getElementById('aq-rl').textContent = tier.label;
  document.getElementById('aq-re').textContent = tier.en;
  document.getElementById('aq-rk').textContent = tier.kanji;
  document.getElementById('aq-rj').textContent = tier.jp;
  if (score===15) { fireConfetti(false); setTimeout(()=>fireConfetti(true),500); }
  if (CFG.sfxBase && tier.sound) { const snd=new Audio(CFG.sfxBase+tier.sound); snd.setAttribute('playsinline',''); snd.setAttribute('webkit-playsinline',''); snd.play().catch(()=>{}); }
}

/* ═══ REPLAY / BACK ═══ */
document.getElementById('aq-replay').addEventListener('click', () => {
  results.classList.remove('show'); mainWrap.style.display = '';
  idx=0; score=0; streak=0; firstScores=new Array(15).fill(null);
  scoreEl.textContent='0';
  const se=document.getElementById('aq-streak'); if(se) se.textContent='0';
  iosAnswered=false; iosFirstTry=true; iosPickCooldown=false;
  U.shuffle(order); showCard();
});
document.getElementById('aq-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget+'?week='+encodeURIComponent(CFG.weekParam));
});

U.unlockAudio();
showCard();

})();
