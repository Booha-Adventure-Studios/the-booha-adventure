#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');

assert.match(engine, /function retryAudioElement\(el\)/);
assert.match(engine, /try \{\n\s*const promise = el\.play\(\)/);
assert.match(engine, /promise\.catch\(\(\) => retryAudioElement\(el\)\)/);
assert.match(engine, /catch \(_\) \{ retryAudioElement\(el\); \}/);
assert.match(engine, /retryAudioElement\(bgm\)/);
assert.match(engine, /retryAudioElement\(bossBgm\)/);

const banner = engine.slice(engine.indexOf('function drawWaveBanner'), engine.indexOf('function drawBossCinematic'));
assert.doesNotMatch(banner, /Legacy full-screen card/);
assert.doesNotMatch(banner, /createLinearGradient/);
assert.match(banner, /BOSS INCOMING/);

const boot = engine.slice(engine.indexOf('function startInvadersRun'), engine.indexOf('const retryAudioFromGesture'));
assert.match(boot, /setupEndVideo\(\)/);
assert.match(boot, /endVideoEl\.muted=true/);
assert.match(boot, /endVideoEl\.style\.opacity="0"/);
assert.match(boot, /startWave\(1\)/);
assert.match(boot, /restoreInvadersCheckpoint\(\)/);

const end = engine.slice(engine.indexOf('function triggerEndVideo'), engine.indexOf('function tick'));
assert.match(end, /finishInvadersRun\(false\);\n\s*endPlaying=true/);

console.log('Booha Invaders pass 4 checks passed.');
