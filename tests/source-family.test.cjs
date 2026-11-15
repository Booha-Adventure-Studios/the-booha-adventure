#!/usr/bin/env node
'use strict';

// The source-family helper and its registry stay consistent: every part
// exists, belongs to only one family, and is loaded by every page that loads
// the main file (so a split never drops code from a page).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { readFamily, partsOf, families } = require('./lib/source-family.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const tracked = childProcess.execFileSync('git', ['ls-files', '-z'], { cwd: ROOT })
  .toString('utf8').split('\0').filter(Boolean);
const pages = tracked.filter(f => f.endsWith('.html') && !f.startsWith('tests/') && fs.existsSync(path.join(ROOT, f)));

// With no parts, a family is just the file itself.
assert.strictEqual(readFamily('js/karasuki.js').startsWith(read('js/karasuki.js')), true, 'a family starts with its main file');
if (!partsOf('js/karasuki.js').length) assert.strictEqual(readFamily('js/karasuki.js'), read('js/karasuki.js'), 'no parts means the file alone');

const seen = new Map();
for (const [main, parts] of Object.entries(families)) {
  assert.ok(fs.existsSync(path.join(ROOT, main)), `${main} exists`);
  assert.ok(Array.isArray(parts) && parts.length, `${main} lists its parts`);
  for (const part of parts) {
    assert.ok(fs.existsSync(path.join(ROOT, part)), `${part} exists`);
    // New parts are untracked until committed; they must not be git-ignored.
    let ignored = false;
    try { childProcess.execFileSync('git', ['check-ignore', '-q', part], { cwd: ROOT }); ignored = true; } catch (_) {}
    assert.ok(!ignored, `${part} is not git-ignored`);
    assert.ok(!seen.has(part), `${part} belongs to only one family (also in ${seen.get(part)})`);
    seen.set(part, main);
    if (main.endsWith('.html')) {
      // A page's split-off stylesheet or script must be linked from the page.
      assert.ok(read(main).includes(`"${part}"`), `${main} must link ${part}`);
    }
    if (main.endsWith('.js')) {
      const name = path.basename(main);
      for (const page of pages) {
        const html = read(page);
        if (html.includes(name)) assert.ok(html.includes(path.basename(part)), `${page} loads ${main}, so it must also load ${part}`);
      }
    }
  }
}
console.log(`Source families passed: ${Object.keys(families).length} split families registered.`);
