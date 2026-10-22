#!/usr/bin/env node
'use strict';

// Games Pass 2: the nine curriculum engines stay smooth on older iPads and
// respect reduced motion without breaking self-cleaning effects.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const shell = read('game.html');
const css = read('theme/game.css');
const motion = read('js/game-motion.js');
const utils = read('js/game-utils.js');
const files = [
  'ask-question.js', 'say-sentence.js', 'say-word.js',
  'sentence-order.js', 'sentence-speed.js', 'sentence-tap.js',
  'spell-word.js', 'vocab-speed.js', 'vocab-tap.js',
];
const games = Object.fromEntries(files.map(f => [f, read(`games/${f}`)]));

// One motion tier, set before anything renders.
const motionAt = shell.indexOf('js/game-motion.js');
assert(motionAt > -1, 'game.html must load js/game-motion.js');
assert(motionAt < shell.indexOf('theme/game.css'), 'game-motion.js must load in <head> before game.css');
assert(motionAt < shell.indexOf('js/game-core.js'), 'game-motion.js must load before the engines');
assert.match(motion, /data-motion/, 'game-motion.js must set html[data-motion]');
assert.match(motion, /data-power/, 'game-motion.js must set html[data-power]');
assert.match(motion, /deviceMemory <= 2/, 'game-motion.js must use the Blitz hardware rule');
assert.match(motion, /avg >= 30 && ratio >= 0\.35/, 'game-motion.js must use the Blitz minimal-tier frame rule');

// Reduced motion finishes animations instead of removing them, so
// animationend still fires for effects that remove themselves.
assert.doesNotMatch(css, /animation:\s*none\s*!important/,
  'game.css must not use animation:none !important (animationend would never fire)');
assert.match(css, /animation-duration:\s*\.01ms\s*!important/,
  'game.css reduced motion must shorten animations to .01ms');
assert.match(css, /transition-duration:\s*\.01ms\s*!important/,
  'game.css reduced motion must shorten transitions to .01ms');
assert.match(css, /html\[data-power="minimal"\][^{]*\{\s*animation-iteration-count:\s*1\s*!important/,
  'game.css low power must stop infinite decorative loops after one cycle');
assert.match(utils, /motion\.reduced\(\)\) return;/, 'confetti must be skipped under reduced motion');

// No infinite animation may repaint every frame with box-shadow or filter.
function heavyInfinite(source) {
  const bad = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = re.exec(source))) {
    let i = re.lastIndex, depth = 1;
    while (depth && i < source.length) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      i++;
    }
    const body = source.slice(re.lastIndex, i - 1);
    if (!/(?:^|[\s{;])(?:box-shadow|filter)\s*:/.test(body)) continue;
    const name = m[1].replace(/[-]/g, '\\-');
    if (new RegExp(`animation[^;{}]*\\b${name}\\b[^;{}]*infinite|animation[^;{}]*infinite[^;{}]*\\b${name}\\b`).test(source)) bad.push(m[1]);
  }
  return bad;
}
for (const file of files) {
  assert.deepStrictEqual(heavyInfinite(games[file]), [],
    `${file}: infinite animations must use transform/scale/opacity, not box-shadow or filter`);
}
assert.deepStrictEqual(heavyInfinite(css), [], 'game.css: infinite animations must not repaint box-shadow or filter');

// No orphaned keyframe steps (e.g. "60%{...}" left behind by a deleted
// @keyframes). The browser drops the next rule with them: that is how the
// Tap games' wrong-answer flash lost its animation and piled up on screen.
function orphanSteps(source) {
  let out = '', i = 0;
  const re = /@keyframes\s+[\w-]+\s*\{/g;
  let m;
  while ((m = re.exec(source))) {
    out += source.slice(i, m.index);
    let j = re.lastIndex, depth = 1;
    while (depth && j < source.length) {
      if (source[j] === '{') depth++;
      else if (source[j] === '}') depth--;
      j++;
    }
    i = re.lastIndex = j;
  }
  out += source.slice(i);
  return (out.match(/(?:^|\n)\s*\d+(?:\.\d+)?%(?:\s*,\s*\d+(?:\.\d+)?%)*\s*\{/g) || []).map(x => x.trim());
}
for (const file of files) {
  assert.deepStrictEqual(orphanSteps(games[file]), [], `${file} has keyframe steps outside any @keyframes block`);
}
assert.deepStrictEqual(orphanSteps(css), [], 'game.css has keyframe steps outside any @keyframes block');
assert.match(games['vocab-tap.js'], /\.vt-wrong-flash\{[^}]*animation:vtWrongFlash/, 'vocab-tap wrong flash must animate (and so remove itself)');
assert.match(games['sentence-tap.js'], /\.st-wrong-flash\{[^}]*animation:/, 'sentence-tap wrong flash must animate (and so remove itself)');

// Speed-game timers shrink with transform, not width.
for (const file of ['vocab-speed.js', 'sentence-speed.js']) {
  assert.doesNotMatch(games[file], /heatEl\.style\.width\s*=/, `${file} timer must not animate width`);
  assert.match(games[file], /heatEl\.style\.transform = `scaleX\(\$\{pct\}\)`/, `${file} timer must use scaleX`);
}

// Tap games reveal answers in a quick cascade.
for (const file of ['vocab-tap.js', 'sentence-tap.js']) {
  const m = games[file].match(/const REVEAL_OK_MS = (\d+), REVEAL_MISS_MS = (\d+), REVEAL_END_MS = (\d+);/);
  assert(m, `${file} must declare its reveal pacing`);
  const [ok, miss, end] = m.slice(1).map(Number);
  assert(ok <= 300 && miss <= 350 && end <= 400, `${file} reveal must stay quick (got ${ok}/${miss}/${end})`);
  assert(ok > 140 && miss > 140, `${file} reveal steps must stay above the 140 ms SFX repeat guard`);
}

console.log('Games motion audit passed: shared motion tier, safe reduced motion, compositor-only loops, transform timers, quick Tap reveals, no orphaned keyframe steps.');
