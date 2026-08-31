#!/usr/bin/env node
'use strict';

// Pass 23B: Maze visual requests are deferred until the image is needed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const maze = fs.readFileSync(path.join(root, 'maze.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(maze.includes('function makeDeferredImage(src)'), 'Maze must define a deferred image factory');
assert(maze.includes('function ensureDeferredImage(image)'), 'Maze must define a deferred image request helper');
assert(maze.includes('const ghostImgs = GHOSTS.map(src => {\n  return makeDeferredImage(src);\n});'), 'main ghost images must not request at boot');
assert(maze.includes('const extraGhostImgs = EXTRA_BOOHA_GHOSTS.map(src => {\n  return makeDeferredImage(src);\n});'), 'extra ghost images must not request at boot');
assert(maze.includes('const activeImg=ensureDeferredImage(ghostImgs[activeGhostIdx]);'), 'active Booha must request its canvas image when visible');
assert(maze.includes('function requestMazeVisuals()'), 'Maze must define a scene-art request boundary');
assert(maze.includes('requestMazeVisuals();\n  resizeCanvas();buildWanderers();startLoop();'), 'scene art must request when Maze starts or restores');

['hwTreeEmoji', 'krTreeLogo', 'jkTreeLogo'].forEach((id) => {
  assert(maze.includes(`id="${id}" data-src=`), `${id} must use data-src until its popup opens`);
  assert(maze.includes(`loadPopupImage(${id});`), `${id} must load when its popup opens`);
});

assert(!/const (homeworkImg|karasuki1Img|karasuki2Img|jukuImg)=new Image\(\);[^\n]*\.src=/.test(maze), 'tree art must not assign src at declaration');
assert(!/const i = new Image\(\);\s*i\.src = src;/.test(maze), 'ghost preloads must not assign src inside the map');
assert(sw.includes('booha-pages-2026-381'), 'service-worker page cache must include the current page bump');
assert(sw.includes('booha-assets-2026-462'), 'service-worker asset cache must include the current Marietta help-gating bump');

console.log('Maze 23B image-loading audit passed: ghost, tree, and popup art requests are deferred until needed.');
