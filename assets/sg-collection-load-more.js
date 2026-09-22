import { sectionRenderer } from '@theme/section-renderer';

/**
 * Load the next collection page into the grid when "Show more" is clicked.
 */
class SgCollectionLoadMore extends HTMLElement {
  /** @type {HTMLButtonElement | null} */
  #button = null;

  /** @type {HTMLElement | null} */
  #resultsList = null;

  connectedCallback() {
    this.#button = this.querySelector('[data-sg-load-more]');
    this.#resultsList = document.querySelector('results-list#collection-products') ?? document.querySelector('results-list');

    if (!this.#button || !this.#resultsList) return;

    this.#button.addEventListener('click', this.#onClick);
    this.#syncVisibility();
  }

  disconnectedCallback() {
    this.#button?.removeEventListener('click', this.#onClick);
  }

  #onClick = async () => {
    const grid = this.#resultsList?.querySelector('[ref="grid"]');
    const button = this.#button;

    if (!grid || !button || button.disabled) return;

    const nextPage = this.#getNextPageNumber();
    const lastPage = Number(grid.dataset.lastPage || 1);

    if (!nextPage || nextPage > lastPage) {
      this.#hide();
      return;
    }

    const label = button.textContent?.trim() || 'Show more';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');

    const url = new URL(window.location.href);
    url.searchParams.set('page', String(nextPage));
    url.hash = '';

    try {
      const sectionId = this.#resultsList.getAttribute('section-id');
      if (!sectionId) return;

      const html = await sectionRenderer.getSectionHTML(sectionId, true, url);
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const newItems = parsed.querySelector('[ref="grid"]')?.querySelectorAll(':scope > [ref="cards[]"]');

      if (newItems?.length) {
        grid.append(...newItems);
        history.pushState('', '', url.toString());
      }
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = label;
      this.#syncVisibility();
    }
  };

  /** @returns {number | null} */
  #getNextPageNumber() {
    const cards = this.#resultsList?.querySelectorAll('[ref="cards[]"]');
    if (!cards?.length) return 1;

    const lastCard = cards[cards.length - 1];
    const currentPage = Number(lastCard?.dataset.page || 1);

    return currentPage + 1;
  }

  #syncVisibility() {
    const grid = this.#resultsList?.querySelector('[ref="grid"]');
    const cards = this.#resultsList?.querySelectorAll('[ref="cards[]"]');
    const currentPage = Number(cards?.[cards.length - 1]?.dataset.page || 1);
    const lastPage = Number(grid?.dataset.lastPage || 1);

    if (currentPage >= lastPage) {
      this.#hide();
    } else {
      this.hidden = false;
    }
  }

  #hide() {
    this.hidden = true;
  }
}

if (!customElements.get('sg-collection-load-more')) {
  customElements.define('sg-collection-load-more', SgCollectionLoadMore);
}
