#!/usr/bin/env node
'use strict';

// Full unlocked room sweep: current-room frames are required, while older
// decoded images remain ordinary LRU entries and are reclaimed under pressure.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const defsBlock = source.slice(
  source.indexOf('const WANDERER_DEFS = ['),
  source.indexOf('const WANDERER_DEFS_WEBP'),
);
const defs = [...defsBlock.matchAll(/\{\s*index:(\d+),\s*roomId:'([^']+)'[\s\S]*?frames:\[([^\]]+)\]/g)]
  .map(match => ({
    index: Number(match[1]),
    roomId: match[2],
    frames: [...match[3].matchAll(/'([^']+)'/g)].map(frame => frame[1].replace(/\.png$/i, '.webp')),
  }));

assert.strictEqual(defs.length, 36, 'the sweep must include every Wanderer definition');
const rooms = [...new Set(defs.map(def => def.roomId))]
  .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
assert.strictEqual(rooms.length, 15, 'the sweep must cover all 15 rooms');

function decodedBytes(file) {
  const bytes = fs.readFileSync(file);
  assert.strictEqual(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${file} must be a RIFF image`);
  assert.strictEqual(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${file} must be WebP`);
  assert.strictEqual(bytes.subarray(12, 16).toString('ascii'), 'VP8X', `${file} must expose stable dimensions`);
  const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
  const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
  assert(width > 0 && height > 0, `${file} must have positive dimensions`);
  return width * height * 4;
}

const frameBytes = new Map();
for (const def of defs) {
  for (const frame of def.frames) {
    const file = path.join(root, 'assets', 'img', 'wanderers', frame);
    assert(fs.existsSync(file), `${frame} must exist for the unlocked sweep`);
    frameBytes.set(frame, decodedBytes(file));
  }
}

const budgetBytes = 48 * 1024 * 1024;
const temporaryBytes = 8 * 1024 * 1024;
const cache = new Map();
let clock = 0;
let usageBytes = 0;
let peakBytes = 0;
let peakCount = 0;
let peakRoom = '';

function evict() {
  while (usageBytes > budgetBytes) {
    const candidates = [...cache.values()]
      .filter(entry => !entry.required)
      .sort((a, b) => a.lastUsed - b.lastUsed);
    if (!candidates.length) break;
    const victim = candidates[0];
    cache.delete(victim.key);
    usageBytes -= victim.bytes;
  }
}

for (const roomId of rooms) {
  for (const entry of cache.values()) entry.required = false;
  const frames = defs.filter(def => def.roomId === roomId).flatMap(def => def.frames);
  for (const frame of frames) {
    let entry = cache.get(frame);
    if (!entry) {
      entry = { key: frame, bytes: temporaryBytes, required: false, lastUsed: ++clock };
      cache.set(frame, entry);
      usageBytes += entry.bytes;
      evict();
    } else {
      entry.lastUsed = ++clock;
    }
    entry.required = true;
    usageBytes += frameBytes.get(frame) - entry.bytes;
    entry.bytes = frameBytes.get(frame);
    evict();
  }
  assert(usageBytes <= budgetBytes, `${roomId} must stay within the decoded Wanderer budget`);
  if (usageBytes > peakBytes) {
    peakBytes = usageBytes;
    peakCount = cache.size;
    peakRoom = roomId;
  }
}

assert(peakBytes <= budgetBytes, 'the complete unlocked room sweep must fit the cache budget');
console.log(`Wanderer traversal passed: ${rooms.length} rooms/${defs.length} definitions; peak retained cache ${peakCount} images/${(peakBytes / 1048576).toFixed(2)} MiB in ${peakRoom}, under 48 MiB.`);
