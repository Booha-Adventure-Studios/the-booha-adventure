#!/usr/bin/env node
'use strict';

// The remote learning-audio location is defined once, in
// js/core/media-config.js, so moving hosts is a one-line change (Nov 2026).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const CONFIG = 'js/core/media-config.js';

// 1. Exactly one definition.
const config = read(CONFIG);
const m = config.match(/const AUDIO_ROOT = '(https:\/\/[^']+)';/);
assert(m, 'media-config.js defines AUDIO_ROOT');
const url = m[1];
assert(/root\.BOOHA_MEDIA = Object\.freeze\(\{ audioRoot: AUDIO_ROOT \}\);/.test(config), 'media-config.js exposes BOOHA_MEDIA.audioRoot');

const host = new URL(url).host;
const app = childProcess.execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString('utf8').split('\0')
  .filter((f) => /\.(m?js|html|json)$/.test(f) && !f.startsWith('tests/') && !f.startsWith('tools/'))
  .filter((f) => fs.existsSync(path.join(root, f)));
const copies = app.filter((f) => f !== CONFIG && read(f).includes(host));
assert.deepStrictEqual(copies, [], `audio host copied outside ${CONFIG}: ${copies.join(', ')}`);

// 2. Every consumer reads the shared value.
const CONSUMERS = {
  'index.html': /const HOMEWORK_AUDIO_ROOT = window\.BOOHA_MEDIA\.audioRoot;/,
  'js/daily-check.js': /const AUDIO_ROOT = window\.BOOHA_MEDIA\.audioRoot;/,
  'js/deck-core.js': /const AUDIO_ROOT = window\.BOOHA_MEDIA\.audioRoot;/,
  'js/game-core.js': /const AUDIO_ROOT = window\.BOOHA_MEDIA\.audioRoot;/,
  'js/stream-core.js': /const AUDIO_ROOT = window\.BOOHA_MEDIA\.audioRoot;/,
  'js/juku-config.js': /const AUDIO_ROOT = window\.BOOHA_MEDIA\.audioRoot;/,
};
for (const [file, re] of Object.entries(CONSUMERS)) assert.match(read(file), re, `${file} reads BOOHA_MEDIA.audioRoot`);
const readers = app.filter((f) => f !== CONFIG && read(f).includes('BOOHA_MEDIA')).sort();
assert.deepStrictEqual(readers.filter((f) => !f.endsWith('.html') || f === 'index.html'),
  Object.keys(CONSUMERS).sort(), 'the consumer list above is complete');

// 3. Every page that runs a consumer loads media-config.js first.
const before = (page, consumerNeedle) => {
  const src = read(page);
  const cfg = src.indexOf('js/core/media-config.js');
  const use = src.indexOf(consumerNeedle);
  assert(cfg >= 0, `${page} loads js/core/media-config.js`);
  assert(use >= 0, `${page} still contains ${consumerNeedle}`);
  assert(cfg < use, `${page} loads media-config.js before ${consumerNeedle}`);
};
before('index.html', 'const HOMEWORK_AUDIO_ROOT');
before('profile.html', 'js/juku-config.js');
before('profile.html', 'js/daily-check.js');
before('game.html', 'js/game-core.js');
before('study-deck.html', "js/stream-core.js'");
before('juku.html', "'js/juku-config.js'");
// Daily Check reminder pages load daily-check.js too.
for (const page of ['maze.html', 'curriculum/pb/games-index.html', 'curriculum/br/games-index.html', 'curriculum/bc/games-index.html']) {
  before(page, 'js/daily-check.js');
}
assert(/'js\/calendar\.js', 'js\/core\/media-config\.js', 'js\/juku-config\.js'/.test(read('juku.html')),
  'juku.html loads media-config.js in its sequential engine list, before juku-config.js');

console.log(`Audio root single source passed: one definition (${host}), ${Object.keys(CONSUMERS).length} consumers, 5 pages load it first.`);
