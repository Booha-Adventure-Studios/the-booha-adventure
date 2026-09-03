#!/usr/bin/env node
'use strict';

// Pass 1: the exact weekly profile section must never stay blank when a
// dependency, saved-data read, curriculum lookup, or renderer fails.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/ui/adventure-log.js'), 'utf8');

assert(source.includes('function showMountFallback'), 'adventure log must provide a visible mount fallback');
assert(source.includes('function showWeeklyLoading'), 'weekly log must provide an explicit loading state');
assert(source.includes("showWeeklyLoading(document.getElementById('alog-week'))"),
  'weekly log must show loading before the identity-ready event');
assert(source.includes('weekly log dependencies are unavailable'),
  'weekly log must handle missing dependencies');
assert(source.includes('curriculum lookup is unavailable'),
  'weekly log must handle missing curriculum lookup');

class FakeElement {
  constructor() {
    this.children = [];
    this.attributes = {};
    this.className = '';
    this.textContent = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener() {}
}

function runWithRegistry(registry) {
  const weeklyMount = new FakeElement();
  const document = {
    createElement: () => new FakeElement(),
    getElementById: id => id === 'alog-week' ? weeklyMount : null,
    addEventListener() {},
  };
  const dayRecord = {
    getCurrentKeys: () => ({ week: '2026-09-01|september-w1', day: '2026-09-03' }),
    getDayLog: () => ({}),
    getWeekLog: () => ({}),
  };
  const window = {
    BOOHA_READY: true,
    BoohaDayRecord: dayRecord,
    CALENDAR: {},
    BoohaGameRegistry: registry,
  };
  const context = { window, document, console, BoohaDayRecord: dayRecord,
    BoohaGameRegistry: registry, localStorage: {
    getItem: () => null,
    setItem: () => {},
  } };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'adventure-log.js' });
  return weeklyMount;
}

const missingDependencyMount = runWithRegistry(null);
assert.strictEqual(missingDependencyMount.attributes['aria-busy'], 'false',
  'missing dependencies must leave the weekly mount out of loading state');
assert.strictEqual(missingDependencyMount.children.length, 1,
  'missing dependencies must render a fallback');
assert.strictEqual(missingDependencyMount.children[0].attributes.role, 'status',
  'dependency fallback must be announced as a status');

const thrownLookupMount = runWithRegistry({
  getForCurriculum() { throw new Error('simulated registry failure'); },
});
assert.strictEqual(thrownLookupMount.children.length, 1,
  'a thrown curriculum lookup must render a fallback');
assert.strictEqual(thrownLookupMount.children[0].attributes.role, 'status',
  'lookup fallback must be announced as a status');

console.log('Adventure-log Pass 1 audit passed: weekly loading and error states survive missing dependencies and thrown curriculum lookups.');
