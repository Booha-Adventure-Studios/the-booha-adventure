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
  assert.ok(episode.worldEcho && episode.worldEcho.roomId && episode.worldEcho.label && episode.worldEcho.labelJP,
    `${entry.id}: restored memories need a bilingual world echo`);
  assert.ok(/^room_\d{2}$/.test(episode.worldEcho.roomId),
    `${entry.id}: world echo roomId is invalid`);
  assert.ok(['lantern', 'candy', 'reflection'].includes(episode.worldEcho.motif),
    `${entry.id}: world echo motif is unsupported`);
  assert.ok(Number.isFinite(episode.worldEcho.x) && episode.worldEcho.x >= 0 && episode.worldEcho.x <= 1 &&
    Number.isFinite(episode.worldEcho.y) && episode.worldEcho.y >= 0 && episode.worldEcho.y <= 1,
    `${entry.id}: world echo position must be normalized`);
  assert.ok(Array.isArray(episode.lines) && episode.lines.length >= 3,
    `${entry.id}: episode needs at least three conversation lines`);
  assert.ok(Array.isArray(episode.checks) && episode.checks.length >= 2,
    `${entry.id}: episode needs at least two comprehension checks`);
  assert.ok(Array.isArray(episode.vocabulary) && episode.vocabulary.length >= 3,
    `${entry.id}: episode needs authored ESL vocabulary support`);
  const vocabularyWords = new Set();
  for (const [vocabularyIndex, item] of episode.vocabulary.entries()) {
    assert.ok(item.word && item.definition && item.definitionJP,
      `${entry.id} vocabulary ${vocabularyIndex + 1}: bilingual word help is required`);
    assert.ok(!vocabularyWords.has(item.word),
      `${entry.id}: vocabulary words must be unique`);
    vocabularyWords.add(item.word);
  }

  assert.ok(Array.isArray(episode.trail) && episode.trail.length >= 2,
    `${entry.id}: episode needs an authored evidence trail`);

  if (episode.mechanic) {
    assert.ok(['memory-theatre', 'evidence-board', 'emotion-thread'].includes(episode.mechanic.type),
      `${entry.id}: unsupported mechanic type`);
    assert.ok(episode.mechanic.name && episode.mechanic.nameJP &&
      episode.mechanic.instruction && episode.mechanic.instructionJP &&
      episode.mechanic.complete && episode.mechanic.completeJP,
      `${entry.id}: mechanic needs bilingual UI copy`);
    const mechanicItems = episode.mechanic.acts || episode.mechanic.items || episode.mechanic.beats;
    assert.ok(Array.isArray(mechanicItems) && mechanicItems.length === episode.checks.length,
      `${entry.id}: mechanic pieces must match comprehension checks`);
    for (const [itemIndex, item] of mechanicItems.entries()) {
      assert.ok(item.title && item.titleJP && item.caption && item.captionJP,
        `${entry.id} mechanic piece ${itemIndex + 1}: bilingual scene copy is required`);
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
    assert.ok(!('audioFile' in trail), `${label}: evidence trail must not depend on audio`);
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
    assert.ok(Array.isArray(check.evidenceLines) && check.evidenceLines.length > 0,
      `${label}: at least one evidence line is required`);
    for (const lineIndex of check.evidenceLines) {
      assert.ok(Number.isInteger(lineIndex) && lineIndex >= 0 && lineIndex < episode.lines.length,
        `${label}: evidence line index is invalid`);
    }
    if (episode.mechanic) {
      const mechanicItems = episode.mechanic.acts || episode.mechanic.items || episode.mechanic.beats;
      assert.ok(Number.isInteger(check.revealAct) && check.revealAct >= 0 &&
        check.revealAct < mechanicItems.length,
        `${label}: Memory Theatre revealAct is invalid`);
    }
    if (check.type === 'sequence') {
      assert.ok(Array.isArray(check.sequenceOrder) && check.sequenceOrder.length === check.choices.length,
        `${label}: sequence checks need an order for every choice`);
      assert.deepStrictEqual([...check.sequenceOrder].sort((a, b) => a - b),
        check.choices.map((_, index) => index),
        `${label}: sequenceOrder must contain each choice exactly once`);
    }
    if (check.type === 'detail') {
      assert.ok(Number.isInteger(check.matchLine) && check.matchLine >= 0 && check.matchLine < episode.lines.length,
        `${label}: detail checks need a valid matchLine`);
    }
    if (check.type === 'inference') {
      assert.ok(Number.isInteger(check.supportingLine) && check.supportingLine >= 0 && check.supportingLine < episode.lines.length,
        `${label}: inference checks need a valid supportingLine`);
    }
  }
}

console.log(`Utsuroba episode audit passed: ${index.episodes.length} episode(s)`);
