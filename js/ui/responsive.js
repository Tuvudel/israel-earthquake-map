// Responsive breakpoint manager that emits desktop/mobile changes via EventBus
(function (global) {
  class Responsive {
    constructor(opts = {}) {
      this.breakpoint = typeof opts.breakpoint === 'number' ? opts.breakpoint : 768;
      this._lastIsDesktop = undefined;
      this._boundOnResize = this._onResize.bind(this);
    }

    isDesktop() { return window.innerWidth > this.breakpoint; }

    _emit(isDesktop) {
      if (global.EventBus && typeof global.EventBus.emit === 'function') {
        try { global.EventBus.emit('ui:breakpoint', { isDesktop }); } catch (_) {}
      }
    }

    _onResize() {
      const d = this.isDesktop();
      if (this._lastIsDesktop === undefined || this._lastIsDesktop !== d) {
        this._lastIsDesktop = d;
        this._emit(d);
      }
    }

    init() {
      // Initial emit
      this._onResize();
      // Listen for window resizes
      window.addEventListener('resize', this._boundOnResize);
    }

    destroy() {
      window.removeEventListener('resize', this._boundOnResize);
    }
  }

  // Expose and auto-start
  global.Responsive = Responsive;
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const mgr = new Responsive();
      mgr.init();
      global.ResponsiveManager = mgr;
    } catch (_) {}
  });
})(window);
