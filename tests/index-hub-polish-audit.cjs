#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

for (const name of ['hubGlowGold', 'hubGlowViolet', 'hubGlowTeal', 'hubGlowPink', 'hubGlowMedal', 'hubGlowSoft']) {
  assert.match(index, new RegExp(`@keyframes ${name}\\b`), `${name} must be defined`);
}
assert.match(index, /class="hubCurriculumBtn hub-glow-gold"/, 'curriculum must use the gold glow role');
assert.match(index, /class="hubWeekTab hub-glow-violet"/, 'last week must use the violet glow role');
assert.match(index, /class="hubWeekTab hub-glow-teal"/, 'next week must use the teal glow role');
assert.match(index, /class="mazeCta hub-glow-pink"/, 'Maze must use the pink glow role');
assert.match(index, /<section class="hubHero" aria-label="Weekly adventure">/, 'the hero must remain an unboxed layout surface');
assert.match(index, /className = 'blitzMedal'/, 'unfinished Blitz medals must remain visually neutral');
assert.match(index, /className = 'blitzArcade hub-glow-soft'/, 'the Blitz strip must use the soft glow role');
assert.match(index, /btn\.classList\.add\('is-record', 'hub-glow-medal'\)/, 'earned Blitz medals must receive the medal glow role');
assert.match(index, /document\.documentElement\.classList\.add\('hub-low-power'\)/, 'low-power devices must disable animated hub glow');
assert.match(index, /document\.documentElement\.classList\.add\('hub-reduced-motion'\)/, 'reduced-motion preference must be represented before paint');
assert.match(index, /html\.hub-low-power[\s\S]*?animation: none !important/, 'low-power hub surfaces must stop animation');
assert.match(index, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hub-glow-pink \{ animation: none !important; \}/, 'reduced motion must stop every hub glow');
assert.match(index, /grid-template-areas: "previous current next"/, 'wide hubs must use side tabs around the current card');
assert.match(index, /grid-template-areas: "current current" "previous next"/, 'medium hubs must move tabs below the card');
assert.match(index, /@media \(max-width: 600px\)[\s\S]*?\.blitzRecordsBtn[\s\S]*?min-height: 44px/, 'phone layout must retain a touch-sized Records action');
assert.match(verify, /tests\/index-hub-polish-audit\.cjs/, 'verify.sh must run the Pass 19 polish audit');

console.log('Pass 19 hub polish audit passed: glow roles, reduced-motion/low-power behavior, and responsive layouts are wired.');
