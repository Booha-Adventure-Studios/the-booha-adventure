/* ═══════════════════════════════════════════════════════════════
   bg-particles.js — One full-height particle family per curriculum

   br  → glowing jungle embers
   pb  → floating candy hearts
   bc  → luminous signal stars
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const THEMES = {
    br: {
      count: 74,
      colors: ['#aaff22','#66ff00','#ffaa00','#ffcc33','#44ffcc','#ffffff'],
      minR: .75,
      maxR: 3.2,
      minAlpha: .16,
      maxAlpha: .58,
      minVy: -.08,
      maxVy: -.25,
      vxRange: .34,
      draw(ctx, p) {
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4.2);
        halo.addColorStop(0, p.color + 'cc');
        halo.addColorStop(.42, p.color + '55');
        halo.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4.2, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.globalAlpha = p.alpha * .72;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      },
    },

    pb: {
      count: 38,
      colors: ['#ff6eb4','#ff88cc','#ffaacc','#cc88ff','#ff88ee','#ffb6df'],
      minR: 6,
      maxR: 13,
      minAlpha: .11,
      maxAlpha: .34,
      minVy: -.045,
      maxVy: -.13,
      vxRange: .20,
      wobble: true,
      draw(ctx, p) {
        const s = p.r;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(p.wobble) * .12);
        ctx.beginPath();
        ctx.moveTo(0, s * .30);
        ctx.bezierCurveTo(s * .50, -s * .42, s, s * .08, 0, s * .88);
        ctx.bezierCurveTo(-s, s * .08, -s * .50, -s * .42, 0, s * .30);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = s * .75;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(-s * .22, s * .06, Math.max(1, s * .08), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.82)';
        ctx.globalAlpha = p.alpha * .8;
        ctx.shadowBlur = 0;
        ctx.fill();
        ctx.restore();
      },
    },

    bc: {
      count: 66,
      colors: ['#00f0ff','#44ffff','#4090ff','#aa55ff','#ffffff','#88ccff'],
      minR: .8,
      maxR: 2.8,
      minAlpha: .16,
      maxAlpha: .62,
      minVy: -.055,
      maxVy: -.19,
      vxRange: .34,
      draw(ctx, p) {
        const len = p.r * 4.2;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p.x - len, p.y);
        ctx.lineTo(p.x + len, p.y);
        ctx.moveTo(p.x, p.y - len);
        ctx.lineTo(p.x, p.y + len);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(.6, p.r * .48);
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.r * 5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(.55, p.r * .58), 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.restore();
      },
    },
  };

  const parts = [];
  let theme = null;
  let config = null;

  function makePart(scatter) {
    const width = canvas.width || 400;
    const height = canvas.height || 700;
    const r = config.minR + Math.random() * (config.maxR - config.minR);
    const y = scatter ? Math.random() * height : height + r * 2;
    return {
      x: Math.random() * width,
      y,
      r,
      vx: (Math.random() - .5) * config.vxRange,
      vy: config.minVy + Math.random() * (config.maxVy - config.minVy),
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      alpha: config.minAlpha + Math.random() * (config.maxAlpha - config.minAlpha),
      life: scatter ? 1 - (y / height) : 0,
      wobble: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    theme = getCurriculum();
    config = THEMES[theme] || THEMES.br;
    parts.length = 0;
    for (let i = 0; i < config.count; i++) parts.push(makePart(true));
  }
  init();

  function tick() {
    const currentTheme = getCurriculum();
    if (currentTheme !== theme) init();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width || 400;
    const height = canvas.height || 700;

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (config.wobble) {
        p.wobble += .022;
        p.x += p.vx + Math.sin(p.wobble) * .16;
      } else {
        p.x += p.vx;
      }
      p.y += p.vy;
      p.life += Math.abs(p.vy) / (height + p.r * 4);

      if (p.x < -p.r * 3) p.x = width + p.r * 3;
      else if (p.x > width + p.r * 3) p.x = -p.r * 3;

      if (p.y < -p.r * 3) {
        parts[i] = makePart(false);
        continue;
      }

      const savedAlpha = p.alpha;
      p.alpha = savedAlpha * Math.sin(Math.min(1, p.life) * Math.PI);
      config.draw(ctx, p);
      p.alpha = savedAlpha;
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(tick);
  }

  tick();
})();
