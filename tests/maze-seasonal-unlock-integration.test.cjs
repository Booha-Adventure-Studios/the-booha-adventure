#!/usr/bin/env node
'use strict';

// Maze seasonal-unlock integration contract. The production decision and
// popup path live in maze.html's inline script, so this test evaluates those
// exact functions with an isolated DOM/save harness instead of duplicating
// the rules in a second implementation.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const mazeSource = read('maze.html');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `maze.html must define ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

function extractSeasonalCopy(source) {
  const start = source.indexOf('const SEASONAL_UNLOCK_COPY = ');
  assert(start >= 0, 'maze.html must define seasonal unlock copy');
  const objectStart = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = objectStart; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}' && --depth === 0) {
      return source.slice(start, i + 2); // include the closing `);`
    }
  }
  throw new Error('Could not extract SEASONAL_UNLOCK_COPY');
}

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
    document: { dispatchEvent() {} },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    requestAnimationFrame(callback) { callback(); },
    window: {
      BoohaAdventure: adventure,
      CALENDAR: {
        getCurrentCurriculumWeek() {
          return { occurrenceKey: '2026-09-27|september-w4' };
        },
        getCurriculumWeekOccurrenceKey(week) { return week.occurrenceKey; },
      },
      setTimeout(callback) { callback(); },
    },
    CALENDAR: null,
    BoohaAdventure: adventure,
    localStorage: { getItem() { return 'bc'; } },
    battyUnlockPopupShown: false,
    seasonalUnlockId: null,
    battyUnlockPopup: popup,
    battyUnlockScrim: scrim,
    battyEquipButton: { querySelector() { return art; }, setAttribute() {} },
    battyEquipTextButton: null,
    battyUnlockArt: art,
    applyEquippedMazeSkin() {},
  };
  context.CALENDAR = context.window.CALENDAR;
  // maze.html calls this page-global rather than CALENDAR directly.
  context.getCurrentCurriculumWeek = () => context.CALENDAR.getCurrentCurriculumWeek();
  vm.createContext(context);

  vm.runInContext(read('js/core/booha-skins.js'), context, { filename: 'js/core/booha-skins.js' });
  context.BoohaSkins = context.window.BoohaSkins;

  const functions = [
    'currentBlitzCurriculum',
    'readBlitzCompletionState',
    'blitzTripleCompleteForAnyCurriculum',
    'closeSeasonalUnlockPopup',
    'prepareSeasonalUnlockPopup',
    'equipSeasonalFromUnlockPopup',
    'maybeShowSeasonalUnlockPopup',
  ].map(name => extractFunction(mazeSource, name)).join('\n');
  vm.runInContext(`${extractSeasonalCopy(mazeSource)}\n${functions}`, context, { filename: 'maze-seasonal-inline-harness.js' });
  return { context, popup, scrim, stored };
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
positive.context.maybeShowSeasonalUnlockPopup();
assert.ok(positive.stored.weekly.unlockedBoohaSkins.mummington,
  'a complete trio in one curriculum must unlock Mummington');
assert.strictEqual(positive.popup.dataset.skinId, 'mummington');
assert.strictEqual(positive.popup.classList.contains('show'), true,
  'Maze must show the seasonal unlock popup');
assert.strictEqual(positive.scrim.classList.contains('show'), true,
  'Maze must show the seasonal popup scrim');

// Same page: the once-only guard prevents a second popup.
positive.context.maybeShowSeasonalUnlockPopup();
assert.strictEqual(positive.popup.classList.contains('show'), true);

positive.context.equipSeasonalFromUnlockPopup();
assert.strictEqual(positive.stored.meta.selectedBoohaSkin, 'mummington',
  'the popup equip path must select the scheduled character');
assert.strictEqual(positive.popup.classList.contains('show'), false,
  'equipping from the popup must close it');

// Reload: the in-memory guard is gone, but the persisted unlock suppresses a
// second announcement.
positive.context.battyUnlockPopupShown = false;
positive.popup.classList.remove('show');
positive.scrim.classList.remove('show');
positive.context.maybeShowSeasonalUnlockPopup();
assert.strictEqual(positive.popup.classList.contains('show'), false,
  'a reload must not show the same weekly popup again');

// Negative: a trio spread across curricula is not sufficient.
const mixed = makeHarness(baseSave(currentKey, {
  vocab: { pb: { ms: 1000 } },
  sentences: { br: { ms: 1000 } },
  questions: { pb: { ms: 1000 } },
}));
mixed.context.maybeShowSeasonalUnlockPopup();
assert.deepStrictEqual(mixed.stored.weekly.unlockedBoohaSkins, {});
assert.strictEqual(mixed.popup.classList.contains('show'), false,
  'mixed curricula must not unlock a seasonal character');

// Negative: a complete trio from the previous occurrence is stale.
const stale = makeHarness(baseSave('2026-09-20|september-w3', completeBc));
stale.context.maybeShowSeasonalUnlockPopup();
assert.deepStrictEqual(stale.stored.weekly.unlockedBoohaSkins, {});
assert.strictEqual(stale.popup.classList.contains('show'), false,
  'last week\'s trio must not unlock this week\'s character');

// Weekly reset: clearing the weekly bucket makes the scheduled character
// unavailable again and the Maze check stays quiet.
positive.stored.weekly = { unlockedBoohaSkins: {} };
positive.stored.meta.blitz.weekly = {};
positive.context.battyUnlockPopupShown = false;
positive.popup.classList.remove('show');
positive.scrim.classList.remove('show');
positive.context.maybeShowSeasonalUnlockPopup();
assert.strictEqual(positive.context.BoohaSkins.isUnlocked('mummington'), false);
assert.strictEqual(positive.popup.classList.contains('show'), false,
  'after Sunday reset the old seasonal popup must remain closed');

// Keep the real inline wiring under test as well as the extracted decision.
assert.match(mazeSource, /function onSaveReady\(\)[\s\S]*?maybeShowSeasonalUnlockPopup\(\);/,
  'Maze save-ready boot must run the seasonal popup check');
assert.match(mazeSource, /battyEquipButton\?\.addEventListener\('click', equipSeasonalFromUnlockPopup\)/,
  'Maze must wire the image equip button');
assert.match(mazeSource, /battyEquipTextButton\?\.addEventListener\('click', equipSeasonalFromUnlockPopup\)/,
  'Maze must wire the text equip button');
assert.match(mazeSource, /booha:weeklyReset[\s\S]*?onSaveReady\(\);/,
  'Maze must re-check after weekly reset');

console.log('Maze seasonal-unlock integration passed: any-curriculum completion, stale/mixed negatives, popup-once, reload, reset, and inline wiring hold.');
