#!/usr/bin/env node
'use strict';

// Pass 4: matrix-level QA for all authored Grimmerglen memories. This is
// intentionally independent of the browser so it can catch bad content in CI
// before a player reaches a typing popup.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen-data.js'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(dataSource, sandbox, { filename: 'grimmerglen-data.js' });
const data = sandbox.window.GRIMMERGLEN_DATA;

const difficulty = data.difficultyManifest;
assert(difficulty?.limits && difficulty.reviewed, 'QA must use the reviewed difficulty manifest');

function wordCount(value) {
  return String(value || '').replace(/[.!?,;:]+/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

function sentenceCount(value) {
  return String(value || '').split(/[.!?]+/).filter(part => part.trim()).length;
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[’']/g, '').trim().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/g, '');
}

assert(data && data.objectTypes.length === 8, 'QA matrix must cover all 8 collectible types');
for (const type of data.objectTypes) {
  const authored = data.tierMemories[type];
  const live = data.memories[type];
  assert(authored && live, `${type} must have authored and live memory data`);
  const entries = ['start', 'case', 'deep'].map(tier => authored[tier]);
  const exercises = ['start', 'case', 'deep'].map(tier => live[tier]);

  for (let index = 0; index < entries.length; index += 1) {
    const tier = ['start', 'case', 'deep'][index];
    const entry = entries[index];
    const exercise = exercises[index];
    assert(entry?.story?.en && entry.story.jp, `${type} ${tier} must have bilingual story copy`);
    assert(entry.story.readings && Object.keys(entry.story.readings).length > 0, `${type} ${tier} story must have furigana readings`);
    assert(entry.target && entry.jp, `${type} ${tier} must have a typing target and translation`);
    assert(entry.readings && Object.keys(entry.readings).length > 0, `${type} ${tier} target must have furigana readings`);
    assert(exercise.accepted?.length === 1, `${type} ${tier} must have one canonical accepted answer`);
    assert(normalize(exercise.accepted[0]) === normalize(entry.target), `${type} ${tier} live answer must match authored target`);
    assert(exercise.answerEn === entry.target && exercise.answerJp === entry.jp, `${type} ${tier} replay answer must match authored target`);
    assert(exercise.answerReadings === entry.readings, `${type} ${tier} replay must retain target readings`);
    assert(new Set(entry.full).size === entry.full.length, `${type} ${tier} full choices must not contain duplicates`);
    assert(new Set(entry.partial).size === entry.partial.length, `${type} ${tier} partial choices must not contain duplicates`);

    const limits = difficulty.limits[tier];
    const review = difficulty.reviewed[type]?.[tier];
    const targetWords = wordCount(entry.target);
    assert(review?.level && review.focus, `${type} ${tier} must have a reviewed difficulty note`);
    assert(targetWords >= limits.minWords && targetWords <= limits.maxWords,
      `${type} ${tier} target must contain ${limits.minWords}-${limits.maxWords} words (got ${targetWords})`);
    assert(sentenceCount(entry.target) <= limits.maxSentences,
      `${type} ${tier} target must contain at most ${limits.maxSentences} sentence`);
    if (tier === 'start') {
      assert(!/\b(and|but|because|when|although|while|before|that)\b/i.test(entry.target),
        `${type} Starter target must stay a single ordinary clause`);
    }
    if (tier === 'case') {
      assert(/\b(to|after|when|because|while)\b/i.test(entry.target),
        `${type} Case target must contain a meaningful grammatical relationship`);
    }
  }

  assert(wordCount(entries[2].target) >= difficulty.limits.deep.minWords,
    `${type} Deep target must remain a substantive advanced prompt`);
  assert(/\b(before|because|although|whenever|while|hoping|that|so|when)\b/i.test(entries[2].target),
    `${type} Deep target must use a reviewed relationship or advanced structure`);
  assert(exercises[0].options?.length === 3 && exercises[0].optionsVisible === true, `${type} Starter must expose three complete choices`);
  assert(exercises[1].options?.length === 3 && exercises[1].optionsVisible === false, `${type} Case must hide three partial choices behind a hint`);
  assert(exercises[2].options === null && exercises[2].optionsVisible === false && exercises[2].helpText, `${type} Deep must be recall-only with Japanese help`);
}

const ticketAnswers = ['start', 'case', 'deep'].map(tier => data.memories.ticket[tier].answerEn);
assert(ticketAnswers.every(answer => /station/i.test(answer)), 'Ticket QA must retain the station lesson at every tier');
assert(ticketAnswers.every(answer => !/bike/i.test(answer)), 'Ticket QA must not regress to the bike lesson');
assert(runtimeSource.includes('getGrimmerglenObjectsProgress'), 'runtime QA must retain weekly tier resolution');
assert(runtimeSource.includes('memoryComplete, memoryTier'), 'runtime QA must retain tier-aware completion handling');
assert(/assets:\s+'booha-assets-2026-515'/.test(serviceWorker), 'service worker must ship the current Muenba canonical target update');
assert(verify.includes('tests/grimmerglen-pass4-qa-audit.cjs'), 'verify.sh must run the Pass 4 QA audit');

console.log('Grimmerglen Pass 4 QA audit passed: 24 tier records, answer/replay alignment, unique clues, production limits, reviewed difficulty notes, and Ticket copy are clean.');
