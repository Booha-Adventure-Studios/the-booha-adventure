#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pages = {
  log: fs.readFileSync(path.join(ROOT, 'profile.html'), 'utf8'),
  adventure: fs.readFileSync(path.join(ROOT, 'adventure-profile.html'), 'utf8'),
  utsuroba: fs.readFileSync(path.join(ROOT, 'utsuroba-profile.html'), 'utf8'),
};
const utsurobaWorld = fs.readFileSync(path.join(ROOT, 'js/utsuroba.js'), 'utf8');
const utsurobaPage = fs.readFileSync(path.join(ROOT, 'utsuroba.html'), 'utf8');
const karasukiWorld = fs.readFileSync(path.join(ROOT, 'js/karasuki.js'), 'utf8');
const karasukiPage = fs.readFileSync(path.join(ROOT, 'karasuki.html'), 'utf8');

Object.entries(pages).forEach(([name, source]) => {
  assert.match(source, /aria-label="Output profiles"/, `${name} should expose the Output profile network`);
  assert.match(source, /href="profile\.html"/, `${name} should link to the main log profile`);
  assert.match(source, /href="adventure-profile\.html"/, `${name} should link to the adventure profile`);
  assert.match(source, /href="utsuroba-profile\.html"/, `${name} should link to the Utsuroba profile`);
  assert.doesNotMatch(source, /href="juku(?:\.html|-profile\.html)/,
    `${name} must not add a Juku profile route`);
  assert.match(source, /(?:\.\/)?js\/utsu-furigana\.js/, `${name} should load the shared furigana helper`);
});

assert.match(pages.log, /href="profile\.html" aria-current="page"/,
  'the main log profile should mark itself as current');
assert.match(pages.adventure, /href="adventure-profile\.html" aria-current="page"/,
  'the adventure profile should mark itself as current');
assert.match(pages.utsuroba, /href="utsuroba-profile\.html" aria-current="page"/,
  'the Utsuroba profile should mark itself as current');

assert.match(pages.log, /animation: outputProfileButtonPulse/,
  'the log profile navigation should visibly pulse its current button');
assert.match(pages.adventure, /animation: outputProfileButtonPulse/,
  'the adventure profile navigation should visibly pulse its current button');
assert.match(pages.utsuroba, /animation: outputProfileButtonPulse/,
  'the Utsuroba profile navigation should visibly pulse its current button');
assert.doesNotMatch(pages.utsuroba, /id="utsuroba-profile-back"/,
  'the Utsuroba profile must not expose a direct world entrance');
assert.match(pages.utsuroba, /isWeeklyWorldGateOpen\(\)/,
  'the Utsuroba profile Karasuki route should consume the shared weekly gate');
assert.match(pages.utsuroba, /id="utsuroba-profile-karasuki"[^>]+href="karasuki\.html\?room=room_03"[^>]+hidden/,
  'the Utsuroba profile should keep its hidden Karasuki route to room_03');
assert.doesNotMatch(pages.utsuroba, /← Output profile/,
  'the Utsuroba profile should not show a redundant Output profile back button');
assert.match(pages.adventure, /<ruby>冒険<rt>ぼうけん<\/rt><\/ruby>/,
  'the adventure profile should show furigana on its kanji header');
assert.match(pages.utsuroba, /<ruby>記憶<rt>きおく<\/rt><\/ruby>/,
  'the Utsuroba profile should show furigana on its kanji header');
assert.match(pages.log, /UtsuFurigana\.rb\(DOW\[i\]\[0\], DOW\[i\]\[1\]\)/,
  'the log profile should render furigana for its weekday kanji');

assert.match(utsurobaWorld, /utsuroba_icon\.webp/,
  'the Utsuroba world should use the profile icon at its entrance');
assert.match(utsurobaWorld, /renderUtsurobaProfilePortal\(\)/,
  'the Utsuroba world should render its profile doorway');
assert.match(utsurobaWorld, /state\.roomId === DATA\.startRoom\)[\s\S]*?return;/,
  'the Utsuroba start room should stay clear of memory overlays');
assert.match(utsurobaWorld, /visitedRooms\[state\.roomId\]/,
  'Utsuroba should record each room visited');
assert.match(utsurobaPage, /src="js\/utsuroba-dialogue\.js"/,
  'the Utsuroba world should load the rotating drifter dialogue');
assert.match(utsurobaWorld, /dialogueVariantFor\(drifter\)/,
  'the Utsuroba world should select dialogue by drifter and week');
assert.match(utsurobaWorld, /UtsuFurigana\.sentence/,
  'drifter dialogue should render Japanese support with furigana');
assert.match(utsurobaWorld, /dp-quest-track/,
  'drifter cards should show the short ask-find-restore quest loop');
assert.match(utsurobaWorld, /questTrackHTML\(drifter, quest, hasRestoredMemory\)/,
  'drifter quest progress should reflect the current save state');
assert.match(karasukiPage, /src="js\/utsuroba-data\.js"/,
  'Karasuki should load the shared drifter identity data');
assert.match(karasukiPage, /src="js\/karasuki-wanderer-data\.js"/,
  'Karasuki should load the shared wanderer collection comments');
assert.match(karasukiWorld, /recordWandererVisit\(w\)/,
  'Karasuki should record a permanent wanderer visit when a wanderer is opened');
assert.match(karasukiWorld, /NEW WANDERER FOUND!/,
  'Karasuki should celebrate a first wanderer discovery');
assert.match(karasukiWorld, /hasTrustedKarasukiEntry\(\)/,
  'Karasuki should recognize trusted profile/world entry state');
assert.match(karasukiWorld, /KARASUKI_WANDERER_DATA/,
  'Karasuki should consume the shared wanderer collection data');
assert.match(karasukiWorld, /subHTML:/,
  'Karasuki reward popups should support furigana markup');
assert.match(karasukiWorld, /drifterReturnLabel\(quest\.active\)/,
  'Karasuki should target the active drifter when the trail is complete');
assert.doesNotMatch(karasukiWorld, /next \? next\.hint : 'Return to Kurobane\.'/,
  'Karasuki must not hard-code Kurobane as every return target');

console.log('Output profile network tests passed.');
