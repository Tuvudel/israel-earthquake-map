// Map interactions for earthquake layer
// Exposes window.Interactions.attach(map, opts)
(function(){
  function attach(map, opts){
    const IDS = (window.Constants && window.Constants.IDS) ? window.Constants.IDS : {};
    const sourceId = opts && opts.sourceId || IDS.SRC_EARTHQUAKES || 'earthquakes';
    const layerId = opts && opts.layerId || IDS.LYR_EARTHQUAKE_CIRCLES || 'earthquake-circles';
    const onClick = (opts && opts.onClick) || function(){};
    const buildPopup = (opts && opts.buildPopup) || (window.Popup && window.Popup.buildHTML) || function(props){ return '' + (props && props.magnitude ? props.magnitude : ''); };

    let hoveredFeatureId = null;
    let popup = null;

    function onMouseEnter(e){
      map.getCanvas().style.cursor = 'pointer';
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      if (hoveredFeatureId !== null){
        map.setFeatureState({ source: sourceId, id: hoveredFeatureId }, { highlighted: false });
      }
      hoveredFeatureId = f.id; // relies on promoteId=epiid to populate id
      map.setFeatureState({ source: sourceId, id: hoveredFeatureId }, { highlighted: true });

      // build and show popup
      const html = buildPopup(f.properties || {});
      if (popup) { try { popup.remove(); } catch(_){} }
      popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    }

    function onMouseLeave(){
      map.getCanvas().style.cursor = '';
      if (hoveredFeatureId !== null){
        map.setFeatureState({ source: sourceId, id: hoveredFeatureId }, { highlighted: false });
      }
      hoveredFeatureId = null;
      if (popup) { try { popup.remove(); } catch(_){} popup = null; }
    }

    function onClickHandler(e){
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const epiid = f && f.properties && f.properties.epiid;
      if (epiid != null) onClick(epiid);
    }

    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    map.on('click', layerId, onClickHandler);

    function detach(){
      try { map.off('mouseenter', layerId, onMouseEnter); } catch(_){}
      try { map.off('mouseleave', layerId, onMouseLeave); } catch(_){}
      try { map.off('click', layerId, onClickHandler); } catch(_){}
      if (popup) { try { popup.remove(); } catch(_){} popup = null; }
    }

    return { detach };
  }

  window.Interactions = { attach };
})();
