
/* ══════════════════════════════════════════════════════════════
   ask-question.js  —  Listen & Choose  v5
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

U.setTitle('Ask the Question');
U.unlockAudio();

const PASS = 80;

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
    color:'#10b981' },
  { min:15, max:15, sound:'result_15.mp3',
    label:'PERFECT LISTENING!',
    en:'Every question answered perfectly — incredible!',
    kanji:'全問完璧！最高の聞き取り力！',
    jp:'全部の問題に完璧に答えられた！すごい！',
    color:'#ffcc00' },
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

/* ── Card ── */
.aq-card{width:100%;border-radius:22px;padding:2.2rem 1.4rem 2rem;position:relative;overflow:hidden;text-align:center;background:var(--game-surface);border:2px solid var(--game-border);box-shadow:0 6px 26px rgba(0,0,0,.22);box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;min-height:160px}
[data-curriculum="br"] .aq-card{background:linear-gradient(145deg,rgba(255,204,0,.08),rgba(255,136,0,.05),rgba(0,0,0,.2));border-color:rgba(255,204,0,.28)}
[data-curriculum="bc"] .aq-card{background:linear-gradient(145deg,rgba(0,220,180,.07),rgba(0,136,255,.05),rgba(0,0,0,.28));border-color:rgba(0,210,170,.22)}
[data-curriculum="pb"] .aq-card{background:#fff;border:3px solid #ff9966;box-shadow:0 5px 0 #ffcc99,0 8px 22px rgba(255,136,68,.12)}
.aq-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#ffcc00,#ff8800,#ffee44,#ff6600,#ffcc00);background-size:220% auto;animation:aqRainbow 2.4s linear infinite}
[data-curriculum="bc"] .aq-card::before{background:linear-gradient(90deg,#00e8b0,#0088ff,#00ddaa,#0055cc,#00e8b0);background-size:220% auto}
[data-curriculum="pb"] .aq-card::before{background:linear-gradient(90deg,#ff8844,#ffcc44,#ff6622,#ffaa22,#ff8844);background-size:220% auto}
.aq-card.wrong-state{animation:aqCardShake .45s ease;border-color:#ef4444!important;box-shadow:0 0 0 4px rgba(239,68,68,.2),0 0 30px rgba(239,68,68,.3)!important}
@keyframes aqCardShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}35%{transform:translateX(8px)}55%{transform:translateX(-5px)}75%{transform:translateX(5px)}}

/* ── Play button ── */
.aq-play-wrap{display:flex;flex-direction:column;align-items:center;gap:.55rem}
.aq-play-label{font-family:var(--game-font-body);font-size:clamp(11px,1.9vw,14px);font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--game-muted);opacity:.75}
[data-curriculum="pb"] .aq-play-label{color:rgba(58,26,46,.5)}
.aq-play-btn{width:72px;height:72px;border-radius:50%;flex-shrink:0;border:none;cursor:pointer;display:grid;place-items:center;font-size:26px;color:#1a0a00;background:radial-gradient(circle at 30% 30%,#ffe8a3,#ffd36a 60%,#ffb800 100%);box-shadow:0 0 0 3px rgba(255,213,120,.35),0 0 24px rgba(255,214,120,.65),0 5px 0 rgba(140,80,0,.4);animation:aqGoldPulse 1.8s ease-in-out infinite;transition:transform .15s,opacity .2s,box-shadow .2s;-webkit-tap-highlight-color:transparent}
.aq-play-btn:hover{transform:scale(1.1)}
.aq-play-btn:active{transform:scale(.92)}
.aq-play-btn:disabled{opacity:.35;pointer-events:none;animation:none}
.aq-play-btn.playing{background:radial-gradient(circle at 30% 30%,#a8f0c8,#22c55e 60%,#16a34a 100%);box-shadow:0 0 0 4px rgba(34,197,94,.3),0 0 28px rgba(34,197,94,.7),0 5px 0 rgba(10,80,30,.4);animation:aqPlayingPulse 1s ease-in-out infinite}
[data-curriculum="bc"] .aq-play-btn{background:radial-gradient(circle at 30% 30%,#a8f0e8,#00ddaa 60%,#009977 100%);box-shadow:0 0 0 3px rgba(0,221,170,.3),0 0 24px rgba(0,221,170,.55),0 5px 0 rgba(0,60,50,.4)}
[data-curriculum="pb"] .aq-play-btn{background:radial-gradient(circle at 30% 30%,#ffd0b8,#ff9966 60%,#ff6622 100%);box-shadow:0 0 0 3px rgba(255,153,102,.3),0 0 24px rgba(255,153,102,.55),0 5px 0 #ffccaa;color:#fff}
@keyframes aqGoldPulse{0%,100%{box-shadow:0 0 0 3px rgba(255,213,120,.25),0 0 10px rgba(255,214,120,.35),0 5px 0 rgba(140,80,0,.4)}50%{box-shadow:0 0 0 4px rgba(255,213,120,.5),0 0 28px rgba(255,214,120,.9),0 5px 0 rgba(140,80,0,.4)}}
@keyframes aqPlayingPulse{0%,100%{box-shadow:0 0 0 4px rgba(34,197,94,.2),0 0 20px rgba(34,197,94,.5),0 5px 0 rgba(10,80,30,.4)}50%{box-shadow:0 0 0 8px rgba(34,197,94,.35),0 0 36px rgba(34,197,94,.8),0 5px 0 rgba(10,80,30,.4)}}

/* ── Toggle ── */
.aq-toggle-wrap{display:flex;align-items:center;justify-content:center;gap:0;border-radius:999px;overflow:hidden;border:1.5px solid var(--game-border);background:var(--game-surface)}
[data-curriculum="pb"] .aq-toggle-wrap{border-color:#ffd0aa;background:#fff}
.aq-toggle-btn{font-family:var(--game-font-body);font-size:clamp(12px,2vw,14px);font-weight:900;letter-spacing:.04em;padding:7px 18px;border:none;cursor:pointer;background:transparent;color:var(--game-muted);transition:background .2s,color .2s;-webkit-tap-highlight-color:transparent}
.aq-toggle-btn.active{background:linear-gradient(135deg,#ffcc00,#ff8800);color:#1a0500}
[data-curriculum="bc"] .aq-toggle-btn.active{background:linear-gradient(135deg,#00ddaa,#0088cc);color:#001a14}
[data-curriculum="pb"] .aq-toggle-btn.active{background:linear-gradient(135deg,#ff9966,#ff6622);color:#fff}
[data-curriculum="pb"] .aq-toggle-btn{color:rgba(58,26,46,.45)}

/* ── Choice grid ── */
.aq-choices{width:100%;display:flex;flex-direction:column;gap:10px}
.aq-choice{width:100%;min-height:64px;padding:.85rem 1.1rem;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left;border-radius:18px;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;position:relative;overflow:hidden;transition:transform .14s cubic-bezier(.34,1.56,.64,1),box-shadow .14s,filter .14s;background:linear-gradient(145deg,rgba(255,200,0,.12),rgba(200,100,0,.07));border:2px solid rgba(255,200,0,.28);color:var(--game-tile-text);box-shadow:0 4px 0 rgba(0,0,0,.28),0 6px 14px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.1);box-sizing:border-box}
.aq-choice::after{content:'';position:absolute;top:-60%;left:-80%;width:50%;height:200%;background:linear-gradient(108deg,transparent 28%,rgba(255,255,255,.2) 50%,transparent 72%);transform:skewX(-16deg);transition:left .45s ease;pointer-events:none}
.aq-choice:hover::after{left:150%}
.aq-choice:hover{transform:translateY(-2px) scale(1.01);filter:brightness(1.1)}
.aq-choice:active{transform:scale(.97)}
[data-curriculum="br"] .aq-choice[data-ci="0"]{background:linear-gradient(145deg,#4a2800,#703800);border-color:rgba(255,170,0,.55);color:#fff;box-shadow:0 5px 0 rgba(80,40,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .aq-choice[data-ci="1"]{background:linear-gradient(145deg,#5a1200,#8a1e00);border-color:rgba(255,90,40,.55);color:#fff;box-shadow:0 5px 0 rgba(80,10,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .aq-choice[data-ci="2"]{background:linear-gradient(145deg,#3a3000,#5a4a00);border-color:rgba(220,200,0,.5);color:#fff;box-shadow:0 5px 0 rgba(50,40,0,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="br"] .aq-choice[data-ci="3"]{background:linear-gradient(145deg,#40100a,#601814);border-color:rgba(255,80,60,.55);color:#fff;box-shadow:0 5px 0 rgba(60,10,8,.6),0 7px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.15)}
[data-curriculum="bc"] .aq-choice[data-ci="0"]{background:linear-gradient(145deg,#041e18,#062e24);border-color:rgba(0,220,180,.55);color:#e0fff8;box-shadow:0 5px 0 rgba(0,20,15,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .aq-choice[data-ci="1"]{background:linear-gradient(145deg,#041820,#062430);border-color:rgba(0,200,240,.5);color:#e0fff8;box-shadow:0 5px 0 rgba(0,15,25,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .aq-choice[data-ci="2"]{background:linear-gradient(145deg,#021e14,#042e20);border-color:rgba(0,230,160,.5);color:#e0fff8;box-shadow:0 5px 0 rgba(0,20,12,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="bc"] .aq-choice[data-ci="3"]{background:linear-gradient(145deg,#021824,#033040);border-color:rgba(0,200,230,.55);color:#e0fff8;box-shadow:0 5px 0 rgba(0,15,28,.7),0 7px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
[data-curriculum="pb"] .aq-choice[data-ci="0"]{background:#fff;border:2.5px solid #ff9966;color:#2a1020;box-shadow:0 5px 0 #ffccaa,0 7px 14px rgba(255,136,68,.12)}
[data-curriculum="pb"] .aq-choice[data-ci="1"]{background:#fff;border:2.5px solid #ffcc44;color:#2a1020;box-shadow:0 5px 0 #ffe088,0 7px 14px rgba(255,200,50,.1)}
[data-curriculum="pb"] .aq-choice[data-ci="2"]{background:#fff;border:2.5px solid #44ccff;color:#2a1020;box-shadow:0 5px 0 #99e8ff,0 7px 14px rgba(50,180,255,.1)}
[data-curriculum="pb"] .aq-choice[data-ci="3"]{background:#fff;border:2.5px solid #ff6eb4;color:#2a1020;box-shadow:0 5px 0 #ffb0d8,0 7px 14px rgba(255,110,180,.12)}
.aq-choice-kanji{font-family:var(--game-font-jp);font-size:clamp(16px,3.2vw,22px);font-weight:900;line-height:1.4;word-break:break-all}
.aq-choice-hira{font-family:var(--game-font-jp);font-size:clamp(12px,2.1vw,16px);color:var(--game-muted);margin-top:2px;line-height:1.3;word-break:break-all}
[data-curriculum="pb"] .aq-choice-hira{color:rgba(58,26,46,.5)}
.aq-choice.correct{background:linear-gradient(135deg,#0a3d1a,#0d5e28)!important;border-color:#22c55e!important;color:#22c55e!important;box-shadow:0 0 0 4px rgba(34,197,94,.3),0 0 36px rgba(34,197,94,.5),0 5px 20px rgba(0,0,0,.3)!important;animation:aqChoicePop .4s cubic-bezier(.34,1.56,.64,1)}
[data-curriculum="pb"] .aq-choice.correct{background:#f0fff4!important;border-color:#22c55e!important;color:#22c55e!important;box-shadow:0 0 0 3px rgba(34,197,94,.22),0 4px 0 #86efac!important}
.aq-choice.correct .aq-choice-hira{color:rgba(34,197,94,.7)!important}
@keyframes aqChoicePop{from{transform:scale(.92)}60%{transform:scale(1.05)}to{transform:scale(1.01)}}
.aq-choice.wrong{background:linear-gradient(135deg,#3d0a0a,#5e1010)!important;border-color:#ef4444!important;color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.28),0 0 28px rgba(239,68,68,.45)!important;animation:aqShake .42s ease}
[data-curriculum="pb"] .aq-choice.wrong{background:#fff5f5!important;border-color:#ef4444!important;color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.18),0 4px 0 #fca5a5!important}
@keyframes aqShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
.aq-choice.locked{opacity:.4;pointer-events:none}

/* ── Bottom bar ── */
.aq-bottom-bar{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center;width:100%}
.aq-skip-btn,.aq-help-btn{font-family:var(--game-font-title);font-size:clamp(13px,2.4vw,17px);font-weight:900;letter-spacing:.06em;padding:11px 24px;border-radius:999px;border:none;cursor:pointer;transition:transform .15s cubic-bezier(.34,1.56,.64,1);-webkit-tap-highlight-color:transparent}
.aq-skip-btn{background:transparent;border:2px solid rgba(255,255,255,.22);color:var(--game-muted);box-shadow:none}
.aq-skip-btn:hover{border-color:rgba(255,255,255,.5);color:var(--game-ink)}
[data-curriculum="pb"] .aq-skip-btn{border-color:rgba(58,26,46,.22);color:rgba(58,26,46,.5)}
.aq-help-btn{width:44px;height:44px;border-radius:50%;padding:0;background:var(--game-surface);border:2px solid var(--game-border);color:var(--game-muted);font-size:1.15rem;display:flex;align-items:center;justify-content:center;box-shadow:none}
.aq-help-btn:hover{border-color:#ffcc00;color:#ffcc00;transform:scale(1.08)}
[data-curriculum="bc"] .aq-help-btn:hover{border-color:#00ddaa;color:#00ddaa}
[data-curriculum="pb"] .aq-help-btn{background:#fff;border-color:#ff9966;color:#cc5522;box-shadow:0 3px 0 #ffccaa}
.aq-skip-btn:active{transform:scale(.94)}

/* ── Results ── */
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

/* ── Modal ── */
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
`;
document.head.appendChild(S);

/* ═══ HTML ═══ */
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
    <div class="aq-play-wrap">
      <div class="aq-play-label">TAP TO LISTEN / 聞いてみよう</div>
      <button class="aq-play-btn" id="aq-play" aria-label="Play audio">▶</button>
    </div>
  </div>
  <div class="aq-toggle-wrap">
    <button class="aq-toggle-btn active" id="aq-tog-kanji">漢字</button>
    <button class="aq-toggle-btn"        id="aq-tog-hira">ひらがな</button>
  </div>
  <div class="aq-choices" id="aq-choices"></div>
  <div class="aq-bottom-bar">
    <button class="aq-skip-btn" id="aq-skip" style="display:none">SKIP / スキップ</button>
    <button class="aq-help-btn" id="aq-help">？</button>
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
      <div class="aq-how-step"><div class="aq-how-num">1</div><div>
        <div class="aq-how-en">Tap ▶ to hear the question.</div>
        <div class="aq-how-jp">▶をタップして質問を聞こう。</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">2</div><div>
        <div class="aq-how-en">Choose the correct Japanese answer from the 4 choices.</div>
        <div class="aq-how-jp">4つの中から正しい日本語の答えをえらぼう。</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">3</div><div>
        <div class="aq-how-en">First-try correct answers score a point and auto-advance!</div>
        <div class="aq-how-jp">一発正解でポイント＆自動で次へ！</div>
      </div></div>
      <div class="aq-how-step"><div class="aq-how-num">4</div><div>
        <div class="aq-how-en">Can't read the kanji? Tap ひらがな to switch.</div>
        <div class="aq-how-jp">漢字が読めない？ひらがなボタンで切り替えよう。</div>
      </div></div>
      <button class="aq-modal-close" id="aq-modal-ok">Got it! / わかった！</button>
    </div>
  </div>
</div>
`);

/* ═══ DOM REFS ═══ */
const mainWrap   = document.getElementById('aq-main-wrap');
const numEl      = document.getElementById('aq-num');
const scoreEl    = document.getElementById('aq-score');
const aqCard     = document.getElementById('aq-card');
const playBtn    = document.getElementById('aq-play');
const choicesEl  = document.getElementById('aq-choices');
const skipBtn    = document.getElementById('aq-skip');
const helpBtn    = document.getElementById('aq-help');
const results    = document.getElementById('aq-results');
const dotsRow    = document.getElementById('aq-dots');
const modalOver  = document.getElementById('aq-modal-overlay');
const togKanji   = document.getElementById('aq-tog-kanji');
const togHira    = document.getElementById('aq-tog-hira');

/* ═══ DOTS ═══ */
for (let i = 0; i < 15; i++) {
  const d = document.createElement('div');
  d.className = 'aq-dot'; d.id = `aq-d${i}`;
  dotsRow.appendChild(d);
}
function updateDots() {
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`aq-d${i}`);
    if (!d) continue;
    d.className = 'aq-dot' + (i < idx ? ' done' : i === idx ? ' active' : '');
  }
}

/* ═══ MODAL ═══ */
helpBtn.addEventListener('click', () => modalOver.classList.add('open'));
document.getElementById('aq-modal-ok').addEventListener('click', () => modalOver.classList.remove('open'));
modalOver.addEventListener('click', e => { if (e.target === modalOver) modalOver.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOver.classList.remove('open'); });

/* ═══ STATE ═══ */
const order = U.shuffle(CFG.cards.slice(0, 15));
let idx = 0, score = 0, streak = 0;
let answered = false, firstTry = true, pickCooldown = false, isBusy = false;
let showKanji = true; // toggle state — persists for entire game

function updateStreak(n) {
  streak = n;
  const el = document.getElementById('aq-streak');
  if (el) el.textContent = streak;
}

/* ═══ TOGGLE ═══ */
function applyToggle() {
  togKanji.classList.toggle('active',  showKanji);
  togHira.classList.toggle('active',  !showKanji);
  choicesEl.querySelectorAll('.aq-choice').forEach(btn => {
    const k = btn.querySelector('.aq-choice-kanji');
    const h = btn.querySelector('.aq-choice-hira');
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

function playSuccessThenAdvance(mp3) {
  const goNext = () => setTimeout(advanceToNextCard, 220);
  const playAnswer = () => {
    if (!mp3) { goNext(); return; }
    const a = new Audio(CFG.audioBase + mp3);
    a.setAttribute('playsinline',''); a.setAttribute('webkit-playsinline','');
    a.setAttribute('preload','auto');
    let done = false;
    const finish = () => { if (done) return; done = true; goNext(); };
    a.onended = finish; a.onerror = finish;
    setTimeout(finish, 4000);
    a.play().catch(finish);
  };
  const ding = SFX['ding'] ? SFX['ding'].cloneNode() : null;
  if (!ding) { playAnswer(); return; }
  ding.setAttribute('playsinline',''); ding.setAttribute('webkit-playsinline','');
  let dingDone = false;
  const afterDing = () => { if (dingDone) return; dingDone = true; playAnswer(); };
  ding.onended = afterDing; ding.onerror = afterDing;
  setTimeout(afterDing, 450);
  ding.play().catch(afterDing);
}

/* ═══ PLAY BUTTON — anti-smash ═══ */
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
    const done = () => {
      playBtn.disabled = false;
      playBtn.classList.remove('playing');
      playBtn.textContent = '▶';
    };
    a.onended = done; a.onerror = done;
    setTimeout(done, 8000);
    a.play().catch(done);
  } catch(e) {
    playBtn.disabled = false;
    playBtn.classList.remove('playing');
    playBtn.textContent = '▶';
  }
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
    btn.className = 'aq-choice';
    btn.setAttribute('data-ci', ci);
    btn.innerHTML = `
      <span class="aq-choice-kanji" style="${showKanji ? '' : 'display:none'}">${c.jp || ''}</span>
      <span class="aq-choice-hira"  style="${showKanji ? 'display:none' : ''}">${c.hira || c.jp || ''}</span>
    `;
    btn.style.opacity = '0';
    btn.style.transform = 'translateY(8px) scale(.97)';
    setTimeout(() => {
      btn.style.transition = 'opacity .24s ease,transform .24s cubic-bezier(.34,1.56,.64,1)';
      btn.style.opacity = '1';
      btn.style.transform = '';
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
    isBusy = true;
    answered = true;
    btn.classList.add('correct');
    Array.from(choicesEl.children).forEach(b => b.classList.add('locked'));
    if (firstTry) { score++; scoreEl.textContent = score; }
    updateStreak(streak + 1);
    updateDots();
    playSuccessThenAdvance(order[idx].mp3);
  } else {
    firstTry = false;
    updateStreak(0);
    btn.classList.add('wrong');
    U.unlockAudio(); playSfx('fart');
    aqCard.classList.add('wrong-state');
    setTimeout(() => {
      btn.classList.remove('wrong');
      aqCard.classList.remove('wrong-state');
    }, 500);
    skipBtn.style.display = '';
  }
}

/* ═══ SHOW CARD ═══ */
function showCard() {
  isBusy = false;
  answered = false;
  firstTry = true;
  pickCooldown = false;
  advancedThisCard = false;
  skipBtn.style.display = 'none';
  playBtn.disabled = false;
  playBtn.classList.remove('playing');
  playBtn.textContent = '▶';
  aqCard.classList.remove('wrong-state');
  numEl.textContent = idx + 1;
  updateDots();
  buildChoices(order[idx]);
}

/* ═══ SKIP ═══ */
skipBtn.addEventListener('click', () => {
  if (isBusy) return;
  idx++;
  scoreEl.textContent = score;
  if (idx >= order.length) { showResults(); return; }
  showCard();
});

/* ═══ CONFETTI ═══ */
function fireConfetti(big = false) {
  const colors = ['#ffcc00','#ff8800','#ffee44','#22ddff','#fff','#ff6600','#aaff22'];
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.38;
  for (let i = 0, n = big ? 80 : 36; i < n; i++) {
    const el = document.createElement('div'); el.className = 'aq-confetti-piece';
    const angle = Math.random() * Math.PI * 2, dist = (big ? 200 : 110) + Math.random() * 220;
    el.style.cssText = `left:${cx}px;top:${cy}px;background:${colors[i%colors.length]};--cx:${(Math.cos(angle)*dist).toFixed(1)}px;--cy:${(Math.sin(angle)*dist).toFixed(1)}px;--cr:${((Math.random()-.5)*720).toFixed(0)}deg;animation-delay:${(Math.random()*.2).toFixed(3)}s;animation-duration:${(.85+Math.random()*.5).toFixed(3)}s;border-radius:${Math.random()>.5?'50%':'2px'};width:${(5+Math.random()*8).toFixed(1)}px;height:${(5+Math.random()*8).toFixed(1)}px;`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* ═══ RESULTS ═══ */
function showResults() {
  for (let i = 0; i < 15; i++) {
    const d = document.getElementById(`aq-d${i}`);
    if (d) d.className = 'aq-dot done';
  }
  mainWrap.style.display = 'none';
  const outer = document.querySelector('.aq-results-outer');
  if (outer) outer.style.display = '';
  results.classList.add('show');
  const tier = getTier(score), pct = Math.round((score / 15) * 100);
  document.dispatchEvent(new CustomEvent('booha:gameEnd', { detail: { saveId: `${CFG.curriculum}:ask_question`, score: pct, completed: pct >= 40 } }));
  results.style.setProperty('--aq-tier-color', tier.color);
  document.getElementById('aq-rs').textContent = `${score} / 15`;
  document.getElementById('aq-rp').textContent = `${pct}%`;
  document.getElementById('aq-rl').textContent = tier.label;
  document.getElementById('aq-re').textContent = tier.en;
  document.getElementById('aq-rk').textContent = tier.kanji;
  document.getElementById('aq-rj').textContent = tier.jp;
  if (score === 15) { fireConfetti(false); setTimeout(() => fireConfetti(true), 500); }
  if (CFG.sfxBase && tier.sound) {
    const snd = new Audio(CFG.sfxBase + tier.sound);
    snd.setAttribute('playsinline',''); snd.setAttribute('webkit-playsinline','');
    snd.play().catch(() => {});
  }
}

/* ═══ REPLAY / BACK ═══ */
document.getElementById('aq-replay').addEventListener('click', () => {
  results.classList.remove('show');
  mainWrap.style.display = '';
  idx = 0; score = 0; streak = 0;
  scoreEl.textContent = '0';
  const se = document.getElementById('aq-streak'); if (se) se.textContent = '0';
  answered = false; firstTry = true; pickCooldown = false;
  advancedThisCard = false; isBusy = false;
  // reset toggle to kanji on replay
  showKanji = true; applyToggle();
  U.shuffle(order);
  showCard();
});
document.getElementById('aq-back').addEventListener('click', () => {
  window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));
});

U.unlockAudio();
showCard();

})();
