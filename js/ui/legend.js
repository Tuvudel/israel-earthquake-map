/**
 * Legend Controller
 * Handles mobile legend stages (compact/expanded) functionality
 */
class LegendController {
    constructor() {
        this.legend = null;
        this.toggleBtn = null;
        this.isExpanded = false;
        this.isMobile = false;
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.detectMobile();
        this.setInitialState();
    }
    
    cacheElements() {
        this.legend = document.getElementById('map-legend');
        this.toggleBtn = this.legend?.querySelector('.legend-toggle-btn');
    }
    
    setupEventListeners() {
        if (!this.toggleBtn) return;
        
        // Toggle button click
        this.toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleLegend();
        });
        
        // Keyboard support
        this.toggleBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleLegend();
            }
        });
        
        // Handle window resize for mobile detection
        window.addEventListener('resize', this.debounce(() => {
            this.detectMobile();
            this.updateState();
        }, 250));
    }
    
    detectMobile() {
        this.isMobile = window.innerWidth <= 768;
    }
    
    setInitialState() {
        if (!this.legend) return;
        
        // On mobile, start in compact mode
        if (this.isMobile) {
            this.isExpanded = false;
            this.legend.classList.add('legend-compact');
            this.updateButtonState();
        } else {
            // On desktop, always show expanded
            this.isExpanded = true;
            this.legend.classList.add('legend-expanded');
            this.updateButtonState();
        }
    }
    
    toggleLegend() {
        if (this.isAnimating) return;
        
        // Only allow toggling on mobile
        if (!this.isMobile) return;
        
        this.isAnimating = true;
        
        if (this.isExpanded) {
            this.collapseLegend();
        } else {
            this.expandLegend();
        }
        
        // Reset animation flag after transition
        setTimeout(() => {
            this.isAnimating = false;
        }, this.getAnimationDuration());
    }
    
    expandLegend() {
        if (!this.legend) return;
        
        this.isExpanded = true;
        this.legend.classList.remove('legend-compact');
        this.legend.classList.add('legend-expanded');
        this.updateButtonState();
        
        // Trigger haptic feedback on mobile
        this.triggerHapticFeedback();
    }
    
    collapseLegend() {
        if (!this.legend) return;
        
        this.isExpanded = false;
        this.legend.classList.remove('legend-expanded');
        this.legend.classList.add('legend-compact');
        this.updateButtonState();
        
        // Trigger haptic feedback on mobile
        this.triggerHapticFeedback();
    }
    
    updateButtonState() {
        if (!this.toggleBtn) return;
        
        const isExpanded = this.isExpanded;
        
        // Update ARIA attributes
        this.toggleBtn.setAttribute('aria-expanded', isExpanded.toString());
        
        // Update button label
        const label = isExpanded ? 'Collapse legend' : 'Expand legend';
        this.toggleBtn.setAttribute('aria-label', label);
        
        // Update icon rotation
        const icon = this.toggleBtn.querySelector('.legend-toggle-icon');
        if (icon) {
            icon.style.transform = isExpanded ? 'rotate(45deg)' : 'rotate(0deg)';
        }
    }
    
    updateState() {
        if (!this.isMobile) {
            // On desktop, always show expanded
            this.isExpanded = true;
            this.legend.classList.remove('legend-compact');
            this.legend.classList.add('legend-expanded');
        } else {
            // On mobile, maintain current state
            if (this.isExpanded) {
                this.legend.classList.remove('legend-compact');
                this.legend.classList.add('legend-expanded');
            } else {
                this.legend.classList.remove('legend-expanded');
                this.legend.classList.add('legend-compact');
            }
        }
        this.updateButtonState();
    }
    
    triggerHapticFeedback() {
        // Simple haptic feedback for mobile devices
        if ('vibrate' in navigator && this.isMobile) {
            try {
                navigator.vibrate(10);
            } catch (e) {
                // Ignore vibration errors
            }
        }
    }
    
    getAnimationDuration() {
        // Match CSS animation duration
        return 300; // var(--animation-duration-normal)
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Public API methods
    getState() {
        return {
            isExpanded: this.isExpanded,
            isMobile: this.isMobile,
            isAnimating: this.isAnimating
        };
    }
    
    setExpanded(expanded) {
        if (this.isAnimating) return;
        
        if (expanded) {
            this.expandLegend();
        } else {
            this.collapseLegend();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegendController;
} else {
    // Global scope for browser
    window.LegendController = LegendController;
}
