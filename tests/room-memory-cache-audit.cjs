#!/usr/bin/env node
'use strict';

// Pass 4: room exploration must not retain every decoded background across a
// long session. Both Grimmerglen and Muenba share the same
// getImage/preloadAdjacent/showRoom shape, so both must bound their room
// image and glow caches to the player's current neighborhood.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const WORLDS = [
  { name: 'Grimmerglen', file: path.join(root, 'js', 'grimmerglen.js') },
  { name: 'Muenba', file: path.join(root, 'js', 'muenba.js') },
];

for (const { name, file } of WORLDS) {
  const source = fs.readFileSync(file, 'utf8');
  assert(source.includes('function trimRoomCachesToNeighborhood(roomId)'), `${name} must bound room caches to the current neighborhood`);
  assert(source.includes('imageCache.delete(cachedRoomId)'), `${name} room image cache must evict rooms outside the neighborhood`);
  assert(source.includes('roomGlowCache.delete(cachedRoomId)'), `${name} room glow canvas cache must evict rooms outside the neighborhood`);
  assert(source.includes('getRoomExits(roomId).map(exit => exit.to)'), `${name} room cache retention must follow real exits`);
  const showRoomStart = source.indexOf('function showRoom(roomId)');
  assert(showRoomStart !== -1, `${name} must define showRoom`);
  const showRoomEnd = source.indexOf('\n  }', showRoomStart);
  const showRoom = source.slice(showRoomStart, showRoomEnd);
  assert(showRoom.includes('trimRoomCachesToNeighborhood(roomId)'), `${name} showRoom must trim caches on every room change`);
}

// Grimmerglen additionally gates the fade-in on a real decode, since Safari
// can report an <img> as loaded before its first paint.
const grimmerglen = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
assert(grimmerglen.includes('function waitForGrimmerglenImage(image'), 'room transitions must have an image-readiness gate');
assert(grimmerglen.includes('image.decode()'), 'room transitions must prefer decoded image readiness');
const transitionStart = grimmerglen.indexOf('function transitionTo(exit)');
const drawingStart = grimmerglen.indexOf('// ── Drawing', transitionStart);
const transition = grimmerglen.slice(transitionStart, drawingStart);
assert(transition.includes('waitForGrimmerglenImage(currentBg).then'), 'fade-in must wait for the selected room image');

console.log('Room memory-cache audit passed: Grimmerglen and Muenba both bound room images/glow canvases to the current neighborhood, and Grimmerglen transitions wait for image readiness.');
