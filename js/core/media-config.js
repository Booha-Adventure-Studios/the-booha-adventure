/**
 * media-config.js
 * The Booha Adventure: single source for where remote learning audio lives.
 *
 * Every page that plays curriculum audio (hub homework, Daily Check, study
 * decks, streams, games, Juku) reads window.BOOHA_MEDIA.audioRoot. To move the
 * audio to a different host, change AUDIO_ROOT here and nowhere else.
 * tests/audio-root-single-source.test.cjs enforces that.
 */
(function (root) {
  'use strict';
  const AUDIO_ROOT = 'https://pub-8d5941f302df44b899ce9d9a4606dcb7.r2.dev/audio-2027';
  root.BOOHA_MEDIA = Object.freeze({ audioRoot: AUDIO_ROOT });
})(typeof window !== 'undefined' ? window : globalThis);
