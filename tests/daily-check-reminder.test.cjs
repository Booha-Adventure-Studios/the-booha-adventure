#!/usr/bin/env node
'use strict';

// Daily Check reminders (Nov 2026): the Daily Check is a daily routine. A
// student may skip it (never a gate), but a reminder stays on the hub, the
// maze and the games boards until today's check is done.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// 1. Hub: hidden only once the check is done.
const index = read('index.html');
assert.match(index, /if \(btn\) btn\.hidden = !window\.BOOHA_READY \|\| dailyCheckState\(\) === 'done';/,
  'the hub reminder stays for pending, skipped and failed');

// 2. Pages away from the hub load the reminder after its dependencies.
const PAGES = ['maze.html', 'curriculum/pb/games-index.html', 'curriculum/br/games-index.html', 'curriculum/bc/games-index.html'];
for (const page of PAGES) {
  const src = read(page);
  const order = ['js/sync-client.js', 'js/core/media-config.js', 'js/daily-check.js', 'js/ui/daily-check-reminder.js']
    .map((f) => src.indexOf(f));
  assert(order.every((i) => i >= 0), `${page} loads the reminder and its dependencies`);
  assert.deepStrictEqual([...order].sort((a, b) => a - b), order, `${page} loads them in dependency order`);
}

// Placement: top centre on iPads, bottom centre on phones (titles fill the top).
assert.match(read('js/ui/daily-check-reminder.js'), /@media \(max-width:600px\)\{#' \+ ID \+ '\{top:auto;bottom:calc\(14px \+ env\(safe-area-inset-bottom,0px\)\);\}\}/,
  'on phones the reminder moves to the bottom edge');

// 3. Runtime: the reminder follows todayState and opens the check in place.
const src = read('js/ui/daily-check-reminder.js');
function harness(state) {
  const els = {};
  const listeners = {};
  const runs = [];
  const document = {
    head: { appendChild(el) { els[el.id] = el; } },
    body: { appendChild(el) { els[el.id] = el; } },
    getElementById: (id) => els[id] || null,
    createElement: () => ({ hidden: false, style: {}, listeners: {}, addEventListener(t, f) { this.listeners[t] = f; } }),
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
  };
  const DC = {
    _state: state,
    todayState() { return this._state; },
    todaySummary() { return { done: this._state === 'done' }; },
    knownCurr: () => 'pb',
    run: (opts) => runs.push(opts),
  };
  const window = { BOOHA_READY: true, BoohaDailyCheck: DC, addEventListener() {} };
  const ctx = { window, document, Object };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { els, runs, DC, fire: (t) => (listeners[t] || []).forEach((f) => f()) };
}

for (const st of ['pending', 'skipped', 'failed']) {
  const h = harness(st);
  const chip = h.els.dcReminderChip;
  assert(chip && chip.hidden === false, `${st}: the reminder is shown`);
  chip.listeners.click();
  assert.strictEqual(h.runs.length, 1, `${st}: tapping opens the Daily Check in place`);
  assert.strictEqual(h.runs[0].mode, 'check', `${st}: a not-done day opens a real check, not a retake`);
  assert.strictEqual(h.runs[0].recordSkipOnCancel, false, `${st}: closing from a reminder is not recorded as a new skip`);
  assert.strictEqual(chip.hidden, true, `${st}: the reminder hides while the check is open`);
  h.DC._state = 'done';
  h.runs[0].onDone();
  assert.strictEqual(chip.hidden, true, `${st}: once done, the reminder is gone`);
}
{
  const h = harness('done');
  assert(!h.els.dcReminderChip || h.els.dcReminderChip.hidden, 'done: no reminder');
}
{
  const h = harness('skipped');
  h.runs.length = 0;
  h.els.dcReminderChip.listeners.click();
  h.runs[0].onCancel();
  assert.strictEqual(h.els.dcReminderChip.hidden, false, 'closing the check without finishing brings the reminder back');
}

console.log('Daily Check reminder passed: hub + maze + 3 games boards remind until done; opens the check in place; never a gate.');
