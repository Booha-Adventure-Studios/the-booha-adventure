#!/usr/bin/env node
'use strict';

// Pass 23D: automatic Booha travel is shorter, distance-aware, and visually
// expressive without allowing taps to accelerate or skip the flight.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const maze = fs.readFileSync(path.join(root, 'maze.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(maze.includes('const GHOST_TRAVEL_MIN_MS = 1100;'), 'Maze must keep a meaningful minimum flight');
assert(maze.includes('const GHOST_TRAVEL_MAX_MS = 2000;'), 'Maze must cap long flights');
assert(maze.includes('const GHOST_TRAVEL_BASE_MS = 700;'), 'Maze must use a short base flight');
assert(maze.includes('const GHOST_TRAVEL_MS_PER_PX = 1.18;'), 'Maze must scale flight duration by distance');
assert(maze.includes('function getGhostTravelDuration(srcIX,srcIY,dstIX,dstIY)'), 'Maze must centralize distance-aware timing');
assert(maze.includes('ghostTravelMs=getGhostTravelDuration(ghostSrcIX,ghostSrcIY,ghostDstIX,ghostDstIY);'), 'travel start must calculate the current trip duration');
assert(maze.includes('Math.min(el/ghostTravelMs,1)'), 'travel progress must use the calculated duration');
assert(!maze.includes('GHOST_TRAVEL_MS = 3800'), 'Maze must retire the fixed 3800ms travel duration');

[
  ['startGhostTravelToHWTree', 'beginGhostTravel(HW_TREE_IX,HW_TREE_IY);'],
  ['startGhostTravelToKRTree', 'beginGhostTravel(KR_TREE_IX,KR_TREE_IY);'],
  ['startGhostTravelToJukuTree', 'beginGhostTravel(JUKU_TREE_IX,JUKU_TREE_IY);'],
  ['startGhostTravel', 'beginGhostTravel(cp.ix,cp.iy);'],
].forEach(([name, call]) => {
  const start = maze.indexOf(`function ${name}(`);
  const end = start < 0 ? -1 : maze.indexOf('\n}', start);
  const body = start >= 0 ? maze.slice(start, end >= 0 ? end : maze.length) : '';
  assert(body.includes(call), `${name} must use the centralized travel helper`);
});

assert(maze.includes('function addGhostFlightBurst(ix,iy,count=14)'), 'flight feedback must include a sparkle burst');
assert(maze.includes('addGhostFlightBurst(ghostSrcIX,ghostSrcIY,16);'), 'flight must sparkle at departure');
assert(maze.includes('addGhostFlightBurst(ghostIX,ghostIY,20);'), 'flight must sparkle at arrival');
assert(maze.includes('ctx.rotate(tilt);ctx.scale(squashX,squashY);'), 'active Booha must use restrained flight motion');
assert(maze.includes('if(ghostLocked||popupOpen())return;'), 'canvas input must remain locked during flight');
assert(sw.includes('booha-pages-2026-403'), 'service-worker page cache must include the current page bump');
assert(sw.includes('booha-assets-2026-493'), 'service-worker asset cache must include the current Muenba canonical target bump');

console.log('Maze 23D travel audit passed: flights are distance-aware, automatic, and visually expressive.');
