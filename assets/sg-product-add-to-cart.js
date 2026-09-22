import { ThemeEvents } from '@theme/events';

const PRODUCT_PAGE_SELECTOR = '[data-testid="product-information"]';

/**
 * @returns {boolean}
 */
function isProductPage() {
  return Boolean(document.querySelector(PRODUCT_PAGE_SELECTOR));
}

/**
 * Opens the theme cart drawer when available.
 */
function openCartDrawer() {
  const drawer = document.querySelector('cart-drawer-component');
  if (!drawer) return;

  if ('open' in drawer && typeof drawer.open === 'function') {
    drawer.open();
    return;
  }

  if ('showDialog' in drawer && typeof drawer.showDialog === 'function') {
    drawer.showDialog();
  }
}

/**
 * After a successful PDP add-to-cart, open the cart drawer instead of redirecting.
 * @param {Event} event
 */
function onCartUpdate(event) {
  if (!isProductPage()) return;

  const detail = /** @type {{ data?: { didError?: boolean; source?: string } }} */ (event).detail;
  const data = detail?.data;

  if (!data || data.didError) return;
  if (data.source !== 'product-form-component') return;

  openCartDrawer();
}

document.addEventListener(ThemeEvents.cartUpdate, onCartUpdate, { capture: true });
