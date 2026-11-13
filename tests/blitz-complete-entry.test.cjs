#!/usr/bin/env node
'use strict';

// Blitz reminders (Nov 2026): the maze warm-up screen keeps reminding about
// this week's Blitz on every fresh entry until all 3 are done. Once they are,
// a fresh entry skips the warm-up and plays the flyover muted (no tap has
// happened yet, and iPads only start a video without one when it is muted).
// A pending skin reveal keeps the normal screen; returns from a game are
// untouched. The warm-up card is hidden until it has been filled in.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const maze = fs.readFileSync(path.join(__dirname, '..', 'maze.html'), 'utf8');
const fn = maze.slice(maze.indexOf('function autoEnterAfterBlitz(){'), maze.indexOf('let o2shown=false;'));
assert(fn.length > 0, 'autoEnterAfterBlitz exists');
assert.match(fn, /if\(videoPlayed\|\|mazeStarted\)return;/, 'only a fresh entry, once');
assert.match(fn, /if\(!readBlitzCompletionState\(\)\.completedCurriculum\)return;/, 'only when all 3 Blitz are done this week');
assert.match(fn, /if\(document\.getElementById\('battyUnlockPopup'\)\?\.classList\.contains\('show'\)\)return;/,
  'a pending skin reveal keeps the normal screen');
assert(fn.indexOf('toMazeVideo.muted=true;') >= 0 && fn.indexOf('toMazeVideo.muted=true;') < fn.indexOf('toMazeVideo.play()'),
  'the flyover is muted before it starts');
assert.match(fn, /toMazeVideo\.play\(\)\.catch\(\(\)=>showOverlay2\(\)\);/, 'a blocked video still reaches the welcome screen');

const onReady = maze.slice(maze.indexOf('function onSaveReady(){'), maze.indexOf('if (window.BOOHA_READY) onSaveReady();'));
assert.match(onReady, /maybeShowSeasonalUnlockPopup\(\);\s*autoEnterAfterBlitz\(\);/, 'auto entry is decided after the reveal check');

// The tapped path is unchanged: Enter the Maze still plays the flyover with sound.
const tapStart = maze.indexOf("continueBtn.addEventListener('click'");
const tapped = maze.slice(tapStart, maze.indexOf('\n});', tapStart));
assert(tapped.includes('toMazeVideo.play()'), 'found the Enter the Maze handler');
assert.doesNotMatch(tapped, /muted/, 'Enter the Maze keeps the video sound');

// Until Blitz is 3/3 the warm-up screen still appears (no other skip path).
assert.strictEqual((maze.match(/autoEnterAfterBlitz\(\);/g) || []).length, 1, "one call site");

// The card is hidden until filled in, with a fallback so it can never stay hidden.
assert.match(maze, /#overlay1\.entryOverlay:not\(\.entry-ready\) \.entryShell\{ opacity:0; \}/, 'card hidden until ready');
assert.match(maze, /if \(!overlay\) return;\s*overlay\.classList\.add\('entry-ready'\);/, 'filling in the card shows it');
assert.match(maze, /setTimeout\(\(\) => overlay1\.classList\.add\('entry-ready'\), 2500\);/, '2.5 s fallback');

console.log('Blitz-complete entry passed: warm-up until 3/3; then muted flyover; reveal first; card shown once filled in.');
