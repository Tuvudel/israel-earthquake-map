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
  
  // Enhanced theme application with smooth transitions and better error handling
  function applyTheme(isDark, options = {}) {
    try {
      const html = document.documentElement;
      if (!html) {
        if (global.Logger && global.Logger.warn) {
          global.Logger.warn('Theme: HTML element not available');
        }
        return;
      }
      
      // Prevent transitions during initial load to avoid flicker
      if (options.preventTransitions) {
        html.style.setProperty('--theme-transition-disabled', 'true');
      }
      
      // Apply theme classes with proper Shoelace integration
      if (isDark) {
        // Apply custom blue dark theme class to html element (proper Shoelace integration)
        html.classList.add('sl-theme-blue-dark');
      } else {
        // Remove custom blue dark theme class from html element
        html.classList.remove('sl-theme-blue-dark');
      }
      
      // Re-enable transitions after a short delay for smooth theme switching
      if (options.preventTransitions) {
        setTimeout(() => {
                     try {
             html.style.removeProperty('--theme-transition-disabled');
           } catch (e) {
             if (global.Logger && global.Logger.warn) {
               global.Logger.warn('Theme: Error removing transition property:', e);
             }
           }
        }, 50);
      }
      
      // Emit theme change event for coordination with other components
      if (options.emitEvent !== false) {
                 try {
           window.dispatchEvent(new CustomEvent('themeChanged', { 
             detail: { isDark, preference: getPreference() } 
           }));
         } catch (e) {
           if (global.Logger && global.Logger.warn) {
             global.Logger.warn('Theme: Error dispatching theme change event:', e);
           }
         }
      }
    } catch(e) {
      if (global.Logger && global.Logger.error) {
        global.Logger.error('Theme: Error applying theme:', e);
      }
    }
  }
  
  // Synchronous theme initialization to prevent race conditions
  function initializeThemeSynchronously() {
    try {
      const savedTheme = getPreference();
      const isDark = isDarkFromPreference(savedTheme);
      
      // Apply theme immediately with transitions disabled to prevent flicker
      applyTheme(isDark, { preventTransitions: true, emitEvent: false });
      
      return { isDark, preference: savedTheme };
    } catch (e) {
      if (global.Logger && global.Logger.error) {
        global.Logger.error('Theme: Error initializing theme:', e);
      }
      return { isDark: false, preference: 'system' };
    }
  }
  
  // Enhanced theme application with coordination and error handling
  function applyThemeWithCoordination(isDark, options = {}) {
    try {
      // Apply UI theme
      applyTheme(isDark, options);
      
      // Coordinate with map if available
      if (window.MapController && window.MapController.instance) {
        const targetStyle = isDark ? 'dark_matter' : 'positron';
        if (window.MapController.instance.currentStyleName !== targetStyle) {
          // Use animation system if available for smooth coordination
          if (window.AnimationController) {
            try {
              window.AnimationController.queueAnimation(async () => {
                                 try {
                   await window.MapController.instance.setBasemap(targetStyle);
                 } catch (e) {
                   if (global.Logger && global.Logger.warn) {
                     global.Logger.warn('Theme: Error setting basemap:', e);
                   }
                 }
              }, 'theme-coordination');
            } catch (e) {
              if (global.Logger && global.Logger.warn) {
                global.Logger.warn('Theme: Error queuing animation:', e);
              }
              // Fallback to immediate change
              try {
                window.MapController.instance.setBasemap(targetStyle);
              } catch (e2) {
                if (global.Logger && global.Logger.warn) {
                  global.Logger.warn('Theme: Error setting basemap (fallback):', e2);
                }
              }
            }
          } else {
            // Fallback to immediate change
            try {
              window.MapController.instance.setBasemap(targetStyle);
            } catch (e) {
              if (global.Logger && global.Logger.warn) {
                global.Logger.warn('Theme: Error setting basemap (fallback):', e);
              }
            }
          }
        }
      }
    } catch (e) {
      if (global.Logger && global.Logger.error) {
        global.Logger.error('Theme: Error in theme coordination:', e);
      }
    }
  }
  
  // Enhanced system preference listener with error handling
  function listenToSystemChanges(callback){
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      if (!mq) {
        if (global.Logger && global.Logger.warn) {
          global.Logger.warn('Theme: System preference listener not supported');
        }
        return () => {};
      }
      
      const handler = (e) => {
        try {
          if (getPreference() === 'system') {
            callback(!!e.matches);
          }
                 } catch (e) {
           if (global.Logger && global.Logger.warn) {
             global.Logger.warn('Theme: Error in system preference handler:', e);
           }
         }
      };
      
      if (mq.addEventListener) {
        mq.addEventListener('change', handler);
        return () => { 
          try {
            mq.removeEventListener('change', handler);
          } catch (e) {
            if (global.Logger && global.Logger.warn) {
              global.Logger.warn('Theme: Error removing system preference listener:', e);
            }
          }
        };
      } else {
        mq.addListener(handler);
        return () => { 
          try {
            mq.removeListener(handler);
          } catch (e) {
            if (global.Logger && global.Logger.warn) {
              global.Logger.warn('Theme: Error removing system preference listener:', e);
            }
          }
        };
      }
    } catch (e) {
      if (global.Logger && global.Logger.error) {
        global.Logger.error('Theme: Error setting up system preference listener:', e);
      }
      return () => {};
    }
  }

  // Apply CSS custom properties for magnitude colors so UI and legend match the map.
  function applyMagnitudeCssVars(){
    try {
      const mag = (window.Constants && window.Constants.MAGNITUDE_CLASSES) ? window.Constants.MAGNITUDE_CLASSES : null;
      if (!mag) {
        if (global.Logger && global.Logger.warn) {
          global.Logger.warn('Theme: Magnitude classes not available');
        }
        return;
      }
      
      const root = document.documentElement;
      if (!root) {
        if (global.Logger && global.Logger.warn) {
          global.Logger.warn('Theme: Root element not available for magnitude variables');
        }
        return;
      }
      
      root.style.setProperty('--mag-minor', mag.minor.color);
      root.style.setProperty('--mag-light', mag.light.color);
      root.style.setProperty('--mag-moderate', mag.moderate.color);
      root.style.setProperty('--mag-strong', mag.strong.color);
      root.style.setProperty('--mag-major', mag.major.color);
    } catch(e) {
      if (global.Logger && global.Logger.error) {
        global.Logger.error('Theme: Error applying magnitude CSS variables:', e);
      }
    }
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
  } catch(e) {
    if (global.Logger && global.Logger.error) {
      global.Logger.error('Theme: Error during initialization:', e);
    }
  }
})();
