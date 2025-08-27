// Logger utility for consistent logging across the application
(function (global) {
  class Logger {
    constructor() {
      // Environment detection
      this.isDevelopment = this.detectDevelopmentEnvironment();
      
      // Get log level from config or use environment-appropriate default
      const configLevel = global.LOG_LEVEL || 'info';
      this.logLevel = this.isDevelopment ? configLevel : 'warn'; // Production defaults to warn
      
      // Production-appropriate defaults
      this.enableConsole = true; // Always enable console for errors/warnings
      this.enablePerformanceMonitoring = this.isDevelopment; // Only in development
      this.enableStackTraces = this.isDevelopment; // Only in development
      
      this.performanceData = {
        logs: [],
        metrics: {},
        errors: []
      };
      
      // Log initialization
      if (this.isDevelopment) {
        this.info('Logger initialized in development mode', { 
          logLevel: this.logLevel, 
          performanceMonitoring: this.enablePerformanceMonitoring 
        });
      }
    }

    /**
     * Detect if we're in development environment
     * @returns {boolean} True if in development
     */
    detectDevelopmentEnvironment() {
      // Check for development indicators
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
      const hasDebugParam = window.location.search.includes('debug=true');
      const isGitHubPages = window.location.hostname.includes('github.io');
      
      // Development if localhost, has debug param, or explicitly set
      // GitHub Pages and other hosted environments are production
      return isLocalhost || hasDebugParam || (global.DEBUG_MODE === true);
    }

    setLogLevel(level) {
      this.logLevel = level;
      if (this.isDevelopment) {
        this.info(`Log level changed to: ${level}`);
      }
    }

    debug(message, data = null) {
      if (this.shouldLog('debug')) {
        this.log('debug', message, data);
      }
    }

    info(message, data = null) {
      if (this.shouldLog('info')) {
        this.log('info', message, data);
      }
    }

    warn(message, data = null) {
      if (this.shouldLog('warn')) {
        this.log('warn', message, data);
      }
    }

    error(message, data = null) {
      if (this.shouldLog('error')) {
        this.log('error', message, data);
      }
    }

    shouldLog(level) {
      const levels = { debug: 0, info: 1, warn: 2, error: 3 };
      return levels[level] >= levels[this.logLevel];
    }

    log(level, message, data) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        data
      };

      // Only capture stack traces in development
      if (this.enableStackTraces) {
        logEntry.stack = new Error().stack;
      }

      // Store in performance data only in development
      if (this.enablePerformanceMonitoring) {
        this.performanceData.logs.push(logEntry);
        
        // Keep only last 100 logs in development (reduced from 1000)
        if (this.performanceData.logs.length > 100) {
          this.performanceData.logs = this.performanceData.logs.slice(-100);
        }
      }

      // Console output
      if (this.enableConsole) {
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        if (data) {
          console[level](prefix, message, data);
        } else {
          console[level](prefix, message);
        }
      }
    }

    /**
     * Performance monitoring utilities (development only)
     */
    
    /**
     * Get comprehensive performance report
     * @returns {Object} Complete performance report
     */
    getPerformanceReport() {
      if (!this.enablePerformanceMonitoring) {
        return { message: 'Performance monitoring disabled in production' };
      }

      const report = {
        timestamp: new Date().toISOString(),
        animationSystem: this.getAnimationSystemMetrics(),
        memory: this.getMemoryMetrics(),
        errors: this.getErrorSummary(),
        recommendations: this.generateRecommendations()
      };

      return report;
    }

    /**
     * Get animation system performance metrics
     * @returns {Object} Animation system metrics
     */
    getAnimationSystemMetrics() {
      if (global.MapAnimations && this.enablePerformanceMonitoring) {
        return global.MapAnimations.getPerformanceMetrics();
      }
      return null;
    }

    /**
     * Get memory usage metrics
     * @returns {Object} Memory metrics
     */
    getMemoryMetrics() {
      if ('memory' in performance && this.enablePerformanceMonitoring) {
        const memory = performance.memory;
        return {
          used: this.formatBytes(memory.usedJSHeapSize),
          total: this.formatBytes(memory.totalJSHeapSize),
          limit: this.formatBytes(memory.jsHeapSizeLimit),
          percentage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1) + '%'
        };
      }
      return null;
    }

    /**
     * Get error summary
     * @returns {Object} Error summary
     */
    getErrorSummary() {
      if (!this.enablePerformanceMonitoring) {
        return { message: 'Error tracking disabled in production' };
      }

      const errors = this.performanceData.logs.filter(log => log.level === 'error');
      const errorTypes = {};
      
      errors.forEach(error => {
        const type = error.message.split(':')[0] || 'Unknown';
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });

      return {
        total: errors.length,
        types: errorTypes,
        recent: errors.slice(-10) // Last 10 errors
      };
    }

    /**
     * Generate performance recommendations
     * @returns {Array} Array of recommendations
     */
    generateRecommendations() {
      if (!this.enablePerformanceMonitoring) {
        return ['Performance monitoring disabled in production'];
      }

      const recommendations = [];
      
      // Check animation system
      if (global.MapAnimations) {
        const animMetrics = global.MapAnimations.getPerformanceMetrics();
        if (animMetrics && animMetrics.recommendations) {
          recommendations.push(...animMetrics.recommendations);
        }
      }
      
      // Check memory usage
      const memory = this.getMemoryMetrics();
      if (memory && parseFloat(memory.percentage) > 80) {
        recommendations.push('Memory usage is high. Consider implementing cleanup or reducing data caching.');
      }
      
      // Check error rate
      const errors = this.getErrorSummary();
      if (errors.total > 20) {
        recommendations.push('High error rate detected. Review error logs for debugging.');
      }
      
      return recommendations;
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes to format
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Export performance data for debugging
     * @returns {Object} Exportable performance data
     */
    exportPerformanceData() {
      if (!this.enablePerformanceMonitoring) {
        return { message: 'Performance data export disabled in production' };
      }

      return {
        timestamp: new Date().toISOString(),
        logs: this.performanceData.logs,
        animationSystem: this.getAnimationSystemMetrics(),
        memory: this.getMemoryMetrics(),
        errors: this.getErrorSummary()
      };
    }

    /**
     * Clear all performance data
     */
    clearPerformanceData() {
      this.performanceData = {
        logs: [],
        metrics: {},
        errors: []
      };
      
      // Clear animation system metrics
      if (global.MapAnimations) {
        global.MapAnimations.resetPerformanceMetrics();
      }
    }

    /**
     * Enable/disable performance monitoring
     * @param {boolean} enabled - Whether to enable monitoring
     */
    setPerformanceMonitoring(enabled) {
      this.enablePerformanceMonitoring = enabled;
      
      if (global.MapAnimations) {
        if (enabled) {
          global.MapAnimations.startPerformanceMonitoring();
        } else {
          global.MapAnimations.stopPerformanceMonitoring();
        }
      }
    }

    /**
     * Get current environment info
     * @returns {Object} Environment information
     */
    getEnvironmentInfo() {
      return {
        isDevelopment: this.isDevelopment,
        logLevel: this.logLevel,
        enableConsole: this.enableConsole,
        enablePerformanceMonitoring: this.enablePerformanceMonitoring,
        enableStackTraces: this.enableStackTraces
      };
    }
  }

  // Create global instance
  global.Logger = new Logger();

  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (!global.Logger) {
      global.Logger = new Logger();
    }
  });

})(window);
