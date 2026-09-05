#!/usr/bin/env node
'use strict';

// Pass 8 foundation audit. Keep this filesystem-only so verify.sh can catch
// a blank room, an unplaced slot, or a cache omission before deployment.
const assert = require('assert');
const { execFileSync } = require('child_process');
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
  'assets/img/grimmerglen/booha_change.mp3',
  'assets/img/grimmerglen/grimmerglen_bgm.mp3',
  'assets/img/grimmerglen/grimmerglen_dance.mp3'
];

const sandbox = { window: {} };
vm.runInNewContext(dataSource, sandbox, { filename: 'grimmerglen-data.js' });
const data = sandbox.window.GRIMMERGLEN_DATA;
assert(data, 'Grimmerglen data must export its runtime manifest');
assert.strictEqual(Object.keys(data.rooms).length, 15, 'the world must have 15 rooms');
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
  assert.strictEqual(new Set(answers).size, 3, `${type} must use a distinct sentence for Starter, Case, and Deep returns`);
  assert.strictEqual(data.memories[type].start.options.length, 3, `${type} Starter must show three complete helpers`);
  assert.strictEqual(data.memories[type].case.options.length, 3, `${type} Case must show three partial helpers`);
  assert(data.memories[type].case.optionsVisible === false, `${type} Case helpers must be hidden behind the hint control`);
  assert(data.memories[type].deep.options === null && data.memories[type].deep.helpText, `${type} Deep must remove English choices while retaining optional Furigana help`);
  assert(fs.existsSync(path.join(root, data.collectibles[type])), `${type} collectible art must exist`);
}
assert.strictEqual(new Set(allInstances).size, allInstances.length, 'collectible placements must not overlap exactly');
assert(!allInstances.some(instance => instance.startsWith('room_01:')), 'room_01 must never contain memory objects');
for (const [roomId, room] of Object.entries(data.rooms)) {
  for (const exit of room.exits || []) {
    assert(data.rooms[exit.to], `${roomId} must not point to a missing room`);
  }
}
const occupiedRooms = new Set(Object.values(data.objects).flat().map(slot => slot.room));
for (let roomNumber = 2; roomNumber <= 15; roomNumber++) {
  const roomId = `room_${String(roomNumber).padStart(2, '0')}`;
  assert(occupiedRooms.has(roomId), `${roomId} must contain at least one collectible`);
}

for (const room of Object.values(data.rooms)) {
  assert(fs.existsSync(path.join(root, room.bg)), `room art must exist: ${room.bg}`);
}
for (const pose of data.marietta.poses) assert(fs.existsSync(path.join(root, pose)), `Marietta art must exist: ${pose}`);
assert(fs.existsSync(path.join(root, data.booha.sprite)), 'Grimmerglen Booha art must exist');
for (const audio of audioFiles) assert(fs.existsSync(path.join(root, audio)), `audio must exist: ${audio}`);
const changeAudioProbe = JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-select_streams', 'a:0',
  '-show_entries', 'stream=codec_name,channels,bit_rate,sample_rate:format=duration',
  '-of', 'json', path.join(root, 'assets/img/grimmerglen/booha_change.mp3')
], { encoding: 'utf8' }));
const changeAudioStream = changeAudioProbe.streams && changeAudioProbe.streams[0];
assert(changeAudioStream && changeAudioStream.codec_name === 'mp3', 'Booha change cue must remain MP3-compatible');
assert.strictEqual(Number(changeAudioStream.channels), 1, 'Booha change cue must be mono');
assert(Number(changeAudioStream.bit_rate) >= 96000 && Number(changeAudioStream.bit_rate) <= 128000, 'Booha change cue must use a compact 96–128 kbps bitrate');
assert.strictEqual(Number(changeAudioStream.sample_rate), 44100, 'Booha change cue must use 44.1 kHz');
assert(Number(changeAudioProbe.format?.duration) >= 2.9 && Number(changeAudioProbe.format?.duration) <= 3.1, 'Booha change cue must be approximately three seconds');
assert.strictEqual(data.dance.marietta.length, 3, 'Marietta must have three dance frames');
assert.strictEqual(data.dance.booha.length, 3, 'Grimmerglen Booha must have three dance frames');
for (const frame of [...data.dance.marietta, ...data.dance.booha]) {
  assert(fs.existsSync(path.join(root, frame)), `dance art must exist: ${frame}`);
}
assert.deepStrictEqual(data.marietta && { x: data.marietta.x, y: data.marietta.y }, { x: 434, y: 504 }, 'Marietta must use the measured fixed position');
assert(data.rooms.room_10 && data.rooms.room_11 && data.rooms.room_12 && data.rooms.room_13 && data.rooms.room_14 && data.rooms.room_15, 'the six themed room expansion entries must exist');
assert.strictEqual(data.rooms.room_04.exits.find(exit => exit.dir === 'right').x, 1142, 'room_04 right exit must use the measured x coordinate');
assert.strictEqual(data.rooms.room_08.exits.find(exit => exit.dir === 'right').y, 456, 'room_08 right exit must use the measured y coordinate');
assert.strictEqual(data.rooms.room_09.exits.find(exit => exit.dir === 'up').y, 292, 'room_09 up exit must use the latest measured y coordinate');

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
assert(runtimeSource.includes('const OBJECT_DRAW_SIZE = 58'), 'collectible art must render near Grimmerglen Booha size');
assert(runtimeSource.includes('OBJECT_CLEARING_ZONES'), 'collectible art must use path-free clearing zones');
assert(runtimeSource.includes('reseedObjectLayout'), 'collectible coordinates must rotate on room visits');
assert(runtimeSource.includes('writeGrimmerglenCarriedObject(null)'), 'Booha must be able to drop a carried item for another');
assert(runtimeSource.includes('drawPastelVignette'), 'pastel room color must be applied as an edge vignette');
assert(runtimeSource.includes('drawEdgeLeaves'), 'room-colored leaves must drift around the edges');
assert(runtimeSource.includes('function getRoomExits'), 'room navigation must ignore missing destination rooms');
assert(runtimeSource.includes('clickCheckGrimmerglenObject'), 'runtime must support clicked pickups');
assert(runtimeSource.includes('checkGrimmerglenObjectProximity'), 'runtime must support approached pickups');
assert(runtimeSource.includes('GrimmerglenTyping.renderExercise'), 'pickup UI must use the shared typing engine');
assert(runtimeSource.includes('writeGrimmerglenObjectFound(object.type, object.id)'), 'successful pickup must persist exact object progress');
assert(runtimeSource.includes('objectSlots'), 'exact object slots must be persisted');
assert(runtimeSource.includes('getActiveGrimmerglenTargetType'), 'runtime must enforce one active object target at a time');
assert(runtimeSource.includes('activeTargetType'), 'active Grimmerglen target must persist across redraws');
assert(runtimeSource.includes("new Audio('assets/img/grimmerglen/booha_change.mp3')"), 'entry transformation must use the recorded Booha change cue');
assert(runtimeSource.includes('BOOHA_CHANGE_FALLBACK_MS'), 'entry transformation must derive its duration from the change audio');
assert(runtimeSource.includes('openBoohaChangePrompt'), 'entry transformation must wait for the readiness overlay');
assert(runtimeSource.includes('entryWelcomePending'), 'entry must wait for Marietta before object interaction begins');
assert(runtimeSource.includes('navigationUnlocked'), 'room navigation must have an explicit help-gated state');
assert(runtimeSource.includes('if (!state.navigationUnlocked) return;'), 'exit arrows must stay hidden until Marietta help is accepted');
assert(!runtimeSource.slice(runtimeSource.indexOf('function handleInput('), runtimeSource.indexOf('function bindInput(')).includes('if (state.entryWelcomePending) return;'), 'entry must remain walkable before help');
assert(runtimeSource.includes('unlockGrimmerglenNavigation'), 'Marietta help decision must unlock room navigation');
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
assert(/pages:\s+'booha-pages-2026-409'/.test(serviceWorker), 'page cache must be bumped for the performance pass');
// Perf pass: the install-time precache used to force all 15 room
// backgrounds, all 6 dance frames, all 5 Marietta poses, the 8
// collectibles, and the bgm/dance/change audio into the cache in one shot
// on every device (~35.5MB), stacking on top of whatever heavy world (often
// Karasuki, reached via its own portal) was already resident in memory --
// weak devices would stall hard enough for the audio buffer to buzz or the
// PWA to appear frozen. Those files are still cached, just lazily: the
// `${BASE}/assets/` prefix above makes every one of them cache-first the
// moment the app's own loaders actually request it (getImage()/
// preloadAdjacent() for rooms, ensureGrimmerglenDanceImages() for dance
// frames, the audio elements' own preload/play calls). The CORE_ASSETS
// install list must stay limited to the always-needed shell only.
const coreAssetsSource = serviceWorker.slice(serviceWorker.indexOf('const CORE_ASSETS = ['), serviceWorker.indexOf('const ASSET_PREFIXES = ['));
assert(!coreAssetsSource.includes('grimmerglen_bgm.mp3'), 'service worker must NOT eagerly precache Grimmerglen BGM -- lazy via startGrimmerglenMusic()');
assert(!coreAssetsSource.includes('grimmerglen_dance.mp3'), 'service worker must NOT eagerly precache Grimmerglen dance music -- lazy via playGrimmerglenDanceMusic()');
assert(!coreAssetsSource.includes('booha_change.mp3'), 'service worker must NOT eagerly precache the Booha change cue -- lazy via beginBoohaChange()');
assert(!coreAssetsSource.includes('grimmerglen/dance/'), 'service worker must NOT eagerly precache dance frame art -- lazy via ensureGrimmerglenDanceImages()');
assert(!coreAssetsSource.includes('grimmerglen/marietta/'), 'service worker must NOT eagerly precache all 5 Marietta poses');
assert(!coreAssetsSource.includes('grimmerglen/room_'), 'service worker must NOT eagerly precache all 15 room backgrounds -- lazy via preloadAdjacent()');
assert(!coreAssetsSource.includes('grimmerglen/collectibles/'), 'service worker must NOT eagerly precache the 8 collectibles');
assert(coreAssetsSource.includes('${BASE}/assets/img/grimmerglen/grimmerglen.css'), 'service worker must still precache the small always-needed Grimmerglen stylesheet');
assert(coreAssetsSource.includes('${BASE}/assets/img/grimmerglen/booha_grimmerglen_version_1.webp'), 'service worker must still precache the small always-needed default Booha sprite');
assert(/assets:\s+'booha-assets-2026-523'/.test(serviceWorker), 'asset cache must be bumped for the Grimmerglen eager-precache perf fix');

// The lazy loaders these files now depend on must actually exist and be
// wired to the right moments, not merely removed from CORE_ASSETS.
assert(runtimeSource.includes('function ensureGrimmerglenDanceImages'), 'dance frames must be built lazily, not at module load');
assert(runtimeSource.includes('let grimmerglenDanceImages = null;'), 'dance frame Images must not be constructed eagerly at module scope');
assert(runtimeSource.includes('ensureGrimmerglenDanceImages()'), 'the celebration must trigger the lazy dance-image build');
assert(/grimmerglenMusic\.preload = 'metadata'/.test(runtimeSource), 'Grimmerglen BGM must not preload="auto" -- that pulls the full 3.2MB file on every entry');
assert(/boohaChangeAudio\.preload = 'none'/.test(runtimeSource), 'the transformation cue must not preload until the change prompt is accepted');

assert(profile.includes('GRIMMERGLEN / MEMORY CASE FILE'), 'profile must use the Grimmerglen case-file header');
assert(profile.includes('grimmerglen-data.js'), 'profile must load the Grimmerglen manifest');
assert(profile.includes('BoohaUnlockSystem.isGrimmerglenUnlocked'), 'profile must keep the world dormant behind its gate');
assert(!unlockSource.includes('GRIMMERGLEN_BUILD_READY'), 'Grimmerglen must use the shared weekly gate now that it is shipped');
for (const profilePage of ['profile.html', 'adventure-profile.html', 'utsuroba-profile.html', 'muenba-profile.html']) {
  const source = fs.readFileSync(path.join(root, profilePage), 'utf8');
  assert(source.includes('id="pnet-grimmerglen"'), `${profilePage} must expose the Grimmerglen profile tab`);
  assert(source.includes('id="pnet-grimmerglen" hidden'), `${profilePage} must hide the Grimmerglen tab before the weekly gate`);
}
assert(profile.includes('clickTone'), 'profile must include the cute WebAudio click cue');
assert(profile.includes('memory-card'), 'profile must render the eight memory lanes');
assert(unlockSource.includes("grimmerglen:first_memory"), 'unlock system must define the first Grimmerglen memory achievement');
assert(unlockSource.includes("grimmerglen:all_memories"), 'unlock system must define the complete Grimmerglen achievement');
assert(unlockSource.includes("grimmerglen:rooms_explored"), 'unlock system must define the room exploration achievement');
assert(muenbaSource.includes('getMuenbaHuntGhostOrder'), 'Muenba must persist a randomized hunt order');
assert(muenbaSource.includes('randomizedMuenbaCases'), 'Muenba cases must follow the randomized hunt order');

console.log(`Grimmerglen audit passed: 15 rooms, ${allInstances.length} placed instances, typing pickup flow, and service-worker coverage.`);
