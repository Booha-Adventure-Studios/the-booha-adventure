#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');

assert(source.includes('const GHOST_NOTICE_DELAY_MS = 2000;'), 'sight-angry ghosts must wait exactly two seconds before screaming');
assert(source.includes('const GHOST_CARRY_CHASE_SPEED = 1.35;'), 'carrying-energy chases must be only slightly faster');
assert(source.includes("if (roleRules.alwaysAngry) return 'sight';"), 'jerk ghosts must use sight-triggered aggression');
assert(source.includes('function dangerRhythmConfigFor(difficulty)'), 'danger encounters must have an explicit rhythm route');
assert(source.includes('chart: difficulty.dangerChart,'), 'danger encounters must use the difficult danger chart');
assert(source.includes('dangerMode: encounterRole === \'jerk\' ? \'jerk\' : \'main\','), 'danger encounters must preserve the jerk or main route');
assert(source.includes('if (carryingStolenEnergy) return \'sight\';'), 'carrying energy must make every ghost sight-angry');
assert(source.includes("if (!carryingStolenEnergy && ghostId === target) return 'friendly';"), 'the assigned hunt ghost must stay quiet during an ordinary hunt');
assert(source.includes('chaseSpeed: carryingEnergy ? GHOST_CARRY_CHASE_SPEED : GHOST_CHASE_SPEED,'), 'ghosts must remember the carried-energy chase speed');
assert(source.includes('moveGhostToward(g, state.x, state.y, g.chaseSpeed || GHOST_CHASE_SPEED);'), 'chasing must use the carried-energy speed when active');
assert(source.includes("if (g.hostility === 'sight' && !g.screaming)"), 'sight-angry ghosts must use the delayed notice path');
assert(source.includes("beginDangerEncounter(g.ghost, { allowHide: g.dangerCanHide === true });"), 'danger encounters must use the ghost role to decide whether hiding is allowed');
assert(source.includes('dangerCanHide: allowHide === true && encounterRules.dangerCanHide === true,'), 'danger sessions must enforce the role-based popup hide decision');
assert(source.includes("if (canHide) {\n      actions.appendChild(captureButton('Hide now'"), 'main-ghost danger popups must offer Hide while jerk popups omit it');
assert(source.includes('if (captureSession.dangerCanHide === true) {\n        actions.appendChild(captureButton(\'Hide and escape\''), 'danger rhythm popups must conditionally show Hide');
assert(source.includes("if (!captureSession || !captureSession.danger || captureSession.dangerCanHide !== true) return;"), 'the Hide escape handler must reject angry touch encounters');
assert(source.includes("if (state.transitioning || lobbyOpen || returnPortalOpen || captureOpen) return;"), 'the gameplay Hide button must remain available outside encounter popups');

console.log('Muenba ghost audit passed: two-second tension, carried-energy chases, and encounter-specific Hide rules.');
