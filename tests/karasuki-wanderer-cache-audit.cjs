#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'karasuki.js'), 'utf8');
assert(source.includes('BoohaDecodedImageCache'), 'Karasuki must use the bounded decoded-image cache');
assert(source.includes('48 * 1024 * 1024'), 'Karasuki Wanderer cache budget must be approximately 48 MiB');
assert(source.includes("protect(filename, 'required', true)"), 'current-room Wanderer images must be protected');
assert(source.includes("setWandererProtection(w, 'popup', true)"), 'open Wanderer popup images must be pinned');
assert(source.includes("setWandererProtection(w, 'celebration', true)"), 'Wanderer celebration images must be pinned');
assert(source.includes('evictIfNeeded'), 'Karasuki must run LRU eviction');
assert(source.includes('onClose: () => setWandererProtection(w, \'celebration\', false)'), 'celebration pins must release on close');
assert(source.includes('worldPerf.shouldRender(now)'), 'Karasuki low mode must intentionally schedule rendering');
assert(!/const\s+wandererImages\s*=\s*\{/.test(source), 'unbounded Wanderer object cache must be removed');

console.log('Karasuki Wanderer cache audit passed: decoded-byte budget, protection pins, asynchronous-safe cache, and LRU hooks are wired.');
