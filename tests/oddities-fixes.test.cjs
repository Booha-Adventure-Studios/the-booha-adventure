#!/usr/bin/env node
'use strict';

// Oddity fixes (Nov 2026):
//  1. Finds are never lost: draws are re-checked on every page load, and the
//     curriculum game boards (where the Daily Check also runs) load the draw
//     logic, so a 3rd or 7th check done there is evaluated straight away.
//  2. The earn toast is a mystery and the Karasuki pickup is the reveal: the
//     toast never names or shows the item; the pickup uses its discovery line.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// ── 1. Evaluation on load (behaviour) ────────────────────────────────────
function boot({ ready }) {
  const listeners = {};
  const events = [];
  let saved = null;
  const days = ['2026-11-08', '2026-11-09', '2026-11-10'];
  const store = {
    collectibles: {},
    meta: {
      checkIn: Object.fromEntries(days.map(d => [d, { st: 'done' }])),
      blitz: { weeklyKey: '2026-11-08|november-w2', weekly: {
        vocab: { pb: 1 }, sentences: { pb: 1 }, questions: { pb: 1 } } },
    },
  };
  const ctx = {
    console,
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    document: {
      addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
      dispatchEvent: ev => { events.push(ev.type); (listeners[ev.type] || []).forEach(fn => fn(ev)); return true; },
    },
    CALENDAR: {
      getCurrentCurriculumWeek: () => ({ weekStart: '2026-11-08', occurrenceKey: '2026-11-08|november-w2' }),
    },
    BoohaAdventure: {
      registerSystem() {},
      save: { load: () => JSON.parse(JSON.stringify(saved || store)), save: d => { saved = d; return true; } },
    },
    BOOHA_READY: ready,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('js/core/collectibles-data.js'), ctx, { filename: 'collectibles-data.js' });
  vm.runInContext(read('js/core/collectible-system.js'), ctx, { filename: 'collectible-system.js' });
  return { listeners, events, getSaved: () => saved };
}

// Page already identified when the script runs: evaluated immediately.
let run = boot({ ready: true });
assert.ok(run.events.includes('booha:collectibleEarned'), 'an earned-but-unrecorded find is awarded on page load');
assert.ok(run.getSaved().meta.findsLog['2026-11-08|november-w2'].standard, 'the load-time draw is saved');

// Page not identified yet: waits for booha:ready, then evaluates once.
run = boot({ ready: false });
assert.ok(!run.events.includes('booha:collectibleEarned'), 'nothing is evaluated before identity is ready');
assert.strictEqual((run.listeners['booha:ready'] || []).length, 1, 'evaluation waits for booha:ready');
run.listeners['booha:ready'][0]();
assert.ok(run.events.includes('booha:collectibleEarned'), 'the find is awarded once the student is identified');
const before = run.events.filter(e => e === 'booha:collectibleEarned').length;
run.listeners['booha:checkIn'][0]();
assert.strictEqual(run.events.filter(e => e === 'booha:collectibleEarned').length, before,
  're-evaluating the same week never awards the channel twice');

// The curriculum game boards run the Daily Check, so they load the draw logic.
for (const c of ['pb', 'br', 'bc']) {
  const html = read(`curriculum/${c}/games-index.html`);
  const data = html.indexOf('js/core/collectibles-data.js');
  const system = html.indexOf('js/core/collectible-system.js');
  const saveFile = html.indexOf('js/core/save-file.js');
  const daily = html.indexOf('js/daily-check.js');
  assert.ok(data > saveFile && system > data, `${c} games board loads the data, then the system, after save-file`);
  assert.ok(system < daily, `${c} games board loads the draw logic before the Daily Check`);
}

// ── 2. Mystery earn, reveal on pickup ─────────────────────────────────────
const toast = read('js/ui/medal-toast.js');
const enqueue = toast.slice(toast.indexOf('function enqueueFinds'), toast.indexOf('function pendingFindsFromSave'));
assert.ok(enqueue.length > 0, 'enqueueFinds is present');
assert.ok(!/\.name\b/.test(enqueue), 'the earn toast never uses an item name');
assert.ok(!/\.discovery\b/.test(enqueue), 'the earn toast never uses the discovery line');
assert.ok(/findAsset\(null\)/.test(enqueue), 'the earn toast never shows item art');
assert.ok(/からすきに ふしぎな ものが/.test(enqueue), 'the earn toast points the player to Karasuki, in Japanese too');

const karasuki = read('js/karasuki.js');
const pickup = karasuki.slice(karasuki.indexOf('function showOddityPickup'), karasuki.indexOf('function drawOddities'));
assert.ok(/item\.discovery/.test(pickup), 'the pickup reveals the item with its discovery line');
assert.ok(!/That's weird\.`/.test(pickup), 'the old generic pickup line is gone');

console.log('Oddity fixes tests passed.');
