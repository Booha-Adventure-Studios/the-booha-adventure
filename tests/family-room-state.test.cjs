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
assert(source.includes('realTellChance: 1') && source.includes('realTellChance: .55') && source.includes('realTellChance: .3'), 'each tier must tune whether the presence tell is available');
assert(source.includes('falseAlertChance: .25') && source.includes('falseAlertPoint') && source.includes('const shouldTell = tellAvailable'), 'the Lies tier must support uncertain and false proximity alerts');
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
assert(source.includes('const PATASKALA_POSES = [') && source.includes("character: 'pataskala'"), 'Pataskala must have a named character anomaly set');
assert(source.includes('assets/family-room/pataskala/${pose.id}.webp') && ['pataskala-standing', 'pataskala-moving', 'pataskala-crouch', 'pataskala-emerging'].every(id => fs.existsSync(path.join(root, `assets/family-room/pataskala/${id}.webp`))), 'all Pataskala poses must load as authored transparent assets');
assert(source.includes('function pataskalaChance') && source.includes('if (round < 2) return 0'), 'Pataskala must emerge progressively after the opening cases');
assert(source.includes("selectedTier === 'lies' ? PATASKALA_POSES.length - 1 : 2"), 'the emerging Pataskala pose must be reserved for the Lies tier');
assert(source.includes('MARK_DEAD_ZONE_PX = 8') && source.includes('markHoldOrigin'), 'touch marking must tolerate small pointer tremor');
assert(source.includes('plate.w * anomaly.artSize') && source.includes('plate.w * target[2]'), 'anomaly sizing and alert radii must follow the room plate');
assert(source.includes('drawAnomaly(currentAnomaly);') && source.includes("light.addColorStop(1, 'rgba(0,0,0,.84)')"), 'anomalies must be faintly visible outside the lantern and the light rim must blend into the room');
assert(source.includes('markedPoint = [booha.targetX, booha.targetY, lightRadius()]') && source.includes('markRadius'), 'marking must judge whether the anomaly is inside the lantern at lock time');
assert(source.includes('Math.min(width, height) * .1') && source.includes('52, 92'), 'Booha must leave more of the lantern reveal unobstructed');
const anchorUs = [...source.matchAll(/target:\s*\[\s*(0?\.\d+)/g)].map(match => Number(match[1]));
assert(anchorUs.length === 14 && anchorUs.every(value => value >= .22 && value <= .78), 'all environmental and Pataskala anchors must stay inside the portrait-safe band');
assert(source.includes('const FAMILY_AUDIO = Object.freeze') && source.includes('family_BGM.mp3') && source.includes('family_jump-2.mp3'), 'the Family Room audio set must be declared');
assert(source.includes('const FAMILY_SFX_NAMES') && source.includes('function loadAudioBuffer') && source.includes('function loadAudioBuffers') && source.includes('function startBgm') && source.includes('function playSfx'), 'Family Room audio must use the shared WebAudio lifecycle');
assert(source.includes('sfxLoadPromise') && source.includes('bgmLoadPromise') && source.includes('Promise.allSettled'), 'small Family Room cues must load independently of the long BGM');
assert(source.includes('AUDIO_LEVELS = Object.freeze') && source.includes('master: .72'), 'Family Room audio must use a capped master volume');
assert(source.includes("playSfx('move', AUDIO_LEVELS.move)") && source.includes("playSfx('anomaly', AUDIO_LEVELS.anomaly)"), 'movement and anomaly cues must be connected to gameplay');
assert(source.includes('jumpLevel: .24') && source.includes('jumpLevel: .4') && source.includes('jumpLevel: .58') && source.includes('playSfx(Math.random() < .5 ? \'jump1\' : \'jump2\', jumpLevel)'), 'failure must choose one of the two jump-scare screams at the room tier volume');
assert(serviceWorker.includes("`${BASE}/assets/`"), 'Family Room audio must use the runtime asset cache path');
assert(['pataskala-standing', 'pataskala-moving', 'pataskala-crouch', 'pataskala-emerging'].every(id => serviceWorker.includes(`/assets/family-room/pataskala/${id}.webp`)), 'all Pataskala poses must be install-safe');
assert(source.includes('function requestFamilyRuntimeCache') && source.includes("type: 'CACHE_URLS'"), 'Family Room must ask the service worker to retain deferred media after entry');
assert(!serviceWorker.includes('/assets/family-room/audio/family_BGM.mp3'), 'the long Family Room BGM must not enter the install-time core cache');
assert(markup.includes('id="leave-button"') && markup.includes('REPORT THE ROOM') && source.includes('REPORT & CONTINUE'), 'the room must use one explicit report/continue button');
assert(markup.includes('id="start-button"') && markup.includes('ENTER THE ROOM') && markup.includes('へやに はいる'), 'the start action must clearly say enter the room in both languages');
assert(markup.includes('id="back-button"') && markup.includes('BACK TO PROFILE'), 'back must be reserved for leaving the game');
assert(markup.includes('id="observation-en"') && markup.includes('id="observation-jp"') && source.includes('HOLD BOOHA STILL'), 'marking guidance must have paired English and Japanese lines');
assert(markup.includes('message-title-en') && markup.includes('message-title-jp') && markup.includes('message-button-en') && markup.includes('message-button-jp'), 'message panels must render bilingual pairs');
assert(source.includes('function setBilingual') && source.includes('function setObservation') && source.includes('function setReportLabel'), 'dynamic room states must update both language lines together');

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

const ids = ['room-canvas', 'controls', 'start-panel', 'message-panel', 'message-kicker', 'message-title', 'message-copy', 'message-button', 'message-kicker-en', 'message-kicker-jp', 'message-title-en', 'message-title-jp', 'message-copy-en', 'message-copy-jp', 'message-button-en', 'message-button-jp', 'transition-curtain', 'observation-note', 'observation-en', 'observation-jp', 'andon', 'clue-card', 'clue-en', 'clue-jp', 'sound-toggle', 'sound-state', 'sound-state-jp', 'flame-meter', 'start-button', 'back-button', 'leave-button', 'leave-en', 'leave-jp'];
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
  nodes['room-canvas'].onpointerdown({ clientX: 235, clientY: 476 });
  nodes['leave-button'].onclick();
}

assert.strictEqual(events.length, 1, 'a complete case must emit one game-end event');
assert.strictEqual(events[0].saveId, 'bonus:family_room');
assert.strictEqual(events[0].completed, true);
assert.strictEqual(events[0].score, 7, 'the submitted score must be marked changes, not elapsed time');
console.log('Family Room state-machine audit passed: hidden progression, lantern recovery, marking, and gameEnd contract work.');
