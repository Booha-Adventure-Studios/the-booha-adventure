#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'profile.html'), 'utf8');
const dailyCheck = fs.readFileSync(path.join(root, 'js/daily-check.js'), 'utf8');

const skinsScript = profile.indexOf('<script src="./js/core/booha-skins.js"></script>');
const seasonBootstrap = profile.indexOf('document.documentElement.dataset.season = season');
const dailyCheckScript = profile.indexOf('<script src="./js/daily-check.js"></script>');

assert.ok(skinsScript >= 0, 'profile must load the shared season registry');
assert.ok(seasonBootstrap > skinsScript, 'profile must set the season marker from the registry');
assert.ok(dailyCheckScript > seasonBootstrap, 'profile must set the season marker before loading Daily Check');
assert.match(dailyCheck, /html\[data-season="halloween"\] \.dc-root/,
  'Daily Check must retain its Halloween theme selector');

console.log('Profile Daily Check season bootstrap passed.');
