// Tab Animation Controller for managing smooth tab switching animations
// Integrates with existing AnimationController and MobileAnimationController
(function (global) {
  class TabAnimationController {
    constructor() {
      this.currentTab = 'events';
      this.previousTab = null;
      this.isAnimating = false;
      this.tabGroup = null;
      this.panels = new Map();
      this.isInitialized = false;
      
      // Check for reduced motion preference
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // Bind methods to preserve context
      this.handleTabChange = this.handleTabChange.bind(this);
    }

    /**
     * Initialize the tab animation controller
     */
    initialize() {
      if (this.isInitialized) return;
      
      try {
        this.findTabElements();
        this.setupEventListeners();
        this.addAnimationClasses();
        this.isInitialized = true;
        
        if (global.Logger && global.Logger.debug) {
          global.Logger.debug('TabAnimationController initialized successfully');
          
          // Test integration with existing systems
          if (global.MobileAnimations) {
            global.Logger.debug('MobileAnimations integration available');
          }
          if (global.Animations) {
            global.Logger.debug('Animations integration available');
          }
        }
      } catch (error) {
        if (global.Logger && global.Logger.warn) {
          global.Logger.warn('Failed to initialize TabAnimationController:', error);
        }
      }
    }

    /**
     * Find tab group and panel elements
     */
    findTabElements() {
      this.tabGroup = document.querySelector('#sidebar sl-tab-group');
      
      if (!this.tabGroup) {
        throw new Error('Tab group not found');
      }

      // Find all tab panels
      const panels = this.tabGroup.querySelectorAll('sl-tab-panel');
      
      panels.forEach(panel => {
        const name = panel.getAttribute('name');
        if (name) {
          this.panels.set(name, panel);
        }
      });
      
      if (this.panels.size === 0) {
        throw new Error('No tab panels found');
      }
    }

    /**
     * Setup event listeners for tab changes
     */
    setupEventListeners() {
      if (!this.tabGroup) return;
      
      // Listen for Shoelace tab show events (this is what's actually firing)
      this.tabGroup.addEventListener('sl-tab-show', this.handleTabChange);
      
      // Also listen for sl-change events as backup
      this.tabGroup.addEventListener('sl-change', (event) => {
        // Backup event listener - no logging needed
      });
      
      // Listen for reduced motion preference changes
      try {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addEventListener('change', (e) => {
          this.prefersReducedMotion = e.matches;
        });
      } catch (_) {}
    }

    /**
     * Add animation classes to panels
     */
    addAnimationClasses() {
      this.panels.forEach((panel) => {
        // Add animation classes without interfering with Shoelace
        panel.classList.add('tab-panel-animated');
      });
    }

    /**
     * Handle tab change events from Shoelace - intercept BEFORE panel becomes visible
     * @param {CustomEvent} event - Shoelace tab change event
     */
    handleTabChange(event) {
      const targetTab = event.detail.name;
      
      if (this.isAnimating || targetTab === this.currentTab) {
        return; // Already animating or same tab
      }

      // Store previous tab and update current
      this.previousTab = this.currentTab;
      this.currentTab = targetTab;

      // Notify other systems immediately
      this.notifyTabChange(targetTab);

      // Start panel animation IMMEDIATELY to catch it before it becomes visible
      if (!this.prefersReducedMotion) {
        this.animatePanelContent(targetTab);
      }
    }

    /**
     * Add entrance animation to the newly active panel
     * @param {string} targetPanelName - Name of the target panel
     */
    async animatePanelContent(targetPanelName) {
      if (this.isAnimating) return;

      this.isAnimating = true;
      const targetPanel = this.panels.get(targetPanelName);

      if (!targetPanel) {
        this.isAnimating = false;
        return;
      }

      try {
        // Add entrance animation to the target panel
        await this.addEntranceAnimation(targetPanel);
        
      } catch (error) {
        if (global.Logger && global.Logger.warn) {
          global.Logger.warn('Panel animation failed:', error);
        }
      } finally {
        this.isAnimating = false;
      }
    }

    /**
     * Add entrance animation to a panel
     * @param {HTMLElement} panel - Panel to animate
     */
    async addEntranceAnimation(panel) {
      return new Promise((resolve) => {
        // Since we're using opacity-only animation, we don't need to control overflow
        // This prevents any interference with legitimate scrollbars
        
        // Use CSS classes with higher specificity to override Shoelace
        panel.classList.add('tab-entrance-animating');
        
        // Set initial state for entrance animation with !important
        // Use opacity-only animation to avoid scrollbar issues, but make it more dramatic
        panel.style.setProperty('opacity', '0', 'important');
        panel.style.setProperty('transform', 'translateY(0)', 'important');
        panel.style.setProperty('transition', 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)', 'important');
        
        // Use a longer delay to ensure the initial state is visible
        setTimeout(() => {
          panel.style.setProperty('opacity', '1', 'important');
        }, 10); // Small delay to ensure initial state is applied
        
        // Wait for animation to complete
        setTimeout(() => {
          // Clean up
          panel.style.removeProperty('opacity');
          panel.style.removeProperty('transform');
          panel.style.removeProperty('transition');
          panel.classList.remove('tab-entrance-animating');
          
          // No overflow control to restore since we're using opacity-only animation
          
          resolve();
        }, 400);
      });
    }

    /**
     * Notify existing systems about tab changes
     * @param {string} tabName - Name of the tab being switched to
     */
    notifyTabChange(tabName) {
      // Dispatch custom event for other systems to listen to
      const customEvent = new CustomEvent('tab-animation-change', {
        detail: {
          tabName: tabName,
          previousTab: this.previousTab,
          isAnimating: this.isAnimating
        }
      });
      document.dispatchEvent(customEvent);
    }

    /**
     * Switch to a specific tab programmatically
     * @param {string} tabName - Name of tab to switch to
     */
    switchToTab(tabName) {
      if (!this.panels.has(tabName)) {
        if (global.Logger && global.Logger.warn) {
          global.Logger.warn(`Tab "${tabName}" not found`);
        }
        return;
      }
      
      if (this.currentTab === tabName) {
        return; // Already on this tab
      }
      
      // Let Shoelace handle the tab switch naturally
      const targetTab = this.tabGroup.querySelector(`sl-tab[panel="${tabName}"]`);
      if (targetTab) {
        targetTab.click();
      }
    }

    /**
     * Get current tab state
     * @returns {Object} Current tab information
     */
    getCurrentTab() {
      return {
        name: this.currentTab,
        previous: this.previousTab,
        isAnimating: this.isAnimating
      };
    }

    /**
     * Test the tab animation system
     */
    testTabAnimation() {
      if (global.Logger && global.Logger.debug) {
        global.Logger.debug('Testing tab animation system', {
          currentTab: this.currentTab,
          availablePanels: Array.from(this.panels.keys()),
          tabGroupFound: !!this.tabGroup,
          animationSystemReady: this.isInitialized
        });
      }
      
      // Test switching to analytics tab if not already there
      if (this.currentTab === 'events') {
        this.switchToTab('analytics');
      } else {
        this.switchToTab('events');
      }
    }

    /**
     * Clean up event listeners and references
     */
    destroy() {
      if (this.tabGroup) {
        this.tabGroup.removeEventListener('sl-tab-show', this.handleTabChange);
      }
      
      this.isAnimating = false;
      this.panels.clear();
      this.tabGroup = null;
      this.isInitialized = false;
    }
  }

  // Create global instance
  global.TabAnimationController = TabAnimationController;
  global.TabAnimations = new TabAnimationController();

  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (!global.TabAnimations) {
      global.TabAnimations = new TabAnimationController();
    }
    global.TabAnimations.initialize();
  });

})(window);
