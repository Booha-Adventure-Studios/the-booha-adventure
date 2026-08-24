#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const EPISODE_ROOT = path.join(ROOT, 'content', 'utsuroba', 'episodes');
const index = JSON.parse(fs.readFileSync(path.join(EPISODE_ROOT, 'index.json'), 'utf8'));
const files = Object.fromEntries(index.episodes.map(entry => [entry.id, entry.file]));

function responseFor(url) {
  const relative = url.replace(/^\.\//, '');
  const filename = relative.endsWith('episodes/index.json')
    ? path.join(EPISODE_ROOT, 'index.json')
    : path.join(ROOT, relative);
  return Promise.resolve({
    ok: true,
    json: async () => JSON.parse(fs.readFileSync(filename, 'utf8')),
  });
}

const window = {};
const context = {
  window,
  console,
  fetch: responseFor,
};
vm.runInNewContext(
  fs.readFileSync(path.join(ROOT, 'js', 'utsuroba-episodes.js'), 'utf8'),
  context,
  { filename: 'js/utsuroba-episodes.js' },
);

async function main() {
  await window.UTSUROBA_EPISODES_READY;
  const resolver = window.UTSUROBA_EPISODES_RESOLVE;
  assert.strictEqual(typeof resolver, 'function', 'Utsuroba episode resolver must be available');

  for (const entry of index.episodes) {
    assert.ok(files[entry.id], `${entry.id}: resolver fixture must have an episode file`);
    const modes = {
      start: resolver(entry.id, 'start'),
      fresh: resolver(entry.id, 'fresh'),
      deep: resolver(entry.id, 'deep'),
    };

    assert.strictEqual(modes.start.difficulty, 'start', `${entry.id}: Starter override must resolve to start`);
    assert.strictEqual(modes.fresh.difficulty, 'fresh', `${entry.id}: Case override must resolve to fresh`);
    assert.strictEqual(modes.deep.difficulty, 'deep', `${entry.id}: Deep override must resolve to deep`);
    assert.deepStrictEqual(
      Object.keys(modes).map(mode => modes[mode].id),
      [entry.id, entry.id, entry.id],
      `${entry.id}: tier resolution must preserve episode identity`,
    );

    assert.strictEqual(modes.start.mechanic.name, 'Starter Memory', `${entry.id}: Starter mechanic label is unstable`);
    assert.strictEqual(modes.fresh.mechanic.name, 'Case Memory', `${entry.id}: Case mechanic label is unstable`);
    assert.strictEqual(modes.fresh.mechanic.type, 'evidence-board', `${entry.id}: Case mechanic type is unstable`);
    assert.strictEqual(modes.deep.mechanic.name, 'Deep Memory', `${entry.id}: Deep mechanic label is unstable`);
    assert.strictEqual(modes.start.postcard.title, 'Starter memory postcard', `${entry.id}: Starter postcard is unstable`);
    assert.strictEqual(modes.fresh.postcard.title, 'Case memory postcard', `${entry.id}: Case postcard is unstable`);
    assert.strictEqual(modes.deep.postcard.title, 'Deep memory postcard', `${entry.id}: Deep postcard is unstable`);
    assert.deepStrictEqual(
      modes.fresh.trail.map(clue => clue.label),
      ['01 / CLUE', '02 / LINK', '03 / ANSWER'],
      `${entry.id}: Case trail must resolve as clue, link, answer`,
    );
    for (const mode of Object.keys(modes)) {
      assert.strictEqual(modes[mode].checks.length, 3, `${entry.id} ${mode}: resolved checks must remain complete`);
      assert.strictEqual(modes[mode].trail.length, 3, `${entry.id} ${mode}: resolved trail must remain complete`);
      assert.ok(modes[mode].postcard.chunks.length === 3, `${entry.id} ${mode}: postcard chunks must remain complete`);
    }
  }

  const save = { utsuroba: { readingDifficulty: 'deep' } };
  const adventure = { save: { load: () => save } };
  context.BoohaAdventure = adventure;
  window.BoohaAdventure = adventure;
  const firstId = index.episodes[0].id;
  assert.strictEqual(resolver(firstId).difficulty, 'deep', 'Saved Deep mode should resolve without an override');
  assert.strictEqual(resolver(firstId, 'fresh').difficulty, 'fresh', 'Explicit Case override should beat the saved mode');
  save.utsuroba.readingDifficulty = 'invalid';
  assert.strictEqual(resolver(firstId).difficulty, 'start', 'Invalid saved mode should safely default to Starter');

  console.log(`Utsuroba resolver audit passed: ${index.episodes.length} episodes × 3 tiers preserve runtime contracts.`);
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
