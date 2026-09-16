const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const modes = ['js/vocab-blitz.js', 'js/sentence-blitz.js', 'js/question-blitz.js']
  .map(file => fs.readFileSync(file, 'utf8'));
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function showWrongPopup\(correct\)/,
  'wrong feedback must have a dedicated popup');
assert.match(engine, /function recoverFromWrong\(event\)/,
  'continuation must have a dedicated recovery path');
assert.match(engine, /feedbackState = 'feedback-pending';[\s\S]*?setAnswerInputEnabled\(false\)/,
  'answers must be disabled as soon as a wrong answer is detected');
assert.match(engine, /event\?\.stopImmediatePropagation\?\.\(\)/,
  'Continue must stop tap-through and duplicate activation');
assert.match(engine, /recoveryPending = true;[\s\S]*?feedbackState = 'advancing';[\s\S]*?setAnswerInputEnabled\(false\)/,
  'Continue must become a one-shot transition barrier');
assert.match(engine, /queue = shuffle\(weekCards\);[\s\S]*?current = 0;[\s\S]*?streak = 0;/,
  'a failed run must restart with all weekly cards and zero progress');
assert.match(engine, /elapsed = 0;[\s\S]*?startTime = performance\.now\(\);/,
  'the timer baseline must restart after a failed run');
assert.doesNotMatch(engine, /queue\.splice\(/,
  'a failed run must not insert a missed card into a longer replay queue');
assert.doesNotMatch(engine, /WRONG_ANSWER_PENALTY_MS/,
  'the failed run must reset rather than add a time penalty');
assert.match(engine, /renderQuestion\(true\)/,
  'the restarted run must retain the existing recovery entrance animation');

for (const [source, prefix] of modes.map((source, index) => [source, ['vb', 'sb', 'qb'][index]])) {
  assert.match(source, new RegExp(`id="${prefix}-wrong-close" type="button">つぎへ / CONTINUE`),
    `${prefix} wrong feedback must clearly offer continuation`);
}

assert.match(verify, /tests\/blitz-pass16-wrong-recovery-audit\.cjs/,
  'verify.sh must run the wrong-recovery audit');

console.log('Blitz wrong-recovery audit passed: failed runs reset cleanly and Continue is a real input barrier.');
