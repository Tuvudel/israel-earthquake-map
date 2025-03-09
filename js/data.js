/**
 * Data management module for the Earthquake Visualization App
 * Handles loading, processing, and filtering earthquake data
 */

// Define DataManager in the global scope immediately
window.DataManager = {};

// Then implement its functionality
(function(exports) {
    /**
     * Load recent earthquake data from CSV
     * @returns {Promise} Promise that resolves when data is loaded
     */
    function loadRecentData() {
        if (AppState.dataLoaded.recent) {
            return Promise.resolve();
        }
        
        Utils.showStatus("Loading recent earthquake data...");
        
        return fetchCsvData(CONFIG.urls.recentCsv)
            .then(data => {
                processRecentData(data);
                AppState.dataLoaded.recent = true;
                applyFilters();
                Utils.hideStatus();
            })
            .catch(error => {
                console.error("Error loading recent data:", error);
                Utils.showStatus(`Failed to load recent earthquake data: ${error.message}`, true);
                throw error;
            });
    }
    
    /**
     * Load historical earthquake data from CSV
     * @returns {Promise} Promise that resolves when data is loaded
     */
    function loadHistoricalData() {
        if (AppState.dataLoaded.historical) {
            return Promise.resolve();
        }
        
        Utils.showStatus("Loading historical earthquake data (this may take a moment)...");
        
        return fetchCsvData(CONFIG.urls.historicalCsv)
            .then(data => {
                processHistoricalData(data);
                AppState.dataLoaded.historical = true;
                applyFilters();
                Utils.hideStatus();
            })
            .catch(error => {
                console.error("Error loading historical data:", error);
                Utils.showStatus(`Failed to load historical earthquake data: ${error.message}`, true);
                throw error;
            });
    }
    
    /**
     * Fetch and parse CSV data
     * @private
     * @param {string} url - URL of the CSV file
     * @returns {Promise} Promise that resolves with parsed CSV data
     */
    function fetchCsvData(url) {
        return new Promise((resolve, reject) => {
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(csvText => {
                    Papa.parse(csvText, {
                        header: true,
                        dynamicTyping: true,
                        skipEmptyLines: true,
                        complete: results => {
                            if (results.errors && results.errors.length > 0) {
                                console.warn('CSV parsing warnings:', results.errors);
                            }
                            resolve(results.data);
                        },
                        error: error => {
                            reject(new Error(`CSV parsing error: ${error.message}`));
                        }
                    });
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
    
    /**
     * Process recent earthquake data from CSV
     * @private
     * @param {Array} data - Raw CSV data
     */
    function processRecentData(data) {
        AppState.data.recent.raw = data.map(item => {
            // Create a standardized object from the CSV data
            let dateTime = null;
            try {
                dateTime = new Date(item.DateTime || '');
                if (isNaN(dateTime.getTime())) {
                    throw new Error('Invalid date');
                }
            } catch (e) {
                console.warn('Invalid date for record:', item);
                dateTime = null;
            }
            
            // Ensure magnitude and depth are numeric values
            const magnitude = parseFloat(item.Mag) || 0;
            const depth = parseFloat(item['Depth(Km)']) || 0;
            
            // Determine if earthquake was felt
            // Type 'F' indicates a felt earthquake
            const wasFelt = item.Type === 'F';
            
            return {
                id: item.epiid ? String(item.epiid).replace(/^'|'$/g, '') : '',
                dateTime: dateTime,
                magnitude: magnitude,
                latitude: parseFloat(item.Lat) || 0,
                longitude: parseFloat(item.Long) || 0,
                depth: depth,
                region: item.Region || 'Unknown',
                type: item.Type || 'Unknown',
                felt: wasFelt
            };
        }).filter(item => {
            // Filter out items with invalid coordinates or dates
            return item.latitude && item.longitude && item.dateTime;
        });
        
        console.log(`Processed ${AppState.data.recent.raw.length} recent earthquake records`);
        // Log a sample record to help with debugging
        if (AppState.data.recent.raw.length > 0) {
            console.log('Sample recent earthquake record:', AppState.data.recent.raw[0]);
        }
    }
    
    /**
     * Process historical earthquake data from CSV
     * @private
     * @param {Array} data - Raw CSV data
     */
    function processHistoricalData(data) {
        console.time('processHistoricalData');
        
        // Process the raw data
        AppState.data.historical.raw = data.map(item => {
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
                        
                        // Create date (months are 0-indexed in JavaScript)
                        dateTime = new Date(year, month - 1, day, hours, minutes, Math.floor(seconds));
                        
                        // Validate date
                        if (isNaN(dateTime.getTime())) {
                            dateTime = null;
                        }
                    }
                } catch (e) {
                    console.warn('Date parsing error:', e, 'for record:', item);
                    dateTime = null;
                }
            }
            
            // Get the best magnitude value from multiple possibilities
            let magnitude = null;
            if (item.M !== null && item.M !== undefined && item.M > -900) {
                magnitude = item.M;
            } else if (item.mb !== null && item.mb !== undefined && item.mb > -900) {
                magnitude = item.mb;
            } else if (item.ms !== null && item.ms !== undefined && item.ms > -900) {
                magnitude = item.ms;
            } else if (item.ml !== null && item.ml !== undefined && item.ml > -900) {
                magnitude = item.ml;
            } else {
                magnitude = 0;
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
                // Add year as a property for faster filtering
                year: dateTime ? dateTime.getFullYear() : null,
                // Add a rendered flag for optimization
                rendered: false
            };
        }).filter(item => {
            // Filter out items with invalid coordinates or dates
            return item.latitude && item.longitude && item.dateTime && !isNaN(item.dateTime.getTime());
        });
        
        // Build indices for faster filtering
        const byYear = {};
        const byMagnitude = {};
        
        AppState.data.historical.raw.forEach(quake => {
            // Index by year
            if (quake.year) {
                if (!byYear[quake.year]) {
                    byYear[quake.year] = [];
                }
                byYear[quake.year].push(quake);
            }
            
            // Index by magnitude (rounded to nearest integer)
            const roundedMag = Math.round(quake.magnitude);
            if (!byMagnitude[roundedMag]) {
                byMagnitude[roundedMag] = [];
            }
            byMagnitude[roundedMag].push(quake);
        });
        
        // Store the indices
        AppState.data.historical.indexed.byYear = byYear;
        AppState.data.historical.indexed.byMagnitude = byMagnitude;
        
        console.log(`Processed ${AppState.data.historical.raw.length} historical earthquake records`);
        console.log('Year index created with entries:', Object.keys(byYear).length);
        console.log('Magnitude index created with entries:', Object.keys(byMagnitude).length);
        
        console.timeEnd('processHistoricalData');
    }
    
    /**
     * Apply current filters to the active dataset
     */
    function applyFilters() {
        if (AppState.activeDataset === 'recent') {
            applyRecentFilters();
        } else {
            applyHistoricalFilters();
        }
    }
    
    /**
     * Apply filters to recent earthquake data
     */
    function applyRecentFilters() {
        const { minMagnitude, timePeriod, feltOnly } = AppState.filters.recent;
        
        // Start with all data
        let filtered = [...AppState.data.recent.raw];
        
        // Apply magnitude filter
        if (minMagnitude > 0) {
            filtered = filtered.filter(quake => quake.magnitude >= minMagnitude);
        }
        
        // Apply felt filter
        if (feltOnly) {
            filtered = filtered.filter(quake => quake.felt === true);
        }
        
        // Apply time period filter
        if (timePeriod !== 'all') {
            const now = new Date();
            let cutoffDate;
            
            if (timePeriod === 'week') {
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (timePeriod === 'month') {
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
            
            if (cutoffDate) {
                filtered = filtered.filter(quake => quake.dateTime >= cutoffDate);
            }
        }
        
        AppState.data.recent.filtered = filtered;
        console.log(`Applied filters: ${filtered.length} recent earthquakes match criteria`);
    }
    
    /**
     * Apply filters to historical earthquake data
     */
    function applyHistoricalFilters() {
        console.time('applyHistoricalFilters');
        
        const { minMagnitude, yearRange } = AppState.filters.historical;
        let filtered = [];
        
        // Use indexed data for faster filtering
        if (AppState.data.historical.indexed.byYear && Object.keys(AppState.data.historical.indexed.byYear).length > 0) {
            // Optimization: Use year index to quickly get earthquakes in the year range
            if (yearRange && yearRange.length === 2) {
                const [minYear, maxYear] = yearRange;
                
                // Only loop through the years in our range
                for (let year = minYear; year <= maxYear; year++) {
                    const quakesInYear = AppState.data.historical.indexed.byYear[year] || [];
                    
                    // If we also have a magnitude filter, apply it
                    if (minMagnitude > 0) {
                        quakesInYear.forEach(quake => {
                            if (quake.magnitude >= minMagnitude) {
                                filtered.push(quake);
                            }
                        });
                    } else {
                        // No magnitude filter, add all quakes for this year
                        filtered = filtered.concat(quakesInYear);
                    }
                }
            }
        } else {
            // Fallback to standard filtering if indices aren't available
            filtered = [...AppState.data.historical.raw];
            
            // Apply magnitude filter
            if (minMagnitude > 0) {
                filtered = filtered.filter(quake => quake.magnitude >= minMagnitude);
            }
            
            // Apply year range filter
            if (yearRange && yearRange.length === 2) {
                const [minYear, maxYear] = yearRange;
                filtered = filtered.filter(quake => {
                    if (quake.year) {
                        return quake.year >= minYear && quake.year <= maxYear;
                    }
                    return false;
                });
            }
        }
        
        AppState.data.historical.filtered = filtered;
        
        // Apply adaptive sampling only if not using clustering
        if (AppState.renderMode.historical !== 'cluster') {
            applyAdaptiveSampling();
            console.log(`After sampling: ${AppState.data.historical.displayed.length} earthquakes will be displayed`);
        } else {
            // When clustering, we can use all data points - clustering handles performance
            AppState.data.historical.displayed = filtered;
            console.log(`Using all ${filtered.length} earthquakes with clustering`);
        }
        
        console.log(`Applied filters: ${filtered.length} historical earthquakes match criteria`);
        console.timeEnd('applyHistoricalFilters');
    }
    
    /**
     * Apply adaptive sampling to reduce the number of points based on zoom level
     */
    function applyAdaptiveSampling() {
        console.time('applyAdaptiveSampling');
        
        const { filtered } = AppState.data.historical;
        const currentZoom = AppState.currentZoom;
        
        // Find the appropriate sample rate for the current zoom level
        let sampleRate = 1.0; // Default: show all points
        
        for (let i = 0; i < CONFIG.render.sampling.zoomThresholds.length; i++) {
            const threshold = CONFIG.render.sampling.zoomThresholds[i];
            if (currentZoom <= threshold.zoom) {
                sampleRate = threshold.sampleRate;
                break;
            }
        }
        
        // If we're showing everything, no need for sampling
        if (sampleRate >= 1.0) {
            AppState.data.historical.displayed = filtered;
            console.timeEnd('applyAdaptiveSampling');
            return;
        }
        
        // Determine how many points to show
        const totalPoints = filtered.length;
        const pointsToShow = Math.max(1, Math.floor(totalPoints * sampleRate));
        
        let sampled;
        
        if (CONFIG.render.sampling.prioritizeByCriteria) {
            // Sort by magnitude (descending) so we prioritize larger earthquakes
            sampled = [...filtered].sort((a, b) => b.magnitude - a.magnitude);
            // Take the top N points
            sampled = sampled.slice(0, pointsToShow);
        } else {
            // Random sampling (using reservoir sampling algorithm)
            sampled = [];
            
            // Always include first N points
            for (let i = 0; i < pointsToShow && i < totalPoints; i++) {
                sampled.push(filtered[i]);
            }
            
            // For each remaining point, randomly decide if it should replace an existing one
            for (let i = pointsToShow; i < totalPoints; i++) {
                const j = Math.floor(Math.random() * (i + 1));
                if (j < pointsToShow) {
                    sampled[j] = filtered[i];
                }
            }
        }
        
        // Filter points to only those in current viewport if we're working with a large dataset
        if (AppState.viewportBounds && filtered.length > 1000) {
            sampled = sampled.filter(quake => 
                AppState.viewportBounds.contains([quake.latitude, quake.longitude])
            );
        }
        
        AppState.data.historical.displayed = sampled;
        console.timeEnd('applyAdaptiveSampling');
    }
    
    /**
     * Get the currently filtered dataset based on active mode
     * @returns {Array} Filtered earthquake data
     */
    function getCurrentFilteredData() {
        if (AppState.activeDataset === 'recent') {
            return AppState.data.recent.filtered;
        } else {
            // For historical data, return the subsampled/displayed data
            return AppState.data.historical.displayed;
        }
    }
    
    /**
     * Get statistics about the current filtered data
     * @returns {Object} Statistics object
     */
    function getStatistics() {
        const isHistorical = AppState.activeDataset === 'historical';
        
        // For historical mode, we need to show two counts: filtered and displayed
        if (isHistorical) {
            const filteredCount = AppState.data.historical.filtered.length;
            const displayedCount = AppState.data.historical.displayed.length;
            
            // Determine which data set to use for statistics
            // When using clustering, we should use the complete filtered dataset
            // otherwise use the displayed (sampled) dataset
            const useFilteredForStats = AppState.renderMode.historical === 'cluster';
            const earthquakes = useFilteredForStats ? 
                AppState.data.historical.filtered : 
                AppState.data.historical.displayed;
            
            const dataCount = earthquakes.length;
            let avgMagnitude = 0;
            let maxMagnitude = 0;
            let avgDepth = 0;
            let avgPerYear = 0;
            let maxMagnitudeEarthquake = null; // Store the earthquake with max magnitude
            
            if (dataCount > 0) {
                // Calculate average and max magnitude with optimized approach
                let totalMagnitude = 0;
                let totalDepth = 0;
                maxMagnitude = earthquakes[0].magnitude;
                maxMagnitudeEarthquake = earthquakes[0]; // Initialize with first earthquake
                
                for (let i = 0; i < dataCount; i++) {
                    const quake = earthquakes[i];
                    const mag = parseFloat(quake.magnitude) || 0;
                    const depth = parseFloat(quake.depth) || 0;
                    totalMagnitude += mag;
                    totalDepth += depth;
                    if (mag > maxMagnitude) {
                        maxMagnitude = mag;
                        maxMagnitudeEarthquake = quake; // Update max magnitude earthquake
                    }
                }
                
                avgMagnitude = totalMagnitude / dataCount;
                avgDepth = totalDepth / dataCount;
                
                // Calculate earthquakes per year
                if (AppState.filters.historical.yearRange) {
                    const [minYear, maxYear] = AppState.filters.historical.yearRange;
                    const yearSpan = maxYear - minYear + 1; // +1 because range is inclusive
                    avgPerYear = filteredCount / yearSpan; // Always use filtered count for yearly average
                }
            }
            
            return {
                count: displayedCount,
                totalCount: filteredCount,
                avgMagnitude,
                maxMagnitude,
                avgDepth,
                avgPerYear,
                yearRange: AppState.filters.historical.yearRange,
                maxMagnitudeEarthquake // Add earthquake object with max magnitude
            };
        } else {
            // For recent data, simpler statistics
            const earthquakes = AppState.data.recent.filtered;
            const count = earthquakes.length;
            
            let avgMagnitude = 0;
            let maxMagnitude = 0;
            let avgDepth = 0;
            let maxMagnitudeEarthquake = null; // Store the earthquake with max magnitude
            // For recent data, earthquakes per year doesn't make sense
            let avgPerYear = null;
            
            if (count > 0) {
                // Log first few records for debugging
                console.log(`Recent data statistics calculation. First 2 records:`, 
                    earthquakes.slice(0, 2));
                
                let totalMagnitude = 0;
                let totalDepth = 0;
                maxMagnitude = 0;
                
                // More explicit calculation to avoid potential issues
                for (let i = 0; i < count; i++) {
                    const quake = earthquakes[i];
                    // Make sure values are numeric
                    const mag = parseFloat(quake.magnitude) || 0;
                    const depth = parseFloat(quake.depth) || 0;
                    
                    totalMagnitude += mag;
                    totalDepth += depth;
                    
                    if (mag > maxMagnitude) {
                        maxMagnitude = mag;
                        maxMagnitudeEarthquake = quake; // Update max magnitude earthquake
                    }
                }
                
                avgMagnitude = totalMagnitude / count;
                avgDepth = totalDepth / count;
                
                // Safety check for NaN values
                if (isNaN(avgMagnitude)) avgMagnitude = 0;
                if (isNaN(avgDepth)) avgDepth = 0;
                if (isNaN(maxMagnitude)) maxMagnitude = 0;
                
                console.log(`Recent statistics calculated: `, {
                    totalMagnitude,
                    avgMagnitude,
                    totalDepth,
                    avgDepth,
                    maxMagnitude
                });
            }
            
            return {
                count,
                totalCount: count,
                avgMagnitude,
                maxMagnitude,
                avgDepth,
                avgPerYear,
                yearRange: null,
                maxMagnitudeEarthquake // Add earthquake object with max magnitude
            };
        }
    }
    
    /**
     * Update the last updated time in footer
     */
    function updateLastUpdatedTime() {
        const now = new Date();
        document.getElementById('last-updated').textContent = now.toLocaleString();
    }
    
    // Assign methods to the existing DataManager object
    exports.loadRecentData = loadRecentData;
    exports.loadHistoricalData = loadHistoricalData;
    exports.applyFilters = applyFilters;
    exports.getCurrentFilteredData = getCurrentFilteredData;
    exports.getStatistics = getStatistics;
    exports.updateLastUpdatedTime = updateLastUpdatedTime;
    
})(window.DataManager);

// Signal that DataManager is fully loaded
console.log('DataManager module loaded and initialized');