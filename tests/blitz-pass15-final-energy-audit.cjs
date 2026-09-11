const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /booha-blitz-final-headline/,
  'the final card must expose a personal curriculum headline');
assert.match(engine, /\$\{playerName\} — \$\{String\(palette\.name \|\| 'BOOHA'\)\.toUpperCase\(\)\} BLITZ/,
  'the final headline must combine the player name and curriculum identity');
assert.match(engine, /booha-blitz-final-residual/,
  'the final card must have a residual run-energy indicator');
assert.match(engine, /STILL GLOWING/,
  'the final card must communicate that the last chain energy carries into the clear');
assert.match(engine, /winScreen\.classList\.add\('residual-run'\)/,
  'the clear screen must retain residual run energy styling');
assert.match(engine, /THIS WEEK’S FASTEST · #1/,
  'weekly fastest clears must expose their first-place result');
assert.match(engine, /function playFinalStinger\(isRecord, isPerfectRun\)/,
  'the final card must have a distinct completion stinger');
assert.match(engine, /isRecord\s*\?\s*\[659, 831, 1047, 1319\]/,
  'new records must receive the strongest final stinger');
assert.match(engine, /startFinalHold\(isPerfectRun \? 5600 : isRecord \? 5000 : FINAL_CARD_HOLD_MS\)/,
  'perfect and record runs must hold the final card longer');
assert.match(engine, /boohaBlitzButtonsIn 520ms 900ms/,
  'replay and menu controls must enter after the celebration begins');
assert.match(engine, /\.booha-blitz-final-headline,[\s\S]*?animation: none; opacity: 1; transform: none;/,
  'reduced motion must disable final-card entrance motion');
assert.match(verify, /tests\/blitz-pass15-final-energy-audit\.cjs/,
  'verify.sh must run the Pass 3 final-energy audit');

console.log('Blitz Pass 3 final-energy audit passed: personal headline, residual streak energy, record/perfect emphasis, stinger, hold tiers, and delayed controls are covered.');
