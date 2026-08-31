#!/usr/bin/env node
'use strict';

// Pass 10D: the typing field has furigana guidance, and the Ticket memory's
// story consistently teaches station rather than bike.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen-data.js'), 'utf8');
const typingSource = fs.readFileSync(path.join(root, 'js', 'grimmerglen-typing.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(dataSource, sandbox, { filename: 'grimmerglen-data.js' });
const data = sandbox.window.GRIMMERGLEN_DATA;

assert(data?.stories?.ticket, 'Ticket must have an authored memory story');
assert.match(data.stories.ticket.en, /station/i, 'Ticket story must teach station');
assert.doesNotMatch(data.stories.ticket.en, /bike/i, 'Ticket story must not teach bike');
assert.match(data.stories.ticket.jp, /駅/, 'Ticket story Japanese must use station');

for (const tier of ['start', 'case', 'deep']) {
  const exercise = data.memories.ticket[tier];
  assert.doesNotMatch(exercise.answerEn, /bike/i, `Ticket ${tier} answer must not teach bike`);
  if (tier !== 'start') {
    assert.match(exercise.answerEn, /station/i, `Ticket ${tier} answer must teach station`);
    assert.match(exercise.accepted[0], /station/i, `Ticket ${tier} accepted answer must teach station`);
  }
  assert.doesNotMatch(exercise.accepted[0], /bike/i, `Ticket ${tier} accepted answer must not teach bike`);
}

assert.match(typingSource, /class="mgty-input-label"/, 'typing field must expose a visible guidance label');
assert.match(typingSource, /furiJP\('答えをタイプしてね'/, 'typing guidance label must render furigana');
assert.match(typingSource, /aria-label="Type your answer"/, 'typing input must retain an accessible label');
assert.match(verify, /tests\/grimmerglen-pass10d-audit\.cjs/, 'verify.sh must run the Pass 10D audit');

console.log('Grimmerglen Pass 10D audit passed: typing guidance has furigana and Ticket consistently teaches station.');
