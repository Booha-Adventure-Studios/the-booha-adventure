const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const dayRecord = fs.readFileSync('js/core/day-record.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /let runEligibleForRecord = true;/,
  'a fresh Blitz run must start record-eligible');
assert.match(engine, /btn\.classList\.add\('wrong'\);[\s\S]*?mistakeCount\+\+;[\s\S]*?runEligibleForRecord = mistakeCount <= CLEAN_CLEAR_MAX_MISTAKES;/,
  'wrong answers must count toward the clean-clear record threshold');
assert.match(engine, /function recoverFromWrong\(\)[\s\S]*?queue\.splice\(retryAt, 0, missedCard\);[\s\S]*?current\+\+[\s\S]*?startTime = performance\.now\(\) - elapsed[\s\S]*?renderQuestion\(true\)/,
  'continuation must requeue the missed question and resume with its penalty');
const retryStart = engine.indexOf('function recoverFromWrong()');
const retryEnd = engine.indexOf('function handleAnswer', retryStart);
assert(retryStart >= 0 && retryEnd > retryStart, 'retry function must remain present and bounded');
assert(!engine.slice(retryStart, retryEnd).includes('runEligibleForRecord = true;'),
  'retry must not restore record eligibility');
assert.match(engine, /const recordEligible = runEligibleForRecord;[\s\S]*?recordEligible\s*\?\s*saveBestTime\(/,
  'only a clean run may call the record-saving path');
assert.match(engine, /recordEligible,[\s\S]*?time: ms,[\s\S]*?clearTier,[\s\S]*?mistakes: mistakeCount/,
  'every completion event must carry adjusted time and clear metadata');
assert.match(engine, /const isMasteryClear = clearTier === 'mastery';[\s\S]*?MASTERY CLEAR · NO RECORD/,
  'mastery completion must be visibly separated from speed-record completion');
assert.match(engine, /const isPerfectRun = clearTier === 'perfect' && bestStreak === initialQueueLength/,
  'perfect-run messaging must require zero mistakes and full streak coverage');
assert.match(dayRecord, /recordEligible = true/,
  'day records must remain backward compatible for existing non-Blitz events');
assert.match(dayRecord, /completed && typeof time === 'number' && Number\.isFinite\(time\)/,
  'every completed Blitz clear must enter the weekly completion record');
assert.match(verify, /tests\/blitz-pass37-record-integrity-audit\.cjs/,
  'verify.sh must run the Blitz record-integrity audit');

console.log('Blitz record-integrity audit passed: clear tiers and adjusted completion metadata are preserved.');
