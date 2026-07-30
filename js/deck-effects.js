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
    br: { chrome: '#081a04' },
    pb: { chrome: '#16081f' },
    bc: { chrome: '#03080f' },
  };
  const themeConfig = THEME[theme] || THEME.br;

  const metaTheme = document.getElementById('meta-theme-color');
  if (metaTheme) metaTheme.setAttribute('content', themeConfig.chrome);

  const effectLayer = document.createElement('div');
  effectLayer.id = 'deck-effect-layer';
  effectLayer.setAttribute('aria-hidden', 'true');
  body.appendChild(effectLayer);

  const wave = document.createElement('div');
  wave.id = 'deck-flip-wave';
  wave.setAttribute('aria-hidden', 'true');
  effectLayer.appendChild(wave);

  function pulseClass(el, className, duration) {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    window.setTimeout(() => el.classList.remove(className), duration);
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
  };
})();
