#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EPISODE_ROOT = path.join(ROOT, 'content', 'utsuroba', 'episodes');
const index = JSON.parse(fs.readFileSync(path.join(EPISODE_ROOT, 'index.json'), 'utf8'));

assert.ok(Array.isArray(index.episodes) && index.episodes.length > 0,
  'Utsuroba episode index must contain at least one episode');

const ids = new Set();
for (const entry of index.episodes) {
  assert.ok(entry && entry.id && entry.file, 'episode index entries need id and file');
  assert.ok(!ids.has(entry.id), `duplicate episode id: ${entry.id}`);
  ids.add(entry.id);

  const filename = path.join(EPISODE_ROOT, entry.file);
  assert.ok(fs.existsSync(filename), `${entry.id}: episode file is missing`);
  const episode = JSON.parse(fs.readFileSync(filename, 'utf8'));
  assert.strictEqual(episode.id, entry.id, `${entry.id}: file id must match index`);
  assert.ok(episode.title && episode.titleJP, `${entry.id}: title is required`);
  assert.ok(Array.isArray(episode.lines) && episode.lines.length >= 3,
    `${entry.id}: episode needs at least three conversation lines`);
  assert.ok(Array.isArray(episode.checks) && episode.checks.length >= 2,
    `${entry.id}: episode needs at least two comprehension checks`);

  assert.ok(Array.isArray(episode.trail) && episode.trail.length >= 2,
    `${entry.id}: episode needs an authored evidence trail`);

  if (episode.mechanic) {
    assert.strictEqual(episode.mechanic.type, 'memory-theatre',
      `${entry.id}: unsupported mechanic type`);
    assert.ok(episode.mechanic.name && episode.mechanic.nameJP &&
      episode.mechanic.instruction && episode.mechanic.instructionJP,
      `${entry.id}: mechanic needs bilingual UI copy`);
    assert.ok(Array.isArray(episode.mechanic.acts) &&
      episode.mechanic.acts.length === episode.checks.length,
      `${entry.id}: Memory Theatre acts must match comprehension checks`);
    for (const [actIndex, act] of episode.mechanic.acts.entries()) {
      assert.ok(act.title && act.titleJP && act.caption && act.captionJP,
        `${entry.id} act ${actIndex + 1}: bilingual scene copy is required`);
    }
  }

  for (const [lineIndex, line] of episode.lines.entries()) {
    assert.ok(line.speaker && line.en,
      `${entry.id} line ${lineIndex + 1}: English speaker and dialogue are required`);
    assert.ok(!('speakerJP' in line) && !('jp' in line),
      `${entry.id} line ${lineIndex + 1}: conversation lines must be English-only`);
  }

  const trailIds = new Set();
  for (const [trailIndex, trail] of episode.trail.entries()) {
    const label = `${entry.id} trail ${trailIndex + 1}`;
    assert.ok(trail.id && !trailIds.has(trail.id), `${label}: unique id is required`);
    trailIds.add(trail.id);
    assert.ok(/^room_\d{2}$/.test(trail.roomId), `${label}: valid roomId is required`);
    assert.ok(trail.title && trail.titleJP && trail.text,
      `${label}: English evidence text and bilingual UI title are required`);
    assert.ok(trail.hint && trail.hintJP,
      `${label}: bilingual next-step direction is required`);
    assert.ok(!('textJP' in trail), `${label}: conversation evidence must be English-only`);
  }

  for (const [checkIndex, check] of episode.checks.entries()) {
    const label = `${entry.id} check ${checkIndex + 1}`;
    assert.ok(check.type && check.prompt && check.promptJP,
      `${label}: type and bilingual prompt are required`);
    assert.ok(Array.isArray(check.choices) && check.choices.length >= 2,
      `${label}: at least two choices are required`);
    assert.ok(Array.isArray(check.choicesJP) && check.choicesJP.length === check.choices.length,
      `${label}: choicesJP must align with choices`);
    assert.ok(new Set(check.choices).size === check.choices.length,
      `${label}: choices must be unique`);
    assert.ok(Number.isInteger(check.correct) && check.correct >= 0 &&
      check.correct < check.choices.length,
      `${label}: correct answer index is invalid`);
    assert.ok(check.evidence && check.evidenceJP,
      `${label}: bilingual evidence feedback is required`);
    if (episode.mechanic) {
      assert.ok(Number.isInteger(check.revealAct) && check.revealAct >= 0 &&
        check.revealAct < episode.mechanic.acts.length,
        `${label}: Memory Theatre revealAct is invalid`);
    }
  }
}

console.log(`Utsuroba episode audit passed: ${index.episodes.length} episode(s)`);
