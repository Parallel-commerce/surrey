class ParallelCustomSlider extends HTMLElement {
  constructor() {
    super();
    this.currentIndex = 0;
    this.autoplayTimer = null;
    this.isHovered = false;
    this.touchStartX = 0;
    this.touchEndX = 0;
  }

  connectedCallback() {
    this.track = this.querySelector('[data-slider-track]');
    this.slides = this.querySelectorAll('[data-slider-slide]');
    this.dots = this.querySelectorAll('[data-slider-dot]');
    this.speed = parseInt(this.dataset.speed, 10) || 5000;

    if (this.slides.length <= 1) return;

    this.bindEvents();
    this.startAutoplay();
  }

  disconnectedCallback() {
    this.stopAutoplay();
  }

  bindEvents() {
    this.addEventListener('mouseenter', () => {
      this.isHovered = true;
      this.stopAutoplay();
    });

    this.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.startAutoplay();
    });

    this.dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index, 10);
        this.goToSlide(index);
        this.resetAutoplay();
      });
    });

    this.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    this.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe();
    }, { passive: true });

    if (Shopify.designMode) {
      document.addEventListener('shopify:section:select', (e) => {
        if (e.detail.sectionId === this.dataset.sectionId) {
          this.stopAutoplay();
        }
      });

      document.addEventListener('shopify:section:deselect', (e) => {
        if (e.detail.sectionId === this.dataset.sectionId) {
          this.startAutoplay();
        }
      });

      document.addEventListener('shopify:block:select', (e) => {
        if (e.detail.sectionId === this.dataset.sectionId) {
          this.stopAutoplay();
          const slideIndex = [...this.slides].findIndex(
            (slide) => slide.dataset.blockId === e.detail.blockId
          );
          if (slideIndex !== -1) this.goToSlide(slideIndex);
        }
      });

      document.addEventListener('shopify:block:deselect', (e) => {
        if (e.detail.sectionId === this.dataset.sectionId) {
          this.startAutoplay();
        }
      });
    }
  }

  handleSwipe() {
    const threshold = 50;
    const diff = this.touchStartX - this.touchEndX;

    if (Math.abs(diff) < threshold) return;

    if (diff > 0) {
      this.next();
    } else {
      this.prev();
    }
    this.resetAutoplay();
  }

  goToSlide(index) {
    this.currentIndex = index;
    this.track.style.transform = `translateX(-${this.currentIndex * 100}%)`;
    this.updateDots();
  }

  next() {
    const nextIndex = (this.currentIndex + 1) % this.slides.length;
    this.goToSlide(nextIndex);
  }

  prev() {
    const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.goToSlide(prevIndex);
  }

  updateDots() {
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === this.currentIndex);
      dot.setAttribute('aria-current', i === this.currentIndex ? 'true' : 'false');
    });
  }

  startAutoplay() {
    if (this.isHovered) return;
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => this.next(), this.speed);
  }

  stopAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  resetAutoplay() {
    this.stopAutoplay();
    if (!this.isHovered) this.startAutoplay();
  }
}

customElements.define('parallel-custom-slider', ParallelCustomSlider);
