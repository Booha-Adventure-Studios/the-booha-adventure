/*
 * Grimmerglen typing engine — foundation pass 5.
 *
 * The novel piece of Grimmerglen: no other area on this site has a real
 * text <input> anywhere (confirmed by grepping every .js file for
 * <input>/<textarea>/contenteditable/paste handling during the original
 * audit — everything else is tap-to-choose). This module is the reusable
 * core every later memory exercise (and pass 6's tutorial) will call into:
 * an answer box, no-paste handling, lenient grading, and correct/wrong
 * feedback. It renders into a container the CALLER provides and owns —
 * this file has no opinion about the surrounding popup/card chrome, no
 * tutorial sequencing, and no memory content. That's pass 6/7's job.
 *
 * Usage:
 *   GrimmerglenTyping.renderExercise(containerEl, {
 *     promptEn: 'How are you today?',
 *     promptJp: '今日の気分はどうですか？',
 *     promptReadings: { '今日': 'きょう', '気分': 'きぶん' },
 *     accepted: ["i'm happy", "i'm sad", "i'm tired", "i'm stinky"],
 *     options: ["I'm happy", "I'm sad", "I'm tired", "I'm stinky"], // or null
 *     optionsVisible: true,   // false + options given = hidden behind a hint toggle
 *   }, {
 *     onCorrect: (answerText) => { ... },
 *     onWrong:   (answerText) => { ... },
 *   });
 *
 * GrimmerglenTyping.normalizeAnswer(str) / matchesAny(input, accepted[])
 * are exposed standalone too, since later passes may want to grade
 * without the full exercise widget (e.g. validating authored content).
 */
(() => {
  'use strict';

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function furiJP(text, readings) {
    const renderer = window.UtsuFurigana && window.UtsuFurigana.sentence;
    return renderer ? renderer(text, readings || {}) : escapeHTML(text);
  }

  // ── Grading ──────────────────────────────────────────────────────────────
  // One shared normalize function, used everywhere in the typing engine.
  // Lowercase, strip apostrophes entirely (so "I'm happy" / "Im happy" /
  // "im happy" all match the same accepted string rather than needing
  // every option authored twice), trim, collapse whitespace, strip
  // terminal punctuation.
  function normalizeAnswer(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .replace(/['’]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.!?,;:]+$/g, '');
  }

  function matchesAny(input, accepted) {
    const normInput = normalizeAnswer(input);
    if (!normInput) return false;
    return (accepted || []).some(answer => normalizeAnswer(answer) === normInput);
  }

  // ── Paste prevention (best-effort, not absolute — documented here so
  //    nobody mistakes this for a hard guarantee; a browser extension or
  //    OS-level accessibility tool can still get text in) ─────────────────
  function blockPaste(input) {
    input.addEventListener('paste', event => event.preventDefault());
    input.addEventListener('drop', event => event.preventDefault());
    input.addEventListener('beforeinput', event => {
      if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') {
        event.preventDefault();
      }
    });
  }

  // ── Marietta-toned WebAudio (own timbres, distinct from both
  //    playTypeTick() in utsuroba.js and playMariettaTypeTick() in
  //    grimmerglen.js's dialogue system — those are typewriter blips;
  //    these are grading feedback) ─────────────────────────────────────────
  let typingAudioCtx = null;
  function getTypingAudioCtx() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!typingAudioCtx) typingAudioCtx = new AC();
      if (typingAudioCtx.state === 'suspended') typingAudioCtx.resume().catch(() => {});
      return typingAudioCtx;
    } catch (_) { return null; }
  }

  function tone(ctx, freq, startAt, durationSec, opts) {
    opts = opts || {};
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, startAt);
    if (opts.toFreq) osc.frequency.exponentialRampToValueAtTime(opts.toFreq, startAt + durationSec);
    const peak = opts.gain != null ? opts.gain : 0.07;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(startAt); osc.stop(startAt + durationSec + 0.02);
  }

  // A bright three-note ascending arpeggio — cute and quick, matching
  // Grimmerglen's bubbly pastel identity rather than reusing Utsuroba's
  // shared UtsuSfx.correct() chime.
  function playCorrectChime() {
    const ctx = getTypingAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        tone(ctx, freq, now + i * 0.075, 0.16, { type: 'triangle', gain: 0.065 });
      });
    } catch (_) {}
  }

  // A short, soft descending pair — a nudge, not a buzzer. The site's own
  // established tone for wrong answers with ESL readers is gentle
  // redirection, never anything punishing.
  function playWrongTone() {
    const ctx = getTypingAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      tone(ctx, 480, now, 0.13, { type: 'sine', toFreq: 360, gain: 0.05 });
    } catch (_) {}
  }

  // ── Visual feedback ──────────────────────────────────────────────────────
  function spawnSparkles(hostEl) {
    const field = document.createElement('div');
    field.className = 'mgty-spark-field';
    const colors = ['#ff9fc2', '#ffe066', '#8fd0ff', '#b8a4ff', '#8fe6c4'];
    for (let i = 0; i < 9; i++) {
      const spark = document.createElement('span');
      spark.className = 'mgty-spark';
      const angle = (Math.PI * 2 * i) / 9 + Math.random() * 0.4;
      const dist = 34 + Math.random() * 26;
      spark.style.setProperty('--mgty-dx', `${Math.cos(angle) * dist}px`);
      spark.style.setProperty('--mgty-dy', `${Math.sin(angle) * dist}px`);
      spark.style.background = colors[i % colors.length];
      spark.style.animationDelay = `${Math.random() * 0.06}s`;
      field.appendChild(spark);
    }
    hostEl.appendChild(field);
    setTimeout(() => field.remove(), 900);
  }

  function celebrateCorrect(refs, answerText, onDone) {
    refs.inputEl.classList.remove('is-wrong');
    refs.inputEl.classList.add('is-correct');
    refs.inputEl.disabled = true;
    spawnSparkles(refs.inputRow);
    playCorrectChime();
    refs.feedbackEl.textContent = 'Yay! That’s right! / やった！せいかい！';
    refs.feedbackEl.className = 'mgty-feedback is-good';
    setTimeout(() => { if (typeof onDone === 'function') onDone(answerText); }, 750);
  }

  function shakeWrong(refs, answerText, onDone) {
    refs.inputEl.classList.remove('is-correct');
    refs.inputEl.classList.add('is-wrong');
    refs.inputEl.style.animation = 'none';
    // Force reflow so the animation restarts on repeated wrong guesses.
    void refs.inputEl.offsetWidth;
    refs.inputEl.style.animation = '';
    playWrongTone();
    refs.feedbackEl.textContent = 'Not quite — try again! / ちょっとちがうよ、もう一度！';
    refs.feedbackEl.className = 'mgty-feedback is-wrong';
    setTimeout(() => refs.inputEl.classList.remove('is-wrong'), 550);
    if (typeof onDone === 'function') onDone(answerText);
  }

  // ── Exercise widget ──────────────────────────────────────────────────────
  function renderExercise(container, exercise, callbacks) {
    if (!container || !exercise) return null;
    const ex = Object.assign({
      promptEn: '', promptJp: '', promptReadings: {},
      accepted: [], options: null, optionsVisible: true
    }, exercise);
    const cb = callbacks || {};

    const hasOptions = Array.isArray(ex.options) && ex.options.length > 0;
    const chipsHTML = hasOptions
      ? ex.options.map(opt => `<span class="mgty-chip">${escapeHTML(opt)}</span>`).join('')
      : '';
    const showChipsUpFront = hasOptions && ex.optionsVisible;
    const showHintToggle = hasOptions && !ex.optionsVisible;

    container.innerHTML = `
      <div class="mgty-exercise">
        <p class="mgty-prompt-en">${escapeHTML(ex.promptEn)}</p>
        ${ex.promptJp ? `<p class="mgty-prompt-jp">${furiJP(ex.promptJp, ex.promptReadings)}</p>` : ''}
        ${hasOptions ? `<div class="mgty-chips"${showChipsUpFront ? '' : ' hidden'}>${chipsHTML}</div>` : ''}
        ${showHintToggle ? `<button type="button" class="mgty-hint-btn">Need a hint? / ${furiJP('ヒントが必要？', { '必要': 'ひつよう' })}</button>` : ''}
        <div class="mgty-input-row">
          <input type="text" class="mgty-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer / こたえをタイプしてね">
          <button type="button" class="mgty-submit">Check / ${furiJP('たしかめる', {})}</button>
        </div>
        <p class="mgty-feedback" aria-live="polite"></p>
      </div>`;

    const refs = {
      root: container.querySelector('.mgty-exercise'),
      chips: container.querySelector('.mgty-chips'),
      hintBtn: container.querySelector('.mgty-hint-btn'),
      inputRow: container.querySelector('.mgty-input-row'),
      inputEl: container.querySelector('.mgty-input'),
      submitEl: container.querySelector('.mgty-submit'),
      feedbackEl: container.querySelector('.mgty-feedback')
    };

    blockPaste(refs.inputEl);

    if (refs.hintBtn) {
      refs.hintBtn.addEventListener('click', () => {
        refs.chips.hidden = false;
        refs.hintBtn.hidden = true;
      });
    }

    let settled = false;
    function submit() {
      if (settled) return;
      const value = refs.inputEl.value;
      if (!value.trim()) return;
      if (matchesAny(value, ex.accepted)) {
        settled = true;
        celebrateCorrect(refs, value, cb.onCorrect);
      } else {
        shakeWrong(refs, value, cb.onWrong);
      }
    }

    refs.submitEl.addEventListener('click', submit);
    refs.inputEl.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); submit(); }
    });

    setTimeout(() => { try { refs.inputEl.focus({ preventScroll: true }); } catch (_) { refs.inputEl.focus(); } }, 50);

    return refs;
  }

  function injectStyles() {
    if (document.getElementById('grimmerglen-typing-styles')) return;
    const style = document.createElement('style');
    style.id = 'grimmerglen-typing-styles';
    style.textContent = `
      .mgty-exercise{font-family:'Georgia',serif;}
      .mgty-prompt-en{margin:0 0 2px;font-size:clamp(.92rem,2.4vw,1.08rem);color:#181004;line-height:1.45;font-weight:700;}
      .mgty-prompt-jp{margin:0 0 10px;font-size:clamp(.72rem,1.8vw,.82rem);color:#6a5030;line-height:1.5;}
      .mgty-prompt-jp ruby{ruby-position:over;} .mgty-prompt-jp rt{font-size:.78em;color:#8a6a42;}
      .mgty-chips{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 10px;}
      .mgty-chip{display:inline-block;padding:6px 12px;border-radius:999px;font:700 .8rem/1 'Georgia',serif;
        background:rgba(255,159,194,.16);border:1px solid rgba(224,85,158,.4);color:#7a1f4b;user-select:none;}
      .mgty-hint-btn{display:inline-block;margin:0 0 10px;padding:6px 13px;border-radius:999px;cursor:pointer;
        font:700 .76rem/1 'Georgia',serif;letter-spacing:.02em;background:transparent;
        border:1px dashed rgba(224,85,158,.5);color:#a9548a;}
      .mgty-hint-btn:hover{background:rgba(255,159,194,.12);}
      .mgty-input-row{position:relative;display:flex;gap:8px;margin:0 0 6px;}
      .mgty-input{flex:1;min-width:0;box-sizing:border-box;padding:11px 14px;border-radius:12px;
        border:2px solid rgba(224,85,158,.35);background:#fffdf9;color:#2a1408;
        font:600 clamp(1rem,3vw,1.14rem)/1.3 'Georgia',serif;letter-spacing:.01em;
        transition:border-color .18s,box-shadow .18s;}
      .mgty-input:focus{outline:none;border-color:#e0559e;box-shadow:0 0 0 3px rgba(255,159,194,.28);}
      .mgty-input.is-correct{border-color:#5cb87a;box-shadow:0 0 0 3px rgba(92,184,122,.28);background:#f3fff6;color:#1c5c33;}
      .mgty-input.is-wrong{border-color:#e2513f;box-shadow:0 0 0 3px rgba(226,81,63,.24);animation:utsuToastShake .5s;}
      .mgty-submit{flex-shrink:0;padding:0 16px;border-radius:12px;cursor:pointer;
        font:700 .82rem/1 'Georgia',serif;letter-spacing:.03em;color:#fff;
        background:linear-gradient(135deg,#ff8fc0,#ffd166);border:1px solid rgba(224,85,158,.6);
        box-shadow:0 0 12px rgba(255,150,190,.4);}
      .mgty-submit:hover{filter:brightness(1.08);}
      .mgty-submit:active{transform:translateY(1px);}
      .mgty-feedback{min-height:1.2em;margin:2px 0 0;font-size:.82rem;font-weight:700;}
      .mgty-feedback.is-good{color:#2f8a52;}
      .mgty-feedback.is-wrong{color:#c23a2c;}
      .mgty-spark-field{position:absolute;inset:0;pointer-events:none;overflow:visible;}
      .mgty-spark{position:absolute;left:50%;top:50%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;
        border-radius:50%;opacity:0;animation:mgtySparkBurst .75s ease-out forwards;}
      @keyframes mgtySparkBurst{
        0%{opacity:0;transform:translate(0,0) scale(.4);}
        18%{opacity:1;transform:translate(calc(var(--mgty-dx) * .3),calc(var(--mgty-dy) * .3)) scale(1);}
        100%{opacity:0;transform:translate(var(--mgty-dx),var(--mgty-dy)) scale(.5);}}
      @media (prefers-reduced-motion: reduce){.mgty-spark{animation:none;display:none;}.mgty-input.is-wrong{animation:none;}}
    `;
    document.head.appendChild(style);
  }

  injectStyles();

  window.GrimmerglenTyping = {
    normalizeAnswer,
    matchesAny,
    renderExercise
  };
})();
