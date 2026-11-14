#!/usr/bin/env node
'use strict';

// Blitz feedback B1 (Nov 2026): taps and correct/wrong feedback are equally
// loud in all three Blitz games, while each keeps its own scene motif.
// (Sound rules live in blitz-scene-sfx-audit.cjs.)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const engine = fs.readFileSync(path.join(__dirname, '..', 'js', 'blitz-engine.js'), 'utf8');

// Equal answer bounce.
for (const feel of ['playful', 'arcade', 'sleek']) {
  assert.match(engine, new RegExp(`blitz-feel-${feel} \\{ --blitz-option-overshoot: 1\\.05; \\}`), `${feel}: same overshoot as the others`);
}

// The correct-answer spray.
const start = engine.indexOf('function emitCorrectSpray(');
assert(start > 0, 'emitCorrectSpray exists');
const fn = engine.slice(start, engine.indexOf('function promptPopEl()', start));
assert.match(fn, /if \(!popMotionOk\(overlay\)\) return;/, 'off for reduced motion and minimal power, like the rest of Blitz Pop');
assert.match(fn, /const count = \(isLowPower\(\) \? 8 : 14\) \+ \(milestone \? 8 : 0\);/, 'same count rule for every scene; fewer on reduced power');
assert.match(fn, /palette\.streak\?\.colors/, 'saturated streak colours, not the early progress colour');
assert.doesNotMatch(fn, /progressColorFor/, 'never the dull progress colour');
assert.match(fn, /SPRAY_LOOK\[scene\.fill\?\.kind\]/, 'pieces take the scene motif');
assert.match(fn, /piece\.animate\(\[/, 'Web Animations, transform/opacity only');
assert.doesNotMatch(fn, /\b(left|top|width|height)\s*:\s*\$\{[^}]*\}px;[^`]*`\s*\}\s*\]/, 'no layout properties animated');
assert.match(fn, /setTimeout\(\(\) => piece\.remove\(\), 900\);/, 'pieces never linger');
assert.match(fn, /catch \(_\) \{/, 'decoration can never interrupt an answer');
for (const kind of ['circus-marquee', 'spooky-fog', 'firefly-swarm']) {
  assert.match(engine, new RegExp(`'${kind}': \\{ size: \\d+, glow: [\\d.]+, soft: (true|false)[^}]*\\}`), `${kind}: has a spray look`);
}
assert.match(engine, /'circus-marquee': \{[^}]*streak: true/, 'Vocab throws lightbulb streaks');
assert.match(engine, /'spooky-fog': \{[^}]*soft: true/, 'Sentence puffs soft smoke');
assert.match(engine, /'firefly-swarm': \{[^}]*core: true/, 'Question fireflies have a bright core');
assert.match(fn, /toLowerCase\(\) !== '#ffffff'/, 'saturated colours lead; white is only an accent');
// Called on every correct answer, before the legacy block, so it is live.
const detonate = engine.slice(engine.indexOf('function correctDetonate('), engine.indexOf('if (LEGACY_BLITZ_CELEBRATIONS_ENABLED) {', engine.indexOf('function correctDetonate(')));
assert.match(detonate, /emitCorrectBoing\([^)]*\);\s*emitCorrectSpray\(correctBtn, answerRect, overlayRect, milestone\);/, 'spray fires with the boing on every right answer');
// The run pace is untouched.
assert.match(engine, /: \(config\.nextDelay \|\| 200\);/, 'the 200 ms next-question pace is unchanged');
assert.match(engine, /#\$\{config\.overlayId\}\.low-power \.booha-blitz-spray \{ display: none; \}/, 'hidden at minimal power');

console.log('Blitz feedback B1 passed: equal bounce, motif spray on every right answer, pace unchanged.');
