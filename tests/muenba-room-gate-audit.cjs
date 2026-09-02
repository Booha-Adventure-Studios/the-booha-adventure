#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const saveFile = fs.readFileSync(path.join(root, 'js', 'core', 'save-file.js'), 'utf8');

assert(source.includes('navigationUnlocked: false'), 'Muenba must start each page with a locked room gate');
assert(saveFile.includes('huntAccepted: false'), 'weekly Muenba schema must default to an unopened hunt');
assert(saveFile.includes('activeCaseRecoveryDone: false'), 'weekly Muenba schema must track one-time legacy target recovery');
assert(source.includes('world.huntAccepted = world.huntAccepted === true;'), 'weekly Muenba acceptance must be normalized as a boolean');

const acceptStart = source.indexOf('function acceptMuenbaHunt(target)');
const acceptEnd = source.indexOf('\n  function resetMuenbaWeeklyNavigation()', acceptStart);
assert(acceptStart >= 0 && acceptEnd > acceptStart, 'Muenba must expose a dedicated hunt-acceptance transition');
const acceptBlock = source.slice(acceptStart, acceptEnd);
assert(acceptBlock.includes('huntAccepted: true'), 'accepting a hunt must persist weekly acceptance');
assert(acceptBlock.includes('activeCaseId: acceptedCase ? acceptedCase.id : null'), 'accepting a hunt must pin the accepted case in weekly state');
assert(acceptBlock.includes('activeHuntGhostId: knownGhost.id'), 'accepting a hunt must pin the exact card ghost in weekly state');
assert(acceptBlock.includes('const acceptedTarget = target && target.ghost ? target : getMuenbaHuntTarget();'), 'acceptance must use the card target instead of recalculating the next case');
assert(acceptBlock.includes('invalidateGhostRoomMap();'), 'acceptance must refresh ghost placement for the new target');
assert(acceptBlock.includes('state.navigationUnlocked = true;'), 'accepting a hunt must unlock room navigation immediately');

const caseStart = source.indexOf('function nextMuenbaCase()');
const caseEnd = source.indexOf('\n  function availableMuenbaGhostsThisWeek()', caseStart);
const caseBlock = source.slice(caseStart, caseEnd);
assert(caseBlock.includes('weekly.activeCaseId'), 'Muenba case resolution must consult the persisted active case');
assert(caseBlock.includes('caseData.id === weekly.activeCaseId'), 'Muenba must keep the accepted case when it remains unfinished');
assert(source.includes('function activeMuenbaCase()'), 'Muenba must expose an accepted-case-only resolver for the room reminder');
const activeCaseStart = source.indexOf('function activeMuenbaCase()');
const activeCaseEnd = source.indexOf('\n  function availableMuenbaGhostsThisWeek()', activeCaseStart);
const activeCaseBlock = source.slice(activeCaseStart, activeCaseEnd);
assert(activeCaseBlock.includes('activeCaseRecoveryDone'), 'accepted legacy hunts must have a one-time recovery path');
assert(activeCaseBlock.includes('Number(weekly.orbsPending) <= 0'), 'legacy recovery must not invent a target during pending handoff');
const roomPopupStart = source.indexOf('function renderRoomNuppiPopup()');
const roomPopupEnd = source.indexOf('\n  function openRoomNuppiPopup()', roomPopupStart);
const roomPopup = source.slice(roomPopupStart, roomPopupEnd);
assert(roomPopup.includes('const huntTarget = !pending && weekly.huntAccepted === true'), 'the room popup must hide the target during pending handoff');
assert(roomPopup.includes('getMuenbaHuntTarget({ activeOnly: true })'), 'the room popup must show only an accepted active target');
assert(roomPopup.includes('aria-labelledby="muenba-room-hunt-target-title muenba-room-hunt-target-name"'), 'the target card must expose both its instruction and ghost name');
assert(roomPopup.includes('class="muenba-room-hunt-target-portrait" src="${escapeHtml(waitingGhost.img)}" alt=""'), 'the target portrait must not make screen readers announce the ghost twice');
assert(source.includes('@media (max-width:360px)'), 'the target card must include a narrow-phone layout guard');

const exitStart = source.indexOf('function getAvailableExit(now)');
const exitEnd = source.indexOf('\n  function transitionTo(', exitStart);
assert(source.slice(exitStart, exitEnd).includes("if (state.roomId === MUENBA_NUPPI.roomId && !state.navigationUnlocked) return null;"),
  'locked room 01 must reject exit selection');

const arrowsStart = source.indexOf('function drawExitArrows(now)');
const arrowsEnd = source.indexOf('\n  function drawFrame(', arrowsStart);
assert(source.slice(arrowsStart, arrowsEnd).includes("if (state.roomId === MUENBA_NUPPI.roomId && !state.navigationUnlocked) return;"),
  'locked room 01 must hide inter-room arrows');

const huntStart = source.indexOf('function renderNuppiHuntCard()');
const huntEnd = source.indexOf('\n  function focusLobbyControl(', huntStart);
const hunt = source.slice(huntStart, huntEnd);
assert(hunt.indexOf('acceptMuenbaHunt(huntTarget)') > hunt.indexOf("if (needsTierSelection)"),
  'the hunt card must accept the hunt before closing the lobby');
assert(hunt.indexOf('acceptMuenbaHunt(huntTarget)') < hunt.indexOf('closeNuppiLobby()'),
  'the room gate must unlock before the hunt card closes');

assert(source.includes("document.addEventListener('booha:weeklyReset', resetMuenbaWeeklyNavigation);"),
  'live weekly rollover must notify Muenba to relock room navigation');
assert(source.includes('state.navigationUnlocked = false;\n    huntGhostOrderCache = null;'),
  'weekly rollover must clear the navigation unlock and hunt-order cache');
assert(source.includes("muenbaProfileLink.href = 'muenba-profile.html';"),
  'Muenba profile must remain a direct room 01 link');
assert(source.includes('setMuenbaProfileDisabled(false);'),
  'Muenba profile must be enabled outside the dance');
assert((source.match(/setMuenbaProfileDisabled\(true\);/g) || []).length === 1,
  'Muenba profile must have exactly one dance-lock activation');
assert((source.match(/setHideButtonDisabled\(true\);/g) || []).length === 1,
  'Muenba Hide must have exactly one dance-lock activation');

console.log('Muenba Pass 29B room_01 gate audit passed.');
