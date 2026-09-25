#!/usr/bin/env node
'use strict';

// The Maze seasonal-unlock controller is a real browser script now, so this
// test loads that script directly rather than extracting functions from the
// 3,000-line page with a second parser.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

function popupElement() {
  const classes = new Set();
  return {
    dataset: {},
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      contains(name) { return classes.has(name); },
    },
    querySelector() {
      return {
        textContent: '',
        querySelector() { return null; },
        appendChild() {},
        set innerHTML(_) {},
      };
    },
    setAttribute() {},
  };
}

function makeHarness(stored) {
  const popup = popupElement();
  const scrim = popupElement();
  const art = {};
  const adventure = {
    save: {
      load() { return stored; },
      save(next) { Object.assign(stored, next); return true; },
      patch(section, patch) {
        stored[section] = Object.assign(stored[section] || {}, patch);
        return true;
      },
    },
  };
  const context = {
    console,
    Date,
    window: {
      BoohaAdventure: adventure,
      CALENDAR: {
        getCurrentCurriculumWeek() {
          return { occurrenceKey: '2026-09-27|september-w4' };
        },
        getCurriculumWeekOccurrenceKey(week) { return week.occurrenceKey; },
      },
      setTimeout(callback) { callback(); },
      requestAnimationFrame(callback) { callback(); },
    },
    localStorage: { getItem() { return 'bc'; } },
    document: { dispatchEvent() {} },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
  };
  context.window.localStorage = context.localStorage;
  context.window.document = context.document;
  context.window.CustomEvent = context.CustomEvent;
  context.BoohaAdventure = adventure;
  context.CALENDAR = context.window.CALENDAR;
  vm.createContext(context);

  vm.runInContext(read('js/core/booha-skins.js'), context, { filename: 'js/core/booha-skins.js' });
  context.BoohaSkins = context.window.BoohaSkins;
  vm.runInContext(read('js/maze-seasonal-unlock.js'), context, { filename: 'js/maze-seasonal-unlock.js' });

  const controller = context.window.MazeSeasonalUnlock.create({
    calendar: context.window.CALENDAR,
    getCurrentWeek: () => context.window.CALENDAR.getCurrentCurriculumWeek(),
    storage: context.localStorage,
    skins: context.window.BoohaSkins,
    getSave: () => stored,
    applyEquippedMazeSkin() {},
    ui: { popup, scrim, art, equipButton: { setAttribute() {} } },
    requestAnimationFrame(callback) { callback(); },
    setTimeout(callback) { callback(); },
  });
  return { context, controller, popup, scrim, stored };
}

function baseSave(weekKey, weekly) {
  return {
    meta: { blitz: { weeklyKey: weekKey, weekly } },
    weekly: { unlockedBoohaSkins: {} },
  };
}

const currentKey = '2026-09-27|september-w4';
const completeBc = {
  vocab: { bc: { ms: 1000 } },
  sentences: { bc: { ms: 1000 } },
  questions: { bc: { ms: 1000 } },
};

// Positive: a complete trio in any one curriculum (BC here, while the
// student's last-selected curriculum is deliberately irrelevant).
const positive = makeHarness(baseSave(currentKey, completeBc));
assert.deepStrictEqual(positive.controller.readBlitzCompletionState().completedCurriculum, 'bc');
positive.controller.maybeShowSeasonalUnlockPopup();
assert.ok(positive.stored.weekly.unlockedBoohaSkins.mummington,
  'a complete trio in one curriculum must unlock Mummington');
assert.strictEqual(positive.popup.dataset.skinId, 'mummington');
assert.strictEqual(positive.popup.classList.contains('show'), true,
  'Maze must show the seasonal unlock popup');
assert.strictEqual(positive.scrim.classList.contains('show'), true,
  'Maze must show the seasonal popup scrim');

// Same page: the once-only guard prevents a second popup.
positive.controller.maybeShowSeasonalUnlockPopup();
assert.strictEqual(positive.popup.classList.contains('show'), true);

positive.controller.equipSeasonalFromUnlockPopup();
assert.strictEqual(positive.stored.meta.selectedBoohaSkin, 'mummington',
  'the popup equip path must select the scheduled character');
assert.strictEqual(positive.popup.classList.contains('show'), false,
  'equipping from the popup must close it');

// Reload: a fresh controller suppresses the announcement because the unlock
// was persisted in the weekly save.
const reloaded = makeHarness(positive.stored);
reloaded.controller.maybeShowSeasonalUnlockPopup();
assert.strictEqual(reloaded.popup.classList.contains('show'), false,
  'a reload must not show the same weekly popup again');

// Negative: a trio spread across curricula is not sufficient.
const mixed = makeHarness(baseSave(currentKey, {
  vocab: { pb: { ms: 1000 } },
  sentences: { br: { ms: 1000 } },
  questions: { pb: { ms: 1000 } },
}));
mixed.controller.maybeShowSeasonalUnlockPopup();
assert.deepStrictEqual(mixed.stored.weekly.unlockedBoohaSkins, {});
assert.strictEqual(mixed.popup.classList.contains('show'), false,
  'mixed curricula must not unlock a seasonal character');

// Negative: a trio from the previous occurrence is stale.
const stale = makeHarness(baseSave('2026-09-20|september-w3', completeBc));
stale.controller.maybeShowSeasonalUnlockPopup();
assert.deepStrictEqual(stale.stored.weekly.unlockedBoohaSkins, {});
assert.strictEqual(stale.popup.classList.contains('show'), false,
  'last week\'s trio must not unlock this week\'s character');

// Weekly reset clears the in-memory once-only state and keeps the old popup
// closed when the weekly save no longer contains the completed trio.
positive.stored.weekly = { unlockedBoohaSkins: {} };
positive.stored.meta.blitz.weekly = {};
positive.controller.reset();
positive.controller.maybeShowSeasonalUnlockPopup();
assert.strictEqual(positive.context.BoohaSkins.isUnlocked('mummington'), false);
assert.strictEqual(positive.popup.classList.contains('show'), false,
  'after Sunday reset the old seasonal popup must remain closed');

const mazeSource = read('maze.html');
assert.match(mazeSource, /js\/maze-seasonal-unlock\.js/, 'Maze must load the extracted unlock controller');
assert.doesNotMatch(mazeSource, /function readBlitzCompletionState\(/,
  'Maze must not keep the seasonal decision logic inline');
assert.match(mazeSource, /mazeSeasonalUnlock\.reset\(\)/,
  'Maze weekly reset must reset the extracted controller');
assert.match(mazeSource, /battyEquipButton\?\.addEventListener\('click', equipSeasonalFromUnlockPopup\)/,
  'the image equip button must use the extracted controller');

console.log('Maze seasonal-unlock integration passed: direct controller execution, curriculum/stale negatives, popup-once, reload, equip, and reset hold.');
