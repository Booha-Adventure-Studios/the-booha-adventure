#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const data = fs.readFileSync(path.join(ROOT, 'js/invaders-data.js'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notStrictEqual(from, -1, `missing section: ${start}`);
  const to = end ? source.indexOf(end, from + start.length) : source.length;
  assert.notStrictEqual(to, -1, `missing section end: ${end}`);
  return source.slice(from, to);
}

// Opening pacing: the player should reach gameplay almost immediately.
assert.match(data, /groups:\s*\[2,\s*3,\s*4,\s*4\]/);
assert.match(data, /introDelaySec:\s*0\.35/);
assert.match(data, /waveCardSec:\s*1\.15/);
assert.match(data, /spawnIntervalBase:\s*0\.38/);
assert.match(engine, /const DOTTY_SHIELD_POST = 0\.65/);

// Screen shake must use the configured magnitude and have a finite lifetime.
const shake = section(engine, 'function doShake', '// ════════════════════════════════════════\n// WEAPON HELPERS');
assert.match(shake, /function updateShake\(dt\)/);
assert.match(shake, /shakeDecay = Math\.max\(0, shakeDecay - Math\.max\(0, dt\)\)/);
const draw = section(engine, 'function draw()', '// ════════════════════════════════════════\n// INPUT');
assert.match(draw, /rand\(-shakeX, shakeX\)/);
assert.match(draw, /rand\(-shakeY, shakeY\)/);
assert.match(engine, /updateShake\(rawDt\)/);

// Rocks take damage from threats instead of disappearing on bomber contact.
const droppers = section(engine, 'function updateDroppers', '// ════════════════════════════════════════\n// BOSS');
assert.doesNotMatch(droppers, /r\.hp\s*=\s*0/);
assert.match(droppers, /DROPPER_CONFIG\.rockDamage/);
assert.match(engine, /ROCK_CONFIG\.shotDamage/);
assert.match(data, /rockDamage:\s*3/);
assert.match(data, /shotDamage:\s*1/);

// Audio must have a user-gesture bootstrap, music retry path, and gameplay cues.
assert.match(engine, /AudioContextCtor/);
assert.match(engine, /function ensureAudio\(\)/);
assert.match(engine, /function playAudioElement\(el\)/);
assert.match(engine, /audioRetryTimer/);
assert.match(engine, /ensureAudio\(\);\n\s*started=true/);
for (const cue of ['fire', 'hit', 'kill', 'rock', 'player', 'boss', 'pickup']) {
  assert.match(engine, new RegExp(`${cue}:\\s*\\{`), `missing synthesized cue: ${cue}`);
}

console.log('Booha Invaders pass 1 checks passed.');
