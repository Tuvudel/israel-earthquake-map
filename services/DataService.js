/**
 * Data Service for the Earthquake Visualization App
 * Handles loading, processing, and filtering earthquake data
 */
import { config } from '../config.js';
import { stateManager } from '../state/StateManager.js';
import { filterEarthquakes, calculateStatistics } from '../utils/calculations.js';
import { showStatus, hideStatus, showLoading, hideLoading } from '../utils/domUtils.js';
import { mapService } from './MapService.js';

class DataService {
    constructor() {
        // Add data loading state tracking
        this.dataLoadingState = {
            recent: {
                inProgress: false,
                retryCount: 0,
                lastError: null
            },
            historical: {
                inProgress: false,
                retryCount: 0,
                lastError: null
            }
        };
        
        // Flag to prevent render loops
        this._preventRenderLoop = false;
        
        // Flag to track initial render
        this._initialRenderDone = false;
        
        // Maximum retry attempts
        this.maxRetries = 3;
    }
    
    /**
     * Load recent earthquake data from CSV
     * @param {boolean} [force=false] - Force reload even if already loaded
     * @returns {Promise} Promise that resolves when data is loaded
     */
    async loadRecentData(force = false) {
        // Prevent multiple simultaneous loading requests
        if (this.dataLoadingState.recent.inProgress) {
            console.log('Recent data loading already in progress, waiting...');
            return this._waitForDataLoad('recent');
        }
        
        // Check if we already have data loaded and not forcing a reload
        const state = stateManager.getState();
        if (state.dataLoaded.recent && !force) {
            console.log('Recent data already loaded, using cached data');
            return Promise.resolve();
        }
        
        this.dataLoadingState.recent.inProgress = true;
        showStatus("Loading recent earthquake data...");
        showLoading("Loading recent earthquake data...");
        
        try {
            const data = await this.fetchCsvData(config.urls.recentCsv);
            if (!data || data.length === 0) {
                throw new Error("No recent earthquake data returned");
            }
            
            const processedData = this.processRecentData(data);
            
            // Pre-filter the data with current filter settings
            const criteria = state.filters.recent;
            const filtered = filterEarthquakes(processedData, criteria);
            console.log(`Pre-filtered data: ${filtered.length} records match criteria`);
            
            // Update state with both raw and filtered data
            stateManager.setState({
                dataLoaded: {
                    ...state.dataLoaded,
                    recent: true
                },
                data: {
                    ...state.data,
                    recent: {
                        ...state.data.recent,
                        raw: processedData,
                        filtered: filtered,
                        displayed: filtered
                    }
                }
            });
            
            // Force a render to display initial data
            setTimeout(() => {
                if (state.activeDataset === 'recent' && !this._initialRenderDone) {
                    console.log('Forcing initial render after data load');
                    this._initialRenderDone = true;
                    mapService.renderData();
                }
            }, 50);
            
            hideStatus();
            hideLoading();
            this.dataLoadingState.recent.inProgress = false;
            
            return processedData;
        } catch (error) {
            console.error("Error loading recent data:", error);
            this.dataLoadingState.recent.lastError = error;
            this.dataLoadingState.recent.inProgress = false;
            
            // Retry logic for network errors
            if (this.dataLoadingState.recent.retryCount < this.maxRetries && 
                (error.message.includes('fetch') || error.message.includes('network'))) {
                
                this.dataLoadingState.recent.retryCount++;
                console.log(`Retrying recent data load (${this.dataLoadingState.recent.retryCount}/${this.maxRetries})...`);
                
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(this.loadRecentData(force));
                    }, 2000 * this.dataLoadingState.recent.retryCount); // Exponential backoff
                });
            }
            
            hideLoading();
            showStatus(`Failed to load recent earthquake data: ${error.message}. Please try refreshing the page.`, true);
            throw error;
        }
    }
    
    /**
     * Load historical earthquake data from CSV
     * @param {boolean} [force=false] - Force reload even if already loaded
     * @returns {Promise} Promise that resolves when data is loaded
     */
    async loadHistoricalData(force = false) {
        // Prevent multiple simultaneous loading requests
        if (this.dataLoadingState.historical.inProgress) {
            console.log('Historical data loading already in progress, waiting...');
            return this._waitForDataLoad('historical');
        }
        
        // Check if we already have data loaded and not forcing a reload
        const state = stateManager.getState();
        if (state.dataLoaded.historical && !force) {
            console.log('Historical data already loaded, using cached data');
            return Promise.resolve();
        }
        
        this.dataLoadingState.historical.inProgress = true;
        showStatus("Loading historical earthquake data (this may take a moment)...");
        showLoading("Loading historical earthquake data...");
        
        try {
            const data = await this.fetchCsvData(config.urls.historicalCsv);
            if (!data || data.length === 0) {
                throw new Error("No historical earthquake data returned");
            }
            
            const processedData = this.processHistoricalData(data);
            const indices = this.buildHistoricalIndices(processedData);
            
            // Pre-filter the data with current filter settings
            const criteria = state.filters.historical;
            let filtered = [];
            
            if (indices && indices.byYear && Object.keys(indices.byYear).length > 0) {
                // Use indices for faster filtering
                if (criteria.yearRange && criteria.yearRange.length === 2) {
                    const [minYear, maxYear] = criteria.yearRange;
                    
                    for (let year = minYear; year <= maxYear; year++) {
                        const quakesInYear = indices.byYear[year] || [];
                        
                        if (criteria.minMagnitude > 0) {
                            quakesInYear.forEach(quake => {
                                if (quake.magnitude >= criteria.minMagnitude) {
                                    filtered.push(quake);
                                }
                            });
                        } else {
                            filtered = filtered.concat(quakesInYear);
                        }
                    }
                }
            } else {
                filtered = filterEarthquakes(processedData, criteria);
            }
            
            console.log(`Pre-filtered historical data: ${filtered.length} records match criteria`);
            
            // Update state with both raw and filtered data
            stateManager.setState({
                dataLoaded: {
                    ...state.dataLoaded,
                    historical: true
                },
                historicalDataQueued: false, // Clear the queue flag
                data: {
                    ...state.data,
                    historical: {
                        ...state.data.historical,
                        raw: processedData,
                        filtered: filtered,
                        displayed: filtered,
                        indexed: indices
                    }
                }
            });
            
            // Force a render if we're on the historical tab
            if (state.activeDataset === 'historical') {
                setTimeout(() => {
                    console.log('Forcing initial render of historical data');
                    mapService.renderData();
                }, 50);
            }
            
            hideStatus();
            hideLoading();
            this.dataLoadingState.historical.inProgress = false;
            
            return processedData;
        } catch (error) {
            console.error("Error loading historical data:", error);
            this.dataLoadingState.historical.lastError = error;
            this.dataLoadingState.historical.inProgress = false;
            
            // Retry logic for network errors
            if (this.dataLoadingState.historical.retryCount < this.maxRetries &&
                (error.message.includes('fetch') || error.message.includes('network'))) {
                
                this.dataLoadingState.historical.retryCount++;
                console.log(`Retrying historical data load (${this.dataLoadingState.historical.retryCount}/${this.maxRetries})...`);
                
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(this.loadHistoricalData(force));
                    }, 2000 * this.dataLoadingState.historical.retryCount); // Exponential backoff
                });
            }
            
            hideLoading();
            showStatus(`Failed to load historical earthquake data: ${error.message}. Please try refreshing the page.`, true);
            throw error;
        }
    }
    
    /**
     * Wait for an in-progress data load to complete
     * @private
     * @param {string} dataType - Type of data to wait for ('recent' or 'historical')
     * @returns {Promise} Promise that resolves when data is loaded
     */
    _waitForDataLoad(dataType) {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (!this.dataLoadingState[dataType].inProgress) {
                    clearInterval(checkInterval);
                    
                    const state = stateManager.getState();
                    if (state.dataLoaded[dataType]) {
                        resolve();
                    } else {
                        reject(this.dataLoadingState[dataType].lastError || 
                               new Error(`Failed to load ${dataType} data`));
                    }
                }
            }, 200);
            
            // Set a timeout to prevent infinite waiting
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error(`Timeout waiting for ${dataType} data load to complete`));
            }, 30000); // 30 second timeout
        });
    }
    
    /**
     * Fetch and parse CSV data
     * @private
     * @param {string} url - URL of the CSV file
     * @returns {Promise} Promise that resolves with parsed CSV data
     */
    async fetchCsvData(url) {
        try {
            console.log(`Fetching data from ${url}...`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
            }
            
            const csvText = await response.text();
            console.log(`Fetched CSV data from ${url}, length: ${csvText.length} bytes`);
            
            if (!csvText || csvText.trim().length === 0) {
                throw new Error('Empty CSV response received');
            }
            
            // Log a small sample of the CSV data to help with debugging
            const firstLines = csvText.split('\n').slice(0, 3).join('\n');
            console.log('CSV data preview:', firstLines);
            
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
                    // Add improved CSV parsing settings
                    delimiter: ',', // Explicit delimiter
                    delimitersToGuess: [',', '\t', '|'], // Try these if delimiter is unknown
                    comments: '#', // Ignore comments
                    complete: results => {
                        if (results.errors && results.errors.length > 0) {
                            // Log all parsing errors for diagnosis
                            console.warn('CSV parsing warnings:', results.errors);
                            
                            // Check if errors are critical
                            const criticalErrors = results.errors.filter(
                                err => err.type !== 'FieldMismatch' && err.type !== 'Delimiter'
                            );
                            
                            if (criticalErrors.length > 0) {
                                reject(new Error(`CSV parsing error: ${criticalErrors[0].message}`));
                                return;
                            }
                        }
                        
                        if (!results.data || results.data.length === 0) {
                            reject(new Error('No data found in CSV'));
                            return;
                        }
                        
                        // Log some diagnostic information about the parsed data
                        console.log('Parsed CSV headers:', results.meta.fields);
                        console.log('First parsed record:', results.data[0]);
                        console.log(`Total records parsed: ${results.data.length}`);
                        
                        resolve(results.data);
                    },
                    error: error => {
                        console.error('CSV parsing error:', error);
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
                const dateString = item.DateTime || '';
                dateTime = new Date(dateString);
                
                // Validate date
                if (isNaN(dateTime.getTime())) {
                    console.warn('Invalid date:', dateString, 'for record:', item);
                    dateTime = null;
                }
            } catch (e) {
                console.warn('Date parsing error:', e, 'for record:', item);
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
            const valid = item.latitude && item.longitude && item.dateTime;
            if (!valid) {
                console.warn('Filtering out invalid record:', item);
            }
            return valid;
        });
        
        // Count felt earthquakes for debugging
        const feltCount = processed.filter(quake => quake.felt === true).length;
        console.log(`Processed ${processed.length} recent earthquake records, ${feltCount} are marked as felt`);
        
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
                            console.warn('Invalid date created from:', item.Date, item.Time);
                            dateTime = null;
                        }
                    }
                } catch (e) {
                    console.warn('Date parsing error:', e, 'for record:', item);
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
            // Filter out items with invalid coordinates, dates, or suspicious values
            return item.latitude && 
                   item.longitude && 
                   item.dateTime && 
                   !isNaN(item.dateTime.getTime()) &&
                   item.magnitude >= 0;
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
        console.time('buildHistoricalIndices');
        
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
        
        console.timeEnd('buildHistoricalIndices');
        console.log('Year index created with entries:', Object.keys(byYear).length);
        console.log('Magnitude index created with entries:', Object.keys(byMagnitude).length);
        
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
        
        // Force a map render to ensure data is displayed initially
        if (typeof mapService?.renderData === 'function' && 
            state.activeDataset === 'recent' && 
            !this._initialRenderDone) {
            
            console.log('Forcing initial render of recent data');
            this._initialRenderDone = true;
            
            // Small delay to allow state to update
            setTimeout(() => {
                mapService.renderData();
            }, 100);
        }
        
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
        
        // Trigger a map render if we're in historical mode - but use a flag to prevent loops
        if (state.activeDataset === 'historical' && typeof mapService?.renderData === 'function' && !this._preventRenderLoop) {
            // Set flag to prevent loops
            this._preventRenderLoop = true;
            
            setTimeout(() => {
                try {
                    console.log('Triggering map render after historical filters applied');
                    mapService.renderData();
                } catch (error) {
                    console.warn('Could not trigger map render:', error);
                } finally {
                    // Reset flag after a delay
                    setTimeout(() => {
                        this._preventRenderLoop = false;
                    }, 500);
                }
            }, 0);
        }
        
        console.log(`Applied filters: ${filtered.length} historical earthquakes match criteria}`);
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
     * Ensure displayed data is populated for the given dataset
     * @param {string} datasetType - Type of dataset ('recent' or 'historical')
     */
    ensureDisplayedData(datasetType) {
        const state = stateManager.getState();
        
        // If filtered data exists but displayed data is empty, copy filtered to displayed
        if (state.data[datasetType].filtered && 
            state.data[datasetType].filtered.length > 0 &&
            (!state.data[datasetType].displayed || state.data[datasetType].displayed.length === 0)) {
            
            stateManager.setState({
                data: {
                    [datasetType]: {
                        displayed: state.data[datasetType].filtered
                    }
                }
            });
            
            console.log(`Populated displayed data for ${datasetType} with ${state.data[datasetType].filtered.length} records`);
        }
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