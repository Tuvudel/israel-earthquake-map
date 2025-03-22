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
    }
    
    /**
     * Initialize the map and set up event listeners
     */
    async initialize() {
        showLoading('Initializing map...');
        
        try {
            // Initialize the map using the MapService (await the Promise)
            this.map = await mapService.initializeMap(this.containerId);
            
            // Subscribe to state changes after map is initialized
            this.unsubscribeFromState = stateManager.subscribe(state => {
                // Only rerender the map if we have data and filters have changed
                const modeChanged = state.colorMode || state.renderMode || state.showPlateBoundaries;
                const filtersChanged = state.filters;
                const dataChanged = state.data;
                const selectedChanged = state.selectedEarthquake;
                
                if (modeChanged || filtersChanged || dataChanged || selectedChanged) {
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
        
        // Add a throttle to prevent too frequent map renders
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
            // IMPORTANT: Check if resize is available before calling it
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