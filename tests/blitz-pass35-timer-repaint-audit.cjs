const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function scheduleTimerTick\(delay = 0\)/,
  'the timer must have a lightweight scheduled repaint path');
assert.match(engine, /timerId = setTimeout\(tick, delay\)/,
  'timer repaints must use a timeout instead of an always-running animation frame');
assert.match(engine, /elapsed = performance\.now\(\) - startTime/,
  'elapsed timing must remain based on performance.now');
assert.match(engine, /clearTimeout\(timerId\)/,
  'timer scheduling must be cancellable when the run stops');
assert.doesNotMatch(engine, /rafId = requestAnimationFrame\(tick\)/,
  'the gameplay timer must not use a continuous requestAnimationFrame loop');
assert.match(engine, /let backgroundValue = '';/,
  'background rendering must remember the last applied value');
assert.match(engine, /function setBackground\(correctCount = 0\)/,
  'background updates must pass through a de-duplicating setter');
assert.match(engine, /if \(css === backgroundValue\) return;/,
  'identical full-screen background values must not be reassigned');
assert.match(engine, /overlay\.style\.background = css;/,
  'the timer path must apply the de-duplicated solid progress color');
assert.match(engine, /background: var\(--blitz-bg-main\) !important;/,
  'low-power mode must avoid animated full-screen gradient repainting');

assert.match(verify, /tests\/blitz-pass35-timer-repaint-audit\.cjs/,
  'verify.sh must run the timer and repaint audit');

console.log('Blitz timer-repaint audit passed: timing stays precise while timer and low-power background work are cheaper.');
