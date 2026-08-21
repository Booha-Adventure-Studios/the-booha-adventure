#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const data = fs.readFileSync(path.join(ROOT, 'js/invaders-data.js'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');

assert.match(data, /const WEAPON_MODES\s*=\s*\{/);
for (const mode of ['pulse', 'spread', 'burst', 'pierce']) {
  assert.match(data, new RegExp(`${mode}:\\s*\\{`), `missing weapon mode: ${mode}`);
}

assert.match(engine, /function weaponMode\(\)/);
assert.match(engine, /mode === "spread" \? \[-150,150\]/);
assert.match(engine, /mode === "burst" \? \[-80,0,80\]/);
assert.match(engine, /pierce:mode === "pierce" \? 1 : 0/);
assert.match(engine, /damage:opts\.damage/);
assert.match(engine, /hitBugs:\[\]/);
assert.match(engine, /if \(s\.hitBugs\?\.includes\(b\)\) continue/);
assert.match(engine, /if \(\(s\.pierce \|\| 0\) > 0\) s\.pierce--/);

assert.match(engine, /let combo = 0, maxCombo = 0/);
assert.match(engine, /const streaks = \[5, 10, 15, 25, 30\]/);
assert.match(engine, /function awardWaveClear\(\)/);
assert.match(engine, /WAVE \$\{WS\.wave\} CLEAR!/);
assert.match(engine, /window\._rewardToast/);
assert.match(engine, /playSfx\("streak"\)/);

assert.match(engine, /function drawBilingual\(/);
assert.match(engine, /BOSS INCOMING/);
assert.match(engine, /drawRewardToast\(\)/);
assert.match(engine, /SPREAD GUN/);
assert.match(engine, /PIERCE GUN/);
assert.match(engine, /ゲームオーバー/);
assert.match(engine, /エネルギー/);

console.log('Booha Invaders pass 2 checks passed.');
