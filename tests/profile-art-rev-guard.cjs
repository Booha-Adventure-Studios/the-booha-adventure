#!/usr/bin/env node
'use strict';
/*
 * Profile art revision guard.
 *
 * Medal / trophy-token / rank-coin / chest art is replaced in place under the
 * same filenames and reaches installed iPads only because every URL carries
 * ART_REV (js/core/profile-art.js). This guard keeps a fingerprint of that
 * art in tests/profile-art-manifest.json and fails verify.sh when:
 *   - the art changed but ART_REV did not  → bump ART_REV, then --update;
 *   - ART_REV changed but the manifest was not re-recorded → --update.
 *
 *   node tests/profile-art-rev-guard.cjs            check (verify.sh runs this)
 *   node tests/profile-art-rev-guard.cjs --update   record the current art + ART_REV
 *
 * --update refuses to record changed art under an unchanged ART_REV.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ART_DIR = path.join(ROOT, 'assets/img/profile');
const MANIFEST = path.join(__dirname, 'profile-art-manifest.json');
const HELPER = path.join(ROOT, 'js/core/profile-art.js');
// The art that is served through BoohaProfileArt.url() (and so through ART_REV).
const VERSIONED = /^(medal-|token-|rank-coin-|treasure-chest-|arcade-week-boss)/;

function readRev(source) {
  const m = String(source).match(/const ART_REV = '([^']+)';/);
  if (!m) throw new Error('ART_REV not found in js/core/profile-art.js');
  return m[1];
}

function hashFiles(dir) {
  const files = {};
  fs.readdirSync(dir).filter(n => VERSIONED.test(n)).sort().forEach(name => {
    files[name] = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, name))).digest('hex').slice(0, 16);
  });
  return files;
}

function fingerprint(files) {
  return crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 16);
}

/** Pure check, unit-tested in tests/profile-art-rev-guard.test.cjs.
 *  Returns { ok, reason, changed: [names], message }. */
function check(manifest, files, rev) {
  const changed = [];
  const before = (manifest && manifest.files) || {};
  new Set([...Object.keys(before), ...Object.keys(files)]).forEach(name => {
    if (before[name] !== files[name]) changed.push(name);
  });
  changed.sort();
  const artChanged = !manifest || manifest.fingerprint !== fingerprint(files);
  const revChanged = !manifest || manifest.rev !== rev;
  const update = 'node tests/profile-art-rev-guard.cjs --update';
  if (!manifest) return { ok: false, reason: 'no-manifest', changed, message: `No art manifest yet. Run: ${update}` };
  if (!artChanged && !revChanged) return { ok: true, reason: 'unchanged', changed, message: 'Profile art and ART_REV match the manifest.' };
  if (artChanged && !revChanged) {
    return { ok: false, reason: 'art-changed-rev-not', changed,
      message: `Profile art changed (${changed.join(', ')}) but ART_REV is still '${rev}'. ` +
        `Change ART_REV in js/core/profile-art.js (a date is fine), then run: ${update}` };
  }
  return { ok: false, reason: 'manifest-stale', changed,
    message: `ART_REV is now '${rev}' (manifest: '${manifest.rev}'). Record it: ${update}` };
}

function main() {
  const rev = readRev(fs.readFileSync(HELPER, 'utf8'));
  const files = hashFiles(ART_DIR);
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : null;
  const result = check(manifest, files, rev);

  if (process.argv.includes('--update')) {
    if (result.reason === 'art-changed-rev-not') {
      console.error(`Refusing to record: ${result.message}`);
      process.exit(1);
    }
    const next = {
      purpose: 'Fingerprint of profile art served through ART_REV (js/core/profile-art.js). Written by tests/profile-art-rev-guard.cjs --update.',
      rev, fingerprint: fingerprint(files), files,
    };
    fs.writeFileSync(MANIFEST, JSON.stringify(next, null, 2) + '\n');
    console.log(`Recorded ${Object.keys(files).length} profile art files under ART_REV '${rev}'.`);
    return;
  }

  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(`Profile art guard passed: ${Object.keys(files).length} files under ART_REV '${rev}'.`);
}

module.exports = { check, fingerprint, readRev, VERSIONED };
if (require.main === module) main();
