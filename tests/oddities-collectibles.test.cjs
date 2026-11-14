#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const dataSource = read('js/core/collectibles-data.js');
const system = read('js/core/collectible-system.js');
const renderer = read('js/ui/adventure-game.js');
const page = read('adventure-profile.html');

const context = { window: {} };
vm.runInNewContext(dataSource, context, { filename: 'collectibles-data.js' });
const items = context.window.BoohaCollectiblesData;

assert.ok(Array.isArray(items), 'collectible data must export an array');
assert.strictEqual(items.length, 12, 'the cabinet should start with 12 oddities');
assert.strictEqual(items.filter(item => item.pool === 'standard').length, 9, 'nine oddities should be standard rewards');
assert.strictEqual(items.filter(item => item.pool === 'special').length, 3, 'three oddities should be special rewards');
assert.strictEqual(new Set(items.map(item => item.id)).size, items.length, 'collectible ids must be unique');
assert.ok(!/\bweek\s*:/.test(dataSource), 'oddities must not be tied to curriculum weeks');

for (const item of items) {
  for (const field of ['id', 'name', 'material', 'pool', 'scale', 'asset', 'discovery', 'collection', 'storyHook',
    'nameJp', 'materialJp', 'discoveryJp', 'collectionJp', 'storyHookJp']) {
    assert.ok(item[field], `${item.id} must define ${field}`);
  }
  const assetPath = path.join(ROOT, item.asset);
  assert.ok(fs.existsSync(assetPath), `${item.id} asset must exist: ${item.asset}`);
  assert.ok(fs.statSync(assetPath).size <= 5 * 1024 * 1024, `${item.id} asset must stay within the image budget`);
}

assert.match(system, /window\.BoohaCollectiblesData/, 'the system must consume the shared collectible data');
assert.doesNotMatch(system, /booha_stamp_1|booha_stamp_2|secret_scroll/, 'the placeholder collectible list must be gone');
assert.match(system, /COLLECTIBLES\.filter\(c => !!found\[c\.id\]\)\.length/, 'found totals must count defined collectibles only');

const dataTag = '<script src="js/core/collectibles-data.js"></script>';
const systemTag = '<script src="js/core/collectible-system.js"></script>';
assert.ok(page.includes(dataTag) && page.includes(systemTag), 'profile must load both collectible modules');
assert.ok(page.indexOf(dataTag) < page.indexOf(systemTag), 'collectible data must load before the system');
assert.match(page, /id="adv-collectibles"/, 'profile must mount the oddities cabinet');
assert.match(page, /class="collectibles-section"/, 'profile must style the oddities as a separate section');

assert.match(renderer, /function renderCollectibles\(\)/, 'the adventure renderer must own the cabinet view');
assert.match(renderer, /system && system\.getAll/, 'the cabinet must use the collectible system');
assert.match(renderer, /loading="lazy" decoding="async"/, 'oddity art must load lazily');
assert.match(renderer, /booha:collectibleFound/, 'the cabinet must refresh after a collectible is found');
assert.ok(!/A strange thing is still waiting to be found/.test(renderer), 'unfound oddities are not shown as ??? slots');

console.log('Oddities collectible cabinet tests passed.');
