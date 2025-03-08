/**
 * Main application entry point for the Earthquake Visualization App
 */

// Global application state for sharing data between modules
const AppState = {
    map: null,
    markerLayer: null,
    canvasLayer: null,
    activeDataset: 'recent',
    currentZoom: CONFIG.map.zoom,
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
            yearRange: [CONFIG.years.min, CONFIG.years.max]
        }
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

/**
 * Main application initialization
 */
const App = (function() {
    /**
     * Initialize the application
     * @public
     */
    function init() {
        try {
            Utils.showLoading('Initializing application...');
            
            // Check if required libraries are loaded
            checkDependencies();
            
            // Initialize the map
            AppState.map = MapManager.initializeMap();
            
            // Set up UI components
            UIManager.setupUI();
            
            // Optional: add debug info panel
            // Uncomment for development/testing
            // Utils.addDebugInfo();
            
            // Load recent data
            DataManager.loadRecentData().then(() => {
                // Show recent data initially
                MapManager.renderCurrentData();
                DataManager.updateLastUpdatedTime();
            }).catch(error => {
                console.error('Failed to load recent data:', error);
                Utils.showStatus('Error loading recent earthquake data. Please try refreshing the page.', true);
            }).finally(() => {
                Utils.hideLoading();
            });
            
            // Preload historical data in the background for faster tab switching
            setTimeout(() => {
                DataManager.loadHistoricalData().catch(error => {
                    console.warn('Background loading of historical data failed:', error);
                    // We don't show an error message here since this is a background task
                });
            }, 2000); // Start loading after 2 seconds to not compete with initial rendering
            
        } catch (error) {
            console.error('Application initialization error:', error);
            Utils.showStatus(`Failed to initialize application: ${error.message}. Please refresh the page or try a different browser.`, true);
            Utils.hideLoading();
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
    }
    
    // Return public methods
    return {
        init: init
    };
})();

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});