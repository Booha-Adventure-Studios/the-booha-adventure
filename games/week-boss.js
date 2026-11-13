/* ══════════════════════════════════════════════════════════════
   week-boss.js — Week Boss (Games Pass 8, extra game)
   Opens once all nine games of this curriculum have been played this
   week (live week only). It never changes the 9-game unlock: it saves as
   "{curriculum}-extra:week_boss", outside the nine.

   15 rounds from this week's vocab, sentences and questions, in four
   formats none of the nine games use:
     CHECK  Match or not?        EN sentence + Japanese: right translation?
     TYPE   Type it from meaning Japanese → type the English word (2 tries)
     SPOT   Spot the wrong word   one word in the sentence was swapped: tap it
     HEAR   Which did you hear?   hear a question → pick the English
   One try on the choice rounds (a wrong answer shows the right one);
   TYPE allows one fix (+0.5, +50 points).

   The boss has 15 HP. A first-try answer hits for 1; inside a combo of 3+
   it is a CRITICAL hit for 1.5; a TYPE fix hits for 0.5. Beating the boss
   needs roughly 13 of 15 with streaks, and earns the week crown (saved
   as this game's crown, shown on the menu tree).
   ══════════════════════════════════════════════════════════════ */
(async function () {
'use strict';

/* ── Pure logic (exported for tests/games-extras-audit.cjs) ─────────────── */
const BOSS_HP = 15;
const STOP = new Set(('a an the and or but so of to in on at by for from with as is am are was were be been being it its this that these those ' +
  'i you he she we they me him her us them my your his our their do does did have has had will would can could should may might must ' +
  'not no yes very too also just than then there here what who where when why how which up out off over into about').split(' '));

function damageFor(kind, combo) {
  if (kind === 'recover') return 0.5;
  if (kind === 'hit') return combo >= 3 ? 1.5 : 1;
  return 0;
}

/* Typed-answer check: identical rules to Echo (tests assert parity). */
function normalize(s) {
  return String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[‐‑‒–—-]/g, ' ')
    .replace(/[.,!?;:"“”。、]/g, ' ').replace(/\s+/g, ' ').trim();
}
function targetsOf(t) { return String(t || '').split(/[／/]/).map(normalize).filter(Boolean); }
function distance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}
function allowedSlips(t) { const n = t.replace(/[^a-z]/g, '').length; return n >= 15 ? 2 : n >= 5 ? 1 : 0; }
function check(target, typed) {
  const got = normalize(typed);
  if (!got) return 'wrong';
  const alts = targetsOf(target);
  if (/[／/]/.test(got)) { const parts = targetsOf(got); if (parts.length && parts.every(p => alts.includes(p))) return 'exact'; }
  let near = false;
  for (const t of alts) {
    if (got === t) return 'exact';
    const s = allowedSlips(t);
    if (s && distance(got, t) <= s) near = true;
  }
  return near ? 'near' : 'wrong';
}
function skeleton(target) {
  return String(target || '').split(/[／/]/)[0].trim().split('')
    .map((ch, i, a) => (/[A-Za-z]/.test(ch) && i > 0 && /[A-Za-z']/.test(a[i - 1]) ? '_' : ch)).join(' ');
}

/* SPOT: swap one content word of `sentence` for a word from `pool`. */
function coreOf(tok) { const m = tok.match(/^([^A-Za-z']*)([A-Za-z][A-Za-z'’-]*)([^A-Za-z']*)$/); return m ? { pre: m[1], word: m[2], post: m[3] } : null; }
function makeSpot(sentence, pool, rand) {
  rand = rand || Math.random;
  const toks = String(sentence).split(/\s+/).filter(Boolean);
  const lowerSentence = toks.map(t => (coreOf(t) || { word: '' }).word.toLowerCase());
  const slots = [];
  toks.forEach((t, i) => {
    const c = coreOf(t);
    if (c && c.word.length >= 3 && !STOP.has(c.word.toLowerCase()) && !/[A-Z]/.test(c.word.slice(1)) && (i === 0 || !/^[A-Z]/.test(c.word))) slots.push(i);
  });
  if (!slots.length) return null;
  const words = [...new Set(pool.map(w => String(w).toLowerCase()).filter(w => /^[a-z][a-z']{2,}$/.test(w) && !STOP.has(w) && !lowerSentence.includes(w)))];
  if (!words.length) return null;
  const at = slots[Math.floor(rand() * slots.length)];
  const c = coreOf(toks[at]);
  const orig = c.word.toLowerCase();
  // Prefer a decoy of similar length so the swap is not obvious by shape.
  const close = words.filter(w => w !== orig && Math.abs(w.length - orig.length) <= 3);
  const list = close.length ? close : words.filter(w => w !== orig);
  if (!list.length) return null;
  const choice = list[Math.floor(rand() * list.length)];
  const swapped = at === 0 ? choice[0].toUpperCase() + choice.slice(1) : choice;
  const out = toks.slice();
  out[at] = c.pre + swapped + c.post;
  return { tokens: out, at, original: c.word, swapped };
}
function contentWordsOf(sentence) {
  return String(sentence).split(/\s+/).map(coreOf).filter(Boolean).map(c => c.word.toLowerCase())
    .filter(w => w.length >= 3 && !STOP.has(w) && /^[a-z']+$/.test(w));
}

/* The 15-round plan: 4 CHECK, 4 TYPE, 3 SPOT, 4 HEAR, never the same format 3× in a row. */
function planRounds(rand) {
  rand = rand || Math.random;
  const kinds = ['CHECK', 'CHECK', 'CHECK', 'CHECK', 'TYPE', 'TYPE', 'TYPE', 'TYPE', 'SPOT', 'SPOT', 'SPOT', 'HEAR', 'HEAR', 'HEAR', 'HEAR'];
  for (let tries = 0; tries < 200; tries++) {
    const a = kinds.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.every((k, i) => i < 2 || !(a[i - 1] === k && a[i - 2] === k))) return a;
  }
  return ['CHECK', 'TYPE', 'SPOT', 'HEAR', 'CHECK', 'TYPE', 'SPOT', 'HEAR', 'CHECK', 'TYPE', 'SPOT', 'HEAR', 'CHECK', 'TYPE', 'HEAR'];
}

/* Gate: live week + every one of the nine played this week. */
function liveWeekSlug(curr, calendar) {
  const cw = calendar && calendar.getCurrentCurriculumWeek ? calendar.getCurrentCurriculumWeek() : null;
  return cw ? curr + '_' + cw.monthSlug.slice(0, 3) + '_w' + cw.weekNumber : '';
}
function gateFor(curr, weekSlug, calendar, scores) {
  const live = !!weekSlug && weekSlug === liveWeekSlug(curr, calendar);
  let played = 0;
  try { played = scores && scores.weeklyPlayedFor ? scores.weeklyPlayedFor(curr) : 0; } catch (_) {}
  return { live, played: Math.min(9, played), open: live && played >= 9 };
}

if (typeof window !== 'undefined') {
  window.WeekBossLogic = { BOSS_HP, damageFor, normalize, check, skeleton, makeSpot, contentWordsOf, planRounds, liveWeekSlug, gateFor, STOP };
}

/* ── Game ─────────────────────────────────────────────────────────────── */
const CFG = typeof window !== 'undefined' ? window.GAME_CONFIG : null;
const U   = typeof window !== 'undefined' ? window.GAME_UTILS : null;
if (!CFG || !U || typeof document === 'undefined') return;

U.setTitle('Week Boss');
U.unlockAudio();

const SAVE_ID = `${CFG.curriculum}-extra:week_boss`;
const PB = CFG.curriculum === 'pb';
const BOSS_IMG = CFG.sfxBase.replace(/\/assets\/audio\/$/, '') + '/assets/img/booha_ghost.webp';
const jpOf = card => (PB ? (card.hira || card.jp) : card.jp) || '';
const backToMenu = () => window.location.assign(CFG.navTarget + '?week=' + encodeURIComponent(CFG.weekParam));

const STYLE = `
.wb-wrap{max-width:660px;margin:0 auto;padding:.4rem 1rem 5rem;display:flex;flex-direction:column;gap:.8rem;box-sizing:border-box}
.wb-arena{position:relative;height:clamp(150px,22vw,210px);border-radius:24px;overflow:hidden;isolation:isolate;
  background:radial-gradient(ellipse at 50% 115%,#5a1636 0%,#2a0a20 45%,#12060f 80%);box-shadow:inset 0 0 0 2px rgba(255,111,145,.45),0 12px 30px rgba(0,0,0,.35);
  --range:clamp(60px,17vw,220px)}
.wb-arena::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 2px,transparent 2px 46px);pointer-events:none}
.wb-floor{position:absolute;left:8%;right:8%;bottom:10px;height:26px;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.55),transparent 70%)}
.wb-aura{position:absolute;left:50%;bottom:-40%;width:120%;height:120%;margin-left:-60%;border-radius:50%;opacity:0;pointer-events:none;
  background:radial-gradient(circle,rgba(255,60,90,.55),rgba(255,60,90,0) 60%);transition:opacity .6s}
.wb-arena.phase2 .wb-aura{opacity:.45}
.wb-arena.phase3 .wb-aura{opacity:.85;animation:wbAura 1.1s ease-in-out infinite}
@keyframes wbAura{50%{opacity:.5;transform:scale(1.06)}}
.wb-drift{position:absolute;left:50%;bottom:20px;width:0;animation:wbDrift 7s ease-in-out infinite}
.wb-bob{animation:wbBob 1.6s ease-in-out infinite}
.wb-arena.phase2 .wb-drift{animation-duration:4.4s}.wb-arena.phase2 .wb-bob{animation-duration:1.1s}
.wb-arena.phase3 .wb-drift{animation-duration:2.7s}.wb-arena.phase3 .wb-bob{animation-duration:.75s}
.wb-arena.ko .wb-drift,.wb-arena.ko .wb-bob{animation-play-state:paused}
@keyframes wbDrift{0%,100%{transform:translateX(0)}25%{transform:translateX(calc(var(--range) * -1))}75%{transform:translateX(var(--range))}}
@keyframes wbBob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-12px) rotate(3deg)}}
.wb-foe{--foe:clamp(92px,12.5vw,140px);position:relative;width:var(--foe);height:var(--foe);margin-left:calc(var(--foe) / -2)}
.wb-face{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 8px 14px rgba(0,0,0,.6)) hue-rotate(-40deg) saturate(1.4)}
.wb-arena.phase2 .wb-face{filter:drop-shadow(0 0 16px rgba(255,60,90,.7)) hue-rotate(-55deg) saturate(1.7)}
.wb-arena.phase3 .wb-face{filter:drop-shadow(0 0 22px rgba(255,40,70,.95)) hue-rotate(-70deg) saturate(2.1)}
.wb-flash{position:absolute;inset:8%;border-radius:50%;background:radial-gradient(circle,#fff 0%,rgba(255,255,255,0) 70%);opacity:0;pointer-events:none}
.wb-foe.enter{animation:wbEnter .9s cubic-bezier(.3,1.5,.5,1) both}
.wb-foe.hurt{animation:wbHurt .45s ease}
.wb-foe.hurt .wb-flash{animation:wbFlash .35s ease}
.wb-foe.attack{animation:wbAttack .65s cubic-bezier(.3,1.4,.5,1)}
.wb-foe.ko{animation:wbKO 1.2s cubic-bezier(.4,0,.6,1) forwards}
@keyframes wbEnter{0%{opacity:0;transform:translateY(-240px) scale(.5)}60%{opacity:1;transform:translateY(10px) scale(1.12)}100%{transform:none}}
@keyframes wbHurt{20%{transform:translateX(-14px) rotate(-10deg) scale(.9,1.05)}50%{transform:translateX(10px) rotate(6deg) scale(1.05,.95)}80%{transform:translateX(-4px)}}
@keyframes wbFlash{0%{opacity:.95}100%{opacity:0}}
@keyframes wbAttack{0%{transform:none}35%{transform:translateY(26px) scale(1.45)}55%{transform:translateY(20px) scale(1.38) rotate(4deg)}100%{transform:none}}
@keyframes wbKO{0%{transform:none;opacity:1}40%{transform:translateY(-50px) rotate(260deg) scale(1.1);opacity:1}100%{transform:translateY(40px) rotate(560deg) scale(.55);opacity:.35}}
.wb-arena.shake{animation:wbShake .42s ease}
@keyframes wbShake{15%{transform:translate(-8px,3px)}35%{transform:translate(7px,-4px)}55%{transform:translate(-5px,2px)}75%{transform:translate(3px,-1px)}}
.wb-redflash{position:absolute;inset:0;background:radial-gradient(ellipse,rgba(255,40,60,0) 30%,rgba(255,40,60,.55));opacity:0;pointer-events:none}
.wb-redflash.on{animation:wbRed .6s ease}
@keyframes wbRed{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
.wb-taunt{position:absolute;top:14px;left:50%;max-width:80%;padding:8px 14px;border-radius:16px;background:#fff;color:#3a0a1a;font:900 clamp(13px,2.4vw,16px)/1.3 var(--game-font-body);
  text-align:center;opacity:0;transform:translate(-50%,-6px) scale(.9);pointer-events:none;box-shadow:0 6px 16px rgba(0,0,0,.35)}
.wb-taunt.show{animation:wbTaunt 1.5s ease forwards}
@keyframes wbTaunt{0%{opacity:0;transform:translate(-50%,-6px) scale(.9)}12%{opacity:1;transform:translate(-50%,0) scale(1)}80%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-4px) scale(.96)}}
.wb-banner{position:absolute;left:50%;top:50%;padding:10px 22px;border-radius:18px;white-space:nowrap;text-align:center;pointer-events:none;opacity:0;
  transform:translate(-50%,-50%) scale(.8);background:linear-gradient(135deg,#ffe3ea,#ff6f91 55%,#c23a5c);color:#2a0610;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.wb-banner b{display:block;font-family:var(--game-font-title);font-size:clamp(22px,4.6vw,36px);line-height:1.05}
.wb-banner span{display:block;font-weight:900;font-size:clamp(12px,2.4vw,16px);letter-spacing:.06em}
.wb-banner.show{animation:wbBanner 1.6s cubic-bezier(.2,.9,.25,1) forwards}
.wb-banner.stay{animation:wbBannerIn .6s cubic-bezier(.2,.9,.25,1) forwards}
.wb-banner.gold{background:linear-gradient(135deg,#fff1c2,#ffc94a 55%,#ff9a3c)}
@keyframes wbBanner{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}25%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(.96)}}
@keyframes wbBannerIn{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}60%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.wb-dmg{position:absolute;left:50%;top:30%;font:900 clamp(20px,4vw,30px)/1 var(--game-font-title);color:#fff;opacity:0;pointer-events:none;text-shadow:0 3px 0 #c23a5c,0 0 14px rgba(255,111,145,.8)}
.wb-dmg.crit{color:#ffe39a;font-size:clamp(26px,5.4vw,40px);text-shadow:0 3px 0 #b8461c,0 0 18px rgba(255,201,74,.9)}
.wb-dmg.show{animation:wbDmg .9s ease forwards}
@keyframes wbDmg{0%{opacity:0;transform:translate(-50%,10px) scale(.7)}20%{opacity:1;transform:translate(-50%,0) scale(1.15)}100%{opacity:0;transform:translate(-50%,-34px) scale(1)}}
.wb-hpwrap{display:flex;flex-direction:column;gap:6px;padding:0 4px}
.wb-hprow{display:flex;justify-content:space-between;font-size:12px;font-weight:900;letter-spacing:.08em;color:var(--game-ink)}
.wb-hp{position:relative;height:16px;border-radius:999px;background:var(--game-meter-bg);overflow:hidden;box-shadow:inset 0 0 0 1.5px rgba(255,111,145,.45)}
.wb-hp i{display:block;height:100%;width:100%;border-radius:999px;background:linear-gradient(90deg,#f4a6c8,#ff6f91,#ff3b5c);transform-origin:left center;transition:transform .35s ease}
.wb-hp em{position:absolute;top:0;bottom:0;width:2px;background:rgba(0,0,0,.35)}
@media (max-height:820px){.wb-arena{height:clamp(130px,17vw,170px)}.wb-foe{--foe:clamp(80px,10vw,112px)}.wb-wrap{gap:.6rem}}
html[data-motion="reduced"] .wb-drift,html[data-motion="reduced"] .wb-bob,html[data-motion="reduced"] .wb-arena.phase3 .wb-aura{animation:none}
.wb-hud{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.wb-pill{padding:5px 14px;border-radius:999px;background:var(--game-pill-bg);border:1.5px solid var(--game-pill-border);color:var(--game-pill-text);font-size:clamp(12px,2vw,14px);font-weight:900;font-variant-numeric:tabular-nums}
.wb-card{border-radius:24px;padding:1.2rem 1rem;background:var(--game-surface);border:2px solid var(--game-border);box-shadow:0 6px 26px rgba(0,0,0,.22);display:flex;flex-direction:column;gap:.8rem;align-items:center;text-align:center}
.wb-kind{font-size:11px;font-weight:900;letter-spacing:.12em;padding:4px 12px;border-radius:999px;background:color-mix(in srgb,var(--game-primary) 18%,transparent);color:var(--game-ink)}
.wb-ask{font-weight:900;font-size:clamp(14px,2.6vw,17px);color:var(--game-muted);margin:0;display:flex;flex-direction:column;gap:4px;line-height:1.45}
.wb-ask .jp{font-family:var(--game-font-jp);font-size:clamp(16px,3vw,20px);color:var(--game-ink)}
.wb-en{font-family:var(--game-font-title);font-size:clamp(20px,4.2vw,28px);line-height:1.3;color:var(--game-ink);margin:0}
.wb-jp{font-family:var(--game-font-jp);font-weight:800;font-size:clamp(15px,3vw,20px);line-height:1.5;color:var(--game-ink);margin:0}
.wb-skel{font-family:ui-monospace,Menlo,monospace;font-size:clamp(15px,3vw,19px);letter-spacing:.06em;color:var(--game-amber);margin:0;word-break:break-word}
.wb-opts{width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.wb-opts.one{grid-template-columns:1fr}
.wb-opt{min-height:54px;padding:12px 10px;border-radius:16px;border:2px solid var(--game-border);background:var(--game-answer-bg);color:var(--game-answer-text);font:800 clamp(14px,2.6vw,17px) var(--game-font-body);cursor:pointer;line-height:1.3}
.wb-opt.ok{border-color:#22c55e;background:rgba(34,197,94,.16)}
.wb-opt.bad{border-color:#ef4444;background:rgba(239,68,68,.14)}
.wb-opt:disabled{cursor:default}
.wb-words{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.wb-word{min-height:46px;min-width:44px;padding:8px 12px;border-radius:12px;border:2px solid var(--game-border);background:var(--game-answer-bg);color:var(--game-answer-text);font:800 clamp(15px,3vw,19px) var(--game-font-body);cursor:pointer}
.wb-word.ok{border-color:#22c55e;background:rgba(34,197,94,.16)}.wb-word.bad{border-color:#ef4444;background:rgba(239,68,68,.14)}
.wb-play{width:80px;height:80px;border-radius:50%;border:none;cursor:pointer;font-size:28px;color:#2b1a05;background:radial-gradient(circle at 35% 30%,#ffe39a,#ffc94a 55%,#d48a1a);box-shadow:0 5px 0 rgba(140,80,0,.45)}
.wb-play.playing{background:radial-gradient(circle at 35% 30%,#a8f0c8,#22c55e 60%,#16a34a)}
.wb-row{width:100%;display:flex;gap:10px}
.wb-input{flex:1;min-width:0;font:800 18px var(--game-font-body);padding:14px 16px;border-radius:16px;border:2px solid var(--game-border);background:var(--game-answer-bg);color:var(--game-answer-text);outline:none}
.wb-input:focus{border-color:var(--game-primary)}
.wb-go{min-width:92px;min-height:54px;border:none;border-radius:16px;cursor:pointer;font:900 17px var(--game-font-body);color:#0b0614;background:linear-gradient(135deg,var(--game-primary),var(--game-secondary))}
.wb-fb{min-height:1.5em;margin:0;font-weight:900;font-size:clamp(14px,2.6vw,17px)}
.wb-fb.ok{color:#22c55e}.wb-fb.near{color:var(--game-amber)}.wb-fb.bad{color:#ef4444}
.wb-lock{text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center;padding:2rem 1rem}
.wb-lock h2{font-family:var(--game-font-title);margin:0;color:var(--game-ink)}
.wb-lock p{margin:0;font-weight:800;color:var(--game-muted);line-height:1.6}
.wb-lock .wb-go{padding:0 22px}

/* ══ PALETTE POP (2026-11-13): the flashiest of the games ══════════════
   Embers rise in the arena (faster as the boss gets angry), the HP bar
   leaves a lagging "damage ghost", every choice wears a palette ring, and
   answers fire palette orbs at the boss (js/game-pop.js). TYPE rounds use
   the shared on-screen keyboard (js/booha-keys.js), like Echo. Keyframes
   stay transform/opacity. */
.wb-ember{position:absolute;bottom:-8px;width:7px;height:7px;border-radius:50%;background:var(--c);opacity:0;pointer-events:none;
  box-shadow:0 0 10px 2px var(--c);animation:wbEmber var(--s,4s) linear var(--d,0s) infinite}
.wb-arena.phase2 .wb-ember{animation-duration:calc(var(--s,4s) * .75)}
.wb-arena.phase3 .wb-ember{animation-duration:calc(var(--s,4s) * .5)}
.wb-arena.ko .wb-ember{animation-duration:calc(var(--s,4s) * .4)}
@keyframes wbEmber{0%{opacity:0;transform:translate(0,0) scale(.5)}15%{opacity:.95}70%{opacity:.7}100%{opacity:0;transform:translate(var(--sx,0px),-210px) scale(1.1)}}
html[data-motion="reduced"] .wb-ember,html[data-power]:not([data-power="full"]) .wb-ember{display:none}
@media (prefers-reduced-motion:reduce){.wb-ember{display:none}}
.wb-hp i{position:relative;z-index:1}
.wb-hpghost{position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:999px;background:#fff3b0;opacity:.9;transform-origin:left center;transition:transform .55s ease .38s}
html[data-skin="v2"][data-curriculum] :is(.wb-opt, .wb-word).wb-pal[data-c]:not(.ok):not(.bad){
  box-shadow:inset 0 0 0 3px var(--c-ring,var(--c)),0 5px 0 color-mix(in srgb,var(--c) 55%,#000),0 10px 18px rgba(0,0,0,.24);
}
/* TYPE: letter tiles in a charged box, the keyboard docked below */
.wb-typed{flex:1;min-width:0;min-height:58px;display:flex;align-items:center;flex-wrap:wrap;gap:5px;padding:10px 14px;border-radius:16px;box-sizing:border-box;
  border:2px solid var(--game-primary);background:var(--game-answer-bg);color:var(--game-answer-text);text-align:left;-webkit-user-select:none;user-select:none;
  transition:box-shadow .2s}
.wb-typed.has-text{box-shadow:0 0 0 3px color-mix(in srgb,var(--game-primary) 35%,transparent),0 0 22px color-mix(in srgb,var(--game-primary) 45%,transparent)}
.wb-typed.ok{border-color:#22c55e}.wb-typed.bad{border-color:#ef4444}.wb-typed.near{border-color:var(--game-amber)}
.wb-tiles{display:inline-flex;flex-wrap:wrap;gap:5px;align-items:center}
.wb-tile{position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:1.45em;height:1.8em;padding:0 .15em;border-radius:10px;box-sizing:border-box;
  background:var(--card-face,#fff);color:var(--card-ink,#2b1a05);box-shadow:inset 0 0 0 2.5px var(--c-ring,var(--c)),0 3px 0 color-mix(in srgb,var(--c) 55%,#000);font:900 22px/1 var(--game-font-body)}
.wb-tile b{position:relative;z-index:1;font:inherit}
.wb-tile::before{content:'';position:absolute;inset:0;border-radius:inherit;background:#22c55e;opacity:0}
.wb-gap{display:inline-block;width:.5em}
.wb-tile.is-new{animation:wbTileIn .26s cubic-bezier(.3,1.6,.5,1) both}
@keyframes wbTileIn{from{opacity:0;transform:scale(.3) translateY(12px)}to{opacity:1;transform:none}}
.wb-typed.is-right .wb-tile{animation:wbFlip .5s ease both}
.wb-typed.is-right .wb-tile::before{animation:wbGreen .5s ease both}
@keyframes wbFlip{0%{transform:none}50%{transform:scale(1.25) translateY(-6px)}100%{transform:none}}
@keyframes wbGreen{0%,40%{opacity:0}50%,100%{opacity:1}}
.wb-typed.is-right .wb-tile b{color:#fff}
.wb-tile.is-bad::before{background:#ef4444;opacity:.9}
.wb-tile.is-bad b{color:#fff}
.wb-tile.is-bad{animation:wbWobble .45s ease both}
@keyframes wbWobble{20%{transform:rotate(-9deg)}45%{transform:rotate(8deg) translateY(-3px)}70%{transform:rotate(-4deg)}100%{transform:none}}
.wb-caret{display:inline-block;width:2px;height:1.2em;border-radius:1px;background:var(--game-primary);animation:wbCaret 1s steps(1) infinite}
@keyframes wbCaret{50%{opacity:0}}
.wb-typed.is-done .wb-caret{display:none}
.wb-ph{color:var(--game-muted);font-weight:700;font-size:16px}
.wb-ph[hidden]{display:none}
#wb-keys-dock{position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;justify-content:center;box-sizing:border-box;
  padding:0 max(8px,env(safe-area-inset-right,0px)) max(8px,env(safe-area-inset-bottom,0px)) max(8px,env(safe-area-inset-left,0px));
  pointer-events:none;opacity:0;transform:translateY(110%);transition:transform .28s ease-out,opacity .2s ease-out}
#wb-keys-dock.is-open{opacity:1;transform:none}
#wb-keys-dock[hidden]{display:none}
#wb-keys-dock .wb-keys{width:min(800px,100%);pointer-events:auto;
  --kc:var(--game-primary);--kd:var(--game-border);--cap:var(--game-surface);--cap2:var(--game-surface-2,var(--game-surface));
  --kt:var(--game-ink);--kt2:var(--game-muted);--kok:#0b0614;--kbg:var(--game-bg,#fff);--kring:var(--game-border);--kshadow:rgba(0,0,0,.28);
  box-shadow:inset 0 0 0 1.5px var(--kring),0 -6px 22px rgba(0,0,0,.22)}
#wb-keys-dock .bk-key{font-family:var(--game-font-body);border-radius:14px;box-shadow:inset 0 0 0 2px var(--kd),0 5px 0 var(--kshadow);transition:transform .2s cubic-bezier(.3,1.7,.5,1)}
#wb-keys-dock .bk-key.is-down{transform:translateY(4px) scale(.92);transition:transform .05s ease-out}
#wb-keys-dock .bk-key.is-ok{background:linear-gradient(135deg,#ff6f91,#ffc94a);color:#2a0610}
#wb-keys-dock .bk-pop{font-family:var(--game-font-title,var(--game-font-body))}
@media (prefers-reduced-motion:reduce){#wb-keys-dock{transform:none}.wb-caret,.wb-tile,.wb-tile::before{animation:none !important}.wb-typed.is-right .wb-tile::before{opacity:1}}
html[data-motion="reduced"] #wb-keys-dock,html[data-power]:not([data-power="full"]) #wb-keys-dock{transform:none}
html[data-motion="reduced"] .wb-tile,html[data-motion="reduced"] .wb-tile::before,html[data-motion="reduced"] .wb-caret{animation:none !important}
html[data-motion="reduced"] .wb-typed.is-right .wb-tile::before{opacity:1}
/* The boss stays in view: arena + HP bar pinned at the top while the round
   scrolls under it, and smaller while the keyboard is up. */
.wb-stage{position:sticky;top:0;z-index:5;display:flex;flex-direction:column;gap:.55rem;margin:0 -1rem;padding:.35rem 1rem .6rem;
  border-radius:0 0 24px 24px;background:color-mix(in srgb,var(--game-bg,#0b0614) 95%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.wb-arena{transition:height .3s ease}
.wb-stage.compact .wb-arena{height:clamp(96px,13vw,124px)}
.wb-stage.compact .wb-foe{--foe:clamp(70px,8.5vw,92px)}
.wb-stage.compact .wb-hpwrap{gap:3px}
`;

/* ── Gate ── */
// Wait for the save to boot (identity + weekly reset) so last week's plays
// can never open this week's boss. Falls back after 4 s.
if (!window.BOOHA_READY) {
  await new Promise(r => {
    const t = setTimeout(r, 4000);
    document.addEventListener('booha:ready', () => { clearTimeout(t); r(); }, { once: true });
  });
}
const BA = window.BoohaAdventure;
const gate = gateFor(CFG.curriculum, CFG.weekParam, window.CALENDAR, BA && BA.scores);
if (!gate.open) {
  const left = 9 - gate.played;
  U.mount(`<style>${STYLE}</style>
<div class="wb-wrap"><div class="wb-card wb-lock">
  <img class="wb-face" src="${BOSS_IMG}" alt="">
  <h2>The Week Boss is waiting</h2>
  <p>${gate.live
    ? `Play all 9 games this week to open it. ${left} to go!<br>9つの ゲームを ぜんぶ あそぶと ひらくよ。あと ${left}つ！`
    : `The boss only appears on this week’s page.<br>ボスは こんしゅうの ページだけ！`}</p>
  <button type="button" class="wb-go" id="wb-lock-back">Back · もどる</button>
</div></div>`);
  document.getElementById('wb-lock-back').addEventListener('click', backToMenu);
  return;
}

const run = U.createRun({ total: 15, recoverPoints: 50 });   // only TYPE rounds can recover
const voiceGate = U.createAudioGate({ cooldownMs: 300, timeoutMs: 9000 });
await Promise.all([
  U.loadSFX('ding', CFG.sfxBase + 'ding.mp3'),
  U.loadSFX('fart', CFG.sfxBase + 'fart.mp3'),
]);

const VOCAB = CFG.cards.slice(0, 15);
const SENT = ((CFG.alsoCards && CFG.alsoCards.sentences) || []).slice(0, 15);
const QUES = ((CFG.alsoCards && CFG.alsoCards.questions) || []).slice(0, 15);
const audioFor = kind => CFG.audioBase.replace(/\/vocab\/$/, '/' + kind + '/');
// Sentences are required (MATCH and SPOT); without questions the HEAR rounds
// fall back to MATCH. A missing deck shows a friendly retry screen.
if (SENT.length < 4) {
  U.mount(`<style>${STYLE}</style>
<div class="wb-wrap"><div class="wb-card wb-lock">
  <img class="wb-face" src="${BOSS_IMG}" alt="">
  <h2>The boss couldn’t load this week’s sentences</h2>
  <p>Check your internet connection, then try again.<br>インターネットを たしかめて、もう いちど ためしてね。</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
    <button type="button" class="wb-go" id="wb-retry">Try again · もう いちど</button>
    <button type="button" class="wb-go" id="wb-lock-back" style="background:var(--game-surface-2);color:var(--game-ink)">Back · もどる</button>
  </div>
</div></div>`);
  document.getElementById('wb-retry').addEventListener('click', () => window.location.reload());
  document.getElementById('wb-lock-back').addEventListener('click', backToMenu);
  return;
}
const POOL = [...new Set([].concat(...SENT.map(s => contentWordsOf(s.en)), VOCAB.filter(v => !/\s/.test(v.en)).map(v => v.en)))];

U.mount(`
<style>${STYLE}</style>
<div class="wb-wrap">
  <div class="wb-stage" id="wb-stage">
  <div class="wb-arena" id="wb-arena" aria-hidden="true">
    <div class="wb-aura"></div>
    ${Array.from({ length: 12 }, (_, i) => `<span class="wb-ember" style="left:${(4 + i * 8 + Math.random() * 5).toFixed(1)}%;--c:var(--pal-${(i % 12) + 1},#ff6f91);--s:${(3.2 + Math.random() * 2.4).toFixed(2)}s;--d:${(-Math.random() * 5).toFixed(2)}s;--sx:${(Math.random() * 60 - 30).toFixed(0)}px"></span>`).join('')}
    <div class="wb-floor"></div>
    <div class="wb-drift"><div class="wb-bob"><div class="wb-foe" id="wb-foe">
      <img class="wb-face" id="wb-face" src="${BOSS_IMG}" alt="">
      <span class="wb-flash"></span>
    </div></div></div>
    <div class="wb-taunt" id="wb-taunt"></div>
    <span class="wb-dmg" id="wb-dmg"></span>
    <div class="wb-redflash" id="wb-redflash"></div>
    <div class="wb-banner" id="wb-banner"></div>
  </div>
  <div class="wb-hpwrap">
    <div class="wb-hprow"><span>BOSS BOOHA · ボス</span><span id="wb-hpnum">100%</span></div>
    <div class="wb-hp" role="progressbar" aria-label="Boss health" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" id="wb-hpbar"><b class="wb-hpghost" id="wb-hpghost"></b><i id="wb-hpfill"></i><em style="left:33.3%"></em><em style="left:66.6%"></em></div>
  </div>
  </div>
  <div class="wb-hud">
    <span class="wb-pill">Round <b id="wb-num">1</b> / 15</span>
    <span class="wb-pill">Score <b id="wb-score">0</b> / 15</span>
  </div>
  <div class="wb-card" id="wb-card"></div>
  <button type="button" id="wb-replay" hidden>もう一度</button>
  <button type="button" id="wb-back" hidden>メニューへ</button>
</div>`);

const $ = id => document.getElementById(id);
const cardEl = $('wb-card'), face = $('wb-face'), hpFill = $('wb-hpfill'), hpNum = $('wb-hpnum'), hpBar = $('wb-hpbar'), dmgEl = $('wb-dmg');
const arena = $('wb-arena'), foe = $('wb-foe'), tauntEl = $('wb-taunt'), bannerEl = $('wb-banner'), redEl = $('wb-redflash');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hpGhost = $('wb-hpghost');

/* Palette Pop (js/game-pop.js). A no-op stand-in keeps the game playable
   if that file ever fails to load (orbs then land at once). */
const POP = window.BoohaPop || new Proxy({}, { get: (_, k) => (k === 'color' ? () => '' : k === 'canFlash' ? () => true
  : k === 'shoot' ? (a, b, o) => { if (o && o.onHit) o.onHit(); } : k === 'strikeBack' ? (a, b, f) => { if (f) f(); } : () => {}) });
POP.init({ pill: '#wb-score' });
let lastSrc = null;   // the element the last answer came from: the orb launches here, the boss strikes back here
// Paint a round's choices with fresh palette colours.
function paintChoices(sel) {
  const els = Array.from(cardEl.querySelectorAll(sel));
  POP.newRound(els.map((_, i) => `wb${idx}-${i}`));
  els.forEach((el, i) => { el.dataset.popKey = `wb${idx}-${i}`; el.dataset.c = '1'; el.classList.add('wb-pal'); POP.paint(el, el.dataset.popKey); });
}

/* ── On-screen keyboard for TYPE rounds (shared js/booha-keys.js, as in Echo) ── */
let dock = null, keys = null, typing = null;   // typing: the TYPE round that owns the keys now
function keyClick(k) {
  try {
    const c = window.BoohaSFX && window.BoohaSFX.context && window.BoohaSFX.context();
    if (!c || c.state !== 'running') return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'triangle';
    o.frequency.setValueAtTime(k === 'back' ? 520 : 900 + Math.random() * 220, t);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.06);
  } catch (_) {}
}
function measureKeys() {
  const wrap = document.querySelector('.wb-wrap');
  if (!dock || !wrap) return;
  wrap.style.paddingBottom = dock.classList.contains('is-open') ? `${dock.offsetHeight + 16}px` : '';
}
function showKeys() {
  if (!window.BoohaKeys) return false;
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'wb-keys-dock'; dock.hidden = true;
    keys = window.BoohaKeys.create({
      className: 'wb-keys', marks: ["'", '-'], okHTML: 'Hit!<small lang="ja">こうげき</small>',
      label: 'Keyboard', repeatBack: true, bubble: true, sound: keyClick,
      onKey: k => (typing ? typing(k) : false),
    });
    dock.appendChild(keys.el);
    document.body.appendChild(dock);
    window.addEventListener('resize', measureKeys, { passive: true });
  }
  dock.hidden = false; void dock.offsetWidth; dock.classList.add('is-open');
  $('wb-stage').classList.add('compact');
  measureKeys();
  // Keep the answer box above the keys (iPad landscape).
  setTimeout(() => {
    const box = $('wb-typed'); if (!box || !dock.classList.contains('is-open')) return;
    const r = box.getBoundingClientRect(), stageBottom = $('wb-stage').getBoundingClientRect().bottom;
    const over = r.bottom + 60 - (window.innerHeight - dock.offsetHeight);
    // Scroll up to keep the answer above the keys, but never past the Japanese prompt under the pinned boss.
    const jp = cardEl.querySelector('.wb-jp'), room = jp ? jp.getBoundingClientRect().top - stageBottom - 8 : over;
    if (over > 0) window.scrollBy(0, Math.min(over, Math.max(0, room)));
  }, 320);
  return true;
}
function hideKeys() {
  typing = null;
  if (!dock) return;
  dock.classList.remove('is-open');
  $('wb-stage').classList.remove('compact');
  measureKeys();
  setTimeout(() => { if (dock && !dock.classList.contains('is-open')) dock.hidden = true; }, 300);
}
// A physical keyboard (teacher Mac, iPad keyboard case) types the same keys.
document.addEventListener('keydown', e => {
  if (!keys || !typing || !dock || !dock.classList.contains('is-open')) return;
  const k = keys.keyFromEvent(e);
  if (k === null) return;
  e.preventDefault();
  keys.tap(k);
});

let plan, rounds, idx, score, hp, crits, missedItems, busy, token = 0;

function buildRounds() {
  plan = planRounds();
  const v = U.shuffle(VOCAB.slice()), s = U.shuffle(SENT.slice()), q = U.shuffle(QUES.slice());
  let vi = 0, si = 0, qi = 0;
  return plan.map(kind => {
    if (kind === 'TYPE') return { kind, card: v[vi++ % v.length] };
    if (kind === 'HEAR' && q.length >= 4) {
      const card = q[qi++ % q.length];
      const opts = U.shuffle([card, ...U.shuffle(QUES.filter(x => x !== card)).slice(0, 3)]);
      return { kind, card, opts };
    }
    if (kind === 'SPOT') {
      const card = s[si++ % s.length];
      const spot = makeSpot(card.en, POOL.filter(w => !contentWordsOf(card.en).includes(w)));
      if (spot) return { kind, card, spot };
    }
    // CHECK (also the fallback when HEAR/SPOT cannot be built)
    const card = s[si++ % s.length];
    const truth = Math.random() < 0.5;
    const other = U.shuffle(SENT.filter(x => x !== card && x.jp !== card.jp))[0];
    return { kind: 'CHECK', card, truth: truth || !other, shownJp: truth || !other ? jpOf(card) : jpOf(other) };
  });
}

function paintHP() {
  const pct = Math.max(0, hp) / BOSS_HP;
  hpFill.style.transform = `scaleX(${pct})`;
  if (hpGhost) hpGhost.style.transform = `scaleX(${pct})`;   // the ghost lags behind: you see the chunk you knocked off
  hpNum.textContent = hp <= 0 ? 'BEATEN!' : Math.round(pct * 100) + '%';
  hpBar.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
}
/* ── Arena effects (transform/opacity only) ── */
const reducedFx = () => { const m = window.BoohaMotion; return !!(m && m.reduced && m.reduced()); };
function replay(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function banner(big, small, opts = {}) {
  bannerEl.className = 'wb-banner' + (opts.gold ? ' gold' : '');
  bannerEl.innerHTML = `<b>${esc(big)}</b><span>${esc(small)}</span>`;
  replay(bannerEl, opts.stay ? 'stay' : 'show');
}
const TAUNTS = [
  ['Too slow!', 'おそい！'], ['Hahaha!', 'あはは！'], ['Is that all?', 'それだけ？'],
  ['Try again!', 'まだまだ！'], ['Missed me!', 'はずれ〜！'], ['Boo-hoo-ha!', 'ブーハハ！'],
];
let tauntIdx = 0;
function taunt() {
  const t = TAUNTS[tauntIdx++ % TAUNTS.length];
  tauntEl.textContent = PB ? `${t[1]}  ${t[0]}` : `${t[0]}  ${t[1]}`;
  replay(tauntEl, 'show');
}

/* Boss sounds: short synth cues on the shared Web Audio context. */
function bossCtx() { try { const c = window.BoohaSFX && window.BoohaSFX.context(); return c && c.state === 'running' ? c : null; } catch (_) { return null; } }
function bossSound(kind) {
  const c = bossCtx(); if (!c) return;
  const t = c.currentTime + 0.01, out = c.createGain(); out.gain.value = 0.9; out.connect(c.destination);
  const tone = (type, f, at, dur, peak, toF) => {
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, at);
    if (toF) o.frequency.exponentialRampToValueAtTime(toF, at + dur * 0.8);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(out); o.start(at); o.stop(at + dur + 0.02);
  };
  const noise = (at, dur, peak, freq, q, sweepTo) => {
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.setValueAtTime(freq, at); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
    g.gain.value = peak; src.connect(f); f.connect(g); g.connect(out); src.start(at);
  };
  if (kind === 'hit' || kind === 'crit') {           // punch: thump + snap
    tone('sine', 170, t, 0.22, 0.5, 55); noise(t, 0.09, 0.35, 1400, 0.8);
    if (kind === 'crit') { tone('square', 90, t + 0.04, 0.18, 0.12, 45); noise(t + 0.05, 0.16, 0.25, 3200, 1.2); }
  } else if (kind === 'attack') {                    // whoosh + growl
    noise(t, 0.32, 0.35, 400, 0.9, 2600); tone('sawtooth', 95, t + 0.08, 0.38, 0.09, 70);
  } else if (kind === 'phase') {                     // rumble
    tone('sawtooth', 55, t, 0.7, 0.14, 48); tone('sine', 41, t, 0.8, 0.3); noise(t, 0.6, 0.18, 120, 0.7);
  } else if (kind === 'ko') {                        // boom + falling tones + fanfare
    tone('sine', 140, t, 0.6, 0.6, 35); noise(t, 0.5, 0.4, 300, 0.6);
    [784, 659, 523].forEach((f, i) => tone('triangle', f, t + 0.25 + i * 0.09, 0.22, 0.12));
    [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, t + 0.7 + i * 0.1, 0.35, 0.14));
  } else if (kind === 'intro') {                     // drop-in thud
    tone('sine', 120, t + 0.5, 0.4, 0.55, 40); noise(t + 0.5, 0.25, 0.3, 500, 0.7);
  }
}

let phase = 1;
function setPhase(n) {
  if (n <= phase) return;
  phase = n;
  arena.classList.toggle('phase2', n === 2);
  arena.classList.toggle('phase3', n === 3);
  bossSound('phase');
  POP.surge(arena, n === 3 ? '#ff2e55' : '#ff8a3c');   // Palette Pop: the arena flares up
  setTimeout(() => {
    if (n === 2) banner('BOSS IS ANGRY!', 'ボスが おこった！');
    if (n === 3) banner('LAST STAND!', 'さいごの ちから！');
  }, 450);
}
function knockout() {
  arena.classList.remove('phase2', 'phase3');
  arena.classList.add('ko');
  replay(foe, 'ko');
  bossSound('ko');
  replay(arena, 'shake');
  setTimeout(() => {
    banner('BOSS DEFEATED!', 'ボスを たおした！ ♛', { gold: true, stay: true });
    U.confetti(arena, 60);
    POP.round(5, arena, 5);            // Palette Pop: the biggest finale…
    POP.fireworks(arena, 7, 230);      // …and a volley of fireworks over the arena
  }, 650);
}
function bossAttack() {
  if (hp <= 0) return;
  replay(foe, 'attack');
  replay(redEl, 'on');
  bossSound('attack');
  taunt();
  POP.strikeBack(foe, lastSrc);   // Palette Pop: the boss spits a dark orb back; your answer crumbles where it lands
}

function strike(kind, combo) {
  const d = damageFor(kind, combo);
  if (!d || hp <= 0) return;
  const crit = kind === 'hit' && combo >= 3;
  if (crit) crits++;
  hp = Math.max(0, hp - d);
  // Palette Pop: the answer fires an orb at the boss; the boss reacts when it lands.
  const my = token, col = lastSrc && lastSrc.dataset && lastSrc.dataset.popKey ? POP.color(lastSrc.dataset.popKey) : null;
  POP.shoot(lastSrc, foe, { big: crit, size: crit ? 15 : 11, col: col || undefined, onHit: () => { if (my === token) landHit(d, crit); } });
}
function landHit(d, crit) {
  paintHP();
  dmgEl.className = 'wb-dmg' + (crit ? ' crit' : '');
  dmgEl.textContent = (crit ? 'CRITICAL! ' : '') + '−' + d;
  void dmgEl.offsetWidth; dmgEl.classList.add('show');
  replay(foe, 'hurt');
  bossSound(crit ? 'crit' : 'hit');
  if (crit) replay(arena, 'shake');
  if (hp <= 0) { knockout(); return; }
  const left = hp / BOSS_HP;
  if (left <= 1 / 3) setPhase(3); else if (left <= 2 / 3) setPhase(2);
}

/* Never cut a clip off: the next round waits for whatever is still playing
   (the typed word said back, or the HEAR question) to finish, plus a beat.
   A clip that never reports its end gives up after 6 s. */
let clipBusy = false, clipWaiters = [];
function clipFinished() { clipBusy = false; const w = clipWaiters; clipWaiters = []; w.forEach(f => f()); }
function afterVoice(minMs, fn) {
  const my = token;
  setTimeout(() => {
    if (my !== token) return;
    if (!clipBusy) { fn(); return; }
    let done = false;
    const go = () => { if (done) return; done = true; setTimeout(() => { if (my === token) fn(); }, 250); };
    clipWaiters.push(go);
    setTimeout(go, 6000);
  }, minMs);
}

function stopAudio() {
  voiceGate.stop();
  clipBusy = false; clipWaiters = [];
  const p = cardEl.querySelector('.wb-play');
  if (p) { p.classList.remove('playing'); POP.speakerWait(p); }
}
function playClip(url, btn, onDone) {
  const my = token;
  const a = new Audio(url);
  a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', '');
  if (btn) btn.classList.add('playing');
  const spkId = btn ? POP.speaker(btn) : 0;   // Palette Pop: notes + sound waves, silent while the voice plays
  const end = () => {
    if (my === token) clipFinished();   // a round waiting on this clip may go on now
    if (my !== token) return;          // a newer round owns the audio now
    if (btn) { btn.classList.remove('playing'); POP.speakerEnd(btn, spkId); }
    if (onDone) onDone();
  };
  clipBusy = true;
  if (!voiceGate.play(a, { replace: true, ignoreCooldown: true, onEnd: end })) clipFinished();
}

// Review rows play audio from the vocab folder, so sentence and question
// cards carry a path relative to it.
function addMissed(card, type) {
  if (!card || missedItems.some(m => m.src === card)) return;
  missedItems.push(Object.assign({}, card, { src: card, mp3: type && type !== 'vocab' && card.mp3 ? `../${type}/${card.mp3}` : card.mp3 }));
}
const typeOf = kind => (kind === 'TYPE' ? 'vocab' : kind === 'HEAR' ? 'questions' : 'sentences');

function resolve(kind, card, src) {
  // kind: 'hit' | 'recover' | 'miss'; src: the answer the orb flies from (or the boss strikes back at)
  busy = true;
  lastSrc = src || null;
  if (kind === 'hit') { const r = run.hit(); score += 1; U.playSFX('ding'); strike('hit', r ? r.combo : 0);
    if (src && src.dataset.popKey) POP.correct(src, src.dataset.popKey, r ? r.combo : 1); }   // Palette Pop: burst + gems to the score
  else if (kind === 'recover') { run.recover(); score += 0.5; U.playSFX('ding'); strike('recover', 0); }
  else { run.miss(); addMissed(card, typeOf(rounds[idx].kind)); bossAttack(); }
  $('wb-score').textContent = String(score);
  const my = token;
  // A knockout on the last round gets time for its finale before the score card.
  const finale = kind !== 'miss' && hp <= 0 && idx === rounds.length - 1;
  afterVoice(kind === 'miss' ? 1500 : finale ? 3000 : 950, () => { if (my === token) next(); });   // never mid-clip
}

function showRound() {
  token++;
  stopAudio();
  busy = false;
  const r = rounds[idx];
  if (r.kind !== 'TYPE') hideKeys();
  $('wb-num').textContent = idx + 1;
  const card = r.card;
  if (r.kind === 'CHECK') {
    cardEl.innerHTML = `<span class="wb-kind">ROUND ${idx + 1} · MATCH OR NOT? · あってる？</span>
      <p class="wb-ask">${PB ? `<span class="jp">この にほんごは あってる？</span><span>Is this Japanese the right meaning?</span>` : `<span>Is this Japanese the right meaning?</span><span class="jp">この にほんごは あってる？</span>`}</p>
      <p class="wb-en">${esc(card.en)}</p><p class="wb-jp">${esc(r.shownJp)}</p>
      <div class="wb-opts"><button type="button" class="wb-opt" data-v="1">Match ✓ あってる</button><button type="button" class="wb-opt" data-v="0">No match ✗ ちがう</button></div>
      <p class="wb-fb" id="wb-fb"></p>`;
    paintChoices('.wb-opt');
    run.ready(1500 + 45 * card.en.length);
    cardEl.querySelectorAll('.wb-opt').forEach(b => b.addEventListener('click', () => {
      if (busy) return;
      const right = (b.dataset.v === '1') === r.truth;
      cardEl.querySelectorAll('.wb-opt').forEach(x => { x.disabled = true; if ((x.dataset.v === '1') === r.truth) x.classList.add('ok'); });
      if (!right) b.classList.add('bad');
      const fb = $('wb-fb');
      fb.className = 'wb-fb ' + (right ? 'ok' : 'bad');
      fb.textContent = r.truth ? 'It matched! · あってた！' : 'Not a match: ' + jpOf(card);
      resolve(right ? 'hit' : 'miss', card, b);
    }));
  } else if (r.kind === 'SPOT') {
    cardEl.innerHTML = `<span class="wb-kind">ROUND ${idx + 1} · DOES IT MATCH THE JAPANESE? · ちがう ことば</span>
      <p class="wb-ask">${PB ? `<span class="jp">にほんごを よんで、あわない えいごの ことばを タップ！</span><span>Read the Japanese. Tap the English word that doesn’t match.</span>` : `<span>Read the Japanese. Tap the English word that doesn’t match.</span><span class="jp">にほんごを よんで、あわない えいごの ことばを タップ！</span>`}</p>
      <p class="wb-jp">${esc(jpOf(card))}</p>
      <div class="wb-words">${r.spot.tokens.map((t, i) => `<button type="button" class="wb-word" data-i="${i}">${esc(t)}</button>`).join('')}</div>
      <p class="wb-fb" id="wb-fb"></p>`;
    paintChoices('.wb-word');
    run.ready(2500 + 500 * r.spot.tokens.length);
    cardEl.querySelectorAll('.wb-word').forEach(b => b.addEventListener('click', () => {
      if (busy) return;
      const right = Number(b.dataset.i) === r.spot.at;
      cardEl.querySelectorAll('.wb-word').forEach(x => { x.disabled = true; });
      const target = cardEl.querySelector(`.wb-word[data-i="${r.spot.at}"]`);
      target.classList.add('ok');
      if (!right) b.classList.add('bad');
      const fb = $('wb-fb');
      fb.className = 'wb-fb ' + (right ? 'ok' : 'bad');
      fb.textContent = `“${r.spot.swapped}” should be “${r.spot.original}”`;
      resolve(right ? 'hit' : 'miss', card, b);
    }));
  } else if (r.kind === 'HEAR') {
    cardEl.innerHTML = `<span class="wb-kind">ROUND ${idx + 1} · WHICH DID YOU HEAR? · どれかな？</span>
      <button type="button" class="wb-play" id="wb-play" aria-label="Play / きく">▶</button>
      <p class="wb-ask">${PB ? `<span class="jp">きいて、きこえた えいごを えらぼう！</span><span>Listen, then pick the English you heard.</span>` : `<span>Listen, then pick the English you heard.</span><span class="jp">きいて、きこえた えいごを えらぼう！</span>`}</p>
      <div class="wb-opts one">${r.opts.map((o, i) => `<button type="button" class="wb-opt" data-i="${i}">${esc(o.en)}</button>`).join('')}</div>
      <p class="wb-fb" id="wb-fb"></p>`;
    paintChoices('.wb-opt');
    run.ready(3000, { waitAudio: true });
    let heard = false;
    const playBtn = $('wb-play');
    const play = () => { run.pauseClock(); playClip(audioFor('questions') + card.mp3, playBtn, () => { heard = true; run.audioDone(); }); };
    playBtn.addEventListener('click', play);
    play();
    cardEl.querySelectorAll('.wb-opt').forEach(b => b.addEventListener('click', () => {
      if (busy) return;
      const right = r.opts[Number(b.dataset.i)] === card;
      cardEl.querySelectorAll('.wb-opt').forEach(x => { x.disabled = true; if (r.opts[Number(x.dataset.i)] === card) x.classList.add('ok'); });
      if (!right) b.classList.add('bad');
      const fb = $('wb-fb');
      fb.className = 'wb-fb ' + (right ? 'ok' : 'bad');
      fb.textContent = jpOf(card);
      resolve(right ? 'hit' : 'miss', card, b);
    }));
  } else {
    // TYPE: Japanese → type the English (first letters shown), one fix allowed
    const words = String(card.en).trim().split(/\s+/).length;
    cardEl.innerHTML = `<span class="wb-kind">ROUND ${idx + 1} · TYPE IT · かいてみよう</span>
      <p class="wb-ask">${PB ? `<span class="jp">この にほんごを えいごで かこう！</span><span>Type the English word for this Japanese.</span>` : `<span>Type the English word for this Japanese.</span><span class="jp">この にほんごを えいごで かこう！</span>`}</p>
      <p class="wb-jp">${esc(jpOf(card))}</p>
      <p class="wb-skel">${esc(skeleton(card.en))}</p>
      <div class="wb-row">
        <div class="wb-typed" id="wb-typed" role="textbox" aria-readonly="true" aria-label="Your answer"><span class="wb-tiles" id="wb-tiles"></span><span class="wb-caret" aria-hidden="true"></span><span class="wb-ph" id="wb-ph">type here · かこう</span></div>
      </div>
      <p class="wb-fb" id="wb-fb"></p>`;
    run.ready(2500 + 900 * words);
    const box = $('wb-typed'), tilesEl = $('wb-tiles'), ph = $('wb-ph'), fb = $('wb-fb');
    const pal = (POP.palette && POP.palette()) || [];
    let tries = 0, typed = '', restart = false, done = false;
    // Each letter is a tile ringed in the next palette colour; the newest pops in.
    const paintTyped = popLast => {
      let li = 0;
      tilesEl.innerHTML = typed.split('').map((ch, i) => {
        if (ch === ' ') return '<span class="wb-gap"></span>';
        const c = pal.length ? pal[li++ % pal.length] : '';
        return `<span class="wb-tile${popLast && i === typed.length - 1 ? ' is-new' : ''}"${c ? ` style="--c:${c};--c-ring:${POP.ringFor ? POP.ringFor(c) : c}"` : ''}><b>${esc(ch)}</b></span>`;
      }).join('');
      box.setAttribute('aria-label', typed || 'Your answer');
      ph.hidden = typed.length > 0;
      box.classList.toggle('has-text', typed.length > 0);
      box.classList.remove('bad', 'near');
      if (popLast) POP.key(tilesEl.lastElementChild);
    };
    const submit = () => {
      if (busy || done || !normalize(typed)) return;
      tries++;
      const v = check(card.en, typed);
      if (v === 'exact') {
        done = true; hideKeys();
        box.classList.add('ok', 'is-right', 'is-done');
        tilesEl.querySelectorAll('.wb-tile').forEach((t, i) => { t.style.animationDelay = `${i * 55}ms`; t.classList.remove('is-new', 'is-bad'); });
        fb.className = 'wb-fb ok'; fb.textContent = tries === 1 ? 'Direct hit! · せいかい！' : 'Fixed it! +0.5';
        playClip(CFG.audioBase + card.mp3, null, null);
        resolve(tries === 1 ? 'hit' : 'recover', card, box);
        return;
      }
      if (tries === 1) {
        lastSrc = box;
        run.miss(); addMissed(card, 'vocab'); bossAttack();
        fb.className = 'wb-fb ' + (v === 'near' ? 'near' : 'bad');
        fb.textContent = v === 'near' ? 'So close! Check the spelling · おしい！' : 'Not quite. One more try · もう いちど';
        box.classList.add(v === 'near' ? 'near' : 'bad');
        tilesEl.querySelectorAll('.wb-tile').forEach(t => { t.classList.remove('is-new'); t.classList.add('is-bad'); });
        restart = true;   // the next letter starts a fresh try
        return;
      }
      done = true; hideKeys();
      box.classList.add('bad', 'is-done');
      fb.className = 'wb-fb bad'; fb.textContent = 'The answer: ' + card.en;
      playClip(CFG.audioBase + card.mp3, null, null);
      busy = true;
      lastSrc = box;
      bossAttack();
      const my = token;
      afterVoice(1800, () => { if (my === token) next(); });   // the answer is said in full first
    };
    typing = k => {
      if (done || busy) return false;
      if (k === 'ok') { submit(); return true; }
      let added = false;
      if (k === 'back') { restart = false; typed = typed.slice(0, -1); }
      else {
        if (restart) { typed = ''; restart = false; }
        if (typed.length < 40) { typed += k; added = k !== ' '; }
      }
      paintTyped(added && !reducedFx());
      return true;
    };
    paintTyped(false);
    if (!showKeys()) fb.textContent = 'Keyboard missing · キーボードが ありません';
  }
}

function next() {
  idx++;
  if (idx >= rounds.length) showResults();
  else showRound();
}

function showResults() {
  token++;
  stopAudio();
  hideKeys();
  const runSum = run.summary();
  const pct = Math.round((score / 15) * 100);
  const beaten = hp <= 0;
  U.emitGameEnd({
    points: runSum.points, maxCombo: runSum.maxCombo, crown: beaten,
    saveId: SAVE_ID, score: pct, completed: pct >= 40,
  });
  if (beaten) U.confetti(cardEl, 80);
  U.showScorecard({
    run: runSum,
    gameId: SAVE_ID,
    title: 'Week Boss',
    correct: score,
    total: 15,
    pct,
    replayId: 'wb-replay',
    backId: 'wb-back',
    stats: [
      { label: 'Boss / ボス', value: beaten ? 'Beaten! たおした！ ♛' : `${Math.round((hp / BOSS_HP) * 100)}% HP left` },
      { label: 'Critical hits / クリティカル', value: String(crits) },
      { label: 'First try / いっかいで', value: `${runSum.firstTry} / 15` },
    ],
    reviewItems: missedItems,
    audioBase: CFG.audioBase,
  });
}

function start() {
  token++;
  POP.reset();   // Palette Pop: a restart starts clean (orbs, fireworks, timers, sounds)
  hideKeys();
  rounds = buildRounds();
  idx = 0; score = 0; hp = BOSS_HP; crits = 0; missedItems = []; phase = 1; tauntIdx = Math.floor(Math.random() * TAUNTS.length);
  arena.classList.remove('phase2', 'phase3', 'ko');
  foe.className = 'wb-foe';
  bannerEl.className = 'wb-banner';
  $('wb-score').textContent = '0';
  $('wb-num').textContent = '1';
  paintHP();
  run.reset();
  // Entrance: the boss drops in, then round 1. The answer timer starts with the round.
  cardEl.innerHTML = `<p class="wb-ask"><span class="jp">じゅんびは いい？</span><span>Get ready…</span></p>`;
  replay(foe, 'enter');
  bossSound('intro');
  banner('WEEK BOSS', 'ボス あらわる！');
  const my = token;
  setTimeout(() => { if (my === token) showRound(); }, reducedFx() ? 500 : 1700);
}

$('wb-replay').addEventListener('click', start);
$('wb-back').addEventListener('click', () => { token++; stopAudio(); hideKeys(); backToMenu(); });

start();
})();
