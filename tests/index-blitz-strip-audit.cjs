#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.doesNotMatch(index, /class="blitzTabs"|id="blitzTabs"/, 'the old curriculum tab row must be removed from the Blitz strip');
assert.doesNotMatch(index, /class="blitzRankBtn"/, 'the old arcade Records button must be replaced');
assert.match(index, /class="blitzMedals"[\s\S]*?id="blitzMedalItems" class="blitzMedalItems"[\s\S]*?class="blitzRecordsBtn"/, 'the Blitz strip must expose medal items and Records in one row');
assert.match(index, /const activeTab = window\.BoohaCurriculum|let activeTab = window\.BoohaCurriculum/, 'Blitz must start from the saved curriculum');
assert.match(index, /getWeeklyScore\?\.\(activeTab, weekId\)/, 'medals must check the saved curriculum and current week');
assert.match(index, /btn\.classList\.add\('is-record', 'hub-glow-medal'\)/, 'a completed perfect run must turn a medal into its gold state');
assert.match(index, /\.blitzMedal\s*\{[\s\S]*?border: 1px dashed/, 'unfinished medals must have the dashed treatment');
assert.match(index, /\.blitzMedal\.is-record\s*\{[\s\S]*?linear-gradient\(180deg, #fff2a0/, 'completed medals must have the gold treatment');
assert.match(index, /loadBlitzEngines\(\)\.then\(\(\) => \{[\s\S]*?renderPills\(\)/, 'medals must repaint after lazy Blitz engines load');
assert.match(index, /arcade\.querySelector\('\.blitzRecordsBtn'\)\.addEventListener/, 'Records must keep its existing panel action');
assert.match(index, /@media \(max-width: 600px\)[\s\S]*?\.blitzRecordsBtn[\s\S]*?min-height: 44px/, 'the Records control must remain touch-sized on phones');
assert.match(verify, /tests\/index-blitz-strip-audit\.cjs/, 'verify.sh must run the Pass 18 Blitz strip audit');

console.log('Pass 18 Blitz strip audit passed: saved-track medals, dashed/gold states, lazy relight, Records, and mobile sizing are wired.');
