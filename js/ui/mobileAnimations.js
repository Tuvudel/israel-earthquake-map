// Mobile Animation Controller for smooth height transitions and touch gestures
// Handles mobile sidebar height adaptation and swipe-to-close functionality
(function (global) {
  class MobileAnimationController {
    constructor() {
      this.sidebar = null;
      this.isAnimating = false;
      this.touchStartY = 0;
      this.touchStartX = 0;
      this.currentTranslateY = 0;
      this.isDragging = false;
      this.animationFrame = null;
      
      // Height transition settings
      this.heightTransitionDuration = 300; // ms
      this.heightTransitionEasing = 'cubic-bezier(0.4, 0, 0.2, 1)';
      
      // Swipe settings
      this.swipeThreshold = 100; // px
      this.swipeVelocityThreshold = 0.5; // px/ms
      this.maxSwipeDistance = 200; // px
      
      // Mobile animation presets
      this.mobileAnimationPresets = {
        fast: { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        normal: { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        slow: { duration: 400, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
        bounce: { duration: 500, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }
      };
      
      // Bind methods
      this.handleTouchStart = this.handleTouchStart.bind(this);
      this.handleTouchMove = this.handleTouchMove.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
      this.handleTabChange = this.handleTabChange.bind(this);
    }

    /**
     * Initialize the mobile animation controller
     * @param {HTMLElement} sidebar - The sidebar element
     */
    init(sidebar) {
      this.sidebar = sidebar;
      if (!this.sidebar) return;

      // Add touch event listeners
      this.addTouchListeners();
      
      // Add tab change listener
      this.addTabChangeListener();
      
      // Initialize height tracking
      this.updateHeight();
    }

    /**
     * Add touch event listeners for swipe-to-close
     */
    addTouchListeners() {
      if (!this.sidebar) return;

      // Add touch listeners to the sidebar
      this.sidebar.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.sidebar.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.sidebar.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }

    /**
     * Add tab change listener for height transitions
     */
    addTabChangeListener() {
      if (!this.sidebar) return;

      const tabGroup = this.sidebar.querySelector('sl-tab-group');
      if (tabGroup) {
        tabGroup.addEventListener('sl-change', this.handleTabChange);
      }
    }

    /**
     * Handle touch start event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
      if (!this.sidebar || !this.sidebar.classList.contains('show')) return;
      
      // Check if touch is on interactive elements (tabs, buttons, etc.)
      const target = e.target;
      const isInteractive = target.closest('sl-tab') || 
                           target.closest('sl-button') || 
                           target.closest('button') ||
                           target.closest('input') ||
                           target.closest('select');
      
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
      this.cancelHeightAnimation();
    }

    /**
     * Handle touch move event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
      if (!this.sidebar || !this.sidebar.classList.contains('show') || !this.touchStartTime) return;
      
      const touch = e.touches[0];
      const deltaY = touch.clientY - this.touchStartY;
      const deltaX = Math.abs(touch.clientX - this.touchStartX);
      
      // Only handle vertical swipes
      if (Math.abs(deltaY) < Math.abs(deltaX)) return;
      
      // Start dragging after a small threshold
      if (Math.abs(deltaY) > 10) {
        this.isDragging = true;
      }
      
      if (this.isDragging && deltaY > 0) {
        // Prevent default only when actually swiping down
        e.preventDefault();
        
        // Limit the swipe distance
        const limitedDeltaY = Math.min(deltaY, this.maxSwipeDistance);
        this.currentTranslateY = limitedDeltaY;
        
        // Apply transform with resistance
        const resistance = 1 - (limitedDeltaY / this.maxSwipeDistance) * 0.3;
        const translateY = limitedDeltaY * resistance;
        
        this.sidebar.style.transform = `translateY(${translateY}px)`;
        this.sidebar.style.transition = 'none';
      }
    }

    /**
     * Handle touch end event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
      if (!this.sidebar || !this.isDragging) return;
      
      const touch = e.changedTouches[0];
      const deltaY = touch.clientY - this.touchStartY;
      const deltaTime = Date.now() - this.touchStartTime;
      const velocity = deltaY / deltaTime;
      
      // Determine if swipe should close the sidebar
      const shouldClose = deltaY > this.swipeThreshold || velocity > this.swipeVelocityThreshold;
      
      if (shouldClose) {
        this.closeSidebar();
      } else {
        this.resetSidebarPosition();
      }
      
      this.isDragging = false;
      this.currentTranslateY = 0;
    }

    /**
     * Close the sidebar with animation
     */
    closeSidebar() {
      if (!this.sidebar) return;
      
      // Trigger haptic feedback if available
      this.triggerHapticFeedback();
      
      // Close the sidebar using the existing close method
      if (global.HeaderController && global.HeaderController.mobile && global.HeaderController.mobile.data) {
        global.HeaderController.mobile.data.close();
      }
    }

    /**
     * Reset sidebar position after failed swipe
     */
    resetSidebarPosition() {
      if (!this.sidebar) return;
      
      this.sidebar.style.transition = `transform ${this.heightTransitionDuration}ms ${this.heightTransitionEasing}`;
      this.sidebar.style.transform = 'translateY(0)';
      
      // Remove transition after animation
      setTimeout(() => {
        if (this.sidebar) {
          this.sidebar.style.transition = '';
        }
      }, this.heightTransitionDuration);
    }

    /**
     * Handle tab change for height transitions
     * @param {CustomEvent} e - Tab change event
     */
    handleTabChange(e) {
      if (!this.sidebar) return;
      
      // Get the new active tab panel
      const activePanel = e.target.querySelector('sl-tab-panel[active]');
      if (!activePanel) return;
      
      // No height transition needed - sidebar has fixed height
      // Just ensure proper scroll position
      this.sidebar.scrollTop = 0;
    }

    /**
     * Animate height transition when switching tabs
     * @param {HTMLElement} newPanel - The new active tab panel
     */
    animateHeightTransition(newPanel) {
      if (!this.sidebar) return;
      
      // No height animation needed - sidebar has fixed height
      // Just ensure proper scroll position
      this.sidebar.scrollTop = 0;
    }

    /**
     * Calculate the height of a tab panel
     * @param {HTMLElement} panel - The tab panel element
     * @returns {number} The calculated height
     */
    calculatePanelHeight(panel) {
      if (!panel) return 0;
      
      // Temporarily make panel visible to measure height
      const originalDisplay = panel.style.display;
      const originalPosition = panel.style.position;
      const originalOpacity = panel.style.opacity;
      const originalTransform = panel.style.transform;
      const originalZIndex = panel.style.zIndex;
      
      panel.style.display = 'block';
      panel.style.position = 'relative';
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
      panel.style.zIndex = '1';
      
      const height = panel.scrollHeight;
      
      // Restore original styles
      panel.style.display = originalDisplay;
      panel.style.position = originalPosition;
      panel.style.opacity = originalOpacity;
      panel.style.transform = originalTransform;
      panel.style.zIndex = originalZIndex;
      
      return height;
    }

    /**
     * Update sidebar height based on current content
     */
    updateHeight() {
      if (!this.sidebar) return;
      
      // No height update needed - sidebar has fixed height
      // Just ensure proper scroll position
      this.sidebar.scrollTop = 0;
    }

    /**
     * Smoothly adapt sidebar height with animation
     * @param {number} heightDiff - Height difference in pixels
     * @param {number} duration - Animation duration in milliseconds
     */
    adaptHeightSmoothly(heightDiff, duration = 400) {
      if (!this.sidebar) return;
      
      // No height adaptation needed - sidebar has fixed height
      // Just ensure proper scroll position
      this.sidebar.scrollTop = 0;
    }

    /**
     * Cancel ongoing height animation
     */
    cancelHeightAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      
      if (this.sidebar) {
        this.sidebar.style.transition = '';
      }
      
      this.isAnimating = false;
    }

    /**
     * Mobile animation utility functions
     */
    
    /**
     * Apply mobile animation to an element
     * @param {HTMLElement} element - The element to animate
     * @param {string} preset - Animation preset (fast, normal, slow, bounce)
     * @param {Object} properties - CSS properties to animate
     * @returns {Promise} Promise that resolves when animation completes
     */
    animateElement(element, preset = 'normal', properties = {}) {
      if (!element) return Promise.resolve();
      
      const animation = this.mobileAnimationPresets[preset] || this.mobileAnimationPresets.normal;
      
      return new Promise((resolve) => {
        // Apply transition
        element.style.transition = `all ${animation.duration}ms ${animation.easing}`;
        
        // Apply properties
        Object.keys(properties).forEach(property => {
          element.style[property] = properties[property];
        });
        
        // Resolve after animation completes
        setTimeout(() => {
          element.style.transition = '';
          resolve();
        }, animation.duration);
      });
    }
    
    /**
     * Apply mobile slide animation
     * @param {HTMLElement} element - The element to animate
     * @param {string} direction - Slide direction (up, down, left, right)
     * @param {boolean} show - Whether to show or hide the element
     * @param {string} preset - Animation preset
     * @returns {Promise} Promise that resolves when animation completes
     */
    slideElement(element, direction = 'up', show = true, preset = 'normal') {
      if (!element) return Promise.resolve();
      
      const transforms = {
        up: show ? 'translateY(0)' : 'translateY(-100%)',
        down: show ? 'translateY(0)' : 'translateY(100%)',
        left: show ? 'translateX(0)' : 'translateX(-100%)',
        right: show ? 'translateX(0)' : 'translateX(100%)'
      };
      
      const properties = {
        transform: transforms[direction] || transforms.up,
        opacity: show ? '1' : '0'
      };
      
      return this.animateElement(element, preset, properties);
    }
    
    /**
     * Apply mobile fade animation
     * @param {HTMLElement} element - The element to animate
     * @param {boolean} show - Whether to show or hide the element
     * @param {string} preset - Animation preset
     * @returns {Promise} Promise that resolves when animation completes
     */
    fadeElement(element, show = true, preset = 'normal') {
      if (!element) return Promise.resolve();
      
      const properties = {
        opacity: show ? '1' : '0'
      };
      
      return this.animateElement(element, preset, properties);
    }
    
    /**
     * Enhanced haptic feedback utility
     * @param {string} type - Haptic type (light, medium, heavy, success, warning, error)
     */
    triggerHapticFeedback(type = 'light') {
      try {
        // Check if haptic feedback is available
        if (navigator.vibrate) {
          const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 50, 10],
            warning: [20, 50, 20],
            error: [30, 100, 30]
          };
          
          const pattern = patterns[type] || patterns.light;
          navigator.vibrate(pattern);
        }
      } catch (e) {
        // Ignore errors if vibration is not supported
        console.debug('Haptic feedback not supported:', e);
      }
    }
    
    /**
     * Add mobile touch feedback to an element
     * @param {HTMLElement} element - The element to add touch feedback to
     * @param {string} hapticType - Haptic feedback type
     */
    addTouchFeedback(element, hapticType = 'light') {
      if (!element) return;
      
      // Add mobile touch feedback class
      element.classList.add('mobile-touch-feedback', 'mobile-haptic');
      
      // Add touch event listeners
      const handleTouchStart = () => {
        this.triggerHapticFeedback(hapticType);
      };
      
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      
      // Store reference for cleanup
      if (!element._mobileTouchHandlers) {
        element._mobileTouchHandlers = [];
      }
      element._mobileTouchHandlers.push({ type: 'touchstart', handler: handleTouchStart });
    }
    
    /**
     * Remove mobile touch feedback from an element
     * @param {HTMLElement} element - The element to remove touch feedback from
     */
    removeTouchFeedback(element) {
      if (!element || !element._mobileTouchHandlers) return;
      
      // Remove classes
      element.classList.remove('mobile-touch-feedback', 'mobile-haptic');
      
      // Remove event listeners
      element._mobileTouchHandlers.forEach(({ type, handler }) => {
        element.removeEventListener(type, handler);
      });
      
      delete element._mobileTouchHandlers;
    }

    /**
     * Clean up event listeners
     */
    destroy() {
      if (this.sidebar) {
        this.sidebar.removeEventListener('touchstart', this.handleTouchStart);
        this.sidebar.removeEventListener('touchmove', this.handleTouchMove);
        this.sidebar.removeEventListener('touchend', this.handleTouchEnd);
        
        const tabGroup = this.sidebar.querySelector('sl-tab-group');
        if (tabGroup) {
          tabGroup.removeEventListener('sl-change', this.handleTabChange);
        }
      }
      
      this.cancelHeightAnimation();
      this.sidebar = null;
    }
  }

  // Create global instance
  global.MobileAnimationController = MobileAnimationController;
  global.MobileAnimations = new MobileAnimationController();

  // Global mobile animation utilities
  global.MobileAnimationUtils = {
    /**
     * Apply mobile animation to an element
     * @param {HTMLElement} element - The element to animate
     * @param {string} preset - Animation preset (fast, normal, slow, bounce)
     * @param {Object} properties - CSS properties to animate
     * @returns {Promise} Promise that resolves when animation completes
     */
    animate: (element, preset = 'normal', properties = {}) => {
      return global.MobileAnimations.animateElement(element, preset, properties);
    },
    
    /**
     * Apply mobile slide animation
     * @param {HTMLElement} element - The element to animate
     * @param {string} direction - Slide direction (up, down, left, right)
     * @param {boolean} show - Whether to show or hide the element
     * @param {string} preset - Animation preset
     * @returns {Promise} Promise that resolves when animation completes
     */
    slide: (element, direction = 'up', show = true, preset = 'normal') => {
      return global.MobileAnimations.slideElement(element, direction, show, preset);
    },
    
    /**
     * Apply mobile fade animation
     * @param {HTMLElement} element - The element to animate
     * @param {boolean} show - Whether to show or hide the element
     * @param {string} preset - Animation preset
     * @returns {Promise} Promise that resolves when animation completes
     */
    fade: (element, show = true, preset = 'normal') => {
      return global.MobileAnimations.fadeElement(element, show, preset);
    },
    
    /**
     * Trigger haptic feedback
     * @param {string} type - Haptic type (light, medium, heavy, success, warning, error)
     */
    haptic: (type = 'light') => {
      return global.MobileAnimations.triggerHapticFeedback(type);
    },
    
    /**
     * Add mobile touch feedback to an element
     * @param {HTMLElement} element - The element to add touch feedback to
     * @param {string} hapticType - Haptic feedback type
     */
    addTouchFeedback: (element, hapticType = 'light') => {
      return global.MobileAnimations.addTouchFeedback(element, hapticType);
    },
    
    /**
     * Remove mobile touch feedback from an element
     * @param {HTMLElement} element - The element to remove touch feedback from
     */
    removeTouchFeedback: (element) => {
      return global.MobileAnimations.removeTouchFeedback(element);
    }
  };

  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (!global.MobileAnimations) {
      global.MobileAnimations = new MobileAnimationController();
    }
  });

})(window);
