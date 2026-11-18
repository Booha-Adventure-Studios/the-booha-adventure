#!/usr/bin/env node
'use strict';

// Don't Talk to Poopika (extra game): what Poopika eats at each level, that
// every wrong choice is really wrong (never a second right question), the
// order of the week, the audio warp range, the game rules in the source,
// and wiring. Runs over every questions.json in content/.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SRC = read('games/poopika.js');

const ctx = { window: {}, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(SRC, ctx, { filename: 'games/poopika.js' });

setTimeout(() => {
  const L = ctx.window.PoopikaLogic;
  assert.ok(L, 'poopika.js must export PoopikaLogic without a game page');
  const round = (en, curr) => L.buildRound({ en, n: 1 }, curr, 5);
  const wrongOf = r => JSON.parse(JSON.stringify(r.choices.filter(c => c !== r.answer)));   // plain arrays (the game runs in its own context)

  // ── What Poopika eats ──────────────────────────────────────────────────
  let r = round('Where is the rug?', 'pb');
  assert.strictEqual(r.answer, 'Where'); assert.strictEqual(r.rest, 'is the rug?');
  assert.strictEqual(round('Who cooks in the kitchen?', 'pb').answer, 'Who');
  assert.strictEqual(round('How many rooms are there?', 'pb').answer, 'How', 'Pre-Boo: only the first word');
  r = round('Do you have a garden?', 'pb');
  assert.strictEqual(r.answer, 'Do');
  assert.deepStrictEqual(wrongOf(r).sort(), ['Are', 'Does'], 'Pre-Boo Do: the classic slips, "Are you have…?" and "Does you…?"');
  r = round('Is the bathroom clean?', 'pb');
  assert.deepStrictEqual(wrongOf(r).sort(), ['Are', 'Does'], 'Pre-Boo Is: "Does it clean?" and "Are the bathroom…?"');
  assert.deepStrictEqual(wrongOf(round('Are you good at math?', 'pb')).sort(), ['Do', 'Is'], '"Do you good at math?"');
  assert.strictEqual(round('Is the bathroom clean?', 'pb').choices.length, 3, 'Pre-Boo: three candy buttons');

  r = round('How many rooms are there?', 'br');
  assert.strictEqual(r.answer, 'How many'); assert.ok(wrongOf(r).includes('How much'), 'How many ↔ How much');
  assert.ok(!wrongOf(r).includes('What kind of'), 'never a second right question');
  r = round('How do you relax after school?', 'br');
  assert.strictEqual(r.answer, 'How do'); assert.ok(wrongOf(r).includes('How does'), 'agreement: "How does you…"');
  assert.strictEqual(r.choices.length, 4, 'Boo-riculum: four choices');
  r = round('What kind of music do you like?', 'bc');
  assert.strictEqual(r.answer, 'What kind of'); assert.ok(wrongOf(r).includes('How many kind of'));
  r = round('What types of food do you like?', 'bc');
  assert.ok(!wrongOf(r).includes('How many types of'), '"How many types of food…" is a right question, so never offered');
  r = round('What makes a good friend?', 'br');
  assert.strictEqual(r.answer, 'What makes'); assert.ok(wrongOf(r).includes('What make'));
  assert.ok(wrongOf(r).every(w => !/^(What|Who|Which) makes$/.test(w)), 'only words that cannot be a subject');
  assert.strictEqual(round('Describe your ideal summer day.', 'br'), null, 'not a question: skipped');
  assert.strictEqual(round('In what way does the story end?', 'bc'), null, 'starts with a preposition: skipped');

  // ── Every question in the app ──────────────────────────────────────────
  const GRAMMATICAL_FOR = {
    do: ['can', 'could', 'will', 'would', 'should', 'must', 'may', 'might', 'did'],
    modal: ['do', 'did', 'can', 'could', 'will', 'would', 'should', 'must', 'may', 'might'],
  };
  const stats = {};
  for (const curr of ['pb', 'br', 'bc']) {
    let total = 0, ok = 0, worstWeek = 15;
    for (const month of fs.readdirSync(path.join(ROOT, 'content', curr))) {
      const f = path.join(ROOT, 'content', curr, month, 'questions.json');
      if (!fs.existsSync(f)) continue;
      const cards = JSON.parse(fs.readFileSync(f, 'utf8')).cards || [];
      for (let w = 0; w * 15 < cards.length; w++) {
        const week = cards.slice(w * 15, w * 15 + 15);
        const rounds = [];
        week.forEach((card, i) => {
          total++;
          const rd = L.buildRound(card, curr, 11 + i);
          if (!rd) return;
          ok++;
          rounds.push({ card, round: rd });
          const need = curr === 'pb' ? 3 : 4;
          assert.strictEqual(rd.choices.length, need, `${curr} "${card.en}": ${need} choices`);
          assert.strictEqual(new Set(rd.choices).size, need, `"${card.en}": no repeated choice`);
          assert.ok(rd.choices.includes(rd.answer), `"${card.en}": the answer is offered`);
          assert.strictEqual(`${rd.answer} ${rd.rest}`.toLowerCase(), card.en.trim().replace(/\s+/g, ' ').toLowerCase(), `"${card.en}": answer + rest is the question`);
          const head = rd.answer.toLowerCase().split(' ');
          for (const wr of wrongOf(rd).map(x => x.toLowerCase())) {
            const ws = wr.split(' ');
            if (rd.kind === 'aux') {
              const fam = L.FAMILY[head[0]];
              const ban = (GRAMMATICAL_FOR[fam] || []).filter(x => x !== L.TWIN[head[0]]);
              assert.ok(!ban.includes(ws[0]), `"${card.en}": ${wr} would also be right`);
            }
            if (rd.kind === 'wh-aux') {
              const aux = head[head.length - 1], waux = ws[ws.length - 1];
              assert.ok(waux !== aux && !(L.FAMILY[aux] === 'modal' && ['do', 'does', 'did'].includes(waux)), `"${card.en}": ${wr} keeps a working verb`);
            }
            if (rd.kind === 'wh') assert.ok(!(head[0] === 'what' && ws[0] === 'which') && !(head[0] === 'which' && ws[0] === 'what'), `"${card.en}": What/Which are both right`);
            if (rd.kind === 'det') assert.ok(!['which', 'what', 'whose'].includes(ws[0]) || ws[0] === head[0], `"${card.en}": ${wr} also fits before a noun`);
          }
        });
        worstWeek = Math.min(worstWeek, rounds.length);
        // The same answer never twice in a row when the week allows it.
        const order = L.spread(rounds, L.rng(w + 1));
        const freq = {}; rounds.forEach(x => { freq[x.round.answer] = (freq[x.round.answer] || 0) + 1; });
        const most = Math.max(0, ...Object.values(freq));
        if (most <= Math.ceil(rounds.length / 2)) {
          for (let i = 1; i < order.length; i++) assert.notStrictEqual(order[i].round.answer, order[i - 1].round.answer, `${curr} ${month} w${w + 1}: back-to-back "${order[i].round.answer}"`);
        }
      }
    }
    stats[curr] = { ok, total, worstWeek };
  }
  assert.strictEqual(stats.pb.ok, stats.pb.total, 'Pre-Boo: every question plays');
  assert.ok(stats.br.ok / stats.br.total >= 0.99, 'Boo-riculum: 99%+ play');
  assert.ok(stats.bc.ok / stats.bc.total >= 0.97, 'Boo-Continuum: 97%+ play');
  for (const c of ['pb', 'br', 'bc']) assert.ok(stats[c].worstWeek >= 10, `${c}: every week has 10+ questions`);

  // ── Warp: odd but followable ───────────────────────────────────────────
  let lo = 9, hi = 0;
  for (let s = 1; s < 400; s++) {
    const w = L.makeWarp(L.rng(s));
    let a = 9, b = 0;
    for (let t = 0; t < 5; t += 0.02) { const v = L.warpRate(t, w); a = Math.min(a, v); b = Math.max(b, v); }
    assert.ok(b - a > 0.05, 'it really wobbles');
    lo = Math.min(lo, a); hi = Math.max(hi, b);
  }
  assert.ok(lo >= 0.7 && hi <= 1.12, `warp stays between 0.7× and 1.12× (got ${lo.toFixed(2)}–${hi.toFixed(2)})`);

  // ── Game rules in the source ───────────────────────────────────────────
  assert.match(SRC, /const SAVE_ID = `\$\{CFG\.curriculum\}-extra:poopika`;/, 'saves under the extra id');
  assert.ok(SRC.indexOf('run.summary()') < SRC.lastIndexOf('U.emitGameEnd('), 'summary before emitGameEnd');
  assert.match(SRC, /run\.pauseClock\(\)/, 'a replay pauses the pace clock');
  assert.match(SRC, /const POP = window\.BoohaPop \|\| new Proxy/, 'plays on without game-pop.js');
  assert.match(SRC, /a\.preservesPitch = !!clean/, 'warped plays bend pitch; the clean play does not');
  assert.match(SRC, /setTimeout\(\(\) => play\(true\), 450\)/, 'a fixed question plays once more, clean');
  assert.match(SRC, /later\(go, 7000\)/, 'never stalls on a slow clip');
  assert.match(SRC, /if \(tries >= 2\) \{ finishCard\(null, 'miss'\)/, 'one more try, then the answer');
  assert.match(SRC, /prefers-reduced-motion:reduce\)\{html\.pk-world\.pk-melt body::before/, 'reduced motion: no stretching');
  assert.match(SRC, /\.pk-sign\{[^}]*background:#fffaf6;color:var\(--pk-ink\)/, 'the question card stays plain and readable');
  assert.doesNotMatch(SRC, /\bfetch\(|XMLHttpRequest/, 'audio plays through the shared gate, no direct fetches');
  for (const n of [1, 2, 3]) assert.ok(fs.existsSync(path.join(ROOT, `assets/img/wanderers/poopika-${n}.webp`)), `poopika-${n}.webp`);

  // ── Wiring ─────────────────────────────────────────────────────────────
  const reg = read('js/core/game-registry.js');
  assert.match(reg, /id:\s+'poopika',\s+gameKey:\s+'poopika',\s+name:\s+"Don't Talk to Poopika",\s+file:\s+'games\/poopika\.js'/);
  assert.ok(reg.indexOf("id:             'vowel_pop'") < reg.indexOf("id:             'poopika'"), 'listed after Vowel Pop (menu and profile: next to it)');
  const core = read('js/game-core.js');
  assert.match(core, /'poopika':\s+'questions'/);
  assert.match(core, /'poopika':\s+\['extra',\s+"Don't Talk to Poopika"\]/);
  assert.match(read('js/menu-core.js'), /'poopika': 'Poopika ate the question!'/);
  assert.match(read('js/ui/profile-game.js'), /'poopika': '<svg/, 'profile icon');
  assert.match(read('js/game-utils.js'), /poopika: 1\.5/, 'rainbow-star pace zone');

  const s = c => `${stats[c].ok}/${stats[c].total}`;
  console.log(`Poopika passed: eats by level, every wrong choice really wrong, plays pb ${s('pb')} br ${s('br')} bc ${s('bc')}, no avoidable back-to-back answers, warp ${lo.toFixed(2)}–${hi.toFixed(2)}×, rules and wiring.`);
}, 0);
