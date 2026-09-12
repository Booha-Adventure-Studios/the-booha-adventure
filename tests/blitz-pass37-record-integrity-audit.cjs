const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const dayRecord = fs.readFileSync('js/core/day-record.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /let runEligibleForRecord = true;/,
  'a fresh Blitz run must start record-eligible');
assert.match(engine, /btn\.classList\.add\('wrong'\);[\s\S]*?runEligibleForRecord = false;/,
  'any wrong answer must permanently disqualify the current run from records');
assert.match(engine, /function recoverFromWrong\(\)[\s\S]*?startTime = performance\.now\(\);[\s\S]*?renderQuestion\(true\)/,
  'retry must restart on the same missed question');
const retryStart = engine.indexOf('function recoverFromWrong()');
const retryEnd = engine.indexOf('function handleAnswer', retryStart);
assert(retryStart >= 0 && retryEnd > retryStart, 'retry function must remain present and bounded');
assert(!engine.slice(retryStart, retryEnd).includes('runEligibleForRecord = true;'),
  'retry must not restore record eligibility');
assert.match(engine, /const recordEligible = runEligibleForRecord;[\s\S]*?recordEligible\s*\?\s*saveBestTime\(/,
  'only a clean run may call the record-saving path');
assert.match(engine, /recordEligible,\s*\.\.\.\(recordEligible \? \{ time: ms \} : \{\}\)/,
  'retry completion events must omit time so shared time systems cannot store a retry-tail result');
assert.match(engine, /const isMasteryClear = !recordEligible;[\s\S]*?MASTERY CLEAR · NO RECORD/,
  'retry completion must be visibly separated from speed-record completion');
assert.match(engine, /const isPerfectRun = recordEligible && bestStreak === queue\.length/,
  'perfect-run messaging must require both a clean run and full streak coverage');
assert.match(dayRecord, /recordEligible = true/,
  'day records must remain backward compatible for existing non-Blitz events');
assert.match(dayRecord, /completed && recordEligible !== false && typeof time === 'number'/,
  'retry-tail times must not enter the weekly Blitz time record');
assert.match(verify, /tests\/blitz-pass37-record-integrity-audit\.cjs/,
  'verify.sh must run the Blitz record-integrity audit');

console.log('Blitz record-integrity audit passed: retry completions count as mastery without creating speed records.');
