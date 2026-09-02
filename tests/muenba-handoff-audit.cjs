#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function section(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert(start >= 0 && end > start, `could not isolate ${startNeedle}`);
  return source.slice(start, end);
}

const caseSession = section('function beginCaptureSession(ghost)', '  function captureBox');
assert(caseSession.includes("ghostRoleFor(ghost) !== 'hunt-target'"), 'only the assigned hunt ghost may open a case session');
assert(caseSession.includes('const huntTarget = getMuenbaHuntTarget();'), 'a hunt capture must resolve the canonical target');
assert(caseSession.includes('const caseData = huntTarget.caseData;'), 'a hunt capture must resolve its authored case context');
assert(caseSession.includes("phase: caseData && !caseRecordComplete(caseData) ? 'case-intro' : 'ready'"), 'unfinished cases must open the reading flow before rhythm');
assert(caseSession.includes('state.moving = false;'), 'opening a case must pause room movement');

const dangerSession = section('function beginDangerEncounter(ghost', '  function renderDangerReady');
assert(dangerSession.includes('caseData: null'), 'danger encounters must never masquerade as authored cases');
assert(dangerSession.includes("phase: 'danger-ready'"), 'danger encounters must stop on a readable danger-ready card');
assert(dangerSession.includes('startDangerScream();'), 'danger entry must announce the hostile encounter before rhythm');

const nuppiBoard = section('function refreshNuppiCaseBoard()', '  function openNuppiLobby');
assert(nuppiBoard.includes('const pendingOrbs = Math.max(0, Number(readMuenbaWeekly().orbsPending) || 0);'), 'Nuppi must read pending energy before previewing another case');
assert(nuppiBoard.includes('const next = pendingOrbs > 0 ? null : nextMuenbaHuntCase();'), 'pending energy must suppress the next-case preview while weekly hunts remain available');
assert(source.includes('function nextMuenbaHuntCase()'), 'Nuppi must fall back to the next unfound weekly hunt after lifetime cases are complete');
assert(source.includes('Weekly hunt ready. Find ${ghostName} and untangle its energy.'), 'a completed lifetime memory must not hide a fresh weekly hunt');
assert(nuppiBoard.includes("eyebrow.textContent = 'ENERGY TRAIL WAITING';"), 'Nuppi must label the return-trip handoff clearly');

const huntCard = section('function renderNuppiHuntCard()', '  function focusLobbyControl');
assert(huntCard.includes('const returningEnergy = pendingOrbs > 0;'), 'the hunt card must distinguish return-trip state');
assert(huntCard.includes('const huntTarget = returningEnergy ? null : getMuenbaHuntTarget();'), 'return-trip state must not present a new ghost target');
assert(huntCard.includes('const ghost = huntTarget ? huntTarget.ghost : null;'), 'the hunt card must render the canonical target');
assert(huntCard.includes("const huntTitle = returningEnergy\n      ? 'Return your energy to Nuppi'"), 'the return-trip card must explain its action');
assert(huntCard.includes("const huntButton = returningEnergy ? 'Return to Nuppi'"), 'the return-trip action must be named explicitly');
assert(huntCard.includes('openPendingOrbRecovery();'), 'the handoff must still open the durable recovery flow');

const currentTarget = section('function currentHuntGhostId()', '  function caseForGhost');
assert(currentTarget.includes('if (Number(readMuenbaWeekly().orbsPending) > 0) return null;'), 'pending energy must block a second hunt target');

const cancel = section('function cancelCaptureSession()', '  // Pass 8C calls');
assert(cancel.includes('stopRhythmCapture();'), 'cancel must stop rhythm timers and audio');
assert(cancel.includes('captureSession = null;'), 'cancel must clear the active session');
assert(cancel.includes('spawnRoomGhost(state.roomId);'), 'cancel must restore the room ghost without writing capture progress');

const commit = section('function commitSuccessfulCapture()', '  function renderRhythmResult');
assert(commit.includes('if (captureSession.rewardCommitted)'), 'capture commits must be idempotent');
assert(commit.includes('weekly.orbsPending += rewardCount'), 'successful captures must persist pending energy');
assert(commit.includes('if (!writeSave(d)) return null;'), 'failed writes must not report a successful reward');
assert(commit.includes('captureSession.rewardCommitted = true;'), 'the commit guard must arm only after the save succeeds');
assert(commit.includes('weekly.activeCaseId = null;'), 'successful capture must always clear the weekly case pin');
assert(commit.includes('weekly.activeHuntGhostId = null;'), 'successful capture must always clear the weekly ghost pin');

const deposit = section('function depositOrbsAtNuppi()', '  let muenbaDanceSparkles');
assert(deposit.includes('weekly.activeCaseId !== null || weekly.activeHuntGhostId !== null'), 'handoff must detect stale hunt pins before offering another hint');
assert(deposit.includes('weekly.activeCaseId = null;'), 'handoff must repair a stale case pin');
assert(deposit.includes('weekly.activeHuntGhostId = null;'), 'handoff must repair a stale ghost pin');

const nextHint = section('function openNuppiAfterHandoff(deposited)', '  function drawNuppi');
assert(nextHint.includes('weeklyAfterHandoff.activeCaseId === null && weeklyAfterHandoff.activeHuntGhostId === null'), 'next hint must be gated on cleared hunt pins');

const finish = section('function finishRhythmCapture()', '  function renderPracticeResult');
assert(finish.includes('if (captureSession.practice)'), 'practice must exit before permanent capture accounting');
assert(finish.includes('recordRhythmResult(accuracy);'), 'real rhythm attempts must update lifetime rhythm stats');
assert(finish.includes('if (captureSession.danger)'), 'danger rhythm results must stay outside target capture rewards');

assert(verify.includes('tests/muenba-handoff-audit.cjs'), 'verify.sh must run the Pass 5 handoff audit');

console.log('Muenba handoff audit passed: case entry, danger separation, return-trip priority, cleanup, and idempotent rewards are wired.');
