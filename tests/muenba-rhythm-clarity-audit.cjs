#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const section = (start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert(from >= 0 && to > from, `source section is missing: ${start}`);
  return source.slice(from, to);
};

const renderSource = section('function renderRhythmCapture()', 'function tickRhythmCapture');
const tickSource = section('function tickRhythmCapture', 'function advanceMissedRhythmNotes');
const feedbackSource = section('function showRhythmFeedback', 'function handleRhythmInput');
const inputSource = section('function handleRhythmInput', 'function recordRhythmResult');

assert(renderSource.includes('muenba-rhythm-receptor'), 'rhythm lanes must render fixed target receptors');
assert(renderSource.includes('muenba-rhythm-touch-pad'), 'rhythm lanes must render visible touch-pad labels');
assert(renderSource.includes('refreshRhythmGeometry(rhythm)'), 'rhythm layout must align note travel with the responsive receptor position');
assert(renderSource.includes('muenba-rhythm-feedback'), 'rhythm board must provide a floating feedback surface');
assert(tickSource.includes('pulseRhythmReceptors(now)'), 'rhythm receptors must pulse on the track beat');
assert(feedbackSource.includes("perfect: 'PERFECT'"), 'rhythm feedback must expose PERFECT');
assert(feedbackSource.includes("early: 'EARLY'"), 'rhythm feedback must expose EARLY');
assert(feedbackSource.includes("late: 'LATE'"), 'rhythm feedback must expose LATE');
assert(feedbackSource.includes("miss: 'MISS'"), 'rhythm feedback must expose MISS');
assert(feedbackSource.includes('rhythm.feedbackEl.classList.add(\'is-visible\')'), 'floating feedback must animate into view');
assert(inputSource.includes("'EARLY · TAP LATER'"), 'early input must explain the correction');
assert(inputSource.includes("'LATE · TAP SOONER'"), 'late input must explain the correction');
assert(source.includes('.muenba-rhythm-receptor.is-pulsing'), 'receptors must have a visible pulse state');
assert(source.includes('@keyframes muenbaRhythmReceptorPulse'), 'receptor pulse animation must be defined');
assert(source.includes('.muenba-rhythm-touch-pad'), 'touch-pad styling must be defined');
assert(source.includes('top:calc(100% - 45px)'), 'judgment line must stay anchored to the responsive board bottom');

console.log('Muenba rhythm clarity audit passed: receptors, touch pads, responsive alignment, and directional feedback are wired.');
