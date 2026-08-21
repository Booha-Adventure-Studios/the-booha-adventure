#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const utsuroba = fs.readFileSync(path.join(ROOT, 'js', 'utsuroba.js'), 'utf8');
const reading = fs.readFileSync(path.join(ROOT, 'js', 'utsuroba-reading.js'), 'utf8');
const data = fs.readFileSync(path.join(ROOT, 'js', 'utsuroba-data.js'), 'utf8');

assert.match(utsuroba, /readingJournal/, 'Utsuroba save migration must initialize the reading journal');
assert.match(utsuroba, /readingJournalButton/, 'Utsuroba must expose the journal from the world UI');
assert.match(utsuroba, /data-journal-entry/, 'Journal entries must have replay controls');
assert.match(utsuroba, /wordCabinet/, 'Utsuroba save migration must initialize the Word Cabinet');
assert.match(utsuroba, /data-cabinet-word/, 'Journal must expose interactive vocabulary entries');
assert.match(utsuroba, /definitionJP/, 'Word Cabinet entries must retain simple Japanese help');
assert.match(utsuroba, /readingEchoes/, 'Restored memories must create weekly world echoes');
assert.match(utsuroba, /renderMemoryEchoes/, 'Utsuroba must render restored memory echoes');
assert.match(utsuroba, /readingOnboarding/, 'Reading onboarding state must persist in the save');
assert.match(utsuroba, /persistReadingOnboarding/, 'Utsuroba must persist the reading calibration choice');
assert.match(utsuroba, /restoredGreeting/, 'Drifters must have post-memory dialogue');
assert.match(utsuroba, /openMemoryConvergence/, 'Utsuroba must expose the world-level convergence scene');
assert.match(utsuroba, /convergenceSeen/, 'Convergence completion must persist');
assert.match(utsuroba, /data-convergence-clue-choice/, 'Convergence must require evidence selection before the final question');
assert.match(utsuroba, /openMemoryGarden/, 'Convergence completion must expose the persistent Memory Garden');
assert.match(utsuroba, /memory-garden-quote/, 'Memory Garden must show the shared drifter aftermath');
assert.match(utsuroba, /convergenceGreeting/, 'Drifters must acknowledge the completed convergence');
assert.match(data, /readingConvergence/, 'Utsuroba data must define the world-level reading convergence');
assert.match(data, /clueChecks/, 'Convergence data must define authored evidence checks');
assert.match(data, /cluePromptJP/, 'Convergence evidence instructions must include simple Japanese support');
assert.match(data, /garden/, 'Convergence data must define the persistent Memory Garden');
assert.match(utsuroba, /masteryLevel/, 'Journal entries must persist adaptive reading mastery');
assert.match(utsuroba, /recordReadingReview/, 'Review results must update the learner reading state');
assert.match(utsuroba, /recordWordPracticeResult/, 'Word practice must persist vocabulary review results');
assert.match(utsuroba, /reading-word-practice-start/, 'Journal must expose optional word practice');
assert.match(utsuroba, /nextReviewAt/, 'Vocabulary must use a return schedule');
assert.match(utsuroba, /recordReadingPostcard/, 'Postcards must persist in the Reading Journal');
assert.match(utsuroba, /postcardNote/, 'Journal entries must expose saved postcards');
assert.match(utsuroba, /reviewOnly:\s*true/, 'Journal replay must use review-only mode');
assert.match(utsuroba, /completeMemory[\s\S]*readingJournal/, 'Restored reading memories must be recorded before quest cleanup');
assert.match(reading, /opts\.reviewOnly/, 'Reading engine must understand review-only sessions');
assert.match(reading, /renderOnboarding/, 'Reading engine must show first-session guidance');
assert.match(reading, /data-reading-calibration/, 'Reading engine must offer initial support calibration');
assert.match(reading, /skipOnboarding/, 'Journal replay must skip first-session onboarding');
assert.match(reading, /adaptiveMode/, 'Reading engine must support adaptive review modes');
assert.match(reading, /usedEvidence/, 'Reading engine must track evidence support use');
assert.match(reading, /renderPostcard/, 'Reading engine must render optional memory postcards');
assert.match(reading, /onPostcardSave/, 'Reading engine must persist saved postcard output');
assert.match(reading, /renderLensReplay/, 'Reading completion must expose replay lenses');
assert.match(reading, /reviewLens/, 'Reading engine must support focused replay lenses');
assert.match(reading, /data-reading-lens/, 'Reading replay lens controls must be interactive');
assert.match(reading, /Close journal review \/ ノートを閉じる/, 'Review-only sessions must not offer quest completion');

console.log('Utsuroba reading journal audit passed');
