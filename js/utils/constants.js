// Centralized constants for shared configuration
// Attach to window for non-module usage across scripts
(function(){
  const MAGNITUDE_CLASSES = {
    minor:    { min: 2.5, max: 3.9, color: '#6aa84f' },
    light:    { min: 4.0, max: 4.9, color: '#d5bf5a' },
    moderate: { min: 5.0, max: 5.9, color: '#f2a144' },
    strong:   { min: 6.0, max: 6.9, color: '#d6553f' },
    major:    { min: 7.0, max: Infinity, color: '#9e2f3a' }
  };

  const IDS = {
    SRC_EARTHQUAKES: 'earthquakes',
    LYR_EARTHQUAKE_CIRCLES: 'earthquake-circles',
    LYR_EARTHQUAKE_GLOW: 'earthquake-glow',
    SRC_FAULTS: 'faults',
    SRC_RIDGES: 'ridges',
    SRC_TRENCHES: 'trenches',
    SRC_TRANSFORMS: 'transforms',
    LYR_FAULT_LINES: 'fault-lines',
    LYR_PLATE_RIDGES: 'plate-ridges',
    LYR_PLATE_TRENCHES: 'plate-trenches',
    LYR_PLATE_TRANSFORMS: 'plate-transforms'
  };

  window.Constants = Object.freeze({
    MAGNITUDE_CLASSES,
    IDS
  });
})();
