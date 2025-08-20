// Map controller for MapLibre GL JS
// Theme management moved to js/theme.js and exposed as window.Theme

class MapController {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.earthquakeSource = null;
        // Track currently hovered feature id for highlight state
        this.hoveredFeatureId = null;
        // Resolve initial theme/basemap from stored preference or system
        const pref = (window.Theme && window.Theme.getPreference) ? window.Theme.getPreference() : 'system';
        const initialIsDark = (window.Theme && window.Theme.isDarkFromPreference) ? window.Theme.isDarkFromPreference(pref) : false;
        this.currentStyleName = initialIsDark ? 'dark_matter' : 'positron';
        // If user has an explicit (non-system) preference, prefer saved basemap from PersistService
        try {
            if (pref !== 'system' && window.Persist && window.Persist.getItem && window.Persist.keys) {
                const saved = window.Persist.getItem(window.Persist.keys.basemap, null);
                if (saved === 'dark' || saved === 'light') {
                    this.currentStyleName = saved === 'dark' ? 'dark_matter' : 'positron';
                }
            }
        } catch (_) {}
        this.eventHandlersBound = false;
        this.isTransitioning = false;
        this.resizeObserver = null;

        // Apply initial theme site-wide via Theme module
        try { if (window.Theme && window.Theme.applyTheme) window.Theme.applyTheme(initialIsDark); } catch (_) {}

        this.initializeMap();
    }

    // Determine the initial style to load based on environment and availability of a MapTiler key
    async getInitialStyle() {
        return await (window.StyleResolver && window.StyleResolver.resolveInitialStyle
            ? window.StyleResolver.resolveInitialStyle()
            : Promise.resolve('css/positron.json'));
    }

    // Helper: fetch style JSON and inject MapTiler key where applicable
    async loadAndInjectStyle(path, key) {
        const resp = await fetch(path);
        const style = await resp.json();
        if (key && style && style.sources && style.sources.openmaptiles) {
            style.sources.openmaptiles.url = `https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=${encodeURIComponent(key)}`;
        }
        if (key && style && style.glyphs) {
            style.glyphs = `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${encodeURIComponent(key)}`;
        }
        return style;
    }

    // Return a style object/url for the requested basemap
    async getStyleForName(name) {
        return await (window.StyleResolver && window.StyleResolver.resolveStyleForName
            ? window.StyleResolver.resolveStyleForName(name)
            : this.getInitialStyle());
    }

    // Apply site-wide theme via Theme module
    applyThemeForStyle(isDark) {
        if (window.Theme && typeof window.Theme.applyTheme === 'function') {
            window.Theme.applyTheme(isDark);
        }
    }

    // Switch basemap and rebuild custom layers
    async setBasemap(name) {
        if (!this.map) return;
        this.currentStyleName = name;
        // Preserve current camera to avoid visual jump/resize perception
        const camera = this.map ? {
            center: this.map.getCenter(),
            zoom: this.map.getZoom(),
            bearing: this.map.getBearing(),
            pitch: this.map.getPitch()
        } : null;

        // Detach interactions before style switch to avoid dangling handlers
        if (this._detachInteractions) {
            try { this._detachInteractions.detach(); } catch (_) {}
            this._detachInteractions = null;
            this.eventHandlersBound = false;
        }

        const style = await this.getStyleForName(name);
        this.map.setStyle(style);
        // Use styledata which is guaranteed to fire after setStyle in MapLibre
        this.map.once('styledata', () => {
            // Rebuild sources/layers and reattach events as needed
            this.setupEarthquakeLayer();
            // Reapply current data
            const data = (this.app && Array.isArray(this.app.filteredData)) ? this.app.filteredData : [];
            // Restore camera immediately after layers are ready
            if (camera) {
                this.map.jumpTo({
                    center: camera.center,
                    zoom: camera.zoom,
                    bearing: camera.bearing,
                    pitch: camera.pitch
                });
            }
            // Update features without fitting bounds to avoid view changes
            this.updateEarthquakes(data, { fit: false });
            // Ensure the basemap toggle reflects the current style
            this.syncBasemapToggleUI();
            // Apply site theme to match the basemap
            this.applyThemeForStyle(this.currentStyleName === 'dark_matter');
        });
    }

    // Attach handler to the basemap <sl-switch> (sun/moon)
    setupBasemapToggle() {
        const el = document.getElementById('basemap-toggle');
        if (!el) return;
        
        // Get the current theme state from the Theme system to prevent race conditions
        const currentTheme = window.Theme ? window.Theme.getPreference() : 'system';
        const isDark = window.Theme ? window.Theme.isDarkFromPreference(currentTheme) : false;
        
        // Initialize UI to match current theme state (not current map style)
        el.checked = isDark;
        
        // Ensure map style matches theme preference
        const targetStyle = isDark ? 'dark_matter' : 'positron';
        if (this.currentStyleName !== targetStyle) {
            this.setBasemap(targetStyle);
        }
        
        // Shoelace emits "sl-change"; read el.checked
        el.addEventListener('sl-change', () => {
            const isDark = !!el.checked;
            const target = isDark ? 'dark_matter' : 'positron';
            
            // Use coordinated theme application for smooth transitions
            if (window.Theme && window.Theme.applyThemeWithCoordination) {
                window.Theme.applyThemeWithCoordination(isDark);
            } else {
                // Fallback to direct theme application
                this.applyThemeForStyle(isDark);
            }
            
            // Persist explicit user preference (overrides system)
            try {
                if (window.Theme && window.Theme.setPreference) {
                    window.Theme.setPreference(isDark ? 'dark' : 'light');
                }
                if (window.Persist && window.Persist.setItem && window.Persist.keys) {
                    window.Persist.setItem(window.Persist.keys.basemap, isDark ? 'dark' : 'light');
                }
            } catch (_) {}
            
            // Only change map if style is different
            if (target !== this.currentStyleName) {
                this.setBasemap(target);
            }
        });

        // Listen to OS theme changes when in system mode
        this._unsubSystemPref = (window.Theme && window.Theme.listenToSystemChanges ? window.Theme.listenToSystemChanges : () => () => {})((isDarkNow) => {
            // Use coordinated theme application for smooth transitions
            if (window.Theme && window.Theme.applyThemeWithCoordination) {
                window.Theme.applyThemeWithCoordination(isDarkNow);
            } else {
                // Fallback to direct theme application
                this.applyThemeForStyle(isDarkNow);
            }
            
            const target = isDarkNow ? 'dark_matter' : 'positron';
            // Only follow system when preference is 'system'
            const prefNow = (window.Theme && window.Theme.getPreference) ? window.Theme.getPreference() : 'system';
            if (prefNow === 'system' && target !== this.currentStyleName) {
                this.setBasemap(target);
            } else {
                this.syncBasemapToggleUI();
            }
        });
        
        // Listen to theme change events for coordination
        window.addEventListener('themeChanged', (event) => {
            const { isDark } = event.detail;
            this.syncBasemapToggleUI();
        });
    }

    // Keep the toggle UI in sync when basemap changes programmatically
    syncBasemapToggleUI() {
        const el = document.getElementById('basemap-toggle');
        if (!el) return;
        const shouldBeChecked = this.currentStyleName === 'dark_matter';
        if (el.checked !== shouldBeChecked) {
            el.checked = shouldBeChecked;
        }
    }

    async initializeMap() {
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
                if (window.Logger && window.Logger.warn) window.Logger.warn('Failed to set RTL text plugin:', e);
            }
        }

        // Choose initial style to match resolved preference
        const style = await this.getStyleForName(this.currentStyleName);

        this.map = new maplibregl.Map({
            container: 'map',
            style,
            center: [35.2, 31.8], // Center on Israel
            zoom: 7,
            minZoom: 3,
            maxZoom: 15
        });
        
        // Add navigation controls
        this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
        
        // Add scale control
        this.map.addControl(new maplibregl.ScaleControl(), 'bottom-right');

        // Wire up basemap toggle (if present)
        this.setupBasemapToggle();
        
        // No automatic resize detection needed - manual resize calls only
        // Ensure theme is applied on initial load (redundant with constructor safety)
        this.applyThemeForStyle(this.currentStyleName === 'dark_matter');
        
        // Wait for map to load before adding earthquake data
        this.map.on('load', () => {
            this.setupEarthquakeLayer();
            
            // Call app callback when map is ready
            if (this.app.mapReadyCallback) {
                this.app.mapReadyCallback();
            }
        });
        
        // Add window resize listener for orientation changes (no manual resize needed)
        this._onResize = () => {
            // MapLibre automatically handles window resize events
            // No manual resize call needed
        };
        window.addEventListener('resize', this._onResize);
        
    }
    
    setupEarthquakeLayer() {
        // Earthquakes source and layers
        if (window.EarthquakeLayer && typeof window.EarthquakeLayer.addSourceAndLayers === 'function') {
            window.EarthquakeLayer.addSourceAndLayers(this.map);
        }
        // Faults and plates
        if (window.PlatesLayer && typeof window.PlatesLayer.addLayers === 'function') {
            window.PlatesLayer.addLayers(this.map, this.currentStyleName === 'dark_matter');
        }

        // Setup interactions (hover, click, popup)
        if (!this.eventHandlersBound) {
            this.setupEventListeners();
            this.eventHandlersBound = true;
        }

        // Note: Earthquake labels removed due to glyphs requirement
        // Labels would need a custom font/glyphs configuration
    }
    
    //
    
    setupEventListeners() {
        const IDS = (window.Constants && window.Constants.IDS) ? window.Constants.IDS : {};
        const layerId = IDS.LYR_EARTHQUAKE_CIRCLES || 'earthquake-circles';
        const sourceId = IDS.SRC_EARTHQUAKES || 'earthquakes';
        // Detach any existing
        if (this._detachInteractions) { try { this._detachInteractions.detach(); } catch(_){} }
        if (window.Interactions && typeof window.Interactions.attach === 'function') {
            this._detachInteractions = window.Interactions.attach(this.map, {
                sourceId,
                layerId,
                onClick: (eqId) => {
                    if (this.app && this.app.onEarthquakeClick) {
                        this.app.onEarthquakeClick(eqId);
                    }
                },
                buildPopup: (props) => {
                    if (window.Popup && typeof window.Popup.buildHTML === 'function') {
                        return window.Popup.buildHTML(props);
                    }
                    return '';
                }
            });
        }
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
                ${props['felt?'] ? '<p><sl-badge variant="danger" pill size="small">Felt</sl-badge></p>' : ''}
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
    
    updateEarthquakes(earthquakeData, options) {
        if (!this.map.getSource('earthquakes')) {
            return; // Map not ready yet
        }
        
        // Prepare GeoJSON data relying on promoteId: 'epiid' (no manual Feature.id)
        const geojsonData = {
            type: 'FeatureCollection',
            features: earthquakeData
        };
        
        // Update the source
        this.map.getSource('earthquakes').setData(geojsonData);
        
        // Fit map to show all earthquakes if there are any (unless disabled)
        const shouldFit = !(options && options.fit === false);
        if (shouldFit && earthquakeData.length > 0) {
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
        const idx = this.app.filteredData.findIndex(f => f.properties && f.properties.epiid === epiid);
        if (idx !== -1) {
            const earthquake = this.app.filteredData[idx];
            const coordinates = earthquake.geometry.coordinates;
            
            // Center map on earthquake
            this.map.flyTo({
                center: coordinates,
                zoom: Math.max(this.map.getZoom(), 9),
                duration: 1000
            });
            
            // Temporarily highlight the earthquake using feature-state with promoteId
            setTimeout(() => {
                if (this.map.getSource('earthquakes')) {
                    this.map.setFeatureState(
                        { source: 'earthquakes', id: epiid },
                        { highlighted: true }
                    );
                    setTimeout(() => {
                        this.map.setFeatureState(
                            { source: 'earthquakes', id: epiid },
                            { highlighted: false }
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

    /**
     * Optimized map resize with canvas preservation during transitions
     */
    resizeMap() {
        if (!this.map) return;
        
        // Optimized resize with minimal canvas preservation
        this.optimizedResize(() => {
            try {
                this.map.resize();
            } catch (error) {
                console.warn('Map resize failed:', error);
            }
        });
    }

    /**
     * Optimized map resize with minimal canvas preservation
     */
    optimizedResize(resizeCallback) {
        if (!this.map) {
            resizeCallback();
            return;
        }

        // Mark as transitioning to prevent other operations
        this.isTransitioning = true;

        // Get the canvas element
        const canvas = this.map.getCanvas();
        if (!canvas) {
            resizeCallback();
            this.isTransitioning = false;
            return;
        }

        // Minimal canvas preservation for better performance
        const originalPointerEvents = canvas.style.pointerEvents;
        canvas.style.pointerEvents = 'none';

        try {
            // Use double requestAnimationFrame for optimal timing
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Perform resize
                    resizeCallback();
                    
                    // Restore canvas immediately after resize
                    canvas.style.pointerEvents = originalPointerEvents;
                    this.isTransitioning = false;
                });
            });
        } catch (error) {
            // Restore canvas on error
            canvas.style.pointerEvents = originalPointerEvents;
            this.isTransitioning = false;
            throw error;
        }
    }

    /**
     * Setup automatic resize detection using ResizeObserver
     * This eliminates the need for manual map resize calls
     */
    setupAutoResize() {
        // Removed - using manual resize calls for instant changes
    }

    /**
     * Check if map is currently transitioning
     */
    isMapTransitioning() {
        return this.isTransitioning;
    }
}

// Make MapController available globally
window.MapController = MapController;

// Popup styles moved to CSS: css/components/popup.css via css/index.css

// Add destroy method on prototype to allow cleanup when tearing down the app
MapController.prototype.destroy = function() {
    try {
        if (this._detachInteractions) { this._detachInteractions.detach(); }
    } catch(_) {}
    this._detachInteractions = null;
    try {
        if (this._onResize) { window.removeEventListener('resize', this._onResize); }
    } catch(_) {}
    this._onResize = null;
    try {
        if (this._unsubSystemPref) { this._unsubSystemPref(); }
    } catch(_) {}
    this._unsubSystemPref = null;
    try {
        if (this.popup) { this.popup.remove(); this.popup = null; }
    } catch(_) {}
    try {
        if (this.resizeObserver) { this.resizeObserver.disconnect(); }
    } catch(_) {}
    this.resizeObserver = null;
    try {
        if (this.map) { this.map.remove(); this.map = null; }
    } catch(_) {}
};
