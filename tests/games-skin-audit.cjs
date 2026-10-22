#!/usr/bin/env node
'use strict';

// Games Pass 10: the v2 in-game colour system (theme/game-skin.css).
// Three layers (world / lane / meaning) plus the Words-lane card surface,
// switched on per lane so no game is half-converted.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const css = read('theme/game-skin.css');
const html = read('game.html');
const core = read('js/game-core.js');
const utils = read('js/game-utils.js');
const menu = read('js/menu-core.js');

// Loaded after game.css
const a = html.indexOf('href="theme/game.css"'), b = html.indexOf('href="theme/game-skin.css"');
assert(a > -1 && b > a, 'game.html must load game-skin.css right after game.css');

// Every rule is scoped to the v2 skin, so un-migrated games are untouched.
const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
const selectors = [];
let depth = 0, buf = '';
for (const ch of body) {
  if (ch === '{') { if (depth === 0) selectors.push(buf.trim()); depth++; buf = ''; }
  else if (ch === '}') { depth--; buf = ''; }
  else if (depth === 0) buf += ch;
}
// Split a selector list on top-level commas (not inside quotes, () or []).
function splitSelectors(sel) {
  const out = []; let cur = '', depth = 0, quote = null;
  for (const ch of sel) {
    if (quote) { if (ch === quote) quote = null; cur += ch; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
assert(selectors.length > 60, `expected the skin rules, found ${selectors.length}`);
for (const sel of selectors) {
  for (const part of splitSelectors(sel)) {
    assert(/^html\[data-skin="v2"\]/.test(part.trim()), `unscoped selector in game-skin.css: ${part.trim()}`);
  }
}
assert(!/@keyframes/.test(css), 'the skin adds no animations of its own');

// World art exists (paths are relative to theme/) and stays within the menu-art budget.
for (const m of css.matchAll(/url\("\.\.\/(assets\/img\/menu\/[a-z-]+\.webp)"\)/g)) {
  assert(fs.existsSync(path.join(ROOT, m[1])), `world art ${m[1]} must exist`);
}
for (const c of ['pb', 'br', 'bc']) {
  assert(new RegExp(`html\\[data-skin="v2"\\]\\[data-curriculum="${c}"\\] \\{[^}]*--world-art:`).test(css), `${c} must define its world art`);
  assert(menu.includes(`assets/img/menu/`), 'the menu and the games share the same forest art');
}
assert(/\[data-power="minimal"\] body::before \{ filter: none; \}/.test(css), 'slow devices drop the backdrop blur');

// Lanes: every game has one, matching the menu rows; only finished lanes are v2.
const lanes = Object.fromEntries([...core.matchAll(/'([a-z-]+)':\s+\['(words|sentences|listen|extra)'/g)].map(m => [m[1], m[2]]));
const expected = { 'vocab-tap': 'words', 'spell-word': 'words', 'vocab-speed': 'words', 'sentence-tap': 'sentences', 'sentence-order': 'sentences', 'sentence-speed': 'sentences', 'say-word': 'listen', 'say-sentence': 'listen', 'ask-question': 'listen', 'booha-bites': 'extra', 'echo': 'extra', 'week-boss': 'extra' };
assert.deepStrictEqual(lanes, expected, 'game-core lanes must match the menu lanes');
assert.match(core, /const V2_LANES = new Set\(\['words', 'sentences'\]\);/, 'Words (Pass 10) and Sentences (Pass 11) are on v2');
// Pass 11: Sentences lane on notebook paper
for (const sel of ['.so-answer-zone', '.so-placed-chip.so-correct', '.so-placed-chip.so-wrong', '.st-en-card', '.st-jp-slot.slot-correct', '.st-jp-slot.slot-wrong', '.ssp-choice.ssp-correct', '.ssp-choice.ssp-wrong']) {
  assert(css.includes(`html[data-skin="v2"][data-curriculum] ${sel}`), `the Sentences surface must style ${sel}`);
}
assert.match(css, /\.ssp-choice\.ssp-correct::before \{ content: '✓ '/); assert.match(css, /\.st-jp-slot\.slot-wrong \.st-drop::after \{ content: ' ✗'; \}/);
assert.match(css, /\.st-jp-slot\.has-pair \{ background: var\(--jp-card\); box-shadow: inset 0 0 0 3px var\(--lane\)/, 'Sentence Tap pending uses the lane colour');
assert.match(utils, /\.st-curriculum, \.so-curriculum, \.ssp-curriculum/, 'Sentences games get their own name as the title');
assert.match(core, /if \(V2_LANES\.has\(lane\)\) document\.documentElement\.setAttribute\('data-skin', 'v2'\);/);
assert.match(utils, /if \(root\.getAttribute\('data-skin'\) === 'v2'\) \{/, 'the lane chip is only added to v2 games');

// Meaning layer: never themed, icon + lightness, and "pending" never uses the wrong colour.
assert.match(css, /--ok: #1f7a46;/); assert.match(css, /--bad: #ff7a45;/);
assert.match(css, /\.vs-choice\.vs-correct::before \{ content: '✓ '/); assert.match(css, /\.vs-choice\.vs-wrong::before \{ content: '✗ '/);
assert.match(css, /\.vt-jp-slot\.slot-correct \.vt-drop::after \{ content: ' ✓'; \}/);
assert.match(css, /\.vt-jp-slot\.has-pair \{\s*box-shadow: inset 0 0 0 3px var\(--lane\)/, 'paired-but-unchecked uses the lane colour, not orange');

// Contrast (WCAG): text on the surfaces the skin introduces.
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
const lum = c => { const [r, g, b2] = hex(c).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b2; };
const ratio = (x, y) => { const [l1, l2] = [lum(x), lum(y)].sort((p, q) => q - p); return (l1 + 0.05) / (l2 + 0.05); };
for (const [fg, bg, what] of [['#2b1a05', '#fff8e6', 'card ink on card'], ['#ffffff', '#1f7a46', 'correct'], ['#2a0d02', '#ff7a45', 'wrong'],
  ['#2b1a05', '#f5b83d', 'check button'], ['#3a1f12', '#fff6ea', 'Pre-Boo ink'], ['#7a4b00', '#fbe7c0', 'Pre-Boo lane chip'], ['#2d2418', '#efe2c6', 'paper ink'], ['#12365c', '#dceeff', 'sky chip'], ['#134b80', '#d6e8f8', 'Pre-Boo sky chip'], ['#eef6ea', '#07120d', 'Boo-riculum ink'], ['#fff0f8', '#120814', 'Boo-Continuum ink']]) {
  assert(ratio(fg, bg) >= 4.5, `${what} contrast ${ratio(fg, bg).toFixed(2)} must be ≥ 4.5`);
}
// Correct and wrong must differ in lightness, not just hue.
assert(ratio('#1f7a46', '#ff7a45') >= 1.8, 'correct and wrong fills must differ clearly in lightness');

console.log('Games skin audit passed: v2 layers scoped, Words on cards, Sentences on paper, lanes match the menu, meaning colours fixed with icons, contrast OK.');
