#!/usr/bin/env node
'use strict';

// Dead code pass (Nov 2026): empty placeholder files and unused data/CSS
// were removed (moved to _to_delete/, outside Git). Uhibon is kept on purpose:
// it is saved for later, even though no page loads it yet.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REMOVED = [
  'js/app.js', 'js/scoreboard.js', 'scoreboard.html',
  'data/core-games.json', 'data/maze.json', 'data/year.json',
  'theme/destruction_theme_1.css', 'theme/game-vt-patch.css',
];
const tracked = new Set(childProcess.execFileSync('git', ['ls-files', '-z'], { cwd: ROOT })
  .toString('utf8').split('\0').filter(Boolean)
  .filter(f => fs.existsSync(path.join(ROOT, f))));
for (const f of REMOVED) {
  assert.ok(!fs.existsSync(path.join(ROOT, f)), `${f} stays removed`);
  assert.ok(!tracked.has(f), `${f} is not tracked`);
}
// Nothing still points at the removed files.
const sources = [...tracked].filter(f => /\.(html|js|css|json)$/.test(f) && !f.startsWith('tests/'));
for (const f of sources) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const gone of REMOVED) {
    assert.ok(!text.includes(gone), `${f} must not reference removed ${gone}`);
  }
}
// Kept on purpose.
for (const keep of ['js/uhibon-chatbot.js', 'js/uhibon-knowledge.js', 'theme/uhibon-chatbot.css']) {
  assert.ok(fs.existsSync(path.join(ROOT, keep)), `${keep} is kept for later`);
}
console.log('Dead code removal tests passed.');
