const fs = require('fs');
const assert = require('assert');

const shared = fs.readFileSync('js/blitz-engine.js', 'utf8');
const vocab = fs.readFileSync('games/vocab-speed.js', 'utf8');
const sentence = fs.readFileSync('games/sentence-speed.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(shared, /if \(weekCards\.length < 15\)/,
  'shared Blitz must require a complete 15-card weekly deck');
assert.match(shared, /queue = shuffle\(weekCards\);[\s\S]*?current = 0;[\s\S]*?elapsed = 0;/,
  'shared recovery must restart the full run at zero');
assert.match(shared, /function bindPointerAction\(button, handler\)/,
  'shared answers must use one pointer activation path');
assert.match(shared, /current === initialQueueLength && streak === initialQueueLength && bestStreak === initialQueueLength && mistakeCount === 0/,
  'shared completion must require 15 correct answers in a row');
assert.doesNotMatch(shared, /queue\.splice\(|WRONG_ANSWER_PENALTY_MS|CLEAN_CLEAR_MAX_MISTAKES|MASTERY CLEAR|CLEAN CLEAR/,
  'shared engine must not preserve the old retry or partial-clear contract');
assert.match(shared, /STREAK_EVENT_THRESHOLDS = Object\.freeze\(\[3, 6, 9, 12, 15\]\)/,
  'shared Blitz must use the 3/6/9/12/15 milestone ladder');
assert.match(shared, /streak-tier-1.*streak-tier-5/s,
  'shared Blitz must retain a visible streak tier after a milestone event');
assert.match(shared, /eventThreshold === 15/,
  'shared Blitz must distinguish the perfect-run climax from ordinary milestones');

for (const [source, prefix] of [[vocab, 'vs'], [sentence, 'ssp']]) {
  assert.match(source, /U\.shuffle\(CFG\.cards\.slice\(0, 15\)\)/,
    `${prefix} must use the weekly 15-card deck`);
  assert.match(source, new RegExp(`function bindSingleActivation\\(element, handler\\)`),
    `${prefix} must standardize answer activation`);
  assert.match(source, /function showFailureFeedback\(kind\)/,
    `${prefix} must show a failure barrier`);
  assert.match(source, /function continueFromFailure\(event\)/,
    `${prefix} must restart through an explicit Continue action`);
  assert.match(source, /const STREAK_MILESTONES = \[3, 6, 9, 12, 15\]/,
    `${prefix} must use the 3/6/9/12/15 milestone ladder`);
  assert.match(source, /finalClimaxTimer/,
    `${prefix} must hand off the perfect run through a timed climax state`);
  assert.match(source, /function revealResults\(runTime\)/,
    `${prefix} must reveal the result card after the climax`);
  assert.match(source, /PERFECT RUN/,
    `${prefix} must show a readable perfect-run climax label`);
  assert.match(source, /idx !== 15 \|\| score !== 15 \|\| streak !== 15/,
    `${prefix} must guard the completion card behind a perfect run`);
  assert.match(source, /completed: true,[\s\S]*?recordEligible: true,[\s\S]*?mistakes: 0/,
    `${prefix} completion must emit only perfect-run metadata`);
  assert.doesNotMatch(source, /completed: pct >= 40|firstTry|btn\.addEventListener\('touchstart'/,
    `${prefix} must not finish partial runs or double-bind answer taps`);
}

assert.match(verify, /tests\/blitz-perfect-run-contract\.test\.cjs/,
  'verify.sh must run the perfect-run contract test');
console.log('Blitz perfect-run contract test passed: shared and standalone engines require flawless 15/15 runs.');
