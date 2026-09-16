#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(root, 'js', 'blitz-engine.js'), 'utf8');
const modeFiles = ['vocab-blitz.js', 'sentence-blitz.js', 'question-blitz.js'];

assert.match(engine, /getPlayerName\(\)/, 'shared engine must resolve the current player name');
assert.match(engine, /booha-blitz-nameplate/, 'shared engine must render a persistent player nameplate');
assert.match(engine, /booha-blitz-nameplate-streak/, 'shared engine must render the live streak');
assert.match(engine, /function updateStreak\(\)/, 'shared engine must track a correct-answer streak');
assert.match(engine, /nameplate\.setAttribute\('role', 'status'\)/,
  'the live nameplate must own streak feedback accessibly');
assert.match(engine, /spotlight\.clearAnnouncement\(\);\s*spotlight\.setStreak\(streak, eventThreshold, initialQueueLength\);/,
  'ordinary streak feedback must use the live nameplate instead of a floating callout');
assert.doesNotMatch(engine, /NICE START|IS ON FIRE|IS UNSTOPPABLE|OWNS THIS RUN/,
  'ordinary streak callout copy must not return over the game field');

assert.match(engine, /const FINAL_CARD_HOLD_MS = 4000;/,
  'final card must remain visible for a meaningful four-second reveal');
assert.match(engine, /function ensureFinalCard\(winScreen(?:, palette)?\)/,
  'shared engine must build the final player summary card');
assert.match(engine, /button\.disabled = true;/,
  'final-card actions must be locked during the reveal');
assert.match(engine, /YOUR MOMENT — READY/,
  'final card must explicitly announce when actions become available');
assert.match(engine, /BEST STREAK ×\$\{bestStreak\}/,
  'final card must preserve the player streak as part of the celebration');

for (const file of modeFiles) {
  const source = fs.readFileSync(path.join(root, 'js', file), 'utf8');
  assert(!/assets\/img\/|\.png['"`]|\.webp['"`]/.test(source),
    `${file} must remain sprite-free for the player-centered celebration`);
}
assert(!/assets\/img\/|\.png['"`]|\.webp['"`]/.test(engine),
  'shared Blitz engine must remain sprite-free');

console.log('Blitz Pass 3 player-reward audit passed: names, streak milestones, sprite-free celebrations, and final-card hold behavior are wired across all modes.');
