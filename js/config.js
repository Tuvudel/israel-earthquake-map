/**
 * Configuration settings for the Earthquake Visualization App
 * Controls URLs, map settings, colors, and visualization parameters
 */

// Define CONFIG in the global scope immediately
window.CONFIG = {
    // Base URLs for data
    urls: {
        recentCsv: 'https://raw.githubusercontent.com/Tuvudel/israel-map/main/data/last30_event.csv',
        historicalCsv: 'https://raw.githubusercontent.com/Tuvudel/israel-map/main/data/EQ_Hist_1981_2023.csv',
        // MapTiler OSM style with API key
        mapStyle: 'https://api.maptiler.com/maps/streets/style.json?key=HxlrzJxlRbZpGrzbR17v',
        // RTL text plugin for proper Hebrew text rendering
        rtlTextPlugin: 'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js'
    },
    
    // Map settings
    map: {
        center: [32.0, 32.25], // Note: [longitude, latitude] for MapLibre (reversed from Leaflet)
        zoom: 6,
        minZoom: 4,
        maxZoom: 19,
        pitch: 0, // Default pitch (3D view angle)
        bearing: 0 // Default bearing (map rotation)
    },
    
    // Year range for historical data
    years: {
        min: 1981,
        max: 2023
    },
    
    // Color settings for visualization
    colors: {
        // Depth colors (as rgba for MapLibre expressions)
        depth: {
            veryShallow: '#FFD700', // < 5km
            shallow: '#FFA500',     // 5-10km
            medium: '#FF6347',      // 10-20km
            deep: '#FF0000'         // > 20km
        },
        // Magnitude colors with more distinct values
        magnitude: {
            verySmall: '#66BB6A',   // < 2 (Green)
            small: '#FFEB3B',       // 2-3 (Yellow)
            medium: '#FF9800',      // 3-4 (Orange)
            large: '#E53935',       // 4-5 (Red)
            veryLarge: '#9C27B0',   // 5-6 (Purple)
            major: '#3F51B5',       // 6-7 (Indigo Blue)
            great: '#000000'        // > 7 (Black)
        },
        // Plate boundary colors
        plateBoundaries: {
            default: '#FF5733',     // Default color for all boundaries
            transform: '#FF5733',   // Transform faults (like Dead Sea Transform)
            divergent: '#FF9966',   // Divergent boundaries
            convergent: '#CC3300'   // Convergent boundaries
        }
    },
    
    // MapLibre GL JS specific settings
    maplibre: {
        // IDs for map sources
        sources: {
            recent: 'recent-earthquakes',
            historical: 'historical-earthquakes',
            historicalClusters: 'historical-earthquakes-clusters',
            plateBoundaries: 'plate-boundaries'
        },
        
        // IDs for map layers
        layers: {
            recentEarthquakes: 'recent-earthquakes-layer',
            historicalEarthquakes: 'historical-earthquakes-layer',
            historicalClusters: 'historical-clusters-layer',
            historicalClusterCount: 'historical-cluster-count-layer',
            plateBoundaries: 'plate-boundaries-layer',
            highlight: 'highlighted-earthquake-layer'
        },
        
        // Settings for clustering
        cluster: {
            radius: 50,
            maxZoom: 15  // Max zoom level to cluster points
        }
    },
    
    // Render settings for optimization
    render: {
        // Default render mode for historical data
        defaultHistoricalMode: 'cluster', // 'cluster', 'points'
        
        // Maximum number of points to render with standard markers
        maxStandardMarkers: 10000, // MapLibre can handle much more than Leaflet
        
        // Data sampling thresholds for different zoom levels
        sampling: {
            // At low zoom levels, show fewer data points for performance
            zoomThresholds: [
                { zoom: 5, sampleRate: 0.1 },  // At zoom 5 or lower, show 10% of data
                { zoom: 6, sampleRate: 0.25 }, // At zoom 6, show 25% of data
                { zoom: 7, sampleRate: 0.5 },  // At zoom 7, show 50% of data
                { zoom: 8, sampleRate: 0.75 }, // At zoom 8, show 75% of data
                { zoom: 9, sampleRate: 1.0 }   // At zoom 9+, show all data
            ],
            // Prioritize sampling by magnitude (show more significant earthquakes)
            prioritizeByCriteria: true
        }
    },
    
    // Plate boundaries settings
    plateBoundaries: {
        // Line style options
        style: {
            weight: 5,              // Line width
            opacity: 0.9,           // Opacity
            dashArray: null,        // Solid line (no dash pattern)
            lineCap: 'round',       // Round ends of lines
            lineJoin: 'round',      // Round line joins
            outlineColor: 'white',  // White outline
            outlineWidth: 1,        // Width of the outline
            zIndexOffset: 1000      // Ensure fault lines appear above markers
        },
        // Default visibility state
        defaultVisible: false
    }
};

// Signal that CONFIG is loaded
console.log('CONFIG module loaded');