#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'family-room.js'), 'utf8');
const markup = fs.readFileSync(path.join(root, 'family-room.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert(!source.includes('round-number'), 'the case must not expose a round counter');
assert(!source.includes('localStorage'), 'the room must use the shared save/event layer');
assert(!source.includes('creature-1'), 'the photoreal creature beat must be retired');
assert(source.includes('saveId: SAVE_ID'), 'the room must submit a registered save id');
assert(source.includes('progress = Math.max(0, progress - 1)'), 'wrong calls must lower hidden case progress');
assert(source.includes('if (flames < MAX_FLAMES) flames += 1'), 'a correct mark must return lantern light only below maximum');
assert(source.includes('function retryRound()') && source.includes('chooseRound();'), 'a wrong call must reroll the room before retrying');
assert(!source.includes("['pb:vocab', 'pb:sentence', 'pb:question']"), 'tier gates must not be hard-coded to Pre-Boo');
assert(source.includes("const curriculums = ['pb', 'br', 'bc'];") && source.includes('`${curriculum}:${type}`'), 'tier gates must read Blitz stamps across all curricula');
assert(!source.includes("state = 'marking'"), 'marking must be part of observation, not a separate phase');
assert(!source.includes('beginMarking') && !source.includes('mark-skip'), 'the old marking detour must be retired');
assert(source.includes('MARK_HOLD_MS = 600') && source.includes('lockMark'), 'marking must require a hold before it locks');
assert(source.includes('lightRadius') && source.includes('moveBooha'), 'Booha movement must drive the lantern reveal');
assert(source.includes('alertMultiplier: 2') && source.includes('alertMultiplier: 1.2') && source.includes('alertMultiplier: 1'), 'alert distance must scale with the room tier');
assert(source.includes('falseAlertChance: .15') && source.includes('falseAlertPoint'), 'the Lies tier must support false proximity alerts');
assert(source.includes('function isBoohaAlerting()') && source.includes('currentPoint(target)'), 'Booha alerting must be proximity-based');
assert(!source.includes('time - roundStarted > 2100'), 'the alert sprite must not be a timed giveaway');
assert(source.includes('burnMs: 25000') && source.includes('burnMs: 18000') && source.includes('burnMs: 12000'), 'each room tier must have its own lantern burn window');
assert(source.includes('function handleBurnout(time)') && source.includes('flames = Math.max(0, flames - 1)'), 'burnout must cost one flame');
assert(source.includes('function updateAndon') && source.includes('THE ANDON WENT DARK'), 'the lantern clock must use a dimming andon, not a number');
assert(markup.includes('id="andon"') && markup.includes('ROOM LIGHT'), 'the lantern burn indicator must have a corner status element');
assert(source.includes('function drawShojiDawn') && source.includes('progress / CASE_ROUNDS'), 'case progress must brighten the shoji without a counter');
assert(source.includes('FAILURE_SILENCE_MS = 1200') && source.includes('function beginFailure'), 'lantern failure must include a silent beat before the panel');
assert(source.includes('function silenceDrone') && source.includes('setValueAtTime(0'), 'the failure beat must stop the drone immediately');
assert(source.includes('function drawFailureBooha') && source.includes('if (time - failureStarted >= FAILURE_SILENCE_MS)'), 'Booha must glow alone after the silence');
assert(source.includes('const anomalyArt = Object.fromEntries') && source.includes('assets/family-room/overlays/${anomaly.id}.webp'), 'anomalies must load authored room overlays');
assert(source.includes('artSize') && source.includes('ctx.drawImage(art'), 'anomaly rendering must use real art instead of procedural doodles');
assert(['bowl', 'cup', 'eyes', 'shadow', 'talisman', 'lantern', 'futon', 'seams', 'teapot', 'crescent'].every(id => serviceWorker.includes(`/assets/family-room/overlays/${id}.webp`)), 'all authored anomaly overlays must be precached');
assert(markup.includes('id="leave-button"') && markup.includes('LEAVE THE ROOM'), 'the room must use one leave/report button');

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

const ids = ['room-canvas', 'controls', 'start-panel', 'message-panel', 'message-kicker', 'message-title', 'message-copy', 'message-button', 'transition-curtain', 'observation-note', 'andon', 'clue-card', 'clue-en', 'clue-jp', 'sound-toggle', 'sound-state', 'flame-meter', 'start-button', 'leave-button'];
const nodes = Object.fromEntries(ids.map(id => [id, element(id)]));
nodes['andon'].style.setProperty = (name, value) => { nodes['andon'].style[name] = value; };
const flames = [0, 1, 2].map(index => Object.assign(element(`flame-${index}`), { dataset: { flame: String(index) } }));
const listeners = {};
nodes['room-canvas'].getContext = () => ({
  setTransform() {}, clearRect() {}, fillRect() {}, drawImage() {}, save() {}, restore() {},
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }),
  beginPath() {}, ellipse() {}, fill() {}, arc() {}, stroke() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {},
  fillText() {}, scale() {}, clip() {},
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
  nodes['room-canvas'].onpointerdown({ clientX: 174, clientY: 645 });
  nodes['leave-button'].onclick();
}

assert.strictEqual(events.length, 1, 'a complete case must emit one game-end event');
assert.strictEqual(events[0].saveId, 'bonus:family_room');
assert.strictEqual(events[0].completed, true);
assert.strictEqual(events[0].score, 7, 'the submitted score must be marked changes, not elapsed time');
console.log('Family Room state-machine audit passed: hidden progression, lantern recovery, marking, and gameEnd contract work.');
