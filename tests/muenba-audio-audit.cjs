#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const audioDir = path.join(root, 'assets', 'img', 'muenba');
const audioFiles = new Set(fs.readdirSync(audioDir));

for (const filename of ['Muenba_BGM.mp3', 'rhythm.mp3', 'scream.mp3', 'get.mp3', 'miss.mp3']) {
  assert(audioFiles.has(filename), `Muenba audio asset is missing: ${filename}`);
}

assert(source.includes("new Audio('assets/img/muenba/Muenba_BGM.mp3')"), 'Muenba BGM path must match the restored filename case');
assert(source.includes('music.loop = true;'), 'Muenba BGM must loop');
assert(source.includes("music.addEventListener('ended'"), 'Muenba BGM needs a loop recovery handler');
assert(source.includes('music.addEventListener(\'error\''), 'Muenba BGM errors must release the started flag');
assert(source.includes('const rhythmHitSfxPool = makeRhythmSfxPool'), 'rhythm hit sounds must use a playback pool');
assert(source.includes('const rhythmMissSfxPool = makeRhythmSfxPool'), 'rhythm miss sounds must use a playback pool');
assert(source.includes('sound.pause();\n      sound.currentTime = 0;'), 'rhythm SFX must reset each voice before playback');
assert(source.includes('window.AudioContext || window.webkitAudioContext'), 'reading cues must support Web Audio where available');
assert(source.includes('function getCaseAudioContext()'), 'reading audio context must be initialized lazily');
assert(source.includes('if (!caseAudioContext)'), 'reading audio context must not be recreated for every word');
assert(source.includes('function playCaseWordCue(isKeyword = false)'), 'word sweep must have a dedicated reading cue');
assert(source.includes('function playCaseUnlockCue()'), 'opening CHECK must have a dedicated unlock cue');
assert(source.includes('function playCaseLockedThud()'), 'premature answer taps must have a dedicated locked response');
assert(source.includes('function playCaseSolvedCue()'), 'solved cases must have a dedicated success cue');
assert(source.includes('return !REDUCED_MOTION;'), 'reading cues must respect reduced-motion preference');
assert(source.includes('playCaseWordCue(caseSweepWordIsKeyword(current.textContent, keywords))'), 'word cues must fire as each sweep word is revealed');
assert(source.includes('playCaseUnlockCue();'), 'unlock cue must fire when the comprehension check opens');
assert(source.includes('playCaseLockedThud();'), 'locked answer taps must trigger the quiet thud response');
assert(source.includes('pulseCaseReadingWord(panel);'), 'locked answer taps must pulse the active reading word');
assert(source.includes('playCaseSolvedCue();'), 'solved cards must trigger the success cue');
assert(source.includes('const playResult = dangerScream.play();'), 'scream playback must be explicitly started on encounter');
assert(source.includes('const playResult = dangerRhythmMusic.play();'), 'danger rhythm music must start with the danger chart');
assert(source.includes('let dangerRhythmPlayToken = 0;'), 'danger rhythm music must guard against stale asynchronous playback');
assert(source.includes('stopDangerScream();\n    stopDangerRhythmMusic();'), 'leaving Muenba must stop danger audio before navigation');

console.log('Muenba audio audit passed: restored assets, looping BGM, danger audio, pooled rhythm SFX, and 18F reading cues.');
