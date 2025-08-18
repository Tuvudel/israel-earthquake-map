// Simple leveled logger
// window.Logger with levels: silent < error < warn < info < debug
(function(){
  const levels = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
  const defaultLevel = (window.LOG_LEVEL && levels[window.LOG_LEVEL] != null) ? window.LOG_LEVEL : 'info';
  let current = defaultLevel;

  function setLevel(lvl){ if (levels[lvl] != null) current = lvl; }
  function should(lvl){ return levels[lvl] <= levels[current]; }

  function debug(){ if (should('debug')) try { console.debug.apply(console, arguments); } catch(_) {} }
  function info(){ if (should('info')) try { console.info.apply(console, arguments); } catch(_) {} }
  function warn(){ if (should('warn')) try { console.warn.apply(console, arguments); } catch(_) {} }
  function error(){ if (should('error')) try { console.error.apply(console, arguments); } catch(_) {} }

  window.Logger = { setLevel, debug, info, warn, error };
})();
