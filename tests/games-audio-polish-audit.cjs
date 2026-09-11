const fs = require('fs');
const assert = require('assert');

const utils = fs.readFileSync('js/game-utils.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');
const files = [
  'ask-question.js', 'say-sentence.js', 'say-word.js',
  'sentence-order.js', 'sentence-speed.js', 'sentence-tap.js',
  'spell-word.js', 'vocab-speed.js', 'vocab-tap.js',
];
const games = Object.fromEntries(files.map(file => [file, fs.readFileSync(`games/${file}`, 'utf8')]));

assert.match(utils, /_sfxLastPlayed: new Map\(\)/,
  'shared SFX playback must retain per-sound throttle state');
assert.match(utils, /now - last < 140/,
  'shared SFX playback must reject machine-gun repeats');
assert.match(utils, /createAudioGate\(\{ cooldownMs = 650, timeoutMs = 8000 \}/,
  'shared audio cooldown helper must expose the common listen policy');
assert.match(utils, /if \(active && !replace\) return false/,
  'normal listen controls must ignore taps while audio is active');
assert.match(utils, /now - lastAccepted < cooldownMs/,
  'audio controls must enforce a post-press cooldown');
assert.match(utils, /setTimeout\(finish, timeoutMs\)/,
  'audio controls must have a defensive release timeout');

for (const file of ['ask-question.js', 'say-word.js', 'say-sentence.js']) {
  assert.match(games[file], /createAudioGate\(\{ cooldownMs: 650/,
    `${file} must use the shared listen-button audio gate`);
  assert.match(games[file], /lastSfxAt/, `${file} must throttle its HTML SFX clones`);
}

assert.match(games['vocab-tap.js'], /if \(wordLocked\) return/,
  'vocab-tap must ignore a second word clip while the first is playing');
assert.match(games['sentence-tap.js'], /if \(activeSent\) return/,
  'sentence-tap must ignore a second sentence clip while the first is playing');
for (const file of ['spell-word.js', 'sentence-order.js']) {
  assert.match(games[file], /if \(activeAudio\) return/,
    `${file} speaker control must ignore taps while its clip is playing`);
}
for (const file of ['vocab-speed.js', 'sentence-speed.js']) {
  assert.match(games[file], /streakAudioCache/, `${file} must cache streak SFX objects`);
  assert.doesNotMatch(games[file], /new Audio\(CFG\.sfxBase \+ '(?:fire|level4)\.mp3'/,
    `${file} must not allocate a new fire SFX object for every streak event`);
}

for (const file of files) {
  assert.match(games[file], /locked|isBusy|pickCooldown|wordLocked|activeAudio|activeSent/,
    `${file} must retain an answer or audio acceptance guard`);
}

assert.match(verify, /tests\/games-audio-polish-audit\.cjs/,
  'verify.sh must run the nine-engine audio abuse audit');

console.log('Nine-engine audio polish audit passed: shared cooldown, active-clip protection, SFX throttling, and streak-audio caching are covered.');
