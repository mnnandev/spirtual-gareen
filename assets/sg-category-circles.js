/**
 * Category circles — horizontal drag-scroll on mobile.
 * Circle tiles are plain <a> links; desktop subcategory panels use CSS hover/focus.
 */
(function () {
  const MOBILE_QUERY = window.matchMedia('(max-width: 768px)');
  const DRAG_THRESHOLD = 6;

  const initDragScroll = (slider) => {
    const state = { dragMoved: false };
    let isPointerDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let activePointerId = null;

    const endDrag = () => {
      if (!isPointerDown) return;
      const pointerId = activePointerId;
      isPointerDown = false;
      activePointerId = null;
      slider.classList.remove('is-dragging');
      try {
        if (pointerId != null && slider.hasPointerCapture?.(pointerId)) {
          slider.releasePointerCapture(pointerId);
        }
      } catch (_) {}
      window.setTimeout(() => {
        state.dragMoved = false;
      }, 100);
    };

    slider.addEventListener('pointerdown', (event) => {
      if (!MOBILE_QUERY.matches) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      isPointerDown = true;
      state.dragMoved = false;
      startX = event.clientX;
      startScrollLeft = slider.scrollLeft;
      activePointerId = event.pointerId;
      // Do not setPointerCapture here — capturing on the slider steals the
      // subsequent click from the circle <a> and blocks navigation on tap.
    });

    slider.addEventListener('pointermove', (event) => {
      if (!isPointerDown || event.pointerId !== activePointerId) return;
      const deltaX = event.clientX - startX;
      if (Math.abs(deltaX) < DRAG_THRESHOLD) return;

      if (!state.dragMoved) {
        state.dragMoved = true;
        slider.classList.add('is-dragging');
        try {
          slider.setPointerCapture(event.pointerId);
        } catch (_) {}
      }

      event.preventDefault();
      slider.scrollLeft = startScrollLeft - deltaX;
    });

    slider.addEventListener('pointerup', endDrag);
    slider.addEventListener('pointercancel', endDrag);
    slider.addEventListener(
      'click',
      (event) => {
        if (!state.dragMoved) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );
  };

  const initCategoryCircles = (root) => {
    if (!root || root.dataset.categoryCirclesInit === 'true') return;
    root.dataset.categoryCirclesInit = 'true';

    const slider = root.querySelector('[data-category-circles-slider]');
    if (slider instanceof HTMLElement) initDragScroll(slider);
  };

  const boot = () => {
    document.querySelectorAll('.category-circles').forEach(initCategoryCircles);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', (event) => {
    const section =
      event.target.querySelector?.('.category-circles') ||
      (event.target.classList?.contains('category-circles') ? event.target : null);
    if (section) {
      section.dataset.categoryCirclesInit = 'false';
      initCategoryCircles(section);
    }
  });
})();
