#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(ROOT, 'js/invaders-engine.js'), 'utf8');
const page = fs.readFileSync(path.join(ROOT, 'booha_invaders.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'theme/invaders.css'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'js/core/game-registry.js'), 'utf8');

assert.match(engine, /const INVADERS_SAVE_ID = "bonus:booha_invaders"/);
assert.match(engine, /const INVADERS_PAGE_ID = "booha_invaders"/);
assert.match(engine, /typeof api\.key === "function" && api\.key\(\)/);
assert.match(engine, /data\.pageState\?\.\[INVADERS_PAGE_ID\]/);
assert.match(engine, /record\.checkpoint = \{/);
for (const field of ['wave', 'score', 'totalKills', 'lives', 'maxCombo', 'savedAt']) {
  assert.match(engine, new RegExp(`\\b${field}\\b`), `checkpoint missing ${field}`);
}
assert.match(engine, /function normalizeInvadersRecord\(raw\)/);
assert.match(engine, /wave >= 1 && wave <= 999/);
assert.match(engine, /function finishInvadersRun\(completed=false\)/);
assert.match(engine, /scores\.submit\(INVADERS_SAVE_ID, runScore/);
assert.match(engine, /finishInvadersRun\(false\)/);
assert.match(engine, /function restoreInvadersCheckpoint\(\)/);
assert.match(engine, /startInvadersRun\(true\)/);

assert.match(page, /id="invadersSavePanel"/);
assert.match(page, /id="invadersContinueBtn"/);
assert.match(page, /Auto-save ready/);
assert.match(css, /#invadersContinueBtn/);
assert.match(registry, /saveId:\s*'bonus:booha_invaders'/);

console.log('Booha Invaders pass 3 checks passed.');
