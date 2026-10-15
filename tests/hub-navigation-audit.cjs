#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(index, /let hubCurriculumNavigationStarted = false;/, 'curriculum navigation needs a one-shot guard');
assert.match(
  index,
  /if \(hubCurriculumNavigationStarted\) return;[\s\S]*?hubCurriculumNavigationStarted = true;[\s\S]*?setTimeout\(\(\) => \{ window\.location\.href = url;/,
  'curriculum navigation must guard before scheduling the redirect'
);

assert.match(index, /let hubMazeNavigationStarted = false;/, 'Maze navigation needs a one-shot guard');
assert.match(
  index,
  /mazeBtn\.addEventListener\('click', \(\) => \{\s*if \(hubMazeNavigationStarted\) return;\s*hubMazeNavigationStarted = true;[\s\S]*?setTimeout\(\(\) => \{ window\.location\.href = 'maze\.html';/,
  'Maze navigation must guard before scheduling the redirect'
);

assert.match(verify, /tests\/hub-navigation-audit\.cjs/, 'verify.sh must run the QA Pass 1 navigation audit');

console.log('QA Pass 1 navigation audit passed: Maze and curriculum redirects are idempotent under rapid taps.');
