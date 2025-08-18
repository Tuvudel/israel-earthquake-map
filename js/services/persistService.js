// Simple persistence service wrapping localStorage with helpful helpers
(function (global) {
  class PersistService {
    constructor(opts = {}) {
      this.prefix = opts.prefix || 'iem:'; // israel-earthquake-map
    }

    _k(key) { return `${this.prefix}${key}`; }

    setItem(key, value) {
      try { localStorage.setItem(this._k(key), String(value)); } catch (_) {}
    }

    getItem(key, defaultValue = null) {
      try {
        const v = localStorage.getItem(this._k(key));
        return v === null ? defaultValue : v;
      } catch (_) { return defaultValue; }
    }

    setBool(key, val) { this.setItem(key, !!val ? 'true' : 'false'); }
    getBool(key, defaultValue = false) {
      const v = this.getItem(key, null);
      if (v === null) return defaultValue;
      return v === 'true';
    }

    setJSON(key, obj) {
      try { this.setItem(key, JSON.stringify(obj)); } catch (_) {}
    }

    getJSON(key, defaultValue = null) {
      try {
        const v = this.getItem(key, null);
        if (v === null) return defaultValue;
        return JSON.parse(v);
      } catch (_) { return defaultValue; }
    }

    remove(key) {
      try { localStorage.removeItem(this._k(key)); } catch (_) {}
    }

    // Namespaced logical keys
    keys = {
      theme: 'prefs.theme',            // 'light' | 'dark' | 'system'
      basemap: 'prefs.basemap',        // 'light' | 'dark'
      panels: {
        legendOpen: 'panels.legendOpen',
        dataOpen: 'panels.dataOpen'
      }
    };
  }

  global.Persist = new PersistService();
  global.PersistService = PersistService;
})(window);
