// Theme management module
// Exposes window.Theme with preference, system listener, and apply helpers
(function(){
  const THEME_STORAGE_KEY = 'theme'; // 'system' | 'light' | 'dark'

  function getPreference(){
    try {
      if (window.Persist && window.Persist.keys && window.Persist.getItem) {
        return window.Persist.getItem(window.Persist.keys.theme, 'system') || 'system';
      }
      return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
    } catch(_) { return 'system'; }
  }
  function setPreference(pref){
    try {
      if (window.Persist && window.Persist.keys && window.Persist.setItem) {
        window.Persist.setItem(window.Persist.keys.theme, pref);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, pref);
      }
    } catch(_) {}
  }
  function isDarkFromPreference(pref){
    if (pref === 'dark') return true;
    if (pref === 'light') return false;
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    return !!(mq && mq.matches);
  }
  function applyTheme(isDark){
    try {
      const root = document.documentElement;
      const body = document.body;
      if (isDark) {
        root.setAttribute('data-theme', 'dark');
        if (body) body.classList.add('sl-theme-dark');
      } else {
        root.removeAttribute('data-theme');
        if (body) body.classList.remove('sl-theme-dark');
      }
    } catch(_) {}
  }
  function listenToSystemChanges(callback){
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (!mq) return () => {};
    const handler = (e) => {
      if (getPreference() === 'system') {
        callback(!!e.matches);
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', handler); else mq.addListener(handler);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', handler); else mq.removeListener(handler); };
  }

  // Apply CSS custom properties for magnitude colors so UI and legend match the map.
  function applyMagnitudeCssVars(){
    try {
      const mag = (window.Constants && window.Constants.MAGNITUDE_CLASSES) ? window.Constants.MAGNITUDE_CLASSES : null;
      if (!mag) return;
      const root = document.documentElement;
      if (!root) return;
      root.style.setProperty('--mag-minor', mag.minor.color);
      root.style.setProperty('--mag-light', mag.light.color);
      root.style.setProperty('--mag-moderate', mag.moderate.color);
      root.style.setProperty('--mag-strong', mag.strong.color);
      root.style.setProperty('--mag-major', mag.major.color);
    } catch(_) {}
  }

  // Expose and apply immediately so variables are ready before main app init
  window.Theme = { getPreference, setPreference, isDarkFromPreference, applyTheme, listenToSystemChanges, applyMagnitudeCssVars };
  try { applyMagnitudeCssVars(); } catch(_) {}
})();
