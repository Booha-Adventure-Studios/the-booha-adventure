#!/usr/bin/env node
'use strict';

// Pass 9B: Marietta's introduction is mandatory the first time, then can be
// skipped once per later weekly occurrence without becoming a lifetime skip.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const saveFile = fs.readFileSync(path.join(root, 'js', 'core', 'save-file.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(runtime.includes('hasMariettaIntroBeenSeenThisWeek'), 'runtime must check the weekly introduction state');
assert(runtime.includes('hasMariettaIntroEverBeenSeen'), 'runtime must distinguish first-ever viewing from later weeks');
assert(runtime.includes('mariettaIntroEverSeen'), 'lifetime introduction marker must be persisted');
assert(runtime.includes('mariettaIntroSkipped'), 'weekly skip disposition must be persisted');
assert(runtime.includes("allowSkip: hasMariettaIntroEverBeenSeen()"), 'skip must only be offered after the first-ever introduction');
assert(runtime.includes('id="mg-dialogue-skip-btn"'), 'later-week introduction must expose a skip action');
assert(runtime.includes('skipMariettaIntroduction'), 'skip action must advance to the quest briefing');
assert(runtime.includes('renderMariettaDialogue(finishMariettaIntroduction'), 'first Marietta click must open the introduction before the quest briefing');
assert(runtime.includes('weekly.mariettaIntroSeen = true'), 'Marietta introduction must be recorded in weekly state');
assert(runtime.includes('id="mg-help-btn"'), 'quest briefing must expose the explicit help action');
assert(runtime.includes('renderMariettaQuestBriefing'), 'introduction must advance into the quest briefing');
assert(runtime.includes('markMariettaIntroSeenThisWeek(false)'), 'completed introduction must be recorded as viewed');
assert(runtime.includes('markMariettaIntroSeenThisWeek(true)'), 'skipped introduction must be recorded as skipped');
assert(saveFile.includes('mariettaIntroSeen: false'), 'weekly Grimmerglen defaults must include the intro seen flag');
assert(saveFile.includes('mariettaIntroSkipped: false'), 'weekly Grimmerglen defaults must include the intro skipped flag');
assert(/worlds:\s+_defaultWeeklyWorlds\(\)/.test(saveFile), 'weekly reset must recreate the Grimmerglen intro state');
assert(/assets:\s+'booha-assets-2026-450'/.test(serviceWorker), 'asset cache must be bumped for the Pass 9C help-gating flow');

console.log('Grimmerglen Pass 9B audit passed: first-ever intro is mandatory, later weekly intros are skippable, and weekly state resets cleanly.');
