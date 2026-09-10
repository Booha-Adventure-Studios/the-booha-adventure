#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notStrictEqual(start, -1, `missing ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notStrictEqual(end, -1, `missing ${endMarker}`);
  return source.slice(start, end);
}

const modalGuard = section('function anyModalOpen()', 'function updatePerfTier');
assert.match(modalGuard, /state\.grimmerglenExiting/, 'anyModalOpen must block while Grimmerglen is exiting');

const frameGuard = section('function staticFrameOverlayOpen()', 'function scheduleKarasukiFrame');
assert.match(frameGuard, /isGrimmerglenPopupOpen\(\)/, 'staticFrameOverlayOpen must freeze on the Grimmerglen popup');
assert.match(frameGuard, /state\.grimmerglenExiting/, 'staticFrameOverlayOpen must freeze while Grimmerglen is exiting');

const grimmerglenActions = section("wpopSetActions('grimmerglen-pop'", '    } else {');
assert.match(
  grimmerglenActions,
  /onClick: \(\) => \{ enterGrimmerglen\(\); \}/,
  'Grimmerglen Yes must use the single world-exit transition'
);
assert.doesNotMatch(
  grimmerglenActions,
  /closeGrimmerglenPopup\(\); enterGrimmerglen\(\)/,
  'Grimmerglen Yes must not stack popup-close and world-exit fades'
);

console.log('Karasuki Grimmerglen transition audit passed: popup/exiting guards freeze the world and Yes uses one exit transition.');
