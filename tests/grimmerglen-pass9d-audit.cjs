#!/usr/bin/env node
/*
 * Grimmerglen Pass 9D audit
 *
 * This is intentionally a static contract audit.  The browser-side module
 * owns the live DOM and save APIs, so these checks protect the sequencing and
 * persistence rules without requiring a browser harness.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js/grimmerglen.js'), 'utf8');
const saveFile = fs.readFileSync(path.join(root, 'js/core/save-file.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

let failures = 0;
function assert(condition, message) {
  if (condition) return;
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function section(source, start, end) {
  const startAt = source.indexOf(start);
  assert(startAt >= 0, `missing section start: ${start}`);
  if (startAt < 0) return '';
  const endAt = end ? source.indexOf(end, startAt + start.length) : -1;
  assert(!end || endAt >= 0, `missing section end: ${end}`);
  return source.slice(startAt, endAt >= 0 ? endAt : undefined);
}

const intro = section(runtime, 'const MARIETTA_DIALOGUE = [', 'const MARIETTA_DIALOGUE_READINGS = {');
assert(intro.includes("en: 'Oh! Hello, hello! You found me.'"),
  'the first Marietta dialogue line is the hello introduction');
assert(intro.includes("jp: 'あっ、こんにちは、こんにちは！わたしを見つけたのね。'"),
  'the first Marietta dialogue line has the corrected Japanese text');

const dialogue = section(runtime, 'function renderMariettaDialogue(', 'function renderMariettaHandoff(');
assert(dialogue.includes('const allowSkip = options.allowSkip === true;'),
  'the introduction renderer receives an explicit skip policy');
assert(dialogue.includes('${allowSkip ? `<button'),
  'the skip-this-week button is conditional, not always shown');
assert(dialogue.includes('id="mg-dialogue-skip-btn"'),
  'the weekly introduction skip button has a stable selector');
assert(dialogue.includes('options.onSkip'),
  'the skip button invokes the caller-supplied skip transition');
assert(dialogue.includes('if (typeof onFinished === \'function\') onFinished();'),
  'the normal introduction close button invokes the caller-supplied finish transition');

const weeklySeen = section(runtime, 'function hasMariettaIntroBeenSeenThisWeek()', 'function markMariettaIntroSeenThisWeek(');
assert(weeklySeen.includes('readGrimmerglenWeekly().mariettaIntroSeen === true'),
  'once-per-week gating reads the weekly seen flag');

const lifetimeSeen = section(runtime, 'function hasMariettaIntroEverBeenSeen()', 'function markMariettaIntroSeenThisWeek(');
assert(lifetimeSeen.includes('readGrimmerglen().mariettaIntroEverSeen === true'),
  'skip availability reads the lifetime introduction marker');

const markIntro = section(runtime, 'function markMariettaIntroSeenThisWeek(', 'function markGrimmerglenRoomVisited(');
assert(markIntro.includes('const data = loadGrimmerglenSave();'),
  'introduction completion reloads the full save before writing');
assert(markIntro.includes('const weekly = ensureWeeklyGrimmerglen(data);'),
  'introduction completion writes through the normalized weekly bucket');
assert(markIntro.includes('weekly.mariettaIntroSeen = true;'),
  'both finish and skip paths mark the introduction seen for this week');
assert(markIntro.includes('weekly.mariettaIntroSkipped = skipped === true;'),
  'the save distinguishes a normal finish from a skip');
assert(markIntro.includes('data.grimmerglen.mariettaIntroEverSeen = true;'),
  'finishing or skipping records that the introduction has been seen ever');
assert(markIntro.includes('window.BoohaSaveFile.save(data)'),
  'introduction state is persisted through the shared save API');

const finishIntro = section(runtime, 'function finishMariettaIntroduction()', 'function skipMariettaIntroduction(');
assert(finishIntro.indexOf('markMariettaIntroSeenThisWeek(false)') >= 0,
  'normal close records a non-skipped weekly introduction');
assert(finishIntro.indexOf('renderMariettaQuestBriefing()') > finishIntro.indexOf('markMariettaIntroSeenThisWeek(false)'),
  'normal close advances to the quest briefing after recording the intro');
assert(!finishIntro.includes('unlockGrimmerglenNavigation'),
  'normal intro close does not unlock navigation prematurely');

const skipIntro = section(runtime, 'function skipMariettaIntroduction()', 'function acceptMariettaHelp(');
assert(skipIntro.indexOf('markMariettaIntroSeenThisWeek(true)') >= 0,
  'skip records a skipped weekly introduction');
assert(skipIntro.indexOf('renderMariettaQuestBriefing()') > skipIntro.indexOf('markMariettaIntroSeenThisWeek(true)'),
  'skip advances to the quest briefing after recording the intro');
assert(!skipIntro.includes('unlockGrimmerglenNavigation'),
  'skipping the intro does not unlock navigation prematurely');

const openPanel = section(runtime, 'function openMariettaPanel()', 'function closeMariettaPanel(');
const handoffAt = openPanel.indexOf('if (carriedObject) renderMariettaHandoff()');
const weeklyAt = openPanel.indexOf('else if (hasMariettaIntroBeenSeenThisWeek()) renderMariettaQuestBriefing()');
const dialogueAt = openPanel.indexOf('else renderMariettaDialogue(finishMariettaIntroduction, {');
assert(handoffAt >= 0 && weeklyAt > handoffAt && dialogueAt > weeklyAt,
  'Marietta click order is handoff, weekly quest, then first-time introduction');
assert(openPanel.includes('allowSkip: hasMariettaIntroEverBeenSeen(),'),
  'first-ever introduction is mandatory while later weeks may skip');
assert(openPanel.includes('onSkip: skipMariettaIntroduction'),
  'the panel wires the optional skip to the skip persistence path');

const defaults = section(saveFile, 'function _defaultWeeklyWorlds()', 'function _ensureWeeklyWorlds(');
assert(defaults.includes('mariettaIntroSeen: false,'),
  'weekly defaults reset the Marietta seen flag');
assert(defaults.includes('mariettaIntroSkipped: false,'),
  'weekly defaults reset the Marietta skipped flag');

const reset = section(saveFile, 'function resetWeekly(occurrenceKey)', 'function exportJSON()');
assert(/worlds:\s+_defaultWeeklyWorlds\(\),/.test(reset),
  'weekly rollover recreates the Grimmerglen weekly bucket');
assert(reset.includes("data.weekly.worlds.occurrenceKey = occurrenceKey || '';"),
  'weekly rollover stamps the new occurrence key');

assert(verify.includes('tests/grimmerglen-pass9d-audit.cjs'),
  'verify.sh runs the Pass 9D audit');

if (failures) {
  console.error(`Grimmerglen Pass 9D audit failed with ${failures} issue(s).`);
  process.exit(1);
}
console.log('Grimmerglen Pass 9D audit passed: Marietta order, skip policy, persistence, and weekly reset contracts are intact.');
