#!/usr/bin/env node
'use strict';

// Pass 23C: Maze video and audio requests are deferred until interaction.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const maze = fs.readFileSync(path.join(root, 'maze.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

[
  ['toMazeVideo', 'assets/video/ttmaze.mp4'],
  ['hwTreeVideo', 'assets/video/homework.mp4'],
  ['krVideo', 'assets/video/karasuki.mp4'],
  ['bgMusic', 'assets/audio/sneaky.mp3'],
].forEach(([id, src]) => {
  assert(maze.includes(`id="${id}" data-src="${src}"`), `${id} must use a deferred media source`);
  assert(!maze.includes(`id="${id}" src="${src}"`), `${id} must not request media at parse time`);
});

assert(maze.includes('function loadMediaSource(media)'), 'Maze must define a deferred media loader');
assert(maze.includes('media.load();'), 'deferred media loader must initialize the media element after assigning its source');
assert(maze.includes('function playBgMusic(){'), 'BGM playback must use a centralized deferred wrapper');
assert(!/<source\b/i.test(maze), 'Maze media must not include eager source children');
assert(!/id="(?:toMazeVideo|hwTreeVideo|krVideo|bgMusic)"[^>]*preload="auto"/.test(maze), 'Maze media must not use eager preload');

assert(maze.includes('loadMediaSource(toMazeVideo);\n  overlay1.classList.add'), 'transition video must load from its user action');
assert(maze.includes('loadMediaSource(hwTreeVideo);'), 'Homework video must load from its confirmation action');
assert(maze.includes('loadMediaSource(krVideo);'), 'Karasuki video must load from its confirmation action');
assert(maze.includes('loadMediaSource(bgMusic);\n  return bgMusic.play();'), 'BGM must load immediately before playback');
assert(sw.includes('booha-pages-2026-403'), 'service-worker page cache must include the current page bump');
assert(sw.includes('booha-assets-2026-489'), 'service-worker asset cache must include the current canonical target asset bump');

console.log('Maze 23C media-loading audit passed: videos and BGM are deferred until needed.');
