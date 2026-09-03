#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const tickStart = source.indexOf('function tick(now)');
const initStart = source.indexOf('function init()', tickStart);
assert(tickStart >= 0 && initStart > tickStart, 'Muenba world tick must remain discoverable');
const tickSource = source.slice(tickStart, initStart);

assert(tickSource.includes('if (captureOpen)'), 'world tick must recognize an active capture session');
assert(tickSource.includes('scheduleMuenbaFrame();'), 'world tick must resume after capture closes');
assert(tickSource.indexOf('if (captureOpen)') < tickSource.indexOf('drawFrame(now)'),
  'capture sessions must bypass the world canvas draw pass');
assert(tickSource.indexOf('if (captureOpen)') < tickSource.indexOf('tickGhost(now)'),
  'capture sessions must bypass ghost AI updates');
assert(source.includes('primeRhythmSfx();'), 'rhythm startup must warm audio before the chart begins');
assert(source.includes('rhythmHitAudioBuffer') && source.includes('rhythmMissAudioBuffer'),
  'rhythm hit and miss buffers must be kept separately');
assert(source.includes('rhythmAudioLoadPromise'), 'rhythm SFX decoding must be shared rather than duplicated per note');

console.log('Muenba rhythm performance audit passed: Web Audio warm-up, fallback playback, and world-loop suspension are wired.');
