#!/usr/bin/env node
'use strict';

// Muenba "ghost hunter's field kit" profile: this week first (fresh every
// Sunday), weekly orb jar, Jerks, keyword help, and the all-time ledger.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const profile = read('muenba-profile.html');
const runtime = read('js/muenba.js');
const saveFile = read('js/core/save-file.js');

// ── Weekly orb jar ─────────────────────────────────────────────────────────
assert.match(saveFile, /orbsPending: 0,\s*\/\/[^\n]*\n[^\n]*\n\s*orbsReturned: 0,/, 'the weekly Muenba bucket must start with an empty orb jar');
assert.match(runtime, /if \(!Number\.isFinite\(world\.orbsReturned\) \|\| world\.orbsReturned < 0\) world\.orbsReturned = 0;/, 'Muenba must repair a missing weekly jar count');
assert.match(runtime, /weekly\.orbsReturned = \(Number\.isFinite\(weekly\.orbsReturned\) \? weekly\.orbsReturned : 0\) \+ pending;/, 'handing orbs to Nuppi must fill this week\'s jar');
assert.match(runtime, /mu\.orbsCollected = collected \+ pending;/, 'the all-time orb total must keep counting');
assert.match(profile, /const weeklyOrbs = Math\.max\(0, Number\(weeklyMuenba\.orbsReturned\) \|\| 0\);/, 'the jar must read this week\'s orbs, not the lifetime total');
assert.match(profile, /The jar starts empty every Sunday\./, 'the page must say the jar empties weekly');

// Orb slots sit inside the jar glass (art is 300 × 420 units).
const jarBlock = profile.slice(profile.indexOf('const JAR_ROWS = (() => {'), profile.indexOf('function jarOrbs(count)'));
const context = vm.createContext({});
vm.runInContext(`${jarBlock}; this.SLOTS = JAR_SLOTS;`, context);
const slots = context.SLOTS;
assert.ok(slots.length >= 50, 'the jar must hold a good number of orbs before it reads as full');
for (const [x, y] of slots) {
  assert.ok(y >= 130 && y <= 357, `orb at y=${y} must stay between the jar shoulder and its base`);
  const [minX, maxX] = y >= 350 ? [74, 226] : [62, 246];
  assert.ok(x >= minX && x <= maxX, `orb at x=${x}, y=${y} must stay inside the glass walls`);
}
assert.ok(fs.existsSync(path.join(ROOT, 'assets/img/muenba/ghost-orb-jar-v1.webp')), 'the web-sized jar art must exist');
assert.ok(fs.existsSync(path.join(ROOT, 'assets/img/muenba/ghost-orb-background-v1.webp')), 'the web-sized background must exist');
for (const file of ['ghost-orb-jar-v1.webp', 'ghost-orb-background-v1.webp']) {
  assert.ok(fs.statSync(path.join(ROOT, 'assets/img/muenba', file)).size <= 200 * 1024, `${file} must stay light`);
}

// ── Jerks ──────────────────────────────────────────────────────────────────
assert.match(runtime, /const JERK_COUNT = 5;/, 'the profile copy assumes 5 Jerks during a hunt');
assert.match(runtime, /const JERK_RETURN_COUNT = 8;/, 'the profile copy assumes 8 Jerks on the way home');
assert.match(profile, /const jerkCount = carryingOrbs > 0 \? 8 : 5;/, 'the fog must show more Jerks while orbs are carried');
assert.match(profile, /class="jerk-card"/, 'the field guide must warn about Jerks');

// ── Keyword help ───────────────────────────────────────────────────────────
const dataCtx = { window: {} };
vm.createContext(dataCtx);
vm.runInContext(read('js/muenba-data.js'), dataCtx);
const data = dataCtx.window.MUENBA_DATA;
assert.ok(data.keywordHelp, 'muenba-data.js must export keywordHelp');
for (const caseId of data.caseOrder) {
  for (const tier of ['start', 'fresh', 'deep']) {
    for (const clue of data.cases[caseId][tier].clues || []) {
      for (const word of clue.keywords || []) {
        const help = data.keywordHelp[word];
        assert.ok(help && help.en && help.jp, `${caseId} ${tier}: keyword "${word}" needs English and Japanese help`);
      }
    }
  }
}
assert.match(profile, /class="kw" data-kw=/, 'clue keywords must be tappable');
assert.doesNotMatch(profile, /Review all clues/, 'case review copy must not promise every memory tier');

// ── Page structure ─────────────────────────────────────────────────────────
assert.match(profile, /id="jp-toggle"/, 'the Japanese toggle must be present');
assert.match(profile, /localStorage\.setItem\('booha_utsu_jp'/, 'the Japanese choice is shared with the Utsuroba profile');
assert.match(profile, /\.difficulty-option\.is-active \{ border: 2px solid var\(--gold\)/, 'the chosen flashlight must glow gold');
assert.match(profile, /id="pnet-utsuroba" class="is-locked" aria-disabled="true"/, 'the Utsuroba portal starts locked here too');
assert.match(profile, /aria-label="Muenba all-time ledger"/, 'lifetime totals stay as a small all-time ledger');
assert.ok(profile.indexOf('id="weekly-hunt-heading"') < profile.indexOf('aria-label="Muenba all-time ledger"'), 'this week must come before the all-time ledger');

console.log('Muenba field-kit profile tests passed.');
