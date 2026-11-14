const fs = require('fs');
const assert = require('assert');

// B2: the streak pill heats up the same way in all three Blitz games.
const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

// Every curriculum has five saturated heat levels.
const heats = [...engine.matchAll(/heat: \[([^\]]+)\]/g)].map(m => m[1].split(',').map(x => x.trim().replace(/'/g, '')));
assert.strictEqual(heats.length, 3, 'one heat ladder per curriculum (pb, br, bc)');
for (const ladder of heats) {
  assert.strictEqual(ladder.length, 5, 'five heat levels');
  for (const c of ladder) {
    assert.match(c, /^#[0-9a-f]{6}$/i, `heat colour ${c} is a hex colour`);
    const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    assert.ok(sat >= 0.45, `heat colour ${c} is saturated (never a pale or white level)`);
  }
}

// One shared rule picks the colour, so no game is louder than another.
const setStreak = engine.slice(engine.indexOf('const heat = palette.streak?.heat'), engine.indexOf('function sweepHeat('));
assert.match(setStreak, /const colorIndex = Math\.min\(heat\.length - 1, Math\.max\(0, tier - 1\)\);/, 'heat level follows the tier');
assert.match(setStreak, /--streak-heat-from/, 'meter and wash blend from the previous level');
assert.match(setStreak, /nameplate\.dataset\.heat = String\(tier\);/, 'pill exposes its heat level');
assert.match(setStreak, /if \(streak > prevStreak\) sweepHeat\(eventThreshold\);/, 'the sweep runs on every streak step');
assert.doesNotMatch(setStreak, /LEGACY_BLITZ_CELEBRATIONS_ENABLED[\s\S]*sweepHeat/, 'the sweep is not behind the legacy flag');

// Colour wash: on at every power tier and with reduced motion (no low-power or reduced-motion rule hides it).
for (let t = 1; t <= 5; t++) {
  assert.match(engine, new RegExp(`\\[data-heat="${t}"\\] \\.booha-blitz-heat \\{ opacity: \\.\\d+; \\}`), `heat level ${t} has a wash`);
}
assert.doesNotMatch(engine, /low-power[^{]*\.booha-blitz-heat\b/, 'the colour wash stays on at minimal power');
assert.doesNotMatch(engine, /reduced-power[^{]*\.booha-blitz-heat\b/, 'the colour wash stays on at reduced power');

// The sweep is motion: gated with the rest of Blitz Pop.
const sweep = engine.slice(engine.indexOf('function sweepHeat('), engine.indexOf('function resetStreak()'));
assert.match(sweep, /!popMotionOk\(overlay\)\) return;/, 'sweep off for reduced motion and minimal power');
assert.match(sweep, /catch \(_\)/, 'sweep can never interrupt a run');

// Meter fill uses the heat colours in every game; each game keeps only its texture.
assert.doesNotMatch(engine, /repeating-linear-gradient\(90deg, #39ff14 0 8px, #00ffee 8px 14px\)/, 'Question meter no longer ignores the heat colours');
assert.doesNotMatch(engine, /linear-gradient\(90deg, #f0c96a, #dfeaff\)/, 'Sentence meter no longer ignores the heat colours');
for (const feel of ['', '.blitz-feel-arcade ', '.blitz-feel-sleek ']) {
  const start = engine.indexOf(`${feel}.booha-blitz-streak-meter-fill {`);
  assert.ok(start >= 0, `meter fill rule for ${feel || 'base'}`);
  const rule = engine.slice(start, engine.indexOf('}', start));
  assert.match(rule, /var\(--streak-heat-from/, `${feel || 'base'} meter uses the heat ladder`);
}

// Pace untouched.
assert.match(engine, /: \(config\.nextDelay \|\| 200\);/, 'the 200 ms next-question pace is unchanged');
assert.match(verify, /tests\/blitz-streak-heat-b2\.test\.cjs/, 'verify.sh runs this test');

console.log('Blitz streak heat B2 passed: five saturated levels per class, equal in every game, colour on at all power tiers.');
