
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
      const items = (Array.isArray(raw) ? raw : raw.sentences || raw.cards || [])
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
  }

  // ── Router ───────────────────────────────────────────────
  // juku-phases.js calls this for every phase task area. Unknown ids get
  // the placeholder the caller provides.

  window.JUKU_TESTS = {
    render(taskEl, res, slot) {
      switch (res.phase.id) {
        case 'order': renderOrder(taskEl, res, slot); return true;
        // Stage 3b: 'vocab', 'mixed'   Stage 4: 'dictation'
        default: return false;
      }
    }
  };

})();
