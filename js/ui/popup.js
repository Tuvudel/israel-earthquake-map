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
    
    // Convert localDateObject string back to Date if needed
    let localDateObj = props.localDateObject;
    if (localDateObj && typeof localDateObj === 'string') {
      localDateObj = new Date(localDateObj);
    }
    
    // Check if we have timezone information and a valid date object
    if (localDateObj && props.timezoneOffset && localDateObj instanceof Date) {
      const localTime = localDateObj.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      dateStr = `${localTime} ${props.timezoneOffset}`;
    } else if (props.dateObject && props.dateObject instanceof Date) {
      // Fallback: use the original date object with timezone offset if available
      const timeStr = props.dateObject.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      dateStr = props.timezoneOffset ? `${timeStr} ${props.timezoneOffset}` : timeStr;
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
