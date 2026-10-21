/**
 * world-portals.js
 * The Booha Adventure — shared lock state for the world portals on the
 * Adventure Log and Adventure profile headers.
 *
 * Every world stays visible. A locked world shows a dark silhouette and a
 * padlock, says "LOCKED", and cannot be followed until its gate opens; a
 * visible locked door tells students there is somewhere new to reach.
 * Each page keeps its own small gate script and calls setLocked().
 */
window.BoohaPortals = (function () {
  'use strict';

  function setLocked(link, locked) {
    if (!link) return;
    link.hidden = false;
    if (!link.dataset.href && link.getAttribute('href')) link.dataset.href = link.getAttribute('href');
    var small = link.querySelector('.pn-label small');
    if (small && !small.dataset.en) small.dataset.en = small.textContent;
    link.classList.toggle('is-locked', !!locked);
    if (locked) {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('role', 'link');
      if (small) small.textContent = 'LOCKED';
      var label = link.getAttribute('data-label') || '';
      link.setAttribute('aria-label', label + ' (locked)');
    } else {
      if (link.dataset.href) link.setAttribute('href', link.dataset.href);
      link.removeAttribute('aria-disabled');
      link.removeAttribute('role');
      if (small && small.dataset.en) small.textContent = small.dataset.en;
      if (link.getAttribute('data-label')) link.setAttribute('aria-label', link.getAttribute('data-label'));
    }
  }

  // Keep one portal in step with its gate: check(), a function returning
  // true when the world is open, is re-read whenever the save or week changes.
  function watch(id, check) {
    var link = document.getElementById(id);
    if (!link) return;
    function update() {
      var open = false;
      try { open = !!check(); } catch (_) {}
      setLocked(link, !open);
    }
    if (window.BOOHA_READY) update();
    else document.addEventListener('booha:ready', update, { once: true });
    document.addEventListener('booha:saved', update);
    document.addEventListener('booha:weeklyReset', update);
    document.addEventListener('booha:newWeek', update);
  }

  return { setLocked: setLocked, watch: watch };
})();
