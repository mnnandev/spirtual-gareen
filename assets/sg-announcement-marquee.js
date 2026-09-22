/**
 * Match Pietro Zanetti Home mobile topbar marquee velocity.
 * Zanetti uses react-fast-marquee with default speed = 20px/s
 * (duration = contentWidth / speed). We apply the same formula,
 * then never go faster than 40s for readability.
 */
(function () {
  const MIN_DURATION_S = 40;
  const DEFAULT_PX_PER_S = 20;

  function apply(root) {
    const track = root.querySelector('.announcement-bar__marquee-track');
    const content = root.querySelector('.announcement-bar__marquee-content');
    if (!track || !content) return;

    const speed = Number(root.dataset.sgMarqueeSpeedPx || DEFAULT_PX_PER_S) || DEFAULT_PX_PER_S;
    const width = content.getBoundingClientRect().width;
    if (!width) return;

    // Slightly slower than Zanetti (18px/s) while staying near their feel
    const pxPerSec = Math.min(speed, 18);
    const duration = Math.max(width / pxPerSec, MIN_DURATION_S);
    root.style.setProperty('--sg-marquee-duration', `${duration.toFixed(1)}s`);
  }

  function init(scope) {
    (scope || document).querySelectorAll('.sg-announcement-marquee').forEach(apply);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  window.addEventListener(
    'resize',
    (() => {
      let t;
      return () => {
        window.clearTimeout(t);
        t = window.setTimeout(() => init(), 150);
      };
    })()
  );

  document.addEventListener('shopify:section:load', (event) => {
    if (event.target) init(event.target);
  });
})();
