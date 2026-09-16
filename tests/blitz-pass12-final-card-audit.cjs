const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');
const modes = ['js/vocab-blitz.js', 'js/sentence-blitz.js', 'js/question-blitz.js']
  .map(file => fs.readFileSync(file, 'utf8'));

assert.match(engine, /function ensureFinalCard\(winScreen, palette\)/,
  'the shared engine must build the final card for every Blitz mode');
assert.match(engine, /className = 'booha-blitz-final-card'/,
  'the clear result must use a dedicated final-card surface');
assert.match(engine, /booha-blitz-final-curriculum/,
  'the final card must identify its curriculum');
assert.match(engine, /winScreen\.querySelector\(selector\('winName'\)\)\.textContent = playerName/,
  'the player name must remain the final-card hero');
assert.match(engine, /PERSONAL BEST:/,
  'the final card must label the personal best explicitly');
assert.match(engine, /previous best/,
  'the final card must show the delta from the previous best');
assert.match(engine, /const isPerfectRun = current === initialQueueLength/,
  'the final card must require a full mistake-free run');
assert.match(engine, /PERFECT RUN · \$\{initialQueueLength\}\/\$\{initialQueueLength\}/,
  'the final card must expose a perfect-run indicator');
assert.match(engine, /finalCard\.perfect\.hidden = false/,
  'the final-card status indicator must remain available for a clear');
assert.doesNotMatch(engine, /MASTERY CLEAR|CLEAN CLEAR/,
  'failed runs must not render alternate clear tiers');
assert.match(engine, /finalCard\.streak\.textContent = `BEST STREAK ×\$\{bestStreak\}`/,
  'the final card must retain the best streak result');
assert.match(engine, /FINAL_CARD_HOLD_MS = 4000/,
  'the final card must preserve the deliberate look-first hold');

for (const mode of modes) {
  assert.match(mode, /winName:/, 'each mode must expose a player-name result target');
  assert.match(mode, /winTime:/, 'each mode must expose a final-time result target');
  assert.match(mode, /winBest:/, 'each mode must expose a personal-best result target');
  assert.match(mode, /winDelta:/, 'each mode must expose a result-delta target');
  assert.match(mode, /playAgain:/, 'each mode must retain replay');
  assert.match(mode, /winClose:/, 'each mode must retain back');
}

assert.match(verify, /tests\/blitz-pass12-final-card-audit\.cjs/,
  'verify.sh must run the final-card audit');

console.log('Blitz final-card audit passed: perfect-run identity, records, replay, and hold contracts are covered.');
