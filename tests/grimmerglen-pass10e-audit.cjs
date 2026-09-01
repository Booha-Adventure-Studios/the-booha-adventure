#!/usr/bin/env node
'use strict';

// Pass 10E: memory clues stay private until the weekly quest is accepted,
// found objects brighten, replay is final-tier only, and each partial return
// tells the player exactly how many objects remain.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'grimmerglen-profile.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const saveFile = fs.readFileSync(path.join(root, 'js', 'core', 'save-file.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert.match(profile, /memoryQuestAccepted/, 'profile must read weekly quest acceptance');
assert.match(profile, /memory-locked-state/, 'profile must show a locked state before quest acceptance');
assert.match(profile, /data-found="\$\{weeklyFound > 0\}"/, 'profile must mark each memory art by weekly found state');
assert.match(profile, /memory-card\[data-found="false"\] \.memory-art/, 'unfound memory art must be dimmed');
assert.match(profile, /memory-card\[data-found="true"\] \.memory-art/, 'found memory art must be restored');

assert.match(saveFile, /memoryQuestAccepted: false/, 'weekly schema must default the quest acceptance flag to false');
assert.match(runtime, /world\.memoryQuestAccepted === undefined/, 'runtime schema must normalize the quest acceptance flag');
assert.match(runtime, /writeGrimmerglenWeekly\(\{ memoryQuestAccepted: true \}\)/, 'accepting Marietta\'s quest must persist weekly visibility');

const exerciseStart = runtime.indexOf('function renderMariettaMemoryExercise(');
const exerciseEnd = runtime.indexOf('function renderMariettaMemoryReplay(', exerciseStart);
assert(exerciseStart >= 0 && exerciseEnd > exerciseStart, 'memory exercise renderer must be present');
const exercise = runtime.slice(exerciseStart, exerciseEnd);
assert.match(exercise, /const recheckHTML = returnNumber === 3/, 'replay control must be limited to the third memory return');
assert.match(exercise, /Check again \/ \$\{furiJP\(/, 'final replay control must say Check again');
assert.match(exercise, /mg-memory-recheck/, 'final replay control must have dedicated button styling');

const successStart = runtime.indexOf('function renderMariettaMemorySuccess(');
const successEnd = runtime.indexOf('function finishGrimmerglenCelebration(', successStart);
assert(successStart >= 0 && successEnd > successStart, 'memory success renderer must be present');
const success = runtime.slice(successStart, successEnd);
assert.match(success, /remainingForMemory === 2/, 'first partial return must calculate two remaining items');
assert.match(success, /あと二つ！/, 'first partial return must include furigana Japanese for two more');
assert.match(success, /remainingForMemory === 1/, 'second partial return must calculate one remaining item');
assert.match(success, /あと一つ！/, 'second partial return must include furigana Japanese for one more');

assert.match(verify, /tests\/grimmerglen-pass10e-audit\.cjs/, 'verify.sh must run the Pass 10E audit');

console.log('Grimmerglen Pass 10E audit passed: quest-gated memories, found-state dimming, final replay, and remaining-item cues are wired.');
