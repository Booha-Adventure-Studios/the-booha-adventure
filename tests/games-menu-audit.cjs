#!/usr/bin/env node
'use strict';

// Games Pass 5: the three curriculum game menus are thin shells over one
// shared engine (js/menu-core.js + theme/menu.css) and keep every contract.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const core = read('js/menu-core.js');
const css = read('theme/menu.css');
const sw = read('sw.js');
const MAZE = ['vocab-tap', 'spell-word', 'vocab-speed', 'sentence-tap', 'sentence-order',
  'sentence-speed', 'say-word', 'say-sentence', 'ask-question'];

for (const c of ['pb', 'br', 'bc']) {
  const file = `curriculum/${c}/games-index.html`;
  const page = read(file);
  assert.match(page, new RegExp(`<html lang="en" data-curriculum="${c}">`), `${file} must declare its curriculum`);
  const order = ['js/token.js', 'js/calendar.js', 'js/core/adventure-core.js', 'js/core/save-file.js',
    'js/sync-client.js', 'js/core/game-registry.js', 'js/core/score-system.js',
    'js/game-motion.js', 'js/booha-sfx.js', 'theme/menu.css', 'js/menu-core.js'];
  let last = -1;
  for (const src of order) {
    const at = page.indexOf(`/the-booha-adventure/${src}`);
    assert(at > last, `${file} must load ${src} in order (token gate and save stack first)`);
    last = at;
  }
  assert(page.indexOf("classList.add('token-checking')") < page.indexOf('js/token.js'), `${file} must start the token gate before token.js`);
  const tiles = [...page.matchAll(/<a class="tile" href="#" data-game="([a-z-]+)" data-hira="[^"]+">[^<]+<\/a>/g)].map(m => m[1]);
  assert.deepStrictEqual(tiles, MAZE, `${file} must list the nine games in maze order`);
  assert.strictEqual((page.match(/<style/g) || []).length, 1, `${file} may only keep the token-gate <style>`);
  assert(page.length < 6000, `${file} should stay a thin shell (got ${page.length} bytes)`);
  assert(sw.includes(`\${BASE}/${file}`), `sw.js must still precache ${file}`);
}

// Engine contracts
assert.match(core, /BASE \+ '\/game\.html\?week=' \+ encodeURIComponent\(week\) \+ '&game=' \+ encodeURIComponent\(t\.dataset\.game\)/,
  'tiles must launch game.html?week=…&game=…');
assert.match(core, /sessionStorage\.setItem\('booha_reopen_popup', '1'\)/, 'back must ask the maze to reopen its popup');
assert.match(core, /sessionStorage\.setItem\('booha_return_week', week\)/, 'back must hand the week back to the maze');
assert.match(core, /BASE \+ '\/maze\.html\?week=' \+ encodeURIComponent\(week\)/, 'back must return to the maze');
assert.match(core, /if \(!week \|\| week !== liveWeekSlug\(curr, calendar\)\) return 0;/, 'stars must show on the live week only');
assert.match(core, /weeklyStarsForGame\(saveIdFor\(curr, game\)\)/, 'stars must read weekly stars, never all-time stars');
assert.doesNotMatch(core, /scores\[[^\]]*\]\.stars|getStars\(/, 'menu must never read the all-time best stars');
assert.match(core, /t\.classList\.toggle\('gold3', n === 3\)/, 'three-star tiles keep the gold3 class');
for (const c of ['pb', 'br', 'bc']) {
  const m = core.match(new RegExp(`${c}: \\{[^}]*tree: '([^']+)', bg: '([^']+)'`));
  assert(m, `MENU_ART must define ${c}`);
  for (const asset of [m[1], m[2]]) {
    assert(fs.existsSync(path.join(ROOT, asset)), `${c} menu art ${asset} must exist`);
    assert(fs.statSync(path.join(ROOT, asset)).size <= 700 * 1024, `${c} menu art ${asset} must stay under 700 KB`);
  }
}

// Offline + motion
for (const asset of ['theme/menu.css', 'js/menu-core.js', 'js/booha-sfx.js', 'js/game-motion.js']) {
  assert(sw.includes(`\`\${BASE}/${asset}\``), `sw.js must precache ${asset}`);
}
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'menu.css must respect reduced motion');
assert.match(css, /html\[data-power="minimal"\] \.bm-fly/, 'menu.css must drop fireflies on slow devices');
const kf = /@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g;
let m;
while ((m = kf.exec(css))) {
  assert(!/(box-shadow|filter|width|height|background-position)\s*:/.test(m[2]), `menu.css @keyframes ${m[1]} must animate transform/opacity only`);
}

console.log('Games menu audit passed: three thin shells, shared engine, live-week stars, launch/back contracts, offline and motion rules.');
