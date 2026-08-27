#!/usr/bin/env node
'use strict';

// Pass 21A: discovery and welcome-back cards are weekly moments; story
// popups remain available without replaying the celebration on every click.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(source.includes('function wandererWeekKey()'), 'Wanderer popup cadence needs a calendar-backed week key');
assert(source.includes('CALENDAR.getCurrentCurriculumWeek'), 'Wanderer popup cadence must use the shared calendar');
assert(source.includes('lastPopupWeek'), 'Wanderer collection records must remember the last celebration week');
assert(source.includes('const weeklyReturn = !firstVisit && !!weekKey && previous.lastPopupWeek !== weekKey;'), 'welcome-back must be limited to the first visit of a new week');
assert(source.includes("const popupKind = firstVisit ? 'discovery' : weeklyReturn ? 'return' : 'story';"), 'visit records must distinguish discovery, return, and story popup kinds');
assert(source.includes("if (visit && visit.popupKind === 'discovery') showWandererDiscovery(w);"), 'first-ever visits must open discovery');
assert(source.includes("else if (visit && visit.popupKind === 'return') showWandererReturn(w);"), 'new-week visits must open Hello Again');
assert(source.includes("else if (window.UtsuSfx && typeof window.UtsuSfx.popupOpen === 'function') window.UtsuSfx.popupOpen();"), 'same-week repeat clicks must fall through to the story popup');

function popupKind(previous, weekKey) {
  const firstVisit = !previous.firstFoundAt && !(Number(previous.visits) > 0);
  const weeklyReturn = !firstVisit && !!weekKey && previous.lastPopupWeek !== weekKey;
  return firstVisit ? 'discovery' : weeklyReturn ? 'return' : 'story';
}

assert.strictEqual(popupKind({}, '2026-august-w4'), 'discovery', 'first encounter should be discovery');
assert.strictEqual(popupKind({ firstFoundAt: 1, visits: 1, lastPopupWeek: '2026-august-w4' }, '2026-august-w4'), 'story', 'same-week repeat should be story only');
assert.strictEqual(popupKind({ firstFoundAt: 1, visits: 2, lastPopupWeek: '2026-august-w4' }, '2026-september-w1'), 'return', 'first encounter in a new week should be Hello Again');
assert.strictEqual(popupKind({ firstFoundAt: 1, visits: 3, lastPopupWeek: '2026-september-w1' }, '2026-september-w1'), 'story', 'post-Hello-Again clicks should be story only');

assert(verify.includes('tests/karasuki-wanderer-weekly-popup-audit.cjs'), 'verify.sh must run the 21A weekly popup audit');

console.log('Karasuki 21A weekly popup audit passed: discovery and Hello Again are once-per-week moments, with story-only repeat clicks.');
