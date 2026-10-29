/*
 * Grimmerglen typing engine — foundation pass 5.
 *
 * The novel piece of Grimmerglen: no other area on this site has a real
 * text <input> anywhere (confirmed by grepping every .js file for
 * <input>/<textarea>/contenteditable/paste handling during the original
 * audit — everything else is tap-to-choose). This module is the reusable
 * core every later memory exercise (and pass 6's tutorial) will call into:
 * an answer box, lenient grading, and correct/wrong feedback.
 *
 * Pass G2: no system keyboard. The answer box is a plain display, typed
 * with the shared on-screen keyboard (js/booha-keys.js) in Marietta's
 * cream/pink/gold, docked at the bottom of the screen. iPad suggestions,
 * autofill and Japanese IME never appear, and paste is impossible because
 * there is no text field. The dock reports its height as
 * --grimmerglen-keys-inset so Marietta's panel sits above it. Display
 * only: "I" and the answer's own names get their capital letters while
 * typing; grading ignores capitals and commas. It renders into a container the CALLER provides and owns —
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
 *     optionsVisible: true,   // whether authored choices are visible immediately
 *     showHint: true,          // show the caller-owned Need a hint action
 *     helpText: 'Japanese help', helpReadings: { ... }, // optional Deep help
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
  // every option authored twice), treat commas as spaces (Pass G2: a
  // remembered sentence without its comma is still remembered), trim,
  // collapse whitespace, strip terminal punctuation.
  function normalizeAnswer(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/,/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.!?,;:]+$/g, '');
  }

  function matchesAny(input, accepted) {
    const normInput = normalizeAnswer(input);
    if (!normInput) return false;
    return (accepted || []).some(answer => normalizeAnswer(answer) === normInput);
  }

  // ── Display capitals (Pass G2) ───────────────────────────────────────
  // The keys are lowercase. While typing, the answer box shows "I" (and
  // I'm / I'll / I've / I'd), a capital first letter, and the capital of
  // any name the exercise's own sentences capitalise mid-sentence
  // (Jamariko, October...). Grading ignores case, so this never changes
  // whether an answer is right.
  function namesOf(ex) {
    const names = {};
    const sources = [].concat(ex.accepted || [], ex.options || [], ex.answerEn || [], ex.promptEn || []);
    sources.forEach(text => {
      String(text).split(/\s+/).forEach((raw, index) => {
        const word = raw.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').split(/['’]/)[0];
        if (index === 0 || !word || word === 'I') return;
        if (/^[A-Z]/.test(word)) names[word.toLowerCase()] = word;
      });
    });
    return names;
  }
  function displayAnswer(raw, names) {
    let first = true;
    return String(raw || '').replace(/[a-z']+/gi, token => {
      const parts = token.split("'");
      const base = parts[0].toLowerCase();
      let out = token;
      if (base === 'i') out = `I${token.slice(1)}`;
      else if (names[base]) out = names[base] + token.slice(base.length);
      if (first) { first = false; out = out.charAt(0).toUpperCase() + out.slice(1); }
      return out;
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
    refs.answerEl.classList.remove('is-wrong');
    refs.answerEl.classList.add('is-correct');
    hideKeys();
    spawnSparkles(refs.inputRow);
    playCorrectChime();
    refs.feedbackEl.textContent = 'Yay! That’s right! / やった！せいかい！';
    refs.feedbackEl.className = 'mgty-feedback is-good';
    setTimeout(() => { if (typeof onDone === 'function') onDone(answerText); }, 750);
  }

  function shakeWrong(refs, answerText, onDone) {
    refs.answerEl.classList.remove('is-correct');
    refs.answerEl.classList.add('is-wrong');
    refs.answerEl.style.animation = 'none';
    // Force reflow so the animation restarts on repeated wrong guesses.
    void refs.answerEl.offsetWidth;
    refs.answerEl.style.animation = '';
    playWrongTone();
    refs.feedbackEl.textContent = 'Not quite — try again! / ちょっとちがうよ、もう一度！';
    refs.feedbackEl.className = 'mgty-feedback is-wrong';
    setTimeout(() => refs.answerEl.classList.remove('is-wrong'), 550);
    if (typeof onDone === 'function') onDone(answerText);
  }

  // ── On-screen keyboard dock (Pass G2) ───────────────────────────────────
  // One keyboard for the page, docked at the bottom of the screen. It types
  // into the exercise rendered last; when that exercise leaves the page
  // (Marietta's panel closes or shows something else) the keyboard slides
  // away on its own.
  const MAX_TYPED = 140;
  const KEYS_SHOW_MS = 300;
  const KEYS_GAP = 6;      // px between Marietta's panel and the keys
  let dock = null;
  let keys = null;
  let active = null;
  let watchTimer = 0;
  let hideTimer = 0;

  function reducedMotion() {
    const r = document.documentElement;
    return r.getAttribute('data-motion') === 'reduced'
      || (!!r.getAttribute('data-power') && r.getAttribute('data-power') !== 'full')
      || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function setKeysInset(px) {
    document.documentElement.style.setProperty('--grimmerglen-keys-inset', `${Math.max(0, Math.round(px))}px`);
  }
  function measureKeys() {
    if (!dock || !dock.classList.contains('is-open')) return setKeysInset(0);
    setKeysInset(dock.offsetHeight + KEYS_GAP);
  }

  function buildDock() {
    if (dock || !window.BoohaKeys) return;
    dock = document.createElement('div');
    dock.id = 'mgty-keys-dock';
    dock.hidden = true;
    keys = window.BoohaKeys.create({
      className: 'mgty-keys',
      marks: ["'", ','],
      okHTML: `Check<small lang="ja">たしかめる</small>`,
      label: 'Keyboard',
      repeatBack: true,
      onKey
    });
    dock.appendChild(keys.el);
    document.body.appendChild(dock);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', measureKeys, { passive: true });
  }

  function showKeys() {
    buildDock();
    if (!dock) return;
    clearTimeout(hideTimer);
    dock.hidden = false;
    dock.classList.toggle('is-still', reducedMotion());
    void dock.offsetWidth;
    dock.classList.add('is-open');
    measureKeys();
    clearInterval(watchTimer);
    watchTimer = setInterval(watchActive, 400);
  }

  function hideKeys() {
    clearInterval(watchTimer);
    watchTimer = 0;
    if (!dock || !dock.classList.contains('is-open')) return;
    dock.classList.remove('is-open');
    setKeysInset(0);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (dock && !dock.classList.contains('is-open')) dock.hidden = true; }, KEYS_SHOW_MS);
  }

  // The exercise is gone (panel rebuilt) or its card closed: put the keys away.
  function exerciseLive() {
    if (!active || active.settled || !document.body.contains(active.refs.root)) return false;
    const card = active.refs.root.closest('.utsu-card');
    return !card || card.classList.contains('open');
  }
  function watchActive() { if (!exerciseLive()) hideKeys(); }

  function onKey(k) {
    if (!exerciseLive()) { hideKeys(); return false; }
    if (k === 'ok') { active.submit(); return true; }
    if (k === 'back') active.typed = active.typed.slice(0, -1);
    else if (active.typed.length < MAX_TYPED) active.typed += k;
    active.show();
    return true;
  }

  // A physical keyboard (teacher Mac, iPad keyboard case) types the same keys.
  function onKeydown(event) {
    if (!keys || !dock || !dock.classList.contains('is-open')) return;
    const k = keys.keyFromEvent(event);
    if (k === null) return;
    event.preventDefault();
    keys.tap(k);
  }

  // ── Exercise widget ──────────────────────────────────────────────────────
  // Choices are reshuffled each time an exercise is rendered. Keep the first
  // authored choice out of the first slot when alternatives exist, since the
  // memory content uses that slot for the correct answer.
  function reorderOptions(options) {
    const reordered = Array.isArray(options) ? options.slice() : [];
    for (let index = reordered.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    }
    if (reordered.length > 1 && reordered[0] === options[0]) {
      const swapIndex = 1 + Math.floor(Math.random() * (reordered.length - 1));
      [reordered[0], reordered[swapIndex]] = [reordered[swapIndex], reordered[0]];
    }
    return reordered;
  }

  function renderExercise(container, exercise, callbacks) {
    if (!container || !exercise) return null;
    const ex = Object.assign({
      promptEn: '', promptJp: '', promptReadings: {},
      accepted: [], options: null, optionsVisible: true
    }, exercise);
    const cb = callbacks || {};

    const hasOptions = Array.isArray(ex.options) && ex.options.length > 0;
    const displayOptions = hasOptions ? reorderOptions(ex.options) : [];
    const chipsHTML = hasOptions
      ? displayOptions.map(opt => `<span class="mgty-chip">${escapeHTML(opt)}</span>`).join('')
      : '';
    const showChipsUpFront = hasOptions && ex.optionsVisible;
    const showHintToggle = ex.showHint === true || (hasOptions && !ex.optionsVisible);
    const showFuriganaHelp = ex.helpText;

    container.innerHTML = `
      <div class="mgty-exercise">
        <p class="mgty-prompt-en">${escapeHTML(ex.promptEn)}</p>
        ${ex.promptJp ? `<p class="mgty-prompt-jp">${furiJP(ex.promptJp, ex.promptReadings)}</p>` : ''}
        ${hasOptions ? `<div class="mgty-chips"${showChipsUpFront ? '' : ' hidden'}>${chipsHTML}</div>` : ''}
        ${showHintToggle ? `<button type="button" class="mgty-hint-btn">Need a hint? / ${furiJP('ヒントが必要？', { '必要': 'ひつよう' })}</button>` : ''}
        ${showFuriganaHelp ? `<button type="button" class="mgty-help-btn">Help me / ${furiJP('助けて', { '助けて': 'たすけて' })}</button><p class="mgty-help" hidden>${furiJP(ex.helpText, ex.helpReadings || {})}</p>` : ''}
        <div class="mgty-input-row">
          <div class="mgty-input-label"><span>Type here / ${furiJP('答えをタイプしてね', { '答え': 'こたえ' })}</span>
            <div class="mgty-answer" role="textbox" aria-readonly="true" aria-label="Type your answer"><span class="mgty-typed"></span><i class="mgty-caret" aria-hidden="true"></i></div></div>
        </div>
        <p class="mgty-feedback" aria-live="polite"></p>
      </div>`;

    const refs = {
      root: container.querySelector('.mgty-exercise'),
      chips: container.querySelector('.mgty-chips'),
      hintBtn: container.querySelector('.mgty-hint-btn'),
      helpBtn: container.querySelector('.mgty-help-btn'),
      helpEl: container.querySelector('.mgty-help'),
      inputRow: container.querySelector('.mgty-input-row'),
      answerEl: container.querySelector('.mgty-answer'),
      typedEl: container.querySelector('.mgty-typed'),
      feedbackEl: container.querySelector('.mgty-feedback')
    };

    // The answer is typed, never copied out and pasted back.
    ['copy', 'cut'].forEach(type => refs.answerEl.addEventListener(type, event => event.preventDefault()));

    if (refs.hintBtn) {
      refs.hintBtn.addEventListener('click', () => {
        if (typeof cb.onHint === 'function') {
          cb.onHint();
          return;
        }
        if (refs.chips) refs.chips.hidden = false;
        refs.hintBtn.hidden = true;
      });
    }

    if (refs.helpBtn && refs.helpEl) {
      refs.helpBtn.addEventListener('click', () => {
        refs.helpEl.hidden = false;
        refs.helpBtn.hidden = true;
      });
    }

    const names = namesOf(ex);
    const entry = {
      refs,
      typed: '',
      settled: false,
      text: () => displayAnswer(entry.typed, names),
      show() {
        refs.typedEl.textContent = entry.text();
        const n = entry.typed.length;
        refs.answerEl.classList.toggle('is-long', n > 60);
        refs.answerEl.classList.remove('is-wrong');
        if (refs.feedbackEl.classList.contains('is-wrong')) { refs.feedbackEl.textContent = ''; refs.feedbackEl.className = 'mgty-feedback'; }
        keepAnswerVisible();
      },
      submit() {
        if (entry.settled) return;
        const value = entry.text();
        if (!value.trim()) return;
        if (matchesAny(value, ex.accepted)) {
          entry.settled = true;
          celebrateCorrect(refs, value, cb.onCorrect);
        } else {
          shakeWrong(refs, value, cb.onWrong);
        }
      }
    };

    // Marietta's panel scrolls; keep the answer box in view as it grows.
    function keepAnswerVisible() {
      window.requestAnimationFrame(() => {
        try { refs.answerEl.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {}
      });
    }

    active = entry;
    entry.show();
    showKeys();
    setTimeout(keepAnswerVisible, KEYS_SHOW_MS);

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
      .mgty-hint-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin:0 0 10px;padding:8px 14px;border-radius:999px;cursor:pointer;touch-action:manipulation;
        font:700 .76rem/1 'Georgia',serif;letter-spacing:.02em;background:linear-gradient(135deg,rgba(255,231,242,.98),rgba(255,247,210,.98));
        border:1px solid rgba(224,85,158,.58);color:#a9548a;box-shadow:0 0 9px rgba(255,159,194,.48),0 0 17px rgba(255,209,102,.18);
        animation:mgtyHintGlow 2.2s ease-in-out infinite;}
      .mgty-hint-btn:hover{background:linear-gradient(135deg,rgba(255,215,234,1),rgba(255,241,184,1));box-shadow:0 0 13px rgba(255,159,194,.7),0 0 22px rgba(255,209,102,.3);}
      .mgty-help-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin:0 0 10px;padding:6px 13px;border-radius:999px;cursor:pointer;touch-action:manipulation;
        font:700 .76rem/1 'Georgia',serif;letter-spacing:.02em;background:rgba(184,164,255,.12);
        border:1px dashed rgba(126,99,196,.55);color:#6851a6;}
      .mgty-help-btn:hover{background:rgba(184,164,255,.22);}
      .mgty-help{margin:0 0 10px;padding:8px 11px;border-left:3px solid #b8a4ff;border-radius:0 8px 8px 0;background:rgba(184,164,255,.12);color:#5e4b88;font-size:.86rem;line-height:1.55;}
      .mgty-input-row{position:relative;display:flex;gap:8px;margin:0 0 6px;}
      .mgty-input-label{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px;color:#6a5030;font-size:.72rem;font-weight:700;line-height:1.35;}
      .mgty-input-label ruby{ruby-position:over;} .mgty-input-label rt{font-size:.78em;color:#8a6a42;}
      .mgty-answer{position:relative;display:block;width:100%;min-width:0;min-height:44px;max-height:calc(3 * 1.35em + 20px);overflow-y:auto;box-sizing:border-box;padding:9px 14px;border-radius:12px;
        border:2px solid #e0559e;background:#fffdf9;color:#2a1408;box-shadow:0 0 0 3px rgba(255,159,194,.22);
        font:600 max(1rem,clamp(1rem,3vw,1.14rem))/1.35 'Georgia',serif;letter-spacing:.01em;white-space:pre-wrap;overflow-wrap:break-word;word-break:break-word;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}
      .mgty-answer.is-long{font-size:1rem;}
      .mgty-caret{display:inline-block;width:2px;height:1.1em;margin-left:1px;vertical-align:-.15em;border-radius:1px;background:#e0559e;animation:mgtyCaret 1s steps(1) infinite;}
      .mgty-answer.is-correct{border-color:#5cb87a;box-shadow:0 0 0 3px rgba(92,184,122,.28);background:#f3fff6;color:#1c5c33;}
      .mgty-answer.is-correct .mgty-caret{opacity:0;animation:none;}
      .mgty-answer.is-wrong{border-color:#e2513f;box-shadow:0 0 0 3px rgba(226,81,63,.24);animation:utsuToastShake .5s;}
      @keyframes mgtyCaret{50%{opacity:0;}}
      #mgty-keys-dock{position:fixed;left:0;right:0;bottom:0;z-index:9250;display:flex;justify-content:center;box-sizing:border-box;
        padding:0 max(8px,env(safe-area-inset-right,0px)) max(8px,env(safe-area-inset-bottom,0px)) max(8px,env(safe-area-inset-left,0px));
        pointer-events:none;opacity:0;transform:translateY(110%);transition:transform .3s ease-out,opacity .22s ease-out;}
      #mgty-keys-dock.is-open{opacity:1;transform:none;}
      #mgty-keys-dock.is-still{transform:none;}
      #mgty-keys-dock[hidden]{display:none;}
      #mgty-keys-dock .mgty-keys{width:min(800px,100%);pointer-events:auto;
        --kc:#ff9fc2;--kd:#efb3d0;--cap:#fffdf9;--cap2:#ffeef6;--kt:#5a2a48;--kt2:#a9548a;--kok:#fff;
        --kbg:rgba(255,246,251,.95);--kring:rgba(224,85,158,.38);--kshadow:rgba(169,84,138,.28);
        box-shadow:inset 0 0 0 1px var(--kring),0 -6px 22px rgba(169,84,138,.22);}
      #mgty-keys-dock .bk-key{font-family:ui-rounded,'Avenir Next Rounded','Nunito','Trebuchet MS',system-ui,sans-serif;}
      #mgty-keys-dock .bk-key.is-mark,#mgty-keys-dock .bk-key.is-back{color:#c4467f;}
      #mgty-keys-dock .bk-key.is-ok{background:linear-gradient(135deg,#ff8fc0,#ffd166);text-shadow:0 1px 2px rgba(169,60,110,.45);font-size:18px;}
      #mgty-keys-dock .bk-key:focus-visible{outline-color:#e0559e;}
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
      @keyframes mgtyHintGlow{0%,100%{box-shadow:0 0 8px rgba(255,159,194,.42),0 0 15px rgba(255,209,102,.16);}50%{box-shadow:0 0 13px rgba(255,159,194,.68),0 0 23px rgba(255,209,102,.28);}}
      @media (orientation:landscape) and (max-height:480px){.mgty-input-row{flex-wrap:wrap;}.mgty-input-label{flex:0 0 100%;}.mgty-answer{scroll-margin-block:8px;max-height:calc(2 * 1.35em + 20px);}}
      @media (prefers-reduced-motion: reduce){.mgty-spark{animation:none;display:none;}.mgty-answer.is-wrong{animation:none;}.mgty-hint-btn{animation:none;}.mgty-caret{animation:none;}}
      html[data-motion="reduced"] .mgty-caret,html[data-motion="reduced"] .mgty-answer.is-wrong{animation:none;}
    `;
    document.head.appendChild(style);
  }

  injectStyles();

  window.GrimmerglenTyping = {
    normalizeAnswer,
    matchesAny,
    displayAnswer,
    namesOf,
    renderExercise,
    hideKeyboard: hideKeys
  };
})();
