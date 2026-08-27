#!/usr/bin/env node
'use strict';

// Pass 20B: first-visit Wanderer discovery uses the stable celebration card.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');

function sourceSection(startName, endName) {
  const start = source.indexOf(`function ${startName}`);
  const end = source.indexOf(`function ${endName}`, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} discovery contract`);
  return source.slice(start, end);
}

const discovery = sourceSection('showWandererDiscovery', 'showKarasukiArrival');

assert(discovery.includes('showCelebrationPop'), 'first Wanderer discovery must use the stable celebration card');
assert(!discovery.includes('showRewardPop'), 'first Wanderer discovery must not use the transient pickup toast');
assert(discovery.includes('wandererCelebrationPortrait(w)'), 'discovery must show the actual Wanderer portrait');
assert(discovery.includes('portraitAlt: `${w.name} wanderer`'), 'discovery portrait must have an accessible label');
assert(discovery.includes('accent: w.color'), 'discovery must match the Wanderer authored color');
assert(discovery.includes('glow: wandererCelebrationGlow(w.color)'), 'discovery must derive its glow from the Wanderer color');
assert(discovery.includes('translationHTML: translation'), 'discovery must place furigana-ready translation under English');
assert(discovery.includes('actionLabel: \'Meet this wanderer\''), 'discovery must have an explicit readable action');
assert(discovery.includes('WANDERER_FURIGANA[w.name]'), 'discovery must reuse the authored Wanderer furigana map');
assert(source.includes('function wandererCelebrationGlow(color)'), 'Wanderer celebration needs a safe color-to-glow helper');
assert(source.includes('function wandererCelebrationPortrait(w)'), 'Wanderer celebration needs a portrait resolver');
assert(source.includes('if (visit && visit.firstVisit) showWandererDiscovery(w);'), 'celebration must remain limited to first visits');

assert(card.includes('function showCelebrationPop(opts)'), 'shared celebration API must exist before the Wanderer integration');
assert(card.includes('portraitSrc'), 'shared celebration API must accept the Wanderer portrait');
assert(card.includes('translationHTML'), 'shared celebration API must accept furigana-ready translation HTML');

console.log('Karasuki 20B Wanderer celebration audit passed: first discovery uses the stable portrait, authored color, furigana translation, and explicit action.');
