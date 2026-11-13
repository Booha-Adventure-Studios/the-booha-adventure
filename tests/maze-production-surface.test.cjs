#!/usr/bin/env node
'use strict';

// The Maze must not ship its private coordinate/debug surface or a
// client-side password. Development helpers belong outside the production page.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const maze = fs.readFileSync(path.join(root, 'maze.html'), 'utf8');

for (const token of [
  'BRYAN_PASS',
  'SHOW_BRYAN_BTN',
  'b_4822',
  '__boohaMazeDev',
  '__boohaShowAllCheckpoints',
  '__boohaExtraGhosts',
  'bryanBtn',
  'bryanTip',
  'coordPill',
  'coordText',
  'gridEl',
  'bryanOn',
]) {
  assert(!maze.includes(token), `maze.html must not ship the private dev surface: ${token}`);
}

assert(
  maze.includes('const pool=CHECKPOINTS.filter(c=>OPEN_WEEKS.includes(c.w));'),
  'Maze checkpoint hit testing must retain the normal open-week gate',
);

console.log('Maze production surface guard passed: no client-side password or debug bypass shipped.');
