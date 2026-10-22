/* ══════════════════════════════════════════════════════════════
   game-motion.js  —  One motion switch for all 9 curriculum games
   (Games Pass 2). Loaded in game.html's <head> so the attributes are
   set before any engine renders.

     <html data-motion="full|reduced">       prefers-reduced-motion
     <html data-power="full|reduced|minimal"> device + measured frames

   theme/game.css reads these two attributes, so every engine gets
   reduced motion and a low-power mode without per-engine code:
     data-motion="reduced"  → animations/transitions finish instantly
                              (animationend/transitionend still fire)
     data-power="reduced"   → infinite decorative loops stop after one
     data-power="minimal"     cycle; backdrop blur is turned off

   The device rule and frame thresholds match js/blitz-engine.js so the
   games and Blitz pick the same tier on the same iPad.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.BoohaMotion) return;

  var root = document.documentElement;
  var SETTLE_MS = 2000;     // let the engine mount and fonts settle
  var WINDOW_MS = 4500;     // then sample this long
  var listeners = [];

  var mq = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  var hardwareTier = (
    (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 2) ||
    (Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 2)
  ) ? 'reduced' : 'full';
  var runtimeTier = null;

  function motion() { return mq && mq.matches ? 'reduced' : 'full'; }

  function power() {
    var rank = { full: 0, reduced: 1, minimal: 2 };
    var r = runtimeTier || 'full';
    return rank[r] > rank[hardwareTier] ? r : hardwareTier;
  }

  function apply() {
    var m = motion(), p = power();
    var changed = root.getAttribute('data-motion') !== m || root.getAttribute('data-power') !== p;
    root.setAttribute('data-motion', m);
    root.setAttribute('data-power', p);
    if (changed) listeners.forEach(function (fn) { try { fn({ motion: m, power: p }); } catch (e) { console.error(e); } });
  }

  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  }

  /* Measure real frames once per page. A hidden tab restarts the window,
     so a backgrounded iPad is never mistaken for a slow one. Can only
     lower the tier, never raise it. */
  function sampleFrames() {
    if (hardwareTier === 'minimal' || typeof requestAnimationFrame !== 'function') return;
    var start = null, prev = 0, total = 0, frames = 0, slow = 0, raf = 0;
    var restart = function () { start = null; total = 0; frames = 0; slow = 0; };
    var onVis = function () { if (document.hidden) restart(); };
    document.addEventListener('visibilitychange', onVis);
    var step = function (now) {
      if (document.hidden) { raf = requestAnimationFrame(step); return; }
      if (start === null) { start = now; prev = now; raf = requestAnimationFrame(step); return; }
      var dt = now - prev;
      prev = now;
      if (dt < 1000) {          // ignore a stall from a tab switch mid-frame
        total += dt;
        frames++;
        if (dt >= 34) slow++;
      }
      if (now - start >= WINDOW_MS) {
        document.removeEventListener('visibilitychange', onVis);
        var avg = total / Math.max(1, frames), ratio = slow / Math.max(1, frames);
        runtimeTier = avg >= 30 && ratio >= 0.35 ? 'minimal'
          : avg >= 20 && ratio >= 0.18 ? 'reduced' : 'full';
        apply();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    setTimeout(function () { raf = requestAnimationFrame(step); }, SETTLE_MS);
  }

  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sampleFrames);
  else sampleFrames();

  window.BoohaMotion = {
    reduced: function () { return motion() === 'reduced'; },
    lowPower: function () { return power() !== 'full'; },
    motion: motion,
    power: power,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
  };
})();
