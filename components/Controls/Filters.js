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
        this.recentSizeMode = document.getElementById('size-mode-recent'); // New size mode control
        this.recentPlateBoundaries = document.getElementById('plate-boundaries-recent');
        
        // Historical data filter controls
        this.historicalMagnitudeFilter = document.getElementById('historical-magnitude-filter');
        this.historicalColorMode = document.getElementById('color-mode-historical');
        this.historicalSizeMode = document.getElementById('size-mode-historical'); // New size mode control
        this.historicalPlateBoundaries = document.getElementById('plate-boundaries-historical');
        
        // Note: The render mode dropdown has been removed as it's no longer relevant
        
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
        
        // Recent size mode (new)
        if (this.recentSizeMode) {
            this.recentSizeMode.addEventListener('change', () => {
                this.handleSizeModeChange('recent', this.recentSizeMode.value);
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
        
        // Historical size mode (new)
        if (this.historicalSizeMode) {
            this.historicalSizeMode.addEventListener('change', () => {
                this.handleSizeModeChange('historical', this.historicalSizeMode.value);
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
     * Handle size mode changes
     * @param {string} datasetType - Type of dataset ('recent' or 'historical')
     * @param {string} mode - New size mode ('depth' or 'magnitude')
     */
    handleSizeModeChange(datasetType, mode) {
        // Show loading indicator
        showLoading('Updating visualization...');
        
        // Update state with new size mode
        stateManager.setState({
            sizeMode: {
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
        
        // Recent size mode (new)
        if (this.recentSizeMode) {
            this.recentSizeMode.value = state.sizeMode?.recent || 'magnitude';
        }
        
        // Historical filters
        if (this.historicalMagnitudeFilter) {
            this.historicalMagnitudeFilter.value = state.filters.historical.minMagnitude;
        }
        
        if (this.historicalColorMode) {
            this.historicalColorMode.value = state.colorMode.historical;
        }
        
        // Historical size mode (new)
        if (this.historicalSizeMode) {
            this.historicalSizeMode.value = state.sizeMode?.historical || 'magnitude';
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