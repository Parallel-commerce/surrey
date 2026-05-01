(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getActiveCurrency() {
    return (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'GBP';
  }

  function centsToCurrency(cents) {
    return parseFloat((cents / 100).toFixed(2));
  }

  // Map a Shopify cart API line-item object to the GA4 item shape.
  // Works for both /cart/add.js (single item) and /cart/change.js (items array).
  function mapLineItem(item, index) {
    // Shopify sets variant_title to "Default Title" for single-variant products.
    // Treat that as an absent variant so analytics tools receive an empty string.
    var variantTitle = (item.variant_title && item.variant_title !== 'Default Title')
      ? item.variant_title
      : '';

    return {
      item_name: item.product_title || item.title || '',
      item_id: item.sku || '',
      item_brand: item.vendor || '',
      item_category: item.product_type || '',
      price: centsToCurrency(item.price),
      item_variant: variantTitle,
      index: index || 0,
      quantity: item.quantity || 1,
    };
  }

  // ── Add to Cart ──────────────────────────────────────────────────────────────
  // source: 'product-form' → cartData is the /cart/add.js response (single line item)

  subscribe(PUB_SUB_EVENTS.cartUpdate, function (event) {
    if (event.source !== 'product-form') return;

    var item = event.cartData;
    // Skip error responses (Shopify sets a status code on errors)
    if (!item || item.status) return;

    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: 'add_to_cart',
      ecommerce: {
        currency: getActiveCurrency(),
        value: centsToCurrency(item.line_price || item.price),
        items: [mapLineItem(item, 0)],
      },
    });

    // Synchronously update the snapshot so remove_from_cart can diff correctly
    // even if the user removes the item before the async refresh completes.
    // Use event.productVariantId (always present from the form input) rather than
    // item.variant_id which is absent when sections are appended to the add request.
    var addedVariantId = parseInt(event.productVariantId, 10);
    if (addedVariantId) {
      var existing = _prevCartItems.find(function (p) {
        return parseInt(p.variant_id, 10) === addedVariantId;
      });
      if (existing) {
        existing.quantity += (item.quantity || 1);
      } else {
        _prevCartItems.push({
          variant_id: addedVariantId,
          quantity: item.quantity || 1,
          price: item.price || 0,
          product_title: item.product_title || item.title || '',
          sku: item.sku || '',
          vendor: item.vendor || '',
          product_type: item.product_type || '',
          variant_title: item.variant_title || '',
        });
      }
    }

    // Full async refresh to keep the snapshot accurate for any other changes
    _refreshSnapshotFromApi();
  });

  // ── Remove from Cart ─────────────────────────────────────────────────────────
  // source: 'cart-items' → cartData is the full /cart/change.js response (all items)
  // We diff against the previous snapshot to find what quantity was removed.

  var _prevCartItems = [];

  // Seed snapshot from the server-rendered window.surreyCartData (available on cart page).
  // On all other pages, fetch from the API so the snapshot is always initialised.
  if (window.surreyCartData && window.surreyCartData.items) {
    _prevCartItems = window.surreyCartData.items.slice();
  } else {
    _refreshSnapshotFromApi();
  }

  function _refreshSnapshotFromApi() {
    fetch('/cart.js')
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        _prevCartItems = cart.items.slice();
        // Keep window.surreyCartData current so begin_checkout always has data,
        // regardless of whether the user ever visited the cart page.
        window.surreyCartData = {
          currency: getActiveCurrency(),
          value: centsToCurrency(cart.total_price),
          items: cart.items.map(function (item, i) { return mapLineItem(item, i); }),
        };
      })
      .catch(function () {});
  }

  // ── Remove from Cart ─────────────────────────────────────────────────────────
  // All cart-remove-button clicks are intercepted by cart-print-addon-sync.js
  // (capture phase + stopImmediatePropagation) which pushes remove_from_cart
  // directly to the dataLayer. The pubsub subscriber below handles quantity
  // reductions made via the quantity inputs, which still go through Dawn's
  // CartItems.updateQuantity → publish() path.
  subscribe(PUB_SUB_EVENTS.cartUpdate, function (event) {
    if (event.source !== 'cart-items') return;

    var newItems = (event.cartData && event.cartData.items) || [];

    _prevCartItems.forEach(function (prevItem, idx) {
      var newItem = newItems.find(function (n) {
        return parseInt(n.variant_id, 10) === parseInt(prevItem.variant_id, 10);
      });
      // Only fire for quantity reductions (full removes are handled by the
      // click listener above to avoid double-firing)
      var removedQty = newItem ? prevItem.quantity - newItem.quantity : 0;

      if (removedQty > 0) {
        var itemPayload = Object.assign({}, mapLineItem(prevItem, idx), { quantity: removedQty });
        window.dataLayer.push({ ecommerce: null });
        window.dataLayer.push({
          event: 'remove_from_cart',
          ecommerce: {
            currency: getActiveCurrency(),
            value: centsToCurrency(prevItem.price * removedQty),
            items: [itemPayload],
          },
        });
      }
    });

    _prevCartItems = newItems.slice();
    _refreshSnapshotFromApi();
  });

  // ── Select Item (product card click) ─────────────────────────────────────────
  // Reads data-* attributes set on .card-wrapper elements (added via card-product.liquid).
  // Uses event delegation so it works for dynamically rendered cards too.

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.card-wrapper[data-product-title]');
    if (!card) return;

    // Only fire on clicks that navigate to the product (i.e. anchor clicks)
    if (!e.target.closest('a')) return;

    // Derive position among sibling cards in the same grid
    var allCards = Array.from(document.querySelectorAll('.card-wrapper[data-product-title]'));
    var position = allCards.indexOf(card);

    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: 'select_item',
      ecommerce: {
        currency: getActiveCurrency(),
        item_list_id: card.dataset.itemListId || '',
        item_list_name: card.dataset.itemListName || '',
        items: [{
          item_name: card.dataset.productTitle || '',
          item_id: card.dataset.productId || '',
          item_brand: card.dataset.productBrand || '',
          item_category: card.dataset.productCategory || '',
          price: parseFloat(card.dataset.productPrice) || 0,
          item_variant: card.dataset.productVariant || '',
          index: position >= 0 ? position : 0,
          item_list_id: card.dataset.itemListId || '',
          item_list_name: card.dataset.itemListName || '',
          quantity: 1,
        }],
      },
    });
  });

  // ── Begin Checkout ────────────────────────────────────────────────────────────
  // Fires on any checkout button click. Reads window.surreyCartData which is
  // populated by the server-rendered view_cart push on the cart page / drawer.

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[name="checkout"], [href="/checkout"], .shopify-payment-button__button');
    if (!btn) return;

    var cartData = window.surreyCartData;
    if (!cartData) return;

    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: 'begin_checkout',
      ecommerce: {
        currency: cartData.currency || getActiveCurrency(),
        value: cartData.value || 0,
        items: cartData.items || [],
      },
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────────
  // Fires on submission of the Shopify customer login form (/account/login).
  // User ID is not available pre-login; GTM can enrich post-login via the
  // uniqueUserId field set in the page_view push on subsequent page loads.

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.action) return;
    if (form.action.indexOf('/account/login') === -1) return;

    window.dataLayer.push({
      event: 'login',
      user: {
        user_id: '',
        authentication_method: 'password',
      },
    });
  });
})();
