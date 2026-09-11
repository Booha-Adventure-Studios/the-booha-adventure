const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /STREAK_EVENT_THRESHOLDS = Object\.freeze\(\[3, 5, 7, 10, 15\]\)/,
  'Pass 1 must define distinct streak events at 3, 5, 7, 10, and 15');
assert.match(engine, /STREAK_EVENT_NOTES = Object\.freeze\(/,
  'streak events must have a shared lightweight audio-note map');
for (const feel of ['playful', 'arcade', 'sleek']) {
  assert.match(engine, new RegExp(`${feel}: Object\\.freeze\\(`),
    `${feel} must have its own threshold sound sequence`);
}
assert.match(engine, /function showStreakEvent\(threshold\)/,
  'streak thresholds must be handled as events, not only as labels');
assert.match(engine, /streak-event-3.*streak-event-5.*streak-event-7.*streak-event-10.*streak-event-15/s,
  'each requested threshold must have a distinct visual event class');
assert.match(engine, /function emitStreakSparks\(\)/,
  'threshold events must emit a small curriculum-aware particle burst');
assert.match(engine, /function setStreak\(streak, eventThreshold = 0\)/,
  'the streak HUD must receive the threshold event separately from the streak count');
assert.match(engine, /streak-hold/,
  'the streak HUD must retain a short residual hold after a threshold hit');
assert.match(engine, /palette\.streak\?\.colors/,
  'threshold marker color must come from the curriculum palette');
assert.match(engine, /function playStreakBeat\(threshold\)/,
  'threshold feedback must include a cached WebAudio beat');
assert.match(engine, /window\.AudioContext \|\| window\.webkitAudioContext/,
  'audio must use a browser-native lightweight fallback path');
assert.match(engine, /STREAK_EVENT_THRESHOLDS\.includes\(streak\)/,
  'the answer flow must fire only on exact threshold hits');
assert.match(engine, /\.booha-blitz-streak-spark \{ display: none; \}/,
  'reduced motion must remove streak particles');
assert.match(verify, /tests\/blitz-pass13-streak-events-audit\.cjs/,
  'verify.sh must run the Pass 1 streak-events audit');

console.log('Blitz Pass 1 streak-events audit passed: threshold visuals, audio beats, residual glow, palette colors, and reduced-motion coverage are present.');
