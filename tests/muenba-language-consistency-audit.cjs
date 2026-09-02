#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'muenba-profile.html'), 'utf8');

assert(source.includes('function setCaseDirectionText('), 'live bilingual directions need an in-place update helper');
assert(source.includes('function renderMuenbaMetric('), 'dynamic HUD metrics need a bilingual renderer');
assert(source.includes("'muenba-case-check-lock-hint'"), 'locked comprehension guidance must use the shared direction surface');
assert(source.includes('CHECK LOCKED<small>'), 'locked comprehension status must include Japanese text');
assert(source.includes('setCaseDirectionText(rhythm.statusEl'), 'rhythm status updates must preserve the Japanese counterpart');
assert(source.includes('muenba-rhythm-feedback-jp'), 'floating rhythm feedback must include Japanese text');
assert(source.includes('muenba-metric-jp'), 'rhythm HUD metrics must include Japanese text');
assert(source.includes('muenba-orb-release-status'), 'orb release status must remain visible');
assert(source.includes('解放<rt>かいほう</rt>'), 'orb release status must have a Japanese counterpart');

assert(profile.includes('case-status-jp'), 'profile case statuses must include Japanese counterparts');
assert(profile.includes('weekly-hunt-legend'), 'profile weekly availability status must remain visible');
assert(profile.includes('<div class="stat-label">Captures<small>'), 'profile stats must retain compact English labels with Japanese counterparts');
assert(profile.includes('ghost-memory-current'), 'profile current-mode memory status must remain visible');
assert(profile.includes('<ruby>未完了<rt>みかんりょう</rt></ruby>'), 'open memory status must include Japanese text');

console.log('Muenba Pass C language-consistency audit passed.');
