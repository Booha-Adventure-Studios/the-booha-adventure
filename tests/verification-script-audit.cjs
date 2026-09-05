#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'verify.sh'), 'utf8');

assert.strictEqual(source.split('\n', 1)[0], '#!/usr/bin/env bash', 'verify.sh must begin with its shebang');
assert.match(source, /allowed_empty_json\(\)/, 'verify.sh must define an explicit empty-JSON whitelist');
assert.match(source, /data\/core-games\.json\|data\/maze\.json/, 'the known empty JSON placeholders must be named explicitly');
assert.match(source, /unexpected empty JSON:/, 'unexpected empty JSON files must fail verification');
assert.doesNotMatch(source, /wc -c < "\$f"\)" -le 2/, 'empty JSON handling must not rely on a size-only shortcut');
assert.match(source, /MANIFEST_EXTRA_TESTS/, 'verify.sh must retain the manifest extras runner marker');
assert.match(source, /if \[ \$FAIL -gt 0 \]; then/, 'verification failures must produce a non-zero exit');

console.log('Verification-script hardening audit passed.');
