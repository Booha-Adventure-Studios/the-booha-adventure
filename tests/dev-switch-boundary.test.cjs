#!/usr/bin/env node
'use strict';

// Dev switch boundary (Nov 2026). The teacher world switch is convenience UI,
// never proof that anything was earned:
//  - it is session-only (sessionStorage), and an old localStorage copy is
//    cleared, so it can never stay on for the next student on a shared iPad
//  - turning it on writes nothing to the student's save by itself
//  - world visits are not recorded during a dev session (no World Traveler
//    progress from testing)
//  - forceUnlock() (a console-only helper that wrote forced achievements)
//    is gone
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function storage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    has: k => m.has(k),
  };
}

function bootUnlockSystem({ session = {}, local = {} } = {}) {
  const writes = [];
  const body = { appendChild() {} };
  const ctx = {
    console,
    sessionStorage: storage(session),
    localStorage: storage(local),
    setInterval() {},
    CustomEvent: function (t, i) { this.type = t; this.detail = i && i.detail; },
    document: {
      body,
      getElementById: () => null,
      createElement: () => ({ setAttribute() {}, style: {}, remove() {} }),
      addEventListener() {},
      dispatchEvent() { return true; },
    },
    BoohaAdventure: {
      registerSystem() {},
      save: {
        load: () => ({ unlocks: {}, weekly: {}, meta: {} }),
        save: d => { writes.push(['save', d]); return true; },
        patch: (k, v) => { writes.push(['patch', k, v]); return true; },
        patchDeep: (a, b, c) => { writes.push(['patchDeep', a, b, c]); return true; },
      },
      scores: { isCompleted: () => false, totalCompleted: () => 0, getEntry: () => ({}) },
      registry: { saveId: (c, b) => `${c}:${b}` },
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('js/core/unlock-system.js'), ctx, { filename: 'unlock-system.js' });
  return { ctx, writes };
}

// Switch on (session): worlds read as open, nothing is written.
{
  const { ctx, writes } = bootUnlockSystem({ session: { booha_dev_worlds: '1' } });
  assert.strictEqual(ctx.window.__devWorldsSwitch, true, 'the session switch turns on');
  assert.ok(ctx.window.__devUtsuroba && ctx.window.__devMuenba && ctx.window.__devGrimmerglen, 'the three world flags open');
  assert.deepStrictEqual(writes, [], 'turning the switch on writes nothing to the save');
  assert.strictEqual(typeof ctx.window.BoohaUnlockSystem.forceUnlock, 'undefined', 'forceUnlock is not exposed');
}

// A leftover localStorage switch from an older build is cleared and ignored.
{
  const { ctx, writes } = bootUnlockSystem({ local: { booha_dev_worlds: '1' } });
  assert.strictEqual(ctx.window.__devWorldsSwitch, false, 'a leftover localStorage switch does not open worlds');
  assert.strictEqual(ctx.localStorage.has('booha_dev_worlds'), false, 'the leftover localStorage switch is removed');
  assert.deepStrictEqual(writes, [], 'clearing it writes nothing to the save');
}

// No other code reads or sets the switch from localStorage.
const sources = ['js/core/unlock-system.js', 'js/grimmerglen.js', 'js/muenba.js', 'js/utsuroba.js', 'js/karasuki.js', 'js/core/trophy-case.js'];
for (const f of sources) {
  const s = read(f);
  assert.ok(!/localStorage\.(getItem|setItem)\('booha_dev_worlds'/.test(s), `${f} never reads or sets the switch in localStorage`);
}
assert.ok(!/forceUnlock/.test(read('js/core/unlock-system.js')), 'forceUnlock is removed');

// World visits are not recorded during a dev session.
function trophies(session) {
  const patches = [];
  const ctx = {
    console,
    sessionStorage: storage(session),
    BoohaAdventure: {
      save: {
        load: () => ({ meta: {} }),
        patchDeep: (a, b, c) => { patches.push([a, b, c]); return true; },
      },
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('js/core/trophy-case.js'), ctx, { filename: 'trophy-case.js' });
  return { T: ctx.window.BoohaTrophies, patches };
}
{
  const { T, patches } = trophies({ booha_dev_worlds: '1' });
  assert.strictEqual(T.recordWorldVisit('muenba'), false, 'no world visit is recorded with the world switch on');
  assert.deepStrictEqual(patches, [], 'nothing is written');
}
{
  const { T, patches } = trophies({ booha_dev_session: '1' });
  assert.strictEqual(T.recordWorldVisit('grimmerglen'), false, 'no world visit is recorded in a console dev session');
  assert.deepStrictEqual(patches, [], 'nothing is written');
}
{
  const { T, patches } = trophies({});
  assert.strictEqual(T.recordWorldVisit('utsuroba'), true, 'normal visits are still recorded');
  assert.strictEqual(patches.length, 1, 'one write for a normal first visit');
}

console.log('Dev switch boundary tests passed.');
