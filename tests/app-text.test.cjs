#!/usr/bin/env node
'use strict';

// App text pass (Nov 2026): the install description and both READMEs match
// the current app. The Listen game names stay as they are by choice.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const manifest = JSON.parse(read('manifest.json'));
assert.ok(!/homework helpers|study decks/i.test(manifest.description), 'the install description no longer describes the old app');
assert.match(manifest.description, /Daily Check/, 'the install description names the Daily Check');
assert.match(manifest.description, /Blitz/, 'the install description names Blitz');
assert.strictEqual(manifest.lang, 'en', 'the manifest language matches its English name and description');

const en = read('README.md');
const ja = read('README.ja.md');
for (const [name, text] of [['README.md', en], ['README.ja.md', ja]]) {
  assert.match(text, /Daily Check/, `${name} describes the Daily Check`);
  assert.match(text, /Karasuki Card/, `${name} describes Karasuki Cards`);
  assert.match(text, /REWARDS-DESIGN\.md/, `${name} links the rewards design notes`);
  assert.match(text, /Say a Word/, `${name} keeps the Listen game names`);
  assert.ok(!/—/.test(text), `${name} has no em dashes`);
}
const date = file => (read(file).match(/(?:Last updated|最終更新)[:：]\s*(\d{4}-\d{2}-\d{2})/) || [])[1];
assert.ok(date('README.md') && date('README.md') === date('README.ja.md'), 'both READMEs carry the same last-updated date');

console.log('App text tests passed.');
