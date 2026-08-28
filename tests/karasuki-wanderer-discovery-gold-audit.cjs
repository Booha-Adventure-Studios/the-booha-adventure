#!/usr/bin/env node
'use strict';

// Pass 24F: first-time Wanderer discoveries are a distinct gold reward moment.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

const discoveryStart = karasuki.indexOf('function showWandererDiscovery(w)');
const returnStart = karasuki.indexOf('function showWandererReturn(w)', discoveryStart + 1);
assert(discoveryStart >= 0 && returnStart > discoveryStart, 'could not inspect the two Wanderer celebration states');
const discovery = karasuki.slice(discoveryStart, returnStart);
const reunion = karasuki.slice(returnStart);

assert(karasuki.includes("const WANDERER_DISCOVERY_ACCENT = '#facc15';"), 'discovery gold accent must be stable');
assert(karasuki.includes("const WANDERER_DISCOVERY_GLOW   = 'rgba(250,204,21,.58)';"), 'discovery gold glow must be stable');
assert(discovery.includes('accent: WANDERER_DISCOVERY_ACCENT'), 'new Wanderer cards must request the gold accent');
assert(discovery.includes('glow: WANDERER_DISCOVERY_GLOW'), 'new Wanderer cards must request the gold glow');
assert(discovery.includes('discovery: true'), 'new Wanderer cards must opt into discovery decoration');
assert(reunion.includes('accent: WANDERER_RETURN_ACCENT'), 'Hello Again must retain its cool return accent');
assert(reunion.includes('glow: WANDERER_RETURN_GLOW'), 'Hello Again must retain its cool return glow');

assert(card.includes('utsu-celebration-spark-field'), 'celebration card must include a dedicated sparkle layer');
assert(card.includes('card.classList.toggle(\'is-discovery\', opts.discovery === true)'), 'celebration API must reset the discovery state between reuses');
assert(card.includes('.utsu-celebration-card.is-discovery'), 'gold styling must be scoped to first discoveries');
assert(card.includes('z-index:0;overflow:hidden;pointer-events:none;opacity:0'), 'sparkles must stay behind content and never intercept taps');
assert(card.includes('.utsu-celebration-spark-field::before'), 'discovery card must have visible sparkle decoration');
assert(card.includes('.utsu-celebration-spark-field::after'), 'discovery card must have a second sparkle layer');
assert(card.includes('.utsu-celebration-spark-field::before,.utsu-celebration-spark-field::after{animation:none;}'), 'sparkles must respect reduced-motion settings');
assert(sw.includes('booha-assets-2026-399'), 'service worker must ship the new shared celebration script');
assert(verify.includes('tests/karasuki-wanderer-discovery-gold-audit.cjs'), 'verify.sh must run the gold discovery audit');

console.log('Karasuki 24F discovery audit passed: new Wanderers use a gold-only reward treatment with contained non-interactive sparkles, while returns stay blue.');
