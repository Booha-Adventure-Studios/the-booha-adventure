#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const imageRoot = path.join(root, 'assets', 'img');
const convertedRoots = [
  path.join(imageRoot, 'wanderers'),
  path.join(imageRoot, 'drifters'),
  path.join(imageRoot, 'grimmerglen', 'dance'),
  path.join(imageRoot, 'grimmerglen', 'marietta'),
  path.join(imageRoot, 'muenba', 'ghosts'),
];

function files(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...files(file));
    else if (/\.webp$/i.test(entry.name)) result.push(file);
  }
  return result;
}

function inspect(file) {
  const bytes = fs.readFileSync(file);
  assert.strictEqual(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${file} must have a RIFF header`);
  assert.strictEqual(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${file} must have a WebP signature`);
  const chunks = [];
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.subarray(offset, offset + 4).toString('ascii');
    const size = bytes.readUInt32LE(offset + 4);
    chunks.push(type);
    offset += 8 + size + (size % 2);
  }
  return { bytes: bytes.length, chunks, vp8l: chunks.includes('VP8L'), lossy: chunks.includes('VP8 '), alpha: chunks.includes('ALPH') || (chunks.includes('VP8X') && (bytes[20] & 0x10) !== 0) };
}

const all = files(imageRoot);
const records = all.map(file => ({ file, ...inspect(file) }));
const vp8l = records.filter(record => record.vp8l);
const lossy = records.filter(record => record.lossy);
const converted = convertedRoots.flatMap(dir => files(dir)).filter(file => !file.endsWith('kurobane_shizuma-profile.webp'));
for (const file of converted) {
  const record = records.find(candidate => candidate.file === file);
  assert(record.lossy && record.alpha, `${path.relative(root, file)} must retain transparent lossy WebP encoding`);
  assert(record.bytes <= 1.5 * 1024 * 1024, `${path.relative(root, file)} is unexpectedly oversized after conversion`);
}

const totalBytes = records.reduce((sum, record) => sum + record.bytes, 0);
assert(totalBytes <= 140 * 1024 * 1024, 'deployed image payload exceeds the performance budget');
assert(vp8l.length < 80, 'lossless VP8L count remains too high after character-art conversion');
console.log(`Asset budget audit passed: VP8L ${vp8l.length} files/${vp8l.reduce((s,r)=>s+r.bytes,0)} bytes; lossy ${lossy.length} files/${lossy.reduce((s,r)=>s+r.bytes,0)} bytes; transparent oversized 0; deployed image payload ${totalBytes} bytes.`);
