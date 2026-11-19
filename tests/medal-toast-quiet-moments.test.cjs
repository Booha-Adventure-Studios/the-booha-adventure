#!/usr/bin/env node
'use strict';

// Toast quiet moments (Nov 2026): medal, level-up and oddity toasts wait
// while the Maze arrival card, the Maze weekly companion popup, the profile's
// "week sealed" celebration, or a playing video owns the screen. They still
// appear on game results and the Daily Check result, as designed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/ui/medal-toast.js'), 'utf8');
const fnSrc = src.slice(src.indexOf('  function showing_(el)'), src.indexOf('  function playSound('));
assert.ok(fnSrc.includes('function busy()'), 'busy() is present');

function el({ classes = [], hidden = false, rects = 1, paused = true, ended = false, children = {} } = {}) {
  const set = new Set(classes);
  return {
    hidden, paused, ended,
    classList: { contains: c => set.has(c) },
    getClientRects: () => ({ length: rects }),
    querySelector: sel => children[sel] || null,
  };
}
function makeBusy({ byId = {}, query = {}, videos = [], body = [], root = [] } = {}) {
  const document = {
    body: el({ classes: body }),
    documentElement: el({ classes: root }),
    getElementById: id => byId[id] || null,
    querySelector: sel => query[sel] || null,
    querySelectorAll: sel => (sel === 'video' ? videos : []),
  };
  const ctx = { document };
  vm.createContext(ctx);
  vm.runInContext(`${fnSrc}\nthis.busy = busy;`, ctx);
  return ctx.busy;
}

assert.strictEqual(makeBusy()(), false, 'a quiet page lets toasts through');

// Maze arrival card
assert.strictEqual(makeBusy({ byId: { overlay1: el() } })(), true, 'waits while the Maze arrival card is showing');
assert.strictEqual(makeBusy({ byId: { overlay1: el({ classes: ['hidden'] }) } })(), false, 'goes once the arrival card is leaving');
assert.strictEqual(makeBusy({ byId: { overlay1: el({ classes: ['hidden', 'gone'] }) } })(), false, 'goes once the arrival card is gone');

// Maze weekly companion popup
assert.strictEqual(makeBusy({ byId: { seasonalUnlockPopup: el({ classes: ['show'] }) } })(), true, 'waits while the companion popup shows');
assert.strictEqual(makeBusy({ byId: { seasonalUnlockPopup: el() } })(), false, 'a closed companion popup does not block');

// Week sealed
assert.strictEqual(makeBusy({ query: { '.pg-sealed-card': el() } })(), true, 'waits while the week-sealed celebration is open');
assert.strictEqual(makeBusy({ query: { '.pg-sealed-card': el({ rects: 0 }) } })(), false, 'a closed week-sealed card does not block');

// Videos
assert.strictEqual(makeBusy({ videos: [el({ paused: false })] })(), true, 'waits while a video plays');
assert.strictEqual(makeBusy({ videos: [el({ paused: true }), el({ paused: false, ended: true })] })(), false, 'paused or finished videos do not block');

// Existing rules still hold, and results screens are not blocked.
assert.strictEqual(makeBusy({ body: ['blitz-active'] })(), true, 'still waits during a Blitz run');
assert.strictEqual(makeBusy({ root: ['scene-start'] })(), true, 'still waits during the hub intro');
const dcAsking = el({ children: {} });
const dcResult = el({ children: { '.dc-result-score': el() } });
assert.strictEqual(makeBusy({ query: { '.dc-root': dcAsking } })(), true, 'still waits during Daily Check questions');
assert.strictEqual(makeBusy({ query: { '.dc-root': dcResult } })(), false, 'still shows on the Daily Check result');
assert.ok(!/\[aria-modal="true"\]/.test(fnSrc), 'no blanket dialog rule (game results and the Daily Check result must still show toasts)');

console.log('Medal toast quiet-moment tests passed.');
