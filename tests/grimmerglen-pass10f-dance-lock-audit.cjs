#!/usr/bin/env node
'use strict';

// Pass 10F: the final memory dance is a contained celebration. No room exit,
// return portal, or profile doorway may interrupt it.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

const profilePortal = runtime.slice(
  runtime.indexOf('function updateGrimmerglenProfilePortal('),
  runtime.indexOf('function setRoom(', runtime.indexOf('function updateGrimmerglenProfilePortal('))
);
assert.match(profilePortal, /!state\.celebrating/, 'profile doorway visibility must close during celebration');
assert.match(profilePortal, /tabIndex = visible \? 0 : -1/, 'profile doorway must leave keyboard focus during celebration');
assert.match(runtime, /event\.preventDefault\(\);\s*event\.stopPropagation\(\);/, 'profile doorway clicks must be blocked during celebration');

const exitStart = runtime.indexOf('function getAvailableExit(');
const exitEnd = runtime.indexOf('function transitionTo(', exitStart);
assert.match(runtime.slice(exitStart, exitEnd), /state\.celebrating/, 'exit selection must reject celebration state');
const transitionStart = runtime.indexOf('function transitionTo(');
const transitionEnd = runtime.indexOf('// ── Drawing', transitionStart);
assert.match(runtime.slice(transitionStart, transitionEnd), /state\.celebrating/, 'room transitions must reject celebration state');
const drawStart = runtime.indexOf('function drawExitArrows(');
const drawEnd = runtime.indexOf('function drawMarietta(', drawStart);
assert.match(runtime.slice(drawStart, drawEnd), /state\.celebrating/, 'exit arrows must be hidden during celebration');

const returnStart = runtime.indexOf('function openReturnPortalPopup(');
const returnEnd = runtime.indexOf('function drawReturnPortal(', returnStart);
assert.match(runtime.slice(returnStart, returnEnd), /state\.celebrating/, 'return portal interactions must reject celebration state');
assert.match(runtime, /function returnToKarasuki\(\) \{\s*if \(state\.returnExiting \|\| state\.celebrating\) return;/, 'the navigation handoff must reject celebration state');

const danceStart = runtime.indexOf('function startGrimmerglenCelebration(');
const danceEnd = runtime.indexOf('function completeGrimmerglenMemory(', danceStart);
const dance = runtime.slice(danceStart, danceEnd);
assert.match(dance, /updateGrimmerglenProfilePortal\(\)/, 'starting the dance must immediately hide the profile doorway');
const finishStart = runtime.indexOf('function finishGrimmerglenCelebration(');
const finishEnd = runtime.indexOf('function startGrimmerglenCelebration(', finishStart);
assert.match(runtime.slice(finishStart, finishEnd), /updateGrimmerglenProfilePortal\(\)/, 'finishing the dance must restore the profile doorway when appropriate');

assert.match(verify, /tests\/grimmerglen-pass10f-dance-lock-audit\.cjs/, 'verify.sh must run the Pass 10F dance-lock audit');

console.log('Grimmerglen Pass 10F audit passed: dance sequence locks exits, return navigation, and profile doorway access.');
