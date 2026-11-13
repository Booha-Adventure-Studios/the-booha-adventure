#!/usr/bin/env node
'use strict';

// Keep oversized source/archive material out of Git history. This checks the
// index rather than the working tree so ignored local staging files are fine,
// but anything actually staged for commit is caught.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');
const maxBytes = 5 * 1024 * 1024;
const forbiddenExtensions = new Set(['.zip', '.tar', '.gz', '.7z', '.dmg', '.psd', '.mov']);
const allowlistedOversized = new Set([
  'assets/invaders/b-i-endscreen.mp4',
]);

const tracked = childProcess.execFileSync('git', ['ls-files', '-z'], {
  cwd: root,
}).toString('utf8').split('\0').filter(Boolean);

const violations = [];
for (const relative of tracked) {
  const extension = path.extname(relative).toLowerCase();
  if (forbiddenExtensions.has(extension)) {
    violations.push(`${relative}: forbidden tracked extension ${extension}`);
    continue;
  }

  const bytes = fs.statSync(path.join(root, relative)).size;
  if (bytes > maxBytes && !allowlistedOversized.has(relative)) {
    violations.push(`${relative}: ${bytes} bytes exceeds ${maxBytes}-byte limit`);
  }
}

for (const relative of allowlistedOversized) {
  assert(tracked.includes(relative), `allowlisted oversized file is missing: ${relative}`);
}

assert.deepStrictEqual(violations, [], violations.join('\n'));
console.log(`Tracked-file guard passed: ${tracked.length} tracked files checked; ${allowlistedOversized.size} oversized allowlisted file permitted.`);
