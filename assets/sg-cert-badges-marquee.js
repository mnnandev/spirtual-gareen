(function () {
  'use strict';

  /**
   * @param {HTMLElement | null} viewport
   */
  function getViewportWidth(viewport) {
    return Math.max(
      window.innerWidth || 0,
      document.documentElement.clientWidth || 0,
      viewport ? viewport.getBoundingClientRect().width : 0,
      viewport ? viewport.clientWidth : 0
    );
  }

  /**
   * @param {HTMLElement} group
   * @returns {HTMLElement[]}
   */
  function getOriginalItems(group) {
    return [...group.querySelectorAll('[data-cert-item]')].filter(
      (item) => !item.hasAttribute('data-cert-clone')
    );
  }

  /**
   * @param {HTMLElement} group
   * @param {HTMLElement[]} templates
   * @param {number} minWidth
   */
  function fillGroup(group, templates, minWidth) {
    if (!templates.length) return;

    group.innerHTML = '';

    const appendSet = () => {
      templates.forEach((template) => {
        const node = template.cloneNode(true);
        if (node.hasAttribute('data-cert-clone')) {
          node.removeAttribute('data-cert-clone');
        }
        node.setAttribute('data-cert-clone', '');
        node.setAttribute('aria-hidden', 'true');
        group.appendChild(node);
      });
    };

    appendSet();

    let loops = 0;
    while (group.scrollWidth < minWidth && loops < 32) {
      appendSet();
      loops += 1;
    }
  }

  /**
   * @param {HTMLElement} track
   */
  function buildCertMarqueeTrack(track) {
    const viewport = track.closest('.sg-cert-badges__viewport');
    if (!viewport) return;

    const groups = [...track.querySelectorAll('[data-cert-group]')];
    if (groups.length < 2) return;

    const primary = groups[0];
    const duplicate = groups[1];

    if (!track._sgMarqueeTemplates) {
      const originals = getOriginalItems(primary);
      if (!originals.length) return;
      track._sgMarqueeTemplates = originals.map((item) => item.cloneNode(true));
    }

    const minWidth = getViewportWidth(viewport) * 2;
    fillGroup(primary, track._sgMarqueeTemplates, minWidth);

    duplicate.innerHTML = primary.innerHTML;
    duplicate.querySelectorAll('[data-cert-item]').forEach((item) => {
      item.setAttribute('data-cert-clone', '');
      item.setAttribute('aria-hidden', 'true');
    });

    const loopWidth = primary.scrollWidth;
    track.style.setProperty('--marquee-loop-px', `${loopWidth}px`);
    track.dataset.sgMarqueeBuilt = 'true';
    track.classList.add('is-ready');
  }

  function initCertMarquees(root) {
    const scope = root || document;
    scope.querySelectorAll('.sg-cert-badges__track--marquee').forEach((track) => {
      if (track.dataset.sgMarqueeBuilt === 'true') return;
      buildCertMarqueeTrack(track);
    });
  }

  function resetCertMarquees(root) {
    const scope = root || document;
    scope.querySelectorAll('.sg-cert-badges__track--marquee').forEach((track) => {
      delete track.dataset.sgMarqueeBuilt;
      track.style.removeProperty('--marquee-loop-px');
      track.classList.remove('is-ready');
    });
    initCertMarquees(scope);
  }

  function scheduleInit(root) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initCertMarquees(root);
      });
    });
  }

  let resizeTimer;
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => resetCertMarquees(), 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleInit());
  } else {
    scheduleInit();
  }

  window.addEventListener('load', () => resetCertMarquees());
  window.addEventListener('resize', onResize);

  document.addEventListener('shopify:section:load', (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    resetCertMarquees(event.target);
  });
})();
