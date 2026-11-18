#!/usr/bin/env node
'use strict';

// Don't Talk to Poopika (extra game): what goes missing at each level, that
// every wrong choice is really wrong (never a second right question), the
// order of the week, the looking clock, her lines, pose fitting, the game
// rules in the source, and wiring. Runs over every questions.json in content/.
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

  // ── What goes missing ──────────────────────────────────────────────────
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

  // ── Looking, asking, and the poses ─────────────────────────────────────
  assert.strictEqual(L.stare(0, 'pb'), 0); assert.strictEqual(L.stare(60000, 'bc'), 1);
  assert.ok(L.stare(10000, 'pb') < L.stare(10000, 'bc'), 'Pre-Boo gets longer before she turns');
  const R = L.rng(9);
  for (let i = 0; i < 60; i++) assert.ok(L.CUTE_LINES[0].includes(L.cuteLine(0.1, R)), 'cute at first');
  for (let i = 0; i < 60; i++) assert.ok(L.CUTE_LINES[2].includes(L.cuteLine(0.9, R)), 'stranger later');
  for (const line of [].concat(...L.CUTE_LINES)) assert.match(line, /^[A-Za-z?.,' ]+(\s·\s[ぁ-んァ-ヶー、。？！ ]+)?$/, `short, kind lines: ${line}`);
  // A pose drawn small in its frame is scaled up, centred and stood on the same feet.
  const S = 20, a = new Uint8Array(S * S); for (let y = 6; y < 16; y++) for (let x = 8; x < 14; x++) a[y * S + x] = 255;
  const small = L.alphaBox(a, S, S); assert.deepStrictEqual(JSON.parse(JSON.stringify(small)), { x0: 0.4, y0: 0.3, x1: 0.7, y1: 0.8 });
  const ref = { x0: 0.14, y0: 0.016, x1: 0.78, y1: 0.965 };
  const f = L.fitPose(small, ref);
  assert.ok(Math.abs(f.k - (ref.y1 - ref.y0) / 0.5) < 1e-9, 'same height as the reference');
  assert.ok(Math.abs((f.oy + f.dy) - ref.y1 * 100) < 1e-9, 'feet on the same line');
  assert.ok(Math.abs((f.ox + f.dx) - (ref.x0 + ref.x1) * 50) < 1e-9, 'same centre');
  assert.strictEqual(L.alphaBox(new Uint8Array(4), 2, 2), null, 'an empty picture has no box');

  // ── Game rules in the source ───────────────────────────────────────────
  assert.match(SRC, /const SAVE_ID = `\$\{CFG\.curriculum\}-extra:poopika`;/, 'saves under the extra id');
  assert.ok(SRC.indexOf('run.summary()') < SRC.lastIndexOf('U.emitGameEnd('), 'summary before emitGameEnd');
  assert.match(SRC, /run\.pauseClock\(\)/, 'a replay pauses the pace clock');
  assert.match(SRC, /const POP = window\.BoohaPop \|\| new Proxy/, 'plays on without game-pop.js');
  assert.match(SRC, /speak\(c, v, clean \? 0 : 0\.25 \+ 0\.75 \* s, end\)/, 'a fixed question plays clean; strangeness follows looking time');
  assert.match(SRC, /setTimeout\(\(\) => play\(true\), 450\)/, 'a fixed question plays once more, clean');
  assert.match(SRC, /later\(go, 7000\)/, 'never stalls on a slow clip');
  assert.match(SRC, /if \(tries >= 2\) \{ finishCard\('miss'\)/, 'one more try, then the answer');
  assert.match(SRC, /speaking = true; lookStop\(\)/, 'listening is not looking');
  assert.match(SRC, /fetch\(url, \{ mode: 'cors', cache: 'reload' \}\)/, 'a copy saved before CORS is reloaded');
  assert.match(SRC, /if \(!v \|\| !c\) \{   \/\/ no Web Audio: the plain recording still plays/, 'falls back to the plain recording');
  assert.match(SRC, /prefers-reduced-motion:reduce\)\{html\.pk-world body::before,html\.pk-world\.pk-lurch body::before\{animation:none !important;transform:none !important\}\}/, 'reduced motion: no breathing or lurching');
  assert.match(SRC, /if \(!stillMotion\(\)\) staticTimer = setInterval/, 'reduced motion: still static');
  assert.match(SRC, /\.pk-sign\{[^}]*background:#fffaf6;color:var\(--pk-ink\)/, 'the question card stays plain and readable');
  assert.doesNotMatch(SRC, /class="pk-sky"|\.q::before\{content:'\?'\}/, 'no floating question marks');
  assert.doesNotMatch(SRC, /ate the question|ate the word|たべちゃった/i, 'she does not eat words any more');
  assert.match(SRC, /<span>What you see and hear changes around Poopika\. Don't look too long\.<\/span><span>プピカの/, 'the Japanese sits under the English');
  assert.match(SRC, /choicesEl\.classList\.add\('pk-wait'\)/, 'choices wait for the question');
  assert.match(SRC, /run\.audioDone\(\);\n\s+reveal\(\);/, 'and appear once it has been heard');
  assert.match(SRC, /later\(reveal, 9000\)/, 'a stuck clip never hides them for long');
  assert.match(SRC, /\.pk-choices\.glitching\{pointer-events:none\}/, 'no taps while they move');
  assert.match(SRC, /if \(down && down < stableSince\) return;/, 'a press that began before they settled does not count');
  assert.match(SRC, /if \(!n \|\| done \|\| !revealed \|\| !stable\) return;/, 'keys follow the same rule');
  assert.match(SRC, /4300 - 2500 \* s/, 'they jump more often the longer you look');
  assert.ok((SRC.match(/fetch\(/g) || []).length === 2 && /const url = CFG\.audioBase \+ card\.mp3;/.test(SRC), 'the only fetches are the question audio');
  for (const n of [1, 2, 3]) assert.ok(fs.existsSync(path.join(ROOT, `assets/img/wanderers/poopika-${n}.webp`)), `poopika-${n}.webp`);

  // ── Wiring ─────────────────────────────────────────────────────────────
  const reg = read('js/core/game-registry.js');
  assert.match(reg, /id:\s+'poopika',\s+gameKey:\s+'poopika',\s+name:\s+"Don't Talk to Poopika",\s+file:\s+'games\/poopika\.js'/);
  assert.ok(reg.indexOf("id:             'vowel_pop'") < reg.indexOf("id:             'poopika'"), 'listed after Vowel Pop (menu and profile: next to it)');
  const core = read('js/game-core.js');
  assert.match(core, /'poopika':\s+'questions'/);
  assert.match(core, /'poopika':\s+\['extra',\s+"Don't Talk to Poopika"\]/);
  assert.match(read('js/menu-core.js'), /'poopika': "Don't look too long!"/);
  assert.match(read('js/ui/profile-game.js'), /'poopika': '<svg/, 'profile icon');
  assert.match(read('js/game-utils.js'), /poopika: 1\.5/, 'rainbow-star pace zone');

  const s = c => `${stats[c].ok}/${stats[c].total}`;
  console.log(`Poopika passed: missing words by level, every wrong choice really wrong, plays pb ${s('pb')} br ${s('br')} bc ${s('bc')}, no avoidable back-to-back answers, looking clock, lines, pose fitting, rules and wiring.`);
}, 0);
