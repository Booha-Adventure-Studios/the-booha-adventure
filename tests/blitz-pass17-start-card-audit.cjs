const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function createStartCard\(overlay, palette(?:, speedTarget)?\)/,
  'Blitz must use a shared start card across all curricula');
assert.match(engine, /booha-blitz-start-card/,
  'the first impression must have a dedicated start-card surface');
assert.match(engine, /Tap to start the run · タップしてスタート/,
  'the start card must clearly tell the player how to begin');
assert.match(engine, /START BLITZ →/,
  'the start card must expose a clear start action');
assert.match(engine, /function speedTargetFor\(config\)/,
  'the start card target must use a fixed shared speed target');
assert.match(engine, /booha-blitz-start-target/,
  'the start card must show the preparation target before the timer begins');
assert.match(engine, /function speedBandFor\(ms, targetMs\)/,
  'perfect-run spectacle must have explicit speed bands');
assert.match(engine, /blitz-awaiting-start/,
  'the first question must wait behind the start card');
assert.match(engine, /function playStartSting\(\)/,
  'starting the run must have a short audio sting');
assert.match(engine, /bindPointerAction\(startCard\.button, beginGame\)/,
  'the first-impression action must be user-triggered');
assert.match(engine, /startBGM\(\);[\s\S]*?playStartSting\(\);[\s\S]*?startCard\.card\.classList\.add\('launching'\)/,
  'start must press, sound, and transition without a dead-air step');
assert.match(engine, /setTimeout\(\(\) => \{[\s\S]*?startTime = performance\.now\(\);[\s\S]*?\}, 140\)/,
  'the start transition must remain short');
assert.match(engine, /current === 0 && startTime === null && gameStarted/,
  'the timer must not begin before the player taps start');
assert.match(engine, /\.booha-blitz-start-card::before,[\s\S]*?boohaBlitzStartPulse/s,
  'the start card must have a lightweight curriculum-colored pulse field');
assert.match(engine, /\.booha-blitz-start-card::before,[\s\S]*?animation: none;/s,
  'reduced motion must disable the start-card pulse');
assert.match(verify, /tests\/blitz-pass17-start-card-audit\.cjs/,
  'verify.sh must run the Pass 5 start-card audit');

console.log('Blitz Pass 5 start-card audit passed: shared first impression, tap gate, pulse field, start sting, short transition, timer gate, and reduced-motion coverage are present.');
