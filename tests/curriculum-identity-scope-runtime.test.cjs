#!/usr/bin/env node
'use strict';

// Model the shared-tablet and second-device curriculum transitions with the
// real save and curriculum modules. The login gate's mirror cleanup is tested
// separately by login-runtime.test.cjs; this test proves the durable save is
// keyed by student and survives that cleanup.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const saveSource = fs.readFileSync(path.join(root, 'js/core/save-file.js'), 'utf8');
const curriculumSource = fs.readFileSync(path.join(root, 'js/core/curriculum.js'), 'utf8');

class Storage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  has(key) { return this.values.has(key); }
}

function makeStudent(storage, userId) {
  const systems = {};
  const context = {
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Boolean,
    Error,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    Event: class Event { constructor(type) { this.type = type; } },
    localStorage: storage,
    document: { dispatchEvent() {} },
    BoohaAdventure: {
      registerSystem(name, api) { systems[name] = api; },
    },
  };
  context.window = context;
  Object.defineProperty(context.BoohaAdventure, 'save', {
    enumerable: true,
    get() { return systems.saveFile || null; },
  });
  storage.setItem('booha_userid', userId);
  vm.createContext(context);
  vm.runInContext(saveSource, context, { filename: 'js/core/save-file.js' });
  context.BoohaSaveFile.init();
  vm.runInContext(curriculumSource, context, { filename: 'js/core/curriculum.js' });
  return context;
}

const sharedTablet = new Storage();
const studentA = makeStudent(sharedTablet, 'student-a');
assert.strictEqual(studentA.BoohaCurriculum.set('br'), true, 'student A should save Boo-riculum');
assert.strictEqual(studentA.BoohaSaveFile.load().meta.curriculum, 'br');

// Login cleanup removes only the short-lived mirror. It must not erase A's
// identity-scoped durable save before student B uses the same tablet.
sharedTablet.removeItem('booha_last_curr');
const studentB = makeStudent(sharedTablet, 'student-b');
assert.strictEqual(studentB.BoohaCurriculum.get(), null,
  'student B must not inherit A\'s curriculum on a shared tablet');
assert.strictEqual(sharedTablet.has('booha_last_curr'), false,
  'student B should see the picker until choosing a curriculum');

const studentAAgain = makeStudent(sharedTablet, 'student-a');
assert.strictEqual(studentAAgain.BoohaCurriculum.get(), 'br',
  'student A\'s durable curriculum must remain on the shared tablet');

// A second device starts with the synced save, then rehydrates the local
// compatibility mirror after syncReady.
const secondDevice = new Storage({ booha_userid: 'student-a' });
const studentAOnSecondDevice = makeStudent(secondDevice, 'student-a');
const synced = studentAAgain.BoohaSaveFile.load();
assert.strictEqual(studentAOnSecondDevice.BoohaSaveFile.save(synced), true,
  'second device should accept the synced student save');
secondDevice.removeItem('booha_last_curr');
assert.strictEqual(studentAOnSecondDevice.BoohaCurriculum.hydrateMirror(), 'br');
assert.strictEqual(secondDevice.getItem('booha_last_curr'), 'br',
  'sync hydration should restore the student curriculum mirror');

console.log('Curriculum identity-scope runtime passed: shared-tablet isolation, durable return, and second-device hydration hold.');
