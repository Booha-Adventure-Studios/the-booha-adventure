#!/usr/bin/env node
'use strict';

// Pass 27E: closing the portrait popup/rhythm surface must hand control back
// to the landscape explorable world only after the phone is ready.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');

assert(source.includes('function requestMuenbaLandscapeAfterPopup()'),
  'Muenba must centralize the popup-to-world orientation handoff');
assert(source.includes("setMuenbaOrientationMode('landscape');"),
  'closing the last popup must request landscape mode');
assert(source.includes('scheduleMuenbaOrientationCheck();'),
  'landscape return must refresh the rotate fallback promptly');
assert((source.match(/requestMuenbaLandscapeAfterPopup\(\);/g) || []).length >= 9,
  'all Muenba popup/capture close paths must request the landscape handoff');
assert(source.includes('if (orientationReady && !state.transitioning && !returnPortalOpen && !lobbyOpen && !captureOpen)'),
  'the world must remain paused until the landscape orientation is ready');
assert(source.includes('if (!isMuenbaOrientationReady()) return;'),
  'direct input must remain blocked during the return rotation');
assert(source.includes("captureOverlay.classList.remove('muenba-rhythm-mode');"),
  'closing a rhythm capture must clear its portrait-specific surface');

console.log('Muenba 27E landscape-return audit passed: close paths request landscape and movement waits for orientation readiness.');
