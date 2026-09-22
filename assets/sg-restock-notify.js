/**
 * Back-in-stock notify — always visible on PDPs.
 * Enabled only when the selected variant is out of stock; disabled when in stock.
 * Listens to theme variant:update events and syncs ATC sold-out host class.
 */
import { ThemeEvents } from '@theme/events';

class SgRestockNotify extends HTMLElement {
  /** @type {AbortController | null} */
  #abortController = null;

  connectedCallback() {
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    this.addEventListener('click', this.#onClick, { signal });
    this.addEventListener('submit', this.#onSubmit, { signal });

    const target =
      this.closest('.shopify-section') ||
      document.querySelector(`product-form-component[data-product-id="${this.dataset.productId}"]`) ||
      document;

    target.addEventListener(ThemeEvents.variantUpdate, this.#onVariantUpdate, { signal });

    this.#syncAvailability(this.dataset.available === 'true', this.dataset.variantId);
  }

  disconnectedCallback() {
    this.#abortController?.abort();
  }

  get #isAvailable() {
    return this.dataset.available === 'true';
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const openBtn = event.target instanceof Element ? event.target.closest('[data-sg-restock-open]') : null;
    if (!openBtn || !this.contains(openBtn)) return;

    if (this.#isAvailable || openBtn.hasAttribute('disabled') || openBtn.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const panel = this.querySelector('[data-sg-restock-panel]');
    if (!(panel instanceof HTMLElement)) return;

    const willOpen = panel.hasAttribute('hidden');
    panel.toggleAttribute('hidden', !willOpen);
    openBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');

    if (willOpen) {
      const input = panel.querySelector('input[type="email"]');
      if (input instanceof HTMLInputElement) input.focus();
    }
  };

  /** @param {SubmitEvent} event */
  #onSubmit = async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !this.contains(form)) return;

    if (this.#isAvailable) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    const successEl = this.querySelector('[data-sg-restock-success]');
    const errorEl = this.querySelector('[data-sg-restock-error]');
    const submitBtn = form.querySelector('[type="submit"]');

    successEl?.setAttribute('hidden', '');
    errorEl?.setAttribute('hidden', '');

    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = true;
    }

    try {
      const formData = new FormData(form);
      // Ensure Shopify treats this as a customer/contact signup.
      if (!formData.get('form_type')) formData.set('form_type', 'customer');

      const response = await fetch(form.action || `${window.Shopify?.routes?.root || '/'}contact`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      // Shopify may return HTML even on success; treat non-5xx as ok for UX.
      if (!response.ok && response.status >= 500) {
        throw new Error(`Restock notify failed: ${response.status}`);
      }

      successEl?.removeAttribute('hidden');
      form.reset();
    } catch (error) {
      console.error(error);
      errorEl?.removeAttribute('hidden');
    } finally {
      if (submitBtn instanceof HTMLButtonElement) {
        submitBtn.disabled = false;
      }
    }
  };

  /**
   * @param {CustomEvent} event
   */
  #onVariantUpdate = (event) => {
    const productId = String(this.dataset.productId || '');
    const eventProductId = String(event.detail?.data?.productId || event.detail?.data?.newProduct?.id || '');
    if (eventProductId && productId && eventProductId !== productId) return;

    const resource = event.detail?.resource;
    const available = !!(resource && resource.available);
    const variantId = resource?.id != null ? String(resource.id) : '';

    this.#syncAvailability(available, variantId);
  };

  /**
   * @param {boolean} available
   * @param {string} [variantId]
   */
  #syncAvailability(available, variantId) {
    this.dataset.available = available ? 'true' : 'false';
    this.classList.toggle('is-disabled', available);
    this.removeAttribute('hidden');

    if (variantId) {
      this.dataset.variantId = String(variantId);

      const tagsInput = this.querySelector('[data-sg-restock-tags]');
      if (tagsInput instanceof HTMLInputElement) {
        tagsInput.value = `restock-notify,newsletter,product-${this.dataset.productId},variant-${variantId}`;
      }

      const noteInput = this.querySelector('[data-sg-restock-note]');
      if (noteInput instanceof HTMLInputElement) {
        const title = this.dataset.productTitle || '';
        noteInput.value = `Restock notify — ${title} (variant ${variantId})`;
      }
    }

    const host =
      this.closest('.buy-buttons-block') ||
      document.querySelector(`product-form-component[data-product-id="${this.dataset.productId}"]`)?.parentElement;

    host?.classList.toggle('is-variant-sold-out', !available);

    const panel = this.querySelector('[data-sg-restock-panel]');
    const openBtn = this.querySelector('[data-sg-restock-open]');

    panel?.setAttribute('hidden', '');
    this.querySelector('[data-sg-restock-success]')?.setAttribute('hidden', '');
    this.querySelector('[data-sg-restock-error]')?.setAttribute('hidden', '');

    if (openBtn instanceof HTMLButtonElement) {
      openBtn.removeAttribute('hidden');
      openBtn.setAttribute('aria-expanded', 'false');

      if (available) {
        openBtn.disabled = true;
        openBtn.setAttribute('aria-disabled', 'true');
      } else {
        openBtn.disabled = false;
        openBtn.setAttribute('aria-disabled', 'false');
      }
    }
  }
}

if (!customElements.get('sg-restock-notify')) {
  customElements.define('sg-restock-notify', SgRestockNotify);
}
