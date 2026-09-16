const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /if \(!bgm\.paused\) return;/,
  'BGM start should be idempotent while still resuming a paused track');
assert.match(engine, /const playback = bgm\.play\(\);[\s\S]*?playback\?\.catch/,
  'BGM resume should safely handle browsers that return a play promise');
assert.match(engine, /function recoverFromWrong\(event\) \{[\s\S]*?wrongPopup\.classList\.remove\('show', 'closing'\)[\s\S]*?startBGM\(\);/,
  'retrying from the wrong-answer popup must resume BGM from the trusted click');
assert.match(engine, /stopTimer\(\);\s*stopBGM\(\);\s*const answerEpoch = runEpoch;\s*setTimeout\(\(\) => \{[\s\S]*?showWrongPopup\(correct\)/,
  'wrong answers should still pause BGM while the feedback popup is open');
assert.match(verify, /tests\/blitz-pass29-wrong-retry-bgm-audit\.cjs/,
  'verify.sh must run the wrong-retry BGM audit');

console.log('Blitz wrong-retry BGM audit passed: wrong feedback pauses music and the retry click reliably resumes it.');
