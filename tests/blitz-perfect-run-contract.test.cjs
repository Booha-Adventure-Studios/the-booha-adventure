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
assert.match(shared, /function bindPointerAction\(button, handler\)\s*\{[\s\S]*?let downId = null[\s\S]*?sameTouch = event\.pointerId === downId[\s\S]*?moved = Math\.hypot\(event\.clientX - downX, event\.clientY - downY\) > 10[\s\S]*?if \(!sameTouch \|\| moved\) return;/,
  'shared answers must ignore pointer releases that started elsewhere or moved into a scroll gesture');
assert.match(shared, /feedbackState = 'playing';\s*visibilityPaused = false;\s*locked = false;\s*setAnswerInputEnabled\(true\);/,
  'starting a run must open both the logical and native answer-input locks');
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
assert.match(shared, /@keyframes boohaBlitzChargedWash[\s\S]*?50% \{ opacity: \.22; \}/,
  'high streak answer energy must use a visible opacity wash');
assert.doesNotMatch(shared, /@keyframes boohaBlitzChargedBreath/,
  'high streak answer energy must not animate filter brightness');
assert.match(shared, /correct-impact::after[\s\S]*?@keyframes boohaBlitzCorrectImpactWash/,
  'correct impact must use an opacity overlay rather than an animated viewport shadow');
assert.match(shared, /threshold >= 9 && i === 0/,
  'large streak sparks must begin at the first reachable 9-streak milestone');

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
