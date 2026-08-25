#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');

assert(source.includes('const GHOST_NOTICE_DELAY_MS = 2000;'), 'sight-angry ghosts must wait exactly two seconds before screaming');
assert(source.includes('const JERK_NOTICE_DELAY_MS = 700;'), 'Jerk ghosts must react faster than ordinary sight-angry ghosts');
assert(source.includes('const JERK_CHASE_SPEED = 1.55;'), 'Jerk ghosts must chase faster once angry');
assert(source.includes('const GHOST_CARRY_CHASE_SPEED = 1.6;'), 'carrying-energy chases must use the urgent shared speed');
assert(source.includes("if (roleRules.alwaysAngry) return 'sight';"), 'jerk ghosts must use sight-triggered aggression');
assert(source.includes('if (state.cemeteryAlert) return \'sight\';'), 'declining the next hint must leave every ghost sight-angry');
assert(source.includes('state.cemeteryAlert = false;'), 'accepting the next hint must clear the cemetery alert');
assert(source.includes("Would you like Nuppi's hint for another ghost?"), 'the handoff must ask about accepting a hint');
assert(source.includes('state.cemeteryAlert = true;'), 'the no response must preserve the angry cemetery state');
assert(source.includes('function dangerRhythmConfigFor(difficulty)'), 'danger encounters must have an explicit rhythm route');
assert(source.includes('chart: carryingEnergy ? SUPER_DANGER_RHYTHM_CHART : difficulty.dangerChart,'), 'danger encounters must use the difficult danger chart');
assert(source.includes("dangerMode: carryingEnergy ? 'carried-energy' : encounterRole === 'jerk' ? 'jerk' : 'main',"), 'danger encounters must preserve the carried-energy, jerk, or main route');
assert(source.includes('const SUPER_DANGER_RHYTHM_BPM = 180;'), 'carried-energy encounters must use the super-danger speed');
assert(source.includes("dangerMode: carryingEnergy ? 'carried-energy' : encounterRole === 'jerk' ? 'jerk' : 'main',"), 'carried-energy encounters must have their own danger mode');
assert(source.includes('chart: carryingEnergy ? SUPER_DANGER_RHYTHM_CHART : difficulty.dangerChart,'), 'carried-energy encounters must use the super-danger chart');
assert(source.includes('function loseCarriedEnergyAndMarkRestart()'), 'failed carried-energy encounters must have a loss path');
assert(source.includes('restartHuntAfterCarriedEnergyLoss'), 'failed carried-energy encounters must restart the hunt');
assert(source.includes('if (carryingStolenEnergy) return \'sight\';'), 'carrying energy must make every ghost sight-angry');
assert(source.includes("if (Number(readMuenba().orbsPending) > 0) return null;"), 'carrying energy must clear capture eligibility until handoff');
assert(source.includes("if (!carryingStolenEnergy && ghostId === target) return 'friendly';"), 'the assigned hunt ghost must stay quiet during an ordinary hunt');
assert(!source.includes('muenbaGhostHostility'), 'ordinary non-target ghosts must not use a seeded random hostility split');
assert(source.includes('chaseSpeed: carryingEnergy'), 'ghosts must remember the carried-energy chase speed');
assert(source.includes("startGhostScream(activeGhost, performance.now(), 'carried-energy');"), 'carried-energy rooms must begin screaming immediately');
assert(source.includes("if (g.carryingEnergy && g.hostility === 'sight' && !g.screaming)"), 'coming out of hiding with energy must re-arm the chase immediately');
assert(source.includes('&& !g.carryingEnergy'), 'ordinary chases may lose interest at range, but carried-energy chases must persist');
assert(source.includes('let carriedEnergyVignetteCanvas;'), 'carried-energy atmosphere must use its own cached layer');
assert(source.includes('carriedEnergyVignetteCanvas = document.createElement(\'canvas\');'), 'carried-energy vignette must be cached once');
assert(source.includes('const returnTripActive = Number(readMuenba().orbsPending) > 0'), 'carried-energy atmosphere must follow pending orbs');
assert(source.includes('&& state.roomId !== MUENBA_NUPPI.roomId;'), 'room_01 must remain the safe visual reset during the return trip');
assert(source.includes('atmosphereCtx.drawImage(carriedEnergyVignetteCanvas, 0, 0);'), 'carried-energy atmosphere must composite the cached vignette');
assert(source.includes('moveGhostToward(g, state.x, state.y, g.chaseSpeed || GHOST_CHASE_SPEED);'), 'chasing must use the carried-energy speed when active');
assert(source.includes("if (g.hostility === 'sight' && !g.screaming)"), 'sight-angry ghosts must use the delayed notice path');
assert(source.includes("beginDangerEncounter(g.ghost, { allowHide: g.dangerCanHide === true });"), 'danger encounters must use the ghost role to decide whether hiding is allowed');
assert(source.includes('dangerCanHide: !carryingEnergy && allowHide === true && encounterRules.dangerCanHide === true,'), 'danger sessions must enforce the role-based popup hide decision');
assert(source.includes("if (canHide) {\n      actions.appendChild(captureButton('Hide now'"), 'main-ghost danger popups must offer Hide while jerk popups omit it');
assert(source.includes('if (captureSession.dangerCanHide === true) {\n        actions.appendChild(captureButton(\'Hide and escape\''), 'danger rhythm popups must conditionally show Hide');
assert(source.includes("if (!captureSession || !captureSession.danger || captureSession.dangerCanHide !== true) return;"), 'the Hide escape handler must reject angry touch encounters');
assert(source.includes("if (state.transitioning || lobbyOpen || returnPortalOpen || captureOpen) return;"), 'the gameplay Hide button must remain available outside encounter popups');

console.log('Muenba ghost audit passed: two-second tension, carried-energy chases, and encounter-specific Hide rules.');
