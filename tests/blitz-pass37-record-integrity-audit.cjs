const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const dayRecord = fs.readFileSync('js/core/day-record.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.doesNotMatch(engine, /runEligibleForRecord|CLEAN_CLEAR_MAX_MISTAKES|WRONG_ANSWER_PENALTY_MS/,
  'the old partial-credit record path must be removed');
assert.match(engine, /const isPerfectRun = current === initialQueueLength && streak === initialQueueLength && bestStreak === initialQueueLength && mistakeCount === 0;/,
  'a result must require 15 correct answers, a full streak, and zero mistakes');
assert.match(engine, /if \(!isPerfectRun\) return;/,
  'failed runs must return before saving or dispatching completion');
assert.match(engine, /const recordEligible = true;[\s\S]*?clearTier = 'perfect';/,
  'every emitted Blitz completion must be an eligible perfect clear');
assert.match(engine, /recordEligible,[\s\S]*?time: ms,[\s\S]*?clearTier,[\s\S]*?mistakes: mistakeCount/,
  'completion events must retain timing and clear metadata');
assert.match(dayRecord, /recordEligible = true/,
  'day records must remain backward compatible for existing non-Blitz events');
assert.match(dayRecord, /completed && typeof time === 'number' && Number\.isFinite\(time\)/,
  'completed timed runs must enter the weekly completion record');
assert.match(verify, /tests\/blitz-pass37-record-integrity-audit\.cjs/,
  'verify.sh must run the Blitz record-integrity audit');

console.log('Blitz record-integrity audit passed: only perfect runs can save or emit completion.');
