#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

function section(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert(start >= 0 && end > start, `could not isolate ${startNeedle}`);
  return source.slice(start, end);
}

const input = section('function buildCaptureOverlay()', '  // Pass 2 / Pass 8A session boundary.');
const keyMap = section('function rhythmLaneForKey(key)', '  function rhythmNoteGlyph');
for (const key of ['arrowleft', 'arrowright', 'arrowup', "'f'", "'a'", "'s'", "'d'"]) {
  assert(keyMap.includes(key), `rhythm keyboard mapping must support ${key}`);
}
assert(input.includes('if (!captureOpen || event.repeat) return;'), 'held keyboard keys must not retrigger rhythm notes');
assert(input.includes('handleRhythmInput(lane);'), 'keyboard input must reach the shared rhythm hit resolver');

const board = section('function renderRhythmCapture()', '  function tickRhythmCapture');
assert(board.includes("laneButton.addEventListener('pointerdown'"), 'rhythm lanes must accept low-latency pointer/touch input');
assert(board.includes('event.preventDefault();'), 'touch input must prevent browser gesture interference');
assert(board.includes('className = `muenba-rhythm-touch-pad'), 'each lane must expose a visible touch pad');
assert(source.includes('touch-action:none'), 'rhythm controls must opt out of browser touch scrolling');
assert(source.includes('height:clamp(160px,32vh,250px);'), 'rhythm lanes must remain responsive while large enough to tap');
assert(source.includes('function bindRhythmAudioUnlock(button)'), 'rhythm entry controls need a shared audio-unlock binder');
assert(source.includes("button.addEventListener('pointerdown', unlockRhythmAudioFromGesture)"), 'rhythm audio must attempt unlock on direct pointerdown');
assert(source.includes('primeRhythmSfx();'), 'the direct gesture must also prime decoded rhythm buffers');

const practice = section('function startPracticeRhythm()', '  function pauseWorldMusicForCapture');
assert(practice.includes("['rhythm-help', 'practice-result'].includes(captureSession.phase)"), 'practice must only start from help or its result');
assert(practice.includes('captureSession.practice = true;'), 'practice sessions must be explicitly marked');
assert(practice.includes('startRhythmCapture(false, true);'), 'practice must use the safe shared rhythm startup');

const practiceReturn = section('function returnFromPractice()', '  function pauseWorldMusicForCapture');
assert(practiceReturn.includes("captureSession.phase = captureSession.danger ? 'danger-ready' : 'ready';"), 'practice must return to the correct non-playing scene');
assert(practiceReturn.includes('captureSession.practice = false;'), 'returning from practice must clear practice state');

const finish = section('function finishRhythmCapture()', '  function renderPracticeResult');
assert(finish.includes('if (captureSession.practice)'), 'practice results must be handled before permanent capture writes');
assert(finish.includes("captureSession.phase = 'practice-result';"), 'practice must have a dedicated result scene');
assert(finish.includes('renderPracticeResult(accuracy, success);'), 'practice results must explain the outcome and next action');
assert(finish.includes('if (captureSession.danger)'), 'danger results must remain separate from target-capture rewards');

assert(source.includes('function beginDangerRhythm()'), 'danger rhythm must have an explicit entry point');
assert(source.includes('startRhythmCapture(true);'), 'danger entry must use the danger rhythm configuration');
assert(source.includes('function retryDangerRhythm()'), 'danger rhythm must offer a retry path');
assert(source.includes("captureSession.phase = 'danger-ready';"), 'danger retry must return through the danger-ready scene');

assert(source.includes("if (REDUCED_MOTION) return;\n    const beat = Math.floor"), 'receptor pulse work must stop under reduced motion');
assert(source.includes('.muenba-rhythm-feedback, .muenba-rhythm-receptor'), 'reduced-motion CSS must disable rhythm animations');
assert(source.includes('rhythm.lastBeatPulse = -1;'), 'closing rhythm help must restart beat-pulse state');
assert(source.includes('!captureSession?.rhythm && dangerScreamStateIsActive()'), 'visibility resume must not restart danger audio over an active rhythm game');
assert(source.includes('function pauseRhythmForVisibility()'), 'active rhythm must have an interruption pause path');
assert(source.includes("captureSession.phase = 'rhythm-paused';"), 'hidden rhythm sessions must enter an explicit paused phase');
assert(source.includes('function renderRhythmResume()'), 'paused rhythm sessions must explain how to continue');
assert(source.includes("'muenba-rhythm-resume'"), 'paused rhythm sessions must expose a resume control');
assert(source.includes('function resumeRhythmAfterVisibility()'), 'paused rhythm sessions must have an explicit resume path');
assert(source.includes('rhythm.startAt += pausedFor;'), 'visibility pauses must preserve elapsed timing by shifting the start offset');
assert(source.includes('startDangerRhythmMusic({ reset: false });'), 'danger music must resume from its paused position');
assert(source.includes('const targetCount = chart.reduce('), 'playable-note count must be precomputed at rhythm startup');
assert(source.includes('const total = rhythm.targetCount || 1'), 'rhythm accuracy must use the cached playable-note count');
assert(source.includes('const targetTotal = rhythm.targetCount || 1'), 'rhythm energy updates must use the cached playable-note count');
assert(!source.includes('rhythm.chart.filter(note => !note.decoy)'), 'active rhythm accuracy must not filter the chart');
assert(!source.includes('rhythm.chart.filter(noteData => !noteData.decoy)'), 'active rhythm energy updates must not filter the chart');

assert(verify.includes('tests/muenba-rhythm-mode-audit.cjs'), 'verify.sh must run the Pass 4 rhythm mode audit');

console.log('Muenba rhythm mode audit passed: touch, keyboard, practice, danger, pause, and reduced-motion contracts are wired.');
