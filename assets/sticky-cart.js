/**
 * Sticky Add-to-Cart (Mobile)
 *
 * Shows a fixed bar at the bottom of the viewport on mobile once the user
 * scrolls past the main product form. Stays synced with variant changes
 * and proxies its button click to the real add-to-cart form.
 */

if (!customElements.get('sticky-cart')) {
  class StickyCart extends HTMLElement {
    constructor() {
      super();
      this.sectionId = this.dataset.sectionId;
      this.productFormId = this.dataset.productFormId;
      this.variantEl = this.querySelector('[data-sticky-variant]');
      this.priceEl = this.querySelector('[data-sticky-price]');
      this.button = this.querySelector('[data-sticky-button]');
      this.sentinel = null;
      this.observer = null;
      this.variantChangeUnsubscriber = null;
    }

    connectedCallback() {
      // Only run on mobile viewports
      if (window.matchMedia('(min-width: 750px)').matches) return;

      this.initObserver();
      this.bindButton();
      this.subscribeToVariantChanges();
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
      if (this.variantChangeUnsubscriber) this.variantChangeUnsubscriber();
    }

    /**
     * Use an IntersectionObserver on the real buy button area.
     * When it scrolls out of view, show the sticky bar.
     */
    initObserver() {
      // Find the original product submit button as our sentinel
      this.sentinel =
        document.getElementById(`ProductSubmitButton-${this.sectionId}`)?.closest('.product-form__buttons') ||
        document.getElementById(`ProductSubmitButton-${this.sectionId}`);

      if (!this.sentinel) return;

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Show sticky bar when the sentinel is NOT in view
            this.classList.toggle('is-visible', !entry.isIntersecting);
          });
        },
        { threshold: 0, rootMargin: '0px' }
      );

      this.observer.observe(this.sentinel);
    }

    /**
     * Proxy the click to the real product form's submit button.
     */
    bindButton() {
      if (!this.button) return;

      this.button.addEventListener('click', (e) => {
        e.preventDefault();
        const realButton = document.getElementById(`ProductSubmitButton-${this.sectionId}`);
        if (realButton && !realButton.disabled) {
          realButton.click();
        }
      });
    }

    /**
     * Subscribe to the theme's PUB_SUB variant-change events
     * so we can keep variant label and price up to date.
     */
    subscribeToVariantChanges() {
      if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;

      this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
        if (event.data.sectionId !== this.sectionId) return;

        const variant = event.data.variant;
        if (!variant) {
          this.button?.setAttribute('disabled', 'disabled');
          if (this.variantEl) this.variantEl.textContent = '';
          return;
        }

        this.updateVariantLabel(variant);
        this.updatePrice(event.data.html);
        this.updateButtonState(variant, event.data.html);
      });
    }

    updateVariantLabel(variant) {
      if (!this.variantEl) return;
      // Show the variant title unless it's the default "Default Title"
      const title = variant.title === 'Default Title' ? '' : variant.title;
      this.variantEl.textContent = title;
    }

    updatePrice(html) {
      if (!this.priceEl || !html) return;

      const priceSource = html.getElementById(`price-${this.sectionId}`);
      if (!priceSource) return;

      // Extract the current price from the section response
      const regularPrice = priceSource.querySelector('.price-item--regular');
      const salePrice = priceSource.querySelector('.price-item--sale');
      const comparePrice = priceSource.querySelector('.price-item--regular s, .price-item--compare');

      let priceHTML = '';

      if (salePrice) {
        // On sale — show compare-at crossed out, then sale price
        const compareText = comparePrice ? comparePrice.textContent.trim() : (regularPrice ? regularPrice.textContent.trim() : '');
        if (compareText) {
          priceHTML = `<s>${compareText}</s> ${salePrice.textContent.trim()}`;
        } else {
          priceHTML = salePrice.textContent.trim();
        }
      } else if (regularPrice) {
        priceHTML = regularPrice.textContent.trim();
      }

      if (priceHTML) {
        this.priceEl.innerHTML = priceHTML;
      }
    }

    updateButtonState(variant, html) {
      if (!this.button) return;

      const realButton = html?.getElementById(`ProductSubmitButton-${this.sectionId}`);
      const isDisabled = !variant.available || (realButton && realButton.hasAttribute('disabled'));

      if (isDisabled) {
        this.button.setAttribute('disabled', 'disabled');
        const label = this.button.querySelector('span:first-child');
        if (label) {
          label.textContent = variant.available ? (window.variantStrings?.addToCart || 'Add to cart') : (window.variantStrings?.soldOut || 'Sold out');
        }
      } else {
        this.button.removeAttribute('disabled');
        const label = this.button.querySelector('span:first-child');
        if (label) {
          label.textContent = window.variantStrings?.addToCart || 'Add to cart';
        }
      }
    }
  }

  customElements.define('sticky-cart', StickyCart);
}
