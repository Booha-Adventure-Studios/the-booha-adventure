#!/usr/bin/env node
'use strict';

// Pass 9G: Marietta waits for an unfinished memory with her waiting pose,
// and answer choices do not teach the correct position by staying first.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const typing = fs.readFileSync(path.join(root, 'js', 'grimmerglen-typing.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(runtime.includes('const mariettaWaitingImg = new Image();'),
  'runtime must preload Marietta’s waiting sprite');
assert(runtime.includes('MARIETTA.poses[4]'),
  'waiting sprite must use marietta_05.webp');
assert(runtime.includes('function isMariettaWaitingForMemory()'),
  'runtime must identify when Marietta is waiting for an unfinished memory');
assert(runtime.includes('const waitingForMemory = isMariettaWaitingForMemory();'),
  'Marietta drawing must switch based on memory-waiting state');
assert(runtime.includes('actorCtx.shadowBlur = waitingForMemory ? 12 : 0;'),
  'Marietta waiting state must add a glow');
assert(fs.existsSync(path.join(root, 'assets/img/grimmerglen/marietta/marietta_05.webp')),
  'Marietta waiting sprite must exist on disk');

assert(typing.includes('function reorderOptions(options)'),
  'typing engine must expose per-render answer reordering');
assert(typing.includes('const displayOptions = hasOptions ? reorderOptions(ex.options) : [];'),
  'typing choices must use the reordered list');
assert(typing.includes('Math.random()'),
  'answer choice order must vary between visits');
assert(typing.includes('reordered[0] === options[0]'),
  'the authored correct-first choice must be moved away from the first slot');

assert(verify.includes('tests/grimmerglen-pass9g-audit.cjs'),
  'verify.sh must run the Pass 9G pose and answer-order audit');

console.log('Grimmerglen Pass 9G audit passed: Marietta waiting pose/glow and shuffled answer choices are wired.');
