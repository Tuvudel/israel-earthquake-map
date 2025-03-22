/**
 * Map module for the Earthquake Visualization App
 * Handles map initialization and earthquake rendering using MapLibre GL JS
 */

// Define MapManager in the global scope immediately
window.MapManager = {};

// Then implement its functionality
(function(exports) {
    // Store a reference to the legend element
    let legendControl = null;
    
    // Store a reference to the custom popup element
    let popup = null;   
    
    /**
     * Initialize the MapLibre GL JS map
     * @returns {Object} MapLibre map instance
     */
    function initializeMap() {
        try {
            // Load RTL text plugin to handle Hebrew text rendering
            maplibregl.setRTLTextPlugin(
                CONFIG.urls.rtlTextPlugin,
                null,
                true // Force RTL regardless of map locale
            );
            
            // Create the MapLibre GL map
            const map = new maplibregl.Map({
                container: 'map',
                style: CONFIG.urls.mapStyle,
                center: CONFIG.map.center, // Note: MapLibre uses [lng, lat] order
                zoom: CONFIG.map.zoom,
                minZoom: CONFIG.map.minZoom,
                maxZoom: CONFIG.map.maxZoom,
                attributionControl: true,
                localIdeographFontFamily: false // Use map's font glyphs for non-Latin text
            });
            
            // Add navigation controls to the map (zoom in/out, rotation)
            map.addControl(new maplibregl.NavigationControl(), 'top-right');
            
            // Add scale to the map
            map.addControl(new maplibregl.ScaleControl({
                maxWidth: 100,
                unit: 'metric'
            }), 'bottom-left');
            
            // Initialize custom popup
            initializeCustomPopup();
            
            // Wait for map to fully load before adding sources and layers
            map.on('load', function() {
                // Initialize map sources and layers
                initializeMapSources(map);
                
                // Create a legend for the map
                createLegend(map);
                
                console.log('Map initialized successfully');
            });
            
            // Track zoom level changes for adaptive rendering
            map.on('zoomend', function() {
                const newZoom = map.getZoom();
                if (newZoom !== window.AppState.currentZoom) {
                    window.AppState.currentZoom = newZoom;
                }
            });
            
            // Track viewport changes for viewport-constrained rendering
            map.on('moveend', function() {
                const bounds = map.getBounds();
                window.AppState.viewportBounds = {
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                    contains: function(latLng) {
                        return latLng[0] >= this.south && 
                               latLng[0] <= this.north && 
                               latLng[1] >= this.west && 
                               latLng[1] <= this.east;
                    }
                };
            });
            
            // Setup click handler for earthquakes
            setupClickHandlers(map);
            
            // Store current zoom and initial viewport
            window.AppState.currentZoom = map.getZoom();
            const bounds = map.getBounds();
            window.AppState.viewportBounds = {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
                contains: function(latLng) {
                    return latLng[0] >= this.south && 
                           latLng[0] <= this.north && 
                           latLng[1] >= this.west && 
                           latLng[1] <= this.east;
                }
            };
            
            return map;
        } catch (error) {
            console.error('Map initialization error:', error);
            throw new Error('Failed to initialize map: ' + error.message);
        }
    }
    
    /**
     * Initialize the map sources and base layers
     * @param {Object} map - MapLibre map instance
     */
    function initializeMapSources(map) {
        // Initialize empty sources for data
        
        // Add source for recent earthquakes
        map.addSource(CONFIG.maplibre.sources.recent, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
        
        // Add source for historical earthquakes (no clustering)
        map.addSource(CONFIG.maplibre.sources.historical, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
        
        // Add source for plate boundaries
        map.addSource(CONFIG.maplibre.sources.plateBoundaries, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
        
        // Add base layer for recent earthquakes (circle markers)
        map.addLayer({
            id: CONFIG.maplibre.layers.recentEarthquakes,
            type: 'circle',
            source: CONFIG.maplibre.sources.recent,
            paint: {
                // Circle color by depth (default)
                'circle-color': [
                    'case',
                    ['<', ['get', 'depth'], 5], CONFIG.colors.depth.veryShallow,
                    ['<', ['get', 'depth'], 10], CONFIG.colors.depth.shallow,
                    ['<', ['get', 'depth'], 20], CONFIG.colors.depth.medium,
                    CONFIG.colors.depth.deep
                ],
                // Circle radius by magnitude (cubic scale)
                'circle-radius': [
                    '+',
                    4,
                    ['/', ['*', ['get', 'magnitude'], ['get', 'magnitude'], ['get', 'magnitude']], 2]
                ],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#000000',
                'circle-opacity': 0.8
            },
            layout: {
                visibility: 'none' // Start hidden
            }
        });
        
        // Add base layer for historical earthquakes (non-clustered circles)
        map.addLayer({
            id: CONFIG.maplibre.layers.historicalEarthquakes,
            type: 'circle',
            source: CONFIG.maplibre.sources.historical,
            paint: {
                // Circle color by depth (default)
                'circle-color': [
                    'case',
                    ['<', ['get', 'depth'], 5], CONFIG.colors.depth.veryShallow,
                    ['<', ['get', 'depth'], 10], CONFIG.colors.depth.shallow,
                    ['<', ['get', 'depth'], 20], CONFIG.colors.depth.medium,
                    CONFIG.colors.depth.deep
                ],
                // Circle radius by magnitude (cubic scale)
                'circle-radius': [
                    '+',
                    4,
                    ['/', ['*', ['get', 'magnitude'], ['get', 'magnitude'], ['get', 'magnitude']], 2]
                ],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#000000',
                'circle-opacity': 0.8
            },
            layout: {
                visibility: 'none' // Start hidden
            }
        });
        
        // Add layer for plate boundaries
        map.addLayer({
            id: CONFIG.maplibre.layers.plateBoundaries,
            type: 'line',
            source: CONFIG.maplibre.sources.plateBoundaries,
            paint: {
                'line-color': [
                    'match',
                    ['get', 'type'],
                    'transform fault', CONFIG.colors.plateBoundaries.transform,
                    'divergent boundary', CONFIG.colors.plateBoundaries.divergent,
                    'convergent boundary', CONFIG.colors.plateBoundaries.convergent,
                    CONFIG.colors.plateBoundaries.default
                ],
                'line-width': CONFIG.plateBoundaries.style.weight,
                'line-opacity': CONFIG.plateBoundaries.style.opacity,
                'line-blur': 0.5 // Slight blur for a smoother appearance
            },
            layout: {
                'line-cap': CONFIG.plateBoundaries.style.lineCap,
                'line-join': CONFIG.plateBoundaries.style.lineJoin,
                visibility: 'none' // Start hidden
            }
        });
        
        // Add a highlighted earthquake layer
        map.addLayer({
            id: CONFIG.maplibre.layers.highlight,
            type: 'circle',
            source: {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            },
            paint: {
                'circle-radius': 20,
                'circle-color': '#FF00FF', // Magenta
                'circle-stroke-width': 3,
                'circle-stroke-color': '#FFFFFF',
                'circle-opacity': 0.5,
                'circle-stroke-opacity': 0.9
            },
            layout: {
                visibility: 'none' // Start hidden
            }
        });
    }
    
    /**
     * Initialize the custom popup
     */
    function initializeCustomPopup() {
        popup = document.getElementById('map-popup');
        const closeButton = document.querySelector('.maplibre-popup-close');
        
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                hidePopup();
            });
        }
    }
    
    /**
     * Show the custom popup
     * @param {Object} map - MapLibre map instance
     * @param {Array} coordinates - [longitude, latitude] of the popup
     * @param {String} content - HTML content for the popup
     */
    function showPopup(map, coordinates, content) {
        if (!popup) return;
        
        // Set the content
        const popupContent = document.querySelector('.maplibre-popup-content');
        if (popupContent) {
            popupContent.innerHTML = content;
        }
        
        // Position the popup at the coordinates
        const point = map.project(coordinates);
        popup.style.left = point.x + 'px';
        popup.style.top = point.y + 'px';
        
        // Show the popup
        popup.style.display = 'block';
    }
    
    /**
     * Hide the custom popup
     */
    function hidePopup() {
        if (popup) {
            popup.style.display = 'none';
        }
    }
    
    /**
     * Setup click handlers for earthquakes
     * @param {Object} map - MapLibre map instance
     */
    function setupClickHandlers(map) {
        // Click handler for individual earthquakes (recent and historical)
        map.on('click', CONFIG.maplibre.layers.recentEarthquakes, function(e) {
            handleEarthquakeClick(e, map);
        });
        
        map.on('click', CONFIG.maplibre.layers.historicalEarthquakes, function(e) {
            handleEarthquakeClick(e, map);
        });
        
        // Change the cursor to a pointer when hovering
        map.on('mouseenter', CONFIG.maplibre.layers.recentEarthquakes, function() {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseenter', CONFIG.maplibre.layers.historicalEarthquakes, function() {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        // Change it back when leaving
        map.on('mouseleave', CONFIG.maplibre.layers.recentEarthquakes, function() {
            map.getCanvas().style.cursor = '';
        });
        
        map.on('mouseleave', CONFIG.maplibre.layers.historicalEarthquakes, function() {
            map.getCanvas().style.cursor = '';
        });
    }
    
    /**
     * Handle click on an earthquake
     * @param {Object} e - MapLibre click event
     * @param {Object} map - MapLibre map instance
     */
    function handleEarthquakeClick(e, map) {
        if (e.features.length === 0) return;
        
        const feature = e.features[0];
        const props = feature.properties;
        
        // Create the earthquake object from the properties
        const quake = {
            id: props.id || '',
            dateTime: new Date(props.dateTime),
            magnitude: props.magnitude,
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
            depth: props.depth,
            region: props.region || 'Unknown',
            type: props.type || 'Unknown',
            felt: props.felt === 'true' || props.felt === true
        };
        
        // Store the selected earthquake
        window.AppState.selectedEarthquake = quake;
        
        // Display details in the info panel
        window.UIManager.displayEarthquakeDetails(quake);
        
        // Show popup
        const popupContent = `
            <strong>Magnitude:</strong> ${quake.magnitude.toFixed(1)}<br>
            <strong>Date & Time:</strong> ${window.Utils.formatDateTime(quake.dateTime)}<br>
            <strong>Depth:</strong> ${quake.depth.toFixed(1)} km<br>
            <strong>Region:</strong> ${quake.region || 'Unknown'}<br>
            <strong>Type:</strong> ${quake.type || 'Unknown'}
            ${quake.felt === true ? '<br><span style="color: #4CAF50; font-weight: bold;">✓ Felt Earthquake</span>' : ''}
        `;
        
        showPopup(map, feature.geometry.coordinates, popupContent);
    }
    
    /**
     * Create a map legend based on current color mode
     * @param {Object} map - MapLibre map instance
     */
    function createLegend(map) {
        // Remove any existing legend
        if (legendControl) {
            legendControl.remove();
        }
        
        // Create a new legend div
        const legendDiv = document.createElement('div');
        legendDiv.className = 'legend';
        
        let colorMode = 'depth'; // Default fallback
            
        // Safely get the current dataset and color mode
        try {
            const activeDataset = window.AppState.activeDataset || 'recent';
            if (window.AppState.colorMode && 
                window.AppState.colorMode[activeDataset] !== undefined) {
                colorMode = window.AppState.colorMode[activeDataset];
            }
            console.log("Active color mode:", colorMode);
        } catch (e) {
            console.error("Error getting color mode:", e);
        }
        
        if (colorMode === 'magnitude') {
            // Magnitude legend
            legendDiv.innerHTML = createMagnitudeLegend();
        } else {
            // Depth legend (default)
            legendDiv.innerHTML = createDepthLegend();
        }
        
        // Add plate boundaries info if we're showing them
        if (window.AppState.showPlateBoundaries) {
            legendDiv.innerHTML += createPlateBoundariesLegend();
        }
        
        // Add the legend to the map container
        document.getElementById('map').appendChild(legendDiv);
        
        // Store reference to the legend
        legendControl = legendDiv;
    }
    
    /**
     * Create HTML for magnitude legend
     * @returns {string} HTML for magnitude legend
     */
    function createMagnitudeLegend() {
        return `
            <h4>Legend</h4>
            <div><strong>Magnitude:</strong></div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.magnitude.verySmall};"></div>
                <span>&lt; 2 (Very Small)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.magnitude.small};"></div>
                <span>2-3 (Small)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.magnitude.medium};"></div>
                <span>3-4 (Medium)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.magnitude.large};"></div>
                <span>4-5 (Large)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.magnitude.veryLarge};"></div>
                <span>5-6 (Very Large)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.magnitude.major};"></div>
                <span>6-7 (Major)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.magnitude.great};"></div>
                <span>&gt; 7 (Great)</span>
            </div>
            <div><strong>Size:</strong> Inversely proportional to depth<br>(deeper events are smaller)</div>
        `;
    }
    
    /**
     * Create HTML for depth legend
     * @returns {string} HTML for depth legend
     */
    function createDepthLegend() {
        return `
            <h4>Legend</h4>
            <div><strong>Depth:</strong></div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.depth.veryShallow};"></div>
                <span>&lt; 5 km (Very Shallow)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.depth.shallow};"></div>
                <span>5-10 km (Shallow)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.depth.medium};"></div>
                <span>10-20 km (Medium)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${CONFIG.colors.depth.deep};"></div>
                <span>&gt; 20 km (Deep)</span>
            </div>
            <div style="margin-top: 10px;"><strong>Size:</strong> <span class="size-scale-info">Shows magnitude (cubic scale)</span></div>
            <div class="compact-size-examples">
                <div class="size-example-item">
                    <div class="size-circle size-m3"></div>
                    <div class="size-circle size-m5"></div>
                    <div class="size-circle size-m7"></div>
                </div>
                <div class="size-labels">
                    <span>M3</span>
                    <span>M5</span>
                    <span>M7</span>
                </div>
            </div>
        `;
    }

    /**
     * Create HTML for plate boundaries legend
     * @returns {string} HTML for plate boundaries legend
     */
    function createPlateBoundariesLegend() {
        return `
            <hr>
            <div><strong>Plate Boundaries:</strong></div>
            <div class="legend-item">
                <div class="legend-line" style="background-color: ${CONFIG.colors.plateBoundaries.transform}; height: 4px; border: 1px solid white;"></div>
                <span>Dead Sea Transform Fault</span>
            </div>
            <div class="legend-item">
                <div class="legend-line" style="background-color: ${CONFIG.colors.plateBoundaries.divergent}; height: 4px; border: 1px solid white;"></div>
                <span>Divergent Boundary</span>
            </div>
        `;
    }
    
    /**
     * Toggle plate boundaries on/off
     * @param {boolean} show - Whether to show plate boundaries
     */
    function togglePlateBoundaries(show) {
        // Store the state in AppState
        window.AppState.showPlateBoundaries = show;
        
        // If the show flag is true, display the plate boundaries
        if (show) {
            displayPlateBoundaries();
        } else {
            // Otherwise, hide them
            const map = window.AppState.map;
            if (map.getLayer(CONFIG.maplibre.layers.plateBoundaries)) {
                map.setLayoutProperty(CONFIG.maplibre.layers.plateBoundaries, 'visibility', 'none');
            }
        }
        
        // Update the legend
        createLegend(window.AppState.map);
    }
    
    /**
     * Display plate boundaries on the map
     */
    function displayPlateBoundaries() {
        const map = window.AppState.map;
        
        // Check if plate data is available
        if (!window.PlateData || !window.PlateData.eastAfricanRift) {
            console.error('Plate boundaries data not found');
            return;
        }
        
        // Update the source data
        try {
            map.getSource(CONFIG.maplibre.sources.plateBoundaries).setData(window.PlateData.eastAfricanRift);
            
            // Show the layer
            map.setLayoutProperty(CONFIG.maplibre.layers.plateBoundaries, 'visibility', 'visible');
            
            console.log('Plate boundaries displayed');
        } catch (err) {
            console.error('Error displaying plate boundaries:', err);
        }
    }
    
    /**
     * Convert earthquake data to GeoJSON format for MapLibre
     * @param {Array} earthquakes - Array of earthquake data objects
     * @returns {Object} GeoJSON FeatureCollection
     */
    function convertToGeoJSON(earthquakes) {
        const features = earthquakes.map(quake => {
            // Basic feature with coordinates
            const feature = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [quake.longitude, quake.latitude] // [lng, lat] order for MapLibre
                },
                properties: {
                    id: quake.id || '',
                    dateTime: quake.dateTime ? quake.dateTime.toISOString() : '',
                    magnitude: quake.magnitude,
                    depth: quake.depth,
                    region: quake.region || 'Unknown',
                    type: quake.type || 'Unknown',
                    felt: quake.felt === true ? 'true' : 'false'
                }
            };
            
            return feature;
        });
        
        return {
            type: 'FeatureCollection',
            features: features
        };
    }
    
/**
     * Render the current filtered dataset on the map
     */
    function renderCurrentData() {
        console.time('renderCurrentData');
        window.AppState.performance.lastRenderTime = Date.now();
        
        const map = window.AppState.map;
        if (!map) {
            console.error('Map not initialized');
            return;
        }
        
        // Check map state in a more reliable way
        // The map.loaded() method isn't always accurate during tab switching
        const mapReadyForRendering = map.loaded() || map.isStyleLoaded();
        
        if (!mapReadyForRendering) {
            console.log('Map is not fully loaded, waiting for styledata event');
            
            // Use styledata event which fires when style is processed and ready
            // This is more reliable than 'load' for our purposes
            const handleStyleData = () => {
                // Remove the event listener to avoid duplicate renders
                map.off('styledata', handleStyleData);
                
                // Double-check sources existence
                const isHistorical = window.AppState.activeDataset === 'historical';
                const sourceId = isHistorical ? CONFIG.maplibre.sources.historical : CONFIG.maplibre.sources.recent;
                
                try {
                    // Attempt to get the source to make sure it exists
                    if (map.getSource(sourceId)) {
                        console.log(`Map style and source ${sourceId} ready, rendering...`);
                        // Try rendering again after a small delay for browser to catch up
                        setTimeout(renderCurrentData, 50);
                    } else {
                        console.log(`Source ${sourceId} not ready, checking again soon...`);
                        // Add another delay and try once more
                        setTimeout(renderCurrentData, 150);
                    }
                } catch (err) {
                    console.warn('Error checking source, will retry:', err);
                    setTimeout(renderCurrentData, 150);
                }
            };
            
            map.on('styledata', handleStyleData);
            return;
        }
        
        // Make sure all sources are properly initialized
        try {
            const isHistorical = window.AppState.activeDataset === 'historical';
            const sourceId = isHistorical ? CONFIG.maplibre.sources.historical : CONFIG.maplibre.sources.recent;
            
            if (!map.getSource(sourceId)) {
                console.log(`Source '${sourceId}' not found, initializing sources...`);
                
                // Re-initialize the sources if they're missing
                // This can happen after some map style changes or after tab switches
                initializeMapSources(map);
                
                // Try again after sources are initialized
                setTimeout(renderCurrentData, 100);
                return;
            }
        } catch (err) {
            console.warn('Error checking sources:', err);
            setTimeout(renderCurrentData, 100);
            return;
        }
        
        // Hide all layers first
        hideAllLayers();
        
        // Update the legend to match current color mode
        createLegend(map);
        
        const isHistorical = window.AppState.activeDataset === 'historical';
        
        try {
            if (isHistorical) {
                renderHistoricalData(map);
            } else {
                renderRecentData(map);
            }
            
            // Re-add plate boundaries if they should be shown
            if (window.AppState.showPlateBoundaries) {
                displayPlateBoundaries();
            }
            
            // Update information panel
            window.UIManager.updateStatisticsDisplay();
            
            // Track rendering performance
            window.AppState.performance.renderDuration = Date.now() - window.AppState.performance.lastRenderTime;
            console.log(`Rendering completed in ${window.AppState.performance.renderDuration}ms`);
        } catch (err) {
            console.error('Error rendering data:', err);
            window.Utils.showStatus('Error rendering earthquake data. Please try refreshing the page.', true);
        }
        
        console.timeEnd('renderCurrentData');
    }
    
/**
     * Render recent earthquake data
     * @param {Object} map - MapLibre map instance
     */
    function renderRecentData(map) {
        // Get earthquake data
        const earthquakes = window.AppState.data.recent.filtered;
        if (!earthquakes) {
            console.warn('No recent earthquake data to render');
            window.Utils.showStatus("No earthquake data available. Please try refreshing the page.");
            return;
        }
        
        console.log(`Preparing to render ${earthquakes.length} recent earthquakes`);
        
        // Convert data to GeoJSON
        const geojson = convertToGeoJSON(earthquakes);
        
        try {
            // Check if source is available
            const source = map.getSource(CONFIG.maplibre.sources.recent);
            if (!source) {
                console.error(`Source '${CONFIG.maplibre.sources.recent}' not found, waiting for source to be ready...`);
                
                // Try again after a short delay
                setTimeout(() => renderCurrentData(), 100);
                return;
            }
            
            // Update the source with earthquake data
            source.setData(geojson);
            console.log(`Updated source with ${earthquakes.length} recent earthquakes`);
            
            // Update layer styling based on current color mode
            updateLayerStyling(map, CONFIG.maplibre.layers.recentEarthquakes, 'recent');
            
            // Show the layer
            map.setLayoutProperty(CONFIG.maplibre.layers.recentEarthquakes, 'visibility', 'visible');
            
            // Show appropriate status messages
            if (earthquakes.length === 0) {
                window.Utils.showStatus("No earthquakes match the current filters. Try adjusting your criteria.");
            } else {
                window.Utils.hideStatus();
            }
            
            console.log(`Successfully rendered ${earthquakes.length} recent earthquakes`);
        } catch (err) {
            console.error('Error rendering recent data:', err);
            window.Utils.showStatus('Error rendering earthquake data. The map source may not be ready yet.', true);
            
            // Try again after a short delay
            setTimeout(() => renderCurrentData(), 200);
        }
    }
    
    /**
     * Render historical earthquake data
     * @param {Object} map - MapLibre map instance
     */
    function renderHistoricalData(map) {
        // Get earthquake data
        const earthquakes = window.AppState.data.historical.filtered;
        if (!earthquakes || earthquakes.length === 0) {
            console.warn('No historical earthquake data to render or empty dataset');
            window.Utils.showStatus("No earthquakes match the current filters. Try adjusting your criteria.");
            return;
        }
        
        console.log(`Preparing to render ${earthquakes.length} historical earthquakes`);
        
        // Store all filtered earthquakes for statistics (no sampling)
        window.AppState.data.historical.displayed = earthquakes;
        
        // Convert to GeoJSON
        const geojson = convertToGeoJSON(earthquakes);
        
        try {
            // Check if source is available
            const source = map.getSource(CONFIG.maplibre.sources.historical);
            if (!source) {
                console.error(`Source '${CONFIG.maplibre.sources.historical}' not found, waiting for source to be ready...`);
                
                // Try again after a short delay
                setTimeout(() => renderCurrentData(), 100);
                return;
            }
            
            // Update the source with earthquake data
            source.setData(geojson);
            console.log(`Updated source with ${earthquakes.length} earthquakes`);
            
            // Update layer styling based on current color mode
            updateLayerStyling(map, CONFIG.maplibre.layers.historicalEarthquakes, 'historical');
            
            // Show the layer
            map.setLayoutProperty(CONFIG.maplibre.layers.historicalEarthquakes, 'visibility', 'visible');
            
            // Hide status message for successful rendering
            window.Utils.hideStatus();
            
            console.log(`Successfully rendered ${earthquakes.length} historical earthquakes`);
        } catch (err) {
            console.error('Error rendering historical data:', err);
            window.Utils.showStatus('Error rendering earthquake data. The map source may not be ready yet.', true);
            
            // Try again after a short delay
            setTimeout(() => renderCurrentData(), 200);
        }
    }
    
    /**
     * Update styling for earthquake layers based on color mode
     * @param {Object} map - MapLibre map instance
     * @param {string} layerId - Layer ID to update
     * @param {string} datasetType - 'recent' or 'historical'
     */
    function updateLayerStyling(map, layerId, datasetType) {
        const colorMode = window.AppState.colorMode[datasetType];
        
        if (colorMode === 'magnitude') {
            // Color by magnitude
            map.setPaintProperty(layerId, 'circle-color', [
                'case',
                ['<', ['get', 'magnitude'], 2], CONFIG.colors.magnitude.verySmall,
                ['<', ['get', 'magnitude'], 3], CONFIG.colors.magnitude.small,
                ['<', ['get', 'magnitude'], 4], CONFIG.colors.magnitude.medium,
                ['<', ['get', 'magnitude'], 5], CONFIG.colors.magnitude.large,
                ['<', ['get', 'magnitude'], 6], CONFIG.colors.magnitude.veryLarge,
                ['<', ['get', 'magnitude'], 7], CONFIG.colors.magnitude.major,
                CONFIG.colors.magnitude.great
            ]);
            
            // Size by depth (inverse relationship)
            map.setPaintProperty(layerId, 'circle-radius', [
                'case',
                ['<', ['get', 'depth'], 5], 18,
                ['<', ['get', 'depth'], 30], ['-', 15, ['*', 0.28, ['-', ['get', 'depth'], 5]]],
                ['max', 5, ['-', 8, ['*', 0.05, ['-', ['get', 'depth'], 30]]]]
            ]);
        } else {
            // Color by depth (default)
            map.setPaintProperty(layerId, 'circle-color', [
                'case',
                ['<', ['get', 'depth'], 5], CONFIG.colors.depth.veryShallow,
                ['<', ['get', 'depth'], 10], CONFIG.colors.depth.shallow,
                ['<', ['get', 'depth'], 20], CONFIG.colors.depth.medium,
                CONFIG.colors.depth.deep
            ]);
            
            // Size by magnitude (cubic scale)
            map.setPaintProperty(layerId, 'circle-radius', [
                '+',
                4,
                ['/', ['*', ['get', 'magnitude'], ['get', 'magnitude'], ['get', 'magnitude']], 2]
            ]);
        }
    }
    
    /**
     * Hide all earthquake layers
     */
    function hideAllLayers() {
        const map = window.AppState.map;
        
        // Hide earthquake layers
        map.setLayoutProperty(CONFIG.maplibre.layers.recentEarthquakes, 'visibility', 'none');
        map.setLayoutProperty(CONFIG.maplibre.layers.historicalEarthquakes, 'visibility', 'none');
        
        // Hide plate boundaries
        map.setLayoutProperty(CONFIG.maplibre.layers.plateBoundaries, 'visibility', 'none');
        
        // Hide highlight marker
        map.setLayoutProperty(CONFIG.maplibre.layers.highlight, 'visibility', 'none');
        
        // Hide popup
        hidePopup();
    }
    
    /**
     * Center the map on a specific earthquake and highlight it
     * @param {Object} earthquake - Earthquake object to center on
     */
    function centerAndHighlightEarthquake(earthquake) {
        if (!earthquake || !earthquake.latitude || !earthquake.longitude) {
            console.warn('Cannot center on earthquake: Invalid earthquake data');
            return;
        }
        
        console.log('Centering on earthquake:', earthquake);
        
        const map = window.AppState.map;
        
        // Store the current earthquake
        window.AppState.selectedEarthquake = earthquake;
        
        // Update details panel
        window.UIManager.displayEarthquakeDetails(earthquake);
        
        // Create coordinates in [lng, lat] order for MapLibre
        const coords = [earthquake.longitude, earthquake.latitude];
        
        // Fly to the earthquake location with appropriate zoom
        map.flyTo({
            center: coords,
            zoom: 10,
            duration: 1500, // Animation duration in milliseconds
            essential: true // Animation will not be interrupted by other map operations
        });
        
        // Create a highlighted marker
        const highlightData = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: coords
                },
                properties: {
                    magnitude: earthquake.magnitude,
                    depth: earthquake.depth
                }
            }]
        };
        
        // Update the highlight source and show it
        if (map.getSource(`${CONFIG.maplibre.layers.highlight}-source`)) {
            // If source already exists, update it
            map.getSource(`${CONFIG.maplibre.layers.highlight}-source`).setData(highlightData);
        } else {
            // Create a new source
            map.addSource(`${CONFIG.maplibre.layers.highlight}-source`, {
                type: 'geojson',
                data: highlightData
            });
            
            // Update the layer source
            map.setLayoutProperty(CONFIG.maplibre.layers.highlight, 'visibility', 'visible');
        }
        
        // Make the highlighted point pulse
        const highlightCircle = map.getPaintProperty(CONFIG.maplibre.layers.highlight, 'circle-radius');
        const initialRadius = 20;
        
        // Use a pulse effect by animating the circle radius
        let start;
        function animatePulse(timestamp) {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / 2000; // 2-second animation cycle
            
            // Calculate pulse effect - cycle between 60% and 140% of initial size
            const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.4;
            const radius = initialRadius * scale;
            
            // Update the circle radius
            map.setPaintProperty(CONFIG.maplibre.layers.highlight, 'circle-radius', radius);
            
            // Continue animation loop if visible
            if (map.getLayoutProperty(CONFIG.maplibre.layers.highlight, 'visibility') === 'visible') {
                window.requestAnimationFrame(animatePulse);
            }
        }
        
        // Start the animation
        window.requestAnimationFrame(animatePulse);
        
        // Show popup with earthquake info
        const popupContent = `
            <strong>Maximum Magnitude Earthquake (${earthquake.magnitude.toFixed(1)})</strong><br>
            <strong>Date & Time:</strong> ${window.Utils.formatDateTime(earthquake.dateTime)}<br>
            <strong>Depth:</strong> ${earthquake.depth.toFixed(1)} km<br>
            <strong>Region:</strong> ${earthquake.region || 'Unknown'}<br>
            <strong>Type:</strong> ${earthquake.type || 'Unknown'}
            ${earthquake.felt === true ? '<br><span style="color: #4CAF50; font-weight: bold;">✓ Felt Earthquake</span>' : ''}
        `;
        
        showPopup(map, coords, popupContent);
        
        // Auto-hide the highlight after 5 seconds
        setTimeout(() => {
            map.setLayoutProperty(CONFIG.maplibre.layers.highlight, 'visibility', 'none');
            hidePopup();
        }, 5000);
    }
    
    // Assign methods to the MapManager object
    exports.initializeMap = initializeMap;
    exports.renderCurrentData = renderCurrentData;
    exports.hideAllLayers = hideAllLayers;
    exports.createLegend = createLegend;
    exports.centerAndHighlightEarthquake = centerAndHighlightEarthquake;
    exports.togglePlateBoundaries = togglePlateBoundaries;
    
})(window.MapManager);

// Signal that MapManager is fully loaded
console.log('MapManager module loaded and initialized');