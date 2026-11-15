#!/usr/bin/env node
'use strict';

// Japan winter 2027 season wiring: Marshy, the eight guide rotation, the
// Doorknob repeat week (Setsubun), complete pose assets, Tokyo date boundaries,
// closet styling, Marshy's greetings and Karasuki visit, winter unlock copy,
// and the "is back" reveal for repeat weeks.
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
  'meatball', 'noodle', 'gruffles', 'doorknob',
  'wumble', 'socks', 'boffo', 'bloopus',
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
  ['2027-01-24', 'doorknob'],
  ['2027-01-31', 'doorknob'],
  ['2027-02-07', 'wumble'],
  ['2027-02-14', 'socks'],
  ['2027-02-21', 'boffo'],
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

// Marshy's greetings follow Japan's winter calendar.
const greeting = date => {
  const line = skins.seasonGreeting('japan-winter-2027', date);
  return line && line.en;
};
assert.strictEqual(greeting('2027-01-03'), "Happy New Year! Let's do our best!");
assert.strictEqual(greeting('2027-01-20'), "Brr! It's cold today!");
assert.strictEqual(greeting('2027-01-31'), '3 more days to Setsubun!');
assert.strictEqual(greeting('2027-02-02'), 'Tomorrow is Setsubun!');
assert.strictEqual(greeting('2027-02-03'), 'Oni wa soto! Fuku wa uchi!');
assert.strictEqual(greeting('2027-02-04'), 'Spring is on its way!');
assert.strictEqual(greeting('2027-03-01'), '2 more days to Hinamatsuri!');
assert.strictEqual(greeting('2027-03-03'), 'Happy Hinamatsuri!');
assert.strictEqual(greeting('2027-03-05'), 'Spring is almost here!');
for (let t = Date.parse('2027-01-03T00:00:00Z'); t <= Date.parse('2027-03-06T00:00:00Z'); t += 86400000) {
  const date = new Date(t).toISOString().slice(0, 10);
  const line = skins.seasonGreeting('japan-winter-2027', date);
  assert.ok(line && line.en && line.jp, `${date} needs a Marshy greeting in English and Japanese`);
}
assert.strictEqual(skins.seasonPhase('japan-winter-2027', '2027-02-01').id, 'setsubun');

// Seasonal snowflakes in the Maze, and Marshy visiting Karasuki.
const visitors = skins.seasonalVisitors('japan-winter-2027', '2027-01-20');
assert.strictEqual(visitors.length, 1);
assert.strictEqual(visitors[0].kind, 'snowflake');
assert.ok(fs.existsSync(path.join(ROOT, visitors[0].asset)), 'winter snowflake art must exist');
const karasukiVisit = skins.seasonalKarasuki('japan-winter-2027');
assert.strictEqual(karasukiVisit.kind, 'marshy');
assert.strictEqual(karasukiVisit.asset, marshy.assets.karasuki);
assert.ok(fs.existsSync(path.join(ROOT, karasukiVisit.asset)), 'Marshy Karasuki art must exist');
assert.ok(karasukiVisit.lines.length >= 5, 'Marshy needs several Karasuki lines');
karasukiVisit.lines.forEach((line, i) => {
  assert.ok(line.en.startsWith('{name}, ') && line.jp.startsWith('{name}、'), `Marshy line ${i} needs the name slot`);
  assert.ok(line.furigana && typeof line.furigana === 'object', `Marshy line ${i} needs a furigana map`);
});

// Every winter guide has hand-written unlock copy.
const unlockContext = { window: {}, console };
unlockContext.window.window = unlockContext.window;
vm.createContext(unlockContext);
vm.runInContext(read('js/maze-seasonal-unlock.js'), unlockContext, { filename: 'js/maze-seasonal-unlock.js' });
const unlock = unlockContext.window.MazeSeasonalUnlock;
characterIds.forEach(id => {
  const copy = unlock.COPY[id];
  assert.ok(copy, `${id} needs hand-written unlock copy`);
  const name = skins.get(id).name;
  assert.strictEqual(copy.titleEn, `You Unlocked ${name}!`);
  assert.strictEqual(copy.buttonEn, `EQUIP ${name.toUpperCase()}`);
  assert.ok(copy.titleJp.startsWith(skins.get(id).nameJp), `${id} Japanese title must use its name`);
});

// Repeat weeks welcome a collected character back instead of "unlocking" it.
const back = unlock.returnCopyFor('doorknob', skins.get('doorknob'));
assert.strictEqual(back.titleEn, 'Doorknob Booha Is Back!');
assert.match(back.titleJp, /^ドアノブ・ブーハーが もどってきたよ！$/);
function collectedAt(unlockedAt) {
  const ctx = {
    window: {
      CALENDAR: calendarContext.window.CALENDAR,
      BoohaAdventure: { save: { load() {
        return { meta: { boohaSkinCollection: { 'japan-winter-2027:doorknob': { unlockedAt, seasonId: 'japan-winter-2027' } } } };
      }, save() { return true; } } },
    },
    Intl, Date, console,
  };
  ctx.window.window = ctx.window;
  ctx.BoohaAdventure = ctx.window.BoohaAdventure;
  vm.createContext(ctx);
  vm.runInContext(read('js/core/booha-skins.js'), ctx, { filename: 'js/core/booha-skins.js' });
  return ctx.window.BoohaSkins.collectedBeforeThisWeek('doorknob');
}
assert.strictEqual(collectedAt(Date.now() - 14 * 86400000), true, 'collected two weeks ago counts as returning');
assert.strictEqual(collectedAt(Date.now()), false, 'collected this week is a new unlock');
assert.strictEqual(collectedAt(undefined), false, 'an entry without a time is treated as new');
const maze = read('maze.html');
assert.match(maze, /reveal\.returning/, 'the Maze arrival card must word repeat weeks as a return');

console.log('Japan winter season passed: Marshy, nine-week guide rotation with the Setsubun repeat, complete assets, Tokyo boundaries, winter closet styling, greetings, Karasuki visit, unlock copy, and return reveals.');
