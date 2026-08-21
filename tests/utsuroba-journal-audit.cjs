#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const utsuroba = fs.readFileSync(path.join(ROOT, 'js', 'utsuroba.js'), 'utf8');
const reading = fs.readFileSync(path.join(ROOT, 'js', 'utsuroba-reading.js'), 'utf8');

assert.match(utsuroba, /readingJournal/, 'Utsuroba save migration must initialize the reading journal');
assert.match(utsuroba, /readingJournalButton/, 'Utsuroba must expose the journal from the world UI');
assert.match(utsuroba, /data-journal-entry/, 'Journal entries must have replay controls');
assert.match(utsuroba, /reviewOnly:\s*true/, 'Journal replay must use review-only mode');
assert.match(utsuroba, /completeMemory[\s\S]*readingJournal/, 'Restored reading memories must be recorded before quest cleanup');
assert.match(reading, /opts\.reviewOnly/, 'Reading engine must understand review-only sessions');
assert.match(reading, /Close journal review \/ ノートを閉じる/, 'Review-only sessions must not offer quest completion');

console.log('Utsuroba reading journal audit passed');
