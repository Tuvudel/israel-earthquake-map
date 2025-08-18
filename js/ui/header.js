// Header + Mobile toggle wiring using ToggleController
// Rules:
// - Desktop: panels can be simultaneous; outside-click closes filters; persist legend+data states.
// - Mobile: toggles are exclusive; outside-click closes Filters and Data; focus returns to button.
(function (global) {
  class HeaderController {
    constructor(opts = {}) {
      this.resizeMap = opts.resizeMap || (() => {});

      // elements
      this.els = {};

      // controllers
      this.desktop = { filters: null, legend: null, data: null };
      this.mobile = { filters: null, legend: null, data: null };

      // persistence
      this.persist = window.Persist || null;
      this.keys = this.persist?.keys?.panels || { legendOpen: 'persist:legendOpen', dataOpen: 'persist:dataOpen' };
    }

    isDesktop() {
      return window.innerWidth > 768;
    }

    cacheEls() {
      this.els = {
        filtersBtn: document.getElementById('header-filters-toggle'),
        legendBtn: document.getElementById('header-legend-toggle'),
        dataBtn: document.getElementById('header-data-toggle'),
        filtersPane: document.getElementById('filters-pane'),
        legend: document.getElementById('map-legend'),
        sidebar: document.getElementById('sidebar'),
        mapContainer: document.getElementById('map-container'),
        credits: document.querySelector('.credits-container'),
        mobile: {
          dataBtn: document.getElementById('mobile-sidebar-toggle'),
          legendBtn: document.getElementById('mobile-legend-toggle'),
          filtersBtn: document.getElementById('mobile-filters-toggle')
        }
      };
    }

    // Handle Credits popup toggle (desktop and mobile)
    setupCreditsPopup() {
      try {
        const container = this.els.credits;
        if (!container) return;
        const trigger = container.querySelector('.credits-trigger');
        if (!trigger) return;

        // Toggle on click (desktop/mobile)
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          container.classList.toggle('open');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
          if (!container.contains(e.target)) {
            container.classList.remove('open');
          }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            container.classList.remove('open');
          }
        });
      } catch (_) {}
    }

    resizeSoon(delay = 200) {
      setTimeout(() => this.resizeMap && this.resizeMap(), delay);
    }

    // Notify other controllers (e.g., FilterController) when filters pane visibility changes
    notifyFiltersPaneToggle(open) {
      try {
        const ev = new CustomEvent('filters-pane-toggled', { detail: { open: !!open } });
        document.dispatchEvent(ev);
      } catch (_) {}
    }

    // Desktop wiring
    setupDesktop() {
      const { filtersBtn, legendBtn, dataBtn, filtersPane, legend, sidebar, mapContainer } = this.els;
      // Filters (desktop): outside-click closes; backdrop visual only; no exclusivity
      if (filtersBtn && filtersPane) {
        this.desktop.filters = new global.ToggleController({
          button: filtersBtn,
          panel: filtersPane,
          ariaControls: 'filters-pane',
          useBackdrop: true,
          enableOutsideClick: true,
          onOpen: () => {
            filtersPane.setAttribute('aria-modal', 'false');
            try { filtersPane.focus(); } catch (_) {}
            this.resizeSoon();
            this.notifyFiltersPaneToggle(true);
          },
          onClose: () => {
            this.resizeSoon();
            this.notifyFiltersPaneToggle(false);
          }
        });
      }

      // Legend (desktop): no outside-click per spec
      if (legendBtn && legend) {
        this.desktop.legend = new global.ToggleController({
          button: legendBtn,
          panel: legend,
          ariaControls: 'map-legend',
          enableOutsideClick: false,
          onOpen: () => { this.persistDesktop('legendOpen', true); this.resizeSoon(); },
          onClose: () => { this.persistDesktop('legendOpen', false); this.resizeSoon(); }
        });
      }

      // Data (desktop): manage collapsed state + persistence
      if (dataBtn && sidebar) {
        const openData = () => {
          sidebar.classList.remove('collapsed');
          mapContainer && mapContainer.classList.add('sidebar-open');
          dataBtn.classList.add('active');
          dataBtn.setAttribute('aria-pressed', 'true');
          this.persistDesktop('dataOpen', true);
          this.resizeSoon();
        };
        const closeData = () => {
          sidebar.classList.add('collapsed');
          mapContainer && mapContainer.classList.remove('sidebar-open');
          dataBtn.classList.remove('active');
          dataBtn.setAttribute('aria-pressed', 'false');
          this.persistDesktop('dataOpen', false);
          this.resizeSoon();
        };
        this.desktop.data = {
          isOpen: () => !sidebar.classList.contains('collapsed'),
          open: openData,
          close: closeData,
          toggle: () => (sidebar.classList.contains('collapsed') ? openData() : closeData())
        };
        dataBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!this.isDesktop()) return;
          this.desktop.data.toggle();
        });
      }

      // Apply persisted states on desktop
      this.applyDesktopPersistence();

      // ESC closes filters/legend on desktop
      document.addEventListener('keydown', (e) => {
        if (!this.isDesktop()) return;
        if (e.key === 'Escape') {
          if (this.desktop.filters && this.desktop.filters.isOpen) this.desktop.filters.close();
          if (this.desktop.legend && this.desktop.legend.isOpen) this.desktop.legend.close();
        }
      });
    }

    persistDesktop(key, val) {
      try {
        if (!this.isDesktop()) return;
        if (this.persist) {
          if (key === 'legendOpen') this.persist.setBool(this.keys.legendOpen, !!val);
          if (key === 'dataOpen') this.persist.setBool(this.keys.dataOpen, !!val);
        } else {
          if (key === 'legendOpen') localStorage.setItem(this.keys.legendOpen, String(!!val));
          if (key === 'dataOpen') localStorage.setItem(this.keys.dataOpen, String(!!val));
        }
      } catch (_) {}
    }

    readPersistedDesktop() {
      try {
        if (this.persist) {
          return {
            legendOpen: this.persist.getBool(this.keys.legendOpen, false),
            dataOpen: this.persist.getBool(this.keys.dataOpen, true)
          };
        } else {
          return {
            legendOpen: localStorage.getItem(this.keys.legendOpen) === 'true',
            dataOpen: localStorage.getItem(this.keys.dataOpen) !== 'false' // default open
          };
        }
      } catch (_) { return { legendOpen: false, dataOpen: true }; }
    }

    applyDesktopPersistence() {
      const { legend, legendBtn } = this.els;
      const persisted = this.readPersistedDesktop();

      // data
      if (this.desktop.data) {
        if (persisted.dataOpen) this.desktop.data.open(); else this.desktop.data.close();
      }

      // legend
      if (this.desktop.legend && legend) {
        if (persisted.legendOpen) {
          if (!legend.classList.contains('show')) this.desktop.legend.open();
        } else {
          if (legend.classList.contains('show')) this.desktop.legend.close();
        }
      }
    }

    // Mobile wiring (exclusive)
    setupMobile() {
      const { mobile, filtersPane, legend, sidebar, mapContainer } = this.els;

      const closeOthers = (except) => {
        const list = [this.mobile.filters, this.mobile.legend, this.mobile.data].filter(Boolean);
        for (const ctrl of list) {
          if (ctrl !== except && ctrl.isOpen) ctrl.close();
        }
      };

      // Filters (mobile): outside-click closes; backdrop; focus return only
      if (mobile.filtersBtn && filtersPane) {
        this.mobile.filters = new global.ToggleController({
          button: mobile.filtersBtn,
          panel: filtersPane,
          ariaControls: 'filters-pane',
          useBackdrop: true,
          enableOutsideClick: true,
          shouldOutsideClose: () => !this.isDesktop(),
          onOpen: () => {
            closeOthers(this.mobile.filters);
            filtersPane.setAttribute('aria-modal', 'true');
            try { filtersPane.focus(); } catch (_) {}
            this.resizeSoon();
            this.notifyFiltersPaneToggle(true);
          },
          onClose: () => {
            filtersPane.setAttribute('aria-modal', 'false');
            this.resizeSoon();
            this.notifyFiltersPaneToggle(false);
          },
          textOn: 'Hide',
          textOff: 'Filters'
        });
      }

      // Legend (mobile): exclusive, no outside-click requirement
      if (mobile.legendBtn && legend) {
        this.mobile.legend = new global.ToggleController({
          button: mobile.legendBtn,
          panel: legend,
          ariaControls: 'map-legend',
          enableOutsideClick: false,
          onOpen: () => { closeOthers(this.mobile.legend); this.resizeSoon(); },
          onClose: () => this.resizeSoon(),
          textOn: 'Hide',
          textOff: 'Legend'
        });
      }

      // Data (mobile): manage #sidebar .show, outside-click closes
      if (mobile.dataBtn && sidebar) {
        const dataCtrl = {
          isOpen: false,
          open: () => {
            closeOthers(dataCtrl);
            sidebar.classList.add('show');
            mapContainer && mapContainer.classList.add('sidebar-open');
            mobile.dataBtn.classList.add('active');
            mobile.dataBtn.setAttribute('aria-pressed', 'true');
            this.resizeSoon(300);
            dataCtrl.isOpen = true;
          },
          close: () => {
            sidebar.classList.remove('show');
            mapContainer && mapContainer.classList.remove('sidebar-open');
            mobile.dataBtn.classList.remove('active');
            mobile.dataBtn.setAttribute('aria-pressed', 'false');
            this.resizeSoon(300);
            dataCtrl.isOpen = false;
            try { mobile.dataBtn && mobile.dataBtn.focus(); } catch (_) {}
          },
          toggle: () => (dataCtrl.isOpen ? dataCtrl.close() : dataCtrl.open())
        };
        this.mobile.data = dataCtrl;

        mobile.dataBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.isDesktop()) return;
          dataCtrl.toggle();
        });

        // outside-click close for data on mobile
        document.addEventListener('click', (e) => {
          if (!this.isDesktop() && dataCtrl.isOpen) {
            const clickedInside = sidebar.contains(e.target) || mobile.dataBtn.contains(e.target);
            if (!clickedInside) dataCtrl.close();
          }
        });
      }
    }

    resetForMode() {
      const d = this.isDesktop();
      const { legend, sidebar, mapContainer, mobile, filtersPane } = this.els;

      // Clear mobile states when switching to desktop
      if (d) {
        // Close any mobile controllers so internal state matches DOM
        if (this.mobile.data && this.mobile.data.isOpen) this.mobile.data.close();
        if (this.mobile.legend && this.mobile.legend.isOpen) this.mobile.legend.close();
        if (this.mobile.filters && this.mobile.filters.isOpen) this.mobile.filters.close();
        // Ensure residual mobile classes are cleared
        sidebar && sidebar.classList.remove('show');
        mapContainer && mapContainer.classList.remove('sidebar-open');
        // Do NOT directly remove legend/show or filters-pane/show here; let controllers/persistence manage
        const b = document.getElementById('filters-backdrop');
        if (b) b.classList.remove('show');
        // Apply desktop persistence each time we enter desktop
        this.applyDesktopPersistence();
      } else {
        // Clear desktop-only classes
        sidebar && sidebar.classList.remove('collapsed');
      }
      this.resizeSoon();
    }

    handleResize = () => {
      const nowDesktop = this.isDesktop();
      if (this._lastIsDesktop === undefined || this._lastIsDesktop !== nowDesktop) {
        this._lastIsDesktop = nowDesktop;
        this.resetForMode();
      }
    };

    init() {
      this.cacheEls();
      // Set initial texts/aria for mobile buttons
      const m = this.els.mobile;
      if (m.dataBtn) { const t = m.dataBtn.querySelector('.toggle-text'); if (t) t.textContent = 'Data'; m.dataBtn.setAttribute('aria-pressed','false'); }
      if (m.legendBtn) { const t = m.legendBtn.querySelector('.toggle-text'); if (t) t.textContent = 'Legend'; m.legendBtn.setAttribute('aria-pressed','false'); }
      if (m.filtersBtn) { const t = m.filtersBtn.querySelector('.toggle-text'); if (t) t.textContent = 'Filters'; m.filtersBtn.setAttribute('aria-pressed','false'); }

      this.setupDesktop();
      this.setupMobile();
      this.setupCreditsPopup();
      this.resetForMode();
      window.addEventListener('resize', this.handleResize);
    }
  }

  global.HeaderController = HeaderController;
})(window);
