#!/usr/bin/env node
'use strict';

// Grimmerglen Content Pass 2: authored tiers must be consumed by the live
// quest, typing, replay, and profile renderers.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const data = fs.readFileSync(path.join(root, 'js', 'grimmerglen-data.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'grimmerglen-profile.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(data.includes('Object.keys(MEMORY_TIERS)'), 'exercise builder must consume the tiered authoring source');
assert(data.includes("['start', 'case', 'deep'].forEach(tier =>"), 'exercise builder must create all three tiers');
assert(data.includes("options: tier === 'start' ? item.full : tier === 'case' ? item.partial : item.full"), 'each tier must receive its intended helper choices');
assert(data.includes('optionsVisible: tier === \'start\''), 'only Starter helpers may be visible immediately');
assert(data.includes('accepted: [item.target.replace'), 'each tier must expose its own accepted answer');

assert(runtime.includes('function getGrimmerglenMemoryStory(type)'), 'runtime must resolve the active tier story');
assert(runtime.includes('DATA.tierMemories?.[type]?.[tier]?.story'), 'runtime story resolver must read tiered content');
assert(!runtime.match(/const story = targetType && DATA\.stories \? DATA\.stories\[targetType\]/), 'live story surfaces must not use the legacy story lookup directly');
assert(runtime.includes('function renderMariettaMemoryReplay(object, memoryComplete, onClose, memoryTier = \'deep\')'), 'replay must accept the completed memory tier');
assert(runtime.includes('DATA.memories?.[object.type]?.[memoryTier]'), 'replay must show the selected tier answer');
assert(runtime.includes('const completedTier = getGrimmerglenObjectsProgress()[object.type]?.tier'), 'completion must capture the tier before progress advances');
assert(runtime.includes('memoryTier: completedTier'), 'completion must pass the captured tier to the success card');

assert(profile.includes('const tierForFound = weeklyFound >= 3 ? \'deep\' : weeklyFound === 2 ? \'case\' : \'start\';'), 'profile must derive the visible story tier from weekly progress');
assert(profile.includes('DATA.tierMemories?.[type]?.[tierForFound]?.story?.en'), 'profile must display the active tier story');
assert(verify.includes('tests/grimmerglen-content-pass2-wiring-audit.cjs'), 'verify.sh must run the Grimmerglen Content Pass 2 wiring audit');

console.log('Grimmerglen Content Pass 2 audit passed: tiered exercises, active stories, tier replay, and profile wiring are live.');
