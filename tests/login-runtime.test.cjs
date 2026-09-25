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

function makeHarness({ token, verifyResponse, online = true }) {
  const storage = new Storage(token ? { booha_token: token } : {});
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
    fetch: async url => {
      context.fetchCalls = (context.fetchCalls || 0) + 1;
      context.fetchUrl = url;
      return { json: async () => verifyResponse };
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
    verifyResponse: {
      ok: true,
      expiresAt: '2026-10-01T00:00:00.000Z',
      displayName: 'Mina Sato',
      isJuku: true,
      userId: 'student-42',
    },
  });
  assert.strictEqual(accepted.context.fetchCalls, 1);
  assert.match(accepted.context.fetchUrl, /verifyToken\?token=student%20token$/);
  assert.strictEqual(accepted.storage.getItem('booha_userid'), 'student-42');
  assert.strictEqual(accepted.storage.getItem('booha_first_name'), 'Mina');
  assert.strictEqual(accepted.storage.getItem('booha_user_name'), 'Mina Sato');
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

  console.log('Login runtime passed: missing-token gate, verified identity boot, encoded token request, identity storage, rejected-token cleanup, and redirects hold.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
