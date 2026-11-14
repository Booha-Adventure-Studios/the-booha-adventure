#!/usr/bin/env node
'use strict';

// Intro videos play once per curriculum week (Nov 2026): first visit of the
// week plays, later visits that week skip straight on. Wired to the calendar
// (occurrenceKey) and stored per student in weekly.introsSeen.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// 1. Runtime behaviour of the helper.
function load({ week = '2026-11-08|november-w2', withSave = true } = {}) {
  const data = { weekly: {} };
  const save = {
    load: () => JSON.parse(JSON.stringify(data)),
    patchDeep: (section, key, obj) => { data[section][key] = Object.assign(data[section][key] || {}, obj); return true; },
  };
  const ctx = { CALENDAR: { getCurrentCurriculumWeek: () => ({ occurrenceKey: ctx.__week }) }, __week: week, Object, JSON };
  if (withSave) ctx.BoohaAdventure = { save };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('js/core/intro-videos.js'), ctx);
  return { V: ctx.BoohaIntroVideos, ctx, data };
}
{
  const { V, ctx, data } = load();
  assert.deepStrictEqual([...V.IDS], ['hub', 'maze', 'homework', 'karasuki', 'happyHouse', 'utsuroba', 'muenba']);
  for (const id of V.IDS) assert.strictEqual(V.shouldPlay(id), true, `${id}: plays on the first visit of the week`);
  assert.strictEqual(V.markSeen('maze'), true);
  assert.strictEqual(V.shouldPlay('maze'), false, 'skipped later the same week');
  assert.strictEqual(V.shouldPlay('hub'), true, 'each video is tracked on its own');
  assert.strictEqual(data.weekly.introsSeen.maze, '2026-11-08|november-w2', 'stored per student with the week key');
  ctx.__week = '2026-11-15|november-w3';
  assert.strictEqual(V.shouldPlay('maze'), true, 'plays again in the new week even before a reset');
  assert.strictEqual(V.markSeen('not-an-intro'), false, 'unknown ids are ignored');
}
{
  const { V } = load({ withSave: false });
  assert.strictEqual(V.shouldPlay('hub'), true, 'no save: videos simply play');
  assert.strictEqual(V.markSeen('hub'), false);
}
{
  const { V } = load({ week: null });
  assert.strictEqual(V.shouldPlay('hub'), true, 'no calendar week: videos simply play');
}

// 2. The weekly reset clears it.
const saveFile = read('js/core/save-file.js');
assert.strictEqual((saveFile.match(/introsSeen: +\{\}/g) || []).length, 3, 'introsSeen is in the default, repaired and reset weekly shapes');

// 3. Every intro video consults the helper before playing and marks it seen.
const index = read('index.html');
assert.match(index, /ghostWrap\.classList\.add\('flyAway'\);\s*\/\/[^\n]*\n\s*if \(window\.BoohaIntroVideos && !BoohaIntroVideos\.shouldPlay\('hub'\)\) \{ goToHub\(\); return; \}/,
  'hub: not due goes straight to the hub');
assert.match(index, /await introVideo\.play\(\);\s*if \(window\.BoohaIntroVideos\) BoohaIntroVideos\.markSeen\('hub'\);/, 'hub: marked seen once it plays');

const maze = read('maze.html');
// The Maze flyover follows its own earned rule (js/core/maze-arrival.js,
// tests/maze-arrival.test.cjs), so it never uses the generic weekly flag.
assert.doesNotMatch(maze, /introDue\('maze'\)|introSeen\('maze'\)/, 'maze flyover: not the generic weekly intro flag');
for (const [fn, id] of [['playHomeworkVideoAndGo', 'homework'], ['playKarasukiVideoAndGo', 'karasuki']]) {
  const body = maze.slice(maze.indexOf(`function ${fn}(){`), maze.indexOf('\n}\n', maze.indexOf(`function ${fn}(){`)));
  assert.match(body, new RegExp(`const playIntro=introDue\\('${id}'\\);\\s*if\\(playIntro\\)\\{\\s*introSeen\\('${id}'\\);`), `${id}: checks and marks`);
  assert.match(body, /if\(!playIntro\)\{leaveNow\(\);return;\}/, `${id}: not due goes straight on`);
}
const kar = read('js/karasuki.js');
for (const [fn, id] of [['_playHappyHouseVideo', 'happyHouse'], ['_playUtsuobaIntroVideo', 'utsuroba'], ['_playMuenbaIntroVideo', 'muenba']]) {
  const start = kar.indexOf(`function ${fn}() {`);
  const head = kar.slice(start, start + 600);
  assert.match(head, new RegExp(`if \\(window\\.BoohaIntroVideos && !BoohaIntroVideos\\.shouldPlay\\('${id}'\\)\\) \\{\\s*window\\.location\\.href = `), `${id}: not due goes straight in`);
  assert.match(head, new RegExp(`BoohaIntroVideos\\.markSeen\\('${id}'\\);`), `${id}: marked seen when it plays`);
}

// 4. Pages load the helper after the save.
for (const page of ['index.html', 'maze.html', 'karasuki.html']) {
  const src = read(page);
  const a = src.search(/<script src="(\.\/)?js\/core\/save-file\.js"><\/script>/);
  const b = src.search(/<script src="(\.\/)?js\/core\/intro-videos\.js"><\/script>/);
  assert(a >= 0 && b > a, `${page} loads intro-videos.js after save-file.js`);
}

// The Invaders end screen is not an intro and is untouched.
assert.doesNotMatch(read('js/invaders-engine.js'), /BoohaIntroVideos/, 'end screens are not intros');

console.log('Intro videos weekly passed: 7 intros play on the first visit of the week, per student, reset with the calendar week.');
