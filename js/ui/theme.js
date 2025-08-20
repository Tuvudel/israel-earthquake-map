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
  
  // Enhanced theme application with smooth transitions
  function applyTheme(isDark, options = {}) {
    try {
      const root = document.documentElement;
      const body = document.body;
      
      // Prevent transitions during initial load to avoid flicker
      if (options.preventTransitions) {
        root.style.setProperty('--theme-transition-disabled', 'true');
      }
      
      if (isDark) {
        root.setAttribute('data-theme', 'dark');
        if (body) body.classList.add('sl-theme-dark');
      } else {
        root.removeAttribute('data-theme');
        if (body) body.classList.remove('sl-theme-dark');
      }
      
      // Re-enable transitions after a short delay
      if (options.preventTransitions) {
        setTimeout(() => {
          root.style.removeProperty('--theme-transition-disabled');
        }, 50);
      }
      
      // Emit theme change event for coordination
      if (options.emitEvent !== false) {
        window.dispatchEvent(new CustomEvent('themeChanged', { 
          detail: { isDark, preference: getPreference() } 
        }));
      }
    } catch(_) {}
  }
  
  // Synchronous theme initialization to prevent race conditions
  function initializeThemeSynchronously() {
    const savedTheme = getPreference();
    const isDark = isDarkFromPreference(savedTheme);
    
    // Apply theme immediately with transitions disabled to prevent flicker
    applyTheme(isDark, { preventTransitions: true, emitEvent: false });
    
    return { isDark, preference: savedTheme };
  }
  
  // Enhanced theme application with coordination
  function applyThemeWithCoordination(isDark, options = {}) {
    // Apply UI theme
    applyTheme(isDark, options);
    
    // Coordinate with map if available
    if (window.MapController && window.MapController.instance) {
      const targetStyle = isDark ? 'dark_matter' : 'positron';
      if (window.MapController.instance.currentStyleName !== targetStyle) {
        // Use animation system if available for smooth coordination
        if (window.AnimationController) {
          window.AnimationController.queueAnimation(async () => {
            await window.MapController.instance.setBasemap(targetStyle);
          }, 'theme-coordination');
        } else {
          // Fallback to immediate change
          window.MapController.instance.setBasemap(targetStyle);
        }
      }
    }
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
  window.Theme = { 
    getPreference, 
    setPreference, 
    isDarkFromPreference, 
    applyTheme, 
    applyThemeWithCoordination,
    initializeThemeSynchronously,
    listenToSystemChanges, 
    applyMagnitudeCssVars 
  };
  
  // Initialize theme synchronously to prevent race conditions
  try { 
    applyMagnitudeCssVars(); 
    initializeThemeSynchronously();
  } catch(_) {}
})();
