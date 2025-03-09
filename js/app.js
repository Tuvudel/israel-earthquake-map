/**
 * Main application entry point for the Earthquake Visualization App
 */

// Define AppState in the global scope immediately
window.AppState = {
    map: null,
    markerLayer: null,
    canvasLayer: null,
    activeDataset: 'recent',
    currentZoom: 6, // Default zoom level, will be updated with CONFIG value
    viewportBounds: null,
    dataLoaded: {
        recent: false,
        historical: false
    },
    data: {
        recent: {
            raw: [],
            filtered: [],
            displayed: []
        },
        historical: {
            raw: [],
            filtered: [],
            displayed: [],
            // For optimizations with large datasets
            indexed: {
                byYear: {}, // Year → earthquakes mapping for quick filtering
                byMagnitude: {}, // Magnitude (rounded) → earthquakes mapping
                spatial: null // Reserved for spatial indexing
            }
        }
    },
    filters: {
        recent: {
            minMagnitude: 0,
            timePeriod: 'month'
        },
        historical: {
            minMagnitude: 0,
            yearRange: [1981, 2023] // Default values, will be updated with CONFIG values
        }
    },
    // New color mode setting
    colorMode: {
        recent: 'depth', // Default is 'depth', alternative is 'magnitude'
        historical: 'depth'
    },
    // Rendering performance tracking
    performance: {
        lastRenderTime: 0,
        renderDuration: 0
    },
    yearSlider: null,
    selectedEarthquake: null,
    // Dedicated worker for background data processing (future enhancement)
    worker: null,
    renderMethod: 'standard' // 'standard', 'canvas', or 'binned'
};

// Define App in the global scope immediately
window.App = {};

// Then implement its functionality
(function(exports) {
    /**
     * Initialize the application
     * @public
     */
    function init() {
        try {
            // Update AppState with CONFIG values if available
            if (window.CONFIG) {
                AppState.currentZoom = CONFIG.map.zoom;
                AppState.filters.historical.yearRange = [CONFIG.years.min, CONFIG.years.max];
            }
            
            // Show loading indicator
            window.Utils.showLoading('Initializing application...');
            
            // Check if required libraries are loaded
            checkDependencies();
            
            // Initialize the map
            AppState.map = window.MapManager.initializeMap();
            
            // Set up UI components
            window.UIManager.setupUI();
            
            // Optional: add debug info panel
            // Uncomment for development/testing
            // window.Utils.addDebugInfo();
            
            // Load recent data
            window.DataManager.loadRecentData().then(() => {
                // Show recent data initially
                window.MapManager.renderCurrentData();
                window.DataManager.updateLastUpdatedTime();
            }).catch(error => {
                console.error('Failed to load recent data:', error);
                window.Utils.showStatus('Error loading recent earthquake data. Please try refreshing the page.', true);
            }).finally(() => {
                window.Utils.hideLoading();
            });
            
            // Preload historical data in the background for faster tab switching
            setTimeout(() => {
                window.DataManager.loadHistoricalData().catch(error => {
                    console.warn('Background loading of historical data failed:', error);
                    // We don't show an error message here since this is a background task
                });
            }, 2000); // Start loading after 2 seconds to not compete with initial rendering
            
        } catch (error) {
            console.error('Application initialization error:', error);
            if (window.Utils) {
                window.Utils.showStatus(`Failed to initialize application: ${error.message}. Please refresh the page or try a different browser.`, true);
                window.Utils.hideLoading();
            } else {
                alert(`Failed to initialize application: ${error.message}. Please refresh the page or try a different browser.`);
            }
        }
    }
    
    /**
     * Verify that all required external libraries are loaded
     * @private
     */
    function checkDependencies() {
        if (typeof L === 'undefined') {
            throw new Error('Leaflet map library not loaded');
        }
        
        if (typeof Papa === 'undefined') {
            throw new Error('Papa Parse library not loaded');
        }
        
        if (typeof noUiSlider === 'undefined') {
            throw new Error('noUiSlider library not loaded');
        }
        
        // Check for our module dependencies
        if (typeof window.Utils === 'undefined') {
            throw new Error('Utils module not loaded');
        }
        
        if (typeof window.DataManager === 'undefined') {
            throw new Error('DataManager module not loaded');
        }
        
        if (typeof window.MapManager === 'undefined') {
            throw new Error('MapManager module not loaded');
        }
        
        if (typeof window.UIManager === 'undefined') {
            throw new Error('UIManager module not loaded');
        }
        
        if (typeof window.CONFIG === 'undefined') {
            throw new Error('CONFIG module not loaded');
        }
    }
    
    // Assign methods to the App object
    exports.init = init;
    
})(window.App);

// Initialize the application when the DOM is ready and all scripts have loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add a slight delay to ensure all scripts are fully loaded and initialized
    setTimeout(function() {
        // Check for critical dependencies before attempting to initialize
        if (!window.Utils || !window.DataManager || !window.MapManager || !window.UIManager || !window.CONFIG) {
            console.error("Critical modules not loaded. Check script loading order.");
            
            // Display error message on page
            const errorMessage = "Application could not load properly. Please refresh the page or try a different browser.";
            if (document.getElementById('loading-overlay')) {
                const errorDiv = document.createElement('div');
                errorDiv.style.color = "red";
                errorDiv.style.fontWeight = "bold";
                errorDiv.style.margin = "20px";
                errorDiv.textContent = errorMessage;
                document.getElementById('loading-overlay').appendChild(errorDiv);
            } else {
                alert(errorMessage);
            }
            return;
        }
        
        console.log("All modules loaded. Initializing application...");
        window.App.init();
    }, 300);  // Add a 300ms delay to ensure all scripts are loaded
});

// Signal that App module is loaded
console.log('App module loaded and ready to initialize');