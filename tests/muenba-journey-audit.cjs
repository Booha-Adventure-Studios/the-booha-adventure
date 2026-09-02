#!/usr/bin/env node
'use strict';

// Pass 19H: end-to-end Muenba journey regression guard.
// The focused audits protect individual features; this one protects the
// order and handoffs that make the complete hunt playable.
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

assert(data && Array.isArray(data.caseOrder), 'Muenba must expose an ordered case list');
assert(data.cases && typeof data.cases === 'object', 'Muenba must expose authored case data');
assert(data.caseOrder.length > 0, 'Muenba must have at least one case');

function sourceSection(startName, endName) {
  const start = runtimeSource.indexOf(`function ${startName}`);
  const end = runtimeSource.indexOf(`function ${endName}`, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} journey contract`);
  return runtimeSource.slice(start, end);
}

const sessionSource = sourceSection('beginCaptureSession', 'captureBox');
const clueSource = sourceSection('renderCaseClue', 'renderCaseCheck');
const clueAnswerSource = sourceSection('handleCaseClueAnswer', 'appendCaseLockedCheck');
const finalSource = sourceSection('renderCaseQuestion', 'beginCaseRhythm');
const solvedSource = sourceSection('beginCaseRhythm', 'renderCaptureReady');
const rhythmSource = sourceSection('startRhythmCapture', 'openRhythmHelp');
const finishSource = sourceSection('finishRhythmCapture', 'renderPracticeResult');
const commitSource = sourceSection('commitSuccessfulCapture', 'renderRhythmResult');
const rewardSource = sourceSection('renderCaptureReward', 'setReturnToNuppiPending');
const returnSource = sourceSection('leaveCaptureForNuppi', 'releaseNextOrb');
const releaseSource = sourceSection('releaseNextOrb', 'depositOrbsAtNuppi');
const depositSource = sourceSection('depositOrbsAtNuppi', 'spawnMuenbaDanceSparkle');
const cleanupSource = sourceSection('closeCaptureOverlay', 'stopRhythmCapture');

// 1. The authored cases support the same three-record lock in every memory
// lane, so a successful hunt can always follow the same state sequence.
for (const caseId of data.caseOrder) {
  const caseData = data.cases[caseId];
  assert(caseData, `${caseId} must exist in cases`);
  for (const modeName of ['start', 'fresh', 'deep']) {
    const mode = caseData[modeName];
    assert(mode && Array.isArray(mode.clues), `${caseId}.${modeName} must have clues`);
    assert.strictEqual(mode.clues.length, 3, `${caseId}.${modeName} must have exactly three clues`);
    assert(Array.isArray(mode.choices) && mode.choices.length === 3, `${caseId}.${modeName} needs final choices`);
    mode.clues.forEach((clue, index) => {
      assert(clue && clue.text && clue.check, `${caseId}.${modeName} clue ${index + 1} must be readable and checkable`);
      assert(Array.isArray(clue.check.choices) && clue.check.choices.length === 3,
        `${caseId}.${modeName} clue ${index + 1} needs three choices`);
    });
  }
}

// 2. Hunt target -> case session. A target must be the currently assigned
// ghost, and removing it from the world must not consume any save progress.
assert(sessionSource.includes("ghostRoleFor(ghost) !== 'hunt-target'"), 'only hunt-target ghosts may open a case');
assert(sessionSource.includes('const huntTarget = getMuenbaHuntTarget();'), 'capture must resolve the canonical hunt target');
assert(sessionSource.includes('ghost.id !== huntTarget.ghost.id'), 'capture must reject a non-current hunt ghost');
assert(sessionSource.includes('const caseData = huntTarget.caseData;'), 'capture must resolve the target case context');
assert(sessionSource.includes("phase: caseData && !caseRecordComplete(caseData) ? 'case-intro' : 'ready'"), 'new cases must begin at the case intro');
assert(sessionSource.includes('activeGhost = null'), 'the captured target must leave the room while the session is open');
assert(sessionSource.includes('state.moving = false'), 'opening a case must pause room movement');

// 3. Case intro -> three reading locks -> final question. Each record starts
// in read mode, reserves its check, and can advance only through the answer.
assert(clueSource.includes("captureSession.phase = 'case-read'"), 'each record must begin in the read phase');
assert(clueSource.includes('appendCaseLockedCheck(box, clue, mode, captureSession)'), 'each record must reserve a locked check');
assert(clueSource.includes('startCaseWordSweep('), 'each record must use the English word sweep');
assert(clueSource.includes('unlockCaseCheck(captureSession, checkPanel, readStatus)'), 'the completed sweep must unlock its check');
assert(clueAnswerSource.includes("if (index === answerSet.correct)"), 'clue progress must depend on the correct answer');
assert(clueAnswerSource.includes('captureSession.caseIndex += 1'), 'correct clue answers must advance one record');
assert(clueAnswerSource.includes('renderCaseQuestion()'), 'the third correct clue answer must reach final solve');
assert(!clueAnswerSource.includes('startRhythmCapture'), 'clue answers must never skip the final solve');

// 4. Final solve -> stable victory. The final answer must remain a separate
// inference check, with safe one-record review and bounded reread penalties.
assert(finalSource.includes("captureSession.phase = 'case-question'"), 'final solve needs a dedicated phase');
assert(finalSource.includes('Review records'), 'final solve must offer record review');
assert(finalSource.includes("shuffledCaseChoices(mode, 'final')"), 'final choices must be shuffled');
assert(finalSource.includes('beginCaseRhythm()'), 'the correct final answer must reach victory');
assert(finalSource.includes('renderCaseReview(reviewIndex, { penalty: true'), 'wrong final answers must return to a relevant reread');
assert(runtimeSource.includes('const CASE_FINAL_PENALTY_MAX = 2'), 'final reading penalties must be bounded');

assert(solvedSource.includes("session.phase = 'case-solved'"), 'victory must pause on a stable solved phase');
assert(solvedSource.includes("muenba-case-energy-start"), 'victory must expose one explicit rhythm action');
assert(solvedSource.includes('Start energy collection'), 'victory action must clearly name the reward step');
assert(solvedSource.includes("session.phase !== 'case-solved'"), 'victory action must be phase guarded');
assert(solvedSource.includes('startRhythmCapture(false)'), 'only the explicit victory action may start the safe rhythm');
assert(!solvedSource.includes('setTimeout'), 'victory must not auto-transition under the learner');

// 5. Victory -> rhythm -> saved reward. The rhythm session records its result,
// commits the capture only after success, and then exposes the orb-release UI.
assert(rhythmSource.includes("captureSession.phase = 'countdown'"), 'rhythm must enter a visible countdown phase');
assert(rhythmSource.includes('renderRhythmCapture()'), 'rhythm must render its play surface');
assert(finishSource.includes('recordRhythmResult(accuracy)'), 'rhythm accuracy must be recorded');
assert(finishSource.includes('commitSuccessfulCapture()'), 'successful rhythm must commit the capture');
assert(finishSource.includes("captureSession.phase = 'reward'"), 'successful capture must enter the reward phase');
assert(finishSource.includes('renderCaptureReward()'), 'successful capture must render the reward card');
assert(finishSource.includes('releaseNextOrb()'), 'reward card must begin releasing energy orbs');
assert(commitSource.includes('mu.ghostsFound[ghost.id] = true'), 'capture commit must mark the lifetime ghost found');
assert(commitSource.includes('weekly.ghostsFound[ghost.id] = true'), 'capture commit must mark weekly availability');
assert(commitSource.includes('weekly.orbsPending += rewardCount'), 'capture commit must create pending energy');
assert(commitSource.includes('mu.caseRecords[caseData.id]'), 'capture commit must persist case completion');
assert(commitSource.includes('writeSave(d)'), 'capture commit must persist before showing reward');

// 6. Reward -> Nuppi handoff -> deposit. The player must explicitly leave
// the reward card and the deposit must clear pending energy before celebration.
assert(rewardSource.includes('Energy released: 0 /'), 'reward must show orb progress');
assert(releaseSource.includes("captureSession.phase !== 'reward'"), 'orb release must be reward-phase guarded');
assert(returnSource.includes("['reward', 'nuppi-recovery'].includes(captureSession.phase)"), 'only reward recovery may leave for Nuppi');
assert(returnSource.includes('closeCaptureOverlay({ resumeHunt: true })'), 'leaving reward must close the encounter cleanly');
assert(returnSource.includes('setReturnToNuppiPending(true)'), 'leaving reward must flag the Nuppi handoff');
assert(depositSource.includes('mu.orbsCollected = collected + pending'), 'Nuppi must collect pending energy');
assert(depositSource.includes('weekly.orbsPending = 0'), 'Nuppi deposit must clear pending energy');
assert(depositSource.includes('writeSave(d)'), 'Nuppi deposit must persist the handoff');
assert(depositSource.includes('startMuenbaCelebration(pending)'), 'deposit must lead to the celebration');

// 7. Abort/cleanup remains safe at every point in the journey.
assert(cleanupSource.includes('stopRhythmCapture()'), 'closing an encounter must stop active rhythm');
assert(cleanupSource.includes('captureOpen = false'), 'closing an encounter must release the modal lock');
assert(cleanupSource.includes('captureSession = null'), 'closing an encounter must clear transient session state');
assert(cleanupSource.includes('resumeWorldMusicAfterCapture()'), 'closing an encounter must restore world audio');

const journey = [
  'case-intro',
  'case-read × 3',
  'case-check × 3',
  'case-question',
  'case-solved',
  'countdown → rhythm',
  'reward',
  'Nuppi deposit / celebration'
];
console.log(`Muenba 19H journey audit passed: ${data.caseOrder.length} cases; ${journey.join(' → ')}.`);
