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

// Maze arrival (Nov 2026, js/core/maze-arrival.js): the flyover loads inside
// startFlyover(), which only the arrival tap calls; never earlier.
{
  const start = maze.indexOf('function startFlyover(){');
  const fly = maze.slice(start, maze.indexOf('\n}\n', start));
  assert(start > 0 && /loadMediaSource\(toMazeVideo\);/.test(fly), 'transition video must load from its user action');
  const tap = maze.slice(maze.indexOf("continueBtn.addEventListener('click'"), maze.indexOf('\n});', maze.indexOf("continueBtn.addEventListener('click'")));
  assert(/startFlyover\(\);/.test(tap), 'the arrival tap starts the flyover');
  assert.strictEqual((maze.match(/startFlyover\(\);/g) || []).length, 1, 'only the arrival tap starts the flyover');
}
assert(maze.includes('loadMediaSource(hwTreeVideo);'), 'Homework video must load from its confirmation action');
assert(maze.includes('loadMediaSource(krVideo);'), 'Karasuki video must load from its confirmation action');
assert(maze.includes('loadMediaSource(bgMusic);\n  return bgMusic.play();'), 'BGM must load immediately before playback');
assert(/pages:\s*'booha-pages-2026-\d+'/.test(sw), 'service-worker page cache must declare a year-scoped numeric version');
assert(/assets:\s*'booha-assets-2026-\d+'/.test(sw), 'service-worker asset cache must include the current canonical target asset bump');

console.log('Maze 23C media-loading audit passed: videos and BGM are deferred until needed.');
