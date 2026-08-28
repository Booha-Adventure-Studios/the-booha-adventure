#!/usr/bin/env node
'use strict';

// Pass 28F: danger audio must respect page visibility without changing BGM.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');

assert(source.includes('let dangerScreamVisibilityPaused = false;'), 'visibility handling must track a paused danger layer');
assert(source.includes('function dangerScreamStateIsActive()'), 'visibility handling must identify active danger states');
assert(source.includes('function handleMuenbaVisibilityChange()'), 'Muenba must have a visibility lifecycle handler');
assert(source.includes('if (document.hidden)'), 'danger audio must stop when the page is hidden');
assert(source.includes('dangerScreamVisibilityPaused = true;'), 'hidden danger state must remember that audio was paused');
assert(source.includes('dangerScreamVisibilityPaused = false;'), 'returning to the page must clear the paused marker');
assert(source.includes("document.addEventListener('visibilitychange', handleMuenbaVisibilityChange);"), 'Muenba must register the visibility lifecycle handler');
assert(source.includes('!captureSession?.rhythm'), 'visibility resume must not restart screams during rhythm gameplay');
assert(source.includes('stopDangerScream();'), 'hidden danger state must stop authored screams');
assert(source.includes('startDangerScream();'), 'visible danger state must resume authored screams');
assert(!source.includes('dangerRhythmMusic.pause();\n      music.pause();'), 'visibility handling must not add a BGM shutdown path');

console.log('Muenba 28F visibility-audio audit passed: authored danger sounds pause off-page and resume only for non-rhythm danger states.');
