#!/usr/bin/env node
'use strict';

// Pass 16F: a journey-level regression audit for the English reading lock.
// This deliberately stays DOM-free so it can run in verify.sh before deploy.
// The data audit owns authored content; this audit owns the player-flow seams
// that are easiest to regress when the case UI is edited.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'js', 'muenba-data.js'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(dataSource, context, { filename: 'muenba-data.js' });
const data = context.window.MUENBA_DATA;

assert(data && Array.isArray(data.caseOrder), 'Muenba data must expose an ordered case list');
assert(data.caseOrder.length > 0, 'Muenba must have at least one authored case');

function sourceSection(startName, endName) {
  const start = runtimeSource.indexOf(`function ${startName}`);
  const end = runtimeSource.indexOf(`function ${endName}`, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} flow contract`);
  return runtimeSource.slice(start, end);
}

const clueSource = sourceSection('renderCaseClue', 'renderCaseCheck');
const checkSource = sourceSection('renderCaseCheck', 'renderCaseReview');
const reviewSource = sourceSection('renderCaseReview', 'renderCaseQuestion');
const finalSource = sourceSection('renderCaseQuestion', 'beginCaseRhythm');
const transitionSource = sourceSection('beginCaseRhythm', 'renderCaptureReady');
const rhythmSource = sourceSection('startRhythmCapture', 'openRhythmHelp');

// 1. The authored content must provide three small reading locks per mode.
let clueCount = 0;
for (const caseId of data.caseOrder) {
  const caseData = data.cases[caseId];
  assert(caseData, `${caseId} must exist in cases`);
  for (const modeName of ['start', 'fresh', 'deep']) {
    const mode = caseData[modeName];
    assert(mode && Array.isArray(mode.clues), `${caseId}.${modeName} needs clues`);
    assert.strictEqual(mode.clues.length, 3, `${caseId}.${modeName} must keep the three-record lock`);
    for (const [index, clue] of mode.clues.entries()) {
      assert(clue && clue.text && clue.check, `${caseId}.${modeName} clue ${index + 1} needs text and a check`);
      assert(Array.isArray(clue.check.choices) && clue.check.choices.length === 3,
        `${caseId}.${modeName} clue ${index + 1} needs three answer choices`);
      clueCount += 1;
    }
  }
}
assert.strictEqual(clueCount, data.caseOrder.length * 3 * 3, 'every mode must contribute exactly three reading checks');

// 2. A clue cannot expose a generic NEXT shortcut. Reading unlocks its check;
// only the correct check answer can increment the record index.
assert(clueSource.includes("captureSession.phase = 'case-read'"), 'clue screen must enter the read phase');
assert(clueSource.includes('armCaseReadGate(box, null, clue.text, renderCaseCheck)'), 'clue screen must gate the comprehension check');
assert(!clueSource.includes('muenba-case-next'), 'clue screen must not expose a generic NEXT button');
assert(!clueSource.includes('caseIndex += 1'), 'clue screen must not advance before comprehension');
assert(checkSource.includes("captureSession.phase = 'case-check'"), 'check screen must have its own phase');
assert(checkSource.includes("captureSession.phase !== 'case-check'"), 'clue answers must be phase-guarded');
assert(checkSource.includes('captureSession.caseIndex += 1'), 'only a correct clue answer may advance the record');
assert(checkSource.includes("renderCaseCheck('Not quite."), 'wrong clue answers must reread without advancing');

// 3. The final solve prompt is an inference lock, with review available one
// record at a time and no accidental display of the whole answer key.
assert(finalSource.includes("captureSession.phase = 'case-question'"), 'final solve must have a dedicated phase');
assert(finalSource.includes('muenba-case-review'), 'final solve must offer record review');
assert(!finalSource.includes('muenba-case-record-list'), 'final solve must not display all records at once');
assert(reviewSource.includes("captureSession.phase = penaltyReview ? 'case-reread' : 'case-review'"), 'review and penalty reread must be separate phases');
assert(reviewSource.includes('Reviewing is safe. It does not cost a turn or a reward.'), 'normal review must be penalty-free');
assert(reviewSource.includes('armCaseReadGate(box, returnAction, clue.text)'), 'penalty reread must wait for the record to be read');
assert(reviewSource.includes("captureSession.phase === 'case-reread'"), 'reread return must be phase-guarded');

// 4. Final mistakes are bounded and point back to a relevant record rather
// than ejecting the player or creating an unbounded difficulty spiral.
assert(runtimeSource.includes('const CASE_FINAL_PENALTY_MAX = 2'), 'final reading penalties must be capped at two');
assert(finalSource.includes('previousPenaltyCount'), 'final answer handling must read the current penalty count');
assert(finalSource.includes('penaltyApplied'), 'final answer handling must distinguish capped penalties');
assert(finalSource.includes('captureSession.casePenaltyCount = penaltyCount'), 'final penalty count must live in the encounter session');
assert(finalSource.includes('const reviewTargets'), 'final mistakes must select a relevant review record');
assert(finalSource.includes("renderCaseReview(reviewIndex, { penalty: true"), 'final mistakes must return through penalty reread');
assert(rhythmSource.includes('readingPenaltyCount'), 'rhythm must receive the reading penalty count');
assert(rhythmSource.includes('CASE_FINAL_PENALTY_ACCURACY_STEP'), 'reading penalties must create only the planned rhythm disadvantage');

// 5. Correct comprehension hands the player directly to rhythm after the
// visual transition; there must be no second confirmation button.
assert(finalSource.includes('if (index === answerSet.correct) beginCaseRhythm();'), 'correct solve must start the rhythm handoff');
assert(transitionSource.includes("session.phase = 'case-transition'"), 'rhythm handoff must use a transition phase');
assert(transitionSource.includes('CASE_RHYTHM_TRANSITION_MS'), 'rhythm handoff must use the short transition timing');
assert(transitionSource.includes('startRhythmCapture(false)'), 'rhythm must start automatically after the transition');
assert(!runtimeSource.includes('renderCaseResolved'), 'old extra resolved/capture screen must stay removed');
assert(!runtimeSource.includes('muenba-case-capture'), 'the reading lock must not add a second capture button');

// 6. Choice order must be encounter-stable but not a permanent authored
// A-A-A-A pattern. These checks protect both halves of that contract.
assert(runtimeSource.includes('function shuffledCaseChoices(question, scope)'), 'case choices need a dedicated shuffle helper');
assert(runtimeSource.includes('_muenbaShuffle(entries, `${sessionSeed}:${scope}`)'), 'choice shuffle must use the seeded Muenba shuffle');
assert(runtimeSource.includes('choiceSeed'), 'the encounter must own a reproducible choice seed');
assert(checkSource.includes('shuffledCaseChoices(check, `clue-${captureSession.caseIndex}`)'), 'clue checks must use scoped shuffling');
assert(finalSource.includes("shuffledCaseChoices(mode, 'final')"), 'final solve must use scoped shuffling');

console.log(`Muenba reading-lock audit passed: ${data.caseOrder.length} cases, ${clueCount} clue checks, and direct rhythm handoff contracts.`);
