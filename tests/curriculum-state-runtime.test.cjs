const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const storage = new Map();
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
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  },
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

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/core/save-file.js'), 'utf8'), context);
storage.set('booha_userid', 'student-a');
context.BoohaSaveFile.init();
vm.runInContext(fs.readFileSync(path.join(root, 'js/core/curriculum.js'), 'utf8'), context);

assert.strictEqual(context.BoohaCurriculum.get(), null, 'new saves begin without a curriculum');
assert.strictEqual(context.BoohaCurriculum.set('br'), true, 'valid curriculum should save');
assert.strictEqual(context.BoohaSaveFile.load().meta.curriculum, 'br', 'curriculum belongs in meta');
assert.strictEqual(storage.get('booha_last_curr'), 'br', 'save should update the compatibility mirror');

storage.set('booha_last_curr', 'bc');
assert.strictEqual(context.BoohaCurriculum.get(), 'br', 'saved curriculum must beat the local mirror');

const data = context.BoohaSaveFile.load();
data.meta.curriculum = null;
context.BoohaSaveFile.save(data);
context.BoohaCurriculum.hydrateMirror();
assert.strictEqual(storage.has('booha_last_curr'), false, 'missing saved curriculum must clear an old mirror');
assert.strictEqual(context.BoohaCurriculum.get(), null, 'student without a saved curriculum must return null');

storage.set('booha_last_curr', 'bc');
const invalid = context.BoohaSaveFile.load();
invalid.meta.curriculum = 'not-a-track';
context.BoohaSaveFile.save(invalid);
assert.strictEqual(context.BoohaSaveFile.load().meta.curriculum, null, 'migration must reject invalid curriculum values');

console.log('curriculum state runtime: passed');
