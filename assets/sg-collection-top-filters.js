/**
 * Collection top filters — category scroll and subcategory panels.
 */
class SgCollectionTopFilters extends HTMLElement {
  /** @type {HTMLElement | null} */
  #stage = null;

  /** @type {HTMLElement | null} */
  #track = null;

  /** @type {HTMLButtonElement | null} */
  #prevBtn = null;

  /** @type {HTMLButtonElement | null} */
  #nextBtn = null;

  /** @type {ResizeObserver | null} */
  #resizeObserver = null;

  connectedCallback() {
    this.#stage = this.querySelector('[data-sg-cats-stage]');
    this.#track = this.querySelector('[data-sg-cats-track]');
    this.#prevBtn = this.querySelector('[data-sg-cats-prev]');
    this.#nextBtn = this.querySelector('[data-sg-cats-next]');

    this.#relocatePanels();
    this.#bindEvents();
    this.#scheduleLayout();

    if (this.#stage) {
      this.#resizeObserver = new ResizeObserver(() => this.#updateScrollButtons());
      this.#resizeObserver.observe(this.#stage);
      if (this.#track) this.#resizeObserver.observe(this.#track);
    }

    window.addEventListener('resize', this.#onResize);
    document.fonts?.ready?.then(() => this.#scheduleLayout());
  }

  disconnectedCallback() {
    this.#resizeObserver?.disconnect();
    window.removeEventListener('resize', this.#onResize);
  }

  #bindEvents() {
    this.addEventListener('click', this.#onClick);
    document.addEventListener('click', this.#onDocumentClick);

    this.#stage?.addEventListener('scroll', this.#onStageScroll, { passive: true });
    this.#prevBtn?.addEventListener('click', this.#onPrevClick);
    this.#nextBtn?.addEventListener('click', this.#onNextClick);
  }

  #scheduleLayout() {
    this.#updateScrollButtons();
    this.#scrollActiveCategoryIntoView();

    requestAnimationFrame(() => {
      this.#updateScrollButtons();
      this.#scrollActiveCategoryIntoView();
      requestAnimationFrame(() => this.#updateScrollButtons());
    });

    window.setTimeout(() => this.#updateScrollButtons(), 120);
    window.setTimeout(() => this.#updateScrollButtons(), 400);
  }

  #onResize = () => {
    this.#closeAllPanels();
    this.#updateScrollButtons();
  };

  #onStageScroll = () => {
    this.#closeAllPanels();
    this.#updateScrollButtons();
  };

  #onPrevClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.#scrollStage(-1);
  };

  #onNextClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.#scrollStage(1);
  };

  /**
   * @param {number} direction
   */
  #scrollStage(direction) {
    const stage = this.#stage;
    const track = this.#track;
    if (!stage || !track) return;

    const items = [...track.querySelectorAll('[data-sg-cat-item]')].filter(
      (item) => item instanceof HTMLElement
    );
    if (!items.length) return;

    const stageRect = stage.getBoundingClientRect();
    const edgeInset = 8;

    if (direction > 0) {
      const target = items.find((item) => item.getBoundingClientRect().right > stageRect.right + 2);
      if (!target) return;

      const targetRect = target.getBoundingClientRect();
      stage.scrollTo({
        left: stage.scrollLeft + (targetRect.left - stageRect.left) - edgeInset,
        behavior: 'smooth',
      });
      return;
    }

    const target = [...items].reverse().find((item) => item.getBoundingClientRect().left < stageRect.left - 2);
    if (!target) return;

    const targetRect = target.getBoundingClientRect();
    stage.scrollTo({
      left: stage.scrollLeft - (stageRect.left - targetRect.left) - edgeInset,
      behavior: 'smooth',
    });
  }

  #hasOverflow() {
    const stage = this.#stage;
    const track = this.#track;
    if (!stage || !track) return false;

    return track.scrollWidth > stage.clientWidth + 1;
  }

  #updateScrollButtons() {
    const stage = this.#stage;
    const prevBtn = this.#prevBtn;
    const nextBtn = this.#nextBtn;
    if (!stage || !prevBtn || !nextBtn) return;

    const maxScroll = Math.max(stage.scrollWidth - stage.clientWidth, 0);
    const hasOverflow = this.#hasOverflow();

    this.classList.toggle('has-scroll', hasOverflow);

    if (!hasOverflow) {
      prevBtn.hidden = true;
      nextBtn.hidden = true;
      this.classList.remove('has-scroll-prev', 'has-scroll-next');
      return;
    }

    const atStart = stage.scrollLeft <= 1;
    const atEnd = stage.scrollLeft >= maxScroll - 1;

    prevBtn.hidden = atStart;
    nextBtn.hidden = atEnd;

    this.classList.toggle('has-scroll-prev', !atStart);
    this.classList.toggle('has-scroll-next', !atEnd);
  }

  #relocatePanels() {
    const viewport = this.querySelector('[data-sg-cats-viewport]');
    if (!viewport) return;

    let panelsRoot = viewport.querySelector('[data-sg-cats-panels]');
    if (!panelsRoot) {
      panelsRoot = document.createElement('div');
      panelsRoot.className = 'sg-top-filters__cats-panels';
      panelsRoot.setAttribute('data-sg-cats-panels', '');
      viewport.appendChild(panelsRoot);
    }

    this.querySelectorAll('[data-sg-cat-panel]').forEach((panel) => {
      if (panel.parentElement !== panelsRoot) {
        panelsRoot.appendChild(panel);
      }
    });
  }

  /**
   * @param {HTMLElement} toggle
   * @param {HTMLElement} panel
   */
  #positionPanel(toggle, panel) {
    const viewport = this.querySelector('[data-sg-cats-viewport]');
    if (!viewport) return;

    panel.style.visibility = 'hidden';
    panel.style.top = '0';
    panel.style.left = '0';

    const toggleRect = toggle.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;

    let left = toggleRect.left - viewportRect.left;
    const maxLeft = Math.max(0, viewportRect.width - panelWidth - 8);
    left = Math.min(Math.max(0, left), maxLeft);

    let top = toggleRect.bottom - viewportRect.top + 8;
    const maxTop = viewportRect.height - panelHeight;
    if (maxTop > 0 && top > maxTop) {
      top = Math.max(0, toggleRect.top - viewportRect.top - panelHeight - 8);
    }

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.visibility = '';
  }

  #scrollActiveCategoryIntoView() {
    const stage = this.#stage;
    if (!stage || !this.#hasOverflow()) return;

    const activeItem =
      stage.querySelector('.sg-top-filters__cat.is-active-parent') ||
      stage.querySelector('.sg-top-filters__cat-link.is-active')?.closest('[data-sg-cat-item]');

    if (!(activeItem instanceof HTMLElement)) return;

    const stageRect = stage.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const arrowSpace = 44;

    if (itemRect.left < stageRect.left + arrowSpace) {
      stage.scrollLeft -= stageRect.left + arrowSpace - itemRect.left;
    } else if (itemRect.right > stageRect.right - arrowSpace) {
      stage.scrollLeft += itemRect.right - (stageRect.right - arrowSpace);
    }

    this.#updateScrollButtons();
  }

  #onClick = (event) => {
    if (!(event.target instanceof Element)) return;

    if (event.target.closest('[data-sg-cats-prev], [data-sg-cats-next]')) {
      return;
    }

    const catToggle = event.target.closest('[data-sg-cat-toggle]');
    if (catToggle) {
      event.preventDefault();
      event.stopPropagation();
      this.#toggleCatPanel(catToggle);
      return;
    }

    const panelLink = event.target.closest('.sg-top-filters__panel-link');
    if (panelLink instanceof HTMLAnchorElement) {
      this.#closeAllPanels();
    }
  };

  #onDocumentClick = (event) => {
    if (!(event.target instanceof Element)) return;
    if (this.contains(event.target)) return;
    this.#closeAllPanels();
  };

  /**
   * @param {Element} toggle
   */
  #toggleCatPanel(toggle) {
    const cat = toggle.closest('[data-sg-cat-item]');
    const panelId = toggle.getAttribute('aria-controls');
    const panel = panelId ? this.querySelector(`#${CSS.escape(panelId)}`) : null;
    if (!cat || !(panel instanceof HTMLElement) || !(toggle instanceof HTMLElement)) return;

    const willOpen = panel.hasAttribute('hidden');

    this.#closeAllPanels();

    if (willOpen) {
      panel.removeAttribute('hidden');
      this.#positionPanel(toggle, panel);
      toggle.setAttribute('aria-expanded', 'true');
      cat.classList.add('is-panel-open');
    }
  }

  #closeAllPanels() {
    this.querySelectorAll('[data-sg-cat-panel]').forEach((panel) => {
      panel.setAttribute('hidden', '');
      if (panel instanceof HTMLElement) {
        panel.style.top = '';
        panel.style.left = '';
        panel.style.visibility = '';
      }
    });
    this.querySelectorAll('[data-sg-cat-toggle]').forEach((toggle) => {
      toggle.setAttribute('aria-expanded', 'false');
    });
    this.querySelectorAll('[data-sg-cat-item].is-panel-open').forEach((cat) => {
      cat.classList.remove('is-panel-open');
    });
  }
}

if (!customElements.get('sg-collection-top-filters')) {
  customElements.define('sg-collection-top-filters', SgCollectionTopFilters);
}
