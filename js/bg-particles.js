
/* ═══════════════════════════════════════════════════════════════
   bg-particles.js  —  Animated background particle system
   Reads window.BG_COLORS if set, otherwise uses a default palette.
   Called automatically after study-deck.html sets up the config.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLORS = window.BG_COLORS || [
    '#30d050','#4df070','#20a8f0','#60d8ff',
    '#f0aa00','#ffe060','#28c890','#b0f040',
    '#ff9040','#e8e080'
  ];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const PARTS = [];
  function makePart(scatter) {
    return {
      x:     Math.random() * (canvas.width  || 400),
      y:     scatter ? Math.random() * (canvas.height || 700) : (canvas.height || 700) + 10,
      r:     .7 + Math.random() * 2,
      vx:    (Math.random() - .5) * .2,
      vy:    -.06 - Math.random() * .16,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: .08 + Math.random() * .22,
      life:  scatter ? Math.random() : 0,
    };
  }
  for (let i = 0; i < 55; i++) PARTS.push(makePart(true));

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < PARTS.length; i++) {
      const p = PARTS[i];
      p.x += p.vx; p.y += p.vy; p.life += .0032;
      if (p.y < -10 || p.life > 1) { PARTS[i] = makePart(false); continue; }
      const a = p.alpha * Math.sin(p.life * Math.PI);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  tick();
})();
