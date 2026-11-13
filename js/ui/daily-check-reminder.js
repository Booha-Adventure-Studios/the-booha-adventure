/**
 * daily-check-reminder.js
 * The Booha Adventure: Daily Check reminder away from the hub.
 *
 * The Daily Check is a daily teaching routine. A student may skip it to keep
 * playing (never a gate), but until today's check is done (pending, skipped
 * or a technical failure) a small gold reminder stays on the maze and the
 * games boards. Tapping it opens the check right here; when the check is
 * done the reminder disappears for the rest of the day.
 *
 * Needs: js/core/media-config.js, js/daily-check.js (BoohaDailyCheck).
 */
(function () {
  'use strict';
  const ID = 'dcReminderChip';
  let running = false;

  function todayState() {
    try { return window.BoohaDailyCheck ? window.BoohaDailyCheck.todayState() : 'done'; }
    catch (_) { return 'done'; }
  }

  function injectStyles() {
    if (document.getElementById('dcReminderStyles')) return;
    const st = document.createElement('style');
    st.id = 'dcReminderStyles';
    st.textContent =
      '#' + ID + '{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);' +
      'z-index:52;appearance:none;margin:0;padding:6px 16px;border-radius:999px;border:1px solid rgba(242,201,92,.6);' +
      'background:rgba(28,20,6,.82);color:#f2c95c;font:800 13px/1.3 system-ui,-apple-system,"Hiragino Sans",sans-serif;' +
      'letter-spacing:.02em;white-space:nowrap;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);}' +
      '#' + ID + '[hidden]{display:none !important;}' +
      '#' + ID + ':focus-visible{outline:2px solid #fff;outline-offset:2px;}' +
      // Phones: page titles fill the top edge, so the reminder sits at the bottom.
      '@media (max-width:600px){#' + ID + '{top:auto;bottom:calc(14px + env(safe-area-inset-bottom,0px));}}';
    document.head.appendChild(st);
  }

  function chip() {
    let el = document.getElementById(ID);
    if (el) return el;
    injectStyles();
    el = document.createElement('button');
    el.id = ID;
    el.type = 'button';
    el.hidden = true;
    el.textContent = 'デイリーチェック まだだよ · Daily Check →';
    el.addEventListener('click', open);
    document.body.appendChild(el);
    return el;
  }

  function render() {
    if (!document.body) return;
    const show = !!window.BOOHA_READY && !running && todayState() !== 'done';
    const el = document.getElementById(ID);
    if (!show) { if (el) el.hidden = true; return; }
    chip().hidden = false;
  }

  function open() {
    const DC = window.BoohaDailyCheck;
    if (!DC || running) return;
    running = true;
    render();
    const finish = () => { running = false; render(); };
    let today = {};
    try { today = DC.todaySummary() || {}; } catch (_) {}
    try {
      DC.run({
        curr: today.done ? (today.curr || DC.knownCurr()) : null,
        mode: today.done ? 'retake' : 'check',
        // Closing the check here is not a new skip; the hub opening owns that.
        recordSkipOnCancel: false,
        doneLabel: 'もどる / Back',
        onDone: finish,
        onCancel: finish
      });
    } catch (_) { finish(); }
  }

  if (window.BOOHA_READY) render();
  else document.addEventListener('booha:ready', render, { once: true });
  document.addEventListener('booha:checkIn', render);
  document.addEventListener('booha:dailyCheckEvent', render);
  window.addEventListener('pageshow', render);
  document.addEventListener('DOMContentLoaded', render);

  window.BoohaDailyCheckReminder = Object.freeze({ render, open });
})();
