
/* ═══════════════════════════════════════════════════════════════
   bg-particles.js  —  Animated background particles
   Three distinct styles driven by data-theme on <body>:

   br  (Jungle)  — rising fireflies, varied sizes, fast, electric colors
   pb  (Candy)   — slow drifting bubbles with soft pastel shimmer, heart shapes
   bc  (Signal)  — cold cyan sparks, sharp, fast horizontal drift
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* detect curriculum from body data-theme */
  function getTheme() {
    return document.body.getAttribute('data-theme') || 'br';
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── THEME CONFIGS ── */
  const THEMES = {

    /* JUNGLE EXPEDITION — fireflies, electric, fast, big variance in size */
    br: {
      count:    65,
      colors:   ['#aaff22','#66ff00','#0088ff','#ffaa00','#ff2288','#ccff44','#22aaff','#ffcc00'],
      minR:     0.8,
      maxR:     3.2,
      minAlpha: 0.18,
      maxAlpha: 0.60,
      minVy:    -0.10,
      maxVy:    -0.28,
      vxRange:  0.35,
      lifeInc:  0.0035,
      draw(ctx, p) {
        /* firefly: bright core with halo */
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5);
        grd.addColorStop(0,   p.color);
        grd.addColorStop(0.4, p.color);
        grd.addColorStop(1,   'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.globalAlpha = p.alpha * 0.5;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
    },

    /* CANDY DREAM — slow floating bubbles, soft pastels, gentle shimmer */
    pb: {
      count:    50,
      colors:   ['#ff88cc','#cc88ff','#ffb088','#88ffcc','#ffee66','#ff6eb4','#dd99ff','#aaffee'],
      minR:     2.5,
      maxR:     6.0,
      minAlpha: 0.14,
      maxAlpha: 0.42,
      minVy:    -0.04,
      maxVy:    -0.10,
      vxRange:  0.18,
      lifeInc:  0.0022,
      draw(ctx, p) {
        /* soft bubble with outline shimmer */
        const grd = ctx.createRadialGradient(p.x - p.r*0.3, p.y - p.r*0.3, p.r*0.1, p.x, p.y, p.r);
        grd.addColorStop(0,   'rgba(255,255,255,0.55)');
        grd.addColorStop(0.5, p.color + '88');
        grd.addColorStop(1,   p.color + '22');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        /* bubble rim */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth   = 0.7;
        ctx.globalAlpha = p.alpha * 0.6;
        ctx.stroke();
        /* tiny sparkle highlight */
        ctx.beginPath();
        ctx.arc(p.x - p.r*0.32, p.y - p.r*0.32, p.r*0.18, 0, Math.PI*2);
        ctx.fillStyle   = 'rgba(255,255,255,0.9)';
        ctx.globalAlpha = p.alpha * 0.7;
        ctx.fill();
      }
    },

    /* MIDNIGHT SIGNAL — cold sharp sparks, fast, directional */
    bc: {
      count:    70,
      colors:   ['#00f0ff','#0055ff','#aa00ff','#ffffff','#4090ff','#80ffff','#6644ff','#00ccff'],
      minR:     0.6,
      maxR:     2.2,
      minAlpha: 0.18,
      maxAlpha: 0.70,
      minVy:    -0.06,
      maxVy:    -0.18,
      vxRange:  0.55,  /* more horizontal drift — feels like data packets */
      lifeInc:  0.004,
      draw(ctx, p) {
        /* sharp signal spark — diamond/cross shape for some, dot for others */
        if (p.r > 1.5) {
          /* cross spark */
          const len = p.r * 3;
          ctx.beginPath();
          ctx.moveTo(p.x - len, p.y);
          ctx.lineTo(p.x + len, p.y);
          ctx.moveTo(p.x, p.y - len * 0.5);
          ctx.lineTo(p.x, p.y + len * 0.5);
          ctx.strokeStyle = p.color;
          ctx.lineWidth   = p.r * 0.5;
          ctx.globalAlpha = p.alpha;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle   = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        }
        /* cold glow */
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grd.addColorStop(0,   p.color + '44');
        grd.addColorStop(1,   'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fillStyle   = grd;
        ctx.globalAlpha = p.alpha * 0.3;
        ctx.fill();
      }
    }
  };

  const PARTS = [];
  let theme = null;
  let cfg   = null;

  function makePart(scatter) {
    cfg = cfg || THEMES[getTheme()] || THEMES.br;
    const r = cfg.minR + Math.random() * (cfg.maxR - cfg.minR);
    return {
      x:     Math.random() * (canvas.width  || 400),
      y:     scatter ? Math.random() * (canvas.height || 700) : (canvas.height || 700) + r * 2,
      r,
      vx:    (Math.random() - 0.5) * cfg.vxRange,
      vy:    cfg.minVy - Math.random() * (cfg.maxVy - cfg.minVy),
      color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
      alpha: cfg.minAlpha + Math.random() * (cfg.maxAlpha - cfg.minAlpha),
      life:  scatter ? Math.random() : 0,
    };
  }

  function init() {
    theme = getTheme();
    cfg   = THEMES[theme] || THEMES.br;
    PARTS.length = 0;
    for (let i = 0; i < cfg.count; i++) PARTS.push(makePart(true));
  }

  init();

  function tick() {
    /* re-init if theme changed (shouldn't happen mid-session but just in case) */
    const currentTheme = getTheme();
    if (currentTheme !== theme) init();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < PARTS.length; i++) {
      const p = PARTS[i];
      p.x    += p.vx;
      p.y    += p.vy;
      p.life += cfg.lifeInc;

      if (p.y < -p.r * 4 || p.life > 1) {
        PARTS[i] = makePart(false);
        continue;
      }

      /* fade in/out with sine over life */
      const savedAlpha = p.alpha;
      p.alpha = savedAlpha * Math.sin(p.life * Math.PI);

      cfg.draw(ctx, p);
      ctx.globalAlpha = 1;

      p.alpha = savedAlpha;
    }

    requestAnimationFrame(tick);
  }

  tick();
})();
