const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

for (const functionName of ['playStartSting', 'playCorrectHit', 'playStreakBeat', 'playWrongHit', 'playFinalStinger']) {
  assert.match(engine, new RegExp(`function ${functionName}\\(`),
    `${functionName} must be present in the shared audio layer`);
}
assert.match(engine, /let streakAudioCtx = null/,
  'Blitz audio must share one lazily-created context per run');
assert.match(engine, /const notes = palette\.feel === 'arcade' \? \[196, 147\] : palette\.feel === 'sleek' \? \[330, 247\] : \[262, 196\]/,
  'wrong feedback must use a soft curriculum-specific descending sound');
assert.match(engine, /playWrongHit\(\);/,
  'the wrong-answer path must trigger its audio feedback');
assert.match(engine, /const pitch = base \* \(1 \+ Math\.min\(streak, 12\) \* 0\.018\)/,
  'correct feedback must vary with streak instead of repeating a fixed ding');
assert.match(engine, /\[pitch, pitch \* 1\.5\]\.forEach/,
  'correct feedback must layer a second note');
assert.match(engine, /STREAK_EVENT_NOTES/,
  'threshold feedback must retain its curriculum-specific arpeggios');
assert.match(engine, /isRecord\s*\?\s*\[659, 831, 1047, 1319\]/,
  'new records must retain their strongest final stinger');
assert.match(engine, /isPerfectRun \? \[523, 659, 784, 1047\]/,
  'perfect runs must receive a distinct final stinger');
assert.match(engine, /gain\.gain\.exponentialRampToValueAtTime\(0\.0001/,
  'short audio layers must decay cleanly');
assert.match(engine, /function stopStreakBeat\(\)/,
  'the shared audio context must be closed during cleanup');
assert.match(verify, /tests\/blitz-pass18-audio-variation-audit\.cjs/,
  'verify.sh must run the Pass 6 audio audit');

console.log('Blitz Pass 6 audio-variation audit passed: shared context, curriculum tones, pitch variation, threshold layers, wrong feedback, final stingers, and cleanup are covered.');
