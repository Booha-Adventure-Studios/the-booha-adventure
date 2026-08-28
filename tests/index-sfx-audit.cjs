#!/usr/bin/env node
'use strict';

// Pass 22D: index controls use the shared lazy WebAudio palette, with audible
// but capped feedback and no new music or audio-file requests.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sfx = fs.readFileSync(path.join(root, 'js', 'utsu-sfx.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(index.includes('<script src="js/utsu-sfx.js"></script>'), 'index must load the shared SFX palette');
assert(index.indexOf('<script src="js/utsu-sfx.js"></script>') < index.indexOf('<script src="pwa-init.js"></script>'), 'shared SFX must load before the remaining app modules');
assert(sw.includes('${BASE}/js/utsu-sfx.js'), 'service worker must precache the shared SFX helper');
assert(sw.includes('const CORE_ASSETS = ['), 'service worker must have an asset precache list for the shared SFX helper');
assert(index.includes('function playIndexSfx(name)'), 'index needs a guarded shared-SFX call helper');
['popupOpen', 'popupClose', 'panelOpen', 'panelClose', 'hubSelect', 'hubPrimary', 'mischiefReward', 'buttonPress'].forEach(name => {
  assert(index.includes(`playIndexSfx('${name}')`), `index must wire ${name} to an intentional control`);
});
assert(sfx.includes('var SFX_GAIN_BOOST = 1.9;'), 'shared SFX should use the audible UI boost');
assert(sfx.includes('var SFX_MAX_GAIN = 0.16;'), 'shared SFX boost must be capped');
assert(sfx.includes('Math.min(SFX_MAX_GAIN, requestedGain * SFX_GAIN_BOOST)'), 'shared SFX gain must use the capped boost');
assert(sfx.includes('hubPrimary: function ()'), 'shared palette needs a distinct primary hub motif');
assert(sfx.includes('hubSelect: function ()'), 'shared palette needs a distinct selection hub motif');
assert(!sfx.includes('new Audio('), 'button palette must not introduce audio-file playback');
assert(verify.includes('tests/index-sfx-audit.cjs'), 'verify.sh must run the 22D index SFX audit');

console.log('Index 22D SFX audit passed: shared WebAudio is audibly boosted, capped, and varied across hub controls.');
