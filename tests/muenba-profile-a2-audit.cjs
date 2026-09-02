#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const profile = fs.readFileSync(path.join(__dirname, '..', 'muenba-profile.html'), 'utf8');
const ghostStart = profile.indexOf('const ghostCards =');
const ghostEnd = profile.indexOf('\n        const journalMarkup =', ghostStart);
assert(ghostStart >= 0 && ghostEnd > ghostStart, 'Muenba profile ghost-card renderer must remain present');
const cards = profile.slice(ghostStart, ghostEnd);

assert(cards.includes('ghost-personality-jp'), 'ghost cards must render the authored Japanese personality line');
assert(cards.includes("Memory: ${currentModeComplete ? 'settled' : 'open'}"), 'ghost cards must show one current-mode memory status');
assert(!cards.includes('ghost-memory-progress'), 'ghost cards must not render the old all-tier progress dump');
assert(cards.includes('Found this week'), 'ghost cards must retain weekly found status');
assert(cards.includes('Available this week'), 'ghost cards must retain weekly available status');
assert(cards.includes('class="ghost-avatar"'), 'ghost cards must retain avatar treatment');
assert(profile.includes('.ghost-card { min-height: 176px; padding: 12px 11px 11px;'), 'ghost cards must use tighter poster-style spacing');
assert(profile.includes('-webkit-line-clamp: 2'), 'long personality copy must be clamped to preserve card scanability');
assert(profile.includes('.ghost-grid { grid-template-columns: repeat(2, 1fr); }'), 'phone ghost grid must remain two columns');

console.log('Muenba Pass A2 profile audit passed.');
