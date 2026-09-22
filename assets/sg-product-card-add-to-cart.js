import { CartAddEvent } from '@theme/events';

const FORM_SELECTOR = '[data-sg-card-add-form]';
const SUCCESS_RESET_MS = 2000;

/**
 * Locale-aware storefront root, e.g. "/" or "/it-it/".
 * @returns {string}
 */
function getStoreRoot() {
  const fromShopify = window.Shopify?.routes?.root;
  if (typeof fromShopify === 'string' && fromShopify.length) {
    return fromShopify.endsWith('/') ? fromShopify : `${fromShopify}/`;
  }
  return '/';
}

/**
 * @param {string} path
 * @returns {string}
 */
function storeUrl(path) {
  const root = getStoreRoot();
  const clean = String(path || '').replace(/^\//, '');
  return `${root}${clean}`;
}

/**
 * @returns {string[]}
 */
function getCartSectionIds() {
  const sectionIds = [];
  document.querySelectorAll('cart-items-component[data-section-id]').forEach((element) => {
    if (element instanceof HTMLElement && element.dataset.sectionId) {
      sectionIds.push(element.dataset.sectionId);
    }
  });
  return sectionIds;
}

/**
 * @param {HTMLButtonElement} button
 * @param {'loading' | 'success' | 'default'} state
 */
function setButtonState(button, state) {
  const addLabel = button.dataset.labelAdd || 'Aggiungi al Carrello';
  const loadingLabel = button.dataset.labelLoading || 'Aggiunta...';
  const successLabel = button.dataset.labelSuccess || '✓ Aggiunto!';

  button.classList.remove('sg-product-card-actions__btn--success');

  if (state === 'loading') {
    button.textContent = loadingLabel;
    button.disabled = true;
    return;
  }

  if (state === 'success') {
    button.textContent = successLabel;
    button.classList.add('sg-product-card-actions__btn--success');
    button.disabled = true;
    window.setTimeout(() => {
      setButtonState(button, 'default');
    }, SUCCESS_RESET_MS);
    return;
  }

  button.textContent = addLabel;
  button.disabled = false;
}

/**
 * @param {HTMLFormElement} form
 */
async function handleCardAddToCart(form) {
  const button = form.querySelector('.sg-product-card-actions__btn--add');
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;

  setButtonState(button, 'loading');

  const formData = new FormData(form);
  const sectionIds = getCartSectionIds();
  if (sectionIds.length) {
    formData.append('sections', sectionIds.join(','));
  }

  const cartAddUrl = window.Theme?.routes?.cart_add_url || storeUrl('cart/add.js');
  const cartJsUrl = storeUrl('cart.js');

  try {
    const response = await fetch(cartAddUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData,
    });

    let data = null;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Invalid add-to-cart response');
    }

    if (!response.ok || data?.status) {
      setButtonState(button, 'default');
      return;
    }

    const cartResponse = await fetch(cartJsUrl, {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    const cart = await cartResponse.json();

    document.dispatchEvent(
      new CartAddEvent(cart, String(formData.get('id') || ''), {
        source: 'sg-product-card-add-to-cart',
        itemCount: cart.item_count,
        productId: form.dataset.productId,
        variantId: String(formData.get('id') || ''),
        sections: data.sections,
      })
    );

    setButtonState(button, 'success');
  } catch (error) {
    console.error('Product card add to cart failed:', error);
    setButtonState(button, 'default');
  }
}

/**
 * @param {Event} event
 */
function onDocumentSubmit(event) {
  if (!(event.target instanceof HTMLFormElement)) return;
  if (!event.target.matches(FORM_SELECTOR)) return;

  event.preventDefault();
  event.stopPropagation();
  handleCardAddToCart(event.target);
}

document.addEventListener('submit', onDocumentSubmit, true);
