/**
 * PEA Complex 1200 — sachet dissolve animation
 * Triggers once on scroll into view. CSS drives motion; JS only toggles state classes.
 */
(function () {
  const SELECTOR = '[data-sg-pea-dissolve]';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  function play(root) {
    if (root.dataset.played === 'true') return;
    root.dataset.played = 'true';
    root.classList.add('is-playing');

    // Timed class beats keep CSS keyframes in sync without rAF loops
    const steps = [
      { cls: 'is-sachet-in', at: 80 },
      { cls: 'is-sachet-open', at: 900 },
      { cls: 'is-powder-fall', at: 1400 },
      { cls: 'is-water-tint', at: 2200 },
      { cls: 'is-benefits-in', at: 2800 },
      { cls: 'is-complete', at: 3600 },
    ];

    steps.forEach(({ cls, at }) => {
      window.setTimeout(() => {
        if (!root.isConnected) return;
        root.classList.add(cls);
      }, at);
    });
  }

  function showFinal(root) {
    root.dataset.played = 'true';
    root.classList.add(
      'is-playing',
      'is-sachet-in',
      'is-sachet-open',
      'is-powder-fall',
      'is-water-tint',
      'is-benefits-in',
      'is-complete'
    );
  }

  function initRoot(root) {
    if (!(root instanceof HTMLElement) || root.dataset.init === 'true') return;
    root.dataset.init = 'true';

    if (root.hasAttribute('data-sg-pea-static') || REDUCED.matches) {
      showFinal(root);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      play(root);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          play(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.35, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(root);
  }

  function init(scope) {
    const root = scope || document;
    root.querySelectorAll(SELECTOR).forEach(initRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => {
    if (event.target) init(event.target);
  });
})();
