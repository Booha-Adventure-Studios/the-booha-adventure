#!/usr/bin/env node
'use strict';

// Pass 9F: memory returns keep the next clue visible, and the final return
// offers a replayable English/furigana sentence without clipboard shortcuts.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const typing = fs.readFileSync(path.join(root, 'js', 'grimmerglen-typing.js'), 'utf8');
const data = fs.readFileSync(path.join(root, 'js', 'grimmerglen-data.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

const successStart = runtime.indexOf('function renderMariettaMemorySuccess(');
const successEnd = runtime.indexOf('function finishGrimmerglenCelebration(', successStart);
assert(successStart >= 0 && successEnd > successStart, 'memory success renderer must be present');
const success = runtime.slice(successStart, successEnd);
assert(!success.includes('Here is the next memory I am trying to remember.'),
  'partial memory returns must not use the generic next-memory sentence');
assert(success.includes('nextStory.en') && success.includes('nextStory.jp'),
  'partial memory returns must repeat the next memory hint in both languages');
assert(success.includes('id="mg-memory-see-again"'),
  'the final returned memory must include a See again action');
assert(success.includes('renderMariettaMemoryReplay(object, memoryComplete)'),
  'See again must open the memory replay');
assert(success.includes('if (memoryComplete) startGrimmerglenCelebration();'),
  'the existing final-memory celebration must remain available after the card');

const replayStart = runtime.indexOf('function renderMariettaMemoryReplay(');
const replayEnd = runtime.indexOf('function renderMariettaMemorySuccess(', replayStart);
assert(replayStart >= 0 && replayEnd > replayStart, 'memory replay renderer must be present');
const replay = runtime.slice(replayStart, replayEnd);
assert(replay.includes('mg-memory-replay-en') && replay.includes('mg-memory-replay-jp'),
  'memory replay must render English and furigana answer lanes');
assert(replay.includes('typeText(enEl') && replay.includes('typeText(jpEl'),
  'memory replay must type the English and Japanese answers');
assert(replay.includes('id="mg-memory-replay-close"'),
  'memory replay must have a close button');
assert(replay.includes('renderMariettaMemorySuccess(object, { memoryComplete })'),
  'closing the replay must return to the saved-memory card');

assert(data.includes('answerEn: item.target') && data.includes('answerJp: item.jp'),
  'memory exercises must expose the full answer for replay');
assert(data.includes("options: [item.partial[0]]") && data.includes('helpText: item.jp'),
  'the last memory exercise must retain a short hint and optional furigana help');
assert(typing.includes("input.addEventListener('copy'"),
  'typing input must block copying');
assert(typing.includes("input.addEventListener('cut'"),
  'typing input must block cutting');
assert(runtime.includes("['copy', 'cut', 'paste'].forEach"),
  'Marietta memory cards must block clipboard actions');
assert(runtime.includes('mg-memory-replay{user-select:none'),
  'memory replay must disable text selection');
assert(verify.includes('tests/grimmerglen-pass9f-audit.cjs'),
  'verify.sh must run the Pass 9F memory-return audit');

console.log('Grimmerglen Pass 9F audit passed: repeated hints, final-memory replay, typewriter answer, and clipboard blocking are wired.');
