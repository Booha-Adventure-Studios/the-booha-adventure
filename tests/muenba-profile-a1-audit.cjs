#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const profile = fs.readFileSync(path.join(__dirname, '..', 'muenba-profile.html'), 'utf8');
const recordsStart = profile.indexOf('const caseRecordMarkup =');
const recordsEnd = profile.indexOf('\n        const ghostCards =', recordsStart);
assert(recordsStart >= 0 && recordsEnd > recordsStart, 'Muenba profile case-record renderer must remain present');
const records = profile.slice(recordsStart, recordsEnd);

assert(records.includes('isCompleted || isCurrentModeComplete'), 'settled records must include both all-mode and current-mode states');
assert(records.includes('case-memory-badge'), 'settled and next records must expose a compact mode badge');
assert(records.includes('case-record-resolution'), 'settled records must show a short resolution');
assert(records.includes('<details class="case-record-review">'), 'settled clues must be collapsed behind native details');
assert(records.includes('Review clues'), 'settled records must provide a discoverable clue-review control');
assert(records.includes('Review all clues'), 'fully settled records must label their complete clue review');
assert(records.includes('Find the next ghost in Muenba to open this case.'), 'next case must explain the action without naming the target ghost');
assert(!records.includes('Find ${esc(ghost?.name || caseData.ghostId)}'), 'next case must not reveal the target ghost name');
assert(records.includes('Case ${index + 1} · WAITING'), 'locked records must retain a clear waiting state');
assert(records.includes('前の<ruby>事件'), 'locked records must include a Japanese waiting line');
assert(records.includes('caseData[currentMemory] || caseData.fresh'), 'current-mode settled records must use the selected memory mode');
assert(records.includes('caseData[record.difficulty] || caseData.deep || caseData.fresh'), 'all-mode settled records must use the saved settled mode for the resolution');

console.log('Muenba Pass A1 profile audit passed.');
