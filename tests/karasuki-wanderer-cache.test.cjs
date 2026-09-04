#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const cacheSource = fs.readFileSync(
  path.join(__dirname, '..', 'js/core/decoded-image-cache.js'),
  'utf8'
);
const cacheModule = { exports: {} };
vm.runInNewContext(cacheSource, { module: cacheModule, console });
const DecodedImageCache = cacheModule.exports;

class FakeImage {
  constructor() { this.listeners = {}; this.naturalWidth = 0; this.naturalHeight = 0; this.complete = false; this.src = ''; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  removeEventListener(name, fn) { this.listeners[name] = (this.listeners[name] || []).filter((listener) => listener !== fn); }
  emit(name) { for (const fn of this.listeners[name] || []) fn(); }
  load(width, height) { this.naturalWidth = width; this.naturalHeight = height; this.complete = true; this.emit('load'); }
  fail() { this.complete = true; this.emit('error'); }
}

const images = [];
const cache = new DecodedImageCache({
  budgetBytes: 16 * 1024 * 1024,
  temporaryBytes: 2 * 1024 * 1024,
  createImage: () => { const image = new FakeImage(); images.push(image); return image; },
});

const a = cache.get('room-a-1', { src: 'a', required: true });
const b = cache.get('room-a-2', { src: 'b', required: true });
a.load(1024, 1024); b.load(1024, 1024);
assert.strictEqual(cache.stats().count, 2, 'required current-room images accumulate');

const popup = cache.get('popup', { src: 'popup', popupPinned: true });
popup.load(1536, 1024);
const celebration = cache.get('celebration', { src: 'celebration', celebrationPinned: true });
celebration.load(1536, 1024);
cache.get('old-1', { src: 'old-1' }).load(1024, 1024);
cache.get('old-2', { src: 'old-2' }).load(1024, 1024);
cache.get('old-3', { src: 'old-3' }).load(1024, 1024);
cache.evictIfNeeded();
assert(cache.stats().keys.includes('room-a-1'), 'current-room image cannot be evicted');
assert(cache.stats().keys.includes('room-a-2'), 'current-room image cannot be evicted');
assert(cache.stats().keys.includes('popup'), 'popup image remains pinned');
assert(cache.stats().keys.includes('celebration'), 'celebration image remains pinned');
assert(cache.stats().count < 7, 'old-room images are evicted under pressure');

cache.clearProtection('required');
cache.protect('popup', 'popup', false);
cache.protect('celebration', 'celebration', false);
cache.evictIfNeeded();
assert(cache.stats().usageBytes <= cache.budgetBytes, 'cache returns beneath decoded-memory budget');

const beforeReentry = images.length;
cache.get('room-a-1', { src: 'a-return', required: true }).load(1024, 1024);
assert(images.length > beforeReentry, 're-entering an evicted room creates a fresh image');

const failed = cache.get('failed', { src: 'failed' });
failed.fail();
assert(!cache.stats().keys.includes('failed'), 'failed image loads do not permanently consume budget');

const late = cache.get('late', { src: 'late' });
late.load(2048, 2048);
cache.get('pressure-1', { src: 'pressure-1' }).load(2048, 2048);
cache.get('pressure-2', { src: 'pressure-2' }).load(2048, 2048);
cache.evictIfNeeded();
const lateUsage = cache.stats().usageBytes;
late.load(1, 1);
assert.strictEqual(cache.stats().usageBytes, lateUsage, 'an evicted image completion cannot corrupt cache accounting');

console.log('Karasuki Wanderer cache tests passed: protected current-room, popup, and celebration images survive LRU pressure; old and failed entries are reclaimable.');
