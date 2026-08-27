#!/usr/bin/env node
'use strict';

// Pass 19I: verify that the live Muenba page is wired to the same boot,
// unlock, portal, return, and service-worker contracts as the source audits.
// This is intentionally filesystem-only so it remains safe in verify.sh.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'muenba.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const data = fs.readFileSync(path.join(root, 'js', 'muenba-data.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

function indexOfOrFail(haystack, needle, label) {
  const index = haystack.indexOf(needle);
  assert(index >= 0, `${label} must contain ${needle}`);
  return index;
}

// 1. The page must load the token gate before the application stack, then
// load Muenba data before the renderer. A missing or reordered dependency
// produces a blank page before any room logic can run.
assert(/^<!DOCTYPE html>/i.test(page), 'muenba.html must remain a complete HTML document');
assert(/<html[^>]+lang="en"/i.test(page), 'muenba.html must declare English document language');
const tokenIndex = indexOfOrFail(page, '<script src="./js/token.js"></script>', 'muenba.html');
const bodyIndex = indexOfOrFail(page, '<body>', 'muenba.html');
assert(tokenIndex < bodyIndex, 'token gate must load before the body application stack');
const scripts = [
  'js/calendar.js',
  'js/core/adventure-core.js',
  'js/core/save-file.js',
  'js/sync-client.js',
  'js/core/save-utils.js',
  'js/core/game-registry.js',
  'js/core/score-system.js',
  'js/core/unlock-system.js',
  'js/core/page-state.js',
  'js/muenba-data.js',
  'js/muenba.js'
];
let previousIndex = bodyIndex;
for (const script of scripts) {
  const currentIndex = indexOfOrFail(page, `<script src="${script}"></script>`, 'muenba.html');
  assert(currentIndex > previousIndex, `${script} must load after the previous boot dependency`);
  assert(fs.existsSync(path.join(root, script)), `${script} must exist on disk`);
  previousIndex = currentIndex;
}

// 2. The page boot gate must wait for shared systems, reject locked entry,
// and still expose the developer opener without adding a second dev panel.
assert(runtime.includes('function worldGateOpen()'), 'Muenba must have an entry gate');
assert(runtime.includes('BoohaUnlockSystem.isMuenbaUnlocked()'), 'Muenba must use the shared unlock system');
assert(runtime.includes('if (DEV_MODE || window.__devMuenba) return true;'), 'dev mode must open Muenba without changing saved unlocks');
assert(runtime.includes("Object.defineProperty(window, 'b_muenba'"), 'Muenba must expose the requested developer opener');
assert(runtime.includes("window.location.href = 'muenba.html?dev=1'"), 'developer opener must enter the Muenba page');
assert(runtime.includes("if (window.BOOHA_READY) init();"), 'Muenba must boot immediately when shared systems are ready');
assert(runtime.includes("document.addEventListener('booha:ready', init, { once: true })"), 'Muenba must wait for the shared ready event when needed');
assert(runtime.includes('if (!worldGateOpen())'), 'locked players must stop before building the world');
assert(runtime.includes('buildApp();'), 'Muenba init must build the live world');
assert(runtime.includes('openNuppiLobbyAfterEntry();'), 'Muenba init must enter through the lobby flow');
assert(!runtime.includes('injectDevPanel()'), 'Muenba must not add a duplicate developer panel');

// 3. The Karasuki portal must point to this page, preserve the return room,
// and forward the dev flag so the requested test route remains one click.
assert(karasuki.includes("href    : \"muenba.html?from=karasuki\""), 'Karasuki portal must link to Muenba');
assert(karasuki.includes("sessionStorage.setItem('muenba_return_room', 'room_13')"), 'Muenba entry must preserve its Karasuki return room');
assert(karasuki.includes('window.__devMuenba ? `${MUENBA_PORTAL.href}&dev=1` : MUENBA_PORTAL.href'), 'Karasuki must forward Muenba dev mode');
assert(karasuki.includes("const ret = sessionStorage.getItem('muenba_return_room')"), 'Karasuki must consume the return-room handoff');
assert(karasuki.includes("sessionStorage.removeItem('muenba_return_room')"), 'Karasuki must clear the consumed return-room handoff');

// 4. The service worker must precache the page and cover every relative
// script/image/audio request made by the world.
assert(serviceWorker.includes('${BASE}/muenba.html'), 'service worker must precache muenba.html');
assert(serviceWorker.includes("`${BASE}/js/`"), 'service worker must cache Muenba scripts');
assert(serviceWorker.includes("`${BASE}/assets/`"), 'service worker must cache Muenba images and audio');
assert(data.includes("bg: `assets/img/muenba/${roomId}.webp`"), 'room backgrounds must use the service-worker-covered relative asset path');
assert(runtime.includes("new Audio('assets/img/muenba/Muenba_BGM.mp3')"), 'Muenba audio must use the covered relative asset path');
assert(runtime.includes("muenba-profile.html"), 'Muenba must retain its profile route');
assert(fs.existsSync(path.join(root, 'muenba-profile.html')), 'Muenba profile route must exist');

console.log('Muenba 19I entry audit passed: page boot order, shared unlock/dev entry, Karasuki return handoff, and service-worker coverage are wired.');
