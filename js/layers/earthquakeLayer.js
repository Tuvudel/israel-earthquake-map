// Earthquake layer module
// Provides: window.EarthquakeLayer.addSourceAndLayers(map)
(function(){
  function addSourceAndLayers(map){
    const IDS = (window.Constants && window.Constants.IDS) ? window.Constants.IDS : {
      SRC_EARTHQUAKES: 'earthquakes',
      LYR_EARTHQUAKE_CIRCLES: 'earthquake-circles',
      LYR_EARTHQUAKE_GLOW: 'earthquake-glow'
    };

    if (!map.getSource(IDS.SRC_EARTHQUAKES)){
      map.addSource(IDS.SRC_EARTHQUAKES, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'epiid'
      });
    }

    const MAG = (window.Constants && window.Constants.MAGNITUDE_CLASSES) ? window.Constants.MAGNITUDE_CLASSES : null;
    const C_MINOR = MAG ? MAG.minor.color : '#6aa84f';
    const C_LIGHT = MAG ? MAG.light.color : '#d5bf5a';
    const C_MODERATE = MAG ? MAG.moderate.color : '#f2a144';
    const C_STRONG = MAG ? MAG.strong.color : '#d6553f';
    const C_MAJOR = MAG ? MAG.major.color : '#9e2f3a';

    if (!map.getLayer(IDS.LYR_EARTHQUAKE_CIRCLES)){
      map.addLayer({
        id: IDS.LYR_EARTHQUAKE_CIRCLES,
        type: 'circle',
        source: IDS.SRC_EARTHQUAKES,
        paint: {
          'circle-radius': [
            'case', ['has', 'magnitude'],
            ['interpolate', ['linear'], ['get', 'magnitude'],
              2.5, 2, 3.5, 5, 4.5, 10, 5.5, 22, 6.0, 32, 6.5, 44, 7.0, 64
            ],
            4
          ],
          'circle-color': [
            'case', ['has', 'magnitudeClass'],
            ['match', ['get', 'magnitudeClass'],
              'minor', C_MINOR,
              'light', C_LIGHT,
              'moderate', C_MODERATE,
              'strong', C_STRONG,
              'major', C_MAJOR,
              '#95a5a6'
            ], '#95a5a6'
          ],
          'circle-opacity': ['case', ['boolean', ['feature-state', 'highlighted'], false], 1.0, 0.85],
          'circle-stroke-width': 1.25,
          'circle-stroke-color': '#ffffff'
        }
      });
    }

    if (!map.getLayer(IDS.LYR_EARTHQUAKE_GLOW)){
      map.addLayer({
        id: IDS.LYR_EARTHQUAKE_GLOW,
        type: 'circle',
        source: IDS.SRC_EARTHQUAKES,
        paint: {
          'circle-radius': ['*', ['interpolate', ['linear'], ['get', 'magnitude'],
            2.5, 6, 3.5, 12, 4.5, 22, 5.5, 40, 6.5, 64, 7.0, 92
          ], 1.0],
          'circle-color': [
            'case', ['has', 'magnitudeClass'],
            ['match', ['get', 'magnitudeClass'],
              'minor', C_MINOR,
              'light', C_LIGHT,
              'moderate', C_MODERATE,
              'strong', C_STRONG,
              'major', C_MAJOR,
              '#95a5a6'
            ], '#95a5a6'
          ],
          'circle-opacity': 0.14,
          'circle-blur': 0.6,
          'circle-stroke-width': 0
        }
      }, IDS.LYR_EARTHQUAKE_CIRCLES);
    }
  }

  window.EarthquakeLayer = { addSourceAndLayers: addSourceAndLayers };
})();
