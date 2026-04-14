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

        // Hook into the product form submit in the capture phase so we run
        // before product-form.js's bubble-phase handler. When print is opted in
        // we cancel the original submit and send a single request that adds
        // both the main product and the print service together.
        const productInfo = this.closest('product-info');
        if (!productInfo) return;

        const sectionId = productInfo.dataset.section;
        this.atcForm = document.getElementById(`product-form-${sectionId}`);
        this.productFormEl = this.atcForm && this.atcForm.closest('product-form');

        if (this.atcForm) {
          this.atcForm.addEventListener('submit', this.onFormSubmit.bind(this), { capture: true });
        }
      }

      disconnectedCallback() {
        if (this.atcForm) {
          this.atcForm.removeEventListener('submit', this.onFormSubmit.bind(this), { capture: true });
        }
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

      onFormSubmit(evt) {
        // Only intercept when the print option is opted in with a name entered
        if (!this.toggle.checked) return;
        const name = this.input.value.trim();
        if (!name) return;
        const printVariantId = this.dataset.printVariantId;
        if (!printVariantId) return;

        // Stop product-form.js from handling this submit — we take over
        evt.preventDefault();
        evt.stopImmediatePropagation();

        const submitButton = this.productFormEl && this.productFormEl.querySelector('[type="submit"]');
        if (submitButton) {
          if (submitButton.getAttribute('aria-disabled') === 'true') return;
          submitButton.setAttribute('aria-disabled', 'true');
          submitButton.classList.add('loading');
        }
        this.productFormEl &&
          this.productFormEl.querySelector('.loading__spinner')?.classList.remove('hidden');

        const mainVariantId = this.atcForm.querySelector('[name="id"]').value;
        const quantity = parseInt(this.atcForm.querySelector('[name="quantity"]')?.value || '1', 10);
        const cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');

        // Use the items[] array format to add both products in one request.
        // The printed name is attached to BOTH line items so the cart, checkout,
        // and order fulfilment always show which name belongs to which shirt.
        const formData = new FormData();
        formData.append('items[0][id]', mainVariantId);
        formData.append('items[0][quantity]', quantity);
        formData.append('items[0][properties][Printed Name]', name);
        formData.append('items[1][id]', printVariantId);
        formData.append('items[1][quantity]', 1);
        formData.append('items[1][properties][Printed Name]', name);
        // _-prefixed property is hidden on storefront but visible in Shopify admin orders
        formData.append('items[1][properties][_for_product]', this.dataset.productTitle);

        if (cart) {
          formData.append('sections', cart.getSectionsToRender().map((s) => s.id));
          formData.append('sections_url', window.location.pathname);
          cart.setActiveElement(document.activeElement);
        }

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];
        config.body = formData;

        fetch(routes.cart_add_url, config)
          .then((res) => res.json())
          .then((response) => {
            if (response.status) {
              this.showError(response.description || response.message);
              return;
            }
            this.hideError();
            if (cart) {
              cart.renderContents(response);
            } else {
              window.location = window.routes.cart_url;
            }
            this.resetForm();
          })
          .catch((e) => {
            console.error('Name print upsell:', e);
            this.showError('Something went wrong. Please try again.');
          })
          .finally(() => {
            if (submitButton) {
              submitButton.classList.remove('loading');
              submitButton.removeAttribute('aria-disabled');
            }
            this.productFormEl &&
              this.productFormEl.querySelector('.loading__spinner')?.classList.add('hidden');
          });
      }

      showError(message) {
        if (!this.productFormEl) return;
        const wrapper = this.productFormEl.querySelector('.product-form__error-message-wrapper');
        const msg = this.productFormEl.querySelector('.product-form__error-message');
        if (!wrapper || !msg) return;
        msg.textContent = message;
        wrapper.removeAttribute('hidden');
      }

      hideError() {
        if (!this.productFormEl) return;
        const wrapper = this.productFormEl.querySelector('.product-form__error-message-wrapper');
        if (wrapper) wrapper.setAttribute('hidden', '');
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
