#!/usr/bin/env node
'use strict';

// Pass 17B: center dance and Hide-button lock regression guard.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');

function sourceSection(startName, endName) {
  const start = source.indexOf(`function ${startName}`);
  const end = source.indexOf(`function ${endName}`, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} celebration contract`);
  return source.slice(start, end);
}

const hideSource = sourceSection('toggleHide', 'clickCheckGhost');
const celebrationSource = sourceSection('startMuenbaCelebration', 'finishMuenbaCelebration');
const finishSource = sourceSection('finishMuenbaCelebration', 'renderNuppiThanks');
const drawSource = sourceSection('drawBooha', 'drawFrame');

assert(source.includes('const CENTER_X = WORLD_W / 2;'), 'dance must use the fixed world center');
assert(source.includes('const CENTER_Y = WORLD_H / 2;'), 'dance must use the fixed world center');
assert(celebrationSource.includes('state.x = CENTER_X;'), 'celebration must re-anchor Booha horizontally');
assert(celebrationSource.includes('state.y = CENTER_Y;'), 'celebration must re-anchor Booha vertically');
assert(drawSource.includes('const dancing = state.celebrating && state.celebrateDancing;'), 'drawing must recognize the celebration dance state');
assert(drawSource.includes('const x = state.x + danceX;'), 'dance motion must remain local to the center anchor');
assert(drawSource.includes('const y = state.y + bob;'), 'dance motion must remain local to the center anchor');

assert(source.includes('function setHideButtonDisabled(disabled)'), 'Hide needs a shared disabled-state helper');
assert(hideSource.includes('state.celebrating'), 'Hide toggle must reject clicks during celebration');
assert(celebrationSource.includes('setHideButtonDisabled(true);'), 'celebration must disable Hide');
assert(celebrationSource.includes('state.hiding = false;'), 'celebration must clear any prior hiding state');
assert(finishSource.includes('setHideButtonDisabled(false);'), 'Hide must be restored after celebration settles');
assert(source.includes('#muenba-hide.is-disabled, #muenba-hide:disabled'), 'disabled Hide must have a visible non-interactive style');
assert(source.includes('hideBtn.setAttribute(\'aria-disabled\', locked ? \'true\' : \'false\');'), 'Hide lock must be announced to assistive technology');

console.log('Muenba celebration audit passed: center anchoring, local dance motion, and Hide lock contracts.');
