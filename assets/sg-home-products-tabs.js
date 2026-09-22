/**
 * Homepage product tabs — tab switching + desktop carousel / mobile vertical grid.
 */
function initSgHomeProducts(root = document) {
  const sections = root.querySelectorAll('.sg-home-products');
  const mobileMq = window.matchMedia('(max-width: 768px)');

  sections.forEach((section) => {
    if (section.dataset.homeProductsInit === 'true') return;
    section.dataset.homeProductsInit = 'true';

    const tabs = section.querySelectorAll('[data-home-products-tab]');
    const panels = section.querySelectorAll('[data-home-products-panel]');
    const viewAllLink = section.querySelector('[data-home-products-view-all]');
    const tabIndicator = section.querySelector('[data-home-products-indicator]');
    const tabList = section.querySelector('.sg-home-products__tabs');
    const carouselState = new WeakMap();

    const isMobileLayout = () => mobileMq.matches;

    const updateTabIndicator = (activeTab) => {
      if (!(tabIndicator instanceof HTMLElement) || !(activeTab instanceof HTMLElement)) return;
      tabIndicator.style.width = `${activeTab.offsetWidth}px`;
      tabIndicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    };

    const animatePanelCards = (panel) => {
      panel.querySelectorAll('[data-home-product-slide]').forEach((card, index) => {
        if (!(card instanceof HTMLElement)) return;
        card.classList.remove('is-animated');
        card.style.animationDelay = `${index * 0.07}s`;
        void card.offsetWidth;
        card.classList.add('is-animated');
      });
    };

    const initCarousel = (panel) => {
      if (!(panel instanceof HTMLElement)) return;
      if (panel.dataset.carouselInit === 'true') return;

      const carousel = panel.querySelector('[data-home-products-carousel]');
      if (!carousel) return;

      const track = carousel.querySelector('[data-home-products-track]');
      const viewport = carousel.querySelector('[data-home-products-viewport]');
      const dotsWrap = panel.querySelector('[data-home-products-dots]');
      const slides = track ? Array.from(track.querySelectorAll('[data-home-products-page]')) : [];

      if (!track || !viewport || !dotsWrap || slides.length < 1) return;

      panel.dataset.carouselInit = 'true';

      let activeIndex = 0;
      let currentOffset = 0;
      let isPointerDown = false;
      let isDragging = false;
      let dragStartX = 0;
      let dragStartOffset = 0;
      let dragMoved = false;
      const dragThreshold = 8;
      let listenersBound = false;

      const getSlideStep = () => Math.max(viewport.clientWidth, 1);

      const getMaxIndex = () => Math.max(0, slides.length - 1);

      const getMaxOffset = () => getMaxIndex() * getSlideStep();

      const renderDots = () => {
        dotsWrap.innerHTML = '';
        if (isMobileLayout()) return;

        const dotCount = getMaxIndex() + 1;
        for (let i = 0; i < dotCount; i += 1) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = `sg-home-products__dot${i === activeIndex ? ' is-active' : ''}`;
          dot.setAttribute('data-home-products-dot', String(i));
          dot.setAttribute('aria-label', `Prodotto ${i + 1}`);
          dot.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
          dot.addEventListener('click', () => setSlide(i));
          dotsWrap.appendChild(dot);
        }
      };

      const updateDots = () => {
        if (isMobileLayout()) return;
        dotsWrap.querySelectorAll('[data-home-products-dot]').forEach((dot) => {
          const index = Number(dot.getAttribute('data-home-products-dot') || 0);
          const isActive = index === activeIndex;
          dot.classList.toggle('is-active', isActive);
          dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      };

      const setSlide = (slideIndex, animate = true) => {
        if (isMobileLayout()) {
          track.classList.remove('is-dragging');
          track.style.transform = '';
          currentOffset = 0;
          activeIndex = 0;
          return;
        }

        activeIndex = Math.max(0, Math.min(getMaxIndex(), slideIndex));
        currentOffset = activeIndex * getSlideStep();
        track.classList.toggle('is-dragging', !animate);
        track.style.transform = `translate3d(-${currentOffset}px, 0, 0)`;
        updateDots();
      };

      const applyDragOffset = (offset) => {
        currentOffset = Math.max(0, Math.min(getMaxOffset(), offset));
        track.style.transform = `translate3d(-${currentOffset}px, 0, 0)`;
        activeIndex = Math.round(currentOffset / getSlideStep());
        activeIndex = Math.max(0, Math.min(getMaxIndex(), activeIndex));
        updateDots();
      };

      const onPointerDown = (event) => {
        if (isMobileLayout()) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        isPointerDown = true;
        isDragging = false;
        dragMoved = false;
        dragStartX = event.clientX;
        dragStartOffset = currentOffset;
      };

      const onPointerMove = (event) => {
        if (isMobileLayout() || !isPointerDown) return;

        const delta = dragStartX - event.clientX;
        if (!isDragging && Math.abs(delta) < dragThreshold) return;

        if (!isDragging) {
          isDragging = true;
          viewport.classList.add('is-dragging');
          track.classList.add('is-dragging');
          viewport.setPointerCapture(event.pointerId);
        }

        dragMoved = true;
        applyDragOffset(dragStartOffset + delta);
      };

      const onPointerEnd = (event) => {
        if (isMobileLayout() || !isPointerDown) {
          isPointerDown = false;
          isDragging = false;
          return;
        }
        isPointerDown = false;

        if (isDragging) {
          viewport.classList.remove('is-dragging');
          track.classList.remove('is-dragging');

          const delta = dragStartX - event.clientX;
          const threshold = getSlideStep() * 0.18;
          let nextIndex = activeIndex;

          if (delta > threshold) {
            nextIndex = activeIndex + 1;
          } else if (delta < -threshold) {
            nextIndex = activeIndex - 1;
          }

          setSlide(nextIndex, true);

          if (viewport.hasPointerCapture(event.pointerId)) {
            viewport.releasePointerCapture(event.pointerId);
          }
        }

        isDragging = false;
      };

      const onClickCapture = (event) => {
        if (isMobileLayout() || !dragMoved) return;
        event.preventDefault();
        event.stopPropagation();
        dragMoved = false;
      };

      const bindDesktopListeners = () => {
        if (listenersBound) return;
        viewport.addEventListener('pointerdown', onPointerDown);
        viewport.addEventListener('pointermove', onPointerMove);
        viewport.addEventListener('pointerup', onPointerEnd);
        viewport.addEventListener('pointercancel', onPointerEnd);
        viewport.addEventListener('click', onClickCapture, true);
        listenersBound = true;
      };

      const unbindDesktopListeners = () => {
        if (!listenersBound) return;
        viewport.removeEventListener('pointerdown', onPointerDown);
        viewport.removeEventListener('pointermove', onPointerMove);
        viewport.removeEventListener('pointerup', onPointerEnd);
        viewport.removeEventListener('pointercancel', onPointerEnd);
        viewport.removeEventListener('click', onClickCapture, true);
        listenersBound = false;
        viewport.classList.remove('is-dragging');
        track.classList.remove('is-dragging');
        isPointerDown = false;
        isDragging = false;
        dragMoved = false;
      };

      const applyLayoutMode = () => {
        if (isMobileLayout()) {
          unbindDesktopListeners();
          track.style.transform = '';
          track.classList.remove('is-dragging');
          viewport.classList.remove('is-dragging');
          dotsWrap.innerHTML = '';
          currentOffset = 0;
          activeIndex = 0;
        } else {
          bindDesktopListeners();
          renderDots();
          setSlide(Math.min(activeIndex, getMaxIndex()), false);
        }
      };

      const onResize = () => {
        applyLayoutMode();
        if (!isMobileLayout()) {
          renderDots();
          setSlide(Math.min(activeIndex, getMaxIndex()));
        }
      };

      window.addEventListener('resize', onResize);

      applyLayoutMode();

      carouselState.set(panel, {
        setSlide,
        onResize,
        applyLayoutMode,
      });
    };

    const refreshActivePanel = (tabKey) => {
      const activePanel = section.querySelector(`[data-home-products-panel="${tabKey}"]`);
      if (!(activePanel instanceof HTMLElement)) return;

      requestAnimationFrame(() => {
        let state = carouselState.get(activePanel);
        if (!state) {
          initCarousel(activePanel);
          state = carouselState.get(activePanel);
        }
        if (state) {
          state.onResize();
          if (!isMobileLayout()) {
            state.setSlide(0);
          }
        }
        animatePanelCards(activePanel);
      });
    };

    const activateTab = (tabKey) => {
      if (!tabKey) return;

      let activeTab = null;

      tabs.forEach((tab) => {
        const isActive = tab.getAttribute('data-home-products-tab') === tabKey;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) activeTab = tab;
      });

      updateTabIndicator(activeTab);

      panels.forEach((panel) => {
        const isActive = panel.getAttribute('data-home-products-panel') === tabKey;
        panel.classList.toggle('is-active', isActive);
        if (isActive) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }
      });

      const activePanel = section.querySelector(`[data-home-products-panel="${tabKey}"]`);
      if (activePanel && viewAllLink) {
        const href = activePanel.getAttribute('data-view-all');
        if (href) viewAllLink.setAttribute('href', href);
      }

      refreshActivePanel(tabKey);
    };

    if (tabList) {
      tabList.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-home-products-tab]');
        if (!tab || !section.contains(tab)) return;
        event.preventDefault();
        activateTab(tab.getAttribute('data-home-products-tab'));
      });
    }

    const initialActiveTab = section.querySelector('[data-home-products-tab].is-active');
    const initialTabKey = initialActiveTab?.getAttribute('data-home-products-tab') || 'new';
    activateTab(initialTabKey);
    updateTabIndicator(initialActiveTab);

    window.addEventListener('resize', () => {
      const currentTab = section.querySelector('[data-home-products-tab].is-active');
      updateTabIndicator(currentTab);
    });
  });
}

function bootSgHomeProducts() {
  initSgHomeProducts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSgHomeProducts, { once: true });
} else {
  bootSgHomeProducts();
}

document.addEventListener('shopify:section:load', (event) => {
  if (event.target instanceof HTMLElement) {
    initSgHomeProducts(event.target);
  }
});
