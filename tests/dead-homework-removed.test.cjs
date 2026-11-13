#!/usr/bin/env node
'use strict';

// js/homework.js was dead code (no page loaded it) that still used
// device-wide `booha_hw_known_*` keys. Homework state lives only in the
// student's save via js/core/homework-store.js. Removed Nov 2026.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');
assert(!fs.existsSync(path.join(root, 'js/homework.js')), 'js/homework.js must stay removed');

const tracked = childProcess.execFileSync('git', ['ls-files', '-z'], { cwd: root })
  .toString('utf8').split('\0').filter(Boolean)
  .filter((f) => /\.(m?js|html|json)$/.test(f) && !f.startsWith('tests/') && !f.startsWith('tools/'))
  .filter((f) => fs.existsSync(path.join(root, f)));
assert(!tracked.includes('js/homework.js'), 'js/homework.js must not be tracked');

// The legacy prefix may appear only in homework-store.js, whose clearLegacy()
// removes old keys by prefix (never reading or migrating them), and in
// comments elsewhere.
const LEGACY_CLEANER = 'js/core/homework-store.js';
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
const problems = [];
for (const file of tracked) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const code = stripComments(src);
  if (/(^|[^-\w])homework\.js\b/.test(code)) problems.push(`${file}: references homework.js`);
  if (file !== LEGACY_CLEANER && code.includes('booha_hw_known_')) {
    problems.push(`${file}: uses device-wide booha_hw_known_* keys`);
  }
}
const cleaner = fs.readFileSync(path.join(root, LEGACY_CLEANER), 'utf8');
assert.match(cleaner, /const LEGACY_PREFIXES = \['booha_hw_copied_', 'booha_hw_known_'\];/,
  'homework-store.js keeps the legacy prefixes only for removal');
assert.match(cleaner, /old\.forEach\(key => \{ ls\.removeItem\(key\); removed\+\+; \}\);/,
  'legacy homework keys are removed, never read or migrated');
assert.doesNotMatch(cleaner.slice(cleaner.indexOf('function clearLegacy')), /ls\.getItem\(/,
  'clearLegacy must not read legacy values');
assert.deepStrictEqual(problems, [], problems.join('\n'));
console.log(`Dead homework guard passed: js/homework.js is gone and ${tracked.length} files neither load it nor use its device-wide keys.`);
