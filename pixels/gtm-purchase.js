/**
 * Surrey Cricket Club — GTM Purchase Pixel
 *
 * Shopify Customer Events pixel (Settings > Customer Events > GTM - Purchase).
 * Runs inside Shopify's sandboxed checkout/order-status environment.
 *
 * Flow:
 *   1. Loads GTM-NDG54GG inside the pixel sandbox so the container is active.
 *   2. Subscribes to Shopify's checkout_completed event.
 *   3. Pushes a GA4-spec `purchase` event to window.dataLayer, matching the
 *      schema used by all other Surrey dataLayer events.
 *
 * GTM setup required (Gemba):
 *   - Custom Event trigger  → event name: purchase
 *   - DataLayer Variables   → ecommerce.transaction_id, ecommerce.value,
 *                             ecommerce.currency, ecommerce.tax,
 *                             ecommerce.shipping, ecommerce.coupon,
 *                             ecommerce.items
 *   - GA4 Event tag         → event: purchase, measurement ID: G-XGRKJ44YJ3
 *                             with ecommerce items passthrough enabled
 */

// ── Load GTM inside the pixel sandbox ────────────────────────────────────────
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var f = d.getElementsByTagName(s)[0],
    j = d.createElement(s),
    dl = l != 'dataLayer' ? '&l=' + l : '';
  j.async = true;
  j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, 'script', 'dataLayer', 'GTM-NDG54GG');

// ── Purchase event ────────────────────────────────────────────────────────────
analytics.subscribe('checkout_completed', function (event) {
  var checkout = event.data.checkout;
  if (!checkout) return;

  // Map line items to the GA4 item shape used across all Surrey events
  var items = (checkout.lineItems || []).map(function (item, index) {
    var variant = item.variant || {};
    var product = variant.product || {};

    var variantTitle =
      variant.title && variant.title !== 'Default Title' ? variant.title : '';

    return {
      item_name: item.title || product.title || '',
      item_id: variant.sku || '',
      item_brand: product.vendor || '',
      item_category: product.type || '',
      item_variant: variantTitle,
      price: variant.price ? parseFloat(variant.price.amount) : 0,
      quantity: item.quantity || 1,
      index: index,
    };
  });

  // First coupon code applied to the order (order-level)
  var coupon = '';
  var discounts = checkout.discountApplications || [];
  if (discounts.length > 0) {
    coupon = discounts[0].title || discounts[0].code || '';
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({
    event: 'purchase',
    ecommerce: {
      transaction_id: checkout.order ? String(checkout.order.id) : '',
      value: parseFloat(checkout.totalPrice.amount),
      tax: checkout.totalTax ? parseFloat(checkout.totalTax.amount) : 0,
      shipping: checkout.shippingLine ? parseFloat(checkout.shippingLine.price.amount) : 0,
      currency: checkout.currencyCode,
      coupon: coupon,
      items: items,
    },
  });
});
