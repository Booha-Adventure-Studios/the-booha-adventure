const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const modes = ['js/vocab-blitz.js', 'js/sentence-blitz.js', 'js/question-blitz.js']
  .map(file => fs.readFileSync(file, 'utf8'));
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function recoverFromWrong\(\) \{[\s\S]*?streak = 0;[\s\S]*?elapsed \+= WRONG_ANSWER_PENALTY_MS;[\s\S]*?startTime = performance\.now\(\) - elapsed[\s\S]*?lastTimerPaint = -Infinity;[\s\S]*?timerEl\.textContent = fmtTime\(elapsed\);[\s\S]*?renderQuestion\(true\)/,
  'continuation must reset the active streak while preserving elapsed time plus penalty');
assert.doesNotMatch(engine, /function recoverFromWrong\(\) \{[\s\S]*?bestStreak = 0;/,
  'retry must preserve the session best streak for the final performance summary');
assert.match(engine, /function recoverFromWrong\(\) \{[\s\S]*?queue\.splice\(retryAt, 0, missedCard\);[\s\S]*?current\+\+/,
  'continuation must advance and requeue the missed card');
assert.match(engine, /function handleAnswer\(btn, chosen, correct\) \{[\s\S]*?if \(chosen\.n === correct\.n\) \{[\s\S]*?current\+\+/,
  'a wrong answer must leave current unchanged so retry stays on the missed card');
assert.match(engine, /function recoverFromWrong\(\) \{[\s\S]*?startBGM\(\);[\s\S]*?scheduleTimerTick\(0\)/,
  'retry must restart the timer and BGM from the trusted button click');

for (const [source, prefix] of modes.map((source, index) => [source, ['vb', 'sb', 'qb'][index]])) {
  assert.match(source, new RegExp(`id="${prefix}-wrong-close" type="button">つぎへ / CONTINUE`),
    `${prefix} wrong feedback must label recovery as CONTINUE`);
}

assert.match(verify, /tests\/blitz-pass30-mastery-retry-audit\.cjs/,
  'verify.sh must run the mastery retry audit');

console.log('Blitz mastery-retry audit passed: misses add penalty time, advance play, and requeue the card for later recall.');
