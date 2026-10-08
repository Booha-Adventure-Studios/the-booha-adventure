const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const token = fs.readFileSync(path.join(root, 'js/token.js'), 'utf8');
const sync = fs.readFileSync(path.join(root, 'js/sync-client.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(token, /_functions\/verifyAndLoad/, 'token gate must know the combined bootstrap endpoint');
assert.match(token, /method: 'POST'/, 'combined bootstrap must use POST');
assert.match(token, /hasFreshSessionRestore\(token\)/, 'later page hops must avoid the combined bootstrap');
assert.match(token, /res\.status === 404 \|\| res\.status === 405/, 'frontend must fall back if Wix has not published the route yet');
assert.match(token, /takeInitialSync\(data, token\)/, 'combined response must be handed to sync-client');

assert.match(sync, /function takeInitialSync\(\)/, 'sync-client must consume the combined bootstrap response');
assert.match(sync, /const initial = window\.BOOHA_INITIAL_SYNC/, 'sync-client must use the verified response instead of reloading it');
assert.match(sync, /res = takeInitialSync\(\)/, 'restore must prefer the combined first-page response');
assert.match(sync, /post\(LOAD_URL, \{ token: token\(\) \}\)/, 'normal restore fallback must remain available');
assert.match(verify, /tests\/verify-and-load-audit\.cjs/, 'verify.sh must run the combined-bootstrap audit');

console.log('Verify-and-load audit passed.');
