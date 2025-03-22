/**
 * Configuration settings for the Earthquake Visualization App
 * Optimized for rendering 26K+ markers without clustering
 */

export const config = {
    // Base URLs for data
    urls: {
        recentCsv: 'https://raw.githubusercontent.com/Tuvudel/israel-map/main/data/last30_event.csv',
        historicalCsv: 'https://raw.githubusercontent.com/Tuvudel/israel-map/main/data/EQ_Hist_1981_2023.csv',
        // MapTiler OSM style with API key
        mapStyle: 'https://api.maptiler.com/maps/streets/style.json?key=HxlrzJxlRbZpGrzbR17v',
        // RTL text plugin for proper Hebrew text rendering
        rtlTextPlugin: 'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js'
    },
    
    // Map settings - optimized for performance with large datasets
    map: {
        center: [32.0, 32.25], // Note: [longitude, latitude] for MapLibre (reversed from Leaflet)
        zoom: 6,
        minZoom: 4,
        maxZoom: 19,
        pitch: 0, // Default pitch (3D view angle)
        bearing: 0, // Default bearing (map rotation)
        // Performance optimization settings
        trackResize: true,
        preserveDrawingBuffer: false, // Better performance
        fadeDuration: 0, // Instant fade for better performance
        crossSourceCollisions: false, // Better performance with many markers
        maxParallelImageRequests: 16, // Increase parallel image loading
        localIdeographFontFamily: "'Noto Sans'", // Use local font if available
        transformRequest: null // No transform for better performance
    },
    
    // Year range for historical data
    years: {
        min: 1981,
        max: 2023
    },
    
    // Color settings for visualization
    colors: {
        // Depth colors - expanded categories
        depth: {
            veryShallow: '#FFD700', // < 5km (Gold)
            shallow: '#FFA500',     // 5-10km (Orange)
            moderate: '#FF8C00',    // 10-15km (Dark Orange) - added
            medium: '#FF6347',      // 15-20km (Tomato)
            deep: '#FF4500',        // 20-30km (Orange Red) - updated
            veryDeep: '#E60000',    // 30-50km (Red) - added
            ultraDeep: '#8B0000'    // > 50km (Dark Red) - added
        },
        // Magnitude colors with added micro category
        magnitude: {
            micro: '#BBDDC6',      // < 1 (Light Green) - nearly invisible
            verySmall: '#66BB6A',  // 1-2 (Green)
            small: '#FFEB3B',      // 2-3 (Yellow)
            medium: '#FF9800',     // 3-4 (Orange)
            large: '#E53935',      // 4-5 (Red)
            veryLarge: '#9C27B0',  // 5-6 (Purple)
            major: '#3F51B5',      // 6-7 (Indigo Blue)
            great: '#000000'       // > 7 (Black)
        },
        // Plate boundary colors - updated to black
        plateBoundaries: {
            default: '#000000',     // Default color - black
            transform: '#000000',   // Transform faults - black
            divergent: '#333333',   // Divergent boundaries - dark gray
            convergent: '#000000'   // Convergent boundaries - black
        }
    },
    
    // MapLibre GL JS specific settings - optimized for 26K markers
    maplibre: {
        // IDs for map sources
        sources: {
            recent: 'recent-earthquakes',
            historical: 'historical-earthquakes',
            plateBoundaries: 'plate-boundaries'
        },
        
        // IDs for map layers
        layers: {
            recentEarthquakes: 'recent-earthquakes-layer',
            historicalEarthquakes: 'historical-earthquakes-layer',
            plateBoundaries: 'plate-boundaries-layer',
            highlight: 'highlighted-earthquake-layer'
        },
        
        // Performance optimization settings
        maxTileCacheSize: 50, // Limit tile cache size for memory optimization
        optimizeForTerrain: false, // Disable terrain optimization
        workerCount: 4, // Use 4 workers for parallel processing
        
        // Settings for GeoJSON sources
        sourceSettings: {
            buffer: 128, // Smaller buffer for better performance
            tolerance: 0.375, // Higher tolerance for better performance
            maxzoom: 18, // Maximum zoom level
            generateId: true, // Generate IDs automatically
            promoteId: 'id', // Use 'id' property as feature ID
        }
    },
    
    // Render settings for optimization with 26K+ markers
    render: {
        // Data sampling thresholds for different zoom levels
        sampling: {
            // At low zoom levels, show fewer data points for performance
            zoomThresholds: [
                { zoom: 4, sampleRate: 0.01 },  // At zoom 4 or lower, show 1% of data
                { zoom: 5, sampleRate: 0.05 },  // At zoom 5, show 5% of data
                { zoom: 6, sampleRate: 0.15 },  // At zoom 6, show 15% of data
                { zoom: 7, sampleRate: 0.3 },   // At zoom 7, show 30% of data
                { zoom: 8, sampleRate: 0.5 },   // At zoom 8, show 50% of data
                { zoom: 9, sampleRate: 0.75 },  // At zoom 9, show 75% of data
                { zoom: 10, sampleRate: 1.0 }   // At zoom 10+, show all data
            ],
            // Prioritize sampling by magnitude (show more significant earthquakes)
            prioritizeByCriteria: true,
            // Minimum earthquakes to show regardless of zoom level
            minPointsToShow: 100,
            // Maximum earthquakes to show for optimal performance
            maxPointsToShow: 10000,
            // Use spatial gridding for large datasets
            useGridSampling: true,
            gridSize: 0.1 // Grid cell size in degrees
        },
        
        // Performance settings
        performance: {
            // Debounce delay for map events (milliseconds)
            mapEventDebounce: 100,
            // Throttle delay for render operations (milliseconds)
            renderThrottle: 200,
            // Maximum render operations per second
            maxRenderRate: 4,
            // Use incremental rendering for large datasets
            useIncrementalRendering: true,
            // Time budget for each frame (milliseconds)
            frameBudget: 16,
            // Minimum time between renders (milliseconds)
            minRenderInterval: 250,
            // Use visual optimization techniques
            useVisualOptimizations: true,
            // Reduce detail at low zoom levels
            reduceLowZoomDetail: true
        },
        
        // Memory optimization settings
        memory: {
            // GC hint interval (milliseconds)
            gcInterval: 60000,
            // Maximum cache sizes
            maxCacheSizes: {
                geojson: 10,
                markers: 5000,
                calculations: 1000
            },
            // Use typed arrays where possible
            useTypedArrays: true
        }
    },
    
    // Plate boundaries settings
    plateBoundaries: {
        // Line style options - optimized for subtlety
        style: {
            weight: 3,              // Reduced from 5 to 2 for more subtle appearance
            opacity: 0.9,           // Reduced opacity for better balance
            dashArray: null,        // Solid line (no dash pattern)
            lineCap: 'round',       // Round ends of lines
            lineJoin: 'round',      // Round line joins
            outlineColor: 'white',  // White outline
            outlineWidth: 0.5,      // Thin outline width
            zIndexOffset: 100       // Lower z-index for better performance
        },
        // Default visibility state
        defaultVisible: true        // Show by default
    },
    
    // Web Worker settings
    worker: {
        // Maximum tasks to process in parallel
        maxParallelTasks: 2,
        // Timeout for worker tasks (milliseconds)
        taskTimeout: 30000,
        // Use SharedArrayBuffer for better performance if available
        useSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        // Maximum worker memory before cleanup (bytes)
        maxWorkerMemory: 100 * 1024 * 1024, // 100 MB
        // Flag to enable worker garbage collection hints
        enableGCHints: true
    },
    
    // Debug settings
    debug: {
        // Enable performance logging
        logPerformance: false,
        // Log detail level (0-3)
        logLevel: 1,
        // Track memory usage
        trackMemory: true,
        // Show render stats
        showRenderStats: false,
        // Show frame rate
        showFPS: false
    }
};

// Memory-optimized utility functions for runtime configuration updates
const configCache = {};

/**
 * Get a configuration value by path
 * @param {string} path - Dot-notation path to config value
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Config value
 */
export function getConfig(path, defaultValue) {
    // Check cache first
    if (configCache[path] !== undefined) {
        return configCache[path];
    }
    
    const parts = path.split('.');
    let current = config;
    
    for (const part of parts) {
        if (current === undefined || current === null || current[part] === undefined) {
            return defaultValue;
        }
        current = current[part];
    }
    
    // Cache the result
    configCache[path] = current;
    
    return current;
}

/**
 * Update a configuration value
 * @param {string} path - Dot-notation path to update
 * @param {*} value - New value
 * @returns {Object} Updated config object
 */
export function updateConfig(path, value) {
    const parts = path.split('.');
    let current = config;
    
    // Navigate to the correct nesting level
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
            current[part] = {};
        }
        current = current[part];
    }
    
    // Update the value
    current[parts[parts.length - 1]] = value;
    
    // Clear cache for this path and all parent paths
    let cachePath = '';
    for (const part of parts) {
        cachePath = cachePath ? `${cachePath}.${part}` : part;
        delete configCache[cachePath];
    }
    
    return config;
}

/**
 * Adjust configuration settings based on device capabilities
 * Automatically tunes performance settings for the current device
 */
export function tuneConfigForDevice() {
    // Detect memory constraints
    const lowMemory = navigator.deviceMemory !== undefined && navigator.deviceMemory < 4;
    
    // Detect CPU constraints
    const lowCPU = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency < 4;
    
    // Detect mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Apply optimizations for constrained devices
    if (lowMemory || lowCPU || isMobile) {
        // Reduce tile cache size
        updateConfig('maplibre.maxTileCacheSize', 20);
        
        // Use more aggressive sampling
        const zoomThresholds = [
            { zoom: 4, sampleRate: 0.005 },
            { zoom: 5, sampleRate: 0.01 },
            { zoom: 6, sampleRate: 0.05 },
            { zoom: 7, sampleRate: 0.1 },
            { zoom: 8, sampleRate: 0.2 },
            { zoom: 9, sampleRate: 0.4 },
            { zoom: 10, sampleRate: 0.6 },
            { zoom: 11, sampleRate: 0.8 },
            { zoom: 12, sampleRate: 1.0 }
        ];
        updateConfig('render.sampling.zoomThresholds', zoomThresholds);
        
        // Reduce maximum points to show
        updateConfig('render.sampling.maxPointsToShow', 5000);
        
        // Increase throttle timers
        updateConfig('render.performance.renderThrottle', 300);
        updateConfig('render.performance.minRenderInterval', 500);
        
        // Reduce worker count
        updateConfig('maplibre.workerCount', 2);
        
        console.log('Applied performance optimizations for constrained device');
    } else {
        // High-performance device optimizations
        // Increase worker count for better parallelism
        updateConfig('maplibre.workerCount', navigator.hardwareConcurrency || 4);
        
        // Enable more detailed rendering
        updateConfig('render.sampling.maxPointsToShow', 15000);
        
        console.log('Applied performance optimizations for high-performance device');
    }
    
    return config;
}