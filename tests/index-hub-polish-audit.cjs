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
assert.match(index, /\.hubWeekTab\s*\{[\s\S]*?max-height:\s*240px[\s\S]*?align-self:\s*center/, 'wide week tabs must read as centered side doors');
assert.match(index, /\.hubBlitzMount\s*\{[\s\S]*?grid-template-columns:\s*minmax\(108px, \.42fr\) minmax\(0, 1\.8fr\) minmax\(108px, \.42fr\)/, 'Blitz mount must share the hero card grid');
assert.match(index, /\.blitzArcade\s*\{[\s\S]*?grid-column:\s*2[\s\S]*?width:\s*100%/, 'Blitz strip must occupy the same center column as the hero card');
assert.match(index, /class="mazeCta"/, 'Maze must have a neutral base class before progress state is applied');
assert.match(index, /mazeButton\.classList\.toggle\('hub-glow-pink', mazeAvailable\)/, 'Maze must glow while weekly games remain');
assert.match(index, /mazeButton\.classList\.toggle\('is-complete', !mazeAvailable\)/, 'Maze must enter its completion state at 9/9');
assert.match(index, /\.mazeCta\.is-complete\s*\{[\s\S]*?#d6ffe0[\s\S]*?#20bd70/, 'Maze completion state must turn green');
assert.match(index, /M8\.5 2\.5L11 9M15\.5 2\.5L13 9/, 'medal icon must use two separate ribbon tails');
assert.match(index, /<section class="hubHero" aria-label="Weekly adventure">/, 'the hero must remain an unboxed layout surface');
assert.match(index, /className = 'blitzMedal'/, 'unfinished Blitz medals must remain visually neutral');
assert.match(index, /className = 'blitzArcade hub-glow-soft'/, 'the Blitz strip must use the soft glow role');
assert.match(index, /btn\.classList\.add\('is-record', 'hub-glow-medal'\)/, 'earned Blitz medals must receive the medal glow role');
assert.match(index, /let perfectCount = 0/, 'Blitz render must count perfect-run medals');
assert.match(index, /arcade\.classList\.toggle\('is-perfect-week', perfectWeek\)/, 'Blitz must expose a perfect-week state');
assert.match(index, /class="blitzArcade is-perfect-week"|\.blitzArcade\.is-perfect-week/, 'perfect week must have a gold visual state');
assert.match(index, /content:\s*" · PERFECT WEEK ✦"/, 'perfect week must be labeled for students');
assert.match(index, /document\.documentElement\.classList\.add\('hub-low-power'\)/, 'low-power devices must disable animated hub glow');
assert.match(index, /document\.documentElement\.classList\.add\('hub-reduced-motion'\)/, 'reduced-motion preference must be represented before paint');
assert.match(index, /html\.hub-low-power[\s\S]*?animation: none !important/, 'low-power hub surfaces must stop animation');
assert.match(index, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hub-glow-pink,[\s\S]*?\.mazeCta\.is-complete \{ animation: none !important; \}/, 'reduced motion must stop every hub glow and completion animation');
assert.match(index, /grid-template-areas: "previous current next"/, 'wide hubs must use side tabs around the current card');
assert.match(index, /grid-template-areas: "current current" "previous next"/, 'medium hubs must move tabs below the card');
assert.match(index, /@media \(max-width: 600px\)[\s\S]*?\.blitzRecordsBtn[\s\S]*?min-height: 44px/, 'phone layout must retain a touch-sized Records action');
assert.match(verify, /tests\/index-hub-polish-audit\.cjs/, 'verify.sh must run the Pass 19 polish audit');

console.log('Pass 19 hub polish audit passed: glow roles, reduced-motion/low-power behavior, and responsive layouts are wired.');
