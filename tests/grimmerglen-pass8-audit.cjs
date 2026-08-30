#!/usr/bin/env node
'use strict';

// Pass 8 foundation audit. Keep this filesystem-only so verify.sh can catch
// a blank room, an unplaced slot, or a cache omission before deployment.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen-data.js'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const typingSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen-typing.js'), 'utf8');
const muenbaSource = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const unlockSource = fs.readFileSync(path.join(root, 'js', 'core', 'unlock-system.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'grimmerglen.html'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'grimmerglen-profile.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const audioFiles = [
  'assets/img/grimmerglen/grimmerglen_bgm.mp3',
  'assets/img/grimmerglen/grimmerglen_dance.mp3'
];

const sandbox = { window: {} };
vm.runInNewContext(dataSource, sandbox, { filename: 'grimmerglen-data.js' });
const data = sandbox.window.GRIMMERGLEN_DATA;
assert(data, 'Grimmerglen data must export its runtime manifest');
assert.strictEqual(Object.keys(data.rooms).length, 9, 'the world must have 9 rooms');
assert.strictEqual(data.objectTypes.length, 8, 'the world must have 8 collectible types');

const allInstances = [];
for (const type of data.objectTypes) {
  const slots = data.objects[type];
  assert.strictEqual(slots.length, 3, `${type} must have exactly 3 instances`);
  const rooms = new Set();
  slots.forEach((slot, index) => {
    assert(data.rooms[slot.room], `${type}-${index + 1} must name a real room`);
    assert(Number.isFinite(slot.x) && Number.isFinite(slot.y), `${type}-${index + 1} must have numeric coordinates`);
    assert(slot.x >= 60 && slot.x <= 1476 && slot.y >= 110 && slot.y <= 1010, `${type}-${index + 1} must stay inside the current world bounds`);
    assert(!rooms.has(slot.room), `${type}'s three copies must be in different rooms`);
    rooms.add(slot.room);
    allInstances.push(`${slot.room}:${slot.x},${slot.y}`);
  });
  assert(data.memories[type], `${type} must have typing memories`);
  assert(data.stories[type] && data.stories[type].en && data.stories[type].jp, `${type} must have a translated Marietta story`);
  const answers = [];
  for (const tier of ['start', 'case', 'deep']) {
    const exercise = data.memories[type][tier];
    assert(exercise && exercise.promptEn && exercise.accepted?.length, `${type} must have a complete ${tier} exercise`);
    answers.push(exercise.accepted[0]);
  }
  assert.strictEqual(new Set(answers).size, 1, `${type} must repeat the same sentence across all three returns`);
  assert.strictEqual(data.memories[type].start.options.length, 3, `${type} Starter must show three complete helpers`);
  assert.strictEqual(data.memories[type].case.options.length, 3, `${type} Case must show three partial helpers`);
  assert(data.memories[type].deep.options === null && data.memories[type].deep.helpText, `${type} Deep must use optional Furigana help`);
  assert(fs.existsSync(path.join(root, data.collectibles[type])), `${type} collectible art must exist`);
}
assert.strictEqual(new Set(allInstances).size, allInstances.length, 'collectible placements must not overlap exactly');

for (const room of Object.values(data.rooms)) {
  assert(fs.existsSync(path.join(root, room.bg)), `room art must exist: ${room.bg}`);
}
for (const pose of data.marietta.poses) assert(fs.existsSync(path.join(root, pose)), `Marietta art must exist: ${pose}`);
assert(fs.existsSync(path.join(root, data.booha.sprite)), 'Grimmerglen Booha art must exist');
for (const audio of audioFiles) assert(fs.existsSync(path.join(root, audio)), `audio must exist: ${audio}`);
assert.strictEqual(data.dance.marietta.length, 3, 'Marietta must have three dance frames');
assert.strictEqual(data.dance.booha.length, 3, 'Grimmerglen Booha must have three dance frames');
for (const frame of [...data.dance.marietta, ...data.dance.booha]) {
  assert(fs.existsSync(path.join(root, frame)), `dance art must exist: ${frame}`);
}

const scripts = [
  'js/calendar.js', 'js/core/adventure-core.js', 'js/core/save-file.js',
  'js/sync-client.js', 'js/core/save-utils.js', 'js/core/game-registry.js',
  'js/core/score-system.js', 'js/core/unlock-system.js', 'js/core/page-state.js',
  'js/utsu-card.js', 'js/utsu-sfx.js', 'js/utsu-furigana.js',
  'js/grimmerglen-data.js', 'js/grimmerglen-typing.js', 'js/grimmerglen.js'
];
let previous = page.indexOf('<body>');
assert(previous >= 0, 'grimmerglen.html must have a body');
for (const script of scripts) {
  const index = page.indexOf(`<script src="${script}"></script>`);
  assert(index > previous, `${script} must load after the prior Grimmerglen dependency`);
  assert(fs.existsSync(path.join(root, script)), `${script} must exist`);
  previous = index;
}

assert(runtimeSource.includes('drawGrimmerglenObjects'), 'runtime must draw scattered objects');
assert(runtimeSource.includes('clickCheckGrimmerglenObject'), 'runtime must support clicked pickups');
assert(runtimeSource.includes('checkGrimmerglenObjectProximity'), 'runtime must support approached pickups');
assert(runtimeSource.includes('GrimmerglenTyping.renderExercise'), 'pickup UI must use the shared typing engine');
assert(runtimeSource.includes('writeGrimmerglenObjectFound(object.type, object.id)'), 'successful pickup must persist exact object progress');
assert(runtimeSource.includes('objectSlots'), 'exact object slots must be persisted');
assert(runtimeSource.includes('getActiveGrimmerglenTargetType'), 'runtime must enforce one active object target at a time');
assert(runtimeSource.includes('activeTargetType'), 'active Grimmerglen target must persist across redraws');
assert(runtimeSource.includes('BOOHA_TRANSFORM_DURATION_MS = 5000'), 'entry transformation must last five seconds');
assert(runtimeSource.includes('entryWelcomePending'), 'entry must wait for Marietta before object interaction begins');
assert(!runtimeSource.includes('openMariettaPanelAfterEntry();'), 'Marietta popup must not auto-open on entry');
assert(runtimeSource.includes('renderMariettaHandoff'), 'Marietta must receive carried objects before the quiz');
assert(runtimeSource.includes('renderMariettaWrongItem'), 'wrong items must be rejected and returned to the hunt');
assert(runtimeSource.includes("assets/img/grimmerglen/grimmerglen_bgm.mp3"), 'runtime must reference Grimmerglen BGM');
assert(runtimeSource.includes("assets/img/grimmerglen/grimmerglen_dance.mp3"), 'runtime must reference Grimmerglen dance music');
assert(runtimeSource.includes('startGrimmerglenMusic'), 'runtime must start room music from a user gesture');
assert(runtimeSource.includes('playGrimmerglenDanceMusic'), 'runtime must expose synchronized dance playback');
assert(runtimeSource.includes('drawGrimmerglenCelebration'), 'runtime must draw the center-room celebration');
assert(runtimeSource.includes('GRIMMERGLEN_DANCE_FRAME_MS'), 'runtime must alternate the three dance frames');
assert(!runtimeSource.includes('openGrimmerglenObjectPanel'), 'object pickup must not open the typing quiz immediately');
assert(typingSource.includes('function renderExercise'), 'typing engine must expose renderExercise');
assert(serviceWorker.includes('${BASE}/grimmerglen.html'), 'service worker must precache grimmerglen.html');
assert(serviceWorker.includes('${BASE}/grimmerglen-profile.html'), 'service worker must precache the Grimmerglen profile');
for (const asset of ['grimmerglen-data.js', 'grimmerglen-typing.js', 'grimmerglen.js']) {
  assert(serviceWorker.includes(`\${BASE}/js/${asset}`), `service worker must precache ${asset}`);
}
assert(serviceWorker.includes('`${BASE}/js/`'), 'service worker must cache Grimmerglen JS at runtime');
assert(serviceWorker.includes('`${BASE}/assets/`'), 'service worker must cache Grimmerglen art at runtime');
assert(serviceWorker.includes('${BASE}/assets/img/grimmerglen/grimmerglen_bgm.mp3'), 'service worker must precache Grimmerglen BGM');
assert(serviceWorker.includes('${BASE}/assets/img/grimmerglen/grimmerglen_dance.mp3'), 'service worker must precache Grimmerglen dance music');
assert(/pages:\s+'booha-pages-2026-377'/.test(serviceWorker), 'page cache must be bumped for the entry pass');
assert(serviceWorker.includes('grimmerglen/dance/marietta_dance_'), 'service worker must precache Marietta dance art');
assert(serviceWorker.includes('grimmerglen/dance/booha_grimmerglen_dance_'), 'service worker must precache Booha dance art');
assert(/assets:\s+'booha-assets-2026-434'/.test(serviceWorker), 'asset cache must be bumped for the entry pass');

assert(profile.includes('GRIMMERGLEN / MEMORY CASE FILE'), 'profile must use the Grimmerglen case-file header');
assert(profile.includes('grimmerglen-data.js'), 'profile must load the Grimmerglen manifest');
assert(profile.includes('BoohaUnlockSystem.isGrimmerglenUnlocked'), 'profile must keep the world dormant behind its gate');
assert(unlockSource.includes('const GRIMMERGLEN_BUILD_READY = false'), 'Grimmerglen must remain closed outside DEV tools');
for (const profilePage of ['profile.html', 'adventure-profile.html', 'utsuroba-profile.html', 'muenba-profile.html']) {
  const source = fs.readFileSync(path.join(root, profilePage), 'utf8');
  assert(source.includes('id="pnet-grimmerglen"'), `${profilePage} must expose the Grimmerglen profile tab`);
  assert(!source.includes('id="pnet-grimmerglen" hidden'), `${profilePage} must not hide the safe profile tab`);
}
assert(profile.includes('clickTone'), 'profile must include the cute WebAudio click cue');
assert(profile.includes('memory-card'), 'profile must render the eight memory lanes');
assert(unlockSource.includes("grimmerglen:first_memory"), 'unlock system must define the first Grimmerglen memory achievement');
assert(unlockSource.includes("grimmerglen:all_memories"), 'unlock system must define the complete Grimmerglen achievement');
assert(unlockSource.includes("grimmerglen:rooms_explored"), 'unlock system must define the room exploration achievement');
assert(muenbaSource.includes('getMuenbaHuntGhostOrder'), 'Muenba must persist a randomized hunt order');
assert(muenbaSource.includes('randomizedMuenbaCases'), 'Muenba cases must follow the randomized hunt order');

console.log(`Grimmerglen Pass 8 audit passed: 9 rooms, ${allInstances.length} placed instances, typing pickup flow, and service-worker coverage.`);
