#!/usr/bin/env node
'use strict';

// Seasonal Karasuki visitors are recorded under their own traveler id, both
// Travelers lists know Grubb and Marshy, and old saves where Grubb was
// recorded as "barba" (Nov 1 to Nov 15 2026) read back correctly.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// Karasuki records the tapped visitor's kind, never a hard-coded "barba".
const karasuki = read('js/karasuki.js');
assert.doesNotMatch(karasuki, /BoohaTravelers\.record\('barba'/,
  'Karasuki must not record every seasonal visitor as Barba');
assert.match(karasuki, /BoohaTravelers\.record\(config\?\.kind \|\| 'barba'/,
  'Karasuki must record the visitor that was tapped');

// Every seasonal Karasuki visitor has a Travelers entry in both profiles.
const skinsContext = { window: { BoohaAdventure: { save: { load() { return {}; } } } }, Intl, Date, console };
skinsContext.window.window = skinsContext.window;
vm.createContext(skinsContext);
vm.runInContext(read('js/core/booha-skins.js'), skinsContext, { filename: 'js/core/booha-skins.js' });
const skins = skinsContext.window.BoohaSkins;
const visitors = ['halloween-2026', 'christmas-2026', 'japan-winter-2027']
  .map(id => ({ seasonId: id, visit: skins.seasonalKarasuki(id) }));
['js/ui/adventure-game.js', 'js/ui/profile-game.js'].forEach(file => {
  const source = read(file);
  visitors.forEach(({ seasonId, visit }) => {
    assert.ok(visit && visit.kind, `${seasonId} needs a Karasuki visitor`);
    const entry = new RegExp(`id: '${visit.kind}'[^}]*seasonId: '${seasonId}'`);
    assert.match(source, entry, `${file} must list ${visit.kind} for ${seasonId}`);
  });
});
visitors.forEach(({ visit }) => {
  assert.ok(fs.existsSync(path.join(ROOT, visit.asset)), `${visit.kind} traveler art must exist`);
});

// Read-time repair of the old mis-recorded saves.
function travelersFrom(stored) {
  const saved = { collection: { travelers: stored } };
  const before = JSON.stringify(saved);
  const ctx = { window: { BoohaAdventure: { save: { load() { return JSON.parse(before); }, save() { return true; } } } }, console };
  ctx.window.window = ctx.window;
  ctx.BoohaAdventure = ctx.window.BoohaAdventure;
  vm.createContext(ctx);
  vm.runInContext(read('js/core/traveler-record.js'), ctx, { filename: 'js/core/traveler-record.js' });
  return JSON.parse(JSON.stringify(ctx.window.BoohaTravelers.all()));
}
const nov5 = Date.parse('2026-11-05T10:00:00+09:00');
const nov12 = Date.parse('2026-11-12T10:00:00+09:00');
const oct20 = Date.parse('2026-10-20T10:00:00+09:00');

// Only ever met Grubb: shown as Grubb, not Barba.
let t = travelersFrom({ barba: { id: 'barba', visits: 3, firstMetAt: nov5, lastMetAt: nov12, seasonId: 'christmas-2026' } });
assert.strictEqual(t.barba, undefined);
assert.deepStrictEqual(t.grubb, { id: 'grubb', visits: 3, firstMetAt: nov5, lastMetAt: nov12, seasonId: 'christmas-2026' });

// Grubb taps before and after the fix are added together.
t = travelersFrom({
  barba: { id: 'barba', visits: 2, firstMetAt: nov5, lastMetAt: nov5, seasonId: 'christmas-2026' },
  grubb: { id: 'grubb', visits: 4, firstMetAt: nov12, lastMetAt: nov12, seasonId: 'christmas-2026' },
});
assert.strictEqual(t.barba, undefined);
assert.strictEqual(t.grubb.visits, 6);
assert.strictEqual(t.grubb.firstMetAt, nov5);
assert.strictEqual(t.grubb.lastMetAt, nov12);

// Real Halloween Barba keeps Halloween.
t = travelersFrom({ barba: { id: 'barba', visits: 5, firstMetAt: oct20, lastMetAt: nov12, seasonId: 'christmas-2026' } });
assert.strictEqual(t.barba.seasonId, 'halloween-2026');
assert.strictEqual(t.barba.visits, 5);
assert.strictEqual(t.grubb, undefined);

// Correct records pass through untouched.
const clean = { nuppi: { id: 'nuppi', visits: 1, firstMetAt: oct20, lastMetAt: oct20, seasonId: null },
  barba: { id: 'barba', visits: 2, firstMetAt: oct20, lastMetAt: oct20, seasonId: 'halloween-2026' } };
assert.deepStrictEqual(travelersFrom(clean), clean);

console.log('Seasonal traveler records passed: visitors recorded by kind, Grubb and Marshy listed, old Grubb-as-Barba saves repaired at read time.');
