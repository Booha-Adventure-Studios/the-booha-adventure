#!/usr/bin/env node
'use strict';

// Pass 6: network-first requests should revalidate without discarding the
// browser's conditional-request path; install precaching stays no-store.
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
const networkFirst = source.slice(source.indexOf('async function networkFirst('));
const cacheOne = source.slice(source.indexOf('async function cacheOne('));
assert(networkFirst.includes("fetch(request, { cache: 'no-cache' })"), 'network-first helper must revalidate through the browser HTTP cache');
assert(!networkFirst.includes("fetch(request, { cache: 'no-store' })"), 'network-first helper must not disable conditional requests');
assert(cacheOne.includes("fetch(url, { cache: 'no-store' })"), 'precache fetches must remain uncached');
assert(source.includes('const cached = await cache.match(request);'), 'network-first helper must retain a cached fallback');

console.log('Service-worker Pass 6 audit passed: network-first requests revalidate and precache fetches remain no-store.');
