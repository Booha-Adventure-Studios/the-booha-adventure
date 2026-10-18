#!/usr/bin/env node
'use strict';

// Release gate: scheduled characters entering the next 14 Tokyo calendar days
// must have their complete production asset set before the date arrives.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const context = {
  window: {
    CALENDAR: { getTodayKey: () => new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date()) },
    BoohaAdventure: { save: { load() { return {}; } } },
  },
  Intl,
  Date,
  console,
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(read('js/core/booha-skins.js'), context, { filename: 'js/core/booha-skins.js' });

const skins = context.window.BoohaSkins;
const today = context.window.CALENDAR.getTodayKey();
const todayMs = Date.parse(`${today}T00:00:00Z`);
const horizonMs = todayMs + 14 * 24 * 60 * 60 * 1000;
const failures = [];

Object.values(skins.SEASONS).forEach(season => {
  Object.entries(season.weeklyCharacterIds || {}).forEach(([date, id]) => {
    const dateMs = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(dateMs) || dateMs < todayMs || dateMs > horizonMs) return;
    if (!skins.isAvailable(id)) failures.push(`${season.id}: ${date} -> ${id}`);
  });
});

assert.deepStrictEqual(failures, [],
  `scheduled character art due within 14 Tokyo days is unavailable: ${failures.join(', ')}`);
console.log(`Seasonal art deadline passed: no unavailable scheduled character enters the next 14 Tokyo days from ${today}.`);
