#!/usr/bin/env node
'use strict';

// Videos must never load during startup (Nov 2026). Covers every <video> tag
// in tracked pages, every video created from JavaScript, and the service
// worker install-time precache. Page-specific deferral details stay in
// index-final-audit.cjs and maze-media-loading-audit.cjs.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const tracked = childProcess.execFileSync('git', ['ls-files', '-z'], { cwd: root })
  .toString('utf8').split('\0').filter(Boolean)
  .filter((f) => !f.startsWith('tests/') && !f.startsWith('tools/'))
  .filter((f) => fs.existsSync(path.join(root, f)));

// 1. Every <video> tag in a page is preload="none" and never autoplays.
const VIDEO_TAG = /<video\b[^>]*>/gi;
let tagCount = 0;
for (const file of tracked.filter((f) => f.endsWith('.html'))) {
  const html = read(file);
  for (const tag of html.match(VIDEO_TAG) || []) {
    tagCount += 1;
    assert(/\bpreload\s*=\s*["']none["']/i.test(tag), `${file}: <video> must be preload="none": ${tag}`);
    assert(!/\bautoplay\b/i.test(tag), `${file}: <video> must not autoplay on page load: ${tag}`);
  }
  assert(!/<link\b[^>]*\bas\s*=\s*["']video["']/i.test(html), `${file}: must not <link rel="preload" as="video">`);
}
assert(tagCount >= 5, `expected the known <video> tags (index, maze x3, invaders); found ${tagCount}`);

// 2. Videos created from JavaScript: a known inventory. Each one is built
//    inside a portal-entry handler (a player action), so it may autoplay.
//    A new site fails here until someone confirms it only runs on a player
//    action and adds it to this list.
const expectedJsVideoSites = new Map([
  ['js/karasuki.js', 3], // Happy House, Utsuroba, Muenba portal intros
]);
const CREATE_VIDEO = /createElement\(\s*['"]video['"]\s*\)/g;
const actual = new Map();
for (const file of tracked.filter((f) => /\.(m?js|html)$/.test(f))) {
  const n = (read(file).match(CREATE_VIDEO) || []).length;
  if (n) actual.set(file, n);
}
assert.deepStrictEqual(
  [...actual.entries()].sort(), [...expectedJsVideoSites.entries()].sort(),
  'JavaScript-created videos changed: confirm each new one loads only from a player action, then update expectedJsVideoSites',
);

// 3. No video in the install-time precache.
const sw = read('sw.js');
function arrayBody(name) {
  const start = sw.indexOf(`const ${name} = [`);
  assert(start >= 0, `sw.js must declare ${name}`);
  return sw.slice(start, sw.indexOf('];', start));
}
for (const name of ['CORE_FILES', 'CORE_ASSETS']) {
  assert(!/\.(mp4|webm|m4v|mov)\b/i.test(arrayBody(name)), `sw.js ${name} must not precache video`);
}

console.log(`Video loading guard passed: ${tagCount} <video> tags deferred, ${[...actual.values()].reduce((a, b) => a + b, 0)} JS videos inventoried, none precached.`);
