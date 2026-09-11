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
assert.match(engine, /function clearAnnouncement\(\)/,
  'streak updates must clear stale floating announcements');
assert.match(engine, /nameplate\.setAttribute\('aria-live', 'polite'\)/,
  'the live nameplate must announce streak changes');
assert.match(engine, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?booha-blitz-nameplate\.streak-active \{ animation: none; \}/s,
  'the reactive streak container must respect reduced motion');
assert.match(verify, /tests\/blitz-pass11-streak-audit\.cjs/,
  'verify.sh must run the shared streak audit');

console.log('Blitz Pass 5 streak audit passed: shared milestones, meters, live nameplate feedback, and reduced-motion coverage are covered.');
