#!/usr/bin/env node
/*
 * pace-report.cjs — Rainbow Pass A calibration report.
 *
 * Reads student saves and summarises the pace records the game engines
 * store (score entry → recentRuns[].pace, last 8 runs per game). Rainbow
 * stars are live with first-guess zones (PACE_ZONES in js/game-utils.js);
 * run this on real classroom data to tune those zones, then edit the table.
 *
 *   node tools/pace-report.cjs saves/*.json
 *   node tools/pace-report.cjs export.json --json > pace.json
 *
 * Input: JSON or CSV file(s) holding saves: one save, an array of saves, or
 * an export where saves sit in some field, even as JSON strings (a Wix
 * collection export as CSV or JSON works). Every object with a `scores` map
 * is treated as a save.
 *
 * Times are compared with each item's par (par already scales with word or
 * sentence length), so a pace of 0.80 means "answered in 80% of par".
 */
'use strict';

const fs = require('fs');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const files = args.filter(a => !a.startsWith('--'));
if (!files.length) {
  console.error('usage: node tools/pace-report.cjs <save.json> [more.json ...] [--json]');
  process.exit(1);
}

/* ── find saves anywhere in the input ─────────────────────────────── */
const saves = [];
function scan(v, depth = 0) {
  if (depth > 8 || v == null) return;
  if (typeof v === 'string') {
    const t = v.trim();
    if ((t[0] === '{' || t[0] === '[') && t.includes('"scores"')) {
      try { scan(JSON.parse(t), depth + 1); } catch (_) {}
    }
    return;
  }
  if (Array.isArray(v)) { v.forEach(x => scan(x, depth + 1)); return; }
  if (typeof v === 'object') {
    if (v.scores && typeof v.scores === 'object' && !Array.isArray(v.scores)) { saves.push(v); return; }
    Object.values(v).forEach(x => scan(x, depth + 1));
  }
}
// CSV (e.g. a Wix collection export): quoted fields with "" escapes.
function csvFields(text) {
  const out = [];
  let field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === '\n' || c === '\r') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out;
}
files.forEach(f => {
  let text;
  try { text = fs.readFileSync(f, 'utf8'); } catch (e) { console.error(`skip ${f}: ${e.message}`); return; }
  try { scan(JSON.parse(text)); }
  catch (_) { csvFields(text).forEach(v => scan(v)); }
});

/* ── gather runs per game ─────────────────────────────────────────── */
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r2 = x => (x == null ? null : Math.round(x * 100) / 100);

const games = {};   // saveId → { runs: [...] }
let students = 0;
saves.forEach(save => {
  let any = false;
  Object.entries(save.scores || {}).forEach(([id, entry]) => {
    (entry && Array.isArray(entry.recentRuns) ? entry.recentRuns : []).forEach(run => {
      const p = run && run.pace;
      if (!p || p.v !== 1 || !Array.isArray(p.t) || !p.t.length) return;
      any = true;
      const items = p.t.map((t, i) => ({ t, par: p.p[i], ok: p.f[i] === '1' }));
      const timed = items.filter(x => x.t != null && x.par > 0);
      const ratios = timed.filter(x => x.ok).map(x => x.t / x.par);   // pace of right-first-try answers
      (games[id] = games[id] || { runs: [] }).runs.push({
        firstTry: items.filter(x => x.ok).length / items.length,
        medRatio: median(ratios),
        frantic: p.fr || 0,
        n: items.length,
        allRatios: timed.map(x => x.t / x.par),
      });
    });
  });
  if (any) students++;
});

/* ── candidate rainbow rule: first-try ≥ 75%, median pace ≤ X, frantic ≤ 2 ── */
const ZONES = [0.6, 0.8, 1.0, 1.25, 1.5, 2.0];
const qualifies = (run, X) => run.firstTry >= 0.75 && run.medRatio != null && run.medRatio <= X && run.frantic <= 2;

const report = Object.keys(games).sort().map(id => {
  const runs = games[id].runs;
  const all = runs.flatMap(r => r.allRatios);
  return {
    game: id,
    runs: runs.length,
    firstTryMedian: r2(median(runs.map(r => r.firstTry))),
    pace: { p25: r2(q(all, 0.25)), median: r2(median(all)), p75: r2(q(all, 0.75)), p90: r2(q(all, 0.9)) },
    franticPerRun: r2(runs.reduce((t, r) => t + r.frantic, 0) / runs.length),
    rainbowShareAt: Object.fromEntries(ZONES.map(X => [X, r2(runs.filter(r => qualifies(r, X)).length / runs.length)])),
  };
});

if (asJson) {
  console.log(JSON.stringify({ students, saves: saves.length, games: report }, null, 2));
} else {
  console.log(`Pace report · ${saves.length} saves · ${students} with pace data\n`);
  if (!report.length) console.log('No pace records yet. They appear once students finish games on the updated app.');
  report.forEach(g => {
    console.log(`${g.game}  (${g.runs} runs)`);
    console.log(`  first-try median ${g.firstTryMedian} · frantic/run ${g.franticPerRun}`);
    console.log(`  pace (time ÷ par)  p25 ${g.pace.p25}  median ${g.pace.median}  p75 ${g.pace.p75}  p90 ${g.pace.p90}`);
    console.log(`  rainbow share if zone ≤  ${ZONES.map(X => `${X}: ${Math.round((g.rainbowShareAt[X] || 0) * 100)}%`).join('  ')}`);
    console.log('');
  });
  console.log('Pick, per game, the zone where roughly the top third of runs qualify.');
}
