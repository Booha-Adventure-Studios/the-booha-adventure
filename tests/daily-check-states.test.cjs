#!/usr/bin/env node
'use strict';

// Daily Check states and event log (2026-11-08 decision).
// The opening requires the check before the first adventure entry each day,
// with an honest, confirmed "Skip today". States: pending / done / skipped /
// failed. Closing with × never grants entry. Skips, closes and technical
// failures live in meta.dailyCheckEvents (a map keyed by event id) and are
// never erased by a later completion; checkIn keeps completions only.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SRC = read('js/daily-check.js');

function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

function boot({ day = '2026-11-09', ready = true, save = {}, failPatch = false } = {}) {
  let blob = JSON.parse(JSON.stringify(save));
  const session = {};
  const listeners = {};
  const fired = [];
  const window = {
    BOOHA_READY: ready,
    CALENDAR: { getTodayKey: () => day },
    // Same semantics as js/core/save-file.js: patch() is a SHALLOW
    // Object.assign on the section; patchDeep() merges one level down.
    // (A deep-merging stub once hid a bug that erased event history.)
    BoohaSaveFile: {
      load: () => JSON.parse(JSON.stringify(blob)),
      patch: (section, obj) => {
        if (failPatch) return false;
        if (!isObj(blob[section])) blob[section] = {};
        Object.assign(blob[section], JSON.parse(JSON.stringify(obj)));
        return true;
      },
      patchDeep: (section, key, obj) => {
        if (failPatch) return false;
        if (!isObj(blob[section])) blob[section] = {};
        if (!isObj(blob[section][key])) blob[section][key] = {};
        Object.assign(blob[section][key], JSON.parse(JSON.stringify(obj)));
        return true;
      },
    },
  };
  const document = {
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    dispatchEvent: ev => { fired.push(ev); (listeners[ev.type] || []).forEach(fn => fn(ev)); },
  };
  const ctx = {
    window, document, console: { error() {}, warn() {}, log() {} },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    sessionStorage: { getItem: k => (k in session ? session[k] : null), setItem: (k, v) => { session[k] = String(v); } },
    localStorage: { getItem: k => (k === 'booha_userid' ? 'student-1' : null) },
    setTimeout: fn => fn(),
  };
  Object.assign(ctx, window);              // bare CALENDAR / BoohaSync lookups
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'media-config.js'), 'utf8'), ctx); // pages load media-config.js first
  vm.runInNewContext(SRC, ctx);
  return {
    DC: ctx.BoohaDailyCheck,
    blob: () => blob,
    setDay: d => { day = d; },
    becomeReady: () => { ctx.BOOHA_READY = true; (listeners['booha:ready'] || []).forEach(fn => fn()); },
    setFailPatch: v => { failPatch = v; },
    removePatchDeep: () => { delete window.BoohaSaveFile.patchDeep; },
    fired,
  };
}
const evs = h => Object.values((h.blob().meta || {}).dailyCheckEvents || {});

// 1. Fresh day: pending. × records 'closed' but does not let the student in.
{
  const h = boot();
  assert.strictEqual(h.DC.todayState(), 'pending');
  h.DC.recordEvent('closed', 'br', { mode: 'check' });
  assert.strictEqual(h.DC.todayState(), 'pending', 'closing with × never grants entry');
  assert.deepStrictEqual(evs(h).map(e => e.type), ['closed']);
}

// 2. Confirmed skip: skipped for the rest of the day; never written to checkIn.
{
  const h = boot();
  h.DC.markSkip('br');
  assert.strictEqual(h.DC.todayState(), 'skipped');
  assert(!((h.blob().meta || {}).checkIn || {})['2026-11-09'], 'a skip is not a checkIn record');
  const ev = evs(h)[0];
  assert.strictEqual(ev.type, 'student_skip');
  assert.strictEqual(ev.day, '2026-11-09');
  assert.strictEqual(ev.curr, 'br');
  assert(Number(ev.ts) > 0, 'skip has a time');
}

// 3. A later completion wins the day but keeps the skip in the history.
{
  const h = boot();
  h.DC.recordEvent('closed', 'br');
  h.DC.markSkip('br');
  assert(h.DC.markDone(80, 'br'));
  assert.strictEqual(h.DC.todayState(), 'done');
  assert.deepStrictEqual(evs(h).map(e => e.type).sort(), ['closed', 'student_skip'], 'history survives completion');
  assert.strictEqual(h.blob().meta.checkIn['2026-11-09'].st, 'done');
}

// 4. Technical failure is its own state (never a skip); latest bypass wins.
{
  const h = boot();
  h.DC.recordEvent('load_failure', 'br', { detail: { message: 'offline' } });
  assert.strictEqual(h.DC.todayState(), 'failed');
  h.DC.markSkip('br');
  assert.strictEqual(h.DC.todayState(), 'skipped');
  const types = evs(h).map(e => e.type);
  assert(types.includes('load_failure') && types.includes('student_skip'), 'both kept, separately');
}

// 5. Save failure: the tab still honours the bypass (session mirror).
{
  const h = boot({ failPatch: true });
  h.DC.recordEvent('save_failure', 'br', { detail: { pct: 60 } });
  assert.strictEqual(evs(h).length, 0, 'the save itself failed');
  assert.strictEqual(h.DC.todayState(), 'failed', 'but the student is not locked out');
}

// 6. Before identity is ready: nothing written to the save; flushed after.
{
  const h = boot({ ready: false });
  h.DC.markSkip('br');
  assert.strictEqual(evs(h).length, 0, 'never write before BOOHA_READY');
  assert.strictEqual(h.DC.events('2026-11-09').length, 1, 'kept in the tab mirror');
  h.becomeReady();
  assert.strictEqual(evs(h).length, 1, 'flushed into the save once ready');
  assert.strictEqual(h.DC.todayState(), 'skipped');
}

// 7. A new day starts pending again; event ids are unique map keys.
{
  const h = boot();
  h.DC.markSkip('br');
  h.setDay('2026-11-10');
  assert.strictEqual(h.DC.todayState(), 'pending', 'a skip lasts one day');
  h.DC.markSkip('br'); h.DC.markSkip('br');
  const ids = Object.keys(h.blob().meta.dailyCheckEvents);
  assert.strictEqual(new Set(ids).size, 3);
  assert(ids.every(id => /^\d{4}-\d{2}-\d{2}_/.test(id)), 'ids start with the day');
}

// 7b. History accumulates across many writes, completions and the flush,
//     and other meta keys are never disturbed.
{
  const h = boot({ save: { meta: { allTimeStars: 42, weekLog: { w: { a: 1 } } } } });
  h.DC.recordEvent('closed', 'br');
  h.DC.recordEvent('load_failure', 'br');
  h.DC.markSkip('br');
  h.DC.markDone(90, 'br');
  h.DC.recordEvent('closed', 'br', { mode: 'retake' });
  assert.deepStrictEqual(evs(h).map(e => e.type).sort(), ['closed', 'closed', 'load_failure', 'student_skip'],
    'every event survives every later write');
  assert.strictEqual(h.blob().meta.allTimeStars, 42, 'other meta untouched');
  assert.deepStrictEqual(h.blob().meta.weekLog, { w: { a: 1 } });
  // Older days stay too.
  h.setDay('2026-11-10');
  h.DC.markSkip('br');
  assert.strictEqual(evs(h).length, 5, 'a new day adds, never replaces');
}
{
  // Flushing tab-mirror events must also merge, not replace.
  const h = boot({ ready: false, save: { meta: { dailyCheckEvents: { old1: { day: '2026-11-01', type: 'student_skip', ts: 1 } } } } });
  h.DC.markSkip('br');
  h.becomeReady();
  assert.deepStrictEqual(Object.keys(h.blob().meta.dailyCheckEvents).length, 2, 'flush keeps the older event');
}
{
  // Fallback path (no patchDeep): still merges.
  const h = boot();
  h.DC.recordEvent('closed', 'br');
  h.removePatchDeep();
  h.DC.markSkip('br');
  assert.strictEqual(evs(h).length, 2, 'fallback merges too');
}

// 7c. Adventure Log calendar can page back to months that only have events.
{
  const ctx = { window: {}, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null }, console };
  ctx.window = ctx;
  vm.runInNewContext(read('js/ui/adventure-log.js'), ctx);
  const T = ctx.BoohaAdventureLog._test;
  const byDay = T.dcEventsByDay({ e1: { day: '2026-09-14', type: 'load_failure', ts: 1 }, bad: { day: 'x', type: 'nope' } }, {});
  assert.deepStrictEqual(Object.keys(byDay), ['2026-09-14']);
  assert.strictEqual(T.calendarEarliest({ '2026-11-02': { g: 1 } }, { '2026-10-20': { st: 'done' } }, byDay, '2026-11-08'),
    '2026-09-14', 'an event-only month is the earliest reachable month');
  assert.strictEqual(T.calendarEarliest({}, {}, {}, '2026-11-08'), '2026-11-08');
}

// 8. Legacy "Enter anyway" record (checkIn st:'skip') counts as skipped today.
{
  const h = boot({ save: { meta: { checkIn: { '2026-11-09': { st: 'skip', pct: null, curr: 'br', ts: 1 } } } } });
  assert.strictEqual(h.DC.todayState(), 'skipped');
}

// 9. Stars and streaks still count completions only.
{
  const ls = read('js/core/level-stars.js');
  assert(/checkIn\[key\]\.st === 'done'/.test(ls), 'level stars count done only');
  assert(!/dailyCheckEvents/.test(ls), 'events never affect stars');
}

// 10. Opening screen contract (index.html).
{
  const html = read('index.html');
  for (const phrase of ['Enter anyway', 'ENTER ANYWAY', '<span>あとで</span>', 'optional homework'])
    assert(!html.includes(phrase), `index.html must not offer "${phrase}"`);
  assert.match(html, /<button id="dcSideLink" class="dcSideLink"/, 'small Skip link, not a peer button');
  // Compare visible text (tags removed, furigana readings dropped).
  const dlg = html.slice(html.indexOf('<div id="dcSkipConfirm"'), html.indexOf('<button id="dcConfirmCheck"'));
  const visible = dlg.replace(/<rt>[^<]*<\/rt>/g, '').replace(/<[^>]+>/g, '');
  assert.match(visible, /きょうは チェックを スキップする？/, 'confirmation question');
  assert.match(visible, /ぼうけんログに のこり、先生も見られます。/, 'confirmation says the skip is kept and the teacher can see it');
  assert.match(dlg, /<span class="nw"><ruby>先生<rt>せんせい<\/rt><\/ruby>も<ruby>見<rt>み<\/rt><\/ruby>られます。<\/span>/,
    'the last phrase never breaks (no orphaned す。)');
  assert.match(html, /<button id="dcConfirmCheck" class="btn btnGold"/, '"Do the check" is the primary confirmation');
  assert.match(html, /<button id="dcConfirmSkip" class="dcConfirmSkip"/, '"Skip and continue" is subdued');
  const cont = html.slice(html.indexOf("startBtn.addEventListener('click'"), html.indexOf("startBtn.addEventListener('click'") + 400);
  assert(!/markSkip/.test(cont), 'Continue records nothing');
  assert(/dailyCheckState\(\) === 'pending'/.test(cont), 'Continue refuses while pending');
  assert(/markSkip/.test(html.slice(html.indexOf("getElementById('dcConfirmSkip').addEventListener"), html.indexOf("getElementById('dcConfirmSkip').addEventListener") + 300)),
    'only the confirmed Skip records a student_skip');
  for (const st of ['done', 'skipped', 'failed', 'pending']) assert(new RegExp(`\\b${st}:`).test(html.slice(html.indexOf('const DC_OPENING'))), `opening copy for ${st}`);
}

console.log('Daily Check states test passed: pending/done/skipped/failed, × never grants entry, events kept apart from completions.');
