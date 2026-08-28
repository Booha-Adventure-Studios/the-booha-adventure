#!/usr/bin/env node
'use strict';

// Pass 27A: Muenba keeps the world/hunt in landscape and gives phone popup
// and rhythm states a portrait orientation request with a safe fallback gate.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'muenba.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');

assert(!page.includes('name="screen-orientation" content="landscape"'),
  'Muenba must not declare one static orientation for every game state');
assert(!page.includes('name="x5-orientation" content="landscape"'),
  'Muenba must not leave a static landscape hint that conflicts with popup portrait mode');
assert(source.includes('let orientationMode = \'landscape\';'),
  'Muenba must default to landscape for world exploration');
assert(source.includes('function isMuenbaPhoneViewport()'),
  'orientation switching must be limited to phone-sized touch viewports');
assert(source.includes('Math.min(window.innerWidth, window.innerHeight) <= 540'),
  'small tablets must remain outside the phone-only orientation handoff');
assert(source.includes('function isMuenbaOrientationReady()'),
  'Muenba must expose a single orientation readiness guard');
assert(source.includes('function setMuenbaOrientationMode(mode)'),
  'Muenba must switch orientation intent by game mode');
assert(source.includes("orientation.lock(`${nextMode}-primary`);"),
  'phone mode changes must request the matching native orientation when supported');
assert(source.includes('function syncMuenbaOrientationMode()'),
  'orientation intent must be derived from popup state instead of individual screens');
assert(source.includes('const popupState = lobbyOpen || captureOpen || returnPortalOpen;'),
  'all Muenba popup families must enter portrait mode together');
assert(source.includes('#muenba-rotate-overlay.is-visible'),
  'orientation fallback must be controlled by runtime state');
assert(!source.includes('@media screen and (orientation:portrait) and (max-width:1023px) { #muenba-rotate-overlay'),
  'the old universal landscape gate must not override popup portrait mode');
assert(source.includes('window.addEventListener(\'orientationchange\', scheduleMuenbaOrientationCheck'),
  'orientation changes must refresh the fallback gate');
assert(source.includes('if (orientationReady && !state.transitioning && !returnPortalOpen && !lobbyOpen && !captureOpen)'),
  'world movement must remain paused until the requested orientation is ready');
assert(source.includes('if (!isMuenbaOrientationReady()) return;'),
  'direct touch input must remain paused during orientation handoff');

console.log('Muenba 27A orientation audit passed: landscape world mode, portrait popup/rhythm intent, native request fallback, and movement guard are wired.');
