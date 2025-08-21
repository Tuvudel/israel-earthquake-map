// Filter Pane Mobile Animation Controller
// Handles mobile filter pane animations and swipe-to-close functionality
(function (global) {
  class FilterAnimationController {
    constructor() {
      this.filtersPane = null;
      this.backdrop = null;
      this.isAnimating = false;
      this.touchStartY = 0;
      this.touchStartX = 0;
      this.currentTranslateY = 0;
      this.isDragging = false;
      this.animationFrame = null;
      
      // Animation settings
      this.animationDuration = 400; // ms
      this.animationEasing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      
      // Swipe settings
      this.swipeThreshold = 80; // px (smaller than sidebar for easier closing)
      this.swipeVelocityThreshold = 0.4; // px/ms
      this.maxSwipeDistance = 150; // px
      
      // Bind methods
      this.handleTouchStart = this.handleTouchStart.bind(this);
      this.handleTouchMove = this.handleTouchMove.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }

    /**
     * Initialize the filter animation controller
     * @param {HTMLElement} filtersPane - The filters pane element
     */
    init(filtersPane) {
      this.filtersPane = filtersPane;
      this.backdrop = document.getElementById('filters-backdrop');
      
      if (!this.filtersPane) return;

      // Add touch event listeners
      this.addTouchListeners();
      
      // Add mobile animation classes
      this.addMobileAnimationClasses();
    }

    /**
     * Add touch event listeners for swipe-to-close
     */
    addTouchListeners() {
      if (!this.filtersPane) return;

      // Add touch listeners to the filters pane
      this.filtersPane.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.filtersPane.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.filtersPane.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }

    /**
     * Add mobile animation classes
     */
    addMobileAnimationClasses() {
      if (!this.filtersPane) return;
      
      // Don't add conflicting animation classes - let CSS handle the animations
      // this.filtersPane.classList.add('mobile-panel-slide-up');
    }

    /**
     * Handle touch start event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
      if (!this.filtersPane || !this.filtersPane.classList.contains('show')) return;
      
      // Check if touch is on interactive elements (inputs, buttons, etc.)
      const target = e.target;
      const isInteractive = target.closest('input') || 
                           target.closest('button') ||
                           target.closest('select') ||
                           target.closest('sl-select') ||
                           target.closest('sl-button') ||
                           target.closest('.noUi-handle') ||
                           target.closest('.noUi-connect');
      
      if (isInteractive) {
        // Don't interfere with interactive elements
        return;
      }
      
      const touch = e.touches[0];
      this.touchStartY = touch.clientY;
      this.touchStartX = touch.clientX;
      this.touchStartTime = Date.now();
      this.isDragging = false;
      this.currentTranslateY = 0;
      
      // Cancel any ongoing animations
      this.cancelAnimation();
    }

    /**
     * Handle touch move event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
      if (!this.filtersPane || !this.filtersPane.classList.contains('show') || !this.touchStartTime) return;
      
      const touch = e.touches[0];
      const deltaY = touch.clientY - this.touchStartY;
      const deltaX = Math.abs(touch.clientX - this.touchStartX);
      
      // Only handle vertical swipes
      if (Math.abs(deltaY) < Math.abs(deltaX)) return;
      
      // Start dragging after a small threshold
      if (Math.abs(deltaY) > 8) {
        this.isDragging = true;
      }
      
      if (this.isDragging && deltaY > 0) {
        // Prevent default only when actually swiping down
        e.preventDefault();
        
        // Limit the swipe distance
        const limitedDeltaY = Math.min(deltaY, this.maxSwipeDistance);
        this.currentTranslateY = limitedDeltaY;
        
        // Apply transform with resistance
        const resistance = 1 - (limitedDeltaY / this.maxSwipeDistance) * 0.2;
        const translateY = limitedDeltaY * resistance;
        
        this.filtersPane.style.transform = `translateY(${translateY}px)`;
        this.filtersPane.style.transition = 'none';
        
        // Fade backdrop based on swipe progress
        if (this.backdrop) {
          const backdropOpacity = 1 - (limitedDeltaY / this.maxSwipeDistance);
          this.backdrop.style.opacity = Math.max(0, backdropOpacity);
        }
      }
    }

    /**
     * Handle touch end event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
      if (!this.filtersPane || !this.isDragging) return;
      
      const touch = e.changedTouches[0];
      const deltaY = touch.clientY - this.touchStartY;
      const deltaTime = Date.now() - this.touchStartTime;
      const velocity = deltaY / deltaTime;
      
      // Determine if swipe should close the filters pane
      const shouldClose = deltaY > this.swipeThreshold || velocity > this.swipeVelocityThreshold;
      
      if (shouldClose) {
        this.closeFiltersPane();
      } else {
        this.resetFiltersPanePosition();
      }
      
      this.isDragging = false;
      this.currentTranslateY = 0;
    }

    /**
     * Close the filters pane with animation
     */
    closeFiltersPane() {
      if (!this.filtersPane) return;
      
      // Trigger haptic feedback
      if (global.MobileAnimationUtils) {
        global.MobileAnimationUtils.haptic('light');
      }
      
      // Close the filters pane using the existing close method
      if (global.HeaderController && global.HeaderController.mobile && global.HeaderController.mobile.filters) {
        global.HeaderController.mobile.filters.close();
      }
    }

    /**
     * Reset filters pane position after failed swipe
     */
    resetFiltersPanePosition() {
      if (!this.filtersPane) return;
      
      this.filtersPane.style.transition = `transform ${this.animationDuration}ms ${this.animationEasing}`;
      this.filtersPane.style.transform = 'translateY(0)';
      
      // Reset backdrop opacity
      if (this.backdrop) {
        this.backdrop.style.transition = `opacity ${this.animationDuration}ms ${this.animationEasing}`;
        this.backdrop.style.opacity = '1';
      }
      
      // Remove transition after animation
      setTimeout(() => {
        if (this.filtersPane) {
          this.filtersPane.style.transition = '';
        }
        if (this.backdrop) {
          this.backdrop.style.transition = '';
        }
      }, this.animationDuration);
    }

    /**
     * Animate filters pane opening
     * @returns {Promise} Promise that resolves when animation completes
     */
    animateOpen() {
      if (!this.filtersPane) return Promise.resolve();
      
      console.log('FilterAnimationController: Starting open animation');
      
      return new Promise((resolve) => {
        this.isAnimating = true;
        
        // Add show class to trigger CSS animation
        this.filtersPane.classList.add('show');
        console.log('FilterAnimationController: Added show class, classes:', this.filtersPane.className);
        
        // Animate backdrop
        if (this.backdrop) {
          this.backdrop.classList.add('show');
        }
        
        // Add touch feedback to toggle button
        const toggleButton = document.getElementById('mobile-filters-toggle');
        if (toggleButton && global.MobileAnimationUtils) {
          global.MobileAnimationUtils.addTouchFeedback(toggleButton, 'light');
        }
        
        // Resolve after animation completes
        setTimeout(() => {
          this.isAnimating = false;
          console.log('FilterAnimationController: Open animation completed');
          resolve();
        }, this.animationDuration);
      });
    }

    /**
     * Animate filters pane closing
     * @returns {Promise} Promise that resolves when animation completes
     */
    animateClose() {
      if (!this.filtersPane) return Promise.resolve();
      
      console.log('FilterAnimationController: Starting close animation');
      
      return new Promise((resolve) => {
        this.isAnimating = true;
        
        // Remove show class to trigger CSS animation
        this.filtersPane.classList.remove('show');
        console.log('FilterAnimationController: Removed show class, classes:', this.filtersPane.className);
        
        // Animate backdrop
        if (this.backdrop) {
          this.backdrop.classList.remove('show');
        }
        
        // Remove touch feedback from toggle button
        const toggleButton = document.getElementById('mobile-filters-toggle');
        if (toggleButton && global.MobileAnimationUtils) {
          global.MobileAnimationUtils.removeTouchFeedback(toggleButton);
        }
        
        // Resolve after animation completes
        setTimeout(() => {
          this.isAnimating = false;
          console.log('FilterAnimationController: Close animation completed');
          resolve();
        }, this.animationDuration);
      });
    }

    /**
     * Cancel ongoing animation
     */
    cancelAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      
      if (this.filtersPane) {
        this.filtersPane.style.transition = '';
        this.filtersPane.style.transform = '';
      }
      
      if (this.backdrop) {
        this.backdrop.style.transition = '';
        this.backdrop.style.opacity = '';
      }
      
      this.isAnimating = false;
    }

    /**
     * Clean up event listeners
     */
    destroy() {
      if (this.filtersPane) {
        this.filtersPane.removeEventListener('touchstart', this.handleTouchStart);
        this.filtersPane.removeEventListener('touchmove', this.handleTouchMove);
        this.filtersPane.removeEventListener('touchend', this.handleTouchEnd);
      }
      
      this.cancelAnimation();
      this.filtersPane = null;
      this.backdrop = null;
    }
  }

  // Create global instance
  global.FilterAnimationController = FilterAnimationController;
  global.FilterAnimations = new FilterAnimationController();

  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (!global.FilterAnimations) {
      global.FilterAnimations = new FilterAnimationController();
    }
  });

})(window);
