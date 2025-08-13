// Map controller for MapLibre GL JS
class MapController {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.earthquakeSource = null;
        this.hoveredEarthquakeId = null;
        
        this.initializeMap();
    }
    
    initializeMap() {
        // Initialize MapLibre GL JS map
        // Enable RTL text for Hebrew/Arabic labels
        if (typeof maplibregl !== 'undefined' && typeof maplibregl.setRTLTextPlugin === 'function') {
            try {
                maplibregl.setRTLTextPlugin(
                    'https://cdn.jsdelivr.net/npm/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.js',
                    null,
                    true // lazy load for performance
                );
            } catch (e) {
                console.warn('Failed to set RTL text plugin:', e);
            }
        }

        this.map = new maplibregl.Map({
            container: 'map',
            style: 'css/positron.json',
            center: [35.2, 31.8], // Center on Israel
            zoom: 7,
            minZoom: 5,
            maxZoom: 15
        });
        
        // Add navigation controls
        this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
        
        // Add scale control
        this.map.addControl(new maplibregl.ScaleControl(), 'bottom-right');
        
        // Wait for map to load before adding earthquake data
        this.map.on('load', () => {
            this.setupEarthquakeLayer();
            
            // Mobile-specific: Force resize after load
            setTimeout(() => {
                this.map.resize();
                console.log('Map resized for mobile compatibility');
            }, 100);
            
            // Call app callback when map is ready
            if (this.app.mapReadyCallback) {
                this.app.mapReadyCallback();
            }
        });
        
        // Add window resize listener for mobile orientation changes
        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (this.map) {
                    this.map.resize();
                }
            }, 100);
        });
        
    }
    
    setupEarthquakeLayer() {
        // Add earthquake data source
        this.map.addSource('earthquakes', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            },
            // Promote unique earthquake id for feature-state (hover highlight)
            promoteId: 'epiid'
        });
        
        // Setup fault and plate boundary layers
        this.setupFaultAndPlateLayer();
        
        // Setup circle markers with improved styling and halo
        this.setupCircleLayer();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Note: Earthquake labels removed due to glyphs requirement
        // Labels would need a custom font/glyphs configuration
    }
    
    setupFaultAndPlateLayer() {
        // Add fault lines data source
        this.map.addSource('faults', {
            type: 'geojson',
            data: 'data/faults_plates/EMME_faults.geojson'
        });
        
        // Add tectonic plate boundaries data sources
        this.map.addSource('ridges', {
            type: 'geojson',
            data: 'data/faults_plates/ridge.geojson'
        });
        
        this.map.addSource('trenches', {
            type: 'geojson',
            data: 'data/faults_plates/trench.geojson'
        });
        
        this.map.addSource('transforms', {
            type: 'geojson',
            data: 'data/faults_plates/transform.geojson'
        });
        
        // Add fault lines layer (solid black lines)
        this.map.addLayer({
            id: 'fault-lines',
            type: 'line',
            source: 'faults',
            paint: {
                'line-color': '#000000',
                'line-width': 1.5,
                'line-opacity': 0.8
            }
        });
        
        // Add tectonic plate boundary layers (dotted black lines)
        this.map.addLayer({
            id: 'plate-ridges',
            type: 'line',
            source: 'ridges',
            paint: {
                'line-color': '#000000',
                'line-width': 1,
                'line-opacity': 0.7,
                'line-dasharray': [2, 2]
            }
        });
        
        this.map.addLayer({
            id: 'plate-trenches',
            type: 'line',
            source: 'trenches',
            paint: {
                'line-color': '#000000',
                'line-width': 1,
                'line-opacity': 0.7,
                'line-dasharray': [2, 2]
            }
        });
        
        this.map.addLayer({
            id: 'plate-transforms',
            type: 'line',
            source: 'transforms',
            paint: {
                'line-color': '#000000',
                'line-width': 1,
                'line-opacity': 0.7,
                'line-dasharray': [2, 2]
            }
        });
    }
    

    
    setupCircleLayer() {
        // Circle layer with smoother scaling and Positron-friendly colors
        this.map.addLayer({
            id: 'earthquake-circles',
            type: 'circle',
            source: 'earthquakes',
            paint: {
                // size by magnitude (gentle at low mags, strong at high)
                'circle-radius': [
                    'case',
                    ['has', 'magnitude'],
                    [
                        'interpolate', ['linear'], ['get', 'magnitude'],
                        2.5, 2,
                        3.5, 5,
                        4.5, 10,
                        5.5, 22,
                        6.0, 32,
                        6.5, 44,
                        7.0, 64
                    ],
                    4
                ],
                // color by magnitude class (muted palette to match Positron)
                'circle-color': [
                    'case',
                    ['has', 'magnitudeClass'],
                    [
                        'match',
                        ['get', 'magnitudeClass'],
                        'minor', '#6aa84f',
                        'light', '#d5bf5a',
                        'moderate', '#f2a144',
                        'strong', '#d6553f',
                        'major', '#9e2f3a',
                        '#95a5a6'
                    ],
                    '#95a5a6'
                ],
                'circle-opacity': [
                    'case', ['boolean', ['feature-state', 'highlighted'], false], 1.0, 0.85
                ],
                'circle-stroke-width': 1.25,
                'circle-stroke-color': '#ffffff'
            }
        });

        // Soft glow below the circles for improved legibility
        this.map.addLayer({
            id: 'earthquake-glow',
            type: 'circle',
            source: 'earthquakes',
            paint: {
                'circle-radius': [
                    '*',
                    [
                        'interpolate', ['linear'], ['get', 'magnitude'],
                        2.5, 6,
                        3.5, 12,
                        4.5, 22,
                        5.5, 40,
                        6.5, 64,
                        7.0, 92
                    ],
                    1.0
                ],
                'circle-color': [
                    'case',
                    ['has', 'magnitudeClass'],
                    [
                        'match',
                        ['get', 'magnitudeClass'],
                        'minor', '#6aa84f',
                        'light', '#d5bf5a',
                        'moderate', '#f2a144',
                        'strong', '#d6553f',
                        'major', '#9e2f3a',
                        '#95a5a6'
                    ],
                    '#95a5a6'
                ],
                'circle-opacity': 0.14,
                'circle-blur': 0.6,
                'circle-stroke-width': 0
            }
        }, 'earthquake-circles'); // insert directly beneath circles
    }
    
    setupEventListeners() {
        // Handle earthquake-circles layer
        const layerId = 'earthquake-circles';
        
        // Mouse enter event
        this.map.on('mouseenter', layerId, (e) => {
            this.map.getCanvas().style.cursor = 'pointer';
            
            if (e.features.length > 0) {
                // Highlight feature
                if (this.hoveredFeatureId !== null) {
                    this.map.setFeatureState(
                        { source: 'earthquakes', id: this.hoveredFeatureId },
                        { highlighted: false }
                    );
                }
                
                this.hoveredFeatureId = e.features[0].id;
                this.map.setFeatureState(
                    { source: 'earthquakes', id: this.hoveredFeatureId },
                    { highlighted: true }
                );
                
                // Show popup
                this.showPopup(e);
            }
        });
        
        // Mouse leave event
        this.map.on('mouseleave', layerId, () => {
            this.map.getCanvas().style.cursor = '';
            
            if (this.hoveredFeatureId !== null) {
                this.map.setFeatureState(
                    { source: 'earthquakes', id: this.hoveredFeatureId },
                    { highlighted: false }
                );
            }
            
            this.hoveredFeatureId = null;
            this.popup.remove();
        });
        
        // Click event
        this.map.on('click', layerId, (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                const eqId = feature.properties.epiid;
                
                // Notify app about earthquake click
                if (this.app && this.app.onEarthquakeClick) {
                    this.app.onEarthquakeClick(eqId);
                }
            }
        });
    }
    
    showPopup(e) {
        const feature = e.features[0];
        const props = feature.properties;
        
        // Prefer enriched USGS-style location_text; fallback to city/area/country
        const locText = props.location_text 
            || [props.city, props.area, props.country].filter(Boolean).join(', ');
        const depthVal = Number(props.depth);
        const depthText = Number.isFinite(depthVal) ? depthVal.toFixed(1) : (props.depth ?? '—');

        // Create popup content
        const popupContent = `
            <div class="earthquake-popup">
                <h4>Magnitude ${props.magnitude}</h4>
                <p><strong>Date:</strong> ${props['date-time'] || props.date}</p>
                <p><strong>Depth:</strong> ${depthText} km</p>
                <p><strong>Location:</strong> ${locText}</p>
                ${props['felt?'] ? '<p><span class="felt-indicator">Felt</span></p>' : ''}
            </div>
        `;
        
        // Create and show popup
        if (this.popup) {
            this.popup.remove();
        }
        
        this.popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 10
        })
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(this.map);
    }
    
    hidePopup() {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
    }
    
    updateEarthquakes(earthquakeData) {
        if (!this.map.getSource('earthquakes')) {
            return; // Map not ready yet
        }
        
        // Prepare GeoJSON data with unique IDs
        const geojsonData = {
            type: 'FeatureCollection',
            features: earthquakeData.map((feature, index) => ({
                ...feature,
                id: index // Add unique ID for feature state
            }))
        };
        
        // Update the source
        this.map.getSource('earthquakes').setData(geojsonData);
        
        // Fit map to show all earthquakes if there are any
        if (earthquakeData.length > 0) {
            this.fitToEarthquakes(earthquakeData);
        }
    }
    
    fitToEarthquakes(earthquakeData) {
        if (earthquakeData.length === 0) return;
        
        // Calculate bounds
        const coordinates = earthquakeData.map(feature => feature.geometry.coordinates);
        
        const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
        }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
        
        // Fit map to bounds with padding
        this.map.fitBounds(bounds, {
            padding: 50,
            maxZoom: 10
        });
    }
    
    highlightEarthquakeInTable(epiid) {
        // This will be called by the table controller
        if (this.app.table) {
            this.app.table.highlightEarthquake(epiid);
        }
    }
    
    // Method to highlight earthquake on map from table selection
    highlightEarthquake(epiid) {
        // Find the earthquake in current filtered data
        const earthquakeIndex = this.app.filteredData.findIndex(
            feature => feature.properties.epiid === epiid
        );
        
        if (earthquakeIndex !== -1) {
            const earthquake = this.app.filteredData[earthquakeIndex];
            const coordinates = earthquake.geometry.coordinates;
            
            // Center map on earthquake
            this.map.flyTo({
                center: coordinates,
                zoom: Math.max(this.map.getZoom(), 9),
                duration: 1000
            });
            
            // Temporarily highlight the earthquake
            setTimeout(() => {
                if (this.map.getSource('earthquakes')) {
                    this.map.setFeatureState(
                        { source: 'earthquakes', id: earthquakeIndex },
                        { hover: true }
                    );
                    
                    // Remove highlight after 2 seconds
                    setTimeout(() => {
                        this.map.setFeatureState(
                            { source: 'earthquakes', id: earthquakeIndex },
                            { hover: false }
                        );
                    }, 2000);
                }
            }, 500);
        }
    }
    
    // Method to zoom back to default view
    zoomToDefault() {
        this.map.flyTo({
            center: [35.2, 31.8], // Center on Israel
            zoom: 7,
            duration: 1000
        });
    }
}

// Make MapController available globally
window.MapController = MapController;

// Add custom CSS for popup
const popupStyles = `
<style>
.earthquake-popup {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 0.9rem;
    line-height: 1.4;
}

.earthquake-popup h4 {
    margin: 0 0 10px 0;
    color: #2c3e50;
    font-size: 1.1rem;
}

.earthquake-popup p {
    margin: 5px 0;
    color: #333;
}

.felt-indicator {
    background: #e74c3c;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.8rem;
    font-weight: bold;
}

.maplibregl-popup-content {
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.maplibregl-popup-tip {
    border-top-color: white;
}
</style>
`;

// Inject popup styles
document.head.insertAdjacentHTML('beforeend', popupStyles);
