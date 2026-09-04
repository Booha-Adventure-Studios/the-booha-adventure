#!/usr/bin/env node
'use strict';

// Performance pass: Muenba's photographic hiding art uses lossy WebP, while
// the shared statue/logo remains lossless to protect its crisp small-scale UI use.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetDir = path.join(root, 'assets', 'img', 'muenba');
const muenba = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const expectedDimensions = {
  'hiding.webp': [1264, 1244],
  'muenba_logo.webp': [400, 600],
};
const expectedEncoding = {
  'hiding.webp': 'lossy',
  'muenba_logo.webp': 'lossless',
};
const expectedAlpha = {
  'hiding.webp': true,
  'muenba_logo.webp': false,
};

assert.deepStrictEqual(
  Object.keys(expectedDimensions).sort(),
  fs.readdirSync(assetDir).filter((name) => /^(hiding|muenba_logo)\.webp$/.test(name)).sort(),
  'Muenba must contain both supporting-art WebP files',
);

function readWebp(file, name) {
  assert(file.length > 25, `${name} must not be empty`);
  assert.strictEqual(file.subarray(0, 4).toString('ascii'), 'RIFF', `${name} must have a RIFF header`);
  assert.strictEqual(file.subarray(8, 12).toString('ascii'), 'WEBP', `${name} must have a WEBP signature`);
  const chunks = [];
  for (let offset = 12; offset + 8 <= file.length;) {
    const type = file.subarray(offset, offset + 4).toString('ascii');
    const size = file.readUInt32LE(offset + 4);
    chunks.push(type);
    offset += 8 + size + (size % 2);
  }
  if (expectedEncoding[name] === 'lossy') {
    assert(chunks.includes('VP8X') && chunks.includes('ALPH'), `${name} must be a transparent WebP`);
  } else {
    assert(chunks.includes('VP8L'), `${name} must be a lossless WebP`);
  }
  assert(chunks.includes(expectedEncoding[name] === 'lossy' ? 'VP8 ' : 'VP8L'), `${name} must use its approved ${expectedEncoding[name]} encoding`);
  const vp8x = chunks.includes('VP8X');
  const width = vp8x
    ? 1 + file[24] + (file[25] << 8) + (file[26] << 16)
    : 1 + ((file[21] | (file[22] << 8)) & 0x3fff);
  const height = vp8x
    ? 1 + file[27] + (file[28] << 8) + (file[29] << 16)
    : 1 + (((file[22] >> 6) | (file[23] << 2) | (file[24] << 10)) & 0x3fff);
  return {
    width,
    height,
    hasAlpha: vp8x ? (file[20] & 0x10) !== 0 : expectedAlpha[name],
    encoding: expectedEncoding[name],
  };
}

for (const [name, [width, height]] of Object.entries(expectedDimensions)) {
  const file = fs.readFileSync(path.join(assetDir, name));
  assert.deepStrictEqual(readWebp(file, name), { width, height, hasAlpha: expectedAlpha[name], encoding: expectedEncoding[name] }, `${name} must preserve its canvas and approved encoding`);
}

assert(muenba.includes('assets/img/muenba/hiding.webp'), 'Muenba must reference the WebP hiding pose');
assert(muenba.includes('assets/img/muenba/muenba_logo.webp'), 'Muenba must reference the WebP logo');
assert(karasuki.includes('assets/img/muenba/muenba_logo.webp'), 'Karasuki must reference the shared WebP Muenba logo');
assert.strictEqual(
  fs.readdirSync(assetDir).filter((name) => /^(hiding|muenba_logo)\.png$/i.test(name)).length,
  0,
  'retired Muenba supporting-art PNG files must be absent',
);
assert(!/assets\/img\/muenba\/(?:hiding|muenba_logo)\.png/i.test(`${muenba}\n${karasuki}`), 'runtime must not reference retired supporting-art PNG paths');

console.log('Muenba supporting-art audit passed: hiding art is lossy WebP; the shared statue/logo remains lossless; canvases and live references are stable.');
