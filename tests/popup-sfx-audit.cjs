#!/usr/bin/env node
'use strict';

// Shared popup/click sounds use the centralized WebAudio palette. BGM, looped
// tracks, and Muenba's authored danger samples remain separate.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const sfx = read('js', 'utsu-sfx.js');
const karasuki = read('js', 'karasuki.js');
const muenba = read('js', 'muenba.js');
const muenbaPage = read('muenba.html');
const serviceWorker = read('sw.js');

assert(sfx.includes('var ctx = null'), 'popup SFX must reuse the shared lazy audio context');
assert(sfx.includes('window.AudioContext || window.webkitAudioContext'), 'popup SFX must use the WebAudio-compatible path');
['popupOpen', 'popupClose', 'buttonPress', 'skeletonClose', 'mischiefReward', 'slimeClick', 'ghostError', 'lockedRattle', 'phantomCancel', 'nuppiOpen', 'observerOpen'].forEach(name => {
  assert(sfx.includes(`${name}: function ()`), `shared SFX palette is missing ${name}`);
});
assert(!sfx.includes('new Audio('), 'popup palette must not introduce audio-file playback');

['popupOpen', 'popupClose', 'buttonPress', 'skeletonClose', 'observerOpen', 'nuppiOpen', 'lockedRattle'].forEach(name => {
  assert(karasuki.includes(`UtsuSfx.${name}`), `Karasuki must wire ${name} to a popup or click event`);
});

assert(muenbaPage.indexOf('<script src="js/utsu-sfx.js"></script>') < muenbaPage.indexOf('<script src="js/muenba.js"></script>'), 'Muenba must load shared SFX before its world script');
['popupOpen', 'popupClose', 'buttonPress', 'ghostError', 'phantomCancel', 'nuppiOpen'].forEach(name => {
  assert(muenba.includes(`playUiSfx('${name}')`), `Muenba must wire ${name} to a short event`);
});
assert(muenba.includes('music.loop = true'), 'Muenba BGM loop must remain intact');
assert(muenba.includes('dangerRhythmMusic.loop = true'), 'Muenba rhythm loop must remain intact');

assert(serviceWorker.includes('${BASE}/js/utsu-sfx.js'), 'shared SFX helper must be precached by the service worker');
assert(serviceWorker.includes('booha-pages-2026-377'), 'service-worker page cache must include the current popup pass bump');

console.log('Popup procedural audio audit passed: shared WebAudio hooks are wired and BGM/looped tracks remain untouched.');
