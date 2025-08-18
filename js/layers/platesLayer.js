// Plates and faults layer module
// Provides: window.PlatesLayer.addLayers(map, isDark)
(function(){
  function addLayers(map, isDark){
    const IDS = (window.Constants && window.Constants.IDS) ? window.Constants.IDS : {
      SRC_FAULTS: 'faults', SRC_RIDGES: 'ridges', SRC_TRENCHES: 'trenches', SRC_TRANSFORMS: 'transforms',
      LYR_FAULT_LINES: 'fault-lines', LYR_PLATE_RIDGES: 'plate-ridges', LYR_PLATE_TRENCHES: 'plate-trenches', LYR_PLATE_TRANSFORMS: 'plate-transforms'
    };

    const lineColor = isDark ? '#ffffff' : '#000000';

    if (!map.getSource(IDS.SRC_FAULTS)){
      map.addSource(IDS.SRC_FAULTS, { type: 'geojson', data: 'data/faults_plates/EMME_faults.geojson' });
    }
    if (!map.getSource(IDS.SRC_RIDGES)){
      map.addSource(IDS.SRC_RIDGES, { type: 'geojson', data: 'data/faults_plates/ridge.geojson' });
    }
    if (!map.getSource(IDS.SRC_TRENCHES)){
      map.addSource(IDS.SRC_TRENCHES, { type: 'geojson', data: 'data/faults_plates/trench.geojson' });
    }
    if (!map.getSource(IDS.SRC_TRANSFORMS)){
      map.addSource(IDS.SRC_TRANSFORMS, { type: 'geojson', data: 'data/faults_plates/transform.geojson' });
    }

    // Insert plates/faults below earthquake points
    const EQ_BELOW = map.getLayer('earthquake-glow') ? 'earthquake-glow' : (map.getLayer('earthquake-circles') ? 'earthquake-circles' : undefined);

    if (!map.getLayer(IDS.LYR_FAULT_LINES)){
      const layerDef = { id: IDS.LYR_FAULT_LINES, type: 'line', source: IDS.SRC_FAULTS, paint: {
        'line-color': lineColor, 'line-width': 1.5, 'line-opacity': 0.8
      }};
      EQ_BELOW ? map.addLayer(layerDef, EQ_BELOW) : map.addLayer(layerDef);
    }

    if (!map.getLayer(IDS.LYR_PLATE_RIDGES)){
      const layerDef = { id: IDS.LYR_PLATE_RIDGES, type: 'line', source: IDS.SRC_RIDGES, paint: {
        'line-color': lineColor, 'line-width': 1, 'line-opacity': 0.7, 'line-dasharray': [2,2]
      }};
      EQ_BELOW ? map.addLayer(layerDef, EQ_BELOW) : map.addLayer(layerDef);
    }
    if (!map.getLayer(IDS.LYR_PLATE_TRENCHES)){
      const layerDef = { id: IDS.LYR_PLATE_TRENCHES, type: 'line', source: IDS.SRC_TRENCHES, paint: {
        'line-color': lineColor, 'line-width': 1, 'line-opacity': 0.7, 'line-dasharray': [2,2]
      }};
      EQ_BELOW ? map.addLayer(layerDef, EQ_BELOW) : map.addLayer(layerDef);
    }
    if (!map.getLayer(IDS.LYR_PLATE_TRANSFORMS)){
      const layerDef = { id: IDS.LYR_PLATE_TRANSFORMS, type: 'line', source: IDS.SRC_TRANSFORMS, paint: {
        'line-color': lineColor, 'line-width': 1, 'line-opacity': 0.7, 'line-dasharray': [2,2]
      }};
      EQ_BELOW ? map.addLayer(layerDef, EQ_BELOW) : map.addLayer(layerDef);
    }
  }

  window.PlatesLayer = { addLayers };
})();
