#!/usr/bin/env node
'use strict';

// Pass 4: room exploration must not retain every decoded background and must
// not reveal a newly selected room before its first usable decode.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');

assert(source.includes('function trimRoomCachesToNeighborhood(roomId)'), 'Grimmerglen must bound room caches to the current neighborhood');
assert(source.includes('imageCache.delete(cachedRoomId)'), 'room image cache must evict rooms outside the neighborhood');
assert(source.includes('roomGlowCache.delete(cachedRoomId)'), 'room glow canvas cache must evict rooms outside the neighborhood');
assert(source.includes('getRoomExits(roomId).map(exit => exit.to)'), 'room cache retention must follow real exits');
assert(source.includes('function waitForGrimmerglenImage(image'), 'room transitions must have an image-readiness gate');
assert(source.includes('image.decode()'), 'room transitions must prefer decoded image readiness');
const transitionStart = source.indexOf('function transitionTo(exit)');
const drawingStart = source.indexOf('// ── Drawing', transitionStart);
const transition = source.slice(transitionStart, drawingStart);
assert(transition.includes('waitForGrimmerglenImage(currentBg).then'), 'fade-in must wait for the selected room image');

console.log('Grimmerglen Pass 4 audit passed: room images/glow canvases are neighborhood-bounded and transitions wait for image readiness.');
