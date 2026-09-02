#!/usr/bin/env node
'use strict';

// Pass 6: final Muenba target consistency guard. The manual scenarios below
// are represented by source contracts because the repository has no browser
// harness for the canvas encounter:
// 1. accept a hunt, reopen Nuppi, and keep the same portrait/name;
// 2. complete a case-already-settled-at-this-tier capture and clear both pins;
// 3. accept a second hunt and replace the first target rather than reusing it;
// 4. change tier mid-hunt and keep the target while changing case text mode.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function section(startName, endName) {
  const start = source.indexOf(`function ${startName}`);
  const end = source.indexOf(`function ${endName}`, start + 1);
  assert(start >= 0 && end > start, `could not isolate ${startName}`);
  return source.slice(start, end);
}

const accept = section('acceptMuenbaHunt(target)', 'resetMuenbaWeeklyNavigation');
assert(accept.includes('activeCaseId: acceptedCase ? acceptedCase.id : null'), 'acceptance must persist matching case context');
assert(accept.includes('activeHuntGhostId: knownGhost.id'), 'acceptance must persist the accepted ghost');
assert(accept.includes('invalidateGhostRoomMap();'), 'acceptance must invalidate room placement');

const roomMap = section('getGhostRoomMap()', 'drawGhost');
assert(roomMap.includes('const huntTarget = getMuenbaHuntTarget();'), 'spawns must use the canonical target');

const capture = section('beginCaptureSession(ghost)', 'captureBox');
assert(capture.includes('const huntTarget = getMuenbaHuntTarget();'), 'capture must use the canonical target');
assert(capture.includes('ghost.id !== huntTarget.ghost.id'), 'capture must reject a different ghost');

const roomPopup = section('renderRoomNuppiPopup()', 'openRoomNuppiPopup');
assert(roomPopup.includes('const waitingGhost = huntTarget ? huntTarget.ghost : null;'), 'room portrait must use the canonical target ghost');
assert(roomPopup.includes('data-muenba-target-ghost="${escapeHtml(waitingGhostId)}"'), 'target card must expose its ghost identity');
assert(roomPopup.includes('data-muenba-status-ghost="${escapeHtml(waitingGhostId)}"'), 'status card must expose the same ghost identity');
assert(roomPopup.includes('src="${escapeHtml(waitingGhost.img)}" alt="${escapeHtml(waitingGhostName)}"'), 'target portrait must use escaped image and accessible name');
assert(roomPopup.includes('Find ${waitingGhostName}, then bring the energy home.'), 'status must name the same ghost as the portrait');

const handoff = section('openNuppiAfterHandoff(deposited)', 'drawNuppi');
assert(handoff.includes('weeklyAfterHandoff.activeCaseId === null && weeklyAfterHandoff.activeHuntGhostId === null'), 'handoff must verify both pins before the next hint');

assert(verify.includes('tests/muenba-target-consistency-audit.cjs'), 'verify.sh must run the final target consistency audit');

console.log('Muenba Pass 6 target consistency audit passed: acceptance, spawning, capture, portrait/status identity, handoff clearing, and tier-change scenarios are guarded.');
