const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const token = fs.readFileSync(path.join(root, 'js/token.js'), 'utf8');
const sync = fs.readFileSync(path.join(root, 'js/sync-client.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(token, /background:#6f3155/, 'save status must use the soft pink treatment');
assert.match(token, /Booha is getting things ready/, 'normal save-lock status must be calm and non-alarming');
assert.match(token, /Booha can\\'t save right now — please tell your teacher/, 'real save problems must include a clear teacher call to action');
assert.match(token, /ブーハーが/, 'save status must use the Booha Japanese spelling');
assert.doesNotMatch(token, /Not saving — tell your teacher/, 'old red failure copy must be removed');

assert.match(sync, /background:#6b3154/, 'recovery notice must use the soft pink treatment');
assert.match(sync, /Latest online progress restored/, 'recovery notice must describe the authoritative online progress');
assert.match(sync, /The other copy was saved safely for your teacher/, 'recovery notice must preserve the teacher recovery lead');
assert.doesNotMatch(sync, /Your latest private progress is restored/, 'misleading private/latest recovery copy must be removed');
assert.match(verify, /tests\/status-message-audit\.cjs/, 'verify.sh must run the status-message audit');

console.log('Status message audit passed.');
