
/**
 * utsu-furigana.js
 * The Booha Adventure — shared kanji/furigana toggle for Utsuroba UI text.
 *
 * The 9 curriculum games toggle between two fully separate authored strings
 * (showKanji ? c.jp : c.hira) — a good fit for short vocab words, where
 * writing a hiragana-only twin is cheap. Utsuroba's JP text is prose-length
 * (journal entries, weekly-trail copy), and Japanese has no spaces between
 * words — kanji is partly doing word-boundary work, not just meaning, so
 * hiragana-only text past a phrase or two actually gets *harder* to read,
 * not easier. So this toggle never removes the kanji: it shows or hides a
 * small furigana reading (<ruby>/<rt>) above it instead, same idea as the
 * games' toggle (a kid who can't read kanji yet gets help), different
 * mechanism because the content shape is different.
 *
 * Usage at a render call site:
 *   UtsuFurigana.rb('記憶', 'きおく')  ->  <ruby>記憶<rt>きおく</rt></ruby>
 * Drop UtsuFurigana.toggleHTML() into any panel header to give it the
 * ふりがな／漢字 buttons — the toggle is global (one <html> class), so a kid
 * only has to set it once and it applies everywhere ruby text appears.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'booha_furigana_on';

  function isOn() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      // Default ON — the whole point of this toggle is that a kid who can't
      // read kanji yet shouldn't have to find a button before getting help.
      return v === null ? true : v === '1';
    } catch (_) {
      return true;
    }
  }

  function apply(on) {
    document.documentElement.classList.toggle('utsu-furigana-off', !on);
  }

  function refreshButtons() {
    var on = isOn();
    document.querySelectorAll('.utsu-furi-btn').forEach(function (btn) {
      btn.classList.toggle('active', (btn.getAttribute('data-furi') === 'on') === on);
    });
  }

  function setOn(on) {
    try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch (_) {}
    apply(on);
    refreshButtons();
  }

  function rb(kanji, reading) {
    return '<ruby>' + kanji + '<rt>' + reading + '</rt></ruby>';
  }

  function toggleHTML(extraClass) {
    return '<span class="utsu-furi-toggle' + (extraClass ? ' ' + extraClass : '') + '" role="group" aria-label="Furigana toggle / ふりがな切り替え">' +
      '<button type="button" class="utsu-furi-btn" data-furi="on">ふりがな</button>' +
      '<button type="button" class="utsu-furi-btn" data-furi="off">漢字</button>' +
      '</span>';
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('.utsu-furi-btn');
    if (!btn) return;
    setOn(btn.getAttribute('data-furi') === 'on');
  });

  function injectStyles() {
    if (document.getElementById('utsu-furigana-style')) return;
    var style = document.createElement('style');
    style.id = 'utsu-furigana-style';
    style.textContent =
      // A fixed px floor via clamp() keeps the reading legible even inside
      // small captions — the old .55em-of-a-small-parent compounded down to
      // ~6px in some spots, which is below what anyone can comfortably read.
      'ruby{ruby-position:over;}' +
      'ruby rt{font-size:clamp(11px,.85em,16px);opacity:.92;user-select:none;font-family:inherit;letter-spacing:0;}' +
      'html.utsu-furigana-off ruby rt{display:none;}' +
      '.utsu-furi-toggle{display:inline-flex;gap:5px;margin-left:.6em;vertical-align:middle;}' +
      // Fixed amber palette instead of currentColor — the toggle sits inside
      // both a purple panel and a green one, and "inherit the ambient text
      // color at 50% opacity" made it nearly invisible in both. Amber is
      // this site's own accent for "the thing you can interact with," used
      // the same way on the journal button, word pills, and review button.
      '.utsu-furi-btn{padding:3px 10px;border-radius:999px;border:1.5px solid rgba(255,203,117,.55);background:rgba(20,14,8,.55);color:#ffe7b2;opacity:.75;font:700 .68rem inherit;line-height:1.6;cursor:pointer;-webkit-tap-highlight-color:transparent;letter-spacing:.02em;}' +
      '.utsu-furi-btn.active{opacity:1;background:#ffcb75;border-color:#ffcb75;color:#241507;}' +
      '.utsu-furi-btn:hover{opacity:1;}';
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    apply(isOn());
    refreshButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.UtsuFurigana = { rb: rb, toggleHTML: toggleHTML, isOn: isOn, setOn: setOn, refreshButtons: refreshButtons };
})();
