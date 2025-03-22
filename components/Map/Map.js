/**
 * Map Component for the Earthquake Visualization App
 * Handles rendering and interaction with the map
 */
import { mapService } from '../../services/MapService.js';
import { stateManager } from '../../state/StateManager.js';
import { Legend } from './Legend.js';
import { showLoading, hideLoading } from '../../utils/domUtils.js';

export class Map {
    /**
     * Create a new Map component
     * @param {string} containerId - ID of the container element for the map
     */
    constructor(containerId = 'map') {
        this.containerId = containerId;
        this.map = null;
        this.legend = null;
        this.unsubscribeFromState = null;
        
        // Initialize the legend
        this.legend = new Legend();
        
        // Track last state to avoid unnecessary renders
        this._lastState = {
            activeDataset: null,
            colorMode: null,
            sizeMode: null,
            showPlateBoundaries: null,
            dataLoaded: { recent: false, historical: false },
            filteredDataLength: { recent: 0, historical: 0 },
            currentZoom: null,
            viewportBounds: null
        };
        
        // Track render timing
        this._lastRenderTime = 0;
        this._lastSelectedEarthquake = null;
    }
    
    /**
     * Initialize the map and set up event listeners
     */
    async initialize() {
        showLoading('Initializing map...');
        
        try {
            // Initialize the map using the MapService (await the Promise)
            this.map = await mapService.initializeMap(this.containerId);
            
            // Subscribe to state changes after map is initialized, using selective tracking
            this.unsubscribeFromState = stateManager.subscribe(state => {
                // Only rerender the map when important properties change
                const shouldRender = this.shouldRenderForStateChange(state);
                
                if (shouldRender) {
                    this.render(state);
                }
            });
            
            // Update window resize handler
            window.addEventListener('resize', this.handleResize.bind(this));
            
            // Setup content sizing AFTER map is fully initialized
            this.setupResponsiveLayout();
            
            hideLoading();
            return this.map;
        } catch (error) {
            console.error('Error initializing map:', error);
            hideLoading();
            throw error;
        }
    }
    
    /**
     * Determine if render is needed based on state changes
     * @param {Object} newState - New application state
     * @returns {boolean} True if render is needed
     */
    shouldRenderForStateChange(newState) {
        // Check if critical state properties have changed
        const activeDatasetChanged = newState.activeDataset !== this._lastState.activeDataset;
        
        // Only check color mode if it exists in both states
        let colorModeChanged = false;
        if (newState.colorMode && this._lastState.colorMode && newState.activeDataset) {
            colorModeChanged = newState.colorMode[newState.activeDataset] !== 
                              this._lastState.colorMode[newState.activeDataset];
        }
        
        // Check for size mode changes
        let sizeModeChanged = false;
        if (newState.sizeMode && this._lastState.sizeMode && newState.activeDataset) {
            sizeModeChanged = newState.sizeMode[newState.activeDataset] !== 
                             this._lastState.sizeMode[newState.activeDataset];
        }
        
        const plateBoundariesChanged = newState.showPlateBoundaries !== this._lastState.showPlateBoundaries;
        
        // Check if data loading state changed
        let dataLoadedChanged = false;
        if (newState.dataLoaded && this._lastState.dataLoaded && newState.activeDataset) {
            dataLoadedChanged = newState.dataLoaded[newState.activeDataset] !== 
                               this._lastState.dataLoaded[newState.activeDataset];
        }
        
        // Check if filtered data changed (specifically look at length as a quick check)
        let filteredDataChanged = false;
        if (newState.activeDataset === 'recent' && 
            newState.data?.recent?.filtered?.length !== this._lastState.filteredDataLength?.recent) {
            filteredDataChanged = true;
            // Update cached length
            this._lastState.filteredDataLength = this._lastState.filteredDataLength || {};
            this._lastState.filteredDataLength.recent = newState.data?.recent?.filtered?.length;
        } else if (newState.activeDataset === 'historical' && 
                  newState.data?.historical?.filtered?.length !== this._lastState.filteredDataLength?.historical) {
            filteredDataChanged = true;
            // Update cached length
            this._lastState.filteredDataLength = this._lastState.filteredDataLength || {};
            this._lastState.filteredDataLength.historical = newState.data?.historical?.filtered?.length;
        }
        
        // Only render for filter changes if they actually resulted in different data
        let filtersChanged = false;
        if (filteredDataChanged && newState.filters) {
            filtersChanged = true;
        }
        
        const selectedChanged = newState.selectedEarthquake !== this._lastState.selectedEarthquake;
        
        // Explicitly ignore zoom and bounds changes - keep track of them but don't trigger renders
        // Check if zoom changed significantly - but we WON'T use this to trigger renders
        const zoomChanged = Math.abs((newState.currentZoom || 0) - (this._lastState.currentZoom || 0)) > 0.2;
        if (zoomChanged) {
            console.log(`Zoom changed to ${newState.currentZoom.toFixed(1)} - not triggering render`);
        }
        
        // Save key parts of the new state for next comparison
        this._lastState = {
            ...this._lastState,
            activeDataset: newState.activeDataset,
            colorMode: newState.colorMode ? {...newState.colorMode} : this._lastState.colorMode,
            sizeMode: newState.sizeMode ? {...newState.sizeMode} : this._lastState.sizeMode,
            showPlateBoundaries: newState.showPlateBoundaries,
            dataLoaded: newState.dataLoaded ? {...newState.dataLoaded} : this._lastState.dataLoaded,
            filters: newState.filters ? JSON.parse(JSON.stringify(newState.filters)) : this._lastState.filters,
            selectedEarthquake: newState.selectedEarthquake,
            currentZoom: newState.currentZoom,
            viewportBounds: newState.viewportBounds ? {...newState.viewportBounds} : this._lastState.viewportBounds
            // filteredDataLength is maintained above
        };
        
        // Render if any important property changed - but NOT for zoom changes
        const shouldRender = activeDatasetChanged || 
                            colorModeChanged || 
                            sizeModeChanged ||
                            plateBoundariesChanged || 
                            dataLoadedChanged || 
                            filtersChanged ||
                            selectedChanged;
                            
        if (shouldRender) {
            console.log('Map render triggered by: ' + 
                (activeDatasetChanged ? 'activeDataset ' : '') +
                (colorModeChanged ? 'colorMode ' : '') +
                (sizeModeChanged ? 'sizeMode ' : '') +
                (plateBoundariesChanged ? 'plateBoundaries ' : '') +
                (dataLoadedChanged ? 'dataLoaded ' : '') +
                (filtersChanged ? 'filters ' : '') +
                (selectedChanged ? 'selection ' : '')
            );
        }
        
        return shouldRender;
    }
    
    /**
     * Render the map based on current state
     * @param {Object} state - Current application state
     */
    render(state) {
        // Make sure we have a map
        if (!this.map) {
            console.warn('Map not initialized yet');
            return;
        }
        
        // Check if we have active dataset loaded
        const activeDataset = state.activeDataset;
        if (!state.dataLoaded[activeDataset]) {
            console.log(`${activeDataset} data not loaded yet, skipping render`);
            return;
        }
        
        // Throttle renders
        const now = Date.now();
        if (!this._lastRenderTime || (now - this._lastRenderTime > 100)) {
            // Render the earthquake data
            mapService.renderData();
            this._lastRenderTime = now;
        }
        
        // Handle selected earthquake
        if (state.selectedEarthquake) {
            const newSelection = state.selectedEarthquake !== this._lastSelectedEarthquake;
            
            if (newSelection) {
                this._lastSelectedEarthquake = state.selectedEarthquake;
                
                if (state.autoCenter) {
                    mapService.centerAndHighlightEarthquake(state.selectedEarthquake);
                }
            }
        }
    }
    
    /**
     * Handle window resize events
     */
    handleResize() {
        if (this.map) {
            // Only call resize if the map is fully initialized
            if (typeof this.map.resize === 'function') {
                this.map.resize();
            }
            
            // Re-render if needed
            const state = stateManager.getState();
            this.render(state);
        }
    }
    
    /**
     * Setup responsive layout for the map
     */
    setupResponsiveLayout() {
        // Get the map container
        const mapContainer = document.getElementById(this.containerId);
        if (!mapContainer) return;
        
        // Function to update the layout based on screen size
        const updateLayout = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // Adjust map height based on screen size
            if (width <= 768) {
                // Mobile view - map takes 70% of viewport height
                const mapHeight = Math.round(height * 0.7);
                mapContainer.style.height = `${mapHeight}px`;
            } else {
                // Desktop view - map takes full height
                mapContainer.style.height = '100%';
            }
            
            // Resize the map to match the new container size
            if (this.map && typeof this.map.resize === 'function') {
                this.map.resize();
            } else {
                console.log('Map or resize function not available yet');
            }
        };
        
        // Initial layout update
        updateLayout();
        
        // Update layout on window resize
        window.addEventListener('resize', updateLayout);
        
        // Update layout on orientation change (mobile)
        window.addEventListener('orientationchange', () => {
            // Wait for the browser to update dimensions
            setTimeout(updateLayout, 300);
        });
    }
    
    /**
     * Center the map on a specific earthquake
     * @param {Object} earthquake - Earthquake data object
     */
    centerOnEarthquake(earthquake) {
        if (!this.map || !earthquake) return;
        
        // Update state to indicate we want to center on this earthquake
        stateManager.setState({
            selectedEarthquake: earthquake,
            autoCenter: true
        });
        
        // Reset autoCenter flag after a short delay
        setTimeout(() => {
            stateManager.setState({
                autoCenter: false
            });
        }, 100);
    }
    
    /**
     * Toggle plate boundaries on the map
     * @param {boolean} show - Whether to show plate boundaries
     */
    togglePlateBoundaries(show) {
        mapService.togglePlateBoundaries(show);
    }
    
    /**
     * Clean up event listeners and resources
     */
    destroy() {
        // Unsubscribe from state changes
        if (this.unsubscribeFromState) {
            this.unsubscribeFromState();
        }
        
        // Remove window resize handler
        window.removeEventListener('resize', this.handleResize);
        
        // Clean up the legend
        if (this.legend) {
            this.legend.destroy();
        }
    }
}