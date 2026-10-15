#!/usr/bin/env node
'use strict';

// Exercise the two small hub render helpers that previously hid a crash
// behind source-only checks. This keeps the test independent of the rest of
// the page's animation, media, and lazy-loader boot sequence.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const buildStart = index.indexOf('function buildWeekData()');
const buildEnd = index.indexOf('/* ════════════════════════════════════════════════════════════\n   ORIENTATION', buildStart);
const tabStart = index.indexOf('function setHubWeekTab(');
const tabEnd = index.indexOf('function renderHub()', tabStart);
assert(buildStart >= 0 && buildEnd > buildStart, 'buildWeekData must remain extractable');
assert(tabStart >= 0 && tabEnd > tabStart, 'setHubWeekTab must remain extractable');

const current = {
  monthSlug: 'october', monthLabel: 'October', weekNumber: 2,
  weekStart: '2026-10-11', weekEnd: '2026-10-17'
};
const previous = {
  monthSlug: 'october', monthLabel: 'October', weekNumber: 1,
  weekStart: '2026-10-04', weekEnd: '2026-10-10'
};
const next = {
  monthSlug: 'october', monthLabel: 'October', weekNumber: 3,
  weekStart: '2026-10-18', weekEnd: '2026-10-24'
};

const nodes = new Map();
const context = {
  console,
  window: { BoohaCurriculum: { get: () => 'pb' } },
  document: { getElementById(id) { return nodes.get(id) || null; } },
  getCurrentCurriculumWeek: () => current,
  shiftCurriculumWeek: (_, delta) => delta < 0 ? previous : next,
  makeWeekIdFromCalendarWeek: week => `${week.monthSlug}_w${week.weekNumber}`,
  formatRangeFromIso: (start, end) => `${start} – ${end}（日本語）`,
  shortMonthKeyFromSlug: slug => slug.slice(0, 3),
  navigateToCurriculum: (weekId, curriculum) => { context.navigation = { weekId, curriculum }; },
  openPicker: () => { context.pickerOpened = true; },
};
vm.createContext(context);
vm.runInContext(index.slice(buildStart, buildEnd), context, { filename: 'index-buildWeekData.js' });
vm.runInContext(index.slice(tabStart, tabEnd), context, { filename: 'index-setHubWeekTab.js' });

const weeks = context.buildWeekData();
assert.strictEqual(weeks.length, 3);
assert.strictEqual(JSON.stringify(weeks.map(week => [week.monthSlug, week.weekNumber])),
  JSON.stringify([['october', 1], ['october', 2], ['october', 3]]),
  'week data must carry the metadata used by the side tabs'
);

for (const [id, value] of [
  ['hubPrevWeekBtn', {}],
  ['hubPrevWeekTitle', {}],
  ['hubPrevWeekDate', {}],
]) {
  nodes.set(id, {
    ...value,
    textContent: '',
    setAttribute(name, attributeValue) { this[name] = attributeValue; },
  });
}

assert.doesNotThrow(() => context.setHubWeekTab(
  'hubPrevWeekBtn', 'hubPrevWeekTitle', 'hubPrevWeekDate', weeks[0], 'last week'
));
assert.strictEqual(nodes.get('hubPrevWeekTitle').textContent, 'OCT · W1');
assert.strictEqual(nodes.get('hubPrevWeekDate').textContent, '2026-10-04 – 2026-10-10');
nodes.get('hubPrevWeekBtn').onclick();
assert.strictEqual(JSON.stringify(context.navigation), JSON.stringify({ weekId: 'october_w1', curriculum: 'pb' }));
assert.strictEqual(context.pickerOpened, undefined, 'a remembered/default curriculum must skip the picker');

console.log('Index hub runtime passed: week metadata survives into tabs, tab rendering does not throw, and default routing skips the picker.');
