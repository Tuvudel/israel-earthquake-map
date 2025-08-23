// Popup HTML builder
// Exposes window.Popup.buildHTML(props)
(function(){
  function buildHTML(props){
    const locText = props.location_text || [props.city, props.area, props.country].filter(Boolean).join(', ');
    const depthVal = Number(props.depth);
    const depthText = Number.isFinite(depthVal) ? depthVal.toFixed(1) : (props.depth ?? '—');
    const magnitude = props.magnitude != null ? props.magnitude : (props.mag != null ? props.mag : '—');
    
    // Format date with timezone information
    let dateStr = props['date-time'] || props.date || props.time || '—';
    if (props.localDateObject && props.timezoneOffset) {
      const localTime = props.localDateObject.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      dateStr = `${localTime} ${props.timezoneOffset}`;
    }

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
