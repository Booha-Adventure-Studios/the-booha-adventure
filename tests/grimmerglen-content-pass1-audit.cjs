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
}

assert.strictEqual(tiers.book.start.story.en, 'I wrote in this book for my friend. I gave it to her in the fall.', 'Book Starter must use the short two-sentence memory story');
assert.strictEqual(tiers.book.start.target, 'I wrote this book for my friend.', 'Book Starter must extract one simple fact');
assert.strictEqual(tiers.book.case.story.en, 'I wrote this book for October. I gave it to her when autumn arrived.', 'Book Case must use the time-relationship story');
assert.strictEqual(tiers.book.case.target, 'I gave October the book when autumn arrived.', 'Book Case must extract the time relationship');
assert.strictEqual(tiers.book.deep.target, 'I gave October the book, hoping its words would preserve a memory that autumn could not.', 'Book Deep must retain the reviewed advanced target');
assert.doesNotMatch(tiers.banner.case.story.en, /too quiet.*too quiet/i, 'Banner Case should contain the corrected quiet phrasing once');
for (const name of names) {
  assert(Object.values(tiers).some(memory => Object.values(memory).some(entry => entry.story.en.includes(name))), `${name} must remain connected to the authored lore`);
}

assert(data.difficultyManifest?.limits && data.difficultyManifest.reviewed, 'Pass 1 must expose the reviewed difficulty manifest');

assert.match(verify, /tests\/grimmerglen-content-pass1-audit\.cjs/, 'verify.sh must run the Grimmerglen Content Pass 1 audit');
console.log('Grimmerglen Content Pass 1 audit passed: 24 bilingual tier records, reviewed difficulty limits, corrections, and lore names are staged.');
