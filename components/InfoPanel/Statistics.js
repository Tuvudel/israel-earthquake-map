/**
 * Statistics Component for the Earthquake Visualization App
 * Displays statistics about the currently visible earthquakes
 */
import { stateManager } from '../../state/StateManager.js';
import { dataService } from '../../services/DataService.js';
import { formatNumber, formatLargeNumber, formatYearRange } from '../../utils/formatting.js';
import { setText } from '../../utils/domUtils.js';

export class Statistics {
    /**
     * Initialize the Statistics component
     * @param {string} containerId - ID of the statistics container
     */
    constructor(containerId = 'statistics-container') {
        this.container = document.getElementById(containerId);
        
        // Elements for statistics display
        this.totalCountElement = document.getElementById('total-count');
        this.avgMagnitudeElement = document.getElementById('avg-magnitude');
        this.medianMagnitudeElement = document.getElementById('median-magnitude');
        this.avgDepthElement = document.getElementById('avg-depth');
        this.medianDepthElement = document.getElementById('median-depth');
        this.avgPerYearElement = document.getElementById('avg-per-year');
        this.yearRangeElement = document.getElementById('year-range');
        
        // Elements for showing/hiding year-related stats
        this.yearRangeStats = document.getElementById('year-range-stats');
        this.avgPerYearStats = document.getElementById('avg-per-year-stats');
        
        // Subscribe to state changes for updating statistics
        this.unsubscribeFromState = stateManager.subscribe(
            this.updateStatistics.bind(this),
            state => ({
                activeDataset: state.activeDataset,
                data: state.data,
                filters: state.filters
            })
        );
        
        // Initial statistics update
        this.updateStatistics(stateManager.getState());
    }
    
    /**
     * Update statistics display
     * @param {Object} state - Current application state (or relevant subset)
     */
    updateStatistics(state) {
        // Get statistics from the data service
        const stats = dataService.getStatistics();
        
        // Update statistics display elements
        if (this.totalCountElement) {
            setText(this.totalCountElement, formatLargeNumber(stats.totalCount));
        }
        
        if (this.avgMagnitudeElement) {
            setText(this.avgMagnitudeElement, formatNumber(stats.avgMagnitude, 2));
        }
        
        if (this.medianMagnitudeElement) {
            setText(this.medianMagnitudeElement, formatNumber(stats.medianMagnitude, 2));
        }
        
        if (this.avgDepthElement) {
            setText(this.avgDepthElement, formatNumber(stats.avgDepth, 2));
        }
        
        if (this.medianDepthElement) {
            setText(this.medianDepthElement, formatNumber(stats.medianDepth, 2));
        }
        
        // Show/hide and update year-specific statistics
        const isHistorical = state.activeDataset === 'historical';
        
        if (this.yearRangeStats) {
            this.yearRangeStats.classList.toggle('hide', !isHistorical);
            
            if (isHistorical && this.yearRangeElement && stats.yearRange) {
                setText(this.yearRangeElement, formatYearRange(stats.yearRange));
            }
        }
        
        if (this.avgPerYearStats) {
            this.avgPerYearStats.classList.toggle('hide', !isHistorical);
            
            if (isHistorical && this.avgPerYearElement && stats.avgPerYear !== null) {
                // For large numbers, use whole numbers; for small numbers, show decimals
                const formattedValue = stats.avgPerYear >= 10 
                    ? Math.round(stats.avgPerYear).toLocaleString() 
                    : formatNumber(stats.avgPerYear, 1);
                setText(this.avgPerYearElement, formattedValue);
            }
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.unsubscribeFromState) {
            this.unsubscribeFromState();
        }
    }
}