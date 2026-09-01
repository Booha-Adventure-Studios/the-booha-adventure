#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'grimmerglen.js'), 'utf8');
const portalStart = source.indexOf('function buildGrimmerglenProfilePortal()');
const portalEnd = source.indexOf('\n  function setRoom(', portalStart);
assert(portalStart >= 0 && portalEnd > portalStart, 'Grimmerglen profile portal builder must remain present');
const portal = source.slice(portalStart, portalEnd);

assert(source.includes("const visible = state.roomId === GRIMMERGLEN_PROFILE_PORTAL.roomId && !state.celebrating;"),
  'Grimmerglen profile must remain visible outside Booha\'s dance');
assert(!source.includes('GRIMMERGLEN_PROFILE_PORTAL.roomId && !state.celebrating && !state.returnExiting'),
  'Grimmerglen profile must not be locked during ordinary return navigation');
assert(portal.includes("grimmerglenProfilePortal.href = 'grimmerglen-profile.html';"),
  'Grimmerglen room 01 profile must point to the profile page');
assert(portal.includes("grimmerglenProfilePortal.addEventListener('pointerdown'"),
  'Grimmerglen profile must isolate touch/pointer presses from the room stage');
assert(portal.includes('if (state.celebrating) {'),
  'Grimmerglen profile must have an explicit dance-only lock');
assert(!portal.includes('state.returnExiting'),
  'Grimmerglen profile click handling must not block ordinary return navigation');
assert(portal.includes('event.stopPropagation();'),
  'Grimmerglen profile taps must not also issue a room movement command');

console.log('Grimmerglen Pass 29A profile-link audit passed.');
