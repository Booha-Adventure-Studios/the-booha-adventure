#!/usr/bin/env node
'use strict';

// Oddities in Japanese (Nov 2026): every oddity has a Japanese twin for each
// English line, shown in the cabinet and the Karasuki pickup. The storyHook
// is a tap-to-open "ひみつ" secret on each cabinet card.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const dataCtx = { window: {} };
vm.runInNewContext(read('js/core/collectibles-data.js'), dataCtx);
const items = dataCtx.window.BoohaCollectiblesData;
const JP = /[぀-ヿ]/;
for (const item of items) {
  for (const key of ['nameJp', 'materialJp', 'discoveryJp', 'collectionJp', 'storyHookJp']) {
    assert.ok(typeof item[key] === 'string' && JP.test(item[key]), `${item.id} needs Japanese ${key}`);
    assert.ok(!/—/.test(item[key]), `${item.id} ${key} must not use em dashes`);
  }
}

// Cabinet: bilingual card with a closed-by-default secret.
const host = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
const ctx = {
  console, localStorage: { getItem: () => null },
  document: { getElementById: id => (id === 'adv-collectibles' ? host : null), addEventListener() {} },
  BoohaCollectibleSystem: { getAll: () => items.map((i, n) => ({ ...i, found: n === 0, copies: n === 0 ? 1 : 0 })) },
  BoohaAdventure: { save: { load: () => ({}) } },
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(read('js/ui/adventure-game.js'), ctx);
ctx.window.BoohaAdventureGame.render();
const first = items[0];
const html = host.innerHTML;
assert.ok(html.includes(first.nameJp), 'the cabinet shows the Japanese name');
assert.ok(html.includes(first.collectionJp), 'the cabinet shows the Japanese description');
assert.ok(html.includes(first.materialJp), 'the cabinet shows the Japanese material');
assert.ok(/<details class="collectible-secret"><summary>✦ ひみつ · A secret<\/summary>/.test(html), 'the story hook is a tap-to-open secret');
assert.ok(!/<details class="collectible-secret" open/.test(html), 'the secret starts closed');
assert.ok(html.includes(first.storyHook) && html.includes(first.storyHookJp), 'the secret holds the story hook in both languages');
assert.ok(!html.includes(items[1].nameJp), 'unowned items stay hidden in Japanese too');

// Karasuki pickup: English and Japanese lines.
const karasuki = read('js/karasuki.js');
const pickup = karasuki.slice(karasuki.indexOf('function showOddityPickup'), karasuki.indexOf('function drawOddities'));
assert.ok(/item\.discoveryJp/.test(pickup), 'the pickup shows the Japanese discovery line');
assert.ok(/oddity-pickup-jp/.test(pickup), 'the Japanese line has its own style');
assert.ok(/もう ひとつ！/.test(pickup), 'a duplicate pickup says "another one" in Japanese');

console.log('Oddities Japanese tests passed.');
