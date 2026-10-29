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

  function checkpointSparkColors(season, week, baseColors, phase = null) {
    const fallback = Array.isArray(baseColors) ? baseColors : [];
    const sparkWeeks = season?.checkpointSparkWeeks || [];
    const glow = season?.glow;
    if (!glow || !sparkWeeks.includes(Number(week))) return fallback;
    if (Array.isArray(phase?.checkpointSparkColors) && phase.checkpointSparkColors.length) {
      return phase.checkpointSparkColors;
    }
    return Array.isArray(season?.checkpointSparkColors) && season.checkpointSparkColors.length
      ? season.checkpointSparkColors
      : [glow.orange, glow.purple, glow.lime];
  }

  // Maze snowfall is deliberately lighter than the first screen: a few slow
  // dots, none at all on the low tier or with reduced motion.
  const MAZE_SNOW_MIN = 16;
  const MAZE_SNOW_MAX = 42;
  function mazeSnowCount({ width = 0, height = 0, performanceTier = 'high', reducedMotion = false, enabled = false } = {}) {
    if (!enabled || reducedMotion || performanceTier === 'low') return 0;
    const area = Math.max(0, Number(width) || 0) * Math.max(0, Number(height) || 0);
    if (!area) return 0;
    return Math.max(MAZE_SNOW_MIN, Math.min(MAZE_SNOW_MAX, Math.round(area / 30000)));
  }

  function makeSnowflake(width, height, random = Math.random, fromTop = false) {
    return {
      x: random() * width,
      y: fromTop ? -6 - random() * 40 : random() * height,
      r: .8 + random() * 1.6,
      speed: 9 + random() * 14,
      drift: 6 + random() * 10,
      phase: random() * Math.PI * 2,
      alpha: .28 + random() * .4,
    };
  }

  function stepSnowfall(flakes, dtSeconds, width, height, random = Math.random) {
    const dt = Math.min(.1, Math.max(0, Number(dtSeconds) || 0));
    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      f.phase += dt * .9;
      f.y += f.speed * dt;
      f.x += Math.sin(f.phase) * f.drift * dt;
      if (f.y > height + 6 || f.x < -12 || f.x > width + 12) flakes[i] = makeSnowflake(width, height, random, true);
    }
    return flakes;
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
    MAZE_SNOW_MIN,
    MAZE_SNOW_MAX,
    mazeSnowCount,
    makeSnowflake,
    stepSnowfall,
    createBatGlowCache,
  };
});
