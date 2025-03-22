/**
 * Initial application state
 */
export const initialState = {
    activeDataset: 'recent',
    currentZoom: 6, // Default zoom level
    viewportBounds: null,
    dataLoaded: {
        recent: false,
        historical: false
    },
    // Flag to indicate historical data is queued for loading
    historicalDataQueued: false,
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
            timePeriod: 'month',
            feltOnly: false
        },
        historical: {
            minMagnitude: 0,
            yearRange: [1981, 2023] // Default values, will be updated with config values
        }
    },
    // Color mode setting
    colorMode: {
        recent: 'magnitude', // Changed from 'depth' to 'magnitude'
        historical: 'magnitude'
    },
    // Size mode setting - new parameter
    sizeMode: {
        recent: 'magnitude', // Options are 'magnitude', 'depth'
        historical: 'magnitude'
    },
    // Render mode for historical data
    renderMode: {
        historical: 'points' // Default is 'points', alternatives could be 'cluster'
    },
    // Rendering performance tracking
    performance: {
        lastRenderTime: 0,
        renderDuration: 0,
        avgRenderTime: 0,
        renderCount: 0
    },
    // Network state
    network: {
        isOnline: navigator.onLine,
        connectionType: navigator.connection ? navigator.connection.effectiveType : '4g'
    },
    // Application state
    app: {
        initialized: false,
        mapReady: false
    },
    // Plate boundaries toggle state
    showPlateBoundaries: false,
    selectedEarthquake: null,
    loading: true,
    error: null
};