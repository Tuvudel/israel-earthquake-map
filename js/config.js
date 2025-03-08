/**
 * Configuration settings for the Earthquake Visualization App
 * Controls URLs, map settings, colors, and visualization parameters
 */
const CONFIG = {
    // Base URLs for data
    urls: {
        recentCsv: 'https://raw.githubusercontent.com/Tuvudel/israel-map/main/data/last30_event.csv',
        historicalCsv: 'https://raw.githubusercontent.com/Tuvudel/israel-map/main/data/EQ_Hist_1981_2023.csv'
    },
    
    // Map settings
    map: {
        center: [32.25, 32.0],
        zoom: 6,
        minZoom: 4,
        maxZoom: 19
    },
    
    // Year range for historical data
    years: {
        min: 1981,
        max: 2023
    },
    
    // Color settings for depth visualization
    colors: {
        veryShallow: '#FFD700', // < 5km
        shallow: '#FFA500',     // 5-10km
        medium: '#FF6347',      // 10-20km
        deep: '#FF0000'         // > 20km
    },
    
    // Render settings for optimization
    render: {
        // Use canvas rendering for historical data (much faster)
        useCanvas: true,
        // Maximum number of points to render with standard markers
        maxStandardMarkers: 1000,
        // Data sampling thresholds for different zoom levels
        sampling: {
            // At low zoom levels, show fewer data points for performance
            zoomThresholds: [
                { zoom: 5, sampleRate: 0.05 }, // At zoom 5 or lower, show 5% of data
                { zoom: 6, sampleRate: 0.1 },  // At zoom 6, show 10% of data
                { zoom: 7, sampleRate: 0.2 },  // At zoom 7, show 20% of data
                { zoom: 8, sampleRate: 0.5 },  // At zoom 8, show 50% of data
                { zoom: 9, sampleRate: 0.8 },  // At zoom 9, show 80% of data
                { zoom: 10, sampleRate: 1.0 }  // At zoom 10+, show all data
            ],
            // Prioritize sampling by magnitude (show more significant earthquakes)
            prioritizeByCriteria: true
        }
    }
};