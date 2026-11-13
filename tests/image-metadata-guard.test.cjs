#!/usr/bin/env node
'use strict';

// Tracked images carry pixels and appearance data only (Nov 2026).
// Allowed: image data, alpha/animation, ICC color profiles, and EXIF limited
// to appearance fields (orientation, resolution, color space, dimensions).
// Rejected: provenance manifests (WebP C2PA / PNG caBX), XMP, PNG text and
// time chunks, unknown chunks, and EXIF with GPS, device, author, date/time,
// comment or thumbnail fields.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');

const WEBP_ALLOWED = new Set(['VP8 ', 'VP8L', 'VP8X', 'ALPH', 'ANIM', 'ANMF', 'ICCP', 'EXIF']);
const PNG_ALLOWED = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'sRGB', 'gAMA', 'cHRM',
  'pHYs', 'bKGD', 'sBIT', 'iCCP', 'eXIf', 'acTL', 'fcTL', 'fdAT']);

// EXIF tags allowed anywhere in IFD0 / Exif sub-IFD (appearance only).
const EXIF_ALLOWED = new Map([
  [0x0112, 'Orientation'], [0x011a, 'XResolution'], [0x011b, 'YResolution'],
  [0x0128, 'ResolutionUnit'], [0x0213, 'YCbCrPositioning'], [0x8769, 'ExifIFDPointer'],
  [0x9000, 'ExifVersion'], [0xa000, 'FlashpixVersion'], [0xa001, 'ColorSpace'],
  [0xa002, 'PixelXDimension'], [0xa003, 'PixelYDimension'],
]);

function exifProblems(buf, label) {
  // buf is a TIFF structure (WebP EXIF may start with "Exif\0\0").
  let b = buf;
  if (b.slice(0, 6).toString('latin1') === 'Exif\0\0') b = b.slice(6);
  const order = b.slice(0, 2).toString('latin1');
  if (order !== 'II' && order !== 'MM') return [`${label}: unreadable EXIF`];
  const le = order === 'II';
  const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  const problems = [];
  const walk = (offset, depth) => {
    if (depth > 2 || offset + 2 > b.length) return;
    const count = u16(offset);
    for (let k = 0; k < count; k += 1) {
      const entry = offset + 2 + 12 * k;
      if (entry + 12 > b.length) return;
      const tag = u16(entry);
      if (!EXIF_ALLOWED.has(tag)) problems.push(`${label}: EXIF tag 0x${tag.toString(16)} not allowed`);
      if (tag === 0x8769) walk(u32(entry + 8), depth + 1);
    }
    const next = offset + 2 + 12 * count;
    if (depth === 0 && next + 4 <= b.length && u32(next) !== 0) {
      problems.push(`${label}: EXIF has a second IFD (embedded thumbnail)`);
    }
  };
  walk(u32(4), 0);
  return problems;
}

function webpProblems(b, f) {
  if (b.slice(0, 4).toString('latin1') !== 'RIFF' || b.slice(8, 12).toString('latin1') !== 'WEBP') {
    return [`${f}: not a RIFF/WEBP file`];
  }
  const problems = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const id = b.slice(i, i + 4).toString('latin1');
    const size = b.readUInt32LE(i + 4);
    if (!WEBP_ALLOWED.has(id)) problems.push(`${f}: WebP chunk ${JSON.stringify(id)} not allowed`);
    if (id === 'EXIF') problems.push(...exifProblems(b.slice(i + 8, i + 8 + size), f));
    i += 8 + size + (size & 1);
  }
  return problems;
}

function pngProblems(b, f) {
  const problems = [];
  let i = 8;
  while (i + 8 <= b.length) {
    const size = b.readUInt32BE(i);
    const id = b.slice(i + 4, i + 8).toString('latin1');
    if (!PNG_ALLOWED.has(id)) problems.push(`${f}: PNG chunk ${JSON.stringify(id)} not allowed`);
    if (id === 'eXIf') problems.push(...exifProblems(b.slice(i + 8, i + 8 + size), f));
    i += 12 + size;
  }
  return problems;
}

function imageProblems(relative, bytes) {
  const lower = relative.toLowerCase();
  if (lower.endsWith('.webp')) return webpProblems(bytes, relative);
  if (lower.endsWith('.png')) return pngProblems(bytes, relative);
  return [];
}

// Self-checks: synthetic files, no repository images needed.
function webpWith(chunks) {
  const parts = chunks.map(([id, data]) => {
    const head = Buffer.alloc(8); head.write(id, 0, 'latin1'); head.writeUInt32LE(data.length, 4);
    return Buffer.concat([head, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]);
  });
  const body = Buffer.concat([Buffer.from('WEBP'), ...parts]);
  const riff = Buffer.alloc(8); riff.write('RIFF', 0, 'latin1'); riff.writeUInt32LE(body.length, 4);
  return Buffer.concat([riff, body]);
}
function tiff(tags) {
  const b = Buffer.alloc(8 + 2 + 12 * tags.length + 4);
  b.write('II', 0, 'latin1'); b.writeUInt16LE(42, 2); b.writeUInt32LE(8, 4); b.writeUInt16LE(tags.length, 8);
  tags.forEach((tag, k) => { b.writeUInt16LE(tag, 10 + 12 * k); b.writeUInt16LE(3, 12 + 12 * k); b.writeUInt32LE(1, 14 + 12 * k); });
  return b;
}
const vp8 = ['VP8 ', Buffer.alloc(10)];
assert.deepStrictEqual(imageProblems('a.webp', webpWith([vp8])), [], 'plain WebP passes');
assert.deepStrictEqual(imageProblems('a.webp', webpWith([vp8, ['ICCP', Buffer.alloc(4)]])), [], 'ICC profile passes');
assert.deepStrictEqual(imageProblems('a.webp', webpWith([vp8, ['EXIF', tiff([0x0112])]])), [], 'orientation-only EXIF passes');
assert.strictEqual(imageProblems('a.webp', webpWith([vp8, ['C2PA', Buffer.alloc(4)]])).length, 1, 'provenance manifest fails');
assert.strictEqual(imageProblems('a.webp', webpWith([vp8, ['XMP ', Buffer.alloc(4)]])).length, 1, 'XMP fails');
assert.strictEqual(imageProblems('a.webp', webpWith([vp8, ['EXIF', tiff([0x8825])]])).length, 1, 'GPS EXIF fails');
assert.strictEqual(imageProblems('a.webp', webpWith([vp8, ['EXIF', tiff([0x0110, 0x0132])]])).length, 2, 'device model and date/time fail');

// Every tracked image.
const tracked = childProcess.execFileSync('git', ['ls-files', '-z'], { cwd: root })
  .toString('utf8').split('\0').filter((f) => /\.(webp|png)$/i.test(f))
  .filter((f) => fs.existsSync(path.join(root, f)));
const problems = tracked.flatMap((f) => imageProblems(f, fs.readFileSync(path.join(root, f))));
assert.deepStrictEqual(problems, [], problems.join('\n'));
console.log(`Image metadata guard passed: ${tracked.length} tracked images carry pixels and appearance data only.`);
