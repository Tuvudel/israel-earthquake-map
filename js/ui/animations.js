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

  /**
   * Map Animation Controller - Extends AnimationController for map-specific operations
   * Provides coordinated map resize operations with sidebar animations
   */
  class MapAnimationController extends AnimationController {
    constructor() {
      super();
      this.mapResizeQueue = [];
      this.performanceMetrics = {
        mapResize: { total: 0, count: 0, average: 0, min: Infinity, max: 0 },
        animationCoordination: { total: 0, count: 0, average: 0, min: Infinity, max: 0 },
        frameRate: { frames: [], average: 0, dropped: 0 },
        memory: { samples: [], average: 0, peak: 0 }
      };
      this.performanceBudgets = {
        mapResize: 50, // 50ms budget for map resize (optimized)
        animationCoordination: 30, // 30ms budget for coordination (optimized)
        frameRate: 30, // Minimum 30fps
        memory: 50 * 1024 * 1024 // 50MB memory budget
      };
      this.errorLog = [];
      this.isMonitoring = false;
      this.frameCount = 0;
      this.lastFrameTime = performance.now();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
    }

    /**
     * Queue a map resize operation with proper animation coordination
     * @param {Function} resizeFunction - Map resize function to execute
     * @param {string} id - Optional operation ID for tracking
     * @returns {Promise} Resize completion promise
     */
    queueMapResize(resizeFunction, id = null) {
      return this.queueAnimation(async () => {
        const startTime = performance.now();
        
        try {
          // Wait for current animations to complete (optimized)
          await this.waitForAnimationsComplete();
          
          // Perform map resize with optimized timing
          await new Promise(resolve => {
            // Use double requestAnimationFrame for better timing
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                try {
                  resizeFunction();
                  resolve();
                } catch (error) {
                  console.warn('Map resize failed:', error);
                  resolve();
                }
              });
            });
          });
          
          // Record performance metrics
          const duration = performance.now() - startTime;
          this.recordPerformance('mapResize', duration);
          
        } catch (error) {
          console.warn('Map resize coordination failed:', error);
          // Fallback: execute resize immediately
          try {
            resizeFunction();
          } catch (fallbackError) {
            console.error('Map resize fallback failed:', fallbackError);
          }
        }
      }, id || 'map-resize');
    }

    /**
     * Wait for all current animations to complete
     * @returns {Promise} Promise that resolves when animations are complete
     */
    async waitForAnimationsComplete() {
      const startTime = performance.now();
      
      // Wait for active animations to complete (with timeout)
      let timeout = 0;
      const maxTimeout = 50; // Maximum 50ms wait
      
      while (this.activeAnimations.size > 0 && timeout < maxTimeout) {
        await new Promise(resolve => setTimeout(resolve, 8)); // ~120fps for faster response
        timeout += 8;
      }
      
      // Wait for CSS transitions to complete (reduced wait time)
      await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms to 50ms
      
      // Additional wait for layout recalculation
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Record coordination performance
      const duration = performance.now() - startTime;
      this.recordPerformance('animationCoordination', duration);
    }

    /**
     * Record performance metrics for monitoring
     * @param {string} operation - Operation name
     * @param {number} duration - Duration in milliseconds
     */
    recordPerformance(operation, duration) {
      if (this.performanceMetrics[operation]) {
        const metrics = this.performanceMetrics[operation];
        metrics.total += duration;
        metrics.count += 1;
        metrics.average = metrics.total / metrics.count;
        metrics.min = Math.min(metrics.min, duration);
        metrics.max = Math.max(metrics.max, duration);
        
        // Check against performance budget
        const budget = this.performanceBudgets[operation];
        if (budget && duration > budget) {
          const warning = `${operation} exceeded budget: ${duration.toFixed(2)}ms > ${budget}ms`;
          console.warn(warning);
          this.logError('performance_budget_exceeded', warning, { operation, duration, budget });
        }
      }
    }

    /**
     * Log errors for debugging and monitoring
     * @param {string} type - Error type
     * @param {string} message - Error message
     * @param {Object} context - Additional context
     */
    logError(type, message, context = {}) {
      const error = {
        type,
        message,
        context,
        timestamp: Date.now(),
        stack: new Error().stack
      };
      
      this.errorLog.push(error);
      
      // Keep only last 100 errors
      if (this.errorLog.length > 100) {
        this.errorLog = this.errorLog.slice(-100);
      }
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
      if (this.isMonitoring) return;
      
      this.isMonitoring = true;
      this.monitorFrameRate();
      this.monitorMemory();
    }

    /**
     * Monitor frame rate performance
     */
    monitorFrameRate() {
      if (!this.isMonitoring) return;
      
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;
      
      if (deltaTime > 0) {
        const fps = 1000 / deltaTime;
        this.performanceMetrics.frameRate.frames.push(fps);
        
        // Keep only last 60 frame samples
        if (this.performanceMetrics.frameRate.frames.length > 60) {
          this.performanceMetrics.frameRate.frames = this.performanceMetrics.frameRate.frames.slice(-60);
        }
        
        // Calculate average frame rate
        const totalFps = this.performanceMetrics.frameRate.frames.reduce((sum, f) => sum + f, 0);
        this.performanceMetrics.frameRate.average = totalFps / this.performanceMetrics.frameRate.frames.length;
        
        // Check for dropped frames
        if (fps < this.performanceBudgets.frameRate) {
          this.performanceMetrics.frameRate.dropped++;
          this.logError('frame_rate_drop', `Frame rate dropped to ${fps.toFixed(1)}fps`, { fps, budget: this.performanceBudgets.frameRate });
        }
      }
      
      this.frameCount++;
      requestAnimationFrame(() => this.monitorFrameRate());
    }

    /**
     * Monitor memory usage
     */
    monitorMemory() {
      if (!this.isMonitoring) return;
      
      if ('memory' in performance) {
        const memory = performance.memory;
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        
        this.performanceMetrics.memory.samples.push(usedMB);
        
        // Keep only last 60 memory samples
        if (this.performanceMetrics.memory.samples.length > 60) {
          this.performanceMetrics.memory.samples = this.performanceMetrics.memory.samples.slice(-60);
        }
        
        // Calculate average and peak memory usage
        const totalMemory = this.performanceMetrics.memory.samples.reduce((sum, m) => sum + m, 0);
        this.performanceMetrics.memory.average = totalMemory / this.performanceMetrics.memory.samples.length;
        this.performanceMetrics.memory.peak = Math.max(...this.performanceMetrics.memory.samples);
        
        // Check memory budget
        const memoryBudgetMB = this.performanceBudgets.memory / (1024 * 1024);
        if (usedMB > memoryBudgetMB) {
          this.logError('memory_budget_exceeded', `Memory usage exceeded budget: ${usedMB.toFixed(1)}MB > ${memoryBudgetMB}MB`, { usedMB, budget: memoryBudgetMB });
        }
      }
      
      // Sample memory every 5 seconds
      setTimeout(() => this.monitorMemory(), 5000);
    }

    /**
     * Get comprehensive performance metrics for monitoring
     * @returns {Object} Performance metrics with detailed information
     */
    getPerformanceMetrics() {
      return {
        ...this.performanceMetrics,
        summary: this.generatePerformanceSummary(),
        recommendations: this.generatePerformanceRecommendations()
      };
    }

    /**
     * Generate performance summary
     * @returns {Object} Performance summary
     */
    generatePerformanceSummary() {
      const { mapResize, animationCoordination, frameRate, memory } = this.performanceMetrics;
      
      return {
        overall: this.calculateOverallPerformance(),
        mapResize: {
          average: mapResize.average.toFixed(2) + 'ms',
          min: mapResize.min === Infinity ? 'N/A' : mapResize.min.toFixed(2) + 'ms',
          max: mapResize.max.toFixed(2) + 'ms',
          count: mapResize.count
        },
        animationCoordination: {
          average: animationCoordination.average.toFixed(2) + 'ms',
          min: animationCoordination.min === Infinity ? 'N/A' : animationCoordination.min.toFixed(2) + 'ms',
          max: animationCoordination.max.toFixed(2) + 'ms',
          count: animationCoordination.count
        },
        frameRate: {
          average: frameRate.average.toFixed(1) + 'fps',
          dropped: frameRate.dropped,
          samples: frameRate.frames.length
        },
        memory: {
          average: memory.average.toFixed(1) + 'MB',
          peak: memory.peak.toFixed(1) + 'MB',
          samples: memory.samples.length
        }
      };
    }

    /**
     * Calculate overall performance score (0-100)
     * @returns {number} Performance score
     */
    calculateOverallPerformance() {
      let score = 100;
      
      // Deduct points for performance issues
      const { mapResize, animationCoordination, frameRate, memory } = this.performanceMetrics;
      
      // Map resize performance
      if (mapResize.average > this.performanceBudgets.mapResize) {
        score -= 20;
      }
      
      // Animation coordination performance
      if (animationCoordination.average > this.performanceBudgets.animationCoordination) {
        score -= 15;
      }
      
      // Frame rate performance
      if (frameRate.average < this.performanceBudgets.frameRate) {
        score -= 25;
      }
      
      // Memory performance
      if (memory.average > this.performanceBudgets.memory / (1024 * 1024)) {
        score -= 10;
      }
      
      return Math.max(0, score);
    }

    /**
     * Generate performance recommendations
     * @returns {Array} Array of performance recommendations
     */
    generatePerformanceRecommendations() {
      const recommendations = [];
      const { mapResize, animationCoordination, frameRate, memory } = this.performanceMetrics;
      
      if (mapResize.average > this.performanceBudgets.mapResize) {
        recommendations.push('Map resize operations are taking too long. Consider optimizing map canvas preservation.');
      }
      
      if (animationCoordination.average > this.performanceBudgets.animationCoordination) {
        recommendations.push('Animation coordination is slow. Consider reducing animation complexity.');
      }
      
      if (frameRate.average < this.performanceBudgets.frameRate) {
        recommendations.push('Frame rate is below target. Consider reducing animation complexity or optimizing rendering.');
      }
      
      if (memory.average > this.performanceBudgets.memory / (1024 * 1024)) {
        recommendations.push('Memory usage is high. Consider implementing memory cleanup or reducing data caching.');
      }
      
      if (this.errorLog.length > 10) {
        recommendations.push('High error rate detected. Check error logs for debugging information.');
      }
      
      return recommendations;
    }

    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics() {
      this.performanceMetrics = {
        mapResize: { total: 0, count: 0, average: 0, min: Infinity, max: 0 },
        animationCoordination: { total: 0, count: 0, average: 0, min: Infinity, max: 0 },
        frameRate: { frames: [], average: 0, dropped: 0 },
        memory: { samples: [], average: 0, peak: 0 }
      };
      this.errorLog = [];
    }

    /**
     * Get error log for debugging
     * @returns {Array} Array of logged errors
     */
    getErrorLog() {
      return [...this.errorLog];
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
      this.errorLog = [];
    }

    /**
     * Stop performance monitoring
     */
    stopPerformanceMonitoring() {
      this.isMonitoring = false;
    }

    /**
     * Force immediate map resize (for critical cases)
     * @param {Function} resizeFunction - Map resize function to execute
     */
    forceMapResize(resizeFunction) {
      requestAnimationFrame(() => {
        try {
          resizeFunction();
        } catch (error) {
          console.warn('Force map resize failed:', error);
        }
      });
    }
  }

  // Create global instances
  global.AnimationController = AnimationController;
  global.MapAnimationController = MapAnimationController;
  global.Animations = new AnimationController();
  global.MapAnimations = new MapAnimationController();

  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (!global.Animations) {
      global.Animations = new AnimationController();
    }
    if (!global.MapAnimations) {
      global.MapAnimations = new MapAnimationController();
    }
  });

})(window);
