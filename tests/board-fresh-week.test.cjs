#!/usr/bin/env node
'use strict';

// Step 4 (2026-11-08): a brand-new week starts quiet on the curriculum board.
// Live week + save ready + nothing played → "Try me!" spotlit, others softened,
// extra-games row folded behind one button, no arcade bar yet. Folded (never
// flashing open) until the save is ready; the student can always open it.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const src = read('js/menu-core.js');
const css = read('theme/menu.css');

// ── 1. boardView truth table (pure; loaded without a DOM) ──
const ctx = { window: {}, console };
ctx.window = ctx;
vm.runInNewContext(src, ctx);
const view = o => JSON.parse(JSON.stringify(ctx.BoohaMenu.boardView(o)));

assert.deepStrictEqual(view({ live: true, ready: true, anyPlayed: false, extrasOpened: false }),
  { fresh: true, foldExtras: true }, 'brand-new live week: quiet board');
assert.deepStrictEqual(view({ live: true, ready: true, anyPlayed: true, extrasOpened: false }),
  { fresh: false, foldExtras: false }, 'after the first play everything is back');
assert.deepStrictEqual(view({ live: true, ready: true, anyPlayed: false, extrasOpened: true }),
  { fresh: true, foldExtras: false }, 'the student can open the extras any time');
assert.deepStrictEqual(view({ live: true, ready: false, anyPlayed: false, extrasOpened: false }),
  { fresh: false, foldExtras: true }, 'before the save is ready: folded, no spotlight yet (no flash)');
assert.deepStrictEqual(view({ live: false, ready: true, anyPlayed: false, extrasOpened: false }),
  { fresh: false, foldExtras: false }, 'practice weeks are never quiet-moded');

// ── 2. Wiring in menu-core.js ──
assert.match(src, /var view = boardView\(\{ live: live, ready: !!window\.BOOHA_READY, anyPlayed: anyPlayed, extrasOpened: extrasOpened \}\);/,
  'paint() decides from live week, save readiness, plays and the student\'s choice');
assert.match(src, /t\.classList\.toggle\('bm-spotlight', view\.fresh && i === firstOpen\)/, 'only the "Try me!" tile is spotlit');
assert.match(src, /if \(n > 0 \|\| played\) anyPlayed = true;/, 'any star or score on the nine ends quiet mode');
assert.match(src, /if \(n > 0 \|\| pts > 0\) anyPlayed = true;/, 'so does any extra-game result');
const freshBlock = src.slice(src.indexOf('if (view.fresh) {'), src.indexOf("tally.appendChild(el('div', 'bm-tally-rule'));"));
assert(/return;/.test(freshBlock) && freshBlock.length < 400, 'a fresh week skips the arcade bar');
assert.match(src, /extraToggle\.setAttribute\('aria-controls', 'bm-extra-lane'\)/, 'the fold button controls the row');
assert.match(src, /extraToggle\.setAttribute\('aria-expanded', view\.foldExtras \? 'false' : 'true'\)/, 'and reports its state');
assert.match(src, /extrasOpened = true;[\s\S]{0,60}paint\(\);/, 'tapping it opens the row');

// ── 3. Styles ──
assert.match(css, /\.bm-lane\[hidden\], \.bm-extra-toggle\[hidden\] \{ display: none !important; \}/,
  '[hidden] must beat .bm-lane { display: grid }');
assert.match(css, /\.bm-fresh \.bm-lane:not\(\.bm-lane-extra\) \.tile:not\(\.bm-spotlight\) \{ opacity: \.62;/, 'others soften');
assert.match(css, /\.bm-fresh \.bm-lane \.tile:not\(\.bm-spotlight\):hover,\s*\.bm-fresh \.bm-lane \.tile:not\(\.bm-spotlight\):focus-visible \{ opacity: 1;/,
  'softened tiles come back to full on hover/focus');
assert.match(css, /\.bmenu \.tile\.bm-spotlight::before \{[^}]*animation: bmSpot/, 'spotlight pulse lives on a pseudo-element');
assert.match(css, /@keyframes bmSpot \{ 0%, 100% \{ opacity: \.45; \} 50% \{ opacity: 1; \} \}/, 'opacity-only pulse');

console.log('Board fresh-week test passed: spotlight, softened tiles, folded extras, no arcade bar until the first play.');
