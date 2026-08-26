/**
 * Small inline SVG icon set shared by the profile pages.
 *
 * Icons inherit currentColor so each card can keep its own glow palette.
 */
(() => {
  'use strict';

  const PATHS = {
    star: '<path d="m12 3 2.7 5.45 6.02.88-4.36 4.25 1.03 6-5.39-2.83-5.39 2.83 1.03-6-4.36-4.25 6.02-.88L12 3Z"/>',
    check: '<path d="m5 12 4.1 4.1L19 6.2"/>',
    trophy: '<path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Zm4 8.5V17m-4 3h8M5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4"/>',
    gamepad: '<path d="M7.2 8h9.6a4 4 0 0 1 3.83 5.16l-1.2 4A2.5 2.5 0 0 1 17 19l-2.1-2H9.1L7 19a2.5 2.5 0 0 1-2.43-1.84l-1.2-4A4 4 0 0 1 7.2 8Z"/><path d="M8 11v4m-2-2h4m7-1h.01m-2 2h.01"/>',
    flame: '<path d="M13.3 3.5c.35 2.56-1.02 3.77-2.26 5.05-.86.9-1.55 1.7-1.55 3.02 0 1.15.8 2.08 1.9 2.08 1.48 0 2.35-1.5 2.04-3.28 2.14 1.27 3.38 3.08 3.38 5.1A4.82 4.82 0 0 1 12 20.3a5.09 5.09 0 0 1-5-5.08c0-2.8 1.53-4.8 3.2-6.4 1.23-1.18 2.45-2.4 3.1-5.32Z"/>',
    bolt: '<path d="m13.5 2-8 11h6l-1 9 8-11h-6l1-9Z"/>',
    medal: '<circle cx="12" cy="15" r="5.5"/><path d="m8.7 10.7-1.4-7.2L12 6l4.7-2.5-1.4 7.2M10 15l1.4 1.4L14 13.8"/>',
    ghost: '<path d="M6 20V9a6 6 0 0 1 12 0v11l-2.5-1.8L13 20l-2.5-1.8L8 20l-2-1.8L6 20Z"/><circle cx="9.5" cy="10" r=".7"/><circle cx="14.5" cy="10" r=".7"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2"/>',
    square: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    key: '<circle cx="8" cy="15" r="3"/><path d="m10.2 12.8 8.3-8.3m-3.2 3.2 2 2m-4.5-1.5 2 2"/>',
    clipboard: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5.5V4h6v1.5M9 10h6m-6 4h6m-6 4h3"/>',
    save: '<path d="M5 4h11l3 3v13H5V4Z"/><path d="M8 4v6h7V4M8 20v-6h8v6"/>',
    trash: '<path d="M5 7h14m-9-3h4l1 3H9l1-3Zm-3 3 1 12h8l1-12m-6 3v6m3-6v6"/>',
    arrowLeft: '<path d="M19 12H5m7-7-7 7 7 7"/>',
  };

  function svg(name, className = '') {
    const content = PATHS[name] || PATHS.star;
    const classes = ['profile-icon', className].filter(Boolean).join(' ');
    return `<svg class="${classes}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${content}</svg>`;
  }

  function mount(root = document) {
    root.querySelectorAll('[data-profile-icon]').forEach(node => {
      node.innerHTML = svg(node.dataset.profileIcon, node.dataset.profileIconClass || '');
    });
  }

  window.BoohaProfileIcons = Object.freeze({ svg, mount });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(), { once: true });
  else mount();
})();
