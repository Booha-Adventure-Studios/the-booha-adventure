#!/usr/bin/env node
'use strict';

// Performance Pass 10: Maze uses the shared rolling monitor and developer
// overlay instead of its retired one-shot 90-frame probe.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const maze = fs.readFileSync(path.join(root, 'maze.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(maze.includes('<script src="./js/core/adventure-performance.js"></script>'), 'Maze must load the shared performance helper');
assert(maze.includes('window.BoohaPerformance.create'), 'Maze must create the shared performance monitor');
assert(maze.includes('worldPerf.sample(now'), 'Maze must sample active frames');
assert(maze.includes('worldPerf.pause()'), 'Maze must pause measurement for hidden/modal time');
assert(maze.includes('worldPerf.shouldRender(now)'), 'Maze must use the shared deliberate low-tier render schedule');
assert(maze.includes('worldPerf.enableOverlay'), 'Maze must expose the shared developer-only performance overlay');
assert(maze.includes('onTierChange'), 'Maze must resize immediately when the shared tier changes');
assert(!maze.includes('mazePerfFrameCount'), 'Maze must retire the one-shot frame counter');
assert(!maze.includes('mazePerfFirstTime'), 'Maze must retire the one-shot first-frame timestamp');
assert(sw.includes('booha-pages-2026-410'), 'Maze HTML changes must bump the page cache');
assert(sw.includes('booha-assets-2026-523'), 'Maze/shared-runtime changes must bump the asset cache');

console.log('Maze shared-performance audit passed: rolling monitor, low-tier scheduling, visibility/modal pause, and developer overlay are wired.');
