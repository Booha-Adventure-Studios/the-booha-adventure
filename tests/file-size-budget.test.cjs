#!/usr/bin/env node
'use strict';

// File size budget (Pass 0, Nov 2026). Student-facing code stays at or under
// 2,000 lines per file. Files already over it are listed in
// tests/file-size-budget.json with a ceiling and a reason:
//   split-later: comes down over time, split as that area is worked on
//   exception:   documented as fine to stay large (self-contained games)
// Ceilings only go down. Small fixes fit in the headroom; when a file
// shrinks well under its ceiling the test asks for the ceiling to be lowered.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const budget = JSON.parse(fs.readFileSync(path.join(__dirname, 'file-size-budget.json'), 'utf8'));
const { limit, headroom, lowerWhenUnder, files: listed } = budget;
assert.ok(limit === 2000 && headroom > 0 && lowerWhenUnder > headroom, 'budget settings are sane');

const tracked = childProcess.execFileSync('git', ['ls-files', '-z'], { cwd: ROOT })
  .toString('utf8').split('\0').filter(Boolean)
  .filter(f => /\.(js|html|css)$/.test(f) && !f.startsWith('tests/') && !f.startsWith('tools/'))
  .filter(f => fs.existsSync(path.join(ROOT, f)));
const lines = f => (fs.readFileSync(path.join(ROOT, f), 'utf8').match(/\n/g) || []).length;

const problems = [];
for (const f of tracked) {
  const n = lines(f);
  const entry = listed[f];
  if (!entry) {
    if (n > limit) problems.push(`${f}: ${n} lines is over the ${limit}-line limit. Split it, or list it in tests/file-size-budget.json with a reason.`);
    continue;
  }
  if (n > entry.ceiling) problems.push(`${f}: ${n} lines is over its ceiling of ${entry.ceiling}. Move a section into its own file before adding more.`);
  if (n <= limit) problems.push(`${f}: now ${n} lines, under the limit. Remove it from tests/file-size-budget.json.`);
  else if (entry.ceiling - n >= lowerWhenUnder) problems.push(`${f}: shrank to ${n} lines. Lower its ceiling to ${n + headroom} (and listedAt to ${n}).`);
}
for (const [f, entry] of Object.entries(listed)) {
  if (!tracked.includes(f)) problems.push(`${f}: listed in the budget but not a tracked student-facing file. Remove it from the list.`);
  if (!['split-later', 'exception'].includes(entry.kind)) problems.push(`${f}: kind must be split-later or exception.`);
  if (!entry.reason || entry.reason.length < 20) problems.push(`${f}: needs a written reason.`);
  if (!(entry.ceiling <= entry.listedAt + headroom)) problems.push(`${f}: ceiling ${entry.ceiling} is above listedAt + headroom (${entry.listedAt + headroom}). Ceilings only go down.`);
}
assert.deepStrictEqual(problems, [], '\n' + problems.join('\n'));

const counts = Object.values(listed).reduce((a, e) => (a[e.kind] = (a[e.kind] || 0) + 1, a), {});
console.log(`File size budget passed: ${tracked.length} files checked; ${counts['split-later'] || 0} split-later, ${counts.exception || 0} exceptions.`);
