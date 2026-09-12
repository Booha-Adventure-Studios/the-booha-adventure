const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const modes = ['js/vocab-blitz.js', 'js/sentence-blitz.js', 'js/question-blitz.js']
  .map(file => fs.readFileSync(file, 'utf8'));
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function recoverFromWrong\(\) \{[\s\S]*?streak = 0;[\s\S]*?elapsed = 0;[\s\S]*?clearElapsed = null;[\s\S]*?startTime = performance\.now\(\);[\s\S]*?lastTimerPaint = -Infinity;[\s\S]*?timerEl\.textContent = '0\.00s';[\s\S]*?renderQuestion\(true\)/,
  'retry must reset the active streak and elapsed time while rebuilding the same question');
assert.doesNotMatch(engine, /function recoverFromWrong\(\) \{[\s\S]*?bestStreak = 0;/,
  'retry must preserve the session best streak for the final performance summary');
assert.doesNotMatch(engine, /function recoverFromWrong\(\) \{[\s\S]*?startTime = performance\.now\(\) - elapsed/,
  'retry must not resume the pre-mistake elapsed time');
assert.match(engine, /function handleAnswer\(btn, chosen, correct\) \{[\s\S]*?if \(chosen\.n === correct\.n\) \{[\s\S]*?current\+\+/,
  'a wrong answer must leave current unchanged so retry stays on the missed card');
assert.match(engine, /function recoverFromWrong\(\) \{[\s\S]*?startBGM\(\);[\s\S]*?scheduleTimerTick\(0\)/,
  'retry must restart the timer and BGM from the trusted button click');

for (const [source, prefix] of modes.map((source, index) => [source, ['vb', 'sb', 'qb'][index]])) {
  assert.match(source, new RegExp(`id="${prefix}-wrong-close" type="button">もう一度 / RETRY`),
    `${prefix} wrong feedback must label recovery as RETRY`);
}

assert.match(verify, /tests\/blitz-pass30-mastery-retry-audit\.cjs/,
  'verify.sh must run the mastery retry audit');

console.log('Blitz mastery-retry audit passed: misses restart timing at the same card and require a clean finish from there.');
