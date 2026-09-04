#!/usr/bin/env node
'use strict';

// Pass 6: keep the profile fail-soft and make the main performance budgets
// executable so later asset or loading changes cannot silently regress them.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const profileProgress = read('js/ui/profile-progress.js');
const adventureLog = read('js/ui/adventure-log.js');
const profile = read('profile.html');
const index = read('index.html');
const muenba = read('js/muenba.js');
const sw = read('sw.js');

// A single bad data/rendering section must leave a useful visible state.
assert(profileProgress.includes('function showRenderFallback'), 'profile progress must provide a visible render fallback');
assert((profileProgress.match(/showRenderFallback\(/g) || []).length >= 4, 'profile progress must isolate highlights, totals, curriculum, and achievement failures');
assert(profileProgress.includes("document.addEventListener('booha:dayRecorded', render)"), 'profile progress must repaint after a recorded day');
assert(adventureLog.includes("document.addEventListener('booha:dayRecorded', init)"), 'adventure log must repaint after a recorded day');
assert(profile.includes('id="profile-highlights"'), 'profile must mount progress highlights');
assert(profile.includes('id="profile-totals"'), 'profile must mount progress totals');
assert(profile.includes('id="curr-cards"'), 'profile must mount curriculum progress');
assert(profile.includes('id="unlocks-grid"'), 'profile must mount achievements');
assert(profile.includes('profile-render-fallback'), 'profile must style the fail-soft renderer state');

// Keep the install-time core asset set comfortably bounded. This is a byte
// budget on the files actually present, not a count that can hide a large file.
const coreMatch = sw.match(/const CORE_ASSETS = \[(.*?)\];/s);
assert(coreMatch, 'service worker must expose a parseable CORE_ASSETS list');
const coreAssets = [...coreMatch[1].matchAll(/`\$\{BASE\}\/([^`]+)`/g)].map(match => match[1]);
assert(coreAssets.length > 0, 'CORE_ASSETS must not be empty');
const coreBytes = coreAssets.reduce((sum, relative) => {
  const file = path.join(root, relative);
  assert(fs.existsSync(file), `precache asset must exist: ${relative}`);
  return sum + fs.statSync(file).size;
}, 0);
assert(coreBytes <= 2 * 1024 * 1024, `CORE_ASSETS must stay at or below 2 MiB (got ${coreBytes} bytes)`);

// All room backgrounds share the 700 KiB ceiling established by the media
// pass; check every world so a new world cannot bypass the earlier audit.
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const roomFiles = walk(path.join(root, 'assets', 'img'))
  .filter(file => /(?:^|[\\/])room_\d+\.webp$/.test(file));
assert(roomFiles.length >= 60, `expected all four 15-room worlds (found ${roomFiles.length})`);
roomFiles.forEach(file => {
  assert(fs.statSync(file).size <= 700 * 1024, `${path.relative(root, file)} must stay at or below 700 KiB`);
});

// Entry/future media must remain request-deferred.
assert(index.includes('<video id="introVideo" preload="none"'), 'intro video must retain preload=none');
assert(index.includes('data-src="assets/video/intro.mp4"'), 'intro video source must remain data-src deferred');
assert(index.includes('introVideo.load()'), 'intro video must load only from the explicit start path');
assert(muenba.includes('function makeDeferredMuenbaAudio'), 'Muenba long tracks must use deferred audio creation');
assert(!muenba.includes("const music = new Audio('assets/img/muenba/Muenba_BGM.mp3')"), 'Muenba entry must not eagerly construct the BGM with a source');

// Pass 5 remains part of the enforced regression surface, including DPR caps
// and hidden-page suspension, and this pass must invalidate cache-first JS.
assert(sw.includes("assets: 'booha-assets-2026-505'"), 'Pass 6 JS changes must bump the asset cache');
assert(read('tests/adaptive-low-power-audit.cjs').includes('document.hidden'), 'Pass 5 hidden-page audit must remain in the suite');
assert(read('tests/adaptive-low-power-audit.cjs').includes('mazeDprCap'), 'Pass 5 DPR-cap audit must remain in the suite');

console.log(`Pass 6 hardening/budget audit passed: profile fallbacks and day-record repaint are wired; ${coreBytes} precache bytes and ${roomFiles.length} room images are within budget.`);
