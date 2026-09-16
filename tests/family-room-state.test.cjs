#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'family-room.js'), 'utf8');
assert(!source.includes('round-number'), 'the case must not expose a round counter');
assert(!source.includes('localStorage'), 'the room must use the shared save/event layer');
assert(!source.includes('creature-1'), 'the photoreal creature beat must be retired');
assert(source.includes('saveId: SAVE_ID'), 'the room must submit a registered save id');
assert(source.includes('progress = Math.max(0, progress - 1)'), 'wrong calls must lower hidden case progress');
assert(source.includes('if (flames < MAX_FLAMES) flames += 1'), 'a correct mark must return lantern light only below maximum');
assert(source.includes('function retryRound()') && source.includes('chooseRound();'), 'a wrong call must reroll the room before retrying');
assert(!source.includes("['pb:vocab', 'pb:sentence', 'pb:question']"), 'tier gates must not be hard-coded to Pre-Boo');
assert(source.includes("const curriculums = ['pb', 'br', 'bc'];") && source.includes('`${curriculum}:${type}`'), 'tier gates must read Blitz stamps across all curricula');

function classList() {
  const values = new Set();
  return {
    add: (...items) => items.forEach(item => values.add(item)),
    remove: (...items) => items.forEach(item => values.delete(item)),
    toggle: (item, force) => force === undefined ? (values.has(item) ? values.delete(item) : values.add(item)) : (force ? values.add(item) : values.delete(item)),
    contains: item => values.has(item),
  };
}

function element(id) {
  return {
    id, hidden: false, dataset: {}, classList: classList(), attributes: {}, style: {}, textContent: '', onclick: null,
    addEventListener(type, handler) { this[`on${type}`] = handler; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() {},
  };
}

const ids = ['room-canvas', 'controls', 'start-panel', 'message-panel', 'message-kicker', 'message-title', 'message-copy', 'message-button', 'transition-curtain', 'observation-note', 'mark-prompt', 'mark-skip', 'clue-card', 'clue-en', 'clue-jp', 'sound-toggle', 'sound-state', 'flame-meter', 'start-button', 'straight-button', 'back-button'];
const nodes = Object.fromEntries(ids.map(id => [id, element(id)]));
nodes['straight-button'].dataset = { choice: 'straight' };
nodes['back-button'].dataset = { choice: 'back' };
const flames = [0, 1, 2].map(index => Object.assign(element(`flame-${index}`), { dataset: { flame: String(index) } }));
const listeners = {};
nodes['room-canvas'].getContext = () => ({
  setTransform() {}, clearRect() {}, fillRect() {}, drawImage() {}, save() {}, restore() {},
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }),
  beginPath() {}, ellipse() {}, fill() {}, arc() {}, stroke() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {},
  fillText() {}, scale() {},
});
nodes['room-canvas'].getBoundingClientRect = () => ({ left: 0, top: 0 });
function canvasElement() {
  return { width: 0, height: 0, getContext: nodes['room-canvas'].getContext };
}

const events = [];
const deterministicMath = Object.create(Math);
deterministicMath.random = () => 0.599;
const document = {
  readyState: 'complete',
  getElementById: id => nodes[id],
  createElement: tag => tag === 'canvas' ? canvasElement() : element(tag),
  querySelectorAll: selector => selector === '[data-flame]' ? flames : [],
  addEventListener(type, handler) { listeners[type] = handler; },
  dispatchEvent(event) { if (event.type === 'booha:gameEnd') events.push(event.detail); },
};
let now = 0;
const context = {
  console: { warn() {}, error() {} }, document,
  window: {
    innerWidth: 1024, innerHeight: 1536, devicePixelRatio: 1,
    location: { origin: 'https://example.test', href: 'https://example.test/family-room.html' },
    matchMedia: () => ({ matches: false }),
    addEventListener(type, handler) { listeners[`window:${type}`] = handler; },
    setTimeout: fn => { fn(); return 1; }, clearTimeout() {}, history: { back() {} },
  },
  performance: { now: () => (now += 100) },
  Image: function Image() { this.complete = true; this.naturalWidth = 1024; this.naturalHeight = 1536; },
  CustomEvent: function CustomEvent(type, init) { return { type, ...(init || {}) }; },
  requestAnimationFrame: () => 1, cancelAnimationFrame() {}, Math: deterministicMath,
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'family-room.js' });

nodes['start-button'].onclick();
for (let index = 0; index < 7; index += 1) {
  nodes['back-button'].onclick();
  assert.strictEqual(nodes['mark-prompt'].hidden, false, 'anomaly calls must offer optional marking');
  nodes['room-canvas'].onpointerdown({ clientX: 174, clientY: 645 });
}

assert.strictEqual(events.length, 1, 'a complete case must emit one game-end event');
assert.strictEqual(events[0].saveId, 'bonus:family_room');
assert.strictEqual(events[0].completed, true);
assert.strictEqual(events[0].score, 7, 'the submitted score must be marked changes, not elapsed time');
console.log('Family Room state-machine audit passed: hidden progression, lantern recovery, marking, and gameEnd contract work.');
