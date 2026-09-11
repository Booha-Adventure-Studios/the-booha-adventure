const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const vocab = fs.readFileSync('js/vocab-blitz.js', 'utf8');
const sentence = fs.readFileSync('js/sentence-blitz.js', 'utf8');
const questions = fs.readFileSync('js/question-blitz.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /top: clamp\(96px, 13vh, 148px\)/,
  'the player streak HUD must reserve space below the timer on different viewport heights');
assert.match(engine, /streak-active/,
  'the streak HUD must have an explicit active state');
assert.match(engine, /nameplate\.classList\.remove\('streak-active'\)/,
  'the streak HUD must disappear when the streak stops');
assert.match(engine, /streak-tier-5/,
  'the streak HUD must promote through color tiers');
assert.match(engine, /boohaBlitzFire 2200ms/,
  'the fire callout must remain visible long enough to be noticed');
assert.match(engine, /variant === 'fire'/,
  'the on-fire milestone must use a dedicated visual variant');
assert.match(engine, /booha-blitz-celebration-layer/,
  'celebration particles must be contained behind the finish card');
assert.match(engine, /winScreen\.classList\.add\('blitz-finish'\)/,
  'the finish screen must receive the shared visual treatment');
assert.match(engine, /function renderFurigana\(container, jp, hira\)/,
  'the fail screen must render ruby furigana from the shared engine');
assert.match(engine, /wrongHira\.hidden = true/,
  'the duplicate fail-screen reading line must not compete with ruby text');
assert.match(vocab, /const formatBlitzTime = BoohaBlitzEngine\.fmtTime/,
  'the fastest-player panel must use the shared time formatter');
assert.ok(!/\$\{fmtTime\(/.test(vocab),
  'the fastest-player panel must not call an undefined local fmtTime');
assert.match(vocab, /window\.CALENDAR\?\.getCurrentCurriculumWeek/, 
  'the fastest-player panel must resolve a week when opened without explicit context');
for (const [source, prefix, jpClass] of [[vocab, 'vb', 'vb-wrong-kanji'], [sentence, 'sb', 'sb-wrong-jp'], [questions, 'qb', 'qb-wrong-jp']]) {
  assert.match(source, new RegExp(`\\.${jpClass} ruby`),
    `${prefix} fail screen must style ruby furigana`);
  assert.match(source, new RegExp(`\\.${prefix}-wrong-hira\\[hidden\\]`),
    `${prefix} duplicate reading line must support the shared hidden state`);
}
assert.match(verify, /tests\/blitz-pass5-polish-audit\.cjs/,
  'verify.sh must run the Blitz Pass 5 polish audit');

console.log('Blitz Pass 5 polish audit passed: responsive streak HUD, fire milestone, finish layering, fastest-player wiring, and ruby fail screens are covered.');
