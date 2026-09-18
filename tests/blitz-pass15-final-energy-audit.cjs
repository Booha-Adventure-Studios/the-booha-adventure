const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');
const finalCardBuilder = engine.slice(
  engine.indexOf('function ensureFinalCard'),
  engine.indexOf('function closeGame', engine.indexOf('function ensureFinalCard')),
);

assert.doesNotMatch(finalCardBuilder, /booha-blitz-final-headline|booha-blitz-final-residual|STILL GLOWING/,
  'the compact final card must not restore the retired stacked energy copy');
assert.match(engine, /winScreen\.classList\.add\('residual-run'\)/,
  'the clear screen must retain residual run energy styling');
assert.doesNotMatch(engine, /THIS WEEK’S FASTEST · #1/,
  'the compact final card must not restore the retired weekly-fastest headline');
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
