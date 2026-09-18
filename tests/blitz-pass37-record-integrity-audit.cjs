const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const dayRecord = fs.readFileSync('js/core/day-record.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.doesNotMatch(engine, /runEligibleForRecord|CLEAN_CLEAR_MAX_MISTAKES|WRONG_ANSWER_PENALTY_MS/,
  'the old partial-credit record path must be removed');
assert.match(engine, /const isPerfectRun = current === initialQueueLength && streak === initialQueueLength && bestStreak === initialQueueLength && mistakeCount === 0;/,
  'a result must require 15 correct answers, a full streak, and zero mistakes');
assert.doesNotMatch(engine, /if \(!isPerfectRun\) return;/,
  'normal completed runs must not be blocked by the perfect-run celebration gate');
assert.match(engine, /const recordEligible = true;[\s\S]*?clearTier = isPerfectRun \? 'perfect' : 'clear';/,
  'normal completed runs must save as clears while perfect runs retain their tier');
assert.match(engine, /recordEligible,[\s\S]*?time: ms,[\s\S]*?clearTier,[\s\S]*?mistakes: mistakeCount/,
  'completion events must retain timing and clear metadata');
assert.match(dayRecord, /recordEligible = true/,
  'day records must remain backward compatible for existing non-Blitz events');
assert.match(dayRecord, /completed && typeof time === 'number' && Number\.isFinite\(time\)/,
  'completed timed runs must enter the weekly completion record');
assert.match(verify, /tests\/blitz-pass37-record-integrity-audit\.cjs/,
  'verify.sh must run the Blitz record-integrity audit');

console.log('Blitz record-integrity audit passed: completed runs save, with perfect-run metadata preserved.');
