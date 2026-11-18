#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'verify.sh'), 'utf8');

assert.strictEqual(source.split('\n', 1)[0], '#!/usr/bin/env bash', 'verify.sh must begin with its shebang');
// ./verify.sh must run directly (a file rewrite can drop the bit; restore with chmod +x verify.sh).
if (process.platform !== 'win32') {
  assert((fs.statSync(path.join(__dirname, '..', 'verify.sh')).mode & 0o111) !== 0, 'verify.sh must be executable (chmod +x verify.sh)');
}
assert.match(source, /allowed_empty_json\(\)/, 'verify.sh must define an explicit empty-JSON whitelist');
assert.match(source, /allowed_empty_json\(\) \{/, 'empty JSON files must go through the explicit whitelist');
assert.ok(!/data\/core-games\.json|data\/maze\.json/.test(source), 'the removed empty placeholders are no longer whitelisted');
assert.match(source, /unexpected empty JSON:/, 'unexpected empty JSON files must fail verification');
assert.doesNotMatch(source, /wc -c < "\$f"\)" -le 2/, 'empty JSON handling must not rely on a size-only shortcut');
assert.ok(
  source.includes("cache_relevant_changed=$(echo \"$changed\" | grep -vE '^tests/[^/]+\\.json$' || true)"),
  'cache-bump reminder must ignore tests/*.json changes'
);
assert.match(source, /MANIFEST_EXTRA_TESTS/, 'verify.sh must retain the manifest extras runner marker');
assert.match(source, /if \[ \$FAIL -gt 0 \]; then/, 'verification failures must produce a non-zero exit');

// Every reporting call must use a helper verify.sh defines (ok / bad / warn).
// An undefined name such as "fail" only prints "command not found": the
// failure is never counted and verify.sh still reports success.
const defined = new Set([...source.matchAll(/^([a-z_]+)\(\)\s*\{/gm)].map(m => m[1]));
['ok', 'bad', 'warn'].forEach(name => assert.ok(defined.has(name), `verify.sh must define ${name}()`));
const REPORTING = ['ok', 'bad', 'warn', 'fail', 'pass', 'error', 'err', 'die', 'success', 'info'];
source.split('\n').forEach((line, i) => {
  const call = line.match(/^\s*([a-z_]+)\s+["']/);
  if (!call || !REPORTING.includes(call[1])) return;
  assert.ok(defined.has(call[1]), `verify.sh line ${i + 1} calls undefined helper "${call[1]}" (use ok, bad or warn)`);
});
console.log('Verification-script hardening audit passed.');
