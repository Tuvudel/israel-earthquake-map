// Animation Controller for managing smooth, performant animations
// Provides centralized animation management with queue system and presets
(function (global) {
  class AnimationController {
    constructor() {
      this.queue = [];
      this.isAnimating = false;
      this.activeAnimations = new Set();
      this.animationPresets = {
        fast: { duration: 150, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        normal: { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        slow: { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        bounce: { duration: 400, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
        mobile: { duration: 400, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
      };
      
      // Check for reduced motion preference
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // Listen for reduced motion changes
      this.setupReducedMotionListener();
    }

    /**
     * Setup listener for reduced motion preference changes
     */
    setupReducedMotionListener() {
      try {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addEventListener('change', (e) => {
          this.prefersReducedMotion = e.matches;
        });
      } catch (_) {}
    }

    /**
     * Queue an animation to prevent conflicts
     * @param {Function} animation - Animation function that returns a Promise
     * @param {string} id - Optional animation ID for tracking
     */
    queueAnimation(animation, id = null) {
      const animationTask = {
        id,
        animation,
        timestamp: Date.now()
      };
      
      this.queue.push(animationTask);
      this.processQueue();
      
      return animationTask;
    }

    /**
     * Process the animation queue
     */
    async processQueue() {
      if (this.isAnimating || this.queue.length === 0) return;
      
      this.isAnimating = true;
      
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        
        try {
          // Skip animations if user prefers reduced motion
          if (this.prefersReducedMotion) {
            // Execute immediately without animation
            await task.animation();
          } else {
            await task.animation();
          }
        } catch (error) {
          console.warn('Animation failed:', error);
        }
      }
      
      this.isAnimating = false;
    }

    /**
     * Animate CSS properties with smooth transitions
     * @param {HTMLElement} element - Target element
     * @param {Object} properties - CSS properties to animate
     * @param {string} preset - Animation preset name
     * @returns {Promise} Animation completion promise
     */
    animateCSS(element, properties, preset = 'normal') {
      return new Promise((resolve) => {
        if (!element || this.prefersReducedMotion) {
          // Apply properties immediately without animation
          Object.assign(element.style, properties);
          resolve();
          return;
        }

        const config = this.animationPresets[preset] || this.animationPresets.normal;
        const animationId = `animation_${Date.now()}_${Math.random()}`;
        
        // Add to active animations
        this.activeAnimations.add(animationId);
        
        // Set transition
        element.style.transition = `all ${config.duration}ms ${config.easing}`;
        
        // Apply properties
        Object.assign(element.style, properties);
        
        // Listen for transition end
        const handleTransitionEnd = (e) => {
          if (e.target === element) {
            element.removeEventListener('transitionend', handleTransitionEnd);
            element.removeEventListener('transitioncancel', handleTransitionEnd);
            this.activeAnimations.delete(animationId);
            resolve();
          }
        };
        
        element.addEventListener('transitionend', handleTransitionEnd);
        element.addEventListener('transitioncancel', handleTransitionEnd);
        
        // Fallback timeout
        setTimeout(() => {
          if (this.activeAnimations.has(animationId)) {
            element.removeEventListener('transitionend', handleTransitionEnd);
            element.removeEventListener('transitioncancel', handleTransitionEnd);
            this.activeAnimations.delete(animationId);
            resolve();
          }
        }, config.duration + 100);
      });
    }

    /**
     * Animate element opacity with fade effect
     * @param {HTMLElement} element - Target element
     * @param {number} opacity - Target opacity (0-1)
     * @param {string} preset - Animation preset
     * @returns {Promise} Animation completion promise
     */
    fade(element, opacity, preset = 'normal') {
      return this.animateCSS(element, { opacity: opacity.toString() }, preset);
    }

    /**
     * Animate element transform with slide effect
     * @param {HTMLElement} element - Target element
     * @param {string} transform - Transform value
     * @param {string} preset - Animation preset
     * @returns {Promise} Animation completion promise
     */
    slide(element, transform, preset = 'normal') {
      return this.animateCSS(element, { transform }, preset);
    }

    /**
     * Animate element width with smooth resize
     * @param {HTMLElement} element - Target element
     * @param {string} width - Target width
     * @param {string} preset - Animation preset
     * @returns {Promise} Animation completion promise
     */
    resize(element, width, preset = 'normal') {
      return this.animateCSS(element, { width }, preset);
    }

    /**
     * Cross-fade between two elements
     * @param {HTMLElement} elementOut - Element to fade out
     * @param {HTMLElement} elementIn - Element to fade in
     * @param {string} preset - Animation preset
     * @returns {Promise} Animation completion promise
     */
    crossFade(elementOut, elementIn, preset = 'normal') {
      return new Promise(async (resolve) => {
        if (this.prefersReducedMotion) {
          // Immediate switch
          elementOut.style.opacity = '0';
          elementIn.style.opacity = '1';
          resolve();
          return;
        }

        // Ensure elements are positioned correctly
        if (elementOut.style.position !== 'absolute') {
          elementOut.style.position = 'absolute';
        }
        if (elementIn.style.position !== 'absolute') {
          elementIn.style.position = 'absolute';
        }

        // Start fade out and fade in simultaneously
        const fadeOut = this.fade(elementOut, 0, preset);
        const fadeIn = this.fade(elementIn, 1, preset);

        await Promise.all([fadeOut, fadeIn]);
        resolve();
      });
    }

    /**
     * Stop all active animations
     */
    stopAllAnimations() {
      this.activeAnimations.clear();
      this.queue = [];
      this.isAnimating = false;
    }

    /**
     * Check if animations are currently running
     * @returns {boolean} True if animations are active
     */
    isAnimating() {
      return this.isAnimating || this.activeAnimations.size > 0;
    }

    /**
     * Get animation preset configuration
     * @param {string} preset - Preset name
     * @returns {Object} Preset configuration
     */
    getPreset(preset) {
      return this.animationPresets[preset] || this.animationPresets.normal;
    }

    /**
     * Create a custom animation preset
     * @param {string} name - Preset name
     * @param {Object} config - Preset configuration
     */
    addPreset(name, config) {
      this.animationPresets[name] = config;
    }
  }

  // Create global instance
  global.AnimationController = AnimationController;
  global.Animations = new AnimationController();

  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (!global.Animations) {
      global.Animations = new AnimationController();
    }
  });

})(window);
