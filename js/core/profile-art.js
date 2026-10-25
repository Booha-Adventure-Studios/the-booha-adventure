/**
 * profile-art.js
 * The Booha Adventure — one shared URL for profile art (medals, trophy
 * tokens, rank coins, chests) in assets/img/profile/.
 *
 * Art is replaced in place under the same filenames, and an installed iPad
 * can keep serving an old copy for a given URL from any of several caches
 * (service worker, HTTP, in-memory). Every URL therefore carries ART_REV:
 * a new value is a new URL that no old cache can answer.
 *
 * WHEN YOU REPLACE ANY ART IN assets/img/profile/, CHANGE ART_REV (a date is fine).
 */
(function (root) {
  'use strict';

  const ART_REV = '2026-10-24';
  const DIR = 'assets/img/profile/';

  /** url('medal-warm-up.webp') → 'assets/img/profile/medal-warm-up.webp?v=2026-10-24'
   *  base: optional prefix for pages resolving art from another folder. */
  function url(file, base) {
    const name = String(file || '');
    return `${base || ''}${DIR}${name}${name.indexOf('?') >= 0 ? '&' : '?'}v=${ART_REV}`;
  }

  root.BoohaProfileArt = Object.freeze({ REV: ART_REV, DIR, url });
})(typeof window !== 'undefined' ? window : globalThis);
