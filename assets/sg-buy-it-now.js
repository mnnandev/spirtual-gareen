/**
 * Fallback "Acquista ora" button — adds the selected variant and goes to checkout.
 */
function sgStoreRoot() {
  const fromShopify = window.Shopify?.routes?.root;
  if (typeof fromShopify === 'string' && fromShopify.length) {
    return fromShopify.endsWith('/') ? fromShopify : `${fromShopify}/`;
  }
  return '/';
}

function sgStoreUrl(path) {
  return `${sgStoreRoot()}${String(path || '').replace(/^\//, '')}`;
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-sg-buy-it-now]');
  if (!button || button.disabled) return;

  event.preventDefault();
  event.stopPropagation();

  const form = button.closest('form[data-type="add-to-cart-form"]');
  if (!form) return;

  const variantInput = form.querySelector('[name="id"]');
  if (!variantInput?.value) return;

  const quantityInput = form.querySelector('[name="quantity"]');
  const quantity = quantityInput?.value ? Number.parseInt(quantityInput.value, 10) : 1;

  button.disabled = true;
  button.setAttribute('aria-busy', 'true');

  try {
    await fetch(sgStoreUrl('cart/clear.js'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    });

    const response = await fetch(sgStoreUrl('cart/add.js'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        items: [{ id: variantInput.value, quantity: quantity || 1 }],
      }),
    });

    if (!response.ok) {
      throw new Error('Add to cart failed');
    }

    window.location.href = sgStoreUrl('checkout');
  } catch (error) {
    console.error('Buy it now failed:', error);
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
});
