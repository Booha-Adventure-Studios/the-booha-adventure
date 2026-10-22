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
assert(profile.includes('Earn at least 2 stars on each of the 9 Maze games this week to unlock the arcade.'),
  'bonus-game shelf must explain the two-star requirement');
assert.match(profile, /\.bonus-games-requirement\s*\{[\s\S]*?overflow-wrap:anywhere[\s\S]*?text-wrap:pretty/,
  'bonus-game requirement copy must have responsive wrapping rules');
assert(!profile.includes('.bonus-games-requirement{white-space:nowrap'),
  'bonus-game requirement must not force an unwrappable line');

// Naming (2026-10-22): the 9-game ★★ unlock is the Arcade; "Bonus Games" now
// means the three extra games on the profile, so student copy never mixes them.
assert(!/'Bonus games'|for bonus games|9-game bonus unlock/.test(fs.readFileSync(path.join(__dirname, '..', 'js/menu-core.js'), 'utf8')),
  'the game menu calls the 9-game unlock the Arcade, not bonus games');
assert(!/BONUS ARCADE|unlock the bonus games|ボーナスゲームが/.test(profile), 'the arcade shelf is named Arcade');

console.log('Bonus unlock copy test passed: Akiya and the arcade shelf state the shared two-star rule with responsive furigana copy.');
