#!/usr/bin/env node
'use strict';

// Grimmerglen "cotton-candy memory scrapbook" profile, the tree portal icon on
// every profile, and maze-order trail / record book on the Adventure Log.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = file => fs.existsSync(path.join(ROOT, file));

// ── Maze order (Vocab Tap first) ───────────────────────────────────────────
const ctx = { window: {}, BoohaAdventure: { registerSystem() {} } };
vm.createContext(ctx);
vm.runInContext(`${read('js/core/game-registry.js')}; this.R = BoohaGameRegistry;`, ctx);
const MAZE = ['vocab_tap', 'spell_word', 'vocab_speed', 'sentence_tap', 'sentence_order', 'sentence_speed', 'say_word', 'say_sentence', 'ask_question'];
for (const curr of ['pb', 'br', 'bc']) {
  // JSON compare: the registry runs in its own vm realm.
  assert.strictEqual(JSON.stringify(ctx.R.getForCurriculumInMazeOrder(curr).map(g => g.id)), JSON.stringify(MAZE), `${curr}: games must follow the maze order`);
  const tiles = [...read(`curriculum/${curr}/games-index.html`).matchAll(/data-game="([a-z-]+)"/g)].map(m => m[1].replace(/-/g, '_'));
  assert.deepStrictEqual(tiles, MAZE, `${curr}: the maze tiles and the profile order must agree`);
}
assert.strictEqual(ctx.R.getForCurriculum('br').length, 9, 'the registry itself keeps all nine games');
for (const file of ['js/ui/profile-game.js', 'js/ui/profile-progress.js', 'js/ui/adventure-log.js']) {
  assert.match(read(file), /getForCurriculumInMazeOrder/, `${file} must list games in maze order`);
}

// ── Tree portal icon on every profile ──────────────────────────────────────
assert.ok(exists('assets/img/profile/portal-grimmerglen-tree.webp'), 'the tree portal icon must exist');
assert.ok(fs.statSync(path.join(ROOT, 'assets/img/profile/portal-grimmerglen-tree.webp')).size <= 30 * 1024, 'the portal icon must stay tiny');
for (const page of ['profile.html', 'adventure-profile.html', 'utsuroba-profile.html', 'muenba-profile.html', 'grimmerglen-profile.html']) {
  const source = read(page);
  assert.match(source, /portal-grimmerglen-tree\.webp/, `${page}: Grimmerglen portal must use the tree icon`);
  assert.doesNotMatch(source, /portal-grimmerglen\.webp/, `${page}: the old Grimmerglen icon must be gone`);
}

// ── Grimmerglen page ───────────────────────────────────────────────────────
const gg = read('grimmerglen-profile.html');
assert.match(gg, /grimmerglen-profile-background-web\.webp/, 'the hero must use the Grimmerglen background');
assert.match(gg, /marietta\/marietta_04\.webp/, 'Marietta stays in the center of the hero');
assert.doesNotMatch(gg, /booha_grimmerglen/, 'the Booha cat is not on the profile');
assert.match(gg, /id="jp-toggle"/, 'the Japanese toggle is present');
assert.match(gg, /localStorage\.setItem\('booha_utsu_jp'/, 'the Japanese choice is shared with the other worlds');
assert.match(gg, /role="dialog" aria-modal="true"/, 'an opened memory is an accessible dialog');
assert.match(gg, /const weekStars = MEMORY_TIER_CHOICES\.reduce\(\(sum, tier\) => sum \+ weeklyTierStats\(tier\)\.found, 0\);/, 'the jar shows this week\'s clues across all tiers');
assert.match(gg, /The jar starts empty every Sunday/, 'the page says the jar empties weekly');
for (const file of ['grimmerglen-profile-background-web.webp', 'grimmerglen-memory-jar-crop.webp']) {
  assert.ok(exists(`assets/img/grimmerglen/${file}`), `${file} must exist`);
  assert.ok(fs.statSync(path.join(ROOT, 'assets/img/grimmerglen', file)).size <= 200 * 1024, `${file} must stay light`);
}

// Star slots sit inside the jar glass (art is 300 × 413 units) and hold a full week.
const slotSrc = gg.slice(gg.indexOf('const JAR_SLOTS = (() => {'), gg.indexOf('const STAR_COLORS'));
const slotCtx = {};
vm.createContext(slotCtx);
vm.runInContext(`${slotSrc}; this.S = JAR_SLOTS;`, slotCtx);
assert.ok(slotCtx.S.length >= 72, 'the jar must fit 24 clues × 3 tiers');
for (const [x, y] of slotCtx.S) {
  assert.ok(y >= 120 && y <= 350, `star at y=${y} must stay between the jar shoulder and its base`);
  assert.ok(x >= 48 && x <= 248, `star at x=${x} must stay inside the glass walls`);
}

console.log('Grimmerglen scrapbook tests passed.');
