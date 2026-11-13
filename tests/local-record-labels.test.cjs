#!/usr/bin/env node
'use strict';

// Shared multiplayer records (Liar Machine, Snap) live in device-wide storage
// by design, so their records screens must say so, matching Blocks' local
// scoreboard labels. Added Nov 2026.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const LABEL = 'RECORDS ON THIS iPAD / この端末の記録';

const liar = read('liar_machine.html');
const liarModal = liar.slice(liar.indexOf('<div class="records-title">'), liar.indexOf('<div class="records-title">') + 400);
assert(liarModal.includes(`<div class="records-local">${LABEL}</div>`), 'Liar Machine records modal shows the local-records label');
assert(/\.records-local\s*\{/.test(liar), 'Liar Machine styles the local-records label');
assert(!/getElementById\('records-local'\)|querySelector\('\.records-local'\)/.test(liar),
  'the label is static; nothing overwrites it');

const snap = read('mister_happys_snap.html');
const snapScreen = snap.slice(snap.indexOf('<div id="screen-records"'), snap.indexOf('<div class="rec-box" id="records-content">'));
assert(snapScreen.includes(LABEL), 'Snap records screen shows the local-records label');

const blocks = read('booha_blocks.html');
assert(blocks.includes('この端末'), 'Blocks keeps its existing local scoreboard labels');

console.log('Local record labels passed: Liar Machine and Snap mark their records as stored on this iPad.');
