#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'adventure-profile.html'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'js/ui/adventure-collection.js'), 'utf8');
const dataSource = fs.readFileSync(path.join(ROOT, 'js/karasuki-wanderer-data.js'), 'utf8');

assert.match(page, /Wanderers Found/, 'the adventure profile should label the collection');
assert.match(renderer, /collection\.wanderers/, 'the renderer should read the permanent collection slot');
assert.match(renderer, /VISITS/, 'found tiles should display visit counts');
assert.match(renderer, /UtsuFurigana\.sentence/, 'found comments should render with furigana');
assert.match(renderer, /NOT YET FOUND/, 'unfound tiles should have a clear locked state');
assert.match(renderer, /'mister-happy': 'mr_happy'/, 'Mister Happy should resolve to its existing portrait asset');
assert.match(page, /wanderer-intro-jp/, 'the collection introduction should include a Japanese reading aid');
assert.match(page, /data-profile-icon="arrowLeft"/, 'the Back control should use the shared icon system');
assert.match(page, /<section class="games-section"/, 'the adventure profile should place Bonus Games near the top');
assert.match(page, /id="games-grid"/, 'the adventure profile should mount the Bonus Games shelf');
assert.match(page, /js\/ui\/bonus-games\.js/, 'the adventure profile should load the shared Bonus Games renderer');
assert.match(page, /id="collection-found-count"/, 'the collection should show a found summary');
assert.match(page, /id="collection-total-visits"/, 'the collection should show permanent visit totals');
assert.match(page, /data-collection-filter="found"/, 'the collection should offer a found filter');
// Candy Moon Arcade redesign (replaces the old Cinzel / spectral-glass styling).
assert.match(page, /family=Dela\+Gothic\+One/, 'the adventure profile should load the arcade display font');
assert.match(page, /family=Zen\+Maru\+Gothic:wght@500;700;900/, 'the adventure profile should load a rounded Japanese display font');
assert.match(page, /--font-display:'Dela Gothic One'/, 'section headings should use the arcade display font');
assert.match(page, /--night:#120a24/, 'the adventure profile should use its own candy-moon palette, distinct from the Adventure Log');
assert.match(page, /rt \{ font-size:\.5em;/, 'furigana should stay small enough not to spread the kanji');
assert.match(page, /\.collection-filter\[aria-pressed="true"\]/, 'the active collection filter should be highlighted');
assert.match(page, /id="atlas-ring"/, 'the atlas should show a collection ring');
assert.match(page, /data-collection-filter="(friendly|mischievous|dangerous)"/, 'the atlas should filter by wanderer kind');
assert.match(page, /id="arcade-status"/, 'the arcade should show an OPEN / LOCKED marquee');
assert.match(page, /id="adv-closet"/, 'the adventure profile should mount the skin closet');
assert.match(page, /id="adv-travelers"/, 'the adventure profile should mount the traveler row');
assert.match(page, /\.wcard\.unknown/, 'unfound wanderer cards should have a mystery state');
assert.match(page, /@keyframes advFlip/, 'opened wanderer cards should flip in');
assert.match(page, /prefers-reduced-motion: reduce/, 'animations should respect reduced motion');
assert.match(renderer, /HEART_STEPS = \[3, 8, 15\]/, 'friendship hearts should need 3, 8 and 15 visits');
assert.match(page, /border-color:#8b0000aa/, 'reset should use a deep crimson danger treatment');
assert.match(page, /\.spell-btn:focus-visible/, 'save actions should expose a visible keyboard focus state');
assert.match(renderer, /activeFilter/, 'the collection renderer should retain the selected gallery filter');
assert.match(renderer, /wanderer-index/, 'found and unfound tiles should show stable gallery numbers');
assert.match(renderer, /decoding="async"/, 'wanderer portraits should decode without blocking the page');
assert.match(page, /aria-live="polite"/, 'collection totals should announce saved discovery changes');
assert.match(dataSource, /"Shoganai"/, 'the collection renderer should use the shared 36-wanderer data');

console.log('Adventure collection tests passed.');
