#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(ROOT, 'js/blitz-engine.js'), 'utf8');
const skins = fs.readFileSync(path.join(ROOT, 'js/core/booha-skins.js'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

[
  'assets/img/blitz/records-backdrop.webp',
  'assets/img/blitz/medal-circus.webp',
  'assets/img/blitz/medal-spooky.webp',
  'assets/img/blitz/medal-fireflies.webp',
].forEach(file => assert.ok(fs.existsSync(path.join(ROOT, file)), `missing ${file}`));

assert.match(engine, /id="blitz-rec-awake-main"/);
assert.match(engine, /id="blitz-rec-collection"/);
assert.match(engine, /RECORD_ASSET_ROOT \+ 'vocab-circus'/);
assert.match(engine, /RECORD_ASSET_ROOT \+ 'sentence-spooky'/);
assert.match(engine, /RECORD_ASSET_ROOT \+ 'question-fireflies'/);
assert.match(engine, /RECORD_ASSET_ROOT \+ 'medal-circus'/);
assert.match(engine, /RECORD_ASSET_ROOT \+ 'medal-spooky'/);
assert.match(engine, /RECORD_ASSET_ROOT \+ 'medal-fireflies'/);
assert.match(engine, /blitz-rec-play/);
assert.match(engine, /recordDateLabel\(score\.date\)/);
assert.match(engine, /playGame: gameType/);
assert.match(skins, /function isCollected\(id\)/);
assert.match(skins, /function collectedSkinIds/);
assert.match(skins, /boohaSkinCollection/);
assert.match(index, /playGame: type => launchHomeworkBlitz\(type, activeTab\)/);

console.log('Blitz Records redesign audit passed: scene backdrop, medals, payoff language, actionable rows, dates, and persistent collection history are wired.');
