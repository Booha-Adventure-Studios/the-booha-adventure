#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'liar_machine.html'), 'utf8');

const helperMatch = source.match(/function escapeHTML\(value\) \{[\s\S]*?\n\}/);
assert.ok(helperMatch, 'Liar Machine must define the shared escapeHTML helper');
const escapeHTML = new Function(`${helperMatch[0]}\nreturn escapeHTML;`)();
const hostileName = `<img src=x onerror="alert('xss')"> & Booha`;
assert.strictEqual(
  escapeHTML(hostileName),
  '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt; &amp; Booha',
  'hostile names must become inert HTML text'
);

const handoff = source.slice(source.indexOf('function setupHandoff'), source.indexOf('// ─── PLAYER RUN'));
assert.match(handoff, /const p1NameHTML = escapeHTML\(p1Name\)/, 'handoff surfaces must escape the player name once');
assert.doesNotMatch(handoff, /\$\{p1Name\}/, 'handoff innerHTML must not interpolate the raw player name');

const result = source.slice(source.indexOf('function showResult'), source.indexOf('// ─── RECORDS MODAL'));
assert.match(result, /const p1DisplayName = escapeHTML\(p1\.name\)/, 'result surfaces must escape P1');
assert.match(result, /const p2DisplayName = escapeHTML\(p2\.name\)/, 'result surfaces must escape P2');
assert.doesNotMatch(result, /\$\{p1\.name\}/, 'result innerHTML must not interpolate raw P1');
assert.doesNotMatch(result, /\$\{p2\.name\}/, 'result innerHTML must not interpolate raw P2');

const records = source.slice(source.indexOf('function renderRecords'), source.indexOf('// ─── FX'));
assert.match(records, /const p1NameHTML = escapeHTML\(p1Name\)/, 'record summary must escape the current player name');
assert.match(records, /const p1RunNameHTML = escapeHTML\(p1RunName\)/, 'history must escape stored P1 names');
assert.match(records, /const p2RunNameHTML = escapeHTML\(p2RunName\)/, 'history must escape stored P2 names');
assert.doesNotMatch(records, /\$\{p1RunName\}/, 'history must not interpolate raw stored P1 names');
assert.doesNotMatch(records, /\$\{p2RunName\}/, 'history must not interpolate raw stored P2 names');
assert.doesNotMatch(records, /\$\{p1Name\}/, 'record summary must not interpolate raw current P1 names');
assert.doesNotMatch(records, /\$\{p2Name\}/, 'record summary must not interpolate raw current P2 names');

console.log('Liar Machine name-safety audit passed: live, handoff, and stored-history name sinks escape HTML.');
