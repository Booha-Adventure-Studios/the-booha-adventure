const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /let runIsActive = false;/,
  'Blitz must distinguish an active timed run from the start, wrong-answer, and finish screens');
assert.match(engine, /let visibilityPaused = false;/,
  'Blitz must track whether the active run was paused by page visibility');
assert.match(engine, /function pauseForVisibility\(\)[\s\S]*?elapsed = performance\.now\(\) - startTime;[\s\S]*?stopTimer\(\);[\s\S]*?stopBGM\(\);[\s\S]*?visibilityPaused = true;/,
  'hidden pages must freeze elapsed time and pause both the timer and BGM');
assert.match(engine, /function resumeFromVisibility\(\)[\s\S]*?startTime = performance\.now\(\) - elapsed;[\s\S]*?startBGM\(\);[\s\S]*?scheduleTimerTick\(0\);/,
  'visible pages must resume an active run from the frozen elapsed time');
assert.match(engine, /document\.addEventListener\('visibilitychange', handleVisibilityChange/,
  'Blitz must respond to document visibility changes');
assert.match(engine, /window\.addEventListener\('pagehide', pauseForVisibility/,
  'Blitz must cover page lifecycle suspension on mobile browsers');
assert.match(engine, /window\.addEventListener\('pageshow', resumeFromVisibility/,
  'Blitz must cover page lifecycle restoration on mobile browsers');
assert.match(engine, /overlay\._boohaBlitzVisibilityCleanup = \(\) => \{[\s\S]*?removeEventListener\('pageshow', resumeFromVisibility\)/,
  'visibility listeners must be removed when the overlay closes');
assert.match(engine, /btn\.classList\.add\('wrong'\);\s*runIsActive = false;/,
  'wrong answers must not be resumed as if they were a backgrounded active run');
assert.match(engine, /startTime = performance\.now\(\);\s*runIsActive = true;/,
  'retry and initial start must explicitly mark the timed run active');
assert.match(engine, /function showWin\(ms\) \{[\s\S]*?feedbackState = 'complete';\s*runIsActive = false;/,
  'the finish card must not restart a completed run when the page returns');
assert.match(engine, /overlay\._boohaBlitzVisibilityCleanup\?\.\(\);[\s\S]*?overlay\.remove\(\)/,
  'closing Blitz must clean up visibility listeners before removing the overlay');
assert.match(verify, /tests\/blitz-pass36-visibility-lifecycle-audit\.cjs/,
  'verify.sh must run the Blitz visibility lifecycle audit');

console.log('Blitz visibility-lifecycle audit passed: active runs pause fairly across hidden-page and mobile lifecycle transitions.');
