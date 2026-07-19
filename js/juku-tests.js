
// js/juku-tests.js  (Stage 3)
// English Juku — test task renderers. Load AFTER juku-engine.js,
// BEFORE juku-phases.js.
//
// Sentence Order (ことばの じゅんばん):
//  - items picked + scrambled with the per-student seed (stable on refresh)
//  - NO feedback; answers LOCK on これで OK！ and are written immediately
//  - behavioral capture per item: time to first tap, removals (changes),
//    total time to lock
//  - resume-safe: committed items are skipped on re-render
//  - window closes = uncommitted items are simply unanswered (scored 0
//    in Stage 5); the clock is the invigilator

(function () {
  'use strict';

  const CFG = window.JUKU_CONFIG;
  const J = window.JUKU;

  // ── Content loading ──────────────────────────────────────
  // URL scheme lives in juku-config.js. If it returns null (placeholder),
  // demo mode activates: three built-in sentences and a visible badge,
  // so a misconfigured path can never silently look like real content.

  const DEMO_SENTENCES = [
    { n: 1, en: 'I like apples', jp: 'わたしは りんごが すき' },
    { n: 2, en: 'She plays soccer on Sunday', jp: 'かのじょは にちようびに サッカーを する' },
    { n: 3, en: 'We go to school by bus', jp: 'わたしたちは バスで がっこうに いく' }
  ];

  const _cache = {};

  async function getSentences(curr) {
    if (_cache[curr]) return _cache[curr];
    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    const url = CFG.content && CFG.content.sentencesUrl
      ? CFG.content.sentencesUrl(curr, cw) : null;

    if (!url) {
      console.warn('[juku] sentencesUrl not configured — DEMO MODE');
      _cache[curr] = { demo: true, items: DEMO_SENTENCES };
      return _cache[curr];
    }
    try {
      const res = await fetch(url);
      const raw = await res.json();
      
      const map = (CFG.content && CFG.content.mapSentence) || (x => x);
      const all = Array.isArray(raw) ? raw : (raw.cards || raw.sentences || []);
      const weekCards = (CFG.content && CFG.content.filterWeek)
        ? CFG.content.filterWeek(all, cw) : all;
      const items = weekCards
        .map(map)
        .filter(it => it && it.en && String(it.en).trim().split(/\s+/).length >= 3);
      
      if (!items.length) throw new Error('no usable sentences');
      _cache[curr] = { demo: false, items };
      return _cache[curr];
    } catch (e) {
      console.warn('[juku] sentence load failed — DEMO MODE', e);
      _cache[curr] = { demo: true, items: DEMO_SENTENCES };
      return _cache[curr];
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  function words(en) {
    // strip terminal punctuation; the period would give away the last word
    return String(en).trim().replace(/[.!?]+$/, '').split(/\s+/);
  }

  function scrambled(ws, seedStr) {
    if (ws.length < 2) return ws.slice();
    let s = J.seededShuffle(ws.map((w, i) => ({ w, i })), seedStr);
    // never present the correct order as the starting state
    if (s.every((o, k) => o.i === k)) s = s.slice(1).concat(s[0]);
    return s;
  }

  // ── Sentence Order test ──────────────────────────────────

  async function renderOrder(taskEl, res, slot) {
    taskEl.innerHTML = `<p class="juku-paper">よみこみちゅう…</p>`;

    const pack = await getSentences(slot.curriculum);
    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    const seed = `${J.studentSeedBase()}|${cw.weekId}|order`;
    const count = (CFG.content && CFG.content.counts && CFG.content.counts.order) || 8;
    const picked = J.seededShuffle(pack.items, seed).slice(0, Math.min(count, pack.items.length));

    // section record (created once)
    J.patchWeek(w => {
      if (!w.sections.order) {
        w.sections.order = { total: picked.length, items: [], startedAt: Date.now(), demo: pack.demo };
      }
    });

    const { week } = J.weekRecord();
    const committed = week.sections.order.items.length;
    if (committed >= picked.length) { renderOrderDone(taskEl, pack.demo); return; }

    showItem(taskEl, picked, committed, pack.demo);
  }

  function showItem(taskEl, picked, idx, demo) {
    const item = picked[idx];
    const target = words(item.en);
    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    const bank = scrambled(target, `${J.studentSeedBase()}|${cw.weekId}|order|${item.n}`);

    // behavioral state for this item
    const shownAt = performance.now();
    let firstMs = null;
    let changes = 0;
    let answer = [];   // array of bank indices in placed order

    const bankChips = bank.map((o, k) =>
      `<button class="juku-chip" data-k="${k}">${o.w}</button>`).join('');

    taskEl.innerHTML = `
      ${demo ? '<div class="juku-demo-badge">DEMO</div>' : ''}
      <p class="juku-item-count">もんだい ${idx + 1} / ${picked.length}</p>
      <p class="juku-item-jp">${item.jp || ''}</p>
      <div class="juku-answer" id="jt-answer"></div>
      <div class="juku-bank" id="jt-bank">${bankChips}</div>
      <div class="juku-test-actions">
        <button class="juku-clear" id="jt-clear">やりなおす</button>
        <button class="juku-lock off" id="jt-lock">これで OK！</button>
      </div>`;

    const answerEl = taskEl.querySelector('#jt-answer');
    const bankEl = taskEl.querySelector('#jt-bank');
    const lockBtn = taskEl.querySelector('#jt-lock');
    const clearBtn = taskEl.querySelector('#jt-clear');

    function repaintAnswer() {
      answerEl.innerHTML = answer.map((k, pos) =>
        `<button class="juku-chip placed" data-pos="${pos}">${bank[k].w}</button>`).join('')
        || `<span class="juku-answer-hint">ことばを タップして ならべよう</span>`;
      answerEl.querySelectorAll('.juku-chip').forEach(ch => {
        ch.addEventListener('click', () => {
          const pos = +ch.dataset.pos;
          const k = answer.splice(pos, 1)[0];
          changes++;                                  // a removal = a change
          bankEl.querySelector(`[data-k="${k}"]`).classList.remove('used');
          repaintAnswer(); syncLock();
        });
      });
    }

    function syncLock() {
      lockBtn.classList.toggle('off', answer.length !== bank.length);
    }

    bankEl.querySelectorAll('.juku-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        if (ch.classList.contains('used')) return;
        if (firstMs === null) firstMs = Math.round(performance.now() - shownAt);
        ch.classList.add('used');
        answer.push(+ch.dataset.k);
        repaintAnswer(); syncLock();
      });
    });

    clearBtn.addEventListener('click', () => {
      if (!answer.length) return;
      changes += answer.length;
      answer = [];
      bankEl.querySelectorAll('.juku-chip').forEach(c => c.classList.remove('used'));
      repaintAnswer(); syncLock();
    });

    lockBtn.addEventListener('click', () => {
      if (answer.length !== bank.length) return;
      const seq = answer.map(k => bank[k].w);
      const ok = seq.length === target.length && seq.every((w, i) => w === target[i]);
      // LOCK: write immediately, no feedback, move on
      J.patchWeek(w => {
        w.sections.order.items.push({
          n: item.n, ans: seq.join(' '), ok,
          firstMs: firstMs === null ? null : firstMs,
          ms: Math.round(performance.now() - shownAt),
          chg: changes,
          at: Date.now()
        });
      });
      const next = idx + 1;
      if (next >= picked.length) renderOrderDone(taskEl, demo);
      else showItem(taskEl, picked, next, demo);
    });

    repaintAnswer(); syncLock();
  }

  function renderOrderDone(taskEl, demo) {
    taskEl.innerHTML = `
      ${demo ? '<div class="juku-demo-badge">DEMO</div>' : ''}
      <div class="juku-done">
        <p class="juku-done-jp">✓ ぜんぶ おわった！</p>
        <p class="en">All locked in.</p>
        <p class="juku-sub2">つぎの じかんまで まっててね。</p>
      </div>`;
    if (window.JUKU_GHOSTS) window.JUKU_GHOSTS.mount(taskEl, { name: false });
  }

 // ═══ Stage 3b — Vocab & Meaning, Mixed Weekly Check ══════

  const DEMO_VOCAB = [
    { n: 1, en: 'apple',  jp: 'りんご',   hira: 'りんご',   mp3: null },
    { n: 2, en: 'dog',    jp: 'いぬ',     hira: 'いぬ',     mp3: null },
    { n: 3, en: 'school', jp: 'がっこう', hira: 'がっこう', mp3: null },
    { n: 4, en: 'river',  jp: 'かわ',     hira: 'かわ',     mp3: null },
    { n: 5, en: 'happy',  jp: 'うれしい', hira: 'うれしい', mp3: null },
    { n: 6, en: 'run',    jp: 'はしる',   hira: 'はしる',   mp3: null }
  ];

  const DEMO_JUKU = {
    week: 1,
    passage: {
      text: 'Booha sees a dog near the river. The dog is happy. They run to school together.',
      comprehension: [
        { n: 1, q: 'Where is the dog?',
          choices: ['near the river', 'at school', 'in a tree'], correct: 0 }
      ]
    },
    definitions: [],
    questions: [
      { n: 1, type: 'read', text: 'The dog runs to the river.',
        q: 'Where does the dog run?',
        choices: ['to the river', 'to school', 'to a tree'], correct: 0 },
      { n: 2, type: 'translate', jp: 'いぬは うれしいです。',
        en: 'The dog is happy', extra: ['sad'] },
      { n: 3, type: 'write', jp: 'いぬ', en: 'dog' }
    ]
  };

  // ── Loaders (parallel to getSentences; that one stays frozen) ──

  async function getCards(curr, file, demoItems) {
    const key = `${curr}|${file}`;
    if (_cache[key]) return _cache[key];
    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    try {
      const url = CFG.content.contentUrl(curr, cw, file);
      const res = await fetch(url);
      const raw = await res.json();
      const all = Array.isArray(raw) ? raw : (raw.cards || []);
      const items = (CFG.content.filterWeek
        ? CFG.content.filterWeek(all, cw) : all).filter(Boolean);
      if (!items.length) throw new Error('no cards in ' + file);
      _cache[key] = { demo: false, items };
    } catch (e) {
      console.warn('[juku] ' + file + ' load failed — DEMO MODE', e);
      _cache[key] = { demo: true, items: demoItems };
    }
    return _cache[key];
  }

  async function getJukuWeek(curr) {
    const key = `${curr}|juku`;
    if (_cache[key]) return _cache[key];
    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    const wNum = CFG.content.contentWeek(cw);
    try {
      const res = await fetch(CFG.content.contentUrl(curr, cw, 'juku.json'));
      const raw = await res.json();
      const wk = (raw.weeks || []).find(x => x && x.week === wNum);
      if (!wk) throw new Error('week ' + wNum + ' missing from juku.json');
      _cache[key] = { demo: false, week: wk };
    } catch (e) {
      console.warn('[juku] juku.json load failed — DEMO MODE', e);
      _cache[key] = { demo: true, week: DEMO_JUKU };
    }
    return _cache[key];
  }

  function cardAudio(curr, type, card) {
    if (!card || !card.mp3 || !CFG.content.audioBase) return null;
    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    return CFG.content.audioBase(curr, cw, type) + card.mp3;
  }

  function hiraOf(c) { return c.hira || c.jp || c.en; }

  // ── Choice builders (all seeded — refresh rebuilds identically) ──

  function meanChoices(card, pool, salt) {
    const others = J.seededShuffle(
      pool.filter(c => c.n !== card.n && hiraOf(c) !== hiraOf(card)), salt).slice(0, 3);
    return J.seededShuffle(
      others.map(c => ({ label: hiraOf(c), ok: false }))
        .concat([{ label: hiraOf(card), ok: true }]), salt + '|o');
  }

  function defChoices(card, pool, defs, salt) {
    const posOf = n => { const d = defs.find(x => x.n === n); return d && d.pos; };
    const pos = posOf(card.n);
    const same = pool.filter(c => c.n !== card.n && c.en !== card.en && posOf(c.n) === pos);
    const rest = pool.filter(c => c.n !== card.n && c.en !== card.en && posOf(c.n) !== pos);
    const dis = J.seededShuffle(same, salt).slice(0, 3);
    if (dis.length < 3) dis.push(...J.seededShuffle(rest, salt + '|r').slice(0, 3 - dis.length));
    return J.seededShuffle(
      dis.map(c => ({ label: c.en, ok: false }))
        .concat([{ label: card.en, ok: true }]), salt + '|o');
  }

  // ── Generic multiple-choice item ─────────────────────────
  // Select-then-lock: changing the selection before これで OK！ is what
  // keeps chg (and switched-from-correct) meaningful on MC items.

  function showChoiceItem(taskEl, opts, onLock) {
    const shownAt = performance.now();
    let firstMs = null, changes = 0, sel = -1, audio = null;

    taskEl.innerHTML = `
      ${opts.demo ? '<div class="juku-demo-badge">DEMO</div>' : ''}
      <p class="juku-item-count">もんだい ${opts.idx + 1} / ${opts.count}</p>
      ${opts.promptHtml}
      ${opts.audioUrl ? '<button class="juku-play" id="jt-play">🔊 きく</button>' : ''}
      <div class="juku-choices" id="jt-choices"></div>
      <div class="juku-test-actions">
        <button class="juku-lock off" id="jt-lock">これで OK！</button>
      </div>`;

    const box = taskEl.querySelector('#jt-choices');
    const lockBtn = taskEl.querySelector('#jt-lock');
    opts.choices.forEach((c, k) => {
      const b = document.createElement('button');
      b.className = 'juku-choice';
      b.textContent = c.label;
      b.addEventListener('click', () => {
        if (firstMs === null) firstMs = Math.round(performance.now() - shownAt);
        if (sel !== -1 && sel !== k) changes++;
        sel = k;
        box.querySelectorAll('.juku-choice').forEach((x, i) =>
          x.classList.toggle('picked', i === sel));
        lockBtn.classList.remove('off');
      });
      box.appendChild(b);
    });

    if (opts.audioUrl) {
      audio = new Audio(opts.audioUrl);
      audio.preload = 'auto';
      taskEl.querySelector('#jt-play').addEventListener('click', () => {
        audio.currentTime = 0; audio.play().catch(() => {});
      });
    }

    lockBtn.addEventListener('click', () => {
      if (sel === -1) return;
      onLock({
        ans: opts.choices[sel].label,
        ok: !!opts.choices[sel].ok,
        firstMs,
        ms: Math.round(performance.now() - shownAt),
        chg: changes
      });
    });
  }

  // ── Generic construction item (words or letters) ─────────
  // Lock enables at TARGET length (bank may hold distractors).

 function showBuildItem(taskEl, opts, onLock) {
    const shownAt = performance.now();
    let firstMs = null, changes = 0, answer = [];
    let plays = 0, playing = false, committed = false, audio = null;
    const bank = opts.bank;
    const chipCls = opts.letter ? 'juku-chip letter' : 'juku-chip';

    const bankChips = bank.map((u, k) =>
      `<button class="${chipCls}" data-k="${k}">${u}</button>`).join('');

    taskEl.innerHTML = `
      ${opts.demo ? '<div class="juku-demo-badge">DEMO</div>' : ''}
      <p class="juku-item-count">もんだい ${opts.idx + 1} / ${opts.count}</p>
      ${opts.promptHtml}
      ${opts.audioUrl ? '<button class="juku-play" id="jt-play">🔊 きく</button>' : ''}
      <div class="juku-answer" id="jt-answer"></div>
      
      <div class="juku-bank" id="jt-bank">${bankChips}</div>
      <div class="juku-test-actions">
        <button class="juku-clear" id="jt-clear">やりなおす</button>
        <button class="juku-lock off" id="jt-lock">これで OK！</button>
      </div>`;

    const answerEl = taskEl.querySelector('#jt-answer');
    const bankEl = taskEl.querySelector('#jt-bank');
    const lockBtn = taskEl.querySelector('#jt-lock');

    function repaintAnswer() {
      answerEl.innerHTML = answer.map((k, pos) =>
        `<button class="${chipCls} placed" data-pos="${pos}">${bank[k]}</button>`).join('')
        || `<span class="juku-answer-hint">${opts.letter
             ? 'もじを タップして つくろう' : 'ことばを タップして ならべよう'}</span>`;
      answerEl.querySelectorAll('.juku-chip').forEach(ch => {
        ch.addEventListener('click', () => {
          const pos = +ch.dataset.pos;
          const k = answer.splice(pos, 1)[0];
          changes++;
          bankEl.querySelector(`[data-k="${k}"]`).classList.remove('used');
          repaintAnswer(); syncLock();
        });
      });
    }

    function syncLock() {
      lockBtn.classList.toggle('off', answer.length !== opts.target.length);
    }

    bankEl.querySelectorAll('.juku-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        if (ch.classList.contains('used')) return;
        if (answer.length >= opts.target.length) return;
        if (firstMs === null) firstMs = Math.round(performance.now() - shownAt);
        ch.classList.add('used');
        answer.push(+ch.dataset.k);
        repaintAnswer(); syncLock();
      });
    });

  taskEl.querySelector('#jt-clear').addEventListener('click', () => {
      if (!answer.length) return;
      changes += answer.length;
      answer = [];
      bankEl.querySelectorAll('.juku-chip').forEach(c => c.classList.remove('used'));
      repaintAnswer(); syncLock();
    });

    // Serialized playback: a tap while the clip is playing is ignored —
    // replays never overlap or cut each other off. plays counts real starts.
    function playAudio() {
      if (!audio || playing) return;
      playing = true;
      audio.currentTime = 0;
      audio.play().then(() => { plays++; }).catch(() => { playing = false; });
    }

    if (opts.audioUrl) {
      audio = new Audio(opts.audioUrl);
      audio.preload = 'auto';
      audio.addEventListener('ended', () => { playing = false; });
      taskEl.querySelector('#jt-play').addEventListener('click', playAudio);
      // Autoplay may be blocked before any gesture; the button is the
      // guaranteed path.
      if (opts.autoplay) playAudio();
    }

    // commit(force): force=false is これで OK！ (complete answers only);
    // force=true is the broadcast clock (commits whatever is placed).
    // committed guard: a clock force-commit and a lock tap in the same
    // segment can never write twice.
    function commit(force) {
      if (committed) return;
      if (!force && answer.length !== opts.target.length) return;
      committed = true;
      const seq = answer.map(k => bank[k]);
      const ok = seq.length === opts.target.length &&
                 seq.every((u, i) => u === opts.target[i]);
      onLock({
        ans: seq.join(opts.letter ? '' : ' '),
        ok,
        firstMs,
        ms: Math.round(performance.now() - shownAt),
        chg: changes,
        plays,
        forced: !!force
      });
    }

    lockBtn.addEventListener('click', () => { commit(false); });

    repaintAnswer(); syncLock();
    return { commit };
  }

  
 function renderTestDone(taskEl, demo) {
    taskEl.innerHTML = `
      ${demo ? '<div class="juku-demo-badge">DEMO</div>' : ''}
      <div class="juku-done">
        <p class="juku-done-jp">✓ ぜんぶ おわった！</p>
        <p class="en">All locked in.</p>
        <p class="juku-sub2">つぎの じかんまで まっててね。</p>
      </div>`;
    if (window.JUKU_GHOSTS) window.JUKU_GHOSTS.mount(taskEl, { name: false });
  }

  // ── Vocab & Meaning Test ─────────────────────────────────
  // All 15 weekly words. First vocabMean (seeded order) are word→meaning
  // (audio + word shown → hira choices). The rest flip to definition→word
  // where a juku.json definition exists — POS-matched distractors.
  // No audio on definition items: the audio IS the answer.

  async function renderVocab(taskEl, res, slot) {
    taskEl.innerHTML = `<p class="juku-paper">よみこみちゅう…</p>`;
    const curr = slot.curriculum;
    const vocab = await getCards(curr, 'vocab.json', DEMO_VOCAB);
    const juku = await getJukuWeek(curr);
    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    const seed = `${J.studentSeedBase()}|${cw.weekId}|vocab`;
    const defs = juku.demo ? [] : (juku.week.definitions || []);
    const meanCount = (CFG.content.counts && CFG.content.counts.vocabMean) || 8;
    const demo = vocab.demo;

    const ordered = J.seededShuffle(vocab.items.slice(), seed);
    const items = ordered.map((card, i) => ({
      card,
      kind: (i >= meanCount && defs.some(d => d.n === card.n)) ? 'def' : 'mean'
    }));

    J.patchWeek(w => {
      if (!w.sections.vocab) {
        w.sections.vocab = { total: items.length, items: [], startedAt: Date.now(), demo };
      }
    });

    const { week } = J.weekRecord();
    const done = week.sections.vocab.items.length;
    if (done >= items.length) { renderTestDone(taskEl, demo); return; }
    showVocabItem(taskEl, items, done, demo, slot, vocab.items, defs, seed);
  }

  function showVocabItem(taskEl, items, idx, demo, slot, pool, defs, seed) {
    const { kind, card } = items[idx];
    const salt = `${seed}|${card.n}`;
    let choices, prompt, audioUrl = null;

    if (kind === 'def') {
      choices = defChoices(card, pool, defs, salt);
      const def = defs.find(d => d.n === card.n);
      prompt = `<p class="juku-item-def">${def.def}</p>
                <p class="juku-item-q">どの ことば かな？</p>`;
    } else {
      choices = meanChoices(card, pool, salt);
      prompt = `<p class="juku-item-word">${card.en}</p>`;
      audioUrl = cardAudio(slot.curriculum, 'vocab', card);
    }

    showChoiceItem(taskEl,
      { count: items.length, idx, demo, promptHtml: prompt, audioUrl, choices },
      r => {
        J.patchWeek(w => {
          w.sections.vocab.items.push(
            Object.assign({ n: card.n, kind, at: Date.now() }, r));
        });
        const next = idx + 1;
        if (next >= items.length) renderTestDone(taskEl, demo);
        else showVocabItem(taskEl, items, next, demo, slot, pool, defs, seed);
      });
  }

  // ── Mixed Weekly Check ───────────────────────────────────
  // Three parts, one flow: (A) passage reading + its comprehension
  // questions (no audio — reading is the point), (B) seeded sample of
  // read/translate/write from the juku.json bank, (C) prove-it items
  // re-asked from what this student missed or wobbled on earlier today.
  // Order/vocab sections are frozen by now, so prove-it selection is
  // refresh-stable.

  async function buildMixedItems(slot) {
    const curr = slot.curriculum;
    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    const base = `${J.studentSeedBase()}|${cw.weekId}|mixed`;
    const C = CFG.content.counts || {};
    const [sent, vocab, juku] = await Promise.all([
      getSentences(curr),
      getCards(curr, 'vocab.json', DEMO_VOCAB),
      getJukuWeek(curr)
    ]);
    const wk = juku.week;
    const items = [];

    // A — reading comprehension
    ((wk.passage && wk.passage.comprehension) || []).forEach(q => {
      items.push({ kind: 'comp', demo: juku.demo, q, passage: wk.passage.text });
    });

    // B — seeded sample from the authored bank
    const bank = wk.questions || [];
    const take = (type, count) => {
      J.seededShuffle(bank.filter(q => q.type === type), `${base}|${type}`)
        .slice(0, count)
        .forEach(q => items.push({ kind: type, demo: juku.demo, q }));
    };
    take('read', C.mixedRead || 2);
    take('translate', C.mixedTranslate || 2);
    take('write', C.mixedWrite || 2);

    // C — prove-it: wrong answers first, then changed-but-right
    const { week } = J.weekRecord();
    const cand = [];
    ['order', 'vocab'].forEach(sec => {
      const s = week.sections[sec];
      ((s && s.items) || []).forEach(it => {
        if (!it.ok) cand.push({ sec, it, rank: 0 });
        else if (it.chg >= 1) cand.push({ sec, it, rank: 1 });
      });
    });
    const picked = J.seededShuffle(cand.filter(c => c.rank === 0), `${base}|p0`)
      .concat(J.seededShuffle(cand.filter(c => c.rank === 1), `${base}|p1`))
      .slice(0, C.proveIt || 2);

    picked.forEach(c => {
      if (c.sec === 'order') {
        const card = sent.items.find(x => x.n === c.it.n);
        if (card) items.push({ kind: 'proveOrder', demo: sent.demo, card });
      } else {
        const card = vocab.items.find(x => x.n === c.it.n);
        if (!card) return;
        const def = (wk.definitions || []).find(x => x.n === c.it.n);
        if (c.it.kind === 'def' && def) {
          items.push({ kind: 'proveDef', demo: vocab.demo || juku.demo,
                       card, def, pool: vocab.items, defs: wk.definitions });
        } else {
          items.push({ kind: 'proveMean', demo: vocab.demo, card, pool: vocab.items });
        }
      }
    });

    return items;
  }

  async function renderMixed(taskEl, res, slot) {
    taskEl.innerHTML = `<p class="juku-paper">よみこみちゅう…</p>`;
    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    const base = `${J.studentSeedBase()}|${cw.weekId}|mixed`;
    
  const items = await buildMixedItems(slot);
    // Prove-it is remediation, not assessment: it lives outside the
    // section score. total = scored items only; proveTotal frozen here
    // (report time can't know how many unanswered tail items were
    // prove-it). demo describes only the scored questions — a demo
    // prove-it item must not contaminate a real section.
    const scored = items.filter(it => !String(it.kind).startsWith('prove'));
    const demo = scored.some(it => it.demo);

    J.patchWeek(w => {
      if (!w.sections.mixed) {
        w.sections.mixed = { total: scored.length, proveTotal: items.length - scored.length,
                             items: [], startedAt: Date.now(), demo };
      }
    });

    const { week } = J.weekRecord();
    const done = week.sections.mixed.items.length;   // all committed, incl. prove-it
    if (done >= items.length) { renderTestDone(taskEl, demo); return; }
    showMixedItem(taskEl, items, done, slot, base);
    
  }

  function showMixedItem(taskEl, items, idx, slot, base) {
    const item = items[idx];
    const common = { count: items.length, idx, demo: !!item.demo };
    const save = (kind, n, extra, r) => {
      J.patchWeek(w => {
        w.sections.mixed.items.push(
          Object.assign({ kind, n, at: Date.now() }, extra, r));
      });
      const next = idx + 1;
      if (next >= items.length) renderTestDone(taskEl, !!item.demo);
      else showMixedItem(taskEl, items, next, slot, base);
    };

    if (item.kind === 'comp' || item.kind === 'read') {
      const q = item.q;
      const choices = J.seededShuffle(
        q.choices.map((c, i) => ({ label: c, ok: i === q.correct })),
        `${base}|${item.kind}|${q.n}`);
      const prompt = (item.kind === 'comp'
        ? `<div class="juku-passage">${item.passage}</div>`
        : `<p class="juku-read-text">${q.text}</p>`)
        + `<p class="juku-item-q">${q.q}</p>`;
      showChoiceItem(taskEl,
        Object.assign({ promptHtml: prompt, audioUrl: null, choices }, common),
        r => save(item.kind, q.n, {}, r));

    } else if (item.kind === 'translate') {
      const q = item.q;
      const target = words(q.en);
      const bank = J.seededShuffle(target.concat(q.extra || []), `${base}|tr|${q.n}`);
      showBuildItem(taskEl, Object.assign({
        promptHtml: `<p class="juku-item-jp">${q.jp}</p>`,
        target, bank, letter: false
      }, common), r => save('translate', q.n, {}, r));

    } else if (item.kind === 'write') {
      const q = item.q;
      const target = String(q.en).toLowerCase().split('');
      const decoys = J.seededShuffle(
        'abcdefghijklmnopqrstuvwxyz'.split('').filter(l => !target.includes(l)),
        `${base}|wr|${q.n}`).slice(0, 3);
      const bank = J.seededShuffle(target.concat(decoys), `${base}|wr|${q.n}|b`);
      showBuildItem(taskEl, Object.assign({
        promptHtml: `<p class="juku-item-word">${q.jp}</p>`,
        target, bank, letter: true
      }, common), r => save('write', q.n, {}, r));

    } else if (item.kind === 'proveOrder') {
      const card = item.card;
      const target = words(card.en);
      let bank = J.seededShuffle(target.slice(), `${base}|po|${card.n}`);
      if (bank.length > 1 && bank.every((u, i) => u === target[i])) {
        bank = bank.slice(1).concat(bank[0]);
      }
      showBuildItem(taskEl, Object.assign({
        promptHtml: `<p class="juku-item-jp">${card.jp || ''}</p>`,
        target, bank, letter: false
      }, common), r => save('order', card.n, { proveIt: true }, r));

    } else if (item.kind === 'proveMean' || item.kind === 'proveDef') {
      const card = item.card;
      const salt = `${base}|pv|${card.n}`;   // fresh choice order — no position memory
      let choices, prompt, audioUrl = null;
      if (item.kind === 'proveDef') {
        choices = defChoices(card, item.pool, item.defs, salt);
        prompt = `<p class="juku-item-def">${item.def.def}</p>
                  <p class="juku-item-q">どの ことば かな？</p>`;
      } else {
        choices = meanChoices(card, item.pool, salt);
        prompt = `<p class="juku-item-word">${card.en}</p>`;
        audioUrl = cardAudio(slot.curriculum, 'vocab', card);
      }
      showChoiceItem(taskEl,
        Object.assign({ promptHtml: prompt, audioUrl, choices }, common),

                     
       r => save(item.kind === 'proveDef' ? 'def' : 'mean',
                  card.n, { proveIt: true }, r));
    }
  }

  // ═══ Stage 4 — Listening Dictation (broadcast) ═══════════
  // The wall clock is the invigilator. Every device derives the current
  // segment from phaseElapsedSec against a schedule built from config +
  // the week's actual cards — same data, same weekId seed, same table on
  // every device. JUKU_TESTS.tick drives all rendering after load; the
  // render call only prepares state. A refresh lands on whatever segment
  // the clock says is current. Section completeness is decided by the
  // phase ending — NEVER by items.length (missed segments stay unwritten
  // and score as zeros in Stage 5).

  let _dict = null;   // { schedule, sentAll, demo, seed, slotRef, taskEl, seg, ctrl }

  function dictUsable(pack) {
    // A dictation item without audio is broken — filter, except in demo
    // mode where the text itself stands in for the missing clip.
    return pack.demo ? pack.items.slice() : pack.items.filter(c => c && c.mp3);
  }

  async function buildDictSchedule(slot) {
    const D = CFG.content.dictation;
    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    const seed = `${cw.weekId}|dict`;

    const [vocab, sent] = await Promise.all([
      getCards(slot.curriculum, 'vocab.json', DEMO_VOCAB),
      getSentences(slot.curriculum)
    ]);
    const wordsAll = dictUsable(vocab);
    const sentAll = dictUsable(sent);

    const wordPick = J.seededShuffle(wordsAll, seed + '|w')
      .slice(0, Math.min(D.words, wordsAll.length));
    const sentPick = J.seededShuffle(sentAll, seed + '|s')
      .slice(0, Math.min(D.sentences, sentAll.length));

    const schedule = [];
    let t = 0;
    wordPick.forEach(card => {
      schedule.push({ tier: 'word', card, start: t, dur: D.wordSec });
      t += D.wordSec;
    });
    schedule.push({ tier: 'trans', start: t, dur: D.transitionSec });
    t += D.transitionSec;
    sentPick.forEach(card => {
      schedule.push({ tier: 'sent', card, start: t, dur: D.sentenceSec });
      t += D.sentenceSec;
    });

    return { schedule, sentAll, seed,
             demo: vocab.demo || sent.demo,
             itemTotal: wordPick.length + sentPick.length };
  }

  function dictSegAt(schedule, elapsedSec) {
    for (let i = 0; i < schedule.length; i++) {
      if (elapsedSec < schedule[i].start + schedule[i].dur) return i;
    }
    return schedule.length;   // past the last window → done screen
  }

  async function renderDictation(taskEl, res, slot) {
    taskEl.innerHTML = `<p class="juku-paper">よみこみちゅう…</p>`;
    _dict = null;
    const built = await buildDictSchedule(slot);

    J.patchWeek(w => {
      if (!w.sections.dictation) {
        w.sections.dictation = { total: built.itemTotal, items: [],
                                 startedAt: Date.now(), demo: built.demo };
      }
    });

    _dict = { schedule: built.schedule, sentAll: built.sentAll,
              demo: built.demo, seed: built.seed,
              slotRef: slot, taskEl, seg: -1, ctrl: null };
    // First paint happens on the next engine tick (≤1s). The clock, not
    // this call, decides which segment is current — load and refresh are
    // the same path.
  }

  function dictRenderLocked(taskEl, demo) {
    taskEl.innerHTML = `
      ${demo ? '<div class="juku-demo-badge">DEMO</div>' : ''}
      <div class="juku-done">
        <p class="juku-done-jp">✓ ロック OK！</p>
        <p class="en">Locked in.</p>
        <p class="juku-sub2">とけいが すすむまで まっててね。</p>
      </div>`;
  }

  function dictRenderSeg(segIdx) {
    const d = _dict;
    if (window.JUKU_GHOSTS) window.JUKU_GHOSTS.unmount();
    d.seg = segIdx;
    d.ctrl = null;
    const taskEl = d.taskEl;

    if (segIdx >= d.schedule.length) { renderTestDone(taskEl, d.demo); return; }
    const seg = d.schedule[segIdx];

    if (seg.tier === 'trans') {
      taskEl.innerHTML = `
        ${d.demo ? '<div class="juku-demo-badge">DEMO</div>' : ''}
        <div class="juku-done">
          <p class="juku-done-jp">つぎは ぶんしょう！</p>
          <p class="en">Sentences next.</p>
        </div>`;
      return;
    }

    const { week } = J.weekRecord();
    if (week.sections.dictation.items.some(it => it.seg === segIdx)) {
      dictRenderLocked(taskEl, d.demo);   // early lock → wait for the clock
      return;
    }

    const card = seg.card;
    const curr = d.slotRef.curriculum;
    const tierSegs = d.schedule.filter(s => s.tier === seg.tier);
    const ord = tierSegs.indexOf(seg);
    const audioUrl = cardAudio(curr, seg.tier === 'word' ? 'vocab' : 'sentences', card);
    let target, bankArr;

    if (seg.tier === 'word') {
      target = String(card.en).toLowerCase().split('');
      const decoys = J.seededShuffle(
        'abcdefghijklmnopqrstuvwxyz'.split('').filter(l => !target.includes(l)),
        `${d.seed}|wd|${card.n}`).slice(0, 3);
      bankArr = J.seededShuffle(target.concat(decoys), `${d.seed}|wd|${card.n}|b`);
    } else {
      target = words(card.en);
      const nDis = (CFG.content.dictation.distractors || {})[curr] || 0;
      const poolWords = [];
      d.sentAll.forEach(c => {
        if (c.n === card.n) return;
        words(c.en).forEach(w => {
          if (!target.includes(w) && !poolWords.includes(w)) poolWords.push(w);
        });
      });
      const dis = J.seededShuffle(poolWords, `${d.seed}|sd|${card.n}`).slice(0, nDis);
      bankArr = J.seededShuffle(target.concat(dis), `${d.seed}|sd|${card.n}|b`);
    }

    // Audio-only prompt — no Japanese, no English. Demo mode (no clip)
    // shows the text so the flow stays testable.
    const prompt = `
      <p class="juku-dict-ear">🎧</p>
      ${audioUrl ? '' : `<p class="juku-item-word">${card.en}</p>`}
      <p class="juku-answer-hint">${seg.tier === 'word'
        ? 'きいて、もじで つくろう' : 'きいて、ことばで ならべよう'}</p>
      <p class="juku-dict-remain" id="jd-remain"></p>`;

    d.ctrl = showBuildItem(taskEl, {
      count: tierSegs.length, idx: ord, demo: d.demo,
      promptHtml: prompt, audioUrl, autoplay: true,
      target, bank: bankArr, letter: seg.tier === 'word'
    }, r => {
      J.patchWeek(w => {
        if (w.sections.dictation.items.some(it => it.seg === segIdx)) return;
        w.sections.dictation.items.push(Object.assign(
          { seg: segIdx, tier: seg.tier, n: card.n, at: Date.now() }, r));
      });
      d.ctrl = null;
      dictRenderLocked(taskEl, d.demo);
    });
  }

  function dictTick(res) {
    if (!_dict) return;
    const segIdx = dictSegAt(_dict.schedule, res.phaseElapsedSec);
    if (segIdx !== _dict.seg) {
      // Window closed: force-commit whatever is placed (empty counts),
      // then render what the clock says is current.
      if (_dict.ctrl) { _dict.ctrl.commit(true); _dict.ctrl = null; }
      dictRenderSeg(segIdx);
    }
    const r = document.getElementById('jd-remain');
    if (r && segIdx < _dict.schedule.length) {
      const s = _dict.schedule[segIdx];
      const left = Math.max(0, Math.ceil(s.start + s.dur - res.phaseElapsedSec));
      r.textContent = `のこり ${left} びょう`;
    }
  }

  // ── Router ───────────────────────────────────────────────
  // juku-phases.js calls this for every phase task area. Unknown ids get
  // the placeholder the caller provides.

  window.JUKU_TESTS = {
    render(taskEl, res, slot) {
      switch (res.phase.id) {
        case 'dictation': renderDictation(taskEl, res, slot); return true;
        case 'order': renderOrder(taskEl, res, slot); return true;
        case 'vocab': renderVocab(taskEl, res, slot); return true;
        case 'mixed': renderMixed(taskEl, res, slot); return true;
        default: return false;
      }
    },
    // Driven every second by juku-phases.js. Broadcast phases live here;
    // leaving the phase clears state.
    tick(res, slot) {
      if (res.state === 'phase' && res.phase.id === 'dictation') dictTick(res);
      else if (_dict) _dict = null;
    }
  };

})();
