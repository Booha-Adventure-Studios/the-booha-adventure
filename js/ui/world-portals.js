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
    document.addEventListener('booha:devWorldsChanged', update);
  }

  /* ── Portal sounds (Audio Pass 5) ─────────────────────────────────
     An open portal gets a rising shimmer-whoosh, and the page waits a beat
     so the sound isn't cut off by the navigation. A locked portal gets a
     soft bonk. Both use the shared js/booha-sfx.js context; with no running
     context the link simply works as before. */
  function audio() {
    var S = window.BoohaSFX;
    var c = S && typeof S.context === 'function' ? S.context() : null;
    return c && c.state === 'running' ? c : null;
  }
  function note(c, out, f, t, len, peak, type, toF) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (toF) o.frequency.exponentialRampToValueAtTime(toF, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.03);
  }
  // Cooldown: a smashed locked portal bonks at most every BONK_COOLDOWN_MS,
  // and once an open portal is leaving, further taps make no sound.
  var BONK_COOLDOWN_MS = 140;
  var bonkAt = 0, leaving = false;
  function whoosh() {
    var c = audio();
    if (!c) return false;
    try {
      var t = c.currentTime + 0.01, out = c.createGain();
      out.gain.value = 0.7;
      out.connect(c.destination);
      // Airy sweep: filtered noise rising through a band-pass.
      var n = Math.floor(c.sampleRate * 0.45), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(3200, t + 0.4);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      src.connect(bp); bp.connect(g); g.connect(out); src.start(t);
      // Shimmer climbing on top.
      [1046.5, 1318.5, 1568, 2093].forEach(function (f, k) { note(c, out, f, t + 0.08 + k * 0.05, 0.3, 0.07); });
      setTimeout(function () { try { out.disconnect(); } catch (_) {} }, 900);
      return true;
    } catch (_) { return false; }
  }
  function bonk() {
    var now = Date.now();
    if (now - bonkAt < BONK_COOLDOWN_MS) return;
    bonkAt = now;
    var c = audio();
    if (!c) return;
    try {
      var t = c.currentTime + 0.01;
      note(c, c.destination, 330, t, 0.14, 0.12, 'triangle');
      note(c, c.destination, 294, t + 0.11, 0.22, 0.1, 'triangle');
    } catch (_) {}
  }
  if (document.addEventListener) {
    document.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('a[id^="pnet-"]') : null;
      if (!link) return;
      if (link.classList.contains('is-locked')) { bonk(); return; }
      var href = link.getAttribute('href');
      if (!href || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (leaving) { e.preventDefault(); return; }
      if (!whoosh()) return;
      e.preventDefault();
      leaving = true;
      setTimeout(function () { window.location.href = href; }, 280);
    });
  }

  return { setLocked: setLocked, watch: watch };
})();
