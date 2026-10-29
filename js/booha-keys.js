/*
 * BoohaKeys — the shared on-screen keyboard (Grimmerglen Pass G1).
 *
 * First built for the Karasuki card challenge (Pass 5) and moved here so
 * every typing game shares one keyboard. Typing games never use the iPad
 * system keyboard: its QuickType suggestions and autofill do the
 * remembering for the student, and a Japanese keyboard adds IME
 * composition. This file is only the keys: the caller owns the answer box,
 * the typed text and when typing is allowed.
 *
 *   const keys = BoohaKeys.create({
 *     className: 'kcc-keys',            // extra class for the caller's layout
 *     marks: ["'", '-'],                // punctuation keys before space
 *     okHTML: 'OK<small lang="ja">けってい</small>',
 *     onKey: k => true,                 // a letter, a mark, ' ', 'back' or 'ok';
 *                                       // return false to ignore the key
 *     repeatBack: false,                // hold backspace to keep deleting
 *   });
 *   host.appendChild(keys.el);
 *   keys.tap(k);                        // press a key from code (physical keys)
 *   keys.keyFromEvent(keydownEvent);    // → a key on this keyboard, or null
 *
 * Colours come from CSS custom properties, set on the keyboard or on any
 * ancestor: --kc glow, --kd rim, --cap/--cap2 keycap top/bottom, and
 * optionally --kt key text, --kt2 space label, --kok OK text, --kbg/--kring
 * tray, --kshadow keycap shadow. Defaults are the dark Karasuki look.
 *
 * Older iPads: taps act on pointerdown, or touchstart where Pointer Events
 * are missing (iOS 12); presses animate transform/opacity only; reduced
 * motion (html[data-motion], html[data-power], prefers-reduced-motion)
 * keeps the glow and drops the movement.
 */
(function () {
  'use strict';

  const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const REPEAT_WAIT = 450;     // ms before a held backspace starts repeating
  const REPEAT_EVERY = 75;     // ms between repeats
  const MARK_LABELS = { "'": 'apostrophe', '-': 'hyphen', ',': 'comma', '.': 'period', '?': 'question mark', '!': 'exclamation mark' };
  const BACK_SVG = '<svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M10 2h17a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H10L2 11z"/><path d="M14 7l8 8M22 7l-8 8"/></svg>';

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function still() {
    const r = document.documentElement;
    return r.getAttribute('data-motion') === 'reduced'
      || (!!r.getAttribute('data-power') && r.getAttribute('data-power') !== 'full')
      || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function keyTapSound(k) {
    try { if (window.UtsuSfx && typeof window.UtsuSfx.keyTap === 'function') window.UtsuSfx.keyTap(k === 'back' ? 'back' : ''); } catch (_) {}
  }

  /** Map a keydown to a key on a keyboard with these marks, or null.
   *  Shortcuts (Cmd/Ctrl/Alt — Cmd+V paste among them) are never keys. */
  function keyFor(e, marks) {
    if (!e || e.metaKey || e.ctrlKey || e.altKey) return null;
    const key = e.key;
    if (key === 'Enter') return 'ok';
    if (key === 'Backspace') return 'back';
    if (key === ' ' || key === 'Spacebar') return ' ';
    const mark = key === '’' ? "'" : key;
    if ((marks || []).indexOf(mark) >= 0) return mark;
    if (key && key.length === 1 && /[a-z]/i.test(key)) return key.toLowerCase();
    return null;
  }

  function injectStyles() {
    if (document.getElementById('booha-keys-style')) return;
    const style = document.createElement('style');
    style.id = 'booha-keys-style';
    style.textContent = `
.bk-keys{--gap:6px;--kh:56px;display:flex;flex-direction:column;gap:var(--gap);padding:8px;border-radius:16px;background:var(--kbg,rgba(255,255,255,.035));box-shadow:inset 0 0 0 1px var(--kring,rgba(255,255,255,.07));box-sizing:border-box;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:rgba(0,0,0,0)}
.bk-keys *{box-sizing:border-box}
.bk-row{display:flex;justify-content:center;gap:var(--gap)}
.bk-key{position:relative;flex:0 0 calc((100% - 9 * var(--gap)) / 10);min-width:0;height:var(--kh);padding:0;margin:0;border:0;border-radius:10px;background:linear-gradient(180deg,var(--cap),var(--cap2));color:var(--kt,#fff);font:800 24px/1 'Nunito',system-ui,sans-serif;box-shadow:inset 0 0 0 1.5px var(--kd),0 3px 0 var(--kshadow,rgba(0,0,0,.5));cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:rgba(0,0,0,0);transition:transform .12s ease-out}
.bk-key::after{content:'';position:absolute;left:-3px;top:-3px;right:-3px;bottom:-3px;border-radius:13px;box-shadow:0 0 16px 2px var(--kc),inset 0 0 0 2px var(--kc);opacity:0;transition:opacity .2s ease-out;pointer-events:none}
.bk-key.is-down{transform:translateY(2px) scale(.93);transition:transform .04s ease-out}
.bk-key.is-down::after{opacity:1;transition:opacity .04s ease-out}
.bk-still .bk-key.is-down{transform:none}
.bk-key.is-mark{color:var(--kc);font-size:28px}
.bk-key.is-space{flex:1 1 auto;font-size:15px;letter-spacing:.12em;color:var(--kt2,rgba(255,255,255,.75))}
.bk-key.is-back{flex-basis:calc((100% - 9 * var(--gap)) / 10 * 1.5);color:var(--kc)}
.bk-key.is-back svg{display:block;margin:0 auto}
.bk-key.is-ok{flex-basis:calc((100% - 9 * var(--gap)) / 10 * 2);background:linear-gradient(180deg,var(--kc),var(--kd));color:var(--kok,#14111E);font-size:20px;box-shadow:0 3px 0 var(--kshadow,rgba(0,0,0,.5))}
.bk-key.is-ok small{display:block;margin-top:2px;font-size:11px}
.bk-key:focus{outline:none}
.bk-key:focus-visible{outline:2px solid #fff;outline-offset:2px}
@media (max-height:500px){
.bk-keys{--gap:5px;--kh:44px;padding:5px}
.bk-key{font-size:21px}
}
@media (max-height:340px){.bk-keys{--kh:40px}}`;
    document.head.appendChild(style);
  }

  function create(o) {
    const opts = Object.assign({ className: '', marks: ["'", '-'], okHTML: 'OK', label: 'Keyboard', onKey: null, sound: true, repeatBack: false }, o || {});
    injectStyles();
    const el = document.createElement('div');
    el.className = `bk-keys${opts.className ? ` ${opts.className}` : ''}${still() ? ' bk-still' : ''}`;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', opts.label);
    const key = (k, label, cls, aria) =>
      `<button type="button" class="bk-key${cls ? ` ${cls}` : ''}" data-k="${esc(k)}"${aria ? ` aria-label="${esc(aria)}"` : ''}>${label}</button>`;
    const rows = ROWS.map(row => `<div class="bk-row">${row.split('').map(ch => key(ch, ch)).join('')}</div>`).join('');
    el.innerHTML = `${rows}<div class="bk-row">${
      opts.marks.map(m => key(m, esc(m), 'is-mark', MARK_LABELS[m] || m)).join('')}${
      key(' ', 'space', 'is-space', 'space')}${
      key('back', BACK_SVG, 'is-back', 'backspace')}${
      key('ok', opts.okHTML, 'is-ok', 'OK')}</div>`;

    function button(k) {
      return Array.prototype.find.call(el.querySelectorAll('.bk-key'), b => b.getAttribute('data-k') === k) || null;
    }
    function tap(k, btn) {
      if (typeof opts.onKey !== 'function' || opts.onKey(k) === false) return false;
      const b = btn || button(k);
      if (b) {
        b.classList.add('is-down');
        clearTimeout(b.upTimer);
        b.upTimer = setTimeout(() => b.classList.remove('is-down'), 110);
      }
      if (opts.sound && k !== 'ok') keyTapSound(k);
      return true;
    }

    // Taps act on pointerdown (fast, no 300 ms wait, no focus, no zoom or
    // text selection). iPads without Pointer Events (iOS 12) use touchstart;
    // its preventDefault also stops the emulated mouse and click. A focused
    // key activated from a keyboard or switch control arrives as a click
    // with detail 0.
    // Holding backspace (repeatBack) deletes once, waits REPEAT_WAIT, then
    // keeps deleting every REPEAT_EVERY until the finger lifts.
    let repeatWait = 0, repeatEvery = 0;
    const stopRepeat = () => { clearTimeout(repeatWait); clearInterval(repeatEvery); repeatWait = 0; repeatEvery = 0; };
    const UP_EVENTS = ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'mouseup', 'blur'];
    if (opts.repeatBack) UP_EVENTS.forEach(t => window.addEventListener(t, stopRepeat));

    const press = e => {
      const btn = e.target && e.target.closest ? e.target.closest('.bk-key') : null;
      if (!btn || !el.contains(btn)) return;
      if (e.cancelable) e.preventDefault();
      const k = btn.getAttribute('data-k');
      stopRepeat();
      const typed = tap(k, btn);
      if (typed && opts.repeatBack && k === 'back' && e.type !== 'click') {
        repeatWait = setTimeout(() => {
          repeatEvery = setInterval(() => { if (!tap('back', btn)) stopRepeat(); }, REPEAT_EVERY);
        }, REPEAT_WAIT);
      }
    };
    if (window.PointerEvent) el.addEventListener('pointerdown', press);
    else {
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('mousedown', press);
    }
    el.addEventListener('click', e => { if (e.detail === 0) press(e); });

    return {
      el,
      tap: k => tap(k),
      keyFromEvent: e => keyFor(e, opts.marks),
      destroy() {
        stopRepeat();
        if (opts.repeatBack) UP_EVENTS.forEach(t => window.removeEventListener(t, stopRepeat));
        if (el.parentNode) el.parentNode.removeChild(el);
      },
    };
  }

  window.BoohaKeys = Object.freeze({ create, keyFor, ROWS });
})();
