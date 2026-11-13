#!/usr/bin/env node
'use strict';

// Snap rename (Nov 2026): the live game is mister_happys_snap.html. The old
// mister_happys_snap_test.html path stays as a tiny redirect during the
// transition so old bookmarks and cached links keep working.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const NEW = 'mister_happys_snap.html';
const OLD = 'mister_happys_snap_test.html';

// The game lives at the new path with its token gate and records key intact.
const game = read(NEW);
assert(game.includes('./js/token.js'), 'renamed game keeps its token gate');
assert(game.includes("const STORE_KEY = 'booha_snap_test_records';"),
  'records storage key is unchanged so existing records survive the rename');

// Happy House sends players to the new path only.
const house = read('happy_house.html');
assert(house.includes(`window.location.href = '${NEW}';`), 'Happy House links to the renamed game');
assert(!house.includes(`'${OLD}'`), 'Happy House no longer links to the old path');
assert(house.includes("const SNAP_STORE = 'booha_snap_test_records';"),
  'Happy House still reads the same records key');

// The old path is a small redirect, not a second copy of the game.
const redirect = read(OLD);
assert(redirect.length < 2000, 'old path is a tiny redirect page');
assert(redirect.includes(`location.replace('${NEW}'`), 'redirect script points to the new path');
assert(redirect.includes(`url=${NEW}`), 'meta refresh fallback points to the new path');
assert(redirect.includes('noindex'), 'redirect page is not indexed');
assert(!redirect.includes('STORE_KEY'), 'redirect page carries no game code');

// Both paths are precached during the transition.
const sw = read('sw.js');
assert(sw.includes('`${BASE}/' + NEW + '`'), 'service worker precaches the renamed game');
assert(sw.includes('`${BASE}/' + OLD + '`'), 'service worker keeps the redirect during the transition');

// No other tracked file still points players at the old page.
const allowed = new Set([OLD, 'sw.js', 'tests/snap-rename.test.cjs']);
const hits = childProcess.execFileSync('git', ['grep', '-l', '-F', OLD], { cwd: root })
  .toString('utf8').split('\n').filter(Boolean)
  .filter((f) => !allowed.has(f));
assert.deepStrictEqual(hits, [], `unexpected references to ${OLD}: ${hits.join(', ')}`);

console.log('Snap rename test passed: game moved, Happy House relinked, redirect and precache in place.');
