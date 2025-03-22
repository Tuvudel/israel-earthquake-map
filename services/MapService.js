/**
 * Map Service for the Earthquake Visualization App
 * Handles map initialization and earthquake rendering using MapLibre GL JS
 */
import { config } from '../config.js';
import { stateManager } from '../state/StateManager.js';
import { convertToGeoJSON } from '../utils/calculations.js';
import { plateBoundariesService } from './PlateBoundariesService.js';
import { showStatus, hideStatus, showLoading, hideLoading } from '../utils/domUtils.js';

class MapService {
    constructor() {
        this.map = null;
        this.popup = null;
        this.legendElement = null;
        this.sourceInitialized = false;
        this.mapReady = false;
    }
    
    /**
     * Initialize the MapLibre GL JS map
     * @param {string} containerId - ID of the container element
     * @returns {Promise<Object>} Promise resolving to MapLibre map instance
     */
    async initializeMap(containerId = 'map') {
        try {
            showLoading('Initializing map...');
            
            // Create the map with a simple style that will load reliably
            this.map = new maplibregl.Map({
                container: containerId,
                style: {
                    version: 8,
                    sources: {
                        'osm-tiles': {
                            type: 'raster',
                            tiles: [
                                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                            ],
                            tileSize: 256,
                            attribution: '© OpenStreetMap contributors'
                        }
                    },
                    layers: [{
                        id: 'osm-tiles',
                        type: 'raster',
                        source: 'osm-tiles',
                        minzoom: 0,
                        maxzoom: 19
                    }]
                },
                center: config.map.center,
                zoom: config.map.zoom,
                minZoom: config.map.minZoom,
                maxZoom: config.map.maxZoom
            });
            
            // Add navigation controls
            this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
            
            // Add scale to the map
            this.map.addControl(new maplibregl.ScaleControl({
                maxWidth: 100,
                unit: 'metric'
            }), 'bottom-left');
            
            // Initialize custom popup
            this.initializeCustomPopup();
            
            // Wait for the map to be loaded
            return new Promise((resolve) => {
                this.map.on('load', () => {
                    console.log('Map loaded, initializing sources');
                    
                    // Set up event handlers
                    this.setupEventHandlers();
                    
                    // Initialize sources once the map is loaded
                    this.initializeMapSources();
                    
                    // Create the legend
                    this.createLegend();
                    
                    // Mark map as ready
                    this.mapReady = true;
                    
                    // Update state with map state
                    this.updateStateFromMap();
                    
                    // Hide loading overlay
                    hideLoading();
                    
                    // Resolve with the map instance
                    resolve(this.map);
                });
            });
        } catch (error) {
            console.error('Map initialization error:', error);
            hideLoading();
            showStatus('Error initializing map: ' + error.message, true);
            throw error;
        }
    }
    
    /**
     * Set up map event handlers
     */
    setupEventHandlers() {
        // Set up zooming and panning event handlers
        this.map.on('zoomend', () => this.updateStateFromMap());
        this.map.on('moveend', () => this.updateStateFromMap());
        
        // Set up click handlers for earthquakes
        this.setupClickHandlers();
    }
    
    /**
     * Initialize map sources and layers
     */
    initializeMapSources() {
        if (!this.map || this.sourceInitialized) return;
        
        try {
            console.log('Initializing map sources and layers');
            
            // Add source for recent earthquakes
            this.map.addSource(config.maplibre.sources.recent, {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
            
            // Add source for historical earthquakes
            this.map.addSource(config.maplibre.sources.historical, {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
            
            // Add source for plate boundaries
            this.map.addSource(config.maplibre.sources.plateBoundaries, {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
            
            // Add layer for recent earthquakes
            this.map.addLayer({
                id: config.maplibre.layers.recentEarthquakes,
                type: 'circle',
                source: config.maplibre.sources.recent,
                paint: {
                    // Circle color by depth (default)
                    'circle-color': [
                        'case',
                        ['<', ['get', 'depth'], 5], config.colors.depth.veryShallow,
                        ['<', ['get', 'depth'], 10], config.colors.depth.shallow,
                        ['<', ['get', 'depth'], 20], config.colors.depth.medium,
                        config.colors.depth.deep
                    ],
                    // Circle radius by magnitude
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
            
            // Add layer for historical earthquakes
            this.map.addLayer({
                id: config.maplibre.layers.historicalEarthquakes,
                type: 'circle',
                source: config.maplibre.sources.historical,
                paint: {
                    // Same settings as recent earthquakes
                    'circle-color': [
                        'case',
                        ['<', ['get', 'depth'], 5], config.colors.depth.veryShallow,
                        ['<', ['get', 'depth'], 10], config.colors.depth.shallow,
                        ['<', ['get', 'depth'], 20], config.colors.depth.medium,
                        config.colors.depth.deep
                    ],
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
            this.map.addLayer({
                id: config.maplibre.layers.plateBoundaries,
                type: 'line',
                source: config.maplibre.sources.plateBoundaries,
                paint: {
                    'line-color': [
                        'match',
                        ['get', 'type'],
                        'transform fault', config.colors.plateBoundaries.transform,
                        'divergent boundary', config.colors.plateBoundaries.divergent,
                        'convergent boundary', config.colors.plateBoundaries.convergent,
                        config.colors.plateBoundaries.default
                    ],
                    'line-width': config.plateBoundaries.style.weight,
                    'line-opacity': config.plateBoundaries.style.opacity,
                    'line-blur': 0.5
                },
                layout: {
                    'line-cap': config.plateBoundaries.style.lineCap,
                    'line-join': config.plateBoundaries.style.lineJoin,
                    visibility: 'none'
                }
            });
            
            // Add a highlighted earthquake layer
            this.map.addLayer({
                id: config.maplibre.layers.highlight,
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
            
            // Mark sources as initialized
            this.sourceInitialized = true;
            
            console.log('Map sources and layers initialized');
        } catch (error) {
            console.error('Error initializing map sources:', error);
            this.sourceInitialized = false; // Reset flag on error
        }
    }
    
    /**
     * Update state with current map information
     */
    updateStateFromMap() {
        if (!this.map) return;
        
        const zoom = this.map.getZoom();
        const bounds = this.map.getBounds();
        
        if (bounds) {
            stateManager.setState({
                currentZoom: zoom,
                viewportBounds: {
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest()
                }
            });
        }
    }
    
    /**
     * Initialize the custom popup
     */
    initializeCustomPopup() {
        this.popup = document.getElementById('map-popup');
        if (!this.popup) {
            console.warn('Custom popup element not found');
            return;
        }
        
        const closeButton = this.popup.querySelector('.maplibre-popup-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hidePopup();
            });
        }
    }
    
    /**
     * Setup click handlers for earthquakes
     */
    setupClickHandlers() {
        if (!this.map) return;
        
        // Click handler for individual earthquakes
        this.map.on('click', config.maplibre.layers.recentEarthquakes, (e) => {
            this.handleEarthquakeClick(e);
        });
        
        this.map.on('click', config.maplibre.layers.historicalEarthquakes, (e) => {
            this.handleEarthquakeClick(e);
        });
        
        // Change cursor to pointer when hovering over earthquakes
        this.map.on('mouseenter', config.maplibre.layers.recentEarthquakes, () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });
        
        this.map.on('mouseenter', config.maplibre.layers.historicalEarthquakes, () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });
        
        // Change cursor back when leaving
        this.map.on('mouseleave', config.maplibre.layers.recentEarthquakes, () => {
            this.map.getCanvas().style.cursor = '';
        });
        
        this.map.on('mouseleave', config.maplibre.layers.historicalEarthquakes, () => {
            this.map.getCanvas().style.cursor = '';
        });
    }
    
    /**
     * Handle click on an earthquake
     * @param {Object} e - MapLibre click event
     */
    handleEarthquakeClick(e) {
        if (!this.map || e.features.length === 0) return;
        
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
        
        // Store the selected earthquake in state
        stateManager.setState({
            selectedEarthquake: quake
        });
        
        // Show popup
        const popupContent = `
            <strong>Magnitude:</strong> ${quake.magnitude.toFixed(1)}<br>
            <strong>Date & Time:</strong> ${new Date(quake.dateTime).toLocaleString()}<br>
            <strong>Depth:</strong> ${quake.depth.toFixed(1)} km<br>
            <strong>Region:</strong> ${quake.region || 'Unknown'}<br>
            <strong>Type:</strong> ${quake.type || 'Unknown'}
            ${quake.felt === true ? '<br><span style="color: #4CAF50; font-weight: bold;">✓ Felt Earthquake</span>' : ''}
        `;
        
        this.showPopup(feature.geometry.coordinates, popupContent);
    }
    
    /**
     * Show the custom popup
     * @param {Array} coordinates - [longitude, latitude] of the popup
     * @param {String} content - HTML content for the popup
     */
    showPopup(coordinates, content) {
        if (!this.popup || !this.map) return;
        
        // Set the content
        const popupContent = this.popup.querySelector('.maplibre-popup-content');
        if (popupContent) {
            popupContent.innerHTML = content;
        }
        
        // Position the popup at the coordinates
        const point = this.map.project(coordinates);
        this.popup.style.left = point.x + 'px';
        this.popup.style.top = point.y + 'px';
        
        // Show the popup
        this.popup.style.display = 'block';
    }
    
    /**
     * Hide the custom popup
     */
    hidePopup() {
        if (this.popup) {
            this.popup.style.display = 'none';
        }
    }
    
    /**
     * Create a map legend based on current color mode
     */
    createLegend() {
        // Remove any existing legend
        if (this.legendElement) {
            this.legendElement.remove();
        }
        
        // Create a new legend div
        const legendDiv = document.createElement('div');
        legendDiv.className = 'legend';
        
        // Get the current state
        const state = stateManager.getState();
        const activeDataset = state.activeDataset;
        const colorMode = state.colorMode[activeDataset];
        
        // Determine which legend to create
        if (colorMode === 'magnitude') {
            // Magnitude legend
            legendDiv.innerHTML = this.createMagnitudeLegend();
        } else {
            // Depth legend (default)
            legendDiv.innerHTML = this.createDepthLegend();
        }
        
        // Add plate boundaries info if we're showing them
        if (state.showPlateBoundaries) {
            legendDiv.innerHTML += this.createPlateBoundariesLegend();
        }
        
        // Add the legend to the map container
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.appendChild(legendDiv);
        }
        
        // Store reference to the legend
        this.legendElement = legendDiv;
    }
    
    /**
     * Create HTML for magnitude legend
     * @returns {string} HTML for magnitude legend
     */
    createMagnitudeLegend() {
        return `
            <h4>Legend</h4>
            <div><strong>Magnitude:</strong></div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.verySmall};"></div>
                <span>&lt; 2 (Very Small)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.small};"></div>
                <span>2-3 (Small)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.medium};"></div>
                <span>3-4 (Medium)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.large};"></div>
                <span>4-5 (Large)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.veryLarge};"></div>
                <span>5-6 (Very Large)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.major};"></div>
                <span>6-7 (Major)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.magnitude.great};"></div>
                <span>&gt; 7 (Great)</span>
            </div>
            <div><strong>Size:</strong> Inversely proportional to depth<br>(deeper events are smaller)</div>
        `;
    }
    
    /**
     * Create HTML for depth legend
     * @returns {string} HTML for depth legend
     */
    createDepthLegend() {
        return `
            <h4>Legend</h4>
            <div><strong>Depth:</strong></div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.veryShallow};"></div>
                <span>&lt; 5 km (Very Shallow)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.shallow};"></div>
                <span>5-10 km (Shallow)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.medium};"></div>
                <span>10-20 km (Medium)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${config.colors.depth.deep};"></div>
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
    createPlateBoundariesLegend() {
        return `
            <hr>
            <div><strong>Plate Boundaries:</strong></div>
            <div class="legend-item">
                <div class="legend-line" style="background-color: ${config.colors.plateBoundaries.transform}; height: 4px; border: 1px solid white;"></div>
                <span>Dead Sea Transform Fault</span>
            </div>
            <div class="legend-item">
                <div class="legend-line" style="background-color: ${config.colors.plateBoundaries.divergent}; height: 4px; border: 1px solid white;"></div>
                <span>Divergent Boundary</span>
            </div>
        `;
    }
    
    /**
     * Toggle display of plate boundaries
     * @param {boolean} show - Whether to show plate boundaries
     */
    togglePlateBoundaries(show) {
        if (!this.map) return;
        
        // Update the state
        stateManager.setState({
            showPlateBoundaries: show
        });
        
        // Display or hide the boundaries on the map
        if (show) {
            this.displayPlateBoundaries();
        } else {
            this.map.setLayoutProperty(config.maplibre.layers.plateBoundaries, 'visibility', 'none');
        }
        
        // Update the legend
        this.createLegend();
    }
    
    /**
     * Display plate boundaries on the map
     */
    displayPlateBoundaries() {
        if (!this.map) return;
        
        // Get plate boundary data from the service
        const plateBoundaryData = plateBoundariesService.getEastAfricanRift();
        
        if (!plateBoundaryData) {
            console.error('Plate boundaries data not found');
            return;
        }
        
        // Update the source data
        try {
            const source = this.map.getSource(config.maplibre.sources.plateBoundaries);
            if (source) {
                source.setData(plateBoundaryData);
                
                // Show the layer
                this.map.setLayoutProperty(config.maplibre.layers.plateBoundaries, 'visibility', 'visible');
                
                console.log('Plate boundaries displayed');
            }
        } catch (err) {
            console.error('Error displaying plate boundaries:', err);
        }
    }
    
    /**
     * Render earthquake data on the map
     */
    renderData() {
        if (!this.map || !this.sourceInitialized) {
            console.warn('Map or sources not initialized yet');
            return;
        }
        
        // Get current state
        const state = stateManager.getState();
        const activeDataset = state.activeDataset;
        
        // Hide all layers first
        this.hideAllLayers();
        
        // Update the legend to match current color mode
        this.createLegend();
        
        try {
            if (activeDataset === 'historical') {
                this.renderHistoricalData();
            } else {
                this.renderRecentData();
            }
            
            // Re-add plate boundaries if they should be shown
            if (state.showPlateBoundaries) {
                this.displayPlateBoundaries();
            }
            
            // Hide any loading indicators
            hideLoading();
        } catch (err) {
            console.error('Error rendering data:', err);
            showStatus('Error rendering earthquake data: ' + err.message, true);
            hideLoading();
        }
    }
    
    /**
     * Render recent earthquake data
     */
    renderRecentData() {
        // Get current state
        const state = stateManager.getState();
        const earthquakes = state.data.recent.filtered;
        
        if (!earthquakes || earthquakes.length === 0) {
            console.warn('No recent earthquake data to render');
            showStatus("No earthquakes match the current filters. Try adjusting your criteria.");
            return;
        }
        
        console.log(`Rendering ${earthquakes.length} recent earthquakes`);
        
        // Convert data to GeoJSON
        const geojson = convertToGeoJSON(earthquakes);
        
        // Update the source with earthquake data
        try {
            const source = this.map.getSource(config.maplibre.sources.recent);
            if (source) {
                source.setData(geojson);
                
                // Update layer styling based on current color mode
                this.updateLayerStyling(config.maplibre.layers.recentEarthquakes, state.colorMode.recent);
                
                // Show the layer
                this.map.setLayoutProperty(config.maplibre.layers.recentEarthquakes, 'visibility', 'visible');
                
                // Hide status message for successful rendering
                hideStatus();
            }
        } catch (error) {
            console.error('Error rendering recent data:', error);
            throw error;
        }
    }
    
    /**
     * Render historical earthquake data
     */
    renderHistoricalData() {
        // Get current state
        const state = stateManager.getState();
        const earthquakes = state.data.historical.filtered;
        
        if (!earthquakes || earthquakes.length === 0) {
            console.warn('No historical earthquake data to render');
            showStatus("No earthquakes match the current filters. Try adjusting your criteria.");
            return;
        }
        
        console.log(`Rendering ${earthquakes.length} historical earthquakes`);
        
        // Convert to GeoJSON
        const geojson = convertToGeoJSON(earthquakes);
        
        // Update the source with earthquake data
        try {
            const source = this.map.getSource(config.maplibre.sources.historical);
            if (source) {
                // First, hide the layer while updating to prevent partial renders
                this.map.setLayoutProperty(config.maplibre.layers.historicalEarthquakes, 'visibility', 'none');
                
                // Set the data
                source.setData(geojson);
                
                // Update layer styling based on current color mode
                this.updateLayerStyling(config.maplibre.layers.historicalEarthquakes, state.colorMode.historical);
                
                // Now show the layer after all updates are complete
                this.map.setLayoutProperty(config.maplibre.layers.historicalEarthquakes, 'visibility', 'visible');
                
                // Hide status message for successful rendering
                hideStatus();
                
                // Set displayed earthquakes reference (don't create a new copy in state)
                stateManager.setState({
                    data: {
                        historical: {
                            displayed: earthquakes // Just reference the filtered data directly
                        }
                    }
                });
            } else {
                console.error('Historical earthquakes source not found');
            }
        } catch (error) {
            console.error('Error rendering historical data:', error);
            throw error;
        }
    }
    
    /**
     * Update styling for earthquake layers based on color mode
     * @param {string} layerId - Layer ID to update
     * @param {string} colorMode - Color mode ('magnitude' or 'depth')
     */
    updateLayerStyling(layerId, colorMode) {
        if (!this.map) return;
        
        if (colorMode === 'magnitude') {
            // Color by magnitude
            this.map.setPaintProperty(layerId, 'circle-color', [
                'case',
                ['<', ['get', 'magnitude'], 2], config.colors.magnitude.verySmall,
                ['<', ['get', 'magnitude'], 3], config.colors.magnitude.small,
                ['<', ['get', 'magnitude'], 4], config.colors.magnitude.medium,
                ['<', ['get', 'magnitude'], 5], config.colors.magnitude.large,
                ['<', ['get', 'magnitude'], 6], config.colors.magnitude.veryLarge,
                ['<', ['get', 'magnitude'], 7], config.colors.magnitude.major,
                config.colors.magnitude.great
            ]);
            
            // Size by depth (inverse relationship)
            this.map.setPaintProperty(layerId, 'circle-radius', [
                'case',
                ['<', ['get', 'depth'], 5], 18,
                ['<', ['get', 'depth'], 30], ['-', 15, ['*', 0.28, ['-', ['get', 'depth'], 5]]],
                ['max', 5, ['-', 8, ['*', 0.05, ['-', ['get', 'depth'], 30]]]]
            ]);
        } else {
            // Color by depth (default)
            this.map.setPaintProperty(layerId, 'circle-color', [
                'case',
                ['<', ['get', 'depth'], 5], config.colors.depth.veryShallow,
                ['<', ['get', 'depth'], 10], config.colors.depth.shallow,
                ['<', ['get', 'depth'], 20], config.colors.depth.medium,
                config.colors.depth.deep
            ]);
            
            // Size by magnitude (cubic scale)
            this.map.setPaintProperty(layerId, 'circle-radius', [
                '+',
                4,
                ['/', ['*', ['get', 'magnitude'], ['get', 'magnitude'], ['get', 'magnitude']], 2]
            ]);
        }
    }
    
    /**
     * Hide all map layers
     */
    hideAllLayers() {
        if (!this.map) return;
        
        // Hide earthquake layers
        this.map.setLayoutProperty(config.maplibre.layers.recentEarthquakes, 'visibility', 'none');
        this.map.setLayoutProperty(config.maplibre.layers.historicalEarthquakes, 'visibility', 'none');
        
        // Hide plate boundaries
        this.map.setLayoutProperty(config.maplibre.layers.plateBoundaries, 'visibility', 'none');
        
        // Hide highlighted marker
        this.map.setLayoutProperty(config.maplibre.layers.highlight, 'visibility', 'none');
        
        // Hide popup
        this.hidePopup();
    }
    
    /**
     * Center the map on a specific earthquake and highlight it
     * @param {Object} earthquake - Earthquake object to center on
     */
    centerAndHighlightEarthquake(earthquake) {
        if (!this.map || !earthquake || !earthquake.latitude || !earthquake.longitude) {
            console.warn('Cannot center on earthquake: Invalid earthquake data or map not initialized');
            return;
        }
        
        console.log('Centering on earthquake:', earthquake);
        
        // Store the earthquake in state
        stateManager.setState({
            selectedEarthquake: earthquake
        });
        
        // Create coordinates in [lng, lat] order for MapLibre
        const coords = [earthquake.longitude, earthquake.latitude];
        
        // Fly to the earthquake location with appropriate zoom
        this.map.flyTo({
            center: coords,
            zoom: 10,
            duration: 1500, // Animation duration in milliseconds
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
        const sourceId = `${config.maplibre.layers.highlight}-source`;
        
        if (this.map.getSource(sourceId)) {
            // If source already exists, update it
            this.map.getSource(sourceId).setData(highlightData);
        } else {
            // Create a new source
            this.map.addSource(sourceId, {
                type: 'geojson',
                data: highlightData
            });
        }
        
        // Update the layer source
        this.map.setLayoutProperty(config.maplibre.layers.highlight, 'visibility', 'visible');
        
        // Show popup with earthquake info
        const popupContent = `
            <strong>Maximum Magnitude Earthquake (${earthquake.magnitude.toFixed(1)})</strong><br>
            <strong>Date & Time:</strong> ${new Date(earthquake.dateTime).toLocaleString()}<br>
            <strong>Depth:</strong> ${earthquake.depth.toFixed(1)} km<br>
            <strong>Region:</strong> ${earthquake.region || 'Unknown'}<br>
            <strong>Type:</strong> ${earthquake.type || 'Unknown'}
            ${earthquake.felt === true ? '<br><span style="color: #4CAF50; font-weight: bold;">✓ Felt Earthquake</span>' : ''}
        `;
        
        this.showPopup(coords, popupContent);
        
        // Auto-hide the highlight after 5 seconds
        setTimeout(() => {
            this.map.setLayoutProperty(config.maplibre.layers.highlight, 'visibility', 'none');
            this.hidePopup();
        }, 5000);
    }
}

// Create and export a singleton instance
export const mapService = new MapService();