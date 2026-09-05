#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERIFY = fs.readFileSync(path.join(ROOT, 'verify.sh'), 'utf8');
const MANIFEST_PATH = path.join(__dirname, 'verification-manifest.json');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

const allowedStatuses = new Set(Object.keys(manifest.statuses || {}));
const exceptions = manifest.exceptions || [];
const exceptionByPath = new Map();
for (const entry of exceptions) {
  assert.ok(entry && typeof entry.path === 'string', 'each manifest exception needs a path');
  assert.ok(!exceptionByPath.has(entry.path), `duplicate manifest exception: ${entry.path}`);
  assert.ok(allowedStatuses.has(entry.status), `${entry.path} has an unknown status: ${entry.status}`);
  exceptionByPath.set(entry.path, entry);
}

const manifestExtrasRunnerPresent = VERIFY.includes('MANIFEST_EXTRA_TESTS');
assert.ok(
  manifestExtrasRunnerPresent,
  'verify.sh must retain the MANIFEST_EXTRA_TESTS runner for manifest-wired current tests'
);

const directRefs = new Set();
for (const match of VERIFY.matchAll(/node\s+(tests\/[A-Za-z0-9._-]+\.cjs)/g)) {
  directRefs.add(match[1]);
}

const testFiles = fs.readdirSync(__dirname)
  .filter(name => name.endsWith('.cjs'))
  .sort()
  .map(name => `tests/${name}`);
const knownPaths = new Set(testFiles);

for (const ref of directRefs) {
  assert.ok(knownPaths.has(ref), `verify.sh references missing test: ${ref}`);
  assert.ok(!exceptionByPath.has(ref), `${ref} is both directly wired and listed as an exception`);
}
for (const entry of exceptions) {
  assert.ok(knownPaths.has(entry.path), `manifest references missing test: ${entry.path}`);
  assert.ok(!directRefs.has(entry.path), `${entry.path} is both directly wired and listed as an exception`);
}

for (const testPath of testFiles) {
  const entry = exceptionByPath.get(testPath);
  if (directRefs.has(testPath)) {
    continue;
  }
  assert.ok(entry, `${testPath} is neither wired by verify.sh nor classified in the manifest`);
  if (entry.status === 'verify') continue;
}

const counts = { direct: directRefs.size, ...Object.fromEntries([...allowedStatuses].map(status => [status, 0])) };
for (const entry of exceptions) counts[entry.status] += 1;
const currentCount = counts.direct + counts.verify;

console.log(
  `Verification manifest passed: ${testFiles.length} test scripts classified ` +
  `(${currentCount} current: ${counts.direct} direct, ${counts.verify} manifest-wired; ` +
  `${counts.manual} manual, ${counts.superseded} superseded, ${counts.obsolete} obsolete, ${counts.uncertain} uncertain).`
);
