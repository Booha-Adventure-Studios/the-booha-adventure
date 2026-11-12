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
  document: { documentElement: { dataset: {} }, body: null, createElement: () => ({ getContext: () => null, style: {} }), querySelector: () => null },
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
const swPal = 'html[data-skin="v2"][data-curriculum] .sw-tile.sw-pal[data-ti]';
const swSkin = 'html[data-skin="v2"][data-curriculum] .sw-tile[data-ti]';
assert(sw.includes(swPal + '{') && gte(spec(swPal), spec(swSkin)), 'Spell: tile palette rule outranks the skin tile rule (both !important)');
assert.match(sw, /\.sw-slot\.filled\.sw-pp\{\s*box-shadow:[^}]*\}/, 'Spell: placed slots get the colour ring');
assert(!/\.sw-slot\.filled\.sw-pp\{[^}]*!important/.test(sw), 'Spell: the placed ring is NOT !important, so the skin\'s !important correct/wrong fills win');
assert.match(sw, /sl\.classList\.remove\('sw-wrong', 'filled', 'empty'\);\s*sl\.classList\.add\('sw-correct'\);/, 'Spell: grading drops "filled", so the placed ring cannot sit on a verdict');

const vsPal = 'html[data-skin="v2"][data-curriculum] .vs-choice.vs-pal[data-ci]';
const vsSkin = 'html[data-skin="v2"][data-curriculum] .vs-choice[data-ci]';
assert(vs.includes(vsPal + '{') && gte(spec(vsPal), spec(vsSkin)), 'Speed: choice palette ring outranks the skin card rule');
assert(!/\.vs-choice\.vs-pal\[data-ci\][^{]*\{[^}]*!important/.test(vs), 'Speed: the ring is NOT !important, so the skin\'s !important correct/wrong fills win the moment a card is tapped');
assert.match(vs, /POP\.newRound\(choices\.map\(\(_, ci\) => `vs\$\{idx\}-\$\{ci\}`\)\);/, 'Speed: four fresh colours per question');
assert.match(vs, /U\.impact\(\{ source: btn, outcome: 'miss', flavor: 'speed', squash: false \}\);[^\n]*\n\s*POP\.wrong\(btn\);/, 'Speed: a wrong pick crumbles after the existing recoil');
assert.match(vs, /POP\.fizzle\(heatEl\);/, 'Speed: a timeout smokes the timer bar');

// ── 3. "Placed", never "right" ──
for (const [name, src, rule] of [['Tap', vt, /\.vt-jp-slot\.has-pair\.vt-pp:not\(\.slot-correct\):not\(\.slot-wrong\)\{([^}]*)\}/], ['Spell', sw, /\.sw-slot\.filled\.sw-pp\{([^}]*)\}/]]) {
  const body = src.match(rule)[1];
  assert(!/background/.test(body), `${name}: a placed pair is a ring, never a fill`);
  assert(!/--ok|#22c55e|#1f7a46/i.test(body), `${name}: a placed pair never uses the correct colour`);
}
assert.match(vt, /\.vt-drop\.filled::before\{\s*content:'';/, 'Tap: the placed pin is ::before (the skin keeps ::after for ✓/✗)');
assert(!/\.vt-drop\.filled::before\{[^}]*content:'[^']/.test(vt), 'Tap: the pin carries no symbol');

// ── 4. The flash cap only drops the overlay ──
const wrongBranch = vt.slice(vt.indexOf("el.classList.add('slot-wrong');"), vt.indexOf('flashWrong();', vt.indexOf("el.classList.add('slot-wrong');")));
assert(/U\.playSFX\('fart'\)/.test(wrongBranch) && /POP\.wrong\(el\)/.test(wrongBranch) && /U\.impact\(\{ source: el, outcome: 'miss'/.test(wrongBranch),
  'Tap: the orange fill, ✗, bonk, recoil and debris all happen before flashWrong()');
assert.match(vt, /function flashWrong\(\) \{\s*if \(!POP\.canFlash\(\)\) return;/, 'Tap: a capped flash returns before drawing anything else');
assert.match(pop, /function canFlash\(\) \{[^}]*flashes\.length >= 3/, 'at most 3 bright flashes a second');

// ── 5. Pileup: caps, reduced motion, idle stop, cleanup ──
assert.match(pop, /const POOL = 360/, 'one fixed particle pool');
assert.match(pop, /const cap = \(\) => \(power\(\) === 'minimal' \? 50 : power\(\) === 'reduced' \? 150 : POOL\)/, 'tier caps');
assert.match(pop, /function spawn\(p\) \{\s*if \(reduced\(\) \|\| live >= cap\(\)/, 'nothing flies under reduced motion, never past the cap');
assert.match(pop, /const MAX_VOICES = 10/, 'never more than 10 effect voices at once');
assert.match(pop, /if \(!busy\(\)\) \{ if \(g\) \{[^}]*clearRect[^}]*\} return; \}/, 'the canvas loop stops (and clears) when idle');
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

// ── 8. Wiring ──
const at = shell.indexOf('js/game-pop.js');
assert(at > shell.indexOf('js/game-scorecard.js') && at < shell.indexOf('js/game-core.js'), 'game.html loads game-pop.js after the score card, before game-core');
for (const [name, src] of [['vocab-tap', vt], ['spell-word', sw], ['vocab-speed', vs]]) {
  assert.match(src, /const POP = window\.BoohaPop \|\| new Proxy/, `${name}: plays on without game-pop.js`);
}
assert(!/assets: 'booha-assets-2026-617'/.test(read('sw.js')), 'sw.js asset cache bumped for the new CSS');

console.log('Palette Pop audit passed: palettes avoid verdict hues and read ≥ 4.5:1, the selected/placed exception wins the cascade and loses to verdicts, placed ≠ right, the flash cap keeps wrong feedback, effects capped/idle-safe, roll continues from screen value with one SR line, hot pill contrast OK, wiring present.');
