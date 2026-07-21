
/* ═══════════════════════════════════════════════════════════════════════
   daily-check.js  —  The Booha Adventure  ·  Daily 5-Minute Check-in
   ─────────────────────────────────────────────────────────────────────
   An OPTIONAL homework gate shown on the start scene of index.html.

   Flow (≈3–4 min, all tap, no typing):
     5 vocab (tap-through, audio) → 5 sentences → 5 questions → 5-item quiz
     → stamp + small celebration → fade straight to hub.

   Records to  booha_save.meta.checkIn[<todayKey>]  =
       { st:'done'|'skip', pct:<0-100|null>, curr:'pb'|'br'|'bc', ts:<ms> }
   Flat, dayKey-keyed — the exact shape a future Wix sync will lift as-is.
   Streak is COMPUTED at read time (see BoohaDailyCheck.streak); never stored.

   House rules honoured:
     · Day key from CALENDAR (Tokyo) ONLY — never the browser clock.
     · Writes via load → mutate → save.patch('meta', …)  (patchDeep MERGES;
       we never need to clear, so a flat per-day key is safe with patch).
     · Does NOT dispatch booha:gameEnd — day-record.js would miscount this
       as an adventure game and pollute weekly best-pct. Its own record.
     · textContent for every data string. No innerHTML with card data.
     · One persistent <audio>, src swapped — stays unlocked on iOS after the
       first user gesture (the check-in tap that starts the flow).
   ═══════════════════════════════════════════════════════════════════════ */
window.BoohaDailyCheck = (function () {
  'use strict';

  /* ── Config mirrors deck-core / curriculum-config ────────────────────── */
  const AUDIO_ROOT = 'https://pub-8d5941f302df44b899ce9d9a4606dcb7.r2.dev/audio-2027';
  const AUDIO_FOLDER = { pb: 'pre_boo', br: 'boo_riculum', bc: 'boo_continuum' };
  const MON_CODE = {
    january:'jan', february:'feb', march:'mar', april:'apr', may:'may',
    june:'jun', july:'jul', august:'aug', september:'sep', october:'oct',
    november:'nov', december:'dec'
  };
  const TYPES = ['vocab', 'sentences', 'questions'];
  const PER_STEP = 5;      // items shown per section
  const QUIZ_LEN = 5;      // quiz questions
  const QUIZ_CHOICES = 4;  // options per quiz question

  /* ── Seeded RNG (mulberry32 over a string hash) — same as juku-engine ─── */
  function hashStr(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function rng(seedStr) {
    let a = hashStr(seedStr) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededShuffle(arr, seedStr) {
    const r = rng(seedStr);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ── Save layer ──────────────────────────────────────────────────────── */
  function todayKey() {
    if (!window.CALENDAR || !CALENDAR.getTodayKey) return null;
    return CALENDAR.getTodayKey();
  }
  function _meta() {
    const save = window.BoohaSaveFile.load();
    const meta = save.meta || {};
    meta.checkIn = meta.checkIn || {};
    return meta;
  }
  function recordFor(dayKey) {
    return _meta().checkIn[dayKey] || null;
  }
  function isDoneToday() {
    const k = todayKey();
    const r = k && recordFor(k);
    return !!(r && r.st === 'done');
  }
  function write(st, pct, curr) {
    const k = todayKey();
    if (!k) { console.error('[DailyCheck] CALENDAR missing — not recorded.'); return; }
    const meta = _meta();
    // A skip must never downgrade a day already completed (protects the streak).
    if (st === 'skip' && meta.checkIn[k] && meta.checkIn[k].st === 'done') return;
    meta.checkIn[k] = { st, pct: (typeof pct === 'number' ? pct : null), curr: curr || null, ts: Date.now() };
    window.BoohaSaveFile.patch('meta', meta);
    document.dispatchEvent(new CustomEvent('booha:checkIn', { detail: { day: k, st, pct } }));
  }

  /* Consecutive-day streak up to & including today (computed, never stored). */
  function streak() {
    const meta = _meta();
    const log = meta.checkIn || {};
    let n = 0;
    // Walk backwards from today over calendar days.
    const start = todayKey();
    if (!start) return 0;
    let d = new Date(start + 'T00:00:00Z');
    for (;;) {
      const key = d.toISOString().slice(0, 10);
      if (log[key] && log[key].st === 'done') { n++; d.setUTCDate(d.getUTCDate() - 1); }
      else break;
    }
    return n;
  }

  /* ── Curriculum resolution ───────────────────────────────────────────── */
  // Picker ids → content short codes. index.html stores booha_last_curr as
  // the short code ('pb'|'br'|'bc') the moment a tile is tapped.
  function knownCurr() {
    const c = localStorage.getItem('booha_last_curr');
    return (c === 'pb' || c === 'br' || c === 'bc') ? c : null;
  }

  /* ── Content load ────────────────────────────────────────────────────── */
  function weekInfo() {
    const cw = CALENDAR.getCurrentCurriculumWeek();
    const wk = Math.min(cw.weekNumber || 1, 4);       // week 5 clamps to 4
    return { monthSlug: cw.monthSlug, weekNumber: wk, weekId: cw.weekId };
  }
  function sliceForWeek(cards, wk) {
    const lo = (wk - 1) * 15 + 1, hi = wk * 15;
    return (cards || []).filter(c => c.n >= lo && c.n <= hi);
  }
  function audioUrl(curr, type, mp3, monCode) {
    return `${AUDIO_ROOT}/${monCode}/${AUDIO_FOLDER[curr]}/${type}/${mp3}`;
  }
  async function loadContent(curr) {
    const wi = weekInfo();
    const monCode = MON_CODE[wi.monthSlug] || 'jan';
    const out = {};
    for (const type of TYPES) {
      const url = `content/${curr}/${wi.monthSlug}/${type}.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${type} ${res.status}`);
      const data = await res.json();
      out[type] = sliceForWeek(data.cards, wi.weekNumber);
    }
    return { curr, monCode, week: wi, sets: out };
  }

  /* Build the day's picks: 5 of each type + a 5-item MIXED quiz drawn from
     those same 15 (so students are tested on exactly what they just reviewed).
     Direction is Japanese → English: prompt = hira (PB) / jp (BR·BC), the four
     choices are English. Distractors are drawn from the SAME type's week pool
     — a one-word vocab answer never sits beside full-sentence distractors,
     which would give the answer away by length.
     Seed = todayKey + curr → fresh daily mix, identical on that student's
     devices, different Mon vs Fri. */
  function buildDay(content) {
    const seedBase = todayKey() + '|' + content.curr;
    const promptKey = content.curr === 'pb' ? 'hira' : 'jp';

    // 5 of each type, tagged with their source type for the quiz + audio path.
    const pick = {};
    const pool = [];
    for (const type of TYPES) {
      const chosen = seededShuffle(content.sets[type], seedBase + '|' + type)
        .slice(0, PER_STEP)
        .map(c => ({ ...c, _type: type }));
      pick[type] = chosen;
      pool.push(...chosen);
    }

    // Quiz: 5 mixed items sampled from the 15 the student just saw.
    const quizItems = seededShuffle(pool, seedBase + '|quiz').slice(0, QUIZ_LEN).map(item => {
      const sameType = content.sets[item._type];
      const distractors = seededShuffle(
        sameType.filter(c => c.n !== item.n), seedBase + '|d' + item._type + item.n
      ).slice(0, QUIZ_CHOICES - 1);
      const choices = seededShuffle(
        [item, ...distractors], seedBase + '|c' + item._type + item.n
      ).map(c => ({ n: c.n, label: c.en }));
      return {
        type: item._type,
        prompt: item[promptKey] || item.jp || item.en, // Japanese shown
        mp3: item.mp3,
        answerN: item.n,
        choices                                         // English options
      };
    });

    return { picks: pick, quiz: quizItems, promptKey };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RUNNER (UI)  —  self-contained full-screen overlay.
     Reaches into NOTHING in index.html; talks back only through callbacks:
        run({ onDone(pct), onSkip() })
     index.html decides what those do (fade to hub / play the intro video).
     ═══════════════════════════════════════════════════════════════════════ */

  const CURR_TILES = [
    { id: 'pb', name: 'Pre-Boo',      jp: 'プレブー',            hue: 315 },
    { id: 'br', name: 'Boo-riculum',  jp: 'ブーリキュラム',       hue: 190 },
    { id: 'bc', name: 'Boo-Continuum', jp: 'ブーコンティニュアム', hue: 120 }
  ];
  const SECTION_LABEL = {
    vocab:     { en: 'Words',     jp: 'たんご' },
    sentences: { en: 'Sentences', jp: 'ぶんしょう' },
    questions: { en: 'Questions', jp: 'しつもん' }
  };

  let styleInjected = false;
  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    const css = `
    .dc-root{position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;
      align-items:center;justify-content:center;padding:calc(18px + var(--safe-top,0px)) 18px
      calc(18px + var(--safe-bottom,0px));background:var(--bg,#000)
      url('assets/img/background-1.png') center/cover no-repeat;color:var(--text,#fff);
      font-family:inherit;text-align:center;overflow:hidden;-webkit-tap-highlight-color:transparent;}
    .dc-root *{box-sizing:border-box;}
    .dc-ghost{width:132px;height:132px;object-fit:contain;
      filter:drop-shadow(0 8px 24px rgba(255,59,189,.45));animation:dcFloat 3.4s ease-in-out infinite;}
    @keyframes dcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
    .dc-title{font-weight:800;font-size:1.5rem;margin:14px 0 4px;letter-spacing:.02em;}
    .dc-sub{color:var(--muted,rgba(255,255,255,.7));font-size:.95rem;margin-bottom:18px;}
    .dc-progress{display:flex;gap:6px;margin:0 0 20px;}
    .dc-pip{width:26px;height:5px;border-radius:3px;background:rgba(255,255,255,.22);transition:background .25s;}
    .dc-pip.on{background:var(--pink,#ff3bbd);}
    .dc-pip.done{background:var(--pink2,#ff79d7);}
    .dc-card{width:min(92vw,520px);background:rgba(20,6,24,.72);border:1px solid rgba(255,121,215,.35);
      border-radius:20px;padding:24px 22px;backdrop-filter:blur(8px);}
    .dc-jp{font-size:1.7rem;font-weight:700;line-height:1.4;margin-bottom:10px;word-break:break-word;}
    .dc-en{font-size:1.05rem;color:var(--muted,rgba(255,255,255,.75));line-height:1.4;
      min-height:1.4em;transition:opacity .2s;}
    .dc-en.hidden{opacity:0;}
    .dc-audio{margin-top:16px;width:60px;height:60px;border-radius:50%;border:none;
      background:linear-gradient(135deg,var(--pink,#ff3bbd),var(--pink2,#ff79d7));color:#fff;
      font-size:1.5rem;cursor:pointer;box-shadow:0 6px 18px rgba(255,59,189,.4);
      transition:transform .12s,opacity .2s;}
    .dc-audio:active{transform:scale(.92);}
    .dc-audio.locked{opacity:.45;}
    .dc-btn{margin-top:22px;min-width:180px;padding:15px 26px;border:none;border-radius:16px;
      font-size:1.05rem;font-weight:800;letter-spacing:.03em;cursor:pointer;color:#fff;
      background:linear-gradient(135deg,var(--pink,#ff3bbd),var(--pink2,#ff79d7));
      box-shadow:0 8px 22px rgba(255,59,189,.45);transition:transform .12s;}
    .dc-btn:active{transform:translateY(2px) scale(.98);}
    .dc-btn.ghost{background:transparent;border:1.5px solid rgba(255,255,255,.4);
      box-shadow:none;color:var(--muted,rgba(255,255,255,.8));font-weight:700;}
    .dc-tiles{display:flex;flex-direction:column;gap:12px;width:min(92vw,420px);margin-top:6px;}
    .dc-tile{--h:200deg;display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:18px;
      border:1.5px solid hsla(var(--h),90%,65%,.5);background:hsla(var(--h),80%,30%,.28);
      color:#fff;cursor:pointer;text-align:left;transition:transform .12s,border-color .2s,background .2s;}
    .dc-tile:active{transform:scale(.98);}
    .dc-tile.sel{border-color:hsla(var(--h),95%,72%,1);background:hsla(var(--h),85%,42%,.42);
      box-shadow:0 0 0 3px hsla(var(--h),90%,65%,.35);}
    .dc-tile .tn{font-weight:800;font-size:1.1rem;}
    .dc-tile .tj{font-size:.85rem;color:var(--muted,rgba(255,255,255,.75));}
    .dc-choices{display:flex;flex-direction:column;gap:11px;width:min(92vw,520px);margin-top:18px;}
    .dc-choice{padding:15px 18px;border-radius:15px;border:1.5px solid rgba(255,255,255,.25);
      background:rgba(255,255,255,.06);color:#fff;font-size:1.02rem;line-height:1.35;cursor:pointer;
      text-align:left;transition:transform .1s,background .2s,border-color .2s;}
    .dc-choice:active{transform:scale(.99);}
    .dc-choice.right{border-color:#38e08a;background:rgba(56,224,138,.22);}
    .dc-choice.wrong{border-color:#ff5a7a;background:rgba(255,90,122,.2);}
    .dc-choice.dim{opacity:.4;}
    .dc-count{position:absolute;top:calc(14px + var(--safe-top,0px));right:18px;
      color:var(--muted,rgba(255,255,255,.6));font-size:.85rem;font-weight:700;}
    .dc-close{position:absolute;top:calc(10px + var(--safe-top,0px));left:14px;width:40px;height:40px;
      border:none;border-radius:50%;background:rgba(0,0,0,.35);color:#fff;font-size:1.2rem;cursor:pointer;}
    .dc-result-score{font-size:3.2rem;font-weight:900;line-height:1;margin:6px 0;}
    .dc-streak{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:8px 16px;
      border-radius:999px;background:rgba(255,121,215,.16);border:1px solid rgba(255,121,215,.4);
      font-weight:800;font-size:1rem;}
    .dc-burst{position:absolute;width:9px;height:9px;border-radius:50%;pointer-events:none;
      will-change:transform,opacity;}
    @media (prefers-reduced-motion: reduce){
      .dc-ghost{animation:none;} .dc-burst{display:none;}
    }`;
    const el = document.createElement('style');
    el.id = 'dc-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // Single persistent audio element — stays unlocked on iOS after first gesture.
  let audioEl = null;
  function getAudio() {
    if (!audioEl) { audioEl = new Audio(); audioEl.preload = 'auto'; }
    return audioEl;
  }

  function burst(root, x, y) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#ff3bbd', '#ff79d7', '#ffd36e', '#7ef0ff', '#a6ff7e'];
    for (let i = 0; i < 12; i++) {
      const d = document.createElement('div');
      d.className = 'dc-burst';
      d.style.left = x + 'px'; d.style.top = y + 'px';
      d.style.background = colors[i % colors.length];
      root.appendChild(d);
      const ang = (Math.PI * 2 * i) / 12, dist = 40 + Math.random() * 50;
      d.animate(
        [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
         { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(0)`, opacity: 0 }],
        { duration: 620, easing: 'cubic-bezier(.2,.7,.3,1)' }
      ).onfinish = () => d.remove();
    }
  }

  function run(opts) {
    opts = opts || {};
    const onDone = typeof opts.onDone === 'function' ? opts.onDone : function () {};
    const onSkip = typeof opts.onSkip === 'function' ? opts.onSkip : function () {};
    injectStyles();

    const root = document.createElement('div');
    root.className = 'dc-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    document.body.appendChild(root);

    let closed = false;
    function teardown() {
      if (closed) return; closed = true;
      try { getAudio().pause(); } catch (e) {}
      root.remove();
    }
    function bailToSkip() {              // gentle exit = an explicit skip
      const curr = knownCurr();
      write('skip', null, curr || 'pb');
      teardown(); onSkip();
    }

    function clear() { root.textContent = ''; }
    function addClose(handler) {
      const b = document.createElement('button');
      b.className = 'dc-close'; b.type = 'button';
      b.setAttribute('aria-label', 'とじる'); b.textContent = '×';
      b.addEventListener('click', handler);
      root.appendChild(b);
    }
    function ghost() {
      const g = document.createElement('img');
      g.className = 'dc-ghost'; g.src = 'assets/img/booha_ghost.png'; g.alt = 'Booha';
      return g;
    }

    /* ── Step 0: curriculum pick ─────────────────────────────────────── */
    function stepCurriculum() {
      clear();
      addClose(bailToSkip);
      root.appendChild(ghost());
      const t = document.createElement('div'); t.className = 'dc-title';
      t.textContent = 'デイリーチェック'; root.appendChild(t);
      const s = document.createElement('div'); s.className = 'dc-sub';
      s.textContent = 'どのクラス？ / Which class?'; root.appendChild(s);

      const wrap = document.createElement('div'); wrap.className = 'dc-tiles';
      let selected = knownCurr();
      const tiles = {};
      CURR_TILES.forEach(c => {
        const tile = document.createElement('button');
        tile.className = 'dc-tile' + (selected === c.id ? ' sel' : '');
        tile.type = 'button'; tile.style.setProperty('--h', c.hue + 'deg');
        const nm = document.createElement('div'); nm.className = 'tn'; nm.textContent = c.name;
        const jp = document.createElement('div'); jp.className = 'tj'; jp.textContent = c.jp;
        const col = document.createElement('div'); col.appendChild(nm); col.appendChild(jp);
        tile.appendChild(col);
        tile.addEventListener('click', () => {
          selected = c.id;
          Object.values(tiles).forEach(x => x.classList.remove('sel'));
          tile.classList.add('sel');
          go.disabled = false; go.style.opacity = '1';
        });
        tiles[c.id] = tile; wrap.appendChild(tile);
      });
      root.appendChild(wrap);

      const go = document.createElement('button');
      go.className = 'dc-btn'; go.type = 'button'; go.textContent = 'はじめる';
      if (!selected) { go.disabled = true; go.style.opacity = '.5'; }
      go.addEventListener('click', () => {
        if (!selected) return;
        localStorage.setItem('booha_last_curr', selected);  // one source of truth
        stepLoading(selected);
      });
      root.appendChild(go);
    }

    /* ── Loading ─────────────────────────────────────────────────────── */
    function stepLoading(curr) {
      clear();
      root.appendChild(ghost());
      const t = document.createElement('div'); t.className = 'dc-title';
      t.textContent = 'よみこみ中…'; root.appendChild(t);

      loadContent(curr).then(content => {
        const day = buildDay(content);
        // Preload quiz + card audio quietly (best-effort).
        runSections(content, day);
      }).catch(err => {
        console.error('[DailyCheck] load failed:', err);
        clear();
        root.appendChild(ghost());
        const m = document.createElement('div'); m.className = 'dc-title';
        m.textContent = 'まだ準備中'; root.appendChild(m);
        const s = document.createElement('div'); s.className = 'dc-sub';
        s.textContent = 'コンテンツをよみこめませんでした。'; root.appendChild(s);
        const b = document.createElement('button');
        b.className = 'dc-btn ghost'; b.type = 'button'; b.textContent = 'とじる';
        b.addEventListener('click', bailToSkip);
        root.appendChild(b);
      });
    }

    /* ── Tap-through sections ────────────────────────────────────────── */
    function runSections(content, day) {
      const order = ['vocab', 'sentences', 'questions'];
      let si = 0, ci = 0;

      function showCard() {
        clear();
        addClose(bailToSkip);
        const type = order[si];
        const cards = day.picks[type];
        const card = cards[ci];

        const count = document.createElement('div'); count.className = 'dc-count';
        count.textContent = `${SECTION_LABEL[type].jp} ${ci + 1}/${cards.length}`;
        root.appendChild(count);

        // progress pips: 3 sections
        const prog = document.createElement('div'); prog.className = 'dc-progress';
        order.forEach((_, k) => {
          const p = document.createElement('div');
          p.className = 'dc-pip' + (k < si ? ' done' : k === si ? ' on' : '');
          prog.appendChild(p);
        });
        root.appendChild(prog);

        const box = document.createElement('div'); box.className = 'dc-card';
        const jp = document.createElement('div'); jp.className = 'dc-jp';
        jp.textContent = (content.curr === 'pb' ? card.hira : card.jp) || card.jp || card.en;
        box.appendChild(jp);
        const en = document.createElement('div'); en.className = 'dc-en';
        en.textContent = card.en;
        box.appendChild(en);

        const audioBtn = document.createElement('button');
        audioBtn.className = 'dc-audio'; audioBtn.type = 'button';
        audioBtn.setAttribute('aria-label', 'きく'); audioBtn.textContent = '▶';
        const url = audioUrl(content.curr, type, card.mp3, content.monCode);
        audioBtn.addEventListener('click', () => {
          const a = getAudio();
          try { a.pause(); } catch (e) {}
          a.src = url; a.currentTime = 0;
          a.play().catch(() => {});
        });
        box.appendChild(audioBtn);
        root.appendChild(box);

        const next = document.createElement('button');
        next.className = 'dc-btn'; next.type = 'button';
        const last = (si === order.length - 1) && (ci === cards.length - 1);
        next.textContent = last ? 'クイズへ' : 'つぎ';
        next.addEventListener('click', () => {
          try { getAudio().pause(); } catch (e) {}
          ci++;
          if (ci >= cards.length) { si++; ci = 0; }
          if (si >= order.length) startQuiz(content, day);
          else showCard();
        });
        root.appendChild(next);

        // auto-play the card audio on show (already unlocked by earlier taps)
        const a = getAudio();
        try { a.pause(); a.src = url; a.currentTime = 0; a.play().catch(() => {}); } catch (e) {}
      }
      showCard();
    }

    /* ── Quiz ────────────────────────────────────────────────────────── */
    function startQuiz(content, day) {
      let qi = 0, correct = 0;

      function showQ() {
        clear();
        addClose(bailToSkip);
        const q = day.quiz[qi];

        const count = document.createElement('div'); count.className = 'dc-count';
        count.textContent = `クイズ ${qi + 1}/${day.quiz.length}`;
        root.appendChild(count);

        const box = document.createElement('div'); box.className = 'dc-card';
        const jp = document.createElement('div'); jp.className = 'dc-jp';
        jp.textContent = q.prompt;                    // Japanese prompt
        box.appendChild(jp);
        root.appendChild(box);

        const list = document.createElement('div'); list.className = 'dc-choices';
        let answered = false;
        q.choices.forEach(choice => {
          const b = document.createElement('button');
          b.className = 'dc-choice'; b.type = 'button';
          b.textContent = choice.label;               // English options
          b.addEventListener('click', (ev) => {
            if (answered) return; answered = true;
            const isRight = choice.n === q.answerN;
            if (isRight) {
              correct++;
              b.classList.add('right');
              const r = root.getBoundingClientRect();
              burst(root, ev.clientX - r.left, ev.clientY - r.top);
            } else {
              b.classList.add('wrong');
              Array.from(list.children).forEach(cb => {
                const n = q.choices[Array.from(list.children).indexOf(cb)].n;
                if (n === q.answerN) cb.classList.add('right');
                else if (cb !== b) cb.classList.add('dim');
              });
            }
            setTimeout(() => {
              qi++;
              if (qi >= day.quiz.length) finish();
              else showQ();
            }, isRight ? 620 : 1100);
          });
          list.appendChild(b);
        });
        root.appendChild(list);
      }

      function finish() {
        const pct = Math.round((correct / day.quiz.length) * 100);
        write('done', pct, content.curr);     // stamps the check-in
        const st = streak();

        clear();
        const g = ghost(); root.appendChild(g);
        const t = document.createElement('div'); t.className = 'dc-title';
        t.textContent = 'よくできました！'; root.appendChild(t);
        const sc = document.createElement('div'); sc.className = 'dc-result-score';
        sc.textContent = `${correct}/${day.quiz.length}`; root.appendChild(sc);
        const sub = document.createElement('div'); sub.className = 'dc-sub';
        sub.textContent = `${pct}%  ·  ${content.curr.toUpperCase()}`; root.appendChild(sub);

        const streakEl = document.createElement('div'); streakEl.className = 'dc-streak';
        streakEl.textContent = `🔥 ${st}日`; root.appendChild(streakEl);

        const b = document.createElement('button');
        b.className = 'dc-btn'; b.type = 'button'; b.textContent = 'ぼうけんへ';
        b.style.marginTop = '22px';
        b.addEventListener('click', () => { teardown(); onDone(pct); });
        root.appendChild(b);

        // celebration burst from the ghost
        requestAnimationFrame(() => {
          const r = root.getBoundingClientRect();
          const gr = g.getBoundingClientRect();
          burst(root, gr.left + gr.width / 2 - r.left, gr.top + gr.height / 2 - r.top);
        });
      }

      showQ();
    }

    stepCurriculum();
  }

  /* Parent-facing weekly summary. Week identity (Sun–Sat) comes from CALENDAR;
     we only enumerate the 7 days inside that boundary — no week arithmetic.
     Returns: { days:[{key,st,isToday,isFuture}], doneCount, total:7,
                accuracy:<0-100|null>, streak } */
  function weekSummary() {
    const cw = CALENDAR.getCurrentCurriculumWeek();
    const today = todayKey();
    const meta = _meta();
    const log = meta.checkIn || {};
    // Step 7 days from CALENDAR's weekStart, UTC-safe (mirrors calendar.js).
    const start = new Date(cw.weekStart + 'T00:00:00Z');
    const days = [];
    let doneCount = 0, pctSum = 0, pctN = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const rec = log[key] || null;
      const st = rec ? rec.st : null;
      if (st === 'done') {
        doneCount++;
        if (typeof rec.pct === 'number') { pctSum += rec.pct; pctN++; }
      }
      days.push({ key, st, isToday: key === today, isFuture: today ? key > today : false });
    }
    return {
      days, doneCount, total: 7,
      accuracy: pctN ? Math.round(pctSum / pctN) : null,
      streak: streak()
    };
  }

  /* ── Public surface ──────────────────────────────────────────────────── */
  return {
    // state
    isDoneToday, recordFor, streak, knownCurr, todayKey,
    // records
    markDone: (pct, curr) => write('done', pct, curr),
    markSkip: (curr) => write('skip', null, curr),
    // content
    loadContent, buildDay, weekInfo, audioUrl, weekSummary,
    // runner
    run,
    // constants
    _cfg: { PER_STEP, QUIZ_LEN, QUIZ_CHOICES, TYPES }
  };
})();
