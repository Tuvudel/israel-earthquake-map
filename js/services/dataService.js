// DataService: load and process earthquake data, provide helpers
(function (global) {
  class DataService {
    constructor(opts = {}) {
      this.url = opts.url || 'data/all_EQ_cleaned.geojson';
      this.features = [];
      this._yearBounds = { min: null, max: null };
      this._latest = null;
      this._mag = (global.Constants && global.Constants.MAGNITUDE_CLASSES) ? global.Constants.MAGNITUDE_CLASSES : {
        minor: { min: 2.5, max: 3.9, color: '#6aa84f' },
        light: { min: 4.0, max: 4.9, color: '#d5bf5a' },
        moderate: { min: 5.0, max: 5.9, color: '#f2a144' },
        strong: { min: 6.0, max: 6.9, color: '#d6553f' },
        major: { min: 7.0, max: Infinity, color: '#9e2f3a' }
      };
    }

    async loadAll(urlOverride) {
      const url = urlOverride || this.url;
      if (global.Logger && global.Logger.info) global.Logger.info('[Data] Fetching GeoJSON:', url);
      const response = await fetch(url, { cache: 'no-cache' });
      const contentLength = response.headers.get('content-length');
      if (global.Logger && global.Logger.debug) global.Logger.debug('[Data] Response:', response.status, response.statusText, 'Content-Length:', contentLength);
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText} while fetching ${url}`);
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) {
        if (global.Logger && global.Logger.error) global.Logger.error('[Data] JSON parse error. First 300 chars:', text.slice(0, 300));
        throw e;
      }
      this.features = (data && data.features) ? data.features : [];
      this._process();
      if (global.Logger && global.Logger.info) global.Logger.info(`[Data] Loaded ${this.features.length} features`);
      return this.features;
    }

    _classifyMagnitude(magnitude) {
      const mag = this._mag;
      for (const [className, cfg] of Object.entries(mag)) {
        if (magnitude >= cfg.min && magnitude <= cfg.max) return className;
      }
      return 'minor';
    }

    _process() {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      let latest = null;
      this.features.forEach(f => {
        const p = f.properties || {};
        // Parse date dd/mm/yyyy
        const parts = (p.date || '').split('/');
        const year = parseInt(parts[2]);
        const month = (parseInt(parts[1]) || 1) - 1;
        const day = parseInt(parts[0]) || 1;
        let hour = 0, minute = 0, second = 0;
        if (p['date-time']) {
          const timePart = p['date-time'].split(' ')[1];
          if (timePart) {
            const t = timePart.split(':');
            hour = parseInt(t[0]) || 0; minute = parseInt(t[1]) || 0; second = parseInt(t[2]) || 0;
          }
        }
        p.dateObject = new Date(year, month, day, hour, minute, second);
        p.year = year;
        p.magnitudeClass = this._classifyMagnitude(p.magnitude);
        if (Number.isFinite(year)) {
          if (year < min) min = year;
          if (year > max) max = year;
        }
        if (!latest || p.dateObject > latest.properties.dateObject) latest = f;
      });
      this._yearBounds = { min: (min === Number.POSITIVE_INFINITY ? null : min), max: (max === Number.NEGATIVE_INFINITY ? null : max) };
      this._latest = latest;
    }

    getFeatures() { return this.features; }
    getYearBounds() { return this._yearBounds; }
    getLatest() { return this._latest; }
    getLatestDateString() {
      const latest = this._latest;
      if (!latest) return null;
      const p = latest.properties || {};
      return p['date-time'] || p.date || null;
    }
  }

  global.DataService = DataService;
  global.Data = new DataService();
})(window);
