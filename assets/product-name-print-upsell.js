if (!customElements.get('name-print-upsell')) {
  customElements.define(
    'name-print-upsell',
    class NamePrintUpsell extends HTMLElement {
      connectedCallback() {
        this.toggle = this.querySelector('.name-print-upsell__toggle');
        this.panel = this.querySelector('.name-print-upsell__panel');
        this.input = this.querySelector('.name-print-upsell__input');
        this.charCountEl = this.querySelector('.name-print-upsell__char-count');
        this.maxChars = parseInt(this.dataset.maxChars, 10) || 20;

        this.toggle.addEventListener('change', this.onToggleChange.bind(this));
        this.input.addEventListener('input', this.onInputChange.bind(this));

        // Subscribe to cartUpdate pub/sub fired after the main product is added to cart
        this.unsubscribeCartUpdate = subscribe(PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate.bind(this));
      }

      disconnectedCallback() {
        if (this.unsubscribeCartUpdate) this.unsubscribeCartUpdate();
      }

      onToggleChange() {
        const isChecked = this.toggle.checked;
        this.panel.hidden = !isChecked;
        this.toggle.setAttribute('aria-expanded', String(isChecked));
        if (isChecked) this.input.focus();
      }

      onInputChange() {
        this.charCountEl.textContent = this.maxChars - this.input.value.length;
      }

      onCartUpdate({ source }) {
        // Only react to add-to-cart submissions from the product form on this page
        if (source !== 'product-form') return;
        if (!this.toggle.checked) return;

        const name = this.input.value.trim();
        if (!name) return;

        const printVariantId = this.dataset.printVariantId;
        if (!printVariantId) return;

        this.addPrintToCart(name, printVariantId);
      }

      addPrintToCart(name, variantId) {
        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');

        const formData = new FormData();
        formData.append('id', variantId);
        formData.append('quantity', 1);
        formData.append('properties[Printed Name]', name);
        // Prefixed with _ so Shopify hides it from the storefront but shows it in admin orders
        formData.append('properties[_for_product]', this.dataset.productTitle);

        if (cart) {
          formData.append('sections', cart.getSectionsToRender().map((s) => s.id));
          formData.append('sections_url', window.location.pathname);
        }

        config.body = formData;

        fetch(routes.cart_add_url, config)
          .then((res) => res.json())
          .then((response) => {
            if (response.status) {
              console.error('Name print upsell: failed to add print service to cart.', response.description);
              return;
            }
            // Re-render the cart drawer with the updated cart (now includes the print item)
            if (cart) cart.renderContents(response);
            this.resetForm();
          })
          .catch(console.error);
      }

      resetForm() {
        this.input.value = '';
        this.charCountEl.textContent = this.maxChars;
        this.toggle.checked = false;
        this.toggle.setAttribute('aria-expanded', 'false');
        this.panel.hidden = true;
      }
    }
  );
}
