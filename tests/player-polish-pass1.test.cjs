#!/usr/bin/env node
'use strict';

// Player polish pass 1 (Nov 2026), from the TEST PLAYER playthrough:
// warm-up greeting, Japanese line breaks, Daily Check names and results,
// the page behind the Daily Check, and the combo pill on narrower screens.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// 1. Warm-up greeting: "Hey, Name." is one inline unit, so the flex gap of
//    .entryPlayer cannot put a space before the period; one typeface.
const maze = read('maze.html');
assert.match(maze, /<span class="entryPlayerEn"><span id="mazeNameLead">Hey,<\/span>&nbsp;<strong id="mazeEntryName">[^<]*<\/strong><span id="mazeNameTail">\.<\/span><\/span>/,
  'lead, name and period sit together in .entryPlayerEn');
assert.doesNotMatch(maze, /\.entryMessageEn\{[^}]*Georgia/, 'the warm-up body line uses the card typeface, not Georgia');
assert.match(maze, /\.entryMessageJp,\.entryPlayerJp\{ word-break:keep-all; overflow-wrap:anywhere; line-break:strict; text-wrap:pretty; \}/,
  'warm-up Japanese lines break between words and avoid a lone last word');

// 2. Daily Check.
const dc = read('js/daily-check.js');
assert.match(dc, /\.dc-jp\{[^}]*word-break:keep-all;overflow-wrap:anywhere;line-break:strict;text-wrap:pretty;\}/,
  'Daily Check Japanese prompts break between words and avoid a lone last word');
assert.match(dc, /next\.setAttribute\('aria-label', last \? 'クイズへ \/ To the quiz' : 'つぎ \/ Next'\);/,
  'the next button has an accessible name matching its visible label');
assert.match(dc, /root\.setAttribute\('aria-label', 'デイリーチェック \/ Daily Check'\);/, 'the Daily Check dialog has a name');
assert.match(dc, /const inertBehind = Array\.from\(document\.body\.children\)[\s\S]{0,120}inertBehind\.forEach\(el => \{ el\.inert = true; \}\);\s*document\.body\.appendChild\(root\);/,
  'the page behind the check becomes inert before the dialog opens');
const teardown = dc.slice(dc.indexOf('function teardown()'), dc.indexOf('function bailToCancel()'));
assert.match(teardown, /root\.remove\(\);\s*inertBehind\.forEach\(el => \{ el\.inert = false; \}\);/,
  'teardown restores the page behind the check');
assert.doesNotMatch(dc, /content\.curr\.toUpperCase\(\)\}`; root\.appendChild\(sub\)/, 'results no longer show the bare curriculum code');
assert.match(dc, /const currTile = CURR_TILES\.find\(c => c\.id === content\.curr\);/, 'results show the curriculum name');
assert.match(dc, /en\.textContent = 'Well done! Daily Check complete\.';/, 'results carry one English line');

// 3. Combo pill on narrower screens.
const css = read('theme/game.css');
assert.match(css, /@media \(max-width: 1199px\) \{\s*\.brun-hud \{ gap: 8px; padding: 6px 14px 6px 12px; \}\s*\.brun-hud \.brun-meter \{ display: none; \}\s*\}/,
  'below 1200 px the combo meter steps aside so the pill clears the game title');
assert.match(css, /@media \(max-width: 600px\) \{\s*\.brun-hud, \.brun-hud\.hot, \.brun-hud\[data-level\] \{ font-size: 13px;/,
  'on phones every combo level shrinks so the pill clears the close button');

console.log('Player polish pass 1 passed: greeting, Japanese line breaks, Daily Check names/results/inert, compact combo pill.');
