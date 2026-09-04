// Pass 10B: room_01 has a small, glowing profile doorway at the requested
// world coordinate, while other rooms remain uncluttered.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const start = runtime.indexOf('function buildGrimmerglenProfilePortal(');
const end = runtime.indexOf('function beginEntryDrift(', start);
assert(start >= 0 && end > start, 'Grimmerglen profile portal helpers must remain discoverable');
const profilePortal = runtime.slice(start, end);
const profileStyleStart = runtime.indexOf('#grimmerglen-profile-portal span{');
const profileStyleEnd = runtime.indexOf('#grimmerglen-profile-portal:hover', profileStyleStart);
const profileStyle = runtime.slice(profileStyleStart, profileStyleEnd);

assert(runtime.includes("const GRIMMERGLEN_PROFILE_PORTAL = { roomId: 'room_01', x: 1111, y: 787 }"),
  'profile doorway must use room_01 at the requested coordinate');
assert(profilePortal.includes("href = 'grimmerglen-profile.html'"),
  'profile doorway must link to the Grimmerglen profile page');
assert(profilePortal.includes("innerHTML = '<span aria-hidden=\"true\">G</span>'"),
  'profile doorway must use the requested circular G icon');
assert(profilePortal.includes("addEventListener('touchend'"),
  'profile doorway must intercept mobile touchend before the stage handler');
assert(profilePortal.includes('event.stopPropagation();'),
  'profile doorway must keep mobile taps from becoming stage movement');
assert(runtime.includes('state.roomId === GRIMMERGLEN_PROFILE_PORTAL.roomId'),
  'profile doorway must only be visible in room_01');
assert(runtime.includes('buildGrimmerglenProfilePortal();'),
  'profile doorway must be created during Grimmerglen boot');
assert(runtime.includes('updateGrimmerglenProfilePortal();'),
  'profile doorway visibility must update on room changes');
assert(runtime.includes('#grimmerglen-profile-portal::before'),
  'profile doorway must have a glowing circular halo');
assert(runtime.includes('grimmerglenProfilePortalPulse'),
  'profile doorway halo must pulse');
assert(runtime.includes("font:900 2rem/1 ui-rounded,'Avenir Next Rounded','Trebuchet MS',sans-serif"),
  'profile doorway G must use a rounder bubbly font treatment');
assert(profileStyleStart >= 0 && profileStyleEnd > profileStyleStart &&
  !profileStyle.includes('width:46px') && !profileStyle.includes('background:linear-gradient'),
  'profile doorway G must not have the inner bubble badge');
assert(runtime.includes('#grimmerglen-profile-portal span::after'),
  'profile doorway G must include a cute sparkle accent');
assert(runtime.includes("#grimmerglen-profile-portal span::before{content:'✧'"),
  'profile doorway G must include a lower-left diamond accent');
assert(runtime.includes("#grimmerglen-profile-portal::after{content:'✦  ✧  ✦'"),
  'profile doorway must include several white diamond/star accents');
assert(verify.includes('tests/grimmerglen-pass10b-audit.cjs'),
  'verify.sh must run the Grimmerglen profile-doorway audit');

console.log('Grimmerglen Pass 10B audit passed: room_01 profile doorway, requested coordinates, glowing G icon, and room scoping are wired.');
