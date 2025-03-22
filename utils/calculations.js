/**
 * Calculation utilities for the Earthquake Visualization App
 * Optimized for handling large datasets
 */
import { config } from '../config.js';

// Cache for memoized calculation results
const memoCache = {
    markerSize: new Map(),
    markerColor: new Map(),
    statistics: new Map()
};

// Clear caches periodically to prevent memory leaks
setInterval(() => {
    if (memoCache.markerSize.size > 1000) memoCache.markerSize.clear();
    if (memoCache.markerColor.size > 1000) memoCache.markerColor.clear();
    if (memoCache.statistics.size > 20) memoCache.statistics.clear();
}, 60000); // Clear every minute if too large

/**
 * Calculate marker size based on earthquake properties and current color mode
 * @param {number} magnitude - Earthquake magnitude
 * @param {number} depth - Earthquake depth in km
 * @param {string} colorMode - Current color mode ('magnitude' or 'depth')
 * @param {number} currentZoom - Current map zoom level
 * @returns {number} Marker radius in pixels
 */
export function calculateMarkerSize(magnitude, depth, colorMode, currentZoom) {
    // Create a cache key
    const cacheKey = `${magnitude.toFixed(1)}_${depth.toFixed(1)}_${colorMode}_${currentZoom.toFixed(1)}`;
    
    // Check cache first
    if (memoCache.markerSize.has(cacheKey)) {
        return memoCache.markerSize.get(cacheKey);
    }
    
    // Ensure we have valid numbers for calculations
    magnitude = parseFloat(magnitude) || 0;
    depth = parseFloat(depth) || 0;
    currentZoom = currentZoom || 6;
    
    // Calculate a zoom factor - at lower zoom levels we need larger markers to maintain visibility
    const zoomFactor = Math.max(0.8, (10 - currentZoom) * 0.1 + 1);
    
    let size;
    
    if (colorMode === 'magnitude') {
        // When coloring by magnitude, size is based on depth (inverse relationship)
        // Simplified calculation using interpolation for better performance
        if (depth < 5) {
            size = 18 * zoomFactor;
        } else if (depth < 30) {
            // Linear interpolation between 15px and 8px
            const t = (depth - 5) / 25;
            size = (15 * (1 - t) + 8 * t) * zoomFactor;
        } else {
            // Deep earthquakes are smaller
            size = Math.max(5, (8 - Math.min(3, (depth - 30) / 60 * 3))) * zoomFactor;
        }
    } else {
        // When coloring by depth, size is based on magnitude
        // Using exponential scale for better visual distinction
        // This is more efficient than cubic calculation
        size = 4 + Math.pow(2, magnitude - 1);
        
        // Apply zoom factor and cap size
        size = Math.min(150, size * zoomFactor);
    }
    
    // Round to 1 decimal place for better caching
    const result = Math.round(size * 10) / 10;
    
    // Cache the result
    memoCache.markerSize.set(cacheKey, result);
    
    return result;
}

/**
 * Calculate marker color based on earthquake properties and current color mode
 * @param {number} depth - Earthquake depth in km
 * @param {number} magnitude - Earthquake magnitude
 * @param {string} colorMode - Current color mode ('magnitude' or 'depth')
 * @returns {string} Color in hex format
 */
export function calculateMarkerColor(depth, magnitude, colorMode) {
    // Create a cache key
    const cacheKey = `${depth.toFixed(1)}_${magnitude.toFixed(1)}_${colorMode}`;
    
    // Check cache first
    if (memoCache.markerColor.has(cacheKey)) {
        return memoCache.markerColor.get(cacheKey);
    }
    
    // Ensure we have valid numbers for calculations
    magnitude = parseFloat(magnitude) || 0;
    depth = parseFloat(depth) || 0;
    
    let color;
    
    if (colorMode === 'magnitude') {
        if (magnitude < 2) color = config.colors.magnitude.verySmall;
        else if (magnitude < 3) color = config.colors.magnitude.small;
        else if (magnitude < 4) color = config.colors.magnitude.medium;
        else if (magnitude < 5) color = config.colors.magnitude.large;
        else if (magnitude < 6) color = config.colors.magnitude.veryLarge;
        else if (magnitude < 7) color = config.colors.magnitude.major;
        else color = config.colors.magnitude.great;
    } else { // default to depth
        if (depth < 5) color = config.colors.depth.veryShallow;
        else if (depth < 10) color = config.colors.depth.shallow;
        else if (depth < 20) color = config.colors.depth.medium;
        else color = config.colors.depth.deep;
    }
    
    // Cache the result
    memoCache.markerColor.set(cacheKey, color);
    
    return color;
}

    /**
     * Calculate the median value from an array of numbers
     * @param {Array<number>} values - Array of numeric values
     * @returns {number} Median value
     */
    export function calculateMedian(values) {
        if (!values || values.length === 0) {
            return 0;
        }
        
        // Sort the values
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        
        // For even-length arrays, average the middle two values
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        
        // For odd-length arrays, return the middle value
        return sorted[middle];
    }

    /**
     * Calculate statistics from an array of earthquake data with optimizations for large datasets
     * @param {Array} earthquakes - Array of earthquake objects
     * @param {Array} [yearRange] - Optional year range for historical data
     * @returns {Object} Statistics object with counts, averages, medians, etc.
     */
    export function calculateStatistics(earthquakes, yearRange = null) {
        // For empty datasets, return default values
        if (!earthquakes || earthquakes.length === 0) {
            return {
                count: 0,
                totalCount: 0,
                avgMagnitude: 0,
                medianMagnitude: 0,
                avgDepth: 0,
                medianDepth: 0,
                avgPerYear: null,
                yearRange
            };
        }
        
        // Create a cache key
        const count = earthquakes.length;
        const yearRangeKey = yearRange ? `${yearRange[0]}-${yearRange[1]}` : 'all';
        const cacheKey = `${count}_${yearRangeKey}`;
        
        // Check if we have recent cached statistics
        if (memoCache.statistics.has(cacheKey)) {
            return memoCache.statistics.get(cacheKey);
        }
        
        // For very large datasets, sample to improve performance
        let dataToProcess = earthquakes;
        let usedSampling = false;
        
        if (count > 10000) {
            // Sample 10% of the data for statistics
            const sampleSize = Math.max(1000, Math.floor(count / 10));
            const sampledData = [];
            
            // Use regular sampling with random offset
            const step = Math.floor(count / sampleSize);
            const offset = Math.floor(Math.random() * step);
            
            for (let i = offset; i < count; i += step) {
                sampledData.push(earthquakes[i]);
            }
            
            dataToProcess = sampledData;
            usedSampling = true;
        }
        
        // Calculate statistics using a single loop for efficiency
        let totalMagnitude = 0;
        let totalDepth = 0;
        const magnitudes = [];
        const depths = [];
        
        // For large datasets, use an optimized loop
        const length = dataToProcess.length;
        
        // Unrolled loop for better performance with large arrays
        const blockSize = 8;
        const blockEnd = length - (length % blockSize);
        
        // Process blocks of 8 elements
        for (let i = 0; i < blockEnd; i += blockSize) {
            // Process a block of earthquakes
            for (let j = 0; j < blockSize; j++) {
                const quake = dataToProcess[i + j];
                const mag = quake.magnitude;
                const depth = quake.depth;
                
                totalMagnitude += mag;
                totalDepth += depth;
                
                // Store values for median calculation
                magnitudes.push(mag);
                depths.push(depth);
            }
        }
        
        // Process remaining elements
        for (let i = blockEnd; i < length; i++) {
            const quake = dataToProcess[i];
            const mag = quake.magnitude;
            const depth = quake.depth;
            
            totalMagnitude += mag;
            totalDepth += depth;
            
            // Store values for median calculation
            magnitudes.push(mag);
            depths.push(depth);
        }
        
        // Calculate medians
        const medianMagnitude = calculateMedian(magnitudes);
        const medianDepth = calculateMedian(depths);
        
        // Calculate averages
        const avgMagnitude = totalMagnitude / length;
        const avgDepth = totalDepth / length;
        
        // Calculate earthquakes per year for historical data
        let avgPerYear = null;
        if (yearRange && yearRange.length === 2) {
            const [minYear, maxYear] = yearRange;
            const yearSpan = maxYear - minYear + 1; // +1 because range is inclusive
            avgPerYear = count / yearSpan;
        }
        
        const stats = {
            count,
            totalCount: count,
            avgMagnitude,
            medianMagnitude,
            avgDepth,
            medianDepth,
            avgPerYear,
            yearRange,
            usedSampling  // Flag to indicate if sampling was used
        };
        
        // Cache the results
        memoCache.statistics.set(cacheKey, stats);
        
        return stats;
    }

/**
 * Convert earthquake data objects to GeoJSON format with optimizations
 * @param {Array} earthquakes - Array of earthquake data objects
 * @returns {Object} GeoJSON FeatureCollection
 */
export function convertToGeoJSON(earthquakes) {
    // For large datasets, we'll create features in chunks to avoid blocking the main thread
    const features = new Array(earthquakes.length);
    const chunkSize = 1000;
    
    for (let i = 0; i < earthquakes.length; i += chunkSize) {
        const end = Math.min(i + chunkSize, earthquakes.length);
        
        for (let j = i; j < end; j++) {
            const quake = earthquakes[j];
            
            // Create feature with optimized property access
            features[j] = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [quake.longitude, quake.latitude]
                },
                properties: {
                    id: quake.id || '',
                    dateTime: quake.dateTime ? (typeof quake.dateTime === 'object' ? quake.dateTime.toISOString() : quake.dateTime) : '',
                    magnitude: quake.magnitude,
                    depth: quake.depth,
                    region: quake.region || 'Unknown',
                    type: quake.type || 'Unknown',
                    felt: quake.felt === true ? 'true' : 'false'
                }
            };
        }
    }
    
    return {
        type: 'FeatureCollection',
        features: features
    };
}

/**
 * Optimized function to filter earthquakes based on criteria
 * @param {Array} earthquakes - Array of earthquake data
 * @param {Object} criteria - Filter criteria
 * @returns {Array} Filtered earthquakes
 */
export function filterEarthquakes(earthquakes, criteria) {
    // Early exit for empty data
    if (!earthquakes || earthquakes.length === 0) {
        return [];
    }
    
    // For large datasets, use TypedArray for filter flags for better performance
    const length = earthquakes.length;
    const keepFlags = new Uint8Array(length);
    
    // Initialize all flags to 1 (keep)
    keepFlags.fill(1);
    
    // Apply magnitude filter
    if (criteria.minMagnitude > 0) {
        for (let i = 0; i < length; i++) {
            if (earthquakes[i].magnitude < criteria.minMagnitude) {
                keepFlags[i] = 0;
            }
        }
    }
    
    // Apply year range filter (for historical data)
    if (criteria.yearRange && criteria.yearRange.length === 2) {
        const [minYear, maxYear] = criteria.yearRange;
        
        for (let i = 0; i < length; i++) {
            if (keepFlags[i] === 1 && earthquakes[i].year) {
                const year = earthquakes[i].year;
                if (year < minYear || year > maxYear) {
                    keepFlags[i] = 0;
                }
            }
        }
    }
    
    // Apply time period filter (for recent data)
    if (criteria.timePeriod && criteria.timePeriod !== 'all') {
        const now = Date.now();
        let cutoffTime;
        
        if (criteria.timePeriod === 'week') {
            cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
        } else if (criteria.timePeriod === 'month') {
            cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
        }
        
        if (cutoffTime) {
            for (let i = 0; i < length; i++) {
                if (keepFlags[i] === 1 && earthquakes[i].dateTime) {
                    const dateTime = earthquakes[i].dateTime;
                    const timestamp = typeof dateTime === 'object' ? dateTime.getTime() : dateTime;
                    
                    if (timestamp < cutoffTime) {
                        keepFlags[i] = 0;
                    }
                }
            }
        }
    }
    
    // Apply felt filter (for recent data)
    if (criteria.feltOnly === true) {
        for (let i = 0; i < length; i++) {
            if (keepFlags[i] === 1 && earthquakes[i].felt !== true) {
                keepFlags[i] = 0;
            }
        }
    }
    
    // Create result array with pre-allocated size for better performance
    const result = [];
    
    // Skip array allocation/resize operations by counting first
    let resultCount = 0;
    for (let i = 0; i < length; i++) {
        if (keepFlags[i] === 1) {
            resultCount++;
        }
    }
    
    // Pre-allocate result array
    result.length = resultCount;
    
    // Fill the result array
    for (let i = 0, j = 0; i < length; i++) {
        if (keepFlags[i] === 1) {
            result[j++] = earthquakes[i];
        }
    }
    
    return result;
}

/**
 * Create a spatial index for efficient spatial queries
 * @param {Array} earthquakes - Array of earthquake data
 * @param {number} resolution - Grid cell size in degrees
 * @returns {Object} Spatial index
 */
export function createSpatialIndex(earthquakes, resolution = 1) {
    // Create grid-based spatial index
    const spatialIndex = {};
    
    // Process earthquakes in chunks to avoid blocking the main thread
    const length = earthquakes.length;
    const chunkSize = 5000;
    
    for (let start = 0; start < length; start += chunkSize) {
        const end = Math.min(start + chunkSize, length);
        
        for (let i = start; i < end; i++) {
            const quake = earthquakes[i];
            
            // Calculate grid cell coordinates
            const latCell = Math.floor(quake.latitude / resolution);
            const lonCell = Math.floor(quake.longitude / resolution);
            const cellKey = `${latCell}:${lonCell}`;
            
            // Create cell if it doesn't exist
            if (!spatialIndex[cellKey]) {
                spatialIndex[cellKey] = [];
            }
            
            // Add earthquake to cell
            spatialIndex[cellKey].push(i); // Store index instead of object for memory efficiency
        }
    }
    
    // Add query method to the index
    spatialIndex.query = function(bounds, sourceData) {
        const { north, south, east, west } = bounds;
        
        // Calculate grid cell range
        const minLatCell = Math.floor(south / resolution);
        const maxLatCell = Math.floor(north / resolution);
        const minLonCell = Math.floor(west / resolution);
        const maxLonCell = Math.floor(east / resolution);
        
        // Collect results
        const resultIndices = new Set();
        
        // Check each cell in the range
        for (let latCell = minLatCell; latCell <= maxLatCell; latCell++) {
            for (let lonCell = minLonCell; lonCell <= maxLonCell; lonCell++) {
                const cellKey = `${latCell}:${lonCell}`;
                const cell = this[cellKey];
                
                if (cell) {
                    // Add all indices from this cell
                    for (const idx of cell) {
                        resultIndices.add(idx);
                    }
                }
            }
        }
        
        // Convert indices to actual earthquakes
        if (sourceData) {
            const result = [];
            resultIndices.forEach(idx => {
                if (idx < sourceData.length) {
                    result.push(sourceData[idx]);
                }
            });
            return result;
        }
        
        // Just return indices if no source data provided
        return Array.from(resultIndices);
    };
    
    return spatialIndex;
}

// Export utility function to debug memory usage
export function reportMemoryUsage() {
    return {
        markerSizeCache: memoCache.markerSize.size,
        markerColorCache: memoCache.markerColor.size,
        statisticsCache: memoCache.statistics.size
    };
}