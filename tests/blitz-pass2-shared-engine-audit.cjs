#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'js', 'blitz-engine.js'), 'utf8');
const modes = [
  { file: 'vocab-blitz.js', api: 'VocabBlitz', type: 'vocab', legacy: 'vocabBlitz', data: 'vocab.json', saveId: 'vocab', overlay: 'vb-overlay' },
  { file: 'sentence-blitz.js', api: 'SentenceBlitz', type: 'sentences', legacy: 'sentenceBlitz', data: 'sentences.json', saveId: 'sentence', overlay: 'sb-overlay' },
  { file: 'question-blitz.js', api: 'QuestionBlitz', type: 'questions', legacy: 'questionBlitz', data: 'questions.json', saveId: 'question', overlay: 'qb-overlay' },
];

assert.match(index, /const BLITZ_SCRIPT_SOURCES = \[[\s\S]*?js\/blitz-engine\.js[\s\S]*?js\/question-blitz\.js[\s\S]*?\];/,
  'index must retain the ordered shared Blitz module list for lazy loading');
assert.match(index, /function loadBlitzEngines\(\)[\s\S]*?\.reduce\(/,
  'index must load the shared Blitz modules sequentially on demand');
for (const file of ['blitz-engine.js', ...modes.map(mode => mode.file)]) {
  assert(!index.includes(`<script src="js/${file}"></script>`),
    `${file} must not be eagerly parsed on the hub`);
}

for (const mode of modes) {
  const source = fs.readFileSync(path.join(root, 'js', mode.file), 'utf8');
  assert.match(source, /BoohaBlitzEngine\.create\(/, `${mode.file} must use the shared engine`);
  assert.match(source, /return blitzEngine\.launch\(\{ curr, monthSlug, weekNumber \}\);/,
    `${mode.file} public launch must delegate to the shared engine`);
  assert.match(source, new RegExp(`gameType: '${mode.type}'`), `${mode.file} must keep its score namespace`);
  assert.match(source, new RegExp(`legacyKey: '${mode.legacy}'`), `${mode.file} must keep its legacy score namespace`);
  assert.match(source, new RegExp(`dataFile: '${mode.data.replace('.', '\\.')}'`), `${mode.file} must keep its data file`);
  assert.match(source, new RegExp(`saveId: '${mode.saveId}'`), `${mode.file} must keep its game-end identity`);
  assert.match(source, new RegExp(`overlayId: '${mode.overlay}'`), `${mode.file} must keep its overlay identity`);
  assert(!source.includes('fetch('), `${mode.file} must not own a second data-loading path`);
  assert(!/function\s+(startGame|handleAnswer|correctDetonate|showWin|megaCelebrate)\s*\(/.test(source),
    `${mode.file} must not retain a duplicate active game lifecycle`);
  assert(!source.includes("booha:gameEnd"), `${mode.file} must let the shared engine dispatch game-end events`);
}

for (const token of [
  'function correctDetonate',
  'function handleAnswer',
  'function showWrongPopup',
  'function showWin',
  'function celebrate',
  'function saveBestTime',
  'booha:gameEnd',
  'scheduleTimerTick',
]) {
  assert(engine.includes(token), `shared engine must own ${token}`);
}

const oldBytes = modes.reduce((total, mode) => total + fs.statSync(path.join(root, 'js', mode.file)).size, 0);
assert(oldBytes < 100000, 'shared mode skins should remain below the previous three-file payload size');
assert.match(engine, /function openRecordsPanel\(ctx = \{\}\)/,
  'the records panel must live in the shared engine');
assert.match(engine, /getRecordScoreFor\(game\.id, RECORD_LEGACY_KEYS\[game\.id\], curr\)/,
  'the records panel must read all-time scores through shared storage');
assert.match(engine, /getWeeklyScoreFor\(game\.id, curr, weekId\)/,
  'the records panel must read weekly scores through shared storage');
const recordsPanel = engine.slice(engine.indexOf('function buildRecordsPanel'), engine.indexOf('function renderRecordsPanel'));
assert.match(recordsPanel, /role', 'dialog'/,
  'the shared records panel must expose dialog semantics');
assert.match(recordsPanel, /data-record-scope="weekly"/,
  'the records panel must expose the weekly/all-time switch');
assert.match(recordsPanel, /#blitz-rec-list \{ display: flex; flex-direction: column;/,
  'the records panel must use a compact vertical game list');
assert.match(engine, /const rows = RECORD_GAMES\.map\(game => \(\{/,
  'the records panel must render all three shared game records');
assert.doesNotMatch(recordsPanel, /backdrop-filter/,
  'the records panel must not spend on full-screen blur passes');
assert.match(engine, /event\.key === 'Escape'/,
  'the records panel must close with Escape');
assert.match(index, /BoohaBlitzEngine\.openRecordsPanel\(/,
  'the HUB records action must use the shared panel API');

console.log('Blitz Pass 2 shared-engine audit passed: all three public launch APIs, score namespaces, data paths, game-end IDs, and lifecycle ownership are aligned.');
