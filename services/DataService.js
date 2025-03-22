/**
 * Data Service for the Earthquake Visualization App
 * Handles loading, processing, and filtering earthquake data
 */
import { config } from '../config.js';
import { stateManager } from '../state/StateManager.js';
import { filterEarthquakes, calculateStatistics } from '../utils/calculations.js';
import { showStatus, hideStatus } from '../utils/domUtils.js';

class DataService {
    /**
     * Load recent earthquake data from CSV
     * @returns {Promise} Promise that resolves when data is loaded
     */
    async loadRecentData() {
        // Check if we already have data loaded
        const state = stateManager.getState();
        if (state.dataLoaded.recent) {
            return Promise.resolve();
        }
        
        showStatus("Loading recent earthquake data...");
        
        try {
            const data = await this.fetchCsvData(config.urls.recentCsv);
            const processedData = this.processRecentData(data);
            
            // Update state with the raw data
            stateManager.setState({
                dataLoaded: {
                    ...state.dataLoaded,
                    recent: true
                },
                data: {
                    ...state.data,
                    recent: {
                        ...state.data.recent,
                        raw: processedData
                    }
                }
            });
            
            // Apply filters to get filtered data
            this.applyFilters();
            hideStatus();
            
            return processedData;
        } catch (error) {
            console.error("Error loading recent data:", error);
            showStatus(`Failed to load recent earthquake data: ${error.message}`, true);
            throw error;
        }
    }
    
    /**
     * Load historical earthquake data from CSV
     * @returns {Promise} Promise that resolves when data is loaded
     */
    async loadHistoricalData() {
        // Check if we already have data loaded
        const state = stateManager.getState();
        if (state.dataLoaded.historical) {
            return Promise.resolve();
        }
        
        showStatus("Loading historical earthquake data (this may take a moment)...");
        
        try {
            const data = await this.fetchCsvData(config.urls.historicalCsv);
            const processedData = this.processHistoricalData(data);
            
            // Update state with the raw data
            stateManager.setState({
                dataLoaded: {
                    ...state.dataLoaded,
                    historical: true
                },
                data: {
                    ...state.data,
                    historical: {
                        ...state.data.historical,
                        raw: processedData,
                        indexed: this.buildHistoricalIndices(processedData)
                    }
                }
            });
            
            // Apply filters to get filtered data
            this.applyFilters();
            hideStatus();
            
            return processedData;
        } catch (error) {
            console.error("Error loading historical data:", error);
            showStatus(`Failed to load historical earthquake data: ${error.message}`, true);
            throw error;
        }
    }
    
    /**
     * Fetch and parse CSV data
     * @private
     * @param {string} url - URL of the CSV file
     * @returns {Promise} Promise that resolves with parsed CSV data
     */
    async fetchCsvData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
            }
            
            const csvText = await response.text();
            console.log(`Fetched CSV data from ${url}, length: ${csvText.length} bytes`);
            
            return new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    transformHeader: header => header.trim(), // Trim whitespace from headers
                    transform: (value, field) => {
                        // Ensure consistent case for the Type field
                        if (field === 'Type' || field === 'type') {
                            return String(value || '').trim();
                        }
                        return value;
                    },
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
            });
        } catch (error) {
            console.error("Error fetching CSV data:", error);
            throw error;
        }
    }
    
    /**
     * Process recent earthquake data from CSV
     * @private
     * @param {Array} data - Raw CSV data
     * @returns {Array} Processed earthquake data
     */
    processRecentData(data) {
        // Log some sample data to help debug
        console.log('Raw CSV data keys (first record):', data.length > 0 ? Object.keys(data[0]) : 'No data');
        
        const processed = data.map(item => {
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
            
            // Robust way to determine if earthquake was felt
            // Make sure we check both "Type" and "type" and handle case sensitivity
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
        
        console.log(`Processed ${processed.length} recent earthquake records`);
        return processed;
    }
    
    /**
     * Process historical earthquake data from CSV
     * @private
     * @param {Array} data - Raw CSV data
     * @returns {Array} Processed earthquake data
     */
    processHistoricalData(data) {
        console.time('processHistoricalData');
        
        const processed = data.map(item => {
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
        
        console.timeEnd('processHistoricalData');
        console.log(`Processed ${processed.length} historical earthquake records`);
        
        return processed;
    }
    
    /**
     * Build indices for historical data to optimize filtering
     * @private
     * @param {Array} earthquakes - Processed earthquake data
     * @returns {Object} Indices for quick filtering
     */
    buildHistoricalIndices(earthquakes) {
        // Build indices for faster filtering
        const byYear = {};
        const byMagnitude = {};
        
        earthquakes.forEach(quake => {
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
        
        return {
            byYear,
            byMagnitude,
            spatial: null // For future use with spatial indexing
        };
    }
    
    /**
     * Apply current filters to the active dataset
     */
    applyFilters() {
        const state = stateManager.getState();
        const activeDataset = state.activeDataset;
        
        if (activeDataset === 'recent') {
            this.applyRecentFilters();
        } else {
            this.applyHistoricalFilters();
        }
    }
    
    /**
     * Apply filters to recent earthquake data
     * @private
     */
    applyRecentFilters() {
        const state = stateManager.getState();
        const rawData = state.data.recent.raw;
        const criteria = state.filters.recent;
        
        if (!rawData || rawData.length === 0) {
            console.warn('No recent data to filter');
            return;
        }
        
        console.log(`Applying recent filters: minMag=${criteria.minMagnitude}, timePeriod=${criteria.timePeriod}, feltOnly=${criteria.feltOnly}`);
        
        // Apply filters
        const filtered = filterEarthquakes(rawData, criteria);
        
        // Calculate statistics for the filtered data
        const stats = calculateStatistics(filtered);
        
        // Update state with filtered data and statistics
        stateManager.setState({
            data: {
                ...state.data,
                recent: {
                    ...state.data.recent,
                    filtered,
                    displayed: filtered
                }
            }
        });
        
        console.log(`Applied filters: ${filtered.length} recent earthquakes match criteria`);
    }
    
    /**
     * Apply filters to historical earthquake data
     * @private
     */
    applyHistoricalFilters() {
        const state = stateManager.getState();
        const rawData = state.data.historical.raw;
        const criteria = state.filters.historical;
        
        if (!rawData || rawData.length === 0) {
            console.warn('No historical data to filter');
            return;
        }
        
        console.log(`Applying historical filters: minMag=${criteria.minMagnitude}, yearRange=${criteria.yearRange}`);
        
        // Use indexed data for faster filtering if available
        let filtered = [];
        const indices = state.data.historical.indexed;
        
        if (indices && indices.byYear && Object.keys(indices.byYear).length > 0) {
            // Optimization: Use year index to quickly get earthquakes in the year range
            if (criteria.yearRange && criteria.yearRange.length === 2) {
                const [minYear, maxYear] = criteria.yearRange;
                
                // Loop through years in our range
                for (let year = minYear; year <= maxYear; year++) {
                    const quakesInYear = indices.byYear[year] || [];
                    
                    // If we also have a magnitude filter, apply it
                    if (criteria.minMagnitude > 0) {
                        quakesInYear.forEach(quake => {
                            if (quake.magnitude >= criteria.minMagnitude) {
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
            filtered = filterEarthquakes(rawData, criteria);
        }
        
        // Calculate statistics with year range
        const stats = calculateStatistics(filtered, criteria.yearRange);
        
        // Update state with filtered data
        stateManager.setState({
            data: {
                ...state.data,
                historical: {
                    ...state.data.historical,
                    filtered,
                    displayed: filtered
                }
            }
        });
        
        console.log(`Applied filters: ${filtered.length} historical earthquakes match criteria`);
    }
    
    /**
     * Get current statistics for displayed data
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const state = stateManager.getState();
        const activeDataset = state.activeDataset;
        let earthquakes, yearRange;
        
        if (activeDataset === 'recent') {
            earthquakes = state.data.recent.filtered;
            yearRange = null;
        } else {
            earthquakes = state.data.historical.filtered;
            yearRange = state.filters.historical.yearRange;
        }
        
        return calculateStatistics(earthquakes, yearRange);
    }
    
    /**
     * Update the last updated time display
     */
    updateLastUpdatedTime() {
        const lastUpdatedElement = document.getElementById('last-updated');
        if (lastUpdatedElement) {
            const now = new Date();
            lastUpdatedElement.textContent = now.toLocaleString();
        }
    }
}

// Create and export a singleton instance
export const dataService = new DataService();