#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');
const data = fs.readFileSync(path.join(ROOT, 'js/invaders-data.js'), 'utf8');

const skill = engine.slice(engine.indexOf('function skillBonusHp'), engine.indexOf('function isBossWave'));
assert.match(skill, /if \(WS\.wave < 5\) return 0/);

const start = engine.slice(engine.indexOf('function startInvadersRun'), engine.indexOf('(async function boot'));
assert.match(start, /runStartedAt=performance\.now\(\)/);
assert.match(start, /if \(continueRun && restoreInvadersCheckpoint\(\)\)/);
assert.match(start, /endVideoEl\.muted=true/);
assert.match(start, /endVideoEl\.style\.opacity="0"/);

const audio = engine.slice(engine.indexOf('function retryAudioElement'), engine.indexOf('// ════════════════════════════════════════\n// ASSETS'));
assert.match(audio, /catch \(_\) \{ retryAudioElement\(el\); \}/);
assert.match(audio, /if \(!el \|\| paused\) return/);

assert.match(data, /introDelaySec:\s*0\.35/);
assert.match(data, /waveCardSec:\s*1\.15/);
assert.match(data, /spawnIntervalBase:\s*0\.38/);
assert.match(data, /shotDamage:\s*1/);

console.log('Booha Invaders pass 5 checks passed.');
