/* Shared runtime performance monitor for the four explorable worlds. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.BoohaPerformance = factory();
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const WINDOW_MS = 12000;
  const LOW_RENDER_INTERVAL_MS = 1000 / 30;

  function create(options = {}) {
    const lowPowerHint = options.lowPowerHint === true;
    const poorAverageFps = Number(options.poorAverageFps) || 40;
    const poorLongFrameMs = Number(options.poorLongFrameMs) || 100;
    let tier = lowPowerHint ? 'low' : 'high';
    let paused = true;
    let windowStart = 0;
    let lastSample = 0;
    let frameCount = 0;
    let windowWorstFrame = 0;
    let poorWindows = 0;
    let currentFps = 0;
    let averageFps = 0;
    let worstFrame = 0;
    let lastRenderedAt = 0;
    let overlay = null;
    let overlayTimer = 0;

    function reset(now = 0) {
      paused = true;
      windowStart = Number(now) || 0;
      lastSample = Number(now) || 0;
      frameCount = 0;
      windowWorstFrame = 0;
      currentFps = 0;
      lastRenderedAt = 0;
    }

    function pause() {
      reset();
    }

    function sample(now) {
      const timestamp = Number(now) || 0;
      if (paused) {
        paused = false;
        windowStart = timestamp;
        lastSample = timestamp;
        frameCount = 0;
        windowWorstFrame = 0;
        return false;
      }
      const elapsed = Math.max(0, timestamp - lastSample);
      lastSample = timestamp;
      if (elapsed <= 0 || elapsed > 1000) return false;
      frameCount += 1;
      windowWorstFrame = Math.max(windowWorstFrame, elapsed);
      worstFrame = Math.max(worstFrame, elapsed);
      const windowElapsed = timestamp - windowStart;
      currentFps = frameCount / Math.max(elapsed, windowElapsed || elapsed) * 1000;
      if (windowElapsed < WINDOW_MS) return false;

      averageFps = frameCount / windowElapsed * 1000;
      const poor = averageFps < poorAverageFps || windowWorstFrame >= poorLongFrameMs;
      poorWindows = poor ? poorWindows + 1 : 0;
      if (tier === 'high' && poorWindows >= 2) {
        tier = 'low';
        if (typeof options.onTierChange === 'function') options.onTierChange(tier, metrics());
      }
      windowStart = timestamp;
      frameCount = 0;
      windowWorstFrame = 0;
      return poor;
    }

    function shouldRender(now) {
      if (tier !== 'low') return true;
      const timestamp = Number(now) || 0;
      if (!lastRenderedAt || timestamp - lastRenderedAt >= LOW_RENDER_INTERVAL_MS - 0.5) {
        lastRenderedAt = timestamp;
        return true;
      }
      return false;
    }

    function metrics(extra = {}) {
      return {
        tier,
        currentFps,
        averageFps,
        worstFrame,
        poorWindows,
        ...extra,
      };
    }

    function enableOverlay(getMetrics) {
      if (typeof document === 'undefined') return;
      let enabled = false;
      try { enabled = new URLSearchParams(window.location.search).get('perf') === '1'; } catch (_) {}
      if (!enabled || overlay) return;
      overlay = document.createElement('pre');
      overlay.id = `booha-perf-${options.name || 'world'}`;
      overlay.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:10000;margin:0;padding:8px 10px;max-width:min(360px,calc(100vw - 20px));background:rgba(0,0,0,.82);border:1px solid rgba(143,227,192,.35);border-radius:7px;color:#d8ffe9;font:11px/1.45 ui-monospace,monospace;white-space:pre-wrap;pointer-events:none;';
      document.body.appendChild(overlay);
      const refresh = () => {
        if (!overlay) return;
        let extra = {};
        try { extra = typeof getMetrics === 'function' ? (getMetrics() || {}) : {}; } catch (_) {}
        const m = metrics(extra);
        const lines = [
          `${options.name || 'world'}  ${m.tier || tier}  ${Number(m.currentFps || 0).toFixed(0)} fps`,
          `avg ${Number(m.averageFps || 0).toFixed(0)}  worst ${Number(m.worstFrame || 0).toFixed(0)}ms  dpr ${m.dpr ?? '—'}`,
          `room imgs ${m.loadedRoomImageCount ?? '—'}  chars ${m.loadedCharacterImageCount ?? '—'}`,
          `decoded ${formatBytes(m.decodedImageMemoryBytes)}  wanderer ${formatBytes(m.wandererCacheUsageBytes)}/${formatBytes(m.wandererCacheBudgetBytes)}${m.wandererCacheOverBudget ? ' OVER' : ''}`,
          `protected ${formatBytes(m.wandererProtectedBytes)}`,
          `room decode ${m.roomLoadDecodeMs ?? '—'}ms  audio ${m.activeAudioBufferCount ?? '—'}`,
          `sw ${m.serviceWorkerCacheVersion || '—'}`,
        ];
        overlay.textContent = lines.join('\n');
      };
      refresh();
      overlayTimer = window.setInterval(refresh, 500);
    }

    function disposeOverlay() {
      if (overlayTimer) window.clearInterval(overlayTimer);
      overlayTimer = 0;
      if (overlay) overlay.remove();
      overlay = null;
    }

    return {
      sample,
      pause,
      reset,
      shouldRender,
      enableOverlay,
      disposeOverlay,
      isLow: () => tier === 'low',
      getTier: () => tier,
      metrics,
      constants: { windowMs: WINDOW_MS, lowRenderIntervalMs: LOW_RENDER_INTERVAL_MS },
    };
  }

  function formatBytes(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MiB`;
    return `${Math.round(bytes / 1024)} KiB`;
  }

  return { create, formatBytes, WINDOW_MS, LOW_RENDER_INTERVAL_MS };
}));
