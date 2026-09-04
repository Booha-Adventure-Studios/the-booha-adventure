#!/usr/bin/env node
'use strict';

// Regression audit for the mid-quest reload path:
// accept -> leave -> reload in room_01 -> keep exits open, while a weekly
// rollover starts the next quest locked again.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const saveSource = fs.readFileSync(path.join(root, 'js', 'core', 'save-file.js'), 'utf8');

const initStart = runtime.indexOf('function init()');
const initEnd = runtime.indexOf("document.addEventListener('visibilitychange'", initStart);
assert(initStart >= 0 && initEnd > initStart, 'Grimmerglen init must be present');
const init = runtime.slice(initStart, initEnd);
assert(init.includes('const weekly = readGrimmerglenWeekly();'),
  'init must read the current weekly Grimmerglen state');
assert(init.includes('state.helpAccepted = weekly.memoryQuestAccepted === true;'),
  'init must restore helpAccepted from memoryQuestAccepted');
assert(init.includes('state.navigationUnlocked = state.helpAccepted;'),
  'init must restore navigationUnlocked from the accepted quest state');
assert(init.indexOf('state.navigationUnlocked = state.helpAccepted;') < init.indexOf('setRoom('),
  'restored navigation state must be applied before room entry begins');

const transformStart = runtime.indexOf('function playBoohaTransform()');
const transformEnd = runtime.indexOf('// Fires once, right as the player actually arrives', transformStart);
assert(transformStart >= 0 && transformEnd > transformStart, 'Booha transformation must be present');
const transform = runtime.slice(transformStart, transformEnd);
assert(!transform.includes('state.navigationUnlocked = false;'),
  'Booha transformation must not relock an already accepted weekly quest');
assert(transform.includes("state.entryWelcomePending = state.spawnId === 'fromKarasuki' && !state.helpAccepted;"),
  'new entries must keep the welcome lock while accepted quests skip it');

const exitStart = runtime.indexOf('function getAvailableExit(');
const exitEnd = runtime.indexOf('function transitionTo(', exitStart);
const exits = runtime.slice(exitStart, exitEnd);
assert(exits.includes('if (!state.navigationUnlocked) return null;'),
  'room exits must remain gated by the restored navigation state');

// Exercise the persisted weekly lifecycle with the real save-file schema.
const saveKey = 'booha_save:v3:grimmerglen-reload-state-student';
let stored = null;
const localStorage = {
  getItem(name) {
    if (name === 'booha_userid') return 'grimmerglen-reload-state-student';
    if (name === saveKey) return stored ? JSON.stringify(stored) : null;
    return null;
  },
  setItem(name, value) {
    if (name === saveKey) stored = JSON.parse(value);
  },
  removeItem() {},
};
const document = { addEventListener() {}, dispatchEvent() {} };
class Event { constructor(type) { this.type = type; } }
class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
const context = {
  window: {},
  BoohaAdventure: {
    registerSystem(name, api) { if (name === 'saveFile') this.save = api; },
  },
  localStorage, document, Event, CustomEvent, console, Date,
};
context.window.BoohaAdventure = context.BoohaAdventure;
vm.createContext(context);
vm.runInContext(saveSource, context, { filename: 'js/core/save-file.js' });

const save = context.BoohaAdventure.save;
const accepted = save.load();
accepted.weekly.worlds.grimmerglen.memoryQuestAccepted = true;
save.save(accepted);

// Leaving Grimmerglen does not clear the weekly acceptance record.
const afterLeave = save.load();
assert.strictEqual(afterLeave.weekly.worlds.grimmerglen.memoryQuestAccepted, true,
  'leaving Grimmerglen must preserve the accepted weekly quest');

// A reload in room_01 must reconstruct both live flags without another
// Marietta interaction; this mirrors the assignments in init().
const reloadedWeekly = save.load().weekly.worlds.grimmerglen;
const reloadedState = {
  helpAccepted: reloadedWeekly.memoryQuestAccepted === true,
  navigationUnlocked: reloadedWeekly.memoryQuestAccepted === true,
};
assert.strictEqual(reloadedState.helpAccepted, true,
  'reload must restore helpAccepted for the accepted quest');
assert.strictEqual(reloadedState.navigationUnlocked, true,
  'reload in room_01 must keep exits available without Marietta');

save.resetWeekly('2026-09-07|september-w2');
const nextWeek = save.load().weekly.worlds.grimmerglen;
assert.strictEqual(nextWeek.memoryQuestAccepted, false,
  'a new weekly quest must start unaccepted');
const newQuestState = {
  helpAccepted: nextWeek.memoryQuestAccepted === true,
  navigationUnlocked: nextWeek.memoryQuestAccepted === true,
};
assert.strictEqual(newQuestState.helpAccepted, false,
  'new weekly quests must remain behind Marietta help');
assert.strictEqual(newQuestState.navigationUnlocked, false,
  'new weekly quests must keep room exits locked until Help is pressed');

console.log('Grimmerglen reload-state audit passed: accepted quests survive leave/reload, transformations do not relock them, and weekly rollover restores the entry lock.');
