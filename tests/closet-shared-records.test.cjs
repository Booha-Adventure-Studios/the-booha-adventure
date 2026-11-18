#!/usr/bin/env node
'use strict';

// One closet rule (BoohaSkins.closetStates) for My Adventure and the Blitz
// Records collection. With the real seasons: missed past-week skins are not
// shown, a season with nothing collected and nothing left has no block,
// collected skins and this week stay, and a future season is a preview.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Wed Nov 18 2026: Christmas week 3 (Gnasher). The student collected
// Crumbly (week 2) only; missed Thumpkin (week 1) and all of Halloween.
const today = '2026-11-18';
const cal = { window: {}, Intl, Date, console };
vm.createContext(cal);
vm.runInContext(read('js/calendar.js'), cal);
const CALENDAR = cal.window.CALENDAR;
const save = { meta: { boohaSkinCollection: { 'christmas-2026:crumbly': { unlockedAt: 1, seasonId: 'christmas-2026' } } }, weekly: {} };
const ctx = {
  window: {
    CALENDAR: Object.assign({}, CALENDAR, {
      getTodayKey: () => today,
      getCurrentCurriculumWeek: () => CALENDAR.getCurrentCurriculumWeek(new Date(`${today}T12:00:00+09:00`)),
    }),
    BoohaAdventure: { save: { load: () => JSON.parse(JSON.stringify(save)), save: () => true } },
  },
  Intl, Date, console,
};
ctx.window.window = ctx.window;
ctx.BoohaAdventure = ctx.window.BoohaAdventure;
ctx.CALENDAR = ctx.window.CALENDAR;
vm.createContext(ctx);
vm.runInContext(read('js/core/booha-skins.js'), ctx, { filename: 'js/core/booha-skins.js' });
const S = ctx.window.BoohaSkins;

const shelves = JSON.parse(JSON.stringify(S.closetStates(S)));
const byId = Object.fromEntries(shelves.map(shelf => [shelf.season.id, shelf]));

assert.strictEqual(byId['halloween-2026'].skins.length, 0, 'Halloween: all missed, nothing to show');
const xmas = byId['christmas-2026'];
const states = Object.fromEntries(xmas.skins.map(s => [s.id, s.state]));
assert.strictEqual(states.thumpkin, undefined, 'missed Thumpkin is not shown');
assert.strictEqual(states.crumbly, 'owned');
assert.strictEqual(states.gnasher, 'thisweek');
['waddlesworth', 'snaggle', 'tinkerplunk', 'oats', 'quillock'].forEach(id =>
  assert.strictEqual(states[id], 'soon', `${id} is still ahead`));
const winter = byId['japan-winter-2027'];
assert.strictEqual(winter.started, false, 'winter is a preview');
assert.strictEqual(winter.skins.length, 8);

// Records: uses the shared rule, drops empty seasons, never unlocks while drawing.
const engine = read('js/blitz-engine.js');
assert.match(engine, /S\.closetStates\(S\)\.filter\(shelf => shelf\.skins\.length/);
const render = engine.slice(engine.indexOf('function renderRecordsPanel('), engine.indexOf('function openRecordsPanel('));
assert.doesNotMatch(render, /\.unlock\?\.\(/, 'drawing the Records panel must not write to the save');
assert.doesNotMatch(render, /season\.characterIds/, 'Records must not list every season character');
const open = engine.slice(engine.indexOf('function openRecordsPanel('));
assert.match(open, /S\.unlock\?\.\(id\)/, 'the old-clear repair runs once when Records opens');

// My Adventure: same rule.
assert.match(read('js/ui/adventure-game.js'), /S\.closetStates\(S, \{ today: todayKey\(\), weekStart: weekKey\(\)\.start \}\)/);

console.log('Shared closet passed: missed skins hidden on both screens, empty seasons dropped, winter previewed, Records draws without saving.');
