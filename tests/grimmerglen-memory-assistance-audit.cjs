#!/usr/bin/env node
'use strict';

// Memory assistance contract: every tier uses the same three-return teaching
// rhythm, while the authored sentence itself still comes from that tier.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen-data.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const typing = fs.readFileSync(path.join(root, 'js', 'grimmerglen-typing.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(dataSource, sandbox, { filename: 'grimmerglen-data.js' });
const data = sandbox.window.GRIMMERGLEN_DATA;

for (const type of data.objectTypes) {
  for (const tier of ['start', 'case', 'deep']) {
    const entry = data.tierMemories[type][tier];
    assert.strictEqual(entry.full.length, 3, `${type} ${tier} must have three full choices for return 1 of 3`);
    assert.strictEqual(entry.partial.length, 3, `${type} ${tier} must have three partial choices for return 2 of 3`);
    assert.strictEqual(new Set(entry.full).size, 3, `${type} ${tier} full choices must be unique`);
    assert.strictEqual(new Set(entry.partial).size, 3, `${type} ${tier} partial choices must be unique`);
  }
}

const exerciseStart = runtime.indexOf('function renderMariettaMemoryExercise(');
const exerciseEnd = runtime.indexOf('function renderMariettaMemoryReplay(', exerciseStart);
assert(exerciseStart >= 0 && exerciseEnd > exerciseStart, 'memory exercise renderer must be present');
const exercise = runtime.slice(exerciseStart, exerciseEnd);
assert.match(exercise, /const authoredMemory = DATA\.tierMemories\?\./,
  'live exercises must use the selected tier authoring record');
assert.match(exercise, /options: returnNumber === 1 \? authoredMemory\.full : returnNumber === 2 \? authoredMemory\.partial : null/,
  'return 1 shows full choices, return 2 shows partial choices, and return 3 shows none');
assert.match(exercise, /optionsVisible: returnNumber < 3/,
  'full and partial choices must be visible before typing');
assert.match(exercise, /showHint: returnNumber >= 2/,
  'Need a hint must be absent on return 1 and present on returns 2 and 3');
assert.match(exercise, /onHint: \(\) => renderMariettaMemoryReplay\(object, false, \(\) => renderMariettaMemoryExercise\(object\), tier\)/,
  'Need a hint must open the typed-answer help popup and return to the same exercise');
assert.match(exercise, /const recheckHTML = returnNumber === 3/,
  'the existing check-again action must remain limited to the final return');

assert.match(typing, /const showHintToggle = ex\.showHint === true/,
  'the typing widget must support an explicit hint action without requiring choices');
assert.match(typing, /if \(typeof cb\.onHint === 'function'\)/,
  'the hint action must be delegated to the memory popup owner');
assert.match(typing, /@keyframes mgtyHintGlow/,
  'Need a hint must have a subtle glow treatment');

const replayStart = runtime.indexOf('function renderMariettaMemoryReplay(');
const replayEnd = runtime.indexOf('function renderMariettaMemorySuccess(', replayStart);
assert(replayStart >= 0 && replayEnd > replayStart, 'memory help popup renderer must be present');
const replay = runtime.slice(replayStart, replayEnd);
assert.match(replay, /id="mg-memory-replay-en"/,
  'memory help popup must type the English answer');
assert.match(replay, /id="mg-memory-replay-jp"/,
  'memory help popup must type the furigana answer');
assert.match(replay, /id="mg-memory-replay-x"/,
  'memory help popup must include an X close button');
assert.match(replay, /const closeReplay = \(\) =>/,
  'memory help popup must centralize its close behavior');

assert.match(verify, /tests\/grimmerglen-memory-assistance-audit\.cjs/,
  'verify.sh must run the memory assistance audit');

console.log('Grimmerglen memory-assistance audit passed: all tiers use full, partial, and hint-only returns with a closeable typed-answer popup.');
