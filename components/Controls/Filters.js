/**
 * Filters Component for the Earthquake Visualization App
 * Handles filter controls for both recent and historical data
 */
import { stateManager } from '../../state/StateManager.js';
import { dataService } from '../../services/DataService.js';
import { mapService } from '../../services/MapService.js';
import { showLoading, hideLoading } from '../../utils/domUtils.js';

export class Filters {
    /**
     * Initialize the Filters component
     */
    constructor() {
        // Recent data filter controls
        this.recentMagnitudeFilter = document.getElementById('recent-magnitude-filter');
        this.recentDateFilter = document.getElementById('recent-date-filter');
        this.feltFilter = document.getElementById('felt-filter');
        this.recentColorMode = document.getElementById('color-mode-recent');
        this.recentPlateBoundaries = document.getElementById('plate-boundaries-recent');
        
        // Historical data filter controls
        this.historicalMagnitudeFilter = document.getElementById('historical-magnitude-filter');
        this.historicalColorMode = document.getElementById('color-mode-historical');
        this.renderModeHistorical = document.getElementById('render-mode-historical');
        this.historicalPlateBoundaries = document.getElementById('plate-boundaries-historical');
        
        // Set the render mode to 'points' and disable clustering
        // This is because MapLibre GL handles points efficiently already
        if (this.renderModeHistorical) {
            this.renderModeHistorical.value = 'points';
            this.renderModeHistorical.disabled = true;
            this.renderModeHistorical.title = "Clustering is disabled - MapLibre GL handles all points efficiently";
        }
        
        // Initialize filter debounce timeout
        this.filterTimeout = null;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update controls from initial state
        this.updateControlsFromState(stateManager.getState());
        
        // Subscribe to state changes to keep UI in sync
        this.unsubscribeFromState = stateManager.subscribe(
            this.updateControlsFromState.bind(this)
        );
    }
    
    /**
     * Set up event listeners for filter controls
     */
    setupEventListeners() {
        // Recent magnitude filter
        if (this.recentMagnitudeFilter) {
            this.recentMagnitudeFilter.addEventListener('change', () => {
                this.handleFilterChange('recent', 'minMagnitude', parseFloat(this.recentMagnitudeFilter.value));
            });
        }
        
        // Recent date filter
        if (this.recentDateFilter) {
            this.recentDateFilter.addEventListener('change', () => {
                this.handleFilterChange('recent', 'timePeriod', this.recentDateFilter.value);
            });
        }
        
        // Felt earthquakes filter
        if (this.feltFilter) {
            this.feltFilter.addEventListener('change', () => {
                this.handleFilterChange('recent', 'feltOnly', this.feltFilter.checked);
            });
        }
        
        // Recent color mode
        if (this.recentColorMode) {
            this.recentColorMode.addEventListener('change', () => {
                this.handleColorModeChange('recent', this.recentColorMode.value);
            });
        }
        
        // Recent plate boundaries toggle
        if (this.recentPlateBoundaries) {
            this.recentPlateBoundaries.addEventListener('change', () => {
                this.handlePlateBoundariesToggle(this.recentPlateBoundaries.checked);
            });
        }
        
        // Historical magnitude filter
        if (this.historicalMagnitudeFilter) {
            this.historicalMagnitudeFilter.addEventListener('change', () => {
                this.handleFilterChange('historical', 'minMagnitude', parseFloat(this.historicalMagnitudeFilter.value));
            });
        }
        
        // Historical color mode
        if (this.historicalColorMode) {
            this.historicalColorMode.addEventListener('change', () => {
                this.handleColorModeChange('historical', this.historicalColorMode.value);
            });
        }
        
        // Historical render mode
        if (this.renderModeHistorical) {
            this.renderModeHistorical.addEventListener('change', () => {
                this.handleRenderModeChange(this.renderModeHistorical.value);
            });
        }
        
        // Historical plate boundaries toggle
        if (this.historicalPlateBoundaries) {
            this.historicalPlateBoundaries.addEventListener('change', () => {
                this.handlePlateBoundariesToggle(this.historicalPlateBoundaries.checked);
            });
        }
    }
    
    /**
     * Handle filter changes with debounce
     * @param {string} datasetType - Type of dataset ('recent' or 'historical')
     * @param {string} filterName - Name of the filter to change
     * @param {*} value - New filter value
     */
    handleFilterChange(datasetType, filterName, value) {
        // Clear any existing timeout
        clearTimeout(this.filterTimeout);
        
        // Show loading indicator for better UX
        showLoading('Applying filters...');
        
        // Debounce filter changes to avoid excessive re-renders
        this.filterTimeout = setTimeout(() => {
            // Update the state with the new filter value
            stateManager.setState({
                filters: {
                    [datasetType]: {
                        [filterName]: value
                    }
                }
            });
            
            // Apply filters and update the map
            dataService.applyFilters();
            
            // Hide loading indicator
            hideLoading();
        }, 300); // 300ms debounce
    }
    
    /**
     * Handle color mode changes
     * @param {string} datasetType - Type of dataset ('recent' or 'historical')
     * @param {string} mode - New color mode ('depth' or 'magnitude')
     */
    handleColorModeChange(datasetType, mode) {
        // Show loading indicator
        showLoading('Updating visualization...');
        
        // Update state with new color mode
        stateManager.setState({
            colorMode: {
                [datasetType]: mode
            }
        });
        
        // Re-render the map
        setTimeout(() => {
            mapService.renderData();
            hideLoading();
        }, 10);
    }
    
    /**
     * Handle render mode changes
     * @param {string} mode - New render mode
     */
    handleRenderModeChange(mode) {
        // Show loading indicator
        showLoading('Changing render mode...');
        
        // Update state with new render mode
        stateManager.setState({
            renderMode: {
                historical: mode
            }
        });
        
        // Re-render if in historical mode
        const state = stateManager.getState();
        if (state.activeDataset === 'historical') {
            setTimeout(() => {
                mapService.renderData();
                hideLoading();
            }, 10);
        } else {
            hideLoading();
        }
    }
    
    /**
     * Handle plate boundaries toggle
     * @param {boolean} show - Whether to show plate boundaries
     */
    handlePlateBoundariesToggle(show) {
        // Sync both toggles if they exist
        if (this.recentPlateBoundaries) {
            this.recentPlateBoundaries.checked = show;
        }
        
        if (this.historicalPlateBoundaries) {
            this.historicalPlateBoundaries.checked = show;
        }
        
        // Update state and map
        stateManager.setState({
            showPlateBoundaries: show
        });
        
        mapService.togglePlateBoundaries(show);
    }
    
    /**
     * Update controls to reflect current state
     * @param {Object} state - Current application state
     */
    updateControlsFromState(state) {
        // Recent filters
        if (this.recentMagnitudeFilter) {
            this.recentMagnitudeFilter.value = state.filters.recent.minMagnitude;
        }
        
        if (this.recentDateFilter) {
            this.recentDateFilter.value = state.filters.recent.timePeriod;
        }
        
        if (this.feltFilter) {
            this.feltFilter.checked = state.filters.recent.feltOnly;
        }
        
        if (this.recentColorMode) {
            this.recentColorMode.value = state.colorMode.recent;
        }
        
        // Historical filters
        if (this.historicalMagnitudeFilter) {
            this.historicalMagnitudeFilter.value = state.filters.historical.minMagnitude;
        }
        
        if (this.historicalColorMode) {
            this.historicalColorMode.value = state.colorMode.historical;
        }
        
        if (this.renderModeHistorical) {
            this.renderModeHistorical.value = state.renderMode.historical;
        }
        
        // Plate boundaries
        if (this.recentPlateBoundaries) {
            this.recentPlateBoundaries.checked = state.showPlateBoundaries;
        }
        
        if (this.historicalPlateBoundaries) {
            this.historicalPlateBoundaries.checked = state.showPlateBoundaries;
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        clearTimeout(this.filterTimeout);
        
        if (this.unsubscribeFromState) {
            this.unsubscribeFromState();
        }
    }
}