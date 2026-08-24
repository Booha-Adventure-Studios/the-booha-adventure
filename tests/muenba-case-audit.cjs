#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filename = path.join(__dirname, '..', 'js', 'muenba-data.js');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
const data = context.window.MUENBA_DATA;
assert(data && typeof data === 'object', 'MUENBA_DATA must be exported');
assert(Array.isArray(data.caseOrder) && data.caseOrder.length > 0, 'caseOrder must be non-empty');
assert(data.cases && typeof data.cases === 'object', 'cases must be an object');

const japanese = /[\u3040-\u30ff\u3400-\u9fff]/;
const ghostIds = new Set((data.ghosts || []).map(ghost => ghost.id));
const seen = new Set();
const positionMap = new Map();

for (const ghost of data.ghosts || []) {
  assert.strictEqual(typeof ghost.kana, 'string', `${ghost.id}.kana must be text`);
  assert(/^[\u30a0-\u30ffー・\s]+$/.test(ghost.kana), `${ghost.id}.kana must use katakana`);
  englishOnly(ghost.personality, `${ghost.id}.personality`);
}

function englishOnly(value, label) {
  assert.strictEqual(typeof value, 'string', `${label} must be text`);
  assert(value.trim(), `${label} must not be empty`);
  assert(!japanese.test(value), `${label} contains Japanese story text`);
}

for (const caseId of data.caseOrder) {
  assert(!seen.has(caseId), `caseOrder repeats ${caseId}`);
  seen.add(caseId);
  const caseData = data.cases[caseId];
  assert(caseData, `caseOrder points to missing ${caseId}`);
  assert.strictEqual(caseData.id, caseId, `${caseId} id must match its key`);
  assert(ghostIds.has(caseData.ghostId), `${caseId} points to a missing ghost`);
  englishOnly(caseData.title, `${caseId}.title`);
  englishOnly(caseData.eyebrow, `${caseId}.eyebrow`);
  englishOnly(caseData.intro, `${caseId}.intro`);
  const correctPositions = [];

  for (const modeName of ['start', 'fresh', 'deep']) {
    const mode = caseData[modeName];
    assert(mode, `${caseId}.${modeName} is required`);
    assert(Array.isArray(mode.clues) && mode.clues.length === 3, `${caseId}.${modeName}.clues must contain exactly three records`);
    assert.strictEqual(new Set(mode.clues.map(clue => clue.title)).size, mode.clues.length, `${caseId}.${modeName} clue titles must be unique`);
    mode.clues.forEach((clue, index) => {
      englishOnly(clue.title, `${caseId}.${modeName}.clues[${index}].title`);
      englishOnly(clue.text, `${caseId}.${modeName}.clues[${index}].text`);
    });
    englishOnly(mode.prompt, `${caseId}.${modeName}.prompt`);
    assert.strictEqual(typeof mode.promptJP, 'string', `${caseId}.${modeName}.promptJP must be text`);
    assert(mode.promptJP.trim(), `${caseId}.${modeName}.promptJP must not be empty`);
    assert(mode.promptJP.includes('<ruby>'), `${caseId}.${modeName}.promptJP needs furigana markup`);
    assert(Array.isArray(mode.choices) && mode.choices.length === 3, `${caseId}.${modeName}.choices must contain exactly three options`);
    assert.strictEqual(new Set(mode.choices).size, mode.choices.length, `${caseId}.${modeName}.choices must be unique`);
    mode.choices.forEach((choice, index) => englishOnly(choice, `${caseId}.${modeName}.choices[${index}]`));
    assert(Number.isInteger(mode.correct) && mode.correct >= 0 && mode.correct < mode.choices.length, `${caseId}.${modeName}.correct is out of range`);
    correctPositions.push(mode.correct);
    englishOnly(mode.resolution, `${caseId}.${modeName}.resolution`);
  }
  const modes = ['start', 'fresh', 'deep'];
  const wordCount = mode => mode.clues.map(clue => clue.text).concat(mode.prompt, mode.choices).join(' ').trim().split(/\s+/).length;
  assert(wordCount(caseData.start) < wordCount(caseData.fresh), `${caseId} Starter Memory should be shorter than Case Memory`);
  assert(wordCount(caseData.fresh) <= wordCount(caseData.deep), `${caseId} Deep Memory should not be shorter than Case Memory`);
  for (const leftMode of modes) {
    for (const rightMode of modes) {
      if (leftMode >= rightMode) continue;
      assert.notStrictEqual(caseData[leftMode].prompt, caseData[rightMode].prompt, `${caseId} ${leftMode} and ${rightMode} prompts must differ`);
      assert.notStrictEqual(caseData[leftMode].resolution, caseData[rightMode].resolution, `${caseId} ${leftMode} and ${rightMode} resolutions must differ`);
      assert.notDeepStrictEqual(caseData[leftMode].choices, caseData[rightMode].choices, `${caseId} ${leftMode} and ${rightMode} choices must differ`);
    }
  }
  positionMap.set(caseId, correctPositions);
}

assert.strictEqual(seen.size, data.caseOrder.length, 'caseOrder must contain unique cases');
assert.deepStrictEqual(Object.keys(data.cases).sort(), [...seen].sort(), 'every case must appear in caseOrder');
const allCorrectPositions = [...seen].flatMap(caseId => positionMap.get(caseId));
assert(new Set(allCorrectPositions).size === 3, 'correct answer positions should use all three slots');
console.log(`Muenba case audit passed: ${seen.size} ordered case${seen.size === 1 ? '' : 's'}.`);
