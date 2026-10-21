#!/usr/bin/env node
'use strict';

// Adventure profile "Candy Moon Arcade" redesign: friendship hearts, the
// Akiya arcade cabinet, visible-but-locked world portals and the skin closet.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

function load(file, extra = {}) {
  const listeners = [];
  const document = { addEventListener: (...args) => listeners.push(args), getElementById: () => null, querySelectorAll: () => [] };
  const window = Object.assign({ document }, extra);
  const context = vm.createContext(Object.assign({ window, document, console }, extra));
  window.window = window;
  vm.runInContext(read(file), context, { filename: file });
  return context.window;
}

// Hearts are harder to earn: 3, 8 and 15 visits.
const atlas = load('js/ui/adventure-collection.js').BoohaWandererAtlas._test;
assert.deepStrictEqual(Array.from(atlas.HEART_STEPS), [3, 8, 15]);
assert.deepStrictEqual([1, 2, 3, 7, 8, 14, 15, 40].map(atlas.hearts), [0, 0, 1, 1, 2, 2, 3, 3]);
assert.strictEqual(atlas.nextHeartAt(1), 3);
assert.strictEqual(atlas.nextHeartAt(8), 15);
assert.strictEqual(atlas.nextHeartAt(15), null);

// The Family Room is called Akiya and uses the flashlight art.
const bonus = load('js/ui/bonus-games.js').BoohaBonusGames.META;
assert.strictEqual(bonus.family_room.label, 'AKIYA');
assert.strictEqual(bonus.family_room.name, 'Akiya');
assert.strictEqual(bonus.family_room.icon, 'assets/img/family-room/flashlight.webp');
assert.ok(fs.existsSync(path.join(ROOT, bonus.family_room.icon)), 'the flashlight art must exist');
Object.values(bonus).forEach(meta => assert.ok(fs.existsSync(path.join(ROOT, meta.icon)), `${meta.label} art must exist`));

// World portals stay visible: locked ones lose their link, open ones get it back.
const { BoohaPortals } = load('js/ui/world-portals.js');
function fakeLink(href) {
  const attrs = { href, 'data-label': 'MUENBA' };
  const classes = new Set();
  const small = { textContent: 'MUENBA', dataset: {} };
  return {
    hidden: true, dataset: {}, attrs,
    getAttribute: k => (k in attrs ? attrs[k] : null),
    setAttribute: (k, v) => { attrs[k] = String(v); },
    removeAttribute: k => { delete attrs[k]; },
    querySelector: () => small,
    classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: c => classes.has(c) },
    small,
  };
}
const link = fakeLink('muenba-profile.html');
BoohaPortals.setLocked(link, true);
assert.strictEqual(link.hidden, false, 'locked portals stay visible');
assert.ok(link.classList.contains('is-locked'));
assert.strictEqual(link.getAttribute('href'), null, 'locked portals cannot be followed');
assert.strictEqual(link.getAttribute('aria-disabled'), 'true');
assert.strictEqual(link.small.textContent, 'LOCKED');
BoohaPortals.setLocked(link, false);
assert.ok(!link.classList.contains('is-locked'));
assert.strictEqual(link.getAttribute('href'), 'muenba-profile.html', 'opening restores the link');
assert.strictEqual(link.getAttribute('aria-disabled'), null);
assert.strictEqual(link.small.textContent, 'MUENBA');

// Both portal rows list all five worlds and load the shared lock helper.
for (const page of ['profile.html', 'adventure-profile.html']) {
  const source = read(page);
  ['profile.html', 'adventure-profile.html', 'utsuroba-profile.html', 'muenba-profile.html', 'grimmerglen-profile.html']
    .forEach(href => assert.ok(source.includes(`href="${href}"`), `${page} must show the ${href} portal`));
  assert.ok(source.includes('js/ui/world-portals.js'), `${page} must load world-portals.js`);
  assert.ok(source.includes('.profile-network a.is-locked'), `${page} must style locked portals`);
}

// Skin closet: missed weekly skins are gone for good; only this week's skin can be worn.
const game = read('js/ui/adventure-game.js');
assert.match(game, /missed: 'ロック'/, 'missed skins should read as locked forever');
assert.match(game, /みのがした スキンは もう もどって こないよ/, 'the closet should explain missed skins do not return');
assert.match(game, /BoohaSkins\.equip/, 'the wear button should use the shared equip rule');
const advPage = read('adventure-profile.html');
['js/core/booha-skins.js', 'js/core/traveler-record.js', 'js/ui/adventure-game.js']
  .forEach(src => assert.ok(advPage.includes(src), `adventure-profile.html must load ${src}`));
assert.ok(!advPage.includes('Booha Ghost'), 'Akiya must not use the Booha Ghost label');

console.log('Adventure profile redesign tests passed.');
