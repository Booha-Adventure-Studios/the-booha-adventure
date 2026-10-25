/*
 * Karasuki Cards — Pass 2c: the 10-round recall challenge and the reveal.
 *
 * Each round: SHOW (the word is written letter by letter, a meter shows the
 * remaining look time, then it fades) → TYPE (its own timer meter; when it
 * runs out, whatever is typed is submitted) → short feedback. Rules, saving
 * and checking live in js/karasuki-cards.js; this file is the screen.
 *
 * iPad keyboard: iOS only raises the keyboard from a user tap, so the input
 * is focused on the Start/Continue tap and stays focused for the whole
 * attempt. Anything typed while the word is still visible is discarded.
 *
 * Interruptions: leaving the page for up to GRACE_MS pauses the round and
 * resumes it. Longer, the round is interrupted (KarasukiCards.interrupt):
 * a fresh word within the cap, a miss beyond it. Leaving with the Leave
 * button, or coming back with Continue after a reload, counts the same way
 * only if a round was live; leaving between rounds costs nothing.
 */
(function () {
  'use strict';

  const GRACE_MS = 2000;
  const FADE_MS = 250;     // the fade happens inside the look time, so the word is gone when typing starts
  const FEEDBACK_MS = { exact: 1100, near: 1700, wrong: 2100 };
  const KIND = {
    friendly: '#F2C14E', mischievous: '#FF8AD0', dangerous: '#FF6B74',
  };

  let root = null;
  let opts = null;
  let run = null;

  const K = () => window.KarasukiCards;
  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function furi(text, map) {
    return window.UtsuFurigana && window.UtsuFurigana.sentence ? window.UtsuFurigana.sentence(text, map || {}) : esc(text);
  }
  /** Pre-Boo reads hiragana; other tracks read kanji with furigana. */
  function jp(pb, kanji, map) { return opts && opts.curriculum === 'pb' ? esc(pb) : furi(kanji, map); }
  function still() {
    const r = document.documentElement;
    return r.getAttribute('data-motion') === 'reduced'
      || (!!r.getAttribute('data-power') && r.getAttribute('data-power') !== 'full')
      || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function sfx(name) {
    try { if (window.UtsuSfx && typeof window.UtsuSfx[name] === 'function') window.UtsuSfx[name](); } catch (_) {}
  }
  const $ = sel => root.querySelector(sel);

  /* ── Styles ────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('kcc-style')) return;
    const style = document.createElement('style');
    style.id = 'kcc-style';
    style.textContent = `
#kcc{position:fixed;inset:0;z-index:9250;display:none;flex-direction:column;background:#07060c;color:#fff;font-family:'Nunito',system-ui,-apple-system,sans-serif;padding:max(10px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) 10px max(14px,env(safe-area-inset-left));box-sizing:border-box;overflow:hidden}
#kcc.is-open{display:flex}
#kcc *{box-sizing:border-box}
#kcc .kcc-top{display:flex;align-items:center;gap:12px;min-height:44px}
#kcc .kcc-host{font:700 15px/1.2 Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#kcc .kcc-dots{display:flex;gap:6px;margin-left:auto;flex:0 0 auto}
#kcc .kcc-dots i{display:block;width:14px;height:14px;border-radius:50%;border:2px solid rgba(255,255,255,.35)}
#kcc .kcc-dots i.is-now{border-color:#fff}
#kcc .kcc-dots i.is-ok{background:#5ee08a;border-color:#5ee08a}
#kcc .kcc-dots i.is-miss{background:#ff6b74;border-color:#ff6b74}
#kcc .kcc-leave{flex:0 0 auto;min-height:44px;padding:0 14px;border-radius:10px;border:1.5px solid rgba(255,255,255,.3);background:transparent;color:#fff;font:800 14px/1.1 system-ui,sans-serif;cursor:pointer}
#kcc .kcc-leave small{display:block;font-size:11px;opacity:.8}
#kcc .kcc-stage{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:10px;padding-top:min(4vh,28px);min-height:0}
#kcc .kcc-label{font:800 12px/1.3 system-ui,sans-serif;letter-spacing:.14em;color:rgba(255,255,255,.75);min-height:16px;text-align:center}
#kcc .kcc-word{min-height:1.25em;font-weight:800;line-height:1.2;letter-spacing:.02em;text-align:center;white-space:nowrap;transition:opacity .25s ease}
#kcc .kcc-word.is-gone{opacity:0}
#kcc .kcc-word span{display:inline-block;opacity:0;transform:translateY(8px);animation:kcc-in .22s ease-out forwards}
#kcc.kcc-still .kcc-word span{opacity:1;transform:none;animation:none}
#kcc.kcc-still .kcc-word,#kcc.kcc-still .kcc-meter i,#kcc.kcc-still .kcc-flip{transition:none !important}
#kcc.kcc-still .kcc-reveal-card{transition:opacity .5s ease !important}
@keyframes kcc-in{to{opacity:1;transform:none}}
#kcc .kcc-meter{width:min(520px,86vw);height:8px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
#kcc .kcc-meter i{display:block;height:100%;width:100%;transform-origin:0 50%;border-radius:99px}
#kcc .kcc-form{display:flex;gap:10px;width:min(520px,86vw)}
#kcc .kcc-input{flex:1 1 auto;min-width:0;height:52px;padding:0 14px;border-radius:12px;border:2px solid rgba(255,255,255,.3);background:#120f1c;color:#fff;font:700 24px/1 'Nunito',system-ui,sans-serif;outline:none}
#kcc .kcc-input:focus{border-color:#fff}
#kcc .kcc-input:disabled{opacity:.45}
#kcc .kcc-ok{flex:0 0 auto;min-width:72px;height:52px;border-radius:12px;border:0;font:800 16px/1.1 system-ui,sans-serif;color:#14111E;cursor:pointer}
#kcc .kcc-ok small{display:block;font-size:11px}
#kcc .kcc-feedback{min-height:22px;font:700 15px/1.5 system-ui,sans-serif;text-align:center}
#kcc .kcc-feedback.is-ok{color:#5ee08a}
#kcc .kcc-feedback.is-miss{color:#ff8a92}
#kcc .kcc-panel{max-width:min(560px,92vw);text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
#kcc .kcc-panel h2{margin:0;font:700 clamp(1.2rem,4vh,1.7rem)/1.25 Georgia,serif}
#kcc .kcc-panel p{margin:0;font-size:15px;line-height:1.7}
#kcc .kcc-panel .kcc-jp{opacity:.9}
#kcc .kcc-btn{min-height:50px;padding:0 22px;border-radius:12px;border:0;font:800 17px/1.1 system-ui,sans-serif;color:#14111E;cursor:pointer}
#kcc .kcc-btn small{display:block;font-size:12px}
#kcc .kcc-btn.is-quiet{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.35)}
#kcc .kcc-reveal{flex:1 1 auto;display:flex;align-items:center;justify-content:center;gap:clamp(16px,4vw,40px);min-height:0;flex-wrap:wrap}
#kcc .kcc-reveal{position:relative}
#kcc .kcc-hush{position:absolute;left:-40px;top:-40px;right:-40px;bottom:-40px;background:radial-gradient(ellipse at 38% 50%,rgba(0,0,0,0) 0,rgba(0,0,0,.8) 70%);opacity:0;transition:opacity .4s ease;pointer-events:none}
#kcc .kcc-reveal.is-hush .kcc-hush{opacity:1}
#kcc .kcc-stage-card{position:relative;display:flex;align-items:center;justify-content:center}
#kcc .kcc-reveal .kcc-panel{position:relative}
#kcc .kcc-reveal-card{position:relative;z-index:1;transition:transform .6s ease-in,opacity .6s ease-in}
#kcc .kcc-reveal-card.is-waiting{transform:translateY(24vh) scale(.55) rotate(-4deg);opacity:0}
#kcc .kcc-reveal-card.is-up{transform:none;opacity:1;transition:transform 1s cubic-bezier(.2,.8,.2,1),opacity .5s ease}
#kcc .kcc-reveal-card.is-up.is-stowed,#kcc .kcc-reveal-card.is-stowed{transform:translate(40vw,-45vh) scale(.15);opacity:0;transition:transform .6s ease-in,opacity .6s ease-in}
#kcc.kcc-still .kcc-reveal-card.is-waiting,#kcc.kcc-still .kcc-reveal-card.is-stowed{transform:none}
#kcc .kcc-shake{perspective:1200px;-webkit-perspective:1200px}
#kcc .kcc-shake.is-shaking{animation:kcc-shake .25s ease-in-out 1}
@keyframes kcc-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-2.5deg)}75%{transform:rotate(2.5deg)}}
#kcc .kcc-side.kcc-back{position:relative;transform:rotateY(0deg)}   /* explicit 3D plane: keeps the face hidden while the parent shakes */
#kcc .kcc-shake{transform-style:preserve-3d;-webkit-transform-style:preserve-3d}
#kcc .kcc-sweep{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;border-radius:18px;pointer-events:none}
#kcc .kcc-sweep i{position:absolute;top:-20%;bottom:-20%;left:0;width:45%;background:linear-gradient(100deg,rgba(255,236,180,0),rgba(255,236,180,.55),rgba(255,236,180,0));transform:translateX(-140%) skewX(-12deg)}
#kcc .kcc-sweep.is-sweeping i{transform:translateX(320%) skewX(-12deg);transition:transform 1s ease-in-out}
#kcc .kcc-rays{position:absolute;left:50%;top:50%;opacity:0;transform:scale(.3);pointer-events:none}
#kcc .kcc-rays span{position:absolute;left:50%;top:50%;width:8px;margin-left:-4px;transform-origin:50% 0;border-radius:4px}
#kcc .kcc-rays.is-burst{opacity:.85;transform:scale(1.15) rotate(18deg);transition:transform 1.4s cubic-bezier(.1,.8,.2,1),opacity .25s ease}
#kcc .kcc-rays.is-burst.is-fading{opacity:0;transition:transform 1.4s cubic-bezier(.1,.8,.2,1),opacity 1.1s ease}
#kcc .kcc-sparks i{position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;opacity:0;pointer-events:none}
#kcc .kcc-title span{display:inline-block;opacity:0;transform:translateY(10px)}
#kcc .kcc-title.is-shown span{opacity:1;transform:none;transition:opacity .3s ease,transform .3s ease}
#kcc.kcc-still .kcc-title span{transform:none}
#kcc .kcc-r{opacity:0;transition:opacity .4s ease}
#kcc .kcc-r.is-shown{opacity:1}
#kcc.kcc-fast *{transition-duration:.15s !important;animation-duration:.08s !important}
#kcc .kcc-flip{position:relative;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;transition:transform .8s cubic-bezier(.2,.7,.2,1)}
#kcc .kcc-flip.is-flipped{transform:rotateY(180deg) scale(1.08)}
#kcc .kcc-flip.is-flipped.is-landed{transform:rotateY(180deg) scale(1);transition:transform .35s ease-out}
#kcc .kcc-side{backface-visibility:hidden;-webkit-backface-visibility:hidden}
#kcc .kcc-side.kcc-front{position:absolute;left:0;top:0;transform:rotateY(180deg)}
#kcc.kcc-still .kcc-flip.is-flipped,#kcc.kcc-still .kcc-flip.is-flipped.is-landed{transform:none}
#kcc.kcc-still .kcc-flip .kcc-side.kcc-back{opacity:1;transition:opacity .3s}
#kcc.kcc-still .kcc-flip.is-flipped .kcc-side.kcc-back{opacity:0}
#kcc.kcc-still .kcc-flip .kcc-side.kcc-front{transform:none;opacity:0;transition:opacity .3s}
#kcc.kcc-still .kcc-flip.is-flipped .kcc-side.kcc-front{opacity:1}
#kcc .kcc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
    document.head.appendChild(style);
  }

  /* ── Shell ─────────────────────────────────────────────────────────── */
  function build() {
    if (root) return;
    injectStyles();
    root = document.createElement('div');
    root.id = 'kcc';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Karasuki card challenge');
    document.body.appendChild(root);
  }

  function accent() { return KIND[opts.kind] || KIND.friendly; }

  function shell() {
    root.innerHTML = `
      <div class="kcc-top">
        <div class="kcc-host" style="color:${accent()}">${esc(opts.name)} <span lang="ja" style="opacity:.8">${furi(opts.nameJP || '', opts.furigana)}</span></div>
        <div class="kcc-dots" aria-hidden="true">${'<i></i>'.repeat(10)}</div>
        <button type="button" class="kcc-leave">Leave<small lang="ja">やめる</small></button>
      </div>
      <div class="kcc-stage">
        <div class="kcc-label" aria-hidden="true"></div>
        <div class="kcc-word" aria-hidden="true"></div>
        <div class="kcc-meter" aria-hidden="true"><i style="background:${accent()}"></i></div>
        <form class="kcc-form" autocomplete="off">
          <input class="kcc-input" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off"
            spellcheck="false" enterkeyhint="done" maxlength="40" aria-label="Type the word you saw">
          <button class="kcc-ok" type="submit" style="background:${accent()}">OK<small lang="ja">けってい</small></button>
        </form>
        <div class="kcc-feedback" role="status" aria-live="polite"></div>
      </div>`;
    $('.kcc-leave').addEventListener('click', leave);
    const input = $('.kcc-input');
    const reject = e => { e.preventDefault(); flash(jpPaste()); };
    input.addEventListener('paste', reject);
    input.addEventListener('drop', reject);
    input.addEventListener('beforeinput', e => { if (/^insertFromPaste|^insertFromDrop/.test(e.inputType || '')) reject(e); });
    input.addEventListener('input', () => { if (run && run.phase !== 'type') input.value = ''; });
    $('.kcc-form').addEventListener('submit', e => { e.preventDefault(); if (run && run.phase === 'type') submit(); });
  }
  function jpPaste() { return `Type it yourself — no pasting. ${opts.curriculum === 'pb' ? 'じぶんで タイプしてね。' : '自分でタイプしてね。'}`; }
  function flash(text) { const fb = $('.kcc-feedback'); if (fb) { fb.className = 'kcc-feedback'; fb.textContent = text; } }

  // Results are kept on screen: the save clears the attempt the moment the
  // tenth answer lands, but the dots should still show the whole run.
  function savedResults() {
    try { return ((BoohaAdventure.save.load().karasukiCards.attempt || {}).results || []).map(r => !!r.ok); } catch (_) { return []; }
  }
  function dots() {
    const results = (run && run.results) || [];
    if (!root.querySelector('.kcc-dots')) return;
    root.querySelectorAll('.kcc-dots i').forEach((dot, i) => {
      const r = results[i];
      dot.className = r === true ? 'is-ok' : r === false ? 'is-miss' : (i === results.length ? 'is-now' : '');
    });
  }

  /* ── Phase timer with pause (meter animates transform only) ────────── */
  function startPhase(name, ms, onEnd) {
    run.phase = name;
    run.phaseMs = ms;
    run.phaseLeft = ms;
    run.onEnd = onEnd;
    resumePhase();
  }
  function meterTo(fraction, ms) {
    const bar = $('.kcc-meter i');
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.transform = `scaleX(${Math.max(0, Math.min(1, fraction))})`;
    if (ms > 0) {
      void bar.offsetWidth;
      bar.style.transition = `transform ${Math.round(ms)}ms linear`;
      bar.style.transform = 'scaleX(0)';
    }
  }
  function resumePhase() {
    clearTimeout(run.timer);
    run.phaseStartedAt = performance.now();
    if (run.phase !== 'fade') meterTo(run.phaseLeft / run.phaseMs, run.phaseLeft);
    run.timer = setTimeout(() => { const end = run.onEnd; run.onEnd = null; if (end) end(); }, run.phaseLeft);
  }
  function pausePhase() {
    clearTimeout(run.timer);
    run.phaseLeft = Math.max(0, run.phaseLeft - (performance.now() - run.phaseStartedAt));
    if (run.phase !== 'fade') meterTo(run.phaseLeft / run.phaseMs, 0);
  }

  /* ── Rounds ────────────────────────────────────────────────────────── */
  function wordSize(word) {
    const len = Math.max(3, String(word).length);
    return Math.max(26, Math.min(64, Math.floor((Math.min(window.innerWidth, 900) * 0.86) / (len * 0.62))));
  }

  function nextRound() {
    // Marks the round live in the save: leaving from here costs a restart.
    const got = K().begin();
    if (!got || !got.ok || !got.word) return got && got.error === 'noAttempt' ? ended(got.expired) : ended();
    run.word = got.word.en;
    dots();
    const input = $('.kcc-input');
    input.value = '';
    input.disabled = false;
    flash('');
    $('.kcc-label').textContent = 'LOOK · みて';
    const wordEl = $('.kcc-word');
    wordEl.classList.remove('is-gone');
    wordEl.style.fontSize = `${wordSize(run.word)}px`;
    const look = K().lookMs(run.word, opts.curriculum);
    const step = Math.min(120, (look * 0.35) / Math.max(1, run.word.length));
    wordEl.innerHTML = run.word.split('').map((ch, i) =>
      `<span style="animation-delay:${Math.round(i * step)}ms">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
    // The look meter spans the whole look time; the word's fade is its last
    // FADE_MS, so nothing is visible once typing starts.
    const fade = still() ? 0 : FADE_MS;
    run.phase = 'show';
    run.phaseMs = look;
    run.phaseLeft = look - fade;
    run.onEnd = () => {
      wordEl.classList.add('is-gone');
      if (!fade) return typePhase();
      startPhase('fade', fade, typePhase);
    };
    resumePhase();
    meterTo(1, look);
  }

  function typePhase() {
    const wordEl = $('.kcc-word');
    wordEl.classList.add('is-gone');
    $('.kcc-label').textContent = 'TYPE IT · かいて';
    const input = $('.kcc-input');
    input.value = '';
    try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
    startPhase('type', K().typeMs(run.word, opts.curriculum), submit);
  }

  function submit() {
    if (!run || run.phase !== 'type') return;
    clearTimeout(run.timer);
    run.phase = 'feedback';
    meterTo(0, 0);
    const input = $('.kcc-input');
    const r = K().answer(input.value);
    if (!r || !r.ok) return r && r.error === 'noAttempt' ? ended(r.expired) : saveProblem();
    run.results.push(!!r.correct);
    const wordEl = $('.kcc-word');
    wordEl.classList.remove('is-gone');
    wordEl.textContent = r.word.en;
    const fb = $('.kcc-feedback');
    if (r.verdict === 'exact') { fb.className = 'kcc-feedback is-ok'; fb.textContent = 'Right! · せいかい!'; sfx('correct'); }
    else if (r.verdict === 'near') { fb.className = 'kcc-feedback is-ok'; fb.textContent = 'Almost — one letter off, it counts! · おしい! OK!'; sfx('correct'); }
    else { fb.className = 'kcc-feedback is-miss'; fb.textContent = `It was “${r.word.en}”. · こたえ`; sfx('wrong'); }
    $('.kcc-label').textContent = '';
    dots();
    run.timer = setTimeout(() => (r.done ? finish(r.outcome) : nextRound()), FEEDBACK_MS[r.verdict] || 1500);
  }

  /* ── Interruptions ─────────────────────────────────────────────────── */
  function onVisibility() {
    if (!run) return;
    if (document.hidden) {
      if (run.phase === 'show' || run.phase === 'fade' || run.phase === 'type') { run.hiddenAt = performance.now(); pausePhase(); }
      return;
    }
    if (!run.hiddenAt) return;
    const away = performance.now() - run.hiddenAt;
    run.hiddenAt = 0;
    if (away <= GRACE_MS) resumePhase();
    else interrupted(K().interrupt());
  }

  function interrupted(r) {
    clearTimeout(run.timer);
    run.phase = 'paused';
    meterTo(0, 0);
    if (!r || !r.ok) return r && r.error === 'noAttempt' ? ended(r.expired) : saveProblem();
    if (r.kind === 'miss') run.results.push(false);
    dots();
    if (r.done) return finish(r.outcome);
    const miss = r.kind === 'miss';
    showPanel(
      miss ? 'That round counts as a miss' : 'Round interrupted',
      miss
        ? `You left during a round again, so it counts as a miss.<br><span class="kcc-jp" lang="ja">${jp('また とちゅうで ぬけたので、この もんだいは ×に なるよ。', 'また途中でぬけたので、この問題は×になるよ。', { '途中': 'とちゅう', '問題': 'もんだい' })}</span>`
        : `No problem — it doesn't count. Here is a fresh word.<br><span class="kcc-jp" lang="ja">${jp('だいじょうぶ、×には ならないよ。あたらしい ことばで もういちど!', '大丈夫、×にはならないよ。新しいことばでもう一度!', { '大丈夫': 'だいじょうぶ', '新': 'あたら', '一度': 'いちど' })}</span>`,
      [{ label: 'Continue', jp: 'つづける', go: () => { shell(); dots(); nextRound(); focusInput(); } }]);
  }

  function leave() {
    if (run && (run.phase === 'show' || run.phase === 'fade' || run.phase === 'type')) {
      clearTimeout(run.timer);
      try { K().interrupt(); } catch (_) {}
    }
    close();
  }

  /* ── Panels and endings ────────────────────────────────────────────── */
  function showPanel(title, html, buttons) {
    const stage = $('.kcc-stage') || root;
    stage.innerHTML = `<div class="kcc-panel"><h2 style="color:${accent()}">${esc(title)}</h2><p>${html}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${buttons.map((b, i) =>
        `<button type="button" class="kcc-btn${b.quiet ? ' is-quiet' : ''}" data-i="${i}" ${b.quiet ? '' : `style="background:${accent()}"`}>${esc(b.label)}<small lang="ja">${esc(b.jp)}</small></button>`).join('')}</div></div>`;
    stage.querySelectorAll('.kcc-btn').forEach(btn => btn.addEventListener('click', () => buttons[Number(btn.dataset.i)].go()));
    const first = stage.querySelector('.kcc-btn');
    if (first) first.focus({ preventScroll: true });
  }
  function focusInput() { const input = $('.kcc-input'); if (input) { try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); } } }

  function saveProblem() {
    run.phase = 'done';
    showPanel('Your progress could not be saved', `Please close this and try again.<br><span class="kcc-jp" lang="ja">${jp('とじて、もういちど ためしてね。', 'とじて、もう一度ためしてね。', { '一度': 'いちど' })}</span>`,
      [{ label: 'Close', jp: 'とじる', go: close }]);
  }

  function ended(expired) {
    if (expired) return finish(expired);
    run.phase = 'done';
    showPanel('This challenge has ended', `A new week has started.<br><span class="kcc-jp" lang="ja">${jp('あたらしい しゅうが はじまったよ。', '新しい週が始まったよ。', { '新': 'あたら', '週': 'しゅう', '始': 'はじ' })}</span>`,
      [{ label: 'Close', jp: 'とじる', go: close }]);
  }

  function finish(outcome) {
    clearTimeout(run.timer);
    run.phase = 'done';
    if (outcome && outcome.passed) return reveal(outcome);
    let next = null;
    try { next = K().current(); } catch (_) {}
    const tomorrow = next && next.phase === 'tomorrow';
    const later = tomorrow
      ? `Come back tomorrow for one more try this week.<br><span class="kcc-jp" lang="ja">${jp('あした また きてね。こんしゅうは あと 1かい チャレンジできるよ。', 'あしたまた来てね。今週は、あと1回チャレンジできるよ。', { '来': 'き', '今週': 'こんしゅう', '回': 'かい' })}</span>`
      : `Try again next week, after next week's Blitz.<br><span class="kcc-jp" lang="ja">${jp('らいしゅうの ブリッツの あとで、また チャレンジしよう。', '来週のブリッツのあとで、またチャレンジしよう。', { '来週': 'らいしゅう' })}</span>`;
    const score = outcome ? outcome.score : 0;
    showPanel('Not this time', `You remembered ${score} of 10. You need 8.<br><span class="kcc-jp" lang="ja">${jp(`10もんの うち ${score}もん せいかい。8もん ひつようだよ。`, `10問のうち${score}問せいかい。8問ひつようだよ。`, { '問': 'もん' })}</span><br><br>${later}`,
      [{ label: 'OK', jp: 'わかった', go: close }]);
  }

  /* ── The reveal (Pass 4a) ──────────────────────────────────────────
     A fixed ~3.5 s sequence, unskippable by design: taps do nothing until
     the binder button appears at the end. It is driven by timers, never by
     animationend/transitionend (older iPads can drop those and would leave
     a student on a frozen reveal). The win is saved before this starts, so
     leaving mid-reveal never loses the card. Reduced motion keeps the same
     timing and sounds with fades instead of movement. */
  const REVEAL = Object.freeze({ hush: 0, rise: 400, shake: 1450, flip: 1700, land: 2050, title: 2350, line: 2550, count: 2650, button: 3500 });
  let revealTimers = [];
  function clearReveal() { revealTimers.forEach(clearTimeout); revealTimers = []; }

  function reveal(outcome) {
    const face = window.KarasukiCardFace;
    const calm = still();
    const speed = window.__devRevealFast ? 0.25 : 1;   // teacher dev toggle only
    // Fit the 2:3 card in the landscape height (phone ≈ 210px wide, iPad 260px).
    const cardW = Math.round(Math.max(140, Math.min(260, (window.innerHeight - 60) * 2 / 3)));
    const cardH = Math.round(cardW * 1.5);
    const front = face ? face.fromRegistry(outcome.hostId, { width: cardW, result: { score: outcome.score, wonAt: outcome.at, try: outcome.try } }) : '';
    const back = face ? face.back({ width: cardW }) : '';
    const tryText = outcome.try > 1 ? ' (2nd try)' : '';
    const color = accent();
    const raySize = Math.round(cardH * 1.9);
    const rays = Array.from({ length: 12 }, (_, i) =>
      `<span style="height:${Math.round(raySize / 2)}px;transform:rotate(${i * 30}deg);background:linear-gradient(${color},rgba(0,0,0,0))"></span>`).join('');
    const sparks = Array.from({ length: 14 }, () => `<i style="background:${color}"></i>`).join('');
    const title = 'Card won!'.split('').map((ch, i) =>
      `<span style="transition-delay:${i * 35}ms">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
    root.innerHTML = `
      <div class="kcc-reveal">
        <div class="kcc-hush" aria-hidden="true"></div>
        <div class="kcc-stage-card">
          <div class="kcc-rays" aria-hidden="true" style="width:0;height:0">${rays}</div>
          <div class="kcc-sparks" aria-hidden="true" style="position:absolute;left:50%;top:50%">${sparks}</div>
          <div class="kcc-reveal-card is-waiting"><div class="kcc-shake"><div class="kcc-flip" style="width:${cardW}px;height:${cardH}px">
            <div class="kcc-side kcc-back">${back}<div class="kcc-sweep" aria-hidden="true"><i></i></div></div>
            <div class="kcc-side kcc-front">${front}</div>
          </div></div></div>
        </div>
        <div class="kcc-panel" style="align-items:flex-start;text-align:left">
          <h2 class="kcc-title" style="color:${color}" aria-label="Card won!">${title}</h2>
          <p class="kcc-r kcc-r-jp" lang="ja" style="font-size:18px;font-weight:800">${jp('カード ゲット!', 'カードゲット!')}</p>
          <p class="kcc-r kcc-r-line">${esc(opts.name)}'s card is yours. You remembered <b class="kcc-count">0</b> of 10${tryText}.</p>
          <button type="button" class="kcc-btn kcc-r" style="background:${color}" hidden>Put it in my binder<small lang="ja">${jp('バインダーに いれる', 'バインダーに入れる', { '入': 'い' })}</small></button>
          <p class="kcc-saved" role="status" aria-live="polite"></p>
        </div>
      </div>`;
    root.className = 'is-open' + (calm ? ' kcc-still' : '') + (speed < 1 ? ' kcc-fast' : '');
    clearReveal();
    const stage = $('.kcc-reveal');
    // at(ms, fn): schedule fn ms after NOW (scaled for the dev 4× toggle).
    const at = (ms, fn) => revealTimers.push(setTimeout(() => { if (root && root.contains(stage)) fn(); }, Math.round(ms * speed)));
    const card = $('.kcc-reveal-card');
    const flip = $('.kcc-flip');

    at(REVEAL.hush, () => { stage.classList.add('is-hush'); sfx('cardHush'); });
    at(REVEAL.rise, () => {
      card.classList.remove('is-waiting');
      card.classList.add('is-up');
      if (!calm) $('.kcc-sweep').classList.add('is-sweeping');
      sfx('cardCharge');
    });
    at(REVEAL.shake, () => { if (!calm) $('.kcc-shake').classList.add('is-shaking'); });
    at(REVEAL.flip, () => { flip.classList.add('is-flipped'); sfx('cardWhoosh'); });
    at(REVEAL.land, () => {
      flip.classList.add('is-landed');
      try { if (window.UtsuSfx && typeof window.UtsuSfx.cardReveal === 'function') window.UtsuSfx.cardReveal(opts.kind); } catch (_) {}
      if (calm) return;
      const raysEl = $('.kcc-rays');
      raysEl.classList.add('is-burst');
      root.querySelectorAll('.kcc-sparks i').forEach((spark, i) => {
        const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
        const dist = cardH * (0.55 + Math.random() * 0.35);
        spark.style.transition = 'none';
        spark.style.opacity = '1';
        spark.style.transform = 'translate(0,0) scale(1)';
        void spark.offsetWidth;
        spark.style.transition = 'transform .9s cubic-bezier(.1,.7,.2,1),opacity .9s ease-in';
        spark.style.transform = `translate(${Math.round(Math.cos(angle) * dist)}px,${Math.round(Math.sin(angle) * dist)}px) scale(.3)`;
        spark.style.opacity = '0';
      });
      at(700, () => raysEl.classList.add('is-fading'));   // relative to the landing
    });
    at(REVEAL.title, () => $('.kcc-title').classList.add('is-shown'));
    at(REVEAL.line, () => { $('.kcc-r-jp').classList.add('is-shown'); $('.kcc-r-line').classList.add('is-shown'); });
    const score = Math.max(0, Math.min(10, Number(outcome.score) || 0));
    const step = Math.min(70, 600 / Math.max(1, score));
    for (let i = 1; i <= score; i++) {
      at(REVEAL.count + i * step, () => { $('.kcc-count').textContent = String(i); sfx2('cardTick', i); });
    }
    at(REVEAL.button, () => {
      const btn = $('.kcc-btn');
      btn.hidden = false;
      void btn.offsetWidth;
      btn.classList.add('is-shown');
      $('.kcc-count').textContent = String(score);
      try { btn.focus({ preventScroll: true }); } catch (_) { btn.focus(); }
      btn.addEventListener('click', () => {
        btn.disabled = true;
        $('.kcc-saved').innerHTML = `Saved to your Karasuki Cards. <span lang="ja">${jp('カラスキーカードに ほぞんしたよ!', 'カラスキーカードに保存したよ!', { '保存': 'ほぞん' })}</span>`;
        card.classList.add('is-stowed');
        at(calm ? 700 : 1100, close);
      });
    });
  }
  function sfx2(name, arg) {
    try { if (window.UtsuSfx && typeof window.UtsuSfx[name] === 'function') window.UtsuSfx[name](arg); } catch (_) {}
  }

  /* ── Open / close ──────────────────────────────────────────────────── */
  /**
   * o: { mode: 'start' | 'continue', name, nameJP, furigana, kind, curriculum, onClose }
   * Must be called from a tap so iOS raises the keyboard.
   */
  async function open(o) {
    if (!K()) return;
    build();
    opts = o || {};
    run = { phase: 'loading', timer: 0, hiddenAt: 0, results: savedResults() };
    root.className = 'is-open' + (still() ? ' kcc-still' : '');
    shell();
    focusInput();                      // inside the tap: keyboard comes up now
    document.addEventListener('visibilitychange', onVisibility);
    $('.kcc-label').textContent = 'GETTING WORDS READY · じゅんびちゅう';
    $('.kcc-input').disabled = false;

    if (opts.mode === 'continue') {
      const r = K().resume();
      if (r && r.ok && r.kind === 'resume') return nextRound();   // left between rounds: free
      return interrupted(r);
    }

    let words = [];
    try { words = await K().loadSnapshotWords(opts.curriculum); } catch (_) { words = []; }
    if (!run) return;                  // closed while loading
    if (!words.length) {
      run.phase = 'done';
      return showPanel('The words could not load', `Check the internet and try again.<br><span class="kcc-jp" lang="ja">${jp('インターネットを たしかめて、もういちど ためしてね。', 'インターネットをたしかめて、もう一度ためしてね。', { '一度': 'いちど' })}</span>`,
        [{ label: 'Close', jp: 'とじる', go: close }]);
    }
    const started = K().start(words);
    run.results = [];
    if (!started || !started.ok) {
      run.phase = 'done';
      return showPanel('Not available right now', `Please come back later.<br><span class="kcc-jp" lang="ja">${jp('また あとで きてね。', 'また後で来てね。', { '後': 'あと', '来': 'き' })}</span>`,
        [{ label: 'Close', jp: 'とじる', go: close }]);
    }
    nextRound();
  }

  function isOpen() { return !!root && root.classList.contains('is-open'); }

  function close() {
    clearReveal();
    if (run) clearTimeout(run.timer);
    run = null;
    document.removeEventListener('visibilitychange', onVisibility);
    if (root) { root.className = ''; root.innerHTML = ''; }
    const done = opts && opts.onClose;
    opts = null;
    if (typeof done === 'function') done();
  }

  window.KarasukiCardChallenge = Object.freeze({ open, close, isOpen, GRACE_MS });
})();
