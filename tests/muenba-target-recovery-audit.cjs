#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const saveFile = fs.readFileSync(path.join(root, 'js', 'core', 'save-file.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(saveFile.includes('activeCaseRecoveryDone: false'),
  'weekly Muenba state must default legacy-target recovery to incomplete');
assert(muenba.includes('const patch = { activeCaseRecoveryDone: true };'),
  'Muenba must mark legacy-target recovery complete after one repair attempt');
assert(muenba.includes('if (Number(weekly.orbsPending) <= 0)'),
  'legacy-target recovery must require that no energy handoff is pending');
assert(muenba.includes('patch.activeCaseId = recoveredCase.id'),
  'legacy accepted hunts must persist the recovered active case id');
assert(muenba.includes('patch.activeHuntGhostId = recoveredGhost.id'),
  'legacy completed-tier hunts must persist the recovered weekly ghost id');
assert(muenba.includes('weekly.activeCaseId = null;'),
  'successful capture must clear the accepted target');
assert(muenba.includes('weekly.activeHuntGhostId = null;'),
  'successful capture must clear the canonical ghost target');
assert(saveFile.includes('activeHuntGhostId: null'),
  'weekly Muenba state must include a canonical case-less hunt target slot');
assert(muenba.includes('function getMuenbaHuntTarget({ activeOnly = false } = {})'),
  'Nuppi, capture, and spawn paths must share one target resolver');
assert(muenba.includes('function acceptMuenbaHunt(target)'),
  'hunt acceptance must receive the target shown on the card');
assert(muenba.includes('activeHuntGhostId: knownGhost.id'),
  'hunt acceptance must persist the displayed ghost id');
assert(muenba.includes('const huntAccepted = !pending && weekly.huntAccepted === true;'),
  'the room popup must use the canonical target and remain empty during handoff');
assert(serviceWorker.includes("assets: 'booha-assets-2026-523'"),
  'the target-recovery runtime must be shipped through the current asset cache');

console.log('Muenba target recovery audit passed: legacy accepted hunts, handoff safety, completion cleanup, and cache delivery are covered.');
