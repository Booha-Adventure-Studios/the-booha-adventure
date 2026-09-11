const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /label: 'STREAK', marker: '★'/,
  'Pre-Boo must use a playful streak identity');
assert.match(engine, /label: 'COMBO', marker: '⚡'/,
  'Boo-riculum must use an arcade combo identity');
assert.match(engine, /label: 'CHAIN', marker: '✦'/,
  'Boo-continuum must use an elegant chain identity');
assert.match(engine, /booha-blitz-streak-meter-fill/,
  'the shared streak HUD must include a lightweight visible meter');
assert.match(engine, /streak-milestone-2.*streak-milestone-3.*streak-milestone-5.*streak-milestone-8/s,
  'the shared streak HUD must expose the requested escalation milestones');
assert.match(engine, /Math\.min\(100, streak \* 10\)/,
  'the streak meter must scale with the consecutive-correct streak');
assert.match(engine, /nameplate\.classList\.remove\([\s\S]*?streak-milestone-8/s,
  'reset must remove milestone state');
assert.match(engine, /nameplate\.removeAttribute\('data-streak'\)/,
  'reset must clear the visible streak identity');
assert.match(engine, /messagesByFeel = \{/,
  'streak callouts must vary by curriculum personality');
assert.match(engine, /variant === 'combo'/,
  'arcade streaks must use a combo-specific callout');
assert.match(engine, /variant === 'chain'/,
  'premium streaks must use a chain-specific callout');
assert.match(engine, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?booha-blitz-callout\.combo\.show/s,
  'streak callouts must respect reduced motion');
assert.match(verify, /tests\/blitz-pass11-streak-audit\.cjs/,
  'verify.sh must run the shared streak audit');

console.log('Blitz Pass 5 streak audit passed: shared milestones, meters, and curriculum-specific combo feedback are covered.');
