#!/usr/bin/env node
'use strict';

// Pass 28G: direct Muenba popup controls must use the shared UI sound path.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');

assert(source.includes("function addMuenbaButtonSfx(button, sound = 'buttonPress')"), 'Muenba must provide one shared direct-button SFX wrapper');
assert(source.includes("addMuenbaButtonSfx(document.getElementById('muenba-return-yes'))"), 'return confirmation must acknowledge the Yes control');
assert(source.includes("addMuenbaButtonSfx(document.getElementById('muenba-return-no'))"), 'return confirmation must acknowledge the Stay control');
assert(source.includes("addMuenbaButtonSfx(missionHintToggle)"), 'the mission hint toggle must have click feedback');
assert(source.includes("addMuenbaButtonSfx(lobbyOverlay.querySelector('#muenba-lobby-begin'))"), 'the Nuppi welcome handoff must have click feedback');
assert(source.includes("addMuenbaButtonSfx(lobbyOverlay.querySelector('#muenba-case-board-next'))"), 'the case-board advance must have click feedback');
assert(source.includes("addMuenbaButtonSfx(lobbyOverlay.querySelector('#muenba-hunt-card-begin'))"), 'the hunt handoff must have click feedback');
assert(source.includes("if (handoff) addMuenbaButtonSfx(handoff)"), 'the Nuppi energy handoff must have click feedback');
assert(source.includes("addMuenbaButtonSfx(lobbyOverlay.querySelector('#muenba-room-nuppi-close'))"), 'the room Nuppi close control must have click feedback');
assert(source.includes("if (find) addMuenbaButtonSfx(find)"), 'the next-hunt hint control must have click feedback');
assert(source.includes("addMuenbaButtonSfx(lobbyOverlay.querySelector('#muenba-handoff-later'))"), 'the deferred-hunt control must have click feedback');
assert(source.includes("playUiSfx('buttonPress');\n    state.hiding = !state.hiding;"), 'Hide/Come out must have click feedback');
assert((source.match(/playUiSfx\('nuppiOpen'\);/g) || []).length >= 3, 'all three Nuppi popup entry states must use the bespoke Nuppi cue');
assert(!source.includes("playUiSfx('mischiefReward');"), 'Muenba must not fall back to the generic mischief cue for Nuppi popups');

console.log('Muenba 28G popup-SFX audit passed: direct controls and Nuppi popup states use the centralized sound palette.');
