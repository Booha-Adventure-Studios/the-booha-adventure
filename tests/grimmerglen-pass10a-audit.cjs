// Pass 10A: Grimmerglen is released as a live weekly world through the
// Karasuki entrance, with distinct locked and unlocked portal treatments.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const unlock = fs.readFileSync(path.join(root, 'js', 'core', 'unlock-system.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const portalStart = karasuki.indexOf('function drawGrimmerglenPortal(');
const portalEnd = karasuki.indexOf('function enterGrimmerglen(', portalStart);
assert(portalStart >= 0 && portalEnd > portalStart, 'Grimmerglen portal renderer must remain discoverable');
const portal = karasuki.slice(portalStart, portalEnd);

assert(karasuki.includes('roomId: "room_14"'), 'Karasuki must retain the Grimmerglen entrance room');
assert(karasuki.includes('href  : "grimmerglen.html?from=karasuki"'), 'Karasuki must route the live entrance into Grimmerglen');
assert(karasuki.includes('function grimmerglenUnlocked()'), 'Karasuki must expose the Grimmerglen gate check');
assert(karasuki.includes('BoohaUnlockSystem.isGrimmerglenUnlocked()'), 'Karasuki must use the shared weekly Grimmerglen unlock API');
assert(portal.includes('if (!unlocked)'), 'portal must have a distinct locked visual state');
assert(portal.includes('GRIMMERGLEN_LOCKED_ARROW'), 'locked portal must show a dulled arrow, not only a haze');
assert(portal.includes('ctx.rotate(-Math.PI / 2)'), 'locked portal arrow must point toward the entrance');
assert(portal.includes('Tiny rotating glints'), 'unlocked portal must have a documented sparkle treatment');
assert(portal.includes('shimmer') && portal.includes('glint'), 'unlocked portal must render varied sparkling glints');
assert(karasuki.includes('function openGrimmerglenPopup()'), 'Grimmerglen must retain its gate popup');
assert(karasuki.includes('wpopSetLock(\'grimmerglen-pop\', true)'), 'locked entrance must use the locked popup treatment');
assert(karasuki.includes('wpopSetLock(\'grimmerglen-pop\', false)'), 'unlocked entrance must use the open popup treatment');
assert(unlock.includes('function isGrimmerglenUnlocked()'), 'unlock system must retain the Grimmerglen world API');
assert(unlock.includes('return isWeeklyWorldGateOpen();'), 'Grimmerglen must unlock with the same weekly gate as Utsuroba and Muenba');
assert(!unlock.includes('GRIMMERGLEN_BUILD_READY'), 'the released world must not retain a build-only gate');
assert(verify.includes('tests/grimmerglen-pass10a-audit.cjs'), 'verify.sh must run the final Grimmerglen release audit');

console.log('Grimmerglen Pass 10A audit passed: live weekly entrance, dim locked arrow, sparkling unlocked arrow, and popup gate are wired.');
