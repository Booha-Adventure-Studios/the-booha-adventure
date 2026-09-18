const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');
const modes = ['js/vocab-blitz.js', 'js/sentence-blitz.js', 'js/question-blitz.js']
  .map(file => fs.readFileSync(file, 'utf8'));
const finalCardBuilder = engine.slice(
  engine.indexOf('function ensureFinalCard'),
  engine.indexOf('function closeGame', engine.indexOf('function ensureFinalCard')),
);

assert.match(engine, /function ensureFinalCard\(winScreen, palette\)/,
  'the shared engine must build the final card for every Blitz mode');
assert.match(engine, /className = 'booha-blitz-final-card'/,
  'the clear result must use a dedicated final-card surface');
assert.doesNotMatch(finalCardBuilder, /booha-blitz-final-curriculum/,
  'the compact final card must not restore the retired curriculum banner');
assert.match(engine, /winScreen\.querySelector\(selector\('winName'\)\)\.textContent = `\$\{playerName\} is Awesome!!`/,
  'the player name must remain the final-card hero');
assert.match(engine, /bestEl\.textContent = `Your best time:/,
  'the final card must show the personal best explicitly');
assert.match(engine, /previous best/,
  'the final card must show the delta from the previous best');
assert.match(engine, /const isPerfectRun = current === initialQueueLength/,
  'the final card must require a full mistake-free run');
assert.match(engine, /winScreen\.classList\.toggle\('perfect-mode', isPerfectRun\)/,
  'the final card must retain a perfect-run visual state');
assert.doesNotMatch(engine, /MASTERY CLEAR|CLEAN CLEAR/,
  'failed runs must not render alternate clear tiers');
assert.doesNotMatch(finalCardBuilder, /finalCard\.streak|PERFECT RUN · \$\{initialQueueLength\}/,
  'the compact final card must not recreate the retired streak/perfect stack');
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
