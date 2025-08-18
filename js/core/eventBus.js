// Simple pub/sub EventBus for app-wide communication (no dependencies)
(function(global){
  const listeners = new Map();

  function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => off(event, handler);
  }

  function off(event, handler) {
    const set = listeners.get(event);
    if (set) set.delete(handler);
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const h of Array.from(set)) {
      try { h(payload); } catch (err) {
        if (global.Logger && global.Logger.warn) global.Logger.warn('[EventBus] handler error for', event, err);
      }
    }
  }

  global.EventBus = { on, off, emit };
})(window);
