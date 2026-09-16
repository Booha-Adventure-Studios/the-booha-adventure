const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /STREAK_EVENT_THRESHOLDS = Object\.freeze\(\[3, 6, 9, 12, 15\]\)/,
  'the Blitz ladder must define distinct streak events at 3, 6, 9, 12, and 15');
assert.match(engine, /STREAK_EVENT_NOTES = Object\.freeze\(/,
  'streak events must have a shared lightweight audio-note map');
for (const feel of ['playful', 'arcade', 'sleek']) {
  assert.match(engine, new RegExp(`${feel}: Object\\.freeze\\(`),
    `${feel} must have its own threshold sound sequence`);
}
assert.match(engine, /function showStreakEvent\(threshold\)/,
  'streak thresholds must be handled as events, not only as labels');
assert.match(engine, /streak-event-3.*streak-event-6.*streak-event-9.*streak-event-12.*streak-event-15/s,
  'each requested threshold must have a distinct visual event class');
assert.match(engine, /function emitStreakSparks\(\)/,
  'threshold events must emit a small curriculum-aware particle burst');
assert.match(engine, /function setStreak\(streak, eventThreshold = 0, runLength = 15\)/,
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
assert.match(engine, /spotlight\.announce\(copy\[palette\.feel\]\?\.\[eventThreshold\]/,
  'each threshold must announce its curriculum-specific milestone copy');
assert.match(engine, /const fullCount = \(\{ 3: 6, 6: 12, 9: 20, 12: 32, 15: 48 \}\)\[threshold\]/,
  'milestone particles must escalate across the unified ladder');
assert.match(engine, /const holdMs = \(\{ 3: 900, 6: 1000, 9: 1120, 12: 1300, 15: 1500 \}\)\[threshold\]/,
  'milestone holds must escalate without becoming slow');
assert.match(engine, /const eventScale = \(\{ 3: 1\.02, 6: 1\.03, 9: 1\.04, 12: 1\.06, 15: 1\.1 \}\)\[threshold\]/,
  'milestone screen-punch scale must escalate across the unified ladder');
assert.match(engine, /\.booha-blitz-streak-spark \{ display: none; \}/,
  'reduced motion must remove streak particles');
assert.match(verify, /tests\/blitz-pass13-streak-events-audit\.cjs/,
  'verify.sh must run the Pass 1 streak-events audit');

console.log('Blitz Pass 1 streak-events audit passed: threshold visuals, audio beats, residual glow, palette colors, and reduced-motion coverage are present.');
