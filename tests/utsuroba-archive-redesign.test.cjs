#!/usr/bin/env node
'use strict';

// Utsuroba "ink & lantern archive" profile, the teacher world switch, the
// gated Utsuroba portal, Utsuroba vocabulary, and the Adventure closet/heart
// follow-ups.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// ── Utsuroba profile ───────────────────────────────────────────────────────
const utsu = read('utsuroba-profile.html');
assert.match(utsu, /id="jp-toggle"[^>]*aria-pressed/, 'Japanese help must have a toggle');
assert.match(utsu, /html\.jp-off \.jp \{ display: none !important; \}/, 'turning Japanese off must hide the Japanese help lines');
assert.match(utsu, /localStorage\.setItem\('booha_utsu_jp'/, 'the Japanese choice must be remembered per device');
assert.match(utsu, /localStorage\.getItem\('booha_utsu_jp'\) === '0'/, 'the saved choice must apply before the page paints');
assert.match(utsu, /class="wword" data-vocab=/, 'story panels must make vocabulary words tappable');
assert.match(utsu, /postcard\?\.savedText/, 'the reading journal must show each memory postcard');
assert.match(utsu, /data-open-memory=/, 'restored drifter files must open their memory');
assert.match(utsu, /role="dialog" aria-modal="true"/, 'the opened memory must be an accessible dialog');
assert.match(utsu, /class="cab-word" data-cab=/, 'Word Cabinet words must show their meaning when tapped');
assert.match(utsu, /js\/ui\/world-portals\.js/, 'the Utsuroba profile must use the shared portal lock helper');
assert.match(utsu, /id="pnet-muenba" class="is-locked" aria-disabled="true"/, 'Muenba starts locked on the Utsuroba profile');
assert.match(utsu, /prefers-reduced-motion: reduce/, 'animations must respect reduced motion');

// ── Utsuroba portal is gated on the other profiles ────────────────────────
for (const page of ['profile.html', 'adventure-profile.html']) {
  const source = read(page);
  assert.match(source, /id="pnet-utsuroba" class="is-locked" aria-disabled="true"/, `${page}: Utsuroba portal starts locked`);
  assert.match(source, /BoohaPortals\.watch\('pnet-utsuroba'[\s\S]*?isWeeklyWorldGateOpen\(\)/, `${page}: Utsuroba opens with the weekly world gate`);
}
assert.match(read('js/ui/world-portals.js'), /function watch\(id, check\)/, 'world-portals.js must offer watch()');

// ── Teacher switch ─────────────────────────────────────────────────────────
const unlock = read('js/core/unlock-system.js');
assert.match(unlock, /'booha_dev_worlds'/, 'the teacher switch must use the booha_dev_worlds key');
assert.match(unlock, /if \(enabled\) \{[\s\S]*?window\.__devUtsuroba = true;[\s\S]*?window\.__devMuenba = true;[\s\S]*?window\.__devGrimmerglen = true;/, 'the switch must open all three worlds');
assert.match(unlock, /DEV · WORLDS OPEN/, 'the switch must show a visible reminder tag');
assert.match(unlock, /booha:devWorldsChanged/, 'the teacher switch must refresh live without a reload');
assert.match(read('js/karasuki.js'), /const keepWorlds = window\.__devWorldsSwitch === true;/, 'the Karasuki dev panel must not undo the switch');

// ── Utsuroba vocabulary: 8 words per memory per level ─────────────────────
const index = JSON.parse(read('content/utsuroba/episodes/index.json'));
let vocabularyTotal = 0;
for (const entry of index.episodes) {
  const episode = JSON.parse(read(`content/utsuroba/episodes/${entry.file}`));
  for (const [tier, block] of [['deep', episode], ['fresh', episode.fresh], ['start', episode.start]]) {
    if (!block || !Array.isArray(block.vocabulary)) continue;
    assert.strictEqual(block.vocabulary.length, 8, `${entry.id} ${tier}: 8 vocabulary words fill the Word Cabinet`);
    vocabularyTotal += block.vocabulary.length;
    const words = new Set();
    block.vocabulary.forEach(item => {
      assert.ok(item.word && item.definition && item.definitionJP, `${entry.id} ${tier}: ${item.word} needs English and Japanese help`);
      assert.ok(!words.has(item.word), `${entry.id} ${tier}: ${item.word} is listed twice`);
      words.add(item.word);
    });
  }
}
assert.strictEqual(vocabularyTotal, 144, 'the six memories contain 144 vocabulary entries across three levels');

// ── Adventure follow-ups ──────────────────────────────────────────────────
const atlas = read('js/ui/adventure-collection.js');
assert.match(atlas, /class="wcard-next"/, 'each Wanderer card must show visits left to the next heart');
assert.match(atlas, /つぎの ♥ まで あと/, 'the countdown must be readable for students');
const game = read('js/ui/adventure-game.js');
assert.match(game, /booha_closet_intro_v1/, 'the closet must explain the weekly rule once');
assert.match(game, /closet-now-tag/, "this week's skin must be marked on the shelf");
assert.match(game, /data-fallback=/, 'missing skin art must fall back to a season silhouette');

console.log('Utsuroba archive redesign tests passed.');
