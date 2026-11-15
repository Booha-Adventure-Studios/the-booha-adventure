#!/usr/bin/env node
'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const token = fs.readFileSync(path.join(root, 'js', 'token.js'), 'utf8');

assert.match(token, /setAttribute\('translate', 'no'\)/,
  'the app must opt out of automatic page translation');
assert.match(token, /classList\.add\('notranslate'\)/,
  'the app must carry the common notranslate marker');
assert.match(token, /meta\.name = 'google'/,
  'the app must include the Google Translate opt-out meta marker');
assert.match(token, /-webkit-user-select: none/,
  'the app surface must suppress accidental text selection');
assert.match(token, /-webkit-tap-highlight-color: transparent/,
  'the app surface must suppress tap highlight flashes');
assert.match(token, /input, textarea, \[contenteditable\]:not\(\[contenteditable="false"\]\)/,
  'text-entry controls must retain text selection for typing and paste');
assert.match(token, /-webkit-touch-callout: default/,
  'text-entry controls must retain the iPad long-press paste menu');
assert.match(token, /touch-action: manipulation/,
  'the app surface must suppress accidental double-tap zoom');
assert.match(token, /addEventListener\('gesturestart', event => event\.preventDefault\(\)/,
  'Safari pinch gestures must be cancelled');
assert.match(token, /maximum-scale=1/,
  'the viewport must disallow pinch zoom on Android');
assert.match(token, /user-scalable=no/,
  'the viewport must disallow user scaling on Android');

const htmlFiles = childProcess.execFileSync('git', ['ls-files', '*.html'], { cwd: root })
  .toString('utf8')
  .split('\n')
  .filter(Boolean)
  .map(file => path.join(root, file));

for (const file of htmlFiles) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  if (relative === 'mister_happys_snap_test.html' || relative === 'ui/save-panel.html') continue;
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /(?:^|["'])(?:\/?the-booha-adventure\/)?(?:\.\.\/|\.\/)*js\/token\.js["']/, 
    `${relative} must load the token gate, which installs the interaction guard`);
}

console.log('Interaction guard passed: protected pages suppress selection/tap flashes, translation, and zoom while preserving text-entry controls and paste.');
