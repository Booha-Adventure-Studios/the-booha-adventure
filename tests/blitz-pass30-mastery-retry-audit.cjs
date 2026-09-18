const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function recoverFromWrong\(event\)[\s\S]*?bestStreak = 0;/,
  'a new attempt must reset the run streak and its best-streak display');
assert.match(engine, /function recoverFromWrong\(event\)[\s\S]*?mistakeCount = 0;/,
  'a new attempt must clear the failed attempt metadata');
assert.match(engine, /function recoverFromWrong\(event\)[\s\S]*?queue = shuffle\(weekCards\);[\s\S]*?current = 0;/,
  'a new attempt must use the full weekly deck from the beginning');
assert.doesNotMatch(engine, /function recoverFromWrong\(event\)[\s\S]*?queue\.splice\(/,
  'recovery must not create replay questions beyond the 15-card run');
assert.match(engine, /function recoverFromWrong\(event\)[\s\S]*?startBGM\(\);[\s\S]*?scheduleTimerTick\(0\)/,
  'a restarted run must restart the timer and BGM');
assert.doesNotMatch(engine, /function showWin\(ms\) \{[\s\S]*?if \(!isPerfectRun\) return;/,
  'the result card must remain reachable for a normal completed run');
assert.doesNotMatch(engine, /MASTERY CLEAR|CLEAN CLEAR/,
  'failed runs must not have alternate completion tiers');
assert.match(verify, /tests\/blitz-pass30-mastery-retry-audit\.cjs/,
  'verify.sh must run the recovery audit');

console.log('Blitz retry audit passed: failed attempts restart cleanly and completed attempts can clear normally.');
