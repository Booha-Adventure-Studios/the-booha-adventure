#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const dataSource = read('js/core/collectibles-data.js');
const systemSource = read('js/core/collectible-system.js');
const karasuki = read('js/karasuki.js');
const page = read('karasuki.html');

function harness() {
  const listeners = {};
  const saveData = {
    meta: { findsLog: {
      '2026-11-08|november-w2': {
        standard: { itemId: 'apothecary-balance-scale', earnedAt: 1, foundAt: null },
        special: null,
      },
    } },
    collectibles: {},
  };
  const document = {
    addEventListener(type, listener) { (listeners[type] ||= []).push(listener); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach(listener => listener(event)); return true; },
  };
  const save = {
    load: () => saveData,
    save: data => { Object.assign(saveData, data); return true; },
  };
  const systems = {};
  const adventure = { save, registerSystem(name, api) { systems[name] = api; }, stats: null, unlocks: null };
  const context = {
    window: { BoohaAdventure: adventure }, BoohaAdventure: adventure, document,
    CustomEvent: class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    console, Date, Math, Number, Object, Set,
  };
  vm.runInNewContext(dataSource, context, { filename: 'collectibles-data.js' });
  vm.runInNewContext(systemSource, context, { filename: 'collectible-system.js' });
  return { api: context.window.BoohaCollectibleSystem, data: saveData };
}

const h = harness();
const [pending] = h.api.pendingFinds();
assert.strictEqual(pending.item.id, 'apothecary-balance-scale', 'an earned, uncollected item should be pending');
assert.strictEqual(h.api.recordPlacement(pending.item.id, { room: 'room_07', x: 412.4, y: 633.8 }), true, 'a valid placement should save');
assert.deepStrictEqual(h.data.meta.findsLog['2026-11-08|november-w2'].standard, {
  itemId: 'apothecary-balance-scale', earnedAt: 1, foundAt: null,
  room: 'room_07', x: 412, y: 634, placedAt: h.data.meta.findsLog['2026-11-08|november-w2'].standard.placedAt,
}, 'the placement should be rounded and persisted beside the draw');
assert.strictEqual(h.api.recordPlacement(pending.item.id, { room: 'room_02', x: 1, y: 1 }), false, 'a placed item must not move on reload');
assert.strictEqual(h.api.collect(pending.item.id).saveFailed, undefined, 'the placed item should still be collectable');
assert.strictEqual(h.api.pendingFinds().length, 0, 'a picked-up item should leave the pending list');

assert.match(karasuki, /function refreshOddityFinds\(\)/, 'Karasuki should load pending finds');
assert.match(karasuki, /function oddityPlacementFor\(find, index, used\)/, 'placement should be deterministic and collision-aware');
assert.match(karasuki, /generateOrbPosition\(roomId, rng\)/, 'oddities should reuse the safe room-position generator');
assert.match(karasuki, /function drawOddities\(now\)/, 'Karasuki should render the oddity art and glint');
assert.match(karasuki, /function clickCheckOddities\(worldX, worldY\)/, 'oddities should have a canvas hit target');
assert.match(karasuki, /oddityPickupEl\.textContent = item\.discovery/, 'pickup should reveal the oddity with its discovery line');
assert.ok(page.indexOf('js/core/collectibles-data.js') < page.indexOf('js/core/collectible-system.js'), 'Karasuki must load data before the system');
assert.ok(page.indexOf('js/core/collectible-system.js') < page.indexOf('js/karasuki.js'), 'Karasuki must load the system before the world');
const pagesCache = Number((read('sw.js').match(/booha-pages-2026-(\d+)/) || [])[1]);
assert.ok(pagesCache >= 546, 'the Karasuki page cache must be bumped (546 or later)');

console.log('Oddities placement and pickup tests passed.');
