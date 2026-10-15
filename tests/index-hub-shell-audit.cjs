#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(index, /<header class="hubHeader">/, 'the hub needs a dedicated header shell');
assert.match(index, /<div class="hubHeaderLeft">[\s\S]*?class="hubUtilityNav"/, 'greeting and utility links must share the header left column');
assert.match(index, /id="alog-icon-btn" class="hubUtilityBtn"/, 'Adventure Log must live in the header utility row');
assert.match(index, /id="juku-icon-btn" class="hubUtilityBtn"/, 'Juku must live in the header utility row');
assert.match(index, /id="hubCurriculumBtn" class="hubCurriculumBtn"/, 'the header needs a curriculum switcher');
assert.match(index, /<section class="hubHero" aria-label="Weekly adventure">[\s\S]*?id="weekCards"[\s\S]*?id="mazeBtn" class="mazeCta"[\s\S]*?id="hubHomeworkBtn" class="hubHomeworkBtn"/, 'the weekly card shell must own Maze and Homework actions');
assert.match(index, /id="hubBlitzMount" class="hubBlitzMount"/, 'the page needs a stable Blitz mount below the hero');
assert.match(index, /const blitzMount = document\.getElementById\('hubBlitzMount'\)[\s\S]*?blitzMount\.appendChild\(arcade\)/, 'Blitz must mount into the new page shell');
assert.match(index, /function updateHubCurriculumButton\(\)[\s\S]*?BoohaCurriculum\?\.get/, 'the curriculum button must reflect the saved curriculum');
assert.match(index, /hubCurriculumBtn[\s\S]*?openPicker\('', '', '', '', \{ mode: 'change' \}\)/, 'the curriculum button must reopen the picker in change mode');
assert.match(index, /\.hubUtilityBtn\s*\{[\s\S]*?min-height:\s*44px/, 'header utility links must keep a touch-sized target');
assert.match(index, /\.hubCurriculumBtn\s*\{[\s\S]*?min-height:\s*52px/, 'the curriculum switcher must keep a touch-sized target');
assert.doesNotMatch(index, /#alog-icon-btn\s*\{\s*position:\s*fixed/, 'Adventure Log must no longer use the old corner position');
assert.doesNotMatch(index, /#juku-icon-btn\s*\{\s*position:\s*fixed/, 'Juku must no longer use the old corner position');
assert.match(verify, /tests\/index-hub-shell-audit\.cjs/, 'verify.sh must run the Pass 16 hub shell audit');

console.log('Pass 16 hub shell audit passed: header, hero actions, curriculum switcher, Blitz mount, and touch targets are wired.');
