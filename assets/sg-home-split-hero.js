/**
 * Homepage split hero — side card carousel + Instagram click-to-play embed.
 */
(function () {
  const ROOT = '[data-sg-split-hero]';

  function parseInstagramEmbed(url) {
    if (!url) return null;
    const match = String(url).match(
      /instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/i
    );
    if (!match) return null;
    const kind = /\/reel\//i.test(url) ? 'reel' : /\/tv\//i.test(url) ? 'tv' : 'p';
    return `https://www.instagram.com/${kind}/${match[1]}/embed/`;
  }

  function initCarousel(root) {
    const track = root.querySelector('[data-sg-split-track]');
    const slides = root.querySelectorAll('[data-sg-split-slide]');
    const prev = root.querySelector('[data-sg-split-prev]');
    const next = root.querySelector('[data-sg-split-next]');
    const dots = root.querySelectorAll('[data-sg-split-dot]');
    if (!track || slides.length < 2) return;

    let index = 0;
    const autoplayMs = Number(root.dataset.autoplay || 0);
    let timer = null;

    const go = (i) => {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
      slides.forEach((slide, n) => {
        slide.classList.toggle('is-active', n === index);
        slide.setAttribute('aria-hidden', n === index ? 'false' : 'true');
      });
      dots.forEach((dot, n) => {
        dot.classList.toggle('is-active', n === index);
        dot.setAttribute('aria-current', n === index ? 'true' : 'false');
      });
    };

    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    const start = () => {
      stop();
      if (autoplayMs > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = window.setInterval(() => go(index + 1), autoplayMs);
      }
    };

    prev?.addEventListener('click', () => {
      go(index - 1);
      start();
    });
    next?.addEventListener('click', () => {
      go(index + 1);
      start();
    });
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        go(Number(dot.dataset.index || 0));
        start();
      });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    go(0);
    start();
  }

  function initInstagram(root) {
    root.querySelectorAll('[data-sg-ig-slide]').forEach((slide) => {
      const trigger = slide.querySelector('[data-sg-ig-play]');
      const frameHost = slide.querySelector('[data-sg-ig-frame]');
      const url = slide.dataset.instagramUrl || '';
      const embed = parseInstagramEmbed(url);
      if (!trigger || !frameHost) return;
      if (!embed && !url) return;

      const activate = () => {
        if (!embed) {
          if (url) window.open(url, '_blank', 'noopener');
          return;
        }
        if (slide.dataset.igLoaded === 'true') return;
        slide.dataset.igLoaded = 'true';
        slide.classList.add('is-playing');
        const iframe = document.createElement('iframe');
        iframe.src = `${embed}?utm_source=ig_embed`;
        iframe.title = 'Instagram';
        iframe.loading = 'lazy';
        iframe.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';
        iframe.setAttribute('allowfullscreen', '');
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        frameHost.replaceChildren(iframe);
      };

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        activate();
      });
    });
  }

  function init(scope) {
    (scope || document).querySelectorAll(ROOT).forEach((root) => {
      if (root.dataset.init === 'true') return;
      root.dataset.init = 'true';
      initCarousel(root);
      initInstagram(root);
    });
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
