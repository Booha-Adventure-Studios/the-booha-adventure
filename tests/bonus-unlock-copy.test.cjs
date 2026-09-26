#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const unlock = read('js/core/unlock-system.js');
const utsuroba = read('js/utsuroba.js');
const profile = read('adventure-profile.html');

assert.match(unlock, /games\.every\(g => \(wStars\[g\.saveId\] \|\| 0\) >= 2\)/,
  'bonus unlock must still require at least two weekly stars on every game');
assert(utsuroba.includes('Earn at least 2 stars on each of the 9 Maze games this week to open it.'),
  'Akiya locked popup must explain the two-star requirement');
assert(utsuroba.includes('<ruby>迷路<rt>めいろ</rt></ruby>'),
  'Akiya locked popup must include furigana for Maze');
assert.match(utsuroba, /family-room-pop-copy\{[^}]*overflow-wrap:anywhere/,
  'Akiya popup copy must be allowed to wrap on narrow screens');
assert(profile.includes('id="bonus-games-requirement"'),
  'bonus-game shelf must show the shared unlock requirement');
assert(profile.includes('Earn at least 2 stars on each of the 9 Maze games this week to unlock the bonus games.'),
  'bonus-game shelf must explain the two-star requirement');
assert.match(profile, /\.bonus-games-requirement\s*\{[\s\S]*?overflow-wrap:anywhere[\s\S]*?text-wrap:pretty/,
  'bonus-game requirement copy must have responsive wrapping rules');
assert(!profile.includes('.bonus-games-requirement{white-space:nowrap'),
  'bonus-game requirement must not force an unwrappable line');

console.log('Bonus unlock copy test passed: Akiya and the arcade shelf state the shared two-star rule with responsive furigana copy.');
