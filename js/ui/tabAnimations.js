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
        
        console.log('TabAnimationController initialized successfully');
        
        // Test integration with existing systems
        if (global.MobileAnimations) {
          console.log('✓ MobileAnimations integration available');
        }
        if (global.Animations) {
          console.log('✓ Animations integration available');
        }
      } catch (error) {
        console.warn('Failed to initialize TabAnimationController:', error);
      }
    }

    /**
     * Find tab group and panel elements
     */
    findTabElements() {
      this.tabGroup = document.querySelector('#sidebar sl-tab-group');
      console.log('Found tab group:', this.tabGroup);
      
      if (!this.tabGroup) {
        throw new Error('Tab group not found');
      }

      // Find all tab panels
      const panels = this.tabGroup.querySelectorAll('sl-tab-panel');
      console.log('Found panels:', panels);
      
      panels.forEach(panel => {
        const name = panel.getAttribute('name');
        console.log('Panel name:', name, 'Panel element:', panel);
        if (name) {
          this.panels.set(name, panel);
        }
      });

      console.log('Panels map:', this.panels);
      
      if (this.panels.size === 0) {
        throw new Error('No tab panels found');
      }
    }

    /**
     * Setup event listeners for tab changes
     */
    setupEventListeners() {
      if (!this.tabGroup) return;

      console.log('Setting up event listeners for tab group:', this.tabGroup);
      
      // Listen for Shoelace tab show events (this is what's actually firing)
      this.tabGroup.addEventListener('sl-tab-show', this.handleTabChange);
      console.log('Added sl-tab-show listener');
      
      // Also listen for sl-change events as backup
      this.tabGroup.addEventListener('sl-change', (event) => {
        console.log('sl-change event fired:', event.detail);
      });
      
      // Listen for reduced motion preference changes
      try {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addEventListener('change', (e) => {
          this.prefersReducedMotion = e.matches;
        });
      } catch (_) {}
      
      console.log('Event listeners setup complete');
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
      console.log('handleTabChange called with event:', event);
      console.log('Event detail:', event.detail);
      
      const targetTab = event.detail.name;
      console.log('Target tab:', targetTab, 'Current tab:', this.currentTab);
      
      if (this.isAnimating || targetTab === this.currentTab) {
        console.log('Skipping animation - already animating or same tab');
        return; // Already animating or same tab
      }

      console.log('Processing tab change...');

      // Store previous tab and update current
      this.previousTab = this.currentTab;
      this.currentTab = targetTab;

      // Notify other systems immediately
      this.notifyTabChange(targetTab);

      // Start panel animation IMMEDIATELY to catch it before it becomes visible
      if (!this.prefersReducedMotion) {
        console.log('Starting panel animation immediately...');
        this.animatePanelContent(targetTab);
      } else {
        console.log('Reduced motion enabled, skipping animation');
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
        console.warn('Panel animation failed:', error);
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
        console.log('Starting panel animation for:', panel);
        console.log('Panel initial state:', {
          opacity: panel.style.opacity,
          transform: panel.style.transform,
          display: panel.style.display,
          visibility: panel.style.visibility
        });
        
        // Since we're using opacity-only animation, we don't need to control overflow
        // This prevents any interference with legitimate scrollbars
        console.log('Using opacity-only animation - no overflow control needed');
        
        // Use CSS classes with higher specificity to override Shoelace
        panel.classList.add('tab-entrance-animating');
        
        // Set initial state for entrance animation with !important
        // Use opacity-only animation to avoid scrollbar issues, but make it more dramatic
        panel.style.setProperty('opacity', '0', 'important');
        panel.style.setProperty('transform', 'translateY(0)', 'important');
        panel.style.setProperty('transition', 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)', 'important');
        
        console.log('Panel after setting initial state:', {
          opacity: panel.style.opacity,
          transform: panel.style.transform,
          transition: panel.style.transition
        });
        
        // Use a longer delay to ensure the initial state is visible
        setTimeout(() => {
          console.log('Triggering animation...');
          panel.style.setProperty('opacity', '1', 'important');
        }, 10); // Small delay to ensure initial state is applied
        
        // Wait for animation to complete
        setTimeout(() => {
          console.log('Animation complete, cleaning up...');
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
      
      // Log for debugging
      console.log(`Tab switching to: ${tabName} (from: ${this.previousTab})`);
    }

    /**
     * Switch to a specific tab programmatically
     * @param {string} tabName - Name of tab to switch to
     */
    switchToTab(tabName) {
      if (!this.panels.has(tabName)) {
        console.warn(`Tab "${tabName}" not found`);
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
      console.log('Testing tab animation system...');
      console.log('Current tab:', this.currentTab);
      console.log('Available panels:', Array.from(this.panels.keys()));
      console.log('Tab group found:', !!this.tabGroup);
      console.log('Animation system ready:', this.isInitialized);
      
      // Test switching to analytics tab if not already there
      if (this.currentTab === 'events') {
        console.log('Testing switch to analytics tab...');
        this.switchToTab('analytics');
      } else {
        console.log('Testing switch to events tab...');
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
