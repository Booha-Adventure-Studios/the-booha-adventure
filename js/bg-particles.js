
/* ═══════════════════════════════════════════════════════════════
   bg-particles.js  v2  —  Animated background particles
   Three vivid styles driven by data-curriculum on <html>:

   br  (Jungle)   — electric fireflies + rising sparks + trail streaks
   pb  (Candy)    — soft bubbles + floating hearts + sparkle glints
   bc  (Signal)   — cold data-packets + scanlines + cross sparks
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function getCurriculum() {
    return document.documentElement.dataset.curriculum ||
           document.body.getAttribute('data-theme') || 'br';
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ══════════════════════════════════════════════════════════════
     THEME CONFIGS
     ══════════════════════════════════════════════════════════════ */
  const THEMES = {

    /* ── BOOR-RICULUM JUNGLE: electric fireflies + streaks ── */
    br: {
      count:    80,
      colors:   ['#aaff22','#66ff00','#0088ff','#ffaa00','#ff2288','#ccff44','#22aaff','#ffcc00','#44ffcc','#ff44aa'],
      minR:     0.7,
      maxR:     3.4,
      minAlpha: 0.2,
      maxAlpha: 0.65,
      minVy:    -0.08,
      maxVy:    -0.30,
      vxRange:  0.42,
      lifeInc:  0.003,
      makeExtra(canvas) {
        /* streaks — fast horizontal dashes */
        return Array.from({length: 12}, () => ({
          _streak: true,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          w: 18 + Math.random() * 38,
          vy: -0.06 - Math.random() * 0.12,
          vx: (Math.random() - 0.5) * 0.5,
          alpha: 0.08 + Math.random() * 0.14,
          color: ['#aaff22','#22ddff','#ff2288','#ffcc00'][Math.floor(Math.random()*4)],
          life: Math.random(),
          lifeInc: 0.002,
        }));
      },
      drawExtra(ctx, p, canvas) {
        const fade = Math.sin(p.life * Math.PI);
        ctx.save();
        ctx.globalAlpha = p.alpha * fade;
        const grd = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y);
        grd.addColorStop(0, 'transparent');
        grd.addColorStop(0.4, p.color);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(p.x, p.y, p.w, 1.2);
        ctx.restore();
        p.x  += p.vx; p.y  += p.vy; p.life += p.lifeInc;
        if (p.life > 1 || p.y < -10) {
          p.y = canvas.height + 10; p.x = Math.random() * canvas.width; p.life = 0;
        }
      },
      draw(ctx, p) {
        /* outer glow halo */
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.2);
        grd.addColorStop(0,   p.color + 'bb');
        grd.addColorStop(0.5, p.color + '44');
        grd.addColorStop(1,   'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.globalAlpha = p.alpha * 0.55;
        ctx.fill();
        /* bright core */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        /* color ring */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.r * 0.4;
        ctx.globalAlpha = p.alpha * 0.5;
        ctx.stroke();
      }
    },

    /* ── PRE-BOO CANDY: bubbles + hearts + sparkles ── */
    pb: {
      count:    55,
      colors:   ['#ff88cc','#cc88ff','#ffb088','#88ffcc','#ffee66','#ff6eb4','#dd99ff','#aaffee','#ffaadd','#bbaaff'],
      minR:     2.0,
      maxR:     7.0,
      minAlpha: 0.13,
      maxAlpha: 0.44,
      minVy:    -0.04,
      maxVy:    -0.11,
      vxRange:  0.20,
      lifeInc:  0.0020,
      makeExtra(canvas) {
        /* hearts */
        return Array.from({length: 10}, () => ({
          _heart: true,
          x: Math.random() * canvas.width,
          y: canvas.height + 20,
          size: 8 + Math.random() * 14,
          vy: -0.05 - Math.random() * 0.08,
          vx: (Math.random() - 0.5) * 0.22,
          alpha: 0.15 + Math.random() * 0.25,
          color: ['#ff6eb4','#cc88ff','#ffaacc','#ff88ee'][Math.floor(Math.random()*4)],
          life: Math.random(),
          lifeInc: 0.0015,
          wobble: Math.random() * Math.PI * 2,
        }));
      },
      drawExtra(ctx, p, canvas) {
        if (p.y < -30) { p.y = canvas.height + 20; p.x = Math.random() * canvas.width; p.life = 0; }
        p.wobble += 0.025;
        p.x += p.vx + Math.sin(p.wobble) * 0.3;
        p.y += p.vy;
        p.life += p.lifeInc;
        if (p.life > 1) { p.y = canvas.height + 20; p.x = Math.random() * canvas.width; p.life = 0; }

        const fade = Math.sin(p.life * Math.PI);
        const s = p.size;
        ctx.save();
        ctx.globalAlpha = p.alpha * fade;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        ctx.moveTo(0, s * 0.3);
        ctx.bezierCurveTo(s * 0.5, -s * 0.4,  s, s * 0.1,  0,  s * 0.85);
        ctx.bezierCurveTo(-s, s * 0.1, -s * 0.5, -s * 0.4, 0, s * 0.3);
        ctx.fill();
        ctx.restore();
      },
      draw(ctx, p) {
        /* soft bubble with shimmer */
        const grd = ctx.createRadialGradient(
          p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.05,
          p.x, p.y, p.r
        );
        grd.addColorStop(0,   'rgba(255,255,255,0.6)');
        grd.addColorStop(0.45, p.color + 'aa');
        grd.addColorStop(1,   p.color + '22');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        /* rim */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth   = 0.8;
        ctx.globalAlpha = p.alpha * 0.55;
        ctx.stroke();
        /* highlight */
        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle   = 'rgba(255,255,255,0.92)';
        ctx.globalAlpha = p.alpha * 0.75;
        ctx.fill();
        /* extra sparkle ring on large bubbles */
        if (p.r > 5) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 1.4, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth   = 0.4;
          ctx.globalAlpha = p.alpha * 0.18;
          ctx.stroke();
        }
      }
    },

    /* ── BOO-CONTINUUM SIGNAL: data packets + scanlines + sharp sparks ── */
    bc: {
      count:    75,
      colors:   ['#00f0ff','#0066ff','#aa00ff','#ffffff','#4090ff','#80ffff','#6644ff','#00ccff','#33bbff','#dd00ff'],
      minR:     0.5,
      maxR:     2.4,
      minAlpha: 0.18,
      maxAlpha: 0.72,
      minVy:    -0.05,
      maxVy:    -0.20,
      vxRange:  0.62,
      lifeInc:  0.0038,
      makeExtra(canvas) {
        /* horizontal scanlines drifting down slowly */
        return Array.from({length: 8}, () => ({
          _scan: true,
          y: Math.random() * canvas.height,
          vy: 0.18 + Math.random() * 0.28,
          alpha: 0.025 + Math.random() * 0.04,
          color: ['#00f0ff','#4455ff'][Math.floor(Math.random()*2)],
        }));
      },
      drawExtra(ctx, p, canvas) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(0, p.y, canvas.width, 1);
        ctx.restore();
        p.y += p.vy;
        if (p.y > canvas.height) p.y = -2;
      },
      draw(ctx, p) {
        if (p.r > 1.5) {
          /* cross spark */
          const len = p.r * 3.5;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p.x - len, p.y); ctx.lineTo(p.x + len, p.y);
          ctx.moveTo(p.x, p.y - len * 0.6); ctx.lineTo(p.x, p.y + len * 0.6);
          ctx.strokeStyle = p.color;
          ctx.lineWidth   = p.r * 0.55;
          ctx.globalAlpha = p.alpha;
          ctx.stroke();
          /* diamond at center */
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.r); ctx.lineTo(p.x + p.r, p.y);
          ctx.lineTo(p.x, p.y + p.r); ctx.lineTo(p.x - p.r, p.y);
          ctx.closePath();
          ctx.fillStyle   = '#ffffff';
          ctx.globalAlpha = p.alpha * 0.9;
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle   = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        }
        /* cold glow */
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        grd.addColorStop(0,   p.color + '55');
        grd.addColorStop(1,   'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fillStyle   = grd;
        ctx.globalAlpha = p.alpha * 0.28;
        ctx.fill();
      }
    }
  };

  /* ══════════════════════════════════════════════════════════════
     PARTICLE FACTORY
     ══════════════════════════════════════════════════════════════ */
  const PARTS  = [];
  const EXTRAS = [];
  let theme = null;
  let cfg   = null;

  function makePart(scatter) {
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
    theme = getCurriculum();
    cfg   = THEMES[theme] || THEMES.br;
    PARTS.length  = 0;
    EXTRAS.length = 0;
    for (let i = 0; i < cfg.count; i++) PARTS.push(makePart(true));
    if (cfg.makeExtra) {
      const ex = cfg.makeExtra(canvas);
      ex.forEach(e => EXTRAS.push(e));
    }
  }

  init();

  /* ══════════════════════════════════════════════════════════════
     ANIMATION LOOP
     ══════════════════════════════════════════════════════════════ */
  function tick() {
    const currentTheme = getCurriculum();
    if (currentTheme !== theme) init();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* extras first (behind main particles) */
    for (let i = 0; i < EXTRAS.length; i++) {
      cfg.drawExtra && cfg.drawExtra(ctx, EXTRAS[i], canvas);
      ctx.globalAlpha = 1;
    }

    /* main particles */
    for (let i = 0; i < PARTS.length; i++) {
      const p = PARTS[i];
      p.x    += p.vx;
      p.y    += p.vy;
      p.life += cfg.lifeInc;

      if (p.y < -p.r * 5 || p.life > 1) {
        PARTS[i] = makePart(false);
        continue;
      }

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
