#!/usr/bin/env node
'use strict';

// Keep oversized source/archive material out of Git history. This checks the
// index rather than the working tree so ignored local staging files are fine,
// but anything actually staged for commit is caught.
//
// Per-type size caps (Nov 2026):
//   audio  5 MiB  (largest today ~3.5 MiB; the 128 kbps rule for long-form
//                  music lives in asset-weight-audit.cjs)
//   video 10 MiB  (largest normal video today ~3.1 MiB)
//   other  5 MiB
// No duration cap: file size is what students actually download.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');
const MiB = 1024 * 1024;
const forbiddenExtensions = new Set([
  '.zip', '.tar', '.gz', '.7z', '.dmg', '.psd', '.mov',
  // Uncompressed audio masters: export .mp3 (or .m4a) instead.
  '.wav', '.aif', '.aiff',
]);
const audioExtensions = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.opus']);
const videoExtensions = new Set(['.mp4', '.webm', '.m4v']);
const AUDIO_MAX = 5 * MiB;
const VIDEO_MAX = 10 * MiB;
const OTHER_MAX = 5 * MiB;

// Named exceptions carry their own ceiling so they cannot grow silently.
const allowlistedOversized = new Map([
  // Invaders end screen: 1080p, ~35 s, plays once at the end of the game and
  // is deferred (preload="none", never precached). ~15.9 MiB today.
  ['assets/invaders/b-i-endscreen.mp4', 16 * MiB],
]);

function capFor(relative) {
  if (allowlistedOversized.has(relative)) return allowlistedOversized.get(relative);
  const extension = path.extname(relative).toLowerCase();
  if (audioExtensions.has(extension)) return AUDIO_MAX;
  if (videoExtensions.has(extension)) return VIDEO_MAX;
  return OTHER_MAX;
}

function realSize(relative) {
  const absolute = path.join(root, relative);
  // A tracked path deleted in Finder before `git rm` is not bloat; skip it
  // instead of letting statSync throw ENOENT and fail verify.sh confusingly.
  if (!fs.existsSync(absolute)) return null;
  return fs.statSync(absolute).size;
}

function checkTrackedPath(relative, sizeOf = realSize) {
  const extension = path.extname(relative).toLowerCase();
  if (forbiddenExtensions.has(extension)) {
    return [`${relative}: forbidden tracked extension ${extension}`];
  }
  const bytes = sizeOf(relative);
  if (bytes === null) return [];
  const cap = capFor(relative);
  if (bytes > cap) return [`${relative}: ${bytes} bytes exceeds ${cap}-byte limit`];
  return [];
}

// Self-checks on the rules themselves (no files needed).
const fixed = (bytes) => () => bytes;
assert.deepStrictEqual(checkTrackedPath('tests/__absent-guard-probe__.bin'), [], 'absent tracked path is skipped');
assert.strictEqual(checkTrackedPath('tests/__absent-guard-probe__.zip').length, 1, 'absent forbidden extension is still reported');
for (const ext of ['.wav', '.aif', '.aiff', '.mov']) {
  assert.strictEqual(checkTrackedPath(`probe${ext}`, fixed(1)).length, 1, `${ext} is forbidden`);
}
assert.strictEqual(checkTrackedPath('probe.mp3', fixed(4 * MiB)).length, 0, '4 MiB audio passes');
assert.strictEqual(checkTrackedPath('probe.mp3', fixed(6 * MiB)).length, 1, '6 MiB audio fails');
assert.strictEqual(checkTrackedPath('probe.mp4', fixed(9 * MiB)).length, 0, '9 MiB video passes');
assert.strictEqual(checkTrackedPath('probe.mp4', fixed(16 * MiB)).length, 1, 'a second 16 MiB video fails');
assert.strictEqual(checkTrackedPath('probe.webp', fixed(6 * MiB)).length, 1, '6 MiB non-media file fails');
assert.strictEqual(checkTrackedPath('assets/invaders/b-i-endscreen.mp4', fixed(15.9 * MiB)).length, 0, 'end screen passes at its size');
assert.strictEqual(checkTrackedPath('assets/invaders/b-i-endscreen.mp4', fixed(17 * MiB)).length, 1, 'end screen cannot grow past its own ceiling');

const tracked = childProcess.execFileSync('git', ['ls-files', '-z'], {
  cwd: root,
}).toString('utf8').split('\0').filter(Boolean);

const violations = [];
for (const relative of tracked) violations.push(...checkTrackedPath(relative));

for (const relative of allowlistedOversized.keys()) {
  assert(tracked.includes(relative), `allowlisted oversized file is missing: ${relative}`);
}

assert.deepStrictEqual(violations, [], violations.join('\n'));
console.log(`Tracked-file guard passed: ${tracked.length} tracked files checked (audio ≤5 MiB, video ≤10 MiB, other ≤5 MiB; ${allowlistedOversized.size} named exception).`);
