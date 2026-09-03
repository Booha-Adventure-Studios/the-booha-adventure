#!/usr/bin/env node
'use strict';

// Pass 3: online HTML must not be paired with an old cache-first JavaScript bundle.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const fetch = source.slice(
  source.indexOf("self.addEventListener('fetch'"),
  source.indexOf('// ============================================================\n//  Strategy helpers')
);

const jsRoute = fetch.indexOf("if (/\\.m?js$/.test(path))");
const assetRoute = fetch.indexOf('if (ASSET_PREFIXES.some');

assert(jsRoute >= 0, 'service worker must define a JavaScript fetch route');
assert(assetRoute >= 0, 'service worker must retain its generic static-asset route');
assert(jsRoute < assetRoute, 'JavaScript network-first routing must precede generic asset routing');
assert(fetch.slice(jsRoute, assetRoute).includes('networkFirst(request, ASSET_CACHE)'), 'JavaScript must use network-first with the asset cache as fallback');
assert(source.includes("fetch(request, { cache: 'no-store' })"), 'network-first helper must bypass the browser HTTP cache when checking for fresh assets');
assert(source.includes('const cached = await cache.match(request);'), 'network-first helper must retain a cached fallback');

console.log('Service-worker Pass 3 audit passed: online pages receive fresh JavaScript with an offline cached fallback.');
