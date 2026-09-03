#!/usr/bin/env node
'use strict';

// Transition audit: keep room motion alive under fades and never reveal an
// incoming room before its image has had a bounded chance to decode.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const karasuki = read('js/karasuki.js');
const utsuroba = read('js/utsuroba.js');
const muenba = read('js/muenba.js');
const grimmerglen = read('js/grimmerglen.js');

const karaStatic = karasuki.slice(karasuki.indexOf('function staticFrameOverlayOpen()'), karasuki.indexOf('function scheduleKarasukiFrame()'));
assert(!karaStatic.includes('anyModalOpen()'), 'Karasuki transition drawing must not reuse the interaction modal guard');
assert(!karaStatic.includes('state.transitioning'), 'Karasuki ordinary transitions must not freeze the canvas');

for (const [name, source, waitName] of [
  ['Karasuki', karasuki, 'waitForKarasukiImage'],
  ['Utsuroba', utsuroba, 'waitForUtsurobaImage'],
  ['Muenba', muenba, 'waitForMuenbaImage'],
  ['Grimmerglen', grimmerglen, 'waitForGrimmerglenImage'],
]) {
  assert(source.includes(`function ${waitName}(image, timeoutMs = 1600)`), `${name} must use a bounded image-readiness helper`);
  assert(source.includes('image.decode()'), `${name} must attempt image decode readiness`);
  assert(source.includes('window.setTimeout(() => settle'), `${name} image readiness must have a timeout fallback`);
  const transition = source.slice(source.indexOf('function transitionTo('), source.indexOf('function getNPPExit('));
  assert(transition.includes(`${waitName}(`), `${name} transitions must await incoming image readiness`);
  assert(transition.includes('state.transitioning = false'), `${name} transitions must always release their transition lock`);
}

for (const [name, source] of [['Karasuki', karasuki], ['Utsuroba', utsuroba]]) {
  const exits = source.slice(source.indexOf('function getRoomExits('), source.indexOf('function trimRoomCachesToNeighborhood('));
  assert(exits.includes('NPP[roomId]'), `${name} adjacency must come from NPP`);
  assert(source.includes('function preloadAdjacent('), `${name} must preload adjacent rooms`);
  assert(source.includes('function trimRoomCachesToNeighborhood('), `${name} must bound its room image cache`);
  assert(source.includes('image.decoding = \'async\''), `${name} room images must request async decoding`);
}

assert(muenba.includes('function trimRoomCachesToNeighborhood('), 'Muenba cache contract must remain intact');
assert(grimmerglen.includes('function trimRoomCachesToNeighborhood('), 'Grimmerglen reference cache contract must remain intact');

console.log('Room-transition readiness audit passed: all worlds keep bounded, failure-safe image transitions and Karasuki keeps drawing under ordinary fades.');
