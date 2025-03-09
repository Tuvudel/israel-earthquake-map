/**
 * Utility functions for the Earthquake Visualization App
 */

// Define Utils in the global scope immediately
window.Utils = {};

// Then implement its functionality
(function(exports) {
    /**
     * Format a date object to a readable string
     * @param {Date} dateObj - Date object
     * @returns {string} Formatted date string
     */
    function formatDateTime(dateObj) {
        if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
            return 'Unknown';
        }
        
        return dateObj.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    /**
     * Calculate marker size based on earthquake properties and current color mode
     * @param {number} magnitude - Earthquake magnitude
     * @param {number} depth - Earthquake depth in km
     * @returns {number} Marker radius in pixels
     */
    function calculateMarkerSize(magnitude, depth) {
        // Ensure we have valid numbers for calculations
        magnitude = parseFloat(magnitude) || 0;
        depth = parseFloat(depth) || 0;
        
        // Get the current dataset
        const activeDataset = AppState.activeDataset;
        // Get the current color mode
        const colorMode = AppState.colorMode[activeDataset];
        
        // Get current zoom level to adjust marker size
        const currentZoom = AppState.currentZoom || 6;
        // Calculate a zoom factor - at lower zoom levels we need larger markers
        // to maintain visibility of the difference between magnitudes
        const zoomFactor = Math.max(0.8, (10 - currentZoom) * 0.1 + 1);
        
        if (colorMode === 'magnitude') {
            // When coloring by magnitude, size is based on depth
            // Make the relationship between depth and size more pronounced
            // Create a non-linear scale for better visual distinction
            
            // Calculate a size between 5 and 18 pixels
            // We use a logarithmic scale to make the size difference more noticeable
            // Shallow earthquakes (0-5km) will be large (15-18px)
            // Medium depth (5-30km) will be medium (8-15px)
            // Deep earthquakes (>30km) will be small (5-8px)
            
            if (depth < 5) {
                // Very shallow: 15-18px
                return (18 - (depth * 0.6)) * zoomFactor; 
            } else if (depth < 30) {
                // Medium depth: 8-15px
                return (15 - ((depth - 5) * 0.28)) * zoomFactor;
            } else {
                // Deep: 5-8px
                return Math.max(5, (8 - ((depth - 30) * 0.05))) * zoomFactor;
            }
        } else {
            // Default - when coloring by depth, size is based on magnitude
            // Use cubic scale to make larger earthquakes MUCH more visually prominent
            // Calculate size using cubic formula: 4 + (magnitude^3)/2
            // This creates a dramatic difference between magnitude levels, especially at high values
            
            // For reference:
            // M2: 8px
            // M3: 13.5px
            // M4: 24px
            // M5: 41.5px
            // M6: 68px
            // M7: 105px
            // M8: 152px
            
            // Base size of 4px for very small earthquakes
            const baseSize = 4;
            
            // Use cubic scaling to make larger magnitudes dramatically more prominent
            const cubicSize = baseSize + (Math.pow(magnitude, 3) / 2);
            
            // Apply zoom factor to adjust for zoom level
            const sizeWithZoom = cubicSize * zoomFactor;
            
            // Cap the maximum size to prevent extremely large markers
            return Math.max(4, Math.min(150, sizeWithZoom));
        }
    }
    
    /**
     * Calculate marker color based on earthquake depth and current color mode
     * @param {number} depth - Earthquake depth in km
     * @param {number} magnitude - Earthquake magnitude
     * @returns {string} Color in hex format
     */
    function calculateMarkerColor(depth, magnitude) {
        // Ensure we have valid numbers for calculations
        magnitude = parseFloat(magnitude) || 0;
        depth = parseFloat(depth) || 0;
        
        // Get the current dataset
        const activeDataset = AppState.activeDataset;
        // Get the current color mode
        const colorMode = AppState.colorMode[activeDataset];
        
        if (typeof CONFIG === 'undefined' || !CONFIG.colors) {
            // Fallback colors if CONFIG is not available
            if (colorMode === 'magnitude') {
                if (magnitude < 2) return '#66BB6A';      // Very Small
                if (magnitude < 3) return '#FFEB3B';      // Small
                if (magnitude < 4) return '#FF9800';      // Medium
                if (magnitude < 5) return '#E53935';      // Large
                if (magnitude < 6) return '#9C27B0';      // Very Large
                if (magnitude < 7) return '#3F51B5';      // Major
                return '#880E4F';                         // Great (7+)
            } else { // default to depth
                if (depth < 5) return '#FFD700';
                if (depth < 10) return '#FFA500';
                if (depth < 20) return '#FF6347';
                return '#FF0000';
            }
        }
        
        if (colorMode === 'magnitude') {
            if (magnitude < 2) return CONFIG.colors.magnitude.verySmall;
            if (magnitude < 3) return CONFIG.colors.magnitude.small;
            if (magnitude < 4) return CONFIG.colors.magnitude.medium;
            if (magnitude < 5) return CONFIG.colors.magnitude.large;
            if (magnitude < 6) return CONFIG.colors.magnitude.veryLarge;
            if (magnitude < 7) return CONFIG.colors.magnitude.major;
            return CONFIG.colors.magnitude.great;
        } else { // default to depth
            if (depth < 5) return CONFIG.colors.depth.veryShallow;
            if (depth < 10) return CONFIG.colors.depth.shallow;
            if (depth < 20) return CONFIG.colors.depth.medium;
            return CONFIG.colors.depth.deep;
        }
    }
    
    /**
     * Show a status message
     * @param {string} message - Message to display
     * @param {boolean} isError - Whether this is an error message
     */
    function showStatus(message, isError = false) {
        const statusEl = document.getElementById('status-message');
        if (!statusEl) {
            console.error('Status message element not found');
            return;
        }
        
        statusEl.textContent = message;
        statusEl.style.display = 'block';
        statusEl.style.backgroundColor = isError ? '#ffeeee' : 'white';
        statusEl.style.borderLeft = isError ? '4px solid red' : '4px solid #4682B4';
    }
    
    /**
     * Hide the status message
     */
    function hideStatus() {
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }
    
    /**
     * Show the loading overlay
     * @param {string} message - Optional message to display
     */
    function showLoading(message = 'Loading data...') {
        const overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            console.error('Loading overlay element not found');
            return;
        }
        
        const textEl = overlay.querySelector('.loading-text');
        
        if (textEl) {
            textEl.textContent = message;
        }
        
        overlay.classList.remove('hide');
    }
    
    /**
     * Hide the loading overlay
     */
    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hide');
        }
    }
    
    /**
     * Add debug info to the page (for development only)
     */
    function addDebugInfo() {
        // Create a debug panel 
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-info';
        document.body.appendChild(debugDiv);
        
        // Update debug info every 500ms
        setInterval(() => {
            if (typeof AppState === 'undefined') {
                debugDiv.innerHTML = 'AppState not available';
                return;
            }
            
            const isHistorical = AppState.activeDataset === 'historical';
            
            if (isHistorical) {
                debugDiv.innerHTML = `
                    Zoom: ${AppState.currentZoom} | 
                    Points: ${AppState.data.historical.displayed.length}/${AppState.data.historical.filtered.length} | 
                    Render: ${AppState.performance.renderDuration}ms
                `;
            } else {
                debugDiv.innerHTML = `
                    Zoom: ${AppState.currentZoom} | 
                    Points: ${AppState.data.recent.filtered.length} | 
                    Render: ${AppState.performance.renderDuration}ms
                `;
            }
        }, 500);
    }
    
    // Assign methods to the Utils object
    exports.formatDateTime = formatDateTime;
    exports.calculateMarkerSize = calculateMarkerSize;
    exports.calculateMarkerColor = calculateMarkerColor;
    exports.showStatus = showStatus;
    exports.hideStatus = hideStatus;
    exports.showLoading = showLoading;
    exports.hideLoading = hideLoading;
    exports.addDebugInfo = addDebugInfo;
    
})(window.Utils);

// Signal that Utils is fully loaded
console.log('Utils module loaded and initialized');