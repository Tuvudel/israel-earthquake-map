// Unified basemap style resolution for MapLibre
// Exposes window.StyleResolver with async methods.
(function(){
  function isGithubPages(){
    try { return typeof location !== 'undefined' && /\.github\.io$/.test(location.hostname); } catch(_) { return false; }
  }
  function isLocalhost(){
    try { return typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname); } catch(_) { return false; }
  }
  function getKey(){
    try { return (typeof window !== 'undefined' && window.MAPTILER_KEY) ? String(window.MAPTILER_KEY).trim() : ''; } catch(_) { return ''; }
  }

  async function fetchAndInject(path, key){
    const resp = await fetch(path);
    const style = await resp.json();
    if (key && style) {
      if (style.sources && style.sources.openmaptiles) {
        style.sources.openmaptiles.url = `https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=${encodeURIComponent(key)}`;
      }
      if (style.glyphs) {
        style.glyphs = `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${encodeURIComponent(key)}`;
      }
    }
    return style;
  }

  async function resolveInitialStyle(){
    const key = getKey();
    if (isLocalhost()) {
      return 'data/map-styles/positron.json';
    }
    if (key) {
      try {
        const style = await fetchAndInject('data/map-styles/positron.json', key);
        if (window.Logger && window.Logger.info) window.Logger.info('Using Positron style with MapTiler API key');
        return style;
      } catch(e) {
        if (window.Logger && window.Logger.warn) window.Logger.warn('Failed to load Positron style with key, falling back to MapLibre demo style.', e);
        return 'https://demotiles.maplibre.org/style.json';
      }
    }
    if (isGithubPages()) {
      if (window.Logger && window.Logger.warn) window.Logger.warn('No MAPTILER_KEY found. Using MapLibre demo style on GitHub Pages to avoid MapTiler demo key restrictions.');
      return 'https://demotiles.maplibre.org/style.json';
    }
    return 'data/map-styles/positron.json';
  }

  async function resolveStyleForName(name){
    const key = getKey();

    if (name === 'positron') {
      if (isLocalhost()) return 'data/map-styles/positron.json';
      if (key) {
        try { return await fetchAndInject('data/map-styles/positron.json', key); }
        catch(e){ if (window.Logger && window.Logger.warn) window.Logger.warn('Positron style with key failed, falling back to demo style.', e); return 'https://demotiles.maplibre.org/style.json'; }
      }
      if (isGithubPages()) return 'https://demotiles.maplibre.org/style.json';
      return 'data/map-styles/positron.json';
    }

    if (name === 'dark_matter') {
      try {
        if (isLocalhost()) return 'data/map-styles/dark_matter.json';
        if (key) return await fetchAndInject('data/map-styles/dark_matter.json', key);
        if (isGithubPages()) {
          if (window.Logger && window.Logger.warn) window.Logger.warn('No MAPTILER_KEY on GitHub Pages; falling back to MapLibre demo style for Dark Matter.');
          return 'https://demotiles.maplibre.org/style.json';
        }
        return 'data/map-styles/dark_matter.json';
      } catch(e){
        if (window.Logger && window.Logger.warn) window.Logger.warn('Dark Matter style failed, falling back to Positron demo.', e);
        return 'https://demotiles.maplibre.org/style.json';
      }
    }

    // Fallback to initial logic
    return await resolveInitialStyle();
  }

  window.StyleResolver = { resolveInitialStyle, resolveStyleForName };
})();
