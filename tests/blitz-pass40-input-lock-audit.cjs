#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function bindBlitzInteractionLock\(\)/,
  'Blitz must have a dedicated interaction lock instead of changing the whole app viewport');
assert.match(engine, /root\.classList\.add\('blitz-active'\)/,
  'Blitz must mark the document while its full-screen overlay is active');
assert.match(engine, /gestureEvents\.forEach\(type => window\.addEventListener\(type, blockGesture, \{ passive: false \}\)\)/,
  'Safari gesture events must be cancelled while Blitz is open');
assert.match(engine, /if \(event\.touches && event\.touches\.length > 1\) event\.preventDefault\(\)/,
  'multi-touch movement must be cancelled while Blitz is open');
assert.match(engine, /html\.blitz-active body[\s\S]*?touch-action: none;/,
  'the CSS backup must disable page gestures while Blitz is active');
assert.match(engine, /overlay\._boohaBlitzInteractionCleanup = bindBlitzInteractionLock\(\)/,
  'the interaction lock must start with each Blitz overlay');
assert.match(engine, /overlay\._boohaBlitzInteractionCleanup\?\.\(\);[\s\S]*?overlay\.remove\(\)/,
  'the interaction lock must be released before a Blitz overlay is removed');
assert.match(engine, /function tick\(\) \{[\s\S]*?if \(document\.visibilityState === 'hidden' \|\| document\.hidden\) return;/,
  'the timer callback must not repaint or reschedule while the app is hidden');
assert.match(engine, /if \(document\.visibilityState === 'hidden' \|\| document\.hidden\) \{[\s\S]*?previous = null;/,
  'frame monitoring must discard the hidden-page gap before measuring again');
assert.match(verify, /tests\/blitz-pass40-input-lock-audit\.cjs/,
  'verify.sh must run the Blitz input-lock audit');
assert.match(verify, /tests\/blitz-pass40-input-runtime\.test\.cjs/,
  'verify.sh must run the Blitz input-lock runtime test');

console.log('Blitz Pass 40 input-lock audit passed: zoom is locked only during Blitz and hidden-page timing cannot poison the run.');
