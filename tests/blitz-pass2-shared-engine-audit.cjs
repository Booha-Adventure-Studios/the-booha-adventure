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

const engineTag = index.indexOf('<script src="js/blitz-engine.js"></script>');
assert(engineTag >= 0, 'index must load the shared Blitz engine');

for (const mode of modes) {
  const source = fs.readFileSync(path.join(root, 'js', mode.file), 'utf8');
  const modeTag = index.indexOf(`<script src="js/${mode.file}"></script>`);
  assert(modeTag > engineTag, `${mode.file} must load after the shared Blitz engine`);
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
assert.match(fs.readFileSync(path.join(root, 'js', 'vocab-blitz.js'), 'utf8'),
  /BoohaBlitzEngine\.getRecordScoreFor/,
  'the fastest-player panel must read through shared score storage');

console.log('Blitz Pass 2 shared-engine audit passed: all three public launch APIs, score namespaces, data paths, game-end IDs, and lifecycle ownership are aligned.');
