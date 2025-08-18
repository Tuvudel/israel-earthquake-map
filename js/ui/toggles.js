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

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.lastFocus = document.activeElement;

      // panel show
      if (this.panel && this.panelShowClass) this.panel.classList.add(this.panelShowClass);

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

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;

      // panel hide
      if (this.panel && this.panelShowClass) this.panel.classList.remove(this.panelShowClass);

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

    toggle() {
      if (this.isOpen) this.close(); else this.open();
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
