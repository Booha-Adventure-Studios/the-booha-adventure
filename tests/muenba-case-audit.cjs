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

  for (const modeName of ['fresh', 'deep']) {
    const mode = caseData[modeName];
    assert(mode, `${caseId}.${modeName} is required`);
    assert(Array.isArray(mode.clues) && mode.clues.length > 0, `${caseId}.${modeName}.clues must be non-empty`);
    mode.clues.forEach((clue, index) => {
      englishOnly(clue.title, `${caseId}.${modeName}.clues[${index}].title`);
      englishOnly(clue.text, `${caseId}.${modeName}.clues[${index}].text`);
    });
    englishOnly(mode.prompt, `${caseId}.${modeName}.prompt`);
    assert.strictEqual(typeof mode.promptJP, 'string', `${caseId}.${modeName}.promptJP must be text`);
    assert(mode.promptJP.trim(), `${caseId}.${modeName}.promptJP must not be empty`);
    assert(Array.isArray(mode.choices) && mode.choices.length > 1, `${caseId}.${modeName}.choices must have options`);
    mode.choices.forEach((choice, index) => englishOnly(choice, `${caseId}.${modeName}.choices[${index}]`));
    assert(Number.isInteger(mode.correct) && mode.correct >= 0 && mode.correct < mode.choices.length, `${caseId}.${modeName}.correct is out of range`);
    englishOnly(mode.resolution, `${caseId}.${modeName}.resolution`);
  }
}

assert.strictEqual(seen.size, data.caseOrder.length, 'caseOrder must contain unique cases');
assert.deepStrictEqual(Object.keys(data.cases).sort(), [...seen].sort(), 'every case must appear in caseOrder');
console.log(`Muenba case audit passed: ${seen.size} ordered case${seen.size === 1 ? '' : 's'}.`);
