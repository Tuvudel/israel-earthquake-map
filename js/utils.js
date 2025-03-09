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
     * Calculate marker size based on earthquake magnitude
     * @param {number} magnitude - Earthquake magnitude
     * @returns {number} Marker radius in pixels
     */
    function calculateMarkerSize(magnitude) {
        // Linear scale that ensures small earthquakes are visible
        // But larger earthquakes have more visual prominence
        return Math.max(5, Math.min(20, magnitude * 2));
    }
    
    /**
     * Calculate marker color based on earthquake depth
     * @param {number} depth - Earthquake depth in km
     * @returns {string} Color in hex format
     */
    function calculateMarkerColor(depth) {
        if (typeof CONFIG === 'undefined' || !CONFIG.colors) {
            // Fallback colors if CONFIG is not available
            if (depth < 5) return '#FFD700'; // Very Shallow
            if (depth < 10) return '#FFA500'; // Shallow
            if (depth < 20) return '#FF6347'; // Medium
            return '#FF0000'; // Deep
        }
        
        if (depth < 5) return CONFIG.colors.veryShallow;
        if (depth < 10) return CONFIG.colors.shallow;
        if (depth < 20) return CONFIG.colors.medium;
        return CONFIG.colors.deep;
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