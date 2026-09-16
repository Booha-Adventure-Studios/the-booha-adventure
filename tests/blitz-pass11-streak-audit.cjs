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
assert.match(engine, /STREAK_EVENT_THRESHOLDS = Object\.freeze\(\[3, 5, 8, 12, 15\]\)/,
  'the shared streak HUD must expose one fifteen-step escalation ladder');
assert.match(engine, /function setStreak\(streak, eventThreshold = 0, runLength = 15\)/,
  'the streak meter must accept the actual run length');
assert.match(engine, /streak \/ Math\.max\(1, runLength\)/,
  'the streak meter must scale against the run length');
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
