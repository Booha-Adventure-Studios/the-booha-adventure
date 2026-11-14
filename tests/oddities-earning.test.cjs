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

function harness(initial = {}) {
  const listeners = {};
  const document = {
    addEventListener(type, listener) {
      (listeners[type] ||= []).push(listener);
    },
    dispatchEvent(event) {
      (listeners[event.type] || []).forEach(listener => listener(event));
      return true;
    },
  };
  const calendar = {
    getCurrentCurriculumWeek: () => ({ weekStart: '2026-11-08', occurrenceKey: '2026-11-08|november-w2' }),
    getCurriculumWeekOccurrenceKey: current => current.occurrenceKey,
  };
  const saveData = {
    meta: { checkIn: {}, blitz: {}, ...(initial.meta || {}) },
    collectibles: initial.collectibles || {},
  };
  const save = {
    load: () => saveData,
    save: data => { Object.assign(saveData, data); return true; },
    patch: () => true,
  };
  const systems = {};
  const adventure = {
    save,
    registerSystem(name, api) { systems[name] = api; },
    stats: null,
    unlocks: null,
  };
  const context = {
    window: { BoohaAdventure: adventure, CALENDAR: calendar },
    BoohaAdventure: adventure,
    CALENDAR: calendar,
    document,
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    },
    console,
    Date,
    Math,
    Number,
    Object,
    Set,
  };
  vm.runInNewContext(dataSource, context, { filename: 'collectibles-data.js' });
  vm.runInNewContext(systemSource, context, { filename: 'collectible-system.js' });
  return { api: context.window.BoohaCollectibleSystem, data: saveData, document, items: context.window.BoohaCollectiblesData };
}

function markChecks(data, count) {
  for (let day = 0; day < count; day++) {
    const key = new Date(Date.parse('2026-11-08T00:00:00Z') + day * 86400000).toISOString().slice(0, 10);
    data.meta.checkIn[key] = { st: 'done' };
  }
}

function markBlitz(data) {
  data.meta.blitz = {
    weeklyKey: '2026-11-08|november-w2',
    weekly: {
      vocab: { pb: { ms: 1 } },
      sentences: { pb: { ms: 1 } },
      questions: { pb: { ms: 1 } },
    },
  };
}

// The standard channel needs three distinct done days and all three Blitz.
{
  const h = harness();
  markChecks(h.data, 3);
  markBlitz(h.data);
  const awards = h.api.evaluateWeekly();
  assert.strictEqual(awards.map(award => award.pool).join(','), 'standard', '3 checks plus Blitz should award one standard find');
  assert.ok(awards[0].item && h.data.meta.findsLog['2026-11-08|november-w2'].standard.itemId, 'the standard draw should save its item');
  assert.strictEqual(h.api.evaluateWeekly().length, 0, 'the standard channel should not award twice in one week');
}

// Seven checks award the special channel even if Blitz is incomplete.
{
  const h = harness();
  markChecks(h.data, 7);
  const awards = h.api.evaluateWeekly();
  assert.strictEqual(awards.map(award => award.pool).join(','), 'special', '7 checks should award the special find without Blitz');
  assert.strictEqual(h.data.meta.findsLog['2026-11-08|november-w2'].standard, null, '7 checks alone should not award the standard find');
}

// A perfect check week and Blitz triple earn both channels, together.
{
  const h = harness();
  markChecks(h.data, 7);
  markBlitz(h.data);
  const awards = h.api.evaluateWeekly();
  assert.strictEqual(awards.map(award => award.pool).join(','), 'standard,special', 'both eligible channels should be awarded together');
}

// Retakes and duplicate records on one day do not create extra qualifying days.
{
  const h = harness();
  markChecks(h.data, 2);
  h.data.meta.checkIn['2026-11-08'].retries = [{ pct: 100 }, { pct: 100 }];
  markBlitz(h.data);
  assert.strictEqual(h.api.evaluateWeekly().length, 0, 'two distinct check days cannot earn the standard draw');
}

// When a pool is exhausted, the draw is a second copy of an owned item
// (shown as ×2 in the cabinet), not an empty record or a counter.
{
  const h = harness();
  h.items.filter(item => item.pool === 'standard').forEach(item => {
    h.data.collectibles[item.id] = { found: true, foundAt: 1 };
  });
  markChecks(h.data, 3);
  markBlitz(h.data);
  const awards = h.api.evaluateWeekly();
  assert.strictEqual(awards[0].pool, 'standard', 'an exhausted standard pool still records the weekly channel');
  assert.ok(awards[0].item && awards[0].item.pool === 'standard', 'an exhausted pool draws a copy of an owned item');
  assert.strictEqual(awards[0].record.duplicate, true, 'the draw is marked as a duplicate copy');
  assert.strictEqual(h.data.meta.findsDuplicateCount, undefined, 'there is no conversion counter');
}

// Picking up a drawn item records its permanent channel and week metadata.
{
  const h = harness();
  markChecks(h.data, 3);
  markBlitz(h.data);
  const [award] = h.api.evaluateWeekly();
  const result = h.api.collect(award.item.id);
  const saved = h.data.collectibles[award.item.id];
  assert.strictEqual(result.alreadyFound, false, 'the first pickup should be new');
  assert.strictEqual(saved.found, true, 'picked-up oddities should be permanent');
  assert.strictEqual(saved.channel, 'standard', 'picked-up oddities should retain their channel');
  assert.strictEqual(saved.week, '2026-11-08|november-w2', 'picked-up oddities should retain their earning week');
  assert.ok(h.data.meta.findsLog['2026-11-08|november-w2'].standard.foundAt, 'the draw log should record pickup time');
}

for (const page of ['index.html', 'maze.html', 'profile.html', 'adventure-profile.html']) {
  const html = read(page);
  const prefix = page === 'index.html' || page === 'adventure-profile.html' ? '' : './';
  const dataTag = `<script src="${prefix}js/core/collectibles-data.js"></script>`;
  const systemTag = `<script src="${prefix}js/core/collectible-system.js"></script>`;
  assert.ok(html.includes(dataTag) && html.includes(systemTag), `${page} must load the earning system`);
  assert.ok(html.indexOf(dataTag) < html.indexOf(systemTag), `${page} must load collectible data first`);
}

assert.match(systemSource, /dailyCount >= 3 && blitzDone/, 'standard eligibility must require three checks and Blitz');
assert.match(systemSource, /dailyCount >= 7/, 'special eligibility must require seven checks');
assert.match(systemSource, /booha:checkIn/, 'Daily Check completion must reevaluate the draw');
assert.match(systemSource, /booha:gameEnd/, 'Blitz completion must reevaluate the draw');
assert.match(read('js/core/save-file.js'), /findsLog/, 'the save schema must preserve the permanent draw log');

console.log('Oddities earning tests passed.');
