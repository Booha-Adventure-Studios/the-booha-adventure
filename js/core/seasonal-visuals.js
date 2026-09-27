/* Shared seasonal Maze visual helpers. */
(function attachSeasonalVisuals(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BoohaSeasonalVisuals = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis, function createSeasonalVisuals() {
  'use strict';

  const EXTRA_VISITOR_RATE = 0.75;
  const LOW_TIER_VISITOR_CAP = 2;

  function extraVisitorCount(games, availableCount) {
    const safeGames = Number.isFinite(Number(games)) ? Math.max(0, Number(games)) : 0;
    const safeAvailable = Number.isFinite(Number(availableCount))
      ? Math.max(0, Math.floor(Number(availableCount)))
      : 0;
    return Math.min(safeAvailable, Math.floor(safeGames * EXTRA_VISITOR_RATE));
  }

  function seasonalVisitorCount({ games = 0, availableCount = 0, performanceTier = 'high', reducedMotion = false, forceAll = false } = {}) {
    if (reducedMotion) return 0;
    const normalCount = forceAll
      ? Math.max(0, Math.floor(Number(availableCount) || 0))
      : extraVisitorCount(games, availableCount);
    return performanceTier === 'low'
      ? Math.min(LOW_TIER_VISITOR_CAP, normalCount)
      : normalCount;
  }

  function activeSeasonalVisitor(visitor, completedCurriculum) {
    if (!visitor) return null;
    if (visitor.requires === 'blitz-triple' && !completedCurriculum) return null;
    return visitor;
  }

  function checkpointSparkColors(season, week, baseColors) {
    const fallback = Array.isArray(baseColors) ? baseColors : [];
    const sparkWeeks = season?.checkpointSparkWeeks || [];
    const glow = season?.glow;
    if (!glow || !sparkWeeks.includes(Number(week))) return fallback;
    return [glow.orange, glow.purple, glow.lime];
  }

  function createBatGlowCache({ createCanvas, getDevicePixelRatio } = {}) {
    if (typeof createCanvas !== 'function') throw new TypeError('createCanvas is required');
    const cache = new Map();

    function getGlowingBat(image, size, color) {
      if (!image) return null;
      const logicalSize = Math.max(8, Math.round(Number(size) / 4) * 4);
      const dprValue = typeof getDevicePixelRatio === 'function' ? getDevicePixelRatio() : 1;
      const dpr = Math.min(2, Math.max(1, Number(dprValue) || 1));
      const source = image._boohaSrc || image.currentSrc || image.src || '';
      const key = `${source}|${logicalSize}|${color}|${dpr}`;
      const cached = cache.get(key);
      if (cached) return cached;

      const pad = Math.ceil(logicalSize * 0.35);
      const outputSize = logicalSize + pad * 2;
      const canvas = createCanvas();
      canvas.width = Math.ceil(outputSize * dpr);
      canvas.height = Math.ceil(outputSize * dpr);
      const context = canvas.getContext('2d');
      if (!context) return null;
      if (typeof context.setTransform === 'function') context.setTransform(dpr, 0, 0, dpr, 0, 0);
      else context.scale(dpr, dpr);
      context.shadowColor = color;
      context.shadowBlur = pad * 0.8;
      context.drawImage(image, pad, pad, logicalSize, logicalSize);
      context.shadowBlur = 0;
      context.drawImage(image, pad, pad, logicalSize, logicalSize);
      canvas._boohaLogicalSize = outputSize;
      canvas._boohaGlowKey = key;
      cache.set(key, canvas);
      return canvas;
    }

    getGlowingBat.size = () => cache.size;
    getGlowingBat.clear = () => cache.clear();
    return getGlowingBat;
  }

  return {
    EXTRA_VISITOR_RATE,
    LOW_TIER_VISITOR_CAP,
    extraVisitorCount,
    seasonalVisitorCount,
    activeSeasonalVisitor,
    checkpointSparkColors,
    createBatGlowCache,
  };
});
