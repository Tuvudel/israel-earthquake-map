// Theme management module
// Exposes window.Theme with preference, system listener, and apply helpers
(function(){
  const THEME_STORAGE_KEY = 'theme'; // 'system' | 'light' | 'dark'

  function getPreference(){
    try { return localStorage.getItem(THEME_STORAGE_KEY) || 'system'; } catch(_) { return 'system'; }
  }
  function setPreference(pref){
    try { localStorage.setItem(THEME_STORAGE_KEY, pref); } catch(_) {}
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

  window.Theme = { getPreference, setPreference, isDarkFromPreference, applyTheme, listenToSystemChanges };
})();
