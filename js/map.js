/**
 * Map module for the Earthquake Visualization App
 * Handles map initialization and earthquake rendering
 */

// Define MapManager in the global scope immediately
window.MapManager = {};

// Then implement its functionality
(function(exports) {
    // Store a reference to the legend
    let legendControl = null;
    
    // Store a reference to the plate boundaries layer
    let plateBoundariesLayer = null;
    
    /**
     * Initialize the Leaflet map
     * @returns {Object} Leaflet map instance
     */
    function initializeMap() {
        try {
            const map = L.map('map').setView(CONFIG.map.center, CONFIG.map.zoom);
            
            // Add OpenStreetMap base layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: CONFIG.map.maxZoom,
                minZoom: CONFIG.map.minZoom
            }).addTo(map);
            
            // Add a legend to the map
            updateLegend(map);
            
            // Track zoom level for adaptive rendering
            map.on('zoomend', function() {
                const newZoom = map.getZoom();
                if (newZoom !== window.AppState.currentZoom) {
                    window.AppState.currentZoom = newZoom;
                    // Re-render only if not using clustering (clustering handles this automatically)
                    if (window.AppState.activeDataset === 'historical' && 
                        window.AppState.renderMode.historical !== 'cluster') {
                        // Use a small delay to ensure smooth zooming
                        setTimeout(() => {
                            renderCurrentData();
                        }, 100);
                    }
                }
            });
            
            // Track viewport for viewport-constrained rendering
            map.on('moveend', function() {
                window.AppState.viewportBounds = map.getBounds();
                // Only re-render for canvas rendering or points when not using clustering
                if (window.AppState.activeDataset === 'historical' && 
                    window.AppState.renderMode.historical !== 'cluster' && 
                    CONFIG.render.useCanvas) {
                    // Skip re-rendering if the last render was very recent (for smooth panning)
                    const now = Date.now();
                    if (now - window.AppState.performance.lastRenderTime > 500) {
                        renderCurrentData();
                    }
                }
            });
            
            // Initial viewport bounds
            window.AppState.viewportBounds = map.getBounds();
            window.AppState.currentZoom = map.getZoom();
            
            return map;
        } catch (error) {
            console.error('Map initialization error:', error);
            throw new Error('Failed to initialize map: ' + error.message);
        }
    }
    
    /**
     * Update the map legend based on current color mode
     * @param {Object} map - Leaflet map instance
     */
    function updateLegend(map) {
        // Remove existing legend if it exists
        if (legendControl) {
            map.removeControl(legendControl);
        }
        
        // Create a new legend
        legendControl = L.control({ position: 'bottomright' });
        
        legendControl.onAdd = function() {
            const div = L.DomUtil.create('div', 'legend');
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
                div.innerHTML = createMagnitudeLegend();
            } else {
                // Depth legend (default)
                div.innerHTML = createDepthLegend();
            }
            
            // Add cluster info if we're using clustering
            if (window.AppState.activeDataset === 'historical' && 
                window.AppState.renderMode.historical === 'cluster') {
                div.innerHTML += createClusterLegend();
            }
            
            // Add plate boundaries info if we're showing them
            if (window.AppState.showPlateBoundaries) {
                div.innerHTML += createPlateBoundariesLegend();
            }
            
            return div;
        };
        
        legendControl.addTo(map);
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
     * Create HTML for cluster legend
     * @returns {string} HTML for cluster legend
     */
    function createClusterLegend() {
        return `
            <hr>
            <div><strong>Clusters:</strong></div>
            <div>Clusters show the number of earthquakes in an area</div>
            <div>Click on clusters to zoom in and see individual events</div>
            <div>Larger clusters contain more earthquakes</div>
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
     * Clear all map layers (markers, canvas, etc.)
     */
    function clearAllMapLayers() {
        // Remove standard marker layer if it exists
        if (window.AppState.markerLayer) {
            window.AppState.map.removeLayer(window.AppState.markerLayer);
            window.AppState.markerLayer = null;
        }
        
        // Remove canvas layer if it exists
        if (window.AppState.canvasLayer) {
            window.AppState.map.removeLayer(window.AppState.canvasLayer);
            window.AppState.canvasLayer = null;
        }
        
        // Remove cluster layer if it exists
        if (window.AppState.clusterLayer) {
            window.AppState.map.removeLayer(window.AppState.clusterLayer);
            window.AppState.clusterLayer = null;
        }
        
        // Remove highlight marker if it exists
        if (window.AppState.highlightMarker) {
            window.AppState.map.removeLayer(window.AppState.highlightMarker);
            window.AppState.highlightMarker = null;
        }
        
        // Also clear the highlight timeout if it exists
        if (window.AppState.highlightTimeout) {
            clearTimeout(window.AppState.highlightTimeout);
            window.AppState.highlightTimeout = null;
        }
        
        // Remove any other layers that might have been added
        if (window.AppState.heatLayer) {
            window.AppState.map.removeLayer(window.AppState.heatLayer);
            window.AppState.heatLayer = null;
        }
        
        // Force a redraw of the map to ensure all visual elements are cleared
        window.AppState.map.invalidateSize();
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
            // Otherwise, remove them if they exist
            removePlateBoundaries();
        }
        
        // Update the legend
        updateLegend(window.AppState.map);
    }
    
    /**
     * Display plate boundaries on the map
     */
    function displayPlateBoundaries() {
        // First remove any existing plate boundaries layer
        removePlateBoundaries();
        
        // Check if plate data is available
        if (!window.PlateData || !window.PlateData.eastAfricanRift) {
            console.error('Plate boundaries data not found');
            return;
        }

        // First add a white shadow/outline for the fault lines
        if (CONFIG.plateBoundaries.style.outlineWidth > 0) {
            const outlineLayer = L.geoJSON(window.PlateData.eastAfricanRift, {
                style: function(feature) {
                    return {
                        color: CONFIG.plateBoundaries.style.outlineColor || 'white',
                        weight: (CONFIG.plateBoundaries.style.weight || 3) + 
                                (CONFIG.plateBoundaries.style.outlineWidth * 2),
                        opacity: 0.8,
                        dashArray: CONFIG.plateBoundaries.style.dashArray,
                        lineCap: CONFIG.plateBoundaries.style.lineCap || 'round',
                        lineJoin: CONFIG.plateBoundaries.style.lineJoin || 'round'
                    };
                }
            });
            
            // Add outline layer below the actual fault lines
            outlineLayer.addTo(window.AppState.map);
            
            // Store the outline layer to remove it later
            window.AppState.plateBoundaryOutlineLayer = outlineLayer;
        }
        
        // Create the plate boundaries layer with styling from config
        plateBoundariesLayer = L.geoJSON(window.PlateData.eastAfricanRift, {
            style: function(feature) {
                // Get plate boundary color based on type if specified in properties
                let color = CONFIG.colors.plateBoundaries.default;
                
                if (feature.properties && feature.properties.type) {
                    const type = feature.properties.type.toLowerCase();
                    if (type.includes('transform')) {
                        color = CONFIG.colors.plateBoundaries.transform;
                    } else if (type.includes('divergent')) {
                        color = CONFIG.colors.plateBoundaries.divergent;
                    } else if (type.includes('convergent')) {
                        color = CONFIG.colors.plateBoundaries.convergent;
                    }
                }
                
                return {
                    color: color,
                    weight: CONFIG.plateBoundaries.style.weight || 3,
                    opacity: CONFIG.plateBoundaries.style.opacity || 0.8,
                    dashArray: CONFIG.plateBoundaries.style.dashArray,
                    lineCap: CONFIG.plateBoundaries.style.lineCap || 'round',
                    lineJoin: CONFIG.plateBoundaries.style.lineJoin || 'round',
                    className: 'plate-boundary',
                    zIndexOffset: CONFIG.plateBoundaries.style.zIndexOffset || 1000
                };
            },
            onEachFeature: function(feature, layer) {
                if (feature.properties && feature.properties.name) {
                    const tooltipContent = `
                        <strong>${feature.properties.name}</strong><br>
                        ${feature.properties.type}<br>
                        ${feature.properties.description || ''}
                    `;
                    
                    layer.bindTooltip(tooltipContent, { 
                        className: 'boundary-tooltip',
                        sticky: true,
                        opacity: 0.9
                    });
                    
                    // Make lines more interactive
                    layer.on('mouseover', function() {
                        this.setStyle({
                            weight: (CONFIG.plateBoundaries.style.weight || 3) + 2,
                            opacity: 1
                        });
                    });
                    
                    layer.on('mouseout', function() {
                        this.setStyle({
                            weight: CONFIG.plateBoundaries.style.weight || 3,
                            opacity: CONFIG.plateBoundaries.style.opacity || 0.8
                        });
                    });
                }
            }
        });
        
        // Add the layer to the map with high z-index to ensure it's above markers
        plateBoundariesLayer.addTo(window.AppState.map);
        
        // Bring the layer to front to ensure it appears on top of other layers
        plateBoundariesLayer.bringToFront();
        
        console.log('Plate boundaries displayed');
    }
    
    /**
     * Remove plate boundaries from the map
     */
    function removePlateBoundaries() {
        if (plateBoundariesLayer) {
            window.AppState.map.removeLayer(plateBoundariesLayer);
            plateBoundariesLayer = null;
        }
        
        // Also remove the outline layer if it exists
        if (window.AppState.plateBoundaryOutlineLayer) {
            window.AppState.map.removeLayer(window.AppState.plateBoundaryOutlineLayer);
            window.AppState.plateBoundaryOutlineLayer = null;
        }
        
        console.log('Plate boundaries removed');
    }
    
    /**
     * Render the current filtered dataset on the map
     */
    function renderCurrentData() {
        console.time('renderCurrentData');
        window.AppState.performance.lastRenderTime = Date.now();
        
        // First, clear all existing layers
        clearAllMapLayers();
        
        // Update the legend to match current color mode
        updateLegend(window.AppState.map);
        
        const isHistorical = window.AppState.activeDataset === 'historical';
        let earthquakes;
        
        if (isHistorical) {
            earthquakes = window.AppState.data.historical.filtered; // Use filtered data, not displayed
            
            // Choose rendering method based on render mode and data size
            const renderMode = window.AppState.renderMode.historical;
            
            if (renderMode === 'cluster') {
                renderClusteredMarkers(earthquakes);
            } else if (CONFIG.render.useCanvas && earthquakes.length > CONFIG.render.maxStandardMarkers) {
                renderCanvasMarkers(earthquakes);
            } else {
                displayEarthquakeMarkers(earthquakes);
            }
        } else {
            earthquakes = window.AppState.data.recent.filtered;
            displayEarthquakeMarkers(earthquakes);
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
        console.timeEnd('renderCurrentData');
    }
    
    /**
     * Display earthquake markers on the map using standard Leaflet markers
     * @param {Array} earthquakes - Array of earthquake data objects
     */
    function displayEarthquakeMarkers(earthquakes) {
        console.time('displayEarthquakeMarkers');
        
        // Clear existing layers first - crucial for proper filtering and tab switching
        clearAllMapLayers();
        
        // Create a simple layer group for markers
        window.AppState.markerLayer = L.layerGroup();
        
        // Show a warning if there are a lot of earthquakes
        if (earthquakes.length > 1000) {
            console.warn(`Rendering ${earthquakes.length} earthquake markers using standard markers.`);
            window.Utils.showStatus(`Displaying ${earthquakes.length} earthquakes - this might be slow. Consider applying more filters or using cluster mode.`);
        }
        
        // Only render what's potentially visible for large datasets
        let markersToRender = earthquakes;
        
        // If we have over 1000 points and it's historical data, filter by viewport
        if (earthquakes.length > 1000 && window.AppState.activeDataset === 'historical' && window.AppState.viewportBounds) {
            // Add padding to the bounds to include points just outside the viewport
            const padFactor = 0.2; // 20% padding
            const bounds = window.AppState.viewportBounds;
            
            // Calculate padded bounds
            const latPad = (bounds.getNorth() - bounds.getSouth()) * padFactor;
            const lngPad = (bounds.getEast() - bounds.getWest()) * padFactor;
            
            const paddedBounds = L.latLngBounds(
                [bounds.getSouth() - latPad, bounds.getWest() - lngPad],
                [bounds.getNorth() + latPad, bounds.getEast() + lngPad]
            );
            
            // Filter to points in the padded viewport
            markersToRender = earthquakes.filter(quake => 
                paddedBounds.contains([quake.latitude, quake.longitude])
            );
            
            console.log(`Viewport filtering: ${markersToRender.length} of ${earthquakes.length} earthquakes are in current view`);
        }
        
        // Batch DOM operations for better performance
        const markers = [];
        
        // Process each earthquake to create markers (batched)
        for (const quake of markersToRender) {
            // Skip if coordinates are invalid
            if (!quake.latitude || !quake.longitude || isNaN(quake.latitude) || isNaN(quake.longitude)) {
                console.warn('Skipping earthquake with invalid coordinates:', quake);
                continue;
            }
            
            // Ensure magnitude and depth are valid numbers
            const magnitude = parseFloat(quake.magnitude) || 0;
            const depth = parseFloat(quake.depth) || 0;
            
            // Determine marker size and color
            const markerSize = window.Utils.calculateMarkerSize(magnitude, depth);
            const markerColor = window.Utils.calculateMarkerColor(depth, magnitude);
            
            // Create a circular marker
            const marker = L.circleMarker([quake.latitude, quake.longitude], {
                radius: markerSize,
                fillColor: markerColor,
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
            
            // Add popup with information
            const popupContent = `
                <strong>Magnitude:</strong> ${quake.magnitude.toFixed(1)}<br>
                <strong>Date & Time:</strong> ${window.Utils.formatDateTime(quake.dateTime)}<br>
                <strong>Depth:</strong> ${quake.depth.toFixed(1)} km<br>
                <strong>Region:</strong> ${quake.region || 'Unknown'}<br>
                <strong>Type:</strong> ${quake.type || 'Unknown'}
                ${quake.felt === true ? '<br><span style="color: #4CAF50; font-weight: bold;">✓ Felt Earthquake</span>' : ''}
            `;
            marker.bindPopup(popupContent);
            
            // Store the earthquake data with the marker
            marker.earthquake = quake;
            
            // Add click event to display details in the info panel
            marker.on('click', () => {
                window.AppState.selectedEarthquake = quake;
                window.UIManager.displayEarthquakeDetails(quake);
            });
            
            // Collect markers for batch adding
            markers.push(marker);
        }
        
        // Add all markers to the layer in a single operation
        markers.forEach(marker => window.AppState.markerLayer.addLayer(marker));
        
        // Add the layer to the map
        window.AppState.map.addLayer(window.AppState.markerLayer);
        
        // Show appropriate status messages
        if (earthquakes.length === 0) {
            window.Utils.showStatus("No earthquakes match the current filters. Try adjusting your criteria.");
        } else if (markersToRender.length < earthquakes.length) {
            window.Utils.showStatus(`Showing ${markersToRender.length} of ${earthquakes.length} earthquakes in the current viewport. Zoom out to see more, or pan the map.`);
        } else {
            window.Utils.hideStatus();
        }
        
        console.timeEnd('displayEarthquakeMarkers');
    }
    
    /**
     * Render markers using canvas for better performance with large datasets
     * @param {Array} earthquakes - Array of earthquake data objects
     */
    function renderCanvasMarkers(earthquakes) {
        console.time('renderCanvasMarkers');
        
        // Clear existing layers first
        clearAllMapLayers();
        
        // Check for very large datasets
        if (earthquakes.length > 10000) {
            console.warn(`Rendering ${earthquakes.length} points on canvas, performance may be impacted`);
            window.Utils.showStatus(`Rendering ${earthquakes.length} earthquakes. For better performance, apply more filters or use cluster mode.`);
        }
        
        // Create an array of features for faster canvas rendering
        const features = earthquakes.filter(quake => {
            // Filter out invalid coordinates
            return quake.latitude && quake.longitude && !isNaN(quake.latitude) && !isNaN(quake.longitude);
        }).map(quake => {
            // Ensure magnitude and depth are valid numbers
            const magnitude = parseFloat(quake.magnitude) || 0;
            const depth = parseFloat(quake.depth) || 0;
            
            const markerSize = window.Utils.calculateMarkerSize(magnitude, depth);
            const markerColor = window.Utils.calculateMarkerColor(depth, magnitude);
            
            return {
                type: 'Feature',
                properties: {
                    magnitude: magnitude,
                    depth: depth,
                    size: markerSize,
                    color: markerColor,
                    id: quake.id,
                    earthquake: quake
                },
                geometry: {
                    type: 'Point',
                    coordinates: [quake.longitude, quake.latitude]
                }
            };
        });
        
        // Create a GeoJSON layer for canvas rendering
        const geojsonOptions = {
            pointToLayer: function(feature, latlng) {
                const quake = feature.properties.earthquake;
                const opts = {
                    radius: feature.properties.size,
                    fillColor: feature.properties.color,
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                };
                
                const marker = L.circleMarker(latlng, opts);
                
                // Add popup
                const popupContent = `
                    <strong>Magnitude:</strong> ${quake.magnitude.toFixed(1)}<br>
                    <strong>Date & Time:</strong> ${window.Utils.formatDateTime(quake.dateTime)}<br>
                    <strong>Depth:</strong> ${quake.depth.toFixed(1)} km<br>
                    <strong>Region:</strong> ${quake.region || 'Unknown'}<br>
                    <strong>Type:</strong> ${quake.type || 'Unknown'}
                `;
                marker.bindPopup(popupContent);
                
                // Add click handler
                marker.on('click', () => {
                    window.AppState.selectedEarthquake = quake;
                    window.UIManager.displayEarthquakeDetails(quake);
                });
                
                return marker;
            }
        };
        
        // Use a normal GeoJSON layer with optimized rendering
        window.AppState.canvasLayer = L.geoJSON({ 
            type: 'FeatureCollection', 
            features: features 
        }, geojsonOptions).addTo(window.AppState.map);
        
        // Show a message if no earthquakes match the current filters
        if (earthquakes.length === 0) {
            window.Utils.showStatus("No earthquakes match the current filters. Try adjusting your criteria.");
        } else {
            window.Utils.hideStatus();
        }
        
        console.timeEnd('renderCanvasMarkers');
    }
    
    /**
     * Render markers using clustering for optimal performance with large datasets
     * @param {Array} earthquakes - Array of earthquake data objects
     */
    function renderClusteredMarkers(earthquakes) {
        console.time('renderClusteredMarkers');
        
        // Clear existing layers first
        clearAllMapLayers();
        
        // Create a marker cluster group
        const clusterOptions = {
            chunkedLoading: true, // Process markers in chunks for better performance
            maxClusterRadius: CONFIG.render.cluster.maxClusterRadius,
            disableClusteringAtZoom: CONFIG.render.cluster.disableClusteringAtZoom,
            spiderfyOnMaxZoom: CONFIG.render.cluster.spiderfyOnMaxZoom,
            showCoverageOnHover: CONFIG.render.cluster.showCoverageOnHover,
            zoomToBoundsOnClick: CONFIG.render.cluster.zoomToBoundsOnClick,
            animate: CONFIG.render.cluster.animate,
            // Add tooltips to clusters
            polygonOptions: {
                fillColor: '#fff',
                color: '#2d5075',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.3
            },
            
            // Custom cluster icon function
            iconCreateFunction: function(cluster) {
                // Calculate average magnitude and depth of earthquakes in the cluster
                const markers = cluster.getAllChildMarkers();
                
                let totalMagnitude = 0;
                let maxMagnitude = 0;
                let totalDepth = 0;
                let count = markers.length;
                
                markers.forEach(marker => {
                    const quake = marker.earthquake;
                    const magnitude = parseFloat(quake.magnitude) || 0;
                    totalMagnitude += magnitude;
                    if (magnitude > maxMagnitude) maxMagnitude = magnitude;
                    totalDepth += parseFloat(quake.depth) || 0;
                });
                
                const avgMagnitude = totalMagnitude / count;
                const avgDepth = totalDepth / count;
                
                // Determine color based on average magnitude or average depth
                let color;
                if (window.AppState.colorMode.historical === 'magnitude') {
                    // Use average magnitude for color
                    if (avgMagnitude < 2) color = CONFIG.colors.magnitude.verySmall;
                    else if (avgMagnitude < 3) color = CONFIG.colors.magnitude.small;
                    else if (avgMagnitude < 4) color = CONFIG.colors.magnitude.medium;
                    else if (avgMagnitude < 5) color = CONFIG.colors.magnitude.large;
                    else if (avgMagnitude < 6) color = CONFIG.colors.magnitude.veryLarge;
                    else if (avgMagnitude < 7) color = CONFIG.colors.magnitude.major;
                    else color = CONFIG.colors.magnitude.great;
                } else {
                    // Use average depth for color
                    if (avgDepth < 5) color = CONFIG.colors.depth.veryShallow;
                    else if (avgDepth < 10) color = CONFIG.colors.depth.shallow;
                    else if (avgDepth < 20) color = CONFIG.colors.depth.medium;
                    else color = CONFIG.colors.depth.deep;
                }
                
                // Size based on number of points, with a minimum and maximum
                const size = Math.min(60, Math.max(30, 20 + Math.floor(Math.sqrt(count) * 2)));
                
                // Create the cluster icon with statistical information
                const tooltipContent = `Cluster contains ${count} earthquakes\nAvg. Magnitude: ${avgMagnitude.toFixed(1)}\nAvg. Depth: ${avgDepth.toFixed(1)} km`;
                
                // Create cluster icon with tooltip in the title attribute
                const clusterIcon = L.divIcon({
                    html: `<div style="background-color: ${color}; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; font-weight: bold; border-radius: 50%; border: 2px solid rgba(0,0,0,0.5);" 
                    title="${tooltipContent}">${count}</div>`,
                    className: 'earthquake-cluster',
                    iconSize: [size, size]
                });
                
                // Store tooltip information to be used during marker creation
                cluster.tooltipContent = `<strong>Cluster:</strong> ${count} earthquakes<br><strong>Avg. Magnitude:</strong> ${avgMagnitude.toFixed(1)}<br><strong>Avg. Depth:</strong> ${avgDepth.toFixed(1)} km`;
                
                return clusterIcon;
            }
        };
        
        window.AppState.clusterLayer = L.markerClusterGroup(clusterOptions);
        
        // Process earthquakes
        console.log(`Clustering ${earthquakes.length} earthquakes`);
        
        // Only create markers if we have data
        if (earthquakes.length > 0) {
            // Create markers
            earthquakes.forEach(quake => {
                // Skip if coordinates are invalid
                if (!quake.latitude || !quake.longitude || isNaN(quake.latitude) || isNaN(quake.longitude)) {
                    return;
                }
                
                // Ensure magnitude and depth are valid numbers
                const magnitude = parseFloat(quake.magnitude) || 0;
                const depth = parseFloat(quake.depth) || 0;
                
                // Determine marker size and color
                const markerSize = window.Utils.calculateMarkerSize(magnitude, depth);
                const markerColor = window.Utils.calculateMarkerColor(depth, magnitude);
                
                // Create a circular marker
                const marker = L.circleMarker([quake.latitude, quake.longitude], {
                    radius: markerSize,
                    fillColor: markerColor,
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                // Add popup with information
                const popupContent = `
                    <strong>Magnitude:</strong> ${quake.magnitude.toFixed(1)}<br>
                    <strong>Date & Time:</strong> ${window.Utils.formatDateTime(quake.dateTime)}<br>
                    <strong>Depth:</strong> ${quake.depth.toFixed(1)} km<br>
                    <strong>Region:</strong> ${quake.region || 'Unknown'}<br>
                    <strong>Type:</strong> ${quake.type || 'Unknown'}
                `;
                marker.bindPopup(popupContent);
                
                // Store the earthquake data with the marker
                marker.earthquake = quake;
                
                // Add click event to display details in the info panel
                marker.on('click', () => {
                    window.AppState.selectedEarthquake = quake;
                    window.UIManager.displayEarthquakeDetails(quake);
                });
                
                // Add to cluster layer
                window.AppState.clusterLayer.addLayer(marker);
            });
            
            // Add the cluster layer to the map with high z-index to deal with larger markers
            window.AppState.map.addLayer(window.AppState.clusterLayer);
            
            // Add tooltips to clusters after they're created
            window.AppState.clusterLayer.on('clusterclick', function(event) {
                const cluster = event.layer;
                // Check if this cluster has a tooltip content set during icon creation
                if (cluster.tooltipContent) {
                    if (!cluster.getTooltip()) {
                        cluster.bindTooltip(cluster.tooltipContent, {
                            direction: 'top',
                            sticky: true,
                            opacity: 0.9,
                            className: 'cluster-tooltip'
                        });
                    }
                }
            });
            
            // Update the status message
            window.Utils.hideStatus();
        } else {
            window.Utils.showStatus("No earthquakes match the current filters. Try adjusting your criteria.");
        }
        
        console.timeEnd('renderClusteredMarkers');
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
        
        // Store the current earthquake
        window.AppState.selectedEarthquake = earthquake;
        
        // Update details panel
        window.UIManager.displayEarthquakeDetails(earthquake);
        
        // Create coordinates
        const coords = [earthquake.latitude, earthquake.longitude];
        
        // First determine if we need to handle clusters specially
        const isHistorical = window.AppState.activeDataset === 'historical';
        const isClusterMode = isHistorical && window.AppState.renderMode.historical === 'cluster';
        
        // Clear any existing highlight marker and timeout
        if (window.AppState.highlightMarker) {
            window.AppState.map.removeLayer(window.AppState.highlightMarker);
            window.AppState.highlightMarker = null;
        }
        
        if (window.AppState.highlightTimeout) {
            clearTimeout(window.AppState.highlightTimeout);
            window.AppState.highlightTimeout = null;
        }
        
        // For clustered view, we need a special approach to ensure the point is visible
        if (isClusterMode) {
            // Center the map at a much higher zoom level to ensure the individual point is visible
            // Zoom level 15 will ensure clusters are broken apart in almost all cases
            window.AppState.map.setView(coords, 15);
            
            // Create a special standalone marker with high z-index
            const maxMagnitudeMarker = L.circleMarker(coords, {
                radius: 35, // Larger radius for better visibility
                color: '#FFFFFF', // White border
                weight: 4, // Thicker border
                opacity: 1,
                fillColor: '#FF00FF', // Magenta fill
                fillOpacity: 0.7,
                zIndexOffset: 10000 // Ensure it's above any clusters
            });
            
            // Add a distinctive outline marker
            const outlineMarker = L.circleMarker(coords, {
                radius: 45, // Even larger radius for the outline
                color: '#000000', // Black outline
                weight: 2,
                opacity: 0.6,
                fill: false, // No fill, just the outline
                zIndexOffset: 9999
            });
            
            // Create a very visible pulse effect
            const pulseMarker = L.circleMarker(coords, {
                radius: 55, // Large radius for the pulse
                color: '#FF00FF', // Match the main marker color
                weight: 3,
                opacity: 0.6,
                fillColor: '#FF00FF',
                fillOpacity: 0.2,
                className: 'max-pulse-marker' // Special class for more intense animation
            });
            
            // Add popup with earthquake info that automatically opens
            const popupContent = `
                <strong>Maximum Magnitude Earthquake (${earthquake.magnitude.toFixed(1)})</strong><br>
                <strong>Date & Time:</strong> ${window.Utils.formatDateTime(earthquake.dateTime)}<br>
                <strong>Depth:</strong> ${earthquake.depth.toFixed(1)} km<br>
                <strong>Region:</strong> ${earthquake.region || 'Unknown'}<br>
                <strong>Type:</strong> ${earthquake.type || 'Unknown'}
            `;
            maxMagnitudeMarker.bindPopup(popupContent).openPopup();
            
            // Create a dedicated layer for these markers to ensure they're above clusters
            const highlightGroup = L.layerGroup([outlineMarker, pulseMarker, maxMagnitudeMarker]);
            
            // Add this group to the map with highest z-index
            highlightGroup.addTo(window.AppState.map);
            window.AppState.highlightMarker = highlightGroup;
            
            // Now also add a standalone (non-clustered) version of the actual marker
            // This ensures the actual marker is visible even at this zoom level
            const actualMarker = L.circleMarker(coords, {
                radius: 25, // Make it stand out but not overlap with our highlight
                fillColor: '#FF00FF', // Matching color
                color: '#000',
                weight: 2, 
                opacity: 1,
                fillOpacity: 0.6,
                zIndexOffset: 9000 // High but below our highlight markers
            }).addTo(window.AppState.map);
            
            // This marker also has the popup
            actualMarker.bindPopup(popupContent);
            
            // Add this to our highlight group so it gets cleaned up together
            window.AppState.highlightMarker.addLayer(actualMarker);
            
            // Set a shorter timeout to automatically remove the highlight 
            window.AppState.highlightTimeout = setTimeout(() => {
                if (window.AppState.highlightMarker) {
                    window.AppState.map.removeLayer(window.AppState.highlightMarker);
                    window.AppState.highlightMarker = null;
                }
            }, 4000); // 4 seconds
            
            return highlightGroup;
        } else {
            // For non-clustered views, center at a closer zoom level
            window.AppState.map.setView(coords, 10);
            
            // Create a special highlight marker that will stand out
            const highlightMarker = L.circleMarker(coords, {
                radius: 25, // Larger radius for visibility
                color: '#FFFFFF', // White border
                weight: 3,
                opacity: 1,
                fillColor: '#FF00FF', // Bright magenta fill
                fillOpacity: 0.5
            });
            
            // Add a pulse effect using a second marker
            const pulseMarker = L.circleMarker(coords, {
                radius: 35,
                color: '#FF00FF',
                weight: 2,
                opacity: 0.6,
                fillColor: '#FF00FF',
                fillOpacity: 0.3,
                className: 'pulse-marker'
            });
            
            // Create a group to hold both markers
            const highlightGroup = L.layerGroup([highlightMarker, pulseMarker]);
            
            // Add a popup with earthquake info
            const popupContent = `
                <strong>Maximum Magnitude Earthquake</strong><br>
                <strong>Magnitude:</strong> ${earthquake.magnitude.toFixed(1)}<br>
                <strong>Date & Time:</strong> ${window.Utils.formatDateTime(earthquake.dateTime)}<br>
                <strong>Depth:</strong> ${earthquake.depth.toFixed(1)} km<br>
                <strong>Region:</strong> ${earthquake.region || 'Unknown'}<br>
                <strong>Type:</strong> ${earthquake.type || 'Unknown'}
            `;
            highlightMarker.bindPopup(popupContent).openPopup();
            
            // Add to map and store reference
            highlightGroup.addTo(window.AppState.map);
            window.AppState.highlightMarker = highlightGroup;
            
            // Set a shorter timeout to automatically remove the highlight
            window.AppState.highlightTimeout = setTimeout(() => {
                if (window.AppState.highlightMarker) {
                    window.AppState.map.removeLayer(window.AppState.highlightMarker);
                    window.AppState.highlightMarker = null;
                }
            }, 4000); // 4 seconds
            
            return highlightGroup;
        }
    }
    
    // Assign methods to the MapManager object
    exports.initializeMap = initializeMap;
    exports.renderCurrentData = renderCurrentData;
    exports.clearAllMapLayers = clearAllMapLayers;
    exports.updateLegend = updateLegend;
    exports.centerAndHighlightEarthquake = centerAndHighlightEarthquake;
    exports.togglePlateBoundaries = togglePlateBoundaries;
    
})(window.MapManager);

// Signal that MapManager is fully loaded
console.log('MapManager module loaded and initialized');