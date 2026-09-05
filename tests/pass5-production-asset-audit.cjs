#!/usr/bin/env node
'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const homework = fs.readFileSync(path.join(root, 'homework.html'), 'utf8');
const jukuGhosts = fs.readFileSync(path.join(root, 'js', 'juku-ghosts.js'), 'utf8');
const uhibon = fs.readFileSync(path.join(root, 'js', 'uhibon-chatbot.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function assertAsset(relative, dimensions, maxBytes) {
  const file = path.join(root, relative);
  assert(fs.existsSync(file), `${relative} must exist after the production reference update`);
  const actualDimensions = childProcess.execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0:s=x', file,
  ], { encoding: 'utf8' }).trim().split('x').map(Number);
  assert.deepStrictEqual(actualDimensions, dimensions, `${relative} must preserve its intended display-resolution canvas`);
  assert(fs.statSync(file).size <= maxBytes, `${relative} must remain within its production payload ceiling`);
}

assert(homework.includes("url('assets/img/hw-background-1.webp')"),
  'homework must load the optimized WebP background');
assert(!homework.includes('hw-background-1.png'),
  'homework must not keep downloading the retired PNG background');
assertAsset('assets/img/hw-background-1.webp', [1536, 1024], 500 * 1024);

assert(jukuGhosts.includes("IMG_DIR + 'tree-arch.webp'"),
  'Juku ghost field must load the optimized transparent tree');
assert(!jukuGhosts.includes('tree-arch.png'),
  'Juku ghost field must not keep downloading the retired PNG tree');
assertAsset('assets/img/tree-arch.webp', [1536, 1024], 1.3 * 1024 * 1024);

for (const name of ['chat-uhi', 'uhi-w', 'uhi-st', 'uhi-t1', 'uhi-t2']) {
  assert(uhibon.includes(`${name}.webp`), `Uhibon chatbot must load ${name}.webp`);
}
assert(!uhibon.includes('.png'), 'Uhibon chatbot must not keep downloading the retired PNG artwork');
for (const name of ['chat-uhi', 'uhi-w', 'uhi-st', 'uhi-t1', 'uhi-t2']) {
  assertAsset(`assets/img/uhibon/${name}.webp`, [384, 384], 100 * 1024);
}

assertAsset('assets/img/utsuroba_icon.webp', [384, 576], 100 * 1024);
assert(verify.includes('tests/pass5-production-asset-audit.cjs'),
  'verify.sh must run the Pass 5 production asset audit');

console.log('Pass 5 production asset audit passed: live homework, Juku, Uhibon, and Utsuroba artwork use display-sized WebP payloads.');
