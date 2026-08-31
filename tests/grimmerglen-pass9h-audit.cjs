// Pass 9H: the third correct memory return gets a dedicated celebration card.
// Keep this filesystem-only so verify.sh can catch regressions without a browser.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const start = script.indexOf('function renderMariettaMemorySuccess(');
const end = script.indexOf('function finishGrimmerglenCelebration(', start);
assert(start >= 0 && end > start, 'final memory success renderer must remain discoverable');
const success = script.slice(start, end);
const replayStart = script.indexOf('function renderMariettaMemoryReplay(');
const replayEnd = script.indexOf('function renderMariettaMemorySuccess(', replayStart);
assert(replayStart >= 0 && replayEnd > replayStart, 'memory replay renderer must remain discoverable');
const replay = script.slice(replayStart, replayEnd);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(success.includes('You did it! You found my memory! Thank you!'), 'final card must use the celebratory English copy');
assert(success.includes("furiJP('できた！わたしの記憶を見つけてくれて、ありがとう！'"), 'final card must include the furigana Japanese translation');
assert(success.includes('mg-memory-celebration'), 'final card must have the cute celebration wrapper');
assert(success.includes('mg-memory-celebration-stars'), 'final card must include the decorative stars and heart');
assert(success.includes('mg-memory-celebration-copy'), 'final card must style the celebration copy');
assert(success.includes('mg-memory-celebration-jp'), 'final card must style the Japanese translation');
assert(success.includes("Let's dance! / ${furiJP('踊ろう！', MARIETTA_UI_READINGS)}"), 'final card must offer a furigana Let’s dance action');
assert(!success.includes('id="mg-memory-see-again"'), 'final Let’s dance card must not offer See again');
assert(success.includes('startGrimmerglenCelebration()'), 'Let’s dance must launch the existing dance celebration');
assert(replay.includes('mg-memory-replay-scroll-cue'), 'memory replay must include a visible scroll cue');
assert(replay.includes('Scroll down to close'), 'scroll cue must explain how to reach Close');
assert(replay.includes('id="mg-memory-replay-close"'), 'memory replay must retain its Close action');
assert(success.includes('const nextHintHTML = !memoryComplete && nextStory'), 'next hint markup must be limited to unfinished memories');
assert(!success.includes('I remembered this memory!'), 'final card must not fall back to the ordinary memory-saved copy');
assert(verify.includes('tests/grimmerglen-pass9h-audit.cjs'), 'verify.sh must run the Pass 9H final-card audit');

console.log('Grimmerglen Pass 9H audit passed: final memory celebration, replay, dance action, and deferred next hint contracts are wired.');
