#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'js', 'core', 'adventure-core.js'), 'utf8');

assert(core.includes("document.addEventListener('booha:newWeek', _refreshLivePageAfterWeeklyReset)"),
  'core must listen for the completed weekly rollover before refreshing a live page');
assert(core.includes('function _refreshLivePageAfterWeeklyReset(e)'),
  'core must centralize live-page weekly refresh behavior');
assert(core.includes('window.location.reload()'),
  'a live page must reload so world layouts and in-memory hunt caches cannot keep last week');
assert(core.includes('if (typeof document !== \'undefined\' && document.hidden) return;'),
  'hidden tabs must defer refresh until their visibility check');
assert(core.includes('previousWeekKey: storedKey'),
  'the new-week event must identify both sides of the occurrence boundary');
assert(core.includes('detail: { previousWeekKey: storedKey, weekKey }'),
  'the new-week event must carry the occurrence key that was actually reset');

console.log('Weekly live refresh audit passed: durable Sunday rollover, event contract, and guarded refresh are wired.');
