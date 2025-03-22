/**
 * Data Service for the Earthquake Visualization App
 * Handles loading, processing, and filtering earthquake data
 */
import { config } from '../config.js';
import { stateManager } from '../state/StateManager.js';
import { calculateStatistics } from '../utils/calculations.js';
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
        
        // Cache for GeoJSON conversions
        this.geojsonCache = new Map();
        
        // Web worker for data processing
        this.worker = null;
        this.workerReady = false;
        this.pendingWorkerTasks = [];
        
        // Initialize the web worker
        this._initializeWorker();
        
        // Debounce timeouts
        this.filterDebounceTimeout = null;
        this.renderDebounceTimeout = null;
        
        // Next request IDs for tracking async operations
        this.nextRequestId = 1;
        this.pendingRequests = new Map();
        
        // Performance timers
        this.perfTimers = {};
    }
    
    /**
     * Initialize the web worker for data processing
     * @private
     */
    _initializeWorker() {
        try {
            this.worker = new Worker('./workers/dataProcessor.js');
            
            // Set up message handler for worker responses
            this.worker.onmessage = (e) => this._handleWorkerMessage(e);
            
            // Handle worker errors
            this.worker.onerror = (error) => {
                console.error('Web worker error:', error);
                this.workerReady = false;
                
                // Fall back to synchronous processing
                this._processQueuedTasks();
            };
            
            this.workerReady = true;
            console.log('Data processing worker initialized');
            
            // Process any tasks that were queued before the worker was ready
            this._processQueuedTasks();
        } catch (error) {
            console.error('Failed to initialize web worker:', error);
            this.workerReady = false;
            
            // Fall back to synchronous processing
            this._processQueuedTasks();
        }
    }
    
    /**
     * Start a performance timer
     * @private
     * @param {string} name - Timer name
     */
    _startTimer(name) {
        if (this.perfTimers[name]) {
            console.warn(`Timer '${name}' already exists`);
            return;
        }
        this.perfTimers[name] = performance.now();
    }
    
    /**
     * End a performance timer and return duration
     * @private
     * @param {string} name - Timer name
     * @returns {number} Duration in ms
     */
    _endTimer(name) {
        if (!this.perfTimers[name]) {
            console.warn(`Timer '${name}' does not exist`);
            return 0;
        }
        const duration = performance.now() - this.perfTimers[name];
        delete this.perfTimers[name];
        return duration;
    }
    
    /**
     * Process tasks that were queued before the worker was ready
     * @private
     */
    _processQueuedTasks() {
        if (this.pendingWorkerTasks.length > 0) {
            console.log(`Processing ${this.pendingWorkerTasks.length} queued worker tasks`);
            
            while (this.pendingWorkerTasks.length > 0) {
                const task = this.pendingWorkerTasks.shift();
                
                if (this.workerReady) {
                    // Send task to worker
                    this.worker.postMessage(task.data);
                    
                    // Store task callbacks
                    if (task.requestId) {
                        this.pendingRequests.set(task.requestId, {
                            resolve: task.resolve,
                            reject: task.reject,
                            timeout: setTimeout(() => {
                                // Handle timeout
                                if (this.pendingRequests.has(task.requestId)) {
                                    const request = this.pendingRequests.get(task.requestId);
                                    this.pendingRequests.delete(task.requestId);
                                    request.reject(new Error('Worker task timed out'));
                                }
                            }, 60000) // Increased to 60 second timeout for large datasets
                        });
                    }
                } else {
                    // Fall back to synchronous processing
                    console.warn('Worker not available, processing task synchronously');
                    
                    // Process based on action type
                    if (task.data.action === 'processHistoricalData') {
                        const processedData = this._processHistoricalDataSync(task.data.data);
                        const indices = this._buildHistoricalIndicesSync(processedData);
                        task.resolve({
                            processedData,
                            indices
                        });
                    } else if (task.data.action === 'processRecentData') {
                        const processedData = this._processRecentDataSync(task.data.data);
                        task.resolve({
                            processedData
                        });
                    } else if (task.data.action === 'filterData') {
                        // Fallback filtering
                        const filtered = this._filterDataSync(
                            task.data.data,
                            task.data.filters,
                            task.data.options
                        );
                        task.resolve({
                            filtered
                        });
                    } else {
                        task.reject(new Error(`Unknown task action: ${task.data.action}`));
                    }
                }
            }
        }
    }
    
    /**
     * Filter data synchronously (fallback if worker is not available)
     * @private
     * @param {Array} data - Raw data to filter
     * @param {Object} filters - Filter criteria
     * @param {Object} options - Additional options
     * @returns {Array} Filtered data
     */
    _filterDataSync(data, filters, options) {
        const { datasetType } = options || { datasetType: 'recent' };
        
        if (datasetType === 'historical') {
            return this._filterHistoricalDataSync(data, filters);
        } else {
            return this._filterRecentDataSync(data, filters);
        }
    }
    
    /**
     * Handle messages from the web worker
     * @private
     * @param {MessageEvent} e - Message event from the worker
     */
    _handleWorkerMessage(e) {
        const data = e.data;
        
        // Check if there was an error
        if (data.error) {
            console.error('Worker error:', data.error, data.stack);
            return;
        }
        
        // Handle different types of worker responses
        switch (data.action) {
            case 'processHistoricalDataComplete':
                this._handleProcessHistoricalDataComplete(data);
                break;
            case 'processRecentDataComplete':
                this._handleProcessRecentDataComplete(data);
                break;
            case 'filterDataComplete':
                this._handleFilterDataComplete(data);
                break;
            case 'convertToGeoJSONComplete':
                this._handleConvertToGeoJSONComplete(data);
                break;
            default:
                console.warn('Unknown worker message:', data);
        }
        
        // Resolve pending request if applicable
        if (data.requestId && this.pendingRequests.has(data.requestId)) {
            const request = this.pendingRequests.get(data.requestId);
            this.pendingRequests.delete(data.requestId);
            
            clearTimeout(request.timeout);
            request.resolve(data);
        }
    }
    
    /**
     * Handle completion of historical data processing
     * @private
     * @param {Object} data - Data from the worker
     */
    _handleProcessHistoricalDataComplete(data) {
        console.log(`Historical data processing complete: ${data.processedData?.length || 0} records processed`);
        
        // Fix dates in processed data (convert timestamps back to Date objects)
        let processedData = [];
        if (data.processedData) {
            processedData = data.processedData.map(quake => ({
                ...quake,
                dateTime: quake.dateTime ? new Date(quake.dateTime) : null
            }));
        }
        
        // Update state with processed data
        const state = stateManager.getState();
        stateManager.setState({
            dataLoaded: {
                ...state.dataLoaded,
                historical: true
            },
            historicalDataQueued: false,
            data: {
                ...state.data,
                historical: {
                    ...state.data.historical,
                    raw: processedData,
                    filtered: data.filtered || processedData,
                    displayed: data.filtered || processedData,
                    indexed: data.indices
                }
            }
        });
        
        // Update loading state
        this.dataLoadingState.historical.inProgress = false;
        
        // Trigger render if we're on the historical tab
        if (state.activeDataset === 'historical') {
            setTimeout(() => {
                console.log('Triggering initial render of historical data');
                mapService.renderData();
            }, 50);
        }
        
        // Hide loading indicators
        hideStatus();
        hideLoading();
    }
    
    /**
     * Handle completion of recent data processing
     * @private
     * @param {Object} data - Data from the worker
     */
    _handleProcessRecentDataComplete(data) {
        console.log(`Recent data processing complete: ${data.processedData?.length || 0} records processed`);
        
        // Fix dates in processed data (convert timestamps back to Date objects)
        let processedData = [];
        if (data.processedData) {
            processedData = data.processedData.map(quake => ({
                ...quake,
                dateTime: quake.dateTime ? new Date(quake.dateTime) : null
            }));
        }
        
        // Update state with processed data
        const state = stateManager.getState();
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
                    filtered: data.filtered || processedData,
                    displayed: data.filtered || processedData
                }
            }
        });
        
        // Update loading state
        this.dataLoadingState.recent.inProgress = false;
        
        // Trigger render if we're on the recent tab
        if (state.activeDataset === 'recent') {
            setTimeout(() => {
                if (!this._initialRenderDone) {
                    console.log('Forcing initial render of recent data');
                    this._initialRenderDone = true;
                    mapService.renderData();
                }
            }, 50);
        }
        
        // Hide loading indicators
        hideStatus();
        hideLoading();
    }
    
    /**
     * Handle completion of data filtering
     * @private
     * @param {Object} data - Data from the worker
     */
    _handleFilterDataComplete(data) {
        if (!data || !data.datasetType) {
            console.warn('Incomplete filter data received');
            hideLoading();
            return;
        }
        
        console.log(`Filter complete: ${data.filteredLength || 0} records match criteria`);
        
        // Update state with filtered data
        const state = stateManager.getState();
        
        const filteredData = Array.isArray(data.filtered) ? data.filtered : [];
        
        // Fix dates in filtered data
        const fixedFilteredData = filteredData.map(quake => {
            if (quake.dateTime && typeof quake.dateTime === 'number') {
                return { ...quake, dateTime: new Date(quake.dateTime) };
            }
            return quake;
        });
        
        stateManager.setState({
            data: {
                ...state.data,
                [data.datasetType]: {
                    ...state.data[data.datasetType],
                    filtered: fixedFilteredData,
                    displayed: fixedFilteredData
                }
            }
        });
        
        // Trigger render if this is the active dataset
        if (state.activeDataset === data.datasetType) {
            // Throttle renders
            clearTimeout(this.renderDebounceTimeout);
            this.renderDebounceTimeout = setTimeout(() => {
                mapService.renderData();
                hideLoading();
            }, 50);
        } else {
            hideLoading();
        }
    }
    
    /**
     * Handle completion of GeoJSON conversion
     * @private
     * @param {Object} data - Data from the worker
     */
    _handleConvertToGeoJSONComplete(data) {
        // Store in local cache
        if (data.cacheKey) {
            this.geojsonCache.set(data.cacheKey, data.geojson);
            
            // Limit cache size
            if (this.geojsonCache.size > 10) {
                // Remove oldest entry
                const oldestKey = this.geojsonCache.keys().next().value;
                this.geojsonCache.delete(oldestKey);
            }
        }
        
        // Log cache usage
        if (data.usedCache) {
            console.log(`Used cached GeoJSON for ${data.datasetType} (${data.cacheKey})`);
        } else {
            console.log(`Generated GeoJSON with ${data.featureCount || 0} features`);
        }
    }
    
    /**
     * Send a task to the web worker with promise interface
     * @private
     * @param {Object} data - Data to send to the worker
     * @returns {Promise} Promise that resolves with the worker's response
     */
    _sendWorkerTask(data) {
        return new Promise((resolve, reject) => {
            // Generate a request ID for tracking
            const requestId = this.nextRequestId++;
            data.requestId = requestId;
            
            // If worker is ready, send the task
            if (this.workerReady && this.worker) {
                this.worker.postMessage(data);
                
                // Store task callbacks
                this.pendingRequests.set(requestId, {
                    resolve,
                    reject,
                    timeout: setTimeout(() => {
                        // Handle timeout
                        if (this.pendingRequests.has(requestId)) {
                            this.pendingRequests.delete(requestId);
                            console.warn(`Worker task ${data.action} timed out`);
                            
                            // Process synchronously as fallback
                            if (data.action === 'processHistoricalData') {
                                const processedData = this._processHistoricalDataSync(data.data);
                                const indices = this._buildHistoricalIndicesSync(processedData);
                                resolve({
                                    action: 'processHistoricalDataComplete',
                                    processedData,
                                    indices
                                });
                            } else if (data.action === 'processRecentData') {
                                const processedData = this._processRecentDataSync(data.data);
                                resolve({
                                    action: 'processRecentDataComplete',
                                    processedData
                                });
                            } else if (data.action === 'filterData') {
                                // Fallback filtering
                                const filtered = this._filterDataSync(
                                    data.data,
                                    data.filters,
                                    data.options
                                );
                                resolve({
                                    action: 'filterDataComplete',
                                    filtered,
                                    datasetType: data.options?.datasetType || 'recent'
                                });
                            } else if (data.action === 'convertToGeoJSON') {
                                // Fallback GeoJSON conversion
                                this._startTimer('convertToGeoJSONSync');
                                const geojson = this._convertToGeoJSONSync(data.data);
                                const duration = this._endTimer('convertToGeoJSONSync');
                                console.log(`Converted GeoJSON synchronously in ${duration.toFixed(1)}ms`);
                                
                                resolve({
                                    action: 'convertToGeoJSONComplete',
                                    geojson,
                                    datasetType: data.options?.datasetType || 'recent'
                                });
                            } else {
                                reject(new Error(`Worker task timed out: ${data.action}`));
                            }
                        }
                    }, 60000) // Increased to 60 second timeout for large datasets
                });
            } else {
                // Queue the task for when the worker is ready
                this.pendingWorkerTasks.push({
                    data,
                    requestId,
                    resolve,
                    reject
                });
                
                // Try to initialize the worker if it's not ready
                if (!this.workerReady) {
                    this._initializeWorker();
                }
            }
        });
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
            
            // Send to worker for processing
            if (this.workerReady) {
                await this._sendWorkerTask({
                    action: 'processRecentData',
                    data,
                    filters: state.filters.recent
                });
            } else {
                // Fallback to synchronous processing if worker is not available
                const processedData = this._processRecentDataSync(data);
                this._handleProcessRecentDataComplete({
                    action: 'processRecentDataComplete',
                    processedData,
                    filtered: this._filterRecentDataSync(processedData, state.filters.recent)
                });
            }
            
            // Update last updated time
            this.updateLastUpdatedTime();
            
            // Return a resolved promise
            return Promise.resolve();
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
            
            // Send to worker for processing
            if (this.workerReady) {
                await this._sendWorkerTask({
                    action: 'processHistoricalData',
                    data,
                    filters: state.filters.historical
                });
            } else {
                // Fallback to synchronous processing if worker is not available
                const processedData = this._processHistoricalDataSync(data);
                const indices = this._buildHistoricalIndicesSync(processedData);
                
                this._handleProcessHistoricalDataComplete({
                    action: 'processHistoricalDataComplete',
                    processedData,
                    filtered: this._filterHistoricalDataSync(processedData, state.filters.historical),
                    indices
                });
            }
            
            return Promise.resolve();
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
     * Process recent data synchronously (fallback if worker is not available)
     * @private
     * @param {Array} data - Raw CSV data
     * @returns {Array} Processed earthquake data
     */
    _processRecentDataSync(data) {
        console.time('processRecentDataSync');
        
        const processed = data.map(item => {
            let dateTime = null;
            try {
                const dateString = item.DateTime || '';
                dateTime = new Date(dateString);
            } catch (e) {
                dateTime = null;
            }
            
            const magnitude = parseFloat(item.Mag) || 0;
            const depth = parseFloat(item['Depth(Km)']) || 0;
            
            const typeField = item.Type || item.type;
            let wasFelt = false;
            
            if (typeField) {
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
            return item.latitude && item.longitude && item.dateTime;
        });
        
        console.timeEnd('processRecentDataSync');
        return processed;
    }
    
    /**
     * Process historical data synchronously (fallback if worker is not available)
     * @private
     * @param {Array} data - Raw CSV data
     * @returns {Array} Processed earthquake data
     */
    _processHistoricalDataSync(data) {
        console.time('processHistoricalDataSync');
        
        const processed = data.map(item => {
            let dateTime = null;
            if (item.Date && item.Time) {
                try {
                    const dateParts = String(item.Date).split('/');
                    if (dateParts.length === 3) {
                        const [day, month, year] = dateParts.map(Number);
                        
                        let hours = 0, minutes = 0, seconds = 0;
                        if (item.Time) {
                            const timeParts = String(item.Time).split(':');
                            hours = parseInt(timeParts[0]) || 0;
                            minutes = parseInt(timeParts[1]) || 0;
                            seconds = parseFloat(timeParts[2]) || 0;
                        }
                        
                        dateTime = new Date(year, month - 1, day, hours, minutes, Math.floor(seconds));
                    }
                } catch (e) {
                    dateTime = null;
                }
            }
            
            let magnitude = 0;
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
                year: dateTime ? dateTime.getFullYear() : null,
                decade: dateTime ? Math.floor(dateTime.getFullYear() / 10) * 10 : null
            };
        }).filter(item => {
            return item.latitude && 
                   item.longitude && 
                   item.dateTime && 
                   item.magnitude >= 0;
        });
        
        console.timeEnd('processHistoricalDataSync');
        return processed;
    }
    
    /**
     * Build indices for historical data synchronously (fallback if worker is not available)
     * @private
     * @param {Array} earthquakes - Processed earthquake data
     * @returns {Object} Indices for quick filtering
     */
    _buildHistoricalIndicesSync(earthquakes) {
        console.time('buildHistoricalIndicesSync');
        
        const byYear = {};
        const byDecade = {};
        const byMagnitude = {};
        
        earthquakes.forEach(quake => {
            if (quake.year) {
                if (!byYear[quake.year]) {
                    byYear[quake.year] = [];
                }
                byYear[quake.year].push(quake);
            }
            
            if (quake.decade) {
                if (!byDecade[quake.decade]) {
                    byDecade[quake.decade] = [];
                }
                byDecade[quake.decade].push(quake);
            }
            
            const roundedMag = Math.round(quake.magnitude);
            if (!byMagnitude[roundedMag]) {
                byMagnitude[roundedMag] = [];
            }
            byMagnitude[roundedMag].push(quake);
        });
        
        console.timeEnd('buildHistoricalIndicesSync');
        
        return {
            byYear,
            byDecade,
            byMagnitude
        };
    }
    
    /**
     * Convert earthquake data to GeoJSON format with caching
     * @param {Array} earthquakes - Array of earthquake data
     * @param {string} datasetType - Type of dataset ('recent' or 'historical')
     * @param {string} [cacheKey] - Optional cache key
     * @returns {Promise<Object>} Promise resolving to GeoJSON object
     */
    async convertToGeoJSON(earthquakes, datasetType, cacheKey) {
        // Generate cache key if not provided
        if (!cacheKey && datasetType) {
            const state = stateManager.getState();
            cacheKey = `${datasetType}-${Math.round(state.currentZoom)}-${earthquakes.length}`;
        }
        
        // Check local cache first
        if (cacheKey && this.geojsonCache.has(cacheKey)) {
            return this.geojsonCache.get(cacheKey);
        }
        
        // Send to worker for processing
        if (this.workerReady) {
            try {
                const result = await this._sendWorkerTask({
                    action: 'convertToGeoJSON',
                    data: earthquakes,
                    options: {
                        cacheKey,
                        datasetType
                    }
                });
                
                return result.geojson;
            } catch (error) {
                console.error('Error converting to GeoJSON in worker:', error);
                // Fall back to synchronous conversion
            }
        }
        
        // Fallback to synchronous conversion
        this._startTimer('convertToGeoJSONSync');
        const geojson = this._convertToGeoJSONSync(earthquakes);
        const duration = this._endTimer('convertToGeoJSONSync');
        console.log(`Converted GeoJSON synchronously in ${duration.toFixed(1)}ms`);
        
        // Cache the result
        if (cacheKey) {
            this.geojsonCache.set(cacheKey, geojson);
            
            // Limit cache size
            if (this.geojsonCache.size > 10) {
                const oldestKey = this.geojsonCache.keys().next().value;
                this.geojsonCache.delete(oldestKey);
            }
        }
        
        return geojson;
    }
    
    /**
     * Convert earthquake data to GeoJSON synchronously
     * @private
     * @param {Array} earthquakes - Array of earthquake data
     * @returns {Object} GeoJSON object
     */
    _convertToGeoJSONSync(earthquakes) {
        // For large datasets, we'll create features in chunks to avoid blocking the main thread
        const features = [];
        const chunkSize = 1000;
        
        for (let i = 0; i < earthquakes.length; i += chunkSize) {
            const end = Math.min(i + chunkSize, earthquakes.length);
            
            for (let j = i; j < end; j++) {
                const quake = earthquakes[j];
                
                // Safely handle dateTime
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
                
                // Create feature with optimized property access
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
        }
        
        return {
            type: 'FeatureCollection',
            features: features
        };
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
            }, 60000); // Increased to 60 second timeout
        });
    }
    
    /**
     * Apply current filters to the active dataset
     */
    applyFilters() {
        // Debounce filter changes
        clearTimeout(this.filterDebounceTimeout);
        
        this.filterDebounceTimeout = setTimeout(() => {
            const state = stateManager.getState();
            const activeDataset = state.activeDataset;
            
            if (activeDataset === 'recent') {
                this.applyRecentFilters();
            } else {
                this.applyHistoricalFilters();
            }
        }, 100);
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
        
        // Use worker for filtering if available
        if (this.workerReady) {
            showLoading('Applying filters...');
            
            this._sendWorkerTask({
                action: 'filterData',
                data: rawData,
                filters: criteria,
                options: {
                    datasetType: 'recent',
                    dataId: Date.now() // Unique identifier for this filter operation
                }
            }).catch(error => {
                console.error('Error applying filters in worker:', error);
                
                // Fallback to synchronous filtering
                const filtered = this._filterRecentDataSync(rawData, criteria);
                
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
                
                // Trigger a map render
                setTimeout(() => {
                    mapService.renderData();
                    hideLoading();
                }, 50);
            });
        } else {
            // Fallback to synchronous filtering
            this._applyFiltersSync('recent', rawData, criteria);
        }
    }
    
    /**
     * Apply filters to historical earthquake data
     * @private
     */
    applyHistoricalFilters() {
        const state = stateManager.getState();
        const rawData = state.data.historical.raw;
        const criteria = state.filters.historical;
        const indices = state.data.historical.indexed;
        
        if (!rawData || rawData.length === 0) {
            console.warn('No historical data to filter');
            return;
        }
        
        console.log(`Applying historical filters: minMag=${criteria.minMagnitude}, yearRange=${criteria.yearRange}`);
        
        // Use worker for filtering if available
        if (this.workerReady) {
            showLoading('Applying filters...');
            
            this._sendWorkerTask({
                action: 'filterData',
                data: rawData,
                filters: criteria,
                options: {
                    datasetType: 'historical',
                    dataId: Date.now(), // Unique identifier for this filter operation
                    indices
                }
            }).catch(error => {
                console.error('Error applying filters in worker:', error);
                
                // Fallback to synchronous filtering
                const filtered = this._filterHistoricalDataSync(rawData, criteria, indices);
                
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
                
                // Trigger a map render
                setTimeout(() => {
                    mapService.renderData();
                    hideLoading();
                }, 50);
            });
        } else {
            // Fallback to synchronous filtering
            this._applyFiltersSync('historical', rawData, criteria, indices);
        }
    }
    
    /**
     * Apply filters synchronously (fallback if worker is not available)
     * @private
     * @param {string} datasetType - Type of dataset ('recent' or 'historical')
     * @param {Array} data - Raw data to filter
     * @param {Object} criteria - Filter criteria
     * @param {Object} [indices] - Indices for optimization (historical data only)
     */
    _applyFiltersSync(datasetType, data, criteria, indices) {
        showLoading('Applying filters...');
        
        console.time('applyFiltersSync');
        
        let filtered;
        
        if (datasetType === 'historical' && indices) {
            // Use indices for faster filtering
            filtered = this._filterHistoricalDataSync(data, criteria, indices);
        } else if (datasetType === 'recent') {
            // Filter recent data
            filtered = this._filterRecentDataSync(data, criteria);
        } else {
            // Fall back to standard filtering
            filtered = data.filter(quake => {
                // Magnitude filter
                if (criteria.minMagnitude && quake.magnitude < criteria.minMagnitude) {
                    return false;
                }
                
                // Year range filter for historical data
                if (datasetType === 'historical' && criteria.yearRange && quake.year) {
                    const [minYear, maxYear] = criteria.yearRange;
                    if (quake.year < minYear || quake.year > maxYear) {
                        return false;
                    }
                }
                
                // Time period filter for recent data
                if (datasetType === 'recent' && criteria.timePeriod && criteria.timePeriod !== 'all' && quake.dateTime) {
                    const now = new Date();
                    let cutoffDate;
                    
                    if (criteria.timePeriod === 'week') {
                        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    } else if (criteria.timePeriod === 'month') {
                        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    }
                    
                    if (cutoffDate && quake.dateTime < cutoffDate) {
                        return false;
                    }
                }
                
                // Felt filter for recent data
                if (datasetType === 'recent' && criteria.feltOnly === true && quake.felt !== true) {
                    return false;
                }
                
                return true;
            });
        }
        
        console.timeEnd('applyFiltersSync');
        
        // Update state with filtered data
        const state = stateManager.getState();
        
        stateManager.setState({
            data: {
                ...state.data,
                [datasetType]: {
                    ...state.data[datasetType],
                    filtered,
                    displayed: filtered
                }
            }
        });
        
        // Trigger a map render if this is the active dataset
        if (state.activeDataset === datasetType && typeof mapService?.renderData === 'function') {
            // Throttle renders
            clearTimeout(this.renderDebounceTimeout);
            this.renderDebounceTimeout = setTimeout(() => {
                mapService.renderData();
                hideLoading();
            }, 100);
        } else {
            hideLoading();
        }
    }
    
    /**
     * Filter historical data synchronously (optimized with indices)
     * @private
     * @param {Array} earthquakes - Earthquake data
     * @param {Object} criteria - Filter criteria
     * @param {Object} [indices] - Data indices
     * @returns {Array} Filtered data
     */
    _filterHistoricalDataSync(earthquakes, criteria, indices) {
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
        
        // Fallback to standard filtering
        return earthquakes.filter(quake => {
            if (criteria.minMagnitude && quake.magnitude < criteria.minMagnitude) {
                return false;
            }
            
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
     * Filter recent data synchronously
     * @private
     * @param {Array} earthquakes - Earthquake data
     * @param {Object} criteria - Filter criteria
     * @returns {Array} Filtered data
     */
    _filterRecentDataSync(earthquakes, criteria) {
        return earthquakes.filter(quake => {
            if (criteria.minMagnitude && quake.magnitude < criteria.minMagnitude) {
                return false;
            }
            
            if (criteria.timePeriod && criteria.timePeriod !== 'all' && quake.dateTime) {
                const now = new Date();
                let cutoffDate;
                
                if (criteria.timePeriod === 'week') {
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                } else if (criteria.timePeriod === 'month') {
                    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                }
                
                if (cutoffDate && quake.dateTime < cutoffDate) {
                    return false;
                }
            }
            
            if (criteria.feltOnly === true && quake.felt !== true) {
                return false;
            }
            
            return true;
        });
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
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Terminate web worker
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        // Clear timeouts
        clearTimeout(this.filterDebounceTimeout);
        clearTimeout(this.renderDebounceTimeout);
        
        // Clear all pending request timeouts
        for (const request of this.pendingRequests.values()) {
            clearTimeout(request.timeout);
        }
        this.pendingRequests.clear();
        
        // Clear cache
        this.geojsonCache.clear();
    }
}

// Create and export a singleton instance
export const dataService = new DataService();