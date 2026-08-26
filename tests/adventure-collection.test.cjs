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
assert.match(renderer, /activeFilter/, 'the collection renderer should retain the selected gallery filter');
assert.match(renderer, /wanderer-index/, 'found and unfound tiles should show stable gallery numbers');
assert.match(dataSource, /"Shoganai"/, 'the collection renderer should use the shared 36-wanderer data');

console.log('Adventure collection tests passed.');
