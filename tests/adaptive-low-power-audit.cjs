#!/usr/bin/env node
'use strict';

// Pass 5: animated worlds must stop hidden-page work, hold a static canvas
// behind DOM panels, and lower their backing-store cost on slow devices.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const utsuroba = fs.readFileSync(path.join(root, 'js', 'utsuroba.js'), 'utf8');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const grimmerglen = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const maze = fs.readFileSync(path.join(root, 'maze.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

for (const [name, source] of [['Utsuroba', utsuroba], ['Muenba', muenba], ['Grimmerglen', grimmerglen], ['Karasuki', karasuki]]) {
  assert(source.includes('document.hidden'), `${name} must track hidden-page state`);
  assert(source.includes('cancelAnimationFrame'), `${name} must cancel its frame when hidden`);
  assert(source.includes('schedule') && source.includes('pageHidden'), `${name} must schedule frames only while visible`);
  assert(source.includes('worldInitialized'), `${name} must not schedule before world initialization`);
  assert(source.includes('perfTier'), `${name} must expose an adaptive performance tier`);
  assert(source.includes('averageFps') || source.includes('avg'), `${name} must measure initial frame rate`);
  assert(source.includes('shadowsEnabled'), `${name} must have a low-tier rendering fallback`);
  assert(source.includes('staticFrameOverlayOpen'), `${name} must avoid repainting behind open panels`);
}

assert(utsuroba.includes("const dpr = perfTier === 'low' ? 1 : MAX_DPR;"),
  'Utsuroba must lower its canvas DPR after a low-performance downgrade');
assert(/resizeCanvas\(\);\s+trail\.length/.test(utsuroba),
  'Utsuroba must apply the low-performance canvas downgrade immediately');
assert(muenba.includes("const maxDpr = perfTier === 'low' ? 1 :"),
  'Muenba must lower all world canvas DPRs on low-performance devices');
assert(muenba.includes('function scheduleMuenbaFrame()'),
  'Muenba must own a visibility-aware world-frame scheduler');
assert(/if\s*\(!staticFrameOverlayOpen\(\)\s*&&\s*worldPerf\.shouldRender\(now\)\)\s*drawFrame\(now\)/.test(muenba),
  'Muenba must hold a static frame behind open panels');

assert(maze.includes('MAZE_LOW_POWER_HINT'), 'Maze must detect low-power device hints');
assert(maze.includes('BoohaPerformance.create'), 'Maze must use the shared performance monitor');
assert(maze.includes('worldPerf.sample(now'), 'Maze must measure active world frames periodically');
assert(maze.includes('worldPerf.pause()'), 'Maze must pause shared performance measurement while hidden or modal');
assert(maze.includes('worldPerf.shouldRender(now)'), 'Maze must intentionally schedule low-mode renders');
assert(maze.includes('mazePerfTier'), 'Maze must expose an adaptive performance tier');
assert(maze.includes('function mazeDprCap(){ return mazePerfTier === \'low\' ? 1 : 1.5; }'), 'Maze must cap normal DPR at 1.5 and low-power DPR at 1');
assert(maze.includes('if(!isPopupOpen&&worldPerf.shouldRender(now))drawFrame(now);'), 'Maze must hold a static frame behind popups');
assert(maze.includes('pageHidden=document.hidden'), 'Maze must pause its render loop while hidden');
assert(sw.includes('booha-assets-2026-516'), 'Pass 5 changes must bump the asset cache');

console.log('Adaptive low-power audit passed: hidden pages suspend rendering, popups hold static frames, and slow-device fallbacks are wired across the worlds.');
