#!/usr/bin/env node
'use strict';

// Maze arrival (2026-11-14 product decision). Doing the work earns the short,
// quiet path; it is never a gate.
//   Daily Check done today + Blitz 3/3 + not yet earned this week → congratulations
//     card (with this week's companion); its tap plays the flyover with sound and
//     starts the music, and earns the week.
//   Same, already earned → no card, no video: this week's guide flies over the
//     still Maze; tapping it starts the music and opens the Maze.
//   Anything missing → a reminder that names it; Go back / Do the Daily Check now /
//     Continue anyway (flyover with sound + music every time, never earns the week).
// Replaces the Nov 8 "optional warm-up" contract and the R2 muted flyover.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const maze = read('maze.html');
const arrivalSrc = read('js/core/maze-arrival.js');

// ── 1. The rule (js/core/maze-arrival.js) ─────────────────────────────────
function sandbox({ week = '2026-11-08|november-w2', dc = 'pending', save = {} } = {}) {
  let data = JSON.parse(JSON.stringify(save));
  const win = {
    CALENDAR: week ? { getCurrentCurriculumWeek: () => ({ occurrenceKey: week }) } : undefined,
    BoohaDailyCheck: dc === null ? undefined : { todayState: () => win.__dc },
    BoohaAdventure: { save: {
      load: () => JSON.parse(JSON.stringify(data)),
      patchDeep(section, key, obj) { data[section] = data[section] || {}; data[section][key] = Object.assign(data[section][key] || {}, obj); return true; },
    } },
    __dc: dc,
  };
  vm.runInNewContext(arrivalSrc, { window: win, globalThis: win });
  return { A: win.BoohaMazeArrival, win, data: () => data };
}

{ // Daily Check pending + Blitz complete → reminder
  const { A } = sandbox({ dc: 'pending' });
  assert.strictEqual(A.state(true).mode, 'reminder', 'Daily Check pending + Blitz 3/3 → reminder');
}
for (const dc of ['skipped', 'failed']) { // a skip or a failed attempt is not done
  const { A } = sandbox({ dc });
  assert.strictEqual(A.state(true).mode, 'reminder', `Daily Check ${dc} + Blitz 3/3 → reminder`);
  assert.strictEqual(A.dailyCheckDone(), false, `${dc} is not done`);
}
{ // Blitz incomplete, Daily Check done → reminder
  const { A } = sandbox({ dc: 'done' });
  assert.strictEqual(A.state(false).mode, 'reminder', 'Blitz 2/3 + Daily Check done → reminder');
}
{ // Everything done → congrats once, then the guide
  const { A, data } = sandbox({ dc: 'done' });
  assert.strictEqual(A.state(true).mode, 'congrats', 'all done, first time this week → congratulations');
  assert.strictEqual(A.markRewardEarned(), true, 'reward recorded');
  assert.strictEqual(data().weekly.mazeReward.earned, '2026-11-08|november-w2', 'stored per student with the week key');
  assert.strictEqual(A.state(true).mode, 'guide', 'later visits this week → the guide');
}
{ // Daily Check completed later the same day: re-reading the state flips the mode
  const { A, win } = sandbox({ dc: 'pending' });
  assert.strictEqual(A.state(true).mode, 'reminder', 'before the check');
  win.__dc = 'done';
  assert.strictEqual(A.state(true).mode, 'congrats', 'after the check → congratulations');
}
{ // Weekly reward already earned, but today's check is not done (the Tuesday case)
  const save = { weekly: { mazeReward: { earned: '2026-11-08|november-w2' } } };
  const { A, win } = sandbox({ dc: 'pending', save });
  assert.strictEqual(A.state(true).mode, 'reminder', 'earned this week + today’s check not done → reminder, video every time');
  win.__dc = 'done';
  assert.strictEqual(A.state(true).mode, 'guide', 'earned + today’s check done → the guide, no second congratulations');
}
{ // A new week earns again; no calendar or save means nothing is earned
  const save = { weekly: { mazeReward: { earned: '2026-11-01|november-w1' } } };
  assert.strictEqual(sandbox({ dc: 'done', save }).A.state(true).mode, 'congrats', 'last week’s reward does not count');
  assert.strictEqual(sandbox({ dc: 'done', week: null }).A.rewardEarned(), false, 'no calendar → not earned');
  assert.strictEqual(sandbox({ dc: null }).A.state(true).mode, 'reminder', 'no Daily Check module → not done');
}

// ── 2. maze.html wiring ───────────────────────────────────────────────────
const between = (a, b) => { const i = maze.indexOf(a); assert(i >= 0, `found ${a}`); return maze.slice(i, maze.indexOf(b, i + a.length)); };

assert.doesNotMatch(maze, /\.muted\s*=\s*true/, 'no muted video path anywhere in the Maze');
assert.doesNotMatch(maze, /autoEnterAfterBlitz/, 'the R2 muted auto-entry is gone');
assert.doesNotMatch(maze, /introSeen\('maze'\)|introDue\('maze'\)/, 'the flyover no longer uses the generic weekly intro flag');

const tap = between("continueBtn.addEventListener('click',()=>{", '\n});');
assert.match(tap, /if\(arrivalMode==='congrats'\)\{[\s\S]*?claimReveal\(revealId\);[\s\S]*?markRewardEarned\(\);\s*\}\s*startFlyover\(\);/,
  'only the congratulations tap claims the companion and earns the week; both paths play the flyover');
assert.strictEqual((maze.match(/markRewardEarned\(\)/g) || []).length, 1, 'the reward is earned in one place only');

const fly = between('function startFlyover(){', '\n}\n');
assert.match(fly, /primeBgMusic\(\);/, 'the arrival tap primes the Maze music');
assert.match(fly, /toMazeVideo\.muted=false;/, 'the flyover plays with sound');
assert.doesNotMatch(fly, /await|setTimeout/, 'play() runs inside the tap (no delay that would lose the gesture)');
assert.match(fly, /const p=toMazeVideo\.play\(\);\s*if\(p&&p\.catch\)p\.catch\(\(\)=>finishFlyover\(\)\);/, 'a refused video still opens the Maze');

assert.match(between('function finishFlyover(){', '\n}\n'), /launchMaze\(\);/, 'the Maze opens straight after the flyover (no second Start tap)');
const launch = between('function launchMaze(){', '\n}\n');
assert.match(launch, /playBgMusic\(\)\.catch\(\(\)=>armMusicOnFirstGesture\(\)\);/, 'music plays, or starts on the first tap');
const guidePath = between('function enterMazeWithGuide(){', '\n}\n');
assert.match(guidePath, /showMazeGuide\(\);/, 'guide path: no card, no video; the guide flies over the still Maze');
assert.doesNotMatch(guidePath, /launchMaze|startLoop|armMusicOnFirstGesture/, 'the Maze waits, still, until the guide is tapped (no start-on-any-tap)');
const guide = between('function showMazeGuide(){', '\n}\n');
assert.match(guide, /btn\.addEventListener\('click',\(\)=>\{[\s\S]*?playBgMusic\(\)[\s\S]*?launchMaze\(\);/, 'tapping the guide starts the music, then opens the Maze');
assert.doesNotMatch(guide.slice(guide.indexOf("btn.addEventListener('click'"), guide.indexOf('playBgMusic')), /await|setTimeout/, 'music starts directly inside the tap');
assert.doesNotMatch(guide, /scrim|entryShell/, 'not a popup: no scrim or card');
const lookup = between('function currentGuide(){', '\n}\n');
assert.match(lookup, /pick\(S\?\.rotationCharacterId\?\.\(\)\)\|\|pick\(S\?\.selectedId\?\.\(\)\)/, 'guide: this week’s unlocked companion first, else the one they have on');
assert.match(lookup, /S\.isUnlocked\?\.\(id\)/, 'only an unlocked companion is shown');
assert.match(maze, /@media \(prefers-reduced-motion:reduce\)\{\s*#mazeGuide\{ animation:none; \}/, 'reduced motion: the guide does not fly');

const decide = between('function decideArrival(){', '\n}\n');
assert.match(decide, /booha_return_to_checkpoint/, 'returns from a game are restored separately');
assert.match(decide, /if\(arrivalMode==='guide'\)enterMazeWithGuide\(\);/, 'the guide only when earned + today’s check done');
assert.match(maze, /document\.addEventListener\('booha:checkIn',refreshArrival\);/, 'the card is re-read after every Daily Check record');
assert.match(between('function refreshArrival(){', '\n}\n'), /personalizeMazeIntro\(\);\s*decideArrival\(\);/, 're-read decides again');

const onReady = between('function onSaveReady(){', 'if (window.BOOHA_READY) onSaveReady();');
assert.match(onReady, /decideArrival\(\);/, 'arrival decided once the save is ready');
assert.doesNotMatch(onReady, /maybeShowSeasonalUnlockPopup\(\)/, 'no separate companion popup: it is part of the congratulations');
assert.match(read('js/maze-seasonal-unlock.js'), /function pendingReveal\(\)[\s\S]*function claimReveal\(id\)/, 'companion reveal helpers exist');

const scripts = ['js/core/save-file.js', 'js/daily-check.js', 'js/core/maze-arrival.js'].map(f => maze.indexOf(`<script src="./${f}"></script>`));
assert(scripts.every(i => i > 0) && scripts[0] < scripts[2] && scripts[1] < scripts[2], 'maze-arrival.js loads after the save and the Daily Check');
assert.strictEqual((read('js/core/save-file.js').match(/mazeReward: +\{\}/g) || []).length, 3, 'mazeReward is in the default, repaired and reset weekly shapes');

// ── 3. The card itself: run personalizeMazeIntro() ───────────────────────
const start = maze.indexOf('function personalizeMazeIntro() {');
let depth = 0, end = -1;
for (let i = maze.indexOf('{', start); i < maze.length; i++) {
  if (maze[i] === '{') depth++;
  else if (maze[i] === '}' && --depth === 0) { end = i + 1; break; }
}
const fnSource = maze.slice(start, end);
const namesSource = between('const BLITZ_NAMES', ';\n') + ';';

function fakeEl(id, classes = []) {
  const set = new Set(classes);
  return {
    id, textContent: '', innerHTML: '', hidden: false, dataset: {}, src: '', alt: '',
    classList: {
      add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)), contains: c => set.has(c),
      toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : on ? set.add(c) : set.delete(c)),
    },
  };
}
function card({ cleared = 3, dcDone = false, mode, reveal = null }) {
  const types = ['vocab', 'sentences', 'questions'];
  const progress = Object.fromEntries(types.map((t, i) => [t, i < cleared]));
  const els = {};
  const document = { getElementById: id => els[id] || (els[id] = fakeEl(id)), querySelector: () => null };
  const ctx = {
    document,
    window: { BoohaMazeArrival: { state: blitzDone => ({ blitzDone, dcDone, earned: mode === 'guide', mode }) }, BoohaDailyCheckReminder: {} },
    getBoohaFirstName: () => 'Aiko',
    readBlitzCompletionState: () => ({ progress, completedCurriculum: cleared === 3 ? 'br' : null }),
    mazeSeasonalUnlock: { pendingReveal: () => reveal },
  };
  vm.runInNewContext(`${namesSource}\nlet arrivalMode;\n${fnSource}\npersonalizeMazeIntro();\nthis.__mode = arrivalMode;`, ctx);
  return { els, mode: ctx.__mode };
}

{ // Reminder: Daily Check missing, Blitz complete
  const { els } = card({ cleared: 3, dcDone: false, mode: 'reminder' });
  assert.match(els.mazeEntryMessageEn.textContent, /You didn’t do today’s Daily Check\./, 'names the missing Daily Check');
  assert.doesNotMatch(els.mazeEntryMessageEn.textContent, /Blitz/, 'Blitz is not listed when it is done');
  assert.strictEqual(els.returnBtnEn.textContent, 'Go back', 'Go back');
  assert(els.returnBtn.classList.contains('primary') && !els.returnBtn.hidden, 'Go back is the primary action');
  assert(els.continueBtn.classList.contains('quiet') && !els.continueBtn.classList.contains('primary'), 'Continue anyway is small');
  assert.strictEqual(els.continueBtnEn.textContent, 'Continue anyway', 'Continue anyway');
  assert.strictEqual(els.dcNowBtn.hidden, false, 'Do the Daily Check now is offered');
  assert.strictEqual(els.mazeDcState.textContent, 'NOT DONE', 'checklist shows the Daily Check');
  assert(els.overlay1.classList.contains('entry-ready'), 'the card shows');
}
{ // Reminder: Blitz 1/3, Daily Check done
  const { els } = card({ cleared: 1, dcDone: true, mode: 'reminder' });
  assert.match(els.mazeEntryMessageEn.textContent, /You finished 1 of 3 Blitz games\. Left: Sentences, Questions\./, 'names the missing Blitz games');
  assert.doesNotMatch(els.mazeEntryMessageEn.textContent, /Daily Check/, 'the Daily Check is not listed when it is done');
  assert.strictEqual(els.dcNowBtn.hidden, true, 'no Daily Check button when it is done');
}
{ // Reminder: nothing done
  const { els } = card({ cleared: 0, dcDone: false, mode: 'reminder' });
  assert.match(els.mazeEntryMessageEn.textContent, /Daily Check\. You didn’t play the Blitz games\./, 'names both');
}
{ // Congratulations with this week's companion (one popup, not two)
  const { els } = card({ cleared: 3, dcDone: true, mode: 'congrats', reveal: { id: 'batty', name: 'Batty Booha', art: 'x.webp' } });
  assert.strictEqual(els.mazeQuestion.textContent, 'Congratulations!', 'congratulations');
  assert.strictEqual(els.continueBtnEn.textContent, 'Enter the Maze', 'one button: Enter the Maze');
  assert(els.continueBtn.classList.contains('primary'), 'Enter the Maze is primary');
  assert.strictEqual(els.returnBtn.hidden, true, 'no Go back on the congratulations card');
  assert.strictEqual(els.dcNowBtn.hidden, true, 'no Daily Check button');
  assert.strictEqual(els.mazeCompanionArt.hidden, false, 'the companion is on the card');
  assert.strictEqual(els.overlay1.dataset.revealId, 'batty', 'the Enter tap will claim this companion');
  assert.match(els.mazeEntryMessageEn.textContent, /Batty Booha joins you/, 'the message names the companion');
}
{ // Congratulations without a pending companion
  const { els } = card({ cleared: 3, dcDone: true, mode: 'congrats' });
  assert.strictEqual(els.mazeCompanionArt.hidden, true, 'no companion art');
  assert.strictEqual(els.overlay1.dataset.revealId, undefined, 'nothing to claim');
}
{ // Guide: the card is never shown
  const { els, mode } = card({ cleared: 3, dcDone: true, mode: 'guide' });
  assert.strictEqual(mode, 'guide');
  assert(!els.overlay1.classList.contains('entry-ready'), 'no card on the guide path');
}

console.log('Maze arrival passed: congratulations once a week when Daily Check + Blitz are done, the flying guide after, reminder + flyover with music otherwise; no muted video.');
