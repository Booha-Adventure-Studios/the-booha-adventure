#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filename = path.join(__dirname, '..', 'js', 'muenba-data.js');
const runtimeFilename = path.join(__dirname, '..', 'js', 'muenba.js');
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

// Pass 4/16 accessibility guard: authored reading cards must wait for the
// read-gate, then move focus to a comprehension choice rather than exposing
// a shortcut straight to the next record.
const runtimeSource = fs.readFileSync(runtimeFilename, 'utf8');
function sourceSection(startName, endName) {
  const start = runtimeSource.indexOf(`function ${startName}`);
  const end = runtimeSource.indexOf(`function ${endName}`, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} focus contract`);
  return runtimeSource.slice(start, end);
}
assert(runtimeSource.includes('armCaseReadGate(box, openAction, caseData.intro)'), 'case intro must use the read gate');
assert(runtimeSource.includes('appendCaseLockedCheck(box, clue, mode, captureSession)'), 'case clues must reserve a check panel during the word sweep');
assert(runtimeSource.includes('startCaseWordSweep('), 'case clues must reveal a check after the word sweep');
assert(runtimeSource.includes('function renderCaseCheck(feedback = \'\')'), 'case clues must have a comprehension-check renderer');
assert(runtimeSource.includes('function renderCaseReview(index = 0, options = {})'), 'case solve must have a safe record-review renderer');
assert(runtimeSource.includes('function beginCaseRhythm()'), 'a correct case solve must enter the solved handoff');
assert(runtimeSource.includes("if (index === answerSet.correct) beginCaseRhythm();"), 'the final correct answer must start the rhythm handoff');
assert(runtimeSource.includes("session.phase = 'case-solved'"), 'a solved case must pause before rhythm');
assert(runtimeSource.includes('muenba-case-energy-start'), 'a solved case must expose the energy collection action');
assert(runtimeSource.includes('Start energy collection'), 'the solved action must name the energy collection step');
assert(runtimeSource.includes('shuffledCaseChoices(check, `clue-${session.caseIndex}-attempt-${session.caseChoiceAttempt || 0}`)'), 'clue choices must use the answer shuffler');
assert(runtimeSource.includes("shuffledCaseChoices(mode, 'final')"), 'final choices must use the answer shuffler');
assert(!sourceSection('renderCaseIntro', 'selectCaseDifficulty').includes('focusCaptureControl('), 'case intro must not auto-focus its action');
assert(!sourceSection('renderCaseClue', 'renderCaseCheck').includes('focusCaptureControl('), 'case clue read screen must not auto-focus an action');
assert(!runtimeSource.includes('muenba-case-capture'), 'the resolved case must not expose an extra capture button');
const finalQuestionSource = sourceSection('renderCaseQuestion', 'beginCaseRhythm');
assert(!finalQuestionSource.includes('muenba-case-record-list'), 'final solve must not display all records');
assert(finalQuestionSource.includes('muenba-case-review'), 'final solve must offer record review');
assert(finalQuestionSource.includes("captureSession.phase !== 'case-question'"), 'final choices must be phase-guarded');
assert(runtimeSource.includes('CASE_FINAL_PENALTY_MAX = 2'), 'final reading penalties must be capped at two');
assert(runtimeSource.includes("captureSession.phase = penaltyReview ? 'case-reread' : 'case-review'"), 'final mistakes must return through a reread phase');
assert(runtimeSource.includes('CASE_FINAL_PENALTY_ACCURACY_STEP'), 'final reading penalties must affect rhythm difficulty');

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
    assert(Array.isArray(mode.reviewClues) && mode.reviewClues.length > 0, `${caseId}.${modeName}.reviewClues must be non-empty`);
    assert(mode.reviewClues.every(index => Number.isInteger(index) && index >= 0 && index < mode.clues.length), `${caseId}.${modeName}.reviewClues must use valid clue indexes`);
    const checkTypes = new Set();
    let connectsRecords = false;
    mode.clues.forEach((clue, index) => {
      englishOnly(clue.title, `${caseId}.${modeName}.clues[${index}].title`);
      englishOnly(clue.text, `${caseId}.${modeName}.clues[${index}].text`);
      assert(Array.isArray(clue.keywords) && clue.keywords.length > 0, `${caseId}.${modeName}.clues[${index}] needs keywords`);
      const check = clue.check;
      assert(check && typeof check === 'object', `${caseId}.${modeName}.clues[${index}] needs a comprehension check`);
      checkTypes.add(check.type);
      if (check.requiresPrevious === true) connectsRecords = true;
      assert(['who', 'what', 'which', 'where', 'when', 'how-many', 'what-happened', 'why', 'meaning'].includes(check.type), `${caseId}.${modeName}.clues[${index}] uses an unsupported check type`);
      englishOnly(check.prompt, `${caseId}.${modeName}.clues[${index}].check.prompt`);
      assert.strictEqual(typeof check.promptJP, 'string', `${caseId}.${modeName}.clues[${index}].check.promptJP must be text`);
      assert(check.promptJP.includes('<ruby>'), `${caseId}.${modeName}.clues[${index}].check.promptJP needs furigana markup`);
      assert(Array.isArray(check.choices) && check.choices.length === 3, `${caseId}.${modeName}.clues[${index}].check.choices must contain exactly three options`);
      assert.strictEqual(new Set(check.choices).size, check.choices.length, `${caseId}.${modeName}.clues[${index}].check choices must be unique`);
      check.choices.forEach((choice, choiceIndex) => englishOnly(choice, `${caseId}.${modeName}.clues[${index}].check.choices[${choiceIndex}]`));
      assert(Number.isInteger(check.correct) && check.correct >= 0 && check.correct < check.choices.length, `${caseId}.${modeName}.clues[${index}].check.correct is out of range`);
    });
    assert(checkTypes.size >= 2, `${caseId}.${modeName} should vary comprehension question types`);
    if (modeName === 'start') assert.strictEqual(connectsRecords, false, `${caseId}.start should use direct record checks`);
    if (modeName === 'fresh') assert.strictEqual(connectsRecords, true, `${caseId}.fresh needs at least one cross-record check`);
    if (modeName === 'deep') assert([...checkTypes].some(type => type === 'why' || type === 'meaning'), `${caseId}.deep needs a why or meaning check`);
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
