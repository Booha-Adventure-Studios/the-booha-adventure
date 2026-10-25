#!/usr/bin/env node
'use strict';
/* Unit tests for the profile art revision guard's decision logic. */
const assert = require('assert');
const { check, fingerprint, readRev, VERSIONED } = require('./profile-art-rev-guard.cjs');

const art = { 'medal-a.webp': 'aaaa', 'rank-coin-1.webp': 'cccc' };
const manifest = { rev: '2026-10-24', fingerprint: fingerprint(art), files: art };

assert.strictEqual(check(manifest, art, '2026-10-24').ok, true, 'nothing changed → pass');

const replaced = { ...art, 'medal-a.webp': 'bbbb' };
const forgot = check(manifest, replaced, '2026-10-24');
assert.strictEqual(forgot.ok, false, 'art replaced, ART_REV unchanged → fail');
assert.strictEqual(forgot.reason, 'art-changed-rev-not');
assert.deepStrictEqual(forgot.changed, ['medal-a.webp'], 'names the changed file');
assert.match(forgot.message, /Change ART_REV in js\/core\/profile-art\.js/);

const added = check(manifest, { ...art, 'token-new.webp': 'dddd' }, '2026-10-24');
assert.strictEqual(added.reason, 'art-changed-rev-not', 'new art counts as a change');
const removed = check(manifest, { 'medal-a.webp': 'aaaa' }, '2026-10-24');
assert.deepStrictEqual(removed.changed, ['rank-coin-1.webp'], 'removed art counts as a change');

const bumped = check(manifest, replaced, '2026-10-26');
assert.strictEqual(bumped.ok, false, 'bumped but not recorded → fail until --update');
assert.strictEqual(bumped.reason, 'manifest-stale');
assert.match(bumped.message, /--update/);

assert.strictEqual(check(manifest, art, '2026-10-26').reason, 'manifest-stale', 'a bump alone must also be recorded');
assert.strictEqual(check(null, art, 'x').reason, 'no-manifest');

assert.strictEqual(readRev("const ART_REV = '2026-10-24';"), '2026-10-24');
assert.throws(() => readRev('nothing here'));
['medal-warm-up.webp', 'token-rainbow-master.webp', 'rank-coin-3.webp', 'treasure-chest-open.webp', 'arcade-week-boss.webp']
  .forEach(n => assert.ok(VERSIONED.test(n), `${n} is guarded`));
['portal-log.webp', 'adventure-log-night.webp'].forEach(n => assert.ok(!VERSIONED.test(n), `${n} is not served through ART_REV`));

console.log('Profile art guard unit tests passed.');
