/**
 * Web Worker for processing earthquake data
 * Offloads CPU-intensive tasks from the main thread
 */

// Import required libraries
importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js');

// Cache for processed data
const dataCache = {
    historical: null,
    recent: null,
    indices: null,
    geojson: {}
};

// Performance timers
const perfTimers = {};

// Start a performance timer
function startTimer(name) {
    perfTimers[name] = performance.now();
}

// End a performance timer and return duration
function endTimer(name) {
    if (!perfTimers[name]) {
        console.warn(`Timer '${name}' does not exist`);
        return 0;
    }
    const duration = performance.now() - perfTimers[name];
    delete perfTimers[name];
    return duration;
}

// Process messages from the main thread
self.onmessage = function(e) {
    const { action, data, filters, options, requestId } = e.data;
    
    try {
        // Process by action type
        startTimer(action);
        
        switch (action) {
            case 'processHistoricalData':
                processHistoricalData(data, filters, requestId);
                break;
            case 'processRecentData':
                processRecentData(data, filters, requestId);
                break;
            case 'filterData':
                filterData(data, filters, options, requestId);
                break;
            case 'convertToGeoJSON':
                convertToGeoJSON(data, options, requestId);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        const duration = endTimer(action);
        console.log(`Worker completed ${action} in ${duration.toFixed(1)}ms`);
    } catch (error) {
        self.postMessage({
            error: error.message,
            stack: error.stack,
            requestId
        });
    }
};

/**
 * Process historical earthquake data from CSV
 * @param {Array} data - Raw CSV data
 * @param {Object} filters - Initial filter criteria 
 * @param {number} requestId - Request ID for tracking
 */
function processHistoricalData(data, filters, requestId) {
    startTimer('processHistoricalData');
    
    // Skip processing if we already have the data cached
    if (dataCache.historical) {
        self.postMessage({
            action: 'processHistoricalDataComplete',
            processedData: dataCache.historical,
            indices: dataCache.indices,
            usedCache: true,
            requestId
        });
        return;
    }
    
    try {
        // Process data in chunks to prevent timeout
        const chunkSize = 5000;
        const totalChunks = Math.ceil(data.length / chunkSize);
        let processedData = [];
        
        // Process each chunk
        for (let chunk = 0; chunk < totalChunks; chunk++) {
            const start = chunk * chunkSize;
            const end = Math.min(start + chunkSize, data.length);
            const chunkData = data.slice(start, end);
            
            // Process this chunk
            const chunkProcessed = processHistoricalDataChunk(chunkData);
            processedData = processedData.concat(chunkProcessed);
            
            // Send progress update every other chunk
            if (chunk % 2 === 0) {
                self.postMessage({
                    action: 'processHistoricalDataProgress',
                    progress: Math.round((chunk + 1) * 100 / totalChunks),
                    requestId
                });
            }
        }
        
        // Filter invalid records
        processedData = processedData.filter(item => {
            return item.latitude && 
                   item.longitude && 
                   item.dateTime && 
                   item.magnitude >= 0;
        });
        
        // Build indices for faster filtering
        const indices = buildHistoricalIndices(processedData);
        
        // Cache the processed data and indices
        dataCache.historical = processedData;
        dataCache.indices = indices;
        
        // Apply initial filtering if filters provided
        let filtered = processedData;
        if (filters) {
            filtered = filterHistoricalData(processedData, filters, indices);
        }
        
        const duration = endTimer('processHistoricalData');
        
        // Send processed data back to main thread
        self.postMessage({
            action: 'processHistoricalDataComplete',
            processedData: processedData,
            filtered: filtered,
            indices: indices,
            dataLength: processedData.length,
            filteredLength: filtered.length,
            duration,
            requestId
        });
    } catch (error) {
        self.postMessage({
            error: `Error processing historical data: ${error.message}`,
            stack: error.stack,
            requestId
        });
    }
}

/**
 * Process a chunk of historical earthquake data
 * @param {Array} chunkData - Chunk of raw CSV data
 * @returns {Array} Processed data chunk
 */
function processHistoricalDataChunk(chunkData) {
    return chunkData.map(item => {
        // Parse date and time
        let dateTime = null;
        if (item.Date && item.Time) {
            try {
                // Handle DD/MM/YYYY format
                const dateParts = String(item.Date).split('/');
                if (dateParts.length === 3) {
                    const [day, month, year] = dateParts.map(Number);
                    
                    // Parse time components (HH:MM:SS.ms)
                    let hours = 0, minutes = 0, seconds = 0;
                    if (item.Time) {
                        const timeParts = String(item.Time).split(':');
                        hours = parseInt(timeParts[0]) || 0;
                        minutes = parseInt(timeParts[1]) || 0;
                        seconds = parseFloat(timeParts[2]) || 0;
                    }
                    
                    // Create timestamp (months are 0-indexed in JavaScript)
                    const date = new Date(year, month - 1, day, hours, minutes, Math.floor(seconds));
                    dateTime = date.getTime(); // Store as timestamp for easier serialization
                }
            } catch (e) {
                // Date parsing error
                dateTime = null;
            }
        }
        
        // Get the best magnitude value from multiple possibilities
        let magnitude = 0;
        
        // Try to find a valid magnitude value (not null, not undefined, not a sentinel value like -999)
        const validValue = val => val !== null && val !== undefined && val > -900;
        
        if (validValue(item.M)) {
            magnitude = item.M;
        } else if (validValue(item.mb)) {
            magnitude = item.mb;
        } else if (validValue(item.ms)) {
            magnitude = item.ms;
        } else if (validValue(item.ml)) {
            magnitude = item.ml;
        }
        
        // Create a year value based on date if available
        let year = null;
        let decade = null;
        
        if (dateTime) {
            const date = new Date(dateTime);
            year = date.getFullYear();
            decade = Math.floor(year / 10) * 10;
        }
        
        return {
            id: item['event.evid'] || '',
            dateTime: dateTime,
            magnitude: parseFloat(magnitude) || 0,
            latitude: parseFloat(item.lat) || 0,
            longitude: parseFloat(item.lon) || 0,
            depth: parseFloat(item.depth) || 0,
            region: 'Historical Record',
            type: 'Historical EQ',
            year: year,
            decade: decade
        };
    });
}

/**
 * Process recent earthquake data from CSV
 * @param {Array} data - Raw CSV data
 * @param {Object} filters - Initial filter criteria
 * @param {number} requestId - Request ID for tracking
 */
function processRecentData(data, filters, requestId) {
    startTimer('processRecentData');
    
    // Skip processing if we already have the data cached
    if (dataCache.recent) {
        self.postMessage({
            action: 'processRecentDataComplete',
            processedData: dataCache.recent,
            usedCache: true,
            requestId
        });
        return;
    }
    
    try {
        // Process the data
        const processed = data.map(item => {
            // Create a standardized object from the CSV data
            let dateTime = null;
            try {
                const dateString = item.DateTime || '';
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    dateTime = date.getTime(); // Store as timestamp
                }
            } catch (e) {
                dateTime = null;
            }
            
            // Ensure magnitude and depth are numeric values
            const magnitude = parseFloat(item.Mag) || 0;
            const depth = parseFloat(item['Depth(Km)']) || 0;
            
            // Robust way to determine if earthquake was felt
            const typeField = item.Type || item.type;
            let wasFelt = false;
            
            if (typeField) {
                // Convert to string and normalize case
                const typeStr = String(typeField).trim().toUpperCase();
                wasFelt = typeStr === 'F' || typeStr.includes('FELT');
            }
            
            return {
                id: item.epiid ? String(item.epiid).replace(/^'|'$/g, '') : '',
                dateTime: dateTime,
                magnitude: magnitude,
                latitude: parseFloat(item.Lat) || 0,
                longitude: parseFloat(item.Long) || 0,
                depth: depth,
                region: item.Region || 'Unknown',
                type: typeField || 'Unknown',
                felt: wasFelt
            };
        }).filter(item => {
            // Filter out items with invalid coordinates or dates
            return item.latitude && item.longitude && item.dateTime;
        });
        
        // Cache the processed data
        dataCache.recent = processed;
        
        // Apply initial filtering based on provided filters
        let filtered = processed;
        if (filters) {
            filtered = filterRecentData(processed, filters);
        }
        
        const duration = endTimer('processRecentData');
        
        // Send processed data back to main thread
        self.postMessage({
            action: 'processRecentDataComplete',
            processedData: processed,
            filtered: filtered,
            dataLength: processed.length,
            filteredLength: filtered.length,
            duration,
            requestId
        });
    } catch (error) {
        self.postMessage({
            error: `Error processing recent data: ${error.message}`,
            stack: error.stack,
            requestId
        });
    }
}

/**
 * Build indices for historical data to optimize filtering
 * @param {Array} earthquakes - Processed earthquake data
 * @returns {Object} Indices for quick filtering
 */
function buildHistoricalIndices(earthquakes) {
    startTimer('buildHistoricalIndices');
    
    // Build indices for faster filtering
    const byYear = {};
    const byDecade = {};
    const byMagnitude = {};
    const byMagnitudeRange = {};
    
    // For spatial indexing - create a grid of 1x1 degree cells
    const spatial = {};
    
    earthquakes.forEach(quake => {
        // Index by year
        if (quake.year) {
            if (!byYear[quake.year]) {
                byYear[quake.year] = [];
            }
            byYear[quake.year].push(quake);
        }
        
        // Index by decade
        if (quake.decade) {
            if (!byDecade[quake.decade]) {
                byDecade[quake.decade] = [];
            }
            byDecade[quake.decade].push(quake);
        }
        
        // Index by magnitude (rounded to nearest integer)
        const roundedMag = Math.round(quake.magnitude);
        if (!byMagnitude[roundedMag]) {
            byMagnitude[roundedMag] = [];
        }
        byMagnitude[roundedMag].push(quake);
        
        // Index by magnitude range (0-2, 2-4, 4-6, 6+)
        let magRange;
        if (quake.magnitude < 2) magRange = '0-2';
        else if (quake.magnitude < 4) magRange = '2-4';
        else if (quake.magnitude < 6) magRange = '4-6';
        else magRange = '6+';
        
        if (!byMagnitudeRange[magRange]) {
            byMagnitudeRange[magRange] = [];
        }
        byMagnitudeRange[magRange].push(quake);
        
        // Spatial indexing - group by grid cell
        const latCell = Math.floor(quake.latitude);
        const lonCell = Math.floor(quake.longitude);
        const cellKey = `${latCell}:${lonCell}`;
        
        if (!spatial[cellKey]) {
            spatial[cellKey] = [];
        }
        spatial[cellKey].push(quake);
    });
    
    const duration = endTimer('buildHistoricalIndices');
    console.log(`Built indices in ${duration.toFixed(1)}ms`);
    
    return {
        byYear,
        byDecade,
        byMagnitude,
        byMagnitudeRange,
        spatial
    };
}

/**
 * Filter data based on provided criteria
 * @param {Array} data - Data array containing the dataset to filter
 * @param {Object} filters - Filter criteria
 * @param {Object} options - Additional options
 * @param {number} requestId - Request ID for tracking
 */
function filterData(data, filters, options, requestId) {
    startTimer('filterData');
    
    try {
        const { datasetType, dataId } = options || {};
        
        if (!datasetType) {
            throw new Error('Dataset type not specified for filtering');
        }
        
        let result;
        
        if (datasetType === 'historical') {
            // Use cached indices if available
            const indices = dataCache.indices;
            result = filterHistoricalData(data, filters, indices);
        } else {
            result = filterRecentData(data, filters);
        }
        
        const duration = endTimer('filterData');
        
        // Send filtered data back to main thread
        self.postMessage({
            action: 'filterDataComplete',
            filtered: result,
            datasetType,
            dataId,
            filters,
            filteredLength: result.length,
            duration,
            requestId
        });
    } catch (error) {
        self.postMessage({
            error: `Error filtering data: ${error.message}`,
            stack: error.stack,
            requestId
        });
    }
}

/**
 * Filter historical earthquakes based on provided criteria
 * @param {Array} earthquakes - Array of earthquake data
 * @param {Object} criteria - Filter criteria
 * @param {Object} indices - Data indices for efficient filtering
 * @returns {Array} Filtered earthquakes
 */
function filterHistoricalData(earthquakes, criteria, indices) {
    // Fast path using indices if available
    if (indices && criteria.yearRange && criteria.yearRange.length === 2) {
        const [minYear, maxYear] = criteria.yearRange;
        let filtered = [];
        
        // Check if we can use decade index for even faster filtering
        if (maxYear - minYear > 20) {
            // Use decade index for large ranges
            const minDecade = Math.floor(minYear / 10) * 10;
            const maxDecade = Math.floor(maxYear / 10) * 10;
            
            for (let decade = minDecade; decade <= maxDecade; decade += 10) {
                const decadeEarthquakes = indices.byDecade[decade] || [];
                
                if (decade === minDecade || decade === maxDecade) {
                    // For boundary decades, we need to filter by year
                    decadeEarthquakes.forEach(quake => {
                        if (quake.year >= minYear && quake.year <= maxYear &&
                            (!criteria.minMagnitude || quake.magnitude >= criteria.minMagnitude)) {
                            filtered.push(quake);
                        }
                    });
                } else {
                    // For full decades, just filter by magnitude
                    if (criteria.minMagnitude > 0) {
                        decadeEarthquakes.forEach(quake => {
                            if (quake.magnitude >= criteria.minMagnitude) {
                                filtered.push(quake);
                            }
                        });
                    } else {
                        filtered = filtered.concat(decadeEarthquakes);
                    }
                }
            }
        } else {
            // Use year index for smaller ranges
            for (let year = minYear; year <= maxYear; year++) {
                const yearEarthquakes = indices.byYear[year] || [];
                
                if (criteria.minMagnitude > 0) {
                    yearEarthquakes.forEach(quake => {
                        if (quake.magnitude >= criteria.minMagnitude) {
                            filtered.push(quake);
                        }
                    });
                } else {
                    filtered = filtered.concat(yearEarthquakes);
                }
            }
        }
        
        return filtered;
    }
    
    // Fallback to standard filtering if indices aren't available or criteria doesn't match
    return earthquakes.filter(quake => {
        // Magnitude filter
        if (criteria.minMagnitude && quake.magnitude < criteria.minMagnitude) {
            return false;
        }
        
        // Year range filter
        if (criteria.yearRange && quake.year) {
            const [minYear, maxYear] = criteria.yearRange;
            if (quake.year < minYear || quake.year > maxYear) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * Filter recent earthquakes based on provided criteria
 * @param {Array} earthquakes - Array of earthquake data
 * @param {Object} criteria - Filter criteria
 * @returns {Array} Filtered earthquakes
 */
function filterRecentData(earthquakes, criteria) {
    return earthquakes.filter(quake => {
        // Magnitude filter
        if (criteria.minMagnitude && quake.magnitude < criteria.minMagnitude) {
            return false;
        }
        
        // Time period filter
        if (criteria.timePeriod && criteria.timePeriod !== 'all' && quake.dateTime) {
            const now = Date.now();
            let cutoffDate;
            
            if (criteria.timePeriod === 'week') {
                cutoffDate = now - 7 * 24 * 60 * 60 * 1000;
            } else if (criteria.timePeriod === 'month') {
                cutoffDate = now - 30 * 24 * 60 * 60 * 1000;
            }
            
            if (cutoffDate && quake.dateTime < cutoffDate) {
                return false;
            }
        }
        
        // Felt filter
        if (criteria.feltOnly === true && quake.felt !== true) {
            return false;
        }
        
        return true;
    });
}

/**
 * Convert earthquake data objects to GeoJSON format
 * @param {Array} earthquakes - Array of earthquake data objects
 * @param {Object} options - Options for conversion
 * @param {number} requestId - Request ID for tracking
 */
function convertToGeoJSON(earthquakes, options, requestId) {
    startTimer('convertToGeoJSON');
    
    try {
        const { cacheKey, datasetType } = options || {};
        
        // Check if we have a cached version
        if (cacheKey && dataCache.geojson[cacheKey]) {
            self.postMessage({
                action: 'convertToGeoJSONComplete',
                geojson: dataCache.geojson[cacheKey],
                cacheKey,
                datasetType,
                usedCache: true,
                requestId
            });
            return;
        }
        
        // Create GeoJSON feature for each earthquake
        const features = [];
        
        // Process in chunks to avoid timeouts
        const chunkSize = 5000;
        const totalChunks = Math.ceil(earthquakes.length / chunkSize);
        
        for (let chunk = 0; chunk < totalChunks; chunk++) {
            const start = chunk * chunkSize;
            const end = Math.min(start + chunkSize, earthquakes.length);
            
            for (let i = start; i < end; i++) {
                const quake = earthquakes[i];
                
                // Safely handle dateTime - important fix for the toISOString error
                let dateTimeStr = '';
                if (quake.dateTime) {
                    try {
                        if (typeof quake.dateTime === 'object' && typeof quake.dateTime.toISOString === 'function') {
                            dateTimeStr = quake.dateTime.toISOString();
                        } else if (typeof quake.dateTime === 'number') {
                            // Convert timestamp to ISO string
                            dateTimeStr = new Date(quake.dateTime).toISOString();
                        } else {
                            // Fallback to string representation
                            dateTimeStr = String(quake.dateTime);
                        }
                    } catch (e) {
                        console.warn('Error converting dateTime to string:', e);
                        dateTimeStr = '';
                    }
                }
                
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [quake.longitude, quake.latitude]
                    },
                    properties: {
                        id: quake.id || '',
                        dateTime: dateTimeStr,
                        magnitude: quake.magnitude,
                        depth: quake.depth,
                        region: quake.region || 'Unknown',
                        type: quake.type || 'Unknown',
                        felt: quake.felt === true ? 'true' : 'false'
                    }
                });
            }
            
            // Send progress updates for large datasets
            if (earthquakes.length > 10000 && chunk % 2 === 0) {
                self.postMessage({
                    action: 'convertToGeoJSONProgress',
                    progress: Math.round((chunk + 1) * 100 / totalChunks),
                    requestId
                });
            }
        }
        
        // Create GeoJSON object
        const geojson = {
            type: 'FeatureCollection',
            features: features
        };
        
        // Cache the result if a key was provided
        if (cacheKey) {
            dataCache.geojson[cacheKey] = geojson;
            
            // Limit cache size
            const cacheKeys = Object.keys(dataCache.geojson);
            if (cacheKeys.length > 10) {
                // Remove oldest key
                delete dataCache.geojson[cacheKeys[0]];
            }
        }
        
        const duration = endTimer('convertToGeoJSON');
        
        // Send GeoJSON back to main thread
        self.postMessage({
            action: 'convertToGeoJSONComplete',
            geojson,
            cacheKey,
            datasetType,
            featureCount: features.length,
            duration,
            requestId
        });
    } catch (error) {
        self.postMessage({
            error: `Error converting to GeoJSON: ${error.message}`,
            stack: error.stack,
            requestId
        });
    }
}

// Helper function to log memory usage
function getMemoryUsage() {
    return {
        historicalData: dataCache.historical ? dataCache.historical.length : 0,
        recentData: dataCache.recent ? dataCache.recent.length : 0,
        geojsonCacheSize: Object.keys(dataCache.geojson).length,
        indices: dataCache.indices ? {
            yearKeys: dataCache.indices.byYear ? Object.keys(dataCache.indices.byYear).length : 0,
            decadeKeys: dataCache.indices.byDecade ? Object.keys(dataCache.indices.byDecade).length : 0,
            magnitudeKeys: dataCache.indices.byMagnitude ? Object.keys(dataCache.indices.byMagnitude).length : 0
        } : null
    };
}

// Periodically perform cleanup to manage memory
setInterval(() => {
    // Limit the size of the GeoJSON cache
    const geojsonKeys = Object.keys(dataCache.geojson);
    if (geojsonKeys.length > 5) {
        // Keep only the 5 most recent entries
        geojsonKeys.slice(0, geojsonKeys.length - 5).forEach(key => {
            delete dataCache.geojson[key];
        });
    }
    
    // Log memory usage
    console.log('Worker memory usage:', getMemoryUsage());
}, 60000); // Check every minute