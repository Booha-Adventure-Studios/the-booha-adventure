const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /width: min\(520px, calc\(100vw - 24px\)\)/,
  'the streak container should have enough width for the player name and meter');
assert.match(engine, /min-height: clamp\(42px, 6vw, 56px\)/,
  'the streak container should be slightly taller and easier to read');
assert.match(engine, /nameplate\.setAttribute\('role', 'status'\)/,
  'streak changes should remain accessible without a floating callout');
assert.match(engine, /nameplate\.setAttribute\('aria-live', 'polite'\)/,
  'streak changes should be announced from the live container');
assert.match(engine, /spotlight\.clearAnnouncement\(\);\s*spotlight\.setStreak\(streak, eventThreshold, initialQueueLength\);/,
  'streak updates should clear stale announcements and use the full run length');
assert.match(engine, /spotlight\.announce\(copy\[palette\.feel\]/,
  'milestone streaks should announce their curriculum-specific copy');
assert.match(engine, /streak-tier-5 \{ padding-inline: 24px; \}/,
  'higher streak tiers should give the reactive container extra breathing room');
assert.match(verify, /tests\/blitz-pass27-streak-container-audit\.cjs/,
  'verify.sh must run the Pass 2 streak-container audit');

console.log('Blitz Pass 2 streak-container audit passed: the larger live nameplate owns ordinary streak feedback without floating combo copy.');
