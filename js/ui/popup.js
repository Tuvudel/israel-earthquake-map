// Popup HTML builder
// Exposes window.Popup.buildHTML(props)
(function(){
  function buildHTML(props){
    const locText = props.location_text || [props.city, props.area, props.country].filter(Boolean).join(', ');
    const depthVal = Number(props.depth);
    const depthText = Number.isFinite(depthVal) ? depthVal.toFixed(1) : (props.depth ?? '—');
    const magnitude = props.magnitude != null ? props.magnitude : (props.mag != null ? props.mag : '—');
    const dateStr = props['date-time'] || props.date || props.time || '—';

    return (
      `<div class="earthquake-popup">`
      + `<h4>Magnitude ${magnitude}</h4>`
      + `<p><strong>Date:</strong> ${dateStr}</p>`
      + `<p><strong>Depth:</strong> ${depthText} km</p>`
      + `<p><strong>Location:</strong> ${locText}</p>`
      + (props['felt?'] ? '<p><sl-badge variant="danger" pill size="small">Felt</sl-badge></p>' : '')
      + `</div>`
    );
  }
  window.Popup = { buildHTML };
})();
