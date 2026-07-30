/* ═══════════════════════════════════════════════════════════════
   deck-effects.js — Shared atmosphere and interaction layer
   Keeps decorative motion separate from the learning engines.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const body = document.body;
  const root = document.documentElement;
  const theme = body.dataset.theme || 'br';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const THEME = {
    br: {
      chrome: '#081a04',
      title: 'Jungle Complete!',
      jp: 'ジャングルデッキ クリア！',
      symbol: '✦',
    },
    pb: {
      chrome: '#16081f',
      title: 'Sweet Work!',
      jp: 'キャンディデッキ クリア！',
      symbol: '♥',
    },
    bc: {
      chrome: '#03080f',
      title: 'Signal Complete!',
      jp: 'シグナルデッキ クリア！',
      symbol: '◇',
    },
  };
  const themeConfig = THEME[theme] || THEME.br;

  const metaTheme = document.getElementById('meta-theme-color');
  if (metaTheme) metaTheme.setAttribute('content', themeConfig.chrome);

  const ambient = document.createElement('div');
  ambient.id = 'ambient-world';
  ambient.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', (3 + Math.random() * 94).toFixed(1) + '%');
    piece.style.setProperty('--size', (12 + Math.random() * 34).toFixed(0) + 'px');
    piece.style.setProperty('--delay', (-Math.random() * 18).toFixed(2) + 's');
    piece.style.setProperty('--dur', (13 + Math.random() * 13).toFixed(2) + 's');
    piece.style.setProperty('--drift', ((Math.random() - 0.5) * 90).toFixed(0) + 'px');
    ambient.appendChild(piece);
  }
  body.prepend(ambient);

  const effectLayer = document.createElement('div');
  effectLayer.id = 'deck-effect-layer';
  effectLayer.setAttribute('aria-hidden', 'true');
  body.appendChild(effectLayer);

  const wave = document.createElement('div');
  wave.id = 'deck-flip-wave';
  wave.setAttribute('aria-hidden', 'true');
  effectLayer.appendChild(wave);

  const celebration = document.createElement('div');
  celebration.id = 'deck-celebration';
  celebration.setAttribute('role', 'status');
  celebration.setAttribute('aria-live', 'polite');
  celebration.innerHTML =
    '<div class="celebration-halo"></div>' +
    '<div class="celebration-symbol">' + themeConfig.symbol + '</div>' +
    '<div class="celebration-title">' + themeConfig.title + '</div>' +
    '<div class="celebration-jp">' + themeConfig.jp + '</div>' +
    '<div class="celebration-sub">You explored every card.</div>';
  body.appendChild(celebration);

  let celebrationTimer = null;

  function pulseClass(el, className, duration) {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    window.setTimeout(() => el.classList.remove(className), duration);
  }

  function burst(count, wide) {
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('b');
      particle.className = 'world-burst';
      const angle = Math.random() * Math.PI * 2;
      const distance = (wide ? 120 : 55) + Math.random() * (wide ? 300 : 110);
      particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
      particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
      particle.style.setProperty('--size', (4 + Math.random() * (wide ? 12 : 8)) + 'px');
      particle.style.setProperty('--delay', (Math.random() * 0.18) + 's');
      particle.style.setProperty('--spin', ((Math.random() - 0.5) * 520) + 'deg');
      effectLayer.appendChild(particle);
      window.setTimeout(() => particle.remove(), 1800);
    }
  }

  function cardCenter() {
    const card = document.querySelector('.card-scene, .card-face.single');
    if (!card) return { x: innerWidth / 2, y: innerHeight / 2 };
    const rect = card.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function setProgress(current, total) {
    const progress = total ? Math.max(0, Math.min(1, current / total)) : 0;
    root.style.setProperty('--deck-progress', progress.toFixed(3));
    root.style.setProperty('--world-opacity', (0.20 + progress * 0.30).toFixed(3));
    root.style.setProperty('--world-saturation', (1 + progress * 0.22).toFixed(3));
    root.style.setProperty('--world-brightness', (1 + progress * 0.10).toFixed(3));
    body.dataset.progress = progress >= 1 ? 'complete' : progress >= 0.66 ? 'high' : progress >= 0.33 ? 'mid' : 'low';
  }

  function cardArrive() {
    const target = document.querySelector(
      body.dataset.type === 'stream' ? '.card-face.single' : '.card-scene'
    );
    pulseClass(target, 'card-arrive', 650);
  }

  function flip(isFlipped) {
    const scene = document.getElementById('card-scene');
    if (scene) scene.classList.toggle('reveal-jp', Boolean(isFlipped));
    if (!isFlipped || reducedMotion) return;
    const center = cardCenter();
    wave.style.setProperty('--wave-x', center.x + 'px');
    wave.style.setProperty('--wave-y', center.y + 'px');
    pulseClass(wave, 'show', 850);
  }

  function setAudio(active) {
    body.classList.toggle('deck-audio-active', Boolean(active));
  }

  function milestone() {
    const center = cardCenter();
    effectLayer.style.setProperty('--burst-x', center.x + 'px');
    effectLayer.style.setProperty('--burst-y', center.y + 'px');
    burst(28, false);
    pulseClass(body, 'deck-milestone', 900);
  }

  function celebrate() {
    if (celebrationTimer) window.clearTimeout(celebrationTimer);
    effectLayer.style.setProperty('--burst-x', '50vw');
    effectLayer.style.setProperty('--burst-y', '48vh');
    celebration.classList.add('show');
    body.classList.add('deck-complete');
    burst(70, true);
    celebrationTimer = window.setTimeout(hideCelebration, 3600);
  }

  function hideCelebration() {
    celebration.classList.remove('show');
    body.classList.remove('deck-complete');
  }

  celebration.addEventListener('click', hideCelebration);

  function installTilt() {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    const target = document.querySelector(
      body.dataset.type === 'stream' ? '.card-face.single' : '.card-scene'
    );
    const area = target && target.closest('.card-area');
    if (!area || !target) return;
    target.classList.add('fx-tilt-target');

    area.addEventListener('pointermove', (event) => {
      const rect = area.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      target.style.setProperty('--tilt-x', ((0.5 - py) * 5).toFixed(2) + 'deg');
      target.style.setProperty('--tilt-y', ((px - 0.5) * 6).toFixed(2) + 'deg');
      target.style.setProperty('--glare-x', (px * 100).toFixed(1) + '%');
      target.style.setProperty('--glare-y', (py * 100).toFixed(1) + '%');
    });

    area.addEventListener('pointerleave', () => {
      target.style.setProperty('--tilt-x', '0deg');
      target.style.setProperty('--tilt-y', '0deg');
      target.style.setProperty('--glare-x', '50%');
      target.style.setProperty('--glare-y', '20%');
    });
  }

  installTilt();

  window.DeckEffects = {
    setProgress,
    cardArrive,
    flip,
    setAudio,
    milestone,
    celebrate,
  };
})();
