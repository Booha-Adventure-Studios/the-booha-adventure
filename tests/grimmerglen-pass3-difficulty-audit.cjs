#!/usr/bin/env node
'use strict';

// Pass 3: the three Grimmerglen memory returns must communicate and enforce
// a clear difficulty curve without changing the weekly three-item cadence.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const data = fs.readFileSync(path.join(root, 'js', 'grimmerglen-data.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(data.includes("options: tier === 'start' ? item.full : tier === 'case' ? item.partial : null"),
  'difficulty curve must progress from complete choices to partial clues to no English choices');
assert(data.includes("optionsVisible: tier === 'start'"), 'Starter must be the only tier with visible choices at first render');
assert(data.includes("helpText: tier === 'deep' ? item.jp : null"), 'Deep must retain optional Japanese/furigana support');

const exerciseStart = runtime.indexOf('function renderMariettaMemoryExercise(');
const exerciseEnd = runtime.indexOf('function renderMariettaMemoryReplay(', exerciseStart);
assert(exerciseStart >= 0 && exerciseEnd > exerciseStart, 'memory exercise renderer must be present');
const exercise = runtime.slice(exerciseStart, exerciseEnd);
assert(exercise.includes('const returnNumber = Math.min(3'), 'each memory return must show its 1-of-3 progression position');
assert(exercise.includes('Memory return ${returnNumber} of 3'), 'memory return position must be visible in the popup');
assert(exercise.includes('STARTER MEMORY') && exercise.includes('CASE MEMORY') && exercise.includes('DEEP MEMORY'), 'each tier must have a visible name');
assert(exercise.includes('Choose a helpful sentence'), 'Starter must explain its complete-choice support');
assert(exercise.includes('The clues are smaller now'), 'Case must explain its reduced clue support');
assert(exercise.includes('No English choices this time'), 'Deep must explain its recall-only support');
assert(exercise.includes('tier === \'deep\''), 'Deep-only controls must remain tier-gated');
assert(verify.includes('tests/grimmerglen-pass3-difficulty-audit.cjs'), 'verify.sh must run the Pass 3 difficulty audit');

console.log('Grimmerglen Pass 3 audit passed: Starter, Case, and Deep support levels are distinct, explained, and weekly-progress aware.');
