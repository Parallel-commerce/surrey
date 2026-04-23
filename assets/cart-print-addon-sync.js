/**
 * Bidirectional cart removal for name-print add-on pairs.
 *
 * When a customer removes a shirt that has a linked print add-on (or removes
 * the print add-on itself), this script also removes the partner item so the
 * cart is never left with an orphaned line.
 *
 * Loaded globally via theme.liquid so it works in the cart drawer on any page
 * as well as on the dedicated cart page.
 */
(function () {
  'use strict';

  /**
   * Given all cart items and the item being removed, returns the linked
   * partner item (if any). Matching is done by:
   *   - Print addon → parent shirt:  _for_product == shirt title AND Printed Name matches
   *   - Shirt → print addon:         print addon's _for_product == shirt title AND Printed Name matches
   */
  function findLinkedItem(items, target) {
    const props = target.properties || {};
    const forProduct = props['_for_product'];
    const printedName = props['Printed Name'];

    if (forProduct) {
      return items.find(
        (other) =>
          other.key !== target.key &&
          other.product_title === forProduct &&
          !(other.properties || {})['_for_product'] &&
          (other.properties || {})['Printed Name'] === printedName
      );
    }

    if (printedName) {
      return items.find(
        (other) =>
          other.key !== target.key &&
          (other.properties || {})['_for_product'] === target.product_title &&
          (other.properties || {})['Printed Name'] === printedName
      );
    }

    return null;
  }

  function removeByKey(key) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ id: key, quantity: 0 }),
    });
  }

  function rerenderCartDrawer() {
    const cartDrawer = document.querySelector('cart-drawer');
    if (!cartDrawer) return Promise.resolve();

    const sectionIds = cartDrawer.getSectionsToRender().map((s) => s.id).join(',');

    return fetch(`${window.location.pathname}?sections=${sectionIds}`)
      .then((r) => r.json())
      .then((sections) => {
        cartDrawer.getSectionsToRender().forEach((section) => {
          const el = section.selector
            ? document.querySelector(section.selector)
            : document.getElementById(section.id);
          if (!el || !sections[section.id]) return;
          el.innerHTML = cartDrawer.getSectionInnerHTML(sections[section.id], section.selector);
        });
      });
  }

  document.addEventListener(
    'click',
    async (evt) => {
      const cartRemoveBtn = evt.target.closest('cart-remove-button');
      if (!cartRemoveBtn) return;

      const index = parseInt(cartRemoveBtn.dataset.index, 10);
      if (!index) return;

      // Intercept synchronously before any async work so the default
      // remove action (Dawn's CartItems handler / link navigation) doesn't fire.
      evt.preventDefault();
      evt.stopImmediatePropagation();

      let cart;
      try {
        cart = await fetch('/cart.js').then((r) => r.json());
      } catch {
        return;
      }

      const target = cart.items[index - 1];
      if (!target) return;

      const linked = findLinkedItem(cart.items, target);

      // Remove the item the customer clicked, then its partner (if any)
      await removeByKey(target.key).catch(console.error);
      if (linked) {
        await removeByKey(linked.key).catch(console.error);
      }

      // Refresh the UI
      const cartUrl = (window.routes && window.routes.cart_url) || '/cart';
      const isCartPage = window.location.pathname === cartUrl;

      if (isCartPage) {
        window.location.reload();
      } else {
        await rerenderCartDrawer().catch(console.error);
      }
    },
    true // capture phase — runs before Dawn's bubble-phase handler
  );
})();
