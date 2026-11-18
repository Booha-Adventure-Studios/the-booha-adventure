#!/usr/bin/env node
'use strict';

// Vowel Pop (extra game): blank rules, the on-device letter reader, scoring
// and wiring. The reader is checked on varied drawn letters (slant, size,
// wobble, start point, one or two strokes, capitals) that are different
// from its own templates, plus shapes that are not vowels.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SRC = read('games/vowel-pop.js');

const ctx = { window: {}, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(SRC, ctx, { filename: 'games/vowel-pop.js' });

setTimeout(() => {
  const L = ctx.window.VowelPopLogic;
  assert.ok(L, 'vowel-pop.js must export VowelPopLogic without a game page');
  const shown = (en, curr) => {
    const r = L.buildRound({ en }, curr);
    return r ? r.parts.map(p => (p.slot !== undefined ? '_' : p.ch)).join('') : null;
  };

  // ── Blank rules ────────────────────────────────────────────────────────
  assert.strictEqual(shown('wash the dishes', 'pb'), 'wash the d_shes', 'Pre-Boo: one single vowel in the key word');
  assert.strictEqual(shown('make the bed', 'pb'), 'm_ke the bed', 'Pre-Boo never blanks the silent e');
  assert.strictEqual(shown('bear', 'pb'), 'b__r', 'no single vowel: the team');
  assert.strictEqual(shown('go', 'pb'), 'g_', 'a short card still plays');
  assert.strictEqual(shown('TV', 'pb'), null, 'acronyms are skipped');
  assert.strictEqual(shown('shy', 'pb'), null, 'y is never a blank');
  assert.strictEqual(shown('friendship goals', 'br'), 'fr__ndship goals', 'Boo-riculum: a vowel team');
  assert.strictEqual(shown('travel habits', 'br'), 'trav_l habits', 'no team: the second vowel');
  assert.strictEqual(shown('sightseeing tour', 'br'), 'sights__ing tour', 'a three-vowel run splits into a real team');
  assert.strictEqual(shown('queen', 'bc'), 'qu__n', 'the u in qu is never a blank');
  assert.strictEqual(shown('hemisphere', 'bc'), 'h_m_spher_', 'Boo-Continuum: every vowel, up to three letters, silent e too');
  ['pb', 'br', 'bc'].forEach(curr => {
    let playable = 0, total = 0;
    fs.readdirSync(path.join(ROOT, 'content', curr)).forEach(month => {
      const file = path.join(ROOT, 'content', curr, month, 'vocab.json');
      if (!fs.existsSync(file)) return;
      JSON.parse(fs.readFileSync(file, 'utf8')).cards.forEach(card => {
        total++;
        const r = L.buildRound(card, curr);
        if (!r) return;
        playable++;
        assert.ok(r.slots.length >= 1 && r.slots.length <= 3, `${curr} "${card.en}": 1 to 3 letters`);
        r.slots.forEach(s => assert.ok(L.VOWELS.includes(s.letter), `${curr} "${card.en}": only vowels are blanks`));
        assert.strictEqual(r.parts.length, String(card.en).length, `${curr} "${card.en}": the phrase is kept whole`);
      });
    });
    assert.ok(playable / total >= 0.97, `${curr}: at least 97% of vocab cards are playable (${playable}/${total})`);
  });

  // ── Reader ─────────────────────────────────────────────────────────────
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = (a, b) => a + (b - a) * rnd();
  const arc = (cx, cy, rx, ry, from, to, n = 30) => Array.from({ length: n + 1 }, (_, k) => {
    const t = (from + (to - from) * k / n) * Math.PI / 180;
    return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
  });
  const line = (x1, y1, x2, y2, n = 14) => Array.from({ length: n + 1 }, (_, k) => ({ x: x1 + (x2 - x1) * k / n, y: y1 + (y2 - y1) * k / n }));
  const HAND = {
    a: () => [arc(.45, .65, R(.24, .34), R(.26, .36), R(-40, 10), R(-380, -340)), line(R(.68, .78), R(.3, .42), R(.68, .8), R(.95, 1.05))],
    a1: () => [arc(.45, .65, R(.24, .32), R(.26, .34), R(-30, 0), R(-370, -350)).concat(line(.72, .4, R(.72, .8), R(.95, 1.05)))],
    A: () => [line(R(.45, .55), 0, R(.05, .15), 1), line(R(.45, .55), 0, R(.85, .95), 1), line(R(.2, .32), R(.55, .68), R(.68, .8), R(.55, .68))],
    e: () => [line(R(.08, .2), R(.62, .72), R(.78, .88), R(.62, .72)).concat(arc(.47, .67, R(.3, .38), R(.28, .36), R(-10, 10), R(-320, -280)))],
    E: () => [line(.2, 0, .2, 1), line(.2, 0, R(.75, .9), 0), line(.2, R(.45, .55), R(.6, .8), R(.45, .55)), line(.2, 1, R(.75, .9), 1)],
    i: () => [line(R(.45, .55), R(.32, .42), R(.45, .58), 1), [{ x: .5, y: R(.05, .2) }, { x: .5 + R(0, .03), y: R(.1, .22) }]],
    i0: () => [line(R(.45, .55), R(.32, .42), R(.45, .58), 1)],
    I: () => [line(.5, 0, R(.45, .55), 1)],
    o: () => [arc(.5, .65, R(.28, .38), R(.28, .38), R(-120, -60), R(-480, -420))],
    o2: () => [arc(.5, .65, R(.28, .38), R(.24, .34), R(-120, -60), R(260, 300))],
    O: () => [arc(.5, .5, R(.3, .4), R(.42, .5), R(-120, -60), R(-480, -420))],
    u: () => [line(.2, R(.32, .4), .2, .76).concat(arc(.44, .76, .24, R(.18, .26), 180, 0, 16), line(.68, .76, .68, R(.32, .4))), line(.68, R(.34, .4), R(.68, .74), 1)],
    u0: () => [line(.2, R(.32, .4), .2, .76).concat(arc(.44, .76, .24, R(.18, .26), 180, 0, 16), line(.68, .76, .68, R(.32, .4)))],
    U: () => [line(.15, 0, .15, R(.55, .7)).concat(arc(.5, .65, .35, R(.3, .38), 180, 0, 16), line(.85, .65, .85, 0))],
  };
  const variant = strokes => {
    const slant = R(-0.18, 0.18), sx = R(0.75, 1.25), sy = R(0.8, 1.2), jit = 0.015;
    return strokes.map(s => s.map(p => ({ x: (p.x + slant * (1 - p.y)) * sx * 200 + R(-jit, jit) * 200, y: p.y * sy * 200 + R(-jit, jit) * 200 })));
  };
  let total = 0, fair = 0, wrongSure = 0;
  Object.entries(HAND).forEach(([k, gen]) => {
    const want = k[0].toLowerCase();
    for (let t = 0; t < 25; t++) {
      const r = L.recognize(variant(gen()));
      total++;
      if (r.kind === 'sure' && r.letter === want) fair++;
      else if (r.kind === 'choose' && (r.letter === want || r.other === want)) fair++;
      else if (r.kind === 'sure') wrongSure++;
    }
  });
  assert.ok(fair / total >= 0.95, `the reader is right (or asks between the right two) ${fair}/${total}`);
  // Children's letters are often very narrow or very wide.
  let wFair = 0, wTotal = 0;
  [0.5, 1.7].forEach(sx => Object.entries(HAND).forEach(([k, gen]) => {
    const want = k[0].toLowerCase();
    for (let t = 0; t < 6; t++) {
      const r = L.recognize(gen().map(st => st.map(p => ({ x: p.x * sx * 200 + R(-3, 3), y: p.y * 200 + R(-3, 3) }))));
      wTotal++;
      if ((r.kind === 'sure' && r.letter === want) || (r.kind === 'choose' && (r.letter === want || r.other === want))) wFair++;
    }
  }));
  assert.ok(wFair / wTotal >= 0.93, `narrow and wide letters still read (${wFair}/${wTotal})`);
  assert.ok(wrongSure / total <= 0.03, `the reader is confidently wrong at most 3% (${wrongSure}/${total})`);
  const NOT = {
    x: () => [line(.1, .3, .9, 1), line(.9, .3, .1, 1)],
    s: () => [arc(.5, .45, .3, .2, 0, -270).concat(arc(.5, .85, .3, .2, -90, 180))],
    z: () => [line(.1, .3, .9, .3).concat(line(.9, .3, .1, 1), line(.1, 1, .9, 1))],
    k: () => [line(.2, 0, .2, 1), line(.8, .3, .2, .65), line(.35, .55, .85, 1)],
  };
  let accepted = 0, n = 0;
  Object.values(NOT).forEach(gen => { for (let t = 0; t < 25; t++) { n++; if (L.recognize(variant(gen())).kind === 'sure') accepted++; } });
  assert.ok(accepted / n <= 0.1, `shapes that are not vowels are rarely read as one (${accepted}/${n})`);
  assert.strictEqual(L.recognize([]).kind, 'unsure', 'an empty pad is never an answer');
  assert.strictEqual(L.recognize([[{ x: 5, y: 5 }]]).kind, 'unsure', 'a single tap is never an answer');

  // ── Scoring ────────────────────────────────────────────────────────────
  assert.strictEqual(L.cardResult([1, 1]), 'ok');
  assert.strictEqual(L.cardResult([1, 2]), 'half');
  assert.strictEqual(L.cardResult([1, 0]), 'miss');

  // ── Game rules in the source ───────────────────────────────────────────
  assert.match(SRC, /const SAVE_ID = `\$\{CFG\.curriculum\}-extra:vowel_pop`;/, 'saves under the extra id');
  assert.ok(SRC.indexOf('run.summary()') < SRC.lastIndexOf('U.emitGameEnd('), 'summary before emitGameEnd');
  assert.match(SRC, /run\.pauseClock\(\)/, 'a replay pauses the pace clock');
  assert.match(SRC, /const POP = window\.BoohaPop \|\| new Proxy/, 'plays on without game-pop.js');
  assert.match(SRC, /touch-action:none/, 'the pad never scrolls or zooms the page');
  assert.match(SRC, /addEventListener\('touchmove', e => e\.preventDefault\(\), \{ passive: false \}\)/);
  assert.doesNotMatch(SRC, /\bfetch\(|XMLHttpRequest|WebSocket/, 'the reader runs on the device, no network');
  assert.match(SRC, /if \(unread >= 2\) showVowelButtons\(\)/, 'two unreadable drawings bring the vowel buttons');
  assert.match(SRC, /kind === 'choose'\) \{ askWhich\(/, 'look-alike letters ask which one');
  assert.doesNotMatch(SRC, /claude/i);

  // ── Wiring ─────────────────────────────────────────────────────────────
  const reg = read('js/core/game-registry.js');
  assert.match(reg, /id:\s+'vowel_pop',\s+gameKey:\s+'vowel-pop',\s+name:\s+'Vowel Pop',\s+file:\s+'games\/vowel-pop\.js'/);
  assert.ok(reg.indexOf("id:             'week_boss'") < reg.indexOf("id:             'vowel_pop'"), 'listed after the Week Boss (menu: under Booha Bites; profile: next to the boss)');
  const core = read('js/game-core.js');
  assert.match(core, /'vowel-pop':\s+'vocab'/);
  assert.match(core, /'vowel-pop':\s+\['extra',\s+'Vowel Pop'\]/);
  assert.match(read('js/menu-core.js'), /'vowel-pop': 'Draw the missing vowel!'/);
  assert.match(read('js/menu-core.js'), /if \(i > 0 && i % 3 === 0\) a\.classList\.add\('bm-row-start'\)/);
  assert.match(read('theme/menu.css'), /\.bm-lane-extra > \.tile-extra\.bm-row-start \{ grid-column: 2; \}/);
  const pg = read('js/ui/profile-game.js');
  assert.match(pg, /'vowel-pop': '<svg/, 'profile icon');
  assert.match(pg, /games\.filter\(g => !g\.boss\)\.concat\(games\.filter\(g => g\.boss\)\)/, 'boss last, two cards a row');
  assert.match(read('js/game-utils.js'), /vowel_pop: 1\.5/, 'rainbow-star pace zone');

  console.log(`Vowel Pop passed: blank ladder on every vocab card, reader ${fair}/${total} fair (${wrongSure} confidently wrong), narrow/wide ${wFair}/${wTotal}, non-vowels ${accepted}/${n}, scoring and wiring.`);
}, 0);
