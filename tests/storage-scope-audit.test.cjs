#!/usr/bin/env node
// Shared-iPad storage boundary audit. This is intentionally source-based: it
// checks storage locations and key names without reading any device values.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const blocks = fs.readFileSync(path.join(root, 'booha_blocks.html'), 'utf8');
const destruction = fs.readFileSync(path.join(root, 'js', 'destruction_1.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

// Retired legacy keys may appear only inside a removeItem() call. Strip those
// calls before checking that nothing else reads or writes the keys.
const RETIRED = {
  'booha_blocks.html': ['booha_blocks_name'],
  'js/destruction_1.js': ['booha_destruction_round_records_v1', 'booha_destruction_roster_unlocks_v1'],
};
const withoutRemovals = (src) => src
  .replace(/localStorage\.removeItem\(\s*'[^']+'\s*\)/g, '')
  .replace(/\[\s*'booha_destruction_round_records_v1',\s*'booha_destruction_roster_unlocks_v1'\s*\]\.forEach\([\s\S]*?\}\);/, '');
const blocksRest = withoutRemovals(blocks);
const destructionRest = withoutRemovals(destruction);

assert.match(blocks, /const LB_KEY='booha_blocks_lb_v2';/,
  'Blocks may keep the shared local leaderboard, but not a shared saved name');
assert.doesNotMatch(blocksRest, /booha_blocks_name|getSavedName|saveName\s*\(/,
  'Blocks must not persist or prefill one student\'s name for the next student');
assert.match(blocks, /nameInput\.value='';/,
  'Blocks must clear the name field at the start of every submission');

assert.doesNotMatch(destructionRest, /booha_destruction_round_records_v1|booha_destruction_roster_unlocks_v1/,
  'Destruction progress must not use device-wide legacy storage keys');
assert.doesNotMatch(destruction, /localStorage[^\n]*(ROUND_RECORD|ROSTER_UNLOCK)/,
  'Destruction progress must not read device-wide localStorage');
assert.match(destruction, /page\?\.roundRecords/,
  'Destruction round records must load from identity-scoped page state');
assert.match(destruction, /api\.patch\('pageState',[\s\S]{0,200}?roundRecords/,
  'Destruction round records must be patched into identity-scoped page state');
assert.match(destruction, /save\?\.patch\?\.\('unlocks'/,
  'Destruction roster unlocks must remain in the identity-scoped save');

assert.match(destruction, /AUDIO_PREF_KEY/,
  'The shared mute preference remains an explicit device-wide preference');
assert.match(verify, /tests\/storage-scope-audit\.test\.cjs/,
  'verify.sh must run the shared-iPad storage boundary audit');

// Exactly the retired keys are removed in these two files: no more, no fewer,
// and never by clearing all storage.
const removedKeys = (src) => [...src.matchAll(/removeItem\(\s*'([^']+)'\s*\)/g)].map((m) => m[1])
  .concat([...src.matchAll(/\[\s*('booha_destruction_[^\]]+)\]\.forEach/g)]
    .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((k) => k[1])));
assert.deepStrictEqual(removedKeys(blocks).sort(), RETIRED['booha_blocks.html'].slice().sort(),
  'Blocks must retire exactly booha_blocks_name');
assert.deepStrictEqual(removedKeys(destruction).sort(), RETIRED['js/destruction_1.js'].slice().sort(),
  'Destruction must retire exactly its two legacy progress keys');
for (const [name, src] of [['booha_blocks.html', blocks], ['js/destruction_1.js', destruction]]) {
  assert.doesNotMatch(src, /localStorage\.clear\s*\(/, `${name} must never clear all localStorage`);
}
assert.match(destruction, /forEach\(\(key\) => \{\s*try \{ window\.localStorage && window\.localStorage\.removeItem\(key\); \} catch/,
  'Destruction retirement must only call removeItem on the listed keys');

console.log('storage scope audit passed');
