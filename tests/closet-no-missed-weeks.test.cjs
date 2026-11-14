#!/usr/bin/env node
'use strict';

// Closet Pass (Nov 2026): no player ever sees weeks they missed.
//   - past weekly skins the player did not earn are hidden, not locked
//   - earned past skins, this week's skin and future "coming soon" skins stay
//   - a started season with nothing left to show gets no shelf
//   - every count and the collection ring use only the visible set
//   - the closet text never talks about missed skins
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FILE = 'js/ui/adventure-game.js';
const source = fs.readFileSync(path.join(ROOT, FILE), 'utf8');

const skin = (id) => ({ id, name: `${id} Booha`, assets: { maze: `m/${id}.webp`, static: `s/${id}.webp` } });
const SEASONS = {
  'autumn-test': { id: 'autumn-test', name: 'Autumn Test', themeId: 'autumn', startDate: '2026-08-30',
    weeklyCharacterIds: { '2026-08-30': 'leaf', '2026-09-06': 'acorn' } },
  'halloween-2026': { id: 'halloween-2026', name: 'Halloween', themeId: 'halloween', startDate: '2026-09-27',
    weeklyCharacterIds: { '2026-09-27': 'missedA', '2026-10-04': 'earned', '2026-10-11': 'missedB',
      '2026-10-18': 'current', '2026-10-25': 'later1', '2026-11-01': 'later2' } },
  'christmas-2026': { id: 'christmas-2026', name: 'Christmas', themeId: 'christmas', startDate: '2026-11-29',
    weeklyCharacterIds: { '2026-11-29': 'snowA', '2026-12-06': 'snowB' } },
};
const CHARS = {
  'autumn-test': ['leaf', 'acorn'],
  'halloween-2026': ['missedA', 'earned', 'missedB', 'current', 'later1', 'later2'],
  'christmas-2026': ['snowA', 'snowB'],
};
const COLLECTED = new Set(['earned']);

function makeHost() {
  return { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
}
const hosts = { 'adv-score': makeHost(), 'adv-closet': makeHost(), 'adv-travelers': makeHost(), 'adv-title': makeHost() };

const ctx = {
  console,
  localStorage: { getItem: () => null, setItem() {} },
  document: { getElementById: id => hosts[id] || null, addEventListener() {} },
  CALENDAR: {
    getTodayKey: () => '2026-10-20',
    getCurrentCurriculumWeek: () => ({ weekStart: '2026-10-18', occurrenceKey: '2026-10-18|october-w3' }),
  },
  BoohaSkins: {
    SEASONS,
    seasonCharacters: id => (CHARS[id] || []).map(skin),
    rotationCharacterId: id => (id === 'halloween-2026' ? 'current' : null),
    isCollected: id => COLLECTED.has(id),
    isUnlocked: () => false,
    selectedId: () => null,
    get: () => null,
    equip: () => false,
  },
  BoohaAdventure: { save: { load: () => ({ meta: {} }) } },
  KARASUKI_WANDERER_DATA: {},
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(source, ctx, { filename: FILE });

const game = ctx.window.BoohaAdventureGame;
const closet = game._test.skinStates({ meta: {} });
const byId = Object.fromEntries(closet.map(c => [c.season.id, c]));

// Hidden, not locked.
closet.forEach(c => c.skins.forEach(s => assert.notStrictEqual(s.state, 'missed', `${s.id} must not be shown as missed`)));
assert.deepStrictEqual(byId['halloween-2026'].skins.map(s => s.id).sort(), ['current', 'earned', 'later1', 'later2'],
  'Halloween keeps the earned past skin, this week and the future skins only');
assert.strictEqual(byId['halloween-2026'].skins.find(s => s.id === 'earned').state, 'owned', 'earned past skins stay');
assert.strictEqual(byId['halloween-2026'].skins.find(s => s.id === 'current').state, 'thisweek', "this week's silhouette stays");
assert.deepStrictEqual(byId['autumn-test'].skins, [], 'a season of only missed skins has nothing to show');
assert.strictEqual(byId['christmas-2026'].skins.length, 2, 'future seasons still preview their skins');

// Rendered closet and collection ring.
game.render();
const html = hosts['adv-closet'].innerHTML;
assert.ok(!html.includes('ロック'), 'no locked tags');
assert.ok(!/closet-skin missed/.test(html), 'no missed skin cards');
assert.ok(!html.includes('みのがした'), 'the closet never mentions missed skins');
assert.ok(!html.includes('m/missedA.webp') && !html.includes('m/missedB.webp'), 'missed skin art is not drawn');
assert.ok(!html.includes('Autumn Test'), 'an all-missed season gets no shelf');
assert.ok(html.includes('こんしゅう！'), "this week's skin is still marked");
assert.ok(html.includes('m/later1.webp'), 'coming-soon skins are still shown');
assert.ok(/<b class="adv-head-num pink">1\/6<\/b>/.test(html), 'closet total counts only visible skins (1 of 6)');
assert.ok(/<b>1 \/ 4<\/b>/.test(html), 'Halloween shelf counts only its visible skins (1 / 4)');

const score = hosts['adv-score'].innerHTML;
assert.ok(/<span>スキン<\/span><b>1\/6<\/b>/.test(score), 'collection row counts only visible skins');
assert.ok(score.includes('--pct:17%'), 'collection ring is computed from the visible set (1 of 6 = 17%)');

console.log('Closet no-missed-weeks tests passed.');
