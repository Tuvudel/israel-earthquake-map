// FilterService: pure functions for filtering and cascading computations
(function (global) {
  // Filter by numeric magnitude range { min, max }
  const byMagnitudeRange = (data, magnitudeRange) => {
    if (!magnitudeRange || typeof magnitudeRange.min !== 'number' || typeof magnitudeRange.max !== 'number') return data;
    const min = magnitudeRange.min;
    // Treat 7.0 (top of slider) as 7.0+ by expanding to Infinity
    const EPS = 1e-6;
    const max = (magnitudeRange.max >= 7.0 - EPS) ? Infinity : magnitudeRange.max;
    return data.filter(f => {
      const m = (f.properties || {}).magnitude;
      return Number.isFinite(m) && m >= min && m <= max;
    });
  };
  const byCountry = (data, country) => {
    if (!country || country === 'all') return data;
    return data.filter(f => ((f.properties || {}).country || '').trim() === country);
  };
  const byArea = (data, area) => {
    if (!area || area === 'all') return data;
    return data.filter(f => ((f.properties || {}).area || '').trim() === area);
  };
  const byTime = (data, dateFilter, yearRange) => {
    if (!dateFilter || !dateFilter.mode) return data;
    if (dateFilter.mode === 'relative') {
      const now = new Date();
      let days = 30;
      switch (dateFilter.value) {
        case '1day': days = 1; break;
        case '7days': days = 7; break;
        case '30days': days = 30; break;
        case '1year': days = 365; break;
      }
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return data.filter(f => {
        const d = (f.properties || {}).dateObject;
        return d instanceof Date && d >= cutoff;
      });
    } else {
      const yr = yearRange || dateFilter.yearRange || { min: -Infinity, max: Infinity };
      return data.filter(f => {
        const y = (f.properties || {}).year;
        return Number.isFinite(y) && y >= yr.min && y <= yr.max;
      });
    }
  };

  const uniqueSorted = (arr) => Array.from(new Set(arr)).filter(Boolean).sort((a,b) => a.localeCompare(b));

  const FilterService = {
    filterData(features, params) {
      const { magnitudeRange, country, area, dateFilter, yearRange } = params;
      let out = features || [];
      out = byMagnitudeRange(out, magnitudeRange);
      out = byTime(out, dateFilter, yearRange);
      out = byCountry(out, country);
      out = byArea(out, area);
      return out;
    },

    // Year slider limits: apply country, area, magnitudes but NOT time filter
    computeYearLimits(features, params) {
      const { magnitudeRange, country, area } = params;
      let data = features || [];
      data = byMagnitudeRange(data, magnitudeRange);
      data = byCountry(data, country);
      data = byArea(data, area);
      const years = data.map(f => (f.properties || {}).year).filter(v => Number.isFinite(v));
      if (!years.length) return null;
      return { min: Math.min(...years), max: Math.max(...years) };
    },

    // Country options: apply area, time, magnitudes (NOT country)
    computeCountryOptions(features, params) {
      const { magnitudeRange, area, dateFilter, yearRange } = params;
      let data = features || [];
      data = byMagnitudeRange(data, magnitudeRange);
      data = byTime(data, dateFilter, yearRange);
      data = byArea(data, area);
      return uniqueSorted(data.map(f => ((f.properties || {}).country || '').trim()));
    },

    // Area options: apply country, time, magnitudes (NOT area)
    computeAreaOptions(features, params) {
      const { magnitudeRange, country, dateFilter, yearRange } = params;
      let data = features || [];
      data = byMagnitudeRange(data, magnitudeRange);
      data = byTime(data, dateFilter, yearRange);
      data = byCountry(data, country);
      return uniqueSorted(data.map(f => ((f.properties || {}).area || '').trim()));
    },

    // Magnitude availability (legacy): apply country, area, time (NOT magnitudes)
    computeAvailableMagnitudes(features, params) {
      const { country, area, dateFilter, yearRange } = params;
      let data = features || [];
      data = byCountry(data, country);
      data = byArea(data, area);
      data = byTime(data, dateFilter, yearRange);
      return new Set(data.map(f => (f.properties || {}).magnitudeClass));
    },

    // Magnitude limits for slider: apply country, area, time (NOT magnitudeRange)
    computeMagnitudeLimits(features, params) {
      const { country, area, dateFilter, yearRange } = params;
      let data = features || [];
      data = byCountry(data, country);
      data = byArea(data, area);
      data = byTime(data, dateFilter, yearRange);
      const mags = data.map(f => (f.properties || {}).magnitude).filter(v => Number.isFinite(v));
      if (!mags.length) return null;
      return { min: Math.min(...mags), max: Math.max(...mags) };
    }
  };

  global.FilterService = FilterService;
})(window);
