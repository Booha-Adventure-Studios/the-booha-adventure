#!/usr/bin/env node
'use strict';

// Pass 9E: the profile is a safe, browseable preview, but the unfinished
// playable world remains closed to regular players and opens only in DEV.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const unlock = fs.readFileSync(path.join(root, 'js', 'core', 'unlock-system.js'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'grimmerglen-profile.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const profilePages = ['profile.html', 'adventure-profile.html', 'utsuroba-profile.html', 'muenba-profile.html'];

assert(runtime.includes("const DEV_MODE = params.get('dev') === '1';"),
  'playable-world DEV mode must require the explicit dev=1 query flag');
assert(runtime.includes('if (DEV_MODE) window.__devGrimmerglen = true;'),
  'the explicit DEV flag must establish the Grimmerglen test override');

const gateStart = runtime.indexOf('function worldGateOpen()');
const gateEnd = runtime.indexOf('function showLockedWorld()', gateStart);
assert(gateStart >= 0 && gateEnd > gateStart, 'runtime must expose a bounded world gate before boot');
const gate = runtime.slice(gateStart, gateEnd);
assert(gate.includes('if (DEV_MODE || window.__devGrimmerglen) return true;'),
  'DEV tools must be able to open the unfinished world');
assert(gate.includes('BoohaUnlockSystem.isGrimmerglenUnlocked()'),
  'regular players must still pass the shared Grimmerglen unlock gate');

const initStart = runtime.indexOf('function init()');
const initEnd = runtime.indexOf('if (window.BOOHA_READY)', initStart);
assert(initStart >= 0 && initEnd > initStart, 'runtime must have a bounded boot function');
const init = runtime.slice(initStart, initEnd);
assert(init.indexOf('if (!worldGateOpen())') >= 0, 'boot must check the world gate');
assert(init.indexOf('showLockedWorld();') > init.indexOf('if (!worldGateOpen())'),
  'locked boot must render the locked-world screen');
assert(init.indexOf('return;') > init.indexOf('showLockedWorld();'),
  'locked boot must stop before constructing the playable world');
assert(init.indexOf('buildApp();') > init.indexOf('return;'),
  'playable app construction must happen only after the gate passes');

assert(unlock.includes('const GRIMMERGLEN_BUILD_READY = false;'),
  'the unfinished-world build flag must remain closed');
const unlockStart = unlock.indexOf('function isGrimmerglenUnlocked()');
const unlockEnd = unlock.indexOf('function isUnlocked(id)', unlockStart);
const unlockFn = unlock.slice(unlockStart, unlockEnd);
assert(unlockFn.includes('if (window.__devGrimmerglen) return true;'),
  'the shared unlock API must support the DEV override');
assert(unlockFn.includes('if (!GRIMMERGLEN_BUILD_READY) return false;'),
  'regular players must be denied before the world ships');
assert(unlockFn.includes('return isWeeklyWorldGateOpen();'),
  'the normal post-ship path must still use the weekly world gate');

assert(runtime.includes("window.location.href = 'grimmerglen.html?dev=1';"),
  'the DEV helper must enter through the explicit DEV URL');
const devHelperStart = runtime.indexOf("Object.defineProperty(window, 'b_grimmerglen'");
const devHelperEnd = runtime.indexOf('})();', devHelperStart);
const devHelper = runtime.slice(devHelperStart, devHelperEnd);
assert(devHelper.includes('window.__devGrimmerglen = true;'),
  'the DEV helper must set only the Grimmerglen test override');

assert(profile.includes('<a class="enter-link" id="enter-world" href="grimmerglen.html" hidden>'),
  'the profile world doorway must start hidden');
const doorStart = profile.indexOf('function renderDoor()');
const doorEnd = profile.indexOf('function renderStats()', doorStart);
const door = profile.slice(doorStart, doorEnd);
assert(door.includes('BoohaUnlockSystem.isGrimmerglenUnlocked()'),
  'the profile doorway must use the shared Grimmerglen gate');
assert(door.includes('document.getElementById(\'enter-world\').hidden = !open;'),
  'the profile doorway must reveal Enter only after the gate opens');

for (const pageName of profilePages) {
  const source = fs.readFileSync(path.join(root, pageName), 'utf8');
  assert(source.includes('id="pnet-grimmerglen"'),
    `${pageName} must expose the safe Grimmerglen profile tab`);
  assert(!source.includes('id="pnet-grimmerglen" hidden'),
    `${pageName} must not hide the safe profile tab`);
}

assert(verify.includes('tests/grimmerglen-pass9e-audit.cjs'),
  'verify.sh must run the Pass 9E lock-surface audit');

console.log('Grimmerglen Pass 9E audit passed: profile preview stays safe and the unfinished world remains DEV-gated.');
