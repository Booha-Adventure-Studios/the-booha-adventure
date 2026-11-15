#!/usr/bin/env node
'use strict';

// Japan winter 2027 season wiring: Marshy, the eight guide rotation, the
// Boffo repeat week, complete pose assets, Tokyo date boundaries, and closet styling.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const calendarContext = { window: {}, Intl, Date, console };
vm.createContext(calendarContext);
vm.runInContext(read('js/calendar.js'), calendarContext, { filename: 'js/calendar.js' });

const skinsContext = {
  window: {
    CALENDAR: calendarContext.window.CALENDAR,
    BoohaAdventure: { save: { load() { return {}; } } },
  },
  Intl,
  Date,
  console,
};
skinsContext.window.window = skinsContext.window;
vm.createContext(skinsContext);
vm.runInContext(read('js/core/booha-skins.js'), skinsContext, { filename: 'js/core/booha-skins.js' });

const skins = skinsContext.window.BoohaSkins;
const season = skins.getSeason('japan-winter-2027');
const characterIds = [
  'meatball', 'noodle', 'gruffles', 'boffo',
  'wumble', 'socks', 'doorknob', 'bloopus',
];
const poseKeys = [
  'maze', 'karasuki', 'grimmerglen', 'utsuroba', 'muenba', 'familyRoom',
  'marking', 'hiding', 'danceArmsUp', 'danceSway', 'danceWave',
];

assert.ok(season, 'Japan winter season must be registered');
assert.strictEqual(season.themeId, 'winter');
assert.strictEqual(season.startDate, '2027-01-03');
assert.strictEqual(season.endDate, '2027-03-06');
assert.strictEqual(season.mascotId, 'marshy');
assert.deepStrictEqual([...season.characterIds], characterIds);

const marshy = skins.get('marshy');
assert.strictEqual(marshy.kind, 'mascot');
assert.strictEqual(marshy.seasonId, 'japan-winter-2027');
assert.strictEqual(marshy.nameJp, 'マーシー');
assert.ok(skins.isAvailable('marshy'), 'Marshy must satisfy the mascot asset contract');
assert.strictEqual(skins.seasonMascot('japan-winter-2027').id, 'marshy');
assert.strictEqual(skins.mascotAsset('static', 'japan-winter-2027'), marshy.assets.static);
assert.strictEqual(skins.mascotAsset('karasuki', 'japan-winter-2027'), marshy.assets.karasuki);

characterIds.forEach(id => {
  const skin = skins.get(id);
  assert.strictEqual(skin.seasonId, 'japan-winter-2027', `${id} must belong to Japan winter`);
  assert.ok(skins.isAvailable(id), `${id} must have a complete enabled pose set`);
  poseKeys.forEach(key => {
    assert.ok(typeof skin.assets[key] === 'string' && skin.assets[key], `${id}.${key} needs an asset path`);
    assert.ok(fs.existsSync(path.join(ROOT, skin.assets[key])), `${id}.${key} asset must exist`);
  });
});

function occurrence(date) {
  const week = calendarContext.window.CALENDAR.getCurrentCurriculumWeek(new Date(`${date}T00:00:00+09:00`));
  return calendarContext.window.CALENDAR.getCurriculumWeekOccurrenceKey(week);
}

const expectedWeeks = [
  ['2027-01-03', 'meatball'],
  ['2027-01-10', 'noodle'],
  ['2027-01-17', 'gruffles'],
  ['2027-01-24', 'boffo'],
  ['2027-01-31', 'boffo'],
  ['2027-02-07', 'wumble'],
  ['2027-02-14', 'socks'],
  ['2027-02-21', 'doorknob'],
  ['2027-02-28', 'bloopus'],
];
expectedWeeks.forEach(([date, expected]) => {
  assert.strictEqual(season.weeklyCharacterIds[date], expected, `${date} must schedule ${expected}`);
  assert.strictEqual(
    skins.rotationCharacterId('japan-winter-2027', occurrence(date)),
    expected,
    `${date} must resolve ${expected}`,
  );
});

assert.strictEqual(skins.seasonIdForDate('2027-01-02'), 'christmas-2026');
assert.strictEqual(skins.seasonIdForDate('2027-01-03'), 'japan-winter-2027');
assert.strictEqual(skins.seasonIdForDate('2027-03-06'), 'japan-winter-2027');
assert.strictEqual(skins.seasonIdForDate('2027-03-07'), null);
assert.strictEqual(skins.menuCharacterId('japan-winter-2027', '2027-01-03'), 'marshy');
assert.strictEqual(skins.menuCharacterId('japan-winter-2027', '2027-03-06'), 'marshy');
assert.strictEqual(skins.menuCharacterId('japan-winter-2027', '2027-03-07'), null);

const adventureGame = read('js/ui/adventure-game.js');
assert.match(adventureGame, /winter:\s*\{ jp: 'ふゆ', cls: 'winter' \}/,
  'the closet needs a Japanese winter shelf style');
const adventureProfile = read('adventure-profile.html');
assert.match(adventureProfile, /\.closet-shelf\.winter\s*\{/,
  'the profile needs a winter closet shelf style');

console.log('Japan winter season passed: Marshy, nine-week guide rotation, complete assets, Tokyo boundaries, and winter closet styling.');
