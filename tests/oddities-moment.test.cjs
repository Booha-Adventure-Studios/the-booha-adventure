#!/usr/bin/env node
'use strict';

// Oddities feel like a find: Ambrose is the oddities' icon, picking one up in
// Karasuki opens a reveal that waits to be closed, and every oddity in the
// cabinet opens big so it can be admired and read.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const AMBROSE = 'assets/img/oddities/ambrose-book-glasses.webp';
assert.ok(fs.existsSync(path.join(ROOT, AMBROSE)), 'Ambrose art is in the repo');

// ── Karasuki: Ambrose on the clue, a real reveal on pickup ───────────────
const k = read('js/karasuki.js');
assert.ok(k.includes(`const AMBROSE_ART = '${AMBROSE}'`), 'Karasuki knows Ambrose');
const clue = k.slice(k.indexOf('function openOddityPopup'), k.indexOf('function maybeShowOddityPopup'));
assert.match(clue, /wpopSetIconImage\('oddity-pop', AMBROSE_ART, 'Ambrose', 'image-ambrose'\)/, 'the clue shows Ambrose, not an orb');
assert.ok(!/wpopSetIconOrb\('oddity-pop'/.test(clue), 'the old orb is gone');
const reveal = k.slice(k.indexOf('function showOddityPickup'), k.indexOf('function drawOddities'));
assert.match(reveal, /wpopMarkup\('oddity-reveal'\)/, 'the pickup opens a popup, not a passing toast');
assert.match(reveal, /wpopSetIconImage\('oddity-reveal', item\.asset, item\.name, 'image-oddity'\)/, 'the oddity itself is the picture');
assert.match(reveal, /item\.nameJp/, 'its Japanese name is shown');
assert.match(reveal, /adventure-profile\.html#adv-collectibles/, '"See my cabinet" goes straight to the cabinet');
assert.match(reveal, /Keep exploring/, 'or the student keeps exploring');
assert.ok(!/setTimeout\([^)]*classList\.remove\('show'\)/.test(reveal), 'it does not vanish on a timer');
assert.match(k, /showOddityPickup\(find\.item, !!result\.duplicate, result\.copies\)/, 'a duplicate shows its new count');
assert.ok(!/oddityPickupEl/.test(k), 'the old toast element is gone');
assert.match(k, /@media\(prefers-reduced-motion:reduce\)\{\.wpop-icon-wrap\.image-oddity::after,\.wpop-icon-wrap\.image-oddity\.arrive img\{animation:none;\}\}/, 'reduced motion: no spinning rays');
assert.match(k, /#oddity-pop-box \.wpop-eyebrow-jp,#oddity-reveal-box \.wpop-eyebrow-jp\{color:/, 'the small Japanese lines are readable on the dark popups');

// ── The earn notice: Ambrose, still never the item ───────────────────────
const toast = read('js/ui/medal-toast.js');
assert.match(toast, /if \(!src\) return ROOT \+ 'assets\/img\/oddities\/ambrose-book-glasses\.webp';/, 'the "something strange appeared" notice shows Ambrose');

// ── Cabinet: Ambrose by the title, every oddity opens big ────────────────
const host = { innerHTML: '', querySelectorAll: () => [] };
const items = [];
vm.runInNewContext(read('js/core/collectibles-data.js'), { window: { get BoohaCollectiblesData() { return undefined; }, set BoohaCollectiblesData(v) { items.push(...v); } } });
const ctx = {
  console,
  document: { getElementById: id => (id === 'adv-collectibles' ? host : null), addEventListener() {} },
  BoohaCollectibleSystem: { getAll: () => items.map((i, n) => ({ ...i, found: n < 2, foundAt: n < 2 ? n + 1 : null, copies: n < 2 ? 1 : 0 })) },
  BoohaAdventure: { save: { load: () => ({}) } },
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(read('js/ui/adventure-game.js'), ctx);
ctx.window.BoohaAdventureGame.render();
const html = host.innerHTML;
assert.ok(html.includes(`class="collectible-keeper" src="${AMBROSE}"`), 'Ambrose sits by the cabinet title');
assert.ok(html.includes(`data-oddity="${items[0].id}"`) && /<button type="button" class="collectible-art"/.test(html), 'each oddity picture is a button');
assert.ok(html.includes(`data-oddity-card="${items[1].id}"`) && /collectible-card found[^"]* newest/.test(html), 'the newest find is marked');
const game = read('js/ui/adventure-game.js');
assert.match(game, /function openOddityLook\(id, from\)/, 'a close-up view exists');
assert.match(game, /event\.key === 'Escape'\) closeOddityLook\(\)/, 'Escape closes it');
assert.match(game, /role', 'dialog'/, 'it is a dialog');
const look = game.slice(game.indexOf('function openOddityLook'), game.indexOf('document.addEventListener(\'click\''));
for (const f of ['item.asset', 'item.name', 'item.nameJp', 'item.material', 'item.collection', 'item.collectionJp', 'item.storyHook']) assert.ok(look.includes(f), `the close-up shows ${f}`);
assert.match(game, /hash === '#adv-collectibles'/, 'arriving from Karasuki scrolls to the cabinet');
const page = read('adventure-profile.html');
assert.match(page, /\.oddity-look \{ position:fixed;/, 'close-up styles are on the profile page');
assert.match(page, /\.adv-head > \.collectible-head \{ flex-direction:row;/, 'Ambrose sits beside the title, not above it');

console.log('Oddities moment passed: Ambrose on the clue, notice and cabinet; a reveal on pickup; every oddity opens big.');
