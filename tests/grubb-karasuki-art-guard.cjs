#!/usr/bin/env node
'use strict';
/*
 * Grubb in Karasuki must be the same Grubb as the start screen.
 *
 * The start screen draws assets/skins/grubb_booha/static.webp; Karasuki's
 * floating visitor draws a smaller copy of it (karasuki-knit.webp). In
 * November 2026 static.webp got the new knitted Grubb but the Karasuki copy
 * stayed the old felt one. This guard records which static.webp the copy was
 * made from: if static.webp changes, it fails until the Karasuki copy is
 * re-exported under a NEW file name (iPads cache images by URL) and the
 * hashes below are updated.
 */
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = 'assets/skins/grubb_booha';
const EXPECTED = {
  'static.webp': '998d6c33171a86f3d8b2157b2096675428cc3fdc6057270c5229edfc658b4ad6',
  'karasuki-knit.webp': '9cf23ea5460d65af382114c3b3c3f5f696dc0af60c0266cd9db88751112ffba5',
};
const sha = rel => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');

assert.strictEqual(sha(`${DIR}/static.webp`), EXPECTED['static.webp'],
  "Grubb's start-screen art (static.webp) changed: re-export the Karasuki copy from it under a new file name, point js/core/booha-skins.js at it, and update the hashes in this test");
assert.strictEqual(sha(`${DIR}/karasuki-knit.webp`), EXPECTED['karasuki-knit.webp'],
  'karasuki-knit.webp changed in place: give re-exported art a new file name so iPads do not keep the cached copy');

const skins = fs.readFileSync(path.join(ROOT, 'js/core/booha-skins.js'), 'utf8');
const uses = skins.match(/assets\/skins\/grubb_booha\/[\w-]+\.webp/g) || [];
assert.deepStrictEqual([...new Set(uses)].sort(), [`${DIR}/karasuki-knit.webp`, `${DIR}/static.webp`],
  'Grubb uses exactly the start-screen art and its Karasuki copy');
assert.match(skins, /const CHRISTMAS_KARASUKI = Object\.freeze\(\{[\s\S]*?asset: 'assets\/skins\/grubb_booha\/karasuki-knit\.webp'/,
  "Karasuki's floating Grubb uses the knitted copy");

const buf = fs.readFileSync(path.join(ROOT, `${DIR}/karasuki-knit.webp`));
assert.strictEqual(buf.toString('ascii', 0, 4), 'RIFF');
assert.strictEqual(buf.toString('ascii', 8, 12), 'WEBP');
assert.ok(buf.length <= 200 * 1024, `the Karasuki copy stays small (${Math.round(buf.length / 1024)} KiB)`);

console.log('Grubb Karasuki art guard passed: the floating Grubb matches the start-screen Grubb.');
