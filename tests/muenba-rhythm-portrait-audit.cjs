#!/usr/bin/env node
'use strict';

// Pass 27D: the active rhythm stage has an explicit portrait surface that
// lasts through countdown, play, help, result, and reward.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');

assert(source.includes("captureOverlay.dataset.surface = captureSession.rhythm ? 'rhythm' : 'capture';"),
  'capture surfaces must distinguish rhythm from reading/capture screens');
assert(source.includes("captureOverlay.classList.toggle('muenba-rhythm-mode', !!captureSession.rhythm);"),
  'fresh capture scenes must derive the rhythm surface from session state');
assert(source.includes("captureOverlay.classList.add('muenba-rhythm-mode');"),
  'rhythm startup must explicitly enter rhythm mode');
assert(source.includes("captureOverlay.dataset.surface = 'rhythm';"),
  'rhythm renderers must retain the rhythm surface through phase changes');
assert(source.includes("captureOverlay.classList.remove('muenba-rhythm-mode');"),
  'closing a capture must clear the rhythm surface');
assert(source.includes('html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode .muenba-lobby-box'),
  'portrait rhythm mode must have its own compact card layout');
assert(source.includes('html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode .muenba-rhythm-board'),
  'portrait rhythm mode must size the chart board explicitly');
assert(source.includes('html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode .muenba-rhythm-lane'),
  'portrait rhythm mode must size each playable lane explicitly');
assert(source.includes("captureSession.phase = 'rhythm-help';") && source.includes('renderRhythmHelp();'),
  'rhythm help must remain inside the rhythm session');
assert(source.includes("captureSession.phase = 'practice-result';") && source.includes('renderPracticeResult(accuracy, success);'),
  'practice results must remain part of the rhythm surface');

console.log('Muenba 27D rhythm-portrait audit passed: explicit rhythm surface, lifecycle cleanup, and phone lane layout are wired.');
