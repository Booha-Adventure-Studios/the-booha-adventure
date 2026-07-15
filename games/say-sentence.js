
/* ══════════════════════════════════════════════════════════════
   say-sentence.js  —  Listen & Choose  v5
   100% listening game — no SR, no speaking required
   Play button reveals audio; student picks correct Japanese
   Kanji / Hiragana toggle persists for entire session
   Desktop/Android/iOS: identical experience
   No countdown. Auto-advance on correct first try. Streak counter.
   Full button-smash protection throughout.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const CFG = window.GAME_CONFIG;
const U   = window.GAME_UTILS;
if (!CFG || !U) return;

U.setTitle('Say the Sentence');
U.unlockAudio();

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
  { min:0,  max:5,  sound:'result_0-5.mp3',
    label:'KEEP LISTENING',
    en:'Keep playing — your ear will get sharper!',
    kanji:'続けよう！だんだん聞き取れるようになるよ！',
    jp:'もっと練習して聞き取れるようになろう！',
    color:'#f43f5e' },
  { min:6,  max:10, sound:'result_6-10.mp3',
    label:'GOOD LISTENING!',
    en:'You are picking up the sounds — great effort!',
    kanji:'音が聞き取れてきた！素晴らしい努力！',
    jp:'だんだん聞き取れてきてるよ！すごい！',
    color:'#f97316' },
  { min:11, max:14, sound:'result_11-14.mp3',
    label:'SHARP EARS!',
    en:'Your listening is strong and accurate!',
    kanji:'しっかり聞き取れてる！',
    jp:'聞き取りがとても上手！すごく上手！',
    color:'#22d3ee' },
  { min:15, max:15, sound:'result_15.mp3',
    label:'PERFECT LISTENING!',
    en:'Every sentence answered perfectly — incredible!',
    kanji:'全問完璧！最高の聞き取り力！',
    jp:'全部の問題に完璧に答えられた！すごい！',
    color:'#a78bfa' },
];
const getTier = s => TIERS.find(t => s >= t.min && s <= t.max) ?? TIERS[0];

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

/* ── Card ── */
.sas-card{width:100%;border-radius:22px;padding:2.2rem 1.4rem 2rem;position:relative;overflow:hidden;text-align:center;background:var(--game-surface);border:2px solid var(--game-border);box-shadow:0 6px 26px rgba(0,0,0,.22);box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;min-height:160px}
[data-curriculum="br"] .sas-card{background:linear-gradient(145deg,rgba(167,139,250,.07),rgba(255,204,0,.04),rgba(0,0,0,.2));border-color:rgba(167,139,250,.25)}
[data-curriculum="bc"] .sas-card{background:linear-gradient(145deg,rgba(0,240,255,.06),rgba(68,85,255,.07),rgba(0,0,0,.28));border-color:rgba(0,240,255,.2)}
[data-curriculum="pb"] .sas-card{background:#fff;border:3px solid #cc88ff;box-shadow:0 5px 0 #ddb8ff,0 8px 22px rgba(180,100,255,.12)}
.sas-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#a78bfa,#ff2288,#ffcc00,#22ddff,#a78bfa);background-size:220% auto;animation:sasRainbow 2.4s linear infinite}
[data-curriculum="bc"] .sas-card::before{background:linear-gradient(90deg,#00f0ff,#4455ff,#aa00ff,#00f0ff);background-size:220% auto}
[data-curriculum="pb"] .sas-card::before{background:linear-gradient(90deg,#ff6eb4,#cc88ff,#44ccff,#ffcc44,#ff6eb4);background-size:220% auto}
.sas-card.wrong-state{animation:sasCardShake .45s ease;border-color:#ef4444!important;box-shadow:0 0 0 4px rgba(239,68,68,.2),0 0 30px rgba(239,68,68,.3)!important}
@keyframes sasCardShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}35%{transform:translateX(8px)}55%{transform:translateX(-5px)}75%{transform:translateX(5px)}}

/* ── Play button ── */
.sas-play-wrap{display:flex;flex-direction:column;align-items:center;gap:.55rem}
.sas-play-label{font-family:var(--game-font-body);font-size:clamp(11px,1.9vw,14px);font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--game-muted);opacity:.75}
[data-curriculum="pb"] .sas-play-label{color:rgba(58,26,46,.5)}
.sas-play-btn{width:72px;height:72px;border-radius:50%;flex-shrink:0;border:none;cursor:pointer;display:grid;place-items:center;font-size:26px;color:#1a0a00;background:radial-gradient(circle at 30% 30%,#ffe8a3,#ffd36a 60%,#ffb800 100%);box-shadow:0 0 0 3px rgba(255,213,120,.35),0 0 24px rgba(255,214,120,.65),0 5px 0 rgba(140,80,0,.4);animation:sasGoldPulse 1.8s ease-in-out infinite;transition:transform .15s,opacity .2s,box-shadow .2s;-webkit-tap-highlight-color:transparent}
.sas-play-btn:hover{transform:scale(1.1)}
.sas-play-btn:active{transform:scale(.92)}
.sas-play-btn:disabled{opacity:.35;pointer-events:none;animation:none}
.sas-play-btn.playing{background:radial-gradient(circle at 30% 30%,#a8f0c8,#22c55e 60%,#16a34a 100%);box-shadow:0 0 0 4px rgba(34,197,94,.3),0 0 28px rgba(34,197,94,.7),0 5px 0 rgba(10,80,30,.4);animation:sasPlayingPulse 1s ease-in-out infinite}
[data-curriculum="bc"] .sas-play-btn{background:radial-gradient(circle at 30% 30%,#a8f0e8,#00ddaa 60%,#009977 100%);box-shadow:0 0 0 3px rgba(0,221,170,.3),0 0 24px rgba(0,221,170,.55),0 5px 0 rgba(0,60,50,.4)}
[data-curriculum="pb"] .sas-play-btn{background:radial-gradient(circle at 30% 30%,#ffd0b8,#ff9966 60%,#ff6622 100%);box-shadow:0 0 0 3px rgba(255,153,102,.3),0 0 24px rgba(255,153,102,.55),0 5px 0 #ffccaa;color:#fff}
@keyframes sasGoldPulse{0%,100%{box-shadow:0 0 0 3px rgba(255,213,120,.25),0 0 10px rgba(255,214,120,.35),0 5px 0 rgba(140,80,0,.4)}50%{box-shadow:0 0 0 4px rgba(255,213,120,.5),0 0 28px rgba(255,214,120,.9),0 5px 0 rgba(140,80,0,.4)}}
@keyframes sasPlayingPulse{0%,100%{box-shadow:0 0 0 4px rgba(34,197,94,.2),0 0 20px rgba(34,197,94,.5),0 5px 0 rgba(10,80,30,.4)}50%{box-shadow:0 0 0 8px rgba(34,197,94,.35),0 0 36px rgba(34,197,94,.8),0 5px 0 rgba(10,80,30,.4)}}

/* ── Toggle ── */
.sas-toggle-wrap{display:flex;align-items:center;justify-content:center;gap:0;border-radius:999px;overflow:hidden;border:1.5px solid var(--game-border);background:var(--game-surface)}
[data-curriculum="pb"] .sas-toggle-wrap{border-color:#ffd0aa;background:#fff}
.sas-toggle-btn{font-family:var(--game-font-body);font-size:clamp(12px,2vw,14px);font-weight:900;letter-spacing:.04em;padding:7px 18px;border:none;cursor:pointer;background:transparent;color:var(--game-muted);transition:background .2s,color .2s;-webkit-tap-highlight-color:transparent}
.sas-toggle-btn.active{background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff}
[data-curriculum="bc"] .sas-toggle-btn.active{background:linear-gradient(135deg,#00ddff,#0055cc);color:#001020}
[data-curriculum="pb"] .sas-toggle-btn.active{background:linear-gradient(135deg,#cc88ff,#aa44cc);color:#fff}
[data-curriculum="pb"] .sas-toggle-btn{color:rgba(58,26,46,.45)}

/* ── Choice grid ── */
.sas-choices{width:100%;display:flex;flex-direction:column;gap:10px}
.sas-choice{width:100%;min-height:64px;padding:.85rem 1.1rem;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left;border-radius:18px;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;position:relative;overflow:hidden;transition:transform .14s cubic-bezier(.34,1.56,.64,1),box-shadow .14s,filter .14s;background:linear-gradient(145deg,rgba(167,139,250,.12),rgba(120,60,220,.07));border:2px solid rgba(167,139,250,.28);color:var(--game-tile-text);box-shadow:0 4px 0 rgba(0,0,0,.28),0 6px 14px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.1);box-sizing:border-box}
.sas-choice::after{content:'';position:absolute;top:-60%;left:-80%;width:50%;height:200%;background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.2) 50%,transparent 72%);transform:skewX(-16deg);transition:left .45s ease;pointer-events:none}
.sas-choice:hover::after{left:150%}
.sas-choice:hover{transform:translateY(-2px) scale(1.01);filter:brightness(1.1)}
.sas-choice:active{transform:scale(.97)}
[data-curriculum="br"] .sas-choice[data-ci="0"]{background:linear-gradient(145deg,#4a2800,#703800);border-color:rgba(255,170,0,.55);color:#fff;box-shadow:0 5px 0 rgba(80,40,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .sas-choice[data-ci="1"]{background:linear-gradient(145deg,#5a1200,#8a1e00);border-color:rgba(255,90,40,.55);color:#fff;box-shadow:0 5px 0 rgba(80,10,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .sas-choice[data-ci="2"]{background:linear-gradient(145deg,#3a3000,#5a4a00);border-color:rgba(220,200,0,.5);color:#fff;box-shadow:0 5px 0 rgba(50,40,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .sas-choice[data-ci="3"]{background:linear-gradient(145deg,#40100a,#601814);border-color:rgba(255,80,60,.55);color:#fff;box-shadow:0 5px 0 rgba(60,10,8,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="bc"] .sas-choice[data-ci="0"]{background:linear-gradient(145deg,#041e18,#062e24);border-color:rgba(0,220,180,.55);color:#e0fff8;box-shadow:0 5px 0 rgba(0,20,15,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .sas-choice[data-ci="1"]{background:linear-gradient(145deg,#041820,#062430);border-color:rgba(0,200,240,.5);color:#e0fff8;box-shadow:0 5px 0 rgba(0,15,25,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .sas-choice[data-ci="2"]{background:linear-gradient(145deg,#180828,#24103a);border-color:rgba(170,80,255,.55);color:#f5ecff;box-shadow:0 5px 0 rgba(20,0,40,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .sas-choice[data-ci="3"]{background:linear-gradient(145deg,#042018,#063028);border-color:rgba(40,230,160,.5);color:#e0fff8;box-shadow:0 5px 0 rgba(0,20,15,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="pb"] .sas-choice[data-ci="0"]{background:#fff;border:2.5px solid #ff6eb4;color:#2a1020;box-shadow:0 5px 0 #ffb0d8,0 7px 14px rgba(255,110,180,.12)}
[data-curriculum="pb"] .sas-choice[data-ci="1"]{background:#fff;border:2.5px solid #cc88ff;color:#2a1020;box-shadow:0 5px 0 #ddb8ff,0 7px 14px rgba(180,120,255,.12)}
[data-curriculum="pb"] .sas-choice[data-ci="2"]{background:#fff;border:2.5px solid #44ccff;color:#2a1020;box-shadow:0 5px 0 #99e8ff,0 7px 14px rgba(50,180,255,.1)}
[data-curriculum="pb"] .sas-choice[data-ci="3"]{background:#fff;border:2.5px solid #ffcc44;color:#2a1020;box-shadow:0 5px 0 #ffe088,0 7px 14px rgba(255,200,50,.1)}
.sas-choice-kanji{font-family:var(--game-font-jp);font-size:clamp(16px,3.2vw,22px);font-weight:900;line-height:1.4;word-break:break-all}
.sas-choice-hira{font-family:var(--game-font-jp);font-size:clamp(12px,2.1vw,16px);font-weight:900;color:var(--game-muted);margin-top:2px;line-height:1.3;word-break:break-all}
[data-curriculum="pb"] .sas-choice-hira{color:rgba(58,26,46,.5)}
.sas-choice.correct{background:linear-gradient(135deg,#0a3d1a,#0d5e28)!important;border-color:#22c55e!important;color:#22c55e!important;box-shadow:0 0 0 4px rgba(34,197,94,.3),0 0 36px rgba(34,197,94,.5),0 5px 20px rgba(0,0,0,.3)!important;animation:sasChoicePop .4s cubic-bezier(.34,1.56,.64,1)}
[data-curriculum="pb"] .sas-choice.correct{background:#f0fff4!important;border-color:#22c55e!important;color:#22c55e!important;box-shadow:0 0 0 3px rgba(34,197,94,.22),0 4px 0 #86efac!important}
.sas-choice.correct .sas-choice-hira{color:rgba(34,197,94,.7)!important}
@keyframes sasChoicePop{from{transform:scale(.92)}60%{transform:scale(1.05)}to{transform:scale(1.01)}}
.sas-choice.wrong{background:linear-gradient(135deg,#3d0a0a,#5e1010)!important;border-color:#ef4444!important;color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.28),0 0 28px rgba(239,68,68,.45)!important;animation:sasShake .42s ease}
[data-curriculum="pb"] .sas-choice.wrong{background:#fff5f5!important;border-color:#ef4444!important;color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.18),0 4px 0 #fca5a5!important}
@keyframes sasShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
.sas-choice.locked{opacity:.4;pointer-events:none}

/* ── Bottom bar ── */
.sas-bottom-bar{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center;width:100%}
.sas-help-btn{width:44px;height:44px;border-radius:50%;padding:0;background:var(--game-surface);border:2px solid var(--game-border);color:var(--game-muted);font-size:1.15rem;display:flex;align-items:center;justify-content:center;box-shadow:none;cursor:pointer;transition:transform .15s;-webkit-tap-highlight-color:transparent}
.sas-help-btn:hover{border-color:#a78bfa;color:#a78bfa;transform:scale(1.08)}
[data-curriculum="bc"] .sas-help-btn:hover{border-color:#00ddff;color:#00ddff}
[data-curriculum="pb"] .sas-help-btn{background:#fff;border-color:#cc88ff;color:#aa44cc;box-shadow:0 3px 0 #ddb8ff}

/* ── Results ── */
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

/* ── Modal ── */
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
`;
document.head.appendChild(S);

/* ═══ HTML ═══ */
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
    <div class="sas-play-wrap">
      <div class="sas-play-label">TAP TO LISTEN / 聞いてみよう</div>
      <button class="sas-play-btn" id="sas-play" aria-label="Play audio">▶</button>
    </div>
  </div>
  <div class="sas-toggle-wrap">
    <button class="sas-toggle-btn active" id="sas-tog-kanji">漢字</button>
    <button class="sas-toggle-btn"        id="sas-tog-hira">ひらがな</button>
  </div>
  <div class="sas-choices" id="sas-choices"></div>
  <div class="sas-bottom-bar">
    <button class="sas-help-btn" id="sas-help">？</button>
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
      <div class="sas-how-step"><div class="sas-how-num">1</div><div>
        <div class="sas-how-en">Tap ▶ to hear the sentence.</div>
        <div class="sas-how-jp">▶をタップして文を聞こう。</div>
      </div></div>
      <div class="sas-how-step"><div class="sas-how-num">2</div><div>
        <div class="sas-how-en">Choose the correct Japanese answer from the 4 choices.</div>
        <div class="sas-how-jp">4つの中から正しい日本語の答えをえらぼう。</div>
      </div></div>
      <div class="sas-how-step"><div class="sas-how-num">3</div><div>
        <div class="sas-how-en">First-try correct answers score a point and auto-advance!</div>
        <div class="sas-how-jp">一発正解でポイント＆自動で次へ！</div>
      </div></div>
      <div class="sas-how-step"><div class="sas-how-num">4</div><div>
        <div class="sas-how-en">Can't read the kanji? Tap ひらがな to switch.</div>
        <div class="sas-how-jp">漢字が読めない？ひらがなボタンで切り替えよう。</div>
      </div></div>
      <button class="sas-modal-close" id="sas-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>
`);

/* ═══ DOM REFS ═══ */
const mainWrap  = document.getElementById('sas-main-wrap');
const numEl     = document.getElementById('sas-num');
const scoreEl   = document.getElementById('sas-score');
const sasCard   = document.getElementById('sas-card');
const playBtn   = document.getElementById('sas-play');
const choicesEl = document.getElementById('sas-choices');
const helpBtn   = document.getElementById('sas-help');
const results   = document.getElementById('sas-results');
const dotsRow   = document.getElementById('sas-dots');
const modalOver = document.getElementById('sas-modal-overlay');
const togKanji  = document.getElementById('sas-tog-kanji');
const togHira   = document.getElementById('sas-tog-hira');

/* ═══ DOTS ═══ */
for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'sas-dot'; d.id = `sas-d${i}`;
  dotsRow.appendChild(d);
}
function updateDots() {
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`sas-d${i}`);
    if (!d) continue;
    d.className = 'sas-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
  }
}

/* ═══ MODAL ═══ */
helpBtn.addEventListener('click', () => modalOver.classList.add('open'));
document.getElementById('sas-modal-ok').addEventListener('click', () => modalOver.classList.remove('open'));
modalOver.addEventListener('click', e => { if (e.target === modalOver) modalOver.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOver.classList.remove('open'); });

/* ═══ STATE ═══ */

let order = U.shuffle(CFG.cards.slice(0, 15));
let idx = 0, score = 0, streak = 0;
let answered = false, firstTry = true, pickCooldown = false, isBusy = false;
let showKanji = true;

function updateStreak(n) {
  streak = n;
  const el = document.getElementById('sas-streak');
  if (el) el.textContent = streak;
}

/* ═══ TOGGLE ═══ */
function applyToggle() {
  togKanji.classList.toggle('active',  showKanji);
  togHira.classList.toggle('active',  !showKanji);
  choicesEl.querySelectorAll('.sas-choice').forEach(btn => {
    const k = btn.querySelector('.sas-choice-kanji');
    const h = btn.querySelector('.sas-choice-hira');
    if (k) k.style.display = showKanji ? '' : 'none';
    if (h) h.style.display = showKanji ? 'none' : '';
  });
}
togKanji.addEventListener('click', () => { showKanji = true;  applyToggle(); });
togHira.addEventListener('click',  () => { showKanji = false; applyToggle(); });

/* ═══ ADVANCE ═══ */
let advancedThisCard = false;
function advanceToNextCard() {
  if (advancedThisCard) return;
  advancedThisCard = true;
  isBusy = false;
  idx++;
  if (idx >= order.length) showResults();
  else showCard();
}
function playSuccessThenAdvance() {
  const goNext = () => setTimeout(advanceToNextCard, 220);
  const ding = SFX['ding'] ? SFX['ding'].cloneNode() : null;
  if (!ding) { goNext(); return; }
  ding.setAttribute('playsinline',''); ding.setAttribute('webkit-playsinline','');
  let dingDone = false;
  const afterDing = () => { if (dingDone) return; dingDone = true; goNext(); };
  ding.onended = afterDing; ding.onerror = afterDing;
  setTimeout(afterDing, 450);
  ding.play().catch(afterDing);
}

/* ═══ PLAY BUTTON ═══ */
playBtn.addEventListener('click', () => {
  if (playBtn.disabled) return;
  const card = order[idx]; if (!card.mp3) return;
  playBtn.disabled = true;
  playBtn.classList.add('playing');
  playBtn.textContent = '♪';
  U.unlockAudio();
  try {
    const a = new Audio(CFG.audioBase + card.mp3);
    a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline','');
    const done = () => { playBtn.disabled = false; playBtn.classList.remove('playing'); playBtn.textContent = '▶'; };
    a.onended = done; a.onerror = done;
    setTimeout(done, 8000);
    a.play().catch(done);
  } catch(e) { playBtn.disabled = false; playBtn.classList.remove('playing'); playBtn.textContent = '▶'; }
});
playBtn.addEventListener('touchstart', e => { e.preventDefault(); playBtn.click(); }, { passive:false });

/* ═══ BUILD CHOICES ═══ */
function buildChoices(card) {
  choicesEl.innerHTML = '';
  const pool = order.filter((c, i) => i !== idx && c.jp !== card.jp);
  const distractors = U.shuffle(pool).slice(0, 3);
  const choices = U.shuffle([card, ...distractors]);
  choices.forEach((c, ci) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sas-choice';
    btn.setAttribute('data-ci', ci);
    btn.innerHTML = `
      <span class="sas-choice-kanji" style="${showKanji ? '' : 'display:none'}">${c.jp || ''}</span>
      <span class="sas-choice-hira"  style="${showKanji ? 'display:none' : ''}">${c.hira || c.jp || ''}</span>
    `;
    btn.style.opacity = '0';
    btn.style.transform = 'translateY(8px) scale(.97)';
    setTimeout(() => {
      btn.style.transition = 'opacity .24s ease,transform .24s cubic-bezier(.34,1.56,.64,1)';
      btn.style.opacity = '1'; btn.style.transform = '';
    }, ci * 55);
    const handlePick = () => handleChoice(btn, c);
    btn.addEventListener('touchstart', e => { e.preventDefault(); U.unlockAudio(); handlePick(); }, { passive:false });
    btn.addEventListener('click', e => { if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; handlePick(); });
    choicesEl.appendChild(btn);
  });
}

/* ═══ HANDLE CHOICE ═══ */
function handleChoice(btn, card) {
  if (answered || pickCooldown || isBusy) return;
  pickCooldown = true;
  setTimeout(() => { pickCooldown = false; }, 600);
  const correct = card.jp === order[idx].jp;
  if (correct) {
    isBusy = true; answered = true;
    btn.classList.add('correct');
    Array.from(choicesEl.children).forEach(b => b.classList.add('locked'));
    if (firstTry) { score++; scoreEl.textContent = score; }
    updateStreak(streak + 1);
    updateDots();
    playSuccessThenAdvance();
  } else {
    firstTry = false; updateStreak(0);
    btn.classList.add('wrong');
    U.unlockAudio(); playSfx('fart');
    sasCard.classList.add('wrong-state');
    setTimeout(() => { btn.classList.remove('wrong'); sasCard.classList.remove('wrong-state'); }, 500);
  }
}

/* ═══ SHOW CARD ═══ */
function showCard() {
  isBusy = false; answered = false; firstTry = true;
  pickCooldown = false; advancedThisCard = false;
  playBtn.disabled = false; playBtn.classList.remove('playing'); playBtn.textContent = '▶';
  sasCard.classList.remove('wrong-state');
  numEl.textContent = idx + 1;
  updateDots();
  buildChoices(order[idx]);
}

/* ═══ CONFETTI ═══ */
function fireConfetti(big = false) {
  const colors = ['#a78bfa','#ff2288','#ffcc00','#22ddff','#fff','#ff6eb4','#aaff22'];
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.38;
  for (let i = 0, n = big ? 80 : 36; i < n; i++) {
    const el = document.createElement('div'); el.className = 'sas-confetti-piece';
    const angle = Math.random() * Math.PI * 2, dist = (big ? 200 : 110) + Math.random() * 220;
    el.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i%colors.length]};--cx:${(Math.cos(angle)*dist).toFixed(1)}px;--cy:${(Math.sin(angle)*dist).toFixed(1)}px;--cr:${((Math.random()-.5)*720).toFixed(0)}deg;animation-delay:${(Math.random()*.2).toFixed(3)}s;animation-duration:${(.85+Math.random()*.5).toFixed(3)}s;border-radius:${Math.random()>.5?'50%':'2px'};width:${(5+Math.random()*8).toFixed(1)}px;height:${(5+Math.random()*8).toFixed(1)}px;`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* ═══ RESULTS ═══ */
function showResults() {
  for (let i = 0; i < 15; i++) { const d = document.getElementById(`sas-d${i}`); if (d) d.className = 'sas-dot done'; }
  mainWrap.style.display = 'none';
  const outer = document.querySelector('.sas-results-outer');
  if (outer) outer.style.display = '';
  results.classList.add('show');
  const tier = getTier(score), pct = Math.round((score / 15) * 100);
  document.dispatchEvent(new CustomEvent('booha:gameEnd', { detail: { saveId:`${CFG.curriculum}:say_sentence`, score:pct, completed:pct >= 40 } }));
  results.style.setProperty('--sas-tier-color', tier.color);
  document.getElementById('sas-rs').textContent = `${score} / 15`;
  document.getElementById('sas-rp').textContent = `${pct}%`;
  document.getElementById('sas-rl').textContent = tier.label;
  document.getElementById('sas-re').textContent = tier.en;
  document.getElementById('sas-rk').textContent = tier.kanji;
  document.getElementById('sas-rj').textContent = tier.jp;
  if (score === 15) { fireConfetti(false); setTimeout(() => fireConfetti(true), 500); }
  if (CFG.sfxBase && tier.sound) {
    const snd = new Audio(CFG.sfxBase + tier.sound);
    snd.setAttribute('playsinline',''); snd.setAttribute('webkit-playsinline','');
    snd.play().catch(() => {});
  }
}

/* ═══ REPLAY / BACK ═══ */
document.getElementById('sas-replay').addEventListener('click', () => {
  results.classList.remove('show'); mainWrap.style.display = '';
  idx = 0; score = 0; streak = 0;
  scoreEl.textContent = '0';
  const se = document.getElementById('sas-streak'); if (se) se.textContent = '0';
  answered = false; firstTry = true; pickCooldown = false;
  advancedThisCard = false; isBusy = false;
   
  showKanji = true; applyToggle();
  order = U.shuffle(order); showCard();
   
});
document.getElementById('sas-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

U.unlockAudio();
showCard();

})();
