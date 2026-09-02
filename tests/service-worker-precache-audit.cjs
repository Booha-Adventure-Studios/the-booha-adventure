#!/usr/bin/env node
'use strict';

// Pass 1: one broken precache URL must not discard every other valid entry.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const install = source.slice(source.indexOf("self.addEventListener('install'"), source.indexOf("self.addEventListener('activate'"));
const message = source.slice(source.indexOf("self.addEventListener('message'"));

assert(source.includes('async function cacheOne(cache, url)'), 'service worker must cache one URL at a time');
assert(source.includes('Promise.allSettled(urls.map'), 'precache must tolerate individual URL failures');
assert(source.includes('cache.put(url, response.clone())'), 'precache must store successful responses individually');
assert(!install.includes('cache.addAll('), 'install precache must not use all-or-nothing cache.addAll');
assert(install.includes('cacheUrlsIndividually(cache, CORE_FILES'), 'core pages must use resilient precaching');
assert(install.includes('cacheUrlsIndividually(cache, CORE_ASSETS'), 'core assets must use resilient precaching');
assert(!message.includes('cache.addAll(urls)'), 'runtime CACHE_URLS must not use all-or-nothing cache.addAll');
assert(message.includes("cacheUrlsIndividually(cache, urls, 'Runtime assets')"), 'runtime CACHE_URLS must use resilient precaching');

console.log('Service-worker Pass 1 audit passed: install and runtime precaching tolerate individual URL failures.');
