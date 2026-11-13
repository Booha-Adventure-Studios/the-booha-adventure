#!/usr/bin/env node
'use strict';

// Execute the real token gate in isolation. The test covers the three boot
// outcomes that determine whether a student reaches the app: missing token,
// successful verification, and rejected verification.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js/token.js'), 'utf8');

class Storage {
  constructor(initial) { this.values = new Map(Object.entries(initial || {})); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function makeHarness({ token, verifyResponse, online = true, legacyFullName = null, legacyCurriculum = null, postStatus = 200 }) {
  const storage = new Storage(token
    ? {
      booha_token: token,
      ...(legacyFullName ? { booha_user_name: legacyFullName } : {}),
      ...(legacyCurriculum ? { booha_last_curr: legacyCurriculum } : {}),
    }
    : {});
  const events = [];
  const redirects = [];
  const classes = new Set(['token-checking']);
  const document = {
    visibilityState: 'visible',
    documentElement: {
      classList: {
        remove(name) { classes.delete(name); },
        add(name) { classes.add(name); },
      },
      style: {},
    },
    body: {
      appendChild() {},
      style: {},
      innerHTML: '',
    },
    listeners: {},
    addEventListener(type, handler) {
      (this.listeners[type] ||= []).push(handler);
    },
    dispatchEvent(event) {
      events.push(event.type);
      for (const handler of this.listeners[event.type] || []) handler(event);
    },
    getElementById() { return null; },
    createElement() {
      return {
        style: { cssText: '' },
        appendChild() {},
        addEventListener() {},
        remove() {},
        setAttribute() {},
      };
    },
  };
  const window = {
    location: { replace(url) { redirects.push(url); } },
    navigator: { onLine: online, userAgent: '', standalone: true },
    matchMedia() { return { matches: true }; },
    addEventListener() {},
  };
  const context = {
    console,
    Date,
    document,
    localStorage: storage,
    navigator: window.navigator,
    window,
    Event: class Event { constructor(type) { this.type = type; } },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    fetch: async (url, init = {}) => {
      context.fetchCalls = (context.fetchCalls || 0) + 1;
      context.fetchUrl = url;
      context.fetchLog = (context.fetchLog || []).concat([{ url, init }]);
      const isPost = init.method === 'POST';
      const status = isPost ? postStatus : 200;
      return { status, json: async () => verifyResponse };
    },
    setTimeout,
    clearTimeout,
  };
  window.document = document;
  window.localStorage = storage;
  window.Event = context.Event;
  window.CustomEvent = context.CustomEvent;
  vm.createContext(context);
  return { context, storage, events, redirects, classes };
}

async function bootCase(options) {
  const harness = makeHarness(options);
  vm.runInContext(source, harness.context, { filename: 'js/token.js' });
  await new Promise(resolve => setImmediate(resolve));
  return harness;
}

(async () => {
  const missing = await bootCase({ token: null, verifyResponse: { ok: true } });
  assert.strictEqual(missing.context.fetchCalls || 0, 0);
  assert.deepStrictEqual(missing.redirects, ['https://www.bryanharper.tokyo/booha-gate?reason=missing']);

  const accepted = await bootCase({
    token: 'student token',
    legacyFullName: 'Previous Student',
    legacyCurriculum: 'bc',
    verifyResponse: {
      ok: true,
      expiresAt: '2026-10-01T00:00:00.000Z',
      displayName: 'Mina Sato',
      isJuku: true,
      userId: 'student-42',
    },
  });
  assert.strictEqual(accepted.context.fetchCalls, 1);
  // The token travels in a POST body, never in the URL.
  assert.match(accepted.context.fetchUrl, /\/_functions\/verifyToken$/);
  assert.strictEqual(accepted.context.fetchLog[0].init.method, 'POST');
  assert.deepStrictEqual(JSON.parse(accepted.context.fetchLog[0].init.body), { token: 'student token' });
  assert.ok(!accepted.context.fetchLog.some(call => String(call.url).includes('token=')),
    'a live POST route must never put the token in a URL');
  assert.strictEqual(accepted.storage.getItem('booha_userid'), 'student-42');
  assert.strictEqual(accepted.storage.getItem('booha_first_name'), 'Mina');
  assert.strictEqual(accepted.storage.getItem('booha_user_name'), null,
    'verified login must scrub the legacy full-name key');
  assert.strictEqual(accepted.storage.getItem('booha_last_curr'), null,
    'verified login must scrub the previous student curriculum mirror');
  assert.strictEqual(accepted.storage.getItem('booha_is_juku'), '1');
  assert.ok(accepted.events.includes('booha:identityReady'));
  assert.strictEqual(accepted.redirects.length, 0);
  assert.strictEqual(accepted.classes.has('token-checking'), false);

  const rejected = await bootCase({
    token: 'expired token',
    verifyResponse: { ok: false, reason: 'EXPIRED' },
  });
  assert.strictEqual(rejected.context.fetchCalls, 1);
  assert.deepStrictEqual(rejected.redirects, ['https://www.bryanharper.tokyo/booha-gate?reason=expired']);
  assert.strictEqual(rejected.storage.getItem('booha_token'), null,
    'rejected sessions must clear the token before redirecting');
  assert.ok(!rejected.events.includes('booha:identityReady'));

  // Until the Wix POST route is confirmed live, a missing route (404/405)
  // falls back exactly once to the legacy GET.
  for (const postStatus of [404, 405]) {
    const legacy = await bootCase({
      token: 'student token',
      postStatus,
      verifyResponse: { ok: true, userId: 'student-42', firstName: 'Mina' },
    });
    assert.strictEqual(legacy.context.fetchCalls, 2, `POST ${postStatus} must fall back once`);
    assert.strictEqual(legacy.context.fetchLog[0].init.method, 'POST');
    assert.match(legacy.context.fetchLog[1].url, /verifyToken\?token=student%20token$/);
    assert.strictEqual(legacy.redirects.length, 0);
  }

  // Source contract: the only URL that may carry the token is the single
  // marked legacy fallback, and it must sit behind the 404/405 check.
  const urlTokenUses = source.match(/\?token=\$\{/g) || [];
  assert.strictEqual(urlTokenUses.length, 1, 'exactly one legacy GET may put the token in a URL');
  assert.match(source,
    /if \(res\.status === 404 \|\| res\.status === 405\) \{\s*return fetch\(`\$\{VERIFY_URL\}\?token=\$\{encodeURIComponent\(token\)\}`\); \/\/ LEGACY_GET_FALLBACK/,
    'the legacy GET must only run after the POST route reports 404/405');

  console.log('Login runtime passed: missing-token gate, POST-body token verification, single legacy GET fallback, identity storage, rejected-token cleanup, and redirects hold.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
