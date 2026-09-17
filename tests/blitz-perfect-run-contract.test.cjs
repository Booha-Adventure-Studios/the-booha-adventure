const fs = require('fs');
const assert = require('assert');

// The weekly curriculum speed games are timed practice, not all-or-nothing
// perfect-run tests. A completed 15-card pass must submit its real score so
// the normal registry thresholds can award 0–3 stars.
const vocab = fs.readFileSync('games/vocab-speed.js', 'utf8');
const sentence = fs.readFileSync('games/sentence-speed.js', 'utf8');
const utils = fs.readFileSync('js/game-utils.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(utils, /emitGameEnd\(detail\)/,
  'shared game utilities must provide guarded result submission');

for (const [source, prefix] of [[vocab, 'vs'], [sentence, 'ssp']]) {
  assert.match(source, /U\.shuffle\(CFG\.cards\.slice\(0, 15\)\)/,
    `${prefix} must use the weekly 15-card deck`);
  assert.match(source, /function bindSingleActivation\(element, handler\)/,
    `${prefix} must standardize answer activation`);
  assert.match(source, new RegExp(`function showResults\\(\\)\\s*\\{[\\s\\S]*?idx !== 15 \\|\\| feedbackState !== 'playing'`),
    `${prefix} must finish after all 15 questions, regardless of score`);
  assert.doesNotMatch(source, /idx !== 15 \|\| score !== 15 \|\| streak !== 15/,
    `${prefix} must not require a perfect run to show results`);
  assert.match(source, /completed: true,[\s\S]*?mistakes/,
    `${prefix} must mark a finished normal pass complete and retain mistakes`);
  assert.match(source, /U\.emitGameEnd\(/,
    `${prefix} must submit through the paint-safe result helper`);
  assert.match(source, /mistakes\+\+;\s*setTimeout\(\(\) => \{ idx\+\+; renderQ\(\); \}/,
    `${prefix} must advance after a wrong or timed-out answer`);
  assert.match(source, /function onTimeout\(\)\s*\{[\s\S]*?stopHeat\(\);/,
    `${prefix} must cancel the timer RAF when time expires`);
  assert.doesNotMatch(source, /One mistake resets the run\./,
    `${prefix} instructions must describe normal playthrough scoring`);
}

assert.match(verify, /tests\/blitz-perfect-run-contract\.test\.cjs/,
  'verify.sh must run the weekly speed-game scoring contract test');
console.log('Weekly speed-game contract passed: normal 15-card runs submit their score and can earn stars without a perfect streak.');
