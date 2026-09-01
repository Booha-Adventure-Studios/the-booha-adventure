#!/usr/bin/env node
'use strict';

// Grimmerglen Content Pass 1: every memory has a complete Starter, Case,
// and Deep authoring record before the runtime wiring pass consumes it.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen-data.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(dataSource, sandbox, { filename: 'grimmerglen-data.js' });
const data = sandbox.window.GRIMMERGLEN_DATA;
const tiers = data.tierMemories;
const names = ['Jamariko', 'Uhibon', 'Bryan', 'Chillicothe', 'Takachika', 'Columbus', 'Gorogui'];

assert(tiers && typeof tiers === 'object', 'Pass 1 must expose the tiered authoring source');
assert.strictEqual(JSON.stringify(Object.keys(tiers).sort()), JSON.stringify(Array.from(data.objectTypes).sort()), 'every collectible must have tiered content');

for (const type of data.objectTypes) {
  for (const tier of ['start', 'case', 'deep']) {
    const entry = tiers[type]?.[tier];
    assert(entry?.story?.en && entry.story.jp, `${type} ${tier} needs a bilingual story`);
    assert(entry.story.readings && typeof entry.story.readings === 'object', `${type} ${tier} needs story readings`);
    assert(entry.target && entry.jp, `${type} ${tier} needs a typing target and translation`);
    assert(entry.readings && typeof entry.readings === 'object', `${type} ${tier} needs target readings`);
    assert(Array.isArray(entry.full) && entry.full.length >= 1, `${type} ${tier} needs authored choices`);
    assert(Array.isArray(entry.partial) && entry.partial.length >= 1, `${type} ${tier} needs partial helpers`);
  }
  assert(tiers[type].case.story.en.length >= tiers[type].start.story.en.length, `${type} Case story should not be shorter than Starter`);
  assert(tiers[type].deep.target.length >= tiers[type].case.target.length, `${type} Deep target should not be shorter than Case`);
}

assert.match(tiers.book.start.story.en, /writing in this .* in the fall/i, 'Book Starter must use the requested writing memory');
assert.match(tiers.book.case.story.en, /writing in this for October/i, 'Book Case must correct wringing to writing');
assert.doesNotMatch(tiers.banner.case.story.en, /too quiet.*too quiet/i, 'Banner Case should contain the corrected quiet phrasing once');
for (const name of names) {
  assert(Object.values(tiers).some(memory => Object.values(memory).some(entry => entry.story.en.includes(name))), `${name} must remain connected to the authored lore`);
}

assert.match(verify, /tests\/grimmerglen-content-pass1-audit\.cjs/, 'verify.sh must run the Grimmerglen Content Pass 1 audit');
console.log('Grimmerglen Content Pass 1 audit passed: 24 bilingual tier records, difficulty ordering, corrections, and lore names are staged.');
