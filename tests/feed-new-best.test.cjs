#!/usr/bin/env node
'use strict';
// Focused unit test for the "New Best!" badge (razzle-dazzle follow-up):
// persistRoundResult() now returns whether this round's score beat that
// level's previously recorded best. A level's very first clear trivially
// "beats" a previousBestScore of 0 — that must NOT count as a new best,
// or every first-time clear in the game would show the badge.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const engineSource = fs.readFileSync(path.join(ROOT, 'js/feed_booha_1.js'), 'utf8');

function extractFn(name) {
  const re = new RegExp(`function ${name}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n  \\}`);
  const match = engineSource.match(re);
  assert.ok(match, `${name}() must exist in the engine`);
  return match[0];
}

// persistRoundResult/levelKey close over these module-level names.
let state, feedProgress, persistenceReady, LEVELS;

function makePersistRoundResult() {
  const TOTAL_LEVELS = LEVELS.length; // mirrors `const TOTAL_LEVELS = LEVELS.length` in the engine
  void TOTAL_LEVELS;
  // eslint-disable-next-line no-eval
  const levelKey = eval(`(${extractFn('levelKey')})`);
  void levelKey;
  // getScoreSystem reads `window`, which is undefined here — its own
  // try/catch already handles that and returns null, so persistRoundResult
  // skips the scoreboard-submission branch entirely, same as a page with
  // no BoohaScoreSystem installed.
  // eslint-disable-next-line no-eval
  const getScoreSystem = eval(`(${extractFn('getScoreSystem')})`);
  void getScoreSystem;
  function writeFeedProgress() {}
  void writeFeedProgress;
  function syncProgressHud() {}
  void syncProgressHud;
  // eslint-disable-next-line no-eval
  return eval(`(${extractFn('persistRoundResult')})`);
}

function freshFeedProgress() {
  return {
    levelStars: {}, levelScores: {}, totalStars: 0,
    completedLevels: [], currentLevel: 0, currentScore: 0,
    currentStars: 0, campaignComplete: false, lastPlayedAt: 0,
    bestScore: 0
  };
}

function freshState() {
  return { levelIndex: 0, campaignScore: 0, campaignStars: 0, campaignComplete: false };
}

LEVELS = [{ id: 1 }, { id: 2 }, { id: 3 }];

// 1) A level's very first clear must not be flagged a new best.
{
  state = freshState();
  feedProgress = freshFeedProgress();
  persistenceReady = true;
  const isNewBest = makePersistRoundResult()(3, 500);
  assert.strictEqual(isNewBest, false, 'a first-ever clear should not be a "new best"');
  assert.strictEqual(feedProgress.levelScores['1'], 500, 'the score should still be recorded');
}

// 2) A second clear that beats the recorded best IS a new best.
{
  state = freshState();
  feedProgress = freshFeedProgress();
  feedProgress.levelScores['1'] = 500;
  persistenceReady = true;
  const isNewBest = makePersistRoundResult()(3, 650);
  assert.strictEqual(isNewBest, true, 'beating a real previous best should flag isNewBest');
  assert.strictEqual(feedProgress.levelScores['1'], 650, 'the higher score should be recorded');
}

// 3) A clear that ties or falls short of the recorded best is not a new best.
{
  state = freshState();
  feedProgress = freshFeedProgress();
  feedProgress.levelScores['1'] = 500;
  persistenceReady = true;
  const tie = makePersistRoundResult()(3, 500);
  assert.strictEqual(tie, false, 'tying the previous best should not flag isNewBest');

  feedProgress.levelScores['1'] = 500;
  const lower = makePersistRoundResult()(1, 300);
  assert.strictEqual(lower, false, 'a lower score should not flag isNewBest');
  assert.strictEqual(feedProgress.levelScores['1'], 500, 'a lower score must not overwrite the recorded best');
}

// 4) Before persistence is ready, the function must bail out cleanly
// (false, no throw) rather than crash on a missing progress object.
{
  state = freshState();
  feedProgress = freshFeedProgress();
  persistenceReady = false;
  const isNewBest = makePersistRoundResult()(3, 999);
  assert.strictEqual(isNewBest, false, 'persistRoundResult should return false, not throw, before persistence is ready');
}

console.log('Feed Booha new-best test passed: 4/4 cases');
