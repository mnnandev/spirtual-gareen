/**
 * Spiritual Green — header helpers
 * Keeps announcement + header pinned at the top (fixed, always visible).
 * Avoids MutationObserver ↔ overflow-list feedback loops that can freeze the page.
 */
(function () {
  const DESKTOP_MQ = '(min-width: 750px)';

  function getHeader() {
    return document.querySelector('#header-component');
  }

  function getHeaderGroup() {
    return document.querySelector('#header-group');
  }

  function isDesktopHeader() {
    return window.matchMedia(DESKTOP_MQ).matches;
  }

  function measureOffset(headerGroup) {
    if (!headerGroup) return 0;
    return Math.round(headerGroup.getBoundingClientRect().height) || 0;
  }

  function applyBodyOffset(headerGroup) {
    const height = measureOffset(headerGroup);
    const offset = height > 0 ? height : 120;
    document.documentElement.style.setProperty('--sg-header-offset', `${offset}px`);
    document.body.style.paddingTop = `${offset}px`;
    document.body.classList.add('sg-header-fixed-active');
  }

  function syncOverflowList(header) {
    const overflowList = header?.querySelector('overflow-list.overflow-menu');
    if (!overflowList) return;

    if (!isDesktopHeader()) {
      if (overflowList.hasAttribute('disabled')) {
        overflowList.removeAttribute('disabled');
      }
      return;
    }

    // Already expanded — do not touch attributes again (avoids observer/reflow loops).
    if (overflowList.hasAttribute('disabled')) return;

    try {
      if (typeof overflowList.showAll === 'function') {
        overflowList.showAll();
      } else {
        overflowList.setAttribute('disabled', 'true');
      }
    } catch (_) {
      // overflow-list may not be upgraded yet
    }
  }

  function forceDesktopMenuStyle(header) {
    if (!header || !isDesktopHeader()) return;
    if (header.dataset.menuStyle !== 'menu') {
      header.dataset.menuStyle = 'menu';
    }
    syncOverflowList(header);
  }

  function clearLegacyAutoHideState(header, headerGroup) {
    if (!header || !headerGroup) return;
    header.classList.remove('sg-header-stuck', 'sg-header-auto-hidden');
    headerGroup.classList.remove(
      'sg-header-is-hidden',
      'sg-header-is-revealing'
    );
    headerGroup.classList.add('sg-header-is-fixed', 'sg-header-is-visible');
    header.classList.add('sg-header-stuck');
    header.dataset.stickyState = 'active';
  }

  function init() {
    const header = getHeader();
    const headerGroup = getHeaderGroup();
    if (!header || !headerGroup) return;

    clearLegacyAutoHideState(header, headerGroup);
    applyBodyOffset(headerGroup);
    syncOverflowList(header);
    forceDesktopMenuStyle(header);

    let resizeTimer = null;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        applyBodyOffset(headerGroup);
        syncOverflowList(header);
        forceDesktopMenuStyle(header);
      }, 100);
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('load', () => {
      applyBodyOffset(headerGroup);
      syncOverflowList(header);
    });

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => applyBodyOffset(headerGroup), 50);
      });
      ro.observe(headerGroup);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
