(function() {
  'use strict';

  function initShopTheLook(section) {
    const dots = section.querySelectorAll('.shop-the-look__dot');
    const productItems = section.querySelectorAll('.shop-the-look__product-item');

    function highlightProduct(productId) {
      // Remove active state from all dots and products
      dots.forEach((dot) => {
        dot.classList.remove('shop-the-look__dot--active');
      });

      productItems.forEach((item) => {
        item.classList.remove('shop-the-look__product-item--active');
      });

      // Add active state to matching dot and product
      const activeDot = section.querySelector(
        `.shop-the-look__dot[data-product-id="${productId}"]`
      );
      const activeProduct = section.querySelector(
        `.shop-the-look__product-item[data-product-id="${productId}"]`
      );

      if (activeDot) {
        activeDot.classList.add('shop-the-look__dot--active');
      }

      if (activeProduct) {
        activeProduct.classList.add('shop-the-look__product-item--active');
      }
    }

    function handleDotClick(event, dot) {
      event.preventDefault();
      const productId = dot.dataset.productId;
      highlightProduct(productId);

      // Scroll product into view on mobile
      if (window.innerWidth < 750) {
        const productItem = section.querySelector(
          `.shop-the-look__product-item[data-product-id="${productId}"]`
        );
        if (productItem) {
          productItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }

    // Add click handlers to dots
    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => handleDotClick(e, dot));
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleDotClick(e, dot);
        }
      });
    });

    // Add click handlers to product items
    productItems.forEach((item) => {
      item.addEventListener('click', () => {
        const productId = item.dataset.productId;
        highlightProduct(productId);
      });
    });

    // Highlight first product by default
    if (productItems.length > 0) {
      const firstProductId = productItems[0].dataset.productId;
      highlightProduct(firstProductId);
    }
  }

  // Initialize all shop-the-look sections on the page
  function initAll() {
    const shopTheLookSections = document.querySelectorAll('.shop-the-look');
    shopTheLookSections.forEach((section) => {
      initShopTheLook(section);
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Re-initialize when sections are loaded dynamically (e.g., in theme editor)
  if (typeof Shopify !== 'undefined' && Shopify.designMode) {
    document.addEventListener('shopify:section:load', function(event) {
      const section = event.detail.section.querySelector('.shop-the-look');
      if (section) {
        initShopTheLook(section);
      }
    });
  }
})();
