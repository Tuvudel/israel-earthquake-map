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
      if (!this.sidebar || this.isAnimating) return;
      
      // Get the new active tab panel
      const activePanel = e.target.querySelector('sl-tab-panel[active]');
      if (!activePanel) return;
      
      // Animate height transition
      this.animateHeightTransition(activePanel);
    }

    /**
     * Animate height transition when switching tabs
     * @param {HTMLElement} newPanel - The new active tab panel
     */
    animateHeightTransition(newPanel) {
      if (!this.sidebar || this.isAnimating) return;
      
      this.isAnimating = true;
      
      // Get current and new heights
      const currentHeight = this.sidebar.scrollHeight;
      const newHeight = this.calculatePanelHeight(newPanel);
      
      // If heights are similar, no animation needed
      if (Math.abs(currentHeight - newHeight) < 10) {
        this.isAnimating = false;
        return;
      }
      
      // Preserve scroll position
      const scrollTop = this.sidebar.scrollTop;
      
      // Animate height change
      this.sidebar.style.transition = `height ${this.heightTransitionDuration}ms ${this.heightTransitionEasing}`;
      this.sidebar.style.height = `${newHeight}px`;
      
      // Restore scroll position after animation
      setTimeout(() => {
        if (this.sidebar) {
          this.sidebar.scrollTop = Math.min(scrollTop, this.sidebar.scrollHeight);
          this.sidebar.style.transition = '';
          this.sidebar.style.height = '';
          this.isAnimating = false;
        }
      }, this.heightTransitionDuration);
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
      
      const activePanel = this.sidebar.querySelector('sl-tab-panel[active]');
      if (activePanel) {
        const height = this.calculatePanelHeight(activePanel);
        this.sidebar.style.height = `${height}px`;
      }
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
     * Trigger haptic feedback if available
     */
    triggerHapticFeedback() {
      try {
        // Check if haptic feedback is available
        if (navigator.vibrate) {
          navigator.vibrate(50); // Short vibration
        }
      } catch (e) {
        // Ignore errors if vibration is not supported
      }
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

  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (!global.MobileAnimations) {
      global.MobileAnimations = new MobileAnimationController();
    }
  });

})(window);
