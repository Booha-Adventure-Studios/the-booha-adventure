#!/usr/bin/env node
'use strict';

// token.js runs in <head>. Offline, its boot path is synchronous, so
// document.body does not exist yet. It used to throw on
// document.body.appendChild — no offline banner, and an expired offline
// session got a blank page instead of the "connection needed" screen.
// Runs the whole file in a VM with no body, then fires DOMContentLoaded.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js/token.js'), 'utf8');

function run({ validatedAgoMs, userId = 'student-a' }) {
  const store = new Map();
  const now = Date.now();
  store.set('booha_token', 'tok');
  store.set('booha_token_expires', String(now + 86400000));
  if (validatedAgoMs != null) store.set('booha_last_validated_at', String(now - validatedAgoMs));
  if (userId) store.set('booha_userid', userId);

  const listeners = {};
  const events = [];
  const intervals = [];
  const body = {
    children: [], style: {}, innerHTML: '',
    appendChild(n) { this.children.push(n); return n; },
  };
  const elements = [];
  const documentElement = {
    style: {},
    classList: { _s: new Set(['token-checking']), remove(c) { this._s.delete(c); }, add(c) { this._s.add(c); }, contains(c) { return this._s.has(c); } },
  };
  const document = {
    body: null,                       // <head> script: no body yet
    readyState: 'loading',
    documentElement,
    createElement(tag) { const el = { tagName: tag, style: {}, textContent: '', remove() {} }; elements.push(el); return el; },
    getElementById(id) { return (document.body ? body.children : []).find(c => c.id === id) || null; },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
    dispatchEvent(ev) { events.push(ev.type); (listeners[ev.type] || []).forEach(fn => fn(ev)); return true; },
  };
  const location = { replaced: null, replace(u) { this.replaced = u; }, href: 'https://example.test/index.html', pathname: '/index.html', search: '' };
  const window = {
    location, document,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {}, removeEventListener() {},
    navigator: { onLine: false, standalone: false },
  };
  const ctx = {
    window, document, location, console, Date, Math, JSON, URL, URLSearchParams,
    navigator: window.navigator,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    Event: class { constructor(type) { this.type = type; } },
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    setInterval: fn => { intervals.push(fn); return intervals.length; },
    clearInterval() {},
    setTimeout: () => 0, clearTimeout() {},
    fetch: () => Promise.reject(new Error('offline')),
    AbortController: class { constructor() { this.signal = {}; } abort() {} },
  };
  window.window = window;
  vm.createContext(ctx);
  let threw = null;
  try { vm.runInContext(src, ctx, { filename: 'js/token.js' }); } catch (e) { threw = e; }
  return {
    threw, events, location, documentElement,
    domReady() { document.body = body; document.readyState = 'interactive'; (listeners.DOMContentLoaded || []).slice().forEach(fn => fn()); },
    body,
  };
}

// ── Offline within the grace period: play from last session ─────────────
{
  const t = run({ validatedAgoMs: 60 * 1000 });
  assert.strictEqual(t.threw, null, 'offline boot must not throw while <body> does not exist');
  assert.ok(t.events.includes('booha:identityReady'), 'identity is still signalled offline');
  assert.ok(!t.documentElement.classList.contains('token-checking'), 'page unlocks');
  assert.strictEqual(t.body.children.length, 0, 'nothing touches the body before it exists');
  t.domReady();
  const banner = t.body.children.find(c => c.id === 'booha-offline-banner');
  assert.ok(banner, 'the offline banner appears once the body exists');
  assert.match(banner.textContent, /No connection/);
  assert.strictEqual(t.body.children.filter(c => c.id === 'booha-offline-banner').length, 1, 'only one banner');
  assert.strictEqual(t.location.replaced, null, 'no redirect');
}

// ── Offline with an expired session: the "connection needed" screen ─────
{
  const t = run({ validatedAgoMs: null });
  assert.strictEqual(t.threw, null, 'expired offline boot must not throw');
  assert.ok(!t.events.includes('booha:identityReady'), 'no identity without a valid session');
  t.domReady();
  assert.match(t.body.innerHTML, /接続が必要です/, 'the block screen is shown (not a blank page)');
  assert.match(t.body.style.cssText, /background:#000/);
  assert.strictEqual(t.location.replaced, null, 'redirect waits for the connection to return');
}

// ── Offline grace but no cached student id: blocked, never unidentified ──
{
  const t = run({ validatedAgoMs: 60 * 1000, userId: null });
  assert.strictEqual(t.threw, null);
  assert.ok(!t.events.includes('booha:identityReady'), 'no identity without a cached student id');
  t.domReady();
  assert.match(t.body.innerHTML, /接続が必要です/);
}

// Every body write in token.js goes through whenBody().
const bodyWrites = src.split('\n').filter(l => /document\.body\.(appendChild|innerHTML|style)/.test(l) && !/^\s*\/\//.test(l));
const unguarded = bodyWrites.filter(l => !/whenBody\(/.test(l));
// innerHTML/style lines live inside a whenBody(() => { … }) block.
const blockStart = src.indexOf('whenBody(() => {\n      document.body.style.cssText');
assert.ok(blockStart > 0, 'the block screen is wrapped in whenBody');
unguarded.forEach(l => assert.ok(/document\.body\.(style\.cssText|innerHTML)/.test(l), `unguarded body write: ${l.trim()}`));

console.log('token offline body: ok');
