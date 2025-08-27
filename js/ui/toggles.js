// Reusable ToggleController for buttons and panels with ARIA, outside-click, and focus return
(function (global) {
  class ToggleController {
    constructor(options) {
      const {
        button,
        panel,
        ariaControls,
        activeClass = 'active',
        panelShowClass = 'show',
        textOn = null,
        textOff = null,
        useBackdrop = false,
        backdropId = 'filters-backdrop',
        enableOutsideClick = false,
        shouldOutsideClose = null,
        onOpen = null,
        onClose = null,
        focusReturn = true,
        enableAnimations = false,
        animationType = 'slide', // 'slide', 'fade', 'none'
        animationDirection = 'up', // 'up', 'down', 'left', 'right'
        animationPreset = 'normal', // 'fast', 'normal', 'slow', 'bounce'
        enableHaptic = false,
        hapticType = 'light'
      } = options || {};

      this.button = typeof button === 'string' ? document.getElementById(button) : button;
      this.panel = typeof panel === 'string' ? document.getElementById(panel) : panel;
      this.ariaControls = ariaControls;
      this.activeClass = activeClass;
      this.panelShowClass = panelShowClass;
      this.textOn = textOn;
      this.textOff = textOff;
      this.useBackdrop = useBackdrop;
      this.backdropId = backdropId;
      this.enableOutsideClick = enableOutsideClick;
      this.shouldOutsideClose = shouldOutsideClose;
      this.onOpen = onOpen;
      this.onClose = onClose;
      this.focusReturn = focusReturn;
      
      // Animation properties
      this.enableAnimations = enableAnimations;
      this.animationType = animationType;
      this.animationDirection = animationDirection;
      this.animationPreset = animationPreset;
      this.enableHaptic = enableHaptic;
      this.hapticType = hapticType;
      this.isAnimating = false;

      this.isOpen = false;
      this.lastFocus = null;
      this.outsideClickHandler = this.handleOutsideClick.bind(this);

      if (!this.button) return;
      if (this.ariaControls) this.button.setAttribute('aria-controls', this.ariaControls);
      this.button.setAttribute('aria-pressed', 'false');

      this.button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });
    }

    ensureBackdrop() {
      if (!this.useBackdrop) return null;
      let b = document.getElementById(this.backdropId);
      if (!b) {
        b = document.createElement('div');
        b.id = this.backdropId;
        document.body.appendChild(b);
      }
      return b;
    }

    setButtonText(on) {
      if (!this.button) return;
      if (this.textOn == null && this.textOff == null) return;
      const t = this.button.querySelector('.toggle-text') || this.button.querySelector('.btn-text');
      if (!t) return;
      t.textContent = on ? (this.textOn ?? t.textContent) : (this.textOff ?? t.textContent);
    }

    /**
     * Trigger haptic feedback if enabled
     */
    triggerHapticFeedback() {
      if (!this.enableHaptic) return;
      
      try {
        if (global.MobileAnimationUtils && global.MobileAnimationUtils.haptic) {
          global.MobileAnimationUtils.haptic(this.hapticType);
        } else if (navigator.vibrate) {
          const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 50, 10],
            warning: [20, 50, 20],
            error: [30, 100, 30]
          };
          
          const pattern = patterns[this.hapticType] || patterns.light;
          navigator.vibrate(pattern);
        }
      } catch (e) {
        if (global.Logger && global.Logger.debug) {
          global.Logger.debug('Haptic feedback not supported:', e);
        }
      }
    }

    /**
     * Animate panel show/hide
     */
    async animatePanel(show) {
      if (!this.enableAnimations || !this.panel || this.isAnimating) {
        return Promise.resolve();
      }

      this.isAnimating = true;

      try {
        // For mobile legend, trigger CSS transitions properly
        if (this.panel.id === 'map-legend') {
          const duration = this.getAnimationDuration();
          
          // Ensure the panel has the proper initial state for animation
          if (show) {
            // For showing: set initial state, then trigger animation
            this.panel.style.transition = 'none';
            this.panel.style.opacity = '0';
            this.panel.style.transform = 'translateY(-20px)';
            
            // Force reflow
            this.panel.offsetHeight;
            
            // Enable transition and trigger animation
            this.panel.style.transition = `opacity ${duration}ms var(--animation-easing), transform ${duration}ms var(--animation-easing)`;
            this.panel.style.opacity = '1';
            this.panel.style.transform = 'translateY(0)';
          } else {
            // For hiding: trigger animation to hidden state
            this.panel.style.transition = `opacity ${duration}ms var(--animation-easing), transform ${duration}ms var(--animation-easing)`;
            this.panel.style.opacity = '0';
            this.panel.style.transform = 'translateY(-20px)';
          }
          
          // Wait for animation to complete
          await new Promise(resolve => {
            setTimeout(() => {
              // Clean up inline styles after animation
              if (!show) {
                this.panel.style.transition = '';
                this.panel.style.opacity = '';
                this.panel.style.transform = '';
              }
              resolve();
            }, duration);
          });
        } else if (global.MobileAnimationUtils) {
          // Use MobileAnimationUtils for other panels
          if (this.animationType === 'slide') {
            await global.MobileAnimationUtils.slide(
              this.panel, 
              this.animationDirection, 
              show, 
              this.animationPreset
            );
          } else if (this.animationType === 'fade') {
            await global.MobileAnimationUtils.fade(
              this.panel, 
              show, 
              this.animationPreset
            );
          }
        } else {
          // Fallback to CSS transitions
          const duration = this.getAnimationDuration();
          await new Promise(resolve => {
            setTimeout(resolve, duration);
          });
        }
      } catch (error) {
        if (global.Logger && global.Logger.warn) {
          global.Logger.warn('Animation failed:', error);
        }
      } finally {
        this.isAnimating = false;
      }
    }

    /**
     * Get animation duration based on preset
     */
    getAnimationDuration() {
      const durations = {
        fast: 200,
        normal: 300,
        slow: 400,
        bounce: 500
      };
      return durations[this.animationPreset] || durations.normal;
    }

    async open() {
      if (this.isOpen || this.isAnimating) return;
      this.isOpen = true;
      this.lastFocus = document.activeElement;

      // Trigger haptic feedback
      this.triggerHapticFeedback();

      // Immediately show the panel for basic functionality
      if (this.panel && this.panelShowClass) {
        this.panel.classList.add(this.panelShowClass);
      }

      // Animate panel show as enhancement (non-blocking)
      if (this.enableAnimations) {
        this.animatePanel(true).catch(error => {
          if (global.Logger && global.Logger.warn) {
            global.Logger.warn('Animation failed, but panel is shown:', error);
          }
        });
      }

      // aria + styles
      this.button.classList.add(this.activeClass);
      this.button.setAttribute('aria-pressed', 'true');
      this.setButtonText(true);

      // backdrop
      const b = this.ensureBackdrop();
      if (b) b.classList.add('show');

      // outside click
      if (this.enableOutsideClick) {
        document.addEventListener('click', this.outsideClickHandler, true);
      }

      // callbacks
      if (typeof this.onOpen === 'function') {
        try { this.onOpen(); } catch (_) {}
      }
    }

    async close() {
      if (!this.isOpen || this.isAnimating) return;
      this.isOpen = false;

      // Trigger haptic feedback
      this.triggerHapticFeedback();

      // Animate panel hide as enhancement (non-blocking)
      if (this.enableAnimations) {
        await this.animatePanel(false).catch(error => {
          if (global.Logger && global.Logger.warn) {
            global.Logger.warn('Animation failed, but panel will be hidden:', error);
          }
        });
      }

      // Immediately hide the panel for basic functionality
      if (this.panel && this.panelShowClass) {
        this.panel.classList.remove(this.panelShowClass);
      }

      // aria + styles
      this.button.classList.remove(this.activeClass);
      this.button.setAttribute('aria-pressed', 'false');
      this.setButtonText(false);

      // backdrop
      if (this.useBackdrop) {
        const b = document.getElementById(this.backdropId);
        if (b) b.classList.remove('show');
      }

      // outside click
      if (this.enableOutsideClick) {
        document.removeEventListener('click', this.outsideClickHandler, true);
      }

      // callbacks
      if (typeof this.onClose === 'function') {
        try { this.onClose(); } catch (_) {}
      }

      // focus return
      if (this.focusReturn) {
        try { (this.lastFocus || this.button)?.focus(); } catch (_) {}
      }
    }

    async toggle() {
      if (this.isOpen) {
        await this.close();
      } else {
        await this.open();
      }
    }

    handleOutsideClick(e) {
      if (!this.isOpen) return;
      if (typeof this.shouldOutsideClose === 'function' && !this.shouldOutsideClose()) return;
      const clickedInsidePanel = this.panel && this.panel.contains(e.target);
      const clickedToggle = this.button && this.button.contains(e.target);
      if (!clickedInsidePanel && !clickedToggle) {
        this.close();
      }
    }
  }

  global.ToggleController = ToggleController;
})(window);
