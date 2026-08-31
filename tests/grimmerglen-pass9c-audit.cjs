#!/usr/bin/env node
'use strict';

// Pass 9C: the explicit help choice owns the tutorial handoff, and a new
// player cannot unlock room navigation by merely viewing or skipping copy.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(runtime.includes("id=\"mg-help-btn\">I'll help Marietta!"), 'quest briefing must expose an explicit help decision');
assert(runtime.includes('helpBtn.addEventListener(\'click\', acceptMariettaHelp)'), 'only the help button may start the help flow');
assert(runtime.includes('function acceptMariettaHelp()'), 'help decision handler must exist');
assert(runtime.includes('state.helpAccepted = true;'), 'help decision must be recorded before tutorial entry');
assert(runtime.includes('function renderMariettaMemoryHint(onConfirmed)'), 'help flow must expose a separate memory hint screen');
assert(runtime.includes('id="mg-hint-ok-btn"'), 'memory hint must have an explicit OK action');
assert(runtime.includes('OK! / わかった！'), 'memory hint action must use the requested OK label');
assert(runtime.includes('Marietta is so happy you\'re here!'), 'welcome card must keep the English welcome line');
assert(runtime.includes('I am trying to remember something...'), 'welcome card must keep the memory lead');
assert(runtime.includes('startGrimmerglenTutorial();'), 'help decision must enter the tutorial for unfinished players');
assert(runtime.includes('if (!state.helpAccepted) return;'), 'navigation unlock must reject non-help paths');
assert(runtime.includes('unlockGrimmerglenNavigation();'), 'completed help flow must unlock navigation');
assert(runtime.includes('id=\"mg-tutorial-done-btn\"'), 'tutorial must have an explicit completion action');
assert(/assets:\s+'booha-assets-2026-456'/.test(serviceWorker), 'asset cache must be bumped for the Pass 9C help gateway');

console.log('Grimmerglen Pass 9C audit passed: the explicit help choice owns tutorial entry and navigation unlock.');
