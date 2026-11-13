#!/usr/bin/env node
'use strict';

// Palette Pop pass (2026-11-12): world palettes, colour-carrying pairs in
// Vocabulary Tap and Spell the Word, a poppier combo pill and score pills
// for all nine games. This audit guards the RULES, not just the CSS text:
//   1. every palette colour avoids the verdict hues and reads at ≥ 4.5:1
//      with the ink the engine actually picks;
//   2. the selected / placed palette states WIN the cascade against the
//      skin (the documented exception) — and LOSE to correct/wrong;
//   3. a placed pair says "you put this here", never "this is right";
//   4. the shared flash cap can only drop the red overlay, never the
//      wrong-answer colour, icon, sound or shake;
//   5. effects are capped, quiet under reduced motion and stop when idle;
//   6. the points roll continues from the number on screen and screen
//      readers hear one line per change, not one per frame.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const skin = read('theme/game-skin.css');
const css = read('theme/game.css');
const pop = read('js/game-pop.js');
const utils = read('js/game-utils.js');
const vt = read('games/vocab-tap.js');
const sw = read('games/spell-word.js');
const vs = read('games/vocab-speed.js');
const st = read('games/sentence-tap.js');
const so = read('games/sentence-order.js');
const ssp = read('games/sentence-speed.js');
const stw = read('games/say-word.js');
const aq = read('games/ask-question.js');
const sas = read('games/say-sentence.js');
const wb = read('games/week-boss.js');
const ec = read('games/echo.js');
const bb = read('games/booha-bites.js');
const shell = read('game.html');

// ── helpers ──
const lum = hex => {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map(i => { const v = parseInt(h.substr(i, 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const hue = hex => {
  const h = hex.replace('#', ''), [r, g, b] = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return { h: 0, s: 0 };
  let H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  H *= 60; if (H < 0) H += 360;
  return { h: H, s: d / (1 - Math.abs(mx + mn - 1)) };
};
// Specificity of a simple selector (no nested :is lists): [ids, classes+attrs+pseudo-classes, types]
function spec(sel) {
  let s = sel.replace(/::[a-z-]+/g, ' x ');
  let a = 0, b = 0, c = 0;
  s = s.replace(/:not\(([^)]*)\)/g, (_, inner) => { const [x, y, z] = spec(inner); a += x; b += y; c += z; return ' '; });
  s = s.replace(/:is\(([^)]*)\)/g, (_, inner) => { const best = inner.split(',').map(spec).sort((p, q) => q[0] - p[0] || q[1] - p[1] || q[2] - p[2])[0]; a += best[0]; b += best[1]; c += best[2]; return ' '; });
  a += (s.match(/#[\w-]+/g) || []).length;
  b += (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
  c += (s.match(/(^|[\s>+~])[a-z][\w-]*/g) || []).length;
  return [a, b, c];
}
const gte = (p, q) => p[0] !== q[0] ? p[0] > q[0] : p[1] !== q[1] ? p[1] > q[1] : p[2] >= q[2];

// ── 0. Load the shared engine to test the ink it really picks ──
const ctx = {
  console, Math, setTimeout: () => 0, addEventListener() {}, innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1,
  performance: { now: () => 0 }, requestAnimationFrame: () => 0,
  document: { documentElement: { dataset: {} }, body: null, addEventListener() {}, createElement: () => ({ getContext: () => null, style: {} }), querySelector: () => null },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
};
ctx.window = ctx;
vm.runInNewContext(pop, ctx);
const P = ctx.BoohaPop;
assert(P && typeof P.inkFor === 'function', 'game-pop.js exposes window.BoohaPop with inkFor');

// ── 1. Palettes ──
const OK = '#1f7a46', BAD = '#ff7a45';
for (const cur of ['br', 'bc', 'pb']) {
  const block = skin.match(new RegExp(`html\\[data-skin="v2"\\]\\[data-curriculum="${cur}"\\] \\{[^}]*--pal-1:[^}]*\\}`));
  assert(block, `${cur}: palette block in game-skin.css`);
  const cols = [...block[0].matchAll(/--pal-(\d+):\s*(#[0-9A-Fa-f]{6})/g)].map(m => m[2]);
  assert.strictEqual(cols.length, 12, `${cur}: twelve palette colours`);
  assert.strictEqual(new Set(cols.map(c => c.toLowerCase())).size, 12, `${cur}: no duplicate colours`);
  for (const c of cols) {
    const { h, s } = hue(c);
    assert(!(s > .35 && h >= 95 && h <= 150), `${cur} ${c}: no correct-green hues`);
    assert(!(s > .35 && h >= 10 && h <= 40), `${cur} ${c}: no wrong-orange hues`);
    assert(contrast(c, OK) > 1.4 && contrast(c, BAD) > 1.15 || hue(c).h > 160, `${cur} ${c}: distinct from the verdict fills`);
    const ink = P.inkFor(c);
    assert(contrast(c, ink) >= 4.5, `${cur} ${c}: selected fill reads at ≥ 4.5:1 with ${ink} (got ${contrast(c, ink).toFixed(2)})`);
  }
}

// Rings on cream faces (card faces, paper strips) must stand apart: the palest
// colours are deepened for the ring only (P.ringFor); fills keep the true colour.
{
  const CREAMS = ['#fff8e6', '#ffffff', '#f3e8d1', '#fffaf2'];
  const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const far = h => Math.min(...CREAMS.map(b => { const [x, y] = [rgb(h), rgb(b)]; return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); }));
  assert.strictEqual(typeof P.ringFor, 'function', 'game-pop.js exposes ringFor');
  for (const cur of ['br', 'bc', 'pb']) {
    const block = skin.match(new RegExp(`html\\[data-skin="v2"\\]\\[data-curriculum="${cur}"\\] \\{[^}]*--pal-1:[^}]*\\}`))[0];
    for (const [, c] of block.matchAll(/--pal-\d+:\s*(#[0-9A-Fa-f]{6})/g))
      assert(far(P.ringFor(c)) >= 110, `${cur} ${c}: its ring stands apart from cream (${Math.round(far(P.ringFor(c)))})`);
  }
  for (const [name, src, sel] of [['Tap', vt, 'vt-en-card.vt-pal'], ['Sentence Tap', st, 'st-en-card.st-pal'], ['Speed', vs, 'vs-choice.vs-pal'], ['Sentence Speed', ssp, 'ssp-choice.ssp-pal']])
    assert.strictEqual((src.match(new RegExp(`\\.${sel.replace('.', '\\.')}\\[data-ci\\](:hover|:active)?\\{[^}]*inset 0 0 0 3px var\\(--c-ring, var\\(--c\\)\\)`, 'g')) || []).length, 3, `${name}: cream-face rings use --c-ring (rest, hover, active)`);
}

// ── 2. The documented exception wins the cascade; verdicts still win ──
assert.match(skin, /EXCEPTION to the "selected = lane colour" rule/, 'game-skin.css documents the Vocabulary Tap exception');
const skinSel = 'html[data-skin="v2"][data-curriculum] :is(.vt-en-card, .st-en-card).selected[data-ci]';
const vtSel = 'html[data-skin="v2"][data-curriculum] .vt-en-card.vt-pal.selected[data-ci]';
assert(skin.includes(skinSel.replace(/\[data-ci\]$/, '[data-ci] {')) || skin.includes(skinSel), 'skin selected rule present');
assert(vt.includes(vtSel + '{'), 'Vocabulary Tap selected palette rule present');
assert(gte(spec(vtSel), spec(skinSel)), `palette selected ${spec(vtSel)} must be ≥ skin selected ${spec(skinSel)}`);
assert(vt.indexOf('document.head.appendChild(S)') > -1, 'engine styles are injected at runtime, after game-skin.css (equal specificity → engine wins)');
assert.match(vt, /\.vt-en-card\.vt-pal\.selected\[data-ci\]\{\s*background:var\(--c\);/, 'a selected card fills with its own palette colour');
assert.match(vt, /\.vt-en-card\.vt-pal\.selected\[data-ci\] \.vt-en-text\{ color:var\(--c-ink\); \}/, 'and uses the engine-picked ink');
assert.match(pop, /function paint\(el, key\) \{[^}]*--c-ink', inkFor\(/, 'the engine writes --c-ink from inkFor');
// Paired (placed) states never outrank a verdict.
assert.match(vt, /\.vt-jp-slot\.has-pair\.vt-pp:not\(\.slot-correct\):not\(\.slot-wrong\)\{/, 'Tap: the placed ring switches off on correct/wrong');
assert.match(skin, /\.vt-jp-slot\.slot-correct \{ background: var\(--ok\);/, 'Tap: correct still fills green');
// Sentence Tap: same exception on the paper strips (shares the skin's selected rule).
const stSel = 'html[data-skin="v2"][data-curriculum] .st-en-card.st-pal.selected[data-ci]';
assert(st.includes(stSel + '{'), 'Sentence Tap selected palette rule present');
assert(gte(spec(stSel), spec(skinSel)), `Sentence Tap palette selected ${spec(stSel)} must be ≥ skin selected ${spec(skinSel)}`);
const stSkinSel = 'html[data-skin="v2"][data-curriculum] .st-en-card.selected[data-ci]';
assert(skin.includes(stSkinSel) && gte(spec(stSel), spec(stSkinSel)), 'Sentence Tap palette selected outranks the paper-strip selected rule');
assert.match(st, /\.st-en-card\.st-pal\.selected\[data-ci\]\{\s*background:var\(--c\);/, 'Sentence Tap: a selected strip fills with its own palette colour');
assert.match(st, /\.st-en-card\.st-pal\.selected\[data-ci\] \.st-en-text\{ color:var\(--c-ink\); \}/, 'Sentence Tap: and uses the engine-picked ink');
assert.match(st, /\.st-jp-slot\.has-pair\.st-pp:not\(\.slot-correct\):not\(\.slot-wrong\)\{/, 'Sentence Tap: the placed ring switches off on correct/wrong');
assert.match(skin, /\.st-jp-slot\.slot-correct \{ background: var\(--ok\);/, 'Sentence Tap: correct still fills green');
assert.match(st, /POP\.newRound\(roundCards\);/, 'Sentence Tap: five fresh colours per round');
assert.strictEqual((st.match(/POP\.tap\(card\._key, btn\);/g) || []).length, 2, 'Sentence Tap: touch and click both pop');
const swPal = 'html[data-skin="v2"][data-curriculum] .sw-tile.sw-pal[data-ti]';
const swSkin = 'html[data-skin="v2"][data-curriculum] .sw-tile[data-ti]';
assert(sw.includes(swPal + '{') && gte(spec(swPal), spec(swSkin)), 'Spell: tile palette rule outranks the skin tile rule (both !important)');
assert.match(sw, /\.sw-slot\.filled\.sw-pp\{\s*box-shadow:[^}]*\}/, 'Spell: placed slots get the colour ring');
assert(!/\.sw-slot\.filled\.sw-pp\{[^}]*!important/.test(sw), 'Spell: the placed ring is NOT !important, so the skin\'s !important correct/wrong fills win');
assert.match(sw, /sl\.classList\.remove\('sw-wrong', 'filled', 'empty'\);\s*sl\.classList\.add\('sw-correct'\);/, 'Spell: grading drops "filled", so the placed ring cannot sit on a verdict');

// Sentence Order: tray tiles ring like Spell's letters; placed chips ring until Check.
const soPal = 'html[data-skin="v2"][data-curriculum] .so-tile.so-pal[data-ti]';
for (const soSkin of ['html[data-skin="v2"][data-curriculum] .so-tile[data-ti]', 'html[data-skin="v2"][data-curriculum="pb"] .so-tile[data-ti]'])
  assert(so.includes(soPal + '{') && skin.includes(soSkin) && gte(spec(soPal), spec(soSkin)), `Order: tile palette rule outranks ${soSkin} (both !important)`);
const soChip = 'html[data-skin="v2"][data-curriculum] .so-placed-chip.so-pp:not(.so-correct):not(.so-wrong)';
assert(so.includes(soChip + '{'), 'Order: placed chips get the colour ring, switched off on correct/wrong');
assert(!/\.so-placed-chip\.so-pp[^{]*\{[^}]*!important/.test(so), 'Order: the chip ring is NOT !important, so the skin\'s !important correct/wrong fills win');
assert.match(skin, /\.so-placed-chip\.so-correct \{ background: var\(--ok\) !important;/, 'Order: correct still fills green');
assert.match(so, /POP\.newRound\(tokens\.map\(\(_, i\) => popKey\(i\)\)\);/, 'Order: fresh colours per sentence');
assert.match(so, /U\.impactChain\(chips, \{ outcome: isRecovery \? 'recover' : 'hit', stagger: 55,\s*combo: res\.combo \|\| 1, sharp: !!res\.sharp, container: answerEl \}\);[^\n]*\n[^\n]*\n\s*POP\.spell\(chips, [^\n]*, 55, answerEl\);/, 'Order: words burst on the existing 55 ms green stagger');
assert.match(so, /isRight: chip => [^\n]*\}\);[^\n]*\n[^\n]*\n\s*POP\.misspell\(chips, [^\n]*, 55\);/, 'Order: misplaced words crumble on the same stagger; right ones stay anchored');
assert.match(so, /POP\.tap\(popKey\(origIdx\), tile, true\);/, 'Order: tile tap pops quietly (the landing plays the note)');
assert.match(so, /POP\.init\(\{ pill: '#so-score' \}\);/, 'Order: gems fly to the Score pill, not the Sentence counter');

const vsPal = 'html[data-skin="v2"][data-curriculum] .vs-choice.vs-pal[data-ci]';
const vsSkin = 'html[data-skin="v2"][data-curriculum] .vs-choice[data-ci]';
assert(vs.includes(vsPal + '{') && gte(spec(vsPal), spec(vsSkin)), 'Speed: choice palette ring outranks the skin card rule');
assert(!/\.vs-choice\.vs-pal\[data-ci\][^{]*\{[^}]*!important/.test(vs), 'Speed: the ring is NOT !important, so the skin\'s !important correct/wrong fills win the moment a card is tapped');
assert.match(vs, /POP\.newRound\(choices\.map\(\(_, ci\) => `vs\$\{idx\}-\$\{ci\}`\)\);/, 'Speed: four fresh colours per question');
assert.match(vs, /U\.impact\(\{ source: btn, outcome: 'miss', flavor: 'speed', squash: false \}\);[^\n]*\n\s*POP\.wrong\(btn\);/, 'Speed: a wrong pick crumbles after the existing recoil');
assert.match(vs, /POP\.fizzle\(heatEl\);/, 'Speed: a timeout smokes the timer bar');
// Sentence Speed: the same hooks on the paper strips.
const sspPal = 'html[data-skin="v2"][data-curriculum] .ssp-choice.ssp-pal[data-ci]';
const sspSkin = 'html[data-skin="v2"][data-curriculum] .ssp-choice[data-ci]';
assert(ssp.includes(sspPal + '{') && skin.includes(sspSkin) && gte(spec(sspPal), spec(sspSkin)), 'Sentence Speed: strip palette ring outranks the skin strip rule');
assert(!/\.ssp-choice\.ssp-pal\[data-ci\][^{]*\{[^}]*!important/.test(ssp), 'Sentence Speed: the ring is NOT !important, so the skin\'s !important correct/wrong fills win');
assert.match(skin, /\.ssp-choice\.ssp-correct \{\s*background: var\(--ok\) !important;/, 'Sentence Speed: correct still fills green');
assert.match(ssp, /POP\.newRound\(choices\.map\(\(_, ci\) => `ssp\$\{idx\}-\$\{ci\}`\)\);/, 'Sentence Speed: four fresh colours per question');
assert.match(ssp, /flavor: 'wave', squash: false \}\);\n[^\n]*\n\s*POP\.correct\(btn, btn\.dataset\.popKey, hit\.combo \|\| 1\);/, 'Sentence Speed: the burst follows the existing wave');
assert.match(ssp, /if \(STREAK_MILESTONES\.includes\(streak\)\) POP\.round\(streak === 15 \? 5 : 3, promptBox, 5\);/, 'Sentence Speed: one firework per milestone');
assert.match(ssp, /U\.impact\(\{ source: btn, outcome: 'miss', flavor: 'wave', squash: false \}\);[^\n]*\n\s*POP\.wrong\(btn\);/, 'Sentence Speed: a wrong pick crumbles after the existing recoil');
assert.match(ssp, /U\.impact\(\{ source: heatEl, outcome: 'timeout', flavor: 'wave' \}\);\n\s*POP\.fizzle\(heatEl\);/, 'Sentence Speed: a timeout smokes the timer bar');
assert.match(ssp, /function onTimeout\(\) \{\s*if \(locked \|\| feedbackState !== 'playing'\) return;/, 'Sentence Speed: one timeout per question');

// ── 3. "Placed", never "right" ──
for (const [name, src, rule] of [['Order', so, /\.so-placed-chip\.so-pp:not\(\.so-correct\):not\(\.so-wrong\)\{([^}]*)\}/], ['Tap', vt, /\.vt-jp-slot\.has-pair\.vt-pp:not\(\.slot-correct\):not\(\.slot-wrong\)\{([^}]*)\}/], ['Sentence Tap', st, /\.st-jp-slot\.has-pair\.st-pp:not\(\.slot-correct\):not\(\.slot-wrong\)\{([^}]*)\}/], ['Spell', sw, /\.sw-slot\.filled\.sw-pp\{([^}]*)\}/]]) {
  const body = src.match(rule)[1];
  assert(!/background/.test(body), `${name}: a placed pair is a ring, never a fill`);
  assert(!/--ok|#22c55e|#1f7a46/i.test(body), `${name}: a placed pair never uses the correct colour`);
}
assert.match(vt, /\.vt-drop\.filled::before\{\s*content:'';/, 'Tap: the placed pin is ::before (the skin keeps ::after for ✓/✗)');
assert(!/\.vt-drop\.filled::before\{[^}]*content:'[^']/.test(vt), 'Tap: the pin carries no symbol');
assert.match(st, /\.st-drop\.filled::before\{\s*content:'';/, 'Sentence Tap: the placed pin is ::before (the skin keeps ::after for ✓/✗)');
assert(!/\.st-drop\.filled::before\{[^}]*content:'[^']/.test(st), 'Sentence Tap: the pin carries no symbol');

// ── 4. The flash cap only drops the overlay ──
const wrongBranch = vt.slice(vt.indexOf("el.classList.add('slot-wrong');"), vt.indexOf('flashWrong();', vt.indexOf("el.classList.add('slot-wrong');")));
assert(/U\.playSFX\('fart'\)/.test(wrongBranch) && /POP\.wrong\(el\)/.test(wrongBranch) && /U\.impact\(\{ source: el, outcome: 'miss'/.test(wrongBranch),
  'Tap: the orange fill, ✗, bonk, recoil and debris all happen before flashWrong()');
assert.match(vt, /function flashWrong\(\) \{\s*if \(!POP\.canFlash\(\)\) return;/, 'Tap: a capped flash returns before drawing anything else');
{
  const a = st.indexOf("el.classList.add('slot-wrong');"), b = st.indexOf('flashWrong();', a);
  const br = st.slice(a, b);
  assert(/U\.playSFX\('fart'\)/.test(br) && /POP\.wrong\(el\)/.test(br) && /U\.impact\(\{ source: el, outcome: 'miss'/.test(br),
    'Sentence Tap: the orange fill, ✗, bonk, recoil and debris all happen before flashWrong()');
  assert.match(st, /function flashWrong\(\) \{\s*if \(!POP\.canFlash\(\)\) return;/, 'Sentence Tap: a capped flash returns before drawing anything else');
}
assert.match(pop, /function canFlash\(\) \{[^}]*flashes\.length >= 3/, 'at most 3 bright flashes a second');

// ── 5. Pileup: caps, reduced motion, idle stop, cleanup ──
assert.match(pop, /const POOL = 360/, 'one fixed particle pool');
assert.match(pop, /const cap = \(\) => \(power\(\) === 'minimal' \? 50 : power\(\) === 'reduced' \? 150 : POOL\)/, 'tier caps');
assert.match(pop, /function spawn\(p, deco\) \{\s*if \(reduced\(\) \|\| live >= cap\(\)/, 'nothing flies under reduced motion, never past the cap');
assert.match(pop, /if \(deco && \(govern < 1 \|\| live >= cap\(\) \* \.6\) && live >= cap\(\) \* \.35\) return null;/, 'when slow or crowded, decorative particles are refused first');
for (const k of ['confetti', 'smoke']) assert.match(pop, new RegExp(`kind: '${k}'[^}]*\\}, !keep\\)`), `${k} is decorative unless it is the feedback itself`);
// The timeout smoke and the streak/round finale ARE the feedback: thinned when slow, never dropped.
const fizzleFn = pop.slice(pop.indexOf('fizzle(el) {'), pop.indexOf('round(score, board'));
assert.match(fizzleFn, /smoke\([^;]*, 1, true\)/, 'timeout smoke is kept under the governor');
const roundFn = pop.slice(pop.indexOf('round(score, board'), pop.indexOf('};\n})();'));
assert.match(roundFn, /confetti\(cx, r\.top \+ r\.height \* \.45, 80, 1\.15, true\)/, '5/5 and 15-streak main burst is kept');
assert.match(roundFn, /score >= 3\) \{ confetti\([^)]*, true\)/, '3+ burst is kept');
// One firing per event.
assert.match(pop, /function once\(tag, el\)/, 'a dedupe guard exists');
assert.match(fizzleFn, /if \(!once\('fizzle', el\)\) return;/, 'a repeated timeout call cannot fizzle twice');
assert.match(roundFn, /if \(!once\('round', board\)\) return;/, 'a repeated milestone call cannot fire twice');
assert.match(vs, /function onTimeout\(\) \{\s*if \(locked \|\| feedbackState !== 'playing'\) return;/, 'Speed: the game itself fires a timeout once per question');
assert.doesNotMatch(pop, /function sparks[^\n]*\n[^\n]*\}, true\)/, 'sparks (the tap/answer response) are never decorative');
assert.match(pop, /const MAX_VOICES = 10/, 'never more than 10 effect voices at once');
assert.match(pop, /if \(!busy\(\)\) \{ if \(g\) \{[^}]*clearRect[^}]*\} if \(pendingResize\) size\(\); return; \}/, 'the canvas loop stops (and clears) when idle; a resolution drop waits for idle');
// Cleanup on restart / close / hide: frames, timers, labels and sounds all cancelled.
const resetFn = pop.slice(pop.indexOf('function reset() {'), pop.indexOf("addEventListener('pagehide', reset);"));
for (const [re, what] of [[/cancelAnimationFrame\(raf\)/, 'animation frame'], [/timers\.forEach\(clearTimeout\)/, 'pending timers'], [/p\.on = false/, 'particles'],
  [/labels\.forEach\(el => el\.remove\(\)\)/, 'DOM labels'], [/liveNodes\.forEach\([^)]*node\.stop\(\)/, 'playing sounds'], [/clearRect/, 'canvas pixels']])
  assert.match(resetFn, re, `reset() cancels ${what}`);
assert.match(pop, /addEventListener\('pagehide', reset\);/, 'reset on page close / navigation');
assert.match(pop, /visibilitychange[^\n]*document\.hidden\) reset\(\)/, 'reset when the tab is hidden');
assert.doesNotMatch(pop.replace(/function later[^\n]*/, ''), /\bsetTimeout\(/, 'every delayed effect goes through later() so reset() can cancel it');
for (const [name, src, re] of [['vocab-tap', vt, /replayBtn[\s\S]{0,120}POP\.reset\(\);/], ['spell-word', sw, /replay[\s\S]{0,200}POP\.reset\(\);/], ['vocab-speed', vs, /function doStart\(\) \{\s*POP\.reset\(\);/], ['vocab-speed replay', vs, /getElementById\('vs-replay'\)\.addEventListener\('click', \(\) => \{\s*POP\.reset\(\);/], ['sentence-tap', st, /replayBtn[\s\S]{0,120}POP\.reset\(\);/], ['sentence-speed start', ssp, /function doStart\(\) \{\s*POP\.reset\(\);/], ['sentence-speed replay', ssp, /getElementById\('ssp-replay'\)\.addEventListener\('click', \(\) => \{\s*POP\.reset\(\);/], ['sentence-order', so, /replayBtn\.addEventListener\('click', \(\) => \{\s*POP\.reset\(\);/]])
  assert.match(src, re, `${name}: restart clears leftover effects`);
assert.match(pop, /pointer-events:none/, 'the effects canvas never takes taps');
assert.match(utils, /if \(now - \(last\.get\(el\) \|\| 0\) < 120\) return;/, 'score-pill pops are throttled');
assert.match(utils, /const reduced = \(\) => \{ const m = window\.BoohaMotion; return !!\(m && m\.reduced && m\.reduced\(\)\); \};/, 'score-pill pops respect reduced motion');
assert.match(utils, /setTimeout\(\(\) => f\.remove\(\), 800\)/, 'floating points remove themselves');

// ── 6. The points roll (simulated) ──
{
  let NOW = 0; const frames = [];
  const els = [];
  const mk = tag => {
    const kids = {}, el = {
      tag, className: '', style: { setProperty() {} }, dataset: {}, isConnected: true, offsetWidth: 0, _writes: 0,
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, animate() { return {}; }, remove() {}, appendChild(c) { return c; },
      getBoundingClientRect() { return { left: 0, top: 0, right: 100, width: 100, height: 30 }; },
      querySelector(sel) { return kids[sel] || (kids[sel] = mk(sel)); },
      querySelectorAll() { return []; },
    };
    let text = '';
    Object.defineProperty(el, 'textContent', { get: () => text, set: v => { text = String(v); el._writes++; } });
    Object.defineProperty(el, 'innerHTML', { get: () => '', set: () => {} });
    els.push(el); return el;
  };
  const c2 = {
    console, Math, performance: { now: () => NOW },
    setTimeout: () => 1, requestAnimationFrame: fn => { frames.push(fn); return 1; },
    document: { body: { appendChild() {} }, createElement: mk, addEventListener() {}, querySelectorAll: () => [], getElementById: () => null, activeElement: null },
    BoohaMotion: { reduced: () => false, power: () => 'full' }, innerWidth: 1024, innerHeight: 768,
  };
  c2.window = c2;
  vm.runInNewContext(utils, c2);
  const run = c2.GAME_UTILS.createRun({ total: 15 });
  const step = ms => { NOW += ms; const f = frames.splice(0); f.forEach(fn => fn(NOW)); };
  run.ready(); run.hit();                       // +100: the first value just appears
  const hud = els.find(e => e.tag === 'div');
  const pts = hud.querySelector('.brun-pts'), sr = hud.querySelector('.brun-sr');
  assert.strictEqual(pts.textContent, '100');
  run.ready(); run.hit();                       // +100 → rolls 100 → 200
  step(16); step(120);                          // mid-roll
  const mid = Number(pts.textContent.replace(/,/g, ''));
  assert(mid > 100 && mid < 200, `rolling mid-way (got ${mid})`);
  const srBefore = sr._writes;
  run.ready(); run.hit();                       // +150 (×1.5) lands mid-roll
  step(16);
  const next = Number(pts.textContent.replace(/,/g, ''));
  assert(next >= mid, `a gain that lands mid-roll continues from the number on screen (${mid} → ${next}), never jumps back`);
  for (let i = 0; i < 40; i++) step(16);
  assert.strictEqual(pts.textContent, '350', 'and settles on the real total');
  assert.strictEqual(sr._writes - srBefore, 1, 'screen readers hear one line per change, not one per frame');
  assert.strictEqual(sr.textContent, 'Combo ×1.5, 350 points');
}
assert.match(utils, /<b class="brun-pts" aria-hidden="true">/, 'the rolling number is visual only');
assert.match(utils, /<span class="brun-sr" role="status" aria-live="polite">/, 'one polite status line');
assert(!/hudEl\.setAttribute\('aria-live'/.test(utils), 'the whole pill is no longer a live region');

// ── 7. Contrast of the hot combo pill ──
for (const [bg, ink] of [['#ffc94a', '#2b1a05'], ['#ff9a3c', '#2b1a05'], ['#ff6fa6', '#2a0610'], ['#ff9a3c', '#2a0610']]) {
  assert(contrast(bg, ink) >= 4.5, `combo pill ${bg} with ${ink} reads at ≥ 4.5:1`);
}
assert.match(css, /\.brun-hud > :not\(\.brun-sr\) \{ position: relative; z-index: 1; \}/, 'pill text sits above the light sweep');
assert.match(css, /\.brun-hud\.hot::after \{[^}]*z-index: 0;/, 'the sweep runs behind the text');

// ── 7b. Say the Word: the speaker never covers the voice ──
{
  const spkFn = pop.slice(pop.indexOf('    speaker(btn) {'), pop.indexOf('    speakerEnd(btn, id) {'));
  assert(spkFn.length > 200, 'speaker() present');
  assert(!/SFX\.|tone\(|noise\(|\bding\b|playSFX/.test(spkFn), 'pressing play makes no effect sound: the word is heard clean from its first sound');
  const beatFn = pop.slice(pop.indexOf('function spkBeat() {'), pop.indexOf('let spkCss'));
  assert(!/SFX\.|tone\(|noise\(/.test(beatFn), 'the sound waves while the clip plays are silent');
  const endFn = pop.slice(pop.indexOf('    speakerEnd(btn, id) {'), pop.indexOf('    // Time ran out'));
  assert.match(endFn, /\(id && spk\.id !== id\)\) return;/, 'an old clip ending cannot stop a newer press');
  assert.match(endFn, /SFX\.tink\(\);/, 'only after the clip ends: a soft tink');
  assert.match(pop, /lastFire\.clear\(\); spk = null;/, 'reset() stops the speaker loop');
  assert.match(pop, /until: performance\.now\(\) \+ 9000/, 'the wave loop gives up after 9 s even if the clip never reports its end');
  assert.match(pop, /html\[data-motion="reduced"\] \.bpop-eq i/, 'equaliser and hop stop under reduced motion');
  for (const [name, src, p] of [['Say the Word', stw, 'stw'], ['Say the Sentence', sas, 'sas'], ['Ask the Question', aq, 'aq']]) {
    assert.match(src, /POP\.eq\(playBtn\);[^\n]*\n\s*const spkId = POP\.speaker\(playBtn\);[^\n]*\n\s*U\.unlockAudio\(\);/, `${name}: the speaker effect starts with the press`);
    assert.match(src, /playBtn\.textContent = '▶';\n\s*POP\.speakerEnd\(playBtn, spkId\);/, `${name}: it ends when that clip ends`);
    assert.match(src, /function showCard\(\) \{\n  voiceGate\.stop\(\);[\s\S]{0,400}POP\.speakerWait\(playBtn\);/, `${name}: a new question stops any speaker loop and waits for a press`);
    const palSel = `html[data-skin="v2"][data-curriculum] .${p}-choice.${p}-pal[data-ci]`;
    const skinSel2 = 'html[data-skin="v2"][data-curriculum] :is(.stw-choice, .sas-choice, .aq-choice)[data-ci]';
    assert(src.includes(palSel + '{') && skin.includes(skinSel2) && gte(spec(palSel), spec(skinSel2)), `${name}: answer palette ring outranks the skin panel rule`);
    assert(!new RegExp(`\\.${p}-choice\\.${p}-pal\\[data-ci\\][^{]*\\{[^}]*!important`).test(src), `${name}: the ring is NOT !important, so correct/wrong fills win`);
    assert.match(src, /if \(firstTry\) POP\.correct\(btn, btn\.dataset\.popKey, popCombo\);/, `${name}: only a first-try answer bursts`);
    assert.match(src, /U\.impact\(\{ source: btn, outcome: 'miss', flavor: 'listen', squash: false \}\);\n\s*POP\.wrong\(btn\);/, `${name}: a wrong pick crumbles after the existing puff`);
    assert.match(src, /if \(firstTry && STREAK_FIREWORKS\.includes\(streak\)\) POP\.round/, `${name}: fireworks at 5 / 10 / 15 in a row`);
    assert(new RegExp(`getElementById\\('${p}-replay'\\)\\.addEventListener\\('click', \\(\\) => \\{\\n  POP\\.reset\\(\\);`).test(src), `${name}: replay clears leftover effects`);
  }
}

// ── 7c. Week Boss: the flashiest, without breaking the fight ──
{
  // Orbs: state changes at once, the show lands with the orb; no canvas → it lands at once.
  const shootFn = pop.slice(pop.indexOf('  function shoot(from, to, o = {}) {'), pop.indexOf('  /* Every delayed effect'));
  assert.match(shootFn, /if \(reduced\(\) \|\| !ensureCanvas\(\)\) \{ if \(o\.onHit\) o\.onHit\(\); return; \}/, 'reduced motion / no canvas: the hit lands at once');
  assert.match(pop, /shots\.length = 0;/, 'reset() drops orbs in flight');
  assert.match(pop, /busy\(\) \{ return live \|\| rings\.length \|\| bolts\.length \|\| cracks\.length \|\| shots\.length \|\| tint; \}/, 'the loop runs while an orb flies');
  assert.match(wb, /hp = Math\.max\(0, hp - d\);\n[\s\S]{0,320}POP\.shoot\(lastSrc, foe, \{[^\n]*onHit: \(\) => \{ if \(my === token\) landHit\(d, crit\); \} \}\);/, 'Boss: HP changes now; the boss flinches when the orb lands (never in a newer game)');
  assert.match(wb, /function landHit\(d, crit\) \{\n  paintHP\(\);[\s\S]{0,400}if \(left <= 1 \/ 3\) setPhase\(3\); else if \(left <= 2 \/ 3\) setPhase\(2\);/, 'Boss: phases still at two thirds and one third');
  assert.match(wb, /k === 'shoot' \? \(a, b, o\) => \{ if \(o && o\.onHit\) o\.onHit\(\); \}/, 'Boss: without game-pop.js hits still land');
  assert.match(wb, /POP\.strikeBack\(foe, lastSrc\);/, 'Boss: a miss is answered by a dark orb back at the answer');
  assert.match(wb, /function start\(\) \{\n  token\+\+;\n  POP\.reset\(\);/, 'Boss: replay starts clean');
  assert.match(wb, /finale \? 3000 : 950/, 'Boss: a last-round knockout plays out before the score card');
  assert(/\.wb-stage\{position:sticky;top:0;/.test(wb), 'Boss: the arena and HP bar stay in view while the round scrolls');
  assert(/:is\(\.wb-opt, \.wb-word\)\.wb-pal\[data-c\]:not\(\.ok\):not\(\.bad\)\{/.test(wb), 'Boss: choice rings switch off on verdicts');
  // On-screen keyboard (shared with Echo), never the iPad keyboard.
  assert(!/<input[^>]*wb-input|<form[^>]*wb-form/.test(wb), 'Boss: no text box, so no iPad keyboard or autocorrect');
  assert.match(wb, /window\.BoohaKeys\.create\(\{\s*className: 'wb-keys', marks: \["'", '-'\], okHTML: 'Hit!<small lang="ja">こうげき<\/small>',/, 'Boss: the shared keyboard with a Hit! key');
  assert.match(wb, /const k = keys\.keyFromEvent\(e\);/, 'Boss: a physical keyboard types the same keys');
  assert.match(wb, /function showResults\(\) \{\n  token\+\+;\n  stopAudio\(\);\n  hideKeys\(\);/, 'Boss: the keys leave with the score card');
  assert.match(wb, /const v = check\(card\.en, typed\);/, 'Boss: typing is graded by the same check() as before');
  for (const m of wb.matchAll(/@keyframes\s+(wb\w+)\s*\{([\s\S]*?\})\s*\}/g))
    for (const prop of [...m[2].matchAll(/([a-z-]+)\s*:/g)].map(x => x[1])) assert(['opacity', 'transform'].includes(prop), `@keyframes ${m[1]} animates ${prop}`);
}

// ── 7d. Echo: dictation stays clean ──
{
  assert.match(ec, /POP\.eq\(playBtn\);[^\n]*\n\s*const spkId = POP\.speaker\(playBtn\);/, 'Echo: the speaker show starts with the press (silent)');
  assert.match(ec, /playBtn\.innerHTML = PLAY_HTML; POP\.speakerEnd\(playBtn, spkId\);/, 'Echo: ▶ and its pulse come back when the clip ends');
  assert.match(ec, /const r = run\.hit\(\); score \+= 1;\s*U\.confetti\(input, 18\);[\s\S]{0,260}POP\.spell\(tl, tl\.map\(\(_, i\) => tileKey\(i\)\), \(r && r\.combo\) \|\| 1, 55, input\);/, 'Echo: a first-try answer bursts letter by letter on the existing 55 ms wave');
  assert.match(ec, /POP\.spell\([^\n]*'\+½'\)/, 'Echo: a fix is labelled +½, not +1');
  assert.match(ec, /POP\.misspell\(tilesNow\(\), el => el\.classList\.contains\('is-good'\), 50\);/, 'Echo: wrong letters crumble, the right start stays');
  assert.match(ec, /perfectRun = 0;\n  if \(tries >= 2\) POP\.misspell/, 'Echo: a miss ends the firework streak');
  assert.match(ec, /run\.miss\(\);   \/\/ a hint ends the combo[^\n]*\n  perfectRun = 0;/, 'Echo: a hint ends it too');
  assert.match(ec, /\$\('ec-replay'\)\.addEventListener\('click', \(\) => \{\n  POP\.reset\(\);/, 'Echo: replay clears leftover effects');
  assert(!/\.ec-tile\.ec-pal\{[^}]*!important/.test(ec), 'Echo: the tile ring never beats the verdict colours');
}

// ── 7e. Booha Bites: candy snacks, verdicts still win ──
{
  const pal = 'html[data-skin="v2"][data-curriculum] .bb-choice.bb-pal:not(.correct):not(.wrong)';
  assert(bb.includes(pal + '{'), 'Bites: candy fill only while undecided (green ✓ and the gobbled fade win)');
  assert(gte(spec(pal), spec('html[data-skin="v2"][data-curriculum] :is(.bb-choice.correct, .wb-opt.ok, .wb-word.ok)')), 'Bites: the candy rule cannot leak onto a verdict');
  assert.match(bb, /background:var\(--c\);color:var\(--c-ink\);/, 'Bites: candy ink is the engine-picked readable ink');
  assert.match(bb, /landKey = firstTry \? btn\.dataset\.popKey : null;/, 'Bites: only a first-try answer bursts into gems');
  assert.match(bb, /streak = 0; setBelly\(0\); stopRing\(\);\n  POP\.reset\(\);/, 'Bites: replay clears leftover effects');
  const burstFn = pop.slice(pop.indexOf('    burst(el, col, k = 20, o = {}) {'), pop.indexOf('    // A volley of fireworks'));
  assert(burstFn && !/SFX\./.test(burstFn), 'Bites: bursts are silent (the game has its own crunch, gulp and burp)');
}

// ── 8. Wiring ──
const at = shell.indexOf('js/game-pop.js');
assert(at > shell.indexOf('js/game-scorecard.js') && at < shell.indexOf('js/game-core.js'), 'game.html loads game-pop.js after the score card, before game-core');
for (const [name, src] of [['vocab-tap', vt], ['spell-word', sw], ['vocab-speed', vs], ['sentence-tap', st], ['sentence-order', so], ['sentence-speed', ssp], ['say-word', stw], ['ask-question', aq], ['say-sentence', sas], ['echo', ec], ['week-boss', wb], ['booha-bites', bb]]) {
  assert.match(src, /const POP = window\.BoohaPop \|\| new Proxy/, `${name}: plays on without game-pop.js`);
}
assert(!/assets: 'booha-assets-2026-61[78]'/.test(read('sw.js')), 'sw.js asset cache bumped for the new CSS / precache entry');
{ const swSrc = read('sw.js'); const core = swSrc.slice(swSrc.indexOf('const CORE_ASSETS = ['), swSrc.indexOf('const ASSET_PREFIXES = ['));
  assert(core.includes('`${BASE}/js/game-pop.js`'), 'game-pop.js is precached at install, so a first offline game still has its effects'); }

console.log('Palette Pop audit passed: palettes avoid verdict hues and read ≥ 4.5:1, the selected/placed exception wins the cascade and loses to verdicts, placed ≠ right, the flash cap keeps wrong feedback, effects capped/idle-safe, roll continues from screen value with one SR line, hot pill contrast OK, wiring present.');
