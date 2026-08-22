
/**
 * utsu-furigana.js
 * The Booha Adventure — shared always-on furigana support for profile/world UI text.
 *
 * The 9 curriculum games toggle between two fully separate authored strings
 * (showKanji ? c.jp : c.hira) — a good fit for short vocab words, where
 * writing a hiragana-only twin is cheap. Utsuroba's JP text is prose-length
 * (journal entries, weekly-trail copy), and Japanese has no spaces between
 * words — kanji is partly doing word-boundary work, not just meaning, so
 * hiragana-only text past a phrase or two actually gets *harder* to read,
 * not easier. The profile/world surfaces therefore keep the kanji and add a
 * small furigana reading (<ruby>/<rt>) above it as baseline reading support.
 *
 * Usage at a render call site:
 *   UtsuFurigana.rb('記憶', 'きおく')  ->  <ruby>記憶<rt>きおく</rt></ruby>
 * Furigana is intentionally always visible. There is no per-panel control:
 * the reading support is part of the page's baseline design, not another
 * decision a student has to make before reading.
 */
(function () {
  'use strict';

  function rb(kanji, reading) {
    return '<ruby>' + kanji + '<rt>' + reading + '</rt></ruby>';
  }

  function injectStyles() {
    if (document.getElementById('utsu-furigana-style')) return;
    var style = document.createElement('style');
    style.id = 'utsu-furigana-style';
    style.textContent =
      // A fixed px floor via clamp() keeps the reading legible even inside
      // small captions — the old .55em-of-a-small-parent compounded down to
      // ~6px in some spots, which is below what anyone can comfortably read.
      'ruby{ruby-position:over;line-height:1.35;}' +
      'ruby rt{font-size:clamp(11px,.85em,16px);opacity:.92;user-select:none;font-family:inherit;letter-spacing:0;}' +
      '';
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
  }

  // Publish the renderer before the DOM-ready branch so pages can safely use
  // it from their own inline renderers as soon as this script has loaded.
  window.UtsuFurigana = { rb: rb };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
