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

assert.match(blocks, /const LB_KEY='booha_blocks_lb_v2';/,
  'Blocks may keep the shared local leaderboard, but not a shared saved name');
assert.doesNotMatch(blocks, /booha_blocks_name|getSavedName|saveName\s*\(/,
  'Blocks must not persist or prefill one student\'s name for the next student');
assert.match(blocks, /nameInput\.value='';/,
  'Blocks must clear the name field at the start of every submission');

assert.doesNotMatch(destruction, /booha_destruction_round_records_v1|booha_destruction_roster_unlocks_v1/,
  'Destruction progress must not use device-wide legacy storage keys');
assert.doesNotMatch(destruction, /localStorage[^\n]*(ROUND_RECORD|ROSTER_UNLOCK)/,
  'Destruction progress must not read device-wide localStorage');
assert.match(destruction, /page\?\.roundRecords/,
  'Destruction round records must load from identity-scoped page state');
assert.match(destruction, /roundRecords,\n\s*\},\n\s*\}\);/,
  'Destruction round records must be patched into identity-scoped page state');
assert.match(destruction, /save\?\.patch\?\.\('unlocks'/,
  'Destruction roster unlocks must remain in the identity-scoped save');

assert.match(destruction, /AUDIO_PREF_KEY/,
  'The shared mute preference remains an explicit device-wide preference');
assert.match(verify, /tests\/storage-scope-audit\.test\.cjs/,
  'verify.sh must run the shared-iPad storage boundary audit');

console.log('storage scope audit passed');
