#!/usr/bin/env node
'use strict';

// Grimmerglen selector Pass 1: the profile exposes the same saved, bilingual
// three-tier control used by Muenba and Utsuroba.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profile = fs.readFileSync(path.join(root, 'grimmerglen-profile.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

const selectorIndex = profile.indexOf('<section id="memory-tier-selector"');
const memoriesIndex = profile.indexOf('<section class="section" aria-labelledby="memories-title">');
assert(selectorIndex >= 0 && memoriesIndex > selectorIndex, 'tier selector must sit above the memory objects section');
assert(profile.includes('id="memory-tier-selector-mount"'), 'profile must provide a mount for the tier selector');
assert(profile.includes("const MEMORY_TIER_CHOICES = ['start', 'case', 'deep'];"), 'selector must expose Starter, Case, and Deep values');
assert(profile.includes('function getMemoryTierPreference()') || profile.includes('const getMemoryTierPreference ='), 'selector must have a saved preference getter');
assert(profile.includes('data.grimmerglen.memoryTier = value'), 'selector must save the selected tier in the Grimmerglen profile bucket');
assert(profile.includes('BoohaAdventure.save.save(data)'), 'selector must use the shared save system');
assert(profile.includes('data-memory-tier="${tier}"'), 'selector buttons must carry their tier value');
assert(profile.includes('aria-pressed="${tier === current}"'), 'selector buttons must expose their active state accessibly');
assert(profile.includes("renderMemoryTierSelector()"), 'profile render cycle must include the tier selector');
assert(verify.includes('tests/grimmerglen-tier-selector-audit.cjs'), 'verify.sh must run the Grimmerglen selector audit');

console.log('Grimmerglen selector Pass 1 audit passed: saved bilingual Starter, Case, and Deep control is above the memory objects section.');
